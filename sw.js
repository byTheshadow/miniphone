/* ============================================================
   sw.js — Service Worker，PWA 离线缓存
   ============================================================ */

/* [SW-CONFIG START] 缓存配置 */
const CACHE_NAME    = 'miniphone-v1';
const CACHE_STATIC  = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/phone-shell.css',
  './css/widgets.css',
  './css/apps.css',
  './js/core/store.js',
  './js/core/storage.js',
  './js/core/router.js',
  './js/core/app.js',
  './js/ui/toast.js',
  './js/ui/modal.js',
  './js/ui/phone-shell.js',
  './js/widgets/widget-registry.js',
  './js/widgets/clock.js',
  './js/widgets/countdown.js',
  './js/widgets/profile-card.js',
  './js/widgets/mood.js',
  './js/widgets/fortune.js',
  './js/widgets/pomodoro.js',
  './js/widgets/steps.js',
  './js/widgets/sticky-note.js',
  './js/widgets/photo-carousel.js',
  './js/widgets/together-music.js',
];
/* [SW-CONFIG END] */

/* ============================================================ */

/* [SW-INSTALL START] 安装：预缓存静态资源 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_STATIC))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] install cache failed:', err))
  );
});
/* [SW-INSTALL END] */

/* ============================================================ */

/* [SW-ACTIVATE START] 激活：清理旧缓存 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});
/* [SW-ACTIVATE END] */

/* ============================================================ */

/* [SW-FETCH START] 请求拦截：Cache First 策略 */
self.addEventListener('fetch', (event) => {
  // 只处理同源 GET 请求
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // API 请求不走缓存，直接网络
  if (event.request.url.includes('/v1/')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // 只缓存成功的响应
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      });
    })
  );
});
/* [SW-FETCH END] */

/* ============================================================
   sw.js END
   ============================================================ */
