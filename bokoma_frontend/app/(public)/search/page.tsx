// app/(public)/search/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import { ProductCard } from './_components/ProductCard';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q = '' } = await searchParams;
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Résultats de recherche</h1>
      <p className="text-muted-foreground mb-6">
        {q ? `Recherche : "${q}"` : 'Saisissez votre recherche dans la barre ci-dessus.'}
      </p>
      <Suspense fallback={<div className="text-muted-foreground">Chargement…</div>}>
        <ProductCard product={null as any} />
      </Suspense>
      <Link href="/products" className="text-accent hover:underline">Voir tous les produits</Link>
    </div>
  );
}
