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
