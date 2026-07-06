import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accueil',
  description: 'Découvrez Bokoma Store — la sélection premium de produits tendance livrés en Côte d\'Ivoire.',
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
