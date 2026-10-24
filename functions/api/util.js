// Small helpers shared by the /api functions (scores, posts, live, memorial, ...). Not a route of its own.

export const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS'];
export const CLS = ['war', 'mag', 'arc', 'pri', 'rog', 'far', 'dra', 'dsl', 'nec', 'ang'];
export const DRG = ['', 'n', 'f', 's', 'x'];   // secret dragon floor result (v2.1)

// fnv is shared with leaderboard.js (keep identical, checked by tools/sync-check.js)
export function fnv(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
// strips tags, control / bidi characters and quotes; num = also accept a number (memorial.js)
export function clean(v, max, num) {
  let s = typeof v === 'string' ? v : num && typeof v === 'number' ? String(v) : '';
  s = s.replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g, '')
    .replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim();
  return Array.from(s).slice(0, max).join('').trim();
}

const SEC = { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' };
export const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { ...SEC, 'Cache-Control': 'no-store', ...extra } });
export const isInt = (v, lo, hi) => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
export const okId = s => typeof s === 'string' && /^[a-z2-9]{9}$/.test(s);
// a D1 row holds at most 2 MB; the save string is stored as UTF-8 (Thai letters take 3 bytes)
export const fitsRow = s => new TextEncoder().encode(s).length <= 1900000;
// longest save string /api/acct and /api/move take. A gzip save grows ~110 chars a life (memorial + lineage), so this fits
// ~3,000 lives; it keeps one IP from filling D1's 500 MB fast (acct: 5 accounts a day, move: 6 codes a day, 3 days each).
export const MAX_SAVE = 400000;
export const thDay = now => new Date(now + 7 * 3600e3).toISOString().slice(0, 10);
// hash of the caller's IP for rate limits. IPv6 keeps only the /64 (one home gets 2^64 addresses), IPv4 is used as-is so
// hashes already stored stay the same. Each caller keeps its own salt.
export function ipHash(request, salt) {
  let ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  if (ip.includes(':') && !ip.includes('.')) {   // '::ffff:1.2.3.4' (IPv4 inside IPv6) stays whole
    const [a, b] = ip.toLowerCase().split('::'), L = a ? a.split(':') : [], R = b ? b.split(':') : [];
    const g = b === undefined ? L : [...L, ...Array(Math.max(0, 8 - L.length - R.length)).fill('0'), ...R];
    ip = g.slice(0, 4).map(x => x.replace(/^0+(?=.)/, '')).join(':');
  }
  return fnv(salt + ip);
}

// same-origin only: reject requests whose Origin/Referer belongs to another site
export function sameOrigin(request) {
  const self = new URL(request.url).origin;
  const o = request.headers.get('Origin');
  if (o) return o === self;
  const r = request.headers.get('Referer');
  if (r) { try { return new URL(r).origin === self; } catch { return false; } }
  return request.method === 'GET';   // POST without Origin/Referer is not from our page
}

// confirm-screen summary of a save (savemove.js summary()), rebuilt from an allow-list; used by /api/acct and /api/move
export function saveMeta(m) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return {};
  const o = {};
  for (const k of ['keys', 'memo', 'lines', 'ach', 'unl', 'gen']) if (typeof m[k] === 'number' && Number.isInteger(m[k]) && m[k] >= 0 && m[k] <= 1e6) o[k] = m[k];
  for (const [h, r] of [['hero', 'run'], ['chero', 'crun']]) {   // chero/crun = run left open in the classic copy (tofc-*)
    if (typeof m[h] === 'string') o[h] = m[h].replace(/[<>"'`\\&\u0000-\u001f]/g, '').slice(0, 24);
    if (typeof m[r] === 'number' && m[r] >= 0 && m[r] <= 101) o[r] = Math.floor(m[r]);
  }
  if (typeof m.h === 'string' && /^[0-9a-z]{1,13}$/.test(m.h)) o.h = m.h;   // hash of the save, so a browser can tell the cloud copy is its own
  return o;
}
