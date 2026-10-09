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
  /* links always open the root form page (v608: also when shared from a /<lang>/ page); the language travels in lg= */
  const base = () => (KC.i18n.pageLang ? new URL("../", location.href).href : location.origin + location.pathname) + "#";

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


  /* the "atlas" frame around the QR code (v586, owner): a double border with degree ticks, a star in each
     corner and the site name. It lies outside the white quiet zone, so the code itself is untouched. */
  function qrFrame(qr) {
    const W = 312, spark = (x, y, r) => "M" + x + " " + (y - r) + "Q" + x + " " + y + " " + (x + r) + " " + y + "Q" + x + " " + y + " " + x + " " + (y + r) + "Q" + x + " " + y + " " + (x - r) + " " + y + "Q" + x + " " + y + " " + x + " " + (y - r) + "Z";
    let g = '<rect x="6" y="6" width="' + (W - 12) + '" height="' + (W - 12) + '" rx="16" fill="none" stroke="var(--accent)" stroke-width="1.4"/>'
      + '<rect x="12" y="12" width="' + (W - 24) + '" height="' + (W - 24) + '" rx="11" fill="none" stroke="var(--ink-line)" stroke-width="1"/>';
    for (let p = 34; p <= W - 34; p += 8) { const L = (p - 34) % 40 === 0 ? 5 : 2.5;
      g += '<path d="M' + p + " 12v" + L + "M" + p + " " + (W - 12) + "v-" + L + "M12 " + p + "h" + L + "M" + (W - 12) + " " + p + "h-" + L + '" stroke="var(--ink-line)" stroke-width="1"/>'; }
    [[18, 18], [W - 18, 18], [18, W - 18], [W - 18, W - 18]].forEach(([a, b], i) => { g += '<path d="' + spark(a, b, i === 1 ? 7 : 5) + '" fill="var(--star)"/>'; });
    g += '<rect x="' + (W / 2 - 56) + '" y="' + (W - 20) + '" width="112" height="16" rx="8" fill="var(--panel)"/>'
      + '<text x="' + (W / 2) + '" y="' + (W - 8) + '" text-anchor="middle" font-family="Fraunces,Georgia,serif" font-size="12" font-weight="600" letter-spacing="1.5" fill="var(--accent)">✦ ' + KC.esc(KC.BRAND) + " ✦</text>";
    qr.classList.add("qr-atlas");
    qr.insertAdjacentHTML("afterbegin", '<svg class="qr-frame" viewBox="0 0 ' + W + " " + W + '" width="' + W + '" height="' + W + '" aria-hidden="true">' + g + "</svg>");
  }

  /* v600: how many answers the finished link carries (what the recipient will get — the applied template
     included); an empty template link (no answers by design) shows no count */
  function showCount(link, noCount) {
    const el = KC.$("shareCount"); el.hidden = !!noCount; if (noCount) return;
    let n = 0; try { n = Object.keys(KC.codec.decode(link.split("#")[1] || "").items || {}).length; } catch (e) {}
    el.textContent = n ? t("share.count", { n }) : t("share.zero"); el.classList.toggle("zero", !n);
  }
  function show(link, kind, noCount) {
    KC.$("shareLink").value = link;
    KC.$("shareKind").textContent = kind;
    showCount(link, noCount);
    KC.$("sendLink").hidden = !navigator.share;
    const qr = KC.$("qr"); qr.innerHTML = ""; qr.classList.remove("qr-atlas");
    const msg = k => { qr.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center">' + KC.esc(t(k)) + "</div>"; };
    /* v629: the QR library is fetched when a QR is first needed */
    const linkEl = KC.$("shareLink");
    KC.lib("qr").then(() => { if (!qr.isConnected || linkEl.value !== link) return;   /* the window moved on, or the page is gone */
      try { qr.innerHTML = ""; new QRCode(qr, { text: link, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M }); qrFrame(qr); }
      catch (e) { msg("share.qrTooLong"); } }, () => { if (qr.isConnected) msg("share.qrFail"); });
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
    show(base() + KC.codec.encode(st, KC.i18n.lang), t("share.kindTplOnly", { name: T.label(x) || t("unnamed"), n: x.ids.length }), true);
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

  /* v600: "Send…" — the phone's own share menu gets the whole link (no pasting into an address bar, where the
     part after "#" can get lost). Only the url, so messengers do not glue text to it. */
  KC.$("sendLink").addEventListener("click", () => {
    if (!navigator.share) return;
    KC.stats.event("share-send");
    navigator.share({ url: KC.$("shareLink").value }).catch(e => { if (!e || e.name !== "AbortError") KC.toast(t("share.sendFail")); });
  });
  KC.$("copyLink").addEventListener("click", async () => {
    const inp = KC.$("shareLink"); inp.select(); inp.setSelectionRange(0, 99999);
    try { await navigator.clipboard.writeText(inp.value); KC.toast(t("toast.copied")); }
    catch (e) { try { document.execCommand("copy"); KC.toast(t("toast.copied")); } catch (_) { KC.toast(t("toast.copyManual")); } }
  });
})(window.KC);
