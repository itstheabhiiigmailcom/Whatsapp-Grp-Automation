import cron, {
    type ScheduledTask,
  } from "node-cron";

import { config } from "./config.js";

import {
  connectWhatsApp,
  findGroupByName,
  getSocket,
} from "./whatsapp.js";

import {
  createLunchPoll,
  finalizeLunchPoll,
} from "./poll.js";

let pollJob: ScheduledTask | null = null;
let closeJob: ScheduledTask | null = null;

/**
 * Convert HH:mm into cron fields.
 *
 * Example:
 *
 * 12:00 -> "0 12 * * *"
 * 13:00 -> "0 13 * * *"
 */
function timeToCron(time: string): string {
  const [hour, minute] = time
    .split(":")
    .map(Number);

  return `${minute} ${hour} * * *`;
}

/**
 * Check whether today is an enabled day.
 *
 * JavaScript:
 *
 * Sunday = 0
 * Monday = 1
 * ...
 * Saturday = 6
 *
 * Our configuration:
 *
 * Monday = 1
 * ...
 * Sunday = 7
 */
function isActiveDay(): boolean {
  const jsDay = new Date().getDay();

  const configuredDay =
    jsDay === 0 ? 7 : jsDay;

  return config.schedule.activeDays.includes(
    configuredDay
  );
}

/**
 * Start the lunch scheduler.
 */
export async function startScheduler(): Promise<void> {
  console.log("");
  console.log("====================================");
  console.log("       ⏰ Lunch Scheduler");
  console.log("====================================");

  console.log(
    `🌏 Timezone: ${config.schedule.timezone}`
  );

  console.log(
    `🍱 Poll time: ${config.schedule.pollTime}`
  );

  console.log(
    `🔒 Close time: ${config.schedule.closeTime}`
  );

  console.log(
    `📅 Active days: ${config.schedule.activeDays.join(", ")}`
  );

  console.log("");

  /*
   * We need the WhatsApp connection before
   * the scheduled jobs execute.
   */
  await connectWhatsApp();

  /*
   * Resolve the configured group once.
   */
  const groupId = await findGroupByName(
    config.whatsapp.groupName
  );

  const sock = getSocket();

  /*
   * Convert configured times to cron expressions.
   */
  const pollCron = timeToCron(
    config.schedule.pollTime
  );

  const closeCron = timeToCron(
    config.schedule.closeTime
  );

  /*
   * Cancel existing jobs if startScheduler()
   * happens to be called again.
   */
  pollJob?.stop();
  closeJob?.stop();

  /*
   * ==========================================
   * POLL JOB
   * ==========================================
   */
  if (config.bot.autoPollEnabled) {
    pollJob = cron.schedule(
      pollCron,
      async () => {
        try {
          if (!isActiveDay()) {
            console.log(
              "⏭️ Today is not an active lunch day."
            );

            return;
          }

          console.log("");
          console.log(
            "⏰ Lunch poll schedule triggered."
          );

          await createLunchPoll(
            sock,
            groupId
          );
        } catch (error) {
          console.error(
            "❌ Failed to create scheduled lunch poll:",
            error
          );
        }
      },
      {
        timezone:
          config.schedule.timezone,
      }
    );

    console.log(
      `✅ Poll scheduler enabled: ${pollCron}`
    );
  } else {
    console.log(
      "⏸️ Automatic poll is disabled."
    );
  }

  /*
   * ==========================================
   * CLOSE JOB
   * ==========================================
   */
  if (config.bot.autoCloseEnabled) {
    closeJob = cron.schedule(
      closeCron,
      async () => {
        try {
          if (!isActiveDay()) {
            console.log(
              "⏭️ Today is not an active lunch day."
            );

            return;
          }

          console.log("");
          console.log(
            "⏰ Lunch closing schedule triggered."
          );

          await finalizeLunchPoll(
            sock,
            groupId
          );
        } catch (error) {
          console.error(
            "❌ Failed to finalize scheduled lunch poll:",
            error
          );
        }
      },
      {
        timezone:
          config.schedule.timezone,
      }
    );

    console.log(
      `✅ Close scheduler enabled: ${closeCron}`
    );
  } else {
    console.log(
      "⏸️ Automatic closing is disabled."
    );
  }

  console.log("");
  console.log(
    "🟢 Scheduler is running."
  );
}