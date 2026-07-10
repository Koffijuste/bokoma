// store/cart.ts
// ============================================================================
// 🛒 CART STORE — Cleanup auto sur logout / session expirée
// ============================================================================
// 🛡️ SÉCURITÉ : on wipe TOUTES les traces locales du panier à chaque
//    clear (Zustand persist, clé userId, et même les items de session
//    qui pourraient être re-hydratés). Sans ça, un second utilisateur
//    sur la même machine pourrait voir les articles du précédent
//    pendant la fenêtre d'hydratation Zustand.
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

/**
 * 🛡️ Wipe complet de TOUTES les traces locales du panier.
 *  - État Zustand (state)
 *  - Clé persist localStorage `bokoma-cart`
 *  - Clé user-id `bokoma-cart:userId` (utilisée par useCart pour détecter
 *    un changement d'utilisateur et re-fetcher)
 *  - SessionStorage `bokoma_pending_order` (info de la commande en cours)
 * Appelé sur : clearCart manuel (après achat), logout, session expirée,
 * login d'un nouvel utilisateur.
 */
export const wipeLocalCartData = () => {
  if (typeof window === 'undefined') return;
  try {
    useCartStore.getState().clearCart();
  } catch {}
  try { window.localStorage.removeItem('bokoma-cart'); } catch {}
  try { window.localStorage.removeItem('bokoma-cart:userId'); } catch {}
  try { window.sessionStorage.removeItem('bokoma_pending_order'); } catch {}
};

// ============================================================================
// 🔁 Auto-cleanup : panier vidé à la déconnexion ou session expirée
// ============================================================================
if (typeof window !== 'undefined') {
  const cleanup = () => {
    try {
      wipeLocalCartData();
    } catch (err) {
      console.warn('[CartStore] cleanup failed:', err);
    }
  };

  window.addEventListener('bokoma:logout', cleanup);
  window.addEventListener('bokoma:session-expired', cleanup);

  // ✅ Au login d'un nouvel utilisateur (sur la même machine) on flush
  //    aussi le panier local : Zustand persiste dans localStorage, donc
  //    un autre client hériterait sinon des articles du précédent.
  //    Le useEffect `userId` de useCart fera un re-fetch du cart du
  //    nouveau user juste après — il faut juste qu'on soit sûr de
  //    partir d'un panier vide côté store.
  window.addEventListener('bokoma:login', cleanup);
}