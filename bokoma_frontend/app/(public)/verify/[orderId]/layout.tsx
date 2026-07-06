import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vérification de la commande',
  description: 'Vérification du statut de votre commande.',
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
