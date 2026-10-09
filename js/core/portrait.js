/* core/portrait.js — the "portrait" of a list: how much each group of sections is liked, in percent.
   Groups: most sections on their own; D/s = service & control + humiliation; S/M = impact + sensation + marking.
   "Session length" and "Non-monogamy" are not part of the portrait (the sections themselves stay in the form).
   Answer points: Love 1.2, Yes 1, Maybe 0.4, No −1; unanswered items do not count.
   Percent of a group = ½ "how much" + ½ "how many", both measured against the person's own answers:
     how much = the group's average points, with SHRINK imaginary answers at the person's overall average added
                (a group with 3 answers stays near the person's usual level; with 60 answers they hardly matter);
     how many = 1 − e^(−liked points of the group / scale), scale = the person's liked points per group (≥ VMIN),
                so someone who marks a lot needs more for the same percent. Liked points = Love + Yes + Maybe only:
                v603 (owner, variant A) — "No" answers are not subtracted here (they already lower "how much"); before,
                a group with more "No" than "Yes" got 0 % however many Yes it had.
   A group with fewer than MIN answers has no percentage (null). Shared by the form page (portrait,
   picture card, PDF) and tests. */
(function (KC) {
  const W = { love: 1.2, yes: 1, maybe: 0.4, limit: -1 }, MAX = 1.2, MIN = 3, SHRINK = 8, VMIN = 6;
  const OUT = { "session-length": 1, "non-monogamy": 1 };
  /* section -> group; groups keep the order of the first section in KC.CATS */
  const MERGE = { "service-control": "ds", "humiliation": "ds", "impact-rough-play": "sm", "sensation-play": "sm", "marking": "sm", "hardcore": "bodily-fluids" };   /* v624: the hardcore section counts with the fluids */
  const groupOf = id => MERGE[id] || id;
  /* alphabetical in the current language (locale-aware) */
  const byName = (a, b) => KC.i18n.item(a).name.localeCompare(KC.i18n.item(b).name, KC.i18n.locale());

  KC.portrait = {
    W, MIN, SHRINK, OUT, MERGE,
    /* name of a group in the current language */
    label(id) { return id === "ds" || id === "sm" ? KC.i18n.t("pt.g." + id) : KC.i18n.cat(id); },
    /* st -> { sections: [{id, pct|null, answered, total}] sorted by pct (high first), love: [ids A–Z], limits: [ids A–Z],
       answered } — only items inside `set` (applied template) when given */
    compute(st, set) {
      const items = (st && st.items) || {};
      const groups = [], by = {}, love = [], limits = [];
      KC.CATS.forEach(c => {
        if (OUT[c.id]) return;
        const gid = groupOf(c.id);
        let g = by[gid]; if (!g) { g = by[gid] = { id: gid, sum: 0, pos: 0, n: 0, total: 0 }; groups.push(g); }
        c.items.forEach(([, id]) => {
          if (set && !set[id]) return;
          g.total++;
          const v = (items[id] || {}).interest; if (!W.hasOwnProperty(v)) return;
          g.sum += W[v]; g.pos += Math.max(0, W[v]); g.n++;
          if (v === "love") love.push(id); else if (v === "limit") limits.push(id);
        });
      });
      const used = groups.filter(g => g.total);
      const S = used.reduce((a, g) => a + g.sum, 0);
      const answered = used.reduce((a, g) => a + g.n, 0);
      const mu = answered ? S / answered : 0;                             /* the person's average points per answer */
      const withAns = used.filter(g => g.n).length;
      const liked = used.reduce((a, g) => a + g.pos, 0);
      const scale = Math.max(VMIN, withAns ? liked / withAns : 0);        /* the person's liked points per group */
      const sections = used.map(g => {
        let pct = null;
        if (g.n >= MIN) {
          const much = Math.max(0, (g.sum + SHRINK * mu) / (g.n + SHRINK) / MAX);
          const many = 1 - Math.exp(-g.pos / scale);
          pct = Math.max(0, Math.min(100, Math.round(100 * (much + many) / 2)));
        }
        return { id: g.id, pct, answered: g.n, total: g.total };
      });
      sections.sort((a, b) => (b.pct === null ? -1 : b.pct) - (a.pct === null ? -1 : a.pct));
      love.sort(byName); limits.sort(byName);
      return { sections, love, limits, answered };
    },
  };
})(window.KC);
