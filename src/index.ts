import {
    connectWhatsApp,
    findGroupByName,
    getSocket,
  } from "./whatsapp.js";
  
  import {
    sendTestLunchPoll,
  } from "./poll.js";
  
  async function main(): Promise<void> {
    console.log("====================================");
    console.log("       🍱 Lunch WhatsApp Bot");
    console.log("====================================");
  
    await connectWhatsApp();
  
    const groupId =
      await findGroupByName("Red Boys💪");
  
    console.log("🎯 Using group:");
    console.log(groupId);
  
    await sendTestLunchPoll(
      getSocket(),
      groupId
    );
  }
  
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
