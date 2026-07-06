import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Tableau de Bord',
    template: '%s · Admin | Bokoma Store',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
