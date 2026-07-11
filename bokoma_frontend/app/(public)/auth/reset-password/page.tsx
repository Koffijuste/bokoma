// app/(public)/auth/reset-password/page.tsx
// ============================================================================
// 🔐 ÉTAPE 2/2 — Saisie du nouveau mot de passe
// ============================================================================
// Deux façons d'arriver ici :
//   (a) Clic sur le LIEN dans l'email → URL avec ?token=XXX
//   (b) Après vérification OTP sur /auth/forgot-password → token dans
//       sessionStorage
// Dans les 2 cas on appelle PATCH /auth/reset-password/:token avec le
// nouveau mot de passe. Si aucun token n'est dispo → redirect vers
// /auth/forgot-password (l'user doit prouver son identité d'abord).
// ============================================================================
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/services';
import { ROUTES } from '@/constants';

// Clé partagée avec /forgot-password (et d'autres pages au besoin)
const RESET_TOKEN_KEY = 'bokoma:reset-token';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  const [token, setToken] = useState<string | null>(tokenFromUrl);
  const [tokenReady, setTokenReady] = useState(!!tokenFromUrl);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Si on n'a pas de token dans l'URL, on lit sessionStorage.
    // Si toujours rien → on redirige vers forgot-password.
  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      setTokenReady(true);
      return;
    }
    try {
      const stored = sessionStorage.getItem(RESET_TOKEN_KEY);
      if (stored) {
        setToken(stored);
        setTokenReady(true);
        return;
      }
    } catch {}
    // Pas de token → faut passer par forgot-password d'abord
    router.replace(ROUTES.AUTH.FORGOT_PASSWORD);
  }, [tokenFromUrl, router]);

  useEffect(() => {
    const password = formData.password;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    setPasswordStrength(strength);
  }, [formData.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.password) {
      setError('Le mot de passe est requis');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError('Le mot de passe doit contenir au moins une majuscule');
      return false;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError('Le mot de passe doit contenir au moins un chiffre');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!token) {
      setError('Session expirée. Recommencez la procédure.');
      setTimeout(() => router.replace(ROUTES.AUTH.FORGOT_PASSWORD), 1500);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword(token, formData.password);
      // Clean le token de sessionStorage
      try { sessionStorage.removeItem(RESET_TOKEN_KEY); } catch {}
      setSuccess(true);
      setTimeout(() => router.push(ROUTES.AUTH.LOGIN), 3000);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Erreur lors de la réinitialisation du mot de passe'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-md w-full text-center animate-in fade-in zoom-in duration-500">
          <div className="mb-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
              <CheckCircle className="relative w-20 h-20 text-emerald-500 mx-auto" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3">Mot de passe réinitialisé !</h2>
          <p className="text-muted-foreground mb-6">
            Votre mot de passe a été mis à jour avec succès.
            Vous allez être redirigé vers la page de connexion...
          </p>
          <Link href={ROUTES.AUTH.LOGIN}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Aller à la connexion
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // En attente de la résolution du token
  if (!tokenReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="mb-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-2xl animate-pulse" />
              <Lock className="relative w-16 h-16 text-accent mx-auto" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Nouveau mot de passe</h1>
          <p className="text-muted-foreground">
            Choisissez un nouveau mot de passe pour votre compte
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                disabled={isSubmitting}
                className="pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {formData.password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[0, 25, 50, 75].map((threshold, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordStrength > threshold ? 'bg-emerald-500' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Force : {passwordStrength <= 25 ? 'Faible' : passwordStrength <= 50 ? 'Moyenne' : passwordStrength <= 75 ? 'Bonne' : 'Excellente'}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                disabled={isSubmitting}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {formData.confirmPassword && (
              <p className={`text-xs ${
                formData.password === formData.confirmPassword
                  ? 'text-emerald-600'
                  : 'text-destructive'
              }`}>
                {formData.password === formData.confirmPassword
                  ? '✓ Les mots de passe correspondent'
                  : '✗ Les mots de passe ne correspondent pas'}
              </p>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
            <p className="font-medium">Exigences :</p>
            <ul className="space-y-0.5">
              <li className={formData.password.length >= 8 ? 'text-emerald-600' : ''}>
                {formData.password.length >= 8 ? '✓' : '•'} Au moins 8 caractères
              </li>
              <li className={/[A-Z]/.test(formData.password) ? 'text-emerald-600' : ''}>
                {/[A-Z]/.test(formData.password) ? '✓' : '•'} Une lettre majuscule
              </li>
              <li className={/[0-9]/.test(formData.password) ? 'text-emerald-600' : ''}>
                {/[0-9]/.test(formData.password) ? '✓' : '•'} Un chiffre
              </li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-start gap-2 animate-in fade-in duration-300">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isSubmitting || !formData.password || !formData.confirmPassword}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Réinitialisation...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Réinitialiser le mot de passe
              </>
            )}
          </Button>
        </form>

        <div className="text-center mt-6">
          <Link
            href={ROUTES.AUTH.LOGIN}
            className="text-sm text-muted-foreground hover:text-accent inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
