// hooks/useMounted.ts
'use client';

import { useState, useEffect } from 'react';

/**
 * Hook pour détecter quand le composant est monté côté client
 * Essentiel pour éviter les erreurs d'hydratation avec window/document
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return mounted;
}