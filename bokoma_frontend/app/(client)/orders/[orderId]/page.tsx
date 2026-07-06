// app/(client)/orders/[orderId]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Clock, Loader2, AlertCircle, Package, Truck, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge';
import { apiClient } from '@/services/api';
import { formatPrice, formatDate } from '@/utils/helpers';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants';
import { toast } from 'sonner';

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  payment: {
    status: 'pending' | 'paid' | 'failed' | 'expired' | 'partial';
    method: string;
    amountPaid?: number;
    remainingAmount?: number;
  };
  items: Array<{
    _id: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  paymentExpiresAt?: string;
  createdAt: string;
}

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const { user, isAuthenticated } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiClient.get(`/orders/${orderId}`);
        const orderData = response?.data?.order || response?.data || response;
        
        if (!orderData) {
          throw new Error('Commande introuvable');
        }

        setOrder(orderData);
      } catch (err: any) {
        console.error('❌ Fetch order error:', err);
        setError(err?.response?.data?.message || err?.message || 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
          <p className="text-muted-foreground">Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Commande introuvable</h1>
          <p className="text-muted-foreground mb-6">{error || 'Cette commande n\'existe pas'}</p>
          <Button asChild>
            <Link href={ROUTES.PRODUCTS}>Retour à la boutique</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isPending = order.payment.status === 'pending';
  const isFailed = order.payment.status === 'failed';
  const isExpired = order.payment.status === 'expired';

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href={ROUTES.USER.PROFILE}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à mes commandes
          </Link>
        </div>

        {/* Titre */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Commande #{order.orderNumber}</h1>
          <p className="text-muted-foreground">
            Passée le {formatDate(order.createdAt)}
          </p>
        </div>

        {/* Statut du paiement */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Statut du paiement</h3>
            <PaymentStatusBadge 
              status={order.payment.status}
              createdAt={order.createdAt}
              expiresAt={order.paymentExpiresAt}
              showTimer={isPending}
            />
          </div>
          
          {/* Paiement en attente */}
          {isPending && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-700">
                    En attente de votre paiement
                  </p>
                  <p className="text-amber-600 mt-1">
                    Vous avez 30 minutes pour compléter le paiement, sinon la commande sera automatiquement annulée.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Paiement échoué */}
          {isFailed && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-red-700">
                    ❌ Le paiement a échoué
                  </p>
                  <p className="text-red-600 mt-1">
                    Veuillez réessayer ou choisir une autre méthode de paiement.
                  </p>
                </div>
              </div>
              <Button asChild className="mt-3">
                <Link href={ROUTES.CHECKOUT}>Réessayer le paiement</Link>
              </Button>
            </div>
          )}
          
          {/* Paiement expiré */}
          {isExpired && (
            <div className="p-4 bg-gray-500/10 border border-gray-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-gray-700">
                    ⏰ Paiement expiré
                  </p>
                  <p className="text-gray-600 mt-1">
                    Le délai de 30 minutes est dépassé. Veuillez passer une nouvelle commande.
                  </p>
                </div>
              </div>
              <Button asChild className="mt-3">
                <Link href={ROUTES.PRODUCTS}>Passer une nouvelle commande</Link>
              </Button>
            </div>
          )}
          
          {/* Paiement réussi */}
          {(order.payment.status === 'paid' || order.payment.status === 'partial') && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-700">
                    ✅ Paiement confirmé
                  </p>
                  <p className="text-emerald-600 mt-1">
                    Votre commande est en cours de traitement.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Articles commandés */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Articles commandés ({order.items.length})
          </h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item._id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Qté: {item.quantity} × {formatPrice(item.price)}
                  </p>
                </div>
                <p className="font-semibold">{formatPrice(item.subtotal)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Résumé financier */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4">Résumé</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Livraison</span>
              <span>{order.shippingCost > 0 ? formatPrice(order.shippingCost) : 'Gratuite'}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Remise</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
              <span>Total</span>
              <span className="text-accent">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href={ROUTES.USER.PROFILE}>
              Voir toutes mes commandes
            </Link>
          </Button>
          <Button asChild>
            <Link href={ROUTES.PRODUCTS}>
              Continuer mes achats
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}