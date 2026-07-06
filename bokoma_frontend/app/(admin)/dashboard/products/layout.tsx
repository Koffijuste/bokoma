import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gestion des Produits',
  description: 'Créez, modifiez et organisez votre catalogue produit.',
};

export default function AdminProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
