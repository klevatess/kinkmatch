/* src/interests.js — «Интересы» (owner, 2026-10-28): hobbies and fandoms from a fixed catalog.
   The catalog itself (names, search words, sections) is a static file the app loads: public/app/interests/catalog.json.
   Here: which ids exist (src/interests_catalog.js + items the owner added), the limits, saving a person's picks, and
   suggestions of new items with their checks.

   Rules (owner, 2026-10-28):
   - at most 20 hobbies («Досуг») and 60 fandoms; optional;
   - suggesting needs ≥ 3 picked interests and ≥ 350 checklist answers; at most 3 suggestions waiting at a time;
   - every suggestion goes through src/suggest_filter.js; a refused one is answered exactly like an accepted one
     (status «на проверке», a day later «не добавлено»), the owner sees only the reason and may silently stop the
     person from suggesting (users.suggest_blocked — then every new suggestion is treated the same way, unseen). */

import { SECTIONS, RANGES, MAX_ID } from "./interests_catalog.js";
import { checkText, NAME_MAX, ALT_MAX } from "./suggest_filter.js";
import * as db from "./db.js";
import { send, esc } from "./tg.js";
import { t } from "./i18n.js";

export const LIMITS = { leisure: 20, fandoms: 60 };
export const SUGGEST_NEED_INTERESTS = 3, SUGGEST_NEED_ANSWERS = 350, SUGGEST_SLOTS = 3;
export const EXTRA_FROM = 100000;          // items added by the owner never clash with the static catalog
export const FILTERED_SHOWN_FOR = 86400;   // a refused suggestion looks «на проверке» for a day, then «не добавлено»

const SEC = new Map(SECTIONS.map(([id, tab]) => [id, { tab }]));
/** the section of a static catalog id, or null (binary search over the sorted id ranges) */
function staticSection(id) {
  if (!(id >= 1 && id <= MAX_ID)) return null;
  let lo = 0, hi = RANGES.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1, [a, b, sid] = RANGES[m];
    if (id < a) hi = m - 1; else if (id > b) lo = m + 1; else return sid;
  }
  return null;
}
export const tabOfSection = sid => (SEC.get(sid) || {}).tab || null;

/** a stored array (or null) → a clean array of positive integers */
export function parse(v) {
  try { const a = JSON.parse(v || "[]"); return Array.isArray(a) ? a.filter(x => Number.isSafeInteger(x) && x > 0) : []; } catch (e) { return []; }
}

async function extraSections(env, ids) {
  const want = ids.filter(x => x >= EXTRA_FROM);
  if (!want.length) return new Map();
  const r = await env.DB.prepare("SELECT id, section FROM interest_extra WHERE id IN (SELECT value FROM json_each(?1))").bind(JSON.stringify(want)).all();
  return new Map((r.results || []).map(x => [x.id, x.section]));
}

/** both groups of a profile row → one array (the hidden ones after the open ones) */
export const allOf = p => p ? [...new Set([...parse(p.interests), ...parse(p.interests_hidden)])] : [];

/** POST /api/interests { items: [id, …], hidden: [id, …] } — the whole set of the person's picks: open and hidden.
    The limits are per tab for both groups together; an item is in one group only (hidden wins if sent in both).
    -> { ok } | { error, tab?, max? } */
export async function save(env, id, items, hiddenIn) {
  const hid = hiddenIn == null ? [] : hiddenIn;
  if (!Array.isArray(items) || !Array.isArray(hid) || items.length + hid.length > LIMITS.leisure + LIMITS.fandoms) return { error: "bad_items" };
  const hidden = [...new Set(hid.map(Number))];
  const open = [...new Set(items.map(Number))].filter(x => !hidden.includes(x));
  const ids = [...open, ...hidden];
  if (ids.some(x => !Number.isSafeInteger(x) || x <= 0)) return { error: "bad_items" };
  const ex = await extraSections(env, ids);
  const count = { leisure: 0, fandoms: 0 };
  for (const x of ids) {
    const sid = x >= EXTRA_FROM ? ex.get(x) : staticSection(x);
    const tab = sid ? tabOfSection(sid) : null;
    if (!tab) return { error: "bad_items" };
    if (++count[tab] > LIMITS[tab]) return { error: "too_many", tab, max: LIMITS[tab] };
  }
  const r = await env.DB.prepare("UPDATE profiles SET interests = ?2, interests_hidden = ?3 WHERE tg_id = ?1")
    .bind(id, open.length ? JSON.stringify(open) : null, hidden.length ? JSON.stringify(hidden) : null).run();
  if (!r.meta || !r.meta.changes) return { error: "no_profile" };
  return { ok: true };
}

