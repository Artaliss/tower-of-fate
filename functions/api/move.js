// Cloudflare Pages Function: /api/move  — save transfer code (v2.7, after 1in8b.life "ย้ายบันทึก"; no login)
// storage: store(env) (D1 kv table) key 'mv:<code>' with a 3-day TTL; a used code becomes '0' until the same TTL ends
// POST {a:'put', p, z, m}   -> {ok, code, exp}   p = every tof-* localStorage key as one string (z:'gz' = gzip + base64), m = small summary for the confirm screen
// POST {a:'peek', code}     -> {ok, at, exp, m, n}  (does not use the code up) | 404 {error:'not-found'} | 410 {error:'used'}
// POST {a:'take', code}     -> {ok, at, m, z, p}    (one time only: the code is spent here)
// code: 9 chars [a-z2-9]

import { store, update } from './store.js';
import { ensureSchema, hit } from './acctlib.js';
import { randCode, readBody } from './memorial.js';
import { ipHash, json, sameOrigin, fitsRow, saveMeta, MAX_SAVE as MAX_P } from './util.js';

const TTL = 3 * 86400;
const MAX_BODY = MAX_P + 10000;
const PUT_MAX = 6, PUT_WIN = 86400;      // 6 codes / day / IP: each may hold MAX_SAVE for 3 days, so one IP keeps at most ~7 MB in D1
const GET_MAX = 30, GET_WIN = 600;       // 30 peeks or takes / 10 min / IP (guessing a 9-char code is hopeless anyway)
const okCode = s => typeof s === 'string' && /^[a-z2-9]{9}$/.test(s);

// one atomic counter row (acct_lim, see acctlib.js hit) -> seconds to wait, or 0
async function limited(db, key, max, win, now) {
  await ensureSchema(db);
  return await hit(db, key, win * 1000, now, max) > max ? win : 0;
}

export async function onRequestPost({ request, env }) {
  const kv = store(env);
  if (!kv) return json({ error: 'not-ready' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { b, res } = await readBody(request, MAX_BODY);
  if (res) return res;
  const now = Date.now(), ip = ipHash(request, 'mv|');
  try {
    if (b.a === 'put') {
      if (typeof b.p !== 'string' || !b.p.length || b.p.length > MAX_P || !fitsRow(b.p)) return json({ error: 'too-large' }, 413);
      const z = b.z === 'gz' ? 'gz' : '';
      if (z ? !/^[A-Za-z0-9+/]+={0,2}$/.test(b.p) : b.p[0] !== '{') return json({ error: 'invalid', field: 'p' }, 400);
      const wait = await limited(env.TOF_DB, 'rl:mv:' + ip, PUT_MAX, PUT_WIN, now);
      if (wait) return json({ error: 'rate-limited', retryAfter: wait }, 429, { 'Retry-After': String(wait) });
      let code = '';
      for (let t = 0; t < 4 && !code; t++) { const c = randCode(); if (!(await kv.get('mv:' + c))) code = c; }
      if (!code) return json({ error: 'busy' }, 503);
      await kv.put('mv:' + code, JSON.stringify({ at: now, m: saveMeta(b.m), z, p: b.p }), { expirationTtl: TTL });
      return json({ ok: true, code, exp: now + TTL * 1000 });
    }
    if (b.a === 'peek' || b.a === 'take') {
      if (!okCode(b.code)) return json({ error: 'not-found' }, 404);
      const wait = await limited(env.TOF_DB, 'rl:mvt:' + ip, GET_MAX, GET_WIN, now);
      if (wait) return json({ error: 'rate-limited', retryAfter: wait }, 429, { 'Retry-After': String(wait) });
      let raw = null, v = null;
      const read = s => { raw = s; v = null; try { v = JSON.parse(s || 'null'); } catch { } return v && typeof v.p === 'string' ? v : null; };
      // take: spending the code is the write; when two takes race, only the one whose write lands gets the save
      const took = b.a === 'take' && await update(kv, 'mv:' + b.code, s => read(s) ? '0' : null);
      if (b.a === 'peek') read(await kv.get('mv:' + b.code));
      if (raw === '0') return json({ error: 'used' }, 410);
      if (!v || typeof v.p !== 'string') return json({ error: 'not-found' }, 404);
      if (b.a === 'peek') return json({ ok: true, at: v.at, exp: v.at + TTL * 1000, m: v.m || {}, n: v.p.length });
      if (!took) return json({ error: 'used' }, 410);
      return json({ ok: true, at: v.at, m: v.m || {}, z: v.z || '', p: v.p });
    }
    return json({ error: 'bad-action' }, 400);
  } catch (e) { return json({ error: 'storage' }, 500); }
}

export function onRequestGet() { return json({ error: 'method-not-allowed' }, 405, { Allow: 'POST' }); }
