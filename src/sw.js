var CACHE = 'telesec_%%VERSIONCO%%';

let apiUrl = '';
const PRECACHE_URLS = JSON.parse('%%CACHE_URLS%%');

function normalizePrefix(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (!response || !response.ok) {
              return;
            }
            await cache.put(url, response.clone());
          } catch (error) {
            console.warn('No se pudo precachear recurso:', url, error);
          }
        })
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE)
        .map((cacheName) => caches.delete(cacheName))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SET_API_URL') {
    apiUrl = normalizePrefix(event.data.url);
  }
});

function shouldBypassCache(request, url) {
  const requestUrl = request && request.url ? request.url : url.href;
  const normalized = normalizePrefix(requestUrl);

  // Never cache API calls
  if (apiUrl && normalized.startsWith(apiUrl)) return true;
  if (url.pathname.startsWith('/api/')) return true;

  // Only handle same-origin requests
  return url.origin !== self.location.origin;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!request || request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (shouldBypassCache(request, url)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches.open(CACHE).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(async () => {
          if (request.mode === 'navigate') {
            return (await caches.match('index.html')) || (await caches.match('./'));
          }
          return undefined;
        });
    })
  );
});