/** What the app needs besides the static file: items the owner added, extra search words, the person's suggestions. */
export async function state(env, id) {
  const ex = await env.DB.prepare("SELECT id, section, name, alt FROM interest_extra ORDER BY id").all();
  const syn = await env.DB.prepare("SELECT id, item, text FROM interest_syn ORDER BY id").all();
  const nm = await env.DB.prepare("SELECT item, name FROM interest_names").all();
  return {
    ok: true, limits: LIMITS,
    extra: (ex.results || []).map(x => [x.id, x.section, x.name, x.alt || ""]),
    syn: (syn.results || []).map(x => [x.item, x.text, x.id]),   // [item, search word, row id (the owner may delete it)]
    names: (nm.results || []).map(x => [x.item, x.name]),        // owner, 2026-10-28: renamed items
    suggest: await suggestState(env, id),
  };
}

/** the person's own view of suggesting: may they, why not, their suggestions as THEY see them */
export async function suggestState(env, id) {
  const p = await env.DB.prepare("SELECT p.interests, p.interests_hidden, c.answered FROM profiles p LEFT JOIN checklists c ON c.tg_id = p.tg_id WHERE p.tg_id = ?1").bind(id).first();
  const picked = allOf(p).length, answered = (p && p.answered) || 0;
  const t0 = db.now();
  const r = await env.DB.prepare("SELECT id, name, section, status, item, created_at FROM interest_suggestions WHERE tg_id = ?1 ORDER BY id DESC LIMIT 30").bind(id).all();
  const list = (r.results || []).map(x => {
    const hidden = x.status === "filtered" || x.status === "muted";   // never told apart from an honest «на проверке»
    const st = x.status === "pending" || (hidden && x.created_at > t0 - FILTERED_SHOWN_FOR) ? "pending"
      : x.status === "added" || x.status === "synonym" ? "added" : "rejected";
    return { id: x.id, name: x.name, section: x.section, status: st, item: st === "added" ? x.item : null, at: x.created_at };
  });
  const waiting = list.filter(x => x.status === "pending").length;
  return { can: picked >= SUGGEST_NEED_INTERESTS && answered >= SUGGEST_NEED_ANSWERS, picked, answered,
    need: { interests: SUGGEST_NEED_INTERESTS, answers: SUGGEST_NEED_ANSWERS }, slots: SUGGEST_SLOTS, waiting, list };
}

/** POST /api/suggest { name, section, alt } -> the same answer whether the filter took it or not */
export async function suggest(env, id, b) {
  const name = String((b && b.name) || "").normalize("NFKC").replace(/\s+/g, " ").trim();
  const alt = String((b && b.alt) || "").normalize("NFKC").replace(/\s+/g, " ").trim();
  const section = Number(b && b.section);
  if (!SEC.has(section)) return { error: "bad_section" };
  if (Array.from(name).length < 2 || Array.from(name).length > NAME_MAX || Array.from(alt).length > ALT_MAX) return { error: "bad_length" };
  const st = await suggestState(env, id);
  if (!st.can) return { error: "not_eligible" };
  if (st.waiting >= SUGGEST_SLOTS) return { error: "slots_full" };
  const u = await env.DB.prepare("SELECT suggest_blocked FROM users WHERE tg_id = ?1").bind(id).first();
  const why = checkText(name) || (alt ? checkText(alt, ALT_MAX) : null);
  const status = u && u.suggest_blocked ? "muted" : why ? "filtered" : "pending";
  await env.DB.prepare("INSERT INTO interest_suggestions (tg_id, name, alt, section, status, reason, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)")
    .bind(id, name, alt || null, section, status, status === "filtered" ? why : null, db.now()).run();
  return { ok: true, suggest: await suggestState(env, id) };
}

