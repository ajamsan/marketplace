/**
 * Token access token hidup di memori aplikasi, bukan localStorage (D8).
 * Modul ini adalah sumber tunggal yang dibaca API client dan auth store
 * tanpa harus membuat siklus import.
 */

let accessToken: string | null = null;
let sessionLostHandler: (() => void) | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function onSessionLost(handler: () => void): void {
  sessionLostHandler = handler;
}

export function notifySessionLost(): void {
  accessToken = null;
  if (sessionLostHandler) sessionLostHandler();
}
