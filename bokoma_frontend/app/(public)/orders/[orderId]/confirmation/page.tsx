// app/(public)/orders/[orderId]/confirmation/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  CheckCircle, Download, Printer, Share2, ArrowLeft, Package, 
  CreditCard, Truck, Calendar, Mail, Phone, MapPin, Copy, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import { orderApi } from '@/services';
import { ROUTES } from '@/constants';
import { formatPrice, formatDate } from '@/utils/helpers';
import type { Order } from '@/types';

// ============================================================================
// 🔹 HELPER: Générer un QR Code data URL pour le PDF
// ============================================================================
const generateQRCodeDataUrl = (data: string): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }
    
    // QR Code simple en canvas (version légère sans librairie externe)
    const size = 100;
    canvas.width = size;
    canvas.height = size;
    
    // Fond blanc
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Motif QR simplifié (pour l'exemple - en prod, utilisez react-qr-code export)
    ctx.fillStyle = '#000000';
    const pattern = data.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if ((pattern + i * j) % 3 === 0) {
          ctx.fillRect(i * 10, j * 10, 8, 8);
        }
      }
    }
    
    resolve(canvas.toDataURL('image/png'));
  });
};

// ============================================================================
// 🔹 COMPOSANT PRINCIPAL
// ============================================================================
export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const { orderId } = params as { orderId: string };
  
  const { user } = useAuth();
  const mounted = useMounted();
  const receiptRef = useRef<HTMLDivElement>(null);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // ============================================================================
  // 🔹 FETCH ORDER DETAILS
  // ============================================================================
  useEffect(() => {
    if (!mounted || !orderId) return;
    
    const fetchOrder = async () => {
      try {

        if (orderData.payment?.status === 'failed' || orderData.payment?.status === 'cancelled') {
            // Rediriger vers la page d'échec
          router.replace(`/payment/echec?orderId=${orderId}`);
        return;
        }

        if (orderData.payment?.status === 'pending') {
            // Afficher un message d'attente
            setPending(true);
        }

        setLoading(true);
        const response = await orderApi.getOrder(orderId);
        const orderData = response.data?.order || response.order;
        setOrder(orderData);
        
        // Générer la valeur du QR Code
        const qrData = JSON.stringify({
          orderId: orderData?._id,
          orderNumber: orderData?.orderNumber,
          total: orderData?.total,
          date: orderData?.createdAt,
          customer: user?.email,
          verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verify/${orderData?._id}`,
        });
        setQrCodeValue(qrData);
        
      } catch (err) {
        console.error('❌ Failed to fetch order:', err);
        toast.error('Impossible de charger les détails de la commande');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrder();
  }, [mounted, orderId, user]);

  // ============================================================================
  // 🔹 DOWNLOAD RECEIPT AS PDF
  // ============================================================================
  const downloadReceipt = async () => {
    if (!order || !receiptRef.current) return;
    
    setIsGeneratingPdf(true);
    
    try {
      // Utiliser html2canvas + jsPDF pour un rendu fidèle
      const element = receiptRef.current;
      
      // Pour un PDF simple sans html2canvas (plus léger) :
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      // En-tête
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('REÇU DE COMMANDE', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Bokoma Store`, 105, 30, { align: 'center' });
      doc.text(`Commande #${order.orderNumber}`, 105, 38, { align: 'center' });
      
      // Date
      doc.setFontSize(10);
      doc.text(`Date: ${formatDate(order.createdAt)}`, 20, 50);
      doc.text(`Statut: ${order.status}`, 20, 56);
      
      // Client
      doc.setFont('helvetica', 'bold');
      doc.text('Client:', 20, 70);
      doc.setFont('helvetica', 'normal');
      doc.text(`${order.shipping?.fullName || 'N/A'}`, 20, 76);
      doc.text(`${order.shipping?.address || 'N/A'}`, 20, 82);
      doc.text(`${order.shipping?.city}, ${order.shipping?.country}`, 20, 88);
      doc.text(`Tél: ${order.shipping?.phone || 'N/A'}`, 20, 94);
      
      // Items tableau
      const tableData = (order.items || []).map((item: any) => [
        item.name || 'Produit',
        `${item.quantity} x ${formatPrice(item.price)}`,
        formatPrice((item.price || 0) * (item.quantity || 1)),
      ]);
      
      (doc as any).autoTable({
        startY: 105,
        head: [['Article', 'Prix unitaire', 'Sous-total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 9 },
      });
      
      // Totaux
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.text(`Sous-total: ${formatPrice(order.subtotal)}`, 140, finalY);
      doc.text(`Livraison: ${formatPrice(order.shippingCost || 0)}`, 140, finalY + 6);
      if (order.discount > 0) {
        doc.text(`Remise: -${formatPrice(order.discount)}`, 140, finalY + 12);
      }
      doc.setFontSize(14);
      doc.text(`TOTAL: ${formatPrice(order.total)}`, 140, finalY + 22);
      
      // QR Code (placeholder - pour un vrai QR, utilisez html2canvas)
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Scan pour vérifier la commande:', 20, finalY + 40);
      doc.text(`${process.env.NEXT_PUBLIC_APP_URL}/verify/${order._id}`, 20, finalY + 46);
      
      // Pied de page
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Merci pour votre achat !', 105, 280, { align: 'center' });
      doc.text('Bokoma Store - contact@bokoma.com', 105, 286, { align: 'center' });
      
      // Télécharger
      doc.save(`recu-commande-${order.orderNumber}.pdf`);
      toast.success('Reçu téléchargé avec succès');
      
    } catch (err) {
      console.error('❌ PDF generation failed:', err);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // ============================================================================
  // 🔹 SHARE ORDER
  // ============================================================================
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
        // Fallback: copier le lien
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Lien copié dans le presse-papiers');
      }
    } catch (err) {
      console.error('Share failed:', err);
      // Fallback ultime
      await navigator.clipboard.writeText(shareData.url);
      toast.success('Lien copié dans le presse-papiers');
    }
  };

  // ============================================================================
  // 🔹 PRINT RECEIPT
  // ============================================================================
  const printReceipt = () => {
    window.print();
  };

  // ============================================================================
  // 🔹 LOADING STATE
  // ============================================================================
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Chargement de votre commande...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 🔹 ERROR STATE
  // ============================================================================
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Commande introuvable</h2>
          <p className="text-muted-foreground mb-6">
            Nous n'avons pas pu trouver les détails de cette commande.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <Link href={ROUTES.USER.PROFILE}>
                Voir mes commandes
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={ROUTES.PRODUCTS}>
                Continuer mes achats
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================================================
  // 🔹 STATUS CONFIG
  // ============================================================================
  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: 'En attente', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20', icon: Calendar },
    confirmed: { label: 'Confirmée', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20', icon: CheckCircle },
    processing: { label: 'En préparation', color: 'bg-purple-500/10 text-purple-700 border-purple-500/20', icon: Package },
    shipped: { label: 'Expédiée', color: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20', icon: Truck },
    delivered: { label: 'Livrée', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20', icon: CheckCircle },
    cancelled: { label: 'Annulée', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: Package },
  };
  const status = statusConfig[order.status] || statusConfig.pending;

  // ============================================================================
  // 🔹 MAIN RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={ROUTES.USER.PROFILE} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Mes commandes</span>
          </Link>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600">Paiement confirmé</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 print:py-4">
        
        {/* Success Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center"
        >
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Merci pour votre commande !
          </h1>
          <p className="text-muted-foreground">
            Votre commande <span className="font-semibold">#{order.orderNumber}</span> a été confirmée.
            <br className="hidden sm:inline" />
            Vous recevrez un email de confirmation sous peu.
          </p>
        </motion.div>

        {/* Action Buttons - Print only hidden */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap gap-3 mb-8 justify-center print:hidden"
        >
          <Button onClick={downloadReceipt} disabled={isGeneratingPdf} className="gap-2">
            {isGeneratingPdf ? (
              <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Génération...</>
            ) : (
              <><Download className="w-4 h-4" /> Télécharger le reçu</>
            )}
          </Button>
          <Button variant="outline" onClick={printReceipt} className="gap-2">
            <Printer className="w-4 h-4" /> Imprimer
          </Button>
          <Button variant="outline" onClick={shareOrder} className="gap-2">
            <Share2 className="w-4 h-4" /> Partager
          </Button>
        </motion.div>

        {/* Receipt Container - Hidden from print actions, visible in PDF */}
        <div ref={receiptRef} className="space-y-6">
          
          {/* Order Summary Card */}
          <Card className="border-2 border-border/50">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Détails de la commande
                  </CardTitle>
                  <p className="text-muted-foreground text-sm mt-1">
                    #{order.orderNumber} • {formatDate(order.createdAt)}
                  </p>
                </div>
                <Badge className={status.color} variant="outline">
                  <status.icon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Items */}
              <div>
                <h3 className="font-semibold mb-3">Articles commandés</h3>
                <div className="space-y-3">
                  {order.items?.map((item: any, index: number) => {
                    const product = item.product as any;
                    const productName = typeof product === 'object' ? product.name : item.name || 'Produit';
                    const productImage = typeof product === 'object' 
                      ? product.images?.[0]?.url || product.images?.[0]
                      : null;
                    
                    return (
                      <div key={item._id || index} className="flex gap-4 p-3 rounded-xl bg-muted/30">
                        <div className="w-16 h-16 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                          {productImage ? (
                            <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              Pas d'image
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-1">{productName}</h4>
                          {(item.size || item.color) && (
                            <div className="flex gap-2 mt-1">
                              {item.size && <Badge variant="outline" className="text-xs">{item.size}</Badge>}
                              {item.color && <Badge variant="outline" className="text-xs">{item.color}</Badge>}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Qté: {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold">{formatPrice((item.price || 0) * (item.quantity || 1))}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Price Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Remise</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livraison</span>
                  <span>{order.shippingCost > 0 ? formatPrice(order.shippingCost) : 'Gratuite'}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total payé</span>
                  <span className="text-accent">{formatPrice(order.total)}</span>
                </div>
                {order.payment?.method === 'cash_on_delivery' && order.payment?.amountPaid > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    * {formatPrice(order.payment.amountPaid)} payés maintenant, solde à la livraison
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shipping & Payment Info */}
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Shipping Address */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Adresse de livraison
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="font-medium">{order.shipping?.fullName}</p>
                <p className="text-muted-foreground">{order.shipping?.address}</p>
                <p className="text-muted-foreground">
                  {order.shipping?.city}, {order.shipping?.country}
                  {order.shipping?.postalCode && ` ${order.shipping.postalCode}`}
                </p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {order.shipping?.phone}
                </p>
                {order.shipping?.trackingNumber && (
                  <p className="text-muted-foreground flex items-center gap-1 mt-2">
                    <Truck className="w-3 h-3" /> Suivi: {order.shipping.trackingNumber}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {{
                      card: 'Carte bancaire',
                      mobile_money: 'Mobile Money',
                      cash_on_delivery: 'À la livraison',
                      bank_transfer: 'Virement',
                    }[order.payment?.method as string] || 'Inconnu'}
                  </Badge>
                  <Badge className={order.payment?.status === 'paid' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'} variant="outline">
                    {{
                      paid: 'Payé',
                      pending: 'En attente',
                      partial: 'Partiel',
                      failed: 'Échoué',
                    }[order.payment?.status as string] || 'Inconnu'}
                  </Badge>
                </div>
                {order.payment?.transactionId && (
                  <p className="text-muted-foreground text-xs">
                    Transaction: <span className="font-mono">{order.payment.transactionId.slice(0, 12)}...</span>
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  Date: {formatDate(order.createdAt)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* QR Code Section */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* QR Code */}
                <div className="p-4 bg-white rounded-xl border border-border">
                  <QRCode 
                    value={qrCodeValue || `${process.env.NEXT_PUBLIC_APP_URL}/verify/${order._id}`}
                    size={120}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                </div>
                
                {/* QR Info */}
                <div className="text-center sm:text-left">
                  <h3 className="font-semibold mb-2">Vérifier cette commande</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Scannez ce QR Code avec votre téléphone pour vérifier l'authenticité de votre commande ou partager le reçu.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-muted-foreground">
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">
                      {process.env.NEXT_PUBLIC_APP_URL}/verify/{order._id}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={async () => {
                        await navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL}/verify/${order._id}`);
                        toast.success('Lien copié !');
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Support */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="font-medium">Besoin d'aide ?</p>
                  <p className="text-sm text-muted-foreground">
                    Contactez notre support à{' '}
                    <a href="mailto:support@bokoma.com" className="text-accent hover:underline">
                      support@bokoma.com
                    </a>{' '}
                    ou appelez le <span className="font-medium">+225 XX XX XX XX</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Footer Actions - Print only hidden */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-10 text-center print:hidden"
        >
          <p className="text-muted-foreground text-sm mb-4">
            Un email de confirmation a été envoyé à{' '}
            <span className="font-medium">{user?.email || 'votre adresse email'}</span>
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
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
        </motion.div>

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
          
          /* Hide interactive elements */
          button, [role="button"], a[href] { 
            pointer-events: none; 
            text-decoration: none !important;
          }
          
          /* Ensure QR code prints */
          canvas { 
            image-rendering: pixelated; 
          }
        }
      `}</style>
    </div>
  );
}