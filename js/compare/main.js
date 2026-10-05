/* compare/main.js — compare.html.
   2–10 participants. Each has a name, a link/code field and a picker to fill it from lists saved
   on this device (my current list, "My lists", "Received").
   2 participants  -> detailed view: groups + filters "Yes from A/B", "Yes and Maybe from A/B".
   3+ participants -> group view: "Yes/Love from everyone" and a pair table (matches per pair);
                      a number in the table opens the detailed view for that pair.
   Each participant has a role picker ("from the list" / Top / Bottom): a role chosen here replaces the one in the list.
   A comparison of 3+ can be saved (KC.store.cmp) and reopened from the picker at the top or from
   "My lists"; it then takes the newest version of every list on this device.
   v613 — extended lists (two roles, core/ext.js) are compared by their roles, crosswise: a pair of an extended and
   a plain list takes the extended list's role opposite to the plain one (no role in the plain list: its role picker
   asks for one); two extended lists: "Сравниваем: A ↑ · B ↓ | A ↓ · B ↑". In a company an extended list needs a
   role picked. With an extended list in the pair: "✦ Новое вместе" (both marked "Хочу"), the filter
   "✦ Что попробуем?" (one marked "Хочу", the other Может / Да / Обожаю) and the roulette "✦ Попробуем новое?". */
