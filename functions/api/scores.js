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
//         optional header 'Authorization: Bearer <token>' = the account.js session (same as /api/acct). If it is a live session the
//         account name is read from D1 (acct_sess JOIN acct, one read, no write) and stored on the row as 'ac' (v0.3.5); never taken
//         from the body. Bad/expired/missing token, or no account tables yet -> no 'ac', the score is still accepted.

import { store, tix, update } from './store.js';
import { who, okName, isAdmin, ensureSchema, hit } from './acctlib.js';
import { editLive, okDay, okDv, ipKey, shareStats, addShare } from './live.js';
import { fnv, clean, json, isInt, thDay, sameOrigin, RANKS, CLS, DRG } from './util.js';
const TOP_N = 100, RECENT_N = 50, HOF_N = 100;
const RL_MAX = 10, RL_WIN = 600;          // 10 posts / 10 min / IP
const DV_MAX = 150;                       // posts / Thai day / device, per IP row (v2.7)
const DUP_TTL = 86400;
const MAX_BODY = 4096;
const IP_TOP = 3;                         // ok rows one IP may hold in 'top' (its best ones); the IP hash is never sent out
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

// ---- shared with leaderboard.js (keep identical; fnv and clean are in util.js, tools/sync-check.js compares them) ----
export function canon(e) { return [e.name, e.village, e.rankK, e.clsId, e.form, e.floor, e.won ? 1 : 0, e.title, e.score, e.karma, e.gen, e.ach, e.date].join('|'); }
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
const HOF_K = ['id', 'name', 'village', 'rankK', 'clsId', 'clsN', 'form', 'floor', 'won', 'title', 'score', 'gen', 'date', 'drg', 'clan', 'lk', 'gear', 'ac'];
const hofRow = e => { const o = {}; for (const k of HOF_K) if (e[k] !== undefined) o[k] = e[k]; return o; };
export function hofMerge(hof, top, recent) {
  const seen = new Set(), out = [];
  for (const y of [...hof, ...top, ...recent]) {
    if (!y || typeof y !== 'object' || !y.won || y.ok === 0 || seen.has(y.id)) continue;
    seen.add(y.id); out.push(hofRow(y));
  }
  return out.sort((a, b) => b.date - a.date).slice(0, HOF_N);
}

// posts without a D1 ticket. D1: atomic counters (acctlib.js hit) per IP per RL_WIN and per device per Thai day.
// KV-only: one row per IP, {t, c} = posts in the current RL_WIN window, {d, k:{devHash: n}} = posts per device today
async function limited(env, kv, ip, dv, now) {
  const dk = dv ? fnv('tof-dv|' + dv) : '', db = env.TOF_DB;
  if (db) {
    if (await hit(db, 'rl:' + fnv(ip), RL_WIN * 1000, now, RL_MAX) > RL_MAX) return { wait: RL_WIN };
    if (dk && await hit(db, 'dv:' + dk + ':' + thDay(now), 2 * 86400e3, now, DV_MAX) > DV_MAX) return { wait: 3600, dev: 1 };
    return null;
  }
  const key = 'rl:' + fnv(ip);
  let rl = null; try { rl = JSON.parse(await kv.get(key) || 'null'); } catch { }
  if (!rl || typeof rl !== 'object' || Array.isArray(rl)) rl = {};
  if (typeof rl.t !== 'number' || typeof rl.c !== 'number' || now - rl.t >= RL_WIN * 1000) { rl.t = now; rl.c = 0; }
  if (rl.d !== thDay(now) || !rl.k || typeof rl.k !== 'object') { rl.d = thDay(now); rl.k = {}; }
  if (rl.c >= RL_MAX) return { wait: Math.max(1, Math.ceil((rl.t + RL_WIN * 1000 - now) / 1000)) };
  if (dk && (rl.k[dk] | 0) >= DV_MAX) return { wait: 3600, dev: 1 };
  rl.c++;
  if (dk) { rl.k[dk] = (rl.k[dk] | 0) + 1; const ks = Object.keys(rl.k); if (ks.length > 64) delete rl.k[ks[0]]; }
  await kv.put(key, JSON.stringify(rl), { expirationTtl: 2 * 86400 });
  return null;
}

export const cmp = (a, b) => (b.won - a.won) || (b.floor - a.floor) || (b.score - a.score) || (a.date - b.date);

const listOf = s => { try { const a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; } catch { return []; } };
const getList = async (kv, key) => { try { return listOf(await kv.get(key)); } catch { return []; } };
const pubRow = ({ ip, ...y }) => y;
// 'top' with e added: sorted, cut to TOP_N, each IP keeping only its IP_TOP best rows -> the new list, or null if e did not make it
export function addTop(top, e) {
  if (top.some(y => y && y.id === e.id)) return null;
  const n = {};
  const out = [...top, e].filter(Boolean).sort(cmp).filter(y => !y.ip || (n[y.ip] = (n[y.ip] | 0) + 1) <= IP_TOP).slice(0, TOP_N);
  return out.some(y => y.id === e.id) ? out : null;
}

