// app/not-found.tsx
'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, ArrowLeft, Home, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';

export default function NotFound() {
  const [currentPath, setCurrentPath] = useState<string>('N/A');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen px-4 py-12 flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-lg w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 animate-in fade-in zoom-in duration-500 delay-100">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-2xl animate-pulse" />
            <AlertCircle className="relative w-24 h-24 text-accent mx-auto" />
          </div>
        </div>

        <h1 className="text-6xl font-bold text-accent mb-4 animate-in fade-in duration-500 delay-200">
          404
        </h1>

        <h2 className="text-2xl font-semibold mb-4 animate-in fade-in duration-500 delay-300">
          Page introuvable
        </h2>

        <p className="text-muted-foreground mb-8 max-w-md mx-auto animate-in fade-in duration-500 delay-400">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée. 
          Peut-être avez-vous mal orthographié l'URL ?
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500">
          <Button asChild variant="primary" size="lg">
            <Link href={ROUTES.HOME}>
              <Home className="w-4 h-4 mr-2" />
              Accueil
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg">
            <Link href={ROUTES.PRODUCTS}>
              <Search className="w-4 h-4 mr-2" />
              Voir les produits
            </Link>
          </Button>
          
          <Button 
            variant="ghost" 
            size="lg"
            onClick={() => window.history.back()}
            className="sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-12 text-left animate-in fade-in duration-500 delay-700">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition">
              🔍 Infos pour le développement
            </summary>
            <div className="mt-3 p-4 bg-muted rounded-lg text-xs text-muted-foreground space-y-2">
              <p><strong>URL actuelle:</strong> <span className="font-mono">{currentPath}</span></p>
              <p><strong>Conseil:</strong> Vérifiez que le slug du produit existe dans la base de données.</p>
              <p><strong>API:</strong> <code>GET /api/v1/products/:slug</code></p>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}