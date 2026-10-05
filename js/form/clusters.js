/* form/clusters.js — the 42 clusters of practices used by the joke modes ⚔ Wr, Warhammer factions and legions (v610).
   27 come from the DnD race poles (KC.dnd.CL), 15 are new (Warhammer plan, Oct 2). A cluster's value = 100 × the mean
   of its answered items (Love 1, Yes .8, Maybe .3, No 0); z = (value − its usual value) / its usual spread, 0 with fewer
   than MIN answers. USUAL = [usual value, usual spread] measured on the owner's group (16 lists, Oct 3); a local script
   re-measures them. */
(function (KC) {
  const NEW = {
    fire: "fire-play fire-cupping wax-play hot-wax-dripping hot-wax-high-temp wax-burns branding hot-wax-hair-removal wax-inside-vagina",
    penance: "kneeling-on-buckwheat corner-kneeler standing-on-nails spike-mat whipping-flogger birching caning-english rattan lecturing forced-thanking standing-in-corner punishment-scene kneeling discipline mouth-soaping bastinado",
    machines: "sex-machines sybian magic-wand remote-controlled-toy electricity-tens electricity-violet-wand electricity-internal vacbed dronification shock-collar vibro-egg-public suction-vibrator vaginal-electrostimulation electricity-genitals-external sex-doll-use",
    flesh: "piercing-temporary piercing-permanent nipple-piercing scarification tattooing branding medical-stapler labia-stapling shaving-head-hair shaving-body-hair bruising-temporary impact-bruising body-writing humiliating-body-writing",
    stasis: "mummification sleep-sacks vacbed bondage-all-day sleep-play session-multi-day no-sounds bondage-bag immobilisation left-tied-unattended straight-jacket speech-restrictions sensory-deprivation session-day",
    hunt: "kidnapping fear-play cnc-single fantasy-rape-play wrestling brat-taming bratting outdoor-scenes leash-walk-outside abandoned-building-sex dubcon blind-stranger",
    devour: "xenophilia-tentacles egg-laying breeding-fantasy deep-throating swallowing-semen hand-feeding fisting-vaginal fisting-anal irrumatio swallowing-urine snowballing creampie sucking-cum-from-vagina",
    filth: "mud-play trash-play forced-staying-in-sweat-cum latex-sweat human-ashtray spitting spitting-in-mouth floor-licking hair-as-mop sock-gag-own sock-gag-top food-smearing-sploshing forced-floor-eating pet-food-eating",
    vows: "honorifics mantra-meditation symbolic-jewelry contract-slave initiation-rites daily-diary speech-restrictions chastity-device name-change rituals metal-collar collar-in-private",
    stage: "cosplay masks clowncore kigurumi erotic-dancing stripping mirror-play erotic-photos video-of-you serving-as-art sex-in-front-of-a-mirror formal-clothing",
    property: "auctioned contract-slave harems shared-temporarily freeuse total-power-exchange 24-7-d-s-lifestyle gor-training supplying-fantasy multiple-subs-one-dom objectification",
    blood: "blood-play knife-play period-play scarification finger-claws vampire-gloves biting-hard leeches injections-saline",
    cold: "sex-in-snow sex-in-rain nude-in-snow cold-shower ice-cubes ice-dildo water-torture hair-drag-snow hair-drag-rain",
    pack: "group-mixed orgy group-multiple-men group-multiple-women multiple-subs-one-dom harems other-sub-serves-you used-as-toy-for-other-sub forced-watching-others serving-other-doms",
    armor: "leather-wearing rubber-latex-wearing gas-masks hood-full-head harness-leather metal-collar chastity-device uniform-wearing corsets muzzles spandex-clothing harness-rope",
  };
  const USUAL = { protocol: [47, 16], pet: [56, 14], service: [43, 16], object: [59, 22], words: [55, 18], look: [47, 14], wardrobe: [60, 12],
    worship: [49, 18], rope: [66, 15], iron: [46, 16], dark: [55, 13], touch: [60, 13], spank: [62, 16], extreme: [33, 18], lab: [48, 21],
    edge: [56, 19], orgasm: [63, 19], public: [53, 17], watch: [54, 13], wild: [38, 20], feast: [29, 13], taboo: [40, 16], home: [73, 10],
    size: [51, 21], company: [54, 24], classic: [64, 17], cum: [54, 23], fire: [35, 20], penance: [49, 17], machines: [59, 21], flesh: [39, 18],
    stasis: [53, 18], hunt: [61, 19], devour: [45, 19], filth: [34, 18], vows: [47, 18], stage: [56, 14], property: [49, 18], blood: [39, 22],
    pack: [62, 23], armor: [53, 18], cold: [35, 23] };
  const MIN = 3, RW = { love: 1, yes: .8, maybe: .3, limit: 0 };
  let IDS = null;
  const ids = () => {
    if (IDS) return IDS;
    IDS = {}; Object.keys(KC.dnd.CL).forEach(k => { IDS[k] = KC.dnd.CL[k][1].split(" "); });
    Object.keys(NEW).forEach(k => { IDS[k] = NEW[k].split(" "); });
    return IDS;
  };
  /* liked share 0–100 of the answered items among ids (null when none) and how many were answered */
  function liked(st, list, set) {
    let n = 0, s = 0;
    list.forEach(id => { if (set && !set.has(id)) return; const v = (st.items[id] || {}).interest; if (v) { n++; s += RW[v]; } });
    return { n, v: n ? 100 * s / n : null };
  }
  function z(st, k, set) { const r = liked(st, ids()[k], set), u = USUAL[k]; return r.n < MIN ? 0 : (r.v - u[0]) / u[1]; }
  /* how many clusters are clearly above their usual value (z ≥ 1) */
  const strong = (st, set) => Object.keys(USUAL).filter(k => z(st, k, set) >= 1).length;
  /* share (0–100) of Yes + Love among all answers, and of Love */
  function shares(st, set) {
    let n = 0, yl = 0, love = 0, no = 0;
    KC.CATS.forEach(c => c.items.forEach(([, id]) => { if (set && !set.has(id)) return; const v = (st.items[id] || {}).interest; if (!v) return;
      n++; if (v === "yes" || v === "love") yl++; if (v === "love") love++; if (v === "limit") no++; }));
    return { n, yesLove: n ? 100 * yl / n : 0, love: n ? 100 * love / n : 0, no: n ? 100 * no / n : 0 };
  }
  KC.clusters = { NEW, USUAL, MIN, ids, liked, z, strong, shares };
})(window.KC);
