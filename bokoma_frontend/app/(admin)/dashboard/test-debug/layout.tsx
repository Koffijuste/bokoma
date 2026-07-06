import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test & Debug',
  description: 'Outils de diagnostic pour les développeurs.',
};

export default function AdminTestDebugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
