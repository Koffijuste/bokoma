// app/(public)/categories/page.tsx
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Package, AlertCircle, Loader2 } from 'lucide-react';
import { useFetch } from '@/hooks';
import { categoryApi } from '@/services';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import type { Category, ApiResponse } from '@/types';

const extractCategories = (data: any): Category[] => {
  if (!data) return [];
  if (Array.isArray(data.categories)) return data.categories;
  if (Array.isArray(data.data?.categories)) return data.data.categories;
  if (Array.isArray(data)) return data;
  return [];
};

const getCategoryImageUrl = (url: string | undefined, width = 400): string => {
  if (!url) return '';
  if (url.includes('res.cloudinary.com')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_fill,g_auto/`);
  }
  return url;
};

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x300/e2e8f0/64748b?text=Catégorie&font=montserrat';

interface CategoryCardProps {
  category: Category;
  index: number;
}

const CategoryCard: React.FC<CategoryCardProps> = React.memo(({ category, index }) => {
  const imageUrl = useMemo(() => {
    const url = typeof category.image === 'string' ? category.image : category.image?.url;
    return getCategoryImageUrl(url) || PLACEHOLDER_IMAGE;
  }, [category.image]);

  const productCount = (category as any).children?.length || 0;

  return (
    <article
      className="group overflow-hidden rounded-3xl border border-border bg-card transition-all hover:shadow-lg hover:border-accent/50 hover:-translate-y-1 duration-300 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Link 
        href={`${ROUTES.PRODUCTS}?category=${category.slug}`}
        className="block relative h-48 overflow-hidden bg-muted"
      >
        <img
          src={imageUrl}
          alt={category.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== PLACEHOLDER_IMAGE) {
              target.src = PLACEHOLDER_IMAGE;
            }
          }}
        />
        
        {productCount > 0 && (
          <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-background/90 backdrop-blur rounded-full">
            {productCount} produit{productCount > 1 ? 's' : ''}
          </span>
        )}
      </Link>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-xl font-semibold group-hover:text-accent transition-colors">
            <Link href={`${ROUTES.PRODUCTS}?category=${category.slug}`}>
              {category.name}
            </Link>
          </h2>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[3rem]">
          {category.description || 'Découvrez notre collection.'}
        </p>

        <div className="flex items-center justify-between">
          <Link
            href={`${ROUTES.PRODUCTS}?category=${category.slug}`}
            className="text-sm font-medium text-accent hover:text-accent/80 inline-flex items-center gap-1 transition"
          >
            Voir les produits
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          
          <Button size="sm" variant="outline" asChild>
            <Link href={`${ROUTES.PRODUCTS}?category=${category.slug}`}>
              Explorer
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
});

CategoryCard.displayName = 'CategoryCard';

export default function CategoriesPage() {
  const { data: apiResponse, loading, error, refetch } = useFetch<ApiResponse<{ categories: Category[] }>>(
    () => categoryApi.getCategories(),
    []
  );

  const categories = useMemo(() => extractCategories(apiResponse), [apiResponse]);

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-12 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 text-accent animate-spin mx-auto" />
          <p className="text-muted-foreground">Chargement des catégories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen px-4 py-12 flex items-center justify-center">
        <div className="max-w-md w-full rounded-3xl border border-destructive/50 bg-destructive/10 p-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-destructive">Erreur de chargement</h2>
          <p className="text-muted-foreground">{error.message}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => refetch()} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Réessayer
            </Button>
            <Button variant="outline" asChild>
              <Link href={ROUTES.PRODUCTS}>Voir les produits</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className="min-h-screen px-4 py-12 flex items-center justify-center">
        <div className="max-w-md w-full rounded-3xl border border-border bg-card p-12 text-center space-y-4 animate-in fade-in zoom-in duration-300">
          <Package className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">Aucune catégorie</h2>
          <p className="text-muted-foreground">
            Aucune catégorie n'est disponible pour le moment. Revenez plus tard !
          </p>
          <Button variant="outline" asChild>
            <Link href={ROUTES.PRODUCTS}>Voir tous les produits</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-4xl font-bold mb-3">Nos Catégories</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Parcourez nos catégories de produits et trouvez votre style. 
            Chaque collection est soigneusement sélectionnée pour vous offrir qualité et élégance.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, index) => (
            <CategoryCard 
              key={category._id || category.slug || index} 
              category={category} 
              index={index} 
            />
          ))}
        </div>

        <div className="mt-16 text-center text-sm text-muted-foreground animate-in fade-in duration-500 delay-300">
          <p>
            Vous ne trouvez pas ce que vous cherchez ?{' '}
            <Link href={ROUTES.SEARCH} className="text-accent hover:underline font-medium">
              Utilisez la recherche
            </Link>{' '}
            pour explorer tous nos produits.
          </p>
        </div>
      </div>
    </div>
  );
}