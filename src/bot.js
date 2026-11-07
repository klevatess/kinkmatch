/* src/bot.js — routes Telegram updates.
   - /start: membership check in every connected chat; members get the «Open Kinkoverse» Mini App button.
   - /connect and the «Connect your chat» button: how to connect a chat (Telegram's own add-as-admin dialog).
   - A location sent in the private chat: turned into an H3 cell at once, the message with the point is deleted.
   - /health for the owner.
   - Chats are connected / disconnected by the bot's own admin status (my_chat_member); membership changes come from
     chat_member updates. The owner is told about every new chat and can block it (the bot leaves for good).
   In a group the bot posts exactly ONE message, once per chat: when it is connected, a short text with a button that
   opens the private chat with the bot (owner, 2026-10-19 — people typed /start in the group and got nothing). Nothing
   else is ever posted there. Group messages are never read or stored. */

import { call, send, esc, isMemberStatus, getMe } from "./tg.js";
import * as U from "./universe.js";
import { t, langOf } from "./i18n.js";
import { checkMembership } from "./membership.js";
import { saveLocation } from "./profile.js";
import * as db from "./db.js";
import { inviteFor, acceptInvite, scopeText, roleOf } from "./moderation.js";
import * as REF from "./referrals.js";

const isOwner = (env, id) => String(id) === String(env.ADMIN_ID || "");

/** "/connect@SomeBot arg" -> { cmd: "connect", at: "SomeBot", arg: "arg" } | null */
export function parseCommand(text) {
  const m = /^\/([A-Za-z0-9_]{1,32})(?:@([A-Za-z0-9_]{3,64}))?(?:\s+([\s\S]*))?$/.exec(String(text || "").trim());
  return m ? { cmd: m[1].toLowerCase(), at: m[2] || "", arg: (m[3] || "").trim() } : null;
}

/** «A», «B» и «C» — chat titles for a sentence (escaped). */
export function chatList(chats, lang) {
  const q = chats.map(c => "«" + esc(c.title || "") + "»");
  return q.length < 2 ? q.join("") : q.slice(0, -1).join(", ") + (lang === "en" ? " and " : " и ") + q[q.length - 1];
}

export async function handleUpdate(env, u) {
  if (u.message) return onMessage(env, u.message);
  if (u.my_chat_member) return onMyChatMember(env, u.my_chat_member);
  if (u.chat_member) return onChatMember(env, u.chat_member);
  if (u.callback_query) return onCallback(env, u.callback_query);
}

/** The person's language: chosen in the app, else from Telegram. */
async function langFor(env, from) {
  const u = from && (await db.getUser(env, from.id));
  return langOf(from && from.language_code, u && u.ui_lang);
}

const appUrl = env => (env.ORIGIN || "") + "/app/";
const appButton = (env, lang) => ({ inline_keyboard: [[{ text: t("openApp", null, lang), web_app: { url: appUrl(env) } }]] });
const connectButton = lang => ({ inline_keyboard: [[{ text: t("connectButton", null, lang), callback_data: "connect" }]] });

