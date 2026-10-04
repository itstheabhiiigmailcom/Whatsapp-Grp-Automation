import {
  proto,
  type WAMessage,
} from "@whiskeysockets/baileys";

export interface ActivePoll {
  message: WAMessage;
  date: string;
  finalized: boolean;
}

export interface OrderItem {
  name: string;
  quantity: number;
  users: string[];
}

/*
 * messages.update delivers proto.IPollUpdate
 * (voter key + decrypted vote). That is also
 * what getAggregateVotesInPollMessage expects.
 */

export type PollUpdateInput = proto.IPollUpdate;

export type PollUpdateInputArray =
  | PollUpdateInput[]
  | readonly (
      | PollUpdateInput
      | null
      | undefined
    )[];
