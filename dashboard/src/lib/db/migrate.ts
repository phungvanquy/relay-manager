import { db } from "./index";
import { sql } from "drizzle-orm";

export function migrate() {
  db.run(sql`CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    config_version INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ip TEXT,
    api_key_hash TEXT UNIQUE,
    group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'offline',
    last_heartbeat INTEGER,
    config_version INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS bootstrap_tokens (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    used_at INTEGER
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source_port INTEGER NOT NULL,
    destination_ip TEXT NOT NULL,
    destination_port INTEGER NOT NULL,
    protocol TEXT NOT NULL DEFAULT 'both',
    note TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(group_id, source_port, protocol)
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS config_events (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    action TEXT NOT NULL,
    rule_snapshot TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at INTEGER NOT NULL
  )`);

  db.run(sql`CREATE INDEX IF NOT EXISTS idx_config_events_group_version
    ON config_events(group_id, version)`);

  db.run(sql`CREATE INDEX IF NOT EXISTS idx_nodes_group
    ON nodes(group_id)`);

  db.run(sql`CREATE INDEX IF NOT EXISTS idx_rules_group
    ON rules(group_id)`);
}
