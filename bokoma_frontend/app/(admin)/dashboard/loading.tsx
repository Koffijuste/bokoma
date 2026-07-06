// app/(admin)/dashboard/loading.tsx
// ============================================================================
// ⏳ LOADER DASHBOARD — Fallback Next.js pour toutes les routes admin
// ============================================================================
// S'affiche pendant le rendu serveur de /dashboard, /dashboard/products,
// /dashboard/orders, etc.
// ============================================================================

import { BokomaLoader } from '@/components/ui/bokoma-loader';

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <BokomaLoader
        size={100}
        message="Chargement du tableau de bord..."
        showWordmark={false}
        showDots
      />
    </div>
  );
}