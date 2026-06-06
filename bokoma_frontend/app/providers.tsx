'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem enableColorScheme>
      {children}
      <Toaster
        position="top-right"
        theme="dark"
        richColors
        expand={true}
        closeButton
      />
    </ThemeProvider>
  );
}
