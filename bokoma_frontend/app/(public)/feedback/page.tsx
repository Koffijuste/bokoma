// app/(public)/feedback/page.tsx
// ============================================================================
// 💬 PAGE FEEDBACK BOKOMA — Avis, suggestions, retours clients
// ============================================================================
// Page publique combinant :
//   • un formulaire de retour (5 catégories : site / achat / amélioration / produit / SAV)
//   • la liste des feedbacks approuvés et rendus publics par l'équipe
// Aucune connexion requise pour poster — l'utilisateur connecté verra ses
// infos pré-remplies.
// ============================================================================

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MessageSquare, AlertTriangle, Lightbulb, Star, Wrench, Send,
  Loader2, ChevronRight, ChevronDown, CheckCircle2, X, Filter, Sparkles,
  Calendar, Mail,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { feedbackApi } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/helpers';
import type { FeedbackItem, FeedbackCategory, FeedbackCategoryInfo } from '@/types';

// ============================================================================
// 🔹 CATÉGORIES — définies une fois, utilisées dans tout le fichier
// ============================================================================
// On garde cette const en plus de celle du backend pour pouvoir afficher
// l'UI même avant que le endpoint /feedbacks/categories réponde.

const CATEGORIES: Array<FeedbackCategoryInfo & { icon: any; description: string }> = [
  {
    id: 'site_feedback',
    label: 'Avis sur le site',
    emoji: '💬',
    icon: MessageSquare,
    description: 'Votre ressenti sur la navigation, le design, les fonctionnalités.',
  },
  {
    id: 'purchase_issue',
    label: "Difficulté d'achat",
    emoji: '⚠️',
    icon: AlertTriangle,
    description: 'Un blocage, un bug ou une incompréhension pendant votre achat.',
  },
  {
    id: 'improvement',
    label: "Suggestion d'amélioration",
    emoji: '💡',
    icon: Lightbulb,
    description: 'Vos idées pour améliorer Bokoma Store.',
  },
  {
    id: 'product_opinion',
    label: 'Avis produit',
    emoji: '⭐',
    icon: Star,
    description: 'Votre opinion sur un produit (qualité, taille, rendu, etc.).',
  },
  {
    id: 'after_sales',
    label: 'Service après-vente',
    emoji: '🛠️',
    icon: Wrench,
    description: 'Un retour sur le suivi de votre commande, livraison ou SAV.',
  },
];

// ============================================================================
// 🔹 HELPERS
// ============================================================================

const normalizeList = (resp: any): FeedbackItem[] => {
  if (!resp) return [];
  if (Array.isArray(resp?.data?.data)) return resp.data.data;
  if (Array.isArray(resp?.data))        return resp.data;
  if (Array.isArray(resp))              return resp;
  return [];
};

const getMeta = (resp: any) =>
  resp?.meta ?? resp?.data?.meta ?? { total: 0, page: 1, pages: 1 };

const getInitials = (name?: string): string => {
  if (!name) return 'AN';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'AN';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ============================================================================
// 🔹 COMPOSANT : STAR RATING
// ============================================================================

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readonly?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ value, onChange, size = 22, readonly = false }) => {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Note">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={cn(
            'transition-transform',
            !readonly && 'cursor-pointer hover:scale-110',
            readonly && 'cursor-default'
          )}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          aria-checked={value === n}
          role="radio"
        >
          <Star
            size={size}
            className={cn(
              'transition-colors',
              n <= display
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/40'
            )}
          />
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// 🔹 COMPOSANT : FEEDBACK CARD (lecture publique)
// ============================================================================

