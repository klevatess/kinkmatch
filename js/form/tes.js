/* form/tes.js — 🐉 The Elder Scrolls races (v648, owner, Oct 24): 12 figures — the ten playable races plus the Falmer and
   the Dwemer; own drawings (a crystal spire, a bow, the Red Mountain, an axe, a laurel wreath, a rose, a curved sword,
   tusks, the two moons, a lizard, a blind eye, a gear). Under the name one line: the birthsign («Знак рождения: Леди»),
   one of the 13 constellations of Tamriel, chosen separately by the clusters (as the Witcher's Sign), so any race can get any sign.
   Race = the groups (dev against the bot's lists) + CW × the clusters (KC.clusters.bot) + a bias; sign = the clusters + a bias.
   Biases fitted (local script, Oct 24) on the bot's calibration file — 40 people, an extended list's roles ½ each — at 90 %
   of the weight, synthetic lists 10 %: every race 2.5–4 of the 40, Khajiit kept higher on purpose (owner: target 5.5 of 40),
   every sign 2–4. Fan-made, unofficial. Switch: KC.FEATURES.tes. Names "tes.r.<race>", "tes.b.<sign>". */
(function (KC) {
  const RACES = ["altmer","bosmer","dunmer","nord","imperial","breton","redguard","orsimer","khajiit","argonian","falmer","dwemer"];
  const SIGNS = ["warrior","mage","thief","serpent","lady","steed","lord","apprentice","atronach","ritual","lover","shadow","tower"];
  const CW = 5;
  /* group letters as in the signs: n tenderness, b bondage, f fetishes, r role-play, d D/s, s S/M, x sex, v voyeurism, w fluids */
  const PROF = { altmer: "d1 r.25", bosmer: "x.5 s.25 v.25", dunmer: "s1 d.5", nord: "x1 s.5", imperial: "d.5 r.5 b.25", breton: "r1 n.5", redguard: "s.75 v.5", orsimer: "b.5 s.5 x.5", khajiit: "n.5 f.5 x.25", argonian: "w1 f.25", falmer: "b1 w.5 n-.5", dwemer: "f1 b.5" };
  const CPROF = { altmer: "protocol1 worship1 look1", bosmer: "hunt1 wild1 devour1 feast.5", dunmer: "fire1 blood1 property.5", nord: "cold1 spank1 classic.5", imperial: "armor1 protocol.5 service1 wardrobe1", breton: "words1 stage1 look.5", redguard: "edge1 public1 armor.5", orsimer: "iron1 size1 extreme.5", khajiit: "pet1 touch1 orgasm1", argonian: "devour1 taboo1 cum.5", falmer: "dark1 stasis1 filth1", dwemer: "machines1 lab1 iron.5" };
  const SPROF = { warrior: "spank1 armor1 hunt.5", mage: "words1 lab1", thief: "public1 taboo1", serpent: "blood1 extreme1", lady: "home1 touch1 worship.5", steed: "wild1 cold1", lord: "protocol1 property1", apprentice: "service1 object1", atronach: "machines1 fire1 stasis.5", ritual: "vows1 penance1", lover: "classic1 cum1 orgasm.5", shadow: "dark1 watch1", tower: "iron1 rope1" };
  const BIAS = { altmer: 0.168442, bosmer: 0.182157, dunmer: -1.132485, nord: 1.426154, imperial: 1.526484, breton: -2.070243, redguard: 0.264454, orsimer: 2.376181, khajiit: -0.531492, argonian: -1.981423, falmer: -0.459493, dwemer: 0.231262 };
  const SBIAS = { warrior: 0.594593, mage: 0.031093, thief: -0.070121, serpent: -0.538212, lady: -0.531397, steed: -0.870114, lord: 0.328437, apprentice: 0.245272, atronach: 0.616944, ritual: -0.080395, lover: -0.472926, shadow: 0.596928, tower: 0.1499 };
  /* [9 stars of the groups, grey stars, lines ("d" first = dashed), 3 bright slots], 100×100 */
  const FIG = {
    "altmer": [[[50,8],[42,36],[58,36],[40,92],[60,92],[36,48],[64,48],[30,92],[70,92]],[[32,56],[40,56],[60,56],[68,56],[26,92],[74,92],[50,36]],[[3,1,0,2,4],[1,2],[7,9,5,10],[11,6,12,8],[13,14],["d",0,15]],[0,5,6]],
    "bosmer": [[[30,8],[42,22],[48,50],[42,78],[30,92],[18,50],[92,50],[84,44],[84,56]],[[12,44],[12,56]],[[0,1,2,3,4],[0,5,4],[5,2,6],[7,6,8],["d",5,9],["d",5,10]],[6,0,4]],
    "dunmer": [[[6,92],[32,44],[40,40],[54,40],[62,44],[94,92],[44,24],[52,14],[46,4]],[[46,46],[47,38],[38,62],[44,78]],[[0,1,2,9,3,4,5],["d",10,6,7,8],["d",2,11,12]],[8,2,3]],
    "nord": [[[50,10],[28,10],[20,30],[28,50],[72,10],[80,30],[72,50],[50,42],[50,96]],[[50,18],[46,70],[54,74],[46,78],[54,82]],[[0,9,7,8],[9,1,2,3,7],[9,4,5,6,7],["d",10,11],["d",12,13]],[2,5,0]],
    "imperial": [[[50,90],[30,82],[70,82],[18,64],[82,64],[16,44],[84,44],[36,10],[64,10]],[[24,24],[76,24],[14,18],[6,40],[8,68],[24,92],[86,18],[94,40],[92,68],[76,92]],[[7,9,5,3,1,0,2,4,6,10,8],["d",9,11],["d",5,12],["d",3,13],["d",1,14],["d",10,15],["d",6,16],["d",4,17],["d",2,18]],[7,8,0]],
    "breton": [[[50,20],[62,26],[64,40],[52,48],[40,42],[42,30],[54,38],[32,60],[50,94]],[[52,30],[50,70],[44,74],[38,24],[58,82],[64,80],[44,86],[38,84]],[[0,1,2,3,4,5,9,6],[3,10,8],[10,7,11,10],["d",0,12,4],["d",13,14],["d",15,16]],[6,0,8]],
    "redguard": [[[12,96],[18,74],[34,86],[40,62],[58,42],[74,24],[90,6],[52,68],[72,50]],[[26,80],[34,82],[86,30]],[[0,9],[1,2],[9,3,4,5,6],[9,10,7,8,11,6]],[6,1,2]],
    "orsimer": [[[20,40],[80,40],[30,70],[70,70],[50,80],[36,66],[64,66],[34,28],[66,28]],[[30,48],[70,48],[24,20],[50,26],[76,20]],[[0,2,4,3,1],[5,9,7],[6,10,8],["d",5,6],["d",11,12,13]],[7,8,4]],
    "khajiit": [[[60,10],[22,36],[22,58],[60,86],[40,48],[76,40],[84,56],[68,46],[36,78]],[[36,16],[46,72],[46,26],[84,46],[76,62],[68,56],[76,44],[76,58]],[[0,9,1,2,8,3,10,4,11,0],[5,12,6,13,14,7,5],["d",15,16]],[0,3,5]],
    "argonian": [[[50,6],[28,34],[72,34],[30,72],[70,72],[50,30],[49,56],[54,96],[46,88]],[[44,14],[46,22],[54,22],[56,14],[50,22],[50,40],[52,74],[34,26],[66,26],[34,62],[66,62]],[[0,9,10,11,12,0],[13,5,14,6,15,8,7],[1,16,5,17,2],[3,18,6,19,4]],[0,7,6]],
    "falmer": [[[14,50],[86,50],[30,56],[50,60],[70,56],[24,20],[50,12],[76,20],[50,72]],[[30,38],[50,34],[70,38],[26,66],[74,66]],[[0,2,3,4,1],[9,5],[10,6],[11,7],["d",0,9,10,11,1],["d",2,12],["d",3,8],["d",4,13]],[6,0,1]],
    "dwemer": [[[50,8],[80,20],[92,50],[80,80],[50,92],[20,80],[8,50],[20,20],[50,50]],[[62,21],[79,38],[79,62],[62,79],[38,79],[21,62],[21,38],[38,21],[58,42],[42,58],[58,58],[42,42]],[[0,9,1,10,2,11,3,12,4,13,5,14,6,15,7,16,0],["d",17,8,18],["d",19,8,20]],[0,8,4]],
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
  let W = null, SW = null;
  const init = () => { if (W) return; W = {}; SW = {}; RACES.forEach(k => { W[k] = { g: parse(PROF[k], true), c: parse(CPROF[k], false) }; }); SIGNS.forEach(k => { SW[k] = { c: parse(SPROF[k], false) }; }); };
  function scores(d, st, set) { init(); const b = KC.clusters.bot(d, st, set); if (!b) return null; const o = {}; RACES.forEach(k => { o[k] = part(W[k], b) + BIAS[k]; }); return o; }
  function signScores(d, st, set) { init(); const b = KC.clusters.bot(d, st, set); if (!b) return null; const o = {}; SIGNS.forEach(k => { o[k] = part(SW[k], b) + SBIAS[k]; }); return o; }
  const choose = (d, st, set) => { const o = scores(d, st, set); return o ? best(o) : null; };
  const chooseSign = (d, st, set) => { const o = signScores(d, st, set); return o ? best(o) : null; };
  function pick(d, st, set) {
    const id = choose(d, st, set); if (!id) return null;
    const f = figure(id, d); if (!f) return null;
    return Object.assign({ tes: true, id, bsign: chooseSign(d, st, set) }, f);
  }
  /* the title lines: over-title, name ("Каджит"), one line ("Знак рождения: Леди") */
  const head = (sg, shared, t) => ({ over: t(shared ? "tes.their" : "tes.mine"), name: t("tes.r." + sg.id), rl: t("tes.sign", { s: t("tes.b." + sg.bsign) }) });
  KC.tes = { RACES, SIGNS, CW, PROF, CPROF, SPROF, BIAS, SBIAS, FIG, scores, signScores, choose, chooseSign, pick, head, closeness };
})(window.KC);
