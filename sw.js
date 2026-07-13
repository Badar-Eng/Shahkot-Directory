const CACHE_NAME = "shahkot-cache-v7";

const APP_SHELL = [
  "/",
  "/index.html",
  "/details.html",
  "/about.html",
  "/how_to_use.html",
  "/shahkot.jpg",
  "/images/skt-logo.png",
  "/manifest.json"
];

/* ===== INSTALL ===== */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Step 1: App shell files cache karo — har ek ka result print karo
      for (const url of APP_SHELL) {
        try {
          await cache.add(url);
          console.log("✅ Cached:", url);
        } catch (err) {
          console.error("❌ FAIL:", url, "— wajah:", err.message);
        }
      }

      // Step 2: shops.json padho aur HAR shop ki HAR image cache karo
      try {
        const res = await fetch("/shops.json");
        const shops = await res.json();
        for (const shop of shops) {
          const imgs = [shop.cardImage, shop.hero, shop.ownerImage, ...(shop.gallery || [])];
          for (const img of imgs) {
            if (!img) continue;
            try {
              await cache.add(img);
            } catch (err) {
              console.error("❌ Image FAIL:", img);
            }
          }
        }
        await cache.put("/shops.json", new Response(JSON.stringify(shops)));
        console.log("✅ shops.json + saari images cache ho gayin —", shops.length, "shops");
      } catch (err) {
        console.error("❌ shops.json load nahi hui:", err.message);
      }
    })
  );
  self.skipWaiting();
});

/* ===== ACTIVATE ===== */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

/* ===== FETCH ===== */
self.addEventListener("fetch", (event) => {
  const requestURL = new URL(event.request.url);

  // Navigation (page open karna — navbar links, shop cards, etc.)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(requestURL.pathname, { ignoreSearch: true });
          if (cached) return cached;
          console.warn("⚠️ Yeh page cache mein nahi mila, index.html dikha rahe hain:", requestURL.pathname);
          return caches.match("/index.html");
        })
    );
    return;
  }
  // shops.json aur images: Network First (fresh mile to update, warna cache se)
  if (requestURL.href.includes("shops.json") || requestURL.href.includes("/images/") || requestURL.pathname.endsWith(".jpg") || requestURL.pathname.endsWith(".jpeg") || requestURL.pathname.endsWith(".png")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const resClone = response.clone();
          // query-string wale timestamp ko ignore karke, sirf clean path pe cache karo
          caches.open(CACHE_NAME).then((cache) => cache.put(requestURL.pathname, resClone));
          return response;
        })
        .catch(() =>
          caches.match(requestURL.pathname, { ignoreSearch: true })
        )
    );
    return;
  }

  // Baqi sab: Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return response;
        })
      );
    })
  );
});