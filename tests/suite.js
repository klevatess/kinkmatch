/* tests/suite.js — user-scenario tests. Run:  npm install jsdom  &&  node tests/suite.js
   Covers data integrity, i18n, form flows, links (incl. old-version links), My lists,
   Received, compare, PDF sheet. Exit code 0 = all passed. */
const { open, ok, eq, click, sleep, report } = require("./harness");
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
  let p = open("form");
  const { KC } = p;
  ok(!p.errors.length, "no script errors on load: " + p.errors.join(" | "));
  const ids = [], codes = [];
  KC.CATS.forEach(c => c.items.forEach(([code, id]) => { ids.push(id); codes.push(code); }));
  eq(ids.length, 488, "item count");
  eq(new Set(ids).size, ids.length, "unique ids"); eq(new Set(codes).size, codes.length, "unique codes");
  const byCode = {}; KC.CATS.forEach(c => c.items.forEach(([code, id]) => byCode[code] = id));
  eq(OLD.ORDER.map((id, i) => byCode[i]), OLD.ORDER, "codes 0..370 still mean the same items as in old versions");
  eq(Object.keys(byCode).map(Number).sort((a, b) => a - b), [...Array(488).keys()], "codes are 0..487 with no gaps or reuse");
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
  const enNames = ids.map(id => KC.i18n.item(id, "en").name); eq(new Set(enNames).size, 488, "EN names unique");
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
  eq(d.querySelectorAll(".item").length, 488, "488 rows rendered");
  ok(d.querySelector(".brand-row #langSw"), "language switcher sits in the title row");
  const dotted = [...d.querySelectorAll(".item .new-dot")].map(x => x.closest(".item").dataset.id).sort();
  const newer = []; p.KC.CATS.forEach(c => c.items.forEach(([code, id]) => { if (code >= 418) newer.push(id); }));
  eq(dotted, newer.sort(), "green dot on exactly the items added after v533, codes 418+ (" + newer.length + ")");
  eq(p.KC.NEW_FROM_CODE, 418, "dots start at code 418 (v533 had codes 0–417)");
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
  const nm = d.getElementById("metaName"); nm.value = "Андрей"; nm.dispatchEvent(new w.Event("input"));
  ok(nm.classList.contains("bad"), "cyrillic name: soft hint, value kept"); eq(nm.value, "Андрей", "name not stripped");
  await sleep(260);
  let saved = JSON.parse(w.localStorage.getItem("practices-checklist-v1"));
  eq(saved.items, { hugging: { interest: "love" }, "spanking-hand": { interest: "maybe" }, "fisting-anal": { interest: "limit" }, "impact-bruising": { interest: "yes" } }, "answers saved (toggle-off removed)");
  eq(saved.meta, { role: "sub", exp: "medium", rel: "poly", attire: ["lace", "leather"] }, "profile saved as keys");
  eq(d.getElementById("progress").textContent, "Отмечено 4 из 488 практик", "progress text");
  const link = p.KC.form.shareLink();
  ok(/[#&]lg=ru(&|$)/.test(link), "share link carries lg=ru");
  ok(/[#&]m=/.test(link), "share link carries profile (m=)");
  const back = p.KC.codec.decode(link);
  eq([back.meta, back.name, back.items, back.lang], [saved.meta, "Андрей", saved.items, "ru"], "link round-trip: profile+role+name+answers+lang");
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
  eq(d.getElementById("metaName").value, "Андрей", "name survived switch");
  eq(d.getElementById("progress").textContent, "4 of 488 practices marked", "EN progress");
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
  eq(d.getElementById("progress").textContent, "4 de 488 práticas marcadas", "PT progress");
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
  eq(r.d.getElementById("metaName").value, "Андрей", "name visible");
  ok(r.w.location.hash === "", "hash stripped from address bar");
  ok(!r.w.localStorage.getItem("practices-checklist-v1"), "recipient's own storage untouched");
  eq(JSON.parse(r.w.localStorage.getItem("checklist-saved-profiles-v1")).length, 1, "saved to Received");
  eq(r.w.localStorage.getItem("checklist-lang"), "en", "recipient preference not overwritten");
  click(r.w, r.d.getElementById("resetBtn")); ok(r.d.getElementById("resetOverlay").classList.contains("show"), "Clear opens a choice window");
  click(r.w, r.d.getElementById("resetList"));
  ok(!r.w.localStorage.getItem("practices-checklist-v1"), "Clear while viewing a link does not touch own list");
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
  eq(open("form", { hash: noLg, navLang: "de" }).KC.i18n.lang, "ru", "no lg, unknown browser lang -> RU default");
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
  const KCn = open("form").KC;
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
  eq(gp.d.getElementById("progress").textContent, "Отмечено " + gShown + " из 488 практик", "counter = what is shown");
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
  eq(Object.keys(KCn.codec.decode(KCn.codec.encode({ items: allNew, meta: {} })).items).length, 488, "fully filled 488-item link round-trips");

  /* form: "Show" filter */
  S("Show filter");
  p = open("form", { navLang: "ru", storage: { local: { "practices-checklist-v1": JSON.stringify({ name: "", meta: {}, items: { hugging: { interest: "love" }, furry: { interest: "yes" } } }) }, session: {} } });
  const vis = () => [...p.d.querySelectorAll(".item:not(.filtered-out)")].map(r => r.dataset.id);
  const vsel = p.d.getElementById("view");
  eq([...vsel.options].map(o => o.textContent), ["Все пункты", "Только без ответа", "Только новые", "Отвеченные, по ответам", "Обожаю / Да / Может"], "Show menu labels");
  vsel.value = "unanswered"; vsel.dispatchEvent(new p.w.Event("change"));
  eq([vis().length, vis().indexOf("hugging"), vis().indexOf("furry")], [486, -1, -1], "unanswered: answered items hidden");
  click(p.w, p.d.querySelector('.item[data-id="chains"] .scale button[data-v="yes"]'));
  ok(vis().indexOf("chains") >= 0, "a row just answered stays visible until the filter is re-applied");
  vsel.dispatchEvent(new p.w.Event("change")); ok(vis().indexOf("chains") < 0, "re-applying hides it");
  vsel.value = "new"; vsel.dispatchEvent(new p.w.Event("change"));
  const newIds = []; p.KC.CATS.forEach(c => c.items.forEach(([code, id]) => { if (code >= 418) newIds.push(id); }));
  eq(vis().sort(), newIds.sort(), "new: exactly the green-dot items (" + newIds.length + ")");
  const sb = p.d.getElementById("search"); sb.value = "секс"; sb.dispatchEvent(new p.w.Event("input"));
  ok(vis().length > 0 && vis().every(id => newIds.indexOf(id) >= 0), "search combines with the filter");
  sb.value = ""; vsel.value = "all"; vsel.dispatchEvent(new p.w.Event("change")); eq(vis().length, 488, "all items again");

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
  const USER_BAD = ["a=BJ0D7___H-qQWuRSqsEBpalpWgYAUIaUhUBVAVGpEhAFvWjoSIBAAABBAgYGqYGqiVQAUiqpohgoClYVAQAABQwQAAUEopgADOqY-pAAAAKoh4qqApkv-qqqrerWr6lAEAigKQQgoUBAAIhlCVY&n=Lavinial%2FPetrovich&m=AgMAAxY&i=38AxC7&lg=ru",
    "a=BJ0D____________3_H5WRuqxhJatOZ7UkBWGoIQAAAgKSAAglQ0EEatQfEVAAAgAQAAAA_7T-sxIAPYq-QEJLulqVQAQAAUMcBFAEKCEEA286I8qpGhf_-wAPv5tqUIpWmmWqqqgAXwMQQhRQhAASo-EGg&n=%D0%A5%D0%B0%D0%B2%D0%BA%D0%BE&m=AQMAAw&i=gyJOV2&lg=ru"];
  eq(USER_BAD.map(l => KCn.codec.decode(l).damaged), [true, true], "the two reported links are recognised as damaged");
  let fp = 0, caught = 0, tries = 0, noUnd = true;
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
    [o374, o371].forEach(o => { if (/__/.test(o)) { tries++; if (KCn.codec.decode(o.replace(/__/g, "")).damaged) caught++; } }); }
  eq(fp, 0, "no intact link (new, pre-fix, v374, v371) is ever flagged as damaged");
  eq(caught, tries, "every simulated corruption is caught (" + tries + " cases)");
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
  eq(p.d.querySelector("#mineList .saved-row b").textContent, "Андрей", "unnamed entry shows the list's name");
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
  const andreiRow = [...p.d.querySelectorAll("#mineList .saved-row")].find(r => r.querySelector("b").textContent === "Андрей");
  click(p.w, andreiRow.querySelector('button[data-act="load"]'));
  st2 = p.storage();
  eq(JSON.parse(st2.local["practices-checklist-v1"]).meta.role, "sub", "Load restores full list incl. role");
  eq(st2.local["checklist-active-mine-id"], andreiRow.dataset.id, "loaded entry becomes active");
  eq(JSON.parse(st2.local["checklist-my-profiles-v1"]).find(x => x.data.items.orgy).data.items, { orgy: { interest: "love" } }, "list left behind is still saved");
  // Clear = start new, nothing lost
  p = open("form", { storage: st2 }); click(p.w, p.d.getElementById("resetBtn")); click(p.w, p.d.getElementById("resetList"));
  eq(JSON.parse(p.w.localStorage.getItem("checklist-my-profiles-v1")).length, 3, "Clear keeps every saved list");
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
  ok(/index\.html\?lang=en/.test(c.d.getElementById("backLink").href), "back link keeps language");
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
  ok(/Андрей/.test(sheet) && /Сабмиссив/.test(sheet) && /Объятия/.test(sheet) && /Жёсткие лимиты/.test(sheet), "RU sheet content");
  click(p.w, p.d.querySelector('#langSw button[data-lang="en"]'));
  sheet = p.KC.form.buildSheet().textContent;
  ok(/Submissive \/ Bottom/.test(sheet) && /Hugging/.test(sheet) && /Hard limits/.test(sheet) && !/[а-яё]/i.test(sheet.replace("Андрей", "")), "EN sheet fully English");

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
  eq(tp.d.getElementById("progress").textContent, "เลือกแล้ว 4 จาก 488 รายการ", "TH progress");
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
  eq(zp.d.getElementById("progress").textContent, "已勾選 4／488 項", "ZH progress");
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
  eq(p.d.getElementById("progress").textContent, "488項目中 4項目にチェック済み", "JA progress");
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
  // clear window
  click(p.w, p.d.getElementById("resetBtn"));
  eq(p.d.getElementById("resetFav").textContent, "Очистить избранное (2)", "Clear window offers clearing favourites");
  click(p.w, p.d.getElementById("resetFav"));
  eq([p.KC.form.favList(), JSON.parse(p.w.localStorage.getItem("practices-checklist-v1")).fav, Object.keys(p.KC.form.state.items).length], [[], undefined, 5], "clearing favourites keeps the answers");
  click(p.w, p.d.getElementById("resetBtn")); ok(p.d.getElementById("resetFav").disabled, "nothing to clear: button disabled");
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
  eq([...p.d.querySelectorAll('#mineTplList .tpl-row button[data-act]')].map(b => b.dataset.act), ["share", "use", "rename", "del"], "template row: Share, Fill in, Rename, ✕");
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
  eq([visP(b3).length, tact.textContent, b3.d.getElementById("tplSel").value], [488, "Только пункты шаблона", ""], "show all: every item, button to go back");
  ok(/создана по шаблону «Evening»\. Показаны все пункты\./.test(b3.d.getElementById("tplNoteText").textContent), "note still says what the list was created by");
  await sleep(300);
  eq(LS(b3, OK_).template.name, "Evening", "showing all does not unbind the list");
  click(b3.w, tact); eq(visP(b3).length, 5, "back to the template's items");
  const bsel = b3.d.getElementById("tplSel"); bsel.value = ""; bsel.dispatchEvent(new b3.w.Event("change"));
  eq([visP(b3).length, b3.KC.form.state.template.name], [488, "Evening"], "“No template” in Filters: a view choice only");
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
  eq([b3.KC.form.state.name, b3.KC.form.state.template, visP(b3).length], ["Boris", undefined, 488], "switched to my plain list");
  r3 = open("form", { hash: tplLink.split("#")[1], storage: b3.storage() });
  b3 = open("form", { storage: r3.storage() });
  eq([b3.KC.form.state.template.name, Object.keys(b3.KC.form.state.items).sort(), LS(b3, MK).length], ["Evening", ["chains", "hugging"], 2], "template link from another list: my list by it is reopened (not a new one)");
  ok(/Открыта ваша анкета по шаблону «Evening»/.test(b3.d.getElementById("noticeText").textContent), "notice says it was reopened");
  // "Fill in" from Received → Templates does the same
  click(b3.w, b3.d.getElementById("savedBtn"));
  eq([...b3.d.querySelectorAll('#savedTplList .tpl-row button[data-act]')].map(b => b.dataset.act), ["share", "use", "rename", "del"], "received template row: Share, Fill in, Rename, ✕");
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
  eq([rv.KC.form.sharedBy, rv.d.getElementById("tplNote").hidden, visP(rv).length], [null, true, 488], "plain list: no template, no note");
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
  eq([visP(dz).length, dz.d.getElementById("tplAct").hidden], [488, true], "list by a deleted template: opens with all items");
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
  eq([bigD.tpl.ids.length, bigD.damaged], [488, false], "a template of every item round-trips (bitmap form)");
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
  ok(hp0.d.getElementById("helpOverlay").classList.contains("show") && hp0.d.querySelectorAll("#helpBody section").length === 10, "help window with 10 sections");
  ok(/Чек-лист практик для разговора/.test(hp0.d.getElementById("helpBody").textContent) && /Шаблон — это набор пунктов/.test(hp0.d.getElementById("helpBody").textContent), "help text in Russian");
  click(hp0.w, hp0.d.querySelector('#langSw button[data-lang="en"]'));
  click(hp0.w, hp0.d.querySelector('#mineOverlay [data-help="lists"]'));
  ok(/A template is a set of items/.test(hp0.d.getElementById("helpBody").textContent) && hp0.d.getElementById("helpTitle").textContent === "How to use", "help follows the language");
  const cq = open("compare", { storage: own5 });
  click(cq.w, cq.d.querySelector('[data-help="compare"]'));
  ok(cq.d.getElementById("helpOverlay").classList.contains("show") && cq.d.getElementById("help-compare"), "help on the compare page");

  S("Header: search row, ♥ toggle, PDF window");
  let hp = open("form", { storage: own5 });
  eq([...hp.d.querySelector(".subbar").children].map(x => x.id || x.className), ["search", "jump", "tplSel", "view", "fav-toggle"], "row: search, Section, Template…, All items, ♥");
  ok(hp.d.getElementById("tplSel").hidden, "no templates yet: the Template list is hidden");
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
  ok(Object.keys(NEW7).every(id => code7[id] >= K7.NEW_FROM_CODE), "all 7 get the green “new” dot");

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
  eq([visP(hq).length, ts.options[ts.selectedIndex].textContent, ts.classList.contains("on")], [488, "Шаблон…", false], "one pick: no template, the list says “Template…”");

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
  const SAME_OK = { pt: ["profile.orient.bi", "pdf.file", "role.short.dom", "role.short.sub", "help.pdf.h"], es: ["profile.orient.bi", "pdf.file", "role.short.dom", "role.short.sub", "help.pdf.h", "scale.limit"], ja: ["profile.orient.bi", "help.pdf.h", "pdf.file"], th: ["profile.orient.bi", "help.pdf.h", "pdf.file"], zh: ["help.pdf.h", "pdf.file"] };
  const packsUI = {}; ["en", "ru", "pt", "es", "ja", "th", "zh"].forEach(l => { const box = {}; new Function("KC", fs.readFileSync(require("./harness").ROOT + "/js/lang/" + l + ".ui.js", "utf8"))({ addLang: (x, part, o) => Object.assign(box, o) }); packsUI[l] = box; });
  ["pt", "es", "ja", "th", "zh"].forEach(l => eq(Object.keys(packsUI.en).filter(k => packsUI[l][k] === packsUI.en[k] && SAME_OK[l].indexOf(k) < 0), [], l + ": no interface string left in English"));
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
  eq(["bukkake", "furry", "clowncore", "tongue-clothespins", "nyotaimori", "latex-sweat", "forced-staying-in-sweat-cum"].map(id => !!d3.querySelector('.item[data-id="' + id + '"] .new-dot')), [false, false, false, false, true, true, true], "no dot on items of v533 (e.g. codes 378, 371, 401, 417); dots on 418+");

  S("v564: saved comparisons (3+)");
  {
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
    ok(!q.d.querySelector('#results button[data-act="save"]'), "two people: no “Save comparison” (comparing two is quick anyway)");
    click(q.w, q.d.getElementById("addPart")); pickIn(q, colsQ()[2], "r:rb");
    click(q.w, q.d.getElementById("addPart")); pickIn(q, colsQ()[3], "m:mk");
    click(q.w, q.d.getElementById("cmpBtn"));
    const sv = q.d.querySelector('#results button[data-act="save"]');
    ok(sv && sv.textContent === "Сохранить сравнение", "four people: “Save comparison” above the result");
    click(q.w, sv);
    eq(q.d.getElementById("toast").textContent, "Сравнение сохранено", "saved toast");
    let cl = JSON.parse(q.w.localStorage.getItem("checklist-compares-v1"));
    eq([cl.length, cl[0].name, cl[0].parts.map(p => p.uid)], [1, "Friends", ["MEME01", "ANNA01", "BORI01", "KIRA01"]], "stored: name + lists by their list ids");
    eq([q.d.getElementById("cmpSaved").hidden, q.d.getElementById("cmpSaved").options.length], [false, 2], "the picker at the top lists it");
    ok(/Сохранённое сравнение «Friends»/.test(q.d.getElementById("results").textContent), "note names the saved comparison");
    click(q.w, sv); click(q.w, q.d.querySelector('#results button[data-act="save"]'));
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
    const txt = q.d.getElementById("results").textContent;
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
    eq([q.d.querySelectorAll("#parts .cmp-col").length, !!q.d.querySelector('#results button[data-act="save"]')], [4, true], "compare page opens it right away");
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
  }

  S("v565: anonymous counter (off until a code is set)");
  {
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
  }

  S("v568: 18+ and disclaimer on both pages");
  ["form", "compare"].forEach(pgName => {
    const lp = open(pgName, { storage: { local: { "checklist-lang": "ru" }, session: {} } }), el = lp.d.querySelector(".foot-legal");
    ok(el && /подтверждаете, что вам исполнилось 18 лет/.test(el.textContent) && /Не является пропагандой упоминаемых практик; сервис носит развлекательный характер\./.test(el.textContent), pgName + ": 18+ line and disclaimer under the footer");
    lp.KC.i18n.set("zh"); lp.KC.i18n.apply(lp.d); ok(/18 歲/.test(lp.d.querySelector(".foot-legal").textContent), pgName + ": translated (ZH)");
  });

  S("v569: damaged saved data never breaks a page");
  {
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
  }

  S("v570: 8 new practices, leather paddles renamed");
  {
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
    eq(Object.keys(want).filter(id => !dn.querySelector('.item[data-id="' + id + '"] .new-dot')), [], "all 8 marked as new (green dot)");
  }

  S("v571: other sub serves you; urinating in front of a partner");
  {
    const K = open("form").KC, codeOf = {}, next = {};
    K.CATS.forEach(c => c.items.forEach(([code, id], i) => { codeOf[id] = code; next[id] = (c.items[i + 1] || [])[1]; }));
    eq([codeOf["other-sub-serves-you"], codeOf["urination-in-front"]], [475, 476], "codes 475, 476");
    eq([next["used-as-toy-for-other-sub"], next["urination-in-front"]], ["other-sub-serves-you", "golden-showers"], "placed next to related items");
    eq([K.i18n.item("other-sub-serves-you", "ru").name, K.i18n.item("urination-in-front", "ru").name], ["Вас удовлетворяет другой сабмиссив по принуждению", "Мочеиспускание при партнёре / во время сессии"], "RU names");
    ["ru", "en", "pt", "es", "ja", "th", "zh"].forEach(l => eq(["other-sub-serves-you", "urination-in-front"].filter(id => { const it = K.i18n.item(id, l); return !it.name || !it.desc || (l !== "en" && it.desc === K.i18n.item(id, "en").desc); }), [], l + ": translated"));
    const dn = open("form", { storage: { local: { "checklist-lang": "ru" }, session: {} } }).d;
    eq(["other-sub-serves-you", "urination-in-front"].filter(id => !dn.querySelector('.item[data-id="' + id + '"] .new-dot')), [], "green dots");
  }

  S("v572: 11 new practices");
  {
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
    eq(ids.filter(id => !dn.querySelector('.item[data-id="' + id + '"] .new-dot')), [], "green dots");
  }

  S("v573: moving to the new site (old build sends, new build receives)");
  {
    const OLDB = { "core/migrate.js": s => s.replace('const ROLE = "receiver"', 'const ROLE = "sender"') };
    const NEWBASE = "https://klevatess.github.io/kinkmatch/";
    const oldPage = (o = {}) => open("form", Object.assign({ patch: OLDB }, o));
    const newPage = (o = {}) => open("form", Object.assign({ base: NEWBASE }, o));
    /* a rich old-site device, made through the old build's own code */
    const K0 = oldPage().KC, ids = []; K0.CATS.forEach(c => c.items.forEach(([, id]) => ids.push(id)));
    const V = ["love", "yes", "maybe", "limit"], its = (n, off) => { const o = {}; ids.slice(off, off + n).forEach((id, i) => { o[id] = { interest: V[i % 4] }; }); return o; };
    const own = { name: "Андрей <b>&", uid: "OWN001", items: its(300, 0), meta: { role: "dom", attire: ["latex", "lace"], exp: "large" }, fav: ids.slice(5, 25),
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
    eq([n2.KC.form.state.name, Object.keys(n2.KC.form.state.items).length, (n2.KC.form.state.fav || []).length], ["Андрей <b>&", 300, 20], "the page opens my moved list");
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
    eq([vl.backup.own.name, vl.backup.received.some(x => vp.KC.codec.decode(x.code).uid === "LEV001")], ["Андрей <b>&", true], "moves MY list (not the viewed one) + the viewed link from Received");

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
      "checklist-my-profiles-v1": JSON.stringify([...Array(8)].map((_, i) => ({ id: "h" + i, name: "L" + i, data: { name: "L" + i, uid: "HEAVY" + i, items: its(ids.length, 0), meta: { role: "sub" }, fav: ids.slice(0, 100), fantasies: "x".repeat(500) }, ts: i }))),
      "checklist-saved-profiles-v1": JSON.stringify([...Array(30)].map((_, i) => ({ id: "r" + i, name: "R" + i, code: K0.codec.encode({ name: "R" + i, uid: "RR" + String(i).padStart(4, "0"), items: its(ids.length, 0), meta: {} }, "ru"), ts: i }))) }), session: {} };
    const hl = oldPage({ storage: hv }).KC.migrate.link();
    ok(hl.length < 120000, "heavy user (8 full lists, 30 received): " + hl.length + " characters — well under browser limits (Chrome/Firefox ≥ 1 MB)");
    const hn = newPage({ hash: hl.split("#")[1] }); click(hn.w, hn.d.getElementById("migrateYes"));
    const hn2 = newPage({ storage: hn.storage() });
    eq([hn2.KC.store.mine.list().length, hn2.KC.store.received.list().length], [8, 30], "heavy user: everything arrives");
  }

  S("v573: moving twice — edits made on either site");
  {
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
  }

  const R = report(); console.log("\nPASS", R.PASS, "FAIL", R.FAIL);
  process.exit(R.FAIL ? 1 : 0);
})().catch(e => { console.error("CRASH", e && e.stack); process.exit(2); });
