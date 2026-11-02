/**
 * Token access token hidup di memori aplikasi, bukan localStorage (D8).
 * Modul ini adalah sumber tunggal yang dibaca API client dan auth store
 * tanpa harus membuat siklus import.
 */

let accessToken: string | null = null;
let sessionLostHandler: (() => void) | null = null;

// Membaca token akses yang hanya disimpan selama aplikasi berjalan.
export function getAccessToken(): string | null {
  return accessToken;
}

// Mengganti token dalam memori tanpa menyimpannya ke penyimpanan persisten.
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// Mendaftarkan reaksi aplikasi saat sesi tidak lagi dapat digunakan.
export function onSessionLost(handler: () => void): void {
  sessionLostHandler = handler;
}

// Mengosongkan token dan memberi tahu pemilik sesi agar tampilan ikut diperbarui.
export function notifySessionLost(): void {
  accessToken = null;
  if (sessionLostHandler) sessionLostHandler();
}
