// Target 1400 フラッシュカード — Service Worker
const CACHE_PREFIX = 'target1400-flashcard-';
const CACHE_NAME = CACHE_PREFIX + 'v4';

// キャッシュするリソース
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Google Fonts はネットワーク優先でキャッシュ
const FONT_ORIGINS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

// --- インストール: 静的ファイルを事前キャッシュ ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

// --- アクティベート: このアプリの古いキャッシュのみ削除（他アプリのキャッシュは残す） ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// --- フェッチ戦略 ---
self.addEventListener('fetch', event => {
  // Google Fonts: ネットワーク優先 → キャッシュフォールバック
  if (FONT_ORIGINS.some(o => event.request.url.startsWith(o))) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // その他: キャッシュ優先 → ネットワークフォールバック
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      });
    })
  );
});
