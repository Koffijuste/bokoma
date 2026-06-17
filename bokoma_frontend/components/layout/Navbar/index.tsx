// components/layout/Navbar.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShoppingCart, User, Heart, Menu, X, LogOut, Package,
  LayoutDashboard, Bell, ChevronDown, Sparkles, Settings
} from 'lucide-react';

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
  { label: 'Produits', href: ROUTES.PRODUCTS },
  { label: 'Catégories', href: `${ROUTES.PRODUCTS}#categories` },
];

// ============================================================================
// 🔹 HELPERS
// ============================================================================

const getAvatarUrl = (user: any, size: number = 32): string => {
  if (user?.avatar) return user.avatar;
  const name = `${user?.firstName || ''}${user?.lastName || ''}`.trim() || 'U';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=a855f7&color=fff&size=${size}`;
};

// ============================================================================
// 🔹 COMPOSANT PRINCIPAL
// ============================================================================

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useMounted();
  
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { wishlist } = useWishlist();
  const { cartCount } = useCartStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

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

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // ============================================================================
  // 🔹 RENDER
  // ============================================================================

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm'
          : 'bg-background/80 backdrop-blur-sm'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link 
            href={isAdminPath ? ROUTES.ADMIN.DASHBOARD : ROUTES.HOME} 
            className="flex items-center gap-2 group"
            onClick={closeMobileMenu}
          >
            {isAdminPath ? (
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-accent" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent group-hover:rotate-12 transition-transform" />
              </div>
            )}
            <span className="hidden sm:block font-bold text-lg gradient-text">
              {isAdminPath ? 'Bokoma Admin' : 'Bokoma'}
            </span>
          </Link>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="w-full bg-card/50 backdrop-blur border border-border rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition cursor-pointer"
                onFocus={() => router.push('/search')}
                readOnly
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            
            {NAV_LINKS.map((link) => (
              <Link 
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
                    ? 'text-accent'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}

            {/* Icons */}
            <div className="flex items-center gap-1">
              {isAuthenticated && isStaff && (
                <Link 
                  href={ROUTES.ADMIN.DASHBOARD} 
                  className="p-2 rounded-lg hover:bg-card transition-colors text-accent" 
                  title="Dashboard"
                >
                  <LayoutDashboard className="w-5 h-5" />
                </Link>
              )}

              <button className="relative p-2 rounded-lg hover:bg-card transition-colors" aria-label="Notifications">
                <Bell className="w-5 h-5" />
              </button>

              {isAuthenticated && (
                <Link 
                  href="/wishlist" 
                  className="relative p-2 rounded-lg hover:bg-card transition-colors"
                  aria-label="Favoris"
                >
                  <Heart className="w-5 h-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              <Link 
                href={ROUTES.CART} 
                className="relative p-2 rounded-lg hover:bg-card transition-colors"
                aria-label="Panier"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  { (cartCount ?? 0) > 99 ? '99+' : (cartCount ?? 0) }
                </span>
              </Link>
            </div>

            {/* Auth Section */}
            <div className="flex items-center gap-2 ml-2" data-user-menu>
              {authLoading && (
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              )}
              
              {!authLoading && isAuthenticated && user && (
                <div className="relative" data-user-menu>
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-card transition-colors"
                    aria-label="Menu utilisateur"
                  >
                    <img 
                      src={getAvatarUrl(user, 32)} 
                      alt="Avatar" 
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent hover:ring-accent transition"
                      onError={(e) => { 
                        (e.target as HTMLImageElement).src = getAvatarUrl(null, 32);
                      }}
                    />
                    <ChevronDown className={cn("w-4 h-4 transition-transform", isUserMenuOpen && "rotate-180")} />
                  </button>
                  
                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: 10 }} 
                        className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
                        data-user-menu
                      >
                        <div className="p-3 border-b border-border">
                          <p className="font-semibold truncate">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <div className="py-1">
                          <Link href={ROUTES.USER.PROFILE} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted" onClick={() => setIsUserMenuOpen(false)}>
                            <User className="w-4 h-4" /> Mon Profil
                          </Link>
                          <Link href="/profile?tab=orders" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted" onClick={() => setIsUserMenuOpen(false)}>
                            <Package className="w-4 h-4" /> Mes Commandes
                          </Link>
                          <Link href="/wishlist" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted" onClick={() => setIsUserMenuOpen(false)}>
                            <Heart className="w-4 h-4" /> Favoris
                            {wishlistCount > 0 && (
                              <span className="ml-auto text-xs bg-pink-500/10 text-pink-600 px-1.5 py-0.5 rounded-full">{wishlistCount}</span>
                            )}
                          </Link>
                          <Link href="/profile/settings" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted" onClick={() => setIsUserMenuOpen(false)}>
                            <Settings className="w-4 h-4" /> Paramètres
                          </Link>
                          {isStaff && (
                            <>
                              <hr className="border-border my-1" />
                              <Link href={ROUTES.ADMIN.DASHBOARD} className="flex items-center gap-2 px-4 py-2 text-sm text-accent hover:bg-muted" onClick={() => setIsUserMenuOpen(false)}>
                                <LayoutDashboard className="w-4 h-4" /> Dashboard Admin
                              </Link>
                            </>
                          )}
                          <hr className="border-border my-1" />
                          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10">
                            <LogOut className="w-4 h-4" /> Déconnexion
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {!authLoading && !isAuthenticated && (
                <>
                  <Link href={`${ROUTES.AUTH.LOGIN}?from=${encodeURIComponent(pathname || '/')}`} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium hover:text-accent">
                    <User className="w-4 h-4" />
                    <span className="hidden lg:inline">Connexion</span>
                  </Link>
                  <Link href={ROUTES.AUTH.REGISTER} className="px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90">
                    S'inscrire
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-card"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu mobile"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            className="md:hidden border-t border-border bg-background/95 backdrop-blur overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  className="w-full bg-card border border-border rounded-lg pl-4 pr-10 py-2 text-sm"
                  readOnly
                  onFocus={() => { router.push('/search'); closeMobileMenu(); }}
                />
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>

              <div className="space-y-2">
                {NAV_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="block px-3 py-2 rounded-lg hover:bg-muted" onClick={closeMobileMenu}>
                    {link.label}
                  </Link>
                ))}
                <Link href={ROUTES.CART} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted" onClick={closeMobileMenu}>
                  <span>Panier</span>
                  <span className="bg-accent text-accent-foreground text-xs rounded-full px-2 py-0.5">{cartCount ?? 0}</span>
                </Link>
                {isAuthenticated && (
                  <Link href="/wishlist" className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted" onClick={closeMobileMenu}>
                    <span>Favoris</span>
                    {wishlistCount > 0 && <span className="bg-pink-500 text-white text-xs rounded-full px-2 py-0.5">{wishlistCount}</span>}
                  </Link>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                {authLoading ? (
                  <div className="flex justify-center py-2">
                    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : isAuthenticated && user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 px-3 py-2">
                      <img src={getAvatarUrl(user, 40)} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    {isStaff && (
                      <Link href={ROUTES.ADMIN.DASHBOARD} className="block px-3 py-2 text-accent hover:bg-muted rounded-lg" onClick={closeMobileMenu}>
                        <LayoutDashboard className="w-4 h-4 inline mr-2" /> Dashboard Admin
                      </Link>
                    )}
                    <Link href={ROUTES.USER.PROFILE} className="block px-3 py-2 hover:bg-muted rounded-lg" onClick={closeMobileMenu}>
                      <User className="w-4 h-4 inline mr-2" /> Mon Profil
                    </Link>
                    <Link href="/profile/settings" className="block px-3 py-2 hover:bg-muted rounded-lg" onClick={closeMobileMenu}>
                      <Settings className="w-4 h-4 inline mr-2" /> Paramètres
                    </Link>
                    <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg">
                      <LogOut className="w-4 h-4 inline mr-2" /> Déconnexion
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link href={`${ROUTES.AUTH.LOGIN}?from=${encodeURIComponent(pathname || '/')}`} className="block text-center px-4 py-2 rounded-lg border border-border hover:bg-muted" onClick={closeMobileMenu}>
                      <User className="w-4 h-4 inline mr-2" /> Connexion
                    </Link>
                    <Link href={ROUTES.AUTH.REGISTER} className="block text-center px-4 py-2 rounded-lg bg-accent text-accent-foreground" onClick={closeMobileMenu}>
                      S'inscrire
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

export default Navbar;