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
