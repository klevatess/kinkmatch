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
