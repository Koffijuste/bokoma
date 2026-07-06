// hooks/useCart.ts
'use client';

import { useCallback, useEffect } from 'react';
import { useCartStore } from '@/store/cart';
import { useMutation } from './useApi';
import { cartApi } from '@/services';
import { useAuth } from './useAuth';
import type { Cart } from '@/types';

// ─────────────────────────────
// TYPES
// ─────────────────────────────
export interface AddItemPayload {
  product: string;
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
  const { isAuthenticated } = useAuth();
  const { cart, setCart, clearCart } = useCartStore();

  // ✅ cartCount calculé dynamiquement depuis cart.items
  const cartCount = cart?.items?.length || 0;

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

  // ───────── Fetch cart depuis API ─────────
  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      return null;
    }

    try {
      const response = await cartApi.getCart();

      const extractedCart = response?.data?.cart || response?.cart || response;
      setCart(extractedCart);
      return extractedCart;
    } catch {
      return null;
    }
  }, [isAuthenticated, setCart]);

  // ───────── Fetch initial quand auth change ─────────
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      setCart(null);
    }
  }, [isAuthenticated, fetchCart, setCart]);

  // ───────── Handlers ─────────
  const handleAddItem = useCallback(
    async (payload: AddItemPayload) => {
      const { product: productId, variantId, size, color, quantity = 1 } = payload;

      if (!productId || typeof productId !== 'string') {
        throw new Error('ID de produit invalide');
      }

      try {
        // ✅ ÉTAPE 1: Récupérer le panier actuel
        const cartResponse = await cartApi.getCart();
        const currentCart = cartResponse?.data?.cart || cartResponse?.cart;

        // ✅ ÉTAPE 2: Chercher si le produit existe DÉJÀ
        const existingItem = currentCart?.items?.find(item =>
          item.product?._id === productId &&
          (item.variantId === variantId) &&
          (item.size === size) &&
          (item.color === color)
        );

        let response;
        if (existingItem) {
          const newQuantity = (existingItem.quantity || 1) + quantity;
          response = await updateItemMutation.mutate({ itemId: existingItem._id, quantity: newQuantity });
        } else {
          response = await addItemMutation.mutate({ product: productId, variantId, size, color, quantity });
        }

        // ✅ ÉTAPE 3: Synchroniser le store avec la réponse
        const respCart = response?.cart || response?.data?.cart || response;
        if (respCart) {
          setCart(respCart);
        } else {
          await fetchCart();
        }

        return response;
      } catch (error) {
        throw error;
      }
    },
    [addItemMutation, updateItemMutation, setCart, fetchCart]
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      try {
        const response = await removeItemMutation.mutate(itemId);

        // ✅ Synchroniser le store
        const respCart = response?.cart || response?.data?.cart || response;
        if (respCart) {
          setCart(respCart);
        } else {
          await fetchCart();
        }

        return response;
      } catch (error) {
        throw error;
      }
    },
    [removeItemMutation, setCart, fetchCart]
  );

  const handleUpdateItem = useCallback(
    async ({ itemId, quantity }: UpdateItemParams) => {
      try {
        const response = await updateItemMutation.mutate({ itemId, quantity });

        // ✅ Synchroniser le store
        const respCart = response?.cart || response?.data?.cart || response;
        if (respCart) {
          setCart(respCart);
        } else {
          await fetchCart();
        }

        return response;
      } catch (error) {
        throw error;
      }
    },
    [updateItemMutation, setCart, fetchCart]
  );

  const handleClearCart = useCallback(async () => {
    await clearCartMutation.mutate(undefined);
    clearCart();
  }, [clearCartMutation, clearCart]);

  const handleApplyCoupon = useCallback(
    async (code: string) => {
      const response = await applyCouponMutation.mutate(code);

      const respCart = response?.cart || response?.data?.cart || response;
      if (respCart) {
        setCart(respCart);
      }

      return response;
    },
    [applyCouponMutation, setCart]
  );

  const handleRemoveCoupon = useCallback(async () => {
    const response = await removeCouponMutation.mutate(undefined);

    const respCart = response?.cart || response?.data?.cart || response;
    if (respCart) {
      setCart(respCart);
    }

    return response;
  }, [removeCouponMutation, setCart]);

  // ───────── Return ─────────
  return {
    cart,
    cartCount,
    addItem: handleAddItem,
    removeItem: handleRemoveItem,
    updateItem: handleUpdateItem,
    clearCart: handleClearCart,
    applyCoupon: handleApplyCoupon,
    removeCoupon: handleRemoveCoupon,
    fetchCart,
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
