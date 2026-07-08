// components/settings/DirtySaveBar.tsx
// ============================================================================
// 💾 BARRE FLOTTANTE "MODIFICATIONS NON SAUVEGARDÉES"
// ============================================================================
// Apparaît en bas de page dès qu'un formulaire est modifié.
// Hover state évite de disparaître si l'utilisateur survole avec la souris.
// ============================================================================

'use client';

import React from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DirtySaveBarProps {
  visible: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  message?: string;
}

export function DirtySaveBar({
  visible,
  saving = false,
  onSave,
  onDiscard,
  message = 'Vous avez des modifications non sauvegardées',
}: DirtySaveBarProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div className="flex items-center gap-3 bg-card border border-border shadow-lg rounded-full pl-4 pr-2 py-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
        <span className="text-sm font-medium hidden sm:inline">{message}</span>
        <span className="text-sm font-medium sm:hidden">Modifs non sauvées</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            disabled={saving}
            className="rounded-full"
          >
            <X className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Annuler</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={saving}
            className="rounded-full"
          >
            <Save className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}