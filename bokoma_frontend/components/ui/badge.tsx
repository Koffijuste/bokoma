'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'destructive';
  size?: 'sm' | 'md';
}

const variants = {
  default: 'bg-muted text-foreground',
  primary: 'bg-blue-500/10 text-blue-500',
  secondary: 'bg-gray-500/10 text-gray-500',
  accent: 'bg-accent/10 text-accent',
  destructive: 'bg-destructive/10 text-destructive',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
}: BadgeProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        inline-block rounded-full font-medium
        ${variants[variant]}
        ${sizes[size]}
      `}
    >
      {children}
    </motion.span>
  );
}
