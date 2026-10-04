import { type WASocket } from "@whiskeysockets/baileys";
import pino from "pino";

import { config } from "../config.js";

let sock: WASocket | null = null;
let connecting = false;
let qrDisplayed = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export const logger = pino({
  level: config.logging.level,
});

export function getSocket(): WASocket {
  if (!sock) {
    throw new Error(
      "WhatsApp socket is not initialized."
    );
  }

  return sock;
}

export function isWhatsAppConnected(): boolean {
  return sock !== null;
}

export function getCurrentSocket(): WASocket | null {
  return sock;
}

export function setCurrentSocket(
  value: WASocket | null
): void {
  sock = value;
}

export function isConnecting(): boolean {
  return connecting;
}

export function setConnecting(value: boolean): void {
  connecting = value;
}

export function resetConnectionState(): void {
  sock = null;
  connecting = false;
}

export function scheduleReconnect(
  reconnect: () => void
): void {
  if (reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnect();
  }, 8_000);
}

export function clearReconnect(): void {
  if (!reconnectTimer) {
    return;
  }

  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

export function hasQrBeenDisplayed(): boolean {
  return qrDisplayed;
}

export function setQrDisplayed(value: boolean): void {
  qrDisplayed = value;
}
