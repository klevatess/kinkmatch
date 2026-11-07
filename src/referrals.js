/* src/referrals.js — owner, 2026-10-31: personal invite links and messages earned with them.
   - every person has a link t.me/<bot>?start=r_<code>; it counts only for someone who has never opened the bot;
   - the invitee reaches the map → «на проверке»: the owner and moderators of ALL chats decide «живой» (+5 messages to the
     inviter) or «похож на бота» (the inviter is told; nothing happens to the invitee, who is never told);
   - the owner can switch inviting off for a person (the link stops working, earned messages stay) and change a decision;
   - access does not change: without a connected chat an invitee gets «Открытый космос», like anyone (bot.js start).
     GET  /api/invites                       the person's link, balance, invitees
     GET  /api/mod/referrals?state=review|done   POST /api/mod/referral { id, decision: "ok" | "bot" }
     POST /api/admin/can-invite { id, on }  */

import { send, esc } from "./tg.js";
import { t, langOf } from "./i18n.js";
import { now } from "./db.js";
import { decrypt } from "./crypto.js";
import { views } from "./score.js";
import { ageOf } from "./profile.js";

export const REWARD = 5;
const ABC = "abcdefghijkmnpqrstuvwxyz23456789";
const isOwner = (env, id) => String(id) === String(env.ADMIN_ID || "");
export const mayReview = role => !!role && (role.owner || !role.scope);   // the owner and moderators of all chats

async function quiet(env, to, text, extra) {
  const log = console.log; console.log = () => {};
  try { return await send(env, to, text, extra); } catch (e) { return null; } finally { console.log = log; }
}
async function langFor(env, id) {
  const u = await env.DB.prepare("SELECT lang, ui_lang FROM users WHERE tg_id = ?1").bind(id).first();
  return langOf(u && u.lang, u && u.ui_lang);
}
const appBtn = (env, key, lang) => ({ inline_keyboard: [[{ text: t(key, null, lang), web_app: { url: (env.ORIGIN || "") + "/app/" } }]] });

/** The person's code (made the first time it is asked for). */
async function codeOf(env, id) {
  const u = await env.DB.prepare("SELECT invite_code FROM users WHERE tg_id = ?1").bind(id).first();
  if (u && u.invite_code) return u.invite_code;
  for (let i = 0; i < 5; i++) {
    const r = crypto.getRandomValues(new Uint8Array(8)), code = Array.from(r, x => ABC[x % ABC.length]).join("");
    try { await env.DB.prepare("UPDATE users SET invite_code = ?2 WHERE tg_id = ?1 AND invite_code IS NULL").bind(id, code).run(); } catch (e) { continue; }   // taken: another one
    const again = await env.DB.prepare("SELECT invite_code FROM users WHERE tg_id = ?1").bind(id).first("invite_code");
    if (again) return again;
  }
  return null;
}

/** POST /api/invite-link → { code } (made once; refused while inviting is switched off for the person) */
export async function makeCode(env, id) {
  const u = await env.DB.prepare("SELECT can_invite FROM users WHERE tg_id = ?1").bind(id).first();
  if (!u || !u.can_invite) return { error: "invites_off" };
  const code = await codeOf(env, id);
  return code ? { ok: true, code } : { error: "try_again" };
}

/** bot.js, /start r_<code>, BEFORE the person's row is written: only someone new to the bot counts.
    -> true when the invitation was recorded (the welcome then says «Вас пригласил(а) участник Kinkoverse») */
export async function onStart(env, from, code) {
  if (!/^[a-z2-9]{8}$/.test(String(code || ""))) return false;
  if (await env.DB.prepare("SELECT 1 AS x FROM users WHERE tg_id = ?1").bind(from.id).first()) return false;   // not new
  const inv = await env.DB.prepare("SELECT tg_id, status, can_invite FROM users WHERE invite_code = ?1").bind(code).first();
  if (!inv || inv.tg_id === from.id || inv.status === "banned" || !inv.can_invite || isOwner(env, from.id)) return false;
  return { inviter: inv.tg_id };
}
/** owner, 2026-11-07: the profile link is the invite link too — someone NEW who comes by it counts as invited by its owner
    (same rules as r_<code>: the owner may invite, is not banned, is not the bot's owner, not themselves). */
