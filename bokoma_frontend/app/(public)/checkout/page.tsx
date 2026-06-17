// app/(public)/checkout/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useFetch } from '@/hooks';
// ✅ 1. Ajout de l'import de orderApi
import { cartApi, orderApi } from '@/services'; 
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { formatPrice } from '@/utils/helpers';

export default function CheckoutPage() {
  const { data: cart, loading, error, refetch } = useFetch(() => cartApi.getCart(), []);
  
  // ✅ 2. Ajout d'un état pour gérer le chargement pendant le paiement
  const [isProcessing, setIsProcessing] = useState(false);

  const [shippingDetails, setShippingDetails] = useState({
    fullName: '',
    address: '',
    city: '',
    country: '',
    phone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('card');

  const handleChange = (field: string, value: string) => {
    setShippingDetails((prev) => ({ ...prev, [field]: value }));
  };

  // ✅ 3. Création de la fonction de soumission (Checkout)
  const handleCheckout = async () => {
    // Petite validation basique avant d'envoyer
    if (!shippingDetails.fullName || !shippingDetails.phone || !shippingDetails.address) {
      alert('Veuillez remplir toutes les informations de livraison.');
      return;
    }

    setIsProcessing(true);

    try {
      // Appel à votre backend pour créer la commande
      const response = await orderApi.createOrder({
        shipping: shippingDetails,
        payment: { method: paymentMethod },
      });

      // ✅ 4. Vérification de la redirection CinetPay
      if (response.data?.payment?.paymentUrl) {
        // Redirection vers la page de paiement sécurisée de CinetPay
        window.location.href = response.data.payment.paymentUrl;
        return; // On arrête l'exécution ici, la page va changer
      }

      // ✅ 5. Fallback pour les autres méthodes (ex: paiement à la livraison)
      if (response.success) {
        // Redirection vers une page de succès interne
        window.location.href = `/orders/success?orderId=${response.data.order._id}`;
      }
      
    } catch (error: any) {
      console.error('❌ Erreur lors de la commande:', error);
      alert(error.response?.data?.message || 'Une erreur est survenue lors du paiement.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold mb-2">Paiement</h1>
          <p className="text-muted-foreground">Finalisez votre commande en toute sécurité.</p>
        </motion.div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 rounded-3xl bg-card animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-destructive bg-destructive/10 p-8 text-center text-destructive">
            <p className="mb-4">Erreur: {error.message}</p>
            <Button onClick={() => refetch()}>Réessayer</Button>
          </div>
        ) : !cart?.items?.length ? (
          <div className="rounded-3xl border border-border bg-card p-12 text-center">
            <h2 className="text-2xl font-semibold mb-3">Votre panier est vide</h2>
            <p className="text-muted-foreground mb-6">Ajoutez des produits à votre panier avant de passer au paiement.</p>
            <Link href={ROUTES.PRODUCTS}>
              <Button>Voir les produits</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-border bg-card p-8">
              <h2 className="text-2xl font-bold mb-6">Adresse de livraison</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  value={shippingDetails.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="Nom complet"
                  className="w-full rounded-3xl border border-border bg-background px-4 py-3"
                />
                <input
                  value={shippingDetails.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Téléphone"
                  className="w-full rounded-3xl border border-border bg-background px-4 py-3"
                />
                <input
                  value={shippingDetails.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Adresse"
                  className="w-full rounded-3xl border border-border bg-background px-4 py-3 sm:col-span-2"
                />
                <input
                  value={shippingDetails.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Ville"
                  className="w-full rounded-3xl border border-border bg-background px-4 py-3"
                />
                <input
                  value={shippingDetails.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  placeholder="Pays"
                  className="w-full rounded-3xl border border-border bg-background px-4 py-3"
                />
              </div>

              <div className="mt-8 rounded-3xl border border-border bg-background p-6">
                <h3 className="text-xl font-semibold mb-4">Méthode de paiement</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  {['card', 'mobile_money', 'cash_on_delivery', 'bank_transfer'].map((method) => (
                    <label key={method} className="flex items-center gap-3 rounded-2xl border border-border p-4 cursor-pointer hover:border-accent">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={() => setPaymentMethod(method)}
                        className="h-4 w-4 accent-accent"
                      />
                      <span className="capitalize">{method.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ✅ 6. Mise à jour du bouton pour déclencher handleCheckout */}
              <Button 
                size="lg" 
                variant="primary" 
                className="mt-8 w-full"
                onClick={handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? 'Traitement en cours...' : `Payer ${formatPrice(cart.total)}`}
              </Button>
            </div>

            <div className="rounded-3xl border border-border bg-card p-8">
              <h2 className="text-2xl font-bold mb-6">Récapitulatif</h2>
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div key={item._id} className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{item.product.name} x{item.quantity}</p>
                    <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-border pt-4 space-y-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sous-total</span>
                  <span>{formatPrice(cart.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Livraison</span>
                  <span>Gratuite</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(cart.total)}</span>
                </div>
              </div>
              <Button variant="outline" className="mt-6 w-full" onClick={() => refetch()}>
                Actualiser le panier
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}