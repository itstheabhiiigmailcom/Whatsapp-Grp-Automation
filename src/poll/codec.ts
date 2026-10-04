import {
  proto,
  type WAMessage,
  type WAMessageKey,
} from "@whiskeysockets/baileys";

/*
 * WhatsApp messages contain protobuf data.
 *
 * Do NOT use JSON.stringify() here.
 *
 * Baileys provides protobuf encode/decode
 * through proto.WebMessageInfo.
 */

export function encodeMessage(
  message: WAMessage
): Buffer {
  return Buffer.from(
    proto.WebMessageInfo.encode(
      message
    ).finish()
  );
}

export function decodeMessage(
  data: Buffer
): WAMessage {
  return proto.WebMessageInfo.decode(
    data
  ) as WAMessage;
}

export function encodePollUpdate(
  update: proto.IPollUpdate
): Buffer {
  return Buffer.from(
    proto.PollUpdate.encode(update).finish()
  );
}

export function decodePollUpdate(
  data: Buffer
): proto.IPollUpdate {
  return proto.PollUpdate.decode(
    data
  ) as proto.IPollUpdate;
}

export function getMessageKey(
  key: WAMessageKey
): string {
  return [
    key.remoteJid ?? "",
    key.id ?? "",
    key.participant ?? "",
  ].join(":");
}
