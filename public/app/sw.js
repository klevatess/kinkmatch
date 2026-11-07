/* Kinkoverse app: keeps a copy of the app on the phone (owner, 2026-10-19 — with some VPNs the second opening fails to
   find the server's address until Telegram is restarted). Data (/api) is never cached and always goes to the server.
   - The page itself: network first (a new version is used as soon as the server answers), the copy when it does not.
   - owner, 2026-11-01: files with ?v= in the address (app.js?v=90, i18n/ru.json?v=3 …) never change under the same
     address, so they come from the copy at once, without asking the server; a new version has a new ?v= (the page names
     it), which is not in the copy yet and is fetched. A file changed without a new ?v= would stay old on phones — the
     test «versioned app files» (tests/webhook.test.js) stops such a build. */
const CACHE = "kv-app-v70";
// owner, 2026-10-29: cal.js / cal.css («Календарь мероприятий») are NOT here — they load only when the calendar is used;
// 2026-10-31: neither is vendor/qrcode (only when the invite QR is opened); 2026-11-01: nor staff.js and its texts
// (owner panel, moderation) — they are kept in the copy once used
const SHELL = ["./", "app.js?v=99", "app.css?v=58", "contacts.js?v=1", "i18n/ru.json?v=8", "i18n/en.json?v=8", "logo.svg", "favicon.svg", "vendor/telegram/telegram-web-app.js?v=8.0.2",
  "vendor/leaflet/leaflet.js?v=1.9.4", "vendor/leaflet/leaflet.css?v=1.9.4",
  "fonts/manrope-cyrillic-wght-normal.woff2", "fonts/manrope-latin-wght-normal.woff2", "fonts/lora-cyrillic-400-italic.woff2", "fonts/lora-latin-400-italic.woff2"];

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
  const isPage = req.mode === "navigate", versioned = !isPage && url.searchParams.has("v");
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (versioned) { const hit = await cache.match(req); if (hit) return hit; }   // the same address = the same file
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
