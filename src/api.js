/* src/api.js — the Mini App's API. Every call: header  Authorization: tma <initData>  (checked in webapp.js).
     GET  /api/me                everything the app needs to draw itself
     POST /api/consent           { consent:true, birth_date:"YYYY-MM-DD", gender }
     POST /api/checklist         { link }
     GET  /api/fill[?fresh=1]    the Kinkosmos form to fill in inside the bot (draft → saved list → empty); POST /api/draft
     POST /api/profile           { looking_for[], show_genders[], age_min, age_max, about, about_public, nick,
                                   compare_before_yes, paused }
     POST /api/location          { lat, lon, radius: 1 | 3 }   — converted to an H3 cell at once, never stored or logged
     POST /api/settings          { chats: { "<chat id>": true|false }, lang: "ru"|"en", radius: 1|3, universe, uni_info_seen }
     POST /api/delete            { confirm: true, word: "Да" | "Yes" }
     GET  /api/neighbours        neighbours with rough distance bands, percent, zones for the map (active profiles only)
     GET  /api/person?id=        one neighbour's card;   GET /api/compare?id=  the full comparison (if they allow it)
     POST /api/answer            { id, value: "yes" | "no" | null }   — «Да, интересно» / «Не сейчас» / undo
     GET  /api/insight?id=       their portrait and answer counts;  GET /api/items  every practice;  GET /api/search?items=a,b
     GET  /api/matches           mutual yes: name, exact age, Telegram link (and proposals);  GET /api/propose?id=
     POST /api/propose           { id, items[], note };  POST /api/propose/cancel { id }
     POST /api/contact           { id }  — the bot sends a profile link in the private chat (no @username case)
     POST /api/report            { id, reason, text }
     /api/mod/*                  moderators and the owner (src/moderation.js);  /api/admin/*  the owner only
   Answers are JSON { ok:true, … } or { ok:false, error }. Nothing about the person is logged. */

import { checkInitData } from "./webapp.js";
import { checkMembership } from "./membership.js";
import { langOf } from "./i18n.js";
import * as db from "./db.js";
import * as P from "./profile.js";
import * as N from "./neighbours.js";
import * as S from "./share.js";
import * as D from "./draft.js";
import * as U from "./universe.js";
import * as PR from "./propose.js";
import { handleAdmin } from "./admin.js";
import * as STAR from "./stars.js";
import * as LK from "./links.js";
import { handleMod, handleOwnerMods, roleOf, report } from "./moderation.js";
import { clientLog, noauthLog, VERSION } from "./debug.js";
import * as ST from "./stats.js";
import * as INT from "./interests.js";
import { send, esc, getMe } from "./tg.js";
import { t } from "./i18n.js";

