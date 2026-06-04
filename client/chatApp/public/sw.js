const CACHE_NAME = "chatflow-cache-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/chatflow-logo.svg",
];

// Install SW
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate SW
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch items
self.addEventListener("fetch", (e) => {
  // Let browser handle socket and API requests directly
  if (e.request.url.includes("/api/") || e.request.url.includes("socket.io")) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
