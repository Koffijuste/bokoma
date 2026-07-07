// app/(public)/guide/page.tsx
// ============================================================================
// 🛍️ GUIDE D'ACHAT — Comment utiliser Bokoma Store
// ============================================================================
// Page pédagogique pour les nouveaux clients : créer un compte, parcourir,
// ajouter au panier, commander, payer, suivre la livraison, retours, etc.
// ============================================================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  UserPlus, Search, Heart, ShoppingCart, CreditCard, CheckCircle2,
  Truck, Package, MessageSquare, Sparkles, ArrowRight, ChevronRight,
  Smartphone, Wallet, MapPin, Star, ShieldCheck, Clock, RotateCcw,
  HelpCircle, Zap, Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/helpers';

// ───────────────────────────────────────────────────────────────────────────
// 🔹 ÉTAPES DU PARCOURS D'ACHAT
// ───────────────────────────────────────────────────────────────────────────

type Step = {
  number: number;
  title: string;
  emoji: string;
  icon: any;
  color: string;
  description: string;
  bullets: string[];
  cta?: { label: string; href: string };
  tip?: string;
};

const STEPS: Step[] = [
  {
    number: 1,
    title: 'Créez votre compte Bokoma',
    emoji: '👋',
    icon: UserPlus,
    color: 'from-accent to-pink-500',
    description:
      "L'inscription est gratuite et prend moins d'une minute. Elle vous permet de suivre vos commandes, sauvegarder vos favoris et accélérer vos prochains achats.",
    bullets: [
      "Cliquez sur « Inscription » en haut à droite du site.",
      "Renseignez prénom, nom, email et un mot de passe solide (8 caractères min, 1 majuscule, 1 chiffre).",
      "Confirmez votre adresse email via le lien que nous vous envoyons.",
      "Complétez votre profil (téléphone, adresse de livraison) pour gagner du temps au checkout.",
    ],
    cta: { label: "Créer mon compte", href: '/auth/register' },
    tip: "Astuce : votre compte vous permet aussi de noter les produits et de laisser des avis utiles à la communauté.",
  },
  {
    number: 2,
    title: 'Explorez le catalogue',
    emoji: '🔍',
    icon: Search,
    color: 'from-blue-500 to-cyan-500',
    description:
      "Parcourez notre sélection de vêtements, chaussures, accessoires et parfums. Plusieurs moyens de trouver ce qui vous plaît.",
    bullets: [
      "Page « Produits » : liste complète avec filtres (catégorie, prix, tri) et recherche par mots-clés.",
      "Page « Catégories » : accès direct par type de produit (Sneakers, Sandales, Vêtements, etc.).",
      "Page « Galerie » : inspirations visuelles et looks en images.",
      "Sur la page d'un produit : photos, description, prix, stock disponible et avis clients.",
    ],
    cta: { label: "Voir le catalogue", href: '/products' },
    tip: "Astuce : utilisez la barre de recherche en haut du site pour trouver un produit en un clin d'œil.",
  },
  {
    number: 3,
    title: 'Sauvegardez vos coups de cœur',
    emoji: '❤️',
    icon: Heart,
    color: 'from-rose-500 to-pink-500',
    description:
      "Le bouton cœur sur chaque fiche produit ajoute l'article à votre liste de favoris. Pratique pour comparer ou retrouver un article vu plus tard.",
    bullets: [
      "Cliquez sur l'icône ❤️ sur la fiche produit pour l'ajouter à vos favoris.",
      "Retrouvez votre wishlist complète depuis le menu « Favoris ».",
      "Recevez une alerte si un article favori passe en promotion (avec votre accord).",
      "Ajoutez plusieurs tailles/couleurs pour comparer avant d'acheter.",
    ],
    cta: { label: "Ma wishlist", href: '/wishlist' },
    tip: "Astuce : la wishlist est synchronisée entre votre téléphone et votre ordinateur si vous êtes connecté.",
  },
  {
    number: 4,
    title: 'Ajoutez au panier',
    emoji: '🛒',
    icon: ShoppingCart,
    color: 'from-amber-500 to-orange-500',
    description:
      "Sur la fiche produit, choisissez la taille, la couleur et la quantité, puis cliquez sur « Ajouter au panier ». Vous pouvez continuer vos achats ou passer commande immédiatement.",
    bullets: [
      "Sélectionnez taille, couleur et quantité sur la fiche produit.",
      "Cliquez sur « Ajouter au panier » — une notification confirme l'ajout.",
      "Le panier reste accessible en haut à droite (icône 🛒) à tout moment.",
      "Vous pouvez ajuster les quantités ou retirer un article depuis la page Panier.",
    ],
    cta: { label: "Aller au panier", href: '/cart' },
    tip: "Astuce : votre panier est conservé 30 jours même si vous vous déconnectez. Pas de stress, vous pouvez y revenir.",
  },
  {
    number: 5,
    title: 'Validez votre commande',
    emoji: '📝',
    icon: CheckCircle2,
    color: 'from-emerald-500 to-green-500',
    description:
      "Le checkout vous guide en 4 étapes claires : adresse de livraison, mode de paiement, récapitulatif et confirmation. Aucune mauvaise surprise.",
    bullets: [
      "Étape 1 : vérifiez ou ajoutez votre adresse de livraison.",
      "Étape 2 : choisissez votre mode de paiement (Mobile Money, carte, paiement à la livraison).",
      "Étape 3 : saisissez un code promo si vous en avez un, puis vérifiez le récapitulatif.",
      "Étape 4 : confirmez la commande. Un email de confirmation vous est envoyé immédiatement.",
    ],
    cta: { label: "Voir le checkout", href: '/checkout' },
    tip: "Astuce : vous pouvez annuler une commande tant qu'elle n'a pas été expédiée (statut « En préparation »).",
  },
  {
    number: 6,
    title: 'Payez en toute sécurité',
    emoji: '💳',
    icon: CreditCard,
    color: 'from-purple-500 to-indigo-500',
    description:
      "Plusieurs modes de paiement adaptés au marché local, tous sécurisés par notre passerelle CinetPay (certifiée PCI-DSS).",
    bullets: [
      "Mobile Money : Orange Money, MTN Money, Wave, Moov Money.",
      "Carte bancaire : Visa, Mastercard (paiement 3D Secure).",
      "Paiement à la livraison : en espèces à la réception du colis (zones éligibles).",
      "Toutes les transactions sont chiffrées en HTTPS/TLS.",
    ],
    tip: "Astuce : aucune donnée bancaire n'est stockée sur nos serveurs. CinetPay gère tout le processus de manière sécurisée.",
  },
  {
    number: 7,
    title: 'Suivez votre livraison',
    emoji: '🚚',
    icon: Truck,
    color: 'from-blue-600 to-indigo-600',
    description:
      "Dès l'expédition, vous recevez un email/SMS avec le numéro de suivi. Suivez l'avancement en temps réel depuis votre espace.",
    bullets: [
      "Statuts possibles : En préparation → Expédiée → En cours de livraison → Livrée.",
      "À Abidjan : livraison sous 24-48 h.",
      "Autres villes / pays : 2 à 7 jours ouvrés selon la destination.",
      "Le livreur vous contacte avant le passage.",
    ],
    cta: { label: "Mes commandes", href: '/profile?tab=orders' },
    tip: "Astuce : vous pouvez refuser un colis à la livraison si l'emballage est endommagé. Signalez-le-nous ensuite.",
  },
  {
    number: 8,
    title: 'Évaluez & profitez !',
    emoji: '⭐',
    icon: Star,
    color: 'from-yellow-500 to-amber-500',
    description:
      "Une fois votre commande reçue, partagez votre avis sur les produits. Vos retours aident les autres clients et nous permettent de nous améliorer.",
    bullets: [
      "Donnez une note de 1 à 5 étoiles.",
      "Rédigez un commentaire : qualité, taille, confort, rendu, SAV…",
      "Ajoutez des photos pour aider la communauté.",
      "Vos avis sont publiés après vérification par notre équipe.",
    ],
    cta: { label: "Donner mon avis", href: '/feedback' },
    tip: "Astuce : vous pouvez aussi contacter notre équipe depuis la page « Avis & Retours » si vous rencontrez un souci.",
  },
];

