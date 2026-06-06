'use client';

import React from 'react';
import { cn } from '@/utils/helpers';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export function Card({ title, description, children, className, ...props }: CardProps) {
  return (
    <div className={cn('rounded-3xl border border-border bg-card shadow-sm', className)} {...props}>
      {(title || description) && (
        <div className="border-b border-border px-6 py-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}
      {children && <div className="p-6">{children}</div>}
    </div>
  );
}
