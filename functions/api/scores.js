// Cloudflare Pages Function: /api/scores
// storage: store(env) = D1 TOF_DB or KV TOF_KV (keys: 'top' = top 100, 'recent' = last 50, 'rl:<ip>' rate limit, 'dup:<id>' dedupe)
// GET  -> {top:[...], recent:[...]}  (Cache-Control: max-age=30)
// POST -> body = entry JSON (see LEADERBOARD.md) -> {ok:true, id, rank, v, day, ss} | {error}
//         optional 'ss' = share counters (v2.3), summed into live.d[day].ss; response ss:1 means they were counted

import { store } from './store.js';
import { readLive, prune, writeLive, okDay } from './live.js';
const TOP_N = 100, RECENT_N = 50;
const RL_MAX = 10, RL_WIN = 600;          // 10 posts / 10 min / IP
const DUP_TTL = 86400;
const MAX_BODY = 4096;
const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS'];
const CLS = ['war', 'mag', 'arc', 'pri', 'rog', 'far', 'dra', 'dsl', 'nec', 'ang'];
const DRG = ['', 'n', 'f', 's', 'x'];   // secret dragon floor result (v2.1) — not part of canon()
const CLAN = ['', 'f', 's', 'd'];       // family dragon mark (v2.1) — not part of canon()
const FORMS = ['slime', 'human', ''];
const SALT = 'tof-v1';
// a ticketed run must have lasted at least this long on the server clock before it may enter 'top' (v2.2 anti-cheat)
const minMs = e => e.floor * 250;

// ---- shared with leaderboard.js (keep identical) ----
function fnv(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function clean(v, max) {
  let s = typeof v === 'string' ? v : '';
  s = s.replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g, '')
    .replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim();
  return Array.from(s).slice(0, max).join('').trim();
}
function canon(e) { return [e.name, e.village, e.rankK, e.clsId, e.form, e.floor, e.won ? 1 : 0, e.title, e.score, e.karma, e.gen, e.ach, e.date].join('|'); }
// -----------------------------------------------------

const isInt = (v, lo, hi) => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;

export function validate(b, now = Date.now()) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { err: 'bad-json' };
  const e = {
    name: clean(b.name, 24), village: clean(b.village, 24), rankK: b.rankK, clsId: b.clsId,
    clsN: clean(b.clsN, 16), form: b.form == null ? '' : b.form, floor: b.floor, won: b.won,
    title: clean(b.title, 40), score: b.score, karma: b.karma, gen: b.gen == null ? 1 : b.gen,
    ach: b.ach == null ? 0 : b.ach, date: b.date, v: clean(String(b.v == null ? '' : b.v), 16),
  };
  if (!e.name) return { err: 'name' };
  if (!RANKS.includes(e.rankK)) return { err: 'rankK' };
  if (!CLS.includes(e.clsId)) return { err: 'clsId' };
  if (!FORMS.includes(e.form)) return { err: 'form' };
  e.drg = DRG.includes(b.drg) ? b.drg : '';
  if (!isInt(e.floor, 1, 101)) return { err: 'floor' };
  if (typeof e.won !== 'boolean') return { err: 'won' };
  if (e.won && e.floor < 100) return { err: 'won-floor' };
  // floor 101 = cleared the secret dragon floor (v2.1)
  if (e.floor === 101 && !(e.won && (e.drg === 'f' || e.drg === 's'))) return { err: 'floor-101' };
  if (!isInt(e.score, 0, 10000000)) return { err: 'score' };
  if (!isInt(e.karma, -9999, 9999)) return { err: 'karma' };
  if (!isInt(e.gen, 1, 9999)) return { err: 'gen' };
  if (!isInt(e.ach, 0, 500)) return { err: 'ach' };
  if (!isInt(e.date, now - 30 * 86400e3, now + 86400e3)) return { err: 'date' };
  e.clan = CLAN.includes(b.clan) ? b.clan : '';
  // v2.2 run ticket / presence id / daily theme (not stored, not part of canon)
  const x = { tk: typeof b.tk === 'string' && /^[a-f0-9]{20}$/.test(b.tk) ? b.tk : '', sid: typeof b.sid === 'string' && /^[a-z0-9]{6,24}$/.test(b.sid) ? b.sid : '',
    day: okDay(b.day) ? b.day : '', dh: b.dh === 1 ? 1 : 0, ss: shareStats(b.ss) };
  if (typeof b.h !== 'string' || b.h !== fnv(SALT + '|' + canon(e))) return { err: 'integrity' };
  e.id = fnv(canon(e)) + e.date.toString(36).slice(-3);
  e.at = now;
  return { e, x };
}

// share analytics (v2.3): counters from share.js piggyback on a score post and are summed into live.d[day].ss (no extra KV write)
export const SS_KEYS = ['ao', 'mo', 'bo', 'img', 'line', 'x', 'threads', 'copy', 'native', 'save', 'note'];
const SS_CAP = 50;
export function shareStats(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = {}; let any = 0;
  for (const k of SS_KEYS) { const n = v[k]; if (isInt(n, 1, SS_CAP)) { o[k] = n; any = 1; } }
  return any ? o : null;
}
const thDay = now => new Date(now + 7 * 3600e3).toISOString().slice(0, 10);

