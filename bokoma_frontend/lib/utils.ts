// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Fusionne intelligemment des classes Tailwind CSS
 * 
 * @param inputs - Valeurs de classes (strings, objets, arrays, conditions)
 * @returns Chaîne de classes fusionnées et optimisées
 * 
 * @example
 * cn('btn', 'btn-primary', { 'btn-disabled': disabled })
 * // → "btn btn-primary" ou "btn btn-primary btn-disabled" si disabled=true
 * 
 * cn('p-4', 'p-2') 
 * // → "p-2" (tailwind-merge résout les conflits)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}