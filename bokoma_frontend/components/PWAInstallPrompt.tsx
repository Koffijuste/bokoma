// components/PWAInstallPrompt.tsx
// ============================================================================
// 📱 PWA INSTALL PROMPT — "Ajouter à l'écran d'accueil"
// ============================================================================
// Trois cas à gérer :
//   1. Chrome/Edge/Android : event `beforeinstallprompt` → on stocke l'event
//      et on affiche un bouton "Installer". Au click on appelle prompt().
//   2. iOS Safari : pas de beforeinstallprompt. On détecte via UA + standalone
//      et on affiche des instructions manuelles "Partager > Sur l'écran d'accueil".
//   3. Déjà installé (display-mode: standalone) : on n'affiche rien.
//
// Le prompt ne s'affiche PAS à chaque visite :
//   - Dismiss persisté en localStorage 7 jours (l'utilisateur se fatigue vite)
//   - Si déjà installé, on ne montre jamais
// ============================================================================

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Download, X, Share, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/helpers';

const DISMISS_KEY = 'bokoma:pwa-install-dismissed-at';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

// ── Types PWA ────────────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

type IosState = 'unsupported' | 'installed' | 'show' | 'modal-open' | 'dismissed';

export function PWAInstallPrompt() {
  // Chrome/Edge : on stocke l'event
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showChrome, setShowChrome] = useState(false);
  const [installed, setInstalled] = useState(false);
  // iOS : on montre un tip avec les étapes manuelles
  const [iosState, setIosState] = useState<IosState>('unsupported');
  // Banner replié
  const [collapsed, setCollapsed] = useState(false);

  // ── Détection de l'environnement ─────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Déjà installé (PWA lancée en mode standalone) → on ne montre rien
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS ancien
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Vérifier le dismiss récent
    try {
      const dismissedAt = parseInt(window.localStorage.getItem(DISMISS_KEY) || '0', 10);
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION_MS) {
        return;
      }
    } catch { /* localStorage indisponible */ }

    // ── iOS Safari detection ─────────────────────────────────────────
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in window);
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIOS && isSafari) {
      setIosState('show');
    }

    // ── Chrome/Edge/Android : on capture beforeinstallprompt ────────
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // Empêche le prompt natif auto
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Petit délai pour ne pas afficher dès le premier render
      setTimeout(() => setShowChrome(true), 3000);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setShowChrome(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  // ── Click sur "Installer" (Chrome/Edge) ─────────────────────────────
  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        setShowChrome(false);
      } else {
        // L'user a refusé → on respecte en dismissant plus longtemps
        dismiss();
      }
    } catch (err) {
      console.warn('[PWA] install prompt failed:', err);
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  // ── Dismiss : on stocke pour 7 jours ────────────────────────────────
  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { /* ignore */ }
    setShowChrome(false);
    setIosState('dismissed');
    setCollapsed(false);
  }, []);

  // ── Rien à afficher ? ───────────────────────────────────────────────
  if (installed) return null;

  // Chrome prompt
  if (showChrome && deferredPrompt) {
    return (
      <div
        role="dialog"
        aria-label="Installer l'application Bokoma"
        className={cn(
          'fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md',
          'rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl',
          'animate-in slide-in-from-bottom-4 fade-in duration-500',
        )}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Download className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Installer Bokoma Store</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Accédez à la boutique en 1 clic, même hors ligne. Raccourcis vers panier, commandes, profil.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleInstall} className="flex-1">
                <Download className="w-4 h-4 mr-1.5" /> Installer
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Plus tard
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fermer"
            className="flex-shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari — banner "Installer" (style Android) + modal d'instructions
  // Sur iOS Safari ne supporte pas beforeinstallprompt, donc le bouton
  // "Installer" ne peut pas déclencher le prompt natif : il ouvre une modal
  // avec les 3 étapes manuelles (Partager > Sur l'écran d'accueil > Ajouter).
  if (iosState === 'show' || iosState === 'modal-open') {
    return (
      <>
        {/* Auto banner — même forme que le banner Android, CTA "Installer" */}
        {iosState === 'show' && (
          <div
            role="dialog"
            aria-label="Installer l'application Bokoma"
            className={cn(
              'fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md',
              'rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl',
              'animate-in slide-in-from-bottom-4 fade-in duration-500',
            )}
          >
            <div className="flex items-start gap-3 p-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Share className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">Installer Bokoma Store</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ajoutez l'app à votre écran d'accueil pour un accès en 1 clic, même hors ligne.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => setIosState('modal-open')}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-1.5" /> Installer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismiss}>
                    Plus tard
                  </Button>
                </div>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Fermer"
                className="flex-shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* Modal d'instructions (3 étapes illustrées) */}
        {iosState === 'modal-open' && (
          <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIosState('show')}
            role="dialog"
            aria-modal="true"
            aria-label="Comment installer Bokoma sur iPhone"
          >
            <div
              className={cn(
                'bg-card border border-border w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6',
                'animate-in slide-in-from-bottom-4 fade-in duration-300',
                'max-h-[90vh] overflow-y-auto shadow-2xl',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Download className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Installer Bokoma</h3>
                    <p className="text-xs text-muted-foreground">3 étapes rapides sur iPhone</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIosState('show')}
                  aria-label="Revenir au bandeau"
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">1</span>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-medium">Appuyez sur le bouton Partager</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      En bas de Safari, l'icône{' '}
                      <Share className="inline w-3 h-3 align-text-bottom mx-0.5" />
                      carrée avec une flèche vers le haut.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">2</span>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-medium">Choisir « Sur l'écran d'accueil »</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Faites défiler le menu et appuyez sur{' '}
                      <Plus className="inline w-3 h-3 align-text-bottom mx-0.5" />
                      <strong>Sur l'écran d'accueil</strong>.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">3</span>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-medium">Appuyez sur Ajouter</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      En haut à droite, puis confirmez. L'icône Bokoma apparaît sur votre écran d'accueil.
                    </p>
                  </div>
                </li>
              </ol>

              <Button onClick={dismiss} className="w-full mt-6">
                Compris
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

// ============================================================================
// 🪟 FLOATING INSTALL BUTTON — Bouton permanent en bas de page
// ============================================================================
// Petit bouton rond flottant qui s'affiche UNIQUEMENT quand :
//   - PWA installable ET pas installée ET pas dismissed récemment
// Il permet d'ouvrir le prompt d'install sans attendre le banner auto.
// ============================================================================
export function PWAFloatingButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    try {
      const dismissedAt = parseInt(window.localStorage.getItem(DISMISS_KEY) || '0', 10);
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION_MS) {
        setDismissed(true);
        return;
      }
    } catch {}

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  if (installed || dismissed || !deferredPrompt) return null;

  const handleClick = async () => {
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'dismissed') {
        try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
        setDismissed(true);
      } else {
        setInstalled(true);
      }
    } catch (err) {
      console.warn('[PWA] install prompt failed:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Installer l'application Bokoma"
      className={cn(
        'fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full',
        'bg-accent text-white shadow-lg shadow-accent/30',
        'flex items-center justify-center',
        'hover:scale-110 active:scale-95 transition-transform',
        'animate-in zoom-in fade-in duration-300',
      )}
    >
      <Download className="w-5 h-5" />
      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
    </button>
  );
}

// ============================================================================
// ✅ INSTALLED TOAST — Confirmation après install
// ============================================================================
export function PWAInstalledToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onInstalled = () => {
      setShow(true);
      setTimeout(() => setShow(false), 4000);
    };
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  if (!show) return null;
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500 text-white shadow-lg">
        <CheckCircle2 className="w-4 h-4" />
        <span className="text-sm font-medium">Bokoma installé !</span>
      </div>
    </div>
  );
}
