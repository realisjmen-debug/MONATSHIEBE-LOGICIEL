const CACHE_NAME = "monatshiebe-static-v1";
const STATIC_PREFIX = "/_next/static/";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("monatshiebe-static-") && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Cache only immutable Next.js assets and the built-in icon. Never cache pages,
  // API calls, Supabase data, authentication responses, or school records.
  if (!url.pathname.startsWith(STATIC_PREFIX) && url.pathname !== "/pwa-icon.svg") return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && (response.type === "basic" || response.type === "default")) {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
