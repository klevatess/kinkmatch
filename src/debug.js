/* src/debug.js — bot-wide switches and the debug report (owner, 2026-10-19).
   - settings: filters_off ('1' = gender / age filters ignored, a test), debug_until (unix time; while in the future
     Telegram call failures and app errors are written to debug_log).
   - Server exceptions are always written to debug_log (they are rare and needed to find bugs).
   - The report (owner only) shows the inside of the bot: Telegram's view of the bot and its chats, every person's steps
     and visibility, who can see whom and why not. It never contains checklist answers, places, Telegram ids or names
     from Telegram — only public ids, nicknames, genders, ages (the owner sees these in the panel anyway). */

import { call, getMe, botId } from "./tg.js";
import { ageOf } from "./profile.js";
import { now } from "./db.js";
import { decrypt } from "./crypto.js";
import { detail } from "./score.js";

export const VERSION = "stage 8.65 · 2026-10-28";
export const LOG_DAYS = 7;
export const DEBUG_HOURS = 24;

export async function getSetting(env, key) {
  try { const r = await env.DB.prepare("SELECT value FROM settings WHERE key = ?1").bind(key).first(); return r ? r.value : null; }
  catch (e) { return null; }   // before migration 0007
}
export function setSetting(env, key, value) {
  return env.DB.prepare("INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT (key) DO UPDATE SET value = excluded.value")
    .bind(key, value == null ? null : String(value)).run();
}
export async function filtersOff(env) { return (await getSetting(env, "filters_off")) === "1"; }
export async function debugOn(env) { return Number(await getSetting(env, "debug_until") || 0) > now(); }

/** One row in the debug log. data must not hold answers, places, names or Telegram ids. Never throws. */
export async function dlog(env, kind, who, data) {
  try {
    await env.DB.prepare("INSERT INTO debug_log (at, kind, who, data) VALUES (?1, ?2, ?3, ?4)")
      .bind(now(), String(kind).slice(0, 40), who == null ? null : String(who).slice(0, 40), JSON.stringify(data || {}).slice(0, 2000)).run();
  } catch (e) { /* the log must never break the bot */ }
}
export function pruneDebug(env) {
  return env.DB.prepare("DELETE FROM debug_log WHERE at < ?1").bind(now() - LOG_DAYS * 86400).run();
}

/** POST /api/debug/client — the app's own errors and environment while debug is on (≤ 30 rows per person a day). */
export async function clientLog(env, pub, body) {
  // owner, 2026-10-25: the app's errors are always kept (with the stack and the last button); other rows only while debug is on
  // owner, 2026-10-27: a refused registration step is kept too, with only the safe «shape» of what was typed (always: 1)
  const isErr = body && (body.kind === "error" || (body.kind === "api" && body.always === 1));
  if (!isErr && !(await debugOn(env))) return { ok: true, off: true };
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM debug_log WHERE who = ?1 AND at > ?2").bind(pub, now() - 86400).first("n");
  if (n >= 30) return { ok: true, limited: true };
  const pick = o => { const r = {}; for (const k of ["kind", "message", "where", "platform", "version", "viewport", "theme", "ua", "screen", "api", "status", "act", "hidden", "stack", "shape", "broken"]) if (o && o[k] != null) r[k] = String(o[k]).slice(0, k === "stack" ? 900 : 300); return r; };
  await dlog(env, "app:" + String((body && body.kind) || "info").slice(0, 20), pub, pick(body));
  return { ok: true };
}

export async function noauthLog(env, body) {
  if (!(await debugOn(env))) return { ok: true, off: true };
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM debug_log WHERE kind = 'app:noauth' AND at > ?1").bind(now() - 86400).first("n");
  if (n >= 200) return { ok: true, limited: true };
  const pick = o => { const r = {}; for (const k of ["in_tg", "sdk", "platform", "version", "ua", "hash"]) if (o && o[k] != null) r[k] = String(o[k]).slice(0, 300); return r; };
  await dlog(env, "app:noauth", "anon", pick(body));
  return { ok: true };
}

/* ---------- who sees whom (debug report + calibration file) ---------- */

