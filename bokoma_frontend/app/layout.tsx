// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SessionWatcher } from '@/components/SessionWatcher';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
  adjustFontFallback: false, // ✅ désactive le calcul de fallback qui trigger le bug
  preload: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#0a0a0a' },
  ],
};

export const metadata: Metadata = {
  title: {
    default: 'Bokoma Store — Premium E-commerce',
    template: '%s | Bokoma Store',
  },
  description: 'Découvrez notre sélection premium de produits de luxe livrés en Côte d\'Ivoire.',
  keywords: ['e-commerce', 'luxe', 'Abidjan', 'Côte d\'Ivoire', 'livraison'],
  authors: [{ name: 'Bokoma Store' }],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'fr_CI',
    siteName: 'Bokoma Store',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning évite le flash du thème sombre/clair
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`
          ${inter.variable} ${poppins.variable}
          font-sans antialiased
          flex flex-col min-h-screen
          bg-background text-foreground
        `}
      >
        <Providers>
          {/* Écoute les événements de session expirée émis par api.ts */}
          <SessionWatcher />

          <Header />

          <main className="flex-1 pt-16 lg:pt-20">
            {children}
          </main>

          <Footer />
        </Providers>
      </body>
    </html>
  );
}