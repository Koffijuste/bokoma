// public/sw.js
// ============================================================================
// 📱 SERVICE WORKER Bokoma Store — Offline + Push notifications
// ============================================================================
// Stratégies :
//   - HTML (navigation)   : Network-first, fallback cache (pour offline)
//   - Assets statiques     : Cache-first (Next.js _next/static, fonts, icons)
//   - Images Cloudinary   : Stale-while-revalidate (économise la bande passante)
//   - API                 : NE PAS cacher (toujours frais, surtout pour /cart /orders)
//
// Push notifications :
//   - `push` event → on affiche une notification
//   - `notificationclick` → on focus/open l'URL fournie
//
// Versioning : on BUMPE CACHE_VERSION à chaque déploiement qui change
// la liste des assets à pré-cacher. L'ancien cache est alors supprimé.
// ============================================================================

const CACHE_VERSION = 'v1';
const STATIC_CACHE  = `bokoma-static-${CACHE_VERSION}`;
const HTML_CACHE    = `bokoma-html-${CACHE_VERSION}`;
const IMAGE_CACHE   = `bokoma-images-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/icon.png',
  '/apple-icon.png',
  '/manifest.webmanifest',
  '/favicon.ico',
];

// ── Install : pré-cache des assets critiques ─────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {
        // Pas d'erreur si certains assets 404 en dev
      }))
      .then(() => self.skipWaiting())
  );
});

// ── Activate : supprime les anciens caches ────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((k) => ![STATIC_CACHE, HTML_CACHE, IMAGE_CACHE].includes(k))
        .map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// ── Fetch handler ────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) API : ne JAMAIS cacher (sauf si on ajoute explicitement plus tard)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/v1/')) {
    return; // default network
  }

  // 2) Cloudinary / images distantes : stale-while-revalidate
  if (url.hostname.includes('cloudinary.com') || url.hostname.includes('unsplash.com')) {
    event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE));
    return;
  }

  // 3) Pages HTML (navigation) : network-first avec fallback cache
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(req, HTML_CACHE));
    return;
  }

  // 4) Assets statiques Next.js, fonts, icons : cache-first
  if (url.pathname.startsWith('/_next/static') ||
      url.pathname.startsWith('/static/') ||
      /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|webp|avif|svg|ico)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // 5) Default : network
});

// ── Stratégies ───────────────────────────────────────────────────────────
async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    return cached || new Response('Offline', { status: 503 });
  }
}

async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    // Fallback : page d'accueil en cache (offline-friendly)
    const home = await caches.match('/');
    if (home) return home;
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((res) => {
    if (res && res.status === 200) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// ============================================================================
// 🔔 PUSH NOTIFICATIONS
// ============================================================================
self.addEventListener('push', (event) => {
  let data = { title: 'Bokoma Store', body: 'Vous avez une nouvelle notification', url: '/' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (err) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.png',
    badge: data.badge || '/icon.png',
    image: data.image,
    data: { url: data.url || '/' },
    dir: 'auto',
    lang: 'fr',
    vibrate: [200, 100, 200],
    tag: data.tag || 'bokoma-notification',
    renotify: !!data.renotify,
    requireInteraction: !!data.requireInteraction,
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Click sur la notification : focus l'URL / ouvrir un nouvel onglet ────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus un onglet existant sur la même URL
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Sinon ouvre un nouvel onglet
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Notification close : tracking optionnel (analytics) ──────────────────
self.addEventListener('notificationclose', (event) => {
  // Rien à faire pour l'instant — si on ajoute un endpoint analytics, le
  // ping se fait ici avec event.notification.data.
});

// ============================================================================
// 🛠 MESSAGES depuis la page (ex: skipWaiting après déploiement)
// ============================================================================
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});
