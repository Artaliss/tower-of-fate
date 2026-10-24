// Runs the v0.3.5.7 server changes (store.js update/CAS, scores, live, posts, move, acct, checkout, memorial random, util.clean)
// against a real SQLite (node:sqlite, Node 22.5+) dressed up as D1.
// Usage: node tools/api-test.mjs   (prints ok/FAIL per check, exits 1 if any failed; Stripe is never called, fetch is stubbed)
// Each statement waits 0-3 event-loop turns first, so requests sent with Promise.all interleave the way they would on D1.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const imp = f => import(pathToFileURL(path.join(root, 'functions/api', f)).href);
let off = 0; const realNow = Date.now.bind(Date); Date.now = () => realNow() + off;
Math.random = () => 0.5;   // no random sweeps inside a request

// ---- D1 shim ----
const sql = new DatabaseSync(':memory:');
for (const f of ['0001_memorial.sql', '0003_account.sql']) sql.exec(fs.readFileSync(path.join(root, 'migrations', f), 'utf8'));
const writes = () => sql.prepare('SELECT total_changes() AS n').get().n;
const turns = async () => { const n = crypto.getRandomValues(new Uint8Array(1))[0] % 4; for (let i = 0; i < n; i++) await new Promise(setImmediate); };
let hook = null;   // async fn(q) awaited before a statement runs (store.js retry tests)
const D1 = {
  async batch(L) { const out = []; for (const st of L) out.push(await st.run()); return out; },
  prepare(q) {
    let args = [];
    const pre = async () => { await turns(); if (hook) await hook(q); };
    const s = {
      bind(...a) { args = a; return s; },
      async first() { await pre(); return sql.prepare(q).get(...args) || null; },
      async all() { await pre(); return { results: sql.prepare(q).all(...args) }; },
      async run() { await pre(); const r = sql.prepare(q).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    };
    return s;
  },
};

let fails = 0, passes = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (c) passes++; else fails++; };
const ORIGIN = 'https://tower-of-fate.pages.dev';
const ENV = { TOF_DB: D1, PBKDF2_ITER: '10000' };
function req(url, body, { ip = '1.2.3.4', tok } = {}) {
  const h = { Origin: ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip };
  if (tok) h.Authorization = 'Bearer ' + tok;
  return new Request(ORIGIN + url, body === undefined ? { headers: h } : { method: 'POST', headers: h, body: JSON.stringify(body) });
}
// a thrown error (e.g. store.js 'busy') comes back as st 'throw' instead of killing the run
async function call(mod, url, body, o, env = ENV) {
  try { const r = await (body === undefined ? mod.onRequestGet : mod.onRequestPost)({ request: req(url, body, o), env, waitUntil() { } }); return { st: r.status, j: await r.json() }; }
  catch (e) { return { st: 'throw', j: {}, err: String(e && e.message || e) }; }
}
const kvGet = k => { const r = sql.prepare('SELECT v FROM kv WHERE k = ?').get(k); return r ? JSON.parse(r.v) : null; };
const count = (L, f) => L.filter(f).length;
const sts = L => { const m = {}; for (const r of L) m[r.st] = (m[r.st] | 0) + 1; return JSON.stringify(m); };

