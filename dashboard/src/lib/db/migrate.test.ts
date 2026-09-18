import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";
import * as schema from "./schema";
import * as relations from "./relations";
import type { Db } from "./index";
import { migrate } from "./migrate";

describe("migrate", () => {
  it("preserves legacy events while repairing duplicate versions", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        config_version INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE config_events (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        action TEXT NOT NULL,
        rule_snapshot TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      INSERT INTO groups VALUES ('g1', 'Group 1', 3, 1, 1);
      INSERT INTO config_events VALUES
        ('e1', 'g1', 1, 'add', '{}', 1),
        ('e2', 'g1', 2, 'add', '{}', 2),
        ('e3', 'g1', 2, 'update', '{}', 3),
        ('e4', 'g1', 3, 'remove', '{}', 4);
    `);
    const testDb = drizzle(sqlite, { schema: { ...schema, ...relations } }) as Db;

    migrate(testDb);

    const versions = sqlite
      .prepare("SELECT version FROM config_events WHERE group_id = ? ORDER BY version")
      .all("g1") as Array<{ version: number }>;
    expect(versions.map((row) => row.version)).toEqual([1, 2, 3, 4]);
    expect(
      (
        sqlite.prepare("SELECT config_version AS version FROM groups WHERE id = ?").get("g1") as {
          version: number;
        }
      ).version
    ).toBe(4);
    expect(
      (sqlite.prepare("SELECT COUNT(*) AS count FROM config_events").get() as { count: number })
        .count
    ).toBe(4);
    expect(() =>
      sqlite.prepare("INSERT INTO config_events VALUES ('e5', 'g1', 4, 'add', '{}', 5)").run()
    ).toThrow();
  });
});