// admin only (acctlib.js isAdmin, from the signed-in account in D1): remove one row from 'top', 'recent' and 'hof'
async function del(env, kv, request, id) {
  let u = null; try { u = env.TOF_DB && await who(env.TOF_DB, request, Date.now()); } catch { }
  if (!u || !isAdmin(env, u.name)) return json({ error: 'forbidden' }, 403);
  if (typeof id !== 'string' || !/^[a-z0-9]{1,16}$/.test(id)) return json({ error: 'invalid', field: 'id' }, 400);
  let n = 0;
  for (const k of ['top', 'recent', 'hof']) {
    if (await update(kv, k, s => { const a = listOf(s), b = a.filter(y => !(y && y.id === id)); return b.length < a.length ? JSON.stringify(b) : null; })) n++;
  }
  return json({ ok: true, n });
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
  return json({ top: top.map(pubRow), recent }, 200, { 'Cache-Control': 'public, max-age=30' });
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
  if (body && body.a === 'del') return del(env, kv, request, body.id);

  const { e, x, err } = validate(body);
  if (err) return json({ error: 'invalid', field: err }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const now = Date.now(), T = tix(env), db = env.TOF_DB;
  // which ticket: a D1 row (tix), else a KV ticket 'tk:<id>' (KV-only mode, or issued before the D1 cut)
  let tkv = null, how = '';
  if (x.tk && T) { try { tkv = await T.get(x.tk); } catch { } if (tkv) how = 'd1'; }
  if (x.tk && !tkv) { try { tkv = JSON.parse(await kv.get('tk:' + x.tk) || 'null'); } catch { } if (tkv && typeof tkv.t0 === 'number') how = 'kv'; else tkv = null; }

  if (how === 'd1') {
    // one score per ticket: the stamp is the dedupe, and tickets are already limited per IP when issued (live.js)
    if (tkv.u || !await T.use(x.tk)) return json({ ok: true, dup: true, id: e.id });
  } else {
    // no D1 ticket: the same entry again is a dup (0 writes), otherwise the per-IP limiter
    if (!x.tk) {
      const [top, recent] = await Promise.all([getList(kv, 'top'), getList(kv, 'recent')]);
      if (recent.some(y => y && y.id === e.id) || top.some(y => y && y.id === e.id)) return json({ ok: true, dup: true, id: e.id });
    }
    if (db) await ensureSchema(db);
    const lim = await limited(env, kv, ip, x.dv, now);
    if (lim) return json(lim.dev ? { error: 'rate-limited', scope: 'dev', retryAfter: lim.wait } : { error: 'rate-limited', retryAfter: lim.wait }, 429, { 'Retry-After': String(lim.wait) });
    if (how === 'kv') {
      // one score per KV ticket; with D1 the counter makes two posts sent at once count as one
      const dupKey = 'dup:tk:' + x.tk;
      if (db ? await hit(db, dupKey, DUP_TTL * 1000, now, 1) > 1 : await kv.get(dupKey)) return json({ ok: true, dup: true, id: e.id });
      if (!db) await kv.put(dupKey, '1', { expirationTtl: DUP_TTL });
    }
  }

  // account name (v0.3.5): only from a live session in D1, cleaned like every other name; anything wrong just leaves 'ac' off
  if (db && request.headers.get('Authorization')) {
    try { const u = await who(db, request, now); const ac = u && clean(String(u.name || ''), 16); if (ac && okName(ac)) e.ac = ac; } catch { }
  }

  // only runs that carry a server ticket and pass the checks reach 'top'; the rest still show in 'recent' with ok:0
  const why = !tkv ? 'tk' : now - tkv.t0 < minMs(e) ? 'time' : tkv.dv && tkv.dv !== x.dv ? 'dv' : implausible(e);
  e.ok = why ? 0 : 1;
  if (why) e.nok = why;

  // every list below goes through update() (store.js), so two scores arriving together cannot wipe each other out
  let rank = null;
  if (e.ok) {
    const row = { ...e, ip: tkv.ip || ipKey(request) };   // kept on 'top' only, for the per-IP cap; GET strips it
    await update(kv, 'top', s => { const out = addTop(listOf(s), row); rank = out ? out.findIndex(y => y.id === e.id) + 1 : null; return out && JSON.stringify(out); });
  }
  await update(kv, 'recent', s => JSON.stringify([e, ...listOf(s).filter(y => y && y.id !== e.id)].slice(0, RECENT_N)));

  // hall of fame (v0.2.8): only ticketed wins, so this write happens on ~3-4% of runs
  let hofOk = 0;
  if (e.won && e.ok) {
    hofOk = await update(kv, 'hof', s => { const hof = listOf(s); return hof.some(y => y && y.id === e.id) ? null : JSON.stringify([hofRow(e), ...hof].slice(0, HOF_N)); }) ? 1 : 0;
  }

  // the run counts toward its day's stats; KV-only mode also ends its presence in 'live'.u
  // share counters (x.ss) ride along only when 'live' is written anyway, so they never cost a write of their own
  let day = null, ss = 0;
  const dayFresh = !!x.day && Math.abs(Date.parse(x.day) - now) < 3 * 86400e3;
  if (T ? dayFresh || x.ss : x.sid || x.day) {
    try {
      await editLive(kv, v => {
        day = null;
        if (x.sid) delete v.u[x.sid];
        if (dayFresh) {
          const d = v.d[x.day] || (v.d[x.day] = { n: 0, h: 0, w: 0, f: 0 });
          d.n++; d.h += x.dh; d.w += e.won ? 1 : 0; d.f += e.floor; day = d;
        }
        if (x.ss) addShare(v, dayFresh ? x.day : thDay(now), x.ss);
      });
      ss = x.ss ? 1 : 0;
    } catch { }
  }
  return json({ ok: true, id: e.id, rank, v: e.ok, day, ss, hof: hofOk });
}
