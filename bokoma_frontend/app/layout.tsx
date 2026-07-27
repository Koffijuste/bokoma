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
import {
  PWAInstallPrompt,
  PWAFloatingButton,
  PWAInstalledToast,
} from '@/components/PWAInstallPrompt';

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

// ── Détection du mode build (web vs Capacitor) ────────────────────────────
// On injecte un attribut `data-platform` sur <html> côté client via un
// script inline. C'est ce qui permet ensuite à globals.css de cibler
// `.is-capacitor` sans casser la version web (qui n'a pas la classe).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // ✅ Empêche le pinch-to-zoom sur iOS Safari (UX native mobile)
  //    Tout en gardant l'accessibilité (user-scalable désactivé).
  maximumScale: 1,
  userScalable: false,
  // ✅ viewport-fit=cover permet à la WebView de s'étendre sous l'encoche
  //    / Dynamic Island. Combiné avec env(safe-area-inset-*) dans le CSS,
  //    on obtient un layout "edge-to-edge" propre sans contenu caché.
  viewportFit: 'cover',
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
        {/* 📱 iOS Smart App Banner — propose l'install aux utilisateurs Safari iOS */}
        <meta name="apple-itunes-app" content="app-id=000000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Bokoma" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Bokoma Store" />
        <meta name="msapplication-TileColor" content="#0a0a0a" />
        <meta name="msapplication-square150x150logo" content="/icon.png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="apple-touch-startup-image" href="/icon.png" />
        {/*
          📱 Script de détection de plateforme (Capacitor vs Web).
          Injecté AVANT le 1er render React pour éviter tout flash de style.
          Idempotent : si window.Capacitor n'existe pas (cas web), on
          ne set rien → globals.css reste sur le style web normal.
        */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
                    document.documentElement.classList.add('is-capacitor');
                    document.documentElement.setAttribute('data-platform', 'capacitor');
                  } else {
                    document.documentElement.setAttribute('data-platform', 'web');
                  }
                } catch (e) {
                  document.documentElement.setAttribute('data-platform', 'web');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`
          ${inter.variable} ${poppins.variable} ${playfair.variable}
          font-sans antialiased
          flex flex-col min-h-screen
          bg-background text-foreground
          safe-area-top safe-area-bottom
        `}
      >
        <Providers>
          {/* Écoute les événements de session expirée émis par api.ts */}
          <SessionWatcher />

          <Header />

          <main className="flex-1 pt-16 lg:pt-20 pt-safe">
            {children}
          </main>

          <Footer />

          {/* 🍪 Bandeau cookies CNIL — global, bas de page */}
          <CookieBanner />

          {/* ⭐ Modale "noter ce produit" — déclenchée par useAddToCart depuis n'importe où */}
          <RatingPromptHost />

          {/* 📱 PWA : install prompt + floating button + confirmation toast */}
          <PWAInstallPrompt />
          <PWAFloatingButton />
          <PWAInstalledToast />
        </Providers>
      </body>
    </html>
  );
}