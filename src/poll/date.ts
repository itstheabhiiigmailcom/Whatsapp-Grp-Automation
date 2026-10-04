import { config } from "../config.js";

export function getDateString(): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        config.schedule.timezone,
    }
  ).format(new Date());
}
