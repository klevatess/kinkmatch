/* core/help.js — the help window ("?" buttons), shared by both pages.
   Any element with data-help="<section>" opens it scrolled to that section. The window is built on
   first use and re-filled on every open, so it always follows the current language.
   Texts: help.h (title), help.<section>.h + help.<section>_html in lang/<lang>.ui.js.
   Two tabs: "How to use" (the sections below) and "What's new" (help.news_html, a green dot on the tab).
   "What's new" holds only entries the owner asks for, each under its date, the newest at the top.
   v613: a third tab "Описание созвездий" (core/lore.js) on the form page — what the open portrait shows, described
   in its setting; its texts are fetched when the tab is opened. The "?" of "My portrait" opens it.
   v615: the same mode buttons as in "My portrait" at its top, so one can click through the modes without leaving. */
(function (KC) {
  const SECTIONS = ["start", "answer", "filters", "portrait", "lists", "share", "received", "tpl", "pdf", "compare", "roulette", "privacy"];
  const NEWS = "news";   /* its own tab, not a section of "How to use" */
  /* texts added to a section later, kept as separate keys so the original text stays as it was */
  const MORE = { answer: ["help.answerExt_html"], portrait: ["help.portraitDnd_html", "help.dndRace_html", "help.wod_html", "help.wr_html", "help.leg_html", "help.av_html", "help.rz_html", "help.portraitExt_html"], compare: ["help.compareSave_html", "help.compareSpace_html", "help.compareFold_html", "help.compareDnd_html", "help.compareParty_html", "help.compareWod_html", "help.compareWr_html", "help.compareAv_html", "help.compareRz_html", "help.compareWh_html", "help.compareLeg_html", "help.compareExt_html"], tpl: ["help.tplNebula_html", "help.tplStart_html"], share: ["help.shareSend_html"], privacy: ["help.privacyStats_html"] };
  /* only while the counter is on; v610: a new joke mode's paragraphs only while its switch (KC.FEATURES) is on */
  const FEAT = { "help.answerExt_html": "ext", "help.portraitExt_html": "ext", "help.compareExt_html": "ext", "help.av_html": "av", "help.compareAv_html": "av", "help.rz_html": "rz", "help.compareRz_html": "rz", "help.wr_html": "wr", "help.compareWr_html": "wr", "help.compareWh_html": "wh", "help.leg_html": "leg", "help.compareLeg_html": "leg" };
  const shown = k => k === "help.privacyStats_html" ? !!(KC.stats && KC.stats.enabled) : FEAT[k] ? !!(KC.FEATURES && KC.FEATURES[FEAT[k]]) : true;
  const t = k => KC.i18n.t(k);
  const on = f => !!(KC.FEATURES && KC.FEATURES[f]);
  /* v621: "What's new" lines of a locked feature carry data-feat="<switch>" (shown only while it is on);
     a line written for the time it is locked carries data-nofeat="<switch>" (shown only while it is off) */
  function newsHTML() {
    const box = document.createElement("div"); box.innerHTML = t("help.news_html");
    box.querySelectorAll("[data-feat]").forEach(el => { if (!on(el.dataset.feat)) el.remove(); });
    box.querySelectorAll("[data-nofeat]").forEach(el => { if (on(el.dataset.nofeat)) el.remove(); });
    return box.innerHTML;
  }
  let modal = null;

  function build() {
    const ov = KC.el("div", "overlay"); ov.id = "helpOverlay";
    ov.innerHTML = '<div class="modal help-modal" role="dialog" aria-modal="true">'
      + '<div class="help-tabs" role="tablist"><button class="help-tab" type="button" role="tab" data-tab="help" id="helpTitle"></button>'
      + '<button class="help-tab" type="button" role="tab" data-tab="news" id="helpNewsTab"><span></span><i class="new-dot" aria-hidden="true"></i></button>'
      + '<button class="help-tab" type="button" role="tab" data-tab="lore" id="helpLoreTab" hidden></button></div>'
      + '<div id="helpPane"><nav class="help-toc" id="helpToc"></nav><div class="help-body" id="helpBody"></div></div>'
      + '<div class="help-body" id="helpNews" hidden></div><div class="help-body help-lore" id="helpLore" hidden></div>'
      + '<div class="modal-foot"><button class="btn ghost" id="helpClose" type="button" style="width:100%"></button></div></div>';
    document.body.appendChild(ov);
    modal = KC.modal("helpOverlay", "helpClose");
    KC.$("helpToc").addEventListener("click", e => {
      const a = e.target.closest("button[data-go]"); if (a) go(a.dataset.go);
    });
    /* v615: the mode buttons inside the guide (same as in "My portrait") — a click switches the portrait and redraws the guide */
    KC.$("helpLore").addEventListener("click", e => { if (KC.lore.click && KC.lore.click(e)) drawLore(); });
    ov.querySelector(".help-tabs").addEventListener("click", e => {
      const b = e.target.closest("button[data-tab]"); if (b) tab(b.dataset.tab);
    });
  }
  function tab(which) {
    if (which === LORE && !KC.lore.provider) which = "help";
    KC.$("helpPane").hidden = which !== "help"; KC.$("helpNews").hidden = which !== NEWS; KC.$("helpLore").hidden = which !== LORE;
    [KC.$("helpTitle"), KC.$("helpNewsTab"), KC.$("helpLoreTab")].forEach(b => { const on = b.dataset.tab === which; b.classList.toggle("on", on); b.setAttribute("aria-selected", on ? "true" : "false"); });
    const m = KC.$("helpNews").closest(".modal"); if (m) m.scrollTop = 0;
    if (which === LORE) drawLore();
  }
  /* v613: "Описание созвездий" — only what the open portrait shows; the texts come when the tab is opened */
  const LORE = "lore";
  function drawLore() {
    const box = KC.$("helpLore"), lang = KC.i18n.lang, esc = KC.esc;
    const groups = (KC.lore.provider ? KC.lore.provider() : []).filter(g => g.items.length);
    const sw = KC.lore.switchHTML ? '<div class="lore-sw">' + KC.lore.switchHTML() + "</div>" : "";
    if (!groups.length) { box.innerHTML = sw + '<p class="lore-none">' + esc(KC.FEATURES && KC.FEATURES.wr ? t("lore.none") : t("lore.none").replace(/[,、]\s*⚔ Wr/, "")) + "</p>"; return; }
    box.innerHTML = sw + '<p class="lore-none">' + esc(t("lore.loading")) + "</p>";
    KC.lore.load(lang, ok => {
      if (KC.i18n.lang !== lang || box.hidden) return;
      if (!ok) { box.innerHTML = sw + '<p class="lore-none">' + esc(t("lore.offline")) + "</p>"; return; }
      box.innerHTML = sw + '<p class="lore-lead">' + esc(t("lore.lead")) + "</p>" + groups.map(g => (g.title ? "<h4>" + esc(g.title) + "</h4>" : "")
        + g.items.map(it => { const tx = KC.lore.text(lang, it.key); return tx ? '<div class="lore-item" data-key="' + esc(it.key) + '"><h5>' + esc(KC.i18n.t(it.key, it.vars || {})) + "</h5><p>" + esc(tx) + "</p></div>" : ""; }).join("")).join("")
        + '<p class="lore-note">' + esc(t("lore.note")) + "</p>";
    });
  }
  function go(sec) {
    const el = KC.$("help-" + sec), body = el && el.closest(".modal");
    if (!el || !body) return;
    /* "start" = the top (tabs and the list of sections); others: just under the sticky tabs */
    body.scrollTop = sec === SECTIONS[0] ? 0 : el.offsetTop - body.firstElementChild.offsetTop - body.firstElementChild.offsetHeight - 8;
  }

  KC.help = {
    SECTIONS, NEWS, LORE,
    open(sec) {
      if (!modal) build();
      KC.$("helpTitle").textContent = t("help.h");
      KC.$("helpNewsTab").firstChild.textContent = t("help.news.h");
      KC.$("helpLoreTab").textContent = t("lore.h"); KC.$("helpLoreTab").hidden = !KC.lore.provider;
      KC.$("helpNews").innerHTML = newsHTML();
      KC.$("helpClose").textContent = t("close");
      KC.$("helpToc").innerHTML = SECTIONS.map(s => '<button type="button" class="btn ghost mini" data-go="' + s + '">' + KC.esc(t("help." + s + ".h")) + "</button>").join("");
      KC.$("helpBody").innerHTML = SECTIONS.map(s => '<section id="help-' + s + '"><h4>' + KC.esc(t("help." + s + ".h")) + "</h4>" + t("help." + s + "_html") + (MORE[s] || []).filter(shown).map(k => t(k)).join("") + "</section>").join("");
      modal.open();
      if (sec === NEWS || sec === LORE) { tab(sec); return; }
      tab("help");
      go(SECTIONS.indexOf(sec) >= 0 ? sec : "start");
    },
  };

  /* one listener for every "?" button, present or added later */
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-help]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    KC.help.open(b.dataset.help);
  });
})(window.KC);
