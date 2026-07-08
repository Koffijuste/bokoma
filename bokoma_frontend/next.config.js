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
    const csp = [
      "default-src 'self'",
      // Next.js + scripts inline (theme bootstrap, états Radix)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.cinetpay.com https://*.cinetpay.com",
      // Styles inline nécessaires pour Tailwind + Radix animations
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: res.cloudinary.com https://*.fbcdn.net https://*.cdninstagram.com https://pbs.twimg.com",
      "media-src 'self' https: https://*.cloudinary.com https://*.tiktok.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      // CinetPay ouvre des iframes + popups de paiement
      "frame-src 'self' https://*.cinetpay.com https://*.cinetpay.net https://secure.cinetpay.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.facebook.com https://web.facebook.com https://www.tiktok.com https://www.instagram.com https://platform.twitter.com",
      // Connexions : backend Railway, Cloudinary, CinetPay API
      "connect-src 'self' https: https://api.cinetpay.com https://api.cinetpay.net https://*.cinetpay.com https://bokoma-production.up.railway.app",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.cinetpay.com",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        // Toutes les routes
        source: '/:path*',
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
        source: '/_next/image:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;