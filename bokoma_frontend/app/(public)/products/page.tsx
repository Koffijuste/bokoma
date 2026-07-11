// app/(public)/products/page.tsx
// ============================================================================
// 🛍️ PAGE PRODUITS — Catalogue filtrable avec debounce + indicateur de filtre
// ============================================================================
// Améliorations perf :
//  1. Debounce 300ms sur la recherche (évite une requête par frappe)
//  2. Barre de progression inline pendant les changements de filtre
//  3. Pagination fonctionnelle (refetch quand la page change)
//  4. Cleanup d'effet via flag `cancelled` pour éviter les race conditions
//  5. Mémoïsation de la grille pour éviter les re-renders inutiles
// ============================================================================

'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Search, SlidersHorizontal, X, Loader2, Package, Filter, Grid,
  Heart, ShoppingBag, Sparkles, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import NextImage from 'next/image';
import { productApi, categoryApi } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { useWishlist } from '@/hooks/useWishlist';
import { useAddToCart } from '@/hooks/useAddToCart';
import { MediaProtection } from '@/components/MediaProtection';
import type { Product, Category } from '@/types';
import { cn, formatPrice } from '@/utils/helpers';

// ═══════════════════════════════════════════════════════════════
// 🔹 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Plus récents', icon: Sparkles },
  { value: 'createdAt',  label: 'Plus anciens', icon: Package },
  { value: '-basePrice', label: 'Prix décroissant', icon: Sparkles },
  { value: 'basePrice',  label: 'Prix croissant', icon: Sparkles },
  { value: 'name',       label: 'Nom A-Z', icon: Filter },
];

// ✅ Catégories de secours — utilisées UNIQUEMENT si l'API ne répond pas.
// En temps normal on récupère la liste depuis le backend (voir useEffect plus bas).
const FALLBACK_CATEGORIES: Array<{ slug: string; name: string; emoji: string; color: string }> = [
  { slug: 'chaussures',  name: 'Chaussures',  emoji: '👟', color: 'from-blue-500/10 to-blue-500/5' },
  { slug: 'vetements',   name: 'Vêtements',   emoji: '👕', color: 'from-purple-500/10 to-purple-500/5' },
  { slug: 'accessoires', name: 'Accessoires', emoji: '👜', color: 'from-pink-500/10 to-pink-500/5' },
  { slug: 'parfums',     name: 'Parfums',     emoji: '✨', color: 'from-amber-500/10 to-amber-500/5' },
];

const CATEGORY_EMOJIS: Record<string, string> = {
  chaussures: '👟',
  vetements:  '👕',
  vetement:   '👕',
  accessoires:'👜',
  accessoire: '👜',
  parfums:    '✨',
  parfum:     '✨',
  sneakers:   '👟',
  sandales:   '🩴',
  sandale:    '🩴',
};

const CATEGORY_COLORS = [
  'from-blue-500/10 to-blue-500/5',
  'from-purple-500/10 to-purple-500/5',
  'from-pink-500/10 to-pink-500/5',
  'from-amber-500/10 to-amber-500/5',
  'from-cyan-500/10 to-cyan-500/5',
  'from-orange-500/10 to-orange-500/5',
  'from-emerald-500/10 to-emerald-500/5',
  'from-rose-500/10 to-rose-500/5',
];

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

// ────────────────────────────────────────────────────────────────
// 🔹 HELPERS — extraction d'une catégorie depuis la réponse API
// ────────────────────────────────────────────────────────────────

const extractCategories = (resp: any): Category[] => {
  if (!resp) return [];
  if (Array.isArray(resp?.categories)) return resp.categories;
  if (Array.isArray(resp?.data?.categories)) return resp.data.categories;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp)) return resp;
  return [];
};

// ═══════════════════════════════════════════════════════════════
// 🔹 HELPERS
// ═══════════════════════════════════════════════════════════════

const normalizeProducts = (data: any): Product[] => {
  if (!data) return [];
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.results))  return data.results;
  if (Array.isArray(data?.data?.products)) return data.data.products;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

const getProductImage = (product: Product): string => {
  if (!product.images || product.images.length === 0) {
    return '/placeholder-product.svg';
  }
  const img: any = product.images[0];
  return typeof img === 'string' ? img : img?.url || '/placeholder-product.svg';
};

// ═══════════════════════════════════════════════════════════════
// 🔹 COMPOSANT : ProductCard (mémoïsé)
// ═══════════════════════════════════════════════════════════════

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string, product: Product) => void;
  isWishlisted: boolean;
}

