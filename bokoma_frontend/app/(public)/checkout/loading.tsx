// app/(public)/checkout/loading.tsx
// ============================================================================
// ⏳ LOADER CHECKOUT — Skeleton formulaire de paiement
// ============================================================================

import { BokomaLoader } from '@/components/ui/bokoma-loader';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
            Paiement
          </h1>
          <div className="h-4 w-56 mx-auto bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-2xl p-6 animate-pulse space-y-4"
              >
                <div className="h-5 bg-muted rounded w-1/3" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-10 bg-muted rounded" />
                  <div className="h-10 bg-muted rounded" />
                </div>
                <div className="h-10 bg-muted rounded" />
              </div>
            ))}
          </div>
          <aside className="bg-card border border-border rounded-2xl p-6 h-fit animate-pulse space-y-3">
            <div className="h-5 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-12 bg-muted rounded w-full mt-4" />
          </aside>
        </div>
        <div className="mt-8 flex justify-center">
          <BokomaLoader size={48} showWordmark={false} showDots={false} />
        </div>
      </div>
    </div>
  );
}