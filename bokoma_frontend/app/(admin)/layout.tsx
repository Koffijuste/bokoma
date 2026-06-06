// app/(admin)/layout.tsx - VERSION CORRIGÉE
'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { useUiStore } from '@/store';

// ⚠️ On NE fait PAS de vérification auth ici
// Laisser useRequireAdmin gérer dans les PAGES, pas dans le layout

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen } = useUiStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && resolvedTheme === 'dark';

  // 🔍 DEBUG OVERLAY - Supprimer en production
 // 🔍 DEBUG OVERLAY - Supprimer en production
const DebugBar = () => {
  if (process.env.NEXT_PUBLIC_DEBUG !== 'true') return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#1e293b',
      color: 'white',
      padding: '0.5rem 1rem',
      fontSize: '0.75rem',
      zIndex: 9999,
      display: 'flex',
      gap: '1rem',
      flexWrap: 'wrap'
    }}>
      <span>🔧 Layout monté: ✅</span>
      
      {/* ✅ FIX: N'afficher le thème qu'après montage client */}
      <span>🎨 Theme: {mounted ? resolvedTheme : 'loading...'}</span>
      
      <span>📦 Sidebar: {sidebarOpen ? 'open' : 'closed'}</span>
    </div>
  );
};
  return (
    <div className="flex h-screen bg-background">
      {/* Debug bar */}
      <DebugBar />
      
      {/* Sidebar */}
      <AdminSidebar />
      
      {/* Main content */}
      <main
        className={`flex-1 overflow-auto transition-all duration-300 ${
          sidebarOpen ? 'sm:ml-64' : 'sm:ml-20'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/95 sticky top-0 z-20">
          <div>
            <p className="text-sm text-muted-foreground">Mode de thème</p>
            <h1 className="text-xl font-semibold">Dashboard Admin</h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
            className="gap-2"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDarkMode ? 'Light' : 'Night'}
          </Button>
        </div>
        
        {/* ⚠️ TOUJOURS rendre les enfants - pas de condition ici */}
        {children}
      </main>
    </div>
  );
}