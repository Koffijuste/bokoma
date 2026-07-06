// components/ui/logo-loader.tsx
// ============================================================================
// 🔄 LOGO LOADER — Logo Bokoma avec effet de rotation circulaire
// ============================================================================
// Le logo reste visible au centre, deux anneaux CSS tournent autour de lui
// en sens inverse. Effet premium, lisible, sans dépendance lourde.
// ============================================================================

'use client';

import React from 'react';
import { cn } from '@/utils/helpers';

export interface LogoLoaderProps {
  /** Taille globale en pixels (carré). Défaut : 96 */
  size?: number;
  /** Message optionnel sous le logo */
  message?: string;
  /** Mode plein écran (position fixed) */
  fullScreen?: boolean;
  /** Couleur des anneaux — défaut = cyan du thème (couleur Bokoma). */
  ringColor?: string;
  /** Affiche ou non la barre de progression */
  showProgress?: boolean;
  className?: string;
}

/**
 * Loader réutilisable qui combine :
 *  - 2 anneaux CSS (counter-rotating) — bordure dégradée
 *  - 1 anneau pulsant derrière le logo (animate-ping)
 *  - Le logo Bokoma au centre
 *  - Une mini-barre de progression qui slide (optionnel)
 */
export function LogoLoader({
  size = 96,
  message,
  fullScreen = false,
  ringColor = '#06b6d4', // accent Bokoma (cyan)
  showProgress = false,
  className,
}: LogoLoaderProps) {
  const wrapper = cn(
    'flex flex-col items-center justify-center gap-5',
    fullScreen && 'fixed inset-0 z-[60] bg-background/85 backdrop-blur-sm',
    !fullScreen && 'min-h-[300px]',
    className,
  );

  return (
    <div className={wrapper} role="status" aria-label="Chargement">
      {/* ── Anneau pulsant derrière le logo ─────────────────────── */}
      <div className="relative" style={{ width: size + 24, height: size + 24 }}>
        {/* Halo qui pulse */}
        <div
          className="absolute inset-2 rounded-full animate-ping opacity-30"
          style={{ backgroundColor: ringColor }}
          aria-hidden
        />

        {/* ── Anneau 1 (tourne dans le sens horaire) ──────────── */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            animationDuration: '1.6s',
            background: `conic-gradient(from 0deg, transparent 0deg, ${ringColor} 90deg, transparent 180deg)`,
            WebkitMask:
              'radial-gradient(circle, transparent 65%, black 66%)',
            mask: 'radial-gradient(circle, transparent 65%, black 66%)',
          }}
          aria-hidden
        />

        {/* ── Anneau 2 (sens anti-horaire, déphasé) ──────────── */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            animationDuration: '2.4s',
            animationDirection: 'reverse',
            background: `conic-gradient(from 180deg, transparent 0deg, #a855f7 60deg, transparent 220deg)`,
            WebkitMask:
              'radial-gradient(circle, transparent 78%, black 79%)',
            mask: 'radial-gradient(circle, transparent 78%, black 79%)',
          }}
          aria-hidden
        />

        {/* ── Logo au centre ──────────────────────────────────── */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ inset: 12 }}
        >
          <img
            src="/logo.jpeg"
            alt="Bokoma Store"
            width={size}
            height={size}
            className="rounded-full shadow-xl shadow-black/20 dark:shadow-black/60 animate-logo-breath"
            draggable={false}
          />
        </div>
      </div>

      {/* ── Message optionnel ──────────────────────────────────── */}
      {message && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {message}
        </p>
      )}

      {/* ── Barre de progression (optionnelle) ─────────────────── */}
      {showProgress && (
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full w-1/3 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${ringColor}, transparent)`,
              animation: 'logo-progress 1.4s ease-in-out infinite',
            }}
          />
        </div>
      )}

      {/* ── CSS keyframes (component-scoped) ───────────────────── */}
      <style jsx>{`
        @keyframes logo-progress {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes logo-breath {
          0%, 100% { transform: scale(1);    }
          50%      { transform: scale(1.05); }
        }
        :global(.animate-logo-breath) {
          animation: logo-breath 2s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>
    </div>
  );
}

export default LogoLoader;
