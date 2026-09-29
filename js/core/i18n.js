/* core/i18n.js — languages, text lookup, static-markup translation, language switcher.

   Language packs live in js/lang/<lang>.ui.js and js/lang/<lang>.practices.js and
   register themselves with KC.addLang(lang, part, {...}) where part is
   "ui" (interface strings), "cats" (category names) or "items" (practice [name, hint]).

   To ENABLE a prepared language: fill its lang files, add it to LANGS in js/boot.js, then set enabled:true
   below. Until then it is never shown and links carrying it open in English.
   v600: a page loads only its own language (js/boot.js); loadLang() fetches another one when the user switches. */
(function (KC) {
  const LANGS = {
    ru: { label: "RU", name: "Русский",   locale: "ru-RU", enabled: true  },
    en: { label: "EN", name: "English",   locale: "en-GB", enabled: true  },
    es: { label: "ES", name: "Español",   locale: "es-ES", enabled: true  },
    ja: { label: "JA", name: "日本語",     locale: "ja-JP", enabled: true  },
    pt: { label: "PT", name: "Português (Brasil)", locale: "pt-BR", enabled: true  },
    th: { label: "TH", name: "ไทย",       locale: "th-TH", enabled: true  },
    zh: { label: "ZH", name: "繁體中文",   locale: "zh-TW", enabled: true, html: "zh-Hant" },  // html: <html lang> so browsers pick Traditional glyphs
  };
  const DEFAULT = "ru";          // for visitors whose browser language is not enabled
  const FALLBACK = ["en", "ru"]; // missing text -> try these packs

  const packs = {};
  const pack = l => packs[l] || (packs[l] = { ui: {}, cats: {}, items: {} });
  KC.addLang = (l, part, obj) => { Object.assign(pack(l)[part], obj); };

  let cur = DEFAULT;
  /* safety net: a page asked for a language boot.js did not load (should not happen) — fetch it at once */
  function loadSync(l) {
    const B = window.KC_BOOT, M = window.KC_MANIFEST; if (!B || !M) return;
    M.langFiles(l).forEach(f => { try { const x = new XMLHttpRequest(); x.open("GET", B.base + f + "?v=" + B.v, false); x.send();
      if (x.status === 200) (0, eval)(x.responseText); } catch (e) {} });
  }
  const chain = () => [cur].concat(FALLBACK.filter(x => x !== cur));

  const I = KC.i18n = {
    LANGS,
    known:   l => !!LANGS[l],
    usable:  l => !!(LANGS[l] && LANGS[l].enabled),
    enabled: () => Object.keys(LANGS).filter(l => LANGS[l].enabled),
    get lang() { return cur; },
    locale:  () => LANGS[cur].locale,
    set(l) { cur = I.usable(l) ? l : (I.known(l) ? "en" : DEFAULT); if (!I.loaded(cur)) loadSync(cur); document.documentElement.lang = LANGS[cur].html || cur; return cur; },
    /* is this language's pack here (its interface texts and practice names)? */
    loaded: l => !!(packs[l] && Object.keys(packs[l].ui).length && Object.keys(packs[l].items).length),
    /* fetch a language's files (then cb(true)); cb(false) when they could not be loaded (no network) */
    loadLang(l, cb) {
      if (I.loaded(l)) { cb(true); return; }
      const B = window.KC_BOOT, M = window.KC_MANIFEST;
      if (!B || !M) { cb(false); return; }
      const files = M.langFiles(l).filter(f => !(f.indexOf("/en.practices.") > 0 && packs.en && Object.keys(packs.en.items).length));
      let left = files.length, failed = false;
      files.forEach(f => { const s = document.createElement("script"); s.src = B.base + f + "?v=" + B.v; s.async = false;
        s.onload = () => { if (--left === 0) cb(!failed && I.loaded(l)); };
        s.onerror = () => { failed = true; if (--left === 0) cb(false); };
        document.body.appendChild(s); });
    },
    persist(l) { KC.ls.setRaw(KC.KEYS.lang, l); },

    /* order: link language -> ?lang= -> saved choice -> browser -> default */
    detect(hashLang) {
      let q = null; try { q = new URLSearchParams(location.search).get("lang"); } catch (e) {}
      const nav = (navigator.language || "").slice(0, 2).toLowerCase();
      const cands = [hashLang, q, KC.ls.raw(KC.KEYS.lang), nav];
      for (const c of cands) { if (c && I.known(c)) return I.usable(c) ? c : "en"; }
      return DEFAULT;
    },

    /* interface string; {name} placeholders filled from vars */
    t(key, vars) {
      let s;
      for (const l of chain()) { const p = packs[l]; if (p && p.ui[key] != null) { s = p.ui[key]; break; } }
      if (s == null) s = key;
      if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
      return s;
    },
    cat(id, lang) { return I._pick("cats", id, lang) || id; },
    /* practice -> {name, desc}; lang optional (defaults to current) */
    item(id, lang) { const v = I._pick("items", id, lang); return v ? { name: v[0], desc: v[1] || "" } : { name: id, desc: "" }; },
    _pick(part, id, lang) {
      const order = lang ? [lang].concat(FALLBACK) : chain();
      for (const l of order) { const p = packs[l]; if (p && p[part][id] != null) return p[part][id]; }
      return null;
    },
    /* strict check, no fallback: does <lang>'s own pack define this entry? */
    has(part, id, lang) { const p = packs[lang]; return !!(p && p[part][id] != null); },
    /* ids of the list that the current language does not translate (shown in English instead) */
    missing() { const out = []; KC.CATS.forEach(c => c.items.forEach(([, id]) => { if (!I.has("items", id, cur)) out.push(id); })); return out; },
    /* what goes between two sentences: Japanese puts none after 。 */
    sep: () => (cur === "ja" || cur === "zh" ? "" : " "),
    fieldLabel: f => I.t("profile." + f),
    optLabel: (f, o) => I.t("profile." + f + "." + o),

    /* translate static markup: data-i18n (text), data-i18n-html, data-i18n-ph, data-i18n-title */
    apply(root) {
      root = root || document;
      root.querySelectorAll("[data-i18n]").forEach(e => { e.textContent = I.t(e.dataset.i18n); });
      root.querySelectorAll("[data-i18n-html]").forEach(e => { e.innerHTML = I.t(e.dataset.i18nHtml); });
      root.querySelectorAll("[data-i18n-ph]").forEach(e => { e.placeholder = I.t(e.dataset.i18nPh); });
      root.querySelectorAll("[data-i18n-title]").forEach(e => { e.title = I.t(e.dataset.i18nTitle); e.setAttribute("aria-label", e.title); });
      const tt = document.querySelector("title[data-i18n]"); if (tt) document.title = (KC.BRAND ? KC.BRAND + " · " : "") + I.t(tt.dataset.i18n);
      /* search engines: the description and the canonical address follow the page language (v586) */
      const md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute("content", I.t("seo.desc"));
      if (KC.migrate && KC.migrate.NEW_URL && document.head) {
        let cl = document.querySelector('link[rel="canonical"]');
        if (!cl) { cl = document.createElement("link"); cl.rel = "canonical"; document.head.appendChild(cl); }
        cl.href = KC.migrate.NEW_URL + (location.pathname.split("/").pop() || "index.html") + "?lang=" + cur;
      }
    },

    /* segmented RU | EN switcher into #langSw; onChange(lang) re-renders the page */
    mountSwitcher(onChange) {
      const box = KC.$("langSw"); if (!box) return;
      const draw = () => {
        box.innerHTML = "";
        I.enabled().forEach(l => {
          const b = KC.el("button", "lang-btn" + (l === cur ? " on" : ""), LANGS[l].label);
          b.type = "button"; b.title = LANGS[l].name; b.dataset.lang = l;
          box.appendChild(b);
        });
      };
      box.addEventListener("click", e => {
        const b = e.target.closest("button[data-lang]"); if (!b || b.dataset.lang === cur || box.classList.contains("loading")) return;
        const want = b.dataset.lang;
        const go = () => {
          I.set(want); I.persist(cur); draw();
          /* drop a ?lang= left by page-to-page navigation so the new choice sticks on reload */
          try { const u = new URL(location.href); if (u.searchParams.has("lang")) { u.searchParams.delete("lang"); history.replaceState(null, "", u.pathname + u.search + u.hash); } } catch (e) {}
          onChange(cur);
        };
        if (I.loaded(want)) { go(); return; }
        box.classList.add("loading");   /* the language is fetched first (v600) */
        I.loadLang(want, ok => { box.classList.remove("loading"); if (ok) go(); else if (KC.toast) KC.toast(I.t("lang.fail")); });
      });
      draw();
    },
  };
})(window.KC);
