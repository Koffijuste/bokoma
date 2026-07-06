// components/legal/CookieBanner.tsx
// =============================================================================
// 🍪 COOKIE BANNER — Bandeau de consentement CNIL/ePrivacy
// =============================================================================
// Affichage : bas de l'écran, après première visite.
// Actions : "Tout accepter", "Tout refuser", "Personnaliser".
// Réf CNIL : https://www.cnil.fr/fr/cookies-et-traceurs-que-dit-la-loi
// =============================================================================
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Cookie, Settings2, X, ShieldCheck, BarChart3, Megaphone, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConsent } from '@/hooks/useConsent';

// Note : CookiePreferencesModal est défini plus bas dans ce même fichier
// et est consommé par CookiePreferencesButton via `import { ... } from './CookieBanner'`.
export function CookieBanner() {
  const { shouldShowBanner, acceptAll, refuseAll } = useConsent();
  const [showPrefs, setShowPrefs] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!shouldShowBanner || dismissed) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Préférences cookies"
        className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:px-6 sm:pb-6 pointer-events-none"
      >
        <div className="pointer-events-auto mx-auto max-w-5xl rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl shadow-black/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Bandeau haut compact */}
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex-shrink-0 items-center justify-center shadow-lg shadow-accent/30">
                <Cookie className="w-6 h-6 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base sm:text-lg font-bold">
                    Vos cookies, vos règles 🍪
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Nous utilisons des cookies pour faire fonctionner le site (panier, session)
                  et — avec votre accord — pour mesurer l'audience et personnaliser votre
                  expérience. Vous pouvez accepter, refuser ou choisir catégorie par catégorie.{' '}
                  <Link
                    href="/privacy-policy"
                    className="text-accent hover:underline font-medium"
                  >
                    Politique de confidentialité
                  </Link>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="hidden sm:flex -m-1 p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrefs(true)}
                className="order-3 sm:order-1 gap-2"
              >
                <Settings2 className="w-4 h-4" />
                Personnaliser
              </Button>
              <div className="flex-1 sm:hidden" />
              <Button
                variant="outline"
                size="sm"
                onClick={refuseAll}
                className="order-2 sm:order-2 gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                Tout refuser
              </Button>
              <Button
                size="sm"
                onClick={acceptAll}
                className="order-1 sm:order-3 bg-gradient-to-r from-accent to-purple-500 hover:opacity-90 text-white gap-2"
              >
                <Cookie className="w-4 h-4" />
                Tout accepter
              </Button>
            </div>
          </div>
        </div>
      </div>

      <CookiePreferencesModal open={showPrefs} onClose={() => setShowPrefs(false)} />
    </>
  );
}

// =============================================================================
// 🔹 MODALE DE PRÉFÉRENCES DÉTAILLÉES
// =============================================================================
interface PreferencesModalProps {
  open: boolean;
  onClose: () => void;
  initialOpen?: boolean; // pour ouverture directe via footer
}

export function CookiePreferencesModal({ open, onClose }: PreferencesModalProps) {
  const { consent, saveCustom } = useConsent();
  const [analytics, setAnalytics] = useState(consent.analytics);
  const [marketing, setMarketing] = useState(consent.marketing);
  const [saving, setSaving] = useState(false);

  // Sync state when modal opens with current consent
  React.useEffect(() => {
    if (open) {
      setAnalytics(consent.analytics);
      setMarketing(consent.marketing);
    }
  }, [open, consent]);

  const handleSave = () => {
    setSaving(true);
    saveCustom({ analytics, marketing });
    setTimeout(() => {
      setSaving(false);
      onClose();
    }, 250);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Préférences cookies détaillées"
    >
      <div
        className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Préférences cookies</h2>
              <p className="text-xs text-muted-foreground">
                Choisissez ce que vous autorisez — vous pouvez changer d'avis à tout moment.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <ConsentRow
            icon={Wrench}
            color="text-green-500"
            title="Cookies essentiels"
            description="Indispensables au fonctionnement du site : panier, session, sécurité. Ils ne tracent rien et ne peuvent pas être désactivés."
            required
            enabled
          />
          <ConsentRow
            icon={BarChart3}
            color="text-blue-500"
            title="Mesure d'audience"
            description="Nous aide à comprendre comment le site est utilisé (pages vues, durée de session). Aucune donnée personnelle n'est partagée."
            enabled={analytics}
            onChange={setAnalytics}
          />
          <ConsentRow
            icon={Megaphone}
            color="text-amber-500"
            title="Personnalisation & marketing"
            description="Permet d'afficher des produits et publicités adaptés à vos centres d'intérêt. Désactivé par défaut."
            enabled={marketing}
            onChange={setMarketing}
          />

          <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground flex gap-3">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-accent" />
            <p>
              Vos choix sont conservés 13 mois maximum (recommandation CNIL). À l'expiration,
              nous vous redemanderons. Aucun cookie de traçage n'est posé tant que vous n'avez
              pas accepté.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-accent to-purple-500 text-white"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer mes choix'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 🔹 Ligne de catégorie
// =============================================================================
interface ConsentRowProps {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  description: string;
  enabled: boolean;
  onChange?: (v: boolean) => void;
  required?: boolean;
}

function ConsentRow({
  icon: Icon,
  color,
  title,
  description,
  enabled,
  onChange,
  required,
}: ConsentRowProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-background/50">
      <div className={`w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            {title}
            {required && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                toujours actif
              </span>
            )}
          </h3>
          <ToggleSwitch checked={enabled} disabled={required} onChange={onChange} />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// =============================================================================
// 🔹 Toggle switch accessible
// =============================================================================
interface ToggleProps {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${disabled ? 'bg-accent/60 cursor-not-allowed' : checked ? 'bg-accent' : 'bg-muted-foreground/30'}
        ${disabled ? '' : 'cursor-pointer hover:opacity-90'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}