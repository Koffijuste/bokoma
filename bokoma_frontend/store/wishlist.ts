// store/wishlist.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types';

interface WishlistState {
  wishlist: Product[];
  setWishlist: (items: Product[]) => void;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  count: number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      wishlist: [],
      setWishlist: (items: Product[]) => set({ wishlist: items }),
      addItem: (product: Product) => set((state) => ({ wishlist: [...state.wishlist, product] })),
      removeItem: (productId: string) => set((state) => ({ wishlist: state.wishlist.filter(p => p._id !== productId) })),
      clear: () => set({ wishlist: [] }),
      get count() {
        return get().wishlist.length;
      },
    }),
    { name: 'bokoma-wishlist' }
  )
);

export default useWishlistStore;
