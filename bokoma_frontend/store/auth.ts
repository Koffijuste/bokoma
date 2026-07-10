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

// 🛡️ Helper : wipe COMPLET des données locales user-spécifiques.
// Utilisé sur logout + login + fetchUser-fail pour éviter que le
// panier/wishlist Zustand d'un user précédent reste affiché quand le
// nouveau user navigue (LEAK VISIBLE entre comptes sur même device).
function wipeLocalUserData() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem('bokoma-auth-v2'); } catch {}
  try { window.localStorage.removeItem('bokoma-cart'); } catch {}
  try { window.localStorage.removeItem('bokoma-cart:userId'); } catch {}
  try { window.sessionStorage.removeItem('bokoma_pending_order'); } catch {}
  // Notifie aussi les stores (pour leurs actions custom en mémoire)
  try { window.dispatchEvent(new CustomEvent('bokoma:session-expired')); } catch {}
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

          // 🛡️ Reset COMPLET de toutes les données user-précédentes AVANT
          // de set le nouveau user. Garantit qu'aucun panier/wishlist
          // de l'ancien user ne peut subsister en mémoire.
          wipeLocalUserData();

          set({ user, isLoading: false, error: null });

          // Notifie aussi via event (pour les listeners custom type wishlist)
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

          wipeLocalUserData();
          set({ user, isLoading: false, error: null });
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
          set({ user: null, error: null });

          if (typeof window !== 'undefined') {
            // 🛡️ Wipe COMPLET de TOUTES les données locales user-spécifiques
            // (auth + cart + wishlist + session storage). Sans ça, le
            // prochain user sur la même machine hériterait des données
            // Zustand persistées du précédent.
            wipeLocalUserData();
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
          // 🛡️ Session invalide (401 sur /auth/me) → reset complet du
          // state local + localStorage. Sans ça, le Zustand persist
          // garde l'ancien user et la page affiche "connecté" alors
          // que le serveur rejette toutes les requêtes → CACHE LEAK.
          set({ user: null, isLoading: false, error: null });
          wipeLocalUserData();
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