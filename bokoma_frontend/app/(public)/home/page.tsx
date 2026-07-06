// app/(public)/home/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, Sparkles, TrendingUp, Star, Truck, Shield, 
  Headphones, ChevronRight, Heart, ShoppingBag 
} from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';

// 🎯 CONFIGURATION CENTRALE DES IMAGES
export const IMAGE_CONFIG = {
  hero: {
    placeholder: 'https://placehold.co/800x600/7c3aed/ffffff?text=Collection+2026&font=montserrat',
  },
  categories: {
    chaussures: '/chaussures/ensemble_paires.jpeg',
    vetements: '/vetements/pull_over_1.png',
    accessoires: '/accessoires/Iphone15.png',
    parfums: '/parfums/Parfum1.png',
  },
  products: {
    1: '/chaussures/Sandale_red_bokoma.jpeg',
    2: '/parfums/Parfum2.png',
    3: '/vetements/short_blanc_homme.png',
    4: '/accessoires/Iphone15.png',
  },
  // ✅ NOUVEAU : Avatars personnalisés pour les témoignages
  avatars: {
    default: 'https://placehold.co/100x100/e9d5ff/333333?text=👤&font=montserrat',
    marie: 'Avatar/Fille_Aicha.jpg',
    kouassi: 'Avatar/Boy_USA.jpg',
    aicha: 'Avatar/Fille_Marie.jpg',
    // Avatars alternatifs (si les photos Unsplash ne chargent pas)
//    marieFallback: 'Avatar/Fille_Aicha.jpg',
//    kouassiFallback: 'Avatar/Boy_USA.jpg',
//    aichaFallback: 'Avatar/Fille_Marie.jpg',
  }
} as const;

// 🎯 Types
interface Category {
  name: string;
  slug: keyof typeof IMAGE_CONFIG.categories;
  count: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  rating: number;
  imageKey: keyof typeof IMAGE_CONFIG.products;
}

// ✅ Interface mise à jour avec avatar
interface Testimonial {
  name: string;
  role: string;
  text: string;
  rating: number;
  avatar: string;
//  avatarFallback: string;
}

// 🎯 Données
const categories: Category[] = [
  { name: 'Chaussures', slug: 'chaussures', count: 450 },
  { name: 'Vêtements', slug: 'vetements', count: 680 },
  { name: 'Accessoires', slug: 'accessoires', count: 320 },
  { name: 'Parfums', slug: 'parfums', count: 150 },
];

const featuredProducts: Product[] = [
  { id: 1, name: 'Sendales Bokoma', price: 15000, rating: 9, imageKey: 1 },
  { id: 2, name: 'Parfum Élégance', price: 45000, rating: 4.9, imageKey: 2 },
  { id: 3, name: 'Sac en Cuir', price: 120000, rating: 4.7, imageKey: 3 },
  { id: 4, name: 'Iphone 15 pro', price: 250000, rating: 4.9, imageKey: 4 },
];

// ✅ Témoignages avec avatars personnalisés
const testimonials: Testimonial[] = [
  { 
    name: 'Marie K.', 
    role: 'Cliente fidèle', 
    text: 'Qualité exceptionnelle et livraison rapide. Je recommande !', 
    rating: 5,
    avatar: IMAGE_CONFIG.avatars.marie,
//    avatarFallback: IMAGE_CONFIG.avatars.marieFallback,
  },
  { 
    name: 'Kouassi B.', 
    role: 'Collectionneur', 
    text: 'Le service client est au top. Mes achats sont toujours parfaits.', 
    rating: 5,
    avatar: IMAGE_CONFIG.avatars.kouassi,
//    avatarFallback: IMAGE_CONFIG.avatars.kouassiFallback,
  },
  { 
    name: 'Aïcha D.', 
    role: 'Influenceuse mode', 
    text: 'Bokoma Store est devenu mon go-to pour le style premium.', 
    rating: 5,
    avatar: IMAGE_CONFIG.avatars.aicha,
//    avatarFallback: IMAGE_CONFIG.avatars.aichaFallback,
  },
];

