/* form/ow.js — the joke "Warhammer: The Old World" mode of the portrait (v612, owner, Oct 4): 17 races, each with its own
   constellation (own drawings of common symbols, approved Oct 4 — never a copy of an emblem). Fan-made and unofficial.
   Kislev and Cathay come from Total War: Warhammer (owner: keep them). Only the Dwarfs get an extra line (owner):
   the pages of their Book of Grudges = the number of "No" answers.
   Score of a race = Σ w·z(cluster) / Σ|w| + a bias, as for the 40K factions (KC.wh): only the clusters decide, not the
   groups (owner, Oct 4). Profiles = the owner-approved table of Oct 4 (main theme 1, helpers .6/.5/.4/.3, repellers −.4/−.3).
   Biases: equal shares on synthetic lists shaped like the owner's group (local script, Oct 4).
   Nothing is stored except the chosen mode (KC.dnd.mode, value "ow"). Names: "ow.r.<id>". Switch: KC.FEATURES.ow. */
(function (KC) {
  const RACES = ["emp", "bret", "kislev", "cathay", "dwarf", "he", "we", "de", "orc", "ogre", "vamp", "tk", "liz", "skaven", "beast", "cd", "woc"];
  const PROF = { emp: "armor1 protocol.6 fire.5 machines.4 company.3 filth-.4 wild-.3", bret: "vows1 worship.6 armor.5 words.4 stage.3 filth-.4 taboo-.3",
    kislev: "cold1 iron.6 pack.5 wild.4 stage-.4 wardrobe-.3", cathay: "protocol1 vows.6 rope.5 stage.4 filth-.4 wild-.3",
    dwarf: "iron1 armor.6 machines.5 home.4 public-.4 company-.3", he: "protocol1 stage.6 look.5 worship.4 filth-.4 wild-.3 feast-.3",
    we: "hunt1 wild.6 touch.5 machines-.4 iron-.3", de: "property1 penance.6 blood.5 extreme.4 touch-.4 home-.3",
    orc: "pack1 spank.6 wild.5 filth.4 protocol-.4 vows-.3", ogre: "feast1 devour.6 size.5 cum.4 protocol-.4 stage-.3",
    vamp: "blood1 dark.6 worship.5 stasis.4 home-.4 touch-.3", tk: "stasis1 vows.6 protocol.5 dark.4 public-.4 company-.3",
    liz: "stasis1 devour.6 wild.5 words-.4 stage-.3", skaven: "machines1 filth.6 pack.5 taboo.4 protocol-.4 look-.3",
    beast: "wild1 hunt.6 pet.5 pack.4 taboo.3 protocol-.4 machines-.3", cd: "fire1 machines.6 property.5 iron.4 touch-.4 home-.3",
    woc: "extreme1 blood.6 armor.5 pack.4 property.3 touch-.4 home-.3" };
  const BIAS = { emp: 0.05, bret: 0.07, kislev: -0.05, cathay: 0.06, dwarf: -0.06, he: 0.08, we: 0.09, de: -0.07, orc: 0.06, ogre: -0.2, vamp: -0.09, tk: -0.03, liz: 0.05, skaven: 0, beast: 0.1, cd: -0.07, woc: 0.02 };
  /* [9 stars of the groups, grey stars, lines ("d" first = dashed), 3 bright slots], 100×100 */
  const FIG = {
    "emp": [[[39,26],[20,37],[13,26],[19,15],[32,15],[70,58],[94,96],[56,70],[74,98]],[[32,37],[52,40],[84,76],[40,52],[68,84],[18,18],[22,22]],[[0,9,1,2,3,4,0],[0,10,5,11,6],[9,12,7,13,8],["d",14,15]],[2,6,8]],
    "bret": [[[22,14],[78,14],[32,42],[68,42],[50,50],[50,58],[50,76],[30,92],[70,92]],[[24,30],[42,49],[58,49],[76,30],[50,18],[44,58],[56,58],[36,86],[64,86],[50,4],[50,10]],[[0,9,2,10,4,11,3,12,1],["d",0,13,1],[4,5,6],[14,15],[6,16,7,8,17,6],["d",18,19]],[0,1,5]],
    "kislev": [[[6,56],[18,36],[30,30],[62,24],[92,52],[22,84],[38,84],[72,84],[90,84]],[[10,50],[18,46],[24,40],[44,24],[78,30],[88,40],[90,62],[12,60],[20,58],[20,42],[24,38],[26,54],[24,70],[30,84],[40,60],[40,74],[46,84],[72,60],[74,72],[80,84],[90,74],[96,84],[56,62]],[[0,9,10,11,2,12,3,13,14,4,15],[0,16,17],[18,1,19],[20,21,5,22],[23,24,6,25],[26,27,7,28],[15,29,8,30],[17,20,23,31,26]],[0,3,8]],
    "cathay": [[[50,2],[40,14],[60,14],[22,40],[78,40],[22,56],[78,56],[50,90],[46,98]],[[50,10],[28,24],[28,72],[40,82],[60,82],[72,72],[72,24],[50,14],[44,30],[42,48],[44,66],[50,82],[56,30],[58,48],[56,66],[54,98]],[[0,9],[1,2],[1,10,3,5,11,12,13,14,6,4,15,2],["d",16,17,18,19,20],["d",16,21,22,23,20],[20,7,8],[7,24]],[0,5,6]],
    "dwarf": [[[4,30],[30,30],[88,30],[88,38],[42,52],[74,52],[28,82],[88,82],[56,22]],[[22,36],[30,38],[36,38],[40,64],[80,38],[76,64],[28,72],[88,72],[60,12],[66,18]],[[0,9,10,3,2,1,0],[11,4,12],[13,5,14],[12,15,6,7,16,14],["d",12,14],["d",8,17,18]],[0,2,8]],
    "he": [[[50,10],[2,44],[98,44],[25,14],[75,14],[50,64],[38,98],[50,98],[62,98]],[[50,22],[50,36],[50,52],[44,14],[56,14],[50,40],[37,16],[13,19],[5,30],[14,54],[26,50],[36,48],[50,46],[14,28],[63,16],[87,19],[95,30],[86,54],[74,50],[64,48],[86,28],[40,78],[44,88],[60,78],[56,88]],[[9,10,11,5],[12,9,13],[9,0],[14,15,3,16,17,1],[1,18,19,20,21],["d",16,22],[14,23,4,24,25,2],[2,26,27,28,21],["d",24,29],[5,30,31,6],[5,7],[5,32,33,8]],[0,3,4]],
    "we": [[[50,6],[70,26],[30,26],[78,42],[22,42],[80,60],[20,60],[50,82],[50,96]],[[60,14],[58,22],[66,36],[72,52],[68,66],[58,78],[42,78],[32,66],[28,52],[34,36],[42,22],[40,14],[50,36],[50,54],[50,44]],[[0,9,10,1,11,3,12,5,13,14,7,15,16,6,17,4,18,2,19,20,0],[0,7,8],["d",21,11],["d",22,12],["d",23,4]],[0,3,6]],
    "de": [[[10,94],[14,80],[22,88],[26,74],[56,50],[86,50],[88,70],[72,64],[82,58]],[[18,84],[40,60],[72,46],[92,60],[78,72],[76,56],[30,40],[44,16]],[[0,9,3],[1,2],[3,10,4,11,5,12,6,13,7,14,8],["d",3,15,16]],[0,5,8]],
    "orc": [[[35,90],[17,74],[10,50],[17,26],[35,10],[34,36],[30,56],[44,62],[40,50]],[[25,83],[12,62],[12,38],[25,17],[54,81],[47,73],[42,62],[42,38],[47,27],[54,19],[37,38],[36,62],[37,58],[41,62],[42,58]],[[0,9,1,10,2,11,3,12,4],[0,13],[13,14,15,8,16,17,18],[4,18],[5,19],[6,20,7],["d",20,21],["d",22,23]],[5,2,7]],
    "ogre": [[[14,40],[86,40],[16,54],[84,54],[50,81],[24,92],[76,92],[38,12],[54,8]],[[18,40],[22,68],[34,78],[66,78],[78,68],[82,40],[30,76],[70,76],[50,92],[36,32],[32,22],[54,32],[60,20]],[[0,1],[9,2,10,11,4,12,13,3,14],[15,5],[16,6],[4,17],["d",18,19,7],["d",20,21,8]],[0,1,4]],
    "vamp": [[[46,30],[54,30],[50,56],[20,28],[80,28],[4,36],[96,36],[30,62],[70,62]],[[50,36],[47,40],[53,40],[47,42],[36,32],[12,44],[14,54],[24,52],[40,56],[48,52],[53,42],[64,32],[88,44],[86,54],[76,52],[60,56],[52,52]],[[9,0,10,2,11,1,9],[12,13,3,5,14,15,16,7,17,18],[19,20,4,6,21,22,23,8,24,25]],[5,6,2]],
    "tk": [[[50,30],[8,92],[92,92],[36,51],[64,51],[22,72],[78,72],[57,12],[44,82]],[[44,92],[56,82],[56,92],[53,18],[45,17],[43,10],[49,5],[56,8],[36,12],[30,12],[64,12],[70,12]],[[0,1,2,0],["d",3,4],["d",5,6],[9,8,10,11],[7,12,13,14,15,16],["d",17,18],["d",19,20]],[0,7,8]],
    "liz": [[[67,25],[83,61],[53,88],[19,67],[28,28],[88,22],[82,30],[66,10],[78,6]],[[81,40],[72,80],[32,83],[17,46],[76,18],[72,22],[78,18],[84,20],[92,10],[34,30],[40,34]],[[0,9,1,10,2,11,3,12,4],[0,13,5,6,0],["d",14,7],["d",15,8],["d",16,17],[4,18,19]],[5,2,8]],
    "skaven": [[[8,40],[20,22],[36,32],[58,42],[24,62],[50,62],[72,76],[56,94],[60,80]],[[16,34],[22,28],[26,34],[50,34],[56,52],[40,54],[24,50],[14,46],[26,52],[48,54],[56,50],[66,60],[68,90],[46,86],[48,76],[56,74]],[[0,9,10,11,2,12,3,13,14,15,16,0],[10,1],[17,4],[18,5],[19,20,6,21,7,22,23,24,8]],[0,1,8]],
    "beast": [[[40,44],[60,44],[50,84],[18,24],[82,24],[10,46],[90,46],[24,42],[76,42]],[[64,60],[58,76],[42,76],[36,60],[30,30],[8,32],[20,50],[70,30],[92,32],[80,50],[44,58],[46,60],[56,58],[54,60]],[[0,1,9,10,2,11,12,0],[0,13,3,14,5,15,7],[1,16,4,17,6,18,8],["d",19,20],["d",21,22]],[7,8,2]],
    "cd": [[[34,34],[66,34],[4,6],[96,6],[20,46],[80,46],[38,70],[62,70],[44,84]],[[70,50],[56,84],[30,50],[20,30],[8,20],[80,30],[92,20],[30,42],[70,42],[44,78],[56,78]],[[0,1,9,7,10,8,6,11,0],[0,12,13,2],[1,14,15,3],[16,4],[17,5],["d",18,19]],[2,3,8]],
    "woc": [[[28,82],[72,82],[42,32],[58,32],[14,2],[86,2],[36,58],[64,58],[60,86]],[[26,56],[32,40],[68,40],[74,56],[40,86],[18,30],[10,14],[82,30],[90,14],[50,58],[50,80]],[[0,9,10,2,3,11,12,1],[0,13,8,1],[10,14,15,4],[11,16,17,5],[6,7],["d",18,19]],[4,5,6]],
  };
  const parse = s => { const o = {}; s.split(" ").forEach(t => { const m = t.match(/^([a-z]+)(-?[\d.]+)$/); o[m[1]] = parseFloat(m[2]); }); return o; };
  const W = {}; RACES.forEach(r => { W[r] = parse(PROF[r]); });
  function scores(st, set) {
    const o = {}, zc = {};
    RACES.forEach(r => { let n = 0, d = 0; Object.keys(W[r]).forEach(k => { if (zc[k] === undefined) zc[k] = KC.clusters.z(st, k, set); n += W[r][k] * zc[k]; d += Math.abs(W[r][k]); });
      o[r] = n / d + BIAS[r]; });
    return o;
  }
  function choose(st, d, set) {
    if (!KC.dnd.devs(d)) return null;
    const o = scores(st, set); return RACES.reduce((a, r) => (o[r] > o[a] ? r : a), RACES[0]);
  }
  /* the Dwarfs' Book of Grudges: one page per "No" */
  const grudges = (st, set) => { let n = 0; Object.keys(st.items).forEach(id => { if ((!set || set.has(id)) && st.items[id].interest === "limit") n++; }); return n; };
  function pick(d, st, set) {
    const sg = KC.signs.pick(d); if (!sg) return null;
    const id = choose(st, d, set || null); if (!id) return null;
    const [P, E, L, B] = FIG[id];
    const rest = d.sections.filter(s => KC.signs.GROUPS.indexOf(s.id) >= 0 && sg.main.indexOf(s) < 0);
    const stars = P.map(p => ({ x: p[0], y: p[1], bright: false, s: null }));
    sg.main.forEach((m, k) => { stars[B[k]].bright = true; stars[B[k]].s = m; });
    let r = 0; stars.forEach(s2 => { if (!s2.s) s2.s = rest[r++] || null; });
    E.forEach(p => stars.push({ x: p[0], y: p[1], grey: true, bright: false, s: null }));
    return { ow: true, id, stars, lines: L, main: sg.main, kind: sg.kind, many: sg.many, grudges: id === "dwarf" ? grudges(st, set || null) : null };
  }
  /* the title lines: over-title, name, one line (only the Dwarfs: the pages of their Book of Grudges) */
  const head = (sg, shared, t) => ({ over: t(shared ? "ow.their" : "ow.mine"), name: t("ow.r." + sg.id), rl: sg.grudges !== null && sg.grudges !== undefined ? t("ow.grudges", { n: sg.grudges }) : null });
  function closeness(a, b) {
    const shared = a.main.map(m => m.id).filter(g => b.main.some(m => m.id === g));
    return { level: a.id === b.id ? "same" : shared.length ? "near" : "far", shared };
  }
  KC.ow = { RACES, PROF, BIAS, FIG, scores, choose, grudges, pick, head, closeness };
})(window.KC);
