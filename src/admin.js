/* src/admin.js — the owner's panel (stage 6 adds moderators with the same views).
   Owner decisions (2026-10-19): the admin account ALWAYS gets this panel (as a participant the owner uses another
   account); the admin sees every profile WITH checklist answers but NEVER any location (no cell, no zone, no distance);
   every opened profile is written to the journal (audit), which only the owner sees; journal rows live 180 days.
     GET  /api/admin/overview          counts, chats
     GET  /api/admin/profiles          all profiles (no location)
     GET  /api/admin/profile?id=…      one profile (by public id) + all answers by category (written to the journal)
     GET  /api/admin/journal           the last 200 journal rows
     POST /api/admin/block-chat        { chat_id }  — the bot leaves the chat for good
     GET  /api/admin/account?id=…      the person's Telegram account, read live from Telegram (name, @username, bio,
                                       birthday, personal channel, profile photos count) — nothing is stored; journaled
     GET  /api/admin/account-photo?id=…&i=N   one profile photo, passed through (the file URL holds the bot token)
     POST /api/admin/account-link      { id }  — the bot sends the owner a link to the account (no @username case)
   Owner (2026-10-19): the admin needs the account itself to judge fakes (photos, bio). Moderators: not yet (ask). */

import { decrypt } from "./crypto.js";
import { call, send, esc } from "./tg.js";
import { t } from "./i18n.js";
import { ageOf, steps } from "./profile.js";
import { views, ID_OF, CAT_OF, names } from "./score.js";
import { visibilityFor, siteLinkOf } from "./neighbours.js";
import { backupChunk, restoreBegin, restoreChunk } from "./backup.js";
import { getSetting, setSetting, report, reportText, sendTextFile, VERSION, DEBUG_HOURS } from "./debug.js";
import { KC } from "./checklist.js";
import * as db from "./db.js";
import { ownerBan, ownerUnban } from "./moderation.js";
import * as U from "./universe.js";
import * as ST from "./stats.js";
import * as STAR from "./stars.js";
import * as LK from "./links.js";
import * as TX from "./texts_admin.js";
import * as INT from "./interests.js";
import * as USG from "./usage.js";

export const JOURNAL_DAYS = 180;
const ANS = ["", "limit", "maybe", "yes", "love"];

