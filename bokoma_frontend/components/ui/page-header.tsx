// components/ui/page-header.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  showBackButton?: boolean;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  breadcrumbs,
  actions,
  showBackButton = false,
  className,
}) => {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('mb-6', className)}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Home className="w-3 h-3" />
            Dashboard
          </button>
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              <span className="text-muted-foreground/50">/</span>
              {item.href ? (
                <button
                  onClick={() => router.push(item.href!)}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Header content */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* Bouton retour mobile */}
          {showBackButton && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="md:hidden shrink-0 mt-1"
              aria-label="Retour"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}

          {/* Icône */}
          {icon && (
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-accent/10 items-center justify-center shrink-0">
              {icon}
            </div>
          )}

          {/* Titre et description */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              {title}
            </h1>
            {description && (
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
};