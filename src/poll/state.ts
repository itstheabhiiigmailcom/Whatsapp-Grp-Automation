import type { ActivePoll } from "./types.js";

let activePoll: ActivePoll | null = null;

export function getActivePoll(): ActivePoll | null {
  return activePoll;
}

export function setActivePoll(
  poll: ActivePoll | null
): void {
  activePoll = poll;
}
