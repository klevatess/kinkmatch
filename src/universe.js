/* src/universe.js — «Вселенная» (owner, 2026-10-21): chats the owner approved whose people see each other.
   - A chat gets in only through the owner: on a chat admin's request (/universe, or the offer when the bot is connected)
     or added by the owner without one. The owner can take it out at any time.
   - A person is seen in the universe only when they chose so («Мой чат и Вселенная»): the default for someone who
     finishes the steps while one of their chats is in it; people who were already there are asked once by a message.
   - Two people see each other through the universe when both chose it and each is a member of some universe chat
     (not necessarily the same one; «show me in this chat» on). Leaving the chat = leaving the universe.
   - A report across universe chats goes to the moderators of both chats and the owner (reports.chat_id2).
   One universe now (UNI = 1); the tables carry universe_id so more can be added later. */

import * as db from "./db.js";
import { call, send, esc } from "./tg.js";
import { t } from "./i18n.js";

export const UNI = 1;
const now = () => db.now();

/** SQL: the universe chats `who` (a bound parameter or a column) is a member of, showing themselves there. */
export const UNI_CHATS = (who, col) => `(SELECT ${col} FROM universe_chats uc
    JOIN memberships um ON um.chat_id = uc.chat_id AND um.tg_id = ${who} AND um.member = 1 AND um.show = 1
    JOIN chats uch ON uch.chat_id = uc.chat_id AND uch.active = 1 AND uch.blocked = 0
    WHERE uc.universe_id = ${UNI} AND uc.status = 'member')`;
/** SQL: `who` is seen in the universe (chose it and is in one of its chats). */
export const IN_UNI = who => `(EXISTS (SELECT 1 FROM universe_optin uo WHERE uo.tg_id = ${who} AND uo.universe_id = ${UNI} AND uo.enabled = 1)
    AND EXISTS ${UNI_CHATS(who, "1")})`;

/** For /api/me: my universe chats, all its chats, my choice, how many people are in it now. */
export async function state(env, id) {
  const mine = await env.DB.prepare(`SELECT uch.title FROM universe_chats uc
      JOIN memberships um ON um.chat_id = uc.chat_id AND um.tg_id = ?1 AND um.member = 1
      JOIN chats uch ON uch.chat_id = uc.chat_id AND uch.active = 1 AND uch.blocked = 0
      WHERE uc.universe_id = ?2 AND uc.status = 'member' ORDER BY uc.at`).bind(id, UNI).all();
  const all = await env.DB.prepare(`SELECT ch.title FROM universe_chats uc JOIN chats ch ON ch.chat_id = uc.chat_id AND ch.active = 1 AND ch.blocked = 0
      WHERE uc.universe_id = ?1 AND uc.status = 'member' ORDER BY uc.at`).bind(UNI).all();
  const o = await env.DB.prepare("SELECT enabled FROM universe_optin WHERE tg_id = ?1 AND universe_id = ?2").bind(id, UNI).first();
  // owner, 2026-11-01: the two counts come from the hourly job (counted over everyone, minus the person if counted)
  const u = await env.DB.prepare(`SELECT u.uni_info_seen, u.status, u.open_space, p.paused, (SELECT 1 FROM memberships um JOIN universe_chats uc ON uc.chat_id = um.chat_id
      AND uc.universe_id = ?2 AND uc.status = 'member' JOIN chats ch ON ch.chat_id = um.chat_id AND ch.active = 1 AND ch.blocked = 0
      WHERE um.tg_id = ?1 AND um.member = 1 AND um.show = 1 LIMIT 1) AS in_uni_chat FROM users u LEFT JOIN profiles p ON p.tg_id = u.tg_id WHERE u.tg_id = ?1`).bind(id, UNI).first();
  const c = await counts(env);
  const counted = !!(u && u.status === "active" && u.paused === 0);
  const people = Math.max(0, c.uni - (counted && o && o.enabled && u.in_uni_chat ? 1 : 0));
  const space = Math.max(0, c.space - (counted && u.open_space === 1 ? 1 : 0));
  // owner, 2026-11-01: the checklist step says «50+ человек уже на карте в открытом космосе»: tens rounded down, minus 20
  // (some of them would not be shown because of the filters); nothing under 10
  const hint = Math.floor(c.space / 10) * 10 - 20;
  return {
    mine: (mine.results || []).map(x => x.title || ""), all: (all.results || []).map(x => x.title || ""),
    on: o ? !!o.enabled : null, people: people || 0, space_people: space || 0, info_seen: !!(u && u.uni_info_seen),
    space_hint: hint >= 10 ? hint : null,
  };
}

