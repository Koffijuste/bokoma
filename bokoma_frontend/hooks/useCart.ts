// hooks/useCart.ts
'use client';

import { useCallback, useEffect } from 'react';
import { useCartStore } from '@/store/cart';
import { useMutation } from './useApi';
import { cartApi } from '@/services';
import { useAuth } from './useAuth';
import type { Cart, ApiResponse } from '@/types';

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

type CartResponse = ApiResponse<{ cart: Cart }>;
type CartWithDiscountResponse = ApiResponse<{ cart: Cart; discount: number }>;

const extractCart = (response: any): Cart | null => {
  if (!response) return null;
  if (response.data?.cart) return response.data.cart;
  if (response.cart) return response.cart;
  if (response.items) return response as Cart;
  return null;
};

export function useCart() {
  const { isAuthenticated } = useAuth();
  const { cart, setCart, clearCart } = useCartStore();

  const cartCount = cart?.items?.length || 0;

  const addItemMutation = useMutation<CartResponse, AddItemPayload>(
    (payload) => cartApi.addItem(payload.product, {
      variantId: payload.variantId,
      size: payload.size,
      color: payload.color,
      quantity: payload.quantity,
    }) as Promise<CartResponse>
  );

  const removeItemMutation = useMutation<CartResponse, string>(
    (itemId) => cartApi.removeItem(itemId) as Promise<CartResponse>
  );

  const updateItemMutation = useMutation<CartResponse, UpdateItemParams>(
    ({ itemId, quantity }) => cartApi.updateItem(itemId, quantity) as Promise<CartResponse>
  );

  const clearCartMutation = useMutation<ApiResponse, void>(
    () => cartApi.clearCart() as Promise<ApiResponse>
  );

  const applyCouponMutation = useMutation<CartWithDiscountResponse, string>(
    (code) => cartApi.applyCoupon(code) as Promise<CartWithDiscountResponse>
  );

  const removeCouponMutation = useMutation<CartResponse, void>(
    () => cartApi.removeCoupon() as Promise<CartResponse>
  );

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      return null;
    }

    try {
      const response: any = await cartApi.getCart();
      const extracted = extractCart(response);
      if (extracted) setCart(extracted);
      return extracted;
    } catch {
      return null;
    }
  }, [isAuthenticated, setCart]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      setCart(null);
    }
  }, [isAuthenticated, fetchCart, setCart]);

  const handleAddItem = useCallback(
    async (payload: AddItemPayload) => {
      const { product: productId, variantId, size, color, quantity = 1 } = payload;

      if (!productId || typeof productId !== 'string') {
        throw new Error('ID de produit invalide');
      }

      try {
        const cartResponse: any = await cartApi.getCart();
        const currentCart = extractCart(cartResponse);

        const existingItem = currentCart?.items?.find((item: any) => {
          const itemProductId = typeof item.product === 'string' ? item.product : item.product?._id;
          return itemProductId === productId
            && (item.variantId ?? undefined) === (variantId ?? undefined)
            && (item.size ?? undefined) === (size ?? undefined)
            && (item.color ?? undefined) === (color ?? undefined);
        });

        let response: any;
        if (existingItem) {
          const newQuantity = (existingItem.quantity || 1) + quantity;
          response = await updateItemMutation.mutate({ itemId: existingItem._id, quantity: newQuantity });
        } else {
          response = await addItemMutation.mutate({ product: productId, variantId, size, color, quantity });
        }

        const respCart = extractCart(response);
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
        const response: any = await removeItemMutation.mutate(itemId);
        const respCart = extractCart(response);
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
        const response: any = await updateItemMutation.mutate({ itemId, quantity });
        const respCart = extractCart(response);
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
      const response: any = await applyCouponMutation.mutate(code);
      const respCart = extractCart(response);
      if (respCart) {
        setCart(respCart);
      }
      return response;
    },
    [applyCouponMutation, setCart]
  );

  const handleRemoveCoupon = useCallback(async () => {
    const response: any = await removeCouponMutation.mutate(undefined);
    const respCart = extractCart(response);
    if (respCart) {
      setCart(respCart);
    }
    return response;
  }, [removeCouponMutation, setCart]);

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
