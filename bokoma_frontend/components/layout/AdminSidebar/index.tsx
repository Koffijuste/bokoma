// components/layout/AdminSidebar/index.tsx
// ============================================================================
// 🗂️ ADMIN DRAWER — Menu latéral façon "sheet"
// ============================================================================
// Au lieu d'une sidebar permanente qui occupe de la place même fermée, on a
// un simple bouton dans le header qui ouvre/ferme un drawer (overlay + panneau
// qui slide depuis la gauche). Le contenu principal n'est plus jamais
// rétréci : toute la largeur reste disponible.
// ============================================================================

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Layers, Users, ShoppingCart,
  Ticket, MessageSquare, BarChart3, Settings,
  Image as ImageIcon, Send, X,
} from 'lucide-react';
import {
  Dialog, DialogPortal, DialogOverlay, DialogClose,
} from '@/components/ui/dialog';
import { cn } from '@/utils/helpers';
import { ROUTES } from '@/constants';

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

interface AdminSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminSidebar({ open, onOpenChange }: AdminSidebarProps) {
  const pathname = usePathname();

  // ✅ Auto-ferme le drawer quand l'utilisateur change de route
  useEffect(() => {
    if (open) onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        {/* Overlay sombre cliquable — ferme le drawer au clic */}
        <DialogOverlay
          onClick={() => onOpenChange(false)}
          className="z-40 bg-black/60 backdrop-blur-sm cursor-pointer data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />

        {/* Drawer latéral gauche */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-card border-r border-border shadow-2xl',
            'flex flex-col',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
            'data-[state=closed]:duration-300 data-[state=open]:duration-300',
            'data-[state=open]:ease-out data-[state=closed]:ease-in'
          )}
        >
          {/* Header du drawer */}
          <div className="flex items-center justify-between px-5 h-16 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative w-9 h-9 rounded-lg overflow-hidden shadow-md ring-1 ring-black/5 shrink-0">
                <Image
                  src="/logo.jpeg"
                  alt="Bokoma"
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Administration
                </p>
                <p className="font-bold text-sm">Bokoma Store</p>
              </div>
            </div>
            <DialogClose
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </DialogClose>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {adminNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname?.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block"
                  onClick={() => onOpenChange(false)}
                >
                  <div
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-accent text-accent-foreground shadow-md'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground hover:translate-x-1'
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                </Link>
              );
            })}

            <div className="border-t border-border my-3" />

            <Link
              href={ROUTES?.ADMIN?.SETTINGS || '/dashboard/settings'}
              className="block"
              onClick={() => onOpenChange(false)}
            >
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1">
                <Settings className="w-5 h-5 shrink-0" />
                <span className="font-medium text-sm">Paramètres</span>
              </div>
            </Link>
          </nav>

          {/* Footer du drawer (légère) */}
          <div className="px-5 py-3 border-t border-border text-[11px] text-muted-foreground text-center shrink-0">
            Bokoma Store · Admin
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}