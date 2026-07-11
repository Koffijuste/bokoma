// components/MediaProtection.tsx
// ============================================================================
// 🛡️ MEDIA PROTECTION — bloque le clic-droit sur <img> et <video>
// ============================================================================
// Pourquoi ce composant existe :
//   Le CSS global (globals.css) bloque déjà le drag-to-desktop et la
//   sélection sur img/video, mais on NE PEUT PAS bloquer le clic-droit
//   ("Enregistrer l'image sous…") uniquement avec du CSS. Il faut un
//   listener `contextmenu` côté JS, c'est ce que fait ce composant.
//
// Montage : <MediaProtection /> dans les pages qui exposent des médias
// protégés (/gallery, /products, /products/[slug]). Ne rien mettre dans
// la racine du layout : on veut que le clic-droit reste fonctionnel sur
// les autres pages (par ex. l'admin, les textareas, etc.).
// ============================================================================

'use client';

import { useEffect } from 'react';

export function MediaProtection() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // On bloque uniquement sur les <img> et <video> (et leurs ancêtres
      // directs). Pour ne pas casser les zones de texte autour.
      const tag = target.tagName;
      if (tag === 'IMG' || tag === 'VIDEO') {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'IMG' || tag === 'VIDEO') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return null;
}
