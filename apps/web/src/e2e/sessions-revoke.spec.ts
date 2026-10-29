import { expect, test } from "@playwright/test";

import { waitForApi } from "./support/api";
import { otpCount, waitForOtp } from "./support/otp";

const BUYER = { email: "buyer@kantin.local", password: "kantin-dev-buyer-123" };

async function login(page: import("@playwright/test").Page, account: { email: string; password: string }) {
  const before = otpCount();
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(account.email);
  await page.getByLabel(/password/i).fill(account.password);
  await page.getByRole("button", { name: /lanjut|masuk|login/i }).click();
  await expect(page).toHaveURL(/\/verify/);
  await page.getByLabel(/kode otp|kode/i).fill(await waitForOtp(before));
  await page.getByRole("button", { name: /verifikasi|cek kode/i }).click();
  await expect(page).not.toHaveURL(/\/verify/);
}

test.describe("Pengelolaan sesi", () => {
  test.beforeEach(async ({ request }) => {
    await waitForApi(request);
  });

  test("mencabut sesi lain tanpa memutus sesi sendiri", async ({ page, browser }) => {
    await login(page, BUYER);

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await login(otherPage, BUYER);

    await page.goto("/settings");
    const sesiTab = page.getByRole("tab", { name: /sesi/i }).or(
      page.getByRole("button", { name: /sesi/i }),
    );
    await sesiTab.first().click();

    await expect(page.getByText(/sesi ini/i).first()).toBeVisible();
    const revokeButtons = page.getByRole("button", { name: /cabut|akhiri/i });
    const count = await revokeButtons.count();
    expect(count).toBeGreaterThan(0);
    while ((await revokeButtons.count()) > 0) {
      await revokeButtons.first().click();
      const confirm = page.getByRole("button", { name: /ya|cabut|konfirmasi/i }).last();
      if (await confirm.isVisible().catch(() => false)) {
        await confirm.click();
      }
      await page.waitForTimeout(300);
    }

    await expect(revokeButtons).toHaveCount(0);

    // Sesi yang dicabut tidak lagi bisa memakai refresh token.
    const refresh = await otherContext.request.post("/api/v1/auth/refresh", {
      headers: { "X-CSRF-Token": await readCsrf(otherContext) },
    });
    expect(refresh.status()).toBe(401);

    await otherContext.close();
  });
});

async function readCsrf(context: import("@playwright/test").BrowserContext): Promise<string> {
  const cookies = await context.cookies();
  const csrf = cookies.find((cookie) => cookie.name === "kk_csrf");
  return csrf?.value ?? "";
}
