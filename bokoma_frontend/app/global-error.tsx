// app/global-error.tsx
'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('🔴 Global error:', error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-lg w-full text-center animate-in fade-in zoom-in duration-500">
          <div className="mb-8 animate-in fade-in zoom-in duration-500 delay-100">
            <AlertTriangle className="w-20 h-20 text-destructive mx-auto" />
          </div>

          <h1 className="text-5xl font-bold text-destructive mb-4 animate-in fade-in duration-500 delay-200">500</h1>
          <h2 className="text-xl font-semibold mb-4 animate-in fade-in duration-500 delay-300">Erreur serveur</h2>
          
          <p className="text-muted-foreground mb-8 animate-in fade-in duration-500 delay-400">
            Une erreur critique est survenue. Veuillez réessayer dans quelques instants.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <details className="mb-8 text-left animate-in fade-in duration-500 delay-500">
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Détails de l'erreur (development)
              </summary>
              <div className="mt-3 p-4 bg-muted rounded-lg text-xs font-mono text-destructive overflow-auto max-h-48">
                <p><strong>Message:</strong> {error.message}</p>
                {error.digest && <p><strong>Digest:</strong> {error.digest}</p>}
                {error.stack && (
                  <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-2 duration-500 delay-600">
            <Button onClick={reset} variant="primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
            <Button asChild variant="outline">
              <Link href={ROUTES.HOME}>
                <Home className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-muted-foreground animate-in fade-in duration-500 delay-700">
            ID de l'erreur:{' '}
            <code className="bg-muted px-2 py-1 rounded text-xs">
              {error.digest || 'N/A'}
            </code>
          </p>
        </div>
      </body>
    </html>
  );
}