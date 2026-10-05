/* form/witcher.js — the joke "Witcher schools" mode of the portrait (v612, owner, Oct 4): 6 schools, each with its own
   constellation (an animal head or figure, own drawings approved Oct 4 — never a copy of a medallion), and one of the five
   signs (Aard, Igni, Yrden, Quen, Axii; the same set for every school, shown only as a line: their drawings belong to the game).
   Fan-made and unofficial.
   School = the groups (as the World of Darkness clans): Σ w·dev(group) / Σ|w| + a bias (KC.dnd.devs: a group above / below the
   list's own mean). Sign = the clusters (as the 40K factions): Σ w·z(cluster) / Σ|w| + a bias. No "without a school" (owner).
   Biases: equal shares on synthetic lists shaped like the owner's group (local script, Oct 4).
   Nothing is stored except the chosen mode (KC.dnd.mode, value "wi"). Names: "wi.s.<school>", "wi.g.<sign>". Switch: KC.FEATURES.wi. */
(function (KC) {
  const SCHOOLS = ["wolf", "cat", "griffin", "bear", "viper", "manticore"];
  /* group letters as in the signs (KC.signs.KEY): n tenderness, b bondage, f fetishes, r role-play, d D/s, s S/M, x sex, v voyeurism, w fluids */
  const PROF = { wolf: "x1 n.6 s.5", cat: "s1 r.6 v.5 n-.4", griffin: "d1 r.6 n.5 w-.4", bear: "b1 s.6 v-.4", viper: "d1 f.6 v.5 n-.4", manticore: "f1 w.6 b.5 n-.4" };
  const SIGNS = ["aard", "igni", "yrden", "quen", "axii"];
  const SPROF = { aard: "spank1 hunt.6 wild.5", igni: "fire1 blood.6 extreme.5", yrden: "rope1 stasis.6 iron.5", quen: "armor1 touch.6 home.5", axii: "words1 worship.6 property.5" };
  const BIAS = { wolf: 2.62, cat: -0.01, griffin: 1.51, bear: -1.95, viper: -0.33, manticore: -1.85 };
  const SBIAS = { aard: 0.18, igni: -0.09, yrden: -0.14, quen: 0.09, axii: -0.04 };
  /* [9 stars of the groups, grey stars, lines ("d" first = dashed), 3 bright slots], 100×100 */
  const FIG = {
    "wolf": [[[22,6],[78,6],[40,22],[60,22],[24,46],[76,46],[32,60],[68,60],[50,90]],[[30,30],[70,30],[42,82],[58,82],[38,42],[42,44],[62,42],[58,44],[44,76],[50,80],[56,76]],[[9,0,2,3,1,10],[9,4,6,11,8,12,7,5,10],["d",13,14],["d",15,16],[17,18,19]],[0,1,8]],
    "cat": [[[24,16],[76,16],[79,63],[21,63],[10,62],[90,62],[12,76],[88,76],[50,62]],[[65,32],[62,30],[35,32],[38,30],[78,45],[68,78],[50,84],[32,78],[22,45],[40,50],[42,50],[58,50],[60,50],[46,68],[54,68],[36,66],[36,70],[64,66],[64,70]],[[9,1,10],[11,0,12],["d",12,10],[9,13,2,14,15,16,3,17,11],[18,19],[20,21],[8,22,23,8],[24,4],[25,6],[26,5],[27,7]],[0,1,8]],
    "griffin": [[[6,42],[12,52],[40,22],[36,34],[96,4],[96,24],[96,44],[78,96],[40,96]],[[14,32],[26,26],[54,24],[64,32],[68,46],[70,64],[74,80],[18,48],[22,44],[32,48],[40,56],[42,72],[39,34],[76,20],[86,8],[68,40],[82,30],[68,50],[84,46]],[[0,9,10,2,11,12,13,14,15,7],[0,1,16,17],[17,18,19,20,8],[3,21],["d",0,17],[12,22,23,4],[24,25,5],[26,27,6]],[0,3,4]],
    "bear": [[[14,22],[86,22],[81,37],[19,37],[81,71],[19,71],[50,88],[40,66],[60,66]],[[19,31],[19,13],[29,13],[34,22],[66,22],[71,13],[81,13],[81,31],[86,54],[68,83],[32,83],[14,54],[50,62],[60,76],[50,82],[40,76],[36,46],[38,46],[62,46],[64,46]],[[9,0,10,11,12],[13,14,15,1,16],[12,13],[2,2,17,4,18,6,19,5,20,3],["d",12,3],["d",13,2],[7,21,8,22,23,24,7],[25,26],[27,28]],[0,1,6]],
    "viper": [[[12,94],[34,92],[68,74],[44,58],[30,48],[46,26],[90,4],[94,34],[64,14]],[[56,86],[62,62],[32,34],[58,24],[72,8],[80,14],[70,22],[74,32],[82,26],[70,26],[78,10],[80,18],[84,30],[84,24],[66,14]],[[0,1,9,2,10,3,4,11,5,12],[12,13,6,14,15],[12,16,7,17,18],["d",19,20],["d",21,22],[8,23]],[6,7,8]],
    "manticore": [[[70,62],[49,91],[10,62],[31,33],[40,76],[90,32],[70,10],[52,24],[58,32]],[[64,80],[31,91],[16,80],[16,44],[49,33],[64,44],[30,56],[32,56],[48,56],[50,56],[34,70],[46,70],[84,50],[84,16],[58,16],[60,26]],[[0,9,1,10,11,2,12,3,13,14,0],[15,16],[17,18],[19,4,20],[0,21,5,22,6,23,24],[24,7,8,24]],[4,6,7]],
  };
  const parse = (s, key) => { const o = {}; s.split(" ").forEach(t => { const m = t.match(/^([a-z]+)(-?[\d.]+)$/); o[key ? KC.signs.KEY[m[1]] : m[1]] = parseFloat(m[2]); }); return o; };
  let W = null, SW = null;
  const init = () => { if (W) return; W = {}; SW = {}; SCHOOLS.forEach(k => { W[k] = parse(PROF[k], true); }); SIGNS.forEach(k => { SW[k] = parse(SPROF[k], false); }); };
  function scores(d) {
    init(); const dv = KC.dnd.devs(d); if (!dv) return null;
    const o = {}; SCHOOLS.forEach(k => { let n = 0, den = 0; Object.keys(W[k]).forEach(g => { n += W[k][g] * (dv.dev[g] || 0); den += Math.abs(W[k][g]); }); o[k] = n / den + BIAS[k]; });
    return o;
  }
  function signScores(st, set) {
    init(); const o = {}, zc = {};
    SIGNS.forEach(k => { let n = 0, den = 0; Object.keys(SW[k]).forEach(c => { if (zc[c] === undefined) zc[c] = KC.clusters.z(st, c, set); n += SW[k][c] * zc[c]; den += Math.abs(SW[k][c]); });
      o[k] = n / den + SBIAS[k]; });
    return o;
  }
  const best = o => Object.keys(o).reduce((a, k) => (o[k] > o[a] ? k : a), Object.keys(o)[0]);
  const choose = d => { const o = scores(d); return o ? best(o) : null; };
  const chooseSign = (st, set) => best(signScores(st, set));
  function pick(d, st, set) {
    const sg = KC.signs.pick(d); if (!sg) return null;
    const id = choose(d); if (!id) return null;
    const [P, E, L, B] = FIG[id];
    const rest = d.sections.filter(s => KC.signs.GROUPS.indexOf(s.id) >= 0 && sg.main.indexOf(s) < 0);
    const stars = P.map(p => ({ x: p[0], y: p[1], bright: false, s: null }));
    sg.main.forEach((m, k) => { stars[B[k]].bright = true; stars[B[k]].s = m; });
    let r = 0; stars.forEach(s2 => { if (!s2.s) s2.s = rest[r++] || null; });
    E.forEach(p => stars.push({ x: p[0], y: p[1], grey: true, bright: false, s: null }));
    return { wi: true, id, stars, lines: L, main: sg.main, kind: sg.kind, many: sg.many, wsign: chooseSign(st, set || null) };
  }
  /* the title lines: over-title, name ("School of the Cat"), one line ("Sign: Igni") */
  const head = (sg, shared, t) => ({ over: t(shared ? "wi.their" : "wi.mine"), name: t("wi.s." + sg.id), rl: t("wi.sign", { s: t("wi.g." + sg.wsign) }) });
  function closeness(a, b) {
    const shared = a.main.map(m => m.id).filter(g => b.main.some(m => m.id === g));
    return { level: a.id === b.id ? "same" : shared.length ? "near" : "far", shared };
  }
  KC.wi = { SCHOOLS, PROF, SIGNS, SPROF, BIAS, SBIAS, FIG, scores, signScores, choose, chooseSign, pick, head, closeness };
})(window.KC);
