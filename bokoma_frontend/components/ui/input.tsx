import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Texte d'aide sous le champ (différent de error : info non-bloquante) */
  helperText?: string;
  /** Icône à gauche (ex: search icon) */
  icon?: React.ReactNode;
  /** Icône/bouton à droite (ex: show/hide password) */
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, rightIcon, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && <label className="text-sm font-medium block">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-4 py-2.5 rounded-lg
              bg-background border-2 border-border
              focus:outline-none focus:border-accent
              transition-colors
              ${icon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error ? 'border-destructive' : ''}
              ${className || ''}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
