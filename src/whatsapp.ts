import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
    type WASocket,
    type WAMessage,
    type ConnectionState,
  } from "@whiskeysockets/baileys";
  
  import { Boom } from "@hapi/boom";
  import qrcode from "qrcode-terminal";
  
  import { config } from "./config.js";
  
  import {
    getStoredMessage,
    storeMessage,
    storePollUpdate,
  } from "./poll.js";
  
  import {
    storeContactName,
  } from "./contacts.js";
  
  /**
   * Current WhatsApp socket.
   */
  let socket:
    | WASocket
    | null = null;
  
  /**
   * Connection promise.
   */
  let connectionPromise:
    | Promise<WASocket>
    | null = null;
  
  /**
   * Resolve current connection.
   */
  let connectionResolve:
    | ((socket: WASocket) => void)
    | null = null;
  
  /**
   * Reject current connection.
   */
  let connectionReject:
    | ((error: Error) => void)
    | null = null;
  
  /**
   * Prevent multiple reconnect attempts.
   */
  let reconnecting = false;
  
  /**
   * Application shutdown state.
   */
  let shuttingDown = false;
  
  /**
   * Connect to WhatsApp.
   */
  export async function connectWhatsApp():
    Promise<WASocket> {
    /*
     * Already connected.
     */
    if (socket) {
      return socket;
    }
  
    /*
     * Connection already in progress.
     */
    if (connectionPromise) {
      return connectionPromise;
    }
  
    connectionPromise =
      new Promise<WASocket>(
        (resolve, reject) => {
          connectionResolve =
            resolve;
  
          connectionReject =
            reject;
        }
      );
  
    try {
      await createWhatsAppConnection();
    } catch (error) {
      connectionPromise = null;
      connectionResolve = null;
      connectionReject = null;
  
      throw error;
    }
  
    return connectionPromise;
  }
  
  /**
   * Create Baileys connection.
   */
  async function createWhatsAppConnection():
    Promise<void> {
    console.log(
      "🔌 Starting WhatsApp connection..."
    );
  
    const {
      state,
      saveCreds,
    } =
      await useMultiFileAuthState(
        config.whatsapp.authDir
      );
  
    const {
      version,
    } =
      await fetchLatestBaileysVersion();
  
    console.log(
      `📱 WhatsApp Web version: ${version.join(".")}`
    );
  
    const sock =
      makeWASocket({
        version,
  
        auth: {
          creds:
            state.creds,
  
          keys:
            makeCacheableSignalKeyStore(
              state.keys,
              undefined
            ),
        },
  
        browser:
          Browsers.ubuntu(
            "Chrome"
          ),
  
        printQRInTerminal:
          false,
  
        syncFullHistory:
          false,
  
        markOnlineOnConnect:
          true,
  
        generateHighQualityLinkPreview:
          false,
  
        getMessage:
          async (key) => {
            return (
              getStoredMessage(key) ??
              undefined
            );
          },
      });
  
    socket = sock;
  
    /*
     * Save authentication credentials.
     */
    sock.ev.on(
      "creds.update",
      saveCreds
    );
  
    /*
     * Connection state.
     */
    sock.ev.on(
      "connection.update",
      async (update) => {
        await handleConnectionUpdate(
          sock,
          update
        );
      }
    );
  
    /*
     * Incoming messages.
     */
    sock.ev.on(
      "messages.upsert",
      ({
        messages,
      }) => {
        handleIncomingMessages(
          messages
        );
      }
    );
  
    /*
     * Contact updates.
     */
    sock.ev.on(
      "contacts.upsert",
      (contacts) => {
        for (
          const contact of contacts
        ) {
          const jid =
            contact.id;
  
          if (!jid) {
            continue;
          }
  
          const name =
            contact.name ??
            contact.notify ??
            contact.verifiedName;
  
          if (name) {
            storeContactName(
              jid,
              name
            );
          }
        }
      }
    );
  }
  
  /**
   * Handle connection changes.
   */
  async function handleConnectionUpdate(
    sock: WASocket,
    update: Partial<ConnectionState>
  ): Promise<void> {
    const {
      connection,
      lastDisconnect,
      qr,
    } = update;
  
    /*
     * QR received.
     */
    if (qr) {
      console.log("");
      console.log(
        "=========================================="
      );
      console.log(
        "📱 SCAN THIS QR CODE"
      );
      console.log(
        "=========================================="
      );
      console.log("");
  
      qrcode.generate(
        qr,
        {
          small: true,
        }
      );
  
      console.log("");
  
      console.log(
        "WhatsApp → Settings → Linked Devices → Link a Device"
      );
  
      console.log("");
    }
  
    /*
     * Connected.
     */
    if (
      connection === "open"
    ) {
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
  
      reconnecting = false;
  
      if (connectionResolve) {
        connectionResolve(sock);
  
        connectionResolve = null;
        connectionReject = null;
      }
  
      return;
    }
  
    /*
     * Disconnected.
     */
    if (
      connection === "close"
    ) {
      const statusCode =
        getDisconnectStatusCode(
          lastDisconnect
        );
  
      console.log("");
      console.log(
        "⚠️ WhatsApp connection closed."
      );
  
      console.log(
        `Status code: ${
          statusCode ?? "unknown"
        }`
      );
  
      /*
       * User logged out.
       */
      if (
        statusCode ===
        DisconnectReason.loggedOut
      ) {
        console.error(
          "❌ WhatsApp session was logged out."
        );
  
        console.error(
          `Delete "${config.whatsapp.authDir}" and scan the QR again.`
        );
  
        const error =
          new Error(
            "WhatsApp session logged out."
          );
  
        if (connectionReject) {
          connectionReject(error);
  
          connectionReject =
            null;
  
          connectionResolve =
            null;
        }
  
        socket = null;
        connectionPromise = null;
  
        return;
      }
  
      /*
       * Temporary disconnect.
       */
      socket = null;
  
      await reconnectWhatsApp();
    }
  }
  
  /**
   * Process incoming WhatsApp messages.
   */
  function handleIncomingMessages(
    messages: WAMessage[]
  ): void {
    for (
      const message of messages
    ) {
      /*
       * Store original message.
       */
      storeMessage(message);
  
      /*
       * Save sender name.
       */
      const participant =
        message.key.participant;
  
      const pushName =
        message.pushName;
  
      if (
        participant &&
        pushName
      ) {
        storeContactName(
          participant,
          pushName
        );
      }
  
      /*
       * Poll vote update.
       */
      const pollUpdate =
        message.message
          ?.pollUpdateMessage;
  
      if (
        pollUpdate &&
        message.key.id
      ) {
        storePollUpdate(
          message.key,
          pollUpdate
        );
  
        continue;
      }
  
      /*
       * Poll creation message.
       */
      if (
        message.message
          ?.pollCreationMessage
      ) {
        console.log(
          `🗳️ Poll creation received: ${message.key.id ?? "unknown"}`
        );
      }
    }
  }
  
  /**
   * Find a group by name.
   *
   * IMPORTANT:
   * This should only be called after
   * connectWhatsApp() has resolved.
   */
  export async function findGroupByName(
    groupName: string
  ): Promise<string> {
    const sock =
      await waitForWhatsAppConnection();
  
    console.log("");
    console.log(
      `🔎 Searching for group: ${groupName}`
    );
  
    const groups =
      await sock.groupFetchAllParticipating();
  
    const matchingGroup =
      Object.values(groups).find(
        (group) =>
          group.subject.trim() ===
          groupName.trim()
      );
  
    if (!matchingGroup) {
      throw new Error(
        `WhatsApp group "${groupName}" was not found.`
      );
    }
  
    console.log("");
    console.log(
      "=========================================="
    );
  
    console.log(
      "✅ TARGET GROUP FOUND"
    );
  
    console.log(
      `Name: ${matchingGroup.subject}`
    );
  
    console.log(
      `ID: ${matchingGroup.id}`
    );
  
    console.log(
      "=========================================="
    );
  
    console.log("");
  
    return matchingGroup.id;
  }
  
  /**
   * Return the current socket.
   */
  export function getSocket():
    WASocket {
    if (!socket) {
      throw new Error(
        "WhatsApp socket is not connected."
      );
    }
  
    return socket;
  }
  
  /**
   * Wait until WhatsApp is connected.
   */
  export async function waitForWhatsAppConnection():
    Promise<WASocket> {
    if (socket) {
      return socket;
    }
  
    return connectWhatsApp();
  }
  
  /**
   * Reconnect after unexpected disconnect.
   */
  async function reconnectWhatsApp():
    Promise<void> {
    if (shuttingDown) {
      return;
    }
  
    if (reconnecting) {
      return;
    }
  
    reconnecting = true;
  
    /*
     * Clear current connection state.
     */
    connectionPromise = null;
    connectionResolve = null;
    connectionReject = null;
  
    console.log(
      "🔄 Reconnecting to WhatsApp in 5 seconds..."
    );
  
    await sleep(5000);
  
    reconnecting = false;
  
    if (shuttingDown) {
      return;
    }
  
    try {
      await connectWhatsApp();
  
      console.log(
        "✅ WhatsApp reconnected."
      );
    } catch (error) {
      console.error(
        "❌ WhatsApp reconnect failed:",
        error
      );
  
      await sleep(5000);
  
      if (!shuttingDown) {
        await reconnectWhatsApp();
      }
    }
  }
  
  /**
   * Extract disconnect status code.
   */
  function getDisconnectStatusCode(
    lastDisconnect:
      | ConnectionState["lastDisconnect"]
      | undefined
  ): number | undefined {
    if (!lastDisconnect?.error) {
      return undefined;
    }
  
    const error =
      lastDisconnect.error;
  
    if (error instanceof Boom) {
      return (
        error.output.statusCode
      );
    }
  
    const maybeBoom =
      error as {
        output?: {
          statusCode?: number;
        };
      };
  
    return (
      maybeBoom.output
        ?.statusCode
    );
  }
  
  /**
   * Sleep helper.
   */
  function sleep(
    milliseconds: number
  ): Promise<void> {
    return new Promise(
      (resolve) => {
        setTimeout(
          resolve,
          milliseconds
        );
      }
    );
  }
  
  /**
   * Gracefully close WhatsApp.
   */
  export async function closeWhatsApp():
    Promise<void> {
    shuttingDown = true;
  
    console.log(
      "🛑 Closing WhatsApp connection..."
    );
  
    try {
      socket?.ws?.close();
    } catch {
      /*
       * Ignore shutdown errors.
       */
    }
  
    socket = null;
    connectionPromise = null;
    connectionResolve = null;
    connectionReject = null;
  }
  