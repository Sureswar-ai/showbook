"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserDto } from "@showbook/types";
import { authStorage } from "@/lib/api/client";

interface AuthState {
  user: UserDto | null;
  setUser: (u: UserDto | null) => void;
  setSession: (params: { accessToken: string; refreshToken: string; user: UserDto }) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (u) => set({ user: u }),
      setSession: ({ accessToken, refreshToken, user }) => {
        authStorage.set(accessToken, refreshToken);
        set({ user });
      },
      logout: () => {
        authStorage.clear();
        set({ user: null });
      },
    }),
    { name: "sb_auth_user", partialize: (s) => ({ user: s.user }) }
  )
);
