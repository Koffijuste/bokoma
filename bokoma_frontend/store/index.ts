// store/index.ts
// ============================================================================
// 📦 ZUSTAND STORES - AUTH, CART, UI
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { STORAGE_KEYS } from '@/constants';
import type { User, AuthPayload, ApiResponse, RegisterData } from '@/types';
import { authApi } from '@/services';

// ✅ Ré-exporter le nouveau cart store depuis ./cart
export { useCartStore } from './cart';

// ──────────────────────────────────────────────────────────────────────────
// 🔹 AUTH STORE
// ──────────────────────────────────────────────────────────────────────────

export interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ───────── LOGIN ─────────
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: ApiResponse<AuthPayload> = await authApi.login({ email, password });
          const authData = response.data;
          
          if (!authData?.accessToken) {
            throw new Error('Token non reçu');
          }
          
          const { accessToken, user } = authData;
          
          localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ accessToken }));
          
          Cookies.set(STORAGE_KEYS.AUTH_TOKEN, accessToken, {
            expires: 7,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            path: '/',
          });

          set({ user, accessToken, isAuthenticated: true, isLoading: false, error: null });
          
          if (user) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
          }
        } catch (err: any) {
          set({ error: err.message || 'Erreur de connexion', isLoading: false });
          throw err;
        }
      },

      // ───────── REGISTER ─────────
      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response: ApiResponse<AuthPayload> = await authApi.register(data);
          const authData = response.data;
          
          if (!authData?.accessToken) {
            throw new Error('Token non reçu');
          }
          
          const { accessToken, user } = authData;
          
          localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ accessToken }));
          
          Cookies.set(STORAGE_KEYS.AUTH_TOKEN, accessToken, {
            expires: 7,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            path: '/',
          });

          set({ user, accessToken, isAuthenticated: true, isLoading: false, error: null });
          
          if (user) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
          }
        } catch (err: any) {
          set({ error: err.message || "Erreur d'inscription", isLoading: false });
          throw err;
        }
      },

      // ───────── LOGOUT ─────────
      logout: () => {
        Cookies.remove(STORAGE_KEYS.AUTH_TOKEN, { path: '/' });
        localStorage.removeItem(STORAGE_KEYS.AUTH);
        localStorage.removeItem(STORAGE_KEYS.USER);
        set({ user: null, accessToken: null, isAuthenticated: false, error: null });
      },

      // ───────── FETCH USER ─────────
      fetchUser: async () => {
        let token: string | null = null;
        
        if (typeof window !== 'undefined') {
          token = Cookies.get(STORAGE_KEYS.AUTH_TOKEN) || null;
          
          if (!token) {
            try {
              const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
              if (stored) {
                const parsed = JSON.parse(stored);
                token = parsed?.accessToken || null;
              }
            } catch {}
          }
        }
        
        if (!token) {
          set({ user: null, accessToken: null });
          return;
        }

        if (get().user) { 
          set({ isLoading: false }); 
          return; 
        }

        set({ isLoading: true, error: null });
        try {
          const response: ApiResponse<{ user: User }> = await authApi.getMe();
          const user = response.data?.user;
          
          if (user) {
            set({ user, accessToken: token, isAuthenticated: true, isLoading: false, error: null });
          } else {
            throw new Error('User not found');
          }
        } catch (err: any) {
          Cookies.remove(STORAGE_KEYS.AUTH_TOKEN, { path: '/' });
          localStorage.removeItem(STORAGE_KEYS.AUTH);
          set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: err?.message || 'Session expirée' });
        }
      },

      // ───────── CLEAR ERROR ─────────
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ──────────────────────────────────────────────────────────────────────────
// 🔹 UI STORE
// ──────────────────────────────────────────────────────────────────────────

export interface UiStore {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: STORAGE_KEYS.THEME }
  )
);

// ──────────────────────────────────────────────────────────────────────────
// 🔹 EXPORTS CENTRALISÉS
// ──────────────────────────────────────────────────────────────────────────

// export { useAuthStore, useUiStore };