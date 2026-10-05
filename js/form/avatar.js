/* form/avatar.js — the joke "Avatar" mode of the portrait (v616, owner, Oct 5): the element (Water, Earth, Fire, Air) and its
   type, from Avatar: The Last Airbender / The Legend of Korra. Fan-made and unofficial. In English the art is "bending".
   Element = the groups (as the Witcher schools: Σ w·dev(group) / Σ|w|) + the clusters (Σ w·z / Σ|w| × CW) + a bias
   (equal shares on synthetic lists shaped like the owner's group, local script).
   Type (only inside the element; the rarest that applies wins; none → "Без особого типа"):
     Water: common Vines (rope), special Healing (home), rare Bloodbending (blood + D/s above the list's mean);
     Earth: common Sand (dark), special Metal (iron, when it beats dark), rare Lava (sex well above the mean) — v619;
     Fire:  special Lightning (the electricity items liked), rare Combustion (extreme + fire);
     Air:   none (owner).
     Spirit energy (energybending) — any element, very rare, beats the others: the "spirit" items mostly Yes / Love.
   The Avatar (ultra rare): Yes or Love on at least 90 % of ALL practices (of the applied template's items); then all four
   elements, the native one = the element that would have won; no type.
   Figures: the owner's element symbols drawn as constellations (own drawings, never the nations' emblems); the Avatar =
   the four symbols around a ring, bright stars = the centre + two in the native symbol (owner, Oct 5).
   Nothing is stored except the chosen mode (KC.dnd.mode, value "av"). Switch: KC.FEATURES.av. */
