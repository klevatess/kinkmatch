/* core/help.js — the help window ("?" buttons), shared by both pages.
   Any element with data-help="<section>" opens it scrolled to that section. The window is built on
   first use and re-filled on every open, so it always follows the current language.
   Texts: help.h (title), help.<section>.h + help.<section>_html in lang/<lang>.ui.js.
   Two tabs: "How to use" (the sections below) and "What's new" (help.news_html, a green dot on the tab).
   "What's new" holds only entries the owner asks for, each under its date, the newest at the top. */
(function (KC) {
  const SECTIONS = ["start", "answer", "filters", "lists", "share", "received", "tpl", "pdf", "compare", "privacy"];
  const NEWS = "news";   /* its own tab, not a section of "How to use" */
  /* texts added to a section later, kept as separate keys so the original text stays as it was */
  const MORE = { compare: ["help.compareSave_html"], privacy: ["help.privacyStats_html"] };
  const shown = k => k !== "help.privacyStats_html" || !!(KC.stats && KC.stats.enabled); /* only while the counter is on */
  const t = k => KC.i18n.t(k);
  let modal = null;

  function build() {
    const ov = KC.el("div", "overlay"); ov.id = "helpOverlay";
    ov.innerHTML = '<div class="modal help-modal" role="dialog" aria-modal="true">'
      + '<div class="help-tabs" role="tablist"><button class="help-tab" type="button" role="tab" data-tab="help" id="helpTitle"></button>'
      + '<button class="help-tab" type="button" role="tab" data-tab="news" id="helpNewsTab"><span></span><i class="new-dot" aria-hidden="true"></i></button></div>'
      + '<div id="helpPane"><nav class="help-toc" id="helpToc"></nav><div class="help-body" id="helpBody"></div></div>'
      + '<div class="help-body" id="helpNews" hidden></div>'
      + '<button class="btn ghost" id="helpClose" type="button" style="margin-top:14px;width:100%"></button></div>';
    document.body.appendChild(ov);
    modal = KC.modal("helpOverlay", "helpClose");
    KC.$("helpToc").addEventListener("click", e => {
      const a = e.target.closest("button[data-go]"); if (a) go(a.dataset.go);
    });
    ov.querySelector(".help-tabs").addEventListener("click", e => {
      const b = e.target.closest("button[data-tab]"); if (b) tab(b.dataset.tab);
    });
  }
  function tab(which) {
    const news = which === NEWS;
    KC.$("helpPane").hidden = news; KC.$("helpNews").hidden = !news;
    [KC.$("helpTitle"), KC.$("helpNewsTab")].forEach(b => { const on = (b.dataset.tab === "news") === news; b.classList.toggle("on", on); b.setAttribute("aria-selected", on ? "true" : "false"); });
    const m = KC.$("helpNews").closest(".modal"); if (m) m.scrollTop = 0;
  }
  function go(sec) {
    const el = KC.$("help-" + sec), body = el && el.closest(".modal");
    if (!el || !body) return;
    /* "start" = the top (tabs and the list of sections); others: just under the sticky tabs */
    body.scrollTop = sec === SECTIONS[0] ? 0 : el.offsetTop - body.firstElementChild.offsetTop - body.firstElementChild.offsetHeight - 8;
  }

  KC.help = {
    SECTIONS, NEWS,
    open(sec) {
      if (!modal) build();
      KC.$("helpTitle").textContent = t("help.h");
      KC.$("helpNewsTab").firstChild.textContent = t("help.news.h");
      KC.$("helpNews").innerHTML = t("help.news_html");
      KC.$("helpClose").textContent = t("close");
      KC.$("helpToc").innerHTML = SECTIONS.map(s => '<button type="button" class="btn ghost mini" data-go="' + s + '">' + KC.esc(t("help." + s + ".h")) + "</button>").join("");
      KC.$("helpBody").innerHTML = SECTIONS.map(s => '<section id="help-' + s + '"><h4>' + KC.esc(t("help." + s + ".h")) + "</h4>" + t("help." + s + "_html") + (MORE[s] || []).filter(shown).map(k => t(k)).join("") + "</section>").join("");
      modal.open();
      if (sec === NEWS) { tab(NEWS); return; }
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
