/* src/backup.js — a backup file the owner makes from the panel (owner, 2026-10-19), and restoring from it.
   - The data lives in Cloudflare D1 (EU). Cloudflare also keeps its own history (Time Travel, restore.yml).
   - The file: { format: "kinkoverse-backup", v: 1, version, at, counts, chunks: [{ t: table, d: sealed }] } where every
     chunk is ≤ CHUNK rows, AES-GCM encrypted with a key from DATA_KEY. BLOBs (encrypted checklists) are kept as base64.
   - Made chunk by chunk (the app asks for one chunk per request) and restored chunk by chunk: the Workers free plan allows
     10 ms CPU and 50 D1 statements per request.
   - Not in the file: scores (recomputed), debug_log. */

import { sealBackup, openBackup, toB64, fromB64 } from "./crypto.js";

export const TABLES = ["users", "profiles", "checklists", "locations", "chats", "memberships", "answers", "reports",
  "moderators", "invites", "settings", "audit", "dialog", "universe_chats", "universe_optin",
  "interest_suggestions", "interest_extra", "interest_names", "interest_syn"];   // owner, 2026-10-28 (usage rows are not kept)
export const CHUNK = 40;

const isBlob = v => v instanceof Uint8Array || v instanceof ArrayBuffer || Array.isArray(v);

/** GET /api/admin/backup            → { tables, counts }
    GET /api/admin/backup?t=&after=  → { t, last, done, d } (one sealed chunk; after = last rowid of the previous one) */
export async function backupChunk(env, t, after) {
  if (!t) {
    const counts = {};
    for (const tb of TABLES) counts[tb] = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${tb}`).first("n");
    return { ok: true, tables: TABLES, counts, chunk: CHUNK };
  }
  if (!TABLES.includes(t)) return { error: "bad_table" };
  // chats use the (negative) Telegram chat id as rowid: the first chunk starts from the very beginning (after = "")
  const from = after === null || after === undefined || after === "" ? null : Number(after);
  const r = await env.DB.prepare(`SELECT rowid AS _r, * FROM ${t} WHERE ?1 IS NULL OR rowid > ?1 ORDER BY rowid LIMIT ?2`).bind(from, CHUNK).all();
  const rows = (r.results || []).map(x => {
    const o = {};
    for (const [k, v] of Object.entries(x)) if (k !== "_r") o[k] = isBlob(v) ? { $b64: toB64(v instanceof Uint8Array ? v : new Uint8Array(v)) } : v;
    return o;
  });
  const last = rows.length ? r.results[r.results.length - 1]._r : from;
  return { ok: true, t, rows: rows.length, last, done: rows.length < CHUNK, d: rows.length ? await sealBackup(env.DATA_KEY, JSON.stringify(rows)) : null };
}

/** POST /api/admin/restore-begin { confirm: "RESTORE" } — empties the tables (the file's chunks follow). */
export async function restoreBegin(env) {
  await env.DB.batch([...TABLES, "scores"].reverse().map(tb => env.DB.prepare(`DELETE FROM ${tb}`)));
  return { ok: true };
}

/** POST /api/admin/restore-chunk { t, d } — one chunk back into its table. */
export async function restoreChunk(env, t, d) {
  if (!TABLES.includes(t)) return { error: "bad_table" };
  let rows;
  try { rows = JSON.parse(await openBackup(env.DATA_KEY, String(d || ""))); } catch (e) { return { error: "bad_backup" }; }
  if (!Array.isArray(rows) || rows.length > CHUNK) return { error: "bad_backup" };
  const cols = new Set(((await env.DB.prepare(`PRAGMA table_info(${t})`).all()).results || []).map(c => c.name));
  const ops = [];
  for (const row of rows) {
    const keys = Object.keys(row).filter(k => cols.has(k));   // columns the current schema knows
    if (!keys.length) continue;
    const vals = keys.map(k => (row[k] && typeof row[k] === "object" && row[k].$b64 != null ? fromB64(row[k].$b64) : row[k]));
    ops.push(env.DB.prepare(`INSERT OR REPLACE INTO ${t} (${keys.join(", ")}) VALUES (${keys.map((_, i) => "?" + (i + 1)).join(", ")})`).bind(...vals));
  }
  if (ops.length) await env.DB.batch(ops);
  return { ok: true, rows: ops.length };
}
