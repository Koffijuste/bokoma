import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gestion des Catégories',
  description: 'Administrez les catégories de votre catalogue.',
};

export default function AdminCategoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
