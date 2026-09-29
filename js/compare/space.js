/* compare/space.js — the pictures of the compare page (v586, owner):
   - a group as a solar system: the sun = what most of the company likes; 2–3 shared orbits (closer = the
     person's Yes/Love match the majority more); similar people sit side by side, Top + Bottom pairs first;
     Top = planet with a ring, Bottom = pink planet with a moon, no role = grey. A tap on a planet shows its
     links: its two most similar people (dashed) and its most similar Top/Bottom partner (solid), with %.
   - two people as paired planets (closer = more in common) and their two constellations laid over each other;
   Similarity of two lists = shared Yes/Love / sqrt(Yes/Love of one × Yes/Love of the other). */
(function (KC) {
  const esc = KC.esc, t = (k, v) => KC.i18n.t(k, v), short = id => t("pt.s." + id);
  /* a picture's title with the "?" that opens the help about the compare pictures */
  const head = key => '<div class="sp-h">' + esc(t(key)) + ' <button class="help-q" type="button" data-help="compare" title="' + esc(t("help.open")) + '" aria-label="' + esc(t("help.open")) + '">?</button></div>';
  const POS = { yes: 1, love: 1 }, POSM = { yes: 1, love: 1, maybe: 1 };
  /* the practices a list likes: Yes/Love (or Yes/Maybe/Love with the "…and Maybe" filter) */
  const liked = (st, withMaybe) => { const pos = withMaybe ? POSM : POS, o = {}; Object.keys(st.items || {}).forEach(id => { if (pos[st.items[id].interest]) o[id] = 1; }); return o; };
  const common = (a, b) => { let n = 0; for (const k in a) if (b[k]) n++; return n; };
  const seeded = n => { let x = n; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
  const dust = (W, H, n, seed) => { const r = seeded(seed); let s = ""; for (let i = 0; i < n; i++) s += '<circle cx="' + (r() * W).toFixed(1) + '" cy="' + (r() * H).toFixed(1) + '" r="' + (r() * .9 + .3).toFixed(2) + '"/>'; return '<g fill="var(--dust)">' + s + "</g>"; };
  const spark = (x, y, r) => "M" + x + " " + (y - r) + "Q" + x + " " + y + " " + (x + r) + " " + y + "Q" + x + " " + y + " " + x + " " + (y + r) + "Q" + x + " " + y + " " + (x - r) + " " + y + "Q" + x + " " + y + " " + x + " " + (y - r) + "Z";

  /* ---------- group: a star map of the company ---------- */
  function simMatrix(P, withMaybe) {
    const L = P.map(p => liked(p.st, withMaybe)), n = P.length, S = [];
    for (let i = 0; i < n; i++) { S[i] = []; for (let j = 0; j < n; j++) { const a = Object.keys(L[i]).length, b = Object.keys(L[j]).length; S[i][j] = i === j ? 1 : a && b ? common(L[i], L[j]) / Math.sqrt(a * b) : 0; } }
    return S;
  }
  const GROUPS = ["bondage", "ds", "sm", "sex-penetration", "fetishes", "role-play", "voyeurism-exhibitionism", "bodily-fluids", "intimacy"];
  /* two people: their constellations laid over each other (one ring, 9 groups, two stars per group) */
  function pairStars(A, B, nA, nB) {
    const by = r => { const o = {}; r.sections.forEach(x => { o[x.id] = x.pct; }); return o; }, va = by(KC.portrait.compute(A)), vb = by(KC.portrait.compute(B));
    const W = 360, H = 300, cx = 180, cy = 150, R = 96, off = 7;
    const P = GROUPS.map((id, i) => { const an = -Math.PI / 2 + i * 2 * Math.PI / GROUPS.length; return { id, an, x: cx + Math.cos(an) * R, y: cy + Math.sin(an) * R, lx: cx + Math.cos(an) * (R + 40), ly: cy + Math.sin(an) * (R + 40) }; });
    let h = '<svg viewBox="0 0 ' + W + " " + H + '" role="img">' + dust(W, H, 60, 8) + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 14) + '" fill="none" stroke="var(--ink-line)"/>';
    P.forEach(p => {
      const A1 = va[p.id], B1 = vb[p.id], both = A1 >= 55 && B1 >= 55;
      if (both) h += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="26" fill="var(--star)" opacity=".2"/>';
      const ox = Math.cos(p.an + Math.PI / 2) * off, oy = Math.sin(p.an + Math.PI / 2) * off;
      if (A1 != null) h += '<path d="' + spark(+(p.x - ox).toFixed(1), +(p.y - oy).toFixed(1), 4 + A1 / 100 * 11) + '" fill="var(--accent)" opacity="' + (.45 + A1 / 200).toFixed(2) + '"/>';
      if (B1 != null) h += '<path d="' + spark(+(p.x + ox).toFixed(1), +(p.y + oy).toFixed(1), 4 + B1 / 100 * 11) + '" fill="var(--b-col)" opacity="' + (.45 + B1 / 200).toFixed(2) + '"/>';
      h += '<text x="' + p.lx.toFixed(1) + '" y="' + (p.ly - 2).toFixed(1) + '" text-anchor="middle" font-size="11" font-family="Inter,sans-serif" fill="currentColor"' + (both ? ' font-weight="700"' : "") + ">" + esc(short(p.id))
        + '<tspan x="' + p.lx.toFixed(1) + '" dy="13" font-size="10.5"><tspan fill="var(--accent)">' + (A1 == null ? "—" : A1) + '</tspan><tspan fill="var(--muted)"> · </tspan><tspan fill="var(--b-col)">' + (B1 == null ? "—" : B1) + "</tspan></tspan></text>";
    });
    return '<div class="sp-h sp-h2">' + esc(t("sp.pair.stars")) + "</div>" + h + "</svg>"
      + '<div class="sp-note"><span class="sp-sa">✦</span> ' + esc(nA) + ' &nbsp; <span class="sp-sb">✦</span> ' + esc(nB) + " · " + esc(t("sp.pair.both")) + "</div>";
  }

  /* ---------- VARIANT: the company as a solar system ---------- */
  function planetDefs(id, col) {
    return '<radialGradient id="' + id + '" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="' + col + '"/><stop offset="1" stop-color="' + col + '" stop-opacity=".75"/></radialGradient>';
  }
  /* Top: a planet with a ring; Bottom: a pink planet with a moon; no role: a plain grey-violet planet */
  function planetBody(X, Y, r, rl) {
    const x = X.toFixed(1), y = Y.toFixed(1);
    let body = '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#' + (rl === "sub" ? "plp" : rl === "dom" ? "pl" : "pln") + ')"/>';
    if (rl === "dom") body = '<ellipse cx="' + x + '" cy="' + y + '" rx="' + (r * 1.8) + '" ry="' + (r * .4) + '" fill="none" stroke="var(--pl-dom)" stroke-width="1.6" transform="rotate(-20 ' + x + " " + y + ')"/>' + body
      + '<path d="M' + (X - r * 1.8).toFixed(1) + " " + y + "A" + (r * 1.8) + " " + (r * .4) + " 0 0 0 " + (X + r * 1.8).toFixed(1) + " " + y + '" fill="none" stroke="var(--pl-dom)" stroke-width="1.6" transform="rotate(-20 ' + x + " " + y + ')"/>';
    if (rl === "sub") body += '<circle cx="' + (X + r * 1.6).toFixed(1) + '" cy="' + (Y - r * 1.2).toFixed(1) + '" r="' + (r * .32).toFixed(1) + '" fill="var(--star)"/><path d="M' + (X - r * 1.5).toFixed(1) + " " + (Y + 3).toFixed(1) + "A" + (r * 1.7) + " " + (r * 1.7) + " 0 0 1 " + (X + r * 1.3).toFixed(1) + " " + (Y - r * 1.5).toFixed(1) + '" fill="none" stroke="var(--star)" stroke-width=".8" stroke-dasharray="1.5 2.5" opacity=".8"/>';
    return body;
  }
  const planetAllDefs = () => planetDefs("pl", "var(--pl-dom)") + planetDefs("plp", "var(--star)") + planetDefs("pln", "var(--muted)");
  /* ---------- a group: the solar system ---------- */
  let layoutCache = { key: "", A: null };   /* a tap on a planet redraws with the same layout, no recount */
  /* P = [{name, st}], sel = tapped planet (index) or null, withMaybe = the "Yes/Maybe/Love" filter */
  function groupSVG(P, sel, withMaybe) {
    const n = P.length, S = simMatrix(P, withMaybe), pc = v => Math.round(v * 100), role = i => P[i].st.meta.role || "";
    const E = {}, key = (i, j) => Math.min(i, j) + "," + Math.max(i, j);
    const add = (i, j, kind) => { const k2 = key(i, j); if (!E[k2]) E[k2] = { i: Math.min(i, j), j: Math.max(i, j), v: S[i][j], kind }; else if (kind === "role") E[k2].role = true; };
    P.forEach((p, i) => { const order = P.map((q, j) => j).filter(j => j !== i).sort((a, b) => S[i][b] - S[i][a]);
      order.slice(0, 2).forEach(j => add(i, j, "near"));
      const r = role(i); if (r) { const other = r === "dom" ? "sub" : "dom", c = order.find(j => role(j) === other); if (c !== undefined) { if (order.slice(0, 2).indexOf(c) >= 0) E[key(i, c)].role = true; else add(i, c, "role"); } } });
    const edges = Object.values(E);
    const L = P.map(p => liked(p.st, withMaybe));
    /* the sun: practices liked by more than half of the company */
    const cnt = {}; L.forEach(l => { for (const id in l) cnt[id] = (cnt[id] || 0) + 1; });
    const sunN = Object.keys(cnt).filter(id => cnt[id] > n / 2).length;
    /* in tune = share of a person's likes that at least half of the others also like */
    const inTune = P.map((p, i) => { const mine = Object.keys(L[i]); if (!mine.length) return 0; const need = Math.ceil((n - 1) / 2);
      return mine.filter(id => (cnt[id] - 1) >= need).length / mine.length; });
    /* a few shared orbits: people are grouped by how much they match the company */
    const W = 360, H = 380, cx = W / 2, cy = H / 2, ORB = n > 6 ? [80, 115, 150] : n > 3 ? [88, 138] : [110];
    const rank = P.map((p, i) => i).sort((a, b) => inTune[b] - inTune[a]), tier = [];
    rank.forEach((i, k2) => { tier[i] = Math.min(ORB.length - 1, Math.floor(k2 * ORB.length / n)); });
    /* angles: similar people — and Top/Bottom pairs above all — sit next to each other */
    const comp = (i, j) => role(i) && role(j) && role(i) !== role(j);
    const pull = []; for (let i = 0; i < n; i++) { pull[i] = []; for (let j = 0; j < n; j++) pull[i][j] = i === j ? 0 : Math.pow(S[i][j], 3) * (comp(i, j) ? 3 : 1) + (E[key(i, j)] ? (E[key(i, j)].role || E[key(i, j)].kind === "role" ? 6 : 3) * S[i][j] : 0); }
    const place = A => A.map((a, i) => ({ x: cx + Math.cos(a) * ORB[tier[i]], y: cy + Math.sin(a) * ORB[tier[i]], a, r: ORB[tier[i]] }));
    const pairCost = (i, j, ai, aj) => { const d = Math.hypot(Math.cos(ai) * ORB[tier[i]] - Math.cos(aj) * ORB[tier[j]], Math.sin(ai) * ORB[tier[i]] - Math.sin(aj) * ORB[tier[j]]);
      return pull[i][j] * d + 6000 / (d + 1) + (d < 70 ? 80 * (70 - d) : 0); };
    /* moving one planet changes only its own terms: the change is counted in O(n), not O(n²) */
    const delta = (A, i, na) => { let c = 0; for (let j = 0; j < n; j++) if (j !== i) c += pairCost(i, j, na, A[j]) - pairCost(i, j, A[i], A[j]); return c; };
    const lkey = (withMaybe ? "m" : "y") + n + ";" + P.map((p, i) => role(i)).join(",") + ";" + S.map(r => r.map(v => v.toFixed(4)).join(",")).join(";");
    let bestA = layoutCache.key === lkey ? layoutCache.A : null;
    if (!bestA) {
      /* simulated annealing on the angles, 5 restarts; the same company always gets the same picture */
      const rnd = seeded(5), IT = 400 * n; let bestC = 1e18;
      for (let run = 0; run < 5; run++) {
        const A = P.map(() => rnd() * 6.283); let cur = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) cur += pairCost(i, j, A[i], A[j]);
        for (let it = 0; it < IT; it++) { const T = 1 - it / IT, i = Math.floor(rnd() * n), na = A[i] + (rnd() - .5) * (.2 + 2.5 * T), dc = delta(A, i, na);
          if (dc < 0 || rnd() < Math.exp(-dc / (30 * T + .01))) { A[i] = na; cur += dc; if (cur < bestC) { bestC = cur; bestA = A.slice(); } } }
      }
      layoutCache = { key: lkey, A: bestA };
    }
    const pts = place(bestA);
    /* names: outside the orbit, clamped inside the picture (their boxes are kept for the % pills) */
    const names = pts.map((q, i) => { const r = 10, tw = P[i].name.length * 7.2;
      let lx = cx + Math.cos(q.a) * (q.r + r + 16), ly = cy + Math.sin(q.a) * (q.r + r + 16) + 4, c = Math.cos(q.a);
      if ((c > .35 && lx + tw > W - 4) || (c < -.35 && lx - tw < 4) || ly < 14 || ly > H - 6) { lx = q.x; ly = q.y + r + 18; c = 0; }
      const anchor = c > .35 ? "start" : c < -.35 ? "end" : "middle", x0 = anchor === "start" ? lx : anchor === "end" ? lx - tw : lx - tw / 2;
      return { lx, ly, anchor, box: { x0: x0 - 2, x1: x0 + tw + 2, y0: ly - 12, y1: ly + 4 } }; });
    const lo = Math.min(...edges.map(e => e.v)), hi = Math.max(...edges.map(e => e.v)), k = v => hi > lo ? (v - lo) / (hi - lo) : 1;
    let g = '<svg viewBox="0 0 ' + W + " " + H + '" role="img"><defs>' + planetAllDefs()
      + '<radialGradient id="sun"><stop offset="0" stop-color="var(--star)" stop-opacity=".9"/><stop offset=".25" stop-color="var(--star)" stop-opacity=".5"/><stop offset="1" stop-color="var(--star)" stop-opacity="0"/></radialGradient></defs>' + dust(W, H, 120, 6);
    ORB.forEach(r => { g += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--ink-line)" stroke-width=".9"/>'; });
    g += '<circle cx="' + cx + '" cy="' + cy + '" r="44" fill="url(#sun)"/><circle cx="' + cx + '" cy="' + cy + '" r="13" fill="var(--star)"/>';
    g += '<text x="' + cx + '" y="' + (cy - 22) + '" text-anchor="middle" font-size="15" font-weight="700" font-family="Inter,sans-serif" fill="var(--star)" paint-order="stroke" stroke="var(--panel)" stroke-width="3">' + sunN + "</text>";
    const pills = [], has = sel !== undefined && sel !== null;
    let mine = [];
    if (has) { const order = P.map((q, j) => j).filter(j => j !== sel).sort((a, b) => S[sel][b] - S[sel][a]); mine = order.slice(0, 2).map(j => ({ j, role: false }));
      const r = role(sel); if (r) { const other = r === "dom" ? "sub" : "dom", c = order.find(j => role(j) === other); if (c !== undefined) { const m = mine.find(x => x.j === c); if (m) m.role = true; else mine.push({ j: c, role: true }); } } }
    const hitsBox = (x, y, b) => x + 15 > b.x0 && x - 15 < b.x1 && y + 8 > b.y0 && y - 8 < b.y1;
    mine.forEach(({ j, role: isRole }) => {
      const A = pts[sel], B = pts[j], v = S[sel][j], w = k(v);
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dd = Math.hypot(B.x - A.x, B.y - A.y) || 1, nx = -(B.y - A.y) / dd, ny = (B.x - A.x) / dd;
      const at = (t2, qx, qy) => [(1 - t2) * (1 - t2) * A.x + 2 * (1 - t2) * t2 * qx + t2 * t2 * B.x, (1 - t2) * (1 - t2) * A.y + 2 * (1 - t2) * t2 * qy + t2 * t2 * B.y];
      /* the smallest bend that keeps the curve clear of the sun and of every other planet */
      const clear = b2 => { const qx = mx + nx * b2, qy = my + ny * b2; let bad = 0;
        for (let k2 = 1; k2 < 20; k2++) { const [x, y] = at(k2 / 20, qx, qy);
          const ds = Math.hypot(x - cx, y - cy); if (ds < 50) bad += 50 - ds;
          pts.forEach((q, k3) => { if (k3 === sel || k3 === j) return; const d = Math.hypot(x - q.x, y - q.y); if (d < 34) bad += 34 - d; }); }
        return bad; };
      let bend = 10, bb = 1e9; for (let b2 = 0; b2 <= 200; b2 += 6) for (const sg of [1, -1]) { const c2 = clear(sg * b2) * 50 + b2; if (c2 < bb) { bb = c2; bend = sg * b2; } }
      const qx = mx + nx * bend, qy = my + ny * bend;
      g += '<path d="M' + A.x.toFixed(1) + " " + A.y.toFixed(1) + "Q" + qx.toFixed(1) + " " + qy.toFixed(1) + " " + B.x.toFixed(1) + " " + B.y.toFixed(1) + '" fill="none" stroke="var(--accent)" stroke-width="' + (1.5 + w * 4).toFixed(1) + '" stroke-linecap="round" opacity=".8"' + (isRole ? "" : ' stroke-dasharray="6 5"') + "/>";
      /* the % pill: somewhere along the link where it covers no name, planet or other pill */
      let best = null;
      for (const t2 of [.5, .42, .58, .34, .66, .27, .73]) { const [x, y] = at(t2, qx, qy);
        const bad = names.some(nm => hitsBox(x, y, nm.box)) || pts.some(q => Math.hypot(x - q.x, y - q.y) < 22) || pills.some(pp => Math.abs(pp[0] - x) < 32 && Math.abs(pp[1] - y) < 18);
        if (!bad) { best = [x, y]; break; } }
      pills.push((best || at(.5, qx, qy)).concat([v]));
    });
    pills.forEach(([x, y, v]) => { g += '<rect x="' + (x - 14).toFixed(1) + '" y="' + (y - 8).toFixed(1) + '" width="28" height="15" rx="7.5" fill="var(--panel)" stroke="var(--ink-line)"/><text x="' + x.toFixed(1) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="middle" font-size="9.5" font-weight="600" font-family="Inter,sans-serif" fill="var(--accent)">' + pc(v) + "%</text>"; });
    pts.forEach((q, i) => {
      const r = 10, x = q.x.toFixed(1), y = q.y.toFixed(1), nm = names[i];
      const linked = has && (i === sel || mine.some(m => m.j === i)), dim = has && !linked;
      g += '<g data-planet="' + i + '" opacity="' + (dim ? .3 : 1) + '">' + (i === sel ? '<circle cx="' + x + '" cy="' + y + '" r="' + (r + 12) + '" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="2 3"/>' : "") + planetBody(q.x, q.y, r, role(i))
        + '<text x="' + nm.lx.toFixed(1) + '" y="' + nm.ly.toFixed(1) + '" text-anchor="' + nm.anchor + '" font-size="12.5" font-weight="600" font-family="Fraunces,Georgia,serif" fill="currentColor" paint-order="stroke" stroke="var(--panel)" stroke-width="4">' + esc(P[i].name) + "</text></g>";
    });
    g += "</svg>";
    const tune = P.map((p, i) => [i, inTune[i]]).sort((a, b) => b[1] - a[1]).map(([i, v]) => "<span><b>" + esc(P[i].name) + "</b> " + pc(v) + "%</span>");
    const dash = '<span class="lg-line lg-dash"></span>', line = '<span class="lg-line"></span>';
    return '<div class="sp-box">' + head("sp.sys.h") + g
      + '<div class="sp-legend"><div>' + t(withMaybe ? "sp.sys.legendYM_html" : "sp.sys.legend_html", { n: sunN }) + "</div><div>" + t("sp.sys.tap_html", { dash, line }) + "</div></div>"
      + '<div class="sp-near"><div class="sp-sub">' + esc(t("sp.sys.tune")) + "</div>" + tune.join("") + "</div></div>";
  }

  /* ---------- two people: their constellation signs side by side (v589) ---------- */
  /* sg = a sign or (v591) a DnD figure (KC.dnd.pick: grey stars only shape the drawing); st = the list (for the alignment) */
  function signMini(sg, who, shared, st0) {
    const W = 170, H = 170, box = 120, o = 25, X = st => o + st.x * box / 100, Y = st => o + st.y * box / 100;
    const name = sg.dnd ? t("dnd.c." + sg.cls) : sg.wod ? t("wod." + sg.line + "." + sg.id) : t("sign." + sg.id);
    let h = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(name) + '">' + dust(W, H, 30, 3);
    h += '<g fill="none" stroke="var(--ink-line)" stroke-width="1.1" stroke-linejoin="round">' + sg.lines.map(l => { const q = l[0] === "d" ? l.slice(1) : l;
      return '<polyline points="' + q.map(i => X(sg.stars[i]).toFixed(1) + "," + Y(sg.stars[i]).toFixed(1)).join(" ") + '"/>'; }).join("") + "</g>";
    const pts = sg.stars.map(st => ({ x: X(st), y: Y(st), r: st.bright ? 11 : st.grey ? 1.5 : 3, bright: st.bright }));
    const segs = []; sg.lines.forEach(l => { const q = l[0] === "d" ? l.slice(1) : l; for (let i = 1; i < q.length; i++) segs.push([X(sg.stars[q[i - 1]]), Y(sg.stars[q[i - 1]]), X(sg.stars[q[i]]), Y(sg.stars[q[i]])]); });
    const sizes = sg.stars.map(st => st.bright ? { w: short(st.s.id).length * 6.2 + 6, h: 14 } : { w: 1, h: 1 });
    const LB = KC.signs.placeLabels(pts, segs, sizes, W, H);
    let labels = "";
    sg.stars.forEach((st, i) => {
      const x = pts[i].x, y = pts[i].y;
      if (st.grey) { h += '<circle class="sg-grey" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="1.4" fill="var(--muted)" opacity=".55"/>'; return; }
      if (!st.bright) { h += '<path d="' + spark(x, y, 3) + '" fill="var(--muted)" opacity=".7"/>'; return; }
      const sh = shared.indexOf(st.s.id) >= 0;
      h += (sh ? '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="15" fill="none" stroke="var(--star)" stroke-width="1.4" stroke-dasharray="2 3"/>' : "")
        + '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="11" fill="var(--star)" opacity=".16"/><path d="' + spark(x, y, 8) + '" fill="var(--star)"/>';
      const b = LB[i];
      labels += '<text x="' + (b.x + b.w / 2).toFixed(1) + '" y="' + (b.y + 11).toFixed(1) + '" text-anchor="middle" font-size="10.5" font-weight="' + (sh ? 700 : 600) + '" font-family="Inter,sans-serif" fill="currentColor" paint-order="stroke" stroke="var(--panel)" stroke-width="3">' + esc(short(st.s.id)) + "</text>";
    });
    const sub = sg.kind === "even" ? t("sign.even") : sg.main.map(m => short(m.id)).join(" + ");
    const al = sg.dnd ? KC.dnd.alignment(st0, KC.portrait.compute(st0), null) : null;
    const wl = sg.wod ? KC.wod.lines(KC.wod.details(st0, KC.portrait.compute(st0), null, sg.line, sg.id), t) : null;
    return '<div class="sg-mini' + (sg.dnd ? " sg-dnd" : sg.wod ? " sg-wod" : "") + '"' + (sg.wod ? ' data-id="' + sg.id + '"' : "") + '><div class="who">' + esc(who) + '</div><div class="nm">' + esc(name) + "</div>"
      + (wl ? '<div class="rl">' + esc(wl.rl) + '</div><div class="grp">' + esc(wl.sub) + '</div><div class="grp">' + esc(sub) + "</div>" : sg.dnd ? '<div class="rl">' + esc(t("dnd.r." + KC.dnd.race(st0, null)) + " · " + t("dnd.lvlShort", { n: KC.dnd.level(st0, null) })) + '</div><div class="grp">' + esc(t("dnd.s." + sg.cls + "." + sg.sub)) + '</div><div class="grp">' + esc(sub) + '</div><div class="al">' + esc(t("dnd.al." + al)) + "</div>" : '<div class="grp">' + esc(sub) + "</div>")
      + h + labels + "</svg></div>";
  }
  /* v591: the same switch as in the portrait (v597: + World of Darkness); v599: its choice is remembered per view */
  const modeSwitch = scope => KC.wod.switchHTML(scope);   /* scope "pair" | "group": remembered separately (v599) */
  /* v597: the group in World of Darkness mode — the coterie / pack / … : everyone's clan (tribe, kith, house) and lines */
  function wodGroupHTML(P) {
    const line = KC.wod.sub("group");
    const rows = P.map(p => { const d = KC.portrait.compute(p.st), sg = KC.wod.pick(d, line);
      if (!sg) return '<li><span class="who">' + esc(p.name) + '</span><span class="what">' + esc(t("dnd.al.roll")) + "</span></li>";
      const ln = KC.wod.lines(KC.wod.details(p.st, d, null, line, sg.id), t);
      return '<li data-id="' + sg.id + '"><span class="who">' + esc(p.name) + '</span><span class="what">' + esc(t("wod." + line + "." + sg.id)) + '</span><span class="al">' + esc(ln.rl) + '</span><span class="sub">' + esc(ln.sub) + "</span></li>"; });
    return '<div class="sp-box sp-party sp-wodgrp">' + head("sp.wod.grp." + line) + '<ul class="dnd-party">' + rows.join("") + "</ul>" + KC.wod.noticeHTML() + "</div>";
  }
  /* v596: who the party can beat — one monster for each of Medium / Hard / Deadly */
  function foesHTML(levels) {
    return '<div class="dnd-foes"><div class="fh">' + esc(t("sp.party.foes")) + "</div>" + KC.dnd.foes(levels).map((f, i) =>
      '<div class="dnd-foe" data-foe="' + f.id + '"><span class="lv">' + esc(t("sp.foe." + ["m", "h", "d"][i])) + "</span><b>" + esc(t("dnd.m." + f.id)) + '</b><span class="cr">CR ' + f.cr + "</span></div>").join("")
      + '<div class="dnd-note">' + esc(t("sp.party.note")) + "</div></div>";
  }
  /* v596: the group in DnD mode — everyone's race, class, level and alignment, the party's levels and its foes */
  function partyHTML(P) {
    const rows = P.map(p => { const d = KC.portrait.compute(p.st), sg = KC.dnd.pick(d), lv = KC.dnd.level(p.st, null);
      if (!sg) return { lv, html: '<li><span class="who">' + esc(p.name) + '</span><span class="what">' + esc(t("dnd.al.roll")) + "</span></li>" };
      const al = KC.dnd.alignment(p.st, d, null);
      return { lv, html: '<li data-cls="' + sg.cls + '"><span class="who">' + esc(p.name) + '</span><span class="what">' + esc(t("dnd.r." + KC.dnd.race(p.st, null)) + " · " + t("dnd.c." + sg.cls) + " · " + t("dnd.lvlShort", { n: lv }))
        + '</span><span class="al">' + esc(t("dnd.al." + al)) + '</span><span class="sub">' + esc(t("dnd.s." + sg.cls + "." + sg.sub)) + "</span></li>" }; });
    const lv = rows.map(r => r.lv), sum = lv.reduce((a, b) => a + b, 0);
    return '<div class="sp-box sp-party">' + head("sp.party.h") + '<ul class="dnd-party">' + rows.map(r => r.html).join("") + "</ul>"
      + '<div class="dnd-sum">' + esc(t("sp.party.lvl", { sum, avg: Math.round(sum / lv.length) })) + "</div>" + foesHTML(lv) + "</div>";
  }

  /* how close two DnD figures are: the same variant; the same class; a main group in common; nothing */
  function dndCloseness(a, b) {
    const ga = a.main.map(m => m.id), shared = ga.filter(g => b.main.some(m => m.id === g));
    return { level: a.key === b.key ? "same" : a.cls === b.cls ? "cls" : shared.length ? "near" : "far", shared };
  }
  function pairSigns(A, B, nA, nB) {
    if (!KC.signs) return "";
    const md = KC.dnd && KC.wod ? KC.dnd.mode("pair") : "sign", dn = md === "dnd", wd = md === "wod", line = wd ? KC.wod.sub("pair") : "";
    const pick = dn ? KC.dnd.pick : wd ? d => KC.wod.pick(d, line) : KC.signs.pick;
    const a = pick(KC.portrait.compute(A)), b = pick(KC.portrait.compute(B));
    if (!a || !b) return "";
    const P = dn ? "sp.dnd." : "sp.sg.";
    const c = dn ? dndCloseness(a, b) : wd ? KC.wod.closeness(a, b) : KC.signs.closeness(a, b), n = { same: 3, mirror: 2, cls: 2, near: 1, far: 0 }[c.level];
    /* World of Darkness: the level names per line ("One clan", "One coterie", …), the reasons as in DnD */
    const lvl = wd ? t("sp.wod." + c.level + "." + line) : t(P + c.level);
    const why = c.level === "near" ? t((wd ? "sp.dnd." : P) + "nearWhy", { g: c.shared.map(short).join(", ") }) : wd ? t(c.level === "same" ? "sp.wod.sameWhy" : "sp.dnd.farWhy") : t(P + c.level + "Why");
    return '<div class="sp-box sp-signs' + (dn ? " sp-dnd" : wd ? " sp-wod" : "") + '">' + head(dn ? "sp.dnd.h" : wd ? "sp.wod.h." + line : "sp.sg.h") + (KC.dnd && KC.wod ? modeSwitch("pair") : "")
      + '<div class="sg-match"><span class="st">' + "✦".repeat(n) + "<i>" + "✦".repeat(3 - n) + "</i></span>" + esc(lvl) + "</div>"
      + '<div class="sg-why">' + esc(why) + '</div><div class="sg-pair">' + signMini(a, nA, c.shared, A) + signMini(b, nB, c.shared, B) + "</div>"
      + (dn ? foesHTML([KC.dnd.level(A, null), KC.dnd.level(B, null)]) : wd ? KC.wod.noticeHTML() : "") + "</div>";
  }

  /* ---------- two people: paired planets ---------- */
  function pairSVG(A, B, nA, nB) {
    const la = liked(A), lb = liked(B), c = common(la, lb), a = Object.keys(la).length, b = Object.keys(lb).length, s = a && b ? c / Math.sqrt(a * b) : 0;
    const W = 360, H = 200, cx = W / 2, cy = 100, sep = 44 + (1 - s) * 120;
    let g = '<svg viewBox="0 0 ' + W + " " + H + '" role="img"><defs>' + planetAllDefs() + "</defs>" + dust(W, H, 50, 4);
    g += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (sep / 2) + '" ry="' + (sep / 6 + 6) + '" fill="none" stroke="var(--ink-line)" stroke-dasharray="3 4"/>';
    g += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="var(--star)"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (sep / 2 + 30) + '" fill="var(--star)" opacity="' + (.04 + s * .1).toFixed(2) + '"/>';
    g += planetBody(cx - sep / 2, cy, 15, (A.meta || {}).role || "") + planetBody(cx + sep / 2, cy, 15, (B.meta || {}).role || "");
    const nm = (x, v) => '<text x="' + x + '" y="' + (cy + 40) + '" text-anchor="middle" font-size="12.5" font-weight="600" font-family="Fraunces,Georgia,serif" fill="currentColor">' + esc(v) + "</text>";
    g += nm(cx - sep / 2, nA) + nm(cx + sep / 2, nB);
    g += '<text x="' + cx + '" y="' + (cy - 44) + '" text-anchor="middle" font-size="12" font-family="Inter,sans-serif" fill="currentColor">' + esc(t("sp.pair.common", { n: c })) + ' · <tspan font-weight="700" fill="var(--star)">' + esc(t("sp.pair.sim", { p: Math.round(s * 100) })) + "</tspan></text>";
    g += '<text x="' + cx + '" y="' + (H - 12) + '" text-anchor="middle" font-size="10.5" font-family="Inter,sans-serif" fill="var(--muted)">' + esc(t("sp.pair.cap")) + "</text></svg>";
    return '<div class="sp-box">' + head("sp.pair.h") + g + pairStars(A, B, nA, nB) + "</div>" + pairSigns(A, B, nA, nB);
  }
  KC.space = { groupSVG, pairSVG, pairSigns, simMatrix, liked, modeSwitch, partyHTML, foesHTML, wodGroupHTML };
})(window.KC);
