/* form/wh.js — the joke "Warhammer 40,000 factions" mode of the portrait (v610, owner): 14 factions, each with its own
   constellation (own drawings of common symbols, approved Oct 3 — never a copy of an emblem). Fan-made and unofficial.
   No sub-types (owner): only the faction; the Orks also get "Your WAAAGH" with as many A's as it is loud.
   Score of a faction = Σ w·z(cluster) / Σ|w| + a bias (KC.clusters: the 42 clusters, z = above / below the usual value).
   Profiles = the owner's plan of Oct 2 (one main cluster per faction, helpers, one that gets in the way).
   The Tyranids also have a rule before the profiles — "the Great Devourer": a list that eats everything (≥ 90 % of the items
   answered, ≤ 10 % No, ≥ 30 % Love). Biases: equal shares on 1400 synthetic lists shaped like the owner's group (Oct 3).
   Nothing is stored except the chosen mode (KC.dnd.mode, value "wh"). Names: "wh.f.<id>". Switch: KC.FEATURES.wh. */
(function (KC) {
  const FACTIONS = ["sm", "csm", "gk", "sob", "ig", "mech", "dmech", "necrons", "aeldari", "drukhari", "harlequins", "tau", "orks", "tyranids"];
  /* owner's plan (Oct 2): cluster -> weight */
  const PROF = { sm: "armor1 vows.6 protocol.5 filth-.4", csm: "extreme1 blood.6 taboo.5 filth.4 vows-.4 home-.3", gk: "vows1 armor.5 fire.3 taboo-.7 filth-.7",
    sob: "fire1 penance.8 vows.4", ig: "protocol1 pack.5 cold.4 stage-.3", mech: "machines1 lab.7 object.4 home-.3", dmech: "machines.8 flesh.8 extreme.4 home-.4",
    necrons: "stasis1 iron.5 protocol.4 classic-.3", aeldari: "orgasm1 rope.6 vows.4 filth-.4", drukhari: "property1 extreme.7 flesh.4 home-.4",
    harlequins: "stage1 watch.5 edge.3 protocol-.3", tau: "machines.8 watch.8 service.5 extreme-.4", orks: "pack1 spank.5 wild.5 protocol-.4", tyranids: "devour1 size.6 taboo.3" };
  /* measured Oct 3: equal shares on synthetic lists */
  const BIAS = { sm: 0.09, csm: -0.11, gk: 0.02, sob: -0.1, ig: 0.13, mech: 0.1, dmech: 0.01, necrons: -0.03, aeldari: 0.17, drukhari: 0.02,
    harlequins: -0.18, tau: -0.01, orks: 0.14, tyranids: -0.23 };
  const DEVOURER = { ANSWERED: .9, NO: .1, LOVE: .3 };
  /* WAAAGH (owner, Oct 3): A's = 1 + one per 6 % of Love among the answers + the mob (Pack above usual +1, z ≥ 1 +2)
     + the brawl (Spanking z ≥ 1 +1), within 1–12 */
  const WAAAGH = { LOVE: 6, MIN: 1, MAX: 12 };
  /* [9 stars of the groups, grey stars, lines ("d" first = dashed), 3 bright slots], 100×100 */
  const FIG = {
    "sm": [[[10,90],[19,68],[32,81],[89,17],[96,84],[88,92],[15,11],[51,74],[49,36]],[[25,75],[30,77],[82,10],[72,15],[68,25],[57,30],[53,40],[43,45],[38,55],[28,60],[23,70],[75,77],[81,71],[83,69],[39,46],[73,79],[45,39],[54,61],[56,78],[62,69]],[[0,9],[1,2],[10,3,11,11,12,13,14,15,16,17,18,19,10],[4,5,20,21,4],[22,8,23,24,22],[25,6],[26,7,27,28]],[3,6,0]],
    "csm": [[[50,4],[83,17],[96,50],[83,83],[50,96],[17,83],[4,50],[17,17],[50,41]],[[56,44],[59,50],[56,56],[50,59],[44,56],[41,50],[44,44],[56,14],[44,14],[80,29],[71,20],[86,56],[86,44],[71,80],[80,71],[44,86],[56,86],[20,71],[29,80],[14,44],[14,56],[29,20],[20,29]],[[8,9,10,11,12,13,14,15,8],[8,0],[16,0,17],[9,1],[18,1,19],[10,2],[20,2,21],[11,3],[22,3,23],[12,4],[24,4,25],[13,5],[26,5,27],[14,6],[28,6,29],[15,7],[30,7,31]],[0,3,5]],
    "gk": [[[72,2],[50,4],[42,28],[56,44],[90,26],[72,98],[8,66],[54,60],[60,86]],[[72,12],[72,22],[72,32],[72,44],[72,70],[60,8],[44,14],[46,40],[72,40],[14,94],[10,72],[16,99],[55,66],[56,70],[62,74],[59,80]],[[0,9,10,11,12,13,5],[9,14,1,15,2,16,3,17],[10,4,11],[6,7,8,18,6],[6,19,20],[18,20],["d",19,21],[22,23,24]],[0,2,6]],
    "sob": [[[50,6],[41,26],[59,26],[40,50],[60,50],[40,90],[60,90],[22,95],[78,95]],[[50,44],[43,36],[45,16],[55,16],[57,36],[50,50],[40,58],[43,63],[43,68],[50,98],[33,18],[28,12],[67,18],[72,12]],[[9,10,1,11,0,12,2,13,9],[9,14],[3,4,6,5,3],[15,16,17],[7,5],[6,8],[7,18,8],["d",19,20],["d",21,22]],[0,1,2]],
    "ig": [[[50,3],[24,12],[76,12],[32,58],[68,58],[50,72],[32,12],[68,12],[50,97]],[[50,12],[50,70],[44,8],[56,8],[32,34],[68,34],[22,22],[78,22],[38,97],[62,97]],[[0,9,10,8],[11,0,12],[1,6,9,7,2],[6,3,5,4,7],["d",13,14],[1,15],[2,16],[17,8,18]],[0,5,1]],
    "mech": [[[59,8],[93,37],[84,82],[41,96],[7,67],[16,22],[50,41],[60,58],[40,58]],[[39,21],[41,8],[61,21],[71,27],[84,22],[82,46],[82,58],[93,67],[71,77],[61,83],[59,96],[39,83],[29,77],[16,82],[18,58],[18,46],[7,37],[29,27],[60,46],[50,63],[40,46],[50,19],[79,68],[21,68]],[[9,10,0,11,12,13,1,14,15,16,2,17,18,19,3,20,21,22,4,23,24,25,5,26,9],[6,27,7,28,8,29,6],["d",6,30],["d",7,31],["d",8,32]],[0,2,4]],
    "dmech": [[[56,8],[85,26],[94,58],[76,87],[44,96],[15,78],[6,46],[24,17],[50,42]],[[42,20],[44,8],[58,20],[67,24],[76,17],[78,35],[82,44],[94,46],[82,60],[78,69],[85,78],[67,80],[58,84],[56,96],[42,84],[33,80],[24,87],[22,69],[18,60],[6,58],[18,44],[22,35],[15,26],[33,24],[32,52],[41,44],[59,44],[68,52],[59,60],[50,62],[41,60],[50,47],[55,52],[50,57],[45,52]],[[9,10,0,11,12,13,1,14,15,16,2,17,18,19,3,20,21,22,4,23,24,25,5,26,27,28,6,29,30,31,7,32,9],[33,34,8,35,36,37,38,39,33],[40,41,42,43,40]],[0,3,5]],
    "necrons": [[[50,4],[34,20],[66,20],[14,48],[86,48],[50,48],[40,96],[60,96],[62,80]],[[61,8],[62,33],[55,44],[45,44],[38,33],[39,8],[14,44],[14,52],[86,44],[86,52],[45,48],[55,48],[50,94],[50,62],[62,68],[50,76],[39,82]],[[0,9,2,10,11,12,13,1,14,0],[15,16],[17,18],[3,19,20,4],[12,19],[11,20],[5,21],[6,21,7],["d",22,23,8],["d",24,25]],[0,3,4]],
    "aeldari": [[[50,4],[63,26],[72,50],[56,88],[44,88],[28,50],[37,26],[50,34],[50,76]],[[68,72],[32,72],[60,56],[40,56]],[[0,1,2,9,3,4,10,5,6,0],[7,11,8,12,7],[0,7],[2,11],[3,8],[4,8],[5,12]],[0,2,5]],
    "drukhari": [[[14,92],[18,71],[33,81],[66,20],[51,53],[86,96],[24,30],[72,12],[52,52]],[[25,76],[31,78],[61,33],[47,39],[22,72],[92,90],[80,84],[72,66],[34,44],[34,14],[54,8],[80,62],[54,43],[31,35],[15,32],[35,5],[60,1]],[[0,9],[1,2],[10,4,11,3,12,13],[14,5],[5,15,16,8,17,6,18,19,7],[16,20],[8,21],[17,22],[6,23],[18,24],[19,25]],[3,5,7]],
    "harlequins": [[[6,46],[94,46],[50,38],[36,31],[64,31],[16,60],[84,60],[50,16],[50,59]],[[18,34],[82,34],[66,63],[55,55],[45,55],[34,63],[23,47],[32,41],[41,47],[32,52],[59,47],[68,41],[77,47],[68,52],[56,24],[50,32],[44,24],[2,66],[98,66]],[[0,9,3,2,4,10,1,6,11,12,8,13,14,5,0],[15,16,17,18,15],[19,20,21,22,19],[7,23,24,25,7],["d",0,26],["d",1,27]],[0,1,7]],
    "tau": [[[50,18],[50,37],[23,54],[77,54],[8,48],[92,48],[50,65],[44,80],[56,80]],[[69,62],[31,62],[31,46],[50,43],[69,46],[39,46],[44,39],[56,39],[61,46],[44,64],[56,64],[50,96]],[[3,9,6,10,2,11,12,13,3],[14,15,1,16,17],[1,0],[2,4],[3,5],[18,7],[19,8],["d",6,20]],[0,4,5]],
    "orks": [[[3,36],[10,46],[16,36],[26,36],[42,36],[58,36],[74,64],[84,36],[97,64]],[[6,64],[13,64],[19,64],[32,64],[22,54],[29,54],[35,64],[48,64],[38,54],[46,54],[52,64],[65,64],[54,54],[62,54],[81,41],[74,36],[68,44],[68,56],[81,58],[81,52],[74,52],[84,64],[97,36],[84,50],[97,50],[97,55],[97,62]],[[0,9,1,10,2],[11,3,12],[13,14],[15,4,16],[17,18],[19,5,20],[21,22],[23,24,25,26,6,27,28,29],[7,30],[31,8],[32,33],[31,34],["d",35,8]],[0,4,8]],
    "tyranids": [[[36,2],[64,2],[50,18],[6,26],[94,26],[4,76],[96,76],[14,98],[86,98]],[[50,28],[61,32],[69,44],[72,60],[69,76],[61,88],[50,92],[39,88],[31,76],[28,60],[31,44],[39,32],[38,32],[40,22],[60,22],[62,32],[32,12],[42,10],[68,12],[58,10],[72,46],[88,38],[90,62],[70,76],[84,88],[28,46],[12,38],[10,62],[30,76],[16,88]],[[9,10,11,12,13,14,15,16,17,18,19,20,9],["d",9,15],[21,22,2,23,24],[22,25,0,26],[23,27,1,28],[29,30,4],[12,31,6],[32,33,8],[34,35,3],[18,36,5],[37,38,7]],[0,1,2]],
  };
  const parse = s => { const o = {}; s.split(" ").forEach(t => { const m = t.match(/^([a-z]+)(-?[\d.]+)$/); o[m[1]] = parseFloat(m[2]); }); return o; };
  const W = {}; FACTIONS.forEach(f => { W[f] = parse(PROF[f]); });
  function devourer(st, set) {
    let all = 0; KC.CATS.forEach(c => c.items.forEach(([, id]) => { if (!set || set.has(id)) all++; }));
    const sh = KC.clusters.shares(st, set);
    return all > 0 && sh.n / all >= DEVOURER.ANSWERED && sh.no / 100 <= DEVOURER.NO && sh.love / 100 >= DEVOURER.LOVE;
  }
  function scores(st, set) {
    const o = {}, zc = {};
    FACTIONS.forEach(f => { let n = 0, d = 0; Object.keys(W[f]).forEach(k => { if (zc[k] === undefined) zc[k] = KC.clusters.z(st, k, set); n += W[f][k] * zc[k]; d += Math.abs(W[f][k]); });
      o[f] = n / d + BIAS[f]; });
    return o;
  }
  function choose(st, d, set) {
    if (!KC.dnd.devs(d)) return null;
    if (devourer(st, set)) return "tyranids";
    const o = scores(st, set); return FACTIONS.reduce((a, f) => (o[f] > o[a] ? f : a), FACTIONS[0]);
  }
  function waaagh(st, set) {
    const sh = KC.clusters.shares(st, set), zp = KC.clusters.z(st, "pack", set), zs = KC.clusters.z(st, "spank", set);
    return Math.max(WAAAGH.MIN, Math.min(WAAAGH.MAX, 1 + Math.floor(sh.love / WAAAGH.LOVE + 1e-9) + (zp >= 1 ? 2 : zp >= 0 ? 1 : 0) + (zs >= 1 ? 1 : 0)));
  }
  const waaaghText = n => "W" + "A".repeat(n) + "GH!";
  function pick(d, st, set) {
    const sg = KC.signs.pick(d); if (!sg) return null;
    const id = choose(st, d, set || null); if (!id) return null;
    const [P, E, L, B] = FIG[id];
    const rest = d.sections.filter(s => KC.signs.GROUPS.indexOf(s.id) >= 0 && sg.main.indexOf(s) < 0);
    const stars = P.map(p => ({ x: p[0], y: p[1], bright: false, s: null }));
    sg.main.forEach((m, k) => { stars[B[k]].bright = true; stars[B[k]].s = m; });
    let r = 0; stars.forEach(s2 => { if (!s2.s) s2.s = rest[r++] || null; });
    E.forEach(p => stars.push({ x: p[0], y: p[1], grey: true, bright: false, s: null }));
    return { wh: true, id, stars, lines: L, main: sg.main, kind: sg.kind, many: sg.many, waaagh: id === "orks" ? waaagh(st, set || null) : null };
  }
  /* the title lines: over-title, name, one line (only the Orks: their WAAAGH) */
  const head = (sg, shared, t) => ({ over: t(shared ? "wh.their" : "wh.mine"), name: t("wh.f." + sg.id), rl: sg.waaagh ? t("wh.waaagh", { w: waaaghText(sg.waaagh) }) : null });
  function closeness(a, b) {
    const shared = a.main.map(m => m.id).filter(g => b.main.some(m => m.id === g));
    return { level: a.id === b.id ? "same" : shared.length ? "near" : "far", shared };
  }
  KC.wh = { FACTIONS, PROF, BIAS, DEVOURER, WAAAGH, FIG, devourer, scores, choose, waaagh, waaaghText, pick, head, closeness };
})(window.KC);
