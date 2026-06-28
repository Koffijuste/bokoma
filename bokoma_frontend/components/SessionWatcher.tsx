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

    // Écouter l'événement custom émis par api.ts
    window.addEventListener('bokoma:auth:expired', handleSessionExpired);

    return () => {
      window.removeEventListener('bokoma:auth:expired', handleSessionExpired);
    };
  }, [logout, router]);

  return null; // Composant invisible
}