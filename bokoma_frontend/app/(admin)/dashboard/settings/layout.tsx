import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Paramètres',
  description: 'Configurez votre boutique Bokoma Store.',
};

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
