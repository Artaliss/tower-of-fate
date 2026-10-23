-- v2.7 online memorial /m/<id>
-- used by functions/api/memorial.js, functions/api/candle.js and functions/m/[[path]].js
-- The functions never create these tables themselves; until this runs they answer 503 {error:'not-ready'}.
-- Run once on the D1 database tower-of-fate (binding TOF_DB):
--   npx wrangler d1 execute tower-of-fate --remote --file=migrations/0001_memorial.sql
-- or paste it into Cloudflare dashboard -> Storage & Databases -> D1 -> tower-of-fate -> Console.
-- Move codes (/api/move) need no table: they live in the existing kv table of functions/api/store.js.
-- Later: column memorial.seen is added by the functions themselves (see migrations/0004_memorial_seen.sql).

CREATE TABLE IF NOT EXISTS memorial (
  id  TEXT PRIMARY KEY,              -- 9 chars [a-z2-9]
  at  INTEGER NOT NULL,              -- created at, ms
  dk  TEXT NOT NULL,                 -- SHA-256 hex of the owner's removal key (the key itself stays in the owner's browser)
  ip  TEXT NOT NULL DEFAULT '',      -- hashed IP of the creator
  d   TEXT NOT NULL,                 -- cleaned run JSON (scene descriptors, no pictures), <= 16 KB
  c   INTEGER NOT NULL DEFAULT 0,    -- candles lit
  w0  INTEGER NOT NULL DEFAULT 0,    -- guestbook: how many times each of the 5 fixed words was left
  w1  INTEGER NOT NULL DEFAULT 0,
  w2  INTEGER NOT NULL DEFAULT 0,
  w3  INTEGER NOT NULL DEFAULT 0,
  w4  INTEGER NOT NULL DEFAULT 0,
  rp  INTEGER NOT NULL DEFAULT 0,    -- reports from distinct IPs
  hid INTEGER NOT NULL DEFAULT 0     -- 1 = hidden (3 reports); delete the row by hand to remove it for good
);
CREATE INDEX IF NOT EXISTS memorial_hid_at ON memorial (hid, at);
CREATE INDEX IF NOT EXISTS memorial_ip_at ON memorial (ip, at);

-- link preview image drawn by the client (600x315 JPEG ~25-40 KB base64 now; older rows 1200x630 PNG/JPEG up to ~300 KB;
-- the server stores nothing over 160 KB). Rows are deleted together with their memorial, orphans by the sweep.
CREATE TABLE IF NOT EXISTS memorial_img (
  id   TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  b64  TEXT NOT NULL
);

-- per-IP counters with expiry: one candle / one word per memorial per day, report once, creations per day
CREATE TABLE IF NOT EXISTS memorial_act (
  k   TEXT PRIMARY KEY,
  n   INTEGER NOT NULL DEFAULT 1,
  exp INTEGER NOT NULL               -- ms; expired rows are swept now and then
);
CREATE INDEX IF NOT EXISTS memorial_act_exp ON memorial_act (exp);