/* ---------- the owner's side ---------- */

const keyOf = s => String(s || "").toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** GET /api/admin/interests → suggestions waiting (same name + section grouped), filter hits not looked at yet */
export async function adminView(env) {
  const r = await env.DB.prepare(`SELECT s.id, s.name, s.alt, s.section, s.created_at, u.pub_id, p.nick FROM interest_suggestions s
      JOIN users u ON u.tg_id = s.tg_id LEFT JOIN profiles p ON p.tg_id = s.tg_id WHERE s.status = 'pending' ORDER BY s.id`).all();
  const groups = new Map();
  for (const x of r.results || []) {
    const k = x.section + "|" + keyOf(x.name);
    if (!groups.has(k)) groups.set(k, { name: x.name, alt: x.alt || "", section: x.section, tab: tabOfSection(x.section), ids: [], authors: [], at: x.created_at });
    const g = groups.get(k);
    g.ids.push(x.id); if (!g.alt && x.alt) g.alt = x.alt;
    if (!g.authors.some(a => a.n === x.pub_id)) g.authors.push({ n: x.pub_id, nick: x.nick || "" });
  }
  // filter hits: the reason, who, how many hits that person had in 7 days — never the text
  const f = await env.DB.prepare(`SELECT s.id, s.reason, s.created_at, u.pub_id, p.nick, u.suggest_blocked,
      (SELECT COUNT(*) FROM interest_suggestions s2 WHERE s2.tg_id = s.tg_id AND s2.status = 'filtered' AND s2.created_at > ?1) AS tries
      FROM interest_suggestions s JOIN users u ON u.tg_id = s.tg_id LEFT JOIN profiles p ON p.tg_id = s.tg_id
      WHERE s.status = 'filtered' AND s.seen = 0 ORDER BY s.id DESC LIMIT 50`).bind(db.now() - 7 * 86400).all();
  return {
    ok: true, groups: [...groups.values()],
    filtered: (f.results || []).map(x => ({ id: x.id, reason: x.reason, at: x.created_at, n: x.pub_id, nick: x.nick || "", tries: x.tries, blocked: !!x.suggest_blocked })),
    blocked: await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE suggest_blocked = 1").first("n"),
  };
}

/** counts for «Требует внимания» */
export async function attention(env) {
  const g = await env.DB.prepare("SELECT section, name FROM interest_suggestions WHERE status = 'pending'").all();
  const keys = new Set((g.results || []).map(x => x.section + "|" + keyOf(x.name)));
  return { pending: keys.size, filtered: await env.DB.prepare("SELECT COUNT(*) AS n FROM interest_suggestions WHERE status = 'filtered' AND seen = 0").first("n") };
}

/** Give the authors the new / chosen item (when there is room under the limit of its tab). */
async function giveToAuthors(env, sugIds, item, section) {
  const r = await env.DB.prepare(`SELECT DISTINCT s.tg_id, p.interests, p.interests_hidden FROM interest_suggestions s JOIN profiles p ON p.tg_id = s.tg_id
      WHERE s.id IN (SELECT value FROM json_each(?1))`).bind(JSON.stringify(sugIds)).all();
  const tab = tabOfSection(section), ops = [];
  for (const x of r.results || []) {
    const cur = parse(x.interests), both = allOf(x);
    if (both.includes(item)) continue;
    const ex = await extraSections(env, both);
    const inTab = both.filter(i => tabOfSection(i >= EXTRA_FROM ? ex.get(i) : staticSection(i)) === tab).length;
    if (inTab >= LIMITS[tab]) continue;
    ops.push(env.DB.prepare("UPDATE profiles SET interests = ?2 WHERE tg_id = ?1").bind(x.tg_id, JSON.stringify([...cur, item])));
  }
  if (ops.length) await env.DB.batch(ops);
}

