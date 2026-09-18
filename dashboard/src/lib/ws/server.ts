import { WebSocket } from "ws";
import { db } from "../db";
import { nodes, groups, rules, configEvents, bootstrapTokens } from "../db/schema";
import { eq, and, gt, isNull, lt } from "drizzle-orm";
import { registry } from "./registry";
import { hashApiKey, generateApiKey } from "../credentials";

export const HEARTBEAT_TIMEOUT_MS = 90_000;
const AUTHENTICATION_TIMEOUT_MS = 10_000;

export function handleAgentConnection(ws: WebSocket) {
  let authenticatedNodeId: string | null = null;
  let heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  const authenticationTimeout = setTimeout(() => {
    ws.close(4003, "authentication timeout");
  }, AUTHENTICATION_TIMEOUT_MS);
  let messageQueue = Promise.resolve();

  const resetHeartbeatTimeout = () => {
    if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
    heartbeatTimeout = setTimeout(() => {
      ws.close(4001, "heartbeat timeout");
    }, HEARTBEAT_TIMEOUT_MS);
  };

  ws.on("message", (data) => {
    messageQueue = messageQueue
      .then(async () => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(data.toString());
        } catch {
          ws.close(4000, "invalid json");
          return;
        }

        const type = msg.type as string;

        if (type === "bootstrap") {
          clearTimeout(authenticationTimeout);
          await handleBootstrap(ws, msg);
          return;
        }

        if (type === "hello") {
          const result = await handleHello(ws, msg);
          if (result) {
            authenticatedNodeId = result;
            clearTimeout(authenticationTimeout);
            resetHeartbeatTimeout();
          }
          return;
        }

        if (!authenticatedNodeId) {
          ws.close(4003, "not authenticated");
          return;
        }

        if (type === "heartbeat") {
          resetHeartbeatTimeout();
          const now = Date.now();
          db.update(nodes)
            .set({ lastHeartbeat: now, status: "online" })
            .where(eq(nodes.id, authenticatedNodeId))
            .run();
          ws.send(JSON.stringify({ type: "heartbeat_ack", server_time: now }));
          return;
        }

        if (type === "apply_result") {
          const version = msg.version as number;
          const success = msg.success as boolean;
          if (success && authenticatedNodeId && Number.isInteger(version) && version >= 0) {
            db.update(nodes)
              .set({ lastApplyError: null, lastApplyErrorAt: null })
              .where(eq(nodes.id, authenticatedNodeId))
              .run();
            db.update(nodes)
              .set({ configVersion: version })
              .where(and(eq(nodes.id, authenticatedNodeId), lt(nodes.configVersion, version)))
              .run();
          } else if (!success) {
            console.error(
              `Node ${authenticatedNodeId} failed to apply version ${version}:`,
              msg.error
            );
            db.update(nodes)
              .set({
                lastApplyError: String(msg.error ?? "Unknown apply error").slice(0, 2000),
                lastApplyErrorAt: Date.now(),
              })
              .where(eq(nodes.id, authenticatedNodeId))
              .run();
          }
          return;
        }
      })
      .catch((error) => {
        console.error("WebSocket message processing failed:", error);
        ws.close(1011, "internal error");
      });
  });

  ws.on("close", () => {
    clearTimeout(authenticationTimeout);
    if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
    if (authenticatedNodeId) {
      const removed = registry.unregister(authenticatedNodeId, ws);
      if (removed) {
        db.update(nodes).set({ status: "offline" }).where(eq(nodes.id, authenticatedNodeId)).run();
      }
    }
  });

  ws.on("error", () => {
    clearTimeout(authenticationTimeout);
    if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
    if (authenticatedNodeId) {
      registry.unregister(authenticatedNodeId, ws);
    }
  });
}