const trustBadges = [
  { icon: Truck, label: 'Livraison Gratuite', desc: 'Dès 100 000 FCFA' },
  { icon: Shield, label: 'Paiement Sécurisé', desc: 'Cryptage SSL 256-bit' },
  { icon: Headphones, label: 'Support 24/7', desc: 'Assistance dédiée' },
  { icon: Heart, label: 'Satisfait ou Remboursé', desc: '24 heures pour changer d\'avis' },
];

// 🎯 Composant Image optimisé avec NextImage
const SafeImage = ({ 
  src, 
  alt, 
  className = '',
  priority = false,
  fallback = 'https://placehold.co/400x400/e2e8f0/64748b?text=Image&font=montserrat'
}: { 
  src: string; 
  alt: string; 
  className?: string;
  priority?: boolean;
  fallback?: string;
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);

  const handleError = () => {
    if (!error && imgSrc !== fallback) {
      setImgSrc(fallback);
      setError(true);
    }
  };

  return (
    <NextImage
      src={imgSrc}
      alt={alt}
      fill
      className={`object-cover ${className}`}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      priority={priority}
      onError={handleError}
    />
  );
};

// ✅ NOUVEAU : Composant Avatar dédié pour les témoignages
const TestimonialAvatar = ({ 
  src, 
  fallback,
  alt 
}: { 
  src: string; 
  fallback: string;
  alt: string;
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);

  const handleError = () => {
    if (!error && imgSrc !== fallback) {
      setImgSrc(fallback);
      setError(true);
    }
  };

  return (
    <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-accent/20">
      <img
        src={imgSrc}
        alt={alt}
        className="w-full h-full object-cover"
        onError={handleError}
      />
    </div>
  );
};

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCategory(prev => (prev + 1) % categories.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(amount);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      
      {/* 🎬 Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-pink-500/10 animate-pulse" />
        
        <div className="relative max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center py-12">
          {/* Left Content */}
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 animate-in fade-in slide-in-from-top-4 duration-500 delay-200">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">
                Nouvelle Collection 2026
              </span>
            </div>

            <h1 className="text-4xl lg:text-6xl xl:text-7xl font-bold leading-tight">
              Votre Style,
              <br />
              <span className="gradient-text">Notre Excellence</span>
            </h1>

            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl">
              Découvrez une sélection exclusive de produits premium : chaussures, vêtements, 
              accessoires et parfums pour affirmer votre personnalité avec élégance.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href={ROUTES.PRODUCTS}>
                <Button size="lg" variant="primary" className="w-full sm:w-auto group">
                  Découvrir la Collection
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
                <span className="w-4 h-4 border-2 border-current rounded-full" />
                Voir la Vidéo
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-border">
              {trustBadges.map((badge) => (
                <div
                  key={badge.label}
                  className="flex flex-col items-center sm:items-start text-center sm:text-left animate-in fade-in"
                >
                  <badge.icon className="w-5 h-5 text-accent mb-2" />
                  <p className="text-sm font-medium">{badge.label}</p>
                  <p className="text-xs text-muted-foreground">{badge.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual - Product Showcase */}
          <div className="relative hidden lg:block animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
            <div className="relative w-full aspect-square">
              {categories.map((cat, i) => (
                <div
                  key={cat.slug}
                  className={`absolute inset-0 transition-all duration-500 ${
                    i === activeCategory
                      ? 'opacity-100 scale-100 z-10'
                      : 'opacity-0 scale-95 z-0 pointer-events-none'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-pink-500/20 rounded-3xl blur-2xl" />
                  
                  <div className="relative h-full glass rounded-3xl overflow-hidden border border-border/50">
                    <div className="relative w-full h-full">
                      <SafeImage 
                        src={IMAGE_CONFIG.categories[cat.slug]} 
                        alt={`Collection ${cat.name}`}
                        className="transition-transform duration-500 group-hover:scale-105"
                        priority={i === 0}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <p className="text-xl font-bold text-foreground mb-1">{cat.name}</p>
                      <p className="text-sm text-muted-foreground mb-3">{cat.count} articles</p>
                      <Link href={`/products?category=${cat.slug}`} className="text-sm text-accent hover:underline inline-flex items-center gap-1">
                        Explorer <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Category Dots */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {categories.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveCategory(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === activeCategory ? 'bg-accent w-8' : 'bg-muted-foreground/50 w-2'
                    }`}
                    aria-label={`Voir catégorie ${categories[i].name}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-muted-foreground/50 rounded-full flex items-start justify-center p-1">
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* 🛍️ Categories Section */}
      <section id="categories" className="py-24 px-4 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Collections
            </span>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Explorez Nos <span className="gradient-text">Catégories</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Chaque collection est soigneusement curatée pour vous offrir le meilleur du style et de la qualité.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="group relative h-72 rounded-3xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300 animate-in fade-in"
              >
                <div className="absolute inset-0">
                  <SafeImage 
                    src={IMAGE_CONFIG.categories[cat.slug]} 
                    alt={cat.name}
                    className="transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-900/70 via-purple-900/50 to-pink-900/70" />
                </div>
                
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <div className="transform group-hover:translate-y-[-4px] transition-transform">
                    <p className="text-2xl font-bold text-white mb-1">{cat.name}</p>
                    <p className="text-white/80 text-sm mb-3">{cat.count} articles disponibles</p>
                    <span className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium">
                      Découvrir 
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href={ROUTES.PRODUCTS}>
              <Button variant="outline" size="lg" className="gap-2">
                Voir toutes les catégories
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ✨ Featured Products */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
                <TrendingUp className="w-4 h-4" />
                Tendances
              </span>
              <h2 className="text-3xl lg:text-5xl font-bold mb-4">
                Nos <span className="gradient-text">Best-Sellers</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl">
                Les produits les plus plébiscités par notre communauté. Qualité garantie, style assuré.
              </p>
            </div>
            <Link href={ROUTES.PRODUCTS} className="text-accent hover:underline inline-flex items-center gap-2 font-medium">
              Voir toute la boutique <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-in fade-in"
              >
                <div className="relative aspect-square">
                  <SafeImage 
                    src={IMAGE_CONFIG.products[product.imageKey]} 
                    alt={product.name}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                  
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                    <Button size="icon" variant="secondary" className="rounded-full" aria-label="Ajouter aux favoris" onClick={(e) => e.preventDefault()}>
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="primary" className="rounded-full" aria-label="Ajouter au panier" onClick={(e) => e.preventDefault()}>
                      <ShoppingBag className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, j) => (
                      <Star 
                        key={j} 
                        className={`w-4 h-4 ${j < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} 
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">({product.rating})</span>
                  </div>
                  <h3 className="font-semibold mb-1 line-clamp-1">{product.name}</h3>
                  <p className="text-lg font-bold text-accent">{formatPrice(product.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 💬 Testimonials - ✅ MIS À JOUR avec avatars personnalisés */}
      <section id="testimonials" className="py-24 px-4 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <Star className="w-4 h-4" />
              Témoignages
            </span>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Ce Que Disent <span className="gradient-text">Nos Clients</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              La satisfaction de nos clients est notre plus grande fierté. Découvrez leurs expériences.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-card border border-border rounded-2xl p-6 hover:border-accent/50 hover:shadow-lg transition-all duration-300 animate-in fade-in"
              >
                {/* Étoiles */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                {/* Texte du témoignage */}
                <p className="text-muted-foreground mb-6 italic leading-relaxed">"{t.text}"</p>
                
                {/* ✅ Avatar personnalisé + Infos client */}
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <TestimonialAvatar 
                    src={t.avatar}
                    fallback={t.avatarFallback}
                    alt={`Photo de ${t.name}`}
                  />
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 📬 Newsletter CTA */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl p-8 lg:p-12 text-center overflow-hidden animate-in fade-in zoom-in duration-700">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <Sparkles className="w-12 h-12 mx-auto mb-6 text-white/90" />
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Restez Inspiré
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Inscrivez-vous à notre newsletter pour recevoir en avant-première nos nouvelles collections, 
                offres exclusives et conseils style.
              </p>
              
              <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="votre@email.com"
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                  aria-label="Adresse email"
                />
                <Button type="submit" variant="secondary" size="lg" className="bg-orange text-purple-600 hover:bg-white/90">
                  S'inscrire
                </Button>
              </form>
              
              <p className="text-white/60 text-xs mt-4">
                En vous inscrivant, vous acceptez notre politique de confidentialité. Désinscription à tout moment.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}