/** POST /api/admin/interests { action, … }
    add      { ids, name, section, alt }  → a new catalog item (shown to everyone), the authors get it
    synonym  { ids, item }                → the suggested name becomes a search word of an existing item
    reject   { ids }                      → «не добавлено»
    seen     { ids }                      → filter hits looked at (they leave the list)
    block    { n, on }                    → the person may / may not suggest (silently) */
export async function adminAction(env, ownerId, b) {
  const t0 = db.now();
  const ids = Array.isArray(b && b.ids) ? b.ids.map(Number).filter(Number.isSafeInteger).slice(0, 200) : [];
  const a = String((b && b.action) || "");
  if (a === "block") {
    const u = await env.DB.prepare("SELECT tg_id FROM users WHERE pub_id = ?1").bind(String(b.n || "")).first();
    if (!u) return { error: "not_found" };
    await env.DB.prepare("UPDATE users SET suggest_blocked = ?2 WHERE tg_id = ?1").bind(u.tg_id, b.on ? 1 : 0).run();
    await db.audit(env, ownerId, b.on ? "suggest_block" : "suggest_unblock", "#" + b.n);
    return { ok: true, ...(await adminView(env)) };
  }
  // owner, 2026-10-28: rename an item / add or delete a search word — any catalog item, static or added
  if (a === "rename" || a === "syn_add") {
    const item = Number(b.item), sid = item >= EXTRA_FROM ? (await extraSections(env, [item])).get(item) : staticSection(item);
    if (!sid) return { error: "bad_item" };
    const text = String((a === "rename" ? b.name : b.text) || "").replace(/\s+/g, " ").trim();
    if (a === "rename" && !text) {   // back to the catalog's own name
      await env.DB.prepare("DELETE FROM interest_names WHERE item = ?1").bind(item).run();
    } else {
      if (Array.from(text).length < (a === "rename" ? 2 : 1) || Array.from(text).length > NAME_MAX) return { error: "bad_length" };
      if (a === "rename") await env.DB.prepare("INSERT INTO interest_names (item, name, created_at) VALUES (?1, ?2, ?3) ON CONFLICT (item) DO UPDATE SET name = excluded.name, created_at = excluded.created_at").bind(item, text, t0).run();
      else await env.DB.prepare("INSERT INTO interest_syn (item, text, created_at) VALUES (?1, ?2, ?3)").bind(item, text, t0).run();
    }
    await db.audit(env, ownerId, a === "rename" ? "interest_rename" : "interest_syn_add", String(item) + (text ? " «" + text.slice(0, 60) + "»" : ""));
    return { ok: true, ...(await adminView(env)) };
  }
  if (a === "syn_del") {
    const row = await env.DB.prepare("SELECT item, text FROM interest_syn WHERE id = ?1").bind(Number(b.id)).first();
    if (!row) return { error: "not_found" };
    await env.DB.prepare("DELETE FROM interest_syn WHERE id = ?1").bind(Number(b.id)).run();
    await db.audit(env, ownerId, "interest_syn_del", String(row.item) + " «" + String(row.text).slice(0, 60) + "»");
    return { ok: true, ...(await adminView(env)) };
  }
  if (!ids.length && a !== "add") return { error: "bad_ids" };   // owner, 2026-10-28: «add» also works with no suggestion behind it
  const J = JSON.stringify(ids);
  if (a === "seen") {
    await env.DB.prepare("UPDATE interest_suggestions SET seen = 1 WHERE status = 'filtered' AND id IN (SELECT value FROM json_each(?1))").bind(J).run();
    return { ok: true, ...(await adminView(env)) };
  }
  if (a === "reject") {
    await env.DB.prepare("UPDATE interest_suggestions SET status = 'rejected', decided_at = ?2 WHERE status = 'pending' AND id IN (SELECT value FROM json_each(?1))").bind(J, t0).run();
    await db.audit(env, ownerId, "interest_reject", String(ids.length));
    return { ok: true, ...(await adminView(env)) };
  }
  if (a === "add") {
    const name = String(b.name || "").replace(/\s+/g, " ").trim(), alt = String(b.alt || "").replace(/\s+/g, " ").trim(), section = Number(b.section);
    if (!SEC.has(section)) return { error: "bad_section" };
    if (Array.from(name).length < 2 || Array.from(name).length > NAME_MAX || Array.from(alt).length > ALT_MAX) return { error: "bad_length" };
    const last = await env.DB.prepare("SELECT MAX(id) AS m FROM interest_extra").first("m");
    const item = Math.max(EXTRA_FROM, (last || 0) + 1);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO interest_extra (id, section, name, alt, created_at) VALUES (?1, ?2, ?3, ?4, ?5)").bind(item, section, name, alt || null, t0),
      env.DB.prepare("UPDATE interest_suggestions SET status = 'added', item = ?2, decided_at = ?3 WHERE status = 'pending' AND id IN (SELECT value FROM json_each(?1))").bind(J, item, t0),
    ]);
    if (ids.length) { await giveToAuthors(env, ids, item, section); await notifyAccepted(env, 20); }
    await db.audit(env, ownerId, "interest_add", name.slice(0, 60));
    return { ok: true, item, ...(await adminView(env)) };
  }
  if (a === "synonym") {
    const item = Number(b.item);
    const sid = item >= EXTRA_FROM ? (await extraSections(env, [item])).get(item) : staticSection(item);
    if (!sid) return { error: "bad_item" };
    const rows = await env.DB.prepare("SELECT DISTINCT name FROM interest_suggestions WHERE status = 'pending' AND id IN (SELECT value FROM json_each(?1))").bind(J).all();
    await env.DB.batch([
      ...(rows.results || []).map(x => env.DB.prepare("INSERT INTO interest_syn (item, text, created_at) VALUES (?1, ?2, ?3)").bind(item, x.name, t0)),
      env.DB.prepare("UPDATE interest_suggestions SET status = 'synonym', item = ?2, decided_at = ?3 WHERE status = 'pending' AND id IN (SELECT value FROM json_each(?1))").bind(J, item, t0),
    ]);
    await giveToAuthors(env, ids, item, sid);
    await notifyAccepted(env, 20);
    await db.audit(env, ownerId, "interest_synonym", String(item));
    return { ok: true, ...(await adminView(env)) };
  }
  return { error: "bad_action" };
}

