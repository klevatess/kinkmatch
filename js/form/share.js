/* form/share.js — "Share": link + QR. The link carries the current page language (lg=).
   - Plain link: the list as shown (only the applied template's answers, if one is applied) + the template it
     was created by (fi=), so the recipient sees "by template «X»".
   - "Share as template": the answered items become the template (saved in My templates too); the link also
     carries my answers to them. The recipient gets an empty list by the template to fill in, and my list
     lands in their Received.
   - A saved template shared from the template lists: the template only, no answers (F.shareTemplate).
   - "Save as my template": the template + a copy of this list marked as created by it (F.saveAsTemplate).
   - "Share the current template «X»": the template this list is shown by / was created by, as it is (same id,
     name and every item), with my answers to it — so a received template can be passed on while filling it. */
(function (KC) {
  const F = KC.form, t = (k, v) => KC.i18n.t(k, v), T = KC.store.tpl, S = KC.store;
  const modal = KC.modal("overlay", "overlayClose");
  const base = () => location.origin + location.pathname + "#";

  F.shareLink = () => {
    if (!F.viewingShared && !F.state.uid) F.saveNow(); /* gives the list its id */
    const b = F.bound();
    return base() + KC.codec.encode(Object.assign({}, F.shown(), { by: b ? { id: b.id, name: b.name } : null }), KC.i18n.lang);
  };
  /* ids of a template made from this list: answered items (inside the applied template, if any) */
  F.templateIds = () => S.answeredIds(F.state, F.tpl() && F.tpl().ids);

  /* template names: Latin letters, digits, space and simple punctuation (owner's rule: names travel in links).
     Input is never changed (B1): a wrong character only turns the hint red and blocks saving. */
  const NAME_OK = /^[A-Za-z0-9 .,!?'()+-]+$/;
  F.tplNameOk = v => NAME_OK.test(String(v || "").trim());

  function show(link, kind) {
    KC.$("shareLink").value = link;
    KC.$("shareKind").textContent = kind;
    const qr = KC.$("qr"); qr.innerHTML = "";
    try { new QRCode(qr, { text: link, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M }); }
    catch (e) { qr.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center">' + KC.esc(t("share.qrTooLong")) + "</div>"; }
  }
  function showList() {
    show(F.shareLink(), t("share.kindList"));
    KC.$("shareBack").hidden = true;
  }
  function markName() {
    const inp = KC.$("tplName"), v = inp.value, bad = !!v.trim() && !F.tplNameOk(v);
    inp.classList.toggle("bad", bad); KC.$("tplHint").classList.toggle("warn", bad);
  }

  KC.$("shareBtn").addEventListener("click", () => {
    KC.stats.event("share");
    const tp = F.tpl(), note = KC.$("shareTplNote");
    note.hidden = !tp;
    if (tp) note.textContent = t("share.tplNote", { name: tp.name || t("unnamed"), n: tp.ids.length });
    /* templates are made from your own list */
    KC.$("tplShare").hidden = F.viewingShared;
    KC.$("tplName").classList.remove("bad"); markName();
    /* the template in effect (shown now, else the one the list was created by), if it is saved here */
    const cur = F.viewingShared ? null : (tp && T.byTid(tp.id)) || (F.bound() && T.byTid(F.bound().id));
    const cb = KC.$("tplCurBtn"); cb.hidden = !cur; F.curTpl = cur || null;
    if (cur) cb.textContent = t("tplShare.cur", { name: cur.name || T.label(cur) || t("unnamed") });
    showList();
    modal.open();
  });

  /* a saved template, as it is: same id and name, no answers */
  F.shareTemplate = function (x) {
    const st = S.blank(); st.tpl = { id: x.tid, name: x.name, ids: x.ids };
    KC.$("shareTplNote").hidden = true; KC.$("tplShare").hidden = true; KC.$("shareBack").hidden = true;
    show(base() + KC.codec.encode(st, KC.i18n.lang), t("share.kindTplOnly", { name: T.label(x) || t("unnamed"), n: x.ids.length }));
    modal.open();
  };

  /* name check for both template buttons -> name or null */
  function askName() {
    const inp = KC.$("tplName"), nm = inp.value.trim();
    if (!nm) { inp.classList.add("bad"); KC.toast(t("tplShare.needName")); inp.focus(); return null; }
    if (!F.tplNameOk(nm)) { markName(); KC.toast(t("tplShare.badName")); inp.focus(); return null; }
    if (!F.templateIds().length) { KC.toast(t("tplShare.empty")); return null; }
    return nm;
  }
  KC.$("tplName").addEventListener("input", () => { KC.$("tplName").classList.remove("bad"); markName(); });

  /* -> {status, item} of My templates */
  function saveTpl(nm, ids) {
    if (!F.state.uid) F.saveNow();
    return T.saveOwn(nm, ids, T.tidFor(F.state.uid, nm));
  }
  /* template + a copy of this list created by it (not when that template already has a list here) */
  F.saveAsTemplate = function (nm) {
    const ids = F.templateIds(); if (!ids.length) { KC.toast(t("tplShare.empty")); return null; }
    const res = saveTpl(nm, ids), x = res.item, M = S.mine;
    let copied = false;
    if (!M.byTpl(x.tid)) {
      const set = {}; ids.forEach(id => { set[id] = 1; });
      const c = S.trim(F.state, ids); c.uid = S.newUid(); c.template = { id: x.tid, name: x.name };
      const fav = (F.state.fav || []).filter(id => set[id]); if (fav.length) c.fav = fav; else delete c.fav;
      const a = M.list(); a.unshift({ id: KC.store.newEntryId("m"), name: "", data: c, ts: Date.now() }); M.write(a);
      copied = true;
    }
    KC.toast(t(copied ? "toast.tplSavedList" : res.status === "updated" ? "toast.tplUpdated" : "toast.tplSaved", { name: nm, n: ids.length }));
    F.renderTplUI();
    return res;
  };

  KC.$("tplShareBtn").addEventListener("click", () => {
    const nm = askName(); if (!nm) return;
    const ids = F.templateIds(), x = saveTpl(nm, ids).item;
    const st = S.trim(F.state, ids); st.tpl = { id: x.tid, name: nm };
    show(base() + KC.codec.encode(st, KC.i18n.lang), t("share.kindTpl", { name: nm, n: ids.length }));
    KC.$("shareBack").hidden = false;
    F.renderTplUI();
  });
  KC.$("tplSaveBtn").addEventListener("click", () => { const nm = askName(); if (nm) F.saveAsTemplate(nm); });
  KC.$("tplCurBtn").addEventListener("click", () => {
    const x = F.curTpl; if (!x) return;
    if (!F.state.uid) F.saveNow();
    const st = S.trim(F.state, x.ids); st.tpl = { id: x.tid, name: x.name, ids: x.ids };
    show(base() + KC.codec.encode(st, KC.i18n.lang), t("share.kindTplCur", { name: x.name || t("unnamed"), n: x.ids.length, k: Object.keys(st.items).length }));
    KC.$("shareBack").hidden = false;
  });
  KC.$("shareBack").addEventListener("click", showList);

  KC.$("copyLink").addEventListener("click", async () => {
    const inp = KC.$("shareLink"); inp.select(); inp.setSelectionRange(0, 99999);
    try { await navigator.clipboard.writeText(inp.value); KC.toast(t("toast.copied")); }
    catch (e) { try { document.execCommand("copy"); KC.toast(t("toast.copied")); } catch (_) { KC.toast(t("toast.copyManual")); } }
  });
})(window.KC);
