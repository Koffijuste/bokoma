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