/* form/wod.js — the joke "World of Darkness" mode of the portrait (v597, owner), next to DnD: four lines, each
   with its own constellations — 🧛 Vampire (V20 clans), 🐺 Werewolf (W20 tribes), 🧚 Fey (Changeling kiths),
   😈 Demon (Demon: The Fallen houses). Russian names follow wod.su. v604 (owner): + the Selkies and the Clurichauns (C20).
   Which subtype: a PROFILE, not only the strongest group — every subtype has weights over the 9 portrait groups
   (letters N B F R D S X V W = intimacy, bondage, fetishes, role-play, D/s, S/M, sex, voyeurism, fluids);
   score = Σ w·(group % − the person's average % − the usual skew TYP) / Σ|w| + a calibrated bias; the highest wins.
   v603 (owner): TYP covers all 9 groups and is shared with the DnD classes (KC.dnd.TYP); the biases are calibrated
   again on lists spread like real ones, with the portrait's variant A.
   So a combination counts (fluids + sex → the Defilers), not only one group.
   v601 (owner): no Caitiff and no Ravnos; no "flat portrait" rule any more (real lists are much more even than the
   synthetic ones it was set on — every second person got Caitiff / Stargazers / Ghille Dhu); Stargazers and Ghille Dhu
   have profiles like the others. Malkavians are not a profile: everything in one point — the strongest group at
   least MALK points above the second one (after the skew). Biases are calibrated on lists spread like real ones.
   The figure: 9 stars (one per group, the sign's main groups are the bright ones, as in DnD) + grey stars.
   The text lines come from the same numbers as DnD: the race poles (KC.dnd.axes), the level, the alignment:
   - vampire: sect (Lasombra/Tzimisce = Sabbat unless Lawful Good; others Sabbat when law + good are 5 below the
     centre of real lists), generation (by level); v603 (owner): the Camarilla keeps Humanity (V20 0–10, usually 7 at
     the start): 5.5 + good / 5, −1 from level 13 and −1 from level 17 (elders lose it), within 2–8 (v606); the Sabbat follows
     a path of enlightenment (the two strongest STANDARDISED poles; no "Path of Humanity" any more);
   - werewolf: breed (Metis: taboo items liked 20+ points above the person's share; Lupus: body + hands + spont),
     auspice (the one strongest standardised pole), rank (by level); Rage = the auspice's W20 starting Rage + a rank bonus, Gnosis = the
     breed's W20 starting Gnosis + the same bonus (owner, v599);
   - fey: court (law + good > 0 = Seelie), house of that court (the strongest pole), seeming (by level);
     v603 (owner): Glamour (passion and dreams) = 2 + one per 7 % of "Love" among the answers + 1 for a Childling
     + 1 every 6 levels, within 1–10; Banality = 1 + one per 7 % of "No" (an unanswered item = half a "No")
     + 1 for a Grump, within 1–7 (the owner's cap, v599);
   - demon: faction (quarters of law / good around the centre, Cryptic in the middle), lore of the house (the strongest pole), Faith 3–6 by level (owner, v597: a
     starting demon has Faith 3, a long campaign reaches 5–6; more is near-impossible in play).
   Names are texts: "wod.<line>.<id>" and the "wod.*" keys below. */
