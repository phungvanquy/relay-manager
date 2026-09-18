import { db } from "../db";
import { rules, groups, configEvents, auditLogs } from "../db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { pushRuleChange } from "../ws/push";

export interface RuleInput {
  name: string;
  sourcePort: number;
  destinationIp: string;
  destinationPort: number;
  protocol: "tcp" | "udp" | "both";
  note?: string;
}

const MIN_PORT = 1;
const MAX_PORT = 65535;

// Convert a DB rule (camelCase) to the snake_case format the Go agent expects
function toAgentRule(rule: {
  id: string;
  groupId: string;
  name: string;
  sourcePort: number;
  destinationIp: string;
  destinationPort: number;
  protocol: string;
  note?: string | null;
}) {
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

function validateRuleInput(input: RuleInput) {
  if (typeof input.name !== "string" || input.name.trim().length === 0 || input.name.length > 100) {
    throw new Error("Name must be between 1 and 100 characters");
  }
  if (
    !Number.isInteger(input.sourcePort) ||
    input.sourcePort < MIN_PORT ||
    input.sourcePort > MAX_PORT
  ) {
    throw new Error("Source port must be between 1 and 65535");
  }
  if (
    !Number.isInteger(input.destinationPort) ||
    input.destinationPort < MIN_PORT ||
    input.destinationPort > MAX_PORT
  ) {
    throw new Error("Destination port must be between 1 and 65535");
  }
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (
    typeof input.destinationIp !== "string" ||
    !ipRegex.test(input.destinationIp) ||
    input.destinationIp.split(".").some((octet) => {
      const n = Number(octet);
      return !Number.isInteger(n) || n < 0 || n > 255;
    })
  ) {
    throw new Error("Invalid destination IP format");
  }
  if (!["tcp", "udp", "both"].includes(input.protocol)) {
    throw new Error("Protocol must be tcp, udp, or both");
  }
  if (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 500)) {
    throw new Error("Note must be at most 500 characters");
  }
}

async function checkPortConflict(
  groupId: string,
  sourcePort: number,
  protocol: "tcp" | "udp" | "both",
  excludeRuleId?: string
) {
  const conflictConditions = [];

  if (protocol === "both") {
    conflictConditions.push(and(eq(rules.groupId, groupId), eq(rules.sourcePort, sourcePort)));
  } else {
    conflictConditions.push(
      and(
        eq(rules.groupId, groupId),
        eq(rules.sourcePort, sourcePort),
        or(eq(rules.protocol, protocol as "tcp" | "udp"), eq(rules.protocol, "both"))
      )
    );
  }

  const existing = await db.query.rules.findMany({
    where: conflictConditions[0],
  });

  const conflicts = excludeRuleId ? existing.filter((r) => r.id !== excludeRuleId) : existing;

  if (conflicts.length > 0) {
    throw new Error(`Port ${sourcePort} is already in use for protocol ${protocol} in this group`);
  }
}

export async function addRule(groupId: string, input: RuleInput) {
  validateRuleInput(input);
  await checkPortConflict(groupId, input.sourcePort, input.protocol);

  const now = Date.now();
  const ruleId = nanoid();

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });
  if (!group) throw new Error("Group not found");

  let newVersion = 0;

  const rule = {
    id: ruleId,
    groupId,
    name: input.name.trim(),
    sourcePort: input.sourcePort,
    destinationIp: input.destinationIp,
    destinationPort: input.destinationPort,
    protocol: input.protocol,
    note: input.note || null,
    createdAt: now,
    updatedAt: now,
  };

  const agentRule = toAgentRule(rule);

  db.transaction((tx) => {
    tx.insert(rules).values(rule).run();
    const versionRow = tx
      .update(groups)
      .set({ configVersion: sql`${groups.configVersion} + 1`, updatedAt: now })
      .where(eq(groups.id, groupId))
      .returning({ configVersion: groups.configVersion })
      .get();
    if (!versionRow) throw new Error("Group not found");
    newVersion = versionRow.configVersion;
    tx.insert(configEvents)
      .values({
        id: nanoid(),
        groupId,
        version: newVersion,
        action: "add",
        ruleSnapshot: JSON.stringify(agentRule),
        createdAt: now,
      })
      .run();
    tx.insert(auditLogs)
      .values({
        id: nanoid(),
        action: "rule.add",
        entityType: "rule",
        entityId: ruleId,
        details: JSON.stringify({ groupId, rule: input }),
        createdAt: now,
      })
      .run();
  });

  pushRuleChange(groupId, {
    version: newVersion,
    action: "add",
    rule: agentRule,
  });

  return rule;
}

