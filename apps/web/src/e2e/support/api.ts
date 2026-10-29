import type { APIRequestContext } from "@playwright/test";

export const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:8080";

export async function waitForApi(request: APIRequestContext): Promise<void> {
  const deadline = Date.now() + 30_000;
  let lastError = "tidak diketahui";
  while (Date.now() < deadline) {
    try {
      const response = await request.get(`${API_BASE_URL}/healthz`);
      if (response.ok()) return;
      lastError = `status ${response.status()}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`API tidak siap: ${lastError}`);
}

export interface RegisteredUser {
  username: string;
  email: string;
  password: string;
}

export function uniqueUser(prefix: string): RegisteredUser {
  const suffix = Math.random().toString(36).slice(2, 8);
  return {
    username: `${prefix}.${suffix}`,
    email: `${prefix}.${suffix}@example.com`,
    password: "password-kuat-123",
  };
}
