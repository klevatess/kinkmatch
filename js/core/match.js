/* core/match.js — comparison rules shared by compare page and tests. */
(function (KC) {
  const POS = { yes: 1, love: 1 }, SOFT = { maybe: 1 };
  KC.match = {
    RANK: { love: 0, yes: 1, maybe: 2, limit: 3 },
    /* any "limit" wins; both positive = match; positive/maybe mix = discuss; one side only = one */
    classify(a, b) {
      if (a === "limit" || b === "limit") return "excluded";
      const pa = POS[a], pb = POS[b], sa = SOFT[a], sb = SOFT[b];
      if (pa && pb) return "match";
      if ((pa && sb) || (sa && pb) || (sa && sb)) return "discuss";
      if (pa || pb || sa || sb) return "one";
      return null;
    },
    /* -> {match, discA, discB, discBoth, oneA, oneB, exBoth, exA, exB}; rows {id, a, b} in list order.
       discA = A said "maybe" (B positive), discBoth = both "maybe"; exA = only A said "No". */
    group(A, B) {
      const g = { match: [], discA: [], discB: [], discBoth: [], oneA: [], oneB: [], exBoth: [], exA: [], exB: [] };
      KC.CATS.forEach(c => c.items.forEach(([, id]) => {
        const a = (A.items[id] || {}).interest || null, b = (B.items[id] || {}).interest || null;
        const r = KC.match.classify(a, b); if (!r) return;
        const row = { id, a, b };
        if (r === "one") (a ? g.oneA : g.oneB).push(row);
        else if (r === "excluded") (a === "limit" && b === "limit" ? g.exBoth : a === "limit" ? g.exA : g.exB).push(row);
        else if (r === "discuss") (a === "maybe" && b === "maybe" ? g.discBoth : a === "maybe" ? g.discA : g.discB).push(row);
        else g[r].push(row);
      }));
      return g;
    },
    /* items where one side said yes/love (withMaybe: also maybe): love, then yes, then maybe */
    yesOf(st, withMaybe) {
      const ok = withMaybe ? { love: 1, yes: 1, maybe: 1 } : { love: 1, yes: 1 };
      const rows = [];
      KC.CATS.forEach(c => c.items.forEach(([, id]) => {
        const v = (st.items[id] || {}).interest; if (ok[v]) rows.push({ id, v });
      }));
      return rows.sort((x, y) => KC.match.RANK[x.v] - KC.match.RANK[y.v]);
    },
  };
})(window.KC);
