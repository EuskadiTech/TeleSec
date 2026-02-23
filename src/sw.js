var CACHE = 'telesec_%%VERSIONCO%%';
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

let couchUrlPrefix = '';

function normalizePrefix(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return '';
  }

  return trimmedUrl.replace(/\/+$/, '');
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SET_COUCH_URL_PREFIX') {
    couchUrlPrefix = normalizePrefix(event.data.url);
  }
});

// workbox.routing.registerRoute(
//   new RegExp("/*"),
//   new workbox.strategies.StaleWhileRevalidate({
//     cacheName: CACHE,
//   })
// );

// All but couchdb
workbox.routing.registerRoute(
  ({ request, url }) => {
    const requestUrl = request && request.url ? request.url : url.href;
    const normalizedRequestUrl = normalizePrefix(requestUrl);

    if (couchUrlPrefix && normalizedRequestUrl.startsWith(couchUrlPrefix)) {
      return false;
    }

    return !url.pathname.startsWith('/_couchdb/') && url.origin === self.location.origin;
  },
  new workbox.strategies.CacheFirst({
    cacheName: CACHE,
  })
);
