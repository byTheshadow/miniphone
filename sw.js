const CACHE_NAME = 'miniphone-v3.1';
const ASSETS = [
    '/miniphone/',
    '/miniphone/index.html',
    '/miniphone/manifest.json',
    '/miniphone/css/base.css',
    '/miniphone/css/layout.css',
    '/miniphone/css/chat.css',
    '/miniphone/css/forum.css',
    '/miniphone/css/diary.css',
    '/miniphone/js/store.js',
    '/miniphone/js/ui.js',
    '/miniphone/js/ai.js',
    '/miniphone/js/chat.js',
    '/miniphone/js/forum.js',
    '/miniphone/js/diary.js',
    '/miniphone/js/app.js',
    'js/receipt.js',
'css/receipt.css',
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
    if (e.request.url.includes('/v1/')) return;
    if (!e.request.url.startsWith(self.location.origin)) return;

    e.respondWith(
        fetch(e.request)
            .then(res => {
                if (e.request.method === 'GET' && res.status === 200) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                }
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});



