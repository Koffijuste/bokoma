// store/cart.ts
// ============================================================================
// 🛒 CART STORE — Cleanup auto sur logout / session expirée
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cart } from '@/types';

interface CartState {
  cart: Cart | null;
  setCart: (cart: Cart | null) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: null,

      setCart: (cart) => {
        console.log('🔄 [CART STORE] setCart, items:', cart?.items?.length || 0);
        set({ cart });
      },

      clearCart: () => {
        console.log('🗑️ [CART STORE] clearCart');
        set({ cart: null });
      },
    }),
    {
      name: 'bokoma-cart',
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);

// ============================================================================
// 🔁 Auto-cleanup : panier vidé à la déconnexion ou session expirée
// ============================================================================
if (typeof window !== 'undefined') {
  const cleanup = () => {
    try {
      // 1) Reset du state
      useCartStore.getState().clearCart();

      // 2) Supprime la clé localStorage (le `persist` peut laisser une
      //    entrée résiduelle ; on l'enlève pour éviter qu'un nouvel
      //    utilisateur hérite du panier du précédent sur la même machine).
      try {
        window.localStorage.removeItem('bokoma-cart');
      } catch {
        // Certains navigateurs en mode privé refusent l'accès au storage
      }
    } catch (err) {
      console.warn('[CartStore] cleanup failed:', err);
    }
  };

  window.addEventListener('bokoma:logout', cleanup);
  window.addEventListener('bokoma:session-expired', cleanup);
}