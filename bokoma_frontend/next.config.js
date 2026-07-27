// next.config.js - OPTIMISÉ & CORRIGÉ + SUPPORT CAPACITOR
/** @type {import('next').NextConfig} */

// ============================================================================
// 🔀 MODE BUILD
// ============================================================================
// - WEB  (par défaut)        : build Next.js normal, on garde le middleware
//                              Edge, les API rewrites, etc.
// - MOBILE (CAPACITOR_BUILD) : static export (output: 'export') vers le
//                              dossier `out/`, qu'on bundle ensuite dans
//                              l'app Android/iOS via `npx cap sync`.
//
// On lit la variable d'env `CAPACITOR_BUILD=1` (set par le script
// `npm run build:mobile`) pour switcher le mode.
// ============================================================================
const isCapacitor = process.env.CAPACITOR_BUILD === '1';

const nextConfig = {
  reactStrictMode: true,

  // ── Mode de rendu ────────────────────────────────────────────────────────
  // Web : standalone en Docker, normal ailleurs.
  // Mobile : static export obligatoire (Capacitor ne peut pas exécuter de
  //          Node server dans la WebView).
  ...(isCapacitor
    ? {
        output: 'export',
        // Force toutes les pages en SSG (pas d'ISR → pas de revalidation
        // dynamique en mobile). Les pages qui ont besoin de données
        // fraîches les chargent côté client via tes hooks existants
        // (useRequireAuth, useCart, etc.).
        //
        // ⚠️ Le middleware Edge n'est PAS exécuté en static export.
        //    C'est OK : tes hooks `useRequireAuth` et `useRequireAdmin`
        //    dans hooks/useAuth.ts font déjà la protection côté client
        //    (et ils étaient déjà actifs avant Capacitor — le middleware
        //    était juste une optimisation pour les bots/crawlers).
        //    En mobile, pas de bot, donc on n'a rien perdu.
        trailingSlash: true, // sert /products/ au lieu de /products
                             // (nécessaire pour que Capacitor serve
                             //  correctement les routes profondes)
        images: {
          // ⚠️ next/image requiert un serveur (loader par défaut). En static
          // export, le loader par défaut ne fonctionne pas. On désactive
          // l'optimisation : les <Image /> fallback sur <img> classique.
          // ✅ Aucune perte de perfs visible (toutes les images viennent
          // déjà de Cloudinary qui sert de l'AVIF/WebP automatiquement).
          unoptimized: true,
        },
      }
    : {
        // 🐳 Standalone build pour Docker / Railway (image ~10x plus légère)
        output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
      }),

  // 🗑️ Supprime console.log en production pour réduire le bundle
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },

  // 🖼️ Configuration images UNIQUE et complète
  images: isCapacitor
    ? {
        // En mobile : on désactive l'optimisation (cf. commentaire plus haut)
        unoptimized: true,
        // On garde la même whitelist de hosts (next/image lit les URLs
        // distantes pour générer les srcset, même quand unoptimized).
        remotePatterns: [
          { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
          { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
          { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
        ],
      }
    : {
        remotePatterns: [
          { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
          { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
          { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
        ],
        formats: ['image/avif', 'image/webp'], // ✅ AVIF en premier
        minimumCacheTTL: 60 * 60 * 24 * 30, // ✅ 30 jours
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      },

  // 🗜️ Compression activée
  compress: true,

  // 🔍 Source maps désactivées en prod pour réduire la taille
  productionBrowserSourceMaps: false,

  // ⚡ Expérimental : optimisation des imports
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns', 'framer-motion'],
  },

  // 🛣️ Typed routes (désactivé pour flexibilité)
  typedRoutes: false,

  // ============================================================================
  // 🔁 REWRITES — Proxy /api/* vers le backend (WEB ONLY)
  // ============================================================================
  // En Capacitor, pas de proxy : l'app native appelle directement le backend
  // Railway via `NEXT_PUBLIC_API_URL` (configuré dans `.env.mobile`).
  // ============================================================================
  ...(isCapacitor
    ? {}
    : {
        async rewrites() {
          const backendUrl =
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
          return [
            {
              source: '/api/:path*',
              destination: `${backendUrl.replace(/\/$/, '')}/:path*`,
            },
          ];
        },
      }),

  // ============================================================================
  // 🛡️ HEADERS DE SÉCURITÉ — WEB ONLY
  // ============================================================================
  // En static export, next.config.js ne peut pas set des headers de réponse
  // (les fichiers sont servis par un serveur statique tiers / WebView native).
  // On les garde donc en mode web uniquement.
  // ============================================================================
  ...(isCapacitor
    ? {}
    : {
        async headers() {
          const isDev = process.env.NODE_ENV !== 'production';
          const connectSrc = isDev
            ? "'self' https: http://localhost:* http://127.0.0.1:* ws: wss: https://api.cinetpay.com https://api.cinetpay.net https://*.cinetpay.com https://bokoma-production.up.railway.app"
            : "'self' https: https://api.cinetpay.com https://api.cinetpay.net https://*.cinetpay.com https://bokoma-production.up.railway.app wss:";

          const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdn.cinetpay.com https://*.cinetpay.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https: res.cloudinary.com https://*.fbcdn.net https://*.cdninstagram.com https://pbs.twimg.com",
            "media-src 'self' https: https://*.cloudinary.com https://*.tiktok.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "frame-src 'self' https://*.cinetpay.com https://*.cinetpay.net https://secure.cinetpay.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.facebook.com https://web.facebook.com https://www.tiktok.com https://www.instagram.com https://platform.twitter.com",
            `connect-src ${connectSrc}`,
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self' https://*.cinetpay.com",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
          ].join('; ');

          return [
            {
              source: '/(.*)',
              headers: [
                { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                {
                  key: 'Permissions-Policy',
                  value: [
                    'camera=(self)',
                    'microphone=()',
                    'geolocation=(self)',
                    'interest-cohort=()',
                    'payment=(self "https://*.cinetpay.com")',
                    'usb=()',
                    'magnetometer=()',
                    'gyroscope=()',
                    'accelerometer=()',
                  ].join(', '),
                },
                { key: 'Content-Security-Policy', value: csp },
                { key: 'X-DNS-Prefetch-Control', value: 'off' },
              ],
            },
            {
              source: '/_next/image(.*)',
              headers: [
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