export async function onStartUser(env, from, inviterId) {
  if (!inviterId || inviterId === from.id || isOwner(env, from.id)) return false;
  if (await env.DB.prepare("SELECT 1 AS x FROM users WHERE tg_id = ?1").bind(from.id).first()) return false;   // not new
  const inv = await env.DB.prepare("SELECT tg_id, status, can_invite FROM users WHERE tg_id = ?1").bind(inviterId).first();
  if (!inv || inv.status === "banned" || !inv.can_invite) return false;
  return { inviter: inv.tg_id };
}
export async function record(env, inviter, invitee) {
  await env.DB.prepare("INSERT OR IGNORE INTO referrals (invitee, inviter, created_at) VALUES (?1, ?2, ?3)").bind(invitee, inviter, now()).run();
}

/** Called when a person is on the map (api.js me()): an invitee goes to the review queue once. */
export async function markReady(env, id) {
  const r = await env.DB.prepare("UPDATE referrals SET status = 'review', ready_at = ?2 WHERE invitee = ?1 AND status = 'open' RETURNING inviter").bind(id, now()).first();
  if (!r) return;
  const nick = (await env.DB.prepare("SELECT nick FROM profiles WHERE tg_id = ?1").bind(id).first("nick")) || "";
  const inviterNick = (await env.DB.prepare("SELECT nick FROM profiles WHERE tg_id = ?1").bind(r.inviter).first("nick")) || "";
  const il = await langFor(env, r.inviter);
  await quiet(env, r.inviter, t("refReady", { nick: esc(nick || t("refSomeone", null, il)) }, il));
  const mods = await env.DB.prepare("SELECT tg_id FROM moderators WHERE scope IS NULL").all();
  const to = [Number(env.ADMIN_ID || 0), ...(mods.results || []).map(m => m.tg_id)].filter(x => x && x !== id && x !== r.inviter);
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM referrals WHERE status = 'review'").first("n");
  for (const m of to.slice(0, 30)) {
    const lang = await langFor(env, m);
    await quiet(env, m, t("refQueue", { nick: esc(nick || "—"), by: esc(inviterNick || "—"), n }, lang), { reply_markup: appBtn(env, "modOpen", lang) });
  }
}

/** GET /api/invites → { code, can, balance, earned, spent, unlimited, items: [{ nick, at, status }] } */
export async function mine(env, id) {
  const u = await env.DB.prepare(`SELECT u.can_invite, u.invite_code, u.msg_balance, u.msg_earned, u.msg_spent, (p.star_at IS NOT NULL OR p.nova_at IS NOT NULL) AS star FROM users u
      LEFT JOIN profiles p ON p.tg_id = u.tg_id WHERE u.tg_id = ?1`).bind(id).first();
  if (!u) return { error: "not_found" };
  // owner, 2026-10-31: light — no Telegram call, no code made here (POST /api/invite-link makes it on the first share);
  // the app builds the link from the code and the bot name it already has
  const code = u.can_invite ? u.invite_code || null : null;
  const r = await env.DB.prepare(`SELECT r.status, r.created_at, p.nick, (p.looking_for IS NOT NULL) AS filled FROM referrals r
      LEFT JOIN profiles p ON p.tg_id = r.invitee
      WHERE r.inviter = ?1 ORDER BY r.created_at DESC LIMIT 100`).bind(id).all();
  return {
    ok: true, can: !!u.can_invite, code, balance: u.msg_balance || 0, earned: u.msg_earned || 0, spent: u.msg_spent || 0, unlimited: !!u.star, reward: REWARD,
    // the invitee's nickname only once the profile is filled (owner)
    items: (r.results || []).map(x => ({ nick: x.filled && x.nick ? x.nick : null, at: x.created_at, status: x.status })),
  };
}

