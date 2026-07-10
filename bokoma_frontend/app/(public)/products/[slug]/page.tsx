// app/(public)/products/[slug]/page.tsx
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Heart, ShoppingCart, Star, Check, AlertCircle, Loader2,
  Ruler, Sparkles, Shirt, Footprints, Zap, CreditCard
} from 'lucide-react';
import { useFetch } from '@/hooks';
import { productApi } from '@/services';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import { useAddToCart } from '@/hooks/useAddToCart';
import { Button } from '@/components/ui/button';
import { ProductReviews } from '@/components/features/ProductReviews';
import { ROUTES } from '@/constants';
import { formatPrice, cn } from '@/utils/helpers';
import { toast } from 'sonner';
import type { Product } from '@/types';

// ═══════════════════════════════════════════════════════════════
// 🔹 HELPERS
// ═══════════════════════════════════════════════════════════════

const extractProduct = (data: any): Product | null => {
  if (!data) return null;
  if (data.product && typeof data.product === 'object') return data.product;
  if (data.data && (data.data._id || data.data.id)) return data.data;
  if (data._id || data.id) return data;
  return null;
};

// ✅ Détection par CATÉGORIE (pas par type)
const getCategorySlug = (category: any): string => {
  if (!category) return '';
  if (typeof category === 'string') return category.toLowerCase();
  if (category.slug) return category.slug.toLowerCase();
  if (category.name) return category.name.toLowerCase();
  return '';
};

const isFootwearCategory = (category: any): boolean => {
  const slug = getCategorySlug(category);
  return slug.includes('chaussure') || slug.includes('sandal') || 
         slug.includes('basket') || slug.includes('shoe') || 
         slug.includes('footwear');
};

const isClothingCategory = (category: any): boolean => {
  const slug = getCategorySlug(category);
  return slug.includes('vetement') || slug.includes('vêtement') || 
         slug.includes('clothing') || slug.includes('habit');
};

