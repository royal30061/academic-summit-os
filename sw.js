/* Academic Summit service worker v203 - built for speed on slow mobile networks.
   - The app page (index.html): network first, but if the network takes more than 2.5 s the saved copy is used at once.
   - Our own scripts, styles and images: served instantly from the saved copy and refreshed quietly in the background.
     (Script addresses carry ?v=N, so a new version is a new address and downloads straight away.)
   - Tailwind, Supabase JS and fonts: served from the saved copy and refreshed in the background.
   - Supabase data calls are never touched. */
const C = 'summit-v2611190441';
const LIBS = ['https://cdn.tailwindcss.com', 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap'];
const HOSTS = ['cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];
const STATIC = /\.(js|css|png|jpg|jpeg|svg|webp|ico|woff2?|webmanifest)$/i;

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

function put(req, f) { if (f && (f.ok || f.type === 'opaque')) { var copy = f.clone(); caches.open(C).then(function (c) { c.put(req, copy); }); } return f; }
function swr(req) {
  return caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (f) { return put(req, f); }).catch(function () { return hit; });
    return hit || net;
  });
}
function netFirst(req, ms) {
  return new Promise(function (resolve) {
    var done = false;
    var t = setTimeout(function () { caches.match(req).then(function (h) { if (h && !done) { done = true; resolve(h); } }); }, ms);
    fetch(req).then(function (f) { clearTimeout(t); put(req, f); if (!done) { done = true; resolve(f); } })
      .catch(function () { clearTimeout(t); caches.match(req).then(function (h) { if (!done) { done = true; resolve(h || caches.match('/index.html') || Response.error()); } }); });
  });
}
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url), same = url.origin === location.origin;
  if (!same && HOSTS.indexOf(url.hostname) < 0) return;                 // Supabase API and everything else: the browser handles it
  if (!same) return e.respondWith(swr(req));
  if (req.mode === 'navigate' || url.pathname === '/' || /index\.html$/.test(url.pathname)) return e.respondWith(netFirst(req, 2500));
  if (STATIC.test(url.pathname)) return e.respondWith(swr(req));
  e.respondWith(netFirst(req, 4000));
});
