// Cloudflare Pages Function: /api/live (v2.2)
// storage: store(env) = D1 TOF_DB, falling back to KV TOF_KV (see store.js)
//   'live'      = {u:{sid:[lastSeenMin, floor]}, d:{'YYYY-MM-DD':{n,h,w,f}}}  presence (10 min window) + per-day stats (last 3 days)
//   'tk:<id>'   = {t0}  run ticket, issued at run start; /api/scores only lets ticketed, plausibly long runs into 'top'
// GET  ?day=YYYY-MM-DD           -> {n, day:{n,h,w,f}|null}
// POST {a:'start', sid}           -> {tk, n}
// POST {a:'beat', sid, f}         -> {n}
// Writes are kept low (KV free tier = 1,000 writes/day): a beat only writes when the sid was last written >= 5 min ago.

import { store } from './store.js';

const WIN_MIN = 10, BEAT_MIN = 5, TK_TTL = 3 * 86400;
const SEC = { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' };
const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { ...SEC, 'Cache-Control': 'no-store', ...extra } });
const okSid = s => typeof s === 'string' && /^[a-z0-9]{6,24}$/.test(s);
export const okDay = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
const nowMin = () => Math.floor(Date.now() / 60000);

function sameOrigin(request) {
  const self = new URL(request.url).origin;
  const o = request.headers.get('Origin');
  if (o) return o === self;
  const r = request.headers.get('Referer');
  if (r) { try { return new URL(r).origin === self; } catch { return false; } }
  return request.method === 'GET';
}

export async function readLive(kv) {
  let v = null; try { v = JSON.parse(await kv.get('live') || 'null'); } catch { }
  if (!v || typeof v !== 'object') v = {};
  if (!v.u || typeof v.u !== 'object') v.u = {};
  if (!v.d || typeof v.d !== 'object') v.d = {};
  return v;
}
// drop stale presence and keep only the 3 newest days
export function prune(v) {
  const m = nowMin();
  for (const k in v.u) { const x = v.u[k]; if (!Array.isArray(x) || m - x[0] > WIN_MIN) delete v.u[k]; }
  const days = Object.keys(v.d).filter(okDay).sort().reverse();
  for (const k in v.d) if (!days.slice(0, 3).includes(k)) delete v.d[k];
  return v;
}
export const liveN = v => Object.keys(v.u).length;
export const writeLive = (kv, v) => kv.put('live', JSON.stringify(v));

export async function onRequestGet({ request, env }) {
  const kv = store(env);
  if (!kv) return json({ error: 'kv-not-configured' }, 503);
  const o = request.headers.get('Origin');
  if (o && o !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403);
  const day = new URL(request.url).searchParams.get('day');
  const v = prune(await readLive(kv));
  return json({ n: liveN(v), day: okDay(day) && v.d[day] ? v.d[day] : null }, 200, { 'Cache-Control': 'public, max-age=20' });
}

export async function onRequestPost({ request, env }) {
  const kv = store(env);
  if (!kv) return json({ error: 'kv-not-configured' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const text = await request.text();
  if (text.length > 512) return json({ error: 'too-large' }, 413);
  let b; try { b = JSON.parse(text); } catch { return json({ error: 'bad-json' }, 400); }
  if (!b || !okSid(b.sid)) return json({ error: 'sid' }, 400);
  const v = prune(await readLive(kv)), m = nowMin(), f = Number.isInteger(b.f) && b.f >= 1 && b.f <= 101 ? b.f : 1;
  if (b.a === 'start') {
    const tk = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    await kv.put('tk:' + tk, JSON.stringify({ t0: Date.now() }), { expirationTtl: TK_TTL });
    v.u[b.sid] = [m, 1];
    await writeLive(kv, v);
    return json({ tk, n: liveN(v) });
  }
  if (b.a === 'beat') {
    const x = v.u[b.sid];
    if (!x || m - x[0] >= BEAT_MIN) { v.u[b.sid] = [m, f]; await writeLive(kv, v); }
    return json({ n: liveN(v) });
  }
  return json({ error: 'a' }, 400);
}
