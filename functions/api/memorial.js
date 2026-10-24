// Cloudflare Pages Function: /api/memorial  — online memorial /m/<id> (v2.7, free, no login; after 1in8b.life, docs/rea/1in8b-rea-v2.md §3.5)
// storage: D1 TOF_DB tables memorial / memorial_img / memorial_act (migrations/0001_memorial.sql, created by hand).
// column memorial.seen (migrations/0004_memorial_seen.sql) is added here by ensureSeen() on first use, no manual step needed.
// cleanup: a memorial nobody opened for KEEP_DAYS is deleted with its image (sweepOld, now and then on a view).
// Missing binding or tables -> 503 {error:'not-ready'}; the game shows a polite message and keeps working.
// GET  ?id=<id>                    -> {ok, m:{id, at, d, c, w:[5]}}  | 404 {error:'not-found'}
// GET  ?random=1[&not=<id>]        -> {ok, id} | 404 {error:'empty'}
// POST {a:'create', d, img, dk}    -> {ok, id}   d = run summary + scene descriptors (cleaned here), img = data:image/jpeg|png;base64 (600x315 JPEG from current clients, 1200x630 from older ones), dk = 24 hex owner key
//                                    an image over MAX_IMG is dropped (the page falls back to /og.png) instead of failing the create
// POST {a:'word', id, w:0..4}      -> {ok, w:[5], dup?}   one word per memorial per IP per day
// POST {a:'report', id}            -> {ok, dup?}          hidden after REPORT_HIDE distinct IPs
// POST {a:'remove', id, dk}        -> {ok}                owner only (SHA-256 of dk must match)
// candles: functions/api/candle.js (uses the helpers exported here)

import { screen } from './posts.js';
import { fnv, clean as cl, json, isInt, okId, thDay, sameOrigin, RANKS, CLS, DRG } from './util.js';

