import { WebSocket } from "ws";
import { db } from "../db";
import {
  nodes,
  configEvents,
  bootstrapTokens,
  groups,
} from "../db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { registry } from "./registry";
import { hashApiKey, generateApiKey } from "../auth";

export function handleAgentConnection(ws: WebSocket) {
  let authenticatedNodeId: string | null = null;
  let heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;

  const resetHeartbeatTimeout = () => {
    if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
    heartbeatTimeout = setTimeout(() => {
      ws.close(4001, "heartbeat timeout");
    }, 90_000);
  };

  ws.on("message", async (data) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      ws.close(4000, "invalid json");
      return;
    }

    const type = msg.type as string;

    if (type === "bootstrap") {
      await handleBootstrap(ws, msg);
      return;
    }

    if (type === "hello") {
      const result = await handleHello(ws, msg);
      if (result) {
        authenticatedNodeId = result;
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
      if (success && authenticatedNodeId) {
        db.update(nodes)
          .set({ configVersion: version })
          .where(eq(nodes.id, authenticatedNodeId))
          .run();
      }
      return;
    }
  });

  ws.on("close", () => {
    if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
    if (authenticatedNodeId) {
      registry.unregister(authenticatedNodeId);
      db.update(nodes)
        .set({ status: "offline" })
        .where(eq(nodes.id, authenticatedNodeId))
        .run();
    }
  });

  ws.on("error", () => {
    if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
    if (authenticatedNodeId) {
      registry.unregister(authenticatedNodeId);
    }
  });
}

async function handleHello(
  ws: WebSocket,
  msg: Record<string, unknown>
): Promise<string | null> {
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

  if (node.groupId) {
    const events = await db.query.configEvents.findMany({
      where: and(
        eq(configEvents.groupId, node.groupId),
        gt(configEvents.version, clientVersion)
      ),
      orderBy: (ce, { asc }) => [asc(ce.version)],
    });

    catchUpEvents = events.map((e) => ({
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
      catch_up_events: catchUpEvents,
    })
  );

  return nodeId;
}

async function handleBootstrap(ws: WebSocket, msg: Record<string, unknown>) {
  const rawToken = msg.token as string;
  if (!rawToken) {
    ws.close(4003, "missing token");
    return;
  }

  const tokenHash = hashApiKey(rawToken);
  const now = Date.now();

  const token = await db.query.bootstrapTokens.findFirst({
    where: and(
      eq(bootstrapTokens.tokenHash, tokenHash),
      isNull(bootstrapTokens.usedAt)
    ),
  });

  if (!token || token.expiresAt < now) {
    ws.close(4003, "invalid or expired token");
    return;
  }

  db.update(bootstrapTokens)
    .set({ usedAt: now })
    .where(eq(bootstrapTokens.id, token.id))
    .run();

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
  const req = (ws as unknown as { _socket?: { remoteAddress?: string } })
    ._socket;
  return req?.remoteAddress?.replace("::ffff:", "");
}
