import { describe, expect, it } from "vitest";

import {
  AVAILABILITY_LABEL,
  formatDateTime,
  formatIDR,
  fulfillmentStatusLabel,
  orderStatusLabel,
  paymentStatusLabel,
} from "@/lib/format";

describe("formatIDR", () => {
  it("menampilkan minor unit sebagai rupiah tanpa desimal", () => {
    expect(formatIDR(1_800_000)).toBe("Rp 18.000");
    expect(formatIDR(400_000)).toBe("Rp 4.000");
  });

  it("menampilkan nilai nol dan nilai tidak valid secara aman", () => {
    expect(formatIDR(0)).toBe("Rp 0");
    expect(formatIDR(null)).toBe("Rp 0");
    expect(formatIDR(undefined)).toBe("Rp 0");
    expect(formatIDR(Number.NaN)).toBe("Rp 0");
  });

  it("mempertahankan pecahan dua digit", () => {
    expect(formatIDR(150_050)).toBe("Rp 1.500,50");
  });
});

describe("label status", () => {
  it("menggunakan label teks untuk setiap status pesanan", () => {
    expect(orderStatusLabel("awaiting_payment")).toBe("Menunggu pembayaran");
    expect(orderStatusLabel("confirmed")).toBe("Lunas");
    expect(orderStatusLabel("completed")).toBe("Selesai");
  });

  it("mempertahankan status tak dikenal apa adanya", () => {
    expect(orderStatusLabel("mystery")).toBe("mystery");
  });

  it("menyediakan label pembayaran, pemenuhan, dan ketersediaan", () => {
    expect(paymentStatusLabel("cash_due")).toBe("Belum dibayar (tunai)");
    expect(paymentStatusLabel("cash_paid")).toBe("Tunai diterima");
    expect(fulfillmentStatusLabel("ready_for_pickup")).toBe("Siap diambil");
    expect(AVAILABILITY_LABEL.unavailable).toBe("Tidak tersedia");
  });
});

describe("formatDateTime", () => {
  it("menampilkan waktu dalam zona waktu kampus (Asia/Jakarta)", () => {
    const formatted = formatDateTime("2026-10-28T03:00:00Z");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("28");
  });

  it("menampilkan tanda hubung untuk nilai tidak valid", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime("bukan tanggal")).toBe("-");
  });
});
