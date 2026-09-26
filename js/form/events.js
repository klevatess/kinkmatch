/* form/events.js — user input on the form. Handlers are attached once to stable containers,
   so re-rendering (language switch) never needs re-wiring. */
(function (KC) {
  const F = KC.form;

  /* answer buttons + "?" hints */
  KC.$("list").addEventListener("click", e => {
    const btn = e.target.closest("button"); const row = e.target.closest(".item"); if (!btn || !row) return;
    if (btn.dataset.act === "fav") { F.paintFav(row, F.toggleFav(row.dataset.id)); return; }
    if (btn.dataset.act === "help") {
      const d = row.querySelector(".item-desc"); if (d) { d.hidden = !d.hidden; btn.classList.toggle("on", !d.hidden); }
      return;
    }
    const v = btn.dataset.v; if (!v) return;
    const id = row.dataset.id, cur = F.state.items[id] && F.state.items[id].interest;
    if (cur === v) delete F.state.items[id]; else F.state.items[id] = { interest: v };
    row.querySelectorAll(".scale button").forEach(b => b.classList.toggle("sel", b.dataset.v === v && cur !== v));
    F.save(); F.updateProgress();
  });

  /* profile options (role block + About me) */
  function optClick(e) {
    const b = e.target.closest(".opt"); if (!b) return;
    const f = b.dataset.field, v = b.dataset.val, meta = F.state.meta;
    if (b.dataset.type === "multi") {
      let arr = Array.isArray(meta[f]) ? meta[f].slice() : [];
      arr = arr.indexOf(v) >= 0 ? arr.filter(x => x !== v) : arr.concat(v);
      if (arr.length) meta[f] = arr; else delete meta[f];
      b.setAttribute("aria-pressed", arr.indexOf(v) >= 0 ? "true" : "false");
    } else {
      if (meta[f] === v) { delete meta[f]; b.setAttribute("aria-pressed", "false"); }
      else {
        meta[f] = v;
        document.querySelectorAll('.opt[data-field="' + f + '"]').forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      }
    }
    F.save();
  }
  ["roleTop", "aboutBody"].forEach(id => KC.$(id).addEventListener("click", optClick));

  /* name: any characters allowed; non-Latin only gets a soft red hint (link gets longer) */
  const nm = KC.$("metaName");
  nm.addEventListener("input", () => { nm.classList.toggle("bad", /[^\x00-\x7F]/.test(nm.value)); F.state.name = nm.value; F.save(); });

  KC.$("onlyMarked").addEventListener("change", e => { F.state.onlyMarked = e.target.checked; F.save(); });
  KC.$("search").addEventListener("input", F.applySearch);
  KC.$("view").addEventListener("change", F.applySearch);
  /* "Section…": jump, then show "Section…" again — but only once the list is closed (blur). Phone pickers with
     Back/Next/Done stay open after a tap; resetting at once made the tapped option look unselected (B21). */
  KC.$("jump").addEventListener("change", e => {
    const el = e.target.value && KC.$(e.target.value); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  KC.$("jump").addEventListener("blur", e => { e.target.value = ""; });

  KC.$("onlyFav").addEventListener("change", F.applySearch);
  /* template list in the header: only changes what is shown now (never what the list was created by) */
  KC.$("tplSel").addEventListener("change", e => {
    const x = e.target.value && KC.store.tpl.byTid(e.target.value);
    F.setTpl(x ? KC.store.tpl.use(x) : null);
  });
  /* the button in the note above the list */
  KC.$("tplAct").addEventListener("click", e => {
    const act = e.target.dataset.act;
    if (act === "bound") F.setTpl(KC.store.tpl.resolve(F.bound()));
    else F.setTpl(null);
  });

  /* "Clear": a small window — clear the list or only its favourites (also guards against a stray tap) */
  const t = (k, v) => KC.i18n.t(k, v);
  const resetModal = KC.modal("resetOverlay", "resetClose");
  KC.$("resetBtn").addEventListener("click", () => {
    const n = F.favList().length, fb = KC.$("resetFav");
    KC.$("resetText").textContent = t(F.viewingShared ? "reset.pShared" : "confirm.reset");
    fb.textContent = t("reset.fav", { n }); fb.disabled = !n;
    resetModal.open();
  });
  KC.$("resetList").addEventListener("click", () => {
    resetModal.close();
    if (F.viewingShared) { F.state = KC.store.blank(); KC.$("search").value = ""; F.renderAll(); KC.toast(t("toast.cleared")); return; }
    F.startNew(); /* current list stays in My lists */
  });
  KC.$("resetFav").addEventListener("click", () => {
    resetModal.close();
    F.setFavs([]); if (!F.viewingShared) F.saveNow();
    F.hydrate(); F.applySearch(); KC.toast(t("toast.favCleared"));
  });
})(window.KC);
