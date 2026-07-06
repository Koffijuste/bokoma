// components/layout/Header.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search, ShoppingBag, User, Heart, Menu, X, LogOut, Package,
  LayoutDashboard, ChevronDown, Sparkles, Settings, Crown,
  Sun, Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import { useWishlist } from '@/hooks/useWishlist';
import { useCartStore } from '@/store/cart';
import { ROUTES } from '@/constants';
import { cn } from '@/utils/helpers';
import { toast } from 'sonner';

const NAV_LINKS = [
  { label: 'Accueil', href: '/' },
  { label: 'Boutique', href: ROUTES.PRODUCTS },
  { label: 'Galerie', href: ROUTES.GALLERY },
  { label: 'Nouveautés', href: `${ROUTES.PRODUCTS}?sort=-createdAt` },
  { label: 'Promotions', href: `${ROUTES.PRODUCTS}?sort=promotions` },
];

const getAvatarUrl = (user: any, size: number = 40): string => {
  if (user?.avatar) return user.avatar;
  const name = `${user?.firstName || ''}${user?.lastName || ''}`.trim() || 'U';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=a855f7&color=fff&size=${size}&bold=true`;
};

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useMounted();

  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { wishlist } = useWishlist();
  const cart = useCartStore((state) => state.cart);
  const cartCount = cart?.items?.length || 0;

  // ✅ Toggle thème Night/Light — branché sur next-themes (déjà câblé
  // dans providers.tsx). On attend `mounted` pour éviter le mismatch SSR.
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = mounted && resolvedTheme === 'dark';

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const isAdminPath = useMemo(() => {
    return pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin');
  }, [pathname]);

  const isStaff = useMemo(() => {
    return user?.role === 'admin' || user?.role === 'manager';
  }, [user?.role]);

  const wishlistCount = wishlist.length;

  // ✅ Auto-hide au scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 100) {
        setIsScrolled(true);
        if (currentScrollY > lastScrollY && currentScrollY > 200) {
          setIsHidden(true);
        } else {
          setIsHidden(false);
        }
      } else {
        setIsScrolled(false);
        setIsHidden(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // ✅ Fermer les menus au changement de page
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  // ✅ Fermer menu user au clic extérieur
  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-user-menu]')) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  // ✅ Empêcher le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast.success('Déconnexion réussie');
      setIsUserMenuOpen(false);
      setIsMobileMenuOpen(false);
      router.push(ROUTES.HOME);
    } catch (err) {
      toast.error('Erreur lors de la déconnexion');
    }
  }, [logout, router]);

  const handleMobileToggle = useCallback(() => {
    console.log('🍔 [HEADER] Mobile menu toggle, current:', isMobileMenuOpen);
    setIsMobileMenuOpen(prev => !prev);
  }, [isMobileMenuOpen]);

  if (!mounted) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 h-16 lg:h-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 lg:w-11 lg:h-11 rounded-xl overflow-hidden shadow-lg shadow-accent/30 ring-1 ring-black/5">
              <Image
                src="/logo.jpeg"
                alt="Bokoma"
                fill
                sizes="44px"
                priority
                className="object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span
                className="text-2xl lg:text-[1.7rem] leading-none font-bold tracking-tight"
                style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontStyle: 'italic' }}
              >
                <span className="bg-gradient-to-r from-rose-700 via-red-700 to-rose-900 bg-clip-text text-transparent">
                  Bokoma
                </span>
              </span>
              <span className="text-[9px] text-muted-foreground font-medium tracking-[0.25em] uppercase -mt-0.5 hidden sm:block">
                Premium Store
              </span>
            </div>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* ✅ HEADER */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          isHidden ? '-translate-y-full' : 'translate-y-0',
          isScrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/5'
            : 'bg-gradient-to-b from-background/60 to-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            
            {/* LOGO */}
            <Link 
              href={isAdminPath ? ROUTES.ADMIN.DASHBOARD : ROUTES.HOME} 
              className="flex items-center gap-3 group"
            >
              <div className="relative">
                <div className="relative w-10 h-10 lg:w-11 lg:h-11 rounded-xl overflow-hidden shadow-lg shadow-rose-900/20 ring-1 ring-black/5 group-hover:shadow-rose-900/40 group-hover:scale-105 transition-all duration-300">
                  <Image
                    src="/logo.jpeg"
                    alt="Bokoma"
                    fill
                    sizes="44px"
                    priority
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span
                  className="text-2xl lg:text-[1.75rem] leading-none font-bold tracking-tight"
                  style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontStyle: 'italic' }}
                >
                  <span className="bg-gradient-to-r from-rose-700 via-red-700 to-rose-900 bg-clip-text text-transparent">
                    Bokoma
                  </span>
                </span>
                <span className="text-[9px] text-muted-foreground font-medium tracking-[0.25em] uppercase -mt-0.5 hidden sm:block">
                  Premium Store
                </span>
              </div>
            </Link>

            {/* DESKTOP NAVIGATION */}
            <nav className="hidden lg:flex items-center gap-1 bg-muted/30 backdrop-blur-sm rounded-full p-1 border border-border/50">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href || 
                  (link.href !== '/' && pathname.startsWith(link.href.split('?')[0].split('#')[0]));
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'relative px-5 py-2 text-sm font-medium rounded-full transition-all duration-300',
                      isActive
                        ? 'text-background bg-gradient-to-r from-accent to-purple-500'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* ACTIONS */}
            <div className="flex items-center gap-1 sm:gap-2">
              
              {/* ✅ Bouton Night/Light — toujours visible (desktop + tablette) */}
              <button
                onClick={toggleTheme}
                className="flex w-10 h-10 items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
                aria-pressed={isDark}
                title={isDark ? 'Light' : 'Night'}
              >
                {isDark ? (
                  <Sun className="w-5 h-5 transition-transform duration-300 hover:rotate-45" />
                ) : (
                  <Moon className="w-5 h-5 transition-transform duration-300 hover:-rotate-12" />
                )}
              </button>

              {/* Search */}
              <button
                onClick={() => router.push('/search')}
                className="hidden sm:flex w-10 h-10 items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                aria-label="Rechercher"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Wishlist */}
              {isAuthenticated && (
                <Link 
                  href="/wishlist" 
                  className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                  aria-label="Favoris"
                >
                  <Heart className="w-5 h-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-br from-pink-500 to-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-lg shadow-pink-500/30 px-1">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart */}
              <Link 
                href={ROUTES.CART} 
                className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                aria-label="Panier"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-br from-accent to-purple-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-lg shadow-accent/30 px-1">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>

              {/* AUTH SECTION */}
              <div className="hidden sm:flex items-center ml-2" data-user-menu>
                {authLoading && (
                  <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                )}
                
                {!authLoading && isAuthenticated && user && (
                  <div className="relative" data-user-menu>
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-muted/50 hover:bg-muted border border-border/50 transition-all"
                      aria-label="Menu utilisateur"
                      aria-expanded={isUserMenuOpen}
                    >
                      <img 
                        src={getAvatarUrl(user, 32)} 
                        alt="Avatar" 
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-accent/20"
                        onError={(e) => { 
                          (e.target as HTMLImageElement).src = getAvatarUrl(null, 32);
                        }}
                      />
                      <span className="text-sm font-medium max-w-[100px] truncate">
                        {user.firstName || user.email?.split('@')[0]}
                      </span>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform duration-300",
                        isUserMenuOpen && "rotate-180"
                      )} />
                    </button>
                    
                    {isUserMenuOpen && (
                      <div 
                        className="absolute right-0 mt-3 w-64 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                        data-user-menu
                      >
                        <div className="p-4 bg-gradient-to-br from-accent/10 via-purple-500/5 to-transparent border-b border-border/50">
                          <div className="flex items-center gap-3">
                            <img 
                              src={getAvatarUrl(user, 48)} 
                              alt="Avatar"
                              className="w-12 h-12 rounded-full object-cover ring-2 ring-accent/30"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          {user.role && (
                            <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                              {user.role === 'admin' ? (
                                <><Crown className="w-3 h-3" /> Administrateur</>
                              ) : user.role === 'manager' ? (
                                <><Sparkles className="w-3 h-3" /> Gestionnaire</>
                              ) : (
                                <><User className="w-3 h-3" /> Client</>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="p-2">
                          <Link href={ROUTES.USER.PROFILE} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 rounded-xl transition-colors group" onClick={() => setIsUserMenuOpen(false)}>
                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                              <User className="w-4 h-4 text-accent" />
                            </div>
                            <span className="font-medium">Mon Profil</span>
                          </Link>
                          <Link href="/profile?tab=orders" className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 rounded-xl transition-colors group" onClick={() => setIsUserMenuOpen(false)}>
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                              <Package className="w-4 h-4 text-blue-500" />
                            </div>
                            <span className="font-medium">Mes Commandes</span>
                          </Link>
                          <Link href="/wishlist" className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 rounded-xl transition-colors group" onClick={() => setIsUserMenuOpen(false)}>
                            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                              <Heart className="w-4 h-4 text-pink-500" />
                            </div>
                            <span className="font-medium">Favoris</span>
                            {wishlistCount > 0 && (
                              <span className="ml-auto text-xs bg-pink-500/10 text-pink-600 px-2 py-0.5 rounded-full font-semibold">
                                {wishlistCount}
                              </span>
                            )}
                          </Link>
                          <Link href="/profile/settings" className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 rounded-xl transition-colors group" onClick={() => setIsUserMenuOpen(false)}>
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                              <Settings className="w-4 h-4 text-purple-500" />
                            </div>
                            <span className="font-medium">Paramètres</span>
                          </Link>

                          {isStaff && (
                            <>
                              <div className="my-2 border-t border-border/50" />
                              <Link href={ROUTES.ADMIN.DASHBOARD} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent/10 rounded-xl transition-colors group" onClick={() => setIsUserMenuOpen(false)}>
                                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                                  <LayoutDashboard className="w-4 h-4 text-accent" />
                                </div>
                                <span className="font-medium text-accent">Dashboard Admin</span>
                              </Link>
                            </>
                          )}
                        </div>

                        <div className="p-2 border-t border-border/50">
                          <button 
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-xl transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                              <LogOut className="w-4 h-4 text-destructive" />
                            </div>
                            <span className="font-medium">Déconnexion</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!authLoading && !isAuthenticated && (
                  <div className="flex items-center gap-2">
                    <Link href={`${ROUTES.AUTH.LOGIN}?from=${encodeURIComponent(pathname || '/')}`}>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <User className="w-4 h-4" />
                        <span className="hidden xl:inline">Connexion</span>
                      </Button>
                    </Link>
                    <Link href={ROUTES.AUTH.REGISTER}>
                      <Button 
                        variant="primary" 
                        size="sm"
                        className="bg-gradient-to-r from-accent to-purple-500 hover:from-accent/90 hover:to-purple-500/90 shadow-lg shadow-accent/20"
                      >
                        S'inscrire
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* ✅ BOUTON HAMBURGER MOBILE - VISIBLE TOUJOURS SUR MOBILE */}
              <button
                onClick={handleMobileToggle}
                className="flex lg:hidden items-center justify-center w-10 h-10 rounded-full hover:bg-muted/50 transition-colors relative z-[60]"
                aria-label="Menu mobile"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ✅ MENU MOBILE - EN DEHORS DU HEADER POUR ÉVITER LES CONFLITS */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] lg:hidden animate-in fade-in duration-200"
            aria-hidden="true"
          />

          {/* Menu drawer */}
          <div className="fixed right-0 top-0 bottom-0 w-[85%] max-w-sm bg-background border-l border-border z-[60] lg:hidden overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="p-6 pt-20">
              {/* Header du menu */}
              <div className="flex items-center justify-between mb-8 -mt-8">
                <div className="flex items-center gap-2">
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden shadow-md shadow-rose-900/20 ring-1 ring-black/5">
                    <Image
                      src="/logo.jpeg"
                      alt="Bokoma"
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </div>
                  <span
                    className="text-xl leading-none font-bold tracking-tight"
                    style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontStyle: 'italic' }}
                  >
                    <span className="bg-gradient-to-r from-rose-700 via-red-700 to-rose-900 bg-clip-text text-transparent">
                      Bokoma
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                  aria-label="Fermer le menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User info si connecté */}
              {isAuthenticated && user && (
                <div className="mb-6 p-4 bg-gradient-to-br from-accent/10 to-purple-500/5 rounded-2xl border border-border/50">
                  <div className="flex items-center gap-3">
                    <img 
                      src={getAvatarUrl(user, 48)} 
                      alt="Avatar"
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-accent/30"
                    />
                    <div>
                      <p className="font-semibold">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation principale */}
              <nav className="space-y-1 mb-6">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors font-medium"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Actions rapides */}
              <div className="space-y-1 mb-6 pt-6 border-t border-border/50">
                {/* ✅ Bouton thème dans le menu mobile, pour garder la parité desktop */}
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors"
                  aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
                >
                  {isDark ? (
                    <>
                      <Sun className="w-5 h-5" />
                      <span>Mode clair</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-5 h-5" />
                      <span>Mode sombre</span>
                    </>
                  )}
                </button>
                <Link
                  href="/search"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors"
                >
                  <Search className="w-5 h-5" />
                  <span>Rechercher</span>
                </Link>
                <Link 
                  href={ROUTES.CART} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5" />
                    <span>Panier</span>
                  </div>
                  <span className="bg-gradient-to-r from-accent to-purple-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                    {cartCount ?? 0}
                  </span>
                </Link>
                {isAuthenticated && (
                  <Link 
                    href="/wishlist" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Heart className="w-5 h-5" />
                      <span>Favoris</span>
                    </div>
                    {wishlistCount > 0 && (
                      <span className="bg-pink-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>
                )}
              </div>

              {/* Section authentification */}
              <div className="pt-6 border-t border-border/50">
                {authLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  </div>
                ) : isAuthenticated && user ? (
                  <div className="space-y-1">
                    {isStaff && (
                      <Link 
                        href={ROUTES.ADMIN.DASHBOARD} 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent/10 text-accent transition-colors font-medium"
                      >
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard Admin
                      </Link>
                    )}
                    <Link 
                      href={ROUTES.USER.PROFILE} 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors"
                    >
                      <User className="w-5 h-5" />
                      Mon Profil
                    </Link>
                    <Link 
                      href="/profile/settings" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors"
                    >
                      <Settings className="w-5 h-5" />
                      Paramètres
                    </Link>
                    <button 
                      onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      Déconnexion
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link 
                      href={`${ROUTES.AUTH.LOGIN}?from=${encodeURIComponent(pathname || '/')}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button variant="outline" className="w-full justify-center gap-2">
                        <User className="w-4 h-4" />
                        Connexion
                      </Button>
                    </Link>
                    <Link 
                      href={ROUTES.AUTH.REGISTER}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button 
                        variant="primary" 
                        className="w-full justify-center bg-gradient-to-r from-accent to-purple-500"
                      >
                        S'inscrire
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default Header;