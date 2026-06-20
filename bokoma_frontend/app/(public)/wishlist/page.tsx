// app/(public)/wishlist/page.tsx
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, ShoppingCart, Trash2, Eye, AlertCircle, Loader2, 
  Package, Sparkles, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import { useWishlist } from '@/hooks/useWishlist';
import { apiClient } from '@/services/api';
import { ROUTES } from '@/constants';
import { formatPrice } from '@/utils/helpers';
import { toast } from 'sonner';
import type { Product } from '@/types';

import { PublicPageHeader } from '@/components/ui/public-page-header';

<PublicPageHeader
  title="Ma Liste de Souhaits"
  description={`${wishlist.length} produit${wishlist.length > 1 ? 's' : ''} sauvegardé${wishlist.length > 1 ? 's' : ''}`}
  icon={<Heart className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />}
  breadcrumbs={[{ label: 'Wishlist' }]}
/>

// ============================================================================
// 🔹 HELPERS
// ============================================================================

/**
 * Extrait l'URL d'image depuis différents formats
 */
const getProductImage = (product: Product): string => {
  const firstImage = product.images?.[0];
  if (!firstImage) return '/placeholder-product.svg';
  
  if (typeof firstImage === 'string') return firstImage;
  if (firstImage.url) return firstImage.url;
  
  return '/placeholder-product.svg';
};

// ============================================================================
// 🔹 COMPOSANT PRINCIPAL
// ============================================================================

