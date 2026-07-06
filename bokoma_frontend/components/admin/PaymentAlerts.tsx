// components/admin/PaymentAlerts.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock, CheckCircle, XCircle, AlertTriangle, Loader2,
  ArrowRight, RefreshCw, Bell, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/services/api';
import { formatPrice } from '@/utils/helpers';
import { ROUTES } from '@/constants';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { toast } from 'sonner';

interface PendingOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentStatus: 'pending' | 'success' | 'failed' | 'expired';
  createdAt: string;
  expiresAt: string;
  paymentMethod?: string;
}

export function PaymentAlerts() {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [failedOrders,  setFailedOrders]  = useState<PendingOrder[]>([]);
  const [successOrders, setSuccessOrders] = useState<PendingOrder[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [processingId,  setProcessingId]  = useState<string | null>(null);
  const [activeTab,     setActiveTab]     = useState<'pending' | 'failed' | 'success'>('pending');

  const fetchPaymentAlerts = useCallback(async () => {
    try {
      setLoading(true);

      // ✅ URLs corrigées : /payments/... (plus /orders/payments/...)
      const [pendingRes, failedRes, successRes] = await Promise.allSettled([
        apiClient.get('/payments/pending', { signal: AbortSignal.timeout(10_000) }),
        apiClient.get('/payments/failed',  { params: { hours: 2 }, signal: AbortSignal.timeout(10_000) }),
        apiClient.get('/payments/success', { params: { hours: 2 }, signal: AbortSignal.timeout(10_000) }),
      ]);

      if (pendingRes.status  === 'fulfilled') {
        const data = pendingRes.value?.data?.orders ?? [];
        setPendingOrders(Array.isArray(data) ? data : []);
      }
      if (failedRes.status   === 'fulfilled') {
        const data = failedRes.value?.data?.orders ?? [];
        setFailedOrders(Array.isArray(data) ? data : []);
      }
      if (successRes.status  === 'fulfilled') {
        const data = successRes.value?.data?.orders ?? [];
        setSuccessOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('❌ [PaymentAlerts] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentAlerts();
    const id = setInterval(fetchPaymentAlerts, 15_000);
    return () => clearInterval(id);
  }, [fetchPaymentAlerts]);

  const handleRejectPayment = async (orderId: string) => {
    if (processingId) return;
    if (!confirm('Êtes-vous sûr de vouloir rejeter ce paiement ? Le client sera notifié.')) return;

    setProcessingId(orderId);
    try {
      // ✅ URL corrigée : /payments/:id/reject (plus /orders/:id/payment/reject)
      await apiClient.post(`/payments/${orderId}/reject`, {
        reason: "Rejet manuel par l'administrateur",
      });
      toast.success('Paiement rejeté et client notifié');
      setPendingOrders(prev => prev.filter(o => o._id !== orderId));
      await fetchPaymentAlerts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors du rejet');
    } finally {
      setProcessingId(null);
    }
  };

  const getTimeRemaining = (createdAt: string, expiresAt?: string) => {
    const expiry = expiresAt
      ? new Date(expiresAt).getTime()
      : new Date(createdAt).getTime() + 30 * 60 * 1000;
    const diff    = expiry - Date.now();
    if (diff <= 0) return { minutes: 0, urgent: true };
    const minutes = Math.floor(diff / 60_000);
    return { minutes, urgent: minutes < 5 };
  };

  const totalCount = pendingOrders.length + failedOrders.length + successOrders.length;

  if (loading && totalCount === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          <span className="text-sm text-muted-foreground">Chargement des alertes...</span>
        </div>
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold">Tout est en ordre !</h3>
            <p className="text-sm text-muted-foreground">Aucun paiement en attente ou en erreur</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'pending'  as const, label: 'En attente',      count: pendingOrders.length,  icon: Clock,        bg: 'bg-amber-500/10',   text: 'text-amber-600' },
    { id: 'failed'   as const, label: 'Échoués/Expirés', count: failedOrders.length,   icon: XCircle,      bg: 'bg-red-500/10',     text: 'text-red-600' },
    { id: 'success'  as const, label: 'Réussis',         count: successOrders.length,  icon: CheckCircle,  bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
  ];

  const currentOrders =
    activeTab === 'pending' ? pendingOrders :
    activeTab === 'failed'  ? failedOrders  : successOrders;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-5 h-5 text-accent" />
            {pendingOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg">Alertes de Paiement</h3>
            <p className="text-xs text-muted-foreground">Surveillance temps réel</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchPaymentAlerts} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? `${tab.bg} ${tab.text} border-current`
                  : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tab.bg} ${tab.text}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {currentOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Aucune commande dans cette catégorie</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentOrders.map((order, i) => {
              const timeInfo = order.paymentStatus === 'pending'
                ? getTimeRemaining(order.createdAt, order.expiresAt)
                : null;

              return (
                <div
                  key={order._id}
                  className={`p-4 rounded-xl border transition-all hover:shadow-sm animate-in fade-in slide-in-from-left-2 duration-300 ${
                    timeInfo?.urgent ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-background/50'
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Link
                          href={`${ROUTES.ADMIN.ORDERS}/${order._id}`}
                          className="font-mono font-semibold text-sm hover:text-accent transition"
                        >
                          #{order.orderNumber}
                        </Link>
                        <PaymentStatusBadge
                          status={order.paymentStatus as any}
                          createdAt={order.createdAt}
                          expiresAt={order.expiresAt}
                          showTimer={order.paymentStatus === 'pending'}
                        />
                      </div>
                      <p className="font-medium text-sm truncate">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground truncate">{order.customerEmail}</p>
                      {order.paymentMethod && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Méthode : {order.paymentMethod.replace('_', ' ')}
                        </p>
                      )}
                      {timeInfo?.urgent && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="font-medium">
                            {timeInfo.minutes === 0 ? 'Expiré !' : `Expire dans ${timeInfo.minutes} min`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-lg font-bold">{formatPrice(order.total)}</p>
                      {order.paymentStatus === 'pending' ? (
                        <div className="flex gap-1.5">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`${ROUTES.ADMIN.ORDERS}/${order._id}`}>
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                          <Button
                            variant="destructive" size="sm"
                            onClick={() => handleRejectPayment(order._id)}
                            disabled={processingId === order._id}
                          >
                            {processingId === order._id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <XCircle className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`${ROUTES.ADMIN.ORDERS}/${order._id}`}>
                            Voir <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-muted/30">
        <Link href={`${ROUTES.ADMIN.ORDERS}?filter=payment`} className="text-sm text-accent hover:underline inline-flex items-center gap-1">
          Voir tous les paiements <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}