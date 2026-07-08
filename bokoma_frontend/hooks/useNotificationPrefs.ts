// hooks/useNotificationPrefs.ts
// ============================================================================
// 🔔 PRÉFÉRENCES DE NOTIFICATIONS — Persistance locale (pas d'API pour l'instant)
// ============================================================================
// On ne stocke PAS ces prefs côté backend pour le moment (le user model n'a
// pas ces champs). Dès qu'on aura un endpoint /users/me/notification-prefs
// côté backend, on remplacera ce hook par un appel API, mais l'API publique
// (forme du state) restera identique pour les consommateurs.
// ============================================================================

'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'bokoma:notification-prefs:v1';

export interface NotificationPrefs {
  /** Recevoir des emails pour les événements importants (commandes, promos) */
  emailNotifications: boolean;
  /** Alertes en temps réel pour les nouvelles commandes (admin/manager) */
  orderNotifications: boolean;
  /** Promotions et nouveautés Bokoma */
  marketingNotifications: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailNotifications: true,
  orderNotifications: true,
  marketingNotifications: false,
};

// ─── Helpers SSR-safe ───────────────────────────────────────────────────────
const isBrowser = () => typeof window !== 'undefined';

const readFromStorage = (): NotificationPrefs => {
  if (!isBrowser()) return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    // Merge pour tolérer les nouvelles clés ajoutées entre 2 versions
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
};

const writeToStorage = (prefs: NotificationPrefs) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage plein ou désactivé (mode privé) → on accepte de perdre
    // la persistance, l'état reste valide pour la session courante.
  }
};

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useNotificationPrefs() {
  // Initialisé côté client uniquement pour éviter mismatch SSR/hydration
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(readFromStorage());
    setHydrated(true);
  }, []);

  const updatePref = useCallback(
    <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        writeToStorage(next);
        return next;
      });
    },
    []
  );

  const resetPrefs = useCallback(() => {
    setPrefs(DEFAULT_PREFS);
    writeToStorage(DEFAULT_PREFS);
  }, []);

  return { prefs, hydrated, updatePref, resetPrefs };
}