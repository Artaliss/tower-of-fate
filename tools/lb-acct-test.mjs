// Account name on leaderboard rows (field 'ac', v0.3.5): /api/acct + /api/live + /api/scores on one real SQLite (node:sqlite, Node 22.5+) dressed up as D1.
// Usage: node tools/lb-acct-test.mjs   (exits 1 if a check fails)
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const imp = f => import(pathToFileURL(path.join(root, f)).href);
const acct = await imp('functions/api/acct.js'), live = await imp('functions/api/live.js'), scores = await imp('functions/api/scores.js');

let off = 0; const realNow = Date.now.bind(Date); Date.now = () => realNow() + off;
const sql = new DatabaseSync(':memory:');
sql.exec(fs.readFileSync(path.join(root, 'migrations/0003_account.sql'), 'utf8'));
let writes = 0;
const D1 = {
  async batch(L) { const out = []; for (const st of L) out.push(await st.run()); return out; },
  prepare(q) {
    let args = [];
    const s = {
      bind(...a) { args = a; return s; },
      async first() { return sql.prepare(q).get(...args) || null; },
      async all() { return { results: sql.prepare(q).all(...args) }; },
      async run() { const r = sql.prepare(q).run(...args); if (!/^\s*CREATE/i.test(q)) writes += Number(r.changes); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    };
    return s;
  },
};
const env = { TOF_DB: D1 };

const ORIGIN = 'https://tower-of-fate.pages.dev';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
const req = (url, body, tok, ip = '1.2.3.4') => new Request(ORIGIN + url, { method: body ? 'POST' : 'GET',
  headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip, ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
const call = async (mod, url, body, tok, ip) => { const r = await (body ? mod.onRequestPost : mod.onRequestGet)({ request: req(url, body, tok, ip), env }); return { st: r.status, j: await r.json() }; };

function fnv(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
const canon = e => [e.name, e.village, e.rankK, e.clsId, e.form, e.floor, e.won ? 1 : 0, e.title, e.score, e.karma, e.gen, e.ach, e.date].join('|');
let seq = 0;
const DV = 'a1b2c3d4e5f60718';
async function run(tok, o = {}, ip = '5.5.5.' + (++seq)) {
  const t = await call(live, '/api/live', { a: 'start', sid: 'abc123xyz', dv: DV }, tok, ip);
  off += 1800e3;
  const e = Object.assign({ name: 'ฮีโร่' + seq, village: 'หมู่บ้าน', rankK: 'B', clsId: 'war', clsN: 'นักรบ', form: 'human', floor: 100, won: true, title: '',
    score: 180, karma: 0, gen: 1, ach: 1, date: Date.now(), v: 'tof-1', tk: t.j.tk, dv: DV }, o);
  e.h = fnv('tof-v1|' + canon(e));
  const w0 = writes, r = await call(scores, '/api/scores', e, tok, ip);
  return { r, w: writes - w0, id: r.j.id };
}
const rows = async () => { const a = await call(scores, '/api/scores'), h = await call(scores, '/api/scores?hof=1'); return { top: a.j.top, recent: a.j.recent, hof: h.j.hof }; };
const acOf = (L, id) => (L.find(x => x.id === id) || {}).ac;

// accounts
const su = await call(acct, '/api/acct', { a: 'signup', name: 'ผู้เล่น_1', pw: 'password1' });
ok(su.j.ok && su.j.tok, 'signup');
const tok = su.j.tok;

console.log('score with a live session');
let x = await run(tok);
ok(x.r.j.ok && x.r.j.v === 1 && x.r.j.hof === 1, 'accepted, ok:1, hof:1');
let R = await rows();
ok(acOf(R.top, x.id) === 'ผู้เล่น_1' && acOf(R.recent, x.id) === 'ผู้เล่น_1' && acOf(R.hof, x.id) === 'ผู้เล่น_1', "ac = account name in top, recent and hof");
const wSess = x.w;

console.log('spoofed name in the body');
x = await run(tok, { ac: 'แอดมิน' });
R = await rows();
ok(acOf(R.recent, x.id) === 'ผู้เล่น_1', 'body ac ignored, server name used');
x = await run(null, { ac: 'แอดมิน' });
R = await rows();
ok(x.r.j.ok && acOf(R.recent, x.id) === undefined && acOf(R.hof, x.id) === undefined, 'no session + body ac -> no ac');
const wNone = x.w;
ok(wSess === wNone, `same writes with and without a session (${wSess} vs ${wNone})`);

console.log('bad or expired session');
x = await run('A'.repeat(43));
R = await rows();
ok(x.r.j.ok && x.r.j.v === 1 && acOf(R.recent, x.id) === undefined, 'unknown token -> accepted, no ac');
x = await run('not a token');
R = await rows();
ok(x.r.j.ok && acOf(R.recent, x.id) === undefined, 'malformed header -> accepted, no ac');
sql.prepare('UPDATE acct_sess SET exp = ?').run(Date.now() - 1);
x = await run(tok);
R = await rows();
ok(x.r.j.ok && x.r.j.v === 1 && acOf(R.recent, x.id) === undefined, 'expired session -> accepted, no ac');

console.log('no account tables yet');
{ const sql2 = new DatabaseSync(':memory:'); sql2.exec('CREATE TABLE kv (k TEXT PRIMARY KEY, v TEXT NOT NULL, exp INTEGER)');   // store.js creates kv once per module, not per db
  const db2 = { prepare(q) { let a = []; const s = { bind(...b) { a = b; return s; }, async first() { return sql2.prepare(q).get(...a) || null; }, async all() { return { results: sql2.prepare(q).all(...a) }; }, async run() { const r = sql2.prepare(q).run(...a); return { meta: { changes: Number(r.changes) } }; } }; return s; } };
  const e = { name: 'ไร้บัญชี', village: '', rankK: 'B', clsId: 'war', clsN: '', form: 'human', floor: 3, won: false, title: '', score: 5, karma: 0, gen: 1, ach: 0, date: Date.now(), v: 'tof-1' };
  e.h = fnv('tof-v1|' + canon(e));
  const r = await scores.onRequestPost({ request: req('/api/scores', e, tok), env: { TOF_DB: db2 } }); const j = await r.json();
  ok(r.status === 200 && j.ok, 'acct table missing -> score still accepted'); }

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
