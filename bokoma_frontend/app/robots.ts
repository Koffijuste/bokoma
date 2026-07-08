// app/robots.ts
// ============================================================================
// 🤖 ROBOTS.TXT — Directives pour les moteurs de recherche et crawlers
// ============================================================================
// Généré automatiquement par Next.js à partir de ce fichier (route /robots.txt).
//
// Politique :
//   - Toutes les pages PUBLIQUES sont crawlables (Google, Bing, etc.)
//   - Les routes ADMIN, AUTH, COMPTE, CHECKOUT, PANIER sont bloquées pour
//     éviter l'indexation (et le scraping) du tableau de bord et des pages
//     sensibles.
//   - Les bots malveillants connus sont explicitement listés dans Disallow
//     pour réduire la surface d'attaque (crawler d'email, scanners).
//
// Référence : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
// ============================================================================

import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bokoma.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Admin
          '/dashboard',
          '/dashboard/*',
          // Auth
          '/auth',
          '/auth/*',
          // Compte utilisateur
          '/profile',
          '/profile/*',
          '/orders',
          '/orders/*',
          // Panier & checkout
          '/cart',
          '/cart/*',
          '/checkout',
          '/checkout/*',
          // Wishlist
          '/wishlist',
          // API
          '/api',
          '/api/*',
        ],
      },
      // Bots malveillants connus
      { userAgent: 'AhrefsBot',   disallow: '/' },
      { userAgent: 'SemrushBot',  disallow: '/' },
      { userAgent: 'MJ12bot',     disallow: '/' },
      { userAgent: 'DotBot',      disallow: '/' },
      { userAgent: 'Mail.ru',     disallow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
