// app/layout.tsx — Version CORRECTE (un seul Footer)
import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Bokoma Store - Premium E-commerce',
  description: 'Découvrez notre sélection premium de produits de luxe',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={`${inter.variable} ${poppins.variable} font-sans antialiased flex flex-col min-h-screen`}>
        <Providers>
          <Header />
          <main className="flex-1 pt-16 lg:pt-20">
            {children}
          </main>
          <Footer /> {/* ✅ UN SEUL Footer ici */}
        </Providers>
      </body>
    </html>
  );
}