const ANS_YES = 3;
/** Helper signals for a reviewer (no answers shown here, only shares). */
async function signals(env, x) {
  let yes = null;
  if (x.enc) {
    try {
      const v = views(JSON.parse(await decrypt(env.DATA_KEY, x.enc)));
      const vec = v.ext ? v.top.map((a, i) => Math.max(a || 0, v.bottom[i] || 0)) : v.plain;
      let n = 0, y = 0, m = 0, l = 0;
      for (const a of vec) if (a) { n++; if (a >= ANS_YES) y++; else if (a === 2) m++; else l++; }
      yes = n ? { yes: Math.round(y * 100 / n), maybe: Math.round(m * 100 / n), no: Math.round(l * 100 / n) } : null;
    } catch (e) { yes = null; }
  }
  return { fill_min: x.ready_at && x.created_at ? Math.max(1, Math.round((x.ready_at - x.created_at) / 60)) : null, shares: yes,
    about_len: (x.about || "").length, username: !!x.username };
}

/** GET /api/mod/referrals?state=review|done */
export async function queue(env, role, state) {
  const done = state === "done";
  const r = await env.DB.prepare(`SELECT r.*, u.pub_id, u.username, u.status AS ustatus, p.nick, p.gender, p.birth_date, p.about, c.role, c.experience, c.answered, c.enc,
      iu.pub_id AS by_pub, ip.nick AS by_nick,
      (SELECT COUNT(*) FROM referrals y WHERE y.inviter = r.inviter AND y.status = 'ok') AS by_ok,
      (SELECT COUNT(*) FROM referrals y WHERE y.inviter = r.inviter AND y.status = 'bot') AS by_bot,
      (SELECT COUNT(*) FROM referrals y WHERE y.inviter = r.inviter AND y.created_at > ?2) AS by_day,
      dm.name AS decider_name, du.username AS decider_username
    FROM referrals r JOIN users u ON u.tg_id = r.invitee LEFT JOIN profiles p ON p.tg_id = r.invitee LEFT JOIN checklists c ON c.tg_id = r.invitee
      LEFT JOIN users iu ON iu.tg_id = r.inviter LEFT JOIN profiles ip ON ip.tg_id = r.inviter
      LEFT JOIN moderators dm ON dm.tg_id = r.decided_by LEFT JOIN users du ON du.tg_id = r.decided_by
    WHERE ${done ? "r.status IN ('ok', 'bot') AND r.decided_at > ?1" : "r.status = 'review'"} ORDER BY ${done ? "r.decided_at DESC" : "r.ready_at"} LIMIT 50`)
    .bind(now() - 30 * 86400, now() - 86400).all();
  const waiting = await env.DB.prepare("SELECT COUNT(*) AS n FROM referrals WHERE status = 'review'").first("n");
  const items = [];
  for (const x of r.results || []) {
    items.push({
      n: x.pub_id, nick: x.nick || "", gender: x.gender, age: x.birth_date ? ageOf(x.birth_date) : null, role: x.role, experience: x.experience, answered: x.answered || 0,
      about: x.about || "", at: x.ready_at, status: x.status, banned: x.ustatus === "banned",
      by: { n: x.by_pub, nick: x.by_nick || "", ok: x.by_ok, bot: x.by_bot, day: x.by_day },
      signals: await signals(env, x), decided_at: x.decided_at,
      decided_by: x.decided_by == null ? null : isOwner(env, x.decided_by) ? "owner" : (x.decider_name || (x.decider_username ? "@" + x.decider_username : "")),
      can_change: done ? role.owner : true,
    });
  }
  return { ok: true, items, waiting };
}

