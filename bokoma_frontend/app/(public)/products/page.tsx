// app/(public)/products/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid, Search, SlidersHorizontal, X, Loader2, 
  ShoppingCart, Heart, Eye, Filter
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { productApi } from '@/services';
import { formatPrice } from '@/utils/helpers';
import { useAuth } from '@/hooks/useAuth';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/utils/helpers';
import type { Product, Category } from '@/types';

// ============================================================================
// 🔹 CONSTANTS
// ============================================================================

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Plus récents' },
  { value: 'createdAt', label: 'Plus anciens' },
  { value: '-basePrice', label: 'Prix: Décroissant' },
  { value: 'basePrice', label: 'Prix: Croissant' },
  { value: 'name', label: 'Nom: A-Z' },
];

const CATEGORIES = [
  { slug: 'chaussures', name: 'Chaussures' },
  { slug: 'vetements', name: 'Vêtements' },
  { slug: 'accessoires', name: 'Accessoires' },
  { slug: 'parfums', name: 'Parfums' },
];

// ============================================================================
// 🔹 HELPERS
// ============================================================================

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
  const firstImage = product.images?.[0];
  if (!firstImage) return '/placeholder-product.svg';
  
  const url = typeof firstImage === 'string' ? firstImage : firstImage.url;
  if (!url) return '/placeholder-product.svg';
  
  if (url.includes('res.cloudinary.com')) {
    return url.replace('/upload/', '/upload/f_auto,q_auto,w_400,c_fill,g_auto/');
  }
  
  return url;
};

// ============================================================================
// 🔹 PRODUCT CARD COMPONENT
// ============================================================================

const ProductCard = ({ 
  product, 
  index,
  isWishlisted,
  onToggleWishlist,
  onAddToCart,
  addingToCart
}: {
  product: Product;
  index: number;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string, product: Product) => void;
  onAddToCart: (product: Product) => void;
  addingToCart: boolean;
}) => {
  const imageUrl = getProductImage(product);
  const inStock = (product.totalStock || 0) > 0;
  const productSlug = product.slug || product._id;
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      whileHover={{ y: -4 }}
      className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all"
    >
      {/* Image (link only wraps the image to avoid nested anchors) */}
      <div className="relative">
        <Link href={`/products/${productSlug}`} className="block aspect-square bg-muted/30">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-product.svg';
            }}
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {!inStock && (
            <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full">
              Rupture
            </span>
          )}
        </div>

        {/* Wishlist button (moved outside the Link) */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleWishlist(product._id, product);
          }}
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

        {/* Quick actions overlay (moved outside the Link, use router.push) */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart(product);
            }}
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
      </div>
      
      {/* Content */}
      <div className="p-4">
        <Link href={`/products/${productSlug}`} className="block">
          <h3 className="font-semibold line-clamp-2 hover:text-accent transition min-h-[2.5rem]">
            {product.name || 'Produit sans nom'}
          </h3>
        </Link>
        
        {product.brand && (
          <p className="text-xs text-muted-foreground mt-1">{product.brand}</p>
        )}
        
        <div className="flex items-center justify-between mt-3">
          <p className="text-lg font-bold text-accent">
            {formatPrice(product.basePrice || 0)}
          </p>
          {inStock && (
            <span className="text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {product.totalStock} en stock
            </span>
          )}
        </div>

        <Button
          size="sm"
          variant={inStock ? 'primary' : 'outline'}
          onClick={(e) => {
            e.preventDefault();
            onAddToCart(product);
          }}
          disabled={!inStock || addingToCart}
          className="w-full mt-3 gap-2"
        >
          {addingToCart ? (
            <><Loader2 className="w-3 h-3 animate-spin" />Ajout...</>
          ) : inStock ? (
            <><ShoppingCart className="w-3 h-3" /> Ajouter au panier</>
          ) : (
            'Indisponible'
          )}
        </Button>
      </div>
    </motion.div>
  );
};

