// app/loading.tsx
'use client';

import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
        <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto" />
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
}