async function onMessage(env, m) {
  const chat = m.chat || {};
  if (m.migrate_to_chat_id && (await db.getChat(env, chat.id))) {
    await db.moveChat(env, chat.id, m.migrate_to_chat_id);
    return db.audit(env, null, "chat_moved", `${chat.id}->${m.migrate_to_chat_id}`);
  }
  if (chat.type !== "private" || !m.from || m.from.is_bot) return; // group messages: ignored
  if (m.location) return onLocation(env, m);
  const c = parseCommand(m.text);
  const lang = await langFor(env, m.from);
  if (c && c.cmd === "start" && /^mod_[a-z2-9]{16}$/.test(c.arg)) return invite(env, m.from, c.arg.slice(4), lang);
  // owner, 2026-11-07: a profile link t.me/<bot>?start=p_<code> → a button that opens that card in the app
  if (c && c.cmd === "start" && /^p_[a-z2-9]{8}$/.test(c.arg || "")) {
    const owner = await env.DB.prepare("SELECT tg_id FROM profile_links WHERE code = ?1 AND revoked_at IS NULL").bind(c.arg.slice(2)).first("tg_id");
    const ref = owner ? await REF.onStartUser(env, m.from, owner) : false;   // owner, 2026-11-07: one link — it invites too
    await db.upsertUser(env, m.from);
    if (ref) await REF.record(env, ref.inviter, m.from.id);
    return send(env, m.from.id, t("plinkOpen", null, lang), { reply_markup: { inline_keyboard: [[{ text: t("plinkButton", null, lang), web_app: { url: appUrl(env) + "?p=" + c.arg.slice(2) } }]] } });
  }
  if (c && c.cmd === "start") return start(env, m.from, m.message_id, /^r_[a-z2-9]{8}$/.test(c.arg || "") ? c.arg.slice(2) : null);
  if (c && c.cmd === "mod") {
    const role = await roleOf(env, m.from.id);
    return role ? send(env, chat.id, t("modOpen", null, lang), { reply_markup: { inline_keyboard: [[{ text: t("modOpen", null, lang), web_app: { url: appUrl(env) } }]] } })
      : send(env, chat.id, t("notMod", null, lang));
  }
  if (c && c.cmd === "connect") return connectHelp(env, m.from.id, lang);
  if (c && c.cmd === "universe") return universeCmd(env, m.from.id, lang);
  if (c && c.cmd === "invite") return sendInvite(env, m.from.id, lang, null);
  if (c && c.cmd === "health" && isOwner(env, m.from.id)) return health(env, m.from.id, lang);
  return send(env, chat.id, t("unknown", null, lang));
}

async function start(env, from, msgId, refCode) {
  // owner, 2026-10-31: a personal invite link counts only for someone who has never opened the bot (checked before the row exists)
  const ref = refCode ? await REF.onStart(env, from, refCode) : false;
  await db.upsertUser(env, from);
  if (ref) await REF.record(env, ref.inviter, from.id);
  const lang = await langFor(env, from);
  const pre = ref ? t("refWelcome", null, lang) + "\n\n" : "";
  // the owner's account is the admin panel (as a participant the owner uses another account)
  if (isOwner(env, from.id)) return send(env, from.id, t("ownerWelcome", null, lang), { reply_markup: appButton(env, lang) });
  const me = await db.getUser(env, from.id);
  if (me && me.status === "banned") return send(env, from.id, t("banned", null, lang));
  // owner, 2026-10-21: someone who has already started (consent given) gets no welcome again — one short line with the
  // app button; their «/start» and the previous such line go, so nothing piles up over the bot's real messages
  if (me && me.consent_at) {
    if (msgId) await call(env, "deleteMessage", { chat_id: from.id, message_id: msgId });
    if (me.hi_msg) await call(env, "deleteMessage", { chat_id: from.id, message_id: me.hi_msg });
    const j = await send(env, from.id, t("hiAgain", null, lang), { reply_markup: appButton(env, lang), disable_notification: true });
    await env.DB.prepare("UPDATE users SET hi_msg = ?2 WHERE tg_id = ?1").bind(from.id, j && j.ok && j.result && j.result.message_id || null).run();
    return;
  }
  const r = await checkMembership(env, from.id, { wait: 25000 });   // owner, 2026-11-04: /start may wait (nobody looks at a loading screen)
  if (r.member.length === 1) return send(env, from.id, pre + t("welcome", { chat: chatList(r.member, lang) }, lang), { reply_markup: appButton(env, lang) });
  if (r.member.length > 1) return send(env, from.id, pre + t("welcomeMany", { chats: chatList(r.member, lang) }, lang), { reply_markup: appButton(env, lang) });
  if (r.chats && r.failed) return send(env, from.id, t("checkFailed", null, lang));
  // not in any connected chat (or none connected yet): «open space» only (owner, 2026-10-19); a chat admin may connect theirs
  return send(env, from.id, pre + t(r.chats ? "notMember" : "noChat", null, lang), { reply_markup: { inline_keyboard: [
    [{ text: t("openApp", null, lang), web_app: { url: appUrl(env) } }], [{ text: t("connectButton", null, lang), callback_data: "connect" }]] } });
}

