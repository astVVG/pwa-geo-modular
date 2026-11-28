/**
 * Service Worker: guarda los archivos básicos de la app (incluido geo-helper.js)
 * para que cargue sin conexión, y los sirve desde la caché antes que desde la red.
 */

/** Nombre de la versión de caché; cambiarlo obliga a los usuarios a descargar los archivos nuevos. */
const CACHE_NAME = 'pwa-geo-modular-v6';

/** Archivos que se guardan en caché al instalar la app. */
const APP_SHELL = [
    './',
    './index.html',
    './styles.css',
    './geo-helper.js',
    './app.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

/** Al instalarse, guarda los archivos en caché y se activa sin esperar a que se cierren las pestañas. */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

/** Al activarse, borra las cachés de versiones anteriores y toma el control de las pestañas abiertas. */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((nombres) => Promise.all(
                nombres
                    .filter((nombre) => nombre !== CACHE_NAME)
                    .map((nombre) => caches.delete(nombre))
            ))
            .then(() => self.clients.claim())
    );
});

/** Responde a cada petición con la copia guardada en caché y, si no la hay, la pide a la red. */
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((respuestaCache) => {
            return respuestaCache || fetch(event.request);
        })
    );
});