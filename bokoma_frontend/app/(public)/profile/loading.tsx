// app/(public)/profile/loading.tsx
// ============================================================================
// ⏳ LOADER PROFIL — Skeleton du tableau de bord utilisateur
// ============================================================================

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full bg-muted" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="space-y-2 pt-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded-lg" />
              ))}
            </div>
          </aside>

          {/* Main content */}
          <section className="lg:col-span-3 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-1/4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-muted rounded" />
                <div className="h-10 bg-muted rounded" />
              </div>
              <div className="h-10 bg-muted rounded w-full" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}