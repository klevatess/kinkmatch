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
