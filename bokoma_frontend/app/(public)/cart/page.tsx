// app/(public)/cart/page.tsx
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, CreditCard, Smartphone, Banknote, MapPin, Phone, User, 
  Plus, Minus, Trash2, CheckCircle, AlertCircle, Loader2,
  Package, Shield, ArrowLeft, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import { useCart } from '@/hooks/useCart';
import { orderApi } from '@/services';
import { ROUTES, STORAGE_KEYS } from '@/constants';
import { formatPrice } from '@/utils/helpers';
import type { Cart, Product } from '@/types';

import { PublicPageHeader } from '@/components/ui/public-page-header';

<PublicPageHeader
  title="Mon Panier"
  description={`${cart.items.length} article${cart.items.length > 1 ? 's' : ''}`}
  icon={<ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />}
  showBackButton
  backHref="/products"
  breadcrumbs={[
    { label: 'Produits', href: '/products' },
    { label: 'Panier' }
  ]}
/>

// ============================================================================
// 🔹 DONNÉES GÉOGRAPHIQUES
// ============================================================================
const COUNTRIES = [
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸' },
];

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  CI: ['Abidjan', 'Bouaké', 'Yamoussoukro', 'Dimbokro', 'Soubré', 'San-Pédro', 'Korhogo', 'Daloa', 'Man', 'Gagnoa', 'Divo', 'Abengourou', 'Bondoukou', 'Odienné', 'Séguéla'],
  ML: ['Bamako', 'Sikasso', 'Mopti', 'Ségou', 'Kayes', 'Gao', 'Kidal', 'Tombouctou'],
  BF: ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora', 'Ouahigouya', 'Pouytenga', 'Kaya', 'Tenkodogo'],
  FR: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'],
  CA: ['Montréal', 'Toronto', 'Vancouver', 'Calgary', 'Ottawa', 'Edmonton', 'Québec', 'Winnipeg'],
  US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Miami'],
};

const SHIPPING_RATES = { CI: { ABIDJAN: 1500, INTERIOR: 2000 }, INTERNATIONAL: 5000 };

const getShippingCost = (countryCode: string, city: string): number => {
  if (countryCode !== 'CI') return SHIPPING_RATES.INTERNATIONAL;
  if (city === 'Abidjan') return SHIPPING_RATES.CI.ABIDJAN;
  return SHIPPING_RATES.CI.INTERIOR;
};

const getShippingLabel = (countryCode: string, city: string): string => {
  if (countryCode !== 'CI') return 'Livraison Internationale';
  if (city === 'Abidjan') return 'Livraison Abidjan';
  return 'Livraison Intérieur CIV';
};

// ============================================================================
// 🔹 COMPOSANTS UI
// ============================================================================
const SimpleSelect = ({ value, onChange, options, placeholder, disabled, className = '' }: {
  value: string; onChange: (value: string) => void;
  options: Array<{ value: string; label: React.ReactNode }>;
  placeholder: string; disabled?: boolean; className?: string;
}) => (
  <div className={`relative ${className}`}>
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed">
      <option value="" disabled>{placeholder}</option>
      {options.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
  </div>
);

const SimpleBadge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'outline' | 'promo' }) => {
  const variants: Record<string, string> = {
    default: 'bg-accent text-accent-foreground',
    outline: 'border border-border bg-transparent',
    promo: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  };
  return (<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>{children}</span>);
};

