import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Catégories',
  description: 'Parcourez nos produits par catégorie.',
};

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
