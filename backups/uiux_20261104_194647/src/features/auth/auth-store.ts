"use client";

import { create } from "zustand";

import { authApi } from "./api";
import { setAccessToken } from "@/lib/api/token-store";
import type { AuthTokens, UserInfo } from "@/lib/api/types";

export type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

interface AuthState {
  status: AuthStatus;
  user: UserInfo | null;
  bootstrap: () => Promise<void>;
  signIn: (tokens: AuthTokens) => void;
  signOut: () => Promise<void>;
  markAnonymous: () => void;
  setUser: (user: UserInfo | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  user: null,

  /**
   * Memulihkan sesi dari cookie refresh token saat aplikasi dimuat.
   * Access token hanya hidup di memori (D8).
   */
  bootstrap: async () => {
    if (get().status === "loading" || get().status === "authenticated") return;
    set({ status: "loading" });
    try {
      const tokens = await authApi.refresh();
      setAccessToken(tokens.access_token);
      set({ status: "authenticated", user: tokens.user });
    } catch {
      setAccessToken(null);
      set({ status: "anonymous", user: null });
    }
  },

  // Menyimpan token sementara dan profil setelah verifikasi masuk berhasil.
  signIn: (tokens: AuthTokens) => {
    setAccessToken(tokens.access_token);
    set({ status: "authenticated", user: tokens.user });
  },

  /**
   * Mengakhiri sesi jarak jauh lalu membersihkan token lokal meski permintaan gagal.
   */
  signOut: async () => {
    try {
      await authApi.logout();
    } catch {
      // Sesi mungkin sudah kedaluwarsa di server; cookie tetap dibersihkan server.
    }
    setAccessToken(null);
    set({ status: "anonymous", user: null });
  },

  // Menghapus kredensial lokal saat sesi tidak lagi dapat dipulihkan.
  markAnonymous: () => {
    setAccessToken(null);
    set({ status: "anonymous", user: null });
  },

  // Menyelaraskan profil aktif setelah data pengguna diperbarui.
  setUser: (user: UserInfo | null) => set({ user }),
}));

// Memilih halaman awal berdasarkan peran agar pengguna diarahkan ke area yang sesuai.
export function homePathForRole(role?: UserInfo["role"] | null): string {
  switch (role) {
    case "seller":
      return "/seller/orders";
    case "admin":
      return "/admin";
    default:
      return "/catalog";
  }
}
