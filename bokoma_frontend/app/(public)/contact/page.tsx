// app/(public)/contact/page.tsx
// ============================================================================
// 📩 PAGE CONTACT — Formulaire de contact public (anti-spam, no PII exposée)
// ============================================================================
// But : remplacer l'affichage d'un email/téléphone en clair sur le site (audit
// de sécurité 08/07/2026) par un vrai formulaire POST qui passe par le backend.
//
// Sécurité :
//   - honeypot (`website`) : champ caché qu'un bot remplit automatiquement
//   - min length + max length + regex email côté client (le backend revalide)
//   - aucun email/téléphone en clair n'est exposé publiquement sur cette page
//
// Envoi : réutilise l'endpoint public `POST /api/v1/feedbacks` avec la
// catégorie `after_sales` (SAV) — déjà validé, rate-limité côté backend,
// et routé vers l'équipe en interne.
// ============================================================================

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Mail, Phone, MapPin, Send, Loader2, CheckCircle2,
  MessageSquare, Clock, Shield, Headphones, ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { feedbackApi } from '@/services';

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
  // Honeypot — invisible, doit rester vide
  website: string;
}

const EMPTY: FormState = {
  name: '',
  email: '',
  subject: '',
  message: '',
  website: '',
};

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim() || form.name.trim().length < 2) {
      e.name = 'Votre nom est requis (2 caractères minimum).';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Adresse email invalide.';
    }
    if (form.subject.trim().length > 0 && form.subject.trim().length < 3) {
      e.subject = 'Sujet trop court (3 caractères minimum).';
    }
    if (form.subject.length > 120) {
      e.subject = 'Sujet trop long (120 caractères maximum).';
    }
    if (form.message.trim().length < 15) {
      e.message = 'Votre message doit comporter au moins 15 caractères.';
    }
    if (form.message.length > 4000) {
      e.message = 'Votre message dépasse la limite (4000 caractères).';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.website) {
      // Honeypot rempli → on simule un succès pour ne pas confirmer aux bots
      setSent(true);
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      await feedbackApi.create({
        category: 'after_sales',
        subject: form.subject.trim() || undefined,
        message:
          `[Contact via formulaire public]\n` +
          `Nom : ${form.name.trim()}\n` +
          `Email de réponse : ${form.email.trim()}\n\n` +
          form.message.trim(),
        authorName: form.name.trim(),
        contactEmail: form.email.trim(),
      });
      toast.success('Message envoyé !', {
        description: 'Notre équipe vous répondra sous 24-48 h ouvrées.',
        duration: 6000,
      });
      setSent(true);
      setForm(EMPTY);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Une erreur est survenue. Veuillez réessayer plus tard.";
      toast.error('Envoi impossible', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-xl text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Message bien reçu</h1>
          <p className="text-muted-foreground mb-2">
            Merci de nous avoir contactés. Notre équipe reviendra vers vous
            dans les meilleurs délais.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Délai habituel de réponse : <strong>24 à 48 heures ouvrées</strong>.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="outline" onClick={() => setSent(false)}>
              Envoyer un autre message
            </Button>
            <Button asChild className="bg-gradient-to-r from-accent to-purple-500 text-white">
              <Link href="/products">
                Continuer mes achats
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Hero */}
        <section className="text-center mb-8 sm:mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider mb-4">
            <Headphones className="w-3 h-3" />
            Service client
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Contactez <span className="bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">Bokoma</span>
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Une question, un souci avec une commande ou simplement envie de
            nous dire bonjour&nbsp;? Envoyez-nous un message et notre équipe
            vous répondra rapidement.
          </p>
        </section>

        {/* Layout 2 colonnes : formulaire + infos */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 max-w-6xl mx-auto">

          {/* Colonne formulaire */}
          <div className="lg:col-span-3 animate-in fade-in slide-in-from-left-4 duration-500">
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5"
              aria-label="Formulaire de contact"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="text-sm font-semibold mb-2 block">
                    Votre nom <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="contact-name"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Prénom Nom"
                    maxLength={80}
                    autoComplete="name"
                    required
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive mt-1">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="contact-email" className="text-sm font-semibold mb-2 block">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="vous@exemple.com"
                    maxLength={120}
                    autoComplete="email"
                    required
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive mt-1">{errors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="contact-subject" className="text-sm font-semibold mb-2 block">
                  Sujet <span className="text-muted-foreground font-normal">(optionnel)</span>
                </label>
                <Input
                  id="contact-subject"
                  value={form.subject}
                  onChange={(e) => update('subject', e.target.value)}
                  placeholder="Ex : question sur ma commande #123456"
                  maxLength={120}
                />
                {errors.subject && (
                  <p className="text-xs text-destructive mt-1">{errors.subject}</p>
                )}
              </div>

              <div>
                <label htmlFor="contact-message" className="text-sm font-semibold mb-2 block">
                  Votre message <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="contact-message"
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  placeholder="Soyez aussi précis(e) que possible : numéro de commande, contexte, etc."
                  rows={7}
                  maxLength={4000}
                  required
                  aria-invalid={!!errors.message}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.message ? (
                    <p className="text-xs text-destructive">{errors.message}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Min. 15 caractères. Pas de mot de passe ni d'information bancaire.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {form.message.length} / 4000
                  </p>
                </div>
              </div>

              {/* Honeypot — totalement invisible pour un humain, accessible via tab = piège pour les bots */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  top: 'auto',
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                }}
              >
                <label htmlFor="contact-website">Ne pas remplir</label>
                <input
                  id="contact-website"
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => update('website', e.target.value)}
                />
              </div>

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
                    Envoyer le message
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                En envoyant ce formulaire, vous acceptez que Bokoma Store utilise
                votre email uniquement pour vous répondre. Aucun spam, aucune
                transmission à des tiers.
              </p>
            </form>
          </div>

          {/* Colonne infos */}
          <aside className="lg:col-span-2 space-y-4 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
                <Headphones className="w-4 h-4 text-accent" />
                Notre équipe
              </h2>
              <p className="text-sm text-muted-foreground">
                Pour toute demande (commande, livraison, retour, partenariat),
                utilisez le formulaire ci-contre.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Délai de réponse</p>
                    <p className="text-xs text-muted-foreground">
                      Sous 24 à 48 h ouvrées (Lun-Ven, 9h-18h GMT).
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Adresse</p>
                    <p className="text-xs text-muted-foreground">
                      Angré Djorogobité 1, Abidjan, Côte d'Ivoire
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Confidentialité</p>
                    <p className="text-xs text-muted-foreground">
                      Vos données ne servent qu'à vous répondre et ne sont
                      jamais revendues.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-accent" />
                Réponse plus rapide ?
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Pour les questions déjà traitées, consultez directement notre FAQ
                ou posez un avis sur la page dédiée.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/faq"
                  className="inline-flex items-center text-xs px-3 py-1.5 rounded-full bg-card border border-border hover:border-accent/40 transition-colors"
                >
                  Consulter la FAQ
                </Link>
                <Link
                  href="/feedback"
                  className="inline-flex items-center text-xs px-3 py-1.5 rounded-full bg-card border border-border hover:border-accent/40 transition-colors"
                >
                  Laisser un avis
                </Link>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              Pour exercer vos droits RGPD, voir notre{' '}
              <Link href="/privacy-policy" className="text-accent hover:underline">
                politique de confidentialité
              </Link>
              .
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
