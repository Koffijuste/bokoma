// app/(public)/checkout/page.tsx
'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFetch } from '@/hooks';
import { cartApi, orderApi } from '@/services';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { formatPrice } from '@/utils/helpers';
import { Loader2, ShoppingBag, MapPin, Phone, User, Truck, CreditCard } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { toast } from 'sonner';
import { useCartStore } from '@/store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShippingForm {
  fullName: string;
  street: string;       // ✅ Renommé address → street (cohérent avec le backend)
  city: string;
  country: string;
  phone: string;
  postalCode: string;
  method: 'standard' | 'express' | 'pickup';
}

const PAYMENT_METHODS = [
  { value: 'mobile_money', label: 'Mobile Money', desc: 'Orange Money, MTN, Wave, Moov', icon: '📱' },
  { value: 'card',         label: 'Carte bancaire', desc: 'Visa, Mastercard',             icon: '💳' },
  { value: 'cash_on_delivery', label: 'Paiement à la livraison', desc: '50% d\'acompte requis', icon: '🏠' },
] as const;

const SHIPPING_METHODS = [
  { value: 'standard', label: 'Standard',    desc: '3-5 jours ouvrables', price: 2500 },
  { value: 'express',  label: 'Express',     desc: '1-2 jours ouvrables', price: 5000 },
  { value: 'pickup',   label: 'Retrait boutique', desc: 'Abidjan - Marcory', price: 0 },
] as const;

