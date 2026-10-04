import { config } from "./config.js";
import {
  connectWhatsApp,
  resetConnectionState,
} from "./whatsapp/index.js";
import { startScheduler } from "./scheduler/index.js";
import { closeDatabase } from "./db/index.js";

async function main(): Promise<void> {
  console.log("");
  console.log("====================================");
  console.log("       🍱 Lunch WhatsApp Bot");
  console.log("====================================");
  console.log("");

  console.log(
    `📱 Group: ${config.whatsapp.groupName}`
  );

  console.log(
    `🍱 Menu: ${config.menu.items.join(", ")}`
  );

  console.log(
    `📝 Poll: ${config.poll.title}`
  );

  console.log(
    `⏰ Poll time: ${config.schedule.pollTime}`
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
    `🌏 Timezone: ${config.schedule.timezone}`
  );

  console.log(
    `📅 Active days: ${config.schedule.activeDays.join(", ")}`
  );

  console.log(
    `🤖 Auto poll: ${config.bot.autoPollEnabled}`
  );

  console.log(
    `🤖 Auto close: ${config.bot.autoCloseEnabled}`
  );

  console.log(
    `💾 Database: ${config.database.path}`
  );

  console.log("");

  /*
   * ==========================================
   * WHATSAPP
   * ==========================================
   */

  for (;;) {
    try {
      await connectWhatsApp();
      break;
    } catch (error) {
      console.error(
        "❌ WhatsApp connection failed. Retrying in 5 seconds:",
        error
      );

      resetConnectionState();

      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
    }
  }

  /*
   * ==========================================
   * SCHEDULER
   * ==========================================
   */

  for (;;) {
    try {
      await startScheduler();
      break;
    } catch (error) {
      console.error(
        "❌ Scheduler startup failed. Retrying in 5 seconds:",
        error
      );

      resetConnectionState();

      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
    }
  }

  /*
   * ==========================================
   * KEEP PROCESS ALIVE
   * ==========================================
   */

  console.log("");
  console.log(
    "🟢 Lunch WhatsApp Bot is running."
  );
  console.log("");
}

/*
 * ==========================================
 * GRACEFUL SHUTDOWN
 * ==========================================
 */

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log("");
  console.log(
    `🛑 Received ${signal}. Shutting down...`
  );

  try {
    closeDatabase();
  } catch (error) {
    console.error(
      "❌ Failed to close SQLite database:",
      error
    );
  }

  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

/*
 * ==========================================
 * START APPLICATION
 * ==========================================
 */

main().catch((error: unknown) => {
  console.error("");
  console.error(
    "💥 Fatal error:",
    error
  );

  try {
    closeDatabase();
  } catch {
    // Ignore database-close errors during fatal startup.
  }

  process.exit(1);
});
