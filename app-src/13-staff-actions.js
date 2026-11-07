  /* ===== app-src/13-staff-actions.js — Click handlers for the owner panel and moderation screens (their buttons are drawn by public/app/staff.js).
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */


  Object.assign(A, {
    // the owner: suggestions, filter hits, «who uses the most»
    aIntsOpen: function () { S.aIntMsg = ""; S.aTab = "ints"; S.aOpen = null; S.aData.ints = null; S.aIntForm = null; S.aIntNew = null; S.aIntEdit = null; render(); window.scrollTo(0, 0); },
    aIntEdit: function (el) { S.aIntEdit = el.dataset.v ? { id: +el.dataset.v } : null; S.form.aiEdName = null; S.form.aiEdSyn = ""; S.err = ""; render(); },
    aIntRename: function (el) {
      var E = S.aIntEdit, name = el.dataset.v === "reset" ? "" : String(S.form.aiEdName != null ? S.form.aiEdName : CAT.byId[E.id].name).trim();
      aIntPost({ action: "rename", item: E.id, name: name }, function () { S.aIntEdit = { id: E.id, msg: t("aIntsEdSaved") }; S.form.aiEdName = null; });
    },
    aIntSynAdd: function () {
      var E = S.aIntEdit, w = String(S.form.aiEdSyn || "").trim(); if (!w) return;
      aIntPost({ action: "syn_add", item: E.id, text: w }, function () { S.aIntEdit = { id: E.id, msg: t("aIntsEdSaved") }; S.form.aiEdSyn = ""; });
    },
    aIntSynDel: function (el) { var E = S.aIntEdit; aIntPost({ action: "syn_del", id: +el.dataset.v }, function () { S.aIntEdit = { id: E.id }; }); },
    aIntNew: function (el) { S.aIntNew = el.dataset.v ? { name: "", section: "", alt: "" } : null; S.form.aiNewName = ""; S.form.aiNewSec = ""; S.form.aiNewAlt = ""; S.err = ""; render(); },
    aIntNewAdd: function () {
      var F = S.aIntNew, name = String(S.form.aiNewName || F.name || "").trim();
      F.name = name; F.section = S.form.aiNewSec || ""; F.alt = String(S.form.aiNewAlt || "").trim();
      if (!+F.section) { S.err = t("e_bad_section"); return render(); }
      if (Array.from(name).length < 2) { S.err = t("e_bad_length"); return render(); }
      aIntPost({ action: "add", ids: [], name: name, section: +F.section, alt: F.alt }, function () {
        S.aIntNew = { name: "", section: F.section, alt: "", done: name }; S.form.aiNewName = ""; S.form.aiNewAlt = "";
        api("GET", "interests").then(function (x) { if (x.ok) { S.intSrv = x; render(); } });
      });
    },
    aIntForm: function (el) {
      if (!el.dataset.v) { S.aIntForm = null; return render(); }
      var g = S.aData.ints.groups[+el.dataset.i];
      S.aIntForm = { i: +el.dataset.i, kind: el.dataset.v, name: g.name, section: g.section, alt: g.alt || "", q: g.name };
      S.form.aiName = g.name; S.form.aiSec = String(g.section); S.form.aiAlt = g.alt || "";
      render();
    },
    aIntAdd: function (el) { aIntPost({ action: "add", ids: el.dataset.ids.split(",").map(Number), name: S.form.aiName, section: +S.form.aiSec, alt: S.form.aiAlt || "" }); },
    aIntAct: function (el) { aIntPost({ action: el.dataset.x, ids: el.dataset.ids.split(",").map(Number) }); },
    aIntBlock: function (el) {
      var on = el.dataset.on === "1";
      aIntPost({ action: "block", n: el.dataset.v, on: on }, function () { var d = S.aData.profile; if (d && d.profile && d.profile.n === el.dataset.v) d.profile.suggest_blocked = on; });
    },
    aWhoOpen: function (el) { S.aWhoOpen = !!el.dataset.v; if (!S.aWhoOpen) { S.aData.who1 = null; S.aData.who7 = null; } render(); },
    aWhoDays: function (el) { S.aWhoDays = +el.dataset.v; render(); },
    aOvTab: function (el) { S.aOvTab = el.dataset.v; render(); window.scrollTo(0, 0); },   // owner, 2026-11-02
    aRefresh: function () {   // owner, 2026-11-01: count the panel numbers again now
      S.aFreshUntil = Date.now() + 8000;
      Object.keys(S.aData).forEach(function (k) { if (/^(overview|usage|sum_|rem$|universe$|retention)/.test(k)) S.aData[k] = null; });
      render();
    },
    aTab: function (el) { S.aTab = el.dataset.v; S.aData[S.aTab] = null; S.aLate = false; if (S.cal) S.cal.admin = null;
      if (S.aTab === "overview") Object.keys(S.aData).forEach(function (k) { if (/^(usage|sum_|rem$|universe$)/.test(k)) S.aData[k] = null; });   /* fresh numbers */ S.mOpen = null; S.aChatPage = null; S.err = ""; if (S.aTab === "reports") S.aData.reports = null; render(); window.scrollTo(0, 0); },
    bkMake: function () {
      S.bk = { busy: true, msg: "" }; render();
      var chunks = [], done = 0, total = 0, tables;
      var fail = function () { S.bk = { msg: t("netErr") }; render(); };
      api("GET", "admin/backup").then(function (head) {
        if (!head.ok) return fail();
        tables = head.tables.slice(); Object.keys(head.counts).forEach(function (k) { total += head.counts[k]; });
        var next = function (after) {
          if (!tables.length) return finish();
          var tb = tables[0];
          api("GET", "admin/backup?t=" + tb + "&after=" + (after == null ? "" : after)).then(function (r) {
            if (!r.ok) return fail();
            if (r.d) chunks.push({ t: tb, d: r.d });
            done += r.rows; S.bk.msg = t("bkProgress", { n: done, total: total }); render();
            if (r.done) { tables.shift(); next(""); } else next(r.last);
          }, fail);
        };
        var finish = function () {
          var file = JSON.stringify({ format: "kinkoverse-backup", v: 1, version: S.aData.settings && S.aData.settings.version, at: new Date().toISOString(), counts: head.counts, chunks: chunks });
          var name = "kinkoverse-backup-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".json";
          var url = ""; try { url = URL.createObjectURL(new Blob([file], { type: "application/json" })); } catch (e) { /* no blobs */ }
          api("POST", "admin/backup-send", { file: file }).then(function (r) {
            S.bk = { msg: r.sent ? t("bkSent") : t("netErr"), url: url, name: name }; render();
          }, fail);
        };
        next("");
      }, fail);
    },
    bkFile: function (el) {
      var f = el.files && el.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try { var j = JSON.parse(rd.result); if (j.format !== "kinkoverse-backup" || !Array.isArray(j.chunks)) throw 0; S.bkFile = j; S.bk = { msg: f.name + " · " + j.chunks.length }; }
        catch (e) { S.bkFile = null; S.bk = { msg: t("bkBad") }; }
        render();
      };
      rd.readAsText(f);
    },
    bkRestore: function () {
      if (!S.bkFile) { S.bk = { msg: t("bkPick") }; return render(); }
      if (String(S.form.bkWord || "").trim().toUpperCase() !== t("bkWord")) { S.bk = { msg: t("bkRestoreNote") }; return render(); }
      var chunks = S.bkFile.chunks, i = 0;
      S.bk = { busy: true, msg: "" }; render();
      var fail = function (r) { S.bk = { msg: (r && r.error === "bad_backup") ? t("bkBad") : t("netErr") }; render(); };
      api("POST", "admin/restore-begin", { confirm: "RESTORE" }).then(function (r) {
        if (!r.ok) return fail(r);
        var next = function () {
          if (i >= chunks.length) { S.bk = { msg: t("bkRestored") }; render(); setTimeout(function () { location.reload(); }, 1200); return; }
          api("POST", "admin/restore-chunk", { t: chunks[i].t, d: chunks[i].d, last: i === chunks.length - 1 }).then(function (x) {
            if (!x.ok) return fail(x);
            i++; S.bk.msg = t("bkRestoring", { n: i, total: chunks.length }); render(); next();
          }, fail);
        };
        next();
      }, fail);
    },
    aSearch: function () {},
    mIntroOk: function () { S.me.mod.intro_seen = true; api("POST", "mod/intro-seen", {}); render(); },
    aSet: function (el) { var o = {}; o[el.dataset.v] = el.checked; api("POST", "admin/settings", o).then(function (r) { if (r.ok) { S.aData.settings = r; S.aData.retention = null; render(); } }); },
    aReport: function () { S.aData.reportText = t("loading"); render(); api("GET", "admin/debug-report").then(function (r) { S.aData.reportText = r.ok ? r.text : t("netErr"); render(); }); },
    aCalib: function () {
      var go = function (yes) { if (yes) api("POST", "admin/calib-send", {}).then(function (r) { if (r.ok) S.aData.calib = r.counts; else S.err = t("netErr"); render(); }); };
      askYes(t("aCalibConfirm"), go);
    },
    aReportSend: function () { api("POST", "admin/debug-send", {}).then(function (r) { S.aData.reportSent = !!r.sent; if (!r.sent) S.err = t("netErr"); render(); }); },
    aReportCopy: function () { try { navigator.clipboard.writeText(S.aData.reportText); } catch (e) { /* select by hand */ } },
    aPostButton: function (el) { api("POST", "admin/post-button", { chat_id: el.dataset.v }).then(function (r) { if (r.ok) { S.aData.overview = r; render(); } else { S.err = t("netErr"); render(); } }); },
    openKs: function (el) {
      var path = S.me.admin ? "admin/kslink" : (S.aOpen && S.me.mod) ? "mod/kslink" : "kslink";
      api("GET", path + "?id=" + encodeURIComponent(el.dataset.v)).then(function (r) {
        if (!r.ok) { S.err = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); return render(); }
        if (tg && tg.openLink) tg.openLink(r.link); else window.open(r.link, "_blank");
      });
    },
    aUnblock: function (el) {
      var go = function (yes) { if (yes) api("POST", "admin/unblock-chat", { chat_id: el.dataset.v }).then(function (r) { if (r.ok) { S.aData.overview = r; render(); } }); };
      var q = t("aUnblockConfirm", { chat: el.dataset.t });
      askYes(q, go);
    },
    accShow: function () {
      var n = S.aOpen; S.aData.account = { n: n, loading: true }; render();
      api("GET", (S.me.admin ? "admin/" : "mod/") + "account?id=" + encodeURIComponent(n)).then(function (r) {
        if (!r.ok) { S.aData.account = null; S.err = t("netErr"); return render(); }
        S.aData.account = { n: n, account: r.account }; render(); loadPhotos();
      });
    },
    accOpen: function () { var l = S.aData.account.account.link; if (tg && tg.openTelegramLink) tg.openTelegramLink(l); else window.open(l, "_blank"); },
    accLink: function () { api("POST", (S.me.admin ? "admin/" : "mod/") + "account-link", { id: S.aOpen }).then(function (r) { if (r.ok) { S.aData.account.sent = true; render(); } }); },
    aNovaAsk: function (el) {
      var n = el.dataset.v, go = function (yes) {
        if (!yes) return;
        api("POST", "admin/nova", { q: "#" + n, action: "light" }).then(function (r) {
          if (!r.ok) { S.aStarMsg = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); return render(); }
          S.aStarMsg = ""; S.aData.novas = null; starsDrop();
          if (S.aOpen === n) mLoad("profile", "admin/profile?id=" + encodeURIComponent(n));
          render();
        });
      }, q = t("aNovaAskQ", { nick: el.dataset.t });
      askYes(q, go);
    },
    // owner, 2026-11-03: the supernova's contact after a mutual like — the owner's account or its own
    aNovaContact: function (el) {
      var id = el.dataset.v, c = el.dataset.c;
      askYes(t(c === "owner" ? "aNovaContactQ" : "aNovaContactQSelf", { nick: el.dataset.t }), function () {
        api("POST", "admin/nova", { id: id, action: "contact", value: c }).then(function (r) { if (r.ok) S.aData.novas = null; else S.err = t("netErr"); render(); });
      });
    },
    aNovaChats: function (el) { S.aNovaOpen = S.aNovaOpen === el.dataset.v ? null : el.dataset.v; render(); },
    aNovaRemove: function (el) {
      var id = el.dataset.v;
      confirm2(t("aNovaDel1", { nick: el.dataset.t }), t("aNovaDel2"), function () { api("POST", "admin/nova", { id: id, action: "remove" }).then(function () { S.aData.novas = null; starsDrop(); if (S.aOpen === id) mLoad("profile", "admin/profile?id=" + encodeURIComponent(id)); render(); }); });
    },
    aChatRead: function (el) { S.aChatRead = Number(el.dataset.v); S.aData.chatRead = null; render(); window.scrollTo(0, 0); api("GET", "admin/chat?c=" + S.aChatRead).then(function (r) { if (r.ok) { S.aData.chatRead = r; render(); } }); },
    aChatReadClose: function () { S.aChatRead = null; S.aData.chatRead = null; render(); },
    aChatDel: function (el) {
      var c = Number(el.dataset.v);
      confirm2(t("chDel1", { nick: el.dataset.t }), t("chDel2"), function () { api("POST", "admin/chat-delete", { c: c }).then(function () { S.aChatRead = null; S.aData.chatRead = null; S.aData.novas = null; render(); }); });
    },
    mTab: function (el) { S.mTab = el.dataset.v; S.err = ""; render(); },
    mState: function (el) { S.mState = el.dataset.v; S.aData.reports = null; render(); },
    mOpen: function (el) { keepY("m"); S.mOpen = +el.dataset.v; S.aData.report = null; S.err = ""; render(); window.scrollTo(0, 0); mLoad("report", "mod/report?id=" + S.mOpen); },
    mClose: function () { S.mOpen = null; S.err = ""; S.aData.reports = null; backY("m"); render(); },
    mAct: function (el) { modPost("mod/" + el.dataset.v, { id: S.mOpen }); },
    mDecide: function (el) {
      var d = el.dataset.v, q = d === "dismiss" ? t("dConfirmDismiss") : d === "ban" && !S.me.admin ? t("dConfirmPropose") : t("dConfirm", { d: t("d_" + d) });
      var go = function (yes) { if (yes) modPost("mod/decide", { id: S.mOpen, decision: d }); };
      askYes(q, go);
    },
    mBanApprove: function () { confirm2(t("mBanApproveQ"), t("mBanApproveQ2"), function () { modPost("mod/approve", { id: S.mOpen }); }); },
    mBanReject: function () {
      var go = function (yes) { if (yes) modPost("mod/reject", { id: S.mOpen }); };
      askYes(t("mBanRejectQ"), go);
    },
    mUndo: function () {
      var go = function (yes) { if (yes) modPost("mod/undo", { id: S.mOpen }); };
      askYes(t("mUndoConfirm"), go);
    },
    mQuit: function () {
      var go = function (yes) { if (yes) api("POST", "mod/quit", {}).then(function () { load(); }); };
      askYes(t("mQuitConfirm"), go);
    },
    iScope: function (el) {
      var v = el.dataset.v;
      if (!v) S.inviteScope = [];
      else { var i = S.inviteScope.indexOf(v); if (i >= 0) S.inviteScope.splice(i, 1); else S.inviteScope.push(v); }
      S.invite = null; render();
    },
    iMake: function () {
      if (S.busy) return;
      S.busy = true; render();
      api("POST", "admin/invite", { scope: S.inviteScope.length ? S.inviteScope : null }).then(function (r) {
        S.busy = false; if (r.ok) S.invite = r; else S.err = t("netErr"); render();
      }, function () { S.busy = false; S.err = t("netErr"); render(); });
    },
    iCopy: function () {
      var done = function () { S.invite.copied = true; render(); };
      try { navigator.clipboard.writeText(S.invite.link).then(done, function () { var i = app.querySelector("input[readonly]"); if (i) { i.select(); document.execCommand("copy"); done(); } }); }
      catch (e) { var i = app.querySelector("input[readonly]"); if (i) { i.select(); document.execCommand("copy"); done(); } }
    },
    iShare: function () { var u = "https://t.me/share/url?url=" + encodeURIComponent(S.invite.link); if (tg && tg.openTelegramLink) tg.openTelegramLink(u); else window.open(u, "_blank"); },
    iRevoke: function () { api("POST", "admin/invite-revoke", { code: S.invite.code }).then(function () { S.invite = { revoked: true }; render(); }); },
    aModRemove: function (el) {
      var go = function (yes) { if (yes) api("POST", "admin/mod-remove", { n: el.dataset.v }).then(function (r) { if (r.ok) { S.aData.mods = r; render(); } }); };
      var q = t("aRemoveConfirm", { name: el.dataset.t });
      askYes(q, go);
    },
    aStage: function (el) { S.aStage = el.dataset.v; render(); },
    aGender: function (el) { S.aGender = el.dataset.v; render(); },
    aSort: function (el) { S.aSort = el.value; render(); },
    aLateOff: function () { S.aLate = false; render(); },
    aNewVisible: function () { S.aTab = "profiles"; S.aData.profiles = null; S.aSort = "visible"; S.aStage = "all"; S.aLate = true; S.aQuery = ""; S.aChat = ""; S.aOpen = null; render(); window.scrollTo(0, 0); },
    aChatSel: function (el) { S.aChat = el.value; render(); },
    aToggle: function (el) { S[el.dataset.v] = !S[el.dataset.v]; render(); },
    aAbout: function (el) {   // owner, 2026-10-27
      var n = el.dataset.v, x = el.dataset.x;
      var go = function (yes) { if (!yes) return; api("POST", "admin/about", { id: n, action: x }).then(function () { mLoad("profile", "admin/profile?id=" + encodeURIComponent(n)); S.aData.overview = null; }); };
      if (x === "hide") { askYes(t("aAboutHideQ"), go); } else go(true);
    },
    aLinkNote: function (el) { api("POST", "admin/link", { note: +el.dataset.v, action: el.dataset.x }).then(function () { S.aData.overview = null; render(); }); },
    aLinkAct: function (el) { var n = el.dataset.n; api("POST", "admin/link", { link: +el.dataset.v, action: el.dataset.x }).then(function () { starsDrop(); if (S.aOpen === n) mLoad("profile", "admin/profile?id=" + encodeURIComponent(n)); render(); }); },
    aAboutOk: function (el) { api("POST", "admin/about", { log: el.dataset.l, action: "seen" }).then(function () { S.aData.overview = null; render(); }); },
    aAboutAgain: function (el) { api("POST", "admin/about", { id: el.dataset.v, log: el.dataset.l, action: "hide" }).then(function () { S.aData.overview = null; render(); }); },
    txSub: function (el) { S.txSub = el.dataset.v; S.txOpen = null; S.txMsg = ""; if (S.txSub === "journal") S.aData.journal = null; render(); },
    txSearch: function () {},
    txOpen: function (el) { S.txOpen = el.dataset.v; S.txMsg = ""; S.txErr = null; S.form.tx_ru = null; S.form.tx_en = null; render(); window.scrollTo(0, 0); },
    txClose: function () { S.txOpen = null; S.txErr = null; S.txMsg = ""; render(); },
    txSave: function (el) {
      var lang = el.dataset.v, it = (S.aData.texts.items || []).filter(function (i) { return i.key === S.txOpen; })[0], v = S.form["tx_" + lang];
      if (!it || v == null) return;
      S.busy = true; S.txErr = null; render();
      api("POST", "admin/texts", { key: it.key, lang: lang, value: v }).then(function (r) {
        S.busy = false;
        if (!r.ok) { S.txErr = { lang: lang, text: t("e_" + r.error, { v: (r.vars || []).map(function (x) { return "{" + x + "}"; }).join(", ") }) }; return render(); }
        S.aData.texts = r; S.form["tx_" + lang] = null; S.txMsg = t("txSaved"); render();
      }, function () { S.busy = false; S.txErr = { lang: lang, text: t("netErr") }; render(); });
    },
    txReset: function (el) {
      var lang = el.dataset.v, key = S.txOpen;
      var go = function (yes) { if (!yes) return; api("POST", "admin/texts", { key: key, lang: lang, reset: true }).then(function (r) { if (r.ok) { S.aData.texts = r; S.form["tx_" + lang] = null; S.txMsg = t("txSaved"); } render(); }); };
      askYes(t("txResetQ"), go);
    },
    dmFind: function () {},
    dmPick: function (el) { S.dmTo = { n: el.dataset.v, nick: el.dataset.nick }; S.dmMsg = null; S.form.dmText = ""; render(); },
    dmChange: function () { S.dmTo = null; S.dmMsg = null; render(); },
    dmSend: function () {
      var to = S.dmTo, txt = String(S.form.dmText || "").trim(); if (!to || !txt) return;
      var go = function (yes) {
        if (!yes) return;
        S.busy = true; render();
        api("POST", "admin/dm", { id: to.n, text: txt, button: S.form.dmBtn !== false }).then(function (r) {
          S.busy = false;
          if (!r.ok) { S.dmMsg = { ok: false, text: hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr") }; return render(); }
          S.dmMsg = { ok: r.sent, text: t(r.sent ? "dmSent" : "dmFailed") }; S.aData["dm_" + to.n] = r; if (r.sent) S.form.dmText = ""; render();
        }, function () { S.busy = false; S.dmMsg = { ok: false, text: t("netErr") }; render(); });
      };
      askYes(t("dmSendQ", { name: to.nick }), go);
    },
    aStarTab: function (el) { S.aStarTab = el.dataset.v; S.aStarMsg = ""; render(); },
    aStarSearch: function () {},
    aStarAsk: function (el) { S.aStarAsk = { n: el.dataset.v, nick: el.dataset.nick, g: el.dataset.g, later: !!el.dataset.later }; S.form.aStarNote = ""; S.aStarErr = ""; render(); },
    aStarCancel: function () { S.aStarAsk = null; render(); },
    aStarDo: function () {
      var a = S.aStarAsk; if (!a || S.busy) return;
      S.busy = true; render();
      api("POST", "admin/star", { id: a.n, action: "light", note: S.form.aStarNote || "" }).then(function (r) {
        S.busy = false;
        if (!r.ok) { S.aStarErr = r.error === "not_active" ? t("aStarCant") : t("netErr"); return render(); }
        S.aStarAsk = null; S.aStarMsg = t(r.sent ? "aStarSent" : "aStarNotSent"); starsDrop();
        if (S.aOpen === a.n) mLoad("profile", "admin/profile?id=" + encodeURIComponent(a.n));
        render();
      }, function () { S.busy = false; S.aStarErr = t("netErr"); render(); });
    },
    aStarOut: function (el) { starAct(el.dataset.v, "out", t("aStarOutQ", { name: el.dataset.nick })); },
    aStarUncap: function (el) { starAct(el.dataset.v, "uncaption", t("aStarUncapQ", { c: el.dataset.c })); },
    aOpen: function (el) { if (!S.aOpen) keepY("a"); S.aOpen = el.dataset.v; S.grantMsg = ""; S.form.grantN = ""; S.aData.profile = null; render(); window.scrollTo(0, 0); mLoad("profile", (S.me.admin ? "admin/" : "mod/") + "profile?id=" + encodeURIComponent(S.aOpen)); },
    aClose: function () { dropAccount(); S.aOpen = null; S.fromRef = false; backY("a"); render(); },
    aRepTab: function (el) { S.aRepTab = el.dataset.v; S.err = ""; render(); },
    aRefsOpen: function () { S.aTab = "reports"; S.aRepTab = "refs"; S.aData.refs = null; render(); window.scrollTo(0, 0); },
    aRefCan: function (el) {
      api("POST", "admin/can-invite", { id: el.dataset.v, on: el.dataset.on === "1" }).then(function (r) {
        if (r.ok && S.aData.profile && S.aData.profile.referrals) S.aData.profile.referrals.can = el.dataset.on === "1";
        if (!r.ok) S.err = t("netErr"); render();
      });
    },
    aGrant: function (el) {
      var v = parseInt(S.form.grantN, 10), id = el.dataset.v; if (!v) return;
      S.busy = true; S.grantMsg = ""; render();
      api("POST", "admin/msg-grant", { id: id, n: v }).then(function (r) {
        S.busy = false;
        if (!r.ok) { S.err = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); return render(); }
        S.form.grantN = ""; S.grantMsg = t("aGrantOk", { b: r.balance });
        var R = S.aData.profile && S.aData.profile.referrals; if (R) { R.balance = r.balance; R.granted = (R.granted || 0) + r.changed; }
        render();
      }, function () { S.busy = false; S.err = t("netErr"); render(); });
    },
    aRefToggle: function (el) { S.aRefOpen = !el.parentNode.open; },
    aWordsSave: function () {
      api("POST", "admin/contact-words", { words: S.form.cwords != null ? S.form.cwords : "" }).then(function (r) {
        if (r.ok) { S.aWordsOk = true; S.form.cwords = r.words.join("\n"); if (S.aData.texts) S.aData.texts.contact_words = S.form.cwords; render(); setTimeout(function () { S.aWordsOk = false; render(); }, 2000); }
        else { S.err = t("netErr"); render(); }
      });
    },
    refState: function (el) { S.refState = el.dataset.v; S.aData.refs = null; render(); },
    refOpen: function (el) { S.fromRef = true; A.aOpen(el); },
    refDecide: function (el) {
      if (S.busy) return;
      S.busy = true; S.err = ""; render();
      api("POST", "mod/referral", { id: el.dataset.v, decision: el.dataset.x }).then(function (r) {
        S.busy = false;
        if (!r.ok) { S.err = hasT("e_" + r.error) ? t("e_" + r.error) : t("netErr"); return render(); }
        S.aData.refs = null; render();
      }, function () { S.busy = false; S.err = t("netErr"); render(); });
    },
    aBlock: function (el) {
      var id = el.dataset.v, title = el.dataset.t;
      confirm2(t("aBlockConfirm", { chat: title }), t("aBlockConfirm2", { chat: title }), function () {
        api("POST", "admin/block-chat", { chat_id: id }).then(function (r) { if (r.ok) { S.aData.overview = r; render(); } else { S.err = t("netErr"); render(); } });
      });
    },
    aChatOpen: function (el) { keepY("c"); S.aChatPage = el.dataset.v; S.err = ""; render(); window.scrollTo(0, 0); },
    aChatClose: function () { S.aChatPage = null; S.err = ""; backY("c"); render(); },
    aSumPer: function (el) { S.aSumPer = el.dataset.v; render(); },
    aRemSet: function (el) { api("POST", "admin/reminders", { on: el.checked }).then(function (r) { if (r.ok) S.aData.rem = r; render(); }); },
    aMutOpen: function () { Object.keys(S.aData).forEach(function (k) { if (/^mut_/.test(k)) S.aData[k] = null; }); S.aMutPage = true; S.err = ""; render(); window.scrollTo(0, 0); },
    aMutClose: function () { S.aMutPage = false; render(); },
    aMutState: function (el) { S.aMutState = el.dataset.v; render(); },
    aMutDays: function (el) { S.aMutDays = +el.dataset.v; render(); },
    aMapOpen: function () { S.aMapPage = true; S.aMapView = null; Object.keys(S.aData).forEach(function (k) { if (/^map_/.test(k)) S.aData[k] = null; }); render(); window.scrollTo(0, 0); },
    aMapClose: function () { S.aMapPage = false; if (STAFF) STAFF.dropAdminMap(); render(); },
    aMapLabels: function () { S.aMapLabels = !S.aMapLabels; render(); },
    aMapF: function (el) { S.aMapF = S.aMapF || { from: "all", gender: "", role: "" }; S.aMapF[el.dataset.k] = el.dataset.v; render(); },
    aUniOpen: function () { S.aUniPage = true; S.err = ""; render(); window.scrollTo(0, 0); },
    aUniClose: function () { S.aUniPage = false; S.err = ""; render(); },
    aUniAct: function (el) {
      var act = el.dataset.v, chat = el.dataset.c, q = { add: "aUniConfirmAdd", accept: "aUniConfirmAdd", remove: "aUniConfirmRemove", decline: "aUniConfirmDecline" }[act];
      var go = function (yes) { if (!yes) return; api("POST", "admin/universe", { chat_id: chat, action: act }).then(function (r) { if (r.ok) S.aData.universe = r; else S.err = t("netErr"); render(); }); };
      askYes(t(q, { chat: el.dataset.t }), go);
    },
    aSpaceInvite: function () {
      var n = S.aData.universe ? S.aData.universe.no_chat : 0;
      var go = function (yes) { if (!yes) return; api("POST", "admin/space-invite").then(function (r) { if (r.ok) { S.aData.universe = r; S.aData.spaceSent = r.sent; } else S.err = t("netErr"); render(); }); };
      askYes(t("aNoChatConfirm", { n: n }), go);
    },
    aBan: function () {
      var n = S.aOpen;
      confirm2(t("aBlockUserConfirm", { n: n }), t("aBlockUserConfirm2"), function () {
        api("POST", "admin/ban", { id: n }).then(function (r) { if (r.ok) { S.aData.profile = r; S.aData.profiles = null; render(); } else { S.err = t("netErr"); render(); } });
      });
    },
    aResetPlace: function () {
      var n = S.aOpen, go = function (yes) { if (yes) api("POST", "admin/reset-place", { id: n }).then(function (r) { if (r.ok) { S.aData.profile = r; render(); if (tg && tg.showAlert) tg.showAlert(t("aResetPlaceDone")); } else { S.err = t("netErr"); render(); } }); };
      askYes(t("aResetPlaceConfirm"), go);
    },
    aUnban: function () {
      var n = S.aOpen, go = function (yes) { if (yes) api("POST", "admin/unban", { id: n }).then(function (r) { if (r.ok) { S.aData.profile = r; S.aData.profiles = null; render(); } else { S.err = t("netErr"); render(); } }); };
      askYes(t("aUnbanConfirm", { n: n }), go);
    },
    aLinkGo: function (el) {   // owner, 2026-11-02: a star's link in the owner panel opens (not counted as a click)
      var u = el.dataset.u;
      if (/^https:\/\/(t\.me|telegram\.me)\//i.test(u) && tg && tg.openTelegramLink) tg.openTelegramLink(u);
      else if (tg && tg.openLink) tg.openLink(u); else window.open(u, "_blank", "noopener");
    },
    aStarActs: function (el) { S.aStarAct = S.aStarAct === el.dataset.v ? null : el.dataset.v; render(); },

    // owner, 2026-11-07: «Подозрительная анкета» (the owner only; the person is not told)
    aSusEdit: function (el) {
      var d = S.aData.profile, cur = d && d.sus;
      S.aSus = el.dataset.v ? { n: el.dataset.v, reason: cur ? cur.reason : "" } : null; S.form.aSusNote = null; render();
    },
    aSusWhy: function (el) { if (S.aSus) { S.aSus.reason = el.dataset.v; render(); } },
    aSusSave: function (el) { susPost({ id: el.dataset.v, on: true, reason: S.aSus && S.aSus.reason, note: S.form.aSusNote != null ? S.form.aSusNote : ((S.aData.profile && S.aData.profile.sus) || {}).note || "" }); },
    aSusOff: function (el) { var n = el.dataset.v; askYes(t("aSusOffQ"), function (y) { if (y) susPost({ id: n, on: false }); }); },
    // owner, 2026-11-07: «Видимость: почему» — asked only on a tap; a second tap on the same button closes it
    aWhy: function (el) {
      var n = el.dataset.v, dir = el.dataset.x;
      if (S.aWhy && S.aWhy.n === n && S.aWhy.dir === dir) { S.aWhy = null; return render(); }
      var W = S.aWhy = { n: n, dir: dir, r: null }; render();
      api("GET", "admin/whynot?id=" + encodeURIComponent(n) + "&dir=" + dir).then(function (r) {
        if (S.aWhy !== W) return;   // another tap meanwhile
        if (r.ok) W.r = r; else W.err = true; render();
      }, function () { if (S.aWhy === W) { W.err = true; render(); } });
    },
    // owner, 2026-11-07: delete an item the owner added — it leaves every profile; the question shows how many people have it
    aIntDel: function (el) {
      var item = +el.dataset.v; if (S.busy) return;
      api("POST", "admin/interests", { action: "del_count", item: item }).then(function (c) {
        if (!c.ok) { S.err = hasT("e_" + c.error) ? t("e_" + c.error) : t("netErr"); return render(); }
        var nm = CAT && CAT.byId[item] ? CAT.byId[item].name : "#" + item;
        confirm2(t("aIntsDelQ", { x: nm, n: c.people }), t("aIntsDelQ2"), function () {
          aIntPost({ action: "delete", item: item }, function (r) { S.aIntEdit = null; S.aiCatQ = ""; S.aIntMsg = t("aIntsDeleted", { x: nm, n: r.removed_from });
            api("GET", "interests").then(function (x) { if (x.ok) { S.intSrv = x; render(); } }); });
        });
      }, function () { S.err = t("netErr"); render(); });
    },
    // owner, 2026-11-07: «Сообщения» — the next page
    lmMore: function () {
      var x = S.aData.lmsgs; if (!x || !x.next || S.lmBusy) return;
      S.lmBusy = true; render();
      api("GET", "admin/likemsgs?before=" + encodeURIComponent(x.next)).then(function (r) {
        S.lmBusy = false;
        if (r.ok && S.aData.lmsgs === x) { x.items = x.items.concat(r.items); x.next = r.next; } else if (!r.ok) S.err = t("netErr");
        render();
      }, function () { S.lmBusy = false; S.err = t("netErr"); render(); });
    },
    // owner, 2026-11-07: «Отправить всем»
    bcOpen: function () { S.aTab = "texts"; S.txSub = "bc"; S.txOpen = null; render(); window.scrollTo(0, 0); },
    bcTpl: function () {
      var go = function () { S.form.bcText = t("bcTpl"); if (S.bc) S.bc.msg = ""; render(); };
      if (String(S.form.bcText || "").trim()) askYes(t("bcTplQ"), function (y) { if (y) go(); }); else go();
    },
    bcAud: function (el) { S.bc.audience = el.dataset.v; S.bc.msg = ""; render(); },
    bcButton: function () { S.bc.button = !S.bc.button; render(); },
    bcSend: function () {
      var B = S.bc, info = S.aData["bc_" + B.audience], text = String(S.form.bcText || "").trim();
      if (!text || !info || B.sending || S.busy) return;
      confirm2(t("bcQ1", { n: info.count, a: t("bcAud_" + B.audience) }), t("bcQ2"), function () {
        S.busy = true; B.msg = ""; render();
        api("POST", "admin/broadcast", { text: text, audience: B.audience, button: !!B.button, photo: B.photo || null }).then(function (r) {
          S.busy = false;
          if (!r.ok) { B.msg = hasT("bcE_" + r.error) ? t("bcE_" + r.error) : t("netErr"); B.bad = true; dropBcInfo(); return render(); }
          B.total = r.total; B.waiting = r.total; B.bad = false; S.form.bcText = ""; B.photo = null; if (B.photoUrl) { URL.revokeObjectURL(B.photoUrl); B.photoUrl = null; }
          bcLoop();
        }, function () { S.busy = false; B.msg = t("netErr"); B.bad = true; render(); });
      });
    },
    bcPhotoDel: function () { var B = S.bc; B.photo = null; if (B.photoUrl) URL.revokeObjectURL(B.photoUrl); B.photoUrl = null; render(); },
    bcPush: function () { var B = S.bc, info = S.aData["bc_" + B.audience]; if (B.sending) return; B.total = (info && info.waiting) || 1; B.waiting = B.total; bcLoop(); },
  });

  function susPost(body) {
    if (S.busy) return;
    S.busy = true; S.err = ""; render();
    api("POST", "admin/sus", body).then(function (r) {
      S.busy = false;
      if (!r.ok) { S.err = t("netErr"); return render(); }
      S.aSus = null; S.form.aSusNote = null; S.aData.profiles = null;
      mLoad("profile", "admin/profile?id=" + encodeURIComponent(body.id));
      render();
    }, function () { S.busy = false; S.err = t("netErr"); render(); });
  }
  function dropBcInfo() { Object.keys(S.aData).forEach(function (k) { if (/^bc_/.test(k)) S.aData[k] = null; }); }
  /* one loop at a time; each call sends the next 25 (the Worker's limit on Telegram calls per request). If the panel is
     closed or the network fails, the hourly job sends the rest. */
  function bcLoop() {
    var B = S.bc; if (B.sending) return;
    B.sending = true; render();
    var stop = function (msg, bad) { B.sending = false; B.msg = msg; B.bad = !!bad; dropBcInfo(); render(); };
    var step = function () {
      api("POST", "admin/broadcast-push", {}).then(function (r) {
        if (!r.ok) return stop(t("bcLater"), true);
        B.waiting = r.waiting; render();
        if (r.waiting > 0) setTimeout(step, 400); else stop(t("bcDone", { n: B.total }));
      }, function () { stop(t("bcLater"), true); });
    };
    step();
  }

  /* owner, 2026-11-07: a photo for «Отправить всем» — made smaller on the phone (≤ 1600 px, JPEG), then sent as it is
     (no JSON) to /api/admin/broadcast-photo; Telegram keeps it, we keep only its file_id */
  function bcPhotoUp(file) {
    var B = S.bc; if (!B || B.upBusy) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { B.msg = t("bcE_bad_type"); B.bad = true; return render(); }
    B.upBusy = true; B.msg = ""; render();
    var done = function (msg) { B.upBusy = false; if (msg) { B.msg = msg; B.bad = true; } render(); };
    var img = new Image(), src = URL.createObjectURL(file);
    img.onerror = function () { URL.revokeObjectURL(src); done(t("bcE_bad_type")); };
    img.onload = function () {
      var k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(src);
      c.toBlob(function (blob) {
        if (!blob) return done(t("netErr"));
        fetch("/api/admin/broadcast-photo", { method: "POST", headers: { "authorization": "tma " + (tg ? tg.initData : ""), "content-type": "image/jpeg" }, body: blob })
          .then(function (r) { return r.json(); }).then(function (r) {
            if (!r.ok) return done(hasT("bcE_" + r.error) ? t("bcE_" + r.error) : t("netErr"));
            if (B.photoUrl) URL.revokeObjectURL(B.photoUrl);
            B.photo = r.photo; B.photoUrl = URL.createObjectURL(blob); B.msg = t("bcPhotoOk"); B.bad = false; done();
          }, function () { done(t("netErr")); });
      }, "image/jpeg", 0.88);
    };
    img.src = src;
  }
