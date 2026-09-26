/* core/migrate.js — moving everything saved on this device from the OLD site to the NEW one.
   The site moved from nekrons1.github.io/Kinkcheck/ to klevatess.github.io/kinkmatch/.
   Browsers keep saved data per site address, so the new site starts empty. The OLD build
   (ROLE "sender") shows a "Move to the new site" button: it packs the backup (the same data as
   "Download backup") into the #part of a link to the new site and opens it in the same tab.
   The NEW build (ROLE "receiver") reads that link, asks the user, and merges the data in with
   KC.store.importAll (adds, never deletes; repeating it adds nothing twice).
   The #part never reaches any server. Links are packed compactly: answers with the share-link
   codec, item sets as bitmaps (~20 KB for a heavy user).
   ROLE is the only difference between the two builds. */
(function (KC) {
  const ROLE = "receiver";               // "sender" = old site build, "receiver" = new site build, "" = off
  const NEW_URL = "https://klevatess.github.io/kinkmatch/";
  const TAG = "kcmigrate=";              // index.html#kcmigrate=<payload>
  const APP = "kinkcheck-move";

  /* base64url of UTF-8 text (no "_" in links: "-" and "." like the share links) */
  const b64enc = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, ".").replace(/=+$/, "");
  const b64dec = s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/\./g, "/"))));

  /* a list (state) with answers and favourites packed by the codec; everything else as is */
  function packState(st) {
    if (!st || typeof st !== "object") return st;
    const o = Object.assign({}, st);
    o.items = KC.codec.packAnswers(st.items || {});
    if (Array.isArray(st.fav)) o.fav = st.fav.length ? KC.codec.packSet(st.fav) : "";
    o._p = 1;
    return o;
  }
  function unpackState(o) {
    if (!o || typeof o !== "object" || !o._p) return o;
    const st = Object.assign({}, o); delete st._p;
    st.items = typeof o.items === "string" && o.items ? KC.codec.unpackAnswers(o.items) : {};
    if (typeof o.fav === "string") st.fav = o.fav ? KC.codec.unpackSet(o.fav) : [];
    return st;
  }
  const packIds = ids => (Array.isArray(ids) && ids.length ? KC.codec.packSet(ids) : "");
  const unpackIds = s => (typeof s === "string" && s ? KC.codec.unpackSet(s) : []);

  /* everything on this device -> payload text */
  function pack(extra) {
    const b = KC.store.exportAll();
    b.own = packState(b.own);
    b.mine = b.mine.map(x => Object.assign({}, x, { data: packState(x.data) }));
    b.templates = b.templates.map(x => Object.assign({}, x, { ids: packIds(x.ids), _p: 1 }));
    const fv = {}; Object.keys(b.favs || {}).forEach(k => { fv[k] = packIds(b.favs[k]); }); b.favs = fv; b._pf = 1;
    const body = JSON.stringify(b);
    return b64enc(JSON.stringify(Object.assign({ app: APP, v: 1, sum: KC.codecSum(body, 8), b: body }, extra || {})));
  }
  /* payload text -> {backup, lang, theme} or null when it is damaged / not ours */
  function unpack(text) {
    try {
      const o = JSON.parse(b64dec(String(text || "")));
      if (!o || o.app !== APP || typeof o.b !== "string" || KC.codecSum(o.b, 8) !== o.sum) return null;
      const b = JSON.parse(o.b);
      if (!b || b.app !== "kinkcheck") return null;
      b.own = unpackState(b.own);
      b.mine = (Array.isArray(b.mine) ? b.mine : []).map(x => (x && typeof x === "object" ? Object.assign({}, x, { data: unpackState(x.data) }) : x));
      b.templates = (Array.isArray(b.templates) ? b.templates : []).map(x => {
        if (!x || !x._p) return x;
        const r = Object.assign({}, x, { ids: unpackIds(x.ids) }); delete r._p; return r;
      });
      if (b._pf && b.favs && typeof b.favs === "object") { const fv = {}; Object.keys(b.favs).forEach(k => { fv[k] = unpackIds(b.favs[k]); }); b.favs = fv; }
      delete b._pf;
      return { backup: b, lang: typeof o.lang === "string" ? o.lang : "", theme: o.theme === "dark" || o.theme === "light" ? o.theme : "" };
    } catch (e) { return null; }
  }
  /* what a backup holds, for the question before moving */
  function counts(b) {
    const n = a => (Array.isArray(a) ? a.length : 0);
    return { mine: n(b.mine), rec: n(b.received), tpl: n(b.templates), cmp: n(b.compares) };
  }
  const isNewSite = () => location.href.indexOf(NEW_URL) === 0;

  KC.migrate = {
    ROLE, NEW_URL, TAG, pack, unpack, counts,
    /* the old build shows the button (never on the new address itself) */
    sender: () => ROLE === "sender" && !isNewSite(),
    receiver: () => ROLE === "receiver",
    /* full link to the new site carrying everything from this device */
    link() {
      const lang = KC.i18n.lang, theme = KC.ls.raw(KC.KEYS.theme) || "";
      return NEW_URL + "index.html?lang=" + lang + "#" + TAG + pack({ lang, theme });
    },
    /* payload from the current address (#kcmigrate=…) or null */
    fromHash(hash) { const h = String(hash || "").replace(/^#/, ""); return h.indexOf(TAG) === 0 ? h.slice(TAG.length) : null; },
  };
})(window.KC);
