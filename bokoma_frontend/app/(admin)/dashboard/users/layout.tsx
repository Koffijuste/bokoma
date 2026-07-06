import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gestion des Utilisateurs',
  description: 'Gérez les comptes clients et les permissions.',
};

export default function AdminUsersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