(function (KC) {
  const ELEMENTS = ["water", "earth", "fire", "air"];
  /* group letters as in the signs (KC.signs.KEY): n tenderness, b bondage, f fetishes, r role-play, d D/s, s S/M, x sex, v voyeurism, w fluids */
  /* v619 (owner, Oct 5): re-fitted so that seven people the owner knows get the elements he named (Water: bondage and
     role-play with sex; Earth: D/s and sex, the body; Fire: S/M without role-play; Air: voyeurism / exhibitionism); found
     by a local search over the weights with the shares kept equal on synthetic lists — the real lists stay local.
     v620: re-fitted again with a second list of one of those people (Earth / Lava); the hunt cluster joined Earth and Lava
     now reads sex + fluids */
  const PROF = { water: "n.25 b.5 r.75 s-.25 x.75 v.25 w-.75", earth: "n-1.25 b.5 f-.2 r-.5 d1 s.75 x1.5 v1.25 w.75", fire: "r-1.5 s1 x.25", air: "n-.25 b-.5 f-.25 r.55 d.25 v.5 w.75" };
  const CPROF = { water: "rope1 pet1 stage1 touch1 home1", earth: "classic1 cum1 devour1 iron1 protocol1 armor1 hunt1",
    fire: "spank1 extreme1 fire1 edge1 blood1", air: "watch1 public1 wild1 dark1" };
  const CW = 1.5;   /* the clusters' mean z × 1.5 is added to the groups' part */
  const BIAS = { water: 1.01, earth: 1.24, fire: -1.8, air: -.45 };
  /* type thresholds: cluster z, the sex + fluids groups' deviations (lava), the electricity items' liked share (0–100) — v620 */
  const T = { blood: .55, healing: .35, vines: .5, lava: 20, metal: .3, sand: .6, combustion: 1.1, lightning: 58 };
  const ELEC = "electricity-tens electricity-violet-wand shock-collar electricity-internal electricity-genitals-external electricity-anal electricity-genital-internal vaginal-electrostimulation cbt-electrical".split(" ");
  const SPIRIT = "personality-modification mindbreak depersonalisation dronification total-power-exchange name-change mantra-meditation rituals tantric-yoni".split(" ");
  const SPIRIT_MIN = 7, SPIRIT_SHARE = .85, AVATAR = .9;
  const RANK = { vines: "common", sand: "common", healing: "special", metal: "special", lightning: "special", blood: "rare", lava: "rare", combustion: "rare", spirit: "rare" };
  /* [9 stars of the groups, grey stars ([x, y, 0] = a hidden vertex), lines ("d" first = dashed), 3 bright slots], 100×100 */
  const FIG = {
    water: [[[50,14],[18,40],[50,40],[82,40],[34,54],[66,54],[24,68],[80,68],[50,32]],[[50,6],[66.8,9.3],[81.1,18.9],[90.7,33.2],[94,50],[90.7,66.8],[81.1,81.1],[66.8,90.7],[50,94],[33.2,90.7],[18.9,81.1],[9.3,66.8],[6,50],[9.3,33.2],[18.9,18.9],[33.2,9.3],[26,35],[34,40],[42,45],[58,35],[66,40],[74,45],[18,54],[26,49],[42,59],[50,54],[58,49],[74,59],[82,54],[31,63],[38,68],[45,73],[52,68],[59,63],[66,68],[73,73],[44,24],[46,30],[54,30],[56,24]],[["d",9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,9],[1,25,26,27,2,28,29,30,3],[31,32,4,33,34,35,5,36,37],[6,38,39,40,41,42,43,44,7],[0,45,46,8,47,48,0]],[0,2,5]],
    earth: [[[16,72],[38,38],[50,54],[62,30],[84,72],[50,72],[24,80],[76,80],[50,6]],[[94,50],[50,94],[6,50],[27,55],[73,51],[50,80]],[["d",8,9,10,11,8],[0,12,1,2,3,13,4,5,0],[6,14,7]],[3,1,5]],
    fire: [[[50,26],[64,44],[66,62],[50,74],[34,62],[36,44],[50,46],[50,67],[50,8]],[[90,80],[10,80],[58,35],[67,53],[61,70],[39,70],[33,53],[42,35],[55,53],[57,60],[54,66],[46,66],[43,60],[45,53]],[["d",8,9,10,8],[0,11,1,12,2,13,3,14,4,15,5,16,0],[6,17,18,19,7,20,21,22,6]],[0,6,3]],
    air: [[[14,38],[58,38],[68,26],[48,28],[20,52],[74,52],[84,63],[64,62],[26,66]],[[50,6],[66.8,9.3],[81.1,18.9],[90.7,33.2],[94,50],[90.7,66.8],[81.1,81.1],[66.8,90.7],[50,94],[33.2,90.7],[18.9,81.1],[9.3,66.8],[6,50],[9.3,33.2],[18.9,18.9],[33.2,9.3],[36,38],[66,33],[63,19],[55,18],[49,23],[47,52],[82,56],[79,70],[71,71],[65,67],[37,66],[48,66]],[["d",9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,9],[0,25,1,26,2,27,28,29,3],[4,30,5,31,6,32,33,34,7],[8,35,36]],[1,5,3]],
    avatar_water: [[[50,50],[50,5.9],[50,16.8],[79,39.9],[79,60.1],[55,70.6],[50,88.2],[24.4,45],[31.1,50.8]],[[50,4],[67.6,7.5],[82.5,17.5],[92.5,32.4],[96,50],[92.5,67.6],[82.5,82.5],[67.6,92.5],[50,96],[32.4,92.5],[17.5,82.5],[7.5,67.6],[4,50],[7.5,32.4],[17.5,17.5],[32.4,7.5],[36.6,16.8],[39.9,14.7,0],[43.3,16.8],[46.6,18.9,0],[53.4,14.7,0],[56.7,16.8],[60.1,18.9,0],[63.4,16.8],[36.6,22.7],[39.9,20.6,0],[43.3,22.7],[46.6,24.8,0],[50,22.7],[53.4,20.6,0],[56.7,22.7],[60.1,24.8,0],[63.4,22.7],[39.1,28.6],[42,26.5,0],[45,28.6],[47.9,30.7,0],[50.8,28.6],[53.8,26.5,0],[56.7,28.6],[59.7,30.7,0],[62.6,28.6],[47.5,10.1,0],[48.3,12.6],[50,13.4,0],[51.7,12.6],[52.5,10.1,0],[50,34.1],[82.4,43.7,0],[84.9,47.5],[86.1,51.3,0],[85.7,55],[83.6,58.4,0],[74.4,58.4,0],[72.3,55],[71.9,51.3,0],[73.1,47.5],[75.6,43.7,0],[79,48.3],[81.1,51.3,0],[81.9,54.2],[80.7,56.7,0],[79,57.1],[77.3,56.7,0],[76.1,54.2],[76.9,51.3,0],[66,50],[35.7,88.2],[40.3,81.1,0],[45,74],[50,80.7,0],[59.7,79.4,0],[64.3,88.2],[39.1,91.6],[50,91.6,0],[60.9,91.6],[50,66],[5.9,45],[15.1,45,0],[27.7,42.9,0],[28.6,39.9],[26.5,37,0],[23.1,36.6],[20.6,38.7,0],[20.2,40.8],[8.4,50.8],[19.7,50.8,0],[34.4,52.5,0],[35.3,55.5],[33.2,58.4,0],[29.8,58.8],[27.3,57.1,0],[26.9,55],[10.9,56.7],[15.5,56.7,0],[20.2,56.7],[34.1,50]],[["d",9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,9],[25,26,27,28,2,29,30,31,32],[33,34,35,36,37,38,39,40,41],[42,43,44,45,46,47,48,49,50],[1,51,52,53,54,55,1],["d",0,56],[3,57,58,59,60,61,4,62,63,64,65,66,3],[67,68,69,70,71,72,73,74,67],["d",0,75],[76,77,78,79,5,80,81,6,76],[82,83,84],["d",0,85],[86,87,7,88,89,90,91,92,93],[94,95,8,96,97,98,99,100,101],[102,103,104],["d",0,105]],[0,1,2]],
    avatar_fire: [[[50,50],[50,5.9],[50,16.8],[79,39.9],[79,60.1],[55,70.6],[50,88.2],[24.4,45],[31.1,50.8]],[[50,4],[67.6,7.5],[82.5,17.5],[92.5,32.4],[96,50],[92.5,67.6],[82.5,82.5],[67.6,92.5],[50,96],[32.4,92.5],[17.5,82.5],[7.5,67.6],[4,50],[7.5,32.4],[17.5,17.5],[32.4,7.5],[36.6,16.8],[39.9,14.7,0],[43.3,16.8],[46.6,18.9,0],[53.4,14.7,0],[56.7,16.8],[60.1,18.9,0],[63.4,16.8],[36.6,22.7],[39.9,20.6,0],[43.3,22.7],[46.6,24.8,0],[50,22.7],[53.4,20.6,0],[56.7,22.7],[60.1,24.8,0],[63.4,22.7],[39.1,28.6],[42,26.5,0],[45,28.6],[47.9,30.7,0],[50.8,28.6],[53.8,26.5,0],[56.7,28.6],[59.7,30.7,0],[62.6,28.6],[47.5,10.1,0],[48.3,12.6],[50,13.4,0],[51.7,12.6],[52.5,10.1,0],[50,34.1],[82.4,43.7,0],[84.9,47.5],[86.1,51.3,0],[85.7,55],[83.6,58.4,0],[74.4,58.4,0],[72.3,55],[71.9,51.3,0],[73.1,47.5],[75.6,43.7,0],[79,48.3],[81.1,51.3,0],[81.9,54.2],[80.7,56.7,0],[79,57.1],[77.3,56.7,0],[76.1,54.2],[76.9,51.3,0],[66,50],[35.7,88.2],[40.3,81.1,0],[45,74],[50,80.7,0],[59.7,79.4,0],[64.3,88.2],[39.1,91.6],[50,91.6,0],[60.9,91.6],[50,66],[5.9,45],[15.1,45,0],[27.7,42.9,0],[28.6,39.9],[26.5,37,0],[23.1,36.6],[20.6,38.7,0],[20.2,40.8],[8.4,50.8],[19.7,50.8,0],[34.4,52.5,0],[35.3,55.5],[33.2,58.4,0],[29.8,58.8],[27.3,57.1,0],[26.9,55],[10.9,56.7],[15.5,56.7,0],[20.2,56.7],[34.1,50]],[["d",9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,9],[25,26,27,28,2,29,30,31,32],[33,34,35,36,37,38,39,40,41],[42,43,44,45,46,47,48,49,50],[1,51,52,53,54,55,1],["d",0,56],[3,57,58,59,60,61,4,62,63,64,65,66,3],[67,68,69,70,71,72,73,74,67],["d",0,75],[76,77,78,79,5,80,81,6,76],[82,83,84],["d",0,85],[86,87,7,88,89,90,91,92,93],[94,95,8,96,97,98,99,100,101],[102,103,104],["d",0,105]],[0,3,4]],
    avatar_earth: [[[50,50],[50,5.9],[50,16.8],[79,39.9],[79,60.1],[55,70.6],[50,88.2],[24.4,45],[31.1,50.8]],[[50,4],[67.6,7.5],[82.5,17.5],[92.5,32.4],[96,50],[92.5,67.6],[82.5,82.5],[67.6,92.5],[50,96],[32.4,92.5],[17.5,82.5],[7.5,67.6],[4,50],[7.5,32.4],[17.5,17.5],[32.4,7.5],[36.6,16.8],[39.9,14.7,0],[43.3,16.8],[46.6,18.9,0],[53.4,14.7,0],[56.7,16.8],[60.1,18.9,0],[63.4,16.8],[36.6,22.7],[39.9,20.6,0],[43.3,22.7],[46.6,24.8,0],[50,22.7],[53.4,20.6,0],[56.7,22.7],[60.1,24.8,0],[63.4,22.7],[39.1,28.6],[42,26.5,0],[45,28.6],[47.9,30.7,0],[50.8,28.6],[53.8,26.5,0],[56.7,28.6],[59.7,30.7,0],[62.6,28.6],[47.5,10.1,0],[48.3,12.6],[50,13.4,0],[51.7,12.6],[52.5,10.1,0],[50,34.1],[82.4,43.7,0],[84.9,47.5],[86.1,51.3,0],[85.7,55],[83.6,58.4,0],[74.4,58.4,0],[72.3,55],[71.9,51.3,0],[73.1,47.5],[75.6,43.7,0],[79,48.3],[81.1,51.3,0],[81.9,54.2],[80.7,56.7,0],[79,57.1],[77.3,56.7,0],[76.1,54.2],[76.9,51.3,0],[66,50],[35.7,88.2],[40.3,81.1,0],[45,74],[50,80.7,0],[59.7,79.4,0],[64.3,88.2],[39.1,91.6],[50,91.6,0],[60.9,91.6],[50,66],[5.9,45],[15.1,45,0],[27.7,42.9,0],[28.6,39.9],[26.5,37,0],[23.1,36.6],[20.6,38.7,0],[20.2,40.8],[8.4,50.8],[19.7,50.8,0],[34.4,52.5,0],[35.3,55.5],[33.2,58.4,0],[29.8,58.8],[27.3,57.1,0],[26.9,55],[10.9,56.7],[15.5,56.7,0],[20.2,56.7],[34.1,50]],[["d",9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,9],[25,26,27,28,2,29,30,31,32],[33,34,35,36,37,38,39,40,41],[42,43,44,45,46,47,48,49,50],[1,51,52,53,54,55,1],["d",0,56],[3,57,58,59,60,61,4,62,63,64,65,66,3],[67,68,69,70,71,72,73,74,67],["d",0,75],[76,77,78,79,5,80,81,6,76],[82,83,84],["d",0,85],[86,87,7,88,89,90,91,92,93],[94,95,8,96,97,98,99,100,101],[102,103,104],["d",0,105]],[0,5,6]],
    avatar_air: [[[50,50],[50,5.9],[50,16.8],[79,39.9],[79,60.1],[55,70.6],[50,88.2],[24.4,45],[31.1,50.8]],[[50,4],[67.6,7.5],[82.5,17.5],[92.5,32.4],[96,50],[92.5,67.6],[82.5,82.5],[67.6,92.5],[50,96],[32.4,92.5],[17.5,82.5],[7.5,67.6],[4,50],[7.5,32.4],[17.5,17.5],[32.4,7.5],[36.6,16.8],[39.9,14.7,0],[43.3,16.8],[46.6,18.9,0],[53.4,14.7,0],[56.7,16.8],[60.1,18.9,0],[63.4,16.8],[36.6,22.7],[39.9,20.6,0],[43.3,22.7],[46.6,24.8,0],[50,22.7],[53.4,20.6,0],[56.7,22.7],[60.1,24.8,0],[63.4,22.7],[39.1,28.6],[42,26.5,0],[45,28.6],[47.9,30.7,0],[50.8,28.6],[53.8,26.5,0],[56.7,28.6],[59.7,30.7,0],[62.6,28.6],[47.5,10.1,0],[48.3,12.6],[50,13.4,0],[51.7,12.6],[52.5,10.1,0],[50,34.1],[82.4,43.7,0],[84.9,47.5],[86.1,51.3,0],[85.7,55],[83.6,58.4,0],[74.4,58.4,0],[72.3,55],[71.9,51.3,0],[73.1,47.5],[75.6,43.7,0],[79,48.3],[81.1,51.3,0],[81.9,54.2],[80.7,56.7,0],[79,57.1],[77.3,56.7,0],[76.1,54.2],[76.9,51.3,0],[66,50],[35.7,88.2],[40.3,81.1,0],[45,74],[50,80.7,0],[59.7,79.4,0],[64.3,88.2],[39.1,91.6],[50,91.6,0],[60.9,91.6],[50,66],[5.9,45],[15.1,45,0],[27.7,42.9,0],[28.6,39.9],[26.5,37,0],[23.1,36.6],[20.6,38.7,0],[20.2,40.8],[8.4,50.8],[19.7,50.8,0],[34.4,52.5,0],[35.3,55.5],[33.2,58.4,0],[29.8,58.8],[27.3,57.1,0],[26.9,55],[10.9,56.7],[15.5,56.7,0],[20.2,56.7],[34.1,50]],[["d",9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,9],[25,26,27,28,2,29,30,31,32],[33,34,35,36,37,38,39,40,41],[42,43,44,45,46,47,48,49,50],[1,51,52,53,54,55,1],["d",0,56],[3,57,58,59,60,61,4,62,63,64,65,66,3],[67,68,69,70,71,72,73,74,67],["d",0,75],[76,77,78,79,5,80,81,6,76],[82,83,84],["d",0,85],[86,87,7,88,89,90,91,92,93],[94,95,8,96,97,98,99,100,101],[102,103,104],["d",0,105]],[0,7,8]],
  };
  const parse = (s, key) => { const o = {}; s.split(" ").forEach(t => { const m = t.match(/^([a-z]+)(-?[\d.]+)$/); o[key ? KC.signs.KEY[m[1]] : m[1]] = parseFloat(m[2]); }); return o; };
  let W = null, CWT = null;
  const init = () => { if (W) return; W = {}; CWT = {}; ELEMENTS.forEach(k => { W[k] = parse(PROF[k], true); CWT[k] = parse(CPROF[k], false); }); };
  /* raw scores without the bias (calibration) and with it */
  function raw(d, st, set) {
    init(); const dv = KC.dnd.devs(d); if (!dv) return null;
    const o = {}, zc = {};
    ELEMENTS.forEach(k => {
      let n = 0, den = 0; Object.keys(W[k]).forEach(g => { n += W[k][g] * (dv.dev[g] || 0); den += Math.abs(W[k][g]); });
      let cn = 0, cd = 0; Object.keys(CWT[k]).forEach(c => { if (zc[c] === undefined) zc[c] = KC.clusters.z(st, c, set); cn += CWT[k][c] * zc[c]; cd += Math.abs(CWT[k][c]); });
      o[k] = n / den + CW * cn / cd; });
    return o;
  }
  function scores(d, st, set) { const o = raw(d, st, set); if (!o) return null; ELEMENTS.forEach(k => { o[k] += BIAS[k]; }); return o; }
  const best = o => Object.keys(o).reduce((a, k) => (o[k] > o[a] ? k : a), Object.keys(o)[0]);
  const choose = (d, st, set) => { const o = scores(d, st, set); return o ? best(o) : null; };
  const items = set => { const a = []; KC.CATS.forEach(c => c.items.forEach(([, id]) => { if (!set || set.has(id)) a.push(id); })); return a; };
  /* Yes + Love among ALL items (unanswered count as not) — the Avatar */
  function avatar(st, set) { const all = items(set); if (!all.length) return false; let n = 0; all.forEach(id => { const v = (st.items[id] || {}).interest; if (v === "yes" || v === "love") n++; }); return n >= AVATAR * all.length; }
  function spirit(st, set) {
    let n = 0, y = 0; SPIRIT.forEach(id => { if (set && !set.has(id)) return; const v = (st.items[id] || {}).interest; if (v) { n++; if (v === "yes" || v === "love") y++; } });
    return n >= SPIRIT_MIN && y >= SPIRIT_SHARE * n;
  }
  /* the type of an element: "spirit" | a canon type | null */
  function typeOf(el, d, st, set) {
    if (spirit(st, set)) return "spirit";
    const z = c => KC.clusters.z(st, c, set), dv = KC.dnd.devs(d);
    /* v619 (owner): Vines = ropes (plants that grab and bind); Lava = earth with raw passion (sex + fluids well above the
       list's mean, v620); Metal = iron when iron beats darkness; Sand = darkness and the senses (a sandstorm blinds) */
    if (el === "water") return z("blood") >= T.blood && dv && (dv.dev.ds || 0) > 0 ? "blood" : z("home") >= T.healing ? "healing" : z("rope") >= T.vines ? "vines" : null;
    if (el === "earth") return dv && (dv.dev["sex-penetration"] || 0) + (dv.dev["bodily-fluids"] || 0) >= T.lava ? "lava" : z("iron") >= T.metal && z("iron") >= z("dark") ? "metal" : z("dark") >= T.sand ? "sand" : null;
    if (el === "fire") { if (z("extreme") >= T.combustion && z("fire") >= 1) return "combustion"; const e = KC.clusters.liked(st, ELEC, set); return e.n >= 3 && e.v >= T.lightning ? "lightning" : null; }
    return null;
  }
  function pick(d, st, set) {
    const sg = KC.signs.pick(d); if (!sg) return null;
    const id = choose(d, st, set || null); if (!id) return null;
    const av = avatar(st, set || null);
    const [P, E, L, B] = FIG[av ? "avatar_" + id : id];
    const rest = d.sections.filter(s => KC.signs.GROUPS.indexOf(s.id) >= 0 && sg.main.indexOf(s) < 0);
    const stars = P.map(p => ({ x: p[0], y: p[1], bright: false, s: null }));
    sg.main.forEach((m, k) => { stars[B[k]].bright = true; stars[B[k]].s = m; });
    let r = 0; stars.forEach(s2 => { if (!s2.s) s2.s = rest[r++] || null; });
    E.forEach(p => stars.push({ x: p[0], y: p[1], grey: true, hid: p.length > 2, bright: false, s: null }));
    return { av: true, id, avatar: av, type: av ? null : typeOf(id, d, st, set || null), stars, lines: L, main: sg.main, kind: sg.kind, many: sg.many };
  }
  /* the title lines: over-title, name, one line ("Особый тип: Металл" / "Без особого типа" / the Avatar's native element) */
  const typeLine = (sg, t) => sg.type ? t("av.rank." + RANK[sg.type], { t: t("av.t." + sg.type) }) : t("av.none");
  const head = (sg, shared, t) => sg.avatar ? { over: t(shared ? "av.avTheir" : "av.avMine"), name: t("av.avatar"), rl: t("av.native", { e: t("av.e." + sg.id) }) }
    : { over: t(shared ? "av.their" : "av.mine"), name: t("av.e." + sg.id), rl: typeLine(sg, t) };
  function closeness(a, b) {
    const shared = a.main.map(m => m.id).filter(g => b.main.some(m => m.id === g));
    return { level: a.id === b.id ? "same" : shared.length ? "near" : "far", shared };
  }
  KC.av = { ELEMENTS, PROF, CPROF, CW, BIAS, T, ELEC, SPIRIT, SPIRIT_MIN, SPIRIT_SHARE, AVATAR, RANK, FIG, raw, scores, choose, avatar, spirit, typeOf, pick, head, closeness };
})(window.KC);