/** /start mod_<code>: the invitation, with «Accept» / «Decline» (nothing happens until the person accepts). */
async function invite(env, from, code, lang) {
  await db.upsertUser(env, from);
  const i = !isOwner(env, from.id) && (await inviteFor(env, code));
  if (!i) return send(env, from.id, t("modInvalid", null, lang));
  return send(env, from.id, t("modInvite", { scope: await scopeText(env, i.scope, lang) }, lang), { reply_markup: { inline_keyboard: [[
    { text: t("modAccept", null, lang), callback_data: "mok:" + code }, { text: t("modDecline", null, lang), callback_data: "mno" }]] } });
}

/** How to connect a chat: one button that opens Telegram's own «pick a group, add the bot as admin» dialog.
    A chat admin who already connected chats sees them first, with their numbers. */
async function connectHelp(env, chatId, lang) {
  const mine = await env.DB.prepare(`SELECT c.chat_id, c.title, c.member_count,
      (SELECT COUNT(*) FROM memberships m WHERE m.chat_id = c.chat_id AND m.member = 1) AS opened,
      (SELECT COUNT(*) FROM memberships m JOIN users u ON u.tg_id = m.tg_id WHERE m.chat_id = c.chat_id AND m.member = 1 AND u.status = 'active') AS ready
      FROM chats c WHERE c.bound_by = ?1 AND c.active = 1 AND c.blocked = 0 ORDER BY c.bound_at`).bind(chatId).all();
  const list = mine.results || [];
  if (list.length) {
    const lines = list.map(c => t("myChatLine", { chat: esc(c.title || ""), size: c.member_count == null ? "?" : c.member_count, opened: c.opened, ready: c.ready }, lang));
    await send(env, chatId, t("myChats", null, lang) + "\n" + lines.join("\n") + "\n\n" + t("myChatsInvite", null, lang));
  }
  const me = await getMe(env);
  const url = me ? `https://t.me/${me.username}?startgroup=kv&admin=manage_chat` : null;
  return send(env, chatId, t("connectHelp", null, lang),
    url ? { reply_markup: { inline_keyboard: [[{ text: t("pickChatButton", null, lang), url }]] } } : undefined);
}

/** The one message the bot posts in a chat: the invitation text + a button to the private chat. Once per chat
    (chats.invite_posted), unless the owner asks again from the panel (force). -> true if posted */
export async function postChatButton(env, chatId, force, lang) {
  const ch = await db.getChat(env, chatId);
  if (!ch || !ch.active || ch.blocked || (ch.invite_posted && !force)) return false;
  const me = await getMe(env);
  if (!me) return false;
  lang = lang || (await ownerLang(env));   // the chat's language is unknown: the adder's, else the owner's
  const r = await inviteMessage(env, chatId, lang, me);
  if (r.ok) await env.DB.prepare("UPDATE chats SET invite_posted = 1 WHERE chat_id = ?1").bind(chatId).run();
  return !!r.ok;
}

/** An invitation card to forward to a community chat: text + a URL button to the bot (forwarding keeps the button). */
async function sendInvite(env, to, lang, chatTitle) {
  const me = await getMe(env);
  if (!me) return;
  await send(env, to, chatTitle ? t("inviteIntro", { chat: esc(chatTitle) }, lang) : t("inviteIntroAny", null, lang));
  return inviteMessage(env, to, lang, me);
}

/** owner, 2026-10-26: the invitation as a picture (public/brand/invite-<lang>.png) with the text as its caption and the
    button; if Telegram cannot take the picture (no ORIGIN, a fetch error), the same text without it. */
