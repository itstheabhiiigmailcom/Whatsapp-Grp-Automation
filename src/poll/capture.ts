import {
  decryptPollVote,
  extractMessageContent,
  getKeyAuthor,
  jidNormalizedUser,
  type WAMessage,
  type WASocket,
} from "@whiskeysockets/baileys";

import { getMessageById } from "../db/index.js";

import { decodeMessage } from "./codec.js";
import { storePollUpdate } from "./updates.js";

function jidCandidates(
  values: Array<string | null | undefined>
): string[] {
  const unique = new Set<string>();

  for (const value of values) {
    if (!value) {
      continue;
    }

    unique.add(value);

    const normalized = jidNormalizedUser(value);

    if (normalized) {
      unique.add(normalized);
    }
  }

  return [...unique];
}

/*
 * This Baileys version receives poll votes as encrypted
 * pollUpdateMessage events and does not emit decrypted
 * pollUpdates. Decrypt them here and store the result
 * against the original poll message id.
 */

export function capturePollVote(
  sock: WASocket,
  message: WAMessage
): void {
  const content = extractMessageContent(
    message.message
  );

  const encrypted =
    content?.pollUpdateMessage;

  const creationKey =
    encrypted?.pollCreationMessageKey;

  if (
    !encrypted?.vote ||
    !creationKey?.id
  ) {
    return;
  }

  const stored =
    getMessageById(creationKey.id);

  if (!stored) {
    console.warn(
      `⚠️ Vote received for unknown poll ${creationKey.id}.`
    );

    return;
  }

  const pollMessage =
    decodeMessage(stored.messageData);

  const pollContent =
    extractMessageContent(pollMessage.message);

  const pollEncKey =
    pollContent?.messageContextInfo?.messageSecret;

  if (!pollEncKey) {
    console.warn(
      `⚠️ Poll ${creationKey.id} has no encryption secret. Vote was not saved.`
    );

    return;
  }

  const mePhone = jidNormalizedUser(
    sock.user?.jid || sock.user?.id
  );

  const meLid = jidNormalizedUser(
    sock.user?.lid
  );

  const creatorCandidates = jidCandidates([
    getKeyAuthor(pollMessage.key, meLid),
    getKeyAuthor(creationKey, meLid),
    getKeyAuthor(pollMessage.key, mePhone),
    getKeyAuthor(creationKey, mePhone),
    pollMessage.key.participant,
    creationKey.participant,
    meLid,
    mePhone,
    sock.user?.lid,
    sock.user?.id,
  ]);

  const voterCandidates = jidCandidates([
    message.key.participant,
    message.key.fromMe ? meLid : undefined,
    message.key.fromMe ? mePhone : undefined,
    getKeyAuthor(message.key, meLid),
    getKeyAuthor(message.key, mePhone),
    meLid,
    mePhone,
    sock.user?.lid,
    sock.user?.id,
  ]);

  let vote: ReturnType<typeof decryptPollVote> | undefined;
  let voterJid = voterCandidates[0] ?? "";

  for (const pollCreatorJid of creatorCandidates) {
    for (const candidateVoter of voterCandidates) {
      try {
        vote = decryptPollVote(
          encrypted.vote,
          {
            pollEncKey: Buffer.from(pollEncKey),
            pollCreatorJid,
            pollMsgId: creationKey.id,
            voterJid: candidateVoter,
          }
        );

        voterJid = candidateVoter;
        break;
      } catch {
        // Try the next phone-number / hidden-id pair.
      }
    }

    if (vote) {
      break;
    }
  }

  if (!vote) {
    console.error(
      "❌ Failed to decrypt poll vote: none of the account ids matched."
    );

    return;
  }

  try {

    const senderTimestampMs =
      typeof encrypted.senderTimestampMs === "number"
        ? encrypted.senderTimestampMs
        : encrypted.senderTimestampMs?.toNumber();

    storePollUpdate(creationKey, [
      {
        pollUpdateMessageKey: {
          remoteJid: message.key.remoteJid,
          id: message.key.id,
          participant: voterJid,
          fromMe: false,
        },
        vote,
        senderTimestampMs,
      },
    ]);

    console.log(
      `🗳️ Saved vote from ${voterJid} on poll ${creationKey.id} (${vote.selectedOptions?.length ?? 0} option(s)).`
    );
  } catch (error) {
    console.error(
      "❌ Failed to decrypt poll vote:",
      error
    );
  }
}
