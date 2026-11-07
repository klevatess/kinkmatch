/* src/neighbours.js — who a person sees, how far (rough bands only) and how well they match.
   Rules:
   - only people who share at least one connected chat with the viewer, where BOTH are members and both left
     «show me in this chat» on; the card names the shared chat(s) (owner, 2026-10-19);
   - both must be active, not paused, not banned, with a place; gender and age filters must accept each other;
   - distance is a band, never finer than the coarser of the two chosen radii: ~1 km, ~3 km, ~10 km, ~30 km, further;
   - the map shows zones (H3 cells at res 7, ~5 km²), never points;
   - percents are cached per pair (scores); at most FRESH_PER_CALL new ones per request (~0.15 ms each), and every
     step is one query or one batch (free plan: 10 ms CPU, 50 D1 queries per request). */

import { starOf } from "./stars.js";
import { linksFor } from "./links.js";
import { cellToParent, gridDistance, cellToBoundary, cellToLatLng } from "h3-js";
import { decrypt } from "./crypto.js";
import { ageOf, ageBucket, shownAge, showsGender } from "./profile.js";
import { match, compareGroups, names, CAT_OF, ID_OF, views, agreement } from "./score.js";
import { KC } from "./checklist.js";
import { now } from "./db.js";
import { portrait, counts } from "./insight.js";
import { filtersOff } from "./debug.js";
import { parse as parseInts, allOf as allInts } from "./interests.js";
import * as LM from "./likemsg.js";
import * as SS from "./seenset.js";
import { hiddenPoint } from "./hidden_area.js";

export const FRESH_PER_CALL = 20;
export const ZONE_RES = 7;

/** Rough distance band between two cells (each at res 8 = ~1 km or res 7 = ~3 km). */
export function band(cellA, resA, cellB, resB) {
  try {
    if (resA === 8 && resB === 8 && gridDistance(cellA, cellB) <= 1) return "1";
    const a7 = resA === 7 ? cellA : cellToParent(cellA, 7), b7 = resB === 7 ? cellB : cellToParent(cellB, 7);
    const d = gridDistance(a7, b7);
    // res-7 cell centres are ~2.1 km apart
    if (d <= 1) return "3";
    if (d <= 5) return "10";
    if (d <= 14) return "30";
    return "far";
  } catch (e) { return "far"; } // very far apart or across a pentagon
}
const BAND_ORDER = { "1": 0, "3": 1, "10": 2, "30": 3, far: 4 };

/** owner, 2026-10-27: a rounded distance in km for the slider and the cards, between the zones' centres (never finer
    than the band): ~1 / ~3 km as before, then whole km up to 30, tens of km up to 300, hundreds beyond. */
