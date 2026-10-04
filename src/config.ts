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
    .map((day) => Number.parseInt(day.trim(), 10));

  if (days.length === 0) {
    throw new Error(
      "ACTIVE_DAYS must contain at least one day."
    );
  }

  for (const day of days) {
    if (day < 1 || day > 7) {
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

export const config = {
  whatsapp: {
    groupName: required(
      "WHATSAPP_GROUP_NAME"
    ),

    authDir:
      process.env.WHATSAPP_AUTH_DIR?.trim() ||
      "./auth",
  },

  menu: {
    items: menuItems(),
  },

  poll: {
    title:
      process.env.POLL_TITLE?.trim() ||
      "🍱 Today's Lunch",

    selectableCount,
  },

  schedule: {
    timezone:
      process.env.TIMEZONE?.trim() ||
      "Asia/Kolkata",

    pollTime: validateTime("POLL_TIME"),

    closeTime: validateTime("CLOSE_TIME"),

    activeDays: activeDays(),
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
  },

  logging: {
    level:
      process.env.LOG_LEVEL?.trim() ||
      "info",
  },
} as const;
