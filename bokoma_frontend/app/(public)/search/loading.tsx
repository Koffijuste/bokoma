// app/(public)/search/loading.tsx
// ============================================================================
// ⏳ LOADER RECHERCHE — Skeleton résultats
// ============================================================================

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 space-y-3">
          <div className="h-10 bg-muted rounded animate-pulse w-full max-w-xl" />
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-muted/50" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-5 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}