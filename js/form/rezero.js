/* form/rezero.js — the joke "Re:Zero sins" mode of the portrait (v623, owner, Oct 5–7): one of the seven deadly sins of
   Re:Zero − Starting Life in Another World, and a rank inside it: Follower (~50 %), Sin Archbishop (~35 %), Witch (~15 %).
   Fan-made and unofficial; no characters are named or described anywhere (several of them look like children), the guide
   describes only the sin and its powers.
   Six sins compete (like the Avatar elements): Σ w·dev(group) / Σ|w| + the clusters (Σ w·z / Σ|w| × CW) + a sin's own
   measure + a bias (equal shares on synthetic lists, local script):
     Lust — sex, voyeurism, role-play; Gluttony — fluids, fetishes; Wrath — S/M (+ aftercare: home);
     Pride — D/s, role-play, the Top role; Greed — the share of Yes / Love among the answers (wants everything);
     Envy — the share of Maybe among the answers (wants, but does not dare) + watching more than showing (owner).
   The rank = how far the sin is ahead of the second one (per-sin thresholds: 50 / 35 / 15 % on synthetic lists).
   Sloth (owner) — too lazy to finish the list: U = the share of unanswered items. U ≥ 75 % → Witch of Sloth; 60–75 % →
   Archbishop unless another sin is a Witch; 40–60 % → Follower unless another sin is an Archbishop or a Witch. A list
   filled from a template (at most 4 positive answers outside it, owner) counts against that template's items.
   Figures: own drawings as constellations (owner approved, Oct 5): Lust a pierced heart, Gluttony jaws under a moon,
   Greed a grasping hand, Wrath a flame with a chain, Sloth a broken spiral, Envy an eye with shadow tears, Pride a crown.
   Nothing is stored except the chosen mode (KC.dnd.mode, value "rz"). Switch: KC.FEATURES.rz. */
