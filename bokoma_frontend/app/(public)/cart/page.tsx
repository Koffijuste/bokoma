// app/(public)/cart/page.tsx
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { ROUTES } from '@/constants';
import { formatPrice } from '@/utils/helpers';

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

export default function CartPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const mounted = useMounted();
  const router = useRouter();
  
  const { cart, cartCount, updateItem, removeItem } = useCart();
  
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  
  const [shippingDetails, setShippingDetails] = useState({
    fullName: '', phone: '', address: '', country: '', city: '', postalCode: '',
  });
  
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money' | 'cash_on_delivery' >('mobile_money');
  
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      const redirect = `/auth/login?from=${encodeURIComponent('/cart')}`;
      router.replace(redirect);
    }
  }, [mounted, authLoading, isAuthenticated, router]);

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
      await updateItem({ itemId, quantity: newQuantity });
      toast.success('Quantité mise à jour');
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Erreur lors de la mise à jour';
      toast.error(errorMsg);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(itemId);
      toast.success('Produit retiré du panier');
    } catch (err: any) {
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

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      const response = await Promise.race([
        orderApi.createOrder(orderPayload),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout (30s)')), 30000))
      ]);

      const data = (response as any).data ?? response;
      const paymentUrl = data?.payment?.paymentUrl || (response as any).paymentUrl;
      const orderId = data?.order?._id || (response as any).order?._id;
      const verifyToken = data?.verifyToken;  // ✅ requis pour la page success

      if (paymentUrl) {
        toast.success('Ouverture de la fenêtre de paiement...');

        // ✅ Persist orderId + verifyToken pour la page /payment/success qui
        //    va poller le statut (le verifyToken est REQUIS par le backend
        //    pour exposer les détails de la commande sans auth).
        if (typeof sessionStorage !== 'undefined' && orderId) {
          sessionStorage.setItem('bokoma_pending_order', JSON.stringify({
            orderId,
            orderNumber: data?.order?.orderNumber,
            total: data?.order?.total,
            verifyToken,
          }));
        }

        // Popup CinetPay 900×800 centrée (CinetPay affiche son propre bouton
        // "Annuler" → la fermeture popup = annulation naturelle côté UX).
        const w = 900;
        const h = 800;
        const dualScreenLeft = window.screenLeft ?? window.screenX;
        const dualScreenTop  = window.screenTop  ?? window.screenY;
        const left = (window.innerWidth  - w) / 2 + dualScreenLeft;
        const top  = (window.innerHeight - h) / 2 + dualScreenTop;

        const popup = window.open(
          paymentUrl,
          'bokoma_payment',
          `width=${w},height=${h},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes`
        );

        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          toast.warning('Popup bloquée — ouverture dans un nouvel onglet');
          window.open(paymentUrl, '_blank', 'noopener,noreferrer');
        }

        // ── Navigation du parent après paiement ─────────────────────────
        // Trois déclencheurs (premier gagne) :
        //   1. postMessage de /payment/success ou /payment/echec (le popup
        //      nous dit explicitement "succès" ou "échec")
        //   2. popup.closed (la popup s'est fermée — on ne sait pas si c'est
        //      succès ou échec, donc on va sur /payment/success qui va poller
        //      le backend et afficher l'état réel)
        //   3. Timeout de 5 min (sécurité) — fallback identique à #2
        const onMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (!event.data || typeof event.data.type !== 'string') return;
          const { type, orderId: msgOrderId } = event.data;
          if (msgOrderId && msgOrderId !== orderId) return;  // pas notre popup
          if (type === 'bokoma_payment_success') {
            window.removeEventListener('message', onMessage);
            window.clearInterval(pollPopup);
            if (orderId) router.push(`/orders/${orderId}/confirmation`);
          } else if (type === 'bokoma_payment_failed' || type === 'bokoma_payment_expired') {
            window.removeEventListener('message', onMessage);
            window.clearInterval(pollPopup);
            if (orderId) {
              const params = new URLSearchParams({ orderId });
              if (verifyToken) params.set('token', verifyToken);
              router.push(`/payment/echec?${params.toString()}`);
            }
          }
        };
        window.addEventListener('message', onMessage);

        const pollPopup = window.setInterval(() => {
          if (popup && popup.closed) {
            window.clearInterval(pollPopup);
            window.removeEventListener('message', onMessage);
            // Pas de postMessage reçu : on ne sait pas si c'est succès ou échec.
            // On envoie sur /payment/success qui va poller le backend et
            // afficher l'état réel (succès / échoué / expiré).
            if (orderId) {
              const params = new URLSearchParams({ orderId });
              if (verifyToken) params.set('token', verifyToken);
              router.push(`/payment/success?${params.toString()}`);
            }
          }
        }, 600);

        // Sécurité : on arrête le poll après 30 min max
        window.setTimeout(() => {
          window.clearInterval(pollPopup);
          window.removeEventListener('message', onMessage);
        }, 30 * 60 * 1000);
        return;
      }

      toast.success('Commande créée avec succès !');

      if (orderId) {
        const params = new URLSearchParams({ orderId });
        if (verifyToken) params.set('token', verifyToken);
        router.push(`/payment/success?${params.toString()}`);
      } else {
        router.push(ROUTES.USER.PROFILE || '/profile');
      }

    } catch (err: any) {
      if (err?.response?.status === 401 || err?.message?.includes('authentification') || err?.message?.includes('token')) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        return;
      }
      
      let message = 'Erreur lors de la création de la commande';
      
      const validationErrors = err?.response?.data?.errors;
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
    }
  };

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
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Connexion requise</h2>
          <p className="text-muted-foreground mb-6">Veuillez vous connecter pour accéder à votre panier.</p>
          <div className="flex gap-3 justify-center">
            <Button asChild><Link href={`/auth/login?from=${encodeURIComponent('/cart')}`}>Se connecter</Link></Button>
            <Button variant="outline" asChild><Link href={ROUTES.PRODUCTS}>Continuer sans compte</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || !cart.items?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Votre panier est vide</h2>
          <p className="text-muted-foreground mb-6">Ajoutez des produits à votre panier avant de passer au paiement.</p>
          <Button asChild size="lg"><Link href={ROUTES.PRODUCTS}>Découvrir nos produits</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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

      <div className="max-w-6xl mx-auto px-4 py-8 pb-32 lg:pb-8">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Finaliser votre commande</h1>
          <p className="text-muted-foreground">{cart.items.length} produit{cart.items.length > 1 ? 's' : ''} • Total: {formatPrice(total)}</p>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <form id="cart-checkout-form" onSubmit={handleSubmitOrder} className="space-y-6">
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Package className="w-5 h-5" /> Vos articles ({cart.items.length})</h2>
                <div className="space-y-4">
                  {cart.items.map((item, index) => {
                    const product = item.product as any;
                    const productName = typeof product === 'object' ? product.name : item.name || 'Produit';
                    const productImage = typeof product === 'object' ? product.images?.[0]?.url || product.images?.[0] || item.image : item.image;
                    const itemTotal = (item.price || 0) * (item.quantity || 1);
                    return (
                      <div key={item._id} className="flex gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
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
                      </div>
                    );
                  })}
                </div>
              </div>

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
                  {shippingDetails.country && shippingDetails.city && (
                    <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2"><Truck className="w-4 h-4" /> {getShippingLabel(shippingDetails.country, shippingDetails.city)}</span>
                        <span className="font-semibold text-accent">{formatPrice(shippingCost)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Méthode de paiement</h2>
                <div className="space-y-3">
                  {[
                    { id: 'mobile_money' as const, label: 'Mobile Money / Carte', icon: Smartphone, desc: 'Orange Money, MTN, Wave, Visa, Mastercard...' },
                    { id: 'cash_on_delivery' as const, label: 'Paiement à la livraison', icon: Banknote, desc: 'Payez 50% maintenant via la popup, le reste à la livraison' }
                  ].map((method) => (
                    <div key={method.id}>
                      <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === method.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}>
                        <input type="radio" name="paymentMethod" value={method.id} checked={paymentMethod === method.id} onChange={() => setPaymentMethod(method.id)} className="mt-1 h-4 w-4 accent-accent" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2"><method.icon className="w-4 h-4 text-muted-foreground" /><span className="font-medium">{method.label}</span></div>
                          <p className="text-xs text-muted-foreground mt-1">{method.desc}</p>
                        </div>
                      </label>
                      
                      {paymentMethod === method.id && method.id === 'cash_on_delivery' && (
                        <div className="mt-3 ml-7 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
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
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

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
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3 animate-in fade-in duration-300">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{formErrors.submit}</span>
                </div>
              )}

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
          </div>

          <div className="lg:sticky lg:top-24 h-fit animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
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
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-in fade-in duration-300">
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
                </div>
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
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          📱 MOBILE STICKY BAR — Total + bouton Commander toujours visibles
          Pour éviter de scroller sur petit écran
         ═══════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-accent truncate">{formatPrice(total)}</p>
            {discount > 0 && (
              <p className="text-[10px] text-emerald-600">-{formatPrice(discount)} promo</p>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            form="cart-checkout-form"
            variant="primary"
            className="flex-shrink-0 h-12 px-5 text-sm font-semibold"
            disabled={isSubmitting || !shippingDetails.fullName || !shippingDetails.phone || !shippingDetails.address || !shippingDetails.country || !shippingDetails.city}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> ...</>
            ) : paymentMethod === 'cash_on_delivery' ? (
              <><Banknote className="w-4 h-4 mr-2" /> Payer maintenant</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" /> Commander</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}