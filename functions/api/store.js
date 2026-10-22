// Storage shim (v2.4.1). KV's free tier allows 1,000 writes/day (~160 runs), so data lives in D1 (100,000 rows written/day free).
// store(env) -> KV-like {get(k), put(k, v, {expirationTtl})}: D1 binding TOF_DB when present, else plain TOF_KV.
// A key missing from D1 is read from KV once, so 'top', 'recent', 'posts' and old run tickets carry over without a migration step.
// D1 table: kv(k TEXT PRIMARY KEY, v TEXT, exp INTEGER ms|null), created on first use.

let ready = null;
const init = db => ready || (ready = db.prepare('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL, exp INTEGER)').run()
  .catch(e => { ready = null; throw e; }));

export function store(env) {
  const db = env && env.TOF_DB, kv = env && env.TOF_KV;
  if (!db) return kv || null;
  return {
    async get(k) {
      await init(db);
      const r = await db.prepare('SELECT v, exp FROM kv WHERE k = ?').bind(k).first();
      if (r) return r.exp && r.exp <= Date.now() ? null : r.v;
      if (!kv) return null;
      try { return await kv.get(k); } catch { return null; }
    },
    async put(k, v, o) {
      await init(db);
      const exp = o && o.expirationTtl ? Date.now() + o.expirationTtl * 1000 : null;
      await db.prepare('INSERT INTO kv (k, v, exp) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, exp = excluded.exp')
        .bind(k, String(v), exp).run();
      // expired rate-limit / dedupe / ticket rows are swept now and then
      if (Math.random() < 0.01) await db.prepare('DELETE FROM kv WHERE exp IS NOT NULL AND exp < ?').bind(Date.now()).run();
    },
  };
}
