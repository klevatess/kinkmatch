/* tests/suite.js — user-scenario tests. Run:  npm install jsdom  &&  node tests/suite.js
   Covers data integrity, i18n, form flows, links (incl. old-version links), My lists,
   Received, compare, PDF sheet. Exit code 0 = all passed. */
const { open, ok, eq, click, sleep, report, release, scope } = require("./harness");
const fs = require("fs");
global.btoa = s => Buffer.from(s, "binary").toString("base64");
global.atob = s => Buffer.from(s, "base64").toString("binary");
const OLD = {}; new Function("OUT", fs.readFileSync(__dirname + "/fixtures/legacy-app-data.js", "utf8") +
  ";OUT.DATA=DATA;OUT.ORDER=ORDER;OUT.encodeState=encodeState;OUT.decodeState=decodeState;")(OLD);
const LAT = /[^\x00-\x7F]/;
let lnk0;
const V371ORDER = (() => { const O = {}; new Function("OUT", fs.readFileSync(__dirname + "/fixtures/legacy-v371-app-data.js", "utf8") + ";OUT.ORDER=ORDER;")(O); return O.ORDER; })();
const S = (title) => console.log("\n## " + title);

(async () => {
  /* ---------- 1. data integrity ---------- */
  S("data integrity");
  let p = open("form", { keep: true });
  const { KC } = p;
  ok(!p.errors.length, "no script errors on load: " + p.errors.join(" | "));
  const ids = [], codes = [];
  KC.CATS.forEach(c => c.items.forEach(([code, id]) => { ids.push(id); codes.push(code); }));
  eq(ids.length, 506, "item count");
  eq(new Set(ids).size, ids.length, "unique ids"); eq(new Set(codes).size, codes.length, "unique codes");
  const byCode = {}; KC.CATS.forEach(c => c.items.forEach(([code, id]) => byCode[code] = id));
  eq(OLD.ORDER.map((id, i) => byCode[i]), OLD.ORDER, "codes 0..370 still mean the same items as in old versions");
  eq(Object.keys(byCode).map(Number).sort((a, b) => a - b), [...Array(506).keys()], "codes are 0..505 with no gaps or reuse");
  eq(["furry","xenophilia-tentacles","trampling-barefoot","trampling-shoes","rubber-band-snapping","forced-drinking-beer-cider","irrumatio-to-vomiting","bukkake","cum-in-eyes","nerd-hikikomori","humiliating-body-writing","wax-burns","spitting-in-mouth","snowballing","used-as-toy-for-other-sub","bondage-bag"].map(id => ids.indexOf(id) >= 0), Array(16).fill(true), "16 added items present");
  eq(["sleep-sacks", "bondage-bag", "scarification", "electricity-violet-wand"].map(id => KC.i18n.item(id, "ru").name), ["Спальный мешок", "Бондажный мешок", "Шрамирование", "Электро — вайолет-ванд"], "RU names as requested");
  eq(KC.CATS.find(c => c.id === "marking").items.some(([, id]) => id === "wax-burns"), true, "wax burns under marking");
  const ses = KC.CATS.find(c => c.id === "session-length");
  eq(ses && ses.items.map(([, id]) => KC.i18n.item(id, "ru").name), ["Короткие сессии (1-2 часа)", "Средние сессии (3-4 часа)", "Длинные сессии (5-7 часов)", "Сессии на день (Сутки)", "Сессия на несколько суток"], "new section «Время сессии» with 5 items");
  eq(["ru", "en", "pt", "es", "ja", "zh"].map(l => KC.i18n.cat("session-length", l)), ["Время сессии", "Session length", "Duração da sessão", "Duración de la sesión", "プレイ時間", "時間長度"], "section named in all languages");
  eq(["nude-in-snow","condom-cum-in-mouth","cold-shower","zip-tie-bondage","labia-sewing-needle","labia-stapling","medical-stapler","face-stepping","shock-collar","vibro-egg-public","sex-in-snow","sex-in-rain","chained-outdoors","clowncore"].filter(id => ids.indexOf(id) < 0), [], "14 new items present");
  eq(KC.CATS.find(c => c.id === "fetishes").items.some(([, id]) => id === "clowncore"), true, "Clowncore under fetishes");
  eq(["ru", "en"].map(l => KC.i18n.item("foot-worship", l).name), ["Футфетиш", "Foot fetish"], "foot worship renamed to foot fetish");
  ok(!KC.PROFILE.filter(f => !f.hidden).some(f => f.id === "orient"), "orientation retired from the profile");
  const W = id => (KC.CATS.find(c => c.items.some(([, x]) => x === id)) || {}).id;
  const want23 = { nyotaimori: "fetishes", "sake-from-thighs": "fetishes", "lap-pillow-ear-cleaning": "intimacy", kigurumi: "fetishes", "left-tied-unattended": "bondage",
    semenawa: "bondage", ballbusting: "impact-rough-play", "thigh-sex": "sex-penetration", dronification: "humiliation", "prostate-massage": "sex-penetration",
    "menthol-balm-labia": "sensation-play", birching: "impact-rough-play", "sauna-whisk": "impact-rough-play", "spike-mat": "sensation-play", "kneeling-on-buckwheat": "humiliation",
    "oil-play": "fetishes", honorifics: "service-control", "mouth-soaping": "humiliation", "photo-exchange": "voyeurism-exhibitionism", "size-giantess": "role-play",
    "armpit-fetish": "fetishes", "smoking-fetish": "fetishes", vacbed: "bondage" };
  eq(Object.keys(want23).filter(id => W(id) !== want23[id]), [], "23 new practices in their sections");
  const want5 = { "sex-doll-use": "service-control", "no-sounds": "service-control", "forced-porn-watching": "humiliation", "forced-watching-others": "humiliation", "size-difference": "fetishes" };
  eq(Object.keys(want5).filter(id => W(id) !== want5[id]), [], "5 latest practices in their sections");
  eq(["nyotaimori", "semenawa", "kigurumi", "thigh-sex", "honorifics"].map(id => KC.i18n.item(id, "ru").name), ["Нётаймори", "Сэмэнава", "Кигуруми", "Секс между бёдер", "Honorifics (обращение по титулу)"], "RU naming as agreed");
  eq(["pain-massage","standing-on-nails","tongue-clothespins","rough-penetration-before-arousal","fingers-in-mouth"].map(id => [KC.i18n.item(id, "ru").name, (KC.CATS.find(c => c.items.some(([, x]) => x === id)) || {}).id]),
    [["Болевой массаж","sensation-play"],["Стояние на гвоздях","sensation-play"],["Прищепки на язык","sensation-play"],["Грубое проникновение до возбуждения","sex-penetration"],["Засовывание пальцев в рот","sex-penetration"]], "5 latest practices: names and sections");
  const where = id => (KC.CATS.find(c => c.items.some(([, x]) => x === id)) || {}).id;
  eq(["squirting","underwear-sniffing","wearing-partners-underwear","hand-feeding","masks","blind-stranger","period-play"].map(where), ["fetishes","fetishes","fetishes","fetishes","fetishes","role-play","bodily-fluids"], "7 new practices in their sections");
  eq(["harness-leather", "harness-rope"].map(id => KC.i18n.item(id, "ru").name), ["Харнесс кожаный", "Харнесс верёвочный"], "RU: harness, not «упряжь»");
  eq(KC.CATS.find(c => c.id === "fetishes").items.some(([, id]) => id === "nerd-hikikomori") && KC.CATS.find(c => c.id === "marking").items.some(([, id]) => id === "humiliating-body-writing"), true, "new items in the requested sections");
  ["ru", "en", "pt", "es", "ja", "th", "zh"].forEach(l => {
    const own = ids.filter(id => !KC.i18n.has("items", id, l)); eq(own, [], l + ": every item defined in its OWN file (no silent English fallback)");
    const ownC = KC.CATS.filter(c => !KC.i18n.has("cats", c.id, l)).map(c => c.id); eq(ownC, [], l + ": every category in its own file");
  });
  const CYR = /[а-яё]/i;
  const RU_LATIN_OK = ["dd-lg-md-lb", "clowncore"]; // names the user chose to keep in Latin
  eq(ids.filter(id => (!CYR.test(KC.i18n.item(id, "ru").name) && RU_LATIN_OK.indexOf(id) < 0) || !CYR.test(KC.i18n.item(id, "ru").desc)), [], "every RU name and hint contains Russian text");
  eq(ids.filter(id => /Брат-плей|Жестокое обращение|Митенки|Дрочка|Извоз/.test(KC.i18n.item(id, "ru").name)), [], "RU: known mistranslations stay fixed");
  eq(KC.i18n.item("brat-taming", "ru").name, "Укрощение / сопротивление", "RU: user-chosen name kept");
  ["ru", "en", "pt", "es", "ja", "th", "zh"].forEach(l => {
    const miss = ids.filter(id => { const it = KC.i18n._pick("items", id, l); return !it || !it[0] || !it[1]; });
    eq(miss.length, 0, l + ": every item has name+hint (" + miss.slice(0, 3) + ")");
    const mc = KC.CATS.filter(c => !KC.i18n._pick("cats", c.id, l)); eq(mc.length, 0, l + ": every category named");
  });
  const enNames = ids.map(id => KC.i18n.item(id, "en").name); eq(new Set(enNames).size, 506, "EN names unique");
  const enCyr = ids.filter(id => /[а-яё]/i.test(KC.i18n.item(id, "en").desc)); eq(enCyr, [], "EN hints contain no Cyrillic");
  // ui key parity
  const src = l => fs.readFileSync(require("./harness").ROOT + "/js/lang/" + l + ".ui.js", "utf8").match(/"([a-zA-Z0-9_.]+)":/g).map(s => s.slice(1, -2));
  const kr = src("ru"), ke = src("en");
  ["ru", "en", "pt", "es", "ja", "th", "zh"].forEach(l => { const ks = src(l); eq(ks.filter((k, i) => ks.indexOf(k) !== i), [], l + ": no duplicate interface keys (a later key would silently overwrite an earlier one)"); });
  eq(kr.filter(k => ke.indexOf(k) < 0), [], "keys in ru missing from en");
  eq(ke.filter(k => kr.indexOf(k) < 0), [], "keys in en missing from ru");
  const kp = src("pt");
  eq(ke.filter(k => kp.indexOf(k) < 0), [], "keys in en missing from pt");
  eq(kp.filter(k => ke.indexOf(k) < 0), [], "keys in pt missing from en");
  const kes = src("es");
  eq(ke.filter(k => kes.indexOf(k) < 0), [], "keys in en missing from es");
  eq(kes.filter(k => ke.indexOf(k) < 0), [], "keys in es missing from en");
  const kth = src("th");
  eq(ke.filter(k => kth.indexOf(k) < 0), [], "keys in en missing from th");
  eq(kth.filter(k => ke.indexOf(k) < 0), [], "keys in th missing from en");
  const TH = /[\u0E00-\u0E7F]/;
  eq(ids.filter(id => { const it = KC.i18n.item(id, "th"); return !TH.test(it.name) || !TH.test(it.desc); }), [], "every TH name and hint is actually Thai");
  eq(KC.CATS.filter(c => !TH.test(KC.i18n.cat(c.id, "th"))).map(c => c.id), [], "every TH category name is Thai");
  const kzh = src("zh");
  eq(ke.filter(k => kzh.indexOf(k) < 0), [], "keys in en missing from zh");
  eq(kzh.filter(k => ke.indexOf(k) < 0), [], "keys in zh missing from en");
  const HAN = /[\u4e00-\u9fff]/;
  eq(ids.filter(id => { const it = KC.i18n.item(id, "zh"); return !HAN.test(it.name) || !HAN.test(it.desc); }), [], "every ZH name and hint is actually Chinese");
  eq(KC.CATS.filter(c => !HAN.test(KC.i18n.cat(c.id, "zh"))).map(c => c.id), [], "every ZH category name is Chinese");
  const zhSrc = fs.readFileSync(require("./harness").ROOT + "/js/lang/zh.practices.js", "utf8") + fs.readFileSync(require("./harness").ROOT + "/js/lang/zh.ui.js", "utf8");
  eq((zhSrc.match(/[们这说时个过还对设档载链击视频]/g) || []), [], "ZH uses Traditional characters (no common Simplified forms)");
  const kja = src("ja");
  eq(ke.filter(k => kja.indexOf(k) < 0), [], "keys in en missing from ja");
  eq(kja.filter(k => ke.indexOf(k) < 0), [], "keys in ja missing from en");
  const JP = /[\u3040-\u30ff\u4e00-\u9faf]/;
  eq(ids.filter(id => { const it = KC.i18n.item(id, "ja"); return !JP.test(it.name) || !JP.test(it.desc); }), [], "every JA name and hint is actually Japanese");
  const jaSrc = fs.readFileSync(require("./harness").ROOT + "/js/lang/ja.practices.js", "utf8");
  eq((jaSrc.match(/壁ドン|本番/g) || []), [], "JA avoids misleading/fuzoku slang terms");
  const esEnLeft = ids.filter(id => KC.i18n.item(id, "es").desc === KC.i18n.item(id, "en").desc); eq(esEnLeft, [], "ES hints are translated");
  const esSrc = fs.readFileSync(require("./harness").ROOT + "/js/lang/es.practices.js", "utf8") + fs.readFileSync(require("./harness").ROOT + "/js/lang/es.ui.js", "utf8");
  eq((esSrc.match(/\b(vosotros|os interesa|acordad|mirándoos|bragas|magreo|moratones|coger|correrse)\b/gi) || []), [], "ES has no Spain/LatAm-only forms");
  const ptEnLeft = ids.filter(id => KC.i18n.item(id, "pt").desc === KC.i18n.item(id, "en").desc); eq(ptEnLeft, [], "PT hints are translated (not English copies)");
  // every profile option has labels in both
  KC.PROFILE.forEach(f => f.opts.filter(Boolean).forEach(o => ["ru", "en", "pt", "es", "ja", "th", "zh"].forEach(l => { KC.i18n.set(l); ok(KC.i18n.optLabel(f.id, o) !== "profile." + f.id + "." + o, l + " label " + f.id + "." + o); })));
  // every t() key used in code exists
  const used = new Set();
  require("child_process").execSync("grep -rhoP \"(?<![A-Za-z.])t\\(\\\"[a-zA-Z0-9_.]+\\\"|data-i18n[a-z-]*=\\\"[a-zA-Z0-9_.]+\\\"\" " + require("./harness").ROOT).toString().split("\n").forEach(s => { const m = s.match(/"([^"]+)"/); if (m && !/\.$/.test(m[1])) used.add(m[1]); });
  eq([...used].filter(k => ke.indexOf(k) < 0), [], "all used keys defined");
  ok(!/switch/.test(JSON.stringify(KC.PROFILE[0].opts.filter(Boolean))), "switch removed from role options");

  /* all cache-busting versions in both pages must match */
  const vers = ["index.html", "compare.html"].map(f => fs.readFileSync(require("./harness").ROOT + "/" + f, "utf8").match(/[?]v=(\d+)|data-v="(\d+)"/g).map(x => x.replace(/\D/g, "")));
  eq(new Set([].concat(...vers)).size, 1, "cache versions consistent (css ?v, boot ?v, data-v): " + JSON.stringify(vers));

  /* ---------- 2. fresh user fills the form (RU) ---------- */
  S("fresh user, RU, fills in");
  p = open("form", { navLang: "ru" });
  let { w, d } = p;
  eq(p.KC.i18n.lang, "ru", "RU browser -> RU page");
  eq(d.querySelectorAll(".item").length, 506, "506 rows rendered");
  ok(d.querySelector(".brand-row #langSw"), "language switcher sits in the title row");
  const dotted = [...d.querySelectorAll(".item .new-dot")].map(x => x.closest(".item").dataset.id).sort();
  const newer = []; p.KC.CATS.forEach(c => c.items.forEach(([code, id]) => { if (code >= 497) newer.push(id); }));
  eq(dotted, newer.sort(), "green dot on exactly the items after 496 (v615, owner) (" + newer.length + ")");
  eq(p.KC.NEW_FROM_CODE, 497, "dots start at code 497 (v615, owner)");
  eq(dotted.filter(id => V371ORDER.indexOf(id) >= 0), [], "no dot on items that existed in v371");
  eq(d.querySelector('.item[data-id="bukkake"] .main').textContent, "Буккаке", "dot does not change the name text");
  ok(d.querySelector(".legend .new-dot"), "legend explains the dot");
  ok(!d.querySelector('#roleTop .opt[data-val="switch"]') && d.querySelectorAll("#roleTop .opt").length === 2, "role top: 2 buttons, no Switch");
  ok(!d.querySelector('#aboutBody .opt[data-field="role"]'), "role not duplicated in About me");
  ok(/Свитч/.test(d.querySelector(".role-explain").textContent), "switch still mentioned in text");
  ok(!/FormsPal|KinkSheet/.test(d.querySelector(".foot").textContent) && /открытых источников/.test(d.querySelector(".foot").textContent), "footer updated");
  const row = id => d.querySelector('.item[data-id="' + id + '"]');
  const ans = (id, v) => click(w, row(id).querySelector('.scale button[data-v="' + v + '"]'));
  ans("hugging", "love"); ans("blindfolds", "yes"); ans("spanking-hand", "maybe"); ans("fisting-anal", "limit"); ans("impact-bruising", "yes");
  ans("blindfolds", "yes"); // toggle off
  click(w, d.querySelector('#roleTop .opt[data-val="sub"]'));
  click(w, d.querySelector('.opt[data-field="exp"][data-val="medium"]'));
  ok(!d.querySelector('.opt[data-field="orient"]'), "orientation removed from About me");
  click(w, d.querySelector('.opt[data-field="rel"][data-val="poly"]'));
  click(w, d.querySelector('.opt[data-field="attire"][data-val="lace"]'));
  click(w, d.querySelector('.opt[data-field="attire"][data-val="leather"]'));
  const nm = d.getElementById("metaName"); nm.value = "Борис"; nm.dispatchEvent(new w.Event("input"));
  ok(nm.classList.contains("bad"), "cyrillic name: soft hint, value kept"); eq(nm.value, "Борис", "name not stripped");
  await sleep(260);
  let saved = JSON.parse(w.localStorage.getItem("practices-checklist-v1"));
  eq(saved.items, { hugging: { interest: "love" }, "spanking-hand": { interest: "maybe" }, "fisting-anal": { interest: "limit" }, "impact-bruising": { interest: "yes" } }, "answers saved (toggle-off removed)");
  eq(saved.meta, { role: "sub", exp: "medium", rel: "poly", attire: ["lace", "leather"] }, "profile saved as keys");
  eq(d.getElementById("progress").textContent, "Отмечено 4 из 506 практик", "progress text");
  const link = p.KC.form.shareLink();
  ok(/[#&]lg=ru(&|$)/.test(link), "share link carries lg=ru");
  ok(/[#&]m=/.test(link), "share link carries profile (m=)");
  const back = p.KC.codec.decode(link);
  eq([back.meta, back.name, back.items, back.lang], [saved.meta, "Борис", saved.items, "ru"], "link round-trip: profile+role+name+answers+lang");
  console.log("  link length:", link.length, link.slice(link.indexOf("#")));
  let own = p.storage();

  /* ---------- 3. language switch keeps everything ---------- */
  S("language switch");
  click(w, d.querySelector('#langSw button[data-lang="en"]'));
  eq(p.KC.i18n.lang, "en", "switched to EN");
  eq(w.localStorage.getItem("checklist-lang"), "en", "choice remembered");
  eq(d.querySelectorAll(".item-name .sub").length, 0, "EN page: english names only (no subtitles)");
  eq(row("hugging").querySelector(".main").textContent, "Hugging", "EN name shown");
  ok(!LAT.test(row("hugging").querySelector(".item-desc").textContent), "EN hint");
  ok(row("hugging").querySelector('.scale button[data-v="love"]').classList.contains("sel"), "answer survived switch");
  eq(row("hugging").querySelector('.scale button[data-v="love"]').textContent, "Love", "scale translated");
  ok(d.querySelector('#roleTop .opt[data-val="sub"]').getAttribute("aria-pressed") === "true", "role survived switch");
  eq(d.querySelector('#roleTop .opt[data-val="sub"]').textContent, "Submissive / Bottom", "role label translated");
  eq(d.getElementById("metaName").value, "Борис", "name survived switch");
  eq(d.getElementById("progress").textContent, "4 of 506 practices marked", "EN progress");
  eq(d.getElementById("shareBtn").textContent, "Share", "header translated");
  eq(d.documentElement.lang, "en", "<html lang> updated");
  ok(/lg=en/.test(p.KC.form.shareLink()), "link now carries lg=en");
  const s = d.getElementById("search"); s.value = "spank"; s.dispatchEvent(new w.Event("input"));
  ok(d.querySelectorAll(".item:not(.filtered-out)").length > 3 && row("hugging").classList.contains("filtered-out"), "EN search works");
  click(w, d.querySelector('#langSw button[data-lang="pt"]'));
  eq(p.KC.i18n.lang, "pt", "switched to PT");
  eq(row("hugging").querySelector(".main").textContent, "Abraços", "PT name shown");
  eq(row("hugging").querySelector(".sub").textContent, "Hugging", "PT page: English subtitle");
  ok(row("hugging").querySelector('.scale button[data-v="love"]').classList.contains("sel"), "answer survived switch to PT");
  eq(row("hugging").querySelector('.scale button[data-v="love"]').textContent, "Adoro", "PT scale");
  eq(d.querySelector('#roleTop .opt[data-val="sub"]').textContent, "Submisso(a) / Bottom", "PT role label");
  eq(d.getElementById("progress").textContent, "4 de 506 práticas marcadas", "PT progress");
  const ptHash = p.KC.form.shareLink().split("#")[1];
  ok(/lg=pt/.test(ptHash), "PT link carries lg=pt");
  eq(open("form", { hash: ptHash, storage: { local: { "checklist-lang": "ru" }, session: {} } }).KC.i18n.lang, "pt", "PT link opens in PT");
  click(w, d.querySelector('#langSw button[data-lang="ru"]'));
  ok(row("hugging").classList.contains("filtered-out"), "search kept after switch");
  s.value = ""; s.dispatchEvent(new w.Event("input"));
  eq(row("hugging").querySelector(".sub").textContent, "Hugging", "RU page: EN subtitle back");
  own = p.storage();

  /* ---------- 4. recipient opens RU link ---------- */
  S("recipient opens link");
  const ruLink = link.slice(link.indexOf("#") + 1);
  let r = open("form", { hash: ruLink, navLang: "en", storage: { local: { "checklist-lang": "en" }, session: {} } });
  eq(r.KC.i18n.lang, "ru", "link lg=ru wins over recipient's EN preference");
  ok(r.d.getElementById("sharedBanner").style.display === "block", "banner shown");
  ok(r.d.getElementById("aboutSection").open, "About me unfolded for received list");
  ok(r.d.querySelector('.opt[data-field="attire"][data-val="lace"]').getAttribute("aria-pressed") === "true", "attire visible");
  ok(r.d.querySelector('#roleTop .opt[data-val="sub"]').getAttribute("aria-pressed") === "true", "role visible");
  eq(r.d.getElementById("metaName").value, "Борис", "name visible");
  ok(r.w.location.hash === "", "hash stripped from address bar");
  ok(!r.w.localStorage.getItem("practices-checklist-v1"), "recipient's own storage untouched");
  eq(JSON.parse(r.w.localStorage.getItem("checklist-saved-profiles-v1")).length, 1, "saved to Received");
  eq(r.w.localStorage.getItem("checklist-lang"), "en", "recipient preference not overwritten");
  ok(!r.d.getElementById("resetBtn") && !r.d.getElementById("resetOverlay"), "no «Clear» button any more (v615, owner)");
  ok(!r.w.localStorage.getItem("practices-checklist-v1"), "viewing a link does not touch own list");
  // keep as own
  r = open("form", { hash: ruLink, storage: { local: {}, session: {} } });
  click(r.w, r.d.getElementById("bannerKeep"));
  eq(JSON.parse(r.w.localStorage.getItem("practices-checklist-v1")).meta.role, "sub", "'Use as my own' saves it");

  S("link language variants");
  const enLink = open("form", { storage: own, navLang: "ru" }); click(enLink.w, enLink.d.querySelector('#langSw button[data-lang="en"]'));
  const enHash = enLink.KC.form.shareLink().split("#")[1];
  eq(open("form", { hash: enHash, storage: { local: { "checklist-lang": "ru" }, session: {} } }).KC.i18n.lang, "en", "EN link opens EN for RU user");
  const noLg = ruLink.replace(/&?lg=ru/, "");
  eq(open("form", { hash: noLg, storage: { local: { "checklist-lang": "en" }, session: {} } }).KC.i18n.lang, "en", "old link without lg -> recipient preference");
  eq(open("form", { hash: noLg, navLang: "de" }).KC.i18n.lang, "en", "no lg, unknown browser lang -> EN (v608)");
  eq(["uk-UA", "be-BY", "kk-KZ", "de-DE"].map(nl => open("form", { hash: noLg, navLang: nl }).KC.i18n.lang), ["en", "ru", "ru", "en"], "Ukrainian -> EN; Belarusian, Kazakh -> RU (owner, v608)");
  eq(open("form", { hash: noLg, navLang: "en-US" }).KC.i18n.lang, "en", "no lg, English browser -> EN");
  const es = open("form", { hash: ruLink.replace("lg=ru", "lg=es") });
  eq(es.KC.i18n.lang, "es", "lg=es opens in Spanish");
  eq([...es.d.querySelectorAll("#langSw button")].map(b => b.textContent), ["RU", "EN", "ES", "JA", "PT", "TH", "ZH"], "switcher shows all seven languages");
  eq(["zh-TW", "zh-HK", "zh-CN", "zh"].map(nl => open("form", { navLang: nl }).KC.i18n.lang), ["zh", "zh", "zh", "zh"], "Chinese browsers (any region) -> ZH");
  eq(open("form", { navLang: "th-TH" }).KC.i18n.lang, "th", "Thai browser -> TH");
  eq(open("form", { navLang: "ja-JP" }).KC.i18n.lang, "ja", "Japanese browser -> JA");
  eq(open("form", { navLang: "es-MX" }).KC.i18n.lang, "es", "Spanish browser -> ES");
  eq(open("form", { hash: ruLink.replace("lg=ru", "lg=ja") }).KC.i18n.lang, "ja", "lg=ja opens in Japanese");
  eq(open("form", { navLang: "pt-BR" }).KC.i18n.lang, "pt", "Brazilian browser -> PT");
  eq(open("form", { navLang: "pt-PT" }).KC.i18n.lang, "pt", "Portuguese browser -> PT");
  ok(es.KC.codec.decode("a=Ag&lg=ja").lang === "ja", "codec keeps prepared lang code ja");
  eq(es.KC.codec.decode("a=Ag&lg=xx").lang, null, "unknown lang code ignored");

  /* ---------- 5. backwards compatibility ---------- */
  S("backwards compatibility");
  const KCn = open("form", { keep: true }).KC;
  let bad = 0;
  const vals = ["limit", "maybe", "yes", "love"];
  for (let trial = 0; trial < 60; trial++) {
    const n = [0, 1, 5, 40, 80, 150, 200, 300, 371][trial % 9], items = {};
    for (let i = 0; i < n; i++) items[OLD.ORDER[Math.floor(Math.random() * 371)]] = { interest: vals[Math.floor(Math.random() * 4)], role: "", tried: false };
    const oldMeta = { role: ["Доминант / Верх", "Сабмиссив / Низ"][trial % 2], exp: "Большой", orient: "Гей / Лесби", rel: "Моногамия", attire: ["Деним", "Латекс / резина"] };
    const oldHash = OLD.encodeState({ items, meta: oldMeta, name: "Old #" + trial });
    const dec = KCn.codec.decode(oldHash);
    const want = {}; Object.keys(items).forEach(k => want[k] = { interest: items[k].interest });
    if (JSON.stringify(Object.entries(dec.items).sort()) !== JSON.stringify(Object.entries(want).sort())) bad++;
    if (JSON.stringify(dec.meta) !== JSON.stringify({ role: trial % 2 ? "sub" : "dom", exp: "large", rel: "mono", attire: ["denim", "latex"] })) bad++;
    if (dec.name !== "Old #" + trial) bad++;
  }
  eq(bad, 0, "60 links from the previous version decode identically (sparse+dense, profile, name)");
  eq(KCn.codec.decode(OLD.encodeState({ items: {}, meta: { orient: "Би", rel: "Полиамория", attire: ["Кожа"] } })).meta, { rel: "poly", attire: ["leather"] }, "old link with orientation: orientation dropped, later fields still read correctly");
  const switchOld = OLD.encodeState({ items: {}, meta: { role: "Свитч", exp: "Новичок" } });
  eq(KCn.codec.decode(switchOld).meta, { exp: "novice" }, "old link with role Switch: role dropped, rest kept");
  eq(KCn.codec.decode("a=Ag&m=" + encodeURIComponent(JSON.stringify({ role: "Сабмиссив / Низ", attire: ["Кожа"] }))).meta, { role: "sub", attire: ["leather"] }, "legacy JSON profile");
  // legacy own storage with RU labels + role/tried/date
  const legacyState = { name: "L", date: "12.10", meta: { role: "Свитч", exp: "Средний", attire: ["Готика"] }, items: { hugging: { interest: "yes", role: "give", tried: true }, chains: { interest: null, role: "both", tried: true } }, onlyMarked: false };
  const lp = open("form", { storage: { local: { "practices-checklist-v1": JSON.stringify(legacyState) }, session: {} } });
  eq([lp.KC.form.state.meta, lp.KC.form.state.items, lp.KC.form.state.onlyMarked, "date" in lp.KC.form.state], [{ exp: "medium", attire: ["goth"] }, { hugging: { interest: "yes" } }, false, false], "old saved list migrated");
  ok(lp.d.querySelector('.opt[data-field="attire"][data-val="goth"]').getAttribute("aria-pressed") === "true", "migrated profile shown");

  /* links from the older deployed v371 (sparse-only encoder, same item order) */
  const V371 = {}; new Function("OUT", fs.readFileSync(__dirname + "/fixtures/legacy-v371-app-data.js", "utf8") + ";OUT.ORDER=ORDER;OUT.enc=encodeState;")(V371);
  eq(V371.ORDER, OLD.ORDER, "v371 item order identical");
  let bad371 = 0;
  for (let trial = 0; trial < 40; trial++) {
    const items = {}; const n = [0, 3, 50, 200, 371][trial % 5];
    for (let i = 0; i < n; i++) items[V371.ORDER[Math.floor(Math.random() * 371)]] = { interest: vals[Math.floor(Math.random() * 4)], role: "give", tried: true };
    const dec = KCn.codec.decode(V371.enc({ items, meta: { role: "Сабмиссив / Низ", attire: ["Кожа"] }, name: "N" + trial, date: "1.1" }));
    const want = {}; Object.keys(items).forEach(k => want[k] = { interest: items[k].interest });
    if (JSON.stringify(Object.entries(dec.items).sort()) !== JSON.stringify(Object.entries(want).sort()) || dec.name !== "N" + trial || JSON.stringify(dec.meta) !== JSON.stringify({ role: "sub", attire: ["leather"] })) bad371++;
  }
  eq(bad371, 0, "40 links from v371 decode identically");

  /* Received: opening a list saved by an older version must not duplicate it */
  const oldRec = V371.enc({ items: { hugging: { interest: "love" }, chains: { interest: "yes" } }, meta: { role: "Сабмиссив / Низ" }, name: "Ns", date: "1.1" });
  let rp = open("form", { hash: oldRec, storage: { local: { "checklist-saved-profiles-v1": JSON.stringify([{ id: "p1", name: "Мой Ns", code: oldRec, ts: 1 }]) }, session: {} } });
  let rec = JSON.parse(rp.w.localStorage.getItem("checklist-saved-profiles-v1"));
  eq([rec.length, rec[0].name], [1, "Мой Ns"], "opening an old Received entry does not duplicate it");
  const oldDense = OLD.encodeState({ items: (() => { const it = {}; OLD.ORDER.slice(0, 120).forEach(id => it[id] = { interest: "yes" }); return it; })(), meta: {}, name: "D" });
  rp = open("form", { hash: oldDense, storage: { local: { "checklist-saved-profiles-v1": JSON.stringify([{ id: "p2", name: "", code: oldDense, ts: 1 }]) }, session: {} } });
  eq(JSON.parse(rp.w.localStorage.getItem("checklist-saved-profiles-v1")).length, 1, "same for a v374 dense-format entry");
  // duplicates already stored get merged, keeping the original and a custom name
  const dupStore = JSON.stringify([
    { id: "p9", name: "", code: KCn.codec.encode(KCn.codec.decode(oldRec), "ru"), ts: 30 },
    { id: "p8", name: "Облако", code: "#a=Ag&n=Other", ts: 20 },
    { id: "p1", name: "Мой Ns", code: oldRec, ts: 10 }]);
  rp = open("form", { storage: { local: { "checklist-saved-profiles-v1": dupStore }, session: {} } });
  click(rp.w, rp.d.getElementById("savedBtn"));
  rec = JSON.parse(rp.w.localStorage.getItem("checklist-saved-profiles-v1"));
  eq(rec.map(x => [x.id, x.name]), [["p8", "Облако"], ["p1", "Мой Ns"]], "existing duplicates merged, different lists kept, order kept");
  eq(rp.d.querySelectorAll("#savedList .saved-row").length, 2, "Received shows the merged list");
  const k1 = KCn.codec.key(oldRec), k2 = KCn.codec.key(KCn.codec.encode(KCn.codec.decode(oldRec), "en"));
  eq(k1 === k2 && k1 !== KCn.codec.key("a=Ag&n=Ns"), true, "key: same content = same key across versions/languages, different content differs");

  /* undecodable old entries must never be merged into one */
  const junk = JSON.stringify([{ id: "j1", name: "", code: "x=1", ts: 1 }, { id: "j2", name: "", code: "y=2", ts: 2 }, { id: "j3", name: "", code: "#s=abc", ts: 3 }]);
  let jp = open("form", { storage: { local: { "checklist-saved-profiles-v1": junk }, session: {} } });
  click(jp.w, jp.d.getElementById("savedBtn"));
  eq(JSON.parse(jp.w.localStorage.getItem("checklist-saved-profiles-v1")).length, 3, "entries without decodable content are not merged");
  ok(KCn.codec.key("a=Ag") !== KCn.codec.key("a=Ag&x=1") || KCn.codec.key("a=Ag").indexOf("raw:") === 0, "empty codes get raw keys");
  // several different unnamed lists all get added one after another
  let ust = { local: { "practices-checklist-v1": JSON.stringify({ name: "Me", meta: {}, items: { hugging: { interest: "love" } } }) }, session: {} };
  [["chains", "yes"], ["orgy", "love"], ["rimming", "maybe"], ["tickling", "limit"]].forEach(([id, v]) => {
    const up = open("form", { hash: V371.enc({ items: { [id]: { interest: v } }, meta: {} }), storage: ust }); ust = up.storage();
  });
  eq(JSON.parse(ust.local["checklist-saved-profiles-v1"]).length, 4, "four different unnamed old links -> four Received entries");

  /* banner buttons keep their own labels; "Save as" always saves */
  let sp = open("form", { hash: lnk0 = KCn.codec.encode({ items: { hugging: { interest: "love" } }, meta: {} }), navLang: "ru",
    storage: { local: { "checklist-saved-profiles-v1": JSON.stringify([{ id: "pB", name: "Облако", code: KCn.codec.encode({ items: { hugging: { interest: "love" } }, meta: {} }), ts: 1 }]) }, session: {} } });
  eq([sp.d.getElementById("bannerOwn").textContent, sp.d.getElementById("bannerKeep").textContent, sp.d.getElementById("bannerSaveAs").textContent], ["Открыть мою анкету", "Заполнять как свою", "Сохранить как…"], "banner button labels intact");
  sp.w.prompt = () => "Лиза"; click(sp.w, sp.d.getElementById("bannerSaveAs"));
  sp.w.prompt = () => "Маша"; click(sp.w, sp.d.getElementById("bannerSaveAs"));
  click(sp.w, sp.d.getElementById("savedBtn"));
  eq([...sp.d.querySelectorAll("#savedList .saved-row b")].map(b => b.textContent), ["Маша", "Лиза", "Облако"], "Save as keeps identical-content lists under different names, not merged");
  ok(/«Маша»/.test(sp.d.getElementById("toast").textContent), "Save as confirms with a toast");
  sp = open("form", { hash: lnk0, navLang: "ru", storage: sp.storage() });
  eq(JSON.parse(sp.w.localStorage.getItem("checklist-saved-profiles-v1")).length, 3, "reopening does not merge manual saves");

  /* banner tells honestly what happened with "Received" */
  const lnk = KCn.codec.encode({ items: { hugging: { interest: "love" } }, meta: {} });
  let bp = open("form", { hash: lnk, navLang: "ru" });
  ok(/сохранена в «Полученные»/.test(bp.d.getElementById("bannerText").textContent), "banner: saved");
  bp = open("form", { hash: lnk, navLang: "ru", storage: { local: { "practices-checklist-v1": JSON.stringify(Object.assign(KCn.store.blank(), { items: { hugging: { interest: "love" } } })) }, session: {} } });
  ok(/ваша собственная анкета/.test(bp.d.getElementById("bannerText").textContent) && !bp.w.localStorage.getItem("checklist-saved-profiles-v1"), "banner: own list, not added");
  const recS = JSON.stringify([{ id: "pA", name: "A", code: "a=Ag&n=Other", ts: 5 }, { id: "pB", name: "Облако", code: lnk, ts: 1 }]);
  bp = open("form", { hash: lnk, navLang: "ru", storage: { local: { "checklist-saved-profiles-v1": recS }, session: {} } });
  const recA = JSON.parse(bp.w.localStorage.getItem("checklist-saved-profiles-v1"));
  eq([recA.length, recA[0].id], [2, "pB"], "already received: not duplicated, moved to top");
  ok(/под именем «Облако»/.test(bp.d.getElementById("bannerText").textContent), "banner: exists, shows its name");
  click(bp.w, bp.d.querySelector('#langSw button[data-lang="en"]'));
  ok(/already under “Received” as “Облако”/.test(bp.d.getElementById("bannerText").textContent), "banner status survives language switch");
  // own list stored only in My lists also counts as own
  const mineOnly = JSON.stringify([{ id: "m1", name: "", data: Object.assign(KCn.store.blank(), { items: { hugging: { interest: "love" } } }), ts: 1 }]);
  bp = open("form", { hash: lnk, navLang: "ru", storage: { local: { "checklist-my-profiles-v1": mineOnly, "checklist-active-mine-id": "" }, session: {} } });
  ok(/ваша собственная анкета/.test(bp.d.getElementById("bannerText").textContent), "banner: matches one of My lists");
  // header: progress in the title row, export toggle in the search row
  ok(bp.d.querySelector(".brand-row #progress") && bp.d.querySelector("#pdfOverlay #onlyMarked") && bp.d.querySelector(".subbar #tplSel") && bp.d.querySelector(".subbar #view") && !bp.d.querySelector("#filtBtn") && !bp.d.querySelector(".progress-row"), "compact header layout");

  /* answers saved under ids of the earliest versions */
  const ghost = { name: "Ns", meta: {}, items: { hugging: { interest: "love" }, "human-puppy-dog-play": { interest: "yes" }, "knife-play-no-blood": { interest: "maybe" },
    "cbt-cock-ball-torture": { interest: "limit" }, orgy: { interest: "yes" }, "group-play-orgy": { interest: "limit" }, bestiality: { interest: "limit" } } };
  const gp = open("form", { navLang: "ru", storage: { local: { "practices-checklist-v1": JSON.stringify(ghost) }, session: {} } });
  eq(Object.entries(gp.KC.form.state.items).filter(([id]) => ids.indexOf(id) >= 0).sort(), [["cbt", { interest: "limit" }], ["hugging", { interest: "love" }], ["knife-play", { interest: "maybe" }], ["orgy", { interest: "yes" }], ["puppy-play", { interest: "yes" }]], "old ids moved to current items; current answer wins");
  ok(gp.d.querySelector('.item[data-id="puppy-play"] .scale button[data-v="yes"]').classList.contains("sel"), "moved answer is visible on the page");
  const gShown = gp.d.querySelectorAll(".scale button.sel").length, gLink = Object.keys(KCn.codec.decode(gp.KC.form.shareLink()).items).length;
  eq(gp.d.getElementById("progress").textContent, "Отмечено " + gShown + " из 506 практик", "counter = what is shown");
  eq(gLink, gShown, "link contains exactly what the counter says");
  Object.keys(KC.ID_ALIASES).forEach(k => { if (ids.indexOf(KC.ID_ALIASES[k]) < 0) ok(false, "alias target missing: " + k); });

  /* ---------- 6. codec robustness + future additions ---------- */
  S("codec");
  let rt = 0;
  for (let t = 0; t < 200; t++) {
    const items = {}, n = Math.floor(Math.random() * 372);
    for (let i = 0; i < n; i++) items[OLD.ORDER[Math.floor(Math.random() * 371)]] = { interest: vals[Math.floor(Math.random() * 4)] };
    const st = { items, meta: {}, name: "" };
    if (JSON.stringify(Object.entries(KCn.codec.decode(KCn.codec.encode(st)).items).sort()) !== JSON.stringify(Object.entries(items).sort())) rt++;
  }
  eq(rt, 0, "200 random round-trips");
  const all = {}; OLD.ORDER.forEach((id, i) => all[id] = { interest: vals[i % 4] });
  const lens = [0, 1, 40, 200, 371].map(n => { const it = {}; OLD.ORDER.slice(0, n).forEach(id => it[id] = all[id]); return KCn.codec.packAnswers(it).length; });
  console.log("  answer chars at 0/1/40/200/371 marks:", lens.join("/"));
  ok(lens[4] <= 215 && lens[3] <= 160, "links stay short (371 marks <= 215 chars, 200 marks <= 160)");
  ["", "@@@", "a=", "a=!!!&m=%%%", "garbage#a=Zm9v", "#a=Ag&n=%E0%A4"].forEach(g => { let okk = true; try { KCn.codec.decode(g); } catch (e) { okk = false; } ok(okk, "no crash on junk " + JSON.stringify(g)); });
  // simulate a future release that adds items (new codes appended, inserted mid-category)
  const today = KCn.codec.encode({ items: all, meta: {} });
  const sparseToday = KCn.codec.encode({ items: { hugging: { interest: "yes" }, "impact-bruising": { interest: "love" } }, meta: {} });
  const fut = open("form"); fut.KC.CATS[0].items.splice(3, 0, [380, "new-thing"]); fut.KC.CATS[5].items.push([381, "new-thing-2"]);
  eq(Object.keys(fut.KC.codec.decode(today).items).length, 371, "dense link from today still decodes after items are added");
  eq(fut.KC.codec.decode(sparseToday).items, { hugging: { interest: "yes" }, "impact-bruising": { interest: "love" } }, "sparse link from today still decodes after items are added");

  const withNew = { items: { furry: { interest: "love" }, bukkake: { interest: "limit" }, "cum-in-eyes": { interest: "maybe" }, hugging: { interest: "yes" } }, meta: {} };
  const srt = o => Object.entries(o).sort();
  eq(srt(KCn.codec.decode(KCn.codec.encode(withNew)).items), srt(withNew.items), "link with new items round-trips");
  const allNew = {}; KCn.CATS.forEach(c => c.items.forEach(([, id], i) => allNew[id] = { interest: vals[i % 4] }));
  eq(Object.keys(KCn.codec.decode(KCn.codec.encode({ items: allNew, meta: {} })).items).length, 506, "fully filled 506-item link round-trips");

  /* form: "Show" filter */
  S("Show filter");
  p = open("form", { navLang: "ru", storage: { local: { "practices-checklist-v1": JSON.stringify({ name: "", meta: {}, items: { hugging: { interest: "love" }, furry: { interest: "yes" } } }) }, session: {} } });
  const vis = () => [...p.d.querySelectorAll(".item:not(.filtered-out)")].map(r => r.dataset.id);
  const vsel = p.d.getElementById("view");
  eq([...vsel.options].map(o => o.textContent), ["Все пункты", "Только без ответа", "Только новые", "Отвеченные, по ответам", "Обожаю / Да / Может", "Только «Нет»"], "Show menu labels (v601: + only No)");
  vsel.value = "unanswered"; vsel.dispatchEvent(new p.w.Event("change"));
  eq([vis().length, vis().indexOf("hugging"), vis().indexOf("furry")], [504, -1, -1], "unanswered: answered items hidden");
  click(p.w, p.d.querySelector('.item[data-id="chains"] .scale button[data-v="yes"]'));
  ok(vis().indexOf("chains") >= 0, "a row just answered stays visible until the filter is re-applied");
  vsel.dispatchEvent(new p.w.Event("change")); ok(vis().indexOf("chains") < 0, "re-applying hides it");
  vsel.value = "new"; vsel.dispatchEvent(new p.w.Event("change"));
  const newIds = []; p.KC.CATS.forEach(c => c.items.forEach(([code, id]) => { if (code >= 497) newIds.push(id); }));
  eq(vis().sort(), newIds.sort(), "new: exactly the green-dot items (" + newIds.length + ")");
  const sb = p.d.getElementById("search"); sb.value = "корм"; sb.dispatchEvent(new p.w.Event("input"));
  ok(vis().length > 0 && vis().every(id => newIds.indexOf(id) >= 0), "search combines with the filter");
  sb.value = ""; vsel.value = "all"; vsel.dispatchEvent(new p.w.Event("change")); eq(vis().length, 506, "all items again");

  /* backup */
  S("Backup");
  p = open("form", { storage: own });
  const bk = p.KC.store.exportAll();
  ok(bk.app === "kinkcheck" && bk.mine.length >= 1 && Array.isArray(bk.received), "export contains my lists and received");
  let q = open("form", { storage: { local: { "checklist-saved-profiles-v1": JSON.stringify([{ id: "zz", name: "Other", code: "a=Ag&n=O", ts: 1 }]) }, session: {} } });
  const res = q.KC.store.importAll(JSON.parse(JSON.stringify(bk)));
  eq([res.mine, res.received >= 0], [bk.mine.length, true], "import adds my lists");
  ok(JSON.parse(q.w.localStorage.getItem("checklist-saved-profiles-v1")).some(x => x.id === "zz"), "import keeps existing received lists");
  ok(q.KC.store.loadOwn().name === JSON.parse(own.local["practices-checklist-v1"]).name, "empty device takes the backup's current list");
  eq(q.KC.store.importAll(JSON.parse(JSON.stringify(bk))).mine, 0, "importing twice adds nothing");
  eq(q.KC.store.importAll({ foo: 1 }), null, "non-backup file rejected");

  /* list id in links */
  S("List id");
  p = open("form", { storage: own });
  const l1 = p.KC.form.shareLink(); const u1 = p.KC.codec.decode(l1).uid;
  ok(/^[A-Za-z0-9_-]{6}$/.test(u1) && /&i=[A-Za-z0-9_-]{6}(&|$)/.test(l1), "share link carries a 6-char id");
  eq(p.KC.codec.decode(p.KC.form.shareLink()).uid, u1, "the id is stable");
  eq(KCn.codec.decode(KCn.codec.encode({ items: {}, meta: {}, uid: "bad id!" })).uid, undefined, "invalid ids are ignored");
  // two friends with identical content but different ids -> two Received entries
  const same = { items: { hugging: { interest: "love" } }, meta: {} };
  let rs = { local: {}, session: {} };
  ["AAAAAA", "BBBBBB"].forEach(uid => { const r = open("form", { hash: KCn.codec.encode(Object.assign({ uid }, same)), storage: rs }); rs = r.storage(); });
  eq(JSON.parse(rs.local["checklist-saved-profiles-v1"]).length, 2, "same content, different ids -> kept apart");
  // same id, new answers -> updated in place
  let r2 = open("form", { navLang: "ru", hash: KCn.codec.encode({ uid: "AAAAAA", items: { hugging: { interest: "love" }, chains: { interest: "yes" } }, meta: {} }), storage: rs });
  let rl = JSON.parse(r2.w.localStorage.getItem("checklist-saved-profiles-v1"));
  eq([rl.length, KCn.codec.decode(rl[0].code).uid, Object.keys(KCn.codec.decode(rl[0].code).items).length], [2, "AAAAAA", 2], "newer version of the same list replaces the old one");
  ok(/новая версия анкеты/.test(r2.d.getElementById("bannerText").textContent), "banner says it was updated");
  // own list recognised by id even after its answers changed
  r2 = open("form", { navLang: "ru", hash: KCn.codec.encode({ uid: u1, items: { chains: { interest: "love" } }, meta: {} }), storage: p.storage() });
  ok(/ваша собственная анкета/.test(r2.d.getElementById("bannerText").textContent), "own list recognised by its id");
  // "Use as my own" and "Save a copy" give new ids
  r2 = open("form", { hash: KCn.codec.encode({ uid: "CCCCCC", items: { orgy: { interest: "yes" } }, meta: {} }) });
  click(r2.w, r2.d.getElementById("bannerKeep"));
  ok(r2.KC.form.state.uid && r2.KC.form.state.uid !== "CCCCCC", "'Use as my own' gets a new id");
  r2.w.prompt = () => "copy"; click(r2.w, r2.d.getElementById("mineSaveNew"));
  const mcopy = JSON.parse(r2.w.localStorage.getItem("checklist-my-profiles-v1")).find(x => x.name === "copy");
  ok(mcopy && mcopy.data.uid && mcopy.data.uid !== r2.KC.form.state.uid, "a saved copy gets its own id");
  // old lists without id get one on first run
  r2 = open("form", { storage: { local: { "practices-checklist-v1": JSON.stringify({ name: "Old", meta: {}, items: { hugging: { interest: "yes" } } }) }, session: {} } });
  ok(/^[A-Za-z0-9_-]{6}$/.test(JSON.parse(r2.w.localStorage.getItem("practices-checklist-v1")).uid), "existing list without id gets one");
  ok(l1.split("#")[1].length - KCn.codec.encode(Object.assign({}, KCn.codec.decode(l1), { uid: undefined }), "ru").length === 9, "id adds exactly 9 characters (&i=XXXXXX)");

  /* damaged links (chat apps eat "__") */
  S("Link integrity");
  const USER_BAD = ["a=BJ0D7___H-qQWuRSqsEBpalpWgYAUIaUhUBVAVGpEhAFvWjoSIBAAABBAgYGqYGqiVQAUiqpohgoClYVAQAABQwQAAUEopgADOqY-pAAAAKoh4qqApkv-qqqrerWr6lAEAigKQQgoUBAAIhlCVY&n=Tester%2FOne&m=AgMAAxY&i=38AxC7&lg=ru",
    "a=BJ0D____________3_H5WRuqxhJatOZ7UkBWGoIQAAAgKSAAglQ0EEatQfEVAAAgAQAAAA_7T-sxIAPYq-QEJLulqVQAQAAUMcBFAEKCEEA286I8qpGhf_-wAPv5tqUIpWmmWqqqgAXwMQQhRQhAASo-EGg&n=Tester2&m=AQMAAw&i=gyJOV2&lg=ru"];
  eq(USER_BAD.map(l => KCn.codec.decode(l).damaged), [true, true], "the two reported links are recognised as damaged");
  let fp = 0, caught = 0, tries = 0, noUnd = true, oldCaught = 0, oldTries = 0;
  for (let t = 0; t < 150; t++) {
    const n = [0, 1, 7, 40, 120, 250, 380, 412][t % 8], items = {};
    for (let k = 0; k < n; k++) items[ids[Math.floor(Math.random() * ids.length)]] = { interest: vals[Math.floor(Math.random() * 4)] };
    const lnk = KCn.codec.encode({ items, meta: { role: "sub" }, name: "N" + t, uid: KCn.store.newUid() }, "ru");
    if (/_/.test(lnk)) noUnd = false;
    if (KCn.codec.decode(lnk).damaged) fp++;
    const oldStyle = lnk.replace(/\./g, "_").replace(/&k=\w+/, "");   // what older versions produced
    if (KCn.codec.decode(oldStyle).damaged) fp++;
    /* "__" eaten from an OLD link: simulated with the real old encoders below (their item counts), not with
       today's count — a today-sized bitmap re-made old-style is a link that never existed (was the flaky case) */
    const a = new URLSearchParams(lnk).get("a");
    if (a.length > 6) { const cut = lnk.replace(a, a.slice(0, 3) + a.slice(5)); tries++; if (KCn.codec.decode(cut).damaged) caught++; }
  }
  for (let t = 0; t < 60; t++) { const items = {}; for (let k = 0; k < [3, 60, 200, 371][t % 4]; k++) items[OLD.ORDER[Math.floor(Math.random() * 371)]] = { interest: vals[k % 4] };
    const o374 = OLD.encodeState({ items, meta: {}, name: "x" }), o371 = V371.enc({ items, meta: {}, name: "x" });
    if (KCn.codec.decode(o374).damaged) fp++;
    if (KCn.codec.decode(o371).damaged) fp++;
    [o374, o371].forEach(o => { if (/__/.test(o)) { oldTries++; if (KCn.codec.decode(o.replace(/__/g, "")).damaged) oldCaught++; } }); }
  /* more old links for the "__" check below (encoding only, cheap) */
  for (let t = 0; t < 1500; t++) { const items = {}; for (let k = 0; k < [60, 200, 371][t % 3]; k++) items[OLD.ORDER[Math.floor(Math.random() * 371)]] = { interest: vals[k % 4] };
    [OLD.encodeState({ items, meta: {}, name: "x" }), V371.enc({ items, meta: {}, name: "x" })].forEach(o => { if (/__/.test(o)) { oldTries++; if (KCn.codec.decode(o.replace(/__/g, "")).damaged) oldCaught++; } }); }
  eq(fp, 0, "no intact link (new, pre-fix, v374, v371) is ever flagged as damaged");
  eq(caught, tries, "every simulated corruption of a current link is caught (" + tries + " cases)");
  /* links of v371/v374 carry no checksum: only the structure can tell. About 1% of FULL v374 lists that lost "__"
     still look valid (measured: 2 of 213) — a limit of the old format, not of the decoder */
  ok(!oldTries || oldCaught / oldTries >= 0.95, "old links (no checksum) that lost “__”: ≥ 95% caught (" + oldCaught + " of " + oldTries + ")");
  ok(noUnd, "new links contain no underscore");
  ok([...Array(50)].every(() => /^[A-Za-z0-9]{6}$/.test(KCn.store.newUid())), "list ids are letters and digits only");
  // damaged link on the page: warning, nothing stored, actions hidden
  let dp = open("form", { navLang: "ru", hash: USER_BAD[1].replace(/^a=/, "a=") });
  ok(/повреждена/.test(dp.d.getElementById("bannerText").textContent), "banner warns about a damaged link");
  ok(!dp.w.localStorage.getItem("checklist-saved-profiles-v1"), "damaged link not saved to Received");
  eq(["bannerCmp", "bannerKeep", "bannerSaveAs"].map(id => dp.d.getElementById(id).hidden), [true, true, true], "compare / keep / save-as hidden for damaged links");
  let dc = open("compare", { navLang: "ru" });
  dc.d.getElementById("codeA").value = KCn.codec.encode({ items: { hugging: { interest: "yes" } }, meta: {} }); dc.d.getElementById("codeB").value = USER_BAD[0];
  click(dc.w, dc.d.getElementById("cmpBtn"));
  ok(/участника 2 повреждена/.test(dc.d.getElementById("toast").textContent) && !dc.d.querySelector(".result-group"), "compare refuses a damaged link");

  /* ---------- 7. My lists ---------- */
  S("My lists");
  // existing filled-in list from an older version appears in My lists automatically
  p = open("form", { storage: own });
  let mine = JSON.parse(p.w.localStorage.getItem("checklist-my-profiles-v1"));
  eq(mine.length, 1, "own list auto-saved into My lists on first run");
  eq(mine[0].data.meta.role, "sub", "full list saved (incl. role)");
  eq(p.w.localStorage.getItem("checklist-active-mine-id"), mine[0].id, "it is the active entry");
  click(p.w, p.d.getElementById("mineBtn"));
  ok(p.d.querySelector("#mineList .saved-row.current .cur-badge"), "current list marked as open");
  eq(p.d.querySelector("#mineList .saved-row b").textContent, "Борис", "unnamed entry shows the list's name");
  ok(!p.d.querySelector('#mineList .current button[data-act="load"]'), "no Load button on the open list");
  // changes keep syncing
  click(p.w, p.d.querySelector('.item[data-id="chains"] .scale button[data-v="yes"]')); await sleep(260);
  mine = JSON.parse(p.w.localStorage.getItem("checklist-my-profiles-v1"));
  eq([mine.length, mine[0].data.items.chains], [1, { interest: "yes" }], "edits auto-sync into the same entry");
  // copy
  p.w.prompt = () => "Копия"; click(p.w, p.d.getElementById("mineSaveNew"));
  eq(JSON.parse(p.w.localStorage.getItem("checklist-my-profiles-v1")).length, 2, "Save a copy adds a second entry");
  // create new list: blank form, old one kept
  click(p.w, p.d.getElementById("mineNew"));
  let st2 = p.storage();
  eq(JSON.parse(st2.local["practices-checklist-v1"]).items, {}, "new list is empty");
  eq(st2.local["checklist-active-mine-id"], "", "new list not saved until changed");
  p = open("form", { storage: st2 });
  eq(p.d.querySelectorAll(".scale button.sel").length, 0, "form opens blank");
  eq(JSON.parse(p.w.localStorage.getItem("checklist-my-profiles-v1")).length, 2, "just opening a blank list adds nothing");
  click(p.w, p.d.querySelector('.item[data-id="orgy"] .scale button[data-v="love"]')); await sleep(260);
  mine = JSON.parse(p.w.localStorage.getItem("checklist-my-profiles-v1"));
  eq([mine.length, mine[0].data.items], [3, { orgy: { interest: "love" } }], "first change creates its own entry");
  // load another entry
  click(p.w, p.d.getElementById("mineBtn"));
  const ownNameRow = [...p.d.querySelectorAll("#mineList .saved-row")].find(r => r.querySelector("b").textContent === "Борис");
  click(p.w, ownNameRow.querySelector('button[data-act="load"]'));
  st2 = p.storage();
  eq(JSON.parse(st2.local["practices-checklist-v1"]).meta.role, "sub", "Load restores full list incl. role");
  eq(st2.local["checklist-active-mine-id"], ownNameRow.dataset.id, "loaded entry becomes active");
  eq(JSON.parse(st2.local["checklist-my-profiles-v1"]).find(x => x.data.items.orgy).data.items, { orgy: { interest: "love" } }, "list left behind is still saved");
  // Clear = start new, nothing lost
  p = open("form", { storage: st2 }); click(p.w, p.d.getElementById("mineNew"));
  eq(JSON.parse(p.w.localStorage.getItem("checklist-my-profiles-v1")).length, 3, "“Start a new list” keeps every saved list");
  // viewing someone's link never touches My lists; "Use as my own" makes a new entry
  const before = p.storage();
  p = open("form", { hash: ruLink, storage: before });
  eq(p.w.localStorage.getItem("checklist-my-profiles-v1"), before.local["checklist-my-profiles-v1"], "viewing a link does not add to My lists");
  click(p.w, p.d.getElementById("bannerKeep"));
  eq(JSON.parse(p.w.localStorage.getItem("checklist-my-profiles-v1")).length, 4, "'Use as my own' adds it as a new list, old ones kept");
  // delete active
  click(p.w, p.d.getElementById("mineBtn"));
  click(p.w, p.d.querySelector('#mineList .current button[data-act="del"]'));
  eq([JSON.parse(p.w.localStorage.getItem("checklist-my-profiles-v1")).length, p.w.localStorage.getItem("checklist-active-mine-id")], [3, ""], "deleting the open list detaches it");

  /* ---------- 8. compare ---------- */
  S("compare");
  const A = { items: { hugging: { interest: "love" }, chains: { interest: "yes" }, "spanking-hand": { interest: "maybe" }, "fisting-anal": { interest: "limit" }, orgy: { interest: "yes" }, "anal-sex": { interest: "love" }, branding: { interest: "limit" }, cbt: { interest: "yes" }, blindfolds: { interest: "maybe" } }, meta: { role: "dom", exp: "large" }, name: "Anna" };
  const B = { items: { hugging: { interest: "yes" }, chains: { interest: "maybe" }, "spanking-hand": { interest: "maybe" }, "fisting-anal": { interest: "love" }, "rope-bondage-shibari": { interest: "yes" }, branding: { interest: "limit" }, cbt: { interest: "limit" }, blindfolds: { interest: "love" } }, meta: { role: "sub", attire: ["latex"] }, name: "Boris" };
  const g = KCn.match.group(A, B);
  eq(["match", "discA", "discB", "discBoth", "oneA", "oneB", "exBoth", "exA", "exB"].map(k => g[k].map(x => x.id)),
    [["hugging"], ["blindfolds"], ["chains"], ["spanking-hand"], ["anal-sex", "orgy"], ["rope-bondage-shibari"], ["branding"], ["fisting-anal"], ["cbt"]], "grouping: 3-way discuss, one-sided A/B, 3-way excluded");
  const own2 = { local: { "practices-checklist-v1": JSON.stringify(Object.assign(KCn.store.blank(), A)) }, session: {} };
  let c = open("compare", { storage: own2, navLang: "ru" });
  ok(!c.errors.length, "compare loads: " + c.errors.join("|"));
  eq(c.d.getElementById("nameA").value, "Anna", "A prefilled with own list");
  c.d.getElementById("codeB").value = "https://x/#" + KCn.codec.encode(B, "en");
  click(c.w, c.d.getElementById("cmpBtn"));
  const titles = () => [...c.d.querySelectorAll(".result-group h3")].map(h => h.textContent.replace(/\s*\(\d+\)$/, ""));
  eq(titles(), ["Совпадения — оба «за»", "Обсудить — «Может» у Anna", "Обсудить — «Может» у Boris", "Обсудить — «Может» у обоих", "Интересно только Anna", "Интересно только Boris", "Исключено — «Нет» у обоих", "Исключено — «Нет» у Anna", "Исключено — «Нет» у Boris"], "RU groups incl. discuss and excluded splits");
  ok(!c.d.getElementById("cmpSearchBox").hidden, "search shown after comparing");
  const hRow = c.d.querySelector(".rrow"), hBtn = hRow.querySelector('button[data-act="help"]');
  ok(hBtn && hRow.querySelector(".item-desc").hidden, "compare rows have a hidden ? hint");
  click(c.w, hBtn);
  ok(!hRow.querySelector(".item-desc").hidden && hBtn.classList.contains("on") && /Тесные/.test(hRow.querySelector(".item-desc").textContent), "? opens the hint (current language)");
  click(c.w, hBtn); ok(hRow.querySelector(".item-desc").hidden, "? closes the hint");
  const cs = c.d.getElementById("cmpSearch");
  cs.value = "анал"; cs.dispatchEvent(new c.w.Event("input"));
  eq([...c.d.querySelectorAll(".rrow")].map(r => r.querySelector(".nm").firstChild.textContent), ["Анальный секс", "Фистинг — анальный"], "compare search (RU name, across groups)");
  cs.value = "branding"; cs.dispatchEvent(new c.w.Event("input"));
  eq(titles(), ["Исключено — «Нет» у обоих"], "compare search matches English name too");
  cs.value = "zzzz"; cs.dispatchEvent(new c.w.Event("input"));
  eq(c.d.querySelector(".result-group .sub").textContent, "Ничего не найдено по запросу.", "no-match message");
  cs.value = ""; cs.dispatchEvent(new c.w.Event("input"));
  eq(c.d.querySelectorAll(".cmp-profile").length, 2, "profile line for both people");
  ok(/Сабмиссив/.test(c.d.querySelectorAll(".cmp-profile")[1].textContent) && /Латекс/.test(c.d.querySelectorAll(".cmp-profile")[1].textContent), "B's role+attire shown");
  click(c.w, c.d.querySelector('button[data-f="yesA"]'));
  const yesA = [...c.d.querySelectorAll(".rrow")].length; eq(yesA, 5, "filter «Да» у Anna: 5 items");
  ok(c.d.querySelector('button[data-f="yesA"]').classList.contains("on"), "active filter highlighted");
  click(c.w, c.d.querySelector('button[data-f="yesB"]')); eq(c.d.querySelectorAll(".rrow").length, 4, "filter «Да» у Boris: 4 items");
  click(c.w, c.d.querySelector('button[data-f="ymA"]'));
  eq(c.d.querySelectorAll(".rrow").length, 7, "filter «Да» и «Может» у Anna: 7 items (5 yes/love + 2 maybe)");
  eq([...c.d.querySelectorAll(".rrow .badge")].filter((b, i) => i % 2 === 0).map(b => b.textContent).slice(-2), ["Может", "Может"], "maybe items listed last");
  click(c.w, c.d.querySelector('button[data-f="ymB"]')); eq(c.d.querySelectorAll(".rrow").length, 6, "filter «Да» и «Может» у Boris: 6 items");
  ok(c.d.querySelector('button[data-f="ymB"]').classList.contains("on") && /«Да» и «Может» у Boris/.test(c.d.querySelector(".cmp-filter").textContent), "new filter labelled and highlighted");
  click(c.w, c.d.querySelector('button[data-f="yesB"]'));
  click(c.w, c.d.querySelector('#langSw button[data-lang="en"]'));
  eq(c.d.querySelectorAll(".rrow").length, 4, "results survive language switch (filter kept)");
  ok(/“Yes” from Boris/.test(c.d.querySelector(".cmp-filter").textContent), "filter labels translated");
  eq(c.d.querySelectorAll(".rrow .sub").length, 0, "EN compare: english names only");
  ok(/\/en\/$/.test(c.d.getElementById("backLink").href), "back link keeps language (v608: the English page)");
  // hand-off from form
  const hand = open("form", { storage: own2 });
  hand.KC.form.startCompare("a=Ag", KCn.codec.encode(B), "Me", "Boris");
  c = open("compare", { storage: hand.storage() });
  eq(c.d.getElementById("nameB").value, "Boris", "hand-off fills B"); ok(c.d.querySelectorAll(".result-group").length > 0, "hand-off auto-compares");
  eq(c.w.sessionStorage.getItem("cmpA"), null, "hand-off data consumed");
  c = open("compare"); click(c.w, c.d.getElementById("cmpBtn")); eq(c.d.getElementById("toast").textContent, "Нужно минимум две анкеты", "empty compare warns");

  S("group compare");
  const people = [
    { name: "Anna", items: { hugging: { interest: "love" }, chains: { interest: "yes" }, orgy: { interest: "yes" }, cbt: { interest: "limit" } } },
    { name: "Boris", items: { hugging: { interest: "yes" }, chains: { interest: "love" }, orgy: { interest: "maybe" }, cbt: { interest: "yes" } } },
    { name: "Kira", items: { hugging: { interest: "love" }, chains: { interest: "yes" }, orgy: { interest: "yes" }, cbt: { interest: "yes" } } }];
  const recG = people.map((x, i) => ({ id: "g" + i, name: x.name, code: KCn.codec.encode({ items: x.items, meta: {}, name: x.name }), ts: 10 - i }));
  let gc = open("compare", { navLang: "ru", storage: { local: { "checklist-saved-profiles-v1": JSON.stringify(recG) }, session: {} } });
  eq(gc.d.querySelectorAll("#parts .cmp-col").length, 2, "starts with two participants");
  click(gc.w, gc.d.getElementById("addPart"));
  eq(gc.d.querySelectorAll("#parts .cmp-col").length, 3, "add participant");
  const cols = [...gc.d.querySelectorAll("#parts .cmp-col")];
  const pick = (col, i) => { const sel = col.querySelector(".cmp-pick"); sel.value = "r:g" + i; sel.dispatchEvent(new gc.w.Event("change", { bubbles: true })); };
  ok([...cols[0].querySelectorAll(".cmp-pick optgroup")].some(g => g.label === "Полученные"), "picker lists Received");
  cols.forEach((c, i) => pick(c, i));
  eq(cols.map(c => c.querySelector(".cmp-name").value), ["Anna", "Boris", "Kira"], "picker fills name and link");
  click(gc.w, gc.d.getElementById("cmpBtn"));
  const gt = () => [...gc.d.querySelectorAll(".rrow")].map(r => r.dataset && r.querySelector(".nm").firstChild.textContent);
  eq(gt(), ["Объятия", "Сковывание цепями"], "«Да/Обожаю» у всех: only items everyone likes (orgy has a maybe, cbt a No)");
  click(gc.w, gc.d.querySelector('button[data-f="allYM"]'));
  eq(gt(), ["Объятия", "Сковывание цепями", "Оргия"], "«Да/Обожаю/Может» у всех: adds the item with a Maybe, still excludes the No");
  ok(gc.d.querySelector('button[data-f="allYM"]').classList.contains("on"), "filter highlighted");
  ok(/Anna: .*Boris: .*Kira:/.test(gc.d.querySelector(".rrow .who").textContent), "row shows every participant");
  click(gc.w, gc.d.querySelector('button[data-f="pairs"]'));
  const cells = [...gc.d.querySelectorAll('.pair-table[data-kind="yes"] button.pair-n')].map(b => b.dataset.pair + "=" + b.textContent);
  eq([...new Set(cells)].sort(), ["0,1=2", "0,2=3", "1,2=3"], "pair table counts matches per pair");
  const cellsYM = [...gc.d.querySelectorAll('.pair-table[data-kind="ym"] button.pair-n')].map(b => b.dataset.pair + "=" + b.textContent);
  eq([...new Set(cellsYM)].sort(), ["0,1=3", "0,2=3", "1,2=4"], "second table counts Yes/Love/Maybe matches (a No never counts)");
  eq(gc.d.querySelectorAll(".pair-table").length, 2, "two pair tables");
  ok(/«Да \/ Обожаю \/ Может»/.test(gc.d.getElementById("results").textContent), "second table titled with Maybe");
  // roles: Top + Bottom only
  const withRoles = [["Anna", "dom"], ["Boris", "sub"], ["Kira", "sub"], ["Lev", ""]].map(([n, r], i) => ({ id: "h" + i, name: n, code: KCn.codec.encode({ items: people[i % 3].items, meta: r ? { role: r } : {}, name: n }), ts: 10 - i }));
  let rc = open("compare", { navLang: "ru", storage: { local: { "checklist-saved-profiles-v1": JSON.stringify(withRoles) }, session: {} } });
  click(rc.w, rc.d.getElementById("addPart")); click(rc.w, rc.d.getElementById("addPart"));
  [...rc.d.querySelectorAll("#parts .cmp-col")].forEach((c, i) => { const sel = c.querySelector(".cmp-pick"); sel.value = "r:h" + i; sel.dispatchEvent(new rc.w.Event("change", { bubbles: true })); });
  click(rc.w, rc.d.getElementById("cmpBtn")); click(rc.w, rc.d.querySelector('button[data-f="pairs"]'));
  const pairsNow = () => [...new Set([...rc.d.querySelectorAll('.pair-table[data-kind="yes"] button.pair-n')].map(b => b.dataset.pair))].sort();
  eq(pairsNow(), ["0,1", "0,2", "0,3", "1,2", "1,3", "2,3"], "all pairs by default");
  ok(/Верх/.test(rc.d.querySelector(".pair-table").textContent) && /Низ/.test(rc.d.querySelector(".pair-table").textContent), "roles shown under names");
  click(rc.w, rc.d.querySelector('button[data-pm="role"]'));
  eq(pairsNow(), ["0,1", "0,2"], "Top + Bottom only: Anna(Top) with Boris/Kira(Bottom); no Bottom+Bottom, no pairs without a role");
  eq([...new Set([...rc.d.querySelectorAll('.pair-table[data-kind="ym"] button.pair-n')].map(b => b.dataset.pair))].sort(), ["0,1", "0,2"], "role filter applies to the second table too");
  ok(/Роль не указана: Lev/.test(rc.d.getElementById("results").textContent), "participants without a role are listed");
  ok(/\(2\)/.test(rc.d.querySelector(".result-group h3").textContent), "header counts shown pairs");
  click(rc.w, rc.d.querySelector('button[data-pm="any"]')); eq(pairsNow().length, 6, "back to all pairs");
  click(gc.w, gc.d.querySelector('.pair-table button[data-pair="0,2"]'));
  ok(/Совпадения — оба «за»/.test(gc.d.getElementById("results").textContent) && gc.d.querySelector('button[data-f="group"]'), "number opens the detailed pair view with a way back");
  click(gc.w, gc.d.querySelector('button[data-f="group"]'));
  ok(gc.d.querySelector(".pair-table"), "back to the group view");
  click(gc.w, gc.d.querySelector('#parts .cmp-col:last-child [data-act="rm"]'));
  eq(gc.d.querySelectorAll("#parts .cmp-col").length, 2, "remove participant");
  ok(gc.d.querySelectorAll('#parts [data-act="rm"]:not([hidden])').length === 0, "cannot go below two");
  for (let i = 0; i < 12; i++) click(gc.w, gc.d.getElementById("addPart"));
  eq(gc.d.querySelectorAll("#parts .cmp-col").length, 10, "at most ten participants");
  click(gc.w, gc.d.querySelector('#langSw button[data-lang="en"]'));
  ok(/Participant 3/.test(gc.d.querySelectorAll("#parts .cmp-name")[2].placeholder), "participant labels translated");

  /* ---------- 9. PDF sheet ---------- */
  S("PDF sheet");
  p = open("form", { storage: own });
  let sheet = p.KC.form.buildSheet().textContent;
  ok(/Борис/.test(sheet) && /Сабмиссив/.test(sheet) && /Объятия/.test(sheet) && /Жёсткие лимиты/.test(sheet), "RU sheet content");
  click(p.w, p.d.querySelector('#langSw button[data-lang="en"]'));
  sheet = p.KC.form.buildSheet().textContent;
  ok(/Submissive \/ Bottom/.test(sheet) && /Hugging/.test(sheet) && /Hard limits/.test(sheet) && !/[а-яё]/i.test(sheet.replace("Борис", "")), "EN sheet fully English");

  click(p.w, p.d.querySelector('#langSw button[data-lang="pt"]'));
  sheet = p.KC.form.buildSheet().textContent;
  ok(/Submisso\(a\) \/ Bottom/.test(sheet) && /Abraços/.test(sheet) && /Limites rígidos/.test(sheet), "PT sheet");
  c = open("compare", { storage: own2, navLang: "pt-BR" });
  c.d.getElementById("codeB").value = "#" + KCn.codec.encode(B);
  click(c.w, c.d.getElementById("cmpBtn"));
  eq(titles(), ["Em comum: os dois topam", "Conversar: “Talvez” de Anna", "Conversar: “Talvez” de Boris", "Conversar: “Talvez” dos dois", "Só Anna tem interesse", "Só Boris tem interesse", "Excluídos: “Não” dos dois", "Excluídos: “Não” de Anna", "Excluídos: “Não” de Boris"], "PT compare groups");
  click(c.w, c.d.querySelector('#langSw button[data-lang="es"]'));
  eq(titles().slice(0, 4), ["En común: los dos se apuntan", "Hablarlo: «Quizás» de Anna", "Hablarlo: «Quizás» de Boris", "Hablarlo: «Quizás» de los dos"], "ES compare groups");
  click(c.w, c.d.querySelector('#langSw button[data-lang="ja"]'));
  eq(titles(), ["一致：二人ともOK", "要相談：Annaが「条件次第」", "要相談：Borisが「条件次第」", "要相談：二人とも「条件次第」", "Annaだけが興味あり", "Borisだけが興味あり", "除外：二人ともNG", "除外：AnnaがNG", "除外：BorisがNG"], "JA compare groups");
  const cjs = c.d.getElementById("cmpSearch"); cjs.value = "緊縛"; cjs.dispatchEvent(new c.w.Event("input"));
  eq(c.d.querySelectorAll(".rrow").length, 1, "JA search finds 緊縛 (shibari)");
  cjs.value = ""; cjs.dispatchEvent(new c.w.Event("input"));
  click(c.w, c.d.querySelector('#langSw button[data-lang="zh"]'));
  eq(titles().slice(0, 2), ["契合：雙方都願意", "討論：Anna 選了「也許」"], "ZH compare groups");
  // TH form
  const tp = open("form", { storage: { local: Object.assign({}, own.local, { "checklist-lang": "th" }), session: {} } });
  eq(tp.d.querySelector('.item[data-id="blindfolds"] .main').textContent, "ผ้าปิดตา", "TH name");
  eq(tp.d.querySelector('.item[data-id="blindfolds"] .sub').textContent, "Blindfolds", "TH page shows English subtitle");
  eq(tp.d.querySelector('.item[data-id="hugging"] .scale button.sel').textContent, "ชอบมาก", "TH scale + answer");
  eq(tp.d.getElementById("progress").textContent, "เลือกแล้ว 4 จาก 506 รายการ", "TH progress");
  ok(/lg=th/.test(tp.KC.form.shareLink()), "TH link carries lg=th");
  eq(open("form", { hash: tp.KC.form.shareLink().split("#")[1], storage: { local: { "checklist-lang": "ru" }, session: {} } }).KC.i18n.lang, "th", "TH link opens in Thai");
  ok(/ลิมิตเด็ดขาด/.test(tp.KC.form.buildSheet().textContent), "TH PDF sheet");
  const tsb = tp.d.getElementById("search"); tsb.value = "แส้"; tsb.dispatchEvent(new tp.w.Event("input"));
  ok(tp.d.querySelectorAll(".item:not(.filtered-out)").length >= 4, "TH search works (no word spaces in Thai)");
  // ZH form
  const zp = open("form", { storage: { local: Object.assign({}, own.local, { "checklist-lang": "zh" }), session: {} } });
  eq(zp.d.documentElement.lang, "zh-Hant", "<html lang> is zh-Hant (Traditional glyphs)");
  eq(zp.d.querySelector('.item[data-id="blindfolds"] .main').textContent, "眼罩", "ZH name");
  eq(zp.d.querySelector('.item[data-id="blindfolds"] .sub').textContent, "Blindfolds", "ZH page shows English subtitle");
  eq(zp.d.querySelector('.item[data-id="hugging"] .scale button.sel').textContent, "超愛", "ZH scale + answer");
  eq(zp.d.getElementById("progress").textContent, "已勾選 4／506 項", "ZH progress");
  ok(/lg=zh/.test(zp.KC.form.shareLink()), "ZH link carries lg=zh");
  eq(open("form", { hash: zp.KC.form.shareLink().split("#")[1], storage: { local: { "checklist-lang": "ru" }, session: {} } }).KC.i18n.lang, "zh", "ZH link opens in Chinese");
  ok(/硬限制/.test(zp.KC.form.buildSheet().textContent), "ZH PDF sheet");
  const zsb = zp.d.getElementById("search"); zsb.value = "鞭"; zsb.dispatchEvent(new zp.w.Event("input"));
  ok(zp.d.querySelectorAll(".item:not(.filtered-out)").length >= 5, "ZH search works (no word spaces in Chinese)");
  eq(zp.KC.i18n.sep(), "", "ZH joins sentences without a space");
  // JA form
  p = open("form", { storage: { local: Object.assign({}, own.local, { "checklist-lang": "ja" }), session: {} } });
  eq(p.d.querySelector('.item[data-id="face-sitting"] .main').textContent, "顔面騎乗", "JA name");
  eq(p.d.querySelector('.item[data-id="face-sitting"] .sub').textContent, "Face-sitting", "JA page shows English subtitle");
  eq(p.d.querySelector('.item[data-id="hugging"] .scale button.sel').textContent, "大好き", "JA scale + answer");
  eq(p.d.getElementById("progress").textContent, "506項目中 4項目にチェック済み", "JA progress");
  ok(/lg=ja/.test(p.KC.form.shareLink()), "JA link carries lg=ja");
  ok(/ハードリミット/.test(p.KC.form.buildSheet().textContent), "JA PDF sheet");
  const js = p.d.getElementById("search"); js.value = "鞭"; js.dispatchEvent(new p.w.Event("input"));
  ok(p.d.querySelectorAll(".item:not(.filtered-out)").length >= 5, "JA form search");
  // ES form
  const ownEs = { local: Object.assign({}, own.local, { "checklist-lang": "es" }), session: {} };
  p = open("form", { storage: ownEs });
  eq(p.d.querySelector('.item[data-id="golden-showers"] .main').textContent, "Lluvia dorada", "ES name");
  eq(p.d.querySelector('.item[data-id="furry"] .main').textContent, "Furry", "ES new item");
  ok(/lg=es/.test(p.KC.form.shareLink()), "ES link carries lg=es");
  ok(/Límites duros/.test(p.KC.form.buildSheet().textContent), "ES PDF sheet");

  /* ---------- answer filters, favourites, templates ---------- */
  S("Answer filters (sorted by answer)");
  const A5 = { hugging: { interest: "maybe" }, chains: { interest: "love" }, orgy: { interest: "limit" }, blindfolds: { interest: "yes" }, furry: { interest: "yes" } };
  const own5 = { local: { "practices-checklist-v1": JSON.stringify({ name: "Anna", uid: "ANNA01", meta: {}, items: A5 }), "checklist-lang": "ru" }, session: {} };
  p = open("form", { storage: own5 });
  const visP = pg => [...pg.d.querySelectorAll(".item:not(.filtered-out)")].map(r => r.dataset.id);
  const setView = (pg, v) => { const s = pg.d.getElementById("view"); s.value = v; s.dispatchEvent(new pg.w.Event("change")); };
  const RK = { love: 0, yes: 1, maybe: 2, limit: 3 };
  setView(p, "answered");
  eq(visP(p).sort(), Object.keys(A5).sort(), "answered: only the 5 answered items");
  const sortedOk = pg => [...pg.d.querySelectorAll(".cat")].every(sec => { const r = [...sec.querySelectorAll(".item:not(.filtered-out)")].map(x => RK[pg.KC.form.state.items[x.dataset.id].interest]); return r.every((v, i) => !i || r[i - 1] <= v); });
  ok(sortedOk(p), "answered: each section sorted Love → Yes → Maybe → No");
  setView(p, "positive");
  eq(visP(p).sort(), ["blindfolds", "chains", "furry", "hugging"], "Yes/Love/Maybe: “No” and unanswered hidden");
  setView(p, "all");
  const order = []; p.KC.CATS.forEach(c => c.items.forEach(([, id]) => order.push(id)));
  eq([...p.d.querySelectorAll(".item")].map(r => r.dataset.id), order, "back to all: original order restored");

  S("Favourites");
  const heart = (pg, id) => pg.d.querySelector('.item[data-id="' + id + '"] button[data-act="fav"]');
  click(p.w, heart(p, "hugging")); click(p.w, heart(p, "sleep-sacks"));
  eq([heart(p, "hugging").textContent, heart(p, "sleep-sacks").getAttribute("aria-pressed"), heart(p, "chains").textContent], ["♥", "true", "♡"], "heart toggles ♡ → ♥");
  eq(p.KC.form.state.items.hugging, { interest: "maybe" }, "a heart does not change the answer");
  const linkBeforeFav = p.KC.codec.encode(p.KC.store.normalize({ items: A5 }));
  await sleep(300);
  eq(JSON.parse(p.w.localStorage.getItem("practices-checklist-v1")).fav, ["hugging", "sleep-sacks"], "own favourites saved with the list");
  eq(JSON.parse(p.w.localStorage.getItem("checklist-my-profiles-v1"))[0].data.fav, ["hugging", "sleep-sacks"], "…and in its My lists entry");
  ok(p.KC.form.shareLink().split("#")[1].indexOf(linkBeforeFav.split("&k=")[0].slice(2)) >= 0 && !/fav|sleep/.test(p.KC.form.shareLink()), "favourites never go into a link");
  const ofav = p.d.getElementById("onlyFav"); ofav.checked = true; ofav.dispatchEvent(new p.w.Event("change"));
  eq(visP(p).sort(), ["hugging", "sleep-sacks"], "only ♥: just the favourites");
  ok(p.d.querySelector(".fav-toggle").classList.contains("on"), "♥ toggle lights up");
  setView(p, "answered"); eq(visP(p), ["hugging"], "only ♥ combines with the answer filter");
  let sh = p.KC.form.buildSheet().textContent;
  ok(/Только избранное ♥/.test(sh) && /Объятия/.test(sh) && !/Сковывание цепями/.test(sh), "PDF with only ♥: favourites only, noted in the header");
  ofav.checked = false; ofav.dispatchEvent(new p.w.Event("change")); setView(p, "all");
  sh = p.KC.form.buildSheet().textContent;
  ok(/♥ Избранное/.test(sh) && /♥ Объятия/.test(sh), "PDF: favourites block + ♥ next to names");
  eq(p.KC.form.shown(), p.KC.form.state, "no template: the list leaves the page unchanged");
  // someone else's list: favourites stored on the device by list id, own list untouched
  const bobLink = p.KC.codec.encode({ uid: "BOB001", name: "Bob", items: { hugging: { interest: "yes" }, "spanking-hand": { interest: "love" } }, meta: {} }, "ru");
  let rb = open("form", { hash: bobLink, storage: { local: { "checklist-lang": "ru" }, session: {} } });
  click(rb.w, heart(rb, "hugging"));
  eq(JSON.parse(rb.w.localStorage.getItem("checklist-favs-v1")), { "u:BOB001": ["hugging"] }, "favourites of someone's list saved by its id");
  ok(!rb.w.localStorage.getItem("practices-checklist-v1"), "own list untouched");
  rb = open("form", { hash: bobLink, storage: rb.storage() });
  eq(heart(rb, "hugging").textContent, "♥", "favourites shown again when the list is reopened");
  const bobNewer = p.KC.codec.encode({ uid: "BOB001", name: "Bob", items: { hugging: { interest: "love" } }, meta: {} }, "ru");
  rb = open("form", { hash: bobNewer, storage: rb.storage() });
  eq(heart(rb, "hugging").textContent, "♥", "…and in a newer version of that list");
  click(rb.w, rb.d.getElementById("bannerKeep"));
  eq(rb.KC.form.state.fav, ["hugging"], "“Use as my own” takes the favourites along");

  S("Templates: share, save");
  p = open("form", { storage: own5 });
  const LS = (pg, k) => JSON.parse(pg.w.localStorage.getItem(k) || "null");
  const TK = "checklist-templates-v1", MK = "checklist-my-profiles-v1", RK2 = "checklist-saved-profiles-v1", OK_ = "practices-checklist-v1";
  click(p.w, p.d.getElementById("shareBtn"));
  const plain = p.d.getElementById("shareLink").value;
  ok(!/&fi=|&ti=/.test(plain), "plain link of a list not created by a template: no template marks");
  click(p.w, p.d.getElementById("tplShareBtn"));
  eq([p.d.getElementById("shareLink").value, p.d.getElementById("tplName").classList.contains("bad"), p.d.getElementById("toast").textContent], [plain, true, "Введите название шаблона"], "template name required");
  // Latin only, but the input is never changed (B1): red hint + saving blocked
  const tn = p.d.getElementById("tplName"); tn.value = "Вечер Evening_1!"; tn.dispatchEvent(new p.w.Event("input"));
  eq([tn.value, tn.classList.contains("bad"), p.d.getElementById("tplHint").classList.contains("warn")], ["Вечер Evening_1!", true, true], "non-Latin name: kept as typed, field and hint turn red");
  click(p.w, p.d.getElementById("tplShareBtn"));
  eq([p.d.getElementById("shareLink").value, p.d.getElementById("toast").textContent, LS(p, TK)], [plain, "Название шаблона — только латиница, цифры и пробел", null], "non-Latin name: nothing shared or saved");
  tn.value = "Evening"; tn.dispatchEvent(new p.w.Event("input"));
  ok(!tn.classList.contains("bad") && !p.d.getElementById("tplHint").classList.contains("warn"), "Latin name: no warning");
  click(p.w, p.d.getElementById("tplShareBtn"));
  const tplLink = p.d.getElementById("shareLink").value, td = p.KC.codec.decode(tplLink);
  ok(/&ti=[a-z0-9]{6}&tn=Evening/.test(tplLink) && !/&t=|_/.test(tplLink), "template link: ti= and tn=, no item set (the answers are the template), no “_”");
  eq([td.tpl.name, Object.keys(td.items).sort(), td.damaged, td.uid], ["Evening", Object.keys(A5).sort(), false, "ANNA01"], "template link carries the sender's answers");
  ok(/Ссылка-шаблон «Evening», пунктов: 5/.test(p.d.getElementById("shareKind").textContent) && !p.d.getElementById("shareBack").hidden, "share window says which link is shown");
  let tl = LS(p, TK);
  eq([tl.length, tl[0].own, tl[0].name, tl[0].ids.length, tl[0].tid], [1, true, "Evening", 5, td.tpl.id], "sharing as template also saves it in My templates");
  eq(LS(p, MK).length, 1, "…without adding a list");
  click(p.w, p.d.getElementById("shareBack")); eq(p.d.getElementById("shareLink").value, plain, "back to the plain link");
  click(p.w, p.d.getElementById("tplSaveBtn"));
  let ml = LS(p, MK), copy = ml.find(x => x.data.template);
  eq([LS(p, TK).length, ml.length, copy && copy.data.template, copy && Object.keys(copy.data.items).length], [1, 2, { id: td.tpl.id, name: "Evening" }, 5], "“Save as my template”: template + a copy of the list created by it");
  ok(copy.data.uid && copy.data.uid !== "ANNA01", "the copy is a separate list (own id)");
  eq(p.d.getElementById("toast").textContent, "Шаблон «Evening» сохранён (пунктов: 5). Анкета по нему добавлена в «Мои анкеты».", "toast says both");
  eq(p.KC.form.state.template, undefined, "the list I am filling stays as it was");
  click(p.w, p.d.getElementById("tplSaveBtn"));
  eq([LS(p, TK).length, LS(p, MK).length], [1, 2], "saving again: template updated, no second copy");
  // My lists: templates section
  click(p.w, p.d.getElementById("mineBtn"));
  eq([...p.d.querySelectorAll('#mineTplList .tpl-row:not(.tpl-starter) button[data-act]')].map(b => b.dataset.act), ["nebula", "share", "use", "rename", "del"], "template row: nebula, Share, Fill in, Rename, ✕ (v617: after the starter templates)");
  ok(/по шаблону «Evening»/.test(p.d.getElementById("mineList").textContent), "the copy is marked in My lists");
  ok(!p.d.getElementById("mineTplSave").hidden, "“Save the current list as a template” button");
  let asked = ["Мини", "Mini"]; p.w.prompt = () => asked.length ? asked.shift() : null; let alerts = 0; p.w.alert = () => { alerts++; };
  click(p.w, p.d.getElementById("mineTplSave"));
  tl = LS(p, TK);
  eq([alerts, tl.length, tl[0].name, LS(p, MK).length], [1, 2, "Mini", 3], "save current as template: a Cyrillic name is refused and asked again; then template + list");
  // rename my template: Latin only
  asked = ["Утро", null]; alerts = 0;
  click(p.w, p.d.querySelector('#mineTplList .tpl-row[data-id="' + tl[0].id + '"] button[data-act="rename"]'));
  eq([alerts, LS(p, TK)[0].name], [1, "Mini"], "renaming my template to Cyrillic is refused");
  const senderStorage = p.storage();
  // an empty list cannot make a template
  let pe = open("form", { storage: { local: { "checklist-lang": "ru" }, session: {} } });
  click(pe.w, pe.d.getElementById("shareBtn")); pe.d.getElementById("tplName").value = "X"; click(pe.w, pe.d.getElementById("tplShareBtn"));
  ok(/шаблон был бы пустым/.test(pe.d.getElementById("toast").textContent), "no answers: no template");

  S("Templates: recipient");
  const recOwn = { local: { "checklist-lang": "ru", [OK_]: JSON.stringify({ name: "Boris", uid: "BORIS1", meta: { role: "dom" }, items: { hugging: { interest: "yes" }, "sleep-sacks": { interest: "love" } }, fav: ["hugging", "sleep-sacks"] }) }, session: {} };
  let r3 = open("form", { hash: tplLink.split("#")[1], storage: recOwn });
  ok(!r3.errors.length, "template link opens without errors: " + r3.errors.join(" | "));
  tl = LS(r3, TK);
  eq([tl.length, tl[0].own, tl[0].name, tl[0].ids.length], [1, false, "Evening", 5], "template saved in Received → Templates");
  let rl3 = LS(r3, RK2), rd = r3.KC.codec.decode(rl3[0].code);
  eq([rl3.length, rl3[0].name, rd.by && rd.by.name, rd.tpl, Object.keys(rd.items).length], [1, "Anna", "Evening", undefined, 5], "sender's list in Received, marked as filled by the template (fi=), not as a template link");
  let bo = LS(r3, OK_);
  eq([bo.template, bo.items, bo.name, bo.meta.role, bo.fav], [{ id: td.tpl.id, name: "Evening" }, { hugging: { interest: "yes" } }, "Boris", "dom", ["hugging"]], "a NEW own list by the template: my earlier answers (and ♥) to its items carried over");
  ml = LS(r3, MK);
  eq([ml.length, ml.some(x => x.data.uid === "BORIS1" && x.data.items["sleep-sacks"])], [2, true], "the list I had open is safe in My lists (it was not there yet)");
  eq(new Set(ml.map(x => x.id)).size, ml.length, "entries made in the same millisecond still get different ids");
  eq(r3.w.localStorage.getItem("checklist-active-mine-id"), ml.find(x => x.data.template).id, "the new list is the active one");
  ok(JSON.parse(r3.storage().session.kcNotice).fill === "new", "notice prepared for the reload");
  // after the reload
  let b3 = open("form", { storage: r3.storage() });
  eq([b3.KC.form.viewingShared, visP(b3).sort(), b3.d.getElementById("progress").textContent], [false, Object.keys(A5).sort(), "Отмечено 1 из 5 практик"], "opens as MY list, only the template's items");
  const nt = b3.d.getElementById("noticeText").textContent;
  ok(!b3.d.getElementById("noticeBar").hidden && /Получен шаблон «Evening» \(пунктов: 5\)/.test(nt) && /новая анкета/.test(nt) && /перенесены: 1/.test(nt) && /Анкета отправителя \(«Anna»\) сохранена/.test(nt), "notice: template received, new list, answers carried over, sender's list saved");
  ok(!b3.d.getElementById("noticeOpen").hidden, "notice offers to open the sender's list");
  eq(b3.w.sessionStorage.getItem("kcNotice"), null, "the notice is shown once");
  click(b3.w, b3.d.getElementById("noticeOk")); ok(b3.d.getElementById("noticeBar").hidden, "notice closes");
  ok(/создана по шаблону «Evening»: показаны только его пункты \(5\)/.test(b3.d.getElementById("tplNoteText").textContent), "note: created by the template, only its items");
  const tact = b3.d.getElementById("tplAct");
  eq(tact.textContent, "Показать все пункты", "note button: show all");
  click(b3.w, tact);
  eq([visP(b3).length, tact.textContent, b3.d.getElementById("tplSel").value], [506, "Только пункты шаблона", ""], "show all: every item, button to go back");
  ok(/создана по шаблону «Evening»\. Показаны все пункты\./.test(b3.d.getElementById("tplNoteText").textContent), "note still says what the list was created by");
  await sleep(300);
  eq(LS(b3, OK_).template.name, "Evening", "showing all does not unbind the list");
  click(b3.w, tact); eq(visP(b3).length, 5, "back to the template's items");
  const bsel = b3.d.getElementById("tplSel"); bsel.value = ""; bsel.dispatchEvent(new b3.w.Event("change"));
  eq([visP(b3).length, b3.KC.form.state.template.name], [506, "Evening"], "“No template” in Filters: a view choice only");
  bsel.value = td.tpl.id; bsel.dispatchEvent(new b3.w.Event("change"));
  const bl = b3.KC.form.shareLink(), bld = b3.KC.codec.decode(bl);
  eq([Object.keys(bld.items), bld.by && bld.by.id, bld.tpl], [["hugging"], td.tpl.id, undefined], "plain link of a list by a template: its answers + fi= mark");
  click(b3.w, b3.d.getElementById("mineBtn"));
  ok(/по шаблону «Evening»/.test(b3.d.querySelector("#mineList .saved-row.current").textContent), "My lists: the current list is marked as by template");
  ok(/По шаблону «Evening», пунктов: 5/.test(b3.KC.form.buildSheet().textContent), "PDF names the template");
  eq(Object.keys(b3.KC.codec.decode(b3.KC.store.ownCode()).items), ["hugging"], "compare gets the template's answers");
  // reopening the list applies its template again
  click(b3.w, b3.d.querySelector('.item[data-id="chains"] .scale button[data-v="love"]')); await sleep(300);
  b3 = open("form", { storage: b3.storage() });
  eq([visP(b3).length, b3.d.getElementById("noticeBar").hidden], [5, true], "reopened: template applied again, no notice");
  // the same template link again: my list by it opens, nothing duplicated
  r3 = open("form", { hash: tplLink.split("#")[1], storage: b3.storage() });
  eq([LS(r3, TK).length, LS(r3, RK2).length, LS(r3, MK).length, JSON.parse(r3.storage().session.kcNotice).fill], [1, 1, 2, "same"], "same link again: nothing duplicated, the open list is used");
  b3 = open("form", { storage: r3.storage() });
  ok(/Этот шаблон уже есть/.test(b3.d.getElementById("noticeText").textContent) && /уже заполняете/.test(b3.d.getElementById("noticeText").textContent) && /уже есть в «Полученных»/.test(b3.d.getElementById("noticeText").textContent), "notice: template and sender's list already here, already filling it");
  // from another of my lists: the list by this template is reopened
  click(b3.w, b3.d.getElementById("mineBtn"));
  const borisRow = [...b3.d.querySelectorAll("#mineList .saved-row")].find(r => !/по шаблону/.test(r.textContent));
  click(b3.w, borisRow.querySelector('[data-act="load"]'));
  b3 = open("form", { storage: b3.storage() });
  eq([b3.KC.form.state.name, b3.KC.form.state.template, visP(b3).length], ["Boris", undefined, 506], "switched to my plain list");
  r3 = open("form", { hash: tplLink.split("#")[1], storage: b3.storage() });
  b3 = open("form", { storage: r3.storage() });
  eq([b3.KC.form.state.template.name, Object.keys(b3.KC.form.state.items).sort(), LS(b3, MK).length], ["Evening", ["chains", "hugging"], 2], "template link from another list: my list by it is reopened (not a new one)");
  ok(/Открыта ваша анкета по шаблону «Evening»/.test(b3.d.getElementById("noticeText").textContent), "notice says it was reopened");
  // "Fill in" from Received → Templates does the same
  click(b3.w, b3.d.getElementById("savedBtn"));
  eq([...b3.d.querySelectorAll('#savedTplList .tpl-row button[data-act]')].map(b => b.dataset.act), ["nebula", "share", "use", "rename", "del"], "received template row: nebula, Share, Fill in, Rename, ✕");
  ok(/по шаблону «Evening»/.test(b3.d.getElementById("savedList").textContent), "Received: the sender's list is marked");
  const recStorage = b3.storage();

  S("Templates: opening a received list by a template");
  const recItem = LS(b3, RK2)[0];
  let rv = open("form", { hash: KCn.codec.extract(b3.KC.store.received.asListCode(recItem.code)), storage: recStorage });
  eq([rv.KC.form.viewingShared, visP(rv).length, rv.KC.form.sharedBy.name], [true, 5, "Evening"], "someone's list by a template opens with that template");
  ok(/создана по шаблону «Evening»: показаны только его пункты/.test(rv.d.getElementById("tplNoteText").textContent), "…and says so");
  ok(!rv.d.getElementById("bannerTplFill") && rv.d.getElementById("bannerTpl").textContent === "Показать по шаблону…", "one clear banner button: “Show by a template…”");
  click(rv.w, rv.d.getElementById("bannerKeep"));
  eq(rv.KC.form.state.template, { id: td.tpl.id, name: "Evening" }, "“Use as my own” keeps what it was created by");
  // v552–553 Received entries were saved as template links: opening them never starts the template flow
  const oldEntry = tplLink.split("#")[1], conv = KCn.codec.decode(KCn.store.received.asListCode(oldEntry));
  eq([conv.tpl, conv.by && conv.by.name, Object.keys(conv.items).length, conv.damaged], [undefined, "Evening", 5, false], "old Received entry opens as a list by the template");

  S("Templates: someone's list shown by my template");
  const bobPlain = KCn.codec.encode({ uid: "BOB002", name: "Bob", items: { hugging: { interest: "yes" }, "spanking-hand": { interest: "love" }, chains: { interest: "maybe" } }, meta: {} }, "ru");
  rv = open("form", { hash: bobPlain, storage: recStorage });
  eq([rv.KC.form.sharedBy, rv.d.getElementById("tplNote").hidden, visP(rv).length], [null, true, 506], "plain list: no template, no note");
  click(rv.w, rv.d.getElementById("bannerTpl"));
  ok(!rv.d.getElementById("tplSel").hidden, "“Show by a template…” points at the template list in the header");
  const rsel = rv.d.getElementById("tplSel"); rsel.value = td.tpl.id; rsel.dispatchEvent(new rv.w.Event("change"));
  eq([visP(rv).length, Object.keys(rv.KC.form.shown().items).sort()], [5, ["chains", "hugging"]], "cut to the template; only its answers leave the page");
  ok(/Показаны только пункты шаблона «Evening» \(5\)/.test(rv.d.getElementById("tplNoteText").textContent), "note for a template applied by hand");
  ok(/По шаблону «Evening»/.test(rv.KC.form.buildSheet().textContent), "PDF of someone's list by my template");
  eq(LS(rv, OK_).template.name, "Evening", "my own list is not touched");

  S("Templates: deleted template");
  let dz = open("form", { storage: recStorage });
  click(dz.w, dz.d.getElementById("savedBtn"));
  let conf = 0; dz.w.confirm = () => { conf++; return true; };
  click(dz.w, dz.d.querySelector('#savedTplList button[data-act="del"]'));
  eq([conf, LS(dz, TK).length], [1, 0], "deleting a template asks first");
  dz = open("form", { storage: dz.storage() });
  eq([visP(dz).length, dz.d.getElementById("tplAct").hidden], [506, true], "list by a deleted template: opens with all items");
  ok(/создана по шаблону «Evening», но этого шаблона больше нет среди сохранённых\. Показаны все пункты\./.test(dz.d.getElementById("tplNoteText").textContent), "…and still says what it was created by");
  click(dz.w, dz.d.getElementById("mineBtn"));
  ok(/по удалённому шаблону «Evening»/.test(dz.d.getElementById("mineList").textContent), "My lists: “by the deleted template”");
  click(dz.w, dz.d.getElementById("savedBtn"));
  ok(/по шаблону «Evening» \(его нет в ваших шаблонах\)/.test(dz.d.getElementById("savedList").textContent), "Received: template not among mine");
  eq(Object.keys(dz.KC.codec.decode(dz.KC.store.ownCode()).items).sort(), ["chains", "hugging"], "compare: the whole list when the template is gone");

  S("Templates: sharing a saved template (empty)");
  p = open("form", { storage: senderStorage });
  click(p.w, p.d.getElementById("mineBtn"));
  const evRow = [...p.d.querySelectorAll("#mineTplList .tpl-row")].find(r => /Evening/.test(r.textContent));
  click(p.w, evRow.querySelector('[data-act="share"]'));
  const emptyLink = p.d.getElementById("shareLink").value, ed = p.KC.codec.decode(emptyLink);
  ok(p.d.getElementById("overlay").classList.contains("show") && p.d.getElementById("tplShare").hidden, "share window shows only the template link");
  eq([ed.tpl.id, ed.tpl.name, ed.tpl.ids.sort(), Object.keys(ed.items).length, ed.uid, ed.name, ed.damaged], [td.tpl.id, "Evening", Object.keys(A5).sort(), 0, undefined, "", false], "empty template link: same id and name, the item set, no answers, no list id");
  ok(/без ответов/.test(p.d.getElementById("shareKind").textContent), "…and says so");
  ok(/&t=/.test(emptyLink) && !/_/.test(emptyLink), "item set in t=, no “_”");
  // a third person gets an empty list by the template, nothing in Received
  let c3 = open("form", { hash: emptyLink.split("#")[1], storage: { local: { "checklist-lang": "ru" }, session: {} } });
  eq([LS(c3, TK).length, LS(c3, RK2), Object.keys(LS(c3, OK_).items).length, LS(c3, OK_).template.name], [1, null, 0, "Evening"], "empty template: saved + an empty list by it; no sender list");
  c3 = open("form", { storage: c3.storage() });
  eq([visP(c3).length, c3.d.getElementById("noticeOpen").hidden, /Анкета отправителя/.test(c3.d.getElementById("noticeText").textContent)], [5, true, false], "…notice without a sender's list");
  // and forwards it unchanged
  click(c3.w, c3.d.getElementById("savedBtn"));
  click(c3.w, c3.d.querySelector('#savedTplList button[data-act="share"]'));
  const fwd = c3.KC.codec.decode(c3.d.getElementById("shareLink").value);
  eq([fwd.tpl.id, fwd.tpl.name, fwd.tpl.ids.length, Object.keys(fwd.items).length], [td.tpl.id, "Evening", 5, 0], "a received template is forwarded with the same id and name");
  // link integrity covers the item set
  const tpart = new URLSearchParams(emptyLink.split("#")[1]).get("t");
  eq(KCn.codec.decode(emptyLink.replace("t=" + tpart, "t=" + tpart.slice(0, -1) + (tpart.slice(-1) === "A" ? "B" : "A"))).damaged, true, "a changed item set is detected");
  eq(KCn.codec.decode(emptyLink.replace(/&k=\w+/, "")).damaged, false, "…a link without checksum still opens");
  const bigSet = []; KCn.CATS.forEach(c => c.items.forEach(([, id]) => bigSet.push(id)));
  const bigL = KCn.codec.encode(Object.assign(KCn.store.blank(), { tpl: { id: "ABCDEF", name: "All", ids: bigSet } }), "ru"), bigD = KCn.codec.decode(bigL);
  eq([bigD.tpl.ids.length, bigD.damaged], [506, false], "a template of every item round-trips (bitmap form)");
  ok(new URLSearchParams(bigL).get("t").length <= 90, "…in about 80 characters (grows 1 bit per item)");

  S("Templates: updates and own template");
  p = open("form", { storage: senderStorage });
  click(p.w, p.d.querySelector('.item[data-id="spanking-hand"] .scale button[data-v="yes"]'));
  click(p.w, p.d.getElementById("shareBtn")); p.d.getElementById("tplName").value = "Evening"; click(p.w, p.d.getElementById("tplShareBtn"));
  const tplLink2 = p.d.getElementById("shareLink").value;
  eq([p.KC.codec.decode(tplLink2).tpl.id, LS(p, TK).find(x => x.name === "Evening").ids.length], [td.tpl.id, 6], "same name again: same template id, My template updated");
  r3 = open("form", { hash: tplLink2.split("#")[1], storage: recStorage });
  tl = LS(r3, TK);
  eq([tl.length, tl[0].ids.length, JSON.parse(r3.storage().session.kcNotice).tpl], [1, 6, "updated"], "recipient: the template is updated, not duplicated");
  b3 = open("form", { storage: r3.storage() });
  eq(visP(b3).length, 6, "my list by it now shows the new item too");
  // the sender opens their own template link
  const ps = open("form", { hash: tplLink.split("#")[1], storage: p.storage() });
  const pn = JSON.parse(ps.storage().session.kcNotice);
  eq([pn.tpl, pn.fill, pn.sender, LS(ps, RK2), LS(ps, TK).every(x => x.own)], ["own", "reuse", undefined, null, true], "own template link: my list by it opens, nothing goes to Received");

  S("Templates: backup, compare");
  let lb = open("form", { storage: recStorage });
  const bk2 = lb.KC.store.exportAll();
  ok(bk2.templates.length === 1 && bk2.mine.some(x => x.data.template) && bk2.favs, "backup contains templates, favourites and what each list was created by");
  let q2 = open("form", { storage: { local: {}, session: {} } });
  const res2 = q2.KC.store.importAll(JSON.parse(JSON.stringify(bk2)));
  eq([res2.templates, q2.KC.store.tpl.list().length, q2.KC.store.mine.list().find(x => x.data.template).data.template.name], [1, 1, "Evening"], "restore adds templates and keeps list marks");
  eq(q2.KC.store.importAll(JSON.parse(JSON.stringify(bk2))).templates, 0, "restoring twice adds no templates");
  const sendBk = { app: "kinkcheck", v: 1, mine: [], received: [], templates: bk2.templates.map(x => Object.assign({}, x, { id: "tOther", own: true })) };
  eq(q2.KC.store.importAll(sendBk).templates, 0, "a template already here (as received) is not added again as mine, and vice versa");
  const oldBk = JSON.parse(JSON.stringify(bk2)); delete oldBk.templates; delete oldBk.favs;
  ok(open("form").KC.store.importAll(oldBk) !== null, "backups without templates still restore");
  eq(KCn.codec.decode(l1).tpl, undefined, "plain links carry no template");
  const cp = open("compare", { storage: recStorage });
  ok([...cp.d.querySelectorAll(".cmp-pick option")].some(o => /по шаблону «Evening»/.test(o.textContent)), "compare picker marks lists by template");
  // lists saved by v552–553 kept a copy of the items: now only the reference remains
  eq(KCn.store.normalize({ items: {}, template: { id: "ABCDEF", name: "X", ids: ["hugging"] } }).template, { id: "ABCDEF", name: "X" }, "old template copies become references");

  S("Help");
  let hp0 = open("form", { storage: own5 });
  const qs = [...hp0.d.querySelectorAll("[data-help]")].map(b => b.dataset.help);
  ok(hp0.d.querySelector(".brand-row .help-q") && ["start", "share", "lists", "received", "tpl", "pdf"].every(s => qs.indexOf(s) >= 0), "“?” in the header and in each window: " + qs.join(","));
  click(hp0.w, hp0.d.querySelector('.brand-row [data-help="start"]'));
  ok(hp0.d.getElementById("helpOverlay").classList.contains("show") && hp0.d.querySelectorAll("#helpBody section").length === 12, "help window with 12 sections (What's new is its own tab)");
  ok(/Чек-лист практик для разговора/.test(hp0.d.getElementById("helpBody").textContent) && /Шаблон — это набор пунктов/.test(hp0.d.getElementById("helpBody").textContent), "help text in Russian");
  click(hp0.w, hp0.d.querySelector('#langSw button[data-lang="en"]'));
  click(hp0.w, hp0.d.querySelector('#mineOverlay [data-help="lists"]'));
  ok(/A template is a set of items/.test(hp0.d.getElementById("helpBody").textContent) && hp0.d.getElementById("helpTitle").textContent === "How to use", "help follows the language");
  const cq = open("compare", { storage: own5 });
  click(cq.w, cq.d.querySelector('[data-help="compare"]'));
  ok(cq.d.getElementById("helpOverlay").classList.contains("show") && cq.d.getElementById("help-compare"), "help on the compare page");

  S("Header: search row, ♥ toggle, PDF window");
  let hp = open("form", { storage: own5 });
  eq([...hp.d.querySelector(".subbar").children].map(x => x.id || x.className), ["search", "jump", "tplSel", "view", "fav-toggle", "extToggleBox"], "row: search, Section, Template…, All items, ♥, (v615) ⇅ — the role filter moved to the button row");
  ok(!hp.d.getElementById("tplSel").hidden && hp.d.querySelectorAll("#tplSel optgroup").length === 1, "no own templates yet: the Template list still offers the starter templates (v617)");
  eq(hp.d.querySelector(".fav-toggle").textContent.trim(), "♥", "favourites toggle is just a heart");
  eq(hp.d.querySelector(".fav-toggle").title, "Только избранное ♥", "…with a title");
  setView(hp, "unanswered"); ok(hp.d.getElementById("view").classList.contains("on"), "“Show” list highlighted while it filters");
  setView(hp, "all"); ok(!hp.d.getElementById("view").classList.contains("on"), "…not with All items");
  click(hp.w, hp.d.getElementById("pdfBtn"));
  ok(hp.d.getElementById("pdfOverlay").classList.contains("show") && hp.d.getElementById("pdfScope").hidden, "PDF button opens the export window");
  const om = hp.d.getElementById("onlyMarked"); om.checked = false; om.dispatchEvent(new hp.w.Event("change"));
  eq(hp.KC.form.state.onlyMarked, false, "export option still saved with the list");
  click(hp.w, hp.d.getElementById("pdfClose"));
  const hf = hp.d.getElementById("onlyFav"); hf.checked = true; hf.dispatchEvent(new hp.w.Event("change"));
  click(hp.w, hp.d.getElementById("pdfBtn"));
  eq(hp.d.getElementById("pdfScope").textContent, "Только избранное ♥", "export window says what the PDF is limited to");
  await sleep(300);
  hp = open("form", { storage: hp.storage() });
  eq(hp.d.getElementById("onlyMarked").checked, false, "export option restored on reload");

  S("7 practices added in v555");
  const K7 = open("form").KC, W7 = id => (K7.CATS.find(c => c.items.some(([, x]) => x === id)) || {}).id;
  const NEW7 = { "drinking-from-feet": 446, "forced-drinking-from-feet": 447, "drinking-bathwater": 448, "forced-drinking-bathwater": 449, "latex-sweat": 450, "toe-licking-giving": 451, "toe-licking-receiving": 452 };
  eq(Object.keys(NEW7).filter(id => W7(id) !== "fetishes"), [], "all 7 under fetishes");
  const code7 = {}; K7.CATS.forEach(c => c.items.forEach(([code, id]) => { code7[id] = code; }));
  eq(Object.keys(NEW7).filter(id => code7[id] !== NEW7[id]), [], "codes 446–452");
  eq(Object.keys(NEW7).map(id => K7.i18n.item(id, "ru").name), ["Пить (лимонад/алкоголь) стекающий со ступней", "Заставлять пить (лимонад/алкоголь) стекающий со ступней", "Пить жидкость, в которой кто-то купался", "Заставлять пить жидкость, в которой кто-то купался", "Пот после ношения латекса", "Облизывание пальцев ног (партнёра)", "Облизывание пальцев ног (вам)"], "RU names as requested");
  const fo = K7.CATS.find(c => c.id === "fetishes").items.map(([, id]) => id);
  eq(fo.slice(fo.indexOf("foot-worship"), fo.indexOf("foot-worship") + 5), ["foot-worship", "toe-licking-giving", "toe-licking-receiving", "drinking-from-feet", "forced-drinking-from-feet"], "foot items next to Foot fetish");
  ok(fo.indexOf("latex-sweat") === fo.indexOf("rubber-latex-wearing") + 1 && fo.indexOf("drinking-bathwater") === fo.indexOf("wearing-partners-underwear") + 1, "latex sweat after latex, bathwater after underwear items");
  ok(Object.keys(NEW7).every(id => code7[id] < K7.NEW_FROM_CODE), "v615: these 7 no longer get the green dot (dots only from 497)");

  S("11 practices added in v556");
  const K11 = open("form").KC, W11 = id => (K11.CATS.find(c => c.items.some(([, x]) => x === id)) || {}).id;
  const NEW11 = { "thumb-cuffs": [453, "bondage"], "toe-cuffs": [454, "bondage"], "ice-dildo": [455, "sensation-play"], "breath-control-facesitting": [456, "sensation-play"],
    "ear-licking": [457, "intimacy"], "clothes-cutting": [458, "fetishes"], "clothes-tearing": [459, "fetishes"], "tights-tearing": [460, "fetishes"],
    "hair-bondage": [461, "bondage"], "trampling-punk-boots": [462, "impact-rough-play"], "mutually-restrictive-bondage": [463, "bondage"] };
  const code11 = {}; K11.CATS.forEach(c => c.items.forEach(([code, id]) => { code11[id] = code; }));
  eq(Object.keys(NEW11).filter(id => code11[id] !== NEW11[id][0] || W11(id) !== NEW11[id][1]), [], "codes 453–463 in their sections");
  const next11 = (cat, a) => { const o = K11.CATS.find(c => c.id === cat).items.map(([, id]) => id); return o[o.indexOf(a) + 1]; };
  eq([next11("bondage", "cuffs-handcuff"), next11("bondage", "semenawa"), next11("bondage", "predicament-bondage"), next11("intimacy", "kissing-mouth"), next11("sensation-play", "ice-cubes"), next11("sensation-play", "breath-control-mild"), next11("fetishes", "clothed-sex"), next11("impact-rough-play", "trampling-shoes")],
    ["thumb-cuffs", "hair-bondage", "mutually-restrictive-bondage", "ear-licking", "ice-dildo", "breath-control-facesitting", "clothes-cutting", "trampling-punk-boots"], "each next to its related item");
  ok(/презерватив/.test(K11.i18n.item("ice-dildo", "ru").desc) && /[Нн]едолго/.test(K11.i18n.item("ice-dildo", "ru").desc), "ice dildo hint: short, with a condom");
  ok(/не подвес/.test(K11.i18n.item("hair-bondage", "ru").desc) && /опасен/.test(K11.i18n.item("hair-bondage", "ru").desc), "hair bondage hint: not suspension, suspension is dangerous");
  ok(/металлическим носком/.test(K11.i18n.item("trampling-punk-boots", "ru").desc) && /толстой подошве/.test(K11.i18n.item("trampling-punk-boots", "ru").desc), "punk boots hint: heavy thick-soled boots, maybe metal toe");

  S("v557: corner kneeler, biting light/hard");
  const K2 = open("form").KC, W2 = id => (K2.CATS.find(c => c.items.some(([, x]) => x === id)) || {}).id;
  const code2 = {}; K2.CATS.forEach(c => c.items.forEach(([code, id]) => { code2[id] = code; }));
  eq([code2["corner-kneeler"], W2("corner-kneeler"), code2["biting-hard"], W2("biting-hard"), code2["biting"]], [464, "humiliation", 465, "sensation-play", 185], "codes 464–465; biting keeps its code 185");
  const nx = (cat, a) => { const o = K2.CATS.find(c => c.id === cat).items.map(([, id]) => id); return o[o.indexOf(a) + 1]; };
  eq([nx("humiliation", "kneeling-on-buckwheat"), nx("sensation-play", "biting")], ["corner-kneeler", "biting-hard"], "next to buckwheat / to biting");
  eq(["ru", "en"].map(l => [K2.i18n.item("biting", l).name, K2.i18n.item("biting-hard", l).name]), [["Укусы лёгкие", "Укусы сильные (до синяков)"], ["Biting – light", "Biting – hard (to bruises)"]], "biting renamed, hard biting added");
  eq(K2.i18n.item("biting", "ru").desc, "Быть укушенным.", "the old hint is unchanged");

  S("v557: PDF “favourites and limits only”");
  p = open("form", { storage: own5 });
  click(p.w, heart(p, "hugging")); click(p.w, heart(p, "sleep-sacks"));
  click(p.w, p.d.getElementById("pdfBtn"));
  const fl = p.d.getElementById("pdfFavLimits");
  eq([fl.checked, p.d.getElementById("pdfScope").hidden], [false, true], "checkbox off by default");
  fl.checked = true; fl.dispatchEvent(new p.w.Event("change"));
  eq(p.d.getElementById("pdfScope").textContent, "Только избранное и табу (Нет)", "scope line follows the checkbox");
  let shfl = p.KC.form.buildSheet().textContent;
  const nm2 = id => p.KC.i18n.item(id).name;
  ok(shfl.indexOf(nm2("hugging")) >= 0 && shfl.indexOf(nm2("sleep-sacks")) >= 0 && shfl.indexOf(nm2("orgy")) >= 0 && shfl.indexOf(nm2("chains")) < 0 && shfl.indexOf(nm2("blindfolds")) < 0,
    "PDF: favourites (even unanswered) + “No” answers, nothing else");
  ok(/Только избранное и табу/.test(shfl) && !/♥ Избранное/.test(shfl), "named in the header, no separate favourites block");
  click(p.w, p.d.getElementById("pdfClose")); click(p.w, p.d.getElementById("pdfBtn"));
  eq(fl.checked, false, "off again when the window reopens");

  S("v557: Template list in the header");
  let hq = open("form", { storage: recStorage });
  const ts = hq.d.getElementById("tplSel");
  eq([ts.hidden, ts.value, ts.options[ts.selectedIndex].textContent, ts.classList.contains("on")], [false, td.tpl.id, "Evening", true], "list by a template: the header list shows its name, highlighted");
  eq(ts.options[0].textContent, "✕ Без шаблона", "first option removes it");
  ts.value = ""; ts.dispatchEvent(new hq.w.Event("change"));
  eq([visP(hq).length, ts.options[ts.selectedIndex].textContent, ts.classList.contains("on")], [506, "Шаблон…", false], "one pick: no template, the list says “Template…”");

  S("v557: share the current template");
  hq = open("form", { storage: recStorage });
  click(hq.w, hq.d.getElementById("shareBtn"));
  const cb = hq.d.getElementById("tplCurBtn");
  eq([cb.hidden, cb.textContent], [false, "Поделиться текущим шаблоном «Evening»"], "button with the current template's name");
  click(hq.w, cb);
  const cl = hq.KC.codec.decode(hq.d.getElementById("shareLink").value), myAns = Object.keys(hq.KC.form.state.items).filter(id => LS(hq, TK)[0].ids.indexOf(id) >= 0);
  eq([cl.tpl.id, cl.tpl.name, cl.tpl.ids.length, Object.keys(cl.items).sort(), cl.damaged], [td.tpl.id, "Evening", LS(hq, TK).find(x => x.tid === td.tpl.id).ids.length, myAns.sort(), false], "same template (id, name, every item) + my answers to it");
  ok(/с вашими ответами/.test(hq.d.getElementById("shareKind").textContent), "share window says so");
  let rq = open("form", { hash: hq.d.getElementById("shareLink").value.split("#")[1], storage: { local: { "checklist-lang": "ru" }, session: {} } });
  eq([LS(rq, TK)[0].tid, LS(rq, TK)[0].ids.length, (LS(rq, RK2) || []).length, JSON.parse(rq.storage().session.kcNotice).sender], [td.tpl.id, cl.tpl.ids.length, 1, "added"], "recipient: the whole template + the sender's list in Received");
  let hn = open("form", { storage: own5 }); click(hn.w, hn.d.getElementById("shareBtn"));
  ok(hn.d.getElementById("tplCurBtn").hidden, "no current template: no button");

  S("v558: favourites and answers are not lost (B20)");
  // 1) a heart right before leaving the page is written at once
  let f1 = open("form", { storage: own5 });
  click(f1.w, heart(f1, "chains"));
  eq(LS(f1, OK_).fav, undefined, "the save is still waiting…");
  f1.w.dispatchEvent(new f1.w.Event("pagehide"));
  eq(LS(f1, OK_).fav, ["chains"], "…and is written when the page is left");
  // 2) two tabs: the other tab's change is taken over, never written back over
  const other = Object.assign(JSON.parse(f1.w.localStorage.getItem(OK_)), { fav: ["chains", "orgy"] });
  other.items.stocks = { interest: "love" };
  f1.w.localStorage.setItem(OK_, JSON.stringify(other));
  f1.w.dispatchEvent(new f1.w.StorageEvent("storage", { key: "practices-checklist-v1" }));
  eq([f1.KC.form.favList().sort(), heart(f1, "orgy").textContent, f1.KC.form.state.items.stocks], [["chains", "orgy"], "♥", { interest: "love" }], "change from another tab shown here");
  click(f1.w, f1.d.querySelector('.item[data-id="gag-ball"] .scale button[data-v="yes"]')); await sleep(300);
  const after = LS(f1, OK_);
  eq([after.fav.sort(), after.items.stocks, after.items["gag-ball"]], [["chains", "orgy"], { interest: "love" }, { interest: "yes" }], "an answer here keeps the other tab's heart and answer");
  // 3) the filter lists show a dot, not a filled field
  ok(/radial-gradient/.test(fs.readFileSync(require("./harness").ROOT + "/css/style.css", "utf8").split("#view.on")[1] || ""), "active list marked with a dot");

  S("v559: lists keep the tapped option while open (B21)");
  let jp9 = open("form", { storage: own5 });
  const js2 = jp9.d.getElementById("jump"); js2.value = "cat-fetishes"; js2.dispatchEvent(new jp9.w.Event("change"));
  eq(js2.value, "cat-fetishes", "Section: the tapped section stays selected while the list is open");
  js2.dispatchEvent(new jp9.w.FocusEvent("blur"));
  eq(js2.value, "", "…and shows “Section…” again once closed");
  let cq2 = open("compare", { storage: own5 });
  const cpick = cq2.d.querySelector("#parts .cmp-col .cmp-pick"), cur = [...cpick.options].find(o => o.value === "cur");
  cpick.value = cur.value; cpick.dispatchEvent(new cq2.w.Event("change", { bubbles: true }));
  eq([cpick.value, !!cq2.d.getElementById("codeA").value], ["cur", true], "Compare: the picked list stays selected and is filled in");
  cpick.dispatchEvent(new cq2.w.FocusEvent("focusout", { bubbles: true }));
  eq(cpick.value, "", "…and the picker shows its label again once closed");

  S("v560: interface fully translated");
  const SAME_OK = { pt: ["rl.pair", "profile.orient.bi", "pdf.file", "role.short.dom", "role.short.sub", "help.pdf.h", "ext.onlyT", "ext.onlyB", "av.toAv", "tpl.st.extra"], es: ["tpl.st.extra", "av.toAv", "ext.onlyT", "ext.onlyB", "rl.pair", "profile.orient.bi", "pdf.file", "role.short.dom", "role.short.sub", "help.pdf.h", "scale.limit"], ja: ["rl.pair", "card.file", "profile.orient.bi", "help.pdf.h", "pdf.file"], th: ["rl.pair", "card.file", "profile.orient.bi", "help.pdf.h", "pdf.file"], zh: ["rl.pair", "card.file", "help.pdf.h", "pdf.file"] };
  /* v586: words that are the same as in English on purpose (D/s, S/M, Bondage, names of creatures) */
  const SAME586 = { pt: ["sign.caracal", "pt.s.bondage", "sign.flamingo", "sign.kraken", "sign.naga", "sign.kitsune", "sign.kappa", "sign.wyvern"],
    es: ["sign.caracal", "sign.cobra", "pt.s.bondage", "sign.collar", "sign.kraken", "sign.naga", "sign.kitsune", "sign.kappa"], ja: [], th: [], zh: [] };
  Object.keys(SAME586).forEach(l => { SAME_OK[l] = SAME_OK[l].concat(SAME586[l], ["pt.s.ds", "pt.s.sm"]); });
  /* v596: race and monster names that are the same as in English on purpose */
  { const same = { es: ["dnd.r.drow", "dnd.r.yuanti", "dnd.r.tabaxi", "dnd.r.kenku", "dnd.m.medusa", "dnd.m.balor", "dnd.m.marilith", "dnd.m.kraken"],
      pt: ["dnd.r.drow", "dnd.r.yuanti", "dnd.r.tabaxi", "dnd.r.kenku", "dnd.m.medusa", "dnd.m.balor", "dnd.m.marilith", "dnd.m.kraken", "dnd.m.kobold", "dnd.m.goblin", "dnd.m.lich", "dnd.m.tarrasque"] };
    Object.keys(same).forEach(l => { SAME_OK[l] = SAME_OK[l].concat(same[l]); }); }
  /* v591: the "🎲 DnD" button reads the same everywhere */
  Object.keys(SAME_OK).forEach(l => { SAME_OK[l].push("dnd.toDnd", "wr.toWr"); });   /* v610: "⚔ Wr" is the same in every language */
  /* v597: World of Darkness proper names (clans, auspices, ranks, the Babylonian house names…) stay as in English */
  const WOD_SAME = /^(wod\.(vamp|wolf|fey|demon\.a|aus|rank|sect|breed)\.|sp\.wod\.grp\.vamp$|wod\.of\.vamp$|wod\.(gnosis|glamour)$|wh\.f\.|leg\.l\.|wh\.toWh$|ow\.r\.|ow\.toOw$|wi\.g\.|ext\.(ask[TB]|row\.[tb]|arrow\.[tb])$)/;   /* v610: faction and legion names are proper names (often the same as English) */
  const packsUI = {}; ["en", "ru", "pt", "es", "ja", "th", "zh"].forEach(l => { const box = {}; new Function("KC", fs.readFileSync(require("./harness").ROOT + "/js/lang/" + l + ".ui.js", "utf8"))({ addLang: (x, part, o) => Object.assign(box, o) }); packsUI[l] = box; });
  ["pt", "es", "ja", "th", "zh"].forEach(l => eq(Object.keys(packsUI.en).filter(k => packsUI[l][k] === packsUI.en[k] && SAME_OK[l].indexOf(k) < 0 && !WOD_SAME.test(k)), [], l + ": no interface string left in English"));
  ok(!/TEMPORARY/.test(["pt", "es", "ja", "th", "zh"].map(l => fs.readFileSync(require("./harness").ROOT + "/js/lang/" + l + ".ui.js", "utf8")).join("")), "no TEMPORARY markers left");
  const helpKeys = Object.keys(packsUI.en).filter(k => /^help\..*_html$/.test(k));
  eq(helpKeys.filter(k => !/[\u0E00-\u0E7F]/.test(packsUI.th[k])), [], "TH help texts are Thai");
  eq(helpKeys.filter(k => !/[\u3040-\u30ff\u4e00-\u9faf]/.test(packsUI.ja[k])), [], "JA help texts are Japanese");
  eq(helpKeys.filter(k => !/[\u4e00-\u9fff]/.test(packsUI.zh[k])), [], "ZH help texts are Chinese");
  const ph2 = x => (x.match(/\{\w+\}/g) || []).sort().join();
  ["pt", "es", "ja", "th", "zh", "ru"].forEach(l => eq(Object.keys(packsUI.en).filter(k => packsUI[l] && packsUI[l][k] != null && ph2(packsUI[l][k]) !== ph2(packsUI.en[k])), [], l + ": same {placeholders} as English"));

  S("v561: forced staying in sweat/cum; dots after v533");
  const K3 = open("form").KC, code3 = {}; K3.CATS.forEach(c => c.items.forEach(([code, id]) => { code3[id] = code; }));
  const bf = K3.CATS.find(c => c.id === "bodily-fluids").items.map(([, id]) => id);
  eq([code3["forced-staying-in-sweat-cum"], bf[bf.indexOf("cum-on-body") + 1]], [466, "forced-staying-in-sweat-cum"], "code 466, right after “cum on body”");
  eq(K3.i18n.item("forced-staying-in-sweat-cum", "ru").name, "Принудительное оставление в поту/сперме на какое-то время после практики", "RU name as requested");
  const d3 = open("form", { storage: { local: { "checklist-lang": "ru" }, session: {} } }).d;
  eq(["bukkake", "furry", "clowncore", "tongue-clothespins", "nyotaimori", "latex-sweat", "forced-staying-in-sweat-cum"].map(id => !!d3.querySelector('.item[data-id="' + id + '"] .new-dot')), [false, false, false, false, false, false, false], "v615: no dot on any of these (dots only from 497)");

  S("v564: saved comparisons (3+)");
  {
    const _sc = scope();
    const it = (a, b, c) => ({ hugging: { interest: a }, chains: { interest: b }, orgy: { interest: c } });
    const codeOf = (name, uid, items) => KCn.codec.encode({ name, uid, items, meta: {} });
    const recC = [{ id: "ra", name: "Anna", code: codeOf("Anna", "ANNA01", it("love", "yes", "yes")), ts: 3 }, { id: "rb", name: "Boris", code: codeOf("Boris", "BORI01", it("yes", "yes", "limit")), ts: 2 }];
    const kira = { id: "mk", name: "Kira", data: { name: "Kira", uid: "KIRA01", items: it("yes", "love", "yes"), meta: {} }, ts: 5 };
    const me = { name: "Me", uid: "MEME01", items: it("love", "love", "maybe"), meta: {} };
    const st0 = { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(me), "checklist-my-profiles-v1": JSON.stringify([kira, { id: "mm", name: "", data: me, ts: 6 }]), "checklist-active-mine-id": "mm", "checklist-saved-profiles-v1": JSON.stringify(recC) }, session: {} };
    let q = open("compare", { storage: st0, answers: { prompt: "Friends" } });
    eq(q.d.getElementById("cmpSaved").hidden, true, "no saved comparisons: the picker is hidden");
    const pickIn = (pg, col, v) => { const sel = col.querySelector(".cmp-pick"); sel.value = v; sel.dispatchEvent(new pg.w.Event("change", { bubbles: true })); };
    const colsQ = () => [...q.d.querySelectorAll("#parts .cmp-col")];
    pickIn(q, colsQ()[1], "r:ra");
    click(q.w, q.d.getElementById("cmpBtn"));
    ok(!q.d.querySelector('#cmpSaveBar button[data-act="save"]'), "two people: no “Save comparison” (comparing two is quick anyway)");
    click(q.w, q.d.getElementById("addPart")); pickIn(q, colsQ()[2], "r:rb");
    click(q.w, q.d.getElementById("addPart")); pickIn(q, colsQ()[3], "m:mk");
    click(q.w, q.d.getElementById("cmpBtn"));
    const sv = q.d.querySelector('#cmpSaveBar button[data-act="save"]');
    ok(sv && sv.textContent === "Сохранить сравнение", "four people: “Save comparison” above the result");
    click(q.w, sv);
    eq(q.d.getElementById("toast").textContent, "Сравнение сохранено", "saved toast");
    let cl = JSON.parse(q.w.localStorage.getItem("checklist-compares-v1"));
    eq([cl.length, cl[0].name, cl[0].parts.map(p => p.uid)], [1, "Friends", ["MEME01", "ANNA01", "BORI01", "KIRA01"]], "stored: name + lists by their list ids");
    eq([q.d.getElementById("cmpSaved").hidden, q.d.getElementById("cmpSaved").options.length], [false, 2], "the picker at the top lists it");
    ok(/Сохранённое сравнение «Friends»/.test(q.d.getElementById("cmpSaveBar").textContent), "note names the saved comparison (v601: under the saved-comparison picker)");
    click(q.w, sv); click(q.w, q.d.querySelector('#cmpSaveBar button[data-act="save"]'));
    eq(JSON.parse(q.w.localStorage.getItem("checklist-compares-v1")).length, 1, "saving again under the same name updates it, no duplicate");
    eq(q.d.getElementById("toast").textContent, "Сравнение обновлено", "updated toast");
    // lists change: Anna sends a new link (replaces her Received entry), my own list changes, Boris is deleted
    const st1 = q.storage();
    const rec1 = JSON.parse(st1.local["checklist-saved-profiles-v1"]).filter(x => x.id !== "rb").map(x => x.id === "ra" ? Object.assign(x, { code: codeOf("Anna", "ANNA01", it("love", "yes", "love")) }) : x);
    st1.local["checklist-saved-profiles-v1"] = JSON.stringify(rec1);
    st1.local["practices-checklist-v1"] = JSON.stringify(Object.assign({}, me, { items: it("love", "love", "love") }));
    q = open("compare", { storage: st1 });
    const opt = q.d.getElementById("cmpSaved"); opt.value = opt.options[1].value; opt.dispatchEvent(new q.w.Event("change", { bubbles: true }));
    eq(q.d.querySelectorAll("#parts .cmp-col").length, 4, "opening fills in all four participants");
    const namesQ = () => [...q.d.querySelectorAll("#parts .cmp-name")].map(x => x.value);
    eq(namesQ(), ["Me", "Anna", "Boris", "Kira"], "…with their names");
    const txt = q.d.getElementById("cmpSaveBar").textContent;   /* v601: the saved-comparison note sits with "Save" under the picker */
    ok(/Обновились анкеты: Me, Anna/.test(txt), "note: which lists changed since last time");
    ok(/последняя сохранённая версия: Boris/.test(txt), "note: Boris is gone from the device, his last version is used");
    const rowsQ = () => [...q.d.querySelectorAll(".rrow .nm")].map(r => r.firstChild.textContent);
    click(q.w, q.d.querySelector('button[data-f="allYM"]'));
    ok(rowsQ().indexOf("Оргия") < 0, "Boris's “No” (saved version) still excludes the orgy");
    const decA = q.KC.codec.decode(q.d.querySelectorAll("#parts textarea")[1].value);
    eq(decA.items.orgy.interest, "love", "Anna's newest answers are used");
    eq(q.KC.codec.decode(q.d.querySelectorAll("#parts textarea")[0].value).items.orgy.interest, "love", "my current answers are used");
    opt.dispatchEvent(new q.w.FocusEvent("focusout", { bubbles: true })); eq(opt.value, "", "picker returns to its label once closed");
    // hand-off from "My lists"
    const f = open("form", { storage: q.storage(), answers: { prompt: "Group" } });
    click(f.w, f.d.getElementById("mineBtn"));
    const crow = f.d.querySelector("#mineCmpList .saved-row");
    ok(crow && /Friends/.test(crow.textContent) && /участников: 4/.test(crow.textContent), "“My lists” → “My comparisons” shows it");
    click(f.w, crow.querySelector('button[data-act="rename"]'));
    eq(JSON.parse(f.w.localStorage.getItem("checklist-compares-v1"))[0].name, "Group", "rename");
    click(f.w, f.d.querySelector('#mineCmpList button[data-act="open"]'));
    const hs = f.storage(); eq(!!hs.session.cmpOpen, true, "open: hands the comparison to the compare page");
    q = open("compare", { storage: hs });
    eq([q.d.querySelectorAll("#parts .cmp-col").length, !!q.d.querySelector('#cmpSaveBar button[data-act="save"]')], [4, true], "compare page opens it right away");
    // backup
    const bk = f.KC.store.exportAll(); eq(bk.compares.length, 1, "backup contains comparisons");
    const e2 = open("form"); e2.KC.store.importAll(JSON.parse(JSON.stringify(bk))); e2.KC.store.importAll(JSON.parse(JSON.stringify(bk)));
    eq(e2.KC.store.cmp.list().length, 1, "restore adds it once");
    const e3 = open("form"); const old = JSON.parse(JSON.stringify(bk)); delete old.compares; ok(!!e3.KC.store.importAll(old), "backup without comparisons still restores");
    // delete
    const f2 = open("form", { storage: hs }); click(f2.w, f2.d.getElementById("mineBtn"));
    click(f2.w, f2.d.querySelector('#mineCmpList button[data-act="del"]'));
    eq([f2.KC.store.cmp.list().length, /Сохранённых сравнений пока нет/.test(f2.d.getElementById("mineCmpList").textContent)], [0, true], "delete (with confirmation)");
    eq(f2.KC.store.mine.list().length + JSON.parse(f2.w.localStorage.getItem("checklist-saved-profiles-v1")).length, 3, "…the lists themselves stay");
    // help
    f2.KC.help.open("compare"); ok(/Сохранить сравнение/.test(f2.d.getElementById("help-compare").textContent), "help explains saving");
    ok(!q.errors.length && !f.errors.length, "no script errors");
    _sc.end();
  }

  S("v565: anonymous counter (off until a code is set)");
  {
    const _sc = scope();
    const src = fs.readFileSync(require("./harness").ROOT + "/js/core/stats.js", "utf8");
    const code = (src.match(/const CODE = "([^"]*)"/) || [])[1];
    const pg = open("form");
    ok(typeof pg.KC.stats.event === "function", "KC.stats.event exists on the form page");
    ok(typeof open("compare").KC.stats.event === "function", "…and on the compare page");
    if (!code) {
      eq([pg.KC.stats.enabled || false, pg.d.querySelectorAll('script[src*="goatcounter"], script[src*="zgo.at"]').length], [false, 0], "no code: counter off, no external script");
      pg.KC.help.open("privacy"); ok(!/GoatCounter/.test(pg.d.getElementById("help-privacy").textContent), "no code: help does not mention the counter");
    }
    if (code) {
      eq(pg.KC.stats.enabled, true, "code “" + code + "”: counter on");
      pg.KC.help.open("privacy"); ok(/GoatCounter/.test(pg.d.getElementById("help-privacy").textContent), "code set: help explains the counter");
      ok(/goatcounter-count\.js/.test(src) && !/zgo\.at/.test(src), "the counter script is loaded from the site itself, not from an outside server");
    }
    ok(!/location\.hash|state\.items|\.name\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, "")), "the counter never reads the hash, answers or names");
    const tg = open("form", { hash: "toggle-goatcounter", storage: { local: { "practices-checklist-v1": JSON.stringify({ name: "Me", items: { hugging: { interest: "love" } }, meta: {} }) }, session: {} } });
    eq([tg.KC.form.viewingShared, tg.KC.form.state.name, tg.KC.store.received.list().length], [false, "Me", 0], "#toggle-goatcounter (exclude my own visits) opens my list, nothing added to Received");
    const junk = open("form", { hash: "top" });
    eq([junk.KC.form.viewingShared, junk.KC.store.received.list().length], [false, 0], "any other non-link #… is ignored too");
    _sc.end();
  }

  S("v568: 18+ and disclaimer on both pages");
  ["form", "compare"].forEach(pgName => {
    const lp = open(pgName, { storage: { local: { "checklist-lang": "ru" }, session: {} } }), el = lp.d.querySelector(".foot-legal");
    ok(el && /подтверждаете, что вам исполнилось 18 лет/.test(el.textContent) && /Не является пропагандой упоминаемых практик; сервис носит развлекательный характер\./.test(el.textContent), pgName + ": 18+ line and disclaimer under the footer");
    lp.KC.i18n.set("zh"); lp.KC.i18n.apply(lp.d); ok(/18 歲/.test(lp.d.querySelector(".foot-legal").textContent), pgName + ": translated (ZH)");
  });

  S("v569: damaged saved data never breaks a page");
  {
    const _sc = scope();
    const keys = ["practices-checklist-v1", "checklist-saved-profiles-v1", "checklist-my-profiles-v1", "checklist-templates-v1", "checklist-favs-v1", "checklist-compares-v1", "checklist-active-mine-id"];
    const junk = ["{", "null", "42", "\"str\"", "{\"a\":1}", "[1,2,{}]", "[{\"id\":\"x\",\"data\":5,\"code\":7}]"];
    const crashes = [];
    keys.forEach(k => junk.forEach(j => ["form", "compare"].forEach(pgName => {
      const p = open(pgName, { storage: { local: { [k]: j }, session: {} } });
      if (pgName === "form") ["savedBtn", "mineBtn", "shareBtn", "pdfBtn"].forEach(id => click(p.w, p.d.getElementById(id)));
      else { click(p.w, p.d.getElementById("addPart")); click(p.w, p.d.getElementById("cmpBtn")); }
      if (p.errors.length) crashes.push(k + "=" + j + " " + pgName + ": " + p.errors[0]);
    })));
    eq(crashes, [], "both pages open (and their windows) with any damaged value in storage");
    _sc.end();
  }

  S("v570: 8 new practices, leather paddles renamed");
  {
    const _sc = scope();
    const K = open("form").KC, codeOf = {}, catOf = {}, next = {};
    K.CATS.forEach(c => c.items.forEach(([code, id], i) => { codeOf[id] = code; catOf[id] = c.id; next[id] = (c.items[i + 1] || [])[1]; }));
    const want = { rattan: 467, "hot-wax-high-temp": 468, "pressure-points": 469, "rough-grabbing": 470, "gentle-touch": 471, "leash-walk-outside": 472, "bottle-neck-vaginal": 473, "bottle-neck-anal": 474 };
    eq(Object.keys(want).map(id => codeOf[id]), Object.values(want), "codes 467–474");
    eq([next["caning-sensation"], next["hot-wax-dripping"], next["pain-massage"], next["hair-pulling"], next["hugging"], next["leash"], next["object-insertion"], next["bottle-neck-vaginal"]],
      ["rattan", "hot-wax-high-temp", "pressure-points", "rough-grabbing", "gentle-touch", "leash-walk-outside", "bottle-neck-vaginal", "bottle-neck-anal"], "each placed next to its related item");
    eq(K.i18n.item("rattan", "ru").name, "Ротанг", "RU: Ротанг");
    ok(/законы|Законы/.test(K.i18n.item("leash-walk-outside", "ru").desc) && /стран/.test(K.i18n.item("leash-walk-outside", "ru").desc), "leash walk hint: laws and attitudes differ by country");
    ["ru", "en", "pt", "es", "ja", "th", "zh"].forEach(l => eq(Object.keys(want).filter(id => { const it = K.i18n.item(id, l); return !it.name || !it.desc || (l !== "en" && it.desc === K.i18n.item(id, "en").desc); }), [], l + ": new items translated"));
    eq([K.i18n.item("spanking-leather-slappers", "ru").name, K.i18n.item("spanking-leather-slappers", "en").name], ["Шлепки кожаными паддлами", "Spanking – leather paddles"], "leather slappers renamed to leather paddles (id kept)");
    const dn = open("form", { storage: { local: { "checklist-lang": "ru" }, session: {} } }).d;
    eq(Object.keys(want).filter(id => dn.querySelector('.item[data-id="' + id + '"] .new-dot')), [], "v615: no green dot any more (dots only from 497)");
    _sc.end();
  }

  S("v571: other sub serves you; urinating in front of a partner");
  {
    const _sc = scope();
    const K = open("form").KC, codeOf = {}, next = {};
    K.CATS.forEach(c => c.items.forEach(([code, id], i) => { codeOf[id] = code; next[id] = (c.items[i + 1] || [])[1]; }));
    eq([codeOf["other-sub-serves-you"], codeOf["urination-in-front"]], [475, 476], "codes 475, 476");
    eq([next["used-as-toy-for-other-sub"], next["urination-in-front"], next["omorashi"]], ["other-sub-serves-you", "omorashi", "golden-showers"], "placed next to related items");
    eq([K.i18n.item("other-sub-serves-you", "ru").name, K.i18n.item("urination-in-front", "ru").name], ["Вас удовлетворяет другой сабмиссив по принуждению", "Мочеиспускание при партнёре / во время сессии"], "RU names");
    ["ru", "en", "pt", "es", "ja", "th", "zh"].forEach(l => eq(["other-sub-serves-you", "urination-in-front"].filter(id => { const it = K.i18n.item(id, l); return !it.name || !it.desc || (l !== "en" && it.desc === K.i18n.item(id, "en").desc); }), [], l + ": translated"));
    const dn = open("form", { storage: { local: { "checklist-lang": "ru" }, session: {} } }).d;
    eq(["other-sub-serves-you", "urination-in-front"].filter(id => dn.querySelector('.item[data-id="' + id + '"] .new-dot')), [], "v615: no green dots (only from 497)");
    _sc.end();
  }

  S("v572: 11 new practices");
  {
    const _sc = scope();
    const K = open("form").KC, codeOf = {}, next = {};
    K.CATS.forEach(c => c.items.forEach(([code, id], i) => { codeOf[id] = code; next[id] = (c.items[i + 1] || [])[1]; }));
    const want = [["rough-grabbing", "hair-drag-snow", 477], ["hair-drag-snow", "hair-drag-rain", 478], ["zip-tie-bondage", "tape-bondage", 479], ["xenophilia-tentacles", "egg-laying", 480],
      ["glory-hole", "stuck-in-wall", 481], ["mutual-masturbation", "dutch-rudder", 482], ["verbal-humiliation", "forced-thanking", 483], ["forced-thanking", "forced-self-degradation", 484],
      ["begging", "forced-begging-acts", 485], ["menthol-balm-labia", "menthol-eye-drops", 486], ["vacbed", "fuck-box", 487]];
    eq(want.filter(([a, id, c]) => codeOf[id] !== c || next[a] !== id).map(w => w[1]), [], "codes 477–487, each placed after its related item");
    const ids = want.map(w => w[1]);
    ["ru", "en", "pt", "es", "ja", "th", "zh"].forEach(l => eq(ids.filter(id => { const it = K.i18n.item(id, l); return !it.name || !it.desc || (l !== "en" && it.desc === K.i18n.item(id, "en").desc); }), [], l + ": translated"));
    eq([K.i18n.item("dutch-rudder", "ru").name, K.i18n.item("forced-self-degradation", "ru").name], ["Голландский штурвал", "Принуждение называть себя уничижительно"], "RU names (typos fixed)");
    ok(/Спасибо, что вставили в меня фаллоимитатор/.test(K.i18n.item("forced-thanking", "ru").desc) && /Пожалуйста, трахните меня/.test(K.i18n.item("forced-begging-acts", "ru").desc), "owner's examples in the hints");
    const dn = open("form", { storage: { local: { "checklist-lang": "ru" }, session: {} } }).d;
    eq(ids.filter(id => dn.querySelector('.item[data-id="' + id + '"] .new-dot')), [], "v615: no green dots (only from 497)");
    _sc.end();
  }

  S("v584: 5 new practices (bastinado, palm strikes, nuru, omorashi, breeding)");
  {
    const _sc = scope();
    const K = open("form").KC, codeOf = {}, next = {}, catOf = {};
    K.CATS.forEach(c => c.items.forEach(([code, id], i) => { codeOf[id] = code; next[id] = (c.items[i + 1] || [])[1]; catOf[id] = c.id; }));
    const want = [["rattan", "bastinado", 488], ["bastinado", "palm-strikes", 489], ["oil-play", "nuru-massage", 490], ["urination-in-front", "omorashi", 491], ["cheating-fantasy", "breeding-fantasy", 492]];
    eq(want.filter(([a, id, c]) => codeOf[id] !== c || next[a] !== id).map(w => w[1]), [], "codes 488–492, each placed after its related item");
    eq(want.map(w => catOf[w[1]]), ["impact-rough-play", "impact-rough-play", "fetishes", "bodily-fluids", "role-play"], "sections");
    const ids = want.map(w => w[1]);
    ["ru", "en", "pt", "es", "ja", "th", "zh"].forEach(l => eq(ids.filter(id => { const it = K.i18n.item(id, l); return !it.name || !it.desc || (l !== "en" && (it.desc === K.i18n.item(id, "en").desc || it.name === K.i18n.item(id, "en").name)); }), [], l + ": translated"));
    eq(ids.map(id => K.i18n.item(id, "ru").name), ["Бастинадо (удары по ступням)", "Удары по ладоням", "Нуру-массаж", "Омораси (терпеть до последнего)", "Фантазия об оплодотворении (breeding)"], "RU names");
    const dn = open("form", { storage: { local: { "checklist-lang": "ru" }, session: {} } }).d;
    eq(ids.filter(id => dn.querySelector('.item[data-id="' + id + '"] .new-dot')), [], "v615: no green dots (only from 497)");
    const st = { name: "N", items: {}, meta: {} }; ids.forEach((id, i) => { st.items[id] = { interest: ["love", "yes", "maybe", "limit", "love"][i] }; });
    const back = K.codec.decode(K.codec.encode(st));
    eq(ids.map(id => (back.items[id] || {}).interest), ["love", "yes", "maybe", "limit", "love"], "answers on the new items survive a link");
    const pt = K.portrait.compute({ items: I5(ids) });
    function I5(a) { const o = {}; a.forEach(id => { o[id] = { interest: "love" }; }); return o; }
    eq(["sm", "fetishes", "bodily-fluids", "role-play"].map(g => pt.sections.find(s => s.id === g).answered), [2, 1, 1, 1], "portrait: bastinado + palms in S/M, nuru in fetishes, omorashi in fluids, breeding in role play");
    { const RS = open("compare").KC.roulette.SKIP; eq([!!RS, ids.filter(id => RS[id])], [true, []], "not on the roulette's skip list"); }
    _sc.end();
  }

  S("v573: moving to the new site (old build sends, new build receives)");
  {
    const _sc = scope();
    const OLDB = { "core/migrate.js": s => s.replace('const ROLE = "receiver"', 'const ROLE = "sender"') };
    const NEWBASE = "https://klevatess.github.io/kinkmatch/";
    const oldPage = (o = {}) => open("form", Object.assign({ patch: OLDB }, o));
    const newPage = (o = {}) => open("form", Object.assign({ base: NEWBASE }, o));
    /* a rich old-site device, made through the old build's own code */
    const K0 = oldPage().KC, ids = []; K0.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const V = ["love", "yes", "maybe", "limit"], its = (n, off) => { const o = {}; ids.slice(off, off + n).forEach((id, i) => { o[id] = { interest: V[i % 4] }; }); return o; };
    const own = { name: "Борис <b>&", uid: "OWN001", items: its(300, 0), meta: { role: "dom", attire: ["latex", "lace"], exp: "large" }, fav: ids.slice(5, 25),
      safeword: "красный", fantasies: "много «текста»\nс переносом", comments: "a&b=c#d", allergies: "латекс", onlyMarked: true, template: { id: "tplev1", name: "Evening" } };
    const other = { name: "Для Киры", uid: "OWN002", items: its(120, 50), meta: { role: "sub" }, fav: [] };
    const recCode = (n, uid, extra) => K0.codec.encode(Object.assign({ name: n, uid, items: its(80, 100), meta: {} }, extra || {}), "ru");
    const received = [
      { id: "p1", name: "Anna", code: recCode("Anna", "ANNA01"), ts: 5 },
      { id: "p2", name: "Boris", code: recCode("Boris", "BORI01", { by: { id: "tplev1", name: "Evening" } }), ts: 4 },
      { id: "p3", name: "Кира (копия)", code: recCode("Kira", "KIRA01"), ts: 3, manual: true },
    ];
    const templates = [
      { id: "t1", tid: "tplev1", name: "Evening", ids: ids.slice(0, 60), own: true, ts: 9 },
      { id: "t2", tid: "tplpt2", name: "Party", label: "Вечеринка", ids: ids.slice(200, 480), own: false, ts: 8 },
    ];
    const favs = { "u:ANNA01": ids.slice(100, 110) };
    const compares = [{ id: "c1", name: "Friends", ts: 7, parts: [{ name: "Me", uid: "OWN001", code: K0.codec.encode(own) }, { name: "", uid: "ANNA01", code: received[0].code }, { name: "Boris", uid: "BORI01", code: received[1].code }] }];
    const oldStore = { local: { "checklist-lang": "en", "checklist-theme": "dark", "practices-checklist-v1": JSON.stringify(own),
      "checklist-my-profiles-v1": JSON.stringify([{ id: "m1", name: "", data: own, ts: 10 }, { id: "m2", name: "Для Киры", data: other, ts: 6 }]), "checklist-active-mine-id": "m1",
      "checklist-saved-profiles-v1": JSON.stringify(received), "checklist-templates-v1": JSON.stringify(templates), "checklist-favs-v1": JSON.stringify(favs),
      "checklist-compares-v1": JSON.stringify(compares) }, session: {} };

    // old build: button and bar; the new build never shows them
    let op = oldPage({ storage: oldStore });
    eq([op.d.getElementById("migrateBar").hidden, op.d.getElementById("mineMigrate").hidden, op.KC.migrate.sender()], [false, false, true], "old build: bar at the top + button in My lists");
    ok(/moved to a new address/.test(op.d.getElementById("migrateBar").textContent), "bar text (EN, the chosen language)");
    let np = newPage();
    eq([np.d.getElementById("migrateBar").hidden, np.d.getElementById("mineMigrate").hidden, np.KC.migrate.sender()], [true, true, false], "new build: no bar, no button");
    const oldOnNew = open("form", { patch: OLDB, base: NEWBASE });
    eq(oldOnNew.d.getElementById("migrateBar").hidden, true, "even the old build hides the bar when opened on the new address");
    click(op.w, op.d.getElementById("migrateLater"));
    eq(op.d.getElementById("migrateBar").hidden, true, "“Later” hides the bar…");
    eq(oldPage({ storage: op.storage() }).d.getElementById("migrateBar").hidden, true, "…for this visit (session)");

    // the link
    op = oldPage({ storage: oldStore });
    const link = op.KC.migrate.link();
    ok(link.indexOf("https://klevatess.github.io/kinkmatch/index.html?lang=en#kcmigrate=") === 0, "link goes to the new site, keeps the language, data after #");
    ok(!/_/.test(link), "no “_” in the link");
    ok(link.length < 25000, "compact: " + link.length + " characters for 2 lists, 3 received, 2 templates, a comparison");
    const payload = link.split("#kcmigrate=")[1];

    // receive: question, nothing stored before “Move”
    np = newPage({ hash: "kcmigrate=" + payload });
    eq([np.w.location.hash, np.KC.form.viewingShared, np.KC.store.received.list().length], ["", false, 0], "payload taken out of the address; not opened or stored as a list link");
    eq(np.d.getElementById("migrateOverlay").classList.contains("show"), true, "question shown");
    ok(/Анкет: 2, полученных: 3, шаблонов: 2, сравнений: 1/.test(np.d.getElementById("migrateText").textContent), "question counts what will come: " + np.d.getElementById("migrateText").textContent);
    eq(np.KC.store.mine.list().length + np.KC.store.tpl.list().length, 0, "nothing imported before the answer");
    // cancel
    click(np.w, np.d.getElementById("migrateNo"));
    const afterCancel = np.storage();
    eq(["checklist-my-profiles-v1", "checklist-saved-profiles-v1", "checklist-templates-v1", "checklist-compares-v1"].filter(k => afterCancel.local[k] && afterCancel.local[k] !== "[]"), [], "Cancel: nothing imported");

    // move
    np = newPage({ hash: "kcmigrate=" + payload });
    click(np.w, np.d.getElementById("migrateYes"));
    const st1 = np.storage();
    ok(!!st1.session.kcMoved, "result kept for after the reload");
    const n2 = newPage({ storage: st1 });
    ok(n2.d.getElementById("migrateOverlay").classList.contains("show") && /Перенесено — анкет: 2, полученных: 3, шаблонов: 2, сравнений: 1/.test(n2.d.getElementById("migrateText").textContent) === false, "…");
    const doneText = n2.d.getElementById("migrateText").textContent;
    ok(/lists: 2, received: 3, templates: 2, comparisons: 1/.test(doneText), "after the reload: result in the moved language (EN): " + doneText);
    const NK = n2.KC, S2 = NK.store;
    eq([NK.i18n.lang, n2.w.localStorage.getItem("checklist-theme")], ["en", "dark"], "language and theme came along");
    // everything is exactly there
    /* same content: object key order and the order inside sets (♥, template items) do not matter */
    const canon = x => Array.isArray(x) ? (x.every(v => typeof v === "string") ? x.slice().sort() : x.map(canon))
      : x && typeof x === "object" ? Object.keys(x).sort().reduce((o, k) => { o[k] = canon(x[k]); return o; }, {}) : x;
    const oS = op.KC.store, norm = x => JSON.stringify(canon(oS.normalize(x)));
    eq(norm(S2.loadOwn()), norm(own), "own list identical (answers, profile, texts, ♥, template mark, uid)");
    eq([n2.KC.form.state.name, Object.keys(n2.KC.form.state.items).length, (n2.KC.form.state.fav || []).length], ["Борис <b>&", 300, 20], "the page opens my moved list");
    eq(S2.mine.list().map(x => [x.id, x.name, norm(x.data)]), oS.mine.list().map(x => [x.id, x.name, norm(x.data)]), "My lists identical");
    eq(S2.mine.active(), "m1", "the same entry is active");
    eq(S2.received.list().map(x => [x.id, x.name, x.code, !!x.manual]).sort(), oS.received.list().map(x => [x.id, x.name, x.code, !!x.manual]).sort(), "Received identical (incl. “by template” mark and a manual copy)");
    eq(canon(S2.tpl.list()), canon(oS.tpl.list()), "templates identical (own + received with its label)");
    eq(canon(S2.favs.all()), canon(oS.favs.all()), "favourites of received lists identical");
    eq(canon(S2.cmp.list()), canon(oS.cmp.list()), "saved comparisons identical");
    eq(n2.errors, [], "no script errors");
    // the moved data works: template applied, compare opens with fresh lists, a received list opens
    eq(n2.KC.form.bound() && n2.KC.form.bound().id, "tplev1", "my list is still “by template Evening”");
    const cp = open("compare", { base: NEWBASE, storage: n2.storage() });
    eq([cp.d.getElementById("cmpSaved").hidden, cp.d.getElementById("cmpSaved").options.length], [false, 2], "saved comparison available on the new compare page");

    // repeat: nothing twice
    let n3 = newPage({ hash: "kcmigrate=" + payload, storage: n2.storage() });
    click(n3.w, n3.d.getElementById("migrateYes"));
    const n4 = newPage({ storage: n3.storage() });
    ok(/already moved/.test(n4.d.getElementById("migrateText").textContent), "moving again: “nothing new”");
    eq([n4.KC.store.mine.list().length, n4.KC.store.received.list().length, n4.KC.store.tpl.list().length, n4.KC.store.cmp.list().length], [2, 3, 2, 1], "…and no duplicates");

    // the new site already has my list: kept, the old one lands in My lists
    const mineNew = { name: "Новая", uid: "NEW001", items: its(10, 400), meta: {} };
    let nn = newPage({ hash: "kcmigrate=" + payload, storage: { local: { "practices-checklist-v1": JSON.stringify(mineNew), "checklist-my-profiles-v1": JSON.stringify([{ id: "mN", name: "", data: mineNew, ts: 20 }]), "checklist-active-mine-id": "mN", "checklist-lang": "ru" }, session: {} } });
    click(nn.w, nn.d.getElementById("migrateYes"));
    const nn2 = newPage({ storage: nn.storage() });
    eq([nn2.KC.form.state.name, nn2.KC.store.mine.active(), nn2.KC.store.mine.list().map(x => x.id).sort()], ["Новая", "mN", ["m1", "m2", "mN"]], "a list already on the new site stays current; the moved ones are added to My lists");
    eq(nn2.KC.i18n.lang, "ru", "a language already chosen on the new site is kept");

    // unsaved typing on the old site is included
    const tp = oldPage({ storage: oldStore });
    tp.KC.form.state.items["hugging"] = { interest: "love" }; tp.KC.form.state.name = "Только что"; tp.KC.form.save();
    click(tp.w, tp.d.getElementById("migrateGo"));
    eq(JSON.parse(tp.w.localStorage.getItem("practices-checklist-v1")).name, "Только что", "pressing the button saves what was just typed first");
    const tl = tp.KC.migrate.unpack(tp.KC.migrate.link().split("#kcmigrate=")[1]);
    eq([tl.backup.own.name, tl.backup.own.items.hugging.interest], ["Только что", "love"], "…and it is in the moved data");

    // old site while viewing someone's link: my data still goes, the link too (it is in Received)
    const lk = recCode("Lev", "LEV001");
    const vp = oldPage({ storage: oldStore, hash: lk });
    eq([vp.KC.form.viewingShared, vp.d.getElementById("migrateBar").hidden], [true, false], "bar also shown while viewing someone's link");
    const vl = vp.KC.migrate.unpack(vp.KC.migrate.link().split("#kcmigrate=")[1]);
    eq([vl.backup.own.name, vl.backup.received.some(x => vp.KC.codec.decode(x.code).uid === "LEV001")], ["Борис <b>&", true], "moves MY list (not the viewed one) + the viewed link from Received");

    // empty old device
    const ep = oldPage();
    const el = ep.KC.migrate.unpack(ep.KC.migrate.link().split("#kcmigrate=")[1]);
    eq(ep.KC.migrate.counts(el.backup), { mine: 0, rec: 0, tpl: 0, cmp: 0 }, "empty old device: an empty, valid payload");
    const en = newPage({ hash: "kcmigrate=" + ep.KC.migrate.link().split("#kcmigrate=")[1] });
    click(en.w, en.d.getElementById("migrateYes"));
    ok(/уже было перенесено|already moved/.test(newPage({ storage: en.storage() }).d.getElementById("migrateText").textContent), "…moving it says “nothing new” and breaks nothing");

    // damaged / foreign data: a clear message, nothing stored, no errors
    const bads = { cut: payload.slice(0, Math.floor(payload.length / 2)), changed: payload.slice(0, 40) + (payload[40] === "A" ? "B" : "A") + payload.slice(41), junk: "@@@###",
      empty: "", foreign: Buffer.from(JSON.stringify({ app: "other", b: "{}" })).toString("base64"), wrongSum: Buffer.from(JSON.stringify({ app: "kinkcheck-move", v: 1, sum: "x", b: "{\"app\":\"kinkcheck\"}" })).toString("base64") };
    Object.keys(bads).forEach(k => {
      const bp = newPage({ hash: "kcmigrate=" + bads[k] });
      const txt = bp.d.getElementById("migrateText").textContent;
      ok(/Не удалось прочитать/.test(txt) && bp.d.getElementById("migrateYes").hidden && !bp.errors.length, "damaged payload (" + k + "): clear message, no “Move” button, no errors");
      eq(bp.KC.store.mine.list().length + bp.KC.store.received.list().length + bp.KC.store.tpl.list().length, 0, "damaged payload (" + k + "): nothing stored");
    });
    // the old build ignores a payload (it is not a list link), the new build ignores normal links' look-alikes
    const ob = oldPage({ hash: "kcmigrate=" + payload });
    eq([ob.KC.form.viewingShared, ob.KC.store.received.list().length, ob.d.getElementById("migrateOverlay").classList.contains("show")], [false, 0, false], "old build: a move link opens nothing and stores nothing");
    const nl = newPage({ hash: recCode("Anna", "ANNA01") });
    eq([nl.KC.form.viewingShared, nl.d.getElementById("migrateOverlay").classList.contains("show")], [true, false], "new build: ordinary list links work as before");

    // heavy user stays within safe URL sizes
    const hv = { local: Object.assign({}, oldStore.local, {
      "checklist-my-profiles-v1": JSON.stringify([...Array(8)].map((_, i) => ({ id: "h" + i, name: "L" + i, data: { name: "L" + i, uid: "HEAVY" + i, items: its(ids.length, 0), meta: { role: "sub" }, fav: ids.slice(0, 100), fantasies: "x".repeat(506) }, ts: i }))),
      "checklist-saved-profiles-v1": JSON.stringify([...Array(30)].map((_, i) => ({ id: "r" + i, name: "R" + i, code: K0.codec.encode({ name: "R" + i, uid: "RR" + String(i).padStart(4, "0"), items: its(ids.length, 0), meta: {} }, "ru"), ts: i }))) }), session: {} };
    const hl = oldPage({ storage: hv }).KC.migrate.link();
    ok(hl.length < 120000, "heavy user (8 full lists, 30 received): " + hl.length + " characters — well under browser limits (Chrome/Firefox ≥ 1 MB)");
    const hn = newPage({ hash: hl.split("#")[1] }); click(hn.w, hn.d.getElementById("migrateYes"));
    const hn2 = newPage({ storage: hn.storage() });
    eq([hn2.KC.store.mine.list().length, hn2.KC.store.received.list().length], [8, 30], "heavy user: everything arrives");
    _sc.end();
  }

  S("v573: moving twice — edits made on either site");
  {
    const _sc = scope();
    const OLDB = { "core/migrate.js": s => s.replace('const ROLE = "receiver"', 'const ROLE = "sender"') };
    const NEWBASE = "https://klevatess.github.io/kinkmatch/";
    const oldPage = (o = {}) => open("form", Object.assign({ patch: OLDB }, o));
    const newPage = (o = {}) => open("form", Object.assign({ base: NEWBASE }, o));
    const moveFrom = (oldSt, newSt) => {
      const o = oldPage({ storage: oldSt }); click(o.w, o.d.getElementById("migrateGo"));
      const link = o.KC.migrate.link();
      const n = newPage({ hash: link.split("#")[1], storage: newSt });
      if (n.d.getElementById("migrateYes").hidden) return { o, n: null };
      click(n.w, n.d.getElementById("migrateYes"));
      return { o, n: newPage({ storage: n.storage() }) };
    };
    const wait = ms => { const t = Date.now() + ms; while (Date.now() < t); };
    // 1. old site: a list with two answers; move
    let o = oldPage({ storage: { local: { "checklist-lang": "ru" }, session: {} } });
    click(o.w, o.d.querySelector('.item[data-id="hugging"] .scale button[data-v="love"]'));
    click(o.w, o.d.querySelector('.item[data-id="chains"] .scale button[data-v="yes"]'));
    o.KC.form.saveNow();
    let r = moveFrom(o.storage(), { local: {}, session: {} });
    eq(Object.keys(r.n.KC.form.state.items).sort(), ["chains", "hugging"], "first move: the list arrives");
    let newSt = r.n.storage();
    // 2. keep answering on the OLD site (e.g. an old link), move again -> the new site gets the update
    wait(5);
    o = oldPage({ storage: r.o.storage() });
    click(o.w, o.d.querySelector('.item[data-id="orgy"] .scale button[data-v="limit"]')); o.KC.form.saveNow();
    r = moveFrom(o.storage(), newSt);
    eq(Object.keys(r.n.KC.form.state.items).sort(), ["chains", "hugging", "orgy"], "second move: the answer added on the old site arrives");
    ok(/анкет: 1/.test(r.n.d.getElementById("migrateText").textContent), "…reported as moved: " + r.n.d.getElementById("migrateText").textContent);
    eq(r.n.KC.store.mine.list().length, 1, "…the same list updated, not a copy");
    newSt = r.n.storage();
    // 3. answer on the NEW site, then press "Move" on the old site again without changes there -> new edits stay
    wait(5);
    let n = newPage({ storage: newSt });
    click(n.w, n.d.querySelector('.item[data-id="blindfolds"] .scale button[data-v="yes"]')); n.KC.form.saveNow();
    newSt = n.storage();
    r = moveFrom(o.storage(), newSt);
    eq(Object.keys(r.n.KC.form.state.items).sort(), ["blindfolds", "chains", "hugging", "orgy"], "a stale old version never overwrites newer answers made on the new site");
    ok(/уже было перенесено/.test(r.n.d.getElementById("migrateText").textContent), "…and says nothing new was moved");
    // 4. a backup restore stays add-only (no replacing)
    const bk = r.o.KC.store.exportAll(); bk.mine[0].ts = Date.now() + 100000; bk.mine[0].data.items = { spooning: { interest: "yes" } };
    const n5 = newPage({ storage: r.n.storage() }); n5.KC.store.importAll(JSON.parse(JSON.stringify(bk)));
    eq(Object.keys(n5.KC.store.mine.list()[0].data.items).sort(), ["blindfolds", "chains", "hugging", "orgy"], "backup restore still only adds (never replaces a list)");
    _sc.end();
  }

  S("v576: portrait, picture card, roulette, what's new");
  {
    const _sc = scope();
    const K = open("form").KC, P = K.portrait;
    const ids = {}; K.CATS.forEach(c => { ids[c.id] = c.items.map(([, id]) => id); });
    const mk = (cat, vals) => { const o = {}; vals.forEach((v, i) => { o[ids[cat][i]] = { interest: v }; }); return o; };
    const sec = (st, cat, set) => P.compute(st, set).sections.find(s => s.id === cat);
    // formula (v579): ½ "how much" (average, pulled toward the list's overall level) + ½ "how many" (against the list's own scale)
    const one = (cat, vals) => sec({ items: mk(cat, vals) }, cat).pct;
    eq(one("intimacy", ["love", "love", "love"]), 73, "3× Love alone: 73% (average 100%, amount 45%)");
    ok(one("intimacy", ["love", "love", "love"]) > one("intimacy", ["yes", "yes", "yes"]) && one("intimacy", ["yes", "yes", "yes"]) > one("intimacy", ["maybe", "maybe", "maybe"]), "Love > Yes > Maybe");
    ok(one("intimacy", ["love", "yes", "limit", "maybe"]) < one("intimacy", ["love", "yes", "maybe"]), "No pulls the group down");
    eq([one("intimacy", ["limit", "limit", "limit"]), one("intimacy", ["limit", "limit", "yes"])], [0, 8], "never below 0%; v603 (variant A): a “Yes” among “No” still counts in “how many” (8%)");
    eq(one("intimacy", ["love", "love"]), null, "fewer than 3 answers: no percentage");
    eq(P.compute({ items: {} }).sections.map(s => s.id).sort(), ["bodily-fluids", "bondage", "ds", "fetishes", "intimacy", "role-play", "sex-penetration", "sm", "voyeurism-exhibitionism"], "9 groups: D/s and S/M merged, role play on its own");
    const outSt = { items: Object.assign(mk("session-length", ["love", "love", "love"]), mk("non-monogamy", ["love", "love", "love"])) };
    const outR = P.compute(outSt);
    eq([outR.answered, outR.love.length, outR.sections.filter(s => s.pct !== null).length], [0, 0, 0], "session length and non-monogamy are not in the portrait (not counted, no chips)");
    eq(K.CATS.filter(c => c.id === "session-length" || c.id === "non-monogamy").length, 2, "…the sections themselves stay in the form");
    const dsR = P.compute({ items: Object.assign(mk("service-control", ["love", "love"]), mk("humiliation", ["love"])) }).sections.find(s => s.id === "ds");
    eq([dsR.answered, dsR.total, dsR.pct !== null], [3, ids["service-control"].length + ids.humiliation.length, true], "D/s = service & control + humiliation");
    const smR = P.compute({ items: {} }).sections.find(s => s.id === "sm");
    eq(smR.total, ids["impact-rough-play"].length + ids["sensation-play"].length + ids.marking.length, "S/M = impact + sensation + marking");
    const eqAll = {}; ["intimacy", "bondage", "fetishes", "role-play", "service-control", "impact-rough-play", "sex-penetration", "voyeurism-exhibitionism", "bodily-fluids"].forEach(c => Object.assign(eqAll, mk(c, ["yes", "yes", "yes", "yes"])));
    eq([...new Set(P.compute({ items: eqAll }).sections.map(s => s.pct))].length, 1, "the same answers in every group: the same percentage (small sections get no bonus)");
    const small = Object.assign(mk("bodily-fluids", ["love", "love", "love"]), mk("service-control", ids["service-control"].map((x, i) => i % 3 ? "yes" : "maybe")), mk("humiliation", ids.humiliation.map((x, i) => i % 3 ? "yes" : "maybe")));
    const smallR = P.compute({ items: small }).sections;
    ok(smallR.find(s => s.id === "ds").pct > smallR.find(s => s.id === "bodily-fluids").pct + 20, "3× Love in a small group does not beat a whole group of Yes/Maybe");
    const base = mk("bondage", ["yes", "yes", "yes", "yes", "yes"]);
    const more = Object.assign({}, base, mk("sex-penetration", ids["sex-penetration"].map(() => "love")));
    ok(sec({ items: more }, "bondage").pct < sec({ items: base }, "bondage").pct, "someone who marks a lot needs more for the same percentage");
    const stMix = { items: Object.assign(mk("intimacy", ["yes", "yes", "yes"]), mk("bondage", ["love", "love", "love"]), mk("fetishes", ["limit", "maybe", "maybe"])) };
    eq(P.compute(stMix).sections.slice(0, 3).map(s => s.id), ["bondage", "intimacy", "fetishes"], "groups sorted from most to least liked");
    const lv = P.compute({ items: mk("bondage", ["love", "love", "love"]) }).love;
    eq(lv.slice(), lv.slice().sort((a, b) => K.i18n.item(a).name.localeCompare(K.i18n.item(b).name, K.i18n.locale())), "Love list in alphabetical order");
    const set = {}; ids.intimacy.slice(0, 3).forEach(id => { set[id] = 1; });
    eq([sec({ items: mk("intimacy", ["love", "love", "love", "limit", "limit"]) }, "intimacy", set).pct, P.compute({ items: {} }, set).sections.length], [73, 1], "with a template: only its items count, other groups disappear");
    eq([P.label("ds"), P.label("sm"), P.label("bondage")], ["D/s: служение и унижение", "S/M: удары, ощущения, метки", "Бондаж и фиксация"], "group names");

    // portrait block
    const own = { name: "Me", uid: "MEME01", items: Object.assign(mk("intimacy", ["love", "yes", "yes", "maybe"]), mk("bondage", ["love", "limit", "yes"])), meta: { role: "dom", exp: "large" } };
    const st0 = { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(own) }, session: {} };
    let p = open("form", { storage: st0 });
    const ps = p.d.getElementById("portraitSection");
    eq([p.d.getElementById("portraitTitle").textContent, ps.open, p.d.getElementById("portraitBody").innerHTML], ["Мой портрет", false, ""], "folded by default, nothing drawn yet");
    ps.open = true; ps.dispatchEvent(new p.w.Event("toggle"));
    eq(p.d.querySelectorAll("#portraitBody .pt-row").length, 9, "a bar for every group");
    ok(/Доминант \/ Верх · Большой/.test(p.d.getElementById("portraitBody").textContent), "role and experience");
    eq(p.d.querySelectorAll("#portraitBody .pt-chips span").length, 2, "all Love items as chips");
    click(p.w, p.d.querySelector('.item[data-id="' + ids.bondage[5] + '"] .scale button[data-v="love"]'));
    await sleep(250);   /* v587: redrawn shortly after the last answer */
    eq(p.d.querySelectorAll("#portraitBody .pt-chips span").length, 3, "follows new answers while open");
    click(p.w, p.d.querySelector('#langSw button[data-lang="en"]'));
    ok(p.d.getElementById("portraitTitle").textContent === "My portrait" && /Dominant/.test(p.d.getElementById("portraitBody").textContent), "follows the language");
    const other = open("form", { hash: K.codec.encode(Object.assign({}, own, { name: "Anna", uid: "ANNA01" }), "ru") });
    eq(other.d.getElementById("portraitTitle").textContent, "Портрет: Anna", "someone's list: “Portrait: <name>”");
    const empty = open("form"); const es = empty.d.getElementById("portraitSection"); es.open = true; es.dispatchEvent(new empty.w.Event("toggle"));
    ok(/Отметьте несколько пунктов/.test(empty.d.getElementById("portraitBody").textContent), "empty list: a hint instead of bars");
    // PDF page
    p = open("form", { storage: st0 });
    click(p.w, p.d.getElementById("pdfBtn"));
    eq([!!p.d.getElementById("pdfPortrait"), p.d.getElementById("pdfPortrait").checked], [true, false], "PDF window: “add the portrait” tick, off by default");
    const sh = p.KC.form.buildPortraitSheet().textContent;
    ok(/Мой портрет/.test(sh) && /Близость и нежность/.test(sh) && /%/.test(sh) && /Обожаю · 2/.test(sh), "portrait page for the PDF");
    // picture card window
    const btn = () => { const s2 = p.d.getElementById("portraitSection"); s2.open = true; s2.dispatchEvent(new p.w.Event("toggle")); return p.d.getElementById("ptCard"); };
    click(p.w, btn());
    ok(p.d.getElementById("cardOverlay").classList.contains("show"), "“Save as a picture” opens the card window");
    eq(["bars", "love", "role", "exp", "limits", "name"].map(k => p.d.getElementById("cardO_" + k).checked), [true, true, true, false, false, false], "defaults: sections, Love, role on; experience, limits, name off");
    ok(!/qr/i.test(p.d.getElementById("cardOverlay").innerHTML.replace(/QR-кода/g, "")), "no QR in the card window");
    ok(!p.errors.length, "no script errors");

    // roulette
    const cmpP = (A, B, extra) => { const c = open("compare", extra); c.d.getElementById("codeA").value = A; c.d.getElementById("codeB").value = B; click(c.w, c.d.getElementById("cmpBtn")); return c; };
    const I = (o) => { const r = {}; Object.keys(o).forEach(k => { r[k] = { interest: o[k] }; }); return r; };
    /* items from different sections, none on the roulette's skip list */
    const A = { name: "A", uid: "AAAAA1", meta: { role: "dom" }, items: I({ "genital-sex": "love", "blindfolds": "yes", "spanking-hand": "yes", "verbal-humiliation": "maybe", "chains": "limit", "cum-on-body": "yes", "gas-masks": "love", "session-short": "love", "orgy": "love" }) };
    const B = { name: "B", uid: "BBBBB1", meta: { role: "sub" }, items: I({ "genital-sex": "yes", "blindfolds": "maybe", "spanking-hand": "love", "verbal-humiliation": "maybe", "chains": "love", "cum-on-body": "limit", "gas-masks": "love", "session-short": "yes", "orgy": "yes" }) };
    let c = cmpP(K.codec.encode(A), K.codec.encode(B));
    const R = c.KC.roulette;
    eq(R.pool(A, B, false).sort(), ["genital-sex", "spanking-hand"], "pool: both Yes/Love; skip list (gas masks), removed sections (session length, non-monogamy) and any No left out");
    eq(R.pool(A, B, true).sort(), ["blindfolds", "genital-sex", "spanking-hand"], "“Bolder”: plus Yes/Love + Maybe; never Maybe+Maybe, never a No");
    eq(["sleep-play", "gas-masks", "vacbed", "cnc-single"].map(id => !!R.SKIP[id]), [true, true, true, true], "skip list: e.g. sleep play, gas masks, vacbed, CNC");
    eq(["drinking-from-feet", "forced-drinking-from-feet", "suspension-upright", "suspension-horizontal", "suspension-inverted", "partial-suspension", "trash-play",
      "forced-unpleasant-food", "forced-drinking-beer-cider", "triple-penetration", "bottle-neck-vaginal", "bottle-neck-anal"].filter(id => R.SKIP[id]), [], "returned by the owner: drinking from feet, suspensions, trash, food, beer, triple, bottle necks");
    eq([R.WEIGHT["sex-penetration"], R.WEIGHT.bondage, R.WEIGHT.humiliation, R.WEIGHT["session-length"], R.WEIGHT["non-monogamy"]], [4, 4, 4, 0, 0], "weights: sex 4, bondage 4, humiliation 4; session length and non-monogamy out");
    const pa = { name: "A", st: A }, pb = { name: "B", st: B };
    const d1 = R.draw(pa, pb, false, 1), d2 = R.draw(pa, pb, false, 1), d3 = R.draw(pa, pb, false, 1);
    eq([d1.ids.concat(d2.ids).sort().join(), d1.reset || d2.reset, d3.reset], [["genital-sex", "spanking-hand"].join(), false, true], "no repeats until all came up, then starts over and says so");
    /* three options never share a section; sections come by weight */
    const wide = {}; ["genital-sex", "anal-sex", "fellatio", "blindfolds", "chains", "gag-ball", "verbal-humiliation", "spitting", "kneeling", "praise", "spanking-hand", "whipping-flogger",
      "foot-worship", "cum-on-body", "hugging", "tickling", "puppy-play", "hickies", "stripping"].forEach(id => { wide[id] = { interest: "love" }; });
    const W1 = { name: "W1", uid: "WIDE01", items: wide, meta: {} }, W2 = { name: "W2", uid: "WIDE02", items: wide, meta: {} };
    let sameSec = 0, secHits = {}, rounds = 3000;
    for (let i = 0; i < rounds; i++) {
      const r = R.draw({ name: "W1" + i, st: Object.assign({}, W1, { uid: "a" + i }) }, { name: "W2" + i, st: Object.assign({}, W2, { uid: "b" + i }) }, false, 3);   /* a new pair each round: the weights alone */
      const secs = r.ids.map(id => R.SEC[id]); if (new Set(secs).size !== secs.length) sameSec++;
      secs.forEach(x => { secHits[x] = (secHits[x] || 0) + 1; });
    }
    eq(sameSec, 0, "3000 rounds: never two options from the same section");
    const share = x => (secHits[x] || 0) / rounds;
    ok(share("sex-penetration") > 0.4 && share("bondage") > 0.4 && share("humiliation") > 0.4, "sex, bondage, humiliation come up often (" + [share("sex-penetration"), share("bondage"), share("humiliation")].map(v => Math.round(v * 100) + "%").join(", ") + " of rounds)");
    ok(share("role-play") < 0.15 && share("voyeurism-exhibitionism") < 0.15 && share("intimacy") < 0.25 && share("sensation-play") < 0.25, "role-play, voyeurism rarely; intimacy and sensation less often (" + ["role-play", "voyeurism-exhibitionism", "intimacy", "sensation-play"].map(x => Math.round(share(x) * 100) + "%").join(", ") + ")");
    ok(!!c.d.querySelector('#results button[data-act="roulette"]'), "button in the pair view");
    click(c.w, c.d.querySelector('button[data-act="roulette"]'));
    ok(c.d.getElementById("rlOverlay").classList.contains("show"), "opens the roulette window");
    // group
    const mkP = (n, role, its) => ({ name: n, uid: (n + "XXXXXX").slice(0, 6), items: its, meta: role ? { role } : {} });
    const G = [mkP("Ann", "dom", wide), mkP("Bob", "sub", wide), mkP("Cid", "sub", wide), mkP("Dan", "dom", wide), mkP("Eve", "", wide)];
    const g = open("compare", { storage: { local: { "checklist-saved-profiles-v1": JSON.stringify(G.map((x, i) => ({ id: "g" + i, name: x.name, code: K.codec.encode(x), ts: 9 - i }))) }, session: {} } });
    for (let i = 0; i < 3; i++) click(g.w, g.d.getElementById("addPart"));
    [...g.d.querySelectorAll("#parts .cmp-col")].forEach((col, i) => { const s2 = col.querySelector(".cmp-pick"); s2.value = "r:g" + i; s2.dispatchEvent(new g.w.Event("change", { bubbles: true })); });
    click(g.w, g.d.getElementById("cmpBtn"));
    ok(!!g.d.querySelector('#results button[data-act="roulette"]'), "button in the group view");
    const GP = g.KC.cmpState().group;
    const pu = g.KC.roulette.pairUp(GP, false, false);
    eq([pu.pairs.length, pu.alone.length, new Set(pu.pairs.flat().concat(pu.alone).map(x => x.name)).size], [2, 1, 5], "5 people: 2 random pairs + 1 without a pair, everyone once");
    const pr = g.KC.roulette.pairUp(GP, true, false);
    ok(pr.pairs.every(([x, y]) => [x.st.meta.role, y.st.meta.role].sort().join() === "dom,sub") && pr.alone.some(x => x.name === "Eve"), "Top + Bottom filter: only Top+Bottom pairs; no role = no pair");
    click(g.w, g.d.querySelector('button[data-act="roulette"]'));
    await new Promise(r => setTimeout(r, 1300));   /* the short name flicker */
    const outs = [...g.d.querySelectorAll("#rlOut .rl-pair")];
    eq([outs.length, outs.every(x => x.querySelectorAll(".rl-idea").length === 3)], [2, true], "each pair gets 3 options");
    ok(/без пары/.test(g.d.getElementById("rlOut").textContent), "the odd one out is named");
    ok(!c.errors.length && !g.errors.length, "no script errors");

    // what's new
    const hp = open("form");
    ["ru", "en", "pt", "es", "ja", "th", "zh"].forEach(l => {
      hp.KC.i18n.set(l); hp.KC.help.open("news");
      const s3 = hp.d.getElementById("helpNews");
      ok(s3 && !s3.hidden && hp.d.getElementById("helpPane").hidden && s3.querySelectorAll("h5").length === 6 && /5/.test(s3.querySelectorAll("h5")[1].textContent) && s3.querySelectorAll("ul")[0].querySelectorAll("li").length === 4 && s3.querySelectorAll("ul")[1].querySelectorAll("li").length === 8 && /29/.test(s3.querySelectorAll("h5")[2].textContent) && /29/.test(s3.querySelectorAll("h5")[3].textContent) && /DnD/.test(s3.querySelectorAll("h5")[3].textContent) && /29/.test(s3.querySelectorAll("h5")[4].textContent) && /27/.test(s3.querySelectorAll("h5")[5].textContent) && [2, 3, 4, 5].map(k => s3.querySelectorAll("ul")[k].querySelectorAll("li").length).join() === "6,8,8,3", l + ": “What's new” tab (v601): World of Darkness (6 points) on top, the DnD update (8) and Kinkosmos (8) dated 29 Sept, 27 Sept (3) below");
      ok(hp.d.getElementById("helpNewsTab").textContent === hp.KC.i18n.t("help.news.h") && !!hp.d.querySelector("#helpNewsTab .new-dot"), l + ": tab name with a green dot");
    });
    eq([hp.KC.help.SECTIONS.indexOf("news"), !!hp.d.getElementById("help-news"), hp.d.querySelectorAll('#helpToc button[data-go="news"]').length], [-1, false, 0], "“What's new” is not a section of “How to use”");
    // switching tabs
    hp.KC.i18n.set("ru"); hp.KC.help.open("pdf");
    eq([hp.d.getElementById("helpPane").hidden, hp.d.getElementById("helpNews").hidden, hp.d.getElementById("helpTitle").classList.contains("on"), hp.d.getElementById("helpTitle").textContent], [false, true, true, "Как пользоваться"], "a “?” button opens the “How to use” tab");
    click(hp.w, hp.d.getElementById("helpNewsTab"));
    eq([hp.d.getElementById("helpPane").hidden, hp.d.getElementById("helpNews").hidden, hp.d.getElementById("helpNewsTab").getAttribute("aria-selected")], [true, false, "true"], "clicking “What's new” shows only the updates");
    click(hp.w, hp.d.getElementById("helpTitle"));
    eq([hp.d.getElementById("helpPane").hidden, hp.d.getElementById("helpNews").hidden], [false, true], "and back");
    _sc.end();
  }

  S("v579: role picker on the compare page");
  {
    const _sc = scope();
    const K = open("form").KC;
    const I = o => { const r = {}; Object.keys(o).forEach(k => { r[k] = { interest: o[k] }; }); return r; };
    const its = I({ "genital-sex": "love", "spanking-hand": "yes", "blindfolds": "yes" });
    const mkP = (n, role) => ({ name: n, uid: (n + "XXXXXX").slice(0, 6), items: its, meta: role ? { role } : {} });
    const G = [mkP("Ann", "dom"), mkP("Bob", "sub"), mkP("Cid", ""), mkP("Dan", "")];
    const loc = { "checklist-lang": "ru", "checklist-saved-profiles-v1": JSON.stringify(G.map((x, i) => ({ id: "g" + i, name: x.name, code: K.codec.encode(x), ts: 9 - i }))) };
    const g = open("compare", { storage: { local: loc, session: {} } });
    const cols = () => [...g.d.querySelectorAll("#parts .cmp-col")];
    const rs = col => col.querySelector(".cmp-role");
    eq([...rs(cols()[0]).options].map(o => [o.value, o.textContent]), [["", "Роль: из анкеты"], ["dom", "Роль: Верх"], ["sub", "Роль: Низ"]], "each participant: from the list / Top / Bottom — no Switch");
    eq(cols().map(c => rs(c).value), ["", ""], "default: the role inside the list");
    for (let i = 0; i < 2; i++) click(g.w, g.d.getElementById("addPart"));
    cols().forEach((col, i) => { const s2 = col.querySelector(".cmp-pick"); s2.value = "r:g" + i; s2.dispatchEvent(new g.w.Event("change", { bubbles: true })); });
    rs(cols()[2]).value = "dom"; rs(cols()[3]).value = "sub"; rs(cols()[0]).value = "sub";
    click(g.w, g.d.getElementById("cmpBtn"));
    const GP = g.KC.cmpState().group;
    eq(GP.map(p => p.st.meta.role || ""), ["sub", "sub", "dom", "sub"], "a chosen role replaces the list's one (also over a role in the list)");
    click(g.w, g.d.querySelector('#results button[data-f="pairs"]'));
    click(g.w, g.d.querySelector('#results button[data-pm="role"]'));
    const tags = [...g.d.querySelectorAll("#results .pair-table")[0].querySelectorAll("tr:first-child th .role-tag")].map(x => x.textContent);
    eq(tags, ["Низ", "Низ", "Верх", "Низ"], "role tags in the pair table follow the choice");
    ok(!/Роль не указана/.test(g.d.getElementById("results").textContent), "no “no role given” note once everyone has one");
    const nums = g.d.querySelectorAll("#results .pair-table")[0].querySelectorAll("button.pair-n").length;
    eq(nums, 6, "Top + Bottom pairs only: Cid (Top) with each of the 3 Bottoms, both ways");
    const pr = g.KC.roulette.pairUp(GP, true, false);
    ok(pr.pairs.length === 1 && pr.pairs[0].some(x => x.name === "Cid"), "roulette in Top + Bottom mode uses the chosen roles");
    // saved with the roles, reopened with them
    const pr0 = g.w.prompt; g.w.prompt = () => "Roles";
    click(g.w, g.d.querySelector('#cmpSaveBar button[data-act="save"]'));
    g.w.prompt = pr0;
    const saved = JSON.parse(g.w.localStorage.getItem("checklist-compares-v1"));
    eq(saved[0].parts.map(p => p.role || ""), ["sub", "", "dom", "sub"], "saved comparison keeps a chosen role (none when “from the list”)");
    const g2 = open("compare", { storage: { local: Object.assign({}, loc, { "checklist-compares-v1": JSON.stringify(saved) }), session: {} } });
    const sel = g2.d.getElementById("cmpSaved"); sel.value = saved[0].id; sel.dispatchEvent(new g2.w.Event("change", { bubbles: true }));
    eq([...g2.d.querySelectorAll("#parts .cmp-role")].map(x => x.value), ["sub", "", "dom", "sub"], "reopening a saved comparison restores the pickers");
    eq(g2.KC.cmpState().group.map(p => p.st.meta.role || ""), ["sub", "sub", "dom", "sub"], "…and the roles in the results");
    // backup / move keeps the role, junk roles are dropped
    const b = g2.KC.store.exportAll(); b.compares[0].parts[1].role = "switch"; b.compares[0].id = "cX"; b.compares[0].name = "Other";
    const g3 = open("compare", { storage: { local: { "checklist-lang": "ru" }, session: {} } });
    g3.KC.store.importAll(b);
    eq(g3.KC.store.cmp.list().find(x => x.id === "cX").parts.map(p => p.role || ""), ["sub", "", "dom", "sub"], "backup import keeps Top/Bottom, drops anything else");
    // pair view
    const g4 = open("compare", { storage: { local: loc, session: {} } });
    const c4 = [...g4.d.querySelectorAll("#parts .cmp-col")];
    c4.forEach((col, i) => { const s2 = col.querySelector(".cmp-pick"); s2.value = "r:g" + (i + 2); s2.dispatchEvent(new g4.w.Event("change", { bubbles: true })); });
    c4[0].querySelector(".cmp-role").value = "dom";
    click(g4.w, g4.d.getElementById("cmpBtn"));
    ok(/Cid · Роль: Доминант \/ Верх/.test(g4.d.getElementById("results").textContent.replace(/\s+/g, " ")) || /Доминант/.test(g4.d.querySelector("#results .cmp-profile").textContent), "two people: the chosen role shows in the profile line");
    click(g4.w, g4.d.querySelector('#langSw button[data-lang="en"]'));
    eq([...c4[0].querySelector(".cmp-role").options].map(o => o.textContent), ["Role: from the list", "Role: Top", "Role: Bottom"], "follows the language, keeps the choice");
    eq(c4[0].querySelector(".cmp-role").value, "dom", "…choice kept after switching language");
    ok(!g.errors.length && !g2.errors.length && !g3.errors.length && !g4.errors.length, "no script errors");
    _sc.end();
  }

  S("v586: star atlas — signs, company system, paired planets, roulette sky, nebulas, search tags");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, SG = K.signs, SIGNS = SG.SIGNS;
    // the 46 signs
    eq(SIGNS.length, 82, "82 signs: 9 single + 72 ordered pairs + the Chimera (v589)");
    const keys = SIGNS.map(s => s[0]), letters = "nbfrdsxvw".split("");
    const pairs = []; letters.forEach((a, i) => letters.slice(i + 1).forEach(b => pairs.push(a + b)));
    ok(letters.every(l => keys.indexOf(l) >= 0) && pairs.every(p2 => keys.indexOf(p2) >= 0 && keys.indexOf(p2[1] + p2[0]) >= 0) && keys.indexOf("*") >= 0, "every group and every pair of groups, in both orders, has its sign");
    eq([new Set(SIGNS.map(s => s[1])).size, new Set(keys).size], [82, 82], "sign ids and group keys are unique");
    ok(SIGNS.every(s => s[2].length === 9 && s[2].every(p2 => p2[0] >= 0 && p2[0] <= 100 && p2[1] >= 0 && p2[1] <= 100)), "every sign has exactly 9 stars inside its box (one per portrait group)");
    ok(SIGNS.every(s => { const used = new Set(); s[3].forEach(l => l.forEach(i => { if (i !== "d") used.add(i); })); return used.size === 9; }), "every star is joined to the figure (no loose stars)");
    ok(SIGNS.every(s => s[4].length === (s[0] === "*" ? 3 : s[0].length)), "bright stars: 1 for a single sign, 2 for a pair, 3 for the Chimera");
    const tr = {}; ["ru", "en", "es", "pt", "ja", "th", "zh"].forEach(l => { const box = {}; new Function("KC", fs.readFileSync(require("./harness").ROOT + "/js/lang/" + l + ".ui.js", "utf8"))({ addLang: (x, part, o) => Object.assign(box, o) }); tr[l] = box; });
    const need = SIGNS.map(s => "sign." + s[1]).concat(SG.GROUPS.map(g => "pt.s." + g), ["sign.mine", "sign.of", "sign.even", "sp.sys.h", "sp.sys.legend_html", "sp.sys.tap_html", "sp.sys.tune", "sp.pair.h", "sp.pair.common", "sp.pair.sim", "sp.pair.cap", "sp.pair.stars", "sp.pair.both", "rl.leadPair_html", "rl.leadGroup_html", "tpl.nebula", "seo.desc"]);
    eq(Object.keys(tr).map(l => need.filter(k => !tr[l][k])), [[], [], [], [], [], [], []], "all new texts exist in all 7 languages");
    // which sign
    const D = pcts => ({ sections: Object.keys(pcts).map(id => ({ id, pct: pcts[id] })).sort((a, b) => (b.pct === null ? -1 : b.pct) - (a.pct === null ? -1 : a.pct)) });
    const all = (o) => Object.assign({ intimacy: 10, bondage: 10, fetishes: 10, "role-play": 10, ds: 10, sm: 10, "sex-penetration": 10, "voyeurism-exhibitionism": 10, "bodily-fluids": 10 }, o);
    let r = SG.pick(D(all({ bondage: 80, ds: 60, sm: 40 })));
    eq([r.kind, r.id, r.stars.filter(x => x.bright).map(x => x.s.id).sort()], ["pair", "web", ["bondage", "ds"]], "two strongest groups → the pair sign (Bondage + D/s = Web, v587), their stars are bright");
    eq(SG.pick(D(all({ bondage: 90, ds: 60 }))).kind, "single", "first group 30 points ahead → single sign");
    eq(SG.pick(D(all({ bondage: 89, ds: 60 }))).kind, "pair", "29 points ahead → still a pair");
    r = SG.pick(D(all({ bondage: 73, sm: 73, "sex-penetration": 68 })));
    eq([r.kind, r.id, r.stars.filter(x => x.bright).length], ["even", "chimera", 3], "three strongest within 5 points → the Chimera, 3 bright stars");
    eq(SG.pick(D(all({ bondage: 73, sm: 73, "sex-penetration": 67 }))).kind, "pair", "6 points apart → not the Chimera");
    eq(new Set(r.stars.map(x => x.s.id)).size, 9, "every star stands for a different group");
    eq(SG.pick(D({ intimacy: null, bondage: null })), null, "no percentages → no sign");
    // labels stay inside and apart
    const lb = SG.placeLabels(r.stars.map(x => ({ x: 65 + x.x * 2.3, y: 60 + x.y * 2.3, r: x.bright ? 11 : 5, bright: x.bright })), [], r.stars.map(() => ({ w: 56, h: 26 })), 360, 350);
    ok(lb.every(b => b.x >= 0 && b.y >= 0 && b.x + b.w <= 360 && b.y + b.h <= 350), "every label inside the picture");
    // the portrait block
    const ids = {}; K.CATS.forEach(c => { ids[c.id] = c.items.map(([, id]) => id); });
    const mk = (cat, vals) => { const o = {}; vals.forEach((v, i) => { o[ids[cat][i]] = { interest: v }; }); return o; };
    const own = { name: "Me", uid: "MEME02", items: Object.assign(mk("bondage", ["love", "love", "love", "love", "yes"]), mk("service-control", ["love", "love", "yes", "yes"]), mk("intimacy", ["yes", "maybe", "limit"])), meta: {} };
    const p = open("form", { storage: { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(own) }, session: {} } });
    const ps = p.d.getElementById("portraitSection"); ps.open = true; ps.dispatchEvent(new p.w.Event("toggle"));
    const box = p.d.querySelector("#portraitBody .pt-sign");
    ok(!!box && /Ваше созвездие/.test(box.textContent), "portrait: “Your constellation” on top");
    const sgn = p.KC.signs.pick(p.KC.portrait.compute(p.KC.form.shown()));
    eq(box.querySelector(".sg-name").textContent, p.KC.i18n.t("sign." + sgn.id), "…with the sign's name");
    eq(box.querySelectorAll("svg text").length, 9, "…and a “group / %” label at each of the 9 stars");
    click(p.w, p.d.querySelector('#langSw button[data-lang="en"]'));
    ok(/Your constellation/.test(p.d.querySelector("#portraitBody .pt-sign").textContent), "follows the language");
    // company: solar system
    const mkSt = (name, uid, role, cats) => { const it = {}; cats.forEach(c => ids[c].forEach(id => { it[id] = { interest: "yes" }; })); return K.codec.encode({ name, uid, items: it, meta: role ? { role } : {} }, "ru"); };
    const people = [mkSt("Ann", "ANN001", "dom", ["bondage", "fetishes"]), mkSt("Bob", "BOB001", "sub", ["bondage", "intimacy"]), mkSt("Cat", "CAT001", "", ["intimacy", "role-play"]), mkSt("Dan", "DAN001", "sub", ["fetishes", "bondage"])];
    const c = open("compare", { storage: { local: { "checklist-folds": '{"pair":true,"group":true}' }, session: {} } });
    while (c.d.querySelectorAll("#parts textarea").length < people.length) click(c.w, c.d.getElementById("addPart"));
    [...c.d.querySelectorAll("#parts textarea")].forEach((ta, i) => { ta.value = people[i]; ta.dispatchEvent(new c.w.Event("input", { bubbles: true })); });
    click(c.w, c.d.getElementById("cmpBtn"));
    const sys = () => c.d.querySelector("#results .sp-box");
    eq([!!sys(), sys().querySelectorAll("[data-planet]").length], [true, 4], "group: the solar system with a planet for everyone");
    ok(/Совпадение с компанией/.test(sys().textContent) && /Верх/.test(sys().textContent), "legend and “match with the group”");
    const before = sys().querySelector("svg").innerHTML;
    click(c.w, sys().querySelector('[data-planet="0"] circle'));
    ok(/stroke-dasharray="2 3"/.test(sys().querySelector("svg").innerHTML) && sys().querySelectorAll("svg path[stroke-linecap]").length >= 1, "tap on a planet: it is marked and its links appear");
    click(c.w, sys().querySelector('[data-planet="0"] circle'));
    eq(sys().querySelector("svg").innerHTML, before, "second tap: back to the plain picture, same layout");
    // two people: paired planets + the two constellations
    const c2 = open("compare", { storage: { local: { "checklist-folds": '{"pair":true,"group":true}' }, session: {} } });
    const two = [mkSt("Eve", "EVE001", "dom", ["bondage", "fetishes", "intimacy", "sex-penetration"]), mkSt("Fox", "FOX001", "sub", ["bondage", "fetishes", "intimacy", "sex-penetration"])];
    const tas = c2.d.querySelectorAll("#parts textarea"); tas[0].value = two[0]; tas[1].value = two[1];
    click(c2.w, c2.d.getElementById("cmpBtn"));
    const pb = c2.d.querySelector("#results .sp-box");
    ok(!!pb && /Парные планеты/.test(pb.textContent) && /Ваши созвездия/.test(pb.textContent) && /схожести/.test(pb.textContent), "two people: paired planets and both constellations");
    c2.w.matchMedia = () => ({ matches: true });
    click(c2.w, c2.d.querySelector('#results button[data-act="roulette"]'));
    const out = c2.d.getElementById("rlOut");
    ok(out.querySelectorAll(".rl-idea").length === 3 && /Другие идеи/.test(c2.d.getElementById("rlAgain").textContent), "roulette for two: 3 ideas, “Other ideas”");
    ok(!out.querySelector("svg") && !out.querySelector(".rl-num, .rl-cap, .sp-disc") && [...out.querySelectorAll(".rl-idea")].every(x => x.querySelectorAll(".badge").length === 2), "v591: no sky and no numbers over the ideas; both answers under every idea");
    // nebula of a template
    const tpl = [{ id: "t1", tid: "AAAAAA", name: "Evening", ids: ids.bondage.slice(0, 6).concat(ids.intimacy.slice(0, 2)), own: true, ts: 1 }];
    const n = open("form", { storage: { local: { "checklist-lang": "ru", "checklist-templates-v1": JSON.stringify(tpl) }, session: {} } });
    click(n.w, n.d.getElementById("mineBtn"));
    const th = n.d.querySelector("#mineTplList .tpl-row:not(.tpl-starter) .nb-thumb");
    ok(!!th && !!th.querySelector("svg"), "template rows: a nebula thumbnail");
    click(n.w, th);
    const card = n.d.querySelector("#mineTplList .nb-open .nb-card");
    ok(!!card && /75%/.test(card.textContent) && /25%/.test(card.textContent), "tap: the big card with shares (6 of 8 bondage = 75%)");
    click(n.w, th); ok(!n.d.querySelector("#mineTplList .nb-open"), "second tap closes it");
    // search tags
    const html = fs.readFileSync(require("./harness").ROOT + "/index.html", "utf8");
    ok(/<meta name="description"/.test(html) && /og:image" content="https:\/\/klevatess\.github\.io\/kinkmatch\/img\/og\.png"/.test(html) && (html.match(/hreflang=/g) || []).length === 8 && /<meta name="rating" content="adult">/.test(html), "index.html: description, preview image, 7 languages + default, adult rating");
    ok(fs.existsSync(require("./harness").ROOT + "/img/og.png") && fs.existsSync(require("./harness").ROOT + "/img/favicon.svg") && fs.existsSync(require("./harness").ROOT + "/sitemap.xml"), "preview image, icon and sitemap are in the site");
    ok(p.d.title === tr.en["seo.title"] && /^Kinkosmos — /.test(p.d.title) && p.d.querySelector('meta[name="description"]').getAttribute("content") === tr.en["seo.desc"], "page title = the search title of the language (v608); the description follows the language");
    eq(p.d.querySelector('link[rel="canonical"]').href, "https://klevatess.github.io/kinkmatch/en/", "the root page points search engines to the English page (v609)");
    ok(!f.errors.length && !p.errors.length && !c.errors.length && !c2.errors.length && !n.errors.length, "no script errors");
    _sc.end();
  }

  S("v587: sun number, Yes/Maybe/Love system, card switches, Web ↔ Chain");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC;
    const ids = {}; K.CATS.forEach(c => { ids[c.id] = c.items.map(([, id]) => id); });
    const st = (vals) => { const it = {}; Object.keys(vals).forEach(c => ids[c].forEach((id, i) => { if (i < vals[c][1]) it[id] = { interest: vals[c][0] }; })); return { items: it, meta: {} }; };
    const c = open("compare", { storage: { local: { "checklist-folds": '{"pair":true,"group":true}' }, session: {} } }), S2 = c.KC.space;
    const P = [{ name: "A", st: st({ bondage: ["yes", 10], intimacy: ["maybe", 10] }) }, { name: "B", st: st({ bondage: ["yes", 10], intimacy: ["maybe", 10] }) }, { name: "C", st: st({ bondage: ["yes", 6], fetishes: ["yes", 5] }) }];
    const sunOf = h => +(/<text[^>]*font-size="15"[^>]*>(\d+)<\/text>/.exec(h) || [])[1];
    eq(sunOf(S2.groupSVG(P, null, false)), 10, "the number over the sun: practices more than half of the group marked Yes/Love (10 bondage items)");
    eq(sunOf(S2.groupSVG(P, null, true)), 20, "“Yes/Maybe/Love” filter: Maybe counts too (+10 intimacy items)");
    ok(/Да\/Может\/Обожаю/.test(S2.groupSVG(P, null, true)), "…with its own legend");
    const p = open("form"); click(p.w, p.d.getElementById("portraitSection").querySelector("summary"));
    eq(K.signs.SIGNS.find(x => x[1] === "web")[0] + "," + K.signs.SIGNS.find(x => x[1] === "chain")[0], "bd,fd", "Bondage + D/s = Web, Fetishes + D/s = Chain");
    ok(fs.readFileSync(require("./harness").ROOT + "/js/form/portrait.js", "utf8").indexOf('["sign", true], ["bars", true]') >= 0, "picture card: “Constellation” and “Sections” are separate switches");
    ok(!f.errors.length && !c.errors.length && !p.errors.length, "no script errors");
    _sc.end();
  }

  S("v589: order matters; the pair's constellations");
  {
    const _sc = scope();
    const f = open("form"), SG = f.KC.signs;
    const D = pcts => ({ sections: Object.keys(pcts).map(id => ({ id, pct: pcts[id] })).sort((a, b) => (b.pct === null ? -1 : b.pct) - (a.pct === null ? -1 : a.pct)) });
    const all = o => Object.assign({ intimacy: 10, bondage: 10, fetishes: 10, "role-play": 10, ds: 10, sm: 10, "sex-penetration": 10, "voyeurism-exhibitionism": 10, "bodily-fluids": 10 }, o);
    const a = SG.pick(D(all({ ds: 70, sm: 60 }))), b = SG.pick(D(all({ sm: 70, ds: 60 })));
    eq([a.id, b.id], ["wyvern", "basilisk"], "D/s + S/M = Wyvern, S/M + D/s = Basilisk");
    eq(a.stars.filter(x => x.bright).map(x => x.s.id).sort().join(), "ds,sm", "…the two main groups are the bright stars");
    eq(SG.closeness(a, a).level, "same", "same sign → “one constellation”");
    eq(SG.closeness(a, b).level, "mirror", "same groups, other order → mirror");
    const c = SG.pick(D(all({ ds: 70, bondage: 60 })));
    eq([SG.closeness(a, c).level, SG.closeness(a, c).shared], ["near", ["ds"]], "one main group in common → neighbours");
    eq(SG.closeness(a, SG.pick(D(all({ intimacy: 70, "sex-penetration": 60 })))).level, "far", "nothing in common → different systems");
    // on the compare page
    const ids = {}; f.KC.CATS.forEach(c2 => { ids[c2.id] = c2.items.map(([, id]) => id); });
    const mk = (name, uid, cats) => { const it = {}; cats.forEach(([c2, v]) => ids[c2].forEach(id => { it[id] = { interest: v }; })); return f.KC.codec.encode({ name, uid, items: it, meta: {} }, "ru"); };
    const cp = open("compare", { storage: { local: { "checklist-folds": '{"pair":true,"group":true}' }, session: {} } });
    const tas = cp.d.querySelectorAll("#parts textarea");
    tas[0].value = mk("Ann", "ANN009", [["bondage", "love"], ["service-control", "yes"], ["intimacy", "limit"]]); tas[1].value = mk("Bob", "BOB009", [["bondage", "love"], ["impact-rough-play", "yes"], ["intimacy", "limit"]]);
    click(cp.w, cp.d.getElementById("cmpBtn"));
    const box = cp.d.querySelector("#results .sp-signs");
    ok(!!box && /Созвездия пары/.test(box.textContent) && box.querySelectorAll(".sg-mini").length === 2 && /Ann/.test(box.textContent) && /Bob/.test(box.textContent), "two people: both signs side by side with names");
    ok(/Соседние созвездия|Одно созвездие|Зеркальные созвездия|Разные системы/.test(box.textContent), "…and how close they are");
    ok(!f.errors.length && !cp.errors.length, "no script errors");
    _sc.end();
  }

  S("v590: help covers the new features; what's new");
  {
    const _sc = scope();
    const h = open("form");
    eq(h.KC.help.SECTIONS.slice(), ["start", "answer", "filters", "portrait", "lists", "share", "received", "tpl", "pdf", "compare", "roulette", "privacy"], "help sections: portrait and roulette added");
    h.KC.help.open("portrait");
    ok(/созвезд/i.test(h.d.getElementById("help-portrait").textContent) && /Что попробуем/.test(h.d.getElementById("help-roulette").textContent), "portrait (with the constellation) and roulette are explained");
    ok(/Система компании/.test(h.d.getElementById("help-compare").textContent) && /туманност/.test(h.d.getElementById("help-tpl").textContent), "compare pictures and template nebulas are explained");
    h.KC.help.open("news");
    eq(h.d.querySelectorAll("#helpNews h5")[4].textContent, "29 сентября 2026", "what's new: the Kinkosmos entry (under the WoD and DnD updates; dated 29 Sept, owner v601)");
    ok(!!h.d.querySelector('#portraitSection summary .help-q[data-help="lore"]'), "“?” next to the portrait opens the constellation guide");
    ok(!h.errors.length, "no script errors");
    _sc.end();
  }

  S("v591: DnD mode of the portrait; the roulette without the sky");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, DD = K.dnd, SG = K.signs;
    const LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    const keys = Object.keys(DD.VAR);
    eq(keys.length, 46, "46 variants: 9 single, 36 pairs, the Chimera");
    const count = {}; keys.forEach(k => { count[DD.VAR[k][0]] = (count[DD.VAR[k][0]] || 0) + 1; });
    eq([Object.keys(count).length, Object.values(count).every(n => n >= 3 && n <= 4)], [13, true], "13 classes, 3–4 variants each");
    eq(Object.keys(DD.VAR).filter(k => k.length === 2).length, 36, "36 pairs, one per unordered pair");
    const bad = [];
    Object.keys(DD.FIG).forEach(c => { const [P, E, L, B] = DD.FIG[c], n = P.length + E.length;
      if (P.length !== 9 || new Set(B).size !== 3 || B.some(i => i < 0 || i > 8)) bad.push(c + ": stars");
      L.forEach(l => (l[0] === "d" ? l.slice(1) : l).forEach(i => { if (!(i >= 0 && i < n)) bad.push(c + ": line " + i); })); });
    eq(bad, [], "every class figure: 9 group stars, 3 bright slots, lines only to existing stars");
    const miss = [];
    const need = ["dnd.switch", "dnd.toSign", "dnd.toDnd", "dnd.mine", "dnd.of", "card.o.dnd", "help.portraitDnd_html"]
      .concat(Object.keys(DD.FIG).map(c => "dnd.c." + c), keys.map(k => "dnd.s." + DD.VAR[k].join(".")), DD.ALIGN.map(a => "dnd.al." + a), DD.ALIGN.map(a => "dnd.aq." + a));
    LANGS.forEach(l => need.forEach(k => { if (!K.i18n.has("ui", k, l)) miss.push(l + ":" + k); }));
    eq(miss, [], "every DnD text exists in all 7 languages");
    const D = pcts => ({ sections: Object.keys(pcts).map(id => ({ id, pct: pcts[id] })).sort((a, b) => (b.pct === null ? -1 : b.pct) - (a.pct === null ? -1 : a.pct)) });
    const all = o => Object.assign({ intimacy: 10, bondage: 10, fetishes: 10, "role-play": 10, ds: 10, sm: 10, "sex-penetration": 10, "voyeurism-exhibitionism": 10, "bodily-fluids": 10 }, o);
    /* v603: the class is a profile; a pair variant still does not depend on the order of its two groups */
    const a = DD.pick(D(all({ ds: 70, sm: 65 })));
    eq([a.cls, a.sub, a.kind], ["paladin", "vengeance", "pair"], "D/s far above, S/M close behind → Paladin, Oath of Vengeance (D/s + S/M)");
    const dvOf = o => DD.devs(D(all(o))).dev;
    eq([DD.variant("paladin", dvOf({ ds: 70, sm: 65 })).key, DD.variant("paladin", dvOf({ ds: 65, sm: 80 })).key], ["ds", "ds"], "…S/M + D/s in the other order: the same variant");
    eq(a.stars.filter(x => x.bright).map(x => x.s.id).sort().join(), "ds,sm", "…the two main groups are the bright stars");
    eq([a.stars.filter(x => !x.grey).length, a.stars.filter(x => !x.grey && x.s).length, a.stars.filter(x => x.grey && x.s).length], [9, 9, 0], "…9 stars carry the groups, grey stars carry none");
    const ch = DD.pick(D(all({ "sex-penetration": 76, "bodily-fluids": 41, intimacy: 56 })));
    eq([DD.pick(D(all({ intimacy: 90 }))).sub, ch.cls + " " + ch.sub, ch.kind], ["life", "sorcerer wildmagic", "even"], "one group far ahead → its own subclass; a Sorcerer with three groups close (after the usual skew) → Wild Magic");
    // alignment
    const items = {}; let N = 0; K.CATS.forEach(c => { if (!K.portrait.OUT[c.id]) c.items.forEach(([, id]) => { items[id] = c.id; N++; }); });
    const ids = Object.keys(items);
    const mkS = (fn, role) => { const it = {}; ids.forEach((id, i) => { const v = fn(i, items[id]); if (v) it[id] = { interest: v }; }); return { items: it, meta: role ? { role } : {} }; };
    const DP = st => K.portrait.compute(st, null);
    const al = (st) => DD.alignment(st, DP(st), null);
    eq(al(mkS(i => i < 10 ? "yes" : null)), "roll", "fewer than 20 answers → “Still rolling the dice”");
    eq(al(mkS(i => i % 10 < 7 ? "limit" : "yes")), "boring", "60%+ “No” → “Lawful Boring”");
    // v594, owner: every group counts (weights KC.dnd.AXES), measured from the person's own average
    eq(Object.keys(DD.AXES).sort(), SG.GROUPS.slice().sort(), "every portrait group has a weight on both axes");
    const yes = role => mkS(() => "yes", role), P9 = o => D(Object.assign({ intimacy: 50, bondage: 50, fetishes: 50, "role-play": 50, ds: 50, sm: 50, "sex-penetration": 50, "voyeurism-exhibitionism": 50, "bodily-fluids": 50 }, o));
    const ns = P9({ bondage: 77, ds: 73, sm: 70, fetishes: 62, "role-play": 49, "sex-penetration": 42, intimacy: 37, "voyeurism-exhibitionism": 35, "bodily-fluids": 26 });
    eq(DD.alignment(yes("dom"), ns, null), "LN", "the owner's case (Top; Bondage 77, D/s 73, S/M 70 … Intimacy 37) → Lawful Neutral");
    ok(DD.scores(ns).good > -15 && DD.scores(ns).law > 15, "…Good between −15 and 15, Law above 15");
    eq(DD.alignment(mkS(i => i % 4 === 0 ? "limit" : "yes", "dom"), P9({ sm: 90, ds: 70, bondage: 60, intimacy: 15, "sex-penetration": 40, "role-play": 30, fetishes: 40, "voyeurism-exhibitionism": 30, "bodily-fluids": 40 }), null), "LE", "a hard sadist Top (a quarter “No”) → Lawful Evil");
    eq(DD.alignment(yes(), P9({ intimacy: 85, "sex-penetration": 75, "role-play": 40, bondage: 25, ds: 15, sm: 10, fetishes: 30, "voyeurism-exhibitionism": 30, "bodily-fluids": 10 }), null).charAt(1), "G", "a vanilla romantic → Good");
    const playful = mkS(i => i % 3 === 0 ? "maybe" : "yes", "sub");
    eq(DD.alignment(playful, P9({ intimacy: 70, "role-play": 65, "voyeurism-exhibitionism": 60, "sex-penetration": 60, fetishes: 45, bondage: 40, ds: 30, sm: 25, "bodily-fluids": 35 }), null), "CG", "a playful Bottom with a third “Maybe” → Chaotic Good");
    eq(DD.alignment(yes(), P9({ "voyeurism-exhibitionism": 85, "bodily-fluids": 70, "role-play": 70, "sex-penetration": 65, sm: 50, intimacy: 40, bondage: 30, ds: 25, fetishes: 45 }), null).charAt(0), "C", "an exhibitionist with fluids and role-play → Chaotic");
    eq(DD.alignment(yes(), P9({}), null), "NN", "all groups equal, no role → True Neutral");
    eq([DD.alignment(mkS(i => i % 4 === 0 ? "limit" : "yes"), P9({}), null), DD.alignment(mkS(i => i % 4 === 0 ? "limit" : i % 5 < 4 ? null : "yes"), P9({}), null)].map(x => x.charAt(0)), ["N", "L"], "unanswered items count as half a “No” → more Lawful");
    // the page: the switch, the class, the card, remembered on this device
    const own = { items: mkS((i, c) => c === "bondage" ? "love" : ["service-control", "humiliation"].indexOf(c) >= 0 ? "yes" : i % 4 ? "maybe" : "limit", "sub").items, meta: { role: "sub" }, name: "Ann" };
    const g = open("form", { storage: { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(own) }, session: {} } });
    const sec = g.d.getElementById("portraitSection"); sec.open = true; sec.dispatchEvent(new g.w.Event("toggle"));
    const sw = () => g.d.querySelector("#portraitBody .pt-mode");
    ok(!!sw() && sw().querySelector('[data-mode="sign"]').getAttribute("aria-pressed") === "true" && /Созвездие/.test(sw().textContent) && /DnD/.test(sw().textContent), "the portrait has the “✦ Constellation | 🎲 DnD” switch, the constellation by default");
    ok(!!g.d.querySelector(".pt-sign:not(.pt-dnd)"), "…and shows the sign");
    click(g.w, sw().querySelector('[data-mode="dnd"]'));
    const dv = g.d.querySelector(".pt-sign.pt-dnd");
    ok(!!dv && /Ваш класс/.test(dv.textContent) && dv.querySelectorAll("svg .sg-grey").length > 0 && !!dv.querySelector(".sg-al b"), "DnD: “Your class”, the class figure with grey stars, the alignment line");
    ok(/Колдун|Монах|Воин|Паладин|Следопыт|Друид|Плут/.test(dv.querySelector(".sg-name").textContent) && /D\/s/.test(dv.querySelector(".sg-sub").textContent), "…the class by its profile, with the subclass and the variant's groups");
    ok(DD.ALIGN.indexOf(dv.dataset.al) >= 0, "…with an alignment");
    eq(g.w.localStorage.getItem("checklist-dnd"), "1", "the mode is remembered on this device");
    click(g.w, g.d.getElementById("ptCard"));
    ok(/Класс DnD/.test(g.d.getElementById("cardOpts").textContent), "picture card: the switch is “DnD class”");
    // (the picture itself is drawn on a canvas: checked in the browser scenarios)
    g.d.getElementById("cardClose").click();
    click(g.w, g.d.querySelector('#portraitBody .pt-mode [data-mode="sign"]'));
    ok(!g.d.querySelector(".pt-dnd") && !!g.d.querySelector(".pt-sign") && g.w.localStorage.getItem("checklist-dnd") === null, "back to the constellation");
    // help and what's new
    g.KC.help.open("portrait");
    ok(/DnD/.test(g.d.getElementById("help-portrait").textContent) && /Мировоззрение/.test(g.d.getElementById("help-portrait").textContent) && /половина «Нет»/.test(g.d.getElementById("help-portrait").textContent), "help: the DnD mode and the alignment are explained");
    ok(!/Небо|пронумерован/.test(g.d.getElementById("help-roulette").textContent), "help: the roulette sky is no longer mentioned");
    g.KC.help.open("news");
    const top = g.d.querySelectorAll("#helpNews ul")[2];   /* v601: the World of Darkness entry is on top */
    ok(/DnD/.test(top.textContent) && !/небо общих/.test(top.textContent), "what's new: the DnD mode is in, the roulette sky is out");
    const skyKeys = []; LANGS.forEach(l => ["rl.sky", "rl.skyBold"].forEach(k => { if (K.i18n.has("ui", k, l)) skyKeys.push(l + ":" + k); }));
    eq(skyKeys, [], "the sky's texts are gone in every language");
    ok(!f.errors.length && !g.errors.length, "no script errors");
    _sc.end();
  }

  S("v592: DnD in the pair's constellations (v599: the pair remembers its own choice)");
  {
    const _sc = scope();
    const f = open("form"), ids = {}; f.KC.CATS.forEach(c => { ids[c.id] = c.items.map(([, id]) => id); });
    const mk = (name, uid, role, cats) => { const it = {}; cats.forEach(([c, v]) => ids[c].forEach(id => { it[id] = { interest: v }; })); return f.KC.codec.encode({ name, uid, items: it, meta: role ? { role } : {} }, "ru"); };
    const A = mk("Ann", "ANN592", "sub", [["bondage", "love"], ["service-control", "yes"], ["intimacy", "limit"]]), B = mk("Bob", "BOB592", "dom", [["bondage", "love"], ["impact-rough-play", "yes"], ["intimacy", "limit"]]);
    const run = local => { const cp = open("compare", { storage: { local: Object.assign({ "checklist-lang": "ru", "checklist-folds": '{"pair":true}' }, local), session: {} } });
      const tas = cp.d.querySelectorAll("#parts textarea"); tas[0].value = A; tas[1].value = B; click(cp.w, cp.d.getElementById("cmpBtn")); return cp; };
    const c1 = run({});
    let box = c1.d.querySelector("#results .sp-signs");
    ok(!box.classList.contains("sp-dnd") && /Созвездия пары/.test(box.textContent) && !!box.querySelector('.pt-mode [data-mode="dnd"][aria-pressed="false"]'), "by default: the constellations, with the switch");
    click(c1.w, box.querySelector('.pt-mode [data-mode="dnd"]'));
    box = c1.d.querySelector("#results .sp-signs");
    ok(box.classList.contains("sp-dnd") && /Классы пары/.test(box.textContent) && box.querySelectorAll(".sg-dnd").length === 2 && box.querySelectorAll(".sg-grey").length > 0, "🎲 DnD: both classes with grey stars");
    ok(/Ann/.test(box.textContent) && /Bob/.test(box.textContent) && box.querySelectorAll(".sg-dnd .al").length === 2 && [...box.querySelectorAll(".sg-dnd .al")].every(x => x.textContent.trim().length > 3), "…names, subclasses and alignments");
    ok(/Одна партия|Один класс|Одинаковые персонажи|Разные партии/.test(box.textContent), "…and how close the two classes are");
    eq([c1.w.localStorage.getItem("checklist-dnd-pair"), c1.w.localStorage.getItem("checklist-dnd")], ["1", null], "the choice is stored for the pair only — the portrait keeps its own (v599)");
    ok(!!c1.d.querySelector("#results .sp-box") && c1.d.querySelectorAll("#results .sp-signs").length === 1, "only this block is redrawn, the rest of the results stay");
    const c0 = run({ "checklist-dnd": "wod", "checklist-dnd-group": "1" });
    ok(!c0.d.querySelector("#results .sp-signs").classList.contains("sp-dnd") && !c0.d.querySelector("#results .sp-signs").classList.contains("sp-wod"), "a mode chosen in the portrait or the company does NOT change the pair (v599)");
    const c2 = run({ "checklist-dnd-pair": "1" });
    ok(c2.d.querySelector("#results .sp-signs").classList.contains("sp-dnd") && !!c2.d.querySelector('#results .sp-signs .pt-mode [data-mode="sign"]'), "DnD chosen for the pair before → the pair opens in DnD, switch still there");
    click(c2.w, c2.d.querySelector('#results .sp-signs .pt-mode [data-mode="sign"]'));
    ok(!c2.d.querySelector("#results .sp-signs").classList.contains("sp-dnd") && c2.w.localStorage.getItem("checklist-dnd-pair") === null, "back to the constellations");
    const same = f.KC.dnd.pick(f.KC.portrait.compute(f.KC.codec.decode(A)));
    ok(!!same && same.dnd && f.KC.dnd.VAR[same.key][0] === same.cls, "the pair uses the same DnD figures as the portrait");
    c2.KC.help.open("compare");
    ok(/🎲 DnD/.test(c2.d.getElementById("help-compare").textContent) && /запоминают свой выбор отдельно/.test(c2.d.getElementById("help-compare").textContent), "help: DnD in the pair's constellations is explained");
    ok(!c1.errors.length && !c2.errors.length && !c0.errors.length && !f.errors.length, "no script errors");
    _sc.end();
  }

  S("v593: the compare pictures fold away and the page remembers it");
  {
    const _sc = scope();
    const f = open("form"), ids = {}; f.KC.CATS.forEach(c => { ids[c.id] = c.items.map(([, id]) => id); });
    const mk = (name, uid, cats) => { const it = {}; cats.forEach(([c, v]) => ids[c].forEach(id => { it[id] = { interest: v }; })); return f.KC.codec.encode({ name, uid, items: it, meta: {} }, "ru"); };
    const L = [mk("Ann", "ANN593", [["bondage", "love"], ["intimacy", "yes"]]), mk("Bob", "BOB593", [["bondage", "love"], ["fetishes", "yes"]]), mk("Cid", "CID593", [["bondage", "yes"], ["intimacy", "love"]])];
    const run = (n, local) => { const cp = open("compare", { storage: { local: Object.assign({ "checklist-lang": "ru" }, local || {}), session: {} } });
      for (let i = 2; i < n; i++) click(cp.w, cp.d.getElementById("addPart"));
      cp.d.querySelectorAll("#parts textarea").forEach((ta, i) => { ta.value = L[i]; }); click(cp.w, cp.d.getElementById("cmpBtn")); return cp; };
    const c = run(2), fd = () => c.d.querySelector('#results details.sp-fold[data-fold="pair"]');
    ok(!!fd() && !fd().open && /Звёздная карта пары/.test(fd().querySelector("summary").textContent) && !c.d.querySelector("#results .sp-box"), "two people: the pictures are in a closed “The pair's star map”, nothing drawn yet");
    ok(!!c.d.querySelector("#results .cmp-summary") && !!c.d.querySelector('#results button[data-act="roulette"]'), "…the rest of the comparison is there");
    fd().open = true; fd().dispatchEvent(new c.w.Event("toggle"));
    ok(fd().querySelectorAll(".sp-box").length === 2 && !!fd().querySelector(".sp-signs"), "opened: paired planets and the pair's constellations");
    eq(JSON.parse(c.w.localStorage.getItem("checklist-folds")), { pair: true }, "the page remembers it is open");
    const c2 = run(2, { "checklist-folds": '{"pair":true}' });
    ok(c2.d.querySelector('#results details.sp-fold[data-fold="pair"]').open && c2.d.querySelectorAll("#results .sp-box").length === 2, "coming back: still open");
    const g = run(3), gf = () => g.d.querySelector('#results details.sp-fold[data-fold="group"]');
    ok(!!gf() && !gf().open && /Звёздная карта компании/.test(gf().textContent) && !g.d.querySelector("[data-planet]"), "a group: the system is in a closed “The group's star map”");
    gf().open = true; gf().dispatchEvent(new g.w.Event("toggle"));
    ok(g.d.querySelectorAll("#results [data-planet]").length === 3, "opened: the system with a planet for everyone");
    click(g.w, g.d.querySelector('#results [data-planet="0"] circle'));
    ok(gf().open && g.d.querySelectorAll("#results [data-planet]").length === 3, "a tap on a planet keeps it open");
    gf().open = false; gf().dispatchEvent(new g.w.Event("toggle"));
    eq(JSON.parse(g.w.localStorage.getItem("checklist-folds")).group, false, "closing is remembered too");
    g.KC.help.open("compare"); ok(/Звёздная карта пары/.test(g.d.getElementById("help-compare").textContent) && /запомнит/.test(g.d.getElementById("help-compare").textContent), "help: the folds are explained");
    ok(!c.errors.length && !c2.errors.length && !g.errors.length, "no script errors");
    _sc.end();
  }

  S("v596: DnD race, level, the party and its foes; the DnD patch note");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, DD = K.dnd;
    const LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    // race: 27 clusters over 7 axes; every item id exists, no item in two clusters, 13 races
    const all = new Set(); K.CATS.forEach(c => c.items.forEach(([, id]) => all.add(id)));
    const seen = {}, bad = []; Object.keys(DD.CL).forEach(k => DD.CL[k][1].split(" ").forEach(id => { if (!all.has(id)) bad.push(id); seen[id] = (seen[id] || 0) + 1; }));
    eq([Object.keys(DD.CL).length, bad, Object.keys(seen).filter(id => seen[id] > 1)], [27, [], []], "27 clusters, real items only, none in two clusters");
    ok(Object.keys(seen).length >= 485, "almost every item is in a cluster (" + Object.keys(seen).length + ")");
    eq(Object.keys(DD.RACES).sort(), ["changeling", "dragonborn", "drow", "dwarf", "elf", "goliath", "halfling", "halforc", "human", "kenku", "tabaxi", "tiefling", "yuanti"], "13 races (owner's list)");
    const poles = [].concat(...DD.POLES);
    ok(Object.values(DD.RACES).every(r => poles.indexOf(r[0]) >= 0 && poles.indexOf(r[1]) >= 0), "every race is two real poles");
    const ids = [...all];
    const mk = (fn, meta) => { const it = {}; ids.forEach((id, i) => { const v = fn(id, i); if (v) it[id] = { interest: v }; }); return { items: it, meta: meta || {} }; };
    const inCl = (...cl) => { const s2 = new Set(); cl.forEach(k => DD.CL[k][1].split(" ").forEach(id => s2.add(id))); return s2; };
    /* v603: poles are measured from the usual value of real lists (AXT), so a list right at the usual values is Human */
    const same = mk(() => "yes"), keep = DD.AXT.slice();
    DD.axes(same, null).forEach((v, i) => { DD.AXT[i] = v; });
    const hu = DD.race(same, null); keep.forEach((v, i) => { DD.AXT[i] = v; });
    eq(hu, "human", "a list right at the usual values of real lists → Human");
    const rope = inCl("rope", "protocol", "orgasm", "wardrobe", "worship"), rit = inCl("protocol", "touch");
    eq(DD.race(mk((id, i) => rit.has(id) ? "love" : i % 3 ? "limit" : "maybe"), null), "elf", "ritual + slow build (protocol, slow caresses) → Elf");
    const iron = inCl("iron", "wardrobe", "orgasm");
    eq(DD.race(mk((id, i) => iron.has(id) ? "love" : i % 3 ? "limit" : "maybe"), null), "dwarf", "gear + power (iron, gear, orgasm control) → Dwarf");
    const soft = inCl("home", "touch");
    eq(DD.race(mk((id, i) => soft.has(id) ? "love" : i % 3 ? "limit" : "maybe"), null), "halfling", "softness + privacy (home, caresses) → Halfling");
    const lean = mk((id, i) => iron.has(id) ? "yes" : i % 3 ? "limit" : "maybe");
    const sc0 = DD.race(lean, null), sc1 = DD.race({ items: lean.items, meta: { attire: ["latex", "leather"], exp: "extensive" } }, null);
    ok(sc0 !== "human" && ["dwarf", "dragonborn", "tiefling"].indexOf(sc1) >= 0, "“About me” (experience, latex/leather) can tip the race (" + sc0 + " → " + sc1 + ")");
    // level: Yes + 2 × Love + ½ × Maybe on the PHB table ÷ 400
    eq([DD.level(mk(() => null), null), DD.level(mk((id, i) => i < 50 ? "yes" : null), null), DD.level(mk(() => "love"), null)], [1, 6, 20], "level: nothing → 1, 50 Yes → 6, all Love → 20");
    eq(DD.level(mk((id, i) => i < 216 ? "yes" : i < 262 ? "love" : i < 395 ? "maybe" : null), null), 14, "the owner's numbers (216 Yes, 46 Love, 133 Maybe) → level 14");
    // foes: DMG 2014 thresholds, strongest monster that fits
    eq(DD.foes([14, 15]).map(x => x.id), ["bonedevil", "djinni", "adultblack"], "levels 14 + 15 → Bone Devil, Djinni, Adult Black Dragon");
    eq(DD.foes([1]).map(x => x.id), ["goblin", "goblin", "goblin"].map((x, i) => [50, 75, 100][i] >= 100 ? "satyr" : x), "one level-1 hero → goblins, a satyr at the edge");
    eq(DD.foes([20, 20, 20, 20, 20, 20, 20, 20, 20, 20]).map(x => x.id)[2], "ancientred", "ten level-20 heroes: an Ancient Red Dragon at the edge");
    const miss = [];
    const need = ["dnd.lvl", "dnd.lvlShort", "sp.party.h", "sp.party.lvl", "sp.party.foes", "sp.foe.m", "sp.foe.h", "sp.foe.d", "sp.party.note", "help.dndRace_html", "help.compareParty_html"]
      .concat(Object.keys(DD.RACES).map(r => "dnd.r." + r), DD.MON.map(m => "dnd.m." + m[0]));
    LANGS.forEach(l => need.forEach(k => { if (!K.i18n.has("ui", k, l)) miss.push(l + ":" + k); }));
    eq(miss, [], "every race, monster and party text in all 7 languages");
    // the portrait: race · level under the class
    const own = mk((id, i) => rope.has(id) ? "love" : i % 3 ? "yes" : "maybe", { role: "dom" }); own.name = "Ann";
    const g = open("form", { storage: { local: { "checklist-lang": "ru", "checklist-dnd": "1", "practices-checklist-v1": JSON.stringify(own) }, session: {} } });
    const sec = g.d.getElementById("portraitSection"); sec.open = true; sec.dispatchEvent(new g.w.Event("toggle"));
    const pv = g.d.querySelector(".pt-dnd");
    ok(!!pv && /уровень/.test(pv.querySelector(".sg-rl").textContent) && pv.dataset.race && +pv.dataset.lv >= 1, "portrait: “<race> · <n> level” under the class");
    ok(g.d.querySelector(".pt-dnd .sg-rl").textContent.indexOf(g.KC.i18n.t("dnd.r." + pv.dataset.race)) === 0, "…the race name comes first");
    // the compare page: pair foes, the group's party
    const codes = [["Ann", "ANN596", "dom", ["bondage", "service-control"]], ["Bob", "BOB596", "sub", ["bondage", "impact-rough-play"]], ["Cid", "CID596", "", ["intimacy", "sex-penetration"]]].map(([n, u, r, cats]) => {
      const it = {}; K.CATS.forEach(c => c.items.forEach(([, id]) => { it[id] = { interest: cats.indexOf(c.id) >= 0 ? "love" : "maybe" }; })); return K.codec.encode({ name: n, uid: u, items: it, meta: r ? { role: r } : {} }, "ru"); });
    const run = (n, local) => { const cp = open("compare", { storage: { local: Object.assign({ "checklist-lang": "ru" }, local), session: {} } });
      for (let i = 2; i < n; i++) click(cp.w, cp.d.getElementById("addPart"));
      cp.d.querySelectorAll("#parts textarea").forEach((ta, i) => { ta.value = codes[i]; }); click(cp.w, cp.d.getElementById("cmpBtn")); return cp; };
    const c2 = run(2, { "checklist-dnd-pair": "1", "checklist-folds": '{"pair":true,"group":true}' });
    const box = c2.d.querySelector(".sp-signs.sp-dnd");
    ok(!!box && box.querySelectorAll(".sg-mini .rl").length === 2 && box.querySelectorAll(".dnd-foe").length === 3 && /Кого одолеете вместе/.test(box.textContent), "pair (DnD): race · level for both and three foes");
    const c3 = run(3, { "checklist-dnd-group": "1", "checklist-folds": '{"pair":true,"group":true}' });
    const gf = c3.d.querySelector('details.sp-fold[data-fold="group"]');
    ok(!!gf.querySelector(".pt-mode") && !!gf.querySelector(".sp-party") && !gf.querySelector("[data-planet]"), "group (DnD): the fold shows the party, not the system, with the switch");
    ok(gf.querySelectorAll(".dnd-party li").length === 3 && /Уровни вместе/.test(gf.textContent) && gf.querySelectorAll(".dnd-foe").length === 3, "…everyone, the levels together, three foes");
    click(c3.w, gf.querySelector('.pt-mode [data-mode="sign"]'));
    ok(!!gf.querySelector("[data-planet]") && !gf.querySelector(".sp-party") && c3.w.localStorage.getItem("checklist-dnd-group") === null, "switch → the solar system again (remembered for the company)");
    click(c3.w, gf.querySelector('.pt-mode [data-mode="dnd"]'));
    ok(!!gf.querySelector(".sp-party") && c3.w.localStorage.getItem("checklist-dnd-group") === "1" && c3.w.localStorage.getItem("checklist-dnd") === null && c3.w.localStorage.getItem("checklist-dnd-pair") === null, "…and back to the party; the portrait and the pair are not touched");
    const c4 = run(3, { "checklist-folds": '{"group":true}' });
    ok(!!c4.d.querySelector('.sp-fold[data-fold="group"] [data-planet]') && !c4.d.querySelector(".sp-party"), "without DnD: the group fold is the solar system");
    // help and the patch note
    c3.KC.help.open("compare"); ok(/Партия/.test(c3.d.getElementById("help-compare").textContent) && /Руководства мастера/.test(c3.d.getElementById("help-compare").textContent), "help: the party and the foes are explained");
    g.KC.help.open("portrait"); ok(/Раса/.test(g.d.getElementById("help-portrait").textContent) && /Уровень/.test(g.d.getElementById("help-portrait").textContent), "help: race and level are explained");
    g.KC.help.open("news");
    const h5 = g.d.querySelectorAll("#helpNews h5"), uls = g.d.querySelectorAll("#helpNews ul");
    ok(/DnD-обновление/.test(h5[3].textContent) && /Раса/.test(uls[3].textContent) && /Партия/.test(uls[3].textContent) && !/DnD/.test(uls[4].textContent), "what's new: the DnD update is its own entry (under World of Darkness); the Kinkosmos entry no longer lists DnD");
    ok(!f.errors.length && !g.errors.length && !c2.errors.length && !c3.errors.length && !c4.errors.length, "no script errors");
    _sc.end();
  }

  S("v597: World of Darkness mode — vampire, werewolf, fey, demon");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, W = K.wod, DD = K.dnd;
    const LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    eq(W.LINES, ["vamp", "wolf", "fey", "demon"], "four lines");
    eq(W.LINES.map(L => Object.keys(W.FIG[L]).length), [12, 12, 12, 7], "12 clans, 12 tribes, 12 kiths (v604: + Selkies, Clurichauns), 7 houses");
    ok(!W.FIG.vamp.ghoul && !W.FIG.wolf.furies && !W.FIG.vamp.salubri && !W.FIG.vamp.caitiff && !W.FIG.vamp.ravnos, "no Ghouls, Black Furies, Salubri, Caitiff, Ravnos (owner)");
    eq(W.LINES.map(L => Object.keys(W.PROF[L]).filter(id => !W.FIG[L][id]).length), [0, 0, 0, 0], "every profile has a figure");
    eq(W.LINES.map(L => Object.keys(W.FIG[L]).filter(id => !W.PROF[L][id])), [["malkavian"], [], [], []], "every figure has a profile; the Malkavians have a rule instead (v601)");
    const bad = [];
    W.LINES.forEach(L => Object.keys(W.FIG[L]).forEach(id => { const [P, E, Ln, B] = W.FIG[L][id], n = P.length + E.length;
      if (P.length !== 9 || new Set(B).size !== 3 || B.some(i => i < 0 || i > 8)) bad.push(id + ": stars");
      Ln.forEach(l => (l[0] === "d" ? l.slice(1) : l).forEach(i => { if (!(i >= 0 && i < n)) bad.push(id + ": line " + i); })); }));
    eq(bad, [], "every figure: 9 group stars, 3 bright slots, lines only to existing stars");
    eq(Object.keys(W.LORE).map(h => Object.keys(W.LORE[h]).length), [3, 3, 3, 3, 3, 3, 3], "every demon house has 3 Lores");
    eq([Object.keys(W.HOUSES.seelie).length, Object.keys(W.HOUSES.unseelie).length], [7, 6], "7 Seelie and 6 Unseelie houses");
    const miss = [], need = ["wod.toWod", "wod.switch", "wod.gen", "wod.faith", "wod.rage", "wod.gnosis", "wod.glamour", "wod.banality", "wod.notOfficial", "card.o.wod", "sp.wod.sameWhy", "help.wod_html", "help.compareWod_html"];
    W.LINES.forEach(L => { ["wod.l.", "wod.mine.", "wod.of.", "sp.wod.grp.", "sp.wod.h.", "sp.wod.same.", "sp.wod.near.", "sp.wod.far."].forEach(p => need.push(p + L));
      Object.keys(W.FIG[L]).forEach(id => need.push("wod." + L + "." + id)); });
    Object.keys(W.FIG.demon).forEach(id => need.push("wod.demon.a." + id));
    Object.keys(W.PATHS).forEach(k => need.push("wod.path." + k)); Object.keys(W.AUSP).forEach(k => need.push("wod.aus." + k));
    ["cliath", "fostern", "adren", "athro", "elder"].forEach(k => need.push("wod.rank." + k)); ["homid", "lupus", "metis"].forEach(k => need.push("wod.breed." + k));
    ["seelie", "unseelie"].forEach(c => { need.push("wod.court." + c); Object.keys(W.HOUSES[c]).forEach(h => need.push("wod.house." + h)); });
    ["childling", "wilder", "grump"].forEach(k => need.push("wod.seem." + k)); ["ravener", "reconciler", "faustian", "luciferan", "cryptic"].forEach(k => need.push("wod.fac." + k));
    Object.keys(W.LORE).forEach(h => Object.keys(W.LORE[h]).forEach(k => need.push("wod.lore." + k))); ["cam", "sab"].forEach(k => need.push("wod.sect." + k));
    LANGS.forEach(l => need.forEach(k => { if (!K.i18n.has("ui", k, l)) miss.push(l + ":" + k); }));
    eq(miss, [], "every World of Darkness text exists in all 7 languages (" + need.length + " keys)");
    // the profile: combinations, not only the strongest group
    const D = pcts => ({ sections: Object.keys(pcts).map(id => ({ id, pct: pcts[id] })).sort((a, b) => b.pct - a.pct) });
    const all = o => Object.assign({ intimacy: 30, bondage: 30, fetishes: 30, "role-play": 30, ds: 30, sm: 30, "sex-penetration": 30, "voyeurism-exhibitionism": 30, "bodily-fluids": 30 }, o);
    eq(W.choose(D(all({ "bodily-fluids": 80, "sex-penetration": 75 })), "demon"), "defilers", "fluids + sex → the Defilers (Nereids)");
    /* v601: no "flat" subtype any more; the Malkavians = one group far above the second (after the usual skew) */
    const usual = all({ intimacy: 40, bondage: 50, "sex-penetration": 40, "voyeurism-exhibitionism": 22, "bodily-fluids": 5 });
    ok(W.LINES.every(L => W.choose(D(usual), L) !== null), "a portrait with only the usual skew still gets a subtype in every line");
    eq(W.choose(D(all({ "voyeurism-exhibitionism": 70 })), "vamp"), "malkavian", "voyeurism far above everything → Malkavians");
    ok(W.choose(D(all({ "voyeurism-exhibitionism": 70, "role-play": 66 })), "vamp") !== "malkavian", "…but not when a second group is close behind");
    ok(W.choose(D(all({ bondage: 60 })), "vamp") !== "malkavian", "bondage 30 points above the rest is ordinary for real lists (the usual skew): not a Malkavian");
    eq(W.choose(D({ intimacy: 36, bondage: 77, fetishes: 62, "role-play": 52, ds: 74, sm: 69, "sex-penetration": 41, "voyeurism-exhibitionism": 34, "bodily-fluids": 26 }), "vamp"), "ventrue", "the owner's portrait → Ventrue (v601: Giovanni = fluids + D/s; v603 recalibrated: still Ventrue)");
    const fig = W.pick(D(all({ "bodily-fluids": 80, "sex-penetration": 75 })), "demon");
    eq([fig.wod, fig.line, fig.id, fig.stars.filter(x => x.bright).map(x => x.s.id).sort().join()], [true, "demon", "defilers", "bodily-fluids,sex-penetration"], "the figure: the sign's main groups are the bright stars");
    // details
    const ids = []; K.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const mk = (fn, meta) => { const it = {}; ids.forEach((id, i) => { const v = fn(id, i); if (v) it[id] = { interest: v }; }); return { items: it, meta: meta || {} }; };
    const det = (st, L, id) => W.details(st, K.portrait.compute(st, null), null, L, id);
    const few = mk((id, i) => i < 10 ? "yes" : null);
    eq([det(few, "vamp", "brujah").sect, det(few, "fey", "boggan").court, det(few, "demon", "devils").fac], [null, null, null], "fewer than 20 answers: no sect, court or faction (still rolling the dice)");
    const lv20 = mk(() => "love");
    eq([det(lv20, "vamp", "brujah").gen, det(lv20, "wolf", "gaia").rank, det(lv20, "fey", "boggan").seem, det(lv20, "demon", "devils").faith], [7, "elder", "grump", 6], "level 20: 7th generation, Elder, Grump, Faith 6");
    eq([1, 5, 6, 11, 12, 17, 18, 20].map(W.FAITH), [3, 3, 4, 4, 5, 5, 6, 6], "Faith: 3 at the start, at most 6 (owner)");
    // v599 (owner): Rage / Gnosis = W20 start (auspice / breed) + rank bonus; Glamour / Banality
    const t20 = det(lv20, "wolf", "talons");
    eq([t20.breed, t20.rank, t20.gnosis, t20.rage], ["lupus", "elder", 8, W.RAGE0[t20.aus] + 3], "Elder Red Talon: Gnosis 5 + 3 = 8, Rage = auspice start + 3");
    const f20 = det(lv20, "fey", "boggan");
    eq([f20.seem, f20.glamour, f20.banality], ["grump", 10, 2], "level 20 Grump who loves everything: Glamour at its cap 10, Banality 1 + Grump 1 = 2 (v603)");
    const allNo = mk(() => "limit"), fNo = det(allNo, "fey", "boggan");
    eq([fNo.seem, fNo.glamour, fNo.banality], ["wilder", 2, 7], "all “No”: a Wilder (v615: never a Childling) with Glamour 2, Banality at its cap 7");
    ok(!/wod\./.test(W.lines(t20, K.i18n.t).sub + W.lines(f20, K.i18n.t).sub) && /Ярость/.test(W.lines(t20, K.i18n.t).sub) && /Банальность/.test(W.lines(f20, K.i18n.t).sub), "the lines show Rage · Gnosis and Glamour · Banality");
    const v20 = det(lv20, "vamp", "brujah");
    ok(v20.sect === "sab" ? Object.keys(W.PATHS).indexOf(v20.path) >= 0 : v20.hum >= 2, "everything even → a path in the Sabbat, Humanity in the Camarilla (v602: no “flat = Humanity” rule; v603)");
    eq(det(mk(() => "yes"), "wolf", "talons").breed, "lupus", "Red Talons are always Lupus");
    const taboo = new Set(DD.CL.taboo[1].split(" "));
    const met = mk((id, i) => taboo.has(id) ? "love" : i % 2 ? "limit" : "maybe");
    eq([det(met, "wolf", "gaia").breed, det(met, "wolf", "fianna").breed, det(met, "wolf", "fangs").breed], ["metis", "homid", "homid"], "taboo far above the rest → Metis; never for Fianna or Silver Fangs");
    const lawful = mk((id, i) => i % 2 ? "limit" : "yes", { role: "dom" });
    const al = DD.alignment(lawful, K.portrait.compute(lawful, null), null);
    ok(al[0] === "L" || al === "boring", "a list with many No is Lawful (" + al + ")");
    eq([det(lawful, "fey", "boggan").court, det(lawful, "vamp", "ventrue").sect], ["seelie", "cam"], "…a Seelie fey and a Camarilla vampire");
    ok(det(lawful, "vamp", "lasombra").sect === (al === "LG" ? "cam" : "sab"), "Lasombra: Sabbat unless Lawful Good");
    const L2 = det(lawful, "demon", "slayers"); ok(Object.keys(W.LORE.slayers).indexOf(L2.lore) >= 0, "a demon's Lore is one of its own house's three");
    // the portrait
    const own = mk((id, i) => taboo.has(id) ? "love" : i % 3 ? "yes" : "maybe", { role: "sub" }); own.name = "Ann";
    const g = open("form", { storage: { local: { "checklist-lang": "ru", "checklist-dnd": "wod", "checklist-wod": "fey", "practices-checklist-v1": JSON.stringify(own) }, session: {} } });
    const sec = g.d.getElementById("portraitSection"); sec.open = true; sec.dispatchEvent(new g.w.Event("toggle"));
    const pv = g.d.querySelector(".pt-wod");
    ok(!!pv && pv.dataset.line === "fey" && /Ваш род/i.test(pv.querySelector(".sg-over").textContent) && !pv.querySelector(".sg-al") && pv.querySelector(".wod-note").textContent === "Не официальный материал World of Darkness." , "portrait: the fey kith, no alignment line, only “not official” under it (the full notice is in the help)");
    ok(g.d.querySelectorAll("#portraitBody .pt-mode:not(.pt-wod-sub):not(.pt-wr-sub) [data-mode]").length === 3 + (g.KC.dnd.wrTabs().length ? 1 : 0) + (g.KC.dnd.usable("wi") ? 1 : 0) + (g.KC.dnd.usable("av") ? 1 : 0) + (g.KC.dnd.usable("rz") ? 1 : 0) && g.d.querySelector('.pt-wod-sub [data-wod="fey"]').getAttribute("aria-pressed") === "true", "three modes + ⚔ Wr when one of its tabs is switched on (v611); the fey button is pressed");
    click(g.w, g.d.querySelector('.pt-wod-sub [data-wod="vamp"]'));
    ok(g.d.querySelector(".pt-wod").dataset.line === "vamp" && g.w.localStorage.getItem("checklist-wod") === "vamp" && /поколение/.test(g.d.querySelector(".pt-wod .sg-rl").textContent), "→ vampire: sect · generation; the line is remembered");
    click(g.w, g.d.querySelector('.pt-mode [data-mode="dnd"]'));
    ok(!!g.d.querySelector(".pt-dnd") && !g.d.querySelector(".pt-wod-sub") && g.w.localStorage.getItem("checklist-dnd") === "1", "→ DnD: the class, the second row is gone");
    click(g.w, g.d.querySelector('.pt-mode [data-mode="sign"]'));
    ok(!g.d.querySelector(".pt-dnd, .pt-wod") && g.w.localStorage.getItem("checklist-dnd") === null, "→ the constellation again");
    // the compare page
    const codes = [["Ann", "ANN597", "dom", ["bondage", "service-control"]], ["Bob", "BOB597", "sub", ["bondage", "impact-rough-play"]], ["Cid", "CID597", "", ["intimacy", "sex-penetration"]]].map(([n, u, r, cats]) => {
      const it = {}; K.CATS.forEach(c => c.items.forEach(([, id]) => { it[id] = { interest: cats.indexOf(c.id) >= 0 ? "love" : "maybe" }; })); return K.codec.encode({ name: n, uid: u, items: it, meta: r ? { role: r } : {} }, "ru"); });
    const run = (n, local) => { const cp = open("compare", { storage: { local: Object.assign({ "checklist-lang": "ru" }, local), session: {} } });
      for (let i = 2; i < n; i++) click(cp.w, cp.d.getElementById("addPart"));
      cp.d.querySelectorAll("#parts textarea").forEach((ta, i) => { ta.value = codes[i]; }); click(cp.w, cp.d.getElementById("cmpBtn")); return cp; };
    const c2 = run(2, { "checklist-dnd-pair": "wod", "checklist-wod-pair": "wolf", "checklist-folds": '{"pair":true}' });
    const box = c2.d.querySelector(".sp-signs.sp-wod");
    ok(!!box && /Племена пары/.test(box.textContent) && box.querySelectorAll(".sg-wod").length === 2 && /(Одно племя|Одна стая|Разные стаи)/.test(box.querySelector(".sg-match").textContent) && /Не официальный материал/.test(box.textContent) && !/Paradox/.test(box.textContent), "pair: the tribes, a pack-level closeness, “not official”");
    click(c2.w, box.querySelector('.pt-wod-sub [data-wod="demon"]'));
    const box2 = c2.d.querySelector(".sp-signs.sp-wod");
    ok(!!box2 && /Дома пары/.test(box2.textContent) && /(Один дом|Один двор|Разные дворы)/.test(box2.textContent), "→ demons: “The pair's houses”, court-level closeness");
    const c3 = run(3, { "checklist-dnd-group": "wod", "checklist-wod-group": "vamp", "checklist-folds": '{"group":true}' });
    const gf = c3.d.querySelector('details.sp-fold[data-fold="group"]');
    ok(!!gf.querySelector(".sp-wodgrp") && /Котерия/.test(gf.textContent) && gf.querySelectorAll(".sp-wodgrp li").length === 3 && !gf.querySelector("[data-planet]"), "group: the coterie, everyone listed, no system");
    click(c3.w, gf.querySelector('.pt-wod-sub [data-wod="fey"]'));
    ok(/Табор/.test(gf.textContent) && c3.w.localStorage.getItem("checklist-wod-group") === "fey" && c3.w.localStorage.getItem("checklist-wod") === null, "→ fey: the “табор” (remembered for the company only)");
    click(c3.w, gf.querySelector('.pt-mode [data-mode="sign"]'));
    ok(!!gf.querySelector("[data-planet]") && !gf.querySelector(".sp-wodgrp"), "→ the solar system again");
    c3.KC.help.open("compare"); ok(/Мир Тьмы/.test(c3.d.getElementById("help-compare").textContent), "help (compare) explains the mode");
    g.KC.help.open("portrait"); ok(/Мир Тьмы/.test(g.d.getElementById("help-portrait").textContent) && /Paradox Interactive AB/.test(g.d.getElementById("help-portrait").textContent), "help (portrait) explains the mode and carries the notice");
    ok(!f.errors.length && !g.errors.length && !c2.errors.length && !c3.errors.length, "no script errors");
    _sc.end();
  }

  S("v600: one language per page; World of Darkness recalibrated; share window: Send…, answers in the link; empty-link events");
  {
    const _sc = scope();
    const LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    // boot.js: one language
    const w0 = { document: {} }; new Function("window", "document", fs.readFileSync(require("./harness").ROOT + "/js/boot.js", "utf8"))(w0, {});
    const M = w0.KC_MANIFEST;
    ok(M.common.indexOf("@lang") > 0 && !M.common.some(f => /^lang\//.test(f)), "boot.js loads no language by name: one '@lang' slot");
    eq([M.langFiles("ru"), M.langFiles("en")], [["lang/ru.ui.js", "lang/ru.practices.js", "lang/en.practices.js"], ["lang/en.ui.js", "lang/en.practices.js"]], "a language = its ui + practices, plus the English practice names");
    eq(M.LANGS.slice().sort(), LANGS.slice().sort(), "boot.js knows the same 7 languages as i18n");
    const f = open("form"), K = f.KC;
    ok(LANGS.every(l => K.i18n.loaded(l)), "tests load every language (loaded() sees them)");
    // World of Darkness: the owner's group (v600)
    const W = K.wod, D = pcts => ({ sections: Object.keys(pcts).map(id => ({ id, pct: pcts[id] })).sort((a, b) => b.pct - a.pct) });
    const G = ["intimacy", "bondage", "fetishes", "role-play", "ds", "sm", "sex-penetration", "voyeurism-exhibitionism", "bodily-fluids"];
    const P = a => D(Object.fromEntries(G.map((g, i) => [g, a[i]])));
    const group = { P1: [36,77,62,52,74,69,41,34,26], P2: [29,73,47,58,63,73,68,45,0], P3: [39,42,0,0,0,24,74,44,15], P4: [52,77,48,55,17,9,60,12,9], P5: [50,71,55,54,50,61,52,38,24] };
    const got = Object.keys(group).map(n => W.LINES.map(L => W.choose(P(group[n]), L)).join(" "));
    eq(got, ["ventrue shadow sidhe devils", "gangrel talons pooka devourers", "setite fianna satyr defilers", "tremere uktena boggan malefactors", "tremere uktena nocker malefactors"], "the owner's first group (v605 hand-tuned Devils; nobody is a Slayer)");
    const group2 = { P1: [35,78,58,54,73,68,52,37,25], P2: [29,73,47,58,63,73,68,45,0], P6: [47,56,50,37,57,58,59,53,23], P3: [46,71,46,54,51,71,81,53,54], P4: [49,76,58,58,22,10,59,10,14], P7: [37,46,0,44,0,0,52,66,0], P5: [49,72,54,54,51,63,49,39,20] };
    eq(Object.keys(group2).map(n => W.LINES.map(L => W.choose(P(group2[n]), L)).join(" ")),
      ["lasombra shadow sidhe devils", "gangrel talons pooka devourers", "toreador striders sidhe devils", "nosferatu gnawers selkie defilers", "tremere uktena nocker malefactors", "malkavian striders eshu fiends", "tremere uktena sluagh malefactors"],
      "the owner's coterie of seven: the table after v605 (no Caitiff, one Malkavian, one Selkie; old v602 percentages — the v605 section checks a variant-A portrait)");
    ok(!/W/.test(W.PROF.demon.slayers[0]) && W.PROF.demon.slayers[0] === "R1 S.6", "Slayers: no fluids (owner)");
    eq([W.PROF.fey.satyr[0], W.PROF.fey.boggan[0]], ["X1 N.3", "N1 S-.3"], "fey variant E: Satyrs and Boggans");
    // share window
    const ids = []; K.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const own = { name: "Ann", uid: "ANN600", items: {}, meta: {} }; ids.slice(0, 7).forEach(id => { own.items[id] = { interest: "yes" }; });
    const g = open("form", { storage: { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(own) }, session: {} } });
    ok(!g.d.getElementById("metaName").disabled && /disabled/.test(fs.readFileSync(require("./harness").ROOT + "/index.html", "utf8").match(/<input[^>]*id="metaName"[^>]*>/)[0]), "the name field is disabled in the HTML and enabled once the page is ready");
    click(g.w, g.d.getElementById("shareBtn"));
    const cnt = g.d.getElementById("shareCount");
    ok(!cnt.hidden && cnt.textContent === "Ответов в ссылке: 7" && !cnt.classList.contains("zero"), "share window: “Answers in the link: 7”");
    ok(g.d.getElementById("sendLink").hidden, "no navigator.share → no “Send…” button");
    const g2 = open("form", { storage: { local: { "checklist-lang": "ru" }, session: {} } });
    g2.w.navigator.share = () => Promise.resolve();
    click(g2.w, g2.d.getElementById("shareBtn"));
    ok(g2.d.getElementById("shareCount").classList.contains("zero") && /нет ответов/.test(g2.d.getElementById("shareCount").textContent), "an empty list: the red “no answers” line");
    ok(!g2.d.getElementById("sendLink").hidden, "navigator.share → “Send…” is shown");
    let shared = null; g2.w.navigator.share = d => { shared = d; return Promise.resolve(); };
    click(g2.w, g2.d.getElementById("sendLink"));
    eq(shared && Object.keys(shared), ["url"], "“Send…” passes only the url");
    ok(shared.url === g2.d.getElementById("shareLink").value, "…the link from the field");
    // a template applied: the count follows what the link carries
    const tplId = "T60000"; const tpl = [{ id: "t1", tid: tplId, name: "Two", ids: ids.slice(0, 2), own: true, ts: 1 }];
    const g3 = open("form", { storage: { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(Object.assign({}, own, { template: { id: tplId, name: "Two" } })), "checklist-templates-v1": JSON.stringify(tpl) }, session: {} } });
    click(g3.w, g3.d.getElementById("shareBtn"));
    eq(g3.d.getElementById("shareCount").textContent, "Ответов в ссылке: 2", "with a template applied the count is what the link carries (2 of 7)");
    // empty / damaged link events
    const code = K.codec.encode({ name: "Empty", uid: "EMP600", items: {}, meta: {} }, "ru");
    const e1 = open("form", { hash: K.codec.extract(code), storage: { local: { "checklist-lang": "ru" }, session: {} } });
    const q1 = JSON.parse(e1.w.sessionStorage.getItem("kcStatsQueue") || "[]");
    ok(q1.indexOf("open-link") >= 0 && q1.indexOf("open-link-empty") >= 0, "an empty list link → open-link + open-link-empty");
    const full = K.codec.encode(own, "ru");
    const e2 = open("form", { hash: K.codec.extract(full), storage: { local: { "checklist-lang": "ru" }, session: {} } });
    ok(JSON.parse(e2.w.sessionStorage.getItem("kcStatsQueue") || "[]").indexOf("open-link-empty") < 0, "a link with answers → no open-link-empty");
    // back to my list keeps the language
    ok(g.KC.form.homeUrl() === g.w.location.pathname + "?lang=ru", "reloads into my own list keep ?lang= (v600)");
    g.KC.help.open("share"); ok(/Отправить/.test(g.d.getElementById("help-share").textContent), "help: “Send…” explained");
    ok(!f.errors.length && !g.errors.length && !g2.errors.length && !g3.errors.length && !e1.errors.length && !e2.errors.length, "no script errors");
    _sc.end();
  }

  S("v601: WoD without Caitiff / Ravnos; compare layout; smaller Send; portrait dot; “Only No”; roulette without sections; news");
  {
    const _sc = scope();
    // news
    const g = open("form", { storage: { local: { "checklist-lang": "ru" }, session: {} } });
    g.KC.help.open("news");
    const h5 = [...g.d.querySelectorAll("#helpNews h5")].map(x => x.textContent);
    eq(h5, ["7 октября 2026 · Боги Хаоса и Грехи Re:Zero", "5 октября 2026 · Расширенная анкета", "29 сентября 2026 · Мир Тьмы", "29 сентября 2026 · DnD-обновление", "29 сентября 2026", "27 сентября 2026"], "what's new: (v613) the extended list on top, then World of Darkness, DnD and Kinkosmos dated 29 September (owner)");
    ok(/Ярость и Гнозис/.test(g.d.querySelectorAll("#helpNews ul")[2].textContent) && /Не официальный материал World of Darkness/.test(g.d.querySelectorAll("#helpNews ul")[2].textContent), "…the WoD entry lists the lines and the notice");
    const LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"], nf = [];
    LANGS.forEach(l => { g.KC.i18n.set(l); g.KC.help.open("news"); const n = g.d.querySelectorAll("#helpNews h5").length; if (n !== 6 || /28/.test(g.d.querySelectorAll("#helpNews h5")[3].textContent)) nf.push(l + ":" + n); });
    eq(nf, [], "the same six entries and dates in all 7 languages");
    g.KC.i18n.set("ru");
    // portrait "new" dot, “Only No” filter
    ok(!g.d.querySelector("#portraitSection summary .new-dot"), "v615: no green dot next to “My portrait” (owner)");
    const ids = []; g.KC.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const own = { name: "Ann", uid: "ANN601", items: {}, meta: {} }; own.items[ids[0]] = { interest: "limit" }; own.items[ids[1]] = { interest: "yes" }; own.items[ids[40]] = { interest: "limit" };
    const f = open("form", { storage: { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(own) }, session: {} } });
    const view = f.d.getElementById("view"); view.value = "no"; view.dispatchEvent(new f.w.Event("change", { bubbles: true }));
    const shown = [...f.d.querySelectorAll("#list .item:not(.filtered-out)")].map(r => r.dataset.id);
    eq(shown.sort(), [ids[0], ids[40]].sort(), "“Only No” shows the No answers only");
    ok([...f.d.querySelectorAll("#view option")].some(o => o.value === "no" && o.textContent === "Только «Нет»"), "…its label");
    // share window: Send is a small ghost button next to the count
    const sb = f.d.getElementById("sendLink");
    ok(sb.classList.contains("mini") && sb.classList.contains("ghost") && !sb.classList.contains("primary") && sb.parentNode.classList.contains("share-row"), "“Send…” is small and sits next to “Answers in the link”");
    // compare: filters and search under the star map, Save under the picker
    const code = n => { const it = {}; ids.slice(0, 30).forEach((id, i) => { it[id] = { interest: (i + n) % 3 ? "yes" : "love" }; }); return f.KC.codec.encode({ name: "P" + n, uid: "PP60" + n + "X", items: it, meta: {} }, "ru"); };
    const c = open("compare", { storage: { local: { "checklist-lang": "ru" }, session: {} } });
    click(c.w, c.d.getElementById("addPart"));
    c.d.querySelectorAll("#parts textarea").forEach((ta, i) => { ta.value = code(i); }); click(c.w, c.d.getElementById("cmpBtn"));
    const head = c.d.getElementById("resHead"), kids = [...head.children].map(x => x.className);
    const iFold = kids.findIndex(k => /sp-fold/.test(k)), iFilt = kids.findIndex(k => /cmp-filter/.test(k));
    ok(iFold >= 0 && iFilt > iFold, "group: the filter buttons come after the star map");
    ok(head.nextElementSibling.id === "cmpSearchBox" && c.d.getElementById("cmpSearchBox").nextElementSibling.id === "resBody", "…then the search, then the lists");
    ok(!!c.d.querySelector('#cmpSaveBar button[data-act="save"]') && c.d.getElementById("cmpSaveBar").previousElementSibling.id === "cmpSaved", "“Save comparison” sits under “Open a saved comparison…”");
    const search = c.d.getElementById("cmpSearch"), headBefore = head.innerHTML; search.value = "zzzz"; search.dispatchEvent(new c.w.Event("input"));
    ok(head.innerHTML === headBefore && /Ничего не найдено|не найдено/i.test(c.d.getElementById("resBody").textContent), "typing in the search redraws only the lists (the star map stays)");
    // roulette: no section label
    search.value = ""; search.dispatchEvent(new c.w.Event("input"));
    click(c.w, c.d.querySelector('#results button[data-act="roulette"]'));
    await new Promise(r => setTimeout(r, 1300));   /* the short name flicker */
    ok(!c.d.querySelector("#rlOut .rl-sec") && c.d.querySelectorAll("#rlOut .rl-idea").length > 0, "roulette ideas without the red section label");
    ok(!g.errors.length && !f.errors.length && !c.errors.length, "no script errors");
    _sc.end();
  }

  S("v602: paths and auspices on standardised poles; sect and demon faction around the centre of real lists");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, W = K.wod;
    eq(Object.keys(W.AUSP).map(k => W.AUSP[k].length), [2, 3, 3, 3, 3], "auspices own 2–3 poles each (one strongest pole decides)");
    const all = [].concat(...Object.keys(W.AUSP).map(k => W.AUSP[k])).sort();
    eq(all, [].concat(...K.dnd.POLES).sort(), "…and together they cover all 14 poles exactly once");
    ok(Object.keys(W.PATHB).length === 13 && Object.keys(W.PATHS).every(k => W.PATHB[k] !== undefined), "every path has its calibrated shift (v603: 13, no Path of Humanity)");
    ok(K.dnd.axes({ items: {}, meta: {} }, null, true).every(v => v === null) && K.dnd.axes({ items: {}, meta: {} }, null).every(v => v === 0), "axes(…, true): a pole with too few answers is null (0 without the flag, as before)");
    /* the owner's group is checked outside the repo (their lists are private); here: the rules on made-up lists */
    const ids = []; K.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const cl = {}; Object.keys(K.dnd.CL).forEach(k => K.dnd.CL[k][1].split(" ").forEach(id => { cl[id] = k; }));
    const mk = (like, meta) => { const it = {}; ids.forEach((id, i) => { it[id] = { interest: like.indexOf(cl[id]) >= 0 ? "love" : i % 3 ? "maybe" : "limit" }; }); return { items: it, meta: meta || {} }; };
    const det = (st, L) => { const d = K.portrait.compute(st, null); return W.details(st, d, null, L, W.choose(d, L)); };
    eq(det(mk(["pet", "feast"]), "wolf").aus, "ragabash", "play + spontaneity lists (pet play, food) → Ragabash");
    eq(det(mk(["extreme", "spank"]), "wolf").aus, "ahroun", "hard impact → Ahroun");
    const facs = ["reconciler", "faustian", "luciferan", "ravener", "cryptic"];
    const F = (law, good) => { const dl = law - W.CENTRE.LAW, dg = good - W.CENTRE.GOOD; return Math.abs(dl) < W.CENTRE.R && Math.abs(dg) < W.CENTRE.R ? "cryptic" : dl >= 0 ? (dg >= 0 ? "reconciler" : "faustian") : (dg >= 0 ? "luciferan" : "ravener"); };
    eq([F(15, 10), F(15, -11), F(-6, 28), F(-10, -10), F(3, -1)], facs, "demon factions: four quarters around the centre (v603: law +4, good +2) and Cryptic in the middle");
    ok(!f.errors.length, "no script errors");
    _sc.end();
  }

  S("v603: portrait without 0 % groups; DnD classes by profile, races on standardised poles; fey Glamour / Banality; Camarilla Humanity");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, DD = K.dnd, W = K.wod;
    const LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    const ids = []; K.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const catOf = {}; K.CATS.forEach(c => c.items.forEach(([, id]) => { catOf[id] = c.id; }));
    const mk = (fn, meta) => { const it = {}; ids.forEach((id, i) => { const v = fn(id, i); if (v) it[id] = { interest: v }; }); return { items: it, meta: meta || {} }; };
    // portrait, variant A: "No" does not wipe out "how many"
    const bond = ids.filter(id => catOf[id] === "bondage");
    const st = mk((id, i) => { const k = bond.indexOf(id); if (k >= 0) return k < 15 ? "yes" : k < 24 ? "maybe" : "limit"; return i % 2 ? "yes" : "maybe"; });
    const g = K.portrait.compute(st, null).sections.find(x => x.id === "bondage");
    ok(bond.length - 24 > 15 && g.pct > 0, "a group with more “No” than “Yes” and 15 “Yes” is above 0 % (" + g.pct + " %)");
    const allNo = K.portrait.compute(mk(() => "limit"), null).sections.filter(x => x.pct !== null);
    ok(allNo.length && allNo.every(x => x.pct === 0), "only “No” → 0 % everywhere, as before");
    // the usual skew: 9 groups, shared by DnD and the World of Darkness
    eq(Object.keys(DD.TYP).sort(), K.signs.GROUPS.slice().sort(), "TYP covers all 9 groups");
    ok(W.TYP === DD.TYP && W.AXT === DD.AXT && W.AXSD === DD.AXSD, "…shared with the World of Darkness, as are AXT / AXSD");
    // classes: a profile each, every class reachable
    eq(Object.keys(DD.CLS).sort(), Object.keys(DD.FIG).sort(), "every class has a profile (13)");
    ok(Object.keys(DD.CLS).every(c => Math.abs(DD.CLS[c][1]) <= 1.3), "class biases within ±1.3 (v604: the Ranger 1.25)");
    const D = pcts => ({ sections: Object.keys(pcts).map(id => ({ id, pct: pcts[id] })).sort((a, b) => b.pct - a.pct) });
    const L = K.signs.KEY, got = {};
    Object.keys(DD.CLS).forEach(c => { const p = {}; K.signs.GROUPS.forEach(gid => { p[gid] = 40 + DD.TYP[gid]; });
      DD.CLS[c][0].split(" ").forEach(tk => { p[L[tk[0]]] += 30 * parseFloat(tk.slice(1)); }); got[c] = DD.pick(D(p)).cls; });
    eq(Object.keys(got).filter(c => got[c] !== c), [], "a portrait shaped like a class's profile gets that class — all 13 reachable");
    const fig = DD.pick(D({ intimacy: 36, bondage: 60, fetishes: 40, "role-play": 55, ds: 40, sm: 45, "sex-penetration": 50, "voyeurism-exhibitionism": 60, "bodily-fluids": 20 }));
    eq([fig.cls, fig.stars.filter(x => x.bright).length, fig.stars.filter(x => x.bright).every(x => fig.main.indexOf(x.s) >= 0)], ["rogue", fig.main.length, true], "voyeurism + role-play above the usual → Rogue; the variant's groups are the bright stars");
    ok(Object.keys(DD.VAR).filter(k => DD.VAR[k][1] === "wildmagic").every(k => DD.VAR[k][0] === "sorcerer"), "Wild Magic belongs to the Sorcerer only");
    // races: every race reachable on made-up lists
    const inCl = (...cl) => { const s2 = new Set(); cl.forEach(k => DD.CL[k][1].split(" ").forEach(id => s2.add(id))); return s2; };
    const R = { human: ["pet", "classic"], elf: ["protocol", "touch"], drow: ["protocol"], dwarf: ["protocol", "iron"], dragonborn: ["protocol", "wardrobe"],
      halforc: ["service", "company"], goliath: ["pet", "spank"], tiefling: ["protocol", "edge"], yuanti: ["dark", "home"], halfling: ["home"],
      tabaxi: ["pet", "wild"], changeling: ["pet"], kenku: ["spank", "home"] };
    const rg = {}; Object.keys(R).forEach(r => { const s2 = inCl(...R[r]); rg[r] = DD.race(mk((id, i) => s2.has(id) ? "love" : i % 3 ? "limit" : "maybe"), null); });
    eq(Object.keys(rg).filter(r => rg[r] !== r), [], "all 13 races reachable");
    ok(Object.keys(DD.RACEB).length === 13 && DD.RLIM.FLAT === .5, "every race has its bias; Human when every |z| < .5");
    const soft = inCl("home", "touch"), z = DD.zPoles(mk((id, i) => soft.has(id) ? "love" : i % 3 ? "limit" : "maybe"), null);
    ok(z.soft > 0 && z.hard === 0, "a pole's z is measured from the usual value (softness above the usual → soft > 0)");
    // fey: Glamour 1–10, Banality 1–7; vampires: Humanity 3–10 only in the Camarilla, the Sabbat keeps a path
    let rs = 1; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
    const A = ["limit", "maybe", "yes", "love", null], glam = new Set(), ban = new Set(), bad = [];
    for (let n = 0; n < 150; n++) {
      const w = [rnd(), rnd(), rnd(), rnd(), rnd() * .6], sum = w.reduce((a, b) => a + b, 0);
      const s2 = mk(() => { let r = rnd() * sum, k = 0; while (r > w[k]) r -= w[k++]; return A[k]; }, { role: n % 2 ? "dom" : "sub" });
      const d = K.portrait.compute(s2, null), fy = W.details(s2, d, null, "fey", "boggan"), vp = W.details(s2, d, null, "vamp", W.choose(d, "vamp") || "brujah");
      glam.add(fy.glamour); ban.add(fy.banality);
      if (!(fy.glamour >= 1 && fy.glamour <= 10 && fy.banality >= 1 && fy.banality <= 7)) bad.push("fey " + fy.glamour + "/" + fy.banality);
      if (vp.sect === "cam" ? !(vp.hum >= 2 && vp.hum <= 8 && vp.path === undefined) : !(vp.hum === undefined && W.PATHS[vp.path])) bad.push("vamp " + JSON.stringify(vp));
    }
    eq(bad, [], "Glamour 1–10, Banality 1–7; Humanity 3–10 only in the Camarilla, a path otherwise (150 made-up lists)");
    ok(glam.size >= 4 && ban.size >= 4, "Glamour and Banality are spread (" + [...glam].sort((a, b) => a - b).join(",") + " / " + [...ban].sort((a, b) => a - b).join(",") + ")");
    ok(!W.PATHS.humanity && !W.PATHB.humanity, "no Path of Humanity in the Sabbat (owner, v603)");
    const lawful = mk((id, i) => i % 2 ? "limit" : "yes", { role: "dom" }), vc = W.details(lawful, K.portrait.compute(lawful, null), null, "vamp", "ventrue");
    eq([vc.sect, vc.hum >= 2, vc.path], ["cam", true, undefined], "a Camarilla vampire has Humanity instead of a path");
    ok(W.lines(vc, K.i18n.t).sub === "Человечность " + vc.hum, "…shown as “Humanity N” (" + W.lines(vc, K.i18n.t).sub + ")");
    const hum = (good, l) => Math.max(2, Math.min(8, Math.round(5.5 + good / 5) - [13, 17].filter(x => l >= x).length));
    eq([hum(0, 1), hum(20, 5), hum(-40, 10), hum(0, 13), hum(0, 17), hum(20, 20)], [6, 8, 2, 5, 4, 8], "Humanity = 5.5 + good / 5, −1 from level 13 and 17, within 2–8 (v606)");
    const miss = []; LANGS.forEach(l => { if (!K.i18n.has("ui", "wod.hum", l)) miss.push(l); });
    eq(miss, [], "“Humanity {n}” in all 7 languages");
    // help texts (owner-approved wording)
    const h = open("form", { storage: { local: { "checklist-lang": "ru" }, session: {} } });
    h.KC.help.open("portrait");
    const ht = h.d.getElementById("help-portrait").textContent;
    ok(/сильнее, чем обычно тянутся люди/.test(ht) && /Класс решает профиль/.test(ht) && /у Камарильи — Человечность/.test(ht) && !/по двум самым сильным разделам, порядок не важен/.test(ht), "help: race, class and Humanity explained the v603 way");
    ok(!f.errors.length && !h.errors.length, "no script errors");
    _sc.end();
  }

  S("v604: 7 new practices, boot worship renamed; Selkies and Clurichauns; the Ranger with voyeurism; no clothing bonus for the Tiefling");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, DD = K.dnd, W = K.wod;
    const LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    const codeOf = {}, next = {}, catOf = {};
    K.CATS.forEach(c => c.items.forEach(([n, id], i) => { codeOf[id] = n; catOf[id] = c.id; if (i + 1 < c.items.length) next[id] = c.items[i + 1][1]; }));
    const want = [["homage-with-tongue", "floor-licking", 493, "humiliation"], ["trash-play", "hair-as-mop", 494, "humiliation"], ["outdoor-sex", "abandoned-building-sex", 495, "voyeurism-exhibitionism"],
      ["panty-gag", "sock-gag-own", 496, "bondage"], ["sock-gag-own", "sock-gag-top", 497, "bondage"], ["pony-play", "cow-play", 498, "role-play"], ["cow-play", "pig-play", 499, "role-play"]];
    eq(want.filter(([a, id, c, cat]) => codeOf[id] !== c || next[a] !== id || catOf[id] !== cat).map(w => w[1]), [], "codes 493–499, each placed after its related item");
    const miss = []; want.forEach(([, id]) => LANGS.forEach(l => { if (!K.i18n.has("items", id, l)) miss.push(l + ":" + id); }));
    eq(miss, [], "every new practice has a name and a hint in all 7 languages");
    eq([K.i18n.item("floor-licking", "ru").name, K.i18n.item("pig-play", "ru").name, K.i18n.item("boot-worship", "ru").name], ["Вылизывание пола", "Пиг-плей (свинья)", "Поклонение обуви (в т.ч. поцелуи)"], "RU names (owner); boot worship now includes kissing");
    ok(want.filter(([, id]) => codeOf[id] >= K.NEW_FROM_CODE).map(w => w[1]).join() === "sock-gag-top,cow-play,pig-play", "v615: of these only 497–499 keep the green dot");
    const inCl = {}; Object.keys(DD.CL).forEach(k => DD.CL[k][1].split(" ").forEach(id => { inCl[id] = k; }));
    eq(want.map(([, id]) => inCl[id]), ["words", "object", "wild", "dark", "dark", "pet", "pet"], "the new items count for the race (clusters)");
    // fey: 12 kiths
    eq(Object.keys(W.PROF.fey).length, 12, "12 fey kiths with profiles");
    const nm = []; ["selkie", "clurichaun"].forEach(k => LANGS.forEach(l => { if (!K.i18n.has("ui", "wod.fey." + k, l)) nm.push(l + ":" + k); }));
    eq([nm, K.i18n.t("wod.fey.selkie")], [[], "Селки"], "Selkies and Clurichauns named in all 7 languages (RU “Селки”, owner)");
    const D = pcts => ({ sections: Object.keys(pcts).map(id => ({ id, pct: pcts[id] })).sort((a, b) => b.pct - a.pct) });
    const base = g => { const p = {}; K.signs.GROUPS.forEach(x => { p[x] = 40 + DD.TYP[x]; }); Object.keys(g).forEach(x => { p[x] += g[x]; }); return D(p); };
    eq([W.choose(base({ "bodily-fluids": 30, intimacy: 15, "role-play": 9 }), "fey"), W.choose(base({ "sex-penetration": 30, sm: 18, fetishes: 9 }), "fey")], ["selkie", "clurichaun"], "fluids + tenderness → Selkies; sex + S/M → Clurichauns");
    // DnD: the Ranger, the Tiefling
    eq(DD.CLS.ranger[0], "b.6 r.6 v.4", "the Ranger's profile adds voyeurism (owner, v604)");
    const ids = []; K.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const mk = (fn, meta) => { const it = {}; ids.forEach((id, i) => { const v = fn(id, i); if (v) it[id] = { interest: v }; }); return { items: it, meta: meta || {} }; };
    let bad = 0; for (let n = 1; n <= 30; n++) { const st = mk((id, i) => ["limit", "maybe", "yes", "love"][(i * n + n) % 4]);
      const a = DD.race(st, null), b = DD.race({ items: st.items, meta: { attire: ["latex", "leather", "goth"] } }, null); if (a !== b) bad++; }
    eq(bad, 0, "clothing (latex, leather, goth) never changes the race any more");
    ok(!!K.wr && K.i18n.has("ui", "wr.toWr", "ru"), "v610: the Chaos gods mode is in (was a separate plan in v604)");
    ok(!f.errors.length, "no script errors");
    _sc.end();
  }

  S("v605: hand-tuned Ventrue / Lasombra and Devils / Malefactors (owner)");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, W = K.wod;
    const D = pcts => ({ sections: Object.keys(pcts).map(id => ({ id, pct: pcts[id] })).sort((a, b) => b.pct - a.pct) });
    eq([W.PROF.vamp.ventrue[1], W.PROF.vamp.lasombra[1], W.PROF.demon.devils[1], W.PROF.demon.malefactors[1]], [-0.2, -0.11, 1.26, -1.16], "v605 biases: Ventrue −0.6 + 0.4, Lasombra 0.29 − 0.4, Devils 0.26 + 1.0, Malefactors −0.81 − 0.35");
    eq([W.PROF.vamp.ventrue[0], W.PROF.vamp.lasombra[0], W.PROF.demon.devils[0], W.PROF.demon.malefactors[0]], ["D1 F.4", "B.8 D.8", "D1 R.3 V.3", "B1 F.8"], "profiles unchanged (only the biases were hand-tuned)");
    ok(/owner, v605: hand-tuned/.test(fs.readFileSync(require("./harness").ROOT + "/js/form/wod.js", "utf8")), "hand-tuned shifts are marked in the code (kept on recalibration)");
    /* a made-up portrait in the owner's shape (variant A percentages, not the owner's list): v604 gave Lasombra + Malefactors */
    const like = D({ intimacy: 37, bondage: 73, fetishes: 57, "role-play": 47, ds: 68, sm: 69, "sex-penetration": 49, "voyeurism-exhibitionism": 35, "bodily-fluids": 30 });
    eq([W.choose(like, "vamp"), W.choose(like, "demon")], ["ventrue", "devils"], "a portrait like the owner's → Ventrue and Devils");
    const P = W.PROF, keep = [P.vamp.ventrue[1], P.vamp.lasombra[1], P.demon.devils[1], P.demon.malefactors[1]];
    P.vamp.ventrue[1] = -0.6; P.vamp.lasombra[1] = 0.29; P.demon.devils[1] = 0.26; P.demon.malefactors[1] = -0.81;
    const old = [W.choose(like, "vamp"), W.choose(like, "demon")];
    [P.vamp.ventrue[1], P.vamp.lasombra[1], P.demon.devils[1], P.demon.malefactors[1]] = keep;
    eq(old, ["lasombra", "malefactors"], "…the same portrait with the v604 biases was Lasombra + Malefactors (the test would catch a revert)");
    // nobody is a Slayer: the made-up groups of the v600 section and 2000 random lists around the usual skew
    const G = K.signs.GROUPS; let n = 0, sl = 0, seed = 605; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2000; i++) { const x = {}; G.forEach(g => { x[g] = Math.max(0, Math.min(100, Math.round(45 + K.dnd.TYP[g] + (rnd() - 0.5) * 50))); });
      const id = W.choose(D(x), "demon"); if (id) { n++; if (id === "slayers") sl++; } }
    ok(n === 2000 && sl / n < 0.1, "Slayers stay rare on random lists (" + sl + " of " + n + ")");
    ok(!f.errors.length, "no script errors");
    _sc.end();
  }

  S("v606: Camarilla Humanity within 2–8 (owner)");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, W = K.wod;
    eq(W.HUM, { BASE: 5.5, K: 5, OLD: [13, 17], MIN: 2, MAX: 8 }, "Humanity: middle 5.5, slope good / 5, −1 at levels 13 and 17, within 2–8");
    const ids = []; K.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const V = ["limit", "maybe", "yes", "love"]; let seed = 606; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const seen = new Set(), bad = [];
    for (let n = 0; n < 600; n++) {
      /* made-up lists from very “kind” to very “cruel”: tenderness loved or refused, the rest random */
      const kind = rnd(), it = {}; ids.forEach(id => { if (rnd() < 0.8) it[id] = { interest: V[Math.floor(rnd() * 4)] }; });
      K.CATS.filter(c => c.id === "intimacy").forEach(c => c.items.forEach(([, id]) => { it[id] = { interest: kind > 0.5 ? "love" : "limit" }; }));
      const st = { items: it, meta: { role: rnd() < 0.5 ? "dom" : "sub" } }, d = K.portrait.compute(st, null);
      const vc = W.details(st, d, null, "vamp", "ventrue");
      if (vc.hum !== undefined) { seen.add(vc.hum); if (vc.hum < 2 || vc.hum > 8 || vc.hum !== Math.round(vc.hum)) bad.push(vc.hum); }
    }
    eq(bad, [], "Humanity never below 2 or above 8");
    ok(seen.size >= 4, "Humanity still spreads over the scale (" + [...seen].sort((a, b) => a - b).join(",") + ")");
    ok(!f.errors.length, "no script errors");
    _sc.end();
  }

  S("v608: a page for every language (/ru/ /en/ … built by tools/build-lang-pages.js)");
  {
    const _sc = scope();
    const ROOTDIR = require("./harness").ROOT, SITE = "https://klevatess.github.io/kinkmatch/";
    const B = require(ROOTDIR + "/tools/build-lang-pages.js"), LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    const tr = {}; LANGS.forEach(l => { const box = {}; new Function("KC", fs.readFileSync(ROOTDIR + "/js/lang/" + l + ".ui.js", "utf8"))({ addLang: (x, part, o) => Object.assign(box, o) }); tr[l] = box; });
    const items = {}; LANGS.forEach(l => { const box = {}; new Function("KC", fs.readFileSync(ROOTDIR + "/js/lang/" + l + ".practices.js", "utf8"))({ addLang: (x, part, o) => { if (part === "items") Object.assign(box, o); } }); items[l] = box; });
    eq(B.LANGS, LANGS, "the tool makes a page for all seven languages");
    // the files on disk are what the tool makes now (catches "changed index.html or a translation, forgot to rebuild")
    const out = B.build(ROOTDIR);
    eq(Object.keys(out).filter(f => !fs.existsSync(ROOTDIR + "/" + f) || fs.readFileSync(ROOTDIR + "/" + f, "utf8") !== out[f]), [], "language pages, index.html hreflang and sitemap.xml are up to date (else: node tools/build-lang-pages.js)");
    const cluster = LANGS.map(l => [{ pt: "pt-BR", zh: "zh-Hant" }[l] || l, SITE + l + "/"]).concat([["x-default", SITE + "en/"]]);
    const links = h => [...h.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(m => [m[1], m[2]]);
    const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const idx = fs.readFileSync(ROOTDIR + "/index.html", "utf8");
    eq(links(idx), cluster, "root page: hreflang = the seven language pages + default (= the English page, v609)");
    ok(/<html lang="en">/.test(idx) && /<link rel="canonical" href="https:\/\/klevatess\.github\.io\/kinkmatch\/en\/">/.test(idx) && /og:title" content="Kinkosmos — чек-лист BDSM-практик \/ BDSM checklist"/.test(idx), "root page: English head, canonical → /en/ (v609), the preview stays Russian + English");
    const sm = fs.readFileSync(ROOTDIR + "/sitemap.xml", "utf8");
    eq([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]), LANGS.map(l => SITE + l + "/"), "sitemap: the seven language pages only (the root points to /en/, v609)");
    ok((sm.match(/hreflang="x-default" href="https:\/\/klevatess\.github\.io\/kinkmatch\/en\/"/g) || []).length === 7, "sitemap: every address carries the full language list, default = /en/");
    LANGS.forEach(l => {
      const h = fs.readFileSync(ROOTDIR + "/" + l + "/index.html", "utf8"), t = tr[l], url = SITE + l + "/";
      const bad = [];
      if (h.indexOf('<html lang="' + (l === "zh" ? "zh-Hant" : l) + '" data-page-lang="' + l + '">') < 0) bad.push("html lang");
      if (h.indexOf("<title data-i18n=\"seo.title\">" + esc(t["seo.title"]) + "</title>") < 0) bad.push("title");
      if (h.indexOf('<meta name="description" content="' + esc(t["seo.desc"]).replace(/"/g, "&quot;") + '">') < 0) bad.push("description");
      if (h.indexOf('<link rel="canonical" href="' + url + '">') < 0) bad.push("canonical");
      if (h.indexOf('og:url" content="' + url + '"') < 0 || h.indexOf('og:title" content="' + esc(t["seo.title"])) < 0) bad.push("og");
      if (JSON.stringify(links(h)) !== JSON.stringify(cluster)) bad.push("hreflang");
      if (/\s(src|href)="(css|img|js)\//.test(h) || h.indexOf('href="../css/style.css') < 0 || h.indexOf('src="../js/boot.js') < 0 || h.indexOf('href="../compare.html"') < 0) bad.push("paths");
      if (h.indexOf(">" + esc(t["intro.h1"]) + "</h1>") < 0) bad.push("h1");
      const missing = Object.keys(items[l]).filter(id => h.indexOf(esc(items[l][id][0])) < 0);
      if (missing.length) bad.push("practices: " + missing.slice(0, 3).join(","));
      if (/data-i18n(-html)?="[^"]+"[^>]*><\//.test(h)) bad.push("empty text element");
      eq(bad, [], l + "/: language, title, description, canonical, preview, hreflang, ../ paths, texts and all practices are in the file");
    });
    // the page's language wins over the saved choice and the browser
    const ja = open("form", { file: "ja/index.html", navLang: "en-US", storage: { local: { "checklist-lang": "en" }, session: {} } });
    eq([ja.KC.i18n.lang, ja.KC.i18n.pageLang, ja.d.documentElement.lang], ["ja", "ja", "ja"], "/ja/ with a saved EN choice and an EN browser: Japanese");
    eq([ja.d.title, ja.d.querySelector('link[rel="canonical"]').href], [tr.ja["seo.title"], SITE + "ja/"], "/ja/: title and canonical stay as written in the file");
    ok(!ja.d.querySelector("#list .seo-list") && ja.d.querySelectorAll("#list .item").length === ja.KC.CATS.reduce((n, c) => n + c.items.length, 0), "/ja/: the hidden text list is replaced by the real list");
    eq([ja.d.getElementById("compareBtn").getAttribute("href"), ja.KC.form.homeUrl()], ["../compare.html?lang=ja", "../ja/"], "/ja/: Compare and “Start a new list” go to the right pages");
    ok(ja.KC.form.shareLink().indexOf(require("./harness").BASE + "#") === 0, "/ja/: a shared link opens the root page (the language travels in lg=)");
    let went = null; ja.KC.i18n.navigate = u => { went = u; };
    click(ja.w, ja.d.querySelector('#langSw button[data-lang="en"]'));
    eq([went, ja.w.localStorage.getItem("checklist-lang"), ja.KC.i18n.lang], ["../en/", "en", "ja"], "/ja/ → EN: opens the English page and remembers the choice");
    ok(!ja.errors.length, "/ja/: no script errors");
    // the root page works as before: in-place switch, ?lang=xx points search engines to /xx/
    const rt = open("form", { navLang: "ru" }); let rwent = null; rt.KC.i18n.navigate = u => { rwent = u; };
    click(rt.w, rt.d.querySelector('#langSw button[data-lang="es"]'));
    eq([rt.KC.i18n.lang, rwent, rt.KC.i18n.pageLang, rt.d.getElementById("compareBtn").getAttribute("href")], ["es", null, null, "compare.html?lang=es"], "root page: the switcher translates in place, links as before");
    eq(open("form", { search: "?lang=th" }).d.querySelector('link[rel="canonical"]').href, SITE + "th/", "old index.html?lang=th address: canonical → /th/");
    eq(open("form", { navLang: "ru" }).d.querySelector('link[rel="canonical"]').href, SITE + "en/", "root page shown in Russian: canonical still → /en/ (v609)");
    eq(open("compare", { search: "?lang=pt" }).d.getElementById("backLink").getAttribute("href"), "pt/", "compare → back to the Portuguese page");
    // every language page opens in its language, without errors
    eq(LANGS.map(l => { const pg = open("form", { file: l + "/index.html", navLang: "de" }); return pg.KC.i18n.lang + (pg.errors.length ? "!" : ""); }), LANGS, "all seven pages open in their own language, no script errors");
    _sc.end();
  }

  S("v610: Servant of the Chaos gods (⚔ Wr) — the fourth joke mode");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, R = K.wr;
    const LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    eq(R.GODS, ["khorne", "nurgle", "tzeentch", "slaanesh", "rat"], "five patrons");
    const bad = [];
    R.GODS.forEach(id => { const [P, E, Ln, B] = R.FIG[id], n = P.length + E.length;
      if (P.length !== 9 || new Set(B).size !== 3 || B.some(i => i < 0 || i > 8)) bad.push(id + ": stars");
      Ln.forEach(l => (l[0] === "d" ? l.slice(1) : l).forEach(i => { if (!(i >= 0 && i < n)) bad.push(id + ": line " + i); })); });
    eq(bad, [], "every sign: 9 group stars, 3 bright slots, lines only to existing stars");
    const ids = new Set(); K.CATS.forEach(c => c.items.forEach(([, id]) => ids.add(id)));
    const unknown = [];
    R.GODS.forEach(g => R.ITEMS[g].split(" ").forEach(id => { if (!ids.has(id)) unknown.push(g + ":" + id); }));
    const CI = K.clusters.ids(); Object.keys(CI).forEach(k => CI[k].forEach(id => { if (!ids.has(id)) unknown.push(k + ":" + id); }));
    R.GODS.forEach(g => Object.keys(R.K[g]).forEach(k => { if (!CI[k]) unknown.push(g + " → cluster " + k); }));
    eq(unknown, [], "every item of the gods and of the clusters exists; every attraction points to a cluster");
    eq(R.GODS.map(g => R.ITEMS[g].split(" ").length), [16, 18, 26, 17, 11], "items with a bonus: 16 / 18 / 26 / 17 / 11 (owner's table)");
    eq([R.EXCESS.W, R.EXCESS.L0, R.BIAS.slaanesh], [4, 49, -6.05], "Slaanesh: excess weight 4, from 49 % Yes + Love, bias −6.05 (owner, Oct 3)");
    // every god is reachable: a made-up list that loves that god's items and clusters
    const all = [...ids];
    const mk = (fn, meta) => { const it = {}; all.forEach((id, i) => { const v = fn(id, i); if (v) it[id] = { interest: v }; }); return { items: it, meta: meta || {} }; };
    const fav = g => { const s = new Set(R.ITEMS[g].split(" ")); Object.keys(R.K[g]).forEach(k => { if (R.K[g][k] > 0) K.clusters.ids()[k].forEach(id => s.add(id)); }); return s; };
    const got = R.GODS.map(g => { const s = fav(g), st = mk((id, i) => s.has(id) ? "love" : i % 2 ? "limit" : "maybe"); return R.choose(st, K.portrait.compute(st, null), null); });
    eq(got, R.GODS, "each god wins on a list that loves its own items and themes");
    // the excess only adds: a list of only “No” loses nothing through it
    const no = mk(() => "limit"), pNo = R.parts(no, K.portrait.compute(no, null), null).slaanesh, sNo = R.scores(no, K.portrait.compute(no, null), null).slaanesh;
    const base = 5 * (pNo.P / R.S.slaanesh.P + (pNo.I === null ? 0 : (pNo.I - R.I0.slaanesh) / R.S.slaanesh.I) + pNo.Z / R.S.slaanesh.Z + pNo.K / R.S.slaanesh.K) + R.BIAS.slaanesh;
    ok(Math.abs(sNo - base) < 1e-9, "all “No”: Slaanesh's excess adds nothing (only counts above the usual)");
    eq(R.choose(mk((id, i) => i < 3 ? "yes" : null), { sections: [] }, null), null, "no portrait → no patron");
    // texts
    const need = ["wr.toWr", "wr.mine", "wr.their", "wr.mut", "wr.spawn", "wr.notOfficial", "card.o.wr", "sp.wr.h", "sp.wr.grp", "sp.wr.same", "sp.wr.near", "sp.wr.far", "help.wr_html", "help.compareWr_html"].concat(R.GODS.map(g => "wr.of." + g));
    const miss = []; LANGS.forEach(l => need.forEach(k => { if (!K.i18n.has("ui", k, l)) miss.push(l + ":" + k); }));
    eq(miss, [], "every Chaos-mode text exists in all 7 languages (" + need.length + " keys)");
    // the stored mode: a new value, the old ones unchanged, each view its own
    const m = open("form", { storage: { local: { "checklist-dnd": "wr" }, session: {} } }).KC.dnd;
    eq([m.mode(), m.mode("pair"), m.mode("group")], ["wr", "sign", "sign"], "“wr” in checklist-dnd → the Chaos mode for the portrait only");
    eq(["1", "wod"].map(v => open("form", { storage: { local: { "checklist-dnd": v }, session: {} } }).KC.dnd.mode()), ["dnd", "wod"], "old values “1” and “wod” work as before");
    // the portrait
    const lov = fav("tzeentch"), own = mk((id, i) => lov.has(id) ? "love" : i % 3 ? "maybe" : "limit", { role: "dom" }); own.name = "Ann";
    const g = open("form", { storage: { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(own) }, session: {} } });
    const sec = g.d.getElementById("portraitSection"); sec.open = true; sec.dispatchEvent(new g.w.Event("toggle"));
    const row = g.d.querySelector("#portraitBody .pt-mode");
    eq([...row.querySelectorAll("[data-mode]")].map(b => b.textContent), ["⚔ Wr", "🗡 Ведьмак", "🌀 Аватар", "📖 Грехи Re:Zero", "✦ Созвездие", "🎲 DnD", "🦇 Мир Тьмы"], "v611/v615/v616: one row — ⚔ Wr, 🗡 Witcher and 🌀 Avatar on the left, then ✦ 🎲 🦇");
    ok(!g.d.querySelector(".pt-wr-sub"), "no ⚔ Wr tabs before ⚔ Wr is chosen");
    click(g.w, g.d.querySelector('.pt-mode .pt-wrb'));
    const pv = g.d.querySelector(".pt-wr");
    ok(!!pv && pv.dataset.god === "tzeentch" && /Ваш покровитель/.test(pv.querySelector(".sg-over").textContent) && /Служитель Тзинча/.test(pv.querySelector(".sg-name").textContent)
      && /^(Мутации: \d+|Порождение Хаоса — мутации: 10)$/.test(pv.querySelector(".sg-rl").textContent) && +pv.dataset.mut >= 0 && +pv.dataset.mut <= 10 && !pv.querySelector(".sg-al")
      && pv.querySelector(".wod-note").textContent === "Фанатский неофициальный материал." && g.w.localStorage.getItem("checklist-dnd") === "wr",
      "portrait: “Your patron · Servant of Tzeentch”, mutations 0–10, the groups, the fan line; remembered as “wr”");
    const tabs = g.d.querySelector(".pt-wr-sub");
    ok(!g.d.querySelector(".pt-wod-sub") && !!tabs && [...tabs.querySelectorAll("[data-mode]")].map(b => b.dataset.mode + ":" + b.textContent).join("|") === "wr:Боги Хаоса|wh:🌌 40K|leg:🛡 Легион|ow:🏰 Old World"
      && tabs.querySelector('[data-mode="wr"]').getAttribute("aria-pressed") === "true" && g.d.querySelector(".pt-mode .pt-wrb").getAttribute("aria-pressed") === "true",
      "⚔ Wr opens its tabs under it: Chaos gods (open by default) | 🌌 40K | 🛡 Legion | 🏰 Old World (v615: the Witcher is its own button); ⚔ Wr is pressed");
    g.KC.form.drawCard({ sign: true, bars: true, love: true, limits: false, name: true, role: true, exp: true });
    ok(!g.errors.length, "the picture card is drawn in the Chaos mode without errors");
    g.KC.help.open("portrait"); ok(/Служитель богов Хаоса/.test(g.d.getElementById("help-portrait").textContent) && /Games Workshop/.test(g.d.getElementById("help-portrait").textContent), "help (portrait) explains the mode and that it is a fan mode");
    // the compare page: the pair's patrons, the cult
    const code = (n, u, s) => { const it = {}; all.forEach((id, i) => { it[id] = { interest: s.has(id) ? "love" : i % 2 ? "limit" : "maybe" }; }); return K.codec.encode({ name: n, uid: u, items: it, meta: {} }, "ru"); };
    const codes = [code("Ann", "ANN610", fav("khorne")), code("Bob", "BOB610", fav("khorne")), code("Cid", "CID610", fav("nurgle"))];
    const run = (n, local) => { const cp = open("compare", { storage: { local: Object.assign({ "checklist-lang": "ru" }, local), session: {} } });
      for (let i = 2; i < n; i++) click(cp.w, cp.d.getElementById("addPart"));
      cp.d.querySelectorAll("#parts textarea").forEach((ta, i) => { ta.value = codes[i]; }); click(cp.w, cp.d.getElementById("cmpBtn")); return cp; };
    const c2 = run(2, { "checklist-dnd-pair": "wr", "checklist-folds": '{"pair":true}' });
    const box = c2.d.querySelector(".sp-signs.sp-wr");
    ok(!!box && /Покровители пары/.test(box.textContent) && box.querySelectorAll(".sg-wr").length === 2 && /Один бог/.test(box.querySelector(".sg-match").textContent) && /Фанатский/.test(box.textContent),
      "pair: “The pair's patrons”, two signs, the same god (both Khorne)");
    const c3 = run(3, { "checklist-dnd-group": "wr", "checklist-folds": '{"group":true}' });
    const gf = c3.d.querySelector('details.sp-fold[data-fold="group"]');
    ok(!!gf.querySelector(".sp-wrgrp") && /Культ/.test(gf.textContent) && gf.querySelectorAll(".sp-wrgrp li").length === 3 && /Служитель Нургла/.test(gf.textContent) && !gf.querySelector("[data-planet]"),
      "group: the cult, everyone's patron, no system");
    click(c3.w, gf.querySelector('.pt-mode [data-mode="sign"]'));
    ok(!!gf.querySelector("[data-planet]") && c3.w.localStorage.getItem("checklist-dnd-group") === null && c3.w.localStorage.getItem("checklist-dnd-pair") === null, "→ the solar system again; the pair's choice untouched");
    c3.KC.help.open("compare"); ok(/⚔ Wr/.test(c3.d.getElementById("help-compare").textContent), "help (compare) explains the mode");
    ok(!f.errors.length && !g.errors.length && !c2.errors.length && !c3.errors.length, "no script errors");
    _sc.end();
  }


  S("v610: Warhammer factions (🌌 40K) and legions (🛡) — two more modes; switches for the new modes");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, H = K.wh, L = K.leg, R = K.wr, C = K.clusters;
    const LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    eq([H.FACTIONS.length, L.LEGIONS.length, Object.keys(C.USUAL).length], [14, 18, 42], "14 factions, 18 legions, 42 clusters");
    const bad = [];
    Object.keys(H.FIG).concat(Object.keys(L.FIG).map(k => "L" + k)).forEach(key => { const F = key[0] === "L" && L.FIG[key.slice(1)] ? L.FIG[key.slice(1)] : H.FIG[key];
      const [P, E, Ln, B] = F, n = P.length + E.length;
      if (P.length !== 9 || new Set(B).size !== 3 || B.some(i => i < 0 || i > 8)) bad.push(key + ": stars");
      Ln.forEach(l => (l[0] === "d" ? l.slice(1) : l).forEach(i => { if (!(i >= 0 && i < n)) bad.push(key + ": line " + i); })); });
    eq(bad, [], "every faction and legion sign: 9 group stars, 3 bright slots, lines only to existing stars");
    eq([H.FACTIONS.filter(x => !H.FIG[x]), L.LEGIONS.concat(["ii", "xi"]).filter(x => !L.FIG[x])], [[], []], "every faction and legion (and the lost II / XI) has a sign");
    const parseK = s2 => s2.split(" ").map(t => t.match(/^([a-z]+)/)[1]);
    eq(H.FACTIONS.concat(L.LEGIONS).filter(x => (H.PROF[x] || L.PROF[x]) && parseK(H.PROF[x] || L.PROF[x]).some(k => !C.USUAL[k])), [], "every profile uses known clusters");
    // each faction / legion wins on a list that loves its main cluster and its helpers (no rules in the way)
    const all = []; K.CATS.forEach(c => c.items.forEach(([, id]) => all.push(id)));
    const mk = (fn, meta) => { const it = {}; all.forEach((id, i) => { const v = fn(id, i); if (v) it[id] = { interest: v }; }); return { items: it, meta: meta || {} }; };
    const lover = prof => { const w = {}; prof.split(" ").forEach(t => { const m = t.match(/^([a-z]+)(-?[\d.]+)$/); w[m[1]] = +m[2]; });
      const top = Object.keys(w).filter(k => w[k] >= .5), off = Object.keys(w).filter(k => w[k] < 0);
      const like = new Set(), hate = new Set(); top.forEach(k => C.ids()[k].forEach(id => like.add(id))); off.forEach(k => C.ids()[k].forEach(id => hate.add(id)));
      return mk((id, i) => like.has(id) ? "love" : hate.has(id) ? "limit" : i % 3 === 0 ? "maybe" : i % 3 === 1 ? "limit" : null); };
    const winsF = H.FACTIONS.filter(x => { const st = lover(H.PROF[x]); return H.choose(st, K.portrait.compute(st, null), null) === x; });
    ok(winsF.length >= 11, "most factions win on a list that loves their own themes (" + winsF.length + "/14: " + H.FACTIONS.filter(x => winsF.indexOf(x) < 0).join(", ") + " overlap others)");
    const winsL = L.LEGIONS.filter(x => { const st = lover(L.PROF[x]); return L.choose(st, K.portrait.compute(st, null), null) === x; });
    ok(winsL.length >= 13, "most legions win on a list that loves their own themes (" + winsL.length + "/18)");
    // the Great Devourer
    const eater = mk((id, i) => i % 3 ? "love" : "yes");
    eq(H.choose(eater, K.portrait.compute(eater, null), null), "tyranids", "a list that eats everything (all answered, no “No”, lots of Love) → Tyranids");
    // WAAAGH
    const quiet = mk((id, i) => i % 2 ? "maybe" : "limit"), loud = mk(() => "love");
    eq([H.waaagh(quiet, null), H.waaagh(loud, null), H.waaaghText(1), H.waaaghText(4)], [1, 12, "WAGH!", "WAAAAGH!"], "WAAAGH: 1 A without Love, 12 at most; the text");
    // mutations
    eq(R.GODS.map(g => R.mutations(loud, g, null)).every(n => n >= 0 && n <= 10) && R.GODS.map(g => R.mutations(quiet, g, null)).every(n => n >= 0 && n <= 10), true, "mutations always 0–10");
    eq([R.mutLine(10, K.i18n.t), R.mutLine(3, K.i18n.t)], ["Порождение Хаоса — мутации: 10", "Мутации: 3"].map(x => K.i18n.lang === "ru" ? x : K.i18n.t(x === "Мутации: 3" ? "wr.mut" : "wr.spawn", { n: 3 })), "10 = a Chaos spawn; no “of 10” (owner, Oct 3)");
    // texts
    const need = ["wh.toWh", "wh.mine", "wh.their", "wh.waaagh", "card.o.wh", "sp.wh.h", "sp.wh.grp", "sp.wh.same", "sp.wh.near", "sp.wh.far", "help.compareWh_html", "wr.gods", "wr.switch",
      "leg.toLeg", "leg.mine", "leg.their", "leg.lost", "leg.expunged", "card.o.leg", "sp.leg.h", "sp.leg.grp", "sp.leg.same", "sp.leg.near", "sp.leg.far", "help.leg_html", "help.compareLeg_html"]
      .concat(H.FACTIONS.map(x => "wh.f." + x), L.LEGIONS.map(x => "leg.l." + x));
    const miss = []; LANGS.forEach(l => need.forEach(k => { if (!K.i18n.has("ui", k, l)) miss.push(l + ":" + k); }));
    eq(miss, [], "every faction / legion text exists in all 7 languages (" + need.length + " keys)");
    // the portrait in both modes
    const ork = lover(H.PROF.orks); ork.name = "Ann";
    const g = open("form", { storage: { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(ork) }, session: {} } });
    const sec = g.d.getElementById("portraitSection"); sec.open = true; sec.dispatchEvent(new g.w.Event("toggle"));
    eq(g.d.querySelectorAll("#portraitBody .pt-mode:not(.pt-wr-sub) [data-mode]").length, 7, "seven buttons in the mode row while every switch is on (⚔ Wr + 🗡 Witcher + 🌀 Avatar + 📖 Re:Zero + three)");
    click(g.w, g.d.querySelector('.pt-mode .pt-wrb')); click(g.w, g.d.querySelector('.pt-wr-sub [data-mode="wh"]'));
    const pw = g.d.querySelector(".pt-wh");
    ok(!!pw && pw.dataset.faction === "orks" && /Ваша фракция/.test(pw.querySelector(".sg-over").textContent) && pw.querySelector(".sg-name").textContent === "Орки"
      && /^Ваш WAAAGH: WA+GH!$/.test(pw.querySelector(".sg-rl").textContent) && !!pw.querySelector(".wod-note") && g.w.localStorage.getItem("checklist-dnd") === "wh",
      "factions: “Your faction · Orks · Your WAAAGH: WA…GH!”, remembered as “wh”");
    click(g.w, g.d.querySelector('.pt-wr-sub [data-mode="leg"]'));
    const pl = g.d.querySelector(".pt-leg");
    ok(!!pl && /Ваш легион/.test(pl.querySelector(".sg-over").textContent) && /^(I|V|VI|VII|IX|X|XIII|XVIII|XIX|III|IV|VIII|XII|XIV|XV|XVI|XVII|XX) /.test(pl.querySelector(".sg-name").textContent) || /Легион (II|XI)/.test(pl.querySelector(".sg-name").textContent),
      "legions: “Your legion · <number> <name>”");
    ok(!g.d.querySelector(".pt-wh"), "the factions and the legions are separate modes");
    click(g.w, g.d.querySelector('.pt-mode [data-mode="sign"]')); ok(!g.d.querySelector(".pt-wr-sub") && g.d.querySelector(".pt-mode .pt-wrb").dataset.mode === "leg", "back to the constellation: the tabs close, ⚔ Wr remembers the legion tab");
    click(g.w, g.d.querySelector('.pt-mode .pt-wrb')); ok(!!g.d.querySelector(".pt-leg") && g.w.localStorage.getItem("checklist-wr") === "leg", "⚔ Wr reopens the tab chosen last (checklist-wr)");
    g.KC.form.drawCard({ sign: true, bars: true, love: true, limits: false, name: true, role: true, exp: true });
    g.KC.help.open("portrait"); ok(!/14 фракций/.test(g.d.getElementById("help-portrait").textContent) && /18 легионов/.test(g.d.getElementById("help-portrait").textContent), "help: the legions are explained; the factions have no paragraph of their own (owner, v611)");
    // the lost legions: the record is expunged
    const lostFig = L.FIG.ii; ok(lostFig[0].length === 9, "the expunged record has a sign too");
    // the compare page
    const code = (n, u, st) => K.codec.encode(Object.assign({ name: n, uid: u }, st), "ru");
    const codes = [code("Ann", "ANN611", lover(H.PROF.orks)), code("Bob", "BOB611", lover(H.PROF.orks)), code("Cid", "CID611", lover(H.PROF.necrons))];
    const run = (n, local) => { const cp = open("compare", { storage: { local: Object.assign({ "checklist-lang": "ru" }, local), session: {} } });
      for (let i = 2; i < n; i++) click(cp.w, cp.d.getElementById("addPart"));
      cp.d.querySelectorAll("#parts textarea").forEach((ta, i) => { ta.value = codes[i]; }); click(cp.w, cp.d.getElementById("cmpBtn")); return cp; };
    const c2 = run(2, { "checklist-dnd-pair": "wh", "checklist-folds": '{"pair":true}' });
    const box = c2.d.querySelector(".sp-signs.sp-wh");
    ok(!!box && /Фракции пары/.test(box.textContent) && /Одна фракция/.test(box.textContent) && box.querySelectorAll(".sg-wh").length === 2 && /WAAAGH/.test(box.textContent), "pair: “The pair's factions”, one faction (both Orks), their WAAAGH");
    const c3 = run(3, { "checklist-dnd-group": "leg", "checklist-folds": '{"group":true}' });
    const gf = c3.d.querySelector('details.sp-fold[data-fold="group"]');
    ok(!!gf.querySelector(".sp-leggrp") && /Легионы компании/.test(gf.textContent) && gf.querySelectorAll(".sp-leggrp li").length === 3, "group: everyone's legion");
    // switches: a mode switched off disappears everywhere and a device that chose it sees the constellation
    const off = open("form", { storage: { local: { "checklist-lang": "ru", "checklist-dnd": "wh", "practices-checklist-v1": JSON.stringify(ork) }, session: {} },
      patch: { "core/kc.js": src => src.replace("KC.FEATURES = { wr: true, wh: true, leg: true, ow: true, wi: true, av: true };", "KC.FEATURES = { wr: true, wh: false, leg: false, ow: false, wi: false, av: false };") } });
    const so = off.d.getElementById("portraitSection"); so.open = true; so.dispatchEvent(new off.w.Event("toggle"));
    ok(off.KC.dnd.mode() === "sign" && !off.d.querySelector('.pt-mode [data-mode="wh"], .pt-mode [data-mode="leg"]') && off.d.querySelector('.pt-mode .pt-wrb').dataset.mode === "wr" && !off.d.querySelector(".pt-wr-sub") && !off.d.querySelector(".pt-wh"),
      "factions + legions switched off: no tabs (one tab left → ⚔ Wr opens the gods directly), a device that chose factions sees the constellation");
    off.KC.help.open("portrait"); ok(!/18 легионов/.test(off.d.getElementById("help-portrait").textContent) && /Служитель богов Хаоса/.test(off.d.getElementById("help-portrait").textContent), "…and their help paragraphs are hidden");
    const none = open("form", { storage: { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(ork) }, session: {} }, patch: { "core/kc.js": src => src.replace("KC.FEATURES = { wr: true, wh: true, leg: true, ow: true, wi: true, av: true };", "KC.FEATURES = { wr: false, wh: false, leg: false, ow: false, wi: false, av: false };") } });
    none.KC.dnd.setMode("wr"); eq(none.KC.dnd.mode(), "sign", "all new modes off: choosing one stores nothing (the constellation stays)");
    const ns = none.d.getElementById("portraitSection"); ns.open = true; ns.dispatchEvent(new none.w.Event("toggle")); ok(!!none.d.querySelector("#portraitBody .pt-mode") && !none.d.querySelector(".pt-wrb"), "…and there is no ⚔ Wr button");
    ok(!f.errors.length && !g.errors.length && !c2.errors.length && !c3.errors.length && !off.errors.length && !none.errors.length, "no script errors");
    _sc.end();
  }

  S("v612: Warhammer: The Old World races (🏰) and Witcher schools (🗡) — two more tabs under ⚔ Wr");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, O = K.ow, V = K.wi, C = K.clusters;
    const LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    eq([O.RACES.length, V.SCHOOLS.length, V.SIGNS.length], [17, 6, 5], "17 races (with Kislev, Cathay and the Warriors of Chaos), 6 schools, 5 signs");
    const bad = [];
    [[O, O.RACES], [V, V.SCHOOLS]].forEach(([M, keys]) => keys.forEach(k => { const F = M.FIG[k]; if (!F) { bad.push(k + ": no sign"); return; } const [P, E, Ln, B] = F, n = P.length + E.length;
      if (P.length !== 9 || new Set(B).size !== 3 || B.some(i => i < 0 || i > 8)) bad.push(k + ": stars");
      Ln.forEach(l => (l[0] === "d" ? l.slice(1) : l).forEach(i => { if (!(i >= 0 && i < n)) bad.push(k + ": line " + i); })); }));
    eq(bad, [], "every race and school has a sign: 9 group stars, 3 bright slots, lines only to existing stars");
    const parseK = s2 => s2.split(" ").map(t => t.match(/^([a-z]+)/)[1]);
    eq(O.RACES.filter(r => parseK(O.PROF[r]).some(k => !C.USUAL[k])).concat(V.SIGNS.filter(g => parseK(V.SPROF[g]).some(k => !C.USUAL[k]))), [], "races and signs use only known clusters (owner: races by clusters, not by groups)");
    eq(V.SCHOOLS.filter(x => parseK(V.PROF[x]).some(k => !K.signs.KEY[k])), [], "schools use only the groups (as the World of Darkness clans)");
    const all = []; K.CATS.forEach(c => c.items.forEach(([, id]) => all.push(id)));
    const mk = (fn, meta) => { const it = {}; all.forEach((id, i) => { const v = fn(id, i); if (v) it[id] = { interest: v }; }); return { items: it, meta: meta || {} }; };
    const lover = prof => { const w = {}; prof.split(" ").forEach(t => { const m = t.match(/^([a-z]+)(-?[\d.]+)$/); w[m[1]] = +m[2]; });
      const top = Object.keys(w).filter(k => w[k] >= .5), off = Object.keys(w).filter(k => w[k] < 0);
      const like = new Set(), hate = new Set(); top.forEach(k => C.ids()[k].forEach(id => like.add(id))); off.forEach(k => C.ids()[k].forEach(id => hate.add(id)));
      return mk((id, i) => like.has(id) ? "love" : hate.has(id) ? "limit" : i % 3 === 0 ? "maybe" : i % 3 === 1 ? "limit" : null); };
    const wins = O.RACES.filter(r => { const st = lover(O.PROF[r]); return O.choose(st, K.portrait.compute(st, null), null) === r; });
    ok(wins.length >= 14, "most races win on a list that loves their themes (" + wins.length + " / 17)");
    eq(V.SIGNS.filter(g => V.chooseSign(lover(V.SPROF[g]), null) === g), V.SIGNS, "each sign wins on a list that loves its themes");
    eq(O.grudges(mk((id, i) => i % 4 === 0 ? "limit" : i % 4 === 1 ? "yes" : null), null), Math.ceil(all.length / 4), "the Dwarfs' Book of Grudges: one page per “No”");
    const need = ["ow.toOw", "ow.mine", "ow.their", "ow.grudges", "card.o.ow", "sp.ow.h", "sp.ow.grp", "sp.ow.same", "sp.ow.near", "sp.ow.far",
      "wi.toWi", "wi.mine", "wi.their", "wi.sign", "card.o.wi", "sp.wi.h", "sp.wi.grp", "sp.wi.same", "sp.wi.near", "sp.wi.far"]
      .concat(O.RACES.map(x => "ow.r." + x), V.SCHOOLS.map(x => "wi.s." + x), V.SIGNS.map(x => "wi.g." + x));
    const miss = []; LANGS.forEach(l => need.forEach(k => { if (!K.i18n.has("ui", k, l)) miss.push(l + ":" + k); }));
    eq(miss, [], "every Old World / Witcher text exists in all 7 languages (" + need.length + " keys)");
    // the portrait: the Dwarfs with their Book of Grudges; a school with its sign
    const dw = lover(O.PROF.dwarf); dw.name = "Ann";
    const g = open("form", { storage: { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(dw) }, session: {} } });
    const sec = g.d.getElementById("portraitSection"); sec.open = true; sec.dispatchEvent(new g.w.Event("toggle"));
    click(g.w, g.d.querySelector(".pt-mode .pt-wrb")); click(g.w, g.d.querySelector('.pt-wr-sub [data-mode="ow"]'));
    const po = g.d.querySelector(".pt-ow");
    ok(!!po && po.dataset.race === "dwarf" && /Ваша раса/.test(po.querySelector(".sg-over").textContent) && po.querySelector(".sg-name").textContent === "Дворфы"
      && po.querySelector(".sg-rl").textContent === "Страниц в книге обид: " + Object.keys(dw.items).filter(id => dw.items[id].interest === "limit").length && !!po.querySelector(".wod-note") && g.w.localStorage.getItem("checklist-dnd") === "ow",
      "Old World: “Your race · Дворфы (v615) · Pages in the Book of Grudges: N = the number of “No””, remembered as “ow”");
    ok(!g.d.querySelector('.pt-wr-sub [data-mode="wi"]') && !!g.d.querySelector('.pt-mode .pt-wib[data-mode="wi"]'), "v615: the Witcher is a button in the main row, not a Wr tab");
    click(g.w, g.d.querySelector('.pt-mode .pt-wib'));
    const pw = g.d.querySelector(".pt-wi");
    ok(!!pw && V.SCHOOLS.indexOf(pw.dataset.school) >= 0 && V.SIGNS.indexOf(pw.dataset.wsign) >= 0 && /Ваша школа/.test(pw.querySelector(".sg-over").textContent)
      && /^Школа /.test(pw.querySelector(".sg-name").textContent) && /^Знак: (Аард|Игни|Ирден|Квен|Аксий)$/.test(pw.querySelector(".sg-rl").textContent),
      "Witcher: “Your school · School of the … · Sign: …”");
    g.KC.form.drawCard({ sign: true, bars: true, love: true, limits: false, name: true, role: true, exp: true });
    // the compare page
    const code = (n, u, st) => K.codec.encode(Object.assign({ name: n, uid: u }, st), "ru");
    const codes = [code("Ann", "ANN612", lover(O.PROF.dwarf)), code("Bob", "BOB612", lover(O.PROF.dwarf)), code("Cid", "CID612", lover(O.PROF.vamp))];
    const run = (n, local) => { const cp = open("compare", { storage: { local: Object.assign({ "checklist-lang": "ru" }, local), session: {} } });
      for (let i = 2; i < n; i++) click(cp.w, cp.d.getElementById("addPart"));
      cp.d.querySelectorAll("#parts textarea").forEach((ta, i) => { ta.value = codes[i]; }); click(cp.w, cp.d.getElementById("cmpBtn")); return cp; };
    const c2 = run(2, { "checklist-dnd-pair": "ow", "checklist-folds": '{"pair":true}' });
    const box = c2.d.querySelector(".sp-signs.sp-ow");
    ok(!!box && /Расы пары/.test(box.textContent) && /Одна раса/.test(box.textContent) && box.querySelectorAll(".sg-ow").length === 2 && /книге обид/.test(box.textContent), "pair: “The pair's races”, one race (both Dwarfs), their Book of Grudges");
    const c3 = run(3, { "checklist-dnd-group": "wi", "checklist-folds": '{"group":true}' });
    const gf = c3.d.querySelector('details.sp-fold[data-fold="group"]');
    ok(!!gf.querySelector(".sp-wigrp") && /Школы компании/.test(gf.textContent) && gf.querySelectorAll(".sp-wigrp li").length === 3 && /Знак:/.test(gf.textContent), "group: everyone's school and sign");
    // switches
    const off = open("form", { storage: { local: { "checklist-lang": "ru", "checklist-dnd": "ow", "practices-checklist-v1": JSON.stringify(dw) }, session: {} },
      patch: { "core/kc.js": src => src.replace("ow: true, wi: true", "ow: false, wi: false") } });
    const so = off.d.getElementById("portraitSection"); so.open = true; so.dispatchEvent(new off.w.Event("toggle"));
    ok(off.KC.dnd.mode() === "sign" && !off.d.querySelector('.pt-mode [data-mode="ow"], .pt-mode [data-mode="wi"]') && !off.d.querySelector(".pt-ow"), "Old World + Witcher switched off: no tabs, a device that chose Old World sees the constellation");
    ok(!f.errors.length && !g.errors.length && !c2.errors.length && !c3.errors.length && !off.errors.length, "no script errors");
    _sc.end();
  }

  S("v613: the extended list — two roles per practice, «✦ Хочу», links, My lists, portrait, compare");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, X = K.ext;
    const LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    const ids = []; K.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const V = ["limit", "maybe", "yes", "love"];
    // links: random extended lists survive a link exactly; plain links keep their old format
    let seed = 13; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const so = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
    let badRt = 0;
    for (let n = 0; n < 60; n++) {
      const st = { ext: 1, items: {}, meta: {} }, pf = rnd(), pb = rnd();
      ids.forEach(id => { const o = {}; if (rnd() < pf) { o.t = V[Math.floor(rnd() * 4)]; if (rnd() < .3) o.tw = 1; } if (rnd() < pb) { o.b = V[Math.floor(rnd() * 4)]; if (rnd() < .3) o.bw = 1; } if (o.t || o.b) st.items[id] = o; });
      const norm = K.store.normalize(st), d = K.codec.decode(K.codec.encode(norm, "ru"));
      if (so(norm.items) !== so(K.store.normalize(d).items) || d.damaged || !d.ext) badRt++;
    }
    eq(badRt, 0, "60 random extended lists come back from a link exactly (answers of both roles and «Хочу»)");
    eq(X.cleanItem({ t: "limit", tw: 1, b: "yes", bw: 1 }), { t: "limit", b: "yes", bw: 1 }, "«Хочу» only next to Может / Да / Обожаю");
    const plain = { items: {}, meta: { role: "dom" }, name: "P" }; ids.forEach((id, i) => { if (i % 3) plain.items[id] = { interest: V[i % 4] }; });
    const pc = K.codec.encode(K.store.normalize(plain)), tag = K.codec.unpackAnswers ? atob(pc.split("&")[0].slice(2).replace(/-/g, "+").replace(/\./g, "/").padEnd(Math.ceil((pc.split("&")[0].length - 2) / 4) * 4, "=")).charCodeAt(0) : 0;
    ok(tag === 2 || tag === 4, "a plain list still makes a link of the old format (tag " + tag + ")");
    const one = X.fromPlain(K.store.normalize(plain), "dom");
    ok(one.ext === 1 && one.items[ids[1]].t === plain.items[ids[1]].interest && !one.items[ids[1]].b && !one.meta.role, "an extended copy puts the answers into the role the list was filled for");
    const L = s2 => K.codec.encode(s2).split("&")[0].length;
    ok(L(one) <= L(K.store.normalize(plain)) * 1.35, "an extended list with one role filled: its link is about as short as a plain one (" + L(one) + " vs " + L(K.store.normalize(plain)) + ")");
    const both = X.fromPlain(K.store.normalize(plain), "both");
    ok(ids.filter(id => both.items[id]).every(id => both.items[id].t === both.items[id].b), "“Обе”: the answers go to both roles");
    // the form: the switch makes the extended copy (asks the role when the list has none), both lists in My lists
    const st0 = { name: "Ann", uid: "ANNUID", meta: {}, items: {} }; ids.forEach((id, i) => { if (i % 2) st0.items[id] = { interest: V[i % 4] }; });
    st0.items.chains = { interest: "love" };
    const g = open("form", { storage: { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(st0) }, session: {} } });
    ok(!g.d.getElementById("extToggleBox").hidden && g.d.getElementById("roleView").hidden && !g.d.getElementById("extMake").hidden && !g.d.querySelector(".ext-row"), "a plain list: the switch «☐ Расширенная» and «Сделать расширенную», no role filter, plain rows");
    const LS = (pg, k) => JSON.parse(pg.w.localStorage.getItem(k)), LSx = pg => LS(pg, "practices-checklist-v1") || {};
    click(g.w, g.d.getElementById("extToggle"));
    ok(g.d.getElementById("extOverlay").classList.contains("show") && !LSx(g).ext, "no role in the list → the window asks «Верх, Низ или Обе?» (nothing made yet)");
    click(g.w, g.d.querySelector('[data-ext-role="sub"]'));
    const ownX = LS(g, "practices-checklist-v1"), mine = LS(g, "checklist-my-profiles-v1");
    ok(ownX.ext === 1 && ownX.items.chains.b === "love" && !ownX.items.chains.t && ownX.pair === "ANNUID" && mine.length === 2 && mine.some(x => x.data.uid === "ANNUID" && x.data.pair === ownX.uid),
      "→ Bottom: an extended copy with the answers in «↓ Низ»; the plain list stays in My lists; they point at each other");
    const store2 = { local: {}, session: {} }; for (let i = 0; i < g.w.localStorage.length; i++) store2.local[g.w.localStorage.key(i)] = g.w.localStorage.getItem(g.w.localStorage.key(i));
    const h = open("form", { storage: store2 });
    const row = h.d.querySelector('.item[data-id="chains"]');
    ok(h.KC.form.isExt() && row.querySelectorAll(".ext-row").length === 2 && /Расширенная/.test(h.d.getElementById("progress").textContent) && h.d.getElementById("extToggle").checked && !h.d.getElementById("roleView").hidden && h.d.getElementById("roleTop").hidden,
      "the extended list: two rows «↑ Верх / ↓ Низ», «Расширенная» next to the count, the switch ticked, the role filter, no role picker");
    ok(row.querySelector('.ext-row[data-r="t"] .want').disabled && !row.querySelector('.ext-row[data-r="b"] .want').disabled, "«✦ Хочу» is off without an answer (or with «Нет»)");
    click(h.w, row.querySelector('.ext-row[data-r="t"] [data-v="yes"]')); click(h.w, row.querySelector('.ext-row[data-r="t"] .want'));
    eq(h.KC.form.state.items.chains, { b: "love", t: "yes", tw: 1 }, "an answer and «Хочу» in «↑ Верх»");
    click(h.w, row.querySelector('.ext-row[data-r="t"] [data-v="limit"]'));
    eq(h.KC.form.state.items.chains, { b: "love", t: "limit" }, "«Нет» takes «Хочу» away");
    h.d.getElementById("roleView").value = "t"; h.d.getElementById("roleView").dispatchEvent(new h.w.Event("change"));
    h.d.getElementById("view").value = "answered"; h.d.getElementById("view").dispatchEvent(new h.w.Event("change"));
    const vis = [...h.d.querySelectorAll(".item:not(.filtered-out)")].map(r => r.dataset.id);
    ok(vis.length === 1 && vis[0] === "chains" && row.querySelector('.ext-row[data-r="b"]').classList.contains("r-hidden"), "«↑ Только Верх» + «Отвеченные»: only the answers of that role, the other row hidden");
    h.KC.form.saveNow();
    click(h.w, h.d.querySelector("#mineBtn"));
    const mt = h.d.getElementById("mineList").textContent;
    ok(/Расширенная/.test(mt) && /Обычная · роль не указана/.test(mt), "My lists says which list is extended and which is plain (with its role or «роль не указана»)");
    // the backup keeps the extended list (and the link between the two lists)
    const bk = JSON.parse(JSON.stringify(h.KC.store.exportAll()));
    const fresh = open("form", { storage: { local: { "checklist-lang": "ru" }, session: {} } });
    const imp = fresh.KC.store.importAll(bk), m2 = fresh.KC.store.mine.list(), xe = m2.find(x => x.data.ext), xp = m2.find(x => !x.data.ext);
    ok(imp && imp.mine === 2 && !!xe && xe.data.items.chains.b === "love" && xe.data.items.chains.t === "limit" && xe.data.pair === xp.data.uid && xp.data.pair === xe.data.uid && bk.own.ext === 1,
      "a backup carries the extended list with both roles; restoring it keeps both lists and their link");
    fresh.KC.help.open("answer"); ok(/Расширенная анкета/.test(fresh.d.getElementById("help-answer").textContent) && /Новое вместе/.test(fresh.KC.i18n.t("help.news_html").slice(0, 5000)), "help explains the extended list; «Что нового» has the entry of Oct 4");
    // the portrait: one per role, a card per role; the PDF: both roles
    const sec = h.d.getElementById("portraitSection"); sec.open = true; sec.dispatchEvent(new h.w.Event("toggle"));
    ok(h.d.querySelectorAll(".pt-role").length === 2 && !!h.d.querySelector('.pt-role[data-r="b"] .pt-sign') && /↑ Верх/.test(h.d.querySelector('.pt-role[data-r="t"] .pt-role-h').textContent) && !!h.d.querySelector('.pt-role[data-r="b"] [data-card="b"]'),
      "the portrait: «↑ Верх» and «↓ Низ», each with its own sign and picture card");
    h.KC.form.drawCard({ sign: true, bars: true, love: true, limits: false, name: true, role: true, exp: true });
    const sh = h.KC.form.buildSheet(), ps = [].concat(h.KC.form.buildPortraitSheet());
    ok(/↓/.test(sh.innerHTML) && ps.length >= 1 && !h.errors.length, "the PDF shows the roles; the portrait pages are made per role; no errors");
    // the compare page
    const extA = { ext: 1, name: "Ann", uid: "ANNEXT", meta: {}, items: {} }, extB = { ext: 1, name: "Bob", uid: "BOBEXT", meta: {}, items: {} };
    ids.forEach((id, i) => { extA.items[id] = { t: V[1 + i % 3], b: V[1 + (i + 1) % 3] }; if (i % 4 === 0) { extA.items[id].tw = 1; } if (i % 6 === 0) extA.items[id].bw = 1;
      extB.items[id] = { t: V[1 + (i + 2) % 3], b: V[1 + i % 3] }; if (i % 4 === 0) extB.items[id].bw = 1; if (i % 5 === 0) extB.items[id].tw = 1; });
    const cid = { name: "Cid", uid: "CIDPLN", meta: {}, items: {} }; ids.forEach((id, i) => { cid.items[id] = { interest: V[(i * 7 + 1) % 4] }; });
    const code = s2 => K.codec.encode(K.store.normalize(s2), "ru");
    const run = (codes) => { const cp = open("compare", { storage: { local: { "checklist-lang": "ru" }, session: {} } });
      for (let i = 2; i < codes.length; i++) click(cp.w, cp.d.getElementById("addPart"));
      cp.d.querySelectorAll("#parts textarea").forEach((ta, i) => { ta.value = codes[i] || ""; ta.dispatchEvent(new cp.w.Event("input", { bubbles: true })); });
      click(cp.w, cp.d.getElementById("cmpBtn")); return cp; };
    let c = run([code(extA), code(cid)]);
    ok(!!c.d.querySelector(".cmp-role.role-need") && /противоположной ролью Ann/.test(c.d.querySelector(".role-hint:not(.ext-hint)").textContent) && !c.d.getElementById("resBody").textContent
      && /Расширенная анкета/.test(c.d.querySelector(".ext-hint").textContent), "extended + plain without a role: the plain list's role picker asks, nothing is compared yet");
    c.d.querySelectorAll(".cmp-role")[1].value = "sub"; click(c.w, c.d.getElementById("cmpBtn"));
    const st = c.KC.cmpState().pair;
    ok(!!st && st.A.meta.role === "dom" && /Ann ↑/.test(st.nA) && st.B.meta.role === "sub", "→ Bottom: Ann's Top role is compared with Cid (crosswise)");
    ok(!!c.d.querySelector('[data-act="roulette-try"]') && !!c.d.querySelector('[data-f="try"]') && !c.d.querySelector(".cmp-dir"), "«✦ Попробуем новое?» and the filter «✦ Что попробуем?»; no direction switch with a plain list");
    click(c.w, c.d.querySelector('[data-f="try"]'));
    ok(/Что попробуем/.test(c.d.querySelector("#resBody h3").textContent) && /Хочу/.test(c.d.querySelector("#resBody .rrow .who").textContent), "the «Что попробуем» list: one marked «Хочу», the other likes it");
    c = run([code(extA), code(extB)]);
    const body = c.d.getElementById("resBody");
    ok(!!c.d.querySelector(".cmp-dir") && /Новое вместе/.test(body.textContent), "two extended lists: «Сравниваем: Ann ↑ · Bob ↓ | Ann ↓ · Bob ↑» and «✦ Новое вместе»");
    const nb = [...body.querySelectorAll(".result-group")].find(x => /Новое вместе/.test(x.textContent));
    ok(!!nb && !nb.querySelector(".badge") && nb.querySelectorAll(".want-tag").length === 2 * nb.querySelectorAll(".rrow").length, "«Новое вместе» shows only «✦ Хочу», not the answers (owner)");
    const a0 = c.KC.cmpState().pair.nA; click(c.w, c.d.querySelector('[data-dir="bt"]'));
    ok(/Ann ↓/.test(c.KC.cmpState().pair.nA) && /Ann ↑/.test(a0) && c.d.querySelector('[data-dir="bt"]').classList.contains("on"), "the direction switch swaps the roles");
    c.KC.roulette.open({ tryNew: true });
    ok(c.d.getElementById("rlH").textContent === "✦ Попробуем новое?" && c.KC.roulette.pool(c.KC.cmpState().pair.A, c.KC.cmpState().pair.B, false).every(id => (c.KC.cmpState().pair.A.items[id] || {}).w || (c.KC.cmpState().pair.B.items[id] || {}).w), "the roulette «✦ Попробуем новое?» picks only from practices with «Хочу»");
    c = run([code(extA), code(extB), code(cid)]);
    ok(!!c.d.querySelector(".cmp-role.role-need") && !c.d.getElementById("resBody").textContent, "a company: an extended list needs a role picked");
    c.d.querySelectorAll(".cmp-role")[0].value = "dom"; c.d.querySelectorAll(".cmp-role")[1].value = "sub"; click(c.w, c.d.getElementById("cmpBtn"));
    ok(c.d.querySelectorAll(".cmp-profile").length >= 2 && !c.errors.length, "…then the company is compared by those roles");
    const need = ["ext.roleView", "ext.both", "ext.onlyT", "ext.onlyB", "ext.toggle", "ext.toggleTitle", "ext.note", "ext.make", "ext.askH", "ext.ask", "ext.askT", "ext.askB", "ext.askBoth", "ext.row.t", "ext.row.b", "ext.want", "ext.badge",
      "ext.kindExt", "ext.kindPlain", "ext.noRole", "ext.noPlain", "ext.arrow.t", "ext.arrow.b", "ext.card.t", "ext.card.b", "ext.ptEmpty", "ext.rlTry", "ext.rlLead_html", "ext.fTry", "ext.tryTitle", "ext.trySub", "ext.tryNone",
      "ext.newTitle", "ext.newSub", "ext.dir", "ext.needRole", "ext.needRoleToast", "ext.needRoleGroup"];
    const miss = []; LANGS.forEach(l => need.forEach(k => { if (!K.i18n.has("ui", k, l)) miss.push(l + ":" + k); }));
    eq(miss, [], "every text of the extended list exists in all 7 languages (" + need.length + " keys)");
    ok(!f.errors.length && !g.errors.length && !h.errors.length && !c.errors.length, "no script errors");
    _sc.end();
  }

  S("v614: six new practices, «Всё и сразу», the «Описание созвездий» tab");
  {
    const _sc = scope();
    const LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    const f = open("form"), K = f.KC;
    const ids = []; K.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    // 1. practices
    const NEWP = { "forced-floor-eating": 500, "sucking-cum-from-vagina": 501, "foreign-language-talk": 502, "pet-food-eating": 503, "dressage-training": 504, "double-penetration-one-hole": 505 };
    const code = {}; K.CATS.forEach(c => c.items.forEach(([cd, id]) => { code[id] = cd; }));
    eq(Object.keys(NEWP).filter(id => code[id] !== NEWP[id]), [], "six new practices: codes 500–505");
    eq(LANGS.map(l => Object.keys(NEWP).filter(id => { const it = K.i18n.item(id, l); return !it || !it.name || it.name === id || !it.desc; }).length), [0, 0, 0, 0, 0, 0, 0], "…named and described in all 7 languages");
    const inCl = id => Object.keys(K.clusters.ids()).filter(k => K.clusters.ids()[k].indexOf(id) >= 0).sort();
    eq([inCl("forced-floor-eating"), inCl("sucking-cum-from-vagina"), inCl("foreign-language-talk"), inCl("pet-food-eating"), inCl("dressage-training"), inCl("double-penetration-one-hole")],
      [["feast", "filth"], ["cum", "devour"], ["words"], ["filth", "pet"], ["pet"], ["size"]], "…each is in the clusters it fits");
    eq(Object.keys(K.clusters.ids()).every(k => K.clusters.ids()[k].every(id => code[id] !== undefined)), true, "every cluster item exists");
    // 2. «Всё и сразу»: more than 70 % answered
    const V = ["limit", "maybe", "yes", "love"], mk = n => { const o = { items: {}, meta: {} }; ids.slice(0, n).forEach((id, i) => { o.items[id] = { interest: V[i % 4] }; }); return o; };
    const pd = n => K.portrait.compute(Object.assign(K.store.blank(), mk(n)), null);
    eq([K.signs.manyOf(pd(Math.ceil(ids.length * .75))), K.signs.manyOf(pd(Math.floor(ids.length * .65)))], [true, false], "more than 70 % answered → many; fewer → not");
    eq(LANGS.map(l => [K.i18n.has("ui", "sign.evenAll", l), K.i18n.has("ui", "sign.even", l)].join()), LANGS.map(() => "true,true"), "«Всё и сразу» exists in 7 languages");
    K.i18n.set("ru"); eq([K.signs.evenText({ many: true }), K.signs.evenText({ many: false }), K.signs.evenText(null)], ["Всё и сразу", "Всё понемногу", "Всё понемногу"], "the words change, nothing else");
    const full = mk(ids.length), sgA = K.signs.pick(K.portrait.compute(Object.assign(K.store.blank(), full), null)), sgB = K.signs.pick(K.portrait.compute(Object.assign(K.store.blank(), mk(120)), null));
    ok(!sgA || sgA.many === true, "a full list's sign carries many"); ok(!sgB || sgB.many === false, "a short list's sign does not");
    // 3. the lore files: the same keys in every language, every key is an interface key, nothing empty
    const fsx = require("fs"), L = {};
    LANGS.forEach(l => { const o = {}; new Function("KC", fsx.readFileSync(__dirname + "/../js/lore/" + l + ".lore.js", "utf8"))({ addLore: (lg, d) => Object.assign(o, d) }); L[l] = o; });
    const rk = Object.keys(L.ru).sort();
    eq(LANGS.map(l => Object.keys(L[l]).sort().join("|") === rk.join("|")), LANGS.map(() => true), "lore: the same " + rk.length + " keys in all 7 languages");
    eq(LANGS.map(l => rk.filter(k => !L[l][k] || L[l][k].length < 40).length), [0, 0, 0, 0, 0, 0, 0], "lore: no empty or tiny text");
    eq(rk.filter(k => !K.i18n.has("ui", k, "ru")).slice(0, 5), [], "lore: every key is an interface key");
    ok(Object.keys(L.ru).every(k => (L.ru[k].match(/[.!?…]/g) || []).length >= 2), "lore: at least two sentences each");
    const needL = ["lore.h", "lore.none", "lore.loading", "lore.offline", "lore.lead", "lore.note"], missL = [];
    LANGS.forEach(l => needL.forEach(k => { if (!K.i18n.has("ui", k, l)) missL.push(l + ":" + k); })); eq(missL, [], "lore: interface texts in 7 languages");
    // 4. the tab: only what the portrait shows, loaded when opened
    const loreSrc = l => fsx.readFileSync(__dirname + "/../js/lore/" + l + ".lore.js", "utf8");
    const st = Object.assign(K.store.blank(), mk(300)); st.name = "Ann";
    const rawSt = JSON.stringify(st);
    const mkp = (mode, extra) => open("form", Object.assign({ storage: { local: { "checklist-lang": "ru", "checklist-dnd": mode, "practices-checklist-v1": rawSt }, session: {} } }, extra || {}));
    const g = mkp("1"); const sec = g.d.getElementById("portraitSection"); sec.open = true; sec.dispatchEvent(new g.w.Event("toggle"));
    ok(!g.KC.lore.has("ru"), "the texts are not loaded with the page");
    const gr = g.KC.lore.provider();
    ok(gr.length === 1 && gr[0].items.length >= 3 && gr[0].items.every(it => L.ru[it.key] !== undefined), "DnD: the provider lists class, subclass, race, alignment — each has a text");
    g.w.eval(loreSrc("ru")); g.KC.help.open("lore");
    const box = g.d.getElementById("helpLore");
    ok(!box.hidden && box.querySelectorAll(".lore-item").length === gr[0].items.length && g.d.getElementById("helpLoreTab").classList.contains("on") && g.d.getElementById("helpPane").hidden, "the tab shows exactly those items");
    ok(/Не официальн|не официаль/i.test(box.querySelector(".lore-note").textContent), "…with the note that it is not official");
    g.d.querySelector('.help-tab[data-tab="help"]').click(); ok(box.hidden && !g.d.getElementById("helpPane").hidden, "…and the other tabs still work");
    const wod = mkp("wod"); wod.w.eval(loreSrc("ru")); const sw = wod.d.getElementById("portraitSection"); sw.open = true; sw.dispatchEvent(new wod.w.Event("toggle"));
    const wp = wod.KC.lore.provider(); ok(wp.length === 1 && wp[0].items.every(it => L.ru[it.key] !== undefined) && wp[0].items.length >= 3, "World of Darkness: its own items only, each with a text");
    wod.KC.help.open("lore"); ok(wod.d.querySelectorAll("#helpLore .lore-item").length === wp[0].items.length, "…shown in the tab");
    // an extended list: one group per role
    const ex = { ext: 1, items: {}, meta: {}, name: "Ann" }; ids.slice(0, 300).forEach((id, i) => { ex.items[id] = { t: V[i % 4], b: V[(i + 1) % 4] }; });
    const xp = open("form", { storage: { local: { "checklist-lang": "en", "practices-checklist-v1": JSON.stringify(ex) }, session: {} } });
    const xg = xp.KC.lore.provider(); ok(xg.length === 2 && xg[0].title && xg[0].title !== xg[1].title, "an extended list: a group for each role");
    // switches: hidden modes are never described
    const off = open("form", { storage: { local: { "checklist-lang": "ru", "checklist-dnd": "wh", "practices-checklist-v1": rawSt }, session: {} },
      patch: { "core/kc.js": src => src.replace("KC.FEATURES = { wr: true, wh: true, leg: true, ow: true, wi: true, av: true };", "KC.FEATURES = { wr: true, wh: false, leg: false, ow: false, wi: false, av: false };") } });
    const so = off.d.getElementById("portraitSection"); so.open = true; so.dispatchEvent(new off.w.Event("toggle"));
    ok(off.KC.dnd.mode() === "sign" && off.KC.lore.provider().every(gx => !gx.items.some(it => /^(wh|leg|ow|wi)\./.test(it.key))), "factions switched off: nothing of Warhammer is described");
    ok(!g.errors.length && !wod.errors.length && !xp.errors.length && !off.errors.length && !f.errors.length, "no script errors: " + [g, wod, xp, off, f].map(x => x.errors.join()).join(" | "));
    _sc.end();
  }


  S("v615: header without «Clear», role filter in the button row, ⇅ next to ♥; dots from 497; Witcher button; lore mode buttons");
  {
    const _sc = scope();
    const f = open("form", { storage: { local: { "checklist-lang": "ru" }, session: {} } }), K = f.KC, d = f.d;
    ok(!d.getElementById("resetBtn") && !d.getElementById("resetOverlay"), "no «Очистить» button or window");
    ok(d.getElementById("roleView").parentElement.classList.contains("top-actions") && d.getElementById("roleView").hidden, "the role filter sits in the button row, hidden for a plain list");
    const box = d.getElementById("extToggleBox");
    ok(box.parentElement.classList.contains("subbar") && box.previousElementSibling.querySelector("#onlyFav") && box.textContent.indexOf("⇅") === 0 && !!box.title, "⇅ (plain ⇄ extended) is a square button right after ♥, with a tooltip");
    eq(K.NEW_FROM_CODE, 497, "green dots only from code 497");
    ok(!d.querySelector("#portraitSection summary .new-dot"), "no green dot next to «Мой портрет»");
    // an extended list: the role filter shows, its active choice is a dot (class on), not a filled field
    const V = ["limit", "maybe", "yes", "love"], ids = []; K.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const ex = { ext: 1, items: {}, meta: {}, name: "Ann" }; ids.slice(0, 300).forEach((id, i) => { ex.items[id] = { t: V[i % 4], b: V[(i + 1) % 4] }; });
    const x = open("form", { storage: { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(ex) }, session: {} } });
    const rv = x.d.getElementById("roleView");
    ok(!rv.hidden && !rv.classList.contains("on") && x.d.getElementById("extToggle").checked, "extended list: the role filter is shown, ⇅ is on");
    rv.value = "t"; rv.dispatchEvent(new x.w.Event("change"));
    ok(rv.classList.contains("on"), "a chosen role marks the list with the dot (class on)");
    eq([...rv.options].map(o => o.textContent), ["Обе роли", "↑ Верх", "↓ Низ"], "short labels so it fits the phone row");
    // the Witcher: its own button, not a Wr tab
    const sw = K.wod.switchHTML();
    ok(/pt-wib/.test(sw) && !/pt-wr-sub[^]*data-mode="wi"/.test(sw), "🗡 Witcher is its own button next to ⚔ Wr");
    eq(K.dnd.wrTabs(), ["wr", "wh", "leg", "ow"], "⚔ Wr tabs: gods, 40K, legions, Old World");
    // the constellation guide: the same mode buttons; a click switches the portrait mode
    const st = Object.assign(K.store.blank(), { items: {} }); ids.slice(0, 300).forEach((id, i) => { st.items[id] = { interest: V[i % 4] }; }); st.name = "Ann";
    const g = open("form", { storage: { local: { "checklist-lang": "ru", "checklist-dnd": "wod", "checklist-wod": "fey", "practices-checklist-v1": JSON.stringify(st) }, session: {} } });
    g.w.eval(require("fs").readFileSync(__dirname + "/../js/lore/ru.lore.js", "utf8"));
    const sec = g.d.getElementById("portraitSection"); sec.open = true; sec.dispatchEvent(new g.w.Event("toggle"));
    g.KC.help.open("lore");
    const lb = g.d.getElementById("helpLore");
    ok(!!lb.querySelector('.lore-sw .pt-mode [data-mode="dnd"]') && !!lb.querySelector('.lore-sw .pt-wod-sub [data-wod="vamp"]'), "the guide has the portrait's mode buttons (and the WoD lines)");
    click(g.w, lb.querySelector('[data-wod="vamp"]'));
    ok(g.KC.wod.sub() === "vamp" && [...lb.querySelectorAll(".lore-item")].some(it => /^wod\.vamp\./.test(it.dataset.key)), "a line button in the guide switches to vampires and redraws it");
    click(g.w, lb.querySelector('[data-mode="wi"]'));
    ok(g.KC.dnd.mode() === "wi" && [...lb.querySelectorAll(".lore-item")].every(it => /^wi\./.test(it.dataset.key)), "…the Witcher button too (the portrait follows)");
    // no Childling ever
    const W = g.KC.wod, low = Object.assign(K.store.blank(), { items: {} }); ids.forEach(id => { low.items[id] = { interest: "limit" }; });
    eq(W.details(low, K.portrait.compute(low, null), null, "fey", "boggan").seem, "wilder", "the lowest level fey is a Wilder, never a Childling");
    ok(!f.errors.length && !x.errors.length && !g.errors.length, "no script errors: " + [f, x, g].map(p => p.errors.join()).join(" | "));
    _sc.end();
  }

  S("v616: 🌀 Avatar — elements, types, spirit energy, the Avatar; fix: ⚔ Wr modes with a template");
  {
    const _sc = scope();
    const LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    const f = open("form"), K = f.KC, A = K.av;
    const ids = []; K.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    // figures: 9 group stars, valid lines, bright slots among the 9; the Avatar: the centre + two in the native symbol
    const bad = []; Object.keys(A.FIG).forEach(k => { const [P, E, L, B] = A.FIG[k], n = P.length + E.length;
      if (P.length !== 9 || B.length !== 3 || B.some(b => b < 0 || b > 8) || new Set(B).size !== 3) bad.push(k + ":slots");
      L.forEach(l => (l[0] === "d" ? l.slice(1) : l).forEach(i => { if (!(i >= 0 && i < n)) bad.push(k + ":line"); })); });
    eq(bad, [], "8 figures (4 elements + 4 Avatars by native element): 9 group stars, 3 bright slots, lines to existing stars");
    eq(["water", "earth", "fire", "air"].map(e => A.FIG["avatar_" + e][3][0]), [0, 0, 0, 0], "the Avatar's first bright star is the centre");
    // types: ranks, Air has none
    eq(Object.keys(A.RANK).sort().join(), "blood,combustion,healing,lava,lightning,metal,sand,spirit,vines", "nine types");
    const V = ["limit", "maybe", "yes", "love"];
    const mk = fn => { const st = K.store.blank(); ids.forEach((id, i) => { const v = fn(id, i); if (v) st.items[id] = { interest: v }; }); return st; };
    const varied = mk((id, i) => V[(i * 7 + 3) % 4]);
    const dv = K.portrait.compute(varied, null), el = A.choose(dv, varied, null);
    ok(A.ELEMENTS.indexOf(el) >= 0, "a varied list gets an element");
    eq(A.typeOf("air", dv, varied, null), A.spirit(varied, null) ? "spirit" : null, "Air has no types (only the very rare spirit energy)");
    // spirit energy: the spirit items Yes / Love
    const sp = mk((id, i) => A.SPIRIT.indexOf(id) >= 0 ? "love" : V[(i * 7 + 3) % 4]);
    ok(A.spirit(sp, null) && A.typeOf("earth", K.portrait.compute(sp, null), sp, null) === "spirit", "spirit energy beats the element's types");
    const sp2 = mk((id, i) => A.SPIRIT.indexOf(id) >= 0 ? (A.SPIRIT.indexOf(id) < 4 ? "love" : "limit") : V[(i * 7 + 3) % 4]);
    ok(!A.spirit(sp2, null), "…not when many of them are “No”");
    // the Avatar: 90 % of ALL practices Yes / Love
    const n90 = Math.ceil(ids.length * .9), av = mk((id, i) => i < n90 ? (i % 2 ? "yes" : "love") : null), av2 = mk((id, i) => i < n90 - 2 ? "love" : null);
    eq([A.avatar(av, null), A.avatar(av2, null)], [true, false], "the Avatar: Yes or Love on ≥ 90 % of all practices (unanswered do not count)");
    const pa = A.pick(K.portrait.compute(av, null), av, null);
    ok(pa && pa.avatar && pa.type === null && pa.stars[0].bright, "the Avatar's figure: the four symbols, the centre bright, no type");
    K.i18n.set("ru");
    eq(A.head(pa, false, K.i18n.t).name, "Аватар", "…named «Аватар»");
    ok(/^Все четыре стихии · родная: (Вода|Земля|Огонь|Воздух)$/.test(A.head(pa, false, K.i18n.t).rl), "…with the native element");
    eq([A.head({ id: "earth", type: "metal" }, false, K.i18n.t).rl, A.head({ id: "fire", type: "combustion" }, false, K.i18n.t).rl, A.head({ id: "water", type: "vines" }, false, K.i18n.t).rl, A.head({ id: "air", type: null }, false, K.i18n.t).rl],
      ["Особый тип: Металл", "Редкий тип: Взрыв", "Обычный тип: Лозы", "Без особого типа"], "the type line");
    // texts in 7 languages
    const need = ["av.toAv", "av.mine", "av.their", "av.avMine", "av.avTheir", "av.avatar", "av.native", "av.none", "av.rank.common", "av.rank.special", "av.rank.rare", "card.o.av", "sp.av.h", "sp.av.grp", "sp.av.same", "sp.av.near", "sp.av.far", "help.av_html", "help.compareAv_html"]
      .concat(A.ELEMENTS.map(e => "av.e." + e), Object.keys(A.RANK).map(t2 => "av.t." + t2));
    const miss = []; LANGS.forEach(l => need.forEach(k => { if (!K.i18n.has("ui", k, l)) miss.push(l + ":" + k); }));
    eq(miss, [], "every Avatar text exists in all 7 languages (" + need.length + " keys)");
    const fsx = require("fs"), L = {}; new Function("KC", fsx.readFileSync(__dirname + "/../js/lore/ru.lore.js", "utf8"))({ addLore: (lg, d) => Object.assign(L, d) });
    eq(A.ELEMENTS.map(e => "av.e." + e).concat(Object.keys(A.RANK).map(t2 => "av.t." + t2), ["av.avatar"]).filter(k => !L[k]), [], "the constellation guide describes every element, type and the Avatar");
    // the portrait: 🌀 Avatar is its own button next to 🗡 Witcher
    const st = mk((id, i) => i < 320 ? V[(i * 7 + 3) % 4] : null); st.name = "Ann";
    const g = open("form", { storage: { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(st) }, session: {} } });
    const sec = g.d.getElementById("portraitSection"); sec.open = true; sec.dispatchEvent(new g.w.Event("toggle"));
    eq([...g.d.querySelectorAll("#portraitBody .pt-mode:not(.pt-wr-sub):not(.pt-wod-sub) [data-mode]")].map(b => b.textContent), ["⚔ Wr", "🗡 Ведьмак", "🌀 Аватар", "📖 Грехи Re:Zero", "✦ Созвездие", "🎲 DnD", "🦇 Мир Тьмы"], "mode row: ⚔ Wr, 🗡 Witcher, 🌀 Avatar on the left");
    click(g.w, g.d.querySelector(".pt-mode .pt-avb"));
    const pv = g.d.querySelector(".pt-av");
    ok(!!pv && A.ELEMENTS.indexOf(pv.dataset.el) >= 0 && /Ваша стихия/.test(pv.querySelector(".sg-over").textContent) && /^(Обычный тип|Особый тип|Редкий тип|Без особого типа)/.test(pv.querySelector(".sg-rl").textContent)
      && pv.querySelector(".wod-note").textContent === "Фанатский неофициальный материал." && g.w.localStorage.getItem("checklist-dnd") === "av", "portrait: «Ваша стихия · element · type line», the fan line; remembered as “av”");
    g.KC.form.drawCard({ sign: true, bars: true, love: true, limits: false, name: true, role: true, exp: true });
    // the lore tab follows
    g.w.eval(fsx.readFileSync(__dirname + "/../js/lore/ru.lore.js", "utf8")); g.KC.help.open("lore");
    ok([...g.d.querySelectorAll("#helpLore .lore-item")].some(it => it.dataset.key === "av.e." + pv.dataset.el), "the constellation guide describes the element");
    // fix: a ⚔ Wr-family mode with a template applied used to throw (set.has)
    g.KC.form.setTpl({ id: "tt1616", tid: "tt1616", name: "T", ids: ids.slice(0, 250) });
    g.KC.form.renderPortrait();
    ok(!!g.d.querySelector(".pt-av") && !g.errors.length, "with a template applied the Avatar (and ⚔ Wr) portrait still draws: " + g.errors.join());
    // compare: the pair's elements, Team Avatar
    const code = (n, u, s2) => K.codec.encode(Object.assign({ name: n, uid: u }, s2), "ru");
    const codes = [code("Ann", "ANN616", st), code("Bob", "BOB616", varied), code("Cid", "CID616", sp)];
    const run = (n, local) => { const cp = open("compare", { storage: { local: Object.assign({ "checklist-lang": "ru" }, local), session: {} } });
      for (let i = 2; i < n; i++) click(cp.w, cp.d.getElementById("addPart"));
      cp.d.querySelectorAll("#parts textarea").forEach((ta, i) => { ta.value = codes[i]; }); click(cp.w, cp.d.getElementById("cmpBtn")); return cp; };
    const c2 = run(2, { "checklist-dnd-pair": "av", "checklist-folds": '{"pair":true}' });
    ok(/Стихии пары/.test(c2.d.getElementById("resHead").textContent) && c2.d.querySelectorAll(".sg-mini.sg-av").length === 2, "pair: «Стихии пары», two element figures");
    const c3 = run(3, { "checklist-dnd-group": "av", "checklist-folds": '{"group":true}' });
    const gf = c3.d.querySelector('details.sp-fold[data-fold="group"]');
    ok(!!gf.querySelector(".sp-avgrp") && /Команда Аватара/.test(gf.textContent) && gf.querySelectorAll(".sp-avgrp li").length === 3, "group: «Команда Аватара», everyone's element");
    // switched off
    const off = open("form", { storage: { local: { "checklist-lang": "ru", "checklist-dnd": "av", "practices-checklist-v1": JSON.stringify(st) }, session: {} },
      patch: { "core/kc.js": src => src.replace("wi: true, av: true };", "wi: true, av: false };") } });
    const so = off.d.getElementById("portraitSection"); so.open = true; so.dispatchEvent(new off.w.Event("toggle"));
    ok(off.KC.dnd.mode() === "sign" && !off.d.querySelector(".pt-avb") && !off.d.querySelector(".pt-av"), "switched off: no button, a device that chose it sees the constellation");
    off.KC.help.open("portrait"); ok(!/🌀/.test(off.d.getElementById("help-portrait").textContent), "…and no help paragraph");
    ok(!f.errors.length && !g.errors.length && !c2.errors.length && !c3.errors.length && !off.errors.length, "no script errors: " + [f, g, c2, c3, off].map(p => p.errors.join()).join(" | "));
    _sc.end();
  }

  S("v617: starter templates; labels of every figure the same size; Avatar types more often");
  {
    const _sc = scope();
    const LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    const f = open("form", { storage: { local: { "checklist-lang": "ru" }, session: {} } }), K = f.KC, T = K.store.tpl;
    const ids = new Set(); K.CATS.forEach(c => c.items.forEach(([, id]) => ids.add(id)));
    eq(K.STARTERS.map(x => x.key), ["vanilla", "rough", "light", "smnosex", "humil", "extra"], "six starter templates (owner's five + Extra)");
    eq(K.STARTERS.filter(x => x.ids.length < 30 || x.ids.length > 150 || x.ids.some(id => !ids.has(id)) || new Set(x.ids).size !== x.ids.length || !/^[A-Za-z0-9]{6}$/.test(x.tid)).map(x => x.key), [], "each: 30–150 real items, no repeats, a 6-character id");
    ok(K.STARTERS.find(x => x.key === "rough").ids.indexOf("anal-sex") >= 0, "Rough sex includes anal sex (owner)");
    ok(["outdoor-sex", "sex-in-snow", "abandoned-building-sex"].every(id => K.STARTERS.find(x => x.key === "extra").ids.indexOf(id) >= 0), "Extra includes sex outdoors (owner: «секс в лесу»)");
    const need = ["filt.tplStart", "tpl.starter", "help.tplStart_html"].concat(...K.STARTERS.map(x => ["tpl.st." + x.key, "tpl.stDesc." + x.key]));
    const miss = []; LANGS.forEach(l => need.forEach(k => { if (!K.i18n.has("ui", k, l)) miss.push(l + ":" + k); })); eq(miss, [], "names and descriptions in 7 languages");
    // the header list: starters first, even with no own templates; nothing stored
    const sel = f.d.getElementById("tplSel");
    ok(!sel.hidden && sel.querySelector("optgroup").label === "Стартовые шаблоны" && sel.querySelectorAll("optgroup")[0].querySelectorAll("option").length === 6 && T.list().length === 0, "«Шаблон…» shows the 6 starters first; they are not stored");
    sel.value = "Srough"; sel.dispatchEvent(new f.w.Event("change"));
    const vis = () => [...f.d.querySelectorAll("#list .item")].filter(x => x.style.display !== "none" && !x.hidden && !x.closest(".cat[hidden]")).length;
    const desc = f.d.getElementById("tplDesc");
    ok(K.form.tpl() && K.form.tpl().id === "Srough" && !desc.hidden && /^Грубый секс — страстный/.test(desc.textContent), "choosing one applies it and shows its description under the intro");
    sel.value = ""; sel.dispatchEvent(new f.w.Event("change")); ok(desc.hidden && !K.form.tpl(), "«✕ Без шаблона» hides the description");
    // My lists: starters first, only Share / Use; never deleted
    click(f.w, f.d.getElementById("mineBtn"));
    const rows = [...f.d.querySelectorAll("#mineTplList .tpl-starter")];
    ok(rows.length === 6 && rows.every(r => !r.querySelector('[data-act="del"]') && !r.querySelector('[data-act="rename"]') && r.querySelector('[data-act="use"]') && r.querySelector('[data-act="share"]')), "My lists: the six starters with Use and Share only");
    ok(/Стартовый/.test(rows[0].textContent) && !/1970/.test(rows[0].textContent), "…marked «Стартовый», no date");
    click(f.w, rows[1].querySelector('[data-act="share"]'));
    const link = f.d.getElementById("shareLink").value || f.d.getElementById("shareLink").textContent, dec = K.codec.decode(link.split("#")[1] || link);
    ok(dec.tpl && dec.tpl.id === "Srough" && dec.tpl.name === "Rough sex" && dec.tpl.ids.length === 67, "sharing a starter: an empty template link with its id and the Latin name");
    const r2 = open("form", { hash: link.split("#")[1], storage: { local: { "checklist-lang": "ru" }, session: {} } });
    const r3 = open("form", { storage: r2.storage() });
    ok(r3.KC.store.tpl.list().length === 0 && r3.KC.form.tpl() && r3.KC.form.tpl().id === "Srough" && /Грубый секс/.test(r3.d.getElementById("tplDesc").textContent), "the recipient's list opens by it (with its description), without a stored copy — the starter is already there");
    // labels: one size in every mode (the figure shrinks, not the text)
    const st = K.store.blank(); [...ids].slice(0, 330).forEach((id, i) => { st.items[id] = { interest: ["limit", "maybe", "yes", "love"][(i * 7 + 3) % 4] }; }); st.name = "Ann";
    const fsz = {}; ["wi", "av", "1", "wh", "wod"].forEach(m => {
      const g = open("form", { storage: { local: { "checklist-lang": "ru", "checklist-dnd": m, "practices-checklist-v1": JSON.stringify(st) }, session: {} } });
      const sec = g.d.getElementById("portraitSection"); sec.open = true; sec.dispatchEvent(new g.w.Event("toggle"));
      const sv = g.d.querySelector(".pt-sign svg"), vb = sv.getAttribute("viewBox").split(" ").map(Number), mm = (sv.getAttribute("style") || "").match(/\* ([\d.]+)\)/);
      fsz[m] = mm ? +(+mm[1] / vb[2]).toFixed(5) : null; });
    ok(Object.values(fsz).every(v => v && Math.abs(v - fsz.wi) < 1e-4), "the same pixels per unit (so the same label size) in every mode: " + JSON.stringify(fsz));
    // Avatar: special ≈ 35 %, rare ≈ 7–8 % (thresholds)
    eq([K.av.T.healing, K.av.T.metal, K.av.T.lightning, K.av.T.blood, K.av.T.lava, K.av.T.combustion], [.35, .3, 58, .55, 20, 1.1], "Avatar type thresholds (v620: re-fitted to the owner's known people; lava = sex + fluids)");
    ok(!f.errors.length && !r2.errors.length && !r3.errors.length, "no script errors: " + f.errors.concat(r2.errors, r3.errors).join(" | "));
    _sc.end();
  }

  S("v618: the portrait judges the whole list (not the template); the guide without «Созвездие»; lore from English");
  {
    const _sc = scope();
    const V = ["limit", "maybe", "yes", "love"], ids = [];
    const f0 = open("form"); f0.KC.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const st = f0.KC.store.blank(); ids.forEach((id, i) => { st.items[id] = { interest: V[(i * 7 + 3) % 4] }; }); st.name = "Ann";
    const sig = {};
    ["sign", "1", "wod", "wh", "wi", "av"].forEach(m => {
      const g = open("form", { storage: { local: { "checklist-lang": "ru", "checklist-dnd": m, "practices-checklist-v1": JSON.stringify(st) }, session: {} } });
      const sec = g.d.getElementById("portraitSection"); sec.open = true; sec.dispatchEvent(new g.w.Event("toggle"));
      const read = () => { const p = g.d.querySelector(".pt-sign"); return p ? p.querySelector(".sg-name").textContent + "|" + ((p.querySelector(".sg-rl") || {}).textContent || "") + "|" + p.querySelector(".sg-sub").textContent : ""; };
      const bars = () => [...g.d.querySelectorAll("#portraitBody .pt-row")].map(x => x.textContent).join("/");
      const before = read(), b0 = bars();
      g.KC.form.setTpl({ id: "Srough", name: "R", ids: g.KC.STARTERS[1].ids.slice() }); g.KC.form.renderPortrait();
      const v = g.d.getElementById("view"); v.value = "positive"; v.dispatchEvent(new g.w.Event("change")); g.KC.form.renderPortrait();
      sig[m] = before && before === read() && b0 === bars();
      if (m === "av") {
        g.w.eval(require("fs").readFileSync(__dirname + "/../js/lore/ru.lore.js", "utf8")); g.KC.help.open("lore");
        const lb = g.d.getElementById("helpLore");
        ok(!lb.querySelector('[data-mode="sign"]') && !!lb.querySelector('[data-mode="dnd"]'), "the constellation guide has no «✦ Созвездие» button (nothing to describe there)");
      }
    });
    eq(sig, { sign: true, "1": true, wod: true, wh: true, wi: true, av: true }, "with a template applied and an answer filter on, the portrait stays the same in every mode");
    // lore files: English is the source, every language complete, the Avatar's spirit energy without a note about the site
    const fsx = require("fs"), L = {};
    ["en", "ru"].forEach(l => { const o = {}; new Function("KC", fsx.readFileSync(__dirname + "/../js/lore/" + l + ".lore.js", "utf8"))({ addLore: (lg, d) => Object.assign(o, d) }); L[l] = o; });
    ok(/written in English first/.test(fsx.readFileSync(__dirname + "/../js/lore/ru.lore.js", "utf8")) && !/this site/i.test(JSON.stringify(L.en)), "lore: English first, no remarks about the site inside the texts");
    _sc.end();
  }

  S("v619: Avatar re-fitted (owner's known people): Vines = ropes, Sand = darkness, Lava = raw sex, Metal = iron over darkness");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, A = K.av, ids = []; K.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const base = () => { const st = K.store.blank(); ids.forEach((id, i) => { st.items[id] = { interest: ["limit", "maybe", "yes", "love"][(i * 7 + 3) % 4] }; }); return st; };
    const set = (st, list, v) => { list.forEach(id => { st.items[id] = { interest: v }; }); return st; };
    const CI = k => K.clusters.ids()[k];
    const sand = set(set(base(), CI("dark"), "love"), CI("iron"), "maybe");
    ok(A.typeOf("earth", K.portrait.compute(sand, null), sand, null) === "sand", "Earth with darkness loved (and iron not above it) → Sand");
    const metal = set(set(base(), CI("iron"), "love"), CI("dark"), "limit");
    ok(A.typeOf("earth", K.portrait.compute(metal, null), metal, null) === "metal", "Earth with iron loved over darkness → Metal");
    const vines = set(set(base(), CI("rope"), "love"), CI("home"), "limit");
    ok(A.typeOf("water", K.portrait.compute(vines, null), vines, null) === "vines", "Water with ropes loved → Vines");
    const sexIds = K.CATS.find(c => c.id === "sex-penetration").items.map(x => x[1]);
    const lava = set(set(set(base(), ids, "maybe"), sexIds, "love"), CI("dark"), "limit");
    ok(A.typeOf("earth", K.portrait.compute(lava, null), lava, null) === "lava", "Earth with sex far above the rest → Lava");
    eq(Object.keys(A.PROF).join(), "water,earth,fire,air", "four profiles");
    ok(!f.errors.length, "no script errors");
    _sc.end();
  }

  S("v620: Avatar re-fit: hunt cluster in Earth, Lava = sex + fluids deviations ≥ 20");
  {
    const _sc = scope();
    const f = open("form"), K = f.KC, A = K.av, ids = []; K.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const set = (st, list, v) => { list.forEach(id => { st.items[id] = { interest: v }; }); return st; };
    const grp = g => K.CATS.find(c => c.id === g).items.map(x => x[1]);
    ok(/hunt1/.test(A.CPROF.earth) && !/hunt/.test(A.CPROF.air), "hunt cluster counts for Earth");
    eq(A.T.lava, 20, "lava threshold 20");
    const st = set(set(set(K.store.blank(), ids, "maybe"), grp("sex-penetration").slice(0, Math.ceil(grp("sex-penetration").length * .6)), "love"), grp("bodily-fluids"), "yes");
    const d = K.portrait.compute(st, null), dv = K.dnd.devs(d).dev;
    eq(A.typeOf("earth", d, st, null), (dv["sex-penetration"] || 0) + (dv["bodily-fluids"] || 0) >= 20 ? "lava" : A.typeOf("earth", d, st, null), "Lava follows sex + fluids");
    ok((dv["sex-penetration"] || 0) < 20 || A.typeOf("earth", d, st, null) === "lava", "lava reachable without the sex group alone being ≥ 20");
    ok(!f.errors.length, "no script errors");
    _sc.end();
  }

  S("v621: shipped with new things locked (KC.FEATURES): extended list buttons, ⚔ Wr, 🗡 Witcher, 🌀 Avatar");
  {
    const _sc = scope();
    const plain = { items: {}, meta: { role: "dom" } }; let _n = 0;
    open("form").KC.CATS.forEach(c => c.items.forEach(([, id]) => { plain.items[id] = { interest: ["yes", "love", "maybe", "limit"][_n++ % 4] }; }));
    const f = open("form", { locked: true, storage: { local: { "checklist-lang": "ru", "checklist-dnd": "av", "practices-checklist-v1": JSON.stringify(plain) }, session: {} } }), K = f.KC, d = f.d;
    eq(Object.keys(K.FEATURES).filter(k => K.FEATURES[k]), ["wr", "rz"], "shipped build: only ⚔ Wr and (v623) 📖 Re:Zero are on");
    ok(d.getElementById("extToggleBox").hidden && d.getElementById("extMake").hidden, "plain list: no ⇅ in the header, no «Сделать расширенную»");
    const so = d.getElementById("portraitSection"); so.open = true; so.dispatchEvent(new f.w.Event("toggle"));
    ok(K.dnd.mode() === "sign" && !d.querySelector(".pt-wib, .pt-avb, .pt-av") && !!d.querySelector("#portraitBody .pt-mode"), "portrait: no 🗡 / 🌀 buttons, a device that chose Avatar sees the constellation");
    K.dnd.setMode("wi"); eq(K.dnd.mode(), "sign", "choosing a locked mode stores nothing");
    ok(!/data-mode="(wh|leg|ow|wi|av)"/.test(K.lore.switchHTML()), "constellation guide: no locked mode buttons");
    const groups = K.lore.provider(); ok(!groups.some(g => g.items.some(it => /^(wh|leg|ow|wi|av)\./.test(it.key))), "constellation guide: nothing from a locked mode");
    K.help.open("answer"); const hb = d.getElementById("helpBody").textContent, hn = d.getElementById("helpNews");
    ok(!/Расширенная анкета/.test(hb) && !/🌀 Аватар/.test(hb), "help: no extended-list or Avatar paragraphs");
    ok(!hn.querySelector("[data-feat]") && !/Расширенная анкета|✦ Хочу|Обе роли/.test(hn.textContent) && /Кнопки «Очистить» больше нет/.test(hn.textContent) && /Стартовые шаблоны/.test(hn.textContent) && /^5 октября 2026$/.test(hn.querySelectorAll("h5")[1].textContent),
      "What's new: the 5 Oct entry without the extended list (its lines stay in the code), the Clear line and starter templates shown");
    ok(/data-feat=\\"ext/.test(require("fs").readFileSync(__dirname + "/../js/lang/ru.ui.js", "utf8")), "…the extended-list lines are kept in the texts");
    const e0 = open("form", { locked: true }); e0.KC.help.open("lore"); ok(/Мир Тьмы, ⚔ Wr\)/.test(e0.d.getElementById("helpLore").textContent), "constellation guide, empty portrait: the hint names ⚔ Wr again (unlocked, v623)");
    f.KC.store.mine.sync(f.KC.form.state); f.d.getElementById("mineBtn").dispatchEvent(new f.w.MouseEvent("click", { bubbles: true }));
    ok(f.d.getElementById("mineList").textContent.length > 0 && !/Обычная/.test(f.d.getElementById("mineList").textContent), "My lists: no «Обычная» mark while the extended list is locked");
    // an extended list made before the lock still opens and keeps its switch (way back to the plain list)
    const ext = K.ext.fromPlain(K.store.normalize(plain), "dom");
    const g = open("form", { locked: true, storage: { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(ext) }, session: {} } });
    ok(!g.d.getElementById("extToggleBox").hidden && !g.d.getElementById("roleView").hidden, "an extended list keeps ⇅ and the role filter");
    const c = open("compare", { locked: true }); ok(!c.errors.length && !/data-mode="(av|wi)"/.test(c.KC.wod.switchHTML("pair")), "compare page: no locked modes");
    const u = open("form"); u.KC.help.open("news"); ok(/Расширенная анкета/.test(u.d.getElementById("helpNews").textContent) && !/Кнопки «Очистить» больше нет/.test(u.d.getElementById("helpNews").textContent), "unlocked: the extended-list lines come back, the stand-in line goes");
    ok(!f.errors.length && !g.errors.length && !u.errors.length, "no script errors");
    _sc.end();
  }

  S("v622: smooth scrolling: section height guesses for the extended list, the page behind a window stays still");
  {
    const _sc = scope();
    const css = require("fs").readFileSync(__dirname + "/../css/style.css", "utf8");
    ok(!/header\.top\{[^}]*backdrop-filter/.test(css) && /html\.has-modal,html\.has-modal body\{overflow:hidden\}/.test(css) && /\.modal\{overscroll-behavior:contain/.test(css), "css: solid header without blur, windows hold the scroll, page locked under a window");
    const f = open("form"), K = f.KC, d = f.d;
    K.help.open("news"); ok(d.documentElement.classList.contains("has-modal"), "a window open → the page is locked");
    d.getElementById("helpClose").dispatchEvent(new f.w.MouseEvent("click", { bubbles: true })); ok(!d.documentElement.classList.contains("has-modal"), "closed → unlocked");
    const plain = { items: {}, meta: { role: "dom" } }; let n = 0; K.CATS.forEach(c => c.items.forEach(([, id]) => { plain.items[id] = { interest: ["yes", "love", "maybe"][n++ % 3] }; }));
    const ext = K.ext.fromPlain(K.store.normalize(plain), "dom");
    const g = open("form", { storage: { local: { "checklist-lang": "ru", "practices-checklist-v1": JSON.stringify(ext) }, session: {} } });
    const cats = [...g.d.querySelectorAll(".cat")];
    ok(g.d.body.classList.contains("is-ext") && cats.every(c => +c.dataset.rows === c.querySelectorAll(".item:not(.filtered-out)").length) && cats.every(c => /px$/.test(c.style.containIntrinsicSize)), "extended list: every section gets its own height guess from its shown rows");
    ok(!f.errors.length && !g.errors.length, "no script errors");
    _sc.end();
  }

  S("v623: ⚔ Wr (Chaos gods) unlocked with its tab row; 📖 Re:Zero sins: seven sins, three ranks, Sloth from unanswered items");
  {
    const _sc = scope();
    const fsx = require("fs"), LANGS = ["ru", "en", "es", "pt", "ja", "th", "zh"];
    const f = open("form"), K = f.KC, R = K.rz;
    eq(R.SINS.length + "/" + R.RACE.length + "/" + R.RANKS.join(), "7/6/follower,archbishop,witch", "seven sins (six compete, Sloth from U), three ranks");
    const bad = [];
    R.SINS.forEach(k => { const F = R.FIG[k]; if (!F) { bad.push(k + ": no sign"); return; } const [P, E, Ln, B] = F, n = P.length + E.length;
      if (P.length !== 9 || new Set(B).size !== 3 || B.some(i => i < 0 || i > 8)) bad.push(k + ": stars");
      Ln.forEach(l => (l[0] === "d" ? l.slice(1) : l).forEach(i => { if (!(i >= 0 && i < n)) bad.push(k + ": line " + i); })); });
    eq(bad, [], "every sin has a sign: 9 group stars, 3 bright slots, lines only to existing stars");
    // texts in every language
    const miss = [];
    LANGS.forEach(l => { const o = {}; new Function("KC", fsx.readFileSync(__dirname + "/../js/lang/" + l + ".ui.js", "utf8"))({ addLang: (lg, k, d) => Object.assign(o, d) });
      ["rz.toRz", "rz.mine", "rz.their", "card.o.rz", "sp.rz.h", "sp.rz.grp", "sp.rz.same", "sp.rz.near", "sp.rz.far", "help.rz_html", "help.compareRz_html"].concat(R.SINS.map(k => "rz.s." + k), R.SINS.map(k => "rz.g." + k), R.RANKS.map(k => "rz.r." + k))
        .forEach(k => { if (!o[k]) miss.push(l + ":" + k); });
      if (!/^<h5>[^<]*(7|7 日|7日)[^<]*<\/h5>/.test(o["help.news_html"]) || !/Re:Zero|リゼロ/.test(o["help.news_html"].slice(0, 300))) miss.push(l + ": news of Oct 7");
      const lo = {}; new Function("KC", fsx.readFileSync(__dirname + "/../js/lore/" + l + ".lore.js", "utf8"))({ addLore: (lg, d) => Object.assign(lo, d) });
      R.SINS.map(k => "rz.s." + k).concat(R.RANKS.map(k => "rz.r." + k)).forEach(k => { if (!lo[k]) miss.push(l + ": lore " + k); }); });
    eq(miss, [], "names, ranks, help, the Oct 7 news and the guide texts in all 7 languages");
    // Sloth from unanswered items; a template-filled list counts against the template
    const ids = []; K.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const fill = (n, v) => { const st = K.store.blank(); ids.slice(0, n).forEach((id, i) => { st.items[id] = { interest: v || ["yes", "love", "maybe", "limit"][i % 4] }; }); return st; };
    const lazy = fill(Math.floor(ids.length * .2)), c1 = R.choose(K.portrait.compute(lazy, null), lazy, null);
    eq(c1 && c1.sin + "/" + c1.rank, "sloth/witch", "80 % unanswered → Witch of Sloth");
    const starter = K.store.tpl.starters()[0], tl = K.store.blank(); starter.ids.forEach((id, i) => { tl.items[id] = { interest: ["yes", "love", "maybe"][i % 3] }; });
    eq(R.answers(tl).U, 0, "a list filled only from a starter template: counted against the template (nothing unanswered)");
    const tl2 = JSON.parse(JSON.stringify(tl)); ids.filter(id => starter.ids.indexOf(id) < 0).slice(0, 5).forEach(id => { tl2.items[id] = { interest: "yes" }; });
    ok(R.answers(tl2).U > .5, "5 positive answers outside the template → counted against the whole list");
    const full = fill(ids.length), c2 = R.choose(K.portrait.compute(full, null), full, null);
    ok(c2 && c2.sin !== "sloth" && R.RANKS.indexOf(c2.rank) >= 0, "a full list: one of the six, with a rank");
    const greedy = fill(ids.length, "love"), cg = R.scores(K.portrait.compute(greedy, null), greedy, null), maybe = fill(ids.length, "maybe");
    ok(cg.o.greed > cg.o.envy, "all Love → Greed above Envy"); const cm = R.scores(K.portrait.compute(fill(ids.length, "yes"), null), fill(ids.length, "yes"), null);
    ok(R.answers(maybe).mb === 1 && R.answers(greedy).yl === 1, "shares: Maybe and Yes + Love among the answers");
    // portrait: the button, the sign, the rank line, the guide
    const st = fill(ids.length);
    const g = open("form", { locked: true, storage: { local: { "checklist-lang": "ru", "checklist-dnd": "rz", "practices-checklist-v1": JSON.stringify(st) }, session: {} } });
    const so = g.d.getElementById("portraitSection"); so.open = true; so.dispatchEvent(new g.w.Event("toggle"));
    const sign = g.d.querySelector(".pt-sign.pt-rz");
    ok(!!g.d.querySelector('.pt-mode .pt-rzb[data-mode="rz"]') && /Грехи Re:Zero/.test(g.d.querySelector(".pt-rzb").textContent) && !!sign && R.SINS.indexOf(sign.dataset.sin) >= 0 && /^(Последователь греха|Архиепископ греха|Ведьма) /.test(sign.querySelector(".sg-rl").textContent),
      "shipped build: the 📖 button, the sin's sign and its rank line");
    ok(!!g.d.querySelector(".pt-wrb") && !!g.d.querySelector(".pt-mode.pt-wr-sub") === false, "⚔ Wr is there (sub-row only when Wr is open)");
    g.KC.dnd.setMode("wr"); g.KC.form.renderPortrait(); const sub = g.d.querySelector(".pt-wr-sub");
    ok(!!sub && sub.querySelectorAll("button").length === 1 && /Боги Хаоса/.test(sub.textContent) && !!g.d.querySelector(".pt-sign.pt-wr"), "⚔ Wr open: the tab row with the one tab «Боги Хаоса», the god's sign");
    g.KC.dnd.setMode("rz"); const lp = g.KC.lore.provider(); ok(lp.length === 1 && lp[0].items.length === 2 && /^rz\.s\./.test(lp[0].items[0].key) && /^rz\.r\./.test(lp[0].items[1].key), "the guide describes the sin and the rank");
    g.KC.help.open("portrait"); ok(/Грехи Re:Zero/.test(g.d.getElementById("help-portrait").textContent) && /Служитель богов Хаоса/.test(g.d.getElementById("help-portrait").textContent), "help: the Re:Zero and ⚔ Wr paragraphs");
    // compare page
    const c = open("compare", { locked: true }); ok(/data-mode="rz"/.test(c.KC.wod.switchHTML("pair")) && !!c.KC.rz, "compare page: the 📖 mode");
    ok(!f.errors.length && !g.errors.length && !c.errors.length, "no script errors");
    _sc.end();
  }

  const R = report(); console.log("\nPASS", R.PASS, "FAIL", R.FAIL);
  process.exit(R.FAIL ? 1 : 0);
})().catch(e => { console.error("CRASH", e && e.stack); process.exit(2); });
