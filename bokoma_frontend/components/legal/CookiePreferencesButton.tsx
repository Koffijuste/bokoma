// components/legal/CookiePreferencesButton.tsx
// =============================================================================
// 🍪 COOKIE PREFERENCES BUTTON — Bouton "Gérer mes cookies"
// =============================================================================
// Placé dans le footer, permet au visiteur de rouvrir la modale détaillée
// et de modifier ses choix à tout moment (exigence CNIL).
// =============================================================================
'use client';

import React, { useState } from 'react';
import { Cookie } from 'lucide-react';
import { CookiePreferencesModal } from './CookieBanner';

export function CookiePreferencesButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover:text-accent transition-colors inline-flex items-center gap-1.5"
        aria-label="Gérer mes préférences cookies"
      >
        <Cookie className="w-3.5 h-3.5" />
        Cookies
      </button>
      <CookiePreferencesModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}