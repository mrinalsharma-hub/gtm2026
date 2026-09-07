/* ══════════════════════════════════════════════════════════════
   GTM 2026 High-Performance Wedding Service Worker (v1.2.0)
   ══════════════════════════════════════════════════════════════ */
const CACHE_NAME = 'gtm2026-v1.2';

const STATIC_PRECACHE = [
  './',
  'index.html',
  'G%26M.html',
  'celebrations.html',
  'travel%26stay.html',
  'rsvp.html',
  'css/site.css?v=26000',
  'fonts/Kugile.ttf?v=24700',
  'fonts/SnellRoundhand.woff?v=24700',
  'fonts/Spectral-Regular.ttf',
  'js/site.js?v=26000',
  'js/spa-nav.js?v=26000',
  'js/global-audio.js?v=26000',
  'images/celebrations/bg_motif_celebrations.webp?v=24700',
  'images/celebrations/boat_illustration.webp?v=34000',
  'images/celebrations/card_bg_wedding.webp?v=41000',
  'images/celebrations/card_bg_mehndi.webp?v=24700',
  'images/stay/stay_travel_air.webp',
  'images/stay/stay_travel_train.webp',
  'images/stay/stay_arch.webp',
  'images/rsvp/rsvp_footer_hands.webp?v=27700',
  'images/home/vinyl_disc.webp?v=26600',
  'images/aipan_thick_composite_tile.png?v=35000',
  'images/player_figma_play.svg?v=24700'
];

// Install: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('SW Precache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Purge obsolete cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy dispatch
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Bypass non-GET requests and external endpoints
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) {
    if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
      event.respondWith(
        caches.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((res) => {
            if (res && res.status === 200) {
              const resClone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
            return res;
          });
        })
      );
    }
    return;
  }

  // 2. Static Assets (Images, Fonts, Media, CSS, JS): Cache-First with Background Revalidation
  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/audio/') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const resClone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
            return networkRes;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 3. HTML Pages & Navigation: Stale-While-Revalidate
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const resClone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
            return networkRes;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
