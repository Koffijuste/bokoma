// middleware.ts - VERSION DURCIE (RBAC + JWT decode)
// ============================================================================
// 🛡️  AUTHENTIFICATION + RBAC — Edge middleware (s'exécute avant chaque page)
// ============================================================================
// Audit sécurité 08/07/2026 :
//   AVANT → seul le cookie était vérifié (cookie forgé = bypass complet).
//   APRÈS → on décode le JWT, on vérifie son expiration, et on impose un rôle
//           spécifique pour /dashboard/* (admin ou manager).
//
// Note : la vérification de SIGNATURE se fait côté backend (cf.
// Bokoma_Backend/src/middlewares/auth.js → jwt.verify). Un attaquant qui
// forge un JWT avec role=admin passera le middleware mais se fera jeter par
// toutes les routes /api/v1/* protégées (defense-in-depth : le backend reste
// la source de vérité pour l'autorisation).
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
  const isPublic =
    pathname === '/' ||
    pathname === '/products' ||
    pathname === '/search' ||
    pathname === '/categories' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/v1/health');

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

  // 3) Lecture du token d'accès depuis les cookies
  const token = request.cookies.get('bokoma_access_token')?.value;
  const payload = decodeAccessToken(token);

  // 4) Pas de token valide → redirection vers login (avec retour)
  if (!payload) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('from', pathname);
    const response = NextResponse.redirect(url);
    // Nettoie un éventuel cookie pourri pour éviter une boucle
    if (token) {
      response.cookies.delete('bokoma_access_token');
    }
    return response;
  }

  // 5) RBAC strict sur /dashboard/* : admin ou manager uniquement
  const isAdminRoute =
    pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  if (isAdminRoute) {
    const role = payload.role;
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
  if (payload.userId) forwardedHeaders.set('x-user-id', String(payload.userId));
  if (payload.role)   forwardedHeaders.set('x-user-role', String(payload.role));
  if (payload.email)  forwardedHeaders.set('x-user-email', String(payload.email));

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