export async function handleAdmin(req, env, path, id, lang, json, fail) {
  if (req.method === "GET" && path === "/api/admin/overview") return json(await overview(env));
  if (req.method === "GET" && path === "/api/admin/profiles") return json(await profiles(env, null, 0, true));   // owner, 2026-10-20: the list shows @username and the Telegram name
  if (req.method === "GET" && path === "/api/admin/profile") {
    const r = await profile(env, id, new URL(req.url).searchParams.get("id"), lang, null);
    if (r) {
      const tg = await env.DB.prepare("SELECT tg_id FROM users WHERE pub_id = ?1").bind(r.profile.n).first("tg_id");
      r.pairs = await pairsFor(env, tg);   // the owner only
      const nl = await env.DB.prepare("SELECT old, new, at FROM nick_log WHERE tg_id = ?1 ORDER BY at DESC, id DESC LIMIT 30").bind(tg).all();
      r.nicks = nl.results || [];
      r.visits = await ST.visitsOf(env, tg);
      const sx = await env.DB.prepare(`SELECT p.star_at, p.star_note, p.star_show, p.star_caption, p.star_cap_removed, u.status, (l.tg_id IS NOT NULL) AS placed
          FROM users u LEFT JOIN profiles p ON p.tg_id = u.tg_id LEFT JOIN locations l ON l.tg_id = u.tg_id WHERE u.tg_id = ?1`).bind(tg).first();   // owner, 2026-10-27
      const pend = await env.DB.prepare("SELECT note, at FROM star_pending WHERE tg_id = ?1").bind(tg).first().catch(() => null);
      const onMap = !!(sx && sx.status === "active" && sx.placed);
      r.star = sx && sx.star_at ? { at: sx.star_at, note: sx.star_note || "", show: !!sx.star_show, caption: sx.star_caption || "", removed: !!sx.star_cap_removed, waiting: !onMap }
        : pend ? { at: pend.at, note: pend.note || "", show: false, caption: "", removed: false, waiting: true } : null;
      r.star_can = !!(sx && sx.status !== "banned");   // owner, 2026-10-27: also in advance, before the profile
      if (r.star) r.star.links = await LK.ownLinks(env, tg);   // owner, 2026-10-26: retention   // owner, 2026-10-24: nickname history
    }
    return r ? json(r) : fail("not_found", 404);
  }
  if (req.method === "GET" && path === "/api/admin/journal") return json(await journal(env));
  // owner, 2026-10-27: «Звезда комьюнити»
  if (req.method === "GET" && path === "/api/admin/stars") { const q = new URL(req.url).searchParams; return json(await STAR.adminList(env, q.get("tab"), q.get("q"))); }
  // owner, 2026-10-27: «Тексты» — every bot message, editable; a personal message to one person
  if (req.method === "GET" && path === "/api/admin/texts") return json(await TX.list(env));
  if (req.method === "POST" && path === "/api/admin/texts") {
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    const r = await TX.save(env, id, b || {});
    return r.error ? fail(r.error, 400, r.vars ? { vars: r.vars } : undefined) : json({ ...r, ...(await TX.list(env)) });
  }
  if (req.method === "GET" && path === "/api/admin/dm") { const r = await TX.dmList(env, new URL(req.url).searchParams.get("id")); return r.error ? fail(r.error, 404) : json(r); }
  if (req.method === "POST" && path === "/api/admin/dm") {
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    const r = await TX.dmSend(env, id, b || {});
    return r.error ? fail(r.error, r.error === "not_found" ? 404 : 400) : json({ ...r, ...(await TX.dmList(env, b.id)) });
  }
  if (req.method === "POST" && path === "/api/admin/link") {   // owner, 2026-10-27
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    const r = await LK.adminAction(env, id, b || {});
    return r.error ? fail(r.error, r.error === "not_found" ? 404 : 400) : json(r);
  }
  if (req.method === "POST" && path === "/api/admin/about") {
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    const r = await aboutAction(env, id, b || {});
    return r.error ? fail(r.error, r.error === "not_found" ? 404 : 400) : json(r);
  }
  if (req.method === "POST" && path === "/api/admin/star") {
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    const r = await STAR.adminAction(env, id, b, env.ORIGIN || new URL(req.url).origin);
    return r.error ? fail(r.error, r.error === "not_found" ? 404 : 400) : json(r);
  }
  // owner, 2026-10-28: suggested interests (pending, filter hits) and who uses the free plan the most
  if (req.method === "GET" && path === "/api/admin/interests") return json(await INT.adminView(env));
  if (req.method === "POST" && path === "/api/admin/interests") {
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    const r = await INT.adminAction(env, id, b || {});
    return r.error ? fail(r.error, r.error === "not_found" ? 404 : 400) : json(r);
  }
  if (req.method === "GET" && path === "/api/admin/usage-people") return json(await USG.top(env, Number(new URL(req.url).searchParams.get("days"))));
  // owner, 2026-10-21: the overview — Cloudflare usage, summary, every mutual yes, reminders
  if (req.method === "GET" && path === "/api/admin/usage") return json(await ST.usage(env));
  if (req.method === "GET" && path === "/api/admin/retention") return json(await ST.retention(env));
  if (req.method === "GET" && path === "/api/admin/summary") return json(await ST.summary(env, new URL(req.url).searchParams.get("period")));
  if (req.method === "GET" && path === "/api/admin/mutuals") {
    const q = new URL(req.url).searchParams, d = Number(q.get("days"));
    return json(await ST.mutuals(env, q.get("state"), [1, 7, 30].includes(d) ? d : 0));
  }
  if (req.method === "GET" && path === "/api/admin/map") {
    const q = new URL(req.url).searchParams;
    await db.audit(env, id, "view_map", q.get("from") || "all");
    return json(await ST.map(env, q.get("from"), q.get("gender"), q.get("role")));
  }
  if (req.method === "GET" && path === "/api/admin/reminders") return json(await ST.remindersView(env));
  if (req.method === "POST" && path === "/api/admin/reminders") {
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    if (typeof (b && b.on) !== "boolean") return fail("bad_value");
    await ST.setReminders(env, b.on); await db.audit(env, id, b.on ? "reminders_on" : "reminders_off", "");
    return json(await ST.remindersView(env));
  }
  // owner, 2026-10-21: «Вселенная» and the open-space invitation for people without chats
  if (req.method === "GET" && path === "/api/admin/universe") return json({ ...(await U.adminView(env)), no_chat: (await U.noChatPeople(env)).length });
  if (req.method === "POST" && path === "/api/admin/universe") {
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    if (!/^-?\d{1,20}$/.test(String(b && b.chat_id))) return fail("bad_chat");
    const r = await U.adminAction(env, id, Number(b.chat_id), String(b.action || ""));
    return r.error ? fail(r.error) : json({ ...(await U.adminView(env)), no_chat: (await U.noChatPeople(env)).length });
  }
  if (req.method === "POST" && path === "/api/admin/space-invite") {
    const r = await U.inviteToSpace(env, id, (env.ORIGIN || new URL(req.url).origin) + "/app/");
    return json({ ...r, ...(await U.adminView(env)), no_chat: (await U.noChatPeople(env)).length });
  }
  if (req.method === "POST" && path === "/api/admin/block-chat") {
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    const chatId = Number(b && b.chat_id);
    if (!Number.isSafeInteger(chatId)) return fail("bad_chat");
    await db.blockChat(env, chatId);
    await db.audit(env, id, "chat_block", chatId);
    await call(env, "leaveChat", { chat_id: chatId });
    return json(await overview(env));
  }
  if (req.method === "GET" && path === "/api/admin/backup") {
    const q = new URL(req.url).searchParams;
    const r = await backupChunk(env, q.get("t"), q.get("after"));
    if (!q.get("t") && r.ok) await db.audit(env, id, "backup", null);
    return r.error ? fail(r.error) : json(r);
  }
  if (req.method === "POST" && (path === "/api/admin/backup-send" || path === "/api/admin/restore-begin" || path === "/api/admin/restore-chunk")) {
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    if (path === "/api/admin/backup-send") {
      const name = "kinkoverse-backup-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".json";
      const s = await sendTextFile(env, id, name, String(b.file || ""), t("backupCaption", null, lang));
      return json({ ok: !!s.ok, sent: !!s.ok });
    }
    if (path === "/api/admin/restore-begin") {
      if (b.confirm !== "RESTORE") return fail("no_confirm");
      await restoreBegin(env);
      return json({ ok: true });
    }
    const r = await restoreChunk(env, b.t, b.d);
    if (r.ok && b.last) await db.audit(env, id, "restore", null);
    return r.error ? fail(r.error) : json(r);
  }
  if (req.method === "GET" && path === "/api/admin/settings") return json(await settingsView(env));
  if (req.method === "POST" && path === "/api/admin/settings") {
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    if (typeof b.filters_off === "boolean") { await setSetting(env, "filters_off", b.filters_off ? "1" : "0"); await db.audit(env, id, b.filters_off ? "filters_off" : "filters_on", null); }
    if (typeof b.visits === "boolean") {   // owner, 2026-10-26: «Записывать заходы»
      await setSetting(env, "visits_on", b.visits ? "1" : "0");
      if (b.visits && !(await getSetting(env, "visits_since"))) await setSetting(env, "visits_since", db.now());
      await db.audit(env, id, b.visits ? "visits_on" : "visits_off", null);
    }
    if (typeof b.debug === "boolean") { await setSetting(env, "debug_until", b.debug ? db.now() + DEBUG_HOURS * 3600 : 0); await db.audit(env, id, b.debug ? "debug_on" : "debug_off", null); }
    return json(await settingsView(env));
  }
  if (req.method === "GET" && path === "/api/admin/debug-report") {
    const r = await report(env);
    return json({ ok: true, report: r, text: reportText(r) });
  }
  if (req.method === "POST" && path === "/api/admin/debug-send") {
    const r = await report(env);
    const name = "kinkoverse-debug-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".txt";
    const s = await sendTextFile(env, id, name, reportText(r), "Kinkoverse debug report");
    return json({ ok: !!s.ok, sent: !!s.ok });
  }
  if (req.method === "POST" && path === "/api/admin/calib-send") {   // owner only: all checklists, pseudonymous (src/calib.js)
    const { calibration } = await import("./calib.js");
    const c = await calibration(env);
    const name = "kinkoverse-calibration-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".json";
    const s = await sendTextFile(env, id, name, JSON.stringify(c), "Kinkoverse calibration: " + c.counts.people + " checklists, " + c.counts.mutual + " mutual yes");
    await db.audit(env, id, "calib_export", c.counts.people + " lists");
    return json({ ok: !!s.ok, sent: !!s.ok, counts: c.counts });
  }
  if (req.method === "POST" && path === "/api/admin/post-button") {
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    const { postChatButton } = await import("./bot.js");
    const r = await postChatButton(env, Number(b && b.chat_id), true);
    return r ? json(await overview(env)) : fail("tg_failed");
  }
  if (req.method === "POST" && path === "/api/admin/unblock-chat") {
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    const chatId = Number(b && b.chat_id);
    if (!Number.isSafeInteger(chatId)) return fail("bad_chat");
    await db.unblockChat(env, chatId);
    await db.audit(env, id, "chat_unblock", chatId);
    return json(await overview(env));
  }
  if (req.method === "GET" && path === "/api/admin/kslink") {
    const r = await kslinkFor(env, id, new URL(req.url).searchParams.get("id"), null);
    return r ? json(r) : fail("not_found", 404);
  }
  if (req.method === "GET" && path === "/api/admin/account") {
    const r = await account(env, id, new URL(req.url).searchParams.get("id"));
    return r ? json(r) : fail("not_found", 404);
  }
  if (req.method === "GET" && path === "/api/admin/account-photo") {
    const q = new URL(req.url).searchParams;
    return (await accountPhoto(env, q.get("id"), Number(q.get("i")) || 0)) || fail("not_found", 404);
  }
  if (req.method === "POST" && (path === "/api/admin/ban" || path === "/api/admin/unban")) {   // «Опасная зона» (two confirmations in the app)
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    const u = await byPub(env, b && b.id);
    if (!u) return fail("not_found", 404);
    const r = path === "/api/admin/ban" ? await ownerBan(env, id, u.tg_id) : await ownerUnban(env, id, u.tg_id);
    if (r.error) return fail(r.error, 404);
    return json({ ok: true, ...(await profile(env, id, b.id, lang, null, true)) });
  }
  // owner, 2026-10-21 (a point in Iran: the two numbers swapped): the place is cleared, the person sets it again
  // (the first setting is free of the change limit) and is told why
  if (req.method === "POST" && path === "/api/admin/reset-place") {
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    const u = await byPub(env, b && b.id);
    if (!u) return fail("not_found", 404);
    await env.DB.batch([env.DB.prepare("DELETE FROM locations WHERE tg_id = ?1").bind(u.tg_id),
      env.DB.prepare("UPDATE users SET status = 'draft' WHERE tg_id = ?1 AND status = 'active'").bind(u.tg_id)]);
    await db.audit(env, id, "reset_place", "#" + b.id);
    const lg = await env.DB.prepare("SELECT lang, ui_lang FROM users WHERE tg_id = ?1").bind(u.tg_id).first();
    const l = (lg && (lg.ui_lang || (String(lg.lang || "").startsWith("en") ? "en" : null))) || "ru";
    await send(env, u.tg_id, t("placeReset", null, l), { reply_markup: { inline_keyboard: [[{ text: t("openApp", null, l), web_app: { url: (env.ORIGIN || new URL(req.url).origin) + "/app/" } }]] } });
    return json({ ok: true, ...(await profile(env, id, b.id, lang, null, true)) });
  }
  if (req.method === "POST" && path === "/api/admin/account-link") {
    let b; try { b = await req.json(); } catch (e) { return fail("bad_json"); }
    return (await sendAccountLink(env, id, b && b.id, lang)) ? json({ ok: true, sent: true }) : fail("not_found", 404);
  }
  return fail("not_found", 404);
}

