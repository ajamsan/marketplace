import { expect, test } from "@playwright/test";

import { waitForApi } from "./support/api";

test("navigasi Tentang dan Menu hari ini tetap memakai tampilan publik", async ({ page, request }) => {
  await waitForApi(request);
  await page.goto("/");

  await page.getByRole("navigation", { name: "Navigasi utama" }).getByRole("link", { name: "Tentang" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: /Mengubah cara kampus makan/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigasi utama" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Menu Aplikasi" })).toHaveCount(0);

  await page.getByRole("navigation", { name: "Navigasi utama" }).getByRole("link", { name: "Menu hari ini" }).click();
  await expect(page).toHaveURL(/\/#koleksi$/);
  await expect(page.getByRole("heading", { name: /Yang sedang dijual di stan kampus/ })).toBeVisible();
});
