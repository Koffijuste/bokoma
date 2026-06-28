// store/product.ts
// ============================================================================
// 🛍️ PRODUCT STORE — Gestion de l'état des produits (filtres, tri, cache)
// ============================================================================

import { create } from 'zustand';
import type { Product } from '@/types';

export type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'popular' | 'rating';

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy: SortOption;
  inStock?: boolean;
  onSale?: boolean;
}

interface ProductState {
  // Cache des produits
  products: Product[];
  currentProduct: Product | null;
  
  // Filtres et tri
  filters: ProductFilters;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  viewMode: 'grid' | 'list';
  
  // Actions
  setProducts: (products: Product[]) => void;
  setCurrentProduct: (product: Product | null) => void;
  setFilters: (filters: Partial<ProductFilters>) => void;
  resetFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  clearCache: () => void;
}

const DEFAULT_FILTERS: ProductFilters = {
  sortBy: 'newest',
};

export const useProductStore = create<ProductState>()((set) => ({
  products: [],
  currentProduct: null,
  filters: DEFAULT_FILTERS,
  isLoading: false,
  error: null,
  viewMode: 'grid',

  setProducts: (products) => set({ products }),
  
  setCurrentProduct: (product) => set({ currentProduct: product }),
  
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  clearCache: () =>
    set({
      products: [],
      currentProduct: null,
      error: null,
    }),
}));