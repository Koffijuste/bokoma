// app/(public)/wishlist/page.tsx
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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

const getProductImage = (product: Product): string => {
  const firstImage = product.images?.[0];
  if (!firstImage) return '/placeholder-product.svg';
  
  if (typeof firstImage === 'string') return firstImage;
  if (firstImage.url) return firstImage.url;
  
  return '/placeholder-product.svg';
};

export default function WishlistPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const mounted = useMounted();
  
  const { 
    wishlist, 
    loading: wishlistLoading, 
    error: wishlistError,
    removeFromWishlist,
    refreshWishlist,
  } = useWishlist();

  const [addingToCart, setAddingToCart] = useState<Set<string>>(new Set());
  const [addingAllToCart, setAddingAllToCart] = useState(false);

  const totalValue = useMemo(() => {
    return wishlist.reduce((sum, product) => sum + (product.basePrice || 0), 0);
  }, [wishlist]);

  const inStockCount = useMemo(() => {
    return wishlist.filter(p => (p.totalStock || 0) > 0).length;
  }, [wishlist]);

  const handleRemoveFromWishlist = useCallback(async (productId: string, productName: string) => {
    const success = await removeFromWishlist(productId);
    if (success) {
      toast.success(`${productName} retiré des favoris`);
    } else {
      toast.error('Impossible de retirer le produit');
    }
  }, [removeFromWishlist]);

  const handleAddToCart = useCallback(async (product: Product) => {
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

  if (!mounted || authLoading || wishlistLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Chargement de vos favoris...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-300">
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
        </div>
      </div>
    );
  }

  if (wishlistError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-300">
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
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
        </div>

        {wishlist.length === 0 && (
          <div className="text-center py-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          </div>
        )}

        {wishlist.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
            {wishlist.map((product, index) => {
              const imageUrl = getProductImage(product);
              const isOutOfStock = (product.totalStock || 0) === 0;
              const isAdding = addingToCart.has(product._id);

              return (
                <div
                  key={product._id}
                  className="bg-card border border-border rounded-xl overflow-hidden group hover:shadow-lg transition-all hover:-translate-y-1 duration-300 animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative aspect-square bg-muted/30">
                    <Link href={`/products/${product.slug || product._id}`}>
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-product.svg';
                        }}
                      />
                    </Link>

                    {isOutOfStock && (
                      <div className="absolute top-3 left-3 px-2 py-1 bg-destructive text-white text-xs font-semibold rounded-full">
                        Rupture
                      </div>
                    )}

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

                    <button
                      className="absolute top-3 right-3 p-2 rounded-full bg-background/90 hover:bg-background transition-colors shadow-sm hover:scale-110 transition-transform"
                      onClick={() => handleRemoveFromWishlist(product._id, product.name)}
                      title="Retirer des favoris"
                    >
                      <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                    </button>
                  </div>

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
                </div>
              );
            })}
          </div>
        )}

        {wishlist.length > 0 && (
          <div className="mt-12 p-6 bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-xl text-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
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
          </div>
        )}
      </div>
    </div>
  );
}