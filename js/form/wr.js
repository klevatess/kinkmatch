/* form/wr.js — the joke "Servant of the Chaos gods" mode of the portrait (v610, owner), the fourth button next to
   ✦ Constellation | 🎲 DnD | 🦇 World of Darkness. Five patrons: Khorne, Nurgle, Tzeentch, Slaanesh and the Horned Rat.
   Fan-made and unofficial: names only, no Games Workshop texts or pictures; the signs were drawn after the owner's
   sketches and differ from the official symbols.

   Score of a god = 5 × (P/sP + (I − I0)/sI + Z/sZ + K/sK [+ LW · max(0, L − L0)/sL for Slaanesh]) + b; the highest wins.
   - P: the god's profile over the 9 portrait groups, Σ w·dev / Σ|w| (dev = group % − the person's average − TYP, KC.dnd.devs);
   - I: how much the god's own items are liked (Love 1, Yes .8, Maybe .3, No 0) minus the same over the whole list,
     in points; needs 4 answered items of the god, else 0; I0 = its usual value in real lists;
   - Z: Σ w·z(pole) / Σ w over the standardised poles (KC.dnd.zPoles, shared with the races and the WoD paths);
   - K (owner, Oct 3): attraction to the clusters of the Warhammer plan, Σ w·z(cluster) / Σ|w|;
     z = (100 × liked share of the cluster − its usual value) / its usual spread, 0 with fewer than 3 answers;
   - L (Slaanesh only): the share of Yes + Love among the answers, counted only above its usual value; weight LW = 4
     (owner, Oct 3: with 1.6 Slaanesh took 6 of 16 people of the owner's group).
   The s-constants (spread of each part), I0, L0, the cluster values and the biases b were measured on the owner's group
   (16 lists) and on 1000 synthetic lists shaped like them; b gives equal shares, then the owner's Nurgle −2 and
   Slaanesh −1 relative to that. All owner numbers are named constants below; a local script re-measures them.
   Mutations 0–10 (owner, Oct 3) — see MUT below; 10 = a Chaos spawn.
   Nothing is stored except the chosen mode (KC.dnd.mode, value "wr"). Names are texts: "wr.of.<id>". Can be switched off: KC.FEATURES.wr. */
