  /* ===== app-src/01-reg-steps.js — Registration screens: step 1 consent (teaseMap), checklist step, step 3 profile, step 4 place.
     Part of public/app/app.js: scripts/build-app.mjs glues app-src/*.js in name order into one file (one shared scope).
     Edit HERE, never app.js. Handlers for buttons drawn here go into this part's Object.assign(A, {…}). ===== */

  /* ---------- screens ---------- */
  /** owner, 2026-11-01 (variant A): a PICTURE of the map on the first step — made-up figures, blurred; only the number is
      real (people in open space, rounded like on the checklist step). No real zones before 18+, no map tiles, no request. */
  var TEASE = [[14, 30, "top", "woman"], [27, 62, "bottom", "man"], [38, 24, "switch", "other"], [47, 52, "bottom", "woman"], [58, 30, "top", "man"],
    [66, 66, "switch", "woman"], [76, 38, "bottom", "other"], [86, 58, "top", "woman"], [20, 78, "bottom", "woman"], [90, 22, "switch", "man"], [52, 80, "top", "other"]];
  function teaseMap(n) {
    var pins = TEASE.map(function (p) { return '<span class="pm g-' + p[3] + '" style="left:' + p[0] + "%;top:" + p[1] + '%">' + figure(p[2]) + "</span>"; }).join("");
    return '<div class="tease"><div class="tmap" aria-hidden="true"><svg class="tbg" viewBox="0 0 360 150" preserveAspectRatio="none">' +
      '<path d="M-10 40 C 80 30, 140 70, 370 50 M-10 110 C 90 120, 200 80, 370 120 M70 -10 C 80 60, 60 100, 90 160 M240 -10 C 230 50, 260 110, 250 160"/>' +
      '<circle class="z" cx="80" cy="70" r="46"/><circle class="z" cx="200" cy="55" r="38"/><circle class="z" cx="285" cy="95" r="44"/></svg>' + pins + "</div>" +
      (n ? '<div class="tcap">' + t("s2space", { n: n }) + "</div>" : "") + "</div>";
  }
  function vConsent() {
    var p = S.me.profile || {}, f = S.form;
    if (f.gender === undefined) f.gender = p.gender || "";
    if (f.birth === undefined) f.birth = isoToDots(p.birth_date || "");
    if (f.bd === undefined) { var bp = String(f.birth || "").split("."); f.bd = bp[0] || ""; f.bm = bp[1] || ""; f.by = bp[2] || ""; }
    if (f.ageExact === undefined) f.ageExact = !!p.age_exact;
    var h = (S.edit ? "" : progress(1)) + '<div class="body">' + "<h1>" + t(S.edit ? "pBirth" : "s1title") + "</h1>";   // mockup R1: no brand row
    if (!S.edit) {
      // owner, 2026-11-01: the picture of the map with the real open-space count, two short points (no intro line);
      // everything else is under «Как это устроено и что хранится» below the checkbox
      h += teaseMap(S.me.universe && S.me.universe.space_hint);
      h += '<div class="hows plain"><div>✦ ' + t("howS1") + "</div><div>✦ " + t("howS2") + "</div></div>";
    }
    // owner, 2026-10-20: typed with digits (numeric keyboard), not the date wheel; the dots are added while typing
    // owner, 2026-10-27: three fields — day, month, year (digits only, no dots to type)
    var bf = function (k, lbl, ph, max, ac) { return '<label><span class="tiny muted">' + t(lbl) + '</span><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="' + ac + '" maxlength="' + max + '" data-f="' + k + '" value="' + esc(f[k]) + '" placeholder="' + t(ph) + '"></label>'; };
    h += '<div class="field"><span class="lbl" id="bdl">' + t("birth") + '</span><div class="bdate" role="group" aria-labelledby="bdl">' +
      bf("bd", "bDay", "bDayPh", 2, "bday-day") + bf("bm", "bMonth", "bMonthPh", 2, "bday-month") + bf("by", "bYear", "bYearPh", 4, "bday-year") + "</div></div>";
    h += '<div class="tiny muted">' + t("birthNote") + "</div>";
    // owner, 2026-10-20: the person chooses — an age group (default) or the exact age.
    // owner, 2026-11-01: not during registration any more (fewer questions before the start; «Назад» from the checklist
    // step too) — only when someone on the map edits the birth date in «Профиль»
    if (S.edit && S.me.active) {
      var iso = dotsToIso(f.birth), age = iso ? ageFrom(iso) : null, ok = age != null && age >= 18 && age <= 100;
      h += '<div class="field" id="agefield"><span class="lbl">' + t("ageShow") + '</span><div class="chips">' +
        chip("ageExact", "0", ok ? t("ageRange", { v: bucketOf(age) }) : t("ageRangeOnly"), !f.ageExact) +
        chip("ageExact", "1", ok ? t("ageExact", { v: age }) : t("ageExactOnly"), !!f.ageExact) + "</div></div>";
    } else h += '<div class="tiny muted">' + t("ageGroupNote") + "</div>";
    h += '<div class="field"><span class="lbl">' + t("gender") + '</span><div class="chips">' +
      ["woman", "man", "other"].map(function (g) { return chip("gender", g, t("g_" + g), f.gender === g); }).join("") + "</div></div>";
    // owner, 2026-11-01: a short checkbox; the five points, the full consent text and «О проекте» fold out under it
    h += '<label class="check"><input type="checkbox" data-f="consent"' + (f.consent || (S.edit && S.me.steps.consent) ? " checked" : "") + "><span>" + t("consentS") + "</span></label>";
    h += '<button type="button" class="cmore" data-a="cMore" aria-expanded="' + !!S.cMore + '" aria-controls="cmorebox"><span class="chev" aria-hidden="true">▸</span>' + t("moreT") + "</button>";
    if (S.cMore) h += '<div class="card small cmorebox" id="cmorebox"><div>· ' + t("how1") + "</div><div>· " + t("how2") + "</div><div>· " + t("how3") + "</div><div>· " + t("how5") + "</div><div>· " + t("how4") + "</div>" +
      '<div class="cfull">' + t("consent") + '</div><button type="button" class="btn link" style="align-self:flex-start;padding:0" data-a="page" data-v="about">' + t("abLink") + "</button></div>";
    return h + errLine() + "</div>" + consentFoot();
  }
  /** owner, 2026-11-01: «Продолжить» is off until everything is filled in; under it — what is still missing. */
  function consentMissing() {
    var f = S.form, miss = [], d = String(f.bd || ""), m = String(f.bm || ""), y = String(f.by || "");
    if (!d && !m && !y) miss.push(t("cmDate"));
    else if (!d || !m || !y) miss.push(y && y.length < 4 ? t("cmYear") : t("cmDate"));
    else if (y.length < 4) miss.push(t("cmYear"));
    else {
      var iso = dotsToIso(d + "." + m + "." + y), age = iso ? ageFrom(iso) : null;
      if (!iso) miss.push(t("cmNoDate")); else if (age < 18) miss.push(t("cmUnder")); else if (age > 100) miss.push(t("cmOld"));
    }
    if (!f.gender) miss.push(t("cmGender"));
    var agreed = f.consent === true || (f.consent !== false && !!S.edit && S.me.steps.consent);
    if (!agreed) miss.push(t("cmConsent"));
    return miss;
  }
  function consentFoot() {
    var miss = consentMissing(), back = S.edit ? '<button type="button" class="btn" data-a="cancel">' + t("cancel") + "</button>" : "";
    return '<div class="foot' + (back ? "" : " one") + '">' + back + '<button type="button" class="btn primary" id="cnext" data-a="saveConsent"' + (S.busy || miss.length ? " disabled" : "") + ">" + esc(t(S.edit ? "save" : "next")) + "</button>" +
      '<div class="tiny cmiss" id="cmiss" role="status" aria-live="polite">' + (miss.length ? esc(t("cmLeft", { list: miss.join(" · ") })) : "") + "</div></div>";
  }
  function paintConsent() {
    var b = document.getElementById("cnext"), m = document.getElementById("cmiss");
    if (!b || !m) return;
    var miss = consentMissing();
    b.disabled = !!(S.busy || miss.length);
    m.textContent = miss.length ? t("cmLeft", { list: miss.join(" · ") }) : "";
  }

  function vChecklist() {
    var c = S.me.checklist, f = S.form;
    var h = (S.edit ? "" : progress(2)) + '<div class="body"><h1>' + t(S.edit ? "clTitle" : "s2title") + "</h1>";
    if (S.preview && c) {
      h += (S.fromSite ? '<div class="tiny muted">' + t("clFromSite") + "</div>" : "") + '<div class="card"><div class="okmark">✓ ' + t("readOk", { n: c.answered, total: c.total }) + "</div>" +
        '<div class="row"><span>' + t("role") + '</span><span class="v">' + (c.role ? t("r_" + c.role) : t("r_none")) + "</span></div>" +
        '<div class="row"><span>' + t("exp") + '</span><span class="v">' + (c.experience ? t("x_" + c.experience) : t("none")) + "</span></div>" +
        '<div class="row"><span>' + t("rel") + '</span><span class="v">' + (c.relation ? t("l_" + c.relation) : t("none")) + "</span></div>" +
        '<div class="row"><span>' + t("sections") + '</span><span class="v">' + c.sections + " / " + c.totalSections + "</span></div></div>";
      return h + "</div>" + foot(null, "afterChecklist", t("allRight"));
    }
    // owner, 2026-10-20: the checklist is filled in right here (the Kinkosmos form in a frame); a link is the other way
    var d = S.me.draft, sh = !S.edit && S.me.universe && S.me.universe.space_hint;
    // owner, 2026-11-01: short, the important words first
    if (!S.edit) h += (sh ? '<div class="s2line">' + t("s2space", { n: sh }) + "</div>" : "") + '<div class="s2line">' + t("s2need") + "</div>";
    if (d && !S.edit) {
      var k = Math.max(0, 50 - d.answered);
      h += '<div class="card"><div style="font-weight:600">' + t(k ? "dTitle" : "dTitleOk", { n: d.answered }) + "</div>" + bar(d.answered, !S.me.active) +
        '<div class="small muted">' + t(k ? "rLine" : "rLineOk", { date: fmtTime(d.updated_at), k: k }) + "</div>" +
        '<button type="button" class="btn primary" data-a="fillOpen">' + t("rGo") + '</button><button type="button" class="btn link" style="color:var(--danger)" data-a="fillAgain">' + t("rAgain") + "</button></div>";
      h += '<div class="tiny muted">' + esc(t("dNote")) + "</div>";
    } else {
      if (S.edit) h += '<div class="muted small">' + t("s2intro") + "</div>";
      h += '<button type="button" class="btn primary fillbtn" data-a="fillOpen">' + PEN + " " + t(S.edit ? "fillEdit" : "fillBtn") + "</button>";
      h += S.edit ? '<div class="tiny muted">' + esc(t("s2skip")) + "</div>" : '<div class="small muted">' + esc(t("s2skipShort")) + "</div>";
    }
    // owner, 2026-10-27: new registrations fill the checklist here only; a Kinkosmos link is pasted later, in «Анкета»
    if (!S.edit) return h + errLine() + '</div><div class="foot one"><button type="button" class="btn" data-a="backToConsent">' + t("back") + "</button></div>";
    h += '<div class="orline tiny muted"><i></i>' + t("orSite") + "<i></i></div>";
    h += '<label class="field"><span class="lbl">' + t("link") + '</span><input type="text" inputmode="url" autocomplete="off" data-f="link" value="' + esc(f.link || "") + '" placeholder="klevatess.github.io/kinkmatch/#a=…"></label>';
    h += '<button type="button" class="btn site" data-a="openSite">' + t("goSite") + ' <span aria-hidden="true">↗</span></button>';   // owner, 2026-10-22
    return h + errLine() + "</div>" + foot("cancel", "saveChecklist", t("readLink"));
  }

  var SEEKING = ["one", "couple_mfm", "couple_fmf", "third_m_mfm", "third_m_fmf", "third_f_mfm", "third_f_fmf", "orgy", "swing", "watching", "unsure"];
  /** «Кого ищет: пару для МЖМ, свинг» — first letter lower case only (МЖМ stays). */
  function seekLine(list) { return (list || []).map(function (v) { var x = t("sk_" + v); return x.charAt(0).toLowerCase() + x.slice(1); }).join(", "); }
  function vProfile() {
    var p = S.me.profile || {}, f = S.form;
    if (!f.looking) f.looking = (p.looking_for || []).slice();
    if (!f.show) f.show = (p.show_genders || []).slice();
    if (!f.seeking) f.seeking = (p.seeking || []).slice();
    if (f.amin === undefined) f.amin = p.age_min || 18;
    if (f.amax === undefined) f.amax = p.age_max || 99;
    if (f.about === undefined) f.about = p.about || "";
    if (f.aboutPublic === undefined) f.aboutPublic = p.about_public !== false;
    if (f.nick === undefined) f.nick = p.nick || "";
    var part = S.edit ? S.editPart : null, pshow = function (k) { return !part || part === k; };   // owner, 2026-10-27
    var h = (S.edit ? "" : progress(3)) + '<div class="body"><h1>' + t(part ? "pPart_" + part : "s3title") + "</h1>";
    // owner, 2026-11-02 (variant A): required fields carry a red *, «Дальше» waits for them, under it what is still missing
    if (!S.edit) h += '<div class="tiny muted" style="margin-top:-8px">' + t("reqNote", { s: REQ }) + "</div>";
    if (pshow("nick")) h += '<label class="field"><span class="lbl">' + t("nick") + REQ + '</span><input type="text" maxlength="30" autocomplete="off" data-f="nick" value="' + esc(f.nick) + '"></label>';
    if (pshow("nick")) h += '<div class="tiny muted">' + t("nickNote") + "</div>";
    if (pshow("looking")) h += '<div class="field"><span class="lbl">' + t("lblLooking") + REQ + optL("lblMany") + '</span><div class="chips">' +
      ["sessions", "relationship", "friends", "meetups", "looking"].map(function (v) { return chip("looking", v, t("lf_" + v), f.looking.indexOf(v) >= 0); }).join("") + "</div></div>";
    // owner, 2026-10-25: «Кого ищу» — information for others, never a filter; required for new profiles
    if (pshow("seeking")) h += '<div class="field"><span class="lbl">' + t("lblSeeking") + (seekReq() ? REQ : "") + optL("lblMany") + '</span><div class="chips">' +
      SEEKING.map(function (v) { return chip("seeking", v, t("sk_" + v), f.seeking.indexOf(v) >= 0); }).join("") + '</div><div class="tiny muted">' + t("seekingNote") + "</div></div>";
    if (pshow("show")) h += '<div class="field"><span class="lbl">' + t("showMe") + REQ + optL("lblMany") + '</span><div class="chips">' +
      ["man", "woman", "other"].map(function (v) { return chip("show", v, t("sh_" + v), f.show.indexOf(v) >= 0); }).join("") + "</div>" +
      '<div class="tiny muted">' + t("showNote") + "</div></div>";
    // owner, 2026-11-03: the age range is not asked during registration (18–99 by default); it stays in Профиль
    if (pshow("show") && S.edit) h += '<div class="field"><span class="lbl">' + t("ages") + optL("lblAgesOpt") + '</span><div class="ages"><label class="small">' + t("from") + ' <input type="number" min="18" max="99" data-f="amin" value="' + esc(f.amin) + '"></label><label class="small">' + t("to") + ' <input type="number" min="18" max="99" data-f="amax" value="' + esc(f.amax) + '"></label></div></div>';
    if (pshow("about")) h += '<div class="card about"><div class="lbl">' + t("lblAbout") + REQ + optL("lblAboutMin") + "</div>" + (p.about_hidden ? '<div role="alert" class="small" style="color:var(--danger);line-height:1.5">' + t("aboutHiddenNote") + "</div>" : "") + '<div class="tiny muted">' + t("aboutIdeas") + '</div><div class="chips">' +
      ["aboutS1", "aboutS2", "aboutS3", "aboutS4", "aboutS5"].map(function (k) { return '<button type="button" class="chip" data-a="aboutAdd" data-v="' + k + '">+ ' + t(k) + "</button>"; }).join("") + "</div>" +
      '<textarea maxlength="1500" data-f="about" placeholder="' + esc(t("aboutPh")) + '">' + esc(f.about) + '</textarea><div class="tiny" style="display:flex;justify-content:space-between;gap:8px"><span id="aboutmore" style="color:var(--danger)">' + aboutMore(f.about) + '</span><span class="muted" id="aboutcount">' + String(f.about || "").length + " / 1500</span></div></div>";
    if (pshow("about")) h += '<label class="check"><input type="checkbox" data-f="aboutPublic"' + (f.aboutPublic ? " checked" : "") + "><span>" + t("aboutPublic") + "</span></label>";

    // owner, 2026-10-21: «Где вас видно» (a chat of theirs is in the universe) / open space for someone without chats
    var um = uniMine();
    if (!S.edit && um) {
      if (f.uni === undefined) f.uni = um.on === null ? true : um.on;
      var mineL = quoted(um.mine), othersL = quoted(um.all.filter(function (c) { return um.mine.indexOf(c) < 0; }));
      h += '<div class="lbl">' + t("uniWhere") + "</div>";
      [[true, "uniBoth", "uniBothNote"], [false, "uniOnly", "uniOnlyNote"]].forEach(function (o) {
        h += '<label class="card radio' + (f.uni === o[0] ? " on" : "") + '"><span style="display:flex;gap:10px;align-items:flex-start;font-weight:600"><input type="radio" name="uni" data-a="uniPick" data-v="' + (o[0] ? 1 : 0) + '"' + (f.uni === o[0] ? " checked" : "") + ">" + t(o[1]) + "</span>" +
          '<span class="small muted" style="padding-left:30px;line-height:1.5">' + t(o[2], { mine: mineL, others: othersL || "—" }) + "</span></label>";
      });
    }
    if (!S.edit && !S.me.chats.length) h += '<div class="card warn small" style="line-height:1.5"><div>' + t("noChatNote") + "</div></div>";
    return h + errLine() + "</div>" + (S.edit ? foot("cancel", "saveProfile") : profileFoot());
  }
  var REQ = '<span style="color:var(--danger);font-weight:700;margin-left:2px" aria-hidden="true">*</span>';
  function optL(k) { return ' <span class="muted" style="font-weight:400">· ' + t(k) + "</span>"; }
  function seekReq() { return !!(S.me.profile && S.me.profile.seeking_required); }
  function aboutLeft(v) { return Math.max(0, 20 - String(v || "").trim().length); }
  function aboutMore(v) { var n = aboutLeft(v); return n ? esc(t("aboutMore", { n: n })) : ""; }
  /** owner, 2026-11-02: the same checks as saveProfile, in the order the fields stand on the screen */
  function profileMissing() {
    var f = S.form, miss = [];
    if (!String(f.nick || "").trim()) miss.push(t("pmNick"));
    if (!(f.looking || []).length) miss.push(t("pmLooking"));
    if (seekReq() && !(f.seeking || []).length) miss.push(t("pmSeeking"));
    if (!(f.show || []).length) miss.push(t("pmShow"));
    if (aboutLeft(f.about)) miss.push(t("pmAbout", { n: aboutLeft(f.about) }));
    return miss;
  }
  function profileFoot() {
    var miss = profileMissing();
    return '<div class="foot"><button type="button" class="btn" data-a="backToChecklist">' + t("back") + '</button><button type="button" class="btn primary" id="pnext" data-a="saveProfile"' + (S.busy || miss.length ? " disabled" : "") + ">" + esc(t("next")) + "</button>" +
      '<div class="tiny cmiss" id="pmiss" role="status" aria-live="polite">' + (miss.length ? esc(t("cmLeft", { list: miss.join(" · ") })) : "") + "</div></div>";
  }
  function paintProfile() {
    var b = document.getElementById("pnext"), m = document.getElementById("pmiss"), am = document.getElementById("aboutmore");
    if (am) am.textContent = aboutLeft(S.form.about) ? t("aboutMore", { n: aboutLeft(S.form.about) }) : "";
    if (!b || !m) return;
    var miss = profileMissing();
    b.disabled = !!(S.busy || miss.length);
    m.textContent = miss.length ? t("cmLeft", { list: miss.join(" · ") }) : "";
  }

  function vPlace() {
    var f = S.form, loc = S.me.location;
    if (!f.radius) f.radius = (loc && loc.radius) || S.me.radius_pref || 3;
    var h = (S.edit ? "" : progress(4)) + '<div class="body"><h1>' + t("s4title") + "</h1>";
    if (S.edit && loc && loc.next_change_at && loc.next_change_at * 1000 > Date.now() && !(loc.radius === 3 && !loc.fine_ok && S.form.radius === 1)) {
      h += '<div class="card warn small">' + t("changeFrom", { date: fmtDate(loc.next_change_at) }) + "</div></div>" + foot(null, "cancel", t("back"));
      return h;
    }
    h += '<div class="muted small">' + t("s4intro") + "</div>";
    h += '<div class="lbl">' + t("precise") + "</div>";
    [[1, "r1", "r1n"], [3, "r3", "r3n"]].forEach(function (o) {
      h += '<label class="opt' + (f.radius === o[0] ? " on" : "") + '"><input type="radio" name="radius" data-a="radius" data-v="' + o[0] + '"' + (f.radius === o[0] ? " checked" : "") +
        '><span><b>' + t(o[1]) + '</b><br><span class="small muted">' + t(o[2]) + "</span></span></label>";
    });
    h += '<button type="button" class="btn primary" data-a="useHere"' + (S.busy ? " disabled" : "") + ">" + t("useHere") + "</button>";
    if (S.geoWait) h += '<div class="card small" role="status">' + t("geoWait") + "</div>";
    h += '<button type="button" class="btn" data-a="coordsOpen">' + t("coordsBtn") + "</button>";
    if (S.coordsOpen) {
      var pc = parseCoords(f.coords || "");
      h += '<div class="card small"><div class="muted">' + t("coordsHelp") + '</div><label class="field"><span class="lbl">' + t("coordsLbl") + '</span><input type="text" autocomplete="off" inputmode="text" data-f="coords" placeholder="' + esc(t("coordsPh")) + '" value="' + esc(f.coords || "") + '"></label>' +
        '<div class="tiny" id="coordsres">' + (f.coords ? (pc ? t("coordsOk", { lat: pc.lat.toFixed(5), lon: pc.lon.toFixed(5) }) : t("e_coords")) : "") + "</div>" +
        // owner, 2026-10-21 (a dot in Iran instead of St Petersburg — the two numbers swapped): the point is shown on a map before saving
        '<div id="coordsmap" style="height:170px;border-radius:12px;overflow:hidden' + (pc ? "" : ";display:none") + '"></div>' +
        '<div class="tiny muted" id="coordshint"' + (pc ? "" : " hidden") + ">" + t("coordsCheck") + ' <button type="button" class="btn link" style="padding:0" data-a="coordsSwap">' + t("coordsSwap") + "</button></div>" +
        '<button type="button" class="btn primary" data-a="coordsSave"' + (S.busy ? " disabled" : "") + ">" + t("coordsSave") + "</button></div>";
    }
    h += '<button type="button" class="btn" data-a="otherPoint">' + t("otherPoint") + "</button>";
    if (S.chatHelp) h += '<div class="card small">' + t("otherHelp") + '<button type="button" class="btn" data-a="closeApp">' + t("closeApp") + "</button></div>";
    h += '<div class="card small muted">' + t("placeNote") + "</div>";
    return h + errLine() + "</div>" + (S.edit ? foot(null, "cancel", t("cancel")) : '<div class="foot one"><button type="button" class="btn" data-a="backToProfile">' + t("back") + "</button></div>");
  }

  Object.assign(A, {
    saveConsent: function () {
      save("consent", { consent: !!S.form.consent || (!!S.edit && S.me.steps.consent && S.form.consent !== false), birth_date: dotsToIso(S.form.birth) || S.form.birth, gender: S.form.gender, age_exact: !!S.form.ageExact },
        function () {
          if (S.edit) endEdit(); S.form = {};
          if (S.tz && !S.edit) { S.tz = null; document.documentElement.classList.remove("tzsnap"); window.scrollTo(0, 0); }   // owner, 2026-11-07: past step 1 the teaser stays behind
          if (S.pendingLink) { var l = S.pendingLink; S.pendingLink = null; S.fromSite = true; setTimeout(function () { save("checklist", { link: l }, function () { S.preview = true; }); }, 0); }
        });
    },
    // ?from=kinkoverse: the site shows its «Send to Kinkoverse» button (needs the site change, see BOT_TECH.md)
    openSite: function () { var u = ((S.me && S.me.site) || "https://klevatess.github.io/kinkmatch/") + "?from=kinkoverse"; if (tg && tg.openLink) tg.openLink(u); else window.open(u, "_blank"); },
    saveProfile: function () {
      var f = S.form;
      if (S.edit && S.editPart) {   // owner, 2026-10-27: only the section that was opened is checked and sent
        var k = S.editPart, b = {};
        if (k === "nick") { if (!String(f.nick || "").trim()) { S.err = t("e_nick"); return render(); } b.nick = f.nick; }
        if (k === "looking") { if (!f.looking.length) { S.err = t("e_pick"); return render(); } b.looking_for = f.looking; }
        if (k === "seeking") b.seeking = f.seeking;
        if (k === "show") { if (!f.show.length) { S.err = t("e_pick"); return render(); } b.show_genders = f.show; b.age_min = parseInt(f.amin, 10) || 18; b.age_max = parseInt(f.amax, 10) || 99; }
        if (k === "about") { if (String(f.about || "").trim().length < 20) { S.err = t("e_about_short"); return render(); } b.about = f.about; b.about_public = !!f.aboutPublic; }
        return save("profile", b, function () { endEdit(); });
      }
      if (!f.looking.length || !f.show.length) { S.err = t("e_pick"); return render(); }
      if (!f.seeking.length && S.me.profile && S.me.profile.seeking_required) { S.err = t("e_seeking_required"); return render(); }
      if (!String(f.nick || "").trim()) { S.err = t("e_nick"); return render(); }
      if (String(f.about || "").trim().length < 20) { S.err = t("e_about_short"); return render(); }
      save("profile", { looking_for: f.looking, seeking: f.seeking, show_genders: f.show, age_min: parseInt(f.amin, 10) || 18, age_max: parseInt(f.amax, 10) || 99,
        about: f.about, about_public: !!f.aboutPublic, nick: f.nick,
        universe: !S.edit && uniMine() ? f.uni !== false : undefined, space_default: !S.edit && !S.me.chats.length ? true : undefined }, function () { if (S.edit) endEdit(); S.form = {}; });
    },
    radius: function (el) { S.form.radius = +el.dataset.v; api("POST", "settings", { radius: S.form.radius }); render(); },
    useHere: function () {
      S.err = ""; S.geoWait = true; render();
      getPoint(function (pt) {
        S.geoWait = false;
        if (!pt) { S.err = t("e_geo"); S.coordsOpen = true; return render(); }
        save("location", { lat: pt.lat, lon: pt.lon, radius: radiusNow() }, function () { if (S.edit) endEdit(); S.form = {}; });
      });
    },
    coordsSwap: function () {
      var pc = parseCoords(S.form.coords || ""); if (!pc) return;
      S.form.coords = pc.lon + ", " + pc.lat; render();
    },
    coordsOpen: function () { S.coordsOpen = !S.coordsOpen; render(); },
    coordsSave: function () {
      var pc = parseCoords(S.form.coords || "");
      if (!pc) { S.err = t("e_coords"); return render(); }
      save("location", { lat: pc.lat, lon: pc.lon, radius: radiusNow() }, function () { S.coordsOpen = false; if (S.edit) endEdit(); S.form = {}; });
    },
    otherPoint: function () { S.chatHelp = true; api("POST", "settings", { radius: S.form.radius }); render(); },
    closeApp: function () { if (tg) tg.close(); },
    backToConsent: function () { startEdit("consent"); },
    cMore: function () { S.cMore = !S.cMore; render(); },
    backToChecklist: function () { startEdit("checklist"); },
    backToProfile: function () { startEdit("profile"); },
    cancel: endEdit,
    aboutAdd: function (el) {
      var f = S.form, cur = String(f.about || ""), add = t(el.dataset.v) + " ";
      if ((cur + add).length > 1500) return;
      f.about = cur + (cur && !/\n$/.test(cur) ? "\n" : "") + add; render();
      var ta = app.querySelector('[data-f="about"]'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    },
    page: function (el) { S.page = el.dataset.v; render(); window.scrollTo(0, 0); },
    fillAgain: function () {
      confirm2(t("rAgain1"), t("rAgain2"), function () {
        api("POST", "draft", { clear: true }).then(function () { if (S.me) S.me.draft = null; fillShow(true, true); }, function () { S.err = t("netErr"); render(); });
      });
    },
    uniPick: function (el) { S.form.uni = el.dataset.v === "1"; render(); },
  });
