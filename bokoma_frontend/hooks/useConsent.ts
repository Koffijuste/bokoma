// hooks/useConsent.ts
// =============================================================================
// 🔐 CONSENT HOOK — Gestion des préférences cookies (CNIL/ePrivacy)
// =============================================================================
// Trois catégories conformes CNIL :
//   - essential  : toujours true (cookies techniques, session, panier)
//   - analytics  : mesure d'audience anonymisée (Plausible / Matomo recommandé)
//   - marketing  : personnalisation, retargeting, pub ciblée
//
// Persistance : localStorage `bokoma.consent.v1` (objet JSON)
// Synchronisation : POST /api/v1/consent à chaque changement (preuve CNIL)
// =============================================================================
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

export type ConsentCategory = 'essential' | 'analytics' | 'marketing';
export type ConsentAction = 'accept_all' | 'refuse_all' | 'save_custom' | 'update';

export interface ConsentState {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface ConsentRecord extends ConsentState {
  /** Horodatage ISO du dernier changement */
  updatedAt: string;
  /** Version du banner (preuve CNIL) */
  version: string;
}

const STORAGE_KEY = 'bokoma.consent.v1';
const VISITOR_KEY = 'bokoma.visitor.v1';
const BANNER_VERSION = '1.0.0';
const CONSENT_MAX_AGE_MS = 13 * 30 * 24 * 60 * 60 * 1000; // 13 mois (CNIL)

// État par défaut — "refus par défaut" conforme CNIL pour les catégories non-essentielles
const DEFAULT_CONSENT: ConsentState = {
  essential: true,
  analytics: false,
  marketing: false,
};

const DEFAULT_RECORD: ConsentRecord = {
  ...DEFAULT_CONSENT,
  updatedAt: '',
  version: BANNER_VERSION,
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Helpers storage
// ─────────────────────────────────────────────────────────────────────────────
const isBrowser = typeof window !== 'undefined';

const safeRead = (): ConsentRecord | null => {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.updatedAt !== 'string') return null;

    // Vérification expiration — au-delà de 13 mois, on redemande
    const age = Date.now() - new Date(parsed.updatedAt).getTime();
    if (Number.isNaN(age) || age > CONSENT_MAX_AGE_MS) return null;

    // Force essential=true même si stock corrompu
    return {
      essential: true,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
      updatedAt: parsed.updatedAt,
      version: parsed.version || BANNER_VERSION,
    };
  } catch {
    return null;
  }
};

const safeWrite = (record: ConsentRecord) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (err) {
    console.warn('[Consent] localStorage write failed:', err);
  }
};

const getOrCreateVisitorId = (): string => {
  if (!isBrowser) return 'ssr';
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Sync backend (fire & forget — la bannière ne doit pas dépendre du réseau)
// ─────────────────────────────────────────────────────────────────────────────
const logToBackend = (
  action: ConsentAction,
  categories: ConsentState,
  visitorId: string,
  pageUrl: string,
) => {
  if (!isBrowser) return;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  if (!apiBase) return;

  axios
    .post(
      `${apiBase}/consent`,
      {
        action,
        categories,
        visitorId,
        bannerVersion: BANNER_VERSION,
        pageUrl,
      },
      { timeout: 4000 },
    )
    .catch((err) => {
      // ⚠️ Le log CNIL échoue n'empêche pas le consentement local
      console.warn('[Consent] log backend échoué (non-bloquant):', err?.message);
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 API publique du hook
// ─────────────────────────────────────────────────────────────────────────────
export interface UseConsent {
  /** État de consentement actuel (essential toujours true) */
  consent: ConsentRecord;
  /** Le visiteur a-t-il déjà fait son choix ? */
  hasDecided: boolean;
  /** La bannière doit-elle être affichée ? (helper dérivé) */
  shouldShowBanner: boolean;
  /** Accepter tout (analytics + marketing + essential) */
  acceptAll: () => void;
  /** Tout refuser (essential seul) */
  refuseAll: () => void;
  /** Sauvegarder un choix granulaire */
  saveCustom: (next: Partial<ConsentState>) => void;
  /** Reset complet (utile en debug) */
  reset: () => void;
}

export function useConsent(): UseConsent {
  const [consent, setConsent] = useState<ConsentRecord>(DEFAULT_RECORD);
  const [hydrated, setHydrated] = useState(false);
  const visitorRef = useRef<string>('');

  // Hydratation initiale depuis localStorage
  useEffect(() => {
    visitorRef.current = getOrCreateVisitorId();
    const stored = safeRead();
    if (stored) setConsent(stored);
    setHydrated(true);
  }, []);

  const persist = useCallback(
    (next: ConsentState, action: ConsentAction) => {
      const record: ConsentRecord = {
        ...next,
        essential: true, // sécurité : toujours true
        updatedAt: new Date().toISOString(),
        version: BANNER_VERSION,
      };
      safeWrite(record);
      setConsent(record);

      logToBackend(
        action,
        { essential: true, analytics: record.analytics, marketing: record.marketing },
        visitorRef.current || getOrCreateVisitorId(),
        isBrowser ? window.location.href : '',
      );
    },
    [],
  );

  const acceptAll = useCallback(() => {
    persist({ essential: true, analytics: true, marketing: true }, 'accept_all');
  }, [persist]);

  const refuseAll = useCallback(() => {
    persist({ essential: true, analytics: false, marketing: false }, 'refuse_all');
  }, [persist]);

  const saveCustom = useCallback(
    (next: Partial<ConsentState>) => {
      persist(
        {
          essential: true,
          analytics: !!next.analytics,
          marketing: !!next.marketing,
        },
        'save_custom',
      );
    },
    [persist],
  );

  const reset = useCallback(() => {
    if (isBrowser) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
    }
    setConsent(DEFAULT_RECORD);
  }, []);

  const hasDecided = useMemo(
    () => !!consent.updatedAt && consent.version === BANNER_VERSION,
    [consent],
  );

  return {
    consent,
    hasDecided: hydrated && hasDecided,
    shouldShowBanner: hydrated && !hasDecided,
    acceptAll,
    refuseAll,
    saveCustom,
    reset,
  };
}

// Helper export pour les consumers qui veulent juste lire sans hook (rare)
export const readConsent = (): ConsentRecord | null => safeRead();