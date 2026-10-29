import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api } from "@/lib/api/client";
import {
  onSessionLost,
  setAccessToken,
} from "@/lib/api/token-store";

interface FetchCall {
  url: string;
  init: RequestInit;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api client", () => {
  let calls: FetchCall[];

  beforeEach(() => {
    calls = [];
    setAccessToken(null);
    document.cookie = "kk_csrf=token-csrf; path=/";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    onSessionLost(() => undefined);
  });

  it("mengembalikan data dari envelope sukses", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse(200, { data: { id: "abc" }, meta: { request_id: "req-1" } });
    }));

    const result = await api.get<{ id: string }>("/me");

    expect(result).toEqual({ id: "abc" });
    expect(calls[0].url).toBe("/api/v1/me");
  });

  it("menerjemahkan envelope error menjadi ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonResponse(422, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Periksa kembali data yang dimasukkan.",
          fields: { email: "Format email tidak valid" },
        },
        meta: { request_id: "req-2" },
      }),
    ));

    await expect(api.post("/auth/login", { email: "x" })).rejects.toBeInstanceOf(ApiError);
    try {
      await api.post("/auth/login", { email: "x" });
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.code).toBe("VALIDATION_ERROR");
      expect(apiError.status).toBe(422);
      expect(apiError.fields?.email).toBe("Format email tidak valid");
    }
  });

  it("mengirim token akses dan header CSRF pada mutasi", async () => {
    setAccessToken("access-token");
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse(200, { data: { status: "ok" }, meta: { request_id: "r" } });
    }));

    await api.post("/auth/logout");

    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer access-token");
    expect(headers["X-CSRF-Token"]).toBe("token-csrf");
    expect(calls[0].init.credentials).toBe("include");
  });

  it("melakukan refresh sekali lalu mengulangi permintaan setelah 401", async () => {
    setAccessToken("access-token-lama");
    const responses = [
      jsonResponse(401, {
        error: { code: "UNAUTHENTICATED", message: "Sesi tidak valid" },
        meta: { request_id: "r1" },
      }),
      jsonResponse(200, {
        data: { access_token: "access-token-baru" },
        meta: { request_id: "r2" },
      }),
      jsonResponse(200, {
        data: { id: "cart" },
        meta: { request_id: "r3" },
      }),
    ];
    let index = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return responses[index++];
    }));

    const result = await api.get<{ id: string }>("/cart");

    expect(result).toEqual({ id: "cart" });
    expect(calls[0].url).toBe("/api/v1/cart");
    expect(calls[1].url).toBe("/api/v1/auth/refresh");
    expect(calls[2].url).toBe("/api/v1/cart");
    const retryHeaders = calls[2].init.headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe("Bearer access-token-baru");
  });

  it("menandai sesi hilang ketika refresh gagal", async () => {
    let lost = false;
    onSessionLost(() => {
      lost = true;
    });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/auth/refresh")) {
        return jsonResponse(401, {
          error: { code: "UNAUTHENTICATED", message: "Sesi tidak valid" },
          meta: { request_id: "r" },
        });
      }
      return jsonResponse(401, {
        error: { code: "UNAUTHENTICATED", message: "Sesi tidak valid" },
        meta: { request_id: "r" },
      });
    }));

    await expect(api.get("/cart")).rejects.toBeInstanceOf(ApiError);
    expect(lost).toBe(true);
  });

  it("tidak melakukan refresh untuk permintaan publik", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse(401, {
        error: { code: "UNAUTHENTICATED", message: "Sesi tidak valid" },
        meta: { request_id: "r" },
      });
    }));

    await expect(api.get("/products", { auth: false })).rejects.toBeInstanceOf(ApiError);
    expect(calls).toHaveLength(1);
  });
});
