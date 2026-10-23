// Cloudflare Pages Function: /api/acct — player accounts (name + password, no e-mail) and one cloud save per account
// Tables: migrations/0003_account.sql. Tables are created on first request (ensureSchema in acctlib.js).
// Every POST must come from this site (Origin check). Signed-in actions send `Authorization: Bearer <token>`.
// POST {a:'signup', name, pw}          -> {ok, name, tok, exp}
// POST {a:'login', name, pw}           -> {ok, name, tok, exp}   | 401 {error:'bad-login'} | 429 {error:'rate-limited', retryAfter}
// POST {a:'logout'}                    -> {ok}
// POST {a:'passwd', pw, npw}           -> {ok, tok, exp}  (every other session of this account is signed out)
// POST {a:'me'}                        -> {ok, name, save:{at,m}|null, ent:[{id,sku,qty,at}], shop}
// POST {a:'save', z, p, m}             -> {ok, at}        p = the tof-* key set from savemove.js (z:'gz' = gzip + base64)
// POST {a:'load'}                      -> {ok, at, z, p, m} | 404 {error:'no-save'}

import { readBody, sameOrigin } from './memorial.js';
import { ensureSchema, json, dbErr, ipOf, iterOf, okName, okPw, nameKey, pbkdf2, hex, rand, same, count, hit, newSession, who, ents, shopOpen } from './acctlib.js';

const MAX_BODY = 1200000, MAX_P = 1100000;
const FAIL_NAME = 8, FAIL_IP = 40, FAIL_WIN = 15 * 60e3;   // wrong passwords: 8 per name, 40 per IP, per 15 min
const SIGNUP_IP = 5, SIGNUP_WIN = 3600e3;                  // 5 new accounts / IP / hour
const SAVE_GAP = 15e3;                                     // at most one upload per 15 s per account

