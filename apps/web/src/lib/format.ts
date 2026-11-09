/** Zona waktu tampilan. Defaults Asia/Jakarta (D20) until kampus mengonfirmasi. */
export const DISPLAY_TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE ?? "Asia/Jakarta";

export const DISPLAY_CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "IDR";

/** Format nominal minor unit (bigint-safe) menjadi tampilan rupiah. */
export function formatIDR(minor: number | null | undefined): string {
  if (minor === null || minor === undefined || Number.isNaN(minor)) return "Rp 0";
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const major = abs / 100;
  const text = major.toLocaleString("id-ID", {
    minimumFractionDigits: major % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${negative ? "-" : ""}Rp ${text}`;
}

/** Format tanggal/waktu ISO (UTC dari server) ke zona waktu kampus. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}

/** Menampilkan tanggal berdasarkan zona waktu tampilan aplikasi. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}

/** Label teks status pesanan: aksen warna tidak menggantikan label (PRD §7). */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Menunggu pembayaran",
  confirmed: "Lunas",
  in_preparation: "Diproses",
  ready_for_pickup: "Siap diambil",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
  rejected: "Ditolak",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  cash_due: "Belum dibayar (tunai)",
  cash_paid: "Tunai diterima",
  void: "Dibatalkan",
  unavailable: "Belum tersedia",
  awaiting_external_confirmation: "Menunggu konfirmasi eksternal",
};

export const FULFILLMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Belum diproses",
  in_preparation: "Diproses",
  ready_for_pickup: "Siap diambil",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const AVAILABILITY_LABEL: Record<string, string> = {
  available: "Tersedia",
  unavailable: "Tidak tersedia",
  out_of_stock: "Habis",
};

export const STALL_STATUS_LABEL: Record<string, string> = {
  pending_review: "Menunggu persetujuan admin",
  active: "Aktif",
  inactive: "Nonaktif",
};

/** Mencari label bahasa Indonesia untuk status pesanan. */
export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABEL[status] ?? status;
}

/** Mengembalikan label bahasa Indonesia untuk status pembayaran. */
export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABEL[status] ?? status;
}

/** Mengembalikan label bahasa Indonesia untuk tahap pemenuhan pesanan. */
export function fulfillmentStatusLabel(status: string): string {
  return FULFILLMENT_STATUS_LABEL[status] ?? status;
}
