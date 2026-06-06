// app/(public)/auth/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✅ Déterminer la route de redirection
  const fromParam = searchParams.get('from');
  const redirectPath = fromParam && fromParam.startsWith('/') && !fromParam.includes('://') 
    ? fromParam 
    : (ROUTES?.USER?.PROFILE || '/profile');
  
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const { login, isLoading, isAuthenticated, isClient } = useAuth();

  // 🔍 Debug log (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 [LoginPage]', {
        isClient,
        isAuthenticated,
        isLoading,
        redirectPath,
        hasCookie: typeof window !== 'undefined' ? !!document.cookie.match(/bokoma_access_token/) : false,
      });
    }
  }, [isClient, isAuthenticated, isLoading, redirectPath]);

  // ✅ REDIRECTION 1 : Via useEffect (se déclenche si isAuthenticated devient true)
  useEffect(() => {
    if (isClient && isAuthenticated && !isLoading && !isRedirecting) {
      console.log('🔄 [LoginPage] Redirecting via useEffect to:', redirectPath);
      setIsRedirecting(true);
      
      const timeout = setTimeout(() => {
        router.replace(redirectPath);
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [isClient, isAuthenticated, isLoading, redirectPath, router, isRedirecting]);

  // ✅ REDIRECTION 2 : Explicite dans handleSubmit (plus fiable)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const { email, password } = formData;

    // Validations
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
      console.log('🔐 [LoginPage] Attempting login...');
      
      // ✅ Appel à login() avec un OBJET
      await login({ 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      console.log('✅ [LoginPage] Login successful, redirecting to:', redirectPath);
      toast.success('Connexion réussie !');
      
      // ✅ REDIRECTION EXPLICITE (ne pas attendre le useEffect)
      setIsRedirecting(true);
      
      // Petit délai pour laisser le temps au state de se mettre à jour
      setTimeout(() => {
        console.log('🚀 [LoginPage] Executing redirect to:', redirectPath);
        router.push(redirectPath);
        
        // Fallback : si router.push ne fonctionne pas, forcer avec window.location
        setTimeout(() => {
          if (!window.location.pathname.startsWith(redirectPath)) {
            console.warn('⚠️ [LoginPage] router.push failed, using window.location');
            window.location.href = redirectPath;
          }
        }, 500);
      }, 300);
      
    } catch (err: any) {
      console.error('❌ [LoginPage] Login failed:', err);
      
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-accent" />
            <span className="text-2xl font-bold gradient-text">Bokoma</span>
          </div>
          <h1 className="text-3xl font-bold">Connexion</h1>
          <p className="text-muted-foreground mt-2">Accédez à votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Email */}
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
              className="transition-colors"
            />
          </div>

          {/* Password */}
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
                className="pr-10 transition-colors"
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

          {/* Forgot password */}
          <div className="flex items-center justify-between text-sm">
            <Link 
              href={ROUTES?.AUTH?.FORGOT_PASSWORD || '/auth/forgot-password'} 
              className="text-accent hover:underline transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {/* Submit button */}
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className="w-full transition-all" 
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

        {/* Register link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Pas encore de compte ?{' '}
          <Link 
            href={ROUTES?.AUTH?.REGISTER || '/auth/register'} 
            className="text-accent hover:underline font-medium transition-colors"
          >
            S'inscrire gratuitement
          </Link>
        </p>
      </motion.div>
    </div>
  );
}