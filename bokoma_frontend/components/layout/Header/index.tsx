// components/layout/Header.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import {
  Search, ShoppingBag, User, Heart, Menu, X, LogOut, Package,
  LayoutDashboard, Bell, ChevronDown, Sparkles, Settings, Crown
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import { useWishlist } from '@/hooks/useWishlist';
import { useCartStore } from '@/store';
import { ROUTES } from '@/constants';
import { cn } from '@/utils/helpers';
import { toast } from 'sonner';

// ============================================================================
// 🔹 CONSTANTS
// ============================================================================

const NAV_LINKS = [
  { label: 'Accueil', href: '/' },
  { label: 'Boutique', href: ROUTES.PRODUCTS },
  { label: 'Nouveautés', href: `${ROUTES.PRODUCTS}?sort=-createdAt` },
  { label: 'Promotions', href: `${ROUTES.PRODUCTS}?sort=promotions` },
];

// ============================================================================
// 🔹 HELPERS
// ============================================================================

const getAvatarUrl = (user: any, size: number = 40): string => {
  if (user?.avatar) return user.avatar;
  const name = `${user?.firstName || ''}${user?.lastName || ''}`.trim() || 'U';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=a855f7&color=fff&size=${size}&bold=true`;
};

// ============================================================================
// 🔹 COMPOSANT PRINCIPAL
// ============================================================================

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useMounted();
  const { scrollY } = useScroll();

  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { wishlist } = useWishlist();
  const { cartCount } = useCartStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  // ============================================================================
  // 🔹 COMPUTED VALUES
  // ============================================================================

  const isAdminPath = useMemo(() => {
    return pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin');
  }, [pathname]);

  const isStaff = useMemo(() => {
    return user?.role === 'admin' || user?.role === 'manager';
  }, [user?.role]);

  const wishlistCount = wishlist.length;

  // ============================================================================
  // 🔹 EFFECTS
  // ============================================================================

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = lastScrollY;
    
    if (latest > 100) {
      setIsScrolled(true);
      if (latest > previous && latest > 200) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
    } else {
      setIsScrolled(false);
      setIsHidden(false);
    }
    
    setLastScrollY(latest);
  });

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

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

  // ============================================================================
  // 🔹 HANDLERS
  // ============================================================================

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

  // ============================================================================
  // 🔹 SSR FALLBACK
  // ============================================================================

  if (!mounted) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 h-16 lg:h-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
              Bokoma
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex gap-2">
              <div className="w-20 h-8 bg-muted/30 rounded-full animate-pulse" />
              <div className="w-20 h-8 bg-muted/30 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ============================================================================
  // 🔹 RENDER
  // ============================================================================

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: isHidden ? -100 : 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        isScrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/5'
          : 'bg-gradient-to-b from-background/60 to-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          
          {/* ========== LOGO ========== */}
          <Link 
            href={isAdminPath ? ROUTES.ADMIN.DASHBOARD : ROUTES.HOME} 
            className="flex items-center gap-3 group"
          >
            <motion.div 
              whileHover={{ rotate: 12, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="relative"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-accent/30 group-hover:shadow-accent/50 transition-shadow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent via-purple-500 to-pink-500 blur-lg opacity-0 group-hover:opacity-50 transition-opacity -z-10" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-accent via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-tight">
                Bokoma
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase -mt-1 hidden sm:block">
                Premium Store
              </span>
            </div>
          </Link>

          {/* ========== DESKTOP NAVIGATION ========== */}
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
                      ? 'text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 bg-gradient-to-r from-accent to-purple-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ========== ACTIONS ========== */}
          <div className="flex items-center gap-1 sm:gap-2">
            
            {/* Search */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/search')}
              className="hidden sm:flex w-10 h-10 items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
              aria-label="Rechercher"
            >
              <Search className="w-5 h-5" />
            </motion.button>

            {/* Wishlist */}
            {isAuthenticated && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link 
                  href="/wishlist" 
                  className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                  aria-label="Favoris"
                >
                  <Heart className="w-5 h-5" />
                  {wishlistCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-br from-pink-500 to-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-lg shadow-pink-500/30 px-1"
                    >
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </motion.span>
                  )}
                </Link>
              </motion.div>
            )}

            {/* Cart */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                href={ROUTES.CART} 
                className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                aria-label="Panier"
              >
                <ShoppingBag className="w-5 h-5" />
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-br from-accent to-purple-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-lg shadow-accent/30 px-1"
                >
                  {(cartCount ?? 0) > 99 ? '99+' : (cartCount ?? 0)}
                </motion.span>
              </Link>
            </motion.div>

            {/* ========== AUTH SECTION ========== */}
            <div className="hidden sm:flex items-center ml-2" data-user-menu>
              {authLoading && (
                <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              )}
              
              {!authLoading && isAuthenticated && user && (
                <div className="relative" data-user-menu>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
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
                  </motion.button>
                  
                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-3 w-64 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden z-50"
                        data-user-menu
                      >
                        {/* User Info */}
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

                        {/* Menu Items */}
                        <div className="p-2">
                          <Link 
                            href={ROUTES.USER.PROFILE} 
                            className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 rounded-xl transition-colors group"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                              <User className="w-4 h-4 text-accent" />
                            </div>
                            <span className="font-medium">Mon Profil</span>
                          </Link>
                          <Link 
                            href="/profile?tab=orders" 
                            className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 rounded-xl transition-colors group"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                              <Package className="w-4 h-4 text-blue-500" />
                            </div>
                            <span className="font-medium">Mes Commandes</span>
                          </Link>
                          <Link 
                            href="/wishlist" 
                            className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 rounded-xl transition-colors group"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
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
                          <Link 
                            href="/profile/settings" 
                            className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 rounded-xl transition-colors group"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                              <Settings className="w-4 h-4 text-purple-500" />
                            </div>
                            <span className="font-medium">Paramètres</span>
                          </Link>

                          {isStaff && (
                            <>
                              <div className="my-2 border-t border-border/50" />
                              <Link 
                                href={ROUTES.ADMIN.DASHBOARD} 
                                className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent/10 rounded-xl transition-colors group"
                                onClick={() => setIsUserMenuOpen(false)}
                              >
                                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                                  <LayoutDashboard className="w-4 h-4 text-accent" />
                                </div>
                                <span className="font-medium text-accent">Dashboard Admin</span>
                              </Link>
                            </>
                          )}
                        </div>

                        {/* Logout */}
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
                      </motion.div>
                    )}
                  </AnimatePresence>
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

            {/* Mobile Menu Toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu mobile"
              aria-expanded={isMobileMenuOpen}
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>

      {/* ========== MOBILE MENU ========== */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[85%] max-w-sm bg-background border-l border-border z-50 lg:hidden overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
                      Bokoma
                    </span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

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

                <div className="space-y-1 mb-6 pt-6 border-t border-border/50">
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

export default Header;