// hooks/useRatingPrompt.ts
// ============================================================================
// ⭐ NOTE PRODUIT — Détermine s'il faut proposer de noter après un ajout panier.
// ============================================================================
// Règles :
//   - On n'affiche pas si l'utilisateur a déjà noté ce produit (session).
//   - On n'affiche pas si l'utilisateur a cliqué "Plus tard" sur CE produit
//     durant la session.
//   - On n'affiche pas si l'utilisateur a coché "Ne plus me proposer"
//     dans les 7 derniers jours (persistant).
// ============================================================================
'use client';

import { useCallback } from 'react';
import { useAuth } from './useAuth';

const RATED_KEY = 'bokoma:rate-done';
const SKIPPED_KEY = 'bokoma:rate-skipped';
const NEVER_KEY = 'bokoma:rate-never';

function readSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* silent */
  }
}

function readNeverAsk(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(NEVER_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    const expires = at + 7 * 24 * 60 * 60 * 1000;
    return expires > Date.now();
  } catch {
    return false;
  }
}

export interface RatingPromptEligibility {
  eligible: boolean;
  reason?: 'already-rated' | 'session-skipped' | 'never' | 'not-authenticated';
}

/**
 * Hook : exposer la logique + helpers d'enregistrement des décisions.
 */
export function useRatingPrompt() {
  const { isAuthenticated } = useAuth();

  const shouldPromptFor = useCallback(
    (productId: string | undefined): RatingPromptEligibility => {
      if (typeof window === 'undefined') {
        return { eligible: false };
      }
      if (!isAuthenticated) {
        return { eligible: false, reason: 'not-authenticated' };
      }
      if (readNeverAsk()) {
        return { eligible: false, reason: 'never' };
      }
      if (!productId) return { eligible: false };
      const rated = readSet(RATED_KEY);
      if (rated.has(productId)) {
        return { eligible: false, reason: 'already-rated' };
      }
      const skipped = readSet(SKIPPED_KEY);
      if (skipped.has(productId)) {
        return { eligible: false, reason: 'session-skipped' };
      }
      return { eligible: true };
    },
    [isAuthenticated],
  );

  const markRated = useCallback((productId: string) => {
    const rated = readSet(RATED_KEY);
    rated.add(productId);
    writeSet(RATED_KEY, rated);
  }, []);

  const markSkipped = useCallback((productId: string) => {
    const skipped = readSet(SKIPPED_KEY);
    skipped.add(productId);
    writeSet(SKIPPED_KEY, skipped);
  }, []);

  const markNever = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(NEVER_KEY, String(Date.now()));
    } catch {
      /* silent */
    }
  }, []);

  return {
    shouldPromptFor,
    markRated,
    markSkipped,
    markNever,
  };
}