async function handleHello(ws: WebSocket, msg: Record<string, unknown>): Promise<string | null> {
  const nodeId = msg.node_id as string;
  const apiKey = msg.api_key as string;

  if (!nodeId || !apiKey) {
    ws.close(4003, "missing credentials");
    return null;
  }

  const keyHash = hashApiKey(apiKey);
  const node = await db.query.nodes.findFirst({
    where: and(eq(nodes.id, nodeId), eq(nodes.apiKeyHash, keyHash)),
  });

  if (!node) {
    ws.close(4003, "invalid credentials");
    return null;
  }

  const now = Date.now();
  db.update(nodes)
    .set({ status: "online", lastHeartbeat: now, ip: getRemoteIp(ws) })
    .where(eq(nodes.id, nodeId))
    .run();

  registry.register(nodeId, node.groupId, ws);

  const clientVersion = (msg.config_version as number) || 0;
  let catchUpEvents: unknown[] = [];
  let configVersion = 0;
  let desiredRules: unknown[] = [];

  if (node.groupId) {
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, node.groupId),
    });
    configVersion = group?.configVersion ?? 0;

    const groupRules = await db.query.rules.findMany({
      where: eq(rules.groupId, node.groupId),
      orderBy: (rule, { asc }) => [asc(rule.sourcePort), asc(rule.id)],
    });
    desiredRules = groupRules.map(toAgentRule);

    const events = await db.query.configEvents.findMany({
      where: and(eq(configEvents.groupId, node.groupId), gt(configEvents.version, clientVersion)),
      orderBy: (ce, { asc }) => [asc(ce.version)],
    });

    catchUpEvents = events.map((e) => ({
      type: "sync_event",
      group_id: node.groupId,
      version: e.version,
      action: e.action,
      rule: JSON.parse(e.ruleSnapshot),
    }));
  }

  ws.send(
    JSON.stringify({
      type: "hello_ack",
      node_id: nodeId,
      group_id: node.groupId,
      config_version: configVersion,
      desired_rules: desiredRules,
      catch_up_events: catchUpEvents,
    })
  );

  return nodeId;
}

function toAgentRule(rule: typeof rules.$inferSelect) {
  return {
    id: rule.id,
    group_id: rule.groupId,
    name: rule.name,
    source_port: rule.sourcePort,
    destination_ip: rule.destinationIp,
    destination_port: rule.destinationPort,
    protocol: rule.protocol,
  };
}

async function handleBootstrap(ws: WebSocket, msg: Record<string, unknown>) {
  const rawToken = msg.token as string;
  if (!rawToken) {
    ws.close(4003, "missing token");
    return;
  }

  const tokenHash = hashApiKey(rawToken);
  const now = Date.now();

  const token = db
    .update(bootstrapTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(bootstrapTokens.tokenHash, tokenHash),
        isNull(bootstrapTokens.usedAt),
        gt(bootstrapTokens.expiresAt, now)
      )
    )
    .returning({ id: bootstrapTokens.id, nodeId: bootstrapTokens.nodeId })
    .get();

  if (!token) {
    ws.close(4003, "invalid or expired token");
    return;
  }

  const rawApiKey = generateApiKey();
  const apiKeyHash = hashApiKey(rawApiKey);

  db.update(nodes)
    .set({ apiKeyHash, status: "online", lastHeartbeat: now, ip: getRemoteIp(ws) })
    .where(eq(nodes.id, token.nodeId))
    .run();

  const node = await db.query.nodes.findFirst({
    where: eq(nodes.id, token.nodeId),
  });

  ws.send(
    JSON.stringify({
      type: "bootstrap_ack",
      node_id: token.nodeId,
      api_key: rawApiKey,
      group_id: node?.groupId || null,
    })
  );

  ws.close(1000, "bootstrap complete, reconnect with api key");
}

function getRemoteIp(ws: WebSocket): string | undefined {
  const req = (ws as unknown as { _socket?: { remoteAddress?: string } })._socket;
  return req?.remoteAddress?.replace("::ffff:", "");
}
