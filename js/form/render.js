/* form/render.js — builds the form DOM from data + current language, and paints state onto it.
   Everything here can be re-run at any time (language switch calls F.renderAll()). */
(function (KC) {
  const F = KC.form = { state: KC.store.blank(), viewingShared: false,
    viewTpl: null,   /* template applied to the page now, {id, name, ids}: a view choice, never stored */
    sharedBy: null,  /* someone's list: {id, name} of the template it was filled by (fi= in its link) */
    favKey: null };  /* someone's list: key of its favourites in KC.store.favs */
  const t = (k, v) => KC.i18n.t(k, v), esc = KC.esc;
  F.SCALE = ["limit", "maybe", "yes", "love"];
  /* v613: the open list is an extended one (two roles per practice, core/ext.js) */
  F.isExt = () => KC.ext.isExt(F.state);
  /* the answer a filter looks at: a plain list's answer; an extended list's answer in the role picked in the
     header ("Только Верх / Низ"), with both roles the stronger one (Love > Yes > Maybe > No) */
  F.roleView = () => (F.isExt() && KC.$("roleView") ? KC.$("roleView").value : "both");
  F.answerOf = id => {
    const x = F.state.items[id]; if (!x) return null;
    if (!F.isExt()) return x.interest || null;
    const r = F.roleView(); if (r === "t" || r === "b") return x[r] || null;
    const RK = KC.match.RANK; return [x.t, x.b].filter(Boolean).sort((a, b) => RK[a] - RK[b])[0] || null;
  };
  const scaleEl = () => { const scale = KC.el("div", "scale"); F.SCALE.forEach(v => { const b = KC.el("button", null, t("scale." + v)); b.type = "button"; b.dataset.v = v; scale.appendChild(b); }); return scale; };
  /* v613: the two rows of an extended practice: "↑ Верх" and "↓ Низ", each with its answers and "✦ Хочу" */
  function extRows() {
    const box = KC.el("div", "ext-rows");
    KC.ext.R.forEach(r => {
      const row = KC.el("div", "ext-row"); row.dataset.r = r;
      row.appendChild(KC.el("span", "rl", t("ext.row." + r)));
      row.appendChild(scaleEl());
      const w = KC.el("button", "want", t("ext.want")); w.type = "button"; w.dataset.act = "want"; w.setAttribute("aria-pressed", "false"); w.disabled = true;
      row.appendChild(w); box.appendChild(row);
    });
    return box;
  }
  /* paint one practice of an extended list */
  F.paintExt = function (row, x) {
    row.querySelectorAll(".ext-row").forEach(er => {
      const r = er.dataset.r, v = x && x[r], on = !!(x && x[r + "w"]);
      er.querySelectorAll(".scale button").forEach(b => b.classList.toggle("sel", b.dataset.v === v));
      const w = er.querySelector(".want"); w.disabled = !KC.ext.WANTS[v]; w.classList.toggle("on", on); w.setAttribute("aria-pressed", on ? "true" : "false");
    });
  };

  /* ---- templates. Two different things:
     bound   = the template a list was CREATED by (own list: state.template; someone's list: F.sharedBy).
               It is part of the list and is applied every time the list opens, while that template exists here.
     applied = F.viewTpl, what the page shows now. The Filters panel and the note above the list only change
               this view; they never change what the list was created by.
     Items outside the applied template are hidden and left out of links, PDF and compare; answers stay. ---- */
  F.tpl = () => F.viewTpl || null;
  F.bound = () => (F.viewingShared ? F.sharedBy : F.state.template) || null;
  /* on opening a list: apply the template it was created by (if it still exists here) */
  F.initTpl = () => { F.viewTpl = KC.store.tpl.resolve(F.bound()); };
  let tplSrc = null, tplMap = null;
  F.tplSet = () => { const tp = F.tpl(); if (!tp) return null; if (tplSrc !== tp) { tplSrc = tp; tplMap = {}; tp.ids.forEach(id => { tplMap[id] = 1; }); } return tplMap; };
  /* the list as it leaves the page: only the template's answers */
  F.shown = () => { const tp = F.tpl(); return tp ? KC.store.trim(F.state, tp.ids) : F.state; };
  /* apply a template to the view: tp {id, name, ids} or null. Not stored. */
  F.setTpl = function (tp) {
    F.viewTpl = tp || null;
    F.renderTplUI(); F.applySearch(); F.updateProgress();
  };

  /* Fill in by a template (a template link, or "Fill in" in the template lists).
     tp = {id, name, ids}. Opens MY list created by this template: the current one if it is, else the newest in
     My lists, else a NEW list that takes my answers to the template's items (and name, profile, ♥) from the list
     I have open, so nothing has to be answered twice. The list I had open stays in My lists untouched.
     notice = what to tell after the page reloads (form/main.js shows it). */
  F.openByTemplate = function (tp, notice) {
    if (!F.viewingShared) F.saveNow();
    const S = KC.store, M = S.mine, own = S.loadOwn(), set = {};
    tp.ids.forEach(id => { set[id] = 1; });
    /* the list I had open must be safe in My lists before another one replaces it (rule: nothing is lost) */
    const act = M.active();
    if (!S.isEmpty(own) && !(act && M.list().some(x => x.id === act))) { if (!own.uid) own.uid = S.newUid(); S.writeOwn(own); M.sync(own); }
    notice = Object.assign({ name: tp.name, n: tp.ids.length }, notice || {});
    if (own.template && own.template.id === tp.id) notice.fill = "same";
    else {
      const x = M.byTpl(tp.id);
      if (x) { const st = S.normalize(x.data); st.onlyMarked = own.onlyMarked; S.writeOwn(st); M.setActive(x.id); notice.fill = "reuse"; }
      else {
        const st = S.blank(); st.name = own.name; st.meta = S.clone(own.meta); st.onlyMarked = own.onlyMarked;
        if (own.ext) st.ext = 1;   /* v613: an extended list stays extended */
        Object.keys(own.items).forEach(id => { if (set[id]) st.items[id] = own.items[id]; });
        const fav = (own.fav || []).filter(id => set[id]); if (fav.length) st.fav = fav;
        st.template = { id: tp.id, name: tp.name }; st.uid = S.newUid();
        S.writeOwn(st); M.setActive(""); M.sync(st);
        notice.fill = "new"; notice.kept = Object.keys(st.items).length;
      }
    }
    try { sessionStorage.setItem("kcNotice", JSON.stringify(notice)); } catch (e) {}
    location.href = KC.i18n.homeUrl(KC.i18n.lang);
  };

  /* ---- favourites (♥): own list -> state.fav; someone's list -> KC.store.favs under F.favKey. Never in links. ---- */
  let memFav = []; /* someone's list without a key (damaged link): kept only while the page is open */
  F.favList = () => F.viewingShared ? (F.favKey ? KC.store.favs.get(F.favKey) : memFav.slice()) : (F.state.fav || []).slice();
  F.setFavs = function (ids) {
    if (F.viewingShared) { if (F.favKey) KC.store.favs.set(F.favKey, ids); else memFav = ids.slice(); }
    else { if (ids.length) F.state.fav = ids.slice(); else delete F.state.fav; F.save(); }
  };
  F.toggleFav = function (id) {
    const a = F.favList(), i = a.indexOf(id);
    if (i >= 0) a.splice(i, 1); else a.push(id);
    F.setFavs(a); return i < 0;
  };
  F.paintFav = function (row, on) {
    const b = row.querySelector('button[data-act="fav"]'); if (!b) return;
    b.textContent = on ? "♥" : "♡"; b.setAttribute("aria-pressed", on ? "true" : "false"); b.classList.toggle("on", on);
    row.classList.toggle("is-fav", on);
  };

  /* save own list (never while viewing someone else's link) */
  let timer = null;
  /* own list -> storage + its "My lists" entry (created on the first real change) */
  function persist() {
    if (!F.state.uid) F.state.uid = KC.store.newUid();
    KC.store.writeOwn(F.state);
    const M = KC.store.mine;
    if (!KC.store.isEmpty(F.state) || M.list().some(x => x.id === M.active())) M.sync(F.state);
  }
  F.save = function () { if (F.viewingShared) return; clearTimeout(timer); timer = setTimeout(() => { timer = null; persist(); }, 200); };
  F.saveNow = function () { if (F.viewingShared) return; clearTimeout(timer); timer = null; persist(); };
  /* leaving the page (reload, link, closing the tab) right after a click: write what is still waiting (B20) */
  const flush = () => { if (timer) F.saveNow(); };
  F.flushSave = flush;   /* write only what is still waiting — does not touch the "last changed" time otherwise */
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

  /* the site open in another tab changed the saved data: take it over here, so this tab never writes its
     older copy back over it (B20). Only the own list is kept in memory; someone's list reads storage directly. */
  window.addEventListener("storage", e => {
    const K = KC.KEYS;
    if (e.key === K.state && !F.viewingShared) {
      clearTimeout(timer); timer = null;
      const was = F.bound() && F.bound().id;
      F.state = KC.store.loadOwn();
      if ((F.bound() && F.bound().id) !== was) F.initTpl(); /* another list was opened there */
      F.hydrate(); F.renderTplUI(); F.applySearch();
    } else if (e.key === K.fav && F.viewingShared) { F.hydrate(); }
    else if (e.key === K.tpl) { F.renderTplUI(); }
  });
  /* leave the current list (it stays in My lists) and start an empty one */
  F.startNew = function () {
    if (!F.viewingShared) F.saveNow();
    KC.store.mine.setActive("");
    const st = KC.store.blank(); st.onlyMarked = F.state.onlyMarked;
    KC.store.writeOwn(st);
    location.href = F.homeUrl();
  };
  /* my own list, reloaded in the language shown now (v600: without ?lang= a visitor who never picked a language
     got the phone's language after "Start a new list") */
  F.homeUrl = () => KC.i18n.homeUrl(KC.i18n.lang);

  /* profile: role block at the top + "About me" */
  F.renderProfile = function () {
    const top = KC.$("roleTop"), about = KC.$("aboutBody");
    top.innerHTML = ""; about.innerHTML = "";
    KC.PROFILE.forEach(f => {
      if (f.hidden) return;
      const field = KC.el("div", "field");
      field.appendChild(KC.el("div", "flabel", KC.i18n.fieldLabel(f.id)));
      const opts = KC.el("div", "opts");
      f.opts.forEach(o => {
        if (!o) return; // retired option
        const b = KC.el("button", "opt", KC.i18n.optLabel(f.id, o));
        b.type = "button"; b.dataset.field = f.id; b.dataset.val = o; b.dataset.type = f.type;
        b.setAttribute("aria-pressed", "false");
        opts.appendChild(b);
      });
      field.appendChild(opts);
      (f.top ? top : about).appendChild(field);
    });
  };

  /* practice list + section jump menu. Non-English pages show the English name as a subtitle. */
  F.renderList = function () {
    const list = KC.$("list"), jump = KC.$("jump");
    list.innerHTML = ""; jump.innerHTML = "";
    const ph = KC.el("option", null, t("jump.ph")); ph.value = ""; jump.appendChild(ph);
    const sub = KC.i18n.lang !== "en", ext = F.isExt();
    document.body.classList.toggle("is-ext", ext);
    let idx = 0;
    KC.CATS.forEach(cat => {
      const opt = KC.el("option", null, KC.i18n.cat(cat.id)); opt.value = "cat-" + cat.id; jump.appendChild(opt);
      const sec = KC.el("section", "cat"); sec.id = "cat-" + cat.id;
      const head = KC.el("div", "cat-head");
      head.appendChild(KC.el("h2", null, KC.i18n.cat(cat.id)));
      if (sub) head.appendChild(KC.el("span", "sub", KC.i18n.cat(cat.id, "en")));
      head.appendChild(KC.el("span", "count", "(" + cat.items.length + ")"));
      sec.appendChild(head);
      cat.items.forEach(([code, id]) => {
        const it = KC.i18n.item(id), en = sub ? KC.i18n.item(id, "en").name : "";
        const row = KC.el("div", "item"); row.dataset.id = id; row.dataset.idx = idx++; /* list order, restored after sorting */
        if (code >= KC.NEW_FROM_CODE) row.dataset.new = "1";
        row.dataset.search = (it.name + " " + en).toLowerCase();
        const name = KC.el("div", "item-name");
        if (code >= KC.NEW_FROM_CODE) { /* green dot in the left margin, level with the name */
          const dot = KC.el("span", "new-dot"); dot.title = t("item.new"); dot.setAttribute("aria-label", t("item.new"));
          name.appendChild(dot);
        }
        name.appendChild(KC.el("span", "main", it.name));
        if (sub) name.appendChild(KC.el("span", "sub", en));
        row.appendChild(name);
        const ctr = KC.el("div", "item-controls");
        const fav = KC.el("button", "mini fav", "♡"); fav.type = "button"; fav.dataset.act = "fav";
        fav.title = t("item.fav"); fav.setAttribute("aria-label", t("item.fav")); fav.setAttribute("aria-pressed", "false");
        ctr.appendChild(fav);
        if (it.desc) {
          const help = KC.el("button", "mini help", "?"); help.type = "button"; help.dataset.act = "help";
          help.setAttribute("aria-label", t("item.help")); ctr.appendChild(help);
        }
        ctr.appendChild(ext ? extRows() : scaleEl()); row.appendChild(ctr);
        if (it.desc) { const d = KC.el("div", "item-desc", it.desc); d.hidden = true; row.appendChild(d); }
        sec.appendChild(row);
      });
      list.appendChild(sec);
    });
  };

  /* paint F.state onto the rendered DOM */
  F.hydrate = function () {
    const st = F.state;
    const nm = KC.$("metaName"); nm.value = st.name || ""; nm.classList.toggle("bad", /[^\x00-\x7F]/.test(nm.value));
    KC.$("onlyMarked").checked = st.onlyMarked !== false;
    document.querySelectorAll(".opt").forEach(b => {
      const cur = st.meta[b.dataset.field];
      const on = b.dataset.type === "multi" ? Array.isArray(cur) && cur.indexOf(b.dataset.val) >= 0 : cur === b.dataset.val;
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const favs = {}, ext = F.isExt(); F.favList().forEach(id => { favs[id] = 1; });
    F.renderExtUI();
    document.querySelectorAll(".item").forEach(row => {
      const s = st.items[row.dataset.id];
      if (ext) F.paintExt(row, s);
      else row.querySelectorAll(".scale button").forEach(b => b.classList.toggle("sel", !!s && b.dataset.v === s.interest));
      F.paintFav(row, !!favs[row.dataset.id]);
    });
    /* someone else's list: unfold "About me" if they filled it, so it is visible */
    if (F.viewingShared && KC.PROFILE.some(f => !f.top && st.meta[f.id])) KC.$("aboutSection").open = true;
    F.updateProgress();
  };

  F.updateProgress = function () {
    /* only items that exist in the list: the number always matches what goes into a link */
    /* with a template: only its items */
    let n = 0, total = 0; const set = F.tplSet();
    KC.CATS.forEach(c => c.items.forEach(([, id]) => { if (set && !set[id]) return; total++; if (KC.ext.answered(F.state, id)) n++; }));
    const pr = KC.$("progress"); pr.textContent = t("progress", { n, total });
    if (F.isExt()) pr.appendChild(KC.el("span", "ext-badge", t("ext.badge")));   /* v613: "Расширенная" next to the count */
  };

  /* search + "Show" filter (all / unanswered / new / answered / Yes-Love-Maybe / only No) + template + "only ♥".
     Evaluated only when one of them changes, so a row you just answered stays in place until then.
     "answered" and "positive" also sort each section by answer (Love, Yes, Maybe, No), as in the PDF. */
  const POSITIVE = { love: 1, yes: 1, maybe: 1 };
  F.applySearch = function () {
    const q = KC.$("search").value.trim().toLowerCase(), view = KC.$("view").value, set = F.tplSet();
    const favs = KC.$("onlyFav").checked ? {} : null; if (favs) F.favList().forEach(id => { favs[id] = 1; });
    const sorted = view === "answered" || view === "positive", RANK = KC.match.RANK;
    const ans = F.answerOf, rv = F.roleView();
    const rank = row => { const a = ans(row.dataset.id); return a ? RANK[a] : 4; };
    let any = false;
    document.querySelectorAll(".cat").forEach(sec => {
      let visible = 0, inTpl = 0;
      const rows = [...sec.querySelectorAll(".item")];
      rows.sort((a, b) => (sorted ? rank(a) - rank(b) : 0) || a.dataset.idx - b.dataset.idx);
      rows.forEach(row => {
        sec.appendChild(row);
        if (rv !== "both" || row.querySelector(".r-hidden")) row.querySelectorAll(".ext-row").forEach(er => er.classList.toggle("r-hidden", rv !== "both" && er.dataset.r !== rv));
        const id = row.dataset.id, a = ans(id);
        let m = !set || !!set[id]; if (m) inTpl++;
        if (m && q) m = row.dataset.search.indexOf(q) >= 0;
        if (m && view === "unanswered") m = !a;
        if (m && view === "new") m = row.dataset.new === "1";
        if (m && view === "answered") m = !!a;
        if (m && view === "positive") m = !!POSITIVE[a];
        if (m && view === "no") m = a === "limit";   /* v601 (owner): only the "No" answers, section by section */
        if (m && favs) m = !!favs[id];
        row.classList.toggle("filtered-out", !m); if (m) visible++;
      });
      const cnt = sec.querySelector(".cat-head .count"); if (cnt) cnt.textContent = "(" + inTpl + ")";
      sec.classList.toggle("empty", visible === 0); if (visible) any = true;
    });
    KC.$("noresults").style.display = any ? "none" : "block";
    F.renderFiltDot();
  };

  /* template picker in the filter panel + the note above the list */
  F.renderTplUI = function () {
    const sel = KC.$("tplSel"), tp = F.tpl(), T = KC.store.tpl;
    const opt = (v, label) => '<option value="' + esc(v) + '">' + esc(label) + "</option>";
    const group = (key, a) => a.length ? '<optgroup label="' + esc(t(key)) + '">' + a.map(x => opt(x.tid, T.label(x) || t("unnamed"))).join("") + "</optgroup>" : "";
    /* the header list: "Template…" when none is applied; with one applied it shows its name and offers "✕ No template" */
    sel.innerHTML = opt("", t(tp ? "filt.tplOff" : "filt.tplPh")) + group("filt.tplStart", T.starters()) + group("filt.tplMine", T.own()) + group("filt.tplRec", T.received());
    sel.value = tp ? tp.id : "";
    sel.hidden = !tp && !T.list().length && !T.starters().length; /* nothing to pick yet */
    /* v617: a starter template applied -> its short description under the intro */
    const st = tp && T.starter(tp.id), dsc = KC.$("tplDesc");
    if (dsc) { dsc.hidden = !st; dsc.innerHTML = st ? "<b>" + esc(st.name) + "</b> — " + esc(t("tpl.stDesc." + st.key)) : ""; }
    /* the note above the list: what the list was created by, what is shown now, one button to switch */
    const b = F.bound(), lib = b && T.resolve(b), note = KC.$("tplNote"), btn = KC.$("tplAct");
    const known = {}; KC.CATS.forEach(c => c.items.forEach(([, id]) => { known[id] = 1; }));
    const nm = x => esc((x && x.name) || t("unnamed")), cnt = x => x.ids.filter(id => known[id]).length;
    let html = "", act = "";
    if (b && tp && tp.id === b.id) { html = t("tpl.noteBound_html", { name: nm(tp), n: cnt(tp) }); act = "all"; }
    else if (tp) { html = (b ? t(lib ? "tpl.noteBoundOff_html" : "tpl.noteGone_html", { name: nm(b) }) + KC.i18n.sep() : "") + t("tpl.noteView_html", { name: nm(tp), n: cnt(tp) }); act = lib ? "bound" : "off"; }
    else if (b) { html = t(lib ? "tpl.noteBoundOff_html" : "tpl.noteGone_html", { name: nm(b) }) + KC.i18n.sep() + t("tpl.allShown"); act = lib ? "bound" : ""; }
    note.hidden = !html;
    KC.$("tplNoteText").innerHTML = html;
    btn.hidden = !act; btn.dataset.act = act;
    btn.textContent = act === "all" ? t("tpl.showAll") : act === "bound" ? t("tpl.showBound") : t("tpl.off");
    F.renderFiltDot();
  };
  /* header lists and ♥ are highlighted while they filter something */
  F.renderFiltDot = function () {
    KC.$("tplSel").classList.toggle("on", !!F.tpl());
    KC.$("view").classList.toggle("on", KC.$("view").value !== "all");
    KC.$("roleView").classList.toggle("on", F.roleView() !== "both");
    KC.$("onlyFav").closest(".fav-toggle").classList.toggle("on", KC.$("onlyFav").checked);
  };

  /* banner for a list opened from a link: says what happened with "Received" */
  F.renderBanner = function () {
    const r = F.receivedResult || {}, name = r.item && r.item.name;
    const status = r.status === "own" ? t("banner.isOwn")
      : r.status === "exists" ? (name ? t("banner.exists", { name: KC.esc(name) }) : t("banner.existsUnnamed"))
      : r.status === "updated" ? (name ? t("banner.updated", { name: KC.esc(name) }) : t("banner.updatedUnnamed"))
      : r.status === "added" ? t("banner.saved") : "";
    KC.$("bannerText").innerHTML = r.status === "damaged" ? t("banner.damaged_html") : t("banner_html", { status });
  };

  /* v613: the header switch "☐ Расширенная", the role filter, the note and the button in the role block */
  F.renderExtUI = function () {
    const ext = F.isExt(), shared = F.viewingShared, unlocked = !!(KC.FEATURES && KC.FEATURES.ext);   /* v621: locked = buttons hidden */
    KC.$("extToggle").checked = ext;
    KC.$("extToggleBox").hidden = shared || (!unlocked && !ext);   /* someone's list: shown as it is, nothing to switch */
    KC.$("roleView").hidden = !ext;
    KC.$("extNote").hidden = !ext;
    KC.$("roleTop").hidden = ext;                    /* an extended list has both roles: no role to pick */
    KC.$("extMake").hidden = ext || shared || !unlocked;
  };

  F.renderAll = function () {
    KC.i18n.apply(document);
    if (F.viewingShared) F.renderBanner();
    KC.$("compareBtn").href = KC.i18n.root() + "compare.html?lang=" + KC.i18n.lang;
    F.renderProfile(); F.renderList(); F.hydrate(); F.renderTplUI(); F.applySearch();
  };
})(window.KC);
