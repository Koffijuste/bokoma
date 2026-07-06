import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Générales',
  description: 'Conditions Générales d\'Utilisation de la boutique Bokoma Store.',
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
