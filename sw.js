/*========== [BLOCK: Service Worker 配置] ========== */
const CACHE_NAME = 'miniphone-v1';
const CACHE_URLS = [
  './',
  './index.html',
  './css/main.css',
  './css/home-screen.css',
  './css/status-bar.css',
  './css/widgets.css',
  './js/core/app.js',
  './js/core/router.js',
  './js/core/store.js',
  './js/core/storage.js',
  './js/ui/toast.js',
  './js/ui/modal.js',
  './js/ui/widget-system.js',
  './js/ui/home-screen.js',
  './js/ui/app-icon.js',
  './js/api/openai-compatible.js',
  './js/api/key-manager.js'
];
/* ========== [/BLOCK: Service Worker 配置] ========== */

/* ========== [BLOCK: Install 事件] ========== */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});
/* ========== [/BLOCK: Install 事件] ========== */

/* ========== [BLOCK: Activate 事件] ========== */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});
/* ========== [/BLOCK: Activate 事件] ========== */

/* ========== [BLOCK: Fetch 拦截] ========== */
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        return response;
      });
    }).catch(function() {
      if (event.request.destination === 'document') {
        return caches.match('./index.html');
      }
    })
  );
});
/* ========== [/BLOCK: Fetch 拦截] ========== */
