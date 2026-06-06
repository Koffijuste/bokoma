'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  variant?: 'text' | 'avatar' | 'card' | 'button';
  className?: string;
  count?: number;
}

const variants = {
  text: 'h-4 rounded',
  avatar: 'h-10 w-10 rounded-full',
  card: 'h-40 rounded-lg',
  button: 'h-10 w-24 rounded-lg',
};

export function Skeleton({
  variant = 'text',
  className = '',
  count = 1,
}: SkeletonProps) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className={`
            bg-muted rounded
            ${variants[variant]}
            ${className}
          `}
        />
      ))}
    </div>
  );
}
