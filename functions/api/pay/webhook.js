// Cloudflare Pages Function: /api/pay/webhook — Stripe tells us a payment went through
// Stripe dashboard -> Developers -> Webhooks -> endpoint https://tower-of-fate.pages.dev/api/pay/webhook
// events: checkout.session.completed, checkout.session.async_payment_succeeded
// The Stripe-Signature header is checked with STRIPE_WEBHOOK_SECRET (HMAC-SHA256, 5 minute tolerance) before anything is read.
// A paid session becomes one row in `ent` keyed by the session id, so a retried webhook adds nothing.

import { ensureSchema, json, dbErr, CATALOG, shopOpen, hex, same } from '../acctlib.js';

const TOL = 300;   // seconds

async function hmac(secret, msg) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg))));
}
// header: t=<unix>,v1=<hex>[,v1=<hex>...]
export async function verify(raw, header, secret, nowSec) {
  if (!header || !secret) return false;
  let t = 0; const v1 = [];
  for (const part of header.split(',')) { const i = part.indexOf('='); if (i < 0) continue; const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim(); if (k === 't') t = +v; else if (k === 'v1') v1.push(v); }
  if (!t || !v1.length || Math.abs(nowSec - t) > TOL) return false;
  const want = await hmac(secret, t + '.' + raw);
  return v1.some(s => same(s, want));
}

export async function onRequestPost({ request, env }) {
  if (!shopOpen(env)) return json({ error: 'closed' }, 503);
  const db = env.TOF_DB;
  if (!db) return json({ error: 'not-ready' }, 503);
  try { await ensureSchema(db); } catch (e) { return json({ error: 'not-ready' }, 503); }
  const raw = await request.text();
  if (raw.length > 200000) return json({ error: 'too-large' }, 413);
  if (!(await verify(raw, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET, Math.floor(Date.now() / 1000)))) return json({ error: 'signature' }, 400);
  let ev = null; try { ev = JSON.parse(raw); } catch { }
  if (!ev || typeof ev !== 'object') return json({ error: 'bad-json' }, 400);
  if (ev.type !== 'checkout.session.completed' && ev.type !== 'checkout.session.async_payment_succeeded') return json({ ok: true, skip: ev.type });
  const s = ev.data && ev.data.object;
  if (!s || typeof s.id !== 'string') return json({ error: 'bad-event' }, 400);
  // PromptPay can finish later: completed + unpaid now, async_payment_succeeded when the money arrives
  if (s.payment_status !== 'paid') return json({ ok: true, skip: 'unpaid' });
  const md = s.metadata || {}, sku = md.sku, uid = parseInt(md.uid || s.client_reference_id, 10), c = CATALOG[sku];
  // Stripe keeps retrying on a non-2xx answer; a session we cannot use is logged and acknowledged
  if (!c || !uid || uid < 1) { console.log('pay: unknown session', s.id, sku, uid); return json({ ok: true, skip: 'unknown' }); }
  if ((s.currency || '').toLowerCase() !== 'thb' || (s.amount_total | 0) < c.amt) { console.log('pay: amount mismatch', s.id, s.amount_total, s.currency); return json({ ok: true, skip: 'amount' }); }
  try {
    await db.prepare('INSERT INTO ent (id, uid, sku, qty, amt, cur, at) VALUES (?, ?, ?, 1, ?, ?, ?) ON CONFLICT(id) DO NOTHING')
      .bind(s.id, uid, sku, s.amount_total | 0, 'thb', Date.now()).run();
    return json({ ok: true });
  } catch (e) { return dbErr(e); }
}

export function onRequestGet() { return json({ error: 'method-not-allowed' }, 405, { Allow: 'POST' }); }
