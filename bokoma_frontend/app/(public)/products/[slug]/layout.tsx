import type { Metadata, ResolvingMetadata } from 'next';

// Le composant client utilise le slug du route.
// On ne peut pas exporter de metadata depuis un page.tsx 'use client',
// donc on délègue la logique dynamique à ce Server Component.
type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  // On tente de récupérer le titre du produit ; en cas d'échec, on affiche le slug.
  let productName = slug;
  try {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE ||
      'http://localhost:5000/api/v1';
    const res = await fetch(`${apiBase}/products/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const json: any = await res.json();
      const product = json?.data?.product ?? json?.product ?? json?.data;
      if (product?.name) productName = String(product.name);
    }
  } catch {
    // silencieux : on garde le slug comme fallback
  }

  return {
    title: productName,
    description: `Découvrez ${productName} sur Bokoma Store — qualité premium et livraison rapide.`,
  };
}

export default async function ProductDetailLayout({ children, params }: Props) {
  // params lu pour s'assurer que Next.js invalide le cache des métadonnées.
  void params;
  return children;
}
