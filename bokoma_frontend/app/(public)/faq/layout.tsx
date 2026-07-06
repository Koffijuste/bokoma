import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Trouvez les réponses aux questions les plus fréquentes sur Bokoma Store.',
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
