// src/components/features/ProductCard.tsx
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingCart, Star, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useWishlist } from '@/hooks/useWishlist';
import { useAddToCart } from '@/hooks/useAddToCart';
import { formatPrice, cn } from '@/utils/helpers';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'featured';
  showQuickActions?: boolean;
  onAddToCart?: (product: Product) => void;
}

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

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  variant = 'default',
  showQuickActions = true,
  onAddToCart,
}) => {
  const [addingToCart, setAddingToCart] = useState(false);
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { add: addToCartWithPrompt } = useAddToCart();
  const router = useRouter();

  if (!product) {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden p-4 text-center text-muted-foreground">
        Produit indisponible
      </div>
    );
  }

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

  const handleToggleWishlist = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!productId) return;

    const success = await toggleWishlist(productId, product);
    if (success) {
      toast.success(
        isWishlisted 
          ? `${product.name} retiré des favoris`
          : `${product.name} ajouté aux favoris`
      );
    } else {
      toast.error('Action impossible. Veuillez vous connecter.');
    }
  }, [productId, product.name, isWishlisted, toggleWishlist, product]);

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!productId || !inStock) return;

    if (onAddToCart) {
      onAddToCart(product);
      return;
    }

    setAddingToCart(true);
    try {
      const res = await addToCartWithPrompt({ product, quantity: 1 });
      if (res.ok) {
        toast.success(`${product.name} ajouté au panier`);
      }
    } finally {
      setAddingToCart(false);
    }
  }, [productId, product, inStock, onAddToCart, addToCartWithPrompt]);

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

  return (
    <div
      className={cn(
        'group bg-card border border-border rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:border-accent/50 hover:-translate-y-1 duration-300 animate-in fade-in slide-in-from-bottom-4',
        variantClasses
      )}
    >
      <div className="relative">
        <Link
          href={`/products/${productSlug}`}
          className="block aspect-square overflow-hidden bg-muted"
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
        </Link>

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

        {showQuickActions && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full bg-background/90 hover:bg-background hover:scale-110 transition-transform"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/products/${productSlug}`);
              }}
              aria-label="Voir le produit"
            >
              <Eye className="w-4 h-4" />
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
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{categoryName || 'Catégorie'}</span>
          {(product as any).brand && <span className="truncate">{(product as any).brand}</span>}
        </div>

        <Link href={`/products/${productSlug}`} className="block">
          <h3 className="font-semibold line-clamp-2 hover:text-accent transition min-h-[2.5rem]">
            {product.name || 'Produit sans nom'}
          </h3>
        </Link>

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

        {!inStock && (
          <p className="text-xs text-destructive font-medium">Rupture de stock</p>
        )}

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
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;