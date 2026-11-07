/* src/extra.js — the November 2026 batch (owner, 2026-11-07):
   - the person's own profile link (t.me/<bot>?start=p_<code>): a short teaser for people who cannot see the person;
   - «Подозрительная анкета» — the owner's mark, shown to others on the card; the person is NOT told;
   - the owner's «Сообщения» (messages sent with a like), page by page, every page in the journal;
   - the owner's «Видимость: почему» — why a person does not see the others (counts only);
   - the owner's «Отправить всем» (through the outbox; the panel pushes the batches while it is open). */

import * as db from "./db.js";
import { now } from "./db.js";
import { decrypt } from "./crypto.js";
import { views } from "./score.js";
import { portrait } from "./insight.js";
import { shownAge, ageOf, showsGender } from "./profile.js";
import { parse as parseInts } from "./interests.js";
import { genderOk, mutual } from "./neighbours.js";
import { filtersOff } from "./debug.js";
import { enqueue, flush } from "./universe.js";
import { callForm } from "./tg.js";
import * as LM from "./likemsg.js";
import * as SS from "./seenset.js";

/* ---------- profile link ---------- */

export const PLINK_RE = /^[a-z2-9]{8}$/;
export const PLINK_TRIES_PER_DAY = 60;
const ABC = "abcdefghijkmnpqrstuvwxyz23456789";
function newCode() {
  const b = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(b, x => ABC[x % ABC.length]).join("");
}

/** GET /api/plink → { ok, code } (made on the first request); POST /api/plink { renew: true } → a new code, the old one stops */
export async function myLink(env, id, renew) {
  if (!renew) {
    const r = await env.DB.prepare("SELECT code FROM profile_links WHERE tg_id = ?1 AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1").bind(id).first("code");
    if (r) return { ok: true, code: r };
  }
  const p = await env.DB.prepare("SELECT 1 AS x FROM profiles WHERE tg_id = ?1").bind(id).first();
  if (!p) return { error: "no_profile" };
  const t0 = now();
  let code = newCode();
  for (let i = 0; i < 3 && (await env.DB.prepare("SELECT 1 AS x FROM profile_links WHERE code = ?1").bind(code).first()); i++) code = newCode();
  await env.DB.batch([
    env.DB.prepare("UPDATE profile_links SET revoked_at = ?2 WHERE tg_id = ?1 AND revoked_at IS NULL").bind(id, t0),
    env.DB.prepare("INSERT INTO profile_links (code, tg_id, created_at) VALUES (?1, ?2, ?3)").bind(code, id, t0),
  ]);
  return { ok: true, code };
}

/** owner, 2026-11-07: the first words of «О себе» for the teaser — 45 characters; a shorter text gives 70 % of itself;
    never a word cut in the middle. */
export function aboutSnippet(text) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  const chars = Array.from(s);
  const want = chars.length > 45 ? 45 : Math.floor(chars.length * 0.7);
  if (want < 1) return "";
  let cut = chars.slice(0, want).join("");
  if (chars[want] && chars[want] !== " ") {            // inside a word: back to the last space
    const sp = cut.lastIndexOf(" ");
    cut = sp > 0 ? cut.slice(0, sp) : "";
  }
  cut = cut.replace(/[\s,.;:!?—-]+$/u, "");
  return cut ? cut + "…" : "";
}

/** GET /api/plink/open?c=CODE → { ok, mode: "full", id } when the viewer may see the person (the app opens the card),
    { ok, mode: "teaser", teaser } otherwise, { error: "gone" } for an old or unknown code. Any Telegram user may ask
    (also before registration); lookups are limited per day. */
