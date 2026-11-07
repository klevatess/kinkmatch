import { test } from "node:test";
import assert from "node:assert/strict";
import { setup, bound, botStatus, CHAT, OWNER } from "./helpers/env.js";
import { signInitData } from "../src/webapp.js";
import { KC } from "../src/checklist.js";
import { aboutSnippet } from "../src/extra.js";

/* owner, 2026-11-07: the November batch — «Не указано», «Не сейчас» for N days, «Указан не тот пол», «подозрительная
   анкета», the profile link, «Сообщения», «Видимость: почему», «Отправить всем», deleting an added interest.
   Made-up people only. */
const IDS = []; KC.CATS.forEach(c => c.items.forEach(([, id]) => IDS.push(id)));
const ANS = ["limit", "maybe", "yes", "love"];
const link = seed => { const st = { name: "S" + seed, uid: "zz" + String(seed).padStart(4, "0"), meta: { role: "sub" }, items: {} }; IDS.forEach((id, i) => { if (i % 2 === 0) st.items[id] = { interest: ANS[(i * 7 + seed) % 4] }; }); return "https://klevatess.github.io/kinkmatch/#" + KC.codec.encode(st); };
async function client(s, id) {
  const init = await signInitData(s.env.BOT_TOKEN, { auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id, first_name: "T", language_code: "ru" }) });
  const call = async (method, path, body) => { const r = await s.worker.fetch(new Request("https://bot.example" + path, { method, headers: { authorization: "tma " + init }, body: body ? JSON.stringify(body) : undefined }), s.env); return { status: r.status, body: await r.json() }; };
  return { get: p => call("GET", p), post: (p, b) => call("POST", p, b) };
}
async function person(s, id, o) {
  s.tg.setMember(o.chat || CHAT, id, "member");
  const c = await client(s, id);
  await c.get("/api/me");
  await c.post("/api/consent", { consent: true, birth_date: o.birth || "1990-06-01", gender: o.gender });
  await c.post("/api/checklist", { link: link(id) });
  await c.post("/api/profile", { seeking: ["one"], looking_for: ["sessions"], show_genders: o.show || ["man", "woman", "other"], age_min: 18, age_max: 99,
    about: o.about || "made-up about text of " + id, about_public: true, compare_before_yes: true, nick: o.nick });
  assert.equal((await c.post("/api/location", { lat: 52.52, lon: 13.405, radius: 1 })).body.active, true);
  return c;
}
const nicks = r => r.body.items.map(x => x.nick).sort();

test("owner 2026-11-07: «Не указано» — its own choice decides, the other side's gender filter does not hide it", async () => {
  const s = await setup(); await bound(s);
  const o = await person(s, 501, { gender: "other", nick: "Туман", show: ["woman"] });
  const w = await person(s, 502, { gender: "woman", nick: "Ива", show: ["man"] });        // «только мужчин»
  const m = await person(s, 503, { gender: "man", nick: "Клён", show: ["woman", "other"] });
  assert.deepEqual(nicks(await o.get("/api/neighbours")), ["Ива"]);          // Туман shows women: Ива; not Клён
  assert.deepEqual(nicks(await w.get("/api/neighbours")), ["Клён", "Туман"]); // Ива's «только мужчин» does not hide Туман
  assert.deepEqual(nicks(await m.get("/api/neighbours")), ["Ива"]);          // Туман's own choice (women) hides it from Клён
});

test("owner 2026-11-07: «Не сейчас» for a chosen number of days; other values refused", async () => {
  const s = await setup(); await bound(s);
  const a = await person(s, 511, { gender: "woman", nick: "Ива" });
  await person(s, 512, { gender: "man", nick: "Клён" });
  const k = (await a.get("/api/neighbours")).body.items[0];
  assert.equal((await a.post("/api/answer", { id: k.id, value: "no", days: 4 })).status, 400);
  assert.equal((await a.post("/api/answer", { id: k.id, value: "no", days: 30 })).body.ok, true);
  let c = (await a.get("/api/neighbours")).body.items[0];
  assert.equal(c.my, "no"); assert.equal(c.was_hidden, false);
  await s.env.DB.prepare("UPDATE answers SET until = 1 WHERE a = 511").run();
  await s.env.DB.prepare("INSERT INTO nb_log (who, only_for, at) VALUES (512, NULL, 0)").run();
  c = (await a.get("/api/neighbours")).body.items[0];
  assert.equal(c.was_hidden, true, "the chosen time is over");
  // the old app (no days): the old 5 days
  assert.equal((await a.post("/api/answer", { id: k.id, value: "no" })).body.ok, true);
  assert.equal(await s.env.DB.prepare("SELECT until FROM answers WHERE a = 511").first("until"), null);
});