/** owner, 2026-11-01: people on the map in open space / in the universe — counted by the hourly job, read as one row.
    -> { space, uni, at } */
export async function counts(env, fresh) {
  if (!fresh) {
    const v = await env.DB.prepare("SELECT value FROM settings WHERE key = 'counts'").first("value");
    try { const c = JSON.parse(v); if (c && c.at) return c; } catch (e) { /* not counted yet */ }
  }
  const r = await env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM users u JOIN profiles p ON p.tg_id = u.tg_id AND p.paused = 0 WHERE u.status = 'active' AND ${IN_UNI("u.tg_id")}) AS uni,
      (SELECT COUNT(*) FROM users u JOIN profiles p ON p.tg_id = u.tg_id AND p.paused = 0 WHERE u.status = 'active' AND u.open_space = 1) AS space`).first();
  const c = { uni: (r && r.uni) || 0, space: (r && r.space) || 0, at: now() };
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('counts', ?1) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(c)).run();
  return c;
}

export function setChoice(env, id, on) {
  return env.DB.prepare(`INSERT INTO universe_optin (tg_id, universe_id, enabled, at) VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT (tg_id, universe_id) DO UPDATE SET enabled = excluded.enabled, at = excluded.at`).bind(id, UNI, on ? 1 : 0, now()).run();
}

/* ---------- the owner's page ---------- */

export async function adminView(env) {
  const rows = await env.DB.prepare(`SELECT ch.chat_id, ch.title, uc.status, uc.at, uc.requested_by, ru.username AS by_username,
      (SELECT COUNT(*) FROM memberships m JOIN users x ON x.tg_id = m.tg_id AND x.status != 'banned' WHERE m.chat_id = ch.chat_id AND m.member = 1) AS in_bot,
      (SELECT COUNT(*) FROM memberships m JOIN universe_optin o ON o.tg_id = m.tg_id AND o.universe_id = ${UNI} AND o.enabled = 0
         WHERE m.chat_id = ch.chat_id AND m.member = 1) AS only_chat
      FROM chats ch LEFT JOIN universe_chats uc ON uc.chat_id = ch.chat_id AND uc.universe_id = ?1
      LEFT JOIN users ru ON ru.tg_id = uc.requested_by
      WHERE ch.active = 1 AND ch.blocked = 0 ORDER BY ch.bound_at`).bind(UNI).all();
  const people = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users u WHERE u.status = 'active' AND ${IN_UNI("u.tg_id")}`).first("n");
  const it = x => ({ id: String(x.chat_id), title: x.title || "", in_bot: x.in_bot || 0, only_chat: x.only_chat || 0, at: x.at || null,
    by: x.requested_by ? (x.by_username ? "@" + x.by_username : "admin") : null });
  const list = rows.results || [];
  return {
    ok: true, name: "Вселенная", people: people || 0,
    requests: list.filter(x => x.status === "requested").map(it),
    members: list.filter(x => x.status === "member").map(it),
    others: list.filter(x => !x.status).map(it),
  };
}

/** add (the owner, no request) | accept | decline | remove. Joining: its people are told (outbox). */
export async function adminAction(env, ownerId, chatId, action) {
  const ch = await db.getChat(env, chatId);
  if (!ch || !ch.active || ch.blocked) return { error: "not_found" };
  const cur = await env.DB.prepare("SELECT status, requested_by FROM universe_chats WHERE universe_id = ?1 AND chat_id = ?2").bind(UNI, chatId).first();
  if (action === "add" || action === "accept") {
    if (cur && cur.status === "member") return { ok: true };
    await env.DB.prepare(`INSERT INTO universe_chats (universe_id, chat_id, status, requested_by, at) VALUES (?1, ?2, 'member', NULL, ?3)
        ON CONFLICT (universe_id, chat_id) DO UPDATE SET status = 'member', at = excluded.at`).bind(UNI, chatId, now()).run();
    await db.audit(env, ownerId, "uni_add", chatId);
    if (cur && cur.requested_by) await send(env, cur.requested_by, t("uniAccepted", { chat: esc(ch.title || "") }, await langOf(env, cur.requested_by)));
    await tellChatJoined(env, chatId, ch.title || "");
    return { ok: true };
  }
  if (action === "decline" || action === "remove") {
    if (!cur) return { ok: true };
    await env.DB.prepare("DELETE FROM universe_chats WHERE universe_id = ?1 AND chat_id = ?2").bind(UNI, chatId).run();
    await db.audit(env, ownerId, action === "remove" ? "uni_remove" : "uni_decline", chatId);
    if (action === "decline" && cur.requested_by) await send(env, cur.requested_by, t("uniDeclined", { chat: esc(ch.title || "") }, await langOf(env, cur.requested_by)));
    return { ok: true };
  }
  return { error: "bad_action" };
}

