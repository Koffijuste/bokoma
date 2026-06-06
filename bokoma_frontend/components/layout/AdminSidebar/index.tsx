// components/layout/AdminSidebar.tsx - VERSION CORRIGÉE
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Layers,
  Users,
  ShoppingCart,
  Ticket,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useUiStore } from '@/store';
import { ROUTES } from '@/app/constants.old';
import { cn } from '@/utils/helpers';

// ✅ CORRECTION: Définition des items avec fallbacks pour les href undefined
const adminNavItems = [
  {
    label: 'Tableau de Bord',
    href: ROUTES?.ADMIN?.DASHBOARD || '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Produits',
    href: ROUTES?.ADMIN?.PRODUCTS || '/dashboard/products',
    icon: Package,
  },
  {
    label: 'Catégories',
    href: ROUTES?.ADMIN?.CATEGORIES || '/dashboard/categories',
    icon: Layers,
  },
  {
    label: 'Utilisateurs',
    href: ROUTES?.ADMIN?.USERS || '/dashboard/users',
    icon: Users,
  },
  {
    label: 'Commandes',
    href: ROUTES?.ADMIN?.ORDERS || '/dashboard/orders',
    icon: ShoppingCart,
  },
  {
    label: 'Coupons',
    href: ROUTES?.ADMIN?.COUPONS || '/dashboard/coupons',
    icon: Ticket,
  },
  {
    label: 'Avis',
    href: ROUTES?.ADMIN?.REVIEWS || '/dashboard/reviews',
    icon: MessageSquare,
  },
  {
    label: 'Statistiques',
    href: ROUTES?.ADMIN?.ANALYTICS || '/dashboard/analytics',
    icon: BarChart3,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUiStore();

  return (
    <motion.aside
      initial={{ width: sidebarOpen ? 256 : 80 }}
      animate={{ width: sidebarOpen ? 256 : 80 }}
      transition={{ duration: 0.3 }}
      className="fixed left-0 top-0 bottom-0 bg-card border-r border-border pt-16 hidden sm:block z-40"
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 p-1 rounded-full bg-card border border-border hover:bg-muted transition-colors"
        aria-label={sidebarOpen ? 'Réduire le menu' : 'Élargir le menu'}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Navigation */}
      <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-4rem)]">
        {/* ✅ Map avec key sur l'élément le plus externe (Link) */}
        {adminNavItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href} // ✅ KEY UNIQUE sur le parent direct retourné par .map()
              href={item.href}
              className="block"
            >
              <motion.div
                whileHover={{ x: 5 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
              </motion.div>
            </Link>
          );
        })}

        {/* Separator */}
        <div className="border-t border-border my-4" />

        {/* Settings - Hors du map, pas besoin de key */}
        <Link href={ROUTES?.ADMIN?.SETTINGS || '/dashboard/settings'} className="block">
          <motion.div
            whileHover={{ x: 5 }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium text-sm">Paramètres</span>}
          </motion.div>
        </Link>
      </nav>
    </motion.aside>
  );
}