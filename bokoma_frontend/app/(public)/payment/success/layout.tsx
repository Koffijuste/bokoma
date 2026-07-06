import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Paiement réussi',
  description: 'Votre paiement a été traité avec succès. Merci pour votre commande !',
};

export default function PaymentSuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
