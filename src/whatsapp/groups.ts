import { getSocket } from "./socket.js";

/**
 * Find a WhatsApp group by configured name.
 */
export async function findGroupByName(
  groupName: string
): Promise<string> {
  const socket = getSocket();

  console.log("");
  console.log(
    `🔎 Searching for WhatsApp group: ${groupName}`
  );

  const groups =
    await socket.groupFetchAllParticipating();

  const entries =
    Object.entries(groups);

  const exactMatch =
    entries.find(
      ([, group]) =>
        group.subject === groupName
    );

  if (exactMatch) {
    const [
      groupId,
      group,
    ] = exactMatch;

    console.log("");
    console.log(
      "=========================================="
    );
    console.log(
      "✅ Target group found"
    );
    console.log(
      `Name: ${group.subject}`
    );
    console.log(
      `ID:   ${groupId}`
    );
    console.log(
      "=========================================="
    );
    console.log("");

    return groupId;
  }

  /*
   * Case-insensitive fallback.
   */
  const caseInsensitiveMatch =
    entries.find(
      ([, group]) =>
        group.subject?.trim().toLowerCase() ===
        groupName.trim().toLowerCase()
    );

  if (caseInsensitiveMatch) {
    const [
      groupId,
      group,
    ] = caseInsensitiveMatch;

    console.log("");
    console.log(
      "=========================================="
    );
    console.log(
      "✅ Target group found"
    );
    console.log(
      `Name: ${group.subject}`
    );
    console.log(
      `ID:   ${groupId}`
    );
    console.log(
      "=========================================="
    );
    console.log("");

    return groupId;
  }

  console.error("");
  console.error(
    "❌ WhatsApp group not found."
  );

  console.error(
    `Configured group: ${groupName}`
  );

  console.error("");
  console.error(
    "Available groups:"
  );

  for (const [, group] of entries) {
    console.error(
      `   • ${group.subject}`
    );
  }

  throw new Error(
    `WhatsApp group "${groupName}" was not found.`
  );
}

/**
 * Get group metadata.
 */
export async function getGroupMetadata(
  groupId: string
) {
  const socket = getSocket();

  return socket.groupMetadata(
    groupId
  );
}

/**
 * Get all participants of a group.
 */
export async function getGroupParticipants(
  groupId: string
) {
  const metadata =
    await getGroupMetadata(groupId);

  return metadata.participants;
}

/**
 * Send a text message to a WhatsApp group.
 */
export async function sendGroupMessage(
  groupId: string,
  text: string
): Promise<void> {
  const socket = getSocket();

  await socket.sendMessage(
    groupId,
    {
      text,
    }
  );
}
