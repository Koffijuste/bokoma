// components/admin/admin-shell.tsx
// ============================================================================
// ✨ ADMIN SHELL — Composants premium partagés pour les pages dashboard
// ============================================================================
// ZERO runtime animation : CSS natif (keyframes + nth-child stagger) au lieu
// de framer-motion. Perfs GPU, pas de bundle JS supplémentaire, hydratation
// instantanée. Cible : /dashboard/reviews, /dashboard/feedbacks, /dashboard/gallery.
// ============================================================================

import * as React from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/helpers';

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Helpers d'animation — remplacent les variants framer-motion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props acceptées par les helpers : on garde l'API Variants pour ne pas casser
 * les imports existants, mais on consomme uniquement les timings les plus
 * courants. Tout est délégué à des classes CSS dans `globals.css`.
 */
export interface VariantsLite {
  hidden?: { opacity?: number; y?: number; scale?: number };
  show?: {
    opacity?: number;
    y?: number;
    scale?: number;
    duration?: number;
    ease?: number[] | string | number;
  };
  exit?: { opacity?: number; y?: number; scale?: number };
}

/** Variants conservés pour rétrocompatibilité des imports — purement nominaux. */
export const fadeUp: VariantsLite = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, duration: 0.28, ease: [0.22, 1, 0.36, 1] },
};

export const stagger = (_delay = 0.04): VariantsLite => ({
  hidden: { opacity: 0 },
  show: { opacity: 1 },
});

export const scaleIn: VariantsLite = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, duration: 0.22 },
  exit: { opacity: 0, scale: 0.96 },
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 PageHeader — en-tête premium avec underline dégradé
// ─────────────────────────────────────────────────────────────────────────────