/** POST /api/mod/referral { id: invitee pub id, decision } — moderators decide once; the owner may change a decision. */
export async function decide(env, actor, role, pub, decision) {
  if (decision !== "ok" && decision !== "bot") return { error: "bad_decision" };
  if (!/^[a-z0-9]{10}$/.test(String(pub || ""))) return { error: "not_found" };
  const x = await env.DB.prepare("SELECT r.*, p.nick FROM referrals r JOIN users u ON u.tg_id = r.invitee LEFT JOIN profiles p ON p.tg_id = r.invitee WHERE u.pub_id = ?1").bind(pub).first();
  if (!x || x.status === "open") return { error: "not_found" };
  if (x.status === decision) return { ok: true };
  if (x.status !== "review" && !role.owner) return { error: "done" };
  const delta = (decision === "ok" ? REWARD : 0) - (x.status === "ok" ? REWARD : 0);   // the owner turned «живой» into «бот»: the 5 go back
  const t0 = now();
  await env.DB.batch([
    env.DB.prepare("UPDATE referrals SET status = ?2, decided_at = ?3, decided_by = ?4 WHERE invitee = ?1").bind(x.invitee, decision, t0, actor),
    env.DB.prepare("UPDATE users SET msg_balance = MAX(0, msg_balance + ?2), msg_earned = MAX(0, msg_earned + ?2) WHERE tg_id = ?1").bind(x.inviter, delta),
    env.DB.prepare("INSERT INTO audit (actor, action, target, created_at) VALUES (?1, ?2, ?3, ?4)").bind(actor, "referral_" + decision, "#" + pub, t0),
  ]);
  const lang = await langFor(env, x.inviter);
  const nick = esc(x.nick || t("refSomeone", null, lang));
  if (decision === "ok") {
    const bal = await env.DB.prepare("SELECT msg_balance FROM users WHERE tg_id = ?1").bind(x.inviter).first("msg_balance");
    await quiet(env, x.inviter, t("refOk", { nick, n: REWARD, balance: bal || 0 }, lang), { reply_markup: appBtn(env, "refBtn", lang) });
  } else await quiet(env, x.inviter, t("refBot", { nick }, lang));
  return { ok: true };
}

/** May this reviewer open the invitee's Telegram account (photo, name, @username)? owner, 2026-10-31: yes while the
    invitee waits for review and 30 days after the decision. */
export async function mayOpenAccount(env, role, pub) {
  if (!mayReview(role) || !/^[a-z0-9]{10}$/.test(String(pub || ""))) return false;
  return !!(await env.DB.prepare(`SELECT 1 AS x FROM referrals r JOIN users u ON u.tg_id = r.invitee WHERE u.pub_id = ?1
      AND (r.status = 'review' OR (r.status IN ('ok', 'bot') AND r.decided_at > ?2))`).bind(pub, now() - 30 * 86400).first());
}

/** The owner's profile page: who invited this person, whom they invited, the switch. */
export async function adminOf(env, tg) {
  const u = await env.DB.prepare(`SELECT u.can_invite, u.msg_balance, u.msg_earned, u.msg_spent, u.msg_granted, (p.star_at IS NOT NULL OR p.nova_at IS NOT NULL) AS star
      FROM users u LEFT JOIN profiles p ON p.tg_id = u.tg_id WHERE u.tg_id = ?1`).bind(tg).first();
  const by = await env.DB.prepare("SELECT r.status, iu.pub_id, ip.nick FROM referrals r JOIN users iu ON iu.tg_id = r.inviter LEFT JOIN profiles ip ON ip.tg_id = r.inviter WHERE r.invitee = ?1").bind(tg).first();
  const list = await env.DB.prepare(`SELECT r.status, r.created_at, u.pub_id, p.nick FROM referrals r JOIN users u ON u.tg_id = r.invitee LEFT JOIN profiles p ON p.tg_id = r.invitee
      WHERE r.inviter = ?1 ORDER BY r.created_at DESC LIMIT 100`).bind(tg).all();
  return {
    can: !!(u && u.can_invite), balance: (u && u.msg_balance) || 0, earned: (u && u.msg_earned) || 0, spent: (u && u.msg_spent) || 0,
    granted: (u && u.msg_granted) || 0, unlimited: !!(u && u.star),
    by: by ? { n: by.pub_id, nick: by.nick || "", status: by.status } : null,
    items: (list.results || []).map(x => ({ n: x.pub_id, nick: x.nick || "", at: x.created_at, status: x.status })),
  };
}
export async function setCan(env, actor, pub, on) {
  if (!/^[a-z0-9]{10}$/.test(String(pub || "")) || typeof on !== "boolean") return { error: "bad_id" };
  const r = await env.DB.prepare("UPDATE users SET can_invite = ?2 WHERE pub_id = ?1 RETURNING tg_id").bind(pub, on ? 1 : 0).first();
  if (!r) return { error: "not_found" };
  await env.DB.prepare("INSERT INTO audit (actor, action, target, created_at) VALUES (?1, ?2, ?3, ?4)").bind(actor, on ? "invite_on" : "invite_off", "#" + pub, now()).run();
  return { ok: true };
}

