// Checks memorial.seen (added on first use), the throttled seen writes and the 90-day sweep against a real SQLite (node:sqlite) behind a tiny D1 shim.
// Usage: node tools/memorial-cleanup-test.mjs   (Node 22.5+)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve('.');
const imp = f => import(pathToFileURL(path.join(root, f)).href);
const DAY = 86400e3;
let off = 0; const realNow = Date.now.bind(Date); Date.now = () => realNow() + off;
let rnd = 0.5; Math.random = () => rnd;

// ---- D1 shim over node:sqlite; counts statements that change rows ----
function d1() {
  const s = new DatabaseSync(':memory:');
  s.exec(fs.readFileSync(path.join(root, 'migrations/0001_memorial.sql'), 'utf8'));
  const st = { writes: 0, sql: [] };
  const mk = (sql, a = []) => ({
    bind: (...b) => mk(sql, b),
    async run() { st.sql.push(sql); const r = s.prepare(sql).run(...a); if (r.changes) st.writes += Number(r.changes); return { meta: { changes: Number(r.changes) } }; },
    async first() { st.sql.push(sql); const p = s.prepare(sql); return /^\s*(SELECT|INSERT|UPDATE|DELETE).*RETURNING/is.test(sql) || /^\s*SELECT/i.test(sql) ? (p.get(...a) ?? null) : null; },
    async all() { return { results: s.prepare(sql).all(...a) }; },
    _exec: () => s.prepare(sql).run(...a),
  });
  const db = {
    prepare: sql => mk(sql),
    async batch(list) { s.exec('BEGIN'); try { const out = list.map(q => { const r = q._exec(); if (r.changes) st.writes += Number(r.changes); return r; }); s.exec('COMMIT'); return out; } catch (e) { s.exec('ROLLBACK'); throw e; } },
  };
  return { db, s, st };
}

// ---- HTMLRewriter stub: records attributes the page function sets ----
const SET = {};
globalThis.HTMLRewriter = class {
  constructor() { this.h = []; }
  on(sel, h) { this.h.push([sel, h]); return this; }
  transform(r) { for (const [sel, h] of this.h) h.element({ setAttribute: (a, v) => { SET[sel] = v; }, setInnerContent() {}, prepend() {} }); return r; }
};

const api = await imp('functions/api/memorial.js');
const page = await imp('functions/m/[[path]].js');
let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };

const { db, s, st } = d1();
const env = { TOF_DB: db, ASSETS: { fetch: async () => new Response('<html><head></head></html>', { headers: { 'Content-Type': 'text/html' } }) } };
const O = 'https://tower-of-fate.pages.dev';
const waits = []; const waitUntil = p => waits.push(p);
const flush = async () => { await Promise.all(waits.splice(0)); };

// tiny real JPEG header (SOF0 600x315) and PNG header (IHDR 1200x630)
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xc0, 0, 17, 8, 0x01, 0x3b, 0x02, 0x58, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xd9]).toString('base64');
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]), Buffer.from([0, 0, 4, 0xb0, 0, 0, 2, 0x76, 8, 2, 0, 0, 0]), Buffer.alloc(8)]).toString('base64');
ok(JSON.stringify(page.imgSize('image/jpeg', jpg)) === '{"w":600,"h":315}', 'imgSize jpeg 600x315');
ok(JSON.stringify(page.imgSize('image/png', png)) === '{"w":1200,"h":630}', 'imgSize png 1200x630');

const now = Date.now(), d = JSON.stringify({ n: 'ทดสอบ', f: 12, rk: 2, cn: 'นักรบ', w: 0, ca: 'x' });
const ins = (id, at, hid = 0) => { s.prepare('INSERT INTO memorial (id, at, dk, ip, d, hid) VALUES (?, ?, ?, ?, ?, ?)').run(id, at, 'k', 'ip', d, hid); s.prepare('INSERT INTO memorial_img (id, mime, b64) VALUES (?, ?, ?)').run(id, 'image/jpeg', jpg); };
// rows from before the column exists
ins('aaaaaaaaa', now - 400 * DAY);           // old, never seen -> grace from SEEN_SINCE
ins('bbbbbbbbb', now - 5 * DAY);
ins('ccccccccc', now - 200 * DAY);           // will be viewed
s.prepare('INSERT INTO memorial_img (id, mime, b64) VALUES (?, ?, ?)').run('zzzzzzzzz', 'image/jpeg', jpg);   // orphan

