// components/ui/public-page-header.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PublicPageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  showBackButton?: boolean;
  backHref?: string;
  className?: string;
  hero?: boolean;
}

export const PublicPageHeader: React.FC<PublicPageHeaderProps> = ({
  title,
  description,
  icon,
  breadcrumbs,
  actions,
  showBackButton = false,
  backHref = '/',
  className,
  hero = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        hero 
          ? 'py-12 sm:py-20 bg-gradient-to-br from-accent/5 via-background to-background border-b border-border'
          : 'py-8 sm:py-12',
        className
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
            <Link
              href="/"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Home className="w-3 h-3" />
              <span className="hidden sm:inline">Accueil</span>
            </Link>
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                {item.href ? (
                  <Link
                    href={item.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{item.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Header content */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Bouton retour */}
            {showBackButton && (
              <Button
                variant="outline"
                size="icon"
                asChild
                className="shrink-0"
                aria-label="Retour"
              >
                <Link href={backHref}>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
            )}

            {/* Icône */}
            {icon && (
              <div className={cn(
                "rounded-xl bg-accent/10 flex items-center justify-center shrink-0",
                hero ? "w-14 h-14 sm:w-16 sm:h-16" : "w-10 h-10 sm:w-12 sm:h-12"
              )}>
                {icon}
              </div>
            )}

            {/* Titre et description */}
            <div>
              <h1 className={cn(
                "font-bold tracking-tight",
                hero ? "text-3xl sm:text-4xl lg:text-5xl" : "text-2xl sm:text-3xl"
              )}>
                {title}
              </h1>
              {description && (
                <p className={cn(
                  "text-muted-foreground mt-2 max-w-2xl",
                  hero ? "text-base sm:text-lg" : "text-sm sm:text-base"
                )}>
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              {actions}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};