(function (KC) {
  const t = (k, v) => KC.i18n.t(k, v), esc = KC.esc;
  const BADGE = { love: "b-match", yes: "b-good", maybe: "b-maybe", limit: "b-limit" };
  const MAX = 10;
  let LAST = null, FILTER = "all";   /* detailed pair view */
  let GROUP = null, GFILTER = "allYes"; /* group view: [{name, st}] */
  let SEL = null, SELG = null;          /* the planet tapped in the group's solar system (index in GROUP) */
  let PMODE = "any";                    /* pair table: "any" | "role" (only Top + Bottom pairs) */
  let SAVED = null;                     /* the saved comparison on screen: {id, name} */
  let NOTE = null;                      /* after opening a saved one: {updated: [names], gone: [names]} */
  let DIR = "tb";                       /* v613: two extended lists — "tb" = A Top · B Bottom, "bt" = the other way */
  const C = KC.store.cmp;
  /* what is on screen, for the roulette (compare/roulette.js) */
  KC.cmpState = () => ({ pair: LAST, group: LAST ? null : GROUP, pmode: PMODE });
  const rlBtn = tryNew => '<div class="cmp-rl"><button class="btn ghost" type="button" data-act="roulette">' + esc(t("rl.btn")) + "</button>"
    + (tryNew ? '<button class="btn ghost" type="button" data-act="roulette-try">' + esc(t("ext.rlTry")) + "</button>" : "") + "</div>";

  KC.initTheme();
  KC.i18n.set(KC.i18n.detect(null));
  function applyStatic() { KC.i18n.apply(document); KC.$("backLink").href = KC.i18n.lang + "/"; }   /* v608: back to the form page of this language */
  KC.i18n.mountSwitcher(() => { applyStatic(); relabel(); drawPickers(); drawSaved(); if (LAST || GROUP) render(false); });
  applyStatic();

  /* ---------- participants ---------- */
  const box = KC.$("parts");
  const ROLES = ["", "dom", "sub"];   /* "" = the role inside the list; no Switch (a list is filled for one role) */
  const roleOpts = sel => { const v = sel.value; sel.innerHTML = ROLES.map(r => '<option value="' + r + '">' + esc(r ? t("cmp.roleSet", { role: t("role.short." + r) }) : t("cmp.roleList")) + "</option>").join(""); sel.value = v; };
  function addPart(name, code, role) {
    if (box.children.length >= MAX) { KC.toast(t("cmp.maxN")); return null; }
    const i = box.children.length;
    const col = KC.el("div", "cmp-col");
    col.innerHTML = '<div class="cmp-col-head"><input class="cmp-name" autocomplete="off"><button class="btn ghost mini" type="button" data-act="rm">✕</button></div>'
      + '<select class="cmp-pick"></select><select class="cmp-role"></select><textarea class="cmp-code"></textarea>';
    const nm = col.querySelector(".cmp-name");
    if (i < 2) { nm.id = i ? "nameB" : "nameA"; col.querySelector("textarea").id = i ? "codeB" : "codeA"; }
    nm.value = name || ""; col.querySelector("textarea").value = code || "";
    const rs = col.querySelector(".cmp-role"); roleOpts(rs); rs.value = ROLES.indexOf(role) > 0 ? role : "";
    box.appendChild(col); relabel(); drawPickers(col); extNote(col);
    return col;
  }
  function relabel() {
    [...box.children].forEach((col, i) => {
      col.querySelector(".cmp-name").placeholder = t("cmp.person", { n: i + 1 }) + " — " + t("cmp.namePh");
      col.querySelector("textarea").placeholder = t("cmp.codePh");
      const rs = col.querySelector(".cmp-role"); roleOpts(rs); rs.title = t("cmp.roleList");
      if (col.querySelector(".ext-hint")) extNote(col);
      const rm = col.querySelector('[data-act="rm"]'); rm.hidden = box.children.length <= 2; rm.title = t("cmp.remove"); rm.setAttribute("aria-label", t("cmp.remove"));
    });
    KC.$("addPart").hidden = box.children.length >= MAX;
  }
  /* saved lists on this device, for the pickers */
  function sources() {
    const out = [];
    /* a list filled by a template is compared by the template's answers only (as it would be shared) */
    const tplOf = st => st.template ? " — " + t("list.byTpl", { name: st.template.name || t("unnamed") }) : "";
    if (KC.store.hasOwn() && !KC.store.isEmpty(KC.store.loadOwn())) { const o = KC.store.loadOwn(); out.push({ g: "mine", v: "cur", label: t("cmp.pickCurrent") + tplOf(o), name: o.name || t("label.mine"), code: KC.codec.encode(KC.store.forShare(o)) }); }
    KC.store.mine.list().forEach(x => { if (x.id === KC.store.mine.active() || !x.data) return; const st = KC.store.normalize(x.data); out.push({ g: "mine", v: "m:" + x.id, label: (KC.store.mine.label(x) || t("unnamed")) + tplOf(st), name: KC.store.mine.label(x), code: KC.codec.encode(KC.store.forShare(st)) }); });
    KC.store.received.list().forEach(x => out.push({ g: "rec", v: "r:" + x.id, label: x.name || KC.codec.decode(x.code).name || t("unnamed"), name: x.name || KC.codec.decode(x.code).name, code: x.code }));
    return out;
  }
  function drawPickers(only) {
    const src = sources();
    const html = '<option value="">' + esc(t("cmp.pick")) + "</option>"
      + ["mine", "rec"].map(g => { const o = src.filter(s => s.g === g); return o.length ? '<optgroup label="' + esc(t(g === "mine" ? "cmp.pickMine" : "cmp.pickRec")) + '">' + o.map(s => '<option value="' + esc(s.v) + '">' + esc(s.label) + "</option>").join("") + "</optgroup>" : ""; }).join("");
    (only ? [only] : [...box.children]).forEach(col => { const sel = col.querySelector(".cmp-pick"); sel.innerHTML = html; sel.disabled = !src.length; });
  }
  box.addEventListener("change", e => {
    const sel = e.target.closest(".cmp-pick"); if (!sel || !sel.value) return;
    const s = sources().find(x => x.v === sel.value); const col = sel.closest(".cmp-col");
    if (s) { col.querySelector("textarea").value = s.code; col.querySelector(".cmp-name").value = s.name || ""; extNote(col); }
  });
  /* v613: under the role picker of an extended list: "Расширенная анкета — роли Верх и Низ" */
  function extNote(col) {
    let n = col.querySelector(".ext-hint"); const a = new URLSearchParams(KC.codec.extract(col.querySelector("textarea").value)).get("a");
    const on = KC.codec.isExtCode(a);
    if (on && !n) { n = KC.el("div", "role-hint ext-hint"); col.querySelector(".cmp-role").after(n); }
    if (n) { n.hidden = !on; n.textContent = t("ext.note"); }
  }
  box.addEventListener("input", e => { const col = e.target.closest && e.target.closest(".cmp-col"); if (col && e.target.matches("textarea")) extNote(col); });
  /* back to "Fill from saved lists…" only once the list is closed: phone pickers stay open after a tap (B21) */
  box.addEventListener("focusout", e => { const sel = e.target.closest && e.target.closest(".cmp-pick"); if (sel) sel.value = ""; });
  box.addEventListener("click", e => {
    const rm = e.target.closest('[data-act="rm"]'); if (!rm || box.children.length <= 2) return;
    rm.closest(".cmp-col").remove();
    [...box.children].forEach((col, i) => { const nm = col.querySelector(".cmp-name"), ta = col.querySelector("textarea"); nm.removeAttribute("id"); ta.removeAttribute("id"); if (i < 2) { nm.id = i ? "nameB" : "nameA"; ta.id = i ? "codeB" : "codeA"; } });
    relabel();
  });
  KC.$("addPart").addEventListener("click", () => { const c = addPart(); if (c) c.querySelector("textarea").focus(); });

  /* ---------- saved comparisons ---------- */
  function drawSaved() {
    const a = C.list(), sel = KC.$("cmpSaved");
    sel.hidden = !a.length;
    sel.innerHTML = '<option value="">' + esc(t("cmp.savedPick")) + "</option>"
      + a.map(x => '<option value="' + esc(x.id) + '">' + esc(C.label(x) || t("unnamed")) + " (" + x.parts.length + ")</option>").join("");
  }
  function openSaved(id) {
    const e = C.byId(id), parts = e && C.resolve(id); if (!parts) return;
    box.innerHTML = "";
    parts.slice(0, MAX).forEach(p => addPart(p.name, p.code, p.role));
    const who = (p, i) => p.name || KC.codec.decode(p.code).name || t("cmp.person", { n: i + 1 });
    const note = { updated: [], gone: [] };
    parts.forEach((p, i) => { if (p.state !== "same") note[p.state].push(who(p, i)); });
    KC.$("cmpBtn").click();
    SAVED = { id: e.id, name: e.name || "" }; NOTE = note;
    if (GROUP) render(false);
  }
  KC.$("cmpSaved").addEventListener("change", e => { const v = e.target.value; if (v) openSaved(v); });
  /* back to "Open a saved comparison…" once the list is closed (B21) */
  KC.$("cmpSaved").addEventListener("focusout", e => { e.target.value = ""; });
  function saveCurrent() {
    if (!GROUP || GROUP.length < C.MIN) return;
    const def = SAVED ? SAVED.name : GROUP.map(p => p.name).join(", ");
    const nm = prompt(t("prompt.cmpName"), def); if (nm === null) return;
    const r = C.save(nm, GROUP.map(p => ({ name: p.typed, code: p.code, role: p.role })), SAVED && SAVED.id);
    SAVED = { id: r.item.id, name: r.item.name }; drawSaved(); render(false);
    KC.stats.event("compare-saved");
    KC.toast(t(r.status === "updated" ? "toast.cmpUpdated" : "toast.cmpSaved"));
  }

  /* ---------- shared bits ---------- */
  const badge = v => v ? '<span class="badge ' + BADGE[v] + '">' + esc(t("scale." + v)) + "</span>" : '<span class="badge b-one">—</span>';
  const itemName = id => esc(KC.i18n.item(id).name) + (KC.i18n.lang !== "en" ? '<span class="sub">' + esc(KC.i18n.item(id, "en").name) + "</span>" : "");
  /* who: [{name, v}] */
  const rowHTML = (id, who) => {
    const desc = KC.i18n.item(id).desc;
    return '<div class="rrow"><div class="nm">' + itemName(id) + "</div>"
      + (desc ? '<button class="mini help" type="button" data-act="help" aria-label="' + esc(t("item.help")) + '">?</button>' : "")
      + '<div class="who">' + who.map(w => esc(w.name) + ": " + (w.v ? badge(w.v) : "") + (w.w ? '<span class="want-tag">' + esc(t("ext.want")) + "</span>" : w.v ? "" : badge(null))).join(" &nbsp; ") + "</div>"
      + (desc ? '<div class="item-desc" hidden>' + esc(desc) + "</div>" : "") + "</div>";
  };
  const wOf = (st, id) => !!(st.items[id] || {}).w;   /* v613: "✦ Хочу" in a role view of an extended list */
  const pairRow = r => rowHTML(r.id, [{ name: LAST.nA, v: r.a, w: wOf(LAST.A, r.id) }, { name: LAST.nB, v: r.b, w: wOf(LAST.B, r.id) }]);
  /* "✦ Новое вместе": both marked "Хочу" — that says it all, the answer next to it is left out (owner) */
  const newRow = id => rowHTML(id, [{ name: LAST.nA, v: null, w: true }, { name: LAST.nB, v: null, w: true }]);
  const blockOf = (title, dot, sub, body, n) => '<div class="result-group"><h3><span class="dot" style="background:' + dot + '"></span>' + esc(title)
    + ' <span style="font-weight:400;color:var(--muted);font-size:14px">(' + n + ')</span></h3><div class="sub">' + esc(sub) + "</div>" + body + "</div>";
  const block = (title, dot, sub, rows) => !rows.length ? "" : blockOf(title, dot, sub, rows.map(pairRow).join(""), rows.length);
  const note = text => '<div class="result-group"><div class="sub">' + esc(text) + "</div></div>";
  function profileLine(name, st, ext) {
    const bits = [];
    KC.PROFILE.forEach(f => { const v = !f.hidden && st.meta[f.id]; if (v) bits.push(esc(KC.i18n.fieldLabel(f.id)) + ": " + esc((Array.isArray(v) ? v : [v]).map(o => KC.i18n.optLabel(f.id, o)).join(", "))); });
    const tag = ext ? ' <span class="ext-tag">' + esc(t("ext.badge")) + "</span>" : "";
    return bits.length || ext ? '<div class="cmp-profile"><b>' + esc(name) + "</b>" + tag + (bits.length ? " · " + bits.join(" · ") : "") + "</div>" : "";
  }
  /* v613: a pair with extended lists -> the two plain lists compared (role views), or {need: participant} when a
     plain list has no role and the other list is extended. a, b = {name, st, role (picked here)} */
  const arrowOf = r => t("ext.arrow." + r);
  function pairOf(a, b) {
    const X = KC.ext, ea = X.isExt(a.st), eb = X.isExt(b.st);
    let ra = ea && a.role ? X.ofRole(a.role) : null, rb = eb && b.role ? X.ofRole(b.role) : null, dir = false;
    if (ea && eb) { if (!ra && !rb) { ra = DIR === "tb" ? "t" : "b"; rb = X.other(ra); dir = true; } else if (!ra) ra = X.other(rb); else if (!rb) rb = X.other(ra); }
    else if (ea && !ra) { const r = X.ofRole(b.role || X.roleOf(b.st)); if (!r) return { need: b }; ra = X.other(r); }
    else if (eb && !rb) { const r = X.ofRole(a.role || X.roleOf(a.st)); if (!r) return { need: a }; rb = X.other(r); }
    return { A: ra ? X.view(a.st, ra) : a.st, B: rb ? X.view(b.st, rb) : b.st, nA: a.name + (ra ? " " + arrowOf(ra) : ""), nB: b.name + (rb ? " " + arrowOf(rb) : ""),
      ext: { a: ea, b: eb, dir }, raw: { a, b } };
  }
  const dirHTML = () => { const a = LAST.raw.a.name, b = LAST.raw.b.name, btn = (d, txt) => '<button type="button" data-dir="' + d + '"' + (DIR === d ? ' class="on"' : "") + ">" + esc(txt) + "</button>";
    return '<div class="cmp-dir">' + esc(t("ext.dir")) + ' <span class="seg">' + btn("tb", a + " " + arrowOf("t") + " · " + b + " " + arrowOf("b")) + btn("bt", a + " " + arrowOf("b") + " · " + b + " " + arrowOf("t")) + "</span></div>"; };
  /* a plain list without a role next to an extended one: its role picker asks (owner, v613) */
  function askRole(p, other) {
    const sel = p.col.querySelector(".cmp-role"); sel.classList.add("role-need");
    const h = KC.el("div", "role-hint", other ? t("ext.needRole", { name: other }) : t("ext.needRoleGroup")); sel.after(h);
    try { sel.scrollIntoView({ behavior: "smooth", block: "center" }); sel.focus(); } catch (e) {}
    KC.toast(t(other ? "ext.needRoleToast" : "ext.needRoleGroup"));
  }
  const fbtn = (cur, f, label) => '<button class="btn mini' + (cur === f ? " on" : "") + '" data-f="' + f + '">' + esc(label) + "</button>";
  function matches(id) {
    const q = KC.$("cmpSearch").value.trim().toLowerCase(); if (!q) return true;
    return (KC.i18n.item(id).name + " " + KC.i18n.item(id, "en").name).toLowerCase().indexOf(q) >= 0;
  }
  const only = rows => rows.filter(r => matches(r.id));
  const POS = { yes: 1, love: 1 };

  /* ---------- the pictures fold away (v592, owner): closed at first, the page remembers open/closed ----------
     "pair" = paired planets + the pair's constellations, "group" = the company's system. A closed fold is empty:
     its picture is drawn when it is opened (the system's layout is the heaviest part of the page). */
  const folds = () => { const o = KC.ls.get(KC.KEYS.folds, null); return o && typeof o === "object" ? o : {}; };
  /* the group's fold: the solar system, or (DnD mode, v596) the party, or (World of Darkness, v597) the coterie,
     pack, … — the switch sits on top of all of them */
  const foldBody = kind => { if (kind === "pair") return KC.space.pairSVG(LAST.A, LAST.B, LAST.nA, LAST.nB);
    if (!KC.dnd || !KC.wod) return KC.space.groupSVG(GROUP, SEL, GFILTER === "allYM");
    const m = KC.dnd.mode("group");
    return KC.space.modeSwitch("group") + (m === "dnd" ? KC.space.partyHTML(GROUP) : m === "wod" ? KC.space.wodGroupHTML(GROUP)
      : KC.dnd.isWr(m) ? KC.space.modeGroupHTML(GROUP, m) : KC.space.groupSVG(GROUP, SEL, GFILTER === "allYM")); };   /* v610: cult, army, legions */
  const fold = kind => { const on = !!folds()[kind];
    return '<details class="about sp-fold" data-fold="' + kind + '"' + (on ? " open" : "") + "><summary>✦ " + esc(t("sp.fold." + kind)) + '</summary><div class="sp-fold-body">' + (on ? foldBody(kind) : "") + "</div></details>"; };
  KC.$("results").addEventListener("toggle", e => {
    const d = e.target; if (!d.matches || !d.matches("details.sp-fold")) return;
    const o = folds(), kind = d.dataset.fold; o[kind] = d.open; KC.ls.set(KC.KEYS.folds, o);
    const body = d.querySelector(".sp-fold-body");
    if (d.open && !body.innerHTML && (kind === "pair" ? LAST : GROUP)) body.innerHTML = foldBody(kind);
  }, true);   /* "toggle" does not bubble */

  /* ---------- detailed pair view ---------- */
  function renderPair() {
    const searching = !!KC.$("cmpSearch").value.trim();
    /* v601 (owner): the filters sit under the star map, right above the lists (and the search next to them) */
    const X = !!(LAST.ext && (LAST.ext.a || LAST.ext.b));   /* v613: an extended list in the pair */
    if (!X && FILTER === "try") FILTER = "all";
    HEAD = profileLine(LAST.nA, LAST.A, X && LAST.ext.a) + profileLine(LAST.nB, LAST.B, X && LAST.ext.b) + (X && LAST.ext.dir ? dirHTML() : "") + rlBtn(X) + (FILTER === "all" ? fold("pair") : "")
      + '<div class="cmp-filter">' + (LAST.fromGroup ? '<button class="btn mini" data-f="group">' + esc(t("cmp.backGroup")) + "</button>" : "")
      + fbtn(FILTER, "all", t("cmp.all"))
      + fbtn(FILTER, "yesA", t("cmp.yesOf", { who: LAST.nA })) + fbtn(FILTER, "yesB", t("cmp.yesOf", { who: LAST.nB }))
      + fbtn(FILTER, "ymA", t("cmp.yesMaybeOf", { who: LAST.nA })) + fbtn(FILTER, "ymB", t("cmp.yesMaybeOf", { who: LAST.nB }))
      + (X ? fbtn(FILTER, "try", t("ext.fTry")) : "") + "</div>";
    let html = "";
    const ansA = id => (LAST.A.items[id] || {}).interest || null, ansB = id => (LAST.B.items[id] || {}).interest || null;
    if (FILTER === "try") {   /* v613: one of them marked "Хочу", the other Может / Да / Обожаю */
      const rows = [];
      KC.CATS.forEach(c => c.items.forEach(([, id]) => { const a = ansA(id), b = ansB(id);
        if (matches(id) && ((wOf(LAST.A, id) && POSM[b]) || (wOf(LAST.B, id) && POSM[a]))) rows.push({ id, a, b }); }));
      return html + (rows.length ? block(t("ext.tryTitle"), "var(--accent)", t("ext.trySub"), rows) : note(searching ? t("noresults") : t("ext.tryNone")));
    }
    if (FILTER !== "all") {
      const side = FILTER === "yesA" || FILTER === "ymA", who = side ? LAST.nA : LAST.nB, wm = FILTER.indexOf("ym") === 0;
      const rows = only(KC.match.yesOf(side ? LAST.A : LAST.B, wm)).map(r => ({ id: r.id, a: (LAST.A.items[r.id] || {}).interest || null, b: (LAST.B.items[r.id] || {}).interest || null }));
      html += rows.length ? block(t(wm ? "cmp.ymTitle" : "cmp.yesTitle", { who }), "var(--yes)", t(wm ? "cmp.ymSub" : "cmp.yesSub"), rows)
        : note(searching ? t("noresults") : t(wm ? "cmp.noYm" : "cmp.noYes", { who }));
      return html;
    }
    const g = KC.match.group(LAST.A, LAST.B);
    Object.keys(g).forEach(k => { g[k] = only(g[k]); });
    const ex = g.exBoth.length + g.exA.length + g.exB.length, disc = g.discA.length + g.discB.length + g.discBoth.length;
    if (!(g.match.length + disc + g.oneA.length + g.oneB.length + ex)) return html + note(searching ? t("noresults") : t("cmp.none"));
    const stat = (n, color, key) => '<div class="cmp-stat"><b style="color:' + color + '">' + n + "</b>" + esc(t(key)) + "</div>";
    html += '<div class="cmp-summary">' + stat(g.match.length, "var(--love)", "cmp.stat.match") + stat(disc, "var(--maybe)", "cmp.stat.discuss")
      + stat(g.oneA.length + g.oneB.length, "var(--chip-ink)", "cmp.stat.one") + stat(ex, "var(--limit)", "cmp.stat.excluded") + "</div>";
    if (X) {   /* v613: "✦ Новое вместе" above the matches */
      const nw = []; KC.CATS.forEach(c => c.items.forEach(([, id]) => { if (matches(id) && wOf(LAST.A, id) && wOf(LAST.B, id)) nw.push(id); }));
      if (nw.length) html += blockOf(t("ext.newTitle"), "var(--accent)", t("ext.newSub"), nw.map(newRow).join(""), nw.length);
    }
    html += block(t("cmp.g.match"), "var(--love)", t("cmp.g.match.sub"), g.match);
    html += block(t("cmp.g.discOne", { who: LAST.nA }), "var(--maybe)", t("cmp.g.discOne.sub", { who: LAST.nA }), g.discA);
    html += block(t("cmp.g.discOne", { who: LAST.nB }), "var(--maybe)", t("cmp.g.discOne.sub", { who: LAST.nB }), g.discB);
    html += block(t("cmp.g.discBoth"), "var(--maybe)", t("cmp.g.discBoth.sub"), g.discBoth);
    html += block(t("cmp.g.one", { who: LAST.nA }), "var(--chip-ink)", t("cmp.g.one.sub", { who: LAST.nA }), g.oneA);
    html += block(t("cmp.g.one", { who: LAST.nB }), "var(--chip-ink)", t("cmp.g.one.sub", { who: LAST.nB }), g.oneB);
    html += block(t("cmp.g.exBoth"), "var(--limit)", t("cmp.g.exBoth.sub"), g.exBoth);
    html += block(t("cmp.g.exOne", { who: LAST.nA }), "var(--limit)", t("cmp.g.exOne.sub", { who: LAST.nA }), g.exA);
    html += block(t("cmp.g.exOne", { who: LAST.nB }), "var(--limit)", t("cmp.g.exOne.sub", { who: LAST.nB }), g.exB);
    return html;
  }

  /* ---------- group view (3+) ---------- */
  const POSM = { yes: 1, love: 1, maybe: 1 };
  /* matches of a pair: both Yes/Love; withMaybe: both Yes/Love/Maybe (a "No" never counts) */
  const pairCount = (A, B, withMaybe) => {
    const ok = withMaybe ? POSM : POS; let n = 0;
    KC.CATS.forEach(c => c.items.forEach(([, id]) => { if (ok[(A.items[id] || {}).interest] && ok[(B.items[id] || {}).interest]) n++; }));
    return n;
  };
  function pairTable(P, withMaybe) {
    const role = p => p.st.meta.role || "";
    const fits = (a, b) => PMODE === "any" || (role(a) && role(b) && role(a) !== role(b)); /* dom + sub */
    const head = p => esc(p.name) + (role(p) ? '<span class="role-tag">' + esc(t("role.short." + role(p))) + "</span>" : "");
    let tb = '<div class="pair-wrap"><table class="pair-table" data-kind="' + (withMaybe ? "ym" : "yes") + '"><tr><th></th>' + P.map(p => "<th>" + head(p) + "</th>").join("") + "</tr>";
    let shown = 0;
    P.forEach((a, i) => {
      tb += "<tr><th>" + head(a) + "</th>" + P.map((b, j) => {
        if (i === j || !fits(a, b)) return '<td class="self">—</td>';
        if (i < j) shown++;
        return '<td><button class="pair-n" data-pair="' + Math.min(i, j) + "," + Math.max(i, j) + '">' + pairCount(a.st, b.st, withMaybe) + "</button></td>";
      }).join("") + "</tr>";
    });
    tb += "</table></div>";
    return blockOf(t(withMaybe ? "cmp.pairsTitleYM" : "cmp.pairsTitle"), withMaybe ? "var(--maybe)" : "var(--love)", t(withMaybe ? "cmp.pairsSubYM" : "cmp.pairsSub"), tb, shown);
  }
  function savedBar() {
    let h = '<div class="cmp-savebar"><button class="btn ghost" type="button" data-act="save">' + esc(t("cmp.save")) + "</button></div>";
    if (SAVED) {
      const bits = [t("cmp.savedNote", { name: SAVED.name || C.label(C.byId(SAVED.id)) || t("unnamed") })];
      if (NOTE && NOTE.updated.length) bits.push(t("cmp.savedUpd", { names: NOTE.updated.join(", ") }));
      if (NOTE && NOTE.gone.length) bits.push(t("cmp.savedGone", { names: NOTE.gone.join(", ") }));
      h += '<div class="sub cmp-savednote">' + esc(bits.join(KC.i18n.sep())) + "</div>";
    }
    return h;
  }
  function renderGroup() {
    const P = GROUP, searching = !!KC.$("cmpSearch").value.trim();
    if (SELG !== GROUP) { SEL = null; SELG = GROUP; }   /* a new company: no planet selected */
    /* v601 (owner): "Save" moved under the saved-comparison picker; the filters sit under the star map */
    KC.$("cmpSaveBar").innerHTML = savedBar(); KC.$("cmpSaveBar").hidden = false;
    HEAD = rlBtn() + P.map(p => profileLine(p.name, p.st, p.ext)).join("") + fold("group")   /* the system; "…and Maybe" counts Maybe too */
      + '<div class="cmp-filter">' + fbtn(GFILTER, "allYes", t("cmp.allYes")) + fbtn(GFILTER, "allYM", t("cmp.allYM")) + fbtn(GFILTER, "pairs", t("cmp.pairs")) + "</div>";
    let html = "";
    if (GFILTER === "pairs") {
      const role = p => p.st.meta.role || "";
      HEAD += '<div class="cmp-filter pair-mode">' + '<button class="btn mini' + (PMODE === "any" ? " on" : "") + '" data-pm="any">' + esc(t("cmp.pairsAny")) + "</button>"
        + '<button class="btn mini' + (PMODE === "role" ? " on" : "") + '" data-pm="role">' + esc(t("cmp.pairsRole")) + "</button></div>"
        + (PMODE === "role" ? '<div class="sub">' + esc(t("cmp.pairsRoleSub")) + "</div>" : "");
      const noRole = P.filter(p => !role(p)).map(p => p.name);
      if (PMODE === "role" && noRole.length) html += '<div class="sub" style="margin-top:6px">' + esc(t("cmp.noRole", { names: noRole.join(", ") })) + "</div>";
      return html + pairTable(P, false) + pairTable(P, true);
    }
    /* everyone Yes/Love (allYes) or everyone Yes/Love/Maybe (allYM); more "Love", then more "Yes" first */
    const ok = GFILTER === "allYM" ? POSM : POS;
    const rows = [];
    KC.CATS.forEach(c => c.items.forEach(([, id]) => {
      if (!matches(id)) return;
      const vals = P.map(p => (p.st.items[id] || {}).interest || null);
      if (vals.every(v => ok[v])) rows.push({ id, vals, loves: vals.filter(v => v === "love").length, yeses: vals.filter(v => v === "yes").length });
    }));
    rows.sort((x, y) => (y.loves - x.loves) || (y.yeses - x.yeses));
    const ym = GFILTER === "allYM";
    if (!rows.length) return html + note(searching ? t("noresults") : t(ym ? "cmp.noAllYM" : "cmp.noAllYes"));
    return html + blockOf(t(ym ? "cmp.allYMTitle" : "cmp.allYesTitle", { n: P.length }), ym ? "var(--maybe)" : "var(--love)", t(ym ? "cmp.allYMSub" : "cmp.allYesSub"),
      rows.map(r => rowHTML(r.id, P.map((p, i) => ({ name: p.name, v: r.vals[i], w: wOf(p.st, r.id) })))).join(""), rows.length);
  }

  /* #results = #resHead (profiles, roulette, star map, filters) + the search box + #resBody (the lists).
     bodyOnly: typing in the search redraws only the lists, so the star map is not rebuilt and the field keeps focus */
  let HEAD = "";
  function render(scroll, bodyOnly) {
    KC.$("cmpSearchBox").hidden = false;
    const out = KC.$("results");
    if (LAST) { KC.$("cmpSaveBar").hidden = true; KC.$("cmpSaveBar").innerHTML = ""; }   /* saving is for 3+ people */
    const body = LAST ? renderPair() : renderGroup();
    if (!bodyOnly) KC.$("resHead").innerHTML = HEAD;
    KC.$("resBody").innerHTML = body;
    if (scroll && out.scrollIntoView) out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  KC.$("cmpBtn").addEventListener("click", () => {
    const P = [], bad = [];
    box.querySelectorAll(".role-need").forEach(x => x.classList.remove("role-need")); box.querySelectorAll(".role-hint:not(.ext-hint)").forEach(x => x.remove());
    [...box.children].forEach((col, i) => {
      const raw = col.querySelector("textarea").value.trim(); if (!raw) return;
      const st = KC.codec.decode(raw);
      if (st.damaged) bad.push(i + 1);
      const typed = col.querySelector(".cmp-name").value.trim();
      /* a role chosen here replaces the one inside the list (tags, "Top + Bottom" pairs, roulette) */
      const role = col.querySelector(".cmp-role").value;
      if (role) st.meta = Object.assign({}, st.meta, { role });
      P.push({ name: typed || st.name || t("cmp.person", { n: i + 1 }), typed, code: raw, st, role, col, ext: KC.ext.isExt(st) });
    });
    if (bad.length) { KC.toast(t("cmp.damaged", { n: bad.join(", ") })); return; }
    if (P.length < 2) { KC.toast(t("cmp.needBoth")); return; }
    let pair = null;
    if (P.length === 2) { DIR = "tb"; pair = pairOf(P[0], P[1]); if (pair.need) { askRole(pair.need, (pair.need === P[0] ? P[1] : P[0]).name); return; } }
    else {   /* v613: in a company an extended list is compared by the role picked for it */
      const miss = P.find(p => p.ext && !p.role); if (miss) { askRole(miss, null); return; }
      P.forEach(p => { if (p.ext) { const r = KC.ext.ofRole(p.role); p.st = KC.ext.view(p.st, r); p.name += " " + arrowOf(r); } });
    }
    KC.$("cmpSearch").value = ""; NOTE = null;
    KC.stats.event(P.length === 2 ? "compare-2" : "compare-3plus");
    if (P.length < C.MIN) SAVED = null;
    if (P.length === 2) { GROUP = null; LAST = pair; FILTER = "all"; }
    else { LAST = null; GROUP = P; GFILTER = "allYes"; }
    render(true);
  });
  KC.$("cmpSearch").addEventListener("input", () => { if (LAST || GROUP) render(false, true); });
  KC.$("cmpSaveBar").addEventListener("click", e => { if (e.target.closest('button[data-act="save"]')) saveCurrent(); });
  KC.$("results").addEventListener("click", e => {
    if (e.target.closest('button[data-act="roulette"]')) { KC.roulette.open(); return; }
    if (e.target.closest('button[data-act="roulette-try"]')) { KC.roulette.open({ tryNew: true }); return; }
    const dr = e.target.closest("button[data-dir]");   /* v613: which roles of two extended lists */
    if (dr && LAST && LAST.raw) { if (dr.dataset.dir !== DIR) { DIR = dr.dataset.dir; const p = pairOf(LAST.raw.a, LAST.raw.b); p.fromGroup = LAST.fromGroup; LAST = p; render(false); } return; }
    /* v591: the pair's constellations ↔ DnD classes ↔ (v597) World of Darkness.
       A button changes the mode (data-mode) or the World of Darkness line (data-wod); either way the block is redrawn.
       (v592–v598 shared the choice with the portrait; v599, owner: each view remembers its own) */
    /* v599: the pair and the company remember their own choice (scope), independent of the portrait */
    const pickMode = (b, scope) => { if (!b || !KC.dnd || !KC.wod) return false;
      if (b.dataset.mode) { const want = b.dataset.mode; if (want === KC.dnd.mode(scope)) return false; KC.dnd.setMode(want, scope); if (want !== "sign") KC.stats.event(want); return true; }
      if (b.dataset.wod === KC.wod.sub(scope)) return false; KC.wod.setSub(b.dataset.wod, scope); return true; };
    const gm = e.target.closest('.sp-fold[data-fold="group"] .pt-mode [data-mode], .sp-fold[data-fold="group"] .pt-mode [data-wod]');
    if (gm && GROUP) {
      if (pickMode(gm, "group")) gm.closest(".sp-fold").querySelector(".sp-fold-body").innerHTML = foldBody("group");
      return;
    }
    const md = e.target.closest(".sp-signs .pt-mode [data-mode], .sp-signs .pt-mode [data-wod]");
    if (md && LAST) {
      if (!pickMode(md, "pair")) return;
      const box = KC.$("results").querySelector(".sp-signs"), tmp = document.createElement("div");
      tmp.innerHTML = KC.space.pairSigns(LAST.A, LAST.B, LAST.nA, LAST.nB); if (box && tmp.firstChild) box.replaceWith(tmp.firstChild);
      return;
    }
    const h = e.target.closest('button[data-act="help"]');
    if (h) { const d = h.parentNode.querySelector(".item-desc"); if (d) { d.hidden = !d.hidden; h.classList.toggle("on", !d.hidden); } return; }
    const pm = e.target.closest("button[data-pm]");
    if (pm) { PMODE = pm.dataset.pm; render(false); return; }
    const pl = e.target.closest("[data-planet]");
    if (pl && GROUP) { const v = +pl.dataset.planet; SEL = SEL === v ? null : v; render(false); return; }
    const pr = e.target.closest("button[data-pair]");
    if (pr) { const [i, j] = pr.dataset.pair.split(",").map(Number); LAST = { A: GROUP[i].st, B: GROUP[j].st, nA: GROUP[i].name, nB: GROUP[j].name, fromGroup: true }; FILTER = "all"; render(true); return; }
    const b = e.target.closest("button[data-f]"); if (!b) return;
    if (b.dataset.f === "group") { LAST = null; render(false); return; }
    if (LAST) FILTER = b.dataset.f; else GFILTER = b.dataset.f;
    render(false);
  });

  /* ---------- start: two participants, the first one is my list ---------- */
  let handed = false;
  drawSaved();
  try {
    const sv = sessionStorage.getItem("cmpOpen");
    if (sv !== null) { sessionStorage.removeItem("cmpOpen"); if (C.byId(sv)) { handed = true; openSaved(sv); } }
  } catch (e) {}
  if (!handed) try {
    const a = sessionStorage.getItem("cmpA"), b = sessionStorage.getItem("cmpB");
    if (a !== null || b !== null) {
      handed = true;
      addPart(sessionStorage.getItem("cmpAName") || "", a || ""); addPart(sessionStorage.getItem("cmpBName") || "", b || "");
      ["cmpA", "cmpB", "cmpAName", "cmpBName"].forEach(k => sessionStorage.removeItem(k));
      if (a && b) KC.$("cmpBtn").click();
    }
  } catch (e) {}
  if (!handed) {
    const own = KC.store.hasOwn() ? KC.store.loadOwn() : null;
    addPart(own && !KC.store.isEmpty(own) ? (own.name || t("label.mine")) : "", own && !KC.store.isEmpty(own) ? KC.codec.encode(own) : "");
    addPart();
  }
})(window.KC);
