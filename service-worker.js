const CACHE_NAME = "kabewari-sansu-managed-v1.2.0";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // control.json is intentionally NEVER cached. The managed edition must
  // contact the current control file so the owner can stop or update it.
  if (url.origin === self.location.origin && url.pathname.endsWith("/control.json")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() =>
        new Response("Management check unavailable", { status: 503, statusText: "Offline" })
      )
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.status === 200 && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === "navigate") return caches.match("./index.html");
      return new Response("Offline", { status: 503, statusText: "Offline" });
    })
  );
});
