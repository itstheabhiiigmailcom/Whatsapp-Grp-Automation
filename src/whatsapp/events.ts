import {
  DisconnectReason,
  type WASocket,
} from "@whiskeysockets/baileys";

import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";

import { capturePollVote } from "../poll/capture.js";
import { handlePollUpdate } from "../poll/updates.js";
import { storeContactName } from "../contacts.js";

import {
  hasQrBeenDisplayed,
  isConnecting,
  scheduleReconnect,
  setConnecting,
  setCurrentSocket,
  setQrDisplayed,
} from "./socket.js";

export function registerSocketEvents(
  newSocket: WASocket,
  saveCreds: () => Promise<void>,
  reconnect: () => void
): void {
  newSocket.ev.on(
    "creds.update",
    saveCreds
  );

  newSocket.ev.on(
    "connection.update",
    async (update) => {
      const {
        connection,
        lastDisconnect,
        qr,
      } = update;

      if (qr) {
        if (!hasQrBeenDisplayed()) {
          console.log("");
          console.log(
            "=========================================="
          );
          console.log(
            "📱 SCAN THIS QR CODE WITH WHATSAPP"
          );
          console.log(
            "=========================================="
          );

          qrcode.generate(qr, {
            small: true,
          });

          console.log("");
          console.log(
            "WhatsApp → Settings → Linked Devices → Link a Device"
          );

          console.log("");

          setQrDisplayed(true);
        }
      }

      if (connection === "connecting") {
        console.log(
          "🔌 Connecting to WhatsApp..."
        );
      }

      if (connection === "open") {
        setQrDisplayed(false);

        console.log("");
        console.log(
          "=========================================="
        );
        console.log(
          "✅ WHATSAPP CONNECTED"
        );
        console.log(
          "=========================================="
        );
        console.log("");
      }

      if (connection === "close") {
        const statusCode =
          lastDisconnect?.error instanceof Boom
            ? lastDisconnect.error.output.statusCode
            : undefined;

        const shouldReconnect =
          statusCode !==
          DisconnectReason.loggedOut;

        console.log("");
        console.log(
          "=========================================="
        );
        console.log(
          "⚠️ WHATSAPP CONNECTION CLOSED"
        );
        console.log(
          "=========================================="
        );

        console.log(
          `Reason: ${
            statusCode ?? "unknown"
          }`
        );

        /*
         * Logged out means the authentication
         * session is no longer valid.
         *
         * Do NOT continuously reconnect in this case.
         */
        if (!shouldReconnect) {
          console.error(
            "❌ WhatsApp session was logged out."
          );

          console.error(
            "Delete the auth directory and scan the QR again."
          );

          setCurrentSocket(null);
          setConnecting(false);

          return;
        }

        /*
         * Temporary connection problem.
         * Do not open a second socket while the
         * first connection attempt is still waiting.
         */
        setCurrentSocket(null);
        setQrDisplayed(false);

        if (
          statusCode ===
          DisconnectReason.connectionReplaced
        ) {
          console.log(
            "⚠️ Another WhatsApp login replaced this session."
          );
        }

        if (isConnecting()) {
          console.log(
            "⏳ Waiting for the current login attempt to finish."
          );

          return;
        }

        console.log(
          "🔄 Reconnecting to WhatsApp in 8 seconds..."
        );

        scheduleReconnect(reconnect);
      }
    }
  );

  /*
   * Store contact names from incoming messages.
   */
  newSocket.ev.on(
    "messages.upsert",
    async ({ messages }) => {
      for (const message of messages) {
        try {
          capturePollVote(
            newSocket,
            message
          );
        } catch (error) {
          console.error(
            "❌ Failed to process poll vote:",
            error
          );
        }

        const participant =
          message.key.participant;

        if (!participant) {
          continue;
        }

        const pushName =
          message.pushName;

        if (pushName) {
          storeContactName(
            participant,
            pushName
          );
        }
      }
    }
  );

  /*
   * Listen for poll updates.
   *
   * IMPORTANT:
   *
   * We do not directly manipulate the DB here.
   * poll updates own poll/order persistence.
   */
  newSocket.ev.on(
    "messages.update",
    async (updates) => {
      for (const update of updates) {
        try {
          const message =
            update.update;

          if (!message.pollUpdates) {
            continue;
          }

          await handlePollUpdate(
            newSocket,
            update.key,
            message.pollUpdates
          );
        } catch (error) {
          console.error(
            "❌ Failed to process poll update:",
            error
          );
        }
      }
    }
  );
}
