// src/components/features/ProductCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Search, Settings, ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/utils/helpers';
import { User, type Product } from '@/types';
import { ProductCard } from '@../components/features/ProductCard';
import { PublicPageHeader } from '@/components/ui/public-page-header';


<PublicPageHeader
  title="Recherche"
  description={searchQuery ? `Résultats pour "${searchQuery}"` : "Recherchez des produits"}
  icon={<Search className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />}
  breadcrumbs={[{ label: 'Recherche' }]}
/>

interface ProductCardProps {
  product: Product;
  onAddToWishlist?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  variant?: 'default' | 'compact' | 'featured';
}

// src/components/features/ProductCard.tsx — Début du composant

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToWishlist,
  onAddToCart,
  variant = 'default',
}) => {
  // ✅ GUARD CLAUSE : Si product est undefined/null, afficher un placeholder
  if (!product) {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden p-4 text-center text-muted-foreground">
        Produit indisponible
      </div>
    );
  }

  // ✅ Récupérer l'ID avec fallback robuste
  const productId = (product as any)._id || (product as any).id || product.slug;
  if (!productId) {
    console.warn('⚠️ Product missing ID:', product);
    return null; // Ou afficher un fallback
  }
  
  const productSlug = product.slug || productId;
  
  // ✅ Image principale avec fallback
  const mainImage = (product as any).images?.[0]?.url || (product as any).mainImage;
  const placeholderImage = 'https://placehold.co/400x400/e2e8f0/64748b?text=Produit&font=montserrat';

  // ✅ Optimisation Cloudinary
  const imageUrl = mainImage?.includes('res.cloudinary.com')
    ? mainImage.replace('/upload/', '/upload/f_auto,q_auto,w_400,c_fill,g_auto/')
    : mainImage || placeholderImage;

  // ✅ Données produit avec fallbacks
  const rating = (product as any).rating?.average || 0;
  const reviewCount = (product as any).rating?.count || 0;
  const inStock = (product as any).totalStock > 0;
  const hasDiscount = (product as any).comparePrice && (product as any).comparePrice > (product as any).basePrice;
  const discountPercent = hasDiscount 
    ? Math.round((1 - (product as any).basePrice / (product as any).comparePrice) * 100) 
    : 0;

  // ✅ Catégorie (peut être string ou objet)
  const category = (product as any).category;
  const categoryName = typeof category === 'object' ? category?.name : category;
  

  // ───────── RENDER ─────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      className="group bg-card border border-border rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:border-accent/50"
    >
      {/* ───────── IMAGE ───────── */}
      <Link 
        href={`/products/${productSlug}`} 
        className="block relative aspect-square overflow-hidden bg-muted"
      >
        <img
          src={imageUrl}
          alt={(product as any).name || 'Produit'}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== placeholderImage) {
              target.src = placeholderImage;
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
          {hasDiscount && (
            <span className="px-2 py-1 text-xs font-medium bg-destructive text-destructive-foreground rounded-full shadow-sm">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Actions rapides */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full bg-background/90 hover:bg-background"
            onClick={(e) => {
              e.preventDefault();
              onAddToWishlist?.(productId);
            }}
            aria-label="Ajouter aux favoris"
          >
            <Heart className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="primary"
            className="rounded-full"
            onClick={(e) => {
              e.preventDefault();
              onAddToCart?.(productId);
            }}
            disabled={!inStock}
            aria-label="Ajouter au panier"
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
        </div>
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
            {(product as any).name || 'Produit sans nom'}
          </h3>
        </Link>

        {/* Rating */}
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

        {/* Prix */}
        <div className="flex items-center gap-2">
          <p className="text-lg font-bold text-accent">
            {formatPrice((product as any).basePrice || 0)}
          </p>
          {hasDiscount && (
            <p className="text-sm text-muted-foreground line-through">
              {formatPrice((product as any).comparePrice)}
            </p>
          )}
        </div>

        {/* Stock */}
        {!inStock && (
          <p className="text-xs text-destructive font-medium">Rupture de stock</p>
        )}
      </div>
    </motion.div>
  );
};

export default ProductCard;