(function (KC) {
  const GODS = ["khorne", "nurgle", "tzeentch", "slaanesh", "rat"];
  const LET = { N: "intimacy", B: "bondage", F: "fetishes", R: "role-play", D: "ds", S: "sm", X: "sex-penetration", V: "voyeurism-exhibitionism", W: "bodily-fluids" };
  /* owner-approved tables (plan of Sep 29) */
  const PROF = { khorne: "S1 D.4 X.2 N-.4", nurgle: "W1 F.2 B-.2 N-.4", tzeentch: "B1 F.5 R.3 X-.2", slaanesh: "X1 F1 V.5 N.3", rat: "D1 R.6 W.2 N-.4" };
  const POLE = { khorne: { hard: 1, rush: .6, body: .4 }, nurgle: { slow: 1, body: .6, private: .3 }, tzeentch: { gear: 1, mind: .6, ritual: .5 },
    slaanesh: { crowd: .8, spont: .5, body: .4 }, rat: { mind: 1, power: .6, private: .3 } };
  const ITEMS = {
    khorne: "blood-play knife-play piercing-temporary piercing-permanent nipple-piercing zippers-needles labia-sewing-needle labia-stapling medical-stapler scarification branding period-play injections-saline beating-hard punching brutal-treatment",
    nurgle: "hair-as-mop floor-licking sock-gag-own sock-gag-top irrumatio-to-vomiting mud-play trash-play human-ashtray cum-on-body cum-on-face bukkake food-smearing-sploshing pussy-juice-play forced-staying-in-sweat-cum latex-sweat spitting spitting-in-mouth leeches",
    tzeentch: "rope-bondage-shibari semenawa suspension-upright suspension-horizontal suspension-inverted partial-suspension predicament-bondage mummification vacbed sleep-sacks bondage-bag straight-jacket sex-machines sybian remote-controlled-toy vibro-egg-public magic-wand electricity-tens electricity-violet-wand shock-collar electricity-internal cbt-electrical vaginal-electrostimulation electricity-genitals-external electricity-anal electricity-genital-internal",
    slaanesh: "cow-play pig-play abandoned-building-sex orgy group-mixed overstimulation forced-orgasm edging rubber-latex-wearing leather-wearing corsets high-heel-wearing lingerie-wearing mirror-play erotic-photos stripping exhibitionism-friends",
    rat: "fear-play reducing-to-tears depersonalisation dronification objectification mindbreak kidnapping interrogations abandonment forced-self-degradation human-ashtray",
  };
  /* the clusters (their items, usual values and z) live in form/clusters.js (KC.clusters), shared with the Warhammer modes */
  /* owner, Oct 3: attraction (+) and repulsion (−) to the clusters */
  const K = { khorne: { blood: 1, flesh: .5, hunt: .4, armor: .3, stage: -.4 }, nurgle: { filth: 1, devour: .5, pack: .3, stage: -.3 },
    tzeentch: { machines: .7, stasis: .6, fire: .5, stage: .3, vows: -.3 }, slaanesh: { stage: .8, pack: .6, vows: -.4, penance: -.3 },
    rat: { property: .8, hunt: .6, filth: .4, vows: -.3 } };
  /* measured (Oct 3): usual item part I0, spreads s of every part, Slaanesh's excess, biases b (owner's group + synthetic) */
  const I0 = { khorne: -19, nurgle: -9, tzeentch: 2, slaanesh: 14, rat: -1 };
  const S = { khorne: { P: 4.01, I: 8.32, Z: 0.23, K: 0.43 }, nurgle: { P: 5.53, I: 8.91, Z: 0.19, K: 0.52 }, tzeentch: { P: 5.21, I: 7.01, Z: 0.28, K: 0.5 },
    slaanesh: { P: 4.16, I: 9.38, Z: 0.21, K: 0.42 }, rat: { P: 4.62, I: 11.02, Z: 0.27, K: 0.51 } };
  const EXCESS = { L0: 49, SL: 13, W: 4 };
  const BIAS = { khorne: -1.1, nurgle: -1.55, tzeentch: 3.57, slaanesh: -6.05, rat: 2.63 };
  const LIM = { ITEMS: 4, SCALE: 5 };
  const RW = { love: 1, yes: .8, maybe: .3, limit: 0 };
  /* the signs, drawn after the owner's sketches (approved Sep 29): [9 stars of the groups, grey stars, lines ("d" first =
     dashed), 3 bright slots] in a 100×100 box */
  const FIG = {
    khorne: [[[4,10],[34,10],[50,34],[66,10],[96,10],[50,62],[90,92],[10,92],[50,92]], [[43,16],[57,16],[50,45],[40,45],[60,45],[80,72],[20,72]],
      [[0,1,9,2,10,3,4],[2,11,5],[12,11,13],[5,14,6,8,7,15,5]], [2,5,8]],
    nurgle: [[[28,30],[72,30],[50,72],[28,10],[72,10],[50,92],[11,40],[89,40],[50,52]], [[38,13],[45,20],[48,30],[45,40],[38,47],[28,50],[18,47],[8,30],[11,20],[18,13],
      [82,13],[89,20],[92,30],[82,47],[72,50],[62,47],[55,40],[52,30],[55,20],[62,13],[60,55],[67,62],[70,72],[67,82],[60,89],[40,89],[33,82],[30,72],[33,62],[40,55]],
      [[3,9,10,11,12,13,14,15,6,16,17,18,3],[4,19,20,21,7,22,23,24,25,26,27,28,4],[8,29,30,31,32,33,5,34,35,36,37,38,8]], [0,1,2]],
    tzeentch: [[[86,8],[44,12],[16,58],[24,84],[44,92],[60,72],[76,72],[94,72],[94,56]], [[64,8],[28,16],[20,28],[30,40],[24,50],[16,72],[60,59],[68,61],[72,68],
      [72,76],[68,83],[60,85],[52,83],[48,76],[48,68],[52,61]], [[0,9,1,10,11,12,13,2,14,3,4],[15,16,17,18,19,20,21,22,23,24,15],[6,7,8]], [0,5,8]],
    slaanesh: [[[26,86],[40,52],[6,66],[62,36],[50,24],[90,8],[70,8],[90,28],[74,48]], [[26,46],[34,48],[44,58],[46,66],[44,74],[40,80],[34,84],[18,84],[12,80],
      [8,74],[8,58],[12,52],[18,48]], [[9,10,1,11,12,13,14,15,0,16,17,18,2,19,20,21,9],[1,3,5],[4,3,8],[6,5,7]], [0,5,3]],
    rat: [[[4,30],[96,30],[20,6],[80,6],[50,70],[64,97],[36,97],[27,30],[73,30]], [[4,40],[96,40],[16,14],[84,14]],
      [[9,0,7,8,1,10],[2,7,4,5],[3,8,4,6],["d",11,2],["d",12,3]], [4,7,8]],
  };

  const split = s => s.split(" ");
  const prof = {}; GODS.forEach(g => { const w = {}; split(PROF[g]).forEach(tk => { w[LET[tk[0]]] = parseFloat(tk.slice(1)); }); prof[g] = w; });
  let ALL = null;
  const allIds = () => ALL || (ALL = [].concat(...KC.CATS.map(c => c.items.map(([, id]) => id))));
  /* liked share (0–100) of the answered items among ids, and how many were answered */
  function liked(st, ids, set) {
    let n = 0, s = 0;
    ids.forEach(id => { if (set && !set.has(id)) return; const v = (st.items[id] || {}).interest; if (v) { n++; s += RW[v]; } });
    return { n, v: n ? 100 * s / n : null };
  }
  const clusterZ = (st, k, set) => KC.clusters.z(st, k, set);
  /* every part of every god: {god: {P, I, Z, K, L}} (I = null with too few answers) */
  function parts(st, d, set) {
    const dv = KC.dnd.devs(d), z = KC.dnd.zPoles(st, set), all = liked(st, allIds(), set).v;
    let n = 0, yl = 0; allIds().forEach(id => { if (set && !set.has(id)) return; const v = (st.items[id] || {}).interest; if (v) { n++; if (v === "yes" || v === "love") yl++; } });
    const L = n ? 100 * yl / n : 0, out = {};
    GODS.forEach(g => {
      let pn = 0, pd = 0; Object.keys(prof[g]).forEach(grp => { pn += prof[g][grp] * ((dv && dv.dev[grp]) || 0); pd += Math.abs(prof[g][grp]); });
      const it = liked(st, split(ITEMS[g]), set);
      let zn = 0, zd = 0; Object.keys(POLE[g]).forEach(p => { zn += POLE[g][p] * (z[p] || 0); zd += POLE[g][p]; });
      let kn = 0, kd = 0; Object.keys(K[g]).forEach(k => { kn += K[g][k] * clusterZ(st, k, set); kd += Math.abs(K[g][k]); });
      out[g] = { P: pn / pd, I: it.n >= LIM.ITEMS && all !== null ? it.v - all : null, Z: zn / zd, K: kn / kd, L };
    });
    return out;
  }
  /* st = the list, d = its portrait, set = the applied template -> {god: score} */
  function scores(st, d, set) {
    const p = parts(st, d, set), o = {};
    GODS.forEach(g => { const q = p[g], s = S[g];
      let v = q.P / s.P + (q.I === null ? 0 : (q.I - I0[g]) / s.I) + q.Z / s.Z + q.K / s.K;
      if (g === "slaanesh") v += EXCESS.W * Math.max(0, q.L - EXCESS.L0) / EXCESS.SL;
      o[g] = LIM.SCALE * v + BIAS[g]; });
    return o;
  }
  function choose(st, d, set) {
    if (!KC.dnd.devs(d)) return null;
    const sc = scores(st, d, set);
    return GODS.reduce((a, g) => (sc[g] > sc[a] ? g : a), GODS[0]);
  }
  /* portrait data + the list -> the figure in the same shape as a sign / a DnD class, or null */
  function pick(d, st, set) {
    const sg = KC.signs.pick(d); if (!sg) return null;
    const id = choose(st, d, set || null); if (!id) return null;
    const [P, E, L, B] = FIG[id];
    const rest = d.sections.filter(s => KC.signs.GROUPS.indexOf(s.id) >= 0 && sg.main.indexOf(s) < 0);
    const stars = P.map(p => ({ x: p[0], y: p[1], bright: false, s: null }));
    sg.main.forEach((m, k) => { stars[B[k]].bright = true; stars[B[k]].s = m; });
    let r = 0; stars.forEach(s2 => { if (!s2.s) s2.s = rest[r++] || null; });
    E.forEach(p => stars.push({ x: p[0], y: p[1], grey: true, bright: false, s: null }));
    return { wr: true, id, stars, lines: L, main: sg.main, kind: sg.kind, many: sg.many, mut: mutations(st, id, set || null) };
  }
  /* mutations 0–10 (owner, Oct 3: 10 = a Chaos spawn): N = round(MUT.BASE + MUT.K × the god's own measure), within 0–10.
     The measures (in spreads of real lists): Khorne — the Blood and Hard clusters; Nurgle — Filth and Taboo; Tzeentch — how many
     clusters are clearly above their usual value (change: the more varied the tastes); Slaanesh — the share of Yes + Love;
     the Horned Rat — Machines (warp technology) and Filth. */
  const MUT = { BASE: 4, K: 2, MAX: 10, STRONG: [6.94, 8.41] };
  const measure = {
    khorne: (st, set) => (KC.clusters.z(st, "blood", set) + KC.clusters.z(st, "extreme", set)) / 2,
    nurgle: (st, set) => (KC.clusters.z(st, "filth", set) + KC.clusters.z(st, "taboo", set)) / 2,
    tzeentch: (st, set) => (KC.clusters.strong(st, set) - MUT.STRONG[0]) / MUT.STRONG[1],
    slaanesh: (st, set) => (KC.clusters.shares(st, set).yesLove - EXCESS.L0) / EXCESS.SL,
    rat: (st, set) => (KC.clusters.z(st, "machines", set) + KC.clusters.z(st, "filth", set)) / 2,
  };
  const mutations = (st, god, set) => Math.max(0, Math.min(MUT.MAX, Math.round(MUT.BASE + MUT.K * measure[god](st, set || null))));
  /* the line under the name: "Mutations: N" (no "of 10", owner Oct 3), at 10 "Chaos spawn — mutations: 10" */
  const mutLine = (n, t) => n >= MUT.MAX ? t("wr.spawn") : t("wr.mut", { n });
  /* how close two patrons are: the same god; a main group in common; different gods */
  function closeness(a, b) {
    const shared = a.main.map(m => m.id).filter(g => b.main.some(m => m.id === g));
    return { level: a.id === b.id ? "same" : shared.length ? "near" : "far", shared };
  }
  /* the title lines: over-title, name, one line (the mutations) */
  const head = (sg, shared, t) => ({ over: t(shared ? "wr.their" : "wr.mine"), name: t("wr.of." + sg.id), rl: mutLine(sg.mut, t) });
  const noticeHTML = () => '<div class="wod-note">' + KC.esc(KC.i18n.t("wr.notOfficial")) + "</div>";

  KC.wr = { GODS, PROF, POLE, ITEMS, K, I0, S, EXCESS, BIAS, LIM, MUT, FIG, parts, scores, choose, pick, mutations, mutLine, head, closeness, noticeHTML };
})(window.KC);
