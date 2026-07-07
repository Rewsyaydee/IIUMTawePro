const CACHE_NAME = "twa-event-ops-v2";
const CORE_ASSETS = ["/", "/index.html"];

const MAP_ASSETS = [
  "/assets/maps/campus-overview.webp",
  "/assets/maps/routes/main-auditorium__to__shas-mosque.webp",
  "/assets/maps/routes/shas-mosque__to__main-auditorium.webp",
  "/assets/maps/routes/main-auditorium__to__icc-main-hall.webp",
  "/assets/maps/routes/icc-main-hall__to__main-auditorium.webp",
  "/assets/maps/routes/icc-main-hall__to__shas-mosque.webp",
  "/assets/maps/routes/shas-mosque__to__icc-main-hall.webp",
  "/assets/maps/routes/mini-auditorium__to__main-auditorium.webp",
  "/assets/maps/routes/main-auditorium__to__sejahtera-clinic.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll([...CORE_ASSETS, ...MAP_ASSETS])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const isMapAsset = event.request.url.includes("/assets/maps/");

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (isMapAsset || response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match("/index.html"));
    })
  );
});
