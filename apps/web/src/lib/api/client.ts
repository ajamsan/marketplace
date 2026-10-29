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

  constructor(status: number, body: ApiFailure) {
    super(body.error?.message ?? "Terjadi kesalahan pada server.");
    this.name = "ApiError";
    this.status = status;
    this.code = body.error?.code ?? "INTERNAL_ERROR";
    this.fields = body.error?.fields;
    this.requestId = body.meta?.request_id;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isRateLimited() {
    return this.status === 429;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const CSRF_COOKIE = "kk_csrf";

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
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
