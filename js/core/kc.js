/* core/kc.js — shared namespace + tiny helpers used by every page.
   Everything in the project hangs off window.KC. No framework, no build step. */
window.KC = window.KC || {};
(function (KC) {
  KC.$ = id => document.getElementById(id);

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

  /* overlay modal: open/close + click-outside */
  KC.modal = function (overlayId, closeBtnId) {
    const ov = KC.$(overlayId);
    const m = { open() { ov.classList.add("show"); }, close() { ov.classList.remove("show"); } };
    if (closeBtnId) KC.$(closeBtnId).addEventListener("click", m.close);
    ov.addEventListener("click", e => { if (e.target === ov) m.close(); });
    return m;
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
    });
  };
})(window.KC);
