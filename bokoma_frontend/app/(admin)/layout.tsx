// app/(admin)/layout.tsx
// ============================================================================
// 🛡️ LAYOUT ADMIN — header + bouton hamburger + drawer
// ============================================================================
// Avant : une sidebar permanente à gauche (256px dépliée / 80px repliée) qui
// mangeait toujours de la place et se superposait parfois au header.
// Maintenant : pas de sidebar fixe. Un simple bouton menu dans le header
// ouvre un drawer (Sheet) à la demande. Toute la largeur est dispo pour le
// contenu.
// ============================================================================

'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Moon, Sun, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { BokomaLoader } from '@/components/ui/bokoma-loader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  const isDarkMode = mounted && resolvedTheme === 'dark';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ✅ Drawer (Sheet) — s'ouvre uniquement quand l'utilisateur clique
          sur le bouton menu dans le header. Aucun encombrement sinon. */}
      <AdminSidebar open={drawerOpen} onOpenChange={setDrawerOpen} />

      <main className="flex-1 overflow-auto transition-all duration-300 ease-in-out">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            {/* ✅ Bouton menu unique : ouvre/ferme le drawer */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDrawerOpen(true)}
              aria-label="Ouvrir le menu de navigation"
              className="shrink-0"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground hidden sm:block">
                Administration
              </p>
              <h1 className="text-lg font-semibold truncate">Bokoma Store</h1>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
            className="gap-2 shrink-0"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDarkMode ? 'Light' : 'Night'}</span>
          </Button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {isNavigating ? (
            <BokomaLoader
              key="loading"
              size={110}
              message="Chargement du tableau de bord..."
              showWordmark={false}
              showDots
            />
          ) : (
            <div key={pathname} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {children}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}