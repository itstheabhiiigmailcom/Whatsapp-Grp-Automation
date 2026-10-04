import makeWASocket, {
    Browsers,
    DisconnectReason,
    useMultiFileAuthState,
    type WASocket,
} from "@whiskeysockets/baileys";

import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";

import {
    storeMessage,
    storePollUpdate,
    getStoredMessage,
} from "./poll.js";

let socket: WASocket | null = null;

let connectionPromise: Promise<WASocket> | null = null;

export async function connectWhatsApp(): Promise<WASocket> {
    if (socket) {
        return socket;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = createConnection();

    try {
        socket = await connectionPromise;
        return socket;
    } finally {
        connectionPromise = null;
    }
}

async function createConnection(): Promise<WASocket> {
    const { state, saveCreds } =
        await useMultiFileAuthState("./auth");

    console.log("🔌 Starting WhatsApp connection...");

    const sock = makeWASocket({
        auth: state,

        browser: Browsers.ubuntu("Lunch Bot"),

        markOnlineOnConnect: false,

        syncFullHistory: false,

        getMessage: async (key) => {
            return getStoredMessage(key);
        },
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on(
        "messages.upsert",
        ({ messages }) => {
            for (const message of messages) {
                storeMessage(message);
            }
        }
    );

    sock.ev.on(
        "messages.update",
        (updates) => {
            for (const { key, update } of updates) {
                if (!update.pollUpdates) {
                    continue;
                }

                console.log(
                    `🗳️ Poll update received: ${key.id}`
                );

                storePollUpdate(
                    key,
                    update.pollUpdates
                );
            }
        }
    );

    /*
     * Wait until WhatsApp is actually connected.
     *
     * IMPORTANT:
     * connectWhatsApp() must not resolve before
     * connection === "open".
     */
    const connectionReady = new Promise<WASocket>(
        (resolve, reject) => {
            sock.ev.on(
                "connection.update",
                (update) => {
                    const {
                        connection,
                        lastDisconnect,
                        qr,
                    } = update;

                    /*
                     * QR authentication.
                     */
                    if (qr) {
                        console.log("");
                        console.log(
                            "=========================================="
                        );
                        console.log(
                            "📱 SCAN THIS QR CODE WITH WHATSAPP"
                        );
                        console.log(
                            "WhatsApp → Settings → Linked Devices"
                        );
                        console.log(
                            "=========================================="
                        );
                        console.log("");

                        qrcode.generate(qr, {
                            small: true,
                        });

                        console.log("");
                    }

                    /*
                     * WhatsApp is now fully connected.
                     */
                    if (connection === "open") {
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

                        resolve(sock);
                    }

                    /*
                     * Connection closed.
                     */
                    if (connection === "close") {
                        const statusCode =
                            (lastDisconnect?.error as Boom)
                                ?.output?.statusCode;

                        const shouldReconnect =
                            statusCode !==
                            DisconnectReason.loggedOut;

                        console.log("");
                        console.log(
                            "❌ WhatsApp connection closed."
                        );
                        console.log(
                            `Status code: ${statusCode ?? "unknown"
                            }`
                        );

                        /*
                         * If connection never became ready,
                         * reject connectWhatsApp().
                         */
                        reject(
                            lastDisconnect?.error ??
                            new Error(
                                "WhatsApp connection closed"
                            )
                        );

                        /*
                         * Reconnect only if this wasn't
                         * an explicit logout.
                         */
                        if (shouldReconnect) {
                            console.log(
                                "🔄 Reconnecting in 5 seconds..."
                            );

                            setTimeout(() => {
                                void connectWhatsApp().catch(
                                    (error) => {
                                        console.error(
                                            "Reconnect failed:",
                                            error
                                        );
                                    }
                                );
                            }, 5000);
                        } else {
                            console.log(
                                "⚠️ WhatsApp session was logged out."
                            );

                            console.log(
                                "Delete auth/ and pair again."
                            );
                        }
                    }
                }
            );
        }
    );

    return connectionReady;
}

export function getSocket(): WASocket {
    if (!socket) {
        throw new Error(
            "WhatsApp socket is not connected."
        );
    }

    return socket;
}

export async function listWhatsAppGroups(): Promise<void> {
    const sock = getSocket();

    const groups = await sock.groupFetchAllParticipating();

    console.log("\n========== WHATSAPP GROUPS ==========\n");

    for (const [jid, group] of Object.entries(groups)) {
        console.log(`Name : ${group.subject}`);
        console.log(`ID   : ${jid}`);
        console.log("-------------------------------------");
    }

    console.log("\n=====================================\n");
}

export async function findGroupByName(
    groupName: string
  ): Promise<string> {
    const sock = getSocket();
  
    const groups = await sock.groupFetchAllParticipating();
  
    const target = Object.entries(groups).find(
      ([, group]) =>
        group.subject.trim().toLowerCase() ===
        groupName.trim().toLowerCase()
    );
  
    if (!target) {
      console.log("\n❌ Group not found:", groupName);
  
      console.log("\nAvailable groups:");
  
      for (const [, group] of Object.entries(groups)) {
        console.log(`- ${group.subject}`);
      }
  
      throw new Error(
        `WhatsApp group "${groupName}" was not found.`
      );
    }
  
    const [jid, group] = target;
  
    console.log("\n✅ Target group found");
    console.log(`Name: ${group.subject}`);
    console.log(`ID:   ${jid}\n`);
  
    return jid;
  }
  