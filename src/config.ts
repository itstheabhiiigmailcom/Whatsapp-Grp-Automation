import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }

  return value.trim();
}

function boolean(
  name: string,
  defaultValue: boolean
): boolean {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  throw new Error(
    `${name} must be either true or false.`
  );
}

function integer(
  name: string,
  defaultValue: number
): number {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(
      `${name} must be a valid integer.`
    );
  }

  return parsed;
}

function menuItems(): string[] {
  const value = required("MENU_ITEMS");

  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    throw new Error(
      "MENU_ITEMS must contain at least one item."
    );
  }

  return items;
}

function activeDays(): number[] {
  const value = required("ACTIVE_DAYS");

  const days = value
    .split(",")
    .map((day) =>
      Number.parseInt(day.trim(), 10)
    );

  if (days.length === 0) {
    throw new Error(
      "ACTIVE_DAYS must contain at least one day."
    );
  }

  for (const day of days) {
    if (
      Number.isNaN(day) ||
      day < 1 ||
      day > 7
    ) {
      throw new Error(
        "ACTIVE_DAYS must contain numbers from 1 to 7."
      );
    }
  }

  return [...new Set(days)].sort(
    (a, b) => a - b
  );
}

function validateTime(name: string): string {
  const value = required(name);

  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw new Error(
      `${name} must use HH:mm format.`
    );
  }

  const [hours, minutes] =
    value.split(":").map(Number);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(
      `${name} must be a valid time.`
    );
  }

  return value;
}

const selectableCount = integer(
  "POLL_SELECTABLE_COUNT",
  1
);

if (selectableCount < 1) {
  throw new Error(
    "POLL_SELECTABLE_COUNT must be at least 1."
  );
}

const reminderMinutesBeforeClose =
  integer(
    "REMINDER_MINUTES_BEFORE_CLOSE",
    5
  );

function clockMinus(
  time: string,
  minutesToSubtract: number
): string {
  const [hour, minute] =
    time.split(":").map(Number);

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

const closeTime = validateTime("CLOSE_TIME");

const alertTime = clockMinus(
  closeTime,
  reminderMinutesBeforeClose
);

function pollTitle(): string {
  const title =
    process.env.POLL_TITLE?.trim() ||
    "🍱 Today's Lunch";

  const voteBy =
    `(Please vote before ${alertTime}. Ends at ${closeTime})`;

  if (title.includes("Please vote before")) {
    return title;
  }

  return `${title} ${voteBy}`;
}

if (reminderMinutesBeforeClose < 1) {
  throw new Error(
    "REMINDER_MINUTES_BEFORE_CLOSE must be at least 1."
  );
}

export const config = {
  whatsapp: {
    groupName: required(
      "WHATSAPP_GROUP_NAME"
    ),

    authDir:
      process.env.WHATSAPP_AUTH_DIR?.trim() ||
      "./auth",
  },

  database: {
    path:
      process.env.DATABASE_PATH?.trim() ||
      "./data/lunch.db",
  },

  menu: {
    items: menuItems(),
  },

  poll: {
    title: pollTitle(),

    selectableCount,
  },

  schedule: {
    timezone:
      process.env.TIMEZONE?.trim() ||
      "Asia/Kolkata",

    pollTime:
      validateTime("POLL_TIME"),

    closeTime,

    alertTime,

    activeDays:
      activeDays(),

    reminderMinutesBeforeClose,
  },

  bot: {
    autoPollEnabled: boolean(
      "AUTO_POLL_ENABLED",
      false
    ),

    autoCloseEnabled: boolean(
      "AUTO_CLOSE_ENABLED",
      false
    ),

    reminderEnabled: boolean(
      "REMINDER_ENABLED",
      true
    ),

    contactPerson:
      process.env.CONTACT_PERSON?.trim() ||
      "Akash",
  },

  logging: {
    level:
      process.env.LOG_LEVEL?.trim() ||
      "info",
  },
} as const;
