import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";
import * as relations from "@/lib/db/relations";

export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      config_version INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE nodes (
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
    );

    CREATE TABLE bootstrap_tokens (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      used_at INTEGER
    );

    CREATE TABLE rules (
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
    );

    CREATE TABLE config_events (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      action TEXT NOT NULL,
      rule_snapshot TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  return drizzle(sqlite, { schema: { ...schema, ...relations } });
}
