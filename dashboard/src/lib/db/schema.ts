import { sqliteTable, text, integer, unique, uniqueIndex } from "drizzle-orm/sqlite-core";

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  configVersion: integer("config_version").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const nodes = sqliteTable("nodes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ip: text("ip"),
  apiKeyHash: text("api_key_hash").unique(),
  groupId: text("group_id").references(() => groups.id, { onDelete: "set null" }),
  status: text("status", { enum: ["online", "offline"] })
    .notNull()
    .default("offline"),
  lastHeartbeat: integer("last_heartbeat"),
  configVersion: integer("config_version").notNull().default(0),
  lastApplyError: text("last_apply_error"),
  lastApplyErrorAt: integer("last_apply_error_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const bootstrapTokens = sqliteTable("bootstrap_tokens", {
  id: text("id").primaryKey(),
  nodeId: text("node_id")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
});

export const rules = sqliteTable(
  "rules",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sourcePort: integer("source_port").notNull(),
    destinationIp: text("destination_ip").notNull(),
    destinationPort: integer("destination_port").notNull(),
    protocol: text("protocol", { enum: ["tcp", "udp", "both"] })
      .notNull()
      .default("both"),
    note: text("note"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [unique().on(t.groupId, t.sourcePort, t.protocol)]
);

export const configEvents = sqliteTable(
  "config_events",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    action: text("action", { enum: ["add", "update", "remove"] }).notNull(),
    ruleSnapshot: text("rule_snapshot").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_config_events_group_version_unique").on(table.groupId, table.version),
  ]
);

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: text("details"),
  createdAt: integer("created_at").notNull(),
});
