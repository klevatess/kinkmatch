/* form/dnd.js — the joke "DnD mode" of the portrait (v591, owner): instead of the constellation sign, a D&D class
   and subclass, drawn as a constellation in the class's style, plus a joke alignment.
   Which class (v603, owner): a PROFILE, as in the World of Darkness — every class has weights over the 9 portrait
   groups (CLS); dev = a group's % − the person's average % − the usual skew of real lists (TYP);
   score = Σ w·dev / Σ|w| + a calibrated bias (CLSB); the highest wins. Before v603 the class came from the sign's
   two strongest groups, and almost everyone (bondage and sex are high in most real lists) got a Monk, Fighter,
   Warlock or Sorcerer.
   Which subclass: among the class's variants in VAR (9 single, 36 pairs — order-free —, the Chimera = 46):
   a single variant wins when its group is the strongest dev and GAP_D ahead of the second; the Chimera (Sorcerer
   only) when the three strongest devs are within EVEN_D; otherwise the pair with the highest average dev.
   Only official 5e subclasses (PHB 2014/2024, DMG, XGtE, TCoE); 13 classes, 3–4 variants each (owner).
   A figure: 9 stars, one per portrait group (the variant's groups are the bright ones, the rest take the other
   groups strongest first, as in the signs) + grey stars that only shape the drawing (indexes 9+ in the lines).
   Alignment (owner, v595): every portrait group counts. d = a group's % minus the person's average %;
   Good = Σ wGood·d / Σ|wGood|, Law = Σ wLaw·d / Σ|wLaw| (weights: AXES below, chosen by the owner);
   Law += 40·(share of "No" − .30) − 40·(share of "Maybe" − .15): "No" among ALL items (an unanswered item =
   HALF a "No", owner), "Maybe" among the ANSWERED ones; Top +10 Law, Bottom +10 Good.
   ≥ 15 → Lawful / Good, ≤ −15 → Chaotic / Evil, else Neutral. Names are texts: "dnd.c.<class>", "dnd.s.<class>.<sub>",
   "dnd.al.<key>" + "dnd.aq.<key>" (the one-line joke). */
