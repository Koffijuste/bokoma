// components/ui/back-button.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  href?: string;
  className?: string;
  label?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ 
  href, 
  className,
  label = 'Retour'
}) => {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={cn('gap-2 md:hidden', className)}
      aria-label={label}
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
};