// MAX_BODY stays large so old clients (up to ~390 KB image) still get through; their image is just not stored.
const MAX_BODY = 460000, MAX_IMG = 160000, MAX_D = 16000;
const CREATE_PER_DAY = 6, ACT_PER_DAY = 60, REPORT_HIDE = 3;
const DAY = 86400e3;
export const WORDS = 5;
const MAPK = ['fight', 'treasure', 'trap', 'good', 'evil', 'pet', 'comp', 'boss', 'warp', 'flee', 'calm', 'bad', 'farm', 'death'];
const clean = (v, max) => cl(v, max, 1);   // memorial fields may be numbers
const int = (v, lo, hi, d = 0) => typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d;
const okTok = s => typeof s === 'string' && /^[a-z0-9_:-]{1,24}$/i.test(s);
export const ipOf = request => fnv('m|' + (request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown'));

// D1 errors -> polite JSON (a missing table means migrations/0001_memorial.sql has not been run yet)
export function dbErr(e) {
  const m = String(e && e.message || e);
  if (/no such table|no such column/i.test(m)) return json({ error: 'not-ready' }, 503);
  return json({ error: 'db' }, 500);
}
export const dbOf = env => (env && env.TOF_DB) || null;

// per-key counter with expiry; returns the count after this hit
export async function bump(db, k, ttl, now) {
  const r = await db.prepare('INSERT INTO memorial_act (k, n, exp) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n').bind(k, now + ttl).first();
  if (Math.random() < 0.02) await db.prepare('DELETE FROM memorial_act WHERE exp < ?').bind(now).run();
  return r && typeof r.n === 'number' ? r.n : 1;
}

// ---- last visit + cleanup of memorials nobody opens ----
// seen = ms of the last view (page, preview image or API GET), written at most once per SEEN_EVERY per memorial.
// A memorial is deleted when max(at, seen, SEEN_SINCE) is older than KEEP_DAYS. SEEN_SINCE is the day the column
// was added, so rows from before it (seen = 0) get the full KEEP_DAYS counted from that day.
export const KEEP_DAYS = 90, SEEN_EVERY = DAY, SEEN_SINCE = Date.UTC(2026, 9, 23), SWEEP_P = 0.01, SWEEP_N = 50;
let seenReady = false;
export async function ensureSeen(db) {
  if (seenReady) return true;
  try { await db.prepare('ALTER TABLE memorial ADD COLUMN seen INTEGER NOT NULL DEFAULT 0').run(); }
  catch (e) { if (!/duplicate column/i.test(String(e && e.message || e))) return false; }
  return seenReady = true;
}
export const _resetSeen = () => { seenReady = false; };   // tests only
// call with the seen value already read from the row; writes only when it is stale
export async function touchSeen(db, id, seen, now = Date.now()) {
  if (!(now - (Number(seen) || 0) >= SEEN_EVERY)) return false;   // ms does not fit in |0
  await db.prepare('UPDATE memorial SET seen = ? WHERE id = ? AND seen < ?').bind(now, id, now - SEEN_EVERY).run();
  return true;
}
// bounded: at most SWEEP_N memorials and SWEEP_N images per call
export async function sweepOld(db, now = Date.now()) {
  if (!await ensureSeen(db)) return;
  await db.batch([
    db.prepare('DELETE FROM memorial WHERE id IN (SELECT id FROM memorial WHERE MAX(at, seen, ?) < ? LIMIT ?)').bind(SEEN_SINCE, now - KEEP_DAYS * DAY, SWEEP_N),
    db.prepare('DELETE FROM memorial_img WHERE id IN (SELECT i.id FROM memorial_img i LEFT JOIN memorial m ON m.id = i.id WHERE m.id IS NULL LIMIT ?)').bind(SWEEP_N),
  ]);
}
// after a view: refresh seen and sometimes sweep; never fails the request
export function afterView(db, id, seen, waitUntil, now = Date.now()) {
  const p = (async () => {
    try { await touchSeen(db, id, seen, now); } catch {}
    if (Math.random() < SWEEP_P) { try { await sweepOld(db, now); } catch {} }
  })();
  if (typeof waitUntil === 'function') { try { waitUntil(p); return p; } catch {} }
  return p;
}

export async function readBody(request, max) {
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return { res: json({ error: 'content-type' }, 415) };
  const len = +(request.headers.get('Content-Length') || 0);
  if (len > max) return { res: json({ error: 'too-large' }, 413) };
  const text = await request.text();
  if (text.length > max) return { res: json({ error: 'too-large' }, 413) };
  try { const b = JSON.parse(text); if (!b || typeof b !== 'object' || Array.isArray(b)) throw 0; return { b }; } catch { return { res: json({ error: 'bad-json' }, 400) }; }
}

// ---- run data: every field is rebuilt from an allow-list, strings are cleaned and cut ----
const nameOk = (v, max, dflt) => { const s = clean(v, max); return s && !screen(s) ? s : dflt; };
const txt = (v, max) => { const s = clean(v, max); return screen(s) ? '' : s; };
function look(v) {
  if (!v || typeof v !== 'object') return { form: 'human', seed: 0 };
  const o = { form: v.form === 'slime' ? 'slime' : 'human' };
  o.seed = typeof v.seed === 'number' && isFinite(v.seed) ? Math.floor(Math.abs(v.seed)) % 4294967296 : clean(v.seed, 40);
  for (const k of ['hue', 'sat', 'lit', 'eye', 'mouth', 'skin']) if (typeof v[k] === 'number' && isFinite(v[k])) o[k] = int(v[k], 0, 360);
  if (typeof v.blush === 'boolean') o.blush = v.blush;
  return o;
}
function comp(c) {
  if (!c || typeof c !== 'object') return null;
  return { n: nameOk(c.n, 24, 'เพื่อนร่วมทาง'), cls: CLS.includes(c.cls) ? c.cls : 'war', tr: okTok(c.tr) ? c.tr : '', legend: !!c.legend };
}
// scene descriptor of one frame (same shape as visLite() in auto.js)
function vis(v) {
  if (!v || typeof v !== 'object') return null;
  if (v.t === 'en' && v.en && typeof v.en === 'object') {
    const e = v.en; if (!okTok(e.id) && !CLS.includes(e.cls)) return null;
    return { t: 'en', en: { id: okTok(e.id) ? e.id : '', boss: !!e.boss, cls: CLS.includes(e.cls) ? e.cls : '', n: txt(e.n, 24) } };
  }
  if (v.t === 'prop' && okTok(v.pr)) return { t: 'prop', pr: v.pr, fb: okTok(v.fb) ? v.fb : '' };
  if (v.t === 'pet' && okTok(v.p)) return { t: 'pet', p: v.p };
  if (v.t === 'comp') return { t: 'comp', cls: CLS.includes(v.cls) ? v.cls : 'war', c: comp(v.c) };
  return null;
}
function frame(f) {
  if (!f || typeof f !== 'object' || !['b', 'm', 'd', 'w'].includes(f.k)) return null;
  return { k: f.k, f: int(f.f, 1, 100, 1), v: vis(f.v), r: ['c', 'r', 'l'].includes(f.r) ? f.r : '', c: txt(f.c, 90), s: txt(f.s, 120) };
}
const arr = (v, n) => Array.isArray(v) ? v.slice(0, n) : [];

export function cleanMemo(b, now = Date.now()) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  if (!CLS.includes(b.ck) || !isInt(b.rk, 0, RANKS.length - 1) || !isInt(b.f, 1, 101)) return null;
  const w = b.w ? 1 : 0, f = b.f;
  if (w && f < 100) return null;
  const fr = arr(b.fr, 9).map(frame).filter(Boolean);
  if (!fr.length) return null;
  const d = {
    v: 1, n: nameOk(b.n, 24, 'นักผจญภัยนิรนาม'), vl: nameOk(b.vl, 24, ''), hs: nameOk(b.hs, 24, ''), g: int(b.g, 1, 9999, 1),
    rk: b.rk, ck: b.ck, cn: txt(b.cn, 40), lk: look(b.lk), f, w, dg: DRG.includes(b.dg) ? b.dg : '',
    ti: txt(b.ti, 40), tg: b.tg ? 1 : 0, ca: txt(b.ca, 90), kr: int(b.kr, -9999, 9999), sc: int(b.sc, 0, 1e7), lv: int(b.lv, 1, 999, 1),
    kl: int(b.kl, 0, 99999), bo: int(b.bo, 0, 999), od: int(b.od, 1, 4e9, 1),
    pt: b.pt && typeof b.pt === 'object' ? { c: clean(b.pt.c, 4), n: txt(b.pt.n, 30) } : null,
    eu: txt(b.eu, 50), el: txt(b.el, 120), jd: txt(b.jd, 120),
    mp: Array.from({ length: 100 }, (_, i) => { const m = Array.isArray(b.mp) ? b.mp[i] : ''; return MAPK.includes(m) ? m : ''; }),
    hp: Array.from({ length: 100 }, (_, i) => { const v = Array.isArray(b.hp) ? b.hp[i] : -1; return isInt(v, 0, 100) ? v : -1; }),
    pets: arr(b.pets, 4).filter(okTok), cm: arr(b.cm, 4).map(comp).filter(Boolean), rain: b.rain ? 1 : 0,
    fr, dt: isInt(b.dt, now - 400 * DAY, now + DAY) ? b.dt : now,
  };
  if (!d.pt || !d.pt.c) d.pt = null;
  return d;
}

// 9 chars from [a-z2-9] (34 symbols, about 46 bits)
const ABC = 'abcdefghijklmnopqrstuvwxyz23456789';
export function randCode(n = 9) {
  let s = '';
  while (s.length < n) { const b = new Uint8Array(16); crypto.getRandomValues(b); for (const x of b) if (x < 238 && s.length < n) s += ABC[x % 34]; }
  return s;
}
export async function sha(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)));
  return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const IMG_RE = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/;
