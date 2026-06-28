// app/(public)/payment/failed/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { XCircle, RefreshCw, ShoppingCart, HeadphonesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { orderApi } from '@/services';
import { ROUTES } from '@/constants';

export default function PaymentFailedPage() {
  const params  = useSearchParams();
  const router  = useRouter();
  const orderId = params.get('orderId');

  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    // Récupérer le numéro de commande depuis sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem('bokoma_pending_order');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setOrderNumber(parsed.orderNumber ?? null);
        } catch {}
        sessionStorage.removeItem('bokoma_pending_order');
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="max-w-lg w-full animate-in fade-in zoom-in duration-500">
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6">

          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>

          <div>
            <h1 className="text-2xl font-bold mb-2 text-destructive">Paiement échoué</h1>
            <p className="text-muted-foreground">
              Votre paiement n'a pas pu être traité. Aucun montant n'a été débité.
            </p>
          </div>

          {orderNumber && (
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm text-muted-foreground mb-1">Référence commande</p>
              <p className="font-mono font-bold text-lg">#{orderNumber}</p>
            </div>
          )}

          <div className="bg-muted/30 rounded-xl p-4 text-sm text-left space-y-2">
            <p className="font-medium">Causes possibles :</p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>• Solde insuffisant sur le compte</li>
              <li>• Transaction annulée ou expirée</li>
              <li>• Problème de réseau lors du paiement</li>
              <li>• Limite de transaction dépassée</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              className="flex-1 gap-2"
              onClick={() => router.push('/checkout')}
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
            <Link href={ROUTES.HOME} className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <ShoppingCart className="w-4 h-4" />
                Retour à l'accueil
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <HeadphonesIcon className="w-3 h-3" />
            Un problème ? Contactez notre support.
          </p>
        </div>
      </div>
    </div>
  );
}