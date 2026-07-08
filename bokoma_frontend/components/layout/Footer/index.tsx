// components/layout/Footer.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import {
  Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin,
  CreditCard, Truck, Shield, Headphones, ArrowRight, ImageIcon, MessageSquare, BookOpen
} from 'lucide-react';
import { ROUTES } from '@/constants';

// ❌ Pas d'email ni de téléphone en clair exposés publiquement (audit 08/07/2026).
//    Tout passe par la page /contact (formulaire sécurisé).
import { BrandLogo } from '@/components/brand/BrandLogo';
import { TikTokIcon } from '@/components/brand/TikTokIcon';
import { CookiePreferencesButton } from '@/components/legal/CookiePreferencesButton';

// 🛡️ Audit 09/07/2026 : les liens sociaux pointaient vers facebook.com,
// twitter.com, etc. en racine (= page d'accueil du réseau, PAS un profil
// Bokoma → 404 + mauvaise image de marque). On lit désormais les URLs
// depuis des variables d'env NEXT_PUBLIC_SOCIAL_*. Si la variable n'est
// pas définie, on RETIRE l'icône du footer (au lieu d'afficher un lien
// cassé). Pour activer : ajouter dans .env.local / Vercel :
//   NEXT_PUBLIC_SOCIAL_FACEBOOK=https://facebook.com/bokoma
//   NEXT_PUBLIC_SOCIAL_TWITTER=https://twitter.com/bokoma
//   NEXT_PUBLIC_SOCIAL_INSTAGRAM=https://instagram.com/bokoma
//   NEXT_PUBLIC_SOCIAL_TIKTOK=https://tiktok.com/@bokoma
//   NEXT_PUBLIC_SOCIAL_LINKEDIN=https://linkedin.com/company/bokoma
const SOCIAL_LINKS = [
  { key: 'FACEBOOK',  icon: Facebook,   label: 'Facebook'  },
  { key: 'INSTAGRAM', icon: Instagram,  label: 'Instagram' },
  { key: 'TIKTOK',    icon: TikTokIcon, label: 'TikTok'    },
  { key: 'TWITTER',   icon: Twitter,    label: 'X (Twitter)' },
  { key: 'LINKEDIN',  icon: Linkedin,   label: 'LinkedIn'  },
]
  .map(({ key, icon, label }) => ({
    icon,
    label,
    href: (process.env[`NEXT_PUBLIC_SOCIAL_${key}`] || '').trim(),
  }))
  .filter((s) => !!s.href && s.href !== '#' && /^https?:\/\//i.test(s.href));

export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-background to-muted/30 border-t border-border/50 mt-auto">
      <div className="border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: 'Livraison rapide', desc: 'Partout en Côte d\'Ivoire' },
              { icon: Shield, title: 'Paiement sécurisé', desc: 'Transactions 100% sûres' },
              { icon: CreditCard, title: 'Multi-paiements', desc: 'Mobile Money, CB, Cash' },
              { icon: Headphones, title: 'Support 24/7', desc: 'Assistance dédiée' },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/10 to-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-4">
              <BrandLogo size="md" />
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Découvrez notre sélection premium de produits de luxe et tendance.
            </p>
            <div className="flex gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-muted/50 hover:bg-accent/10 hover:text-accent flex items-center justify-center transition-all hover:scale-110"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Boutique</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Tous les produits', href: ROUTES.PRODUCTS },
                { label: 'Chaussures', href: `${ROUTES.PRODUCTS}?category=chaussures` },
                { label: 'Parfums', href: `${ROUTES.PRODUCTS}?category=parfums` },
                { label: 'Vêtements', href: `${ROUTES.PRODUCTS}?category=vetements` },
                { label: 'Accessoires', href: `${ROUTES.PRODUCTS}?category=accessoires` },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted-foreground hover:text-accent transition-colors flex items-center gap-1 group">
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Mon Compte</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Connexion', href: ROUTES.AUTH.LOGIN },
                { label: 'Inscription', href: ROUTES.AUTH.REGISTER },
                { label: 'Mon Profil', href: ROUTES.USER.PROFILE },
                { label: 'Mes Commandes', href: '/profile?tab=orders' },
                { label: 'Favoris', href: '/wishlist' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted-foreground hover:text-accent transition-colors flex items-center gap-1 group">
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Communauté</h4>
            <ul className="space-y-2 text-sm">
              {[
                { icon: BookOpen, label: "Guide d'achat", href: '/guide', desc: 'Comment acheter sur Bokoma' },
                { icon: ImageIcon, label: 'Galerie', href: ROUTES.GALLERY, desc: 'Nos créations en images & vidéos' },
                { icon: MessageSquare, label: 'Votre avis', href: ROUTES.FEEDBACK, desc: 'Suggestions, retours, difficultés' },
                { icon: Headphones, label: 'FAQ', href: ROUTES.FAQ, desc: 'Questions fréquentes' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-accent transition-colors flex items-start gap-2 group"
                  >
                    <link.icon className="w-4 h-4 mt-0.5 shrink-0 group-hover:text-accent transition-colors" />
                    <span>
                      <span className="font-medium flex items-center gap-1">{link.label} <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></span>
                      <span className="block text-xs text-muted-foreground/70">{link.desc}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Service client</p>
                  <Link
                    href="/contact"
                    className="hover:text-accent transition-colors font-medium"
                  >
                    Nous écrire →
                  </Link>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Phone className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Téléphone</p>
                  <span className="text-muted-foreground italic">
                    communiqué après prise de contact
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Adresse</p>
                  <span>537 Angré Djorogobité 1 terminus de bus, Abidjan, Côte d'Ivoire</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 my-8" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Bokoma Store. Tous droits réservés.</p>
          <div className="flex flex-wrap gap-4">
            <Link href={ROUTES.PRIVACY || '/privacy-policy'} className="hover:text-accent transition-colors">
              Confidentialité
            </Link>
            <Link href={ROUTES.TERMS || '/terms'} className="hover:text-accent transition-colors">
              Conditions
            </Link>
            <Link href="/guide" className="hover:text-accent transition-colors">
              Guide d'achat
            </Link>
            <Link href={ROUTES.FAQ || '/faq'} className="hover:text-accent transition-colors">
              FAQ
            </Link>
            <CookiePreferencesButton />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;