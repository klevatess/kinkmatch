/* form/library.js — the device-local lists: "Received" (other people's links + received templates)
   and "My lists" (several own lists, stored in full + my templates + saved comparisons). Also the hand-off to compare.html. */
(function (KC) {
  const F = KC.form, t = (k, v) => KC.i18n.t(k, v), R = KC.store.received, M = KC.store.mine, T = KC.store.tpl;

  const fmtDate = ts => { const d = new Date(ts), L = KC.i18n.locale(); return d.toLocaleDateString(L) + " " + d.toLocaleTimeString(L, { hour: "2-digit", minute: "2-digit" }); };

  /* open compare.html with both codes pre-filled */
  F.startCompare = function (aCode, bCode, aName, bName) {
    try {
      sessionStorage.setItem("cmpA", aCode || ""); sessionStorage.setItem("cmpB", bCode || "");
      sessionStorage.setItem("cmpAName", aName || ""); sessionStorage.setItem("cmpBName", bName || "");
    } catch (e) {}
    location.href = "compare.html?lang=" + KC.i18n.lang;
  };

  /* acts: array, or function(item) -> array; label: function(item) -> name; extra: function(item) -> text before the date */
  function rows(list, acts, label, badge, extra, cls) {
    return list.map(x => '<div class="saved-row' + (cls ? " " + cls : "") + (badge && badge(x) ? " current" : "") + '" data-id="' + KC.esc(x.id) + '"><div class="meta"><b>' + KC.esc(label(x) || t("unnamed")) + "</b>"
      + (badge && badge(x) ? '<span class="cur-badge">' + KC.esc(t("mine.current")) + "</span>" : "")
      + "<span>" + (extra && extra(x) ? KC.esc(extra(x)) + " · " : "") + fmtDate(x.ts) + "</span></div>"
      + '<div class="acts">' + (typeof acts === "function" ? acts(x) : acts).map(a => '<button class="btn ghost mini" data-act="' + a + '"' + (a === "del" ? ' title="' + KC.esc(t("act.delete")) + '">✕' : ">" + KC.esc(t("act." + a))) + "</button>").join("") + "</div></div>").join("");
  }
  const empty = key => '<div style="color:var(--muted);font-size:13px;padding:8px 0">' + KC.esc(t(key)) + "</div>";
  const rename = (item, save, cur) => { const nn = prompt(t("prompt.listName"), cur || ""); if (nn !== null) { item.name = nn.trim(); save(); } };

  /* "by template «X»" under lists created by a template; the template may be gone from this device */
  const byTpl = (ref, gone) => t(gone, { name: (T.byTid(ref.id) ? T.label(T.byTid(ref.id)) : ref.name) || t("unnamed") });
  const markOf = (ref, goneKey) => ref ? byTpl(ref, T.byTid(ref.id) ? "list.byTpl" : goneKey) : "";
  const recTpl = x => { try { const d = KC.codec.decode(x.code); return markOf(d.by || d.tpl, "list.byTplMissing"); } catch (e) { return ""; } };
  const mineTpl = x => markOf(x.data && x.data.template, "list.byTplGone");
  const tplCount = x => t("tpl.count", { n: x.ids.length });
  const TPL_ACTS = ["share", "use", "rename", "del"];

  /* templates: share it as it is (no answers), fill in by it, rename, delete.
     Lists created by a deleted template keep saying so, but open with all items. */
  function tplClick(e, own, redraw, closeModal) {
    const btn = e.target.closest("button[data-act]"); if (!btn) return;
    const id = btn.closest(".saved-row").dataset.id, a = T.list(), item = a.find(x => x.id === id); if (!item) return;
    switch (btn.dataset.act) {
      case "share": closeModal(); F.shareTemplate(item); break;
      case "use": closeModal(); F.openByTemplate(T.use(item), { fillOnly: 1 }); break;
      case "rename": {
        /* my template's name travels in links: Latin only; a received one keeps its link name, the label is mine */
        let nn = T.label(item);
        for (;;) {
          nn = prompt(t(own ? "prompt.tplNameLatin" : "prompt.tplName"), nn); if (nn === null || !nn.trim()) return;
          if (!own || F.tplNameOk(nn)) break;
          alert(t("tplShare.badName"));
        }
        if (own) item.name = nn.trim(); else item.label = nn.trim();
        T.write(a); redraw(); F.renderTplUI(); break;
      }
      case "del": if (!confirm(t("confirm.tplDel", { name: T.label(item) || t("unnamed") }))) return;
        T.write(a.filter(x => x.id !== id)); redraw(); F.renderTplUI(); break;
    }
  }

  /* ---- Received ---- */
  const recModal = KC.modal("savedOverlay", "savedClose");
  function drawReceived() {
    const a = R.list(); KC.$("savedList").innerHTML = a.length ? rows(a, ["open", "rename", "compare", "del"], x => x.name, null, recTpl) : empty("saved.empty");
    const tl = T.received(); KC.$("savedTplList").innerHTML = tl.length ? rows(tl, TPL_ACTS, T.label, null, tplCount, "tpl-row") : empty("saved.tplEmpty");
  }
  KC.$("savedTplList").addEventListener("click", e => tplClick(e, false, drawReceived, recModal.close));
  KC.$("savedBtn").addEventListener("click", () => { drawReceived(); recModal.open(); });
  KC.$("savedList").addEventListener("click", e => {
    const btn = e.target.closest("button[data-act]"); if (!btn) return;
    const id = btn.closest(".saved-row").dataset.id, a = R.list(), item = a.find(x => x.id === id); if (!item) return;
    switch (btn.dataset.act) {
      case "open": location.hash = KC.codec.extract(R.asListCode(item.code)); location.reload(); break;
      case "rename": rename(item, () => { R.write(a); drawReceived(); }, item.name); break;
      case "compare": F.startCompare(KC.store.ownCode(), item.code, t("label.mine"), item.name || t("label.received")); break;
      case "del": R.write(a.filter(x => x.id !== id)); drawReceived(); break;
    }
  });

  /* ---- My lists ---- */
  const mineModal = KC.modal("mineOverlay", "mineClose");
  const isCurrent = x => !F.viewingShared && x.id === M.active();
  function drawMine() {
    const a = M.list();
    KC.$("mineList").innerHTML = a.length ? rows(a, x => isCurrent(x) ? ["rename", "del"] : ["load", "rename", "del"], M.label, isCurrent, mineTpl) : empty("mine.empty");
    const tl = T.own(); KC.$("mineTplList").innerHTML = tl.length ? rows(tl, TPL_ACTS, T.label, null, tplCount, "tpl-row") : empty("mine.tplEmpty");
    KC.$("mineTplSave").hidden = F.viewingShared; /* templates are made from my own list */
    const cl = KC.store.cmp.list();
    KC.$("mineCmpList").innerHTML = cl.length ? rows(cl, ["open", "rename", "del"], KC.store.cmp.label, null, x => t("cmp.nPeople", { n: x.parts.length }), "cmp-row") : empty("mine.cmpEmpty");
  }
  /* saved comparisons: open on compare.html (with the newest versions of the lists), rename, delete */
  KC.$("mineCmpList").addEventListener("click", e => {
    const btn = e.target.closest("button[data-act]"); if (!btn) return;
    const C = KC.store.cmp, id = btn.closest(".saved-row").dataset.id, a = C.list(), item = a.find(x => x.id === id); if (!item) return;
    switch (btn.dataset.act) {
      case "open": F.saveNow(); try { sessionStorage.setItem("cmpOpen", id); } catch (err) {} location.href = "compare.html?lang=" + KC.i18n.lang; break;
      case "rename": { const nn = prompt(t("prompt.cmpName"), C.label(item)); if (nn !== null && nn.trim()) { item.name = nn.trim(); C.write(a); drawMine(); } break; }
      case "del": if (!confirm(t("confirm.cmpDel", { name: C.label(item) || t("unnamed") }))) return;
        C.write(a.filter(x => x.id !== id)); drawMine(); break;
    }
  });
  /* "Save the current list as a template": the template + a copy of the list marked as created by it */
  KC.$("mineTplSave").addEventListener("click", () => {
    if (!F.templateIds().length) { KC.toast(t("tplShare.empty")); return; }
    let nm = "";
    for (;;) {
      nm = prompt(t("prompt.tplNameLatin"), nm); if (nm === null || !nm.trim()) return;
      if (F.tplNameOk(nm)) break;
      alert(t("tplShare.badName"));
    }
    F.saveAsTemplate(nm.trim()); drawMine();
  });
  KC.$("mineTplList").addEventListener("click", e => tplClick(e, true, drawMine, mineModal.close));
  KC.$("mineBtn").addEventListener("click", () => { F.saveNow(); drawMine(); mineModal.open(); });
  KC.$("mineNew").addEventListener("click", () => F.startNew());
  KC.$("mineSaveNew").addEventListener("click", () => {
    const nm = prompt(t("prompt.listName"), F.state.name || ""); if (nm === null) return;
    const copy = KC.store.clone(F.state); copy.uid = KC.store.newUid(); /* a copy is a separate list */
    const a = M.list(); a.unshift({ id: KC.store.newEntryId("m"), name: nm.trim(), data: copy, ts: Date.now() });
    M.write(a); drawMine(); KC.toast(t("toast.saved"));
  });
  /* backup to / restore from a file */
  KC.$("backupSave").addEventListener("click", () => {
    F.saveNow();
    const blob = new Blob([JSON.stringify(KC.store.exportAll(), null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "kinkcheck-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    KC.toast(t("toast.backupSaved"));
  });
  KC.$("backupLoad").addEventListener("click", () => KC.$("backupFile").click());
  KC.$("backupFile").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let res = null; try { res = KC.store.importAll(JSON.parse(r.result)); } catch (err) {}
      e.target.value = "";
      if (!res) { KC.toast(t("toast.backupBad")); return; }
      KC.toast(KC.i18n.t(res.templates ? "toast.backupLoadedTpl" : "toast.backupLoaded", res));
      setTimeout(() => { location.href = location.pathname; }, 900);
    };
    r.readAsText(f);
  });

  KC.$("mineList").addEventListener("click", e => {
    const btn = e.target.closest("button[data-act]"); if (!btn) return;
    const id = btn.closest(".saved-row").dataset.id, a = M.list(), item = a.find(x => x.id === id); if (!item) return;
    switch (btn.dataset.act) {
      case "load": {
        F.saveNow(); // current list is safe in its own entry
        const st = KC.store.normalize(item.data); st.onlyMarked = F.state.onlyMarked;
        KC.store.writeOwn(st); M.setActive(item.id); location.href = location.pathname; break;
      }
      case "rename": rename(item, () => { M.write(a); drawMine(); }, M.label(item)); break;
      case "del": M.write(a.filter(x => x.id !== id)); if (id === M.active()) M.setActive(""); drawMine(); break;
    }
  });
})(window.KC);
