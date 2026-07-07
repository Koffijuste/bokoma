// store/wishlist.ts
// ============================================================================
// ❤️ WISHLIST STORE — Cleanup auto sur logout / session expirée
// ============================================================================

import { create } from 'zustand';
import type { Product } from '@/types';

interface WishlistState {
  wishlist: Product[];
  setWishlist: (wishlist: Product[]) => void;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  clearWishlist: () => void;
  getCount: () => number;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  wishlist: [],

  setWishlist: (wishlist) => {
    console.log('🔄 [STORE] setWishlist:', wishlist.length, 'produits');
    set({ wishlist });
  },

  addItem: (product) => {
    console.log('➕ [STORE] addItem:', product.name);
    set((state) => {
      const exists = state.wishlist.some(p => p._id === product._id);
      if (exists) {
        console.log('⚠️ [STORE] Produit déjà dans la wishlist');
        return state;
      }
      const newWishlist = [...state.wishlist, product];
      console.log('✅ [STORE] Wishlist après ajout:', newWishlist.length);
      return { wishlist: newWishlist };
    });
  },

  removeItem: (productId) => {
    console.log('➖ [STORE] removeItem:', productId);
    set((state) => {
      const newWishlist = state.wishlist.filter(p => p._id !== productId);
      console.log('✅ [STORE] Wishlist après retrait:', newWishlist.length);
      return { wishlist: newWishlist };
    });
  },

  clearWishlist: () => {
    console.log('🗑️ [STORE] clearWishlist');
    set({ wishlist: [] });
  },

  getCount: () => {
    return get().wishlist.length;
  },
}));

// ============================================================================
// 🔁 Auto-cleanup : wishlist vidée à la déconnexion ou session expirée
// ============================================================================
if (typeof window !== 'undefined') {
  const cleanup = () => {
    try {
      useWishlistStore.getState().clearWishlist();
    } catch (err) {
      console.warn('[WishlistStore] cleanup failed:', err);
    }
  };

  window.addEventListener('bokoma:logout', cleanup);
  window.addEventListener('bokoma:session-expired', cleanup);
}