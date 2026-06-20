// store/cart.ts
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
    }
  )
);