import {
  getAggregateVotesInPollMessage,
  getKeyAuthor,
  proto,
  type WAMessage,
} from "@whiskeysockets/baileys";

import { getPollUpdates } from "../db/index.js";

import { decodePollUpdate } from "./codec.js";

export function loadPollUpdates(
  pollId: string
): proto.IPollUpdate[] {
  const storedUpdates = getPollUpdates(pollId);
  const latestByVoter = new Map<
    string,
    proto.IPollUpdate
  >();

  for (const storedUpdate of storedUpdates) {
    try {
      const update = decodePollUpdate(
        storedUpdate.updateData
      );

      const voter =
        getKeyAuthor(update.pollUpdateMessageKey) ||
        storedUpdate.senderJid ||
        String(storedUpdate.id);

      latestByVoter.set(voter, update);
    } catch (error) {
      console.error(
        "❌ Failed to decode poll update:",
        error
      );
    }
  }

  return [...latestByVoter.values()];
}

export function jidUser(
  jid: string | null | undefined
): string {
  if (!jid) {
    return "";
  }

  return jid.split("@")[0]?.split(":")[0] ?? "";
}

export function collectVoterIds(
  pollMessage: WAMessage,
  pollId: string
): Set<string> {
  const voterIds = new Set<string>();
  const pollUpdates = loadPollUpdates(pollId);

  for (const update of pollUpdates) {
    const sender = jidUser(
      getKeyAuthor(update.pollUpdateMessageKey)
    );

    if (sender) {
      voterIds.add(sender);
    }
  }

  if (!pollMessage.message) {
    return voterIds;
  }

  const aggregatedVotes =
    getAggregateVotesInPollMessage({
      message: pollMessage.message,
      pollUpdates,
    });

  for (const result of aggregatedVotes) {
    for (const voter of result.voters ?? []) {
      const user = jidUser(voter);

      if (user) {
        voterIds.add(user);
      }
    }
  }

  return voterIds;
}
