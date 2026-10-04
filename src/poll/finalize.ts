import {
  getAggregateVotesInPollMessage,
  type WASocket,
} from "@whiskeysockets/baileys";

import { getContactName } from "../contacts.js";
import {
  closePoll,
  getPollById,
  getPollUpdates,
} from "../db/index.js";

import { buildFinalOrderMessage } from "./format.js";
import { restoreActivePollForGroup } from "./restore.js";
import { getActivePoll } from "./state.js";
import type { OrderItem } from "./types.js";
import { loadPollUpdates } from "./voters.js";

export async function finalizeLunchPoll(
  sock: WASocket,
  groupId: string
): Promise<void> {
  /*
   * If memory has lost the active poll,
   * recover it from SQLite.
   */

  let activePoll = getActivePoll();

  if (!activePoll) {
    const restored =
      restoreActivePollForGroup(
        groupId
      );

    if (!restored) {
      console.log(
        "⚠️ No active lunch poll found."
      );

      return;
    }
  }

  activePoll = getActivePoll();

  if (!activePoll) {
    return;
  }

  if (activePoll.finalized) {
    console.log(
      "⚠️ Lunch poll has already been finalized."
    );

    return;
  }

  const pollMessage =
    activePoll.message;

  const messageId =
    pollMessage.key.id;

  if (!messageId) {
    throw new Error(
      "Poll message does not have an ID."
    );
  }

  if (!pollMessage.message) {
    throw new Error(
      "Original poll message content is unavailable."
    );
  }

  const pollRecord =
    getPollById(messageId);

  if (
    pollRecord &&
    pollRecord.status === "closed"
  ) {
    console.log(
      "⚠️ SQLite says this poll is already closed."
    );

    activePoll.finalized = true;

    return;
  }

  /*
   * Load every vote update from SQLite.
   */

  const pollUpdates =
    loadPollUpdates(messageId);

  const storedCount =
    getPollUpdates(messageId).length;

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "🔒 FINALIZING LUNCH ORDER"
  );
  console.log(
    "=========================================="
  );

  console.log(
    `🆔 Poll ID: ${messageId}`
  );

  console.log(
    `🗳️ Poll updates: ${storedCount}`
  );

  /*
   * Aggregate votes.
   *
   * Baileys handles decryption and
   * aggregation of the poll responses.
   */

  const aggregatedVotes =
    getAggregateVotesInPollMessage({
      message:
        pollMessage.message,

      pollUpdates,
    });

  const orders: OrderItem[] =
    [];

  let totalOrders = 0;

  for (
    const result of aggregatedVotes
  ) {
    const voters =
      result.voters ?? [];

    if (voters.length === 0) {
      continue;
    }

    const users =
      voters.map(
        (jid) =>
          getContactName(jid)
      );

    const uniqueUsers =
      [...new Set(users)];

    const quantity =
      voters.length;

    orders.push({
      name: result.name,
      quantity,
      users: uniqueUsers,
    });

    totalOrders += quantity;
  }

  /*
   * IMPORTANT:
   *
   * Only items with orders are included.
   *
   * Zero-order items are intentionally
   * excluded from the final message.
   */

  const finalMessage =
    buildFinalOrderMessage(
      orders,
      totalOrders
    );

  /*
   * Send final order.
   */

  await sock.sendMessage(
    groupId,
    {
      text: finalMessage,
    }
  );

  /*
   * Only mark SQLite as closed after
   * WhatsApp successfully accepts the
   * final message.
   */

  closePoll(messageId);

  activePoll.finalized = true;

  console.log("");
  console.log(finalMessage);
  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "✅ FINAL ORDER SENT"
  );

  console.log(
    `🍱 TOTAL MEALS: ${totalOrders}`
  );

  console.log(
    "=========================================="
  );

  console.log("");
}
