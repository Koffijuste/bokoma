// components/SessionWatcher.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/index';
import { toast } from 'sonner';

export function SessionWatcher() {
  const router = useRouter();
  const { logout } = useAuthStore();

  useEffect(() => {
    const handleSessionExpired = () => {
      // ✅ Bug fix (10/07/2026) : on ne déclenche le toast que si l'user
      // ÉTAIT connecté. Sans ce check, le moindre appel /api/v1/auth/me
      // sur /auth/login (avant que le user saisisse ses identifiants)
      // déclenchait refresh → 401 → dispatch → toast "Session expirée"
      // alors que le user n'a jamais eu de session active. UX insupportable
      // et trompeur.
      if (!useAuthStore.getState().user) {
        return; // Pas de session active → silencieux
      }

      console.log('⚠️ [SessionWatcher] Session expirée détectée');
      logout();
      toast.error('Session expirée, veuillez vous reconnecter');
      router.push('/auth/login');
    };

    // ✅ Aligné avec services/api.ts → dispatchEvent('bokoma:session-expired')
    window.addEventListener('bokoma:session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('bokoma:session-expired', handleSessionExpired);
    };
  }, [logout, router]);

  return null; // Composant invisible
}