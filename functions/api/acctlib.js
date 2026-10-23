// Shared helpers for accounts and the paid shop (acct.js, pay/checkout.js, pay/webhook.js). Not a route of its own.
// Tables: migrations/0003_account.sql (never created here; a missing table -> 503 not-ready via dbErr).

import { json, dbErr, fnv } from './memorial.js';
export { json, dbErr, fnv };

export const SESS_DAYS = 30;
// Workers refuse PBKDF2 above 100,000 rounds. Each account row keeps its own count, so lowering PBKDF2_ITER later
// (if logins hit the CPU limit) does not lock anyone out.
export const iterOf = env => { const n = +(env && env.PBKDF2_ITER); return Number.isInteger(n) && n >= 10000 && n <= 100000 ? n : 100000; };

const enc = new TextEncoder();
export const hex = u8 => Array.from(u8, b => b.toString(16).padStart(2, '0')).join('');
export const unhex = s => new Uint8Array((s.match(/../g) || []).map(h => parseInt(h, 16)));
export const rand = n => crypto.getRandomValues(new Uint8Array(n));
export async function sha256(s) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))); }
export async function pbkdf2(pw, saltHex, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: iter }, key, 256);
  return hex(new Uint8Array(bits));
}
// compares two equal-length hex strings without stopping at the first difference
export function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export const ipOf = request => fnv('ac|' + (request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown'));

// ---- names and passwords ----
// 3-16 characters: Thai letters, a-z, 0-9, _ ; compared lowercased
export const NAME_RE = /^[a-zA-Z0-9_ก-๎]{3,16}$/;
export const nameKey = s => String(s).normalize('NFC').toLowerCase();
export const okName = s => typeof s === 'string' && NAME_RE.test(s.normalize('NFC'));
export const okPw = s => typeof s === 'string' && s.length >= 8 && s.length <= 72;

// ---- counters (acct_lim) ----
export async function count(db, k, now) {
  const r = await db.prepare('SELECT n, exp FROM acct_lim WHERE k = ?').bind(k).first();
  return r && r.exp > now ? r.n | 0 : 0;
}
export async function hit(db, k, win, now) {
  await db.prepare('INSERT INTO acct_lim (k, n, exp) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = CASE WHEN exp > ? THEN n + 1 ELSE 1 END, exp = CASE WHEN exp > ? THEN exp ELSE excluded.exp END')
    .bind(k, now + win, now, now).run();
  if (Math.random() < 0.02) await db.prepare('DELETE FROM acct_lim WHERE exp < ?').bind(now).run();
}

// ---- sessions ----
export const tokenOf = request => {
  const h = request.headers.get('Authorization') || '';
  const m = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(h.trim());
  return m ? m[1] : '';
};
const b64u = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function newSession(db, uid, now) {
  const tok = b64u(rand(32));
  await db.prepare('INSERT INTO acct_sess (th, uid, at, exp) VALUES (?, ?, ?, ?)').bind(await sha256(tok), uid, now, now + SESS_DAYS * 86400e3).run();
  if (Math.random() < 0.05) await db.prepare('DELETE FROM acct_sess WHERE exp < ?').bind(now).run();
  return { tok, exp: now + SESS_DAYS * 86400e3 };
}
// -> {uid, name, th} or null
export async function who(db, request, now) {
  const tok = tokenOf(request); if (!tok) return null;
  const th = await sha256(tok);
  const r = await db.prepare('SELECT s.uid AS uid, s.exp AS exp, a.name AS name FROM acct_sess s JOIN acct a ON a.id = s.uid WHERE s.th = ?').bind(th).first();
  return r && r.exp > now ? { uid: r.uid, name: r.name, th } : null;
}

// ---- shop catalog (prices live here, never trusted from the game) ----
// amount in satang (THB x 100). Stripe's minimum for THB is 10 baht.
// k: what the game does with it (account.js `GIVE`): sm = member slots, sp = pet slots, g = city coins, w = outfit key
export const CATALOG = {
  slot_m5: { n: 'ช่องสมาชิกตระกูล +5', d: 'ปลดช่องสมาชิกเพิ่ม 5 ช่อง (สูงสุด 20)', amt: 3900, k: 'sm', v: 5 },
  slot_p1: { n: 'ช่องสัตว์เลี้ยง +1', d: 'ปลดช่องสัตว์เลี้ยงเพิ่ม 1 ช่อง (สูงสุด 6)', amt: 2900, k: 'sp', v: 1 },
  gold_s: { n: 'ถุงเหรียญเมือง 3,000', d: 'เหรียญเมือง 3,000 เหรียญ', amt: 3500, k: 'g', v: 3000 },
  gold_l: { n: 'หีบเหรียญเมือง 10,000', d: 'เหรียญเมือง 10,000 เหรียญ', amt: 9900, k: 'g', v: 10000 },
  wear_halo: { n: 'วงแหวนเทวดา', d: 'ชุดแฟชั่นพิเศษ ให้คนในตระกูลสวมได้ทุกคน', amt: 2900, k: 'w', v: 'halo' },
  wear_drhelm: { n: 'หมวกเขามังกร', d: 'ชุดแฟชั่นพิเศษ ให้คนในตระกูลสวมได้ทุกคน', amt: 2900, k: 'w', v: 'drhelm' },
};
export const shopOpen = env => !!(env && env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
export async function ents(db, uid) {
  const r = await db.prepare('SELECT id, sku, qty, at FROM ent WHERE uid = ? ORDER BY at').bind(uid).all();
  return (r && r.results || []).map(x => ({ id: x.id, sku: x.sku, qty: x.qty | 0, at: x.at }));
}
