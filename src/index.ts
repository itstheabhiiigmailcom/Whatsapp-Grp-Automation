import {
    connectWhatsApp,
  } from "./whatsapp.js";
  
  import {
    startScheduler,
  } from "./scheduler.js";
  
  import { config } from "./config.js";
  
  async function main(): Promise<void> {
    console.log(
      "===================================="
    );
  
    console.log(
      "       🍱 Lunch WhatsApp Bot"
    );
  
    console.log(
      "===================================="
    );
  
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
  
    console.log("");
  
    /*
     * Establish WhatsApp connection.
     */
    await connectWhatsApp();
  
    /*
     * Start scheduler.
     */
    await startScheduler();
  
    /*
     * Keep the process alive.
     */
    console.log("");
    console.log(
      "🟢 Lunch WhatsApp Bot is running."
    );
  }
  
  main().catch((error) => {
    console.error(
      "💥 Fatal error:",
      error
    );
  
    process.exit(1);
  });
  