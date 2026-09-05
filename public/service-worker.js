const CACHE_VERSION = 'mangrooves-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PRECACHE = [
    './offline.html',
    './manifest.webmanifest',
    './assets/css/app.css',
    './assets/js/app.js',
    './assets/img/hero-mangroves.png',
    './assets/img/icons/app-icon-180.png',
    './assets/img/icons/app-icon-192.png',
    './assets/img/icons/app-icon-512.png',
    './assets/img/badges/app-icon.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key.startsWith('mangrooves-') && key !== STATIC_CACHE)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => caches.match('./offline.html'))
        );
        return;
    }

    const isStaticAsset = url.pathname.includes('/assets/') && !url.pathname.includes('/uploads/');
    if (!isStaticAsset && !url.pathname.endsWith('/manifest.webmanifest')) return;

    event.respondWith(
        caches.match(request).then((cached) => {
            const network = fetch(request).then((response) => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
                }
                return response;
            }).catch(() => cached);
            return cached || network;
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
