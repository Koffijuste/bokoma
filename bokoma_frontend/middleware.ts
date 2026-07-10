// middleware.ts - VERSION DURCIE (RBAC + JWT decode + refresh fallback)
// ============================================================================
// 🛡️  AUTHENTIFICATION + RBAC — Edge middleware (s'exécute avant chaque page)
// ============================================================================
// Audit sécurité 08/07/2026 :
//   AVANT → seul le cookie était vérifié (cookie forgé = bypass complet).
//   APRÈS → on décode le JWT, on vérifie son expiration, et on impose un rôle
//           spécifique pour /dashboard/* (admin ou manager).
//
// Bug fix 09/07/2026 — boucle de redirection sur /dashboard :
//   AVANT → access expiré = 307 vers /auth/login. Sur /auth/login, Zustand
//           avait encore le user persisté → useEffect redirigeait vers
//           /dashboard → middleware rejetait → 307 → boucle infinie.
//   APRÈS → si access expiré MAIS refresh token encore valide, on laisse
//           passer la requête. L'interceptor axios (services/api.ts) appelle
//           /auth/refresh sur le premier 401, obtient un nouveau access
//           token, et la session reprend normalement. Aucun flash, aucun
//           redirect. La sécurité reste identique : la SIGNATURE du JWT est
//           validée côté backend (defense-in-depth). Le refresh token peut
//           être révoqué côté DB (cf. auth.controller.js → logout).
// ============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Forme du payload JWT signé par le backend (cf. User.js → generateToken). */
interface BokomaJwtPayload {
  userId?: string;
  id?: string;
  email?: string;
  role?: 'admin' | 'manager' | 'customer' | string;
  iat?: number;     // issued at (sec)
  exp?: number;     // expiration (sec)
  iss?: string;
  aud?: string;
}

/** Roles autorisés à accéder au tableau de bord admin. */
const ADMIN_ROLES = new Set(['admin', 'manager']);

/**
 * Décode un JWT sans vérifier la signature. Renvoie `null` si le token est
 * absent, malformé, expiré, ou s'il a déjà expiré.
 *
 * NB : la signature est validée par le backend. Côté Edge on se contente de
 * l'expiration et du rôle (defense-in-depth).
 */
