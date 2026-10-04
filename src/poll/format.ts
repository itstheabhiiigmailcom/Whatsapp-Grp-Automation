import { config } from "../config.js";

import type { OrderItem } from "./types.js";

export function getFoodEmoji(
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

export function buildFinalOrderMessage(
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

  /*
   * Only ordered items are shown.
   */

  for (const order of orders) {
    lines.push(
      `${getFoodEmoji(order.name)} *${order.name}* — ${order.quantity}`
    );

    for (
      const user of order.users
    ) {
      lines.push(
        `   • ${user}`
      );
    }

    lines.push("");
  }

  /*
   * No orders at all.
   */

  if (orders.length === 0) {
    lines.push(
      "⚠️ No lunch orders received."
    );

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
