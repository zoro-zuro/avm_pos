// init-db.js
const Database = require("better-sqlite3");
const db = new Database("shop.db");

// Create Users Table Manually (Just for initial setup)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

console.log("✅ Database created successfully: shop.db");
db.close();
