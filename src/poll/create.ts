import { type WASocket } from "@whiskeysockets/baileys";

import { config } from "../config.js";
import {
  createPoll,
  getOpenPollForDate,
} from "../db/index.js";

import { getDateString } from "./date.js";
import { storeMessage } from "./messages.js";
import { restorePollById } from "./restore.js";
import {
  getActivePoll,
  setActivePoll,
} from "./state.js";

export async function sendTestLunchPoll(
  sock: WASocket,
  groupId: string
): Promise<void> {
  console.log("");
  console.log(
    "🍱 Sending test lunch poll..."
  );

  const message =
    await sock.sendMessage(
      groupId,
      {
        poll: {
          name:
            config.poll.title,

          values:
            config.menu.items,

          selectableCount:
            config.poll
              .selectableCount,
        },
      }
    );

  if (!message) {
    throw new Error(
      "Failed to send lunch poll."
    );
  }

  storeMessage(message);

  const pollId =
    message.key.id;

  if (!pollId) {
    throw new Error(
      "Created poll does not have a message ID."
    );
  }

  const today =
    getDateString();

  createPoll(
    pollId,
    groupId,
    config.poll.title,
    today
  );

  setActivePoll({
    message,
    date: today,
    finalized: false,
  });

  console.log(
    "✅ Test lunch poll sent."
  );

  console.log(
    `🆔 Poll ID: ${pollId}`
  );

  console.log("");
}

export async function createLunchPoll(
  sock: WASocket,
  groupId: string
): Promise<void> {
  const today =
    getDateString();

  /*
   * First check SQLite.
   *
   * This prevents duplicate polls even
   * after a process restart.
   */

  const existingPoll =
    getOpenPollForDate(
      groupId,
      today
    );

  if (existingPoll) {
    console.log("");
    console.log(
      "⚠️ Today's lunch poll already exists."
    );

    console.log(
      `🆔 Existing Poll ID: ${existingPoll.pollId}`
    );

    /*
     * If memory state was lost but SQLite
     * still contains the poll, try restoring it.
     */

    const activePoll = getActivePoll();

    if (
      !activePoll ||
      activePoll.date !== today
    ) {
      restorePollById(
        existingPoll.pollId,
        groupId
      );
    }

    return;
  }

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "🍱 CREATING LUNCH POLL"
  );
  console.log(
    "=========================================="
  );

  console.log(
    `📍 Group: ${groupId}`
  );

  console.log(
    `📝 Title: ${config.poll.title}`
  );

  console.log(
    `🍽️ Menu items: ${config.menu.items.length}`
  );

  const message =
    await sock.sendMessage(
      groupId,
      {
        poll: {
          name:
            config.poll.title,

          values:
            config.menu.items,

          selectableCount:
            config.poll
              .selectableCount,
        },
      }
    );

  if (!message) {
    throw new Error(
      "WhatsApp did not return the created poll message."
    );
  }

  const pollId =
    message.key.id;

  if (!pollId) {
    throw new Error(
      "Created lunch poll does not have a message ID."
    );
  }

  /*
   * Persist original WhatsApp message.
   */

  storeMessage(message);

  /*
   * Persist poll metadata.
   */

  createPoll(
    pollId,
    groupId,
    config.poll.title,
    today
  );

  /*
   * Set current in-memory reference.
   *
   * This is only a runtime cache now.
   * SQLite remains the source of truth.
   */

  setActivePoll({
    message,
    date: today,
    finalized: false,
  });

  console.log(
    "✅ Lunch poll created successfully."
  );

  console.log(
    `🆔 Poll ID: ${pollId}`
  );

  console.log("");
}
