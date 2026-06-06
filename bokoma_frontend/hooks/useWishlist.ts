// hooks/useWishlist.ts
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api';
import { useAuth } from './useAuth';
import type { Product } from '@/types';

// ✅ Types pour les réponses API
interface WishlistResponse {
  success: boolean;
  data?: {
    wishlist: Product[];
    count: number;
  };
  wishlist?: Product[];
  count?: number;
}

interface ToggleWishlistResponse {
  success: boolean;
  data?: {
    wishlist: Product[];
    action: 'added' | 'removed';
    count: number;
  };
  wishlist?: Product[];
  action?: 'added' | 'removed';
  count?: number;
}

export function useWishlist() {
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch wishlist avec typage correct
  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      return;
    }

    try {
      setLoading(true);
      
      // ✅ Typage explicite de la réponse
      const response = await apiClient.get<WishlistResponse>('/users/me/wishlist');
      
      // ✅ Parsing défensif avec type narrowing
      const items = 
        response?.data?.wishlist || 
        response?.wishlist || 
        (Array.isArray(response) ? response : []);
      
      setWishlist(Array.isArray(items) ? items : []);
    } catch (err: any) {
      console.error('❌ [useWishlist] Failed to fetch:', err);
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ✅ Toggle wishlist avec typage correct
  const toggleWishlist = useCallback(async (productId: string): Promise<boolean> => {
    if (!isAuthenticated) {
      console.warn('⚠️ [useWishlist] User not authenticated');
      return false;
    }

    try {
      // ✅ Typage explicite
      const response = await apiClient.post<ToggleWishlistResponse>(
        `/users/me/wishlist/${productId}`
      );
      
      // ✅ Mise à jour optimiste depuis la réponse
      const data = response?.data || response;
      const newWishlist = data?.wishlist;
      
      if (Array.isArray(newWishlist)) {
        setWishlist(newWishlist);
      } else {
        // Fallback : refetch complet
        await fetchWishlist();
      }
      
      return data?.action === 'added';
    } catch (err: any) {
      console.error('❌ [useWishlist] Toggle failed:', err);
      return false;
    }
  }, [isAuthenticated, fetchWishlist]);

  // ✅ Alias pour compatibilité
  const addToWishlist = useCallback(async (productId: string): Promise<boolean> => {
    return toggleWishlist(productId);
  }, [toggleWishlist]);

  const removeFromWishlist = useCallback(async (productId: string): Promise<boolean> => {
    return toggleWishlist(productId);
  }, [toggleWishlist]);

  // ✅ Vérifier si un produit est dans la wishlist
  const isInWishlist = useCallback((productId: string): boolean => {
    return wishlist.some(p => p._id === productId);
  }, [wishlist]);

  // ✅ Fetch initial
  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  return {
    wishlist,
    loading,
    toggleWishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refetch: fetchWishlist,
  };
}