  /* ===== app-src/04a-swipe.js — «Соседи → Свайп» (owner, 2026-11-07, mockup N4c): one person at a time, a frameless card,
     the description first; a like button on the right only (no ✕). The card follows the finger sideways after a short
     distance — so it reads as a card — and a long enough move goes to the next / previous person. Swiping only moves:
     it never answers. Order: the fullest profiles first; people already answered at the end with «ваш лайк» / «взаимно».
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  /** how full a profile is: the description weighs most, then interests, the checklist, the nick, then the match */
  function fullness(n) {
    var ab = String(n.about || "").length;
    return (ab ? 3 + Math.min(ab, 300) / 150 : 0) + Math.min((n.interests || []).length, 6) * 0.5 + Math.min((n.answered || 0) / 100, 3) +
      (n.nick ? 0.5 : 0) + (n.ready ? 1 : 0) + (n.pct || 0) / 50;
  }
  /** the deck: everyone the filters let through, unanswered first (fullest first), then the answered ones */
  function swDeck() {
    var all = shown().filter(function (n) { return !n.nova; });
    var answered = function (n) { return n.mutual || n.my === "yes"; };
    var a = all.filter(function (n) { return !answered(n); }), b = all.filter(answered);
    var by = function (x, y) { return fullness(y) - fullness(x) || (y.pct || 0) - (x.pct || 0); };
    return a.sort(by).concat(b.sort(by));
  }
  var swCache = { key: "", ids: [] };
  /** the order is kept while the person swipes (a like must not reshuffle the deck under the finger) */
  function swIds() {
    var key = [S.fDist, S.fRoles.join(), S.fQuick.join(), S.fItems.join(), S.fInts.join(), fromNow(), S.nbSort].join("|");
    if (swCache.key !== key) { swCache = { key: key, nb: S.nb, ids: swDeck().map(function (n) { return n.id; }) }; if (S.sw) S.sw.i = 0; }
    else if (swCache.nb !== S.nb) {   // a fresh list: keep the order, drop who is gone, add newcomers at the end
      var now = swDeck().map(function (n) { return n.id; });
      swCache.ids = swCache.ids.filter(function (id) { return now.indexOf(id) >= 0; }).concat(now.filter(function (id) { return swCache.ids.indexOf(id) < 0; }));
      swCache.nb = S.nb;
    }
    return swCache.ids;
  }
  var HEART_O = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7.4-4.5-9.4-9C1.2 8.3 3.2 4.6 6.7 4.6c2.1 0 3.5 1.1 5.3 3 1.8-1.9 3.2-3 5.3-3 3.5 0 5.5 3.7 4.1 6.9-2 4.5-9.4 9-9.4 9z"/></svg>';
  var HEART_F = HEART_O.replace('fill="none"', 'fill="currentColor"');
  /** the like button: a gradient with an outline heart; once liked — a reddish fill (owner, 2026-11-07) */
  function likeBtn(n, cls) {
    var on = n.mutual || n.my === "yes";
    return '<button type="button" class="likebtn' + (on ? " on" : "") + (cls ? " " + cls : "") + '" data-a="' + (on ? "openPerson" : "yesOpen") + '" data-v="' + esc(n.id) + '" aria-label="' + esc(t(on ? (n.mutual ? "mutualBadge" : "yesBadge") : "likeBtn")) + '"' +
      (on ? ' aria-pressed="true"' : "") + (S.busy ? " disabled" : "") + ">" + (on ? HEART_F : HEART_O) + "</button>";
  }
  function vSwipe() {
    var ids = swIds(), S2 = S.sw || (S.sw = { i: 0 });
    if (!ids.length) return '<div class="body">' + (S.nb.stats && !(S.nb.items || []).length ? whyEmpty(S.nb.stats) : stateBox("quiet", t("stSearchT"), t("stFilterX"), '<button type="button" class="btn" data-a="fReset">' + t("stFilterBtn") + "</button>")) + "</div>";
    if (S2.i >= ids.length) {   // the end of the deck
      return '<div class="body"><div class="free"><h2>' + t("swEndT") + '</h2><div class="muted">' + t("swEndX", { n: ids.length }) + '</div>' +
        '<button type="button" class="btn primary" data-a="swGo" data-v="0">' + t("swAgain") + '</button><button type="button" class="btn" data-a="nbView" data-v="list">' + t("swToList") + "</button></div></div>";
    }
    var n = nbFind(ids[S2.i]);
    if (!n || (n.my === "no" && !n.was_hidden)) { ids.splice(S2.i, 1); return vSwipe(); }   // gone, or just put to «Не сейчас»
    swPrefetch(ids, S2.i);
    // mockup N4: a thin bar of dashes (one per person up to 12, else a line) and «3 / 12»
    var nD = Math.min(ids.length, 12), onD = ids.length <= 12 ? S2.i + 1 : Math.ceil((S2.i + 1) / ids.length * 12);
    var h = '<div class="swwrap"><div class="swprog" aria-live="polite"><span class="dashes" aria-hidden="true">' + Array.from({ length: nD }, function (_, k) { return "<i" + (k < onD ? ' class="on"' : "") + "></i>"; }).join("") +
      '</span><span class="tiny muted">' + (S2.i + 1) + " / " + ids.length + "</span></div>";
    h += '<article class="swcard" id="swcard" data-id="' + esc(n.id) + '" aria-roledescription="' + esc(t("swCard")) + '">' + personBody(n, false);
    // owner, 2026-11-07: pulling further down past the end opens the whole profile (back returns here, to the top)
    h += '<div class="swpull" id="swpull" data-id="' + esc(n.id) + '"><span aria-hidden="true">↓</span>' + t(n.compare ? "swPullA" : "swPull") + '<i aria-hidden="true"><b></b></i></div>';
    h += '</article><div class="swlikebar">' + likeBtn(n) + "</div></div>";
    setTimeout(swPullWatch, 0);   // owner, 2026-11-07: the like on the right, always in reach
    return h;
  }
  /* owner, 2026-11-07: pulling past the end of the card opens the person's ANSWERS («Анкета»), not their page. It takes a
     long pull: the zone under the card is tall and fills a bar; it opens only when the bar is full and held ~0.4 s.
     On the answers screen, pulling up past the top (or «назад») returns to the same card here. */
  var pullT = 0;
  function swPullWatch() { pullTick(); }
  function pullTick() {
    var z = document.getElementById("swpull");
    if (z && S.tab === "neighbours" && S.nbView === "swipe" && !S.open) {
      var r = z.getBoundingClientRect(), k = Math.max(0, Math.min(1, (window.innerHeight - r.top) / r.height));
      var bar = z.querySelector("i b"); if (bar) bar.style.width = Math.round(k * 100) + "%";
      z.classList.toggle("full", k >= 0.97);
      if (k >= 0.97 && window.scrollY > 60) { if (!pullT) pullT = setTimeout(function () { pullT = 0; var z2 = document.getElementById("swpull"); if (z2 && z2.classList.contains("full")) swOpenAnswers(z2.dataset.id); }, 400); }
      else { clearTimeout(pullT); pullT = 0; }
      return;
    }
    var u = document.getElementById("pullup");
    if (u && S.swPull && S.list) {
      if (window.scrollY <= 2 && u.dataset.armed === "1") { if (!pullT) pullT = setTimeout(function () { pullT = 0; if (window.scrollY <= 2 && S.swPull) { haptic("light"); A.closePerson(); } }, 400); }
      else { clearTimeout(pullT); pullT = 0; }
    }
  }
  window.addEventListener("scroll", pullTick, { passive: true });
  function swOpenAnswers(id) {
    var n = nbFind(id); if (!n) return;
    haptic("light"); S.swBack = true;
    if (!n.compare) return A.openPerson({ dataset: { v: id } });   // answers closed until a mutual like: the page instead
    S.open = id; S.swPull = true; S.cmp = null; S.err = "";
    A.listOpen({ dataset: { v: id } });
    pullUpArm();
  }
  /** the answers screen opened by the pull starts just under the «вверх» zone */
  function pullUpArm() {
    var u = document.getElementById("pullup"); if (!u) return;
    window.scrollTo(0, u.offsetHeight);
    setTimeout(function () { var u2 = document.getElementById("pullup"); if (u2) u2.dataset.armed = "1"; }, 700);
  }
  /** the next two people: their answers and comparison are asked for in the quiet time (app-src/14-start.js) */
  function swPrefetch(ids, i) {
    [i + 1, i + 2].forEach(function (k) { var m = ids[k] && nbFind(ids[k]); if (m && m.compare && !S.ins[m.id]) prefetch("ins:" + m.id, function () { return insightGet(m); }); });
  }
  function swGo(i) {
    var ids = swIds();
    S.sw.i = Math.max(0, Math.min(ids.length, i)); haptic("light");
    render();
  }
  /* the finger: nothing moves until it has gone 12 px sideways (more sideways than down) — then the card follows it;
     past a quarter of the width (or a quick flick) it leaves and the next one comes; otherwise it springs back */
  var swT = null;
  function swDown(e) {
    var c = e.target.closest && e.target.closest("#swcard");
    if (!c || (e.button != null && e.button !== 0) || e.target.closest("button, a, input")) return;
    swT = { x: e.clientX, y: e.clientY, t: Date.now(), on: false, el: c, id: e.pointerId };
  }
  function swMove(e) {
    if (!swT || e.pointerId !== swT.id) return;
    var dx = e.clientX - swT.x, dy = e.clientY - swT.y;
    if (!swT.on) {
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { swT = null; return; }   // a scroll, not a swipe
      if (Math.abs(dx) < 12) return;
      swT.on = true; swT.el.classList.add("drag");
      try { swT.el.setPointerCapture(e.pointerId); } catch (x) { /* old web view */ }
    }
    var first = S.sw.i === 0 && dx > 0, d = first ? dx / 3 : dx;   // nothing before the first one: it only gives a little
    swT.el.style.transform = "translateX(" + d + "px) rotate(" + (d / 40) + "deg)";
    swT.dx = dx;
    if (e.cancelable) e.preventDefault();
  }
  function swUp(e) {
    if (!swT || e.pointerId !== swT.id) return;
    var T = swT; swT = null;
    if (!T.on) return;
    var dx = T.dx || 0, w = T.el.offsetWidth || 360, fast = Math.abs(dx) > 40 && Date.now() - T.t < 250;
    var dir = (Math.abs(dx) > w / 4 || fast) ? (dx < 0 ? 1 : -1) : 0;
    if (dir === -1 && S.sw.i === 0) dir = 0;
    T.el.classList.remove("drag");
    if (!dir) { T.el.style.transform = ""; return; }
    T.el.classList.add("leave");
    T.el.style.transform = "translateX(" + (dir > 0 ? -1 : 1) * (w + 60) + "px) rotate(" + (dir > 0 ? -8 : 8) + "deg)";
    setTimeout(function () { swGo(S.sw.i + dir); var c = document.getElementById("swcard"); if (c) { c.classList.add("enter"); setTimeout(function () { c.classList.remove("enter"); }, 220); } }, 160);
  }
  document.addEventListener("pointerdown", swDown, { passive: true });
  document.addEventListener("pointermove", swMove, { passive: false });
  document.addEventListener("pointerup", swUp);
  document.addEventListener("pointercancel", function (e) { if (swT && swT.on) { swT.el.classList.remove("drag"); swT.el.style.transform = ""; } swT = null; });
  document.addEventListener("keydown", function (e) {
    if (S.tab !== "neighbours" || S.nbView !== "swipe" || S.open || !S.sw || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || "")) return;
    if (e.key === "ArrowRight") swGo(S.sw.i + 1); else if (e.key === "ArrowLeft") swGo(S.sw.i - 1);
  });

  Object.assign(A, {
    swGo: function (el) { swGo(+el.dataset.v); window.scrollTo(0, 0); },
    fOpen: function () { S.fOpen = !S.fOpen; render(); },
  });
