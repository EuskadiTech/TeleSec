var CACHE = 'telesec_%%VERSIONCO%%';
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
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
  ({ url }) => !url.pathname.startsWith('/_couchdb/') && url.origin === self.location.origin,
  new workbox.strategies.NetworkFirst({
    cacheName: CACHE,
  })
);
