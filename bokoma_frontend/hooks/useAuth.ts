// hooks/useAuth.ts
// ============================================================================
// 🔐 AUTH HOOKS — Session via cookie httpOnly, state via Zustand
// ============================================================================
// Important : on ne fetchUser() QUE sur les routes privées. Sur les pages
// publiques (/, /products, etc.), appeler /auth/me ferait perdre ~100ms +
// afficherait un spinner d'auth inutile. La persistance Zustand fournit
// déjà le user s'il a une session active.
// Source de vérité partagée : constants/index.ts → PUBLIC_PATHS.
// ============================================================================
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ROUTES, PUBLIC_PATHS } from '@/constants';
import { useAuthStore } from '@/store';
import type { RegisterData } from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────
const r = (route: string | undefined, fallback: string) =>
  route?.startsWith('/') ? route : fallback;

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/forgot', '/auth/reset'];
const isAuthPath = (path: string) => AUTH_PATHS.some(p => path.startsWith(p));

const isPublicPath = (path: string): boolean => {
  if (!path) return false;
  return PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(p + '/'),
  );
};

// ============================================================================
// 🔹 useAuth — Hook principal
// ============================================================================

export function useAuth() {
  const router = useRouter();
  const store = useAuthStore();
  const fetchedRef = useRef(false);

  // ── Restauration de session au montage ────────────────────────────────────
  // ✅ Ne déclenche /auth/me que sur les routes privées. Sur les pages
  // publiques, l'auth state est lu depuis la persistance Zustand
  // (user hydraté = null si non connecté → pas besoin de roundtrip API).
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Pendant la 1re render côté serveur, pathname peut être vide ;
    // on traite ce cas comme "public" pour éviter tout appel pendant
    // l'hydratation côté serveur.
    const onPublic =
      typeof window === 'undefined'
        ? true
        : isPublicPath(window.location.pathname);

    if (onPublic) return; // Pas de /auth.me → pas de spinner d'auth inutile

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

  // ✅ Bug fix (09/07/2026) : si on arrive sur /auth/login avec un store
  // Zustand stale (user persisté) mais un cookie httpOnly expiré, on tombait
  // dans une boucle de redirection :
  //   Zustand.isAuthenticated=true → redirect vers from=/dashboard
  //   /dashboard → middleware (token expiré) → 307 vers /auth/login
  //   /auth/login → Zustand.isAuthenticated=true → redirect vers /dashboard
  //   … ad vitam
  //
  // useAuth() NE fetch PAS sur les pages publiques (cf. useAuth.ts), donc le
  // store reste stale sur /auth/login. On force ici un fetchUser() sur les
  // pages auth pour synchroniser l'état avec la réalité du cookie. Si le
  // cookie est mort, fetchUser met user=null → isAuthenticated=false → plus
  // de redirect → le formulaire de login s'affiche normalement.
  useEffect(() => {
    if (isAuthPath(pathname) && !auth.isLoading) {
      auth.fetchUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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