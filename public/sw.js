const CACHE_NAME = "katiany-hair-v2";

const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Nunca interferir em requisições que não sejam GET
  if (request.method !== "GET") {
    return;
  }

  // Nunca interferir em recursos externos
  if (url.origin !== self.location.origin) {
    return;
  }

  // IMPORTANTE:
  // admin, APIs e agendamento ficam totalmente fora do Service Worker.
  // O navegador faz a requisição normalmente.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/agendar")
  ) {
    return;
  }

  // Navegação pública: tenta rede primeiro.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    );
    return;
  }

  // Assets públicos: cache first.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (
          networkResponse.ok &&
          networkResponse.type === "basic"
        ) {
          const clonedResponse = networkResponse.clone();

          void caches.open(CACHE_NAME).then((cache) => {
            return cache.put(request, clonedResponse);
          });
        }

        return networkResponse;
      });
    })
  );
});