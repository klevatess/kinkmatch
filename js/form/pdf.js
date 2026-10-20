/* form/pdf.js — "Download PDF": builds a styled summary sheet off-screen, rasterises it
   with html2canvas and slices it into A4 pages with jsPDF (both loaded from cdnjs on the first PDF, KC.lib — v629).
   Follows the screen: a template limits the items (and is named in the header), favourites get ♥,
   "only ♥" in the filter panel limits the sheet to favourites. */
(function (KC) {
  const F = KC.form, t = (k, v) => KC.i18n.t(k, v), esc = KC.esc;
  const P = { bg: "#f5f1ec", panel: "#fffdfb", ink: "#241c22", muted: "#8a7d84", line: "#e6ddd6", accent: "#8a2d47" };
  const PILL = { limit: ["#f6e2e0", "#b23b3b"], maybe: ["#f6ecda", "#b9852a"], yes: ["#e0f0e6", "#2f7d54"], love: ["#f4e0ec", "#9d2f68"] };
  const serif = "font-family:Fraunces,Georgia,serif;font-weight:600;";
  /* v641: the site's name, address and a QR code on the sheet, so a printed list leads back to the site (owner).
     v642: the QR leads to the list itself (below); this precomputed site QR is the offline fallback.
     The site QR is precomputed (29×29, error correction M, for SITE.url — tools: python qrcode); each row = 29 bits in hex. */
  const SITE = { name: "Kinkosmos", url: "https://klevatess.github.io/kinkmatch/", short: "klevatess.github.io/kinkmatch" };
  const QR = "1fd7707f 1049d341 174d1c5d 1756b65d 1757745d 10500f41 1fd5557f 00126900 1172def9 173c7c7f 1c6fe5f1 149cb84b 0cf589a2 04b3fcff 12e9294d 1c1f6fc3 00cfeb82 10b13c7b 06e8e465 05399f53 1e66adf9 001eff11 1fd6375d 10464d12 1759ebfa 1740bc81 174ca00f 104d7fdb 1fd769ca".split(" ");
  F.qrMatrix = () => QR.map(h => { const n = parseInt(h, 16), r = []; for (let x = 0; x < QR.length; x++) r.push(Math.floor(n / Math.pow(2, QR.length - 1 - x)) % 2); return r; });
  /* v642 (owner): the QR leads to the list itself (its share link), so a printed sheet opens the filled-in form.
     Drawn with qrcodejs (KC.lib "qr", fetched with the PDF); without it (offline) the site QR above is used.
     Size: about 0.7 mm per module on A4 (1 CSS px of the 760 px sheet ≈ 0.254 mm), never under 150 px (≈ 38 mm).
     In the PDF the code is redrawn over the picture as vector squares, so it prints sharp (html2canvas blurs it). */
  const QR_PX = 2.8, QR_MIN = 150;
  F.linkQR = link => {
    if (!link || !window.QRCode) return null;
    for (const lv of ["M", "L"]) {
      try {
        const q = new QRCode(document.createElement("div"), { text: link, width: 64, height: 64, correctLevel: QRCode.CorrectLevel[lv] });
        const o = q._oQRCode, n = o.getModuleCount(), m = [];
        for (let y = 0; y < n; y++) { const r = []; for (let x = 0; x < n; x++) r.push(o.isDark(y, x) ? 1 : 0); m.push(r); }
        return m;
      } catch (e) { /* too long for this level — try the next */ }
    }
    return null;
  };
  /* an SVG picture (no canvas needed), 4 modules of white border */
  const qrSVG = m => {
    const q = 4, n = m.length + q * 2; let d = "";
    m.forEach((r, y) => r.forEach((v, x) => { if (v) d += "M" + (x + q) + " " + (y + q) + "h1v1h-1z"; }));
    return { n, src: "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + " " + n + '" width="' + n * 8 + '" height="' + n * 8 + '" shape-rendering="crispEdges"><rect width="' + n + '" height="' + n + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>') };
  };
  const qrBlock = link => {
    const m = F.linkQR(link), url = m ? link : SITE.url, g = qrSVG(m || F.qrMatrix()), px = Math.max(QR_MIN, Math.round(g.n * QR_PX));
    F.lastQR = m || F.qrMatrix();
    return '<img data-pdflink="1" data-qr="' + (m ? "list" : "site") + '" data-url="' + esc(url) + '" src="' + g.src + '" alt="" style="width:' + px + "px;height:" + px + 'px;flex:none;border-radius:6px;">';
  };
  const siteLine = () => esc(SITE.name) + ' · <span data-pdflink="1" style="color:' + P.accent + ';">' + esc(SITE.short) + "</span>";
  F.SITE = SITE;

  F.buildSheet = function (opt) {
    const st = F.shown(), sub = KC.i18n.lang !== "en", tp = F.tpl(), set = F.tplSet();
    const favs = {}; F.favList().forEach(id => { favs[id] = 1; });
    /* "only favourites and limits" (PDF window, off by default) wins over the ♥ toggle; favourites stay in it
       even without an answer — they are wishes */
    const favLim = KC.$("pdfFavLimits").checked, onlyFav = !favLim && KC.$("onlyFav").checked;
    /* v613: an extended list — a practice shows both roles ("↑ Да ✦ / ↓ Может"); a stop in either role is a limit */
    const ext = KC.ext.isExt(st), RK = KC.match.RANK;
    const vals = id => { const x = st.items[id] || {}; return ext ? KC.ext.R.map(r => x[r]).filter(Boolean) : x.interest ? [x.interest] : []; };
    const isLimit = id => vals(id).indexOf("limit") >= 0;
    const inScope = id => (!set || set[id]) && (favLim ? !!favs[id] || isLimit(id) : (!onlyFav || favs[id]));
    const heart = id => favs[id] ? '<span style="color:' + P.accent + ';">♥</span> ' : "";
    const w = document.createElement("div");
    w.style.cssText = "position:fixed;left:-10000px;top:0;width:760px;padding:30px;background:" + P.bg + ";color:" + P.ink + ";font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.5;";
    const card = "background:" + P.panel + ";border:1px solid " + P.line + ";border-radius:12px;padding:18px 20px;margin-bottom:14px;";
    const pill = v => '<span style="display:inline-block;background:' + PILL[v][0] + ";color:" + PILL[v][1] + ';font-weight:600;font-size:12.5px;padding:3px 11px;border-radius:14px;">' + esc(t("scale." + v)) + "</span>";
    const nameOf = id => heart(id) + esc(KC.i18n.item(id).name) + (sub ? '<br><span style="color:' + P.muted + ';font-size:11px;">' + esc(KC.i18n.item(id, "en").name) + "</span>" : "");

    const metaLine = [];
    KC.PROFILE.forEach(f => {
      const v = !f.hidden && st.meta[f.id]; if (!v || (Array.isArray(v) && !v.length)) return;
      const txt = (Array.isArray(v) ? v : [v]).map(o => KC.i18n.optLabel(f.id, o)).join(", ");
      metaLine.push(esc(KC.i18n.fieldLabel(f.id)) + ": " + esc(txt));
    });
    if (ext) metaLine.unshift(esc(t("ext.note")));
    const idbits = [];
    if (st.name) idbits.push(esc(t("pdf.name")) + ": <b>" + esc(st.name) + "</b>");
    if (st.safeword) idbits.push(esc(t("pdf.safeword")) + ": <b>" + esc(st.safeword) + "</b>");

    let html = '<div style="' + card + '"><div style="display:flex;gap:18px;align-items:flex-start;"><div style="flex:1;min-width:0;">'
      /* v642 (owner): the site name on top, the sheet's title under it, then the address */
      + '<div style="' + serif + "font-size:27px;color:" + P.accent + ';line-height:1.1;">' + esc(SITE.name) + "</div>"
      + '<div style="' + serif + 'font-size:18px;margin-top:3px;line-height:1.2;">' + esc(t("app.title")) + "</div>"
      + '<div style="margin-top:3px;font-size:12.5px;"><span data-pdflink="1" style="color:' + P.accent + ';">' + esc(SITE.short) + "</span></div>";
    if (idbits.length) html += '<div style="margin-top:8px;font-size:13px;color:' + P.muted + ';">' + idbits.join("&nbsp;&nbsp;·&nbsp;&nbsp;") + "</div>";
    if (metaLine.length) html += '<div style="margin-top:5px;font-size:12.5px;color:' + P.muted + ';">' + metaLine.join("&nbsp;·&nbsp;") + "</div>";
    const scope = [];
    if (tp) scope.push(esc(t("pdf.tpl", { name: tp.name || t("unnamed"), n: tp.ids.length })));
    if (onlyFav) scope.push(esc(t("pdf.onlyFav")));
    if (favLim) scope.push(esc(t("pdf.onlyFavLimits")));
    if (scope.length) html += '<div style="margin-top:5px;font-size:12.5px;color:' + P.accent + ';font-weight:600;">' + scope.join("&nbsp;·&nbsp;") + "</div>";
    html += '<div style="margin-top:12px;">' + ["love", "yes", "maybe", "limit"].map(pill).join("&nbsp;") + "</div></div>"
      + qrBlock(opt && opt.qrLink) + "</div></div>";

    const limits = [];
    KC.CATS.forEach(c => c.items.forEach(([, id]) => { if (inScope(id) && isLimit(id)) limits.push(id); }));
    if (limits.length) {
      html += '<div style="background:' + PILL.limit[0] + ';border:1px solid #d7a3a3;border-radius:12px;padding:14px 18px;margin-bottom:14px;">'
        + '<div style="' + serif + 'font-size:16px;color:#a12b2b;margin-bottom:6px;">' + esc(t("pdf.limits")) + "</div>"
        + '<div style="font-size:13px;color:#5a2a2a;line-height:1.7;">' + limits.map(id => esc(KC.i18n.item(id).name) + (ext ? " " + KC.ext.R.filter(r => (st.items[id] || {})[r] === "limit").map(r => t("ext.arrow." + r)).join("") : "")).join("&nbsp;·&nbsp;") + "</div></div>";
    }

    /* favourites at a glance (not needed when the sheet shows only favourites) */
    const favIds = []; KC.CATS.forEach(c => c.items.forEach(([, id]) => { if (favs[id] && (!set || set[id])) favIds.push(id); }));
    if (favIds.length && !onlyFav && !favLim) {
      html += '<div style="' + card + '"><div style="' + serif + "font-size:16px;color:" + P.accent + ';margin-bottom:6px;">' + esc(t("pdf.favs")) + "</div>"
        + '<div style="font-size:13px;line-height:1.7;">' + favIds.map(id => esc(KC.i18n.item(id).name)).join("&nbsp;·&nbsp;") + "</div></div>";
    }

    let any = false;
    KC.CATS.forEach(cat => {
      let rows = cat.items.map(([, id]) => id).filter(inScope);
      if (st.onlyMarked !== false) rows = rows.filter(id => st.items[id] || (favLim && favs[id]));
      if (!rows.length) return; any = true;
      const rank = id => { const v = vals(id); return v.length ? Math.min.apply(null, v.map(x => RK[x])) : 4; };
      rows.sort((a, b) => rank(a) - rank(b));
      html += '<div style="' + card + '"><div style="border-bottom:2px solid ' + P.accent + ';padding-bottom:5px;margin-bottom:8px;"><span style="' + serif + 'font-size:19px;">' + esc(KC.i18n.cat(cat.id)) + "</span>"
        + (sub ? ' <span style="font-size:12px;color:' + P.muted + ';">' + esc(KC.i18n.cat(cat.id, "en")) + "</span>" : "")
        + ' <span style="font-size:11.5px;color:' + P.muted + ';">· ' + rows.length + "</span></div>"
        + '<table style="width:100%;border-collapse:collapse;font-size:13.5px;table-layout:fixed;">';
      rows.forEach((id, i) => {
        const s = st.items[id], bb = i < rows.length - 1 ? "border-bottom:1px solid " + P.line + ";" : "";
        html += '<tr><td style="padding:6px 8px 6px 0;' + bb + 'vertical-align:middle;word-wrap:break-word;">' + nameOf(id) + "</td>"
          + '<td style="padding:6px 0 6px 8px;' + bb + 'vertical-align:middle;width:' + (ext ? 150 : 96) + 'px;">' + (!s ? '<span style="color:#c3bbbf;">—</span>' : !ext ? pill(s.interest)
            : KC.ext.R.filter(r => s[r]).map(r => '<span style="color:' + P.muted + ';font-size:12px;">' + esc(t("ext.arrow." + r)) + "</span> " + pill(s[r]) + (s[r + "w"] ? ' <span style="color:' + P.accent + ';font-weight:600;font-size:12px;">✦</span>' : "")).join("<br>")) + "</td></tr>";
      });
      html += "</table></div>";
    });

    const tcard = (title, body) => '<div style="' + card + '"><div style="' + serif + "font-size:16px;color:" + P.accent + ';margin-bottom:4px;">' + esc(title) + '</div><div style="font-size:13px;white-space:pre-wrap;">' + esc(body) + "</div></div>";
    if (st.fantasies) html += tcard(t("pdf.fantasies"), st.fantasies);
    if (st.comments) html += tcard(t("pdf.comments"), st.comments);
    if (st.allergies) html += tcard(t("pdf.allergies"), st.allergies);
    if (!any && !limits.length) html += '<div style="' + card + "color:" + P.muted + ';">' + esc(t("pdf.empty")) + "</div>";
    html += '<div style="text-align:center;margin-top:4px;font-size:11px;color:' + P.muted + ';">' + esc(t("pdf.footer")) + "</div>"
      + '<div style="text-align:center;margin-top:2px;font-size:11px;color:' + P.muted + ';">' + siteLine() + "</div>";
    w.innerHTML = html; return w;
  };

  /* "Download PDF" opens a small window: export options, then "Download" */
  const pdfModal = KC.modal("pdfOverlay", "pdfClose");
  /* the line under the title: what the PDF is limited to */
  function pdfScope() {
    const tp = F.tpl(), scope = [], favLim = KC.$("pdfFavLimits").checked;
    if (tp) scope.push(t("pdf.tpl", { name: tp.name || t("unnamed"), n: tp.ids.length }));
    if (favLim) scope.push(t("pdf.onlyFavLimits")); else if (KC.$("onlyFav").checked) scope.push(t("pdf.onlyFav"));
    KC.$("pdfScope").hidden = !scope.length; KC.$("pdfScope").textContent = scope.join(" · ");
  }
  KC.$("pdfBtn").addEventListener("click", () => {
    KC.$("pdfFavLimits").checked = false; /* off every time the window opens */
    KC.$("pdfPortrait").checked = false;
    pdfScope();
    pdfModal.open();
  });
  KC.$("pdfFavLimits").addEventListener("change", pdfScope);
  KC.$("pdfGo").addEventListener("click", async function () {
    const btn = this, old = btn.textContent; btn.disabled = true; btn.textContent = t("pdf.busy");
    KC.stats.event("pdf");
    /* "Add the portrait as the first page" (off every time the window opens): its own page(s) before the list */
    try { await KC.lib("qr"); } catch (e) { /* offline: the sheet gets the site QR */ }
    let qrLink = null; try { qrLink = F.shareLink(); } catch (e) {}
    const sheets = (KC.$("pdfPortrait").checked && F.buildPortraitSheet ? [].concat(F.buildPortraitSheet()) : []).concat([F.buildSheet({ qrLink })]);
    const sheet = sheets[sheets.length - 1];
    sheets.forEach(sh => document.body.appendChild(sh));
    try {
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
      await KC.lib("pdf");   /* v629: fetched on the first PDF only */
      const pdf = new window.jspdf.jsPDF("p", "pt", "a4");
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), margin = 24, imgW = pw - margin * 2;
      let page = 0;
      const links = [], qrs = [];   /* v641: the site address and the QR are clickable in the PDF: [page, x, y, w, h] in PDF points */
      /* v631: the sheet is drawn in pieces of 3 PDF pages. One canvas for the whole sheet broke on long lists (an
         extended list is ~40 000 px tall): browsers cap a canvas (Chrome ~32 000 px high, iPhone ~16 million pixels in
         all) and return it blank — every page after the portrait came out white (bug report, Oct 10). */
      const SCALE = 2, MAXPX = 15e6;
      for (const sh of sheets) {
        const W = sh.scrollWidth, H = sh.scrollHeight;
        const pageCss = Math.floor((ph - margin * 2) * W / imgW);            /* CSS px of the sheet on one PDF page */
        { const top = sh.getBoundingClientRect(), k = imgW / W;
          sh.querySelectorAll("[data-pdflink]").forEach(el => { const r = el.getBoundingClientRect(), y = r.top - top.top;
            links.push([page + Math.floor(y / pageCss), margin + (r.left - top.left) * k, margin + (y % pageCss) * k, r.width * k, r.height * k, el.getAttribute("data-url") || SITE.url]); if (el.hasAttribute("data-qr")) qrs.push(links[links.length - 1]); }); }
        const chunkCss = Math.max(pageCss, Math.min(pageCss * 3, Math.floor(MAXPX / (W * SCALE * SCALE) / pageCss) * pageCss));
        /* each piece: the sheet inside a window of the piece's height (overflow hidden), shifted up by the piece's top */
        const clip = document.createElement("div");
        clip.style.cssText = "position:fixed;left:-10000px;top:0;overflow:hidden;width:" + W + "px;background:" + sh.style.background;
        const keep = sh.style.cssText; sh.style.position = "static"; sh.style.left = "0"; clip.appendChild(sh); document.body.appendChild(clip);
        for (let y0 = 0; y0 < H; y0 += chunkCss) {
          const hc = Math.min(chunkCss, H - y0);
          clip.style.height = hc + "px"; sh.style.marginTop = -y0 + "px";
          const canvas = await html2canvas(clip, { scale: SCALE, backgroundColor: "#ffffff", useCORS: true, windowWidth: W, width: W, height: hc });
          const ratio = imgW / canvas.width, sliceH = Math.round(pageCss * canvas.width / W);
          for (let y = 0; y < canvas.height; page++) {
            const h = Math.min(sliceH, canvas.height - y);
            const c = document.createElement("canvas"); c.width = canvas.width; c.height = h;
            const ctx = c.getContext("2d"); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, h);
            ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
            if (page > 0) pdf.addPage();
            pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, h * ratio);
            y += h;
          }
        }
        sh.style.cssText = keep; document.body.appendChild(sh); clip.remove();
      }
      /* the QR as vector squares over its picture (white quiet zone of 4 modules, dark runs merged per row) */
      qrs.forEach(([p, x, y, w]) => { const m = F.lastQR; if (!m || p >= page) return; const n = m.length + 8, u = w / n;
        pdf.setPage(p + 1); pdf.setFillColor(255, 255, 255); pdf.rect(x, y, w, w, "F"); pdf.setFillColor(0, 0, 0);
        m.forEach((r, j) => { for (let i = 0; i < r.length;) { if (!r[i]) { i++; continue; } let e = i; while (e < r.length && r[e]) e++;
          pdf.rect(x + (i + 4) * u, y + (j + 4) * u, (e - i) * u + 0.01, u + 0.01, "F"); i = e; } }); });
      links.forEach(([p, x, y, w, h, url]) => { if (p < page) { pdf.setPage(p + 1); pdf.link(x, y, w, h, { url }); } });
      const fn = t("pdf.file") + (F.state.name ? "-" + F.state.name.replace(/\s+/g, "_") : "") + ".pdf";
      try { pdf.save(fn); } catch (e) { window.open(URL.createObjectURL(pdf.output("blob")), "_blank"); }
      KC.toast(t("toast.pdfReady"));
    } catch (err) { console.error(err); KC.toast(t("toast.pdfFail")); }
    finally { sheets.forEach(sh => { if (sh.parentNode) sh.parentNode.removeChild(sh); }); btn.disabled = false; btn.textContent = old; pdfModal.close(); }
  });
})(window.KC);
