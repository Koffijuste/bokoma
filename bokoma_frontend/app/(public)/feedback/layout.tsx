import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Avis & Retours',
  description: 'Donnez votre avis sur Bokoma Store : retours sur le site, produits, difficultés d\'achat et suggestions. Vos retours nous aident à nous améliorer.',
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
