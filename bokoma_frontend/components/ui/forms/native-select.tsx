// components/ui/native-select.tsx
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────────────────
// 🔹 TYPES
// ──────────────────────────────────────────────────────────────────────────

export interface NativeSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: NativeSelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────
// 🔹 COMPOSANT
// ──────────────────────────────────────────────────────────────────────────

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      placeholder,
      fullWidth = true,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const id = React.useId();
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

    return (
      <div className={cn('space-y-2', fullWidth && 'w-full', className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'text-sm font-medium text-foreground',
              disabled && 'opacity-50 cursor-not-allowed',
              error && 'text-destructive'
            )}
          >
            {label}
          </label>
        )}

        {/* Select */}
        <select
          id={id}
          ref={ref}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          className={cn(
            // Base styles
            'w-full px-4 py-2.5 rounded-lg',
            'bg-background border-2 border-input',
            'text-foreground placeholder:text-muted-foreground',
            // Focus states
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-transparent',
            // Disabled state
            disabled && 'cursor-not-allowed opacity-50',
            // Error state
            error && 'border-destructive focus:ring-destructive',
            // Transition
            'transition-colors duration-200'
          )}
          {...props}
        >
          {/* Placeholder option */}
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          
          {/* Options */}
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              className={opt.disabled ? 'text-muted-foreground' : ''}
            >
              {opt.label}
            </option>
          ))}
        </select>

        {/* Hint or Error message */}
        <AnimatePresence mode="wait" initial={false}>
          {error ? (
            <motion.p
              key="error"
              id={`${id}-error`}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="text-xs text-destructive font-medium"
              role="alert"
            >
              {error}
            </motion.p>
          ) : hint ? (
            <motion.p
              key="hint"
              id={`${id}-hint`}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="text-xs text-muted-foreground"
            >
              {hint}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }
);

NativeSelect.displayName = 'NativeSelect';

export default NativeSelect;