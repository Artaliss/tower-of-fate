// Cloudflare Pages Function: /api/scores
// storage: store(env) = D1 TOF_DB or KV TOF_KV (keys: 'top' = top 100, 'recent' = last 50, 'rl:<ip>' rate limit for posts without a D1 ticket)
//          run tickets: D1 table tix (store.js tix()), stamped used by the score = the dedupe; KV-only mode: 'tk:<id>' + 'dup:tk:<id>'
// GET  -> {top:[...], recent:[...]}  (Cache-Control: max-age=30)
// POST -> body = entry JSON (see LEADERBOARD.md) -> {ok:true, id, rank, v, day, ss} | {error}
//         optional 'ss' = share counters (v2.3), summed into live.d[day].ss; response ss:1 means they were counted (v2.7 clients send them to /api/live instead)
//         optional 'dv' = device id (v2.7): must match the dv the ticket was issued to; posts without a D1 ticket also meet
//         DV_MAX per device per Thai day, counted inside the same 'rl:<ip>' row as the per-IP limit
//         optional 'lk' / 'gear' = hero look + carried gear for the hall of fame (v0.2.8), stored on the row, not part of canon()
//         ok:0 rows carry nok = why: 'tk' no ticket, 'time' too fast, 'dv' other device, 'score' / 'drg' does not add up
//         a ticketed win (ok:1) is also kept in 'hof' (newest HOF_N winners): one extra write, only on won runs; response hof:1
// GET ?hof=1 -> {hof:[...]} winners from 'hof' + any won rows still in 'top'/'recent' (covers wins from before 'hof' existed)

import { store, tix } from './store.js';
import { readLive, prune, writeLive, okDay, okDv, thDay, shareStats, addShare } from './live.js';
const TOP_N = 100, RECENT_N = 50, HOF_N = 100;
const RL_MAX = 10, RL_WIN = 600;          // 10 posts / 10 min / IP
const DV_MAX = 150;                       // posts / Thai day / device, per IP row (v2.7)
const DUP_TTL = 86400;
const MAX_BODY = 4096;
const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS'];
const CLS = ['war', 'mag', 'arc', 'pri', 'rog', 'far', 'dra', 'dsl', 'nec', 'ang'];
const DRG = ['', 'n', 'f', 's', 'x'];   // secret dragon floor result (v2.1) — not part of canon()
const CLAN = ['', 'f', 's', 'd'];       // family dragon mark (v2.1) — not part of canon()
const FORMS = ['slime', 'human', ''];
// hall of fame (v0.2.8): pet ids that may appear in lk.p (append new pets here and in leaderboard.js) and gear ids
const PETS = ['slime', 'fox', 'owl', 'wolf', 'drk', 'drs', 'drg', 'unicorn', 'fairy', 'phoenix', 'griffin'];
const GEAR = ['excal'];   // excal = Excalibur carried across lives
const SALT = 'tof-v1';
// anti-cheat for 'top' (v2.2, tightened with the D1 cut). Each check is lenient on purpose: a real run must never fail it.
// Time: a ticketed run must have lasted this long on the server clock. At the top speed (16x) a floor tick lasts 312 ms, a quiet
// stretch 1.6 ticks, a key moment at least one tick; the fastest of 20,000 simulated lives (tools/autosim.js logic) needed 4.9 s
// for 20 floors, 13.8 s for 50 and 28 s for a win, so 280 ms a floor minus 3 s stays below every one of them.
const minMs = e => Math.max(0, Math.min(e.floor, 100) * 280 - 3000);
// Score: auto.js ledgerRoll() gives score = max(0, base + karma points), base = floor (100 on a win) + 3 per boss + 30 for a win
// + round(level / 2) + 10 or 15 for the secret floor, karma points = at most 14 ledger rows of +-2..6 (so within +-84).
// Bounds use more bosses (floor/10 + 2) and higher levels (floor + 30) than any simulated life reached.
const KPTS = 14 * 6;
export function implausible(e) {
  const fl = e.won ? 100 : e.floor, s101 = e.floor === 101;
  const hi = fl + 3 * (Math.floor(fl / 10) + 2) + (e.won ? 30 : 0) + Math.ceil((fl + 30) / 2) + (s101 ? 15 : 0) + KPTS;
  const lo = Math.max(0, fl + (e.won ? 30 : 0) + (s101 ? 10 : 0) - KPTS);
  if (e.score > hi || e.score < lo) return 'score';
  if (e.drg && e.floor < 100) return 'drg';   // the dragon floor only opens after floor 100
  return '';
}

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
// lk = {f:'s'|'h', s:uint32 seed, p?:[pet id, max 2]} (v0.2.8), gear = [gear id, max 4]; anything else -> null (field dropped)
function lookIn(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  if (v.f !== 's' && v.f !== 'h') return null;
  if (typeof v.s !== 'number' || !Number.isInteger(v.s) || v.s < 0 || v.s > 4294967295) return null;
  const o = { f: v.f, s: v.s };
  if (Array.isArray(v.p)) { const p = [...new Set(v.p.slice(0, 4).filter(x => typeof x === 'string' && PETS.includes(x)))].slice(0, 2); if (p.length) o.p = p; }
  return o;
}
function gearIn(v) {
  if (!Array.isArray(v)) return null;
  const g = [...new Set(v.slice(0, 8).filter(x => typeof x === 'string' && GEAR.includes(x)))].slice(0, 4);
  return g.length ? g : null;
}
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
  const lk = lookIn(b.lk), gear = gearIn(b.gear);
  if (lk) e.lk = lk;
  if (gear) e.gear = gear;
  // v2.2 run ticket / presence id / daily theme (not stored, not part of canon)
  const x = { tk: typeof b.tk === 'string' && /^[a-f0-9]{20}$/.test(b.tk) ? b.tk : '', sid: typeof b.sid === 'string' && /^[a-z0-9]{6,24}$/.test(b.sid) ? b.sid : '',
    day: okDay(b.day) ? b.day : '', dh: b.dh === 1 ? 1 : 0, ss: shareStats(b.ss), dv: okDv(b.dv) ? b.dv : '' };
  if (typeof b.h !== 'string' || b.h !== fnv(SALT + '|' + canon(e))) return { err: 'integrity' };
  e.id = fnv(canon(e)) + e.date.toString(36).slice(-3);
  e.at = now;
  return { e, x };
}

