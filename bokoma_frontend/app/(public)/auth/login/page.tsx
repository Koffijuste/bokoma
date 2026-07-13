// app/(public)/auth/login/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store';
import { ROUTES } from '@/constants';

// ✅ Redirection post-login : admin/manager → /dashboard, client → /profile.
//   On garde le respect du `?from=` quand présent (ex: user clique un lien
//   protégé, se fait rediriger vers /auth/login?from=/wishlist, et revient
//   sur /wishlist après login). Mais on FORCE le dashboard si un user
//   admin/manager est en train de se logger depuis une page client (anti
//   fuite : on ne veut pas qu'un admin atterrisse accidentellement sur
//   /profile au lieu de son tableau de bord).
const r = (route: string | undefined, fallback: string) =>
  route?.startsWith('/') ? route : fallback;

const resolveRedirect = (
  from: string | null,
  user: { role?: string } | null,
): string => {
  const dashboard = r(ROUTES?.ADMIN?.DASHBOARD, '/dashboard');
  const profile = r(ROUTES?.USER?.PROFILE, '/profile');

  // Admin/manager : toujours /dashboard (sauf si from pointe vers une route
  // admin différente, ex: /dashboard/orders, qu'on respecte).
  const isStaff = user?.role === 'admin' || user?.role === 'manager';

  if (from && from.startsWith('/') && !from.includes('://')) {
    if (isStaff) {
      // Si le from est explicitement une page admin, on respecte
      if (from.startsWith('/dashboard') || from.startsWith('/admin')) {
        return from;
      }
      // Sinon on force le dashboard
      return dashboard;
    }
    // Client avec un from valide : on respecte
    return from;
  }

  // Pas de from : dispatch par rôle
  return isStaff ? dashboard : profile;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const fromParam = searchParams.get('from');
  
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const { login, isLoading, isAuthenticated, fetchUser } = useAuth();
  const user = useAuthStore((s) => s.user);
  // ✅ Guard pour ne fetchUser qu'une seule fois par mount (évite les
  // doubles appels quand isLoading oscille entre true/false pendant
  // l'hydratation Zustand).
  const initialFetchAttemptedRef = useRef(false);

  // ✅ Bug fix (09/07/2026) : on resynchronise l'état Zustand avec la
  //    réalité du cookie AVANT de décider de rediriger. Sinon, un user
  //    persisté ("Morning") + access token expiré déclenchait une boucle :
  //    Zustand.isAuthenticated=true → redirect /dashboard → middleware
  //    rejette (cookie expiré) → 307 vers /auth/login → Zustand toujours
  //    isAuthenticated=true → redirect /dashboard → … ad vitam.
  //
  //    En appelant fetchUser() au montage, /auth/me (avec auto-refresh
  //    côté interceptor) revalide la session. Si le cookie est mort,
  //    Zustand passe à user=null et le formulaire s'affiche normalement.
  //
  // ✅ Bug fix (10/07/2026) : useEffect avec deps [] + guard sur
  //    isLoading ratait le fetch si isLoading=true au mount (Zustand en
  //    cours d'hydratation depuis localStorage). Le state restait alors
  //    figé sur le formulaire de login sans qu'aucun /auth/me ne parte
  //    jamais. On utilise un ref pour retry dès que isLoading retombe à
  //    false, et on évite le double-fetch avec initialFetchAttemptedRef.
  useEffect(() => {
    if (initialFetchAttemptedRef.current) return;
    if (isLoading) return; // Attend que le store ait fini d'hydrater
    initialFetchAttemptedRef.current = true;
    fetchUser();
  }, [isLoading, fetchUser]);

  // ✅ Redirection automatique si vraiment authentifié
  // (le fetchUser ci-dessus a attendu que isLoading retombe avant de
  // mettre à jour Zustand, donc cette branche ne se déclenche plus sur
  // un état stale)
  useEffect(() => {
    if (isAuthenticated && !isLoading && !isRedirecting && user) {
      setIsRedirecting(true);
      const dest = resolveRedirect(fromParam, user);
      router.replace(dest);
    }
  }, [isAuthenticated, isLoading, fromParam, user, router, isRedirecting]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const { email, password } = formData;

    if (!email?.trim() || !password) {
      toast.error('Email et mot de passe requis');
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Format d'email invalide");
      return;
    }
    
    if (password.length < 6) {
      toast.error('Minimum 6 caractères requis');
      return;
    }

    try {
      await login({ 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      toast.success('Connexion réussie !');
      setIsRedirecting(true);
      
      // Récupère le user (Zustand est mis à jour synchrone par login())
      const freshUser = useAuthStore.getState().user;
      const dest = resolveRedirect(fromParam, freshUser);
      
      setTimeout(() => {
        router.push(dest);
      }, 300);
      
    } catch (err: any) {
      if (err?.statusCode === 422 && Array.isArray(err?.errors)) {
        const fieldErrors = err.errors
          .map((e: any) => e.message || e.msg || e.field)
          .join(', ');
        toast.error(fieldErrors || 'Données invalides');
      } else if (err?.statusCode === 401) {
        toast.error('Email ou mot de passe incorrect');
      } else {
        toast.error(err?.message || 'Erreur de connexion');
      }
      
      setError(err?.message || 'Erreur de connexion');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BrandLogo size="md" layout="compact" />
          </div>
          <h1 className="text-3xl font-bold">Connexion</h1>
          <p className="text-muted-foreground mt-2">Accédez à votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive animate-in fade-in duration-300">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading || isRedirecting}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading || isRedirecting}
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                disabled={isLoading || isRedirecting}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <Link 
              href={ROUTES?.AUTH?.FORGOT_PASSWORD || '/auth/forgot-password'} 
              className="text-accent hover:underline transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className="w-full" 
            disabled={isLoading || isRedirecting}
          >
            {isLoading || isRedirecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isRedirecting ? 'Redirection...' : 'Connexion...'}
              </>
            ) : (
              'Se connecter'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Pas encore de compte ?{' '}
          <Link 
            href={ROUTES?.AUTH?.REGISTER || '/auth/register'} 
            className="text-accent hover:underline font-medium transition-colors"
          >
            S'inscrire gratuitement
          </Link>
        </p>
      </div>
    </div>
  );
}