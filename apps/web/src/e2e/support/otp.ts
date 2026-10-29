import { existsSync, readFileSync } from "node:fs";

/**
 * Pembacaan kode OTP dari log API untuk pengujian end-to-end.
 * Hanya berlaku pada APP_ENV=development, di mana DevMailer mencetak OTP
 * ke log API (lihat docs/LOCAL_SETUP.md).
 */
const logPath = process.env.E2E_API_LOG ?? "";

function readOtpCodes(): string[] {
  if (!logPath || !existsSync(logPath)) return [];
  const raw = readFileSync(logPath, "utf8");
  const codes: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.includes('"otp"')) continue;
    try {
      const parsed = JSON.parse(line) as { otp?: string };
      if (parsed.otp) codes.push(parsed.otp);
    } catch {
      // Baris bukan JSON (mis. log multiline) dilewati.
    }
  }
  return codes;
}

export function otpCount(): number {
  return readOtpCodes().length;
}

export async function waitForOtp(since: number, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const codes = readOtpCodes();
    if (codes.length > since) return codes[since];
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `Kode OTP tidak ditemukan di ${logPath || "(E2E_API_LOG belum diisi)"} — jalankan API dengan APP_ENV=development dan arahkan output ke file log.`,
  );
}
