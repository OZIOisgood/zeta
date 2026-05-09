import { create } from "zustand";
import { api } from "./api";
import { tokenStorage } from "./token-storage";

export type UserRole = "admin" | "expert" | "student" | string;

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  permissions: string[];
  language: string;
  timezone: string;
  avatar: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  signOut: () => Promise<void>;
  bootstrap: () => Promise<void>;
}

interface MeResponse {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  language: string;
  timezone: string;
  avatar: string;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  signOut: async () => {
    await tokenStorage.clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  bootstrap: async () => {
    const accessToken = await tokenStorage.getAccessToken();
    if (!accessToken) {
      set({ isLoading: false });
      return;
    }

    try {
      const me = await api.get<MeResponse>("/auth/me");
      set({
        user: {
          id: me.id,
          firstName: me.first_name,
          lastName: me.last_name,
          email: me.email,
          role: me.role,
          permissions: me.permissions ?? [],
          language: me.language,
          timezone: me.timezone,
          avatar: me.avatar ?? "",
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      // Token invalid or expired and refresh failed — clear state
      await tokenStorage.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
