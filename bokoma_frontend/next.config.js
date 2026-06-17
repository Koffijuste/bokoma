// next.config.js - OPTIMISÉ & CORRIGÉ
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
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
      // 🎯 Ajoutez d'autres domaines ici si besoin
      // { protocol: 'https', hostname: 'votre-cdn.com', pathname: '/**' },
    ],
    formats: ['image/webp', 'image/avif'], // ✅ Ajout AVIF pour meilleure compression
    minimumCacheTTL: 60, // ✅ Cache minimum 60 secondes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // 📦 Output standalone pour déploiement Docker/VM optimisé
  //output: 'standalone',
  
  // 🗜️ Compression activée
  compress: true,
  
  // 🔍 Source maps désactivées en prod pour réduire la taille
  productionBrowserSourceMaps: false,
  
  // ⚡ Expérimental : optimisation des imports lucide-react
  experimental: {
    //optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  
  // 🛣️ Typed routes (désactivé pour flexibilité)
  typedRoutes: false,
};

export default nextConfig;