/* tools/build-lang-pages.js — makes the language pages ru/ en/ es/ pt/ ja/ th/ zh/ (v608).
   Run from the site folder after changing index.html or a translation:   node tools/build-lang-pages.js
   No dependencies. The tests build everything in memory and fail if a written file differs ("forgot to rebuild").

   Each <lang>/index.html is index.html with:
   - paths to css/ img/ js/ compare.html prefixed with "../";
   - the head in that language: <html lang>, title (seo.title), description (seo.desc), canonical, og:* and JSON-LD;
   - <html data-page-lang="xx">: js/core/i18n.js and js/boot.js then always use this language;
   - every data-i18n* element already filled (as KC.i18n.apply does), so the text is in the file itself;
   - the practice list (categories, names, hints) as plain text inside #list, visually hidden; render.js
     replaces it with the real list on load. It is there for search engines that do not run scripts.
   Also written: the hreflang block in index.html (between the hreflang:start / hreflang:end comments) and sitemap.xml,
   so every page carries the same list of language addresses. x-default = the English page (v609); the root page's
   canonical points there too (written in index.html), so the sitemap lists only the seven language pages. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");

const SITE = "https://klevatess.github.io/kinkmatch/";
/* language -> what search engines and previews need: hreflang code, og:locale */
const LANGS = [
  ["ru", { hreflang: "ru", locale: "ru_RU" }],
  ["en", { hreflang: "en", locale: "en_US" }],
  ["es", { hreflang: "es", locale: "es_ES" }],
  ["pt", { hreflang: "pt-BR", locale: "pt_BR" }],
  ["ja", { hreflang: "ja", locale: "ja_JP" }],
  ["th", { hreflang: "th", locale: "th_TH" }],
  ["zh", { hreflang: "zh-Hant", locale: "zh_TW" }],
];
const pageUrl = l => SITE + l + "/";
/* for languages without a page, and the address the root page points to (v609): the English page */
const X_DEFAULT = pageUrl("en");

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = s => esc(s).replace(/"/g, "&quot;");

/* the language packs, read the way the pages register them (KC.addLang) */
function loadPack(root, l) {
  const packs = {};
  const KC = { addLang(lang, part, obj) { const p = packs[lang] || (packs[lang] = { ui: {}, cats: {}, items: {} }); Object.assign(p[part], obj); } };
  const ctx = { KC, window: { KC } }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, "js/data/practices.js"), "utf8"), ctx);
  ["ui", "practices"].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, "js/lang/" + l + "." + f + ".js"), "utf8"), ctx));
  const p = packs[l];
  const t = k => { if (p.ui[k] == null) throw new Error(l + ": missing text " + k); return p.ui[k]; };
  return { t, cats: p.cats, items: p.items, CATS: ctx.KC.CATS };
}

function hreflangLines() {
  return LANGS.map(([l, o]) => '<link rel="alternate" hreflang="' + o.hreflang + '" href="' + pageUrl(l) + '">')
    .concat('<link rel="alternate" hreflang="x-default" href="' + X_DEFAULT + '">').join("\n");
}
function withHreflang(html) {
  const a = html.indexOf("<!-- hreflang:start"), b = html.indexOf("<!-- hreflang:end -->");
  if (a < 0 || b < 0) throw new Error("index.html: hreflang:start / hreflang:end comments not found");
  const start = html.slice(a, html.indexOf("-->", a) + 3);
  return html.slice(0, a) + start + "\n" + hreflangLines() + "\n" + html.slice(b);
}

/* one attribute value out of a tag's attribute text */
const attr = (attrs, name) => { const m = attrs.match(new RegExp("\\s" + name + '="([^"]*)"')); return m ? m[1] : null; };

/* fill data-i18n / -html / -ph / -title like KC.i18n.apply() (the elements are empty in index.html) */
function fillTexts(html, t) {
  return html.replace(/<([a-z0-9]+)(\s[^>]*?data-i18n[^>]*)>/g, (tag, name, attrs) => {
    let a = attrs;
    const ph = attr(a, "data-i18n-ph"), ti = attr(a, "data-i18n-title");
    if (ph) a += ' placeholder="' + escAttr(t(ph)) + '"';
    if (ti) a += ' title="' + escAttr(t(ti)) + '" aria-label="' + escAttr(t(ti)) + '"';
    return "<" + name + a + ">";
  }).replace(/<([a-z0-9]+)(\s[^>]*?data-i18n(-html)?="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g, (all, name, attrs, isHtml, key, inner) => {
    if (name === "title") return all;                     /* the head title is written separately */
    if (/<[a-z]/i.test(inner)) return all;                /* not a plain text element: leave it */
    return "<" + name + attrs + ">" + (isHtml ? t(key) : esc(t(key))) + "</" + name + ">";
  });
}

