import "dotenv/config";

export const config = {
  timezone: process.env.TIMEZONE ?? "Asia/Kolkata",

  groupId: process.env.WHATSAPP_GROUP_ID ?? "",

  pollHour: Number(process.env.POLL_HOUR ?? 12),
  pollMinute: Number(process.env.POLL_MINUTE ?? 0),

  closeHour: Number(process.env.CLOSE_HOUR ?? 13),
  closeMinute: Number(process.env.CLOSE_MINUTE ?? 0),

  menu: [
    "Chicken Biryani",
    "Veg Thali",
    "Paneer Rice"
  ]
};