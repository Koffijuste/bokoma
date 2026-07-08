// app/(public)/payment/success/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle, Clock, XCircle, Package, Loader2, RefreshCw,
  ArrowRight, Sparkles, ShoppingBag, Truck, Mail, Phone,
  AlertCircle, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { orderApi } from '@/services';
import { formatPrice } from '@/utils/helpers';
import { ROUTES } from '@/constants';
import { cn } from '@/utils/helpers';
import { toast } from 'sonner';
import { useCartStore } from '@/store';

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus = 'polling' | 'confirmed' | 'failed' | 'expired' | 'error';

interface OrderSummary {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  payment: {
    status: string;
    method: string;
    amountPaid?: number;
    remainingAmount?: number;
    isPartialPayment?: boolean;
  };
  items?: Array<{ name: string; quantity: number; price: number }>;
  createdAt: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 5000;  // 5 secondes
const MAX_POLLS = 60;        // 60 secondes max (5 min)
const REDIRECT_DELAY = 4;   // secondes avant redirection plein écran
const POPUP_CLOSE_DELAY = 1500; // ms avant auto-close popup
const PARENT_FALLBACK_DELAY = 3000; // ms avant de forcer le redirect parent

/** Détecte si la page est ouverte dans une popup (window.open) plutôt qu'en plein écran. */
function isOpenedInPopup(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.opener) && !window.opener.closed && window.opener !== window;
}

// ─── Composant : Animated Dots ────────────────────────────────────────────────

const AnimatedDots = () => (
  <span className="inline-flex gap-1">
    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </span>
);

// ─── Composant : Countdown Ring ───────────────────────────────────────────────

const CountdownRing = ({ seconds, total }: { seconds: number; total: number }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (seconds / total) * circumference;
  
  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className="text-muted/30"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="text-accent transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{seconds}</span>
      </div>
    </div>
  );
};