async function inviteMessage(env, to, lang, me) {
  const markup = { inline_keyboard: [[{ text: t("inviteButton", null, lang), url: `https://t.me/${me.username}?start=hi` }]] };
  if (env.ORIGIN) {
    const r = await call(env, "sendPhoto", { chat_id: to, photo: env.ORIGIN + "/brand/invite-" + (lang === "en" ? "en" : "ru") + ".png?v=2",
      caption: t("inviteCard", null, lang), parse_mode: "HTML", reply_markup: markup });
    if (r.ok) return r;
  }
  return send(env, to, t("inviteCard", null, lang), { reply_markup: markup });
}

/** A point sent in the chat (Telegram's picker allows any point): only its cell is kept, the message is deleted. */
async function onLocation(env, m) {
  const lang = await langFor(env, m.from);
  const user = await db.getUser(env, m.from.id);
  const del = () => call(env, "deleteMessage", { chat_id: m.chat.id, message_id: m.message_id });
  if (!user || !user.consent_at) { await del(); return send(env, m.chat.id, t("locNoAccess", null, lang)); }
  // radius: the one chosen in the app (step «Where are you»), else the current zone's, else ~3 km
  const res = await env.DB.prepare("SELECT res FROM locations WHERE tg_id = ?1").bind(m.from.id).first("res");
  const radius = user.radius_pref === 1 || user.radius_pref === 3 ? user.radius_pref : res === 8 ? 1 : 3;
  const r = await saveLocation(env, m.from.id, m.location.latitude, m.location.longitude, radius);
  await del();
  if (r.error === "too_soon") {
    const d = new Date(r.next * 1000).toLocaleDateString(lang === "en" ? "en-GB" : "ru-RU", { day: "numeric", month: "long" });
    return send(env, m.chat.id, t("locTooSoon", { date: d }, lang));
  }
  if (r.error) return;
  return send(env, m.chat.id, t("locSaved", { km: radius }, lang), { reply_markup: appButton(env, lang) });
}

/** Buttons. "blk:<chat id>" = an old «block» button (now only a hint to the panel); "connect" = how to connect a chat. Roles are checked here. */
async function onCallback(env, q) {
  const blk = /^blk:(-?\d{1,20})$/.exec(String(q.data || ""));
  const lang = await langFor(env, q.from);
  if (blk) {   // the old «Block this chat» button under earlier messages: it no longer blocks (owner, 2026-10-20)
    await call(env, "answerCallbackQuery", { callback_query_id: q.id, text: t("ownerBlockMoved", null, lang), show_alert: true });
    if (q.message) await call(env, "editMessageReplyMarkup", { chat_id: q.message.chat.id, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } });
    return;
  }
  const mok = /^mok:([a-z2-9]{16})$/.exec(String(q.data || ""));
  if (mok || q.data === "mno") {
    await call(env, "answerCallbackQuery", { callback_query_id: q.id });
    if (q.message) await call(env, "editMessageReplyMarkup", { chat_id: q.message.chat.id, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } });
    if (!mok) return send(env, q.from.id, t("modDeclined", null, lang));
    const ok = await acceptInvite(env, q.from, mok[1]);
    return send(env, q.from.id, t(ok ? "modDone" : "modInvalid", null, lang), ok ? { reply_markup: { inline_keyboard: [[{ text: t("modOpen", null, lang), web_app: { url: appUrl(env) } }]] } } : undefined);
  }
  // owner, 2026-10-21: «Вселенная» and open space from a message
  const edit = async key => {
    if (q.message) await call(env, "editMessageText", { chat_id: q.message.chat.id, message_id: q.message.message_id, text: t(key, null, lang), parse_mode: "HTML" });
  };
  if (q.data === "uni:1" || q.data === "uni:0") {
    await call(env, "answerCallbackQuery", { callback_query_id: q.id });
    await U.setChoice(env, q.from.id, q.data === "uni:1");
    return edit(q.data === "uni:1" ? "uniSetOn" : "uniSetOff");
  }
  if (q.data === "rem:off") {   // owner, 2026-10-21: «Не напоминать»
    await call(env, "answerCallbackQuery", { callback_query_id: q.id });
    await env.DB.prepare("UPDATE users SET no_remind = 1 WHERE tg_id = ?1").bind(q.from.id).run();
    return edit("remStopped");
  }
  if (q.data === "space:1") {
    await call(env, "answerCallbackQuery", { callback_query_id: q.id });
    await env.DB.prepare("UPDATE users SET open_space = 1 WHERE tg_id = ?1").bind(q.from.id).run();
    return edit("spaceSetOn");
  }
  const ureq = /^u(req|wd):(-?\d{1,20})$/.exec(String(q.data || ""));
  if (ureq) {
    const chatId = Number(ureq[2]), ch = await db.getChat(env, chatId), title = esc((ch && ch.title) || "");
    const r = ureq[1] === "req" ? await U.request(env, q.from.id, chatId, lang) : await U.withdraw(env, q.from.id, chatId);
    await call(env, "answerCallbackQuery", { callback_query_id: q.id, text: r.error === "not_admin" ? t("uniNotAdmin", null, lang) : undefined, show_alert: r.error === "not_admin" });
    if (r.error) return;
    if (ureq[1] === "wd") return q.message && call(env, "editMessageText", { chat_id: q.message.chat.id, message_id: q.message.message_id, text: t("uniReqWithdrawn", { chat: title }, lang), parse_mode: "HTML" });
    if (r.status === "member") return send(env, q.from.id, t("uniReqAlready", { chat: title }, lang));
    return send(env, q.from.id, t("uniReqSent", { chat: title }, lang), { reply_markup: { inline_keyboard: [[{ text: t("uniWdBtn", null, lang), callback_data: "uwd:" + chatId }]] } });
  }
  if (q.data === "connect") {
    await call(env, "answerCallbackQuery", { callback_query_id: q.id });
    return connectHelp(env, q.from.id, lang);
  }
  return call(env, "answerCallbackQuery", { callback_query_id: q.id });
}

