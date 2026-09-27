/* form/portrait.js — "My portrait" (a folding block under "About me"), the vertical picture card and the
   portrait page for the PDF. Numbers come from core/portrait.js. Works for my list and for someone's list
   opened from a link (then it is "Portrait: <name>"). Follows the applied template like the rest of the page.
   The card is drawn on a <canvas> (1080×1920): no names or answers leave the device unless the user saves it. */
(function (KC) {
  const F = KC.form, t = (k, v) => KC.i18n.t(k, v), esc = KC.esc;
  const SITE = (KC.migrate ? KC.migrate.NEW_URL : "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const sec = KC.$("portraitSection"), body = KC.$("portraitBody");

  const data = () => KC.portrait.compute(F.shown(), F.tplSet());
  const pctText = p => (p === null ? "—" : p + "%");
  const metaBits = st => ["role", "exp"].map(f => st.meta[f] ? KC.i18n.optLabel(f, st.meta[f]) : "").filter(Boolean);

  /* ---------- the block on the page ---------- */
  function title() {
    const nm = F.state.name;
    KC.$("portraitTitle").textContent = F.viewingShared ? (nm ? t("pt.of", { name: nm }) : t("pt.of0")) : t("pt.mine");
  }
  F.renderPortrait = function () {
    title();
    if (!sec.open) return;                      /* drawn when opened: nothing to compute while folded */
    const d = data(), st = F.shown();
    if (!d.answered) { body.innerHTML = '<p class="pt-empty">' + esc(t("pt.empty")) + "</p>"; return; }
    const meta = metaBits(st);
    let h = (meta.length ? '<div class="pt-meta">' + esc(meta.join(" · ")) + "</div>" : "")
      + '<div class="pt-bars">' + d.sections.map(s => '<div class="pt-row"><span class="pt-name">' + esc(KC.portrait.label(s.id)) + "</span>"
        + '<span class="pt-bar"><i style="width:' + (s.pct || 0) + '%"></i></span><span class="pt-pct">' + pctText(s.pct) + "</span></div>").join("") + "</div>"
      + '<p class="pt-how">' + esc(t("pt.how")) + "</p>";
    if (d.love.length) h += '<h4 class="pt-h">' + esc(t("pt.love", { n: d.love.length })) + '</h4><div class="pt-chips">'
      + d.love.map(id => "<span>" + esc(KC.i18n.item(id).name) + "</span>").join("") + "</div>";
    h += '<button class="btn ghost" id="ptCard" type="button">' + esc(t("pt.card")) + "</button>";
    body.innerHTML = h;
  };
  sec.addEventListener("toggle", () => { if (sec.open) { KC.stats.event("portrait"); F.renderPortrait(); } });
  body.addEventListener("click", e => { if (e.target.closest("#ptCard")) openCard(); });
  /* answers change -> the open portrait follows (the progress line is updated after every answer) */
  const upd = F.updateProgress;
  F.updateProgress = function () { upd.apply(this, arguments); if (sec.open) F.renderPortrait(); else title(); };

  /* ---------- the picture card ---------- */
  const OPTS = [["bars", true], ["love", true], ["role", true], ["exp", false], ["limits", false], ["name", false]];
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

  F.drawCard = function (o) {
    const W = 1080, H = 1920, M = 70, IW = W - M * 2;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"); if (!ctx) return c;
    const d = data(), st = F.shown();
    const SANS = 'Inter, "PingFang TC", "Hiragino Sans", "Noto Sans CJK JP", "Noto Sans Thai", system-ui, sans-serif';
    const SERIF = 'Fraunces, Georgia, "Noto Serif CJK JP", serif';
    const C = { bg: "#f5f1ec", panel: "#fffdfb", ink: "#241c22", muted: "#8a7d84", line: "#e6ddd6", accent: "#8a2d47", love: "#f4e0ec", loveInk: "#9d2f68", lim: "#f6e2e0", limInk: "#b23b3b", bar: "#e9dfe3" };
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
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
    const bottom = H - 150;
    if (o.bars) {
      const rows = d.sections, rh = 52, nameW = 470, barX = M + nameW + 20, barW = IW - nameW - 20 - 110;
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
    ctx.fillStyle = C.muted; ctx.font = "500 32px " + SANS; ctx.textAlign = "center"; ctx.fillText(SITE, W / 2, H - 70); ctx.textAlign = "left";
    return c;
  };

  let previewUrl = null;
  function preview() {
    const cv = F.drawCard(readOpts());
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!cv.toBlob) return;
    cv.toBlob(b => { if (!b) return; previewUrl = URL.createObjectURL(b); KC.$("cardPreview").src = previewUrl; }, "image/png");
  }
  function readOpts() { const o = {}; OPTS.forEach(([k]) => { o[k] = opt(k); }); return o; }
  function openCard() {
    KC.$("cardOpts").innerHTML = OPTS.map(([k, on]) => '<label class="only-toggle"><input type="checkbox" id="cardO_' + k + '"' + (on ? " checked" : "") + "> " + esc(t("card.o." + k)) + "</label>").join("");
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
  F.buildPortraitSheet = function () {
    const d = data(), st = F.shown(), meta = metaBits(st);
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
  };
})(window.KC);
