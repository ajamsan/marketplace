import { api } from "@/lib/api/client";
import type {
  ConfirmCashResult,
  FulfillmentResult,
  Product,
  SellerOrder,
  SellerOrderPage,
  Stall,
} from "@/lib/api/types";

export interface StallPayload {
  name: string;
  description?: string;
  location_label?: string;
}

export interface ProductPayload {
  name: string;
  description?: string;
  price_minor: number;
  availability_status: string;
}

export interface StallList {
  stalls: Stall[];
}

export interface ProductList {
  products: Product[];
}

// Mengamankan identitas entitas saat disisipkan ke dalam jalur URL.
function pathId(id: string): string {
  return encodeURIComponent(id);
}

// Memuat stan milik penjual dan mengganti respons tanpa daftar dengan daftar kosong.
export async function listSellerStalls(): Promise<StallList> {
  const data = await api.get<{ stalls?: Stall[] | null }>("/seller/stalls");
  return { stalls: data?.stalls ?? [] };
}

// Membuat stan baru berdasarkan data yang diisi penjual.
export function createStall(payload: StallPayload): Promise<Stall> {
  return api.post<Stall>("/seller/stalls", payload);
}

/** Server menimpa `name` pada setiap PATCH, jadi nama lengkap wajib dikirim. */
export function updateStall(id: string, payload: StallPayload): Promise<Stall> {
  return api.patch<Stall>(`/seller/stalls/${pathId(id)}`, payload);
}

// Memuat produk penjual, opsional dibatasi hanya pada satu stan.
export async function listSellerProducts(stallId?: string): Promise<ProductList> {
  const query = stallId ? `?stall_id=${encodeURIComponent(stallId)}` : "";
  const data = await api.get<{ products?: Product[] | null }>(`/seller/products${query}`);
  return { products: data?.products ?? [] };
}

// Menambahkan produk baru ke stan yang dipilih penjual.
export function createProduct(stallId: string, payload: ProductPayload): Promise<Product> {
  return api.post<Product>(`/seller/stalls/${pathId(stallId)}/products`, payload);
}

// Menyimpan perubahan pada informasi produk yang sudah ada.
export function updateProduct(id: string, payload: ProductPayload): Promise<Product> {
  return api.patch<Product>(`/seller/products/${pathId(id)}`, payload);
}

// Mengarsipkan produk agar tidak lagi muncul sebagai barang aktif.
export function archiveProduct(id: string): Promise<Product> {
  return api.delete<Product>(`/seller/products/${pathId(id)}`);
}

// Mengaktifkan kembali produk yang sebelumnya diarsipkan.
export function unarchiveProduct(id: string): Promise<Product> {
  return api.post<Product>(`/seller/products/${pathId(id)}/unarchive`, undefined);
}

// Mengunggah gambar produk dalam format yang dapat diproses server.
export function uploadProductImage(id: string, file: File): Promise<Product> {
  const form = new FormData();
  form.append("file", file);
  return api.post<Product>(`/seller/products/${pathId(id)}/image`, form);
}

// Memuat antrean pesanan penjual dengan cursor untuk pengambilan bertahap.
export async function listSellerOrders(cursor?: string | null): Promise<SellerOrderPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const data = await api.get<{
    orders?: SellerOrder[] | null;
    next_cursor?: string | null;
  }>(`/seller/orders${query}`);
  return { orders: data?.orders ?? [], next_cursor: data?.next_cursor || null };
}

// Mengambil rincian pesanan yang dapat dikelola oleh penjual.
export function getSellerOrder(id: string): Promise<SellerOrder> {
  return api.get<SellerOrder>(`/seller/orders/${pathId(id)}`);
}

// Mencatat penerimaan pembayaran tunai untuk pesanan terkait.
export function confirmCash(paymentId: string): Promise<ConfirmCashResult> {
  return api.post<ConfirmCashResult>(
    `/seller/payments/${pathId(paymentId)}/confirm-cash`,
    undefined,
  );
}

// Mengirim perubahan tahap pemenuhan pesanan ke server.
export function updateFulfillment(
  fulfillmentId: string,
  status: string,
): Promise<FulfillmentResult> {
  return api.post<FulfillmentResult>(
    `/seller/fulfillments/${pathId(fulfillmentId)}/status`,
    { status },
  );
}
