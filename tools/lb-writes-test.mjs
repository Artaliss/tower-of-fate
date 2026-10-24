// Counts storage writes per run for /api/live + /api/scores against a mock D1 (old KV bound too, for read-through).
// Usage: node tools/lb-writes-test.mjs [functionsApiDir=functions/api]
// The mock understands only the SQL these functions send. "writes" = rows inserted/updated/deleted by the request itself;
// "D1 rows~" = what D1 would bill, assuming an upsert into kv (rowid table + primary-key index) is 2 rows and a tix row 1.
// "+sweep" adds the rows that a later cleanup will delete (expiring kv rows and ticket rows), since D1 bills those deletes too.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = path.resolve(process.argv[2] || 'functions/api');
const imp = f => import(pathToFileURL(path.join(dir, f)).href);
const live = await imp('live.js'), scores = await imp('scores.js');

// ---- clock ----
let off = 0; const realNow = Date.now.bind(Date); Date.now = () => realNow() + off;
const wait = ms => { off += ms; };
Math.random = () => 0.5;   // no random sweeps inside a request

// ---- mock D1 ----
function mockD1() {
  const T = { kv: new Map(), tix: new Map(), lim: new Map() };
  const st = { w: 0, r: 0, sweepable: 0, d1: 0 };
  const run = (sql, a) => {
    const s = sql.replace(/\s+/g, ' ').trim();
    let m;
    if (/^(CREATE|ALTER) /i.test(s)) return { meta: { changes: 0 } };
    if (s.startsWith('SELECT v, exp')) { st.r++; const x = T.kv.get(a[0]); return { row: x ? { v: x.v, exp: x.exp, ver: x.ver | 0 } : null }; }
    if (s.startsWith('UPDATE kv SET v = ?, ver = ver + 1 WHERE k = ? AND ver = ?')) { const x = T.kv.get(a[1]); if (!x || (x.ver | 0) !== a[2]) return { meta: { changes: 0 } }; x.v = a[0]; x.ver = (x.ver | 0) + 1; st.w++; st.d1 += 2; return { meta: { changes: 1 } }; }
    if (s.startsWith('INSERT INTO kv') && s.includes('DO NOTHING')) { if (T.kv.has(a[0])) return { meta: { changes: 0 } }; T.kv.set(a[0], { v: a[1], exp: null, ver: 0 }); st.w++; st.d1 += 2; return { meta: { changes: 1 } }; }
    if (s.startsWith('INSERT INTO acct_lim')) { const x = T.lim.get(a[0]); if (x && x.exp > a[2] && x.n > a[5]) return { row: null }; const n = x && x.exp > a[2] ? x.n + 1 : 1; T.lim.set(a[0], { n, exp: x && x.exp > a[2] ? x.exp : a[1] }); st.w++; st.d1 += 2; if (!x) st.sweepable++; return { row: { n } }; }
    if (s.startsWith('INSERT INTO kv')) { const had = T.kv.has(a[0]); T.kv.set(a[0], { v: a[1], exp: a[2] }); st.w++; st.d1 += 2; if (!had && a[2]) st.sweepable++; return { meta: { changes: 1 } }; }
    if (s.startsWith('DELETE FROM kv')) { let n = 0; for (const [k, x] of T.kv) if (x.exp != null && x.exp < a[0]) { T.kv.delete(k); n++; } st.w += n; return { meta: { changes: n } }; }
    if (s.startsWith('INSERT INTO tix')) { T.tix.set(a[0] + ':' + a[1], { t: a[0], r: a[1], ip: a[2], dv: a[3], u: 0 }); st.w++; st.d1++; st.sweepable++; return { meta: { changes: 1 } }; }
    if (s.startsWith('SELECT ip, dv, u FROM tix WHERE t = ? AND r = ?')) { st.r++; const x = T.tix.get(a[0] + ':' + a[1]); return { row: x ? { ip: x.ip, dv: x.dv, u: x.u } : null }; }
    if (s.startsWith('UPDATE tix SET u = 1 WHERE t = ? AND r = ? AND u = 0')) { const x = T.tix.get(a[0] + ':' + a[1]); if (x && x.u === 0) { x.u = 1; st.w++; st.d1++; return { meta: { changes: 1 } }; } return { meta: { changes: 0 } }; }
    if (s === 'SELECT COUNT(*) AS n FROM tix WHERE t > ? AND u = 0') { let n = 0; for (const x of T.tix.values()) if (x.t > a[0] && x.u === 0) n++; st.r += n; return { row: { n } }; }
    if (s === 'SELECT COUNT(*) AS n FROM tix WHERE ip = ? AND t > ?') { let n = 0; for (const x of T.tix.values()) if (x.ip === a[0] && x.t > a[1]) n++; st.r += n; return { row: { n } }; }
    if (s.startsWith('DELETE FROM tix WHERE t < ?')) { let n = 0; for (const [k, x] of T.tix) if (x.t < a[0]) { T.tix.delete(k); n++; } st.w += n; return { meta: { changes: n } }; }
    throw new Error('mock D1: unknown SQL ' + s);
  };
  const db = {
    prepare(sql) {
      const mk = a => ({ bind: (...b) => mk(b), run: async () => run(sql, a), first: async () => (run(sql, a).row ?? null), all: async () => ({ results: [run(sql, a).row].filter(Boolean) }) });
      return mk([]);
    },
    async batch(L) { const out = []; for (const q of L) out.push(await q.run()); return out; },
  };
  return { db, st, T };
}
function mockKV() {
  const m = new Map(), st = { w: 0, r: 0, sweepable: 0 };
  return { st, kv: { async get(k) { st.r++; const x = m.get(k); return x && (!x.exp || x.exp > Date.now()) ? x.v : null; }, async put(k, v, o) { st.w++; m.set(k, { v: String(v), exp: o && o.expirationTtl ? Date.now() + o.expirationTtl * 1000 : null }); } } };
}

