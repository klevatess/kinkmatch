/* form/main.js — start-up of index.html: pick the list (link or own), pick the language,
   render, and wire the "opened from a link" banner and the notice after a template link. Loaded last. */
(function (KC) {
  const F = KC.form, t = (k, v) => KC.i18n.t(k, v), S = KC.store;
  KC.initTheme();

  /* 1. whose list: someone's link (#...) or my own saved one */
  let linkLang = null, tplLink = null;
  const hash = location.hash.replace(/^#/, "");
  /* only a list/template link counts; anything else after "#" (e.g. the counter's #toggle-goatcounter)
     opens my own list and is left alone */
  if (hash && /(^|&)(a|n|m|i|ti|fi|k)=/.test(hash)) {
    const d = KC.codec.decode(hash);
    linkLang = d.lang;
    F.linkDamaged = !!d.damaged;
    F.state = S.normalize(d);
    F.viewingShared = true;
    /* TEMPLATE link: handled below, after the language is known (the page then reloads into my list) */
    if (d.tpl && !d.damaged) {
      const known = {}; KC.CATS.forEach(c => c.items.forEach(([, id]) => { known[id] = 1; }));
      const ids = (d.tpl.ids || S.answeredIds(F.state)).filter(id => known[id]);
      if (ids.length) tplLink = { id: d.tpl.id, name: d.tpl.name, ids };
    }
    /* a list filled by a template: remembered in Received with that mark (fi=), applied when opened */
    F.sharedBy = d.by || (d.tpl ? { id: d.tpl.id, name: d.tpl.name } : null);
    F.sharedCode = KC.codec.encode(Object.assign({}, F.state, { by: F.sharedBy }), linkLang);
    /* favourites of this list live on this device under its id (or its content) */
    if (!d.damaged) F.favKey = S.favs.keyOf(F.sharedCode);
    history.replaceState(null, "", location.pathname + location.search);
  } else {
    F.state = S.loadOwn();
    /* first run after update: an existing filled-in list goes into My lists */
    if (S.mine.active() === null && !S.isEmpty(F.state)) S.mine.sync(F.state);
    /* lists from before list ids existed get one now */
    if (!F.state.uid && !S.isEmpty(F.state)) F.saveNow();
  }

  /* a link pasted into an already open tab only changes the #part: the browser does not
     reload, so nothing would happen. Reload to open it properly. */
  window.addEventListener("hashchange", () => { if (location.hash.length > 1) location.reload(); });

  /* 2. language: link's language wins, then saved choice, then browser */
  KC.i18n.set(KC.i18n.detect(linkLang));

  /* 2a. template link: the template goes to Received → Templates, the sender's list (if the link carries one)
     to Received, and the page opens MY list by this template, empty or with my earlier answers. */
  if (tplLink) {
    const notice = { tpl: S.tpl.addReceived(tplLink.id, tplLink.name, tplLink.ids).status };
    /* the link may carry the sender's answers (with answers = template, or a whole template + answers) */
    if (Object.keys(F.state.items).length) {
      const r = S.received.add(F.sharedCode, F.state.name);
      if (r.status !== "own") { notice.sender = r.status; notice.senderName = F.state.name; notice.rec = r.item && r.item.id; }
    }
    KC.stats.event("open-template");
    F.openByTemplate({ id: tplLink.id, name: tplLink.name, ids: tplLink.ids }, notice);
    return;
  }

  KC.i18n.mountSwitcher(() => { F.renderAll(); F.renderNotice(); });
  F.initTpl();

  /* 3. draw */
  F.renderAll();
  /* answers to items that no longer exist (removed from the list): not shown, not in links */
  const known = {}; KC.CATS.forEach(c => c.items.forEach(([, id]) => known[id] = 1));
  const orphan = Object.keys(F.state.items).filter(id => !known[id]);
  if (orphan.length) console.info("[kinkcheck] answers to removed items (not shown, not shared):", orphan);
  /* stale language file on the server shows up here (items fall back to English) */
  const miss = KC.i18n.missing();
  if (miss.length) console.warn("[kinkcheck] js/lang/" + KC.i18n.lang + ".practices.js lacks " + miss.length + " items (outdated file?):", miss);

  /* 4. opened from a link: remember it under "Received", show banner */
  if (F.viewingShared) {
    /* a damaged link shows wrong answers: warn, never store it */
    F.receivedResult = F.linkDamaged ? { status: "damaged" } : S.received.add(F.sharedCode, F.state.name);
    KC.stats.event("open-link");
    F.renderBanner();
    KC.$("sharedBanner").style.display = "block";
    if (F.linkDamaged) { ["bannerCmp", "bannerKeep", "bannerSaveAs", "bannerTpl"].forEach(id => KC.$(id).hidden = true); KC.$("sharedBanner").classList.add("damaged"); }
  }

  /* 5. notice after a template link / "Fill in" (the page was reloaded into my list) */
  try { F.notice = JSON.parse(sessionStorage.getItem("kcNotice") || "null"); sessionStorage.removeItem("kcNotice"); } catch (e) { F.notice = null; }
  F.renderNotice = function () {
    const n = F.notice, box = KC.$("noticeBar"); box.hidden = !n || F.viewingShared; if (box.hidden) return;
    const esc = KC.esc, name = esc(n.name || t("unnamed")), parts = [];
    if (n.tpl) {
      const ts = { added: "banner.tplSaved", exists: "banner.tplExists", updated: "banner.tplUpdated", own: "banner.tplOwn" }[n.tpl];
      parts.push(t("notice.tpl_html", { name, n: n.n }) + (ts ? KC.i18n.sep() + t(ts) : ""));
    }
    parts.push(t(n.fill === "reuse" ? "notice.fillReuse_html" : n.fill === "same" ? "notice.fillSame_html" : "notice.fillNew_html", { name }));
    if (n.fill === "new" && n.kept) parts.push(t("notice.kept", { n: n.kept }));
    if (n.sender) parts.push(t(n.sender === "added" ? "notice.senderSaved" : "notice.senderExists", { name: esc(n.senderName || t("unnamed")) }));
    KC.$("noticeText").innerHTML = parts.join(KC.i18n.sep());
    KC.$("noticeOpen").hidden = !n.rec;
  };
  F.renderNotice();
  KC.$("noticeOk").addEventListener("click", () => { F.notice = null; KC.$("noticeBar").hidden = true; });
  KC.$("noticeOpen").addEventListener("click", () => {
    const x = F.notice && S.received.list().find(r => r.id === F.notice.rec); if (!x) return;
    location.hash = KC.codec.extract(S.received.asListCode(x.code)); location.reload();
  });

  KC.$("bannerOwn").addEventListener("click", () => { location.href = location.pathname; });
  KC.$("bannerKeep").addEventListener("click", () => {
    /* becomes a new own list; the previous one stays in My lists.
       Favourites made while viewing it and the template it was created by come along. */
    const favs = F.favList();
    F.viewingShared = false; KC.$("sharedBanner").style.display = "none";
    if (favs.length) F.state.fav = favs;
    if (F.sharedBy) F.state.template = { id: F.sharedBy.id, name: F.sharedBy.name };
    S.mine.setActive(""); F.state.uid = S.newUid(); F.saveNow(); KC.toast(t("toast.keep"));
    F.renderTplUI(); F.applySearch(); F.updateProgress();
  });
  /* someone's list shown by one of my templates: open the template list in the header */
  KC.$("bannerTpl").addEventListener("click", () => {
    const sel = KC.$("tplSel");
    if (sel.hidden || sel.options.length <= 1) { KC.toast(t("toast.noTpl")); return; }
    try { sel.focus(); sel.showPicker(); } catch (e) {}
  });
  KC.$("bannerSaveAs").addEventListener("click", () => {
    const nm = prompt(t("prompt.listName"), F.state.name || ""); if (nm === null) return;
    const item = S.received.saveAs(F.sharedCode, nm);
    F.receivedResult = { status: "exists", item }; F.renderBanner();
    KC.toast(KC.i18n.t("toast.savedAs", { name: item.name || t("unnamed") }));
  });
  KC.$("bannerCmp").addEventListener("click", () => {
    F.startCompare(S.ownCode(), KC.codec.encode(F.shown(), KC.i18n.lang), t("label.mine"), F.state.name || t("label.this"));
  });

  /* modules that need the page fully drawn first (e.g. the "moved from the old site" question) */
  (F.onReady || []).forEach(f => { try { f(); } catch (e) { console.error(e); } });
})(window.KC);
