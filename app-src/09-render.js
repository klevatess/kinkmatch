  /* ===== app-src/09-render.js — render(): picks the screen from S, the tab bar, BackButton.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  function render() {
    var h, clStep = false, clOpen = false;
    pfBegin();   // owner, 2026-11-07: this drawing says anew what it would like ahead (app-src/13a-speed.js)
    // owner, 2026-11-01: no texts yet (they come with /api/me) — the dots; they never came — a two-language line
    if (!TT.ru && !TT.en) { app.innerHTML = S.err ? '<div class="center"><p>Нет связи с сервером.<br>No connection to the server.</p><button type="button" class="btn primary" data-a="reload">Повторить · Retry</button></div>' : '<div class="center muted">…</div>'; return; }
    if (!S.me) h = S.err ? '<div class="body" style="justify-content:center">' + (S.errKind === "server" ? stateBox("quiet", t("stSrvT"), t("stSrvX"), '<button type="button" class="btn primary" data-a="reload">' + t("retry") + "</button>", t("stSrvNote"))
      : stateBox("broken", t("stErrT"), t("stErrX"), '<button type="button" class="btn primary" data-a="reload">' + t("retry") + "</button>", t("stErrNote"))) + "</div>"
      : '<div class="center muted">' + t("loading") + "</div>";
    else if (S.me.deleted) h = '<div class="center">' + t("deleted") + "</div>";
    else if (S.page === "about") h = vAbout();
    else if (S.me.admin) h = staffView("vAdmin");
    else if (S.me.banned) h = '<div class="center"><p>' + t("bannedText") + "</p></div>";
    else if (!S.me.access && !S.me.mod) h = '<div class="center"><p>' + t("noAccess") + '</p><p class="muted small">' + t("noAccess2") + "</p></div>";
    else {
      if (!S.me.access) S.tab = "mod";
      if (S.tab === "mod" && !S.me.mod) S.tab = "neighbours";        // no longer a moderator
      if (S.tab === "cal" && !(S.me.cal && S.me.cal.see)) S.tab = "neighbours";   // the calendar was switched off
      var st = S.me.steps;
      var step = !S.me.access ? null : S.edit || (!st.consent ? "consent" : (!st.checklist || S.preview) ? "checklist" : !st.profile ? "profile" : !st.location ? "place" : null);
      if (step && S.me.mod && S.tab === "mod" && !S.edit) step = null;   // a moderator without a participant profile
      S.onbMod = !!(step && S.me.mod && !S.edit);
      if (S.tz && !S.tz.gone && step && step !== "consent") S.tz = null;   // registration went on: no way back to the teaser
      h = S.tz && S.tz.gone ? vTeaserGone() : step === "consent" && S.tz && !S.edit ? teaserBlock(S.tz, true) + '<div class="tzreg">' + vConsent() + "</div>" : step === "consent" ? vConsent() : step === "checklist" ? vChecklist() : step === "profile" ? vProfile() : step === "place" ? vPlace() : vHome();
      // owner, 2026-11-01: no screen before the checklist form — after step 1 the form opens at once, and it is built
      // ahead (hidden) already while step 1 is on the screen
      clStep = !S.me.active && !S.preview && (step === "checklist" || step === "consent") && (!S.edit || S.edit === "consent");
      clOpen = step === "checklist" && !S.edit && !S.preview;
      if (!S.edit) markStep(step || (S.me.active ? "map" : null));   // owner, 2026-10-27: the first visit to each registration screen
    }
    document.documentElement.lang = S.lang;
    // owner, 2026-11-07: the owner's panel and the moderators' tab keep the earlier look (v6 is for participants)
    document.documentElement.classList.toggle("staff", !!(S.me && (S.me.admin || (S.tab === "mod" && S.me.mod && !S.edit))));
        document.documentElement.classList.toggle("tzsnap", !!(S.tz && !S.tz.gone && S.me && !S.me.active));
    if (map) { map.remove(); map = null; }
    // owner, 2026-10-21: once, after the steps, for someone who stayed in the universe
    var um = uniMine();
    if (S.me && S.me.active && um && um.on && !um.info_seen && !S.edit)
      h += '<div class="modal-bg"><div class="modal card"><h2 class="serif" style="font-size:22px">' + t("uniInfoTitle") + '</h2><div style="line-height:1.55">' + t("uniInfo1", { all: quoted(um.all) }) +
        '</div><div style="line-height:1.55">' + t("uniInfo2", { mine: quoted(um.mine) }) + '</div><div class="small muted">' + t("uniInfo3") +
        '</div><div class="decide"><button type="button" class="btn" data-a="uniInfoSettings">' + t("settingsBtn") + '</button><button type="button" class="btn primary" data-a="uniInfoOk">' + t("ok") + "</button></div></div></div>";
    if (S.aStarAsk && S.me && S.me.admin) h += STAFF ? STAFF.starAskModal() : "";   // owner, 2026-10-27
    if (S.sheet && S.me && !S.me.admin && S.tab === "neighbours") h += starSheet();
    if (S.yes && S.me && !S.me.admin) h += yesSheet();   // owner, 2026-10-31
    if (S.nn && S.me && !S.me.admin) h += nnSheet();   // owner, 2026-11-07
    if (S.ps && S.me && S.me.active && S.tab === "profile" && !S.edit) h += psSheet();   // owner, 2026-11-07 (9.01)
    if (S.mMenu && S.me && !S.me.admin && S.tab === "matches") h += mMenuSheet();
    if (S.fOpen && S.me && S.me.active && S.tab === "neighbours" && !S.open) h += filtersSheet();
    if (S.pzAsk && S.me && !S.me.admin) h += pzAskModal();
    if (S.qr && S.me && !S.me.admin) h += qrModal();
    if (S.askBox) h += askModal();
    if (S.delAsk && S.me && !S.me.deleted)
      h += '<div class="modal-bg"><div class="modal card" role="dialog" aria-modal="true" aria-labelledby="delh"><h2 id="delh" class="serif" style="font-size:22px;color:var(--danger)">' + t("delTitle") +
        '</h2><div class="small" style="line-height:1.55">' + t("delType") + '</div><label class="field"><span class="lbl">' + t("delWordL") + '</span><input type="text" autocomplete="off" autocapitalize="sentences" data-f="delWord" value="' + esc(S.form.delWord || "") + '"></label>' +
        (S.delErr ? '<div class="err" role="alert">' + t("delWrong") + "</div>" : "") +
        '<div class="decide"><button type="button" class="btn" data-a="delCancel">' + t("cancel") + '</button><button type="button" class="btn primary" style="background:var(--danger);border-color:var(--danger)" data-a="delFinal">' + t("delFinal") + "</button></div></div></div>";
    app.innerHTML = h;
    if (S.aAnsQ && app.querySelector('[data-a="aAnsQ"]')) ansFilter(S.aAnsQ);   // owner, 2026-11-07: the search stays applied after a redraw
    if (clStep && !S.fillOpen) { fillPreload(); if (clOpen) fillShow(true); } else if (!clStep) fillDropPre();
    if (S.yes) ymPaint();
    if (S.qr) qrPaint();
    if (S.me && S.me.active && !S.edit && S.tab === "neighbours" && !S.open && S.nbView === "map") drawMap();
    if (S.me && S.me.admin && S.aMapPage) { if (STAFF) STAFF.drawAdminMap(); }
    if (CAL && S.me && !S.me.admin && S.tab === "cal" && !S.open) CAL.after();
    if (S.coordsOpen) drawCoordsMap(parseCoords(S.form.coords || ""));
    if (S.scrollToMatch && S.tab === "matches" && S.matches) {
      var mc = app.querySelector('[data-mid="' + S.scrollToMatch.replace(/[^a-z0-9]/g, "") + '"]');
      S.scrollToMatch = null;
      if (mc) { mc.scrollIntoView({ block: "center" }); mc.classList.add("flash"); setTimeout(function () { mc.classList.remove("flash"); }, 1600); }
      else window.scrollTo(0, 0);
    }
    applyY();
    pfScreen(); pfEnd();
    if (tg && tg.BackButton) { if (S.fillOpen || S.yes || S.pzAsk || S.qr || S.chat || S.aChatRead || S.starsOpen || S.nStarsOpen || S.ints || S.aIntsPage || S.page || S.edit || S.open || S.prop || S.pin || S.aOpen || S.mOpen || S.aChatPage || S.aUniPage || S.aMutPage || S.aMapPage || S.report || S.onbMod || S.mapFrom || S.fOpen || (CAL && CAL.canBack())) tg.BackButton.show(); else tg.BackButton.hide(); }
  }

  Object.assign(A, {
    reload: load,
    uniInfoOk: function () { S.me.universe.info_seen = true; api("POST", "settings", { uni_info_seen: true }); render(); },
    uniInfoSettings: function () { S.me.universe.info_seen = true; api("POST", "settings", { uni_info_seen: true }); S.tab = "profile"; S.pTab = "settings"; render(); },
    delCancel: function () { S.delAsk = false; S.form.delWord = ""; S.err = ""; render(); },
    delFinal: function () {
      var w = String(S.form.delWord || "").trim();
      if (!/^(да|yes)$/i.test(w)) { S.delErr = true; return render(); }
      S.delErr = false;
      save("delete", { confirm: true, word: w }, function () { S.delAsk = false; S.me = { deleted: true }; phoneClear(); });
    },
  });
