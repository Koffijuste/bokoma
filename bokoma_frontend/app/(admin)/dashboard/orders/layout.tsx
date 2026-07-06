import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gestion des Commandes',
  description: 'Suivez et traitez les commandes clients.',
};

export default function AdminOrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
