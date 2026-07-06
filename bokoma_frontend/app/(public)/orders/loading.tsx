// app/(public)/orders/loading.tsx
// ============================================================================
// ⏳ LOADER COMMANDES — Skeleton liste de commandes
// ============================================================================

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
            Mes Commandes
          </h1>
          <div className="h-4 w-48 mx-auto bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl p-6 animate-pulse"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-24 bg-muted rounded" />
                  <div className="h-9 w-24 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}