// ============================================================================
// 🔹 COMPOSANT PRINCIPAL
// ============================================================================
export default function CartPage() {
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuth();
  const mounted = useMounted();
  const router = useRouter();
  
  // ✅ CORRECTION CRITIQUE : Utiliser le hook useCart au lieu d'un state local
  const { cart, cartCount, updateItem, removeItem, fetchCart } = useCart();
  
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  
  const [shippingDetails, setShippingDetails] = useState({
    fullName: '', phone: '', address: '', country: '', city: '', postalCode: '',
  });
  
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money' | 'cash_on_delivery' | 'bank_transfer'>('mobile_money');
  
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ============================================================================
  // 🔹 LOGS DE DEBUG
  // ============================================================================
  useEffect(() => {
    if (!mounted) return;
    
    console.group('🛒 [CartPage] État du panier');
    console.log('📦 cart:', cart);
    console.log('🔢 cartCount:', cartCount);
    console.log('📦 items:', cart?.items?.length || 0);
    console.log('👤 isAuthenticated:', isAuthenticated);
    console.groupEnd();
  }, [mounted, cart, cartCount, isAuthenticated]);

  // ============================================================================
  // 🔹 REDIRECTION SI NON AUTHENTIFIÉ
  // ============================================================================
  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      const redirect = `/auth/login?from=${encodeURIComponent('/cart')}`;
      console.log('🔄 [CartPage] Redirecting to login:', redirect);
      router.replace(redirect);
    }
  }, [mounted, authLoading, isAuthenticated, router]);

  // ============================================================================
  // 🔹 CALCULS DÉRIVÉS
  // ============================================================================
  const availableCities = useMemo(() => 
    shippingDetails.country ? CITIES_BY_COUNTRY[shippingDetails.country] || [] : []
  , [shippingDetails.country]);

  const shippingCost = useMemo(() => {
    if (!shippingDetails.country || !shippingDetails.city) return 0;
    return getShippingCost(shippingDetails.country, shippingDetails.city);
  }, [shippingDetails.country, shippingDetails.city]);

  const subtotal = useMemo(() => 
    cart?.items?.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0) || 0
  , [cart?.items]);

  const discount = useMemo(() => cart?.coupon?.discount || 0, [cart?.coupon]);
  const total = useMemo(() => Math.max(0, subtotal + shippingCost - discount), [subtotal, shippingCost, discount]);
  
  const amountDueNow = useMemo(() => 
    paymentMethod === 'cash_on_delivery' ? Math.ceil(total * 0.5) : total
  , [total, paymentMethod]);

  // ============================================================================
  // 🔹 GESTIONNAIRES
  // ============================================================================
  const handleShippingChange = (field: string, value: string) => {
    setShippingDetails(prev => {
      const updates = { ...prev, [field]: value };
      if (field === 'country') updates.city = '';
      return updates;
    });
    if (formErrors[field]) {
      setFormErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const item = cart?.items?.find(i => i._id === itemId);
    if (!item) return;
    
    const maxStock = (item.product as any)?.totalStock || (item as any)?.totalStock || 999;
    
    if (newQuantity > maxStock) {
      toast.error(`Stock insuffisant : ${maxStock} disponible${maxStock > 1 ? 's' : ''}`);
      return;
    }
    
    setUpdatingItemId(itemId);

    try {
      console.log('🔄 [CartPage] Mise à jour quantité:', itemId, '->', newQuantity);
      await updateItem({ itemId, quantity: newQuantity });
      toast.success('Quantité mise à jour');
    } catch (err: any) {
      console.error('❌ Failed to update quantity:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Erreur lors de la mise à jour';
      toast.error(errorMsg);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      console.log('🗑️ [CartPage] Suppression item:', itemId);
      await removeItem(itemId);
      toast.success('Produit retiré du panier');
    } catch (err: any) {
      console.error('❌ Failed to remove item:', err);
      toast.error(err?.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!shippingDetails.fullName.trim()) errors.fullName = 'Nom complet requis';
    if (!shippingDetails.phone.trim()) errors.phone = 'Téléphone requis';
    if (!shippingDetails.address.trim()) errors.address = 'Adresse requise';
    if (!shippingDetails.country) errors.country = 'Pays requis';
    if (!shippingDetails.city) errors.city = 'Ville requise';
    if (shippingDetails.phone && !/^[\d\s\-\+\(\)]{8,}$/.test(shippingDetails.phone)) {
      errors.phone = 'Numéro de téléphone invalide';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================================
  // 🔹 handleSubmitOrder
  // ============================================================================
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 [CartPage] handleSubmitOrder triggered');
    
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }
    if (!cart?.items?.length) {
      toast.error('Votre panier est vide');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('📦 [CartPage] Preparing order payload...');
      
      const orderPayload = {
        shipping: {
          fullName: shippingDetails.fullName.trim(),
          phone: shippingDetails.phone.trim(),
          street: shippingDetails.address.trim(),
          city: shippingDetails.city,
          country: shippingDetails.country,
          postalCode: shippingDetails.postalCode?.trim(),
          cost: shippingCost,
        },
        payment: {
          method: paymentMethod,
          status: paymentMethod === 'cash_on_delivery' ? 'partial' : 'pending',
          amountPaid: paymentMethod === 'cash_on_delivery' ? amountDueNow : 0,
          details: paymentMethod === 'cash_on_delivery' ? {
            phoneNumber: shippingDetails.phone.trim(),
          } : {},
        },
        notes: orderNotes.trim() || undefined,
        couponCode: cart.coupon?.code,
        items: cart.items.map(item => {
          const product = typeof item.product === 'object' ? (item.product as any)._id : item.product;
          const variant = typeof item.variant === 'object' ? (item.variant as any)._id : item.variant;
          
          const cleanItem: any = {
            product,
            quantity: item.quantity,
            price: item.price,
          };
          
          if (variant && typeof variant === 'string' && variant.length === 24) {
            cleanItem.variant = variant;
          }
          
          if (item.size) cleanItem.size = item.size;
          if (item.color) cleanItem.color = item.color;
          
          return cleanItem;
        }),
      };

      console.log('📡 [CartPage] Calling orderApi.createOrder...');
      const startTime = Date.now();
      
      const response = await Promise.race([
        orderApi.createOrder(orderPayload),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout (30s)')), 30000))
      ]);
      
      const elapsed = Date.now() - startTime;
      console.log('✅ [CartPage] orderApi.createOrder succeeded in', elapsed, 'ms');
      
      const paymentUrl = (response as any).data?.payment?.paymentUrl || (response as any).paymentUrl;
      const orderId = (response as any).data?.order?._id || (response as any).order?._id;
      
      console.log('🎯 [CartPage] Response:', { paymentUrl, orderId });
      
      if (paymentUrl) {
        console.log('💳 [CartPage] Opening CinetPay popup:', paymentUrl);
        toast.success('Ouverture de la fenêtre de paiement...');
        
        if (orderId) {
          localStorage.setItem('pending_order_id', orderId);
        }
        
        const popupWidth = 500;
        const popupHeight = 700;
        const left = (window.innerWidth - popupWidth) / 2;
        const top = (window.innerHeight - popupHeight) / 2;
        
        const popup = window.open(
          paymentUrl,
          'CinetPayCheckout',
          `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );
        
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          toast.error('Popup bloquée. Veuillez autoriser les popups pour ce site.');
          window.location.href = paymentUrl;
          return;
        }
        
        const handleMessage = (event: MessageEvent) => {
          if (!event.origin.includes('cinetpay')) return;
          
          console.log('📩 [CinetPay] Message received:', event.data);
          
          const data = event.data;
          
          if (data.status === 'ACCEPTED' || data.status === 'SUCCESS') {
            console.log('✅ [CinetPay] Payment successful');
            toast.success('Paiement réussi !');
            popup.close();
            
            if (orderId) {
              router.push(`/orders/${orderId}/confirmation`);
            }
            
            window.removeEventListener('message', handleMessage);
          } else if (data.status === 'REFUSED' || data.status === 'FAILED') {
            console.error('❌ [CinetPay] Payment failed');
            toast.error('Paiement échoué. Veuillez réessayer.');
            popup.close();
            window.removeEventListener('message', handleMessage);
          } else if (data.status === 'PENDING') {
            console.log('⏳ [CinetPay] Payment pending');
            toast.info('Paiement en cours de traitement...');
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        const checkPopupClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopupClosed);
            window.removeEventListener('message', handleMessage);
            console.log('🔒 [CinetPay] Popup closed');
            
            if (orderId) {
              toast.info('Vérification du paiement...');
              router.push(`/orders/${orderId}/confirmation`);
            }
          }
        }, 500);
        
        return;
      }

      toast.success('Commande créée avec succès !');
      
      console.log('🎯 [CartPage] Extracted orderId:', orderId);
      
      if (orderId) {
        console.log('🔄 [CartPage] Navigating to confirmation:', `/orders/${orderId}/confirmation`);
        router.push(`/orders/${orderId}/confirmation`);
      } else {
        console.log('🔄 [CartPage] No orderId, redirecting to profile');
        router.push(ROUTES.USER.PROFILE || '/profile');
      }
      
    } catch (err: any) {
      console.group('❌ [CartPage] Order creation FAILED');
      console.log('  Timestamp:', new Date().toISOString());
      console.log('  Message:', err?.message);
      console.log('  Status code:', err?.response?.status || err?.statusCode);
      
      const validationErrors = err?.response?.data?.errors;
      if (validationErrors) {
        console.log('  🔍 Validation errors:', validationErrors);
        console.table(validationErrors);
      }
      
      console.log('  Response data:', err?.response?.data);
      console.groupEnd();
      
      if (err?.response?.status === 401 || err?.message?.includes('authentification') || err?.message?.includes('token')) {
        console.error('🔐 [CartPage] AUTH ERROR');
        toast.error('Session expirée. Veuillez vous reconnecter.');
        return;
      }
      
      let message = 'Erreur lors de la création de la commande';
      
      if (validationErrors && Array.isArray(validationErrors)) {
        message = validationErrors.map((e: any) => e.msg || e.message).join(', ');
      } else if (err?.response?.data?.message) {
        message = err.response.data.message;
      } else if (err?.message) {
        message = err.message;
      }
      
      toast.error(message);
      setFormErrors(prev => ({ ...prev, submit: message }));
      
    } finally {
      setIsSubmitting(false);
      console.log('🏁 [CartPage] handleSubmitOrder completed');
    }
  };

  // ============================================================================
  // 🔹 RENDER STATES
  // ============================================================================
  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Connexion requise</h2>
          <p className="text-muted-foreground mb-6">Veuillez vous connecter pour accéder à votre panier.</p>
          <div className="flex gap-3 justify-center">
            <Button asChild><Link href={`/auth/login?from=${encodeURIComponent('/cart')}`}>Se connecter</Link></Button>
            <Button variant="outline" asChild><Link href={ROUTES.PRODUCTS}>Continuer sans compte</Link></Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!cart || !cart.items?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Votre panier est vide</h2>
          <p className="text-muted-foreground mb-6">Ajoutez des produits à votre panier avant de passer au paiement.</p>
          <Button asChild size="lg"><Link href={ROUTES.PRODUCTS}>Découvrir nos produits</Link></Button>
        </motion.div>
      </div>
    );
  }

  // ============================================================================
  // 🔹 MAIN RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={ROUTES.PRODUCTS} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Continuer mes achats</span>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium">Paiement sécurisé</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Finaliser votre commande</h1>
          <p className="text-muted-foreground">{cart.items.length} produit{cart.items.length > 1 ? 's' : ''} • Total: {formatPrice(total)}</p>
        </motion.div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
          {/* FORMULAIRE */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <form onSubmit={handleSubmitOrder} className="space-y-6">
              {/* 📦 Items du panier */}
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Package className="w-5 h-5" /> Vos articles ({cart.items.length})</h2>
                <div className="space-y-4">
                  <AnimatePresence>
                    {cart.items.map((item, index) => {
                      const product = item.product as any;
                      const productName = typeof product === 'object' ? product.name : item.name || 'Produit';
                      const productImage = typeof product === 'object' ? product.images?.[0]?.url || product.images?.[0] || item.image : item.image;
                      const itemTotal = (item.price || 0) * (item.quantity || 1);
                      return (
                        <motion.div key={item._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ delay: index * 0.05 }} className="flex gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                            {productImage ? (<img src={productImage} alt={productName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-product.svg'; }} />) : (<div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Pas d'image</div>)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-2">{productName}</h4>
                            {(item.size || item.color) && (<div className="flex gap-2 mt-1">{item.size && <SimpleBadge variant="outline">{item.size}</SimpleBadge>}{item.color && <SimpleBadge variant="outline">{item.color}</SimpleBadge>}</div>)}
                            <div className="flex items-center gap-3 mt-3">
                              <div className="flex items-center border border-border rounded-lg">
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => handleUpdateQuantity(item._id!, (item.quantity || 1) - 1)} disabled={(item.quantity || 1) <= 1 || updatingItemId === item._id}><Minus className="w-3 h-3" /></Button>
                                <span className="w-8 text-center text-sm font-medium">{updatingItemId === item._id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : item.quantity}</span>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => handleUpdateQuantity(item._id!, (item.quantity || 1) + 1)} disabled={updatingItemId === item._id || (item.quantity || 1) >= ((item.product as any)?.totalStock || (item as any)?.totalStock || 999)}><Plus className="w-3 h-3" /></Button>
                              </div>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(item._id!)} disabled={updatingItemId === item._id} title="Retirer du panier"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0"><p className="font-semibold text-accent">{formatPrice(itemTotal)}</p>{item.price && <p className="text-xs text-muted-foreground">{formatPrice(item.price)}/unité</p>}</div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* 📍 Adresse de livraison */}
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5" /> Adresse de livraison</h2>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nom complet *</Label>
                      <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="fullName" value={shippingDetails.fullName} onChange={(e) => handleShippingChange('fullName', e.target.value)} placeholder="Ex: Kouassi Jean" className={`pl-10 ${formErrors.fullName ? 'border-destructive' : ''}`} /></div>
                      {formErrors.fullName && <p className="text-xs text-destructive">{formErrors.fullName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone *</Label>
                      <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="phone" type="tel" value={shippingDetails.phone} onChange={(e) => handleShippingChange('phone', e.target.value)} placeholder="Ex: 07 07 07 07 07" className={`pl-10 ${formErrors.phone ? 'border-destructive' : ''}`} /></div>
                      {formErrors.phone && <p className="text-xs text-destructive">{formErrors.phone}</p>}
                    </div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="address">Adresse complète *</Label><Input id="address" value={shippingDetails.address} onChange={(e) => handleShippingChange('address', e.target.value)} placeholder="Ex: Rue des Jardins, Cocody, Abidjan" className={formErrors.address ? 'border-destructive' : ''} />{formErrors.address && <p className="text-xs text-destructive">{formErrors.address}</p>}</div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">Pays *</Label>
                      <SimpleSelect value={shippingDetails.country} onChange={(value) => handleShippingChange('country', value)} options={COUNTRIES.map(c => ({ value: c.code, label: `${c.flag} ${c.name}` }))} placeholder="Sélectionner un pays" className={formErrors.country ? 'border-destructive' : ''} />
                      {formErrors.country && <p className="text-xs text-destructive">{formErrors.country}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Ville *</Label>
                      <SimpleSelect value={shippingDetails.city} onChange={(value) => handleShippingChange('city', value)} options={availableCities.map(city => ({ value: city, label: city }))} placeholder={shippingDetails.country ? "Sélectionner une ville" : "Sélectionner d'abord un pays"} disabled={!shippingDetails.country} className={formErrors.city ? 'border-destructive' : ''} />
                      {formErrors.city && <p className="text-xs text-destructive">{formErrors.city}</p>}
                    </div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="postalCode">Code postal (optionnel)</Label><Input id="postalCode" value={shippingDetails.postalCode} onChange={(e) => handleShippingChange('postalCode', e.target.value)} placeholder="Ex: 01 BP 1234" /></div>
                  {shippingDetails.country && shippingDetails.city && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 rounded-lg bg-accent/10 border border-accent/20"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground flex items-center gap-2"><Truck className="w-4 h-4" /> {getShippingLabel(shippingDetails.country, shippingDetails.city)}</span><span className="font-semibold text-accent">{formatPrice(shippingCost)}</span></div></motion.div>)}
                </div>
              </div>

              {/* 💳 Méthode de paiement */}
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Méthode de paiement</h2>
                <div className="space-y-3">
                  {[
                    { id: 'mobile_money' as const, label: 'Mobile Money / Carte', icon: Smartphone, desc: 'Orange Money, MTN, Wave, Visa, Mastercard...' },
                    { id: 'cash_on_delivery' as const, label: 'Paiement à la livraison', icon: Banknote, desc: 'Payez 50% maintenant via la popup, le reste à la livraison' },
                    { id: 'bank_transfer' as const, label: 'Virement bancaire', icon: Banknote, desc: 'Transfert bancaire classique' }
                  ].map((method) => (
                    <div key={method.id}>
                      <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === method.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}>
                        <input type="radio" name="paymentMethod" value={method.id} checked={paymentMethod === method.id} onChange={() => setPaymentMethod(method.id)} className="mt-1 h-4 w-4 accent-accent" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2"><method.icon className="w-4 h-4 text-muted-foreground" /><span className="font-medium">{method.label}</span></div>
                          <p className="text-xs text-muted-foreground mt-1">{method.desc}</p>
                        </div>
                      </label>
                      
                      <AnimatePresence>
                        {paymentMethod === method.id && method.id === 'cash_on_delivery' && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 ml-7 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20"
                          >
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <p className="font-medium text-amber-900 mb-2">
                                  Paiement en deux étapes
                                </p>
                                <ul className="space-y-1 text-amber-800 text-xs">
                                  <li>• <strong>{formatPrice(amountDueNow)}</strong> à payer maintenant via la popup sécurisée</li>
                                  <li>• <strong>{formatPrice(total - amountDueNow)}</strong> à payer en espèces à la livraison</li>
                                  <li className="pt-1 text-amber-700">Le numéro de livraison ({shippingDetails.phone || 'non renseigné'}) sera utilisé pour l'acompte</li>
                                </ul>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>

              {/* 📝 Notes */}
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-xl font-bold mb-4">Notes de commande (optionnel)</h2>
                <textarea 
                  value={orderNotes} 
                  onChange={(e) => setOrderNotes(e.target.value)} 
                  placeholder="Instructions spéciales pour la livraison, cadeau, etc." 
                  rows={3} 
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none" 
                />
              </div>

              {formErrors.submit && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{formErrors.submit}</span>
                </motion.div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                size="lg" 
                variant="primary" 
                className="w-full h-14 text-lg font-semibold" 
                disabled={isSubmitting || !shippingDetails.fullName || !shippingDetails.phone || !shippingDetails.address || !shippingDetails.country || !shippingDetails.city}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Traitement en cours...</>
                ) : paymentMethod === 'cash_on_delivery' ? (
                  <><Banknote className="w-5 h-5 mr-2" /> Payer {formatPrice(amountDueNow)} maintenant • Solde à la livraison</>
                ) : (
                  <><CheckCircle className="w-5 h-5 mr-2" /> Payer {formatPrice(amountDueNow)} et commander</>
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                En cliquant sur "Commander", vous acceptez nos <Link href="/terms" className="text-accent hover:underline">Conditions générales</Link> et <Link href="/privacy" className="text-accent hover:underline">Politique de confidentialité</Link>.
              </p>
            </form>
          </motion.div>

          {/* ───────── RÉCAPITULATIF ───────── */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-3xl border-2 border-border/50 bg-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
                <span>Récapitulatif</span>
                <SimpleBadge>{cart.items.length} article{cart.items.length > 1 ? 's' : ''}</SimpleBadge>
              </h2>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {cart.items.map((item) => { 
                  const product = item.product as any; 
                  const productName = typeof product === 'object' ? product.name : item.name || 'Produit'; 
                  return (
                    <div key={item._id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground line-clamp-1">{productName} × {item.quantity}</span>
                      <span className="font-medium">{formatPrice((item.price || 0) * (item.quantity || 1))}</span>
                    </div>
                  ); 
                })}
              </div>
              <div className="my-4 h-px bg-border" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-1">
                      <SimpleBadge variant="promo">PROMO</SimpleBadge> Code {cart.coupon?.code}
                    </span>
                    <span>−{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livraison</span>
                  <span className={shippingCost > 0 ? 'text-accent' : 'text-emerald-600'}>
                    {shippingCost > 0 ? formatPrice(shippingCost) : 'Gratuite'}
                  </span>
                </div>
              </div>
              <div className="my-4 h-px bg-border" />
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-lg">Total</span>
                <span className="text-2xl font-bold text-accent">{formatPrice(total)}</span>
              </div>
              {paymentMethod === 'cash_on_delivery' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-700 text-sm mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Paiement partiel</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>À payer maintenant</span>
                      <span className="font-semibold">{formatPrice(amountDueNow)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Solde à la livraison</span>
                      <span>{formatPrice(total - amountDueNow)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div className="flex items-center justify-center gap-4 pt-4 text-muted-foreground">
                <div className="flex items-center gap-1 text-xs">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>Paiement sécurisé</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Truck className="w-4 h-4 text-blue-500" />
                  <span>Livraison suivie</span>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Link href="/help" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                Besoin d'aide pour votre commande ?
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}