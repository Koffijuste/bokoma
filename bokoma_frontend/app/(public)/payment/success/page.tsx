// app/(public)/payment/success/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  CheckCircle, Package, Truck, Download, 
  Mail, Phone, MapPin, Shield, Loader2, AlertCircle, 
  Home, User, QrCode, Copy, ExternalLink, ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { orderApi } from '@/services';
import { ROUTES } from '@/constants';
import { formatPrice } from '@/utils/helpers';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';

// ─────────────────────────────────────────────────────────────
// 🔹 HELPER : Extraire l'image d'un item
// ─────────────────────────────────────────────────────────────
const getItemImage = (item: any): string | null => {
  if (!item) return null;
  
  // Image directe sur l'item
  if (item.image) return item.image;
  
  // Image depuis le produit
  if (item.product?.image) return item.product.image;
  
  // Images array
  if (item.product?.images && item.product.images.length > 0) {
    const img = item.product.images[0];
    return typeof img === 'string' ? img : img?.url || null;
  }
  
  return null;
};

// ─────────────────────────────────────────────────────────────
// 🔹 COMPOSANT : QR Code
// ─────────────────────────────────────────────────────────────
const OrderQRCode = ({ orderNumber, orderId }: { orderNumber: string; orderId: string }) => {
  // ✅ Utilise l'API publique de QR Server (pas besoin d'installation)
  const qrData = encodeURIComponent(
    `${typeof window !== 'undefined' ? window.location.origin : ''}/orders/${orderId}`
  );
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&margin=10&color=7c3aed`;
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `commande-${orderNumber}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code téléchargé');
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="p-3 bg-white rounded-2xl shadow-sm border border-border">
        <img
          src={qrUrl}
          alt={`QR Code commande ${orderNumber}`}
          width={160}
          height={160}
          className="rounded-lg"
        />
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-2">
          Scannez pour suivre votre commande
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="gap-2"
        >
          <Download className="w-3 h-3" />
          Télécharger
        </Button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🔹 COMPOSANT : Image d'article
// ─────────────────────────────────────────────────────────────
const ItemImage = ({ src, alt }: { src: string | null; alt: string }) => {
  const [hasError, setHasError] = useState(false);
  
  const isValid = src && typeof src === 'string' && 
    (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/'));

  if (!isValid || hasError) {
    return (
      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🔹 PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────
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
        setError(null);
        
        const orderIdFromUrl = searchParams.get('orderId') || searchParams.get('order_id');
        const transactionId = searchParams.get('transaction_id');
        const merchantTransactionId = searchParams.get('merchant_transaction_id');
        
        let orderId = orderIdFromUrl;
        
        if (!orderId && typeof window !== 'undefined') {
          orderId = localStorage.getItem('pending_order_id');
        }

        console.log('🔍 [Success] Verifying payment:', {
          orderId,
          transactionId,
          merchantTransactionId,
        });

        if (!orderId && !merchantTransactionId && !transactionId) {
          setError('Identifiant de commande manquant');
          setLoading(false);
          return;
        }

        const response = await orderApi.verifyPaymentPublic({
          orderId,
          merchantTransactionId,
          transactionId,
        });

        console.log('✅ [Success] Response:', response);

        const orderData = response?.data?.order || response?.order || response?.data;
        
        if (!orderData) {
          setError('Commande introuvable');
          setLoading(false);
          return;
        }

        const paymentStatus = orderData.payment?.status;
        
        if (paymentStatus === 'paid' || paymentStatus === 'partial') {
          setOrder(orderData);
          toast.success('Paiement confirmé !');
          
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pending_order_id');
          }
        } else if (paymentStatus === 'pending') {
          setOrder(orderData);
          toast.info('Paiement en cours de validation...');
        } else {
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

  // ✅ URL pour le QR code
  const orderTrackingUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/orders/${order?._id}`
    : '';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        
        {/* ═══════════════════════════════════════════════════ */}
        {/* HEADER DE SUCCÈS */}
        {/* ═══════════════════════════════════════════════════ */}
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

        {/* ═══════════════════════════════════════════════════ */}
        {/* CARTE DE COMMANDE */}
        {/* ═══════════════════════════════════════════════════ */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl border border-border bg-card p-6 sm:p-8 mb-6"
          >
            {/* En-tête commande */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-6 border-b border-border">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Numéro de commande</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold">{order.orderNumber}</h2>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(order.orderNumber);
                      toast.success('Numéro copié');
                    }}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Copier le numéro"
                  >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
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

            {/* ═══════ ARTICLES AVEC IMAGES ═══════ */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Articles commandés ({order.items?.length || 0})
              </h3>
              <div className="space-y-3">
                {order.items?.map((item: any, index: number) => {
                  const imageUrl = getItemImage(item);
                  const itemName = item.name || item.product?.name || 'Produit';
                  const itemPrice = item.subtotal || (item.price || 0) * (item.quantity || 1);
                  
                  // ✅ KEY ROBUSTE : _id ou index en fallback
                  const itemKey = item._id || `item-${index}`;
                  
                  return (
                    <div 
                      key={itemKey} 
                      className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      {/* ✅ IMAGE DU PRODUIT */}
                      <ItemImage src={imageUrl} alt={itemName} />
                      
                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{itemName}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs sm:text-sm text-muted-foreground">
                          <span>Qté : {item.quantity}</span>
                          {item.size && (
                            <span className="px-1.5 py-0.5 bg-background rounded">
                              Taille : {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="px-1.5 py-0.5 bg-background rounded">
                              Couleur : {item.color}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Prix */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-sm sm:text-base">
                          {formatPrice(itemPrice)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(item.price)} × {item.quantity}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ═══════ TOTAUX ═══════ */}
            <div className="space-y-2 pt-4 border-t border-border">
  <div className="flex justify-between text-muted-foreground">
    <span>Sous-total</span>
    <span>{formatPrice(order.subtotal || 0)}</span>
  </div>
  
  {/* ✅ Frais de livraison */}
  <div className="flex justify-between text-muted-foreground">
    <span className="flex items-center gap-2">
      <Truck className="w-4 h-4" />
      Livraison
    </span>
    <span>
      {order.shippingCost > 0 
        ? formatPrice(order.shippingCost) 
        : <span className="text-emerald-600">Gratuite</span>}
    </span>
  </div>
  
  {order.discount > 0 && (
    <div className="flex justify-between text-emerald-600">
      <span>Remise</span>
      <span>-{formatPrice(order.discount)}</span>
    </div>
  )}
  
  {/* ✅ Total de la commande */}
  <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
    <span>Total commande</span>
    <span>{formatPrice(order.total)}</span>
  </div>
  
  {/* ✅ Paiement partiel - Afficher les détails */}
  {order.payment?.isPartialPayment && (
    <>
      <div className="mt-4 p-4 bg-accent/10 border border-accent/20 rounded-xl space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-sm">Paiement partiel</span>
        </div>
        
        {/* Montant payé en ligne */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Acompte payé en ligne</span>
          <span className="font-semibold text-emerald-600">
            {formatPrice(order.payment.amountPaid)}
          </span>
        </div>
        
        {/* Reste à payer à la livraison */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Reste à payer à la livraison</span>
          <span className="font-semibold text-accent">
            {formatPrice(order.payment.remainingAmount)}
          </span>
        </div>
        
        <div className="pt-2 mt-2 border-t border-accent/20">
          <p className="text-xs text-muted-foreground">
            💡 Vous recevrez votre commande après paiement du solde à la livraison
          </p>
        </div>
      </div>
    </>
  )}
  
  {/* ✅ Paiement intégral */}
  {!order.payment?.isPartialPayment && (
    <div className="flex justify-between font-bold text-lg pt-2 border-t border-border text-accent">
      <span>Total payé</span>
      <span>{formatPrice(order.total)}</span>
    </div>
  )}
</div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* QR CODE + LIVRAISON (côte à côte sur desktop) */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          
          {/* QR Code */}
          {order && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-3xl border border-border bg-card p-6"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Suivi de commande
              </h3>
              <OrderQRCode 
                orderNumber={order.orderNumber} 
                orderId={order._id} 
              />
            </motion.div>
          )}

          {/* Livraison */}
          {order?.shipping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="rounded-3xl border border-border bg-card p-6"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Livraison
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{order.shipping.fullName || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{order.shipping.phone || 'N/A'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="text-sm min-w-0">
                    <p className="break-words">{order.shipping.street || ''}</p>
                    <p className="break-words">
                      {order.shipping.city || ''}
                      {order.shipping.postalCode ? ` ${order.shipping.postalCode}` : ''}
                      {order.shipping.country ? `, ${order.shipping.country}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* ACTIONS */}
        {/* ═══════════════════════════════════════════════════ */}
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
                <Mail className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
                <span>Consultez votre email pour la confirmation de commande</span>
              </li>
              <li className="flex items-start gap-2">
                <Truck className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
                <span>Nous préparons votre colis et vous enverrons un suivi</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
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