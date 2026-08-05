// Sofía Messenger — Service Worker mínimo
// Solo lo necesario para que iOS/Android reconozcan la app como instalable.
// No cachea datos de clientes: cada apertura consulta información fresca.

const CACHE_NAME = 'sofia-app-shell-v1';
const SHELL_FILES = ['./sofia-app.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia: red primero (datos siempre frescos), y si no hay internet,
// al menos muestra el "cascarón" de la app en vez de una pantalla en blanco.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