export const cmp = (a, b) => (b.won - a.won) || (b.floor - a.floor) || (b.score - a.score) || (a.date - b.date);

const SEC = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Vary': 'Origin',
};
const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { ...SEC, 'Cache-Control': 'no-store', ...extra } });

async function getList(kv, key) {
  try { const v = await kv.get(key); const a = v ? JSON.parse(v) : []; return Array.isArray(a) ? a : []; } catch { return []; }
}

// same-origin only: reject requests whose Origin/Referer belongs to another site
function sameOrigin(request) {
  const self = new URL(request.url).origin;
  const o = request.headers.get('Origin');
  if (o) return o === self;
  const r = request.headers.get('Referer');
  if (r) { try { return new URL(r).origin === self; } catch { return false; } }
  return request.method === 'GET'; // POST without Origin/Referer is not from our page
}

export async function onRequestGet({ request, env }) {
  const kv = store(env);
  if (!kv) return json({ error: 'kv-not-configured' }, 503);
  const o = request.headers.get('Origin');
  if (o && o !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403);
  const [top, recent] = await Promise.all([getList(kv, 'top'), getList(kv, 'recent')]);
  return json({ top, recent }, 200, { 'Cache-Control': 'public, max-age=30' });
}

export async function onRequestPost({ request, env }) {
  const kv = store(env);
  if (!kv) return json({ error: 'kv-not-configured' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const ct = request.headers.get('Content-Type') || '';
  if (!ct.includes('application/json')) return json({ error: 'content-type' }, 415);

  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: 'too-large' }, 413);
  let body; try { body = JSON.parse(text); } catch { return json({ error: 'bad-json' }, 400); }

  const { e, x, err } = validate(body);
  if (err) return json({ error: 'invalid', field: err }, 400);

  // rate limit per IP (fixed window stored with TTL)
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const rlKey = 'rl:' + fnv(ip);
  const now = Date.now();
  let rl = null; try { rl = JSON.parse(await kv.get(rlKey) || 'null'); } catch { }
  if (!rl || typeof rl.t !== 'number' || now - rl.t >= RL_WIN * 1000) rl = { c: 0, t: now };
  if (rl.c >= RL_MAX) {
    const wait = Math.ceil((rl.t + RL_WIN * 1000 - now) / 1000);
    return json({ error: 'rate-limited', retryAfter: wait }, 429, { 'Retry-After': String(Math.max(1, wait)) });
  }
  rl.c++;
  await kv.put(rlKey, JSON.stringify(rl), { expirationTtl: Math.max(60, Math.ceil((rl.t + RL_WIN * 1000 - now) / 1000)) });

  // dedupe identical submissions (one score per run ticket)
  const dupKey = x.tk ? 'dup:tk:' + x.tk : 'dup:' + e.id;
  if (await kv.get(dupKey)) return json({ ok: true, dup: true, id: e.id });
  await kv.put(dupKey, '1', { expirationTtl: DUP_TTL });

  // only runs that carry a server ticket and lasted plausibly long reach 'top'; the rest still show in 'recent'
  let tkv = null; if (x.tk) { try { tkv = JSON.parse(await kv.get('tk:' + x.tk) || 'null'); } catch { } }
  e.ok = tkv && typeof tkv.t0 === 'number' && now - tkv.t0 >= minMs(e) ? 1 : 0;

  const [top, recent] = await Promise.all([getList(kv, 'top'), getList(kv, 'recent')]);
  let rank = null;
  if (e.ok && !top.some(y => y && y.id === e.id)) {
    top.push(e); top.sort(cmp); top.length = Math.min(top.length, TOP_N);
    const i = top.findIndex(x => x.id === e.id); rank = i >= 0 ? i + 1 : null;
    if (rank) await kv.put('top', JSON.stringify(top));
  }
  const rec = [e, ...recent.filter(x => x && x.id !== e.id)].slice(0, RECENT_N);
  await kv.put('recent', JSON.stringify(rec));

  // presence ends with the run; the run counts toward its day's stats
  // share counters (x.ss) ride along only when 'live' is written anyway, so they never cost a write of their own
  let day = null, ss = 0;
  if (x.sid || x.day) {
    try {
      const v = prune(await readLive(kv));
      if (x.sid) delete v.u[x.sid];
      const fresh = x.day && Math.abs(Date.parse(x.day) - now) < 3 * 86400e3;
      if (fresh) {
        const d = v.d[x.day] || (v.d[x.day] = { n: 0, h: 0, w: 0, f: 0 });
        d.n++; d.h += x.dh; d.w += e.won ? 1 : 0; d.f += e.floor; day = d;
      }
      if (x.ss) {
        const k = fresh ? x.day : thDay(now);
        const d = v.d[k] || (v.d[k] = { n: 0, h: 0, w: 0, f: 0 });
        const t = d.ss && typeof d.ss === 'object' ? d.ss : (d.ss = {});
        for (const j in x.ss) t[j] = (Number.isInteger(t[j]) ? t[j] : 0) + x.ss[j];
      }
      prune(v);
      await writeLive(kv, v);
      ss = x.ss ? 1 : 0;
    } catch { }
  }
  return json({ ok: true, id: e.id, rank, v: e.ok, day, ss });
}
