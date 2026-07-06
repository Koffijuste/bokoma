// app/(public)/auth/forgot-password/page.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, Loader2, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/services';
import { ROUTES } from '@/constants';
import { validEmail } from '@/utils/helpers';
import { toast } from 'sonner';

type Step = 'email' | 'otp';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');

  // ── Étape email ──────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // ── Étape OTP ───────────────────────────────────────────────────────
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Countdown pour "renvoyer le code" ──────────────────────────────
  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  // ── Submit email ────────────────────────────────────────────────────
  const handleSubmitEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Email requis'); return; }
    if (!validEmail(email)) { setError('Veuillez saisir un email valide'); return; }

    setIsSubmitting(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    try {
      const response: any = await authApi.forgotPassword(email.trim().toLowerCase());
      window.clearTimeout(timeoutId);

      // Affiche le code en dev (uniquement si renvoyé par le back)
      const devOtp = response?.devOtp;
      if (devOtp) {
        toast.info(`🛠️ Mode dev — OTP : ${devOtp}`, { duration: 10000 });
      }

      toast.success('✅ Code de réinitialisation envoyé par email', { duration: 6000 });
      setStep('otp');
      setCountdown(60); // bouton "renvoyer" désactivé 60s
      // Focus auto sur le 1er input OTP
      window.setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (err: any) {
      window.clearTimeout(timeoutId);
      const message = err?.name === 'AbortError'
        ? '⏱️ Délai dépassé - réessayez'
        : (err?.response?.data?.message || 'Impossible d\'envoyer le code pour le moment');
      setError(message);
      toast.error(message, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Saisie OTP (auto-passage au champ suivant + paste support) ─────
  const handleOtpChange = (idx: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 1);
    const next = [...otpDigits];
    next[idx] = clean;
    setOtpDigits(next);
    setOtpError('');
    if (clean && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (data.length === 6) {
      e.preventDefault();
      const next = data.split('');
      setOtpDigits(next);
      otpRefs.current[5]?.focus();
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const response: any = await authApi.forgotPassword(email.trim().toLowerCase());
      const devOtp = response?.devOtp;
      if (devOtp) {
        toast.info(`🛠️ Mode dev — OTP : ${devOtp}`, { duration: 10000 });
      }
      toast.success('✅ Nouveau code envoyé');
      setCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      window.setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors du renvoi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Submit OTP + nouveau mot de passe ──────────────────────────────
  const handleSubmitOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOtpError('');

    const code = otpDigits.join('');
    if (code.length !== 6) { setOtpError('Veuillez saisir les 6 chiffres du code'); return; }
    if (newPassword.length < 8) { setOtpError('Mot de passe : minimum 8 caractères'); return; }
    if (!/[A-Z]/.test(newPassword)) { setOtpError('Mot de passe : au moins une majuscule'); return; }
    if (!/[0-9]/.test(newPassword)) { setOtpError('Mot de passe : au moins un chiffre'); return; }
    if (newPassword !== confirmPassword) { setOtpError('Les mots de passe ne correspondent pas'); return; }

    setIsVerifying(true);
    try {
      await authApi.resetPasswordWithOtp({
        email: email.trim().toLowerCase(),
        otp: code,
        password: newPassword,
      });
      setIsSuccess(true);
      toast.success('✅ Mot de passe réinitialisé !');
      window.setTimeout(() => router.push(ROUTES.AUTH.LOGIN), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Code invalide ou expiré';
      setOtpError(msg);
      toast.error(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Rendu : succès ────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Mot de passe modifié !</h1>
          <p className="text-muted-foreground mb-6">Vous allez être redirigé vers la connexion...</p>
          <Button variant="outline" onClick={() => router.push(ROUTES.AUTH.LOGIN)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Aller à la connexion
          </Button>
        </div>
      </div>
    );
  }

  // ── Rendu : étape email ───────────────────────────────────────────
  if (step === 'email') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold mb-2">Mot de passe oublié</h1>
              <p className="text-muted-foreground text-sm">
                Entrez votre email — vous recevrez un <strong>code à 6 chiffres</strong> pour réinitialiser
                votre mot de passe.
              </p>
            </div>

            <form onSubmit={handleSubmitEmail} className="space-y-6" noValidate>
              <div>
                <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                    disabled={isSubmitting}
                    placeholder="vous@exemple.com"
                    className="pl-12"
                    autoComplete="email"
                  />
                </div>
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
              </div>

              <Button type="submit" size="lg" variant="primary" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi en cours...</>
                ) : (
                  <><KeyRound className="w-4 h-4 mr-2" /> Recevoir le code</>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href={ROUTES.AUTH.LOGIN} className="inline-flex items-center gap-1 text-accent hover:text-accent/80">
                <ArrowLeft className="w-3 h-3" /> Retour à la connexion
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Rendu : étape OTP ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-7 h-7 text-accent" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Vérification en 2 étapes</h1>
            <p className="text-sm text-muted-foreground">
              Un code à 6 chiffres a été envoyé à <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmitOtp} className="space-y-5" noValidate>
            {/* OTP inputs */}
            <div className="flex justify-center gap-2">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={handleOtpPaste}
                  disabled={isVerifying}
                  className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:opacity-50"
                  aria-label={`Chiffre ${idx + 1}`}
                />
              ))}
            </div>

            {/* Nouveau mot de passe */}
            <div>
              <Label htmlFor="newPassword" className="text-sm font-medium mb-1.5 block">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setOtpError(''); }}
                  disabled={isVerifying}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Min. 8 caractères, avec une majuscule et un chiffre.
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium mb-1.5 block">Confirmer</Label>
              <Input
                id="confirmPassword"
                type={showPwd ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setOtpError(''); }}
                disabled={isVerifying}
                placeholder="••••••••"
              />
            </div>

            {otpError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive animate-in fade-in duration-300">
                {otpError}
              </div>
            )}

            <Button type="submit" size="lg" variant="primary" className="w-full" disabled={isVerifying}>
              {isVerifying ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Vérification...</>
              ) : (
                'Réinitialiser le mot de passe'
              )}
            </Button>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
              <span>Code non reçu ?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || isSubmitting}
                className="text-accent hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {countdown > 0 ? `Renvoyer (${countdown}s)` : 'Renvoyer le code'}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <button
              onClick={() => { setStep('email'); setOtpError(''); }}
              className="inline-flex items-center gap-1 text-accent hover:text-accent/80"
            >
              <ArrowLeft className="w-3 h-3" /> Modifier l'email
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
