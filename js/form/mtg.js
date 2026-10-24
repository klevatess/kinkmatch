/* form/mtg.js — 🃏 Magic: The Gathering colours (v648, owner, Oct 24): 20 figures — the 10 Ravnica guilds (two colours)
   and the 10 three-colour sets (5 Alara shards, 5 Tarkir clans); own drawings made from each guild's or clan's description,
   never from its symbol or the mana symbols. Under the name one line: the dominant colour («Доминирует: Чёрный»).
   Colour score = the groups (dev against the bot's lists) + CW × the clusters (z on the bot's stick, KC.clusters.bot);
   a combination's score = the mean of its colours + its bias; the dominant colour = the strongest inside the combination
   + a colour bias. Biases fitted (local script, Oct 24) on the bot's calibration file — 40 people, an extended list's two
   roles ½ each — at 90 % of the weight, synthetic lists 10 %: every combination comes out for 1.5–3 of the 40 people,
   every colour leads for 19–21 %. Fan-made, unofficial. Switch: KC.FEATURES.mtg (locked at first). Names "mtg.c.<id>", "mtg.col.<c>". */
(function (KC) {
  const COLORS = ["W","U","B","R","G"];
  const CW = 5;
  /* group letters as in the signs: n tenderness, b bondage, f fetishes, r role-play, d D/s, s S/M, x sex, v voyeurism, w fluids */
  const PROF = { W: "d1 n.5 v-.25", U: "r1 b.75 x-.25", B: "s1 f.5 d.25 n-.5", R: "x1 v.75 s.25", G: "w1 n.5 f.25" };
  const CPROF = { W: "protocol1 vows1 service1 penance.5", U: "lab1 machines1 edge.5 stasis1 words.5", B: "blood1 extreme1 taboo1 property.5 filth.5", R: "fire1 spank1 public1 hunt.5 orgasm.5", G: "pet1 touch1 home.5 feast1 cum1 wild1" };
  const COMBOS = { azorius: "WU", dimir: "UB", rakdos: "BR", gruul: "RG", selesnya: "GW", orzhov: "WB", izzet: "UR", golgari: "BG", boros: "RW", simic: "GU", bant: "GWU", esper: "WUB", grixis: "UBR", jund: "BRG", naya: "RGW", abzan: "WBG", jeskai: "URW", sultai: "BGU", mardu: "RWB", temur: "GUR" };
  const BIAS = { azorius: -1.182486, dimir: -1.48053, rakdos: -2.031975, gruul: -1.86324, selesnya: -1.760107, orzhov: -0.707866, izzet: 0.137083, golgari: -0.19454, boros: 0.816798, simic: -0.96229, bant: 0.995274, esper: 0.602943, grixis: 0.588218, jund: 0.634891, naya: 0.693818, abzan: 0.91805, jeskai: 1.529789, sultai: 1.151032, mardu: 0.889445, temur: 1.225692 };
  const CBIAS = { W: 0.693816, U: -0.006239, B: 0.832292, R: -0.222222, G: -1.297647 };
  /* [9 stars of the groups, grey stars, lines ("d" first = dashed), 3 bright slots], 100×100 */
  const FIG = {
    "azorius": [[[50,8],[18,24],[82,24],[8,50],[92,50],[18,57],[82,57],[32,92],[68,92]],[[50,24],[50,88],[28,50],[72,50]],[[0,9,10],[7,10,8],[1,9,2],[1,3,5,11,1],[2,12,6,4,2],["d",3,11],["d",12,4]],[0,5,6]],
    "dimir": [[[50,8],[62,15],[38,15],[62,29],[38,29],[50,36],[64,78],[60,90],[50,90]],[[50,70],[64,70],[50,82],[60,82],[43,22],[50,18],[57,22],[50,26]],[[0,1,3,5,4,2,0],[5,8],[9,10,6],[11,12,7],["d",13,14,15,16,13]],[0,5,6]],
    "rakdos": [[[12,8],[88,8],[30,40],[70,40],[50,46],[36,72],[64,72],[50,88],[50,74]],[[16,28],[28,22],[38,42],[84,28],[72,22],[62,42],[40,74],[45,79],[55,79],[60,74],[37,56],[46,59],[54,59],[63,56]],[[2,9,0,10,11],[3,12,1,13,14],[2,5,7,6,3],[2,4,3],[15,16,8,17,18],["d",19,20],["d",21,22]],[0,1,7]],
    "gruul": [[[26,92],[74,92],[34,40],[66,32],[40,30],[52,26],[58,38],[84,10],[90,20]],[[34,92],[46,40],[66,92],[72,18],[78,26],[44,50],[44,88],[56,48],[56,88]],[[0,1],[9,2,4,10,5,6,3,11],[12,7,8,13,12],["d",14,15],["d",16,17],["d",3,12]],[5,7,1]],
    "selesnya": [[[30,44],[38,28],[50,20],[62,28],[70,44],[50,62],[50,90],[36,96],[64,96]],[[50,50]],[[6,5,9,2],[5,0],[5,4],[9,1],[9,3],[7,6,8],["d",0,1,2,3,4]],[2,7,8]],
    "orzhov": [[[50,4],[34,32],[66,32],[32,56],[68,56],[24,70],[76,70],[50,80],[50,88]],[[44,8],[56,8],[50,14],[40,18],[60,18],[50,70],[46,84],[54,84]],[[9,0,10,11],[11,12,1,3,5,6,4,2,13,11],[14,7],[15,7,16,8,15],["d",3,4]],[0,5,6]],
    "izzet": [[[40,8],[60,8],[24,80],[76,80],[30,92],[70,92],[52,40],[42,60],[44,82]],[[44,8],[44,30],[56,30],[56,8],[54,60]],[[0,1],[9,10,2,4,5,3,11,12],[6,7,13,8]],[6,7,8]],
    "golgari": [[[14,46],[36,18],[50,14],[64,18],[86,46],[40,86],[60,86],[76,70],[24,90]],[[22,30],[78,30],[40,46],[60,46],[76,90],[76,76],[70,76],[82,76],[30,46],[34,38],[50,46],[50,36],[70,46],[66,38]],[[0,9,1,2,3,10,4,0],[11,5],[12,6],[8,5,6,13],[13,14],[15,7,16,15],["d",17,18],["d",19,20],["d",21,22]],[2,7,5]],
    "boros": [[[50,4],[45,14],[55,14],[26,60],[74,60],[50,64],[50,82],[50,92],[38,22]],[[55,64],[45,64],[30,64],[70,64],[46,86],[54,86],[38,40],[34,30],[40,34],[62,40],[66,30],[60,34],[62,22]],[[1,0,2,9,10,1],[3,11,12,4],[5,6],[13,6,14,7,13],["d",15,16,17,8],["d",18,19,20,21]],[0,3,4]],
    "simic": [[[50,6],[30,28],[64,39],[51,50],[35,61],[70,72],[37,83],[48,94],[70,28]],[[64,17],[49,50],[30,72],[52,94],[36,17],[36,39],[65,61],[63,83]],[[0,9,8,2,10,4,11,6,12],[0,13,1,14,3,15,5,16,7],["d",9,13],["d",2,14],["d",4,15],["d",6,16]],[0,4,7]],
    "bant": [[[20,10],[80,10],[80,46],[20,46],[50,92],[50,26],[60,40],[40,40],[50,54]],[[66,76],[34,76],[50,76]],[[0,1,2,9,4,10,3,0],[5,6,8,7,5],["d",8,11]],[5,0,1]],
    "esper": [[[30,24],[70,24],[12,40],[88,40],[50,92],[38,40],[62,40],[50,24],[50,10]],[],[[0,1,3,4,2,0],[2,3],[0,5,7,6,1],[5,4,6],["d",7,8]],[4,2,3]],
    "grixis": [[[50,10],[24,34],[76,34],[34,64],[66,64],[42,78],[58,78],[38,48],[62,48]],[[30,50],[30,18],[70,18],[70,50],[42,66],[58,66],[34,40],[42,36],[46,44],[66,40],[58,36],[54,44],[46,20],[54,26],[48,32],[47,58],[50,52],[53,58],[50,66],[50,78]],[[9,1,10,0,11,2,12],[9,3,13,5,6,14,4,12],[15,16,17,7,15],[18,19,20,8,18],[0,21,22,23],["d",24,25,26],["d",27,28]],[7,8,0]],
    "jund": [[[20,22],[52,8],[80,24],[94,70],[22,56],[48,48],[76,58],[40,94],[60,94]],[[36,80],[14,34],[50,76],[46,24],[64,80],[84,38],[60,86],[84,78]],[[7,9,4,10,0],[9,11,5,12,1],[11,13,6,14,2],[13,8,7],[15,16,3]],[0,1,2]],
    "naya": [[[20,46],[38,30],[62,30],[80,46],[34,64],[66,64],[30,78],[70,78],[50,92]],[[50,56],[14,36],[36,16],[64,16],[86,36]],[[4,9,5,7,8,6,4],["d",0,10],["d",1,11],["d",2,12],["d",3,13]],[1,2,8]],
    "abzan": [[[12,36],[30,36],[70,36],[88,36],[12,92],[88,92],[50,30],[42,74],[58,74]],[[30,92],[70,92],[8,92],[92,92],[30,56],[70,56],[42,92],[50,66],[58,92],[50,56],[62,34],[50,38],[12,28],[21,36],[21,28],[30,28],[70,28],[79,36],[79,28],[88,28]],[[4,0,1,9],[10,2,3,5],[11,12],[13,14],[15,7,16,8,17],[18,6,19,20],["d",0,21],["d",22,23],["d",1,24],["d",2,25],["d",26,27],["d",3,28]],[6,0,3]],
    "jeskai": [[[6,92],[30,60],[94,92],[44,44],[72,44],[48,32],[68,32],[58,12],[58,50]],[[42,72],[52,50],[52,44],[64,50],[64,44],[58,36],[58,24],[18,92],[58,32]],[[0,1,9,8,2],[10,11],[12,13],[3,14,4,3],[5,15,6,5],[15,7],["d",1,16],["d",14,17]],[7,3,4]],
    "sultai": [[[20,76],[14,40],[32,58],[50,28],[68,58],[86,40],[80,76],[22,88],[78,88]],[[46,64],[50,58],[54,64],[50,70]],[[0,1,2,3,4,5,6,0],[7,8],[9,10,11,12,9],["d",0,7],["d",6,8]],[1,3,5]],
    "mardu": [[[30,4],[26,14],[34,14],[76,22],[64,34],[80,46],[30,44],[30,96],[30,16]],[[30,14],[84,26],[92,24],[86,40],[94,40],[80,32],[88,32]],[[1,0,2,1],[9,8,6,7],[8,3,4,5,6],["d",10,11],["d",12,13],["d",14,15]],[0,3,5]],
    "temur": [[[18,14],[40,6],[62,10],[28,40],[50,36],[72,38],[30,92],[52,92],[74,88]],[[32,70],[54,66],[76,66]],[[0,3,9,6],[1,4,10,7],[2,5,11,8]],[0,1,2]],
  };
  const parse = (s, grp) => { const o = {}; s.split(" ").forEach(t => { const m = t.match(/^([a-z]+)(-?[\d.]+)$/); o[grp ? KC.signs.KEY[m[1]] : m[1]] = parseFloat(m[2]); }); return o; };
  /* Σ w·dev / Σ|w| + CW · Σ w·z / Σ|w| on the bot's measuring stick (KC.clusters.bot) */
  function part(p, b) { let s = 0;
    if (p.g) { let n = 0, d = 0; Object.keys(p.g).forEach(g => { n += p.g[g] * (b.dev[g] || 0); d += Math.abs(p.g[g]); }); s += n / d; }
    if (p.c) { let n = 0, d = 0; Object.keys(p.c).forEach(c => { n += p.c[c] * b.z(c); d += Math.abs(p.c[c]); }); s += CW * n / d; }
    return s; }
  const best = o => Object.keys(o).reduce((a, k) => (o[k] > o[a] ? k : a), Object.keys(o)[0]);
  /* the figure: the sign's main groups on the 3 bright stars, the other groups on the rest (as the Witcher) */
  function figure(id, d) {
    const sg = KC.signs.pick(d); if (!sg) return null;
    const [P, E, L, B] = FIG[id];
    const rest = d.sections.filter(s => KC.signs.GROUPS.indexOf(s.id) >= 0 && sg.main.indexOf(s) < 0);
    const stars = P.map(p => ({ x: p[0], y: p[1], bright: false, s: null }));
    sg.main.forEach((m, k) => { stars[B[k]].bright = true; stars[B[k]].s = m; });
    let r = 0; stars.forEach(s2 => { if (!s2.s) s2.s = rest[r++] || null; });
    E.forEach(p => stars.push({ x: p[0], y: p[1], grey: true, bright: false, s: null }));
    return { stars, lines: L, main: sg.main, kind: sg.kind, many: sg.many };
  }
  function closeness(a, b) {
    const shared = a.main.map(m => m.id).filter(g => b.main.some(m => m.id === g));
    return { level: a.id === b.id ? "same" : shared.length ? "near" : "far", shared };
  }
  let W = null;
  const init = () => { if (W) return; W = {}; COLORS.forEach(c => { W[c] = { g: parse(PROF[c], true), c: parse(CPROF[c], false) }; }); };
  /* colour scores (no bias) or null */
  function colours(d, st, set) { init(); const b = KC.clusters.bot(d, st, set); if (!b) return null; const o = {}; COLORS.forEach(c => { o[c] = part(W[c], b); }); return o; }
  function scores(o) { const s = {}; Object.keys(COMBOS).forEach(k => { const cs = COMBOS[k].split(""); s[k] = cs.reduce((a, c) => a + o[c], 0) / cs.length + BIAS[k]; }); return s; }
  const dominant = (o, id) => COMBOS[id].split("").reduce((a, c) => (o[c] + CBIAS[c] > o[a] + CBIAS[a] ? c : a), COMBOS[id][0]);
  function choose(d, st, set) { const o = colours(d, st, set); if (!o) return null; const id = best(scores(o)); return { id, dom: dominant(o, id) }; }
  function pick(d, st, set) {
    const ch = choose(d, st, set); if (!ch) return null;
    const f = figure(ch.id, d); if (!f) return null;
    return Object.assign({ mtg: true, id: ch.id, dom: ch.dom, cols: COMBOS[ch.id] }, f);
  }
  /* the title lines: over-title, name ("Ракдос"), one line ("Доминирует: Чёрный") */
  const head = (sg, shared, t) => ({ over: t(shared ? "mtg.their" : "mtg.mine"), name: t("mtg.c." + sg.id), rl: t("mtg.dom", { c: t("mtg.col." + sg.dom) }) });
  KC.mtg = { COLORS, CW, PROF, CPROF, COMBOS, BIAS, CBIAS, FIG, colours, scores, dominant, choose, pick, head, closeness };
})(window.KC);
