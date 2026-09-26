/* form/migrate.js — the move to the new site address (see core/migrate.js).
   Old build: a bar at the top + a button in My lists: "Move to the new site".
   New build: a link #kcmigrate=… from the old site -> question -> merge -> reload -> result.
   Runs before main.js: it takes the payload out of the address first, so main.js opens my own list. */
(function (KC) {
  const F = KC.form, t = (k, v) => KC.i18n.t(k, v), M = KC.migrate;
  const SKIP = "kcMoveLater", DONE = "kcMoved";
  F.onReady = F.onReady || [];

  /* ---------- old site: send ---------- */
  function go() {
    F.flushSave();                       /* just-typed changes are stored; "last changed" times stay real (the new site keeps its newer edits) */
    KC.stats.event("migrate");
    location.href = M.link();
  }
  if (M.sender()) {
    const bar = KC.$("migrateBar"), mb = KC.$("mineMigrate");
    let later = false; try { later = sessionStorage.getItem(SKIP) === "1"; } catch (e) {}
    bar.hidden = later; mb.hidden = false;
    KC.$("migrateGo").addEventListener("click", go);
    mb.addEventListener("click", go);
    KC.$("migrateLater").addEventListener("click", () => { bar.hidden = true; try { sessionStorage.setItem(SKIP, "1"); } catch (e) {} });
  }

  /* ---------- new site: receive ---------- */
  if (!M.receiver()) return;
  const payload = M.fromHash(location.hash);
  if (payload !== null) history.replaceState(null, "", location.pathname + location.search); /* not a list link */

  const modal = KC.modal("migrateOverlay", "migrateNo");
  function show(text, withYes) {
    KC.$("migrateH").textContent = t("migrate.h");
    KC.$("migrateText").textContent = text;
    KC.$("migrateYes").hidden = !withYes;
    KC.$("migrateNo").textContent = t(withYes ? "cancel" : "notice.ok");
    modal.open();
  }

  F.onReady.push(() => {
    /* after the reload: what was moved */
    let done = null; try { done = JSON.parse(sessionStorage.getItem(DONE) || "null"); sessionStorage.removeItem(DONE); } catch (e) {}
    if (done) {
      const any = done.mine || done.received || done.templates || done.compares;
      show(any ? t("migrate.done", { mine: done.mine || 0, rec: done.received || 0, tpl: done.templates || 0, cmp: done.compares || 0 }) : t("migrate.nothing"), false);
      return;
    }
    if (payload === null) return;
    const r = M.unpack(payload);
    if (!r) { show(t("migrate.bad"), false); return; }
    const c = M.counts(r.backup);
    show(t("migrate.ask", { mine: c.mine, rec: c.rec, tpl: c.tpl, cmp: c.cmp }), true);
    KC.$("migrateYes").onclick = () => {
      F.flushSave();                     /* anything typed here is stored first; times stay real, so a list edited here later is not replaced */
      const res = KC.store.importAll(r.backup, { newer: true });   /* lists edited on the old site after an earlier move are updated */
      if (!res) { show(t("migrate.bad"), false); return; }
      /* language and theme come along unless this browser already chose them here */
      if (r.lang && KC.i18n.usable(r.lang) && !KC.ls.raw(KC.KEYS.lang)) KC.i18n.persist(r.lang);
      const saved = KC.ls.raw(KC.KEYS.lang), lang = saved && KC.i18n.usable(saved) ? saved : KC.i18n.lang;
      if (r.theme && !KC.ls.raw(KC.KEYS.theme)) KC.ls.setRaw(KC.KEYS.theme, r.theme);
      try { sessionStorage.setItem(DONE, JSON.stringify(res)); } catch (e) {}
      KC.stats.event("migrate-done");
      location.replace(location.pathname + "?lang=" + lang);   /* the language chosen here wins, else the old site's */
    };
  });
})(window.KC);
