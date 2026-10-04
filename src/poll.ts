import {
    getAggregateVotesInPollMessage,
    type WAMessage,
    type WAMessageKey,
    type WAMessageContent,
    type WASocket,
} from "@whiskeysockets/baileys";

import { config } from "./config.js";
import { getContactName } from "./contacts.js";

/**
 * The poll update message type exposed by the
 * installed Baileys version.
 */
type PollUpdateMessage = NonNullable<
    NonNullable<WAMessage["message"]>["pollUpdateMessage"]
>;

/**
 * Active lunch poll.
 */
interface ActivePoll {
    message: WAMessage;
    date: string;
    finalized: boolean;
}

/**
 * One item in the final order.
 */
interface OrderItem {
    name: string;
    quantity: number;
    users: string[];
}

/**
 * Stores WhatsApp messages temporarily.
 *
 * IMPORTANT:
 * This is currently memory-only.
 * We will move this to SQLite before deployment.
 */
const messageStore = new Map<
    string,
    WAMessage
>();

/**
 * Stores raw poll updates.
 *
 * poll ID -> poll updates
 */
const pollUpdates =
    new Map<string, PollUpdateMessage[]>();

/**
 * Current active poll.
 */
let activePoll: ActivePoll | null = null;

/**
 * Store a WhatsApp message.
 */
export function storeMessage(
    message: WAMessage
): void {
    if (!message.key.id) {
        return;
    }

    messageStore.set(
        getMessageKey(message.key),
        message
    );
}

/**
 * Retrieve a previously stored WhatsApp message.
 *
 * Used by Baileys through getMessage().
 */
export function getStoredMessage(
    key: WAMessageKey
): WAMessageContent | undefined {
    if (!key.id) {
        return undefined;
    }

    const message = messageStore.get(
        getMessageKey(key)
    );

    return message?.message ?? undefined;
}

/**
 * Store an incoming poll update.
 */
export function storePollUpdate(
    key: WAMessageKey,
    update: PollUpdateMessage
): void {
    /*
     * IMPORTANT:
     *
     * key.id is the ID of the poll-vote/update message.
     *
     * It is NOT the ID of the original poll.
     *
     * The original poll ID is stored inside:
     *
     * update.pollCreationMessageKey.id
     */
    const pollId =
        update.pollCreationMessageKey?.id;

    if (!pollId) {
        console.warn(
            "⚠️ Poll update received without pollCreationMessageKey."
        );

        console.warn(
            "Update:",
            update
        );

        return;
    }

    const existing =
        pollUpdates.get(pollId) ?? [];

    existing.push(update);

    pollUpdates.set(
        pollId,
        existing
    );

    console.log(
        `🗳️ Poll vote received for poll ${pollId}`
    );

    console.log(
        `   Vote updates stored: ${existing.length}`
    );
}

/**
 * Create today's lunch poll.
 */
