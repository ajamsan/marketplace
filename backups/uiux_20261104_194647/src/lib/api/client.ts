import {
  getAccessToken,
  notifySessionLost,
  setAccessToken,
} from "./token-store";
import type { ApiFailure, ApiSuccess } from "./types";

export const API_BASE = "/api/v1";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields?: Record<string, string>;
  readonly requestId?: string;

  // Membentuk galat terstruktur agar pemanggil dapat membaca status dan rincian API.
  constructor(status: number, body: ApiFailure) {
    super(body.error?.message ?? "Terjadi kesalahan pada server.");
    this.name = "ApiError";
    this.status = status;
    this.code = body.error?.code ?? "INTERNAL_ERROR";
    this.fields = body.error?.fields;
    this.requestId = body.meta?.request_id;
  }

  // Menandai kegagalan yang memerlukan autentikasi ulang.
  get isUnauthorized() {
    return this.status === 401;
  }

  // Menandai kegagalan yang membatasi frekuensi permintaan.
  get isRateLimited() {
    return this.status === 429;
  }
}

// Membaca cookie browser yang dipakai untuk melindungi permintaan lintas situs.
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const CSRF_COOKIE = "kk_csrf";

// Mengambil token perlindungan permintaan dari cookie yang dikelola server.
function csrfToken(): string | null {
  return readCookie(CSRF_COOKIE);
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface RequestOptions {
  method?: Method;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  /** Percobaan ulang otomatis setelah silent refresh (default true). */
  retryOnUnauthorized?: boolean;
  signal?: AbortSignal;
}

// Mengubah respons menjadi data terstruktur dan mengabaikan badan yang bukan JSON.
async function parseBody(response: Response): Promise<ApiFailure | ApiSuccess<unknown> | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as ApiFailure | ApiSuccess<unknown>;
  } catch {
    return null;
  }
}

/** Refresh token berada di cookie HttpOnly; CSRF double-submit wajib (D8). */
async function refreshSession(): Promise<boolean> {
  const csrf = csrfToken();
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: csrf ? { "X-CSRF-Token": csrf } : {},
    });
    if (!response.ok) return false;
    const body = (await parseBody(response)) as ApiSuccess<{
      access_token: string;
    }> | null;
    if (!body || !body.data?.access_token) return false;
    setAccessToken(body.data.access_token);
    return true;
  } catch {
    return false;
  }
}

// Menyatukan header, CSRF, pemulihan sesi, dan pemetaan galat untuk permintaan API.
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    auth = true,
    retryOnUnauthorized = true,
    signal,
  } = options;

  const finalHeaders: Record<string, string> = { Accept: "application/json", ...headers };
  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  if (method !== "GET") {
    const csrf = csrfToken();
    if (csrf && !finalHeaders["X-CSRF-Token"]) {
      finalHeaders["X-CSRF-Token"] = csrf;
    }
  }

  if (auth) {
    const token = getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: payload,
    credentials: "include",
    signal,
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
    }
    notifySessionLost();
  }

  const parsed = await parseBody(response);
  if (!response.ok) {
    const failure = (parsed as ApiFailure | null) ?? {
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server." },
      meta: { request_id: "" },
    };
    throw new ApiError(response.status, failure);
  }

  return (parsed as ApiSuccess<T> | null)?.data as T;
}

export const api = {
  // Menyediakan permintaan baca dengan metode HTTP yang sesuai.
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  // Mengirim data baru dan meneruskan opsi autentikasi pemanggil.
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  // Mengganti data yang sudah ada melalui permintaan PUT.
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  // Mengirim perubahan sebagian tanpa mengganti seluruh data.
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  // Menghapus data melalui endpoint yang ditentukan.
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
