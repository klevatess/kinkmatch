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
