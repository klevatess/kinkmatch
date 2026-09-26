/* core/codec.js — the share link. State <-> "#a=...&n=...&m=...&lg=..".

   Params:  a = answers (binary, base64url)   m = profile ("About me")
            n = name   s/f/c/l = safeword/fantasies/comments/allergies (free text, not in UI now)
            lg = language the link opens in   i = 6-char id of the list (tells apart copies with equal content)
            ti = 6-char template id, tn = template name: a TEMPLATE link. Two kinds:
                 - without t: the template = the items answered in a, so the link carries both the template
                   and the sender's list filled by it;
                 - with t = set of item codes: an empty template, no answers (re-shared from a template list).
            fi / fn = id / name of the template a LIST was filled by (a plain list link, not a template).
   Sets of items (t) use their own tags: 5 = sparse varint(gap), 6 = varint(N) + presence bitmap.
   Answers use PERMANENT item codes from data/practices.js, so adding/moving items never
   breaks old links. Two encodings are built and the shorter one is used (leading tag byte):
     2 = sparse: varint(gap*4 + value)                 — best for few marks
     4 = dense : varint(N) + presence bitmap + 2 bits per marked item — best for many marks
   Read-only legacy tags: 1 = old 6-bit positional, 3 = dense without N (N was 371). */
(function (KC) {
  const IV = { limit: 1, maybe: 2, yes: 3, love: 4 }, IREV = [null, "limit", "maybe", "yes", "love"];
  const LEGACY_N = 371;
  let byCode = null, codeOf = null;
  function maps() {
    if (byCode) return;
    byCode = []; codeOf = {};
    KC.CATS.forEach(c => c.items.forEach(([code, id]) => { byCode[code] = id; codeOf[id] = code; }));
  }

  /* base64 with "-" and "." (older links used "_", still accepted). No "_": chat apps treat "__" as
     markdown and silently delete it, which corrupts the link. */
  function b64(bytes) { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, ".").replace(/=+$/, ""); }
  function unb64(s) {
    s = s.replace(/-/g, "+").replace(/[_.]/g, "/");
    if (s.length % 4 === 1) throw new Error("bad length");
    while (s.length % 4) s += "="; const bin = atob(s), out = []; for (let i = 0; i < bin.length; i++) out.push(bin.charCodeAt(i)); return out;
  }
  /* 3-char checksum of the data part of a link (older links may carry a 2-char one) */
  function sum(str, len) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0; len = len || 3; return (h % Math.pow(36, len)).toString(36).padStart(len, "0"); }
  /* structural check: does the answers blob hang together? */
  function answersIntact(str) {
    maps();
    let bytes; try { bytes = unb64(str); } catch (e) { return false; }
    if (!bytes.length) return true;
    /* the encoder always writes canonical base64: re-encoding must give the same text */
    if (b64(bytes) !== str.replace(/_/g, ".")) return false;
    const tag = bytes[0];
    if (tag === 3 || tag === 4) {
      const pos = { i: 1 }; const N = tag === 4 ? readVarint(bytes, pos) : LEGACY_N;
      if (tag === 4 && (N < 1 || N > 4096)) return false;
      const bmLen = Math.ceil(N / 8); if (bytes.length < pos.i + bmLen) return false;
      let marks = 0; for (let k = 0; k < bmLen; k++) { let b = bytes[pos.i + k]; while (b) { marks += b & 1; b >>= 1; } }
      if (N % 8 && (bytes[pos.i + bmLen - 1] >> (N % 8))) return false;            /* bits past N are always 0 */
      if (bytes.length - pos.i - bmLen !== Math.ceil(marks / 4)) return false;
      if (marks % 4 && (bytes[bytes.length - 1] & ((1 << (8 - 2 * (marks % 4))) - 1))) return false; /* value padding is 0 */
      return true;
    }
    if (tag === 2) {
      const pos = { i: 1 }; let code = -1;
      while (pos.i < bytes.length) {
        if (pos.i === bytes.length - 1 && bytes[pos.i] & 128) return false;       /* unfinished number */
        const n = readVarint(bytes, pos); code += (n >> 2) + 1; if (code >= Math.max(byCode.length, LEGACY_N)) return false;
      }
      return true;
    }
    return tag === 1;
  }
  function varint(n, out) { while (n >= 128) { out.push((n & 127) | 128); n >>>= 7; } out.push(n); }
  function readVarint(bytes, pos) { let n = 0, shift = 0, b; do { b = bytes[pos.i++]; n |= (b & 127) << shift; shift += 7; } while ((b & 128) && pos.i < bytes.length); return n; }

  function packAnswers(items) {
    maps();
    const N = byCode.length, marked = [];
    for (let c = 0; c < N; c++) { const id = byCode[c]; const s = id && items[id]; const v = s && IV[s.interest]; if (v) marked.push([c, v]); }
    const A = [2]; let prev = -1;
    marked.forEach(([c, v]) => { varint((c - prev - 1) * 4 + (v - 1), A); prev = c; });
    const B = [4]; varint(N, B);
    const bm = new Array(Math.ceil(N / 8)).fill(0);
    marked.forEach(([c]) => { bm[c >> 3] |= (1 << (c & 7)); });
    B.push.apply(B, bm);
    let cur = 0, nb = 0;
    marked.forEach(([, v]) => { cur = (cur << 2) | (v - 1); nb += 2; if (nb === 8) { B.push(cur & 255); cur = 0; nb = 0; } });
    if (nb > 0) B.push((cur << (8 - nb)) & 255);
    return b64(B.length < A.length ? B : A);
  }

  function unpackAnswers(str) {
    maps();
    let bytes; try { bytes = unb64(str); } catch (e) { return {}; }
    const items = {}; if (!bytes.length) return items;
    const put = (code, v) => { const id = byCode[code]; if (id && IREV[v]) items[id] = { interest: IREV[v] }; };
    const tag = bytes[0];
    if (tag === 2) {
      const pos = { i: 1 }; let code = -1;
      while (pos.i < bytes.length) { const n = readVarint(bytes, pos); code += (n >> 2) + 1; put(code, (n & 3) + 1); }
    } else if (tag === 3 || tag === 4) {
      const pos = { i: 1 }; const N = tag === 4 ? readVarint(bytes, pos) : LEGACY_N;
      const bm = pos.i, vals = bm + Math.ceil(N / 8); let bit = 0;
      for (let c = 0; c < N; c++) {
        if (!(bytes[bm + (c >> 3)] & (1 << (c & 7)))) continue;
        const v = (bytes[vals + (bit >> 3)] >> (6 - (bit & 7))) & 3; bit += 2; put(c, v + 1);
      }
    } else if (tag === 1) {
      const bits = []; for (let k = 1; k < bytes.length; k++) for (let j = 7; j >= 0; j--) bits.push((bytes[k] >> j) & 1);
      let p = 0;
      for (let c = 0; c < LEGACY_N; c++) { let v = 0; for (let b = 0; b < 6; b++) v = (v << 1) | (bits[p++] || 0); if (v & 7) put(c, v & 7); }
    }
    return items;
  }

  /* a set of item ids -> tag 5 (sparse gaps) or tag 6 (bitmap), shorter wins */
  function packSet(ids) {
    maps();
    const N = byCode.length, codes = [];
    ids.forEach(id => { const c = codeOf[id]; if (c != null && codes.indexOf(c) < 0) codes.push(c); });
    codes.sort((a, b) => a - b);
    const A = [5]; let prev = -1; codes.forEach(c => { varint(c - prev - 1, A); prev = c; });
    const B = [6]; varint(N, B); const bm = new Array(Math.ceil(N / 8)).fill(0);
    codes.forEach(c => { bm[c >> 3] |= (1 << (c & 7)); }); B.push.apply(B, bm);
    return b64(B.length < A.length ? B : A);
  }
  function unpackSet(str) {
    maps();
    let bytes; try { bytes = unb64(str); } catch (e) { return []; }
    const out = [], put = c => { const id = byCode[c]; if (id && out.indexOf(id) < 0) out.push(id); };
    if (bytes[0] === 5) { const pos = { i: 1 }; let c = -1; while (pos.i < bytes.length) { c += readVarint(bytes, pos) + 1; put(c); } }
    else if (bytes[0] === 6) { const pos = { i: 1 }, N = readVarint(bytes, pos); for (let c = 0; c < N; c++) if (bytes[pos.i + (c >> 3)] & (1 << (c & 7))) put(c); }
    return out;
  }
  function setIntact(str) {
    maps();
    let bytes; try { bytes = unb64(str); } catch (e) { return false; }
    if (bytes.length < 2 || b64(bytes) !== str) return false;
    if (bytes[0] === 5) {
      const pos = { i: 1 }; let c = -1;
      while (pos.i < bytes.length) { if (pos.i === bytes.length - 1 && bytes[pos.i] & 128) return false; c += readVarint(bytes, pos) + 1; if (c >= byCode.length) return false; }
      return true;
    }
    if (bytes[0] === 6) {
      const pos = { i: 1 }, N = readVarint(bytes, pos);
      if (N < 1 || N > 4096 || bytes.length !== pos.i + Math.ceil(N / 8)) return false;
      return !(N % 8 && (bytes[bytes.length - 1] >> (N % 8)));
    }
    return false;
  }

  function packMeta(meta) {
    meta = KC.normalizeMeta(meta); const bytes = [];
    KC.PROFILE.forEach(f => {
      const v = meta[f.id];
      if (f.type === "multi") { let mask = 0; (v || []).forEach(k => { const i = f.opts.indexOf(k); if (i >= 0) mask |= (1 << i); }); bytes.push(mask & 255); }
      else { const i = v ? f.opts.indexOf(v) : -1; bytes.push(i < 0 ? 0 : i + 1); }
    });
    while (bytes.length && bytes[bytes.length - 1] === 0) bytes.pop();
    return bytes.length ? b64(bytes) : "";
  }

  function unpackMeta(str) {
    if (!str) return {};
    if (str.indexOf("%") >= 0 || str.charAt(0) === "{") { try { return KC.normalizeMeta(JSON.parse(decodeURIComponent(str))); } catch (e) { return {}; } }
    let bytes; try { bytes = unb64(str); } catch (e) { return {}; }
    const meta = {};
    KC.PROFILE.forEach((f, i) => {
      const byte = bytes[i] || 0;
      if (f.hidden) return;
      if (f.type === "multi") { const arr = []; f.opts.forEach((o, bit) => { if (o && (byte & (1 << bit))) arr.push(o); }); if (arr.length) meta[f.id] = arr; }
      else if (byte > 0 && f.opts[byte - 1]) meta[f.id] = f.opts[byte - 1];
    });
    return meta;
  }

  const UID = /^[A-Za-z0-9_-]{6}$/, TID = /^[A-Za-z0-9]{6}$/;
  KC.codecSum = sum;
  const TEXT = { n: "name", s: "safeword", f: "fantasies", c: "comments", l: "allergies" };

  KC.codec = {
    packAnswers, unpackAnswers, packMeta, unpackMeta, packSet, unpackSet,
    /* state -> hash string (no leading #). lang: code of page language, or omit */
    encode(st, lang) {
      const parts = ["a=" + packAnswers(st.items || {})];
      Object.keys(TEXT).forEach(k => { const v = st[TEXT[k]]; if (v) parts.push(k + "=" + encodeURIComponent(v)); });
      const m = packMeta(st.meta); if (m) parts.push("m=" + m);
      if (st.uid && UID.test(st.uid)) parts.push("i=" + st.uid);
      let ts = "";
      if (st.tpl && TID.test(st.tpl.id || "")) {
        parts.push("ti=" + st.tpl.id); if (st.tpl.name) parts.push("tn=" + encodeURIComponent(st.tpl.name));
        if (Array.isArray(st.tpl.ids) && st.tpl.ids.length) { ts = packSet(st.tpl.ids); parts.push("t=" + ts); }
      } else if (st.by && TID.test(st.by.id || "")) {
        parts.push("fi=" + st.by.id); if (st.by.name) parts.push("fn=" + encodeURIComponent(st.by.name));
      }
      if (lang) parts.push("lg=" + lang);
      /* the checksum covers the template set too (links without t keep the old formula) */
      parts.push("k=" + sum(parts[0].slice(2) + "|" + (m || "") + "|" + (st.uid || "") + (ts ? "|" + ts : "")));
      return parts.join("&");
    },
    /* hash / full link / bare code -> state (+ .lang, null if absent or unknown) */
    decode(text) {
      let h = KC.codec.extract(text);
      const q = new URLSearchParams(h);
      const st = { items: {}, meta: {}, name: "", safeword: "", fantasies: "", comments: "", allergies: "", lang: null };
      if (q.get("a")) st.items = unpackAnswers(q.get("a"));
      Object.keys(TEXT).forEach(k => { st[TEXT[k]] = q.get(k) || ""; });
      if (q.get("m")) st.meta = unpackMeta(q.get("m"));
      const lg = q.get("lg"); if (lg && KC.i18n && KC.i18n.known(lg)) st.lang = lg;
      const i = q.get("i"); if (i && UID.test(i)) st.uid = i;
      const ti = q.get("ti"), ts = q.get("t") || "";
      if (ti && TID.test(ti)) { st.tpl = { id: ti, name: q.get("tn") || "" }; if (ts) st.tpl.ids = unpackSet(ts); }
      else { const fi = q.get("fi"); if (fi && TID.test(fi)) st.by = { id: fi, name: q.get("fn") || "" }; }
      /* damaged link (e.g. a chat app removed characters): answers would be wrong */
      const a = q.get("a") || "", k = q.get("k");
      st.damaged = !answersIntact(a) || (!!ts && !setIntact(ts))
        || (!!k && k !== sum(a + "|" + (q.get("m") || "") + "|" + (q.get("i") || "") + (ts ? "|" + ts : ""), k.length));
      return st;
    },
    /* accept a full URL, "#..." or a bare code */
    extract(text) { text = (text || "").trim(); const i = text.indexOf("#"); return (i >= 0 ? text.slice(i + 1) : text).replace(/^#/, ""); },
    /* identity of a list by CONTENT: decode, then re-encode with the current encoder and no language.
       Links made by older versions (other answer formats, old fields) map to the same key. */
    key(text) {
      const st = KC.codec.decode(text);
      /* nothing recognisable inside: never treat two such codes as the same list */
      if (!Object.keys(st.items).length && !Object.keys(st.meta).length && !st.name && !st.uid && !st.tpl) return "raw:" + KC.codec.extract(text);
      return KC.codec.encode(st);
    },
  };
})(window.KC);
