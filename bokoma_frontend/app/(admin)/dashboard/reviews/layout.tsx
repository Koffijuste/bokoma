import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Modération des Avis',
  description: 'Approuvez ou rejetez les avis produits des clients.',
};

export default function AdminReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
