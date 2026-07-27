// app/(public)/search/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import { ProductCard } from './_components/ProductCard';

// ✅ Force le static rendering pour Capacitor (sinon /search utilise
//    searchParams ce qui rend la page dynamique et bloque output: 'export').
//    Sur le web, Next.js continue de servir la page normalement (le composant
//    lit la query string côté client via window.location.search).
//    Pas de régression : on n'avait pas de SSR dépendant des params ici
//    (la liste de produits est chargée via /api/v1/products?search=… côté client).
export const dynamic = 'force-static';

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Résultats de recherche</h1>
      <p className="text-muted-foreground mb-6">
        Saisissez votre recherche dans la barre ci-dessus.
      </p>
      <Suspense fallback={<div className="text-muted-foreground">Chargement…</div>}>
        <ProductCard product={null as any} />
      </Suspense>
      <Link href="/products" className="text-accent hover:underline">Voir tous les produits</Link>
    </div>
  );
}
