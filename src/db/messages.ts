import { db } from "./connection.js";
import type { StoredMessage } from "./types.js";

export function saveMessage(
  messageKey: string,
  messageId: string,
  remoteJid: string | null,
  participant: string | null,
  messageData: Buffer
): void {
  db.prepare(`
    INSERT INTO messages (
      message_key,
      message_id,
      remote_jid,
      participant,
      message_data,
      created_at
    )
    VALUES (
      @messageKey,
      @messageId,
      @remoteJid,
      @participant,
      @messageData,
      @createdAt
    )
    ON CONFLICT(message_key)
    DO UPDATE SET
      message_data = excluded.message_data
  `).run({
    messageKey,
    messageId,
    remoteJid,
    participant,
    messageData,
    createdAt:
      new Date().toISOString(),
  });
}

export function getMessageById(
  messageId: string
): StoredMessage | null {
  const row =
    db.prepare(`
      SELECT
        message_key AS messageKey,
        message_id AS messageId,
        remote_jid AS remoteJid,
        participant,
        message_data AS messageData,
        created_at AS createdAt
      FROM messages
      WHERE message_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(
      messageId
    ) as StoredMessage | undefined;

  return row ?? null;
}

export function getMessage(
  messageKey: string
): StoredMessage | null {
  const row =
    db.prepare(`
      SELECT
        message_key AS messageKey,
        message_id AS messageId,
        remote_jid AS remoteJid,
        participant,
        message_data AS messageData,
        created_at AS createdAt
      FROM messages
      WHERE message_key = ?
      LIMIT 1
    `).get(
      messageKey
    ) as StoredMessage | undefined;

  return row ?? null;
}