// 1) API GET adds the column and marks seen once
let r = await api.onRequestGet({ request: new Request(O + '/api/memorial?id=ccccccccc'), env, waitUntil }); await flush();
ok(r.status === 200, 'GET 200 after column added');
const seen1 = s.prepare('SELECT seen FROM memorial WHERE id = ?').get('ccccccccc').seen;
ok(seen1 > 0, 'seen written on first view');
const w0 = st.writes;
r = await api.onRequestGet({ request: new Request(O + '/api/memorial?id=ccccccccc'), env, waitUntil }); await flush();
await page.onRequest({ request: new Request(O + '/m/ccccccccc'), env, waitUntil }); await flush();
await page.onRequest({ request: new Request(O + '/m/ccccccccc.jpg'), env, waitUntil }); await flush();
ok(st.writes === w0, 'no more seen writes within a day');
ok(SET['meta[property="og:image:width"]'] === '600' && SET['meta[property="og:image:height"]'] === '315', 'og:image size 600x315 from stored jpeg');
ok(SET['meta[property="og:image"]'] === O + '/m/ccccccccc.jpg', 'og:image points at .jpg');
off += 2 * DAY;
await page.onRequest({ request: new Request(O + '/m/ccccccccc.jpg'), env, waitUntil }); await flush();
ok(s.prepare('SELECT seen FROM memorial WHERE id = ?').get('ccccccccc').seen > seen1, 'image view refreshes seen after a day');

// 2) sweep: nothing goes before SEEN_SINCE + 90 days
await api.sweepOld(db, Date.now());
ok(s.prepare('SELECT COUNT(*) n FROM memorial').get().n === 3, 'no memorial deleted inside the grace period');
ok(s.prepare('SELECT COUNT(*) n FROM memorial_img WHERE id = ?').get('zzzzzzzzz').n === 0, 'orphan image deleted');
// jump to SEEN_SINCE + 91 days, keep ccc fresh by viewing it at +80 days
off = api.SEEN_SINCE + 80 * DAY - realNow();
await api.onRequestGet({ request: new Request(O + '/api/memorial?id=ccccccccc'), env, waitUntil }); await flush();
off = api.SEEN_SINCE + 91 * DAY - realNow();
rnd = 0;   // force the sweep on this view
await page.onRequest({ request: new Request(O + '/m/ccccccccc'), env, waitUntil }); await flush();
rnd = 0.5;
const left = s.prepare('SELECT id FROM memorial ORDER BY id').all().map(x => x.id);
ok(JSON.stringify(left) === '["ccccccccc"]', 'old unseen memorials deleted, viewed one kept: ' + left.join(','));
ok(JSON.stringify(s.prepare('SELECT id FROM memorial_img ORDER BY id').all().map(x => x.id)) === '["ccccccccc"]', 'their images deleted too');
r = await api.onRequestGet({ request: new Request(O + '/api/memorial?id=aaaaaaaaa'), env, waitUntil });
ok(r.status === 404 && (await r.json()).error === 'not-found', 'deleted memorial -> 404 not-found');
const dl = s.prepare("SELECT COUNT(*) n FROM memorial").get().n;
ok(dl === 1, 'bounded delete ran');

// 3) bounded: 120 stale rows -> one sweep removes 50
for (let i = 0; i < 120; i++) ins('y' + String(i).padStart(8, '0'), 0);
const before = s.prepare('SELECT COUNT(*) n FROM memorial').get().n;
await api.sweepOld(db, Date.now());
ok(before - s.prepare('SELECT COUNT(*) n FROM memorial').get().n === api.SWEEP_N, 'one sweep deletes at most SWEEP_N');

// 4) create: big old-client image is dropped, small one kept
const memo = { ck: 'war', rk: 2, f: 12, n: 'ทดสอบ', fr: [{ k: 'd', f: 12, v: { t: 'prop', pr: 'chest' } }] };
const mkReq = img => new Request(O + '/api/memorial', { method: 'POST', headers: { Origin: O, 'Content-Type': 'application/json', 'CF-Connecting-IP': '9.9.9.' + Math.random() }, body: JSON.stringify({ a: 'create', d: memo, dk: 'a'.repeat(24), img }) });
r = await api.onRequestPost({ request: mkReq('data:image/jpeg;base64,' + jpg), env }); let j = await r.json();
ok(j.ok && s.prepare('SELECT COUNT(*) n FROM memorial_img WHERE id = ?').get(j.id).n === 1, 'small image stored');
r = await api.onRequestPost({ request: mkReq('data:image/png;base64,iVBORw0KGgo' + 'A'.repeat(300000 - 11)), env }); j = await r.json();
ok(j.ok && s.prepare('SELECT COUNT(*) n FROM memorial_img WHERE id = ?').get(j.id).n === 0, 'old-client 300 KB image: memorial created, image dropped');

// 5) a database without the tables still answers not-ready
const bare = new DatabaseSync(':memory:'); api._resetSeen();
const bdb = { prepare: sql => { const mk = (a = []) => ({ bind: (...b) => mk(b), run: async () => bare.prepare(sql).run(...a), first: async () => bare.prepare(sql).get(...a) ?? null }); return mk(); } };
r = await api.onRequestGet({ request: new Request(O + '/api/memorial?id=ccccccccc'), env: { TOF_DB: bdb } });
ok(r.status === 503, 'no tables -> 503 not-ready');

console.log(fail ? `\n${fail} failed` : '\nall passed');
process.exit(fail ? 1 : 0);
