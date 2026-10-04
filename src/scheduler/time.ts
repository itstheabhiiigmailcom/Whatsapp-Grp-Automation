import { config } from "../config.js";

/**
 * Convert HH:mm into a node-cron expression.
 *
 * Example:
 * 12:00 -> 0 12 * * *
 * 13:00 -> 0 13 * * *
 */
export function timeToCron(time: string): string {
  const [hour, minute] = time.split(":").map(Number);

  return `${minute} ${hour} * * *`;
}

/**
 * Subtract minutes from an HH:mm time.
 */
export function subtractMinutesFromTime(
  time: string,
  minutesToSubtract: number
): string {
  const [hour, minute] = time.split(":").map(Number);

  const totalMinutes =
    hour * 60 + minute - minutesToSubtract;

  const normalizedMinutes =
    ((totalMinutes % 1440) + 1440) % 1440;

  const resultHour = Math.floor(
    normalizedMinutes / 60
  );

  const resultMinute =
    normalizedMinutes % 60;

  return `${String(resultHour).padStart(2, "0")}:${String(
    resultMinute
  ).padStart(2, "0")}`;
}

const dayNames = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const weekdayNumbers: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/**
 * Weekday in the configured timezone.
 *
 * Monday = 1
 * ...
 * Sunday = 7
 */
export function todayConfiguredDay(): number {
  const weekday = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: config.schedule.timezone,
      weekday: "short",
    }
  ).format(new Date());

  return weekdayNumbers[weekday] ?? 0;
}

/**
 * Check whether today is an enabled day.
 */
export function isActiveDay(): boolean {
  return config.schedule.activeDays.includes(
    todayConfiguredDay()
  );
}

export function inactiveDayMessage(): string {
  const day =
    dayNames[todayConfiguredDay()] ??
    "Today";

  return `⏭️ Skipping: ${day} is not an active lunch day.`;
}
