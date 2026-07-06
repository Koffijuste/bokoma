import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gestion des Coupons',
  description: 'Créez et gérez vos codes promotionnels.',
};

export default function AdminCouponsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