(function (KC) {
  /* class: [9 points in a 100×100 box, grey points, lines (index paths; "d" first = dashed), bright slots] */
  const FIG = {
    bard: [[[10,62],[18,88],[42,98],[64,84],[62,56],[38,42],[84,12],[96,24],[38,68]], [[11,76],[28,96],[56,94],[66,70],[22,46],[54,46],[90,4],[100,14],[38,55],[51,68],[38,81],[25,68],[46,90]], [[0,9,1,10,2,11,3,12,4,5,13,0],[4,14,6,7],[6,15],[7,16],["d",21,8,6],[17,18,19,20,17]], [8,7,6]],
    barbarian: [[[50,98],[50,4],[18,6],[2,30],[18,54],[82,6],[98,30],[82,54],[50,30]], [[38,18],[38,42],[62,18],[62,42],[50,62],[50,80],[44,71],[56,71],[6,15],[6,45],[94,15],[94,45]], [[8,9,2,17,3,18,4,10,8],[8,11,5,19,6,20,7,12,8],[1,8,13,14,0],["d",15,16]], [8,0,1]],
    fighter: [[[90,6],[8,94],[10,70],[32,92],[10,6],[92,94],[68,92],[90,70],[50,50]], [[20,81],[80,81],[70,28],[30,28],[4,100],[96,100]], [[1,9,8,11,0],[2,9,3],[5,10,8,12,4],[6,10,7],[1,13],[5,14]], [0,4,8]],
    wizard: [[[4,82],[96,82],[24,74],[76,74],[36,48],[62,44],[54,22],[86,14],[48,60]], [[26,91],[50,95],[74,91],[48,51],[56,60],[48,69],[40,60],[96,24]], [[0,9,10,11,1],[0,2,3,1],[2,4,6,7,5,3],[7,16]], [8,7,0]],
    druid: [[[50,99],[50,3],[50,86],[20,78],[6,52],[22,24],[80,78],[94,52],[78,24]], [[36,66],[36,38],[64,38],[64,66],[50,60],[50,32],[34,90],[66,90],[8,66],[92,66],[10,36],[90,36],[34,10],[66,10]], [[2,15,3,9,17,4,10,19,5,21,1,22,8,20,11,7,18,12,6,16,2],[0,2,13,14,1],["d",13,4],["d",13,7],["d",14,5],["d",14,8]], [1,0,4]],
    cleric: [[[50,50],[50,30],[64,36],[70,50],[64,64],[50,70],[36,64],[30,50],[36,36]], [[50,6],[81,19],[94,50],[81,81],[50,94],[19,81],[6,50],[19,19],[63,20],[80,37],[80,63],[63,80],[37,80],[20,63],[20,37],[37,20]], [[1,2,3,4,5,6,7,8,1],[1,9],[2,10],[3,11],[4,12],[5,13],[6,14],[7,15],[8,16]], [0,1,5]],
    artificer: [[[50,5],[82,18],[95,50],[82,82],[50,95],[18,82],[5,50],[18,18],[50,50]], [[43,20],[57,20],[66,24],[76,34],[80,43],[80,57],[76,66],[66,76],[57,80],[43,80],[34,76],[24,66],[20,57],[20,43],[24,34],[34,24],[63,50],[57,61],[44,61],[37,50],[43,39],[57,39]], [[9,0,10,11,1,12,13,2,14,15,3,16,17,4,18,19,5,20,21,6,22,23,7,24,9],["d",25,26,27,28,29,30,25]], [8,0,4]],
    warlock: [[[4,60],[96,60],[50,40],[50,80],[50,60],[22,4],[78,4],[32,44],[68,44]], [[26,45],[74,45],[26,75],[74,75],[12,24],[88,24],[50,50],[50,70],[42,60],[58,60]], [[0,9,2,10,1,12,3,11,0],[7,13,5],[8,14,6],["d",15,4,16],["d",17,4,18]], [4,5,6]],
    monk: [[[36,98],[64,98],[28,70],[74,60],[6,44],[32,6],[50,2],[66,8],[82,24]], [[28,54],[36,38],[50,36],[62,38],[72,44]], [["d",0,1],[0,2,4,9],[9,10,11,12,13,3,1],[10,5],[11,6],[12,7],[13,8]], [6,4,8]],
    paladin: [[[12,8],[88,8],[10,46],[90,46],[50,97],[50,16],[50,80],[24,38],[76,38]], [[74,76],[26,76],[50,38],[50,2]], [[0,1,3,9,4,10,2,0],[5,11,6],[7,11,8],["d",5,12]], [5,4,7]],
    rogue: [[[94,6],[68,15],[88,35],[50,40],[63,53],[12,92],[4,22],[48,22],[26,26]], [[78,25],[86,16],[14,10],[26,15],[38,10],[40,32],[12,32],[16,21],[36,21]], [[0,10,9],[1,9,2],[9,3,5,4,9],["d",9,5],[6,11,12,13,7,14,8,15,6]], [5,1,8]],
    ranger: [[[30,4],[30,96],[54,20],[54,80],[62,50],[16,50],[97,50],[6,40],[6,60]], [[88,43],[88,57],[40,50],[78,50],[12,44],[12,56]], [[0,2,4,3,1],["d",0,5,1],[5,11,4,12,6],[7,13,5],[8,14,5],[9,6,10]], [6,2,3]],
    sorcerer: [[[50,97],[20,80],[80,80],[10,52],[88,54],[28,16],[52,2],[76,24],[50,66]], [[40,36],[63,40],[38,78],[50,46],[62,78],[36,58],[66,58]], [[0,1,3,5,9,6,10,7,4,2,0],["d",11,12,13,0,11]], [6,8,3]],
  };
  /* variant key -> [class, subclass]; a pair's key is its two group letters in the ORDER below, so both
     orders of a pair give the same variant; "*" = the Chimera */
  const ORDER = "nbfrdsxvw";
  const VAR = {
    n: ["cleric", "life"], b: ["monk", "openhand"], f: ["artificer", "armorer"], r: ["wizard", "illusion"], d: ["paladin", "conquest"],
    s: ["barbarian", "berserker"], x: ["bard", "glamour"], v: ["rogue", "inquisitive"], w: ["druid", "sea"],
    nb: ["monk", "mercy"], nf: ["ranger", "beastmaster"], nr: ["wizard", "enchantment"], nd: ["paladin", "devotion"],
    ns: ["warlock", "celestial"], nx: ["fighter", "champion"], nv: ["bard", "dance"], nw: ["druid", "dreams"],
    bf: ["fighter", "runeknight"], br: ["ranger", "hunter"], bd: ["warlock", "greatoldone"], bs: ["fighter", "battlemaster"],
    bx: ["monk", "astral"], bv: ["rogue", "arcanetrickster"], bw: ["druid", "land"],
    fr: ["wizard", "transmutation"], fd: ["artificer", "battlesmith"], fs: ["artificer", "artillerist"], fx: ["bard", "creation"],
    fv: ["rogue", "swashbuckler"], fw: ["artificer", "alchemist"],
    rd: ["warlock", "fiend"], rs: ["barbarian", "wildheart"], rx: ["cleric", "trickery"], rv: ["bard", "eloquence"], rw: ["druid", "moon"],
    ds: ["paladin", "vengeance"], dx: ["warlock", "archfey"], dv: ["paladin", "glory"], dw: ["cleric", "tempest"],
    sx: ["barbarian", "beast"], sv: ["barbarian", "stormherald"], sw: ["sorcerer", "aberrant"],
    xv: ["sorcerer", "draconic"], xw: ["sorcerer", "storm"],
    vw: ["ranger", "gloomstalker"],
    "*": ["sorcerer", "wildmagic"],
  };
  const keyOf = main => main.length === 3 ? "*"
    : main.map(m => Object.keys(KC.signs.KEY).find(k => KC.signs.KEY[k] === m.id)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join("");

  /* v603 (owner): the usual skew of real lists (owner's group, portrait variant A): a group's % minus the person's
     average, averaged over people. Shared with the World of Darkness; taken off before profiles are compared. */
  const TYP = { intimacy: -4, bondage: 11, fetishes: -3, "role-play": -5, ds: 2, sm: 10, "sex-penetration": 16, "voyeurism-exhibitionism": -9, "bodily-fluids": -19 };
  /* portrait -> {dev: group -> % − average − TYP, secs: groups with a percentage} (null when none) */
  function devs(d) {
    const secs = d.sections.filter(s => s.pct !== null && KC.signs.GROUPS.indexOf(s.id) >= 0);
    if (!secs.length) return null;
    const mean = secs.reduce((a, s) => a + s.pct, 0) / secs.length, dev = {};
    secs.forEach(s => { dev[s.id] = s.pct - mean - (TYP[s.id] || 0); });
    return { dev, secs };
  }
  /* class profiles: group letter (as in the signs) -> weight, + a bias calibrated so that every class comes out about
     equally often on lists spread like real ones (owner, v603) */
  const CLS = { cleric: ["n1 d.4", 0.14], rogue: ["v1 r.5", 0], wizard: ["r1 f.5", -0.54], monk: ["b1 n.3", -0.52], fighter: ["s.7 x.7", 0.15],
    barbarian: ["s1 w.3", -0.81], paladin: ["d1 n.3", 0.2], warlock: ["d.7 f.7", 0.35], sorcerer: ["x1 w.5", 0.01], bard: ["x.7 v.7", 0.18],
    druid: ["w1 n.4", -0.3], ranger: ["b.6 r.6 v.4", 1.25], artificer: ["f1 b.5", -0.1] };
  /* a single variant: its group GAP_D ahead of the second (the sign's 30 points × .45, the spread of real lists);
     the Chimera: the three strongest within EVEN_D (owner, v603) */
  const GAP_D = 13.6, EVEN_D = 2.3;
  let clsW = null;
  const clsWeights = () => clsW || (clsW = Object.keys(CLS).reduce((o, c) => { const w = {};
    CLS[c][0].split(" ").forEach(tk => { w[KC.signs.KEY[tk[0]]] = parseFloat(tk.slice(1)); }); o[c] = w; return o; }, {}));
  /* dev -> classes, best first: [{cls, score}] */
  function classes(dev) {
    const W = clsWeights();
    return Object.keys(CLS).map(c => { let num = 0, den = 0;
      Object.keys(W[c]).forEach(g => { num += W[c][g] * (dev[g] || 0); den += Math.abs(W[c][g]); });
      return { cls: c, score: num / den + CLS[c][1] }; }).sort((a, b) => b.score - a.score);
  }
  /* the variant of a class: {key, groups (strongest first)} or null when the class has none that fits */
  function variant(cls, dev) {
    const g = Object.keys(dev).sort((a, b) => dev[b] - dev[a]);
    const keys = Object.keys(VAR).filter(k => VAR[k][0] === cls);
    if (keys.indexOf("*") >= 0 && g.length >= 3 && dev[g[0]] - dev[g[2]] <= EVEN_D) return { key: "*", groups: g.slice(0, 3) };
    const one = keys.find(k => k.length === 1 && KC.signs.KEY[k] === g[0]);
    if (one && (g.length === 1 || dev[g[0]] - dev[g[1]] >= GAP_D)) return { key: one, groups: [g[0]] };
    let best = null, bs = -1e9;
    keys.filter(k => k.length === 2).forEach(k => { const a = KC.signs.KEY[k[0]], b = KC.signs.KEY[k[1]];
      if (dev[a] === undefined || dev[b] === undefined) return;
      const sc = (dev[a] + dev[b]) / 2; if (sc > bs) { bs = sc; best = { key: k, groups: dev[a] >= dev[b] ? [a, b] : [b, a] }; } });
    return best;
  }

  /* portrait data -> the figure in the same shape as a sign (stars 0–8 carry a group, grey stars follow), or null */
  function pick(d) {
    const dv = devs(d); if (!dv) return null;
    let v = null, cls = null;
    classes(dv.dev).some(c => { v = variant(c.cls, dv.dev); if (v) cls = c.cls; return !!v; });
    if (!v) return null;
    const main = v.groups.map(id => dv.secs.find(s => s.id === id));
    const [, sub] = VAR[v.key], [P, E, L, B] = FIG[cls];
    const rest = d.sections.filter(s => KC.signs.GROUPS.indexOf(s.id) >= 0 && main.indexOf(s) < 0);
    const stars = P.map(p => ({ x: p[0], y: p[1], bright: false, s: null }));
    main.forEach((m, k) => { stars[B[k]].bright = true; stars[B[k]].s = m; });
    let r = 0; stars.forEach(st => { if (!st.s) st.s = rest[r++] || null; });
    E.forEach(p => stars.push({ x: p[0], y: p[1], grey: true, bright: false, s: null }));
    return { dnd: true, key: v.key, cls, sub, stars, lines: L, main, kind: main.length === 1 ? "single" : main.length === 3 ? "even" : "pair", many: KC.signs.manyOf(d) };
  }

  /* the joke alignment: st = the list, d = its portrait, set = the applied template (or null) */
  const LIM = { NO: .6, EDGE: 15, ROLE: 10, K: 40, NO0: .3, MAYBE0: .15, FEW: 20 };
  /* group -> [Good (+) / Evil (−), Law (+) / Chaos (−)] (owner, v595) */
  const AXES = { intimacy: [1, 0], "sex-penetration": [.3, 0], "role-play": [0, -.5], fetishes: [.2, .4], bondage: [0, .6],
    ds: [-.5, 1], sm: [-1, -.2], "voyeurism-exhibitionism": [0, -.8], "bodily-fluids": [-.3, -.9] };
  /* the groups' part of both axes: every group with a percentage, measured from the person's own average */
  function scores(d) {
    const g = d.sections.filter(s => s.pct !== null && AXES[s.id]);
    if (!g.length) return { good: 0, law: 0 };
    const mean = g.reduce((a, s) => a + s.pct, 0) / g.length;
    const axis = k => { let num = 0, den = 0; g.forEach(s => { const wt = AXES[s.id][k]; num += wt * (s.pct - mean); den += Math.abs(wt); }); return den ? num / den : 0; };
    return { good: axis(0), law: axis(1) };
  }
  /* the numbers behind the alignment: {key: "roll" | "boring" | null, good, law} (v597: the World of Darkness
     mode needs the numbers, e.g. the fey court) */
  function alignNum(st, d, set) {
    let n = 0, no = 0, maybe = 0, love = 0, answered = 0;
    KC.CATS.forEach(c => { if (KC.portrait.OUT[c.id]) return; c.items.forEach(([, id]) => {
      if (set && !set.has(id)) return;
      n++; const v = (st.items[id] || {}).interest;
      if (v) answered++;
      if (v === "limit") no++; else if (v === "maybe") maybe++; else if (v === "love") love++; else if (!v) no += .5;   /* unanswered = half a "No" */
    }); });
    const pNo = n ? no / n : 0;   /* also used for the fey Banality (v599) */
    const pLove = answered ? love / answered : 0;   /* share of "Love" among the answers: the fey Glamour (v603) */
    if (answered < LIM.FEW || !n) return { key: "roll", good: 0, law: 0, pNo, pLove };
    const pMaybe = maybe / answered, role = st.meta && st.meta.role;
    const sc = scores(d);
    const good = sc.good + (role === "sub" ? LIM.ROLE : 0);
    const law = sc.law + LIM.K * (pNo - LIM.NO0) - LIM.K * (pMaybe - LIM.MAYBE0) + (role === "dom" ? LIM.ROLE : 0);
    return { key: pNo >= LIM.NO ? "boring" : null, good, law, pNo, pLove };
  }
  function alignment(st, d, set) {
    const a = alignNum(st, d, set); if (a.key) return a.key;
    const w = (v, p, q) => v >= LIM.EDGE ? p : v <= -LIM.EDGE ? q : "N";
    return w(a.law, "L", "C") + w(a.good, "G", "E");
  }
  const ALIGN = ["LG", "NG", "CG", "LN", "NN", "CN", "LE", "NE", "CE", "boring", "roll"];

  /* ---------- race (v596, owner): not WHAT a person likes (that is the class) but HOW ----------
     27 clusters of items that cut across the sections; each cluster marks its items on some of 7 axes
     ("1+" = the first pole of axis 1, "1-" = the second). A pole's value = liked share of its answered items
     (Love 1, Yes .8, Maybe .3, No 0), a pole needs 5 answers; an axis = first pole − second pole.
     A race = two poles. v603 (owner): the poles are STANDARDISED — z = (axis − its usual value in real lists AXT) /
     its usual spread AXSD (an axis with too few answers: z = 0); a race's points = z of its two poles + a calibrated
     bias RACEB; the most points wins. Before, raw poles were compared and softness + privacy (the Halfling) are the
     strongest poles of almost every real list. Every |z| < .5 → Human. "About me" (in z): large/extensive
     experience +.6 Dragonborn (v604, owner: clothing no longer counts for the Tiefling). Session length counts for
     "slow" / "rush".
     AXT / AXSD are shared with the World of Darkness (paths, auspices). */
  const POLES = [["power", "play"], ["mind", "body"], ["ritual", "spont"], ["gear", "hands"], ["slow", "rush"], ["crowd", "private"], ["hard", "soft"]];
  const CL = {
    protocol: ["1+ 2+ 3+ 5+", "following-orders discipline rituals honorifics contract-slave total-power-exchange 24-7-d-s-lifestyle prompt-obedience eye-contact-rules speech-restrictions no-sounds gor-training kneeling daily-diary mantra-meditation personality-modification name-change symbolic-jewelry collar-in-private metal-collar punishment-scene chosen-food bathroom-control exercise-required photo-proof initiation-rites standing-in-corner kneeling-on-buckwheat corner-kneeler"],
    pet: ["1- 3+", "age-play dd-lg-md-lb animal-roleplay puppy-play kitten-play pony-play furry leash muzzles hand-feeding kigurumi bratting brat-taming switching-roles wrestling praise begging schoolroom-scenes cow-play pig-play pet-food-eating dressage-training"],
    service: ["1+ 3+", "chores serving-as-a-maid massage pedicures-foot-massage manicures chauffeuring forced-servitude uniform-wearing erotic-dancing serving-other-doms other-sub-serves-you"],
    object: ["1+ 2+", "objectification sex-doll-use depersonalisation dronification mindbreak freeuse glory-hole stuck-in-wall fuck-box serving-as-furniture serving-as-art used-as-toy-for-other-sub sleep-play unseen-actor blind-stranger auctioned hair-as-mop"],
    words: ["2+ 1+", "verbal-humiliation forced-thanking forced-self-degradation humiliating-body-writing body-writing lecturing dirty-talk forced-begging-acts humiliation-in-private mouth-soaping phone-sex floor-licking foreign-language-talk"],
    look: ["2+ 3+", "forced-dressing forced-feminization cross-dressing chosen-clothing shaving-head-hair shaving-body-hair forced-nudity forced-nudity-private slutty-clothing"],
    wardrobe: ["3+ 4+", "leather-wearing rubber-latex-wearing latex-sweat spandex-clothing corsets lingerie-wearing stockings-wearing high-heel-wearing formal-clothing gas-masks masks cosplay clothed-sex clothes-tearing tights-tearing clothes-cutting piercing-fetish harness-leather cuffs-leather leather-restraints nerd-hikikomori clowncore"],
    worship: ["3+ 2-", "boot-worship cock-worship foot-worship toe-licking-giving toe-licking-receiving ass-worship pussy-worship high-heel-worship stocking-worship armpit-fetish homage-with-tongue oral-fixation"],
    rope: ["3+ 4+ 5+", "rope-bondage-simple rope-bondage-shibari semenawa harness-rope suspension-upright suspension-horizontal suspension-inverted partial-suspension breast-bondage hair-bondage predicament-bondage mutually-restrictive-bondage bondage-light arm-leg-sleeves spreader-bars wall-cross-mounting loveswing"],
    iron: ["4+ 5+ 1+", "cages-cells chains manacles-irons cuffs-metal cuffs-handcuff thumb-cuffs toe-cuffs zip-tie-bondage tape-bondage stocks chastity-device locking-anal-plug locking-vaginal-insert bondage-all-day bondage-heavy left-tied-unattended straight-jacket mummification sleep-sacks bondage-bag vacbed immobilisation mitts prison-scenes nose-hook"],
    dark: ["2+ 4+ 5+", "blindfolds ear-plugs hood-full-head sensory-deprivation gag-ball gag-bit gag-cloth gag-inflatable gag-phallic gag-ring gag-tape panty-gag sex-in-total-darkness sleep-deprivation sock-gag-own sock-gag-top"],
    touch: ["7- 1- 5+ 2-", "teasing tickling scratching wartenberg-pinwheel ice-cubes wax-play hot-wax-dripping scent-play caning-sensation vampire-gloves finger-claws nipple-play biting hickies ear-licking oil-play nuru-massage suction-cups ice-dildo"],
    spank: ["2- 7+ 4-", "spanking-hand spanking-over-the-knee spanking-hairbrush spanking-leather-slappers spanking-wooden-paddles body-slapping whipping-belt whipping-flogger whipping-cat-o-nine whipping-single-tail riding-crop rubber-band-snapping caning-english rattan birching bastinado palm-strikes strapping pussy-spanking breast-whipping impact-bruising sap-gloves pain-mild pain-massage pressure-points beating-soft bruising-temporary hair-pulling rough-grabbing"],
    extreme: ["7+ 2- 4+", "pain-severe beating-hard punching kicking face-slapping ballbusting pussy-punching pussy-kicking pussy-whipping breast-torture cbt cbt-crushing cbt-stretching ball-stretching zippers-clothespins zippers-clamps zippers-needles nipple-weights tongue-clothespins clamps-labia-clit piercing-temporary labia-sewing-needle labia-stapling medical-stapler branding scarification tattooing piercing-permanent nipple-piercing wax-burns standing-on-nails spike-mat reducing-to-tears brutal-treatment trampling-barefoot trampling-shoes trampling-punk-boots face-stepping biting-hard wasabi-on-genitals menthol-balm-labia menthol-eye-drops figging fire-play fire-cupping hot-wax-high-temp hot-wax-hair-removal wax-inside-vagina riding-the-horse abrasion clothespins nipple-clamps"],
    lab: ["4+ 2+", "electricity-tens electricity-violet-wand shock-collar electricity-internal electricity-genitals-external electricity-anal electricity-genital-internal vaginal-electrostimulation cbt-electrical medical-scenes examinations speculums catheterization urethral-play dilation enema-cleansing enema-retention injections-saline sex-machines sybian remote-controlled-toy vibro-egg-public magic-wand suction-vibrator cbt-anti-erection cbt-leash-harness practical-sex-ed psych-ward-play"],
    edge: ["2+ 7+ 3-", "asphyxiation breath-control-choking breath-control-mild breath-control-facesitting water-torture fear-play kidnapping interrogations fantasy-rape-play cnc-single dubcon fantasy-gang-rape abandonment burial-up-to-the-neck rough-penetration-before-arousal forced-homosexuality knife-play"],
    orgasm: ["5+ 1+", "edging orgasm-control orgasm-denial forced-orgasm overstimulation sexual-deprivation tantric-yoni forced-masturbation masturbation mutual-masturbation"],
    public: ["6+ 2+", "collar-in-public leash-walk-outside humiliation-in-public anal-plug-public exhibitionism-friends exhibitionism-strangers forced-nudity-others outdoor-scenes stripping erotic-photos photo-exchange video-of-you fake-public-use"],
    watch: ["6+ 2+", "voyeurism-others voyeurism-your-dom video-others forced-watching-others forced-porn-watching mirror-play sex-in-front-of-a-mirror cuckolding-hotwife"],
    wild: ["3- 4- 7+", "sex-in-snow sex-in-rain hair-drag-snow hair-drag-rain nude-in-snow mud-play outdoor-sex outdoor-bondage chained-outdoors cold-shower sauna-whisk nettle-play-urtication leeches abandoned-building-sex"],
    feast: ["1- 3- 4-", "food-play nyotaimori sake-from-thighs food-smearing-sploshing drinking-from-feet forced-drinking-from-feet forced-unpleasant-food forced-drinking-beer-cider drinking-bathwater forced-drinking-bathwater funnel-play smoking-fetish forced-floor-eating"],
    taboo: ["3- 7+", "golden-showers swallowing-urine urination-in-front omorashi period-play blood-play spitting spitting-in-mouth human-ashtray trash-play forced-staying-in-sweat-cum underwear-sniffing wearing-partners-underwear milking pussy-juice-play squirting licking-fingers-clean rimming"],
    home: ["7- 6- 4-", "romance-affection hugging gentle-touch kissing-body kissing-mouth spooning using-real-names sleepover aftercare shared-bathing lap-pillow-ear-cleaning petting-over-clothes thigh-sex"],
    size: ["2- 7+", "fisting-vaginal fisting-anal double-penetration triple-penetration anal-plug-large object-insertion bottle-neck-vaginal bottle-neck-anal size-difference size-giantess deep-throating irrumatio irrumatio-to-vomiting xenophilia-tentacles egg-laying breeding-fantasy double-penetration-one-hole"],
    company: ["6+ 5-", "group-multiple-men group-mixed orgy swinging swapping shared-temporarily supplying-fantasy multiple-subs-one-dom group-multiple-women harems cheating-fantasy prostitution-fantasy"],
    classic: ["2- 5- 6-", "genital-sex barebacking up-against-walls 69 dutch-rudder hand-jobs fingering fellatio cunnilingus-giving cunnilingus-receiving face-sitting breast-fucking anal-sex anal-play prostate-massage anal-teasing anal-beads anal-plug-small anal-plug-medium dildo-vaginal dildo-anal dildo-oral vibrator-external vibrator-internal vibrator-anal strap-on-wearing strap-on-penetrated strap-on-sucking rough-sex rough-fingering fingers-in-mouth"],
    cum: ["2- 5- 3-", "cum-on-body cum-on-face bukkake cum-in-eyes pearl-necklace cum-in-mouth swallowing-semen snowballing condom-cum-in-mouth cum-in-vagina cum-in-ass creampie sucking-cum-from-vagina"],
  };
  const SESS = { slow: ["session-long", "session-day", "session-multi-day"], rush: ["session-short"] };
  const RACES = { human: ["body", "rush"], elf: ["ritual", "slow"], drow: ["power", "mind"], dwarf: ["gear", "power"], dragonborn: ["power", "ritual"],
    halforc: ["hard", "rush"], goliath: ["hard", "body"], tiefling: ["mind", "hard"], yuanti: ["mind", "slow"], halfling: ["soft", "private"],
    tabaxi: ["play", "spont"], changeling: ["mind", "play"], kenku: ["mind", "hands"] };
  const RLIM = { MIN: 5, FLAT: .5, BONUS: .6 };
  /* v603 (owner's group, portrait variant A): the usual value ± the usual spread of each axis in real lists */
  const AXT = [-3, 1, 9, -9, -7, -12, -23], AXSD = [12, 9, 11, 10, 16, 18, 15];
  /* calibrated so that every race comes out about equally often on lists spread like real ones */
  const RACEB = { human: -0.28, elf: -0.03, drow: 0.15, dwarf: 0.03, dragonborn: 0.15, halforc: 0.01, goliath: -0.02, tiefling: 0.35,
    yuanti: 0.07, halfling: -0.4, tabaxi: -0.35, changeling: 0.24, kenku: 0.06 };
  const RW = { love: 1, yes: .8, maybe: .3, limit: 0 };
  let poleIds = null;
  function poles() {
    if (poleIds) return poleIds;
    const P = {}; POLES.forEach(p => p.forEach(x => { P[x] = []; }));
    Object.keys(CL).forEach(k => { const ids = CL[k][1].split(" ");
      CL[k][0].split(" ").forEach(tg => { const pole = POLES[+tg[0] - 1][tg[1] === "+" ? 0 : 1]; P[pole] = P[pole].concat(ids); }); });
    Object.keys(SESS).forEach(p => { P[p] = P[p].concat(SESS[p]); });
    return (poleIds = P);
  }
  /* the 7 axes, −100…100 (0 when a pole has too few answers) */
  /* nulls = true: an axis with too few answers is null instead of 0 (the World of Darkness standardises the axes, v602) */
  function axes(st, set, nulls) {
    const P = poles(), val = {};
    Object.keys(P).forEach(p => { let n = 0, sum = 0;
      P[p].forEach(id => { if (set && !set.has(id)) return; const v = (st.items[id] || {}).interest; if (v) { n++; sum += RW[v]; } });
      val[p] = n >= RLIM.MIN ? 100 * sum / n : null; });
    return POLES.map(([a, b]) => val[a] === null || val[b] === null ? (nulls ? null : 0) : val[a] - val[b]);
  }
  /* the standardised poles: {pole: z ≥ 0} (a pole below its usual value counts for the opposite pole) */
  function zPoles(st, set) {
    const raw = axes(st, set, true), z = {};
    POLES.forEach(([a, b], i) => { const v = raw[i] === null ? 0 : (raw[i] - AXT[i]) / AXSD[i]; z[a] = Math.max(0, v); z[b] = Math.max(0, -v); });
    return z;
  }
  function race(st, set) {
    const z = zPoles(st, set);
    if (POLES.every(([a, b]) => z[a] < RLIM.FLAT && z[b] < RLIM.FLAT)) return "human";
    const m = st.meta || {}, sc = {};
    Object.keys(RACES).forEach(r => { sc[r] = z[RACES[r][0]] + z[RACES[r][1]] + RACEB[r]; });
    if (m.exp === "large" || m.exp === "extensive") sc.dragonborn += RLIM.BONUS;
    return Object.keys(sc).reduce((a, b) => sc[b] > sc[a] ? b : a);   /* a tie: the earlier race in RACES */
  }

  /* ---------- level (v596, owner): XP = Yes + 2 × Love + ½ × Maybe; the Player's Handbook XP table ÷ 400 ---------- */
  const XP = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
  function level(st, set) {
    let xp = 0;
    KC.CATS.forEach(c => c.items.forEach(([, id]) => { if (set && !set.has(id)) return;
      const v = (st.items[id] || {}).interest; xp += v === "love" ? 2 : v === "yes" ? 1 : v === "maybe" ? .5 : 0; }));
    let lv = 1; XP.forEach((x, i) => { if (xp * 400 >= x) lv = i + 1; });
    return lv;
  }

  /* ---------- who a party can beat (v596, owner): Dungeon Master's Guide 2014 encounter thresholds,
     one monster; the sum of every member's threshold for Medium / Hard / Deadly = the budget; the strongest
     monster whose XP fits each budget (Monster Manual 2014) ---------- */
  const DMG = [[50, 75, 100], [100, 150, 200], [150, 225, 400], [250, 375, 500], [500, 750, 1100], [600, 900, 1400], [750, 1100, 1700], [900, 1400, 2100],
    [1100, 1600, 2400], [1200, 1900, 2800], [1600, 2400, 3600], [2000, 3000, 4500], [2200, 3400, 5100], [2500, 3800, 5700], [2800, 4300, 6400],
    [3200, 4800, 7200], [3900, 5900, 8800], [4200, 6300, 9500], [4900, 7300, 10900], [5700, 8500, 12700]];
  const MON = [["kobold", "1/8", 25], ["goblin", "1/4", 50], ["satyr", "1/2", 100], ["harpy", "1", 200], ["mimic", "2", 450], ["minotaur", "3", 700],
    ["succubus", "4", 1100], ["troll", "5", 1800], ["medusa", "6", 2300], ["youngblack", "7", 2900], ["hydra", "8", 3900], ["bonedevil", "9", 5000],
    ["aboleth", "10", 5900], ["djinni", "11", 7200], ["erinyes", "12", 8400], ["vampire", "13", 10000], ["adultblack", "14", 11500],
    ["purpleworm", "15", 13000], ["marilith", "16", 15000], ["deathknight", "17", 18000], ["demilich", "18", 20000], ["balor", "19", 22000],
    ["pitfiend", "20", 25000], ["lich", "21", 33000], ["kraken", "23", 50000], ["ancientred", "24", 62000], ["tarrasque", "30", 155000]];
  /* levels [n] -> [{id, cr, xp, budget}] for Medium, Hard, Deadly */
  function foes(levels) {
    return [0, 1, 2].map(k => { const budget = levels.reduce((a, l) => a + DMG[Math.min(20, Math.max(1, l)) - 1][k], 0);
      let m = MON[0]; MON.forEach(x => { if (x[2] <= budget) m = x; });
      return { id: m[0], cr: m[1], xp: m[2], budget }; });
  }

  /* the mode is remembered on this device only: "1" = DnD, "wod" = the World of Darkness (v597), nothing = the sign.
     v599 (owner): the portrait, the pair view and the company view each remember their OWN mode (scope
     "portrait" | "pair" | "group"), so a choice in the portrait never changes what the compare page opens with. */
  const KEY = scope => scope === "pair" ? KC.KEYS.dndPair : scope === "group" ? KC.KEYS.dndGroup : KC.KEYS.dnd;
  /* v610: "wr" = Servant of the Chaos gods (KC.wr), "wh" = Warhammer factions (KC.wh), "leg" = legions (KC.leg);
     v612: "ow" = Warhammer: The Old World races (KC.ow), "wi" = Witcher schools (KC.wi). Each of these modes (the module KC[mode])
     only while its switch in KC.FEATURES is on (a device that chose a switched-off mode sees the constellation) */
  const usable = m => m === "wod" ? !!KC.wod : WR.indexOf(m) >= 0 && !!(KC[m] && KC.FEATURES && KC.FEATURES[m]);
  const mode = scope => { const r = KC.ls.raw(KEY(scope)); return r === "1" ? "dnd" : usable(r) ? r : "sign"; };
  const setMode = (m, scope) => { const k = KEY(scope); if (m === "dnd") KC.ls.setRaw(k, "1"); else if (usable(m)) KC.ls.setRaw(k, m); else KC.ls.del(k);
    if (WRG.indexOf(m) >= 0 && usable(m)) KC.ls.setRaw(WRKEY(scope), m); };
  /* v611: ⚔ Wr is one button on the left that opens its own tabs — Chaos gods (wr), factions (wh), legions (leg), (v612) Old World (ow), Witcher (wi).
     The tab chosen last is remembered (per scope) and reopened by the ⚔ Wr button; a tab that is switched off is skipped. */
  const WR = ["wr", "wh", "leg", "ow", "wi", "av"];   /* v616: + "av" = Avatar elements (KC.av), its own button like the Witcher */
  /* v615 (owner): the Witcher (wi) is its own button next to ⚔ Wr, not a tab inside it. WR = every mode of this family
     (they need the list itself: isWr, wrOf); WRG = the tabs under ⚔ Wr. */
  const WRG = ["wr", "wh", "leg", "ow"];
  const WRKEY = scope => scope === "pair" ? KC.KEYS.wrPair : scope === "group" ? KC.KEYS.wrGroup : KC.KEYS.wr;
  const wrTabs = () => WRG.filter(usable);
  const inWrg = m => WRG.indexOf(m) >= 0;
  const wrLast = scope => { const r = KC.ls.raw(WRKEY(scope)), on = wrTabs(); return on.indexOf(r) >= 0 ? r : on[0] || null; };
  const isWr = m => WR.indexOf(m) >= 0;
  /* the module of a figure made by one of these modes (each pick() marks its figure with its mode: sg.wr, sg.wh, …), or null */
  const wrOf = sg => { const k = sg && WR.find(m => sg[m]); return k ? KC[k] : null; };
  const on = scope => mode(scope) === "dnd";
  const setOn = (v, scope) => setMode(v ? "dnd" : "sign", scope);

  KC.dnd = { FIG, VAR, ORDER, ALIGN, LIM, AXES, scores, keyOf, pick, alignNum, alignment, on, set: setOn, mode, setMode, usable, wrTabs, wrLast, isWr, inWrg, wrOf, WR, WRG,
    TYP, devs, CLS, GAP_D, EVEN_D, classes, variant,
    POLES, CL, RACES, RLIM, AXT, AXSD, RACEB, axes, zPoles, race, XP, level, DMG, MON, foes };
})(window.KC);
