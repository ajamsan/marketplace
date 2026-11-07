import { expect, test } from "@playwright/test";

import { waitForApi } from "./support/api";
import { otpCount, waitForOtp } from "./support/otp";
import { uniqueUser } from "./support/api";

test.describe("Autentikasi", () => {
  test.beforeEach(async ({ request }) => {
    await waitForApi(request);
  });

  test("daftar, verifikasi OTP, lalu login", async ({ page }) => {
    const user = uniqueUser("e2e");
    const otpBefore = otpCount();

    await page.goto("/register");
    await page.getByLabel(/username/i).fill(user.username);
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole("button", { name: /daftar/i }).click();

    await expect(page).toHaveURL(/\/verify/);
    await page.getByLabel(/kode otp|kode/i).fill(await waitForOtp(otpBefore));
    await page.getByRole("button", { name: /verifikasi|cek kode/i }).click();

    await expect(page.getByText(/terverifikasi/i)).toBeVisible();

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    const loginOtpBefore = otpCount();
    await page.getByRole("button", { name: /lanjut|masuk|login/i }).click();

    await expect(page).toHaveURL(/\/verify/);
    await page.getByLabel(/kode otp|kode/i).fill(await waitForOtp(loginOtpBefore));
    await page.getByRole("button", { name: /verifikasi|cek kode/i }).click();

    await expect(page).toHaveURL(/\/catalog/);
  });

  test("halaman yang dilindungi mengarahkan ke login", async ({ page }) => {
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/login/);
  });
});