// ---- 1. store.js ----
console.log('store.js update()');
sql.exec('CREATE TABLE kv (k TEXT PRIMARY KEY, v TEXT NOT NULL, exp INTEGER)');   // a DB from before ver existed
sql.prepare('INSERT INTO kv (k, v, exp) VALUES (?, ?, NULL)').run('old', 'x');
const { store, update } = await imp('store.js');
const { MAX_SAVE, ipHash } = await imp('util.js');
const s1 = store({ TOF_DB: D1 }), s2 = store({ TOF_DB: D1 });
ok(await s1.get('old') === 'x', 'old kv row still readable');
ok(sql.prepare('PRAGMA table_info(kv)').all().some(c => c.name === 'ver'), 'ver column added to an old kv table');
ok(await update(s1, 'c', s => String((+s || 0) + 1)) === true && await s1.get('c') === '1', 'update() inserts a new key');
ok(await update(s1, 'c', s => String(+s + 1)) && await s1.get('c') === '2', 'update() changes an existing key');
let w0 = writes();
ok(await update(s1, 'c', () => null) === false && writes() === w0 && await s1.get('c') === '2', 'fn returning null -> false, nothing written');
let calls = 0;
const r1 = await update(s1, 'c', s => {
  if (++calls === 1) hook = async q => { if (q.startsWith('UPDATE kv')) { hook = null; await s2.update('c', t => t + '|B'); } };
  return s + '|A';
});
ok(r1 === true && calls === 2 && await s1.get('c') === '2|B|A', 'write landing between read and write -> retried, both changes kept: ' + await s1.get('c'));
hook = async q => { if (q.startsWith('UPDATE kv SET v = ?')) sql.prepare('UPDATE kv SET ver = ver + 1 WHERE k = ?').run('c'); };
let thrown = ''; try { await update(s1, 'c', s => s + '!'); } catch (e) { thrown = e.message; }
hook = null;
ok(thrown === 'busy' && await s1.get('c') === '2|B|A', 'three lost races -> throws busy, nothing written');
{ const big = await Promise.all(Array.from({ length: 10 }, () => update(s1, 'n', s => String((+s || 0) + 1)).then(() => 1, e => e.message)));
  ok(await s1.get('n') === '10', `10 update() at once on one key -> counter ${await s1.get('n')} (results ${JSON.stringify(big)})`); }

