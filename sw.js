// Drivee Service Worker — enables PWA install + offline caching.
// Bump this version string whenever index.html / sw.js change so older
// installed PWAs throw away their stale caches on the next visit.
var CACHE_NAME = 'drivee-v3-2026-09-26-cosmic';
var URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.html',
  '/assets/css/drivee.css',
  '/assets/css/home.css',
  '/assets/js/main.js',
  '/assets/js/lawyers.js',
  '/assets/js/scanner.js',
  '/greenp-lots.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  // Delete any cache whose name doesn't match the current version
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  // Network first, cache fallback
  e.respondWith(
    fetch(e.request).catch(function() {
      return caches.match(e.request);
    })
  );
});

// ─── Web Push ────────────────────────────────────────────────────────────
// Fires even when the app is closed. The server sends a JSON payload:
//   { title, body, url, tag }
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = { body: (e.data && e.data.text()) || '' }; }
  var title = data.title || 'Drivee';
  var options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'drivee',
    data: { url: data.url || '/' },
    vibrate: [80, 40, 80],
    requireInteraction: !!data.requireInteraction
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification focuses an open tab or opens the app.
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/app.html';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if ('focus' in c) { c.navigate(url); return c.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
