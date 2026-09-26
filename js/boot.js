/* js/boot.js — the ONLY script tag in each page. Loads the page's modules in order.
   <script src="js/boot.js" data-page="form|compare" data-v="N"></script>
   Bump data-v in both HTML files after any change so browsers fetch fresh files.
   Adding a module = add its path to the right list below. */
(function () {
  var MANIFEST = {
    /* shared by both pages, in dependency order */
    common: [
      "core/kc.js", "core/i18n.js",
      "data/practices.js", "data/profile.js",
      "lang/ru.ui.js", "lang/en.ui.js", "lang/pt.ui.js", "lang/es.ui.js", "lang/ja.ui.js", "lang/th.ui.js", "lang/zh.ui.js",
      "lang/ru.practices.js", "lang/en.practices.js", "lang/pt.practices.js", "lang/es.practices.js", "lang/ja.practices.js", "lang/th.practices.js", "lang/zh.practices.js",
      "core/codec.js", "core/store.js", "core/match.js", "core/help.js", "core/stats.js", "core/migrate.js",
    ],
    form:    ["form/render.js", "form/events.js", "form/pdf.js", "form/share.js", "form/library.js", "form/migrate.js", "form/main.js"],
    compare: ["compare/main.js"],
  };
  window.KC_MANIFEST = MANIFEST;
  var me = document.currentScript;
  if (!me) return; // loaded by tests
  var v = me.getAttribute("data-v") || "0", page = me.getAttribute("data-page");
  var base = me.src.replace(/boot\.js.*$/, "");
  MANIFEST.common.concat(MANIFEST[page] || []).forEach(function (f) {
    var s = document.createElement("script");
    s.src = base + f + "?v=" + v;
    s.async = false; // keep execution order
    document.body.appendChild(s);
  });
})();