const uniWord = v => (v === 1 ? "on" : v === 0 ? "off («только мой чат»)" : "not chosen (= off)");

/** Every person's switches and, for every pair of active people (up to maxActive), whether they see each other and
    why not — the same rules as src/neighbours.js: a shared connected chat where both are members and «show me» is on,
    or both in open space, or both in the universe (chose it and are in one of its chats); both active, not paused,
    not hidden, a place set, not hidden for inactivity; gender / age filters both ways (unless filters_off).
    No answers, places or Telegram ids leave this function except tg ids used by the callers to join. */
export async function visibility(env, maxActive, labelOf) {
  const t0 = now(), all = sql => env.DB.prepare(sql).all().then(r => r.results || []);
  const chats = await all("SELECT chat_id, title, active, blocked FROM chats");
  const mem = await all("SELECT tg_id, chat_id, member, show FROM memberships");
  const users = await all(`SELECT u.tg_id, u.pub_id, u.status, u.open_space, u.idle_stage, u.hidden_until, u.activated_at, u.consent_at, u.notify_likes, u.digest,
      p.nick, p.birth_date, p.gender, p.show_genders, p.age_min, p.age_max, p.paused, p.looking_for, p.seeking, p.compare_before_yes, p.about_public, p.age_exact,
      (p.about IS NOT NULL AND p.about != '') AS has_about, c.answered, c.role AS list_role, c.extended, l.res, l.radius,
      (SELECT enabled FROM universe_optin o WHERE o.tg_id = u.tg_id AND o.universe_id = 1) AS uni_optin
      FROM users u LEFT JOIN profiles p ON p.tg_id = u.tg_id LEFT JOIN checklists c ON c.tg_id = u.tg_id LEFT JOIN locations l ON l.tg_id = u.tg_id
      WHERE u.tg_id != ${Number(env.ADMIN_ID || 0)} ORDER BY u.created_at LIMIT 400`);
  const titles = Object.fromEntries(chats.map(c => [c.chat_id, c.title || "?"]));
  const activeChat = Object.fromEntries(chats.map(c => [c.chat_id, !!c.active && !c.blocked]));
  const uniChats = new Set((await all("SELECT chat_id FROM universe_chats WHERE universe_id = 1 AND status = 'member'")).map(x => x.chat_id));
  const answers = await all("SELECT a, b, value FROM answers");
  const off = await filtersOff(env);
  // precomputed per person, so a pair costs almost nothing (Workers: 10 ms CPU per request on the free plan)
  const memOf = new Map();
  for (const m of mem) { if (!memOf.has(m.tg_id)) memOf.set(m.tg_id, []); memOf.get(m.tg_id).push(m); }
  const chatsOf = id => memOf.get(id) || [];
  const shownMap = new Map(users.map(u => [u.tg_id, chatsOf(u.tg_id).filter(m => m.member && m.show && activeChat[m.chat_id]).map(m => m.chat_id)]));
  const shownIn = id => shownMap.get(id) || [];
  const uniChatsOf = id => shownIn(id).filter(c => uniChats.has(c));
  const notNow = new Set(answers.filter(x => x.value === "no").map(x => x.a + ":" + x.b));
  const inUni = u => u.uni_optin === 1 && uniChatsOf(u.tg_id).length > 0;
  const label = labelOf || (u => (u.nick ? u.nick : (u.gender || "?")) + " #" + u.pub_id);   // the calibration file: «#pub_id» only
  const list = v => { try { return JSON.parse(v || "[]"); } catch (e) { return []; } };
  const showsOf = new Map(users.map(u => [u.tg_id, new Set(list(u.show_genders))])), ageMap = new Map(users.map(u => [u.tg_id, ageOf(u.birth_date)]));
  const accepts = (a, b) => {
    const ageB = ageMap.get(b.tg_id);
    if (!showsOf.get(a.tg_id).has(b.gender)) return "gender " + b.gender + " not in " + a.show_genders;
    if (ageB < (a.age_min || 18) || ageB > (a.age_max || 99)) return "age " + ageB + " outside " + (a.age_min || 18) + "-" + (a.age_max || 99);
    return null;
  };
  const people = users.map(u => ({
    tg: u.tg_id, who: label(u), status: u.status, gender: u.gender || null, age: ageOf(u.birth_date), age_shown: u.age_exact ? "exact" : "group",
    list: u.answered == null ? null : (u.extended ? "extended" : "plain"), role: u.list_role || (u.answered == null ? null : "undecided"), answered: u.answered,
    shows: list(u.show_genders), ages: (u.age_min || 18) + "-" + (u.age_max || 99), looking_for: list(u.looking_for), seeking: list(u.seeking),
    paused: !!u.paused, open_space: !!u.open_space, universe: uniWord(u.uni_optin), universe_chats: uniChatsOf(u.tg_id).map(c => titles[c]),
    compare_before_yes: !!u.compare_before_yes, bio: !!u.has_about, bio_public: !!u.about_public, notify_likes: u.notify_likes !== 0, digest: !!u.digest,
    hidden: u.hidden_until && u.hidden_until > t0 ? (u.hidden_until === 2147483647 ? "held (report «under 18»)" : "until " + new Date(u.hidden_until * 1000).toISOString().slice(0, 10)) : false,
    idle: ["", "hidden for inactivity", "deletion warning 1", "deletion warning 2", "deletion warning 3"][u.idle_stage || 0] || "",
    place: u.res ? (u.res === 8 ? "~1 km" : "~3 km (old)") + ", shown " + (u.radius || "?") + " km" : "none",
    chats: chatsOf(u.tg_id).map(m => titles[m.chat_id] + (m.member ? "" : " (not in chat)") + (m.show ? "" : " (hidden by choice)") + (activeChat[m.chat_id] ? "" : " (chat off)")),
    steps: { consent: !!u.consent_at, checklist: u.answered != null, profile: list(u.looking_for).length > 0 && list(u.show_genders).length > 0, place: !!u.res },
    visible_since: u.activated_at ? new Date(u.activated_at * 1000).toISOString().slice(0, 10) : null,
  }));
  const act = users.filter(u => u.status === "active").slice(0, maxActive || 40);
  const pairs = [];
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
    const a = act[i], b = act[j], ca = shownIn(a.tg_id);
    const shared = shownIn(b.tg_id).filter(c => ca.includes(c)).map(c => titles[c]);
    const space = !!(a.open_space && b.open_space), uni = inUni(a) && inUni(b);
    const why = [];
    if (!shared.length && !space && !uni) {
      // which road is closed for whom (owner, 2026-10-26: «why does X not see Y» in one line)
      const road = [];
      road.push("no shared chat where both show themselves");
      if (!space) road.push("open space: " + [a, b].filter(u => !u.open_space).map(label).join(", ") + " off");
      const uniWhy = [a, b].map(u => u.uni_optin !== 1 ? label(u) + " universe " + uniWord(u.uni_optin) : !uniChatsOf(u.tg_id).length ? label(u) + " in no universe chat" : "").filter(Boolean);
      road.push("universe: " + uniWhy.join(", "));
      why.push(road.join("; "));
    }
    for (const u of [a, b]) {
      if (u.paused) why.push(label(u) + " paused");
      if (u.hidden_until > t0) why.push(label(u) + " hidden");
      if (!u.res) why.push(label(u) + " no place");
      if (u.idle_stage) why.push(label(u) + " hidden for inactivity");
    }
    // «Not now» only hides the card from the one who said it (not a reason they cannot see each other)
    if (notNow.has(a.tg_id + ":" + b.tg_id)) why.push(label(a) + " said «not now» (card hidden for them only)");
    if (notNow.has(b.tg_id + ":" + a.tg_id)) why.push(label(b) + " said «not now» (card hidden for them only)");
    const fa = accepts(a, b), fb = accepts(b, a);
    if (fa) why.push(label(a) + " filter: " + fa + (off ? " (ignored now)" : ""));
    if (fb) why.push(label(b) + " filter: " + fb + (off ? " (ignored now)" : ""));
    const blocking = why.filter(x => !x.endsWith("(ignored now)") && !x.includes("«not now»"));
    pairs.push({ a_tg: a.tg_id, b_tg: b.tg_id, a: label(a), b: label(b), see: !blocking.length, shared, space, universe: uni, why });
  }
  return { people, pairs, filters_off: off };
}

