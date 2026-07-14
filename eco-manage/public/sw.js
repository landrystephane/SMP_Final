const CACHE_NAME = 'eco-manage-v6';

// Assets statiques à pré-cacher dès l'installation
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Appels API (/api/) : network-first, cache en fallback offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request.clone())
        .then((response) => {
          // Mettre en cache uniquement les GET réussis
          if (response.ok && request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Offline : essayer le cache pour les GET
          if (request.method === 'GET') {
            const cached = await caches.match(request);
            if (cached) return cached;
          }
          // Réponse JSON structurée pour que le bridge React gère proprement
          return new Response(
            JSON.stringify({ offline: true, error: 'Hors connexion — données non disponibles', result: null }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // HTML principal + routes SPA : network-first, fallback sur /index.html en cache
  if (
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    (!url.pathname.includes('.') && url.origin === self.location.origin)
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request) || caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  // Assets Vite versionnés (/assets/) : cache-first (hachés → immuables)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Tout le reste (icônes, fonts, images) : cache-first avec fallback réseau
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        }).catch(() => caches.match('/index.html'))
      );
    })
  );
});
