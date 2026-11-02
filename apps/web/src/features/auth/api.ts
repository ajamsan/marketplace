"use client";

import { api } from "@/lib/api/client";
import type { AuthTokens, Profile, UserInfo } from "@/lib/api/types";

export const authApi = {
  // Membuat akun baru dengan peran yang dipilih tanpa sesi aktif.
  register: (input: {
    username: string;
    email: string;
    password: string;
    role: "buyer" | "seller";
  }) => api.post<{ status: string }>("/auth/register", input, { auth: false }),

  // Mengaktifkan akun setelah kode verifikasi email diterima.
  verifyRegister: (input: { email: string; otp: string }) =>
    api.post<AuthTokens>("/auth/register/verify", input, { auth: false }),

  // Mengirim ulang kode sesuai tujuan autentikasi yang sedang berlangsung.
  resendOtp: (input: { email: string; purpose: "register" | "login" }) =>
    api.post<{ status: string }>("/auth/otp/resend", input, { auth: false }),

  // Memulai autentikasi dan memperoleh token sementara untuk verifikasi.
  login: (input: { email: string; password: string }) =>
    api.post<{ status: string; pre_auth_token: string }>("/auth/login", input, {
      auth: false,
    }),

  // Menukar token sementara dan kode sekali pakai dengan token sesi.
  verifyLogin: (input: { pre_auth_token: string; otp: string }) =>
    api.post<AuthTokens>("/auth/login/verify", input, { auth: false }),

  // Meminta token akses baru berdasarkan cookie sesi yang masih berlaku.
  refresh: () => api.post<AuthTokens>("/auth/refresh", undefined, { auth: false }),

  // Mengakhiri sesi pengguna pada server.
  logout: () => api.post<{ status: string }>("/auth/logout", undefined),

  // Memuat sesi aktif agar pengguna dapat meninjau perangkat yang terhubung.
  sessions: () => api.get<{ sessions: import("@/lib/api/types").SessionView[] }>("/auth/sessions"),

  // Mencabut satu sesi tertentu tanpa mengakhiri sesi lainnya.
  revokeSession: (id: string) =>
    api.delete<{ status: string }>(`/auth/sessions/${encodeURIComponent(id)}`),

  // Memuat profil pengguna yang sedang masuk.
  me: () => api.get<Profile>("/me"),

  // Menyimpan perubahan nama atau preferensi profil.
  updateMe: (input: { username?: string; preferences?: Record<string, string> }) =>
    api.patch<Profile>("/me", input),

  // Mengirim foto profil sebagai multipart agar server dapat memproses berkas.
  uploadProfilePhoto: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<Profile>("/me/profile-photo", form);
  },

  // Menghapus foto profil tanpa mengubah data profil lainnya.
  deleteProfilePhoto: () => api.delete<Profile>("/me/profile-photo"),
};

export type { UserInfo };
