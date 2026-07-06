// app/loading.tsx
// ============================================================================
// ⏳ LOADER GLOBAL — Suspense fallback Next.js (App Router)
// ============================================================================
// S'affiche automatiquement quand un segment enfant est en train de charger
// (chargement de page, fetch côté serveur, etc.).
//
// Design : cercle premium brandé Bokoma — logo centré + 3 anneaux rouges
//          concentriques qui tournent en sens alternés, halo pulsant, wordmark
//          et trois points rebondissants. Voir : @/components/ui/bokoma-loader
// ============================================================================

import { BokomaLoader } from '@/components/ui/bokoma-loader';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background animate-in fade-in duration-300">
      <BokomaLoader
        size={120}
        message="Préparation de votre expérience Bokoma..."
        showWordmark
        showDots
        fullScreen={false}
      />
    </div>
  );
}