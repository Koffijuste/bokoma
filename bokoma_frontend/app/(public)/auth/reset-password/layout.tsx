import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Réinitialisation du mot de passe',
  description: 'Choisissez un nouveau mot de passe pour votre compte.',
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
