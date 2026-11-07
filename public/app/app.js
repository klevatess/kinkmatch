/* Kinkoverse Mini App: first-time steps, neighbours, mutual yes, «My profile», moderation and the owner's panel. Plain JS, no build step.
   Talks only to this Worker's /api with the signed Telegram initData; nothing is stored in the browser. */
(function () {
  "use strict";
  /* ===== app-src/00-core.js — Core: state S, texts t(), esc, api(), debug log, watchdog, save(), small form helpers (chip, bar, foot).
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */
  var tg = window.Telegram && window.Telegram.WebApp;
  var app = document.getElementById("app");

  var S = { me: null, lang: "ru", tab: "neighbours", edit: null, preview: false, err: "", busy: false, form: {}, chatHelp: false,
    nb: null, nbView: "list", fBands: [], fDist: 7, nbSort: "pct", fRoles: [], fQuick: [], open: null, cmp: null, cmpTab: "both", zone: null,
    aTab: "overview", aData: {}, pTab: "card", aQuery: "", aChat: "", aOpen: null, aStage: "all", aGender: "all", aSusp: false, aSpace: false, aSort: "new", fromSite: false,
    matches: null, fItems: [], fq: "", found: null, foundHidden: 0, items: null, ins: {}, insAll: false, prop: null, showHidden: false, fFrom: "all", report: null, note: "", mTab: "reports", mState: "new", mOpen: null, openFrom: null, invite: null, inviteScope: [], fInts: [], iq: "", sMode: "practices", fIntsAll: false };
  var map = null;

  /* ---------- texts (RU / EN) ----------
     owner, 2026-11-01: the texts live in i18n/<lang>.json (+ i18n/staff.<lang>.json for the owner panel and moderation);
     only the person's language is loaded. index.html asks for it at once, in parallel with this file (window.KV_TEXTS).
     A new or changed text: edit BOTH json files and bump its ?v= here, in index.html and in sw.js. */
  var TEXT_URL = { ru: "i18n/ru.json?v=8", en: "i18n/en.json?v=8" };
  var STAFF_TEXT_URL = { ru: "i18n/staff.ru.json?v=7", en: "i18n/staff.en.json?v=7" };
  var TT = {}, ttWait = {}, sttWait = {};
  function loadJson(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); }); }
  function addTexts(l, d) { TT[l] = TT[l] || {}; Object.keys(d).forEach(function (k) { TT[l][k] = d[k]; }); }
  /** the texts of one language (a promise); the early request from index.html is used when it is for this language */
  function textsLoad(l) {
    if (!ttWait[l]) {
      var early = window.KV_TEXTS && window.KV_TEXTS.lang === l && window.KV_TEXTS.p;
      ttWait[l] = (early || loadJson(TEXT_URL[l])).catch(function () { return loadJson(TEXT_URL[l]); })   // once more if the early one failed
        .then(function (d) { addTexts(l, d); }, function (e) { delete ttWait[l]; throw e; });
    }
    return ttWait[l];
  }
  function staffTextsLoad(l) {
    if (!sttWait[l]) sttWait[l] = loadJson(STAFF_TEXT_URL[l]).then(function (d) { addTexts(l, d); }, function (e) { delete sttWait[l]; throw e; });
    return sttWait[l];
  }
  /** everything this person's screens need in language l: the texts, and for the owner / moderators the staff file */
  function langReady(l, me) { me = me || S.me; var w = [textsLoad(l)]; if (me && (me.admin || me.mod)) { w.push(staffTextsLoad(l)); w.push(staffLoad()); } return Promise.all(w); }
  /** a language from the server or the settings: the screen re-renders once its texts are here (until then the loaded one shows) */
  function setLang(l) { if (!l || l === S.lang) return; S.lang = l; langReady(l).then(function () { if (S.lang === l) render(); }, function () { /* the loaded language stays */ }); }
  function hasT(k) { return !!((TT[S.lang] && TT[S.lang][k]) || (TT.ru && ThasT(k)) || (TT.en && TT.en[k])); }
  function t(k, vars) {
    var s = (TT[S.lang] && TT[S.lang][k]) || (TT.ru && ThasT(k)) || (TT.en && TT.en[k]) || k;
    return s.replace(/\{(\w+)\}/g, function (m, n) { return vars && vars[n] != null ? vars[n] : m; });
  }
  /** «485 ответов» / «1 ответ» / «2 ответа»; English: «485 answers» */
  function nAns(n) {
    n = +n || 0;
    if (S.lang === "en") return n + (n === 1 ? " answer" : " answers");
    var a = n % 10, b = n % 100;
    return n + (a === 1 && b !== 11 ? " ответ" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? " ответа" : " ответов");
  }
  /** owner, 2026-10-24: an extended list shows its columns — «Верх 22 · Низ 527» — never one number for both */
  function ansOf(x) {
    if (!x) return nAns(0);
    var c = x.cols || (x.ans_top != null ? { top: x.ans_top, bottom: x.ans_bottom } : null);
    return c ? t("ansCols", { t: c.top, b: c.bottom }) : nAns(x.answered);
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmtDate(sec) { return new Date(sec * 1000).toLocaleDateString(S.lang === "en" ? "en-GB" : "ru-RU", { day: "numeric", month: "long" }); }
  function chatsText() {
    var q = S.me.chats.map(function (c) { return "«" + esc(c.title) + "»"; });
    var list = q.length < 2 ? q.join("") : q.slice(0, -1).join(", ") + t("and") + q[q.length - 1];
    return t(q.length > 1 ? "chatMany" : "chatOne", { list: list });
  }

  /* ---------- API ---------- */
  /** opts.keepalive: the browser finishes the request even if the app is closed (owner, 2026-11-03: likes) */
  function api(method, path, body, opts) {
    // owner, 2026-11-01: «Обновить» in the panel — the kept numbers are counted again (src/admincache.js)
    if (method === "GET" && S.aFreshUntil > Date.now() && /^admin\/(overview|summary|universe|reminders|retention)\b/.test(path)) path += (path.indexOf("?") < 0 ? "?" : "&") + "fresh=1";
    return fetch("/api/" + path, {
      method: method, headers: { "authorization": "tma " + (tg ? tg.initData : ""), "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined, keepalive: !!(opts && opts.keepalive),
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: "server", status: r.status }; }).then(function (j) {
        if (!j.ok && method === "POST" && SHAPED[path]) dbg({ kind: "api", api: method + " " + path, status: j.error || r.status, shape: shapeOf(path, body), always: 1 });
        else if (!j.ok && path !== "debug/client" && path !== "step") dbg({ kind: "api", api: method + " " + path.split("?")[0], status: j.error || r.status });
        return j;
      });
    }, function (e) { dbg({ kind: "api", api: method + " " + path.split("?")[0], status: "network: " + (e && e.message) }); throw e; });
  }
  /** While the owner has «record errors» on: the app tells the server what goes wrong (no answers, no places). */
  // owner, 2026-10-21: which screen an error happened on, and each error only once per opening (no extra requests)
  function screenNow() {
    if (S.fillOpen) return "fill"; if (S.starsOpen) return "stars"; if (S.page) return "page:" + S.page; if (S.report) return "report";
    if (S.aOpen) return "admin-profile"; if (S.mOpen) return "mod-report"; if (S.aChatPage) return "admin-chat"; if (S.edit) return "edit:" + S.edit;
    if (S.open) return S.cmp ? "compare" : "person";
    if (S.me && !S.me.active && S.me.steps) { var st = S.me.steps; return "step:" + (!st.consent ? "consent" : !st.checklist ? "checklist" : !st.profile ? "profile" : "place"); }
    return "tab:" + (S.tab || "?");
  }
  var dbgSeen = {}, stepSent = {};
  function markStep(k) { if (!k || stepSent[k] || !S.me || S.me.admin) return; stepSent[k] = 1; try { api("POST", "step", { s: k }).catch(function () { /* fine */ }); } catch (e) { /* fine */ } }
  /** owner, 2026-10-27: a refused registration step is logged with the SHAPE of what was sent — never the text itself */
  var SHAPED = { consent: 1, checklist: 1, profile: 1, location: 1 };
  function shapeOf(path, b) {
    b = b || {};
    var pat = function (v) { return String(v == null ? "" : v).slice(0, 24).replace(/\d/g, "N").replace(/[A-Za-zА-Яа-яЁё]/g, "a").replace(/\s/g, "_"); };
    var len = function (v) { var n = String(v || "").length; return n === 0 ? "0" : n < 50 ? "<50" : n < 200 ? "<200" : n < 1000 ? "<1k" : "1k+"; };
    if (path === "consent") return "date=" + (pat(b.birth_date) || "—") + " fields=" + String(S.form.bd || "").length + "/" + String(S.form.bm || "").length + "/" + String(S.form.by || "").length + " g=" + (b.gender ? 1 : 0) + " ok=" + (b.consent ? 1 : 0);
    if (path === "checklist") { var l = String(b.link || ""); return "len=" + len(l) + " site=" + (/klevatess\.github\.io\/kinkmatch/.test(l) ? 1 : 0) + " hash=" + (l.indexOf("#") >= 0 ? 1 : 0) + " a=" + (/[#&]a=/.test(l) ? 1 : 0) + " space=" + (/\s/.test(l.trim()) ? 1 : 0); }
    if (path === "profile") return Object.keys(b).sort().join(",").slice(0, 100) + " nick=" + len(b.nick);
    if (path === "location") return "lat=" + typeof b.lat + " lon=" + typeof b.lon + " r=" + b.radius;
    return "";
  }
  function dbg(o) {
    // owner, 2026-10-25: errors are always sent (with the stack and the last button pressed); the rest only while debug is on
    if (!S.me || (!S.me.debug && o.kind !== "error" && !o.always)) return;
    try { o.screen = screenNow(); } catch (x) { o.screen = "?"; }
    if (o.kind === "error") { o.act = lastAct; var k = o.message + "|" + o.screen + "|" + (o.stack || "").slice(0, 80); if (dbgSeen[k]) return; dbgSeen[k] = 1; }
    try { fetch("/api/debug/client", { method: "POST", headers: { "authorization": "tma " + (tg ? tg.initData : ""), "content-type": "application/json" }, body: JSON.stringify(o) }); } catch (e) { /* never break the app */ }
  }
  /* «Script error.» with no place = the error happened in code that Telegram's Android web view called from its own injected
     script (theme / viewport / back button events), so the browser hides the details. Our own entry points are wrapped
     (guard) and report the real message and stack themselves. */
  var lastAct = "";
  function stackOf(e) { return e && e.stack ? String(e.stack).split("\n").slice(0, 6).map(function (l) { return l.trim().replace(/https?:\/\/[^/]+\//, ""); }).join(" | ") : ""; }
  function guard(label, fn) {
    return function () {
      try { return fn.apply(this, arguments); }
      catch (e) { dbg({ kind: "error", message: label + ": " + (e && e.message || e), stack: stackOf(e) }); watchdog(label); }
    };
  }
  window.addEventListener("error", function (e) {
    var el = e.target && e.target !== window && e.target.tagName ? e.target : null;   // a script / style that failed to load
    dbg({ kind: "error", message: el ? "load failed: " + el.tagName.toLowerCase() + " " + String(el.src || el.href || "").split("/").pop() : e.message,
      where: (e.filename || "").split("/").pop() + ":" + e.lineno + ":" + (e.colno || 0), stack: stackOf(e.error), hidden: e.message === "Script error." ? "cross-origin or a Telegram callback" : undefined });
    if (!el) watchdog(e.message === "Script error." ? "script error" : "error");
  }, true);
  /* owner, 2026-10-27: after an error nobody caught, look at the screen a moment later; only a really broken (empty)
     screen gets «Что-то пошло не так · Перезагрузить». Whether it was broken is logged. */
  var wdBusy = false;
  function watchdog(why) {
    if (wdBusy) return; wdBusy = true;
    setTimeout(function () {
      wdBusy = false;
      var broken = !app.firstElementChild || !String(app.textContent || "").trim();
      dbg({ kind: "error", message: "watchdog: " + (broken ? "broken" : "fine") + " after " + why, broken: broken ? 1 : 0 });
      if (!broken || document.querySelector(".wd")) return;
      var d = document.createElement("div"); d.className = "wd"; d.setAttribute("role", "alert");
      d.innerHTML = '<h2 class="serif" style="font-size:22px;margin:0">' + esc(t("wdT")) + '</h2><div class="small muted">' + esc(t("wdX")) + '</div><button type="button" class="btn primary">' + esc(t("wdBtn")) + "</button>";
      // owner, 2026-11-01: «Обновить» also deletes the phone copy (sw.js), so a damaged copied file cannot stay
      d.querySelector("button").addEventListener("click", function () {
        var go = function () { location.reload(); };
        try { if (window.caches) { setTimeout(go, 1500); caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }).then(go, go); } else go(); } catch (e) { go(); }
      });
      document.body.appendChild(d);
    }, 600);
  }
  window.addEventListener("unhandledrejection", function (e) { dbg({ kind: "error", message: "promise: " + (e.reason && (e.reason.message || e.reason)), stack: stackOf(e.reason) }); });
  function save(path, body, after) {
    if (S.busy) return;
    S.busy = true; S.err = ""; render();
    api("POST", path, body).then(function (r) {
      S.busy = false;
      if (!r.ok) {
        S.err = r.error === "too_soon" ? t("e_too_soon", { date: fmtDate(r.next) }) : r.error === "too_few" ? t("e_too_few", { n: r.answered, need: r.need })
          : (hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"));
        haptic("error"); return render();
      }
      var wasActive = S.me && S.me.active;
      S.me = r; setLang(r.lang);
      if (path === "location" && !wasActive && r.active && !S.edit) S.launched = true;   // owner, 2026-10-28: «Анкета на карте»
      if (r.active && (!wasActive || path === "profile" || path === "settings")) loadNeighbours();
      haptic("success");
      if (after) after(r);
      render();
    }, function () { S.busy = false; S.err = t("netErr"); render(); });
  }
  function haptic() { /* owner (2026-10-19): no vibration — the phone does not buzz anywhere else either */ }

  /* ---------- small pieces ---------- */
  /* date of birth typed as digits: "05051990" → "05.05.1990"; "1990-05-05" (pasted or autofill) is accepted too */
  function typeBirth(v, inputType) {
    v = String(v || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return isoToDots(v);
    if (inputType && inputType.indexOf("delete") === 0) return v;   // let backspace remove dots
    var d = v.replace(/\D/g, "").slice(0, 8);
    return d.length > 4 ? d.slice(0, 2) + "." + d.slice(2, 4) + "." + d.slice(4) : d.length > 2 ? d.slice(0, 2) + "." + d.slice(2) : d;
  }
  function isoToDots(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return m ? m[3] + "." + m[2] + "." + m[1] : v || ""; }
  function dotsToIso(v) {
    v = String(v || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    var m = /^(\d{1,2})[.\/\- ](\d{1,2})[.\/\- ](\d{4})$/.exec(v);
    if (!m) return null;
    var dd = +m[1], mm = +m[2], yy = +m[3], dt = new Date(Date.UTC(yy, mm - 1, dd));
    if (dt.getUTCFullYear() !== yy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return null;
    return yy + "-" + String(mm).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
  }
  function ageFrom(iso) {
    var b = iso.split("-").map(Number), n = new Date(), a = n.getFullYear() - b[0];
    if (n.getMonth() + 1 < b[1] || (n.getMonth() + 1 === b[1] && n.getDate() < b[2])) a--;
    return a;
  }
  function bucketOf(a) { if (a >= 68) return "68+"; var lo = 18 + Math.floor((a - 18) / 5) * 5; return lo + "–" + (lo + 4); }   // same as the server

  function chip(group, value, label, on) {
    return '<button type="button" class="chip" data-a="chip" data-g="' + group + '" data-v="' + value + '" aria-pressed="' + (on ? "true" : "false") + '">' + esc(label) + "</button>";
  }
  function progress(n) { var h = '<div class="progress" aria-hidden="true">'; for (var i = 1; i <= 4; i++) h += '<i class="' + (i <= n ? "on" : "") + '"></i>'; return h + "</div>"; }
  var PEN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  // the radius chosen on the place step; S.form can be reset by a re-render while the phone looks for the place (bad_radius, 2026-10-20)
  function radiusNow() { return S.form.radius || (S.me && S.me.location && S.me.location.radius) || (S.me && S.me.radius_pref) || 3; }
  function bar(n, reg) {   // up to 50 answers; reg (owner, 2026-11-01, variant A): during registration step 1 shows as done first
    var b = '<div class="fbar" aria-hidden="true"><i style="width:' + Math.min(100, Math.round(n * 2)) + '%"></i></div>';
    return reg ? '<div class="fsteps reg" aria-hidden="true"><span class="fs1"></span>' + b + "</div>" : b;
  }
  function errLine() { return S.err ? '<div class="err" role="alert">' + esc(S.err) + "</div>" : ""; }
  function foot(backAct, nextAct, nextLabel) {
    var back = backAct ? '<button type="button" class="btn" data-a="' + backAct + '">' + t(S.edit ? "cancel" : "back") + "</button>" : "";
    return '<div class="foot' + (back ? "" : " one") + '">' + back + '<button type="button" class="btn primary" data-a="' + nextAct + '"' + (S.busy ? " disabled" : "") + ">" + esc(nextLabel || t(S.edit ? "save" : "next")) + "</button></div>";
  }

  /* ---------- brand: Kinkoverse, a Kinkosmos project ---------- */
  function brand() { return '<div class="brandrow"><img src="logo.svg" alt="" width="34" height="34"><div><b>Kinkoverse</b><small>' + t("brandSub") + "</small></div></div>"; }

  var A = {};   // the handlers for data-a="…"; every part adds its own with Object.assign(A, {…})

  Object.assign(A, {
    chip: function (el) {
      var g = el.dataset.g, v = el.dataset.v;
      if (g === "gender") S.form.gender = v;
      else if (g === "ageExact") S.form.ageExact = v === "1";
      else { var arr = S.form[g]; var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }
      render();
    },
  });
  /* ===== app-src/01-reg-steps.js — Registration screens: step 1 consent (teaseMap), checklist step, step 3 profile, step 4 place.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  /* ---------- screens ---------- */
  /** owner, 2026-11-01 (variant A): a PICTURE of the map on the first step — made-up figures, blurred; only the number is
      real (people in open space, rounded like on the checklist step). No real zones before 18+, no map tiles, no request. */
  var TEASE = [[14, 30, "top", "woman"], [27, 62, "bottom", "man"], [38, 24, "switch", "other"], [47, 52, "bottom", "woman"], [58, 30, "top", "man"],
    [66, 66, "switch", "woman"], [76, 38, "bottom", "other"], [86, 58, "top", "woman"], [20, 78, "bottom", "woman"], [90, 22, "switch", "man"], [52, 80, "top", "other"]];
  function teaseMap(n) {
    var pins = TEASE.map(function (p) { return '<span class="pm g-' + p[3] + '" style="left:' + p[0] + "%;top:" + p[1] + '%">' + figure(p[2]) + "</span>"; }).join("");
    return '<div class="tease"><div class="tmap" aria-hidden="true"><svg class="tbg" viewBox="0 0 360 150" preserveAspectRatio="none">' +
      '<path d="M-10 40 C 80 30, 140 70, 370 50 M-10 110 C 90 120, 200 80, 370 120 M70 -10 C 80 60, 60 100, 90 160 M240 -10 C 230 50, 260 110, 250 160"/>' +
      '<circle class="z" cx="80" cy="70" r="46"/><circle class="z" cx="200" cy="55" r="38"/><circle class="z" cx="285" cy="95" r="44"/></svg>' + pins + "</div>" +
      (n ? '<div class="tcap">' + t("s2space", { n: n }) + "</div>" : "") + "</div>";
  }
  function vConsent() {
    var p = S.me.profile || {}, f = S.form;
    if (f.gender === undefined) f.gender = p.gender || "";
    if (f.birth === undefined) f.birth = isoToDots(p.birth_date || "");
    if (f.bd === undefined) { var bp = String(f.birth || "").split("."); f.bd = bp[0] || ""; f.bm = bp[1] || ""; f.by = bp[2] || ""; }
    if (f.ageExact === undefined) f.ageExact = !!p.age_exact;
    var h = (S.edit ? "" : progress(1)) + '<div class="body">' + "<h1>" + t(S.edit ? "pBirth" : "s1title") + "</h1>";   // mockup R1: no brand row
    if (!S.edit) {
      // owner, 2026-11-01: the picture of the map with the real open-space count, two short points (no intro line);
      // everything else is under «Как это устроено и что хранится» below the checkbox
      h += teaseMap(S.me.universe && S.me.universe.space_hint);
      h += '<div class="hows plain"><div>✦ ' + t("howS1") + "</div><div>✦ " + t("howS2") + "</div></div>";
    }
    // owner, 2026-10-20: typed with digits (numeric keyboard), not the date wheel; the dots are added while typing
    // owner, 2026-10-27: three fields — day, month, year (digits only, no dots to type)
    var bf = function (k, lbl, ph, max, ac) { return '<label><span class="tiny muted">' + t(lbl) + '</span><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="' + ac + '" maxlength="' + max + '" data-f="' + k + '" value="' + esc(f[k]) + '" placeholder="' + t(ph) + '"></label>'; };
    h += '<div class="field"><span class="lbl" id="bdl">' + t("birth") + '</span><div class="bdate" role="group" aria-labelledby="bdl">' +
      bf("bd", "bDay", "bDayPh", 2, "bday-day") + bf("bm", "bMonth", "bMonthPh", 2, "bday-month") + bf("by", "bYear", "bYearPh", 4, "bday-year") + "</div></div>";
    h += '<div class="tiny muted">' + t("birthNote") + "</div>";
    // owner, 2026-10-20: the person chooses — an age group (default) or the exact age.
    // owner, 2026-11-01: not during registration any more (fewer questions before the start; «Назад» from the checklist
    // step too) — only when someone on the map edits the birth date in «Профиль»
    if (S.edit && S.me.active) {
      var iso = dotsToIso(f.birth), age = iso ? ageFrom(iso) : null, ok = age != null && age >= 18 && age <= 100;
      h += '<div class="field" id="agefield"><span class="lbl">' + t("ageShow") + '</span><div class="chips">' +
        chip("ageExact", "0", ok ? t("ageRange", { v: bucketOf(age) }) : t("ageRangeOnly"), !f.ageExact) +
        chip("ageExact", "1", ok ? t("ageExact", { v: age }) : t("ageExactOnly"), !!f.ageExact) + "</div></div>";
    } else h += '<div class="tiny muted">' + t("ageGroupNote") + "</div>";
    h += '<div class="field"><span class="lbl">' + t("gender") + '</span><div class="chips">' +
      ["woman", "man", "other"].map(function (g) { return chip("gender", g, t("g_" + g), f.gender === g); }).join("") + "</div></div>";
    // owner, 2026-11-01: a short checkbox; the five points, the full consent text and «О проекте» fold out under it
    h += '<label class="check"><input type="checkbox" data-f="consent"' + (f.consent || (S.edit && S.me.steps.consent) ? " checked" : "") + "><span>" + t("consentS") + "</span></label>";
    h += '<button type="button" class="cmore" data-a="cMore" aria-expanded="' + !!S.cMore + '" aria-controls="cmorebox"><span class="chev" aria-hidden="true">▸</span>' + t("moreT") + "</button>";
    if (S.cMore) h += '<div class="card small cmorebox" id="cmorebox"><div>· ' + t("how1") + "</div><div>· " + t("how2") + "</div><div>· " + t("how3") + "</div><div>· " + t("how5") + "</div><div>· " + t("how4") + "</div>" +
      '<div class="cfull">' + t("consent") + '</div><button type="button" class="btn link" style="align-self:flex-start;padding:0" data-a="page" data-v="about">' + t("abLink") + "</button></div>";
    return h + errLine() + "</div>" + consentFoot();
  }
  /** owner, 2026-11-01: «Продолжить» is off until everything is filled in; under it — what is still missing. */
  function consentMissing() {
    var f = S.form, miss = [], d = String(f.bd || ""), m = String(f.bm || ""), y = String(f.by || "");
    if (!d && !m && !y) miss.push(t("cmDate"));
    else if (!d || !m || !y) miss.push(y && y.length < 4 ? t("cmYear") : t("cmDate"));
    else if (y.length < 4) miss.push(t("cmYear"));
    else {
      var iso = dotsToIso(d + "." + m + "." + y), age = iso ? ageFrom(iso) : null;
      if (!iso) miss.push(t("cmNoDate")); else if (age < 18) miss.push(t("cmUnder")); else if (age > 100) miss.push(t("cmOld"));
    }
    if (!f.gender) miss.push(t("cmGender"));
    var agreed = f.consent === true || (f.consent !== false && !!S.edit && S.me.steps.consent);
    if (!agreed) miss.push(t("cmConsent"));
    return miss;
  }
  function consentFoot() {
    var miss = consentMissing(), back = S.edit ? '<button type="button" class="btn" data-a="cancel">' + t("cancel") + "</button>" : "";
    return '<div class="foot' + (back ? "" : " one") + '">' + back + '<button type="button" class="btn primary" id="cnext" data-a="saveConsent"' + (S.busy || miss.length ? " disabled" : "") + ">" + esc(t(S.edit ? "save" : "next")) + "</button>" +
      '<div class="tiny cmiss" id="cmiss" role="status" aria-live="polite">' + (miss.length ? esc(t("cmLeft", { list: miss.join(" · ") })) : "") + "</div></div>";
  }
  function paintConsent() {
    var b = document.getElementById("cnext"), m = document.getElementById("cmiss");
    if (!b || !m) return;
    var miss = consentMissing();
    b.disabled = !!(S.busy || miss.length);
    m.textContent = miss.length ? t("cmLeft", { list: miss.join(" · ") }) : "";
  }

  function vChecklist() {
    var c = S.me.checklist, f = S.form;
    var h = (S.edit ? "" : progress(2)) + '<div class="body"><h1>' + t(S.edit ? "clTitle" : "s2title") + "</h1>";
    if (S.preview && c) {
      h += (S.fromSite ? '<div class="tiny muted">' + t("clFromSite") + "</div>" : "") + '<div class="card"><div class="okmark">✓ ' + t("readOk", { n: c.answered, total: c.total }) + "</div>" +
        '<div class="row"><span>' + t("role") + '</span><span class="v">' + (c.role ? t("r_" + c.role) : t("r_none")) + "</span></div>" +
        '<div class="row"><span>' + t("exp") + '</span><span class="v">' + (c.experience ? t("x_" + c.experience) : t("none")) + "</span></div>" +
        '<div class="row"><span>' + t("rel") + '</span><span class="v">' + (c.relation ? t("l_" + c.relation) : t("none")) + "</span></div>" +
        '<div class="row"><span>' + t("sections") + '</span><span class="v">' + c.sections + " / " + c.totalSections + "</span></div></div>";
      return h + "</div>" + foot(null, "afterChecklist", t("allRight"));
    }
    // owner, 2026-10-20: the checklist is filled in right here (the Kinkosmos form in a frame); a link is the other way
    var d = S.me.draft, sh = !S.edit && S.me.universe && S.me.universe.space_hint;
    // owner, 2026-11-01: short, the important words first
    if (!S.edit) h += (sh ? '<div class="s2line">' + t("s2space", { n: sh }) + "</div>" : "") + '<div class="s2line">' + t("s2need") + "</div>";
    if (d && !S.edit) {
      var k = Math.max(0, 50 - d.answered);
      h += '<div class="card"><div style="font-weight:600">' + t(k ? "dTitle" : "dTitleOk", { n: d.answered }) + "</div>" + bar(d.answered, !S.me.active) +
        '<div class="small muted">' + t(k ? "rLine" : "rLineOk", { date: fmtTime(d.updated_at), k: k }) + "</div>" +
        '<button type="button" class="btn primary" data-a="fillOpen">' + t("rGo") + '</button><button type="button" class="btn link" style="color:var(--danger)" data-a="fillAgain">' + t("rAgain") + "</button></div>";
      h += '<div class="tiny muted">' + esc(t("dNote")) + "</div>";
    } else {
      if (S.edit) h += '<div class="muted small">' + t("s2intro") + "</div>";
      h += '<button type="button" class="btn primary fillbtn" data-a="fillOpen">' + PEN + " " + t(S.edit ? "fillEdit" : "fillBtn") + "</button>";
      h += S.edit ? '<div class="tiny muted">' + esc(t("s2skip")) + "</div>" : '<div class="small muted">' + esc(t("s2skipShort")) + "</div>";
    }
    // owner, 2026-10-27: new registrations fill the checklist here only; a Kinkosmos link is pasted later, in «Анкета»
    if (!S.edit) return h + errLine() + '</div><div class="foot one"><button type="button" class="btn" data-a="backToConsent">' + t("back") + "</button></div>";
    h += '<div class="orline tiny muted"><i></i>' + t("orSite") + "<i></i></div>";
    h += '<label class="field"><span class="lbl">' + t("link") + '</span><input type="text" inputmode="url" autocomplete="off" data-f="link" value="' + esc(f.link || "") + '" placeholder="klevatess.github.io/kinkmatch/#a=…"></label>';
    h += '<button type="button" class="btn site" data-a="openSite">' + t("goSite") + ' <span aria-hidden="true">↗</span></button>';   // owner, 2026-10-22
    return h + errLine() + "</div>" + foot("cancel", "saveChecklist", t("readLink"));
  }

  var SEEKING = ["one", "couple_mfm", "couple_fmf", "third_m_mfm", "third_m_fmf", "third_f_mfm", "third_f_fmf", "orgy", "swing", "watching", "unsure"];
  /** «Кого ищет: пару для МЖМ, свинг» — first letter lower case only (МЖМ stays). */
  function seekLine(list) { return (list || []).map(function (v) { var x = t("sk_" + v); return x.charAt(0).toLowerCase() + x.slice(1); }).join(", "); }
  function vProfile() {
    var p = S.me.profile || {}, f = S.form;
    if (!f.looking) f.looking = (p.looking_for || []).slice();
    if (!f.show) f.show = (p.show_genders || []).slice();
    if (!f.seeking) f.seeking = (p.seeking || []).slice();
    if (f.amin === undefined) f.amin = p.age_min || 18;
    if (f.amax === undefined) f.amax = p.age_max || 99;
    if (f.about === undefined) f.about = p.about || "";
    if (f.aboutPublic === undefined) f.aboutPublic = p.about_public !== false;
    if (f.nick === undefined) f.nick = p.nick || "";
    var part = S.edit ? S.editPart : null, pshow = function (k) { return !part || part === k; };   // owner, 2026-10-27
    var h = (S.edit ? "" : progress(3)) + '<div class="body"><h1>' + t(part ? "pPart_" + part : "s3title") + "</h1>";
    // owner, 2026-11-02 (variant A): required fields carry a red *, «Дальше» waits for them, under it what is still missing
    if (!S.edit) h += '<div class="tiny muted" style="margin-top:-8px">' + t("reqNote", { s: REQ }) + "</div>";
    if (pshow("nick")) h += '<label class="field"><span class="lbl">' + t("nick") + REQ + '</span><input type="text" maxlength="30" autocomplete="off" data-f="nick" value="' + esc(f.nick) + '"></label>';
    if (pshow("nick")) h += '<div class="tiny muted">' + t("nickNote") + "</div>";
    if (pshow("looking")) h += '<div class="field"><span class="lbl">' + t("lblLooking") + REQ + optL("lblMany") + '</span><div class="chips">' +
      ["sessions", "relationship", "friends", "meetups", "looking"].map(function (v) { return chip("looking", v, t("lf_" + v), f.looking.indexOf(v) >= 0); }).join("") + "</div></div>";
    // owner, 2026-10-25: «Кого ищу» — information for others, never a filter; required for new profiles
    if (pshow("seeking")) h += '<div class="field"><span class="lbl">' + t("lblSeeking") + (seekReq() ? REQ : "") + optL("lblMany") + '</span><div class="chips">' +
      SEEKING.map(function (v) { return chip("seeking", v, t("sk_" + v), f.seeking.indexOf(v) >= 0); }).join("") + '</div><div class="tiny muted">' + t("seekingNote") + "</div></div>";
    if (pshow("show")) h += '<div class="field"><span class="lbl">' + t("showMe") + REQ + optL("lblMany") + '</span><div class="chips">' +
      ["man", "woman", "other"].map(function (v) { return chip("show", v, t("sh_" + v), f.show.indexOf(v) >= 0); }).join("") + "</div>" +
      '<div class="tiny muted">' + t("showNote") + "</div></div>";
    // owner, 2026-11-03: the age range is not asked during registration (18–99 by default); it stays in Профиль
    if (pshow("show") && S.edit) h += '<div class="field"><span class="lbl">' + t("ages") + optL("lblAgesOpt") + '</span><div class="ages"><label class="small">' + t("from") + ' <input type="number" min="18" max="99" data-f="amin" value="' + esc(f.amin) + '"></label><label class="small">' + t("to") + ' <input type="number" min="18" max="99" data-f="amax" value="' + esc(f.amax) + '"></label></div></div>';
    if (pshow("about")) h += '<div class="card about"><div class="lbl">' + t("lblAbout") + REQ + optL("lblAboutMin") + "</div>" + (p.about_hidden ? '<div role="alert" class="small" style="color:var(--danger);line-height:1.5">' + t("aboutHiddenNote") + "</div>" : "") + '<div class="tiny muted">' + t("aboutIdeas") + '</div><div class="chips">' +
      ["aboutS1", "aboutS2", "aboutS3", "aboutS4", "aboutS5"].map(function (k) { return '<button type="button" class="chip" data-a="aboutAdd" data-v="' + k + '">+ ' + t(k) + "</button>"; }).join("") + "</div>" +
      '<textarea maxlength="1500" data-f="about" placeholder="' + esc(t("aboutPh")) + '">' + esc(f.about) + '</textarea><div class="tiny" style="display:flex;justify-content:space-between;gap:8px"><span id="aboutmore" style="color:var(--danger)">' + aboutMore(f.about) + '</span><span class="muted" id="aboutcount">' + String(f.about || "").length + " / 1500</span></div></div>";
    if (pshow("about")) h += '<label class="check"><input type="checkbox" data-f="aboutPublic"' + (f.aboutPublic ? " checked" : "") + "><span>" + t("aboutPublic") + "</span></label>";

    // owner, 2026-10-21: «Где вас видно» (a chat of theirs is in the universe) / open space for someone without chats
    var um = uniMine();
    if (!S.edit && um) {
      if (f.uni === undefined) f.uni = um.on === null ? true : um.on;
      var mineL = quoted(um.mine), othersL = quoted(um.all.filter(function (c) { return um.mine.indexOf(c) < 0; }));
      h += '<div class="lbl">' + t("uniWhere") + "</div>";
      [[true, "uniBoth", "uniBothNote"], [false, "uniOnly", "uniOnlyNote"]].forEach(function (o) {
        h += '<label class="card radio' + (f.uni === o[0] ? " on" : "") + '"><span style="display:flex;gap:10px;align-items:flex-start;font-weight:600"><input type="radio" name="uni" data-a="uniPick" data-v="' + (o[0] ? 1 : 0) + '"' + (f.uni === o[0] ? " checked" : "") + ">" + t(o[1]) + "</span>" +
          '<span class="small muted" style="padding-left:30px;line-height:1.5">' + t(o[2], { mine: mineL, others: othersL || "—" }) + "</span></label>";
      });
    }
    if (!S.edit && !S.me.chats.length) h += '<div class="card warn small" style="line-height:1.5"><div>' + t("noChatNote") + "</div></div>";
    return h + errLine() + "</div>" + (S.edit ? foot("cancel", "saveProfile") : profileFoot());
  }
  var REQ = '<span style="color:var(--danger);font-weight:700;margin-left:2px" aria-hidden="true">*</span>';
  function optL(k) { return ' <span class="muted" style="font-weight:400">· ' + t(k) + "</span>"; }
  function seekReq() { return !!(S.me.profile && S.me.profile.seeking_required); }
  function aboutLeft(v) { return Math.max(0, 20 - String(v || "").trim().length); }
  function aboutMore(v) { var n = aboutLeft(v); return n ? esc(t("aboutMore", { n: n })) : ""; }
  /** owner, 2026-11-02: the same checks as saveProfile, in the order the fields stand on the screen */
  function profileMissing() {
    var f = S.form, miss = [];
    if (!String(f.nick || "").trim()) miss.push(t("pmNick"));
    if (!(f.looking || []).length) miss.push(t("pmLooking"));
    if (seekReq() && !(f.seeking || []).length) miss.push(t("pmSeeking"));
    if (!(f.show || []).length) miss.push(t("pmShow"));
    if (aboutLeft(f.about)) miss.push(t("pmAbout", { n: aboutLeft(f.about) }));
    return miss;
  }
  function profileFoot() {
    var miss = profileMissing();
    return '<div class="foot"><button type="button" class="btn" data-a="backToChecklist">' + t("back") + '</button><button type="button" class="btn primary" id="pnext" data-a="saveProfile"' + (S.busy || miss.length ? " disabled" : "") + ">" + esc(t("next")) + "</button>" +
      '<div class="tiny cmiss" id="pmiss" role="status" aria-live="polite">' + (miss.length ? esc(t("cmLeft", { list: miss.join(" · ") })) : "") + "</div></div>";
  }
  function paintProfile() {
    var b = document.getElementById("pnext"), m = document.getElementById("pmiss"), am = document.getElementById("aboutmore");
    if (am) am.textContent = aboutLeft(S.form.about) ? t("aboutMore", { n: aboutLeft(S.form.about) }) : "";
    if (!b || !m) return;
    var miss = profileMissing();
    b.disabled = !!(S.busy || miss.length);
    m.textContent = miss.length ? t("cmLeft", { list: miss.join(" · ") }) : "";
  }

  function vPlace() {
    var f = S.form, loc = S.me.location;
    if (!f.radius) f.radius = (loc && loc.radius) || S.me.radius_pref || 3;
    var h = (S.edit ? "" : progress(4)) + '<div class="body"><h1>' + t("s4title") + "</h1>";
    if (S.edit && loc && loc.next_change_at && loc.next_change_at * 1000 > Date.now() && !(loc.radius === 3 && !loc.fine_ok && S.form.radius === 1)) {
      h += '<div class="card warn small">' + t("changeFrom", { date: fmtDate(loc.next_change_at) }) + "</div></div>" + foot(null, "cancel", t("back"));
      return h;
    }
    h += '<div class="muted small">' + t("s4intro") + "</div>";
    h += '<div class="lbl">' + t("precise") + "</div>";
    [[1, "r1", "r1n"], [3, "r3", "r3n"]].forEach(function (o) {
      h += '<label class="opt' + (f.radius === o[0] ? " on" : "") + '"><input type="radio" name="radius" data-a="radius" data-v="' + o[0] + '"' + (f.radius === o[0] ? " checked" : "") +
        '><span><b>' + t(o[1]) + '</b><br><span class="small muted">' + t(o[2]) + "</span></span></label>";
    });
    h += '<button type="button" class="btn primary" data-a="useHere"' + (S.busy ? " disabled" : "") + ">" + t("useHere") + "</button>";
    if (S.geoWait) h += '<div class="card small" role="status">' + t("geoWait") + "</div>";
    h += '<button type="button" class="btn" data-a="coordsOpen">' + t("coordsBtn") + "</button>";
    if (S.coordsOpen) {
      var pc = parseCoords(f.coords || "");
      h += '<div class="card small"><div class="muted">' + t("coordsHelp") + '</div><label class="field"><span class="lbl">' + t("coordsLbl") + '</span><input type="text" autocomplete="off" inputmode="text" data-f="coords" placeholder="' + esc(t("coordsPh")) + '" value="' + esc(f.coords || "") + '"></label>' +
        '<div class="tiny" id="coordsres">' + (f.coords ? (pc ? t("coordsOk", { lat: pc.lat.toFixed(5), lon: pc.lon.toFixed(5) }) : t("e_coords")) : "") + "</div>" +
        // owner, 2026-10-21 (a dot in Iran instead of St Petersburg — the two numbers swapped): the point is shown on a map before saving
        '<div id="coordsmap" style="height:170px;border-radius:12px;overflow:hidden' + (pc ? "" : ";display:none") + '"></div>' +
        '<div class="tiny muted" id="coordshint"' + (pc ? "" : " hidden") + ">" + t("coordsCheck") + ' <button type="button" class="btn link" style="padding:0" data-a="coordsSwap">' + t("coordsSwap") + "</button></div>" +
        '<button type="button" class="btn primary" data-a="coordsSave"' + (S.busy ? " disabled" : "") + ">" + t("coordsSave") + "</button></div>";
    }
    h += '<button type="button" class="btn" data-a="otherPoint">' + t("otherPoint") + "</button>";
    if (S.chatHelp) h += '<div class="card small">' + t("otherHelp") + '<button type="button" class="btn" data-a="closeApp">' + t("closeApp") + "</button></div>";
    h += '<div class="card small muted">' + t("placeNote") + "</div>";
    return h + errLine() + "</div>" + (S.edit ? foot(null, "cancel", t("cancel")) : '<div class="foot one"><button type="button" class="btn" data-a="backToProfile">' + t("back") + "</button></div>");
  }

  Object.assign(A, {
    saveConsent: function () {
      save("consent", { consent: !!S.form.consent || (!!S.edit && S.me.steps.consent && S.form.consent !== false), birth_date: dotsToIso(S.form.birth) || S.form.birth, gender: S.form.gender, age_exact: !!S.form.ageExact },
        function () {
          if (S.edit) endEdit(); S.form = {};
          if (S.tz && !S.edit) { S.tz = null; document.documentElement.classList.remove("tzsnap"); window.scrollTo(0, 0); }   // owner, 2026-11-07: past step 1 the teaser stays behind
          if (S.pendingLink) { var l = S.pendingLink; S.pendingLink = null; S.fromSite = true; setTimeout(function () { save("checklist", { link: l }, function () { S.preview = true; }); }, 0); }
        });
    },
    // ?from=kinkoverse: the site shows its «Send to Kinkoverse» button (needs the site change, see BOT_TECH.md)
    openSite: function () { var u = ((S.me && S.me.site) || "https://klevatess.github.io/kinkmatch/") + "?from=kinkoverse"; if (tg && tg.openLink) tg.openLink(u); else window.open(u, "_blank"); },
    saveProfile: function () {
      var f = S.form;
      if (S.edit && S.editPart) {   // owner, 2026-10-27: only the section that was opened is checked and sent
        var k = S.editPart, b = {};
        if (k === "nick") { if (!String(f.nick || "").trim()) { S.err = t("e_nick"); return render(); } b.nick = f.nick; }
        if (k === "looking") { if (!f.looking.length) { S.err = t("e_pick"); return render(); } b.looking_for = f.looking; }
        if (k === "seeking") b.seeking = f.seeking;
        if (k === "show") { if (!f.show.length) { S.err = t("e_pick"); return render(); } b.show_genders = f.show; b.age_min = parseInt(f.amin, 10) || 18; b.age_max = parseInt(f.amax, 10) || 99; }
        if (k === "about") { if (String(f.about || "").trim().length < 20) { S.err = t("e_about_short"); return render(); } b.about = f.about; b.about_public = !!f.aboutPublic; }
        return save("profile", b, function () { endEdit(); });
      }
      if (!f.looking.length || !f.show.length) { S.err = t("e_pick"); return render(); }
      if (!f.seeking.length && S.me.profile && S.me.profile.seeking_required) { S.err = t("e_seeking_required"); return render(); }
      if (!String(f.nick || "").trim()) { S.err = t("e_nick"); return render(); }
      if (String(f.about || "").trim().length < 20) { S.err = t("e_about_short"); return render(); }
      save("profile", { looking_for: f.looking, seeking: f.seeking, show_genders: f.show, age_min: parseInt(f.amin, 10) || 18, age_max: parseInt(f.amax, 10) || 99,
        about: f.about, about_public: !!f.aboutPublic, nick: f.nick,
        universe: !S.edit && uniMine() ? f.uni !== false : undefined, space_default: !S.edit && !S.me.chats.length ? true : undefined }, function () { if (S.edit) endEdit(); S.form = {}; });
    },
    radius: function (el) { S.form.radius = +el.dataset.v; api("POST", "settings", { radius: S.form.radius }); render(); },
    useHere: function () {
      S.err = ""; S.geoWait = true; render();
      getPoint(function (pt) {
        S.geoWait = false;
        if (!pt) { S.err = t("e_geo"); S.coordsOpen = true; return render(); }
        save("location", { lat: pt.lat, lon: pt.lon, radius: radiusNow() }, function () { if (S.edit) endEdit(); S.form = {}; });
      });
    },
    coordsSwap: function () {
      var pc = parseCoords(S.form.coords || ""); if (!pc) return;
      S.form.coords = pc.lon + ", " + pc.lat; render();
    },
    coordsOpen: function () { S.coordsOpen = !S.coordsOpen; render(); },
    coordsSave: function () {
      var pc = parseCoords(S.form.coords || "");
      if (!pc) { S.err = t("e_coords"); return render(); }
      save("location", { lat: pc.lat, lon: pc.lon, radius: radiusNow() }, function () { S.coordsOpen = false; if (S.edit) endEdit(); S.form = {}; });
    },
    otherPoint: function () { S.chatHelp = true; api("POST", "settings", { radius: S.form.radius }); render(); },
    closeApp: function () { if (tg) tg.close(); },
    backToConsent: function () { startEdit("consent"); },
    cMore: function () { S.cMore = !S.cMore; render(); },
    backToChecklist: function () { startEdit("checklist"); },
    backToProfile: function () { startEdit("profile"); },
    cancel: endEdit,
    aboutAdd: function (el) {
      var f = S.form, cur = String(f.about || ""), add = t(el.dataset.v) + " ";
      if ((cur + add).length > 1500) return;
      f.about = cur + (cur && !/\n$/.test(cur) ? "\n" : "") + add; render();
      var ta = app.querySelector('[data-f="about"]'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    },
    page: function (el) { S.page = el.dataset.v; render(); window.scrollTo(0, 0); },
    fillAgain: function () {
      confirm2(t("rAgain1"), t("rAgain2"), function () {
        api("POST", "draft", { clear: true }).then(function () { if (S.me) S.me.draft = null; fillShow(true, true); }, function () { S.err = t("netErr"); render(); });
      });
    },
    uniPick: function (el) { S.form.uni = el.dataset.v === "1"; render(); },
  });
  /* ===== app-src/02-cards.js — Card helpers shared by lists: shown(), distance labels, role / star marks, pctBox, nbCard, novaCard, stateBox, search.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  /* ---------- neighbours ---------- */
  var BAND_OK = { all: null, "1": ["1"], "3": ["1", "3"], far: ["10", "30", "far"] };
  function shown(withHidden) {
    return (S.nb && S.nb.items || []).filter(function (n) {
      // owner, 2026-10-26: several distance / role chips at once (an OR inside each group); quick filters «Новые»,
      // «Ответили «да»» narrow, «Хотят того же» sorts by shared Love / Yes; «не сейчас» comes back after 5 days
      var bandOk = S.fDist >= 7 || (n.km != null ? n.km : 99999) <= DIST[S.fDist];   // owner, 2026-10-27: the distance slider
      var roleOk = !S.fRoles.length || S.fRoles.indexOf(n.role || "none") >= 0;
      var q = S.fQuick, newOk = q.indexOf("new") < 0 || isNew(n), likeOk = q.indexOf("likes") < 0 || (n.likes_me && !n.mutual), readyOk = q.indexOf("ready") < 0 || n.ready;
      return (withHidden || n.my !== "no" || n.was_hidden) && fromOk(n) && bandOk && roleOk && newOk && likeOk && readyOk
        && (!S.fItems.length || !!(S.found && S.found[n.id]))   // owner, 2026-10-24: search by practice
        && intFilterOk(n) && (q.indexOf("ints") < 0 || commonOf(n).length > 0);   // owner, 2026-10-28: interests
    }).sort(function (a, b) {
      if (S.fQuick.indexOf("keen") >= 0) return (b.keen || 0) - (a.keen || 0) || (b.pct || 0) - (a.pct || 0);
      if (S.fQuick.indexOf("ints") >= 0) return commonOf(b).length - commonOf(a).length || (b.pct || 0) - (a.pct || 0);
      return S.nbSort === "near" ? (a.km || 0) - (b.km || 0) || (b.pct || 0) - (a.pct || 0) : 0;
    });
  }
  /* owner, 2026-10-27: distance — a slider 1 · 3 · 10 · 30 · 100 · 300 · 1000 km · anywhere, and rounded km on the cards */
  var DIST = [1, 3, 10, 30, 100, 300, 1000, Infinity];
  function distLabel(i) { return i >= 7 ? t("distAll") : t("distUpTo", { km: kmNum(DIST[i]) }); }
  function kmNum(k) { return String(k).replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009"); }
  function kmText(n) { return n.km != null ? t("kmFmt", { km: kmNum(n.km) }) : t("b_" + n.band); }
  var NEW_DAYS = 7;
  function toggleIn(list, v) { if (v === "all") return []; var i = list.indexOf(v); return i >= 0 ? list.slice(0, i).concat(list.slice(i + 1)) : list.concat([v]); }
  function isNew(n) { return !!n.since && Date.now() / 1000 - n.since < NEW_DAYS * 86400; }
  /* owner, 2026-10-21: the source filter widens step by step, never cuts:
     «Мои чаты» — people of my chats; «Вселенная» — those plus everyone of the universe; «Космос» — all of the above plus
     open space. «all» (the default) = the widest level this person has. */
  var FROM_RANK = { chats: 0, uni: 1, space: 2 };
  function fromLevels() {
    var l = ["chats"];
    if (uniMine() && uniMine().on) l.push("uni");
    if (S.nb && S.nb.me && S.nb.me.space) l.push("space");
    return l;
  }
  function fromNow() { var l = fromLevels(); return l.indexOf(S.fFrom) >= 0 ? S.fFrom : l[l.length - 1]; }
  function fromOk(n) {
    var r = FROM_RANK[fromNow()];
    if (n.chats.length > 0) return true;
    if (r >= 1 && (n.in_uni || n.uni)) return true;
    return r >= 2;   // open space: everyone the list has
  }
  function level(p) { return p == null ? "" : p >= 85 ? t("lvl_top") : p >= 70 ? t("lvl_high") : p >= 50 ? t("lvl_mid") : t("lvl_low"); }   // formula v4 (2026-10-20)
  function roleMark(r) { return r ? '<span class="role r-' + r + '" aria-hidden="true"></span>' : ""; }
  /* owner, 2026-10-27: «Звезда комьюнити» — a textured gold star with the gender colour inside, instead of the role mark */
  var STAR_OUT = "M12 1 15.1 8 22.8 8.7 17 13.8 18.7 21.4 12 17.4 5.3 21.4 7 13.8 1.2 8.7 8.9 8z", STAR_IN = "M12 7.6 13.4 10.7 16.8 11 14.2 13.3 15 16.6 12 14.9 9 16.6 9.8 13.3 7.2 11 10.6 10.7z";
  function starSvg(g, px) {
    return '<svg class="cstar g-' + (g || "other") + '" width="' + px + '" height="' + px + '" viewBox="0 0 24 24" aria-hidden="true"><path class="co" d="' + STAR_OUT + '"/>' +
      '<path class="cg" d="M12 2.7 13.6 6.4 12 5.8 10.4 6.4z"/><path class="ci" d="' + STAR_IN + '"/></svg>';
  }
  function nameMark(n, px) { return n.star ? starSvg(n.gender, px || 18) + " " : roleMark(n.role); }
  function capLine(n) { return n.star && n.star.caption ? '<div class="capline">' + esc(n.star.caption) + "</div>" : ""; }
  /** Owner, 2026-10-20: with a switch, both directions — «вы как Верх 74 % · вы как Низ 58 %» (or the neighbour's roles). */
  function dirsLine(d) {
    return d.map(function (x) {
      return x.me ? t("dirMe", { r: t(x.me).toLowerCase(), p: x.pct }) : t("dirThem", { r: t(x.them).toLowerCase(), p: x.pct });
    }).join(" · ") + '<div class="tiny muted">' + t("dirsAvg") + "</div>";
  }

  function pctBox(n) {
    if (n.preview) return "";
    if (n.pending) return '<div class="pct"><small>' + t("counting") + "</small></div>";
    if (n.pct == null) return '<div class="pct"><small>' + t("fewShared") + "</small></div>";
    return '<div class="pct"><b style="color:' + pctCol(n.pct) + '">' + n.pct + " %</b><small>" + level(n.pct) + "</small></div>";
  }
  /** owner, 2026-11-07: the percent's colour — lower = violet (as before), higher = closer to the palette's pink-red */
  var PCT_COL = { light: [[90, 63, 184], [224, 85, 154]], dark: [[205, 188, 255], [255, 140, 198]] };   // to the map's «women» pink, not a new red
  function pctCol(p) {
    var c = PCT_COL[document.documentElement.dataset.theme === "dark" ? "dark" : "light"], k = Math.max(0, Math.min(1, ((p || 0) - 45) / 50));
    return "rgb(" + [0, 1, 2].map(function (i) { return Math.round(c[0][i] + (c[1][i] - c[0][i]) * k); }).join(",") + ")";
  }
  /** the small percent pill (swipe, the person's page) */
  function pctPill(n) {
    if (n.pct == null || n.preview) return "";
    return '<span class="ppill" style="color:' + pctCol(n.pct) + '" aria-label="' + esc(t("match") + " " + n.pct + " %") + '">' + n.pct + " %</span>";
  }
  function who(n) { return t("g_" + n.gender) + " · " + n.age_bucket + " · " + t("r_" + (n.role || "none")); }
  function whereFrom(n) { return [n.chats.length ? chatsOf(n) : "", n.uni ? '<span class="tag uni">' + t("uniTag") + "</span> " + t("fromUni", { list: (n.uni_chats || []).map(function (c) { return "«" + esc(c) + "»"; }).join(", ") }) : "", n.space ? '<span class="tag sp">' + t("spaceTag") + "</span>" : ""].filter(Boolean).join(" · "); }
  function quoted(a) { return a.map(function (c) { return "«" + esc(c) + "»"; }).join(", "); }
  function uniMine() { return S.me && S.me.universe && S.me.universe.mine.length ? S.me.universe : null; }
  function chatsOf(n) { return n.chats.map(function (c) { return "«" + esc(c) + "»"; }).join(", "); }
  /** owner, 2026-10-31: the list + people I said «да» to who paused since (S.nb.on_pause) — for lookups by id */
  function nbAll() { return S.nb ? (S.nb.items || []).concat(S.nb.on_pause || []) : []; }
  function nbFind(id) { return nbAll().filter(function (x) { return x.id === id; })[0]; }
  var ENV_ICO = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
  var LOCK18 = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  /** a paused person's card in «Скрыли анкету»: no distance, no chats */
  function pzCard(n) {
    return '<div class="card nb pz"><div class="nbtop"><div><div style="font-weight:600">' + nameMark(n) + esc(n.nick || who(n)) + '</div><div class="small muted">' + (n.nick ? esc(who(n)) : "") + "</div></div>" +
      '<span class="tag pzt">' + t("pzTag") + "</span></div>" + '<div class="tiny muted">' + t("pzSince", { date: fmtDate(n.yes_at) }) + (n.msg_out ? " · " + t("msgTag") : "") + "</div>" +
      '<div class="pzbtns"><button type="button" class="btn dangerline sm" data-a="pzAsk" data-v="' + esc(n.id) + '">' + t("pzWithdraw") + '</button><button type="button" class="btn sm" data-a="openPerson" data-v="' + esc(n.id) + '">' + t("pzOpen") + "</button></div></div>";
  }
  var SPARK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1c.6 5.2 3.8 8.4 11 11-7.2 2.6-10.4 5.8-11 11-.6-5.2-3.8-8.4-11-11 7.2-2.6 10.4-5.8 11-11z"/></svg>';
  function nbCard(n) {
    if (n.nova) return novaCard(n);   // owner, 2026-10-31: «Сверхновая» — a nebula
    return '<button type="button" class="card nb' + (n.ready ? " rdy" : "") + '" data-a="openPerson" data-v="' + esc(n.id) + '"><div class="nbtop"><div><div style="font-weight:600">' + nameMark(n) + esc(n.nick || who(n)) +
      "</div>" + capLine(n) + '<div class="small muted">' + (n.nick ? esc(who(n)) + " · " : "") + kmText(n) + (n.preview ? "" : " · " + whereFrom(n)) + (n.answered ? " · " + ansOf(n) : "") + "</div></div>" + pctBox(n) + "</div>" +
      (n.about ? '<p class="about nbabout">' + esc(n.about) + "</p>" : "") +   // owner, 2026-11-07 (mockup N1): the start of «О себе»
      ((n.themes.length || n.my === "yes" || n.likes_me || n.out_age || n.was_hidden || (n.fresh && !n.mutual) || n.ready || n.sus) ? '<div class="tags">' + (n.sus ? '<span class="tag sus">' + t("susTag") + "</span>" : "") + (n.ready ? '<span class="tag ready"><i aria-hidden="true"></i>' + readyWord(n.gender) + "</span>" : "") + (n.was_hidden ? '<span class="tag">' + t("wasHidden") + "</span>" : "") + (n.fresh && !n.mutual ? '<span class="tag new">' + t("newTag") + "</span>" : "") + (n.mutual ? '<span class="tag on">' + t("mutualBadge") + "</span>" : n.my === "yes" ? '<span class="tag on">' + t("yesBadge") + "</span>" : "") +
        (n.likes_me && n.my !== "yes" ? '<span class="tag like">♥ ' + t("likesYou") + "</span>" : "") +
        (n.out_age ? '<span class="tag">' + t("outAge") + "</span>" : "") +   // owner, 2026-11-03: liked me, outside my age range (n.msg_in ? '<span class="tag msg">' + ENV_ICO + " " + t("msgTag") + "</span>" : "") +
        n.themes.map(function (x) { return '<span class="tag out">' + esc(x) + "</span>"; }).join("") + "</div>" : "") + intsLine(n) + hitsLine(n) + "</button>";   // mockup N1: themes as outlined tags
  }
  /* owner, 2026-11-02: variant 1b — a light nebula in the list (paper card, pink / blue glows at the sides), not the
     dark one; the person's page, chat and profile keep the dark nebula (.neb) */
  function novaCard(n) {
    return '<button type="button" class="card nb nebl" data-a="openPerson" data-v="' + esc(n.id) + '"><div class="nbtop"><div><b class="nvname">' + SPARK + " " + esc(n.nick || who(n)) + '</b>' +
      (n.star && n.star.caption ? '<div class="sec small">' + esc(n.star.caption) + "</div>" : "") + '<div class="sec small">' + esc(who(n)) + (n.km != null ? " · " + kmText(n) : "") + "</div></div>" +
      pctBox(n) + '</div><div class="tags"><span class="nlpill">' + "✦ " + t("novaTag") + "</span>" + (n.msg_in ? '<span class="nlpill">' + ENV_ICO + " " + t("msgTag") + "</span>" : "") +
      (n.likes_me && n.my !== "yes" ? '<span class="nlpill">♥ ' + t("likesYou") + "</span>" : n.my === "yes" && !n.mutual ? '<span class="nlpill">' + t("yesBadge") + "</span>" : n.mutual ? '<span class="nlpill">' + t("mutualBadge") + "</span>" : "") + "</div></button>";
  }
  /** owner, 2026-10-26: the reason as an action — people behind a switch that is off, one tap to switch it on. */
  /** owner, 2026-11-03: the person's own age range hides 7 or more people — one tap widens it to 18–99 */
  function ageBanner() {
    var n = S.nb && S.nb.age_hidden || 0;
    return n >= 7 ? '<div class="card warn small more"><span>' + t("ageHidden", { n: n }) + '</span><button type="button" class="btn primary" data-a="ageAll"' + (S.busy ? " disabled" : "") + ">" + t("ageAllBtn") + "</button></div>" : "";
  }
  function moreBanner() {
    var um = uniMine(), sp = S.me.universe ? S.me.universe.space_people : 0;
    if (um && !um.on && um.people) return '<div class="card warn small more"><span>' + t("moreUni", { n: um.people }) + '</span><button type="button" class="btn primary" data-a="uniToggle" data-v="1">' + t("turnOn") + "</button></div>";
    if (S.nb && S.nb.me && !S.nb.me.space && sp) return '<div class="card warn small more"><span>' + t("moreSpace", { n: sp }) + '</span><button type="button" class="btn primary" data-a="spaceToggle" data-v="1">' + t("turnOn") + "</button></div>";
    return "";
  }
  /* owner, 2026-10-26: empty / error states — a small constellation, a bold title, one plain line, one button */
  var STATE_ART = {
    empty: '<path d="M34 52 L 60 34 L 86 50" stroke-dasharray="4 4"/><circle cx="34" cy="52" r="5"/><circle class="dim" cx="60" cy="34" r="4"/><circle class="dim" cx="86" cy="50" r="3"/>',
    pair: '<path d="M34 52 L 60 34"/><circle cx="34" cy="52" r="5"/><circle cx="60" cy="34" r="4"/><circle class="dim" cx="86" cy="50" r="3"/>',
    broken: '<path d="M34 52 L 50 40 M 70 38 L 86 50"/><circle cx="34" cy="52" r="5"/><circle cx="60" cy="34" r="4"/><circle cx="86" cy="50" r="3"/>',
    slow: '<path d="M20 45 A 40 22 0 0 1 100 45" stroke-dasharray="2 6"/><circle cx="100" cy="45" r="5"/><circle class="dim" cx="60" cy="45" r="4"/><circle class="dim" cx="20" cy="45" r="3"/>',
    quiet: '<path d="M34 52 L 86 50" stroke-dasharray="1 7"/><circle cx="34" cy="52" r="5"/><circle class="dim" cx="60" cy="34" r="4"/><circle class="dim" cx="86" cy="50" r="3"/>'
  };
  function stateBox(art, title, text, btn, note) {
    return '<div class="card state"><svg width="120" height="90" viewBox="0 0 120 90" aria-hidden="true"><circle class="bg" cx="60" cy="45" r="40"/>' + STATE_ART[art] +
      '<circle cx="22" cy="14" r="1.6"/><circle cx="100" cy="76" r="1.4"/><circle cx="104" cy="18" r="1"/></svg><h2 class="serif">' + title + '</h2><div class="small muted">' + text + "</div>" +
      (btn || "") + (note ? '<div class="tiny muted">' + note + "</div>" : "") + "</div>";
  }
  /** Empty list: say why, with counts only (nobody is named). */
  function whyEmpty(st) {
    var h = stateBox("empty", t("stNbT"), t("stNbX"), S.me.invite ? '<button type="button" class="btn primary" data-a="inviteShare">' + t("stNbBtn") + "</button>" : "") +
      '<div class="card"><div class="small" style="font-weight:600">' + t("whyTitle") + "</div>";
    if (!st.my_chats || !S.me.chats.length) {   // owner, 2026-10-21: no chats — say so and offer open space
      h += '<div class="small">' + t("whyNoChats2", { n: S.me.universe ? S.me.universe.space_people : 0 }) + "</div>";
      if (!st.space) return h + '<button type="button" class="btn primary" data-a="spaceToggle" data-v="1">' + t("spaceBtnOn") + "</button></div>";
    }
    else {
      h += '<div class="small">· ' + t("whyChats", { n: st.in_chats }) + "</div>";
      h += '<div class="small">· ' + t("whyReady", { n: st.ready }) + "</div>";
      if (st.ready) h += '<div class="small">· ' + t("whyFilters") + "</div>";
      if (st.in_chats > st.ready) h += '<div class="small">· ' + t("whyWait") + "</div>";
      if (!st.in_chats) h += '<div class="small">· ' + t("whyInvite") + "</div>";
    }
    if (st.ready) h += '<button type="button" class="btn" data-a="editProfile">' + t("pShow") + "</button>";
    var um = uniMine();
    if (um && !um.on && um.people) h += '<div class="small muted">' + t("whyUni", { n: um.people }) + '</div><button type="button" class="btn primary" data-a="uniToggle" data-v="1">' + t("uniBtnOn") + "</button>";
    if (!st.space) h += '<div class="small muted">' + t("whySpace") + '</div><button type="button" class="btn primary" data-a="spaceToggle" data-v="1">' + t("spaceBtnOn") + "</button>";
    return h + "</div>";
  }
  /* ---------- search by practice (owner, 2026-10-24) ---------- */
  var SEARCH_MAX = 5, searchSeq = 0;
  function norm(x) { return String(x || "").toLowerCase().replace(/ё/g, "е").trim(); }
  function itemName(id) { if (!S.itemsById && S.items) { S.itemsById = {}; S.items.forEach(function (x) { S.itemsById[x[0]] = x[1]; }); } return (S.itemsById && S.itemsById[id]) || id; }
  function loadItems() { if (S.itemsLoading || S.items) return; S.itemsLoading = true; api("GET", "items").then(function (r) { S.itemsLoading = false; if (r.ok) { S.items = r.items; S.itemsById = null; var b = document.getElementById("psug"); if (b) b.innerHTML = sugHtml(); } }, function () { S.itemsLoading = false; }); }
  function sugHtml() {
    var q = norm(S.fq);
    if (q.length < 2) return "";
    if (!S.items) return '<div class="tiny muted">' + t("loading") + "</div>";
    var first = [], rest = [];   // names (or a word in them) starting with the text come first
    for (var i = 0; i < S.items.length; i++) {
      var nm = norm(S.items[i][1]), at = nm.indexOf(q);
      if (at < 0 || S.fItems.indexOf(S.items[i][0]) >= 0) continue;
      (at === 0 || /[\s«(\/-]/.test(nm.charAt(at - 1)) ? first : rest).push(S.items[i]);
    }
    var out = first.concat(rest).slice(0, 8);
    if (!out.length) return '<div class="tiny muted">' + t("pSearchNone") + "</div>";
    return '<div class="card list sug">' + out.map(function (x) { return '<button type="button" class="crow" data-a="pAdd" data-v="' + esc(x[0]) + '"><span>' + esc(x[1]) + '</span><span class="tiny muted">' + esc(x[2]) + "</span></button>"; }).join("") + "</div>";
  }
  function searchBox() {
    var h = '<div class="psearch"><input type="search" data-a="pSearch" enterkeyhint="search" autocomplete="off" placeholder="' + esc(t("pSearchPh")) + '" value="' + esc(S.fq) + '"><div id="psug">' + sugHtml() + "</div>";
    if (S.fItems.length) h += '<div class="tags">' + S.fItems.map(function (id) { return '<button type="button" class="tag on" data-a="pDel" data-v="' + esc(id) + '" aria-label="' + esc(t("pRemove") + ": " + itemName(id)) + '">' + esc(itemName(id)) + " ×</button>"; }).join("") +
      '<button type="button" class="btn link tiny" data-a="pClear">' + t("pClear") + "</button></div>" +
      '<div class="tiny muted">' + (S.found ? t("pSearchNote") + (S.foundHidden ? " " + t("pSearchHidden", { n: S.foundHidden }) : "") : t("pSearching")) + "</div>";
    return h + "</div>";
  }
  function runSearch() {
    var my = ++searchSeq;
    S.found = null;
    if (!S.fItems.length) return render();
    render();
    api("GET", "search?items=" + encodeURIComponent(S.fItems.join(","))).then(function (r) {
      if (my !== searchSeq) return;
      S.found = r.ok ? r.found : {}; S.foundHidden = r.ok ? r.hidden : 0; render();
    }, function () { if (my === searchSeq) { S.found = {}; render(); } });
  }
  function hitsLine(n) {
    var hits = S.fItems.length && S.found && S.found[n.id];
    return hits ? '<div class="tags">' + hits.map(function (x) { return '<span class="tag hit">' + esc(itemName(x[0])) + ": " + t("v_" + x[1]) + "</span>"; }).join("") + "</div>" : "";
  }

  Object.assign(A, {
    editProfile: function () { S.editPart = null; startEdit("profile"); },
    uniToggle: function (el) { save("settings", { universe: el.dataset.v === "1" }, function () { S.fFrom = "all"; loadNeighbours(); }); },
    spaceToggle: function (el) {
      var on = el.dataset.v === "1";
      var go = function (yes) { if (yes) save("settings", { open_space: on }, function () { S.fFrom = "all"; loadNeighbours(); }); else render(); };
      if (on) { askYes(t("spaceConfirm"), go); } else go(true);
    },
    inviteShare: function () {
      var u = "https://t.me/share/url?url=" + encodeURIComponent(S.me.invite) + "&text=" + encodeURIComponent(t("inviteShareText"));
      if (tg && tg.openTelegramLink) tg.openTelegramLink(u); else window.open(u, "_blank");
    },
    // owner, 2026-10-24: search by practice
    pAdd: function (el) {
      if (S.fItems.length >= SEARCH_MAX) { var q = t("pSearchMax", { n: SEARCH_MAX }); if (tg && tg.showAlert) tg.showAlert(q); else window.alert(q); return; }
      if (S.fItems.indexOf(el.dataset.v) < 0) S.fItems.push(el.dataset.v);
      S.fq = ""; S.zone = null; runSearch();
    },
    pDel: function (el) { S.fItems = S.fItems.filter(function (x) { return x !== el.dataset.v; }); S.zone = null; runSearch(); },
  });
  /* ===== app-src/03-interests.js — Interests: catalog loading, my interests screen, suggestions, interest filters, admin interest helpers.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */
  /* ---------- «Интересы» (owner, 2026-10-28; mockups «Kinkoverse: интересы») ----------
     The catalog is a static file (interests/catalog.json: sections → [id, name, search words]); the server adds items the
     owner accepted and extra search words (GET /api/interests). A person's picks are ids on the profile (≤ 20 hobbies,
     ≤ 60 fandoms), open to every neighbour who sees the card. Sections show their 50 most popular items; the rest is
     found by search (names, other names, Japanese titles in Cyrillic). */
  var CAT = null, catState = 0, catWait = [];   // 0 not loaded · 1 loading · 2 ready · 3 failed
  var INT_URL = "interests/catalog.json?v=2", INT_TOP = 50;   // a changed catalog: bump ?v= here (the phone keeps versioned files)
  function loadCat(cb) {
    if (catState === 2) { if (cb) cb(); return; }
    if (cb) catWait.push(cb);
    if (catState === 1) return;
    catState = 1;
    Promise.all([
      fetch(INT_URL).then(function (r) { if (!r.ok) throw new Error("catalog " + r.status); return r.json(); }),
      api("GET", "interests").catch(function () { return { ok: false }; }),
    ]).then(function (res) {
      var c = res[0], st = res[1] && res[1].ok ? res[1] : null, byId = {}, secs = {};
      c.sections.forEach(function (s) {
        secs[s.id] = s;
        s.items.forEach(function (x) { byId[x[0]] = { id: x[0], name: x[1], syn: x[2] || "", syn0: x[2] || "", sec: s.id, tab: s.tab }; });
      });
      if (st) {
        st.extra.forEach(function (x) {   // [id, section, name, alt] — added by the owner; listed at the end of its section
          var s = secs[x[1]]; if (!s) return;
          s.items = s.items.concat([[x[0], x[2], x[3] || ""]]);
          byId[x[0]] = { id: x[0], name: x[2], syn: x[3] || "", sec: s.id, tab: s.tab };
        });
        st.syn.forEach(function (x) { var it = byId[x[0]]; if (it) { it.syn += (it.syn ? "|" : "") + x[1]; (it.added = it.added || []).push([x[2], x[1]]); } });
        (st.names || []).forEach(function (x) {   // owner, 2026-10-28: renamed by the owner — the old name stays a search word
          var it = byId[x[0]]; if (!it) return;
          it.name0 = it.name; it.syn += (it.syn ? "|" : "") + it.name; it.name = x[1];
          var s = secs[it.sec]; if (s) s.items = s.items.map(function (y) { return y[0] === it.id ? [y[0], x[1], y[2]] : y; });
        });
        S.intSrv = st;
      }
      for (var k in byId) byId[k].key = norm(byId[k].name + "|" + byId[k].syn);
      CAT = { v: c.v, tabs: c.tabs, sections: c.sections, secs: secs, byId: byId, max: {} };
      c.tabs.forEach(function (tb) { CAT.max[tb.id] = st && st.limits ? st.limits[tb.id] : tb.max; });
      catState = 2;
      var w = catWait; catWait = []; w.forEach(function (f) { try { f(); } catch (e) { /* the next render shows it */ } });
      render();
    }, function () { catState = 3; catWait = []; render(); });
  }
  function intName(id) { var x = CAT && CAT.byId[id]; return x ? x.name : ""; }
  /** all of my interests: the open group, then the hidden one (owner, 2026-10-28: a second, hidden group) */
  function myInts() {
    var p = S.me && S.me.profile; if (!p) return [];
    var a = (p.interests || []).slice();
    (p.interests_hidden || []).forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); });
    return a;
  }
  function myHidden() { return (S.me && S.me.profile && S.me.profile.interests_hidden) || []; }
  function allSel(I) { return I.sel.concat(I.hid); }
  var LOCK = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  /** owner, 2026-10-28: «биологией», «динозаврами» find «Биология», «Динозавры» — a rough Russian stem for longer words */
  var RU_END = ["иями", "ями", "ами", "ией", "иям", "ого", "его", "ему", "ому", "ыми", "ими", "ов", "ев", "ей", "ий", "ый", "ой", "ая", "яя", "ое", "ее", "ые", "ие", "ом", "ем", "ах", "ях", "ам", "ям", "ию", "ия", "ии", "ью", "а", "я", "ы", "и", "у", "ю", "е", "о", "ь", "й"];
  function stemRu(q) {
    if (q.length < 5 || !/[а-я]$/.test(q)) return "";
    for (var i = 0; i < RU_END.length; i++) { var e = RU_END[i]; if (q.length - e.length >= 4 && q.slice(-e.length) === e) return q.slice(0, -e.length); }
    return "";
  }
  function commonOf(n) { var m = myInts(); return (n.interests || []).filter(function (x) { return m.indexOf(x) >= 0; }); }
  /** «3 интереса» / «1 интерес» / «5 интересов»; English «3 interests» */
  function nInts(n) {
    if (S.lang === "en") return n + (n === 1 ? " interest" : " interests");
    var a = n % 10, b = n % 100;
    return n + (a === 1 && b !== 11 ? " интерес" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? " интереса" : " интересов");
  }
  function itag(id, extra) { return '<span class="tag int' + (extra || "") + '">' + esc(intName(id)) + "</span>"; }
  /** search over the catalog: names and search words; names starting with the text (or a word in them) first */
  function intSearch(q, tab, sec, limit) {
    q = norm(q); if (q.length < 2 || !CAT) return [];
    var first = [], rest = [], st = stemRu(q);
    for (var k in CAT.byId) {
      var x = CAT.byId[k];
      if ((tab && x.tab !== tab) || (sec && x.sec !== sec)) continue;
      var at = x.key.indexOf(q);
      if (at < 0) { if (st && x.key.indexOf(st) >= 0) rest.push(x); continue; }
      var nm = norm(x.name), an = nm.indexOf(q);
      (an === 0 || (an > 0 && /[\s«(\/:-]/.test(nm.charAt(an - 1))) ? first : rest).push(x);
    }
    var byOrder = function (a, b) { return a.sec - b.sec || a.id - b.id; };
    return first.sort(byOrder).concat(rest.sort(byOrder)).slice(0, limit || 60);
  }
  function tabCount(sel, tab) { return sel.filter(function (id) { var x = CAT && CAT.byId[id]; return x && x.tab === tab; }).length; }

  /** the editor: S.ints = { tab, sec, q, sel, err, from } */
  function intsOpen(from) {
    var p = (S.me && S.me.profile) || {};
    S.ints = { tab: "leisure", sec: null, q: "", sel: (p.interests || []).slice(), hid: (p.interests_hidden || []).slice(), mode: "open", err: "", from: from || "", listY: 0 };
    S.launched = false; loadCat(); render(); window.scrollTo(0, 0);
  }
  function vInts() {
    var I = S.ints;
    var h = '<div class="backrow"><button type="button" data-a="intsBack" aria-label="' + t("back") + '">‹</button><span class="small muted" style="flex:1">' + t("intsOpt") + "</span></div>";
    h += '<div class="top" style="padding-top:0"><h1>' + t("ints") + '</h1><div class="small muted">' + t("intsNote", { l: (CAT && CAT.max.leisure) || 20, f: (CAT && CAT.max.fandoms) || 60 }) + "</div></div>";
    if (catState === 3) return h + '<div class="body">' + stateBox("broken", t("stErrT"), t("intsLoadErr"), '<button type="button" class="btn primary" data-a="intsRetry">' + t("retry") + "</button>") + "</div>";
    if (!CAT) return h + '<div class="body"><div class="muted center">' + t("intsLoading") + "</div></div>";
    h += '<nav class="itabs">' + CAT.tabs.map(function (tb) {
      return '<button type="button" data-a="intsTab" data-v="' + tb.id + '"' + (I.tab === tb.id ? ' aria-current="page"' : "") + "><span>" + t("tab_" + tb.id) + '</span><span class="icount">' + t("intsOf", { n: tabCount(allSel(I), tb.id), max: CAT.max[tb.id] }) + "</span></button>";
    }).join("") + "</nav>";
    h += '<div class="body" style="padding-top:10px"><label class="isearch"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>' +
      '<input type="search" data-a="intQ" enterkeyhint="search" autocomplete="off" placeholder="' + esc(I.sec ? t("intsSecSearchPh") : t("intsSearchPh")) + '" value="' + esc(I.q) + '"></label>';
    h += '<div id="intbody">' + intsBody() + "</div></div>";
    h += '<div class="foot one"><button type="button" class="btn primary" data-a="intsSave"' + (S.busy ? " disabled" : "") + ">" + t("intsDone") + "</button></div>";
    if (S.sug) h += sugSheet();
    return h;
  }
  function intRow(x) {
    var o = S.ints.sel.indexOf(x.id) >= 0, hd = S.ints.hid.indexOf(x.id) >= 0, sub = x.syn ? x.syn.split("|").slice(0, 2).join(" · ") : "";
    return '<button type="button" class="irw' + (o ? " on" : "") + (hd ? " hid" : "") + '" data-a="intToggle" data-v="' + x.id + '" aria-pressed="' + (o || hd) + '"><span class="ibox" aria-hidden="true">' + (o ? "✓" : hd ? LOCK : "") + '</span><span class="pmain"><span>' + esc(x.name) + (hd ? ' <span class="tiny muted">· ' + t("intsHidG").toLowerCase() + "</span>" : "") + "</span>" +
      (sub ? '<span class="tiny muted">' + esc(sub) + "</span>" : "") + "</span></button>";
  }
  function intsBody() {
    var I = S.ints, h = "";
    var inTab = function (arr) { return arr.filter(function (id) { var x = CAT.byId[id]; return x && x.tab === I.tab; }); };
    var po = inTab(I.sel), ph = inTab(I.hid);
    // owner, 2026-10-28: two groups — open to everyone / hidden (seen only by people who have the item too)
    h += '<div class="seg iseg">' + [["open", "intsOpenG", po.length], ["hidden", "intsHidG", ph.length]].map(function (o) {
      return '<button type="button" data-a="intsMode" data-v="' + o[0] + '" aria-pressed="' + (I.mode === o[0]) + '">' + (o[0] === "hidden" ? LOCK + " " : "") + t(o[1]) + (o[2] ? " · " + o[2] : "") + "</button>"; }).join("") + "</div>";
    if (I.mode === "hidden") h += '<div class="tiny muted">' + t("intsHidNote") + "</div>";
    if (I.err) h += '<div class="err" role="alert">' + esc(I.err) + "</div>";
    var chips = function (arr, hid) { return '<div class="tags">' + arr.map(function (id) {
      return '<button type="button" class="tag int on' + (hid ? " hid" : "") + '" data-a="intDel" data-v="' + id + '" aria-label="' + esc(t("pRemove") + ": " + intName(id)) + '">' + (hid ? LOCK + " " : "") + esc(intName(id)) + " ×</button>"; }).join("") + "</div>"; };
    if (!I.q) {
      if (po.length) h += '<div class="lbl">' + t("intsOpenG") + "</div>" + chips(po, false);
      if (ph.length) h += '<div class="lbl">' + t("intsPickedHid") + "</div>" + chips(ph, true);
    }
    if (I.q && norm(I.q).length >= 2) {
      // owner, 2026-10-28: search in this tab (or section); what is elsewhere is said, not mixed in
      var other = I.tab === "leisure" ? "fandoms" : "leisure";
      var hits = intSearch(I.q, I.tab, I.sec, 60), lastSec = null;
      var elseSec = I.sec ? intSearch(I.q, I.tab, null, 40).filter(function (x) { return x.sec !== I.sec; }).slice(0, 10) : [];
      var elseTab = intSearch(I.q, other, null, 10);
      var list = function (arr) { var o = '<div class="card list">', ls = null; arr.forEach(function (x) {
        if (x.sec !== ls) { ls = x.sec; o += '<div class="isec tiny muted">' + t("tab_" + x.tab) + " · " + esc(CAT.secs[x.sec].name) + "</div>"; }
        o += intRow(x); }); return o + "</div>"; };
      if (!hits.length) h += '<div class="small muted">' + esc(t("intsNoneIn", { where: I.sec ? CAT.secs[I.sec].name : t("tab_" + I.tab) })) + "</div>";
      else h += list(hits);
      if (elseSec.length) h += '<div class="lbl">' + t("intsInOtherSecs") + "</div>" + list(elseSec);
      if (elseTab.length) h += '<div class="lbl">' + esc(t("intsInOtherTab", { tab: t("tab_" + other) })) + "</div>" + list(elseTab);
      return h + '<button type="button" class="card isug" data-a="sugOpen">' + esc(t("intsSuggestQ", { q: I.q.trim().slice(0, 60) })) + "</button>" + mySugs();
    }
    if (I.sec) {
      var s = CAT.secs[I.sec], top = s.items.slice(0, INT_TOP), extraOn = s.items.slice(INT_TOP).filter(function (x) { return allSel(I).indexOf(x[0]) >= 0; });
      h += '<button type="button" class="btn link" style="align-self:flex-start;padding:0" data-a="intSec" data-v="">‹ ' + t("intsAllSecs") + '</button><h2 class="serif">' + esc(s.name) + "</h2>";
      if (s.items.length > INT_TOP) h += '<div class="tiny muted">' + t("intsTopNote", { top: INT_TOP, n: s.items.length - INT_TOP }) + "</div>";
      h += '<div class="card list">' + extraOn.concat(top).map(function (x) { return intRow(CAT.byId[x[0]]); }).join("") + "</div>";
      return h + '<div class="sugfade"><button type="button" class="btn" data-a="sugOpen">' + t("intsSuggestBtn") + "</button></div>";
    }
    h += '<div class="card list">' + CAT.sections.filter(function (s) { return s.tab === I.tab; }).map(function (s) {
      var n = allSel(I).filter(function (id) { var x = CAT.byId[id]; return x && x.sec === s.id; }).length;
      return '<button type="button" class="prw" data-a="intSec" data-v="' + s.id + '"><span class="pmain"><span class="pv">' + esc(s.name) + "</span></span>" + (n ? '<span class="icount">' + n + "</span>" : "") + CHEV + "</button>";
    }).join("") + "</div>";
    return h + '<div class="sugfade"><button type="button" class="btn" data-a="sugOpen">' + t("intsSuggestBtn") + "</button></div>" + mySugs();
  }
  function mySugs() {
    var st = S.intSrv && S.intSrv.suggest;
    if (!st || !st.list.length) return "";
    return '<div class="lbl">' + t("sugMine") + '</div><div class="card list">' + st.list.slice(0, 10).map(function (x) {
      return '<div class="crow"><span>' + esc(x.name) + '</span><span class="tag ' + (x.status === "added" ? "new" : x.status === "pending" ? "int" : "") + '">' + t("sug_" + x.status) + "</span></div>"; }).join("") + "</div>";
  }
  /** scroll so that `sel` is at the top of the screen — only when the page is scrolled below it (never to the very top) */
  function intsToTop(sel) {
    var b = app.querySelector(sel); if (!b) return;
    var y = Math.max(0, b.getBoundingClientRect().top + (window.scrollY || 0) - 8);
    if ((window.scrollY || 0) > y) window.scrollTo(0, y);
  }
  function intsRefresh(keepFocus) {
    var b = document.getElementById("intbody");
    if (!b) return render();
    b.innerHTML = intsBody();
    var tabs = app.querySelectorAll(".itabs .icount");
    if (tabs.length === CAT.tabs.length) CAT.tabs.forEach(function (tb, i) { tabs[i].textContent = t("intsOf", { n: tabCount(allSel(S.ints), tb.id), max: CAT.max[tb.id] }); });
    if (keepFocus) { var q = app.querySelector('[data-a="intQ"]'); if (q && document.activeElement !== q) q.focus(); }
  }
  /** «Предложить» sheet: S.sug = { name, section, alt, sent } */
  function sugSheet() {
    var st = S.intSrv && S.intSrv.suggest, G = S.sug;
    // the picks in the editor count even before «Готово»: sending saves them first
    var picked = S.ints ? allSel(S.ints).length : st ? st.picked : 0, can = !!st && picked >= st.need.interests && st.answered >= st.need.answers;
    var h = '<div class="modal-bg sheet" data-a="sugClose"><div class="card sheetbox" role="dialog" aria-modal="true" aria-labelledby="sugh" data-a="noop"><div class="grab" aria-hidden="true"></div>';
    if (!can) {
      var okI = !!st && picked >= st.need.interests, okA = st && st.answered >= st.need.answers;
      h += '<h2 id="sugh" class="serif" style="font-size:21px">' + t("sugLockT") + '</h2><div class="small muted">' + t("sugLockX") + "</div>" +
        '<div class="need"><span class="nd' + (okI ? " ok" : "") + '" aria-hidden="true">' + (okI ? "✓" : "") + "</span><span>" + t("sugNeedInts", { n: st ? st.need.interests : 3 }) + '</span><span class="tiny muted">' + picked + "</span></div>" +
        '<div class="need"><span class="nd' + (okA ? " ok" : "") + '" aria-hidden="true">' + (okA ? "✓" : "") + "</span><span>" + t("sugNeedAns", { n: st ? st.need.answers : 350 }) + '</span><span class="tiny muted">' + (st ? st.answered : 0) + " / " + (st ? st.need.answers : 350) + "</span></div>" +
        '<div class="decide"><button type="button" class="btn" data-a="sugClose">' + t("sugOk") + "</button>" + (okA ? "" : '<button type="button" class="btn primary" data-a="sugFill">' + t("sugFill") + "</button>") + "</div></div></div>";
      return h;
    }
    if (G.sent) return h + '<h2 id="sugh" class="serif" style="font-size:21px">' + t("sugTitle") + '</h2><div class="card ok small" role="status">' + t("sugSent") + '</div><button type="button" class="btn primary" data-a="sugClose">' + t("ok") + "</button></div></div>";
    var full = st.waiting >= st.slots, opts = CAT.sections.map(function (s) { return '<option value="' + s.id + '"' + (+G.section === s.id ? " selected" : "") + ">" + esc(t("tab_" + s.tab) + " · " + s.name) + "</option>"; }).join("");
    h += '<h2 id="sugh" class="serif" style="font-size:21px">' + t("sugTitle") + '</h2><div class="small muted">' + t("sugText") + "</div>" +
      '<label class="field"><span class="lbl">' + t("sugName") + '</span><input type="text" maxlength="60" data-f="sugName" value="' + esc(G.name || "") + '"></label>' +
      '<label class="field"><span class="lbl">' + t("sugSec") + '</span><select data-f="sugSec"><option value="">—</option>' + opts + "</select></label>" +
      '<label class="field"><span class="lbl">' + t("sugAlt") + '</span><input type="text" maxlength="100" data-f="sugAlt" placeholder="' + esc(t("sugAltPh")) + '" value="' + esc(G.alt || "") + '"></label>' +
      '<div class="tiny muted">' + (full ? t("sugFull", { max: st.slots }) : t("sugSlots", { n: st.waiting, max: st.slots })) + "</div>" + errLine() +
      '<div class="decide"><button type="button" class="btn" data-a="sugClose">' + t("cancel") + '</button><button type="button" class="btn primary" data-a="sugSend"' + (full || S.busy ? " disabled" : "") + ">" + t("sugSend") + "</button></div></div></div>";
    return h;
  }

  /** after «Запустить» (owner, 2026-10-28): the profile is on the map already; interests are an offer, not a step */
  function vLaunched() {
    var n = S.nb && S.nb.items ? S.nb.items.length : null;
    return '<div class="body"><div class="launchmap" aria-hidden="true"><svg width="100%" height="100%" viewBox="0 0 362 220" preserveAspectRatio="xMidYMid slice"><path d="M0 150 C80 120 140 180 230 140 S330 90 362 110" stroke="var(--line)" stroke-width="10" fill="none"/>' +
      '<path d="M120 0 C130 70 100 140 150 220" stroke="var(--line)" stroke-width="7" fill="none"/><circle cx="190" cy="100" r="52" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 4"/><circle cx="190" cy="100" r="8" fill="var(--accent)"/></svg></div>' +
      '<span class="tag new" style="align-self:flex-start;font-size:12.5px;padding:4px 10px">' + t("launchBadge") + '</span><h1>' + t("launchT") + '</h1><div class="small muted">' + t("launchX") + (n ? " " + t("launchN", { n: n }) : "") + "</div>" +
      '<div class="card"><h2>' + t("launchIntsT") + '</h2><div class="small muted" style="line-height:1.5">' + t("launchIntsX") + '</div><button type="button" class="btn accent" data-a="intsOpen" data-v="launch">' + t("launchIntsBtn") + "</button></div></div>" +
      '<div class="foot one"><button type="button" class="btn primary" data-a="launchDone">' + t("launchGo") + "</button></div>";
  }

  /** a line on a neighbour's card: shared interests, or a hint when the viewer has none yet */
  function intsLine(n) {
    var all = n.interests || [];
    if (!all.length) return "";
    if (!myInts().length) return '<div class="iline">' + esc(t("intsTeaser", { n: nInts(all.length) })) + "</div>";
    // owner, 2026-11-07: the shared ones first (bright), then up to 3 of the others (quieter, dashed)
    var c = commonOf(n), rest = all.filter(function (x) { return c.indexOf(x) < 0; }).slice(0, 3);
    if (!CAT) { loadCat(); return c.length ? '<div class="iline"><b>' + esc(t("intsCommon", { n: c.length })) + "</b></div>" : ""; }
    // mockup N1: «◆ 2 общих» (or «◆ Интересы»), then the chips
    return '<div class="tags itags"><span class="ilbl">◆ ' + esc(c.length ? t("intsCommonN", { n: c.length }) : t("swInts")) + "</span>" + c.slice(0, 6).map(function (x) { return itag(x, " on"); }).join("") + (c.length > 6 ? '<span class="tag int on">+' + (c.length - 6) + "</span>" : "") +
      rest.map(function (x) { return itag(x, " out"); }).join("") + "</div>";
  }
  /** «◆ Новое: интересы» for people who have none (owner, 2026-10-28: a different text while few neighbours have them) */
  function intsBanner() {
    if (myInts().length || S.me.ints_banner_off) return "";
    var n = (S.nb.items || []).filter(function (x) { return x.interests && x.interests.length; }).length;
    return '<div class="card ibanner"><div class="nbtop"><b>' + t("bannerT") + '</b><button type="button" class="ix" data-a="intsBannerOff" aria-label="' + esc(t("bannerClose")) + '">✕</button></div>' +
      '<div class="small">' + (n >= 5 ? t("bannerMany", { n: n }) : t("bannerFew")) + '</div><button type="button" class="btn ibtn" data-a="intsOpen" data-v="banner">' + t("bannerBtn") + "</button></div>";
  }
  /** the person page: shared interests first, then the rest */
  function intsCard(n) {
    var all = n.interests || [];
    if (!all.length) return "";
    if (!CAT) { loadCat(); return '<div class="card"><h2>' + t("personAllN", { n: all.length }) + '</h2><div class="small muted">' + t("intsLoading") + "</div></div>"; }
    var c = commonOf(n), rest = all.filter(function (x) { return c.indexOf(x) < 0; }), lim = S.intAll ? 999 : 12;
    var byTab = function (ids, cls) {
      return CAT.tabs.map(function (tb) {
        var xs = ids.filter(function (id) { var x = CAT.byId[id]; return x && x.tab === tb.id; });
        return xs.length ? '<div class="lbl">' + t("tab_" + tb.id) + '</div><div class="tags">' + xs.map(function (id) { return itag(id, cls); }).join("") + "</div>" : "";
      }).join("");
    };
    var h = '<div class="card">';
    if (c.length) h += '<div class="nbtop"><h2>' + t("personInts") + '</h2><b class="icolor">◆ ' + c.length + "</b></div>" + byTab(c, "");
    if (rest.length) {
      h += (c.length ? '<div class="sep"></div><div class="small muted">' + esc(t("personMore", { nick: n.nick || t("g_" + n.gender) })) + "</div>" : '<h2>' + t("personAllN", { n: all.length }) + "</h2>") +
        '<div class="tags">' + rest.slice(0, lim).map(function (id) { return itag(id, " out"); }).join("") +
        (rest.length > lim ? '<button type="button" class="tag out" data-a="intAll">' + t("intsMoreN", { n: rest.length - lim }) + "</button>" : "") + "</div>";
    }
    if (!myInts().length) h += '<button type="button" class="btn ibtn" data-a="intsOpen" data-v="person">' + t("personAddMine") + "</button>";
    return h + "</div>";
  }
  /** the «Интересы» row in «Профиль → Обо мне» */
  function intsRow() {
    var m = myInts();
    // owner, 2026-10-28: a new row, easy to miss → the light blue of interests until something is picked
    if (!m.length) return prow("intsOpen", "profile", '<span class="inew">' + t("intsNew") + "</span>" + t("rowInts"), '<span class="small">' + t("rowIntsEmpty") + "</span>").replace('class="prw"', 'class="prw iempty"');
    if (!CAT) loadCat();
    var hid = myHidden();
    var chips = CAT ? '<span class="tags">' + m.slice(0, 5).map(function (id) { return hid.indexOf(id) >= 0 ? '<span class="tag int hid">' + LOCK + " " + esc(intName(id)) + "</span>" : itag(id, ""); }).join("") + (m.length > 5 ? '<span class="tag out">+' + (m.length - 5) + "</span>" : "") + "</span>" : nInts(m.length);
    return prow("intsOpen", "profile", t("rowInts") + " · " + m.length + ' <span class="tiny muted">· ' + t("intsOpt") + "</span>", chips);
  }

  /* search neighbours by interests (owner, 2026-10-28): S.sMode "ints", S.fInts picked ids, S.fIntsAll = all of them */
  function intFilterOk(n) {
    if (!S.fInts.length) return true;
    var has = n.interests || [];
    return S.fIntsAll ? S.fInts.every(function (x) { return has.indexOf(x) >= 0; }) : S.fInts.some(function (x) { return has.indexOf(x) >= 0; });
  }
  function iSugHtml() {
    var q = norm(S.iq);
    if (q.length < 2) return "";
    if (!CAT) { loadCat(); return '<div class="tiny muted">' + t("loading") + "</div>"; }
    var out = intSearch(q, null, null, 8).filter(function (x) { return S.fInts.indexOf(x.id) < 0; });
    if (!out.length) return '<div class="tiny muted">' + t("intsNone") + "</div>";
    return '<div class="card list sug">' + out.map(function (x) { return '<button type="button" class="crow" data-a="iAdd" data-v="' + x.id + '"><span>' + esc(x.name) + '</span><span class="tiny muted">' + esc(CAT.secs[x.sec].name) + "</span></button>"; }).join("") + "</div>";
  }
  function intSearchBox() {
    if (!CAT) loadCat();
    var h = '<div class="psearch"><input type="search" data-a="iSearch" enterkeyhint="search" autocomplete="off" placeholder="' + esc(t("iSearchPh")) + '" value="' + esc(S.iq || "") + '"><div id="isug">' + iSugHtml() + "</div>";
    if (S.fInts.length) {
      h += '<div class="tiny muted">' + t("iHas") + '</div><div class="tags">' + S.fInts.map(function (id) { return '<button type="button" class="tag int on" data-a="iDel" data-v="' + id + '" aria-label="' + esc(t("pRemove") + ": " + intName(id)) + '">' + esc(intName(id)) + " ×</button>"; }).join("") +
        '<button type="button" class="btn link tiny" data-a="iClear">' + t("pClear") + "</button></div>";
      if (S.fInts.length > 1) h += '<div class="seg" style="margin:0">' + [[false, "iAny"], [true, "iAll"]].map(function (o) { return '<button type="button" data-a="iAllSw" data-v="' + (o[0] ? 1 : 0) + '" aria-pressed="' + (!!S.fIntsAll === o[0]) + '">' + t(o[1]) + "</button>"; }).join("") + "</div>";
    } else if (CAT) {
      var cnt = {};
      (S.nb.items || []).forEach(function (n) { (n.interests || []).forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; }); });
      var pop = Object.keys(cnt).filter(function (k) { return CAT.byId[k]; }).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 8);
      if (pop.length) h += '<div class="tiny muted">' + t("iPopular") + '</div><div class="tags">' + pop.map(function (k) { return '<button type="button" class="tag out" data-a="iAdd" data-v="' + k + '">' + esc(intName(+k)) + " · " + cnt[k] + "</button>"; }).join("") + "</div>";
    }
    return h + "</div>";
  }

  function aiCatList() {
    if (!CAT || S.aIntEdit) return "";
    var hits = norm(S.aiCatQ || "").length >= 2 ? intSearch(S.aiCatQ, null, null, 8) : [];
    return hits.length ? '<div class="card list" style="box-shadow:none">' + hits.map(function (x) { return '<button type="button" class="crow" data-a="aIntEdit" data-v="' + x.id + '"><span>' + esc(x.name) + '</span><span class="tiny muted">' + esc(t("tab_" + x.tab) + " · " + CAT.secs[x.sec].name) + "</span></button>"; }).join("") + "</div>" : "";
  }
  function aiSynList(ids) {
    var F = S.aIntForm, hits = F && F.q ? intSearch(F.q, null, null, 8) : [];
    return hits.length ? '<div class="card list">' + hits.map(function (x) { return '<button type="button" class="crow" data-a="aIntSyn" data-ids="' + ids + '" data-v="' + x.id + '"><span>' + esc(x.name) + '</span><span class="tiny muted">' + esc(CAT.secs[x.sec].name) + "</span></button>"; }).join("") + "</div>" : "";
  }

  function aIntPost(body, after) {
    if (S.busy) return;
    S.busy = true; S.err = ""; render();
    api("POST", "admin/interests", body).then(function (r) {
      S.busy = false;
      if (!r.ok) { S.err = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); return render(); }
      S.aData.ints = r; S.aIntForm = null; S.aData.overview = null;
      if (/^(add|synonym|rename|syn_add|syn_del|delete)$/.test(body.action)) { CAT = null; catState = 0; }   // the new item / word shows at once
      if (after) after(r);
      render();
    }, function () { S.busy = false; S.err = t("netErr"); render(); });
  }

  Object.assign(A, {
    // owner, 2026-10-28: «Интересы»
    intsOpen: function (el) { intsOpen(el.dataset.v); },
    intsRetry: function () { catState = 0; loadCat(); render(); },
    intsTab: function (el) { S.ints.tab = el.dataset.v; S.ints.sec = null; S.ints.q = ""; S.ints.err = ""; S.ints.listY = 0; render(); intsToTop(".itabs"); },
    intSec: function (el) {
      var I = S.ints, to = el.dataset.v ? +el.dataset.v : null;
      if (to && !I.sec) I.listY = window.scrollY || 0;   // where the list of sections was
      I.sec = to; I.q = ""; I.err = ""; render();
      if (to) intsToTop("#intbody"); else window.scrollTo(0, I.listY || 0);
    },
    intsMode: function (el) { S.ints.mode = el.dataset.v === "hidden" ? "hidden" : "open"; S.ints.err = ""; intsRefresh(false); },
    intDel: function (el) { var id = +el.dataset.v, I = S.ints; I.sel = I.sel.filter(function (x) { return x !== id; }); I.hid = I.hid.filter(function (x) { return x !== id; }); I.err = ""; intsRefresh(false); },
    intToggle: function (el) {
      var id = +el.dataset.v, I = S.ints, x = CAT && CAT.byId[id];
      var cur = I.mode === "hidden" ? I.hid : I.sel, oth = I.mode === "hidden" ? I.sel : I.hid, i = cur.indexOf(id), j = oth.indexOf(id);
      I.err = "";
      if (i >= 0) cur.splice(i, 1);
      else if (j >= 0) { oth.splice(j, 1); cur.push(id); }   // picked in the other group: moves to the group being edited
      else if (x && tabCount(allSel(I), x.tab) >= CAT.max[x.tab]) I.err = t("intsMax", { max: CAT.max[x.tab], tab: t("tab_" + x.tab) });
      else cur.push(id);
      intsRefresh(false);
    },
    intsBack: function () {
      if (S.sug) return A.sugClose();
      if (S.ints.q) { S.ints.q = ""; S.ints.err = ""; return render(); }
      if (S.ints.sec) return A.intSec({ dataset: { v: "" } });
      A.intsSave();   // leaving the editor keeps what was picked
    },
    intsSave: function () {
      var I = S.ints, p = (S.me && S.me.profile) || {}, key = function (a, b) { return (a || []).slice().sort().join(",") + "/" + (b || []).slice().sort().join(","); };
      var before = key(p.interests, p.interests_hidden), now = key(I.sel, I.hid);
      var close = function () { var from = I.from; S.ints = null; S.sug = null; if (from === "launch") S.tab = "neighbours"; render(); window.scrollTo(0, 0); };
      if (before === now) return close();
      if (S.busy) return;
      S.busy = true; render();
      api("POST", "interests", { items: I.sel, hidden: I.hid }).then(function (r) {
        S.busy = false;
        if (!r.ok) { I.err = r.error === "too_many" ? t("intsMax", { max: r.max, tab: t("tab_" + r.tab) }) : hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); return render(); }
        S.me = r; setLang(r.lang);
        if (S.intSrv) api("GET", "interests").then(function (x) { if (x.ok) S.intSrv = x; });
        close();
      }, function () { S.busy = false; I.err = t("netErr"); render(); });
    },
    sugOpen: function () { S.err = ""; S.form.sugName = (S.ints.q || "").trim().slice(0, 60); S.form.sugSec = S.ints.sec ? String(S.ints.sec) : ""; S.form.sugAlt = ""; S.sug = { name: S.form.sugName, section: S.form.sugSec, alt: "" }; render(); },
    sugClose: function (el) { if (el && el.classList && el.classList.contains("modal-bg") && S.busy) return; S.sug = null; S.err = ""; render(); },
    sugFill: function () { S.sug = null; S.ints = null; render(); A.fillOpen(); },
    sugSend: function () {
      if (S.busy) return;
      var body = { name: String(S.form.sugName || "").trim(), section: +S.form.sugSec || 0, alt: String(S.form.sugAlt || "").trim() };
      S.sug.name = body.name; S.sug.section = S.form.sugSec; S.sug.alt = body.alt;
      if (!body.section) { S.err = t("e_bad_section"); return render(); }
      if (Array.from(body.name).length < 2) { S.err = t("e_bad_length"); return render(); }
      S.busy = true; S.err = ""; render();
      var failed = function () { S.busy = false; S.err = t("netErr"); render(); };
      var send = function () {
        api("POST", "suggest", body).then(function (r) {
          S.busy = false;
          if (!r.ok) { S.err = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); return render(); }
          if (S.intSrv) S.intSrv.suggest = r.suggest;
          S.sug.sent = true; render();
        }, failed);
      };
      // picks made in the editor but not saved yet: save them first (they decide whether suggesting is open)
      if (S.ints && allSel(S.ints).slice().sort().join(",") !== myInts().slice().sort().join(",") || S.ints && S.ints.hid.slice().sort().join(",") !== myHidden().slice().sort().join(",")) {
        api("POST", "interests", { items: S.ints.sel, hidden: S.ints.hid }).then(function (r) {
          if (!r.ok) { S.busy = false; S.err = r.error === "too_many" ? t("intsMax", { max: r.max, tab: t("tab_" + r.tab) }) : t("netErr"); return render(); }
          S.me = r; send();
        }, failed);
      } else send();
    },
    launchDone: function () { S.launched = false; S.tab = "neighbours"; render(); window.scrollTo(0, 0); },
    intsBannerOff: function () { S.me.ints_banner_off = true; render(); api("POST", "settings", { ints_banner_off: true }).catch(function () { /* shown again next time */ }); },
    intAll: function () { S.intAll = true; render(); },
    iAdd: function (el) { var id = +el.dataset.v; if (S.fInts.indexOf(id) < 0) S.fInts.push(id); S.iq = ""; render(); },
    iDel: function (el) { var id = +el.dataset.v; S.fInts = S.fInts.filter(function (x) { return x !== id; }); render(); },
    iClear: function () { S.fInts = []; S.iq = ""; render(); },
    iAllSw: function (el) { S.fIntsAll = el.dataset.v === "1"; render(); },
    aIntSyn: function (el) { aIntPost({ action: "synonym", ids: el.dataset.ids.split(",").map(Number), item: +el.dataset.v }); },
  });
  /* ===== app-src/04-neighbours-map.js — «Соседи»: vNeighbours, Leaflet map (loadLeaflet, drawMap), loadNeighbours.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  function vNeighbours() {
    var h = '<div class="top"><h1>' + t("tNeighbours") + "</h1></div>";
    if (!S.nb) return h + '<div class="body">' + (S.nbErr ? stateBox("broken", t("stErrT"), t("stErrX"), '<button type="button" class="btn primary" data-a="nbRetry">' + t("retry") + "</button>", t("stErrNote"))
      : S.nbSlow ? stateBox("slow", t("stSlowT"), t("stSlowX"), '<button type="button" class="btn" data-a="nbRetry">' + t("retry") + "</button>") : '<div class="muted center">' + t("loading") + "</div>") + "</div>";
    if (S.nb.paused) return h + '<div class="body"><div class="card small">' + t("pausedText") + "</div></div>";
    // owner, 2026-11-07: three views (list · swipe · map) and one «Фильтры» button; the filters open under it
    var fN = filtersOn();
    h += '<div class="nbhead"><div class="seg">' + ["list", "map", "swipe"].map(function (v) { return '<button type="button" data-a="nbView" data-v="' + v + '" aria-pressed="' + (S.nbView === v) + '">' + t(v === "swipe" ? "swView" : v) + "</button>"; }).join("") + "</div>" +
      '<button type="button" class="chip fbtn" data-a="fOpen" aria-expanded="' + !!S.fOpen + '" aria-pressed="' + !!(S.fOpen || fN) + '">' + FILT + " " + t("filters") + (fN ? ' <b class="fn">' + fN + "</b>" : "") + "</button></div>";
    if (S.nbView === "swipe") return h + vSwipe();   // app-src/04a-swipe.js
    // owner, 2026-11-07 (mockup N2): the filters open in a sheet over the list (09-render.js → filtersSheet)
    if (S.fItems.length || S.fInts.length) h += '<div class="chiprow"><button type="button" class="chip" aria-pressed="true" data-a="fOpen">' + t(S.fItems.length ? "fSearchOn" : "fIntsOn") + " ✕</button></div>";
    var list = shown();
    if (S.nbView === "map") {
      if (S.mapFrom) h += '<div class="mapback"><button type="button" class="chip" data-a="mapBack">‹ ' + t("mapBackP") + "</button></div>";
      h += '<div id="map" role="img" aria-label="' + esc(t("map")) + '"></div><div class="body" style="padding-top:8px">';
      // mockup N3: the chosen zone as a short list under the map (figure, nick, who, «готова», %), then the legend
      if (S.zone) {
        var zl = list.filter(function (n) { return n.zone === S.zone; }), zr = zl.filter(function (n) { return n.ready; }).length;
        h += '<div class="zhead"><b>' + esc(t("zoneN", { km: zl[0] ? kmText(zl[0]) : "", n: zl.length })) + "</b>" + (zr ? '<span class="zr">● ' + t("zReady", { n: zr }) + "</span>" : "") + "</div>";
        zl.forEach(function (n) {
          h += '<button type="button" class="zrow" data-a="openPerson" data-v="' + esc(n.id) + '">' + nameMark(n, 16) + '<span class="zmain"><b>' + esc(n.nick || t("g_" + n.gender)) + '</b> <span class="tiny muted">' + esc(who(n)) + "</span>" +
            (n.ready ? '<span class="zready">● ' + readyWord(n.gender) + "</span>" : "") + "</span>" + (n.pct != null ? '<b class="zpct" style="color:' + pctCol(n.pct) + '">' + n.pct + " %</b>" : "") + "</button>";
        });
      }
      h += mapLegend() + '<div class="tiny muted" id="mapnote">' + t("mapNote") + "</div>";
      return h + "</div>";
    }
    return h + listBody(list);
  }
  var FILT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" style="vertical-align:-3px"><path d="M4 6h16M7 12h10M10 18h4"/></svg>';
  /** how many filters are on (the number on «Фильтры») */
  function filtersOn() {
    return S.fQuick.length + S.fRoles.length + (S.fDist < 7 ? 1 : 0) + (S.fItems.length ? 1 : 0) + (S.fInts.length ? 1 : 0) + (S.nbSort !== "pct" ? 1 : 0) +
      (fromLevels().length > 1 && fromNow() !== fromLevels()[fromLevels().length - 1] ? 1 : 0);
  }
  /** the filters: quick chips, distance, roles, where from, search by practice / interest */
  function filtersSheet() {
    return '<div class="modal-bg sheet" data-a="fOpen"><div class="modal card sheetbox fsheet" data-a="noop" role="dialog" aria-modal="true" aria-labelledby="fsh">' +
      '<div class="fhead"><h2 id="fsh">' + t("filters") + "</h2>" + (filtersOn() ? '<button type="button" class="btn link" data-a="fReset">' + t("fResetAll") + "</button>" : "") + "</div>" + filtersBox() + "</div></div>";
  }
  function filtersBox() {
    var h = '<div class="fbox">';
    var chipM = function (act, list, v, label) { var on = v === "all" ? !list.length : list.indexOf(v) >= 0; return '<button type="button" class="chip" data-a="' + act + '" data-v="' + v + '" aria-pressed="' + on + '">' + label + "</button>"; };
    var readyN = (S.nb.items || []).filter(function (n) { return n.ready && (n.my !== "no" || n.was_hidden); }).length;
    h += '<div class="chiprow">' + (readyN ? chipM("fQuick", S.fQuick, "ready", '<i class="rdot" aria-hidden="true"></i>' + t("qReady") + " · " + readyN) : "") +
      [["new", "qNew"], ["keen", "qKeen"], ["likes", "qLikes"]].map(function (o) { return chipM("fQuick", S.fQuick, o[0], t(o[1])); }).join("") +
      (function () { var k = myInts().length ? (S.nb.items || []).filter(function (n) { return commonOf(n).length > 0; }).length : 0; return k ? chipM("fQuick", S.fQuick, "ints", t("qInts") + " · " + k).replace('class="chip"', 'class="chip ichip"') : ""; })() + "</div>";
    var allN = (S.nb.items || []).filter(function (n) { return n.my !== "no" || n.was_hidden; }).length, fitN = shown().length;
    h += '<div class="distbox"><label for="fdist" class="dtop"><span class="lbl">' + t("distL") + '</span><b class="serif" id="distval">' + distLabel(S.fDist) + "</b></label>" +
      '<input id="fdist" type="range" min="0" max="7" step="1" value="' + S.fDist + '" data-a="fDist">' +
      '<div class="dticks" aria-hidden="true">' + ["1", "3", "10", "30", "100", "300", "1000", t("distAll")].map(function (x, i) { return "<span" + (i === S.fDist ? ' class="on"' : "") + ">" + x + "</span>"; }).join("") + "</div>" +
      '<div class="dfoot"><span class="tiny muted">' + t("distCount", { n: fitN, all: allN }) + '</span><span class="dsort"><span class="tiny muted">' + t("sortL") + "</span>" +
      [["pct", "sortPct"], ["near", "sortNear"]].map(function (o) { return '<button type="button" class="chip" data-a="nbSort" data-v="' + o[0] + '" aria-pressed="' + (S.nbSort === o[0]) + '">' + t(o[1]) + "</button>"; }).join("") + "</span></div></div>";
    h += '<div class="chiprow">' +
      [["all", "rAll"], ["top", "r_top"], ["bottom", "r_bottom"], ["switch", "r_switch"], ["none", "r_none"]].map(function (o) { return chipM("fRole", S.fRoles, o[0], roleMark(o[0] === "all" ? null : o[0]) + t(o[1])); }).join("") +
      (fromLevels().length > 1 ? fromLevels().map(function (k) { return '<button type="button" class="chip" data-a="fFrom" data-v="' + k + '" aria-pressed="' + (fromNow() === k) + '">' + t({ chats: "fMine", uni: "fUni", space: "fSpace" }[k]) + "</button>"; }).join("") : "") + "</div>";
    h += '<div class="seg">' + [["practices", "sPractices"], ["ints", "sInts"]].map(function (o) { return '<button type="button" data-a="sMode" data-v="' + o[0] + '" aria-pressed="' + (S.sMode === o[0]) + '">' + t(o[1]) + "</button>"; }).join("") + "</div>";
    h += S.sMode === "ints" ? intSearchBox() : searchBox();   // owner, 2026-10-28
    return h + '<button type="button" class="btn primary" data-a="fOpen">' + t("fShow", { n: shown().length }) + "</button></div>";
  }
  function listBody(list) {
    var h = '<div class="body" style="padding-top:0">' + (S.note ? '<div class="card ok small" role="status">' + esc(S.note) + "</div>" : "");
    if (S.nb.filters_off) h += '<div class="card warn tiny">' + t("filtersOffNote") + "</div>";
    var hidden = shown(true).filter(function (n) { return n.my === "no" && !n.was_hidden; });
    if (!list.length && S.fItems.length) h += S.found ? stateBox("quiet", t("stSearchT"), t("stSearchX"), '<button type="button" class="btn" data-a="pClear">' + t("stSearchBtn") + "</button>") : "";
    else if (!list.length && (S.nb.items || []).length && (S.fDist < 7 || S.fRoles.length || S.fQuick.length || S.fInts.length || fromNow() !== fromLevels()[fromLevels().length - 1])) h += stateBox("quiet", t("stSearchT"), t("stFilterX"), '<button type="button" class="btn" data-a="fReset">' + t("stFilterBtn") + "</button>");
    else if (!list.length) h += S.nb.stats ? whyEmpty(S.nb.stats) : stateBox("empty", t("stNbT"), t("stNbX"));
    if (!S.fItems.length) h += ageBanner();   // owner, 2026-11-03
    if (list.length && !S.fItems.length) h += moreBanner();
    if (S.nb.items && S.nb.items.length && !S.fItems.length && !S.fInts.length) h += intsBanner();   // owner, 2026-10-28
    list.forEach(function (n) { h += nbCard(n); });
    var pz = S.nb.on_pause || [];   // owner, 2026-10-31
    if (pz.length) {
      h += '<div class="pzhead"><h2>' + t("pzTitle") + " · " + pz.length + '</h2><div class="small muted">' + t("pzNote") + "</div></div>";
      pz.forEach(function (n) { h += pzCard(n); });
    }
    if (hidden.length) {
      h += '<div class="hiddenrow small muted"><span>' + t("hiddenList", { n: hidden.length }) + '</span><button type="button" class="btn link" data-a="toggleHidden">' + t(S.showHidden ? "hideHidden" : "showHidden") + "</button></div>";
      if (S.showHidden) hidden.forEach(function (n) { h += '<div class="dim">' + nbCard(n) + "</div>"; });
    }
    return h + "</div>";
  }
  var PEOPLE_ZOOM = 12;   // from this zoom on, each person is drawn as a figure
  function figure(role) {
    var p = role === "top" ? '<path d="M8 1.5 15 14.5H1z"/>' : role === "bottom" ? '<circle cx="8" cy="8" r="6.5"/>' : role === "switch" ? '<path d="M8 1 15 8 8 15 1 8z"/>' : '<rect x="2" y="2" width="12" height="12" rx="3"/>';
    return '<svg viewBox="0 0 16 16" aria-hidden="true">' + p + "</svg>";
  }
  function mapLegend() {
    return '<div class="legend tiny">' + ["woman", "man", "other"].map(function (g) { return '<span class="pm g-' + g + '">' + figure("bottom") + "</span>" + t("g_" + g); }).join(" ") +
      '<br><span class="pm ready">' + figure("bottom") + "</span>" + t("readyLegend") + '<br><span class="pm">' + figure("top") + "</span>" + t("r_top") + ' <span class="pm">' + figure("bottom") + "</span>" + t("r_bottom") + ' <span class="pm">' + figure("switch") + "</span>" + t("r_switch") + ' <span class="pm">' + figure(null) + "</span>" + t("r_none") + " · " + t("mapZoomHint") +
      ((S.nb && S.nb.items || []).some(function (n) { return n.star; }) ? '<span class="lstar">' + starSvg("woman", 20) + "<span>" + t("cstarLegend") + "</span></span>" : "") + "</div>";
  }
  // owner, 2026-10-21 (speed): the map library is loaded only when the map is first opened, not on every start
  var leafletState = 0;
  var leafletWait = [];
  function loadLeaflet(then) {
    if (window.L) return then();
    leafletWait.push(then);   // owner, 2026-11-07: the quiet-time prefetch may have started it — every waiter runs when it is in
    if (leafletState) return;
    leafletState = 1;
    var fail = function () { leafletState = 0; leafletWait = []; var n = document.getElementById("mapnote"); if (n) n.textContent = t("mapErr"); };
    var js = document.createElement("script"); js.src = "vendor/leaflet/leaflet.js?v=1.9.4";
    js.onload = function () { leafletState = 0; var w = leafletWait; leafletWait = []; w.forEach(function (f) { try { f(); } catch (e) { /* one waiter must not stop the others */ } }); }; js.onerror = fail;
    var css = document.createElement("link"); css.rel = "stylesheet"; css.href = "vendor/leaflet/leaflet.css?v=1.9.4";
    css.onload = function () { document.head.appendChild(js); }; css.onerror = fail;   // the styles first, or the tiles land in a heap
    document.head.appendChild(css);
  }
  function drawMap() {
    if (!window.L) return loadLeaflet(function () { if (S.tab === "neighbours" && S.nbView === "map") drawMap(); });
    var el = document.getElementById("map");
    if (map) { map.remove(); map = null; }
    if (!el || !window.L || !S.nb) return;
    try {
      map = L.map(el, { zoomControl: true, attributionControl: true });
      map.attributionControl.setPrefix(false); // only the required «© OpenStreetMap»
      var tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 15, minZoom: 3, attribution: "© OpenStreetMap" });
      tiles.on("tileerror", function () { if (!S.mapErr) { S.mapErr = true; var n = document.getElementById("mapnote"); if (n) n.textContent = t("mapErr"); } });
      tiles.addTo(map);
      var accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8a2d47";
      var byZone = {};
      shown().forEach(function (n) { if (n.zone) (byZone[n.zone] = byZone[n.zone] || []).push(n); });   // owner, 2026-11-02: no zone = list only (src/hidden_area.js)
      var mine = L.polygon(S.nb.zones[S.nb.me.zone], { color: accent, weight: 2, fillOpacity: 0.15 }).addTo(map);
      var all = [mine], centres = {};
      Object.keys(byZone).forEach(function (z) {
        var people = byZone[z], poly = L.polygon(S.nb.zones[z], { color: "#241c22", weight: S.zone === z ? 2.5 : 1, opacity: 0.6, fillColor: accent, fillOpacity: 0.08 + 0.06 * Math.min(people.length, 5) }).addTo(map);
        centres[z] = poly.getBounds().getCenter();
        poly.on("click", function () { S.zone = z; render(); });
        all.push(poly);
      });
      var layer = L.layerGroup().addTo(map);
      var drawPeople = function () {
        layer.clearLayers();
        var close = map.getZoom() >= PEOPLE_ZOOM;
        Object.keys(byZone).forEach(function (z) {
          var people = byZone[z];
          if (!close) {   // far away: one label per zone with role counts
            // owner, 2026-10-25: people without a role were left out of the count (a zone of them showed a bare «1»)
            // owner, 2026-10-27: figure = role, colour = gender (as in the owner's map), a star for a community star
            var grp = {}, keys = [], rd = 0, KO = ["nova", "star", "top", "bottom", "switch", "none"], GO = ["woman", "man", "nonbinary", "other"];
            people.forEach(function (n) { var k = (n.nova ? "nova" : n.star ? "star" : n.role || "none") + "|" + (GO.indexOf(n.gender) >= 0 ? n.gender : "other"); if (!grp[k]) { grp[k] = 0; keys.push(k); } grp[k]++; if (n.ready) rd++; });
            keys.sort(function (a, b) { var x = a.split("|"), y = b.split("|"); return KO.indexOf(x[0]) - KO.indexOf(y[0]) || GO.indexOf(x[1]) - GO.indexOf(y[1]); });
            // drawn figures, not font glyphs: some phone fonts draw ■ as a thin bar (owner, 2026-10-25)
            var label = keys.map(function (k) { var r = k.split("|")[0], g = k.split("|")[1]; return r === "nova" ? '<span class="zf zn">' + SPARK + "</span>" + grp[k] : '<span class="zf g-' + g + (r === "star" ? " zs" : "") + '">' + (r === "star" ? starSvg(g, 17) : figure(r === "none" ? null : r)) + "</span>" + grp[k]; }).join(" ") + (rd ? ' <span class="zready">· ' + t("zReady", { n: rd }) + "</span>" : "");
            L.marker(centres[z], { icon: L.divIcon({ className: "", html: '<span class="zlabel">' + label + "</span>", iconSize: null }), keyboard: false }).addTo(layer)
              .on("click", function () { map.setView(centres[z], PEOPLE_ZOOM); });
            return;
          }
          // close: every person as a figure, on a spiral around the zone's centre (pixels, not places)
          var list = people.slice().sort(function (a, b) { return (b.pct || 0) - (a.pct || 0); });
          var cols = Math.ceil(list.length / 8), rows = Math.ceil(list.length / cols);
          list.forEach(function (n, i) {
            var col = Math.floor(i / rows), row = i % rows;
            var dx = Math.round((col - (cols - 1) / 2) * 140), dy = Math.round((row - (rows - 1) / 2) * 36);
            var nick = n.nick || t("g_" + n.gender);
            if (nick.length > 14) nick = nick.slice(0, 13) + "…";
            // owner, 2026-11-02: a supernova is drawn as a nebula even when its community star is not shown (n.star = null)
            var cap = n.star && n.star.caption ? '<span class="pmc">' + esc(n.star.caption) + "</span>" : "";
            var html = n.nova || n.star   // owner, 2026-10-27: variant A — the star instead of the figure, the caption under the nickname
              ? n.nova ? '<button type="button" class="pm star nova" title="' + esc((n.nick || who(n)) + " · " + t("novaTag")) + '"><span class="nvdot">' + SPARK + '</span><span class="pmt"><span class="pmn">' + esc(nick) + "</span>" + cap + "</span><b>" + (n.pct != null ? n.pct + "%" : "·") + "</b></button>"
              : '<button type="button" class="pm star g-' + (n.gender || "other") + (n.ready ? " ready" : "") + '" title="' + esc((n.nick || who(n)) + " · " + t("cstarTag")) + '">' + starSvg(n.gender, 34) +
                '<span class="pmt"><span class="pmn">' + esc(nick) + "</span>" + cap + "</span><b>" + (n.pct != null ? n.pct + "%" : "·") + "</b></button>"
              : '<button type="button" class="pm g-' + (n.gender || "other") + (n.ready ? " ready" : "") + '" title="' + esc(n.nick || who(n)) + '">' + figure(n.role) +
              '<span class="pmn">' + esc(nick) + "</span><b>" + (n.pct != null ? n.pct + "%" : "·") + "</b></button>";
            L.marker(centres[z], { icon: L.divIcon({ className: "pmwrap", html: html, iconSize: [0, 0], iconAnchor: [-dx, -dy] }), keyboard: true, riseOnHover: true }).addTo(layer)
              .on("click", function () { if (n.star && n.links && n.links.length) { S.sheet = n.id; render(); } else A.openPerson({ dataset: { v: n.id } }); });   // owner, 2026-10-27
          });
        });
      };
      map.on("zoomend", drawPeople);
      // back from a card: the same place and zoom as before
      // owner, 2026-11-07: «На карте» from a person's page — straight to their zone, close enough to read the names
      if (S.mapFocus && centres[S.mapFocus]) { map.setView(centres[S.mapFocus], PEOPLE_ZOOM); S.mapFocus = null; }
      else if (S.mapView) map.setView(S.mapView.c, S.mapView.z); else map.fitBounds(L.featureGroup(all).getBounds(), { padding: [20, 20], maxZoom: 13 });
      var m0 = map;   // a late «moveend» after the map was removed (map = null) must not throw
      m0.on("moveend", function () { if (map === m0) S.mapView = { c: m0.getCenter(), z: m0.getZoom() }; });
      drawPeople();
    } catch (e) { /* map optional */ }
  }

  /** owner, 2026-10-27: a star on the map → a panel with the nick, the caption, up to 2 links and «Открыть анкету» */
  function starSheet() {
    var n = (S.nb && S.nb.items || []).filter(function (x) { return x.id === S.sheet; })[0];
    if (!n) { S.sheet = null; return ""; }
    var more = (n.links || []).length - 2;
    return '<div class="modal-bg sheetbg" data-a="sheetClose"></div><div class="ssheet" role="dialog" aria-modal="true" aria-labelledby="shn"><span class="grab" aria-hidden="true"></span>' +
      '<div class="rtop">' + starSvg(n.gender, 44) + '<span class="pmain"><b id="shn" class="serif" style="font-size:21px">' + esc(n.nick || who(n)) + "</b>" + (n.star.caption ? '<span class="capline">' + esc(n.star.caption) + "</span>" : "") +
      '<span class="ps">' + esc(who(n)) + " · " + kmText(n) + "</span></span>" + pctBox(n) + "</div>" + linksBlock(n.links || [], 2) +
      (more > 0 ? '<div class="tiny muted center">' + t("lnkMore", { n: more }) + "</div>" : "") +
      '<button type="button" class="btn primary" data-a="sheetOpen" data-v="' + esc(n.id) + '">' + t("openCard") + "</button></div>";
  }

  Object.assign(A, {
    ageAll: function () { save("profile", { age_min: 18, age_max: 99 }); },   // owner, 2026-11-03: «Показать всех (18–99)»
    sMode: function (el) { S.sMode = el.dataset.v; render(); },
    fFrom: function (el) { S.fFrom = el.dataset.v; S.zone = null; render(); },
    toggleHidden: function () { S.showHidden = !S.showHidden; render(); },
    nbView: function (el) { S.nbView = el.dataset.v; S.zone = null; S.mapView = null; S.mapFrom = null; render(); },
    nbRetry: function () { S.nb = null; render(); loadNeighbours(); },
    fDist: function (el) { S.fDist = Math.max(0, Math.min(7, +el.value || 0)); S.zone = null; render(); },
    nbSort: function (el) { S.nbSort = el.dataset.v; render(); },
    fReset: function () { S.fBands = []; S.fDist = 7; S.fRoles = []; S.fQuick = []; S.fInts = []; S.iq = ""; S.fFrom = "all"; S.zone = null; render(); },
    sheetClose: function () { S.sheet = null; render(); },
    sheetOpen: function (el) { var id = el.dataset.v; S.sheet = null; A.openPerson({ dataset: { v: id } }); },
  });
  /* ===== app-src/04a-swipe.js — «Соседи → Свайп» (owner, 2026-11-07, mockup N4c): one person at a time, a frameless card,
     the description first; a like button on the right only (no ✕). The card follows the finger sideways after a short
     distance — so it reads as a card — and a long enough move goes to the next / previous person. Swiping only moves:
     it never answers. Order: the fullest profiles first; people already answered at the end with «ваш лайк» / «взаимно».
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  /** how full a profile is: the description weighs most, then interests, the checklist, the nick, then the match */
  function fullness(n) {
    var ab = String(n.about || "").length;
    return (ab ? 3 + Math.min(ab, 300) / 150 : 0) + Math.min((n.interests || []).length, 6) * 0.5 + Math.min((n.answered || 0) / 100, 3) +
      (n.nick ? 0.5 : 0) + (n.ready ? 1 : 0) + (n.pct || 0) / 50;
  }
  /** the deck: everyone the filters let through, unanswered first (fullest first), then the answered ones */
  function swDeck() {
    var all = shown().filter(function (n) { return !n.nova; });
    var answered = function (n) { return n.mutual || n.my === "yes"; };
    var a = all.filter(function (n) { return !answered(n); }), b = all.filter(answered);
    var by = function (x, y) { return fullness(y) - fullness(x) || (y.pct || 0) - (x.pct || 0); };
    return a.sort(by).concat(b.sort(by));
  }
  var swCache = { key: "", ids: [] };
  /** the order is kept while the person swipes (a like must not reshuffle the deck under the finger) */
  function swIds() {
    var key = [S.fDist, S.fRoles.join(), S.fQuick.join(), S.fItems.join(), S.fInts.join(), fromNow(), S.nbSort].join("|");
    if (swCache.key !== key) { swCache = { key: key, nb: S.nb, ids: swDeck().map(function (n) { return n.id; }) }; if (S.sw) S.sw.i = 0; }
    else if (swCache.nb !== S.nb) {   // a fresh list: keep the order, drop who is gone, add newcomers at the end
      var now = swDeck().map(function (n) { return n.id; });
      swCache.ids = swCache.ids.filter(function (id) { return now.indexOf(id) >= 0; }).concat(now.filter(function (id) { return swCache.ids.indexOf(id) < 0; }));
      swCache.nb = S.nb;
    }
    return swCache.ids;
  }
  var HEART_O = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7.4-4.5-9.4-9C1.2 8.3 3.2 4.6 6.7 4.6c2.1 0 3.5 1.1 5.3 3 1.8-1.9 3.2-3 5.3-3 3.5 0 5.5 3.7 4.1 6.9-2 4.5-9.4 9-9.4 9z"/></svg>';
  var HEART_F = HEART_O.replace('fill="none"', 'fill="currentColor"');
  /** the like button: a gradient with an outline heart; once liked — a reddish fill (owner, 2026-11-07) */
  function likeBtn(n, cls) {
    var on = n.mutual || n.my === "yes";
    return '<button type="button" class="likebtn' + (on ? " on" : "") + (cls ? " " + cls : "") + '" data-a="' + (on ? "openPerson" : "yesOpen") + '" data-v="' + esc(n.id) + '" aria-label="' + esc(t(on ? (n.mutual ? "mutualBadge" : "yesBadge") : "likeBtn")) + '"' +
      (on ? ' aria-pressed="true"' : "") + (S.busy ? " disabled" : "") + ">" + (on ? HEART_F : HEART_O) + "</button>";
  }
  function vSwipe() {
    var ids = swIds(), S2 = S.sw || (S.sw = { i: 0 });
    if (!ids.length) return '<div class="body">' + (S.nb.stats && !(S.nb.items || []).length ? whyEmpty(S.nb.stats) : stateBox("quiet", t("stSearchT"), t("stFilterX"), '<button type="button" class="btn" data-a="fReset">' + t("stFilterBtn") + "</button>")) + "</div>";
    if (S2.i >= ids.length) {   // the end of the deck
      return '<div class="body"><div class="free"><h2>' + t("swEndT") + '</h2><div class="muted">' + t("swEndX", { n: ids.length }) + '</div>' +
        '<button type="button" class="btn primary" data-a="swGo" data-v="0">' + t("swAgain") + '</button><button type="button" class="btn" data-a="nbView" data-v="list">' + t("swToList") + "</button></div></div>";
    }
    var n = nbFind(ids[S2.i]);
    if (!n || (n.my === "no" && !n.was_hidden)) { ids.splice(S2.i, 1); return vSwipe(); }   // gone, or just put to «Не сейчас»
    swPrefetch(ids, S2.i);
    // mockup N4: a thin bar of dashes (one per person up to 12, else a line) and «3 / 12»
    var nD = Math.min(ids.length, 12), onD = ids.length <= 12 ? S2.i + 1 : Math.ceil((S2.i + 1) / ids.length * 12);
    var h = '<div class="swwrap"><div class="swprog" aria-live="polite"><span class="dashes" aria-hidden="true">' + Array.from({ length: nD }, function (_, k) { return "<i" + (k < onD ? ' class="on"' : "") + "></i>"; }).join("") +
      '</span><span class="tiny muted">' + (S2.i + 1) + " / " + ids.length + "</span></div>";
    h += '<article class="swcard" id="swcard" data-id="' + esc(n.id) + '" aria-roledescription="' + esc(t("swCard")) + '">' + personBody(n, false);
    // owner, 2026-11-07: pulling further down past the end opens the whole profile (back returns here, to the top)
    h += '<div class="swpull" id="swpull" data-id="' + esc(n.id) + '"><span aria-hidden="true">↓</span>' + t(n.compare ? "swPullA" : "swPull") + '<i aria-hidden="true"><b></b></i></div>';
    h += '</article><div class="swlikebar">' + likeBtn(n) + "</div></div>";
    setTimeout(swPullWatch, 0);   // owner, 2026-11-07: the like on the right, always in reach
    return h;
  }
  /* owner, 2026-11-07: pulling past the end of the card opens the person's ANSWERS («Анкета»), not their page. It takes a
     long pull: the zone under the card is tall and fills a bar; it opens only when the bar is full and held ~0.4 s.
     On the answers screen, pulling up past the top (or «назад») returns to the same card here. */
  var pullT = 0;
  function swPullWatch() { pullTick(); }
  function pullTick() {
    var z = document.getElementById("swpull");
    if (z && S.tab === "neighbours" && S.nbView === "swipe" && !S.open) {
      var r = z.getBoundingClientRect(), k = Math.max(0, Math.min(1, (window.innerHeight - r.top) / r.height));
      var bar = z.querySelector("i b"); if (bar) bar.style.width = Math.round(k * 100) + "%";
      z.classList.toggle("full", k >= 0.97);
      if (k >= 0.97 && window.scrollY > 60) { if (!pullT) pullT = setTimeout(function () { pullT = 0; var z2 = document.getElementById("swpull"); if (z2 && z2.classList.contains("full")) swOpenAnswers(z2.dataset.id); }, 400); }
      else { clearTimeout(pullT); pullT = 0; }
      return;
    }
    var u = document.getElementById("pullup");
    if (u && S.swPull && S.list) {
      if (window.scrollY <= 2 && u.dataset.armed === "1") { if (!pullT) pullT = setTimeout(function () { pullT = 0; if (window.scrollY <= 2 && S.swPull) { haptic("light"); A.closePerson(); } }, 400); }
      else { clearTimeout(pullT); pullT = 0; }
    }
  }
  window.addEventListener("scroll", pullTick, { passive: true });
  function swOpenAnswers(id) {
    var n = nbFind(id); if (!n) return;
    haptic("light"); S.swBack = true;
    if (!n.compare) return A.openPerson({ dataset: { v: id } });   // answers closed until a mutual like: the page instead
    S.open = id; S.swPull = true; S.cmp = null; S.err = "";
    A.listOpen({ dataset: { v: id } });
    pullUpArm();
  }
  /** the answers screen opened by the pull starts just under the «вверх» zone */
  function pullUpArm() {
    var u = document.getElementById("pullup"); if (!u) return;
    window.scrollTo(0, u.offsetHeight);
    setTimeout(function () { var u2 = document.getElementById("pullup"); if (u2) u2.dataset.armed = "1"; }, 700);
  }
  /** the next two people: their answers and comparison are asked for in the quiet time (app-src/14-start.js) */
  function swPrefetch(ids, i) {
    [i + 1, i + 2].forEach(function (k) { var m = ids[k] && nbFind(ids[k]); if (m && m.compare && !S.ins[m.id]) prefetch("ins:" + m.id, function () { return insightGet(m); }); });
  }
  function swGo(i) {
    var ids = swIds();
    S.sw.i = Math.max(0, Math.min(ids.length, i)); haptic("light");
    render();
  }
  /* the finger: nothing moves until it has gone 12 px sideways (more sideways than down) — then the card follows it;
     past a quarter of the width (or a quick flick) it leaves and the next one comes; otherwise it springs back */
  var swT = null;
  function swDown(e) {
    var c = e.target.closest && e.target.closest("#swcard");
    if (!c || (e.button != null && e.button !== 0) || e.target.closest("button, a, input")) return;
    swT = { x: e.clientX, y: e.clientY, t: Date.now(), on: false, el: c, id: e.pointerId };
  }
  function swMove(e) {
    if (!swT || e.pointerId !== swT.id) return;
    var dx = e.clientX - swT.x, dy = e.clientY - swT.y;
    if (!swT.on) {
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { swT = null; return; }   // a scroll, not a swipe
      if (Math.abs(dx) < 12) return;
      swT.on = true; swT.el.classList.add("drag");
      try { swT.el.setPointerCapture(e.pointerId); } catch (x) { /* old web view */ }
    }
    var first = S.sw.i === 0 && dx > 0, d = first ? dx / 3 : dx;   // nothing before the first one: it only gives a little
    swT.el.style.transform = "translateX(" + d + "px) rotate(" + (d / 40) + "deg)";
    swT.dx = dx;
    if (e.cancelable) e.preventDefault();
  }
  function swUp(e) {
    if (!swT || e.pointerId !== swT.id) return;
    var T = swT; swT = null;
    if (!T.on) return;
    var dx = T.dx || 0, w = T.el.offsetWidth || 360, fast = Math.abs(dx) > 40 && Date.now() - T.t < 250;
    var dir = (Math.abs(dx) > w / 4 || fast) ? (dx < 0 ? 1 : -1) : 0;
    if (dir === -1 && S.sw.i === 0) dir = 0;
    T.el.classList.remove("drag");
    if (!dir) { T.el.style.transform = ""; return; }
    T.el.classList.add("leave");
    T.el.style.transform = "translateX(" + (dir > 0 ? -1 : 1) * (w + 60) + "px) rotate(" + (dir > 0 ? -8 : 8) + "deg)";
    setTimeout(function () { swGo(S.sw.i + dir); var c = document.getElementById("swcard"); if (c) { c.classList.add("enter"); setTimeout(function () { c.classList.remove("enter"); }, 220); } }, 160);
  }
  document.addEventListener("pointerdown", swDown, { passive: true });
  document.addEventListener("pointermove", swMove, { passive: false });
  document.addEventListener("pointerup", swUp);
  document.addEventListener("pointercancel", function (e) { if (swT && swT.on) { swT.el.classList.remove("drag"); swT.el.style.transform = ""; } swT = null; });
  document.addEventListener("keydown", function (e) {
    if (S.tab !== "neighbours" || S.nbView !== "swipe" || S.open || !S.sw || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || "")) return;
    if (e.key === "ArrowRight") swGo(S.sw.i + 1); else if (e.key === "ArrowLeft") swGo(S.sw.i - 1);
  });

  Object.assign(A, {
    swGo: function (el) { swGo(+el.dataset.v); window.scrollTo(0, 0); },
    fOpen: function () { S.fOpen = !S.fOpen; render(); },
  });
  /* ===== app-src/05-person-likes.js — A person's page, insight, like sheet + message with a like, «Взаимные», propose, report, compare, vHome (tabs).
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */
  /** The top card of a person's page. owner, 2026-11-02: also the sample in «Приглашения» (n.sample: the person's own
      card with a made-up message — no distance, no «Пожаловаться»). */
  function personCard(n) {
    return '<div class="card' + (n.on_pause ? " pzc" : "") + (n.nova ? " nebl" : "") + '">' + (n.nova ? '<span class="nlpill" style="align-self:flex-start">✦ ' + t("novaTag") + "</span>" : "") + '<h1 style="font-size:24px">' + (n.nova ? SPARK + " " : nameMark(n, 26)) + esc(n.nick || (t("g_" + n.gender) + " · " + n.age_bucket)) + "</h1>" + capLine(n) +
      (n.nick ? '<div class="small">' + esc(t("g_" + n.gender) + " · " + n.age_bucket) + "</div>" : "") +
      (n.ready || n.sus ? '<div class="tags">' + (n.ready ? '<span class="tag ready"><i aria-hidden="true"></i>' + readyWord(n.gender) + "</span>" : "") + (n.sus ? '<span class="tag sus" title="' + esc(t("susX")) + '">' + t("susTag") + "</span>" : "") + "</div>" : "") +
      '<div class="small muted">' + [t("r_" + (n.role || "none")), n.experience ? t("exp").toLowerCase() + ": " + t("x_" + n.experience) : "", n.relation ? t("l_" + n.relation) : ""].filter(Boolean).join(" · ") + "</div>" +
      '<div class="small muted">' + [n.on_pause || n.sample ? "" : kmText(n), n.looking_for.length ? t("looks").toLowerCase() + ": " + n.looking_for.map(function (v) { return t("lf_" + v).toLowerCase(); }).join(", ") : ""].filter(Boolean).join(" · ") + "</div>" +
      (n.seeking && n.seeking.length ? '<div class="small muted">' + t("seeks") + ": " + esc(seekLine(n.seeking)) + "</div>" : "") +
      (n.about ? '<div class="about" style="margin-top:6px">' + esc(n.about) + "</div>" : "") +
      (n.msg_in ? msgInBox(n) : "") + (n.on_pause ? '<div class="tiny muted">' + t("pzData") + "</div>" : "") + "</div>";
  }
  function vPerson() {
    var n = nbFind(S.open);
    if (!n) { S.open = null; return vHome(); }
    var h = '<div class="backrow"><button type="button" data-a="closePerson" aria-label="' + t("back") + '">‹</button><span class="small muted" style="flex:1">' + [n.chats.length ? t("from_chats", { list: chatsOf(n) }) : "", n.uni ? t("uniTag") + " · " + t("fromUni", { list: quoted(n.uni_chats || []) }) : "", n.space ? t("spaceTitle") : ""].filter(Boolean).join(" · ") + "</span>" +
      '<button type="button" class="more-btn" data-a="pMenu" aria-label="' + t("more") + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button></div>';
    var nm0 = n.nick || who(n);
    h += '<div class="body pagebody">' + (S.note ? '<div class="card ok small" role="status">' + esc(S.note) + "</div>" : "") +
      (n.on_pause ? '<div class="card warn small"><b>' + esc(t("pzBanT", { name: nm0 })) + "</b><div>" + esc(t("pzBanX", { name: nm0 })) + "</div></div>" : "") +
      (S.me.nova && !n.nova ? '<div class="card">' + (uchatWith(n.id) ? '<button type="button" class="btn nebbg" data-a="nvStart" data-v="' + esc(n.id) + '">' + t("nvOpenChat") + "</button>"
        : '<button type="button" class="btn nebbg" data-a="nvStart" data-v="' + esc(n.id) + '"' + (S.busy ? " disabled" : "") + ">" + t("nvStart") + '</button><div class="tiny muted">' + t("nvStartNote") + "</div>") + "</div>" : "") +
      personBody(n, true) + errLine() + "</div>";
    return h;
  }
  /* owner, 2026-11-07 (mockups N4b / P1): ONE layout for the opened card and «Листать» — on the free page, no plates:
     name + meta with the percent on the right at the same height, marks, «О себе» large, (page: the answer buttons right
     under it), what they look for, interests, «Сильнее всего совпадаете», «Что нравится больше всего» + counts,
     «Ответы и сравнение ›». The page adds the message to me, star links, the map, the constellation. */
  function personBody(n, page) {
    loadInsight(n);
    var cm = commonOf(n), all = n.interests || [], other = all.filter(function (x) { return cm.indexOf(x) < 0; });
    if (all.length && !CAT) loadCat();
    var meta = [n.nick ? t("g_" + n.gender) : "", n.nick ? n.age_bucket : who(n), n.nick ? t("r_" + (n.role || "none")) : "", n.on_pause || n.sample ? "" : kmText(n)].filter(Boolean).join(" · ");
    var h = '<div class="phead"><div class="pname">' + (n.nova ? SPARK + " " : nameMark(n, page ? 22 : 18)) + "<b>" + esc(n.nick || t("g_" + n.gender)) + '</b></div>' + pctPill(n) + "</div>" +
      '<div class="pmeta">' + esc(meta) + "</div>" + capLine(n);
    var marks = (n.ready ? '<span class="tag ready"><i aria-hidden="true"></i>' + readyWord(n.gender) + "</span>" : "") + (n.fresh && !n.mutual ? '<span class="tag new">' + t("newTag") + "</span>" : "") +
      (n.mutual ? '<span class="tag mine">♥ ' + t("mutualBadge") + "</span>" : n.my === "yes" ? '<span class="tag mine">♥ ' + t("swYours") + "</span>" : "") +
      (n.likes_me && !n.mutual ? '<span class="tag like">♥ ' + t("likesYou") + "</span>" : "") + (n.sus ? '<span class="tag sus" title="' + esc(t("susX")) + '">' + t("susTag") + "</span>" : "") +
      (n.out_age ? '<span class="tag">' + t("outAge") + "</span>" : "") + (n.was_hidden ? '<span class="tag">' + t("wasHidden") + "</span>" : "");
    if (marks) h += '<div class="tags">' + marks + "</div>";
    if (page && n.msg_in) h += msgInBox(n);
    h += n.about ? '<p class="about pabout">' + esc(n.about) + "</p>" : '<div class="muted small">' + t("swNoAbout") + "</div>";
    if (page) h += answerBox(n);
    var rows = [[t("looks"), n.looking_for.map(function (v) { return t("lf_" + v).toLowerCase(); }).join(", ")], [t("seeks"), seekLine(n.seeking)],
      [t("exp"), [n.experience ? t("x_" + n.experience).toLowerCase() : "", n.relation ? t("l_" + n.relation).toLowerCase() : ""].filter(Boolean).join(" · ")]];
    h += '<dl class="prows">' + rows.filter(function (r) { return r[1]; }).map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") + "</dl>";
    if (all.length && CAT) {
      var lim = page ? (S.intAll ? 999 : 14) : 8;
      h += '<div class="psec"><div class="psh">◆ ' + t("swInts") + (cm.length ? ' <span class="icolor">· ' + esc(t("intsCommonN", { n: cm.length })) + "</span>" : "") + '</div><div class="tags">' +
        cm.map(function (x) { return itag(x, " on"); }).join("") + other.slice(0, Math.max(0, lim - cm.length)).map(function (x) { return itag(x, " out"); }).join("") +
        (page && other.length > lim - cm.length && lim < 999 ? '<button type="button" class="tag out" data-a="intAll">' + t("intsMoreN", { n: other.length - (lim - cm.length) }) + "</button>" : "") + "</div>" +
        (page && !myInts().length ? '<button type="button" class="btn link" data-a="intsOpen" data-v="person">' + t("personAddMine") + "</button>" : "") + "</div>";
    }
    if (n.themes.length) h += '<div class="psec"><div class="psh">' + t("sharedThemes") + '</div><div class="tags">' + n.themes.map(function (x) { return '<span class="tag">' + esc(x) + "</span>"; }).join("") + "</div></div>";
    if (n.compare) {
      var x = S.ins[n.id];
      h += '<div class="psec"><div class="psh sp"><span>' + t("insTitle") + '</span><span class="tiny muted">' + t("insSite") + "</span></div>";
      if (!x) h += '<div class="small muted">' + t("loading") + "</div>";
      else if (!x.err) {
        var list = S.insAll ? x.portrait : x.portrait.slice(0, 5);
        h += '<div class="pbars">' + list.map(function (g) {
          return '<div class="pbar"><span>' + esc(g.name) + '</span><i><b style="width:' + (g.pct || 0) + '%"></b></i><span>' + (g.pct == null ? '<span class="tiny muted">' + t("insFew") + "</span>" : g.pct + "%") + "</span></div>";
        }).join("") + "</div>";
        if (page && x.portrait.length > 5) h += '<button type="button" class="btn link" data-a="insAll">' + (S.insAll ? t("insLess") : t("insAll", { n: x.portrait.length })) + "</button>";
        h += cntTiles(x.counts);
        if (page && x.col) h += '<div class="tiny muted">' + t("insCol", { r: t(x.col) }) + "</div>";
      }
      if (page) {
        if (n.answered) h += '<div class="tiny muted">' + t("ansBoth", { them: ansOf(n), me: ansOf(S.me.checklist) }) + "</div>";
        if (n.same_role) h += '<div class="tiny muted">' + t("sameRole", { role: t("r_" + n.role) }) + "</div>";
        if (n.dirs) h += '<div class="small">' + dirsLine(n.dirs) + "</div>";
      }
      h += '<button type="button" class="btn link pcmp" data-a="compare" data-v="' + esc(n.id) + '">' + t("ansCmpBtn") + " ›</button></div>";
    } else h += '<div class="psec small muted">' + t("compareHidden") + "</div>";
    if (!page) return h;
    // owner, 2026-11-07: only the constellation here; «Прислать ссылку на Kinkosmos» stays in the mutual card's «…»
    if (n.compare) h += '<div class="psec"><button type="button" class="btn site" data-a="nStarsOpen" data-v="' + esc(n.id) + '" data-t="' + esc(n.nick || "") + '">' + esc(n.nick ? t("nStarsBtn", { name: n.nick }) : t("nStarsBtn0")) + "</button></div>";
    if (n.star && n.links && n.links.length) h += '<div class="psec links"><div class="psh">★ ' + t("secLinks") + "</div>" + linksBlock(n.links) + '<div class="tiny muted">' + t("lnkFoot") + "</div></div>";
    if (n.zone && !n.on_pause && !n.sample) h += '<button type="button" class="prw maprow" data-a="pMap" data-v="' + esc(n.id) + '"><span class="ico" aria-hidden="true">⌖</span><span class="pmain"><span class="pv">' + t("pMapT") + '</span><span class="ps">' + esc(kmText(n)) + "</span></span>" + CHEV + "</button>";
    return h;
  }
  /** owner, 2026-10-24: the neighbour's portrait (the site's formula) and answer counts, where the comparison is allowed */
  function cntTiles(c) {
    return '<div class="cnt4">' + ["love", "yes", "maybe", "no"].map(function (k) { return '<div><b class="c-' + k + '">' + (c[k] || 0) + '</b><span class="tiny muted">' + t("v_" + k) + "</span></div>"; }).join("") + "</div>";
  }
  function insightCard(n) {
    if (!n.compare) return "";
    var x = S.ins[n.id];
    var h = '<div class="card"><div class="nbtop"><h2>' + t("insTitle") + '</h2><span class="tiny muted">' + t("insSite") + "</span></div>";
    if (!x) return h + '<div class="small muted">' + t("loading") + "</div></div>";
    if (x.err) return "";
    var list = S.insAll ? x.portrait : x.portrait.slice(0, 5);
    h += '<div class="pbars">' + list.map(function (g) {
      return '<div class="pbar"><span>' + esc(g.name) + '</span><i><b style="width:' + (g.pct || 0) + '%"></b></i><span>' + (g.pct == null ? '<span class="tiny muted">' + t("insFew") + "</span>" : g.pct + "%") + "</span></div>";
    }).join("") + "</div>";
    if (x.portrait.length > 5) h += '<button type="button" class="btn link tiny" style="align-self:flex-start" data-a="insAll">' + (S.insAll ? t("insLess") : t("insAll", { n: x.portrait.length })) + "</button>";
    h += cntTiles(x.counts);
    if (x.col) h += '<div class="tiny muted">' + t("insCol", { r: t(x.col) }) + "</div>";
    return h + "</div>";
  }
  function loadInsight(n) {
    if (!n || !n.compare || S.ins[n.id] !== undefined) return;   // null = on its way (asked once, not on every drawing)
    S.ins[n.id] = null; lruTouch(n.id);
    insightGet(n).then(function () { render(); }, function () { S.ins[n.id] = { err: 1 }; render(); });
  }
  /** owner, 2026-10-31: the message they sent with their «да» */
  function msgInBox(n) {
    return '<div class="msgbox"><div class="msghead"><span>' + t("msgIn") + "</span><span>" + fmtTime(n.msg_in.at) + '</span></div><div class="msgtext">' + esc(n.msg_in.text) + "</div>" +
      (n.sample ? "" : '<button type="button" class="btn link tiny" data-a="msgReport" data-v="' + esc(n.id) + '">' + t("msgReport") + "</button>") + "</div>";
  }
  function msgOutBox(n) {
    return '<div class="msgmine"><span class="tiny muted">' + t("ymMine", { date: fmtTime(n.msg_out.at) }) + '<b class="okc">' + t("ymDelivered") + '</b></span><span class="msgclip">' + esc(n.msg_out.text) + "</span></div>";
  }
  var HEART = '<svg class="hrt" width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3.1 1.7-1.9 3.1-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  function answerBox(n) {
    var h = '<div class="pans">';
    if (n.on_pause) return h + (n.msg_out ? msgOutBox(n) : "") + '<button type="button" class="btn dangerline" data-a="pzAsk" data-v="' + esc(n.id) + '">' + t("pzWithdraw") + "</button></div>";
    // owner, 2026-11-03: a mutual like — «Написать в Telegram» right here; the rest stays in «Лайки → Взаимные»
    if (n.mutual) h += '<div class="okmark">✓ ' + t("mutualBadge") + '</div><button type="button" class="btn primary" data-a="writeTg" data-v="' + esc(n.id) + '">' + t("writeTg") + "</button>" +
      '<button type="button" class="btn" data-a="propOpen" data-v="' + esc(n.id) + '">' + t("propBtnP") + "</button>";   // owner, 2026-11-07: no «к взаимным» — a mutual card adds nothing new
    // owner, 2026-11-07: a like already given — the same button, pressed («Лайк поставлен»); a second tap takes it back
    else if (n.my === "yes") h += (n.msg_out ? msgOutBox(n) : "") + '<button type="button" class="btn likewide liked" data-a="unlike" data-v="' + esc(n.id) + '" aria-pressed="true"' + (S.busy ? " disabled" : "") + ">" + HEART_F.replace(/30/g, "22") + t("likeDone") + "</button>";
    else if (n.my) h += '<div class="small">' + t("youSaidNo") + '</div><button type="button" class="btn" data-a="answer" data-v="" data-id="' + esc(n.id) + '">' + t("changeMind") + "</button>";
    else h += '<div class="likerow"><button type="button" class="btn out" data-a="nnOpen" data-v="' + esc(n.id) + '"' + (S.busy ? " disabled" : "") + ">" + t("notNow") +
      '</button><button type="button" class="btn primary likewide" data-a="yesOpen" data-v="' + esc(n.id) + '"' + (S.busy ? " disabled" : "") + ">" + HEART_O.replace(/30/g, "22") + t("likePut") + "</button></div>" +   // mockup N4b   // owner, 2026-11-07: «Не сейчас» for a chosen time; the gradient like button
      (n.msg_in ? '<div class="tiny muted">' + t("msgNotNow") + "</div>" : "");
    return h + "</div>";   // owner, 2026-10-26: «Пожаловаться» moved to the ⋯ menu (it sat right under the main button)
  }
  var NN_DAYS = [1, 3, 7, 30, 90, 120, 360];
  function nnLabel(d) { return t(d === 1 ? "nnDay1" : d >= 360 ? "nnYear" : "nnDays", { n: d }); }
  function nnSheet() {
    var N = S.nn, n = nbFind(N.id);
    if (!n) { S.nn = null; return ""; }
    return '<div class="modal-bg sheet" data-a="nnClose"><div class="modal card sheetbox" data-a="noop" role="dialog" aria-modal="true" aria-labelledby="nnh"><span class="grab" aria-hidden="true"></span>' +
      '<h2 id="nnh">' + t("nnTitle") + '</h2><div class="small muted">' + esc(t("nnX", { name: n.nick || who(n) })) + "</div>" +
      '<div class="distbox" style="margin:10px 0 4px"><label for="nnr" class="dtop"><span class="lbl">' + t("nnFor") + '</span><b id="nnval">' + nnLabel(NN_DAYS[N.i]) + "</b></label>" +
      '<input id="nnr" type="range" min="0" max="6" step="1" value="' + N.i + '" data-a="nnSlide" aria-valuetext="' + esc(nnLabel(NN_DAYS[N.i])) + '">' +
      '<div class="dticks" aria-hidden="true">' + NN_DAYS.map(function (d, i) { return "<span" + (i === N.i ? ' class="on"' : "") + ">" + d + "</span>"; }).join("") + "</div></div>" +
      '<div class="decide"><button type="button" class="btn out" data-a="nnClose">' + t("cancel") + '</button><button type="button" class="btn primary" id="nnbtn" data-a="nnGo"' + (S.busy ? " disabled" : "") + ">" + esc(t("nnFor") + " " + nnLabel(NN_DAYS[N.i])) + "</button></div></div></div>";   // mockup P3b
  }
  /** owner, 2026-10-31: «Да» → this sheet: a message with «да» (≤ 1000, no contacts) or just «да».
      With no messages: a locked row, how to get them (invite), and «Сказать «да»» as the main button. */
  function yesSheet() {
    var n = nbFind(S.yes.id);
    if (!n) { yesKeep(); S.yes = null; return ""; }
    var w = S.me.msgs || { balance: 0, earned: 0, unlimited: false }, nm = n.nick || who(n), can = w.unlimited || w.balance > 0;
    var h = '<div class="modal-bg sheet" data-a="yesClose"><div class="modal card sheetbox ysheet" data-a="noop" role="dialog" aria-modal="true" aria-labelledby="ysh"><span class="grab" aria-hidden="true"></span>';
    h += '<div class="yhead"><h2 id="ysh" class="serif">' + esc(t("ymTitle", { name: nm })) + "</h2>" + (can ? '<span class="bal' + (w.unlimited ? " gold" : "") + '">' + ENV_ICO + " " + (w.unlimited ? t("ymUnlim") : t("ymLeft", { n: w.balance })) + "</span>" : "") + "</div>";
    if (can) {
      h += '<label class="lbl" for="ymText">' + t("ymLabel") + '</label><div class="ymwrap"><div class="ymhl" id="ymhl" aria-hidden="true"></div>' +
        '<textarea id="ymText" data-a="ymText" maxlength="1000" placeholder="' + esc(t("ymPh")) + '">' + esc(S.yes.text || "") + "</textarea></div>";
      h += '<div class="ymfoot tiny muted"><span>' + esc(t("ymOnly", { name: nm })) + '</span><span id="ymcount">0 / 1000</span></div>';
      h += '<div class="ymwarn" id="ymwarn" role="alert" hidden>' + t("ymContact") + "</div>";
      h += '<button type="button" class="btn primary" id="ymsend" data-a="yesSend" disabled>' + t("ymSend") + "</button>";
      h += '<button type="button" class="btn" data-a="yesPlain"' + (S.busy ? " disabled" : "") + ">" + t("ymPlain") + "</button>";
    } else {
      h += '<button type="button" class="ylock" disabled aria-describedby="yinv">' + LOCK18 + "<span>" + t("ymLocked") + '</span><span class="z">0</span></button>';
      h += '<div class="yinv" id="yinv"><div class="yrow"><span class="ic">' + ENV_ICO.replace(/13/g, "22") + '</span><span class="ytxt"><b>' + t(w.earned ? "ymOutT" : "ymNoneT") + "</b><span>" + t("ymNoneX", { n: 5 }) + "</span></span></div>" +
        '<button type="button" class="btn out" data-a="yesInvite">' + t("ymInvite") + "</button></div>";
      h += '<button type="button" class="btn primary big" data-a="yesPlain"' + (S.busy ? " disabled" : "") + ">" + t("ymYes") + '</button><div class="tiny muted" style="text-align:center">' + t("ymYesNote") + "</div>";
    }
    return h + (S.yes.err ? '<div class="err" role="alert">' + esc(S.yes.err) + "</div>" : "") + "</div></div>";
  }
  /** the highlight under the message field (same check as the server: contacts.js), the counter, the send button */
  function ymPaint() {
    var ta = document.getElementById("ymText"), hl = document.getElementById("ymhl");
    if (!ta || !hl || !S.yes) return;
    var txt = ta.value; S.yes.text = txt;
    var sp = window.KVContacts ? window.KVContacts.find(txt, S.me.contact_words || []) : [], out = "", pos = 0;
    sp.forEach(function (x) { out += esc(txt.slice(pos, x[0])) + "<mark>" + esc(txt.slice(x[0], x[1])) + "</mark>"; pos = x[1]; });
    hl.innerHTML = out + esc(txt.slice(pos)) + "\n";
    hl.scrollTop = ta.scrollTop;
    ta.classList.toggle("bad", sp.length > 0);
    var wn = document.getElementById("ymwarn"); if (wn) wn.hidden = !sp.length;
    var c = document.getElementById("ymcount"); if (c) c.textContent = txt.length + " / 1000";
    var b = document.getElementById("ymsend"); if (b) b.disabled = S.busy || !txt.trim() || sp.length > 0;
    closeAsk(!!txt.trim());
  }
  /* owner, 2026-11-01: a message typed for a like is not lost. While the field has text, closing the app asks first
     (Telegram's own window); closing the sheet keeps the text for that person until the app is closed (memory only —
     nothing is stored in the browser). */
  var yesDrafts = {}, closeAskOn = false;
  function closeAsk(on) {
    if (on === closeAskOn || !tg || !tg.enableClosingConfirmation) return;
    closeAskOn = on;
    try { if (on) tg.enableClosingConfirmation(); else tg.disableClosingConfirmation(); } catch (e) { /* an old Telegram */ }
  }
  function yesKeep() { if (!S.yes) return; if (String(S.yes.text || "").trim()) yesDrafts[S.yes.id] = S.yes.text; else delete yesDrafts[S.yes.id]; closeAsk(false); }
  function pzAskModal() {
    var n = nbFind(S.pzAsk) || {}, nm = n.nick || (n.gender ? who(n) : "");
    return '<div class="modal-bg"><div class="modal card" role="dialog" aria-modal="true" aria-labelledby="pzh"><h2 id="pzh" class="serif" style="font-size:21px">' + esc(t("pzAskT", { name: nm })) + "</h2>" +
      '<div class="small" style="line-height:1.5">' + esc(t("pzAskX", { name: nm })) + "</div>" +
      '<div class="decide"><button type="button" class="btn" data-a="pzCancel">' + t("cancel") + '</button><button type="button" class="btn primary" style="background:var(--danger);border-color:var(--danger)" data-a="pzGo"' + (S.busy ? " disabled" : "") + ">" + t("pzAskGo") + "</button></div></div></div>";
  }
  /** The ⋯ menu of a person: not now (5 days) · remove from mutual · report. */
  /** owner, 2026-11-03: the like goes in the background — the sheet closes at once, the person may leave the screen or
      close the app (keepalive: the browser finishes the request). If the server refuses, a note says so and the message
      goes back into the draft (memory only — nothing is stored on the phone). */
  function yesGo(text) {
    if (!S.yes) return;
    var id = S.yes.id, msg = String(text || "").trim() ? text : "", n = nbFind(id);
    var name = n ? n.nick || who(n) : "", prev = n ? { my: n.my, msg_out: n.msg_out } : null;
    if (n) { n.my = "yes"; if (msg) n.msg_out = { text: window.KVContacts ? window.KVContacts.clean(msg) : msg, at: Math.floor(Date.now() / 1000) }; }
    delete yesDrafts[id]; S.yes = null; closeAsk(false); render();
    var failed = function (why) {
      if (n && prev && n.my === "yes" && !n.mutual) { n.my = prev.my; n.msg_out = prev.msg_out; }
      if (msg && !yesDrafts[id]) yesDrafts[id] = msg;
      S.note = t("likeFailed", { name: name, why: why }); haptic("error"); render(); window.scrollTo(0, 0);
    };
    api("POST", "answer", msg ? { id: id, value: "yes", msg: msg } : { id: id, value: "yes" }, { keepalive: true }).then(function (r) {
      if (!r.ok) return failed(hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"));
      if (n) n.mutual = !!r.mutual;
      if (r.wallet) S.me.msgs = r.wallet;
      if (r.mutual) { S.note = t("mutualNow"); loadMatches(); } else if (r.msg) S.note = t("msgSentNote");
      render();
    }, function () { failed(t("netErr")); });
  }
  function novaSave(b) {
    api("POST", "nova/settings", b).then(function (r) { if (r.ok) { S.me.nova = { vis: r.vis, viewers: r.viewers, unread: r.unread, chats: r.chats }; render(); } else { S.err = t("netErr"); render(); } });
  }
  function personMenu(n) {
    var h = '<div class="modal-bg sheet" data-a="pMenuClose"><div class="modal card sheetbox" data-a="noop" role="dialog" aria-modal="true" aria-label="' + esc(t("more")) + '"><span class="grab" aria-hidden="true"></span><h2 class="serif">' + esc(n.nick || who(n)) + "</h2>";
    if (!n.mutual && n.my !== "no") h += '<button type="button" class="srow mitem" data-a="pmNotNow" data-v="' + esc(n.id) + '">' + t("notNow") + '<span class="tiny muted">' + t("notNowNote") + "</span></button>";
    if (n.mutual) h += '<button type="button" class="srow mitem" data-a="unmatch" data-v="' + esc(n.id) + '" data-t="' + esc(n.nick || "") + '">' + t("removeMutual") + "</button>";
    h += '<button type="button" class="srow mitem danger" data-a="reportOpen" data-v="' + esc(n.id) + '">' + t("reportBtn") + "</button>";
    return h + '<button type="button" class="btn" data-a="pMenuClose">' + t("close") + "</button></div></div>";
  }
  /** owner, 2026-10-26: «Её анкета» — the neighbour's own checklist (same rule as the comparison) */
  function vList() {
    var L = S.list, n = nbFind(L.id) || {};
    var h = (S.swPull ? '<div class="pullup" id="pullup"><span aria-hidden="true">↑</span>' + t("swPullBack") + "</div>" : "") + ansHead(n) + ansSwitch("list", L.id, n);
    if (!L.data) return h + '<div class="body"><div class="muted">' + (L.err ? t("compareHidden") : t("loading")) + "</div></div>";
    var d = L.data, side = d.ext ? (L.side || "top") : null, rows = d.rows.filter(function (r) { return r.side === side; });
    var cnt = { love: 0, yes: 0, maybe: 0, limit: 0 }; rows.forEach(function (r) { cnt[r.a]++; });
    h += '<div class="body" style="padding-bottom:0;flex:none">';
    if (d.ext) h += '<div class="seg" style="padding:0">' + ["top", "bottom"].map(function (k) { return '<button type="button" data-a="listSide" data-v="' + k + '" aria-pressed="' + (side === k) + '">' + t("as_" + k) + " · " + d.rows.filter(function (r) { return r.side === k; }).length + "</button>"; }).join("") + "</div>";
    h += '<div class="chips">' + [["all", t("fAll")], ["love", t("a_love")], ["yes", t("a_yes")], ["maybe", t("a_maybe")], ["limit", t("a_limit")]].map(function (o) {
      return '<button type="button" class="chip" data-a="listAns" data-v="' + o[0] + '" aria-pressed="' + ((L.ans || "all") === o[0]) + '">' + o[1] + (o[0] !== "all" ? " · " + cnt[o[0]] : "") + "</button>"; }).join("") + "</div>" + ansSearch() + "</div>";
    h += '<div class="body anspage" style="padding-top:6px">';
    var cat = null, open = false;
    rows.filter(function (r) { return !L.ans || L.ans === "all" || r.a === L.ans; }).forEach(function (r) {
      if (r.cat !== cat) { if (open) h += "</div></div>"; cat = r.cat; h += '<div class="ansgrp"><div class="cat">' + esc(cat) + '</div><div class="card list">'; open = true; }
      h += ansRow(r.name, '<span class="ans a-' + r.a + '">' + t("a_" + r.a) + "</span>");
    });
    if (open) h += "</div></div>"; else h += '<div class="card small muted">' + t("mEmpty") + "</div>";
    return h + "</div>";
  }

  /* ---------- mutual like ---------- */
  function loadMatches() {
    if (!S.me || !S.me.active) return;
    if (!S.matches) { var pc = phoneGet("matches"); if (pc) S.matches = pc; }   // owner, 2026-11-07: the phone copy first
    api("GET", "matches").then(function (r) { if (r.ok) { S.matches = r.items; phonePut("matches", r.items); render(); } });
  }
  /* owner, 2026-11-03: tab «Лайки» (was «Взаимные») — Мои лайки · Ждут ответа · Взаимные. «Ждут ответа» = likes to me
     I have not answered; NEW = liked after I last opened that section (S.me.likes_seen) — the tab shows their count. */
  function likesMine() { return nbAll().filter(function (n) { return n.my === "yes" && !n.mutual; }); }
  function likesWait() { return (S.nb && S.nb.items || []).filter(function (n) { return n.likes_me && !n.mutual && n.my !== "no"; }); }
  function likesNew() { var seen = (S.me && S.me.likes_seen) || 0; return likesWait().filter(function (n) { return (n.liked_at || 0) > seen; }).length; }
  /** opens a section; «Ждут ответа» marks the likes in it as seen */
  function likesTab(k) {
    S.lkTab = k;
    if (k === "wait" && likesNew()) api("POST", "likes-seen", {}).then(function (r) { if (r.ok) { S.me.likes_seen = r.at; render(); } }, function () { /* stays new */ });
  }
  function vMatches() {
    var k = S.lkTab || "mutual", mine = likesMine(), wait = likesWait();
    var so0 = S.lkSort || "new";   // mockup L1: the sort toggle next to the title
    var h = '<div class="top" style="flex-direction:row;justify-content:space-between;align-items:center"><h1>' + t("tLikes") + '</h1><button type="button" class="chip lksortb" data-a="lkSort" aria-label="' + esc(t("lkSortL")) + '">⇅ ' + t("lkSort_" + so0) + '</button></div><div class="seg" style="margin:0 16px 8px">' +
      [["mine", "lkMine", mine.length], ["wait", "lkWait", wait.length], ["mutual", "tMatches", S.matches ? S.matches.length : 0]].map(function (o) {
        return '<button type="button" data-a="lkTab" data-v="' + o[0] + '" aria-pressed="' + (k === o[0]) + '">' + t(o[1]) + (o[2] ? " · " + o[2] : "") + "</button>"; }).join("") + "</div>" +
      '<div class="body">' + (S.note ? '<div class="card ok small" role="status">' + esc(S.note) + "</div>" : "");
    // owner, 2026-11-07: one toggle at the top — newest first (default) · oldest first · by match
    var so = S.lkSort || "new", srt = function (list, at) {
      return list.slice().sort(function (a, b) { return so === "pct" ? (b.pct || 0) - (a.pct || 0) : so === "old" ? (at(a) || 0) - (at(b) || 0) : (at(b) || 0) - (at(a) || 0); }); };
    var cnt = k === "mine" ? mine.length : k === "wait" ? wait.length : S.matches ? S.matches.length : 0;

    mine = srt(mine, function (n) { return n.my_at; }); wait = srt(wait, function (n) { return n.liked_at; });
    if (k === "mine") {
      if (!S.nb) return h + '<div class="muted">' + t("loading") + "</div></div>";
      if (!mine.length) return h + '<div class="muted small">' + t("lkMineEmpty") + '</div><button type="button" class="btn" data-a="tab" data-v="neighbours">' + t("stMtBtn") + "</button>" + errLine() + "</div>";
      mine.forEach(function (n) { h += n.on_pause ? pzCard(n) : nbCard(n); });
      return h + errLine() + "</div>";
    }
    if (k === "wait") {
      if (!S.nb) return h + '<div class="muted">' + t("loading") + "</div></div>";
      if (!wait.length) return h + '<div class="muted small">' + t("lkWaitEmpty") + "</div>" + errLine() + "</div>";
      h += '<div class="tiny muted">' + t("likesYouNote") + "</div>";
      wait.forEach(function (n) { h += nbCard(n); });
      return h + errLine() + "</div>";
    }
    if (!S.matches) return h + '<div class="muted">' + t("loading") + "</div></div>";
    if (!S.matches.length) return h + stateBox("pair", t("stMtT"), t("stMtX"), '<button type="button" class="btn primary" data-a="tab" data-v="neighbours">' + t("stMtBtn") + "</button>") + "</div>";
    srt(S.matches, function (m) { return m.since; }).forEach(function (m) {
      var line = [t("g_" + m.gender), m.age, t("r_" + (m.role || "none")), m.band ? kmText(m) : "", m.chats.map(function (c) { return "«" + esc(c) + "»"; }).join(", ")].filter(function (x) { return x !== "" && x != null; }).join(" · ");
      var nm = [m.name, m.nick && m.nick !== m.name ? "(" + m.nick + ")" : ""].filter(Boolean).join(" ") || t("noName");
      // owner, 2026-11-07 (mockup L3): a soft glow card; a tap on it opens the profile (like «Ждут ответа» / «Мои лайки»)
      var canOpen = !!nbFind(m.id);
      h += '<div class="card mcard" data-mid="' + esc(m.id) + '"' + (canOpen ? ' data-a="openPerson" data-from="matches" data-v="' + esc(m.id) + '" role="button" tabindex="0"' : "") + '><div class="nbtop"><div><h2 class="mname">' + nameMark(m, 18) + esc(nm) + "</h2>" + capLine(m) + '<div class="small muted">' + line + "</div></div>" +
        '<div class="mhead">' + pctBox(m) + '<button type="button" class="iconbtn" data-a="mMenu" data-v="' + esc(m.id) + '" aria-label="' + esc(t("more")) + '">' + DOTS + "</button></div></div>" + (m.dirs ? '<div class="small">' + dirsLine(m.dirs) + "</div>" : "") +
        (m.themes.length ? '<div class="mthemes">' + m.themes.map(function (x) { return esc(x).toLowerCase(); }).join(" · ") + "</div>" : "") +   // mockup L3
        (m.about ? '<div class="about">' + esc(m.about) + "</div>" : "") + intsLine(m) +
        (m.msg_in ? '<div class="msgbox"><div class="msghead"><span>' + t("msgIn") + "</span><span>" + fmtTime(m.msg_in.at) + '</span></div><div class="msgtext">' + esc(m.msg_in.text) + "</div></div>" : "") +   // owner, 2026-10-31
        (m.msg_out ? msgOutBox(m) : "") +
        propBlock(m, nm) +
        // owner, 2026-11-07: only the main things here; the rest in «…» (profile, the Kinkosmos link, remove, report)
        '<button type="button" class="btn primary mtg" data-a="writeTg" data-v="' + esc(m.id) + '">' + t("writeTg") + " ↗</button>" +
        '<button type="button" class="btn link mcmp" data-a="compare" data-from="matches" data-v="' + esc(m.id) + '">' + t("ansCmpBtn") + "</button></div>";
    });
    return h + '<div class="tiny muted">' + t("mutualNote") + "</div>" + errLine() + "</div>";
  }

  var DOTS = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
  /** «…» on a mutual card */
  function mMenuSheet() {
    var m = (S.matches || []).filter(function (x) { return x.id === S.mMenu; })[0];
    if (!m) { S.mMenu = null; return ""; }
    var nm = [m.name, m.nick && m.nick !== m.name ? "(" + m.nick + ")" : ""].filter(Boolean).join(" ") || t("noName");
    var h = '<div class="modal-bg sheet" data-a="mMenuClose"><div class="modal card sheetbox" data-a="noop" role="dialog" aria-modal="true" aria-label="' + esc(t("more")) + '"><span class="grab" aria-hidden="true"></span><h2>' + esc(nm) + "</h2>";
    if (nbFind(m.id)) h += '<button type="button" class="srow mitem" data-a="mMenuGo" data-x="openPerson" data-v="' + esc(m.id) + '">' + t("toProfile") + "</button>";
    h += '<button type="button" class="srow mitem" data-a="mMenuGo" data-x="ksSend" data-v="' + esc(m.id) + '">' + t("ksSendBtn") + "</button>";
    h += '<button type="button" class="srow mitem" data-a="mMenuGo" data-x="unmatch" data-v="' + esc(m.id) + '" data-t="' + esc(nm) + '">' + t("removeMatch") + "</button>";
    h += '<button type="button" class="srow mitem danger" data-a="mMenuGo" data-x="reportOpen" data-v="' + esc(m.id) + '">' + t("reportBtn") + "</button>";
    return h + '<button type="button" class="btn" data-a="mMenuClose">' + t("close") + "</button></div></div>";
  }

  /* ---------- a neighbour's constellation inside the app (owner, 2026-10-24; site v649 «&embed=other») ---------- */
  function starsBtns(id, nick) {
    return '<button type="button" class="btn site" data-a="nStarsOpen" data-v="' + esc(id) + '" data-t="' + esc(nick || "") + '">' + esc(nick ? t("nStarsBtn", { name: nick }) : t("nStarsBtn0")) + "</button>" +
      '<button type="button" class="btn link" data-a="ksSend" data-v="' + esc(id) + '">' + t("ksSendBtn") + "</button>";
  }

  /* ---------- «Предложить практики» (owner, 2026-10-24) ---------- */
  var PROP_MAX = 30;
  function propBlock(m, nm) {
    var h = "", who = m.nick || m.name || nm;
    var box = function (p, title, cls) {
      // owner, 2026-10-26: the message first, at the normal size, then the practices
      return '<div class="prop' + cls + '"><b>' + esc(title) + "</b>" + (p.note ? '<span class="pnote">«' + esc(p.note) + "»</span>" + '<span class="tiny muted plabel">' + t("propListN", { n: p.items.length }) + "</span>" : "") +
        "<span>" + p.items.map(esc).join(" · ") + "</span>" + '<span class="tiny muted">' + fmtTime(p.at) + "</span></div>";
    };
    // owner, 2026-10-26: an incoming proposal is a window that opens its own page (checklist-style), not a wall of text
    if (m.prop_in) {
      var pn = m.prop_in.note || "", short = pn.length > 160 ? pn.slice(0, 157).replace(/\s+\S*$/, "") + "…" : pn;
      h += '<button type="button" class="prop in pwin" data-a="pinOpen" data-v="' + esc(m.id) + '" data-t="' + esc(who) + '"><b>' + esc(t("propIn", { name: who, n: m.prop_in.items.length })) + "</b>" +
        (short ? '<span class="pnote">«' + esc(short) + "»</span>" : "") +
        '<span class="pgo"><span class="tiny muted">' + fmtTime(m.prop_in.at) + "</span><span>" + t("pinOpen") + " ›</span></span></button>";
    }
    if (m.prop_out) h += box(m.prop_out, t("propOut", { n: m.prop_out.items.length }), "") +
      '<div class="decide"><button type="button" class="btn" data-a="propOpen" data-v="' + esc(m.id) + '" data-t="' + esc(who) + '">' + t("propEdit") + '</button><button type="button" class="btn" style="color:var(--danger)" data-a="propCancel" data-v="' + esc(m.id) + '">' + t("propCancel") + "</button></div>";
    else if (m.prop_in) h += '<button type="button" class="btn" data-a="propOpen" data-v="' + esc(m.id) + '" data-t="' + esc(who) + '">' + t("propBack") + "</button>";   // owner, 2026-11-07: «Предложить» itself lives on the person's page
    return h;
  }
  /** owner, 2026-10-26: «Вам предложили» — the message, then the practices by section with both answers, like the checklist. */
  function vPropIn() {
    var P = S.pin, m = (S.matches || []).filter(function (x) { return x.id === P.id; })[0], pr = m && m.prop_in;
    var h = '<div class="backrow"><button type="button" data-a="pinClose" aria-label="' + t("back") + '">‹</button><span class="serif" style="font-size:20px">' + esc(t("pinTitle", { name: P.name })) + "</span></div>";
    if (!pr) return h + '<div class="body"><div class="card small muted">' + t("pinGone") + "</div></div>";
    h += '<div class="body">';
    h += '<div class="card"><div class="small muted">' + esc(t("pinFrom", { name: P.name, date: fmtTime(pr.at) })) + "</div>" +
      (pr.note ? '<div class="pnote big">«' + esc(pr.note) + "»</div>" : '<div class="small muted">' + t("pinNoNote") + "</div>") + "</div>";
    var rows = {}, d = P.data;
    if (d) [].concat(d.both, d.half).forEach(function (r) { rows[r.id] = r; });
    var order = {}; (S.items || []).forEach(function (x, i) { order[x[0]] = i; });
    var catOf = {}; (S.items || []).forEach(function (x) { catOf[x[0]] = x[2]; });
    var ids = (pr.ids || []).slice().sort(function (a, b) { return (order[a] == null ? 1e6 : order[a]) - (order[b] == null ? 1e6 : order[b]); });
    var nameOf = {}; (pr.ids || []).forEach(function (x, i) { nameOf[x] = pr.items[i]; });
    var a = function (x) { return x ? '<span class="ans a-' + (x === "no" ? "limit" : x) + '">' + t("a_" + (x === "no" ? "limit" : x)) + "</span>" : ""; };
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline"><span class="lbl">' + t("propListN", { n: ids.length }) + '</span><span class="tiny muted">' + t("you") + " · " + esc(P.name) + "</span></div>";
    var cat = null, open = false;
    ids.forEach(function (x) {
      var r = rows[x] || {}, c = r.cat || catOf[x] || "";
      if (c !== cat) { if (open) h += "</div>"; cat = c; h += (c ? '<div class="cat">' + esc(c) + "</div>" : "") + '<div class="card list">'; open = true; }
      h += '<div class="crow"><span style="flex:1;padding:8px 0">' + esc(r.name || nameOf[x] || x) + '</span><span style="display:flex;gap:4px">' + a(r.me) + a(r.them) + "</span></div>";
    });
    if (open) h += "</div>";
    if (!d) h += '<div class="tiny muted">' + t("loading") + "</div>";
    h += "</div>";
    return h + '<div class="foot"><button type="button" class="btn" data-a="propOpen" data-v="' + esc(P.id) + '" data-t="' + esc(P.name) + '">' + t("propBack") + '</button><button type="button" class="btn primary" data-a="writeTg" data-v="' + esc(P.id) + '">' + t("writeTg") + "</button></div>";
  }
  function propCount() { return Object.keys(S.prop.sel).filter(function (k) { return S.prop.sel[k]; }).length; }
  function vPropose() {
    var P = S.prop, d = P.data;
    var h = '<div class="backrow"><button type="button" data-a="propClose" aria-label="' + t("back") + '">‹</button><span class="serif" style="font-size:20px">' + esc(t("propTitle", { name: P.name })) + "</span></div>";
    if (!d) return h + '<div class="body"><div class="muted">' + t("loading") + "</div></div>";
    h += '<div class="body" style="padding-bottom:0"><div class="small muted" style="line-height:1.5">' + t("propIntro") + "</div>";
    if (d.mine) h += '<div class="card warn small">' + esc(t("propHave", { date: fmtTime(d.mine.at) })) + "</div>";
    h += "</div>";
    if (!d.both.length && !d.half.length) return h + '<div class="body"><div class="card small muted">' + t("propNone") + "</div></div>";
    h += '<div class="seg">' + [["both", "propBoth"], ["half", "propHalf"]].map(function (o) { return '<button type="button" data-a="propTab" data-v="' + o[0] + '" aria-pressed="' + (P.tab === o[0]) + '">' + t(o[1]) + " · " + d[o[0]].length + "</button>"; }).join("") + "</div>";
    h += '<div class="body" style="padding-top:0"><div class="tiny muted" style="display:flex;justify-content:flex-end">' + t("you") + " · " + t("them") + "</div>";
    var cat = null, open = false, a = function (x) { return '<span class="ans a-' + (x === "no" ? "limit" : x) + '">' + t("a_" + (x === "no" ? "limit" : x)) + "</span>"; };
    d[P.tab].forEach(function (r) {
      if (r.cat !== cat) { if (open) h += "</div>"; cat = r.cat; h += '<div class="cat">' + esc(cat) + '</div><div class="card list">'; open = true; }
      h += '<label class="crow pick"><input type="checkbox" data-a="propPick" data-v="' + esc(r.id) + '"' + (P.sel[r.id] ? " checked" : "") + '><span style="flex:1">' + esc(r.name) + '</span><span style="display:flex;gap:4px">' + a(r.me) + a(r.them) + "</span></label>";
    });
    if (open) h += "</div>";
    h += '<label class="field"><span class="lbl">' + t("propNote") + '</span><textarea maxlength="500" data-f="pnote" style="min-height:84px" placeholder="' + esc(t("propNotePh")) + '">' + esc(S.form.pnote || "") + '</textarea><span class="tiny muted" id="pnotecount" style="text-align:right">' + String(S.form.pnote || "").length + ' / 500</span></label>';
    var n = propCount();
    h += errLine() + "</div>";
    return h + '<div class="foot one"><div class="tiny muted picked">' + esc(t("propPicked", { n: n, name: P.name })) + '</div><button type="button" class="btn primary" data-a="propSend"' + (!n || S.busy ? " disabled" : "") + ">" + t(d.mine ? "propReplace" : "propSend", { n: n }) + "</button></div>";
  }

  /* ---------- a report ---------- */
  function vReportForm() {
    var r = S.report;
    var h = '<div class="backrow"><button type="button" data-a="reportClose" aria-label="' + t("back") + '">‹</button><span class="serif" style="font-size:20px">' + t("rTitle") + "</span></div><div class=\"body\">";
    if (r.sent) return h + '<div class="card ok">' + t("rSent") + '</div><button type="button" class="btn" data-a="reportClose">' + t("back") + "</button></div>";
    if (r.msg) h += '<div class="card small"><b>' + t("mMsg") + "</b><div>" + t("msgReportNote") + "</div></div>";   // owner, 2026-10-31
    h += '<div class="lbl">' + t("rReason") + "</div>";
    ["under18", "fake", "abuse", "gender", "other"].forEach(function (v) {
      h += '<label class="opt' + (r.reason === v ? " on" : "") + '"><input type="radio" name="reason" data-a="reportReason" data-v="' + v + '"' + (r.reason === v ? " checked" : "") + "><span>" + t("rr_" + v) + "</span></label>";
    });
    h += '<label class="field"><span class="lbl">' + t("rText") + '</span><textarea maxlength="500" data-f="rtext">' + esc(S.form.rtext || "") + "</textarea></label>";
    h += '<div class="tiny muted">' + t("rNote") + "</div>";
    return h + errLine() + "</div>" + foot(null, "reportSend", t("rSend"));
  }

  function vCompare() {
    var c = S.cmp, G = c.groups;
    var groups = { both: G.match, discuss: [].concat(G.discA, G.discB, G.discBoth), one: [].concat(G.oneA, G.oneB), limits: [].concat(G.exBoth, G.exA, G.exB) };
    var h = ansHead(nbFind(S.open)) + ansSwitch("cmp", S.open, nbFind(S.open));
    // owner, 2026-10-24: love / yes / maybe / no of both, and per section of the neighbour
    var nums = function (x) { return ["love", "yes", "maybe", "no"].map(function (k) { return '<b class="c-' + k + '">' + (x[k] || 0) + "</b>"; }).join(""); };
    if (c.counts) h += '<div class="body" style="padding-bottom:0;flex:none"><div class="card"><div class="cnt5"><span></span>' + ["love", "yes", "maybe", "no"].map(function (k) { return '<span class="tiny muted">' + t("v_" + k) + "</span>"; }).join("") +
      "<span>" + t("cntThem") + "</span>" + nums(c.counts.them) + "<span>" + t("cntMe") + "</span>" + nums(c.counts.me) + "</div></div></div>";
    h += '<div class="seg">' + [["both", "g_both"], ["discuss", "g_discuss"], ["one", "g_one"], ["limits", "g_limits"]].map(function (o) {
      return '<button type="button" data-a="cmpTab" data-v="' + o[0] + '" aria-pressed="' + (S.cmpTab === o[0]) + '">' + t(o[1]) + " · " + groups[o[0]].length + "</button>"; }).join("") + "</div>";
    h += '<div class="body anspage" style="padding-top:0">' + ansSearch();
    var cols = c.cols || [], cl = [];
    if (cols[0]) cl.push(t("colsMe", { r: t(cols[0]) }));
    if (cols[1]) cl.push(t("colsThem", { r: t(cols[1]) }));
    if (cl.length) h += '<p class="tiny muted">' + esc(t("cmpCols", { list: cl.join(", ") })) + "</p>";
    if (S.cmpTab === "limits") h += '<p class="tiny muted">' + esc(t("limitsNote")) + "</p>";
    h += '<div class="tiny muted" style="display:flex;justify-content:flex-end">' + t("you") + " · " + t("them") + "</div>";
    var cat = null, open = false;
    groups[S.cmpTab].forEach(function (r) {
      if (r.cat !== cat) {
        if (open) h += "</div></div>";
        cat = r.cat; var k = c.cats && c.cats[cat];
        h += '<div class="ansgrp"><div class="cat">' + esc(cat) + (k ? '<span class="catn">' + t("cntThem") + ": " + '<b class="c-yes">' + k.yes + "</b> " + t("v_yes") + ' · <b class="c-maybe">' + k.maybe + "</b> " + t("v_maybe") + ' · <b class="c-no">' + k.no + "</b> " + t("v_no") + "</span>" : "") + '</div><div class="card list">'; open = true;
      }
      var a = function (x) { return '<span class="ans a-' + (x || "none") + '">' + t("a_" + (x || "none")) + "</span>"; };
      h += ansRow(r.name, '<span style="display:flex;gap:4px">' + a(r.me) + a(r.them) + "</span>");
    });
    if (open) h += "</div></div>";
    return h + "</div>";
  }
  /* owner, 2026-11-07: «Ответы и сравнение» — one screen with a switch: the comparison (when allowed) or their answers,
     and a search by practice over the rows (filtered as you type, nothing asked again) */
  /** mockup P5: «Анкета Фиалки» + «264 ответа · совпадение 87 %» */
  function ansHead(n) {
    var nm = n ? n.nick || who(n) : "";
    return '<div class="backrow anshead"><button type="button" data-a="ansClose" aria-label="' + t("back") + '">‹</button><span class="ah"><b>' + esc(n && n.nick ? t("ansOf", { name: n.nick }) : t("ansCmpT")) + "</b>" +
      (n ? '<span class="tiny muted">' + esc([n.answered ? ansOf(n) : "", n.pct != null ? t("match").toLowerCase() + " " + n.pct + " %" : ""].filter(Boolean).join(" · ")) + "</span>" : "") + "</span></div>";
  }
  function ansSwitch(on, id, n) {
    if (!n || !n.compare) return "";
    return '<div class="seg ansseg">' + [["list", n.gender === "woman" ? "ansHerW" : n.gender === "man" ? "ansHerM" : "ansHerO"], ["cmp", "ansCmpCmp"]].map(function (o) {
      return '<button type="button" data-a="ansView" data-v="' + o[0] + '" data-id="' + esc(id) + '" aria-pressed="' + (on === o[0]) + '">' + esc(t(o[1], { name: n.nick || who(n) })) + "</button>"; }).join("") + "</div>";
  }
  function ansSearch() {
    var q = S.aAnsQ || "";
    return '<input type="search" data-a="aAnsQ" autocomplete="off" aria-label="' + esc(t("ansQ")) + '" placeholder="' + esc(t("ansQ")) + '" value="' + esc(q) + '"><div class="muted small" id="aansnone" hidden>' + t("ansNone") + "</div>";
  }
  function ansRow(name, right) {
    var q0 = norm(S.aAnsQ || ""), k = norm(name);
    return '<div class="crow" data-q="' + esc(k) + '"' + (q0 && k.indexOf(q0) < 0 ? " hidden" : "") + '><span style="flex:1;padding:8px 0">' + esc(name) + "</span>" + right + "</div>";
  }

  function vHome() {
    var h = "";
    if (S.tz) return S.tz.gone ? vTeaserGone() : vTeaserOnly();   // owner, 2026-11-07: a profile link
    if (S.ints) return vInts();   // owner, 2026-10-28
    if (S.launched) return vLaunched();
    if (S.report) return vReportForm();
    if (S.prop) return vPropose();
    if (S.pin) return vPropIn();
    if (S.aOpen) return staffView("vAdminProfile");
    if (S.mOpen) return staffView("vReport");
    if (S.open && S.cmp && S.cmpView !== "list") return vCompare();
    if (S.open && S.list) return vList();
    if (S.open) return vPerson() + (S.pMenu ? personMenu(nbFind(S.open) || {}) : "");
    var calOn = !!(S.me.cal && S.me.cal.see && S.me.active);   // owner, 2026-10-29: false while the owner keeps it off
    if (S.tab === "cal" && calOn && CAL) { var fh = CAL.full(); if (fh != null) return fh; }   // event page, form…: no tab bar
    if (S.tab === "mod") h = staffView("vModeration");
    else if (S.tab === "cal" && calOn) h = CAL ? CAL.view() : calWait();
    else if (S.tab === "neighbours") h = vNeighbours();
    else if (S.tab === "matches") h = vMatches();
    else if (S.tab === "chat") h = vChatTab();   // owner, 2026-10-31
    else h = vMyProfile();
    var icons = {
      neighbours: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/></svg>',
      matches: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
      profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
      mod: SHIELD,
      cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    };
    var labels = { neighbours: "tNeighbours", matches: "tLikes", profile: "tProfile", mod: "tMod", cal: "tCal", chat: "tChat" };
    var tabs = !S.me.access ? ["mod"] : S.me.mod ? (S.me.active ? ["neighbours", "matches", "profile", "mod"] : ["mod", "profile"]) : ["neighbours", "matches", "profile"];
    if (calOn) tabs.splice(tabs.indexOf("profile"), 0, "cal");
    if (S.me.access && (S.me.nova || (S.me.uchats || []).length)) tabs.push("chat");   // owner, 2026-10-31: a nebula tab
    h += '<nav class="tabs">' + tabs.map(function (k) {
      var newN = k === "matches" ? likesNew() : 0;   // owner, 2026-11-03: new likes waiting for an answer
      var label = t(labels[k]) + (newN ? ' <i class="nbadge">' + newN + "</i>" : "");
      if (k === "chat") { var un = chatUnread(); return '<button type="button" class="tab nebtab" data-a="tab" data-v="chat"' + (S.tab === k ? ' aria-current="page"' : "") + ">" + SPARK + "<span>" + t(S.me.nova ? "tChats" : "tChat") + (un ? ' <i class="nbadge">' + un + "</i>" : "") + "</span></button>"; }
      return '<button type="button" class="tab" data-a="tab" data-v="' + k + '"' + (S.tab === k ? ' aria-current="page"' : "") + ">" + icons[k] + label + "</button>";
    }).join("") + "</nav>";
    return h;
  }

  Object.assign(A, {
    nStarsOpen: function (el) { nStarsShow(el.dataset.v, el.dataset.t || ""); },
    ksSend: function (el) { ksSend(el.dataset.v, el); },
    // owner, 2026-10-31: «Да» opens the sheet (message or just «да»)
    yesOpen: function (el) { S.yes = { id: el.dataset.v, text: yesDrafts[el.dataset.v] || "" }; S.err = ""; render(); var ta = document.getElementById("ymText"); if (ta && !("ontouchstart" in window)) ta.focus(); },
    yesClose: function () { if (S.busy) return; yesKeep(); S.yes = null; render(); },
    yesInvite: function () { yesKeep(); S.yes = null; S.open = null; S.tab = "profile"; S.pTab = "invites"; S.inv = null; render(); window.scrollTo(0, 0); },
    yesPlain: function () { yesGo(""); },
    yesSend: function () { var ta = document.getElementById("ymText"); yesGo(ta ? ta.value : (S.yes && S.yes.text) || ""); },
    pzCancel: function () { S.pzAsk = null; render(); },
    pzGo: function () {
      if (S.busy) return;
      var id = S.pzAsk; S.busy = true; render();
      api("POST", "answer", { id: id, value: null }).then(function (r) {
        S.busy = false; S.pzAsk = null;
        if (!r.ok) { S.err = t("netErr"); return render(); }
        if (S.nb) S.nb.on_pause = (S.nb.on_pause || []).filter(function (x) { return x.id !== id; });
        if (S.open === id) { S.open = null; backY("nb"); }
        S.note = t("pzDone"); render();
      }, function () { S.busy = false; S.pzAsk = null; S.err = t("netErr"); render(); });
    },
    // owner, 2026-10-31: «Сверхновая»
    nvStart: function (el) {
      if (S.busy) return;
      var id = el.dataset.v; S.busy = true; render();
      api("POST", "nova/start", { id: id }).then(function (r) {
        S.busy = false;
        if (!r.ok) { S.err = t("netErr"); return render(); }
        S.open = null; S.tab = "chat"; S.nchats = null; if (r.created) S.me.nova.chats = (S.me.nova.chats || 0) + 1; chatOpen(r.chat); window.scrollTo(0, 0);
      }, function () { S.busy = false; S.err = t("netErr"); render(); });
    },
    msgReport: function (el) { S.pMenu = false; S.report = { id: el.dataset.v, reason: null, msg: true }; S.form = {}; S.err = ""; render(); window.scrollTo(0, 0); },
    answer: function (el) {
      if (S.busy) return;
      var id = el.dataset.id, v = el.dataset.v || null, days = el.dataset.days ? +el.dataset.days : undefined;
      S.busy = true; S.err = ""; render();
      api("POST", "answer", { id: id, value: v, days: days }).then(function (r) {
        S.busy = false;
        if (!r.ok) { S.err = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); haptic("error"); return render(); }
        var n = nbFind(id);
        if (n) { n.my = v; n.mutual = !!r.mutual; if (v === "no") n.was_hidden = false; }
        haptic("success");
        if (r.mutual) { S.note = t("mutualNow"); loadMatches(); }
        if (v === "no") { S.open = null; }
        render();
      }, function () { S.busy = false; S.err = t("netErr"); render(); });
    },
    // owner, 2026-10-22: open «Взаимные» right at this person's card, not at the top
    lkSort: function () { var o = ["new", "old", "pct"]; S.lkSort = o[(o.indexOf(S.lkSort || "new") + 1) % 3]; render(); },
    mMenu: function (el) { S.mMenu = el.dataset.v; render(); },
    mMenuClose: function () { S.mMenu = null; render(); },
    mMenuGo: function (el) {
      var x = el.dataset.x; S.mMenu = null;
      if (x === "openPerson") return A.openPerson({ dataset: { v: el.dataset.v, from: "matches" } });
      if (x === "ksSend") { render(); api("POST", "kslink-send", { id: el.dataset.v }).then(function (r) { S.note = r.ok ? t("ksSent") : t("netErr"); render(); }, function () { S.note = t("netErr"); render(); }); return; }
      A[x](el);
    },
    lkTab: function (el) { likesTab(el.dataset.v); S.note = ""; render(); window.scrollTo(0, 0); },
    toMatches: function () { S.lkTab = "mutual"; S.scrollToMatch = S.open; S.matches = null; S.open = null; S.cmp = null; S.note = ""; S.tab = "matches"; loadMatches(); render(); if (!S.scrollToMatch) window.scrollTo(0, 0); },
    writeTg: function (el) {
      var m = (S.matches || []).filter(function (x) { return x.id === el.dataset.v; })[0];
      if (m && m.tg) { if (tg && tg.openTelegramLink) tg.openTelegramLink(m.tg); else window.open(m.tg, "_blank"); return; }
      api("POST", "contact", { id: el.dataset.v }).then(function (r) { S.note = r.ok ? t("contactSent") : t("netErr"); render(); window.scrollTo(0, 0); });
    },
    unmatch: function (el) {   // owner, 2026-10-20: two confirmations
      var id = el.dataset.v; if (S.pMenu) { S.pMenu = false; render(); }
      confirm2(t("removeConfirm", { name: el.dataset.t }), t("removeConfirm2"), function () {
        api("POST", "answer", { id: id, value: null, via: "unmatch" }).then(function () { loadMatches(); loadNeighbours(); });
      });
    },
    reportOpen: function (el) { S.pMenu = false; S.report = { id: el.dataset.v, reason: null }; S.form = {}; S.err = ""; render(); window.scrollTo(0, 0); },
    reportClose: function () { S.report = null; S.form = {}; S.err = ""; render(); },
    reportReason: function (el) { S.report.reason = el.dataset.v; render(); },
    pMenu: function () { S.pMenu = true; render(); },
    pMenuClose: function (el, e) { S.pMenu = false; render(); },
    pmNotNow: function (el) { S.pMenu = false; A.nnOpen(el); },
    // owner, 2026-11-07: «Не сейчас» — for 1 · 3 · 7 · 30 · 90 · 120 · 360 days, chosen on a slider
    nnOpen: function (el) { S.nn = { id: el.dataset.v, i: S.nnLast != null ? S.nnLast : 2 }; render(); },
    nnClose: function () { S.nn = null; render(); },
    nnGo: function () { var N = S.nn; if (!N) return; S.nnLast = N.i; S.nn = null; A.answer({ dataset: { v: "no", id: N.id, days: String(NN_DAYS[N.i]) } }); },
    pMap: function (el) {
      var n = nbFind(el.dataset.v); if (!n) return;
      S.mapFrom = { id: n.id, view: S.nbView, sw: S.swBack, from: S.openFrom };   // the phone's «back» returns to this card
      S.open = null; S.cmp = null; S.list = null; S.tab = "neighbours"; S.nbView = "map"; S.zone = n.zone; S.mapFocus = n.zone; S.mapView = null; render(); window.scrollTo(0, 0);
    },
    mapBack: function () {
      var M = S.mapFrom; S.mapFrom = null; if (!M) return render();
      S.nbView = M.view === "map" ? "list" : M.view; S.swBack = M.sw;
      A.openPerson({ dataset: { v: M.id, from: M.from === "matches" ? "matches" : "" } });
    },
    listOpen: function (el) {
      var id = el.dataset.v; S.list = { id: id, data: null, side: null, ans: "all" }; S.cmpView = "list"; S.pMenu = false; render(); window.scrollTo(0, 0);
      timeStart("list");
      listGet(id).then(function (r) { if (!S.list || S.list.id !== id) return; if (r.ok) S.list.data = r; else S.list.err = true; var y = window.scrollY; render(); if (S.swPull) window.scrollTo(0, Math.max(y, (document.getElementById("pullup") || {}).offsetHeight || 0)); timeEnd("list"); }, function () { if (S.list) { S.list.err = true; render(); } });
    },
    listClose: function () { if (S.swPull) return A.closePerson(); S.list = null; render(); window.scrollTo(0, 0); },
    unlike: function (el) {
      var n = nbFind(el.dataset.v); if (!n) return;
      var go = function () { A.answer({ dataset: { v: "", id: n.id } }); };
      if (n.msg_out) askYes(t("ymUndoNote"), function (y) { if (y) go(); }); else go();   // the message goes with the like
    },
    listSide: function (el) { S.list.side = el.dataset.v; render(); },
    listAns: function (el) { S.list.ans = el.dataset.v; render(); },
    closePerson: function () {
      S.list = null; S.pMenu = false; var fromM = S.openFrom === "matches"; S.open = null; S.cmp = null; S.openFrom = null; S.note = "";
      if (S.swBack) { S.swBack = false; S.swPull = false; S.cmpView = null; render(); window.scrollTo(0, 0); return; }   // back to «Листать», at the top of the same card
      backY(fromM ? "mt" : "nb"); render();
    },
    compare: function (el) {
      S.err = ""; S.busy = true;
      if (el.dataset.from === "matches") { keepY("mt"); S.open = el.dataset.v; S.openFrom = "matches"; } else S.openFrom = null;
      timeStart("compare");
      cmpGet(el.dataset.v).then(function (r) {
        S.busy = false; timeEnd("compare");
        if (!r.ok) { S.err = r.error === "compare_hidden" ? t("compareHidden") : t("netErr"); return render(); }
        S.cmp = r; S.cmpTab = "both"; S.cmpView = "cmp"; render(); window.scrollTo(0, 0);
      }, function () { S.busy = false; S.err = t("netErr"); render(); });
    },
    ansView: function (el) {
      var id = el.dataset.id;
      if (el.dataset.v === "list") { S.cmpView = "list"; if (!S.list || S.list.id !== id) A.listOpen({ dataset: { v: id } }); else render(); }
      else { S.cmpView = "cmp"; if (S.cmp) render(); else A.compare({ dataset: { v: id, from: S.openFrom === "matches" ? "matches" : "" } }); }
    },
    ansClose: function () { S.cmpView = null; S.list = null; S.aAnsQ = ""; if (S.swPull) return A.closePerson(); A.closeCompare(); },
    closeCompare: function () { if (S.swPull) return A.closePerson(); S.cmp = null; if (S.openFrom === "matches") { S.open = null; S.openFrom = null; backY("mt"); } render(); },
    cmpTab: function (el) { S.cmpTab = el.dataset.v; render(); },
    insAll: function () { S.insAll = !S.insAll; render(); },
    // owner, 2026-10-24: «Предложить практики»
    propOpen: function (el) {
      var id = el.dataset.v;
      S.prop = { id: id, name: el.dataset.t || "", data: null, tab: "both", sel: {} }; S.form = {}; S.err = ""; render(); window.scrollTo(0, 0);
      api("GET", "propose?id=" + encodeURIComponent(id)).then(function (r) {
        if (!S.prop || S.prop.id !== id) return;
        if (!r.ok) { S.prop = null; S.err = t("netErr"); return render(); }
        S.prop.data = r;
        if (r.mine) { r.mine.items.forEach(function (x) { S.prop.sel[x] = true; }); S.form.pnote = r.mine.note || ""; }
        if (!r.both.length && r.half.length) S.prop.tab = "half";
        render();
      }, function () { S.prop = null; S.err = t("netErr"); render(); });
    },
    pinOpen: function (el) {
      var id = el.dataset.v; keepY("mt");
      S.pin = { id: id, name: el.dataset.t || "", data: null }; S.err = ""; loadItems(); render(); window.scrollTo(0, 0);
      api("GET", "propose?id=" + encodeURIComponent(id)).then(function (r) { if (S.pin && S.pin.id === id && r.ok) { S.pin.data = r; render(); } });
    },
    pinClose: function () { S.pin = null; backY("mt"); render(); },
    propClose: function () { var id = S.prop && S.prop.id; S.prop = null; S.form = {}; S.err = ""; S.scrollToMatch = id; render(); },
    propTab: function (el) { S.prop.tab = el.dataset.v; render(); },
    propPick: function (el) {
      if (el.checked && propCount() >= PROP_MAX) { el.checked = false; var q = t("propMax", { n: PROP_MAX }); if (tg && tg.showAlert) tg.showAlert(q); else window.alert(q); return; }
      S.prop.sel[el.dataset.v] = el.checked;
      var y = window.scrollY; render(); window.scrollTo(0, y);
    },
    propSend: function () {
      if (S.busy || !S.prop) return;
      var P = S.prop, items = Object.keys(P.sel).filter(function (k) { return P.sel[k]; });
      if (!items.length) { S.err = t("e_no_items"); return render(); }
      S.busy = true; S.err = ""; render();
      api("POST", "propose", { id: P.id, items: items, note: S.form.pnote || "" }).then(function (r) {
        S.busy = false;
        if (!r.ok) { S.err = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); return render(); }
        S.prop = null; S.form = {}; S.note = t(r.replaced ? "propReplaced" : "propSent"); S.scrollToMatch = P.id; S.matches = null; loadMatches(); render();
      }, function () { S.busy = false; S.err = t("netErr"); render(); });
    },
    propCancel: function (el) {
      var id = el.dataset.v, go = function (yes) {
        if (yes) api("POST", "propose/cancel", { id: id }).then(function (r) { S.note = r.ok ? t("propCancelled") : t("netErr"); S.scrollToMatch = id; loadMatches(); });
      };
      askYes(t("propCancelQ"), go);
    },
  });
  /* ===== app-src/06-chat-nova.js — Supernova chats: «✦ Чат» tab, chat screen, polling; the supernova's own tab.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  /* owner, 2026-10-31: «Сверхновая» chats — the supernova's list, the person's list (if several), the chat itself */
  function chatUnread() { return S.me.nova ? S.me.nova.unread || 0 : (S.me.uchats || []).reduce(function (a, c) { return a + (c.unread || 0); }, 0); }
  function uchatWith(pub) { return (S.nchats || []).filter(function (c) { return c.n === pub; })[0]; }
  function vChatTab() {
    if (S.chat) return vChat();
    var h = '<div class="nebbg chead"><h1>' + SPARK + " " + t(S.me.nova ? "tChats" : "tChat") + "</h1>" + (S.me.nova ? '<div class="small sec">' + esc(t("chMine", { nick: (S.me.profile && S.me.profile.nick) || "" })) + "</div>" : "") + '</div><div class="body">';
    if (!S.me.nova) {
      (S.me.uchats || []).forEach(function (c) { h += '<button type="button" class="card nb chrow" data-a="chatOpen" data-v="' + c.id + '"><span class="chav">' + SPARK + '</span><span class="chmain"><b>' + esc(c.nick) + '</b><span class="tiny muted">' + t("chSub") + "</span></span>" + (c.unread ? '<i class="nbadge">' + c.unread + "</i>" : "") + "</button>"; });
      return h + "</div>";
    }
    if (!S.nchats) { if (!S.nchLoading) { S.nchLoading = true; api("GET", "nova/chats").then(function (r) { S.nchLoading = false; S.nchats = r.ok ? r.items : []; if (r.ok) S.me.nova.unread = r.items.reduce(function (a, c) { return a + c.unread; }, 0); render(); }, function () { S.nchLoading = false; }); } return h + '<div class="muted">' + t("loading") + "</div></div>"; }
    if (!S.nchats.length) h += '<div class="card small muted">' + t("chEmpty") + "</div>";
    else h += '<div class="card list">' + S.nchats.map(function (c) {
      return '<button type="button" class="chrow2" data-a="chatOpen" data-v="' + c.id + '"><span class="chav l">' + esc((c.nick || "?").charAt(0).toUpperCase()) + '</span><span class="chmain"><b>' + esc(c.nick || "#" + c.n) + '</b><span class="small ' + (c.unread ? "" : "muted") + ' clip"' + (c.unread ? ' style="font-weight:600"' : "") + ">" + (c.mine ? t("chYou") : "") + esc(c.last) + '</span></span><span class="chside"><span class="tiny muted">' + fmtTime(c.at) + "</span>" + (c.unread ? '<i class="nbadge">' + c.unread + "</i>" : "") + "</span></button>";
    }).join("") + "</div>";
    return h + "</div>";
  }
  function vChat() {
    var C = S.chat, d = C.data;
    var h = '<div class="nebbg chead row"><button type="button" class="chback" data-a="chatClose" aria-label="' + t("back") + '">‹</button>';
    if (!d) return h + '<span class="serif" style="font-size:19px">' + t("loading") + "</span></div>";
    var nova = d.chat.side === "nova", title = nova ? d.chat.user.nick : d.chat.nova.nick, sub = nova ? "" : d.chat.nova.caption || t("chSub");
    h += '<span class="chtitle"><b class="serif">' + (nova ? "" : SPARK + " ") + esc(title) + "</b>" + (sub ? '<span class="small sec">' + esc(sub) + "</span>" : "") + "</span>" +
      (nova ? '<button type="button" class="chdel" data-a="chatDel">' + t("chDelete") + "</button>" : "") + "</div>";
    h += '<div class="chlog" id="chlog"><div class="tiny muted chnote">' + t("chNote") + "</div>";
    var last = null;
    d.items.forEach(function (m, i) {
      var day = fmtDate(m.at); if (day !== last) { h += '<div class="tiny muted chday">' + day + "</div>"; last = day; }
      if (m.nova && !m.mine && (i === 0 || !d.items[i - 1].nova)) h += '<span class="chwho">✦ ' + esc(d.chat.nova.nick) + "</span>";
      h += '<div class="bub ' + (m.mine ? "out" : m.nova ? "in nv" : "in") + '">' + esc(m.text) + '</div><span class="tiny muted chtm ' + (m.mine ? "r" : "") + '">' + fmtTime(m.at).split(", ").pop() + (m.mine && i === d.items.length - 1 && d.chat.seen ? " · " + t("chSeen") : "") + "</span>";
    });
    h += "</div>" + '<div class="chcomp"><label for="chText" class="vh">' + t("chPh") + '</label><textarea id="chText" data-a="chText" maxlength="1000" rows="1" placeholder="' + esc(t("chPh")) + '">' + esc(C.text || "") + "</textarea>" +
      '<button type="button" class="chsend nebbg" data-a="chatSend" aria-label="' + esc(t("chSend")) + '"' + (S.busy ? " disabled" : "") + '><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>' +
      '<div class="tiny muted" style="padding:6px 16px 12px">' + t(nova ? "chFoot" : "chUserFoot") + "</div>" + errLine();
    return h;
  }
  var chatTimer = null;
  function chatLoad(quiet) {
    var C = S.chat; if (!C) return;
    api("GET", "chat?c=" + C.id).then(function (r) {
      if (S.chat !== C) return;
      if (!r.ok) { S.chat = null; S.note = t("chGone"); refreshMe(); return render(); }
      var grew = !C.data || C.data.items.length !== r.items.length;
      C.data = r;
      (S.me.uchats || []).forEach(function (u) { if (u.id === C.id) u.unread = 0; });
      (S.nchats || []).forEach(function (u) { if (u.id === C.id) { if (S.me.nova) S.me.nova.unread = Math.max(0, (S.me.nova.unread || 0) - u.unread); u.unread = 0; } });
      if (!quiet || grew) { render(); var lg = document.getElementById("chlog"); if (lg) window.scrollTo(0, document.body.scrollHeight); }
    }, function () {});
  }
  function chatOpen(id) {
    S.chat = { id: Number(id), data: null, text: "" }; render(); chatLoad();
    clearInterval(chatTimer);
    chatTimer = setInterval(function () { if (S.tab === "chat" && S.chat && !S.busy && !document.hidden) chatLoad(true); else if (!S.chat) clearInterval(chatTimer); }, 15000);
  }
  /** Профиль → «✦ Сверхновая»: how people see it, who sees it, the people picker */
  function novaTab(p) {
    var N = S.me.nova, h = '<div class="card neb"><b class="serif" style="font-size:18px">' + t("nvYouT") + '</b><span class="small sec">' + t("nvYouX") + "</span>" +
      '<button type="button" class="nbtn pri" data-a="tab" data-v="chat">' + t("nvChatsBtn", { n: N.chats }) + "</button></div>";
    h += '<div class="card"><h2>' + t("nvLookT") + '</h2><div class="tiny muted">' + t("nvLookX") + "</div>" +
      prow("editPart", "nick", t("nvNick"), esc(p.nick || "")) + prow("pTab", "star", t("nvCap"), esc((p.star && p.star.caption) || "—")) + prow("editPart", "about", t("nvAbout"), '<span class="ptext">' + esc(p.about || "") + "</span>") + "</div>";
    h += '<div class="card"><h2>' + t("nvVisT") + "</h2>" + [["all", "nvVisAll", "nvVisAllX"], ["some", "nvVisSome", "nvVisSomeX"], ["none", "nvVisNone", "nvVisNoneX"]].map(function (o) {
      return '<label class="opt' + (N.vis === o[0] ? " on" : "") + '"><input type="radio" name="nvvis" data-a="nvVis" data-v="' + o[0] + '"' + (N.vis === o[0] ? " checked" : "") + '><span><b>' + t(o[1], { n: N.viewers }) + '</b><span class="tiny muted" style="display:block">' + t(o[2]) + "</span></span></label>"; }).join("") + "</div>";
    if (N.vis !== "some") return h + '<div class="tiny muted">' + t("nvPickOff") + "</div>";
    var P = S.nvp;
    if (!P || P.q !== (S.nvq || "") || P.only !== !!S.nvOnly) {
      if (!S.nvpLoading) { S.nvpLoading = true; var q = S.nvq || "", only = !!S.nvOnly; api("GET", "nova/people?q=" + encodeURIComponent(q) + (only ? "&only=1" : "")).then(function (r) { S.nvpLoading = false; if (r.ok) { r.q = q; r.only = only; S.nvp = r; } render(); }, function () { S.nvpLoading = false; }); }
    }
    h += '<div class="card"><div class="nbtop"><h2>' + t("nvPickT") + '</h2><span class="small muted">' + t("nvPicked", { n: N.viewers }) + "</span></div>" +
      '<input type="search" id="nvq" data-a="nvQ" aria-label="' + esc(t("nvSearch")) + '" placeholder="' + esc(t("nvSearch")) + '" value="' + esc(S.nvq || "") + '">' +
      '<div class="chiprow" style="padding:0">' + [["0", "nvFAll"], ["1", "nvFOn"]].map(function (o) { return '<button type="button" class="chip" data-a="nvOnly" data-v="' + o[0] + '" aria-pressed="' + (!!S.nvOnly === (o[0] === "1")) + '">' + t(o[1]) + "</button>"; }).join("") + "</div>";
    if (!P) h += '<div class="muted small">' + t("loading") + "</div>";
    else P.items.forEach(function (x) {
      h += '<label class="nvrow"><input type="checkbox" data-a="nvPick" data-v="' + esc(x.id) + '"' + (x.on ? " checked" : "") + '><span><b>' + (x.nova ? SPARK + " " : x.star ? starSvg(x.gender, 14) + " " : roleMark(x.role)) + esc(x.nick || "—") + '</b><span class="tiny muted" style="display:block">' + esc(who(x)) + "</span></span></label>";
    });
    if (P && P.more) h += '<div class="tiny muted">' + t("nvMore", { n: P.more }) + "</div>";
    return h + '<div class="tiny muted">' + t("nvPickNote") + "</div></div>";
  }

  Object.assign(A, {
    chatOpen: function (el) { chatOpen(el.dataset.v); window.scrollTo(0, 0); },
    chatClose: function () { S.chat = null; clearInterval(chatTimer); if (S.me.nova) S.nchats = null; render(); },
    chatSend: function () {
      var ta = document.getElementById("chText"), text = ta ? ta.value : "";
      if (!text.trim() || S.busy || !S.chat) return;
      S.busy = true; S.err = "";
      api("POST", "chat/send", { c: S.chat.id, text: text }).then(function (r) {
        S.busy = false;
        if (!r.ok) { S.err = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); return render(); }
        S.chat.text = ""; chatLoad();
      }, function () { S.busy = false; S.err = t("netErr"); render(); });
    },
    chatDel: function () {
      var C = S.chat; if (!C || !C.data) return;
      confirm2(t("chDel1", { nick: C.data.chat.user.nick }), t("chDel2"), function () {
        api("POST", "chat/delete", { c: C.id }).then(function (r) { if (r.ok) { S.chat = null; S.nchats = null; S.me.nova.chats = Math.max(0, (S.me.nova.chats || 1) - 1); render(); } });
      });
    },
    nvVis: function (el) { novaSave({ vis: el.dataset.v }); },
    nvOnly: function (el) { S.nvOnly = el.dataset.v === "1"; S.nvp = null; render(); },
    nvPick: function (el) {
      var on = el.checked, id = el.dataset.v;
      (S.nvp && S.nvp.items || []).forEach(function (x) { if (x.id === id) x.on = on; });
      novaSave(on ? { add: [id] } : { remove: [id] });
    },
  });
  /* ===== app-src/07-my-profile.js — «Профиль»: sub-tabs, invites tab + QR, ready card, star tab + links, theme.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */
  /* owner, 2026-10-27: «Профиль» — sub-tabs «Обо мне · Чек-лист · Видимость · Настройки» (+ «Звезда» for a star); tabs that
     do not fit go to a second row; a missing field is a red banner, a red row and a red dot on its tab */
  var CHEV = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  var PLUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  /** a row: a small label above the value; `bad` = not filled in (red, «+») */
  var PS_OPTS = { looking: ["sessions", "relationship", "friends", "meetups", "looking"], show: ["man", "woman", "other"] };
  var PS_KEY = { looking: "lf_", seeking: "sk_", show: "sh_" }, PS_TITLE = { looking: "lblLooking", seeking: "lblSeeking", show: "showMe" };
  /** the sheet: chips; for «Показывать мне» also the age range on one slider with two thumbs */
  function psSheet() {
    var P = S.ps, opts = P.k === "seeking" ? SEEKING : PS_OPTS[P.k];
    var h = '<div class="modal-bg sheet" data-a="psClose"><div class="modal card sheetbox" data-a="noop" role="dialog" aria-modal="true" aria-labelledby="psh"><span class="grab" aria-hidden="true"></span>' +
      '<h2 id="psh">' + t(PS_TITLE[P.k]) + '</h2><div class="tiny muted">' + t("lblMany") + "</div>";
    h += '<div class="chips">' + opts.map(function (v) { var on = P.sel.indexOf(v) >= 0; return '<button type="button" class="chip" data-a="psPick" data-v="' + v + '" aria-pressed="' + on + '">' + esc(t(PS_KEY[P.k] + v)) + "</button>"; }).join("") + "</div>";
    if (P.k === "seeking") h += '<div class="tiny muted">' + t("seekingNote") + "</div>";
    if (P.k === "show") {
      var lo = Math.min(P.amin, P.amax), hi = Math.max(P.amin, P.amax);
      h += '<div class="tiny muted">' + t("showNote") + "</div>" +
        '<div class="distbox"><div class="dtop"><span class="lbl">' + t("ages") + '</span><b id="psages">' + lo + "–" + hi + "</b></div>" +
        '<div class="dual" style="--lo:' + ((lo - 18) / 81 * 100) + "%;--hi:" + ((hi - 18) / 81 * 100) + '%"><i class="dtrack" aria-hidden="true"></i>' +
        '<input type="range" min="18" max="99" step="1" value="' + lo + '" data-a="psAge" data-x="min" aria-label="' + esc(t("from")) + '"' + (lo >= 90 ? ' style="z-index:2"' : "") + ">" +
        '<input type="range" min="18" max="99" step="1" value="' + hi + '" data-a="psAge" data-x="max" aria-label="' + esc(t("to")) + '"></div>' +
        '<div class="dticks" aria-hidden="true"><span>18</span><span>99</span></div></div><div class="tiny muted">' + t("twoWay") + "</div>";
    }
    if (S.err) h += '<div class="small" role="alert" style="color:var(--danger)">' + esc(S.err) + "</div>";
    return h + '<div class="decide"><button type="button" class="btn" data-a="psClose">' + t("cancel") + '</button><button type="button" class="btn primary" data-a="psSave"' + (S.busy ? " disabled" : "") + ">" + t("save") + "</button></div></div></div>";
  }
  /** the two thumbs follow the finger without redrawing; they never cross (the moving one stops at the other) */
  /** mockup M3: «Возраст 25 — 40» on one slider right in «Видимость»; saved when the finger is lifted */
  function ageInline(p) {
    var V = S.va || (S.va = { amin: p.age_min || 18, amax: p.age_max || 99 });
    if (!S.vaBusy) { V.amin = p.age_min || 18; V.amax = p.age_max || 99; }
    var lo = V.amin, hi = V.amax;
    return '<div class="ageline"><div class="dtop"><span class="pl">' + t("rowAges") + '</span><b id="vaages">' + lo + " — " + hi + "</b></div>" +
      '<div class="dual" style="--lo:' + ((lo - 18) / 81 * 100) + "%;--hi:" + ((hi - 18) / 81 * 100) + '%"><i class="dtrack" aria-hidden="true"></i>' +
      '<input type="range" min="18" max="99" step="1" value="' + lo + '" data-a="vaAge" data-x="min" aria-label="' + esc(t("from")) + '"' + (lo >= 90 ? ' style="z-index:2"' : "") + ">" +
      '<input type="range" min="18" max="99" step="1" value="' + hi + '" data-a="vaAge" data-x="max" aria-label="' + esc(t("to")) + '"></div>' +
      '<div class="dticks" aria-hidden="true"><span>18</span><span>99</span></div></div>';
  }
  function vaAge(el, done) {
    var V = S.va; if (!V) return;
    var v = +el.value;
    if (el.dataset.x === "min") { if (v > V.amax) { v = V.amax; el.value = v; } V.amin = v; } else { if (v < V.amin) { v = V.amin; el.value = v; } V.amax = v; }
    var box = el.parentNode, out = document.getElementById("vaages");
    box.style.setProperty("--lo", ((V.amin - 18) / 81 * 100) + "%"); box.style.setProperty("--hi", ((V.amax - 18) / 81 * 100) + "%");
    if (out) out.textContent = V.amin + " — " + V.amax;
    if (!done) return;
    var p = S.me.profile; if (V.amin === p.age_min && V.amax === p.age_max) return;
    S.vaBusy = true; save("profile", { age_min: V.amin, age_max: V.amax }, function () { S.vaBusy = false; });
    setTimeout(function () { S.vaBusy = false; }, 4000);
  }
  function psAge(el) {
    var P = S.ps; if (!P) return;
    var v = +el.value;
    if (el.dataset.x === "min") { if (v > P.amax) { v = P.amax; el.value = v; } P.amin = v; } else { if (v < P.amin) { v = P.amin; el.value = v; } P.amax = v; }
    var box = el.parentNode, out = document.getElementById("psages");
    box.style.setProperty("--lo", ((P.amin - 18) / 81 * 100) + "%"); box.style.setProperty("--hi", ((P.amax - 18) / 81 * 100) + "%");
    if (out) out.textContent = P.amin + "–" + P.amax;
    var mn = box.querySelector('[data-x="min"]'); if (mn) mn.style.zIndex = P.amin >= 90 ? 2 : "";   // both thumbs at the right end: the «от» one stays reachable
  }
  function prow(act, v, label, value, sub, bad) {
    return '<button type="button" class="prw' + (bad ? " bad" : "") + '" data-a="' + act + '"' + (v ? ' data-v="' + v + '"' : "") + '><span class="pmain"><span class="pl">' + label + '</span><span class="pv">' + value + "</span>" +
      (sub ? '<span class="ps">' + sub + "</span>" : "") + "</span>" + (bad ? PLUS : CHEV) + "</button>";
  }
  function cap1(x) { x = String(x || ""); return x.charAt(0).toUpperCase() + x.slice(1); }
  function pchips(list) { return '<span class="pchips">' + list.map(function (x) { return '<span class="pchip">' + esc(x) + "</span>"; }).join("") + "</span>"; }
  function sw(act, v, on, title, sub, label) {
    return '<label class="srow2"><span class="pmain"><span class="st">' + title + "</span>" + (sub ? '<span class="ps">' + sub + "</span>" : "") + '</span><input class="switch" type="checkbox" data-a="' + act + '"' + (v ? ' data-v="' + v + '"' : "") + (on ? " checked" : "") + ' aria-label="' + esc(label || String(title).replace(/<[^>]+>/g, "")) + '"></label>';
  }
  function missing(p) {
    var m = [];
    if (!String(p.nick || "").trim()) m.push(["nick", t("rowNick")]);
    if (!(p.seeking || []).length) m.push(["seeking", t("rowSeeking")]);
    if (!String(p.about || "").trim()) m.push(["about", t("rowAbout")]);
    return m;
  }
  function vMyProfile() {
    var p = S.me.profile, c = S.me.checklist, loc = S.me.location, miss = missing(p);
    if (S.pTab === "card" || !S.pTab) S.pTab = "about";
    if (S.pTab === "star" && !p.star) S.pTab = "about";
    var h = '<div class="top" style="flex-direction:row;justify-content:space-between;align-items:center"><h1>' + t("myProfile") + '</h1><span class="vchip' + (p.paused ? " off" : "") + '"><i aria-hidden="true"></i>' + t(p.paused ? "pausedNow" : "visibleNow") + "</span></div>";
    var tabs = [["about", "ptAbout"], ["checklist", "ptChecklist"], ["vis", "ptVis"], ["settings", "ptSettings"], ["invites", "ptInvites"]];   // owner, 2026-10-31: «Приглашения»
    if (p.star) tabs.push(["star", "ptStar"]);
    if (S.me.nova) tabs.push(["nova", "ptNova"]);   // owner, 2026-10-31
    // owner, 2026-11-07: every sub-tab on view, never scrolled sideways — 4 in a row, the rest under a gradient line
    h += '<nav class="ptabs" aria-label="' + esc(t("myProfile")) + '">' + tabs.map(function (o, i) {
      return (i === 4 ? '<i class="prow2" aria-hidden="true"></i>' : "") + '<button type="button" class="ptab' + (o[0] === "star" ? " gold" : o[0] === "nova" ? " novat" : "") + '" data-a="pTab" data-v="' + o[0] + '"' + (S.pTab === o[0] ? ' aria-current="page"' : "") + ">" +
        (o[0] === "star" ? starSvg(p.gender, 16) + " " : o[0] === "nova" ? "✦ " : "") + t(o[1]) + (o[0] === "about" && miss.length ? '<i class="pdot" role="img" aria-label="' + esc(t("missDot")) + '"></i>' : "") + "</button>"; }).join("") + "</nav>";
    h += '<div class="body">';
    if (S.me.hidden_until) h += '<div class="card warn small">' + (S.me.hidden_until > 2000000000 ? t("heldByMod") : t("hiddenByMod", { date: fmtDate(S.me.hidden_until) })) + "</div>";
    if (S.pTab === "about") {
      if (miss.length) h += '<div class="card missbox" role="alert"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 7v6M12 16.5v.5"/></svg>' +
        '<span class="pmain"><b>' + esc(t("missOne", { f: miss.map(function (x) { return x[1]; }).join("», «") })) + '</b><span class="small muted">' + t("missX") + '</span></span><button type="button" class="btn primary" data-a="editPart" data-v="' + miss[0][0] + '">' + t("missBtn") + "</button></div>";
      // the card as neighbours see it (distance and percent are each viewer's own)
      var me = { id: "", nick: p.nick, gender: p.gender, age_bucket: p.age_bucket, role: c && c.role, experience: c && c.experience, band: loc ? String(loc.radius) : "3",
        chats: S.me.chats.filter(function (x) { return x.show; }).map(function (x) { return x.title; }), space: !S.me.chats.length && S.me.space, themes: [], pct: null, pending: false, preview: true, about: p.about_public && !p.about_hidden ? p.about : "", ready: !!p.ready_until, interests: [], looking_for: [], star: p.star && p.star.show ? { caption: p.star.caption } : null, answered: c && c.answered, cols: c && c.ans_top != null ? { top: c.ans_top, bottom: c.ans_bottom } : null };
      h += '<div class="psh">' + t("previewTitle") + '</div><div class="preview' + (p.ready_until ? " rdy" : "") + '">' + nbCard(me).replace('data-a="openPerson"', 'data-a="noop"') + '</div><div class="tiny muted">' + t("previewNote") + "</div>";
      h += readyCard(p);
      h += '<div class="card plist">';
      // owner, 2026-11-07: the nick — a row like the others; a tap turns it into a field right here
      if (S.nickEdit) {
        var nv = S.form.nickIn != null ? S.form.nickIn : (p.nick || "");
        h += '<div class="prw nickrow"><label class="pmain"><span class="pl">' + t("rowNick") + '</span><input type="text" id="nickin" maxlength="30" autocomplete="off" data-f="nickIn" value="' + esc(nv) + '" placeholder="' + esc(t("rowEmpty")) + '"></label>' +
          '<button type="button" class="btn sm primary" data-a="nickSave"' + (S.busy ? " disabled" : "") + ">" + t("txSaveShort") + "</button></div>";
      } else h += prow("nickEdit", "", t("rowNick"), p.nick ? esc(p.nick) : t("rowAdd"), "", !p.nick);
      h += prow("editConsent", "", t("rowAgeG"), esc((p.age_exact ? p.age : p.age_bucket || "") + " · " + t("g_" + p.gender)), t(p.age_exact ? "rowAgeExact" : "rowAgeGroup"));
      h += prow("fillOpen", "", t("rowRole"), c ? esc([t("r_" + (c.role || "none")), c.experience ? t("x_" + c.experience) : "", c.relation ? t("l_" + c.relation) : ""].filter(Boolean).join(" · ")) : t("fromChecklist"), t("rowFromCl"));
      h += prow("psOpen", "looking", t("rowLooking"), esc(cap1(p.looking_for.map(function (v) { return t("lf_" + v).toLowerCase(); }).join(", "))));
      h += (p.seeking || []).length ? prow("psOpen", "seeking", t("rowSeeking"), esc(cap1(seekLine(p.seeking)))) : prow("psOpen", "seeking", t("rowSeeking"), t("rowAdd"), "", true);
      h += p.about ? prow("editPart", "about", t("rowAbout") + '<span class="badge' + (p.about_hidden ? " bad" : "") + '">' + t(p.about_hidden ? "aboutHiddenBadge" : p.about_public ? "shownBefore" : "hidden") + "</span>",
          '<span class="ptext">' + esc(p.about) + "</span>", p.about_hidden ? '<span style="color:var(--danger)">' + t("aboutHiddenNote") + "</span>" : "")
        : prow("editPart", "about", t("rowAbout"), t("rowAdd"), "", true);
      h += intsRow();   // owner, 2026-10-28
      h += "</div>";
      return h + errLine() + "</div>";
    }
    if (S.pTab === "checklist") {
      if (c) {
        var pc = c.total ? Math.round(c.answered / c.total * 100) : 0;
        h += '<div class="card glowcard"><div class="nbtop"><span><b class="serif" style="font-size:28px">' + c.answered + '</b> <span class="small muted">' + t("clCount", { total: c.total }) + '</span></span><span class="tiny muted">' + t("clUpd", { date: fmtDate(c.updated_at) }) + "</span></div>" +
          '<div class="fbar"><i style="width:' + Math.max(2, pc) + '%"></i></div><div class="small muted" style="line-height:1.45">' + t("clHint") + "</div>" +
          (S.me.draft ? '<div class="card warn small">' + t("draftWarn", { n: S.me.draft.answered }) + "</div>" : "") +
          '<button type="button" class="btn primary fillbtn" data-a="fillOpen">' + PEN + " " + t("clEdit") + "</button></div>";
      }
      // mockup M2: plain rows under the block
      h += '<div class="card plist">' + (c ? prow("starsOpen", "", "✦ " + t("starsBtn").replace(/^✦\s*/, ""), t("starsShort")) : "") + prow("editChecklist", "", t("linkPaste"), t("linkPasteShort")) + "</div>";
      return h + errLine() + "</div>";
    }
    if (S.pTab === "vis") {
      h += '<div class="card plist">' + sw("toggle", "paused", p.paused, t("pauseL"), t("pauseShort")) + "</div>";
      h += '<h2 class="sec">' + t("secShowMe") + '</h2><div class="card plist">' +
        '<button type="button" class="prw gchips" data-a="psOpen" data-v="show" aria-label="' + esc(t("rowGenders")) + '"><span class="chips">' + p.show_genders.map(function (v) { return '<span class="chip on">✓ ' + esc(t("sh_" + v)) + "</span>"; }).join("") + "</span>" + CHEV + "</button>" +
        ageInline(p) + '<div class="tiny muted">' + t("twoWay") + "</div></div>";
      var um = uniMine();
      h += '<h2 class="sec">' + t("secWhere") + '</h2><div class="card plist">';
      if (S.me.chats.length) { h += '<div class="tiny muted" style="padding:12px 16px 0;font-weight:600">' + t("rowChats") + "</div>"; S.me.chats.forEach(function (ch) { h += sw("chatShow", esc(ch.id), ch.show, "«" + esc(ch.title) + "»", ""); }); }
      if (um) h += sw("uniSw", "", um.on, t("uniTitle"), t("uniShort"));
      h += sw("spaceSw", "", S.me.space, t("spaceTitle"), t("spaceShort"));
      h += sw("toggle", "compare_before_yes", p.compare_before_yes, t("compare"), t("compareShort"));
      h += "</div>";
      if (loc) h += '<h2 class="sec">' + t("secPlace") + '</h2><div class="card plain"><div class="small" style="line-height:1.5">' + t("placeShort") + '</div><div class="lbl">' + t("precisionTitle") + '</div><div class="seg" style="padding:0;margin:0">' + [[1, "r1"], [3, "r3"]].map(function (o) {
          return '<button type="button" data-a="precision" data-v="' + o[0] + '" aria-pressed="' + (loc.radius === o[0]) + '">' + t(o[1]) + "</button>"; }).join("") + "</div>" +
        '<button type="button" class="btn out" data-a="editPlace">' + t("canChange") + '</button><div class="tiny muted">' + (loc.next_change_at ? t("nextChange", { date: fmtDate(loc.next_change_at) }) : t("changeFree")) + "</div></div>";
      return h + errLine() + "</div>";
    }
    if (S.pTab === "star") return h + myStarTab(p) + errLine() + "</div>";
    if (S.pTab === "invites") return h + invitesTab() + errLine() + "</div>";
    if (S.pTab === "nova" && S.me.nova) return h + novaTab(p) + errLine() + "</div>";
    // settings
    h += '<h2 class="sec" style="margin-top:0">' + t("secNotify") + '</h2><div class="card plist">' + sw("notifyLikes", "", S.me.notify_likes, t("likesL"), t("likesShort")) + sw("digest", "", S.me.digest, t("digestTitle"), t("digestShort")) + "</div>";
    h += '<h2 class="sec">' + t("secApp") + '</h2><div class="card plain">' + themeRow() + '<div class="field"><span class="lbl">' + t("lang") + '</span><div class="seg" style="padding:0;margin:0">' +
      [["ru", "Русский"], ["en", "English"]].map(function (o) { return '<button type="button" data-a="lang" data-v="' + o[0] + '" aria-pressed="' + (S.lang === o[0]) + '">' + o[1] + "</button>"; }).join("") + "</div></div></div>";
    h += '<h2 class="sec">' + t("secAbout") + '</h2><div class="card plist">' + prow("page", "about", "", t("abLink")) + prow("openSite", "", "", t("siteKs")) + "</div>";
    // owner, 2026-11-07: the copy on this phone, next to deleting the account; two questions before clearing
    var ps = phoneSize();
    h += '<div class="card delrow phone"><span class="pmain"><b>' + t("phoneT") + '</b><span class="ps">' + (ps ? t("phoneX", { kb: Math.max(1, Math.round(ps / 1024)) }) : t("phoneNone")) + '</span></span><button type="button" class="btn" data-a="phoneClear"' + (ps ? "" : " disabled") + ">" + t("phoneBtn") + "</button></div>";
    h += '<div class="card delrow"><span class="pmain"><b>' + t("del") + '</b><span class="ps">' + t("delShort") + '</span></span><button type="button" class="btn" data-a="delete">' + t("delBtn") + "</button></div>";
    h += '<div class="tiny muted center">' + t("aVersion", { v: esc(S.me.version || "") }) + "</div>";
    return h + errLine() + "</div>";
  }
  /** owner, 2026-10-26: «Готова / Готов / Готовы к встрече» for 7 days */
  /** owner, 2026-10-31: the personal link, the messages it earned, the invitees */
  function invitesTab() {
    // owner, 2026-10-31: light — the balance is already in /api/me; the list comes from /api/invites (no Telegram call);
    // the personal code is made only on the first «Поделиться» / «Копировать» / «QR-код» (POST /api/invite-link)
    var w = S.me.msgs || { balance: 0, earned: 0 }, I = S.inv;
    if (!I && !S.invLoading) {
      S.invLoading = true;
      api("GET", "invites").then(function (r) { S.invLoading = false; S.inv = r.ok ? r : { err: 1 }; if (S.tab === "profile" && S.pTab === "invites") render(); },
        function () { S.invLoading = false; S.inv = { err: 1 }; render(); });
    }
    // owner, 2026-11-02: first what it is — the person's own card as the other one sees it after a like, with a message
    var p = S.me.profile || {}, c = S.me.checklist || {};
    var sample = { sample: true, id: "", nick: p.nick, gender: p.gender, age_bucket: p.age_bucket, role: c.role, experience: c.experience, relation: c.relation,
      looking_for: p.looking_for || [], seeking: p.seeking || [], about: p.about_public ? p.about : "", ready: !!p.ready_until,
      star: p.star && p.star.show ? { caption: p.star.caption || "" } : null, nova: !!S.me.nova, msg_in: { text: t("invDemoMsg"), at: Math.floor(Date.now() / 1000) } };
    var h = '<div class="card invhero"><h2 class="ihT">' + t("invHeroT") + '</h2><div class="ihX">' + t("invHeroX") + "</div>" +
      '<div class="ihShot" aria-hidden="true" inert>' + nbCard(Object.assign({ chats: [], themes: [], interests: [], preview: true, pct: null, band: "1" }, sample)).replace('data-a="openPerson"', 'data-a="noop"').replace(/<\/button>$/, "") +   // mockup M5: the list card + their message
        '<div class="msgbox"><div class="msghead"><span>' + t("msgIn") + '</span></div><div class="msgtext">' + esc(t("invDemoMsg")) + "</div></div></button>" + '</div><div class="ihCap">' + t("invHeroCap") + "</div>" +
      '<div class="ihBal">' + (w.unlimited ? "<b>∞</b><span><i>" + t("invUnlimT") + "</i><small>" + t("invUnlimX") + "</small></span>"
        : "<b>" + w.balance + "</b><span><i>" + t("invLeft") + "</i><small>" + t("invLeftX", { n: 5 }) + "</small></span>") + "</div></div>";
    if (S.invNote) h += '<div class="card ok small" role="status">' + esc(S.invNote) + "</div>";
    // owner, 2026-11-07: ONE link — it opens my profile, and someone new who registers by it brings +5 messages
    var canInv = !(I && I.ok && !I.can), link = invLink(), off = (S.me.active ? false : !I || !I.ok || !canInv) || S.invBusy ? " disabled" : "";
    if (S.me.active || canInv) {
      h += '<div class="card invcard"><h2>' + t(S.me.active ? "invOneT" : "invGetT") + "</h2>" + (S.me.active ? '<div class="small muted">' + t("invOneX") + "</div>" : "") +
        (link ? '<input class="invlink" id="invlink" readonly aria-label="' + esc(t("invLinkT")) + '" value="' + esc(link) + '">' : "") +
        '<div class="three"><button type="button" class="btn primary" data-a="invShare"' + off + ">" + t("invShare") + '</button><button type="button" class="btn" data-a="invCopy"' + off + ">" + t("invCopy") +
        '</button><button type="button" class="btn" data-a="invQr"' + off + ">" + t("invQr") + "</button></div>" +
        (canInv && !w.unlimited ? '<div class="small">' + t("invGetX", { n: 5 }) + "</div>" : "") + '<div class="tiny muted">' + t(S.me.active ? "invOneNote" : "invLinkNote") + "</div>" +
        (S.me.active && S.plink ? '<button type="button" class="btn link" data-a="plRenew"' + (S.busy ? " disabled" : "") + ">" + t("plRenew") + '</button><div class="tiny muted">' + t("plRenewX") + "</div>" : "") + "</div>";
    }
    if (!canInv) h += '<div class="card warn"><b>' + t("invOffT") + '</b><div class="small">' + t("invOffX") + "</div></div>";
    h += '<div class="card list"><div class="ihead"><h2>' + t("invListT") + (I && I.items ? " · " + I.items.length : "") + "</h2>" + (w.earned ? '<span class="small muted">+' + w.earned + "</span>" : "") + "</div>";
    if (!I) return h + '<div class="small muted" style="padding:0 14px 14px">' + t("loading") + "</div></div>";
    if (I.err) return h + '<div class="small muted" style="padding:0 14px 6px">' + t("netErr") + '</div><button type="button" class="btn link" style="margin:0 14px 12px" data-a="invReload">' + t("retry") + "</button></div>";
    if (!I.items.length) h += '<div class="small muted" style="padding:0 14px 14px">' + t("invNoOne") + "</div>";
    I.items.forEach(function (x, i) {
      h += '<div class="irow"><span><b>' + esc(x.nick || t("invAnon", { n: I.items.length - i })) + '</b><span class="tiny muted">' + fmtDate(x.at) + '</span></span><span class="rst rs-' + x.status + '">' + t("rs_" + x.status, { n: 5 }) + "</span></div>";
    });
    return h + '<div class="tiny muted" style="padding:6px 14px 12px">' + t("invNickNote") + "</div></div>";
  }
  /** the personal link: the bot's name from /api/me (its «start=hi» link) + the code */
  function invLink() {
    if (S.me.active) { if (!S.plink) plinkAsk(); return S.plink ? S.plink.url : null; }   // owner, 2026-11-07: the profile link is the invite link
    var c = S.inv && S.inv.code, m = /^https:\/\/t\.me\/([A-Za-z0-9_]{3,64})\?/.exec(S.me.invite || "");
    return c && m ? "https://t.me/" + m[1] + "?start=r_" + c : null;
  }
  function invCopyGo(l) {
    var ok = function () { S.invNote = t("invCopied"); render(); setTimeout(function () { S.invNote = ""; render(); }, 2500); };
    var hand = function () { var f = document.getElementById("invlink"); if (f) { f.focus(); f.select(); } };   // no clipboard: the link is selected to copy by hand
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(l).then(ok, hand); else hand();
  }
  /** the code is made on the first use of the link, then `go(link)` */
  function withLink(go) {
    var l = invLink(); if (l) return go(l);
    if (S.invBusy) return;
    if (S.me.active) {   // the profile link: asked for once
      S.invBusy = true; render();
      return api("GET", "plink").then(function (r) { S.invBusy = false; if (r.ok) { S.plink = r; render(); go(r.url); } else { S.err = t("netErr"); render(); } }, function () { S.invBusy = false; S.err = t("netErr"); render(); });
    }
    S.invBusy = true; render();
    api("POST", "invite-link", {}).then(function (r) {
      S.invBusy = false;
      if (r.ok && S.inv) S.inv.code = r.code;
      render(); var l2 = invLink(); if (l2) go(l2); else { S.err = t("netErr"); render(); }
    }, function () { S.invBusy = false; S.err = t("netErr"); render(); });
  }
  var qrState = 0;   // 0 not loaded · 1 loading · 2 ready · 3 failed (vendor/qrcode, loaded only when the QR is opened)
  function qrModal() {
    var nm = (S.me.profile && S.me.profile.nick) || "";
    return '<div class="modal-bg qrbg" data-a="qrClose"><div class="modal card qrbox" data-a="noop" role="dialog" aria-modal="true" aria-label="' + esc(t("invQr")) + '"><span class="serif" style="font-size:22px">Kinkoverse</span>' +
      '<span class="small muted" style="text-align:center">' + t("qrTitle") + '</span><div class="qrsvg" id="qrsvg">' + (qrState === 3 ? '<span class="small muted">' + t("qrErr") + "</span>" : "") + "</div>" +
      (nm ? '<span class="small">' + esc(t("qrBy", { name: nm })) + "</span>" : "") + '<button type="button" class="btn" style="align-self:stretch" data-a="qrClose">' + t("close") + "</button></div></div>";
  }
  function qrPaint() {
    var box = document.getElementById("qrsvg"), link = invLink();
    if (!box || !link) return;
    if (!window.qrcode) {
      if (qrState === 0) { qrState = 1; var js = document.createElement("script"); js.src = "vendor/qrcode/qrcode.js?v=1"; js.onload = function () { qrState = 2; qrPaint(); }; js.onerror = function () { qrState = 3; render(); }; document.head.appendChild(js); }
      return;
    }
    try { var q = window.qrcode(0, "M"); q.addData(link); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true, alt: t("invQr") }); }
    catch (e) { box.innerHTML = '<span class="small muted">' + t("qrErr") + "</span>"; }
  }
  function readyWord(g) { return t(g === "woman" ? "readyF" : g === "man" ? "readyM" : "readyN"); }
  function readyCard(p) {
    var on = !!p.ready_until, left = on ? Math.max(1, Math.ceil((p.ready_until * 1000 - Date.now()) / 86400000)) : 0;
    return '<label class="card ready' + (on ? " on" : "") + '"><span class="rtop"><span class="rname"><i aria-hidden="true"></i>' + readyWord(p.gender) + '</span><input class="switch" type="checkbox" data-a="ready"' + (on ? " checked" : "") + "></span>" +
      '<span class="small muted">' + (on ? t("readyLeft", { n: left }) : t("readyOff")) + "</span></label>";
  }
  /** owner, 2026-10-27: «Звезда комьюнити» — only for someone the owner gave a star; the switch and the caption */
  function myStarCard(p) {
    var x = p.star; if (!x) return "";
    var cap = S.form.cstarCap != null ? S.form.cstarCap : x.caption;
    return '<div class="card cstarcard"><label class="rtop"><span class="rname">' + starSvg(p.gender, 22) + t("cstarL") + '</span><input class="switch" type="checkbox" data-a="cstarShow"' + (x.show ? " checked" : "") + "></label>" +
      '<span class="small muted" style="line-height:1.5">' + t("cstarText") + "</span>" +
      '<label class="field"><span class="lbl">' + t("cstarCapL") + '</span><input type="text" maxlength="25" autocomplete="off" data-a="cstarCap" class="' + (x.removed && !cap ? "bad" : "") + '" value="' + esc(cap) + '" placeholder="' + esc(t("cstarCapPh")) + '">' +
      '<span class="tiny muted" style="display:flex;justify-content:space-between;gap:8px"><span>' + t("cstarCapNote") + '</span><span id="cstarcount">' + Array.from(cap || "").length + " / 25</span></span>" +
      (x.removed && !cap ? '<span role="alert" class="small" style="color:var(--danger);line-height:1.45">' + t("cstarRemoved") + "</span>" : "") + "</label></div>";
  }
  /* owner, 2026-10-27: «Звезда» — the whole star in one tab: switch, caption, «Мероприятия и каналы», the map look */
  var TG_ICO = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><path d="M21 4 3 11l6 2 2 6 3-4 5 4z"/><path d="m9 13 8-6"/></svg>';
  var WEB_ICO = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>';
  var OUT_ICO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  function linkIco(l) {
    if (l.date) { var d = l.date.split("-"), m = new Date(Date.UTC(+d[0], +d[1] - 1, +d[2])).toLocaleDateString(S.lang === "en" ? "en-GB" : "ru-RU", { month: "short", timeZone: "UTC" }).replace(".", "");
      return '<span class="lico date"><b>' + (+d[2]) + "</b><em>" + esc(m) + "</em></span>"; }
    return '<span class="lico ' + (l.kind === "tg" ? "tg" : "web") + '">' + (l.kind === "tg" ? TG_ICO : WEB_ICO) + "</span>";
  }
  function hostOf(url) { try { var u = new URL(url); return (u.hostname.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname)).slice(0, 42); } catch (e) { return String(url).slice(0, 42); } }
  function dateLong(iso) { var d = iso.split("-"); return new Date(Date.UTC(+d[0], +d[1] - 1, +d[2])).toLocaleDateString(S.lang === "en" ? "en-GB" : "ru-RU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }); }
  /** neighbours' view: a gold block of buttons (never <a>: a tap is counted, then Telegram opens the link) */
  function linksBlock(links, max) {
    var list = max ? links.slice(0, max) : links;
    return list.map(function (l) {
      return '<button type="button" class="lrow" data-a="lnkOpen" data-v="' + l.id + '" data-u="' + esc(l.url) + '">' + linkIco(l) + '<span class="pmain"><b>' + esc(l.label) + '</b><span class="ps">' +
        esc([l.date ? dateLong(l.date) : t(l.kind === "tg" ? "lnkTg" : "lnkWeb"), hostOf(l.url)].join(" · ")) + "</span></span>" + OUT_ICO + "</button>"; }).join("");
  }
  function myStarTab(p) {
    var x = p.star, L = x.links || [];
    var h = '<div class="card cstarcard"><div class="rtop" style="justify-content:flex-start">' + starSvg(p.gender, 44) + '<span class="pmain"><b class="serif" style="font-size:20px">' + t("cstarTag") + '</b><span class="ps">' + t("starSince", { date: fmtDate(x.since) }) + "</span></span></div></div>";
    h += myStarCard(p);
    h += '<h2 class="sec">' + t(S.me.cal ? "secChannels" : "secLinks") + '</h2><div class="card warn small" style="line-height:1.5">' + t("linksWarn") + "</div>";
    if (L.length) h += '<div class="card plist">' + L.map(function (l) {
      var note = l.rejected ? '<span class="ps" style="color:var(--danger)">' + t("lnkRejected") + "</span>" : l.past ? '<span class="ps">' + t("lnkPast") + "</span>" : "";
      return '<div class="lrow own' + (l.rejected || l.past ? " dim" : "") + '">' + linkIco(l) + '<span class="pmain"><b>' + esc(l.label) + '</b><span class="ps">' + esc(hostOf(l.url)) + " · " + t("lnkClicks", { n: l.clicks }) + "</span>" + note + "</span>" +
        '<button type="button" class="iconbtn" data-a="lnkEdit" data-v="' + l.id + '" aria-label="' + esc(t("lnkEditT") + ": " + l.label) + '">' + PEN + "</button></div>" +
        (l.date && !l.past && S.me.cal && S.me.cal.create ? '<button type="button" class="btn link small" style="align-self:flex-start;padding:0 14px 8px" data-a="lnkToCal" data-v="' + l.id + '">' + t("lnkToCal") + " ›</button>" : ""); }).join("") + "</div>";
    if (S.lnk) h += linkForm();
    else if (L.length < 3) h += '<button type="button" class="btn goldline dashed" data-a="lnkNew">' + t("lnkAdd", { n: L.length }) + "</button>";
    var nick = p.nick || "";
    h += '<div class="lbl">' + t("onMapLook") + '</div><div class="mapprev"><span class="pm star g-' + (p.gender || "other") + '">' + starSvg(p.gender, 34) + '<span class="pmt"><span class="pmn">' + esc(nick) + "</span>" +
      (x.show && x.caption ? '<span class="pmc">' + esc(x.caption) + "</span>" : "") + "</span><b>—%</b></span></div>";
    if (!x.show) h += '<div class="tiny muted center">' + t("cstarL") + ": —</div>";
    return h;
  }
  function linkForm() {
    var f = S.form, id = S.lnk.id;
    var bf = function (k, lbl, ph, max) { return '<label><span class="tiny muted">' + t(lbl) + '</span><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="' + max + '" data-f="' + k + '" value="' + esc(f[k] || "") + '" placeholder="' + t(ph) + '"></label>'; };
    return '<div class="card cstarcard"><b>' + t(id ? "lnkEditT" : "lnkNew") + "</b>" +
      '<label class="field"><span class="lbl">' + t("lnkLabel") + '</span><input type="text" maxlength="35" autocomplete="off" data-f="lnkLabel" value="' + esc(f.lnkLabel || "") + '">' +
      '<span class="tiny muted" style="display:flex;justify-content:space-between;gap:8px"><span>' + t("lnkLabelNote") + '</span><span id="lnkcount">' + Array.from(f.lnkLabel || "").length + " / 35</span></span></label>" +
      '<label class="field"><span class="lbl">' + t("lnkUrl") + '</span><input type="text" inputmode="url" autocapitalize="off" spellcheck="false" autocomplete="off" data-f="lnkUrl" value="' + esc(f.lnkUrl || "") + '" placeholder="' + esc(t("lnkUrlPh")) + '"></label>' +
      (S.me.cal && !(f.lnkD || f.lnkM || f.lnkY) ? "" : '<div class="field"><span class="lbl">' + t("lnkDate") + ' <span class="muted" style="font-weight:400">' + t("lnkDateOpt") + '</span></span><div class="bdate">' + bf("lnkD", "bDay", "bDayPh", 2) + bf("lnkM", "bMonth", "bMonthPh", 2) + bf("lnkY", "bYear", "bYearPh", 4) +
      '</div><span class="tiny muted">' + t("lnkDateNote") + "</span></div>") + errLine() +
      '<div class="decide"><button type="button" class="btn" data-a="lnkCancel">' + t("cancel") + '</button><button type="button" class="btn gold" data-a="lnkSave"' + (S.busy ? " disabled" : "") + ">" + t("lnkSave") + "</button></div>" +
      (id ? '<button type="button" class="btn link" style="color:var(--danger)" data-a="lnkDel">' + t("lnkDel") + "</button>" : "") + "</div>";
  }
  function themeRow() {
    var cur = (S.me && S.me.theme) || "auto";
    return '<div class="field"><span class="lbl">' + t("themeL") + '</span><div class="seg" style="padding:0">' + [["auto", "themeAuto"], ["light", "themeLight"], ["dark", "themeDark"]].map(function (o) {
      return '<button type="button" data-a="setTheme" data-v="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + t(o[1]) + "</button>"; }).join("") + "</div></div>";
  }
  function row(act, label, value) {
    return '<button type="button" class="row" data-a="' + act + '"><span>' + label + '</span><span class="v">' + value + " ›</span></button>";
  }

  Object.assign(A, {
    editChecklist: function () { startEdit("checklist"); },
    editPart: function (el) {
      if (/^(looking|seeking|show)$/.test(el.dataset.v) && S.me.active && S.tab === "profile") return A.psOpen(el);   // 9.01: the short sheet
      if (el.dataset.v === "nick" && S.tab === "profile" && S.pTab === "about") return A.nickEdit();
      S.editPart = el.dataset.v; startEdit("profile");
    },
    editPlace: function () { startEdit("place"); },
    lnkToCal: function (el) {   // owner, 2026-10-29: a dated star link becomes a calendar event (the form, prefilled)
      var l = (S.me.profile.star.links || []).filter(function (x) { return String(x.id) === el.dataset.v; })[0];
      if (!l) return;
      S.tab = "cal"; render(); calLoad(function () { CAL.fromLink(l); });
    },
    phoneClear: function () { confirm2(t("phoneQ1"), t("phoneQ2"), function () { phoneClear(); pcache.list = {}; pcache.cmp = {}; render(); }); },
    // owner, 2026-11-07 (9.01): «Что ищу», «Кого ищу», «Показывать мне» — a short sheet over the profile, not a screen
    psOpen: function (el) {
      var p = S.me.profile, k = el.dataset.v;
      S.err = "";
      S.ps = { k: k, sel: (k === "looking" ? p.looking_for : k === "seeking" ? p.seeking : p.show_genders || []).slice(), amin: p.age_min || 18, amax: p.age_max || 99 };
      render();
    },
    psClose: function () { S.ps = null; S.err = ""; render(); },
    psPick: function (el) {
      var P = S.ps, v = el.dataset.v, i = P.sel.indexOf(v);
      if (i >= 0) P.sel.splice(i, 1); else P.sel.push(v);
      S.err = ""; render();
    },
    psSave: function () {
      var P = S.ps, b = {};
      if (!P) return;
      if (P.k !== "seeking" && !P.sel.length) { S.err = t("e_pick"); return render(); }
      if (P.k === "looking") b.looking_for = P.sel;
      if (P.k === "seeking") b.seeking = P.sel;
      if (P.k === "show") { b.show_genders = P.sel; b.age_min = Math.min(P.amin, P.amax); b.age_max = Math.max(P.amin, P.amax); }
      save("profile", b, function () { S.ps = null; });
    },
    nickEdit: function () { S.nickEdit = true; S.form.nickIn = null; render(); var f = document.getElementById("nickin"); if (f) { f.focus(); try { f.setSelectionRange(f.value.length, f.value.length); } catch (e) { /* old web view */ } } },
    nickSave: function () {
      var v = String(S.form.nickIn != null ? S.form.nickIn : "").trim();
      if (!v) { S.err = t("e_nick"); return render(); }
      if (v === (S.me.profile.nick || "")) { S.form.nickIn = null; S.nickEdit = false; return render(); }
      save("profile", { nick: v }, function () { S.form.nickIn = null; S.nickEdit = false; });
    },
    pTab: function (el) { S.pTab = el.dataset.v; S.err = ""; render(); },
    starsOpen: function () { starsShow(true); },
    precision: function (el) {
      var r = +el.dataset.v, loc = S.me.location;
      if (r === 1 && !loc.fine_ok) { S.form = { radius: 1 }; S.edit = "place"; S.err = t("e_need_point"); render(); return; }
      save("settings", { radius: r });
    },
    invReload: function () { S.inv = null; render(); },
    invShare: function () {
      withLink(function (l) {
        var u = "https://t.me/share/url?url=" + encodeURIComponent(l) + "&text=" + encodeURIComponent(t("invShareText"));
        if (tg && tg.openTelegramLink) tg.openTelegramLink(u); else window.open(u, "_blank");
      });
    },
    invCopy: function () { withLink(invCopyGo); },
    invQr: function () { withLink(function () { S.qr = true; render(); }); },
    qrClose: function () { S.qr = false; render(); },
    setTheme: function (el) { S.me.theme = el.dataset.v; theme(); render(); api("POST", S.me.admin ? "settings" : "settings", { theme: el.dataset.v }); },
    // owner, 2026-10-26: switching on explains what it means and does, and asks first
    ready: function (el) {
      var on = el.checked;
      if (!on) return save("profile", { ready: false });
      var q = t("readyAsk", { badge: readyWord(S.me.profile.gender) });
      var go = function (yes) { if (yes) save("profile", { ready: true }); else { el.checked = false; render(); } };
      askYes(q, go);
    },
    lnkNew: function () { S.lnk = { id: 0 }; S.err = ""; S.form.lnkLabel = ""; S.form.lnkUrl = ""; S.form.lnkD = ""; S.form.lnkM = ""; S.form.lnkY = ""; render(); },
    lnkEdit: function (el) {
      var l = ((S.me.profile.star || {}).links || []).filter(function (x) { return String(x.id) === el.dataset.v; })[0]; if (!l) return;
      var d = (l.date || "").split("-");
      S.lnk = { id: l.id }; S.err = ""; S.form.lnkLabel = l.label; S.form.lnkUrl = l.url; S.form.lnkY = d[0] || ""; S.form.lnkM = d[1] || ""; S.form.lnkD = d[2] || ""; render();
    },
    lnkCancel: function () { S.lnk = null; S.err = ""; render(); },
    lnkSave: function () {
      var f = S.form, date = "";
      if (f.lnkD || f.lnkM || f.lnkY) {
        date = dotsToIso((f.lnkD || "") + "." + (f.lnkM || "") + "." + (f.lnkY || new Date().getFullYear()));
        if (!date) { S.err = t("e_link_date"); return render(); }
      }
      save("star-links", { action: S.lnk.id ? "edit" : "add", id: S.lnk.id || undefined, label: f.lnkLabel || "", url: f.lnkUrl || "", date: date }, function () { S.lnk = null; });
    },
    lnkDel: function () {
      var id = S.lnk && S.lnk.id; if (!id) return;
      var go = function (yes) { if (yes) save("star-links", { action: "delete", id: id }, function () { S.lnk = null; }); };
      askYes(t("lnkDel") + "?", go);
    },   // owner, 2026-11-02
    lnkOpen: function (el) {   // the count first (fire and forget), then Telegram opens it
      try { api("POST", "link-click", { id: +el.dataset.v }).catch(function () { /* fine */ }); } catch (e) { /* fine */ }
      var u = el.dataset.u;
      if (/^https:\/\/(t\.me|telegram\.me)\//i.test(u) && tg && tg.openTelegramLink) tg.openTelegramLink(u);
      else if (tg && tg.openLink) tg.openLink(u); else window.open(u, "_blank", "noopener");
    },
    cstarShow: function (el) { save("settings", { star_show: !!el.checked }); },
    cstarCap: function (el) { var v = el.value; S.form.cstarCap = null; if (v !== ((S.me.profile.star || {}).caption || "")) save("settings", { star_caption: v }); },
    lang: function (el) { setLang(el.dataset.v); save("settings", { lang: el.dataset.v }); },
    // owner, 2026-10-26: two confirmations — Telegram's dialog, then a window where «Да» / «Yes» is typed
    delete: function () {
      var go = function (yes) { if (yes) { S.delAsk = true; S.form.delWord = ""; S.err = ""; render(); var i = app.querySelector('[data-f="delWord"]'); if (i) i.focus(); } };
      askYes(t("delConfirm"), go);
    },
  });
  /* ===== app-src/07b-plink.js — the personal profile link (owner, 2026-11-07): the block in «Профиль → Обо мне» and what
     opens from https://t.me/<bot>?start=p_<code> (the bot answers with a button to ?p=<code>, or the Mini App gets
     start_param p_<code>).
     - the server says «full» when the viewer would see this person anyway → their page opens;
     - otherwise a teaser (P10c): nick, age, role, the top 3 groups with %, 2 interests, the start of «О себе»; the rest is
       blurred (made-up shapes, no data). Someone not registered yet scrolls down straight into registration step 1
       (P10d — the full step 1 with the map and the open-space count); scrolling up shows the teaser again until they go on;
     - an old or unknown link: a short note.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  function plinkCode() {
    var sp = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param, m = sp && /^p_([a-z2-9]{8})$/.exec(sp), q = /[?&]p=([a-z2-9]{8})/.exec(location.search);
    return (m && m[1]) || (q && q[1]) || null;
  }
  /** after /api/me: open the link once per start */
  function plinkStart(r) {
    var code = plinkCode();
    if (!code || S.usedP || r.admin || r.banned || r.deleted) return;
    S.usedP = true;
    api("GET", "plink/open?c=" + code).then(function (x) {
      if (!x.ok) { S.tz = { gone: true, busy: x.error === "too_many" }; return render(); }
      if (x.mode === "full") { S.tzWant = x.id; plinkFull(); return; }
      if (x.self) { S.tab = "profile"; S.pTab = "about"; render(); return; }   // their own link: their profile
      S.tz = x.teaser; if (x.teaser.interests.length && !CAT) loadCat();
      render(); window.scrollTo(0, 0);
    }, function () { /* no link screen; the app works as usual */ });
  }
  /** the person's page as soon as the list is in */
  function plinkFull() {
    var id = S.tzWant; if (!id) return;
    if (!S.nb || S.nbOld) return;   // loadNeighbours calls this again with the fresh list
    S.tzWant = null;
    if (nbFind(id)) { S.tab = "neighbours"; A.openPerson({ dataset: { v: id } }); }
    else { S.tz = { gone: true }; render(); }
  }
  var BLUR_ROWS = [62, 48, 40, 31];   // made-up bar lengths under the blur — no data of anyone
  function teaserBlock(T, reg) {
    // mockup P10c: centred, on the free page — the nick, «приглашает…», the bars, two interests, the start of «О себе»
    var h = '<section class="tzwrap' + (reg ? " reg" : "") + '" aria-label="' + esc(t("tzAria")) + '"><div class="body"><div class="tzcard">' +
      '<div class="tznick">' + roleMark(T.role) + esc(T.nick || t("g_" + T.gender)) + "</div>" +
      '<div class="small muted tzsub">' + esc([t("g_" + T.gender), T.age_bucket, t("r_" + (T.role || "none"))].filter(Boolean).join(" · ")) + "</div>" +
      '<div class="small muted tzsub">' + t("tzInvites") + "</div>";
    if (T.groups.length) h += '<div class="pbars">' + T.groups.map(function (g) {
      return '<div class="pbar"><span>' + esc(g.name) + '</span><i><b style="width:' + g.pct + '%"></b></i><span>' + g.pct + "%</span></div>"; }).join("") + "</div>";
    h += '<div class="pbars tzblur" aria-hidden="true">' + BLUR_ROWS.map(function (w) { return '<div class="pbar"><span>████████████</span><i><b style="width:' + w + '%"></b></i><span>' + w + "%</span></div>"; }).join("") +
      '<div class="tzfade"></div></div>';
    if (T.interests.length && CAT) h += '<div class="tags tzints">' + T.interests.map(function (x) { return itag(x, " on"); }).join("") + "</div>";
    if (T.about) h += '<p class="about tzabout">«' + esc(T.about) + "»</p>";
    h += '<div class="tzcta"><b>' + t("tzCta") + "</b>" + (reg ? '<span class="tzdown" aria-hidden="true">↓</span>' : "") + "</div></div>";
    if (!reg) h += '<div class="small muted">' + t("tzNoSee") + '</div><button type="button" class="btn" data-a="tzClose">' + t("close") + "</button>";
    return h + "</div></section>";
  }
  /** an active participant who does not see this person (filters, other chats): the teaser and a way back */
  function vTeaserOnly() {
    return '<div class="backrow"><button type="button" data-a="tzClose" aria-label="' + t("back") + '">‹</button></div>' + teaserBlock(S.tz, false);
  }
  function vTeaserGone() {
    return '<div class="body"><div class="free"><h2>' + t(S.tz.busy ? "tzBusyT" : "tzGoneT") + '</h2><div class="muted">' + t(S.tz.busy ? "tzBusyX" : "tzGoneX") + '</div><button type="button" class="btn primary" data-a="tzClose">' + t("ok") + "</button></div></div>";
  }

  /* ---------- «Ссылка на мою анкету» in «Профиль → Обо мне» ---------- */
  function plinkAsk() { if (!S.plinkAsk) { S.plinkAsk = true; api("GET", "plink").then(function (r) { S.plinkAsk = false; if (r.ok) { S.plink = r; render(); } }, function () { S.plinkAsk = false; }); } }
  function myLinkCard() {
    var L = S.plink;
    if (!L) plinkAsk();
    var h = '<div class="card plcard"><b>' + t("plT") + '</b><div class="small muted">' + t("plX") + "</div>";
    if (!L) return h + '<div class="muted small">' + t("loading") + "</div></div>";
    h += '<div class="plurl" id="plurl">' + esc(L.url) + "</div>" +
      '<div class="two"><button type="button" class="btn" data-a="plCopy">' + t(S.plCopied ? "plCopied" : "plCopy") + '</button><button type="button" class="btn primary" data-a="plShare">' + t("plShare") + "</button></div>" +
      '<button type="button" class="btn link" data-a="plRenew"' + (S.busy ? " disabled" : "") + ">" + t("plRenew") + '</button><div class="tiny muted">' + t("plRenewX") + "</div>";
    return h + "</div>";
  }

  Object.assign(A, {
    tzClose: function () { S.tz = null; render(); window.scrollTo(0, 0); },
    plCopy: function () {
      var u = S.plink && S.plink.url; if (!u) return;
      var done = function () { S.plCopied = true; render(); setTimeout(function () { S.plCopied = false; render(); }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done, function () { selectUrl(); });
      else selectUrl();
    },
    plShare: function () {
      var u = S.plink && S.plink.url; if (!u) return;
      var share = "https://t.me/share/url?url=" + encodeURIComponent(u) + "&text=" + encodeURIComponent(t("plShareText"));
      if (tg && tg.openTelegramLink) tg.openTelegramLink(share); else window.open(share, "_blank", "noopener");
    },
    plRenew: function () {
      askYes(t("plRenewQ"), function (y) {
        if (!y) return;
        S.busy = true; render();
        api("POST", "plink", { renew: true }).then(function (r) { S.busy = false; if (r.ok) { S.plink = r; S.note = t("plRenewed"); } else S.err = t("netErr"); render(); },
          function () { S.busy = false; S.err = t("netErr"); render(); });
      });
    },
  });
  function selectUrl() { var el = document.getElementById("plurl"); if (!el) return; var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
  /* ===== app-src/08-staff-glue.js — Owner / moderators glue: mLoad, coords map, photos, modPost, askYes dialogs, star actions, about page, staffLoad / staffView, calendar loader.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  /* ---------- admin (the owner's account) ---------- */
  function fmtTime(sec) { return new Date(sec * 1000).toLocaleString(S.lang === "en" ? "en-GB" : "ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  function mLoad(key, path) {
    api("GET", path).then(function (r) { if (r.ok) { S.aData[key] = r; render(); } else { S.err = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); render(); } });
  }
  var SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/></svg>';


  var cmap = null, cmark = null;
  function drawCoordsMap(pc) {
    var el = document.getElementById("coordsmap"), hint = document.getElementById("coordshint");
    if (!el) { if (cmap) { cmap.remove(); cmap = null; } return; }
    el.style.display = pc ? "" : "none"; if (hint) hint.hidden = !pc;
    if (!pc) return;
    if (!window.L) return loadLeaflet(function () { drawCoordsMap(parseCoords(S.form.coords || "")); });
    if (cmap && cmap.getContainer() !== el) { cmap.remove(); cmap = null; }
    if (!cmap) {
      cmap = L.map(el, { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false });
      cmap.attributionControl.setPrefix(false);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 15, attribution: "© OpenStreetMap" }).addTo(cmap);
      cmark = L.circleMarker([pc.lat, pc.lon], { radius: 7, color: "#fff", weight: 2, fillColor: "#8a2d47", fillOpacity: 1 }).addTo(cmap);
    }
    cmark.setLatLng([pc.lat, pc.lon]); cmap.setView([pc.lat, pc.lon], 9);
  }



  function dropAccount() {
    var a = S.aData.account;
    if (a && a.urls) a.urls.forEach(function (u) { if (u && u.indexOf("blob:") === 0) URL.revokeObjectURL(u); });
    S.aData.account = null;
  }
  function loadPhotos() {
    var a = S.aData.account; if (!a || !a.account || !a.account.photos) return;
    a.urls = a.urls || [];
    for (var i = 0; i < a.account.photos; i++) (function (i) {
      if (a.urls[i]) return;
      a.urls[i] = "about:blank";
      fetch("/api/" + (S.me.admin ? "admin/" : "mod/") + "account-photo?id=" + encodeURIComponent(a.n) + "&i=" + i, { headers: { authorization: "tma " + (tg ? tg.initData : "") } })
        .then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) {
          if (!b) return; a.urls[i] = URL.createObjectURL(b);
          var el = app.querySelector('img[data-ph="' + i + '"]'); if (el) el.src = a.urls[i];
        });
    })(i);
  }

  function modPost(path, body) {
    if (S.busy) return;
    S.busy = true; S.err = ""; render();
    api("POST", path, body).then(function (r) {
      S.busy = false;
      if (!r.ok) { S.err = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); haptic("error"); return render(); }
      if (r.report) { S.aData.report = r; S.aData.reports = null; }
      haptic("success"); render();
    }, function () { S.busy = false; S.err = t("netErr"); render(); });
  }


  /** Two questions before anything dangerous (owner, 2026-10-20). */
  /** owner, 2026-11-01: every «are you sure?» goes through here. Telegram's own window takes at most 256 characters and
      may refuse (old app, a window already open) — then our own window asks instead, so a question is never lost. */
  function askYes(q, go) {
    var done = false, once = function (y) { if (done) return; done = true; go(!!y); };
    if (tg && tg.showConfirm && String(q).length <= 256) {
      try { tg.showConfirm(q, once); return; } catch (e) { /* our own window below */ }
    }
    S.askBox = { q: q, go: once }; render();
  }
  function askModal() {
    return '<div class="modal-bg"><div class="modal card" role="alertdialog" aria-modal="true" aria-describedby="askq"><div id="askq" style="line-height:1.5">' + esc(S.askBox.q) + "</div>" +
      '<div class="decide"><button type="button" class="btn" data-a="askNo">' + t("cancel") + '</button><button type="button" class="btn primary" data-a="askOk">' + t("askOk") + "</button></div></div></div>";
  }
  function confirm2(q1, q2, go) {
    var ask = function (q, next) { askYes(q, function (y) { if (y) next(); }); };
    ask(q1, function () { setTimeout(function () { ask(q2, go); }, 250); });
  }

  function starsDrop() { Object.keys(S.aData).forEach(function (k) { if (/^stars_/.test(k)) S.aData[k] = null; }); S.aData.profiles = null; }
  function starAct(n, action, q) {
    var go = function (yes) {
      if (!yes) return;
      api("POST", "admin/star", { id: n, action: action }).then(function (r) {
        if (!r.ok) { S.aStarMsg = t("netErr"); return render(); }
        S.aStarMsg = ""; starsDrop();
        if (S.aOpen === n) mLoad("profile", "admin/profile?id=" + encodeURIComponent(n));
        render();
      });
    };
    askYes(q, go);
  }


  /** «О проекте и ваших данных»: a non-commercial project, what is kept, who sees what, how long. No personal data of anyone. */
  function vAbout() {
    var h = '<div class="backrow"><button type="button" data-a="pageClose" aria-label="' + t("back") + '">‹</button><span class="serif" style="font-size:20px">' + t("abTitle") + "</span></div>";
    h += '<div class="body">' + brand();
    ["ab1", "ab2", "ab3", "ab4", "ab5", "ab6", "ab7", "ab8"].forEach(function (k) {
      h += '<div class="card"><h2>' + t(k + "h") + '</h2><div class="small" style="line-height:1.55;white-space:pre-line">' + t(k) + "</div></div>";
    });
    return h + "</div>";
  }

  /* owner, 2026-10-25: «Назад» returns to the same place in a list (neighbours, admin profiles, reports, chats).
     The list's scroll is kept when a page is opened over it and given back on close; if the list is still loading,
     every next render tries again until the page is tall enough. */
  var listY = {};
  function keepY(k) { listY[k] = window.scrollY; S.wantY = null; }
  function backY(k) { S.wantY = listY[k] || 0; delete listY[k]; }
  function applyY() {
    if (S.wantY == null) return;
    var y = S.wantY, room = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, y);
    if (room >= y - 4) S.wantY = null;
  }
  /* ---------- «Календарь мероприятий» (owner, 2026-10-29): cal.js / cal.css load only when needed, never while it is off ---------- */
  /* ---------- the owner panel and moderation: staff.js (owner, 2026-11-01) ----------
     Loaded only for the owner and moderators (with their texts, i18n/staff.<lang>.json — see langReady), so participants
     do not download those screens. load() waits for it before the first screen; a role given later loads it on the way. */
  var STAFF = null, staffWait = null;
  function loadScript(src) {
    return new Promise(function (ok, no) { var js = document.createElement("script"); js.src = src; js.onload = ok; js.onerror = function () { js.remove(); no(new Error("script " + src)); }; document.head.appendChild(js); });
  }
  function staffLoad() {
    if (STAFF) return Promise.resolve();
    if (!staffWait) staffWait = (window.KVStaff ? Promise.resolve() : loadScript("staff.js?v=7")).then(function () {
      STAFF = window.KVStaff({ CHEV: CHEV, LOCK: LOCK, S: S, SHIELD: SHIELD, STAR_OUT: STAR_OUT, aiCatList: aiCatList, aiSynList: aiSynList, ansOf: ansOf, api: api, bar: bar,
        brand: brand, calWait: calWait, chip: chip, dateLong: dateLong, errLine: errLine, esc: esc, figure: figure, fmtDate: fmtDate, fmtTime: fmtTime, hasT: hasT,
        intSearch: intSearch, itag: itag, loadCat: loadCat, loadLeaflet: loadLeaflet, mLoad: mLoad, norm: norm, render: render, roleMark: roleMark, row: row,
        starSvg: starSvg, t: t, who: who, CAT: function () { return CAT; }, CAL: function () { return CAL; } });
    }, function (e) { staffWait = null; throw e; });
    return staffWait;
  }
  /** a staff screen; while staff.js is on its way — «Загрузка…», if it failed — the error box with «Повторить» */
  function staffView(name) {
    if (STAFF) return STAFF[name]();
    if (!S.staffAsk && !S.staffErr) { S.staffAsk = true; langReady(S.lang).then(function () { S.staffAsk = false; render(); }, function (e) { S.staffAsk = false; S.staffErr = true; dbg({ kind: "error", message: "staff load: " + (e && e.message) }); render(); }); }
    return '<div class="body">' + (S.staffErr ? stateBox("broken", t("stErrT"), t("stErrX"), '<button type="button" class="btn primary" data-a="staffRetry">' + t("retry") + "</button>", t("stErrNote"))
      : '<div class="muted center">' + t("loading") + "</div>") + "</div>";
  }
  var CAL = null, calState = 0, calThen = [];
  function calLoad(then) {
    if (then) calThen.push(then);
    if (CAL || calState === 1) { if (CAL) calFlush(); return; }
    calState = 1;
    var css = document.createElement("link"); css.rel = "stylesheet"; css.href = "cal.css?v=2"; document.head.appendChild(css);
    var js = document.createElement("script"); js.src = "cal.js?v=1";
    js.onload = function () {
      try {
        CAL = window.KVCal({ S: S, api: api, esc: esc, render: render, tg: tg, t: t, figure: figure, loadLeaflet: loadLeaflet,
          openPerson: function (pub) { A.openPerson({ dataset: { v: pub } }); } });
        Object.keys(CAL.A).forEach(function (k) { A[k] = guard("click " + k, CAL.A[k]); });
        calState = 2;
      } catch (e) { calState = 3; dbg({ kind: "error", message: "cal init: " + (e && e.message), stack: stackOf(e) }); }
      render(); calFlush();
    };
    js.onerror = function () { calState = 3; render(); };
    document.head.appendChild(js);
  }
  function calFlush() { var q = calThen; calThen = []; q.forEach(function (f) { try { f(); } catch (e) { /* fine */ } }); }
  function calWait(inCard) {
    if (calState !== 3) calLoad();
    var x = calState === 3 ? t("calErr") + ' <button type="button" class="btn link" data-a="calRetry">' + t("retry") + "</button>" : t("loading");
    return inCard ? '<div class="card small muted">' + x + "</div>" : '<div class="body"><div class="muted small">' + x + "</div></div>";
  }
  /** t.me/<bot>?startapp=ev_<id> or a bot button /app/?ev=<id>: open that event (only while the calendar is on for this person) */
  function calLink(r) {
    var sp = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param, m = sp && /^ev_([a-z0-9]{8})$/.exec(sp), q = /[?&]ev=([a-z0-9]{8})/.exec(location.search);
    var pub = (m && m[1]) || (q && q[1]);
    if (!pub || S.usedEv || !r.cal || !r.cal.see || !r.active) return;
    S.usedEv = true; S.tab = "cal"; render();
    calLoad(function () { CAL.openEvent(pub); });
  }

  Object.assign(A, {
    staffRetry: function () { S.staffErr = false; render(); },
    calRetry: function () { calState = 0; calLoad(); render(); },
    pageClose: function () { S.page = null; render(); },
    askOk: function () { var b = S.askBox; S.askBox = null; render(); if (b) b.go(true); },
    askNo: function () { var b = S.askBox; S.askBox = null; render(); if (b) b.go(false); },
  });
  /* ===== app-src/09-render.js — render(): picks the screen from S, the tab bar, BackButton.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  function render() {
    var h, clStep = false, clOpen = false;
    pfBegin();   // owner, 2026-11-07: this drawing says anew what it would like ahead (app-src/13a-speed.js)
    // owner, 2026-11-01: no texts yet (they come with /api/me) — the dots; they never came — a two-language line
    if (!TT.ru && !TT.en) { app.innerHTML = S.err ? '<div class="center"><p>Нет связи с сервером.<br>No connection to the server.</p><button type="button" class="btn primary" data-a="reload">Повторить · Retry</button></div>' : '<div class="center muted">…</div>'; return; }
    if (!S.me) h = S.err ? '<div class="body" style="justify-content:center">' + (S.errKind === "server" ? stateBox("quiet", t("stSrvT"), t("stSrvX"), '<button type="button" class="btn primary" data-a="reload">' + t("retry") + "</button>", t("stSrvNote"))
      : stateBox("broken", t("stErrT"), t("stErrX"), '<button type="button" class="btn primary" data-a="reload">' + t("retry") + "</button>", t("stErrNote"))) + "</div>"
      : '<div class="center muted">' + t("loading") + "</div>";
    else if (S.me.deleted) h = '<div class="center">' + t("deleted") + "</div>";
    else if (S.page === "about") h = vAbout();
    else if (S.me.admin) h = staffView("vAdmin");
    else if (S.me.banned) h = '<div class="center"><p>' + t("bannedText") + "</p></div>";
    else if (!S.me.access && !S.me.mod) h = '<div class="center"><p>' + t("noAccess") + '</p><p class="muted small">' + t("noAccess2") + "</p></div>";
    else {
      if (!S.me.access) S.tab = "mod";
      if (S.tab === "mod" && !S.me.mod) S.tab = "neighbours";        // no longer a moderator
      if (S.tab === "cal" && !(S.me.cal && S.me.cal.see)) S.tab = "neighbours";   // the calendar was switched off
      var st = S.me.steps;
      var step = !S.me.access ? null : S.edit || (!st.consent ? "consent" : (!st.checklist || S.preview) ? "checklist" : !st.profile ? "profile" : !st.location ? "place" : null);
      if (step && S.me.mod && S.tab === "mod" && !S.edit) step = null;   // a moderator without a participant profile
      S.onbMod = !!(step && S.me.mod && !S.edit);
      if (S.tz && !S.tz.gone && step && step !== "consent") S.tz = null;   // registration went on: no way back to the teaser
      h = S.tz && S.tz.gone ? vTeaserGone() : step === "consent" && S.tz && !S.edit ? teaserBlock(S.tz, true) + '<div class="tzreg">' + vConsent() + "</div>" : step === "consent" ? vConsent() : step === "checklist" ? vChecklist() : step === "profile" ? vProfile() : step === "place" ? vPlace() : vHome();
      // owner, 2026-11-01: no screen before the checklist form — after step 1 the form opens at once, and it is built
      // ahead (hidden) already while step 1 is on the screen
      clStep = !S.me.active && !S.preview && (step === "checklist" || step === "consent") && (!S.edit || S.edit === "consent");
      clOpen = step === "checklist" && !S.edit && !S.preview;
      if (!S.edit) markStep(step || (S.me.active ? "map" : null));   // owner, 2026-10-27: the first visit to each registration screen
    }
    document.documentElement.lang = S.lang;
    // owner, 2026-11-07: the owner's panel and the moderators' tab keep the earlier look (v6 is for participants)
    document.documentElement.classList.toggle("staff", !!(S.me && (S.me.admin || (S.tab === "mod" && S.me.mod && !S.edit))));
        document.documentElement.classList.toggle("tzsnap", !!(S.tz && !S.tz.gone && S.me && !S.me.active));
    if (map) { map.remove(); map = null; }
    // owner, 2026-10-21: once, after the steps, for someone who stayed in the universe
    var um = uniMine();
    if (S.me && S.me.active && um && um.on && !um.info_seen && !S.edit)
      h += '<div class="modal-bg"><div class="modal card"><h2 class="serif" style="font-size:22px">' + t("uniInfoTitle") + '</h2><div style="line-height:1.55">' + t("uniInfo1", { all: quoted(um.all) }) +
        '</div><div style="line-height:1.55">' + t("uniInfo2", { mine: quoted(um.mine) }) + '</div><div class="small muted">' + t("uniInfo3") +
        '</div><div class="decide"><button type="button" class="btn" data-a="uniInfoSettings">' + t("settingsBtn") + '</button><button type="button" class="btn primary" data-a="uniInfoOk">' + t("ok") + "</button></div></div></div>";
    if (S.aStarAsk && S.me && S.me.admin) h += STAFF ? STAFF.starAskModal() : "";   // owner, 2026-10-27
    if (S.sheet && S.me && !S.me.admin && S.tab === "neighbours") h += starSheet();
    if (S.yes && S.me && !S.me.admin) h += yesSheet();   // owner, 2026-10-31
    if (S.nn && S.me && !S.me.admin) h += nnSheet();   // owner, 2026-11-07
    if (S.ps && S.me && S.me.active && S.tab === "profile" && !S.edit) h += psSheet();   // owner, 2026-11-07 (9.01)
    if (S.mMenu && S.me && !S.me.admin && S.tab === "matches") h += mMenuSheet();
    if (S.fOpen && S.me && S.me.active && S.tab === "neighbours" && !S.open) h += filtersSheet();
    if (S.pzAsk && S.me && !S.me.admin) h += pzAskModal();
    if (S.qr && S.me && !S.me.admin) h += qrModal();
    if (S.askBox) h += askModal();
    if (S.delAsk && S.me && !S.me.deleted)
      h += '<div class="modal-bg"><div class="modal card" role="dialog" aria-modal="true" aria-labelledby="delh"><h2 id="delh" class="serif" style="font-size:22px;color:var(--danger)">' + t("delTitle") +
        '</h2><div class="small" style="line-height:1.55">' + t("delType") + '</div><label class="field"><span class="lbl">' + t("delWordL") + '</span><input type="text" autocomplete="off" autocapitalize="sentences" data-f="delWord" value="' + esc(S.form.delWord || "") + '"></label>' +
        (S.delErr ? '<div class="err" role="alert">' + t("delWrong") + "</div>" : "") +
        '<div class="decide"><button type="button" class="btn" data-a="delCancel">' + t("cancel") + '</button><button type="button" class="btn primary" style="background:var(--danger);border-color:var(--danger)" data-a="delFinal">' + t("delFinal") + "</button></div></div></div>";
    app.innerHTML = h;
    if (S.aAnsQ && app.querySelector('[data-a="aAnsQ"]')) ansFilter(S.aAnsQ);   // owner, 2026-11-07: the search stays applied after a redraw
    if (clStep && !S.fillOpen) { fillPreload(); if (clOpen) fillShow(true); } else if (!clStep) fillDropPre();
    if (S.yes) ymPaint();
    if (S.qr) qrPaint();
    if (S.me && S.me.active && !S.edit && S.tab === "neighbours" && !S.open && S.nbView === "map") drawMap();
    if (S.me && S.me.admin && S.aMapPage) { if (STAFF) STAFF.drawAdminMap(); }
    if (CAL && S.me && !S.me.admin && S.tab === "cal" && !S.open) CAL.after();
    if (S.coordsOpen) drawCoordsMap(parseCoords(S.form.coords || ""));
    if (S.scrollToMatch && S.tab === "matches" && S.matches) {
      var mc = app.querySelector('[data-mid="' + S.scrollToMatch.replace(/[^a-z0-9]/g, "") + '"]');
      S.scrollToMatch = null;
      if (mc) { mc.scrollIntoView({ block: "center" }); mc.classList.add("flash"); setTimeout(function () { mc.classList.remove("flash"); }, 1600); }
      else window.scrollTo(0, 0);
    }
    applyY();
    pfScreen(); pfEnd();
    if (tg && tg.BackButton) { if (S.fillOpen || S.yes || S.pzAsk || S.qr || S.chat || S.aChatRead || S.starsOpen || S.nStarsOpen || S.ints || S.aIntsPage || S.page || S.edit || S.open || S.prop || S.pin || S.aOpen || S.mOpen || S.aChatPage || S.aUniPage || S.aMutPage || S.aMapPage || S.report || S.onbMod || S.mapFrom || S.fOpen || (CAL && CAL.canBack())) tg.BackButton.show(); else tg.BackButton.hide(); }
  }

  Object.assign(A, {
    reload: load,
    uniInfoOk: function () { S.me.universe.info_seen = true; api("POST", "settings", { uni_info_seen: true }); render(); },
    uniInfoSettings: function () { S.me.universe.info_seen = true; api("POST", "settings", { uni_info_seen: true }); S.tab = "profile"; S.pTab = "settings"; render(); },
    delCancel: function () { S.delAsk = false; S.form.delWord = ""; S.err = ""; render(); },
    delFinal: function () {
      var w = String(S.form.delWord || "").trim();
      if (!/^(да|yes)$/i.test(w)) { S.delErr = true; return render(); }
      S.delErr = false;
      save("delete", { confirm: true, word: w }, function () { S.delAsk = false; S.me = { deleted: true }; phoneClear(); });
    },
  });
  /* ===== app-src/10-site-frames.js — The site in a frame: «Мой портрет» (starsShow), a neighbour's constellation (nStarsShow), messages from the site.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  /* ---------- «Моё созвездие» (owner, 2026-10-20) ----------
     The Kinkosmos site's own «Мой портрет» block of the person's list, in a frame over the app. It lives OUTSIDE #app,
     so the app's re-renders never reload it. Only messages from the site's origin are read: its height, and the
     picture from «Send to Telegram», which goes to /api/share (the bot sends it to the person to forward). */
  var SITE_ORIGIN = "https://klevatess.github.io", stars = null;
  function starsShow(on) {
    if (!stars) {
      stars = document.createElement("div"); stars.className = "stars-ov";
      stars.innerHTML = '<div class="backrow"><button type="button" class="sb" aria-label="' + esc(t("back")) + '">‹</button><span class="serif" style="font-size:20px">' + esc(t("starsTitle")) + "</span></div>" +
        '<div class="body" style="padding-top:0"><div class="decide sbtns" hidden><button type="button" class="btn primary" data-c="share">' + esc(t("starsShare")) + '</button><button type="button" class="btn" data-c="card">' + esc(t("starsSave")) + "</button></div>" +
        '<div class="decide sbtns2" hidden><button type="button" class="btn" data-c="file">' + esc(t("starsFile")) + '</button><button type="button" class="btn" data-c="link">' + esc(t("starsLink")) + "</button></div>" +
        '<div class="tiny muted">' + esc(t("starsHow")) + '</div><div class="card ok small sn" hidden></div><div class="sl muted small">' + esc(t("starsLoading")) + "</div></div>";
      stars.querySelector(".sb").addEventListener("click", function () { starsShow(false); });
      // owner, 2026-10-20: «Поделиться созвездием» on top sends at once; «Сохранить картинкой» opens the site's picture window
      stars.querySelector(".sbtns").addEventListener("click", function (e) {
        var b = e.target.closest("[data-c]"), f = stars.querySelector(".stars-frame");
        if (!b || !f || !f.contentWindow) return;
        if (b.dataset.c === "share") { b.disabled = true; b.textContent = t("starsSending"); setTimeout(function () { if (b.disabled) { b.disabled = false; b.textContent = t("starsShare"); } }, 15000); }
        f.contentWindow.postMessage({ kind: "kinkosmos-cmd", cmd: b.dataset.c }, SITE_ORIGIN);
      });
      // owner, 2026-10-21: the picture as a file in the bot chat (to add to a post with photos) and the plain link to the bot
      stars.querySelector(".sbtns2").addEventListener("click", function (e) {
        var b = e.target.closest("[data-c]"), f = stars.querySelector(".stars-frame");
        if (!b) return;
        if (b.dataset.c === "link") {
          var text = t("linkText") + "\n" + (S.botLink || "");
          var ok = function () { b.textContent = t("linkCopied"); setTimeout(function () { b.textContent = t("starsLink"); }, 2500); };
          var manual = function () { var n = stars.querySelector(".sn"); n.hidden = false; n.textContent = text; };
          try { navigator.clipboard.writeText(text).then(ok, manual); } catch (x) { manual(); }
          return;
        }
        if (!f || !f.contentWindow) return;
        S.starsWant = "file"; b.disabled = true; b.textContent = t("starsSending");
        setTimeout(function () { if (b.disabled) { b.disabled = false; b.textContent = t("starsFile"); S.starsWant = null; } }, 15000);
        f.contentWindow.postMessage({ kind: "kinkosmos-cmd", cmd: "share" }, SITE_ORIGIN);
      });
      document.body.appendChild(stars);
      api("GET", "mylink").then(function (r) {
        var sl = stars.querySelector(".sl");
        if (!r.ok) { sl.textContent = t("starsFail"); return; }
        S.botLink = r.bot || "";
        var f = document.createElement("iframe"); f.className = "stars-frame"; f.title = t("starsTitle"); f.src = r.link;
        f.setAttribute("referrerpolicy", "no-referrer");
        var to = setTimeout(function () { if (!f.dataset.ok) sl.textContent = t("starsFail"); }, 20000);
        f.addEventListener("load", function () { f.dataset.ok = "1"; clearTimeout(to); sl.hidden = true; });
        stars.querySelector(".body").appendChild(f);
      });
    }
    S.starsOpen = !!on;
    stars.style.display = on ? "block" : "none";
    // owner, 2026-11-07: one site frame alive at most — dropped 10 minutes after it was closed, or when the app is hidden
    clearTimeout(starsDrop); if (!on) starsDrop = setTimeout(starsGone, 600000);
    document.documentElement.classList.toggle("stars-on", !!on);
    if (tg && tg.BackButton) { if (on) tg.BackButton.show(); else render(); }
  }
  var starsDrop = 0;
  function starsGone() { if (stars && !S.starsOpen) { stars.remove(); stars = null; } }
  document.addEventListener("visibilitychange", function () { if (document.hidden) starsGone(); });
  var nstars = null;
  function nStarsShow(id, nick) {
    if (nstars) { nstars.remove(); nstars = null; }
    S.nStarsOpen = !!id;
    document.documentElement.classList.toggle("stars-on", !!id || !!S.starsOpen);
    if (!id) { render(); return; }
    nstars = document.createElement("div"); nstars.className = "stars-ov";
    nstars.innerHTML = '<div class="backrow"><button type="button" class="sb" aria-label="' + esc(t("back")) + '">‹</button><span class="serif" style="font-size:20px">' + esc(nick ? t("nStarsTitle", { name: nick }) : t("nStarsTitle0")) + "</span></div>" +
      '<div class="body" style="padding-top:0"><button type="button" class="btn" data-c="send">' + esc(t("ksSendBtn")) + '</button><div class="tiny muted">' + esc(t("nStarsHow")) + '</div><div class="card small sn" hidden></div><div class="sl muted small">' + esc(t("starsLoading")) + "</div></div>";
    nstars.style.display = "block";
    nstars.querySelector(".sb").addEventListener("click", function () { nStarsShow(null); });
    nstars.querySelector('[data-c="send"]').addEventListener("click", function (e) { ksSend(id, e.currentTarget); });
    document.body.appendChild(nstars);
    if (tg && tg.BackButton) tg.BackButton.show();
    starsGone(); timeStart("constellation");
    api("GET", "kslink?embed=1&id=" + encodeURIComponent(id)).then(function (r) {
      if (!nstars) return;
      var sl = nstars.querySelector(".sl");
      if (!r.ok) { sl.textContent = r.error === "compare_hidden" ? t("compareHidden") : t("starsFail"); return; }
      var f = document.createElement("iframe"); f.className = "stars-frame"; f.title = nick ? t("nStarsTitle", { name: nick }) : t("nStarsTitle0"); f.src = r.link;
      f.setAttribute("referrerpolicy", "no-referrer");
      var to = setTimeout(function () { if (!f.dataset.ok && nstars) sl.textContent = t("starsFail"); }, 20000);
      f.addEventListener("load", function () { f.dataset.ok = "1"; clearTimeout(to); sl.hidden = true; timeEnd("constellation"); });
      nstars.querySelector(".body").appendChild(f);
    }, function () { if (nstars) nstars.querySelector(".sl").textContent = t("starsFail"); });
  }
  function ksSend(id, btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    api("POST", "kslink-send", { id: id }).then(function (r) {
      btn.disabled = false; btn.textContent = r.ok ? t("ksSent") : t("netErr");
      setTimeout(function () { btn.textContent = t("ksSendBtn"); }, 3000);
    }, function () { btn.disabled = false; btn.textContent = t("netErr"); setTimeout(function () { btn.textContent = t("ksSendBtn"); }, 3000); });
  }
  window.addEventListener("message", function (e) {   // the neighbour's frame only says its height
    if (e.origin !== SITE_ORIGIN || !nstars || !e.data || typeof e.data !== "object") return;
    var f = nstars.querySelector(".stars-frame");
    if (!f || e.source !== f.contentWindow) return;
    if (e.data.kind === "kinkosmos-size" && +e.data.h > 0) f.style.height = Math.min(Math.max(+e.data.h, 400), 6000) + "px";
  });
  window.addEventListener("message", function (e) {
    if (e.origin !== SITE_ORIGIN || !stars || !e.data || typeof e.data !== "object") return;
    var f = stars.querySelector(".stars-frame");
    if (!f || e.source !== f.contentWindow) return;   // the form frame («Заполнить анкету здесь») has its own handler
    if (e.data.kind === "kinkosmos-ready") { stars.querySelector(".sbtns").hidden = false; stars.querySelector(".sbtns2").hidden = false; stars.querySelector(".tiny.muted").textContent = t("starsHow2"); }
    if (e.data.kind === "kinkosmos-size" && f && +e.data.h > 0) {
      if (e.data.modal) { f.style.height = window.innerHeight + "px"; stars.scrollTop = f.offsetTop; }   // the site's picture window: fill the screen
      else f.style.height = Math.min(Math.max(+e.data.h, 400), 6000) + "px";
    }
    if (e.data.kind === "kinkosmos-share" && typeof e.data.png === "string" && S.starsWant === "file") {
      S.starsWant = null;
      var fb = stars.querySelector('.sbtns2 [data-c="file"]'), fn = stars.querySelector(".sn");
      api("POST", "share", { png: e.data.png, title: String(e.data.title || ""), sub: String(e.data.sub || ""), as_file: true }).then(function (r) {
        fb.disabled = false;
        if (r.ok) { fb.textContent = t("fileSent"); setTimeout(function () { fb.textContent = t("starsFile"); }, 3000); }
        else { fb.textContent = t("starsFile"); fn.hidden = false; fn.textContent = r.error === "too_soon" ? t("e_too_soon_share") : t("netErr"); }
      }, function () { fb.disabled = false; fb.textContent = t("starsFile"); fn.hidden = false; fn.textContent = t("netErr"); });
      return;
    }
    if (e.data.kind === "kinkosmos-share" && typeof e.data.png === "string") {
      // owner, 2026-10-20: no lasting note — the share button says «✓ Отправлено» for a moment; only an error is shown
      var sb = stars.querySelector('.sbtns [data-c="share"]'), n = stars.querySelector(".sn");
      var done = function (ok, err) {
        n.hidden = ok; if (!ok) { n.textContent = err; stars.scrollTo ? stars.scrollTo(0, 0) : null; }
        sb.disabled = false; sb.textContent = ok ? t("starsSentShort") : t("starsShare");
        if (ok) setTimeout(function () { sb.textContent = t("starsShare"); }, 2500);
      };
      sb.disabled = true; sb.textContent = t("starsSending");
      var title = String(e.data.title || ""), sub = String(e.data.sub || ""), png = e.data.png;
      var reset = function () { sb.disabled = false; sb.textContent = t("starsShare"); n.hidden = true; };
      // owner, 2026-10-20: «Поделиться» opens a share dialog like on the site, not a message in the bot chat.
      // 1) the phone's own share sheet with the picture, where the app allows it; 2) otherwise Telegram's own dialog
      //    (pick any chat; a message prepared by the bot); 3) a very old Telegram: the picture lands in the bot chat.
      var viaTelegram = function () {
        var dlg = !!(tg && tg.shareMessage && tg.isVersionAtLeast && tg.isVersionAtLeast("8.0"));   // Telegram's share dialog: Bot API 8.0+
        api("POST", "share", { png: png, title: title, sub: sub, prepare: dlg }).then(function (r) {
          if (r.ok && r.prepared) { try { tg.shareMessage(r.prepared, function () { reset(); }); return; } catch (x) { return done(false, t("netErr")); } }
          done(!!r.ok, r.error === "too_soon" ? t("e_too_soon_share") : t("netErr"));
        }, function () { done(false, t("netErr")); });
      };
      var sys = null;
      try {
        if (navigator.share && navigator.canShare && window.File) {
          var bin = atob(png.split(",")[1]), arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          var file = new File([arr], "kinkosmos.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) sys = { files: [file], text: (title ? "✦ " + title + "\n" : "") + t("shareText") + (S.botLink ? " " + S.botLink : "") };
        }
      } catch (x) { sys = null; }
      if (sys) navigator.share(sys).then(reset, function (err) { if (err && err.name === "AbortError") reset(); else viaTelegram(); });
      else viaTelegram();
    }
  });
  /* ===== app-src/11-fill-form.js — The checklist form in the app (fill overlay, preload, drafts), site links.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  /* ---------- «Заполнить анкету здесь» (owner, 2026-10-20) ----------
     The whole Kinkosmos form of the person's own list in a frame (site "&embed=fill"), with the bot's own bars: on top
     the draft's state, below the count up to 50 and «Готово — сохранить в Kinkoverse». The site sends the list as its
     link code: a draft every 7 new answers and when it is hidden (kept encrypted by /api/draft), the finished link on
     «Готово» (saved by /api/checklist exactly like a pasted link). Lives outside #app like «Моё созвездие». */
  var fillOv = null, fillN = 0, fillBusy = false;
  function fillFrame() { return fillOv && fillOv.querySelector(".fill-frame"); }
  function fillStatus(txt, ok) { var e = fillOv.querySelector(".fst"); e.textContent = txt; e.style.color = ok ? "var(--ok, #2f7d54)" : ""; }
  function fillPaint() {
    if (!fillOv) return;
    var k = Math.max(0, 50 - fillN), b = fillOv.querySelector(".fdone");
    fillOv.querySelector(".fbar i").style.width = Math.min(100, fillN * 2) + "%";
    fillOv.querySelector(".fhint").textContent = k ? t("fNeed", { n: fillN, k: k }) : t("fCan");
    b.disabled = !!k || fillBusy || !fillOv.dataset.ready; b.textContent = fillBusy ? t("fSavingList") : k ? t("fDone") : t("fDoneN", { n: fillN });
    fillOv.querySelector(".fsteps").hidden = !k;
  }
  /* owner, 2026-11-01: the frame is built ahead, hidden, while the checklist step screen is open (fillPreload), so
     «Заполнить» only shows it — the site needs a few seconds to load from GitHub Pages. Timings go to the debug log. */
  var fillPre = false, fillT = {};
  function fillTiming(what) { dbg({ kind: "timing", message: "fill " + what }); }
  function fillBuild(fresh, pre) {
    var ov = fillOv = document.createElement("div"); ov.className = "fill-ov" + (pre ? " pre" : ""); fillN = 0; fillBusy = false; fillPre = !!pre;
    if (pre) { ov.setAttribute("aria-hidden", "true"); ov.setAttribute("inert", ""); }
    // owner, 2026-11-01 (variant A): during registration the bar starts with step 1 already done
    var reg = !!(S.me && !S.me.active);
    ov.innerHTML = '<div class="backrow"><button type="button" class="sb" aria-label="' + esc(t("back")) + '">‹</button><div style="display:flex;flex-direction:column"><span class="serif" style="font-size:19px">' + esc(t("fillTitle")) +
      '</span><span class="fst tiny muted">' + esc(t("fLoading")) + '</span></div></div><div class="fwrap"><div class="sl muted small">' + esc(t("fLoading")) + "</div></div>" +
      '<div class="fpanel"><div class="fsteps' + (reg ? " reg" : "") + '" aria-hidden="true">' + (reg ? '<span class="fs1"></span>' : "") + '<div class="fbar"><i></i></div></div><div class="fhint tiny muted"></div><div class="err ferr" role="alert" hidden></div><button type="button" class="btn primary fdone" disabled>' + esc(t("fDone")) + "</button></div>";
    ov.querySelector(".sb").addEventListener("click", function () { fillShow(false); });
    ov.querySelector(".fdone").addEventListener("click", function () {
      var f = fillFrame(); if (!f || !f.contentWindow || fillBusy) return;
      fillBusy = true; fillPaint();
      f.contentWindow.postMessage({ kind: "kinkosmos-cmd", cmd: "done" }, SITE_ORIGIN);
      setTimeout(function () { if (fillBusy && fillOv) { fillBusy = false; fillErr(t("netErr")); fillPaint(); } }, 15000);
    });
    document.body.appendChild(ov);
    fillPaint();
    draftsSent().then(function () { return api("GET", "fill" + (fresh ? "?fresh=1" : "")); }).then(function (r) {
      var sl = ov.querySelector(".sl"); if (ov !== fillOv || !sl) return;
      if (!r.ok) { sl.textContent = t("starsFail"); return; }
      var f = document.createElement("iframe"); f.className = "fill-frame"; f.title = t("fillTitle"); f.src = r.link;
      f.setAttribute("referrerpolicy", "no-referrer");   // the site reads the bot's address from ancestorOrigins
      var to = setTimeout(function () { if (!ov.dataset.ready) { sl.textContent = t("starsFail"); if (ov === fillOv) fillTiming("not ready after 20 s" + (fillPre ? " (preloaded, not opened)" : "")); } }, 20000);
      f.addEventListener("load", function () { clearTimeout(to); });
      ov.querySelector(".fwrap").appendChild(f);
      if (r.draft) fillStatus(t("fSaved", { n: r.draft.answered }), true);
    }, function () { var sl = ov.querySelector(".sl"); if (sl) sl.textContent = t("starsFail"); });
  }
  /** build the frame ahead, hidden (the checklist step screen, not editing); nothing is marked or sent */
  function fillPreload() {
    if (fillOv || !S.me || !S.me.access) return;
    fillT = { pre: performance.now() };
    fillBuild(false, true);
  }
  /** the step screen is gone (saved, or another step): the hidden frame goes too */
  function fillDropPre() { if (fillOv && fillPre) { fillOv.remove(); fillOv = null; fillPre = false; } }
  function fillShow(on, fresh) {
    if (on) {
      if (S.me && !S.me.active) markStep("fill");   // owner, 2026-10-27
      if (fillOv && fillPre && !fresh) {
        fillPre = false; fillOv.classList.remove("pre"); fillOv.removeAttribute("aria-hidden"); fillOv.removeAttribute("inert");
        fillT.tap = performance.now();
        if (fillOv.dataset.ready) fillTiming("opened ready (preloaded " + Math.round(fillT.ready - fillT.pre) + " ms)");
      } else {
        if (fillOv) fillOv.remove();
        fillT = { tap: performance.now() };
        fillBuild(fresh, false);
      }
    } else if (fillOv) {
      // closing: the site is asked for the last draft; the frame stays a moment to send it, then goes
      var f = fillFrame(), ov = fillOv; fillOv = null; fillPre = false; fillClosedAt = Date.now();
      // owner, 2026-11-01: during registration the form IS step 2 — closing it goes back to step 1 (as «Назад» did)
      if (S.me && !S.me.active && !S.me.steps.checklist && !S.edit) { S.edit = "consent"; S.form = {}; S.err = ""; S.preview = false; }
      ov.style.display = "none";
      if (f && f.contentWindow) try { f.contentWindow.postMessage({ kind: "kinkosmos-cmd", cmd: "flush" }, SITE_ORIGIN); } catch (x) { /* gone */ }
      setTimeout(function () { ov.remove(); refreshMe(); }, 1500);
    }
    S.fillOpen = !!on && !!fillOv;
    document.documentElement.classList.toggle("stars-on", !!(S.fillOpen || S.starsOpen));
    if (tg && tg.BackButton) { if (on) tg.BackButton.show(); else render(); }
  }
  function fillErr(msg) { var e = fillOv && fillOv.querySelector(".ferr"); if (e) { e.textContent = msg; e.hidden = !msg; } }
  function refreshMe() { api("GET", "me").then(function (r) { if (r.ok) { S.me = r; render(); } }, function () {}); }
  function fillSource(e) { var f = fillOv && fillFrame(); return !!(f && e.source === f.contentWindow); }
  var drafting = null, draftN = 0, flushAt = 0, draftsOut = 0, fillClosedAt = 0;
  /** owner, 2026-11-01: the form is opened again by itself (registration) — a form closed a moment ago first sends its
      last draft (≤ 1.6 s, then the request), so the new one is asked for only after that: no answers are lost */
  function draftsSent() {
    return new Promise(function (ok) {
      var t0 = Date.now();
      (function wait() { if ((Date.now() - fillClosedAt >= 1700 && !draftsOut) || Date.now() - t0 > 8000) ok(); else setTimeout(wait, 150); })();
    });
  }
  function sendDraft(link, n) {
    if (n) draftN = n;
    if (fillOv) fillStatus(t("fSaving"));
    // keepalive: the last draft may be sent while the app is being closed
    draftsOut++;
    drafting = fetch("/api/draft", { method: "POST", keepalive: link.length < 60000,
      headers: { "authorization": "tma " + (tg ? tg.initData : ""), "content-type": "application/json" }, body: JSON.stringify({ link: link }) })
      .then(function (r) { return r.json(); }).then(function (j) {
        if (fillOv) { if (j.ok) fillStatus(t("fSaved", { n: j.answered }), true); else fillStatus(t("netErr")); }
        if (j.ok && S.me) S.me.draft = j.answered ? { answered: j.answered, updated_at: Math.floor(Date.now() / 1000) } : null;
      }, function () { if (fillOv) fillStatus(t("netErr")); }).then(function () { draftsOut--; });
  }
  window.addEventListener("message", function (e) {
    if (e.origin !== SITE_ORIGIN || !e.data || typeof e.data !== "object") return;
    var k = e.data.kind;
    // a draft may come from a frame that is just closing (fillOv is already null then): it is kept too
    if (k === "kinkosmos-draft" && typeof e.data.link === "string") { sendDraft(e.data.link, +e.data.n || 0); return; }
    if (!fillSource(e)) return;
    if (k === "kinkosmos-ready" && e.data.mode === "fill") {
      fillOv.dataset.ready = "1"; var sl = fillOv.querySelector(".sl"); if (sl) sl.hidden = true;
      fillT.ready = performance.now();
      if (fillPre) fillTiming("preloaded ready in " + Math.round(fillT.ready - fillT.pre) + " ms");
      else if (fillT.tap) fillTiming("tap → ready " + Math.round(fillT.ready - fillT.tap) + " ms" + (fillT.pre ? " (was preloading)" : ""));
      fillN = +e.data.n || 0; draftN = fillN; if (fillOv.querySelector(".fst").textContent === t("fLoading")) fillStatus(t("fNotSaved"));
      fillPaint();
    }
    if (k === "kinkosmos-count") {
      fillN = +e.data.n || 0; fillPaint();
      // owner, 2026-11-01: a draft every 5 new answers (the form itself sends one every 15)
      if (fillN >= draftN + 5 && Date.now() - flushAt > 3000) { flushAt = Date.now(); var ff = fillFrame(); if (ff && ff.contentWindow) try { ff.contentWindow.postMessage({ kind: "kinkosmos-cmd", cmd: "flush" }, SITE_ORIGIN); } catch (x) { /* gone */ } }
    }
    if (k === "kinkosmos-done" && typeof e.data.link === "string") {
      fillN = +e.data.n || fillN; fillErr("");
      api("POST", "checklist", { link: e.data.link }).then(function (r) {
        fillBusy = false;
        if (!r.ok) {
          // the list is not lost: it is kept as a draft
          sendDraft(e.data.link, fillN);
          fillErr(r.error === "too_soon" ? t("e_too_soon", { date: fmtDate(r.next) }) : r.error === "too_few" ? t("e_too_few", { n: r.answered, need: r.need }) : (hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr")));
          return fillPaint();
        }
        var wasActive = S.me && S.me.active;
        S.me = r; setLang(r.lang);
        if (r.active) loadNeighbours();   // new answers, new percents
        var ov = fillOv; fillOv = null; S.fillOpen = false; if (ov) ov.remove();
        document.documentElement.classList.toggle("stars-on", !!S.starsOpen);
        S.preview = !wasActive || !!S.edit; S.form = {}; S.err = "";   // the step's «all right?» card; from «Моя карточка» just the card
        render();
      }, function () { fillBusy = false; fillErr(t("netErr")); fillPaint(); });
    }
  });
  // the whole app is hidden or closed: ask the open form for its last draft
  document.addEventListener("visibilitychange", function () {
    var f = document.hidden && fillOv && !fillPre && fillFrame();   // a frame built ahead and never opened has nothing new
    if (f && f.contentWindow) try { f.contentWindow.postMessage({ kind: "kinkosmos-cmd", cmd: "flush" }, SITE_ORIGIN); } catch (x) { /* gone */ }
  });

  /* ---------- actions ---------- */
  /** A checklist handed over from the Kinkosmos site: t.me/<bot>?startapp=cl<base64url of the link's part after #>. */
  function siteLink() {
    var sp = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param;
    if (!sp || sp.slice(0, 2) !== "cl") return null;
    try {
      var b = sp.slice(2).replace(/-/g, "+").replace(/_/g, "/");
      while (b.length % 4) b += "=";
      var hash = decodeURIComponent(escape(atob(b)));
      return /(^|&)a=/.test(hash) ? "#" + hash : null;
    } catch (e) { return null; }
  }
  function useSiteLink() {
    var link = siteLink();
    if (!link || S.me.admin || !S.me.access || S.usedSiteLink) return;
    S.usedSiteLink = true;
    if (!S.me.steps.consent) { S.pendingLink = link; return; }        // after step 1 it is read automatically
    S.fromSite = true;
    if (S.me.steps.checklist) S.edit = "checklist";
    save("checklist", { link: link }, function () { S.preview = true; });
  }
  /* ===== app-src/12-actions.js — loadNeighbours, startEdit / endEdit, and the click handlers that are not tied to one screen.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */
  var nbSlowTimer = null, SLOW_MS = 10000;   // owner, 2026-10-26: «дольше 10 секунд»
  function loadNeighbours(again) {
    if (!S.me || !S.me.active) return;
    if (!S.nb && !again) { var pc = phoneGet("nb"); if (pc && pc.items) { S.nb = pc; S.nbOld = true; } }   // owner, 2026-11-07: the phone copy at once
    if ((!S.nb || S.nbOld) && !again) { S.nbErr = false; S.nbSlow = false; clearTimeout(nbSlowTimer); nbSlowTimer = setTimeout(function () { if (!S.nb) { S.nbSlow = true; render(); } }, SLOW_MS); }
    api("GET", "neighbours").then(function (r) {
      clearTimeout(nbSlowTimer);
      if (!r.ok) { if (!S.nb && r.error === "server") { S.nbErr = true; render(); } return; }
      var ck = S.me && S.me.checklist ? S.me.checklist.updated_at : 0;   // owner, 2026-11-07: my checklist changed → the kept comparisons are old
      if (pcache.ck !== ck) { pcache.list = {}; pcache.cmp = {}; pcache.ck = ck; }
      S.nb = r; S.nbOld = false; S.nbSlow = false; S.nbErr = false; render();
      phonePut("nb", r);
      if (S.tzWant) plinkFull();
      openTiming(true);
      dbg({ kind: "neighbours", message: "items " + r.items.length + (r.stats ? " stats " + JSON.stringify(r.stats) : "") + (r.filters_off ? " filters_off" : "") });
      // percents not computed yet (a few per request) — ask once more
      if (!again && r.items.some(function (n) { return n.pending; })) setTimeout(function () { loadNeighbours(true); }, 800);
    }, function () { clearTimeout(nbSlowTimer); if (!S.nb) { S.nbErr = true; S.nbSlow = false; render(); } });
  }
  function startEdit(step) { S.edit = step; S.form = {}; S.err = ""; S.preview = false; S.chatHelp = false; render(); window.scrollTo(0, 0); }
  function endEdit() { S.edit = null; S.editPart = null; S.form = {}; S.err = ""; S.preview = false; S.chatHelp = false; render(); window.scrollTo(0, 0); }

  Object.assign(A, {
    aIntsClose: function () { S.aTab = "overview"; S.aIntForm = null; S.aData.overview = null; render(); },
    saveChecklist: function () { save("checklist", { link: S.form.link || "" }, function () { S.preview = true; S.form = {}; }); },
    afterChecklist: function () { S.preview = false; S.fromSite = false; if (S.edit) endEdit(); else render(); },
    editConsent: function () { startEdit("consent"); },   // owner, 2026-10-27
    uniSw: function (el) { A.uniToggle({ dataset: { v: el.checked ? "1" : "0" } }); },
    spaceSw: function (el) { A.spaceToggle({ dataset: { v: el.checked ? "1" : "0" } }); },
    tab: function (el) {
      S.tab = el.dataset.v; S.open = null; S.cmp = null; S.pin = null; S.list = null; S.pMenu = false; S.note = ""; S.err = ""; S.mapFrom = null; S.swBack = false; S.fOpen = false;
      if (S.tab === "neighbours") loadNeighbours();
      if (S.tab === "matches") { loadMatches(); likesTab(likesNew() ? "wait" : "mutual"); }   // owner, 2026-11-03: new likes first
      if (S.tab === "chat") { S.chat = null; S.nchats = null; var uc = S.me.uchats || []; if (!S.me.nova && uc.length === 1) chatOpen(uc[0].id); }
      if (S.tab === "mod") { S.aData.reports = null; S.aData.profiles = null; if (S.cal) S.cal.mod = null; }
      if (S.tab === "cal" && S.cal) { S.cal.list = null; S.cal.mine = null; S.cal.open = null; S.cal.form = null; S.cal.stats = null; S.cal.hide = null; S.cal.gone = false; }
      render(); window.scrollTo(0, 0);
    },
    noop: function () {},
    aChat: function (el) { S.aChat = S.aChat === el.dataset.v ? "" : el.dataset.v; render(); },
    digest: function (el) { save("settings", { digest: el.checked }); },
    notifyLikes: function (el) { save("settings", { notify_likes: el.checked }); },
    fillOpen: function () { fillShow(true); },
    digestAns: function (el) { save("settings", { digest: el.dataset.v === "1" }); },
    pzAsk: function (el) { S.pzAsk = el.dataset.v; render(); },
    reportSend: function () {
      if (!S.report.reason) { S.err = t("e_bad_reason"); return render(); }
      if (S.busy) return;
      S.busy = true; S.err = ""; render();
      api("POST", "report", { id: S.report.id, reason: S.report.reason, text: S.form.rtext || "", msg: !!S.report.msg }).then(function (r) {
        S.busy = false;
        if (!r.ok) { S.err = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); haptic("error"); return render(); }
        S.report.sent = true; S.open = null; haptic("success"); render(); loadNeighbours(); loadMatches();
      }, function () { S.busy = false; S.err = t("netErr"); render(); });
    },
    // owner, 2026-10-26: chips add up; «Все» clears the group
    fBand: function (el) { S.fBands = toggleIn(S.fBands, el.dataset.v); S.zone = null; render(); },
    fRole: function (el) { S.fRoles = toggleIn(S.fRoles, el.dataset.v); S.zone = null; render(); },
    fQuick: function (el) { S.fQuick = toggleIn(S.fQuick, el.dataset.v); S.zone = null; render(); },
    openPerson: function (el) {
      if (S.tab === "neighbours" && S.nbView === "swipe" && !S.open) S.swBack = true;   // back returns to the same card in «Листать»
      if (el.dataset.from === "matches") { keepY("mt"); S.openFrom = "matches"; } else keepY("nb");   // owner, 2026-11-03: «Анкета» in «Взаимные»
      S.open = el.dataset.v; S.cmp = null; S.err = ""; render(); window.scrollTo(0, 0);
      var n = nbFind(S.open);
      // owner, 2026-10-28: the green «новый» goes at once when the profile is opened (for this viewer only)
      if (n && n.fresh) { n.fresh = false; api("POST", "seen", { id: n.id }).catch(function () { /* stays until the day is over */ }); }
      if (n && n.pending) api("GET", "person?id=" + encodeURIComponent(n.id)).then(function (r) { if (r.ok) { Object.assign(n, r.person); render(); loadInsight(n); } });
      S.insAll = false; loadInsight(n);
    },
    pClear: function () { S.fItems = []; S.fq = ""; S.found = null; S.zone = null; searchSeq++; render(); },
    chatShow: function (el) { var o = {}; o[el.dataset.v] = el.checked; save("settings", { chats: o }); },
    toggle: function (el) { var o = {}; o[el.dataset.v] = el.checked; save("profile", o); },
  });
  /* ===== app-src/13-staff-actions.js — Click handlers for the owner panel and moderation screens (their buttons are drawn by public/app/staff.js).
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */


  Object.assign(A, {
    // the owner: suggestions, filter hits, «who uses the most»
    aIntsOpen: function () { S.aIntMsg = ""; S.aTab = "ints"; S.aOpen = null; S.aData.ints = null; S.aIntForm = null; S.aIntNew = null; S.aIntEdit = null; render(); window.scrollTo(0, 0); },
    aIntEdit: function (el) { S.aIntEdit = el.dataset.v ? { id: +el.dataset.v } : null; S.form.aiEdName = null; S.form.aiEdSyn = ""; S.err = ""; render(); },
    aIntRename: function (el) {
      var E = S.aIntEdit, name = el.dataset.v === "reset" ? "" : String(S.form.aiEdName != null ? S.form.aiEdName : CAT.byId[E.id].name).trim();
      aIntPost({ action: "rename", item: E.id, name: name }, function () { S.aIntEdit = { id: E.id, msg: t("aIntsEdSaved") }; S.form.aiEdName = null; });
    },
    aIntSynAdd: function () {
      var E = S.aIntEdit, w = String(S.form.aiEdSyn || "").trim(); if (!w) return;
      aIntPost({ action: "syn_add", item: E.id, text: w }, function () { S.aIntEdit = { id: E.id, msg: t("aIntsEdSaved") }; S.form.aiEdSyn = ""; });
    },
    aIntSynDel: function (el) { var E = S.aIntEdit; aIntPost({ action: "syn_del", id: +el.dataset.v }, function () { S.aIntEdit = { id: E.id }; }); },
    aIntNew: function (el) { S.aIntNew = el.dataset.v ? { name: "", section: "", alt: "" } : null; S.form.aiNewName = ""; S.form.aiNewSec = ""; S.form.aiNewAlt = ""; S.err = ""; render(); },
    aIntNewAdd: function () {
      var F = S.aIntNew, name = String(S.form.aiNewName || F.name || "").trim();
      F.name = name; F.section = S.form.aiNewSec || ""; F.alt = String(S.form.aiNewAlt || "").trim();
      if (!+F.section) { S.err = t("e_bad_section"); return render(); }
      if (Array.from(name).length < 2) { S.err = t("e_bad_length"); return render(); }
      aIntPost({ action: "add", ids: [], name: name, section: +F.section, alt: F.alt }, function () {
        S.aIntNew = { name: "", section: F.section, alt: "", done: name }; S.form.aiNewName = ""; S.form.aiNewAlt = "";
        api("GET", "interests").then(function (x) { if (x.ok) { S.intSrv = x; render(); } });
      });
    },
    aIntForm: function (el) {
      if (!el.dataset.v) { S.aIntForm = null; return render(); }
      var g = S.aData.ints.groups[+el.dataset.i];
      S.aIntForm = { i: +el.dataset.i, kind: el.dataset.v, name: g.name, section: g.section, alt: g.alt || "", q: g.name };
      S.form.aiName = g.name; S.form.aiSec = String(g.section); S.form.aiAlt = g.alt || "";
      render();
    },
    aIntAdd: function (el) { aIntPost({ action: "add", ids: el.dataset.ids.split(",").map(Number), name: S.form.aiName, section: +S.form.aiSec, alt: S.form.aiAlt || "" }); },
    aIntAct: function (el) { aIntPost({ action: el.dataset.x, ids: el.dataset.ids.split(",").map(Number) }); },
    aIntBlock: function (el) {
      var on = el.dataset.on === "1";
      aIntPost({ action: "block", n: el.dataset.v, on: on }, function () { var d = S.aData.profile; if (d && d.profile && d.profile.n === el.dataset.v) d.profile.suggest_blocked = on; });
    },
    aWhoOpen: function (el) { S.aWhoOpen = !!el.dataset.v; if (!S.aWhoOpen) { S.aData.who1 = null; S.aData.who7 = null; } render(); },
    aWhoDays: function (el) { S.aWhoDays = +el.dataset.v; render(); },
    aOvTab: function (el) { S.aOvTab = el.dataset.v; render(); window.scrollTo(0, 0); },   // owner, 2026-11-02
    aRefresh: function () {   // owner, 2026-11-01: count the panel numbers again now
      S.aFreshUntil = Date.now() + 8000;
      Object.keys(S.aData).forEach(function (k) { if (/^(overview|usage|sum_|rem$|universe$|retention)/.test(k)) S.aData[k] = null; });
      render();
    },
    aTab: function (el) { S.aTab = el.dataset.v; S.aData[S.aTab] = null; S.aLate = false; if (S.cal) S.cal.admin = null;
      if (S.aTab === "overview") Object.keys(S.aData).forEach(function (k) { if (/^(usage|sum_|rem$|universe$)/.test(k)) S.aData[k] = null; });   /* fresh numbers */ S.mOpen = null; S.aChatPage = null; S.err = ""; if (S.aTab === "reports") S.aData.reports = null; render(); window.scrollTo(0, 0); },
    bkMake: function () {
      S.bk = { busy: true, msg: "" }; render();
      var chunks = [], done = 0, total = 0, tables;
      var fail = function () { S.bk = { msg: t("netErr") }; render(); };
      api("GET", "admin/backup").then(function (head) {
        if (!head.ok) return fail();
        tables = head.tables.slice(); Object.keys(head.counts).forEach(function (k) { total += head.counts[k]; });
        var next = function (after) {
          if (!tables.length) return finish();
          var tb = tables[0];
          api("GET", "admin/backup?t=" + tb + "&after=" + (after == null ? "" : after)).then(function (r) {
            if (!r.ok) return fail();
            if (r.d) chunks.push({ t: tb, d: r.d });
            done += r.rows; S.bk.msg = t("bkProgress", { n: done, total: total }); render();
            if (r.done) { tables.shift(); next(""); } else next(r.last);
          }, fail);
        };
        var finish = function () {
          var file = JSON.stringify({ format: "kinkoverse-backup", v: 1, version: S.aData.settings && S.aData.settings.version, at: new Date().toISOString(), counts: head.counts, chunks: chunks });
          var name = "kinkoverse-backup-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".json";
          var url = ""; try { url = URL.createObjectURL(new Blob([file], { type: "application/json" })); } catch (e) { /* no blobs */ }
          api("POST", "admin/backup-send", { file: file }).then(function (r) {
            S.bk = { msg: r.sent ? t("bkSent") : t("netErr"), url: url, name: name }; render();
          }, fail);
        };
        next("");
      }, fail);
    },
    bkFile: function (el) {
      var f = el.files && el.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try { var j = JSON.parse(rd.result); if (j.format !== "kinkoverse-backup" || !Array.isArray(j.chunks)) throw 0; S.bkFile = j; S.bk = { msg: f.name + " · " + j.chunks.length }; }
        catch (e) { S.bkFile = null; S.bk = { msg: t("bkBad") }; }
        render();
      };
      rd.readAsText(f);
    },
    bkRestore: function () {
      if (!S.bkFile) { S.bk = { msg: t("bkPick") }; return render(); }
      if (String(S.form.bkWord || "").trim().toUpperCase() !== t("bkWord")) { S.bk = { msg: t("bkRestoreNote") }; return render(); }
      var chunks = S.bkFile.chunks, i = 0;
      S.bk = { busy: true, msg: "" }; render();
      var fail = function (r) { S.bk = { msg: (r && r.error === "bad_backup") ? t("bkBad") : t("netErr") }; render(); };
      api("POST", "admin/restore-begin", { confirm: "RESTORE" }).then(function (r) {
        if (!r.ok) return fail(r);
        var next = function () {
          if (i >= chunks.length) { S.bk = { msg: t("bkRestored") }; render(); setTimeout(function () { location.reload(); }, 1200); return; }
          api("POST", "admin/restore-chunk", { t: chunks[i].t, d: chunks[i].d, last: i === chunks.length - 1 }).then(function (x) {
            if (!x.ok) return fail(x);
            i++; S.bk.msg = t("bkRestoring", { n: i, total: chunks.length }); render(); next();
          }, fail);
        };
        next();
      }, fail);
    },
    aSearch: function () {},
    mIntroOk: function () { S.me.mod.intro_seen = true; api("POST", "mod/intro-seen", {}); render(); },
    aSet: function (el) { var o = {}; o[el.dataset.v] = el.checked; api("POST", "admin/settings", o).then(function (r) { if (r.ok) { S.aData.settings = r; S.aData.retention = null; render(); } }); },
    aReport: function () { S.aData.reportText = t("loading"); render(); api("GET", "admin/debug-report").then(function (r) { S.aData.reportText = r.ok ? r.text : t("netErr"); render(); }); },
    aCalib: function () {
      var go = function (yes) { if (yes) api("POST", "admin/calib-send", {}).then(function (r) { if (r.ok) S.aData.calib = r.counts; else S.err = t("netErr"); render(); }); };
      askYes(t("aCalibConfirm"), go);
    },
    aReportSend: function () { api("POST", "admin/debug-send", {}).then(function (r) { S.aData.reportSent = !!r.sent; if (!r.sent) S.err = t("netErr"); render(); }); },
    aReportCopy: function () { try { navigator.clipboard.writeText(S.aData.reportText); } catch (e) { /* select by hand */ } },
    aPostButton: function (el) { api("POST", "admin/post-button", { chat_id: el.dataset.v }).then(function (r) { if (r.ok) { S.aData.overview = r; render(); } else { S.err = t("netErr"); render(); } }); },
    openKs: function (el) {
      var path = S.me.admin ? "admin/kslink" : (S.aOpen && S.me.mod) ? "mod/kslink" : "kslink";
      api("GET", path + "?id=" + encodeURIComponent(el.dataset.v)).then(function (r) {
        if (!r.ok) { S.err = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); return render(); }
        if (tg && tg.openLink) tg.openLink(r.link); else window.open(r.link, "_blank");
      });
    },
    aUnblock: function (el) {
      var go = function (yes) { if (yes) api("POST", "admin/unblock-chat", { chat_id: el.dataset.v }).then(function (r) { if (r.ok) { S.aData.overview = r; render(); } }); };
      var q = t("aUnblockConfirm", { chat: el.dataset.t });
      askYes(q, go);
    },
    accShow: function () {
      var n = S.aOpen; S.aData.account = { n: n, loading: true }; render();
      api("GET", (S.me.admin ? "admin/" : "mod/") + "account?id=" + encodeURIComponent(n)).then(function (r) {
        if (!r.ok) { S.aData.account = null; S.err = t("netErr"); return render(); }
        S.aData.account = { n: n, account: r.account }; render(); loadPhotos();
      });
    },
    accOpen: function () { var l = S.aData.account.account.link; if (tg && tg.openTelegramLink) tg.openTelegramLink(l); else window.open(l, "_blank"); },
    accLink: function () { api("POST", (S.me.admin ? "admin/" : "mod/") + "account-link", { id: S.aOpen }).then(function (r) { if (r.ok) { S.aData.account.sent = true; render(); } }); },
    aNovaAsk: function (el) {
      var n = el.dataset.v, go = function (yes) {
        if (!yes) return;
        api("POST", "admin/nova", { q: "#" + n, action: "light" }).then(function (r) {
          if (!r.ok) { S.aStarMsg = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); return render(); }
          S.aStarMsg = ""; S.aData.novas = null; starsDrop();
          if (S.aOpen === n) mLoad("profile", "admin/profile?id=" + encodeURIComponent(n));
          render();
        });
      }, q = t("aNovaAskQ", { nick: el.dataset.t });
      askYes(q, go);
    },
    // owner, 2026-11-03: the supernova's contact after a mutual like — the owner's account or its own
    aNovaContact: function (el) {
      var id = el.dataset.v, c = el.dataset.c;
      askYes(t(c === "owner" ? "aNovaContactQ" : "aNovaContactQSelf", { nick: el.dataset.t }), function () {
        api("POST", "admin/nova", { id: id, action: "contact", value: c }).then(function (r) { if (r.ok) S.aData.novas = null; else S.err = t("netErr"); render(); });
      });
    },
    aNovaChats: function (el) { S.aNovaOpen = S.aNovaOpen === el.dataset.v ? null : el.dataset.v; render(); },
    aNovaRemove: function (el) {
      var id = el.dataset.v;
      confirm2(t("aNovaDel1", { nick: el.dataset.t }), t("aNovaDel2"), function () { api("POST", "admin/nova", { id: id, action: "remove" }).then(function () { S.aData.novas = null; starsDrop(); if (S.aOpen === id) mLoad("profile", "admin/profile?id=" + encodeURIComponent(id)); render(); }); });
    },
    aChatRead: function (el) { S.aChatRead = Number(el.dataset.v); S.aData.chatRead = null; render(); window.scrollTo(0, 0); api("GET", "admin/chat?c=" + S.aChatRead).then(function (r) { if (r.ok) { S.aData.chatRead = r; render(); } }); },
    aChatReadClose: function () { S.aChatRead = null; S.aData.chatRead = null; render(); },
    aChatDel: function (el) {
      var c = Number(el.dataset.v);
      confirm2(t("chDel1", { nick: el.dataset.t }), t("chDel2"), function () { api("POST", "admin/chat-delete", { c: c }).then(function () { S.aChatRead = null; S.aData.chatRead = null; S.aData.novas = null; render(); }); });
    },
    mTab: function (el) { S.mTab = el.dataset.v; S.err = ""; render(); },
    mState: function (el) { S.mState = el.dataset.v; S.aData.reports = null; render(); },
    mOpen: function (el) { keepY("m"); S.mOpen = +el.dataset.v; S.aData.report = null; S.err = ""; render(); window.scrollTo(0, 0); mLoad("report", "mod/report?id=" + S.mOpen); },
    mClose: function () { S.mOpen = null; S.err = ""; S.aData.reports = null; backY("m"); render(); },
    mAct: function (el) { modPost("mod/" + el.dataset.v, { id: S.mOpen }); },
    mDecide: function (el) {
      var d = el.dataset.v, q = d === "dismiss" ? t("dConfirmDismiss") : d === "ban" && !S.me.admin ? t("dConfirmPropose") : t("dConfirm", { d: t("d_" + d) });
      var go = function (yes) { if (yes) modPost("mod/decide", { id: S.mOpen, decision: d }); };
      askYes(q, go);
    },
    mBanApprove: function () { confirm2(t("mBanApproveQ"), t("mBanApproveQ2"), function () { modPost("mod/approve", { id: S.mOpen }); }); },
    mBanReject: function () {
      var go = function (yes) { if (yes) modPost("mod/reject", { id: S.mOpen }); };
      askYes(t("mBanRejectQ"), go);
    },
    mUndo: function () {
      var go = function (yes) { if (yes) modPost("mod/undo", { id: S.mOpen }); };
      askYes(t("mUndoConfirm"), go);
    },
    mQuit: function () {
      var go = function (yes) { if (yes) api("POST", "mod/quit", {}).then(function () { load(); }); };
      askYes(t("mQuitConfirm"), go);
    },
    iScope: function (el) {
      var v = el.dataset.v;
      if (!v) S.inviteScope = [];
      else { var i = S.inviteScope.indexOf(v); if (i >= 0) S.inviteScope.splice(i, 1); else S.inviteScope.push(v); }
      S.invite = null; render();
    },
    iMake: function () {
      if (S.busy) return;
      S.busy = true; render();
      api("POST", "admin/invite", { scope: S.inviteScope.length ? S.inviteScope : null }).then(function (r) {
        S.busy = false; if (r.ok) S.invite = r; else S.err = t("netErr"); render();
      }, function () { S.busy = false; S.err = t("netErr"); render(); });
    },
    iCopy: function () {
      var done = function () { S.invite.copied = true; render(); };
      try { navigator.clipboard.writeText(S.invite.link).then(done, function () { var i = app.querySelector("input[readonly]"); if (i) { i.select(); document.execCommand("copy"); done(); } }); }
      catch (e) { var i = app.querySelector("input[readonly]"); if (i) { i.select(); document.execCommand("copy"); done(); } }
    },
    iShare: function () { var u = "https://t.me/share/url?url=" + encodeURIComponent(S.invite.link); if (tg && tg.openTelegramLink) tg.openTelegramLink(u); else window.open(u, "_blank"); },
    iRevoke: function () { api("POST", "admin/invite-revoke", { code: S.invite.code }).then(function () { S.invite = { revoked: true }; render(); }); },
    aModRemove: function (el) {
      var go = function (yes) { if (yes) api("POST", "admin/mod-remove", { n: el.dataset.v }).then(function (r) { if (r.ok) { S.aData.mods = r; render(); } }); };
      var q = t("aRemoveConfirm", { name: el.dataset.t });
      askYes(q, go);
    },
    aStage: function (el) { S.aStage = el.dataset.v; render(); },
    aGender: function (el) { S.aGender = el.dataset.v; render(); },
    aSort: function (el) { S.aSort = el.value; render(); },
    aLateOff: function () { S.aLate = false; render(); },
    aNewVisible: function () { S.aTab = "profiles"; S.aData.profiles = null; S.aSort = "visible"; S.aStage = "all"; S.aLate = true; S.aQuery = ""; S.aChat = ""; S.aOpen = null; render(); window.scrollTo(0, 0); },
    aChatSel: function (el) { S.aChat = el.value; render(); },
    aToggle: function (el) { S[el.dataset.v] = !S[el.dataset.v]; render(); },
    aAbout: function (el) {   // owner, 2026-10-27
      var n = el.dataset.v, x = el.dataset.x;
      var go = function (yes) { if (!yes) return; api("POST", "admin/about", { id: n, action: x }).then(function () { mLoad("profile", "admin/profile?id=" + encodeURIComponent(n)); S.aData.overview = null; }); };
      if (x === "hide") { askYes(t("aAboutHideQ"), go); } else go(true);
    },
    aLinkNote: function (el) { api("POST", "admin/link", { note: +el.dataset.v, action: el.dataset.x }).then(function () { S.aData.overview = null; render(); }); },
    aLinkAct: function (el) { var n = el.dataset.n; api("POST", "admin/link", { link: +el.dataset.v, action: el.dataset.x }).then(function () { starsDrop(); if (S.aOpen === n) mLoad("profile", "admin/profile?id=" + encodeURIComponent(n)); render(); }); },
    aAboutOk: function (el) { api("POST", "admin/about", { log: el.dataset.l, action: "seen" }).then(function () { S.aData.overview = null; render(); }); },
    aAboutAgain: function (el) { api("POST", "admin/about", { id: el.dataset.v, log: el.dataset.l, action: "hide" }).then(function () { S.aData.overview = null; render(); }); },
    txSub: function (el) { S.txSub = el.dataset.v; S.txOpen = null; S.txMsg = ""; if (S.txSub === "journal") S.aData.journal = null; render(); },
    txSearch: function () {},
    txOpen: function (el) { S.txOpen = el.dataset.v; S.txMsg = ""; S.txErr = null; S.form.tx_ru = null; S.form.tx_en = null; render(); window.scrollTo(0, 0); },
    txClose: function () { S.txOpen = null; S.txErr = null; S.txMsg = ""; render(); },
    txSave: function (el) {
      var lang = el.dataset.v, it = (S.aData.texts.items || []).filter(function (i) { return i.key === S.txOpen; })[0], v = S.form["tx_" + lang];
      if (!it || v == null) return;
      S.busy = true; S.txErr = null; render();
      api("POST", "admin/texts", { key: it.key, lang: lang, value: v }).then(function (r) {
        S.busy = false;
        if (!r.ok) { S.txErr = { lang: lang, text: t("e_" + r.error, { v: (r.vars || []).map(function (x) { return "{" + x + "}"; }).join(", ") }) }; return render(); }
        S.aData.texts = r; S.form["tx_" + lang] = null; S.txMsg = t("txSaved"); render();
      }, function () { S.busy = false; S.txErr = { lang: lang, text: t("netErr") }; render(); });
    },
    txReset: function (el) {
      var lang = el.dataset.v, key = S.txOpen;
      var go = function (yes) { if (!yes) return; api("POST", "admin/texts", { key: key, lang: lang, reset: true }).then(function (r) { if (r.ok) { S.aData.texts = r; S.form["tx_" + lang] = null; S.txMsg = t("txSaved"); } render(); }); };
      askYes(t("txResetQ"), go);
    },
    dmFind: function () {},
    dmPick: function (el) { S.dmTo = { n: el.dataset.v, nick: el.dataset.nick }; S.dmMsg = null; S.form.dmText = ""; render(); },
    dmChange: function () { S.dmTo = null; S.dmMsg = null; render(); },
    dmSend: function () {
      var to = S.dmTo, txt = String(S.form.dmText || "").trim(); if (!to || !txt) return;
      var go = function (yes) {
        if (!yes) return;
        S.busy = true; render();
        api("POST", "admin/dm", { id: to.n, text: txt, button: S.form.dmBtn !== false }).then(function (r) {
          S.busy = false;
          if (!r.ok) { S.dmMsg = { ok: false, text: hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr") }; return render(); }
          S.dmMsg = { ok: r.sent, text: t(r.sent ? "dmSent" : "dmFailed") }; S.aData["dm_" + to.n] = r; if (r.sent) S.form.dmText = ""; render();
        }, function () { S.busy = false; S.dmMsg = { ok: false, text: t("netErr") }; render(); });
      };
      askYes(t("dmSendQ", { name: to.nick }), go);
    },
    aStarTab: function (el) { S.aStarTab = el.dataset.v; S.aStarMsg = ""; render(); },
    aStarSearch: function () {},
    aStarAsk: function (el) { S.aStarAsk = { n: el.dataset.v, nick: el.dataset.nick, g: el.dataset.g, later: !!el.dataset.later }; S.form.aStarNote = ""; S.aStarErr = ""; render(); },
    aStarCancel: function () { S.aStarAsk = null; render(); },
    aStarDo: function () {
      var a = S.aStarAsk; if (!a || S.busy) return;
      S.busy = true; render();
      api("POST", "admin/star", { id: a.n, action: "light", note: S.form.aStarNote || "" }).then(function (r) {
        S.busy = false;
        if (!r.ok) { S.aStarErr = r.error === "not_active" ? t("aStarCant") : t("netErr"); return render(); }
        S.aStarAsk = null; S.aStarMsg = t(r.sent ? "aStarSent" : "aStarNotSent"); starsDrop();
        if (S.aOpen === a.n) mLoad("profile", "admin/profile?id=" + encodeURIComponent(a.n));
        render();
      }, function () { S.busy = false; S.aStarErr = t("netErr"); render(); });
    },
    aStarOut: function (el) { starAct(el.dataset.v, "out", t("aStarOutQ", { name: el.dataset.nick })); },
    aStarUncap: function (el) { starAct(el.dataset.v, "uncaption", t("aStarUncapQ", { c: el.dataset.c })); },
    aOpen: function (el) { if (!S.aOpen) keepY("a"); S.aOpen = el.dataset.v; S.grantMsg = ""; S.form.grantN = ""; S.aData.profile = null; render(); window.scrollTo(0, 0); mLoad("profile", (S.me.admin ? "admin/" : "mod/") + "profile?id=" + encodeURIComponent(S.aOpen)); },
    aClose: function () { dropAccount(); S.aOpen = null; S.fromRef = false; backY("a"); render(); },
    aRepTab: function (el) { S.aRepTab = el.dataset.v; S.err = ""; render(); },
    aRefsOpen: function () { S.aTab = "reports"; S.aRepTab = "refs"; S.aData.refs = null; render(); window.scrollTo(0, 0); },
    aRefCan: function (el) {
      api("POST", "admin/can-invite", { id: el.dataset.v, on: el.dataset.on === "1" }).then(function (r) {
        if (r.ok && S.aData.profile && S.aData.profile.referrals) S.aData.profile.referrals.can = el.dataset.on === "1";
        if (!r.ok) S.err = t("netErr"); render();
      });
    },
    aGrant: function (el) {
      var v = parseInt(S.form.grantN, 10), id = el.dataset.v; if (!v) return;
      S.busy = true; S.grantMsg = ""; render();
      api("POST", "admin/msg-grant", { id: id, n: v }).then(function (r) {
        S.busy = false;
        if (!r.ok) { S.err = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); return render(); }
        S.form.grantN = ""; S.grantMsg = t("aGrantOk", { b: r.balance });
        var R = S.aData.profile && S.aData.profile.referrals; if (R) { R.balance = r.balance; R.granted = (R.granted || 0) + r.changed; }
        render();
      }, function () { S.busy = false; S.err = t("netErr"); render(); });
    },
    aRefToggle: function (el) { S.aRefOpen = !el.parentNode.open; },
    aWordsSave: function () {
      api("POST", "admin/contact-words", { words: S.form.cwords != null ? S.form.cwords : "" }).then(function (r) {
        if (r.ok) { S.aWordsOk = true; S.form.cwords = r.words.join("\n"); if (S.aData.texts) S.aData.texts.contact_words = S.form.cwords; render(); setTimeout(function () { S.aWordsOk = false; render(); }, 2000); }
        else { S.err = t("netErr"); render(); }
      });
    },
    refState: function (el) { S.refState = el.dataset.v; S.aData.refs = null; render(); },
    refOpen: function (el) { S.fromRef = true; A.aOpen(el); },
    refDecide: function (el) {
      if (S.busy) return;
      S.busy = true; S.err = ""; render();
      api("POST", "mod/referral", { id: el.dataset.v, decision: el.dataset.x }).then(function (r) {
        S.busy = false;
        if (!r.ok) { S.err = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); return render(); }
        S.aData.refs = null; render();
      }, function () { S.busy = false; S.err = t("netErr"); render(); });
    },
    aBlock: function (el) {
      var id = el.dataset.v, title = el.dataset.t;
      confirm2(t("aBlockConfirm", { chat: title }), t("aBlockConfirm2", { chat: title }), function () {
        api("POST", "admin/block-chat", { chat_id: id }).then(function (r) { if (r.ok) { S.aData.overview = r; render(); } else { S.err = t("netErr"); render(); } });
      });
    },
    aChatOpen: function (el) { keepY("c"); S.aChatPage = el.dataset.v; S.err = ""; render(); window.scrollTo(0, 0); },
    aChatClose: function () { S.aChatPage = null; S.err = ""; backY("c"); render(); },
    aSumPer: function (el) { S.aSumPer = el.dataset.v; render(); },
    aRemSet: function (el) { api("POST", "admin/reminders", { on: el.checked }).then(function (r) { if (r.ok) S.aData.rem = r; render(); }); },
    aMutOpen: function () { Object.keys(S.aData).forEach(function (k) { if (/^mut_/.test(k)) S.aData[k] = null; }); S.aMutPage = true; S.err = ""; render(); window.scrollTo(0, 0); },
    aMutClose: function () { S.aMutPage = false; render(); },
    aMutState: function (el) { S.aMutState = el.dataset.v; render(); },
    aMutDays: function (el) { S.aMutDays = +el.dataset.v; render(); },
    aMapOpen: function () { S.aMapPage = true; S.aMapView = null; Object.keys(S.aData).forEach(function (k) { if (/^map_/.test(k)) S.aData[k] = null; }); render(); window.scrollTo(0, 0); },
    aMapClose: function () { S.aMapPage = false; if (STAFF) STAFF.dropAdminMap(); render(); },
    aMapLabels: function () { S.aMapLabels = !S.aMapLabels; render(); },
    aMapF: function (el) { S.aMapF = S.aMapF || { from: "all", gender: "", role: "" }; S.aMapF[el.dataset.k] = el.dataset.v; render(); },
    aUniOpen: function () { S.aUniPage = true; S.err = ""; render(); window.scrollTo(0, 0); },
    aUniClose: function () { S.aUniPage = false; S.err = ""; render(); },
    aUniAct: function (el) {
      var act = el.dataset.v, chat = el.dataset.c, q = { add: "aUniConfirmAdd", accept: "aUniConfirmAdd", remove: "aUniConfirmRemove", decline: "aUniConfirmDecline" }[act];
      var go = function (yes) { if (!yes) return; api("POST", "admin/universe", { chat_id: chat, action: act }).then(function (r) { if (r.ok) S.aData.universe = r; else S.err = t("netErr"); render(); }); };
      askYes(t(q, { chat: el.dataset.t }), go);
    },
    aSpaceInvite: function () {
      var n = S.aData.universe ? S.aData.universe.no_chat : 0;
      var go = function (yes) { if (!yes) return; api("POST", "admin/space-invite").then(function (r) { if (r.ok) { S.aData.universe = r; S.aData.spaceSent = r.sent; } else S.err = t("netErr"); render(); }); };
      askYes(t("aNoChatConfirm", { n: n }), go);
    },
    aBan: function () {
      var n = S.aOpen;
      confirm2(t("aBlockUserConfirm", { n: n }), t("aBlockUserConfirm2"), function () {
        api("POST", "admin/ban", { id: n }).then(function (r) { if (r.ok) { S.aData.profile = r; S.aData.profiles = null; render(); } else { S.err = t("netErr"); render(); } });
      });
    },
    aResetPlace: function () {
      var n = S.aOpen, go = function (yes) { if (yes) api("POST", "admin/reset-place", { id: n }).then(function (r) { if (r.ok) { S.aData.profile = r; render(); if (tg && tg.showAlert) tg.showAlert(t("aResetPlaceDone")); } else { S.err = t("netErr"); render(); } }); };
      askYes(t("aResetPlaceConfirm"), go);
    },
    aUnban: function () {
      var n = S.aOpen, go = function (yes) { if (yes) api("POST", "admin/unban", { id: n }).then(function (r) { if (r.ok) { S.aData.profile = r; S.aData.profiles = null; render(); } else { S.err = t("netErr"); render(); } }); };
      askYes(t("aUnbanConfirm", { n: n }), go);
    },
    aLinkGo: function (el) {   // owner, 2026-11-02: a star's link in the owner panel opens (not counted as a click)
      var u = el.dataset.u;
      if (/^https:\/\/(t\.me|telegram\.me)\//i.test(u) && tg && tg.openTelegramLink) tg.openTelegramLink(u);
      else if (tg && tg.openLink) tg.openLink(u); else window.open(u, "_blank", "noopener");
    },
    aStarActs: function (el) { S.aStarAct = S.aStarAct === el.dataset.v ? null : el.dataset.v; render(); },

    // owner, 2026-11-07: «Подозрительная анкета» (the owner only; the person is not told)
    aSusEdit: function (el) {
      var d = S.aData.profile, cur = d && d.sus;
      S.aSus = el.dataset.v ? { n: el.dataset.v, reason: cur ? cur.reason : "" } : null; S.form.aSusNote = null; render();
    },
    aSusWhy: function (el) { if (S.aSus) { S.aSus.reason = el.dataset.v; render(); } },
    aSusSave: function (el) { susPost({ id: el.dataset.v, on: true, reason: S.aSus && S.aSus.reason, note: S.form.aSusNote != null ? S.form.aSusNote : ((S.aData.profile && S.aData.profile.sus) || {}).note || "" }); },
    aSusOff: function (el) { var n = el.dataset.v; askYes(t("aSusOffQ"), function (y) { if (y) susPost({ id: n, on: false }); }); },
    // owner, 2026-11-07: «Видимость: почему» — asked only on a tap; a second tap on the same button closes it
    aWhy: function (el) {
      var n = el.dataset.v, dir = el.dataset.x;
      if (S.aWhy && S.aWhy.n === n && S.aWhy.dir === dir) { S.aWhy = null; return render(); }
      var W = S.aWhy = { n: n, dir: dir, r: null }; render();
      api("GET", "admin/whynot?id=" + encodeURIComponent(n) + "&dir=" + dir).then(function (r) {
        if (S.aWhy !== W) return;   // another tap meanwhile
        if (r.ok) W.r = r; else W.err = true; render();
      }, function () { if (S.aWhy === W) { W.err = true; render(); } });
    },
    // owner, 2026-11-07: delete an item the owner added — it leaves every profile; the question shows how many people have it
    aIntDel: function (el) {
      var item = +el.dataset.v; if (S.busy) return;
      api("POST", "admin/interests", { action: "del_count", item: item }).then(function (c) {
        if (!c.ok) { S.err = hasT("e_" + c.error) ? t("e_" + c.error) : t("netErr"); return render(); }
        var nm = CAT && CAT.byId[item] ? CAT.byId[item].name : "#" + item;
        confirm2(t("aIntsDelQ", { x: nm, n: c.people }), t("aIntsDelQ2"), function () {
          aIntPost({ action: "delete", item: item }, function (r) { S.aIntEdit = null; S.aiCatQ = ""; S.aIntMsg = t("aIntsDeleted", { x: nm, n: r.removed_from });
            api("GET", "interests").then(function (x) { if (x.ok) { S.intSrv = x; render(); } }); });
        });
      }, function () { S.err = t("netErr"); render(); });
    },
    // owner, 2026-11-07: «Сообщения» — the next page
    lmMore: function () {
      var x = S.aData.lmsgs; if (!x || !x.next || S.lmBusy) return;
      S.lmBusy = true; render();
      api("GET", "admin/likemsgs?before=" + encodeURIComponent(x.next)).then(function (r) {
        S.lmBusy = false;
        if (r.ok && S.aData.lmsgs === x) { x.items = x.items.concat(r.items); x.next = r.next; } else if (!r.ok) S.err = t("netErr");
        render();
      }, function () { S.lmBusy = false; S.err = t("netErr"); render(); });
    },
    // owner, 2026-11-07: «Отправить всем»
    bcOpen: function () { S.aTab = "texts"; S.txSub = "bc"; S.txOpen = null; render(); window.scrollTo(0, 0); },
    bcTpl: function () {
      var go = function () { S.form.bcText = t("bcTpl"); if (S.bc) S.bc.msg = ""; render(); };
      if (String(S.form.bcText || "").trim()) askYes(t("bcTplQ"), function (y) { if (y) go(); }); else go();
    },
    bcAud: function (el) { S.bc.audience = el.dataset.v; S.bc.msg = ""; render(); },
    bcButton: function () { S.bc.button = !S.bc.button; render(); },
    bcSend: function () {
      var B = S.bc, info = S.aData["bc_" + B.audience], text = String(S.form.bcText || "").trim();
      if (!text || !info || B.sending || S.busy) return;
      confirm2(t("bcQ1", { n: info.count, a: t("bcAud_" + B.audience) }), t("bcQ2"), function () {
        S.busy = true; B.msg = ""; render();
        api("POST", "admin/broadcast", { text: text, audience: B.audience, button: !!B.button, photo: B.photo || null }).then(function (r) {
          S.busy = false;
          if (!r.ok) { B.msg = hasT("bcE_" + r.error) ? t("bcE_" + r.error) : t("netErr"); B.bad = true; dropBcInfo(); return render(); }
          B.total = r.total; B.waiting = r.total; B.bad = false; S.form.bcText = ""; B.photo = null; if (B.photoUrl) { URL.revokeObjectURL(B.photoUrl); B.photoUrl = null; }
          bcLoop();
        }, function () { S.busy = false; B.msg = t("netErr"); B.bad = true; render(); });
      });
    },
    bcPhotoDel: function () { var B = S.bc; B.photo = null; if (B.photoUrl) URL.revokeObjectURL(B.photoUrl); B.photoUrl = null; render(); },
    bcPush: function () { var B = S.bc, info = S.aData["bc_" + B.audience]; if (B.sending) return; B.total = (info && info.waiting) || 1; B.waiting = B.total; bcLoop(); },
  });

  function susPost(body) {
    if (S.busy) return;
    S.busy = true; S.err = ""; render();
    api("POST", "admin/sus", body).then(function (r) {
      S.busy = false;
      if (!r.ok) { S.err = t("netErr"); return render(); }
      S.aSus = null; S.form.aSusNote = null; S.aData.profiles = null;
      mLoad("profile", "admin/profile?id=" + encodeURIComponent(body.id));
      render();
    }, function () { S.busy = false; S.err = t("netErr"); render(); });
  }
  function dropBcInfo() { Object.keys(S.aData).forEach(function (k) { if (/^bc_/.test(k)) S.aData[k] = null; }); }
  /* one loop at a time; each call sends the next 25 (the Worker's limit on Telegram calls per request). If the panel is
     closed or the network fails, the hourly job sends the rest. */
  function bcLoop() {
    var B = S.bc; if (B.sending) return;
    B.sending = true; render();
    var stop = function (msg, bad) { B.sending = false; B.msg = msg; B.bad = !!bad; dropBcInfo(); render(); };
    var step = function () {
      api("POST", "admin/broadcast-push", {}).then(function (r) {
        if (!r.ok) return stop(t("bcLater"), true);
        B.waiting = r.waiting; render();
        if (r.waiting > 0) setTimeout(step, 400); else stop(t("bcDone", { n: B.total }));
      }, function () { stop(t("bcLater"), true); });
    };
    step();
  }

  /* owner, 2026-11-07: a photo for «Отправить всем» — made smaller on the phone (≤ 1600 px, JPEG), then sent as it is
     (no JSON) to /api/admin/broadcast-photo; Telegram keeps it, we keep only its file_id */
  function bcPhotoUp(file) {
    var B = S.bc; if (!B || B.upBusy) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { B.msg = t("bcE_bad_type"); B.bad = true; return render(); }
    B.upBusy = true; B.msg = ""; render();
    var done = function (msg) { B.upBusy = false; if (msg) { B.msg = msg; B.bad = true; } render(); };
    var img = new Image(), src = URL.createObjectURL(file);
    img.onerror = function () { URL.revokeObjectURL(src); done(t("bcE_bad_type")); };
    img.onload = function () {
      var k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(src);
      c.toBlob(function (blob) {
        if (!blob) return done(t("netErr"));
        fetch("/api/admin/broadcast-photo", { method: "POST", headers: { "authorization": "tma " + (tg ? tg.initData : ""), "content-type": "image/jpeg" }, body: blob })
          .then(function (r) { return r.json(); }).then(function (r) {
            if (!r.ok) return done(hasT("bcE_" + r.error) ? t("bcE_" + r.error) : t("netErr"));
            if (B.photoUrl) URL.revokeObjectURL(B.photoUrl);
            B.photo = r.photo; B.photoUrl = URL.createObjectURL(blob); B.msg = t("bcPhotoOk"); B.bad = false; done();
          }, function () { done(t("netErr")); });
      }, "image/jpeg", 0.88);
    };
    img.src = src;
  }
  /* ===== app-src/13a-speed.js — Speed (owner, 2026-11-07): quiet-time prefetch, a small memory of recent people, timers.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). =====

     Prefetch rules (the owner: fast tapping must never pile up requests):
     - each screen says what it would like ahead (prefetch(key, fn) while it is drawn); the next drawing replaces that wish
       list, so wishes of screens already left are dropped, never sent;
     - nothing starts until the screen has been still for ~1 s after the last drawing or tap;
     - one request at a time; a key is asked for once per session (a failure may be retried later);
     - nothing on Save-Data or a 2g connection, nothing while the app is hidden. */
  var pf = { want: [], next: [], busy: false, timer: 0, done: {} };
  function pfOff() {
    var c = navigator.connection || {};
    return !!(c.saveData || /(^|-)2g$/.test(c.effectiveType || "") || document.hidden);
  }
  function prefetch(key, fn) {
    if (pf.done[key] || pf.next.some(function (x) { return x.key === key; })) return;
    pf.next.push({ key: key, fn: fn });
  }
  function pfBegin() { pf.next = []; }
  function pfEnd() { pf.want = pf.next; pf.next = []; pfQuiet(); }
  function pfQuiet() { clearTimeout(pf.timer); if (pf.want.length) pf.timer = setTimeout(pfRun, 1000); }
  function pfRun() {
    if (pf.busy || !pf.want.length) return;
    if (pfOff()) return;   // asked again on the next drawing / when the app comes back
    var job = pf.want.shift();
    if (pf.done[job.key]) return pfRun();
    pf.busy = true; pf.done[job.key] = 1;
    var end = function (ok) { pf.busy = false; if (!ok) delete pf.done[job.key]; if (pf.want.length) pf.timer = setTimeout(pfRun, 300); };
    var p; try { p = job.fn(); } catch (e) { p = null; }
    if (p && p.then) p.then(function (r) { end(!r || r.ok !== false); }, function () { end(false); }); else end(true);
  }
  document.addEventListener("pointerdown", pfQuiet, { passive: true });   // a tap: wait for the next still second
  document.addEventListener("visibilitychange", function () { if (!document.hidden) pfQuiet(); });

  /* a small memory of the people looked at lately: their portrait (insight), answers list and comparison — 30 people,
     the oldest forgotten first, so a long session does not keep growing */
  var lru = [];
  function lruTouch(id) {
    var i = lru.indexOf(id); if (i >= 0) lru.splice(i, 1); lru.push(id);
    while (lru.length > 30) { var old = lru.shift(); delete S.ins[old]; delete pcache.list[old]; delete pcache.cmp[old]; }
  }
  var pcache = { list: {}, cmp: {} };
  /** the portrait of one neighbour, without drawing (used by prefetch and by loadInsight) */
  function insightGet(n) {
    lruTouch(n.id);
    return api("GET", "insight?id=" + encodeURIComponent(n.id)).then(function (r) { S.ins[n.id] = r.ok ? r : { err: 1 }; return r; });
  }
  function listGet(id) {
    if (pcache.list[id]) return Promise.resolve(pcache.list[id]);
    lruTouch(id);
    return api("GET", "list?id=" + encodeURIComponent(id)).then(function (r) { if (r.ok) pcache.list[id] = r; return r; });
  }
  function cmpGet(id) {
    if (pcache.cmp[id]) return Promise.resolve(pcache.cmp[id]);
    lruTouch(id);
    return api("GET", "compare?id=" + encodeURIComponent(id)).then(function (r) { if (r.ok) pcache.cmp[id] = r; return r; });
  }
  /** what each screen would like ahead (called at the end of every drawing) */
  function pfScreen() {
    if (!S.me || !S.me.active || S.me.admin || S.edit) return;
    if (S.tab === "neighbours" && !S.open) {
      if (!S.matches) prefetch("matches", function () { return api("GET", "matches").then(function (r) { if (r.ok && !S.matches) S.matches = r.items; return r; }); });
      if (S.nbView === "list") prefetch("leaflet", function () { return new Promise(function (ok) { loadLeaflet(function () { ok({ ok: true }); }); setTimeout(function () { ok({ ok: true }); }, 15000); }); });
    }
    if (S.open && !S.list && !S.cmp) {
      var n = nbFind(S.open);
      if (n && n.compare) { prefetch("list:" + n.id, function () { return listGet(n.id); }); prefetch("cmp:" + n.id, function () { return cmpGet(n.id); }); }
    }
    if (S.tab === "profile") {
      if (!S.inv) prefetch("invites", function () { return api("GET", "invites").then(function (r) { if (r.ok && !S.inv) S.inv = r; return r; }); });
      if (!CAT) prefetch("catalog", function () { loadCat(); return null; });
    }
  }

  /* timers (owner, 2026-11-07): how long the person page, the comparison, the constellation and the swipe card take — to
     the debug log while debug is on (app:timing), so «/api/me in parallel» and the rest are decided by numbers */
  var tim = {};
  function timeStart(k) { tim[k] = Date.now(); }
  function timeEnd(k) { if (!tim[k]) return; var ms = Date.now() - tim[k]; delete tim[k]; dbg({ kind: "timing", message: "app:timing " + k + " " + ms + " ms" }); }

  /* a copy on the phone (owner, 2026-11-07: «store everything that speeds the app up»): the last neighbours list and
     mutual likes, per Telegram account, shown at once on the next start while the fresh ones are asked for. Ignored when
     older than 7 days; at most ~2 MB; «Профиль → Настройки → Данные на этом телефоне · Очистить» and deleting the
     account remove it. */
  var PHONE_DAYS = 7, PHONE_MAX = 2000000;
  function phoneKey(name) { var u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user; return u && u.id ? "kv1:" + u.id + ":" + name : null; }
  function phoneGet(name) {
    try {
      var k = phoneKey(name), raw = k && localStorage.getItem(k); if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || Date.now() - o.at > PHONE_DAYS * 86400000) { localStorage.removeItem(k); return null; }
      return o.v;
    } catch (e) { return null; }
  }
  function phonePut(name, v) {
    try {
      var k = phoneKey(name); if (!k) return;
      var raw = JSON.stringify({ at: Date.now(), v: v });
      if (raw.length * 2 > PHONE_MAX) { localStorage.removeItem(k); return; }
      var used = 0; phoneKeys().forEach(function (x) { if (x !== k) used += (localStorage.getItem(x) || "").length * 2; });
      if (used + raw.length * 2 > PHONE_MAX) phoneClear();
      localStorage.setItem(k, raw);
    } catch (e) { /* full or blocked: the app works without it */ }
  }
  function phoneKeys() { var a = []; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf("kv1:") === 0) a.push(k); } } catch (e) { /* none */ } return a; }
  function phoneSize() { var n = 0; phoneKeys().forEach(function (k) { try { n += (localStorage.getItem(k) || "").length * 2; } catch (e) { /* skip */ } }); return n; }
  function phoneClear() { phoneKeys().forEach(function (k) { try { localStorage.removeItem(k); } catch (e) { /* skip */ } }); }
  /* ===== app-src/14-start.js — Coordinates parsing, DOM listeners (click / change / input dispatch to A), load(), start-up.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  /** «55.7558, 37.6173», «55,7558 37,6173», geo:…, or a Google / Yandex / OSM / Apple / 2GIS link → { lat, lon } | null.
      The point goes to the server once and is turned into an area there (never kept). */
  function parseCoords(text) {
    var s = String(text || "").trim(), m;
    if (!s) return null;
    try { s = decodeURIComponent(s); } catch (e) { /* as is */ }
    var ok = function (lat, lon) { lat = +lat; lon = +lon; return isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0) ? { lat: lat, lon: lon } : null; };
    // Yandex: ll= / pt= / whatshere[point]= are «longitude,latitude»
    if ((m = /(?:[?&](?:ll|pt|whatshere\[point\])=)(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(s)) && /yandex|ya\.ru/.test(s)) return ok(m[2], m[1]);
    // 2GIS: /geo/lon,lat or m=lon,lat
    if (/2gis/.test(s) && (m = /(?:\/geo\/|[?&]m=)(-?\d+(?:\.\d+)?)(?:,|%2C)(-?\d+(?:\.\d+)?)/.exec(s))) return ok(m[2], m[1]);
    // OSM: mlat= & mlon= or #map=z/lat/lon
    if ((m = /mlat=(-?\d+(?:\.\d+)?).*?mlon=(-?\d+(?:\.\d+)?)/.exec(s))) return ok(m[1], m[2]);
    if ((m = /#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/.exec(s))) return ok(m[1], m[2]);
    // Google: @lat,lon / q=lat,lon / ll=lat,lon / query=lat,lon ; Apple: ll= / q= ; geo:lat,lon
    if ((m = /(?:@|[?&](?:q|ll|query|sll|daddr)=|geo:)(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/.exec(s))) return ok(m[1], m[2]);
    // plain text: two numbers «lat, lon» (decimal point or comma), optional N / E letters
    var t2 = s.replace(/[°NnEeСсВв]/g, " ").replace(/(\d),(\d)/g, "$1.$2");
    if ((m = /^\s*(-?\d{1,2}(?:\.\d+)?)[\s,;]+(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(t2))) return ok(m[1], m[2]);
    return null;
  }

  /** Location: Telegram's LocationManager (Bot API 8.0+), else the browser's geolocation. Never waits forever:
      some clients never answer (owner, 2026-10-19 — «it hangs for 15 minutes»). */
  function getPoint(cb) {
    var done = false, finish = function (p) { if (!done) { done = true; clearTimeout(all); cb(p); } };
    var all = setTimeout(function () { finish(null); }, 25000);
    var lm = tg && tg.LocationManager;
    var viaBrowser = function () {
      if (!navigator.geolocation) return finish(null);
      navigator.geolocation.getCurrentPosition(function (p) { finish({ lat: p.coords.latitude, lon: p.coords.longitude }); }, function () { finish(null); }, { timeout: 15000, maximumAge: 600000 });
    };
    if (lm && lm.init) {
      var fell = false, fallback = function () { if (!fell && !done) { fell = true; viaBrowser(); } };
      var t1 = setTimeout(fallback, 8000);   // Telegram did not answer: try the browser's own location
      try {
        lm.init(function () {
          if (!lm.isLocationAvailable) { clearTimeout(t1); return fallback(); }
          lm.getLocation(function (d) { if (d) { clearTimeout(t1); finish({ lat: d.latitude, lon: d.longitude }); } else { clearTimeout(t1); fallback(); } });
        });
      } catch (e) { clearTimeout(t1); fallback(); }
    } else viaBrowser();
  }

  app.addEventListener("click", function (e) {
    var el = e.target.closest("[data-a]");
    if (!el || el.tagName === "INPUT" || el.tagName === "SELECT") return;
    var f = A[el.dataset.a]; if (f) { lastAct = el.dataset.a; guard("click " + el.dataset.a, f)(el); }
  });
  app.addEventListener("keydown", function (e) {
    var el = e.target, pv = el.dataset && (el.dataset.f === "bm" ? "bd" : el.dataset.f === "by" ? "bm" : null);
    if (pv && e.key === "Backspace" && !el.value) { var pe = app.querySelector('[data-f="' + pv + '"]'); if (pe) { e.preventDefault(); pe.focus(); } }
  });
  app.addEventListener("change", function (e) {
    if (e.target && e.target.dataset && e.target.dataset.a === "vaAge") { vaAge(e.target, true); return; }   // owner, 2026-11-07: saved on release
    var el = e.target;
    if (el.dataset.a && A[el.dataset.a]) { lastAct = el.dataset.a; return guard("change " + el.dataset.a, A[el.dataset.a])(el); }
    if (el.dataset.f) S.form[el.dataset.f] = el.type === "checkbox" ? el.checked : el.value;
    if (el.dataset.f === "consent") paintConsent();
  });
  app.addEventListener("scroll", function (e) {   // owner, 2026-10-31: the highlight under the message field follows its scrolling
    if (e.target && e.target.id === "ymText") { var hl = document.getElementById("ymhl"); if (hl) hl.scrollTop = e.target.scrollTop; }
  }, true);
  app.addEventListener("input", function (e) {
    var el = e.target;
    if (CAL && CAL.input(el)) return;   // owner, 2026-10-29: the calendar's own fields
    if (el.dataset.a === "ymText") { ymPaint(); return; }   // owner, 2026-10-31
    if (el.dataset.a === "chText") { if (S.chat) S.chat.text = el.value; return; }
    if (el.dataset.a === "nvQ") { S.nvq = el.value; clearTimeout(S.nvqT); S.nvqT = setTimeout(function () { S.nvp = null; render(); var f = document.getElementById("nvq"); if (f) { f.focus(); try { f.setSelectionRange(f.value.length, f.value.length); } catch (x) { /* ok */ } } }, 350); return; }
    if (el.dataset.a === "intQ") { S.ints.q = el.value; S.ints.err = ""; intsRefresh(true); return; }   // owner, 2026-10-28
    if (el.dataset.a === "iSearch") { S.iq = el.value; var ib = document.getElementById("isug"); if (ib) ib.innerHTML = iSugHtml(); return; }
    if (el.dataset.a === "aiCatQ") { S.aiCatQ = el.value; var cb = document.getElementById("aicat"); if (cb) cb.innerHTML = aiCatList(); return; }
    if (el.dataset.a === "aiNewQ") { if (S.aIntNew) { S.aIntNew.name = el.value; S.aIntNew.done = ""; var sb = document.getElementById("ainewsame"); if (sb) { var sm = CAT && norm(el.value).length >= 2 ? intSearch(el.value, null, null, 3) : []; sb.textContent = sm.length ? t("aIntsExists", { x: sm.map(function (x) { return x.name + " (" + CAT.secs[x.sec].name + ")"; }).join(", ") }) : ""; } } return; }
    if (el.dataset.a === "aiSynQ") { if (S.aIntForm) { S.aIntForm.q = el.value; var ab = document.getElementById("aisyn"); if (ab) ab.innerHTML = aiSynList(String(S.aData.ints.groups[S.aIntForm.i].ids.join(","))); } return; }
    if (el.dataset.a === "pSearch") {   // only the suggestions are redrawn (the map and the list stay)
      S.fq = el.value; loadItems();
      var sb = document.getElementById("psug"); if (sb) sb.innerHTML = sugHtml();
      return;
    }
    if (el.dataset.a === "aMutSearch") {
      S.aMutQ = el.value; var p2 = el.selectionStart; render();
      var n2 = app.querySelector('[data-a="aMutSearch"]'); if (n2) { n2.focus(); try { n2.setSelectionRange(p2, p2); } catch (x) { /* ok */ } }
      return;
    }
    if (el.dataset.a === "txSearch" || el.dataset.a === "dmFind") {   // owner, 2026-10-27
      var k = el.dataset.a === "txSearch" ? "txQ" : "dmQ", pq = el.selectionStart; S[k] = el.value; render();
      var nq = app.querySelector('[data-a="' + el.dataset.a + '"]'); if (nq) { nq.focus(); try { nq.setSelectionRange(pq, pq); } catch (x) { /* ok */ } }
      return;
    }
    if (el.dataset.f === "dmText") { S.form.dmText = el.value; var dc = document.getElementById("dmcount"); if (dc) dc.textContent = el.value.length + " / 2000"; var sb = app.querySelector('[data-a="dmSend"]'); if (sb) sb.disabled = !el.value.trim(); return; }
    if (el.dataset.a === "aStarSearch") {   // owner, 2026-10-27: asks the server after a short pause
      S.aStarQ = el.value; clearTimeout(S.aStarT);
      S.aStarT = setTimeout(function () { var p3 = (app.querySelector('[data-a="aStarSearch"]') || {}).selectionStart; render(); var n3 = app.querySelector('[data-a="aStarSearch"]'); if (n3) { n3.focus(); try { n3.setSelectionRange(p3, p3); } catch (x) { /* ok */ } } }, 350);
      return;
    }
    if (el.dataset.a === "aSearch") {
      S.aQuery = el.value; var pos = el.selectionStart; render();
      var n = app.querySelector('[data-a="aSearch"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { /* ok */ } }
      return;
    }
    if (el.dataset.f === "bd" || el.dataset.f === "bm" || el.dataset.f === "by") {   // owner, 2026-10-27: three fields
      var raw = el.value, whole = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? isoToDots(raw) : /^\d{1,2}\D\d{1,2}\D\d{4}$/.test(raw.trim()) ? raw.trim() : raw.replace(/\D/g, "").length === 8 && el.dataset.f === "bd" ? typeBirth(raw) : null;
      if (whole) {   // a whole date pasted or filled in by the phone: spread it over the three fields
        var wp = whole.split(/\D/); S.form.bd = wp[0]; S.form.bm = wp[1]; S.form.by = wp[2];
        ["bd", "bm", "by"].forEach(function (k) { var x = app.querySelector('[data-f="' + k + '"]'); if (x) x.value = S.form[k]; });
      } else {
        var dg = raw.replace(/\D/g, "").slice(0, el.dataset.f === "by" ? 4 : 2);
        // a day of 4–9 or a month of 2–9 cannot get a second digit: complete it and go on
        if (e.inputType && e.inputType.indexOf("delete") !== 0 && dg.length === 1 && ((el.dataset.f === "bd" && +dg > 3) || (el.dataset.f === "bm" && +dg > 1))) dg = "0" + dg;
        if (dg !== raw) el.value = dg;
        S.form[el.dataset.f] = dg;
        var nx = el.dataset.f === "bd" ? "bm" : el.dataset.f === "bm" ? "by" : null;
        if (nx && dg.length === 2 && e.inputType && e.inputType.indexOf("delete") !== 0) { var ne = app.querySelector('[data-f="' + nx + '"]'); if (ne) ne.focus(); }
      }
      var nv = S.form.bd || S.form.bm || S.form.by ? (S.form.bd || "") + "." + (S.form.bm || "") + "." + (S.form.by || "") : "";
      S.form.birth = nv;
      var iso2 = dotsToIso(nv), ag = iso2 ? ageFrom(iso2) : null, okk = ag != null && ag >= 18 && ag <= 100, cs = app.querySelectorAll('#agefield [data-g="ageExact"]');
      if (cs.length === 2) { cs[0].textContent = okk ? t("ageRange", { v: bucketOf(ag) }) : t("ageRangeOnly"); cs[1].textContent = okk ? t("ageExact", { v: ag }) : t("ageExactOnly"); }
      paintConsent();
      return;
    }
    if (el.dataset.a === "aAnsQ") { S.aAnsQ = el.value; ansFilter(el.value); return; }   // owner, 2026-11-07: search by practice in the owner's view
    if (el.dataset.f && el.type !== "checkbox") S.form[el.dataset.f] = el.value;
    if (el.dataset.f === "bcText") {   // owner, 2026-11-07: the counter and the preview follow the typing
      var bcn = document.getElementById("bccount"), bcp = document.getElementById("bcprev"), bl = Array.from(el.value).length;
      if (bcn) bcn.textContent = bl + " / 3500";
      if (bcp) bcp.innerHTML = el.value ? esc(el.value) : '<span class="muted">' + t("bcPrevNone") + "</span>";
      var bs = app.querySelector('[data-a="bcSend"]'), inf = S.bc && S.aData["bc_" + S.bc.audience];
      if (bs) bs.disabled = !el.value.trim() || bl > 3500 || !inf || !inf.count || !!inf.waiting || !!S.bc.sending;
      return;
    }
    if (el.dataset.f === "coords") { var r = document.getElementById("coordsres"), pc = parseCoords(el.value); if (r) r.textContent = el.value ? (pc ? t("coordsOk", { lat: pc.lat.toFixed(5), lon: pc.lon.toFixed(5) }) : t("e_coords")) : ""; drawCoordsMap(pc); }
    if (el.dataset.f === "pnote") { var pnc = document.getElementById("pnotecount"); if (pnc) pnc.textContent = el.value.length + " / 500"; }
    if (el.dataset.a === "psAge") { psAge(el); return; }
    if (el.dataset.a === "vaAge") { vaAge(el, false); return; }
    if (el.dataset.a === "bcPhotoPick" && el.files && el.files[0]) { bcPhotoUp(el.files[0]); el.value = ""; return; }   // owner, 2026-11-07   // owner, 2026-11-07 (9.01): the age range in «Показывать мне»
    if (el.dataset.a === "nnSlide" && S.nn) {   // owner, 2026-11-07: «Не сейчас» — the label follows the finger
      S.nn.i = +el.value; var nv = document.getElementById("nnval"), lb = nnLabel(NN_DAYS[S.nn.i]); if (nv) nv.textContent = lb; el.setAttribute("aria-valuetext", lb);
      var nb = document.getElementById("nnbtn"); if (nb) nb.textContent = t("nnFor") + " " + lb;
      var tk = el.parentNode.querySelectorAll(".dticks span"); for (var k = 0; k < tk.length; k++) tk[k].className = k === S.nn.i ? "on" : "";
      return;
    }
    if (el.dataset.a === "fDist") { var dv = document.getElementById("distval"); if (dv) dv.textContent = distLabel(+el.value); return; }   // the label follows the finger; the list on release
    if (el.dataset.f === "lnkLabel") { S.form.lnkLabel = el.value; var lc = document.getElementById("lnkcount"); if (lc) lc.textContent = Array.from(el.value).length + " / 35"; return; }
    if (el.dataset.a === "cstarCap") { S.form.cstarCap = el.value; var cc = document.getElementById("cstarcount"); if (cc) cc.textContent = Array.from(el.value).length + " / 25"; return; }
    if (el.dataset.f === "about") { var cnt = document.getElementById("aboutcount"); if (cnt) cnt.textContent = el.value.length + " / 1500"; }
    if (el.dataset.f === "about" || el.dataset.f === "nick") paintProfile();   // owner, 2026-11-02: «Осталось» follows the typing
  });

  /** the owner's view of a checklist: hide the rows that do not match, and the groups left empty */
  function ansFilter(v) {
    var q = norm(v || ""), any = false;
    app.querySelectorAll(".ansgrp").forEach(function (g) {
      var vis = 0;
      g.querySelectorAll(".crow[data-q]").forEach(function (r) { var ok = !q || r.dataset.q.indexOf(q) >= 0; r.hidden = !ok; if (ok) vis++; });
      g.hidden = !vis; if (vis) any = true;
    });
    var none = document.getElementById("aansnone"); if (none) none.hidden = any;
  }
  // owner, 2026-10-26: «Оформление» — like Telegram (default), light or dark by choice
  function theme() { var pref = S.me && S.me.theme; document.documentElement.dataset.theme = pref === "dark" || pref === "light" ? pref : (tg && tg.colorScheme === "dark" ? "dark" : "light"); }
  var retryTimer = null;
  function autoRetry() { clearTimeout(retryTimer); retryTimer = setTimeout(function () { if (!S.me) load(); }, 30000); }
  /* owner, 2026-11-01: how long the opening takes (ms since the page started) — to the debug log while debug is on */
  var openT = { sent: false };
  function openTiming(list) {
    if (openT.sent) return;
    if (list) openT.list = performance.now();
    else if (S.me && S.me.active) return;   // a person on the map: sent when the list is painted
    openT.sent = true;
    var r = function (x) { return x ? Math.round(x) + " ms" : "—"; };
    dbg({ kind: "timing", message: "open: texts " + r(openT.texts) + " · /api/me " + r(openT.me) + " · list " + r(openT.list) +
      " · copy " + (navigator.serviceWorker && navigator.serviceWorker.controller ? "on" : "off") + (window.KV_TEXTS ? "" : " · texts not asked early") });
  }
  function load() {
    S.err = ""; render();
    if (!tg || !tg.initData) {
      // inside Telegram the launch data comes in the URL; without it this page was opened in a browser
      var inTg = /tgWebApp(Data|Version|Platform)=/.test(location.hash) || !!window.TelegramWebviewProxy || (tg && tg.platform && tg.platform !== "unknown");
      S.me = null;
      var say = function () { S.err = hasT("tgOld") ? t(inTg ? "tgOld" : "openInTg") : "Откройте приложение в Telegram · Open the app in Telegram"; app.innerHTML = '<div class="center muted">' + esc(S.err) + "</div>"; };
      say(); textsLoad(S.lang).then(say, function () { /* the two-language line stays */ });
      // tell the server (only while the owner records errors; no data about the person)
      try { fetch("/api/debug/noauth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ in_tg: inTg, sdk: !!tg, platform: tg && tg.platform, version: tg && tg.version, ua: navigator.userAgent, hash: location.hash ? location.hash.replace(/=[^&]*/g, "=…").slice(0, 200) : "" }) }); } catch (e) { /* ok */ }
      return;
    }
    var tries = 0;
    var fail = function () {
      // no answer from the server (address not found, VPN reconnecting…) or the texts did not come: try again a few times, then say so
      if (++tries < 4) { setTimeout(go, 1500 * tries); return; }
      S.err = t("netErr2"); S.errKind = "net"; render();
    };
    // owner, 2026-11-01: the person's data and the texts of their language are asked at the same time; the owner and
    // moderators also get staff.js (+ its texts) before the first screen
    var go = function () { Promise.all([api("GET", "me"), textsLoad(S.lang).then(function () { openT.texts = openT.texts || performance.now(); })]).then(function (res) {
      var r = res[0];
      if (!r.ok) { S.err = t("netErr"); S.errKind = r.error === "server" ? "server" : "net"; if (S.errKind === "server") autoRetry(); return render(); }
      openT.me = performance.now();
      var l = r.lang || S.lang;
      langReady(l, r).then(function () { started(r, l); }, fail);
    }, fail); };
    go();
  }
  function started(r, l) {
    S.me = r; S.lang = l; theme();
    if (r.mod && !r.active) S.tab = "mod";
    dbg({ kind: "hello", platform: tg.platform, version: tg.version, theme: tg.colorScheme, viewport: window.innerWidth + "x" + window.innerHeight,
      screen: (r.admin ? "admin" : r.active ? "active" : "steps " + JSON.stringify(r.steps)), ua: navigator.userAgent });
    render();
    openTiming(false);
    useSiteLink();
    plinkStart(r);   // owner, 2026-11-07
    // owner, 2026-10-24: «Открыть во «Взаимных»» under a proposal opens the tab at the sender's card
    var mq = /[?&]m=([a-z0-9]{10})/.exec(location.search);
    if (mq && r.active && !S.usedM) { S.usedM = true; S.tab = "matches"; S.lkTab = "mutual"; S.scrollToMatch = mq[1]; render(); }
    loadNeighbours(); loadMatches();
    calLink(r);
    var cm = /[?&]chat=(\d{1,12})/.exec(location.search);   // owner, 2026-10-31: «Открыть чат» under the bot's message
    if (cm && !S.usedChat && r.access && (r.nova || (r.uchats || []).some(function (c) { return String(c.id) === cm[1]; }))) { S.usedChat = true; S.tab = "chat"; chatOpen(cm[1]); }
  }

  // a copy of the app on the phone, used when the server's address cannot be found (Android; ignored where unsupported)
  try { if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { /* fine */ }); } catch (e) { /* fine */ }

  if (tg) {
    tg.ready(); tg.expand();
    theme(); tg.onEvent("themeChanged", guard("themeChanged", theme));
    if (tg.BackButton) tg.BackButton.onClick(guard("back", function () { lastAct = "back";
      if (S.fillOpen) fillShow(false); else if (S.yes) A.yesClose(); else if (S.chat) A.chatClose(); else if (S.aChatRead) A.aChatReadClose(); else if (S.pzAsk) A.pzCancel(); else if (S.qr) A.qrClose(); else if (S.ints) A.intsBack(); else if (S.sheet) A.sheetClose(); else if (S.fOpen) A.fOpen(); else if (S.nStarsOpen) nStarsShow(null); else if (S.starsOpen) starsShow(false); else if (S.page) A.pageClose(); else if (S.report) A.reportClose(); else if (S.prop) A.propClose(); else if (S.pin) A.pinClose(); else if (S.aOpen) A.aClose(); else if (S.aIntsPage) A.aIntsClose(); else if (S.mOpen) A.mClose(); else if (S.aChatPage) A.aChatClose(); else if (S.aUniPage) A.aUniClose(); else if (S.aMutPage) A.aMutClose(); else if (S.aMapPage) A.aMapClose(); else if (S.pMenu) A.pMenuClose(); else if (S.cmp) A.closeCompare(); else if (S.list) A.listClose();
      else if (S.open) A.closePerson(); else if (S.mapFrom) A.mapBack(); else if (CAL && CAL.canBack()) CAL.back(); else if (S.onbMod && !S.edit) { S.tab = "mod"; render(); } else endEdit();
    }));
    var code = (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code) || navigator.language || "";
    S.lang = /^(ru|uk|be|kk)/.test(code) ? "ru" : "en";
  }
  load();
})();
