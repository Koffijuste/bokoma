// app/(admin)/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Loading lors du changement de page
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  const isDarkMode = mounted && resolvedTheme === 'dark';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main content */}
      <main
        className={`flex-1 overflow-auto transition-all duration-300 ${
          sidebarOpen ? 'sm:ml-64' : 'sm:ml-20'
        }`}
      >
        {/* Header sticky */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Bouton menu mobile */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSidebar}
              className="md:hidden"
              aria-label="Toggle menu"
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

        {/* Page content avec loading */}
        <div className="p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            {isNavigating ? (
              <PageLoading key="loading" message="Chargement..." />
            ) : (
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}