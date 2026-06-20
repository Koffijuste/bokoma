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
      console.log('⚠️ [useCart] Non authentifié, reset cart');
      setCart(null);
      return null;
    }

    try {
      console.log('🌐 [useCart] Fetch cart...');
      const response = await cartApi.getCart();
      
      const extractedCart = response?.data?.cart || response?.cart || response;
      console.log('✅ [useCart] Cart récupéré:', extractedCart?.items?.length || 0, 'items');
      
      setCart(extractedCart);
      return extractedCart;
    } catch (err: any) {
      console.error('❌ [useCart] Failed to fetch cart:', err);
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
      
      console.group('🛒 [useCart] Ajout au panier');
      console.log('📦 Product ID:', productId);
      console.log('📏 Size:', size);
      console.log('🔢 Quantity:', quantity);
      
      if (!productId || typeof productId !== 'string') {
        console.error('❌ Invalid product ID');
        console.groupEnd();
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
          console.log('📦 Produit déjà dans le panier, augmentation de la quantité');
          const newQuantity = (existingItem.quantity || 1) + quantity;
          response = await updateItemMutation.mutate({ itemId: existingItem._id, quantity: newQuantity });
        } else {
          console.log('✨ Nouveau produit ajouté au panier');
          response = await addItemMutation.mutate({ product: productId, variantId, size, color, quantity });
        }
        
        // ✅ ÉTAPE 3: Synchroniser le store avec la réponse
        const respCart = response?.cart || response?.data?.cart || response;
        if (respCart) {
          console.log('🔄 Mise à jour du store avec la réponse API');
          setCart(respCart);
        } else {
          console.log('🔄 Refetch du cart complet');
          await fetchCart();
        }
        
        console.log('✅ Ajout terminé');
        console.groupEnd();
        return response;
      } catch (error) {
        console.error('❌ Error in handleAddItem:', error);
        console.groupEnd();
        throw error;
      }
    },
    [addItemMutation, updateItemMutation, setCart, fetchCart]
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      console.group('🗑️ [useCart] Suppression du panier');
      console.log('🆔 Item ID:', itemId);
      
      try {
        const response = await removeItemMutation.mutate(itemId);
        
        // ✅ Synchroniser le store
        const respCart = response?.cart || response?.data?.cart || response;
        if (respCart) {
          console.log('🔄 Mise à jour du store après suppression');
          setCart(respCart);
        } else {
          console.log('🔄 Refetch du cart complet');
          await fetchCart();
        }
        
        console.log('✅ Suppression terminée');
        console.groupEnd();
        return response;
      } catch (error) {
        console.error('❌ Error in handleRemoveItem:', error);
        console.groupEnd();
        throw error;
      }
    },
    [removeItemMutation, setCart, fetchCart]
  );

  const handleUpdateItem = useCallback(
    async ({ itemId, quantity }: UpdateItemParams) => {
      console.group('🔄 [useCart] Mise à jour quantité');
      console.log('🆔 Item ID:', itemId);
      console.log('🔢 Nouvelle quantité:', quantity);
      
      try {
        const response = await updateItemMutation.mutate({ itemId, quantity });
        
        // ✅ Synchroniser le store
        const respCart = response?.cart || response?.data?.cart || response;
        if (respCart) {
          console.log('🔄 Mise à jour du store');
          setCart(respCart);
        } else {
          console.log('🔄 Refetch du cart complet');
          await fetchCart();
        }
        
        console.log('✅ Mise à jour terminée');
        console.groupEnd();
        return response;
      } catch (error) {
        console.error('❌ Error in handleUpdateItem:', error);
        console.groupEnd();
        throw error;
      }
    },
    [updateItemMutation, setCart, fetchCart]
  );

  const handleClearCart = useCallback(async () => {
    console.log('🗑️ [useCart] Clear cart');
    await clearCartMutation.mutate(undefined);
    clearCart();
  }, [clearCartMutation, clearCart]);

  const handleApplyCoupon = useCallback(
    async (code: string) => {
      console.log('🎟️ [useCart] Apply coupon:', code);
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
    console.log('🗑️ [useCart] Remove coupon');
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