test("owner 2026-11-07: report reason «Указан не тот пол»; «подозрительная анкета» is on the card for others only", async () => {
  const s = await setup(); await bound(s);
  const a = await person(s, 521, { gender: "woman", nick: "Ива" });
  const b = await person(s, 522, { gender: "man", nick: "Клён" });
  const owner = await client(s, OWNER);
  const k = (await a.get("/api/neighbours")).body.items[0];
  assert.equal((await a.post("/api/report", { id: k.id, reason: "gender", text: "" })).body.ok, true);
  assert.equal(await s.env.DB.prepare("SELECT reason FROM reports").first("reason"), "gender");
  assert.equal((await owner.post("/api/admin/sus", { id: k.id, on: true, reason: "nope" })).status, 400);
  assert.equal((await owner.post("/api/admin/sus", { id: k.id, on: true, reason: "fake", note: "  made-up <note>  " })).body.ok, true);
  assert.equal((await a.get("/api/neighbours")).body.items[0].sus, true);
  assert.equal((await b.get("/api/me")).body.profile.sus, undefined, "the person is not told");
  assert.equal(s.tg.sent(522).filter(x => /подозр/i.test(x.params.text)).length, 0);
  const card = (await owner.get("/api/admin/profile?id=" + k.id)).body;
  assert.equal(card.sus.reason, "fake"); assert.equal(card.sus.note, "made-up <note>");
  assert.equal((await owner.post("/api/admin/sus", { id: k.id, on: false })).body.ok, true);
  assert.equal((await a.get("/api/neighbours")).body.items[0].sus, undefined);
  assert.ok(await s.env.DB.prepare("SELECT 1 AS x FROM audit WHERE action = 'sus_clear'").first());
});

test("owner 2026-11-07: the profile link — full card for someone who sees the person, a teaser for others, renew, delete", async () => {
  const s = await setup(); await bound(s);
  await botStatus(s, "administrator", { id: -600, type: "supergroup", title: "Other chat" });
  const a = await person(s, 531, { gender: "woman", nick: "Фиалка", about: "Люблю долгие разговоры до встречи. Начинаю с кофе в людном месте." });
  const b = await person(s, 532, { gender: "man", nick: "Клён" });                    // same chat
  const c = await person(s, 533, { gender: "man", nick: "Кедр", chat: -600 });        // another chat
  await a.post("/api/interests", { items: [1, 3, 5] });
  const l = (await a.get("/api/plink")).body;
  assert.match(l.code, /^[a-z2-9]{8}$/); assert.ok(l.url.endsWith("?start=p_" + l.code));
  assert.equal((await a.get("/api/plink")).body.code, l.code, "the same code until renewed");
  const full = (await b.get("/api/plink/open?c=" + l.code)).body;
  assert.equal(full.mode, "full"); assert.ok(full.id);
  const tz = (await c.get("/api/plink/open?c=" + l.code)).body;
  assert.equal(tz.mode, "teaser"); assert.equal(tz.teaser.nick, "Фиалка");
  assert.equal(tz.teaser.groups.length, 3); assert.ok(tz.teaser.groups[0].pct >= tz.teaser.groups[2].pct);
  assert.deepEqual(tz.teaser.interests, [1, 3]);
  assert.equal(tz.teaser.about, "Люблю долгие разговоры до встречи. Начинаю с…");
  assert.equal(tz.full, undefined); assert.equal(JSON.stringify(tz).includes("enc"), false);
  // someone who has not registered yet: a teaser too
  const n = await client(s, 539);
  assert.equal((await n.get("/api/plink/open?c=" + l.code)).body.mode, "teaser");
  // a new link: the old one is gone
  const l2 = (await a.post("/api/plink", { renew: true })).body;
  assert.notEqual(l2.code, l.code);
  assert.equal((await c.get("/api/plink/open?c=" + l.code)).status, 404);
  assert.equal((await c.get("/api/plink/open?c=bad")).status, 404);
  // the bot: /start p_<code> → a button that opens the card
  s.tg.clear();
  await s.dm(s.user(533), "/start p_" + l2.code);
  const sent = s.tg.sent(533).pop();
  assert.ok(sent.params.reply_markup.inline_keyboard[0][0].web_app.url.endsWith("?p=" + l2.code));
  // account deletion removes the link
  assert.equal((await a.post("/api/delete", { confirm: true, word: "Да" })).body.ok, true);
  assert.equal(await s.env.DB.prepare("SELECT COUNT(*) AS n FROM profile_links WHERE tg_id = 531").first("n"), 0);
});

