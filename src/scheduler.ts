import cron from "node-cron";

import { config } from "./config.js";

import {
  createLunchPoll,
  finalizeLunchPoll
} from "./poll.js";

import { getSocket } from "./whatsapp.js";

export function startScheduler(): void {
  const pollExpression =
    `${config.pollMinute} ${config.pollHour} * * *`;

  const closeExpression =
    `${config.closeMinute} ${config.closeHour} * * *`;

  console.log(
    `⏰ Poll schedule: ${pollExpression}`
  );

  console.log(
    `⏰ Close schedule: ${closeExpression}`
  );

  cron.schedule(
    pollExpression,
    async () => {
      console.log(
        "⏰ 12:00 PM — Creating lunch poll..."
      );

      try {
        const sock = getSocket();

        await createLunchPoll(sock);
      } catch (error) {
        console.error(
          "❌ Failed to create lunch poll:",
          error
        );
      }
    },
    {
      timezone: config.timezone
    }
  );

  cron.schedule(
    closeExpression,
    async () => {
      console.log(
        "⏰ 1:00 PM — Finalizing lunch..."
      );

      try {
        const sock = getSocket();

        await finalizeLunchPoll(sock);
      } catch (error) {
        console.error(
          "❌ Failed to finalize lunch:",
          error
        );
      }
    },
    {
      timezone: config.timezone
    }
  );
}