/* src/tg.js — the Telegram Bot API over plain fetch. Logs carry the method and error code only, never texts. */

export const API = "https://api.telegram.org";

/** Escape for parse_mode HTML. Every user-provided value goes through this. */
export function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The bot's own id is the number before ":" in the token. */
export function botId(env) {
  return Number(String(env.BOT_TOKEN || "").split(":")[0]) || 0;
}

/* owner, 2026-11-03: a Telegram call never waits without a limit (on 2026-11-03 calls to Telegram failed with «network»
   and /api/me, the owner panel and the debug report hung for 7–25 s and more). A give-up must never be read as a «no»:
   membership.js keeps asking in the background instead (owner, 2026-11-04). Sends usually run after the answer
   (waitUntil, ≤ 30 s); screens never wait for Telegram when the answer is already known. opts.timeout overrides. */
export const TG_TIMEOUT = { read: 20000, send: 25000 };   // owner, 2026-11-04: 20 s for reads too (owner panel photos, sizes, report)

export async function call(env, method, params, opts) {
  const f = env.TG_FETCH || fetch; // TG_FETCH: the fake Telegram in tests
  const ms = (opts && opts.timeout) || (method.startsWith("get") ? TG_TIMEOUT.read : TG_TIMEOUT.send);
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), ms);
  let j;
  try {
    const r = await f(`${API}/bot${env.BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params || {}),
      signal: ac.signal,
    });
    j = await r.json();
  } catch (e) {
    j = { ok: false, error_code: 0, description: ac.signal.aborted ? "timeout " + ms + " ms" : "network" };
  } finally { clearTimeout(timer); }
  if (!j.ok) {
    console.log(`tg ${method} failed: ${j.error_code}`);
    // while debug is on (owner's panel), failures go to the debug log; chat ids only, no texts
    if (env.DEBUG && env.DB) {
      try {
        await env.DB.prepare("INSERT INTO debug_log (at, kind, who, data) VALUES (?1, 'tg', ?2, ?3)").bind(Math.floor(Date.now() / 1000), method,
          JSON.stringify({ code: j.error_code, description: String(j.description || "").slice(0, 200), chat: params && params.chat_id != null && Number(params.chat_id) < 0 ? params.chat_id : undefined })).run();
      } catch (e) { /* never break a call */ }
    }
  }
  return j;
}

/** multipart upload (owner, 2026-11-07: a photo for «Отправить всем»); same timeout and error handling as call() */
export async function callForm(env, method, form) {
  const f = env.TG_FETCH || fetch;
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), TG_TIMEOUT.send);
  try {
    const r = await f(`${API}/bot${env.BOT_TOKEN}/${method}`, { method: "POST", body: form, signal: ac.signal });
    return await r.json();
  } catch (e) {
    return { ok: false, error_code: 0, description: ac.signal.aborted ? "timeout" : "network" };
  } finally { clearTimeout(timer); }
}
export function send(env, chatId, text, extra) {
  return call(env, "sendMessage", {
    chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...(extra || {}),
  });
}

let me = null; // getMe, cached per isolate
/** The bot itself. owner, 2026-11-04: also kept in settings (bot_me), so a new Worker copy does not ask Telegram — and
    wait — on a person's screen. opts.noWait (screens): if nothing is known yet, ask in the background and return null. */
export async function getMe(env, opts) {
  if (me && me.token === env.BOT_TOKEN) return me.user;
  if (env.DB) {
    try {
      const v = await env.DB.prepare("SELECT value FROM settings WHERE key = 'bot_me'").first("value");
      const u = v ? JSON.parse(v) : null;
      if (u && u.id === botId(env)) { me = { token: env.BOT_TOKEN, user: u }; return u; }
    } catch (e) { /* ask Telegram */ }
  }
  const ask = call(env, "getMe").then(async r => {
    if (!r.ok) return null;
    me = { token: env.BOT_TOKEN, user: r.result };
    if (env.DB) {
      try { await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('bot_me', ?1) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(r.result)).run(); }
      catch (e) { /* the per-isolate copy is enough */ }
    }
    return r.result;
  });
  if (opts && opts.noWait && env.CTX && env.CTX.waitUntil) { env.CTX.waitUntil(ask); return null; }
  return ask;
}

/** Bot API ChatMember -> is the person in the chat now? */
export function isMemberStatus(cm) {
  if (!cm) return false;
  if (cm.status === "creator" || cm.status === "administrator" || cm.status === "member") return true;
  if (cm.status === "restricted") return !!cm.is_member;
  return false; // left, kicked
}