/** The bot sends `to` a link to the account of profile `n` (for people without a @username). */
export async function sendAccountLink(env, to, n, lang) {
  const u = await byPub(env, n);
  if (!u) return false;
  const link = u.username ? "https://t.me/" + u.username : "tg://user?id=" + u.tg_id;
  await send(env, to, t("accountLink", { n: esc(n), link: '<a href="' + link + '">' + esc(u.username ? "@" + u.username : "#" + n) + "</a>" }, lang));
  return true;
}

async function byPub(env, n) {
  if (!/^[a-z0-9]{10}$/.test(String(n || ""))) return null;
  return env.DB.prepare("SELECT tg_id, username FROM users WHERE pub_id = ?1 AND tg_id != ?2").bind(n, Number(env.ADMIN_ID || 0)).first();
}

/** Read live from Telegram, never stored. Works for people who started the bot; privacy settings may hide parts. */
export async function account(env, adminId, n) {
  const u = await byPub(env, n);
  if (!u) return null;
  await db.audit(env, adminId, "view_account", "#" + n);
  const c = await call(env, "getChat", { chat_id: u.tg_id });
  const ph = await call(env, "getUserProfilePhotos", { user_id: u.tg_id, limit: 10 });
  const x = c.ok ? c.result : {};
  const b = x.birthdate;
  return {
    ok: true,
    account: {
      available: !!c.ok, first_name: x.first_name || "", last_name: x.last_name || "", username: x.username || u.username || "",
      bio: x.bio || "", birthdate: b ? { day: b.day, month: b.month, year: b.year || null } : null,
      channel: x.personal_chat ? { title: x.personal_chat.title || "", username: x.personal_chat.username || "" } : null,
      photos: ph.ok ? (ph.result.photos || []).length : 0, photos_total: ph.ok ? ph.result.total_count : 0,
      link: (x.username || u.username) ? "https://t.me/" + (x.username || u.username) : null,
    },
  };
}