const live = await imp('live.js'), scores = await imp('scores.js');
await call(live, '/api/live', { a: 'start', sid: 'abc123xyz' }, { ip: '50.0.0.1' });
ok(!!sql.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'tix_ip'").get(), 'tix_ip index exists after a ticket');

// ---- 2. scores.js ----
function fnv(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
const canon = e => [e.name, e.village, e.rankK, e.clsId, e.form, e.floor, e.won ? 1 : 0, e.title, e.score, e.karma, e.gen, e.ach, e.date].join('|');
let seq = 0;
function entry(o) {
  const e = Object.assign({ name: 'ทดสอบ' + (++seq), village: 'หมู่บ้าน', rankK: 'B', clsId: 'war', clsN: 'นักรบ', form: 'human', floor: 37, won: false, title: 'ผู้ทดสอบ',
    score: 60, karma: 5, gen: 1, ach: 3, date: Date.now(), v: 'tof-1', dh: 0 }, o);
  e.h = fnv('tof-v1|' + canon(e));
  return e;
}
const ticket = async ip => (await call(live, '/api/live', { a: 'start', sid: 'abc123xyz' }, { ip })).j.tk;
const clearLists = () => sql.prepare("DELETE FROM kv WHERE k IN ('top', 'recent', 'hof', 'live')").run();
const S = (body, ip, tok) => call(scores, '/api/scores', body, { ip, tok });

console.log('scores.js');
clearLists();
{ const ips = Array.from({ length: 10 }, (_, i) => '60.0.0.' + i);
  const tks = []; for (const ip of ips) tks.push(await ticket(ip));
  off += 600e3;
  const bodies = ips.map((ip, i) => ({ ...entry({ score: 40 + i }), tk: tks[i] }));
  const rs = await Promise.all(bodies.map((b, i) => S(b, ips[i])));
  const recent = kvGet('recent') || [], top = kvGet('top') || [];
  ok(rs.every(r => r.st === 200 && r.j.v === 1), '10 ticketed scores at once all accepted ok:1: ' + sts(rs) + (rs.find(r => r.err) ? ' ' + rs.find(r => r.err).err : ''));
  ok(bodies.every(b => recent.some(y => y.name === b.name)), `none lost from recent (${count(bodies, b => recent.some(y => y.name === b.name))}/10)`);
  ok(bodies.every(b => top.some(y => y.name === b.name)), `none lost from top (${count(bodies, b => top.some(y => y.name === b.name))}/10)`);
  const again = await S(bodies[0], ips[0]);
  ok(again.j.dup === true, 'same ticket posted again is a dup');
}
clearLists();
{ const A = '61.0.0.1', B = '61.0.0.2', scs = [20, 70, 40, 90, 55], tA = [], tB = [];
  for (const _ of scs) tA.push(await ticket(A));
  for (let i = 0; i < 2; i++) tB.push(await ticket(B));
  off += 600e3;
  const bA = scs.map((sc, i) => ({ ...entry({ score: sc }), tk: tA[i] })), bB = [10, 15].map((sc, i) => ({ ...entry({ score: sc }), tk: tB[i] }));
  for (const b of bA) await S(b, A);
  for (const b of bB) await S(b, B);
  const top = kvGet('top') || [], namesA = top.filter(y => bA.some(b => b.name === y.name)).map(y => y.score).sort((a, b) => b - a);
  ok(JSON.stringify(namesA) === '[90,70,55]', 'one IP keeps only its 3 best in top: ' + JSON.stringify(namesA));
  ok(bB.every(b => top.some(y => y.name === b.name)), 'another IP unaffected (both its rows in top)');
  const g = await call(scores, '/api/scores');
  ok(g.j.top.length > 0 && g.j.top.every(y => !('ip' in y)) && g.j.recent.every(y => !('ip' in y)), 'GET top/recent carry no ip');
}
// admin delete
const acctM = await imp('acct.js');
const AC = (b, o, env = ENV) => call(acctM, '/api/acct', b, o, env);
const tBoss = (await AC({ a: 'signup', name: 'boss1', pw: 'password1' }, { ip: '62.0.0.1' })).j.tok;
const tPleb = (await AC({ a: 'signup', name: 'pleb1', pw: 'password1' }, { ip: '62.0.0.2' })).j.tok;
{ const tk = await ticket('62.0.0.9'); off += 1800e3;
  const win = { ...entry({ floor: 100, won: true, score: 190 }), tk };
  const r = await S(win, '62.0.0.9');
  ok(r.j.v === 1 && r.j.hof === 1, 'won run reaches top + hof');
  const h = await call(scores, '/api/scores?hof=1');
  ok(h.j.hof.length > 0 && h.j.hof.every(y => !('ip' in y)), '?hof=1 carries no ip');
  const id = r.j.id, envA = { ...ENV, ADMIN_NAMES: 'someone, Boss1' }, D = (tok, env) => call(scores, '/api/scores', { a: 'del', id }, { tok }, env);
  ok((await D(undefined, envA)).st === 403, 'del without token -> 403');
  ok((await D(tPleb, envA)).st === 403, 'del by a non-admin account -> 403');
  ok((await D(tBoss, ENV)).st === 403, 'ADMIN_NAMES unset -> nobody is admin');
  const d = await D(tBoss, envA);
  ok(d.st === 200 && d.j.n === 3, 'admin (name in ADMIN_NAMES, any case) deletes: ' + JSON.stringify(d.j));
  ok(!['top', 'recent', 'hof'].some(k => (kvGet(k) || []).some(y => y.id === id)), 'row gone from top, recent and hof');
}
// KV ticket 'tk:<id>' (from before the D1 cut) posted twice at once
{ const tk = 'f'.repeat(20);
  await s1.put('tk:' + tk, JSON.stringify({ t0: Date.now() - 600e3 }));
  const rs = await Promise.all([S({ ...entry(), tk }, '63.0.0.1'), S({ ...entry(), tk }, '63.0.0.2')]);
  ok(count(rs, r => r.st === 200 && !r.j.dup) === 1 && count(rs, r => r.j.dup) === 1, 'same KV ticket twice at once -> one counted: ' + JSON.stringify(rs.map(r => r.j.dup ? 'dup' : r.st)));
}
// no ticket: RL_MAX 10 per IP per 10 min
{ const rs = await Promise.all(Array.from({ length: 20 }, () => S(entry(), '64.0.0.1')));
  ok(count(rs, r => r.st === 429) === 10, '20 unticketed posts at once from one IP -> exactly 10 limited: ' + sts(rs));
  ok(count(rs, r => r.st === 200) === 10, 'and the other 10 all stored');
  ok((await S(entry(), '64.0.0.2')).st === 200, 'another IP still posts');
}

// day stats only for today or yesterday (Thai time): a made-up later day cannot push today out of the 3 kept
{ const thd = t => new Date(t + 7 * 3600e3).toISOString().slice(0, 10), today = thd(Date.now());
  for (const k of [1, 2, 3]) {
    const d = thd(Date.now() + k * 86400e3), r = await S({ ...entry(), day: d }, '65.0.0.' + k);
    ok(r.st === 200 && r.j.day === null, 'score with day ' + d + ' (future) -> stored, day not counted');
  }
  const r = await S({ ...entry(), day: today }, '65.0.0.9');
  ok(r.j.day && r.j.day.n >= 1, 'score with today -> counted');
  const v = kvGet('live');
  ok(v && v.d[today] && Object.keys(v.d).every(k => k <= today), 'live keeps today and no future day: ' + Object.keys(v && v.d || {}).join(','));
}
// a list write that fails gives the ticket back, so the retry is stored instead of being a dup
{ const tk = await ticket('66.0.0.1'); off += 600e3;
  const b = { ...entry({ score: 61 }), tk };
  hook = async q => { if (/^(UPDATE kv SET v|INSERT INTO kv)/.test(q)) throw new Error('busy'); };
  const r1 = await S(b, '66.0.0.1');
  hook = null;
  ok(r1.st === 503, 'storage busy while writing lists -> 503: ' + r1.st);
  const r2 = await S(b, '66.0.0.1');
  ok(r2.st === 200 && !r2.j.dup && r2.j.v === 1 && (kvGet('recent') || []).some(y => y.id === r2.j.id), 'retry with the same ticket is stored (not a dup)');
  ok((await S(b, '66.0.0.1')).j.dup === true, 'and a third post is a dup again');
}

// ---- 3. live.js {a:'ss'} ----
console.log('live.js share counters');
clearLists();
{ const L = [];
  for (let i = 0; i < 20; i++) L.push(await call(live, '/api/live', { a: 'ss', ss: { x: 1 } }, { ip: '70.0.0.1' }));
  ok(L.every(r => r.st === 200), '20 share posts from one IP accepted: ' + sts(L));
  const rows = () => sql.prepare('SELECT (SELECT COUNT(*) FROM acct_lim) + (SELECT COUNT(*) FROM kv) AS n').get().n;
  const n0 = rows(), more = [await call(live, '/api/live', { a: 'ss', ss: { x: 1 } }, { ip: '70.0.0.1' })], w = writes();
  for (let i = 0; i < 9; i++) more.push(await call(live, '/api/live', { a: 'ss', ss: { x: 1 } }, { ip: '70.0.0.1' }));
  ok(more.every(r => r.st === 429), '21st..30th -> 429');
  ok(rows() === n0, '21st..30th add no row');
  ok(writes() === w, `22nd..30th change nothing (the 21st only bumps its own counter past the limit; rows changed after it: ${writes() - w})`);
  clearLists();
  const rs = await Promise.all(Array.from({ length: 10 }, (_, i) => call(live, '/api/live', { a: 'ss', ss: { x: 2, copy: 1 } }, { ip: '71.0.0.' + i })));
  const v = kvGet('live'), d = v && Object.values(v.d)[0], ss = d && d.ss || {};
  ok(rs.every(r => r.st === 200), '10 share posts at once all accepted: ' + sts(rs) + (rs.find(r => r.err) ? ' ' + rs.find(r => r.err).err : ''));
  ok(ss.x === 20 && ss.copy === 10, 'none lost in live: ' + JSON.stringify(ss));
}

// ---- 4. posts.js ----
console.log('posts.js');
const posts = await imp('posts.js');
const P = (b, ip) => call(posts, '/api/posts', b, { ip });
const sum = { n: 'ฮีโร่', r: 'B', c: 'war', f: 20, w: 0 };
{ const p0 = await P({ a: 'post', s: sum, q: 'ขอให้โชคดีนะทุกคน' }, '80.0.0.1');
  const id = p0.j.post && p0.j.post.id;
  ok(p0.st === 200 && !!id, 'post accepted');
  const rs = await Promise.all(Array.from({ length: 12 }, (_, i) => P({ a: 'react', id }, '81.0.0.' + i)));
  const p = (kvGet('posts').p || []).find(x => x.id === id);
  ok(rs.every(r => r.st === 200) && p.rm === 12, `12 reacts at once from 12 IPs -> rm ${p.rm}: ` + sts(rs));
  const w = writes(), d = await P({ a: 'react', id }, '81.0.0.0');
  ok(d.j.dup === true && writes() === w, 'repeat react from same IP is a dup with no write');
  const ps = await Promise.all(Array.from({ length: 8 }, (_, i) => P({ a: 'post', s: { ...sum, f: 30 + i }, q: 'ทางนี้ยากจริง ' + i }, '82.0.0.' + i)));
  const have = kvGet('posts').p.length;
  ok(ps.every(r => r.st === 200) && have === 9, `8 posts at once all kept (${have - 1}/8): ` + sts(ps));
}

// ---- 5. move.js ----
console.log('move.js');
const move = await imp('move.js');
const M = (b, ip) => call(move, '/api/move', b, { ip });
{ const put = await M({ a: 'put', p: JSON.stringify({ 'tof-meta-v1': '{}' }), m: { keys: 1 } }, '90.0.0.1');
  ok(put.st === 200 && !!put.j.code, 'put gives a code');
  const rs = await Promise.all([M({ a: 'take', code: put.j.code }, '90.0.0.2'), M({ a: 'take', code: put.j.code }, '90.0.0.3')]);
  ok(count(rs, r => r.st === 200 && typeof r.j.p === 'string') === 1 && count(rs, r => r.st === 410 && r.j.error === 'used') === 1, 'two takes at once -> one save, one 410 used: ' + sts(rs));
  ok((await M({ a: 'peek', code: put.j.code }, '90.0.0.4')).st === 410, 'peek after take -> 410');
  const thai = n => '{' + 'ก'.repeat(n - 1);
  const big = await M({ a: 'put', p: thai(MAX_SAVE + 1) }, '90.0.0.5');
  ok(big.st === 413 && big.j.error === 'too-large', 'put one char over MAX_SAVE -> 413');
  ok((await M({ a: 'put', p: thai(MAX_SAVE) }, '90.0.0.5')).st === 200, 'put of MAX_SAVE Thai chars (1.2 MB UTF-8) accepted');
  const pr = await Promise.all(Array.from({ length: 20 }, () => M({ a: 'put', p: '{}' }, '91.0.0.1')));
  ok(count(pr, r => r.st === 200) === 6, '20 puts at once from one IP -> 6 codes: ' + sts(pr));
  off += 2 * 3600e3;
  ok((await M({ a: 'put', p: '{}' }, '91.0.0.1')).st === 429, 'put limit lasts a day, not an hour');
  off += 23 * 3600e3;
  ok((await M({ a: 'put', p: '{}' }, '91.0.0.1')).st === 200, 'and opens again the next day');
  const gr = await Promise.all(Array.from({ length: 40 }, (_, i) => M({ a: i % 2 ? 'take' : 'peek', code: 'zzzzzzzzz' }, '92.0.0.1')));
  ok(count(gr, r => r.st !== 429) === 30, '40 peeks/takes at once from one IP -> 30 checked: ' + sts(gr));
}

// ---- 6. acct.js / acctlib.js / checkout ----
console.log('acct.js');
{ const tok = (await AC({ a: 'signup', name: 'saver1', pw: 'password1' }, { ip: '100.0.0.1' })).j.tok;
  const thai = n => '{' + 'ก'.repeat(n - 1);
  const big = await AC({ a: 'save', z: '', p: thai(MAX_SAVE + 1), m: {} }, { tok });
  ok(big.st === 413 && big.j.error === 'too-large', 'cloud save one char over MAX_SAVE -> 413');
  ok((await AC({ a: 'save', z: '', p: thai(MAX_SAVE), m: {} }, { tok })).st === 200, 'cloud save of MAX_SAVE Thai chars accepted');
  const su = await Promise.all(Array.from({ length: 20 }, (_, i) => AC({ a: 'signup', name: 'flood' + i, pw: 'password1' }, { ip: '101.0.0.1' })));
  ok(count(su, r => r.st === 200) === 5, '20 sign-ups at once from one IP -> 5 accounts: ' + sts(su));
  off += 3 * 3600e3;
  ok((await AC({ a: 'signup', name: 'flood99', pw: 'password1' }, { ip: '101.0.0.1' })).st === 429, 'sign-up limit lasts a day, not an hour');
  off += 22 * 3600e3;
  ok((await AC({ a: 'signup', name: 'flood98', pw: 'password1' }, { ip: '101.0.0.1' })).st === 200, 'and opens again the next day');
  const v6 = await Promise.all(Array.from({ length: 8 }, (_, i) => AC({ a: 'signup', name: 'sixer' + i, pw: 'password1' }, { ip: '2001:db8:aa:bb:' + i + '::' + (i + 1) })));
  ok(count(v6, r => r.st === 200) === 5, '8 sign-ups from 8 IPv6 addresses in one /64 -> 5 accounts: ' + sts(v6));
  ok((await AC({ a: 'signup', name: 'sixer9', pw: 'password1' }, { ip: '2001:db8:aa:bc::1' })).st === 200, 'the next /64 is a different IP');

  // per-IP login count goes first: an IP over it adds no rows, whatever names it tries
  const lim = () => sql.prepare('SELECT COUNT(*) AS n FROM acct_lim').get().n;
  for (let i = 0; i < 40; i++) await AC({ a: 'login', name: 'rnd' + i, pw: 'wrongpass' }, { ip: '110.0.0.1' });
  const n0 = lim(), w1 = writes(), over = [];
  for (let i = 40; i < 50; i++) over.push(await AC({ a: 'login', name: 'rnd' + i, pw: 'wrongpass' }, { ip: '110.0.0.1' }));
  ok(over.every(r => r.st === 429), '41st..50th login from one IP -> 429: ' + sts(over));
  ok(lim() === n0 && writes() - w1 <= 1, `and no new rows for new names (rows +${lim() - n0}, changes ${writes() - w1})`);

  await AC({ a: 'signup', name: 'victim1', pw: 'password1' }, { ip: '102.0.0.1' });
  const L = (pw, ip, name = 'victim1') => AC({ a: 'login', name, pw }, { ip });
  const wr = []; for (let i = 0; i < 9; i++) wr.push(await L('wrongpass', '103.0.0.1'));
  ok(count(wr, r => r.st === 401) === 8 && wr[8].st === 429, 'wrong password: 8 per name+IP, 9th 429');
  ok((await L('password1', '103.0.0.2')).st === 200, 'a different IP can still log in');
  const rt = []; for (let i = 0; i < 7; i++) await L('wrongpass', '104.0.0.1');
  for (let i = 0; i < 15; i++) rt.push(await L('password1', '104.0.0.1'));
  ok(rt.every(r => r.st === 200), '7 wrong then 15 right logins from one IP: none blocked: ' + sts(rt));
  await AC({ a: 'signup', name: 'target1', pw: 'password1' }, { ip: '105.0.0.1' });
  let n401 = 0;
  for (let i = 0; i < 200; i++) if ((await L('wrongpass', '106.' + (i >> 3) + '.0.1', 'target1')).st === 401) n401++;
  const last = await L('password1', '107.0.0.1', 'target1');
  ok(n401 === 200 && last.st === 429, `200 wrong passwords from 25 IPs -> name capped (${n401} checked, then ${last.st})`);

  const pt = (await AC({ a: 'signup', name: 'pwuser1', pw: 'password1' }, { ip: '108.0.0.1' })).j.tok;
  const pw = []; for (let i = 0; i < 9; i++) pw.push(await AC({ a: 'passwd', pw: 'wrongpass', npw: 'newpass99' }, { tok: pt }));
  ok(count(pw, r => r.st === 401) === 8 && pw[8].st === 429, 'passwd: 8 wrong, 9th 429');
  ok((await AC({ a: 'passwd', pw: 'password1', npw: 'newpass99' }, { tok: pt })).st === 429, 'passwd: right password also waits once limited');

  const co = await imp('pay/checkout.js');
  globalThis.fetch = async () => new Response(JSON.stringify({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }), { status: 200 });
  const envS = { ...ENV, STRIPE_SECRET_KEY: 'sk_test_dummy', STRIPE_WEBHOOK_SECRET: 'whsec_dummy' };
  const bt = (await AC({ a: 'signup', name: 'buyer1', pw: 'password1' }, { ip: '109.0.0.1' })).j.tok;
  const bs = await Promise.all(Array.from({ length: 30 }, () => call(co, '/api/pay/checkout', { sku: 'gold_s' }, { tok: bt }, envS)));
  ok(count(bs, r => r.st === 200) === 20 && count(bs, r => r.st === 429) === 10, '30 checkouts at once -> 20 pages: ' + sts(bs));
}

// ---- 7. memorial.js random ----
console.log('memorial.js random');
const memo = await imp('memorial.js');
const R = async (not = '') => call(memo, '/api/memorial?random=1' + (not ? '&not=' + not : ''));
ok((await R()).j.error === 'empty', 'no memorials -> 404 empty');
const addM = (id, hid = 0) => sql.prepare("INSERT INTO memorial (id, at, dk, d, hid) VALUES (?, 0, 'x', '{}', ?)").run(id, hid);
addM('ggggggggg');
ok((await R('ggggggggg')).st === 404, 'one memorial, not = it -> 404');
addM('ppppppppp'); addM('xxxxxxxxx'); addM('222222222'); addM('mmmmmmmmm', 1); addM('ttttttttt', 1);
{ const seen = {}; let bad = 0;
  for (let i = 0; i < 300; i++) { const r = await R('xxxxxxxxx'); if (r.st !== 200) bad++; else seen[r.j.id] = (seen[r.j.id] | 0) + 1; }
  ok(!bad && !seen.mmmmmmmmm && !seen.ttttttttt, 'never a hidden one');
  ok(!seen.xxxxxxxxx, 'never the not id');
  ok(seen.ggggggggg && seen.ppppppppp && seen['222222222'], 'every other visible row comes up: ' + JSON.stringify(seen));
}

// ---- 8. util.clean / cleanMemo ----
console.log('util.ipHash');
{ const H = ip => ipHash(new Request(ORIGIN, { headers: { 'CF-Connecting-IP': ip } }), 'ac|');
  ok(H('1.2.3.4') === fnv('ac|1.2.3.4'), 'IPv4: same hash as before (salt + address)');
  ok(ipHash(new Request(ORIGIN), 'm|') === fnv('m|unknown'), 'no IP header: same as before');
  const a = H('2001:db8:1:2::1');
  ok(a === H('2001:0db8:0001:0002:ffff:ffff:ffff:ffff') && a === H('2001:DB8:1:2:0:0:0:9'), 'IPv6: any address in one /64 -> one hash');
  ok(a === fnv('ac|2001:db8:1:2'), 'IPv6 key is the first 4 groups without leading zeros');
  ok(a !== H('2001:db8:1:3::1') && a !== H('2001:db8::1:2:0:1'), 'another /64 -> another hash');
  ok(H('::1') === fnv('ac|0:0:0:0') && H('2001:db8::') === fnv('ac|2001:db8:0:0'), ':: at either end expands');
  ok(H('::ffff:1.2.3.4') !== H('::ffff:1.2.3.5'), 'IPv4 written inside IPv6 stays whole');
}
console.log('memorial counters');
{ addM('ccccccccc');
  const candle = await imp('candle.js'), C = ip => call(candle, '/api/candle', { id: 'ccccccccc' }, { ip });
  const L = []; for (let i = 0; i < 60; i++) L.push(await C('111.0.0.1'));
  ok(L.filter(r => r.st === 200 && !r.j.dup).length === 1 && L.every(r => r.st === 200), 'one candle per IP per day, 60 actions allowed: ' + sts(L));
  const w = writes(), more = [];
  for (let i = 0; i < 10; i++) more.push(await C('111.0.0.1'));
  ok(more.every(r => r.st === 429), '61st..70th action -> 429');
  ok(writes() - w <= 1, `and they write nothing past the limit (changes ${writes() - w})`);
}

console.log('util.clean');
const { clean } = await imp('util.js');
ok(clean(1234, 10, 1) === '1234', 'clean(number, max, 1) accepts a number');
ok(clean(1234, 10) === '', 'clean(number, max) does not');
{ const d = memo.cleanMemo({ ck: 'war', rk: 2, f: 10, fr: [{ k: 'b', f: 3 }], lk: { form: 'slime', seed: 987654 } });
  ok(d && d.lk.seed === 987654, 'cleanMemo keeps a numeric seed');
  const d2 = memo.cleanMemo({ ck: 'war', rk: 2, f: 10, fr: [{ k: 'b', f: 3 }], lk: { seed: 'abc<b>' } });
  ok(d2 && d2.lk.seed === 'abc', 'cleanMemo still cleans a string seed');
}

// ---- 9. v0.3.5.10 server pass ----
console.log('error paths answer JSON');
{ hook = async q => { if (/kv/.test(q)) throw new Error('D1 down'); };
  const r1 = await P({ a: 'post', s: sum, q: 'ทดสอบตอนฐานข้อมูลล่ม' }, '120.0.0.1');
  const r2 = await call(live, '/api/live', { a: 'ss', ss: { x: 1 } }, { ip: '120.0.0.2' });
  hook = null;
  ok(r1.st === 503 && r1.j.error === 'busy', 'posts: storage failure -> 503 busy, not a crash: ' + r1.st);
  ok(r2.st === 503 && r2.j.error === 'busy', 'live ss: storage failure -> 503 busy: ' + r2.st);
  hook = async q => { if (/acct_lim/.test(q)) throw new Error('D1 down'); };
  const r3 = await S(entry(), '120.0.0.3');
  hook = null;
  ok(r3.st === 503 && r3.j.error === 'busy', 'scores without ticket: limiter failure -> 503 busy: ' + r3.st);
}
console.log('sign-up with a taken name');
{ await AC({ a: 'signup', name: 'taken1', pw: 'password1' }, { ip: '121.0.0.1' });
  const t = []; for (let i = 0; i < 6; i++) t.push(await AC({ a: 'signup', name: 'TAKEN1', pw: 'password1' }, { ip: '121.0.0.2' }));
  ok(t.every(r => r.st === 409), '6 tries of a taken name -> 409 each: ' + sts(t));
  ok((await AC({ a: 'signup', name: 'fresh1', pw: 'password1' }, { ip: '121.0.0.2' })).st === 200, 'and the IP can still sign up (taken names do not use the day limit)');
}
console.log('indexes for the sweeps');
ok(['acct_lim_exp', 'acct_sess_exp'].every(n => sql.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?").get(n)), 'acct_lim and acct_sess have an exp index');
console.log('pay');
{ const envS = { ...ENV, STRIPE_SECRET_KEY: 'sk_test_dummy', STRIPE_WEBHOOK_SECRET: 'whsec_dummy' };
  const co = await imp('pay/checkout.js'), wh = await imp('pay/webhook.js'), log = console.log;
  const bt = (await AC({ a: 'signup', name: 'buyer2', pw: 'password1' }, { ip: '122.0.0.1' })).j.tok;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'Invalid API Key provided: sk_live_****abcd' } }), { status: 401 });
  console.log = () => { };
  const r = await call(co, '/api/pay/checkout', { sku: 'gold_s' }, { tok: bt }, envS);
  console.log = log;
  ok(r.st === 502 && !JSON.stringify(r.j).includes('sk_'), 'checkout: Stripe error text is not sent to the player: ' + JSON.stringify(r.j));
  const pay = async (sku, id) => {
    const raw = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id, payment_status: 'paid', currency: 'thb', amount_total: 999999, metadata: { sku, uid: '1' } } } });
    const t = Math.floor(Date.now() / 1000), k = await crypto.subtle.importKey('raw', new TextEncoder().encode('whsec_dummy'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(t + '.' + raw)))].map(b => b.toString(16).padStart(2, '0')).join('');
    console.log = () => { };
    const res = await wh.onRequestPost({ request: new Request(ORIGIN + '/api/pay/webhook', { method: 'POST', headers: { 'Stripe-Signature': `t=${t},v1=${sig}` }, body: raw }), env: envS });
    console.log = log;
    return { st: res.status, j: await res.json(), row: sql.prepare('SELECT sku FROM ent WHERE id = ?').get(id) };
  };
  const good = await pay('gold_s', 'cs_ok_1');
  ok(good.st === 200 && good.row && good.row.sku === 'gold_s', 'webhook: signed paid session for a real sku -> granted');
  const bad = await Promise.all(['constructor', 'toString', '__proto__'].map((s, i) => pay(s, 'cs_bad_' + i)));
  ok(bad.every(x => x.st === 200 && x.j.skip === 'unknown' && !x.row), 'webhook: sku from Object.prototype -> nothing granted');
}

console.log(fails ? `\n${passes} passed, ${fails} failed` : `\nall ${passes} passed`);
process.exit(fails ? 1 : 0);
