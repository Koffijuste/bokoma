import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Paramètres du compte',
  description: 'Mettez à jour vos informations personnelles et préférences.',
};

export default function ProfileSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
