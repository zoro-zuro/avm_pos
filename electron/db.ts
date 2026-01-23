/**
 * Ensure Node.js globals are available for better-sqlite3
 * These should be set by main.ts, but we double-check here
 */
if (!(global as any).__filename) {
  (global as any).__filename = import.meta.url;
}
if (!(global as any).__dirname) {
  (global as any).__dirname = import.meta.url;
}

import { drizzle } from "drizzle-orm/better-sqlite3";
import { app } from "electron";
import Database from "better-sqlite3";
import * as path from "path";
import * as schema from "./schema";

const isDev = !app.isPackaged;
const dbPath = isDev
  ? path.join(process.cwd(), "shop.db")
  : path.join(app.getPath("userData"), "shop.db");

console.log("🗄️ Initializing database at:", dbPath);

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;

try {
  sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  console.log("✅ Database initialized successfully");
  
  db = drizzle(sqlite, { schema });
  console.log("✅ Drizzle ORM initialized successfully");
} catch (e) {
  console.error("❌ Database initialization failed:", e);
  console.error("❌ Database error details:", {
    message: e instanceof Error ? e.message : String(e),
    stack: e instanceof Error ? e.stack : undefined,
    dbPath,
    timestamp: new Date().toISOString()
  });
  throw e;
}

export { sqlite, db };
