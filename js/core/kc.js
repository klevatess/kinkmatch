/* core/kc.js — shared namespace + tiny helpers used by every page.
   Everything in the project hangs off window.KC. No framework, no build step. */
window.KC = window.KC || {};
(function (KC) {
  KC.$ = id => document.getElementById(id);
  /* the site's name: not translated (header, page title, QR frame, picture card) */
  KC.BRAND = "Kinkosmos";
  /* v610 (owner): new joke modes of the portrait can be switched off here, so each one can be announced on its own.
     true = the button is shown (portrait, picture card, compare page) and its help paragraph too; false = hidden as if
     it did not exist (a device that had chosen it falls back to the constellation). wr = ⚔ Servant of the Chaos gods,
     wh = Warhammer factions, leg = Space Marine legions, ow = Old World races, wi = Witcher, av = Avatar.
     v621 (owner, Oct 5): ext = the extended list's buttons (⇅ in the header, "Сделать расширенную" in the role block)
     and its help / "What's new" lines. Everything stays in the code; the owner unlocks one thing per version for a post.
     A list that is already extended still opens and keeps its ⇅ switch, so one can get back to the plain list.
     v623 (owner, Oct 7): ⚔ Wr (Chaos gods) unlocked; rz = Re:Zero sins, new and on. v624 (owner, Oct 9): ext unlocked. */
  KC.FEATURES = { ext: true, wr: true, wh: false, leg: false, ow: false, wi: false, av: false, rz: true };

  KC.el = function (tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  KC.esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /* localStorage keys — changing a key orphans users' saved data */
  KC.KEYS = {
    state: "practices-checklist-v1",        // own current list (full JSON)
    saved: "checklist-saved-profiles-v1",   // lists received via link/QR
    mine:  "checklist-my-profiles-v1",      // several own lists (full JSON)
    theme: "checklist-theme",               // "light" | "dark" (raw string)
    lang:  "checklist-lang",                // preferred UI language (raw string)
    active: "checklist-active-mine-id",     // which "My lists" entry the own list is saved into
    tpl:   "checklist-templates-v1",        // templates: own ("My lists") and received
    fav:   "checklist-favs-v1",             // favourites (♥) of lists opened from links: {listKey: [ids]}
    cmp:   "checklist-compares-v1",         // saved comparisons (3+ people): [{id, name, parts, ts}]
    folds: "checklist-folds",               // compare page: which picture folds are open {pair, group}
    dnd:   "checklist-dnd",                 // the PORTRAIT's mode (raw string): "1" = DnD class, "wod" = World of Darkness, none = the sign
    wod:   "checklist-wod",                 // the portrait's World of Darkness line (raw string): vamp | wolf | fey | demon
    dndPair:  "checklist-dnd-pair",         // v599: the same, remembered separately for the pair view of compare.html
    wodPair:  "checklist-wod-pair",
    dndGroup: "checklist-dnd-group",        // … and for the company (group) view
    wodGroup: "checklist-wod-group",
    wr:    "checklist-wr",                  // v611: the last tab chosen under ⚔ Wr (raw string): wr | wh | leg — the ⚔ Wr button reopens it
    wrPair:  "checklist-wr-pair",
    wrGroup: "checklist-wr-group",
    filters: "checklist-filters",           // v627: the filters row open ("1") or folded ("0"); default open (v628)
  };

  KC.ls = {
    get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v)   { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    raw(k)      { try { return localStorage.getItem(k); } catch (e) { return null; } },
    setRaw(k, v){ try { localStorage.setItem(k, v); } catch (e) {} },
    del(k)      { try { localStorage.removeItem(k); } catch (e) {} },
  };

  let toastTimer = null;
  KC.toast = function (msg) {
    const t = KC.$("toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  };

  const MODALS = []; let MODAL_SKIP = 0;
  window.addEventListener("popstate", () => { if (MODAL_SKIP) { MODAL_SKIP--; return; } const top = MODALS[MODALS.length - 1]; if (top) top.shut(true); });
  /* overlay modal: open/close + click-outside */
  KC.modal = function (overlayId, closeBtnId) {
    const ov = KC.$(overlayId);
    /* v622: while a window is open the page behind does not scroll (on phones a scroll ran through to the long list
       and made the windows stutter, owner Oct 5) */
    const lock = () => { document.documentElement.classList.toggle("has-modal", !!document.querySelector(".overlay.show")); };
    /* v629 (owner): the phone's Back button closes the window instead of leaving the page — every opened window adds
       one history entry; Back (popstate) closes the top window; closing it by a button / outside click goes back over
       that entry, so the history stays as it was */
    const m = {
      open() { if (ov.classList.contains("show")) return; ov.classList.add("show"); lock(); MODALS.push(m);
        try { history.pushState({ kcModal: overlayId }, ""); } catch (e) {} },
      close() { m.shut(false); },
      shut(fromBack) { if (!ov.classList.contains("show")) return; ov.classList.remove("show"); lock();
        const i = MODALS.lastIndexOf(m); if (i >= 0) MODALS.splice(i, 1);
        if (!fromBack && history.state && history.state.kcModal) { MODAL_SKIP++; try { history.back(); } catch (e) { MODAL_SKIP--; } } },
    };
    if (closeBtnId) KC.$(closeBtnId).addEventListener("click", m.close);
    ov.addEventListener("click", e => { if (e.target === ov) m.close(); });
    return m;
  };

  /* v629 (owner): the phone's browser bar follows the ◑ choice, not only the system theme */
  KC.barColor = function (th) { const c = th === "dark" ? "#161114" : "#f5f1ec"; document.querySelectorAll('meta[name="theme-color"]').forEach(x => { x.setAttribute("content", c); }); };
  /* v629 (owner): PDF / picture / QR libraries are fetched only when needed (they slowed the first paint of every page) */
  const LIBS = { qr: [["https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"], () => !!window.QRCode],
    pdf: [["https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"], () => !!(window.html2canvas && window.jspdf)] };
  const libWait = {};
  KC.lib = function (name) {
    const L = LIBS[name]; if (L[1]()) return Promise.resolve();
    if (libWait[name]) return libWait[name];
    const one = src => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.async = true;
      const timer = setTimeout(() => rej(new Error("timeout")), 20000);
      s.onload = () => { clearTimeout(timer); res(); }; s.onerror = () => { clearTimeout(timer); rej(new Error("load")); }; document.head.appendChild(s); });
    libWait[name] = L[0].reduce((p, src) => p.then(() => one(src)), Promise.resolve()).then(() => { if (!L[1]()) throw new Error("missing"); })
      .catch(e => { delete libWait[name]; throw e; });
    return libWait[name];
  };
  /* light/dark theme toggle (button #themeBtn on every page) */
  KC.initTheme = function () {
    const saved = KC.ls.raw(KC.KEYS.theme);
    if (saved) document.documentElement.dataset.theme = saved;
    const btn = KC.$("themeBtn"); if (!btn) return;
    btn.addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme;
      const isDark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      const next = isDark ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      KC.ls.setRaw(KC.KEYS.theme, next);
      KC.barColor(next);
    });
  };
})(window.KC);
