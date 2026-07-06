import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Paiement échoué',
  description: 'Une erreur est survenue lors du paiement. Veuillez réessayer.',
};

export default function PaymentFailureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
