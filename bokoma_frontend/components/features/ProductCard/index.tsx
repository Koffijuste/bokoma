// src/components/features/ProductCard.tsx
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Star, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useWishlist } from '@/hooks/useWishlist';
import { apiClient } from '@/services/api';
import { formatPrice } from '@/utils/helpers';
import { cn } from '@/utils/helpers';
import type { Product } from '@/types';

// ============================================================================
// 🔹 TYPES
// ============================================================================

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'featured';
  showQuickActions?: boolean;
  onAddToCart?: (productId: string) => void;
}

// ============================================================================
// 🔹 HELPERS
// ============================================================================

const getOptimizedImageUrl = (url: string | undefined, width = 400): string => {
  if (!url) return '/placeholder-product.jpg';
  
  if (url.includes('res.cloudinary.com')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_fill,g_auto/`);
  }
  
  return url;
};

const getProductImage = (product: Product): string => {
  const firstImage = product.images?.[0];
  if (!firstImage) return '/placeholder-product.jpg';
  
  const url = typeof firstImage === 'string' ? firstImage : firstImage.url;
  return getOptimizedImageUrl(url);
};

// ============================================================================
// 🔹 COMPOSANT PRINCIPAL
// ============================================================================

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 'default',
  showQuickActions = true,
  onAddToCart,
}) => {
  const [addingToCart, setAddingToCart] = useState(false);
  
  // ✅ Hook wishlist intégré
  const { isInWishlist, toggleWishlist } = useWishlist();

  // ✅ Guard clause
  if (!product) {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden p-4 text-center text-muted-foreground">
        Produit indisponible
      </div>
    );
  }

  // ✅ Données produit
  const productId = product._id || (product as any).id;
  const productSlug = product.slug || productId;
  const imageUrl = getProductImage(product);
  
  const rating = (product as any).rating?.average || 0;
  const reviewCount = (product as any).rating?.count || 0;
  const inStock = (product.totalStock || 0) > 0;
  const hasDiscount = (product as any).comparePrice && (product as any).comparePrice > (product.basePrice || 0);
  const discountPercent = hasDiscount 
    ? Math.round((1 - (product.basePrice || 0) / ((product as any).comparePrice || 1)) * 100) 
    : 0;

  const category = (product as any).category;
  const categoryName = typeof category === 'object' ? category?.name : category;
  
  const isWishlisted = isInWishlist(productId);

  // ============================================================================
  // 🔹 HANDLERS
  // ============================================================================

  const handleToggleWishlist = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!productId) return;

    const success = await toggleWishlist(productId);
    if (success) {
      toast.success(
        isWishlisted 
          ? `${product.name} retiré des favoris`
          : `${product.name} ajouté aux favoris`
      );
    } else {
      toast.error('Action impossible. Veuillez vous connecter.');
    }
  }, [productId, product.name, isWishlisted, toggleWishlist]);

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!productId || !inStock) return;

    // ✅ Callback custom si fourni
    if (onAddToCart) {
      onAddToCart(productId);
      return;
    }

    setAddingToCart(true);

    try {
      await apiClient.post('/cart/items', {
        product: productId,
        quantity: 1,
      });
      toast.success(`${product.name} ajouté au panier`);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Erreur lors de l\'ajout au panier';
      toast.error(message);
    } finally {
      setAddingToCart(false);
    }
  }, [productId, product.name, inStock, onAddToCart]);

  // ============================================================================
  // 🔹 VARIANTS STYLES
  // ============================================================================

  const variantClasses = useMemo(() => {
    switch (variant) {
      case 'compact':
        return 'text-sm';
      case 'featured':
        return 'shadow-lg';
      default:
        return '';
    }
  }, [variant]);

  // ============================================================================
  // 🔹 RENDER
  // ============================================================================

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      className={cn(
        'group bg-card border border-border rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:border-accent/50',
        variantClasses
      )}
    >
      {/* ───────── IMAGE ───────── */}
      <Link 
        href={`/products/${productSlug}`} 
        className="block relative aspect-square overflow-hidden bg-muted"
      >
        <img
          src={imageUrl}
          alt={product.name || 'Produit'}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== '/placeholder-product.jpg') {
              target.src = '/placeholder-product.jpg';
            }
          }}
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {(product as any).isNewProduct && (
            <span className="px-2 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-full shadow-sm">
              Nouveau
            </span>
          )}
          {hasDiscount && discountPercent > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-destructive text-destructive-foreground rounded-full shadow-sm">
              -{discountPercent}%
            </span>
          )}
          {!inStock && (
            <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full shadow-sm">
              Rupture
            </span>
          )}
        </div>

        {/* ✅ Bouton cœur (wishlist) - toujours visible */}
        {showQuickActions && (
          <button
            onClick={handleToggleWishlist}
            className={cn(
              'absolute top-3 right-3 p-2 rounded-full transition-all shadow-sm hover:scale-110',
              isWishlisted
                ? 'bg-pink-500 text-white'
                : 'bg-background/90 hover:bg-background text-muted-foreground hover:text-pink-500'
            )}
            aria-label={isWishlisted ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={cn('w-4 h-4', isWishlisted && 'fill-current')} />
          </button>
        )}

        {/* Actions rapides au hover */}
        {showQuickActions && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full bg-background/90 hover:bg-background hover:scale-110 transition-transform"
              asChild
            >
              <Link href={`/products/${productSlug}`} aria-label="Voir le produit">
                <Eye className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              size="icon"
              variant="primary"
              className="rounded-full hover:scale-110 transition-transform"
              onClick={handleAddToCart}
              disabled={!inStock || addingToCart}
              aria-label="Ajouter au panier"
            >
              {addingToCart ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShoppingCart className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </Link>

      {/* ───────── CONTENT ───────── */}
      <div className="p-4 space-y-3">
        {/* Catégorie & Marque */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{categoryName || 'Catégorie'}</span>
          {(product as any).brand && <span className="truncate">{(product as any).brand}</span>}
        </div>

        {/* Nom du produit */}
        <Link href={`/products/${productSlug}`} className="block">
          <h3 className="font-semibold line-clamp-2 hover:text-accent transition min-h-[2.5rem]">
            {product.name || 'Produit sans nom'}
          </h3>
        </Link>

        {/* Rating */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="w-3.5 h-3.5"
                fill={i < Math.floor(rating) ? '#fbbf24' : 'none'}
                color={i < Math.floor(rating) ? '#fbbf24' : '#6b7280'}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              ({reviewCount})
            </span>
          </div>
        )}

        {/* Prix */}
        <div className="flex items-center gap-2">
          <p className="text-lg font-bold text-accent">
            {formatPrice(product.basePrice || 0)}
          </p>
          {hasDiscount && (product as any).comparePrice && (
            <p className="text-sm text-muted-foreground line-through">
              {formatPrice((product as any).comparePrice)}
            </p>
          )}
        </div>

        {/* Stock */}
        {!inStock && (
          <p className="text-xs text-destructive font-medium">Rupture de stock</p>
        )}

        {/* ✅ Bouton Ajouter au panier (visible) */}
        {variant !== 'compact' && (
          <Button
            size="sm"
            variant={inStock ? 'primary' : 'outline'}
            onClick={handleAddToCart}
            disabled={!inStock || addingToCart}
            className="w-full gap-2"
          >
            {addingToCart ? (
              <><Loader2 className="w-3 h-3 animate-spin" />Ajout...</>
            ) : inStock ? (
              <><ShoppingCart className="w-3 h-3" /> Ajouter au panier</>
            ) : (
              'Indisponible'
            )}
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default ProductCard;