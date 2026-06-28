// app/error.tsx
'use client';

import { useEffect } from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('🔴 Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen px-4 py-12 flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-lg w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 animate-in fade-in zoom-in duration-500 delay-100">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl animate-pulse" />
            <AlertTriangle className="relative w-24 h-24 text-destructive mx-auto" />
          </div>
        </div>

        <h1 className="text-6xl font-bold text-destructive mb-4 animate-in fade-in duration-500 delay-200">
          500
        </h1>

        <h2 className="text-2xl font-semibold mb-4 animate-in fade-in duration-500 delay-300">
          Oups ! Quelque chose s'est mal passé
        </h2>

        <p className="text-muted-foreground mb-8 max-w-md mx-auto animate-in fade-in duration-500 delay-400">
          Une erreur inattendue est survenue côté serveur. 
          Nos équipes ont été notifiées et travaillent à la résolution du problème.
        </p>

        {process.env.NODE_ENV === 'development' && error?.message && (
          <div className="mb-8 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-left animate-in fade-in duration-500 delay-500">
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
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-2 duration-500 delay-600">
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
        </div>

        <p className="mt-12 text-sm text-muted-foreground animate-in fade-in duration-500 delay-700">
          Le problème persiste ?{' '}
          <Link 
            href="/contact" 
            className="text-accent hover:underline font-medium"
          >
            Contactez notre support
          </Link>
        </p>
      </div>
    </div>
  );
}