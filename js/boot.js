/* js/boot.js — the ONLY script tag in each page. Loads the page's modules in order.
   <script src="js/boot.js" data-page="form|compare" data-v="N"></script>
   Bump data-v in both HTML files after any change so browsers fetch fresh files.
   Adding a module = add its path to the right list below.
   Languages (v600, owner): only the page's language is loaded ("@lang" below = its ui + practices files, plus the
   English practice names shown under the names); another language is fetched when the user switches to it
   (KC.i18n.loadLang). The language is picked here the same way as KC.i18n.detect: the page's own language
   (<html data-page-lang>, the /ru/ /en/ … pages, v608) -> the link's lg= (form page, a list or template link only)
   -> ?lang= -> the saved choice -> the browser -> fallback(): English, Russian for Belarusian/Kazakh browsers. */
(function () {
  var LANGS = ["ru", "en", "es", "ja", "pt", "th", "zh"];
  /* browser language we have no pack for -> English; these read Russian more often (owner, v608: Ukrainian -> English) */
  var RU_READERS = ["be", "kk"];
  function fallback(nav) { return RU_READERS.indexOf(nav) >= 0 ? "ru" : "en"; }
  var MANIFEST = {
    /* shared by both pages, in dependency order */
    common: [
      "core/kc.js", "core/i18n.js",
      "data/practices.js", "data/profile.js", "data/starters.js",
      "@lang",
      "core/ext.js", "core/lore.js", "core/codec.js", "core/store.js", "core/match.js", "core/help.js", "core/stats.js", "core/migrate.js", "core/portrait.js",
    ],
    form:    ["form/render.js", "form/events.js", "form/pdf.js", "form/share.js", "form/library.js", "form/signs.js", "form/dnd.js", "form/wod.js", "form/clusters.js", "form/wr.js", "form/wh.js", "form/legion.js", "form/ow.js", "form/witcher.js", "form/avatar.js", "form/rezero.js", "form/portrait.js", "form/nebula.js", "form/migrate.js", "form/main.js"],
    compare: ["form/signs.js", "form/dnd.js", "form/wod.js", "form/clusters.js", "form/wr.js", "form/wh.js", "form/legion.js", "form/ow.js", "form/witcher.js", "form/avatar.js", "form/rezero.js", "compare/space.js", "compare/main.js", "compare/roulette.js"],
    LANGS: LANGS,
    fallback: fallback,   /* also used by KC.i18n.detect, so both pick the same */
    /* the files of one language; English practice names are needed on every page (the grey line under a name) */
    langFiles: function (l) { var f = ["lang/" + l + ".ui.js", "lang/" + l + ".practices.js"]; if (l !== "en") f.push("lang/en.practices.js"); return f; },
  };
  window.KC_MANIFEST = MANIFEST;
  var me = document.currentScript;
  if (!me) return; // loaded by tests (they load every language)
  var v = me.getAttribute("data-v") || "0", page = me.getAttribute("data-page");
  var base = me.src.replace(/boot\.js.*$/, "");
  var pageLang = document.documentElement.getAttribute("data-page-lang");
  function pick() {
    if (pageLang && LANGS.indexOf(pageLang) >= 0) return pageLang;
    var c = [];
    try {
      var h = location.hash.replace(/^#/, "");
      if (page === "form" && /(^|&)(a|n|m|i|ti|fi|k)=/.test(h)) c.push(new URLSearchParams(h).get("lg"));
    } catch (e) {}
    try { c.push(new URLSearchParams(location.search).get("lang")); } catch (e) {}
    try { c.push(localStorage.getItem("checklist-lang")); } catch (e) {}
    var nav = (navigator.language || "").slice(0, 2).toLowerCase();
    c.push(nav);
    for (var i = 0; i < c.length; i++) if (c[i] && LANGS.indexOf(c[i]) >= 0) return c[i];
    return fallback(nav);
  }
  var lang = pick();
  window.KC_BOOT = { base: base, v: v, lang: lang };
  var files = [];
  MANIFEST.common.concat(MANIFEST[page] || []).forEach(function (f) { files = files.concat(f === "@lang" ? MANIFEST.langFiles(lang) : [f]); });
  files.forEach(function (f) {
    var s = document.createElement("script");
    s.src = base + f + "?v=" + v;
    s.async = false; // keep execution order
    document.body.appendChild(s);
  });
})();
