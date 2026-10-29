"use client";

import { api } from "@/lib/api/client";
import type { AuthTokens, Profile, UserInfo } from "@/lib/api/types";

export const authApi = {
  register: (input: {
    username: string;
    email: string;
    password: string;
    role: "buyer" | "seller";
  }) => api.post<{ status: string }>("/auth/register", input, { auth: false }),

  verifyRegister: (input: { email: string; otp: string }) =>
    api.post<{ status: string }>("/auth/register/verify", input, { auth: false }),

  resendOtp: (input: { email: string; purpose: "register" | "login" }) =>
    api.post<{ status: string }>("/auth/otp/resend", input, { auth: false }),

  login: (input: { email: string; password: string }) =>
    api.post<{ status: string; pre_auth_token: string }>("/auth/login", input, {
      auth: false,
    }),

  verifyLogin: (input: { pre_auth_token: string; otp: string }) =>
    api.post<AuthTokens>("/auth/login/verify", input, { auth: false }),

  refresh: () => api.post<AuthTokens>("/auth/refresh", undefined, { auth: false }),

  logout: () => api.post<{ status: string }>("/auth/logout", undefined),

  sessions: () => api.get<{ sessions: import("@/lib/api/types").SessionView[] }>("/auth/sessions"),

  revokeSession: (id: string) =>
    api.delete<{ status: string }>(`/auth/sessions/${encodeURIComponent(id)}`),

  me: () => api.get<Profile>("/me"),

  updateMe: (input: { username?: string; preferences?: Record<string, string> }) =>
    api.patch<Profile>("/me", input),

  uploadProfilePhoto: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<Profile>("/me/profile-photo", form);
  },

  deleteProfilePhoto: () => api.delete<Profile>("/me/profile-photo"),
};

export type { UserInfo };
