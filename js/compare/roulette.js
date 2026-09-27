/* compare/roulette.js — "What shall we try?" on the compare page.
   Two people: one random practice both marked Yes/Love. Group (3+): random pairs, each pair gets
   OPTIONS practices (a practice may not suit the place, so there is a choice). "Bolder" also takes a
   practice one of the two marked Yes/Love and the other Maybe. A "No" from anyone never comes up.
   What comes up (owner's choice, v577):
   - a section is picked first, by WEIGHT (only sections where the pair has something), then a practice in it;
     one pair never gets two practices from the same section;
   - SKIP: practices that need rare gear, costumes, preparation or sterility, other people, the street or days,
     or are too risky to suggest at random. They stay in the list — only the roulette leaves them out.
   Nothing repeats for a pair until everything suitable has come up once. With the Top + Bottom filter on
   (pair tables), only Top + Bottom pairs are formed. A short name-flicker plays unless the device asks for
   reduced motion. */
(function (KC) {
  const t = (k, v) => KC.i18n.t(k, v), esc = KC.esc;
  const OPTIONS = 3, POS = { yes: 1, love: 1 };
  const WEIGHT = { "sex-penetration": 4, "bondage": 4, "humiliation": 4, "service-control": 3, "impact-rough-play": 3,
    "fetishes": 2, "bodily-fluids": 2, "intimacy": 1, "sensation-play": 1, "role-play": 0.5, "marking": 0.5,
    "voyeurism-exhibitionism": 0.5, "non-monogamy": 0, "session-length": 0 };
  const SKIP = {};
  ("sleepover aftercare shared-bathing using-real-names " +
   /* bondage: furniture, rare gear, long, outdoors, unattended */
   "arm-leg-sleeves bondage-all-day cages-cells chastity-device collar-in-public hood-full-head left-tied-unattended leash-walk-outside " +
   "stocks straight-jacket sleep-sacks bondage-bag vacbed fuck-box locking-anal-plug locking-vaginal-insert nose-hook outdoor-bondage " +
   "chained-outdoors burial-up-to-the-neck " +
   /* fetishes: costumes and special clothes, set-ups */
   "gas-masks masks corsets cross-dressing high-heel-wearing rubber-latex-wearing latex-sweat spandex-clothing cosplay kigurumi " +
   "nerd-hikikomori clowncore formal-clothing slutty-clothing size-difference piercing-fetish squirting smoking-fetish nyotaimori " +
   "sake-from-thighs drinking-bathwater forced-drinking-bathwater mud-play " +
   /* role-play: staged scenarios, lifestyle, walls, strangers */
   "abandonment age-play xenophilia-tentacles egg-laying size-giantess dd-lg-md-lb auctioned initiation-rites interrogations kidnapping " +
   "medical-scenes psych-ward-play prison-scenes schoolroom-scenes blind-stranger glory-hole stuck-in-wall sleep-play total-power-exchange " +
   "cheating-fantasy other-roleplaying 24-7-d-s-lifestyle " +
   /* service: long-term, other people, in public, uniforms */
   "chores chosen-clothing chosen-food contract-slave daily-diary exercise-required chauffeuring manicures mantra-meditation " +
   "personality-modification phone-sex photo-proof harems serving-other-doms used-as-toy-for-other-sub other-sub-serves-you " +
   "vibro-egg-public remote-controlled-toy uniform-wearing symbolic-jewelry " +
   /* impact: skill or special material */
   "whipping-single-tail sauna-whisk birching nettle-play-urtication sap-gloves " +
   /* sensation: electricity, fire, needles, medical, preparation, weather, risky breath play */
   "electricity-tens electricity-violet-wand shock-collar electricity-internal cbt-electrical vaginal-electrostimulation " +
   "electricity-genitals-external electricity-anal electricity-genital-internal fire-play fire-cupping zippers-needles piercing-temporary " +
   "nipple-piercing piercing-permanent labia-sewing-needle labia-stapling medical-stapler dilation riding-the-horse enema-cleansing " +
   "enema-retention water-torture sleep-deprivation asphyxiation breath-control-choking standing-on-nails spike-mat leeches " +
   "wax-inside-vagina menthol-eye-drops wasabi-on-genitals figging hair-drag-snow hair-drag-rain cold-shower ice-dildo " +
   "hot-wax-high-temp hot-wax-hair-removal suction-cups " +
   /* humiliation: in public, props, other people */
   "humiliation-in-public human-ashtray dronification mindbreak shaving-head-hair kneeling-on-buckwheat corner-kneeler mouth-soaping " +
   "forced-homosexuality forced-watching-others forced-porn-watching forced-feminization " +
   /* fluids */
   "blood-play injections-saline milking period-play funnel-play bukkake cum-in-eyes " +
   /* marking: permanent or burns */
   "tattooing branding scarification wax-burns " +
   /* sex: machines, medical, in public, needs its own talk */
   "sybian sex-machines urethral-play catheterization speculums anal-plug-public irrumatio-to-vomiting " +
   "rough-penetration-before-arousal fantasy-rape-play cnc-single dubcon " +
   /* voyeurism: street, strangers, recording, others */
   "exhibitionism-friends exhibitionism-strangers forced-nudity-others outdoor-scenes nude-in-snow fake-public-use photo-exchange " +
   "video-of-you video-others voyeurism-others voyeurism-your-dom outdoor-sex sex-in-snow sex-in-rain"
  ).split(/\s+/).forEach(id => { if (id) SKIP[id] = 1; });
  const seen = {};                           /* pair key -> {item id: 1} already shown */
  const modal = KC.modal("rlOverlay", "rlClose");
  let spinTimer = null;
  const SEC = {}; KC.CATS.forEach(c => c.items.forEach(([, id]) => { SEC[id] = c.id; }));
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const ans = (st, id) => (st.items[id] || {}).interest || null;
  /* what both can do (never a No), minus SKIP and sections with weight 0 */
  function pool(A, B, bold) {
    const out = [];
    KC.CATS.forEach(c => { if (!WEIGHT[c.id]) return; c.items.forEach(([, id]) => {
      if (SKIP[id]) return;
      const a = ans(A, id), b = ans(B, id);
      if ((POS[a] && POS[b]) || (bold && ((POS[a] && b === "maybe") || (a === "maybe" && POS[b])))) out.push(id);
    }); });
    return out;
  }
  /* one section by weight among those that have items in `ids`, minus `used` sections */
  function pickSection(ids, used) {
    const secs = {}; ids.forEach(id => { if (!used[SEC[id]]) secs[SEC[id]] = 1; });
    const list = Object.keys(secs); if (!list.length) return null;
    let r = Math.random() * list.reduce((a, s) => a + WEIGHT[s], 0);
    for (const s of list) { r -= WEIGHT[s]; if (r <= 0) return s; }
    return list[list.length - 1];
  }
  const keyOf = (a, b, bold) => [a.st.uid || a.name, b.st.uid || b.name].sort().join("|") + (bold ? "+" : "");
  /* n practices for a pair, none repeated until all were shown (then it starts over and says so) */
  function draw(a, b, bold, n) {
    const all = pool(a.st, b.st, bold), k = keyOf(a, b, bold), s = seen[k] || (seen[k] = {});
    if (!all.length) return { ids: [], reset: false };
    let fresh = all.filter(id => !s[id]), reset = false;
    if (!fresh.length) { Object.keys(s).forEach(id => { delete s[id]; }); fresh = all.slice(); reset = true; }
    /* one practice per section; a section weighs WEIGHT. Not-yet-shown practices first; when they run out
       in the other sections, an already-shown one fills the place (better than fewer options) */
    const ids = [], used = {};
    while (ids.length < n) {
      let src = fresh, sec = pickSection(src, used);
      if (!sec) { src = all; sec = pickSection(src, used); }
      if (!sec) break;
      const inSec = src.filter(id => SEC[id] === sec);
      ids.push(inSec[Math.floor(Math.random() * inSec.length)]); used[sec] = 1;
    }
    ids.forEach(id => { s[id] = 1; });
    return { ids, reset };
  }
  /* random pairs for a group; with the Top + Bottom filter only such pairs. Tries a few shuffles and keeps the
     one where the most pairs have something in common. */
  function pairUp(P, roleOnly, bold) {
    const role = p => p.st.meta.role || "";
    let best = null;
    for (let tr = 0; tr < 40; tr++) {
      let pairs = [], alone = [];
      if (roleOnly) {
        const doms = shuffle(P.filter(p => role(p) === "dom")), subs = shuffle(P.filter(p => role(p) === "sub"));
        const n = Math.min(doms.length, subs.length);
        for (let i = 0; i < n; i++) pairs.push([doms[i], subs[i]]);
        alone = doms.slice(n).concat(subs.slice(n), P.filter(p => !role(p)));
      } else {
        const q = shuffle(P.slice());
        for (let i = 0; i + 1 < q.length; i += 2) pairs.push([q[i], q[i + 1]]);
        if (q.length % 2) alone.push(q[q.length - 1]);
      }
      const score = pairs.filter(([a, b]) => pool(a.st, b.st, bold).length).length;
      if (!best || score > best.score) best = { pairs, alone, score };
      if (score === pairs.length) break;
    }
    return best;
  }

  const itemHtml = id => '<div class="rl-item"><b>' + esc(KC.i18n.item(id).name) + "</b>"
    + (KC.i18n.lang !== "en" ? '<span class="sub">' + esc(KC.i18n.item(id, "en").name) + "</span>" : "")
    + (KC.i18n.item(id).desc ? '<span class="rl-desc">' + esc(KC.i18n.item(id).desc) + "</span>" : "") + "</div>";

  function spin() {
    const S = KC.cmpState(), bold = KC.$("rlBold").checked, out = KC.$("rlOut");
    let html = "", names = [];
    if (S.pair) {
      const a = { name: S.pair.nA, st: S.pair.A }, b = { name: S.pair.nB, st: S.pair.B };
      const r = draw(a, b, bold, 1);
      if (!r.ids.length) html = '<p class="rl-note">' + esc(t(bold ? "rl.noneBold" : "rl.none")) + "</p>";
      else { html = (r.reset ? '<p class="rl-note">' + esc(t("rl.reset")) + "</p>" : "") + itemHtml(r.ids[0]); names = pool(a.st, b.st, bold); }
    } else if (S.group) {
      const pu = pairUp(S.group, S.pmode === "role", bold);
      html = '<p class="rl-note">' + esc(t("rl.groupNote", { n: OPTIONS })) + "</p>";
      pu.pairs.forEach(([a, b]) => {
        const r = draw(a, b, bold, OPTIONS), role = p => p.st.meta.role ? " (" + t("role.short." + p.st.meta.role) + ")" : "";
        html += '<div class="rl-pair"><h4>' + esc(t("rl.pair", { a: a.name + role(a), b: b.name + role(b) })) + "</h4>"
          + (r.ids.length ? (r.reset ? '<p class="rl-note">' + esc(t("rl.reset")) + "</p>" : "") + r.ids.map(itemHtml).join("") : '<p class="rl-note">' + esc(t("rl.pairNone")) + "</p>") + "</div>";
        names = names.concat(pool(a.st, b.st, bold));
      });
      pu.alone.forEach(p => { html += '<p class="rl-note">' + esc(t("rl.alone", { name: p.name })) + "</p>"; });
    }
    KC.stats.event("roulette");
    /* the flicker: a few random names from the pool, then the result */
    clearInterval(spinTimer);
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || names.length < 2) { out.innerHTML = html; return; }
    let n = 0; out.classList.add("rl-spinning");
    spinTimer = setInterval(() => {
      out.innerHTML = '<div class="rl-item"><b>' + esc(KC.i18n.item(names[Math.floor(Math.random() * names.length)]).name) + "</b></div>";
      if (++n >= 12) { clearInterval(spinTimer); out.classList.remove("rl-spinning"); out.innerHTML = html; }
    }, 70);
  }

  KC.roulette = {
    open() { KC.$("rlH").textContent = t("rl.h"); modal.open(); spin(); },
    /* for tests */ pool, draw, pairUp, spin, WEIGHT, SKIP, SEC,
  };
  KC.$("rlAgain").addEventListener("click", spin);
  KC.$("rlBold").addEventListener("change", spin);
})(window.KC);