// ---- client side (same hash as leaderboard.js) ----
function fnv(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
const canon = e => [e.name, e.village, e.rankK, e.clsId, e.form, e.floor, e.won ? 1 : 0, e.title, e.score, e.karma, e.gen, e.ach, e.date].join('|');
let seq = 0;
function entry(o) {
  const e = Object.assign({ name: 'ทดสอบ' + (++seq), village: 'หมู่บ้าน', rankK: 'B', clsId: 'war', clsN: 'นักรบ', form: 'human', floor: 37, won: false, title: 'ผู้ทดสอบ',
    score: 60, karma: 5, gen: 1, ach: 3, date: Date.now(), v: 'tof-1', day: new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10), dh: 0 }, o);
  e.h = fnv('tof-v1|' + canon(e));
  return e;
}
const ORIGIN = 'https://tower-of-fate.pages.dev';
const req = (p, body, ip = '1.2.3.4') => new Request(ORIGIN + p, body === undefined ? { headers: { Origin: ORIGIN } } :
  { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify(body) });
const post = async (mod, p, body, env, ip) => { const r = await mod.onRequestPost({ request: req(p, body, ip), env }); return { s: r.status, j: await r.json() }; };
const get = async (mod, p, env) => { const r = await mod.onRequestGet({ request: req(p), env }); return { s: r.status, j: await r.json() }; };

function freshEnv() {
  const kv = mockKV();
  const d = mockD1();
  return { env: { TOF_DB: d.db, TOF_KV: kv.kv }, st: d.st, T: d.T };
}
const DV = 'a1b2c3d4e5f60718';
const SID = 'abc123xyz';

// one run: start ticket, `beats` heartbeats (old client: every 5.5 min), then the score
async function oneRun(E, { dv = DV, beats = 0, ticket = true, e = {}, ms = 600000, ip } = {}) {
  const w0 = E.st.w, s0 = E.st.sweepable, r0 = E.st.r, d0 = E.st.d1 || 0;
  let tk = '';
  if (ticket) { const a = await post(live, '/api/live', dv ? { a: 'start', sid: SID, dv } : { a: 'start', sid: SID }, E.env, ip); tk = a.j.tk || ''; }
  for (let i = 0; i < beats; i++) { wait(5.5 * 60e3); await post(live, '/api/live', { a: 'beat', sid: SID, f: 10 + i }, E.env, ip); }
  wait(Math.max(0, ms - beats * 5.5 * 60e3));
  const body = entry(e); if (tk) body.tk = tk; body.sid = SID; if (dv) body.dv = dv;
  const res = await post(scores, '/api/scores', body, E.env, ip);
  return { w: E.st.w - w0, sw: E.st.sweepable - s0, r: E.st.r - r0, d1: (E.st.d1 || 0) - d0, res, body };
}

const out = [];
const line = (name, x) => { out.push(`${name.padEnd(46)} writes ${String(x.w).padStart(2)}  +sweep ${String(x.w + x.sw).padStart(2)}  D1 rows~${String(x.d1 ?? '-').padStart(2)}  reads ${String(x.r).padStart(4)}  -> ${x.res.s} ok:${x.res.j.v} rank:${x.res.j.rank} hof:${x.res.j.hof ?? '-'}${x.res.j.dup ? ' dup' : ''}`); };

