import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'destructive' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

const variants = {
  default: 'bg-muted text-foreground',
  primary: 'bg-blue-500/10 text-blue-500',
  secondary: 'bg-gray-500/10 text-gray-500',
  accent: 'bg-accent/10 text-accent',
  destructive: 'bg-destructive/10 text-destructive',
  outline: 'border border-border bg-background text-foreground',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-block rounded-full font-medium
        ${variants[variant]}
        ${sizes[size]}
        ${className || ''}
      `}
    >
      {children}
    </span>
  );
}