async function langOf(env, id) {
  const u = await env.DB.prepare("SELECT lang, ui_lang FROM users WHERE tg_id = ?1").bind(id).first();
  return (u && (u.ui_lang || (String(u.lang || "").startsWith("en") ? "en" : null))) || "ru";
}

/** People of a chat that just joined: those who finished the steps before and have not chosen — asked once. */
async function tellChatJoined(env, chatId, title) {
  const all = await env.DB.prepare(`SELECT ch.title FROM universe_chats uc JOIN chats ch ON ch.chat_id = uc.chat_id AND ch.active = 1 AND ch.blocked = 0
      WHERE uc.universe_id = ?1 AND uc.status = 'member' AND uc.chat_id != ?2 ORDER BY uc.at`).bind(UNI, chatId).all();
  const others = (all.results || []).map(x => "«" + esc(x.title || "") + "»").join(", ");
  const r = await env.DB.prepare(`SELECT u.tg_id, u.ui_lang, u.lang FROM memberships m JOIN users u ON u.tg_id = m.tg_id AND u.status IN ('active', 'draft')
      LEFT JOIN universe_optin o ON o.tg_id = u.tg_id AND o.universe_id = ?2
      WHERE m.chat_id = ?1 AND m.member = 1 AND o.tg_id IS NULL AND u.consent_at IS NOT NULL`).bind(chatId, UNI).all();
  const rows = (r.results || []).map(u => {
    const lang = u.ui_lang || (String(u.lang || "").startsWith("en") ? "en" : "ru");
    return { tg_id: u.tg_id, kind: "uni", text: t(others ? "uniJoined" : "uniJoinedFirst", { chat: esc(title), others }, lang),
      markup: { inline_keyboard: [[{ text: t("uniOn", null, lang), callback_data: "uni:1" }, { text: t("uniOff", null, lang), callback_data: "uni:0" }]] } };
  });
  await enqueue(env, rows);
  await flush(env, 25);
}

/* ---------- a chat admin asks ---------- */

/** Chats the person is an admin of that are connected and not in the universe (asked from Telegram). */
export async function adminChats(env, id) {
  const r = await env.DB.prepare(`SELECT ch.chat_id, ch.title, uc.status FROM chats ch
      LEFT JOIN universe_chats uc ON uc.chat_id = ch.chat_id AND uc.universe_id = ?1
      WHERE ch.active = 1 AND ch.blocked = 0`).bind(UNI).all();
  const out = [];
  for (const ch of r.results || []) {
    if (ch.status === "member") continue;
    const m = await call(env, "getChatMember", { chat_id: ch.chat_id, user_id: id });
    if (m.ok && m.result && (m.result.status === "creator" || m.result.status === "administrator")) out.push({ chat_id: ch.chat_id, title: ch.title || "", requested: ch.status === "requested" });
  }
  return out;
}

export async function request(env, id, chatId, lang) {
  const m = await call(env, "getChatMember", { chat_id: chatId, user_id: id });
  if (!(m.ok && m.result && (m.result.status === "creator" || m.result.status === "administrator"))) return { error: "not_admin" };
  const ch = await db.getChat(env, chatId);
  if (!ch || !ch.active || ch.blocked) return { error: "not_found" };
  const cur = await env.DB.prepare("SELECT status FROM universe_chats WHERE universe_id = ?1 AND chat_id = ?2").bind(UNI, chatId).first();
  if (cur) return { ok: true, status: cur.status };
  await env.DB.prepare("INSERT INTO universe_chats (universe_id, chat_id, status, requested_by, at) VALUES (?1, ?2, 'requested', ?3, ?4)").bind(UNI, chatId, id, now()).run();
  await db.audit(env, id, "uni_request", chatId);
  if (env.ADMIN_ID) {
    const ol = await langOf(env, Number(env.ADMIN_ID));
    await send(env, env.ADMIN_ID, t("uniRequestOwner", { chat: esc(ch.title || "") }, ol));
  }
  return { ok: true, status: "requested" };
}

