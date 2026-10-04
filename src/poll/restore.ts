import { config } from "../config.js";

import {
  getMessage,
  getOpenPollForDate,
  getPollById,
} from "../db/index.js";

import {
  decodeMessage,
  getMessageKey,
} from "./codec.js";

import { getDateString } from "./date.js";
import { setActivePoll } from "./state.js";

/*
 * Called whenever the poll module is loaded.
 *
 * If the process restarted after the
 * poll was created, we recover it
 * from SQLite.
 */

export function restoreActivePoll(): void {
  const today =
    getDateString();

  const groupId =
    config.whatsapp.groupName;

  /*
   * We cannot use group name here because
   * SQLite stores the actual WhatsApp JID.
   *
   * So restoration is performed later
   * by restoreActivePollForGroup().
   */

  void groupId;

  console.log(
    `💾 Checking SQLite for active poll for ${today}...`
  );
}

export function restoreActivePollForGroup(
  groupId: string
): boolean {
  const today =
    getDateString();

  const poll =
    getOpenPollForDate(
      groupId,
      today
    );

  if (!poll) {
    console.log(
      "💾 No open lunch poll found in SQLite."
    );

    return false;
  }

  const stored =
    getMessage(
      getMessageKey({
        remoteJid: poll.groupId,
        id: poll.pollId,
      })
    );

  /*
   * Depending on how the original message
   * was stored, participant may be absent.
   *
   * First try the normal group/id key.
   */

  if (!stored) {
    console.warn(
      `⚠️ SQLite poll exists (${poll.pollId}) but original WhatsApp message could not be restored.`
    );

    return false;
  }

  try {
    const message =
      decodeMessage(
        stored.messageData
      );

    setActivePoll({
      message,
      date: poll.pollDate,
      finalized: false,
    });

    console.log(
      `✅ Restored active lunch poll from SQLite: ${poll.pollId}`
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Failed to restore poll from SQLite:",
      error
    );

    return false;
  }
}

export function restorePollById(
  pollId: string,
  groupId: string
): boolean {
  const poll =
    getPollById(pollId);

  if (!poll) {
    return false;
  }

  if (
    poll.status !== "open"
  ) {
    return false;
  }

  /*
   * The original poll message was stored
   * using its remote JID + message ID.
   */

  const stored =
    getMessage(
      getMessageKey({
        remoteJid: groupId,
        id: pollId,
      })
    );

  if (!stored) {
    console.warn(
      `⚠️ Poll ${pollId} exists in SQLite but original message was not found.`
    );

    return false;
  }

  try {
    const message =
      decodeMessage(
        stored.messageData
      );

    setActivePoll({
      message,
      date: poll.pollDate,
      finalized: false,
    });

    console.log(
      `✅ Active poll restored: ${pollId}`
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Failed to restore poll:",
      error
    );

    return false;
  }
}
