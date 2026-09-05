// DiagDesk Service Worker — offline-first for Indian branch deployments
// Strategy:
//   /v1/* GET  → NetworkFirst (8 s timeout) then cached response
//   /assets/*  → CacheFirst (assets are content-hashed, safe to cache forever)
//   navigate   → CacheFirst on /index.html (SPA shell)

const STATIC_CACHE = 'diagdesk-static-v1';
const API_CACHE    = 'diagdesk-api-v1';

// ── Lifecycle ──────────────────────────────────────────────────────────────────

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== API_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch interception ─────────────────────────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin requests.
  if (url.origin !== self.location.origin) return;

  // API reads: network-first with cache fallback.
  if (url.pathname.startsWith('/v1/') && request.method === 'GET') {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // App shell and content-hashed JS/CSS/fonts: cache-first.
  if (request.mode === 'navigate' || url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirstStatic(request));
  }
});

// ── Strategies ─────────────────────────────────────────────────────────────────

async function networkFirstApi(request) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 8000); // 8 s → offline faster
  try {
    const response = await fetch(request.clone(), { signal: controller.signal });
    clearTimeout(tid);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      // Clone before consuming — can only read body once.
      await cache.put(request.clone(), response.clone());
    }
    return response;
  } catch {
    clearTimeout(tid);
    const cached = await caches.match(request);
    if (cached) {
      // Stamp the response so the app can show a "stale data" notice.
      const headers = new Headers(cached.headers);
      headers.set('X-Served-From-Cache', 'true');
      return new Response(cached.body, { status: cached.status, headers });
    }
    // No cache either — return an empty envelope so list views degrade gracefully.
    return new Response(
      JSON.stringify({ data: [], total: 0, offline: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'X-Served-From-Cache': 'true' } }
    );
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request.clone(), response.clone());
    }
    return response;
  } catch {
    // SPA fallback: serve the cached shell for any navigation miss.
    if (request.mode === 'navigate') {
      const shell = await caches.match('/') ?? await caches.match('/index.html');
      if (shell) return shell;
    }
    return new Response('Service Unavailable', { status: 503 });
  }
}
