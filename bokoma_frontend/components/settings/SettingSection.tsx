// components/settings/SettingSection.tsx
// ============================================================================
// 🧱 CARTE DE SECTION RÉUTILISABLE POUR LA PAGE PARAMÈTRES
// ============================================================================
// Encapsule : titre + icône + description optionnelle + contenu + footer.
// Toutes les sections (Profil, Sécurité, Notifications, Apparence)
// partagent le même look.
// ============================================================================

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SettingSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Footer aligné à droite (typiquement un bouton Sauvegarder) */
  footer?: React.ReactNode;
  /** Marqueur visuel si le formulaire de la section a des modifs non sauvées */
  isDirty?: boolean;
  className?: string;
  /** Délai d'animation d'entrée (ms) */
  delay?: number;
}

export function SettingSection({
  title,
  description,
  icon,
  children,
  footer,
  isDirty = false,
  className,
  delay = 0,
}: SettingSectionProps) {
  return (
    <section
      className={cn(
        'bg-card border border-border rounded-xl p-6',
        'animate-in fade-in slide-in-from-bottom-4 duration-500',
        'relative',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Indicateur "modifications non sauvegardées" */}
      {isDirty && (
        <span
          className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium border border-amber-500/20 animate-in fade-in duration-200"
          aria-label="Modifications non sauvegardées"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Non sauvegardé
        </span>
      )}

      <header className="mb-5">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </header>

      <div className="space-y-4">{children}</div>

      {footer && (
        <div className="flex justify-end pt-5 mt-5 border-t border-border/60">
          {footer}
        </div>
      )}
    </section>
  );
}