function decodeAccessToken(token: string | undefined): BokomaJwtPayload | null {
  if (!token) return null;
  try {
    const decoded = jwtDecode<BokomaJwtPayload>(token);
    if (typeof decoded.exp !== 'number') return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (decoded.exp <= nowSec) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Décode un refresh JWT sans vérifier la signature. On l'utilise ici
 * uniquement pour vérifier SON expiration avant de laisser passer une
 * requête alors que l'access token est mort — sans toucher la signature,
 * qui sera re-vérifiée par /auth/refresh côté backend.
 */
function decodeRefreshToken(token: string | undefined): BokomaJwtPayload | null {
  if (!token) return null;
  try {
    const decoded = jwtDecode<BokomaJwtPayload>(token);
    if (typeof decoded.exp !== 'number') return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (decoded.exp <= nowSec) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Construit un Set de headers `x-user-*` à partir d'un payload JWT (qu'il
 * vienne de l'access ou du refresh token). On l'attache à la requête
 * interne pour les Server Components downstream (cf. app/(admin)/layout.tsx).
 */
function userHeadersFromPayload(payload: BokomaJwtPayload): Headers {
  const forwardedHeaders = new Headers();
  if (payload.userId) forwardedHeaders.set('x-user-id', String(payload.userId));
  if (payload.role)   forwardedHeaders.set('x-user-role', String(payload.role));
  if (payload.email)  forwardedHeaders.set('x-user-email', String(payload.email));
  return forwardedHeaders;
}

// ─── Middleware principal ───────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🛡️ Audit 09/07/2026 : ancien chemin /admin → redirigé vers /dashboard.
  //    Redirection 308 (permanente, conserve la méthode). On le fait AVANT
  //    tout le reste pour ne pas exposer le contenu (et la sidebar admin)
  //    à un chemin que l'audit précédent signalait comme confusant.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const target = pathname.replace(/^\/admin/, '/dashboard');
    const url = new URL(target || '/dashboard', request.url);
    return NextResponse.redirect(url, 308);
  }

  // 1) Routes 100% publiques → on ne touche à rien
  // ✅ Bug fix (10/07/2026) : la liste était trop restrictive. Beaucoup de
  //    pages d'info / légales / paiement étaient protégées alors qu'elles
  //    doivent être accessibles sans login :
  //      - /cart, /wishlist, /checkout (parcours d'achat guest)
  //      - /faq, /terms, /privacy-policy, /contact, /gallery, /guide,
  //        /feedback, /home (pages publiques)
  //      - /payment/success, /payment/echec, /verify/:orderId (URLs de
  //        retour paiement CinetPay — si le user est kické vers /auth/login
  //        après paiement, il ne voit jamais la confirmation)
  //      - /orders/:orderId/confirmation (page de confirmation post-commande)
  //    On utilise désormais startsWith() partout pour matcher aussi les
  //    sous-routes (/products/abc, /orders/abc/confirmation, etc.).
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/categories') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/wishlist') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/faq') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy-policy') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/gallery') ||
    pathname.startsWith('/guide') ||
    pathname.startsWith('/feedback') ||
    pathname.startsWith('/home') ||
    pathname.startsWith('/payment') ||
    pathname.startsWith('/verify') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/v1/health') ||
    // Cas spécial : /orders/:id/confirmation doit être public (page de
    // confirmation partageable par QR code / email) tout en gardant
    // /orders et /orders/:id privées. Cf. useAuth et la constante
    // PUBLIC_PATH_PATTERNS dans constants/index.ts.
    /^\/orders\/[^/]+\/confirmation$/.test(pathname);

  if (isPublic) {
    return NextResponse.next();
  }

  // 2) Assets Next.js & fichiers statiques — exclus du matcher, double-check
  // NB : /.well-known/security.txt est aussi exclu pour rester en accès libre
  // (RFC 9116 : les chercheurs doivent pouvoir le lire sans s'authentifier).
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    pathname.startsWith('/.well-known/')
  ) {
    return NextResponse.next();
  }

  // 3) Lecture des tokens depuis les cookies
  const accessToken = request.cookies.get('bokoma_access_token')?.value;
  const refreshToken = request.cookies.get('bokoma_refresh_token')?.value;
  const accessPayload = decodeAccessToken(accessToken);
  const refreshPayload = decodeRefreshToken(refreshToken);

  // 4) Pas d'access token valide
  if (!accessPayload) {
    // 4a) Refresh encore valide → on laisse passer. L'interceptor axios
    //     appellera /auth/refresh au premier 401, le backend re-signe un
    //     access token, et la suite fonctionne sans flash ni redirect.
    //     Aucun risque sécurité : la SIGNATURE du JWT est validée par le
    //     backend, et le refresh token peut être révoqué (cf. logout).
    if (refreshPayload) {
      const forwardedHeaders = new Headers(request.headers);
      const userHeaders = userHeadersFromPayload(refreshPayload);
      userHeaders.forEach((v, k) => forwardedHeaders.set(k, v));
      return NextResponse.next({
        request: { headers: forwardedHeaders },
      });
    }

    // 4b) Aucun token valide (access expiré + refresh expiré/absent)
    //     → redirection vers login. On nettoie les deux cookies pourri pour
    //     éviter une boucle si l'un des deux est malformé sans être expiré.
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('from', pathname);
    const response = NextResponse.redirect(url);
    if (accessToken) {
      response.cookies.delete('bokoma_access_token');
    }
    if (refreshToken) {
      response.cookies.delete('bokoma_refresh_token');
    }
    return response;
  }

  // 5) RBAC strict sur /dashboard/* : admin ou manager uniquement
  const isAdminRoute =
    pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  if (isAdminRoute) {
    const role = accessPayload.role;
    if (!role || !ADMIN_ROLES.has(role)) {
      // Rôle insuffisant : on renvoie vers l'accueil (pas d'info leak sur
      // l'existence de la route). On efface le cookie pour forcer un
      // re-login propre.
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('bokoma_access_token');
      return response;
    }
  }

  // 6) Token valide (et rôle OK si nécessaire) → on enrichit les headers
  // pour les Server Components downstream avec les infos user.
  const forwardedHeaders = new Headers(request.headers);
  const userHeaders = userHeadersFromPayload(accessPayload);
  userHeaders.forEach((v, k) => forwardedHeaders.set(k, v));

  return NextResponse.next({
    request: { headers: forwardedHeaders },
  });
}

// ============================================================================
// 🎯 MATCHER — Sur quoi le middleware s'exécute ?
// ============================================================================
// - EXCLUT tous les assets statiques (fichiers avec extension, /_next/*)
// - INCLUT toutes les routes applicatives (publiques ou privées)
// ============================================================================
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
