/**
 * Service Worker — LuwiFinance PWA
 * Suporte completo a Offline, Cache-First para arquivos estáticos e Fallback gracioso
 */

const CACHE_NAME = 'luwi-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/styles.css',
  '/src/app.js',
  '/manifest.json',
  '/icons/icon.svg',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap'
];

// Instalação do Service Worker e pré-cache dos recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de versões antigas do cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Se for uma requisição para a API de Chat (/api/chat) ou Auth
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Se estiver sem internet e for o chat com a IA
        if (requestUrl.pathname === '/api/chat') {
          return new Response(
            JSON.stringify({
              answer: '📡 Você está offline no momento. O app continua funcionando normalmente em modo local e todas as suas transações e metas estão salvas no seu aparelho!'
            }),
            {
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
              status: 200
            }
          );
        }
        return new Response(
          JSON.stringify({ error: 'offline_mode', message: 'Serviço temporariamente offline' }),
          {
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            status: 503
          }
        );
      })
    );
    return;
  }

  // Para assets estáticos: Stale-While-Revalidate (Cache primeiro, atualiza em segundo plano)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Se for uma navegação de página (HTML) e falhar a rede, serve o index do cache
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