// ✅ Tailles standards
const CLOTHING_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const SIZE_MIN = 28;
const SIZE_MAX = 47;
const PLACEHOLDER_IMAGE = 'https://placehold.co/800x800/e2e8f0/64748b?text=Produit&font=montserrat';

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  
  const { addItem } = useCart();
  const { add: addToCartWithPrompt } = useAddToCart();
  const { isAuthenticated } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [customSize, setCustomSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  const { data: apiResponse, loading, error, refetch } = useFetch<any>(
    () => productApi.getProduct(slug),
    [slug]
  );

  const product = useMemo(() => extractProduct(apiResponse), [apiResponse]);
  const productId = product?._id || (product as any)?.id;

  // ✅ Détection par catégorie
  const isFootwearProduct = useMemo(() => isFootwearCategory(product?.category), [product?.category]);
  const isClothingProduct = useMemo(() => isClothingCategory(product?.category), [product?.category]);

  const wishlisted = useMemo(() => productId ? isInWishlist(productId) : false, [productId, isInWishlist]);

  const currentImage = useMemo(() => {
    if (!product?.images?.length) return null;
    const img = product.images[selectedImage] || product.images[0];
    if (!img?.url) return null;
    if (img.url.includes('res.cloudinary.com')) {
      return img.url.replace('/upload/', '/upload/f_auto,q_auto,w_800,c_fill,g_auto/');
    }
    return img.url;
  }, [product?.images, selectedImage]);

  // ✅ Validation pointure
  const isValidSize = (value: string): boolean => {
    const num = parseInt(value);
    return !isNaN(num) && num >= SIZE_MIN && num <= SIZE_MAX;
  };

  const handleCustomSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCustomSize(value);
  }, []);

  const handleAddToCart = useCallback(async () => {
    if (!productId) {
      toast.error('Produit non chargé');
      return;
    }

    // ✅ Bug fix (10/07/2026) : si l'utilisateur n'est pas connecté, on
    //    redirige vers /auth/login au lieu d'appeler l'API panier (qui
    //    renvoie 401). Le bouton reste cliquable, mais on remonte l'info
    //    à l'user via un toast avant la redirection.
    if (!isAuthenticated) {
      toast.error('Connexion requise', {
        description: 'Veuillez vous connecter pour ajouter au panier',
      });
      router.push(`/auth/login?from=/products/${slug}`);
      return;
    }

    // ✅ Validation selon catégorie
    if (isFootwearProduct) {
      if (!customSize) {
        toast.error('Veuillez indiquer votre pointure');
        return;
      }
      if (!isValidSize(customSize)) {
        toast.error(`Pointure invalide (${SIZE_MIN}-${SIZE_MAX})`);
        return;
      }
    } else if (isClothingProduct) {
      if (!selectedSize) {
        toast.error('Veuillez sélectionner une taille');
        return;
      }
    }

    setIsAdding(true);
    try {
      if (!product) return;
      const res = await addToCartWithPrompt({
        product,
        size: isFootwearProduct ? customSize : (isClothingProduct ? selectedSize : undefined),
        quantity,
      });

      if (res.ok) {
        const sizeInfo = isFootwearProduct
          ? ` (Pointure ${customSize})`
          : isClothingProduct
            ? ` (Taille ${selectedSize})`
            : '';
        toast.success(`Ajouté au panier${sizeInfo} 🛒`);
      }
    } finally {
      setIsAdding(false);
    }
  }, [
    productId,
    selectedSize,
    customSize,
    quantity,
    addToCartWithPrompt,
    isFootwearProduct,
    isClothingProduct,
    product,
  ]);

  /**
   * 🛒⚡ Achat express : ajoute le produit au panier puis redirige vers /cart.
   * Permet à l'utilisateur de finaliser sa commande (adresse + paiement) depuis le panier.
   */
  const handleBuyNow = useCallback(async () => {
    if (!productId || !product) {
      toast.error('Produit non chargé');
      return;
    }

    // ✅ Bug fix (10/07/2026) : même logique que handleAddToCart — on
    //    redirige vers login si pas connecté au lieu de tenter l'ajout
    //    (qui reviendrait en 401).
    if (!isAuthenticated) {
      toast.error('Connexion requise', {
        description: 'Veuillez vous connecter pour acheter',
      });
      router.push(`/auth/login?from=/products/${slug}`);
      return;
    }

    // ✅ Mêmes validations que handleAddToCart
    if (isFootwearProduct) {
      if (!customSize) {
        toast.error('Veuillez indiquer votre pointure');
        return;
      }
      if (!isValidSize(customSize)) {
        toast.error(`Pointure invalide (${SIZE_MIN}-${SIZE_MAX})`);
        return;
      }
    } else if (isClothingProduct) {
      if (!selectedSize) {
        toast.error('Veuillez sélectionner une taille');
        return;
      }
    }

    setIsBuyingNow(true);
    try {
      const res = await addToCartWithPrompt({
        product,
        size: isFootwearProduct ? customSize : (isClothingProduct ? selectedSize : undefined),
        quantity,
      });

      if (res.ok) {
        // ✅ Redirection vers le panier pour finaliser la commande
        router.push(ROUTES.CART);
      }
    } catch {
      toast.error('Impossible d\'ajouter au panier');
    } finally {
      setIsBuyingNow(false);
    }
  }, [
    productId,
    product,
    selectedSize,
    customSize,
    quantity,
    addToCartWithPrompt,
    isFootwearProduct,
    isClothingProduct,
    router,
  ]);

  const handleWishlist = useCallback(async () => {
    if (!productId) return;

    if (!isAuthenticated) {
      toast.error('Connexion requise');
      router.push(`/auth/login?from=/products/${slug}`);
      return;
    }

    try {
      const success = await toggleWishlist(productId, product || undefined);
      if (success) {
        const wasInWishlist = isInWishlist(productId);
        toast.success(wasInWishlist ? 'Retiré des favoris' : 'Ajouté aux favoris ❤️');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  }, [productId, product, isAuthenticated, toggleWishlist, isInWishlist, router, slug]);

  const handleQuantityChange = useCallback((delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(prev + delta, product?.totalStock || 10)));
  }, [product?.totalStock]);

  // ═══════════════════════════════════════════════════════════════
  // 🔹 RENDER
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-accent animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen px-4 py-12 flex items-center justify-center">
        <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">{error ? 'Erreur' : 'Produit introuvable'}</h2>
          <p className="text-muted-foreground">{error?.message || 'Ce produit n\'existe pas.'}</p>
          <Button onClick={() => error ? refetch() : router.push(ROUTES.PRODUCTS)}>
            {error ? 'Réessayer' : 'Retour aux produits'}
          </Button>
        </div>
      </div>
    );
  }

  const categoryName = typeof product.category === 'object' ? product.category?.name : 'Catégorie';

  return (
    <div className="min-h-screen px-4 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push(ROUTES.PRODUCTS)}
            className="text-sm font-medium text-accent hover:text-accent/80 inline-flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </button>
          <span className="text-sm text-muted-foreground">{categoryName}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* IMAGE */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="relative aspect-square overflow-hidden rounded-3xl bg-muted">
                <img
                  src={currentImage || PLACEHOLDER_IMAGE}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    if (t.src !== PLACEHOLDER_IMAGE) t.src = PLACEHOLDER_IMAGE;
                  }}
                />
                
                {/* Badge Sur Mesure pour chaussures */}
                {isFootwearProduct && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-gradient-to-r from-accent to-purple-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-lg">
                    <Footprints className="w-3 h-3" />
                    Sur Mesure
                  </div>
                )}

                {/* Badge Vêtements */}
                {isClothingProduct && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-lg">
                    <Shirt className="w-3 h-3" />
                    Collection Mode
                  </div>
                )}
              </div>

              {product.images && product.images.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={cn(
                        "aspect-square rounded-xl overflow-hidden border-2 transition",
                        idx === selectedImage ? 'border-accent' : 'border-transparent hover:border-accent/50'
                      )}
                    >
                      <img
                        src={img.url || PLACEHOLDER_IMAGE}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* INFO */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              {/* Titre + Wishlist */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">{product.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {categoryName} · {product.brand || 'Marque premium'}
                  </p>
                </div>
                <button
                  onClick={handleWishlist}
                  className={cn(
                    "rounded-full border p-3 transition",
                    wishlisted 
                      ? 'border-pink-500 bg-pink-500 text-white' 
                      : 'border-border hover:border-accent'
                  )}
                >
                  <Heart className="h-5 w-5" fill={wishlisted ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 text-sm">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4"
                      fill={i < Math.floor(product.rating?.average || 0) ? '#fbbf24' : 'none'}
                      color={i < Math.floor(product.rating?.average || 0) ? '#fbbf24' : '#6b7280'}
                    />
                  ))}
                </div>
                <span className="text-muted-foreground">({product.rating?.count || 0})</span>
              </div>

              {/* Prix */}
              <div>
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
              <span className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
                product.totalStock > 0 
                  ? 'bg-emerald-500/10 text-emerald-600' 
                  : 'bg-destructive/10 text-destructive'
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  product.totalStock > 0 ? 'bg-emerald-600' : 'bg-destructive'
                )} />
                {product.totalStock > 0 ? `${product.totalStock} en stock` : 'Rupture'}
              </span>

              {/* ═══════════════════════════════════════════════════════════════
                  CHAUSSURES / SANDALES - Pointure personnalisée (28-47)
                 ═══════════════════════════════════════════════════════════════ */}
              {isFootwearProduct && (
                <div className="space-y-3 p-4 bg-gradient-to-br from-accent/5 to-purple-500/5 border-2 border-accent/20 rounded-xl">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Footprints className="w-4 h-4 text-accent" />
                    Votre pointure <span className="text-destructive">*</span>
                  </label>

                  <input
                    type="number"
                    min={SIZE_MIN}
                    max={SIZE_MAX}
                    value={customSize}
                    onChange={handleCustomSizeChange}
                    placeholder={`Ex: 38 (${SIZE_MIN}-${SIZE_MAX})`}
                    className={cn(
                      "w-full h-11 px-4 border-2 rounded-xl text-base font-medium transition",
                      "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent",
                      customSize && !isValidSize(customSize)
                        ? "border-destructive bg-destructive/5"
                        : "border-border hover:border-accent/50"
                    )}
                  />

                  <p className="text-xs text-muted-foreground">
                    💡 Chaussures fabriquées sur mesure selon votre pointure
                  </p>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  VÊTEMENTS - Tailles standards (S à XXL)
                 ═══════════════════════════════════════════════════════════════ */}
              {isClothingProduct && !isFootwearProduct && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-blue-600" />
                    Taille <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {CLOTHING_SIZES.map((size) => {
                      const isSelected = selectedSize === size;
                      
                      return (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={cn(
                            "h-12 rounded-xl border-2 text-sm font-bold transition-all",
                            isSelected 
                              ? 'border-blue-500 bg-gradient-to-br from-blue-500/15 to-cyan-500/15 text-blue-700 shadow-md scale-105' 
                              : 'border-border hover:border-blue-500/50 hover:bg-blue-500/5'
                          )}
                        >
                          {size}
                          {isSelected && (
                            <Check className="w-3 h-3 mx-auto mt-0.5 text-blue-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantité */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Quantité</label>
                <div className="flex items-center gap-2">
                  <Button
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
                  {product.description || 'Aucune description.'}
                </p>
              </div>

              {/* Boutons d'action : Ajouter au panier + Acheter maintenant */}
              <div className="space-y-3">
                <Button
                  onClick={handleAddToCart}
                  className={cn(
                    "w-full h-12 text-base transition-all",
                    isFootwearProduct
                      ? "bg-gradient-to-r from-accent to-purple-500 hover:from-accent/90 hover:to-purple-500/90"
                      : isClothingProduct
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-500/90 hover:to-cyan-500/90"
                        : "bg-accent hover:bg-accent/90"
                  )}
                  disabled={
                    product.totalStock === 0 ||
                    (isFootwearProduct && !customSize) ||
                    (isClothingProduct && !selectedSize) ||
                    isAdding ||
                    isBuyingNow
                  }
                >
                  {isAdding ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <ShoppingCart className="mr-2 h-5 w-5" />
                  )}
                  {product.totalStock === 0
                    ? 'Rupture de stock'
                    : isFootwearProduct && !customSize
                      ? 'Indiquez votre pointure'
                      : isClothingProduct && !selectedSize
                        ? 'Sélectionnez une taille'
                        : `Ajouter au panier — ${formatPrice((product.basePrice || 0) * quantity)}`
                  }
                </Button>

                {/* ⚡ Achat express : ajoute au panier ET va directement au paiement */}
                <Button
                  onClick={handleBuyNow}
                  variant="outline"
                  className={cn(
                    "w-full h-12 text-base font-semibold border-2 transition-all",
                    "border-accent/60 text-accent hover:bg-accent hover:text-white hover:border-accent",
                    "shadow-sm hover:shadow-md"
                  )}
                  disabled={
                    product.totalStock === 0 ||
                    (isFootwearProduct && !customSize) ||
                    (isClothingProduct && !selectedSize) ||
                    isAdding ||
                    isBuyingNow
                  }
                >
                  {isBuyingNow ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-5 w-5 fill-current" />
                  )}
                  {isBuyingNow
                    ? 'Redirection…'
                    : product.totalStock === 0
                      ? 'Indisponible'
                      : `Acheter maintenant — ${formatPrice((product.basePrice || 0) * quantity)}`}
                </Button>

                <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5">
                  <CreditCard className="w-3 h-3" />
                  Paiement 100% sécurisé — Orange Money, MTN, Wave, Moov, Carte
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            AVIS CLIENTS — Seuls les avis approuvés par l'admin s'affichent
           ═══════════════════════════════════════════════════════════════ */}
        {productId && <ProductReviews productId={productId} />}
      </div>
    </div>
  );
}