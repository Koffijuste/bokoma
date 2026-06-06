// middleware.ts - VERSION ULTRA-OPTIMISÉE
import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ✅ Routes publiques : aucune vérification
  const isPublic = [
    '/', '/products', '/search', '/categories',
    '/auth/login', '/auth/register', '/auth/forgot',
    '/api/v1/health'
  ].some(route => pathname.startsWith(route));

  if (isPublic) return NextResponse.next();

  // ✅ Vérification token ultra-simple
  const token = request.cookies.get('bokoma_access_token')?.value;
  
  if (!token) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // ✅ Matcher minimal : exclure uniquement les assets statiques
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};