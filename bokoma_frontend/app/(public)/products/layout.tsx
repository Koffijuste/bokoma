import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nos Produits',
  description: 'Explorez notre catalogue complet : chaussures, vêtements, parfums et accessoires.',
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
