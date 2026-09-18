import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import * as relations from "./relations";
import path from "path";
import fs from "fs";

const DB_PATH = path.resolve(process.cwd(), "data", "relay-manager.db");

function getDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = FULL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("wal_autocheckpoint = 1000");
  sqlite.pragma("journal_size_limit = 67108864");
  sqlite.pragma("optimize");

  return drizzle(sqlite, { schema: { ...schema, ...relations } });
}

declare const globalThis: {
  __db: ReturnType<typeof getDb> | undefined;
} & typeof global;

export const db = globalThis.__db ?? getDb();

if (process.env.NODE_ENV !== "production") {
  globalThis.__db = db;
}

export type Db = typeof db;