test("owner 2026-11-07: the teaser text — 45 characters, a shorter text gives 70 %, never half a word", () => {
  assert.equal(aboutSnippet(""), "");
  assert.equal(aboutSnippet("Люблю долгие разговоры до встречи. Начинаю с кофе в людном месте."), "Люблю долгие разговоры до встречи. Начинаю с…");
  assert.equal(aboutSnippet("Медленно и честно. Сначала голосовые."), "Медленно и честно…");   // 37 chars → 25 cuts «Сначала»: back to a whole word, no trailing dot
  assert.equal(aboutSnippet("Сверхдлинноесловобезпробелов"), "");
});

test("owner 2026-11-07: «Сообщения», «Видимость: почему», deleting an added interest, «Отправить всем»", async () => {
  const s = await setup(); await bound(s);
  const a = await person(s, 541, { gender: "woman", nick: "Ива", show: ["man"] });
  const b = await person(s, 542, { gender: "man", nick: "Клён" });
  const w = await person(s, 543, { gender: "woman", nick: "Олива" });                     // Ива shows only men
  const owner = await client(s, OWNER);
  await s.env.DB.prepare("UPDATE users SET msg_balance = 3 WHERE tg_id = 541").run();
  const k = (await a.get("/api/neighbours")).body.items.find(x => x.nick === "Клён");
  assert.equal((await a.post("/api/answer", { id: k.id, value: "yes", msg: "Привет, кофе?" })).body.msg, true);
  const ms = (await owner.get("/api/admin/likemsgs")).body;
  assert.equal(ms.items.length, 1); assert.equal(ms.items[0].text, "Привет, кофе?"); assert.equal(ms.items[0].from.nick, "Ива");
  assert.ok(await s.env.DB.prepare("SELECT 1 AS x FROM audit WHERE action = 'like_msg_read'").first());
  // why Ива does not see Олива: her own gender filter
  const pubA = (await owner.get("/api/admin/profiles")).body.items.find(x => x.nick === "Ива").n;
  const why = (await owner.get("/api/admin/whynot?id=" + pubA + "&dir=sees")).body;
  assert.equal(why.total, 2); assert.equal(why.ok_n, 1);
  assert.equal(why.reasons.find(x => x.key === "gender_his").n, 1);
  assert.equal(why.reasons.reduce((n, x) => n + x.n, 0) + why.ok_n, why.total, "the rows add up to the gap");
  // an added interest: deleted from the catalog and from every profile
  const add = (await owner.post("/api/admin/interests", { action: "add", section: 1, name: "Тестовый интерес" })).body;
  await a.post("/api/interests", { items: [1, add.item] });
  assert.equal((await owner.post("/api/admin/interests", { action: "del_count", item: add.item })).body.people, 1);
  assert.equal((await owner.post("/api/admin/interests", { action: "delete", item: 5 })).status, 400, "built-in items stay");
  assert.equal((await owner.post("/api/admin/interests", { action: "delete", item: add.item })).body.removed_from, 1);
  assert.equal(await s.env.DB.prepare("SELECT interests FROM profiles WHERE tg_id = 541").first("interests"), "[1]");
  // «Отправить всем»: into the outbox, the panel pushes the batches
  assert.equal((await owner.post("/api/admin/broadcast", { text: "", audience: "active" })).status, 400);
  assert.equal((await owner.get("/api/admin/broadcast?audience=active")).body.count, 3);
  s.tg.clear();
  const bc = (await owner.post("/api/admin/broadcast", { text: "✨ Большое обновление <b>", audience: "active", button: true })).body;
  assert.equal(bc.total, 3);
  assert.equal((await owner.post("/api/admin/broadcast", { text: "ещё", audience: "active" })).status, 400, "one at a time");
  assert.equal((await owner.post("/api/admin/broadcast-push")).body.waiting, 0);
  for (const id of [541, 542, 543]) assert.equal(s.tg.last(id), "✨ Большое обновление &lt;b&gt;");
  assert.equal(s.tg.sent(OWNER).length, 0);
  const r = (await owner.get("/api/admin/retention?fresh=1")).body;
  assert.ok(r.d7 && r.d30 && r.mutual_per_active);
});