{ // warm-up so 'top' / 'recent' / 'live' rows already exist (counts below are for a steady state)
  var E = freshEnv();
  for (let i = 0; i < 3; i++) await oneRun(E, { ip: '9.9.9.' + i, e: { floor: 5, score: 8 } });
}
line('new client, lose floor 37 (not top)', await (async () => { const top = []; for (let i = 0; i < 100; i++) top.push({ id: 'x' + i, won: true, floor: 100, score: 9999, date: 1 }); await E.env.TOF_DB.prepare('INSERT INTO kv (k, v, exp) VALUES (?, ?, ?)').bind('top', JSON.stringify(top), null).run(); E.st.w -= 1; return oneRun(E, { ip: '1.1.1.1' }); })());
{ var E2 = freshEnv(); await oneRun(E2, { ip: '9.9.9.9', e: { floor: 3, score: 5 } }); }
line('new client, lose floor 37 (enters top)', await oneRun(E2, { ip: '1.1.1.2' }));
line('new client, win floor 100 (top + hof)', await oneRun(E2, { ip: '1.1.1.3', e: { floor: 100, won: true, score: 190 }, ms: 1800e3 }));
line('old client: start, 2 beats, lose floor 37', await oneRun(E2, { ip: '1.1.1.4', dv: '', beats: 2 }));
line('old client: start, 2 beats, win', await oneRun(E2, { ip: '1.1.1.5', dv: '', beats: 2, e: { floor: 100, won: true, score: 180 }, ms: 1800e3 }));
line('old client without ticket (ok:0)', await oneRun(E2, { ip: '1.1.1.6', ticket: false }));
{ const r = await oneRun(E2, { ip: '1.1.1.7' }); const w0 = E2.st.w; const again = await post(scores, '/api/scores', r.body, E2.env, '1.1.1.7');
  line('same ticket posted again', { w: E2.st.w - w0, sw: 0, r: 0, res: again }); }
out.push('-- anti-cheat (all should be ok:0, still in recent) --');
line('win posted 20 s after the ticket', await oneRun(E2, { ip: '2.2.2.1', e: { floor: 100, won: true, score: 190 }, ms: 20e3 }));
line('win with score 5000', await oneRun(E2, { ip: '2.2.2.2', e: { floor: 100, won: true, score: 5000 }, ms: 1800e3 }));
line('win with score 20', await oneRun(E2, { ip: '2.2.2.5', e: { floor: 100, won: true, score: 20 }, ms: 1800e3 }));
line('drg set below floor 100', await oneRun(E2, { ip: '2.2.2.3', e: { floor: 50, score: 80, drg: 'x' } }));
{ const a = await post(live, '/api/live', { a: 'start', sid: SID, dv: DV }, E2.env, '2.2.2.4'); wait(1800e3);
  const b = entry({ floor: 100, won: true, score: 190 }); b.tk = a.j.tk; b.dv = 'ffffffffffffffff'; const w0 = E2.st.w;
  const res = await post(scores, '/api/scores', b, E2.env, '2.2.2.4'); line('ticket used from another device id', { w: E2.st.w - w0, sw: 0, r: 0, res }); }
out.push('-- legit edge cases (should be ok:1) --');
line('win at 16x minimum time (29 s)', await oneRun(E2, { ip: '3.3.3.1', e: { floor: 100, won: true, score: 150 }, ms: 29e3 }));
line('floor 101 dragon friend', await oneRun(E2, { ip: '3.3.3.2', e: { floor: 101, won: true, score: 210, drg: 'f' }, ms: 1800e3 }));
line('floor 5, heavy bad karma, score 0', await oneRun(E2, { ip: '3.3.3.3', e: { floor: 5, score: 0, karma: -80 } }));
wait(60e3); await post(live, '/api/live', { a: 'start', sid: SID, dv: DV }, E2.env, '4.4.4.4'); await post(live, '/api/live', { a: 'start', sid: SID }, E2.env, '4.4.4.5');
out.push('-- two runs started, no score yet: n should be 2 --');
{ const g = await get(live, '/api/live?day=' + new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10), E2.env);
  out.push(`GET /api/live -> ${JSON.stringify(g.j)}`); }
{ const g = await get(scores, '/api/scores', E2.env); out.push(`GET /api/scores -> top ${g.j.top.length} recent ${g.j.recent.length}`); }
{ let got = 0; for (let i = 0; i < 65; i++) { const r = await post(live, '/api/live', { a: 'start', sid: SID }, E2.env, '5.5.5.5'); if (r.j.tk) got++; }
  out.push(`65 ticket requests from one IP in a burst -> ${got} tickets`); }
console.log(`D1 · ${dir}`);
console.log(out.join('\n'));
