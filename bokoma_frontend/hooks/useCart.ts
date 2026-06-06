// hooks/useCart.ts
'use client';

import { useCallback } from 'react';
import { useCartStore } from '@/store';
import { useMutation } from './useApi';
import { cartApi, type CartItemOptions } from '@/services';
import type { Cart } from '@/types';

// ─────────────────────────────
// TYPES
// ─────────────────────────────
export interface AddItemPayload {
  product: string;           // ✅ ObjectId du produit (requis)
  variantId?: string;
  size?: string;
  color?: string;
  quantity?: number;
}

interface UpdateItemParams {
  itemId: string;
  quantity: number;
}

// ─────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────
export function useCart() {
  const { cartCount, setCartCount, incrementCart, decrementCart, resetCart } = useCartStore();

  // ───────── Mutations API ─────────
  const addItemMutation = useMutation<Cart, AddItemPayload>(
    (payload) => cartApi.addItem(payload.product, {
      variantId: payload.variantId,
      size: payload.size,
      color: payload.color,
      quantity: payload.quantity,
    })
  );

  const removeItemMutation = useMutation<Cart, string>(
    (itemId) => cartApi.removeItem(itemId)
  );

  const updateItemMutation = useMutation<Cart, UpdateItemParams>(
    ({ itemId, quantity }) => cartApi.updateItem(itemId, quantity)
  );

  const clearCartMutation = useMutation<Cart, void>(
    () => cartApi.clearCart()
  );

  const applyCouponMutation = useMutation<Cart, string>(
    (code) => cartApi.applyCoupon(code)
  );

  const removeCouponMutation = useMutation<Cart, void>(
    () => cartApi.removeCoupon()
  );

  // ───────── Handlers ─────────
  const handleAddItem = useCallback(
    async (payload: AddItemPayload) => {
      const { product: productId, variantId, size, color, quantity = 1 } = payload;
      
      if (!productId || typeof productId !== 'string') {
        console.error('❌ Invalid product ID:', { received: productId, type: typeof productId });
        throw new Error('ID de produit invalide');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🛒 Adding to cart:', { productId, variantId, size, quantity });
      }

      const response = await addItemMutation.mutate({ product: productId, variantId, size, color, quantity });
      
      // ✅ Synchroniser le store avec la réponse du backend
      if (response?.cart?.itemCount !== undefined) {
        setCartCount(response.cart.itemCount);
      } else {
        incrementCart(); // Fallback
      }
      
      return response;
    },
    [addItemMutation, setCartCount, incrementCart]
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      const response = await removeItemMutation.mutate(itemId);
      
      // ✅ Synchroniser avec le backend
      if (response?.cart?.itemCount !== undefined) {
        setCartCount(response.cart.itemCount);
      } else {
        decrementCart(); // Fallback
      }
      
      return response;
    },
    [removeItemMutation, setCartCount, decrementCart]
  );

  const handleUpdateItem = useCallback(
    async ({ itemId, quantity }: UpdateItemParams) => {
      return await updateItemMutation.mutate({ itemId, quantity });
      // Pas de mise à jour du count car la quantité change, pas le nombre d'items
    },
    [updateItemMutation]
  );

  const handleClearCart = useCallback(async () => {
    await clearCartMutation.mutate(undefined);
    resetCart();
  }, [clearCartMutation, resetCart]);

  const handleApplyCoupon = useCallback(
    async (code: string) => {
      return await applyCouponMutation.mutate(code);
    },
    [applyCouponMutation]
  );

  const handleRemoveCoupon = useCallback(async () => {
    return await removeCouponMutation.mutate(undefined);
  }, [removeCouponMutation]);

  // ───────── Return ─────────
  return {
    cartCount,
    setCartCount,
    addItem: handleAddItem,
    removeItem: handleRemoveItem,
    updateItem: handleUpdateItem,
    clearCart: handleClearCart,
    applyCoupon: handleApplyCoupon,
    removeCoupon: handleRemoveCoupon,
    isLoading:
      addItemMutation.loading ||
      removeItemMutation.loading ||
      updateItemMutation.loading ||
      clearCartMutation.loading ||
      applyCouponMutation.loading,
    error:
      addItemMutation.error ||
      removeItemMutation.error ||
      updateItemMutation.error,
  };
}