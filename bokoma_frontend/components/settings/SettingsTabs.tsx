// components/settings/SettingsTabs.tsx
// ============================================================================
// 🧭 NAVIGATION ONGLETS POUR LA PAGE PARAMÈTRES
// ============================================================================
// Variante responsive :
//   - Desktop  → sidebar verticale à gauche des sections
//   - Mobile   → onglets horizontaux scrollables en haut
// ============================================================================

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SettingsTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Badge optionnel à droite du label (ex: "2 non lu") */
  badge?: string | number;
}

interface SettingsTabsProps {
  tabs: SettingsTab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function SettingsTabs({ tabs, activeTab, onChange }: SettingsTabsProps) {
  return (
    <>
      {/* ─── Mobile : scroll horizontal ───────────────────────────────── */}
      <nav
        className="md:hidden -mx-4 px-4 mb-6 overflow-x-auto"
        aria-label="Sections des paramètres"
      >
        <div className="flex gap-1.5 min-w-max border-b border-border">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap',
                  'border-b-2 transition-colors',
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="w-4 h-4">{tab.icon}</span>
                {tab.label}
                {tab.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-accent/10 text-accent">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ─── Desktop : sidebar verticale ──────────────────────────────── */}
      <aside className="hidden md:block w-56 flex-shrink-0">
        <nav
          className="sticky top-6 space-y-1"
          aria-label="Sections des paramètres"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                  'transition-all duration-150 text-left',
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={cn(
                  'w-4 h-4 flex-shrink-0 transition-transform',
                  isActive && 'scale-110'
                )}>
                  {tab.icon}
                </span>
                <span className="flex-1">{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-xs rounded-full bg-accent/10 text-accent">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}