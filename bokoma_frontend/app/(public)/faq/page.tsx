// app/(public)/faq/page.tsx
// ============================================================================
// ❓ PAGE FAQ — Accordéon par catégorie, recherche instantanée, CTA support
// ============================================================================

'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle, Search, ChevronDown, MessageSquare, Mail,
  ShoppingBag, CreditCard, Truck, RotateCcw, User, Sparkles, ArrowRight,
  CheckCircle2, Package,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/helpers';

// ───────────────────────────────────────────────────────────────────────────
// 🔹 DONNÉES FAQ
// ───────────────────────────────────────────────────────────────────────────

type FaqItem = { q: string; a: React.ReactNode };
type FaqCategory = {
  id: string;
  label: string;
  icon: any;
  emoji: string;
  color: string;
  items: FaqItem[];
};

const FAQ: FaqCategory[] = [
  {
    id: 'commandes',
    label: 'Commandes',
    icon: ShoppingBag,
    emoji: '🛍️',
    color: 'from-accent/10 to-purple-500/10',
    items: [
      {
        q: 'Comment passer une commande sur Bokoma Store ?',
        a: (
          <>
            Rendez-vous sur la page <Link href="/products" className="text-accent hover:underline">Produits</Link>,
            ajoutez vos articles au panier, puis suivez le parcours de checkout : connexion (ou inscription),
            adresse de livraison, mode de paiement, validation. Un email de confirmation vous est envoyé
            dès que votre commande est enregistrée.
          </>
        ),
      },
      {
        q: 'Puis-je modifier ou annuler une commande après validation ?',
        a: (
          <>
            Tant que votre commande n'a pas été expédiée (statut <em>« En préparation »</em>),
            vous pouvez demander une annulation depuis <Link href="/profile?tab=orders" className="text-accent hover:underline">Mes Commandes</Link>
            {' '}ou en contactant le support. Une fois expédiée, l'annulation directe n'est plus possible
            mais vous pouvez refuser le colis à la livraison ou exercer votre droit de rétractation.
          </>
        ),
      },
      {
        q: 'Comment suivre l\'état de ma commande ?',
        a: (
          <>
            Connectez-vous à votre espace, puis ouvrez <Link href="/profile?tab=orders" className="text-accent hover:underline">Mes Commandes</Link>.
            Vous verrez le statut en temps réel : <em>En attente → En préparation → Expédiée → Livrée</em>.
            Un numéro de suivi est ajouté dès que le colis est remis au transporteur.
          </>
        ),
      },
      {
        q: 'Y a-t-il un montant minimum de commande ?',
        a: 'Non, il n\'y a pas de montant minimum. Vous pouvez commander un seul article si vous le souhaitez.',
      },
      {
        q: 'Puis-je commander sans créer de compte ?',
        a: (
          <>
            La création de compte est nécessaire pour passer commande : elle nous permet de lier vos
            achats à votre profil, de suivre vos livraisons et de faciliter le service après-vente.
            L'inscription prend moins d'une minute depuis <Link href="/auth/register" className="text-accent hover:underline">cette page</Link>.
          </>
        ),
      },
    ],
  },
  {
    id: 'paiement',
    label: 'Paiement',
    icon: CreditCard,
    emoji: '💳',
    color: 'from-emerald-500/10 to-cyan-500/10',
    items: [
      {
        q: 'Quels sont les moyens de paiement acceptés ?',
        a: (
          <>
            Nous acceptons plusieurs modes adaptés au marché local : <strong>Mobile Money</strong> (Orange Money,
            MTN Money, Wave, Moov Money), <strong>paiement à la livraison</strong> (Cash) et
            <strong> carte bancaire</strong> via notre passerelle CinetPay. Les options visibles au
            checkout dépendent de votre pays de livraison.
          </>
        ),
      },
      {
        q: 'Le paiement est-il sécurisé ?',
        a: (
          <>
            Oui. Toutes les transactions sont chiffrées (HTTPS/TLS) et traitées par CinetPay, une
            passerelle certifiée PCI-DSS. Nous ne stockons jamais vos numéros de carte sur nos serveurs.
          </>
        ),
      },
      {
        q: 'Puis-je utiliser un code promo ?',
        a: (
          <>
            Oui. Si vous disposez d'un code promo, saisissez-le à l'étape <em>« Récapitulatif »</em>
            du checkout, dans le champ <strong>« Code promo »</strong>. La réduction est appliquée
            immédiatement si le code est valide. Les codes sont à usage unique ou limités selon les
            conditions de l'offre.
          </>
        ),
      },
      {
        q: 'Le paiement à la livraison est-il disponible partout ?',
        a: 'Le paiement à la livraison est disponible dans toutes les villes desservies par notre logistique. Une petite surcharge peut s\'appliquer pour les zones éloignées, affichée avant la validation.',
      },
    ],
  },
  {
    id: 'livraison',
    label: 'Livraison',
    icon: Truck,
    emoji: '🚚',
    color: 'from-blue-500/10 to-indigo-500/10',
    items: [
      {
        q: 'Quels sont les délais et zones de livraison ?',
        a: 'Nous livrons partout en Côte d\'Ivoire, ainsi que dans plusieurs pays d\'Afrique de l\'Ouest. À Abidjan, comptez 24 à 48 h. Pour les autres villes et pays, les délais vont de 2 à 7 jours ouvrés selon la destination.',
      },
      {
        q: 'Combien coûte la livraison ?',
        a: 'Les frais de livraison sont calculés en fonction de la destination et du poids/volume du colis, et affichés au checkout avant paiement. La livraison est souvent offerte à partir d\'un certain montant — vérifiez les promotions en cours.',
      },
      {
        q: 'Comment se passe la livraison à Abidjan ?',
        a: 'Nos livreurs vous contactent par appel/SMS avant le passage. Vous pouvez planifier un créneau ou demander une livraison à une adresse spécifique (bureau, point relais). En cas d\'absence, un nouveau passage est reprogrammé sans frais.',
      },
      {
        q: 'Livrez-vous hors de Côte d\'Ivoire ?',
        a: 'Oui, nous livrons dans plusieurs pays d\'Afrique de l\'Ouest. Les délais et frais varient selon la destination. Renseignez votre pays au checkout pour voir les options disponibles.',
      },
    ],
  },
  {
    id: 'retours',
    label: 'Retours & Remboursements',
    icon: RotateCcw,
    emoji: '↩️',
    color: 'from-rose-500/10 to-pink-500/10',
    items: [
      {
        q: 'Puis-je retourner un article ?',
        a: 'Oui. Vous disposez d\'un délai de 7 jours après réception pour exercer votre droit de rétractation, sans justification. L\'article doit être retourné dans son état d\'origine (non porté, étiquettes intactes, emballage d\'origine).',
      },
      {
        q: 'Comment demander un retour ?',
        a: (
          <>
            Connectez-vous à votre espace, ouvrez la commande concernée dans
            {' '}<Link href="/profile?tab=orders" className="text-accent hover:underline">Mes Commandes</Link>
            {' '}et cliquez sur <em>« Demander un retour »</em>. Vous recevrez par email un bordereau
            et l\'adresse de retour. Les frais de retour sont à la charge du client sauf en cas de
            produit défectueux ou d\'erreur de notre part.
          </>
        ),
      },
      {
        q: 'Quand serai-je remboursé(e) ?',
        a: 'Après réception et vérification de l\'article retourné, le remboursement est déclenché sous 3 à 5 jours ouvrés, sur le même moyen de paiement que celui utilisé lors de la commande. Les frais de livraison initiaux ne sont pas remboursés sauf en cas de produit défectueux.',
      },
      {
        q: 'Que faire si je reçois un article défectueux ?',
        a: 'Contactez-nous immédiatement avec une photo du produit et du colis. Nous organisons un échange ou un remboursement intégral, frais de retour à notre charge.',
      },
    ],
  },
  {
    id: 'compte',
    label: 'Compte & Sécurité',
    icon: User,
    emoji: '👤',
    color: 'from-amber-500/10 to-orange-500/10',
    items: [
      {
        q: 'Comment créer un compte ?',
        a: (
          <>
            Cliquez sur <Link href="/auth/register" className="text-accent hover:underline">Inscription</Link>,
            remplissez vos informations (prénom, nom, email, mot de passe), validez. Un email de
            confirmation est envoyé. Vous pouvez ensuite vous connecter et compléter votre profil
            (téléphone, adresse de livraison) pour accélérer vos futures commandes.
          </>
        ),
      },
      {
        q: 'J\'ai oublié mon mot de passe, que faire ?',
        a: (
          <>
            Utilisez la page <Link href="/auth/forgot-password" className="text-accent hover:underline">Mot de passe oublié</Link> :
            saisissez votre email, vous recevez un code OTP à 6 chiffres pour définir un nouveau
            mot de passe. Pour des raisons de sécurité, le support ne peut pas voir votre mot de
            passe existant.
          </>
        ),
      },
      {
        q: 'Comment modifier mes informations personnelles ?',
        a: 'Rendez-vous dans votre profil (menu en haut à droite → Mon profil). Vous pouvez y modifier votre nom, email, téléphone, adresse de livraison et photo. Les changements sont enregistrés automatiquement.',
      },
      {
        q: 'Comment supprimer mon compte ?',
        a: 'Vous pouvez demander la suppression de votre compte depuis votre profil ou en contactant le support. La suppression est définitive après 30 jours (délai de rétractation légal). Vos données personnelles sont alors effacées conformément au RGPD.',
      },
    ],
  },
];