export default function WishlistPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const mounted = useMounted();
  
  // ✅ Utilise le hook useWishlist qui fetch déjà correctement
  const { 
    wishlist, 
    loading: wishlistLoading, 
    error: wishlistError,
    removeFromWishlist,
    toggleWishlist,
    refreshWishlist,
  } = useWishlist();

  const [addingToCart, setAddingToCart] = useState<Set<string>>(new Set());
  const [addingAllToCart, setAddingAllToCart] = useState(false);

  // ============================================================================
  // 🔹 DEBUG LOGS
  // ============================================================================

  useEffect(() => {
    console.group('🔍 [WISHLIST DEBUG] État du composant');
    console.log('📍 mounted:', mounted);
    console.log('👤 isAuthenticated:', isAuthenticated);
    console.log('👤 user:', user);
    console.log('⏳ authLoading:', authLoading);
    console.log('⏳ wishlistLoading:', wishlistLoading);
    console.log('📦 wishlist:', wishlist);
    console.log('📦 wishlist.length:', wishlist.length);
    console.log('❌ wishlistError:', wishlistError);
    console.groupEnd();
  }, [mounted, isAuthenticated, user, authLoading, wishlistLoading, wishlist, wishlistError]);

  useEffect(() => {
    console.log('🔄 [WISHLIST DEBUG] Wishlist mise à jour:', wishlist);
    if (wishlist.length > 0) {
      console.log('📦 [WISHLIST DEBUG] Premier produit:', wishlist[0]);
      console.log('🖼️ [WISHLIST DEBUG] Images du premier produit:', wishlist[0].images);
    }
  }, [wishlist]);

  // ============================================================================
  // 🔹 COMPUTED VALUES
  // ============================================================================

  const totalValue = useMemo(() => {
    const value = wishlist.reduce((sum, product) => sum + (product.basePrice || 0), 0);
    console.log('💰 [WISHLIST DEBUG] Valeur totale calculée:', value);
    return value;
  }, [wishlist]);

  const inStockCount = useMemo(() => {
    const count = wishlist.filter(p => (p.totalStock || 0) > 0).length;
    console.log('📊 [WISHLIST DEBUG] Produits en stock:', count);
    return count;
  }, [wishlist]);

  // ============================================================================
  // 🔹 HANDLERS
  // ============================================================================

  const handleRemoveFromWishlist = useCallback(async (productId: string, productName: string) => {
    console.log('🗑️ [WISHLIST DEBUG] Suppression du produit:', productId, productName);
    const success = await removeFromWishlist(productId);
    console.log('✅ [WISHLIST DEBUG] Suppression réussie:', success);
    if (success) {
      toast.success(`${productName} retiré des favoris`);
    } else {
      toast.error('Impossible de retirer le produit');
    }
  }, [removeFromWishlist]);

  const handleAddToCart = useCallback(async (product: Product) => {
    console.log('🛒 [WISHLIST DEBUG] Ajout au panier:', product);
    if ((product.totalStock || 0) <= 0) {
      toast.error(`${product.name} est en rupture de stock`);
      return;
    }

    setAddingToCart(prev => new Set(prev).add(product._id));

    try {
      await apiClient.post('/cart/items', {
        product: product._id,
        quantity: 1,
      });
      toast.success(`${product.name} ajouté au panier`);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Erreur lors de l\'ajout au panier';
      toast.error(message);
    } finally {
      setAddingToCart(prev => {
        const next = new Set(prev);
        next.delete(product._id);
        return next;
      });
    }
  }, []);

  const handleAddAllToCart = useCallback(async () => {
    const availableProducts = wishlist.filter(p => (p.totalStock || 0) > 0);
    
    if (availableProducts.length === 0) {
      toast.error('Aucun produit disponible en stock');
      return;
    }

    setAddingAllToCart(true);

    try {
      // ✅ Ajout séquentiel pour éviter les problèmes de concurrence
      let successCount = 0;
      let errorCount = 0;

      for (const product of availableProducts) {
        try {
          await apiClient.post('/cart/items', {
            product: product._id,
            quantity: 1,
          });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`${successCount} produit${successCount > 1 ? 's' : ''} ajouté${successCount > 1 ? 's' : ''} au panier`);
      } else {
        toast(`${successCount} ajouté${successCount > 1 ? 's' : ''}, ${errorCount} erreur${errorCount > 1 ? 's' : ''}`, {
          icon: '⚠️',
        });
      }
    } catch (err: any) {
      toast.error('Erreur lors de l\'ajout au panier');
    } finally {
      setAddingAllToCart(false);
    }
  }, [wishlist]);

  // ============================================================================
  // 🔹 LOADING STATES
  // ============================================================================

  if (!mounted || authLoading || wishlistLoading) {
    console.log('⏳ [WISHLIST DEBUG] Affichage du loader');
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Chargement de vos favoris...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 🔹 NOT AUTHENTICATED
  // ============================================================================

  if (!isAuthenticated) {
    console.log('🔒 [WISHLIST DEBUG] Utilisateur non authentifié');
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Connexion requise</h2>
          <p className="text-muted-foreground mb-6">
            Veuillez vous connecter pour accéder à vos favoris.
          </p>
          <Button asChild variant="primary" size="lg">
            <Link href={`${ROUTES.AUTH.LOGIN}?from=/wishlist`}>
              Se connecter
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  // ============================================================================
  // 🔹 ERROR STATE
  // ============================================================================

  if (wishlistError) {
    console.error('❌ [WISHLIST DEBUG] Erreur:', wishlistError);
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Erreur de chargement</h2>
          <p className="text-muted-foreground mb-6">
            {wishlistError}
          </p>
          <Button 
            variant="primary" 
            size="lg"
            onClick={() => refreshWishlist()}
          >
            Réessayer
          </Button>
        </motion.div>
      </div>
    );
  }

  // ============================================================================
  // 🔹 RENDER
  // ============================================================================

  console.log('🎨 [WISHLIST DEBUG] Rendu de la page - wishlist.length:', wishlist.length);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
                Mes Favoris
              </h1>
              <p className="text-muted-foreground mt-2">
                {wishlist.length} produit{wishlist.length > 1 ? 's' : ''} dans votre liste de souhaits
                {wishlist.length > 0 && (
                  <span className="ml-2 text-accent font-medium">
                    • Valeur totale : {formatPrice(totalValue)}
                  </span>
                )}
              </p>
            </div>

            {/* Action : Tout ajouter au panier */}
            {wishlist.length > 0 && (
              <Button
                variant="primary"
                size="lg"
                onClick={handleAddAllToCart}
                disabled={addingAllToCart || inStockCount === 0}
                className="gap-2"
              >
                {addingAllToCart ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Ajout...</>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Tout ajouter au panier ({inStockCount})
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Empty State */}
        {wishlist.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-32 h-32 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-16 h-16 text-muted-foreground/50" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Votre liste est vide</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Explorez notre catalogue et ajoutez des produits à vos favoris en cliquant sur le cœur ❤️
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="primary" size="lg">
                <Link href={ROUTES.PRODUCTS}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Découvrir des produits
                </Link>
              </Button>
            </div>
          </motion.div>
        )}

        {/* Wishlist Grid */}
        {wishlist.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {wishlist.map((product, index) => {
                const imageUrl = getProductImage(product);
                const isOutOfStock = (product.totalStock || 0) === 0;
                const isAdding = addingToCart.has(product._id);

                console.log(`📦 [WISHLIST DEBUG] Produit ${index}:`, {
                  id: product._id,
                  name: product.name,
                  imageUrl,
                  isOutOfStock,
                  stock: product.totalStock,
                });

                return (
                  <motion.div
                    key={product._id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                    className="bg-card border border-border rounded-xl overflow-hidden group hover:shadow-lg transition-all"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square bg-muted/30">
                      <Link href={`/products/${product.slug || product._id}`}>
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            console.warn(`⚠️ [WISHLIST DEBUG] Erreur chargement image:`, imageUrl);
                            (e.target as HTMLImageElement).src = '/placeholder-product.svg';
                          }}
                        />
                      </Link>

                      {/* Out of Stock Badge */}
                      {isOutOfStock && (
                        <div className="absolute top-3 left-3 px-2 py-1 bg-destructive text-white text-xs font-semibold rounded-full">
                          Rupture
                        </div>
                      )}

                      {/* Quick Actions Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="rounded-full hover:scale-110 transition-transform"
                          onClick={() => handleAddToCart(product)}
                          disabled={isOutOfStock || isAdding}
                          title="Ajouter au panier"
                        >
                          {isAdding ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShoppingCart className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="rounded-full hover:scale-110 transition-transform bg-background"
                          asChild
                        >
                          <Link href={`/products/${product.slug || product._id}`} title="Voir le produit">
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>

                      {/* Wishlist Heart Button */}
                      <button
                        className="absolute top-3 right-3 p-2 rounded-full bg-background/90 hover:bg-background transition-colors shadow-sm hover:scale-110 transition-transform"
                        onClick={() => handleRemoveFromWishlist(product._id, product.name)}
                        title="Retirer des favoris"
                      >
                        <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                      </button>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <Link href={`/products/${product.slug || product._id}`} className="block">
                        <h3 className="font-semibold line-clamp-1 hover:text-accent transition-colors">
                          {product.name}
                        </h3>
                        {product.brand && (
                          <p className="text-sm text-muted-foreground mt-0.5">{product.brand}</p>
                        )}
                      </Link>

                      <div className="flex items-center justify-between mt-3">
                        <p className="text-lg font-bold text-accent">
                          {formatPrice(product.basePrice || 0)}
                        </p>
                        {!isOutOfStock && (
                          <span className="text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            {product.totalStock} en stock
                          </span>
                        )}
                      </div>

                      {/* Action Button */}
                      <Button
                        size="sm"
                        variant={isOutOfStock ? 'outline' : 'primary'}
                        onClick={() => handleAddToCart(product)}
                        disabled={isOutOfStock || isAdding}
                        className="w-full mt-3 gap-2"
                      >
                        {isAdding ? (
                          <><Loader2 className="w-3 h-3 animate-spin" />Ajout...</>
                        ) : isOutOfStock ? (
                          'Indisponible'
                        ) : (
                          <><ShoppingCart className="w-3 h-3" /> Ajouter au panier</>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Bottom CTA */}
        {wishlist.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 p-6 bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-xl text-center"
          >
            <h3 className="text-xl font-semibold mb-2">
              Vous aimez ces produits ?
            </h3>
            <p className="text-muted-foreground mb-4">
              Continuez votre shopping et découvrez d'autres articles
            </p>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href={ROUTES.PRODUCTS}>
                Continuer le shopping
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}