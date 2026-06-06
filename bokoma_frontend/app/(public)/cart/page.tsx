// app/(public)/cart/page.tsx — VERSION CORRIGÉE + DEBUG SÉCURISÉ
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
// ✅ CORRECTION: Ne PAS importer apiClient (non exporté)
import { cartApi, orderApi } from '@/services';
import { ROUTES, STORAGE_KEYS } from '@/constants';
import { formatPrice } from '@/utils/helpers';
import type { Cart, Product } from '@/types';

// ============================================================================
// 🔹 DONNÉES GÉOGRAPHIQUES (inchangées)
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
const extractCart = (data: any): Cart | null => {
  if (!data) return null;
  if (data.cart) return data.cart;
  if (data.data?.cart) return data.data.cart;
  if (Array.isArray(data.items)) return data;
  return null;
};

// ============================================================================
// 🔹 COMPOSANTS UI (inchangés)
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
// 🔹 COMPOSANT PRINCIPAL — VERSION CORRIGÉE
// ============================================================================
export default function CartPage() {
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuth();
  const mounted = useMounted();
  const router = useRouter();
  
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  
  const [shippingDetails, setShippingDetails] = useState({
    fullName: '', phone: '', address: '', country: '', city: '', postalCode: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money' | 'cash_on_delivery' | 'bank_transfer'>('card');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ============================================================================
  // 🔹 LOGS D'AUTHENTIFICATION — SÉCURISÉS (sans apiClient)
  // ============================================================================
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !mounted) return;
    
    console.group('🔐 [CartPage] Auth state update');
    console.log('  mounted:', mounted);
    console.log('  authLoading:', authLoading);
    console.log('  isAuthenticated:', isAuthenticated);
    console.log('  accessToken (useAuth):', accessToken ? `${accessToken.slice(0, 30)}...` : '❌ MISSING');
    
    // ✅ Vérifier localStorage (sécurisé)
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('  localStorage[auth]:', {
            hasAccessToken: !!parsed?.accessToken,
            accessTokenPreview: parsed?.accessToken?.slice(0, 30) + '...',
          });
        } else {
          console.warn('  localStorage[auth]: ❌ MISSING — Token may be in cookie only');
        }
      }
    } catch (e) {
      console.error('  localStorage[auth]: Error reading:', e);
    }
    
    // ✅ Vérifier cookies (sécurisé)
    if (typeof document !== 'undefined') {
      const cookieName = STORAGE_KEYS.AUTH_TOKEN || 'bokoma_access_token';
      const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith(`${cookieName}=`));
      console.log(`  document.cookie has ${cookieName}:`, hasCookie);
    }
    console.groupEnd();
  }, [mounted, authLoading, isAuthenticated, accessToken]);

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
  // 🔹 FETCH CART — VERSION SÉCURISÉE
  // ============================================================================
  const fetchCart = useCallback(async () => {
    if (!mounted || !isAuthenticated) return;
    
    try {
      setLoading(true);
      console.log('🛒 [CartPage] Fetching cart...');
      
      // 🔍 DEBUG: Log token source (sans accéder à apiClient.getClient)
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
        const hasLocalStorageToken = stored && JSON.parse(stored)?.accessToken;
        const hasCookieToken = document.cookie.includes(STORAGE_KEYS.AUTH_TOKEN || 'bokoma_access_token');
        
        console.log('  Token sources:', {
          localStorage: hasLocalStorageToken ? '✅ Present' : '❌ Missing',
          cookie: hasCookieToken ? '✅ Present' : '❌ Missing',
        });
        
        if (!hasLocalStorageToken && hasCookieToken) {
          console.warn('  ⚠️ Token is in cookie but NOT localStorage — interceptor must handle cookie fallback');
        }
      }
      
      const response = await cartApi.getCart();
      console.log('🛒 [CartPage] Cart response:', response);
      
      const extractedCart = extractCart(response);
      setCart(extractedCart);
      
      if (!extractedCart) {
        console.warn('⚠️ [CartPage] No cart data extracted from:', response);
      }
    } catch (err: any) {
      console.group('❌ [CartPage] Failed to fetch cart');
      console.log('  Message:', err?.message);
      console.log('  Status code:', err?.statusCode);
      console.log('  Response data:', err?.response?.data);
      if (err?.config) {
        console.log('  Request:', {
          url: err.config.url,
          method: err.config.method,
          headers: err.config.headers ? Object.keys(err.config.headers) : [],
        });
      }
      console.groupEnd();
      
      if (err?.statusCode === 401 || err?.message?.includes('authentification')) {
        console.warn('⚠️ [CartPage] Auth error — token may be invalid/expired');
        toast.error('Session expirée, veuillez vous reconnecter');
        return;
      }
      
      toast.error('Impossible de charger votre panier');
    } finally {
      setLoading(false);
    }
  }, [mounted, isAuthenticated]);

  useEffect(() => {
    if (mounted && isAuthenticated && !authLoading) {
      fetchCart();
    }
  }, [mounted, isAuthenticated, authLoading, fetchCart]);

  // ============================================================================
  // 🔹 CALCULS DÉRIVÉS (inchangés)
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
  // 🔹 GESTIONNAIRES (inchangés)
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

  const updateCartItemQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setUpdatingItemId(itemId);
    try {
      await cartApi.updateItem(itemId, newQuantity);
      await fetchCart();
      toast.success('Quantité mise à jour');
    } catch (err) {
      console.error('Failed to update quantity:', err);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const removeCartItem = async (itemId: string) => {
    try {
      await cartApi.removeItem(itemId);
      await fetchCart();
      toast.success('Produit retiré du panier');
    } catch (err) {
      console.error('Failed to remove item:', err);
      toast.error('Erreur lors de la suppression');
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
  // 🔹 handleSubmitOrder — VERSION SÉCURISÉE (sans apiClient)
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
        },
        notes: orderNotes.trim() || undefined,
        couponCode: cart.coupon?.code,
        items: cart.items.map(item => ({
          product: typeof item.product === 'object' ? (item.product as any)._id : item.product,
          variant: typeof item.variant === 'object' ? (item.variant as any)._id : item.variant,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
        })),
      };

      // 🔍 DEBUG: Vérifier les sources de token AVANT l'appel (sans apiClient)
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        console.group('🔐 [CartPage] BEFORE orderApi.createOrder');
        
        let localStorageToken = 'unknown';
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
          if (stored) {
            const { accessToken: storedToken } = JSON.parse(stored);
            localStorageToken = storedToken ? `present (${storedToken.slice(0, 30)}...)` : 'empty';
          } else {
            localStorageToken = 'missing';
          }
        } catch {
          localStorageToken = 'error';
        }
        console.log('  localStorage token:', localStorageToken);
        
        console.log('  useAuth accessToken:', accessToken ? `${accessToken.slice(0, 30)}...` : '❌ MISSING');
        
        const cookieName = STORAGE_KEYS.AUTH_TOKEN || 'bokoma_access_token';
        const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith(`${cookieName}=`));
        console.log(`  document.cookie has ${cookieName}:`, hasCookie);
        
        if (localStorageToken === 'missing' && hasCookie) {
          console.warn('  ⚠️ Token in cookie but NOT localStorage — ensure interceptor handles cookie fallback!');
        }
        console.groupEnd();
      }

      console.log('📡 [CartPage] Calling orderApi.createOrder...');
      const startTime = Date.now();
      
      const response = await Promise.race([
        orderApi.createOrder(orderPayload),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout (30s)')), 30000))
      ]);
      
      const elapsed = Date.now() - startTime;
      console.log('✅ [CartPage] orderApi.createOrder succeeded in', elapsed, 'ms');
      
      setCart(null);
      toast.success('Commande créée avec succès !');
      
      const orderId = (response as any).data?.order?._id || (response as any).order?._id;
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
      console.log('  Status code:', err?.statusCode);
      console.log('  Errors:', err?.errors);
      console.log('  Response data:', err?.response?.data);
      
      if (err?.config) {
        console.log('  Request config:', {
          url: err.config.url,
          method: err.config.method,
          baseURL: err.config.baseURL,
          headers: err.config.headers ? Object.keys(err.config.headers) : [],
        });
      }
      
      console.log('  Auth state after error:', {
        isAuthenticated,
        hasLocalStorage: typeof window !== 'undefined' ? !!localStorage.getItem(STORAGE_KEYS.AUTH) : false,
        hasCookie: typeof document !== 'undefined' ? document.cookie.includes(STORAGE_KEYS.AUTH_TOKEN || 'bokoma_access_token') : false,
      });
      console.groupEnd();
      
      if (err?.statusCode === 401 || err?.message?.includes('authentification') || err?.message?.includes('token')) {
        console.error('🔐 [CartPage] AUTH ERROR — token likely expired/invalid or not sent');
        toast.error('Session expirée. Veuillez vous reconnecter.');
        return;
      }
      
      const message = err?.errors?.map((e: any) => e.message).join(', ') || err?.message || 'Erreur lors de la création de la commande';
      toast.error(message);
      setFormErrors(prev => ({ ...prev, submit: message }));
      
    } finally {
      setIsSubmitting(false);
      console.log('🏁 [CartPage] handleSubmitOrder completed');
    }
  };

  // ============================================================================
  // 🔹 RENDER STATES (inchangés)
  // ============================================================================
  if (!mounted || authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
          <p className="text-muted-foreground">Chargement de votre panier...</p>
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
  // 🔹 MAIN RENDER (identique)
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
              {/* 📦 Items du panier — Identique */}
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
                            {productImage ? (<img src={productImage} alt={productName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-product.jpg'; }} />) : (<div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Pas d'image</div>)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-2">{productName}</h4>
                            {(item.size || item.color) && (<div className="flex gap-2 mt-1">{item.size && <SimpleBadge variant="outline">{item.size}</SimpleBadge>}{item.color && <SimpleBadge variant="outline">{item.color}</SimpleBadge>}</div>)}
                            <div className="flex items-center gap-3 mt-3">
                              <div className="flex items-center border border-border rounded-lg">
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => updateCartItemQuantity(item._id!, (item.quantity || 1) - 1)} disabled={(item.quantity || 1) <= 1 || updatingItemId === item._id}><Minus className="w-3 h-3" /></Button>
                                <span className="w-8 text-center text-sm font-medium">{updatingItemId === item._id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : item.quantity}</span>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => updateCartItemQuantity(item._id!, (item.quantity || 1) + 1)} disabled={updatingItemId === item._id}><Plus className="w-3 h-3" /></Button>
                              </div>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeCartItem(item._id!)} disabled={updatingItemId === item._id} title="Retirer du panier"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0"><p className="font-semibold text-accent">{formatPrice(itemTotal)}</p>{item.price && <p className="text-xs text-muted-foreground">{formatPrice(item.price)}/unité</p>}</div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* 📍 Adresse de livraison — Identique */}
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
                      <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="phone" type="tel" value={shippingDetails.phone} onChange={(e) => handleShippingChange('phone', e.target.value)} placeholder="Ex: +225 07 07 07 07 07" className={`pl-10 ${formErrors.phone ? 'border-destructive' : ''}`} /></div>
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

              {/* 💳 Méthode de paiement — Identique */}
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Méthode de paiement</h2>
                <div className="space-y-3">
                  {[{ id: 'card' as const, label: 'Carte bancaire', icon: CreditCard, desc: 'Visa, Mastercard, etc.' }, { id: 'mobile_money' as const, label: 'Mobile Money', icon: Smartphone, desc: 'Orange Money, MTN, Wave' }, { id: 'cash_on_delivery' as const, label: 'Paiement à la livraison', icon: Banknote, desc: 'Payez 50% maintenant, le reste à la livraison' }, { id: 'bank_transfer' as const, label: 'Virement bancaire', icon: Banknote, desc: 'Transfert bancaire classique' }].map((method) => (
                    <label key={method.id} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === method.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}>
                      <input type="radio" name="paymentMethod" value={method.id} checked={paymentMethod === method.id} onChange={() => setPaymentMethod(method.id)} className="mt-1 h-4 w-4 accent-accent" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><method.icon className="w-4 h-4 text-muted-foreground" /><span className="font-medium">{method.label}</span></div>
                        <p className="text-xs text-muted-foreground mt-1">{method.desc}</p>
                        {method.id === 'cash_on_delivery' && paymentMethod === 'cash_on_delivery' && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs"><AlertCircle className="w-3 h-3 inline mr-1" />Vous payerez <strong>{formatPrice(amountDueNow)}</strong> maintenant et <strong>{formatPrice(total - amountDueNow)}</strong> à la livraison.</motion.div>)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 📝 Notes — Identique */}
              <div className="rounded-3xl border border-border bg-card p-6"><h2 className="text-xl font-bold mb-4">Notes de commande (optionnel)</h2><textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Instructions spéciales pour la livraison, cadeau, etc." rows={3} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none" /></div>

              {formErrors.submit && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3"><AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /><span>{formErrors.submit}</span></motion.div>)}

              {/* Submit Button */}
              <Button type="submit" size="lg" variant="primary" className="w-full h-14 text-lg font-semibold" disabled={isSubmitting || !shippingDetails.fullName || !shippingDetails.phone || !shippingDetails.address || !shippingDetails.country || !shippingDetails.city}>
                {isSubmitting ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Traitement en cours...</>) : paymentMethod === 'cash_on_delivery' ? (<><Banknote className="w-5 h-5 mr-2" /> Payer {formatPrice(amountDueNow)} maintenant • Solde à la livraison</>) : (<><CheckCircle className="w-5 h-5 mr-2" /> Payer {formatPrice(amountDueNow)} et commander</>)}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">En cliquant sur "Commander", vous acceptez nos <Link href="/terms" className="text-accent hover:underline">Conditions générales</Link> et <Link href="/privacy" className="text-accent hover:underline">Politique de confidentialité</Link>.</p>
            </form>
          </motion.div>

          {/* ───────── RÉCAPITULATIF ───────── */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-3xl border-2 border-border/50 bg-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center justify-between"><span>Récapitulatif</span><SimpleBadge>{cart.items.length} article{cart.items.length > 1 ? 's' : ''}</SimpleBadge></h2>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">{cart.items.map((item) => { const product = item.product as any; const productName = typeof product === 'object' ? product.name : item.name || 'Produit'; return (<div key={item._id} className="flex justify-between text-sm"><span className="text-muted-foreground line-clamp-1">{productName} × {item.quantity}</span><span className="font-medium">{formatPrice((item.price || 0) * (item.quantity || 1))}</span></div>); })}</div>
              <div className="my-4 h-px bg-border" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Sous-total</span><span>{formatPrice(subtotal)}</span></div>
                {discount > 0 && (<div className="flex justify-between text-emerald-600"><span className="flex items-center gap-1"><SimpleBadge variant="promo">PROMO</SimpleBadge> Code {cart.coupon?.code}</span><span>−{formatPrice(discount)}</span></div>)}
                <div className="flex justify-between"><span className="text-muted-foreground">Livraison</span><span className={shippingCost > 0 ? 'text-accent' : 'text-emerald-600'}>{shippingCost > 0 ? formatPrice(shippingCost) : 'Gratuite'}</span></div>
              </div>
              <div className="my-4 h-px bg-border" />
              <div className="flex justify-between items-center pt-2"><span className="font-bold text-lg">Total</span><span className="text-2xl font-bold text-accent">{formatPrice(total)}</span></div>
              {paymentMethod === 'cash_on_delivery' && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"><div className="flex items-center gap-2 text-amber-700 text-sm mb-2"><AlertCircle className="w-4 h-4" /><span className="font-medium">Paiement partiel</span></div><div className="space-y-1 text-xs"><div className="flex justify-between"><span>À payer maintenant</span><span className="font-semibold">{formatPrice(amountDueNow)}</span></div><div className="flex justify-between text-muted-foreground"><span>Solde à la livraison</span><span>{formatPrice(total - amountDueNow)}</span></div></div></motion.div>)}
              <div className="flex items-center justify-center gap-4 pt-4 text-muted-foreground"><div className="flex items-center gap-1 text-xs"><Shield className="w-4 h-4 text-emerald-500" /><span>Paiement sécurisé</span></div><div className="flex items-center gap-1 text-xs"><Truck className="w-4 h-4 text-blue-500" /><span>Livraison suivie</span></div></div>
            </div>
            <div className="mt-4 text-center"><Link href="/help" className="text-sm text-muted-foreground hover:text-accent transition-colors">Besoin d'aide pour votre commande ?</Link></div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}