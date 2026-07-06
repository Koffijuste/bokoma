import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Favoris',
  description: 'Retrouvez vos produits préférés sur Bokoma Store.',
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
