/* core/lore.js — v613 (owner, Oct 4): "Описание созвездий", the third tab of the help window. It describes, in the
   terms of its setting, only what the open portrait shows right now: the D&D class, subclass, race and alignment; the
   World of Darkness clan, sect, generation, Path… (each line its own items); the Chaos god, the 40K faction, the
   legion, the Old World race, the Witcher school and sign. A mode switched off (KC.FEATURES) is never on the portrait,
   so it is never described either. The texts are a separate file per language, js/lore/<lang>.lore.js (100–280 KB, 40–60 KB as sent),
   fetched only when the tab is opened (owner) and kept for the rest of the visit. Keys = the interface keys of the
   names (dnd.c.bard, wod.fey.nocker, leg.l.sw …), so a title is the name exactly as the portrait shows it.
   KC.lore.provider (form/portrait.js) -> [{title, items: [{key, vars}]}], one group per role of an extended list. */
(function (KC) {
  const data = {}, waiting = {};
  KC.addLore = (lang, o) => { data[lang] = Object.assign(data[lang] || {}, o); };
  function load(lang, done) {
    if (data[lang]) { done(true); return; }
    if (waiting[lang]) { waiting[lang].push(done); return; }
    waiting[lang] = [done];
    const B = window.KC_BOOT || { base: "js/", v: "0" };
    const s = document.createElement("script");
    s.src = B.base + "lore/" + lang + ".lore.js?v=" + B.v;
    const fin = ok => { const a = waiting[lang] || []; delete waiting[lang]; a.forEach(f => f(ok)); };
    s.onload = () => fin(!!data[lang]); s.onerror = () => fin(false);
    document.head.appendChild(s);
  }
  KC.lore = {
    provider: null,
    load,
    has: lang => !!data[lang],
    text: (lang, key) => (data[lang] && data[lang][key]) || "",
  };
})(window.KC);
