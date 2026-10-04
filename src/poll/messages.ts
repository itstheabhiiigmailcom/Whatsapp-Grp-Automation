import {
  type WAMessage,
  type WAMessageKey,
  type WAMessageContent,
} from "@whiskeysockets/baileys";

import {
  saveMessage,
  getMessage,
} from "../db/index.js";

import {
  decodeMessage,
  encodeMessage,
  getMessageKey,
} from "./codec.js";

/*
 * Called from whatsapp events for every
 * incoming/outgoing message.
 *
 * SQLite is now the source of truth.
 */

export function storeMessage(
  message: WAMessage
): void {
  if (!message.key.id) {
    return;
  }

  const messageKey =
    getMessageKey(message.key);

  const encoded =
    encodeMessage(message);

  saveMessage(
    messageKey,
    message.key.id,
    message.key.remoteJid ?? null,
    message.key.participant ?? null,
    encoded
  );
}

/*
 * Used by Baileys' getMessage().
 */

export function getStoredMessage(
  key: WAMessageKey
): WAMessageContent | undefined {
  if (!key.id) {
    return undefined;
  }

  const messageKey =
    getMessageKey(key);

  const stored =
    getMessage(messageKey);

  if (!stored) {
    return undefined;
  }

  try {
    const message =
      decodeMessage(
        stored.messageData
      );

    return message.message ??
      undefined;
  } catch (error) {
    console.error(
      "❌ Failed to decode stored WhatsApp message:",
      error
    );

    return undefined;
  }
}
