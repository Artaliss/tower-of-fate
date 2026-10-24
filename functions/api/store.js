// Storage shim (v2.4.1). KV's free tier allows 1,000 writes/day (~160 runs), so data lives in D1 (100,000 rows written/day free).
// store(env) -> KV-like {get(k), put(k, v, {expirationTtl})}: D1 binding TOF_DB when present, else plain TOF_KV.
// A key missing from D1 is read from KV once, so 'top', 'recent', 'posts' and old run tickets carry over without a migration step.
// D1 table: kv(k TEXT PRIMARY KEY, v TEXT, exp INTEGER ms|null, ver INTEGER), created on first use.
// ver (migrations/0005_kv_ver.sql, added here on first use) counts writes, so update() can tell when someone wrote in between.

let ready = null;
const init = db => ready || (ready = (async () => {
  await db.prepare('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL, exp INTEGER, ver INTEGER NOT NULL DEFAULT 0)').run();
  try { await db.prepare('ALTER TABLE kv ADD COLUMN ver INTEGER NOT NULL DEFAULT 0').run(); }
  catch (e) { if (!/duplicate column/i.test(String(e && e.message || e))) throw e; }
})().catch(e => { ready = null; throw e; }));

// read-modify-write of one key: fn(current string | null) -> new string, or null to write nothing. Returns true if it wrote.
// D1: the write only lands if nobody wrote the row since it was read, else fn runs again on the fresh value (3 tries),
// so two requests at once cannot wipe each other's change. fn may run more than once. Plain KV (no D1) cannot do this.
export async function update(kv, k, fn, o) {
  if (kv.update) return kv.update(k, fn);
  const v = fn(await kv.get(k));
  if (v == null) return false;
  await kv.put(k, String(v), o);
  return true;
}

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
    async update(k, fn) {
      await init(db);
      for (let i = 0; i < 3; i++) {
        const r = await db.prepare('SELECT v, exp, ver FROM kv WHERE k = ?').bind(k).first();
        let cur = r && !(r.exp && r.exp <= Date.now()) ? r.v : null;
        if (!r && kv) { try { cur = await kv.get(k); } catch { } }
        const v = fn(cur);
        if (v == null) return false;
        const w = r ? await db.prepare('UPDATE kv SET v = ?, ver = ver + 1 WHERE k = ? AND ver = ?').bind(String(v), k, r.ver | 0).run()
          : await db.prepare('INSERT INTO kv (k, v, exp) VALUES (?, ?, NULL) ON CONFLICT(k) DO NOTHING').bind(k, String(v)).run();
        if (w && w.meta && w.meta.changes) return true;
      }
      throw new Error('busy');
    },
  };
}

// ---- run tickets in D1 (D1 write cut, 2026-10-22) ----
// One row per run, written once at /api/live start and stamped once when the score arrives (u = 1).
// The primary key starts with the issue time, so "playing now" (tickets from the last 20 min not yet used) and the per-IP
// ticket limit are short range scans that only read; WITHOUT ROWID keeps every insert/update at 1 row written.
// tk = issue time in ms as 11 hex digits + 9 random hex digits (still the 20-hex format old clients accept).
// Table: migrations/0002_tix.sql, also created here on first use. Without TOF_DB, tix(env) is null and live.js / scores.js
// keep the older KV keys ('live' presence, 'tk:<id>', 'dup:tk:<id>').
const TIX_SQL = "CREATE TABLE IF NOT EXISTS tix (t INTEGER NOT NULL, r TEXT NOT NULL, ip TEXT NOT NULL DEFAULT '', dv TEXT NOT NULL DEFAULT '', u INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (t, r)) WITHOUT ROWID";
const TIX_IP = 'CREATE INDEX IF NOT EXISTS tix_ip ON tix (ip, t)';   // byIp() without a full scan
let tixReady = null;
const tixInit = db => tixReady || (tixReady = db.batch([db.prepare(TIX_SQL), db.prepare(TIX_IP)]).catch(e => { tixReady = null; throw e; }));
export const TIX_KEEP = 30 * 86400e3;   // rows older than this are swept now and then (a score must be dated within 30 days anyway)

export function tkSplit(tk) {
  if (typeof tk !== 'string' || !/^[a-f0-9]{20}$/.test(tk)) return null;
  const t = parseInt(tk.slice(0, 11), 16), now = Date.now();
  // tickets from before this change are random hex; their first 11 digits almost never land in this window
  return t > now - TIX_KEEP && t <= now + 60e3 ? { t, r: tk.slice(11) } : null;
}

export function tix(env) {
  const db = env && env.TOF_DB;
  if (!db) return null;
  return {
    async issue(ip, dv) {
      await tixInit(db);
      const t = Date.now(), r = crypto.randomUUID().replace(/-/g, '').slice(0, 9);
      await db.prepare('INSERT INTO tix (t, r, ip, dv) VALUES (?, ?, ?, ?)').bind(t, r, ip || '', dv || '').run();
      if (Math.random() < 0.002) await db.prepare('DELETE FROM tix WHERE t < ?').bind(t - TIX_KEEP).run();
      return t.toString(16).padStart(11, '0') + r;
    },
    // -> {t0, ip, dv, u} or null when the ticket is not in the table
    async get(tk) {
      const p = tkSplit(tk); if (!p) return null;
      await tixInit(db);
      const x = await db.prepare('SELECT ip, dv, u FROM tix WHERE t = ? AND r = ?').bind(p.t, p.r).first();
      return x ? { t0: p.t, ip: x.ip, dv: x.dv, u: x.u } : null;
    },
    // true only for the first caller, so a ticket carries exactly one score
    async use(tk) {
      const p = tkSplit(tk); if (!p) return false;
      const r = await db.prepare('UPDATE tix SET u = 1 WHERE t = ? AND r = ? AND u = 0').bind(p.t, p.r).run();
      return !!(r && r.meta && r.meta.changes);
    },
    async open(since) {
      await tixInit(db);
      const x = await db.prepare('SELECT COUNT(*) AS n FROM tix WHERE t > ? AND u = 0').bind(since).first();
      return x ? x.n | 0 : 0;
    },
    async byIp(ip, since) {
      await tixInit(db);
      const x = await db.prepare('SELECT COUNT(*) AS n FROM tix WHERE ip = ? AND t > ?').bind(ip, since).first();
      return x ? x.n | 0 : 0;
    },
  };
}
