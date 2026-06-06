// app/not-found.tsx
'use client';

import { useState, useEffect } from 'react'; // ✅ AJOUT des hooks
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Home, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';

export default function NotFound() {
  // ✅ AJOUT : État pour l'URL (évite l'hydratation mismatch)
  const [currentPath, setCurrentPath] = useState<string>('N/A');
  
  // ✅ AJOUT : Lire window.location uniquement côté client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
    }
  }, []);

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
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mb-8"
        >
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-2xl animate-pulse" />
            <AlertCircle className="relative w-24 h-24 text-accent mx-auto" />
          </div>
        </motion.div>

        {/* Titre */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-6xl font-bold text-accent mb-4"
        >
          404
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-semibold mb-4"
        >
          Page introuvable
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-8 max-w-md mx-auto"
        >
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée. 
          Peut-être avez-vous mal orthographié l'URL ?
        </motion.p>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
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
        </motion.div>

        {/* Lien debug en dev */}
        {process.env.NODE_ENV === 'development' && (
          <motion.details
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-12 text-left"
          >
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition">
              🔍 Infos pour le développement
            </summary>
            <div className="mt-3 p-4 bg-muted rounded-lg text-xs text-muted-foreground space-y-2">
              <p><strong>URL actuelle:</strong> <span className="font-mono">{currentPath}</span></p>
              <p><strong>Conseil:</strong> Vérifiez que le slug du produit existe dans la base de données.</p>
              <p><strong>API:</strong> <code>GET /api/v1/products/:slug</code></p>
            </div>
          </motion.details>
        )}
      </motion.div>
    </div>
  );
}