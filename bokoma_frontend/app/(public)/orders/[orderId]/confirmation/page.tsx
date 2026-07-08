// app/(public)/orders/[orderId]/confirmation/page.tsx
'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle, Download, Printer, Share2, ArrowLeft, Package, 
  CreditCard, Truck, Calendar, Mail, Phone, MapPin, Copy, ExternalLink,
  Clock, ShoppingBag, Sparkles, Gift, ShieldCheck, Image as ImageIcon,
  RefreshCw, XCircle, AlertCircle, Receipt
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import { orderApi } from '@/services';
import { ROUTES } from '@/constants';
import { formatPrice, formatDate, cn } from '@/utils/helpers';
import { useCartStore } from '@/store';
import type { Order } from '@/types';

// ============================================================================
// 🔹 COMPOSANT : Image Produit avec Fallback
// ============================================================================
const ProductImage = React.memo(({ 
  src, 
  alt, 
  size = 'md' 
}: { 
  src?: string; 
  alt: string;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const sizeClasses = {
    sm: 'w-14 h-14',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  };

  return (
    <div className={cn(
      "relative rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 flex-shrink-0 group",
      sizeClasses[size]
    )}>
      {!imgError && src ? (
        <>
          {!imgLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          <img 
            src={src} 
            alt={alt}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={cn(
              "w-full h-full object-cover transition-all duration-500",
              imgLoaded ? "opacity-100" : "opacity-0",
              "group-hover:scale-110"
            )}
          />
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-accent/10 to-purple-500/10">
          <ImageIcon className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Image</span>
        </div>
      )}
    </div>
  );
});
ProductImage.displayName = 'ProductImage';

// ============================================================================
// 🔹 COMPOSANT : QR Code via API externe (SANS dépendance)
// ============================================================================
const QRCodeImage = React.memo(({ value, size = 160 }: { value: string; size?: number }) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=10&color=1a1a1a&bgcolor=ffffff`;
  
  return (
    <div className="relative group">
      {/* Décorations */}
      <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-accent rounded-tl-lg" />
      <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-accent rounded-tr-lg" />
      <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-accent rounded-bl-lg" />
      <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-accent rounded-br-lg" />
      
      <div className="relative p-5 bg-white rounded-2xl shadow-xl shadow-accent/10 border border-border/50">
        <img 
          src={qrUrl} 
          alt="QR Code"
          width={size}
          height={size}
          className="rounded-lg"
          loading="lazy"
        />
        
        {/* Logo au centre */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shadow-lg ring-4 ring-white">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
      
      {/* Badge de vérification */}
      <div className="absolute -top-3 -right-3 bg-gradient-to-br from-emerald-500 to-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" />
        Vérifié
      </div>
    </div>
  );
});
QRCodeImage.displayName = 'QRCodeImage';

// ============================================================================
// 🔹 COMPOSANT : Timeline de Statut
// ============================================================================
const StatusTimeline = React.memo(({ currentStatus }: { currentStatus: string }) => {
  const steps = [
    { status: 'pending', label: 'Commande', icon: ShoppingBag },
    { status: 'confirmed', label: 'Confirmée', icon: CheckCircle },
    { status: 'processing', label: 'Préparation', icon: Package },
    { status: 'shipped', label: 'Expédiée', icon: Truck },
    { status: 'delivered', label: 'Livrée', icon: CheckCircle },
  ];

  const currentIndex = steps.findIndex(s => s.status === currentStatus);
  const isCancelled = currentStatus === 'cancelled';
  const isRefunded = currentStatus === 'refunded';

  if (isCancelled || isRefunded) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
          <XCircle className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-destructive">
            {isCancelled ? 'Commande annulée' : 'Commande remboursée'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isCancelled ? 'Cette commande a été annulée' : 'Le remboursement a été effectué'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <React.Fragment key={step.status}>
              <div className="flex flex-col items-center gap-1.5">
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    isActive 
                      ? isCurrent
                        ? "bg-gradient-to-br from-accent to-purple-500 text-white shadow-lg shadow-accent/30 scale-110"
                        : "bg-accent/20 text-accent"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className={cn(
                  "text-[10px] sm:text-xs font-medium text-center max-w-[70px]",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 mb-6">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      index < currentIndex ? "bg-accent" : "bg-muted"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
});
StatusTimeline.displayName = 'StatusTimeline';

// ============================================================================
// 🔹 COMPOSANT PRINCIPAL
// ============================================================================
export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const { orderId } = params as { orderId: string };
  
  const { user } = useAuth();
  const mounted = useMounted();
  const clearCart = useCartStore((state) => state.clearCart);
  const receiptRef = useRef<HTMLDivElement>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const verifyUrl = useMemo(() => {
    if (!order?._id) return '';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${baseUrl}/verify/${order._id}`;
  }, [order?._id]);

  // ============================================================================
  // 🔹 FETCH ORDER DETAILS
  // ============================================================================
  const fetchOrder = useCallback(async (showLoader = true) => {
    if (!orderId) return;
    
    try {
      if (showLoader) setLoading(true);
      const response = await orderApi.getOrder(orderId);
      const orderData = (response.data as any)?.data?.order || (response.data as any)?.order || (response as any).order;
      
      if (orderData.payment?.status === 'failed' || orderData.status === 'cancelled') {
        if (showLoader) {
          router.replace(`/payment/failed?orderId=${orderId}`);
          return;
        }
      }

      setOrder(orderData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('❌ Failed to fetch order:', err);
      if (showLoader) toast.error('Impossible de charger les détails');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    if (!mounted || !orderId) return;
    fetchOrder();
  }, [mounted, orderId, fetchOrder]);

  // ✅ Si on arrive directement sur cette page (rechargement, bookmark, partage),
  //    on vide aussi le panier dès que la commande est confirmée — y compris
  //    en cas de paiement partiel (l'acompte suffit à considérer la commande
  //    comme "payée" côté UX).
  useEffect(() => {
    if (!order) return;
    const pay = order.payment?.status;
    if (
      pay === 'paid' ||
      pay === 'partial' ||
      ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)
    ) {
      clearCart();
    }
  }, [order, clearCart]);

  // ============================================================================
  // 🔹 POLLING pour mise à jour en temps réel
  // ============================================================================
  useEffect(() => {
    if (!order || !mounted) return;
    
    // Arrêter le polling si la commande est déjà livrée/annulée
    if (['delivered', 'cancelled', 'refunded'].includes(order.status)) return;
    
    const interval = setInterval(() => {
      fetchOrder(false);
    }, 10000); // Toutes les 10 secondes
    
    return () => clearInterval(interval);
  }, [order?.status, mounted, fetchOrder]);

  // ============================================================================
  // 🔹 ACTIONS
  // ============================================================================
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrder(false);
    toast.success('Commande actualisée');
  };

  const handlePrint = () => {
    window.print();
  };

  const shareOrder = async () => {
    if (!order) return;
    
    const shareData = {
      title: `Commande #${order.orderNumber} - Bokoma`,
      text: `Ma commande #${order.orderNumber} d'un montant de ${formatPrice(order.total)} est confirmée !`,
      url: `${window.location.origin}/orders/${order._id}/confirmation`,
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Commande partagée !');
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Lien copié !');
      }
    } catch {
      await navigator.clipboard.writeText(shareData.url);
      toast.success('Lien copié !');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  };

  // ============================================================================
  // 🔹 LOADING STATE
  // ============================================================================
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background to-accent/5">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-accent/20 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-accent" />
          </div>
          <p className="text-muted-foreground font-medium">Chargement de votre commande...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Commande introuvable</h2>
          <p className="text-muted-foreground mb-6">
            Nous n'avons pas pu trouver les détails de cette commande.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <Link href={ROUTES.USER.PROFILE}>Voir mes commandes</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={ROUTES.PRODUCTS}>Continuer mes achats</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 🔹 STATUS CONFIG
  // ============================================================================
  const statusConfig: Record<string, { label: string; color: string; icon: any; emoji: string }> = {
    pending: { label: 'En attente', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20', icon: Clock, emoji: '⏳' },
    confirmed: { label: 'Confirmée', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20', icon: CheckCircle, emoji: '✅' },
    processing: { label: 'En préparation', color: 'bg-purple-500/10 text-purple-700 border-purple-500/20', icon: Package, emoji: '📦' },
    shipped: { label: 'Expédiée', color: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20', icon: Truck, emoji: '🚚' },
    delivered: { label: 'Livrée', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20', icon: CheckCircle, emoji: '🎉' },
    cancelled: { label: 'Annulée', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: Package, emoji: '❌' },
    refunded: { label: 'Remboursée', color: 'bg-slate-500/10 text-slate-700 border-slate-500/20', icon: Package, emoji: '💰' },
  };
  const status = statusConfig[order.status] || statusConfig.pending;

  // ============================================================================
  // 🔹 MAIN RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 print:bg-white">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link href={ROUTES.USER.PROFILE} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Mes commandes</span>
          </Link>
          
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {new Date(lastUpdate).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 print:py-4">
        
        {/* Success Banner */}
        <div className="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-accent/10 to-purple-500/10 border border-emerald-500/20 text-center p-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 mb-4 shadow-lg shadow-emerald-500/30 animate-in zoom-in duration-500">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              Merci pour votre commande !
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Votre commande <span className="font-bold text-foreground">#{order.orderNumber}</span> a été confirmée avec succès.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center print:hidden animate-in fade-in duration-500 delay-100">
          <Button 
            onClick={handlePrint}
            variant="outline" 
            className="gap-2"
          >
            <Printer className="w-4 h-4" /> Imprimer
          </Button>
          <Button variant="outline" onClick={shareOrder} className="gap-2">
            <Share2 className="w-4 h-4" /> Partager
          </Button>
          <Button 
            onClick={() => {
              const text = `Commande #${order.orderNumber}\nTotal: ${formatPrice(order.total)}\nDate: ${formatDate(order.createdAt)}\nStatut: ${status.label}\n\nArticles:\n${order.items?.map(i => `- ${i.name} x${i.quantity}: ${formatPrice(i.price * i.quantity)}`).join('\n')}\n\nVérifier: ${verifyUrl}`;
              navigator.clipboard.writeText(text);
              toast.success('Reçu copié !');
            }}
            variant="outline"
            className="gap-2"
          >
            <Receipt className="w-4 h-4" /> Copier le reçu
          </Button>
        </div>

        {/* Receipt Container */}
        <div ref={receiptRef} className="space-y-6">
          
          {/* Order Summary Card */}
          <Card className="border-2 border-border/50 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-accent via-purple-500 to-pink-500" />
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Package className="w-5 h-5 text-accent" />
                    Détails de la commande
                  </CardTitle>
                  <p className="text-muted-foreground text-sm mt-1">
                    #{order.orderNumber} • {formatDate(order.createdAt)}
                  </p>
                </div>
                <Badge className={`${status.color} text-sm px-3 py-1`} variant="outline">
                  <status.icon className="w-3 h-3 mr-1" />
                  {status.emoji} {status.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Timeline */}
              <div className="print:hidden">
                <StatusTimeline currentStatus={order.status} />
              </div>

              <Separator />
              
              {/* Items */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-accent" />
                  Articles commandés ({order.items?.length || 0})
                </h3>
                <div className="space-y-3">
                  {order.items?.map((item: any, index: number) => {
                    const product = item.product as any;
                    const productName = typeof product === 'object' ? product.name : item.name || 'Produit';
                    const productImage = typeof product === 'object' 
                      ? product.images?.[0]?.url || product.images?.[0]
                      : item.image;
                    
                    return (
                      <div 
                        key={item._id || index} 
                        className="group flex gap-4 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 hover:border-accent/30 hover:shadow-md transition-all duration-300"
                      >
                        <ProductImage src={productImage} alt={productName} size="md" />
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base line-clamp-2 group-hover:text-accent transition-colors">
                            {productName}
                          </h4>
                          
                          {(item.size || item.color) && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.size && (
                                <Badge variant="outline" className="text-xs bg-background">
                                  Taille: {item.size}
                                </Badge>
                              )}
                              {item.color && (
                                <Badge variant="outline" className="text-xs bg-background">
                                  Couleur: {item.color}
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">{item.quantity}</span> × {formatPrice(item.price)}
                            </p>
                            <p className="font-bold text-accent">
                              {formatPrice((item.price || 0) * (item.quantity || 1))}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Price Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-accent" />
                  Récapitulatif
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="font-medium">{formatPrice(order.subtotal)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span className="flex items-center gap-1">
                        <Gift className="w-3 h-3" /> Remise
                      </span>
                      <span className="font-medium">-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Livraison</span>
                    <span className="font-medium">
                      {order.shippingCost > 0 ? formatPrice(order.shippingCost) : (
                        <span className="text-emerald-600 font-medium">Gratuite</span>
                      )}
                    </span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-bold text-lg">Total payé</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
                      {formatPrice(order.total)}
                    </span>
                  </div>
{order.payment?.remainingAmount && order.payment.remainingAmount > 0 && (
  <div className="mt-4 p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 rounded-xl">
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
        <span className="text-2xl">💰</span>
      </div>
      <div className="flex-1">
        <p className="font-bold text-sm text-amber-700 dark:text-amber-400 mb-3">
          Paiement partiel - À la livraison
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center p-2 bg-emerald-500/10 rounded-lg">
            <span className="text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Acompte payé maintenant
            </span>
            <span className="font-bold text-emerald-600">
              {formatPrice(order.payment.amountPaid ?? 0)}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-amber-500/20 rounded-lg border-2 border-amber-500/30">
            <span className="font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Reste à payer à la livraison
            </span>
            <span className="font-bold text-xl text-amber-700 dark:text-amber-400">
              {formatPrice(order.payment.remainingAmount)}
            </span>
          </div>
        </div>
        <div className="mt-3 p-2 bg-background/50 rounded-lg border border-border/50">
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Le montant restant de <strong>{formatPrice(order.payment.remainingAmount)}</strong> sera collecté en espèces lors de la livraison.
            </span>
          </p>
        </div>
      </div>
    </div>
  </div>
)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping & Payment Info */}
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Shipping Address */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-blue-500" />
                  </div>
                  Adresse de livraison
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="font-semibold">{order.shipping?.fullName}</p>
                <p className="text-muted-foreground">
                  {order.shipping?.street || order.shipping?.address}
                </p>
                <p className="text-muted-foreground">
                  {order.shipping?.city}, {order.shipping?.country}
                  {order.shipping?.postalCode && ` ${order.shipping.postalCode}`}
                </p>
                <p className="text-muted-foreground flex items-center gap-2 pt-2">
                  <Phone className="w-3 h-3" /> 
                  <span className="font-medium">{order.shipping?.phone}</span>
                </p>
                {order.shipping?.trackingNumber && (
                  <div className="mt-3 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <p className="text-xs text-cyan-700 dark:text-cyan-400 flex items-center gap-2">
                      <Truck className="w-3 h-3" /> 
                      <span>Suivi: <span className="font-mono font-medium">{order.shipping.trackingNumber}</span></span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                  </div>
                  Paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-background">
                    {{
                      card: '💳 Carte bancaire',
                      mobile_money: '📱 Mobile Money',
                      cash_on_delivery: '🏠 À la livraison',
                      bank_transfer: '🏦 Virement',
                    }[order.payment?.method as string] || 'Inconnu'}
                  </Badge>
                  <Badge className={cn(
                    order.payment?.status === 'paid' 
                      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' 
                      : order.payment?.status === 'partial'
                      ? 'bg-blue-500/10 text-blue-700 border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-700 border-amber-500/20',
                    'border'
                  )} variant="outline">
                    {{
                      paid: '✅ Payé',
                      pending: '⏳ En attente',
                      partial: '💰 Partiel',
                      failed: '❌ Échoué',
                    }[order.payment?.status as string] || 'Inconnu'}
                  </Badge>
                </div>
                {order.payment?.transactionId && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground">Transaction</span>
                    <span className="font-mono text-xs font-medium truncate max-w-[180px]">
                      {order.payment.transactionId}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Date</span>
                  <span className="font-medium">{formatDate(order.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* QR Code Section */}
          <Card className="border-2 border-dashed border-accent/30 bg-gradient-to-br from-accent/5 to-purple-500/5 overflow-hidden">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <QRCodeImage 
                  value={verifyUrl}
                  size={160}
                />
                
                <div className="text-center sm:text-left flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium mb-3">
                    <ShieldCheck className="w-3 h-3" />
                    Authentification
                  </div>
                  <h3 className="text-xl font-bold mb-2">Vérifier cette commande</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md">
                    Scannez ce QR Code avec votre téléphone pour vérifier l'authenticité de votre commande, suivre son statut ou partager le reçu avec un proche.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 p-2 rounded-lg bg-background/50 border border-border max-w-md">
                    <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
                      {verifyUrl}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => copyToClipboard(verifyUrl, 'Lien')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Support */}
          <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold mb-1">Besoin d'aide ?</p>
                  <p className="text-sm text-muted-foreground">
                    Contactez notre support à{' '}
                    <a href="mailto:support@bokoma.com" className="text-accent hover:underline font-medium">
                      support@bokoma.com
                    </a>{' '}
                    ou appelez le <span className="font-medium">+225 07 07 07 07 07</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Footer Actions */}
        <div className="mt-10 text-center print:hidden animate-in fade-in duration-500 delay-200">
          <p className="text-muted-foreground text-sm mb-4">
            Un email de confirmation a été envoyé à{' '}
            <span className="font-medium text-foreground">{user?.email || 'votre adresse email'}</span>
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href={ROUTES.USER.PROFILE}>Voir toutes mes commandes</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-accent to-purple-500 hover:from-accent/90 hover:to-purple-500/90 shadow-lg shadow-accent/20">
              <Link href={ROUTES.PRODUCTS}>Continuer mes achats</Link>
            </Button>
          </div>
        </div>

      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:py-4 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
          
          button, [role="button"], a[href] { 
            pointer-events: none; 
            text-decoration: none !important;
          }
          
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}