// ───────────────────────────────────────────────────────────────────────────
// 🔹 COMPOSANT : ITEM ACCORDÉON
// ───────────────────────────────────────────────────────────────────────────

const FaqAccordionItem: React.FC<{ item: FaqItem; defaultOpen?: boolean; query: string }> = ({
  item, defaultOpen, query,
}) => {
  const [open, setOpen] = useState(!!defaultOpen);

  // Surligne le terme recherché dans la question
  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(re);
    return parts.map((p, i) =>
      re.test(p) ? <mark key={i} className="bg-accent/20 text-accent rounded px-0.5">{p}</mark> : <React.Fragment key={i}>{p}</React.Fragment>
    );
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden transition-all',
        open ? 'border-accent/40 shadow-md' : 'border-border hover:border-accent/30'
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold text-sm sm:text-base">
          {highlight(item.q)}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300',
            open && 'rotate-180 text-accent'
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-300 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/50">
            <div className="pt-3">{item.a}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// 🔹 COMPOSANT PRINCIPAL
// ───────────────────────────────────────────────────────────────────────────

export default function FaqPage() {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ
      .filter((cat) => activeCat === 'all' || cat.id === activeCat)
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (it) =>
            !q ||
            it.q.toLowerCase().includes(q) ||
            (typeof it.a === 'string' && it.a.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [query, activeCat]);

  const totalCount = FAQ.reduce((s, c) => s + c.items.length, 0);
  const visibleCount = filtered.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative py-12 sm:py-20 bg-gradient-to-br from-accent/5 via-background to-purple-500/5 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider mb-4">
            <HelpCircle className="w-3 h-3" />
            Centre d'aide
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Questions <span className="bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">fréquentes</span>
          </h1>
          <p className="text-muted-foreground mt-3 text-base sm:text-lg">
            Tout ce qu'il faut savoir pour acheter sereinement sur Bokoma Store.
            Besoin d'autre chose ? Notre équipe est là.
          </p>

          {/* Recherche */}
          <div className="mt-8 relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans la FAQ (ex : livraison, paiement, retour...)"
              className="pl-11 h-12 text-base"
              aria-label="Rechercher dans la FAQ"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {visibleCount} réponse{visibleCount > 1 ? 's' : ''} sur {totalCount}
            {query && ` pour « ${query} »`}
          </p>
        </div>
      </section>

      {/* ── Filtres catégories ──────────────────────────────────────── */}
      <section className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setActiveCat('all')}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all whitespace-nowrap',
                activeCat === 'all'
                  ? 'bg-gradient-to-r from-accent to-purple-500 text-white border-transparent shadow-md'
                  : 'bg-card border-border hover:border-accent/40 text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
              Toutes les questions
            </button>
            {FAQ.map((cat) => {
              const Icon = cat.icon;
              const active = activeCat === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={cn(
                    'shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all whitespace-nowrap flex items-center gap-1.5',
                    active
                      ? 'bg-gradient-to-r from-accent to-purple-500 text-white border-transparent shadow-md'
                      : 'bg-card border-border hover:border-accent/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Contenu FAQ ─────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {filtered.length === 0 ? (
          <Card className="animate-in fade-in zoom-in duration-300">
            <CardContent className="p-10 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold mb-1">Aucun résultat</h3>
              <p className="text-sm text-muted-foreground">
                Aucune question ne correspond à « {query} ». Essayez d'autres mots-clés
                ou contactez-nous directement.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* ── Sommaire catégories (desktop) ── */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-24 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-3">
                  Catégories
                </p>
                {FAQ.map((cat) => {
                  const Icon = cat.icon;
                  const active = activeCat === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCat(cat.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all',
                        active
                          ? 'bg-accent/10 border border-accent/30 text-accent'
                          : 'hover:bg-muted/50 border border-transparent'
                      )}
                    >
                      <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0', cat.color)}>
                        <Icon className="w-4 h-4 text-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {cat.items.length} question{cat.items.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* ── Questions ── */}
            <div className="lg:col-span-9 space-y-8">
              {filtered.map((cat, ci) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.id}
                    id={`cat-${cat.id}`}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${ci * 80}ms` }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', cat.color)}>
                        <Icon className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold">
                          <span className="mr-2">{cat.emoji}</span>
                          {cat.label}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {cat.items.length} question{cat.items.length > 1 ? 's' : ''} dans cette catégorie
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {cat.items.map((item, i) => (
                        <FaqAccordionItem
                          key={i}
                          item={item}
                          defaultOpen={ci === 0 && i === 0 && !query}
                          query={query}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── CTA : pas trouvé ? ──────────────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Card className="overflow-hidden border-2 border-dashed border-accent/30 bg-gradient-to-br from-accent/5 via-background to-purple-500/5">
          <CardContent className="p-6 sm:p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider mb-3">
                  <MessageSquare className="w-3 h-3" />
                  Vous n'avez pas trouvé ?
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-2">
                  Notre équipe est là pour vous aider
                </h3>
                <p className="text-muted-foreground">
                  Une question spécifique, un souci avec une commande, ou simplement envie
                  d'en savoir plus ? Plusieurs moyens de nous contacter.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-accent to-purple-500 text-white"
                >
                  <Link href="/contact">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Nous contacter
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/feedback">
                    <Mail className="w-4 h-4 mr-2" />
                    Laisser un avis
                  </Link>
                </Button>
              </div>
            </div>

            {/* Bandeau confiance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 pt-6 border-t border-border/50">
              {[
                { icon: CheckCircle2, text: 'Réponse sous 24 h ouvrées' },
                { icon: Package, text: 'Suivi personnalisé de votre commande' },
                { icon: Sparkles, text: 'Équipe basée en Côte d\'Ivoire' },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <b.icon className="w-4 h-4 text-accent shrink-0" />
                  <span>{b.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lien guide d'achat */}
        <div className="mt-6 text-center">
          <Link
            href="/guide"
            className="inline-flex items-center gap-2 text-sm text-accent hover:underline font-medium"
          >
            Nouveau sur Bokoma ? Découvrez notre guide d'achat pas-à-pas
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
