import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mes Commandes',
  description: 'Suivez vos commandes et leur statut en temps réel.',
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
