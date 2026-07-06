// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter, Poppins, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SessionWatcher } from '@/components/SessionWatcher';
import { CookieBanner } from '@/components/legal/CookieBanner';
import RatingPromptHost from '@/components/features/RatingPromptHost';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
  preload: true,
});

// ✅ Police élégante pour le logo Bokoma — Playfair Display (serif chic, premium/luxe)
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
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
  // ✅ Manifest PWA auto-servi par Next.js depuis /app/manifest.webmanifest
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico',       sizes: 'any',     type: 'image/x-icon' },
      { url: '/icon.png',           sizes: '192x192', type: 'image/png' },
      { url: '/icon.png',           sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png',     sizes: '180x180', type: 'image/png' },
    ],
  },
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
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body
        className={`
          ${inter.variable} ${poppins.variable} ${playfair.variable}
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

          {/* 🍪 Bandeau cookies CNIL — global, bas de page */}
          <CookieBanner />

          {/* ⭐ Modale "noter ce produit" — déclenchée par useAddToCart depuis n'importe où */}
          <RatingPromptHost />
        </Providers>
      </body>
    </html>
  );
}