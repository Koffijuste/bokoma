import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  productId: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  cartCount: number; // number of distinct items in cart
  setCartCount: (count: number) => void;
  incrementCart: () => void;
  decrementCart: () => void;
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      cartCount: 0,

      setCartCount: (count: number) => set({ cartCount: count }),

      incrementCart: () => set((state) => ({ cartCount: state.cartCount + 1 })),

      decrementCart: () => set((state) => ({ cartCount: Math.max(0, state.cartCount - 1) })),

      addItem: (productId: string, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((item) => item.productId === productId);
          let newItems;

          if (existing) {
            newItems = state.items.map((item) =>
              item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item
            );
          } else {
            newItems = [...state.items, { productId, quantity }];
          }

          return {
            items: newItems,
            // Count distinct items (length) instead of summing quantities
            cartCount: newItems.length,
          };
        }),

      removeItem: (productId: string) =>
        set((state) => {
          const newItems = state.items.filter((item) => item.productId !== productId);
          return {
            items: newItems,
            // Count distinct items
            cartCount: newItems.length,
          };
        }),

      clearCart: () => set({ items: [], cartCount: 0 }),
    }),
    {
      name: 'bokoma-cart',
      // When rehydrating from storage, recompute cartCount from the saved items
      onRehydrateStorage: () => (state) => {
        try {
          const persisted = (state as any) || {};
          const items = persisted?.items || (persisted?.state && persisted.state.items) || [];
          const count = Array.isArray(items) ? items.length : 0;
          // update store's cartCount after rehydrate
          const store = useCartStore.getState();
          if (store && typeof store.setCartCount === 'function') {
            store.setCartCount(count);
          }
        } catch (e) {
          // ignore
        }
      },
    }
  )
);
