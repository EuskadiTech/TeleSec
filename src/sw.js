var CACHE = 'telesec_%%VERSIONCO%%';
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

let apiUrl = '';

function normalizePrefix(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SET_API_URL') {
    apiUrl = normalizePrefix(event.data.url);
  }
});

// Cache the app shell (static assets + HTML/JS/CSS) with cache-first strategy.
// Skip the backend API – those responses must be fresh and authenticated.
workbox.routing.registerRoute(
  ({ request, url }) => {
    const requestUrl = request && request.url ? request.url : url.href;
    const normalized = normalizePrefix(requestUrl);

    // Never cache API calls
    if (apiUrl && normalized.startsWith(apiUrl)) return false;
    if (url.pathname.startsWith('/api/')) return false;

    return url.origin === self.location.origin;
  },
  new workbox.strategies.CacheFirst({
    cacheName: CACHE,
  })
);