(function (KC) {
  const SINS = ["pride", "greed", "envy", "wrath", "sloth", "lust", "gluttony"];
  const RACE = ["pride", "greed", "envy", "wrath", "lust", "gluttony"];   /* the six that compete; sloth comes from U */
  const RANKS = ["follower", "archbishop", "witch"];
  /* group letters as in the signs (KC.signs.KEY) */
  const PROF = { lust: "x1 v.75 r.5", gluttony: "w1 f.75", wrath: "s1", pride: "d1 r.5", greed: "", envy: "" };
  const CPROF = { lust: "classic1 public1 stage1 cum1", gluttony: "devour1 cum1 taboo1 hunt1", greed: "lab1 wardrobe1 protocol1",
    wrath: "spank1 extreme1 fire1 blood1 home1", envy: "watch1 public-.5", pride: "protocol1 armor1 stage1 iron1" };
  const CW = 1.5;
  /* a sin's own measure: Greed = z of the Yes + Love share, Envy = z of the Maybe share (× K); Pride + ROLE for the Top role */
  const YL = [0.496, 0.123], MB = [0.318, 0.075], K = 8, ROLE = 4;   /* mean and spread of the shares on the real lists (v623) */
  const BIAS = {pride: -0.83, greed: -0.6, envy: -0.45, wrath: -1.67, lust: 4.55, gluttony: -1};
  /* lead over the second sin needed for Archbishop / Witch, per sin: the 50 % / 85 % points on synthetic lists, stretched
     ×1.35 / ×1.7 because real lists lean much harder one way than the synthetic ones (v623) */
  const LEAD = {pride: [4.4, 13.8], greed: [5.3, 13.8], envy: [3.9, 11.4], wrath: [4.2, 15.1], lust: [3.5, 11.8], gluttony: [4.4, 13.8]};
  const SLOTH = { follower: .4, archbishop: .6, witch: .75 }, OUT = 4;
  /* [9 stars of the groups, grey stars, lines ("d" first = dashed), 3 bright slots], 100×100 */
  const FIG = {
    lust: [[[30,16],[17,28],[18,46],[32,62],[50,84],[68,62],[82,46],[83,28],[50,30]],[[70,16],[40,18],[14,74],[88,14]],[[8,10,0,1,2,3,4,5,6,7,9,8],["d",11,12]],[4,8,5]],
    gluttony: [[[16,50],[84,50],[31,33],[50,28],[69,33],[31,67],[50,72],[69,67],[50,9]],[[40,43],[60,43],[40,58],[60,58],[43,8],[57,10]],[[0,2,3,4,1,7,6,5,0],[2,9,3,10,4],[5,11,6,12,7],["d",8,13],["d",8,14]],[3,4,5]],
    greed: [[[18,52],[34,20],[48,13],[62,18],[76,30],[40,92],[62,92],[34,72],[51,76]],[[38,58],[48,56],[57,57],[66,61]],[[5,7,0],[0,9],[9,10,11,12],[9,1],[10,2],[11,3],[12,4],[12,6],["d",5,6]],[8,3,5]],
    wrath: [[[50,90],[28,80],[20,60],[28,30],[38,52],[50,10],[60,46],[73,26],[80,60]],[[70,82],[14,74],[30,70],[70,58],[86,52]],[[0,1,2,3,4,5,6,7,8,9,0],["d",10,11],["d",12,13]],[5,7,2]],
    sloth: [[[42,11],[86,30],[85,60],[46,89],[29,73],[23,32],[80,46],[43,74],[49,51]],[[45,26],[69,62],[36,62],[39,37],[51,39],[63,50],[57,58],[47,58]],[[0,1,2,3,4,5,9,6,10,7],["d",7,11],[11,12,13,14,15,16,8]],[4,3,8]],
    envy: [[[15,40],[85,40],[31,26],[50,20],[69,26],[31,54],[50,60],[69,54],[50,90]],[[50,33],[57,40],[50,47],[43,40],[36,72],[30,86],[52,76],[66,72],[72,85],[50,40]],[[0,2,3,4,1,7,6,5,0],[9,10,11,12,9],["d",5,13,14],["d",6,15,8],["d",7,16,17]],[3,0,8]],
    pride: [[[20,62],[18,30],[34,48],[50,20],[66,48],[82,30],[80,62],[20,76],[80,76]],[[50,62],[50,8],[35,62],[65,62]],[[0,1,2,3,4,5,6],[0,11,9,12,6],[0,7,8,6],["d",3,10]],[3,1,5]]
  };
  const parse = (s, key) => { const o = {}; s.split(" ").filter(Boolean).forEach(t => { const m = t.match(/^([a-z]+)(-?[\d.]+)$/); o[key ? KC.signs.KEY[m[1]] : m[1]] = parseFloat(m[2]); }); return o; };
  let W = null, CWT = null;
  const init = () => { if (W) return; W = {}; CWT = {}; RACE.forEach(k => { W[k] = parse(PROF[k], true); CWT[k] = parse(CPROF[k], false); }); };
  let ALL = null;
  const all = () => { if (!ALL) { ALL = []; KC.CATS.forEach(c => c.items.forEach(([, id]) => ALL.push(id))); } return ALL; };
  /* answers of the list: answered, Yes + Love, Maybe, and the unanswered share U (against a template when it was filled from one) */
  function answers(st) {
    const ids = all(), known = new Set(ids); let n = 0, yl = 0, mb = 0; const pos = [];
    ids.forEach(id => { const v = (st.items[id] || {}).interest; if (!v) return; n++; if (v === "yes" || v === "love") { yl++; pos.push(id); } else if (v === "maybe") mb++; });
    let den = ids.length, ans = n;
    const T = KC.store && KC.store.tpl ? KC.store.tpl.starters().concat(KC.store.tpl.list()) : [];
    let bestT = null, bestOut = Infinity;
    T.forEach(x => { const s = new Set(x.ids); const out = pos.filter(id => !s.has(id)).length; if (out < bestOut || (out === bestOut && bestT && x.ids.length < bestT.ids.length)) { bestOut = out; bestT = x; } });
    if (bestT && bestOut <= OUT && pos.length) { const tid = bestT.ids.filter(id => known.has(id)); den = tid.length; ans = tid.filter(id => (st.items[id] || {}).interest).length; }
    return { n, yl: n ? yl / n : 0, mb: n ? mb / n : 0, U: den ? Math.max(0, 1 - ans / den) : 1 };
  }
  /* raw scores of the six (no bias) and the answers */
  function raw(d, st, set) {
    init(); const dv = KC.dnd.devs(d); if (!dv) return null;
    const a = answers(st), o = {}, zc = {};
    RACE.forEach(k => {
      let n = 0, den = 0; Object.keys(W[k]).forEach(g => { n += W[k][g] * (dv.dev[g] || 0); den += Math.abs(W[k][g]); });
      let cn = 0, cd = 0; Object.keys(CWT[k]).forEach(c => { if (zc[c] === undefined) zc[c] = KC.clusters.z(st, c, set); cn += CWT[k][c] * zc[c]; cd += Math.abs(CWT[k][c]); });
      o[k] = (den ? n / den : 0) + CW * cn / cd; });
    o.greed += K * (a.yl - YL[0]) / YL[1];
    o.envy += K * (a.mb - MB[0]) / MB[1];
    const role = (st.meta || {}).role; if (role === "dom") o.pride += ROLE; else if (role === "sub") o.pride -= ROLE / 2;
    return { o, a };
  }
  function scores(d, st, set) { const r = raw(d, st, set); if (!r) return null; RACE.forEach(k => { r.o[k] += BIAS[k]; }); return r; }
  const rankOf = (sin, lead) => lead >= LEAD[sin][1] ? "witch" : lead >= LEAD[sin][0] ? "archbishop" : "follower";
  /* {sin, rank} */
  function choose(d, st, set) {
    const r = scores(d, st, set); if (!r) return null;
    const ks = RACE.slice().sort((x, y) => r.o[y] - r.o[x]), sin = ks[0], rank = rankOf(sin, r.o[ks[0]] - r.o[ks[1]]), U = r.a.U;
    const R = RANKS.indexOf(rank);
    if (U >= SLOTH.witch) return { sin: "sloth", rank: "witch" };
    if (U >= SLOTH.archbishop && R < 2) return { sin: "sloth", rank: "archbishop" };
    if (U >= SLOTH.follower && R < 1) return { sin: "sloth", rank: "follower" };
    return { sin, rank };
  }
  function pick(d, st, set) {
    const sg = KC.signs.pick(d); if (!sg) return null;
    const c = choose(d, st, set || null); if (!c) return null;
    const [P, E, L, B] = FIG[c.sin];
    const rest = d.sections.filter(s => KC.signs.GROUPS.indexOf(s.id) >= 0 && sg.main.indexOf(s) < 0);
    const stars = P.map(p => ({ x: p[0], y: p[1], bright: false, s: null }));
    sg.main.forEach((m, k) => { stars[B[k]].bright = true; stars[B[k]].s = m; });
    let r = 0; stars.forEach(s2 => { if (!s2.s) s2.s = rest[r++] || null; });
    E.forEach(p => stars.push({ x: p[0], y: p[1], grey: true, hid: p.length > 2, bright: false, s: null }));
    return { rz: true, id: c.sin, rank: c.rank, stars, lines: L, main: sg.main, kind: sg.kind, many: sg.many };
  }
  /* over-title, name (the sin), one line: the rank ("Архиепископ греха Гордыни") */
  const head = (sg, shared, t) => ({ over: t(shared ? "rz.their" : "rz.mine"), name: t("rz.s." + sg.id), rl: t("rz.r." + sg.rank, { s: t("rz.g." + sg.id) }) });
  function closeness(a, b) {
    const shared = a.main.map(m => m.id).filter(g => b.main.some(m => m.id === g));
    return { level: a.id === b.id ? "same" : shared.length ? "near" : "far", shared };
  }
  KC.rz = { SINS, RACE, RANKS, PROF, CPROF, CW, YL, MB, K, ROLE, BIAS, LEAD, SLOTH, OUT, FIG, answers, raw, scores, rankOf, choose, pick, head, closeness };
})(window.KC);
