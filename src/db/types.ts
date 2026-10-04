export interface PollRecord {
  id: number;
  pollId: string;
  groupId: string;
  title: string;
  pollDate: string;
  status: "open" | "closed";
  createdAt: string;
  closedAt: string | null;
}

export interface StoredUpdate {
  id: number;
  pollId: string;
  messageId: string | null;
  senderJid: string | null;
  updateData: Buffer;
  createdAt: string;
}

export interface StoredMessage {
  messageKey: string;
  messageId: string;
  remoteJid: string | null;
  participant: string | null;
  messageData: Buffer;
  createdAt: string;
}
