import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { otpCount, waitForOtp } from "./support/otp";
import { waitForApi } from "./support/api";

const BUYER = { email: "buyer@kantin.local", password: "kantin-dev-buyer-123" };
const SELLER = { email: "seller@kantin.local", password: "kantin-dev-seller-123" };

async function login(page: Page, account: { email: string; password: string }) {
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

test.describe("Keranjang, checkout, dan pembayaran tunai", () => {
  test.beforeEach(async ({ request }) => {
    await waitForApi(request);
  });

  test("buyer memesan dan seller mengonfirmasi pembayaran tunai", async ({
    page,
    browser,
  }) => {
    await login(page, BUYER);

    await page.goto("/catalog");
    const addButton = page.getByRole("button", { name: /tambah ke keranjang/i }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    await page.goto("/cart");
    await expect(page.getByText(/keranjang/i).first()).toBeVisible();
    const checkoutButton = page.getByRole("button", { name: /checkout|lanjut/i }).first();
    await checkoutButton.click();

    await expect(page).toHaveURL(/\/checkout/);
    await page.getByRole("button", { name: /konfirmasi|buat pesanan|pesan/i }).click();

    await expect(page).toHaveURL(/\/orders\//);
    const publicCode = await page.locator("body").innerText();
    expect(publicCode).toMatch(/[A-Z0-9]{6}/);

    const sellerContext: BrowserContext = await browser.newContext();
    const sellerPage = await sellerContext.newPage();
    await login(sellerPage, SELLER);
    await sellerPage.goto("/seller/orders");
    await sellerPage.getByRole("button", { name: /terima pembayaran|tunai/i }).first().click();
    await sellerPage.getByRole("checkbox").check();
    await sellerPage.getByRole("button", { name: /uang diterima|ya,|konfirmasi/i }).last().click();

    await expect(sellerPage.getByText(/tunai diterima|lunas/i).first()).toBeVisible();
    await sellerContext.close();

    await page.reload();
    await expect(page.getByText(/lunas/i).first()).toBeVisible();
  });
});
