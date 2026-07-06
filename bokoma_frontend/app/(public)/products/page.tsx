// app/(public)/products/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Search, SlidersHorizontal, X, Loader2, Package, Filter, Grid, 
  Heart, ShoppingBag, Eye, Star, TrendingUp, Sparkles, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import NextImage from 'next/image';
import { productApi } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';
import type { Product } from '@/types';
import { cn, formatPrice } from '@/utils/helpers';

// ═══════════════════════════════════════════════════════════════
// 🔹 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Plus récents', icon: Sparkles },
  { value: 'createdAt', label: 'Plus anciens', icon: Package },
  { value: '-basePrice', label: 'Prix décroissant', icon: TrendingUp },
  { value: 'basePrice', label: 'Prix croissant', icon: TrendingUp },
  { value: 'name', label: 'Nom A-Z', icon: Filter },
];

const CATEGORIES = [
  { slug: 'chaussures', name: 'Chaussures', emoji: '👟', color: 'from-blue-500/10 to-blue-500/5' },
  { slug: 'vetements', name: 'Vêtements', emoji: '👕', color: 'from-purple-500/10 to-purple-500/5' },
  { slug: 'accessoires', name: 'Accessoires', emoji: '👜', color: 'from-pink-500/10 to-pink-500/5' },
  { slug: 'parfums', name: 'Parfums', emoji: '✨', color: 'from-amber-500/10 to-amber-500/5' },
];

// ═══════════════════════════════════════════════════════════════
// 🔹 HELPERS
// ═══════════════════════════════════════════════════════════════

const normalizeProducts = (data: any): Product[] => {
  if (!data) return [];
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data?.products)) return data.data.products;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

const getProductImage = (product: Product): string => {
  if (!product.images || product.images.length === 0) {
    return '/placeholder-product.svg';
  }
  const img = product.images[0];
  return typeof img === 'string' ? img : img?.url || img?.imageUrl || '/placeholder-product.svg';
};

// ═══════════════════════════════════════════════════════════════
// 🔹 COMPOSANT : ProductCard
// ═══════════════════════════════════════════════════════════════

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string, product: Product) => void;
  isWishlisted: boolean;
}

