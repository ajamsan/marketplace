import { expect, test } from "@playwright/test";

import { waitForApi } from "./support/api";
import { otpCount, waitForOtp } from "./support/otp";

const BUYER = { email: "buyer@kantin.local", password: "kantin-dev-buyer-123" };

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAsSURBVFhH7c4hAQAADASh61/6F2MGgafVPgkICAgICAgICAgICAgICDwH2gFUDfhqkE3cCgAAAABJRU5ErkJggg==",
  "base64",
);

// Menyiapkan sesi pembeli sebelum pengujian pengelolaan foto profil.
async function login(page: import("@playwright/test").Page) {
  const before = otpCount();
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(BUYER.email);
  await page.getByLabel(/password/i).fill(BUYER.password);
  await page.getByRole("button", { name: /lanjut|masuk|login/i }).click();
  await expect(page).toHaveURL(/\/verify/);
  await page.getByLabel(/kode otp|kode/i).fill(await waitForOtp(before));
  await page.getByRole("button", { name: /verifikasi|cek kode/i }).click();
  await expect(page).not.toHaveURL(/\/verify/);
}

test.describe("Foto profil", () => {
  test.beforeEach(async ({ request }) => {
    await waitForApi(request);
  });

  test("file bukan gambar ditolak dan file valid ditangani dengan pesan jelas", async ({ page }) => {
    await login(page);
    await page.goto("/settings");

    const fotoTab = page
      .getByRole("tab", { name: /foto/i })
      .or(page.getByRole("button", { name: /foto/i }));
    await fotoTab.first().click();

    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible();

    await fileInput.setInputFiles({
      name: "bukan-gambar.png",
      mimeType: "image/png",
      buffer: Buffer.from("ini bukan gambar png"),
    });
    await page.getByRole("button", { name: /unggah foto/i }).click();

    await expect(page.getByRole("alert").first()).toBeVisible();

    await fileInput.setInputFiles({
      name: "gambar.png",
      mimeType: "image/png",
      buffer: PNG_1X1,
    });
    await page.getByRole("button", { name: /unggah foto/i }).click();

    // Tanpa Supabase Storage API membalas 503; UI harus menampilkan pesan yang jelas.
    await expect(
      page.getByText(/konfigurasi|berhasil|gagal|ditolak/i).first(),
    ).toBeVisible();
  });
});
