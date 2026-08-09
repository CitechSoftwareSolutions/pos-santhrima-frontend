import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserDto } from "@/lib/types";

interface AuthState {
  token: string | null;
  user: UserDto | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: UserDto) => void;
  updateUser: (user: UserDto) => void;
  clearAuth: () => void;
  hasRole: (...roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      updateUser: (user) => set({ user }),
      clearAuth: () => set({ token: null, user: null, isAuthenticated: false }),
      hasRole: (...roles) => {
        const user = get().user;
        if (!user) return false;
        return roles.some((r) => user.roles.includes(r));
      },
    }),
    {
      name: "pos-auth",
    },
  ),
);
