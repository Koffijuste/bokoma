// app/error.tsx
'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  // Log l'erreur en console (et potentiellement vers un service de monitoring)
  useEffect(() => {
    console.error('🔴 Application error:', error);
    
    // Optionnel: Envoyer à un service de monitoring (Sentry, LogRocket, etc.)
    // if (process.env.NODE_ENV === 'production') {
    //   monitoringService.captureException(error);
    // }
  }, [error]);

  return (
    <div className="min-h-screen px-4 py-12 flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-lg w-full text-center"
      >
        {/* Icône animée */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mb-8"
        >
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl animate-pulse" />
            <AlertTriangle className="relative w-24 h-24 text-destructive mx-auto" />
          </div>
        </motion.div>

        {/* Titre */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-6xl font-bold text-destructive mb-4"
        >
          500
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-semibold mb-4"
        >
          Oups ! Quelque chose s'est mal passé
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-8 max-w-md mx-auto"
        >
          Une erreur inattendue est survenue côté serveur. 
          Nos équipes ont été notifiées et travaillent à la résolution du problème.
        </motion.p>

        {/* Message d'erreur en dev */}
        {process.env.NODE_ENV === 'development' && error?.message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-8 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-left"
          >
            <p className="text-xs font-mono text-destructive">
              <strong>Error:</strong> {error.message}
            </p>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Voir la stack trace
                </summary>
                <pre className="mt-2 p-3 bg-background rounded text-xs overflow-auto max-h-40 text-destructive">
                  {error.stack}
                </pre>
              </details>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button 
            onClick={reset} 
            variant="primary" 
            size="lg"
            className="sm:w-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
          
          <Button asChild variant="outline" size="lg">
            <Link href={ROUTES.HOME}>
              <Home className="w-4 h-4 mr-2" />
              Accueil
            </Link>
          </Button>
          
          <Button 
            variant="ghost" 
            size="lg"
            onClick={() => window.history.back()}
            className="sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Page précédente
          </Button>
        </motion.div>

        {/* Support */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 text-sm text-muted-foreground"
        >
          Le problème persiste ?{' '}
          <Link 
            href="/contact" 
            className="text-accent hover:underline font-medium"
          >
            Contactez notre support
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}