interface AdminHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function AdminHeader({ title, description, icon, actions }: AdminHeaderProps) {
  return (
    <header className="relative mb-6 sm:mb-8 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="flex w-11 h-11 rounded-2xl bg-gradient-to-br from-accent to-purple-500 items-center justify-center shrink-0 shadow-lg shadow-accent/20">
              <span className="text-white [&_svg]:w-5 [&_svg]:h-5">{icon}</span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
      {/* Underline dégradé */}
      <div className="mt-4 h-px bg-gradient-to-r from-accent/40 via-purple-500/30 to-transparent" />
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 StatCard — tuile premium avec glow au hover
// ─────────────────────────────────────────────────────────────────────────────

interface AdminStat {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  accent?: 'default' | 'amber' | 'green' | 'red' | 'blue' | 'accent';
  suffix?: React.ReactNode;
}

const ACCENTS: Record<NonNullable<AdminStat['accent']>, string> = {
  default: 'from-slate-500/10 to-slate-500/0 ring-slate-500/20',
  amber:   'from-amber-500/15 to-amber-500/0 ring-amber-500/30',
  green:   'from-emerald-500/15 to-emerald-500/0 ring-emerald-500/30',
  red:     'from-rose-500/15 to-rose-500/0 ring-rose-500/30',
  blue:    'from-blue-500/15 to-blue-500/0 ring-blue-500/30',
  accent:  'from-accent/20 to-purple-500/0 ring-accent/30',
};

const ACCENT_TEXT: Record<NonNullable<AdminStat['accent']>, string> = {
  default: 'text-foreground',
  amber:   'text-amber-600 dark:text-amber-400',
  green:   'text-emerald-600 dark:text-emerald-400',
  red:     'text-rose-600 dark:text-rose-400',
  blue:    'text-blue-600 dark:text-blue-400',
  accent:  'text-accent',
};

export function AdminStats({ stats }: { stats: AdminStat[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 stagger-children">
      {stats.map((s) => {
        const accent = s.accent ?? 'default';
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className={cn(
              'group relative overflow-hidden rounded-2xl border border-border bg-card p-4',
              'ring-1 ring-transparent hover:ring-current hover-lift-strong',
              'hover:shadow-lg hover:shadow-black/5',
              'transition-shadow duration-200',
            )}
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60', ACCENTS[accent])} />
            <div className="relative flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {s.label}
              </p>
              <Icon className="w-4 h-4 text-muted-foreground/60 transition-transform duration-200 group-hover:scale-110" />
            </div>
            <div className="relative flex items-baseline gap-1.5">
              <p className={cn('text-2xl font-bold tabular-nums', ACCENT_TEXT[accent])}>
                {s.value}
              </p>
              {s.suffix}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 FilterBar — barre filtres avec recherche et chips
// ─────────────────────────────────────────────────────────────────────────────

interface AdminFiltersProps {
  search: React.ReactNode;
  chips?: Array<{
    key: string;
    label: string;
    count?: number;
    active?: boolean;
    onClick: () => void;
    accent?: 'amber' | 'green' | 'red' | 'accent';
  }>;
  extras?: React.ReactNode;
}

const CHIP_ACTIVE: Record<NonNullable<NonNullable<AdminFiltersProps['chips']>[number]['accent']>, string> = {
  amber:  'bg-amber-500 text-white shadow-md shadow-amber-500/25',
  green:  'bg-emerald-500 text-white shadow-md shadow-emerald-500/25',
  red:    'bg-rose-500 text-white shadow-md shadow-rose-500/25',
  accent: 'bg-gradient-to-r from-accent to-purple-500 text-white shadow-md shadow-accent/25',
};

export function AdminFilters({ search, chips, extras }: AdminFiltersProps) {
  return (
    <div className="mb-6 p-3 sm:p-4 rounded-2xl border border-border bg-card/80 backdrop-blur-sm animate-fade-up">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1 min-w-0">{search}</div>
        {chips && chips.length > 0 && (
          <div className="flex gap-1 bg-muted/40 rounded-full p-1 overflow-x-auto shrink-0">
            {chips.map((c) => {
              const accent = c.accent ?? 'accent';
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={c.onClick}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap',
                    'flex items-center gap-1.5',
                    c.active
                      ? CHIP_ACTIVE[accent]
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
                  )}
                >
                  {c.label}
                  {typeof c.count === 'number' && c.count > 0 && (
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
                        c.active ? 'bg-white/20' : 'bg-background/80',
                      )}
                    >
                      {c.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {extras && <div className="flex items-center gap-2 flex-wrap">{extras}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 StaggerList — wrapper de liste avec animation CSS pure (nth-child stagger)
// ─────────────────────────────────────────────────────────────────────────────

interface StaggerListProps<T> {
  items: T[];
  getKey: (item: T, idx: number) => string;
  render: (item: T, idx: number) => React.ReactNode;
  emptyState?: React.ReactNode;
  loading?: boolean;
  loadingCount?: number;
  loadingSkeleton?: React.ReactNode;
  className?: string;
}

export function StaggerList<T>({
  items,
  getKey,
  render,
  emptyState,
  loading,
  loadingCount = 4,
  loadingSkeleton,
  className,
}: StaggerListProps<T>) {
  if (loading) {
    return (
      <div className={cn('grid gap-3', className)}>
        {Array.from({ length: loadingCount }).map((_, i) =>
          loadingSkeleton ?? <DefaultSkeleton key={i} />,
        )}
      </div>
    );
  }

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  // La classe `stagger-children` (CSS) gère seule le délai via nth-child.
  // Pas de Framer, pas de mesure DOM, pas de ResizeObserver — juste du CSS.
  return (
    <div className={cn('grid gap-3 stagger-children', className)}>
      {items.map((item, idx) => (
        <div key={getKey(item, idx)}>{render(item, idx)}</div>
      ))}
    </div>
  );
}

function DefaultSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-3 bg-muted rounded w-1/3" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 EmptyState — état vide illustré
// ─────────────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-dashed border-border bg-card/40 animate-fade-up">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-muted-foreground/60" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 IconBadge — badge icône premium (catégories / statuts)
// ─────────────────────────────────────────────────────────────────────────────

interface IconBadgeProps {
  icon: LucideIcon;
  color?: 'blue' | 'orange' | 'yellow' | 'amber' | 'emerald' | 'rose' | 'purple' | 'slate';
  size?: 'sm' | 'md';
  className?: string;
}

const BADGE_COLORS: Record<NonNullable<IconBadgeProps['color']>, string> = {
  blue:    'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  orange:  'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  yellow:  'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  amber:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rose:    'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  purple:  'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  slate:   'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

const BADGE_SIZES = {
  sm: 'w-9 h-9 [&_svg]:w-4 [&_svg]:h-4',
  md: 'w-11 h-11 [&_svg]:w-5 [&_svg]:h-5',
} as const;

export function IconBadge({ icon: Icon, color = 'slate', size = 'md', className }: IconBadgeProps) {
  return (
    <div
      className={cn(
        'rounded-xl flex items-center justify-center shrink-0',
        BADGE_COLORS[color],
        BADGE_SIZES[size],
        className,
      )}
    >
      <Icon />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 StatusPill — pastille de statut
// ─────────────────────────────────────────────────────────────────────────────

interface StatusPillProps {
  variant: 'pending' | 'approved' | 'rejected' | 'archived' | 'draft' | 'published' | 'featured';
  className?: string;
}

const PILL: Record<StatusPillProps['variant'], { label: string; className: string; dot: string }> = {
  pending:   { label: 'En attente', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',   dot: 'bg-amber-500' },
  approved:  { label: 'Approuvé',   className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' },
  rejected:  { label: 'Rejeté',     className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',         dot: 'bg-rose-500' },
  archived:  { label: 'Archivé',    className: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30',     dot: 'bg-slate-500' },
  draft:     { label: 'Brouillon',  className: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30',     dot: 'bg-slate-500' },
  published: { label: 'Publié',     className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' },
  featured:  { label: 'À la une',   className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',     dot: 'bg-amber-500' },
};

export function StatusPill({ variant, className }: StatusPillProps) {
  const cfg = PILL[variant];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border',
        cfg.className,
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 ErrorBanner — bannière d'erreur premium
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="mb-6 p-4 rounded-2xl border border-destructive/30 bg-destructive/5 flex items-center gap-3 animate-slide-down-soft">
      <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 text-destructive font-bold">
        !
      </div>
      <p className="flex-1 text-sm text-destructive">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Spinner — petit loader inline
// ─────────────────────────────────────────────────────────────────────────────

export function InlineSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn('w-4 h-4 animate-spin', className)} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 PaginationBar — barre pagination premium
// ─────────────────────────────────────────────────────────────────────────────

interface PaginationBarProps {
  page: number;
  pages: number;
  total: number;
  suffix?: string;
  onPrev: () => void;
  onNext: () => void;
  disabled?: boolean;
}

export function PaginationBar({ page, pages, total, suffix = 'éléments', onPrev, onNext, disabled }: PaginationBarProps) {
  if (pages <= 1) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 px-1 animate-fade-up">
      <p className="text-xs text-muted-foreground">
        Page <span className="font-semibold text-foreground">{page}</span> / {pages} ·{' '}
        <span className="font-semibold text-foreground tabular-nums">{total}</span> {suffix}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page === 1 || disabled}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ← Précédent
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= pages || disabled}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}
