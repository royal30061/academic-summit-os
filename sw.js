/* Academic Summit service worker v201.
   Network first for our own files (HTML, JS, CSS); the cache is only the offline fallback.
   The old worker answered from cache first, so an edited script kept running its old copy. */
const C = 'summit-v201';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== C; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;           // Supabase, CDNs, fonts: the browser handles them
  e.respondWith(
    fetch(req).then(function (f) {
      if (f && f.ok) { var copy = f.clone(); caches.open(C).then(function (c) { c.put(req, copy); }); }
      return f;
    }).catch(function () {
      return caches.match(req).then(function (r) { return r || caches.match('/index.html') || caches.match('/'); });
    })
  );
});
