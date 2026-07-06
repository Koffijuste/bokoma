import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Comment Bokoma Store protège et utilise vos données personnelles.',
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
