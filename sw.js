const C='summit-v1';
self.addEventListener('install',function(){self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(clients.claim());});
self.addEventListener('fetch',function(e){
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(function(f){caches.open(C).then(function(c){c.put(e.request,f.clone());});return f;}).catch(function(){return caches.match(e.request).then(function(r){return r||caches.match('/');});}));
    return;
  }
  e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request).then(function(f){if(f.ok)caches.open(C).then(function(c){c.put(e.request,f.clone());});return f;});}));
});
