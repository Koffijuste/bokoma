// hooks/useAddToCart.ts
'use client';

import { useCallback } from 'react';
import { useCart } from './useCart';
import { useRatingPrompt } from './useRatingPrompt';
import { useRatingPromptStore } from '@/store/ratingPrompt';
import { toast } from 'sonner';
import type { Product } from '@/types';

interface AddOpts {
  product: Product;
  variantId?: string;
  size?: string;
  color?: string;
  quantity?: number;
}

/**
 * Hook unifié : ajoute au panier + déclenche la modale de notation si éligible.
 * Utilisable depuis ProductCard, page produit, wishlist, etc.
 */
export function useAddToCart() {
  const { addItem } = useCart();
  const { shouldPromptFor, markRated, markSkipped, markNever } = useRatingPrompt();
  const showPrompt = useRatingPromptStore((s) => s.show);

  const add = useCallback(
    async (opts: AddOpts) => {
      const { product, variantId, size, color, quantity = 1 } = opts;
      const productId = product._id || (product as any).id;
      const image =
        (product as any).images?.[0]?.url ||
        (typeof (product as any).images?.[0] === 'string' ? (product as any).images[0] : undefined);

      try {
        await addItem({ product: productId, variantId, size, color, quantity });

        const eligibility = shouldPromptFor(productId);
        if (eligibility.eligible) {
          showPrompt({
            _id: productId,
            name: product.name,
            image,
            rating: (product as any).rating,
          });
        }
        return { ok: true } as const;
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || "Erreur lors de l'ajout au panier";
        if (msg.includes('déjà') || msg.includes('exist')) {
          toast.info('Quantité augmentée', { description: product.name });
        } else {
          toast.error('Erreur', { description: msg });
        }
        return { ok: false, error: err } as const;
      }
    },
    [addItem, shouldPromptFor, showPrompt]
  );

  return {
    add,
    markRated,
    markSkipped,
    markNever,
  };
}