export async function openLink(env, viewer, code, lang) {
  if (!PLINK_RE.test(String(code || ""))) return { error: "gone" };
  const day = Math.floor(now() / 86400);
  const tries = await env.DB.prepare(`INSERT INTO plink_tries (tg_id, day, n) VALUES (?1, ?2, 1)
      ON CONFLICT (tg_id, day) DO UPDATE SET n = n + 1 RETURNING n`).bind(viewer, day).first("n");
  if (tries > PLINK_TRIES_PER_DAY) return { error: "too_many" };
  const l = await env.DB.prepare("SELECT tg_id FROM profile_links WHERE code = ?1 AND revoked_at IS NULL").bind(code).first();
  if (!l) return { error: "gone" };
  const p = await env.DB.prepare(`SELECT u.pub_id, u.status, p.nick, p.gender, p.birth_date, p.age_exact, p.about, p.about_public, p.about_hidden,
      p.interests, p.paused, c.role, c.enc FROM users u JOIN profiles p ON p.tg_id = u.tg_id LEFT JOIN checklists c ON c.tg_id = u.tg_id
      WHERE u.tg_id = ?1`).bind(l.tg_id).first();
  if (!p || p.status !== "active" || p.paused) return { error: "gone" };
  const self = Number(l.tg_id) === Number(viewer);
  if (!self && String(viewer) !== String(env.ADMIN_ID || "")) {
    const seen = await SS.one(env, viewer, l.tg_id);   // the normal rule: the full card only if the list would show them
    if (seen) {
      const v = await env.DB.prepare(`SELECT u.status, p.gender, p.show_genders, p.birth_date, p.age_min, p.age_max FROM users u JOIN profiles p ON p.tg_id = u.tg_id
          WHERE u.tg_id = ?1`).bind(viewer).first();
      if (v && v.status === "active" && !(seen.hidden_until > now()) && mutual(v, seen, null, await filtersOff(env))) return { ok: true, mode: "full", id: p.pub_id };
    }
  }
  let groups = [];
  if (p.enc) {
    try {
      const w = views(JSON.parse(await decrypt(env.DATA_KEY, p.enc)));
      const vec = w.ext ? w.top.map((x, i) => Math.max(x || 0, w.bottom[i] || 0)) : w.plain;
      groups = portrait(vec, lang).filter(g => g.pct != null).sort((a, b) => b.pct - a.pct).slice(0, 3).map(g => ({ name: g.name, pct: g.pct }));
    } catch (e) { groups = []; }
  }
  return { ok: true, mode: "teaser", self, teaser: {
    nick: p.nick || "", gender: p.gender, age_bucket: shownAge(p.birth_date, p.age_exact), role: p.role || null,
    groups, interests: parseInts(p.interests).slice(0, 2),
    about: p.about_public && !p.about_hidden ? aboutSnippet(p.about) : "",
  } };
}

/* ---------- «Подозрительная анкета» ---------- */

export const SUS_REASONS = ["fake", "behaviour", "check", "other"];
export const SUS_NOTE_MAX = 200;

/** POST /api/admin/sus { id: pub, on, reason, note } — the owner only; journal sus_set / sus_clear */
export async function setSus(env, ownerId, b) {
  const u = await env.DB.prepare("SELECT tg_id FROM users WHERE pub_id = ?1").bind(String((b && b.id) || "")).first();
  if (!u) return { error: "not_found" };
  if (b.on) {
    if (!SUS_REASONS.includes(b.reason)) return { error: "bad_reason" };
    const note = Array.from(String(b.note || "").replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, " ").replace(/\s+/g, " ").trim()).slice(0, SUS_NOTE_MAX).join("");
    await env.DB.prepare("UPDATE profiles SET sus_at = ?2, sus_reason = ?3, sus_note = ?4, sus_by = ?5 WHERE tg_id = ?1").bind(u.tg_id, now(), b.reason, note || null, ownerId).run();
    await db.audit(env, ownerId, "sus_set", "#" + b.id + " " + b.reason);
  } else {
    await env.DB.prepare("UPDATE profiles SET sus_at = NULL, sus_reason = NULL, sus_note = NULL, sus_by = NULL WHERE tg_id = ?1").bind(u.tg_id).run();
    await db.audit(env, ownerId, "sus_clear", "#" + b.id);
  }
  return { ok: true };
}
/** for the owner's person card */
export async function susOf(env, tg) {
  const r = await env.DB.prepare("SELECT sus_at, sus_reason, sus_note FROM profiles WHERE tg_id = ?1").bind(tg).first();
  return r && r.sus_at ? { at: r.sus_at, reason: r.sus_reason, note: r.sus_note || "" } : null;
}

/* ---------- «Сообщения» ---------- */

export const MSG_PAGE = 20;
/** GET /api/admin/likemsgs?before=<created_at>:<a>:<b> → the newest messages with a like, a page at a time (keyset). */
export async function likeMessages(env, ownerId, before) {
  const m = /^(\d+):(\d+):(\d+)$/.exec(String(before || ""));
  const r = m
    ? await env.DB.prepare(`SELECT a, b, enc, created_at FROM like_msgs WHERE (created_at, a, b) < (?1, ?2, ?3)
        ORDER BY created_at DESC, a DESC, b DESC LIMIT ?4`).bind(Number(m[1]), Number(m[2]), Number(m[3]), MSG_PAGE).all()
    : await env.DB.prepare("SELECT a, b, enc, created_at FROM like_msgs ORDER BY created_at DESC, a DESC, b DESC LIMIT ?1").bind(MSG_PAGE).all();
  const rows = r.results || [];
  const ids = [...new Set(rows.flatMap(x => [x.a, x.b]))];
  const who = ids.length ? await env.DB.prepare("SELECT u.tg_id, u.pub_id, p.nick FROM users u LEFT JOIN profiles p ON p.tg_id = u.tg_id WHERE u.tg_id IN (SELECT value FROM json_each(?1))")
    .bind(JSON.stringify(ids)).all() : { results: [] };
  const byId = new Map((who.results || []).map(x => [Number(x.tg_id), x]));
  const items = [];
  for (const x of rows) {
    const a = byId.get(Number(x.a)) || {}, b = byId.get(Number(x.b)) || {};
    items.push({ at: x.created_at, from: { id: a.pub_id || null, nick: a.nick || "" }, to: { id: b.pub_id || null, nick: b.nick || "" }, text: await LM.textOf(env, x.enc) });
  }
  if (items.length) await db.audit(env, ownerId, "like_msg_read", String(items.length) + (m ? " (more)" : ""));
  const last = rows[rows.length - 1];
  return { ok: true, items, next: rows.length === MSG_PAGE && last ? `${last.created_at}:${last.a}:${last.b}` : null };
}

