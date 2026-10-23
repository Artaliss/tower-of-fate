// Cloudflare Pages Function: /api/pay/checkout — start a Stripe Checkout payment for one shop item (card or PromptPay, THB)
// Closed (503 {error:'closed'}) until both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set on the Pages project.
// GET                       -> {open, items:{sku:{n,d,amt}}}   the catalog the shop shows (prices from acctlib.js)
// POST {sku} + Bearer token -> {ok, url}   the game sends the player to url; Stripe returns them to /?paid=<sku> or /?paid=0
// Nothing is granted here: only webhook.js writes the ent table, after Stripe confirms the money arrived.

import { readBody, sameOrigin } from '../memorial.js';
import { json, dbErr, who, CATALOG, shopOpen, count, hit } from '../acctlib.js';

const BUY_MAX = 20, BUY_WIN = 3600e3;   // 20 checkout pages / account / hour

export function onRequestGet({ env }) {
  const items = {};
  for (const k in CATALOG) { const c = CATALOG[k]; items[k] = { n: c.n, d: c.d, amt: c.amt }; }
  return json({ open: shopOpen(env), items });
}

export async function onRequestPost({ request, env }) {
  if (!shopOpen(env)) return json({ error: 'closed' }, 503);
  const db = env.TOF_DB;
  if (!db) return json({ error: 'not-ready' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { b, res } = await readBody(request, 2000);
  if (res) return res;
  const now = Date.now();
  try {
    const u = await who(db, request, now);
    if (!u) return json({ error: 'auth' }, 401);
    const sku = typeof b.sku === 'string' && Object.prototype.hasOwnProperty.call(CATALOG, b.sku) ? b.sku : '';
    if (!sku) return json({ error: 'bad-sku' }, 400);
    if (await count(db, 'buy:' + u.uid, now) >= BUY_MAX) return json({ error: 'rate-limited' }, 429);
    await hit(db, 'buy:' + u.uid, BUY_WIN, now);
    const c = CATALOG[sku], origin = new URL(request.url).origin;
    const f = new URLSearchParams();
    f.set('mode', 'payment');
    f.append('payment_method_types[]', 'card');
    f.append('payment_method_types[]', 'promptpay');
    f.set('line_items[0][quantity]', '1');
    f.set('line_items[0][price_data][currency]', 'thb');
    f.set('line_items[0][price_data][unit_amount]', String(c.amt));
    f.set('line_items[0][price_data][product_data][name]', c.n);
    f.set('line_items[0][price_data][product_data][description]', c.d);
    f.set('client_reference_id', String(u.uid));
    f.set('metadata[uid]', String(u.uid));
    f.set('metadata[sku]', sku);
    f.set('payment_intent_data[metadata][uid]', String(u.uid));
    f.set('payment_intent_data[metadata][sku]', sku);
    f.set('locale', 'th');
    f.set('success_url', origin + '/?paid=' + sku);
    f.set('cancel_url', origin + '/?paid=0');
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: f.toString(),
    });
    let j = null; try { j = await r.json(); } catch { }
    if (!r.ok || !j || typeof j.url !== 'string') return json({ error: 'stripe', detail: (j && j.error && j.error.message || '').slice(0, 200) }, 502);
    return json({ ok: true, url: j.url });
  } catch (e) { return dbErr(e); }
}
