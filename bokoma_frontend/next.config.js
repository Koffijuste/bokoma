// next.config.js - OPTIMISÉ & CORRIGÉ
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 🐳 Standalone build pour Docker / Railway (image ~10x plus légère)
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,

  // 🗑️ Supprime console.log en production pour réduire le bundle
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },

  // 🖼️ Configuration images UNIQUE et complète
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'], // ✅ AVIF en premier (meilleure compression)
    minimumCacheTTL: 60 * 60 * 24 * 30, // ✅ 30 jours de cache (au lieu de 60s)
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
  // 🔁 REWRITES — Proxy /api/* vers le backend
  // ============================================================================
  // ✅ Bug fix (10/07/2026) : on déclare aussi le rewrite ici (en plus de
  //    vercel.json) pour qu'il fonctionne en dev local (next dev) ET en
  //    production Vercel. Sans ça, l'URL relative '/api/v1' du client
  //    axios renverrait 404 sur localhost.
  //
  //    La variable d'env NEXT_PUBLIC_API_URL est utilisée comme cible :
  //      - dev : http://localhost:5000/api/v1
  //      - prod : laissé à NEXT_PUBLIC_API_URL côté Vercel (qui devrait
  //        pointer sur Railway) MAIS en pratique le rewrite vercel.json
  //        prend le dessus sur Vercel.
  // ============================================================================
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

  // ============================================================================
  // 🛡️ HEADERS DE SÉCURITÉ — appliqués sur toutes les réponses
  // ============================================================================
  // Réponse à l'audit HackerAI du 08/07/2026 (score 5.8/10 → cible ≥ 8.0/10)
  //   - HSTS                  : forcer HTTPS 1 an + subdomains
  //   - X-Frame-Options       : anti-clickjacking (DENY)
  //   - X-Content-Type-Options: anti MIME sniffing
  //   - Referrer-Policy       : limiter la fuite de referrer
  //   - Permissions-Policy    : verrouiller les APIs navigateur sensibles
  //   - Content-Security-Policy: anti XSS (CinetPay + Cloudinary whitelistés)
  // ============================================================================
  async headers() {
    // ✅ Bug fix (10/07/2026) : en dev local, le frontend (localhost:3000)
    // doit pouvoir joindre le backend (localhost:5000). La CSP prod
    // n'autorise que https:, ce qui bloque http://localhost:5000 avec
    // "Refused to connect because it violates the document's Content
    // Security Policy". On ajoute donc http://localhost:* en dev.
    const isDev = process.env.NODE_ENV !== 'production';
    const connectSrc = isDev
      ? "'self' https: http://localhost:* http://127.0.0.1:* ws: wss: https://api.cinetpay.com https://api.cinetpay.net https://*.cinetpay.com https://bokoma-production.up.railway.app"
      : "'self' https: https://api.cinetpay.com https://api.cinetpay.net https://*.cinetpay.com https://bokoma-production.up.railway.app wss:";

    const csp = [
      "default-src 'self'",
      // Next.js + scripts inline (theme bootstrap, états Radix)
      "script-src 'self' 'unsafe-inline' https://cdn.cinetpay.com https://*.cinetpay.com",
      // Styles inline nécessaires pour Tailwind + Radix animations
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: res.cloudinary.com https://*.fbcdn.net https://*.cdninstagram.com https://pbs.twimg.com",
      "media-src 'self' https: https://*.cloudinary.com https://*.tiktok.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      // CinetPay ouvre des iframes + popups de paiement
      "frame-src 'self' https://*.cinetpay.com https://*.cinetpay.net https://secure.cinetpay.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.facebook.com https://web.facebook.com https://www.tiktok.com https://www.instagram.com https://platform.twitter.com",
      // Connexions : backend Railway (prod) + localhost (dev) + CinetPay API
      `connect-src ${connectSrc}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.cinetpay.com",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        // Toutes les routes
        // Note: ancien `/:path*` supprimé (path-to-regexp v6+ exige prefix+suffix
        // pour les repeating params). `/(.*)` regex matche tout de manière sûre.
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
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
          // Désactivé pour ne pas casser le debug dev (à activer en prod stricte)
          // { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
      {
        // Les uploads Cloudinary restent servies sans cookies (public CDN)
        // Note: ancien `/_next/image:path*` remplacé par `/_next/image(.*)`
        // (path-to-regexp v6+ n'accepte plus les repeating params sans suffix).
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;