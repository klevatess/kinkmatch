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
