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
};

export default nextConfig;