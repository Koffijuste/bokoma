import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Galerie',
  description: 'Découvrez les créations Bokoma Store : photos et vidéos de nos collections, lookbooks et événements.',
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
