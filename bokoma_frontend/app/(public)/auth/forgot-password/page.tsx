// app/(public)/auth/forgot-password/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authApi } from '@/services';
import { ROUTES } from '@/constants';
import { validEmail } from '@/utils/helpers';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email requis');
      return;
    }

    if (!validEmail(email)) {
      setError('Veuillez saisir un email valide');
      return;
    }

    setIsSubmitting(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      clearTimeout(timeoutId);
      
      setIsSent(true);
      toast.success('✅ Email de réinitialisation envoyé', { duration: 6000 });
      
      setTimeout(() => router.push(ROUTES.AUTH.LOGIN), 3000);
      
    } catch (err: any) {
      clearTimeout(timeoutId);
      
      const message = err?.name === 'AbortError' 
        ? '⏱️ Délai dépassé - réessayez' 
        : 'Si cet email existe, un lien a été envoyé';
        
      setError(message);
      toast.info(message, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Email envoyé !</h1>
            <p className="text-muted-foreground mb-6">
              Si <strong>{email}</strong> est associé à un compte, vous recevrez un lien de réinitialisation sous peu.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Redirection automatique vers la connexion...
            </p>
            <Button variant="outline" onClick={() => router.push(ROUTES.AUTH.LOGIN)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Mot de passe oublié</h1>
            <p className="text-muted-foreground text-sm">
              Entrez votre email pour recevoir un lien de réinitialisation
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  disabled={isSubmitting}
                  placeholder="vous@exemple.com"
                  className="w-full rounded-2xl border border-border bg-background px-12 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  autoComplete="email"
                />
              </div>
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </div>

            <Button 
              type="submit" 
              size="lg" 
              variant="primary" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                'Envoyer le lien'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href={ROUTES.AUTH.LOGIN} className="inline-flex items-center gap-1 text-accent hover:text-accent/80 transition-colors">
              <ArrowLeft className="w-3 h-3" />
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}