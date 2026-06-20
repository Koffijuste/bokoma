// app/(public)/products/[slug]/page.tsx
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, ShoppingCart, Star, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useFetch } from '@/hooks';
import { productApi } from '@/services';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { formatPrice } from '@/utils/helpers';
import { toast } from 'sonner';
import type { Product } from '@/types';

// ─────────────────────────────
// 🔁 HELPER : Extrait le produit de n'importe quelle réponse API
// ─────────────────────────────
const extractProduct = (data: any): Product | null => {
  if (!data) return null;
  if (data.product && typeof data.product === 'object') return data.product;
  if (data.data && (data.data._id || data.data.id)) return data.data;
  if (data._id || data.id) return data;
  return null;
};

// ─────────────────────────────
// CONFIGURATION
// ─────────────────────────────
const AVAILABLE_SIZES = Array.from({ length: 21 }, (_, i) => (25 + i).toString());
const PLACEHOLDER_IMAGE = 'https://placehold.co/800x800/e2e8f0/64748b?text=Produit&font=montserrat';

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  
  // États
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Fetch produit
  const { data: apiResponse, loading, error, refetch } = useFetch<any>(
    () => productApi.getProduct(slug),
    [slug]
  );

  // ✅ Extraction robuste du produit
  const product = useMemo(() => extractProduct(apiResponse), [apiResponse]);

  // ✅ Récupérer l'ID du produit
  const productId = product?._id || (product as any)?.id;

  // ✅ Vérifier si le produit est dans la wishlist
  const wishlisted = useMemo(() => {
    if (!productId) return false;
    return isInWishlist(productId);
  }, [productId, isInWishlist]);

  // 🔍 Debug en dev
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && product) {
      console.group('✅ [PRODUCT DETAILS] Produit chargé');
      console.log('📦 ID:', productId);
      console.log('📝 Nom:', product.name);
      console.log('💰 Prix:', product.basePrice);
      console.log('🖼️ Images:', product.images?.length || 0);
      console.log('❤️ Dans wishlist:', wishlisted);
      console.log('👤 Authentifié:', isAuthenticated);
      console.groupEnd();
    }
  }, [product, productId, wishlisted, isAuthenticated]);

  // Image principale optimisée Cloudinary
  const currentImage = useMemo(() => {
    if (!product?.images?.length) return null;
    const img = product.images[selectedImage] || product.images[0];
    if (!img?.url) return null;
    if (img.url.includes('res.cloudinary.com')) {
      return img.url.replace('/upload/', '/upload/f_auto,q_auto,w_800,c_fill,g_auto/');
    }
    return img.url;
  }, [product?.images, selectedImage]);

  // ───────── ACTIONS ─────────

  const handleAddToCart = useCallback(async () => {
    console.group('🛒 [PRODUCT DETAILS] Ajout au panier');
    console.log('📦 Produit:', product?.name);
    console.log('🆔 ID:', productId);
    console.log('📏 Taille:', selectedSize);
    console.log('🔢 Quantité:', quantity);
    
    if (!productId) {
      console.error('❌ Product ID missing:', { product, apiResponse });
      toast.error('Produit non chargé correctement');
      console.groupEnd();
      return;
    }

    // ✅ Validation pointure
    const hasSizeVariants = product.variants?.some((v: any) => v.size);
    if (hasSizeVariants && !selectedSize) {
      toast.error('Veuillez sélectionner une pointure');
      console.log('⚠️ Pointure non sélectionnée');
      console.groupEnd();
      return;
    }

    setIsAdding(true);
    try {
      console.log('🔄 Appel de addItem...');
      await addItem({
        product: productId,
        size: selectedSize || undefined,
        quantity,
      });
      console.log('✅ Produit ajouté au panier');
      toast.success('Produit ajouté au panier 🛒');
    } catch (err: any) {
      console.error('❌ Add to cart error:', err);
      const message = err?.response?.data?.message || err?.message || 'Impossible d\'ajouter au panier';
      
      // Vérifier si c'est une erreur "produit déjà existant"
      if (message.includes('déjà') || message.includes('exist')) {
        console.log('ℹ️ Produit déjà dans le panier, quantité augmentée');
        toast.info('Quantité augmentée dans le panier');
      } else {
        toast.error(message);
      }
    } finally {
      setIsAdding(false);
      console.groupEnd();
    }
  }, [product, productId, selectedSize, quantity, addItem, apiResponse]);

  // ✅ CORRECTION CRITIQUE : Utiliser le hook useWishlist avec gestion authentification
  const handleWishlist = useCallback(async () => {
    console.group('❤️ [PRODUCT DETAILS] Toggle wishlist');
    console.log('📦 Produit:', product?.name);
    console.log('🆔 ID:', productId);
    console.log('👤 isAuthenticated:', isAuthenticated);
    
    if (!productId) {
      console.error('❌ Product ID manquant');
      toast.error('Produit non chargé');
      console.groupEnd();
      return;
    }

    if (!isAuthenticated) {
      console.log('🔒 Utilisateur non authentifié');
      toast.error('Veuillez vous connecter pour ajouter aux favoris');
      router.push(`/auth/login?from=/products/${slug}`);
      console.groupEnd();
      return;
    }

    const wasInWishlist = isInWishlist(productId);
    console.log('📊 État actuel:', wasInWishlist);
    console.log('🎯 Action prévue:', wasInWishlist ? 'RETIRER' : 'AJOUTER');
    
    try {
      console.log('🔄 Appel de toggleWishlist...');
      const success = await toggleWishlist(productId, product || undefined);
      console.log('✅ toggleWishlist terminé, succès:', success);
      
      if (success) {
        // ✅ Message basé sur l'état AVANT le toggle
        if (wasInWishlist) {
          toast.success('Retiré des favoris');
          console.log('✅ Message: Retiré des favoris');
        } else {
          toast.success('Ajouté aux favoris ❤️');
          console.log('✅ Message: Ajouté aux favoris');
        }
      } else {
        console.error('❌ Échec du toggle');
        toast.error('Erreur lors de la mise à jour des favoris');
      }
    } catch (error) {
      console.error('❌ Erreur toggleWishlist:', error);
      toast.error('Erreur lors de la mise à jour des favoris');
    }
    
    console.groupEnd();
  }, [productId, product, isAuthenticated, toggleWishlist, isInWishlist, router, slug]);

  const handleQuantityChange = useCallback((delta: number) => {
    setQuantity((prev) => {
      const newQty = Math.max(1, Math.min(prev + delta, product?.totalStock || 10));
      console.log('🔢 Quantité changée:', prev, '->', newQty);
      return newQty;
    });
  }, [product?.totalStock]);

  const handleBack = useCallback(() => {
    console.log('⬅️ Retour aux produits');
    router.push(ROUTES.PRODUCTS);
  }, [router]);

  // ───────── RENDER STATES ─────────

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-12 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 text-accent animate-spin mx-auto" />
          <p className="text-muted-foreground">Chargement du produit...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('❌ Erreur de chargement:', error);
    return (
      <div className="min-h-screen px-4 py-12 flex items-center justify-center">
        <div className="max-w-md w-full rounded-3xl border border-destructive/50 bg-destructive/10 p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-destructive">Erreur de chargement</h2>
          <p className="text-muted-foreground">{error.message}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => refetch()} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Réessayer
            </Button>
            <Button variant="outline" onClick={handleBack}>Retour</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    console.warn('⚠️ Produit introuvable après chargement');
    return (
      <div className="min-h-screen px-4 py-12 flex items-center justify-center">
        <div className="max-w-md w-full rounded-3xl border border-border bg-card p-12 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">Produit introuvable</h2>
          <p className="text-muted-foreground">Ce produit n'existe pas ou a été supprimé.</p>
          <Button variant="outline" onClick={handleBack}>Retour aux produits</Button>
        </div>
      </div>
    );
  }

  // ───────── MAIN RENDER ─────────
  const hasSizeVariants = product.variants?.some((v: any) => v.size);
  const categoryName = typeof product.category === 'object' ? product.category?.name : 'Catégorie';

  console.log('🎨 [PRODUCT DETAILS] Rendu de la page pour:', product.name);

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between gap-4"
        >
          <button
            onClick={handleBack}
            className="text-sm font-medium text-accent hover:text-accent/80 inline-flex items-center transition"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux produits
          </button>
          <span className="text-sm text-muted-foreground">{categoryName}</span>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          
          {/* ───────── IMAGE GALLERY ───────── */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6">
              {/* Image principale */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative aspect-square overflow-hidden rounded-3xl bg-muted"
                >
                  <img
                    src={currentImage || PLACEHOLDER_IMAGE}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                    loading="eager"
                    onError={(e) => {
                      console.warn('⚠️ Erreur chargement image:', currentImage);
                      const t = e.target as HTMLImageElement;
                      if (t.src !== PLACEHOLDER_IMAGE) t.src = PLACEHOLDER_IMAGE;
                    }}
                  />
                </motion.div>
              </AnimatePresence>

              {/* Miniatures */}
              {product.images && product.images.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {product.images.map((img, idx) => {
                    const thumb = img.url?.includes('res.cloudinary.com')
                      ? img.url.replace('/upload/', '/upload/f_auto,q_auto,w_200,h_200,c_fill/')
                      : img.url;
                    const isSelected = idx === selectedImage;
                    
                    return (
                      <motion.button
                        key={img.url || idx}
                        type="button"
                        onClick={() => {
                          console.log('🖼️ Sélection image:', idx);
                          setSelectedImage(idx);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`overflow-hidden rounded-3xl border p-1 transition ${
                          isSelected 
                            ? 'border-accent ring-2 ring-accent/20' 
                            : 'border-border hover:border-accent/50'
                        }`}
                      >
                        <div className="relative h-24 w-full bg-muted">
                          <img
                            src={thumb || PLACEHOLDER_IMAGE}
                            alt={img.alt || product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ───────── PRODUCT INFO ───────── */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              
              {/* Titre & Wishlist */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold">{product.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {product.type} · {product.brand || 'Marque premium'}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleWishlist}
                  className={`rounded-full border p-3 transition ${
                    wishlisted 
                      ? 'border-pink-500 bg-pink-500 text-white hover:bg-pink-600' 
                      : 'border-border bg-background text-accent hover:border-accent'
                  }`}
                  aria-label={wishlisted ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <Heart className="h-5 w-5" fill={wishlisted ? 'currentColor' : 'none'} />
                </motion.button>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => {
                    const rating = product.rating?.average || 0;
                    const isFilled = i < Math.floor(rating);
                    return (
                      <Star
                        key={i}
                        className="h-4 w-4"
                        fill={isFilled ? 'currentColor' : 'none'}
                        color={isFilled ? '#fbbf24' : '#6b7280'}
                      />
                    );
                  })}
                </div>
                <span className="text-muted-foreground">
                  ({product.rating?.count || 0} avis)
                </span>
              </div>

              {/* Prix */}
              <div className="space-y-1">
                <p className="text-3xl font-bold text-accent">
                  {formatPrice(Number(product.basePrice) || 0)}
                </p>
                {product.comparePrice && product.comparePrice > product.basePrice && (
                  <p className="text-sm text-muted-foreground line-through">
                    {formatPrice(product.comparePrice)}
                  </p>
                )}
              </div>

              {/* Stock */}
              <motion.span 
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm ${
                  product.totalStock > 0 
                    ? 'bg-emerald-500/10 text-emerald-600' 
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${product.totalStock > 0 ? 'bg-emerald-600' : 'bg-destructive'}`} />
                {product.totalStock > 0 ? `${product.totalStock} en stock` : 'Rupture de stock'}
              </motion.span>

              {/* Pointures */}
              {hasSizeVariants && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <label className="text-sm font-medium">
                    Pointure <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {AVAILABLE_SIZES.map((size) => {
                      const variant = product.variants?.find((v: any) => v.size === size);
                      const inStock = variant?.stock > 0;
                      const isSelected = selectedSize === size;
                      
                      return (
                        <motion.button
                          key={size}
                          type="button"
                          whileHover={inStock ? { scale: 1.05 } : {}}
                          whileTap={inStock ? { scale: 0.95 } : {}}
                          onClick={() => {
                            if (inStock) {
                              console.log('📏 Pointure sélectionnée:', size);
                              setSelectedSize(size);
                            }
                          }}
                          disabled={!inStock}
                          className={`
                            relative h-10 rounded-lg border text-sm font-medium transition
                            ${isSelected 
                              ? 'border-accent bg-accent/10 text-accent ring-2 ring-accent/20' 
                              : inStock
                                ? 'border-border bg-background hover:border-accent/50'
                                : 'border-border/50 bg-muted/50 text-muted-foreground cursor-not-allowed line-through'
                            }
                          `}
                        >
                          {size}
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                              >
                                <Check className="absolute -top-1 -right-1 h-4 w-4 text-accent bg-background rounded-full" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Quantité */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Quantité</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="h-8 w-8"
                  >
                    −
                  </Button>
                  <span className="w-8 text-center font-medium">{quantity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= (product.totalStock || 10)}
                    className="h-8 w-8"
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Description */}
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium mb-2">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {product.description || 'Aucune description disponible.'}
                </p>
              </div>

              {/* Boutons */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button
                    onClick={handleAddToCart}
                    className="w-full h-12 text-base"
                    disabled={product.totalStock === 0 || (hasSizeVariants && !selectedSize) || isAdding}
                  >
                    {isAdding ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <ShoppingCart className="mr-2 h-5 w-5" />
                    )}
                    {product.totalStock === 0 
                      ? 'Rupture de stock' 
                      : hasSizeVariants && !selectedSize 
                        ? 'Sélectionnez une pointure' 
                        : isAdding
                          ? 'Ajout en cours...'
                          : `Ajouter au panier — ${formatPrice((product.basePrice || 0) * quantity)}`
                    }
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}