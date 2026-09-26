/* compare/main.js — compare.html.
   2–10 participants. Each has a name, a link/code field and a picker to fill it from lists saved
   on this device (my current list, "My lists", "Received").
   2 participants  -> detailed view: groups + filters "Yes from A/B", "Yes and Maybe from A/B".
   3+ participants -> group view: "Yes/Love from everyone" and a pair table (matches per pair);
                      a number in the table opens the detailed view for that pair.
   A comparison of 3+ can be saved (KC.store.cmp) and reopened from the picker at the top or from
   "My lists"; it then takes the newest version of every list on this device. */
(function (KC) {
  const t = (k, v) => KC.i18n.t(k, v), esc = KC.esc;
  const BADGE = { love: "b-match", yes: "b-good", maybe: "b-maybe", limit: "b-limit" };
  const MAX = 10;
  let LAST = null, FILTER = "all";   /* detailed pair view */
  let GROUP = null, GFILTER = "allYes"; /* group view: [{name, st}] */
  let PMODE = "any";                    /* pair table: "any" | "role" (only Top + Bottom pairs) */
  let SAVED = null;                     /* the saved comparison on screen: {id, name} */
  let NOTE = null;                      /* after opening a saved one: {updated: [names], gone: [names]} */
  const C = KC.store.cmp;

  KC.initTheme();
  KC.i18n.set(KC.i18n.detect(null));
  function applyStatic() { KC.i18n.apply(document); KC.$("backLink").href = "index.html?lang=" + KC.i18n.lang; }
  KC.i18n.mountSwitcher(() => { applyStatic(); relabel(); drawPickers(); drawSaved(); if (LAST || GROUP) render(false); });
  applyStatic();

  /* ---------- participants ---------- */
  const box = KC.$("parts");
  function addPart(name, code) {
    if (box.children.length >= MAX) { KC.toast(t("cmp.maxN")); return null; }
    const i = box.children.length;
    const col = KC.el("div", "cmp-col");
    col.innerHTML = '<div class="cmp-col-head"><input class="cmp-name" autocomplete="off"><button class="btn ghost mini" type="button" data-act="rm">✕</button></div>'
      + '<select class="cmp-pick"></select><textarea class="cmp-code"></textarea>';
    const nm = col.querySelector(".cmp-name");
    if (i < 2) { nm.id = i ? "nameB" : "nameA"; col.querySelector("textarea").id = i ? "codeB" : "codeA"; }
    nm.value = name || ""; col.querySelector("textarea").value = code || "";
    box.appendChild(col); relabel(); drawPickers(col);
    return col;
  }
  function relabel() {
    [...box.children].forEach((col, i) => {
      col.querySelector(".cmp-name").placeholder = t("cmp.person", { n: i + 1 }) + " — " + t("cmp.namePh");
      col.querySelector("textarea").placeholder = t("cmp.codePh");
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
    if (s) { col.querySelector("textarea").value = s.code; col.querySelector(".cmp-name").value = s.name || ""; }
  });
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
    parts.slice(0, MAX).forEach(p => addPart(p.name, p.code));
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
    const r = C.save(nm, GROUP.map(p => ({ name: p.typed, code: p.code })), SAVED && SAVED.id);
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
      + '<div class="who">' + who.map(w => esc(w.name) + ": " + badge(w.v)).join(" &nbsp; ") + "</div>"
      + (desc ? '<div class="item-desc" hidden>' + esc(desc) + "</div>" : "") + "</div>";
  };
  const pairRow = r => rowHTML(r.id, [{ name: LAST.nA, v: r.a }, { name: LAST.nB, v: r.b }]);
  const blockOf = (title, dot, sub, body, n) => '<div class="result-group"><h3><span class="dot" style="background:' + dot + '"></span>' + esc(title)
    + ' <span style="font-weight:400;color:var(--muted);font-size:14px">(' + n + ')</span></h3><div class="sub">' + esc(sub) + "</div>" + body + "</div>";
  const block = (title, dot, sub, rows) => !rows.length ? "" : blockOf(title, dot, sub, rows.map(pairRow).join(""), rows.length);
  const note = text => '<div class="result-group"><div class="sub">' + esc(text) + "</div></div>";
  function profileLine(name, st) {
    const bits = [];
    KC.PROFILE.forEach(f => { const v = !f.hidden && st.meta[f.id]; if (v) bits.push(esc(KC.i18n.fieldLabel(f.id)) + ": " + esc((Array.isArray(v) ? v : [v]).map(o => KC.i18n.optLabel(f.id, o)).join(", "))); });
    return bits.length ? '<div class="cmp-profile"><b>' + esc(name) + "</b> · " + bits.join(" · ") + "</div>" : "";
  }
  const fbtn = (cur, f, label) => '<button class="btn mini' + (cur === f ? " on" : "") + '" data-f="' + f + '">' + esc(label) + "</button>";
  function matches(id) {
    const q = KC.$("cmpSearch").value.trim().toLowerCase(); if (!q) return true;
    return (KC.i18n.item(id).name + " " + KC.i18n.item(id, "en").name).toLowerCase().indexOf(q) >= 0;
  }
  const only = rows => rows.filter(r => matches(r.id));
  const POS = { yes: 1, love: 1 };

  /* ---------- detailed pair view ---------- */
  function renderPair() {
    const searching = !!KC.$("cmpSearch").value.trim();
    let html = '<div class="cmp-filter">' + (LAST.fromGroup ? '<button class="btn mini" data-f="group">' + esc(t("cmp.backGroup")) + "</button>" : "")
      + fbtn(FILTER, "all", t("cmp.all"))
      + fbtn(FILTER, "yesA", t("cmp.yesOf", { who: LAST.nA })) + fbtn(FILTER, "yesB", t("cmp.yesOf", { who: LAST.nB }))
      + fbtn(FILTER, "ymA", t("cmp.yesMaybeOf", { who: LAST.nA })) + fbtn(FILTER, "ymB", t("cmp.yesMaybeOf", { who: LAST.nB })) + "</div>"
      + profileLine(LAST.nA, LAST.A) + profileLine(LAST.nB, LAST.B);
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
    let html = savedBar() + '<div class="cmp-filter">' + fbtn(GFILTER, "allYes", t("cmp.allYes")) + fbtn(GFILTER, "allYM", t("cmp.allYM")) + fbtn(GFILTER, "pairs", t("cmp.pairs")) + "</div>"
      + P.map(p => profileLine(p.name, p.st)).join("");
    if (GFILTER === "pairs") {
      const role = p => p.st.meta.role || "";
      html += '<div class="cmp-filter pair-mode">' + '<button class="btn mini' + (PMODE === "any" ? " on" : "") + '" data-pm="any">' + esc(t("cmp.pairsAny")) + "</button>"
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
      rows.map(r => rowHTML(r.id, P.map((p, i) => ({ name: p.name, v: r.vals[i] })))).join(""), rows.length);
  }

  function render(scroll) {
    KC.$("cmpSearchBox").hidden = false;
    const out = KC.$("results");
    out.innerHTML = LAST ? renderPair() : renderGroup();
    if (scroll && out.scrollIntoView) out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  KC.$("cmpBtn").addEventListener("click", () => {
    const P = [], bad = [];
    [...box.children].forEach((col, i) => {
      const raw = col.querySelector("textarea").value.trim(); if (!raw) return;
      const st = KC.codec.decode(raw);
      if (st.damaged) bad.push(i + 1);
      const typed = col.querySelector(".cmp-name").value.trim();
      P.push({ name: typed || st.name || t("cmp.person", { n: i + 1 }), typed, code: raw, st });
    });
    if (bad.length) { KC.toast(t("cmp.damaged", { n: bad.join(", ") })); return; }
    if (P.length < 2) { KC.toast(t("cmp.needBoth")); return; }
    KC.$("cmpSearch").value = ""; NOTE = null;
    KC.stats.event(P.length === 2 ? "compare-2" : "compare-3plus");
    if (P.length < C.MIN) SAVED = null;
    if (P.length === 2) { GROUP = null; LAST = { A: P[0].st, B: P[1].st, nA: P[0].name, nB: P[1].name }; FILTER = "all"; }
    else { LAST = null; GROUP = P; GFILTER = "allYes"; }
    render(true);
  });
  KC.$("cmpSearch").addEventListener("input", () => { if (LAST || GROUP) render(false); });
  KC.$("results").addEventListener("click", e => {
    if (e.target.closest('button[data-act="save"]')) { saveCurrent(); return; }
    const h = e.target.closest('button[data-act="help"]');
    if (h) { const d = h.parentNode.querySelector(".item-desc"); if (d) { d.hidden = !d.hidden; h.classList.toggle("on", !d.hidden); } return; }
    const pm = e.target.closest("button[data-pm]");
    if (pm) { PMODE = pm.dataset.pm; render(false); return; }
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
