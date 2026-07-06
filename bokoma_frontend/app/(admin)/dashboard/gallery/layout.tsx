import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Galerie — gestion',
  description: 'Gérez les médias de la galerie Bokoma Store.',
};

export default function AdminGalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
