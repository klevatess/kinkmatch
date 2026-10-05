/* core/ext.js — the extended list (v613, owner, Oct 4). In an extended list every practice has two answers, one for
   each role: Top (t) and Bottom (b), each Нет / Может / Да / Обожаю plus a "Хочу" mark (want to try; only next to
   Может / Да / Обожаю). State: st.ext = 1, items[id] = { t?, b?, tw?, bw? } (no "interest" field).
   A plain list stays as it was ({ interest }). Everything that works on plain lists (portrait, signs, joke modes,
   compare, roulette) gets a ROLE VIEW of an extended list: a plain list with that role's answers and
   items[id].w = 1 for "Хочу". The plain list and its extended copy point at each other by list id (st.pair). */
(function (KC) {
  const VALID = { limit: 1, maybe: 1, yes: 1, love: 1 }, WANTS = { maybe: 1, yes: 1, love: 1 };
  const R = ["t", "b"];
  const ROLE = { t: "dom", b: "sub" }, FROM_ROLE = { dom: "t", sub: "b" };
  const isExt = st => !!(st && st.ext);
  /* one item of an extended list cleaned: only valid answers; "Хочу" only next to Может / Да / Обожаю */
  function cleanItem(x) {
    if (!x || typeof x !== "object") return null;
    const o = {};
    R.forEach(r => { if (VALID[x[r]]) { o[r] = x[r]; if (x[r + "w"] && WANTS[x[r]]) o[r + "w"] = 1; } });
    return o.t || o.b ? o : null;
  }
  /* answered in at least one role */
  const answered = (st, id) => { const x = st.items[id]; return !!(x && (isExt(st) ? x.t || x.b : x.interest)); };
  /* a plain list of one role ("t" | "b"): its answers, the "Хочу" marks as w, the role in the profile */
  function view(st, r) {
    if (!isExt(st)) return st;
    const out = Object.assign({}, st, { items: {}, meta: Object.assign({}, st.meta, { role: ROLE[r] }), role: r });
    delete out.ext;
    Object.keys(st.items).forEach(id => { const x = st.items[id]; if (x && x[r]) out.items[id] = x[r + "w"] ? { interest: x[r], w: 1 } : { interest: x[r] }; });
    return out;
  }
  /* an extended copy of a plain list filled as role ("dom" | "sub" | "both"); a new list id; the two point at each other */
  function fromPlain(st, role) {
    const out = KC.store.clone(st);
    out.ext = 1; out.items = {};
    const rs = role === "both" ? R : [FROM_ROLE[role]];
    Object.keys(st.items).forEach(id => { const v = st.items[id] && st.items[id].interest; if (!VALID[v]) return; const o = {}; rs.forEach(r => { o[r] = v; }); out.items[id] = o; });
    if (out.meta) { out.meta = Object.assign({}, out.meta); delete out.meta.role; }
    out.uid = KC.store.newUid(); out.pair = st.uid || "";
    delete out.template;
    return out;
  }
  /* the role a plain list was filled for: "dom" | "sub" | "" */
  const roleOf = st => (st && st.meta && (st.meta.role === "dom" || st.meta.role === "sub")) ? st.meta.role : "";
  KC.ext = { VALID, WANTS, R, ROLE, FROM_ROLE, isExt, cleanItem, answered, view, fromPlain, roleOf,
    other: r => (r === "t" ? "b" : "t"), ofRole: role => FROM_ROLE[role] || "" };
})(window.KC);
