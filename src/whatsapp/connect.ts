import makeWASocket, {
  Browsers,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";

import { config } from "../config.js";

import { registerSocketEvents } from "./events.js";
import {
  clearReconnect,
  getCurrentSocket,
  isConnecting,
  logger,
  setConnecting,
  setCurrentSocket,
} from "./socket.js";

/**
 * Connect to WhatsApp.
 *
 * Authentication is persisted in WHATSAPP_AUTH_DIR.
 */
export async function connectWhatsApp(): Promise<void> {
  clearReconnect();

  if (isConnecting()) {
    console.log(
      "⏳ WhatsApp connection is already being established."
    );

    return;
  }

  const current = getCurrentSocket();

  if (current?.ws?.isOpen) {
    return;
  }

  if (current) {
    current.end(undefined);
    setCurrentSocket(null);
  }

  setConnecting(true);

  try {
    const {
      state,
      saveCreds,
    } = await useMultiFileAuthState(
      config.whatsapp.authDir
    );

    const newSocket = makeWASocket({
      auth: state,

      browser: Browsers.ubuntu(
        "Lunch WhatsApp Bot"
      ),

      logger,

      markOnlineOnConnect: false,

      syncFullHistory: false,

      generateHighQualityLinkPreview: false,

      shouldIgnoreJid: (jid) => {
        return jid === "status@broadcast";
      },
    });

    setCurrentSocket(newSocket);

    registerSocketEvents(
      newSocket,
      saveCreds,
      () => {
        connectWhatsApp().catch(
          (error) => {
            console.error(
              "❌ WhatsApp reconnect failed:",
              error
            );
          }
        );
      }
    );

    /*
     * Resolve the connection promise once
     * the socket reaches the open state.
     */
    await waitForConnection(newSocket);
  } finally {
    setConnecting(false);
  }
}

/**
 * Wait until the current socket becomes connected.
 *
 * This prevents scheduler startup from trying
 * to access WhatsApp before the socket is ready.
 */
async function waitForConnection(
  expected: NonNullable<ReturnType<typeof getCurrentSocket>>
): Promise<void> {
  if (expected.ws?.isOpen) {
    return;
  }

  await new Promise<void>(
    (resolve, reject) => {
      const timeout =
        setTimeout(() => {
          reject(
            new Error(
              "Timed out waiting for WhatsApp connection."
            )
          );
        }, 60_000);

      const checkConnection =
        (): void => {
          if (getCurrentSocket() !== expected) {
            clearTimeout(timeout);

            reject(
              new Error(
                "WhatsApp socket was closed."
              )
            );

            return;
          }

          if (expected.ws?.isOpen) {
            clearTimeout(timeout);
            resolve();

            return;
          }

          setTimeout(
            checkConnection,
            500
          );
        };

      checkConnection();
    }
  );
}
