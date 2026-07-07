// hooks/useAuth.ts
// ============================================================================
// 🔐 AUTH HOOKS — Session via cookie httpOnly, state via Zustand
// ============================================================================
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store';
import type { RegisterData } from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────
const r = (route: string | undefined, fallback: string) =>
  route?.startsWith('/') ? route : fallback;

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/forgot', '/auth/reset'];
const isAuthPath = (path: string) => AUTH_PATHS.some(p => path.startsWith(p));

// ============================================================================
// 🔹 useAuth — Hook principal
// ============================================================================

export function useAuth() {
  const router = useRouter();
  const store = useAuthStore();
  const fetchedRef = useRef(false);

  // ── Restauration de session au montage ────────────────────────────────────
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    store.fetchUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Écouter les événements de session ─────────────────────────────────────
  useEffect(() => {
    const handleSessionEnd = () => store.setUser(null);
    
    window.addEventListener('bokoma:session-expired', handleSessionEnd);
    window.addEventListener('bokoma:logout', handleSessionEnd);
    
    return () => {
      window.removeEventListener('bokoma:session-expired', handleSessionEnd);
      window.removeEventListener('bokoma:logout', handleSessionEnd);
    };
  }, [store]);

  // ── Login wrapper avec validation ─────────────────────────────────────────
  const login = useCallback(async (
    emailOrCredentials: string | { email: string; password: string },
    password?: string
  ) => {
    const { email, pass } = typeof emailOrCredentials === 'object'
      ? { email: emailOrCredentials.email, pass: emailOrCredentials.password }
      : { email: emailOrCredentials, pass: password ?? '' };

    const normalizedEmail = email.trim().toLowerCase();
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Adresse email invalide');
    }
    if (pass.length < 6) {
      throw new Error('Mot de passe trop court (minimum 6 caractères)');
    }

    return store.login(normalizedEmail, pass);
  }, [store]);

  // ── Register wrapper ──────────────────────────────────────────────────────
  const register = useCallback(async (data: RegisterData) => {
    return store.register(data);
  }, [store]);

  // ── Logout wrapper ────────────────────────────────────────────────────────
  // ✅ Après la déco on renvoie sur la home (et non /auth/login) pour éviter
  //    le flash d'écran de login quand l'utilisateur n'était pas sur une
  //    route privée. Les composants qui le souhaitent peuvent écouter
  //    `bokoma:logout` ou router.push eux-mêmes APRÈS l'appel.
  const logout = useCallback(async () => {
    await store.logout();
    // Pas de router.push ici volontairement : les appelants (Navbar, Header,
    // Profile) gèrent déjà la redirection eux-mêmes. Ça évite les courses
    // entre deux `router.push` concurrents qui causaient le bug visuel.
  }, [store]);

  return {
    user: store.user,
    isAuthenticated: !!store.user,
    isLoading: store.isLoading,
    error: store.error,
    login,
    register,
    logout,
    fetchUser: store.fetchUser,
    clearError: store.clearError,
  };
}

// ============================================================================
// 🔹 useRequireAuth — Protection de routes privées
// ============================================================================

export function useRequireAuth(redirectTo?: string) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const loginRoute = r(ROUTES?.AUTH?.LOGIN, '/auth/login');
  const target = r(redirectTo, loginRoute);

  useEffect(() => {
    if (auth.isLoading) return;

    // Authentifié sur page auth → rediriger
    if (auth.isAuthenticated && isAuthPath(pathname)) {
      const from = new URLSearchParams(window.location.search).get('from');
      const dest = from?.startsWith('/')
        ? from
        : auth.user?.role === 'admin' || auth.user?.role === 'manager'
          ? r(ROUTES?.ADMIN?.DASHBOARD, '/dashboard')
          : '/profile';
      router.replace(dest);
      return;
    }

    // Non authentifié sur page privée → login
    if (!auth.isAuthenticated && !isAuthPath(pathname)) {
      const from = pathname !== '/' ? pathname : '/profile';
      router.replace(`${target}?from=${encodeURIComponent(from)}`);
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.user?.role, pathname, router, target]);

  return auth;
}

// ============================================================================
// 🔹 useRequireAdmin — Protection de routes admin/manager
// ============================================================================

export function useRequireAdmin() {
  const auth = useRequireAuth();
  const canManage = auth.user?.role === 'admin' || auth.user?.role === 'manager';

  useEffect(() => {
    if (auth.isLoading || !auth.isAuthenticated) return;
    if (!canManage) {
      window.location.href = r(ROUTES?.HOME, '/');
    }
  }, [auth.isLoading, auth.isAuthenticated, canManage]);

  return {
    ...auth,
    isAdmin: auth.user?.role === 'admin',
    isManager: auth.user?.role === 'manager',
    canManage,
  };
}

// ============================================================================
// 🔹 useHasRole — Vérification fine des permissions
// ============================================================================

export function useHasRole(requiredRole: string | string[]) {
  const { user, isAuthenticated } = useAuth();
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  return {
    hasRole: isAuthenticated && !!user?.role && roles.includes(user.role),
    user,
    isAuthenticated,
  };
}