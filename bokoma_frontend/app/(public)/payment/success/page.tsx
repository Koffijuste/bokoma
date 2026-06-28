// app/(public)/payment/success/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Clock, XCircle, Package, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { orderApi } from '@/services';
import { formatPrice } from '@/utils/helpers';
import { ROUTES } from '@/constants';
import { cn } from '@/utils/helpers';

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

const POLL_INTERVAL = 3000;  // 3 secondes
const MAX_POLLS     = 20;    // 60 secondes max (20 × 3s)

// ─── Composant ────────────────────────────────────────────────────────────────

export default function PaymentSuccessPage() {
  const params   = useSearchParams();
  const router   = useRouter();

  const orderId     = params.get('orderId');
  const statusParam = params.get('status'); // 'confirmed' si pickup sans paiement

  const [status,    setStatus]    = useState<PaymentStatus>(
    statusParam === 'confirmed' ? 'confirmed' : 'polling'
  );
  const [order,     setOrder]     = useState<OrderSummary | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [error,     setError]     = useState<string | null>(null);

  // ── Récupère les détails depuis sessionStorage (définis dans checkout) ──────
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

  // ── Polling du statut ─────────────────────────────────────────────────────
  const checkStatus = useCallback(async () => {
    if (!orderId || status !== 'polling') return;

    try {
      const response = await orderApi.verifyPaymentPublic({ orderId });
      const o = (response as any)?.data?.order ?? (response as any)?.order;

      if (!o) return;
      setOrder(o);

      const payStatus   = o.payment?.status;
      const orderStatus = o.status;

      if (payStatus === 'paid' || orderStatus === 'confirmed' || orderStatus === 'processing') {
        setStatus('confirmed');
        // Nettoyage sessionStorage
        sessionStorage.removeItem('bokoma_pending_order');
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
      // Erreur réseau → on continue le polling
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

    // Premier appel immédiat
    checkStatus();

    const interval = setInterval(checkStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [status, orderId, checkStatus]);

  // ── Pas d'orderId ─────────────────────────────────────────────────────────
  if (!orderId && status !== 'confirmed') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
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

  // ── Rendu selon le statut ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="max-w-lg w-full animate-in fade-in zoom-in duration-500">

        {/* ── EN ATTENTE (polling) ─────────────────────────────────── */}
        {status === 'polling' && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping" />
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10">
                <Clock className="w-10 h-10 text-amber-500" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold mb-2">Confirmation en cours...</h1>
              <p className="text-muted-foreground">
                Nous attendons la confirmation de CinetPay. Cela peut prendre quelques instants.
              </p>
            </div>

            {order?.orderNumber && (
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">Commande</p>
                <p className="font-mono font-bold text-lg">#{order.orderNumber}</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Vérification {pollCount + 1}/{MAX_POLLS}...</span>
            </div>

            {/* Barre de progression */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${(pollCount / MAX_POLLS) * 100}%` }}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Ne fermez pas cette page. Vous serez redirigé automatiquement.
            </p>
          </div>
        )}

        {/* ── SUCCÈS ───────────────────────────────────────────────── */}
        {status === 'confirmed' && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center animate-in zoom-in duration-500">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>

            <div>
              <h1 className="text-2xl font-bold mb-2 text-emerald-600">
                Paiement confirmé ! 🎉
              </h1>
              <p className="text-muted-foreground">
                Votre commande a été enregistrée avec succès. Nous préparons votre colis.
              </p>
            </div>

            {order && (
              <div className="bg-muted/50 rounded-xl p-5 text-left space-y-3">
                {order.orderNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Numéro de commande</span>
                    <span className="font-mono font-bold">#{order.orderNumber}</span>
                  </div>
                )}
                {order.total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Montant total</span>
                    <span className="font-semibold">{formatPrice(order.total)}</span>
                  </div>
                )}
                {order.payment?.isPartialPayment && order.payment.remainingAmount > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-700">
                    <p className="font-medium">Paiement partiel</p>
                    <p>
                      Acompte payé : {formatPrice(order.payment.amountPaid ?? 0)} •{' '}
                      Reste à payer à la livraison : {formatPrice(order.payment.remainingAmount)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-400">
              <Package className="w-5 h-5 mx-auto mb-2" />
              <p className="font-medium">Et maintenant ?</p>
              <p className="text-xs mt-1">
                Votre commande est en cours de traitement. Vous recevrez une confirmation dès qu'elle sera expédiée.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {orderId && (
                <Link href={`/orders/${orderId}`} className="flex-1">
                  <Button variant="primary" className="w-full gap-2">
                    <Package className="w-4 h-4" />
                    Voir ma commande
                  </Button>
                </Link>
              )}
              <Link href={ROUTES.HOME} className="flex-1">
                <Button variant="outline" className="w-full">
                  Continuer mes achats
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── ÉCHEC ────────────────────────────────────────────────── */}
        {status === 'failed' && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>

            <div>
              <h1 className="text-2xl font-bold mb-2 text-destructive">Paiement échoué</h1>
              <p className="text-muted-foreground">
                Votre paiement n'a pas pu être traité. Votre panier a été conservé.
              </p>
            </div>

            {order?.orderNumber && (
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">Commande</p>
                <p className="font-mono font-bold">#{order.orderNumber}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                className="flex-1 gap-2"
                onClick={() => router.push('/checkout')}
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer le paiement
              </Button>
              <Link href={ROUTES.HOME} className="flex-1">
                <Button variant="outline" className="w-full">Retour à l'accueil</Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── EXPIRÉ ───────────────────────────────────────────────── */}
        {status === 'expired' && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>

            <div>
              <h1 className="text-2xl font-bold mb-2">Délai dépassé</h1>
              <p className="text-muted-foreground">
                Nous n'avons pas pu confirmer votre paiement à temps. Si le montant a été débité,
                il sera remboursé automatiquement sous 24-48h.
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