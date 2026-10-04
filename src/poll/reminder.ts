import { type WASocket } from "@whiskeysockets/baileys";

import { config } from "../config.js";
import { getContactName } from "../contacts.js";
import { getGroupParticipants } from "../whatsapp/groups.js";

import { getDateString } from "./date.js";
import { restoreActivePollForGroup } from "./restore.js";
import { getActivePoll } from "./state.js";
import { collectVoterIds, jidUser } from "./voters.js";

/*
 * Sent before close. Does not change poll
 * status or stored votes.
 *
 * Lists group members who have not voted yet.
 */

export async function sendOrderReminder(
  sock: WASocket,
  groupId: string
): Promise<void> {
  if (!getActivePoll()) {
    restoreActivePollForGroup(groupId);
  }

  const activePoll = getActivePoll();

  if (
    !activePoll ||
    activePoll.finalized ||
    activePoll.date !== getDateString()
  ) {
    console.log(
      "⚠️ No open lunch poll to remind about."
    );

    return;
  }

  const alertTime =
    config.schedule.alertTime;

  const endTime =
    config.schedule.closeTime;

  const pollId = activePoll.message.key.id;
  const voterIds = pollId
    ? collectVoterIds(activePoll.message, pollId)
    : new Set<string>();

  const botUser = jidUser(sock.user?.id);
  const participants =
    await getGroupParticipants(groupId);

  const missing = participants.filter(
    (participant) => {
      const ids = [
        jidUser(participant.id),
        jidUser(participant.lid),
        jidUser(participant.jid),
      ].filter(Boolean);

      if (
        ids.length === 0 ||
        ids.includes(botUser)
      ) {
        return false;
      }

      return !ids.some((id) =>
        voterIds.has(id)
      );
    }
  );

  const lines = [
    "⏰ *Lunch order reminder*",
    "",
    `Please vote before ${alertTime}.`,
    `The poll ends at ${endTime}.`,
  ];

  if (missing.length === 0) {
    lines.push("Everyone has voted.");
  } else {
    lines.push(
      "These people have not voted yet:"
    );

    for (const participant of missing) {
      const user = jidUser(participant.id);
      lines.push(
        `• @${user} (${getContactName(participant.id)})`
      );
    }
  }

  await sock.sendMessage(groupId, {
    text: lines.join("\n"),
    mentions: missing.map(
      (participant) => participant.id
    ),
  });

  console.log(
    `🔔 Lunch order reminder sent. Pending votes: ${missing.length}`
  );
}
