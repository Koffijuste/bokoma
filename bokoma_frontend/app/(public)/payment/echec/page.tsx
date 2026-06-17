'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { XCircle, ShoppingCart, ArrowLeft, HelpCircle, AlertTriangle, Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { useMounted } from '@/hooks/useMounted';

export default function PaymentFailedPage() {
  const searchParams = useSearchParams();
  const mounted = useMounted();
  
  const [errorDetails, setErrorDetails] = useState<{
    code?: string;
    message?: string;
    transactionId?: string;
  }>({});

  useEffect(() => {
    if (!mounted) return;
    
    const code = searchParams.get('code');
    const message = searchParams.get('message');
    const transactionId = searchParams.get('transaction_id');
    
    setErrorDetails({
      code: code || undefined,
      message: message || 'Le paiement a été refusé ou annulé.',
      transactionId: transactionId || undefined,
    });
    
    // Nettoyer localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pending_order_id');
    }
  }, [mounted, searchParams]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <XCircle className="w-14 h-14 text-destructive" />
          </motion.div>
          
          <h1 className="text-4xl font-bold mb-3">Paiement échoué</h1>
          <p className="text-lg text-muted-foreground">
            Nous n'avons pas pu traiter votre paiement.
          </p>
        </motion.div>

        {/* Détails de l'erreur */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 mb-6"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2 text-destructive">Détails de l'erreur</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {errorDetails.message}
              </p>
              {errorDetails.code && (
                <p className="text-xs font-mono bg-muted/50 px-3 py-1.5 rounded inline-block">
                  Code : {errorDetails.code}
                </p>
              )}
              {errorDetails.transactionId && (
                <p className="text-xs text-muted-foreground mt-2">
                  ID Transaction : {errorDetails.transactionId}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Causes possibles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-3xl border border-border bg-card p-6 mb-6"
        >
          <h3 className="font-semibold mb-3">Causes possibles</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>Fonds insuffisants sur votre compte</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>Informations de paiement incorrectes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>Transaction refusée par votre opérateur</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>Délai d'attente dépassé</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>Paiement annulé par l'utilisateur</span>
            </li>
          </ul>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <Button asChild size="lg" className="w-full">
            <Link href={ROUTES.CART || '/cart'}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Retourner au panier et réessayer
            </Link>
          </Button>
          
          <div className="grid sm:grid-cols-2 gap-3">
            <Button variant="outline" asChild className="w-full">
              <Link href={ROUTES.PRODUCTS}>
                <Home className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/help">
                <HelpCircle className="w-4 h-4 mr-2" />
                Contacter le support
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Note rassurante */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          Votre panier a été sauvegardé. Aucun montant n'a été débité.
        </motion.p>
      </div>
    </div>
  );
}