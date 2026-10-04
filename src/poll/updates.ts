import {
  type WAMessageKey,
  type WASocket,
} from "@whiskeysockets/baileys";

import { savePollUpdate } from "../db/index.js";

import { encodePollUpdate } from "./codec.js";
import type { PollUpdateInputArray } from "./types.js";
import type { PollUpdateInput } from "./types.js";

/*
 * IMPORTANT:
 *
 * The key.id received with a poll vote
 * can be the vote/update message ID.
 *
 * The original poll ID is inside:
 *
 * pollCreationMessageKey.id
 *
 * We therefore always extract the
 * original poll ID from the update itself.
 */

export function handlePollUpdate(
  _sock: WASocket,
  key: WAMessageKey,
  input: PollUpdateInputArray
): void {
  storePollUpdate(key, input);
}

export function storePollUpdate(
  key: WAMessageKey,
  input: PollUpdateInputArray
): void {
  if (!key.id) {
    return;
  }

  const updates: readonly (
    | PollUpdateInput
    | null
    | undefined
  )[] = Array.isArray(input)
    ? input
    : [input as PollUpdateInput];

  let storedCount = 0;

  for (const value of updates) {
    if (!value) {
      continue;
    }

    const pollId =
      key.id;

    if (!pollId) {
      continue;
    }

    /*
     * Persist the decrypted poll update as-is.
     * Finalize decodes it back into proto.IPollUpdate
     * for getAggregateVotesInPollMessage().
     *
     * The voter is on pollUpdateMessageKey.
     * key is the original poll message.
     */

    const encoded =
      encodePollUpdate(value);

    const voterKey =
      value.pollUpdateMessageKey;

    savePollUpdate(
      pollId,
      voterKey?.id ?? key.id,
      voterKey?.participant ??
        voterKey?.remoteJid ??
        key.participant ??
        key.remoteJid ??
        null,
      encoded
    );

    storedCount++;

    console.log(
      `🗳️ Poll vote received for poll ${pollId}`
    );
  }

  if (storedCount > 0) {
    console.log(
      `   💾 ${storedCount} poll update(s) persisted to SQLite.`
    );
  }
}