interface FeedbackCardProps {
  item: FeedbackItem;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({ item }) => {
  const cat = CATEGORIES.find((c) => c.id === item.category);
  const Icon = cat?.icon ?? MessageSquare;

  const userObj = typeof item.user === 'object' ? item.user : null;
  const displayName = item.isAnonymous
    ? 'Client anonyme'
    : item.authorName || (userObj ? `${userObj.firstName} ${userObj.lastName}`.trim() : 'Client Bokoma');
  const avatar = userObj?.avatar;

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-purple-500 text-white flex items-center justify-center font-bold text-sm">
                {getInitials(displayName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {item.relativeTime}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="px-2 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Icon className="w-3 h-3" />
              {cat?.label ?? item.category}
            </span>
            {item.rating !== undefined && item.rating !== null && (
              <StarRating value={item.rating} size={14} readonly />
            )}
          </div>
        </div>

        {/* Subject */}
        {item.subject && (
          <h3 className="font-semibold text-base">{item.subject}</h3>
        )}

        {/* Message */}
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {item.message}
        </p>

        {/* Réponse admin */}
        {item.adminResponse && (
          <div className="mt-3 p-3 rounded-xl bg-accent/5 border border-accent/20">
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Réponse de l'équipe Bokoma
            </p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {item.adminResponse}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// 🔹 COMPOSANT : FEEDBACK FORM
// ============================================================================

interface FeedbackFormProps {
  onSubmitted?: () => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmitted }) => {
  const { user, isAuthenticated } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory>('site_feedback');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [contactEmail, setContactEmail] = useState('');
  const [authorName, setAuthorName] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Pré-remplir si l'utilisateur est connecté
  useEffect(() => {
    if (isAuthenticated && user) {
      setAuthorName((prev) => prev || `${user.firstName || ''} ${user.lastName || ''}`.trim());
      setContactEmail((prev) => prev || user.email || '');
    }
  }, [isAuthenticated, user]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!selectedCategory) e.category = 'Catégorie requise';
    if (message.trim().length < 10) e.message = 'Votre message doit comporter au moins 10 caractères';
    if (message.trim().length > 4000) e.message = 'Votre message dépasse la limite (4000 caractères)';
    if (subject.length > 120) e.subject = 'Sujet trop long (120 caractères max)';
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      e.contactEmail = 'Email invalide';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        category: selectedCategory,
        subject: subject.trim() || undefined,
        message: message.trim(),
        rating: rating > 0 ? rating : null,
        authorName: authorName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
      };

      const resp: any = await feedbackApi.create(payload);
      toast.success('Merci pour votre retour !', {
        description:
          resp?.message ||
          'Votre message a bien été reçu. Notre équipe l\'examinera prochainement.',
        duration: 6000,
      });

      // Reset
      setSubmitted(true);
      setSubject('');
      setMessage('');
      setRating(0);
      if (!isAuthenticated) {
        setAuthorName('');
        setContactEmail('');
      }
      onSubmitted?.();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Une erreur est survenue. Veuillez réessayer.';
      toast.error('Envoi impossible', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // Affichage spécial après soumission
  if (submitted) {
    return (
      <Card className="animate-in fade-in zoom-in duration-300">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold">Merci pour votre retour !</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Votre message a bien été reçu. Notre équipe l'examinera dans les meilleurs délais
            et vous répondra si nécessaire.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false);
                setSelectedCategory('site_feedback');
              }}
            >
              Envoyer un autre retour
            </Button>
            <Button asChild className="bg-gradient-to-r from-accent to-purple-500 text-white">
              <Link href="/products">Continuer mes achats</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cat = CATEGORIES.find((c) => c.id === selectedCategory);
  const showRating = selectedCategory === 'site_feedback' || selectedCategory === 'product_opinion' || selectedCategory === 'after_sales';

  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent mb-2">
            <Sparkles className="w-3 h-3" />
            Votre voix compte
          </div>
          <h2 className="text-2xl font-bold">Partagez votre retour</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tous les avis sont lus par notre équipe. Les plus utiles au plus grand nombre
            sont publiés sur cette page.
          </p>
        </div>

        {/* Étape 1 : choix catégorie */}
        <div className="mb-6">
          <label className="text-sm font-semibold mb-2 block">
            1. Quel est le sujet de votre retour ? <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = c.id === selectedCategory;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                    active
                      ? 'border-accent bg-accent/10 ring-2 ring-accent/30'
                      : 'border-border hover:border-accent/40 hover:bg-accent/5'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    active ? 'bg-accent text-white' : 'bg-accent/10 text-accent'
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{c.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sujet + message */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="subject" className="text-sm font-semibold mb-2 block">
              Sujet <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={cat ? `Ex : ${cat.label.toLowerCase()}…` : 'Un titre court pour votre retour'}
              maxLength={120}
            />
            {errors.subject && <p className="text-xs text-destructive mt-1">{errors.subject}</p>}
          </div>

          <div>
            <label htmlFor="message" className="text-sm font-semibold mb-2 block">
              2. Décrivez votre retour <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Soyez aussi précis(e) que possible…"
              rows={6}
              maxLength={4000}
              required
            />
            <div className="flex items-center justify-between mt-1">
              {errors.message ? (
                <p className="text-xs text-destructive">{errors.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Min. 10 caractères.</p>
              )}
              <p className="text-xs text-muted-foreground">{message.length} / 4000</p>
            </div>
          </div>

          {/* Note optionnelle */}
          {showRating && (
            <div>
              <label className="text-sm font-semibold mb-2 block">
                {selectedCategory === 'site_feedback' && 'Votre note globale du site'}
                {selectedCategory === 'product_opinion' && 'Votre note du produit'}
                {selectedCategory === 'after_sales' && 'Votre note de la prise en charge SAV'}
                {' '}
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <StarRating value={rating} onChange={setRating} size={28} />
            </div>
          )}

          {/* Identité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <label htmlFor="authorName" className="text-sm font-semibold mb-2 block">
                Votre nom <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <Input
                id="authorName"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Prénom Nom"
                maxLength={80}
                disabled={isAuthenticated}
              />
            </div>
            <div>
              <label htmlFor="contactEmail" className="text-sm font-semibold mb-2 block">
                Email de contact <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="vous@exemple.com"
                maxLength={120}
                disabled={isAuthenticated}
              />
              {errors.contactEmail && <p className="text-xs text-destructive mt-1">{errors.contactEmail}</p>}
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Pour qu'on puisse vous recontacter si besoin.
              </p>
            </div>
          </div>

          {isAuthenticated && (
            <p className="text-xs text-muted-foreground bg-accent/5 border border-accent/20 rounded-lg p-3">
              ✅ Connecté en tant que <strong>{user?.email}</strong>. Vos informations
              sont automatiquement utilisées pour identifier votre retour.
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto bg-gradient-to-r from-accent to-purple-500 hover:opacity-90 text-white"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours…
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer mon retour
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// 🔹 COMPOSANT PRINCIPAL
// ============================================================================

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<FeedbackCategory | 'all'>('all');
  const [showAll, setShowAll] = useState(false);

  const fetchPublic = useCallback(async () => {
    setLoading(true);
    try {
      const resp: any = await feedbackApi.list({
        page: 1,
        limit: 24,
        category: filterCat === 'all' ? undefined : filterCat,
      });
      setItems(normalizeList(resp));
    } catch (err: any) {
      console.error('❌ Erreur chargement feedbacks:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterCat]);

  useEffect(() => {
    fetchPublic();
  }, [fetchPublic]);

  const displayedItems = showAll ? items : items.slice(0, 6);

  const filters = [
    { id: 'all', label: 'Tous', emoji: '🗂️' },
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, emoji: c.emoji })),
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Hero */}
        <section className="text-center mb-8 sm:mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider mb-4">
            <MessageSquare className="w-3 h-3" />
            Vos retours
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Avis & <span className="bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">Retours</span>
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Votre avis nous aide à améliorer Bokoma Store chaque jour. Partagez vos impressions
            sur le site, vos achats, nos produits ou le service après-vente.
          </p>
        </section>

        {/* Layout 2 colonnes : formulaire + feed */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">

          {/* Colonne formulaire */}
          <div className="lg:col-span-3 animate-in fade-in slide-in-from-left-4 duration-500">
            <FeedbackForm onSubmitted={() => fetchPublic()} />
          </div>

          {/* Colonne feed des feedbacks */}
          <div className="lg:col-span-2 space-y-4 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent" />
                Retours récents
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fetchPublic()}
                disabled={loading}
                aria-label="Rafraîchir"
              >
                <Filter className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
            </div>

            {/* Filtres catégorie */}
            <div className="flex gap-1.5 flex-wrap pb-2">
              {filters.map((f) => {
                const active = filterCat === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilterCat(f.id as any)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap',
                      active
                        ? 'bg-gradient-to-r from-accent to-purple-500 text-white border-transparent shadow-md'
                        : 'bg-card border-border hover:border-accent/40 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span className="mr-1">{f.emoji}</span>
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Liste */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-5 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                          <div className="h-2 bg-muted rounded animate-pulse w-1/3" />
                        </div>
                      </div>
                      <div className="h-3 bg-muted rounded animate-pulse w-full" />
                      <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : displayedItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Aucun retour publié pour le moment dans cette catégorie.
                    Soyez le premier à partager le vôtre !
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {displayedItems.map((item) => (
                  <FeedbackCard key={item._id} item={item} />
                ))}

                {items.length > 6 && !showAll && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAll(true)}
                    className="w-full"
                  >
                    Voir les {items.length - 6} autres retours
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                )}
                {showAll && items.length > 6 && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowAll(false)}
                    className="w-full"
                  >
                    Réduire la liste
                    <ChevronRight className="w-4 h-4 ml-2 rotate-[-90deg]" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bandeau bas */}
        <section className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: MessageSquare,
              title: 'Retours pris au sérieux',
              text: 'Chaque message est lu et traité par notre équipe sous 48h ouvrées.',
            },
            {
              icon: Sparkles,
              title: 'Amélioration continue',
              text: 'Vos idées concrètes deviennent régulièrement de nouvelles fonctionnalités.',
            },
            {
              icon: CheckCircle2,
              title: 'Modération transparente',
              text: 'Les avis publiés le sont après validation, sans censure abusive.',
            },
          ].map((b, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-3">
                  <b.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.text}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