export function kmBetween(cellA, resA, cellB, resB) {
  const b = band(cellA, resA, cellB, resB);
  if (b === "1") return 1;
  if (b === "3") return 3;
  try {
    const [la1, lo1] = cellToLatLng(resA === 7 ? cellA : cellToParent(cellA, 7)), [la2, lo2] = cellToLatLng(resB === 7 ? cellB : cellToParent(cellB, 7));
    const r = Math.PI / 180, x = Math.sin((la2 - la1) * r / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2;
    const d = 12742 * Math.asin(Math.min(1, Math.sqrt(x)));
    return d < 30 ? Math.max(4, Math.round(d)) : d < 300 ? Math.round(d / 10) * 10 : Math.round(d / 100) * 100;
  } catch (e) { return 1000; }
}

export const zoneOf = (cell, res) => (res === ZONE_RES ? cell : cellToParent(cell, ZONE_RES));
/** owner, 2026-11-02: a zone on the territory of Ukraine is not drawn on OTHER people's maps (src/hidden_area.js);
    the person stays in the list. The viewer's own zone (me.zone) is never dropped. Cached per zone (same isolate). */
const hidCache = new Map();
export function zoneHidden(zone) {
  let h = hidCache.get(zone);
  if (h === undefined) { const [la, lo] = cellToLatLng(zone); h = hiddenPoint(la, lo); if (hidCache.size > 5000) hidCache.clear(); hidCache.set(zone, h); }
  return h;
}
export const boundaryOf = zone => cellToBoundary(zone).map(([lat, lng]) => [+lat.toFixed(5), +lng.toFixed(5)]);

const PROFILE_COLS = `u.tg_id, u.pub_id, u.username, u.first_name, u.open_space, u.activated_at, p.nova_at, p.nova_vis, p.nick, p.birth_date, p.gender, p.looking_for, p.seeking, p.ready_until, p.star_at, p.star_show, p.star_caption, p.show_genders,
  p.age_min, p.age_max, p.about, p.about_hidden, p.interests, p.interests_hidden, p.about_public, p.compare_before_yes, p.age_exact, c.role, c.experience, c.relation, c.answered, c.ans_top, c.ans_bottom, c.enc, l.cell, l.res, l.radius`;

export async function viewerRow(env, id) {
  return env.DB.prepare(`SELECT ${PROFILE_COLS}, p.paused, u.status FROM users u JOIN profiles p ON p.tg_id = u.tg_id
      JOIN checklists c ON c.tg_id = u.tg_id JOIN locations l ON l.tg_id = u.tg_id WHERE u.tg_id = ?1`).bind(id).first();
}

/** owner, 2026-11-01: who the viewer may see now comes from src/seenset.js (a snapshot kept current by the journal);
    the moderator's «hide» is a time limit, so it is checked here, on every read. */
const live = (c, t0) => !(c.hidden_until != null && c.hidden_until >= t0);

/** The viewer's candidates (rule + not hidden right now), from the snapshot. -> { rows, snap } | null */
async function seenNow(env, id) {
  const snap = await SS.seenRows(env, id);
  if (!snap) return null;
  const t0 = now();
  return { rows: snap.rows.filter(c => live(c, t0)), snap };
}

/** checklists of these people (only when a percent has to be computed, or for the search) -> Map(tg_id → enc) */
async function encOf(env, ids) {
  if (!ids.length) return new Map();
  const r = await env.DB.prepare("SELECT tg_id, enc FROM checklists WHERE tg_id IN (SELECT value FROM json_each(?1))").bind(JSON.stringify(ids)).all();
  return new Map((r.results || []).map(x => [x.tg_id, x.enc]));
}

/** The cell others are compared with: ~1 km only if the person chose it (and the cell is kept at ~1 km). */
export const shownCell = row => (row.radius === 1 && row.res === 8 ? [row.cell, 8] : [row.res === 7 ? row.cell : cellToParent(row.cell, 7), 7]);

/** May viewer a see b? off = the owner's test switch «filters off» (everyone passes).
    owner, 2026-10-31: a supernova and the people it lets see it skip the filters (src/seenset.js decides).
    owner, 2026-11-03: «Кого показывать» (gender) stays MUTUAL; the AGE range is only the viewer's own filter (b's range
    never hides b) — and someone outside it who liked the viewer is still shown (card marked out_age). */
export function mutual(a, b, today, off) {
  if (off || b.me_nova || b.nova_open) return true;
  return genderOk(a, b) && (ageFits(a, b, today) || !!b.likes_me);
}
/** owner, 2026-11-07: «Кого показывать» is mutual, except for «Не указано» (`other`): a person with `other` sees and is
    seen by everyone THEIR OWN choice accepts — the other side's «только мужчин / только женщин» does not hide them. */
export function genderOk(a, b) {
  const showA = JSON.parse(a.show_genders || "[]"), showB = JSON.parse(b.show_genders || "[]");
  const oa = a.gender === "other", ob = b.gender === "other";
  if (oa && !ob) return showsGender(showA, b.gender);
  if (ob && !oa) return showsGender(showB, a.gender);
  return showsGender(showA, b.gender) && showsGender(showB, a.gender);
}
/** b's age inside a's own range */
export function ageFits(a, b, today) {
  const ageB = ageOf(b.birth_date, today);
  return ageB >= (a.age_min || 18) && ageB <= (a.age_max || 99);
}
/** owner, 2026-11-03: how many people only the viewer's age range hides (the «Показать всех (18–99)» hint, shown > 20) */
function hiddenByAge(v, all, off) {
  if (off || ((v.age_min || 18) <= 18 && (v.age_max || 99) >= 99)) return 0;
  return all.filter(c => !c.me_nova && !c.nova_open && !c.likes_me && genderOk(v, c) && !ageFits(v, c)).length;
}

const open = async (env, enc) => JSON.parse(await decrypt(env.DATA_KEY, enc));

/** Scores of the viewer with each candidate. owner, 2026-11-01: only the pairs asked for are read (scores_b index;
    «a = me OR b = me» used to read the whole table); `cache` (the snapshot's { tg_id: score }) is used first and gets
    the new ones. At most `budget` new percents are computed, written in one statement (free plan: 10 ms CPU, 50 D1
    queries per request). -> Map(tg_id → score|null) */
export async function scoresFor(env, v, list, budget, cache) {
  const out = new Map();
  if (!list.length) return out;
  const need = [];
  for (const c of list) { const k = c.tg_id, x = cache && cache[k]; if (x) out.set(k, x); else need.push(k); }
  if (need.length) {
    const L = JSON.stringify(need);
    const [r1, r2] = await env.DB.batch([
      env.DB.prepare("SELECT a, b, pct, themes, same_role, dirs, keen FROM scores WHERE a = ?1 AND b IN (SELECT value FROM json_each(?2))").bind(v.tg_id, L),
      env.DB.prepare("SELECT a, b, pct, themes, same_role, dirs, keen FROM scores WHERE b = ?1 AND a IN (SELECT value FROM json_each(?2))").bind(v.tg_id, L),
    ]);
    for (const x of [...(r1.results || []), ...(r2.results || [])]) if (x.keen != null) {
      const k = x.a === v.tg_id ? x.b : x.a;
      const sc = { pct: x.pct, themes: JSON.parse(x.themes || "[]"), sameRole: !!x.same_role, dirs: dirsFor(x.dirs ? JSON.parse(x.dirs) : null, x.a === v.tg_id), keen: x.keen };
      out.set(k, sc); if (cache) cache[k] = sc;
    }
  }
  const todo = list.filter(c => !out.has(c.tg_id)).slice(0, budget);
  if (!todo.length) return out;
  const encs = todo.some(c => !c.enc) ? await encOf(env, todo.filter(c => !c.enc).map(c => c.tg_id)) : new Map();
  const mine = await open(env, v.enc), rows = [];
  for (const c of todo) {
    const e = c.enc || encs.get(c.tg_id);
    if (!e) continue;
    const m = match(mine, await open(env, e));
    const g = agreement(m.pair[0], m.pair[1]), keen = g ? g.bk : 0;   // both Love / Yes, in the compared columns
    const sc = { pct: m.pct, themes: m.themes, sameRole: m.sameRole, dirs: dirsFor(m.dirs, true), keen };
    out.set(c.tg_id, sc); if (cache) cache[c.tg_id] = sc;
    const first = v.tg_id < c.tg_id;
    const [a, b] = first ? [v.tg_id, c.tg_id] : [c.tg_id, v.tg_id];
    const stored = m.dirs ? JSON.stringify(first ? m.dirs : m.dirs.map(([x, y, p]) => [y, x, p])) : null;   // kept from a's side
    rows.push([a, b, m.pct, JSON.stringify(m.themes), m.sameRole ? 1 : 0, stored, keen]);
  }
  // one statement for all new rows (D1 counts statements; a statement takes at most 100 bound values)
  if (rows.length) await env.DB.prepare(`INSERT OR REPLACE INTO scores (a, b, pct, themes, same_role, dirs, keen, updated_at)
      SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]'), json_extract(value, '$[3]'),
             json_extract(value, '$[4]'), json_extract(value, '$[5]'), json_extract(value, '$[6]'), ?2 FROM json_each(?1)`).bind(JSON.stringify(rows), now()).run();
  return out;
}

/** owner, 2026-10-29 (calendar): the people the viewer may see right now, under the same rules as the list.
    -> [{ tg_id, pub_id, nick }] */
export async function peopleSeen(env, id) {
  const v = await viewerRow(env, id);
  if (!v) return [];
  const off = await filtersOff(env), S = await seenNow(env, id);
  if (!S) return [];
  await S.snap.save();
  return S.rows.filter(c => mutual(v, c, null, off)).map(c => ({ tg_id: c.tg_id, pub_id: c.pub_id, nick: c.nick || "" }));
}

/** Stored directions [[colA, colB, pct], …] → the viewer's side: [{ me, them, pct }] (me / them = "top" | "bottom" | null). */
function dirsFor(d, viewerIsA) {
  return d ? d.map(([x, y, p]) => (viewerIsA ? { me: x, them: y, pct: p } : { me: y, them: x, pct: p })) : null;
}

export function dropScores(env, id) {
  return env.DB.prepare("DELETE FROM scores WHERE a = ?1 OR b = ?1").bind(id).run();
}

/** A card as the viewer may see it (before a mutual yes: no name, no exact age, no Telegram). */
/** owner, 2026-10-28: the open group of c, plus those hidden items of c that the viewer v also has (in either group).
    Hidden items the viewer does not share never leave the server. */
function visibleInts(v, c) {
  const open = parseInts(c.interests), hid = parseInts(c.interests_hidden);
  if (!hid.length) return open;
  const mine = new Set(allInts(v));
  return [...open, ...hid.filter(x => mine.has(x) && !open.includes(x))];
}

const mapZone = z => (zoneHidden(z) ? null : z);   // owner, 2026-11-02: null = in the list, not on the map
function card(v, c, s, lang) {
  const n = names(lang);
  const chats = String(c.chat_titles || "").split("\u0001").filter(Boolean);
  const [vc, vr] = shownCell(v), [cc, cr] = shownCell(c);
  return {
    id: c.pub_id, nick: c.nick || "", space: !!c.via_space /* both in open space; with a shared chat both marks are shown */, gender: c.gender, age_bucket: shownAge(c.birth_date, c.age_exact), role: c.role, experience: c.experience,
    relation: c.relation, answered: c.answered || 0 /* owner, 2026-10-21: how full the checklist is, seen before comparing */, cols: c.ans_top != null ? { top: c.ans_top, bottom: c.ans_bottom } : null /* 2026-10-24: Top / Bottom separately */, looking_for: JSON.parse(c.looking_for || "[]"), about: c.about_public && !c.about_hidden ? c.about || "" : "" /* owner, 2026-10-27: hidden by the owner */,
    seeking: JSON.parse(c.seeking || "[]"),   // owner, 2026-10-25: «Кого ищу», information only
    ready: !!(c.ready_until && c.ready_until > now()),   // owner, 2026-10-26: «Готов(а) к встрече» (7 days)
    interests: visibleInts(v, c),   // owner, 2026-10-28: hobbies and fandoms; hidden ones only when the viewer has them too
    star: starOf(c),   // owner, 2026-10-27: «Звезда комьюнити» — only when lit AND the person shows it
    nova: !!c.nova_at,   // owner, 2026-10-31: «Сверхновая» — drawn as a nebula
    chats: [...new Set(chats)], band: band(vc, vr, cc, cr), km: kmBetween(vc, vr, cc, cr), zone: mapZone(zoneOf(cc, cr)),
    // owner, 2026-10-21: through the universe (and no shared chat) — its universe chats are named, nothing else
    // owner, 2026-10-21: the «Вселенная» filter shows everyone of the universe, people of my own universe chat too
    in_uni: !!c.via_uni || !!c.shared_uni,
    uni: !chats.length && !!c.via_uni, uni_chats: !chats.length && c.via_uni ? [...new Set(String(c.uni_titles || "").split("\u0001").filter(Boolean))] : [],
    pct: s ? s.pct : null, dirs: s ? s.dirs || null : null, pending: !s, themes: s ? s.themes.map(n.cat) : [], same_role: !!(s && s.sameRole),
    compare: !!c.compare_before_yes || !!c.is_mutual,
    my: c.my_answer || null, mutual: !!c.is_mutual,   // «Not now» is never shown to the other person
    // owner, 2026-10-26: «не сейчас» hides a card for 5 days, then it comes back marked «вы скрывали»
    was_hidden: c.my_answer === "no" && (c.my_until ? c.my_until < now() : c.my_answer_at < now() - NOT_NOW_DAYS * 86400),
    my_at: c.my_answer === "yes" ? c.my_answer_at || null : null,   // owner, 2026-11-07: «Мои лайки» sorted by my like time
    sus: !!c.sus_at || undefined,   // owner, 2026-11-07: «подозрительная анкета» (set by the owner; the person is not told)
    since: c.activated_at || null, keen: s && s.keen != null ? s.keen : null,   // quick filters «Новые» / «Хотят того же»
    likes_me: !!c.likes_me && !c.is_mutual,            // owner (2026-10-19): a «yes» is shown right away (card only, no name)
    liked_at: c.likes_me && !c.is_mutual ? c.likes_at || null : null,   // owner, 2026-11-03: «Ждут ответа» counts new likes
    out_age: !c.me_nova && !c.nova_open && !ageFits(v, c) || undefined,   // owner, 2026-11-03: liked me, outside my age range
  };
}

export const NOT_NOW_DAYS = 5;   // the old fixed time (answers without `until`)
/** owner, 2026-11-07: «Не сейчас» — the person chooses how long */
export const NOT_NOW_CHOICES = [1, 3, 7, 30, 90, 120, 360];

/** GET /api/list?id= → the neighbour's own checklist (owner, 2026-10-26: «Её анкета», like the admin sees it), under the
    same rule as the comparison. -> { ext, rows: [{ cat, name, side, a }] } in the list's order */
export async function listOf(env, id, pub, lang) {
  const f = await allowed(env, id, pub);
  if (f.error) return f;
  const v = views(await open(env, f.c.enc)), nm = names(lang), rows = [];
  const pick = (vec, side) => { for (const c of KC.CATS) for (const [code, x] of c.items) if (vec[code]) rows.push({ cat: nm.cat(CAT_OF[x]), name: nm.item(x), side, a: ANS_NAME[vec[code]] }); };
  if (v.ext) { pick(v.top, "top"); pick(v.bottom, "bottom"); } else pick(v.plain, null);
  return { ok: true, ext: !!v.ext, rows };
}

/** GET /api/neighbours → { me: { zone }, items: [...], zones: { cell: boundary } } */
export async function neighbours(env, id, lang) {
  const v = await viewerRow(env, id);
  if (!v || v.status !== "active") return { error: "not_active" };
  if (v.paused) return { ok: true, paused: true, items: [], zones: {} };
  const S = await seenNow(env, id);
  const all = S ? S.rows : [];
  const off = await filtersOff(env);
  const list = all.filter(c => mutual(v, c, null, off));
  const before = S ? Object.keys(S.snap.sc).length : 0;
  const scores = await scoresFor(env, v, list, FRESH_PER_CALL, S ? S.snap.sc : null);
  if (S) await S.snap.save(Object.keys(S.snap.sc).length !== before);   // new percents go into the snapshot
  const lk = await linksFor(env, list.filter(c => starOf(c)).map(c => c.tg_id));   // owner, 2026-10-27: a star's links
  const items = list.map(c => { const x = card(v, c, scores.get(c.tg_id), lang); if (x.star) x.links = lk.get(c.tg_id) || []; return x; });
  items.sort((x, y) => (y.pct ?? -1) - (x.pct ?? -1) || BAND_ORDER[x.band] - BAND_ORDER[y.band]);
  const nwBefore = S ? Object.keys(S.snap.nw).length : 0;
  await markFresh(env, id, list, items, S ? S.snap.nw : null);
  if (S && Object.keys(S.snap.nw).length !== nwBefore) await S.snap.save(true);
  const myZone = zoneOf(...shownCell(v));
  const zones = {};
  for (const z of new Set([myZone, ...items.map(i => i.zone).filter(Boolean)])) zones[z] = boundaryOf(z);
  // when the list is empty, say why (counts only, nobody is named): people in your chats / space, ready or not
  const stats = items.length ? null : await visibility(env, id, all.length);
  // owner, 2026-10-31: people I said «да» to who then paused — listed apart until I withdraw my «да»
  const pz = await pausedRows(env, id);
  const pzScores = pz.length ? await scoresFor(env, v, pz, 5) : new Map();
  const on_pause = pz.map(c => pausedCard(v, c, pzScores.get(c.tg_id), lang));
  await attachMsgs(env, id, [...list, ...pz], [...items, ...on_pause]);
  return { ok: true, me: { zone: myZone, space: !!v.open_space }, items, on_pause, zones, stats, filters_off: off, age_hidden: hiddenByAge(v, all, off) };
}

/** owner, 2026-10-31: one-sided «да» of the viewer to people who are on pause now (active, not hidden by a moderator).
    pub = only that one. Rows have PROFILE_COLS (the place may be missing). */
async function pausedRows(env, id, pub) {
  const r = await env.DB.prepare(`SELECT ${PROFILE_COLS}, p.compare_before_yes, mine.created_at AS my_answer_at FROM answers mine
      JOIN users u ON u.tg_id = mine.b AND u.status = 'active' AND (u.hidden_until IS NULL OR u.hidden_until < ?2)
      JOIN profiles p ON p.tg_id = u.tg_id AND p.paused = 1
      JOIN checklists c ON c.tg_id = u.tg_id
      LEFT JOIN locations l ON l.tg_id = u.tg_id
    WHERE mine.a = ?1 AND mine.value = 'yes' AND (?3 IS NULL OR u.pub_id = ?3)
      AND NOT EXISTS (SELECT 1 FROM answers t WHERE t.a = u.tg_id AND t.b = ?1 AND t.value = 'yes') LIMIT 100`).bind(id, now(), pub || null).all();
  return r.results || [];
}

/** A paused person's card: as the list showed it, without any distance or place. */
function pausedCard(v, c, s, lang) {
  const x = card(v, { ...c, cell: v.cell, res: v.res, radius: v.radius }, s, lang);   // the viewer's own cell only so card() has one; dropped below
  return { ...x, band: null, km: null, zone: null, chats: [], space: false, uni: false, uni_chats: [], in_uni: false, my: "yes", mutual: false,
    likes_me: false, was_hidden: false, fresh: false, on_pause: true, yes_at: c.my_answer_at };
}

/** owner, 2026-10-31: «да» messages on the cards — msg_in (they wrote to me with their «да»), msg_out (I wrote with mine). */
async function attachMsgs(env, id, rows, cards) {
  if (!rows.length) return;
  const m = await LM.around(env, id);
  if (!m.got.size && !m.sent.size) return;
  const byPub = new Map(cards.map(x => [x.id, x]));   // the list is sorted already: match by public id
  rows.forEach(c => {
    const x = byPub.get(c.pub_id), got = m.got.get(c.tg_id), sent = m.sent.get(c.tg_id);
    if (!x) return;
    if (got && (x.likes_me || x.mutual) && x.my !== "no") x.msg_in = got;
    if (sent && (x.my === "yes" || x.mutual)) x.msg_out = sent;
  });
}

/* owner, 2026-10-28: the green «новый» badge, per viewer. Only people who reached the map in the last NEW_POOL count;
   the viewer's first sight of them starts NEW_FOR; opening their profile (POST /api/seen) ends it at once.
   One row per (viewer, newcomer), written once; rows go after NEW_POOL + a day (daily job). */
export const NEW_FOR = 86400, NEW_POOL = 7 * 86400;
async function markFresh(env, id, list, items, known) {
  const t0 = now(), byId = new Map(list.map(c => [c.pub_id, c.tg_id]));
  const cand = items.filter(x => x.since && t0 - x.since < NEW_POOL && !x.mutual);
  items.forEach(x => { x.fresh = false; });
  if (!cand.length) return;
  // owner, 2026-11-01: `known` (kept in the snapshot) = { tg_id: [first_at, opened] } — only the people not known yet are
  // looked up. Opening a profile (seen()) writes a journal entry, which drops that person from `known`.
  const st = new Map();
  for (const x of cand) { const k = known && known[byId.get(x.id)]; if (Array.isArray(k)) st.set(byId.get(x.id), k); }
  const need = cand.map(x => byId.get(x.id)).filter(t => !st.has(t));
  if (need.length) {
    const r = await env.DB.prepare("SELECT target, first_at, opened FROM nb_new WHERE viewer = ?1 AND target IN (SELECT value FROM json_each(?2))")
      .bind(id, JSON.stringify(need)).all();
    for (const x of r.results || []) st.set(x.target, [x.first_at, x.opened ? 1 : 0]);
    const add = need.filter(t => !st.has(t));
    for (const t of add) st.set(t, [t0, 0]);
    if (add.length) await env.DB.prepare("INSERT OR IGNORE INTO nb_new (viewer, target, first_at) SELECT ?1, value, ?3 FROM json_each(?2)").bind(id, JSON.stringify(add), t0).run();   // one statement
    if (known) for (const t of need) known[t] = st.get(t);
  }
  for (const x of cand) { const k = st.get(byId.get(x.id)); x.fresh = !!k && !k[1] && t0 - k[0] < NEW_FOR; }
}

/** POST /api/seen { id } → the viewer opened this profile: its «новый» badge goes (only touches an existing row). */
export async function seen(env, id, pub) {
  if (!/^[a-z0-9]{10}$/.test(String(pub || ""))) return { error: "not_found" };
  await env.DB.prepare("UPDATE nb_new SET opened = 1 WHERE viewer = ?1 AND target = (SELECT tg_id FROM users WHERE pub_id = ?2)").bind(id, pub).run();
  // owner, 2026-11-01: the viewer's snapshot keeps the badge state — a journal entry for this pair refreshes it
  await env.DB.prepare("INSERT INTO nb_log (who, only_for, at) SELECT tg_id, ?1, ?3 FROM users WHERE pub_id = ?2").bind(id, pub, now()).run();
  return { ok: true };
}

/** daily job */
export function pruneFresh(env) { return env.DB.prepare("DELETE FROM nb_new WHERE first_at < ?1").bind(now() - NEW_POOL - 86400).run(); }

async function findTarget(env, id, pub) {
  if (!/^[a-z0-9]{10}$/.test(String(pub || ""))) return null;
  const v = await viewerRow(env, id);
  if (!v || v.status !== "active") return null;
  // owner, 2026-11-01: only this one person is checked (the same rule as the list), not the whole list again
  const t = await env.DB.prepare("SELECT tg_id FROM users WHERE pub_id = ?1").bind(pub).first("tg_id");
  const c = t != null ? await SS.one(env, id, t) : null;
  if (!c || !live(c, now()) || !mutual(v, c, null, await filtersOff(env))) return null;
  return { v, c };
}

/** GET /api/person?id= → one card (computes the percent if it is not cached yet). */
export async function person(env, id, pub, lang) {
  const f = await findTarget(env, id, pub);
  if (!f) {
    const pz = await pausedRows(env, id, pub), v = pz.length && (await viewerRow(env, id));
    if (!v) return { error: "not_found" };
    return { ok: true, person: pausedCard(v, pz[0], (await scoresFor(env, v, pz, 1)).get(pz[0].tg_id), lang) };
  }
  const s = (await scoresFor(env, f.v, [f.c], 1)).get(f.c.tg_id);
  const x = card(f.v, f.c, s, lang);
  if (x.star) x.links = (await linksFor(env, [f.c.tg_id])).get(f.c.tg_id) || [];
  return { ok: true, person: x };
}

/** The viewer and the other person when the comparison is allowed: they allow it before a mutual yes, or it is mutual.
    -> { v, c } | { error } */
async function allowed(env, id, pub) {
  const f = await findTarget(env, id, pub);
  if (f && (f.c.compare_before_yes || f.c.is_mutual)) return f;
  const m = await mutualRow(env, id, pub);            // after a mutual yes the comparison stays open
  if (m) { const v = await viewerRow(env, id); if (v) return { v, c: m }; }
  const pz = await pausedRows(env, id, pub);          // owner, 2026-10-31: paused after my «да» — as before the pause
  if (pz.length) { const v = await viewerRow(env, id); if (v) return pz[0].compare_before_yes ? { v, c: pz[0] } : { error: "compare_hidden" }; }
  return { error: f ? "compare_hidden" : "not_found" };
}

/** GET /api/compare?id= → the full comparison like on the site, if the other person allows it before a mutual yes.
    owner, 2026-10-24: with love / yes / maybe / no counts of both, and per section of the other person. */
export async function compare(env, id, pub, lang) {
  const f = await allowed(env, id, pub);
  if (f.error) return f;
  const r = compareGroups(await open(env, f.v.enc), await open(env, f.c.enc));
  const n = names(lang);
  const out = {};
  for (const [g, rows] of Object.entries(r.groups)) out[g] = rows.map(x => ({ cat: n.cat(CAT_OF[x.id]), name: n.item(x.id), me: x.a, them: x.b }));
  const them = counts(r.pair[1], lang);
  return { ok: true, pct: r.pct, same_role: r.sameRole, cols: r.cols, groups: out, counts: { me: counts(r.pair[0], lang).all, them: them.all }, cats: them.cats };
}

/** GET /api/insight?id= → the other person's portrait (like the site's) and answer counts, where the comparison is allowed.
    An extended list: the column compared with the viewer (owner, 2026-10-24). */
export async function insight(env, id, pub, lang) {
  const f = await allowed(env, id, pub);
  if (f.error) return f;
  const m = match(await open(env, f.v.enc), await open(env, f.c.enc));
  const them = m.pair[1];
  return { ok: true, portrait: portrait(them, lang), counts: counts(them, lang).all, col: m.cols[1] || null };
}

/* ---------- search by practice (owner, 2026-10-24) ---------- */
const CODE_OF = Object.fromEntries(ID_OF.map((x, code) => [x, code]).filter(([x]) => x));
export const SEARCH_MAX = 5;

/** GET /api/items → every practice: [[id, name, section]] in the list's order (for the search box). */
export function catalog(lang) {
  const n = names(lang), out = [];
  for (const c of KC.CATS) for (const [, x] of c.items) out.push([x, n.item(x), n.cat(c.id)]);
  return { ok: true, items: out };
}

/** GET /api/search?items=a,b → people who answered Love / Yes / Maybe to EVERY chosen practice (in the column compared
    with the viewer). Only people whose list the viewer may compare (they allow it before yes, or mutual) are looked at;
    `hidden` = how many visible people were not looked at. -> { found: { pub: [[id, "love"|"yes"|"maybe"], …] }, hidden } */
export async function search(env, id, list) {
  const ids = [...new Set(String(list || "").split(",").filter(x => CODE_OF[x] != null))].slice(0, SEARCH_MAX);
  if (!ids.length) return { error: "bad_items" };
  const v = await viewerRow(env, id);
  if (!v || v.status !== "active") return { error: "not_active" };
  const off = await filtersOff(env);
  const S = await seenNow(env, id);
  if (S) await S.snap.save();
  const all = (S ? S.rows : []).filter(c => mutual(v, c, null, off));
  const open1 = all.filter(c => c.compare_before_yes || c.is_mutual);
  const encs = await encOf(env, open1.map(c => c.tg_id));
  const mine = await open(env, v.enc), found = {};
  const NAME = ["", "no", "maybe", "yes", "love"];
  for (const c of open1) {
    let them;
    try { them = match(mine, await open(env, encs.get(c.tg_id))).pair[1]; } catch (e) { continue; }
    const hits = ids.map(x => [x, them[CODE_OF[x]]]);
    if (hits.every(([, a]) => a >= 2)) found[c.pub_id] = hits.map(([x, a]) => [x, NAME[a]]);
  }
  return { ok: true, found, hidden: all.length - open1.length };
}

/* ---------- stage 5: «Yes» / «Not now», mutual yes ---------- */

const MUTUAL_SQL = `SELECT u.tg_id, u.pub_id, u.username, u.first_name, p.nick, p.birth_date, p.gender, p.looking_for, p.seeking, p.ready_until, p.star_at, p.star_show, p.star_caption, p.about, p.about_hidden, p.interests, p.interests_hidden, c.role, c.experience, c.answered, c.ans_top, c.ans_bottom,
      c.relation, c.enc, l.cell, l.res, l.radius, p.nova_at AS nv_at, p.nova_contact AS nv_contact, mine.created_at AS my_at, theirs.created_at AS their_at, 1 AS is_mutual
    FROM answers mine
      JOIN answers theirs ON theirs.a = mine.b AND theirs.b = mine.a AND theirs.value = 'yes'
      JOIN users u ON u.tg_id = mine.b AND u.status = 'active' AND (u.hidden_until IS NULL OR u.hidden_until < ?2)
      JOIN profiles p ON p.tg_id = u.tg_id
      JOIN checklists c ON c.tg_id = u.tg_id
      LEFT JOIN locations l ON l.tg_id = u.tg_id
    WHERE mine.a = ?1 AND mine.value = 'yes'`;

export async function mutualRow(env, id, pub) {
  if (!/^[a-z0-9]{10}$/.test(String(pub || ""))) return null;
  return env.DB.prepare(MUTUAL_SQL + " AND u.pub_id = ?3").bind(id, now(), pub).first();
}

/** POST /api/answer { id, value: "yes" | "no" | null } -> { ok, mutual, other } (other = tg id to notify, if it just became mutual) */
export async function answer(env, id, pub, value, via, days) {
  if (value !== "yes" && value !== "no" && value !== null) return { error: "bad_value" };
  if (value === "no" && days != null && !NOT_NOW_CHOICES.includes(Number(days))) return { error: "bad_days" };
  const until = value === "no" && days != null ? now() + Number(days) * 86400 : null;
  let target = null;
  if (value === null) {
    if (!/^[a-z0-9]{10}$/.test(String(pub || ""))) return { error: "not_found" };
    target = await env.DB.prepare("SELECT tg_id FROM users WHERE pub_id = ?1").bind(pub).first();
  } else {
    const f = await findTarget(env, id, pub);                 // only people the viewer may see right now
    target = f && f.c;
    if (!target) { const m = await mutualRow(env, id, pub); target = m; }
  }
  if (!target) return { error: "not_found" };
  const b = target.tg_id;
  const was = await env.DB.prepare(MUTUAL_SQL + " AND u.tg_id = ?3").bind(id, now(), b).first();
  const before = await env.DB.prepare("SELECT value FROM answers WHERE a = ?1 AND b = ?2").bind(id, b).first("value");
  if (value === null) await env.DB.prepare("DELETE FROM answers WHERE a = ?1 AND b = ?2").bind(id, b).run();
  else await env.DB.prepare(`INSERT INTO answers (a, b, value, created_at, until) VALUES (?1, ?2, ?3, ?4, ?5)
      ON CONFLICT (a, b) DO UPDATE SET value = excluded.value, created_at = excluded.created_at, until = excluded.until`).bind(id, b, value, now(), until).run();
  // owner, 2026-10-31: a message lives while its «да» stands; «не сейчас» also drops the message the other one sent
  if (value !== "yes") await LM.drop(env, id, b);
  if (value === "no") await LM.drop(env, b, id);
  const isNow = value === "yes" && !!(await env.DB.prepare("SELECT 1 AS x FROM answers WHERE a = ?1 AND b = ?2 AND value = 'yes'").bind(b, id).first());
  // owner, 2026-10-20: the log the owner's «Взаимности» on a profile page is built from (both sides of every mutual).
  // `was` above only sees a mutual that is visible right now; ended = there were two yes and now there are not.
  const theirYes = !!(await env.DB.prepare("SELECT 1 AS x FROM answers WHERE a = ?1 AND b = ?2 AND value = 'yes'").bind(b, id).first());
  const wasBoth = before === "yes" && theirYes, nowBoth = value === "yes" && theirYes;
  if ((value || "none") !== (before || "none")) await env.DB.prepare("INSERT INTO answer_log (a, b, value, how, broke, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
    .bind(id, b, value || "none", via === "unmatch" ? "unmatch" : "card", wasBoth && !nowBoth ? 1 : !wasBoth && nowBoth ? 2 : 0, now()).run();
  return { ok: true, mutual: isNow, other: isNow && !was ? b : null, target: b, liked: value === "yes" && !isNow && before !== "yes", broke: wasBoth && !nowBoth,
    fresh: value === "yes" && before !== "yes" };
}

/** GET /api/matches -> people with a mutual yes: now the name, exact age and a Telegram link are visible. */
export async function matches(env, id, lang) {
  const v = await viewerRow(env, id);
  const r = await env.DB.prepare(MUTUAL_SQL + " ORDER BY MAX(mine.created_at, theirs.created_at) DESC").bind(id, now()).all();
  const list = r.results || [];
  if (!list.length) return { ok: true, items: [] };
  // owner, 2026-11-01: only the memberships of these people (point lookups), not every member of the viewer's chats
  const titles = await env.DB.prepare(`SELECT other.tg_id, ch.title FROM memberships other
      JOIN memberships me ON me.tg_id = ?1 AND me.chat_id = other.chat_id AND me.member = 1 JOIN chats ch ON ch.chat_id = other.chat_id
      WHERE other.tg_id IN (SELECT value FROM json_each(?2)) AND other.member = 1`).bind(id, JSON.stringify(list.map(c => c.tg_id))).all();
  const chatsOf = {};
  for (const x of titles.results || []) (chatsOf[x.tg_id] = chatsOf[x.tg_id] || []).push(x.title || "");
  const scores = v ? await scoresFor(env, v, list, FRESH_PER_CALL) : new Map();
  const lk = await linksFor(env, list.filter(c => starOf(c)).map(c => c.tg_id));
  const n = names(lang);
  const oc = await ownerContact(env, list);
  const out = {
    ok: true,
    items: list.map(c => {
      const who = contactOf(c, oc);
      const s = scores.get(c.tg_id);
      return {
        id: c.pub_id, name: who.first_name || "", nick: c.nick || "", age: ageOf(c.birth_date), gender: c.gender, role: c.role, experience: c.experience, answered: c.answered || 0, cols: c.ans_top != null ? { top: c.ans_top, bottom: c.ans_bottom } : null,
        relation: c.relation, looking_for: JSON.parse(c.looking_for || "[]"), seeking: JSON.parse(c.seeking || "[]"), about: c.about_hidden ? "" : c.about || "",
        ready: !!(c.ready_until && c.ready_until > now()), star: starOf(c), links: starOf(c) ? lk.get(c.tg_id) || [] : undefined,
        chats: [...new Set(chatsOf[c.tg_id] || [])], band: v && c.cell ? band(...shownCell(v), ...shownCell(c)) : null, km: v && c.cell ? kmBetween(...shownCell(v), ...shownCell(c)) : null,
        pct: s ? s.pct : null, dirs: s ? s.dirs || null : null, pending: !s, themes: s ? s.themes.map(n.cat) : [], same_role: !!(s && s.sameRole),
        tg: who.username ? "https://t.me/" + who.username : null, since: Math.max(c.my_at, c.their_at),
        interests: v ? visibleInts(v, c) : parseInts(c.interests),   // owner, 2026-11-07: interests on mutual cards too
      };
    }),
  };
  const m = await LM.around(env, id);   // owner, 2026-10-31: the «да» messages stay on the mutual card
  out.items.forEach((x, i) => { const got = m.got.get(list[i].tg_id), sent = m.sent.get(list[i].tg_id); if (got) x.msg_in = got; if (sent) x.msg_out = sent; });
  return out;
}

/** For «Write in Telegram» without a @username: the tg id, only after a mutual yes. */
export async function mutualContact(env, id, pub) {
  const m = await mutualRow(env, id, pub);
  if (!m) return null;
  const w = contactOf(m, await ownerContact(env, [m]));
  return { tg_id: w.tg_id, name: w.first_name || m.nick || "", username: w.username };
}

/* owner, 2026-11-03: a supernova may show the OWNER's account as its contact after a mutual like (profiles.nova_contact,
   set in the owner panel). The owner's name / @username come from his users row — one point read, only when needed. */
async function ownerContact(env, rows) {
  if (!env.ADMIN_ID || !rows.some(c => c.nv_at > 0 && c.nv_contact)) return null;
  return env.DB.prepare("SELECT tg_id, first_name, username FROM users WHERE tg_id = ?1").bind(Number(env.ADMIN_ID)).first();
}
function contactOf(c, oc) {
  return oc && c.nv_at > 0 && c.nv_contact ? oc : { tg_id: c.tg_id, first_name: c.first_name, username: c.username };
}

/** The shared chat used for a report (decides which moderators see it), only for people the reporter may see. */
export async function reportTarget(env, id, pub) {
  const f = await findTarget(env, id, pub);
  if (f) return f.c.chat_id == null && f.c.via_uni ? { tg_id: f.c.tg_id, chat_id: f.c.uni_chat, chat_id2: f.c.my_uni_chat }   // both chats' moderators
    : { tg_id: f.c.tg_id, chat_id: f.c.chat_id };
  const m = await mutualRow(env, id, pub);
  if (!m) return null;
  const ch = await env.DB.prepare(`SELECT me.chat_id FROM memberships me JOIN memberships o ON o.chat_id = me.chat_id
      WHERE me.tg_id = ?1 AND o.tg_id = ?2 LIMIT 1`).bind(id, m.tg_id).first();
  return { tg_id: m.tg_id, chat_id: ch ? ch.chat_id : null };
}

/** Why the list is empty — counts only: people of your chats who opened the bot, ready profiles you could see
    (chats or open space), and whether open space is on. -> { in_chats, ready, space } */
async function visibility(env, id, ready) {
  const r = await env.DB.prepare(`SELECT COUNT(DISTINCT b.tg_id) AS n, (SELECT open_space FROM users WHERE tg_id = ?1) AS space,
      (SELECT COUNT(*) FROM memberships WHERE tg_id = ?1 AND member = 1) AS my_chats
      FROM memberships a JOIN memberships b ON b.chat_id = a.chat_id AND b.tg_id != a.tg_id AND b.member = 1
      JOIN chats ch ON ch.chat_id = a.chat_id AND ch.active = 1 AND ch.blocked = 0
      WHERE a.tg_id = ?1 AND a.member = 1 AND b.tg_id != ?2`).bind(id, Number(env.ADMIN_ID || 0)).first();
  return { in_chats: r ? r.n : 0, ready, space: !!(r && r.space), my_chats: r ? r.my_chats : 0 };
}

/** Admin diagnostics: how many neighbours this person sees right now, and why not more. */
export async function visibilityFor(env, id) {
  const v = await viewerRow(env, id);
  if (!v) return null;
  const S = await seenNow(env, id);
  if (S) await S.snap.save();
  const all = S ? S.rows : [];
  const off = await filtersOff(env);
  const sees = all.filter(c => mutual(v, c, null, off)).length;
  const st = await visibility(env, id, all.length);
  return { ...st, sees };
}

/* ---------- «Посмотреть на Kinkosmos»: the person's checklist as a share link (it lands in the site's «Received») ---------- */
const SITE = "https://klevatess.github.io/kinkmatch/";
const ANS_NAME = ["", "limit", "maybe", "yes", "love"];

/** row: { enc, role, experience, relation, nick } -> a link like the site's own «Share» link (no name, no ids). */
export async function siteLinkOf(env, row, lang) {
  const v = views(JSON.parse(await decrypt(env.DATA_KEY, row.enc)));
  const items = {};
  if (v.ext) { for (let c = 0; c < v.top.length; c++) if ((v.top[c] || v.bottom[c]) && ID_OF[c]) items[ID_OF[c]] = { t: ANS_NAME[v.top[c]] || undefined, b: ANS_NAME[v.bottom[c]] || undefined }; }
  else for (let c = 0; c < v.plain.length; c++) if (v.plain[c] && ID_OF[c]) items[ID_OF[c]] = { interest: ANS_NAME[v.plain[c]] };
  const st = { items, ext: v.ext ? 1 : 0, meta: { role: row.role === "top" ? "dom" : row.role === "bottom" ? "sub" : null, exp: row.experience || null, rel: row.relation || null } };
  if (row.nick) st.name = row.nick;
  return SITE + "#" + KC.codec.encode(st, lang || undefined) + "&go=stars";   // owner, 2026-10-20: the site opens right at the portrait / constellation
}

/** GET /api/kslink?id=[&embed=1] — allowed when the comparison is allowed (before yes if they allow it, always after a mutual
    yes). embed: the site's «Портрет» block of this list inside the app (owner, 2026-10-24; site v649 «&embed=other»:
    «Портрет: name», no picture card, nothing sent from there). */
export async function kslink(env, id, pub, embed, lang) {
  const f = await allowed(env, id, pub);
  if (f.error) return f;
  return { ok: true, nick: f.c.nick || "", link: (await siteLinkOf(env, f.c, lang)) + (embed ? "&embed=other" : "") };
}

/** For the weekly digest: neighbours who became visible (activated) since `since`, and new mutual yes. */
export async function newSince(env, id, since) {
  const v = await viewerRow(env, id);
  if (!v || v.paused) return { neighbours: 0, mutual: 0 };
  const off = await filtersOff(env);
  const S = await seenNow(env, id);
  if (S) await S.snap.save();
  const neighbours = (S ? S.rows : []).filter(c => mutual(v, c, null, off) && (c.activated_at || 0) > since).length;
  const m = await env.DB.prepare(`SELECT COUNT(*) AS n FROM answers a JOIN answers b ON b.a = a.b AND b.b = a.a AND b.value = 'yes'
      WHERE a.a = ?1 AND a.value = 'yes' AND MAX(a.created_at, b.created_at) > ?2`).bind(id, since).first("n");
  return { neighbours, mutual: m || 0 };
}

/** owner, 2026-10-27: for the come-back message — people this person may see who reached the map since `since` and are
    within `km` (zone centres; the distance itself is never told). */
export async function newNearby(env, id, since, km) {
  const v = await viewerRow(env, id);
  if (!v || v.paused) return 0;
  const off = await filtersOff(env), [vc, vr] = shownCell(v);
  const S = await seenNow(env, id);
  if (S) await S.snap.save();
  return (S ? S.rows : []).filter(c => mutual(v, c, null, off) && (c.activated_at || 0) > since && kmBetween(vc, vr, ...shownCell(c)) <= km).length;
}

/** owner, 2026-10-27: for a reminder before the map (there is no place yet, so no distance): people on the map in the
    person's connected chats; with no chats — people in open space. -> { n, where: "chats" | "space" } */
export async function seenPool(env, id) {
  const owner = Number(env.ADMIN_ID || 0);
  const chats = await env.DB.prepare(`SELECT COUNT(DISTINCT b.tg_id) AS n, (SELECT COUNT(*) FROM memberships WHERE tg_id = ?1 AND member = 1) AS mine
      FROM memberships a JOIN chats ch ON ch.chat_id = a.chat_id AND ch.active = 1 AND ch.blocked = 0
      JOIN memberships b ON b.chat_id = a.chat_id AND b.tg_id != a.tg_id AND b.member = 1 AND b.show = 1
      JOIN users u ON u.tg_id = b.tg_id AND u.status = 'active' AND u.idle_stage = 0 JOIN locations l ON l.tg_id = b.tg_id JOIN profiles p ON p.tg_id = b.tg_id AND p.paused = 0
      WHERE a.tg_id = ?1 AND a.member = 1 AND b.tg_id != ?2`).bind(id, owner).first();
  if (chats && chats.mine) return { n: chats.n || 0, where: "chats" };
  const sp = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users u JOIN locations l ON l.tg_id = u.tg_id JOIN profiles p ON p.tg_id = u.tg_id AND p.paused = 0
      WHERE u.open_space = 1 AND u.status = 'active' AND u.idle_stage = 0 AND u.tg_id != ?1 AND u.tg_id != ?2`).bind(id, owner).first("n");
  return { n: sp || 0, where: "space" };
}
