/* Academic Summit service worker v202.
   Our own files: network first, cache is the offline fallback (unchanged behaviour).
   NEW: the few third-party files the app cannot draw without (Tailwind, Supabase JS, fonts) are cached too,
   so reopening the app offline looks and works like online instead of falling apart.
   Supabase data calls are never touched. Open the app once online after this update to fill the cache. */
const C = 'summit-v202';
const LIBS = ['https://cdn.tailwindcss.com', 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap'];
const HOSTS = ['cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(function (c) {
    return Promise.all(LIBS.map(function (u) { return c.add(new Request(u, { mode: 'no-cors' })).catch(function () {}); }));
  }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== C; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var same = url.origin === location.origin;
  if (!same && HOSTS.indexOf(url.hostname) < 0) return;   // Supabase API and everything else: the browser handles it
  e.respondWith(
    fetch(req).then(function (f) {
      if (f && (f.ok || f.type === 'opaque')) { var copy = f.clone(); caches.open(C).then(function (c) { c.put(req, copy); }); }
      return f;
    }).catch(function () {
      return caches.match(req).then(function (r) { return r || (same ? (caches.match('/index.html') || caches.match('/')) : Response.error()); });
    })
  );
});
