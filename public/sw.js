const CACHE_NAME = "katiany-hair-v4";

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

/*
 * =========================================================
 * PUSH NOTIFICATIONS
 * =========================================================
 */

self.addEventListener("push", (event) => {
  let payload = {
    title: "Katiany Silvia Hair",
    body: "Você recebeu uma nova notificação.",
    url: "/admin",
    type: "GENERAL",
  };

  if (event.data) {
    try {
      payload = {
        ...payload,
        ...event.data.json(),
      };
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",

    tag: payload.appointmentId
      ? `${payload.type}-${payload.appointmentId}`
      : payload.type,

    renotify: true,

    data: {
      url: payload.url || "/admin",
      appointmentId:
        payload.appointmentId || null,
      type: payload.type || "GENERAL",
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      payload.title ||
        "Katiany Silvia Hair",
      options
    )
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const targetUrl =
      event.notification.data?.url ||
      "/admin";

    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then(async (clientList) => {
          for (const client of clientList) {
            if ("focus" in client) {
              await client.focus();

              if ("navigate" in client) {
                await client.navigate(
                  targetUrl
                );
              }

              return;
            }
          }

          if (self.clients.openWindow) {
            return self.clients.openWindow(
              targetUrl
            );
          }
        })
    );
  }
);

/*
 * =========================================================
 * CACHE
 * =========================================================
 */

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  /*
   * Nunca interferir em requisições
   * que não sejam GET.
   */
  if (request.method !== "GET") {
    return;
  }

  /*
   * Nunca interferir em recursos externos.
   */
  if (url.origin !== self.location.origin) {
    return;
  }

  /*
   * Admin, APIs e agendamento ficam
   * completamente fora da estratégia
   * de cache.
   *
   * Isso evita dados antigos em:
   *
   * /api/*
   * /admin/*
   * /agendar/*
   */
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/agendar")
  ) {
    return;
  }

  /*
   * Navegação pública:
   *
   * tenta a rede primeiro.
   *
   * Se estiver offline, tenta a home
   * armazenada no cache.
   */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/")
      )
    );

    return;
  }

  /*
   * Assets públicos:
   *
   * cache first.
   */
  event.respondWith(
    caches
      .match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then(
          (networkResponse) => {
            if (
              networkResponse.ok &&
              networkResponse.type ===
                "basic"
            ) {
              const clonedResponse =
                networkResponse.clone();

              void caches
                .open(CACHE_NAME)
                .then((cache) => {
                  return cache.put(
                    request,
                    clonedResponse
                  );
                });
            }

            return networkResponse;
          }
        );
      })
  );
});