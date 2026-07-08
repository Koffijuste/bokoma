// components/brand/TikTokIcon.tsx
// ============================================================================
// 🎵 Icône TikTok — SVG inline (lucide-react ne fournit pas cette icône en v0.292)
// Suit la même API que les icônes lucide (className, props → forwardRef compatible)
// ============================================================================

import React from 'react';

export interface TikTokIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const TikTokIcon: React.FC<TikTokIconProps> = ({
  size = 24,
  className,
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    className={className}
    {...props}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.18a8.16 8.16 0 0 0 4.77 1.52V6.34a4.85 4.85 0 0 1-1.84-.65z" />
  </svg>
);

export default TikTokIcon;