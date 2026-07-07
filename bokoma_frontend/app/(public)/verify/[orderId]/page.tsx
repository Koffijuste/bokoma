// app/(public)/verify/[orderId]/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  CheckCircle, XCircle, AlertTriangle, Loader2, Shield, 
  Package, Calendar, CreditCard, Truck, MapPin, 
  QrCode, Copy, RefreshCw, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { orderApi } from '@/services';
import { ROUTES } from '@/constants';
import { formatPrice, formatDateTime, formatRelativeTime } from '@/utils/helpers';
import type { Order } from '@/types';

// ✅ Import dynamique de QRCode (chargé uniquement quand nécessaire)
const QRCode = dynamic(() => import('react-qr-code'), {
  ssr: false,
  loading: () => <div className="w-[140px] h-[140px] bg-muted animate-pulse rounded" />
});

const PUBLIC_STATUS_CONFIG: Record<string, { 
  label: string; 
  colorClass: string;
  icon: any;
  message: string;
  isFinal: boolean;
}> = {
  pending: { 
    label: 'En attente', 
    colorClass: 'bg-amber-500/10 text-amber-700 border-amber-500/20', 
    icon: Calendar,
    message: 'Votre commande est en cours de traitement.',
    isFinal: false,
  },
  confirmed: { 
    label: 'Confirmée', 
    colorClass: 'bg-blue-500/10 text-blue-700 border-blue-500/20', 
    icon: CheckCircle,
    message: 'Commande confirmée et en préparation.',
    isFinal: false,
  },
  processing: { 
    label: 'En préparation', 
    colorClass: 'bg-purple-500/10 text-purple-700 border-purple-500/20', 
    icon: Package,
    message: 'Vos articles sont en cours de préparation.',
    isFinal: false,
  },
  shipped: { 
    label: 'Expédiée', 
    colorClass: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20', 
    icon: Truck,
    message: 'Votre commande est en route vers vous.',
    isFinal: false,
  },
  delivered: { 
    label: 'Livrée ✓', 
    colorClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20', 
    icon: CheckCircle,
    message: 'Commande livrée avec succès.',
    isFinal: true,
  },
  cancelled: { 
    label: 'Annulée', 
    colorClass: 'bg-destructive/10 text-destructive border-destructive/20', 
    icon: XCircle,
    message: 'Cette commande a été annulée.',
    isFinal: true,
  },
  refunded: { 
    label: 'Remboursée', 
    colorClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20', 
    icon: CheckCircle,
    message: 'Remboursement effectué.',
    isFinal: true,
  },
};

const StatusBadge = ({ 
  children, 
  colorClass 
}: { 
  children: React.ReactNode; 
  colorClass: string;
}) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
    {children}
  </span>
);

