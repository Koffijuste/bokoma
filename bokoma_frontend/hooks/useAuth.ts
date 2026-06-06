// hooks/useAuth.ts
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import { STORAGE_KEYS, ROUTES } from '@/constants';
import { useAuthStore } from '@/store';

// ✅ Helper sécurisé pour les routes (fallback si undefined)
const getRoute = (route: string | undefined, fallback: string): string => {
  return route && route.startsWith('/') ? route : fallback;
};

export function useAuth() {
  // ✅ Selecteurs Zustand RÉACTIFS
  const { 
    user, 
    accessToken,
    isLoading, 
    error,
    login: storeLogin, // ← Renommé pour éviter la confusion
    register,
    logout,
    fetchUser,
    clearError,
  } = useAuthStore((state) => ({
    user: state.user,
    accessToken: state.accessToken,
    isLoading: state.isLoading,
    error: state.error,
    login: state.login,
    register: state.register,
    logout: state.logout,
    fetchUser: state.fetchUser,
    clearError: state.clearError,
  }));
  
  // ✅ Flag client pour éviter les mismatch SSR
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  // ✅ isAuthenticated RÉACTIF
  const isAuthenticated = isClient && !!(
    accessToken || 
    (typeof window !== 'undefined' ? Cookies.get(STORAGE_KEYS.AUTH_TOKEN) : null)
  );

  // ✅ Fetch user au montage si token présent mais pas de user
  useEffect(() => {
    if (!isClient) return;
    const token = Cookies.get(STORAGE_KEYS.AUTH_TOKEN);
    if (token && !user && !isLoading) {
      fetchUser();
    }
  }, [isClient, user, isLoading, fetchUser]);

  // ✅ Wrapper sécurisé pour login : compatible avec la signature du store (2 strings)
  const login = async (
    emailOrCredentials: string | { email: string; password: string },
    password?: string
  ): Promise<void> => {
    // Normalisation vers 2 strings pour le store
    let email: string, pass: string;
    
    if (typeof emailOrCredentials === 'string' && typeof password === 'string') {
      // Cas 1: login(email, password)
      email = emailOrCredentials.trim().toLowerCase();
      pass = password;
    } else if (typeof emailOrCredentials === 'object' && emailOrCredentials !== null) {
      // Cas 2: login({ email, password })
      email = String(emailOrCredentials.email || '').trim().toLowerCase();
      pass = String(emailOrCredentials.password || '');
    } else {
      throw new Error('Arguments de connexion invalides');
    }

    // Validation minimale avant appel au store
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Format email invalide');
    }
    if (!pass || pass.length < 6) {
      throw new Error('Mot de passe invalide (minimum 6 caractères)');
    }

    // ✅ Appel au store avec la signature attendue : 2 arguments séparés
    return storeLogin(email, pass);
  };

  return { 
    user,
    accessToken,
    isAuthenticated,
    isLoading: isLoading && isClient,
    isClient,
    error,
    login, // ← Notre wrapper compatible
    register,
    logout,
    fetchUser,
    clearError,
  };
}

/**
 * Hook de protection pour routes privées
 */
export function useRequireAuth(redirectTo?: string) {
  const { isAuthenticated, isLoading, isClient, user, ...rest } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const loginRoute = getRoute(ROUTES?.AUTH?.LOGIN, '/auth/login');
  const targetRedirect = getRoute(redirectTo, loginRoute);

  useEffect(() => {
    if (!isClient || isLoading) return;

    if (isAuthenticated) {
      const isAuthPage = 
        pathname === loginRoute || 
        pathname === getRoute(ROUTES?.AUTH?.REGISTER, '/auth/register') ||
        pathname?.startsWith('/auth/forgot') ||
        pathname?.startsWith('/auth/reset');
      
      if (isAuthPage) {
        const fromParam = typeof window !== 'undefined' 
          ? new URLSearchParams(window.location.search).get('from') 
          : null;
        
        let target = '/profile';
        if (fromParam && fromParam.startsWith('/')) {
          target = fromParam;
        } else if (user?.role === 'admin' || user?.role === 'manager') {
          target = getRoute(ROUTES?.ADMIN?.DASHBOARD, '/dashboard');
        }
        
        router.replace(target);
        return;
      }
      return;
    }
    
    const isAuthPage = 
      pathname === loginRoute || 
      pathname === getRoute(ROUTES?.AUTH?.REGISTER, '/auth/register') ||
      pathname?.startsWith('/auth/forgot') ||
      pathname?.startsWith('/auth/reset');
    
    if (!isAuthPage) {
      const from = pathname && pathname !== '/' ? pathname : '/profile';
      router.replace(`${targetRedirect}?from=${encodeURIComponent(from)}`);
    }
  }, [isClient, isLoading, isAuthenticated, pathname, router, targetRedirect, user]);

  return { user, isAuthenticated, isLoading, isClient, ...rest };
}

/**
 * Hook de protection Admin
 */
export function useRequireAdmin() {
  const auth = useRequireAuth();
  const role = auth.user?.role;
  const canManage = role === 'admin' || role === 'manager';

  useEffect(() => {
    if (!auth.isClient || auth.isLoading || !auth.isAuthenticated) return;
    if (!canManage) {
      window.location.href = getRoute(ROUTES?.HOME, '/');
    }
  }, [auth.isClient, auth.isLoading, auth.isAuthenticated, canManage]);

  return { ...auth, isAdmin: role === 'admin', isManager: role === 'manager', canManage };
}

/**
 * Hook utilitaire pour refresh manuel
 */
export function useRefreshAuth() {
  const store = useAuthStore();
  const login = async (email: string, password: string) => {
    return store.login(email, password);
  };
  return async () => {
    const token = Cookies.get(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return false;
    try {
      await store.fetchUser();
      return true;
    } catch { return false; }
  };
}

/**
 * Hook pour vérifier un rôle spécifique
 */
export function useHasRole(requiredRole: string | string[]) {
  const { user, isAuthenticated } = useAuth();
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return {
    hasRole: isAuthenticated && user?.role ? roles.includes(user.role) : false,
    user,
    isAuthenticated,
  };
}