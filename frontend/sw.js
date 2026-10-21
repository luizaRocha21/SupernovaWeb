/* ==========================================================================
   MANEJO CAATINGUEIRO — SERVICE WORKER OFFLINE-FIRST (RF17 / RN13)
   Garante funcionamento contínuo na roça mesmo quando a internet cai
   ========================================================================== */

const CACHE_STATIC = 'manejo-caatingueiro-static-v3';
const CACHE_API = 'manejo-caatingueiro-api-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/assets/css/global.css',
  '/assets/css/painel.css',
  '/assets/css/comunidade.css',
  '/assets/js/menu.js',
  '/assets/js/clima-dinamico.js',
  '/assets/js/acessibilidade-voz.js',
  '/assets/js/app.js',
  '/assets/images/logo.png',
  '/assets/images/logo-mark.svg',
  '/assets/images/roca-favoravel.svg',
  '/assets/images/roca-atencao.svg',
  '/assets/images/roca-estiagem.svg',
  '/pages/plantio.html',
  '/pages/reservatorios.html',
  '/pages/comunidade.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_API)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Estratégia Network-First com fallback imediato para Cache nas rotas de leitura da API
  if (url.pathname.startsWith('/api/v1/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_API).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Estratégia Stale-While-Revalidate para páginas, estilos, scripts e ilustrações
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_STATIC).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});
