import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Panier | Bokoma Store',
  description: 'Consultez et gérez votre panier d\'achat',
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
