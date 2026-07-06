import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Détail de la commande',
  description: 'Détails, suivi et historique d\'une commande.',
};

export default function ClientOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
