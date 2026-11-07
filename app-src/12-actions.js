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
