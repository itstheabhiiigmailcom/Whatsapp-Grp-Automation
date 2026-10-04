import { db } from "./connection.js";
import type { StoredUpdate } from "./types.js";

export function savePollUpdate(
  pollId: string,
  messageId: string | null,
  senderJid: string | null,
  updateData: Buffer
): void {
  db.prepare(`
    INSERT INTO poll_updates (
      poll_id,
      message_id,
      sender_jid,
      update_data,
      created_at
    )
    VALUES (
      @pollId,
      @messageId,
      @senderJid,
      @updateData,
      @createdAt
    )
  `).run({
    pollId,
    messageId,
    senderJid,
    updateData,
    createdAt:
      new Date().toISOString(),
  });
}

export function getPollUpdates(
  pollId: string
): StoredUpdate[] {
  return db.prepare(`
    SELECT
      id,
      poll_id AS pollId,
      message_id AS messageId,
      sender_jid AS senderJid,
      update_data AS updateData,
      created_at AS createdAt
    FROM poll_updates
    WHERE poll_id = ?
    ORDER BY id ASC
  `).all(
    pollId
  ) as StoredUpdate[];
}