/** owner, 2026-10-28: tell the authors of accepted suggestions (added / made a synonym) — right after the owner's
    decision, and hourly for anything left (e.g. accepted before this existed). Each row once; a banned or gone
    person is skipped. Whether the item is already among their interests picks the wording. */
export async function notifyAccepted(env, max) {
  let r;
  try {
    r = await env.DB.prepare(`SELECT s.id, s.tg_id, s.name, s.item, u.status, u.lang, u.ui_lang, p.interests, p.interests_hidden
        FROM interest_suggestions s JOIN users u ON u.tg_id = s.tg_id LEFT JOIN profiles p ON p.tg_id = s.tg_id
        WHERE s.status IN ('added', 'synonym') AND s.notified = 0 ORDER BY s.id LIMIT ?1`).bind(max || 20).all();
  } catch (e) { return 0; }   // before migration 0040
  let sent = 0;
  for (const x of r.results || []) {
    await env.DB.prepare("UPDATE interest_suggestions SET notified = 1 WHERE id = ?1").bind(x.id).run();   // first: never twice
    if (x.status === "banned") continue;
    const lang = x.ui_lang || (String(x.lang || "").startsWith("en") ? "en" : "ru");
    const key = allOf(x).includes(x.item) ? "sugAccepted" : "sugAcceptedNoRoom";
    const log = console.log; console.log = () => {};   // a person who blocked the bot: nothing to do
    try {
      await send(env, x.tg_id, t(key, { name: esc(x.name) }, lang), {
        reply_markup: { inline_keyboard: [[{ text: t("openApp", null, lang), web_app: { url: (env.ORIGIN || "") + "/app/" } }]] } });
      sent++;
    } catch (e) { /* not delivered — nothing else to do */ } finally { console.log = log; }
  }
  return sent;
}
