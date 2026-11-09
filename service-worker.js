/* =====================================================================
   ErlinQTech Móvil · service-worker.js
   Estrategia cache-first: después de la primera carga la aplicación
   funciona sin conexión. Cambie CACHE_VERSION al publicar una
   actualización para que los dispositivos descarguen los archivos nuevos.
   ===================================================================== */

var CACHE_VERSION = 'erlinqtech-v1';

var ARCHIVOS = [
  './',
  './index.html',
  './app.css',
  './graficos.js',
  './app.js',
  './banco.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return Promise.all(ARCHIVOS.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () {
          /* Un archivo ausente no debe impedir la instalación del resto. */
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(claves.map(function (k) {
        if (k !== CACHE_VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  ev.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (guardado) {
      if (guardado) {
        /* Revalidación silenciosa: sirve la copia local y actualiza en segundo plano. */
        fetch(req).then(function (red) {
          if (red && red.ok) {
            caches.open(CACHE_VERSION).then(function (c) { c.put(req, red.clone()); });
          }
        }).catch(function () { /* sin red: se conserva la copia local */ });
        return guardado;
      }
      return fetch(req).then(function (red) {
        if (red && red.ok && red.type === 'basic') {
          var copia = red.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(req, copia); });
        }
        return red;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
