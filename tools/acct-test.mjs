// Runs /api/acct, /api/pay/checkout and /api/pay/webhook against a real SQLite (node:sqlite, Node 22.5+) dressed up as D1.
// Usage: node tools/acct-test.mjs   (exits 1 on the first failed check; Stripe's API is never called, fetch is stubbed)
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const imp = f => import(pathToFileURL(path.join(root, f)).href);
const acct = await imp('functions/api/acct.js'), co = await imp('functions/api/pay/checkout.js'), wh = await imp('functions/api/pay/webhook.js');

// ---- D1 shim ----
const sql = new DatabaseSync(':memory:');
sql.exec(fs.readFileSync(path.join(root, 'migrations/0003_account.sql'), 'utf8'));
const D1 = {
  async batch(L) { const out = []; for (const st of L) out.push(await st.run()); return out; },
  prepare(q) {
    let args = [];
    const s = {
      bind(...a) { args = a; return s; },
      async first() { return sql.prepare(q).get(...args) || null; },
      async all() { return { results: sql.prepare(q).all(...args) }; },
      async run() { const r = sql.prepare(q).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    };
    return s;
  },
};

const ORIGIN = 'https://tower-of-fate.pages.dev';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
function req(url, body, { tok, origin = ORIGIN, ip = '1.2.3.4', headers = {}, raw } = {}) {
  const h = { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip, ...headers };
  if (origin) h.Origin = origin;
  if (tok) h.Authorization = 'Bearer ' + tok;
  return new Request(ORIGIN + url, { method: body || raw ? 'POST' : 'GET', headers: h, body: raw != null ? raw : body ? JSON.stringify(body) : undefined });
}
const A = async (b, o, env = { TOF_DB: D1 }) => { const r = await acct.onRequestPost({ request: req('/api/acct', b, o), env }); return { st: r.status, j: await r.json() }; };

console.log('accounts');
ok((await A({ a: 'signup', name: 'x', pw: '12345678' })).j.error === 'bad-name', 'short name refused');
ok((await A({ a: 'signup', name: 'ฮีโร่ไทย', pw: '123' })).j.error === 'bad-pw', 'short password refused');
ok((await A({ a: 'signup', name: 'abc', pw: '12345678' }, { origin: 'https://evil.example' })).st === 403, 'other origin refused');
let r = await A({ a: 'signup', name: 'ฮีโร่ไทย', pw: 'password1' });
ok(r.j.ok && /^[A-Za-z0-9_-]{43}$/.test(r.j.tok), 'signup gives a token');
let tok = r.j.tok;
const row = sql.prepare('SELECT * FROM acct').get();
ok(row.iter === 100000 && row.hash.length === 64 && row.salt.length === 32 && !row.hash.includes('password'), 'password stored as PBKDF2 100k with salt');
ok(sql.prepare('SELECT th FROM acct_sess').get().th !== tok, 'session token stored hashed');
ok((await A({ a: 'signup', name: 'ฮีโร่ไทย', pw: 'password1' })).j.error === 'taken', 'same name taken');
ok((await A({ a: 'signup', name: 'Bob_1', pw: 'password1' })).j.ok, 'second account');
ok((await A({ a: 'signup', name: 'bob_1', pw: 'password1' })).j.error === 'taken', 'name compare ignores case');
r = await A({ a: 'login', name: 'ฮีโร่ไทย', pw: 'password1' }); ok(r.j.ok && r.j.name === 'ฮีโร่ไทย', 'login');
r = await A({ a: 'me' }, { tok }); ok(r.j.ok && r.j.save === null && Array.isArray(r.j.ent) && r.j.shop === false, 'me (shop closed without keys)');
ok((await A({ a: 'me' }, { tok: 'A'.repeat(43) })).st === 401, 'bad token 401');

console.log('cloud save');
ok((await A({ a: 'load' }, { tok })).j.error === 'no-save', 'no save yet');
const p = JSON.stringify({ 'tof-meta-v1': '{"gold":5}', 'tof-ach-v1': '{}' });
r = await A({ a: 'save', z: '', p, m: { keys: 2, hero: '<b>x</b>' } }, { tok }); ok(r.j.ok, 'save');
ok((await A({ a: 'save', z: '', p, m: {} }, { tok })).st === 429, 'second save within 15 s limited');
r = await A({ a: 'load' }, { tok }); ok(r.j.ok && r.j.p === p && r.j.m.keys === 2 && r.j.m.hero === 'bx/b', 'load returns the save, summary cleaned');
ok((await A({ a: 'save', z: 'gz', p: 'not base64!' }, { tok })).st === 400, 'bad gzip payload refused');
ok((await A({ a: 'save', z: '', p: '{' + 'x'.repeat(1100001) }, { tok })).st === 413, 'oversized save refused');

console.log('cloud save from two browsers');
// pretend the last upload was a minute ago so the 15 s gap does not get in the way
const age = () => sql.prepare('UPDATE acct_save SET at = at - 60000').run();
age();
let at1 = (await A({ a: 'load' }, { tok })).j.at;
const pB = JSON.stringify({ 'tof-meta-v1': '{"gold":0}' });
r = await A({ a: 'save', z: '', p: pB, m: {}, base: 0 }, { tok });
ok(r.st === 409 && r.j.error === 'conflict' && r.j.at === at1 && r.j.m.keys === 2, 'new browser (base 0) cannot overwrite an existing cloud save');
ok((await A({ a: 'load' }, { tok })).j.p === p, 'cloud save untouched after conflict');
ok((await A({ a: 'save', z: '', p: pB, m: {}, base: at1 - 5 }, { tok })).st === 409, 'stale base refused');
ok((await A({ a: 'save', z: '', p: pB, m: {}, base: 'x' }, { tok })).st === 400, 'bad base refused');
r = await A({ a: 'save', z: '', p, m: { keys: 2, h: 'abc123' }, base: at1 }, { tok });
ok(r.j.ok && r.j.at > at1, 'matching base saves');
r = await A({ a: 'me' }, { tok }); ok(r.j.save.m.h === 'abc123', 'save hash kept in summary');
age();
r = await A({ a: 'save', z: '', p, m: { h: '<script>' } }, { tok }); ok(r.j.ok, 'no base = explicit overwrite still works');
ok((await A({ a: 'me' }, { tok })).j.save.m.h === undefined, 'junk hash dropped');

console.log('password change + logout');
const t2 = (await A({ a: 'login', name: 'ฮีโร่ไทย', pw: 'password1' })).j.tok;
ok((await A({ a: 'passwd', pw: 'wrong-pass', npw: 'newpass99' }, { tok })).j.error === 'bad-login', 'wrong current password');
r = await A({ a: 'passwd', pw: 'password1', npw: 'newpass99' }, { tok }); ok(r.j.ok && r.j.tok, 'password changed');
ok((await A({ a: 'me' }, { tok: t2 })).st === 401, 'other sessions signed out');
tok = r.j.tok;
ok((await A({ a: 'login', name: 'ฮีโร่ไทย', pw: 'password1' })).st === 401, 'old password no longer works');
ok((await A({ a: 'login', name: 'ฮีโร่ไทย', pw: 'newpass99' })).j.ok, 'new password works');

console.log('rate limits');
let last = null; for (let i = 0; i < 9; i++) last = await A({ a: 'login', name: 'Bob_1', pw: 'nope-nope' }, { ip: '9.9.9.' + i });
ok(last.st === 429, 'wrong passwords per name limited after 8');
ok((await A({ a: 'login', name: 'Bob_1', pw: 'password1' }, { ip: '8.8.8.8' })).st === 429, 'even the right password waits');
for (let i = 0; i < 6; i++) last = await A({ a: 'signup', name: 'spam' + i, pw: 'password1' }, { ip: '7.7.7.7' });
ok(last.st === 429, 'sign-ups per IP limited after 5');

console.log('logout');
ok((await A({ a: 'logout' }, { tok })).j.ok, 'logout');
ok((await A({ a: 'me' }, { tok })).st === 401, 'token dead after logout');
tok = (await A({ a: 'login', name: 'ฮีโร่ไทย', pw: 'newpass99' })).j.tok;
const uid = sql.prepare("SELECT id FROM acct WHERE nk = 'ฮีโร่ไทย'").get().id;

console.log('shop');
let x = await co.onRequestPost({ request: req('/api/pay/checkout', { sku: 'gold_s' }, { tok }), env: { TOF_DB: D1 } });
ok(x.status === 503 && (await x.json()).error === 'closed', 'checkout 503 without Stripe keys');
x = await co.onRequestGet({ env: {} }); let g = await x.json(); ok(g.open === false && g.items.gold_s.amt === 3500, 'catalog says closed');
const env = { TOF_DB: D1, STRIPE_SECRET_KEY: 'sk_test_dummy', STRIPE_WEBHOOK_SECRET: 'whsec_dummy' };
let sent = null;
globalThis.fetch = async (u, o) => { sent = { u, body: new URLSearchParams(o.body), auth: o.headers.Authorization }; return new Response(JSON.stringify({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }), { status: 200 }); };
x = await co.onRequestPost({ request: req('/api/pay/checkout', { sku: 'gold_s' }, { tok }), env }); g = await x.json();
ok(g.ok && g.url.startsWith('https://checkout.stripe.com/'), 'checkout url');
ok(sent.body.get('line_items[0][price_data][unit_amount]') === '3500' && sent.body.getAll('payment_method_types[]').join() === 'card,promptpay' && sent.body.get('metadata[uid]') === String(uid), 'stripe form: price from server, card+promptpay, uid');
ok((await co.onRequestPost({ request: req('/api/pay/checkout', { sku: 'free_stuff' }, { tok }), env })).status === 400, 'unknown sku refused');
ok((await co.onRequestPost({ request: req('/api/pay/checkout', { sku: 'gold_s' }), env })).status === 401, 'must be logged in');

console.log('webhook');
const { createHmac } = await import('node:crypto');
const ev = (type, status, sku = 'gold_s', amt = 3500, id = 'cs_test_1') => JSON.stringify({ type, data: { object: { id, payment_status: status, currency: 'thb', amount_total: amt, client_reference_id: String(uid), metadata: { uid: String(uid), sku } } } });
const sign = (body, t = Math.floor(Date.now() / 1000), sec = env.STRIPE_WEBHOOK_SECRET) => `t=${t},v1=${createHmac('sha256', sec).update(t + '.' + body).digest('hex')}`;
const W = async (body, sig) => { const r = await wh.onRequestPost({ request: req('/api/pay/webhook', null, { raw: body, origin: null, headers: { 'Stripe-Signature': sig } }), env }); return { st: r.status, j: await r.json() }; };
let b = ev('checkout.session.completed', 'paid');
ok((await W(b, sign(b, undefined, 'whsec_wrong'))).st === 400, 'wrong signature refused');
ok((await W(b, sign(b, Math.floor(Date.now() / 1000) - 600))).st === 400, 'old timestamp refused');
ok((await W(b.replace('3500', '9999'), sign(b))).st === 400, 'changed body refused');
const pp = ev('checkout.session.completed', 'unpaid', 'wear_halo', 2900, 'cs_test_2');
ok((await W(pp, sign(pp))).j.skip === 'unpaid', 'PromptPay pending: nothing granted yet');
ok((await W(b, sign(b))).j.ok, 'paid session granted');
ok((await W(b, sign(b))).j.ok && sql.prepare('SELECT COUNT(*) n FROM ent').get().n === 1, 'retried webhook adds nothing');
const pp2 = ev('checkout.session.async_payment_succeeded', 'paid', 'wear_halo', 2900, 'cs_test_2');
ok((await W(pp2, sign(pp2))).j.ok, 'PromptPay paid later granted');
const cheap = ev('checkout.session.completed', 'paid', 'gold_l', 100, 'cs_test_3');
ok((await W(cheap, sign(cheap))).j.skip === 'amount', 'amount below price ignored');
r = await A({ a: 'me' }, { tok }, env); ok(r.j.ent.map(e => e.sku).join() === 'gold_s,wear_halo' && r.j.shop === true, 'me lists entitlements: ' + r.j.ent.map(e => e.sku).join());
ok((await A({ a: 'me' }, { tok }, {})).st === 503, 'no D1 -> 503');

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
