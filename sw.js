// sw.js - Service Worker (App Shell precacheado, sin async/await)
const CACHE_NAME = 'pwa-geo-modular-v1';

const APP_SHELL = [
    './',
    './index.html',
    './styles.css',
    './geo-helper.js', // Módulo reutilizable de geolocalización
    './app.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

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

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((respuestaCache) => {
            return respuestaCache || fetch(event.request);
        })
    );
});