export default function OrderVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const { orderId } = params as { orderId: string };
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'valid' | 'invalid' | 'expired' | 'error'>('valid');
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  useEffect(() => {
    if (!orderId) {
      setError('ID de commande manquant');
      setLoading(false);
      setVerificationStatus('invalid');
      return;
    }

    const verifyOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await orderApi.getOrder(orderId);
        const orderData = (response.data as any)?.data?.order || (response.data as any)?.order || (response as any).order;
        
        if (!orderData) {
          throw new Error('Commande introuvable');
        }
        
        setOrder(orderData);
        setVerificationStatus('valid');
        setLastChecked(new Date());
        
      } catch (err: any) {
        console.error('❌ Verification failed:', err);
        
        if (err?.statusCode === 404) {
          setError('Cette commande n\'existe pas ou a été supprimée.');
          setVerificationStatus('invalid');
        } else if (err?.statusCode === 410) {
          setError('Cette commande a expiré ou n\'est plus vérifiable.');
          setVerificationStatus('expired');
        } else {
          setError('Impossible de vérifier cette commande. Veuillez réessayer.');
          setVerificationStatus('error');
        }
      } finally {
        setLoading(false);
      }
    };
    
    verifyOrder();
  }, [orderId]);

  const refreshVerification = async () => {
    if (!orderId) return;
    toast.loading('Vérification en cours...');
    try {
      const response = await orderApi.getOrder(orderId);
      const orderData = (response.data as any)?.data?.order || (response.data as any)?.order || (response as any).order;
      if (orderData) {
        setOrder(orderData);
        setVerificationStatus('valid');
        setLastChecked(new Date());
        toast.success('Commande vérifiée avec succès');
      }
    } catch {
      toast.error('Échec de la vérification');
    }
  };

  const copyVerificationLink = async () => {
    const url = `${window.location.origin}/verify/${orderId}`;
    await navigator.clipboard.writeText(url);
    toast.success('Lien de vérification copié !');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-300">
          <div className="relative mx-auto mb-6">
            <div className="w-20 h-20 border-4 border-accent/20 rounded-full" />
            <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-accent animate-spin" />
          </div>
          <h2 className="text-xl font-bold mb-2">Vérification en cours...</h2>
          <p className="text-muted-foreground">Nous vérifions l'authenticité de cette commande.</p>
        </div>
      </div>
    );
  }

  if (!order || verificationStatus !== 'valid') {
    const config = {
      invalid: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', title: 'Commande invalide', message: error || 'Cette commande n\'existe pas.', action: 'Retour à l\'accueil', link: ROUTES.HOME },
      expired: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10', title: 'Vérification expirée', message: error || 'Cette commande a expiré.', action: 'Contacter le support', link: '/help' },
      error: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10', title: 'Erreur', message: error || 'Une erreur est survenue.', action: 'Réessayer', link: null },
    };
    const c = (config as any)[verificationStatus] || config.invalid;
    const Icon = c.icon;
    
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="text-center max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={`w-20 h-20 ${c.bg} rounded-full flex items-center justify-center mx-auto mb-6`}>
            <Icon className={`w-10 h-10 ${c.color}`} />
          </div>
          <h2 className="text-2xl font-bold mb-3">{c.title}</h2>
          <p className="text-muted-foreground mb-6">{c.message}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {verificationStatus === 'error' ? (
              <Button onClick={refreshVerification} className="gap-2"><RefreshCw className="w-4 h-4" /> Réessayer</Button>
            ) : (
              <Button asChild><Link href={c.link}>{c.action}</Link></Button>
            )}
            <Button variant="outline" asChild><Link href={ROUTES.PRODUCTS}>Découvrir nos produits</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  const status = PUBLIC_STATUS_CONFIG[order.status] || PUBLIC_STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  
  const publicOrder = {
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    total: order.total,
    currency: order.currency || 'XOF',
    itemCount: order.items?.length || 0,
    shipping: { city: order.shipping?.city, country: order.shipping?.country },
    payment: { method: order.payment?.method },
  };

  const paymentLabels: Record<string, string> = {
    card: 'Carte bancaire',
    mobile_money: 'Mobile Money',
    cash_on_delivery: 'À la livraison',
    bank_transfer: 'Virement',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={ROUTES.HOME} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Bokoma Store</span>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-600">Vérification officielle</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-center gap-3 mb-3">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
            <span className="text-lg font-bold text-emerald-700">Commande vérifiée ✓</span>
          </div>
          <p className="text-muted-foreground text-sm">Cette commande Bokoma est authentique et enregistrée dans notre système.</p>
          <p className="text-xs text-muted-foreground mt-2">Dernière vérification: {formatRelativeTime(lastChecked)}</p>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <Card className="border-2 border-border/50">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Package className="w-5 h-5" />
                    Commande #{publicOrder.orderNumber}
                  </CardTitle>
                  <p className="text-muted-foreground text-sm mt-1">Passée le {formatDateTime(publicOrder.createdAt)}</p>
                </div>
                <StatusBadge colorClass={status.colorClass}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </StatusBadge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl bg-muted/30">
                <p className="text-sm text-center text-muted-foreground">{status.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Total</p>
                  <p className="font-semibold text-lg">{formatPrice(publicOrder.total, publicOrder.currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Articles</p>
                  <p className="font-semibold">{publicOrder.itemCount} produit{publicOrder.itemCount > 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Livraison</p>
                  <p className="font-semibold flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {publicOrder.shipping.city}, {publicOrder.shipping.country}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Paiement</p>
                  <p className="font-semibold flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    {paymentLabels[publicOrder.payment.method as string] || 'Inconnu'}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3 text-sm">Aperçu des articles</h3>
                <div className="space-y-2">
                  {order.items?.slice(0, 3).map((item: any, index: number) => {
                    const productName = typeof item.product === 'object' ? item.product.name : item.name || 'Produit';
                    return (
                      <div key={item._id || index} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground truncate max-w-[150px]">{productName}</span>
                        <span className="font-medium">{item.quantity} × {formatPrice(item.price, publicOrder.currency)}</span>
                      </div>
                    );
                  })}
                  {(order.items?.length || 0) > 3 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      + {(order.items?.length || 0) - 3} autre{(order.items?.length || 0) - 3 > 1 ? 's' : ''}...
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-xl border border-border shadow-sm">
                  <QRCode 
                    value={`${process.env.NEXT_PUBLIC_APP_URL}/verify/${order._id}`}
                    size={140}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold mb-2 flex items-center justify-center gap-2">
                    <QrCode className="w-4 h-4" />
                    Partager cette vérification
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">Scannez ce QR Code ou partagez le lien pour vérifier cette commande à tout moment.</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={copyVerificationLink} className="gap-2">
                      <Copy className="w-4 h-4" /> Copier le lien
                    </Button>
                    <Button variant="outline" size="sm" onClick={refreshVerification} className="gap-2">
                      <RefreshCw className="w-4 h-4" /> Actualiser
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-4 rounded-xl bg-muted/30 text-center animate-in fade-in duration-500 delay-300">
          <Shield className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Cette page de vérification est sécurisée et officielle. 
            <br />Bokoma Store ne vous demandera jamais vos informations de paiement par email ou SMS.
          </p>
        </div>

        <div className="mt-10 text-center space-y-3 animate-in fade-in duration-500 delay-400">
          <p className="text-muted-foreground text-sm">Vous êtes le propriétaire de cette commande ?</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href={`/auth/login?from=${encodeURIComponent(`/orders/${order._id}`)}`}>
                Se connecter pour voir les détails
              </Link>
            </Button>
            <Button asChild>
              <Link href={ROUTES.HOME}>Retour à l'accueil</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}