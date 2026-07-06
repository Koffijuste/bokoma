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

  const wishlist = useWishlistStore((state) => state.wishlist);
  const setWishlist = useWishlistStore((state) => state.setWishlist);

  const isTogglingRef = useRef(false);
  const prevAuthRef = useRef<boolean | null>(null);

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/users/me/wishlist');
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

  const toggleWishlist = useCallback(async (
    productId: string,
    product?: Product
  ): Promise<boolean> => {
    if (!isAuthenticated) return false;
    if (isTogglingRef.current) return false;

    isTogglingRef.current = true;
    const wasInWishlist = wishlist.some((p: any) => p._id === productId || p.id === productId);

    try {
      const response = await apiClient.post(`/users/me/wishlist/${productId}`);
      const action = response?.data?.action || response?.action || 'unknown';

      if (action === 'removed' || (!action || action === 'unknown')) {
        const next = wishlist.filter((p: any) => p._id !== productId && p.id !== productId);
        setWishlist(next);
      } else if (action === 'added') {
        if (product && !wasInWishlist) {
          setWishlist([...wishlist, product]);
        }
      }
      return true;
    } catch {
      await fetchWishlist();
      return false;
    } finally {
      isTogglingRef.current = false;
      setTimeout(() => { fetchWishlist(); }, 300);
    }
  }, [isAuthenticated, wishlist, fetchWishlist, setWishlist]);

  const addToWishlist = useCallback(async (productId: string, product?: Product): Promise<boolean> => {
    if (!isAuthenticated) return false;
    if (isInWishlistLocal(productId)) return true;
    if (product) {
      setWishlist([...wishlist, product]);
    }
    return toggleWishlist(productId, product);
  }, [isAuthenticated, wishlist, toggleWishlist, setWishlist]);

  const removeFromWishlist = useCallback(async (productId: string): Promise<boolean> => {
    if (!isAuthenticated) return false;
    const inList = wishlist.some((p: any) => p._id === productId || p.id === productId);
    if (inList) {
      setWishlist(wishlist.filter((p: any) => p._id !== productId && p.id !== productId));
    }
    return toggleWishlist(productId);
  }, [isAuthenticated, wishlist, toggleWishlist, setWishlist]);

  const isInWishlistLocal = useCallback((productId: string): boolean => {
    return wishlist.some((p: any) => p._id === productId || p.id === productId);
  }, [wishlist]);

  useEffect(() => {
    const prevAuth = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;
    if (prevAuth === null || prevAuth !== isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated, fetchWishlist]);

  return {
    wishlist,
    loading,
    error,
    toggleWishlist,
    isInWishlist: isInWishlistLocal,
    refetch: fetchWishlist,
    refreshWishlist: fetchWishlist,
    addToWishlist,
    removeFromWishlist,
  };
}