export async function withdraw(env, id, chatId) {
  const r = await env.DB.prepare("DELETE FROM universe_chats WHERE universe_id = ?1 AND chat_id = ?2 AND status = 'requested' AND requested_by = ?3 RETURNING chat_id")
    .bind(UNI, chatId, id).first();
  return r ? { ok: true } : { error: "not_found" };
}

/* ---------- outbox: messages sent a few at a time ---------- */

export async function enqueue(env, rows) {
  if (!rows.length) return;
  const t0 = now();
  for (let i = 0; i < rows.length; i += 40)
    await env.DB.batch(rows.slice(i, i + 40).map(x => env.DB.prepare("INSERT INTO outbox (tg_id, kind, text, markup, created_at, photo) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
      .bind(x.tg_id, x.kind, x.text, x.markup ? JSON.stringify(x.markup) : null, t0, x.photo || null)));
}

/** Sends up to `max` waiting messages, oldest first. A person who blocked the bot is just skipped. */
export async function flush(env, max) {
  max = max || 25;
  const r = await env.DB.prepare("SELECT id, tg_id, text, markup, photo FROM outbox ORDER BY id LIMIT ?1").bind(max).all();
  // owner, 2026-11-07: a photo with a text longer than a caption (1024) costs two Telegram calls — the batch keeps to `max` calls
  const cost = x => (x.photo && captionTooLong(x.text) ? 2 : 1);
  const list = []; let calls = 0;
  for (const x of r.results || []) { if (calls + cost(x) > max) break; calls += cost(x); list.push(x); }
  if (!list.length) return 0;
  await env.DB.prepare(`DELETE FROM outbox WHERE id IN (SELECT value FROM json_each(?1))`).bind(JSON.stringify(list.map(x => x.id))).run();
  for (const x of list) {
    const extra = { disable_notification: true, ...(x.markup ? { reply_markup: JSON.parse(x.markup) } : {}) };
    if (!x.photo) { await send(env, x.tg_id, x.text, extra); continue; }
    if (!captionTooLong(x.text)) { await call(env, "sendPhoto", { chat_id: x.tg_id, photo: x.photo, caption: x.text, parse_mode: "HTML", ...extra }); continue; }
    await call(env, "sendPhoto", { chat_id: x.tg_id, photo: x.photo, disable_notification: true });
    await send(env, x.tg_id, x.text, extra);
  }
  return list.length;
}
/** Telegram counts a caption after the HTML is parsed: &amp; etc. are one character */
function captionTooLong(html) { return Array.from(String(html || "").replace(/&(amp|lt|gt|quot);/g, "_")).length > 1024; }

/* ---------- open space for people without chats (owner, 2026-10-21) ---------- */

/** People who gave consent, are in no connected chat and have open space off — and were not invited yet. */
export async function noChatPeople(env) {
  const r = await env.DB.prepare(`SELECT u.tg_id, u.ui_lang, u.lang FROM users u
      WHERE u.consent_at IS NOT NULL AND u.status IN ('active', 'draft') AND u.open_space = 0 AND u.space_invited IS NULL AND u.tg_id != ?1
        AND NOT EXISTS (SELECT 1 FROM memberships m JOIN chats ch ON ch.chat_id = m.chat_id AND ch.active = 1 AND ch.blocked = 0
                        WHERE m.tg_id = u.tg_id AND m.member = 1)`).bind(Number(env.ADMIN_ID || 0)).all();
  return r.results || [];
}

export async function inviteToSpace(env, ownerId, appUrl) {
  const people = await noChatPeople(env);
  if (!people.length) return { ok: true, sent: 0 };
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'active' AND open_space = 1").first("n");
  await enqueue(env, people.map(u => {
    const lang = u.ui_lang || (String(u.lang || "").startsWith("en") ? "en" : "ru");
    return { tg_id: u.tg_id, kind: "space", text: t("spaceInvite", { n: n || 0 }, lang),
      markup: { inline_keyboard: [[{ text: t("spaceInviteBtn", null, lang), callback_data: "space:1" }], [{ text: t("openApp", null, lang), web_app: { url: appUrl } }]] } };
  }));
  await env.DB.prepare(`UPDATE users SET space_invited = ?2 WHERE tg_id IN (SELECT value FROM json_each(?1))`).bind(JSON.stringify(people.map(u => u.tg_id)), now()).run();
  await db.audit(env, ownerId, "space_invite", people.length);
  await flush(env, 25);
  return { ok: true, sent: people.length };
}