function staticList(P) {
  let h = '<div class="seo-list">';
  P.CATS.forEach(c => {
    h += "\n<section><h2>" + esc(P.cats[c.id] || c.id) + "</h2><ul>";
    c.items.forEach(([, id]) => { const v = P.items[id]; if (v) h += "<li>" + esc(v[0]) + (v[1] ? " — " + esc(v[1]) : "") + "</li>"; });
    h += "</ul></section>";
  });
  return h + "\n</div>";
}

function langPage(src, l, o, P) {
  const t = P.t, title = t("seo.title"), desc = t("seo.desc"), url = pageUrl(l);
  const htmlLang = o.hreflang === "zh-Hant" ? "zh-Hant" : l;
  const one = (h, re, to, what) => { if (!re.test(h)) throw new Error("index.html: " + what + " not found"); return h.replace(re, to); };
  let h = src;
  h = one(h, /<!-- index\.html — [\s\S]*?-->/, "<!-- GENERATED by tools/build-lang-pages.js from index.html — do not edit by hand. Language: " + l + " -->", "top comment");
  h = one(h, /<html lang="[^"]*">/, '<html lang="' + htmlLang + '" data-page-lang="' + l + '">', "<html lang>");
  h = one(h, /<title data-i18n="seo\.title">[^<]*<\/title>/, '<title data-i18n="seo.title">' + esc(title) + "</title>", "title");
  h = one(h, /<meta name="description" content="[^"]*">/, '<meta name="description" content="' + escAttr(desc) + '">', "description");
  h = one(h, /<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + url + '">', "canonical");
  h = one(h, /<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + escAttr(title) + '">', "og:title");
  h = one(h, /<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + escAttr(desc) + '">', "og:description");
  h = one(h, /<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + url + '">', "og:url");
  h = one(h, /<meta property="og:locale" content="[^"]*">(\n<meta property="og:locale:alternate" content="[^"]*">)*/,
    ['<meta property="og:locale" content="' + o.locale + '">'].concat(LANGS.filter(x => x[0] !== l).map(x => '<meta property="og:locale:alternate" content="' + x[1].locale + '">')).join("\n"), "og:locale");
  h = one(h, /<script type="application\/ld\+json">([^<]*)<\/script>/, (m, json) => {
    const d = JSON.parse(json); d.url = url; d.inLanguage = o.hreflang; d.description = desc;
    return '<script type="application/ld+json">' + JSON.stringify(d) + "</script>";
  }, "JSON-LD");
  /* files of the site root: one folder up */
  h = h.replace(/\s(src|href)="(?!https?:|#|data:|mailto:|\.\.\/)([^"]+)"/g, ' $1="../$2"');
  h = fillTexts(h, t);
  h = one(h, /<div id="list"><\/div>/, '<div id="list">' + staticList(P) + "</div>", "#list");
  return h;
}

function sitemap() {
  const alt = LANGS.map(([l, o]) => '    <xhtml:link rel="alternate" hreflang="' + o.hreflang + '" href="' + pageUrl(l) + '"/>')
    .concat('    <xhtml:link rel="alternate" hreflang="x-default" href="' + X_DEFAULT + '"/>').join("\n");
  const urls = LANGS.map(([l]) => pageUrl(l));   /* only canonical addresses: the root page points to /en/ (v609) */
  return '<?xml version="1.0" encoding="UTF-8"?>\n<!-- GENERATED by tools/build-lang-pages.js — do not edit by hand -->\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
    + urls.map(u => "  <url>\n    <loc>" + u + "</loc>\n" + alt + "\n  </url>").join("\n") + "\n</urlset>\n";
}

/* everything this tool writes: { "relative/path": content } */
function build(root) {
  const index = withHreflang(fs.readFileSync(path.join(root, "index.html"), "utf8"));
  const out = { "index.html": index, "sitemap.xml": sitemap() };
  LANGS.forEach(([l, o]) => { out[l + "/index.html"] = langPage(index, l, o, loadPack(root, l)); });
  return out;
}

module.exports = { build, LANGS: LANGS.map(x => x[0]), SITE };

if (require.main === module) {
  const root = path.join(__dirname, "..");
  const out = build(root);
  Object.keys(out).forEach(f => {
    const p = path.join(root, f);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const old = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
    if (old !== out[f]) fs.writeFileSync(p, out[f]);
    console.log((old === out[f] ? "  same     " : "  written  ") + f + "  (" + Math.round(Buffer.byteLength(out[f]) / 1024) + " KB)");
  });
}
