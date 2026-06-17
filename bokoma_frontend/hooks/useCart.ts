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

      try {
        // ✅ ÉTAPE 1: Récupérer le panier actuel pour vérifier les doublons
        const cartResponse = await cartApi.getCart();
        const currentCart = cartResponse?.data?.cart || cartResponse?.cart;
        
        // ✅ ÉTAPE 2: Chercher si le produit existe DÉJÀ avec la même configuration
        const existingItem = currentCart?.items?.find(item => 
          item.product?._id === productId && 
          (item.variantId === variantId) &&
          (item.size === size) &&
          (item.color === color)
        );

        let response;
        if (existingItem) {
          // ✅ ÉTAPE 3A: Si existe, incrémenter la quantité
          if (process.env.NODE_ENV === 'development') {
            console.log('📦 Produit déjà dans le panier, augmentation de la quantité');
          }
          const newQuantity = (existingItem.quantity || 1) + quantity;
          response = await updateItemMutation.mutate({ itemId: existingItem._id, quantity: newQuantity });
        } else {
          // ✅ ÉTAPE 3B: Si n'existe pas, ajouter comme nouvel item
          if (process.env.NODE_ENV === 'development') {
            console.log('✨ Nouveau produit ajouté au panier');
          }
          response = await addItemMutation.mutate({ product: productId, variantId, size, color, quantity });
        }
        
        // ✅ ÉTAPE 4: Synchroniser le store avec la réponse du backend
        // Le backend peut retourner `itemCount` (somme des quantités) —
        // nous préférons compter les items distincts via `cart.items.length`.
        const respCart = response?.cart || response?.data?.cart;
        if (respCart) {
          const distinctCount = Array.isArray(respCart.items) ? respCart.items.length : respCart.itemCount ?? currentCart?.items?.length ?? cartCount;
          setCartCount(distinctCount);
        } else {
          // Si l'item existait déjà, on n'ajoute pas un nouvel item distinct
          if (existingItem) {
            setCartCount(currentCart?.items?.length ?? cartCount);
          } else {
            incrementCart(); // Fallback pour nouvel item
          }
        }
        
        return response;
      } catch (error) {
        console.error('❌ Error in handleAddItem:', error);
        throw error;
      }
    },
    [addItemMutation, updateItemMutation, setCartCount, incrementCart]
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      const response = await removeItemMutation.mutate(itemId);
      
      // ✅ Synchroniser avec le backend (préférer nombre d'items distincts)
      const respCart = response?.cart || response?.data?.cart;
      if (respCart) {
        const distinctCount = Array.isArray(respCart.items) ? respCart.items.length : respCart.itemCount ?? Math.max(0, (cartCount - 1));
        setCartCount(distinctCount);
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