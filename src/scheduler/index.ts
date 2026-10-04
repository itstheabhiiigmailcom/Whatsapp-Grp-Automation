import cron, { type ScheduledTask } from "node-cron";

import { config } from "../config.js";

import {
  createLunchPoll,
  finalizeLunchPoll,
  sendOrderReminder,
} from "../poll/index.js";

import {
  connectWhatsApp,
  findGroupByName,
  getSocket,
} from "../whatsapp/index.js";

import {
  inactiveDayMessage,
  isActiveDay,
  subtractMinutesFromTime,
  timeToCron,
} from "./time.js";

let pollJob: ScheduledTask | null = null;
let reminderJob: ScheduledTask | null = null;
let closeJob: ScheduledTask | null = null;

/**
 * Start all configured scheduled jobs.
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
    `🔔 Reminder: ${
      config.bot.reminderEnabled
        ? `${config.schedule.reminderMinutesBeforeClose} min before close`
        : "disabled"
    }`
  );

  console.log(
    `🔒 Close time: ${config.schedule.closeTime}`
  );

  console.log(
    `📅 Active days: ${config.schedule.activeDays.join(", ")}`
  );

  console.log("");

  /*
   * Make sure WhatsApp is connected before
   * resolving the group and starting jobs.
   */
  await connectWhatsApp();

  const groupId = await findGroupByName(
    config.whatsapp.groupName
  );

  const sock = getSocket();

  const pollCron = timeToCron(
    config.schedule.pollTime
  );

  const closeCron = timeToCron(
    config.schedule.closeTime
  );

  const reminderTime =
    subtractMinutesFromTime(
      config.schedule.closeTime,
      config.schedule.reminderMinutesBeforeClose
    );

  const reminderCron =
    timeToCron(reminderTime);

  /*
   * Prevent duplicate jobs if scheduler
   * gets started more than once.
   */
  pollJob?.stop();
  reminderJob?.stop();
  closeJob?.stop();

  // ==========================================
  // POLL JOB
  // ==========================================

  if (config.bot.autoPollEnabled) {
    pollJob = cron.schedule(
      pollCron,
      async () => {
        try {
          if (!isActiveDay()) {
            console.log(
              inactiveDayMessage()
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
        timezone: config.schedule.timezone,
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

  // ==========================================
  // REMINDER JOB
  // ==========================================

  if (config.bot.reminderEnabled) {
    reminderJob = cron.schedule(
      reminderCron,
      async () => {
        try {
          if (!isActiveDay()) {
            console.log(
              inactiveDayMessage()
            );
            return;
          }

          console.log("");
          console.log(
            "⏰ Lunch reminder schedule triggered."
          );

          await sendOrderReminder(
            sock,
            groupId
          );
        } catch (error) {
          console.error(
            "❌ Failed to send lunch reminder:",
            error
          );
        }
      },
      {
        timezone: config.schedule.timezone,
      }
    );

    console.log(
      `✅ Reminder scheduler enabled: ${reminderCron}`
    );

    console.log(
      `   🔔 Reminder time: ${reminderTime}`
    );

    console.log(
      `   ⏱️ ${config.schedule.reminderMinutesBeforeClose} minutes before close`
    );
  } else {
    console.log(
      "⏸️ Lunch reminder is disabled."
    );
  }

  // ==========================================
  // CLOSE JOB
  // ==========================================

  if (config.bot.autoCloseEnabled) {
    closeJob = cron.schedule(
      closeCron,
      async () => {
        try {
          if (!isActiveDay()) {
            console.log(
              inactiveDayMessage()
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
        timezone: config.schedule.timezone,
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
    "===================================="
  );
  console.log(
    "🟢 Scheduler is running."
  );
  console.log(
    "===================================="
  );

  console.log(
    `📍 Group: ${config.whatsapp.groupName}`
  );

  console.log(
    `🍱 Poll: ${config.schedule.pollTime}`
  );

  if (config.bot.reminderEnabled) {
    console.log(
      `🔔 Reminder: ${reminderTime}`
    );
  }

  console.log(
    `🔒 Close: ${config.schedule.closeTime}`
  );

  console.log("");
}