// ───────────────────────────────────────────────────────────────────────────
// 🔹 RACCOURCIS UTILES
// ───────────────────────────────────────────────────────────────────────────

const QUICK_TIPS = [
  {
    icon: Smartphone,
    title: 'Application mobile-friendly',
    desc: "Le site est 100 % responsive. Ajoutez un raccourci sur l'écran d'accueil de votre téléphone pour un accès rapide.",
    color: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    icon: Wallet,
    title: 'Mobile Money accepté',
    desc: "Orange, MTN, Wave, Moov : payez en quelques secondes depuis votre compte mobile, où que vous soyez.",
    color: 'from-emerald-500/10 to-green-500/10',
  },
  {
    icon: MapPin,
    title: 'Livraison en Afrique de l\'Ouest',
    desc: "Abidjan en 24-48 h, et plusieurs pays voisins desservis. Suivi de bout en bout.",
    color: 'from-purple-500/10 to-pink-500/10',
  },
  {
    icon: ShieldCheck,
    title: 'Paiement sécurisé',
    desc: "Transactions chiffrées (HTTPS), passerelle CinetPay certifiée PCI-DSS, aucune donnée bancaire stockée.",
    color: 'from-accent/10 to-purple-500/10',
  },
  {
    icon: Clock,
    title: 'Support rapide',
    desc: "Email, téléphone et formulaire de contact. Réponse sous 24 h ouvrées en moyenne.",
    color: 'from-amber-500/10 to-orange-500/10',
  },
  {
    icon: RotateCcw,
    title: 'Retours 7 jours',
    desc: "Pas satisfait ? Vous avez 7 jours pour changer d'avis. Procédure simple depuis votre espace.",
    color: 'from-rose-500/10 to-pink-500/10',
  },
];

