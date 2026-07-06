// hooks/useWishlist.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/services/api';
import { useAuth } from './useAuth';
import type { Product } from '@/types';
import { useWishlistStore } from '@/store/wishlist';

export function useWishlist() {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Écouter le store Zustand directement
  const wishlist = useWishlistStore((state) => state.wishlist);
  const setWishlist = useWishlistStore((state) => state.setWishlist);

  // ✅ Ref pour éviter les toggles concurrents (pas pour les fetchs)
  const isTogglingRef = useRef(false);
  const prevAuthRef = useRef<boolean | null>(null);

  // ✅ Fetch wishlist
  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/users/me/wishlist');

      // ✅ Extraire et filtrer
      const items = response?.data?.wishlist || response?.wishlist || [];
      const validItems = Array.isArray(items)
        ? items.filter((item: any) => typeof item === 'object' && item !== null && (item._id || item.id))
        : [];

      setWishlist(validItems);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement');
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, setWishlist]);

  // ✅ Toggle wishlist - CORRECTION CRITIQUE
  const toggleWishlist = useCallback(async (
    productId: string,
    product?: Product
  ): Promise<boolean> => {
    if (!isAuthenticated) {
      return false;
    }

    if (isTogglingRef.current) {
      return false;
    }

    isTogglingRef.current = true;

    try {
      // ✅ Appel API
      const response = await apiClient.post(`/users/me/wishlist/${productId}`);

      const action = response?.data?.action || response?.action || 'unknown';

      // ✅ CORRECTION : Mise à jour OPTIMISTE locale IMMÉDIATE
      // Cela met à jour le store Zustand instantanément
      const currentlyIn = wishlist.some((p: any) => p._id === productId || p.id === productId);

      if (action === 'removed') {
        // Retrait : filtrer le produit
        const newWishlist = wishlist.filter((p: any) => p._id !== productId && p.id !== productId);
        setWishlist(newWishlist);
      } else if (action === 'added') {
        // Ajout : ajouter le produit si on l'a
        if (product && !currentlyIn) {
          const newWishlist = [...wishlist, product];
          setWishlist(newWishlist);
        }
      }

      return true;
    } catch {
      // En cas d'erreur, refetch pour restaurer l'état correct
      await fetchWishlist();

      return false;
    } finally {
      // ✅ CORRECTION CRITIQUE : Lever le flag AVANT de refetch
      isTogglingRef.current = false;

      // ✅ Refetch après un court délai pour synchroniser avec le serveur
      setTimeout(() => {
        fetchWishlist();
      }, 300);
    }
  }, [isAuthenticated, wishlist, fetchWishlist, setWishlist]);

  // ✅ Vérifier si dans la wishlist
  const isInWishlist = useCallback((productId: string): boolean => {
    return wishlist.some((p: any) => p._id === productId || p.id === productId);
  }, [wishlist]);

  // ✅ Fetch initial - SEULEMENT quand l'authentification change
  useEffect(() => {
    const prevAuth = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    // Premier rendu ou changement d'auth
    if (prevAuth === null || prevAuth !== isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated, fetchWishlist]);

  return {
    wishlist,
    loading,
    error,
    toggleWishlist,
    isInWishlist,
    refetch: fetchWishlist,
    addToWishlist: (id: string) => toggleWishlist(id),
    removeFromWishlist: (id: string) => toggleWishlist(id),
  };
}