export async function updateRule(ruleId: string, input: Partial<RuleInput>) {
  const existing = await db.query.rules.findFirst({
    where: eq(rules.id, ruleId),
  });
  if (!existing) throw new Error("Rule not found");

  const merged: RuleInput = {
    name: input.name?.trim() ?? existing.name,
    sourcePort: input.sourcePort ?? existing.sourcePort,
    destinationIp: input.destinationIp ?? existing.destinationIp,
    destinationPort: input.destinationPort ?? existing.destinationPort,
    protocol: input.protocol ?? existing.protocol,
    note: input.note !== undefined ? input.note : (existing.note ?? undefined),
  };

  validateRuleInput(merged);

  if (merged.sourcePort !== existing.sourcePort || merged.protocol !== existing.protocol) {
    await checkPortConflict(existing.groupId, merged.sourcePort, merged.protocol, ruleId);
  }

  const now = Date.now();
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, existing.groupId),
  });
  if (!group) throw new Error("Group not found");

  let newVersion = 0;

  const updatedRule = {
    ...existing,
    ...merged,
    note: merged.note || null,
    updatedAt: now,
  };

  const agentRule = toAgentRule(updatedRule);

  db.transaction((tx) => {
    tx.update(rules).set(updatedRule).where(eq(rules.id, ruleId)).run();
    const versionRow = tx
      .update(groups)
      .set({ configVersion: sql`${groups.configVersion} + 1`, updatedAt: now })
      .where(eq(groups.id, existing.groupId))
      .returning({ configVersion: groups.configVersion })
      .get();
    if (!versionRow) throw new Error("Group not found");
    newVersion = versionRow.configVersion;
    tx.insert(configEvents)
      .values({
        id: nanoid(),
        groupId: existing.groupId,
        version: newVersion,
        action: "update",
        ruleSnapshot: JSON.stringify(agentRule),
        createdAt: now,
      })
      .run();
    tx.insert(auditLogs)
      .values({
        id: nanoid(),
        action: "rule.update",
        entityType: "rule",
        entityId: ruleId,
        details: JSON.stringify({ before: existing, after: updatedRule }),
        createdAt: now,
      })
      .run();
  });

  pushRuleChange(existing.groupId, {
    version: newVersion,
    action: "update",
    rule: agentRule,
  });

  return updatedRule;
}

export async function removeRule(ruleId: string) {
  const existing = await db.query.rules.findFirst({
    where: eq(rules.id, ruleId),
  });
  if (!existing) throw new Error("Rule not found");

  const now = Date.now();
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, existing.groupId),
  });
  if (!group) throw new Error("Group not found");

  let newVersion = 0;
  const agentRule = toAgentRule(existing);

  db.transaction((tx) => {
    tx.delete(rules).where(eq(rules.id, ruleId)).run();
    const versionRow = tx
      .update(groups)
      .set({ configVersion: sql`${groups.configVersion} + 1`, updatedAt: now })
      .where(eq(groups.id, existing.groupId))
      .returning({ configVersion: groups.configVersion })
      .get();
    if (!versionRow) throw new Error("Group not found");
    newVersion = versionRow.configVersion;
    tx.insert(configEvents)
      .values({
        id: nanoid(),
        groupId: existing.groupId,
        version: newVersion,
        action: "remove",
        ruleSnapshot: JSON.stringify(agentRule),
        createdAt: now,
      })
      .run();
    tx.insert(auditLogs)
      .values({
        id: nanoid(),
        action: "rule.remove",
        entityType: "rule",
        entityId: ruleId,
        details: JSON.stringify({ rule: existing }),
        createdAt: now,
      })
      .run();
  });

  pushRuleChange(existing.groupId, {
    version: newVersion,
    action: "remove",
    rule: agentRule,
  });
}
