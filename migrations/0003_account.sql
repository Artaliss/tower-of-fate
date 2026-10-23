-- Accounts, cloud saves and paid entitlements (login + shop)
-- used by functions/api/acct.js, functions/api/pay/checkout.js and functions/api/pay/webhook.js (helpers in functions/api/acctlib.js)
-- The functions never create these tables themselves; until this runs they answer 503 {error:'not-ready'}.
-- Run once on the D1 database tower-of-fate (binding TOF_DB):
--   npx wrangler d1 execute tower-of-fate --remote --file=migrations/0003_account.sql
-- or paste it into Cloudflare dashboard -> Storage & Databases -> D1 -> tower-of-fate -> Console.

CREATE TABLE IF NOT EXISTS acct (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,                -- as typed at sign-up (shown in the game)
  nk    TEXT NOT NULL UNIQUE,         -- lowercased NFC name, used for lookups
  salt  TEXT NOT NULL,                -- 16 random bytes, hex
  hash  TEXT NOT NULL,                -- PBKDF2-SHA256 of the password, 32 bytes hex
  iter  INTEGER NOT NULL,             -- PBKDF2 rounds used for this hash
  at    INTEGER NOT NULL,             -- created at, ms
  pw_at INTEGER NOT NULL,             -- password last changed, ms
  ip    TEXT NOT NULL DEFAULT ''      -- hashed IP at sign-up
);

-- login sessions: only the SHA-256 of the token is kept; the token itself lives in the player's browser (tof-acct-v1)
CREATE TABLE IF NOT EXISTS acct_sess (
  th  TEXT PRIMARY KEY,               -- SHA-256 hex of the session token
  uid INTEGER NOT NULL,
  at  INTEGER NOT NULL,
  exp INTEGER NOT NULL                -- ms, 30 days after login
);
CREATE INDEX IF NOT EXISTS acct_sess_uid ON acct_sess (uid);

-- one cloud save per account: the same tof-* key set savemove.js moves, as one JSON string (z = 'gz' -> gzip + base64)
CREATE TABLE IF NOT EXISTS acct_save (
  uid INTEGER PRIMARY KEY,
  at  INTEGER NOT NULL,               -- uploaded at, ms (server clock)
  z   TEXT NOT NULL DEFAULT '',
  p   TEXT NOT NULL,                  -- <= ~1.1 MB
  m   TEXT NOT NULL DEFAULT '{}'      -- small summary for the confirm screen
);

-- counters with expiry: failed logins per name / per IP, sign-ups per IP
CREATE TABLE IF NOT EXISTS acct_lim (
  k   TEXT PRIMARY KEY,
  n   INTEGER NOT NULL DEFAULT 1,
  exp INTEGER NOT NULL                -- ms; expired rows are swept now and then
);

-- things bought with real money, written only by the Stripe webhook (never by the game)
CREATE TABLE IF NOT EXISTS ent (
  id  TEXT PRIMARY KEY,               -- Stripe Checkout Session id (cs_...), so a webhook sent twice adds nothing
  uid INTEGER NOT NULL,
  sku TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  amt INTEGER NOT NULL DEFAULT 0,     -- amount paid, satang
  cur TEXT NOT NULL DEFAULT 'thb',
  at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ent_uid ON ent (uid);