(function (KC) {
  const LINES = ["vamp", "wolf", "fey", "demon"];
  /* v600 (owner): the usual skew of real lists (from the owner's group): almost everyone likes bondage and sex more
     than their own average and fluids / voyeurism less. Without this, bondage lovers all fell into the same few
     subtypes (Malefactors, Sluagh…). It is taken off before the profiles are compared; the biases are calibrated with it. */
  const TYP = KC.dnd.TYP;   /* v603: all 9 groups, shared with the DnD classes */
  const MALK = 9.4;   /* Malkavians: the gap between the two strongest groups (owner, v601: "concentrated in one point"; v603: recalibrated, about 1 in 12) */
  const LET = { N: "intimacy", B: "bondage", F: "fetishes", R: "role-play", D: "ds", S: "sm", X: "sex-penetration", V: "voyeurism-exhibitionism", W: "bodily-fluids" };
  /* [9 points in a 100×100 box, grey points, lines (index paths; "d" first = dashed), 3 bright slots] */
  const FIG = {
    vamp: {
      brujah: [[[4,50],[20,34],[36,50],[20,66],[62,40],[78,32],[96,50],[78,68],[62,60]],[[9,39],[31,39],[31,61],[9,61],[69,34],[89,37],[89,63],[69,66],[48,44],[50,57],[54,50]],[[0,9,1,10,2,11,3,12,0],[4,13,5,14,6,15,7,16,8],["d",17,18]],[2,4,6]],
      ventrue: [[[10,26],[30,40],[50,14],[70,40],[90,26],[14,84],[86,84],[50,64],[50,92]],[[21,58],[40,55],[60,55],[79,58],[14,68],[86,68],[50,4],[32,90],[68,90]],[[5,13,0,9,1,10,2,11,3,12,4,14,6,17,8,16,5],["d",13,14],[2,15]],[2,7,8]],
      gangrel: [[[22,42],[40,24],[60,24],[78,42],[30,68],[50,56],[70,68],[50,94],[50,74]],[[14,26],[36,6],[64,6],[86,26],[34,86],[66,86]],[[0,9],[1,10],[2,11],[3,12],[4,5,6,14,7,13,4]],[8,1,2]],
      malkavian: [[[50,4],[80,18],[94,50],[80,82],[50,96],[20,82],[6,50],[20,18],[44,46]],[[36,30],[28,20],[60,34],[70,26],[34,60],[24,70],[58,62],[66,78],[50,52]],[[0,1,2,3,4,5,6,7,0],["d",8,9,10],["d",8,11,12],["d",8,13,14],["d",8,17,15,16]],[8,0,2]],
      nosferatu: [[[4,60],[24,40],[48,30],[74,40],[97,90],[50,66],[26,74],[66,74],[92,62]],[[30,30],[0,54],[0,66],[14,70],[84,52],[97,76],[18,50]],[[0,15,1,2,3,13,8,14,4],[0,12,6,5,7,3],[1,9],[0,10],[0,11]],[0,4,2]],
      toreador: [[[36,22],[64,22],[74,40],[50,52],[26,40],[50,34],[50,97],[76,70],[38,80]],[[50,10],[43,29],[57,29],[50,64],[50,82],[52,70],[62,76]],[[0,9,1,2,3,4,0],[10,5,11],[3,12,13,6],[14,7,15,14],["d",13,8]],[5,7,8]],
      tremere: [[[50,4],[6,94],[94,94],[30,60],[70,60],[50,48],[50,72],[50,60],[50,94]],[[36,34],[64,34],[18,80],[82,80],[42,54],[58,54],[42,66],[58,66]],[[0,1,8,2,0],[3,13,5,14,4,16,6,15,3],["d",9,10],["d",11,12]],[7,0,8]],
      lasombra: [[[18,88],[50,96],[82,88],[50,80],[12,18],[38,4],[66,12],[92,30],[60,38]],[[26,62],[12,42],[46,56],[34,28],[64,60],[56,24],[80,62],[88,46],[72,32]],[[0,1,2,3,0],[0,9,10,4],[3,11,12,5],[3,13,8,17,14,6],[2,15,16,7]],[5,7,1]],
      tzimisce: [[[4,44],[18,34],[30,48],[50,58],[68,52],[86,64],[98,86],[26,6],[64,8]],[[10,54],[22,22],[40,50],[20,26],[46,24],[58,54],[50,26],[82,24],[46,74],[66,70]],[[0,1,2,3,4,5,6],[0,9,2],[1,10],[11,12,7,13,11],[14,15,8,16,14],[3,17],[4,18]],[1,8,6]],
      assamite: [[[50,4],[50,18],[30,30],[70,30],[74,52],[66,78],[32,98],[40,78],[48,54]],[[44,8],[56,8],[50,30],[60,58],[52,80]],[[9,0,10],[0,1,11],[2,11,3],[11,4,5,6,7,8,11],["d",11,12,13,6]],[0,6,4]],
      giovanni: [[[20,40],[50,6],[80,40],[26,66],[74,66],[50,94],[36,48],[64,48],[50,62]],[[30,86],[70,86],[38,80],[50,82],[62,80],[46,68],[54,68],[29,48],[43,48],[57,48],[71,48]],[[0,1,2,4,10,5,9,3,0],["d",11,12,13],[8,14],[8,15],[16,6,17],[18,7,19]],[6,7,5]],
      setite: [[[60,8],[52,26],[72,40],[84,62],[60,86],[28,82],[16,58],[34,44],[52,60]],[[66,0],[72,4],[46,66],[44,14],[68,14]],[[0,1,2,3,4,5,6,7,8,11],[0,9],[0,10],[12,0,13]],[0,8,4]],
    },
    wolf: {
      gaia: [[[86,2],[58,26],[42,12],[94,60],[70,72],[48,94],[20,86],[60,40],[28,22]],[[82,46],[90,58],[12,58],[16,38],[34,98]],[[0,1],[2,1,9,3,4,5,13,6,11,12,8,2]],[0,7,5]],
      uktena: [[[10,30],[4,8],[24,8],[30,50],[46,34],[62,58],[78,40],[92,62],[98,82]],[[4,42],[16,42],[46,44],[62,48],[78,50]],[[1,0,2],[0,9],[0,10,3,4,5,6,7,8],["d",4,11],["d",5,12],["d",6,13]],[0,8,4]],
      glass: [[[20,96],[80,96],[20,50],[80,50],[38,20],[62,20],[50,2],[34,72],[66,72]],[[50,20],[38,50],[62,50],[44,34],[56,34],[44,82],[56,82],[50,72]],[[0,2,10,4,9,5,11,3,1,0],[9,6],["d",7,16,8],["d",12,13],["d",14,15]],[6,7,8]],
      fangs: [[[4,30],[96,30],[50,16],[26,40],[74,40],[50,46],[38,86],[62,86],[50,96]],[[54,8],[16,52],[34,54],[66,54],[84,52],[50,66]],[[0,3,5,4,1],[2,5,14,6,8,7,14],[2,9],[0,10,11,5],[5,12,13,1]],[2,0,1]],
      shadow: [[[12,42],[30,24],[52,16],[72,24],[90,40],[56,52],[40,70],[58,72],[36,98]],[[20,54],[80,54],[40,54],[66,54],[42,20],[62,20]],[[0,1,13,2,14,3,4,10,12,5,11,9,0],[5,6,7,8]],[8,2,5]],
      fenris: [[[22,4],[78,4],[34,30],[66,30],[12,52],[88,52],[50,94],[38,48],[62,48]],[[50,24],[50,80],[30,76],[70,76],[42,86],[58,86]],[[2,0,4],[3,1,5],[2,9,3],[4,11,13,6,14,12,5],["d",9,10]],[7,8,6]],
      fianna: [[[8,6],[26,14],[92,6],[74,14],[30,52],[70,52],[50,48],[50,95],[50,74]],[[38,40],[62,40],[16,28],[84,28],[40,74],[60,74],[20,4],[80,4]],[[6,9,11,0],[11,1],[1,15],[6,10,12,2],[12,3],[3,16],[4,9],[5,10],[9,13,7,14,10],["d",6,8]],[0,2,7]],
      striders: [[[26,8],[74,8],[36,34],[64,34],[50,48],[20,62],[80,62],[40,95],[60,95]],[[50,20],[50,76],[26,34],[46,34],[54,34],[74,34],[36,24],[64,24]],[[0,9,1],[0,5,7,10,8,6,1],["d",11,15,12],["d",13,16,14],[2,4,3]],[2,3,4]],
      gnawers: [[[6,24],[24,6],[94,76],[76,94],[32,26],[26,32],[74,68],[68,74],[50,50]],[[8,8],[92,92]],[[0,9,1,4,6,2,10,3,7,5,0]],[8,0,2]],
      talons: [[[18,10],[28,52],[22,92],[44,4],[54,48],[48,96],[70,10],[80,52],[74,92]],[[24,30],[27,74],[50,26],[53,72],[76,30],[79,74],[20,100],[46,100]],[[0,9,1,10,2],[3,11,4,12,5],[6,13,7,14,8]],[1,4,7]],
      wendigo: [[[50,50],[50,4],[83,17],[96,50],[83,83],[50,96],[17,83],[4,50],[17,17]],[[50,22],[41,14],[59,14],[70,30],[69,18],[82,31],[78,50],[86,41],[86,59],[70,70],[82,69],[69,82],[50,78],[59,86],[41,86],[30,70],[31,82],[18,69],[22,50],[14,59],[14,41],[30,30],[18,31],[31,18]],[[0,9,1],[0,12,2],[0,15,3],[0,18,4],[0,21,5],[0,24,6],[0,27,7],[0,30,8],[10,9,11],[13,12,14],[16,15,17],[19,18,20],[22,21,23],[25,24,26],[28,27,29],[31,30,32]],[0,1,5]],
      stargazers: [[[50,50],[50,2],[68,32],[98,50],[68,68],[50,98],[32,68],[2,50],[32,32]],[[55,39],[61,45],[61,55],[55,61],[45,61],[39,55],[39,45],[45,39],[60,13],[77,23],[87,40],[87,60],[77,77],[60,87],[40,87],[23,77],[13,60],[13,40],[23,23],[40,13]],[[1,9,2,10,3,11,4,12,5,13,6,14,7,15,8,16,1],["d",17,18,19,20,21,22,23,24,25,26,27,28,17]],[0,1,5]],
    },
    fey: {
      boggan: [[[50,8],[34,26],[66,26],[16,58],[84,58],[30,90],[70,90],[2,30],[98,52]],[[14,48],[88,34],[88,74],[50,22],[24,40],[76,40],[50,94]],[[1,12,2],[0,12],[1,13,3,5,15,6,4,14,2],[3,9,7],[2,10,8,11,4]],[0,7,8]],
      sluagh: [[[50,4],[20,50],[80,50],[6,96],[94,96],[40,56],[60,56],[50,82],[50,32]],[[34,42],[66,42],[38,72],[62,72],[30,70],[70,70]],[[3,1,0,2,4],[8,9,11,7,12,10,8],["d",1,13],["d",2,14]],[5,6,0]],
      nocker: [[[14,8],[86,8],[86,30],[14,30],[50,19],[50,30],[50,64],[50,97],[66,14]],[[70,22],[63,26],[92,44],[98,36],[88,54]],[[0,1,2,3,0],[5,6,7],["d",8,9,10],[11,12],[11,13]],[8,4,7]],
      pooka: [[[30,4],[66,2],[40,42],[58,42],[24,62],[76,62],[50,92],[40,60],[50,76]],[[34,22],[46,24],[58,20],[68,24],[18,74],[82,74],[60,60]],[[2,9,0,10,2],[3,11,1,12,3],[2,4,6,5,3],[8,13],[8,14]],[7,0,6]],
      sidhe: [[[14,62],[30,40],[50,14],[70,40],[86,62],[50,44],[30,58],[70,58],[50,68]],[[6,84],[94,84],[28,74],[72,74],[40,28],[60,28]],[[9,0,1,13,2,14,3,4,10],[9,11,8,12,10]],[2,5,8]],
      redcap: [[[10,88],[90,88],[26,50],[60,6],[94,30],[74,56],[50,82],[94,44],[94,56]],[[40,24],[80,18],[82,40],[30,92],[70,92]],[[0,12,6,13,1,5,11,4,10,3,9,2,0],["d",4,7,8]],[3,4,8]],
      satyr: [[[14,10],[26,10],[38,10],[50,10],[62,10],[74,10],[86,10],[8,38],[92,38]],[[14,96],[26,86],[38,76],[50,66],[62,58],[74,50],[86,44]],[[0,9],[1,10],[2,11],[3,12],[4,13],[5,14],[6,15],[7,8]],[3,0,6]],
      eshu: [[[50,4],[50,96],[96,50],[4,50],[64,24],[36,76],[50,50],[82,82],[18,18]],[[89,60],[78,78],[60,89],[40,89],[22,78],[11,60],[11,40],[22,22],[40,11],[60,11],[78,22],[89,40]],[["d",9,10,11,12,13,14,15,16,17,18,19,20,9],[4,6,5],[0,6,1],[3,6,2]],[4,0,2]],
      troll: [[[14,94],[30,74],[40,52],[54,62],[58,22],[78,6],[94,30],[80,46],[70,30]],[[52,10],[98,16],[98,46],[64,54],[22,84]],[[0,13,1,2,4,5,6,7,3,1],[4,9],[5,10],[6,11],[7,12]],[5,8,0]],
      ghille: [[[50,8],[18,34],[82,34],[16,48],[84,48],[22,68],[78,68],[50,97],[92,6]],[[50,0],[62,12],[78,2],[34,40],[50,40],[66,40],[36,84],[64,84]],[[0,9],[1,0,2],[1,3,4,2],[3,5,15,7,16,6,4],[0,10,8,11,0],["d",12,13,14]],[0,7,8]],
      /* v604 (owner): the Selkies (a seal over the waves) and the Clurichauns (a tankard with foam) */
      selkie: [[[86,26],[97,34],[70,40],[50,46],[28,56],[8,48],[10,72],[62,66],[40,70]],[[4,90],[22,82],[40,90],[58,82],[76,90],[94,82]],[[1,0,2,3,4,5],[4,6],[2,7,8,4],["d",9,10,11,12,13,14]],[0,7,5]],
      clurichaun: [[[22,32],[64,32],[24,94],[62,94],[88,54],[34,18],[52,10],[43,62],[88,74]],[[14,24],[70,20],[64,44],[64,82],[36,46],[50,80]],[[0,1],[0,2,3,1],[11,4,8,12],[9,5,6,10],["d",13,7,14]],[6,7,4]],
    },
    demon: {
      devils: [[[50,40],[50,4],[80,40],[20,40],[50,97],[64,26],[36,26],[64,54],[36,54]],[[56,34],[44,34],[56,46],[44,46],[50,70]],[[1,9,2,11,4],[4,12,3,10,1],["d",0,13]],[0,1,4]],
      malefactors: [[[2,34],[26,26],[92,26],[92,42],[70,56],[84,92],[22,92],[36,56],[20,42]],[[60,12],[70,4],[50,2],[46,92],[60,92]],[[0,1,2,3,4,5,13,12,6,7,8,0],["d",9,10],["d",9,11]],[1,2,6]],
      scourges: [[[6,10],[4,42],[16,72],[94,10],[96,42],[84,72],[40,40],[60,40],[50,56]],[[22,30],[18,52],[26,66],[78,30],[82,52],[74,66]],[[6,0,1,2,6],[7,3,4,5,7],[6,9],[6,10],[6,11],[7,12],[7,13],[7,14],[6,8,7]],[8,0,3]],
      defilers: [[[4,82],[20,58],[34,32],[54,14],[76,20],[86,38],[72,46],[96,82],[50,86]],[[62,6],[92,24],[62,32],[28,84],[74,86]],[[0,1,2,3,4,5,6,11],[0,12,8,13,7],["d",9,10]],[3,8,6]],
      fiends: [[[16,6],[84,6],[16,94],[84,94],[44,50],[56,50],[50,28],[50,82],[50,64]],[[8,6],[92,6],[8,94],[92,94],[36,22],[64,22],[36,78],[64,78]],[[0,1],[2,3],[0,13,4,15,2],[1,14,5,16,3],[9,11],[10,12],["d",6,8,7]],[6,7,8]],
      devourers: [[[4,20],[96,20],[30,26],[70,26],[38,44],[62,44],[50,94],[32,66],[68,66]],[[12,36],[88,36],[50,16],[46,80],[54,80]],[[0,9,2],[1,10,3],[2,11,3],[2,7,6,8,3],["d",12,13]],[4,5,6]],
      slayers: [[[16,96],[30,74],[40,58],[70,10],[48,2],[22,6],[4,28],[26,18],[50,16]],[[56,34],[26,68],[34,80],[60,12]],[[0,1,2,9,3],[3,12,4,5,6,7,8,3],[10,1],[11,1]],[6,0,3]],
    },
  };
  /* profile: group letter -> weight; bias: calibrated so that every subtype comes out about equally often */
  /* v603 (owner, v600 rule "nobody in the group is a Slayer"): the Slayers keep a low bias (about 1 in 20 on the
     calibration lists); the other six houses share the rest equally */
  /* owner, v605: hand-tuned — Ventrue +0.4 / Lasombra −0.4, Devils +1.0 / Malefactors −0.35 on top of the v604 calibration,
     so that the people the owner knows get the type the owner sees in them. On recalibration: synthetic lists first,
     then add these shifts again. (Malefactors cannot go lower: a Slayer would appear in the group.) */
  const PROF = {
    vamp: { toreador: ["V1 F.5 X.3 N.4", 0.25], tremere: ["B1 D.6 R.3", 0.6], tzimisce: ["F1 S.6 W.2", 0.25], ventrue: ["D1 F.4", -0.2], brujah: ["S1 X.5", -0.34], setite: ["X1 W.4 D.3", 0.13], nosferatu: ["W1 V.3", -0.31], lasombra: ["B.8 D.8", -0.11], giovanni: ["W1 D.5", 0.64], assamite: ["S.7 W.8", 0.7], gangrel: ["R.6 S.6 N-.2", 0.07] },
    wolf: { gaia: ["N1 X.3", -0.69], uktena: ["B1 R.4", -0.12], glass: ["F1 V.3", -1.75], fangs: ["R1 D.5", 1.12], shadow: ["D1 B.4", -0.17], fenris: ["S1 D.3", 0.06], fianna: ["X1 N.3 R.2", 0.16], striders: ["V1 R.3", -0.85], gnawers: ["W1 N.2", -2.14], talons: ["R.6 S.7", 1.21], wendigo: ["B.7 S.6", 0.54], stargazers: ["R.5 D.5 N.3", 2.64] },
    fey: { boggan: ["N1 S-.3", 0.36], sluagh: ["B1 V.3", -1.38], nocker: ["F1 B.3", -1.66], pooka: ["R1 X.2", -1.77], sidhe: ["D1 V.3 F.2", 0.41], redcap: ["S1 W.6", -0.58], satyr: ["X1 N.3", 0.12], eshu: ["V1 R.4", -0.99], troll: ["N.7 D.7", 1.19], ghille: ["N.6 X.4 B-.3", 2.14],
      selkie: ["W1 N.5 R.3", 1], clurichaun: ["X1 S.6 F.3", 1.15] },
    demon: { devils: ["D1 R.3 V.3", 1.26], malefactors: ["B1 F.8", -1.16], scourges: ["N1 S.4", -0.61], defilers: ["W1 X.8", -0.34], fiends: ["R.6 V1", 0.32], devourers: ["S1 X.4 R.3", 1.18], slayers: ["R1 S.6", -1.9] },
  };
  const prof = {};   /* parsed once: line -> id -> {group: weight} */
  function weights(line) {
    if (prof[line]) return prof[line];
    const o = {}; Object.keys(PROF[line]).forEach(id => { const w = {};
      PROF[line][id][0].split(" ").forEach(tk => { w[LET[tk[0]]] = parseFloat(tk.slice(1)); }); o[id] = w; });
    return (prof[line] = o);
  }
  /* the subtype of a portrait (d = KC.portrait.compute) */
  function choose(d, line) {
    const dv = KC.dnd.devs(d); if (!dv) return null;
    const dev = dv.dev;
    if (line === "vamp") { const v = Object.keys(dev).map(k => dev[k]).sort((a, b) => b - a); if (v.length > 1 && v[0] - v[1] >= MALK) return "malkavian"; }
    const W = weights(line); let best = null, bs = -1e9;
    Object.keys(W).forEach(id => { let num = 0, den = 0;
      Object.keys(W[id]).forEach(gid => { num += W[id][gid] * (dev[gid] || 0); den += Math.abs(W[id][gid]); });
      const sc = num / den + PROF[line][id][1]; if (sc > bs) { bs = sc; best = id; } });
    return best;
  }
  /* portrait data -> the figure in the same shape as a sign / a DnD class, or null */
  function pick(d, line) {
    line = line || sub();
    const sg = KC.signs.pick(d); if (!sg) return null;
    const id = choose(d, line); if (!id) return null;
    const [P, E, L, B] = FIG[line][id];
    const rest = d.sections.filter(s => KC.signs.GROUPS.indexOf(s.id) >= 0 && sg.main.indexOf(s) < 0);
    const stars = P.map(p => ({ x: p[0], y: p[1], bright: false, s: null }));
    sg.main.forEach((m, k) => { stars[B[k]].bright = true; stars[B[k]].s = m; });
    let r = 0; stars.forEach(st => { if (!st.s) st.s = rest[r++] || null; });
    E.forEach(p => stars.push({ x: p[0], y: p[1], grey: true, bright: false, s: null }));
    return { wod: true, line, id, stars, lines: L, main: sg.main, kind: sg.kind, many: sg.many };
  }

  /* ---------- the details ---------- */
  const PATHS = { cathari: ["rush", "body"], typhon: ["mind", "ritual"], power: ["power", "mind"],
    accord: ["ritual", "power"], night: ["hard", "mind"], feral: ["hands", "body"], metamorph: ["body", "private"], blood: ["slow", "hard"],
    lilith: ["hard", "ritual"], self: ["private", "ritual"], paradox: ["play", "mind"], scorched: ["slow", "mind"], caine: ["mind", "spont"] };
  /* v602 (owner): the auspice follows the ONE strongest pole (each auspice owns 2–3 poles); it was a pair and gave
     too many Theurges (slow + mind are high in most real lists) */
  const AUSP = { ragabash: ["play", "spont"], theurge: ["mind", "private", "slow"], philodox: ["power", "ritual", "gear"],
    galliard: ["crowd", "rush", "soft"], ahroun: ["hard", "body", "hands"] };
  /* v602: paths and auspices compare STANDARDISED poles — each axis minus its usual value in real lists, divided by its
     usual spread (real lists are softer, more ritual and "mind", less gear than zero; without this every second person
     got Humanity or the Scorched Heart). Small calibrated shifts make every path / auspice about equally likely. */
  const AXT = KC.dnd.AXT, AXSD = KC.dnd.AXSD;   /* v603: re-measured with the portrait's variant A, shared with the DnD race */
  const PATHB = { cathari: -0.4, typhon: 0.23, power: 0.09, accord: 0.2, night: 0.26, feral: -0.36, metamorph: -0.32,
    blood: 0.12, lilith: 0.25, self: 0.03, paradox: -0.07, scorched: 0.03, caine: -0.07 };
  const AUSB = { ragabash: 0.16, theurge: -0.04, philodox: -0.07, galliard: -0.03, ahroun: -0.03 };
  /* v602 (owner): sect and demon faction from the alignment NUMBERS around the centre of real lists (v603: law +4, good +2),
     not from the ±15 alignment names — almost every real list is "neutral" */
  const CENTRE = { LAW: 4, GOOD: 2, R: 5, SAB: -5 };
  const HOUSES = { seelie: { gwydion: "power", beaumayn: "mind", eiluned: "ritual", dougal: "gear", liam: "soft", fiona: "rush", scathach: "hard" },
    unseelie: { aesin: "power", ailil: "mind", balor: "hard", daireann: "spont", varich: "play", leanhaun: "rush" } };
  const LORE = { devils: { celestials: "ritual", flame: "hard", radiance: "crowd" }, malefactors: { earth: "hands", forge: "gear", paths: "slow" },
    scourges: { winds: "rush", awakening: "soft", firmament: "ritual" }, defilers: { longing: "rush", storms: "hard", transfiguration: "play" },
    fiends: { light: "mind", patterns: "slow", portals: "spont" }, devourers: { beasts: "play", flesh: "body", wild: "spont" },
    slayers: { death: "hard", realms: "mind", spirit: "slow" } };
  const GEN = [15, 15, 15, 14, 14, 14, 13, 13, 13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7];
  const RANK = lv => lv <= 4 ? "cliath" : lv <= 8 ? "fostern" : lv <= 12 ? "adren" : lv <= 16 ? "athro" : "elder";
  /* v615: the Childling seeming is never given — this is a profile of adults' sexual preferences, a child stage has no place
     in it (the canon starts adult players as Wilders anyway); low levels are Wilders */
  const SEEM = lv => lv <= 14 ? "wilder" : "grump";
  const FAITH = lv => lv <= 5 ? 3 : lv <= 11 ? 4 : lv <= 17 ? 5 : 6;
  /* v599 (owner): W20 starting Rage by auspice, starting Gnosis by breed, + a bonus that grows with the rank */
  const RAGE0 = { ragabash: 1, theurge: 2, philodox: 3, galliard: 4, ahroun: 5 }, GNOSIS0 = { homid: 1, metis: 3, lupus: 5 };
  const RANKB = { cliath: 0, fostern: 1, adren: 1, athro: 2, elder: 3 };
  /* fey (v603, owner): Glamour = passion and dreams, Banality = the everyday world; v599 gave everyone Glamour 5–6 and
     Banality 3–4, now the share of "Love" (Glamour) and of "No" (Banality) spread them. +1 Glamour every 6 levels
     (bought with experience in C20) */
  const GLAM = { BASE: 2, STEP: .07, GROW: 6, MIN: 1, MAX: 10 }, BANAL = { BASE: 1, STEP: .07, MIN: 1, MAX: 7 };
  /* v603 (owner): Humanity of the Camarilla = BASE + good / HUM.K, −1 from each level in HUM.OLD, within MIN–MAX.
     v606 (owner): within 2–8 (was 3–10); the middle moved from 7 to 5.5 with the same slope, so real lists use
     the whole 2–8 scale instead of piling up at the cap */
  const HUM = { BASE: 5.5, K: 5, OLD: [13, 17], MIN: 2, MAX: 8 };
  const LIM = { FLAT: 12, METIS: 20, LUPUS: 45, MIN: 5 };
  /* the strongest of named options by pole strength (a tie: the first one) */
  const best = (opts, val) => Object.keys(opts).reduce((a, b) => val(opts[b], b) > val(opts[a], a) ? b : a);
  function strengths(st, set) {
    const ax = KC.dnd.axes(st, set), str = {};
    KC.dnd.POLES.forEach(([a, b], i) => { str[a] = Math.max(0, ax[i]); str[b] = Math.max(0, -ax[i]); });
    return { ax, str, z: KC.dnd.zPoles(st, set) };
  }
  /* Metis: the taboo cluster (fluids, blood, "dirty" play) is liked clearly more than everything else */
  function metis(st, set) {
    const LIKE = { yes: 1, love: 1 }, taboo = KC.dnd.CL.taboo[1].split(" ");
    let tn = 0, tl = 0, an = 0, al = 0;
    KC.CATS.forEach(c => c.items.forEach(([, id]) => { if (set && !set.has(id)) return; const v = (st.items[id] || {}).interest; if (!v) return;
      an++; if (LIKE[v]) al++; if (taboo.indexOf(id) >= 0) { tn++; if (LIKE[v]) tl++; } }));
    return tn >= LIM.MIN && an > 0 && 100 * tl / tn - 100 * al / an >= LIM.METIS;
  }
  /* st = the list, d = its portrait, set = the applied template (or null) -> {line, id, ...details} */
  function details(st, d, set, line, id) {
    const { str, z } = strengths(st, set), lv = KC.dnd.level(st, set), an = KC.dnd.alignNum(st, d, set), al = KC.dnd.alignment(st, d, set);
    const roll = al === "roll", o = { line, id, lv, roll };
    if (line === "vamp") {
      o.sect = roll ? null : (id === "lasombra" || id === "tzimisce") ? (al === "LG" ? "cam" : "sab") : (an.law - CENTRE.LAW) + (an.good - CENTRE.GOOD) < CENTRE.SAB ? "sab" : "cam";
      o.gen = GEN[Math.min(20, Math.max(1, lv)) - 1];
      if (o.sect === "cam") o.hum = Math.max(HUM.MIN, Math.min(HUM.MAX, Math.round(HUM.BASE + an.good / HUM.K) - HUM.OLD.filter(x => lv >= x).length));
      else o.path = best(PATHS, (p, k) => z[p[0]] + z[p[1]] + PATHB[k]);   /* the Sabbat, or no sect yet (rolling the dice) */
    } else if (line === "wolf") {
      o.breed = id === "talons" ? "lupus" : metis(st, set) ? "metis" : str.body + str.hands + str.spont >= LIM.LUPUS ? "lupus" : "homid";
      if (o.breed === "metis" && (id === "fianna" || id === "fangs")) o.breed = "homid";
      o.aus = best(AUSP, (ps, k) => Math.max.apply(null, ps.map(p => z[p])) + AUSB[k]); o.rank = RANK(lv);
      o.rage = RAGE0[o.aus] + RANKB[o.rank]; o.gnosis = GNOSIS0[o.breed] + RANKB[o.rank];
    } else if (line === "fey") {
      o.court = roll ? null : an.key === "boring" || an.law + an.good > 0 ? "seelie" : "unseelie";
      o.house = o.court ? best(HOUSES[o.court], p => str[p]) : null;
      o.seem = SEEM(lv);
      const clamp = (v, L) => Math.max(L.MIN, Math.min(L.MAX, v));
      o.glamour = clamp(GLAM.BASE + Math.floor(an.pLove / GLAM.STEP + 1e-9) + (o.seem === "childling" ? 1 : 0) + Math.floor((lv - 1) / GLAM.GROW), GLAM);
      o.banality = clamp(BANAL.BASE + Math.floor(an.pNo / BANAL.STEP + 1e-9) + (o.seem === "grump" ? 1 : 0), BANAL);
    } else if (line === "demon") {
      const dl = an.law - CENTRE.LAW, dg = an.good - CENTRE.GOOD;   /* quarters around the centre, a small middle circle */
      o.fac = roll ? null : Math.abs(dl) < CENTRE.R && Math.abs(dg) < CENTRE.R ? "cryptic" : dl >= 0 ? (dg >= 0 ? "reconciler" : "faustian") : (dg >= 0 ? "luciferan" : "ravener");
      o.lore = best(LORE[id], p => str[p]); o.faith = FAITH(lv);
    }
    return o;
  }
  /* the two text lines under the name: rl (standing) and sub (without the groups) */
  function lines(dt, t) {
    const roll = t("dnd.al.roll");
    if (dt.line === "vamp") return { rl: (dt.sect ? t("wod.sect." + dt.sect) : roll) + " · " + t("wod.gen", { n: dt.gen }), sub: dt.hum !== undefined ? t("wod.hum", { n: dt.hum }) : t("wod.path." + dt.path) };
    if (dt.line === "wolf") return { rl: t("wod.breed." + dt.breed) + " · " + t("wod.aus." + dt.aus), sub: t("wod.rank." + dt.rank) + " · " + t("wod.rage", { n: dt.rage }) + " · " + t("wod.gnosis", { n: dt.gnosis }) };
    if (dt.line === "fey") return { rl: dt.court ? t("wod.court." + dt.court) + " · " + t("wod.house." + dt.house) : roll, sub: t("wod.seem." + dt.seem) + " · " + t("wod.glamour", { n: dt.glamour }) + " · " + t("wod.banality", { n: dt.banality }) };
    return { rl: (dt.fac ? t("wod.fac." + dt.fac) : roll) + " · " + t("wod.faith", { n: dt.faith }), sub: t("wod.demon.a." + dt.id) + " · " + t("wod.lore." + dt.lore) };
  }
  /* how close two figures are: the same subtype; a main group in common; nothing */
  function closeness(a, b) {
    const shared = a.main.map(m => m.id).filter(g => b.main.some(m => m.id === g));
    return { level: a.id === b.id ? "same" : shared.length ? "near" : "far", shared };
  }

  /* the line is remembered on this device only (vamp by default), separately for the portrait, the pair and the
     company (scope, as in KC.dnd.mode, v599) */
  const KEY = scope => scope === "pair" ? KC.KEYS.wodPair : scope === "group" ? KC.KEYS.wodGroup : KC.KEYS.wod;
  const sub = scope => { const r = KC.ls.raw(KEY(scope)); return LINES.indexOf(r) >= 0 ? r : "vamp"; };
  const setSub = (v, scope) => { if (LINES.indexOf(v) >= 0) KC.ls.setRaw(KEY(scope), v); };

  /* the mode switch built the same way for the portrait and the compare page (each view keeps its own choice):
     one row — "⚔ Wr" on the left (v611, only when one of its tabs is switched on), "✦ Constellation | 🎲 DnD | 🦇 World of Darkness" on the right;
     under it, the tabs of the open group: World of Darkness "🧛 Vampire | 🐺 Werewolf | 🧚 Fey | 😈 Demon",
     or ⚔ Wr "Chaos gods | 🌌 40K | 🛡 Legion" (only the tabs that are switched on, and only when there are two or more) */
  function switchHTML(scope) {
    const t = k => KC.i18n.t(k), esc = KC.esc, m = KC.dnd.mode(scope), cur = sub(scope), tabs = KC.dnd.wrTabs(), wrOn = KC.dnd.inWrg(m);
    const b = (attr, v, key, pressed, cls) => '<button type="button" class="btn ghost mini' + (cls ? " " + cls : "") + '" ' + attr + '="' + v + '" aria-pressed="' + pressed + '">' + esc(t(key)) + "</button>";
    const wi = KC.dnd.usable("wi"), av = KC.dnd.usable("av");   /* v615: 🗡 Witcher, v616: 🌀 Avatar — own buttons on the left, after ⚔ Wr */
    return '<div class="pt-mode" role="group" aria-label="' + esc(t("dnd.switch")) + '">'
      + (tabs.length ? b("data-mode", wrOn ? m : KC.dnd.wrLast(scope), "wr.toWr", wrOn, "pt-wrb" + (wi || av ? "" : " pt-left-end")) : "")
      + (wi ? b("data-mode", "wi", "wi.toWi", m === "wi", "pt-wib" + (av ? "" : " pt-left-end")) : "")
      + (av ? b("data-mode", "av", "av.toAv", m === "av", "pt-avb pt-left-end") : "")
      + b("data-mode", "sign", "dnd.toSign", m === "sign") + b("data-mode", "dnd", "dnd.toDnd", m === "dnd") + b("data-mode", "wod", "wod.toWod", m === "wod") + "</div>"
      + (wrOn && tabs.length > 1 ? '<div class="pt-mode pt-wr-sub" role="group" aria-label="' + esc(t("wr.switch")) + '">' + tabs.map(x => b("data-mode", x, { wr: "wr.gods", wh: "wh.toWh", leg: "leg.toLeg", ow: "ow.toOw" }[x], m === x)).join("") + "</div>" : "")
      + (m === "wod" ? '<div class="pt-mode pt-wod-sub" role="group" aria-label="' + esc(t("wod.switch")) + '">' + LINES.map(l => b("data-wod", l, "wod.l." + l, l === cur)).join("") + "</div>" : "");
  }
  /* under the mode: only "not official World of Darkness material" (owner, v597); the full Dark Pack notice
     (Paradox Interactive AB) is in the help texts help.wod_html / help.compareWod_html */
  const noticeHTML = () => '<div class="wod-note">' + KC.esc(KC.i18n.t("wod.notOfficial")) + "</div>";

  KC.wod = { switchHTML, noticeHTML, TYP, AXT, AXSD, PATHB, AUSB, CENTRE, FAITH, RAGE0, GNOSIS0, RANKB, GLAM, BANAL, HUM, LINES, FIG, PROF, MALK, LIM, PATHS, AUSP, HOUSES, LORE, GEN, choose, pick, details, lines, closeness, sub, setSub };
})(window.KC);