/** POST /api/admin/msg-grant { id, n } — owner, 2026-10-31: give a person n messages for likes (n < 0 takes some back,
    the balance never goes below 0). The person is told in the bot when messages are added. */
export async function grant(env, actor, pub, n) {
  n = Math.trunc(Number(n));
  if (!/^[a-z0-9]{10}$/.test(String(pub || ""))) return { error: "bad_id" };
  if (!n || Math.abs(n) > 1000) return { error: "bad_number" };
  const u = await env.DB.prepare("SELECT tg_id, msg_balance, status FROM users WHERE pub_id = ?1").bind(pub).first();
  if (!u || u.status === "banned" || String(u.tg_id) === String(env.ADMIN_ID || "")) return { error: "not_found" };
  const d = Math.max(n, -(u.msg_balance || 0));   // what really changes
  const t0 = now();
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET msg_balance = msg_balance + ?2, msg_granted = msg_granted + ?2 WHERE tg_id = ?1").bind(u.tg_id, d),
    env.DB.prepare("INSERT INTO audit (actor, action, target, created_at) VALUES (?1, ?2, ?3, ?4)").bind(actor, "msg_grant " + (d > 0 ? "+" : "") + d, "#" + pub, t0),
  ]);
  const balance = (u.msg_balance || 0) + d;
  if (d > 0) { const lang = await langFor(env, u.tg_id); await quiet(env, u.tg_id, t("msgGranted", { n: d, balance }, lang), { reply_markup: appBtn(env, "openApp", lang) }); }
  return { ok: true, balance, changed: d };
}

/** Обзор: the last 30 days. */
export async function funnel(env) {
  const since = now() - 30 * 86400;
  const f = await env.DB.prepare(`SELECT COUNT(*) AS opened, SUM(ready_at IS NOT NULL) AS filled, SUM(status = 'ok') AS ok, SUM(status = 'bot') AS bot,
      SUM(status = 'review') AS waiting FROM referrals WHERE created_at > ?1`).bind(since).first();
  const spent = await env.DB.prepare("SELECT SUM(msg_spent) AS n FROM users").first("n");   // all time (sent messages are not logged)
  const top = await env.DB.prepare(`SELECT u.pub_id, p.nick, COUNT(*) AS n, SUM(r.status = 'ok') AS ok, SUM(r.status = 'bot') AS bot, u.can_invite FROM referrals r
      JOIN users u ON u.tg_id = r.inviter LEFT JOIN profiles p ON p.tg_id = r.inviter WHERE r.created_at > ?1 GROUP BY r.inviter ORDER BY n DESC LIMIT 5`).bind(since).all();
  return {
    opened: (f && f.opened) || 0, filled: (f && f.filled) || 0, ok: (f && f.ok) || 0, bot: (f && f.bot) || 0, waiting: (f && f.waiting) || 0,
    credited: ((f && f.ok) || 0) * REWARD, sent: spent || 0,
    top: (top.results || []).map(x => ({ n: x.pub_id, nick: x.nick || "", n_all: x.n, ok: x.ok || 0, bot: x.bot || 0, can: !!x.can_invite })),
  };
}