const json = (o, status) => new Response(JSON.stringify(o), {
  status: status || 200, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const fail = (error, status, extra) => json({ ok: false, error, ...(extra || {}) }, status || 400);

export async function handleApi(req, env, path) {
  // the app opened WITHOUT Telegram's sign-in data (in a browser, an old client…): no account, so only counts and the
  // environment, only while debug is on, at most 200 a day
  if (req.method === "POST" && path === "/api/debug/noauth") {
    let b; try { b = await req.json(); } catch (e) { b = {}; }
    return json(await noauthLog(env, b));
  }
  const auth = req.headers.get("authorization") || "";
  const check = await checkInitData(env.BOT_TOKEN, auth.startsWith("tma ") ? auth.slice(4) : "");
  if (!check.ok) return fail("unauthorized", 401);
  const from = check.user;
  const id = from.id;
  if (env.METER) env.METER.uid = id;   // owner, 2026-10-28: usage per person (src/usage.js)
  const isOwner = String(id) === String(env.ADMIN_ID || "");

  // the owner's account is the admin panel only (owner, 2026-10-19: as a participant they use another account)
  // the app's own errors / environment while the owner has debug on (any account)
  if (req.method === "POST" && path === "/api/debug/client") {
    let b; try { b = await req.json(); } catch (e) { b = {}; }
    const u = await db.getUser(env, id);
    return json(await clientLog(env, isOwner ? "owner" : (u && u.pub_id) || "new", b));
  }
  if (path.startsWith("/api/admin/")) {
    if (!isOwner) return fail("forbidden", 403);
    const u = await db.getUser(env, id);
    if (/^\/api\/admin\/(mods|invite|invite-revoke|mod-remove)$/.test(path)) return handleOwnerMods(req, env, path, id, json, fail);
    return handleAdmin(req, env, path, id, langOf(from.language_code, u && u.ui_lang), json, fail);
  }
  if (path.startsWith("/api/mod/")) {
    const u = await db.getUser(env, id);
    if (u && u.status === "banned") return fail("forbidden", 403);
    return handleMod(req, env, path, id, langOf(from.language_code, u && u.ui_lang), json, fail);
  }
  if (isOwner && req.method === "GET" && path === "/api/me") {
    await db.upsertUser(env, from);
    const u = await db.getUser(env, id);
    return json({ ok: true, admin: true, owner: true, lang: langOf(from.language_code, u && u.ui_lang), theme: (u && u.theme) || "auto", debug: !!env.DEBUG });
  }
  if (isOwner) {
    if (req.method === "POST" && path === "/api/settings") {
      let b; try { b = await req.json(); } catch (e) { b = {}; }
      if (b && (b.lang === "ru" || b.lang === "en")) await env.DB.prepare("UPDATE users SET ui_lang = ?2 WHERE tg_id = ?1").bind(id, b.lang).run();
      if (b && (b.theme === "auto" || b.theme === "light" || b.theme === "dark")) await env.DB.prepare("UPDATE users SET theme = ?2 WHERE tg_id = ?1").bind(id, b.theme === "auto" ? null : b.theme).run();
      return json({ ok: true, admin: true, owner: true, lang: b && (b.lang === "ru" || b.lang === "en") ? b.lang : "ru" });
    }
    if (req.method === "GET" && path === "/api/interests") return json(await INT.state(env, id));   // owner, 2026-10-28: the owner's screens name added items too
    return fail("admin_account", 403);
  }

  if (req.method === "GET" && path === "/api/me") return json(await me(env, from));
  if (req.method === "GET" && path === "/api/matches") {
    const u = await db.getUser(env, id);
    if (!u || u.status !== "active") return fail("not_active", 403);
    const lang = langOf(from.language_code, u.ui_lang), r = await N.matches(env, id, lang);
    if (r.ok) r.items = await PR.attach(env, id, lang, r.items);
    return json(r);
  }
  if (req.method === "GET" && /^\/api\/(insight|search|items|propose)$/.test(path)) {   // owner, 2026-10-24
    const u = await db.getUser(env, id);
    if (!u || u.status !== "active") return fail("not_active", 403);
    const lang = langOf(from.language_code, u.ui_lang), q = new URL(req.url).searchParams;
    const r = path === "/api/items" ? N.catalog(lang) : path === "/api/search" ? await N.search(env, id, q.get("items"))
      : path === "/api/insight" ? await N.insight(env, id, q.get("id"), lang) : await PR.choices(env, id, q.get("id"), lang);
    return r.error ? fail(r.error, r.error === "not_found" ? 404 : r.error === "bad_items" ? 400 : 403) : json(r);
  }
  if (req.method === "GET" && (path === "/api/neighbours" || path === "/api/person" || path === "/api/compare" || path === "/api/kslink" || path === "/api/list")) {
    const u = await db.getUser(env, id);
    if (!u || u.status !== "active") return fail("not_active", 403);
    const lang = langOf(from.language_code, u.ui_lang);
    const pub = new URL(req.url).searchParams.get("id");
    const r = path === "/api/neighbours" ? await N.neighbours(env, id, lang)
      : path === "/api/person" ? await N.person(env, id, pub, lang)
      : path === "/api/kslink" ? await N.kslink(env, id, pub, new URL(req.url).searchParams.get("embed") === "1", lang)
      : path === "/api/list" ? await N.listOf(env, id, pub, lang) : await N.compare(env, id, pub, lang);
    return r.error ? fail(r.error, r.error === "not_found" ? 404 : 403) : json(r);
  }
  if (req.method === "GET" && path === "/api/interests") {   // owner, 2026-10-28: added items, extra search words, own suggestions
    const u = await db.getUser(env, id);
    if (!u || u.status === "banned") return fail("not_found", 404);
    return json(await INT.state(env, id));
  }
  if (req.method === "GET" && path === "/api/mylink") {   // «Моё созвездие»: the person's own list for the site's portrait block
    const u = await db.getUser(env, id);
    if (!u || u.status === "banned") return fail("not_found", 404);
    const r = await S.mylink(env, id, langOf(from.language_code, u.ui_lang));
    return r.error ? fail(r.error, 404) : json(r);
  }
  if (req.method === "GET" && path === "/api/fill") {   // the form inside the bot (owner, 2026-10-20)
    const u = await db.getUser(env, id);
    if (!u || u.status === "banned") return fail("not_found", 404);
    return json(await D.fill(env, id, langOf(from.language_code, u.ui_lang), new URL(req.url).searchParams.get("fresh") === "1"));
  }
  if (req.method !== "POST") return fail("not_found", 404);

  let body;
  try { body = await req.json(); } catch (e) { return fail("bad_json"); }
  if (!body || typeof body !== "object") return fail("bad_json");

  // owner (2026-10-19): people outside the connected chats may use the bot too — they only get «open space»
  const user = await db.getUser(env, id);
  if (!user) return fail("no_user", 403);
  if (user.status === "banned" && path !== "/api/delete") return fail("banned", 403);

  let r;
  switch (path) {
    case "/api/consent": r = await P.saveConsent(env, id, body); if (r.ok) await STAR.applyPending(env, id); break;   // owner, 2026-10-27: a star given in advance
    case "/api/checklist": r = await P.saveChecklist(env, id, body.link); if (r.ok) { await N.dropScores(env, id); await D.clearDraft(env, id); } break;   // a saved list replaces any draft
    case "/api/draft": r = await D.saveDraft(env, id, body); if (r.ok) return json(r); break;   // light: no /api/me after a draft
    case "/api/profile": {
      r = await P.saveProfile(env, id, body);
      if (r.ok) {
        // owner, 2026-10-21: «Где вас видно» on the profile step (shown only when one of the person's chats is in the universe)
        if (typeof body.universe === "boolean") await U.setChoice(env, id, body.universe);
        // someone in no connected chat is put in open space on the profile step (told there; can be turned off)
        if (body.space_default === true) {
          const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM memberships m JOIN chats ch ON ch.chat_id = m.chat_id AND ch.active = 1 AND ch.blocked = 0
              WHERE m.tg_id = ?1 AND m.member = 1`).bind(id).first("n");
          if (!n) await env.DB.prepare("UPDATE users SET open_space = 1 WHERE tg_id = ?1").bind(id).run();
        }
      }
      break;
    }
    case "/api/star-links": r = await LK.edit(env, id, body); break;   // owner, 2026-10-27
    case "/api/interests": r = await INT.save(env, id, body.items, body.hidden); if (r.error) return fail(r.error, 400, r.tab ? { tab: r.tab, max: r.max } : undefined); break;   // owner, 2026-10-28
    case "/api/suggest": r = await INT.suggest(env, id, body); if (r.ok) return json(r); break;
    case "/api/link-click": return json(await LK.click(env, id, body.id));
    case "/api/seen": return json(await N.seen(env, id, body.id));   // owner, 2026-10-28: the «новый» badge goes once the profile is opened
    case "/api/step": return json(await ST.step(env, id, String(body.s || "")));   // owner, 2026-10-27: registration screens
    case "/api/location": r = await P.saveLocation(env, id, body.lat, body.lon, body.radius); break;
    case "/api/settings": r = await saveSettings(env, id, body); break;
    case "/api/share": r = await S.share(env, id, body, langOf(from.language_code, user.ui_lang)); if (r.ok) return json(r); break;
    case "/api/answer": {
      if (user.status !== "active") return fail("not_active", 403);
      r = await N.answer(env, id, body.id, body.value === undefined ? null : body.value, body.via);
      if (r.other) await tellMutual(env, id, r.other);
      if (r.broke) await PR.dropPair(env, id, r.target);   // owner, 2026-10-24: proposals go when the mutual yes ends
      else if (r.liked) await tellLiked(env, r.target, id);
      if (r.ok) return json({ ok: true, mutual: r.mutual });
      break;
    }
    case "/api/propose":
    case "/api/propose/cancel": {
      if (user.status !== "active") return fail("not_active", 403);
      r = path === "/api/propose" ? await PR.sendProposal(env, id, body) : await PR.cancel(env, id, body.id);
      if (r.ok) return json(r);
      break;
    }
    case "/api/kslink-send": {   // owner, 2026-10-24: «Прислать ссылку на Kinkosmos в чат с ботом»
      if (user.status !== "active") return fail("not_active", 403);
      const lang = langOf(from.language_code, user.ui_lang);
      const k = await N.kslink(env, id, body.id, false, lang);
      if (k.error) return fail(k.error, k.error === "not_found" ? 404 : 403);
      const who = k.nick ? "«" + esc(k.nick) + "»" : t("ksLinkSomeone", null, lang);
      const j = await send(env, id, t("ksLinkMsg", { who, link: '<a href="' + esc(k.link) + '">' + t("ksLinkOpen", null, lang) + "</a>" }, lang));
      return j && j.ok ? json({ ok: true, sent: true }) : fail("send_failed", 502);
    }
    case "/api/contact": {
      const c = await N.mutualContact(env, id, body.id);
      if (!c) return fail("not_found", 404);
      const lang = langOf(from.language_code, user.ui_lang);
      const link = c.username ? "https://t.me/" + c.username : "tg://user?id=" + c.tg_id;
      await send(env, id, t("contact", { link: '<a href="' + link + '">' + esc(c.name || t("contactName", null, lang)) + "</a>" }, lang));
      return json({ ok: true, sent: true });
    }
    case "/api/report":
      if (user.status === "banned" && path !== "/api/delete") return fail("banned", 403);
      r = await report(env, id, body);
      if (r.ok) return json(r);
      break;
    case "/api/delete":
      // owner, 2026-10-26: two confirmations in the app, the second by typing «Да» / «Yes»
      if (body.confirm !== true || !/^(да|yes)$/i.test(String(body.word || "").trim())) return fail("no_confirm");
      await PR.dropAll(env, id);
      await P.deleteAccount(env, id);
      if (env.METER) env.METER.uid = null;   // owner, 2026-10-28: this request must not write a usage row back
      return json({ ok: true, deleted: true });
    default: return fail("not_found", 404);
  }
  if (r.error) return fail(r.error, 400, r.next ? { next: r.next } : r.need ? { answered: r.answered, need: r.need } : undefined);
  return json(await me(env, from, true));
}

/** A mutual yes just happened: both get a private message (each in their language). */
async function tellMutual(env, a, b) {
  for (const who of [a, b]) {
    const u = await db.getUser(env, who);
    const lang = langOf(u && u.lang, u && u.ui_lang);
    const log = console.log; console.log = () => {};   // a person who blocked the bot: nothing to do
    try {
      await send(env, who, t("mutualYes", null, lang), { reply_markup: { inline_keyboard: [[{ text: t("openApp", null, lang), web_app: { url: (env.ORIGIN || "") + "/app/" } }]] } });
    } finally { console.log = log; }
  }
}

export const LIKE_NOTE_EVERY = 600;
/** Someone answered «yes» (not mutual yet): the person is told right away WHO by nickname (owner, 2026-10-19 — like other
    apps; the card is in the app, the name and Telegram open only after a mutual yes). At most one message in 10 minutes. */
async function tellLiked(env, to, from) {
  // owner, 2026-10-21: what happened to the message goes into the «да» log (the owner sees it in «Взаимности → «Да»»)
  const note = async v => env.DB.prepare("UPDATE answer_log SET note = ?3 WHERE id = (SELECT MAX(id) FROM answer_log WHERE a = ?1 AND b = ?2 AND value = 'yes')").bind(from, to, v).run();
  const t0 = Math.floor(Date.now() / 1000);
  const st = await env.DB.prepare("SELECT status, notify_likes, last_like_note, lang, ui_lang FROM users WHERE tg_id = ?1").bind(to).first();
  if (!st) return note("inactive");
  if (st.notify_likes !== 1) return note("off");
  if (st.status !== "active") return note("inactive");
  const u = await env.DB.prepare(`UPDATE users SET last_like_note = ?2 WHERE tg_id = ?1
      AND (last_like_note IS NULL OR last_like_note < ?3) RETURNING lang, ui_lang, likes_pending`).bind(to, t0, t0 - LIKE_NOTE_EVERY).first();
  if (!u) {   // one went out less than 10 minutes ago: this one is told later, with the others (hourly job, sendPendingLikes)
    await env.DB.prepare("UPDATE users SET likes_pending = likes_pending + 1 WHERE tg_id = ?1").bind(to).run();
    return note("later");
  }
  const lang = langOf(u.lang, u.ui_lang);
  const p = await env.DB.prepare("SELECT nick, gender FROM profiles WHERE tg_id = ?1").bind(from).first();
  const who = p && p.nick ? "«" + esc(p.nick) + "»" : t("someone", null, lang);
  const more = u.likes_pending ? "\n" + t("likeMore", { n: u.likes_pending }, lang) : "";
  const log = console.log; console.log = () => {};
  let r;
  try {
    r = await send(env, to, t("likeNote", { who }, lang) + more, { reply_markup: { inline_keyboard: [[{ text: t("openApp", null, lang), web_app: { url: (env.ORIGIN || "") + "/app/" } }]] } });
  } finally { console.log = log; }
  if (r && r.ok && u.likes_pending) await env.DB.prepare("UPDATE users SET likes_pending = 0 WHERE tg_id = ?1").bind(to).run();
  return note(r && r.ok ? "sent" : "failed");
}

/** Hourly: «да» that waited because another message had just gone out — one message «ещё N», at most every 10 minutes. */
export async function sendPendingLikes(env) {
  const t0 = Math.floor(Date.now() / 1000);
  const r = await env.DB.prepare(`SELECT tg_id, lang, ui_lang, likes_pending FROM users WHERE likes_pending > 0 AND notify_likes = 1 AND status = 'active'
      AND (last_like_note IS NULL OR last_like_note < ?1) LIMIT 30`).bind(t0 - LIKE_NOTE_EVERY).all();
  for (const u of r.results || []) {
    const lang = langOf(u.lang, u.ui_lang);
    const j = await send(env, u.tg_id, t("likePending", { n: u.likes_pending }, lang), { reply_markup: { inline_keyboard: [[{ text: t("openApp", null, lang), web_app: { url: (env.ORIGIN || "") + "/app/" } }]] } });
    await env.DB.prepare("UPDATE users SET likes_pending = ?2, last_like_note = ?3 WHERE tg_id = ?1").bind(u.tg_id, j && j.ok ? 0 : u.likes_pending, t0).run();
  }
  return (r.results || []).length;
}

async function saveSettings(env, id, b) {
  const ops = [];
  if (b.chats && typeof b.chats === "object") {
    for (const [chatId, on] of Object.entries(b.chats).slice(0, 50)) {
      if (!/^-?\d{1,20}$/.test(chatId) || typeof on !== "boolean") continue;
      ops.push(env.DB.prepare("UPDATE memberships SET show = ?3 WHERE tg_id = ?1 AND chat_id = ?2").bind(id, Number(chatId), on ? 1 : 0));
    }
  }
  if (b.lang === "ru" || b.lang === "en") ops.push(env.DB.prepare("UPDATE users SET ui_lang = ?2 WHERE tg_id = ?1").bind(id, b.lang));
  if (b.theme === "auto" || b.theme === "light" || b.theme === "dark") ops.push(env.DB.prepare("UPDATE users SET theme = ?2 WHERE tg_id = ?1").bind(id, b.theme === "auto" ? null : b.theme));   // owner, 2026-10-26
  if (typeof b.notify_likes === "boolean") ops.push(env.DB.prepare("UPDATE users SET notify_likes = ?2 WHERE tg_id = ?1").bind(id, b.notify_likes ? 1 : 0));
  if (typeof b.digest === "boolean") ops.push(env.DB.prepare("UPDATE users SET digest = ?2, digest_asked = 1, last_digest = COALESCE(last_digest, ?3) WHERE tg_id = ?1").bind(id, b.digest ? 1 : 0, Math.floor(Date.now() / 1000)));
  if (typeof b.open_space === "boolean") ops.push(env.DB.prepare("UPDATE users SET open_space = ?2 WHERE tg_id = ?1").bind(id, b.open_space ? 1 : 0));
  ops.push(...STAR.settingsOps(env, id, b));   // owner, 2026-10-27: «Показывать звезду», «Подпись под ником»
  if (b.uni_info_seen === true) ops.push(env.DB.prepare("UPDATE users SET uni_info_seen = 1 WHERE tg_id = ?1").bind(id));
  if (b.ints_banner_off === true) ops.push(env.DB.prepare("UPDATE users SET ints_banner_off = 1 WHERE tg_id = ?1").bind(id));   // owner, 2026-10-28
  if (ops.length) await env.DB.batch(ops);
  if (typeof b.universe === "boolean") await U.setChoice(env, id, b.universe);   // owner, 2026-10-21
  if (b.radius === 1 || b.radius === 3) { const r = await P.setRadius(env, id, b.radius); if (r.error) return r; }
  return { ok: true };
}

async function inviteLink(env) { try { const b = await getMe(env); return b && b.username ? `https://t.me/${b.username}?start=hi` : ""; } catch (e) { return ""; } }

/** The whole state for the app. `quick` = skip the Telegram membership re-check (right after a save). */
async function me(env, from, quick) {
  const id = from.id;
  if (!quick) await db.upsertUser(env, from);
  if (!quick) await ST.visit(env, id);   // owner, 2026-10-26: retention, at most one row per 6 hours, only while switched on
  let chats;
  if (quick) {
    const r = await env.DB.prepare(`SELECT c.chat_id, c.title, m.member, m.show FROM chats c JOIN memberships m ON m.chat_id = c.chat_id
        WHERE m.tg_id = ?1 AND c.active = 1 AND c.blocked = 0 AND m.member = 1 ORDER BY c.bound_at`).bind(id).all();
    chats = r.results || [];
  } else {
    const r = await checkMembership(env, id);
    const shows = await env.DB.prepare("SELECT chat_id, show FROM memberships WHERE tg_id = ?1").bind(id).all();
    const showOf = Object.fromEntries((shows.results || []).map(x => [x.chat_id, x.show]));
    chats = r.member.map(c => ({ chat_id: c.chat_id, title: c.title, member: 1, show: showOf[c.chat_id] ?? 1 }));
  }
  const user = await db.getUser(env, id);
  const profile = await P.getProfile(env, id);
  const checklist = await P.getChecklistSummary(env, id);
  const location = await P.getLocation(env, id);
  const s = P.steps(user, profile, checklist, location);
  const active = await P.refreshStatus(env, id, s);
  const role = await roleOf(env, id);
  return {
    ok: true,
    lang: langOf(from.language_code, user && user.ui_lang),
    owner: String(id) === String(env.ADMIN_ID || ""),
    access: !(user && user.status === "banned"),            // everyone; without chats only «open space»
    space: !!(user && user.open_space),
    version: VERSION, theme: (user && user.theme) || "auto", notify_likes: !(user && user.notify_likes === 0), digest: !!(user && user.digest), digest_asked: !!(user && user.digest_asked), debug: !!env.DEBUG,
    banned: !!(user && user.status === "banned"),
    hidden_until: user && user.hidden_until && user.hidden_until > db.now() ? user.hidden_until : null,
    mod: role && !role.owner ? { scope: role.scope ? await scopeTitles(env, role.scope) : null, intro_seen: role.intro_seen, solo: role.solo } : null,
    chats: chats.map(c => ({ id: String(c.chat_id), title: c.title || "", show: !!c.show })),
    steps: s, active,
    profile: profile && {
      birth_date: profile.birth_date, age: P.ageOf(profile.birth_date), age_bucket: P.shownAge(profile.birth_date, profile.age_exact), age_exact: !!profile.age_exact,
      gender: profile.gender, looking_for: JSON.parse(profile.looking_for || "[]"), show_genders: JSON.parse(profile.show_genders || "[]"),
      age_min: profile.age_min, age_max: profile.age_max, about: profile.about || "", about_public: !!profile.about_public,
      nick: profile.nick || "", compare_before_yes: !!profile.compare_before_yes, paused: !!profile.paused,
      seeking: JSON.parse(profile.seeking || "[]"), seeking_required: !(user && user.activated_at),   // owner, 2026-10-25
      ready_until: profile.ready_until && profile.ready_until > db.now() ? profile.ready_until : null,   // owner, 2026-10-26
      star: profile.star_at ? { ...STAR.myStar(profile), links: await LK.ownLinks(env, id) } : null,
      about_hidden: !!profile.about_hidden,
      interests: INT.parse(profile.interests), interests_hidden: INT.parse(profile.interests_hidden),   // owner, 2026-10-28: picked hobbies and fandoms (catalog ids)   // owner, 2026-10-27: the owner hid «О себе» — the person must change it   // owner, 2026-10-27: «Звезда комьюнити» (null = none)
    },
    checklist, draft: await D.getDraft(env, id), universe: await U.state(env, id), location, radius_pref: (user && user.radius_pref) || 3, first_name: (user && user.first_name) || "",
    site: "https://klevatess.github.io/kinkmatch/",
    invite: await inviteLink(env),
    ints_banner_off: !!(user && user.ints_banner_off),   // owner, 2026-10-28: «Новое: интересы» closed   // owner, 2026-10-26: «Пригласить в чат» on the empty list
  };
}

async function scopeTitles(env, scope) {
  const r = await env.DB.prepare("SELECT chat_id, title FROM chats").all();
  const ids = scope.map(String);
  return (r.results || []).filter(c => ids.includes(String(c.chat_id))).map(c => c.title || "");
}
