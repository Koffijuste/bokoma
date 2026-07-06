import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recherche',
  description: 'Trouvez le produit parfait grâce à la recherche avancée Bokoma Store.',
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
