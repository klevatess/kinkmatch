  /* ===== app-src/04-neighbours-map.js — «Соседи»: vNeighbours, Leaflet map (loadLeaflet, drawMap), loadNeighbours.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  function vNeighbours() {
    var h = '<div class="top"><h1>' + t("tNeighbours") + "</h1></div>";
    if (!S.nb) return h + '<div class="body">' + (S.nbErr ? stateBox("broken", t("stErrT"), t("stErrX"), '<button type="button" class="btn primary" data-a="nbRetry">' + t("retry") + "</button>", t("stErrNote"))
      : S.nbSlow ? stateBox("slow", t("stSlowT"), t("stSlowX"), '<button type="button" class="btn" data-a="nbRetry">' + t("retry") + "</button>") : '<div class="muted center">' + t("loading") + "</div>") + "</div>";
    if (S.nb.paused) return h + '<div class="body"><div class="card small">' + t("pausedText") + "</div></div>";
    // owner, 2026-11-07: three views (list · swipe · map) and one «Фильтры» button; the filters open under it
    var fN = filtersOn();
    h += '<div class="nbhead"><div class="seg">' + ["list", "map", "swipe"].map(function (v) { return '<button type="button" data-a="nbView" data-v="' + v + '" aria-pressed="' + (S.nbView === v) + '">' + t(v === "swipe" ? "swView" : v) + "</button>"; }).join("") + "</div>" +
      '<button type="button" class="chip fbtn" data-a="fOpen" aria-expanded="' + !!S.fOpen + '" aria-pressed="' + !!(S.fOpen || fN) + '">' + FILT + " " + t("filters") + (fN ? ' <b class="fn">' + fN + "</b>" : "") + "</button></div>";
    if (S.nbView === "swipe") return h + vSwipe();   // app-src/04a-swipe.js
    // owner, 2026-11-07 (mockup N2): the filters open in a sheet over the list (09-render.js → filtersSheet)
    if (S.fItems.length || S.fInts.length) h += '<div class="chiprow"><button type="button" class="chip" aria-pressed="true" data-a="fOpen">' + t(S.fItems.length ? "fSearchOn" : "fIntsOn") + " ✕</button></div>";
    var list = shown();
    if (S.nbView === "map") {
      if (S.mapFrom) h += '<div class="mapback"><button type="button" class="chip" data-a="mapBack">‹ ' + t("mapBackP") + "</button></div>";
      h += '<div id="map" role="img" aria-label="' + esc(t("map")) + '"></div><div class="body" style="padding-top:8px">';
      // mockup N3: the chosen zone as a short list under the map (figure, nick, who, «готова», %), then the legend
      if (S.zone) {
        var zl = list.filter(function (n) { return n.zone === S.zone; }), zr = zl.filter(function (n) { return n.ready; }).length;
        h += '<div class="zhead"><b>' + esc(t("zoneN", { km: zl[0] ? kmText(zl[0]) : "", n: zl.length })) + "</b>" + (zr ? '<span class="zr">● ' + t("zReady", { n: zr }) + "</span>" : "") + "</div>";
        zl.forEach(function (n) {
          h += '<button type="button" class="zrow" data-a="openPerson" data-v="' + esc(n.id) + '">' + nameMark(n, 16) + '<span class="zmain"><b>' + esc(n.nick || t("g_" + n.gender)) + '</b> <span class="tiny muted">' + esc(who(n)) + "</span>" +
            (n.ready ? '<span class="zready">● ' + readyWord(n.gender) + "</span>" : "") + "</span>" + (n.pct != null ? '<b class="zpct" style="color:' + pctCol(n.pct) + '">' + n.pct + " %</b>" : "") + "</button>";
        });
      }
      h += mapLegend() + '<div class="tiny muted" id="mapnote">' + t("mapNote") + "</div>";
      return h + "</div>";
    }
    return h + listBody(list);
  }
  var FILT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" style="vertical-align:-3px"><path d="M4 6h16M7 12h10M10 18h4"/></svg>';
  /** how many filters are on (the number on «Фильтры») */
  function filtersOn() {
    return S.fQuick.length + S.fRoles.length + (S.fDist < 7 ? 1 : 0) + (S.fItems.length ? 1 : 0) + (S.fInts.length ? 1 : 0) + (S.nbSort !== "pct" ? 1 : 0) +
      (fromLevels().length > 1 && fromNow() !== fromLevels()[fromLevels().length - 1] ? 1 : 0);
  }
  /** the filters: quick chips, distance, roles, where from, search by practice / interest */
  function filtersSheet() {
    return '<div class="modal-bg sheet" data-a="fOpen"><div class="modal card sheetbox fsheet" data-a="noop" role="dialog" aria-modal="true" aria-labelledby="fsh">' +
      '<div class="fhead"><h2 id="fsh">' + t("filters") + "</h2>" + (filtersOn() ? '<button type="button" class="btn link" data-a="fReset">' + t("fResetAll") + "</button>" : "") + "</div>" + filtersBox() + "</div></div>";
  }
  function filtersBox() {
    var h = '<div class="fbox">';
    var chipM = function (act, list, v, label) { var on = v === "all" ? !list.length : list.indexOf(v) >= 0; return '<button type="button" class="chip" data-a="' + act + '" data-v="' + v + '" aria-pressed="' + on + '">' + label + "</button>"; };
    var readyN = (S.nb.items || []).filter(function (n) { return n.ready && (n.my !== "no" || n.was_hidden); }).length;
    h += '<div class="chiprow">' + (readyN ? chipM("fQuick", S.fQuick, "ready", '<i class="rdot" aria-hidden="true"></i>' + t("qReady") + " · " + readyN) : "") +
      [["new", "qNew"], ["keen", "qKeen"], ["likes", "qLikes"]].map(function (o) { return chipM("fQuick", S.fQuick, o[0], t(o[1])); }).join("") +
      (function () { var k = myInts().length ? (S.nb.items || []).filter(function (n) { return commonOf(n).length > 0; }).length : 0; return k ? chipM("fQuick", S.fQuick, "ints", t("qInts") + " · " + k).replace('class="chip"', 'class="chip ichip"') : ""; })() + "</div>";
    var allN = (S.nb.items || []).filter(function (n) { return n.my !== "no" || n.was_hidden; }).length, fitN = shown().length;
    h += '<div class="distbox"><label for="fdist" class="dtop"><span class="lbl">' + t("distL") + '</span><b class="serif" id="distval">' + distLabel(S.fDist) + "</b></label>" +
      '<input id="fdist" type="range" min="0" max="7" step="1" value="' + S.fDist + '" data-a="fDist">' +
      '<div class="dticks" aria-hidden="true">' + ["1", "3", "10", "30", "100", "300", "1000", t("distAll")].map(function (x, i) { return "<span" + (i === S.fDist ? ' class="on"' : "") + ">" + x + "</span>"; }).join("") + "</div>" +
      '<div class="dfoot"><span class="tiny muted">' + t("distCount", { n: fitN, all: allN }) + '</span><span class="dsort"><span class="tiny muted">' + t("sortL") + "</span>" +
      [["pct", "sortPct"], ["near", "sortNear"]].map(function (o) { return '<button type="button" class="chip" data-a="nbSort" data-v="' + o[0] + '" aria-pressed="' + (S.nbSort === o[0]) + '">' + t(o[1]) + "</button>"; }).join("") + "</span></div></div>";
    h += '<div class="chiprow">' +
      [["all", "rAll"], ["top", "r_top"], ["bottom", "r_bottom"], ["switch", "r_switch"], ["none", "r_none"]].map(function (o) { return chipM("fRole", S.fRoles, o[0], roleMark(o[0] === "all" ? null : o[0]) + t(o[1])); }).join("") +
      (fromLevels().length > 1 ? fromLevels().map(function (k) { return '<button type="button" class="chip" data-a="fFrom" data-v="' + k + '" aria-pressed="' + (fromNow() === k) + '">' + t({ chats: "fMine", uni: "fUni", space: "fSpace" }[k]) + "</button>"; }).join("") : "") + "</div>";
    h += '<div class="seg">' + [["practices", "sPractices"], ["ints", "sInts"]].map(function (o) { return '<button type="button" data-a="sMode" data-v="' + o[0] + '" aria-pressed="' + (S.sMode === o[0]) + '">' + t(o[1]) + "</button>"; }).join("") + "</div>";
    h += S.sMode === "ints" ? intSearchBox() : searchBox();   // owner, 2026-10-28
    return h + '<button type="button" class="btn primary" data-a="fOpen">' + t("fShow", { n: shown().length }) + "</button></div>";
  }
  function listBody(list) {
    var h = '<div class="body" style="padding-top:0">' + (S.note ? '<div class="card ok small" role="status">' + esc(S.note) + "</div>" : "");
    if (S.nb.filters_off) h += '<div class="card warn tiny">' + t("filtersOffNote") + "</div>";
    var hidden = shown(true).filter(function (n) { return n.my === "no" && !n.was_hidden; });
    if (!list.length && S.fItems.length) h += S.found ? stateBox("quiet", t("stSearchT"), t("stSearchX"), '<button type="button" class="btn" data-a="pClear">' + t("stSearchBtn") + "</button>") : "";
    else if (!list.length && (S.nb.items || []).length && (S.fDist < 7 || S.fRoles.length || S.fQuick.length || S.fInts.length || fromNow() !== fromLevels()[fromLevels().length - 1])) h += stateBox("quiet", t("stSearchT"), t("stFilterX"), '<button type="button" class="btn" data-a="fReset">' + t("stFilterBtn") + "</button>");
    else if (!list.length) h += S.nb.stats ? whyEmpty(S.nb.stats) : stateBox("empty", t("stNbT"), t("stNbX"));
    if (!S.fItems.length) h += ageBanner();   // owner, 2026-11-03
    if (list.length && !S.fItems.length) h += moreBanner();
    if (S.nb.items && S.nb.items.length && !S.fItems.length && !S.fInts.length) h += intsBanner();   // owner, 2026-10-28
    list.forEach(function (n) { h += nbCard(n); });
    var pz = S.nb.on_pause || [];   // owner, 2026-10-31
    if (pz.length) {
      h += '<div class="pzhead"><h2>' + t("pzTitle") + " · " + pz.length + '</h2><div class="small muted">' + t("pzNote") + "</div></div>";
      pz.forEach(function (n) { h += pzCard(n); });
    }
    if (hidden.length) {
      h += '<div class="hiddenrow small muted"><span>' + t("hiddenList", { n: hidden.length }) + '</span><button type="button" class="btn link" data-a="toggleHidden">' + t(S.showHidden ? "hideHidden" : "showHidden") + "</button></div>";
      if (S.showHidden) hidden.forEach(function (n) { h += '<div class="dim">' + nbCard(n) + "</div>"; });
    }
    return h + "</div>";
  }
  var PEOPLE_ZOOM = 12;   // from this zoom on, each person is drawn as a figure
  function figure(role) {
    var p = role === "top" ? '<path d="M8 1.5 15 14.5H1z"/>' : role === "bottom" ? '<circle cx="8" cy="8" r="6.5"/>' : role === "switch" ? '<path d="M8 1 15 8 8 15 1 8z"/>' : '<rect x="2" y="2" width="12" height="12" rx="3"/>';
    return '<svg viewBox="0 0 16 16" aria-hidden="true">' + p + "</svg>";
  }
  function mapLegend() {
    return '<div class="legend tiny">' + ["woman", "man", "other"].map(function (g) { return '<span class="pm g-' + g + '">' + figure("bottom") + "</span>" + t("g_" + g); }).join(" ") +
      '<br><span class="pm ready">' + figure("bottom") + "</span>" + t("readyLegend") + '<br><span class="pm">' + figure("top") + "</span>" + t("r_top") + ' <span class="pm">' + figure("bottom") + "</span>" + t("r_bottom") + ' <span class="pm">' + figure("switch") + "</span>" + t("r_switch") + ' <span class="pm">' + figure(null) + "</span>" + t("r_none") + " · " + t("mapZoomHint") +
      ((S.nb && S.nb.items || []).some(function (n) { return n.star; }) ? '<span class="lstar">' + starSvg("woman", 20) + "<span>" + t("cstarLegend") + "</span></span>" : "") + "</div>";
  }
  // owner, 2026-10-21 (speed): the map library is loaded only when the map is first opened, not on every start
  var leafletState = 0;
  var leafletWait = [];
  function loadLeaflet(then) {
    if (window.L) return then();
    leafletWait.push(then);   // owner, 2026-11-07: the quiet-time prefetch may have started it — every waiter runs when it is in
    if (leafletState) return;
    leafletState = 1;
    var fail = function () { leafletState = 0; leafletWait = []; var n = document.getElementById("mapnote"); if (n) n.textContent = t("mapErr"); };
    var js = document.createElement("script"); js.src = "vendor/leaflet/leaflet.js?v=1.9.4";
    js.onload = function () { leafletState = 0; var w = leafletWait; leafletWait = []; w.forEach(function (f) { try { f(); } catch (e) { /* one waiter must not stop the others */ } }); }; js.onerror = fail;
    var css = document.createElement("link"); css.rel = "stylesheet"; css.href = "vendor/leaflet/leaflet.css?v=1.9.4";
    css.onload = function () { document.head.appendChild(js); }; css.onerror = fail;   // the styles first, or the tiles land in a heap
    document.head.appendChild(css);
  }
  function drawMap() {
    if (!window.L) return loadLeaflet(function () { if (S.tab === "neighbours" && S.nbView === "map") drawMap(); });
    var el = document.getElementById("map");
    if (map) { map.remove(); map = null; }
    if (!el || !window.L || !S.nb) return;
    try {
      map = L.map(el, { zoomControl: true, attributionControl: true });
      map.attributionControl.setPrefix(false); // only the required «© OpenStreetMap»
      var tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 15, minZoom: 3, attribution: "© OpenStreetMap" });
      tiles.on("tileerror", function () { if (!S.mapErr) { S.mapErr = true; var n = document.getElementById("mapnote"); if (n) n.textContent = t("mapErr"); } });
      tiles.addTo(map);
      var accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8a2d47";
      var byZone = {};
      shown().forEach(function (n) { if (n.zone) (byZone[n.zone] = byZone[n.zone] || []).push(n); });   // owner, 2026-11-02: no zone = list only (src/hidden_area.js)
      var mine = L.polygon(S.nb.zones[S.nb.me.zone], { color: accent, weight: 2, fillOpacity: 0.15 }).addTo(map);
      var all = [mine], centres = {};
      Object.keys(byZone).forEach(function (z) {
        var people = byZone[z], poly = L.polygon(S.nb.zones[z], { color: "#241c22", weight: S.zone === z ? 2.5 : 1, opacity: 0.6, fillColor: accent, fillOpacity: 0.08 + 0.06 * Math.min(people.length, 5) }).addTo(map);
        centres[z] = poly.getBounds().getCenter();
        poly.on("click", function () { S.zone = z; render(); });
        all.push(poly);
      });
      var layer = L.layerGroup().addTo(map);
      var drawPeople = function () {
        layer.clearLayers();
        var close = map.getZoom() >= PEOPLE_ZOOM;
        Object.keys(byZone).forEach(function (z) {
          var people = byZone[z];
          if (!close) {   // far away: one label per zone with role counts
            // owner, 2026-10-25: people without a role were left out of the count (a zone of them showed a bare «1»)
            // owner, 2026-10-27: figure = role, colour = gender (as in the owner's map), a star for a community star
            var grp = {}, keys = [], rd = 0, KO = ["nova", "star", "top", "bottom", "switch", "none"], GO = ["woman", "man", "nonbinary", "other"];
            people.forEach(function (n) { var k = (n.nova ? "nova" : n.star ? "star" : n.role || "none") + "|" + (GO.indexOf(n.gender) >= 0 ? n.gender : "other"); if (!grp[k]) { grp[k] = 0; keys.push(k); } grp[k]++; if (n.ready) rd++; });
            keys.sort(function (a, b) { var x = a.split("|"), y = b.split("|"); return KO.indexOf(x[0]) - KO.indexOf(y[0]) || GO.indexOf(x[1]) - GO.indexOf(y[1]); });
            // drawn figures, not font glyphs: some phone fonts draw ■ as a thin bar (owner, 2026-10-25)
            var label = keys.map(function (k) { var r = k.split("|")[0], g = k.split("|")[1]; return r === "nova" ? '<span class="zf zn">' + SPARK + "</span>" + grp[k] : '<span class="zf g-' + g + (r === "star" ? " zs" : "") + '">' + (r === "star" ? starSvg(g, 17) : figure(r === "none" ? null : r)) + "</span>" + grp[k]; }).join(" ") + (rd ? ' <span class="zready">· ' + t("zReady", { n: rd }) + "</span>" : "");
            L.marker(centres[z], { icon: L.divIcon({ className: "", html: '<span class="zlabel">' + label + "</span>", iconSize: null }), keyboard: false }).addTo(layer)
              .on("click", function () { map.setView(centres[z], PEOPLE_ZOOM); });
            return;
          }
          // close: every person as a figure, on a spiral around the zone's centre (pixels, not places)
          var list = people.slice().sort(function (a, b) { return (b.pct || 0) - (a.pct || 0); });
          var cols = Math.ceil(list.length / 8), rows = Math.ceil(list.length / cols);
          list.forEach(function (n, i) {
            var col = Math.floor(i / rows), row = i % rows;
            var dx = Math.round((col - (cols - 1) / 2) * 140), dy = Math.round((row - (rows - 1) / 2) * 36);
            var nick = n.nick || t("g_" + n.gender);
            if (nick.length > 14) nick = nick.slice(0, 13) + "…";
            // owner, 2026-11-02: a supernova is drawn as a nebula even when its community star is not shown (n.star = null)
            var cap = n.star && n.star.caption ? '<span class="pmc">' + esc(n.star.caption) + "</span>" : "";
            var html = n.nova || n.star   // owner, 2026-10-27: variant A — the star instead of the figure, the caption under the nickname
              ? n.nova ? '<button type="button" class="pm star nova" title="' + esc((n.nick || who(n)) + " · " + t("novaTag")) + '"><span class="nvdot">' + SPARK + '</span><span class="pmt"><span class="pmn">' + esc(nick) + "</span>" + cap + "</span><b>" + (n.pct != null ? n.pct + "%" : "·") + "</b></button>"
              : '<button type="button" class="pm star g-' + (n.gender || "other") + (n.ready ? " ready" : "") + '" title="' + esc((n.nick || who(n)) + " · " + t("cstarTag")) + '">' + starSvg(n.gender, 34) +
                '<span class="pmt"><span class="pmn">' + esc(nick) + "</span>" + cap + "</span><b>" + (n.pct != null ? n.pct + "%" : "·") + "</b></button>"
              : '<button type="button" class="pm g-' + (n.gender || "other") + (n.ready ? " ready" : "") + '" title="' + esc(n.nick || who(n)) + '">' + figure(n.role) +
              '<span class="pmn">' + esc(nick) + "</span><b>" + (n.pct != null ? n.pct + "%" : "·") + "</b></button>";
            L.marker(centres[z], { icon: L.divIcon({ className: "pmwrap", html: html, iconSize: [0, 0], iconAnchor: [-dx, -dy] }), keyboard: true, riseOnHover: true }).addTo(layer)
              .on("click", function () { if (n.star && n.links && n.links.length) { S.sheet = n.id; render(); } else A.openPerson({ dataset: { v: n.id } }); });   // owner, 2026-10-27
          });
        });
      };
      map.on("zoomend", drawPeople);
      // back from a card: the same place and zoom as before
      // owner, 2026-11-07: «На карте» from a person's page — straight to their zone, close enough to read the names
      if (S.mapFocus && centres[S.mapFocus]) { map.setView(centres[S.mapFocus], PEOPLE_ZOOM); S.mapFocus = null; }
      else if (S.mapView) map.setView(S.mapView.c, S.mapView.z); else map.fitBounds(L.featureGroup(all).getBounds(), { padding: [20, 20], maxZoom: 13 });
      var m0 = map;   // a late «moveend» after the map was removed (map = null) must not throw
      m0.on("moveend", function () { if (map === m0) S.mapView = { c: m0.getCenter(), z: m0.getZoom() }; });
      drawPeople();
    } catch (e) { /* map optional */ }
  }

  /** owner, 2026-10-27: a star on the map → a panel with the nick, the caption, up to 2 links and «Открыть анкету» */
  function starSheet() {
    var n = (S.nb && S.nb.items || []).filter(function (x) { return x.id === S.sheet; })[0];
    if (!n) { S.sheet = null; return ""; }
    var more = (n.links || []).length - 2;
    return '<div class="modal-bg sheetbg" data-a="sheetClose"></div><div class="ssheet" role="dialog" aria-modal="true" aria-labelledby="shn"><span class="grab" aria-hidden="true"></span>' +
      '<div class="rtop">' + starSvg(n.gender, 44) + '<span class="pmain"><b id="shn" class="serif" style="font-size:21px">' + esc(n.nick || who(n)) + "</b>" + (n.star.caption ? '<span class="capline">' + esc(n.star.caption) + "</span>" : "") +
      '<span class="ps">' + esc(who(n)) + " · " + kmText(n) + "</span></span>" + pctBox(n) + "</div>" + linksBlock(n.links || [], 2) +
      (more > 0 ? '<div class="tiny muted center">' + t("lnkMore", { n: more }) + "</div>" : "") +
      '<button type="button" class="btn primary" data-a="sheetOpen" data-v="' + esc(n.id) + '">' + t("openCard") + "</button></div>";
  }

  Object.assign(A, {
    ageAll: function () { save("profile", { age_min: 18, age_max: 99 }); },   // owner, 2026-11-03: «Показать всех (18–99)»
    sMode: function (el) { S.sMode = el.dataset.v; render(); },
    fFrom: function (el) { S.fFrom = el.dataset.v; S.zone = null; render(); },
    toggleHidden: function () { S.showHidden = !S.showHidden; render(); },
    nbView: function (el) { S.nbView = el.dataset.v; S.zone = null; S.mapView = null; S.mapFrom = null; render(); },
    nbRetry: function () { S.nb = null; render(); loadNeighbours(); },
    fDist: function (el) { S.fDist = Math.max(0, Math.min(7, +el.value || 0)); S.zone = null; render(); },
    nbSort: function (el) { S.nbSort = el.dataset.v; render(); },
    fReset: function () { S.fBands = []; S.fDist = 7; S.fRoles = []; S.fQuick = []; S.fInts = []; S.iq = ""; S.fFrom = "all"; S.zone = null; render(); },
    sheetClose: function () { S.sheet = null; render(); },
    sheetOpen: function (el) { var id = el.dataset.v; S.sheet = null; A.openPerson({ dataset: { v: id } }); },
  });
