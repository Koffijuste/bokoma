// components/brand/BrandLogo.tsx
// ============================================================================
// 🅱️  BRAND LOGO — Source unique de vérité pour le logo + nom de marque
// ============================================================================
// Utilisé dans Header, Footer, Navbar, page Login, drawer mobile, etc.
// Toute modification du logo se fait ICI pour garder la cohérence visuelle
// (cf. fix : alignement Footer sur le rendu Header).
// ============================================================================

import React from 'react';
import Image from 'next/image';
import { cn } from '@/utils/helpers';

export type BrandLogoSize = 'sm' | 'md' | 'lg';
export type BrandLogoVariant = 'auto' | 'rose' | 'accent';
export type BrandLogoLayout = 'horizontal' | 'compact';

interface BrandLogoProps {
  /**
   * Taille du logo. `md` (44px) est la valeur par défaut et correspond
   * au header desktop. `sm` (36px) est utilisé pour les contextes
   * exigüs (drawer mobile, login). `lg` (56px) pour les pieds de page
   * ou les hero sections.
   */
  size?: BrandLogoSize;

  /**
   * Variante du dégradé sur le nom.
   *  - `auto`  : rose-rouge (référence header, lisible sur tous fonds)
   *  - `rose`  : force rose-rouge
   *  - `accent`: force accent → purple (ancien style footer)
   */
  variant?: BrandLogoVariant;

  /**
   * `horizontal` (défaut) : logo + nom + sous-titre alignés
   * `compact`            : logo + nom uniquement, sans sous-titre
   */
  layout?: BrandLogoLayout;

  /**
   * Afficher le sous-titre "Premium Store" sous le nom.
   * Auto : affiché uniquement en layout `horizontal` à partir de `sm`.
   */
  showSubtitle?: boolean;

  /**
   * Image src pour le logo. Par défaut `/logo.jpeg` (fourni dans /public).
   */
  src?: string;

  /**
   * Classes additionnelles pour le container racine.
   */
  className?: string;

  /**
   * Classes additionnelles pour le container du logo (carré arrondi).
   */
  imageClassName?: string;

  /**
   * Priorité de chargement Next/Image (header uniquement).
   */
  priority?: boolean;

  /**
   * Alt text personnalisé.
   */
  alt?: string;

  /**
   * Nom de marque à afficher. Par défaut "Bokoma".
   * Utile pour les variantes (ex. "Bokoma Admin" dans la navbar admin).
   */
  name?: string;
}

const SIZE_MAP: Record<
  BrandLogoSize,
  { box: string; imgSizes: string; name: string; sub: string }
> = {
  sm: {
    box: 'w-9 h-9',
    imgSizes: '36px',
    name: 'text-xl',
    sub: 'text-[8px]',
  },
  md: {
    box: 'w-10 h-10 lg:w-11 lg:h-11',
    imgSizes: '44px',
    name: 'text-2xl lg:text-[1.75rem]',
    sub: 'text-[9px]',
  },
  lg: {
    box: 'w-12 h-12 lg:w-14 lg:h-14',
    imgSizes: '56px',
    name: 'text-3xl lg:text-4xl',
    sub: 'text-[10px]',
  },
};

export function BrandLogo({
  size = 'md',
  variant = 'auto',
  layout = 'horizontal',
  showSubtitle,
  src = '/logo.jpeg',
  className,
  imageClassName,
  priority = false,
  alt = 'Bokoma',
  name = 'Bokoma',
}: BrandLogoProps) {
  const s = SIZE_MAP[size];

  // Résolution du variant : `auto` retombe sur `rose` (référence header)
  const effectiveVariant: 'rose' | 'accent' =
    variant === 'auto' ? 'rose' : variant;

  const nameGradient =
    effectiveVariant === 'rose'
      ? 'bg-gradient-to-r from-rose-700 via-red-700 to-rose-900'
      : 'bg-gradient-to-r from-accent to-purple-500';

  // Sous-titre : auto = affiché en horizontal à partir de sm
  const shouldShowSubtitle =
    showSubtitle ?? (layout === 'horizontal');

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'relative rounded-xl overflow-hidden shadow-lg ring-1 ring-black/5 transition-all duration-300',
          'shadow-rose-900/20 group-hover:shadow-rose-900/40 group-hover:scale-105',
          s.box,
          imageClassName
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={s.imgSizes}
          priority={priority}
          className="object-cover"
        />
      </div>
      <div className="flex flex-col">
        <span
          className={cn(
            'leading-none font-bold tracking-tight',
            s.name
          )}
          style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontStyle: 'italic',
          }}
        >
          <span className={cn('bg-clip-text text-transparent', nameGradient)}>
            {name}
          </span>
        </span>
        {shouldShowSubtitle && (
          <span
            className={cn(
              'text-muted-foreground font-medium tracking-[0.25em] uppercase -mt-0.5 hidden sm:block',
              s.sub
            )}
          >
            Premium Store
          </span>
        )}
      </div>
    </div>
  );
}

export default BrandLogo;
