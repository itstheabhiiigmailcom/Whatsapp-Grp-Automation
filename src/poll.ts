import {
    getAggregateVotesInPollMessage,
    type WAMessage,
    type WAMessageKey,
    type WAMessageContent,
    type WASocket,
  } from "@whiskeysockets/baileys";
  
  import { config } from "./config.js";
  
  interface ActivePoll {
    message: WAMessage;
    date: string;
    finalized: boolean;
  }
  
  /**
   * In-memory message store.
   *
   * This is enough for the initial development version.
   * We will replace this with SQLite persistence in the next version.
   */
  const messageStore = new Map<string, WAMessage>();
  
  /**
   * Poll vote updates indexed by poll message ID.
   */
  const pollUpdates = new Map<
    string,
    NonNullable<WAMessage["pollUpdates"]>
  >();
  
  let activePoll: ActivePoll | null = null;
  
  /**
   * Store a WhatsApp message so that Baileys can later
   * retrieve the original poll message when decrypting votes.
   */
  export function storeMessage(message: WAMessage): void {
    if (!message.key.id) {
      return;
    }
  
    messageStore.set(getMessageKey(message.key), message);
  }
  
  /**
   * Baileys calls this when it needs the original message.
   */
  export function getStoredMessage(
    key: WAMessageKey
  ): WAMessageContent | undefined {
    if (!key.id) {
      return undefined;
    }
  
    const message = messageStore.get(getMessageKey(key));
  
    return message?.message ?? undefined;
  }
  
  /**
   * Store incoming poll vote updates.
   */
  export function storePollUpdate(
    key: WAMessageKey,
    updates: NonNullable<WAMessage["pollUpdates"]>
  ): void {
    if (!key.id) {
      return;
    }
  
    const messageId = key.id;
  
    const existing = pollUpdates.get(messageId) ?? [];
  
    pollUpdates.set(messageId, [
      ...existing,
      ...updates,
    ]);
  
    console.log(
      `🗳️ Stored poll update for ${messageId}`
    );
  }
  
  /**
   * Create today's lunch poll.
   */
  export async function createLunchPoll(
    sock: WASocket
  ): Promise<void> {
    if (!config.groupId) {
      throw new Error(
        "WHATSAPP_GROUP_ID is not configured in .env"
      );
    }
  
    if (activePoll) {
      console.log(
        "⚠️ An active lunch poll already exists."
      );
  
      return;
    }
  
    const today = getDateString();
  
    console.log(
      `🍱 Creating lunch poll for ${today}`
    );
  
    const message = await sock.sendMessage(
      config.groupId,
      {
        poll: {
          name: "🍱 Today's Lunch",
          values: config.menu,
          selectableCount: 1,
        },
      }
    );
  
    if (!message) {
      throw new Error(
        "WhatsApp did not return the poll message."
      );
    }
  
    storeMessage(message);
  
    activePoll = {
      message,
      date: today,
      finalized: false,
    };
  
    console.log(
      `✅ Lunch poll created: ${message.key.id}`
    );
  }
  
  /**
   * Finalize today's lunch order.
   */
  export async function finalizeLunchPoll(
    sock: WASocket
  ): Promise<void> {
    if (!activePoll) {
      console.log(
        "⚠️ No active lunch poll found."
      );
  
      return;
    }
  
    if (activePoll.finalized) {
      console.log(
        "⚠️ Lunch poll is already finalized."
      );
  
      return;
    }
  
    const pollMessage = activePoll.message;
  
    const messageId = pollMessage.key.id;
  
    if (!messageId) {
      throw new Error(
        "Poll message does not have an ID."
      );
    }
  
    const updates = pollUpdates.get(messageId) ?? [];
  
    console.log(
      `📊 Processing ${updates.length} poll updates...`
    );
  
    const aggregatedVotes =
      getAggregateVotesInPollMessage({
        message: pollMessage.message,
        pollUpdates: updates,
      });
  
    const lines: string[] = [];
  
    let totalOrders = 0;
  
    for (const result of aggregatedVotes) {
      const quantity = result.voters.length;
  
      totalOrders += quantity;
  
      lines.push(
        `${getFoodEmoji(result.name)} ${result.name} — ${quantity}`
      );
    }
  
    /**
     * If nobody voted, still send a useful message.
     */
    if (lines.length === 0) {
      lines.push("No orders received.");
    }
  
    const finalMessage = [
      "🔒 *LUNCH ORDER CLOSED*",
      "",
      "Today's final order:",
      "",
      ...lines,
      "",
      "━━━━━━━━━━━━━━━━",
      `🍱 Total Meals — ${totalOrders}`,
      "",
      "Order finalized at 1:00 PM.",
    ].join("\n");
  
    await sock.sendMessage(
      config.groupId,
      {
        text: finalMessage,
      }
    );
  
    activePoll.finalized = true;
  
    console.log(
      "✅ Final lunch order sent."
    );
  
    console.log(
      `🍱 Total meals: ${totalOrders}`
    );
  }
  
  export function getActivePoll(): ActivePoll | null {
    return activePoll;
  }
  
  /**
   * Create a stable key for a WhatsApp message.
   */
  function getMessageKey(
    key: WAMessageKey
  ): string {
    return [
      key.remoteJid ?? "",
      key.id ?? "",
      key.participant ?? "",
    ].join(":");
  }
  
  /**
   * Get current date in configured timezone.
   *
   * Example:
   * 2026-10-04
   */
  function getDateString(): string {
    return new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: config.timezone,
      }
    ).format(new Date());
  }
  
  /**
   * Basic emoji mapping for menu items.
   */
  function getFoodEmoji(
    item: string
  ): string {
    const value = item.toLowerCase();
  
    if (value.includes("biryani")) {
      return "🍗";
    }
  
    if (
      value.includes("veg") ||
      value.includes("thali")
    ) {
      return "🥗";
    }
  
    if (value.includes("paneer")) {
      return "🧀";
    }
  
    return "🍱";
  }

  export async function sendTestLunchPoll(
    sock: WASocket,
    groupId: string
  ): Promise<void> {
    const menu = [
      "Veg Thali",
      "Chicken Biryani",
      "Paneer Rice",
      "No Lunch",
    ];
  
    console.log("\n🍱 Sending test lunch poll...");
    console.log(`Group: ${groupId}`);
  
    const message = await sock.sendMessage(
      groupId,
      {
        poll: {
          name: "🍱 TEST — Today's Lunch",
          values: menu,
          selectableCount: 1,
        },
      }
    );
  
    if (!message) {
      throw new Error("Failed to send lunch poll.");
    }
  
    storeMessage(message);
  
    console.log("✅ Test lunch poll sent.");
    console.log(`Poll ID: ${message.key.id}\n`);
  }
  