/** /universe — a chat admin applies for their connected chat (owner, 2026-10-21). */
async function universeCmd(env, id, lang) {
  const chats = await U.adminChats(env, id);
  if (!chats.length) return send(env, id, t("uniNone", null, lang));
  const st = await U.adminView(env);
  const list = st.members.length ? ": " + st.members.map(c => "«" + esc(c.title) + "»").join(", ") : "";
  return send(env, id, t("uniOffer", { list, chat: chats.map(c => esc(c.title)).join("», «") }, lang) + "\n\n" + t("uniPick", null, lang),
    { reply_markup: { inline_keyboard: chats.map(c => [{ text: (c.requested ? "✓ " : "") + c.title.slice(0, 40), callback_data: (c.requested ? "uwd:" : "ureq:") + c.chat_id }]) } });
}

/** Right after the bot is connected: the admin who did it is offered the universe (silently nothing if they never started the bot). */
async function offerUniverse(env, u, chatId, title) {
  if (!u.from || u.from.is_bot || isOwner(env, u.from.id)) return;
  const lang = await langFor(env, u.from);
  const st = await U.adminView(env);
  const list = st.members.length ? ": " + st.members.map(c => "«" + esc(c.title) + "»").join(", ") : "";
  const log = console.log; console.log = () => {};
  try { await send(env, u.from.id, t("uniOffer", { list, chat: esc(title || "") }, lang), { reply_markup: { inline_keyboard: [[{ text: t("uniReqBtn", null, lang), callback_data: "ureq:" + chatId }]] } }); }
  finally { console.log = log; }
}

/** Tell the person who added / promoted the bot (works only if they have started the bot; otherwise silently nothing). */
async function tellAdder(env, u, key, vars) {
  if (!u.from || u.from.is_bot || isOwner(env, u.from.id)) return; // the owner gets the owner's message instead
  const lang = await langFor(env, u.from);
  const log = console.log; // a 403 «bot can't initiate conversation» is expected here, not an error worth logging
  console.log = () => {};
  try { await send(env, u.from.id, t(key, vars, lang)); } finally { console.log = log; }
}

