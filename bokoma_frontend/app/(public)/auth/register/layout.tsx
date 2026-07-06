import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inscription',
  description: 'Créez votre compte Bokoma Store et profitez d\'avantages exclusifs.',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