function image(v) {
  if (typeof v !== 'string') return null;
  const m = IMG_RE.exec(v); if (!m) return null;
  // check the magic bytes too, so only real PNG / JPEG data is served back from /m/<id>.png
  if (m[1] === 'png' ? !m[2].startsWith('iVBORw0KGgo') : !m[2].startsWith('/9j/')) return null;
  return { mime: 'image/' + m[1], b64: m[2] };
}
const pub = r => ({ id: r.id, at: r.at, d: (() => { try { return JSON.parse(r.d); } catch { return null; } })(), c: r.c | 0, w: [r.w0 | 0, r.w1 | 0, r.w2 | 0, r.w3 | 0, r.w4 | 0] });

export async function onRequestGet({ request, env, waitUntil }) {
  const db = dbOf(env);
  if (!db) return json({ error: 'not-ready' }, 503);
  const o = request.headers.get('Origin');
  if (o && o !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403);
  const q = new URL(request.url).searchParams;
  try {
    if (q.get('random')) {
      const not = okId(q.get('not')) ? q.get('not') : '';
      // a random id and the next one after it (wrapping round): an index seek instead of sorting the whole table
      const at = randCode(), pick = op => db.prepare(`SELECT id FROM memorial WHERE hid = 0 AND id ${op} ? AND id <> ? ORDER BY id LIMIT 1`).bind(at, not).first();
      const r = await pick('>=') || await pick('<');
      return r ? json({ ok: true, id: r.id }) : json({ error: 'empty' }, 404);
    }
    const id = q.get('id');
    if (!okId(id)) return json({ error: 'not-found' }, 404);
    const hasSeen = await ensureSeen(db);
    const r = await db.prepare(`SELECT id, at, d, c, w0, w1, w2, w3, w4, hid${hasSeen ? ', seen' : ''} FROM memorial WHERE id = ?`).bind(id).first();
    if (!r || r.hid) return json({ error: 'not-found' }, 404);
    const m = pub(r); if (!m.d) return json({ error: 'not-found' }, 404);
    if (hasSeen) afterView(db, id, r.seen, waitUntil);
    // X-Seen: last-view stamp before this request (-1 = no seen column), so the cleanup can be checked from outside
    return json({ ok: true, m }, 200, { 'Cache-Control': 'public, max-age=15', 'X-Seen': String(hasSeen ? Number(r.seen) || 0 : -1) });
  } catch (e) { return dbErr(e); }
}

