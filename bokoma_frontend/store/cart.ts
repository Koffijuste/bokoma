// store/cart.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  productId: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  cartCount: number;
  setCartCount: (count: number) => void;
  incrementCart: () => void;
  decrementCart: () => void;
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      cartCount: 0,
      
      setCartCount: (count) => set({ cartCount: count }),
      
      incrementCart: () => set((state) => ({ cartCount: state.cartCount + 1 })),
      
      decrementCart: () => set((state) => ({ cartCount: Math.max(0, state.cartCount - 1) })),
      
      addItem: (productId, quantity = 1) => set((state) => {
        const existing = state.items.find(item => item.productId === productId);
        let newItems;
        
        if (existing) {
          newItems = state.items.map(item =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          newItems = [...state.items, { productId, quantity }];
        }
        
        return {
          items: newItems,
          cartCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
        };
      }),
      
      removeItem: (productId) => set((state) => {
        const newItems = state.items.filter(item => item.productId !== productId);
        return {
          items: newItems,
          cartCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
        };
      }),
      
      clearCart: () => set({ items: [], cartCount: 0 }),
    }),
    {
      name: 'bokoma-cart',
    }
  )
);