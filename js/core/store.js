/* core/store.js — everything kept in this browser: own list, "My lists", "Received", templates, favourites.
   State shape: { name, meta:{field:key|[keys]}, items:{id:{interest}}, onlyMarked,
                  safeword, fantasies, comments, allergies,
                  fav?:[ids]                       favourites (♥) of this list, device only, never in links
                  template?:{id, name}             template this list was CREATED by (a reference by template id).
                                                   Opening the list applies that template while it exists in the
                                                   device's templates; if it was deleted, the list still says so
                                                   but opens with all items. } */
(function (KC) {
  const VALID = { limit: 1, maybe: 1, yes: 1, love: 1 };
  const TID = /^[A-Za-z0-9]{6}$/;
  /* id of a saved entry: time + random part, so two entries made in the same millisecond never share an id */
  /* a stored list: always an array of objects, whatever is in storage (damaged data never breaks a page) */
  const arr = k => { const a = KC.ls.get(k, []); return Array.isArray(a) ? a.filter(x => x && typeof x === "object" && !Array.isArray(x)) : []; };
  const recArr = () => arr(KC.KEYS.saved).filter(x => typeof x.code === "string");
  const newEntryId = p => p + Date.now() + Math.floor(Math.random() * 46656).toString(36);

  const S = KC.store = {
    newEntryId,
    /* 6 random url-safe characters: the list's own id inside links */
    newUid() {
      /* letters and digits only: "_" and "-" can be eaten by chat apps */
      const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", b = new Uint8Array(6);
      (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => b[i] = Math.random() * 256);
      return Array.from(b, x => A[x % 62]).join("");
    },
    blank() { return { name: "", meta: {}, items: {}, onlyMarked: true, safeword: "", fantasies: "", comments: "", allergies: "" }; },

    /* clean anything (old versions, decoded links) into the current shape */
    normalize(src) {
      const st = S.blank(); src = src && typeof src === "object" ? src : {};
      ["name", "safeword", "fantasies", "comments", "allergies"].forEach(k => { if (typeof src[k] === "string") st[k] = src[k]; });
      if (src.onlyMarked === false) st.onlyMarked = false;
      if (typeof src.uid === "string" && /^[A-Za-z0-9_-]{6}$/.test(src.uid)) st.uid = src.uid;
      st.meta = KC.normalizeMeta(src.meta);
      const items = src.items || {}, AL = KC.ID_ALIASES || {};
      Object.keys(items).forEach(id => { const v = items[id] && items[id].interest; if (VALID[v] && !AL[id]) st.items[id] = { interest: v }; });
      /* answers saved under ids of the earliest versions go to the current item (current answer wins) */
      Object.keys(items).forEach(id => { const v = items[id] && items[id].interest; const to = AL[id]; if (to && VALID[v] && !st.items[to]) st.items[to] = { interest: v }; });
      /* favourites and the template are kept only when present, so older states stay unchanged */
      if (Array.isArray(src.fav)) { const f = S.cleanIds(src.fav); if (f.length) st.fav = f; }
      const tp = S.cleanTpl(src.template); if (tp) st.template = tp;
      return st;
    },
    /* list of item ids: strings only, no duplicates, earliest ids mapped to current ones */
    cleanIds(a) {
      const AL = KC.ID_ALIASES || {}, out = [];
      (Array.isArray(a) ? a : []).forEach(id => { if (typeof id !== "string" || !id) return; id = AL[id] || id; if (out.indexOf(id) < 0) out.push(id); });
      return out;
    },
    cleanTpl(t) {
      if (!t || typeof t !== "object" || !TID.test(t.id || "")) return null;
      /* lists saved by v552–553 also kept a copy of the items (ids): no longer used */
      return { id: t.id, name: typeof t.name === "string" ? t.name : "" };
    },
    /* the list with only the answers inside a template (ids) */
    trim(st, ids) {
      const out = S.clone(st), set = {}; ids.forEach(id => { set[id] = 1; });
      out.items = {}; Object.keys(st.items || {}).forEach(id => { if (set[id]) out.items[id] = st.items[id]; });
      return out;
    },
    /* what leaves the device for compare: a list created by a template gives only the template's answers
       (as it opens by default); with the template deleted, the whole list */
    forShare(st) { const x = st && st.template && S.tpl.byTid(st.template.id); return x ? S.trim(st, x.ids) : st; },
    /* answered items in list order, optionally only those inside ids -> contents of a new template */
    answeredIds(st, ids) {
      const set = ids ? {} : null; if (ids) ids.forEach(id => { set[id] = 1; });
      const out = []; KC.CATS.forEach(c => c.items.forEach(([, id]) => { if (st.items[id] && st.items[id].interest && (!set || set[id])) out.push(id); }));
      return out;
    },
    clone: st => JSON.parse(JSON.stringify(st)),
    /* nothing filled in at all */
    isEmpty: st => !st.name && !Object.keys(st.items).length && !Object.keys(st.meta).length && !st.safeword && !st.fantasies && !st.comments && !st.allergies
      && !(st.fav && st.fav.length) && !st.template,

    /* own current list */
    loadOwn()   { return S.normalize(KC.ls.get(KC.KEYS.state, null)); },
    hasOwn()    { return KC.ls.raw(KC.KEYS.state) != null; },
    writeOwn(st){ KC.ls.set(KC.KEYS.state, st); },
    clearOwn()  { KC.ls.del(KC.KEYS.state); },
    ownCode()   { return S.hasOwn() ? KC.codec.encode(S.forShare(S.loadOwn())) : ""; },

    /* received lists: [{id, name, code, ts}] */
    received: {
      /* also merges duplicates left by older versions: keeps the earliest entry,
         taking a custom name from a duplicate if the kept one has none */
      list() {
        const a = recArr();
        const byKey = {}, out = [];
        a.slice().sort((x, y) => (x.ts || 0) - (y.ts || 0)).forEach(x => {
          if (x.manual) { out.push(x); return; } /* saved on purpose via "Save as": never merged */
          let k; try { k = KC.codec.key(x.code); } catch (e) { k = x.code; }
          const first = byKey[k];
          if (!first) { byKey[k] = x; out.push(x); }
          else if (!first.name && x.name) first.name = x.name;
        });
        if (out.length !== a.length) {
          const keep = a.filter(x => out.indexOf(x) >= 0); // original order (newest first)
          this.write(keep); return keep;
        }
        return a;
      },
      write(a) { KC.ls.set(KC.KEYS.saved, a); },
      /* -> {status: "added" | "exists" (moved to top) | "updated" (newer version of the same list) | "own", item} */
      add(code, name) {
        if (!code) return { status: "none" };
        const k = KC.codec.key(code), uid = KC.codec.decode(code).uid;
        const mine = S.mine.list(), own = S.hasOwn() ? S.loadOwn() : null;
        if (uid && ((own && own.uid === uid) || mine.some(x => x.data && x.data.uid === uid))) return { status: "own" };
        const mineKeys = mine.map(x => { try { return KC.codec.key(KC.codec.encode(S.normalize(x.data))); } catch (e) { return ""; } });
        if ((own && k === KC.codec.key(KC.codec.encode(own))) || mineKeys.indexOf(k) >= 0) return { status: "own" };
        const a = this.list(); let i = a.findIndex(x => !x.manual && KC.codec.key(x.code) === k);
        if (i >= 0) { const item = a.splice(i, 1)[0]; item.ts = Date.now(); a.unshift(item); this.write(a); return { status: "exists", item }; }
        if (uid) {
          i = a.findIndex(x => !x.manual && KC.codec.decode(x.code).uid === uid);
          if (i >= 0) { const item = a.splice(i, 1)[0]; item.code = code; item.ts = Date.now(); a.unshift(item); this.write(a); return { status: "updated", item }; }
        }
        const item = { id: newEntryId("p"), name: (name || "").trim(), code, ts: Date.now() };
        a.unshift(item); if (a.length > 60) a.length = 60; this.write(a);
        return { status: "added", item };
      },
      /* opening a Received entry: entries saved by v552–553 from template links still carry the template
       (ti=); open them as a list filled by it (fi=), so they never start the "template link" flow again */
    asListCode(code) {
      const d = KC.codec.decode(code); if (!d.tpl || d.damaged) return code;
      const st = S.normalize(d); st.by = { id: d.tpl.id, name: d.tpl.name };
      return KC.codec.encode(st, d.lang);
    },
    /* "Save as…": always a new entry with the given name, even if the same content exists */
      saveAs(code, name) {
        const a = this.list();
        const item = { id: newEntryId("p"), name: (name || "").trim(), code, ts: Date.now(), manual: true };
        a.unshift(item); if (a.length > 60) a.length = 60; this.write(a);
        return item;
      },
    },

    /* backup of everything on this device -> plain object (saved as a .json file) */
    exportAll() {
      return { app: "kinkcheck", v: 1, ts: Date.now(), own: KC.ls.get(KC.KEYS.state, null), active: S.mine.active(),
        mine: S.mine.list(), received: recArr(), templates: S.tpl.list(), favs: S.favs.all(), compares: S.cmp.list() };
    },
    /* merge a backup in: adds lists that are not here yet (by id), never deletes anything.
       -> {mine: added, received: added, templates: added} or null if it is not a backup.
       Backups made before templates/favourites existed simply lack those fields. */
    importAll(b, opts) {
      if (!b || b.app !== "kinkcheck" || !Array.isArray(b.mine) || !Array.isArray(b.received)) return null;
      /* newer: moving from the old site — an entry already here under the same id is replaced when the incoming
         one is newer (edited on the old site after an earlier move). A backup restore only adds. */
      const newer = !!(opts && opts.newer), fresher = (x, y) => newer && (x.ts || 0) > (y.ts || 0);
      const mine = S.mine.list(), rec = recArr();
      const mIds = {}, rIds = {}; mine.forEach(x => mIds[x.id] = x); rec.forEach(x => rIds[x.id] = x);
      let am = 0, ar = 0;
      b.mine.forEach(x => {
        if (!x || !x.id || !x.data || typeof x.data !== "object") return;
        const cur = mIds[x.id];
        if (!cur) { mine.push({ id: x.id, name: x.name || "", data: S.normalize(x.data), ts: x.ts || Date.now() }); am++; return; }
        if (fresher(x, cur)) {
          cur.name = x.name || ""; cur.data = S.normalize(x.data); cur.ts = x.ts; am++;
          if (cur.id === S.mine.active()) S.writeOwn(S.clone(cur.data));   /* the open list mirrors its entry */
        }
      });
      b.received.forEach(x => {
        if (!x || !x.id || typeof x.code !== "string") return;
        const cur = rIds[x.id];
        if (!cur) { rec.push(x); ar++; } else if (fresher(x, cur)) { Object.assign(cur, x); ar++; }
      });
      mine.sort((x, y) => (y.ts || 0) - (x.ts || 0)); rec.sort((x, y) => (y.ts || 0) - (x.ts || 0));
      S.mine.write(mine); KC.ls.set(KC.KEYS.saved, rec);
      /* templates: new ones by entry id (a template already here under the same id stays as it is) */
      let at = 0;
      if (Array.isArray(b.templates)) {
        const tl = S.tpl.list(), tIds = {}; tl.forEach(x => { tIds[x.id] = x; });
        b.templates.forEach(x => {
          const cur = x && tIds[x.id];
          if (cur && cur.tid === x.tid && fresher(x, cur)) {
            const ids = S.cleanIds(x.ids); if (!ids.length) return;
            cur.name = typeof x.name === "string" ? x.name : cur.name; cur.ids = ids; cur.ts = x.ts;
            if (typeof x.label === "string" && x.label) cur.label = x.label; else delete cur.label;
            at++; return;
          }
          /* skip a template already here under the same template id, mine or received (one copy per template) */
          if (!x || !x.id || !TID.test(x.tid || "") || tIds[x.id] || tl.some(y => y.tid === x.tid)) return;
          const ids = S.cleanIds(x.ids); if (!ids.length) return;
          const it = { id: x.id, tid: x.tid, name: typeof x.name === "string" ? x.name : "", ids, own: !!x.own, ts: x.ts || Date.now() };
          if (typeof x.label === "string" && x.label) it.label = x.label;
          tl.push(it); at++;
        });
        tl.sort((x, y) => (y.ts || 0) - (x.ts || 0)); S.tpl.write(tl);
      }
      /* favourites of received lists: union per list */
      if (b.favs && typeof b.favs === "object" && !Array.isArray(b.favs)) {
        const o = S.favs.all();
        Object.keys(b.favs).forEach(k => { const add = S.cleanIds(b.favs[k]); if (!add.length) return; const cur = Array.isArray(o[k]) ? o[k] : []; o[k] = cur.concat(add.filter(id => cur.indexOf(id) < 0)); });
        KC.ls.set(KC.KEYS.fav, o);
      }
      /* saved comparisons: new ones by entry id */
      let ac = 0;
      if (Array.isArray(b.compares)) {
        const cl = S.cmp.list(), cIds = {}; cl.forEach(x => { cIds[x.id] = x; });
        b.compares.forEach(x => {
          if (!x || !x.id || !Array.isArray(x.parts)) return;
          const parts = x.parts.filter(p => p && typeof p.code === "string").map(p => ({ name: typeof p.name === "string" ? p.name : "", uid: typeof p.uid === "string" ? p.uid : "", code: p.code }));
          if (parts.length < S.cmp.MIN) return;
          const cur = cIds[x.id];
          if (cur) { if (fresher(x, cur)) { cur.name = typeof x.name === "string" ? x.name : ""; cur.parts = parts; cur.ts = x.ts; ac++; } return; }
          cl.push({ id: x.id, name: typeof x.name === "string" ? x.name : "", parts, ts: x.ts || Date.now() }); ac++;
        });
        cl.sort((x, y) => (y.ts || 0) - (x.ts || 0)); S.cmp.write(cl);
      }
      /* nothing filled in here yet: take the backup's current list as well */
      if (S.isEmpty(S.loadOwn()) && b.own) { S.writeOwn(S.normalize(b.own)); if (b.active) S.mine.setActive(b.active); }
      return { mine: am, received: ar, templates: at, compares: ac };
    },

    /* my lists: [{id, name, data:state, ts}] — full copies, nothing lost.
       The own list is auto-saved into the "active" entry (KC.KEYS.active):
         key absent = never set (older version) | "" = new list not saved yet | id */
    mine: {
      list()   { return arr(KC.KEYS.mine); },
      write(a) { KC.ls.set(KC.KEYS.mine, a); },
      active()      { return KC.ls.raw(KC.KEYS.active); },
      setActive(id) { KC.ls.setRaw(KC.KEYS.active, id || ""); },
      /* copy st into the active entry, creating it if needed */
      sync(st) {
        const a = this.list(); let id = this.active(); let item = id && a.find(x => x.id === id);
        if (!item) { id = newEntryId("m"); item = { id, name: "", data: null, ts: 0 }; a.unshift(item); this.setActive(id); }
        item.data = S.clone(st); item.ts = Date.now(); this.write(a); return id;
      },
      /* display name: own label, else the name inside the list */
      label(x) { return x.name || (x.data && x.data.name) || ""; },
      /* newest list created by template tid */
      byTpl(tid) { return this.list().find(x => x.data && x.data.template && x.data.template.id === tid) || null; },
    },

    /* templates: [{id, tid, name, label?, ids:[item ids], own, ts}]
       tid  = 6-char template id carried in links (ti=), so a newer version replaces the old copy
       own  = true: "My lists → My templates"; false: "Received → Templates"
       name = the name in the link; label = recipient's own name for a received template */
    tpl: {
      list()     { const a = KC.ls.get(KC.KEYS.tpl, []); return Array.isArray(a) ? a.filter(x => x && TID.test(x.tid || "") && Array.isArray(x.ids)) : []; },
      write(a)   { KC.ls.set(KC.KEYS.tpl, a); },
      own()      { return this.list().filter(x => x.own); },
      received() { return this.list().filter(x => !x.own); },
      label(x)   { return (x && (x.label || x.name)) || ""; },
      byTid(tid) { const a = this.list(); return a.find(x => x.own && x.tid === tid) || a.find(x => x.tid === tid) || null; },
      /* the template to apply for a reference {id, name} (a list's template): {id, name, ids} or null when
         it is not among the device's templates (deleted, or never received here) */
      resolve(ref) { const x = ref && this.byTid(ref.id); return x ? this.use(x) : null; },
      /* an entry as an applied template */
      use(x) { return { id: x.tid, name: this.label(x), ids: x.ids.slice() }; },
      /* id of a template made from a list: my template with the same name, else derived from list id + name,
         so sharing the same name from the same list again updates the recipient's copy */
      tidFor(uid, name) {
        const nm = (name || "").trim().toLowerCase(), mine = this.own().find(x => (x.name || "").trim().toLowerCase() === nm);
        return mine ? mine.tid : KC.codecSum((uid || "") + "|" + nm, 6);
      },
      /* "Save as my template": the same name (or id) updates that template -> {status: added|updated, item} */
      saveOwn(name, ids, tid) {
        const a = this.list(), nm = (name || "").trim(), low = nm.toLowerCase();
        const i = a.findIndex(x => x.own && (x.tid === tid || (x.name || "").trim().toLowerCase() === low));
        if (i >= 0) { const it = a.splice(i, 1)[0]; it.name = nm; it.ids = ids.slice(); it.ts = Date.now(); a.unshift(it); this.write(a); return { status: "updated", item: it }; }
        const item = { id: newEntryId("t"), tid, name: nm, ids: ids.slice(), own: true, ts: Date.now() };
        a.unshift(item); this.write(a); return { status: "added", item };
      },
      /* template opened from a link -> {status: added | exists | updated | own | none, item} */
      addReceived(tid, name, ids) {
        if (!TID.test(tid || "") || !ids.length) return { status: "none" };
        const a = this.list(), mine = a.find(x => x.own && x.tid === tid);
        if (mine) return { status: "own", item: mine };
        const i = a.findIndex(x => !x.own && x.tid === tid);
        if (i >= 0) {
          const it = a.splice(i, 1)[0], same = it.name === name && it.ids.length === ids.length && ids.every(id => it.ids.indexOf(id) >= 0);
          it.name = name; it.ids = ids.slice(); it.ts = Date.now(); a.unshift(it); this.write(a);
          return { status: same ? "exists" : "updated", item: it };
        }
        const item = { id: newEntryId("t"), tid, name, ids: ids.slice(), own: false, ts: Date.now() };
        a.unshift(item); if (a.length > 60) a.length = 60; this.write(a); return { status: "added", item };
      },
    },

    /* saved comparisons (3+ people): [{id, name, ts, parts: [{name, uid, code}]}]
       A part points at a list by its list id (uid), so opening the comparison takes the newest version
       on this device: my current list, "My lists", then "Received" (a newer link from the same person
       replaces the old one there). code = the version last seen, used when the list is gone from the device;
       name = the name typed on the compare page ("" = the name inside the list). */
    cmp: {
      MIN: 3,
      list()   { const a = KC.ls.get(KC.KEYS.cmp, []); return Array.isArray(a) ? a.filter(x => x && x.id && Array.isArray(x.parts)) : []; },
      write(a) { KC.ls.set(KC.KEYS.cmp, a); },
      byId(id) { return this.list().find(x => x.id === id) || null; },
      /* newest code of list uid on this device, or "" */
      fresh(uid) {
        if (!uid) return "";
        if (S.hasOwn()) { const o = S.loadOwn(); if (o.uid === uid && !S.isEmpty(o)) return KC.codec.encode(S.forShare(o)); }
        const m = S.mine.list().find(x => x.data && x.data.uid === uid);
        if (m) return KC.codec.encode(S.forShare(S.normalize(m.data)));
        const rl = S.received.list(), is = x => { try { return KC.codec.decode(x.code).uid === uid; } catch (e) { return false; } };
        const r = rl.find(x => !x.manual && is(x)) || rl.find(is); /* "Save as" copies are snapshots: the link entry first */
        return r ? r.code : "";
      },
      /* entry -> [{name, code, uid, state: "same"|"updated"|"gone"}]; remembers the fresh versions */
      resolve(id) {
        const a = this.list(), e = a.find(x => x.id === id); if (!e) return null;
        const out = e.parts.map(p => {
          const f = this.fresh(p.uid);
          const state = !p.uid ? "same" : !f ? "gone" : f === p.code ? "same" : "updated";
          if (f) p.code = f;
          return { name: p.name || "", code: p.code || "", uid: p.uid || "", state };
        });
        this.write(a);
        return out;
      },
      /* parts: [{name, code}] -> {status: added|updated, item}; the same name updates that comparison */
      save(name, parts, id) {
        const a = this.list(), nm = (name || "").trim();
        const ps = parts.map(p => ({ name: (p.name || "").trim(), uid: (KC.codec.decode(p.code).uid || ""), code: p.code }));
        const i = a.findIndex(x => (id && x.id === id && (x.name || "") === nm) || (nm && (x.name || "").trim().toLowerCase() === nm.toLowerCase()));
        if (i >= 0) { const it = a.splice(i, 1)[0]; it.name = nm; it.parts = ps; it.ts = Date.now(); a.unshift(it); this.write(a); return { status: "updated", item: it }; }
        const item = { id: newEntryId("c"), name: nm, parts: ps, ts: Date.now() };
        a.unshift(item); this.write(a); return { status: "added", item };
      },
      label(x) { return (x && x.name) || (x ? x.parts.map(p => p.name || KC.codec.decode(p.code).name || "?").join(", ") : ""); },
    },

    /* favourites (♥) of lists opened from links, by list: {"u:<list id>" | "k:<content key>": [ids]}.
       Own lists keep theirs inside the list (state.fav). */
    favs: {
      all()      { const o = KC.ls.get(KC.KEYS.fav, {}); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; },
      get(key)   { const v = this.all()[key]; return Array.isArray(v) ? v.slice() : []; },
      set(key, ids) { const o = this.all(); if (ids.length) o[key] = ids.slice(); else delete o[key]; KC.ls.set(KC.KEYS.fav, o); },
      keyOf(code) { const d = KC.codec.decode(code); return d.uid ? "u:" + d.uid : "k:" + KC.codec.key(code); },
    },
  };
})(window.KC);