/* ---------- «Видимость: почему» ---------- */

/** GET /api/admin/whynot?id=<pub>&dir=sees|seen → { ok, total, ok_n, reasons: [{ key, n, all }] } — every other ready person
    counted once by the first reason in a fixed order (so the rows add up to the gap), plus how many have each reason at
    all. Counts only, nobody is named. Runs only on the owner's tap. */
export const WHY_ORDER = ["road", "hidden", "gender_his", "gender_their", "age", "not_now"];
export async function whyNot(env, pub, dir) {
  const me = await env.DB.prepare(`SELECT u.tg_id, p.gender, p.show_genders, p.birth_date, p.age_min, p.age_max FROM users u JOIN profiles p ON p.tg_id = u.tg_id
      WHERE u.pub_id = ?1`).bind(String(pub || "")).first();
  if (!me) return { error: "not_found" };
  const seenBy = dir === "seen";
  const all = await env.DB.prepare(`SELECT u.tg_id, u.hidden_until, p.gender, p.show_genders, p.birth_date, p.age_min, p.age_max FROM users u
      JOIN profiles p ON p.tg_id = u.tg_id JOIN locations l ON l.tg_id = u.tg_id JOIN checklists c ON c.tg_id = u.tg_id
      WHERE u.status = 'active' AND u.idle_stage = 0 AND p.paused = 0 AND u.tg_id != ?1 AND u.tg_id != ?2`).bind(me.tg_id, Number(env.ADMIN_ID || 0)).all();
  const people = all.results || [];
  const roads = new Set(((await SS.rebuild(env, me.tg_id)) || []).map(r => Number(r.tg_id)));   // the rule (chats, space, universe) — symmetric
  const nn = await env.DB.prepare(seenBy ? "SELECT a AS k FROM answers WHERE b = ?1 AND value = 'no'" : "SELECT b AS k FROM answers WHERE a = ?1 AND value = 'no'").bind(me.tg_id).all();
  const notNow = new Set((nn.results || []).map(x => Number(x.k)));
  const t0 = now();
  const meHidden = !!(await env.DB.prepare("SELECT hidden_until FROM users WHERE tg_id = ?1").bind(me.tg_id).first("hidden_until") > t0);
  const counts = Object.fromEntries(WHY_ORDER.map(k => [k, { n: 0, all: 0 }]));
  let okN = 0;
  for (const o of people) {
    const viewer = seenBy ? o : me, other = seenBy ? me : o;
    const why = [];
    if (!roads.has(Number(o.tg_id))) why.push("road");
    if ((seenBy ? meHidden : o.hidden_until > t0)) why.push("hidden");
    if (!genderOk(viewer, other)) {
      // whose choice stops it: the viewer's own (gender_his) or the other one's (gender_their)
      const vs = JSON.parse(viewer.show_genders || "[]"), os = JSON.parse(other.show_genders || "[]");
      if (!showsGender(vs, other.gender)) why.push("gender_his"); else if (!showsGender(os, viewer.gender)) why.push("gender_their"); else why.push("gender_his");
    }
    const age = ageOf(other.birth_date);
    if (age < (viewer.age_min || 18) || age > (viewer.age_max || 99)) why.push("age");
    if (notNow.has(Number(o.tg_id))) why.push("not_now");
    if (!why.length) { okN++; continue; }
    counts[why[0]].n++;
    for (const k of why) counts[k].all++;
  }
  return { ok: true, dir: seenBy ? "seen" : "sees", total: people.length, ok_n: okN, reasons: WHY_ORDER.map(k => ({ key: k, ...counts[k] })) };
}

/* ---------- «Отправить всем» ---------- */

