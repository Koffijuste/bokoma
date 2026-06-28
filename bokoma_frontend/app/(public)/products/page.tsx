// app/(public)/products/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, SlidersHorizontal, X, Loader2, Package, Filter, Grid } from 'lucide-react';
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
import { productApi } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';
import type { Product } from '@/types';
import { ProductCard } from '@/components/features/ProductCard';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Plus récents' },
  { value: 'createdAt', label: 'Plus anciens' },
  { value: '-basePrice', label: 'Prix décroissant' },
  { value: 'basePrice', label: 'Prix croissant' },
  { value: 'name', label: 'Nom A-Z' },
];

const CATEGORIES = [
  { slug: 'chaussures', name: 'Chaussures' },
  { slug: 'vetements', name: 'Vêtements' },
  { slug: 'accessoires', name: 'Accessoires' },
  { slug: 'parfums', name: 'Parfums' },
];

const normalizeProducts = (data: any): Product[] => {
  if (!data) return [];
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data?.products)) return data.data.products;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

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

    try {
      await addToCart({ product: product._id, quantity: 1 });
      toast.success(`${product.name} ajouté au panier`);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Erreur lors de l'ajout au panier";
      if (message.includes('déjà') || message.includes('existant')) {
        toast.info(`${product.name} - Quantité augmentée`);
      } else {
        toast.error(message);
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

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <h1 className="text-4xl font-bold mb-2">Nos Produits</h1>
            <p className="text-muted-foreground">Explorez notre catalogue complet</p>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-4xl font-bold mb-2">Nos Produits</h1>
          <p className="text-muted-foreground">{pagination.total} produit{pagination.total !== 1 ? 's' : ''} disponible{pagination.total !== 1 ? 's' : ''}</p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-card border border-border rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <div className="hidden sm:flex gap-2 flex-wrap">
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

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(selectedCategory || searchQuery || sortBy !== '-createdAt') && (
              <Button variant="ghost" size="icon" onClick={clearFilters} aria-label="Effacer les filtres">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

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
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchProducts}>
              Réessayer
            </Button>
          </div>
        )}

        {products.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl animate-in fade-in zoom-in duration-300">
            <Grid className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">Aucun produit ne correspond à votre recherche</p>
            <Button variant="outline" onClick={clearFilters}>
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <div key={product._id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                <ProductCard
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              </div>
            ))}
          </div>
        )}

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

        <section className="mt-16 pt-12 border-t border-border">
          <h2 className="text-2xl font-bold mb-6">Parcourir par Catégorie</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="p-4 bg-card border border-border rounded-xl hover:border-accent hover:shadow-md transition-all text-center group"
              >
                <p className="font-medium group-hover:text-accent transition">{cat.name}</p>
                <p className="text-xs text-muted-foreground mt-1">Voir les articles</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}