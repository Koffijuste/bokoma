// store/ui.ts
// ============================================================================
// 🎛️ UI STORE — État UI local du dashboard admin (sidebar open/close)
// ============================================================================
// ⚠️ Le thème light/dark n'est PAS stocké ici.
//
// Source de vérité unique : `next-themes` (voir app/providers.tsx).
// Tout le reste de l'app (Header, (admin)/layout.tsx, settings/page.tsx…)
// consomme `useTheme()` de `next-themes` qui pose la classe `dark` sur
// <html>. Stocker `theme` ici en parallèle créerait deux sources de vérité
// qui se désynchronisent — donc on ne le fait pas.
//
// Migration : les anciennes versions de ce store persistaient `theme`
// dans `localStorage["bokoma-ui"]`. Cette clé est nettoyée défensivement
// au chargement pour éviter toute fuite vers de futurs déploiements.
// ============================================================================

import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

// Une seule fois au chargement du module (côté client uniquement, car ce
// store n'est consommé que dans des composants 'use client'). No-op côté
// serveur et en mode privé où localStorage est inaccessible.
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem('bokoma-ui');
  } catch {
    /* localStorage indisponible (mode privé, permissions…) : on ignore */
  }
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
