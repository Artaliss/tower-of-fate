// Cloudflare Pages Function: /api/live (v2.2)
// storage: store(env) = D1 TOF_DB (see store.js)
//   'live'      = {u:{}, d:{'YYYY-MM-DD':{n,h,w,f}}}  per-day stats (last 3 days); u = presence from the old KV-only mode, now always empty
//   D1 table tix (store.js tix()) = one row per run ticket; /api/scores only lets ticketed, plausibly long runs into 'top'
// GET  ?day=YYYY-MM-DD           -> {n, day:{n,h,w,f}|null}
// POST {a:'start', sid, dv?}      -> {tk, n}   dv = device id, the score must come from the same device to count
// POST {a:'beat', sid, f}         -> {n}       old clients only; writes nothing
// POST {a:'ss', dv?, ss:{...}}    -> {ok, ss:1}   share counters (v2.7) summed into d[today].ss; no sid, nothing about the player is kept
// Writes per run start: 1 (the ticket row). "n" playing now = tickets from the last LIVE_MIN minutes that have no score yet,
// counted with a read and cached in this isolate for CACHE_MS.

import { store, tix, update } from './store.js';
import { ensureSchema, hit } from './acctlib.js';
import { ipHash, json, thDay, sameOrigin } from './util.js';

const WIN_MIN = 10;
const LIVE_MIN = 20, CACHE_MS = 120e3;     // the count is a read of every open ticket, so each isolate asks at most every 2 min
const TK_IP_MAX = 60, TK_IP_WIN = 600e3;   // tickets / IP / 10 min; above it the run just gets no ticket
const SS_IP_MAX = 20;                      // share-counter posts / IP / day
const okSid = s => typeof s === 'string' && /^[a-z0-9]{6,24}$/.test(s);
export const okDay = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
export const okDv = d => typeof d === 'string' && /^[0-9a-f]{16}$/.test(d);   // device id (v2.7), random per browser

// share analytics: which share buttons get pressed (counts only). Sent by leaderboard.js through {a:'ss'} (v2.7); old clients still send them with a score (scores.js)
export const SS_KEYS = ['ao', 'mo', 'bo', 'img', 'line', 'x', 'threads', 'copy', 'native', 'save', 'note'];
const SS_CAP = 50;
export function shareStats(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = {}; let any = 0;
  for (const k of SS_KEYS) { const n = v[k]; if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= SS_CAP) { o[k] = n; any = 1; } }
  return any ? o : null;
}
export function addShare(v, day, ss) {
  const d = v.d[day] || (v.d[day] = { n: 0, h: 0, w: 0, f: 0 });
  const t = d.ss && typeof d.ss === 'object' ? d.ss : (d.ss = {});
  for (const j in ss) t[j] = (Number.isInteger(t[j]) ? t[j] : 0) + ss[j];
}
const nowMin = () => Math.floor(Date.now() / 60000);

export async function readLive(kv) { return liveOf(await kv.get('live')); }
export function liveOf(s) {
  let v = null; try { v = JSON.parse(s || 'null'); } catch { }
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
// change 'live' without losing a change made at the same moment (store.js update)
export const editLive = (kv, fn) => update(kv, 'live', s => { const v = prune(liveOf(s)); fn(v); return JSON.stringify(prune(v)); });
export const ipKey = request => ipHash(request, 'tof-ip|');

// playing now: read-only count, cached per isolate so a burst of birth screens costs one query
let liveC = { n: 0, at: 0 };
async function openN(T) {
  const now = Date.now();
  if (now - liveC.at < CACHE_MS) return liveC.n;
  try { liveC = { n: await T.open(now - LIVE_MIN * 60e3), at: now }; } catch { }
  return liveC.n;
}

export async function onRequestGet({ request, env }) {
  const kv = store(env);
  if (!kv) return json({ error: 'kv-not-configured' }, 503);
  const o = request.headers.get('Origin');
  if (o && o !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403);
  const day = new URL(request.url).searchParams.get('day');
  const v = prune(await readLive(kv));
  return json({ n: await openN(tix(env)), day: okDay(day) && v.d[day] ? v.d[day] : null }, 200, { 'Cache-Control': 'public, max-age=20' });
}

export async function onRequestPost({ request, env }) {
  const kv = store(env);
  if (!kv) return json({ error: 'kv-not-configured' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const text = await request.text();
  if (text.length > 512) return json({ error: 'too-large' }, 413);
  let b; try { b = JSON.parse(text); } catch { return json({ error: 'bad-json' }, 400); }
  if (b && b.a === 'ss') {
    const ss = shareStats(b.ss);
    if (!ss) return json({ error: 'invalid', field: 'ss' }, 400);
    const db = env.TOF_DB, now = Date.now();
    await ensureSchema(db);
    if (await hit(db, 'ss:' + ipKey(request), 86400e3, now, SS_IP_MAX) > SS_IP_MAX) return json({ error: 'rate-limited' }, 429, { 'Retry-After': '3600' });
    await editLive(kv, v => addShare(v, thDay(now), ss));
    return json({ ok: true, ss: 1 });
  }
  if (!b || !okSid(b.sid)) return json({ error: 'sid' }, 400);
  const T = tix(env);
  if (b.a === 'start') {
    const ip = ipKey(request), now = Date.now();
    let many = false; try { many = await T.byIp(ip, now - TK_IP_WIN) >= TK_IP_MAX; } catch { }
    if (many) return json({ n: await openN(T) });
    const tk = await T.issue(ip, okDv(b.dv) ? b.dv : '');
    liveC.n++;
    return json({ tk, n: await openN(T) });
  }
  // old clients still send a beat every 5.5 min; the ticket already counts them
  if (b.a === 'beat') return json({ n: await openN(T) });
  return json({ error: 'a' }, 400);
}
