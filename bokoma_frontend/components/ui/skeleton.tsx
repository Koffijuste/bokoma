import React from 'react';

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
        <div
          key={i}
          className={`
            bg-muted rounded animate-pulse
            ${variants[variant]}
            ${className}
          `}
        />
      ))}
    </div>
  );
}
