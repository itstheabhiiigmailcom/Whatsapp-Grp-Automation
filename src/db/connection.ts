import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { config } from "../config.js";

const databasePath = path.resolve(
  config.database.path
);

const databaseDirectory =
  path.dirname(databasePath);

fs.mkdirSync(databaseDirectory, {
  recursive: true,
});

export const db = new Database(databasePath);

/*
 * SQLite configuration.
 *
 * WAL improves reliability for a small application
 * where reads and writes happen frequently.
 */
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

/*
 * ==========================================
 * DATABASE SCHEMA
 * ==========================================
 */

db.exec(`
  CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    poll_id TEXT NOT NULL UNIQUE,

    group_id TEXT NOT NULL,

    title TEXT NOT NULL,

    poll_date TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'open'
      CHECK(status IN ('open', 'closed')),

    created_at TEXT NOT NULL,

    closed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_polls_date
    ON polls(poll_date);

  CREATE INDEX IF NOT EXISTS idx_polls_group_date
    ON polls(group_id, poll_date);

  CREATE TABLE IF NOT EXISTS poll_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    poll_id TEXT NOT NULL,

    message_id TEXT,

    sender_jid TEXT,

    update_data BLOB NOT NULL,

    created_at TEXT NOT NULL,

    FOREIGN KEY (poll_id)
      REFERENCES polls(poll_id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_poll_updates_poll_id
    ON poll_updates(poll_id);

  CREATE TABLE IF NOT EXISTS messages (
    message_key TEXT PRIMARY KEY,

    message_id TEXT NOT NULL,

    remote_jid TEXT,

    participant TEXT,

    message_data BLOB NOT NULL,

    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_message_id
    ON messages(message_id);
`);

console.log(
  `💾 SQLite database: ${databasePath}`
);

export function closeDatabase(): void {
  if (db.open) {
    db.close();

    console.log(
      "💾 SQLite database closed."
    );
  }
}