export async function onRequestPost({ request, env }) {
  const db = dbOf(env);
  if (!db) return json({ error: 'not-ready' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { b, res } = await readBody(request, MAX_BODY);
  if (res) return res;
  const now = Date.now(), ip = ipOf(request), day = thDay(now);
  try {
    if (b.a === 'create') {
      if (typeof b.dk !== 'string' || !/^[a-f0-9]{24}$/.test(b.dk)) return json({ error: 'invalid', field: 'dk' }, 400);
      const d = cleanMemo(b.d, now);
      if (!d) return json({ error: 'invalid', field: 'd' }, 400);
      const ds = JSON.stringify(d);
      if (ds.length > MAX_D) return json({ error: 'too-large' }, 413);
      const img = b.img == null ? null : image(b.img);
      if (b.img != null && !img) return json({ error: 'invalid', field: 'img' }, 400);
      const keepImg = img && img.b64.length <= MAX_IMG;
      if (await bump(db, 'mc:' + ip + ':' + day, 2 * DAY, now) > CREATE_PER_DAY) return json({ error: 'rate-limited' }, 429, { 'Retry-After': '3600' });
      const dk = await sha(b.dk);
      for (let t = 0; t < 4; t++) {
        const id = randCode();
        const st = [db.prepare('INSERT INTO memorial (id, at, dk, ip, d) VALUES (?, ?, ?, ?, ?)').bind(id, now, dk, ip, ds)];
        if (keepImg) st.push(db.prepare('INSERT OR REPLACE INTO memorial_img (id, mime, b64) VALUES (?, ?, ?)').bind(id, img.mime, img.b64));
        try { await db.batch(st); return json({ ok: true, id }); }
        catch (e) { if (!/UNIQUE|constraint/i.test(String(e && e.message || e))) throw e; }
      }
      return json({ error: 'busy' }, 503);
    }
    if (!okId(b.id)) return json({ error: 'not-found' }, 404);
    const row = await db.prepare('SELECT id, dk, hid FROM memorial WHERE id = ?').bind(b.id).first();
    if (!row || (row.hid && b.a !== 'remove')) return json({ error: 'not-found' }, 404);
    if (b.a === 'word') {
      if (!isInt(b.w, 0, WORDS - 1)) return json({ error: 'invalid', field: 'w' }, 400);
      if (await bump(db, 'ad:' + ip + ':' + day, 2 * DAY, now) > ACT_PER_DAY) return json({ error: 'rate-limited' }, 429);
      const dup = await bump(db, 'w:' + b.id + ':' + ip + ':' + day, 2 * DAY, now) > 1;
      if (!dup) await db.prepare(`UPDATE memorial SET w${b.w} = w${b.w} + 1 WHERE id = ?`).bind(b.id).run();
      const r = await db.prepare('SELECT w0, w1, w2, w3, w4 FROM memorial WHERE id = ?').bind(b.id).first();
      return json({ ok: true, dup: dup || undefined, w: r ? [r.w0 | 0, r.w1 | 0, r.w2 | 0, r.w3 | 0, r.w4 | 0] : [] });
    }
    if (b.a === 'report') {
      if (await bump(db, 'ad:' + ip + ':' + day, 2 * DAY, now) > ACT_PER_DAY) return json({ error: 'rate-limited' }, 429);
      const dup = await bump(db, 'r:' + b.id + ':' + ip, 60 * DAY, now) > 1;
      if (!dup) await db.prepare('UPDATE memorial SET rp = rp + 1, hid = CASE WHEN rp + 1 >= ? THEN 1 ELSE hid END WHERE id = ?').bind(REPORT_HIDE, b.id).run();
      return json({ ok: true, dup: dup || undefined });
    }
    if (b.a === 'remove') {
      if (typeof b.dk !== 'string' || !/^[a-f0-9]{24}$/.test(b.dk) || await sha(b.dk) !== row.dk) return json({ error: 'forbidden' }, 403);
      await db.batch([db.prepare('DELETE FROM memorial WHERE id = ?').bind(b.id), db.prepare('DELETE FROM memorial_img WHERE id = ?').bind(b.id)]);
      return json({ ok: true });
    }
    return json({ error: 'bad-action' }, 400);
  } catch (e) { return dbErr(e); }
}
