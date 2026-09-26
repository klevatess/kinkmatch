/* core/stats.js — anonymous visit counter (GoatCounter: no cookies, nothing stored on the device,
   no IP addresses kept). Its script is a copy inside the site (vendor/goatcounter-count.js), so no
   outside code runs on the page; only the count itself goes to <CODE>.goatcounter.com. It sends only the page ("/Kinkcheck/index.html"), the interface language and
   a few event names below — never answers, names or links (those live after "#" and are not read here).
   CODE = the site code chosen at goatcounter.com ("" = counter off). If the counter script is blocked
   (ad blocker, no network), nothing happens and the site works as usual.
   Events: open-link, open-template, share, pdf, compare-2, compare-3plus, compare-saved. */
(function (KC) {
  const CODE = "klevatess";
  /* where this file was loaded from -> the vendor copy next to it, same ?v= */
  const me = document.currentScript && document.currentScript.src;
  const SRC = me ? me.replace(/core\/stats\.js/, "vendor/goatcounter-count.js") : "js/vendor/goatcounter-count.js";
  const noop = { event() {} };
  if (!CODE || !/^[a-z0-9-]+$/.test(CODE)) { KC.stats = noop; return; }
  /* page = file path + language, e.g. "/Kinkcheck/index.html?lang=ru"; everything else is dropped */
  window.goatcounter = Object.assign(window.goatcounter || {}, { path: () => location.pathname + "?lang=" + ((KC.i18n && KC.i18n.lang) || "") });
  /* events before the counter has loaded wait in sessionStorage, so they survive a page reload
     (opening a template link reloads the page into my list) */
  const Q = "kcStatsQueue";
  const queue = () => { try { return JSON.parse(sessionStorage.getItem(Q) || "[]"); } catch (e) { return []; } };
  const setQueue = a => { try { if (a.length) sessionStorage.setItem(Q, JSON.stringify(a.slice(-20))); else sessionStorage.removeItem(Q); } catch (e) {} };
  KC.stats = {
    enabled: true,
    event(name) {
      const g = window.goatcounter;
      if (g && typeof g.count === "function") { try { g.count({ path: name, title: name, event: true }); } catch (e) {} }
      else setQueue(queue().concat([name]));
    },
  };
  function load() {
    const s = document.createElement("script");
    s.async = true; s.src = SRC;
    s.setAttribute("data-goatcounter", "https://" + CODE + ".goatcounter.com/count");
    s.onload = () => { const a = queue(); setQueue([]); a.forEach(n => KC.stats.event(n)); };
    document.head.appendChild(s);
  }
  if (document.readyState === "complete") load(); else window.addEventListener("load", load);
})(window.KC);
