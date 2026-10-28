/* «Интересы» (owner, 2026-10-28): the catalog file and the server's id ranges agree, picks and limits, suggestions with
   the silent filter and the owner's silent block, the owner's decisions, and the per-person usage estimate.
   All names below are made up for the tests. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setup, bound, CHAT, OWNER } from "./helpers/env.js";
import { signInitData } from "../src/webapp.js";
import { KC } from "../src/checklist.js";
import { SECTIONS, RANGES, MAX_ID, CATALOG_V } from "../src/interests_catalog.js";
import { checkText } from "../src/suggest_filter.js";
import * as USG from "../src/usage.js";
import { makeD1 } from "./helpers/d1.js";

const CAT = JSON.parse(readFileSync(new URL("../public/app/interests/catalog.json", import.meta.url), "utf8"));
const IDS = []; KC.CATS.forEach(c => c.items.forEach(([, id]) => IDS.push(id)));
const ANS = ["limit", "maybe", "yes", "love"];
const link = seed => {
  const st = { name: "Sample " + seed, uid: "zz" + String(seed).padStart(4, "0"), meta: { role: "sub" }, items: {} };
  IDS.forEach((id, i) => { if (i % 2 === 0) st.items[id] = { interest: ANS[(i + seed) % 4] }; });
  return "https://klevatess.github.io/kinkmatch/#" + KC.codec.encode(st);
};
const nowS = () => Math.floor(Date.now() / 1000);

async function client(s, id) {
  const init = await signInitData(s.env.BOT_TOKEN, { auth_date: String(nowS()), user: JSON.stringify({ id, first_name: "T", language_code: "ru" }) });
  const call = async (method, path, body) => {
    const r = await s.worker.fetch(new Request("https://bot.example" + path, { method, headers: { authorization: "tma " + init },
      body: body ? JSON.stringify(body) : undefined }), s.env);
    return { status: r.status, body: await r.json() };
  };
  return { get: p => call("GET", p), post: (p, b) => call("POST", p, b) };
}
async function person(s, id, lat) {
  s.tg.setMember(CHAT, id, "member");
  const c = await client(s, id);
  await c.get("/api/me");
  assert.equal((await c.post("/api/consent", { consent: true, birth_date: "1990-06-01", gender: "woman" })).body.ok, true);
  assert.equal((await c.post("/api/checklist", { link: link(id) })).body.ok, true);
  const pr = (await c.post("/api/profile", { seeking: ["one"], looking_for: ["sessions"], show_genders: ["woman", "man", "nonbinary", "other"],
    age_min: 18, age_max: 99, about: "made-up about text of person " + id, about_public: true, compare_before_yes: false, name_after: "Name" + id })).body; assert.equal(pr.ok, true, JSON.stringify(pr));
  assert.equal((await c.post("/api/location", { lat, lon: 13.405, radius: 1 })).body.active, true);
  return c;
}
const secOf = tab => CAT.sections.find(s => s.tab === tab);
const firstIds = (tab, n) => CAT.sections.filter(s => s.tab === tab).flatMap(s => s.items.map(x => x[0])).slice(0, n);

test("catalog.json and src/interests_catalog.js describe the same ids; no id ever disappears", () => {
  assert.equal(CAT.v, CATALOG_V);
  assert.deepEqual(CAT.sections.map(s => [s.id, s.tab]), SECTIONS);
  const secOfId = new Map();
  CAT.sections.forEach(s => s.items.forEach(x => {
    assert.equal(secOfId.has(x[0]), false, "id twice: " + x[0]); secOfId.set(x[0], s.id);
    assert.equal(typeof x[1], "string"); assert.ok(x[1].length > 0);
  }));
  // ids are permanent: 1…MAX_ID all exist (items are renamed or moved, never deleted or renumbered)
  for (let i = 1; i <= MAX_ID; i++) assert.ok(secOfId.has(i), "missing id " + i);
  assert.equal(secOfId.size, MAX_ID);
  // the server's ranges give every id its section
  let prev = 0;
  for (const [a, b, sid] of RANGES) {
    assert.ok(a > prev && b >= a); prev = b;
    for (let i = a; i <= b; i++) assert.equal(secOfId.get(i), sid, "id " + i);
  }
  assert.equal(prev, MAX_ID);
  assert.deepEqual(CAT.tabs.map(t => [t.id, t.max]), [["leisure", 20], ["fandoms", 60]]);
});

test("filter: bad words, links, contacts are caught; ordinary titles pass", () => {
  for (const bad of ["хуйня какая-то", "п.и.з.д.а", "fuck this", "иди нахуй", "убью тебя", "заходи на example.com", "пиши @someone_x", "t.me/somechannel", "звони 89991234567", "аааааааа"])
    assert.notEqual(checkText(bad), null, bad);
  for (const ok of ["Себастьян", "Мандалорец", "Идиот", "Bastard!!", "Скалолазание", "Ведьмак", "Kimetsu no Yaiba", "Сасагэё", "Тётушка Мэйбл"])
    assert.equal(checkText(ok), null, ok);
});

test("picks: saved on the profile, limits per tab, unknown ids refused, shown to neighbours", async () => {
  const s = await setup(); await bound(s);
  const a = await person(s, 501, 52.52), b = await person(s, 502, 52.521);
  const fan = firstIds("fandoms", 61), lei = firstIds("leisure", 21);
  assert.equal((await a.post("/api/interests", { items: lei })).body.error, "too_many");
  assert.equal((await a.post("/api/interests", { items: fan })).body.error, "too_many");
  assert.equal((await a.post("/api/interests", { items: [MAX_ID + 1] })).body.error, "bad_items");
  assert.equal((await a.post("/api/interests", { items: [100000] })).body.error, "bad_items");   // no added item yet
  const r = await a.post("/api/interests", { items: [...lei.slice(0, 20), ...fan.slice(0, 60)] });
  assert.equal(r.body.ok, true); assert.equal(r.body.profile.interests.length, 80);
  await a.post("/api/interests", { items: [lei[0], fan[0], fan[0]] });   // doubles are dropped
  assert.deepEqual((await a.get("/api/me")).body.profile.interests, [lei[0], fan[0]]);
  const nb = (await b.get("/api/neighbours")).body;
  assert.deepEqual(nb.items.find(x => x.interests && x.interests.length).interests, [lei[0], fan[0]]);
});

test("suggestions: eligibility, 3 slots, silent filter, silent block, the owner's decisions", async () => {
  const s = await setup(); await bound(s);
  const a = await person(s, 601, 52.52);
  const sec = secOf("fandoms").id, lei = firstIds("leisure", 3);
  assert.equal((await a.post("/api/suggest", { name: "Новый фандом", section: sec })).body.error, "not_eligible");
  await a.post("/api/interests", { items: lei });
  assert.equal((await a.post("/api/suggest", { name: "Новый фандом", section: sec })).body.error, "not_eligible");   // < 350 answers
  await s.env.DB.prepare("UPDATE checklists SET answered = 400 WHERE tg_id = 601").run();
  let st = (await a.get("/api/interests")).body.suggest; assert.equal(st.can, true);
  assert.equal((await a.post("/api/suggest", { name: "x", section: sec })).body.error, "bad_length");
  assert.equal((await a.post("/api/suggest", { name: "Нормально", section: 99999 })).body.error, "bad_section");

  // a refused text gets exactly the same answer as an honest one
  const bad = (await a.post("/api/suggest", { name: "иди нахуй", section: sec })).body;
  const good = (await a.post("/api/suggest", { name: "Выдуманный сериал", alt: "Made-up Show", section: sec })).body;
  assert.equal(bad.ok, true); assert.equal(good.ok, true);
  assert.deepEqual(good.suggest.list.map(x => x.status), ["pending", "pending"]);
  const row = await s.env.DB.prepare("SELECT status, reason FROM interest_suggestions WHERE name = 'иди нахуй'").first();
  assert.deepEqual({ ...row }, { status: "filtered", reason: "mat" });

  // the owner: never the text, only the reason; the person is not told anything
  const o = await client(s, OWNER);
  let v = (await o.get("/api/admin/interests")).body;
  assert.equal(v.groups.length, 1); assert.equal(v.groups[0].name, "Выдуманный сериал");
  assert.equal(v.filtered.length, 1); assert.equal(v.filtered[0].reason, "mat"); assert.equal(v.filtered[0].tries, 1);
  assert.equal(JSON.stringify(v.filtered).includes("нахуй"), false);
  const ov = (await o.get("/api/admin/overview")).body;
  assert.deepEqual(ov.attention.interests, { pending: 1, filtered: 1 });

  // block silently: the next suggestion still «goes» but lands as muted
  const n = v.filtered[0].n;
  v = (await o.post("/api/admin/interests", { action: "block", n, on: true })).body; assert.equal(v.blocked, 1);
  const third = (await a.post("/api/suggest", { name: "Ещё один", section: sec })).body;
  assert.equal(third.ok, true); assert.equal(third.suggest.list[0].status, "pending");
  assert.equal((await s.env.DB.prepare("SELECT status FROM interest_suggestions WHERE name = 'Ещё один'").first("status")), "muted");
  assert.equal((await a.post("/api/suggest", { name: "Четвёртый", section: sec })).body.error, "slots_full");
  assert.equal((await a.get("/api/me")).body.suggest_blocked, undefined);   // the person never sees it
  assert.equal((await o.get("/api/admin/profile?id=" + n)).body.profile.suggest_blocked, true);

  // a day later the hidden ones read «не добавлено», a slot frees up
  await s.env.DB.prepare("UPDATE interest_suggestions SET created_at = created_at - 90000 WHERE status IN ('filtered','muted')").run();
  st = (await a.get("/api/interests")).body.suggest;
  assert.deepEqual(st.list.map(x => [x.name, x.status]), [["Ещё один", "rejected"], ["Выдуманный сериал", "pending"], ["иди нахуй", "rejected"]]);

  // add: a new item ≥ 100000, the author gets it, everyone sees it in /api/interests
  const g = v.groups[0];
  const add = (await o.post("/api/admin/interests", { action: "add", ids: g.ids, name: "Выдуманный сериал", alt: "Made-up Show", section: sec })).body;
  assert.equal(add.ok, true); assert.equal(add.item, 100000); assert.equal(add.groups.length, 0);
  assert.ok((await a.get("/api/me")).body.profile.interests.includes(100000));
  const pub = (await a.get("/api/interests")).body;
  assert.deepEqual(pub.extra, [[100000, sec, "Выдуманный сериал", "Made-up Show"]]);
  assert.equal(pub.suggest.list.find(x => x.name === "Выдуманный сериал").status, "added");
  assert.equal((await a.post("/api/interests", { items: [100000, ...lei] })).body.ok, true);   // added items are valid picks

  // unblock, synonym, reject, seen
  await o.post("/api/admin/interests", { action: "block", n, on: false });
  await a.post("/api/suggest", { name: "Другое имя", section: sec });
  await a.post("/api/suggest", { name: "Ерунда", section: sec });
  v = (await o.get("/api/admin/interests")).body; assert.equal(v.groups.length, 2);
  const target = secOf("fandoms").items[0][0];
  await o.post("/api/admin/interests", { action: "synonym", ids: v.groups[0].ids, item: target });
  v = (await o.post("/api/admin/interests", { action: "reject", ids: v.groups[1].ids })).body;
  assert.equal(v.groups.length, 0);
  assert.deepEqual((await a.get("/api/interests")).body.syn.map(x => x.slice(0, 2)), [[target, "Другое имя"]]);
  v = (await o.post("/api/admin/interests", { action: "seen", ids: v.filtered.map(x => x.id) })).body;
  assert.equal(v.filtered.length, 0);
  const j = (await o.get("/api/admin/journal")).body;
  if (j.items) for (const k of ["suggest_block", "suggest_unblock", "interest_add", "interest_synonym", "interest_reject"]) assert.ok(j.items.some(x => x.action === k), k);
});

test("deleting the account removes suggestions and usage rows", async () => {
  const s = await setup(); await bound(s);
  const a = await person(s, 701, 52.52);
  await a.post("/api/interests", { items: firstIds("leisure", 3) });
  await s.env.DB.prepare("UPDATE checklists SET answered = 400 WHERE tg_id = 701").run();
  await a.post("/api/suggest", { name: "Что-то своё", section: secOf("leisure").id });
  await s.env.DB.prepare("INSERT INTO usage (tg_id, hour, req, rr, rw) VALUES (701, 1, 1, 1, 1)").run();
  assert.equal((await a.post("/api/delete", { confirm: true, word: "Да" })).body.ok, true);
  assert.equal(await s.env.DB.prepare("SELECT COUNT(*) AS n FROM interest_suggestions WHERE tg_id = 701").first("n"), 0);
  assert.equal(await s.env.DB.prepare("SELECT COUNT(*) AS n FROM usage WHERE tg_id = 701").first("n"), 0);
});

test("usage: counted through the wrapped database, heavy always, the rest sampled ×10, top list", async () => {
  const raw = makeD1();
  // a D1-like database that reports rows read / written
  const fake = new Proxy(raw, { get(t, k) {
    if (k === "prepare") return sql => { const st = t.prepare(sql); const w = s => ({ _run: () => s._run(), bind: (...a) => w(s.bind(...a)),
      all: async () => ({ ...(await s.all()), meta: { rows_read: 300, rows_written: 0 } }), run: async () => ({ ...(await s.run()), meta: { rows_read: 1, rows_written: 2 } }) }); return w(st); };
    return t[k];
  } });
  const { db, m } = USG.meter({ DB: fake });
  await db.prepare("SELECT 1").first(); await db.prepare("SELECT 2").all();
  await db.prepare("UPDATE settings SET value = value WHERE key = 'x'").run();
  assert.deepEqual({ rr: m.rr, rw: m.rw }, { rr: 601, rw: 2 });
  m.uid = 9;
  await USG.record(raw, m, 0.99);                    // heavy (> 500): always, weight 1
  await USG.record(raw, { rr: 10, rw: 0, uid: 9 }, 0.5);   // light and not drawn: nothing
  await USG.record(raw, { rr: 10, rw: 0, uid: 8 }, 0.01);  // light and drawn: ×10
  const rows = raw.raw.prepare("SELECT tg_id, req, rr, rw FROM usage ORDER BY tg_id").all().map(r => ({ ...r }));
  assert.deepEqual(rows, [{ tg_id: 8, req: 10, rr: 100, rw: 10 }, { tg_id: 9, req: 1, rr: 601, rw: 3 }]);
  const top = await USG.top({ DB: raw, ADMIN_ID: "8" }, 1);
  assert.deepEqual(top.people.map(x => [x.owner, x.rr]), [[false, 601], [true, 100]]);
  assert.equal(top.total.people, 2);
});

test("hidden group: shown only to people who have the item too; limits count both groups", async () => {
  const s = await setup(); await bound(s);
  const a = await person(s, 901, 52.52), b = await person(s, 902, 52.521), c = await person(s, 903, 52.522);
  const [x, h1, h2, y] = firstIds("leisure", 4);
  const r = await a.post("/api/interests", { items: [x, h1], hidden: [h1, h2] });   // h1 in both → hidden wins
  assert.equal(r.body.ok, true);
  assert.deepEqual(r.body.profile.interests, [x]); assert.deepEqual(r.body.profile.interests_hidden, [h1, h2]);
  await b.post("/api/interests", { items: [y], hidden: [h1] });   // b has h1 (hidden too)
  const seenBy = async cl => (await cl.get("/api/neighbours")).body.items.find(n => n.about && n.about.endsWith(" 901")) ||
    (await cl.get("/api/neighbours")).body.items.find(n => (n.interests || []).includes(x));
  assert.deepEqual((await seenBy(b)).interests, [x, h1]);   // h2 stays secret
  assert.deepEqual((await seenBy(c)).interests, [x]);       // c has none of the hidden ones
  const p = (await c.get("/api/person?id=" + (await seenBy(c)).id)).body.person;
  assert.deepEqual(p.interests, [x]);
  // limits: 20 hobbies across both groups
  const lei = firstIds("leisure", 21);
  assert.equal((await a.post("/api/interests", { items: lei.slice(0, 15), hidden: lei.slice(15, 21) })).body.error, "too_many");
  assert.equal((await a.post("/api/interests", { items: lei.slice(0, 15), hidden: lei.slice(15, 20) })).body.ok, true);
  // the owner sees both groups apart
  const o = await client(s, OWNER);
  const id901 = (await s.env.DB.prepare("SELECT pub_id FROM users WHERE tg_id = 901").first("pub_id"));
  const ap = (await o.get("/api/admin/profile?id=" + id901)).body.profile;
  assert.equal(ap.interests.length, 15); assert.equal(ap.interests_hidden.length, 5);
});

test("the owner adds an item by hand (no suggestion behind it)", async () => {
  const s = await setup(); await bound(s);
  const o = await client(s, OWNER), sec = secOf("leisure").id;
  const r = (await o.post("/api/admin/interests", { action: "add", ids: [], name: "Своё увлечение", section: sec })).body;
  assert.equal(r.ok, true); assert.equal(r.item, 100000);
  assert.deepEqual((await o.get("/api/interests")).body.extra, [[100000, sec, "Своё увлечение", ""]]);
  assert.equal((await o.post("/api/admin/interests", { action: "reject", ids: [] })).body.error, "bad_ids");
});

test("accepted suggestions: the author gets one bot message (also for ones accepted earlier, via the hourly job)", async () => {
  const s = await setup(); await bound(s);
  const a = await person(s, 951, 52.52), sec = secOf("fandoms").id;
  await a.post("/api/interests", { items: firstIds("leisure", 3) });
  await s.env.DB.prepare("UPDATE checklists SET answered = 400 WHERE tg_id = 951").run();
  await a.post("/api/suggest", { name: "Выдуманный мульт", section: sec });
  await a.post("/api/suggest", { name: "Другое название", section: sec });
  const o = await client(s, OWNER);
  let v = (await o.get("/api/admin/interests")).body;
  s.tg.clear();
  await o.post("/api/admin/interests", { action: "add", ids: v.groups.find(g => g.name.startsWith("Выдуманный")).ids, name: "Выдуманный мульт", section: sec });
  let msgs = s.tg.sent(951).map(m => m.params.text);
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /«Выдуманный мульт» принято/); assert.match(msgs[0], /уже отмечено у вас/);
  // accepted «before this version»: notified = 0 → the hourly job tells, once
  v = (await o.get("/api/admin/interests")).body;
  await s.env.DB.prepare("UPDATE interest_suggestions SET status = 'synonym', item = 1, notified = 0 WHERE id IN (SELECT value FROM json_each(?1))").bind(JSON.stringify(v.groups[0].ids)).run();
  s.tg.clear();
  await s.worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 28, 12, 17) }, s.env);
  msgs = s.tg.sent(951).map(m => m.params.text);
  assert.equal(msgs.length, 1); assert.match(msgs[0], /«Другое название» принято/);
  s.tg.clear();
  await s.worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 28, 13, 17) }, s.env);
  assert.equal(s.tg.sent(951).length, 0);
});

test("the owner renames an item and adds / deletes search words; everyone gets them with the catalog state", async () => {
  const s = await setup(); await bound(s);
  const o = await client(s, OWNER), item = secOf("leisure").items[0][0];
  assert.equal((await o.post("/api/admin/interests", { action: "rename", item: 999999, name: "Нет такого" })).body.error, "bad_item");
  assert.equal((await o.post("/api/admin/interests", { action: "rename", item, name: "Х" })).body.error, "bad_length");
  assert.equal((await o.post("/api/admin/interests", { action: "rename", item, name: "Новое имя" })).body.ok, true);
  await o.post("/api/admin/interests", { action: "rename", item, name: "Ещё новее" });   // rename again: one row
  assert.equal((await o.post("/api/admin/interests", { action: "syn_add", item, text: "словечко" })).body.ok, true);
  let st = (await o.get("/api/interests")).body;
  assert.deepEqual(st.names, [[item, "Ещё новее"]]);
  assert.equal(st.syn.length, 1); assert.equal(st.syn[0][0], item); assert.equal(st.syn[0][1], "словечко");
  assert.equal((await o.post("/api/admin/interests", { action: "syn_del", id: st.syn[0][2] })).body.ok, true);
  assert.equal((await o.post("/api/admin/interests", { action: "rename", item, name: "" })).body.ok, true);   // back to the original
  st = (await o.get("/api/interests")).body;
  assert.deepEqual(st.names, []); assert.deepEqual(st.syn, []);
  const j = (await o.get("/api/admin/journal")).body.items.map(x => x.action);
  for (const k of ["interest_rename", "interest_syn_add", "interest_syn_del"]) assert.ok(j.includes(k), k);
});
