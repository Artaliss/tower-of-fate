// Cloudflare Pages Function: /api/candle  — light a candle on an online memorial (v2.7)
// POST {id} -> {ok, c, dup?}  one candle per memorial per IP per day (Thai date), at most ACT_PER_DAY actions per IP per day
// storage: D1 tables from migrations/0001_memorial.sql; helpers shared with ./memorial.js

import { ipOf, dbErr, dbOf, bump, readBody } from './memorial.js';
import { json, okId, thDay, sameOrigin } from './util.js';

const MAX_BODY = 256, ACT_PER_DAY = 60, DAY = 86400e3;

export async function onRequestPost({ request, env }) {
  const db = dbOf(env);
  if (!db) return json({ error: 'not-ready' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { b, res } = await readBody(request, MAX_BODY);
  if (res) return res;
  if (!okId(b.id)) return json({ error: 'not-found' }, 404);
  const now = Date.now(), ip = ipOf(request), day = thDay(now);
  try {
    const row = await db.prepare('SELECT c, hid FROM memorial WHERE id = ?').bind(b.id).first();
    if (!row || row.hid) return json({ error: 'not-found' }, 404);
    if (await bump(db, 'ad:' + ip + ':' + day, 2 * DAY, now, ACT_PER_DAY) > ACT_PER_DAY) return json({ error: 'rate-limited' }, 429);
    const dup = await bump(db, 'c:' + b.id + ':' + ip + ':' + day, 2 * DAY, now, 1) > 1;
    if (dup) return json({ ok: true, dup: true, c: row.c | 0 });
    const r = await db.prepare('UPDATE memorial SET c = c + 1 WHERE id = ? RETURNING c').bind(b.id).first();
    return json({ ok: true, c: r ? r.c | 0 : (row.c | 0) + 1 });
  } catch (e) { return dbErr(e); }
}

export function onRequestGet() { return json({ error: 'method-not-allowed' }, 405, { Allow: 'POST' }); }