// ============================================================================
// 🔹 MAIN PAGE COMPONENT
// ============================================================================

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addItem: addToCart } = useCart();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [addingToCartIds, setAddingToCartIds] = useState<Set<string>>(new Set());
  
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || '-createdAt');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  // ============================================================================
  // 🔹 FETCH DATA
  // ============================================================================

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
        fields: 'name,slug,images,brand,basePrice,totalStock,category',
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

  // ============================================================================
  // 🔹 HANDLERS
  // ============================================================================

  const handleToggleWishlist = useCallback(async (productId: string, product: Product) => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour ajouter aux favoris');
      router.push(`/auth/login?from=/products`);
      return;
    }

    const success = await toggleWishlist(productId, product);
    if (success) {
      const isNowWishlisted = isInWishlist(productId);
      toast.success(isNowWishlisted ? 'Retiré des favoris' : 'Ajouté aux favoris');
    }
  }, [isAuthenticated, toggleWishlist, isInWishlist, router]);

  const handleAddToCart = useCallback(async (product: Product) => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour ajouter au panier');
      router.push(`/auth/login?from=/products`);
      return;
    }

    if ((product.totalStock || 0) <= 0) {
      toast.error('Produit en rupture de stock');
      return;
    }

    setAddingToCartIds(prev => new Set(prev).add(product._id));

    try {
      // Utiliser le hook useCart pour gérer l'API et la synchronisation du store
      // handleAddItem vérifie si le produit existe déjà et incrémente la quantité
      await addToCart({ product: product._id, quantity: 1 });
      toast.success(`${product.name} ajouté au panier`);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Erreur lors de l'ajout au panier";
      // ✅ Vérifier si c'est une erreur "produit déjà existant"
      if (message.includes('Produit déjà existant') || message.includes('déjà')) {
        toast.info(`${product.name} - Quantité augmentée`);
      } else {
        toast.error(message);
      }
    } finally {
      setAddingToCartIds(prev => {
        const next = new Set(prev);
        next.delete(product._id);
        return next;
      });
    }
  }, [isAuthenticated, addToCart, router]);

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(prev => prev === slug ? '' : slug);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSearchQuery('');
    setSortBy('-createdAt');
  };

  // ============================================================================
  // 🔹 RENDER
  // ============================================================================

  if (loading && products.length === 0) {
    return (
      <div className="p-4 sm:p-8">
        <div className="mb-8">
          <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse" />
          <div className="h-4 bg-muted rounded w-32 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-muted/50" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-5 bg-muted rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Nos Produits</h1>
        <p className="text-muted-foreground">
          {pagination.total} produit{pagination.total !== 1 ? 's' : ''} trouvé{pagination.total !== 1 ? 's' : ''}
        </p>
      </motion.div>

      {/* Filters Bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          {searchQuery && (
            <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <div className="hidden sm:flex gap-2 flex-wrap">
            <Button variant={!selectedCategory ? 'primary' : 'outline'} size="sm" onClick={() => handleCategoryChange('')}>
              Tous
            </Button>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.slug}
                variant={selectedCategory === cat.slug ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleCategoryChange(cat.slug)}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          <Button variant="outline" size="sm" className="sm:hidden gap-2" onClick={() => setFiltersOpen(!filtersOpen)}>
            <SlidersHorizontal className="w-4 h-4" /> Filtres
          </Button>

          <select value={sortBy} onChange={(e) => handleSortChange(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg text-sm">
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {(selectedCategory || searchQuery || sortBy !== '-createdAt') && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Mobile Filters */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="sm:hidden mb-6 p-4 bg-card border border-border rounded-lg space-y-4 overflow-hidden">
            <div>
              <p className="text-sm font-medium mb-2">Catégorie</p>
              <div className="flex flex-wrap gap-2">
                <Button variant={!selectedCategory ? 'primary' : 'outline'} size="sm" onClick={() => handleCategoryChange('')}>
                  Tous
                </Button>
                {CATEGORIES.map((cat) => (
                  <Button key={cat.slug} variant={selectedCategory === cat.slug ? 'primary' : 'outline'} size="sm" onClick={() => handleCategoryChange(cat.slug)}>
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-center gap-3">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchProducts}>Réessayer</Button>
        </div>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Grid className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground mb-4">Aucun produit ne correspond à votre recherche</p>
          <Button variant="outline" onClick={clearFilters}>Réinitialiser les filtres</Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <ProductCard
              key={product._id}
              product={product}
              index={index}
              isWishlisted={isInWishlist(product._id)}
              onToggleWishlist={handleToggleWishlist}
              onAddToCart={handleAddToCart}
              addingToCart={addingToCartIds.has(product._id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={pagination.page === 1}>
            Précédent
          </Button>
          <span className="px-4 py-2 text-sm text-muted-foreground">
            Page {pagination.page} sur {pagination.pages}
          </span>
          <Button variant="outline" size="sm" disabled={pagination.page === pagination.pages}>
            Suivant
          </Button>
        </div>
      )}

      {/* Categories Section */}
      <section id="categories" className="mt-24 pt-12 border-t border-border">
        <h2 className="text-2xl font-bold mb-6">Parcourir par Catégorie</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className="p-4 bg-card border border-border rounded-xl hover:border-accent transition text-center group"
              onClick={() => setSelectedCategory(cat.slug)}
            >
              <p className="font-medium group-hover:text-accent transition">{cat.name}</p>
              <p className="text-xs text-muted-foreground">Voir les articles</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}