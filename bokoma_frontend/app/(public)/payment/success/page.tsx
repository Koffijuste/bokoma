'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  CheckCircle, Package, Truck, ArrowRight, Download, 
  Mail, Phone, MapPin, Shield, Loader2, AlertCircle, Home
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { orderApi } from '@/services';
import { ROUTES } from '@/constants';
import { formatPrice } from '@/utils/helpers';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useMounted();
  const { isAuthenticated } = useAuth();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;

    const verifyPayment = async () => {
      try {
        setLoading(true);
        
        // Récupérer l'orderId depuis l'URL ou localStorage
        const orderIdFromUrl = searchParams.get('orderId') || searchParams.get('order_id');
        const transactionId = searchParams.get('transaction_id');
        const merchantTransactionId = searchParams.get('merchant_transaction_id');
        
        let orderId = orderIdFromUrl;
        
        // Si pas d'orderId dans l'URL, vérifier localStorage
        if (!orderId && typeof window !== 'undefined') {
          orderId = localStorage.getItem('pending_order_id');
        }

        console.log('🔍 [Success] Verifying payment:', {
          orderId,
          transactionId,
          merchantTransactionId,
        });

        if (!orderId && !merchantTransactionId) {
          setError('Identifiant de commande manquant');
          setLoading(false);
          return;
        }

        // Appeler l'API pour vérifier le statut de la commande
        const response = await orderApi.verifyPaymentPublic({
          orderId,
          merchantTransactionId,
          transactionId,
        });

        const orderData = response?.data?.order || response?.order;
        
        if (!orderData) {
          setError('Commande introuvable');
          setLoading(false);
          return;
        }

        // Vérifier le statut du paiement
        const paymentStatus = orderData.payment?.status;
        
        if (paymentStatus === 'paid' || paymentStatus === 'partial') {
          setOrder(orderData);
          toast.success('Paiement confirmé !');
          
          // Nettoyer localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pending_order_id');
          }
        } else if (paymentStatus === 'pending') {
          // Le paiement est encore en cours de traitement
          setOrder(orderData);
          toast.info('Paiement en cours de validation...');
        } else {
          // Statut inconnu ou échec
          setError('Statut du paiement non confirmé');
          setOrder(orderData);
        }
        
      } catch (err: any) {
        console.error('❌ [Success] Verification failed:', err);
        setError(err?.response?.data?.message || err?.message || 'Erreur de vérification');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [mounted, searchParams]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-accent" />
          <p className="text-lg font-medium">Vérification du paiement...</p>
          <p className="text-sm text-muted-foreground">Veuillez patienter quelques instants</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Une erreur est survenue</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <Link href={ROUTES.PRODUCTS}>Retour à l'accueil</Link>
            </Button>
            {isAuthenticated && (
              <Button variant="outline" asChild>
                <Link href={ROUTES.USER.PROFILE}>Mes commandes</Link>
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header de succès */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-14 h-14 text-emerald-500" />
          </motion.div>
          
          <h1 className="text-4xl font-bold mb-3">Paiement réussi !</h1>
          <p className="text-lg text-muted-foreground">
            Merci pour votre commande. Vous allez recevoir un email de confirmation.
          </p>
        </motion.div>

        {/* Carte de commande */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl border border-border bg-card p-8 mb-6"
          >
            <div className="flex items-start justify-between mb-6 pb-6 border-b border-border">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Numéro de commande</p>
                <h2 className="text-2xl font-bold">{order.orderNumber}</h2>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Date</p>
                <p className="font-medium">
                  {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Articles */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Articles commandés ({order.items?.length || 0})
              </h3>
              <div className="space-y-3">
                {order.items?.map((item: any) => (
                  <div key={item._id} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Quantité : {item.quantity}
                        {item.size && ` • Taille : ${item.size}`}
                        {item.color && ` • Couleur : ${item.color}`}
                      </p>
                    </div>
                    <p className="font-semibold">{formatPrice(item.subtotal || item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totaux */}
            <div className="space-y-2 pt-4 border-t border-border">
              <div className="flex justify-between text-muted-foreground">
                <span>Sous-total</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Remise</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Livraison</span>
                <span>{order.shippingCost > 0 ? formatPrice(order.shippingCost) : 'Gratuite'}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                <span>Total payé</span>
                <span className="text-accent">{formatPrice(order.total)}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Informations de livraison */}
        {order?.shipping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-3xl border border-border bg-card p-8 mb-6"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Livraison
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{order.shipping.fullName}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" />
                    {order.shipping.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm">
                  <p>{order.shipping.street}</p>
                  <p>{order.shipping.city}, {order.shipping.country}</p>
                  {order.shipping.postalCode && <p>{order.shipping.postalCode}</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <div className="rounded-3xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-3">Que faire maintenant ?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 text-accent" />
                <span>Consultez votre email pour la confirmation de commande</span>
              </li>
              <li className="flex items-start gap-2">
                <Truck className="w-4 h-4 mt-0.5 text-accent" />
                <span>Nous préparons votre colis et vous enverrons un suivi</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 text-accent" />
                <span>Votre commande est protégée par notre garantie</span>
              </li>
            </ul>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Button asChild size="lg" className="w-full">
              <Link href={ROUTES.PRODUCTS}>
                <Home className="w-4 h-4 mr-2" />
                Continuer mes achats
              </Link>
            </Button>
            {isAuthenticated ? (
              <Button variant="outline" asChild size="lg" className="w-full">
                <Link href={ROUTES.USER.PROFILE || '/profile'}>
                  <Package className="w-4 h-4 mr-2" />
                  Voir mes commandes
                </Link>
              </Button>
            ) : (
              <Button variant="outline" asChild size="lg" className="w-full">
                <Link href="/auth/login">
                  <Mail className="w-4 h-4 mr-2" />
                  Se connecter
                </Link>
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}