/* ---------- the report ---------- */

const GENDERS_OK = (show, g) => { try { return JSON.parse(show || "[]").includes(g); } catch (e) { return false; } };

export async function report(env) {
  const t0 = now();
  const all = sql => env.DB.prepare(sql).all().then(r => r.results || []);
  const out = { version: VERSION, at: new Date(t0 * 1000).toISOString(), settings: {}, telegram: {}, chats: [], people: [], pairs: [], log: [], tables: {} };

  for (const s of await all("SELECT key, value FROM settings")) out.settings[s.key] = s.key === "debug_until" ? (Number(s.value) > t0 ? "on until " + new Date(Number(s.value) * 1000).toISOString() : "off") : s.value;

  // Telegram's view of the bot
  const me = await getMe(env);
  const wh = await call(env, "getWebhookInfo");
  const menu = await call(env, "getChatMenuButton");
  const cmds = await call(env, "getMyCommands");
  const w = wh.ok ? wh.result : {};
  out.telegram = {
    bot: me ? "@" + me.username : "getMe failed", webhook_host: w.url ? new URL(w.url).host : "(none)", pending_updates: w.pending_update_count,
    last_error: w.last_error_message ? w.last_error_message + " @ " + new Date(w.last_error_date * 1000).toISOString() : "none",
    allowed_updates: w.allowed_updates || "(default)", menu_button: menu.ok ? menu.result.type + (menu.result.web_app ? " → " + new URL(menu.result.web_app.url).pathname : "") : "failed",
    commands: cmds.ok ? cmds.result.map(c => "/" + c.command).join(" ") : "failed",
  };

  // chats: Telegram's answer about the bot in each + our counts
  const chats = await all("SELECT chat_id, title, active, blocked, bound_at, member_count, invite_posted FROM chats ORDER BY bound_at");
  const mem = await all("SELECT m.tg_id, m.chat_id, m.member, m.show, m.checked_at FROM memberships m");
  for (const c of chats.slice(0, 20)) {
    let bot = "not asked (inactive)";
    if (c.active && !c.blocked) {
      const r = await call(env, "getChatMember", { chat_id: c.chat_id, user_id: botId(env) });
      bot = r.ok ? r.result.status + (r.result.status === "administrator" ? " (manage_chat: " + !!r.result.can_manage_chat + ")" : "") : "error " + r.error_code + ": " + r.description;
    }
    const ms = mem.filter(m => m.chat_id === c.chat_id);
    // a row exists for everyone the bot checked (each /start checks every connected chat): only member = 1 is «in the chat»
    out.chats.push({ title: c.title, active: !!c.active, blocked: !!c.blocked, bot, size: c.member_count, opened_bot: ms.filter(m => m.member).length, hidden_by_choice: ms.filter(m => m.member && !m.show).length, invite_posted: !!c.invite_posted });
  }

  // people
  const users = await all(`SELECT u.tg_id, u.pub_id, u.status, u.open_space, u.idle_stage, u.notify_likes, u.hidden_until, u.consent_at, u.updated_at, u.ui_lang, u.lang,
      p.nick, p.birth_date, p.gender, p.show_genders, p.age_min, p.age_max, p.paused, p.looking_for,
      c.answered, c.role AS list_role, c.extended, c.enc, l.res, l.radius, l.changes,
      (SELECT enabled FROM universe_optin o WHERE o.tg_id = u.tg_id AND o.universe_id = 1) AS uni_optin
      FROM users u LEFT JOIN profiles p ON p.tg_id = u.tg_id LEFT JOIN checklists c ON c.tg_id = u.tg_id LEFT JOIN locations l ON l.tg_id = u.tg_id
      WHERE u.tg_id != ${Number(env.ADMIN_ID || 0)} ORDER BY u.created_at LIMIT 200`);
  const titles = Object.fromEntries(chats.map(c => [c.chat_id, c.title || "?"]));
  const activeChat = Object.fromEntries(chats.map(c => [c.chat_id, c.active && !c.blocked]));
  const chatsOf = id => mem.filter(m => m.tg_id === id);
  const label = u => (u.nick ? u.nick : (u.gender || "?")) + " #" + u.pub_id;
  for (const u of users) {
    out.people.push({
      who: label(u), status: u.status, consent: !!u.consent_at, answered: u.answered, list: u.answered == null ? null : (u.extended ? "extended " : "plain ") + (u.list_role || "no role"), gender: u.gender, age: ageOf(u.birth_date),
      shows: u.show_genders, ages: (u.age_min || 18) + "-" + (u.age_max || 99), paused: !!u.paused, open_space: !!u.open_space,
      hidden: u.hidden_until && u.hidden_until > t0 ? "until " + new Date(u.hidden_until * 1000).toISOString() : false,
      universe: uniWord(u.uni_optin),
      place: u.res ? (u.res === 8 ? "~1 km area" : "~3 km area (old)") + ", shown " + (u.radius || "?") + " km, set " + u.changes + "x" : "none",
      chats: chatsOf(u.tg_id).map(m => (titles[m.chat_id] || m.chat_id) + (m.member ? "" : " (not in chat)") + (m.show ? "" : " (hidden)") + (activeChat[m.chat_id] ? "" : " (chat off)")).join(", ") || "-",
      idle: ["", "hidden for inactivity", "deletion warning 1", "deletion warning 2", "deletion warning 3"][u.idle_stage || 0] || "", likes_note: u.notify_likes !== 0,
      lang: u.ui_lang || u.lang, last_seen: new Date(u.updated_at * 1000).toISOString(),
    });
  }

  // who can see whom, and why not (active people only, up to 40) — the same rules as src/neighbours.js (see visibility())
  const vis = await visibility(env, 40);
  const byTg = new Map(users.map(u => [u.tg_id, u]));
  const opened = new Map();
  const open = async u => { if (!opened.has(u.tg_id)) opened.set(u.tg_id, JSON.parse(await decrypt(env.DATA_KEY, u.enc))); return opened.get(u.tg_id); };
  for (const v of vis.pairs) {
    const a = byTg.get(v.a_tg), b = byTg.get(v.b_tg);
    if (!a || !b) continue;
    // the match in numbers (for tuning the percent scale): no items, no answers
    let match = null;
    if (a.enc && b.enc) {
      try { match = detail(await open(a), await open(b)); } catch (e) { match = { error: "decrypt" }; }
    }
    out.pairs.push({ a: label(a), b: label(b), shared: v.shared.join(", ") || "-", space: v.space, universe: v.universe, see_each_other: v.see, why: v.why.join("; ") || "ok", match });
  }

  out.log = (await all("SELECT at, kind, who, data FROM debug_log ORDER BY id DESC LIMIT 300"))
    .map(x => ({ at: new Date(x.at * 1000).toISOString(), kind: x.kind, who: x.who, data: x.data }));
  for (const tb of ["users", "profiles", "checklists", "locations", "memberships", "chats", "answers", "reports", "moderators", "scores", "audit"]) {
    try { out.tables[tb] = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${tb}`).first("n"); } catch (e) { out.tables[tb] = "error"; }
  }
  return out;
}

/** The report as readable text (also sent as a file in the chat with the bot). */
export function reportText(r) {
  const L = [];
  L.push("Kinkoverse debug report — " + r.version + " — " + r.at, "");
  L.push("SETTINGS", ...Object.entries(r.settings).map(([k, v]) => "  " + k + " = " + v), "");
  L.push("TELEGRAM", ...Object.entries(r.telegram).map(([k, v]) => "  " + k + ": " + (Array.isArray(v) ? v.join(",") : v)), "");
  L.push("CHATS");
  for (const c of r.chats) L.push("  «" + c.title + "» active=" + c.active + " blocked=" + c.blocked + " bot=" + c.bot + " size=" + c.size + " opened_bot_and_in_chat=" + c.opened_bot + " hidden_by_choice=" + c.hidden_by_choice + " button_posted=" + c.invite_posted);
  L.push("", "PEOPLE");
  for (const p of r.people) L.push("  " + p.who + " | " + p.status + " | consent=" + p.consent + " answered=" + p.answered + (p.list ? " list=" + p.list : "") + " | " + p.gender + " " + p.age + " shows=" + p.shows + " ages=" + p.ages +
    " | paused=" + p.paused + " space=" + p.open_space + " universe=" + p.universe + " hidden=" + p.hidden + " | place: " + p.place + " | chats: " + p.chats + (p.idle ? " | " + p.idle : "") + " | lang=" + p.lang + " seen=" + p.last_seen);
  L.push("", "OPEN SPACE ON: " + (r.people.filter(p => p.open_space && p.status === "active").map(p => p.who).join(", ") || "nobody"));
  L.push("", "PAIRS (active people)");
  for (const p of r.pairs) {
    const m = p.match;
    L.push("  " + (p.see_each_other ? "SEE   " : "NO    ") + p.a + " ⇄ " + p.b + " | shared: " + p.shared + " | space: " + p.space + " | universe: " + p.universe + " | " + p.why +
      (m && !m.error ? " | match " + (m.pct == null ? "—" : m.pct + "%") + " likes=" + m.likes + " limits=" + m.limits + " both_no=" + m.both_no + " v3raw=" + m.raw + " sides=" + m.a_side + "/" + m.b_side + " shared_items=" + m.shared + " columns=" + m.cols +
        " both_keen=" + m.both_keen + " keen_vs_maybe=" + m.keen_vs_maybe + " keen_vs_no=" + m.keen_vs_no : ""));
  }
  L.push("", "TABLES", "  " + Object.entries(r.tables).map(([k, v]) => k + "=" + v).join(" "), "");
  // owner, 2026-10-21: errors and failed calls grouped — how often, how many people, which devices and screens
  const plat = {}, groups = new Map();
  const parse = d => { try { return JSON.parse(d); } catch (e) { return {}; } };
  for (const x of r.log) if (x.kind === "app:hello" && !plat[x.who]) { const d = parse(x.data); plat[x.who] = (d.platform || "?") + " " + (d.version || ""); }
  for (const x of r.log) {
    if (x.kind !== "app:error" && x.kind !== "app:api") continue;
    const d = parse(x.data);
    const key = x.kind === "app:api" ? "api " + (d.api || "?") + " → " + (d.status || "?") : String(d.message || "?").replace(/\d{3,}/g, "N").slice(0, 120);
    const g = groups.get(key) || { n: 0, who: new Set(), plat: new Set(), screen: new Set(), last: x.at };
    g.n++; g.who.add(x.who); g.plat.add((plat[x.who] || "?").trim()); if (d.screen) g.screen.add(d.screen);
    groups.set(key, g);
  }
  L.push("ERRORS (grouped, from the log below)");
  if (!groups.size) L.push("  none");
  for (const [k, g] of [...groups].sort((a, b) => b[1].n - a[1].n))
    L.push("  " + g.n + "× " + k + " | people: " + g.who.size + " | devices: " + [...g.plat].join(", ") + (g.screen.size ? " | screens: " + [...g.screen].join(", ") : "") + " | last: " + g.last);
  L.push("");
  L.push("LOG (newest first)");
  for (const x of r.log) L.push("  " + x.at + " " + x.kind + " " + (x.who || "") + " " + x.data);
  return L.join("\n");
}

/** Sends a text file to a private chat (multipart sendDocument). */
export async function sendTextFile(env, chatId, name, text, caption) {
  const fd = new FormData();
  fd.append("chat_id", String(chatId));
  if (caption) fd.append("caption", caption);
  fd.append("document", new Blob([text], { type: "text/plain" }), name);
  const f = env.TG_FETCH || fetch;
  try { const r = await f(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendDocument`, { method: "POST", body: fd }); return await r.json(); }
  catch (e) { return { ok: false }; }
}
