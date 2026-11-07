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
