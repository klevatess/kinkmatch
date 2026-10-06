/* tests/harness.js — loads a page into jsdom and runs the modules in boot.js order. */
const fs = require("fs"), path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const vc = new VirtualConsole(); vc.on("jsdomError", e => { if (!/Not implemented: (navigation|HTMLCanvasElement)/.test(e.message)) console.error(e.message); });
const ROOT = process.env.SITE || path.join(__dirname, "..");
const BASE = "https://nekrons1.github.io/Kinkcheck/";

let PASS = 0, FAIL = 0; const fails = [];
function ok(c, m) { if (c) PASS++; else { FAIL++; fails.push(m); console.log("  FAIL:", m); } }
function eq(a, b, m) { ok(JSON.stringify(a) === JSON.stringify(b), m + "  got=" + JSON.stringify(a) + " want=" + JSON.stringify(b)); }

function manifest() {
  const w = { document: {} }; new Function("window", "document", fs.readFileSync(ROOT + "/js/boot.js", "utf8"))(w, {}); return w.KC_MANIFEST;
}
/* open a page. storage: {local:{}, session:{}} carried between "page loads" */
/* patch: { "core/migrate.js": src => src.replace(...) } — test a build variant (e.g. the old-site sender)
   base: page address (default: the old site) */
/* pages are not "visual" (no animation-frame loop), so a page nobody refers to any more is freed by the
   garbage collector — the whole suite fits in memory. (release/keep kept for compatibility: no-ops.) */
function release() {}
/* v621: the site ships with new things locked (KC.FEATURES false, announced one by one); tests see everything
   unlocked unless they ask for the shipped state with { locked: true } */
const FEAT_ALL = "KC.FEATURES = { wr: true, wh: true, leg: true, ow: true, wi: true, av: true }; KC.FEATURES.ext = true; KC.FEATURES.rz = true;";
function unlock(f, src, locked) { return f === "core/kc.js" && !locked ? src.replace(/KC\.FEATURES = \{[^}]*\};/, FEAT_ALL) : src; }
/* scope(): pages opened until .end() are closed by it (self-contained test blocks free their memory) */
let SCOPE = null;
const RECENT = [], MAX_OPEN = 22;
function scope() { SCOPE = []; return { end() { const s = SCOPE || []; SCOPE = null; s.forEach(w => { try { w.close(); } catch (e) {} }); } }; }
/* file: another form page, e.g. "ja/index.html" (v608 language pages) */
function open(page, { hash = "", search = "", storage = { local: {}, session: {} }, navLang = "ru", answers = {}, patch = {}, base = BASE, keep = false, file = null, locked = false } = {}) {
  file = file || (page === "compare" ? "compare.html" : "index.html");
  const html = fs.readFileSync(path.join(ROOT, file), "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
  const dom = new JSDOM(html, { url: base + file + search + (hash ? "#" + hash : ""), runScripts: "outside-only", pretendToBeVisual: false, virtualConsole: vc });
  const w = dom.window;
  if (SCOPE) SCOPE.push(w);
  /* memory: only the MAX_OPEN most recent pages stay alive (pages opened with keep:true are never closed).
     Tests use a page right after opening it, so an old page is not needed any more by then. */
  if (!keep) { RECENT.push(w); while (RECENT.length > MAX_OPEN) { try { RECENT.shift().close(); } catch (e) {} } }
  Object.defineProperty(w.navigator, "language", { value: navLang, configurable: true });
  for (const k in storage.local) w.localStorage.setItem(k, storage.local[k]);
  for (const k in storage.session) w.sessionStorage.setItem(k, storage.session[k]);
  w.confirm = () => answers.confirm !== false;
  w.prompt = (q, d) => answers.prompt !== undefined ? answers.prompt : d;
  w.QRCode = function () {}; w.QRCode.CorrectLevel = { M: 0 };
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  w.nav = null; // capture navigations
  const m = manifest();
  w.KC_MANIFEST = m;   /* as boot.js leaves it on a real page (the fallback language rule lives there) */
  /* v600: pages load one language (boot.js "@lang"); the tests load all of them, in the old order */
  const ALL = ["ru", "en", "pt", "es", "ja", "th", "zh"].map(l => "lang/" + l + ".ui.js").concat(["ru", "en", "pt", "es", "ja", "th", "zh"].map(l => "lang/" + l + ".practices.js"));
  const files = [].concat(...m.common.concat(m[page === "compare" ? "compare" : "form"]).map(f => f === "@lang" ? ALL : [f]));
  const errors = [];
  w.addEventListener("error", e => errors.push(e.message));
  for (const f of files) {
    try { const src = fs.readFileSync(path.join(ROOT, "js", f), "utf8"); w.eval((patch[f] ? patch[f](unlock(f, src, locked)) : unlock(f, src, locked)) + "\n//# sourceURL=" + f); }
    catch (e) { errors.push(f + ": " + e.message); }
  }
  return { dom, w, d: w.document, KC: w.KC, errors, storage: () => dump(w) };
}
function dump(w) {
  const local = {}, session = {};
  for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); local[k] = w.localStorage.getItem(k); }
  for (let i = 0; i < w.sessionStorage.length; i++) { const k = w.sessionStorage.key(i); session[k] = w.sessionStorage.getItem(k); }
  return { local, session };
}
const click = (w, el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const sleep = ms => new Promise(r => setTimeout(r, ms));
module.exports = { open, release, scope, ok, eq, click, sleep, ROOT, BASE, report: () => ({ PASS, FAIL, fails }) };
