/* Kinkoverse app: keeps a copy of the app on the phone (owner, 2026-10-19 — with some VPNs the second opening fails to
   find the server's address until Telegram is restarted). The page itself then opens from the copy; data (/api) is never
   cached and always goes to the server. Network first: a new version is used as soon as the server answers. */
const CACHE = "kv-app-v42";
const SHELL = ["./", "app.js?v=74", "app.css?v=39", "logo.svg", "favicon.svg", "vendor/telegram/telegram-web-app.js?v=8.0.2",
  "vendor/leaflet/leaflet.js?v=1.9.4", "vendor/leaflet/leaflet.css?v=1.9.4",
  "fonts/inter-cyrillic-400-normal.woff2", "fonts/inter-cyrillic-500-normal.woff2", "fonts/inter-cyrillic-600-normal.woff2",
  "fonts/inter-latin-400-normal.woff2", "fonts/inter-latin-500-normal.woff2", "fonts/inter-latin-600-normal.woff2", "fonts/fraunces-latin-600-normal.woff2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const withTimeout = (p, ms) => new Promise((ok, no) => { const t = setTimeout(() => no(new Error("timeout")), ms); p.then(v => { clearTimeout(t); ok(v); }, x => { clearTimeout(t); no(x); }); });

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || !url.pathname.startsWith("/app/")) return;   // /api and others: untouched
  const isPage = req.mode === "navigate";
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await withTimeout(fetch(req), isPage ? 5000 : 8000);
      if (res && res.ok) cache.put(isPage ? "./" : req, res.clone());
      return res;
    } catch (x) {
      // the Telegram launch data sits in the #hash, which is not part of the request: the cached page reads it as usual
      const hit = await cache.match(isPage ? "./" : req);
      if (hit) return hit;
      const loose = await cache.match(req, { ignoreSearch: true });
      if (loose) return loose;
      throw x;
    }
  })());
});
