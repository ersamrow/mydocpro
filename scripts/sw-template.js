/* Application code only: never cache submitted files, contact requests or ads. */
const CACHE = __CACHE_NAME__;
const PRECACHE = __PRECACHE__;
const ROUTES = new Set(__ROUTES__);
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        for (const url of PRECACHE) {
          const response = await fetch(
            new Request(url, { cache: "reload", credentials: "same-origin" }),
          );
          if (!response.ok || response.redirected)
            throw Error("Asset unavailable: " + url);
          const type = response.headers.get("content-type") || "";
          if (
            /\.(m?js)$/.test(url) &&
            !/^(text|application)\/javascript(?:;|$)/i.test(type)
          )
            throw Error("Expected JavaScript content type");
          if (ROUTES.has(url)) {
            if (
              !(await response.clone().text()).includes(
                'name="application-name" content="MyDocPro"',
              )
            )
              throw Error("App shell unavailable");
          } else if (type.includes("text/html"))
            throw Error("Expected application asset");
          await cache.put(url, response);
        }
      } catch (e) {
        await caches.delete(CACHE);
        throw e;
      }
      // Updates wait for existing windows to close, preserving active file processing.
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith("mydocpro-") && name !== CACHE)
          await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type !== "OFFLINE_STATUS") return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const ready = (
        await Promise.all(PRECACHE.map((url) => cache.match(url)))
      ).every(Boolean);
      event.ports[0]?.postMessage({ ready, version: CACHE });
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  const route = url.pathname.replace(/\/$/, "") || "/";
  let key;
  if (event.request.mode === "navigate" && ROUTES.has(route)) key = route;
  else if (PRECACHE.includes(url.pathname)) key = url.pathname;
  if (key)
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(key)) || fetch(event.request);
      })(),
    );
});
