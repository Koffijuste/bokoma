// lib/validators/settings.ts
// ============================================================================
// 🛡️  SCHÉMAS ZOD POUR LA PAGE PARAMÈTRES
// ============================================================================
// Source de vérité unique pour la validation côté frontend des formulaires
// Settings. Les règles sont alignées avec celles du backend (controllers +
// middlewares) pour éviter les divergences user-visible.
// ============================================================================

import { z } from 'zod';

// ─── Profil ─────────────────────────────────────────────────────────────────
export const profileSchema = z.object({
  firstName: z
    .string({ required_error: 'Prénom requis' })
    .trim()
    .min(2, 'Au moins 2 caractères')
    .max(50, 'Maximum 50 caractères'),
  lastName: z
    .string({ required_error: 'Nom requis' })
    .trim()
    .min(2, 'Au moins 2 caractères')
    .max(50, 'Maximum 50 caractères'),
  // ✅ Téléphone optionnel, mais si présent → format strict +225XXXXXXXXXX
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^\+225[0-9]{8,10}$/.test(v),
      { message: 'Format attendu : +225 suivi de 8 à 10 chiffres' }
    )
    .optional()
    .or(z.literal('')),
});

export type ProfileInput = z.infer<typeof profileSchema>;

// ─── Mot de passe ───────────────────────────────────────────────────────────
export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z
      .string()
      .min(8, 'Au moins 8 caractères')
      .regex(/[A-Z]/, 'Au moins une majuscule')
      .regex(/[0-9]/, 'Au moins un chiffre'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'Le nouveau mot de passe doit être différent de l\'ancien',
    path: ['newPassword'],
  });

export type PasswordInput = z.infer<typeof passwordSchema>;