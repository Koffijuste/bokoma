'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/utils/helpers';

export const ProductImage = ({ 
  src, 
  alt, 
  className = '' 
}: { 
  src?: string | null; 
  alt: string; 
  className?: string;
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isValidUrl = src && typeof src === 'string' && 
    (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/uploads/') || src.startsWith('data:'));

  if (!isValidUrl || hasError) {
    return (
      <div className={cn('bg-muted flex items-center justify-center', className)}>
        <ImageIcon className="w-1/2 h-1/2 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          console.warn('⚠️ Image load error:', src);
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
};