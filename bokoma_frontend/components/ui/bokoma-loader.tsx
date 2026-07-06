// components/ui/bokoma-loader.tsx
// ============================================================================
// 🔴 BOKOMA LOADER — Loader circulaire premium, brandé Bokoma
// ============================================================================
// Composition (du centre vers l'extérieur) :
//   1. Logo Bokoma (/logo.jpeg), parfaitement rond, respiration douce
//   2. Halo rouge pulsant qui irradie autour du logo
//   3. Anneau intérieur fin — rouge vif, rotation horaire lente
//   4. Anneau intermédiaire — rouge profond, rotation anti-horaire rapide
//   5. Anneau extérieur — rouge/bordeaux, rotation horaire très lente
//   6. Wordmark "BOKOMA" (optionnel)
//   7. Trois points qui rebondissent (optionnel)
//   8. Message personnalisé (optionnel)
// Aucun asset supplémentaire nécessaire — tout est en CSS + le logo existant.
// ============================================================================

'use client';

import React from 'react';
import { cn } from '@/utils/helpers';

export interface BokomaLoaderProps {
  /** Diamètre du logo au centre (en px). Défaut : 96 */
  size?: number;
  /** Message sous le logo (ex: "Chargement..."). */
  message?: string;
  /** Affiche le wordmark "BOKOMA". */
  showWordmark?: boolean;
  /** Affiche les trois points rebondissants. */
  showDots?: boolean;
  /** Mode plein écran (fixed + backdrop blur). */
  fullScreen?: boolean;
  /** Classes additionnelles. */
  className?: string;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Palette Bokoma (extrait du logo : #B51818 / #DC2626 / #7F1D1D / #FCA5A5)   */
/* ────────────────────────────────────────────────────────────────────────── */
const BOKOMA = {
  red:        '#DC2626', // rouge vif (anneau intérieur)
  deep:       '#B51818', // rouge profond (logo du fichier)
  crimson:    '#7F1D1D', // bordeaux (anneau extérieur)
  soft:       '#FCA5A5', // rouge clair (reflets)
  glow:       'rgba(220, 38, 38, 0.35)',
} as const;

export function BokomaLoader({
  size = 96,
  message,
  showWordmark = true,
  showDots = true,
  fullScreen = false,
  className,
}: BokomaLoaderProps) {
  /* Diamètre global du disque : logo + marges pour les anneaux + halo */
  const containerSize = size + 80;

  const wrapper = cn(
    'flex flex-col items-center justify-center gap-6 select-none',
    fullScreen && 'fixed inset-0 z-[60] bg-background/85 backdrop-blur-sm',
    !fullScreen && 'min-h-[340px] py-8',
    className,
  );

  return (
    <div
      className={wrapper}
      role="status"
      aria-live="polite"
      aria-label={message || 'Chargement Bokoma'}
    >
      {/* ── Cadre circulaire (anneaux + halo + logo) ─────────────── */}
      <div
        className="relative"
        style={{ width: containerSize, height: containerSize }}
      >
        {/* Halo rouge doux, flou, qui pulse */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-70 animate-pulse"
          style={{ backgroundColor: BOKOMA.glow }}
          aria-hidden
        />

        {/* Anneau extérieur — bordeaux, rotation lente */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            animationDuration: '4.5s',
            background: `conic-gradient(from 0deg, transparent 0deg, ${BOKOMA.crimson} 35deg, transparent 200deg, ${BOKOMA.deep} 320deg, transparent 360deg)`,
            WebkitMask:
              'radial-gradient(circle, transparent 70%, black 70.5%, black 71.5%, transparent 72%)',
            mask:
              'radial-gradient(circle, transparent 70%, black 70.5%, black 71.5%, transparent 72%)',
          }}
          aria-hidden
        />

        {/* Anneau intermédiaire — rouge profond, rotation anti-horaire rapide */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            animationDuration: '2.2s',
            animationDirection: 'reverse',
            background: `conic-gradient(from 180deg, transparent 0deg, ${BOKOMA.deep} 50deg, transparent 160deg, ${BOKOMA.red} 280deg, transparent 340deg)`,
            WebkitMask:
              'radial-gradient(circle, transparent 79%, black 79.5%, black 80.5%, transparent 81%)',
            mask:
              'radial-gradient(circle, transparent 79%, black 79.5%, black 80.5%, transparent 81%)',
          }}
          aria-hidden
        />

        {/* Anneau intérieur — rouge vif, rotation horaire */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            animationDuration: '1.4s',
            background: `conic-gradient(from 90deg, transparent 0deg, ${BOKOMA.red} 30deg, ${BOKOMA.soft} 90deg, transparent 180deg)`,
            WebkitMask:
              'radial-gradient(circle, transparent 86%, black 86.5%, black 88.5%, transparent 89%)',
            mask:
              'radial-gradient(circle, transparent 86%, black 86.5%, black 88.5%, transparent 89%)',
          }}
          aria-hidden
        />

        {/* Disque blanc qui accueille le logo — isole le logo du halo */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ inset: 26 }}
        >
          <div
            className="relative rounded-full bg-white shadow-[0_8px_30px_rgba(220,38,38,0.35)] ring-1 ring-black/5 animate-logo-breath overflow-hidden"
            style={{ width: size, height: size }}
          >
            <img
              src="/logo.jpeg"
              alt="Bokoma"
              width={size}
              height={size}
              className="block w-full h-full object-cover rounded-full"
              draggable={false}
              /* Petit fallback si jamais le jpeg met du temps à charger */
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Wordmark BOKOMA (lettres espacées, premium) ─────────── */}
      {showWordmark && (
        <h2
          className="font-black tracking-[0.55em] text-2xl md:text-3xl animate-logo-fade-in"
          style={{
            color: BOKOMA.red,
            textShadow: '0 2px 12px rgba(220,38,38,0.18)',
          }}
        >
          BOKOMA
        </h2>
      )}

      {/* ── Message personnalisé ────────────────────────────────── */}
      {message && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {message}
        </p>
      )}

      {/* ── Trois points rebondissants ──────────────────────────── */}
      {showDots && (
        <div
          className="flex items-center gap-2"
          aria-hidden
        >
          <span
            className="h-2.5 w-2.5 rounded-full animate-bounce"
            style={{
              backgroundColor: BOKOMA.red,
              animationDelay: '0ms',
            }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full animate-bounce"
            style={{
              backgroundColor: BOKOMA.red,
              animationDelay: '150ms',
            }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full animate-bounce"
            style={{
              backgroundColor: BOKOMA.red,
              animationDelay: '300ms',
            }}
          />
        </div>
      )}

      {/* ── Keyframes scopés au composant ───────────────────────── */}
      <style jsx>{`
        @keyframes logo-breath {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 8px 30px rgba(220, 38, 38, 0.35);
          }
          50% {
            transform: scale(1.04);
            box-shadow: 0 12px 40px rgba(220, 38, 38, 0.5);
          }
        }
        @keyframes logo-fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        :global(.animate-logo-breath) {
          animation: logo-breath 2.4s ease-in-out infinite;
          transform-origin: center;
        }
        :global(.animate-logo-fade-in) {
          animation: logo-fade-in 0.6s ease-out 0.15s both;
        }
      `}</style>
    </div>
  );
}

export default BokomaLoader;