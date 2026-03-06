const CACHE_NAME = 'cs-audio-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Estrategia: Network First, fallback to Cache
  // Esto asegura que siempre se intente obtener la versión más reciente,
  // pero si no hay conexión, se intenta servir desde caché si existe.
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
