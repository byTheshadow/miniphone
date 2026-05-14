const CACHE_NAME = 'miniphone-v2';
const ASSETS = [
    '/miniphone/',
    '/miniphone/index.html',
    '/miniphone/manifest.json',
    '/miniphone/css/base.css',
    '/miniphone/css/layout.css',
    '/miniphone/css/chat.css',
    '/miniphone/css/forum.css',
    '/miniphone/js/store.js',
    '/miniphone/js/ui.js',
    '/miniphone/js/ai.js',
    '/miniphone/js/chat.js',
    '/miniphone/js/forum.js',
    '/miniphone/js/app.js'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Network first, fallback to cache
self.addEventListener('fetch', e => {
    // Never intercept API calls
    if (e.request.url.includes('/v1/')) return;
    // Never intercept cross-origin requests
    if (!e.request.url.startsWith(self.location.origin)) return;

    e.respondWith(
        fetch(e.request)
            .then(res => {
                // Cache successful GET responses
                if (e.request.method === 'GET' && res.status === 200) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                }
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});


