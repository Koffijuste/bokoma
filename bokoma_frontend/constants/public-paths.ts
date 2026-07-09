// bokoma_frontend/constants/public-paths.ts
// ============================================================================
// 🌐 PUBLIC PATHS — Source de vérité UNIQUE des routes publiques
// ============================================================================
// Pourquoi ce fichier existe à part :
//   - Le Edge middleware (`middleware.ts`) DOIT partager la même liste
//     que le client (`hooks/useAuth.ts`, `services/api.ts`) — sinon une
//     nouvelle route publique ajoutée côté client est oubliée côté Edge
//     et l'utilisateur se fait rediriger à tort vers /auth/login AVANT
//     même que le client ne se charge.
//   - Edge runtime = pas de Node.js, pas de bundling lourd. Ce fichier
//     est volontairement minimal (un tableau + une fonction pure) pour
//     rester Edge-friendly et tree-shakable.
//
// Règle d'or : si tu ajoutes une route publique, ajoute-la ICI. Point.
// Tout le reste (middleware, hooks, services) l'importe automatiquement.
// ============================================================================

/**
 * Liste des préfixes de chemins considérés comme publics (pas besoin d'auth).
 * - Correspondance exacte pour les racines (`/`, `/gallery`).
 * - Correspondance par préfixe pour les sous-chemins (`/products/abc` matche `/products`).
 *
 * ⚠️ `/auth/*` est matché par préfixe (cf. isPublicPath), pas besoin de lister
 *    `/auth/login`, `/auth/register`, etc. ici — mais on les garde pour
 *    l'exactitude documentaire et pour les hooks qui font `path === p`.
 */
export const PUBLIC_PATHS: readonly string[] = [
  '/',
  '/products',
  '/search',
  '/categories',
  '/gallery',
  '/contact',
  '/faq',
  '/guide',
  '/feedback',
  '/terms',
  '/privacy-policy',
  '/home',
  '/auth/login',
  '/auth/register',
  '/auth/forgot',
  '/auth/reset-password',
  '/api/v1/health',
] as const;

/**
 * Helper : une URL est publique si elle matche exactement un préfixe public
 * ou si elle est un sous-chemin (`/products/abc` → public, `/products-xyz` → non).
 *
 * NB : on ajoute le `/` pour éviter le faux positif `/productspromo` sur `/products`.
 */
export const isPublicPath = (path: string): boolean => {
  if (!path) return false;
  return PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(p + '/'),
  );
};