// ───────────────────────────────────────────────────────────────────────────
// 🔹 COMPOSANT : STEP CARD
// ───────────────────────────────────────────────────────────────────────────

const StepCard: React.FC<{ step: Step; index: number }> = ({ step, index }) => {
  const Icon = step.icon;
  const isReversed = index % 2 === 1;

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Numéro + Icône */}
      <div className={cn('lg:col-span-4', isReversed && 'lg:order-2')}>
        <div className="relative max-w-md mx-auto">
          {/* Halo gradient */}
          <div className={cn('absolute inset-0 rounded-3xl bg-gradient-to-br opacity-20 blur-2xl', step.color)} />
          <Card className="relative overflow-hidden border-2">
            <CardContent className="p-8 text-center space-y-4">
              <div className={cn(
                'w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-xl',
                step.color
              )}>
                <Icon className="w-10 h-10" />
              </div>
              <div className="text-5xl">{step.emoji}</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Étape {step.number} / {STEPS.length}
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1">{step.title}</h3>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contenu */}
      <div className={cn('lg:col-span-8', isReversed && 'lg:order-1')}>
        <div className="space-y-4">
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {step.description}
          </p>
          <ul className="space-y-2.5">
            {step.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-sm sm:text-base">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-gradient-to-br text-white', step.color)}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {step.tip && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>Astuce :</strong> {step.tip}
              </p>
            </div>
          )}

          {step.cta && (
            <Button
              asChild
              size="lg"
              className={cn('bg-gradient-to-r text-white', step.color)}
            >
              <Link href={step.cta.href}>
                {step.cta.label}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 COMPOSANT PRINCIPAL
// ───────────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const [progress, setProgress] = useState(0);

  // Barre de progression simple : on incrémente au scroll
  React.useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      setProgress(Math.min(100, Math.max(0, scrolled)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Barre de progression ────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <div
          className="h-full bg-gradient-to-r from-accent to-purple-500 transition-all duration-150"
          style={{ width: `${progress}%` }}
          aria-label="Progression de lecture"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-12 sm:py-20 bg-gradient-to-br from-accent/5 via-background to-purple-500/5 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider mb-4">
            <Zap className="w-3 h-3" />
            Guide du débutant
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Comment acheter sur <span className="bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">Bokoma Store</span>
          </h1>
          <p className="text-muted-foreground mt-3 text-base sm:text-lg">
            Du premier clic à la livraison chez vous, on vous explique tout. En 8 étapes,
            vous maîtriserez le site comme un pro.
          </p>

          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-xl mx-auto">
            {[
              { value: '8', label: 'étapes' },
              { value: '5 min', label: 'pour commander' },
              { value: '24-48h', label: 'livraison Abidjan' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Boutons d'action rapides */}
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <Button asChild size="lg" className="bg-gradient-to-r from-accent to-purple-500 text-white">
              <Link href="/products">
                <Eye className="w-4 h-4 mr-2" />
                Commencer mes achats
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/auth/register">
                <UserPlus className="w-4 h-4 mr-2" />
                Créer un compte
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Sommaire visuel ─────────────────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold">
            Votre parcours en <span className="text-accent">8 étapes</span>
          </h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Cliquez sur une étape pour y accéder directement.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <a
                key={step.number}
                href={`#step-${step.number}`}
                className="group flex flex-col items-center gap-2 p-3 rounded-2xl border border-border bg-card hover:border-accent/50 hover:shadow-lg transition-all"
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform',
                  step.color
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-center leading-tight">
                  {step.number}. {step.title}
                </p>
              </a>
            );
          })}
        </div>
      </section>

      {/* ── Étapes détaillées ───────────────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16 sm:space-y-24">
        {STEPS.map((step, i) => (
          <div key={step.number} id={`step-${step.number}`} className="scroll-mt-20">
            <StepCard step={step} index={i} />
          </div>
        ))}
      </section>

      {/* ── Encart : tout ce qu'il faut savoir en un coup d'œil ──────── */}
      <section className="bg-gradient-to-br from-muted/30 to-muted/10 border-y border-border py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3 h-3" />
              Tout ce qu'il faut savoir
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Bokoma Store en 6 points
            </h2>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-2xl mx-auto">
              L'essentiel à retenir pour une expérience d'achat simple, sûre et agréable.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_TIPS.map((tip, i) => {
              const Icon = tip.icon;
              return (
                <Card
                  key={i}
                  className={cn(
                    'group hover:border-accent/50 hover:shadow-lg transition-all duration-300',
                    'animate-in fade-in slide-in-from-bottom-2'
                  )}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', tip.color)}>
                      <Icon className="w-6 h-6 text-foreground" />
                    </div>
                    <h3 className="font-bold text-base">{tip.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{tip.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Card className="overflow-hidden border-2 border-accent/30 bg-gradient-to-br from-accent/5 via-background to-purple-500/5">
          <CardContent className="p-6 sm:p-10 text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              Prêt à vous lancer ?
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold max-w-2xl mx-auto">
              Vous avez toutes les cartes en main 🎉
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Créez votre compte en 1 minute, explorez le catalogue, et passez votre première
              commande. Notre équipe reste disponible à chaque étape.
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button asChild size="lg" className="bg-gradient-to-r from-accent to-purple-500 text-white">
                <Link href="/products">
                  <Package className="w-4 h-4 mr-2" />
                  Découvrir les produits
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/register">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Créer mon compte
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liens utiles */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: HelpCircle, label: 'Questions fréquentes', href: '/faq', desc: 'Toutes les réponses' },
            { icon: MessageSquare, label: 'Nous contacter', href: '/feedback', desc: 'Email, téléphone, formulaire' },
            { icon: Package, label: 'Voir le catalogue', href: '/products', desc: 'Tous les produits' },
          ].map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="group flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-accent/40 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{l.label}</p>
                  <p className="text-xs text-muted-foreground">{l.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