// share analytics (v2.3): old clients piggyback share counters on a score post, summed into live.d[day].ss (shareStats/addShare live in live.js since v2.7)

// hall of fame row: what a card needs, nothing more
const HOF_K = ['id', 'name', 'village', 'rankK', 'clsId', 'clsN', 'form', 'floor', 'won', 'title', 'score', 'gen', 'date', 'drg', 'clan', 'lk', 'gear'];
const hofRow = e => { const o = {}; for (const k of HOF_K) if (e[k] !== undefined) o[k] = e[k]; return o; };
export function hofMerge(hof, top, recent) {
  const seen = new Set(), out = [];
  for (const y of [...hof, ...top, ...recent]) {
    if (!y || typeof y !== 'object' || !y.won || y.ok === 0 || seen.has(y.id)) continue;
    seen.add(y.id); out.push(hofRow(y));
  }
  return out.sort((a, b) => b.date - a.date).slice(0, HOF_N);
}

// one row per IP for posts without a D1 ticket: {t, c} = posts in the current RL_WIN window, {d, k:{devHash: n}} = posts per device today
async function limited(kv, ip, dv, now) {
  const key = 'rl:' + fnv(ip);
  let rl = null; try { rl = JSON.parse(await kv.get(key) || 'null'); } catch { }
  if (!rl || typeof rl !== 'object' || Array.isArray(rl)) rl = {};
  if (typeof rl.t !== 'number' || typeof rl.c !== 'number' || now - rl.t >= RL_WIN * 1000) { rl.t = now; rl.c = 0; }
  if (rl.d !== thDay(now) || !rl.k || typeof rl.k !== 'object') { rl.d = thDay(now); rl.k = {}; }
  if (rl.c >= RL_MAX) return { wait: Math.max(1, Math.ceil((rl.t + RL_WIN * 1000 - now) / 1000)) };
  const dk = dv ? fnv('tof-dv|' + dv) : '';
  if (dk && (rl.k[dk] | 0) >= DV_MAX) return { wait: 3600, dev: 1 };
  rl.c++;
  if (dk) { rl.k[dk] = (rl.k[dk] | 0) + 1; const ks = Object.keys(rl.k); if (ks.length > 64) delete rl.k[ks[0]]; }
  await kv.put(key, JSON.stringify(rl), { expirationTtl: 2 * 86400 });
  return null;
}

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
  if (new URL(request.url).searchParams.get('hof') === '1') {
    const [hof, top, recent] = await Promise.all([getList(kv, 'hof'), getList(kv, 'top'), getList(kv, 'recent')]);
    return json({ hof: hofMerge(hof, top, recent) }, 200, { 'Cache-Control': 'public, max-age=60' });
  }
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

  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const now = Date.now(), T = tix(env);
  // which ticket: a D1 row (tix), else a KV ticket 'tk:<id>' (KV-only mode, or issued before the D1 cut)
  let tkv = null, how = '';
  if (x.tk && T) { try { tkv = await T.get(x.tk); } catch { } if (tkv) how = 'd1'; }
  if (x.tk && !tkv) { try { tkv = JSON.parse(await kv.get('tk:' + x.tk) || 'null'); } catch { } if (tkv && typeof tkv.t0 === 'number') how = 'kv'; else tkv = null; }

  const [top, recent] = await Promise.all([getList(kv, 'top'), getList(kv, 'recent')]);
  if (how === 'd1') {
    // one score per ticket: the stamp is the dedupe, and tickets are already limited per IP when issued (live.js)
    if (tkv.u || !await T.use(x.tk)) return json({ ok: true, dup: true, id: e.id });
  } else {
    // no D1 ticket: the same entry again is a dup (0 writes), otherwise one limiter row per IP
    if (!x.tk && (recent.some(y => y && y.id === e.id) || top.some(y => y && y.id === e.id))) return json({ ok: true, dup: true, id: e.id });
    const lim = await limited(kv, ip, x.dv, now);
    if (lim) return json(lim.dev ? { error: 'rate-limited', scope: 'dev', retryAfter: lim.wait } : { error: 'rate-limited', retryAfter: lim.wait }, 429, { 'Retry-After': String(lim.wait) });
    if (how === 'kv') {
      const dupKey = 'dup:tk:' + x.tk;
      if (await kv.get(dupKey)) return json({ ok: true, dup: true, id: e.id });
      await kv.put(dupKey, '1', { expirationTtl: DUP_TTL });
    }
  }

  // only runs that carry a server ticket and pass the checks reach 'top'; the rest still show in 'recent' with ok:0
  const why = !tkv ? 'tk' : now - tkv.t0 < minMs(e) ? 'time' : tkv.dv && tkv.dv !== x.dv ? 'dv' : implausible(e);
  e.ok = why ? 0 : 1;
  if (why) e.nok = why;

  let rank = null;
  if (e.ok && !top.some(y => y && y.id === e.id)) {
    top.push(e); top.sort(cmp); top.length = Math.min(top.length, TOP_N);
    const i = top.findIndex(x => x.id === e.id); rank = i >= 0 ? i + 1 : null;
    if (rank) await kv.put('top', JSON.stringify(top));
  }
  const rec = [e, ...recent.filter(x => x && x.id !== e.id)].slice(0, RECENT_N);
  await kv.put('recent', JSON.stringify(rec));

  // hall of fame (v0.2.8): only ticketed wins, so this write happens on ~3-4% of runs
  let hofOk = 0;
  if (e.won && e.ok) {
    const hof = await getList(kv, 'hof');
    if (!hof.some(y => y && y.id === e.id)) {
      await kv.put('hof', JSON.stringify([hofRow(e), ...hof].slice(0, HOF_N)));
      hofOk = 1;
    }
  }

  // the run counts toward its day's stats; KV-only mode also ends its presence in 'live'.u
  // share counters (x.ss) ride along only when 'live' is written anyway, so they never cost a write of their own
  let day = null, ss = 0;
  const dayFresh = !!x.day && Math.abs(Date.parse(x.day) - now) < 3 * 86400e3;
  if (T ? dayFresh || x.ss : x.sid || x.day) {
    try {
      const v = prune(await readLive(kv));
      if (x.sid) delete v.u[x.sid];
      const fresh = dayFresh;
      if (fresh) {
        const d = v.d[x.day] || (v.d[x.day] = { n: 0, h: 0, w: 0, f: 0 });
        d.n++; d.h += x.dh; d.w += e.won ? 1 : 0; d.f += e.floor; day = d;
      }
      if (x.ss) addShare(v, fresh ? x.day : thDay(now), x.ss);
      prune(v);
      await writeLive(kv, v);
      ss = x.ss ? 1 : 0;
    } catch { }
  }
  return json({ ok: true, id: e.id, rank, v: e.ok, day, ss, hof: hofOk });
}