export async function createLunchPoll(
    sock: WASocket,
    groupId: string
): Promise<void> {
    /*
     * Prevent duplicate polls during the same
     * running process/day.
     */
    if (
        activePoll &&
        activePoll.date === getDateString() &&
        !activePoll.finalized
    ) {
        console.log(
            "⚠️ Today's lunch poll already exists."
        );

        console.log(
            "⏭️ Skipping duplicate poll."
        );

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
                    name: config.poll.title,

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

    /*
     * Save original poll message.
     */
    storeMessage(message);

    /*
     * Make sure this poll starts with
     * an empty vote collection.
     */
    if (message.key.id) {
        pollUpdates.delete(
            message.key.id
        );
    }

    /*
     * Register active poll.
     */
    activePoll = {
        message,
        date: getDateString(),
        finalized: false,
    };

    console.log(
        "✅ Lunch poll created successfully."
    );

    console.log(
        `🆔 Poll ID: ${message.key.id ?? "unknown"
        }`
    );

    console.log("");
}

/**
 * Finalize today's lunch poll.
 */
export async function finalizeLunchPoll(
    sock: WASocket,
    groupId: string
): Promise<void> {
    if (!activePoll) {
        console.log(
            "⚠️ No active lunch poll found."
        );

        return;
    }

    if (activePoll.finalized) {
        console.log(
            "⚠️ Today's lunch poll has already been finalized."
        );

        return;
    }

    const pollMessage =
        activePoll.message;

    const pollId =
        pollMessage.key.id;

    if (!pollId) {
        throw new Error(
            "Active poll does not have a message ID."
        );
    }

    if (!pollMessage.message) {
        throw new Error(
            "Original poll message content is unavailable."
        );
    }

    /*
     * Get all stored updates.
     */
    const updates =
        pollUpdates.get(pollId) ?? [];

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
        `🆔 Poll ID: ${pollId}`
    );

    console.log(
        `🗳️ Poll updates: ${updates.length}`
    );

    /*
     * Baileys' generated types differ slightly
     * between versions around poll updates.
     *
     * We keep the compatibility conversion isolated
     * at this boundary.
     */
    const aggregateUpdates =
        updates.map(
            (update) => ({
                pollUpdateMessage: update,
            })
        ) as unknown as NonNullable<
            WAMessage["pollUpdates"]
        >;

    /*
     * Ask Baileys to aggregate the poll votes.
     */
    const aggregatedVotes =
        getAggregateVotesInPollMessage({
            message:
                pollMessage.message,

            pollUpdates:
                aggregateUpdates,
        });

    /*
     * Convert aggregated votes to our
     * application-level order format.
     */
    const orders: OrderItem[] = [];

    let totalOrders = 0;

    for (
        const result of aggregatedVotes
    ) {
        const voters =
            result.voters ?? [];

        const users =
            voters.map(
                (jid) =>
                    getContactName(jid)
            );

        const quantity =
            voters.length;

        orders.push({
            name: result.name,
            quantity,
            users,
        });

        totalOrders += quantity;
    }

    /*
     * Ensure every configured menu item
     * appears in the final report.
     */
    const completeOrders =
        orders.filter(
            (order) =>
                order.quantity > 0
        );

    /*
     * Build final message.
     */
    const finalMessage =
        buildFinalOrderMessage(
            completeOrders,
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
     * Only mark finalized after
     * successfully sending.
     */
    activePoll.finalized =
        true;

    console.log("");
    console.log(
        finalMessage
    );

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

/**
 * Build the final WhatsApp message.
 */
function buildFinalOrderMessage(
    orders: OrderItem[],
    totalOrders: number
): string {
    const lines: string[] = [];

    lines.push(
        "🔒 *FINAL LUNCH ORDER*"
    );

    lines.push(
        "━━━━━━━━━━━━━━━━━━━━"
    );

    lines.push("");

    for (const order of orders) {
        lines.push(
            `${getFoodEmoji(order.name)} *${order.name}* — ${order.quantity}`
        );

        if (
            order.users.length > 0
        ) {
            for (
                const user of order.users
            ) {
                lines.push(
                    `   • ${user}`
                );
            }
        } else {
            lines.push(
                "   • No orders"
            );
        }

        lines.push("");
    }

    lines.push(
        "━━━━━━━━━━━━━━━━━━━━"
    );

    lines.push(
        `🍱 *TOTAL MEALS: ${totalOrders}*`
    );

    lines.push("");

    lines.push(
        "✅ *Final order received.*"
    );

    lines.push(
        `⏰ Closed at ${config.schedule.closeTime}`
    );

    return lines.join("\n");
}

/**
 * Get currently active poll.
 */
export function getActivePoll():
    ActivePoll | null {
    return activePoll;
}

/**
 * Generate a stable key for a WhatsApp message.
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
 * Get today's date in configured timezone.
 */
function getDateString(): string {
    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone:
                config.schedule.timezone,
        }
    ).format(
        new Date()
    );
}

/**
 * Select an appropriate emoji.
 */
function getFoodEmoji(
    item: string
): string {
    const value =
        item.toLowerCase();

    if (
        value.includes("biryani")
    ) {
        return "🍚";
    }

    if (
        value.includes("thali")
    ) {
        return "🍱";
    }

    if (
        value.includes("bhature")
    ) {
        return "🫓";
    }

    if (
        value.includes("rice") ||
        value.includes("chawal")
    ) {
        return "🍚";
    }

    if (
        value.includes("paratha")
    ) {
        return "🥘";
    }

    if (
        value.includes("poori")
    ) {
        return "🫓";
    }

    if (
        value.includes("khichadi")
    ) {
        return "🍚";
    }

    if (
        value.includes("custom")
    ) {
        return "📦";
    }

    return "🍱";
}
