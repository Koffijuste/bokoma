// components/layout/AdminSidebar.tsx
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Layers, Users, ShoppingCart,
  Ticket, MessageSquare, BarChart3, Settings, ChevronLeft,
  ChevronRight, X, ImageIcon, Send,
} from 'lucide-react';
import { useUiStore } from '@/store';
import { ROUTES } from '@/constants';
import { cn } from '@/utils/helpers';

const adminNavItems = [
  { label: 'Tableau de Bord', href: ROUTES?.ADMIN?.DASHBOARD || '/dashboard', icon: LayoutDashboard },
  { label: 'Produits', href: ROUTES?.ADMIN?.PRODUCTS || '/dashboard/products', icon: Package },
  { label: 'Galerie', href: '/dashboard/gallery', icon: ImageIcon },
  { label: 'Catégories', href: ROUTES?.ADMIN?.CATEGORIES || '/dashboard/categories', icon: Layers },
  { label: 'Utilisateurs', href: ROUTES?.ADMIN?.USERS || '/dashboard/users', icon: Users },
  { label: 'Commandes', href: ROUTES?.ADMIN?.ORDERS || '/dashboard/orders', icon: ShoppingCart },
  { label: 'Coupons', href: ROUTES?.ADMIN?.COUPONS || '/dashboard/coupons', icon: Ticket },
  { label: 'Avis produits', href: ROUTES?.ADMIN?.REVIEWS || '/dashboard/reviews', icon: MessageSquare },
  { label: 'Feedbacks', href: '/dashboard/feedbacks', icon: Send },
  { label: 'Statistiques', href: ROUTES?.ADMIN?.ANALYTICS || '/dashboard/analytics', icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  // Fermer le sidebar quand on change de page (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  const handleToggle = () => {
    console.log('🖱️ [SIDEBAR] Toggle clicked, current:', sidebarOpen);
    setSidebarOpen(!sidebarOpen);
  };

  const handleClose = () => {
    console.log('🖱️ [SIDEBAR] Close clicked');
    setSidebarOpen(false);
  };

  return (
    <>
      {/* ✅ OVERLAY pour mobile */}
      {sidebarOpen && (
        <div
          onClick={handleClose}
          className="fixed inset-0 bg-black/50 z-30 sm:hidden animate-in fade-in duration-300"
          aria-hidden="true"
        />
      )}

      {/* ✅ SIDEBAR */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 bg-card border-r border-border z-40',
          'transition-all duration-300 ease-in-out',
          
          // Desktop : width variable selon état
          'sm:block sm:pt-16',
          sidebarOpen ? 'sm:w-64' : 'sm:w-20',
          
          // Mobile : drawer qui glisse
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'
        )}
        data-sidebar-open={sidebarOpen}
      >
        {/* Bouton toggle (desktop seulement) — volontairement bien visible :
            44×44 (WCAG 2.5.5), icône 20px et fond accent quand la sidebar
            est repliée pour qu'on le repère immédiatement. */}
        <button
          onClick={handleToggle}
          title={sidebarOpen ? 'Réduire le menu' : 'Ouvrir le menu de navigation'}
          aria-label={sidebarOpen ? 'Réduire le menu de navigation' : 'Ouvrir le menu de navigation'}
          className={cn(
            // Taille ≥ 44×44px (cible tactile conforme WCAG)
            'absolute top-20 -right-4 z-10 flex items-center justify-center',
            'w-11 h-11 rounded-full border-2 transition-all duration-200',
            // Visibilité : très proéminent quand la sidebar est repliée
            // (état par défaut, c'est là que l'utilisateur cherche le toggle) ;
            // discret quand la sidebar est dépliée (pour ne pas distraire).
            sidebarOpen
              ? 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted shadow-sm hover:shadow-md'
              : 'bg-accent border-accent text-accent-foreground shadow-lg shadow-accent/30 hover:scale-105 hover:shadow-xl',
            'active:scale-95',
            'hidden sm:flex' // visible uniquement sur desktop
          )}
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
          )}
        </button>

        {/* Bouton fermer (mobile seulement) — un peu plus grand pour être facilement cliquable au tactile */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-muted transition-colors sm:hidden"
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Navigation */}
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-4rem)]">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="block"
              >
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-accent text-accent-foreground shadow-md'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground hover:translate-x-1'
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  
                  {/* ✅ CORRECTION : Toujours rendre le span, masquer via CSS */}
                  {/* Sur desktop : masqué si sidebar fermé (sm:hidden) */}
                  {/* Sur mobile : toujours visible (pas de hidden) */}
                  <span 
                    className={cn(
                      'font-medium text-sm whitespace-nowrap',
                      !sidebarOpen && 'sm:hidden'
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}

          <div className="border-t border-border my-4" />

          <Link href={ROUTES?.ADMIN?.SETTINGS || '/dashboard/settings'} className="block">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1">
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span 
                className={cn(
                  'font-medium text-sm',
                  !sidebarOpen && 'sm:hidden'
                )}
              >
                Paramètres
              </span>
            </div>
          </Link>
        </nav>
      </aside>
    </>
  );
}