export async function accountPhoto(env, n, i) {
  const u = await byPub(env, n);
  if (!u || i < 0 || i > 9) return null;
  const ph = await call(env, "getUserProfilePhotos", { user_id: u.tg_id, offset: i, limit: 1 });
  const sizes = ph.ok && ph.result.photos && ph.result.photos[0];
  if (!sizes || !sizes.length) return null;
  const pick = sizes.filter(s => s.width <= 800).pop() || sizes[0];
  const f = await call(env, "getFile", { file_id: pick.file_id });
  if (!f.ok || !f.result.file_path) return null;
  const r = await (env.TG_FETCH || fetch)(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${f.result.file_path}`);
  if (!r.ok) return null;
  return new Response(r.body, { headers: { "content-type": "image/jpeg", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

async function aboutChanges(env) {
  try {
    const r = await env.DB.prepare(`SELECT a.id, a.old, a.new, a.at, u.pub_id, p.nick, p.about_hidden FROM about_log a JOIN users u ON u.tg_id = a.tg_id
        LEFT JOIN profiles p ON p.tg_id = a.tg_id WHERE a.seen = 0 ORDER BY a.at DESC LIMIT 20`).all();
    return (r.results || []).map(x => ({ id: x.id, n: x.pub_id, nick: x.nick || "", old: String(x.old || "").slice(0, 600), new: String(x.new || "").slice(0, 600), at: x.at, hidden: !!x.about_hidden }));
  } catch (e) { return []; }
}

/** POST /api/admin/about { id, action: hide | show } | { log, action: seen } — owner, 2026-10-27 */
async function aboutAction(env, ownerId, b) {
  if (b.action === "seen") { await env.DB.prepare("UPDATE about_log SET seen = 1 WHERE id = ?1").bind(Number(b.log) || 0).run(); return { ok: true }; }
  if (!/^[a-z0-9]{10}$/.test(String(b.id || ""))) return { error: "bad_id" };
  const x = await env.DB.prepare("SELECT u.tg_id, p.about FROM users u JOIN profiles p ON p.tg_id = u.tg_id WHERE u.pub_id = ?1").bind(b.id).first();
  if (!x) return { error: "not_found" };
  if (b.action === "hide") {
    if (!x.about) return { error: "no_about" };
    await env.DB.prepare("UPDATE profiles SET about_hidden = ?2 WHERE tg_id = ?1").bind(x.tg_id, db.now()).run();
    if (b.log) await env.DB.prepare("UPDATE about_log SET seen = 1 WHERE id = ?1").bind(Number(b.log) || 0).run();
    await db.audit(env, ownerId, "about_hide", "#" + b.id);
    return { ok: true };
  }
  if (b.action === "show") {
    await env.DB.prepare("UPDATE profiles SET about_hidden = NULL WHERE tg_id = ?1").bind(x.tg_id).run();
    await db.audit(env, ownerId, "about_show", "#" + b.id);
    return { ok: true };
  }
  return { error: "bad_action" };
}

async function overview(env) {
  const one = sql => env.DB.prepare(sql).first("n");
  // the chat's own size (not just people who opened the bot): asked from Telegram at most once an hour per chat
  const stale = await env.DB.prepare("SELECT chat_id FROM chats WHERE active = 1 AND blocked = 0 AND (count_at IS NULL OR count_at < ?1) LIMIT 20")
    .bind(db.now() - 3600).all();
  for (const c of stale.results || []) {
    const n = await call(env, "getChatMemberCount", { chat_id: c.chat_id });
    if (n.ok) await env.DB.prepare("UPDATE chats SET member_count = ?2, count_at = ?3 WHERE chat_id = ?1").bind(c.chat_id, n.result, db.now()).run();
  }
  const chats = await env.DB.prepare(`SELECT c.chat_id, c.title, c.active, c.blocked, c.bound_at, c.member_count, c.invite_posted,
      (SELECT COUNT(*) FROM memberships m WHERE m.chat_id = c.chat_id AND m.member = 1) AS members,
      (SELECT COUNT(*) FROM memberships m JOIN users u ON u.tg_id = m.tg_id WHERE m.chat_id = c.chat_id AND m.member = 1 AND u.status = 'active') AS profiles
      FROM chats c ORDER BY c.blocked, c.active DESC, c.bound_at`).all();
  const HOLD = 2147483647, t0 = db.now();
  const oldest = await env.DB.prepare("SELECT MIN(created_at) AS t FROM reports WHERE status != 'done'").first("t");
  const newChats = await env.DB.prepare("SELECT title FROM chats WHERE active = 1 AND blocked = 0 AND bound_at > ?1 ORDER BY bound_at DESC").bind(t0 - 3 * 86400).all();
  const attention = {
    reports: await one("SELECT COUNT(*) AS n FROM reports WHERE status != 'done'"), oldest_report: oldest || null,
    held: await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE hidden_until = ?1").bind(HOLD).first("n"),
    bans_wait: await one("SELECT COUNT(*) AS n FROM reports WHERE proposed = 'ban' AND status != 'done'"),   // owner, 2026-10-26
    new_chats: (newChats.results || []).map(c => c.title || ""),
    stuck: await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'draft' AND updated_at < ?1").bind(t0 - 3 * 86400).first("n"),
    // owner, 2026-10-25: profiles that became visible (finished all steps) in the last 3 days
    // owner, 2026-10-26: «late» = reached the map in the last 24 h, at least a day after opening the bot
    // owner, 2026-10-27: a hidden «О себе» was changed — the old and the new text, until the owner looks at it
    about_changes: await aboutChanges(env),
    link_notes: await LK.notes(env),   // owner, 2026-10-27: new / changed links of stars
    interests: await INT.attention(env),   // owner, 2026-10-28: suggestions waiting, filter hits not looked at
    new_visible: await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'active' AND activated_at > ?1 AND activated_at - created_at >= 86400 AND tg_id != ?2").bind(t0 - 86400, Number(env.ADMIN_ID || 0)).first("n"),
  };
  return {
    ok: true, attention, version: VERSION,
    counts: {
      users: await one("SELECT COUNT(*) AS n FROM users"),
      active: await one("SELECT COUNT(*) AS n FROM users WHERE status = 'active'"),
      paused: await one("SELECT COUNT(*) AS n FROM profiles WHERE paused = 1"),
      suspicious: await one("SELECT COUNT(*) AS n FROM checklists WHERE same_share >= 0.9"),
      reports: await one("SELECT COUNT(*) AS n FROM reports WHERE status != 'done'"),
      mutual: await one("SELECT COUNT(*) AS n FROM answers a JOIN answers b ON b.a = a.b AND b.b = a.a AND b.value = 'yes' WHERE a.value = 'yes' AND a.a < a.b"),
      moderators: await one("SELECT COUNT(*) AS n FROM moderators"),
      space: await one("SELECT COUNT(*) AS n FROM users WHERE open_space = 1 AND status = 'active'"),
    },
    chats: (chats.results || []).map(c => ({ id: String(c.chat_id), title: c.title || "", active: !!c.active, blocked: !!c.blocked,
      since: c.bound_at, size: c.member_count, members: c.members, profiles: c.profiles, button: !!c.invite_posted })),
  };
}

/** Everything except location. People are referred to by their public id, never by the Telegram id. */
/** scope: null = everyone (owner, all-chat moderators); else a list of chat ids — only members of those chats. */
const SCOPED = `(?1 IS NULL OR EXISTS (SELECT 1 FROM memberships sm, json_each(?1) j WHERE sm.tg_id = u.tg_id AND sm.member = 1 AND sm.chat_id = j.value))`;
const scopeArg = scope => (scope ? JSON.stringify(scope.map(Number)) : null);

/** withAccount: the owner's panel only — moderators never get Telegram names / usernames in the list. */
export async function profiles(env, scope, exclude, withAccount) {
  const r = await env.DB.prepare(`SELECT u.pub_id AS n, u.username, u.first_name, u.status, u.created_at, u.last_seen, u.activated_at, u.consent_at, u.hidden_until, u.open_space,
      p.nick, p.birth_date, p.gender, p.paused, p.looking_for, p.show_genders, p.star_at, p.star_show, c.answered, c.same_share, c.role, c.experience,
      (l.tg_id IS NOT NULL) AS placed,
      (SELECT GROUP_CONCAT(ch.title, '\u0001') FROM memberships m JOIN chats ch ON ch.chat_id = m.chat_id
        WHERE m.tg_id = u.tg_id AND m.member = 1) AS chat_titles
      FROM users u LEFT JOIN profiles p ON p.tg_id = u.tg_id LEFT JOIN checklists c ON c.tg_id = u.tg_id LEFT JOIN locations l ON l.tg_id = u.tg_id
      WHERE u.tg_id != ?2 AND u.tg_id != ?3 AND ${SCOPED}
      ORDER BY u.created_at DESC LIMIT 500`).bind(scopeArg(scope), Number(env.ADMIN_ID || 0), Number(exclude || 0)).all();
  const t0 = db.now();
  return {
    ok: true,
    items: (r.results || []).map(x => {
      // owner, 2026-10-20: the list shows the registration date, the last visit and the step each person is on
      const st = steps({ consent_at: x.consent_at }, x.birth_date ? x : null, x.answered != null ? { answered: x.answered } : null, x.placed ? {} : null);
      const hidden = (x.hidden_until && x.hidden_until > t0) || !!x.paused || x.status === "hidden";
      const stage = x.status === "banned" ? "banned" : x.status === "active" && !hidden ? "active" : hidden && x.status === "active" ? "hidden"
        : !st.consent ? "opened" : !st.checklist ? "checklist" : !st.profile ? "profile" : !st.location ? "place" : hidden ? "hidden" : "active";
      return {
        n: x.n, nick: x.nick || "", ...(withAccount ? { username: x.username || "", tg_name: x.first_name || "" } : {}), space: !!x.open_space, status: x.status, stage, steps: st, created: x.created_at, seen: x.last_seen || null, visible: x.activated_at || null,
        late: !!(x.activated_at && x.activated_at > t0 - 86400 && x.activated_at - x.created_at >= 86400),
        age: ageOf(x.birth_date), gender: x.gender, paused: !!x.paused, star: x.star_at ? (x.star_show ? "shown" : "off") : null,   // owner, 2026-10-27
        hidden_until: x.hidden_until && x.hidden_until > t0 ? x.hidden_until : null,
        answered: x.answered, suspicious: x.same_share >= 0.9, role: x.role, experience: x.experience,
        chats: String(x.chat_titles || "").split("\u0001").filter(Boolean),
      };
    }),
  };
}

export async function profile(env, adminId, n, lang, scope, quiet) {
  if (!/^[a-z0-9]{10}$/.test(String(n || ""))) return null;
  const x = await env.DB.prepare(`SELECT u.tg_id, u.pub_id AS n, u.status, u.created_at, u.hidden_until, u.username, u.open_space, u.suggest_blocked,
      (SELECT enabled FROM universe_optin o WHERE o.tg_id = u.tg_id AND o.universe_id = 1) AS uni_optin, p.*, c.enc, c.answered, c.ans_top, c.ans_bottom, c.same_share, c.role, c.experience, c.relation
      FROM users u LEFT JOIN profiles p ON p.tg_id = u.tg_id LEFT JOIN checklists c ON c.tg_id = u.tg_id
      WHERE u.pub_id = ?2 AND u.tg_id != ?3 AND u.tg_id != ?4 AND ${SCOPED}`).bind(scopeArg(scope), n, Number(env.ADMIN_ID || 0), Number(adminId)).first();
  if (!x) return null;
  if (!quiet) await db.audit(env, adminId, "view_profile", "#" + n);   // quiet = the short card on a report, no answers
  let answers = null;
  if (x.enc && !quiet) {
    const v = views(JSON.parse(await decrypt(env.DATA_KEY, x.enc)));
    const nm = names(lang), list = [];
    const pick = (vec, side) => {
      for (const c of KC.CATS) for (const [code, id] of c.items) {
        const a = vec[code];
        if (a) list.push({ cat: nm.cat(CAT_OF[id]), name: nm.item(ID_OF[code]), side, a: ANS[a] });
      }
    };
    if (v.ext) { pick(v.top, "top"); pick(v.bottom, "bottom"); } else pick(v.plain, null);
    answers = list;
  }
  const chats = await env.DB.prepare(`SELECT ch.title, m.show FROM memberships m JOIN chats ch ON ch.chat_id = m.chat_id
      WHERE m.tg_id = ?1 AND m.member = 1`).bind(x.tg_id).all();
  return {
    ok: true,
    profile: {
      n: x.n, status: x.status, created: x.created_at, age: ageOf(x.birth_date), gender: x.gender,
      looking_for: JSON.parse(x.looking_for || "[]"), seeking: JSON.parse(x.seeking || "[]"), show_genders: JSON.parse(x.show_genders || "[]"), age_min: x.age_min, age_max: x.age_max,
      about: x.about || "", about_hidden: !!x.about_hidden, nick: x.nick || "", space: !!x.open_space, universe: x.uni_optin === 1 ? "on" : x.uni_optin === 0 ? "off" : "unset" /* owner, 2026-10-26 */, paused: !!x.paused, compare_before_yes: !!x.compare_before_yes,
      role: x.role, experience: x.experience, relation: x.relation, answered: x.answered, ans_top: x.ans_top, ans_bottom: x.ans_bottom, suspicious: x.same_share >= 0.9,
      hidden_until: x.hidden_until && x.hidden_until > db.now() ? x.hidden_until : null, has_username: !!x.username,
      interests: INT.parse(x.interests), interests_hidden: INT.parse(x.interests_hidden), suggest_blocked: String(adminId) === String(env.ADMIN_ID || "") ? !!x.suggest_blocked : undefined,   // owner, 2026-10-28
      chats: (chats.results || []).map(c => ({ title: c.title || "", show: !!c.show })),
    },
    answers,
    // why this person sees nobody (or few): counts only
    visibility: quiet ? null : await visibilityFor(env, x.tg_id),
  };
}

/** Owner, 2026-10-20: «Взаимности» on a profile page — to sort out «my mutual yes disappeared».
    Every person this one has a «да» with in either direction, or had a mutual yes with (answer_log, 180 days):
    state now (mutual and seen in «Взаимные» / mutual but not seen and why / only one side), and the log of the pair. */
export async function pairsFor(env, tg) {
  const ans = await env.DB.prepare("SELECT a, b, value, created_at FROM answers WHERE a = ?1 OR b = ?1").bind(tg).all();
  const log = await env.DB.prepare("SELECT id, a, b, value, how, broke, at FROM answer_log WHERE (a = ?1 OR b = ?1) AND at > ?2 ORDER BY at DESC, id DESC LIMIT 400")
    .bind(tg, db.now() - JOURNAL_DAYS * 86400).all();
  const by = new Map(), get = o => { if (!by.has(o)) by.set(o, { mine: null, mine_at: null, theirs: null, theirs_at: null, log: [] }); return by.get(o); };
  for (const r of ans.results || []) {
    if (r.a === tg) { const x = get(r.b); x.mine = r.value; x.mine_at = r.created_at; }
    else { const x = get(r.a); x.theirs = r.value; x.theirs_at = r.created_at; }
  }
  const gone = [];
  for (const r of log.results || []) {
    if (r.b == null) { if (r.a === tg) gone.push({ at: r.at }); continue; }
    const o = r.a === tg ? r.b : r.a;
    get(o).log.push({ who: r.a === tg ? "self" : "other", value: r.value, how: r.how, broke: r.broke, at: r.at });
  }
  const self = await env.DB.prepare("SELECT status, hidden_until FROM users WHERE tg_id = ?1").bind(tg).first();
  const pcts = await ST.pctFor(env, [...by.keys()].map(o => [tg, o]), 40);   // owner, 2026-10-25: the match percent on each row
  const t = db.now(), out = [];
  for (const [o, x] of by) {
    const ever = x.log.some(l => l.broke);
    if (x.mine !== "yes" && x.theirs !== "yes" && !ever) continue;   // only «не сейчас» between them: not about mutual yes
    const u = await env.DB.prepare(`SELECT u.pub_id, u.status, u.hidden_until, p.nick, p.paused, (c.tg_id IS NOT NULL) AS has_list
        FROM users u LEFT JOIN profiles p ON p.tg_id = u.tg_id LEFT JOIN checklists c ON c.tg_id = u.tg_id WHERE u.tg_id = ?1`).bind(o).first();
    const why = [];   // MUTUAL_SQL in neighbours.js: why a mutual yes is not in «Взаимные»
    if (!u) why.push("no_user");
    else {
      if (u.status !== "active") why.push("other_" + u.status);
      if (u.hidden_until && u.hidden_until > t) why.push("other_hidden");
      if (!u.has_list) why.push("other_no_list");
    }
    if (!self || self.status !== "active") why.push("self_" + (self ? self.status : "none"));
    if (self && self.hidden_until && self.hidden_until > t) why.push("self_hidden");
    const both = x.mine === "yes" && x.theirs === "yes";
    out.push({
      n: u ? u.pub_id : null, nick: (u && u.nick) || "", status: u ? u.status : null, paused: !!(u && u.paused),
      pct: pcts.get(tg < o ? tg + "|" + o : o + "|" + tg) ?? null,
      mine: x.mine, mine_at: x.mine_at, theirs: x.theirs, theirs_at: x.theirs_at,
      state: both ? (why.length ? "mutual_hidden" : "mutual") : x.mine === "yes" ? "out" : x.theirs === "yes" ? "in" : "ended",
      why: both ? why : [], log: x.log.slice(0, 20),
    });
  }
  const rank = { mutual_hidden: 0, ended: 1, mutual: 2, out: 3, in: 4 };
  out.sort((a, b) => rank[a.state] - rank[b.state] || Math.max(b.mine_at || 0, b.theirs_at || 0) - Math.max(a.mine_at || 0, a.theirs_at || 0));
  return { items: out, gone, logged_since: "2026-10-20" };
}

/** «Посмотреть на Kinkosmos» for the owner / a moderator (scope as for the profile). Journaled. */
export async function kslinkFor(env, actor, n, scope) {
  const p = await profile(env, actor, n, "ru", scope, true);
  if (!p) return null;
  const row = await env.DB.prepare(`SELECT c.enc, c.role, c.experience, c.relation, p.nick FROM users u JOIN checklists c ON c.tg_id = u.tg_id
      LEFT JOIN profiles p ON p.tg_id = u.tg_id WHERE u.pub_id = ?1`).bind(n).first();
  if (!row) return null;
  await db.audit(env, actor, "open_kinkosmos", "#" + n);
  return { ok: true, link: await siteLinkOf(env, row) };
}

async function journal(env) {
  const r = await env.DB.prepare(`SELECT a.actor, a.action, a.target, a.created_at, u.username, m.name
      FROM audit a LEFT JOIN users u ON u.tg_id = a.actor LEFT JOIN moderators m ON m.tg_id = a.actor ORDER BY a.id DESC LIMIT 200`).all();
  // targets in words: «#pub» → nickname, chat ids → titles, «#tg id» (moderators) → name / @username
  const items = r.results || [];
  const pubs = [...new Set(items.map(x => /^#([a-z0-9]{10})$/.exec(x.target || "")).filter(Boolean).map(m => m[1]))];
  const nicks = {};
  if (pubs.length) for (const x of (await env.DB.prepare(`SELECT u.pub_id, p.nick, p.gender FROM users u LEFT JOIN profiles p ON p.tg_id = u.tg_id
      WHERE u.pub_id IN (SELECT value FROM json_each(?1))`).bind(JSON.stringify(pubs)).all()).results || []) nicks[x.pub_id] = x.nick || x.gender || "";
  const chatT = Object.fromEntries(((await env.DB.prepare("SELECT chat_id, title FROM chats").all()).results || []).map(c => [String(c.chat_id), c.title || ""]));
  const people = Object.fromEntries(((await env.DB.prepare(`SELECT u.tg_id, u.username, m.name FROM users u LEFT JOIN moderators m ON m.tg_id = u.tg_id
      WHERE u.tg_id IN (SELECT DISTINCT CAST(substr(target, 2) AS INTEGER) FROM audit WHERE action IN ('mod_add', 'mod_remove'))`).all()).results || [])
    .map(x => ["#" + x.tg_id, [x.name, x.username ? "@" + x.username : ""].filter(Boolean).join(" ")]));
  const label = x => {
    const tg = x.target || "";
    const m = /^#([a-z0-9]{10})$/.exec(tg);
    if (m) return (nicks[m[1]] ? "«" + nicks[m[1]] + "» " : "") + tg;
    if (/^chat_/.test(x.action)) { const parts = tg.split("->"); return parts.map(p => chatT[p] ? "«" + chatT[p] + "»" : p).join(" → "); }
    if (/^mod_/.test(x.action) && people[tg]) return people[tg];
    return tg;
  };
  return { ok: true, items: items.map(x => ({
    who: x.actor == null ? "bot" : String(x.actor) === String(env.ADMIN_ID) ? "owner"
      : [x.name, x.username ? "@" + x.username : ""].filter(Boolean).join(" ") || "#" + x.actor,
    action: x.action, target: label(x), at: x.created_at })) };
}

/** Daily: journal rows older than JOURNAL_DAYS are deleted. */
export function pruneJournal(env) {
  return env.DB.batch([env.DB.prepare("DELETE FROM audit WHERE created_at < ?1").bind(db.now() - JOURNAL_DAYS * 86400),
    env.DB.prepare("DELETE FROM answer_log WHERE at < ?1").bind(db.now() - JOURNAL_DAYS * 86400)]);
}

async function settingsView(env) {
  const until = Number(await getSetting(env, "debug_until") || 0);
  return { ok: true, version: VERSION, filters_off: (await getSetting(env, "filters_off")) === "1", debug_until: until > db.now() ? until : null, visits: (await getSetting(env, "visits_on")) === "1" };
}
