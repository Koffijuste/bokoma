import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mon Profil',
  description: 'Gérez votre profil, vos adresses et préférences Bokoma Store.',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