// ─── Composant Principal ──────────────────────────────────────────────────────

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);

  const orderId = params.get('orderId');
  const statusParam = params.get('status');

  const [status, setStatus] = useState<PaymentStatus>(
    statusParam === 'confirmed' ? 'confirmed' : 'polling'
  );
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [countdown, setCountdown] = useState(4);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // ── Récupère les détails depuis sessionStorage ─────────────────────────────
  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem('bokoma_pending_order');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setOrder(prev => prev ?? parsed);
        } catch {}
      }
    }
  }, []);

  // ── Polling du statut ──────────────────────────────────────────────────────
  const checkStatus = useCallback(async () => {
    if (!orderId || status !== 'polling') return;

    try {
      const response = await orderApi.verifyPaymentPublic({ orderId });
      const o = (response as any)?.data?.order ?? (response as any)?.order;

      if (!o) return;
      setOrder(o);

      const payStatus = o.payment?.status;
      const orderStatus = o.status;

      if (
        payStatus === 'paid' ||
        payStatus === 'partial' ||
        orderStatus === 'confirmed' ||
        orderStatus === 'processing'
      ) {
        setStatus('confirmed');
        // ✅ Panier vidé : paiement (entier ou partiel) confirmé côté backend
        //    → on flush le store. Le backend a déjà clear son cart en DB,
        //    il reste à synchroniser le store Zustand pour la navbar.
        clearCart();
        sessionStorage.removeItem('bokoma_pending_order');
        toast.success(payStatus === 'partial' ? '💰 Acompte reçu !' : '🎉 Paiement confirmé !');
        return;
      }

      if (payStatus === 'failed' || orderStatus === 'cancelled') {
        setStatus('failed');
        return;
      }

      if (payStatus === 'expired') {
        setStatus('expired');
        return;
      }
    } catch (err: any) {
      console.warn('[PaymentSuccess] Poll error:', err.message);
    }

    setPollCount(c => {
      const next = c + 1;
      if (next >= MAX_POLLS) setStatus('expired');
      return next;
    });
  }, [orderId, status]);

  useEffect(() => {
    if (status !== 'polling' || !orderId) return;

    checkStatus();
    const interval = setInterval(checkStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [status, orderId, checkStatus]);

  // ── Détection du mode d'ouverture (popup vs plein écran) ───────────────────
  const [openedInPopup, setOpenedInPopup] = useState(false);

  useEffect(() => {
    setOpenedInPopup(isOpenedInPopup());
  }, []);

  // ── Compte à rebours après confirmation ────────────────────────────────────
  // Deux branches selon le mode :
  //   • Popup  → on notifie le parent et on se ferme (le parent affichera la suite)
  //   • Plein écran → countdown puis redirect Next vers /orders/[id]/confirmation
  useEffect(() => {
    if (status !== 'confirmed' || !orderId) return;

    if (openedInPopup && window.opener) {
      // 1. Notifier le parent via postMessage (le checkout peut écouter)
      try {
        window.opener.postMessage(
          { type: 'bokoma_payment_success', orderId, orderNumber: order?.orderNumber },
          window.location.origin,
        );
      } catch (err) {
        console.warn('[PaymentSuccess] postMessage failed:', err);
      }

      // 2. Tenter de fermer la popup après un court délai
      setIsRedirecting(true);
      const closeTimer = window.setTimeout(() => {
        try { window.close(); } catch (err) { console.warn(err); }
      }, POPUP_CLOSE_DELAY);

      // 3. Fallback : si le navigateur refuse la fermeture (popup ouverte
      //    manuellement), on redirige le parent via opener.location.
      const fallbackTimer = window.setTimeout(() => {
        if (!window.closed) {
          try {
            window.opener.location.href = `/orders/${orderId}/confirmation`;
            window.close();
          } catch {
            // Dernier recours : on redirige sur place
            router.push(`/orders/${orderId}/confirmation`);
          }
        }
      }, PARENT_FALLBACK_DELAY);

      return () => {
        clearTimeout(closeTimer);
        clearTimeout(fallbackTimer);
      };
    }

    // Mode plein écran — comportement existant : countdown + redirect
    setIsRedirecting(true);
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [status, orderId, openedInPopup, order?.orderNumber, router]);

// ✅ NOUVEAU : useEffect séparé pour la redirection (plein écran uniquement)
useEffect(() => {
  if (status !== 'confirmed') return;
  // Si on est dans une popup, le useEffect ci-dessus gère déjà la fermeture
  if (openedInPopup) return;
  if (countdown === 0 && orderId) {
    router.push(`/orders/${orderId}/confirmation`);
  }
}, [status, countdown, orderId, router, openedInPopup]);

  // ── Pas d'orderId ──────────────────────────────────────────────────────────
  if (!orderId && status !== 'confirmed') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background to-accent/5">
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Commande introuvable</h1>
          <p className="text-muted-foreground mb-6">
            Identifiant de commande manquant.
          </p>
          <Link href={ROUTES.HOME}>
            <Button variant="primary">Retour à l'accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-background to-accent/5">
      <div className="max-w-lg w-full">

        {/* ═══════════════════════════════════════════════════════════════
            EN ATTENTE (polling)
           ═══════════════════════════════════════════════════════════════ */}
        {status === 'polling' && (
          <div className="bg-card border border-border rounded-3xl p-8 text-center space-y-6 shadow-xl shadow-accent/5 animate-in fade-in zoom-in duration-500">
            {/* Animation de chargement */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-amber-500/10 animate-pulse" />
              <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/30">
                <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                Confirmation en cours
                <AnimatedDots />
              </h1>
              <p className="text-muted-foreground">
                Nous attendons la confirmation de votre paiement.
                <br />
                Cela peut prendre quelques instants.
              </p>
            </div>

            {order?.orderNumber && (
              <div className="bg-gradient-to-br from-muted/50 to-muted/20 rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Commande</p>
                <p className="font-mono font-bold text-lg">#{order.orderNumber}</p>
                {order.total > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Montant : <span className="font-semibold text-foreground">{formatPrice(order.total)}</span>
                  </p>
                )}
              </div>
            )}

            {/* Progression */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Vérification {pollCount + 1}/{MAX_POLLS}</span>
                <span>{Math.round(((pollCount + 1) / MAX_POLLS) * 100)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${((pollCount + 1) / MAX_POLLS) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Ne fermez pas cette page</span>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SUCCÈS
           ═══════════════════════════════════════════════════════════════ */}
        {status === 'confirmed' && (
          <div className="bg-card border border-border rounded-3xl p-8 text-center space-y-6 shadow-xl shadow-emerald-500/10 animate-in fade-in zoom-in duration-500">
            {/* Confetti animation simulée */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-32 h-32 rounded-full bg-emerald-500/20 animate-ping" />
              </div>
              <div className="relative mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-in zoom-in duration-700">
                <CheckCircle className="w-14 h-14 text-white" />
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                Paiement confirmé ! 🎉
              </h1>
              <p className="text-muted-foreground">
                Votre commande a été enregistrée avec succès.
              </p>
            </div>

            {order && (
              <div className="bg-gradient-to-br from-muted/50 to-muted/20 rounded-xl p-5 text-left space-y-3 border border-border/50">
                {order.orderNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Commande</span>
                    <span className="font-mono font-bold text-base">#{order.orderNumber}</span>
                  </div>
                )}
                {order.total > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Montant total</span>
                    <span className="font-bold text-lg text-accent">{formatPrice(order.total)}</span>
                  </div>
                )}
{order.payment?.remainingAmount && order.payment.remainingAmount > 0 && (
  <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 rounded-xl">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
        <span className="text-xl">💰</span>
      </div>
      <div className="flex-1">
        <p className="font-bold text-sm text-amber-700 dark:text-amber-400 mb-2">
          Paiement partiel - À la livraison
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Acompte payé maintenant</span>
            <span className="font-bold text-emerald-600">
              {formatPrice(order.payment.amountPaid ?? 0)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-amber-500/20">
            <span className="text-muted-foreground font-medium">Reste à payer à la livraison</span>
            <span className="font-bold text-lg text-amber-700 dark:text-amber-400">
              {formatPrice(order.payment.remainingAmount)}
            </span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 italic">
          ⚠️ Le montant restant sera collecté lors de la livraison
        </p>
      </div>
    </div>
  </div>
)}
              </div>
            )}

            {/* Prochaines étapes */}
            <div className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/20 rounded-xl p-4 text-left">
              <p className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-500" />
                Prochaines étapes
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-blue-600">1</span>
                  </div>
                  <p>Préparation de votre colis en cours</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-blue-600">2</span>
                  </div>
                  <p>Expédition sous 24-48h</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-blue-600">3</span>
                  </div>
                  <p>Email de confirmation envoyé</p>
                </div>
              </div>
            </div>

            {/* Redirection / fermeture automatique selon le mode d'ouverture */}
            {isRedirecting && (
              <div className="flex items-center justify-center gap-3 p-4 bg-accent/5 border border-accent/20 rounded-xl">
                {openedInPopup ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-accent" />
                    <div className="text-left">
                      <p className="font-semibold text-sm">Fermeture automatique...</p>
                      <p className="text-xs text-muted-foreground">
                        Cette fenêtre se ferme et votre commande s'affiche sur la page précédente.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CountdownRing seconds={countdown} total={REDIRECT_DELAY} />
                    <div className="text-left">
                      <p className="font-semibold text-sm">Redirection automatique</p>
                      <p className="text-xs text-muted-foreground">
                        Vers les détails de votre commande
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {orderId && (
                <Link href={`/orders/${orderId}/confirmation`} className="flex-1">
                  <Button variant="primary" className="w-full gap-2 bg-gradient-to-r from-accent to-purple-500 hover:from-accent/90 hover:to-purple-500/90 shadow-lg shadow-accent/20">
                    <Package className="w-4 h-4" />
                    Voir ma commande
                  </Button>
                </Link>
              )}
              <Link href={ROUTES.HOME} className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Continuer mes achats
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ÉCHEC
           ═══════════════════════════════════════════════════════════════ */}
        {status === 'failed' && (
          <div className="bg-card border border-border rounded-3xl p-8 text-center space-y-6 shadow-xl shadow-destructive/10 animate-in fade-in zoom-in duration-500">
            <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-destructive/20 to-red-500/20 flex items-center justify-center border-2 border-destructive/30">
              <XCircle className="w-14 h-14 text-destructive" />
            </div>

            <div>
              <h1 className="text-2xl font-bold mb-2 text-destructive">Paiement échoué</h1>
              <p className="text-muted-foreground">
                Votre paiement n'a pas pu être traité.
                <br />
                Votre panier a été conservé.
              </p>
            </div>

            {order?.orderNumber && (
              <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Commande</p>
                <p className="font-mono font-bold">#{order.orderNumber}</p>
              </div>
            )}

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-left">
              <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Que faire ?
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Vérifiez votre solde ou votre méthode de paiement</li>
                <li>• Assurez-vous que votre numéro est correct</li>
                <li>• Réessayez dans quelques instants</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                className="flex-1 gap-2"
                onClick={() => router.push('/checkout')}
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </Button>
              <Link href={ROUTES.HOME} className="flex-1">
                <Button variant="outline" className="w-full">Retour à l'accueil</Button>
              </Link>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            EXPIRÉ
           ═══════════════════════════════════════════════════════════════ */}
        {status === 'expired' && (
          <div className="bg-card border border-border rounded-3xl p-8 text-center space-y-6 shadow-xl shadow-amber-500/10 animate-in fade-in zoom-in duration-500">
            <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border-2 border-amber-500/30">
              <Clock className="w-14 h-14 text-amber-500" />
            </div>

            <div>
              <h1 className="text-2xl font-bold mb-2">Délai dépassé</h1>
              <p className="text-muted-foreground">
                Nous n'avons pas pu confirmer votre paiement à temps.
              </p>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-left">
              <p className="text-xs text-muted-foreground">
                💡 Si le montant a été débité, il sera remboursé automatiquement sous 24-48h.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                className="flex-1 gap-2"
                onClick={() => {
                  setStatus('polling');
                  setPollCount(0);
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Vérifier à nouveau
              </Button>
              <Link href="/profile" className="flex-1">
                <Button variant="outline" className="w-full">Mes commandes</Button>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}