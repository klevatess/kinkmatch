/* form/portrait.js — "My portrait" (a folding block under "About me"), the vertical picture card and the
   portrait page for the PDF. Numbers come from core/portrait.js. Works for my list and for someone's list
   opened from a link (then it is "Portrait: <name>"). Follows the applied template like the rest of the page.
   The card is drawn on a <canvas> (1080×1920): no names or answers leave the device unless the user saves it.
   On top of both: the constellation sign (KC.signs) — 9 stars, one per group, each labelled "group / %".
   The card follows the site theme: light theme = paper card, dark theme = night card.
   DnD mode (v591, KC.dnd): a switch above the picture shows a D&D class, subclass and joke alignment instead of
   the sign; the picture card follows the mode shown. Grey stars of a class figure only shape the drawing.
   World of Darkness mode (v597, KC.wod): the third button; a second row picks the line (vampire, werewolf, fey,
   demon); the figure is the clan / tribe / kith / house, the lines under it come from KC.wod.details.
   Servant of the Chaos gods (v610, KC.wr): the fourth button; the figure is the patron's sign, under it only
   "Servant of <god>", the main groups and the "unofficial fan-made material" line. */
(function (KC) {
  const F = KC.form, t = (k, v) => KC.i18n.t(k, v), esc = KC.esc;
  const SITE = (KC.migrate ? KC.migrate.NEW_URL : "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const sec = KC.$("portraitSection"), body = KC.$("portraitBody");
  let ptLang = null;   /* the language the open portrait was drawn in */

  /* v613: an extended list has a portrait per role — PTR is the role being drawn ("t" | "b"); everything below reads
     the list through shownR(), the plain list of that role (core/ext.js). A plain list: PTR is ignored. */
  let PTR = null, CARD_R = "t";
  /* v618 (owner): the portrait (every mode, the card, the PDF page, the constellation guide) judges the WHOLE list — never
     only the items of an applied template or of a filter */
  const whole = () => F.state;
  const shownR = () => { const s = whole(); return KC.ext.isExt(s) ? KC.ext.view(s, PTR || "t") : s; };
  const data = () => KC.portrait.compute(shownR(), null);
  const pctText = p => (p === null ? "—" : p + "%");
  const metaBits = st => ["role", "exp"].map(f => st.meta[f] ? KC.i18n.optLabel(f, st.meta[f]) : "").filter(Boolean);


  /* ---------- the constellation sign ---------- */
  const short = id => t("pt.s." + id);
  const spark = (x, y, r) => "M" + x + " " + (y - r) + "Q" + x + " " + y + " " + (x + r) + " " + y + "Q" + x + " " + y + " " + x + " " + (y + r) + "Q" + x + " " + y + " " + (x - r) + " " + y + "Q" + x + " " + y + " " + x + " " + (y - r) + "Z";
  const seeded = n => { let x = n; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
  const signSub = sg => sg.kind === "even" ? KC.signs.evenText(sg) : sg.main.map(m => short(m.id)).join(" + ");
  /* the figure shown: the DnD class or the World of Darkness subtype when that mode is on, else the sign */
  const mode = () => KC.dnd ? KC.dnd.mode() : "sign";
  const dndOn = () => mode() === "dnd";
  /* v610: the modes that need the list itself, not only the portrait (KC.dnd.WR) */
  /* v616: the ⚔ Wr / Witcher / Avatar modules take the template as a Set; since v618 the portrait never applies one (null) */
  const figOf = d => mode() === "dnd" ? KC.dnd.pick(d) : mode() === "wod" ? KC.wod.pick(d) : KC.dnd.isWr(mode()) ? KC[mode()].pick(d, shownR(), null) : KC.signs.pick(d);
  /* the title lines of a figure: over-title, name, sub-line and (DnD) the alignment line */
  function headOf(sg) {
    if (KC.dnd.wrOf(sg)) { const h = KC.dnd.wrOf(sg).head(sg, F.viewingShared, t);
      return { over: h.over, name: h.name, rl: h.rl, sub: signSub(sg), al: null }; }
    if (sg.wod) {
      const dt = KC.wod.details(shownR(), data(), null, sg.line, sg.id), ln = KC.wod.lines(dt, t);
      return { over: t((F.viewingShared ? "wod.of." : "wod.mine.") + sg.line), name: t("wod." + sg.line + "." + sg.id), sub: ln.sub + " · " + signSub(sg), rl: ln.rl, al: null, dt };
    }
    if (!sg.dnd) return { over: t(F.viewingShared ? "sign.of" : "sign.mine"), name: t("sign." + sg.id), sub: signSub(sg), al: null };
    const st = shownR(), set = null, al = KC.dnd.alignment(st, data(), set), race = KC.dnd.race(st, set), lv = KC.dnd.level(st, set);
    return { over: t(F.viewingShared ? "dnd.of" : "dnd.mine"), name: t("dnd.c." + sg.cls), sub: t("dnd.s." + sg.cls + "." + sg.sub) + " · " + signSub(sg),
      rl: t("dnd.r." + race) + " · " + t("dnd.lvl", { n: lv }), race, lv,
      al: { name: t("dnd.al." + al), quip: t("dnd.aq." + al) }, alKey: al };
  }
  /* star radius: bright stars are big, the others grow with their group's percentage */
  const starR = (st, big) => st.grey ? big * .2 : st.bright ? big : st.s && st.s.pct !== null ? big * (.27 + st.s.pct / 100 * .45) : big * .27;
  function segsOf(sg, X, Y) {
    const segs = [];
    sg.lines.forEach(l => { const q = l[0] === "d" ? l.slice(1) : l; for (let i = 1; i < q.length; i++) segs.push([X(sg.stars[q[i - 1]]), Y(sg.stars[q[i - 1]]), X(sg.stars[q[i]]), Y(sg.stars[q[i]])]); });
    return segs;
  }
  function signSVG(d) {
    const sg = figOf(d); if (!sg) return "";
    const hd = headOf(sg);
    const W = 320, H = 320, rnd = seeded(9);
    /* label width: CJK characters are about twice as wide as Latin, Cyrillic or Thai ones */
    const textW = s2 => Array.from(s2).reduce((a, ch) => a + (/[⺀-鿿가-힯＀-￯]/.test(ch) ? 13 : /[ัิ-ฺ็-๎]/.test(ch) ? 0 : 7.3), 0);
    const sizes = sg.stars.map(st => st.s ? { w: Math.max(textW(short(st.s.id)), 30) + 2, h: 30 } : { w: 1, h: 1 });
    /* v617 (owner): the labels are always the same size; when the figure with its labels is too wide for the box, the
       FIGURE is drawn smaller and the labels placed again (before, the whole picture shrank, labels included, so some
       modes had smaller text than others). The picture's width = its share of the widest allowed figure (W / 1.18) of
       min(100 %, 420 px), so one unit of the drawing is the same number of pixels in every mode. */
    let box = 196, ox, oy, k, X, Y, pts, L, bb;
    for (let pass = 0; pass < 4; pass++) {
      ox = (W - box) / 2; oy = (H - box) / 2; k = box / 100;
      X = st => ox + st.x * k; Y = st => oy + st.y * k;
      pts = sg.stars.map(st => ({ x: X(st), y: Y(st), r: starR(st, 10), bright: st.bright }));
      L = KC.signs.placeLabels(pts, segsOf(sg, X, Y), sizes, W, H);
      /* only the part of the sky the figure uses: no empty band above and below */
      bb = KC.signs.bbox(pts.map(p => ({ x: p.x, y: p.y, r: p.bright ? 15 : p.r })), L, 10);
      const over = bb.w / W * 118 / 100; if (over <= 1.001) break;
      box = Math.max(110, box - (bb.w - W / 1.18) - 2);
    }
    let g = '<svg viewBox="' + bb.x.toFixed(1) + " " + bb.y.toFixed(1) + " " + bb.w.toFixed(1) + " " + bb.h.toFixed(1) + '" style="width:calc(min(100%, 420px) * ' + Math.min(1, bb.w / (W / 1.18)).toFixed(3) + ')" role="img" aria-label="' + esc(hd.name) + '">';
    let dust = ""; for (let i = 0; i < 50; i++) dust += '<circle cx="' + (bb.x + rnd() * bb.w).toFixed(1) + '" cy="' + (bb.y + rnd() * bb.h).toFixed(1) + '" r="' + (rnd() * .9 + .3).toFixed(2) + '"/>';
    g += '<g fill="var(--dust)">' + dust + "</g>";
    g += '<g fill="none" stroke="var(--ink-line)" stroke-width="1.1" stroke-linejoin="round">' + sg.lines.map(l => { const dash = l[0] === "d", q = dash ? l.slice(1) : l;
      return '<polyline points="' + q.map(i => X(sg.stars[i]).toFixed(1) + "," + Y(sg.stars[i]).toFixed(1)).join(" ") + '"' + (dash ? ' stroke-dasharray="3 4"' : "") + "/>"; }).join("") + "</g>";
    sg.stars.forEach((st, i) => {
      const x = pts[i].x, y = pts[i].y, v = st.s ? st.s.pct : null;
      if (st.hid) return;   /* v616: a hidden vertex (only shapes a line) */
      if (st.grey) g += '<circle class="sg-grey" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2" fill="var(--muted)" opacity=".55"/>';
      else if (st.bright) g += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="15" fill="var(--star)" opacity=".16"/><path d="' + spark(x, y, 10) + '" fill="var(--star)"/>';
      else if (v === null) g += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3" fill="none" stroke="var(--muted)" stroke-width="1"/>';
      else g += '<path d="' + spark(x, y, pts[i].r) + '" fill="var(--muted)" opacity="' + (.45 + v / 180).toFixed(2) + '"/>';
    });
    /* labels last, with a halo, so a line under a label never makes it unreadable */
    sg.stars.forEach((st, i) => {
      if (!st.s) return;
      const v = st.s.pct, b = L[i], cx = (b.x + b.w / 2).toFixed(1);
      g += '<text x="' + cx + '" y="' + (b.y + 12).toFixed(1) + '" text-anchor="middle" font-size="12.5" font-family="Inter,sans-serif" fill="currentColor" paint-order="stroke" stroke="var(--bg)" stroke-width="3" stroke-linejoin="round"' + (st.bright ? ' font-weight="600"' : "") + ">" + esc(short(st.s.id))
        + '<tspan x="' + cx + '" dy="15" font-weight="700" fill="' + (st.bright ? "var(--star)" : v === null ? "var(--muted)" : "var(--accent)") + '">' + pctText(v) + "</tspan></text>";
    });
    const attrs = sg.dnd ? ' data-cls="' + sg.cls + '" data-al="' + hd.alKey + '" data-race="' + hd.race + '" data-lv="' + hd.lv + '"'
      : sg.wod ? ' data-line="' + sg.line + '" data-id="' + sg.id + '" data-lv="' + hd.dt.lv + '"' : sg.wr ? ' data-god="' + sg.id + '" data-mut="' + sg.mut + '"'
      : sg.wh ? ' data-faction="' + sg.id + '"' : sg.leg ? ' data-legion="' + sg.id + '"' : sg.ow ? ' data-race="' + sg.id + '"' : sg.wi ? ' data-school="' + sg.id + '" data-wsign="' + sg.wsign + '"'
      : sg.av ? ' data-el="' + sg.id + '" data-type="' + (sg.type || "") + '"' + (sg.avatar ? ' data-avatar="1"' : "") : "";
    return '<div class="pt-sign' + (sg.dnd ? " pt-dnd" : sg.wod ? " pt-wod" : sg.wr ? " pt-wr" : sg.wh ? " pt-wh" : sg.leg ? " pt-leg" : sg.ow ? " pt-ow" : sg.wi ? " pt-wi" : sg.av ? " pt-av" : "") + '"' + attrs + '><div class="sg-over">' + esc(hd.over) + '</div><div class="sg-name">' + esc(hd.name) + "</div>"
      + (hd.rl ? '<div class="sg-rl">' + esc(hd.rl) + "</div>" : "") + '<div class="sg-sub">' + esc(hd.sub) + "</div>"
      + (hd.al ? '<div class="sg-al"><b>' + esc(hd.al.name) + "</b> — " + esc(hd.al.quip) + "</div>" : "") + g + "</svg>" + (sg.wod ? KC.wod.noticeHTML() : KC.dnd.wrOf(sg) ? KC.wr.noticeHTML() : "") + "</div>";
  }
  F.signOf = () => KC.signs.pick(data());

  /* v613: what the "Описание созвездий" tab describes (core/lore.js) — the items of the figure on the portrait now,
     in the mode on now; an extended list: one group per role. Keys = the interface keys of the names. */
  const AL9 = { LG: 1, NG: 1, CG: 1, LN: 1, NN: 1, CN: 1, LE: 1, NE: 1, CE: 1 };
  function loreOf(sg) {
    const hd = headOf(sg), k = key => ({ key }), kv = (key, n) => ({ key, vars: { n } });
    if (sg.dnd) return [k("dnd.c." + sg.cls), k("dnd.s." + sg.cls + "." + sg.sub), k("dnd.r." + hd.race)].concat(AL9[hd.alKey] ? [k("dnd.al." + hd.alKey)] : []);
    if (sg.wod) {
      const d = hd.dt, out = [k("wod." + sg.line + "." + sg.id)];
      if (sg.line === "vamp") return out.concat(d.sect ? [k("wod.sect." + d.sect)] : [], [kv("wod.gen", d.gen), k("wod.path." + (d.hum !== undefined ? "humanity" : d.path))]);
      if (sg.line === "wolf") return out.concat([k("wod.breed." + d.breed), k("wod.aus." + d.aus), k("wod.rank." + d.rank), kv("wod.rage", d.rage), kv("wod.gnosis", d.gnosis)]);
      if (sg.line === "fey") return out.concat(d.court ? [k("wod.court." + d.court), k("wod.house." + d.house)] : [], [k("wod.seem." + d.seem), kv("wod.glamour", d.glamour), kv("wod.banality", d.banality)]);
      return out.concat([k("wod.demon.a." + sg.id)], d.fac ? [k("wod.fac." + d.fac)] : [], [k("wod.lore." + d.lore), kv("wod.faith", d.faith)]);
    }
    if (sg.wr) return [k("wr.of." + sg.id), kv("wr.mut", sg.mut)];
    if (sg.wh) return [k("wh.f." + sg.id)].concat(sg.waaagh ? [{ key: "wh.waaagh", vars: { w: KC.wh.waaaghText(sg.waaagh) } }] : []);
    if (sg.leg) return KC.leg.LEGIONS.indexOf(sg.id) >= 0 ? [k("leg.l." + sg.id)] : [{ key: "leg.lost", vars: { n: KC.leg.NUM[sg.id] } }];
    if (sg.ow) return [k("ow.r." + sg.id)].concat(sg.grudges !== null && sg.grudges !== undefined ? [kv("ow.grudges", sg.grudges)] : []);
    if (sg.wi) return [k("wi.s." + sg.id), k("wi.g." + sg.wsign)];
    if (sg.av) return sg.avatar ? [k("av.avatar"), k("av.e." + sg.id)] : [k("av.e." + sg.id)].concat(sg.type ? [k("av.t." + sg.type)] : []);
    return [];   /* the constellation itself: our own signs, nothing to look up */
  }
  KC.lore.provider = function () {
    const s = whole(), out = [];
    (KC.ext.isExt(s) ? KC.ext.R : [null]).forEach(r => {
      PTR = r; const d = data(); const sg = d.answered ? figOf(d) : null;
      if (sg) out.push({ title: r ? t("ext.row." + r) : "", items: loreOf(sg) });
    });
    PTR = null; return out;
  };
  /* v615 (owner): the mode buttons inside the guide — the same switch, the same storage (the portrait's choice) */
  /* v618 (owner): without «✦ Созвездие» — our own signs have nothing to describe */
  KC.lore.switchHTML = () => (KC.dnd && KC.wod && Object.keys((whole() || {}).items || {}).length
    ? KC.wod.switchHTML().replace(/<button[^>]*data-mode="sign"[^>]*>[^<]*<\/button>/, "") : "");
  KC.lore.click = function (e) {
    const m = e.target.closest(".pt-mode [data-mode]");
    if (m) { const want = m.dataset.mode; if (want !== mode()) { KC.dnd.setMode(want); if (want !== "sign") KC.stats.event(want); F.renderPortrait(); } return true; }
    const w = e.target.closest(".pt-mode [data-wod]");
    if (w) { if (w.dataset.wod !== KC.wod.sub()) { KC.wod.setSub(w.dataset.wod); F.renderPortrait(); } return true; }
    return false;
  };

  /* the "✦ Constellation | 🎲 DnD | 🦇 World of Darkness" switch above the picture (only when there is a picture) */
  function modeSwitch(d) {
    if (!KC.dnd || !KC.wod || !KC.signs.pick(d)) return "";
    return KC.wod.switchHTML();
  }

  /* ---------- the block on the page ---------- */
  function title() {
    const nm = F.state.name;
    KC.$("portraitTitle").textContent = F.viewingShared ? (nm ? t("pt.of", { name: nm }) : t("pt.of0")) : t("pt.mine");
  }
  F.renderPortrait = function () {
    title(); ptLang = KC.i18n.lang;
    if (!sec.open) return;                      /* drawn when opened: nothing to compute while folded */
    if (KC.ext.isExt(whole())) { renderExt(); return; }
    const d = data(), st = whole();
    if (!d.answered) { body.innerHTML = '<p class="pt-empty">' + esc(t("pt.empty")) + "</p>"; return; }
    const meta = metaBits(st);
    body.innerHTML = (meta.length ? '<div class="pt-meta">' + esc(meta.join(" · ")) + "</div>" : "") + modeSwitch(d) + one(d, st, "")
      + '<button class="btn ghost" id="ptCard" type="button">' + esc(t("pt.card")) + "</button>";
  };
  /* v613: an extended list — the mode switch once, then "↑ Верх" and "↓ Низ", each with its own sign, bars and
     favourites, and its own picture card */
  function renderExt() {
    let h = "", sw = "";
    KC.ext.R.forEach(r => {
      PTR = r; const d = data(), st = shownR();
      if (!sw && d.answered) sw = modeSwitch(d);
      h += '<div class="pt-role" data-r="' + r + '"><h4 class="pt-role-h">' + esc(t("ext.row." + r)) + "</h4>"
        + (d.answered ? one(d, st, r) + '<button class="btn ghost pt-card-r" type="button" data-card="' + r + '">' + esc(t("ext.card." + r)) + "</button>"
          : '<p class="pt-empty">' + esc(t("ext.ptEmpty")) + "</p>") + "</div>";
    });
    PTR = null;
    body.innerHTML = sw + h;
  }
  /* the sign, the bars and the favourites of one portrait */
  function one(d, st, r) {
    let h = signSVG(d)
      + '<div class="pt-bars">' + d.sections.map(s => '<div class="pt-row"><span class="pt-name">' + esc(KC.portrait.label(s.id)) + "</span>"
        + '<span class="pt-bar"><i style="width:' + (s.pct || 0) + '%"></i></span><span class="pt-pct">' + pctText(s.pct) + "</span></div>").join("") + "</div>"
      + '<p class="pt-how">' + esc(t("pt.how")) + "</p>";
    if (d.love.length) h += '<h4 class="pt-h">' + esc(t("pt.love", { n: d.love.length })) + '</h4><div class="pt-chips">'
      + d.love.map(id => "<span>" + esc(KC.i18n.item(id).name) + "</span>").join("") + "</div>";
    return h;
  }
  sec.addEventListener("toggle", () => { if (sec.open) { KC.stats.event("portrait"); F.renderPortrait(); } });
  body.addEventListener("click", e => {
    if (e.target.closest("#ptCard")) { CARD_R = "t"; openCard(); return; }
    const cr = e.target.closest("[data-card]"); if (cr) { CARD_R = cr.dataset.card; openCard(); return; }
    const m = e.target.closest(".pt-mode [data-mode]");
    if (m) { const want = m.dataset.mode; if (want !== mode()) { KC.dnd.setMode(want); if (want !== "sign") KC.stats.event(want); F.renderPortrait(); } return; }
    const w = e.target.closest(".pt-mode [data-wod]");
    if (w && w.dataset.wod !== KC.wod.sub()) { KC.wod.setSub(w.dataset.wod); F.renderPortrait(); }
  });
  /* answers change -> the open portrait follows (the progress line is updated after every answer) */
  const upd = F.updateProgress;
  /* redrawn a moment after the last answer, not on every click: the sign's layout is the heaviest part */
  let ptTimer = null;
  F.updateProgress = function () {
    upd.apply(this, arguments); title(); if (!sec.open) return;
    clearTimeout(ptTimer);
    if (ptLang !== KC.i18n.lang) { ptLang = KC.i18n.lang; F.renderPortrait(); }   /* a new language: at once */
    else ptTimer = setTimeout(F.renderPortrait, 150);
  };

  /* ---------- the picture card ---------- */
  const OPTS = [["sign", true], ["bars", true], ["love", true], ["role", true], ["exp", false], ["limits", false], ["name", false]];
  const cardModal = KC.modal("cardOverlay", "cardClose");
  const opt = k => { const el = KC.$("cardO_" + k); return !!(el && el.checked); };

  /* wraps chips (short labels) into lines of width w; returns lines of labels and how many did not fit */
  function chipLines(ctx, labels, w, maxLines, gap, pad) {
    const lines = [[]]; let x = 0, used = 0;
    for (const lb of labels) {
      const cw = Math.min(w, ctx.measureText(lb).width + pad * 2);
      if (x && x + cw > w) { if (lines.length >= maxLines) break; lines.push([]); x = 0; }
      lines[lines.length - 1].push(lb); x += cw + gap; used++;
    }
    return { lines: lines.filter(l => l.length), rest: labels.length - used };
  }
  const fit = (ctx, s, w) => { if (ctx.measureText(s).width <= w) return s; while (s.length > 1 && ctx.measureText(s + "…").width > w) s = s.slice(0, -1); return s + "…"; };
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }


  /* the sign on the card: name, groups, the drawing with a label at every star; returns the new y */
  function cardSign(ctx, sg, C, y, W, M, SANS, SERIF, big) {
    const hd = headOf(sg);
    /* v610: a long name ("Servant of the Horned Rat") gets a smaller font before it is cut with "…" */
    let fs = 92; ctx.font = "600 " + fs + "px " + SERIF;
    while (fs > 60 && ctx.measureText(hd.name).width > W - 2 * M) { fs -= 4; ctx.font = "600 " + fs + "px " + SERIF; }
    ctx.textAlign = "center"; ctx.fillStyle = C.star; ctx.fillText(fit(ctx, hd.name, W - 2 * M), W / 2, y + 70);
    if (hd.rl) {   /* DnD: race · level, the subclass, the alignment and its joke */
      ctx.fillStyle = C.ink; ctx.font = "600 40px " + SANS; ctx.fillText(fit(ctx, hd.rl, W - 2 * M), W / 2, y + 124);
      ctx.font = "500 32px " + SANS; ctx.fillText(fit(ctx, hd.sub, W - 2 * M), W / 2, y + 172);
      if (hd.al) {
        ctx.font = "700 34px " + SANS; ctx.fillStyle = C.accent; ctx.fillText(fit(ctx, hd.al.name, W - 2 * M), W / 2, y + 226);
        ctx.font = "italic 500 31px " + SANS; ctx.fillStyle = C.muted; ctx.fillText(fit(ctx, hd.al.quip, W - 2 * M), W / 2, y + 270); y += 160;
      } else y += 60;   /* World of Darkness: no alignment line */
    } else { ctx.fillStyle = C.ink; ctx.font = "500 34px " + SANS; ctx.fillText(fit(ctx, hd.sub, W - 2 * M), W / 2, y + 122); }
    ctx.textAlign = "left";
    /* lay the figure out in a tall box, then use only the band it needs */
    const SH = big ? 820 : 560, box = big ? 640 : 420, ox = (W - box) / 2, oyL = (SH - box) / 2, k = box / 100;   /* alone on the card: bigger */
    const XL = st => ox + st.x * k - M, YL = st => oyL + st.y * k;
    const pts = sg.stars.map(st => ({ x: XL(st), y: YL(st), r: starR(st, 30), bright: st.bright }));
    ctx.font = "600 29px " + SANS;
    const sizes = sg.stars.map(st => st.s ? { w: Math.max(ctx.measureText(short(st.s.id)).width, 70) + 6, h: 68 } : { w: 1, h: 1 });
    const LB = KC.signs.placeLabels(pts, segsOf(sg, XL, YL), sizes, W - 2 * M, SH);
    const bb = KC.signs.bbox(pts.map(p => ({ x: p.x, y: p.y, r: p.bright ? 44 : p.r })), LB, 16);
    const dy = y + 150 - bb.y, X = st => XL(st) + M, Y = st => YL(st) + dy;
    ctx.save(); ctx.strokeStyle = C.grid; ctx.lineWidth = 3; ctx.lineJoin = "round";
    sg.lines.forEach(l => { const dash = l[0] === "d", q = dash ? l.slice(1) : l; ctx.setLineDash(dash ? [8, 10] : []); ctx.beginPath(); q.forEach((i, j) => { const st = sg.stars[i]; if (j) ctx.lineTo(X(st), Y(st)); else ctx.moveTo(X(st), Y(st)); }); ctx.stroke(); });
    ctx.restore();
    const spk = (x, yy, r) => { ctx.beginPath(); ctx.moveTo(x, yy - r); ctx.quadraticCurveTo(x, yy, x + r, yy); ctx.quadraticCurveTo(x, yy, x, yy + r); ctx.quadraticCurveTo(x, yy, x - r, yy); ctx.quadraticCurveTo(x, yy, x, yy - r); ctx.fill(); };
    sg.stars.forEach((st, i) => {
      const x = X(st), yy = Y(st), v = st.s ? st.s.pct : null;
      if (st.hid) return;
      if (st.grey) { ctx.globalAlpha = .55; ctx.fillStyle = C.muted; ctx.beginPath(); ctx.arc(x, yy, 6, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      else if (st.bright) { ctx.globalAlpha = .18; ctx.fillStyle = C.star; ctx.beginPath(); ctx.arc(x, yy, 44, 0, 7); ctx.fill(); ctx.globalAlpha = 1; spk(x, yy, 30); }
      else if (v === null) { ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, yy, 8, 0, 7); ctx.stroke(); }
      else { ctx.globalAlpha = .45 + v / 180; ctx.fillStyle = C.muted; spk(x, yy, pts[i].r); ctx.globalAlpha = 1; }
    });
    /* labels on top, with a halo in the card's background colour */
    ctx.lineJoin = "round"; ctx.strokeStyle = C.bg; ctx.lineWidth = 8;
    sg.stars.forEach((st, i) => {
      if (!st.s) return;
      const v = st.s.pct, b = LB[i], cx = b.x + M + b.w / 2, ty = b.y + dy;
      ctx.textAlign = "center"; ctx.font = (st.bright ? "600 " : "500 ") + "29px " + SANS; ctx.strokeText(short(st.s.id), cx, ty + 28); ctx.fillStyle = C.ink; ctx.fillText(short(st.s.id), cx, ty + 28);
      ctx.font = "700 30px " + SANS; ctx.strokeText(pctText(v), cx, ty + 62); ctx.fillStyle = st.bright ? C.star : v === null ? C.muted : C.accent; ctx.fillText(pctText(v), cx, ty + 62); ctx.textAlign = "left";
    });
    return y + 150 + bb.h + 24;
  }

  F.drawCard = function (o) {
    const W = 1080, H = 1920, M = 70, IW = W - M * 2;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"); if (!ctx) return c;
    const d = data(), st = shownR();
    const SANS = 'Inter, "PingFang TC", "Hiragino Sans", "Noto Sans CJK JP", "Noto Sans Thai", system-ui, sans-serif';
    const SERIF = 'Fraunces, Georgia, "Noto Serif CJK JP", serif';
    const root = document.documentElement.dataset.theme;
    const night = root ? root === "dark" : !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    const C = night ? { bg: "#14101a", panel: "#221a27", ink: "#f3e9ee", muted: "#a898a8", line: "#3a2f3c", accent: "#f0a3bd", love: "#3b2233", loveInk: "#ff9fcf", lim: "#3a2224", limInk: "#f08c8c", bar: "#33283a", star: "#ff8cc6", grid: "rgba(240,163,189,.30)", dust: "rgba(255,240,248,.7)" }
      : { bg: "#f5f1ec", panel: "#fffdfb", ink: "#241c22", muted: "#8a7d84", line: "#e6ddd6", accent: "#8a2d47", love: "#f4e0ec", loveInk: "#9d2f68", lim: "#f6e2e0", limInk: "#b23b3b", bar: "#e9dfe3", star: "#e0559a", grid: "rgba(138,45,71,.24)", dust: "rgba(138,45,71,.28)" };
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    /* star dust over the whole card */
    { const r = seeded(11); ctx.fillStyle = C.dust; for (let i = 0; i < 260; i++) { ctx.beginPath(); ctx.arc(r() * W, r() * H, r() * 1.8 + .5, 0, 7); ctx.fill(); } }
    ctx.fillStyle = C.accent; ctx.fillRect(0, 0, W, 16);
    let y = 150;
    ctx.textBaseline = "alphabetic";
    if (o.name && st.name) {
      ctx.fillStyle = C.muted; ctx.font = "600 34px " + SANS; ctx.fillText(t("card.title"), M, y - 62);
      ctx.fillStyle = C.accent; ctx.font = "600 76px " + SERIF; ctx.fillText(fit(ctx, st.name, IW), M, y + 10); y += 40;
    } else { ctx.fillStyle = C.accent; ctx.font = "600 76px " + SERIF; ctx.fillText(fit(ctx, t("card.title"), IW), M, y); }
    y += 70;
    const meta = []; if (o.role && st.meta.role) meta.push(KC.i18n.optLabel("role", st.meta.role)); if (o.exp && st.meta.exp) meta.push(KC.i18n.fieldLabel("exp") + ": " + KC.i18n.optLabel("exp", st.meta.exp));
    if (meta.length) { ctx.fillStyle = C.ink; ctx.font = "500 38px " + SANS; ctx.fillText(fit(ctx, meta.join(" · "), IW), M, y); y += 64; }
    y += 10;
    let bottom = H - 150;
    /* the sign and the percentages can be switched on and off separately (v587, owner) */
    const sg = o.sign ? figOf(d) : null;   /* the mode shown on the page: sign, DnD class or World of Darkness */
    if (sg && (sg.wod || KC.dnd.wrOf(sg))) bottom -= 40;   /* room for the "not official" line */
    if (sg) y = cardSign(ctx, sg, C, y, W, M, SANS, SERIF, !o.bars);
    if (o.bars) {
      const rows = d.sections, rh = sg ? 44 : 52, nameW = 470, barX = M + nameW + 20, barW = IW - nameW - 20 - 110;
      rows.forEach((s, i) => {
        const ry = y + i * rh;
        ctx.fillStyle = C.ink; ctx.font = "500 31px " + SANS; ctx.fillText(fit(ctx, KC.portrait.label(s.id), nameW), M, ry + 34);
        ctx.fillStyle = C.bar; rr(ctx, barX, ry + 12, barW, 26, 13); ctx.fill();
        if (s.pct) { ctx.fillStyle = C.accent; rr(ctx, barX, ry + 12, Math.max(26, barW * s.pct / 100), 26, 13); ctx.fill(); }
        ctx.fillStyle = s.pct === null ? C.muted : C.ink; ctx.font = "600 31px " + SANS; ctx.textAlign = "right"; ctx.fillText(pctText(s.pct), W - M, ry + 34); ctx.textAlign = "left";
      });
      y += rows.length * rh + 40;
    }
    /* chip groups share the space that is left (limits get at most a third when both are on) */
    const groups = [];
    if (o.love && d.love.length) groups.push({ head: t("card.love") + " · " + d.love.length, ids: d.love, bg: C.love, ink: C.loveInk });
    if (o.limits && d.limits.length) groups.push({ head: t("card.limits") + " · " + d.limits.length, ids: d.limits, bg: C.lim, ink: C.limInk });
    const chipH = 56, gap = 12, lineH = chipH + gap, headH = 70;
    groups.forEach((g, gi) => {
      const avail = bottom - y - headH - (groups.length - gi - 1) * (headH + lineH * 2);
      const share = groups.length === 2 && gi === 0 ? avail * 0.62 : avail;
      const maxLines = Math.max(1, Math.floor(share / lineH));
      ctx.fillStyle = g.ink; ctx.font = "600 38px " + SERIF; ctx.fillText(g.head, M, y + 44); y += headH;
      ctx.font = "500 29px " + SANS;
      const labels = g.ids.map(id => KC.i18n.item(id).name);
      let { lines, rest } = chipLines(ctx, labels, IW, maxLines, gap, 20);
      if (rest > 0) {   /* room for the "and N more" chip at the end of the last line */
        const more = t("card.more", { n: rest }); const last = lines[lines.length - 1];
        const lineW = l => l.reduce((a, lb) => a + Math.min(IW, ctx.measureText(lb).width + 40) + gap, 0);
        while (last.length && lineW(last) + ctx.measureText(more).width + 40 > IW) { last.pop(); rest++; }
        last.push({ more: t("card.more", { n: rest }) });
      }
      lines.forEach(l => {
        let x = M;
        l.forEach(lb => {
          const txt = typeof lb === "string" ? lb : lb.more, isMore = typeof lb !== "string";
          const cw = Math.min(IW, ctx.measureText(txt).width + 40);
          ctx.fillStyle = isMore ? C.panel : g.bg; rr(ctx, x, y, cw, chipH, 28); ctx.fill();
          if (isMore) { ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke(); }
          ctx.fillStyle = isMore ? C.muted : g.ink; ctx.fillText(fit(ctx, txt, cw - 40), x + 20, y + 38);
          x += cw + gap;
        });
        y += lineH;
      });
      y += 24;
    });
    if (sg && (sg.wod || KC.dnd.wrOf(sg))) {   /* "not official … material", small, above the footer */
      ctx.fillStyle = C.muted; ctx.font = "500 22px " + SANS; ctx.textAlign = "center";
      ctx.fillText(fit(ctx, t(sg.wod ? "wod.notOfficial" : "wr.notOfficial"), IW), W / 2, H - 130); ctx.textAlign = "left";
    }
    ctx.fillStyle = C.muted; ctx.font = "500 32px " + SANS; ctx.textAlign = "center"; ctx.fillText("✦ " + KC.BRAND + (SITE ? " · " + SITE : ""), W / 2, H - 70); ctx.textAlign = "left";
    return c;
  };
  /* v613: the card of an extended list is drawn for the role whose button was pressed */
  { const draw = F.drawCard; F.drawCard = function (o) { const keep = PTR; PTR = CARD_R; try { return draw(o); } finally { PTR = keep; } }; }

  let previewUrl = null;
  function preview() {
    const cv = F.drawCard(readOpts());
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!cv.toBlob) return;
    cv.toBlob(b => { if (!b) return; previewUrl = URL.createObjectURL(b); KC.$("cardPreview").src = previewUrl; }, "image/png");
  }
  function readOpts() { const o = {}; OPTS.forEach(([k]) => { o[k] = opt(k); }); return o; }
  function openCard() {
    /* in DnD mode the "sign" switch is the class */
    const lab = k => t(k === "sign" && mode() !== "sign" ? "card.o." + mode() : "card.o." + k);
    KC.$("cardOpts").innerHTML = OPTS.map(([k, on]) => '<label class="only-toggle"><input type="checkbox" id="cardO_' + k + '"' + (on ? " checked" : "") + "> " + esc(lab(k)) + "</label>").join("");
    KC.$("cardShare").hidden = !(navigator.canShare && window.File);
    cardModal.open(); preview();
  }
  KC.$("cardOpts").addEventListener("change", preview);
  const fileName = () => "kinkmatch-" + (t("card.file") || "portrait") + ".png";
  KC.$("cardSave").addEventListener("click", () => {
    const cv = F.drawCard(readOpts()); KC.stats.event("card");
    cv.toBlob(b => {
      if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = fileName();
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, "image/png");
  });
  KC.$("cardShare").addEventListener("click", () => {
    const cv = F.drawCard(readOpts()); KC.stats.event("card");
    cv.toBlob(b => {
      if (!b) return; const f = new File([b], fileName(), { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).catch(() => {});
      else KC.$("cardSave").click();
    }, "image/png");
  });

  /* ---------- the PDF page (first page when "Add the portrait" is ticked) ---------- */
  /* v613: an extended list gives two pages, one per role */
  F.buildPortraitSheet = function () {
    if (!KC.ext.isExt(whole())) return sheet("");
    const out = KC.ext.R.map(r => { PTR = r; const s2 = data().answered ? sheet(r) : null; return s2; }).filter(Boolean);
    PTR = null; return out;
  };
  function sheet(r) {
    const d = data(), st = shownR(), meta = r ? [t("ext.row." + r)] : metaBits(st);
    const w = document.createElement("div");
    w.style.cssText = "position:fixed;left:-10000px;top:0;width:760px;padding:30px;background:#f5f1ec;color:#241c22;font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.5;";
    const card = "background:#fffdfb;border:1px solid #e6ddd6;border-radius:12px;padding:18px 20px;margin-bottom:14px;";
    const serif = "font-family:Fraunces,Georgia,serif;font-weight:600;";
    let h = '<div style="' + card + '"><div style="' + serif + 'font-size:27px;color:#8a2d47;">' + esc(F.viewingShared ? (st.name ? t("pt.of", { name: st.name }) : t("pt.of0")) : t("pt.mine")) + "</div>"
      + (meta.length ? '<div style="margin-top:6px;color:#8a7d84;">' + esc(meta.join(" · ")) + "</div>" : "") + "</div>";
    h += '<div style="' + card + '">' + d.sections.map(s => '<div style="display:flex;align-items:center;gap:12px;margin:5px 0;"><span style="width:300px;">' + esc(KC.portrait.label(s.id)) + "</span>"
      + '<span style="flex:1;height:12px;background:#e9dfe3;border-radius:6px;overflow:hidden;"><span style="display:block;height:12px;width:' + (s.pct || 0) + '%;background:#8a2d47;"></span></span>'
      + '<span style="width:44px;text-align:right;font-weight:600;">' + pctText(s.pct) + "</span></div>").join("")
      + '<div style="margin-top:8px;font-size:11.5px;color:#8a7d84;">' + esc(t("pt.how")) + "</div></div>";
    if (d.love.length) h += '<div style="' + card + '"><div style="' + serif + 'font-size:16px;color:#9d2f68;margin-bottom:6px;">' + esc(t("pt.love", { n: d.love.length })) + "</div>"
      + '<div style="font-size:13px;line-height:1.7;">' + d.love.map(id => esc(KC.i18n.item(id).name)).join("&nbsp;·&nbsp;") + "</div></div>";
    w.innerHTML = h; return w;
  }
})(window.KC);
