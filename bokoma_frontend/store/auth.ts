// store/auth.ts
// ============================================================================
// 🔐 AUTH STORE — Cookie httpOnly only, no localStorage for tokens
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, RegisterData } from '@/types';
import { authApi } from '@/services';

// ----------------------------------------------------------------------------
// 🔁 Helper : notifier les autres stores (cart, wishlist…) de se reset
//    au login / register. On utilise un CustomEvent dédié pour que
//    chaque store décide s'il doit clear ou non. Sans cet event, le
//    panier Zustand (persisté en localStorage) continuerait d'afficher
//    les articles de l'utilisateur précédent sur la même machine.
// ----------------------------------------------------------------------------
function notifyCartResetOnLogin() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('bokoma:login'));
  } catch {
    // Pas de window / DOM (SSR)
  }
}

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

          // ✅ Reset du panier local à chaque nouveau login : le store
          //    Zustand persiste le panier en localStorage, donc un autre
          //    utilisateur sur la même machine hériterait sinon des
          //    articles de l'utilisateur précédent.
          notifyCartResetOnLogin();

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

          // ✅ Idem : compte fraîchement créé = panier vierge
          notifyCartResetOnLogin();

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
          // Continuer même si l'API échoue (token expiré, etc.)
        } finally {
          // ✅ Reset complet de l'auth state
          set({ user: null, error: null });

          // ✅ Cleanup localStorage auth (évite de re-hydrater un user null)
          if (typeof window !== 'undefined') {
            try {
              // zustand/persist utilise cette clé pour la persistance
              window.localStorage.removeItem('bokoma-auth-v2');
            } catch {
              // Certains navigateurs en mode privé refusent l'accès au storage
            }

            // ✅ Notifie les stores (cart, wishlist…) de se vider
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