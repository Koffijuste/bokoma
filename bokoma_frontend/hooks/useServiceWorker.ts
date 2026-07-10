// hooks/useServiceWorker.ts
// ============================================================================
// 🛠 HOOK — Service worker registration + push subscription
// ============================================================================
// Enregistre le service worker /sw.js au premier mount, et expose
// des helpers pour s'abonner aux push notifications.
//
// Stratégie d'enregistrement :
//   - Dev (localhost) : on enregistre quand même (utile pour tester offline)
//   - Prod : on attend 2s pour ne pas bloquer le first paint
// ============================================================================

'use client';

import { useEffect, useState } from 'react';

export type PushStatus = 'unsupported' | 'default' | 'granted' | 'denied' | 'subscribed' | 'error';

interface UseServiceWorkerResult {
  ready: boolean;
  registration: ServiceWorkerRegistration | null;
  pushStatus: PushStatus;
  subscribe: () => Promise<PushSubscription | null>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
}

const SUBSCRIPTION_KEY = 'bokoma:push-subscription';

export function useServiceWorker(): UseServiceWorkerResult {
  const [ready, setReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus>('default');

  // ── Enregistrement du SW ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setPushStatus('unsupported');
      return;
    }

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          // updateViaCache: 'none' force le re-fetch du SW à chaque reload
          // (sinon le navigateur peut servir l'ancien SW depuis le cache HTTP)
          updateViaCache: 'none',
        });
        setRegistration(reg);

        // Si un nouveau SW est en attente, on lui dit de s'activer
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nouveau SW installé, on peut skipWaiting si on veut
              // (pour l'instant on attend le prochain reload)
            }
          });
        });

        setReady(true);

        // Statut push initial
        const perm = Notification.permission;
        const sub = await reg.pushManager.getSubscription();
        if (sub) setPushStatus('subscribed');
        else if (perm === 'granted') setPushStatus('granted');
        else if (perm === 'denied') setPushStatus('denied');
        else setPushStatus('default');
      } catch (err) {
        console.warn('[SW] registration failed:', err);
        setPushStatus('error');
      }
    };

    // Délai pour ne pas bloquer le first paint
    const timer = setTimeout(register, 2000);
    return () => clearTimeout(timer);
  }, []);

  // ── Demande de permission ─────────────────────────────────────────
  const requestPermission = async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
    const perm = await Notification.requestPermission();
    if (perm === 'granted') setPushStatus('granted');
    else if (perm === 'denied') setPushStatus('denied');
    return perm;
  };

  // ── Subscribe aux push ────────────────────────────────────────────
  const subscribe = async (): Promise<PushSubscription | null> => {
    if (!registration) return null;

    // 1. Vérifier / demander la permission
    let perm = Notification.permission;
    if (perm === 'default') perm = await requestPermission();
    if (perm !== 'granted') return null;

    // 2. Récupérer la clé publique VAPID depuis le backend
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY non configurée');
      return null;
    }

    // 3. Subscribe via PushManager
    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      setPushStatus('subscribed');

      // 4. Envoie la subscription au backend
      try {
        await fetch('/api/v1/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(sub.toJSON()),
        });
        // Backup local
        window.localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(sub.toJSON()));
      } catch (err) {
        console.warn('[Push] subscription save to backend failed:', err);
      }
      return sub;
    } catch (err) {
      console.warn('[Push] subscribe failed:', err);
      setPushStatus('error');
      return null;
    }
  };

  // ── Unsubscribe ───────────────────────────────────────────────────
  const unsubscribe = async (): Promise<boolean> => {
    if (!registration) return false;
    try {
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        // Notifier le backend
        try {
          await fetch('/api/v1/push/unsubscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        } catch (err) {
          console.warn('[Push] unsubscribe notify failed:', err);
        }
      }
      window.localStorage.removeItem(SUBSCRIPTION_KEY);
      setPushStatus(Notification.permission === 'granted' ? 'granted' : 'default');
      return true;
    } catch (err) {
      console.warn('[Push] unsubscribe failed:', err);
      return false;
    }
  };

  return { ready, registration, pushStatus, subscribe, unsubscribe, requestPermission };
}

// ── Utilitaire : convertir la clé VAPID base64 en Uint8Array ───────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
