// components/settings/PasswordInput.tsx
// ============================================================================
// 🔐 INPUT MOT DE PASSE AVEC TOGGLE SHOW/HIDE
// ============================================================================
// Réutilisable : page Settings (3 champs), page Reset Password, etc.
// S'appuie sur l'Input existant pour garder le design system unifié.
// ============================================================================

'use client';

import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  /** Force l'affichage en clair (utile pour debug/dev) */
  defaultVisible?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, defaultVisible = false, className, ...props }, ref) => {
    const [visible, setVisible] = useState(defaultVisible);

    return (
      <Input
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        label={label}
        error={error}
        className={className}
        // ✅ Bouton show/hide à droite
        rightIcon={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';