// store/auth.ts
// ============================================================================
// 🔐 AUTH STORE — Cookie httpOnly only, no localStorage for tokens
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, RegisterData } from '@/types';
import { authApi } from '@/services';

export interface AuthStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  _hydrated: boolean;

  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      _hydrated: false,

      isAuthenticated: () => !!get().user,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password });
          const user = response?.data?.user ?? (response as any)?.user;

          if (!user) throw new Error('Utilisateur non reçu');

          set({ user, isLoading: false, error: null });
          return user;
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || 'Identifiants incorrects';
          set({ error: msg, isLoading: false, user: null });
          throw new Error(msg);
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);
          const user = response?.data?.user ?? (response as any)?.user;

          if (!user) throw new Error('Utilisateur non reçu');

          set({ user, isLoading: false, error: null });
          return user;
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || "Erreur lors de l'inscription";
          set({ error: msg, isLoading: false, user: null });
          throw new Error(msg);
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Continuer même si l'API échoue
        } finally {
          set({ user: null, error: null });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('bokoma:logout'));
          }
        }
      },

      fetchUser: async () => {
        if (get().isLoading) return;

        set({ isLoading: true });
        try {
          const response = await authApi.getMe();
          const user = response?.data?.user ?? (response as any)?.user;

          if (!user) throw new Error('Session invalide');

          set({ user, isLoading: false, error: null });
        } catch {
          set({ user: null, isLoading: false, error: null });
        }
      },

      setUser: (user) => set({ user }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'bokoma-auth-v2',
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrated = true;
      },
    }
  )
);