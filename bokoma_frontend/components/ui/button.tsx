// components/ui/button.tsx
'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/helpers';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-foreground hover:bg-accent/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border-2 border-border bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent/10 hover:text-accent',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 py-2 text-base',
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    // ✅ CORRECTION : <Slot> exige EXACTEMENT un enfant.
    // Si asChild=true, on ne peut pas injecter de Loader supplémentaire.
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={disabled || isLoading}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    // ✅ Pour un <button> classique, on peut ajouter le spinner sans problème
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';