/* form/pdf.js — "Download PDF": builds a styled summary sheet off-screen, rasterises it
   with html2canvas and slices it into A4 pages with jsPDF (both loaded from cdnjs).
   Follows the screen: a template limits the items (and is named in the header), favourites get ♥,
   "only ♥" in the filter panel limits the sheet to favourites. */
(function (KC) {
  const F = KC.form, t = (k, v) => KC.i18n.t(k, v), esc = KC.esc;
  const P = { bg: "#f5f1ec", panel: "#fffdfb", ink: "#241c22", muted: "#8a7d84", line: "#e6ddd6", accent: "#8a2d47" };
  const PILL = { limit: ["#f6e2e0", "#b23b3b"], maybe: ["#f6ecda", "#b9852a"], yes: ["#e0f0e6", "#2f7d54"], love: ["#f4e0ec", "#9d2f68"] };
  const serif = "font-family:Fraunces,Georgia,serif;font-weight:600;";

  F.buildSheet = function () {
    const st = F.shown(), sub = KC.i18n.lang !== "en", tp = F.tpl(), set = F.tplSet();
    const favs = {}; F.favList().forEach(id => { favs[id] = 1; });
    /* "only favourites and limits" (PDF window, off by default) wins over the ♥ toggle; favourites stay in it
       even without an answer — they are wishes */
    const favLim = KC.$("pdfFavLimits").checked, onlyFav = !favLim && KC.$("onlyFav").checked;
    const isLimit = id => (st.items[id] || {}).interest === "limit";
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
    const idbits = [];
    if (st.name) idbits.push(esc(t("pdf.name")) + ": <b>" + esc(st.name) + "</b>");
    if (st.safeword) idbits.push(esc(t("pdf.safeword")) + ": <b>" + esc(st.safeword) + "</b>");

    let html = '<div style="' + card + '"><div style="' + serif + "font-size:27px;color:" + P.accent + ';line-height:1.1;">' + esc(t("app.title")) + "</div>";
    if (idbits.length) html += '<div style="margin-top:8px;font-size:13px;color:' + P.muted + ';">' + idbits.join("&nbsp;&nbsp;·&nbsp;&nbsp;") + "</div>";
    if (metaLine.length) html += '<div style="margin-top:5px;font-size:12.5px;color:' + P.muted + ';">' + metaLine.join("&nbsp;·&nbsp;") + "</div>";
    const scope = [];
    if (tp) scope.push(esc(t("pdf.tpl", { name: tp.name || t("unnamed"), n: tp.ids.length })));
    if (onlyFav) scope.push(esc(t("pdf.onlyFav")));
    if (favLim) scope.push(esc(t("pdf.onlyFavLimits")));
    if (scope.length) html += '<div style="margin-top:5px;font-size:12.5px;color:' + P.accent + ';font-weight:600;">' + scope.join("&nbsp;·&nbsp;") + "</div>";
    html += '<div style="margin-top:12px;">' + ["love", "yes", "maybe", "limit"].map(pill).join("&nbsp;") + "</div></div>";

    const limits = [];
    KC.CATS.forEach(c => c.items.forEach(([, id]) => { if (inScope(id) && (st.items[id] || {}).interest === "limit") limits.push(id); }));
    if (limits.length) {
      html += '<div style="background:' + PILL.limit[0] + ';border:1px solid #d7a3a3;border-radius:12px;padding:14px 18px;margin-bottom:14px;">'
        + '<div style="' + serif + 'font-size:16px;color:#a12b2b;margin-bottom:6px;">' + esc(t("pdf.limits")) + "</div>"
        + '<div style="font-size:13px;color:#5a2a2a;line-height:1.7;">' + limits.map(id => esc(KC.i18n.item(id).name)).join("&nbsp;·&nbsp;") + "</div></div>";
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
      const rank = id => { const s = st.items[id]; return s ? KC.match.RANK[s.interest] : 4; };
      rows.sort((a, b) => rank(a) - rank(b));
      html += '<div style="' + card + '"><div style="border-bottom:2px solid ' + P.accent + ';padding-bottom:5px;margin-bottom:8px;"><span style="' + serif + 'font-size:19px;">' + esc(KC.i18n.cat(cat.id)) + "</span>"
        + (sub ? ' <span style="font-size:12px;color:' + P.muted + ';">' + esc(KC.i18n.cat(cat.id, "en")) + "</span>" : "")
        + ' <span style="font-size:11.5px;color:' + P.muted + ';">· ' + rows.length + "</span></div>"
        + '<table style="width:100%;border-collapse:collapse;font-size:13.5px;table-layout:fixed;">';
      rows.forEach((id, i) => {
        const s = st.items[id], bb = i < rows.length - 1 ? "border-bottom:1px solid " + P.line + ";" : "";
        html += '<tr><td style="padding:6px 8px 6px 0;' + bb + 'vertical-align:middle;word-wrap:break-word;">' + nameOf(id) + "</td>"
          + '<td style="padding:6px 0 6px 8px;' + bb + 'vertical-align:middle;width:96px;">' + (s ? pill(s.interest) : '<span style="color:#c3bbbf;">—</span>') + "</td></tr>";
      });
      html += "</table></div>";
    });

    const tcard = (title, body) => '<div style="' + card + '"><div style="' + serif + "font-size:16px;color:" + P.accent + ';margin-bottom:4px;">' + esc(title) + '</div><div style="font-size:13px;white-space:pre-wrap;">' + esc(body) + "</div></div>";
    if (st.fantasies) html += tcard(t("pdf.fantasies"), st.fantasies);
    if (st.comments) html += tcard(t("pdf.comments"), st.comments);
    if (st.allergies) html += tcard(t("pdf.allergies"), st.allergies);
    if (!any && !limits.length) html += '<div style="' + card + "color:" + P.muted + ';">' + esc(t("pdf.empty")) + "</div>";
    html += '<div style="text-align:center;margin-top:4px;font-size:11px;color:' + P.muted + ';">' + esc(t("pdf.footer")) + "</div>";
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
    pdfScope();
    pdfModal.open();
  });
  KC.$("pdfFavLimits").addEventListener("change", pdfScope);
  KC.$("pdfGo").addEventListener("click", async function () {
    const btn = this, old = btn.textContent; btn.disabled = true; btn.textContent = t("pdf.busy");
    KC.stats.event("pdf");
    const sheet = F.buildSheet(); document.body.appendChild(sheet);
    try {
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
      const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: sheet.scrollWidth });
      const pdf = new window.jspdf.jsPDF("p", "pt", "a4");
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      const margin = 24, imgW = pw - margin * 2, ratio = imgW / canvas.width, sliceH = Math.floor((ph - margin * 2) / ratio);
      for (let y = 0, page = 0; y < canvas.height; page++) {
        const h = Math.min(sliceH, canvas.height - y);
        const c = document.createElement("canvas"); c.width = canvas.width; c.height = h;
        const ctx = c.getContext("2d"); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, h);
        ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (page > 0) pdf.addPage();
        pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, h * ratio);
        y += h;
      }
      const fn = t("pdf.file") + (F.state.name ? "-" + F.state.name.replace(/\s+/g, "_") : "") + ".pdf";
      try { pdf.save(fn); } catch (e) { window.open(URL.createObjectURL(pdf.output("blob")), "_blank"); }
      KC.toast(t("toast.pdfReady"));
    } catch (err) { console.error(err); KC.toast(t("toast.pdfFail")); }
    finally { document.body.removeChild(sheet); btn.disabled = false; btn.textContent = old; pdfModal.close(); }
  });
})(window.KC);
