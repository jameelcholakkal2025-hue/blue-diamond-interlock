const CACHE = 'bluediamond-v6';

const PRECACHE = [
  '/home.html',
  '/catalogue.html',
  '/product.html',
  '/index.html',
  '/add-product.html',
  '/colors.html',
  '/categories.html',
  '/css/style.css',
  '/css/admin.css',
  '/js/main.js',
  '/js/admin.js',
  '/js/add-product.js',
  '/js/product.js',
  '/js/colors.js',
  '/js/categories.js',
  '/assets/logo.svg',
  '/assets/icon.jpeg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/icon-512-maskable.png',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Firebase / external: network first
  if (url.hostname !== self.location.hostname) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // Local assets: cache first, fall back to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
