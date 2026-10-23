// Cloudflare Pages Function: /api/move  — save transfer code (v2.7, after 1in8b.life "ย้ายบันทึก"; no login)
// storage: store(env) (D1 kv table, KV fallback) key 'mv:<code>' with a 3-day TTL; a used code becomes '0' for a day
// POST {a:'put', p, z, m}   -> {ok, code, exp}   p = every tof-* localStorage key as one string (z:'gz' = gzip + base64), m = small summary for the confirm screen
// POST {a:'peek', code}     -> {ok, at, exp, m, n}  (does not use the code up) | 404 {error:'not-found'} | 410 {error:'used'}
// POST {a:'take', code}     -> {ok, at, m, z, p}    (one time only: the code is spent here)
// code: 9 chars [a-z2-9]

import { store } from './store.js';
import { fnv, randCode, json, sameOrigin, readBody } from './memorial.js';

const TTL = 3 * 86400, USED_TTL = 86400;
const MAX_BODY = 1200000, MAX_P = 1100000;
const PUT_MAX = 6, PUT_WIN = 3600;       // 6 codes / hour / IP
const GET_MAX = 30, GET_WIN = 600;       // 30 peeks or takes / 10 min / IP (guessing a 9-char code is hopeless anyway)
const okCode = s => typeof s === 'string' && /^[a-z2-9]{9}$/.test(s);

async function limited(kv, key, max, win, now) {
  let rl = null; try { rl = JSON.parse(await kv.get(key) || 'null'); } catch { }
  if (!rl || typeof rl.t !== 'number' || now - rl.t >= win * 1000) rl = { c: 0, t: now };
  if (rl.c >= max) return Math.max(1, Math.ceil((rl.t + win * 1000 - now) / 1000));
  rl.c++;
  await kv.put(key, JSON.stringify(rl), { expirationTtl: Math.max(60, Math.ceil((rl.t + win * 1000 - now) / 1000)) });
  return 0;
}
function meta(m) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return {};
  const o = {};
  for (const k of ['keys', 'memo', 'lines', 'ach', 'gen', 'unl']) if (typeof m[k] === 'number' && Number.isInteger(m[k]) && m[k] >= 0 && m[k] <= 1e6) o[k] = m[k];
  for (const [h, r] of [['hero', 'run'], ['chero', 'crun']]) {   // chero/crun = run left open in the classic copy (tofc-*)
    if (typeof m[h] === 'string') o[h] = m[h].replace(/[<>"'`\\&\u0000-\u001f]/g, '').slice(0, 24);
    if (typeof m[r] === 'number' && m[r] >= 0 && m[r] <= 101) o[r] = Math.floor(m[r]);
  }
  return o;
}

export async function onRequestPost({ request, env }) {
  const kv = store(env);
  if (!kv) return json({ error: 'not-ready' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { b, res } = await readBody(request, MAX_BODY);
  if (res) return res;
  const now = Date.now(), ip = fnv('mv|' + (request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown'));
  try {
    if (b.a === 'put') {
      if (typeof b.p !== 'string' || !b.p.length || b.p.length > MAX_P) return json({ error: 'invalid', field: 'p' }, 400);
      const z = b.z === 'gz' ? 'gz' : '';
      if (z ? !/^[A-Za-z0-9+/]+={0,2}$/.test(b.p) : b.p[0] !== '{') return json({ error: 'invalid', field: 'p' }, 400);
      const wait = await limited(kv, 'rl:mv:' + ip, PUT_MAX, PUT_WIN, now);
      if (wait) return json({ error: 'rate-limited', retryAfter: wait }, 429, { 'Retry-After': String(wait) });
      let code = '';
      for (let t = 0; t < 4 && !code; t++) { const c = randCode(); if (!(await kv.get('mv:' + c))) code = c; }
      if (!code) return json({ error: 'busy' }, 503);
      await kv.put('mv:' + code, JSON.stringify({ at: now, m: meta(b.m), z, p: b.p }), { expirationTtl: TTL });
      return json({ ok: true, code, exp: now + TTL * 1000 });
    }
    if (b.a === 'peek' || b.a === 'take') {
      if (!okCode(b.code)) return json({ error: 'not-found' }, 404);
      const wait = await limited(kv, 'rl:mvt:' + ip, GET_MAX, GET_WIN, now);
      if (wait) return json({ error: 'rate-limited', retryAfter: wait }, 429, { 'Retry-After': String(wait) });
      const raw = await kv.get('mv:' + b.code);
      if (raw === '0') return json({ error: 'used' }, 410);
      let v = null; try { v = JSON.parse(raw || 'null'); } catch { }
      if (!v || typeof v.p !== 'string') return json({ error: 'not-found' }, 404);
      if (b.a === 'peek') return json({ ok: true, at: v.at, exp: v.at + TTL * 1000, m: v.m || {}, n: v.p.length });
      await kv.put('mv:' + b.code, '0', { expirationTtl: USED_TTL });
      return json({ ok: true, at: v.at, m: v.m || {}, z: v.z || '', p: v.p });
    }
    return json({ error: 'bad-action' }, 400);
  } catch (e) { return json({ error: 'storage' }, 500); }
}

export function onRequestGet() { return json({ error: 'method-not-allowed' }, 405, { Allow: 'POST' }); }