export const BC_MAX = 3500;
export const BC_AUDIENCES = ["active", "consent", "all"];
const BC_WHERE = {
  active: "u.status = 'active'",
  consent: "u.consent_at IS NOT NULL AND u.status IN ('active', 'draft')",
  all: "u.status IN ('active', 'draft', 'new', 'hidden')",
};
async function bcRecipients(env, audience) {
  const r = await env.DB.prepare(`SELECT u.tg_id FROM users u WHERE ${BC_WHERE[audience]} AND u.tg_id != ?1`).bind(Number(env.ADMIN_ID || 0)).all();
  return (r.results || []).map(x => x.tg_id);
}
/** GET /api/admin/broadcast?audience= → { ok, count, waiting, last } */
export async function bcInfo(env, audience) {
  const a = BC_AUDIENCES.includes(audience) ? audience : "active";
  const count = (await bcRecipients(env, a)).length;
  const waiting = await env.DB.prepare("SELECT COUNT(*) AS n FROM outbox WHERE kind = 'bc'").first("n");
  const last = await env.DB.prepare("SELECT id, audience, total, created_at FROM broadcasts ORDER BY id DESC LIMIT 1").first();
  return { ok: true, audience: a, count, waiting: waiting || 0, last: last || null };
}
/** POST /api/admin/broadcast { text, audience, button } → the messages go into the outbox; the panel then calls
    POST /api/admin/broadcast-push until waiting = 0 (the hourly job sends what is left if the panel is closed). */
export async function bcSend(env, ownerId, b, appUrl, buttonText) {
  const text = String((b && b.text) || "").replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  if (!text) return { error: "empty" };
  if (Array.from(text).length > BC_MAX) return { error: "too_long" };
  const audience = BC_AUDIENCES.includes(b.audience) ? b.audience : "active";
  const waiting = await env.DB.prepare("SELECT COUNT(*) AS n FROM outbox WHERE kind = 'bc'").first("n");
  if (waiting) return { error: "busy" };   // one broadcast at a time
  const ids = await bcRecipients(env, audience);
  if (!ids.length) return { error: "nobody" };
  // the text is the owner's own, sent as plain text: Telegram HTML special characters are escaped
  const html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const markup = b.button && appUrl ? { inline_keyboard: [[{ text: buttonText, web_app: { url: appUrl } }]] } : null;
  const photo = b.photo == null || b.photo === "" ? null : String(b.photo);
  if (photo && !PHOTO_RE.test(photo)) return { error: "bad_photo" };
  await env.DB.prepare("INSERT INTO broadcasts (text, audience, button, total, created_at, photo) VALUES (?1, ?2, ?3, ?4, ?5, ?6)").bind(text, audience, markup ? 1 : 0, ids.length, now(), photo).run();
  await enqueue(env, ids.map(tg => ({ tg_id: tg, kind: "bc", text: html, markup, photo })));
  await db.audit(env, ownerId, "broadcast", audience + " · " + ids.length);
  return { ok: true, total: ids.length };
}
const PHOTO_RE = /^[A-Za-z0-9_-]{1,250}$/, PHOTO_MAX = 5 * 1024 * 1024, PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** POST /api/admin/broadcast-photo (the image bytes as the body) → sent to the owner's own chat once (this is also the
    preview of how it arrives); Telegram's file_id is what the broadcast then sends to everyone. Nothing kept on our side. */
export async function bcPhoto(env, ownerId, req) {
  const type = String(req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!PHOTO_TYPES.includes(type)) return { error: "bad_type" };
  const len = Number(req.headers.get("content-length") || 0);
  if (len > PHOTO_MAX) return { error: "too_big" };
  const buf = await req.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > PHOTO_MAX) return { error: buf.byteLength ? "too_big" : "empty" };
  const form = new FormData();
  form.append("chat_id", String(ownerId));
  form.append("disable_notification", "true");
  form.append("photo", new Blob([buf], { type }), "broadcast." + type.split("/")[1]);
  const r = await callForm(env, "sendPhoto", form);
  const sizes = r && r.ok && r.result && r.result.photo;
  if (!sizes || !sizes.length) return { error: "tg_failed" };
  const best = sizes[sizes.length - 1];
  await db.audit(env, ownerId, "broadcast_photo", best.width + "×" + best.height);
  return { ok: true, photo: best.file_id, width: best.width, height: best.height };
}
/** POST /api/admin/broadcast-push → sends the next batch (a Worker request may call Telegram ~45 times) */
export async function bcPush(env) {
  await flush(env, 25);
  const waiting = await env.DB.prepare("SELECT COUNT(*) AS n FROM outbox WHERE kind = 'bc'").first("n");
  return { ok: true, waiting: waiting || 0 };
}