test("owner 2026-11-07: one link — the profile link also invites someone new (bot /start and straight into the app)", async () => {
  const s = await setup(); await bound(s);
  const a = await person(s, 551, { gender: "woman", nick: "Фиалка" });
  const code = (await a.get("/api/plink")).body.code;
  // already in the bot: not counted
  await s.dm(s.user(552), "/start");
  await s.dm(s.user(552), "/start p_" + code);
  assert.equal(await s.env.DB.prepare("SELECT COUNT(*) AS n FROM referrals").first("n"), 0);
  // new, through the bot
  await s.dm(s.user(553), "/start p_" + code);
  assert.equal(await s.env.DB.prepare("SELECT inviter FROM referrals WHERE invitee = 553").first("inviter"), 551);
  // new, straight into the app by the link
  const n = await client(s, 554);
  assert.equal((await n.get("/api/plink/open?c=" + code)).body.mode, "teaser");
  assert.equal(await s.env.DB.prepare("SELECT inviter FROM referrals WHERE invitee = 554").first("inviter"), 551);
  // the owner of the link may not invite: the link still opens the profile, nobody is credited
  await s.env.DB.prepare("UPDATE users SET can_invite = 0 WHERE tg_id = 551").run();
  await s.dm(s.user(555), "/start p_" + code);
  assert.equal(await s.env.DB.prepare("SELECT COUNT(*) AS n FROM referrals WHERE invitee = 555").first("n"), 0);
  // a mutual card carries interests now
  const b = await person(s, 556, { gender: "man", nick: "Клён" });
  await a.post("/api/interests", { items: [1, 3] });
  const kb = (await a.get("/api/neighbours")).body.items.find(x => x.nick === "Клён");
  const ka = (await b.get("/api/neighbours")).body.items.find(x => x.nick === "Фиалка");
  await a.post("/api/answer", { id: kb.id, value: "yes" }); await b.post("/api/answer", { id: ka.id, value: "yes" });
  assert.deepEqual((await b.get("/api/matches")).body.items[0].interests, [1, 3]);
});

test("owner 2026-11-07: «Отправить всем» with a photo — uploaded once, a caption when it fits, two messages when not", async () => {
  const s = await setup(); await bound(s);
  for (const id of [561, 562]) await person(s, id, { gender: "man", nick: "Н" + id });
  const owner = await client(s, OWNER);
  const up = async (type, bytes) => { const r = await s.worker.fetch(new Request("https://bot.example/api/admin/broadcast-photo", { method: "POST", headers: { authorization: (await ownerAuth(s)), "content-type": type }, body: bytes }), s.env); return { status: r.status, body: await r.json() }; };
  assert.equal((await up("text/plain", new Uint8Array([1, 2]))).status, 400);
  const ph = (await up("image/jpeg", new Uint8Array([255, 216, 255, 224, 1, 2, 3]))).body;
  assert.equal(ph.photo, "ph_big");
  assert.equal((await owner.post("/api/admin/broadcast", { text: "x", audience: "active", photo: "bad id!" })).status, 400);
  s.tg.clear();
  assert.equal((await owner.post("/api/admin/broadcast", { text: "Короткий <текст>", audience: "active", photo: ph.photo, button: true })).body.total, 2);
  assert.equal((await owner.post("/api/admin/broadcast-push")).body.waiting, 0);
  const p1 = s.tg.calls.filter(c => c.method === "sendPhoto" && String(c.params.chat_id) === "561");
  assert.equal(p1.length, 1); assert.equal(p1[0].params.caption, "Короткий &lt;текст&gt;"); assert.ok(p1[0].params.reply_markup);
  // longer than a caption: the photo, then the text with the button — and a batch never goes over its call budget
  s.tg.clear();
  await owner.post("/api/admin/broadcast", { text: "я".repeat(1500), audience: "active", photo: ph.photo, button: true });
  const { flush } = await import("../src/universe.js");
  assert.equal(await flush(s.env, 3), 1, "two calls each: only one person fits into 3");
  assert.equal((await owner.post("/api/admin/broadcast-push")).body.waiting, 0);
  for (const id of ["561", "562"]) {
    const mine = s.tg.calls.filter(c => String(c.params.chat_id) === id);
    assert.deepEqual(mine.map(c => c.method), ["sendPhoto", "sendMessage"]);
    assert.equal(mine[0].params.caption, undefined); assert.ok(mine[1].params.reply_markup);
  }
});
async function ownerAuth(s) {
  return "tma " + await signInitData(s.env.BOT_TOKEN, { auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: OWNER, first_name: "T", language_code: "ru" }) });
}