const ProductCard = React.memo(({
  product, onAddToCart, onToggleWishlist, isWishlisted,
}: ProductCardProps) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const imageUrl = getProductImage(product);
  const isOutOfStock = (product.totalStock || 0) <= 0;

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
      <Link href={`/products/${product.slug || product._id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted to-muted/50">
          {!imgError && (
            <>
              {!imgLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
              <NextImage
                src={imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                className={cn(
                  'object-cover transition-all duration-500',
                  'group-hover:scale-110',
                  imgLoaded ? 'opacity-100' : 'opacity-0',
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

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="px-4 py-2 bg-destructive text-white font-bold rounded-full text-sm">
                Rupture de stock
              </span>
            </div>
          )}

          {!isOutOfStock && new Date(product.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
            <div className="absolute top-3 left-3 px-3 py-1 bg-gradient-to-r from-accent to-purple-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Nouveau
            </div>
          )}

          <button
            onClick={handleWishlistClick}
            className={cn(
              'absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg',
              isWishlisted
                ? 'bg-red-500 text-white scale-110'
                : 'bg-white/90 text-muted-foreground hover:bg-white hover:scale-110',
            )}
            title={isWishlisted ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={cn('w-5 h-5 transition-all', isWishlisted && 'fill-current')} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {product.brand && (
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {product.brand}
            </p>
          )}
          <h3 className="font-semibold text-base line-clamp-2 group-hover:text-accent transition-colors min-h-[3rem]">
            {product.name}
          </h3>
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

      <div className="px-4 pb-4">
        <Button
          onClick={handleAddToCartClick}
          disabled={isOutOfStock}
          className={cn(
            'w-full gap-2 transition-all duration-300',
            isOutOfStock
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-gradient-to-r from-accent to-purple-500 hover:from-accent/90 hover:to-purple-500/90 shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5',
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
  const { add: addToCart } = useAddToCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false); // ← pour la barre de progression
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  // ✅ Catégories chargées depuis le backend (avec fallback local)
  const [categories, setCategories] = useState<typeof FALLBACK_CATEGORIES>(FALLBACK_CATEGORIES);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [searchInput, setSearchInput] = useState(''); // ← valeur immédiate pour l'UX
  const [searchQuery, setSearchQuery] = useState('');  // ← valeur debouncée pour l'API

  // Ref pour cleanup d'effet (anti-race-condition)
  const cancelledRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ═══════════════════════════════════════════════════════════════
  // 🔹 CHARGEMENT DES CATÉGORIES DEPUIS L'API (avec fallback)
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp: any = await categoryApi.getCategories();
        if (cancelled) return;
        const cats = extractCategories(resp);
        if (cats.length === 0) {
          // Garde le fallback si l'API n'a rien renvoyé
          return;
        }
        // ✅ Construit la liste UI à partir de ce que la BDD expose vraiment
        // → plus jamais de "catégorie absente" à cause d'un slug mal écrit en dur
        const uiCats = cats
          .filter((c) => c.isActive !== false)
          .map((c, i) => {
            const slug = c.slug || '';
            return {
              slug,
              name: c.name,
              emoji:
                CATEGORY_EMOJIS[slug] ||
                CATEGORY_EMOJIS[slug.toLowerCase()] ||
                '🛍️',
              color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
            };
          });
        if (uiCats.length > 0) setCategories(uiCats);
      } catch (err) {
        // Pas grave : on garde le fallback
        console.warn('⚠️ Impossible de charger les catégories, fallback utilisé:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // 🔹 LECTURE DU QUERY PARAM `?category=...` pour le deep-linking
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat && cat !== selectedCategory) {
      setSelectedCategory(cat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // 🔹 DEBOUNCE DE LA RECHERCHE
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery((prev) => (prev === searchInput ? prev : searchInput));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // ═══════════════════════════════════════════════════════════════
  // 🔹 FETCH PRODUCTS (un seul effet, deps explicites)
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    cancelledRef.current = false;

    const run = async () => {
      // Distingue premier chargement (squelette plein) vs refilter (barre inline)
      setProducts((prev) => {
        if (prev.length === 0) setLoading(true);
        else setRefetching(true);
        return prev;
      });
      setError(null);

      try {
        const params: Record<string, any> = {
          page: pagination.page,
          limit: PAGE_SIZE,
        };
        if (selectedCategory) params.category = selectedCategory;
        if (searchQuery)      params.search = searchQuery;
        if (sortBy)           params.sort = sortBy;

        const response: any = await productApi.getProducts(params);

        if (cancelledRef.current) return;

        const normalized = normalizeProducts(response);
        setProducts(normalized);
        // ✅ Le service renvoie PaginatedResponse<T> = { data, meta: { page, limit, total, pages } }
        setPagination((prev) => ({
          total: response?.meta?.total ?? normalized.length,
          page:  response?.meta?.page  ?? prev.page,
          pages: response?.meta?.pages ?? prev.pages,
        }));
      } catch (err: any) {
        if (cancelledRef.current) return;
        console.error('❌ Failed to load products:', err);
        setError(err?.message || 'Impossible de charger les produits');
        setProducts([]);
      } finally {
        if (!cancelledRef.current) {
          setLoading(false);
          setRefetching(false);
        }
      }
    };

    run();
    return () => {
      cancelledRef.current = true;
    };
  }, [selectedCategory, searchQuery, sortBy, pagination.page]);

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
      toast.error('Produit indisponible', { description: 'Ce produit est en rupture de stock' });
      return;
    }
    try {
      const res = await addToCart({ product, quantity: 1 });
      if (res.ok) {
        toast.success('Ajouté au panier', { description: product.name });
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Erreur lors de l'ajout au panier";
      if (message.includes('déjà') || message.includes('existant')) {
        toast.info('Quantité augmentée', { description: `${product.name} - +1 dans le panier` });
      } else {
        toast.error('Erreur', { description: message });
      }
    }
  }, [isAuthenticated, addToCart, router]);

  const handleCategoryChange = useCallback((slug: string) => {
    setSelectedCategory((prev) => (prev === slug ? '' : slug));
    setPagination((p) => ({ ...p, page: 1 }));
  }, []);

  const handleSortChange = useCallback((sort: string) => {
    setSortBy(sort);
    setPagination((p) => ({ ...p, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategory('');
    setSearchInput('');
    setSearchQuery('');
    setSortBy('-createdAt');
    setPagination((p) => ({ ...p, page: 1 }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setPagination((p) => ({ ...p, page }));
    // Scroll doux vers la grille
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
  }, []);

  // Compteur de filtres actifs (pour le bouton clear)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory) count++;
    if (searchQuery) count++;
    if (sortBy !== '-createdAt') count++;
    return count;
  }, [selectedCategory, searchQuery, sortBy]);

  // Map produit → wishlist (mémoïsée)
  const wishlistSet = useMemo(() => {
    const set = new Set<string>();
    // isInWishlist lit le store interne, donc stable
    products.forEach((p) => { if (isInWishlist(p._id)) set.add(p._id); });
    return set;
  }, [products, isInWishlist]);

  // ═══════════════════════════════════════════════════════════════
  // 🔹 SKELETON INITIAL (premier chargement)
  // ═══════════════════════════════════════════════════════════════

  const InitialSkeleton = (
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

  if (loading && products.length === 0) return InitialSkeleton;

  // ═══════════════════════════════════════════════════════════════
  // 🔹 MAIN RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-background">
      {/* 🛡️ Bloque clic-droit + drag sur <img>/<video> */}
      <MediaProtection />

      {/* ── Barre de progression pendant les refilters ─────────── */}
      {refetching && (
        <div
          className="fixed top-0 left-0 right-0 h-1 bg-muted overflow-hidden z-50"
          role="progressbar"
          aria-label="Filtrage en cours"
        >
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent animate-[indeterminate_1.2s_linear_infinite]" />
          <style jsx>{`
            @keyframes indeterminate {
              0%   { transform: translateX(-100%); }
              100% { transform: translateX(400%); }
            }
          `}</style>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
            Nos Produits
          </h1>
          <p className="text-muted-foreground">
            {pagination.total} produit{pagination.total !== 1 ? 's' : ''} disponible
            {pagination.total !== 1 ? 's' : ''}
            {refetching && (
              <span className="ml-2 inline-flex items-center gap-1 text-accent">
                <Loader2 className="w-3 h-3 animate-spin" />
                mise à jour…
              </span>
            )}
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 pr-9"
              aria-label="Rechercher un produit"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setSearchQuery(''); setPagination((p) => ({ ...p, page: 1 })); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Effacer la recherche"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <div className="hidden sm:flex gap-2 flex-wrap">
              <Button
                variant={!selectedCategory ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleCategoryChange('')}
                className={!selectedCategory ? 'bg-gradient-to-r from-accent to-purple-500' : ''}
              >
                Tous
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.slug}
                  variant={selectedCategory === cat.slug ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={selectedCategory === cat.slug ? 'bg-gradient-to-r from-accent to-purple-500' : ''}
                >
                  {cat.name}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="sm:hidden gap-2"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal className="w-4 h-4" /> Filtres
            </Button>

            <Select value={sortBy} onValueChange={handleSortChange}>
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

            {activeFilterCount > 0 && (
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
                  variant={!selectedCategory ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleCategoryChange('')}
                >
                  Tous
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.slug}
                    variant={selectedCategory === cat.slug ? 'primary' : 'outline'}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((p) => ({ ...p }))}
            >
              Réessayer
            </Button>
          </div>
        )}

        {/* Empty State */}
        {products.length === 0 && !loading ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl animate-in fade-in zoom-in duration-300">
            <Grid className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              Aucun produit ne correspond à votre recherche
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-200',
              refetching && 'opacity-60',
            )}
          >
            {products.map((product) => (
              <div key={product._id} className="animate-in fade-in duration-300">
                <ProductCard
                  product={product}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  isWishlisted={wishlistSet.has(product._id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1 || refetching}
              onClick={() => goToPage(pagination.page - 1)}
            >
              Précédent
            </Button>
            <span className="px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
              Page {pagination.page} sur {pagination.pages}
              {refetching && <Loader2 className="w-3 h-3 animate-spin text-accent" />}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.pages || refetching}
              onClick={() => goToPage(pagination.page + 1)}
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
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className={cn(
                  'p-6 bg-gradient-to-br border border-border rounded-2xl hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all text-center group',
                  cat.color,
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