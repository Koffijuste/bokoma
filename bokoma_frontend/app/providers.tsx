// app/providers.tsx
'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { CapacitorProvider } from '@/components/providers/CapacitorProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem enableColorScheme>
      {/* 📱 Initialise les plugins Capacitor au démarrage (no-op sur le web) */}
      <CapacitorProvider>
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          expand={true}
          closeButton
        />
      </CapacitorProvider>
    </ThemeProvider>
  );
}
