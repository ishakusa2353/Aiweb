// Service Worker for Ishak AI Admin PWA (100% Live DB Sync)
const CACHE_NAME = 'ishak-admin-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Always fetch network first to ensure 100% live database sync with Supabase and server
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
