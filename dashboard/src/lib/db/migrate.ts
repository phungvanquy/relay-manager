import { db } from "./index";
import type { Db } from "./index";
import { sql } from "drizzle-orm";

interface AppliedMigration {
  version: number;
}

interface ConfigEventMigrationRow {
  id: string;
  groupId: string;
  version: number;
}

export function migrate(database: Db = db) {
  database.run(sql`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )`);

  const applied = new Set(
    database
      .all<AppliedMigration>(sql`SELECT version FROM schema_migrations`)
      .map((row) => row.version)
  );

  if (!applied.has(1)) {
    database.transaction((tx) => {
      tx.run(sql`CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        config_version INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`);

      tx.run(sql`CREATE TABLE IF NOT EXISTS nodes (
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

      tx.run(sql`CREATE TABLE IF NOT EXISTS bootstrap_tokens (
        id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        used_at INTEGER
      )`);

      tx.run(sql`CREATE TABLE IF NOT EXISTS rules (
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

      tx.run(sql`CREATE TABLE IF NOT EXISTS config_events (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        action TEXT NOT NULL,
        rule_snapshot TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`);

      tx.run(sql`CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        created_at INTEGER NOT NULL
      )`);

      tx.run(sql`CREATE INDEX IF NOT EXISTS idx_config_events_group_version
        ON config_events(group_id, version)`);
      tx.run(sql`CREATE INDEX IF NOT EXISTS idx_nodes_group ON nodes(group_id)`);
      tx.run(sql`CREATE INDEX IF NOT EXISTS idx_rules_group ON rules(group_id)`);
      tx.run(sql`CREATE INDEX IF NOT EXISTS idx_bootstrap_tokens_expiry
        ON bootstrap_tokens(expires_at)`);
      tx.run(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
        ON audit_logs(created_at)`);
      tx.run(sql`INSERT INTO schema_migrations (version, applied_at) VALUES (1, ${Date.now()})`);
    });
  }

  if (!applied.has(2)) {
    database.transaction((tx) => {
      // Older releases allocated versions in application code, so concurrent
      // writes could create duplicates. Preserve every event while making its
      // version monotonic before adding the uniqueness constraint.
      const events = tx.all<ConfigEventMigrationRow>(sql`SELECT
        id,
        group_id AS groupId,
        version
      FROM config_events
      ORDER BY group_id, version, created_at, id`);
      const lastVersionByGroup = new Map<string, number>();
      for (const event of events) {
        const version = Math.max(event.version, (lastVersionByGroup.get(event.groupId) ?? 0) + 1);
        if (version !== event.version) {
          tx.run(sql`UPDATE config_events SET version = ${version} WHERE id = ${event.id}`);
        }
        lastVersionByGroup.set(event.groupId, version);
      }
      for (const [groupId, version] of lastVersionByGroup) {
        tx.run(sql`UPDATE groups
          SET config_version = CASE
            WHEN config_version < ${version} THEN ${version}
            ELSE config_version
          END
          WHERE id = ${groupId}`);
      }

      tx.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_config_events_group_version_unique
        ON config_events(group_id, version)`);
      tx.run(sql`DROP INDEX IF EXISTS idx_config_events_group_version`);
      tx.run(sql`INSERT INTO schema_migrations (version, applied_at) VALUES (2, ${Date.now()})`);
    });
  }

  if (!applied.has(3)) {
    database.transaction((tx) => {
      tx.run(sql`CREATE TRIGGER IF NOT EXISTS rules_port_conflict_insert
        BEFORE INSERT ON rules
        FOR EACH ROW
        WHEN EXISTS (
          SELECT 1 FROM rules
          WHERE group_id = NEW.group_id
            AND source_port = NEW.source_port
            AND (protocol = NEW.protocol OR protocol = 'both' OR NEW.protocol = 'both')
        )
        BEGIN
          SELECT RAISE(ABORT, 'port/protocol conflict');
        END`);
      tx.run(sql`CREATE TRIGGER IF NOT EXISTS rules_port_conflict_update
        BEFORE UPDATE OF group_id, source_port, protocol ON rules
        FOR EACH ROW
        WHEN EXISTS (
          SELECT 1 FROM rules
          WHERE id <> OLD.id
            AND group_id = NEW.group_id
            AND source_port = NEW.source_port
            AND (protocol = NEW.protocol OR protocol = 'both' OR NEW.protocol = 'both')
        )
        BEGIN
          SELECT RAISE(ABORT, 'port/protocol conflict');
        END`);
      tx.run(sql`INSERT INTO schema_migrations (version, applied_at) VALUES (3, ${Date.now()})`);
    });
  }

  if (!applied.has(4)) {
    database.transaction((tx) => {
      tx.run(sql`ALTER TABLE nodes ADD COLUMN last_apply_error TEXT`);
      tx.run(sql`ALTER TABLE nodes ADD COLUMN last_apply_error_at INTEGER`);
      tx.run(sql`INSERT INTO schema_migrations (version, applied_at) VALUES (4, ${Date.now()})`);
    });
  }
}
