/* Kinkoverse Mini App — the owner panel and the moderation screens. Owner, 2026-11-01: loaded only for the owner and
   moderators (participants never download it). Plain JS, no build step: app.js calls window.KVStaff(K) once with the
   pieces of app.js these screens use, and shows the screens it returns. CAT(), CAL() are read through K because app.js
   replaces them while running. A new helper from app.js used here: add it to K in app.js (staffLoad). */
window.KVStaff = function (K) {
  "use strict";
  var CHEV = K.CHEV;
  var LOCK = K.LOCK;
  var S = K.S;
  var SHIELD = K.SHIELD;
  var STAR_OUT = K.STAR_OUT;
  var aiCatList = K.aiCatList;
  var aiSynList = K.aiSynList;
  var ansOf = K.ansOf;
  var api = K.api;
  var bar = K.bar;
  var brand = K.brand;
  var calWait = K.calWait;
  var chip = K.chip;
  var dateLong = K.dateLong;
  var errLine = K.errLine;
  var esc = K.esc;
  var figure = K.figure;
  var fmtDate = K.fmtDate;
  var fmtTime = K.fmtTime;
  var hasT = K.hasT;
  var intSearch = K.intSearch;
  var itag = K.itag;
  var loadCat = K.loadCat;
  var loadLeaflet = K.loadLeaflet;
  var mLoad = K.mLoad;
  var norm = K.norm;
  var render = K.render;
  var roleMark = K.roleMark;
  var row = K.row;
  var starSvg = K.starSvg;
  var t = K.t;
  var who = K.who;

  /* ---------- the owner's side: suggestions and filter hits ---------- */
  function vAdminInts() {
    var d = S.aData.ints;
    var h = '<div class="top"><h1>' + t("aInts") + '</h1></div><div class="body">';
    if (!d) { if (!S.aIntsLoading) { S.aIntsLoading = true; api("GET", "admin/interests").then(function (r) { S.aIntsLoading = false; if (r.ok) { S.aData.ints = r; render(); } }); } loadCat(); return h + '<div class="muted center">' + t("loading") + "</div></div>"; }
    // owner, 2026-10-28: find any item of the catalog → rename it, add / delete search words
    if (S.aIntMsg) h += '<div class="card ok small" role="status">' + esc(S.aIntMsg) + "</div>";   // owner, 2026-11-07: after a delete
    h += '<div class="card small"><b>' + t("aIntsCatT") + '</b><input type="search" data-a="aiCatQ" autocomplete="off" placeholder="' + esc(t("aIntsCatPh")) + '" value="' + esc(S.aiCatQ || "") + '"><div id="aicat">' + aiCatList() + "</div>" + aiEditCard() + "</div>";
    if (!K.CAT()) loadCat();
    // owner, 2026-10-28: add an item without anybody suggesting it
    var NF = S.aIntNew;
    if (!NF) h += '<button type="button" class="btn ibtn" data-a="aIntNew" data-v="1">' + t("aIntsNewBtn") + "</button>";
    else {
      var same = K.CAT() && NF.name && norm(NF.name).length >= 2 ? intSearch(NF.name, null, null, 3) : [];
      h += '<div class="card small"><b>' + t("aIntsNewT") + '</b><label class="field"><span class="lbl">' + t("sugName") + '</span><input type="text" maxlength="60" data-f="aiNewName" data-a="aiNewQ" value="' + esc(NF.name || "") + '"></label>' +
        '<div class="tiny" id="ainewsame" style="color:var(--danger)">' + (same.length ? esc(t("aIntsExists", { x: same.map(function (x) { return x.name + " (" + K.CAT().secs[x.sec].name + ")"; }).join(", ") })) : "") + "</div>" +
        '<label class="field"><span class="lbl">' + t("sugSec") + '</span><select data-f="aiNewSec"><option value="">—</option>' + (K.CAT() ? K.CAT().sections.map(function (s) { return '<option value="' + s.id + '"' + (+NF.section === s.id ? " selected" : "") + ">" + esc(t("tab_" + s.tab) + " · " + s.name) + "</option>"; }).join("") : "") + "</select></label>" +
        '<label class="field"><span class="lbl">' + t("sugAlt") + '</span><input type="text" maxlength="100" data-f="aiNewAlt" placeholder="' + esc(t("sugAltPh")) + '" value="' + esc(NF.alt || "") + '"></label>' +
        (NF.done ? '<div class="card ok small" role="status">' + esc(t("aIntsAdded", { x: NF.done })) + "</div>" : "") +
        '<div class="decide"><button type="button" class="btn" data-a="aIntNew" data-v="">' + t("cancel") + '</button><button type="button" class="btn primary" data-a="aIntNewAdd"' + (S.busy ? " disabled" : "") + ">" + t("aIntsAddT") + "</button></div></div>";
    }
    if (d.filtered.length) {
      h += '<div class="lbl" style="color:var(--danger)">' + t("aIntsBad") + "</div>";
      d.filtered.forEach(function (x) {
        h += '<div class="card small ibad"><div class="nbtop"><b>' + t("aIntsWhy", { r: t("r_" + x.reason) }) + '</b><span class="tiny muted">' + fmtTime(x.at) + "</span></div>" +
          '<button type="button" class="btn link" style="padding:0;align-self:flex-start" data-a="aOpen" data-v="' + esc(x.n) + '">' + esc(x.nick || "#" + x.n) + " · #" + esc(x.n) + " ›</button>" +
          '<div class="tiny muted">' + t("aIntsTries", { n: x.tries }) + "</div>" +
          '<div class="decide">' + (x.blocked ? '<button type="button" class="btn" disabled>' + t("aSugBlocked").split(":")[0] + "</button>"
            : '<button type="button" class="btn dangerline" data-a="aIntBlock" data-v="' + esc(x.n) + '" data-on="1">' + t("aIntsBlock") + "</button>") +
          '<button type="button" class="btn primary" data-a="aIntAct" data-x="seen" data-ids="' + x.id + '">' + t("aIntsSeen") + "</button></div></div>";
      });
    }
    h += '<div class="lbl">' + t("aIntsWait", { n: d.groups.length }) + "</div>";
    if (!d.groups.length) h += '<div class="card small muted">' + t("aIntsNone") + "</div>";
    d.groups.forEach(function (g, i) {
      var like = K.CAT() ? intSearch(g.name, null, null, 1)[0] : null, sec = K.CAT() && K.CAT().secs[g.section];
      var ids = g.ids.join(",");
      h += '<div class="card small"><div class="nbtop"><b style="font-size:15px">' + esc(g.name) + '</b><span class="tiny muted">' + t("aIntsPeople", { n: g.authors.length }) + "</span></div>" +
        '<div class="muted">' + esc(sec ? t("tab_" + sec.tab) + " · " + sec.name : "#" + g.section) + (g.alt ? " · " + esc(g.alt) : "") + (like ? " · " + esc(t("aIntsLike", { x: like.name })) : "") + "</div>" +
        '<div class="tags">' + g.authors.map(function (a) { return '<button type="button" class="tag out" data-a="aOpen" data-v="' + esc(a.n) + '">' + esc(a.nick || "#" + a.n) + "</button>"; }).join("") + "</div>";
      if (S.aIntForm && S.aIntForm.i === i) {
        var F = S.aIntForm;
        if (F.kind === "add") h += '<label class="field"><span class="lbl">' + t("sugName") + '</span><input type="text" maxlength="60" data-f="aiName" value="' + esc(F.name) + '"></label>' +
          '<label class="field"><span class="lbl">' + t("sugSec") + '</span><select data-f="aiSec">' + (K.CAT() ? K.CAT().sections.map(function (s) { return '<option value="' + s.id + '"' + (+F.section === s.id ? " selected" : "") + ">" + esc(t("tab_" + s.tab) + " · " + s.name) + "</option>"; }).join("") : "") + "</select></label>" +
          '<label class="field"><span class="lbl">' + t("sugAlt") + '</span><input type="text" maxlength="100" data-f="aiAlt" value="' + esc(F.alt) + '"></label>' +
          '<div class="decide"><button type="button" class="btn" data-a="aIntForm" data-v="">' + t("cancel") + '</button><button type="button" class="btn primary" data-a="aIntAdd" data-ids="' + ids + '">' + t("aIntsAddT") + "</button></div>";
        else {
          h += '<div class="small">' + t("aIntsSynT") + '</div><input type="search" data-a="aiSynQ" placeholder="' + esc(t("aIntsSynPh")) + '" value="' + esc(F.q || "") + '"><div id="aisyn">' + aiSynList(ids) + "</div>" +
            '<button type="button" class="btn" data-a="aIntForm" data-v="">' + t("cancel") + "</button>";
        }
      } else h += '<div class="three"><button type="button" class="btn primary" data-a="aIntForm" data-v="add" data-i="' + i + '">' + t("aIntsAdd") + '</button><button type="button" class="btn" data-a="aIntForm" data-v="syn" data-i="' + i + '">' + t("aIntsSyn") +
        '</button><button type="button" class="btn dangerline" data-a="aIntAct" data-x="reject" data-ids="' + ids + '">' + t("aIntsRej") + "</button></div>";
      h += "</div>";
    });
    if (d.blocked) h += '<div class="tiny muted">' + t("aIntsBlocked", { n: d.blocked }) + "</div>";
    var mine = S.intSrv && S.intSrv.extra ? S.intSrv.extra.slice().reverse() : [];
    if (mine.length && K.CAT()) h += '<div class="lbl">' + t("aIntsMine") + " · " + mine.length + '</div><div class="card list">' + mine.slice(0, 30).map(function (x) {
      var sec = K.CAT().secs[x[1]]; return '<div class="crow"><span>' + esc(x[2]) + (x[3] ? ' <span class="tiny muted">· ' + esc(x[3]) + "</span>" : "") + '</span><span class="tiny muted">' + esc(sec ? sec.name : "") + "</span></div>"; }).join("") + "</div>";
    return h + errLine() + "</div>";
  }
  function aiEditCard() {
    var E = S.aIntEdit, x = E && K.CAT() && K.CAT().byId[E.id];
    if (!x) return "";
    var h = '<div class="card small iedit"><div class="nbtop"><span class="tiny muted">' + esc(t("tab_" + x.tab) + " · " + K.CAT().secs[x.sec].name) + " · #" + x.id + '</span><button type="button" class="ix" data-a="aIntEdit" data-v="" aria-label="' + esc(t("aIntsEdClose")) + '">✕</button></div>' +
      '<label class="field"><span class="lbl">' + t("aIntsEdName") + '</span><input type="text" maxlength="60" data-f="aiEdName" value="' + esc(S.form.aiEdName != null ? S.form.aiEdName : x.name) + '"></label>' +
      (x.name0 ? '<div class="tiny muted">' + esc(t("aIntsEdWas", { x: x.name0 })) + "</div>" : "") +
      '<div class="decide">' + (x.name0 ? '<button type="button" class="btn" data-a="aIntRename" data-v="reset">' + t("aIntsEdReset") + "</button>" : "") + '<button type="button" class="btn primary" data-a="aIntRename">' + t("aIntsEdSave") + "</button></div>" +
      '<div class="lbl">' + t("aIntsEdSyn") + '</div><div class="tags">' +
      (x.syn0 ? x.syn0.split("|").filter(Boolean).map(function (w) { return '<span class="tag" title="' + esc(t("aIntsEdSynCat")) + '">' + esc(w) + "</span>"; }).join("") : "") +
      (x.added || []).map(function (a) { return '<button type="button" class="tag int on" data-a="aIntSynDel" data-v="' + a[0] + '" aria-label="' + esc(t("pRemove") + ": " + a[1]) + '">' + esc(a[1]) + " ×</button>"; }).join("") + "</div>" +
      '<div class="irw2"><input type="text" maxlength="60" data-f="aiEdSyn" placeholder="' + esc(t("aIntsEdSynPh")) + '" value="' + esc(S.form.aiEdSyn || "") + '"><button type="button" class="btn" data-a="aIntSynAdd">' + t("aIntsEdSynAdd") + "</button></div>";
    if (E.msg) h += '<div class="card ok small" role="status">' + esc(E.msg) + "</div>";
    if (x.id >= 100000) h += '<button type="button" class="btn dangerline" data-a="aIntDel" data-v="' + x.id + '"' + (S.busy ? " disabled" : "") + ">" + t("aIntsDel") + '</button><div class="tiny muted">' + t("aIntsDelX") + "</div>";   // owner, 2026-11-07
    return h + "</div>";
  }
  /** «Кто расходует больше всего» (owner, 2026-10-28) */
  function usagePeopleCard() {
    // owner, 2026-10-28: folded by default — it reads many rows, so only on demand
    if (!S.aWhoOpen) return '<button type="button" class="card small ilink" data-a="aWhoOpen" data-v="1"><b>' + t("aWho") + '</b><span class="tiny muted">' + t("aWhoOpen") + " ›</span></button>";
    var d = S.aWhoDays || 1, u = S.aData["who" + d];
    var head = '<div class="nbtop"><b>' + t("aWho") + '</b><button type="button" class="btn link tiny" data-a="aWhoOpen" data-v="">' + t("aWhoHide") + "</button></div>";
    if (!u) { lazy("who" + d, "admin/usage-people?days=" + d); return '<div class="card">' + head + '<div class="muted">' + t("loading") + "</div></div>"; }
    var h = '<div class="card">' + head + '<div class="seg" style="margin:0">' + [[1, "aWhoD1"], [7, "aWhoD7"]].map(function (o) {
      return '<button type="button" data-a="aWhoDays" data-v="' + o[0] + '" aria-pressed="' + (d === o[0]) + '">' + t(o[1]) + "</button>"; }).join("") + "</div>";
    if (!u.people.length) return h + '<div class="small muted">' + t("aWhoEmpty") + "</div></div>";
    h += '<div class="tiny muted">' + t("aWhoTotal", { req: num(u.total.req), rr: num(u.total.rr), p: u.total.people }) + '</div><div class="card list" style="box-shadow:none">' + u.people.map(function (x) {
      var label = x.owner ? t("aWhoOwner") : esc(x.nick || (x.n ? "#" + x.n : "—"));
      var line = '<span><b style="font-weight:500">' + label + '</b><br><span class="tiny muted">' + t("aWhoRow", { req: num(x.req), rr: num(x.rr), rw: num(x.rw) }) + "</span></span>";
      return x.n ? '<button type="button" class="row" style="width:100%;text-align:left" data-a="aOpen" data-v="' + esc(x.n) + '">' + line + " ›</button>" : '<div class="row">' + line + "</div>";
    }).join("") + '</div><div class="tiny muted">' + t("aWhoNote") + "</div></div>";
    return h;
  }
  function aLoad(what, qs) { mLoad(what, "admin/" + what + (qs || "")); }
  function tile(n, label) { return '<div class="tile"><b>' + n + '</b><span class="small muted">' + label + "</span></div>"; }
  function loading(h, tabs) { return h + '<div class="muted">' + t("loading") + "</div></div>" + (tabs || ""); }
  function vAdmin() {
    var h = "";
    if (S.aOpen) return vAdminProfile();
    if (S.mOpen) return vReport();
    if (S.aChatPage) return vAdminChat();
    if (S.aChatRead) return vAdminChatRead();   // owner, 2026-10-31
    if (S.aUniPage) return vAdminUniverse();
    if (S.aMutPage) return vAdminMutuals();
    if (S.aMapPage) return vAdminMap();
    if (S.aTab === "overview") {
      var o = S.aData.overview;
      h = '<div class="top">' + brand() + "<h1>" + t("aTitle") + '</h1></div><div class="body">';
      if (!o) { aLoad("overview"); return loading(h, adminTabs()); }
      // owner, 2026-11-02: «Обзор» in sub-tabs — only the open one asks the server for its numbers
      var ov = S.aOvTab || "main", OVT = [["main", "aOvMain"], ["new", "aOvNew"], ["act", "aOvAct"], ["inv", "aOvInv"], ["chats", "aOvChats"], ["sys", "aOvSys"]];
      h = h.replace('<div class="body">', '<div class="seg ovseg">' + OVT.map(function (x) { return '<button type="button" data-a="aOvTab" data-v="' + x[0] + '" aria-pressed="' + (ov === x[0]) + '">' + t(x[1]) + "</button>"; }).join("") + '</div><div class="body">');
      if (o.cached_at && ov !== "sys") h += '<div class="nbtop tiny muted" style="margin-bottom:-4px"><span>' + t("aCachedAt", { t: fmtTime(o.cached_at) }) + '</span><button type="button" class="btn link" style="padding:0" data-a="aRefresh">' + t("aRefresh") + "</button></div>";   // owner, 2026-11-01
      if (ov === "main") {
      h += '<div class="tiles">' + tile(o.counts.users, t("aUsers")) + tile(o.counts.active, t("aActive")) + tile(o.counts.reports, t("aReportsWait")) +
        tile(o.counts.mutual, t("aMutualN")) + tile(o.counts.paused, t("aPaused")) + tile(o.counts.suspicious, t("aSusp")) + tile(o.counts.space, t("aSpaceN")) + "</div>";
      var at = o.attention, al = [];
      if (at.reports) al.push('<button type="button" class="btn link" data-a="aTab" data-v="reports">' + t("aAttReports", { n: at.reports }) + (at.oldest_report ? " · " + t("aAttOldest", { t: fmtTime(at.oldest_report) }) : "") + "</button>");
      if (at.bans_wait) al.push('<button type="button" class="btn link" data-a="aTab" data-v="reports">' + t("aAttBans", { n: at.bans_wait }) + "</button>");
      if (at.held) al.push("<div>" + t("aAttHeld", { n: at.held }) + "</div>");
      if (at.new_chats.length) al.push("<div>" + t("aAttNewChats", { list: at.new_chats.map(function (x) { return "«" + esc(x) + "»"; }).join(", ") }) + "</div>");
      if (at.new_visible) al.push('<button type="button" class="btn link" data-a="aNewVisible">' + t("aAttNewVisible", { n: at.new_visible }) + "</button>");
      if (at.stuck) al.push("<div>" + t("aAttStuck", { n: at.stuck }) + "</div>");
      if (at.referrals) al.push('<button type="button" class="btn link" data-a="aRefsOpen">' + t("aAttRefs", { n: at.referrals }) + " ›</button>");   // owner, 2026-10-31
      if (at.interests && at.interests.pending) al.push('<button type="button" class="btn link" data-a="aIntsOpen">' + t("aAttInts", { n: at.interests.pending }) + " ›</button>");   // owner, 2026-10-28
      if (at.interests && at.interests.filtered) al.push('<button type="button" class="btn link" style="color:var(--danger)" data-a="aIntsOpen">' + t("aAttIntsBad", { n: at.interests.filtered }) + " ›</button>");
      h += '<div class="card small' + (al.length ? " warn" : "") + '"><b>' + t("aAttention") + "</b>" + (al.join("") || '<div class="muted">' + t("aAttNone") + "</div>") + "</div>";
      h += '<button type="button" class="btn" data-a="bcOpen">' + t("bcOpenBtn") + "</button>";   // owner, 2026-11-07
      (at.link_notes || []).forEach(function (c) {   // owner, 2026-10-27: a star's new / changed link — shown already, may be rejected
        var line = function (l) { return "«" + esc(l.label) + "» · " + esc(l.url) + (l.date ? " · " + esc(dateLong(l.date)) : ""); };
        h += '<div class="card small warn"><div class="nbtop"><b>' + t(c.kind === "changed" ? "aLinkChanged" : "aLinkNew") + '</b><span class="tiny muted">' + fmtTime(c.at) + "</span></div>" +
          '<button type="button" class="btn link" style="padding:0;align-self:flex-start" data-a="aOpen" data-v="' + esc(c.n) + '">' + esc(c.nick || "#" + c.n) + " · #" + esc(c.n) + " ›</button>" +
          (c.old ? '<div style="word-break:break-all"><span class="muted">' + t("aAboutWas") + ":</span> " + line(c.old) + "</div>" : "") +
          '<div class="card" style="gap:2px;padding:10px 12px;box-shadow:none"><b>' + esc(c.label) + '</b><span style="word-break:break-all">' + linkGo(c.url) + '</span><span class="tiny muted">' +
          (c.date ? esc(dateLong(c.date)) : t("aLinkNoDate")) + " · " + t(c.rejected ? "aLinkRejectedNow" : "aLinkSeen") + "</span></div>" +
          '<div class="decide"><button type="button" class="btn dangerline" data-a="aLinkNote" data-x="reject" data-v="' + c.id + '">' + t(c.kind === "changed" ? "aLinkRejectAgain" : "aLinkReject") + '</button><button type="button" class="btn primary" data-a="aLinkNote" data-x="ok" data-v="' + c.id + '">' + t("aLinkOk") + "</button></div></div>";
      });
      (at.about_changes || []).forEach(function (c) {   // owner, 2026-10-27: a hidden «О себе» was changed
        h += '<div class="card small warn"><div class="nbtop"><b>' + t("aAboutCh") + '</b><span class="tiny muted">' + fmtTime(c.at) + "</span></div>" +
          '<button type="button" class="btn link" style="padding:0;align-self:flex-start" data-a="aOpen" data-v="' + esc(c.n) + '">' + esc(c.nick || "#" + c.n) + " · #" + esc(c.n) + " ›</button>" +
          '<div><span class="muted">' + t("aAboutWas") + ':</span> <span style="white-space:pre-wrap">' + (c.old ? "«" + esc(c.old) + "»" : t("aAboutEmpty")) + "</span></div>" +
          '<div><span class="muted">' + t("aAboutNow") + ':</span> <span style="white-space:pre-wrap">' + (c.new ? "«" + esc(c.new) + "»" : t("aAboutEmpty")) + "</span></div>" +
          '<div class="decide"><button type="button" class="btn dangerline" data-a="aAboutAgain" data-v="' + esc(c.n) + '" data-l="' + c.id + '">' + t("aAboutAgain") + '</button><button type="button" class="btn primary" data-a="aAboutOk" data-l="' + c.id + '">' + t("aAboutOk") + "</button></div></div>";
      });
      }
      if (ov === "new") h += summaryCard("new") + remindersCard();
      if (ov === "act") h += summaryCard("act") + retentionCard() + '<button type="button" class="btn" data-a="aMapOpen">' + t("aMapBtn") + "</button>";
      if (ov === "inv") h += funnelCard(o.referrals) || '<div class="card small muted">' + t("aFunNone") + "</div>";   // owner, 2026-10-31
      if (ov === "sys") h += usageCard() + usagePeopleCard() + backupCard() + diagCard();
      if (ov === "chats") {
      h += uniCard();
      h += '<div class="card list"><div style="padding:10px 12px 4px;font-weight:600">' + t("aChats") + "</div>";
      o.chats.forEach(function (c) {
        // owner, 2026-10-20: no block button in the list — open the chat, block it in its «Опасная зона» (two confirmations)
        h += '<button type="button" class="row" style="width:100%;text-align:left" data-a="aChatOpen" data-v="' + esc(c.id) + '"><span><b style="font-weight:500">' + esc(c.title) + '</b><br><span class="tiny muted">' + [c.size != null ? t("aSize", { n: c.size }) : "", t("aStarted", { n: c.members }), t("aWithProfile", { n: c.profiles }), fmtDate(c.since)].filter(Boolean).join(" · ") + "</span></span>" +
          '<span class="tiny ' + (c.blocked ? "" : "muted") + '" style="white-space:nowrap">' + (c.blocked ? t("aBlocked") : !c.active ? t("aOff") : "") + " ›</span></button>";
      });
      h += "</div>";
      }
      h += errLine() + "</div>";
    } else if (S.aTab === "reports") {
      h = '<div class="top"><h1>' + t("mReports") + '</h1></div><div class="seg">' + [["reports", "mReports", 0], ["refs", "mRefs", S.me.ref_wait]].map(function (o) {
        return '<button type="button" data-a="aRepTab" data-v="' + o[0] + '" aria-pressed="' + ((S.aRepTab || "reports") === o[0]) + '">' + t(o[1]) + (o[2] ? " · " + o[2] : "") + "</button>"; }).join("") + "</div>" +
        (S.aRepTab === "refs" ? vRefs() : vReports(true));
    } else if (S.aTab === "profiles") {
      h = '<div class="top"><h1>' + t("aProfiles") + '</h1><div class="tiny muted">' + t("aNoLoc") + "</div></div>" + profilesBody("admin/profiles");
    } else if (S.aTab === "stars") {
      h = vAdminStars();
    } else if (S.aTab === "texts") {
      h = vAdminTexts();
    } else if (S.aTab === "ints") {
      h = vAdminInts();   // owner, 2026-10-28: its own tab
    } else {
      h = vMods();
    }
    return h + adminTabs();
  }
  /** the journal — owner, 2026-10-28: a part of «Тексты» */
  /** owner, 2026-10-31: invitations of the last 30 days and who invited the most */
  function funnelCard(F) {
    if (!F) return "";
    var max = Math.max(1, F.opened), bar = function (lbl, v, col) { return '<div class="fun"><span>' + lbl + '</span><i><b style="width:' + Math.round(v * 100 / max) + "%" + (col ? ";background:" + col : "") + '"></b></i><b>' + v + "</b></div>"; };
    var h = '<div class="card small"><div class="nbtop"><b>' + t("aFunT") + '</b><span class="tiny muted">' + t("aFun30") + "</span></div>" +
      bar(t("aFunOpened"), F.opened) + bar(t("aFunFilled"), F.filled) + bar(t("aFunOk"), F.ok, "var(--ok)") + bar(t("aFunBot"), F.bot, "var(--danger)") + bar(t("aFunWait"), F.waiting, "#b9852a") +
      '<div class="tiny muted">' + t("aFunMsgs", { c: F.credited, s: F.sent }) + "</div>";
    if (F.top.length) h += "<b>" + t("aFunTop") + "</b>" + F.top.map(function (x) {
      return '<div class="irow" style="padding:6px 0"><button type="button" class="btn link" style="padding:0" data-a="aOpen" data-v="' + esc(x.n) + '">' + esc(x.nick || "#" + x.n) + '</button><span class="tiny' + (x.bot >= 2 ? '" style="color:var(--danger)' : " muted") + '">' + t("aFunTopRow", { all: x.n_all, ok: x.ok, bot: x.bot }) + (x.can ? "" : " · " + t("aFunOff")) + "</span></div>";
    }).join("");
    return h + "</div>";
  }
  function wordsCard(words) {
    var v = S.form.cwords != null ? S.form.cwords : words || "";
    return '<div class="card small"><b>' + t("aWordsT") + '</b><div class="tiny muted">' + t("aWordsX") + '</div><textarea data-f="cwords" rows="4">' + esc(v) + "</textarea>" +
      '<button type="button" class="btn" data-a="aWordsSave">' + t(S.aWordsOk ? "aWordsSaved" : "aWordsSave") + "</button></div>";
  }
  function vJournalBody() {
    var j = lazy("journal", "admin/journal");
    var h = '<div class="body"><div class="tiny muted">' + t("aJournalNote") + "</div>";
    if (!j) return h + '<div class="muted">' + t("loading") + "</div></div>";
    return h + '<div class="card list">' + j.items.map(function (x) {
      var who = x.who === "owner" ? t("who_owner") : x.who === "bot" ? t("who_bot") : esc(x.who);
      return '<div class="jrow"><span class="muted">' + fmtTime(x.at) + "</span><span>" + who + " " + (hasT("j_" + x.action) ? t("j_" + x.action) : esc(x.action)) + " " + esc(x.target || "") + "</span></div>";
    }).join("") + "</div></div>";
  }
  /* owner, 2026-10-21: the overview cards — Cloudflare usage, summary for a day / week, reminders; every mutual like */
  function lazy(key, path) {
    if (S.aData[key]) return S.aData[key];
    if (!S.aData[key + "Loading"]) { S.aData[key + "Loading"] = true; api("GET", path).then(function (r) { S.aData[key + "Loading"] = false; if (r.ok) { S.aData[key] = r; render(); } }); }
    return null;
  }
  function num(n) { return String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009"); }
  function usageCard() {
    var u = lazy("usage", "admin/usage");
    if (!u) return "";
    if (!u.configured) return '<div class="card small muted">' + t("aUseOff") + "</div>";
    if (u.error) return '<div class="card small muted">' + t("aUseErr", { e: esc(u.error) }) + "</div>";
    var p = Math.round(u.today / u.limit * 1000) / 10, col = p >= 80 ? "var(--danger)" : p >= 50 ? "#b08a2e" : "var(--ok)";
    return '<div class="card"><div class="nbtop"><b>' + t("aUse") + '</b><span class="tiny muted">' + t("aUseSince") + "</span></div>" +
      '<div><span class="serif" style="font-size:28px">' + num(u.today) + '</span> <span class="small muted">' + t("aUseOf", { lim: num(u.limit), p: p }) + "</span></div>" +
      '<div class="fbar"><i style="width:' + Math.max(1, Math.min(100, p)) + "%;background:" + col + '"></i></div>' +
      '<div class="small muted" style="line-height:1.5">' + t("aUseMore", { y: num(u.yesterday), m: num(u.peak7) }) + "<br>" + t("aUseDb", { r: num(u.rows_read), w: num(u.rows_written) }) + '</div><div class="tiny muted">' + t("aUseNote") + "</div></div>";
  }
  /** owner, 2026-10-26: retention — only when recording is on or there is data */
  function retentionCard() {
    var x = lazy("retention", "admin/retention");
    if (!x || (!x.on && !x.first)) return "";
    var pc = function (c) { return c && c.base ? Math.round((c.back || 0) / c.base * 100) + "%" : "—"; };
    var h = '<div class="card"><b>' + t("aRet") + '</b><div class="tiny muted">' + (x.on ? t("aRetOn", { date: fmtDate(x.since || x.first) }) : t("aRetOff")) + "</div>";
    h += '<div class="tiles" style="grid-template-columns:repeat(3,minmax(0,1fr))">' + tile(x.active.d1, t("aRetD1")) + tile(x.active.d7, t("aRetD7")) + tile(x.active.d30, t("aRetD30")) + "</div>";
    [["back1", "aRetBack1"], ["back7", "aRetBack7"], ["back30", "aRetBack30"]].forEach(function (o) {   // owner, 2026-10-27: + month
      var c = x[o[0]] || {};
      h += '<div class="small" style="display:flex;justify-content:space-between"><span>' + t(o[1]) + "</span><b>" + pc(c) + ' <span class="tiny muted">(' + (c.back || 0) + " / " + (c.base || 0) + ")</span></b></div>";
    });
    if (x.days.length) {
      var mx = Math.max.apply(null, x.days.map(function (d) { return d.n; })) || 1;
      h += '<div class="tiny muted" style="margin-top:4px">' + t("aRetDays") + '</div><div class="rbars" role="img" aria-label="' + esc(t("aRetDays")) + '">' + x.days.map(function (d) {
        return '<span title="' + esc(d.day + ": " + d.n) + '"><i style="height:' + Math.max(4, Math.round(d.n / mx * 48)) + 'px"></i><em>' + d.n + "</em></span>"; }).join("") + "</div>";
    }
    // owner, 2026-11-07: D7 / D30 (came back on days 7–13 / 30–36) and new mutual likes per active person
    [["d7", "aRetW7"], ["d30", "aRetW30"]].forEach(function (o) {
      var c = x[o[0]];
      if (c) h += '<div class="small" style="display:flex;justify-content:space-between"><span>' + t(o[1]) + "</span><b>" + pc(c) + ' <span class="tiny muted">(' + (c.back || 0) + " / " + (c.base || 0) + ")</span></b></div>";
    });
    var mp = x.mutual_per_active;
    if (mp) h += '<div class="small" style="display:flex;justify-content:space-between"><span>' + t("aRetMut") + "</span><b>" + (mp.d7 != null ? mp.d7 : "—") + " · " + (mp.d30 != null ? mp.d30 : "—") +
      ' <span class="tiny muted">(' + t("aRetMutN", { a: mp.new7, b: mp.new30 }) + ")</span></b></div>";
    return h + '<div class="tiny muted">' + t("aRetNote") + "</div></div>";
  }
  function summaryCard(part) {   // owner, 2026-11-02: "new" = people and steps, "act" = mutual likes
    var per = S.aSumPer || "day", x = lazy("sum_" + per, "admin/summary?period=" + per);
    var h = '<div class="seg" style="padding:0">' + [["day", "aSumDay"], ["week", "aSumWeek"], ["month", "aSumMonth"]].map(function (o) { return '<button type="button" data-a="aSumPer" data-v="' + o[0] + '" aria-pressed="' + (per === o[0]) + '">' + t(o[1]) + "</button>"; }).join("") + "</div>";
    if (!x) return h;
    if (part === "act") return h + mutCard(x);
    var f = x.funnel, rate = f.opened ? Math.round(x.done / f.opened * 100) + "%" : "—";
    h += '<div class="card"><b>' + t("aSumTitle") + '</b><div class="tiles" style="grid-template-columns:repeat(3,minmax(0,1fr))">' + tile(f.opened, t("aSumOpened")) + tile(x.done, t("aSumDone")) + tile(rate, t("aSumRate")) + "</div>";
    var prev = f.opened;
    ["opened", "consent", "checklist", "profile", "place"].forEach(function (k) {
      var v = f[k], lost = prev - v; prev = v;
      h += '<div class="small" style="display:flex;justify-content:space-between"><span>' + t("aSt_" + k) + "</span><span><b>" + v + "</b>" + (k !== "opened" ? ' <span style="color:' + (lost ? "var(--danger)" : "var(--muted)") + '">' + (lost ? "−" + lost : "0") + "</span>" : "") + "</span></div>" +
        '<div class="fbar"><i style="width:' + (f.opened ? Math.round(v / f.opened * 100) : 0) + '%"></i></div>';
    });
    h += "</div>";
    var st = x.stuck || {};
    h += '<div class="card small"><b>' + t("aStumble") + "</b>" + x.errors.map(function (e) { return '<div style="display:flex;justify-content:space-between;gap:8px"><span>' + esc((e.api || "") + " → " + e.status) + "</span><span>" + t("aStumbleTimes", { n: e.n, p: e.people }) + "</span></div>"; }).join("") +
      '<div style="display:flex;justify-content:space-between"><span>' + t("aStuckNow") + "</span><b>" + ((st.consent || 0) + (st.checklist || 0) + (st.profile || 0) + (st.place || 0)) + "</b></div>" +
      '<div class="tiny muted">' + t("aStuckBy", { c: st.consent || 0, l: st.checklist || 0, p: st.profile || 0, m: st.place || 0 }) + '</div><div class="tiny muted">' + t("aStumbleNote") + "</div></div>";
    var sc = x.screens;   // owner, 2026-10-27: registration screens and the shape of refused inputs
    if (sc && sc.since) {
      var base = f.opened || 0;
      h += '<div class="card small"><b>' + t("aScrTitle") + "</b>" + ["consent", "checklist", "fill", "profile", "place", "map"].map(function (k) {
        var v = sc.reached[k] || 0;
        return '<div style="display:flex;justify-content:space-between"><span>' + t("aScr_" + k) + "</span><b>" + v + "</b></div>" + '<div class="fbar"><i style="width:' + (base ? Math.min(100, Math.round(v / base * 100)) : 0) + '%"></i></div>';
      }).join("");
      var lk = Object.keys(sc.last || {});
      if (lk.length) h += '<div class="tiny muted" style="margin-top:4px">' + t("aScrLast") + " " + ["consent", "checklist", "fill", "profile", "place", "map"].filter(function (k) { return sc.last[k]; }).map(function (k) { return t("aScr_" + k) + " — " + sc.last[k]; }).join(", ") + "</div>";
      h += '<div class="tiny muted">' + t("aScrNote", { date: fmtDate(sc.since) }) + "</div></div>";
    }
    if (x.shapes && x.shapes.length) h += '<div class="card small"><b>' + t("aShapes") + "</b>" + x.shapes.map(function (e) {
      return '<div style="display:flex;justify-content:space-between;gap:8px"><span>' + esc((e.api || "") + " → " + e.status) + '<br><span class="tiny muted">' + esc(e.shape) + "</span></span><span>" + t("aStumbleTimes", { n: e.n, p: e.people }) + "</span></div>"; }).join("") +
      '<div class="tiny muted">' + t("aShapesNote") + "</div></div>";
    if (x.reminders) h += '<div class="tiny muted">' + t("aRemPeriod", { n: x.reminders, m: x.reminders_moved }) + "</div>";
    return h;
  }
  function mutCard(x) {
    return '<div class="card"><b>' + t("aMutTitle") + '</b><div class="tiles" style="grid-template-columns:repeat(3,minmax(0,1fr))">' + tile('<span style="color:var(--ok)">+' + x.mutual_new + "</span>", t("aMutNew")) +
      tile('<span style="color:var(--danger)">−' + x.mutual_broken + "</span>", t("aMutBroken")) + tile(x.mutual_now, t("aMutNow")) + "</div>" +
      '<div class="small muted">' + t("aMutYes", { y: x.yes, n: x.no }) + '</div><button type="button" class="btn" data-a="aMutOpen">' + t("aMutOpen") + "</button></div>";
  }
  function remindersCard() {
    var r = lazy("rem", "admin/reminders");
    if (!r) return "";
    var w = r.waiting, sent = 0; Object.keys(r.sent).forEach(function (k) { sent += r.sent[k]; });
    return '<div class="card"><b>' + t("aRemTitle") + '</b><label class="row" style="padding:0"><span>' + t("aRemOn") + '</span><input class="switch" type="checkbox" data-a="aRemSet"' + (r.on ? " checked" : "") + "></label>" +
      '<div class="tiny muted" style="line-height:1.5">' + t("aRemNote") + '</div><div class="small">' + t("aRemWait", { c: w.consent, l: w.checklist, p: w.profile, m: w.place }) + '</div><div class="small muted">' + t("aRemSent", { n: sent, m: r.moved }) + "</div></div>";
  }
  function vAdminMutuals() {
    var st = S.aMutState || "now", days = S.aMutDays == null ? 7 : S.aMutDays, key = "mut_" + st + "_" + days;
    var x = lazy(key, "admin/mutuals?state=" + st + "&days=" + days);
    var h = '<div class="backrow"><button type="button" data-a="aMutClose" aria-label="' + t("back") + '">‹</button><span class="serif" style="font-size:20px">' + t("aMutPage") + '</span></div><div class="body">';
    h += '<div class="seg" style="padding:0">' + [["now", "aMutNowTab"], ["broken", "aMutBrokenTab"], ["hidden", "aMutHiddenTab"], ["likes", "aMutLikesTab"]].map(function (o) { return '<button type="button" data-a="aMutState" data-v="' + o[0] + '" aria-pressed="' + (st === o[0]) + '">' + t(o[1]) + "</button>"; }).join("") + "</div>";
    h += '<div class="chiprow">' + [[1, "aMutToday"], [7, "aMut7"], [30, "aMut30"], [0, "aMutAll"]].map(function (o) { return '<button type="button" class="chip" data-a="aMutDays" data-v="' + o[0] + '" aria-pressed="' + (days === o[0]) + '">' + t(o[1]) + "</button>"; }).join("") + "</div>";
    h += '<input type="text" data-a="aMutSearch" placeholder="' + esc(t("aMutSearch")) + '" value="' + esc(S.aMutQ || "") + '">';
    if (!x) return h + '<div class="muted">' + t("loading") + "</div></div>";
    var q = String(S.aMutQ || "").toLowerCase().replace(/^@/, "");
    var hit = function (p) { return p && (!q || (p.nick || "").toLowerCase().indexOf(q) >= 0 || (p.user || "").toLowerCase().indexOf(q) >= 0); };
    var nm = function (p) { return p ? (p.n ? '<button type="button" class="btn link" style="padding:0" data-a="aOpen" data-v="' + esc(p.n) + '">' + esc(p.nick || "#" + p.n) + "</button>" : esc(p.nick || "?")) : t("aMutGone"); };
    var items = x.items.filter(function (it) { return !q || hit(it.a) || hit(it.b); });
    if (!items.length) return h + '<div class="small muted">' + t("aMutEmpty") + "</div></div>";
    items.forEach(function (it) {
      h += '<div class="card' + (st === "now" || st === "likes" ? "" : " warn") + '" style="gap:4px"><div class="nbtop"><span style="font-weight:600">' + nm(it.a) + (st === "likes" ? " → " : " ⇄ ") + nm(it.b) + "</span>" + (it.pct != null ? '<span class="serif" style="font-size:18px;color:var(--accent)">' + it.pct + "%</span>" : "") + "</div>";
      if (st === "likes") {
        h += '<div class="small muted">' + fmtTime(it.at) + " · " + t(it.back === "yes" ? "aLikeBackYes" : it.back === "no" ? "aLikeBackNo" : "aLikeBackNone") + "</div>" +
          '<div class="small"' + (it.note === "sent" || it.note === "mutual" ? "" : ' style="color:var(--danger)"') + ">" + t("aNote_" + it.note) + "</div>" +
          '<div class="tiny muted">' + t("aLikeNow", { s: t(it.b_notify ? "aLikeOn" : "aLikeOffNow") }) + "</div></div>";
        return;
      }
      if (st === "broken") {
        var how = it.how === "account_deleted" ? "aMutHow_gone" : it.value === "no" ? "aMutHow_no" : it.how === "unmatch" ? "aMutHow_unmatch" : "aMutHow_card";
        h += '<div class="small">' + (it.how === "account_deleted" ? fmtTime(it.at) + " · " + t(how) : t("aMutBrokeBy", { d: fmtTime(it.at), who: "<b>" + esc(it.a.nick || "#" + it.a.n) + "</b>", how: t(how) })) + "</div>";
        if (it.b && it.other_still_yes) h += '<div class="tiny muted">' + t("aMutStill", { who: esc(it.b.nick || "#" + it.b.n) }) + "</div>";
      } else {
        h += '<div class="small muted">' + t("aMutSince", { d: fmtTime(it.since), who: esc((it.first === "a" ? it.a : it.b).nick || "?") }) + "</div>";
        it.why.forEach(function (w) { var p = w.who === "a" ? it.a : it.b; h += '<div class="small" style="color:var(--danger)">' + t("aMutHid", { who: esc(p.nick || "#" + p.n), st: hasT("aMutSt_" + w.status) ? t("aMutSt_" + w.status) : esc(w.status) }) + "</div>"; });
      }
      h += "</div>";
    });
    return h + "</div>";
  }
  /* owner, 2026-10-21: how many people where — counts per zone as dots, no names (src/stats.js map) */
  var amap = null;
  function vAdminMap() {
    var f = S.aMapF || { from: "all", gender: "", role: "" }, key = "map_" + f.from + "_" + f.gender + "_" + f.role;
    var x = lazy(key, "admin/map?from=" + encodeURIComponent(f.from) + "&gender=" + f.gender + "&role=" + f.role);
    var h = '<div class="backrow"><button type="button" data-a="aMapClose" aria-label="' + t("back") + '">‹</button><span class="serif" style="font-size:20px">' + t("aMap") + "</span></div>";
    var chip = function (k, v, label) { return '<button type="button" class="chip" data-a="aMapF" data-k="' + k + '" data-v="' + esc(v) + '" aria-pressed="' + (f[k] === v) + '">' + label + "</button>"; };
    h += '<div class="chiprow">' + chip("from", "all", t("aMapAll")) + chip("from", "space", t("aMapSpace")) + chip("from", "uni", t("aMapUni")) +
      ((x && x.chats) || []).map(function (c) { return chip("from", c.id, "«" + esc(c.title.slice(0, 24)) + "»"); }).join("") + "</div>";
    h += '<div class="chiprow">' + chip("gender", "", t("aMapAnyG")) + ["man", "woman", "other"].map(function (g) { return chip("gender", g, t("g_" + g)); }).join("") +
      chip("role", "", t("aMapAnyR")) + ["top", "bottom", "switch", "none"].map(function (r) { return chip("role", r, roleMark(r) + t("r_" + r)); }).join("") + "</div>";
    h += '<div class="chiprow"><button type="button" class="chip" data-a="aMapLabels" aria-pressed="' + !!S.aMapLabels + '">' + t("aMapLabels") + "</button></div>";
    h += '<div id="amap" style="height:60vh;min-height:320px"></div><div class="body" style="padding-top:8px"><b>' + (x ? t("aMapTotal", { n: x.total }) : t("loading")) + '</b><div class="tiny muted">' + t("aMapNote") + "</div></div>";
    return h;
  }
  function drawAdminMap() {
    if (!S.aMapPage) return;
    if (!window.L) return loadLeaflet(function () { if (S.aMapPage) drawAdminMap(); });
    var f = S.aMapF || { from: "all", gender: "", role: "" }, x = S.aData["map_" + f.from + "_" + f.gender + "_" + f.role], el = document.getElementById("amap");
    if (amap) { S.aMapView = { c: amap.getCenter(), z: amap.getZoom() }; amap.remove(); amap = null; }
    if (!el || !x) return;
    amap = L.map(el, { zoomControl: true, attributionControl: true });
    amap.attributionControl.setPrefix(false);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 15, minZoom: 3, attribution: "© OpenStreetMap" }).addTo(amap);
    var accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8a2d47", polys = [];
    var seed = 7, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };   // the same dots every time
    x.zones.forEach(function (z) {
      var poly = L.polygon(z.b, { color: "#241c22", weight: 1, opacity: 0.35, fillColor: accent, fillOpacity: 0.05 }).addTo(amap);
      polys.push(poly);
      var bb = poly.getBounds(), placed = 0, tries = 0;
      while (placed < z.n && tries < z.n * 30) {   // a dot per person, at random inside the zone
        tries++;
        var lat = bb.getSouth() + rnd() * (bb.getNorth() - bb.getSouth()), lng = bb.getWest() + rnd() * (bb.getEast() - bb.getWest());
        if (!inPoly([lat, lng], z.b)) continue;
        // owner, 2026-10-25: the same figures as on people's own map (shape = role, colour = gender), not a circle for everyone
        var who = z.people && z.people[placed];
        var st = who && who.star;   // owner, 2026-10-27: a lit star (pale while the person has not switched it on)
        var dot = L.marker([lat, lng], { icon: L.divIcon({ className: "amfig" + (st ? " amstar" + (st === "off" ? " off" : "") : ""), html: st ? starSvg(who.gender, 24) : '<span class="pm g-' + esc((who && who.gender) || "other") + '">' + figure(who ? who.role : null) + "</span>", iconSize: st ? [24, 24] : [18, 18], iconAnchor: st ? [12, 12] : [9, 9] }), keyboard: false }).addTo(amap);
        if (who) {   // owner, 2026-10-21: the nickname on the dot; a tap opens the profile
          dot.bindTooltip(esc(who.nick || "#" + who.n), { permanent: !!S.aMapLabels, direction: "top", offset: [0, -4] });
          dot.bindPopup('<button type="button" class="btn link" style="padding:0" data-a="aOpen" data-v="' + esc(who.n) + '">' + esc(who.nick || "#" + who.n) + " ›</button>");
        }
        placed++;
      }
    });
    if (S.aMapView) amap.setView(S.aMapView.c, S.aMapView.z);
    else if (polys.length) amap.fitBounds(L.featureGroup(polys).getBounds(), { padding: [20, 20], maxZoom: 12 });
    else amap.setView([50, 20], 4);
  }
  function inPoly(p, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var a = poly[i], b = poly[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }
  /* owner, 2026-10-21: «Вселенная» card on the overview + its page; open space for people without chats */
  function uniCard() {
    var u = S.aData.universe;
    if (!u) { if (!S.aData.uniLoading) { S.aData.uniLoading = true; api("GET", "admin/universe").then(function (r) { S.aData.uniLoading = false; if (r.ok) { S.aData.universe = r; render(); } }); } return ""; }
    var h = '<div class="card' + (u.requests.length ? " warn" : "") + '"><div class="nbtop"><h2>' + t("aUni") + '</h2><span class="tiny muted">' + t("aUniPeople", { n: u.people }) + "</span></div>" +
      '<div class="small">' + t("aUniCard", { n: u.members.length, r: u.requests.length }) + '</div><button type="button" class="btn" data-a="aUniOpen">' + t("aUniOpen") + "</button></div>";
    if (u.no_chat || S.aData.spaceSent != null) h += '<div class="card small"><div>' + t("aNoChat", { n: u.no_chat }) + "</div>" +
      (u.no_chat ? '<button type="button" class="btn" data-a="aSpaceInvite">' + t("aNoChatBtn") + "</button>" : "") +
      (S.aData.spaceSent != null ? '<div class="tiny muted">' + t("aNoChatSent", { n: S.aData.spaceSent }) + "</div>" : "") + "</div>";
    return h;
  }
  function vAdminUniverse() {
    var u = S.aData.universe;
    var h = '<div class="backrow"><button type="button" data-a="aUniClose" aria-label="' + t("back") + '">‹</button><span class="serif" style="font-size:20px">' + t("aUni") + "</span></div><div class=\"body\">";
    if (!u) { uniCard(); return h + '<div class="muted">' + t("loading") + "</div></div>"; }
    h += '<div class="small muted" style="line-height:1.5">' + t("aUniNote") + "</div>";
    var row = function (c, btns) {
      return '<div class="row" style="padding:10px 0;align-items:center;gap:8px"><span><b style="font-weight:500">«' + esc(c.title) + '»</b><br><span class="tiny muted">' +
        [t("aUniInBot", { n: c.in_bot }), c.only_chat ? t("aUniOnly", { n: c.only_chat }) : "", c.by ? t("aUniBy", { who: esc(c.by) }) : "", c.at ? fmtDate(c.at) : ""].filter(Boolean).join(" · ") + "</span></span>" +
        '<span style="display:flex;gap:6px">' + btns.map(function (b) { return '<button type="button" class="btn small' + (b[2] || "") + '" style="min-height:36px;padding:0 10px" data-a="aUniAct" data-v="' + b[0] + '" data-c="' + esc(c.id) + '" data-t="' + esc(c.title) + '">' + t(b[1]) + "</button>"; }).join("") + "</span></div>";
    };
    if (u.requests.length) h += '<div class="card warn"><h2>' + t("aUniReq") + " · " + u.requests.length + "</h2>" + u.requests.map(function (c) { return row(c, [["decline", "aUniDecline"], ["accept", "aUniAccept", " primary"]]); }).join("") + "</div>";
    h += '<div class="card"><div class="nbtop"><h2>' + t("aUniIn") + " · " + u.members.length + '</h2><span class="tiny muted">' + t("aUniPeople", { n: u.people }) + "</span></div>" +
      (u.members.length ? u.members.map(function (c) { return row(c, [["remove", "aUniRemove", " danger"]]); }).join("") : '<div class="small muted">' + t("aUniEmpty") + "</div>") + "</div>";
    if (u.others.length) h += '<div class="card"><h2>' + t("aUniOthers") + '</h2><div class="tiny muted">' + t("aUniOthersNote") + "</div>" + u.others.map(function (c) { return row(c, [["add", "aUniAdd", " primary"]]); }).join("") + "</div>";
    return h + errLine() + "</div>";
  }
  function backupCard() {
    var b = S.bk || {};
    var h = '<div class="card"><h2>' + t("bkTitle") + '</h2><div class="tiny muted">' + t("bkWhere") + "</div>";
    h += '<button type="button" class="btn primary" data-a="bkMake"' + (b.busy ? " disabled" : "") + ">" + t("bkMake") + "</button>";
    if (b.msg) h += '<div class="small">' + esc(b.msg) + "</div>";
    if (b.url) h += '<a class="btn" href="' + b.url + '" download="' + esc(b.name) + '">' + t("bkSave") + "</a>";
    h += '<div class="tiny muted">' + t("bkKey") + "</div>";
    h += '<div class="lbl">' + t("bkRestore") + '</div><input type="file" accept=".json,application/json" data-a="bkFile">' +
      '<div class="tiny muted">' + t("bkRestoreNote") + '</div><input type="text" data-f="bkWord" autocomplete="off" placeholder="' + esc(t("bkWord")) + '">' +
      '<button type="button" class="btn danger" data-a="bkRestore"' + (b.busy ? " disabled" : "") + ">" + t("bkRestore") + "</button>";
    return h + "</div>";
  }
  function diagCard() {
    var st = S.aData.settings;
    if (!st) { if (!S.aData.settingsLoading) { S.aData.settingsLoading = true; api("GET", "admin/settings").then(function (r) { S.aData.settingsLoading = false; if (r.ok) { S.aData.settings = r; render(); } }); } return ""; }
    var h = '<div class="card"><h2>' + t("aDiag") + '</h2><div class="tiny muted">' + t("aVersion", { v: esc(st.version) }) + "</div>";
    h += '<label class="row" style="padding:0"><span>' + t("aFiltersOff") + '</span><input class="switch" type="checkbox" data-a="aSet" data-v="filters_off"' + (st.filters_off ? " checked" : "") + "></label>";
    h += '<label class="row" style="padding:0"><span>' + t("aDebug") + (st.debug_until ? '<br><span class="tiny muted">' + t("aDebugUntil", { date: fmtTime(st.debug_until) }) + "</span>" : "") + '</span><input class="switch" type="checkbox" data-a="aSet" data-v="debug"' + (st.debug_until ? " checked" : "") + "></label>";
    h += '<label class="row" style="padding:0"><span>' + t("aVisits") + '<br><span class="tiny muted">' + t("aVisitsNote") + '</span></span><input class="switch" type="checkbox" data-a="aSet" data-v="visits"' + (st.visits ? " checked" : "") + "></label>";
    h += '<div class="tiny muted">' + t("aDiagNote") + "</div>";
    h += '<div class="decide"><button type="button" class="btn" data-a="aReport">' + t("aReport") + '</button><button type="button" class="btn primary" data-a="aReportSend">' + t("aReportSend") + "</button></div>";
    if (S.aData.reportSent) h += '<div class="tiny muted">' + t("aReportSent") + "</div>";
    h += '<button type="button" class="btn" data-a="aCalib">' + t("aCalib") + "</button>";
    if (S.aData.calib) h += '<div class="tiny muted">' + t("aCalibSent", { p: S.aData.calib.people, m: S.aData.calib.mutual }) + "</div>";
    if (S.aData.reportText) h += '<button type="button" class="btn link" data-a="aReportCopy">' + t("aCopy2") + '</button><pre class="report">' + esc(S.aData.reportText) + "</pre>";
    return h + "</div>";
  }
  function adminTabs() {
    var icons = {
      overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
      reports: SHIELD,
      profiles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1.2-3.4 3.6-5 6.5-5s5.3 1.6 6.5 5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 15c1.6.6 2.6 2.3 3 5"/></svg>',
      mods: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/><path d="M17 3l1 2 2 .3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L14 5.3l2-.3z"/></svg>',
      ints: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 9-8 9-8-9z"/><path d="M12 8l3.5 4-3.5 4-3.5-4z"/></svg>',
      stars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="' + STAR_OUT + '"/></svg>',
      texts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
    };
    var labels = { overview: "aOverview", reports: "mReports", profiles: "aProfiles", stars: "aStars", ints: "aIntsTab", texts: "aTexts", mods: "aModsTab" };
    return '<nav class="tabs atabs">' + ["overview", "reports", "profiles", "stars", "ints", "texts", "mods"].map(function (k) {
      return '<button type="button" class="tab" data-a="aTab" data-v="' + k + '"' + (S.aTab === k ? ' aria-current="page"' : "") + ">" + (k === "mods" && S.me.cal_wait ? '<span class="tdot" aria-hidden="true"></span>' : "") + icons[k] + t(labels[k]) + "</button>";
    }).join("") + "</nav>";
  }
  /** All profiles (owner: admin/profiles, moderators: mod/profiles — only their chats). Never any location. */
  /* The profiles list (owner, 2026-10-20: «no registration date, no filter by steps, hard to read»):
     search + sort, steps as chips with counts, «suspicious» / «space» toggles, one chat selector; each row shows
     nickname, gender · age · role · answers, a 4-step progress bar, registration date and the last visit. */
  var STAGES = ["opened", "checklist", "profile", "place", "active", "hidden", "banned"];
  function profilesBody(path) {
    var p = S.aData.profiles;
    var h = '<div style="padding:0 16px 8px;display:flex;gap:8px"><input type="search" style="flex:1" data-a="aSearch" placeholder="' + esc(t(S.me.admin ? "aSearch" : "aSearchMod")) + '" value="' + esc(S.aQuery) + '">' +
      '<select data-a="aSort" style="max-width:46%">' + ["new", "visible", "old", "seen", "answers"].map(function (k) { return '<option value="' + k + '"' + (S.aSort === k ? " selected" : "") + ">" + t("sort_" + k) + "</option>"; }).join("") + "</select></div>";
    if (!p) { mLoad("profiles", path); return h + '<div class="body"><div class="muted">' + t("loading") + "</div></div>"; }
    var count = { all: p.items.length }; STAGES.forEach(function (k) { count[k] = 0; }); p.items.forEach(function (x) { count[x.stage] = (count[x.stage] || 0) + 1; });
    h += '<div class="chiprow">' + ["all"].concat(STAGES).filter(function (k) { return k === "all" || count[k] || S.aStage === k; }).map(function (k) {
      return '<button type="button" class="chip" data-a="aStage" data-v="' + k + '" aria-pressed="' + (S.aStage === k) + '">' + (k === "all" ? t("aAll") : t("stage_" + k)) + " · " + (count[k] || 0) + "</button>"; }).join("") + "</div>";
    // owner, 2026-10-20: filter by gender too
    var gc = {}; p.items.forEach(function (x) { var g = x.gender || "none"; gc[g] = (gc[g] || 0) + 1; });
    h += '<div class="chiprow">' + ["all", "woman", "man", "other", "none"].filter(function (g) { return g === "all" || gc[g] || S.aGender === g; }).map(function (g) {
      return '<button type="button" class="chip" data-a="aGender" data-v="' + g + '" aria-pressed="' + (S.aGender === g) + '">' + (g === "all" ? t("aAllGenders") : g === "none" ? t("aNoGender") : t("g_" + g)) + " · " + (g === "all" ? p.items.length : gc[g] || 0) + "</button>"; }).join("") + "</div>";
    var titles = []; p.items.forEach(function (x) { x.chats.forEach(function (c) { if (titles.indexOf(c) < 0) titles.push(c); }); });
    h += '<div class="chiprow" style="align-items:center">' +
      '<button type="button" class="chip" data-a="aToggle" data-v="aSusp" aria-pressed="' + S.aSusp + '">' + t("aOnlySusp") + "</button>" +
      '<button type="button" class="chip" data-a="aToggle" data-v="aSpace" aria-pressed="' + S.aSpace + '">' + t("aOnlySpace") + "</button>" +
      (S.me.admin ? '<button type="button" class="chip" data-a="aToggle" data-v="aStar" aria-pressed="' + !!S.aStar + '">' + starSvg("woman", 14) + " " + t("aStars") + " · " + p.items.filter(function (x) { return x.star; }).length + "</button>" : "") +
      (titles.length > 1 ? '<select data-a="aChatSel" style="min-height:34px;max-width:100%;flex:1">' + '<option value="">' + t("aAllChats") + "</option>" + titles.map(function (c) { return '<option value="' + esc(c) + '"' + (S.aChat === c ? " selected" : "") + ">«" + esc(c) + "»</option>"; }).join("") + "</select>" : "") + "</div>";
    h += '<div class="body" style="padding-top:0">';
    var q = S.aQuery.trim().toLowerCase(), qn = q.replace(/^#/, ""), qu = q.replace(/^@/, "");
    var list = p.items.filter(function (x) {
      // search: #number, nickname, @username or the Telegram name (the last two: owner only)
      var hit = !q || x.n.indexOf(qn) === 0 || (x.nick || "").toLowerCase().indexOf(q) >= 0 ||
        (x.username && x.username.toLowerCase().indexOf(qu) >= 0) || (x.tg_name && x.tg_name.toLowerCase().indexOf(q) >= 0);
      return (S.aStage === "all" || x.stage === S.aStage) && (S.aGender === "all" || (x.gender || "none") === S.aGender) && (!S.aSusp || x.suspicious) && (!S.aSpace || x.space) && (!S.aStar || x.star) &&
        (!S.aChat || x.chats.indexOf(S.aChat) >= 0) && (!S.aLate || x.late) && hit;
    });
    var by = { new: function (a, b) { return b.created - a.created; }, old: function (a, b) { return a.created - b.created; },
      seen: function (a, b) { return (b.seen || 0) - (a.seen || 0); }, visible: function (a, b) { return (b.visible || 0) - (a.visible || 0); }, answers: function (a, b) { return (b.answered || 0) - (a.answered || 0); } };
    list.sort(by[S.aSort] || by.new);
    if (S.aLate) h += '<div class="card small warn" style="flex-direction:row;justify-content:space-between;align-items:center"><span>' + t("aLateOnly") + '</span><button type="button" class="btn link" data-a="aLateOff">' + t("aLateOff") + "</button></div>";
    h += '<div class="tiny muted">' + t("aFound", { n: list.length }) + "</div>";
    if (!list.length) h += '<div class="card small muted">' + t("mEmpty") + "</div>";
    list.forEach(function (x) {
      var done = ["consent", "checklist", "profile", "location"].filter(function (k) { return x.steps && x.steps[k]; }).length;
      var bar = '<span class="steps" aria-label="' + t("aStepsN", { n: done }) + '">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i < done ? "on" : "") + '"></i>'; }).join("") + "</span>";
      var info = [x.gender ? t("g_" + x.gender) : "", x.age != null ? x.age : "", x.role ? t("r_" + x.role) : "", x.answered != null ? t("aAnswersN", { n: x.answered }) : ""].filter(function (v) { return v !== ""; }).join(" · ");
      var chats = x.chats.slice(0, 2).map(function (c) { return "«" + esc(c) + "»"; }).join(", ") + (x.chats.length > 2 ? " " + t("aMoreChats", { n: x.chats.length - 2 }) : "");
      h += '<button type="button" class="card nb prow" data-a="aOpen" data-v="' + esc(x.n) + '">' +
        '<div class="nbtop"><div style="font-weight:600">' + (x.star ? starSvg(x.gender, 16) + " " : "") + (x.nick ? esc(x.nick) : '<span class="muted">' + t("aNoNick") + "</span>") + "</div>" +
        '<span style="display:flex;gap:6px">' + (x.late && x.stage === "active" ? '<span class="badge new">' + t("aNewTag") + "</span>" : "") +
        '<span class="badge st-' + x.stage + '">' + t("stage_" + x.stage) + "</span></span></div>" +
        (info ? '<div class="small">' + esc(info) + "</div>" : "") +
        (x.username || x.tg_name ? '<div class="small">' + [x.username ? "@" + esc(x.username) : "", x.tg_name ? esc(x.tg_name) : ""].filter(Boolean).join(" · ") + "</div>" : "") +
        '<div class="tiny muted" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' + bar + "<span>" + t("aReg", { d: fmtDate(x.created) }) + "</span>" + (x.visible ? "<span>" + t("aVisibleSince", { d: fmtDate(x.visible) }) + "</span>" : "") + (x.seen ? "<span>" + t("aSeen", { d: fmtTime(x.seen) }) + "</span>" : "") + "</div>" +
        '<div class="tiny muted">#' + esc(x.n) + (chats ? " · " + chats : "") + (x.space ? " · " + t("aSpaceYes") : "") +
        (x.hidden_until ? ' <span class="flag">' + t("mHeld") + "</span>" : "") + (x.suspicious ? ' <span class="flag">' + t("aSuspicious") + "</span>" : "") + "</div></button>";
    });
    return h + "</div>";
  }
  /* ---------- moderation (moderators: a tab; the owner: «Жалобы» in the panel) ---------- */
  function vModeration() {
    var h = '<div class="top"><h1>' + t("tMod") + "</h1></div>";
    if (S.me.mod && !S.me.mod.intro_seen) return h + '<div class="body"><div class="card"><h2>' + t("mIntroTitle") + '</h2><div class="small">' + t("mIntro1") + '</div><div class="small">' + t("mIntro2") +
      '</div><div class="small muted">' + t("mIntro3") + '</div><button type="button" class="btn primary" data-a="mIntroOk">' + t("mIntroOk") + "</button></div></div>";
    var evRev = !!(S.me.cal && S.me.cal.review);   // owner, 2026-10-29: moderators of all chats review events
    if (S.mTab === "events" && !evRev) S.mTab = "reports";
    if (S.mTab === "refs" && !S.me.ref_review) S.mTab = "reports";   // owner, 2026-10-31: invitees — moderators of all chats
    h += '<div class="seg">' + [["reports", "mReports"]].concat(S.me.ref_review ? [["refs", "mRefs"]] : [], [["profiles", "aProfiles"]], evRev ? [["events", "mEvents"]] : []).map(function (o) {
      return '<button type="button" data-a="mTab" data-v="' + o[0] + '" aria-pressed="' + (S.mTab === o[0]) + '">' + t(o[1]) + (o[0] === "events" && S.me.cal.queue ? " · " + S.me.cal.queue : "") + "</button>"; }).join("") + "</div>";
    if (S.mTab === "events") return h + (K.CAL() ? K.CAL().modView() : calWait());
    if (S.mTab === "refs") return h + vRefs();
    if (S.mTab === "profiles") return h + '<div class="tiny muted" style="padding:0 16px 8px">' + t("aNoLoc") + "</div>" + profilesBody("mod/profiles");
    return h + vReports(true);
  }
  function vReports(inTab) {
    var r = S.aData.reports;
    var h = inTab ? "" : '<div class="top"><h1>' + t("mReports") + "</h1></div>";
    if (!r || r.state !== S.mState) { if (!S.aData.reportsLoading) { S.aData.reportsLoading = true; api("GET", "mod/reports?state=" + S.mState).then(function (x) { S.aData.reportsLoading = false; if (x.ok) { S.aData.reports = x; render(); } }); } return h + '<div class="body"><div class="muted">' + t("loading") + "</div></div>"; }
    h += '<div class="body" style="padding-top:0">';
    var scope = S.me.mod ? (S.me.mod.scope ? S.me.mod.scope.map(function (c) { return "«" + esc(c) + "»"; }).join(", ") : t("mAll")) : "";
    h += '<div class="tiny muted">' + (S.me.mod ? t("mYou", { scope: scope, n: r.decided_by_me }) : t("mOwner", { n: r.decided_by_me })) + "</div>";
    h += '<div class="chiprow" style="padding:0">' + [["new", "mNew", r.counts.new], ["taken", "mTaken", r.counts.taken], ["done", "mDone", null]].filter(function (o) { return !r.solo || o[0] !== "taken" || o[2]; }).map(function (o) {
      return '<button type="button" class="chip" data-a="mState" data-v="' + o[0] + '" aria-pressed="' + (S.mState === o[0]) + '">' + t(o[1]) + (o[2] ? " · " + o[2] : "") + "</button>"; }).join("") + "</div>";
    if (!r.items.length) h += '<div class="card small muted">' + t("mEmpty") + "</div>";
    r.items.forEach(function (x) {
      var sub = [x.chat ? "«" + esc(x.chat) + "»" : "", x.taken_by ? (x.taken_by === "me" ? t("mTakenMe") : t("mTakenBy", { who: x.taken_by === "owner" ? t("who_owner") : esc(x.taken_by) })) : "",
        x.decision ? t("d_" + x.decision) + (x.undone ? " · " + t("mUndone") : "") : "", x.proposed ? '<span class="flag">' + t("mBanWait") + "</span>" : ""].filter(Boolean).join(" · ");
      h += '<button type="button" class="card nb" data-a="mOpen" data-v="' + x.id + '"><div class="nbtop"><div><div style="font-weight:600">№' + x.id + " · " + t("rr_" + x.reason) + "</div>" +
        '<div class="tiny muted">' + sub + "</div>" + (x.others ? '<div class="tiny">' + t("mOthers", { n: x.others + 1 }) + "</div>" : "") + '</div><span class="tiny muted">' + fmtTime(x.created) + "</span></div></button>";
    });
    if (S.me.mod) h += '<div class="tiny muted">' + t("mNote") + '</div><button type="button" class="btn link" style="color:var(--danger)" data-a="mQuit">' + t("mQuit") + "</button>";
    return h + errLine() + "</div>";
  }
  function vReport() {
    var d = S.aData.report;
    var h = '<div class="backrow"><button type="button" data-a="mClose" aria-label="' + t("back") + '">‹</button><span class="serif" style="font-size:20px">' + t("mReportN", { n: S.mOpen }) + "</span></div>";
    if (!d || d.report.id !== S.mOpen) return h + '<div class="body muted">' + t("loading") + "</div>";
    var r = d.report, p = d.profile;
    h += '<div class="body"><div class="card"><div class="tiny muted">' + [r.chat ? "«" + esc(r.chat) + "»" : "", r.taken_by ? (r.taken_by === "me" ? t("mTakenMe") : t("mTakenBy", { who: r.taken_by === "owner" ? t("who_owner") : esc(r.taken_by) })) : "", fmtTime(r.created)].filter(Boolean).join(" · ") + "</div>";
    h += "<h2>" + t("rr_" + r.reason) + "</h2>" + (r.text ? '<div class="small" style="line-height:1.5">«' + esc(r.text) + "»</div>" : "");
    if (r.msg) h += '<div class="msgbox"><div class="msghead"><span>' + t("mMsg") + '</span></div><div class="msgtext">' + esc(r.msg) + "</div></div>";   // owner, 2026-10-31
    h += '<div class="tiny muted">' + t("mFrom", { chat: r.chat ? "«" + esc(r.chat) + "»" : "—", m: r.reporter_stats.month, c: r.reporter_stats.confirmed, d: r.reporter_stats.decided }) + "</div>";
    if (r.others) h += '<div class="tiny">' + t("mOthers", { n: r.others + 1 }) + "</div>";
    h += "</div>";
    if (p) {
      h += '<div class="card"><h2>' + t("mProfileN", { n: esc(p.n) }) + ' <span class="badge">' + t("st_" + p.status) + "</span></h2>";
      h += '<div class="small">' + esc([p.gender ? t("g_" + p.gender) : "", p.age, p.role ? t("r_" + p.role) : "", p.experience ? t("exp").toLowerCase() + " " + t("x_" + p.experience) : "",
        p.looking_for.length ? t("looks").toLowerCase() + ": " + p.looking_for.map(function (v) { return t("lf_" + v).toLowerCase(); }).join(", ") : ""].filter(function (v) { return v !== "" && v != null; }).join(" · ")) + "</div>";
      if (p.about) h += '<div class="small" style="line-height:1.5">«' + esc(p.about) + "»</div>";
      h += '<div class="tiny muted">' + t("mCreated", { date: fmtDate(p.created), m: r.target_stats.mutual, e: r.target_stats.earlier }) + "</div>";
      h += '<div class="small" style="font-weight:600">' + t("mAuto") + '</div><div class="small">· ' + t("mAnswered", { n: p.answered || 0 }) + "</div>" +
        (p.suspicious ? '<div class="small">· <span class="flag">' + t("mSame") + "</span></div>" : "") + (!p.has_username ? '<div class="small">· ' + t("mNoUser") + "</div>" : "") +
        (p.hidden_until ? '<div class="small">· ' + t("mHeld") + "</div>" : "");
      h += '<button type="button" class="btn" data-a="aOpen" data-v="' + esc(p.n) + '">' + t("mOpenAnswers") + "</button></div>";
    }
    if (r.status === "done") {
      h += '<div class="card small">' + t("mDecided", { d: t("d_" + r.decision), who: r.decided_by === "me" || r.decided_by === "owner" ? t("who_owner") : r.decided_by === "owner" ? t("who_owner") : esc(r.decided_by || ""), date: fmtTime(r.decided_at) }) +
        (r.undone ? " · " + t("mUndone") : "") + (r.can_undo ? '<button type="button" class="btn" data-a="mUndo">' + t("mUndo") + "</button>" : "") + "</div>";
    } else {
      // owner, 2026-10-26: a moderator's «block» waits for the owner
      if (r.proposed) {
        var by = r.proposed.by === "me" ? t("mYouProposed") : t("mProposedBy", { who: r.proposed.by === "owner" ? t("who_owner") : esc(r.proposed.by || "") });
        h += '<div class="card warn small"><b>' + t("mBanWait") + "</b><div>" + by + " · " + fmtTime(r.proposed.at) + "</div>" +
          (S.me.admin ? '<div class="decide"><button type="button" class="btn" data-a="mBanReject">' + t("mBanReject") + '</button><button type="button" class="btn primary" style="background:var(--danger);border-color:var(--danger)" data-a="mBanApprove">' + t("mBanApprove") + "</button></div>"
            : '<div class="tiny muted">' + t("mBanWaitNote") + "</div>") + "</div>";
      }
      var mine = r.status === "new" || r.taken_by === "me" || S.me.admin;
      var solo = S.aData.reports ? S.aData.reports.solo : (S.me.mod && S.me.mod.solo);
      if (r.status === "new" && !solo) h += '<button type="button" class="btn" data-a="mAct" data-v="take">' + t("mTake") + '</button><div class="tiny muted">' + t("mTakeNote") + "</div>";
      if (mine) h += '<div class="decide">' + ["dismiss", "warn", "hide7", "ban"].map(function (x) {
        if (x === "ban" && r.proposed && !S.me.admin) return "";
        return '<button type="button" class="btn' + (x === "ban" ? " danger" : "") + '" data-a="mDecide" data-v="' + x + '"' + (S.busy ? " disabled" : "") + ">" + t(x === "ban" && !S.me.admin ? "d_ban_propose" : "d_" + x) + "</button>"; }).join("") + "</div>";
      if (r.status === "taken" && !solo && (r.taken_by === "me" || S.me.admin)) h += '<button type="button" class="btn link" data-a="mAct" data-v="release">' + t("mRelease") + "</button>";
    }
    return h + errLine() + "</div>";
  }
  /** owner, 2026-10-31: invitees that reached the map — «живой» (+5 to the inviter) or «похож на бота» */
  function vRefs() {
    var st = S.refState || "review", d = S.aData.refs;
    if (!d || d.state !== st) {
      if (!S.aData.refsLoading) { S.aData.refsLoading = true; api("GET", "mod/referrals?state=" + st).then(function (r) { S.aData.refsLoading = false; if (r.ok) { r.state = st; S.aData.refs = r; if (S.me.admin) S.me.ref_wait = r.waiting; render(); } }, function () { S.aData.refsLoading = false; }); }
      return '<div class="body"><div class="muted">' + t("loading") + "</div></div>";
    }
    var h = '<div class="body" style="padding-top:0"><div class="tiny muted">' + t("refNote") + "</div>";
    h += '<div class="chiprow" style="padding:0">' + [["review", "mNew", d.waiting], ["done", "refDone", null]].map(function (o) {
      return '<button type="button" class="chip" data-a="refState" data-v="' + o[0] + '" aria-pressed="' + (st === o[0]) + '">' + t(o[1]) + (o[2] ? " · " + o[2] : "") + "</button>"; }).join("") + "</div>";
    if (!d.items.length) h += '<div class="card small muted">' + t(st === "review" ? "refEmpty" : "mEmpty") + "</div>";
    d.items.forEach(function (x) {
      var g = x.signals || {}, sh = g.shares, sig = [];
      if (g.fill_min != null && g.fill_min <= 5) sig.push(t("refSigFast", { m: g.fill_min }));
      if (sh && sh.yes >= 90) sig.push(t("refSigYes"));
      if (g.about_len < 40) sig.push(t("refSigAbout", { n: g.about_len }));
      if (!g.username) sig.push(t("refSigNoUser"));
      if (x.by && x.by.day >= 3) sig.push(t("refSigMany", { n: x.by.day }));
      h += '<div class="card refc"><div class="nbtop"><h2>' + roleMark(x.role) + esc(x.nick || "#" + x.n) + '</h2><span class="tiny muted">' + fmtTime(x.at) + "</span></div>";
      h += '<div class="small">' + esc([x.gender ? t("g_" + x.gender) : "", x.age, x.role ? t("r_" + x.role) : "", x.experience ? t("exp").toLowerCase() + ": " + t("x_" + x.experience) : ""].filter(function (v) { return v !== "" && v != null; }).join(" · ")) + "</div>";
      if (x.about) h += '<div class="small refabout">«' + esc(x.about) + "»</div>";
      if (sig.length) h += '<div class="tags">' + sig.map(function (z) { return '<span class="tag sig">' + esc(z) + "</span>"; }).join("") + "</div>";
      h += '<div class="kv small"><span>' + t("refBy") + "</span><span><b>" + esc(x.by.nick || "#" + x.by.n) + "</b> · " + t("refByStats", x.by) + "</span>" +
        "<span>" + t("refCl") + "</span><span>" + t("refClX", { n: x.answered, m: g.fill_min != null ? g.fill_min : "—" }) + "</span>" +
        (sh ? "<span>" + t("refShares") + "</span><span>" + t("refSharesX", { y: sh.yes, m: sh.maybe, n: sh.no }) + "</span>" : "") +
        "<span>" + t("refTg") + "</span><span>" + t(g.username ? "refTgYes" : "refTgNo") + "</span></div>";
      h += '<button type="button" class="btn" data-a="refOpen" data-v="' + esc(x.n) + '">' + t("refOpen") + "</button>";
      if (x.status !== "review") h += '<div class="small"><span class="rst rs-' + x.status + '">' + t("rs_" + x.status, { n: 5 }) + "</span> " + esc(t("refWho", { d: fmtTime(x.decided_at), who: x.decided_by === "owner" ? t("who_owner") : x.decided_by || "" })) + "</div>";
      if (x.status === "review" || x.can_change) h += '<div class="decide"><button type="button" class="btn' + (x.status === "ok" ? " on" : "") + '" style="background:var(--ok);border-color:var(--ok);color:#fff" data-a="refDecide" data-x="ok" data-v="' + esc(x.n) + '"' + (S.busy || x.status === "ok" ? " disabled" : "") + ">" + esc(t("refOk", { n: 5, name: x.by.nick || "" })) +
        '</button><button type="button" class="btn dangerline" data-a="refDecide" data-x="bot" data-v="' + esc(x.n) + '"' + (S.busy || x.status === "bot" ? " disabled" : "") + ">" + t("refBot") + "</button></div>";
      h += "</div>";
    });
    return h + errLine() + "</div>";
  }
  function accountCard() {
    var a = S.aData.account, n = S.aOpen;
    var h = '<div class="card"><h2>' + t("aAccount") + "</h2>";
    if (!a || a.n !== n) return h + '<div class="tiny muted">' + t("aAccountNote") + '</div><button type="button" class="btn" data-a="accShow">' + t("aShowAccount") + "</button></div>";
    if (a.loading) return h + '<div class="muted small">' + t("loading") + "</div></div>";
    var x = a.account;
    if (!x.available) h += '<div class="small muted">' + t("aNoAccount") + "</div>";
    else {
      h += '<div style="font-weight:600">' + esc([x.first_name, x.last_name].filter(Boolean).join(" ")) + ' <span class="muted" style="font-weight:400">' + (x.username ? "@" + esc(x.username) : t("aNoUsername")) + "</span></div>";
      if (x.bio) h += '<div class="row" style="padding:0"><span>' + t("aBio") + '</span><span class="v">' + esc(x.bio) + "</span></div>";
      if (x.birthdate) {
        var bd = x.birthdate, txt = String(bd.day).padStart(2, "0") + "." + String(bd.month).padStart(2, "0") + (bd.year ? "." + bd.year : "");
        var yrs = bd.year ? new Date().getFullYear() - bd.year - ((new Date().getMonth() + 1 < bd.month || (new Date().getMonth() + 1 === bd.month && new Date().getDate() < bd.day)) ? 1 : 0) : null;
        h += '<div class="row" style="padding:0"><span>' + t("aBirthTg") + '</span><span class="v">' + txt + (yrs != null ? ' · <span class="' + (yrs < 18 ? "flag" : "") + '">' + t("aYears", { n: yrs }) + "</span>" : "") + "</span></div>";
      }
      if (x.channel) h += '<div class="row" style="padding:0"><span>' + t("aChannel") + '</span><span class="v">' + esc(x.channel.title) + (x.channel.username ? " · @" + esc(x.channel.username) : "") + "</span></div>";
      h += '<div class="small">' + t("aPhotosN", { n: x.photos_total }) + "</div>";
      if (x.photos) { h += '<div class="photos">'; for (var i = 0; i < x.photos; i++) h += '<img alt="" data-ph="' + i + '"' + (a.urls && a.urls[i] ? ' src="' + a.urls[i] + '"' : "") + ">"; h += "</div>"; }
      else h += '<div class="tiny muted">' + t("aNoPhotos") + "</div>";
    }
    h += x.link ? '<button type="button" class="btn" data-a="accOpen">' + t("aOpenTg") + "</button>" : "";
    h += a.sent ? '<div class="tiny muted">' + t("aLinkSent") + "</div>" : '<button type="button" class="btn link" data-a="accLink">' + t("aSendLink") + "</button>";
    return h + '<div class="tiny muted">' + t("aAccountNote") + "</div></div>";
  }
  /* ---------- the owner: moderators and invites ---------- */
  function vMods() {
    var m = S.aData.mods;
    var h = '<div class="top"><h1>' + t("aMods") + '</h1><div class="tiny muted">' + t("aModsNote") + '</div></div><div class="body">';
    h += K.CAL() ? K.CAL().adminCard() : calWait(true);   // owner, 2026-10-29: the calendar switch, its organisers and queue
    if (!m) { aLoad("mods"); return h + '<div class="muted">' + t("loading") + "</div></div>"; }
    h += '<div class="card list">' + (m.items.length ? "" : '<div class="row muted small">' + t("aNoMods") + "</div>");
    m.items.forEach(function (x) {
      var name = [x.name, x.username ? "@" + x.username : ""].filter(Boolean).join(" · ");
      var scope = x.scope ? x.scope.map(function (c) { return "«" + esc(c) + "»"; }).join(", ") : t("mAll");
      h += '<div class="row"><span><b style="font-weight:500">' + esc(name) + '</b><br><span class="tiny muted">' + t("aModLine", { scope: scope, n: x.decided, date: fmtDate(x.since) }) + "</span></span>" +
        '<button type="button" class="btn danger" style="min-height:34px;padding:0 10px;font-size:13px" data-a="aModRemove" data-v="' + esc(x.n) + '" data-t="' + esc(name) + '">' + t("aRemove") + "</button></div>";
    });
    h += "</div>";
    h += '<div class="card"><h2>' + t("aInvite") + '</h2><div class="lbl">' + t("aScope") + '</div><div class="chips">' +
      '<button type="button" class="chip" data-a="iScope" data-v="" aria-pressed="' + (!S.inviteScope.length) + '">' + t("aScopeAll") + "</button>" +
      m.chats.map(function (c) { return '<button type="button" class="chip" data-a="iScope" data-v="' + esc(c.id) + '" aria-pressed="' + (S.inviteScope.indexOf(c.id) >= 0) + '">«' + esc(c.title) + "»</button>"; }).join("") + "</div>";
    if (S.invite && S.invite.link) {
      h += '<input type="text" readonly value="' + esc(S.invite.link) + '" data-a="noop" style="font-size:13px">' +
        '<div class="decide"><button type="button" class="btn primary" data-a="iCopy">' + t(S.invite.copied ? "aCopied" : "aCopy") + '</button><button type="button" class="btn" data-a="iShare">' + t("aShare") + "</button></div>" +
        '<button type="button" class="btn link" data-a="iRevoke">' + t("aRevoke") + "</button>";
    } else {
      if (S.invite && S.invite.revoked) h += '<div class="tiny muted">' + t("aRevoked") + "</div>";
      h += '<button type="button" class="btn primary" data-a="iMake"' + (S.busy ? " disabled" : "") + ">" + t("aMakeLink") + "</button>";
    }
    h += '<div class="tiny muted">' + t("aInviteNote") + "</div></div>";
    return h + errLine() + "</div>";
  }
  /** One connected chat (owner, 2026-10-20): numbers, the button in the chat, and «Опасная зона» with blocking. */
  function vAdminChat() {
    var o = S.aData.overview, c = o && o.chats.filter(function (x) { return String(x.id) === String(S.aChatPage); })[0];
    var h = '<div class="backrow"><button type="button" data-a="aChatClose" aria-label="' + t("back") + '">‹</button><span class="serif" style="font-size:20px">' + esc(c ? c.title : "") + "</span></div>";
    if (!c) return h + '<div class="body muted">' + t("loading") + "</div>";
    h += '<div class="body"><div class="card small">' + [c.size != null ? t("aSize", { n: c.size }) : "", t("aStarted", { n: c.members }), t("aWithProfile", { n: c.profiles }), fmtDate(c.since)].filter(Boolean).join(" · ") +
      (c.blocked ? '<div><span class="flag">' + t("aBlocked") + "</span></div>" : !c.active ? '<div class="muted">' + t("aOff") + "</div>" : "") + "</div>";
    if (c.active && !c.blocked) h += c.button ? '<div class="tiny muted">' + t("aButtonPosted") + "</div>" : '<button type="button" class="btn" data-a="aPostButton" data-v="' + esc(c.id) + '">' + t("aPostButton") + "</button>";
    h += '<div class="card small" style="border-color:var(--danger);margin-top:24px"><b style="color:var(--danger)">' + t("danger") + "</b>";
    if (c.blocked) h += '<button type="button" class="btn" data-a="aUnblock" data-v="' + esc(c.id) + '" data-t="' + esc(c.title) + '">' + t("aUnblock") + "</button>";
    else h += '<div class="muted">' + t("aChatNote") + '</div><button type="button" class="btn danger" data-a="aBlock" data-v="' + esc(c.id) + '" data-t="' + esc(c.title) + '">' + t("aBlockChat") + "</button>";
    return h + "</div>" + errLine() + "</div>";
  }
  /* owner, 2026-10-27: «Звезда комьюнити» — the eligible people, the lit stars, a confirmation before lighting */
  /* owner, 2026-10-27: «Тексты» — every bot message (edit / back to the original) and a personal message to one person */
  function vAdminTexts() {
    var sub = S.txSub || "list";
    var h = '<div class="top"><h1>' + t("txTitle") + "</h1></div>";
    h += '<div class="seg wrap">' + [["list", "txList"], ["words", "txWords"], ["dm", "txDm"], ["journal", "txJournal"], ["msgs", "txMsgs"], ["bc", "txBc"]].map(function (o) { return '<button type="button" data-a="txSub" data-v="' + o[0] + '" aria-pressed="' + (sub === o[0]) + '">' + t(o[1]) + "</button>"; }).join("") + "</div>";
    if (sub === "dm") return h + vAdminDm();
    if (sub === "msgs") return h + vLikeMsgs();   // owner, 2026-11-07
    if (sub === "bc") return h + vBroadcast();
    if (sub === "words") { var xw = lazy("texts", "admin/texts"); return h + '<div class="body">' + (xw ? wordsCard(xw.contact_words) : '<div class="muted">' + t("loading") + "</div>") + errLine() + "</div>"; }   // owner, 2026-10-31
    if (sub === "journal") return h + vJournalBody();
    var x = lazy("texts", "admin/texts");
    if (!x) return h + '<div class="body"><div class="muted">' + t("loading") + "</div></div>";
    if (S.txOpen) return h + vTextEdit(x);
    var q = String(S.txQ || "").trim().toLowerCase();
    var hit = function (it) { return !q || it.key.toLowerCase().indexOf(q) >= 0 || it.when.toLowerCase().indexOf(q) >= 0 || it.ru.cur.toLowerCase().indexOf(q) >= 0 || it.en.cur.toLowerCase().indexOf(q) >= 0; };
    var edited = x.items.filter(function (it) { return it.ru.edited || it.en.edited; }).length;
    h += '<div style="padding:0 16px 8px"><input type="search" style="width:100%" data-a="txSearch" aria-label="' + esc(t("txSearch")) + '" placeholder="' + esc(t("txSearch")) + '" value="' + esc(S.txQ || "") + '"></div><div class="body" style="padding-top:0">';
    if (S.txMsg) h += '<div class="card ok small" role="status">' + esc(S.txMsg) + "</div>";
    if (edited) h += '<div class="tiny muted">' + t("txEditedN", { n: edited }) + "</div>";
    x.groups.forEach(function (g) {
      var list = x.items.filter(function (it) { return it.group === g.id && hit(it); });
      if (!list.length) return;
      h += '<h2 class="sec">' + esc(g.title) + '</h2><div class="card plist">' + list.map(function (it) {
        var ed = it.ru.edited || it.en.edited, plain = it.ru.cur.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
        return '<button type="button" class="prw" data-a="txOpen" data-v="' + esc(it.key) + '"><span class="pmain"><span class="pl"><span>' + esc(it.when || it.key) + "</span>" + (ed ? '<span class="badge new">' + t("txEdited") + "</span>" : "") + '</span><span class="ptext" style="-webkit-line-clamp:2;font-size:14px">' + esc(plain.slice(0, 160)) + "</span></span>" + CHEV + "</button>";
      }).join("") + "</div>";
    });
    return h + "</div>";
  }
  function vTextEdit(x) {
    var it = x.items.filter(function (i) { return i.key === S.txOpen; })[0];
    if (!it) { S.txOpen = null; return ""; }
    var h = '<div class="backrow"><button type="button" data-a="txClose" aria-label="' + t("back") + '">‹</button><span class="small muted">' + esc(it.key) + '</span></div><div class="body">';
    h += '<div class="card small"><span class="lbl" style="margin:0">' + t("txWhen") + "</span><div>" + esc(it.when || "—") + '</div><span class="lbl">' + t("txVars") + "</span><div>" +
      (it.vars.length ? it.vars.map(function (v) { return '<code class="var">{' + esc(v) + "}</code>"; }).join(" ") : '<span class="muted">' + t("txVarsNone") + "</span>") + '</div><div class="tiny muted" style="line-height:1.45">' + esc(t("txHtmlNote")) + "</div></div>";
    if (S.txMsg) h += '<div class="card ok small" role="status">' + esc(S.txMsg) + "</div>";
    ["ru", "en"].forEach(function (lang) {
      var side = it[lang], fk = "tx_" + lang, val = S.form[fk] != null ? S.form[fk] : side.cur;
      h += '<div class="card"><div class="nbtop"><b>' + t(lang === "ru" ? "txRu" : "txEn") + "</b>" + (side.edited ? '<span class="badge new">' + t("txEdited") + "</span>" : "") + "</div>" +
        '<textarea class="txarea" data-f="' + fk + '" rows="7" maxlength="4000">' + esc(val) + "</textarea>" +
        '<div class="tiny muted">' + t("txChars", { n: val.length }) + "</div>" +
        (S.txErr && S.txErr.lang === lang ? '<div class="err" role="alert">' + esc(S.txErr.text) + "</div>" : "") +
        '<div class="decide">' + (side.edited ? '<button type="button" class="btn dangerline" data-a="txReset" data-v="' + lang + '">' + t("txReset") + "</button>" : "<span></span>") +
        '<button type="button" class="btn primary" data-a="txSave" data-v="' + lang + '"' + (S.busy ? " disabled" : "") + ">" + t("txSave") + "</button></div>" +
        (side.edited ? '<details class="small"><summary class="muted">' + t("txOrig") + '</summary><div style="white-space:pre-wrap;line-height:1.5;margin-top:6px">' + esc(side.orig) + "</div></details>" : "") + "</div>";
    });
    return h + "</div>";
  }
  function vAdminDm() {
    var h = '<div class="body" style="padding-top:0">';
    if (!S.dmTo) {
      var p = lazy("profiles", "admin/profiles"), q = String(S.dmQ || "").trim().toLowerCase();
      h += '<label class="field"><span class="lbl">' + t("dmWho") + '</span><input type="search" data-a="dmFind" placeholder="' + esc(t("dmFind")) + '" value="' + esc(S.dmQ || "") + '"></label>';
      if (!p) return h + '<div class="muted">' + t("loading") + "</div></div>";
      if (q) {
        var qn = q.replace(/^#/, ""), qu = q.replace(/^@/, "");
        var list = p.items.filter(function (x) { return x.n.indexOf(qn) === 0 || (x.nick || "").toLowerCase().indexOf(q) >= 0 || (x.username && x.username.toLowerCase().indexOf(qu) >= 0) || (x.tg_name && x.tg_name.toLowerCase().indexOf(q) >= 0); }).slice(0, 20);
        if (!list.length) h += '<div class="card small muted">' + t("aStarEmpty") + "</div>";
        else h += '<div class="card plist">' + list.map(function (x) {
          var nm = x.nick || x.tg_name || "#" + x.n;
          return '<button type="button" class="prw" data-a="dmPick" data-v="' + esc(x.n) + '" data-nick="' + esc(nm) + '"><span class="pmain"><span class="pv">' + esc(nm) + '</span><span class="ps">' + esc([x.username ? "@" + x.username : "", x.tg_name && x.tg_name !== nm ? x.tg_name : "", "#" + x.n, t("stage_" + x.stage)].filter(Boolean).join(" · ")) + "</span></span>" + CHEV + "</button>"; }).join("") + "</div>";
      }
      return h + "</div>";
    }
    var to = S.dmTo, hist = S.aData["dm_" + to.n] || lazy("dm_" + to.n, "admin/dm?id=" + to.n), txt = S.form.dmText || "";
    h += '<div class="card"><div class="nbtop"><span style="display:flex;flex-direction:column;gap:2px"><span class="tiny muted">' + t("dmWho") + '</span><span><b style="font-size:17px">' + esc(to.nick) + '</b> <span class="tiny muted">#' + esc(to.n) + '</span></span></span><button type="button" class="btn link" data-a="dmChange">' + t("dmChange") + "</button></div>" +
      '<label class="field"><span class="lbl">' + t("dmText") + '</span><textarea class="txarea" data-f="dmText" rows="6" maxlength="2000">' + esc(txt) + '</textarea><span class="tiny muted" style="display:flex;justify-content:space-between"><span>' + t("dmTextNote") + '</span><span id="dmcount">' + txt.length + " / 2000</span></span></label>" +
      '<label class="check"><input type="checkbox" data-f="dmBtn"' + (S.form.dmBtn !== false ? " checked" : "") + "><span>" + t("dmBtn") + "</span></label>" +
      (S.dmMsg ? '<div class="card ' + (S.dmMsg.ok ? "ok" : "warn") + ' small" role="status">' + esc(S.dmMsg.text) + "</div>" : "") +
      '<button type="button" class="btn primary" data-a="dmSend"' + (S.busy || !txt.trim() ? " disabled" : "") + ">" + t("dmSend") + "</button></div>";
    h += '<h2 class="sec">' + t("dmHist") + "</h2>";
    if (!hist) h += '<div class="muted">' + t("loading") + "</div>";
    else if (!hist.items.length) h += '<div class="small muted">' + t("dmNone") + "</div>";
    else h += '<div class="card plist">' + hist.items.map(function (m) { return '<div class="prw" style="cursor:default"><span class="pmain"><span class="pl"><span>' + fmtTime(m.at) + "</span><span>" + t(m.ok ? "dmOk" : "dmNo") + '</span></span><span class="ptext" style="font-size:14px">' + esc(m.text) + "</span></span></div>"; }).join("") + "</div>";
    return h + "</div>";
  }
  function starsKey() { return "stars_" + (S.aStarTab || "can") + "|" + (S.aStarQ || ""); }
  function vAdminStars() {
    var tab = S.aStarTab || "can", x = lazy(starsKey(), "admin/stars?tab=" + tab + "&q=" + encodeURIComponent(S.aStarQ || "")), c = (x && x.counts) || S.aStarCounts || { can: "…", later: "…", lit: "…" };
    if (x) S.aStarCounts = x.counts;
    var h = '<div class="top"><h1>' + t("aStars") + "</h1></div>";
    var TABS = [["can", "aStarCan"], ["later", "aStarLater"], ["lit", "aStarLit"]];   // owner, 2026-10-27: + people not on the map yet
    h += '<div class="seg">' + TABS.map(function (o) { return '<button type="button" data-a="aStarTab" data-v="' + o[0] + '" aria-pressed="' + (tab === o[0]) + '">' + t(o[1]) + " · " + c[o[0]] + "</button>"; }).join("") + "</div>";
    h += '<div style="padding:0 16px 8px"><input type="search" style="width:100%" data-a="aStarSearch" aria-label="' + esc(t("aStarSearch")) + '" placeholder="' + esc(t("aStarSearch")) + '" value="' + esc(S.aStarQ || "") + '"></div>';
    h += '<div class="body" style="padding-top:0">' + (S.aStarMsg ? '<div class="card ok small" role="status">' + esc(S.aStarMsg) + "</div>" : "") + (tab === "can" ? '<div class="tiny muted">' + t("aStarHint") + "</div>" : tab === "later" ? '<div class="tiny muted" style="line-height:1.45">' + t("aStarLaterHint") + "</div>" : "");
    if (!x) return h + '<div class="muted">' + t("loading") + "</div></div>";
    if (!x.items.length) h += '<div class="card small muted">' + t("aStarEmpty") + "</div>";
    Object.keys(x.other || {}).forEach(function (k) { var lb = TABS.filter(function (o) { return o[0] === k; })[0];
      h += '<button type="button" class="btn link" style="align-self:flex-start;padding:0" data-a="aStarTab" data-v="' + k + '">' + t("aStarInTab", { tab: t(lb[1]), n: x.other[k] }) + " ›</button>"; });
    x.items.forEach(function (p) {
      var meta = [p.role ? t("r_" + p.role) : t("r_none"), p.chats > 1 ? t("aChatsN", { n: p.chats }) : p.chat ? "«" + esc(p.chat) + "»" : "", p.since ? t("aStarMeta", { date: fmtDate(p.since), n: p.mutual }) : ""].filter(Boolean).join(" · ");
      if (tab === "can") h += '<div class="card srow"><span class="sdot g-' + (p.gender || "other") + '" aria-hidden="true"></span><button type="button" class="sinfo btn link" style="padding:0;align-items:flex-start" data-a="aOpen" data-v="' + esc(p.n) + '"><b>' + esc(p.nick || "#" + p.n) + '</b><span class="tiny muted">' + meta + "</span></button>" +
        '<button type="button" class="btn goldline" data-a="aStarAsk" data-v="' + esc(p.n) + '" data-nick="' + esc(p.nick || "#" + p.n) + '" data-g="' + esc(p.gender || "") + '">' + starSvg(p.gender, 16) + " " + t("aStarLight") + "</button>" + novaBtn(p.n, p.nick || "#" + p.n, true) + "</div>";   // owner, 2026-10-31: supernova = a nebula button next to the star
      else if (tab === "later") {
        var nm = p.nick || p.tg_name || "#" + p.n, lm = [p.username ? "@" + esc(p.username) : "", p.step !== "opened" ? t("stage_" + p.step) : "", p.created ? t("aStarCreated", { date: fmtDate(p.created) }) : ""].filter(Boolean).join(" · ");
        h += '<div class="card srow"><span class="sdot g-' + (p.gender || "none") + '" aria-hidden="true"></span><button type="button" class="sinfo btn link" style="padding:0;align-items:flex-start" data-a="aOpen" data-v="' + esc(p.n) + '"><b>' + esc(nm) + '</b><span class="tiny muted">' + lm + "</span></button>" +
          '<button type="button" class="btn goldline" data-a="aStarAsk" data-later="1" data-v="' + esc(p.n) + '" data-nick="' + esc(nm) + '" data-g="' + esc(p.gender || "") + '">' + starSvg(p.gender, 16) + " " + t("aStarLightEarly") + "</button></div>";
      }
      else h += starBox(p.n, p.nick || p.tg_name, p.gender, p.star, meta);
    });
    return h + "</div>";
  }
  /** owner, 2026-10-31: supernova — no block of its own: a nebula button next to the star («Можно зажечь», star cards),
      and inside a lit supernova's star card: who sees it, its chats (read-only) and «Убрать сверхновую». */
  function novaBtn(n, nick, icon) {
    return '<button type="button" class="btn nebbg' + (icon ? " nebic" : "") + '" data-a="aNovaAsk" data-v="' + esc(n) + '" data-t="' + esc(nick) + '" aria-label="' + esc(t("aNovaMake")) + '" title="' + esc(t("aNovaMake")) + '">✦' + (icon ? "" : " " + t("aNovaMake")) + "</button>";
  }
  function novaStrip(n, nick, acts) {
    var x = lazy("novas", "admin/novas"), v = x && x.novas.filter(function (o) { return o.n === n; })[0], open = S.aNovaOpen === n;
    var h = '<div class="nvstrip nebbg"><span class="nvhead"><b>✦ ' + t("aNovaIs") + '</b><span class="tiny sec">' + (v ? t("aNovaRow", { vis: t("aNovaVis_" + v.vis, { n: v.viewers }), c: v.chats }) : x ? "" : t("loading")) + "</span></span>" +
      '<span class="nvbtns">' + (v && v.chats ? '<button type="button" class="nbtn sm" data-a="aNovaChats" data-v="' + esc(n) + '" aria-expanded="' + open + '">' + t("aNovaChats", { n: v.chats }) + (open ? " ▴" : " ▾") + "</button>" : "") +
      (acts ? '<button type="button" class="nbtn sm" data-a="aNovaRemove" data-v="' + esc(n) + '" data-t="' + esc(nick || "#" + n) + '">' + t("aNovaRemove") + "</button>" : "") + "</span></div>";
    // owner, 2026-11-03: whose Telegram account people see after a mutual like — the change only under «Действия со звездой»
    if (v) {
      var own = v.contact === "owner";
      h += '<div class="tiny muted" style="margin:6px 0 2px">' + t("aNovaContact", { who: t(own ? "aNovaContactOwner" : "aNovaContactSelf") }) +
        (own && !x.owner_username ? " · " + t("aNovaContactNoUser") : "") + "</div>";
      if (acts) h += '<button type="button" class="btn sm" data-a="aNovaContact" data-v="' + esc(n) + '" data-c="' + (own ? "self" : "owner") + '" data-t="' + esc(nick || "#" + n) + '">' +
        t(own ? "aNovaContactToSelf" : "aNovaContactToOwner") + "</button>";
    }
    if (open && x) {
      var list = x.chats.filter(function (c) { return c.nova.n === n; });
      h += '<div class="tiny muted">' + t("aNovaChatsX") + "</div>";
      list.forEach(function (c) {
        h += '<div class="irow" style="padding:6px 0"><span><b>' + esc(c.user.nick || "#" + c.user.n) + '</b><span class="tiny muted">' + t("aNovaMsgs", { n: c.count }) + " · " + fmtTime(c.at) + '</span></span><span style="display:flex;gap:6px"><button type="button" class="btn sm" data-a="aChatRead" data-v="' + c.id + '">' + t("aNovaRead") +
          '</button><button type="button" class="btn sm dangerline" data-a="aChatDel" data-v="' + c.id + '" data-t="' + esc(c.user.nick || "") + '">' + t("chDelete") + "</button></span></div>";
      });
    }
    return h;
  }
  function vAdminChatRead() {
    var d = S.aData.chatRead;
    var h = '<div class="backrow"><button type="button" data-a="aChatReadClose" aria-label="' + t("back") + '">‹</button><span class="serif" style="font-size:19px">' + (d ? "✦ " + esc(d.chat.nova.nick) + " ↔ " + esc(d.chat.user.nick) : t("loading")) + "</span></div>";
    if (!d) return h;
    h += '<div class="body"><div class="tiny muted">' + t("aChatRO") + '</div><div class="chlog ro">';
    d.items.forEach(function (m) { h += '<div class="bub ' + (m.nova ? "in nv" : "out") + '">' + esc(m.text) + '</div><span class="tiny muted chtm' + (m.nova ? "" : " r") + '">' + fmtTime(m.at) + "</span>"; });
    return h + '</div><button type="button" class="btn dangerline" data-a="aChatDel" data-v="' + d.chat.id + '" data-t="' + esc(d.chat.user.nick) + '">' + t("chDelete") + "</button>" + errLine() + "</div>";
  }
  /* owner, 2026-11-02: «Сделать сверхновой», «Удалить подпись», «Убрать звезду», «Отклонить» (links) and «Убрать
     сверхновую» sit behind «Действия со звездой ▾» so they are not pressed by accident; the links themselves open. */
  function linkGo(url) { return '<button type="button" class="btn link" style="padding:0;min-height:0;display:inline;text-align:left;word-break:break-all;font:inherit" data-a="aLinkGo" data-u="' + esc(url) + '">' + esc(url) + "</button>"; }
  function starBox(n, nick, g, st, meta) {
    var acts = S.aStarAct === n;
    return '<div class="card cstarcard"><div class="rtop"><button type="button" class="rname btn link" style="padding:0;color:var(--ink)" data-a="aOpen" data-v="' + esc(n) + '">' + starSvg(g, 20) + esc(nick || "#" + n) + "</button>" +
      '<span class="tiny" style="color:' + (st.waiting ? "var(--gold-ink)" : st.show ? "var(--ok)" : "var(--muted)") + ';font-weight:600">' + t(st.waiting ? "aStarWaiting" : st.show ? "aStarShown" : "aStarNotShown") + "</span></div>" +
      (meta ? '<div class="tiny muted">' + meta + "</div>" : "") +
      '<div class="small">' + (st.caption ? t("aStarCap", { c: esc(st.caption) }) : st.removed ? t("aStarCapGone") : t("aStarCapNone")) + " · " + t("aStarSince", { date: fmtDate(st.at) }) + "</div>" +
      (st.note ? '<div class="small muted">' + t("aStarNote", { c: esc(st.note) }) + "</div>" : "") +
      (st.links && st.links.length ? '<div class="small"><b>' + t("aLinksT") + "</b></div>" + st.links.map(function (l) {   // owner, 2026-10-27
        return '<div class="small" style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span style="min-width:0;word-break:break-all' + (l.rejected ? ";opacity:.55" : "") + '">«' + esc(l.label) + "» · " + linkGo(l.url) + ' <span class="tiny muted">' + t("lnkClicks", { n: l.clicks }) + (l.rejected ? " · " + t("aLinkRejectedNow") : "") + "</span></span>" + (acts ?
          '<button type="button" class="btn link" style="padding:0 4px;color:' + (l.rejected ? "var(--accent)" : "var(--danger)") + '" data-a="aLinkAct" data-x="' + (l.rejected ? "restore" : "reject") + '" data-v="' + l.id + '" data-n="' + esc(n) + '">' + t(l.rejected ? "aLinkRestore" : "aLinkReject") + "</button>" : "") + "</div>"; }).join("") : "") +
      (st.nova ? novaStrip(n, nick, acts) : "") +
      '<button type="button" class="btn link" style="align-self:flex-start;padding:0" data-a="aStarActs" data-v="' + esc(n) + '" aria-expanded="' + acts + '">' + t(acts ? "aStarActsHide" : "aStarActs") + (acts ? " ▴" : " ▾") + "</button>" +
      (!acts ? "" : '<div class="decide">' + (st.nova || st.waiting ? "" : novaBtn(n, nick || "#" + n, false)) + (st.caption ? '<button type="button" class="btn dangerline" data-a="aStarUncap" data-v="' + esc(n) + '" data-c="' + esc(st.caption) + '">' + t("aStarUncap") + "</button>" : "") +
      '<button type="button" class="btn dangerline" data-a="aStarOut" data-v="' + esc(n) + '" data-nick="' + esc(nick || "#" + n) + '">' + t("aStarOut") + "</button></div>" +
      (st.caption ? '<div class="tiny muted" style="line-height:1.45">' + t("aStarUncapNote") + "</div>" : "")) + "</div>";
  }
  function starAskModal() {
    var a = S.aStarAsk;
    return '<div class="modal-bg"><div class="modal card" role="dialog" aria-modal="true" aria-labelledby="sth" style="align-items:center;text-align:center">' + starSvg(a.g, 64) +
      '<h2 id="sth" class="serif" style="font-size:22px;margin:0">' + esc(t("aStarLightQ", { name: a.nick })) + '</h2><div class="small muted" style="line-height:1.5">' + esc(t(a.later ? "aStarLightXLater" : "aStarLightX", { name: a.nick })) + "</div>" +
      '<label class="field" style="width:100%;text-align:left"><span class="lbl">' + t("aStarNoteL") + '</span><input type="text" maxlength="200" autocomplete="off" data-f="aStarNote" value="' + esc(S.form.aStarNote || "") + '"></label>' +
      (S.aStarErr ? '<div class="err" role="alert">' + esc(S.aStarErr) + "</div>" : "") +
      '<div class="decide" style="width:100%"><button type="button" class="btn" data-a="aStarCancel">' + t("cancel") + '</button><button type="button" class="btn gold" data-a="aStarDo"' + (S.busy ? " disabled" : "") + ">" + t("aStarLight") + "</button></div></div></div>";
  }
  function vAdminProfile() {
    var d = S.aData.profile;
    var h = '<div class="backrow"><button type="button" data-a="aClose" aria-label="' + t("back") + '">‹</button><span class="small muted">#' + esc(S.aOpen) + "</span></div>";
    if (!d || d.profile.n !== S.aOpen) return h + '<div class="body muted">' + t("loading") + "</div>";
    var p = d.profile;
    h += '<div class="body"><div class="tiny muted">' + t("aNoLoc") + "</div>";
    h += '<div class="card"><h2>' + esc([p.nick, p.gender ? t("g_" + p.gender) : (p.nick ? null : t("aNoProfile")), p.age].filter(function (v) { return v != null && v !== ""; }).join(", ")) + ' <span class="badge">' + t("st_" + p.status) + "</span>" + (p.suspicious ? ' <span class="flag">' + t("aSuspicious") + "</span>" : "") + "</h2>";
    var rows = [
      [t("pRole"), [p.role ? t("r_" + p.role) : "", p.experience ? t("x_" + p.experience) : "", p.relation ? t("l_" + p.relation) : ""].filter(Boolean).join(" · ")],
      [t("pLooking"), p.looking_for.map(function (v) { return t("lf_" + v); }).join(", ")],
      [t("pSeeking"), (p.seeking || []).map(function (v) { return t("sk_" + v); }).join(", ") || "—"],
      [t("pShow"), p.show_genders.map(function (v) { return t("sh_" + v); }).join(", ") + (p.age_min ? " · " + p.age_min + "–" + p.age_max : "")],
      [t("pause"), p.paused ? "✓" : "—"], [t("compare"), p.compare_before_yes ? "✓" : "—"], [t("spaceTitle"), p.space ? "✓" : "—"],
      [t("uniTag"), t("aUni_" + (p.universe || "unset"))],
      [t("chatsTitle"), p.chats.map(function (c) { return "«" + esc(c.title) + "»" + (c.show ? "" : " (✕)"); }).join(", ")],
    ];
    rows.forEach(function (r) { if (r[1]) h += '<div class="row" style="padding:0"><span>' + r[0] + '</span><span class="v">' + r[1] + "</span></div>"; });
    if (p.about) h += '<div class="small" style="line-height:1.5' + (p.about_hidden ? ";opacity:.6" : "") + '">«' + esc(p.about) + "»</div>";
    if (S.me.admin && p.about_hidden) h += '<div class="tiny" style="color:var(--danger)">' + t("aAboutHiddenNow") + "</div>";
    if (S.me.admin && p.about) h += '<button type="button" class="btn' + (p.about_hidden ? "" : " dangerline") + '" data-a="aAbout" data-v="' + esc(p.n) + '" data-x="' + (p.about_hidden ? "show" : "hide") + '">' + t(p.about_hidden ? "aAboutShow" : "aAboutHide") + "</button>";   // owner, 2026-10-27
    h += "</div>";
    if (d.visibility) h += '<div class="card small"><b>' + t("aVis") + "</b><div>" + t("aVisLine", { s: d.visibility.sees, r: d.visibility.ready, c: d.visibility.in_chats }) + "</div>" + (S.me.admin ? whyBox(p.n) : "") + "</div>";
    if (S.me.admin && p.status !== "banned" && p.nick) h += susCard(p.n, d.sus);   // owner, 2026-11-07
    if (p.interests && p.interests.length) { if (!K.CAT()) loadCat(); h += '<div class="card small"><b>' + t("aProfInts") + " · " + p.interests.length + '</b><div class="tags">' + (K.CAT() ? p.interests.map(function (id) { return itag(id, ""); }).join("") : "") + "</div></div>"; }   // owner, 2026-10-28
    if (p.interests_hidden && p.interests_hidden.length) { if (!K.CAT()) loadCat(); h += '<div class="card small"><b>' + LOCK + " " + t("aProfIntsHid") + " · " + p.interests_hidden.length + '</b><div class="tags">' + (K.CAT() ? p.interests_hidden.map(function (id) { return itag(id, " hid"); }).join("") : "") + "</div></div>"; }
    if (S.me.admin && p.suggest_blocked != null) h += '<div class="card small"><div>' + t(p.suggest_blocked ? "aSugBlocked" : "aSugAllowed") + '</div><button type="button" class="btn' + (p.suggest_blocked ? "" : " dangerline") + '" data-a="aIntBlock" data-v="' + esc(p.n) + '" data-on="' + (p.suggest_blocked ? 0 : 1) + '">' + t(p.suggest_blocked ? "aIntsUnblock" : "aIntsBlock") + "</button></div>";
    if (S.me.admin && d.nicks && d.nicks.length) h += '<div class="card small"><b>' + t("aNicks") + "</b>" + d.nicks.map(function (x) {   // owner, 2026-10-24
      return '<div class="jrow"><span class="muted">' + fmtTime(x.at) + "</span><span>" + (x.old ? "«" + esc(x.old) + "»" : t("aNickNone")) + " → " + (x.new ? "«" + esc(x.new) + "»" : t("aNickNone")) + "</span></div>"; }).join("") + "</div>";
    if (S.me.admin && d.star) h += starBox(p.n, p.nick, p.gender, d.star, "");   // owner, 2026-10-27
    else if (S.me.admin && d.star_can) h += '<div style="display:flex;gap:8px"><button type="button" class="btn goldline" style="flex:1" data-a="aStarAsk"' + (p.status === "active" ? "" : ' data-later="1"') + ' data-v="' + esc(p.n) + '" data-nick="' + esc(p.nick || "#" + p.n) + '" data-g="' + esc(p.gender || "") + '">' + starSvg(p.gender, 18) + " " + t("aStarLightBtn") + "</button>" + (p.status === "active" && p.nick ? novaBtn(p.n, p.nick, true) : "") + "</div>";
    if (S.me.admin && d.referrals) h += refsCard(p.n, d.referrals);   // owner, 2026-10-31
    if (S.me.admin && d.pairs) h += pairsCard(d.pairs);   // owner, 2026-10-20
    if (S.me.admin && d.visits && d.visits.slots) h += '<div class="card small"><b>' + t("aRetPerson") + "</b><div>" + t("aRetPersonLine", { d: d.visits.days, s: d.visits.slots }) + '</div><div class="tiny muted">' + d.visits.last.map(function (x) { return fmtTime(x); }).join(" · ") + "</div></div>";
    if (d.answers) h += '<button type="button" class="btn" data-a="openKs" data-v="' + esc(p.n) + '">' + t("ksBtn") + "</button>";
    if (S.me.admin || (S.me.mod && (S.mOpen || S.fromRef))) h += accountCard();   // moderators: only from a report or an invitee under review (owner, 2026-10-31)
    if (d.answers) {
      h += "<h2>" + t("aAnswers") + " · " + (p.ans_top != null ? ansOf(p) : p.answered) + "</h2>";
      // owner, 2026-11-07: search by practice — the rows are filtered as you type (14-start.js), nothing is asked again
      h += '<input type="search" data-a="aAnsQ" autocomplete="off" aria-label="' + esc(t("aAnsQ")) + '" placeholder="' + esc(t("aAnsQ")) + '" value="' + esc(S.aAnsQ || "") + '"><div class="muted small" id="aansnone" hidden>' + t("aAnsNone") + "</div>";
      var cat = null, open = false, q0 = norm(S.aAnsQ || "");
      d.answers.forEach(function (r) {
        var head = (r.side ? t(r.side) + " · " : "") + r.cat;
        if (head !== cat) { if (open) h += "</div></div>"; cat = head; h += '<div class="ansgrp"><div class="cat">' + esc(cat) + '</div><div class="card list">'; open = true; }
        h += '<div class="crow" data-q="' + esc(norm(r.name)) + '"' + (q0 && norm(r.name).indexOf(q0) < 0 ? " hidden" : "") + "><span>" + esc(r.name) + '</span><span class="ans a-' + r.a + '">' + t("a_" + r.a) + "</span></div>";
      });
      if (open) h += "</div></div>";
    }
    if (S.me.admin && p.status !== "banned") h += '<div class="card small"><div class="muted">' + t("aResetPlaceNote") + '</div><button type="button" class="btn" data-a="aResetPlace">' + t("aResetPlace") + "</button></div>";
    if (S.me.admin) {   // owner, 2026-10-20: «Опасная зона» at the very bottom, two confirmations
      h += '<div class="card small" style="border-color:var(--danger);margin-top:24px"><b style="color:var(--danger)">' + t("danger") + "</b>";
      h += p.status === "banned" ? '<button type="button" class="btn" data-a="aUnban">' + t("aUnbanUser") + "</button>"
        : '<div class="muted">' + t("aBlockUserNote") + '</div><button type="button" class="btn danger" data-a="aBan">' + t("aBlockUser") + "</button>";
      h += "</div>";
    }
    return h + "</div>";
  }
  /** owner, 2026-11-07: «Подозрительная анкета» — the owner only. The person is not told; others see a quiet mark. */
  var SUS = ["fake", "behaviour", "check", "other"];
  function susCard(n, sus) {
    var F = S.aSus && S.aSus.n === n ? S.aSus : null;
    var h = '<div class="card small' + (sus ? " warn" : "") + '"><b>' + t("aSusT") + "</b>";
    if (sus && !F) {
      h += "<div>" + esc(t("aSus_" + sus.reason)) + ' <span class="tiny muted">· ' + fmtTime(sus.at) + "</span></div>" + (sus.note ? '<div class="small" style="white-space:pre-wrap">«' + esc(sus.note) + "»</div>" : "") +
        '<div class="decide"><button type="button" class="btn" data-a="aSusEdit" data-v="' + esc(n) + '">' + t("aSusEdit") + '</button><button type="button" class="btn dangerline" data-a="aSusOff" data-v="' + esc(n) + '">' + t("aSusOff") + "</button></div>";
      return h + '<div class="tiny muted">' + t("aSusX") + "</div></div>";
    }
    if (!F) return h + '<div class="tiny muted">' + t("aSusX") + '</div><button type="button" class="btn" data-a="aSusEdit" data-v="' + esc(n) + '">' + t("aSusOn") + "</button></div>";
    h += '<div class="tags" role="radiogroup" aria-label="' + esc(t("aSusWhy")) + '">' + SUS.map(function (k) {
      return '<button type="button" class="chip' + (F.reason === k ? " on" : "") + '" role="radio" aria-checked="' + (F.reason === k) + '" data-a="aSusWhy" data-v="' + k + '">' + esc(t("aSus_" + k)) + "</button>"; }).join("") + "</div>" +
      '<label class="field"><span class="lbl">' + t("aSusNote") + '</span><input type="text" maxlength="200" data-f="aSusNote" value="' + esc(S.form.aSusNote != null ? S.form.aSusNote : (sus && sus.note) || "") + '"></label>' +
      '<div class="decide"><button type="button" class="btn" data-a="aSusEdit" data-v="">' + t("cancel") + '</button><button type="button" class="btn primary" data-a="aSusSave" data-v="' + esc(n) + '"' + (F.reason && !S.busy ? "" : " disabled") + ">" + t("aSusSave") + "</button></div>";
    return h + '<div class="tiny muted">' + t("aSusX") + "</div></div>";
  }
  /** owner, 2026-11-07: «Видимость: почему» — counted only on a tap, both directions; counts, nobody named */
  var WHY = ["road", "hidden", "gender_his", "gender_their", "age", "not_now"];
  function whyBox(n) {
    var dirs = [["sees", "aWhySees"], ["seen", "aWhySeen"]];
    var h = '<div class="decide">' + dirs.map(function (o) { return '<button type="button" class="btn" data-a="aWhy" data-v="' + esc(n) + '" data-x="' + o[0] + '"' + (S.aWhy && S.aWhy.n === n && S.aWhy.dir === o[0] ? ' aria-pressed="true"' : "") + ">" + t(o[1]) + "</button>"; }).join("") + "</div>";
    var W = S.aWhy && S.aWhy.n === n ? S.aWhy : null;
    if (!W) return h;
    if (!W.r) return h + '<div class="muted small">' + t(W.err ? "netErr" : "loading") + "</div>";
    var r = W.r;
    h += '<div class="small"><b>' + t(r.dir === "seen" ? "aWhySeenT" : "aWhySeesT", { ok: r.ok_n, all: r.total }) + "</b></div>";
    WHY.forEach(function (k) {
      var x = r.reasons.filter(function (y) { return y.key === k; })[0];
      if (x && x.all) h += '<div class="small" style="display:flex;justify-content:space-between;gap:8px"><span>' + t("aWhy_" + k + (r.dir === "seen" ? "_in" : "")) + '</span><b>' + x.n + ' <span class="tiny muted">' + t("aWhyAll", { n: x.all }) + "</span></b></div>";
    });
    return h + '<div class="tiny muted">' + t("aWhyNote") + "</div>";
  }
  /** owner, 2026-11-07: «Сообщения» — the texts people sent with a like. The owner only; each page read goes to the journal. */
  function vLikeMsgs() {
    var x = lazy("lmsgs", "admin/likemsgs");
    var h = '<div class="body"><div class="tiny muted">' + t("lmNote") + "</div>";
    if (!x) return h + '<div class="muted">' + t("loading") + "</div></div>";
    if (!x.items.length) return h + '<div class="card small muted">' + t("lmNone") + "</div></div>";
    var who = function (p) { return p.id ? '<button type="button" class="btn link" style="padding:0;min-height:0" data-a="aOpen" data-v="' + esc(p.id) + '">' + esc(p.nick || "#" + p.id) + "</button>" : "<span>" + esc(p.nick || "—") + "</span>"; };
    x.items.forEach(function (m) {
      h += '<div class="card small"><div class="nbtop"><span>' + who(m.from) + " → " + who(m.to) + '</span><span class="tiny muted">' + fmtTime(m.at) + "</span></div>" +
        '<div style="white-space:pre-wrap;line-height:1.5;word-break:break-word">' + (m.text != null ? esc(m.text) : '<span class="muted">' + t("lmGone") + "</span>") + "</div></div>";
    });
    if (x.next) h += '<button type="button" class="btn" data-a="lmMore"' + (S.lmBusy ? " disabled" : "") + ">" + t(S.lmBusy ? "loading" : "lmMore") + "</button>";
    return h + errLine() + "</div>";
  }
  /** owner, 2026-11-07: «Отправить всем» — the owner's own text from the bot to everyone in the chosen group. Plain text with
      emoji; one broadcast at a time; the panel sends it in batches, the hourly job finishes what is left. */
  var BC_AUD = ["active", "consent", "all"];
  function vBroadcast() {
    var B = S.bc || (S.bc = { audience: "active", button: true });
    var info = lazy("bc_" + B.audience, "admin/broadcast?audience=" + B.audience);
    var text = S.form.bcText || "", len = Array.from(text).length;
    var h = '<div class="body"><div class="card"><b>' + t("bcTitle") + '</b><div class="tiny muted">' + t("bcNote") + "</div>";
    h += '<button type="button" class="btn" data-a="bcTpl">' + t("bcTplBtn") + "</button>";
    h += '<textarea class="txarea" data-f="bcText" rows="10" maxlength="3500" aria-label="' + esc(t("bcTitle")) + '" placeholder="' + esc(t("bcPh")) + '">' + esc(text) + "</textarea>";
    h += '<div class="tiny muted" id="bccount">' + len + " / 3500</div>";
    // owner, 2026-11-07: a photo — sent to your own chat first (that is the upload and the preview), then to everyone
    h += '<div class="bcphoto">' + (B.photoUrl ? '<img src="' + esc(B.photoUrl) + '" alt="">' : "") + '<div class="decide">' +
      '<label class="btn"' + (B.upBusy ? ' aria-disabled="true"' : "") + ">" + t(B.photo ? "bcPhotoChange" : B.upBusy ? "loading" : "bcPhotoAdd") + '<input type="file" accept="image/jpeg,image/png,image/webp" data-a="bcPhotoPick" hidden' + (B.upBusy ? " disabled" : "") + "></label>" +
      (B.photo ? '<button type="button" class="btn dangerline" data-a="bcPhotoDel">' + t("bcPhotoDel") + "</button>" : "") + "</div>" +
      '<div class="tiny muted">' + t(B.photo ? (len > 1024 ? "bcPhotoLong" : "bcPhotoCap") : "bcPhotoX") + "</div></div>";
    h += '<span class="lbl">' + t("bcWho") + '</span><div class="seg wrap" style="padding:0">' + BC_AUD.map(function (a) { return '<button type="button" data-a="bcAud" data-v="' + a + '" aria-pressed="' + (B.audience === a) + '">' + t("bcAud_" + a) + "</button>"; }).join("") + "</div>";
    h += '<div class="tiny muted">' + t("bcAudX_" + B.audience) + "</div>";
    h += '<div class="swrow"><span><b>' + t("bcBtn") + '</b><span class="tiny muted">' + t("bcBtnX") + '</span></span><button type="button" class="swb' + (B.button ? " on" : "") + '" role="switch" aria-checked="' + !!B.button + '" aria-label="' + esc(t("bcBtn")) + '" data-a="bcButton"><i></i></button></div>';
    h += "</div>";
    h += '<div class="lbl">' + t("bcPrev") + '</div><div class="card small bcprev">' + (B.photoUrl ? '<img class="bcpimg" src="' + esc(B.photoUrl) + '" alt="">' : "") + '<div id="bcprev" style="white-space:pre-wrap;line-height:1.5;word-break:break-word">' + (text ? esc(text) : '<span class="muted">' + t("bcPrevNone") + "</span>") + "</div>" +
      (B.button ? '<div class="bcbtn">' + t("bcBtnText") + "</div>" : "") + "</div>";
    if (B.msg) h += '<div class="card ' + (B.bad ? "warn" : "ok") + ' small" role="status">' + esc(B.msg) + "</div>";
    var wait = B.sending ? B.waiting : info ? info.waiting : 0;
    if (B.sending) h += '<div class="card small" role="status"><b>' + t("bcSending") + '</b><div class="fbar"><i style="width:' + Math.max(2, Math.round((1 - (B.waiting || 0) / (B.total || 1)) * 100)) + '%"></i></div><div class="tiny muted">' + t("bcLeft", { n: B.waiting, all: B.total }) + "</div></div>";
    else if (wait) h += '<div class="card small warn"><div>' + t("bcWaiting", { n: wait }) + '</div><button type="button" class="btn" data-a="bcPush">' + t("bcPushBtn") + "</button></div>";
    if (!info) h += '<div class="muted small">' + t("loading") + "</div>";
    else {
      h += '<button type="button" class="btn primary" data-a="bcSend"' + (!len || len > 3500 || wait || B.sending || !info.count || S.busy ? " disabled" : "") + ">" + t("bcSend", { n: info.count }) + "</button>";
      if (info.last) h += '<div class="tiny muted">' + t("bcLast", { date: fmtTime(info.last.created_at), n: info.last.total, a: t("bcAud_" + info.last.audience) }) + "</div>";
    }
    return h + errLine() + "</div>";
  }
  /** owner, 2026-10-31: who invited this person, whom they invited (collapsible), the «Может приглашать» switch */
  function refsCard(n, R) {
    var h = '<div class="card small"><b>' + t("aRefT") + "</b>";
    if (R.by) h += '<div>' + t("aRefBy", { name: "" }) + '<button type="button" class="btn link" style="padding:0" data-a="aOpen" data-v="' + esc(R.by.n) + '">' + esc(R.by.nick || "#" + R.by.n) + '</button> · <span class="rst rs-' + R.by.status + '">' + t("rs_" + R.by.status, { n: 5 }) + "</span></div>";
    h += '<div class="muted">' + t(R.unlimited ? "aRefUnl" : "aRefMsgs", { b: R.balance, e: R.earned, g: R.granted || 0, s: R.spent }) + "</div>";
    if (!R.unlimited) h += '<label class="lbl" for="grantn">' + t("aGrantL") + '</label><span class="irw2"><input id="grantn" type="number" inputmode="numeric" min="-1000" max="1000" step="1" data-f="grantN" value="' + esc(S.form.grantN || "") + '" placeholder="5"><button type="button" class="btn" data-a="aGrant" data-v="' + esc(n) + '"' + (S.busy ? " disabled" : "") + ">" + t("aGrantBtn") + '</button></span><span class="tiny muted">' + (S.grantMsg ? '<b class="okc">' + esc(S.grantMsg) + "</b> " : "") + t("aGrantX") + "</span>";   // owner, 2026-10-31
    h += '<div class="swrow"><span><b>' + t("aRefCan") + '</b><span class="tiny muted">' + t("aRefCanX") + '</span></span><button type="button" class="swb' + (R.can ? " on" : "") + '" role="switch" aria-checked="' + R.can + '" aria-label="' + esc(t("aRefCan")) + '" data-a="aRefCan" data-v="' + esc(n) + '" data-on="' + (R.can ? 0 : 1) + '"><i></i></button></div>';
    if (R.items.length) {
      h += '<details' + (S.aRefOpen ? " open" : "") + '><summary class="rsum" data-a="aRefToggle"><b>' + t("aRefList", { n: R.items.length }) + '</b><span class="muted">' + ["ok", "bot", "review", "open"].map(function (k) { var c = R.items.filter(function (x) { return x.status === k; }).length; return c ? t("rs_" + k, { n: 5 }).split(" ·")[0] + " " + c : ""; }).filter(Boolean).join(" · ") + "</span></summary>";
      R.items.forEach(function (x) {
        h += '<div class="irow" style="padding:8px 0"><span><button type="button" class="btn link" style="padding:0" data-a="aOpen" data-v="' + esc(x.n) + '">' + esc(x.nick || "#" + x.n) + '</button><span class="tiny muted">' + fmtDate(x.at) + '</span></span><span class="rst rs-' + x.status + '">' + t("rs_" + x.status, { n: 5 }) + "</span></div>";
      });
      h += "</details>";
    }
    return h + "</div>";
  }
  /** Owner, 2026-10-20: everyone this person has a «yes» with (either way) or had a mutual like with, and the log of each pair. */
  function pairsCard(P) {
    var h = '<div class="card small"><b>' + t("aPairs") + '</b><div class="tiny muted">' + t("aPairsNote") + "</div>";
    if (!P.items.length && !P.gone.length) return h + '<div class="muted">' + t("aPairsNone") + "</div></div>";
    var when = function (x) { return x ? " (" + fmtTime(x) + ")" : ""; };
    P.items.forEach(function (x) {
      var nm = x.nick || (x.n ? "#" + x.n : "?");
      h += '<div style="border-top:1px solid var(--line);padding-top:8px;display:flex;flex-direction:column;gap:3px">';
      h += '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">' + (x.n ? '<button type="button" class="btn link" style="padding:0" data-a="aOpen" data-v="' + esc(x.n) + '">' + esc(nm) + "</button>" : "<span>" + esc(nm) + "</span>") +
        '<span style="display:flex;gap:6px;align-items:baseline">' + (x.pct != null ? '<b style="color:var(--accent)">' + x.pct + " %</b>" : "") +
        '<span class="badge"' + (x.state === "mutual_hidden" || x.state === "ended" ? ' style="color:var(--danger)"' : "") + ">" + t("ps_" + x.state) + "</span></span></div>";
      h += "<div>" + t("aThis") + ": " + t("pv_" + (x.mine || "none")) + when(x.mine_at) + " · " + esc(nm) + ": " + t("pv_" + (x.theirs || "none")) + when(x.theirs_at) + "</div>";
      x.why.forEach(function (w) { h += '<div style="color:var(--danger)">· ' + esc(t("pw_" + w)) + "</div>"; });
      x.log.forEach(function (l) {
        var who = l.who === "self" ? t("aThis") : nm;
        h += '<div class="tiny muted">' + fmtTime(l.at) + " · " + esc(who) + ": " + (l.value === "none" ? t("pl_none") : "«" + t("pv_" + l.value) + "»") + (l.how === "unmatch" ? t("pl_unmatch") : "") +
          (l.broke === 1 ? t("pl_broke") : l.broke === 2 ? t("pl_made") : "") + "</div>";
      });
      h += "</div>";
    });
    P.gone.forEach(function (g) { h += '<div class="tiny" style="border-top:1px solid var(--line);padding-top:8px">' + t("pGone", { date: fmtTime(g.at) }) + "</div>"; });
    return h + "</div>";
  }

  function dropAdminMap() { if (amap) { amap.remove(); amap = null; } }
  return { vAdmin: vAdmin, vModeration: vModeration, vAdminProfile: vAdminProfile, vReport: vReport, starAskModal: starAskModal, drawAdminMap: drawAdminMap, dropAdminMap: dropAdminMap };
};
