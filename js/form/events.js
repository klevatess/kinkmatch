/* form/events.js — user input on the form. Handlers are attached once to stable containers,
   so re-rendering (language switch) never needs re-wiring. */
(function (KC) {
  const F = KC.form, t = (k, v) => KC.i18n.t(k, v);

  /* answer buttons + "?" hints */
  KC.$("list").addEventListener("click", e => {
    const btn = e.target.closest("button"); const row = e.target.closest(".item"); if (!btn || !row) return;
    if (btn.dataset.act === "fav") { F.paintFav(row, F.toggleFav(row.dataset.id)); return; }
    if (btn.dataset.act === "help") {
      const d = row.querySelector(".item-desc"); if (d) { d.hidden = !d.hidden; btn.classList.toggle("on", !d.hidden); }
      return;
    }
    const er = btn.closest(".ext-row");
    if (er) {   /* v613: an extended list — the answer or "✦ Хочу" of one role */
      const id = row.dataset.id, r = er.dataset.r, x = Object.assign({}, F.state.items[id] || {});
      if (btn.dataset.act === "want") { if (!KC.ext.WANTS[x[r]]) return; if (x[r + "w"]) delete x[r + "w"]; else x[r + "w"] = 1; }
      else if (btn.dataset.v) { if (x[r] === btn.dataset.v) delete x[r]; else x[r] = btn.dataset.v; if (!KC.ext.WANTS[x[r]]) delete x[r + "w"]; }
      else return;
      if (x.t || x.b) F.state.items[id] = x; else delete F.state.items[id];
      F.paintExt(row, F.state.items[id]); F.save(); F.updateProgress(); return;
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
  KC.$("roleView").addEventListener("change", F.applySearch);

  /* v613: plain list ⇄ its extended copy. The header switch and "Сделать расширенную" in the role block.
     The two lists are separate entries of My lists that point at each other (st.pair); switching opens the other
     one. No extended copy yet: it is made from this list (answers go to the role the list was filled for; with no
     role in the list, the window asks: Top, Bottom or both). */
  const extModal = KC.modal("extOverlay", "extClose");
  function openList(st, entryId) { KC.store.writeOwn(st); KC.store.mine.setActive(entryId); location.href = F.homeUrl(); }
  function makeExt(role) {
    const S = KC.store, M = S.mine;
    if (!F.state.uid) F.state.uid = S.newUid();
    const ext = KC.ext.fromPlain(F.state, role);
    F.state.pair = ext.uid; F.saveNow();
    if (!M.list().some(x => x.id === M.active())) M.sync(F.state);   /* the plain one is safe in My lists */
    S.writeOwn(ext); M.setActive(""); M.sync(ext);
    location.href = F.homeUrl();
  }
  F.switchExt = function (want) {
    if (F.viewingShared || want === F.isExt()) return;
    F.saveNow();
    const S = KC.store, other = F.state.pair && S.mine.list().find(x => x.data && x.data.uid === F.state.pair);
    if (other) { openList(S.normalize(other.data), other.id); return; }
    if (!want) { KC.toast(t("ext.noPlain")); F.renderExtUI(); return; }
    const role = KC.ext.roleOf(F.state);
    if (role) makeExt(role);
    else if (!Object.keys(F.state.items).length) makeExt("both");   /* nothing answered yet: nothing to place */
    else { F.renderExtUI(); extModal.open(); }
  };
  KC.$("extToggle").addEventListener("change", e => F.switchExt(e.target.checked));
  KC.$("extMake").addEventListener("click", () => F.switchExt(true));
  KC.$("extOverlay").addEventListener("click", e => { const b = e.target.closest("[data-ext-role]"); if (b) { extModal.close(); makeExt(b.dataset.extRole); } });
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

  /* v615 (owner): no "Clear" button any more — a new list is started in My lists, where a list can also be deleted */
})(window.KC);