async function ownerLang(env) {
  const owner = env.ADMIN_ID ? await db.getUser(env, Number(env.ADMIN_ID)) : null;
  return langOf(owner && owner.lang, owner && owner.ui_lang);
}

/** The bot's own status in a chat changed. Admin → connected; anything else → disconnected. */
async function onMyChatMember(env, u) {
  const chat = u.chat || {};
  if (chat.type !== "group" && chat.type !== "supergroup") return;
  const st = u.new_chat_member && u.new_chat_member.status;
  const ch = await db.getChat(env, chat.id);

  if (st === "administrator") {
    if (ch && ch.blocked) { await call(env, "leaveChat", { chat_id: chat.id }); return; }
    if (ch && ch.active) return; // only its rights changed
    const by = u.from && !u.from.is_bot ? u.from.id : null; // the admin who promoted the bot
    await db.bindChat(env, chat.id, chat.title, by);
    await db.audit(env, by, "chat_bind", chat.id);
    const posted = await postChatButton(env, chat.id, false, u.from && !u.from.is_bot ? await langFor(env, u.from) : null);
    await tellAdder(env, u, posted ? "dmBound" : "dmBoundNoPost", { chat: esc(chat.title || "") });
    await offerUniverse(env, u, chat.id, chat.title);
    if (env.ADMIN_ID) {
      const n = await call(env, "getChatMemberCount", { chat_id: chat.id });
      const ol = await ownerLang(env);
      // owner, 2026-10-20: no «Block» button here — too easy to press by accident. Blocking is in the panel (two confirmations).
      await send(env, env.ADMIN_ID, t("ownerNewChat", { chat: esc(chat.title || ""), count: n.ok ? n.result : "?" }, ol),
        { reply_markup: { inline_keyboard: [[{ text: t("ownerOpenPanel", null, ol), web_app: { url: appUrl(env) } }]] } });
    }
    return;
  }

  if (st === "member" || st === "restricted") { // in the chat, but without the admin seat
    if (ch && ch.blocked) { await call(env, "leaveChat", { chat_id: chat.id }); return; }
    if (ch && ch.active) {
      await chatOff(env, ch);
    } else {
      const old = u.old_chat_member && u.old_chat_member.status;
      if (old === "left" || old === "kicked" || !old) // just added (not a rights change): say once, privately
        await tellAdder(env, u, "dmNeedAdmin", { chat: esc(chat.title || "") });
    }
    return;
  }

  // left / kicked: the bot is out of the chat
  if (ch && ch.active) await chatOff(env, ch);
}

async function chatOff(env, ch) {
  await db.deactivateChat(env, ch.chat_id);
  await db.audit(env, null, "chat_off", ch.chat_id);
  if (env.ADMIN_ID) await send(env, env.ADMIN_ID, t("ownerChatOff", { chat: esc(ch.title || "") }, await ownerLang(env)));
}

/** Someone joined / left / was banned in a connected chat. Only people who use the bot are touched. */
async function onChatMember(env, u) {
  const ch = await db.getChat(env, u.chat.id);
  if (!ch || !ch.active || !u.new_chat_member || !u.new_chat_member.user) return;
  return db.updateMemberIfKnown(env, u.new_chat_member.user.id, u.chat.id, isMemberStatus(u.new_chat_member));
}

async function health(env, chatId, lang) {
  let c = { users: "?", members: "?", chats: "?" }, dbOk = "ok";
  try { c = await db.counts(env); } catch (e) { dbOk = lang === "en" ? "error" : "ошибка"; }
  const w = await call(env, "getWebhookInfo");
  const info = (w.ok && w.result) || {};
  return send(env, chatId, t("health", {
    db: dbOk, users: c.users, members: c.members, chats: c.chats,
    pending: info.pending_update_count == null ? "?" : info.pending_update_count,
    error: esc(info.last_error_message || (lang === "en" ? "none" : "нет")),
  }, lang));
}
