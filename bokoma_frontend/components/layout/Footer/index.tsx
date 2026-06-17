// components/layout/Footer.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, 
  Sparkles, CreditCard, Truck, Shield, Headphones, ArrowRight
} from 'lucide-react';
import { ROUTES } from '@/constants';

export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-background to-muted/30 border-t border-border/50 mt-auto">
      
      {/* Features Bar */}
      <div className="border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: 'Livraison rapide', desc: 'Partout en Côte d\'Ivoire' },
              { icon: Shield, title: 'Paiement sécurisé', desc: 'Transactions 100% sûres' },
              { icon: CreditCard, title: 'Multi-paiements', desc: 'Mobile Money, CB, Cash' },
              { icon: Headphones, title: 'Support 24/7', desc: 'Assistance dédiée' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/10 to-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          {/* Company */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-accent/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
                  Bokoma
                </span>
                <p className="text-[10px] text-muted-foreground tracking-widest uppercase -mt-1">
                  Premium Store
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Découvrez notre sélection premium de produits de luxe et tendance.
            </p>
            <div className="flex gap-2">
              {[
                { icon: Facebook, href: 'https://facebook.com' },
                { icon: Twitter, href: 'https://twitter.com' },
                { icon: Instagram, href: 'https://instagram.com' },
                { icon: Linkedin, href: 'https://linkedin.com' },
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-muted/50 hover:bg-accent/10 hover:text-accent flex items-center justify-center transition-all hover:scale-110"
                  aria-label="Social link"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Products */}
          <div>
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

          {/* Account */}
          <div>
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

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a href="mailto:contact@bokoma.com" className="hover:text-accent transition-colors">
                    contact@bokoma.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Phone className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Téléphone</p>
                  <a href="tel:+2250798300782" className="hover:text-accent transition-colors">
                    +225 07 98 30 07 82
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Adresse</p>
                  <span>Abidjan, Côte d'Ivoire</span>
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
            <Link href={ROUTES.FAQ || '/faq'} className="hover:text-accent transition-colors">
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}


export default Footer;