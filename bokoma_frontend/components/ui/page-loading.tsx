// components/ui/page-loading.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Package } from 'lucide-react';

interface PageLoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export const PageLoading: React.FC<PageLoadingProps> = ({ 
  message = 'Chargement...',
  fullScreen = false 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`flex items-center justify-center ${
        fullScreen ? 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm' : 'min-h-[400px]'
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Logo animé */}
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
            scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' }
          }}
          className="relative"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center shadow-lg shadow-accent/20">
            <Package className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-accent/20 animate-ping" />
        </motion.div>

        {/* Spinner */}
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          <p className="text-sm font-medium text-muted-foreground">{message}</p>
        </div>

        {/* Barre de progression */}
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent"
          />
        </div>
      </div>
    </motion.div>
  );
};

// Variante skeleton pour les tableaux
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-3">
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 border border-border rounded-lg animate-pulse">
        <div className="w-10 h-10 bg-muted rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
        <div className="h-8 w-20 bg-muted rounded" />
      </div>
    ))}
  </div>
);

// Variante pour les cards
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="p-6 border border-border rounded-xl animate-pulse">
        <div className="h-4 bg-muted rounded w-1/2 mb-4" />
        <div className="h-8 bg-muted rounded w-3/4 mb-2" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
    ))}
  </div>
);