const ProductCard = React.memo(({ 
  product, 
  onAddToCart, 
  onToggleWishlist, 
  isWishlisted 
}: ProductCardProps) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  
  const imageUrl = getProductImage(product);
  const isOutOfStock = (product.totalStock || 0) <= 0;
  
  // ✅ Gestion du clic sur le bouton panier (stopPropagation)
  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart(product);
  };
  
  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleWishlist(product._id, product);
  };

  return (
    <div className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-accent/50 hover:shadow-xl hover:shadow-accent/10 transition-all duration-300">
      {/* ✅ Link vers la page produit - englobe tout sauf les boutons */}
      <Link 
        href={`/products/${product.slug || product._id}`}
        className="block"
      >
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted to-muted/50">
          {!imgError && (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 bg-muted animate-pulse" />
              )}
              <NextImage
                src={imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                className={cn(
                  "object-cover transition-all duration-500",
                  "group-hover:scale-110",
                  imgLoaded ? "opacity-100" : "opacity-0"
                )}
                priority={false}
              />
            </>
          )}
          
          {imgError && (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
          
          {/* Badge Stock */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="px-4 py-2 bg-destructive text-white font-bold rounded-full text-sm">
                Rupture de stock
              </span>
            </div>
          )}
          
          {/* Badge Nouveau (si produit récent) */}
          {!isOutOfStock && new Date(product.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
            <div className="absolute top-3 left-3 px-3 py-1 bg-gradient-to-r from-accent to-purple-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Nouveau
            </div>
          )}
          
          {/* Bouton Wishlist */}
          <button
            onClick={handleWishlistClick}
            className={cn(
              "absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
              isWishlisted 
                ? "bg-red-500 text-white scale-110" 
                : "bg-white/90 text-muted-foreground hover:bg-white hover:scale-110"
            )}
            title={isWishlisted ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Heart 
              className={cn(
                "w-5 h-5 transition-all",
                isWishlisted && "fill-current"
              )} 
            />
          </button>
        </div>
        
        {/* Product Info */}
        <div className="p-4 space-y-3">
          {/* Brand */}
          {product.brand && (
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {product.brand}
            </p>
          )}
          
          {/* Name */}
          <h3 className="font-semibold text-base line-clamp-2 group-hover:text-accent transition-colors min-h-[3rem]">
            {product.name}
          </h3>
          
          {/* Price */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-2xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
                {formatPrice(product.basePrice || 0)}
              </p>
              {!isOutOfStock && product.totalStock && product.totalStock < 10 && (
                <p className="text-xs text-amber-600 mt-0.5">
                  Plus que {product.totalStock} en stock
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>
      
      {/* ✅ Bouton Ajouter au panier (EN DEHORS du Link) */}
      <div className="px-4 pb-4">
        <Button
          onClick={handleAddToCartClick}
          disabled={isOutOfStock}
          className={cn(
            "w-full gap-2 transition-all duration-300",
            isOutOfStock 
              ? "bg-muted text-muted-foreground cursor-not-allowed" 
              : "bg-gradient-to-r from-accent to-purple-500 hover:from-accent/90 hover:to-purple-500/90 shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5"
          )}
        >
          <ShoppingBag className="w-4 h-4" />
          {isOutOfStock ? 'Indisponible' : 'Ajouter au panier'}
        </Button>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

// ═══════════════════════════════════════════════════════════════
// 🔹 COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function ProductsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addItem: addToCart } = useCart();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [searchQuery, setSearchQuery] = useState('');

  // ═══════════════════════════════════════════════════════════════
  // 🔹 FETCH PRODUCTS
  // ═══════════════════════════════════════════════════════════════

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { page: 1, limit: 24 };
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;
      if (sortBy) params.sort = sortBy;

      const response = await productApi.getProducts({
        ...params,
        fields: 'name,slug,images,brand,basePrice,totalStock,category,createdAt',
      });
      const normalized = normalizeProducts(response);
      
      setProducts(normalized);
      setPagination({
        total: response?.total ?? normalized.length,
        page: response?.page ?? 1,
        pages: response?.pages ?? 1,
      });
    } catch (err: any) {
      console.error('❌ Failed to load products:', err);
      setError(err?.message || 'Impossible de charger les produits');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ═══════════════════════════════════════════════════════════════
  // 🔹 HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleToggleWishlist = useCallback(async (productId: string, product: Product) => {
    if (!isAuthenticated) {
      toast.error('Connexion requise', {
        description: 'Veuillez vous connecter pour ajouter aux favoris',
      });
      router.push(`/auth/login?from=/products`);
      return;
    }

    const success = await toggleWishlist(productId, product);
    if (success) {
      const isNowWishlisted = isInWishlist(productId);
      toast.success(isNowWishlisted ? 'Retiré des favoris' : 'Ajouté aux favoris', {
        description: product.name,
      });
    }
  }, [isAuthenticated, toggleWishlist, isInWishlist, router]);

  const handleAddToCart = useCallback(async (product: Product) => {
    if (!isAuthenticated) {
      toast.error('Connexion requise', {
        description: 'Veuillez vous connecter pour ajouter au panier',
      });
      router.push(`/auth/login?from=/products`);
      return;
    }

    if ((product.totalStock || 0) <= 0) {
      toast.error('Produit indisponible', {
        description: 'Ce produit est en rupture de stock',
      });
      return;
    }

    try {
      await addToCart({ product: product._id, quantity: 1 });
      toast.success('Ajouté au panier', {
        description: product.name,
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Erreur lors de l'ajout au panier";
      if (message.includes('déjà') || message.includes('existant')) {
        toast.info('Quantité augmentée', {
          description: `${product.name} - +1 dans le panier`,
        });
      } else {
        toast.error('Erreur', { description: message });
      }
    }
  }, [isAuthenticated, addToCart, router]);

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(prev => prev === slug ? '' : slug);
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSearchQuery('');
    setSortBy('-createdAt');
  };

  // ═══════════════════════════════════════════════════════════════
  // 🔹 LOADING STATE
  // ═══════════════════════════════════════════════════════════════

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
              Nos Produits
            </h1>
            <p className="text-muted-foreground">Explorez notre catalogue complet</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted/50" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-muted rounded w-1/4" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-5 bg-muted rounded w-1/3" />
                  <div className="h-10 bg-muted rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔹 MAIN RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
            Nos Produits
          </h1>
          <p className="text-muted-foreground">
            {pagination.total} produit{pagination.total !== 1 ? 's' : ''} disponible{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filters Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-card border border-border rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            {/* Desktop Categories */}
            <div className="hidden sm:flex gap-2 flex-wrap">
              <Button 
                variant={!selectedCategory ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => handleCategoryChange('')}
                className={!selectedCategory ? "bg-gradient-to-r from-accent to-purple-500" : ""}
              >
                Tous
              </Button>
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.slug}
                  variant={selectedCategory === cat.slug ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={selectedCategory === cat.slug ? "bg-gradient-to-r from-accent to-purple-500" : ""}
                >
                  {cat.name}
                </Button>
              ))}
            </div>

            {/* Mobile Filter Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="sm:hidden gap-2" 
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal className="w-4 h-4" /> Filtres
            </Button>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(selectedCategory || searchQuery || sortBy !== '-createdAt') && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={clearFilters} 
                aria-label="Effacer les filtres"
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Filters Panel */}
        {filtersOpen && (
          <div className="sm:hidden mb-6 p-4 bg-card border border-border rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <p className="text-sm font-medium mb-2">Catégorie</p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={!selectedCategory ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => handleCategoryChange('')}
                >
                  Tous
                </Button>
                {CATEGORIES.map((cat) => (
                  <Button 
                    key={cat.slug} 
                    variant={selectedCategory === cat.slug ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => handleCategoryChange(cat.slug)}
                  >
                    {cat.emoji} {cat.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchProducts}>
              Réessayer
            </Button>
          </div>
        )}

        {/* Empty State */}
        {products.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl animate-in fade-in zoom-in duration-300">
            <Grid className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">Aucun produit ne correspond à votre recherche</p>
            <Button variant="outline" onClick={clearFilters}>
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          /* Products Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product._id} className="animate-in fade-in duration-300">
                <ProductCard
                  product={product}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  isWishlisted={isInWishlist(product._id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={pagination.page === 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            >
              Précédent
            </Button>
            <span className="px-4 py-2 text-sm text-muted-foreground flex items-center">
              Page {pagination.page} sur {pagination.pages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            >
              Suivant
            </Button>
          </div>
        )}

        {/* Categories Section */}
        <section className="mt-16 pt-12 border-t border-border">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
            Parcourir par Catégorie
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className={cn(
                  "p-6 bg-gradient-to-br border border-border rounded-2xl hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all text-center group",
                  cat.color
                )}
              >
                <div className="text-4xl mb-3">{cat.emoji}</div>
                <p className="font-semibold group-hover:text-accent transition-colors">{cat.name}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  Voir les articles
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}