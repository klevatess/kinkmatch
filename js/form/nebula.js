/* form/nebula.js — a template drawn as a nebula (v586, owner): one coloured cloud per group of sections,
   its size = the group's share of the template's items; the biggest group sits in the middle.
   Used in the template lists of Received / My lists: a round thumbnail, tap = the big card with a legend. */
(function (KC) {
  const t = (k, v) => KC.i18n.t(k, v), esc = KC.esc;
  const COL = { intimacy: "#f29bb8", bondage: "#8a2d47", fetishes: "#9b6bd6", "role-play": "#e8a94a", ds: "#c2417a", sm: "#e0674f",
    "sex-penetration": "#e0559a", "voyeurism-exhibitionism": "#4f8fd6", "bodily-fluids": "#3fb3a8", "non-monogamy": "#7a86c7", "session-length": "#b5a397" };
  const seeded = n => { let x = Math.max(1, n % 2147483646); return () => (x = (x * 16807) % 2147483647) / 2147483647; };
  let uid = 0;   /* each picture gets its own filter ids */
  /* ids -> [{id, n, share}], biggest first (groups as in the portrait; the two sections left out of it stay) */
  function shares(ids) {
    const set = {}; ids.forEach(i => { set[i] = 1; }); const by = {}, out = []; let all = 0;
    KC.CATS.forEach(c => { const g = KC.portrait.MERGE[c.id] || c.id; c.items.forEach(([, id]) => { if (!set[id]) return; all++;
      if (!by[g]) { by[g] = { id: g, n: 0 }; out.push(by[g]); } by[g].n++; }); });
    out.forEach(g => { g.share = g.n / (all || 1); });
    return out.sort((a, b) => b.n - a.n);
  }
  /* soft clouds are radial gradients, not blur filters: a list of templates stays cheap to draw on phones */
  function svg(ids, W, H, seed) {
    const G = shares(ids), k = ++uid, r = seeded(seed || 3), cx = W / 2, cy = H / 2, big = Math.min(W, H);
    let defs = "", clouds = "";
    G.forEach((g, i) => {
      const gid = "nb" + k + "-" + i;
      defs += '<radialGradient id="' + gid + '"><stop offset="0" stop-color="' + COL[g.id] + '" stop-opacity=".95"/><stop offset=".45" stop-color="' + COL[g.id] + '" stop-opacity=".45"/><stop offset="1" stop-color="' + COL[g.id] + '" stop-opacity="0"/></radialGradient>';
      /* golden-angle spiral: the biggest group in the middle, smaller ones further out */
      const ang = i * 2.4 + r() * .5, dist = i === 0 ? 0 : big * (.14 + .07 * Math.sqrt(i)), R = big * (.2 + .42 * Math.sqrt(g.share));
      const x = cx + Math.cos(ang) * dist * (W / big), y = cy + Math.sin(ang) * dist * .8;
      for (let p = 0; p < 3; p++) { const a = r() * 6.28, d = R * .3 * r();
        clouds += '<ellipse cx="' + (x + Math.cos(a) * d).toFixed(1) + '" cy="' + (y + Math.sin(a) * d).toFixed(1) + '" rx="' + (R * (.75 + r() * .4)).toFixed(1) + '" ry="' + (R * (.5 + r() * .3)).toFixed(1)
          + '" transform="rotate(' + Math.round(r() * 180) + " " + x.toFixed(1) + " " + y.toFixed(1) + ')" fill="url(#' + gid + ')" opacity="' + (.45 + .35 * g.share).toFixed(2) + '"/>'; }
    });
    let stars = "";
    for (let i = 0; i < Math.round(W * H / 700); i++) stars += '<circle cx="' + (r() * W).toFixed(1) + '" cy="' + (r() * H).toFixed(1) + '" r="' + (r() * .8 + .25).toFixed(2) + '" fill="var(--nb-star)" opacity="' + (r() * .6 + .3).toFixed(2) + '"/>';
    return '<svg class="nb-svg" viewBox="0 0 ' + W + " " + H + '" aria-hidden="true"><defs>' + defs + '</defs><rect width="' + W + '" height="' + H + '" fill="var(--nb-bg)"/>' + clouds + stars + "</svg>";
  }
  /* the big card: the nebula, the name, the item count and a legend with shares */
  function card(ids, name, seed) {
    const leg = shares(ids).map(g => '<span class="nb-lg"><i style="background:' + COL[g.id] + '"></i>' + esc(KC.portrait.label(g.id)) + " <b>" + Math.round(g.share * 100) + "%</b></span>").join("");
    return '<div class="nb-card">' + svg(ids, 340, 190, seed) + '<div class="nb-name">' + esc(name) + " <span>· " + esc(t("tpl.count", { n: ids.length })) + '</span></div><div class="nb-leg">' + leg + "</div></div>";
  }
  /* a stable seed per template, so its nebula looks the same every time */
  const seedOf = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 2147483646; return h + 1; };
  KC.nebula = { svg, card, shares, seedOf, COL };
})(window.KC);
