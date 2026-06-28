// app/(admin)/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Moon, Sun, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { useUiStore } from '@/store';
import { PageLoading } from '@/components/ui/page-loading';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen, setSidebarOpen } = useUiStore();
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

  // ✅ Main : margin seulement sur desktop
  // Sur mobile, le sidebar est en overlay donc pas de margin
  const mainClasses = `flex-1 overflow-auto transition-all duration-300 ease-in-out sm:${
    sidebarOpen ? 'ml-64' : 'ml-20'
  }`;

  const handleMobileToggle = () => {
    console.log('📱 [LAYOUT] Mobile menu toggle clicked');
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />

      <main className={mainClasses}>
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* ✅ Bouton menu mobile : visible seulement sur mobile */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleMobileToggle}
              className="sm:hidden"
              aria-label="Ouvrir le menu admin"
            >
              <Menu className="w-4 h-4" />
            </Button>

            <div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Administration
              </p>
              <h1 className="text-lg font-semibold">Bokoma Store</h1>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
            className="gap-2"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDarkMode ? 'Light' : 'Night'}</span>
          </Button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {isNavigating ? (
            <PageLoading key="loading" message="Chargement..." />
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