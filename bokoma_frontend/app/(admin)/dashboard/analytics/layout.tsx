import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Statistiques',
  description: 'Tableaux de bord et analyses de votre boutique.',
};

export default function AdminAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
