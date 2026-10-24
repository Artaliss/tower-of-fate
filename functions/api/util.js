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
export const thDay = now => new Date(now + 7 * 3600e3).toISOString().slice(0, 10);

// same-origin only: reject requests whose Origin/Referer belongs to another site
export function sameOrigin(request) {
  const self = new URL(request.url).origin;
  const o = request.headers.get('Origin');
  if (o) return o === self;
  const r = request.headers.get('Referer');
  if (r) { try { return new URL(r).origin === self; } catch { return false; } }
  return request.method === 'GET';   // POST without Origin/Referer is not from our page
}