// ─── Composant ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);
  const { data: cartResponse, loading, error, refetch } = useFetch(
    () => cartApi.getCart(), []
  );

  // ✅ Extraire le cart de la réponse API (qui peut être { data: { cart } } ou { cart })
  const cart = (cartResponse as any)?.data?.cart ?? (cartResponse as any)?.cart ?? cartResponse;

  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [shipping, setShipping] = useState<ShippingForm>({
    fullName: '',
    street: '',
    city: '',
    country: 'CI',          // ✅ Côte d'Ivoire par défaut
    phone: '',
    postalCode: '',
    method: 'standard',
  });

  const [paymentMethod, setPaymentMethod] = useState<string>('mobile_money');

  const handleShippingChange = useCallback((field: keyof ShippingForm, value: string) => {
    setShipping(prev => ({ ...prev, [field]: value }));
  }, []);

  // ── Calcul des frais de livraison ──────────────────────────────────────────
  const shippingCost = SHIPPING_METHODS.find(m => m.value === shipping.method)?.price ?? 2500;
  const subtotal = cart?.subtotal ?? cart?.total ?? 0;
  const total = subtotal + shippingCost - (cart?.discount ?? 0);

  // ── Validation ────────────────────────────────────────────────────────────
  const validateForm = (): string | null => {
    if (!shipping.fullName.trim()) return 'Le nom complet est requis';
    if (!shipping.phone.trim())    return 'Le numéro de téléphone est requis';
    if (!shipping.street.trim())   return 'L\'adresse est requise';
    if (!shipping.city.trim())     return 'La ville est requise';
    if (!shipping.country.trim())  return 'Le pays est requis';
    return null;
  };

  // ── Checkout ──────────────────────────────────────────────────────────────
  const handleCheckout = useCallback(async () => {
    setCheckoutError(null);

    const validationError = validateForm();
    if (validationError) {
      setCheckoutError(validationError);
      return;
    }

    setIsProcessing(true);

    try {
      const response = await orderApi.createOrder({
        shipping: {
          fullName:   shipping.fullName.trim(),
          street:     shipping.street.trim(),
          city:       shipping.city.trim(),
          country:    shipping.country.trim(),
          phone:      shipping.phone.trim(),
          postalCode: shipping.postalCode.trim(),
          method:     shipping.method,
        },
        payment: {
          method: paymentMethod,
        },
        notes: undefined,
      } as any);

      const data = (response as any)?.data ?? response;

      // ✅ Commande créée → on vide le panier immédiatement, que le paiement
      //    passe par la popup CinetPay (CinetPay = paiement validé en parallèle)
      //    ou qu'il s'agisse d'un cash-on-delivery. Le backend vide déjà son
      //    cart côté DB ; ici on synchronise le store Zustand pour que la
      //    navbar (compteur) et la page /cart soient vides tout de suite.
      clearCart();

      // ✅ CinetPay retourne un paymentUrl → ouvrir dans une POPUP centrée
      // (au lieu de rediriger et perdre la page checkout). La popup reste
      // ouverte pendant que l'utilisateur paye. Quand elle se ferme, on
      // détecte via window.focus()/interval et on redirige vers la page
      // de succès qui poll le backend pour confirmer le paiement.
      if (data?.payment?.paymentUrl) {
        // Stocker l'orderId + verifyToken en session pour la page de succès/échec
        // (utile aussi si l'utilisateur revient manuellement après avoir
        // fermé l'onglet CinetPay : il sera redirigé vers la bonne page).
        // Le verifyToken est REQUIS par /api/v1/orders/verify/:orderId pour
        // accéder aux détails complets de la commande (sécurité : sans token,
        // seul le statut minimal est retourné).
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('bokoma_pending_order', JSON.stringify({
            orderId:     data.order?._id,
            orderNumber: data.order?.orderNumber,
            total:       data.order?.total,
            verifyToken: data.verifyToken,
          }));
        }

        if (typeof window !== 'undefined') {
          // ── Popup centrée 900×800 ────────────────────────────────────
          const w = 900;
          const h = 800;
          const dualScreenLeft  = window.screenLeft  ?? window.screenX;
          const dualScreenTop   = window.screenTop   ?? window.screenY;
          const screenWidth     = window.innerWidth;
          const screenHeight    = window.innerHeight;
          const left = (screenWidth  - w) / 2 + dualScreenLeft;
          const top  = (screenHeight - h) / 2 + dualScreenTop;

          const popup = window.open(
            data.payment.paymentUrl,
            'bokoma_payment',
            `width=${w},height=${h},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes`
          );

          // ── Fallback si le navigateur bloque les popups ───────────────
          if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            toast.warning('Popup bloquée — ouverture dans un nouvel onglet');
            window.open(data.payment.paymentUrl, '_blank', 'noopener,noreferrer');
          }

          // ── Quand la popup se ferme → on redirige vers la page succès ──
          const pollPopup = window.setInterval(() => {
            if (popup && popup.closed) {
              window.clearInterval(pollPopup);
              // On n'ajoute PAS &status=confirmed ici volontairement :
              // la page /payment/success POLL le backend pour vérifier
              // le statut réel (cf. bug où la page affichait un succès trompeur).
              const orderId = data.order?._id;
              const verifyToken = data.verifyToken;
              if (orderId) {
                const params = new URLSearchParams({ orderId });
                if (verifyToken) params.set('token', verifyToken);
                router.push(`/payment/success?${params.toString()}`);
              }
            }
          }, 600);

          // Sécurité : on arrête le poll après 30 min max
          window.setTimeout(() => window.clearInterval(pollPopup), 30 * 60 * 1000);
        }
        return;
      }

      // Pas de paiement en ligne (ex: total = 0 ou mode hors CinetPay).
      // ⚠️ On NE met PAS `&status=confirmed` ici : on force le passage par
      // /payment/success?orderId=X qui POLL le backend. Sinon on afficherait
      // "Paiement confirmé !" même si le backend n'a jamais validé la
      // commande (cf. bug où la page affichait un succès trompeur).
      if (data?.order?._id) {
        const params = new URLSearchParams({ orderId: data.order._id });
        if (data.verifyToken) params.set('token', data.verifyToken);
        router.push(`/payment/success?${params.toString()}`);
      }

    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Une erreur est survenue lors du paiement.';
      setCheckoutError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [shipping, paymentMethod, router]);

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive mb-4">Impossible de charger le panier</p>
          <Button onClick={() => refetch()}>Réessayer</Button>
        </div>
      </div>
    );
  }

  const items = cart?.items ?? [];

  if (!items.length) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-300">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-semibold mb-3">Votre panier est vide</h2>
          <p className="text-muted-foreground mb-6">
            Ajoutez des produits avant de passer commande.
          </p>
          <Link href={ROUTES.PRODUCTS}>
            <Button variant="primary">Voir les produits</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12 bg-background">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-4xl font-bold mb-2">Finaliser la commande</h1>
          <p className="text-muted-foreground">Paiement sécurisé via CinetPay</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">

          {/* ── Formulaire gauche ──────────────────────────────────────── */}
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">

            {/* Adresse de livraison */}
            <section className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent" />
                Adresse de livraison
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="relative sm:col-span-2">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={shipping.fullName}
                    onChange={e => handleShippingChange('fullName', e.target.value)}
                    placeholder="Nom complet *"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>

                <div className="relative sm:col-span-2">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={shipping.phone}
                    onChange={e => handleShippingChange('phone', e.target.value)}
                    placeholder="Téléphone * (ex: 0707070707)"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <input
                    value={shipping.street}
                    onChange={e => handleShippingChange('street', e.target.value)}
                    placeholder="Adresse complète * (rue, quartier)"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>

                <input
                  value={shipping.city}
                  onChange={e => handleShippingChange('city', e.target.value)}
                  placeholder="Ville *"
                  className="px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
                />

                <select
                  value={shipping.country}
                  onChange={e => handleShippingChange('country', e.target.value)}
                  className="px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="CI">Côte d'Ivoire</option>
                  <option value="SN">Sénégal</option>
                  <option value="ML">Mali</option>
                  <option value="BF">Burkina Faso</option>
                  <option value="GH">Ghana</option>
                  <option value="TG">Togo</option>
                  <option value="BJ">Bénin</option>
                </select>

                <input
                  value={shipping.postalCode}
                  onChange={e => handleShippingChange('postalCode', e.target.value)}
                  placeholder="Code postal (optionnel)"
                  className="px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </section>

            {/* Mode de livraison */}
            <section className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                <Truck className="w-5 h-5 text-accent" />
                Mode de livraison
              </h2>
              <div className="space-y-3">
                {SHIPPING_METHODS.map(m => (
                  <label
                    key={m.value}
                    className={cn(
                      'flex items-center justify-between gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                      shipping.method === m.value
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-accent/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shippingMethod"
                        value={m.value}
                        checked={shipping.method === m.value}
                        onChange={() => handleShippingChange('method', m.value)}
                        className="accent-accent"
                      />
                      <div>
                        <p className="font-medium">{m.label}</p>
                        <p className="text-sm text-muted-foreground">{m.desc}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm">
                      {m.price === 0 ? 'Gratuit' : formatPrice(m.price)}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* Méthode de paiement */}
            <section className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-accent" />
                Méthode de paiement
              </h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map(m => (
                  <label
                    key={m.value}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all',
                      paymentMethod === m.value
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-accent/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={m.value}
                      checked={paymentMethod === m.value}
                      onChange={() => setPaymentMethod(m.value)}
                      className="accent-accent"
                    />
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <p className="font-medium">{m.label}</p>
                      <p className="text-sm text-muted-foreground">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Erreur */}
            {checkoutError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive text-sm animate-in fade-in duration-300">
                {checkoutError}
              </div>
            )}

            {/* Bouton payer */}
            <Button
              size="lg"
              variant="primary"
              className="w-full h-14 text-base font-semibold"
              onClick={handleCheckout}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Traitement en cours...</>
              ) : (
                `🔒 Payer ${formatPrice(total)} en toute sécurité`
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Paiement sécurisé par CinetPay · SSL/TLS · Données chiffrées
            </p>
          </div>

          {/* ── Récapitulatif droite ───────────────────────────────────── */}
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
            <div className="bg-card border border-border rounded-2xl p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-5">Récapitulatif</h2>

              {/* Items */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {items.map((item: any) => (
                  <div key={item._id} className="flex items-center gap-3">
                    <img
                      src={item.image || item.product?.images?.[0]?.url || 'https://placehold.co/48'}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold whitespace-nowrap">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totaux */}
              <div className="mt-5 pt-5 border-t border-border space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sous-total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Livraison ({SHIPPING_METHODS.find(m => m.value === shipping.method)?.label})</span>
                  <span>{shippingCost === 0 ? 'Gratuit' : formatPrice(shippingCost)}</span>
                </div>
                {(cart?.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Réduction</span>
                    <span>-{formatPrice(cart.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {paymentMethod === 'cash_on_delivery' && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                  <p className="font-medium mb-1">⚠️ Paiement à la livraison</p>
                  <p>Un acompte de <strong>{formatPrice(Math.ceil(total * 0.5))}</strong> sera prélevé en ligne maintenant. Le reste ({formatPrice(total - Math.ceil(total * 0.5))} FCFA) sera payé à la livraison.</p>
                </div>
              )}

              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => refetch()}
                disabled={loading}
              >
                Actualiser le panier
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}