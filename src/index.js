/* src/index.js — the Worker. Routes:
     POST /tg      Telegram webhook; the X-Telegram-Bot-Api-Secret-Token header must match (derived from DATA_KEY)
     GET  /health  { ok } — is the database reachable (no data in the answer)
     /api/*        the Mini App's API (api.js)
     /app/         the Mini App itself: static files from public/, served by Cloudflare before the Worker runs
   anything else → 404. */

import { loadTexts } from "./i18n.js";
import { flush as flushOutbox } from "./universe.js";
import { sendReminders, sendComebacks } from "./stats.js";
import { sendPendingLikes } from "./api.js";
import { fillColumnCounts } from "./profile.js";
import { webhookSecret, sameString } from "./crypto.js";
import { handleUpdate } from "./bot.js";
import { handleApi } from "./api.js";
import { pruneJournal } from "./admin.js";
import { debugOn, dlog, pruneDebug, VERSION } from "./debug.js";
import { sendDigests } from "./digest.js";
import { idleSweep } from "./idle.js";
import { meter, record as recordUsage, prune as pruneUsage } from "./usage.js";
import { pruneFresh } from "./neighbours.js";
import { notifyAccepted } from "./interests.js";

const json = (o, status) => new Response(JSON.stringify(o), { status: status || 200, headers: { "content-type": "application/json" } });

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname;
    env = { ...env, ORIGIN: env.ORIGIN || url.origin }; // the bot needs its own address for the Mini App buttons
    if (path === "/tg" || path.startsWith("/api/")) env.DEBUG = await debugOn(env);   // Telegram failures → debug_log
    if (path === "/tg" || path.startsWith("/api/")) await loadTexts(env);   // owner, 2026-10-27: texts edited in the panel

    if (path === "/tg" && req.method === "POST") {
      if (!env.DATA_KEY || !env.BOT_TOKEN) return new Response("not configured", { status: 503 });
      const want = await webhookSecret(env.DATA_KEY);
      if (!sameString(req.headers.get("X-Telegram-Bot-Api-Secret-Token"), want)) return new Response("forbidden", { status: 403 });
      let update;
      try { update = await req.json(); } catch (e) { return new Response("bad request", { status: 400 }); }
      try {
        await handleUpdate(env, update);
      } catch (e) {
        // Answer 200 anyway: Telegram would resend the same update again and again. Error name only, no data.
        console.log("update failed:", e && e.name, e && String(e.message).slice(0, 120));
        await dlog(env, "error:update", null, errInfo(e, update && Object.keys(update).filter(k => k !== "update_id")[0]));
      }
      return new Response("ok");
    }

    if (path.startsWith("/api/")) {
      // owner, 2026-10-28: rows read / written per person (src/usage.js) — heavy requests and a 1-in-10 sample are written
      const rawDB = env.DB, mt = meter(env);
      env = { ...env, DB: mt.db, METER: mt.m };
      try {
        const res = await handleApi(req, env, path);
        const w = recordUsage(rawDB, mt.m);
        if (ctx && ctx.waitUntil) ctx.waitUntil(w); else await w;
        return res;
      }
      catch (e) {
        console.log("api failed:", e && e.name, e && String(e.message).slice(0, 120));
        await dlog(env, "error:api", null, errInfo(e, req.method + " " + path));
        return json({ ok: false, error: "server" }, 500);
      }
    }

    if (path === "/health" && req.method === "GET") {
      try { await env.DB.prepare("SELECT 1").first(); return json({ ok: true, version: VERSION }); }
      catch (e) { return json({ ok: false }, 503); }
    }

    return new Response("not found", { status: 404 });
  },

  // hourly (wrangler.toml [triggers]): the weekly digests that are due; once a day old journal / debug rows are deleted
  async scheduled(event, env) {
    try {
      await loadTexts(env);
      if (new Date(event.scheduledTime || Date.now()).getUTCHours() === 3) { await pruneJournal(env); await pruneDebug(env); await pruneUsage(env); await pruneFresh(env); }
      await flushOutbox(env, 40);   // owner, 2026-10-21: messages waiting in the outbox (src/universe.js)
      await sendReminders(env, (env.ORIGIN || "") + "/app/", 20);   // owner, 2026-10-21: one per step, 11–21 Moscow
      await sendComebacks(env, (env.ORIGIN || "") + "/app/", 5);   // owner, 2026-10-27: 5+ days away, new people within 100 km
      await notifyAccepted(env, 20);   // owner, 2026-10-28: accepted interest suggestions
      await sendPendingLikes(env);   // owner, 2026-10-21: «да» that waited behind the 10-minute limit
      await fillColumnCounts(env, 40);   // owner, 2026-10-24: Top / Bottom answer counts of older extended lists
      await sendDigests(env);
      await idleSweep(env);
    } catch (e) { await dlog(env, "error:cron", null, errInfo(e, "scheduled")); }
  },
};

/** An exception for the debug log: name, message and the top of the stack (code places only, no data). */
function errInfo(e, where) {
  return { where, name: e && e.name, message: e && String(e.message).slice(0, 300), stack: e && e.stack ? String(e.stack).split("\n").slice(1, 4).map(x => x.trim()).join(" | ") : "" };
}
