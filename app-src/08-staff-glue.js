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