function meta(m) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return {};
  const o = {};
  for (const k of ['keys', 'memo', 'lines', 'ach', 'unl', 'gen']) if (typeof m[k] === 'number' && Number.isInteger(m[k]) && m[k] >= 0 && m[k] <= 1e6) o[k] = m[k];
  if (typeof m.hero === 'string') o.hero = m.hero.replace(/[<>"'`\\&\u0000-\u001f]/g, '').slice(0, 24);
  if (typeof m.run === 'number' && m.run >= 0 && m.run <= 101) o.run = Math.floor(m.run);
  return o;
}
const wait = (ms) => { const s = Math.max(1, Math.ceil(ms / 1000)); return json({ error: 'rate-limited', retryAfter: s }, 429, { 'Retry-After': String(s) }); };

export async function onRequestPost({ request, env }) {
  const db = env && env.TOF_DB;
  if (!db) return json({ error: 'not-ready' }, 503);
  try { await ensureSchema(db); } catch (e) { return json({ error: 'not-ready' }, 503); }
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { b, res } = await readBody(request, MAX_BODY);
  if (res) return res;
  const now = Date.now(), ip = ipOf(request);
  try {
    if (b.a === 'signup') {
      if (!okName(b.name)) return json({ error: 'bad-name' }, 400);
      if (!okPw(b.pw)) return json({ error: 'bad-pw' }, 400);
      if (await count(db, 'su:' + ip, now) >= SIGNUP_IP) return wait(SIGNUP_WIN);
      await hit(db, 'su:' + ip, SIGNUP_WIN, now);
      const name = b.name.normalize('NFC'), nk = nameKey(name);
      if (await db.prepare('SELECT id FROM acct WHERE nk = ?').bind(nk).first()) return json({ error: 'taken' }, 409);
      const salt = hex(rand(16)), iter = iterOf(env), hash = await pbkdf2(b.pw, salt, iter);
      let r;
      try { r = await db.prepare('INSERT INTO acct (name, nk, salt, hash, iter, at, pw_at, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(name, nk, salt, hash, iter, now, now, ip).run(); }
      catch (e) { if (/UNIQUE/i.test(String(e && e.message))) return json({ error: 'taken' }, 409); throw e; }
      const uid = r && r.meta && r.meta.last_row_id;
      if (!uid) return json({ error: 'storage' }, 500);
      const s = await newSession(db, uid, now);
      return json({ ok: true, name, tok: s.tok, exp: s.exp });
    }

    if (b.a === 'login') {
      if (!okName(b.name) || typeof b.pw !== 'string' || b.pw.length > 200) return json({ error: 'bad-login' }, 401);
      const nk = nameKey(b.name);
      if (await count(db, 'fn:' + nk, now) >= FAIL_NAME || await count(db, 'fi:' + ip, now) >= FAIL_IP) return wait(FAIL_WIN);
      const a = await db.prepare('SELECT id, name, salt, hash, iter FROM acct WHERE nk = ?').bind(nk).first();
      const ok = !!a && same(await pbkdf2(b.pw, a.salt, a.iter), a.hash);
      if (!ok) { await hit(db, 'fn:' + nk, FAIL_WIN, now); await hit(db, 'fi:' + ip, FAIL_WIN, now); return json({ error: 'bad-login' }, 401); }
      const s = await newSession(db, a.id, now);
      return json({ ok: true, name: a.name, tok: s.tok, exp: s.exp });
    }

    const u = await who(db, request, now);
    if (!u) return json({ error: 'auth' }, 401);

    if (b.a === 'logout') {
      await db.prepare('DELETE FROM acct_sess WHERE th = ?').bind(u.th).run();
      return json({ ok: true });
    }
    if (b.a === 'passwd') {
      if (!okPw(b.npw)) return json({ error: 'bad-pw' }, 400);
      if (typeof b.pw !== 'string' || b.pw.length > 200) return json({ error: 'bad-login' }, 401);
      if (await count(db, 'fu:' + u.uid, now) >= FAIL_NAME) return wait(FAIL_WIN);
      const a = await db.prepare('SELECT salt, hash, iter FROM acct WHERE id = ?').bind(u.uid).first();
      if (!a || !same(await pbkdf2(b.pw, a.salt, a.iter), a.hash)) { await hit(db, 'fu:' + u.uid, FAIL_WIN, now); return json({ error: 'bad-login' }, 401); }
      const salt = hex(rand(16)), iter = iterOf(env), hash = await pbkdf2(b.npw, salt, iter);
      await db.prepare('UPDATE acct SET salt = ?, hash = ?, iter = ?, pw_at = ? WHERE id = ?').bind(salt, hash, iter, now, u.uid).run();
      await db.prepare('DELETE FROM acct_sess WHERE uid = ?').bind(u.uid).run();
      const s = await newSession(db, u.uid, now);
      return json({ ok: true, tok: s.tok, exp: s.exp });
    }
    if (b.a === 'me') {
      const sv = await db.prepare('SELECT at, m FROM acct_save WHERE uid = ?').bind(u.uid).first();
      let m = {}; try { m = JSON.parse(sv && sv.m || '{}'); } catch { }
      return json({ ok: true, name: u.name, save: sv ? { at: sv.at, m } : null, ent: await ents(db, u.uid), shop: shopOpen(env) });
    }
    if (b.a === 'save') {
      if (typeof b.p !== 'string' || !b.p.length || b.p.length > MAX_P) return json({ error: 'too-large' }, 413);
      const z = b.z === 'gz' ? 'gz' : '';
      if (z ? !/^[A-Za-z0-9+/]+={0,2}$/.test(b.p) : b.p[0] !== '{') return json({ error: 'invalid', field: 'p' }, 400);
      const sv = await db.prepare('SELECT at FROM acct_save WHERE uid = ?').bind(u.uid).first();
      if (sv && now - sv.at < SAVE_GAP) return wait(SAVE_GAP - (now - sv.at));
      await db.prepare('INSERT INTO acct_save (uid, at, z, p, m) VALUES (?, ?, ?, ?, ?) ON CONFLICT(uid) DO UPDATE SET at = excluded.at, z = excluded.z, p = excluded.p, m = excluded.m')
        .bind(u.uid, now, z, b.p, JSON.stringify(meta(b.m))).run();
      return json({ ok: true, at: now });
    }
    if (b.a === 'load') {
      const sv = await db.prepare('SELECT at, z, p, m FROM acct_save WHERE uid = ?').bind(u.uid).first();
      if (!sv) return json({ error: 'no-save' }, 404);
      let m = {}; try { m = JSON.parse(sv.m || '{}'); } catch { }
      return json({ ok: true, at: sv.at, z: sv.z || '', p: sv.p, m });
    }
    return json({ error: 'bad-action' }, 400);
  } catch (e) { return dbErr(e); }
}

export function onRequestGet() { return json({ error: 'method-not-allowed' }, 405, { Allow: 'POST' }); }
