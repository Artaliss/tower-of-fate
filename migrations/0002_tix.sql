-- Run tickets in D1 (D1 write cut, 2026-10-22), used by functions/api/live.js and functions/api/scores.js.
-- You do not have to run this: functions/api/store.js runs the same CREATE TABLE IF NOT EXISTS on first use.
-- It is here so the schema is written down, and for running by hand if you prefer:
--   npx wrangler d1 execute tower-of-fate --remote --file=migrations/0002_tix.sql
-- or paste it into Cloudflare dashboard -> Storage & Databases -> D1 -> tower-of-fate -> Console.
--
-- One row per run. Written once when the run starts (/api/live start) and stamped once (u = 1) when its score arrives.
-- The key starts with the issue time, so "playing now" (t in the last 20 min and u = 0) and the per-IP ticket limit
-- read a short range of the key. WITHOUT ROWID means no separate index, so each insert or stamp bills 1 row written.
-- The ticket string the client holds is t as 11 hex digits followed by r (9 hex digits).
-- Rows older than 30 days are deleted now and then by store.js (0.2% of ticket requests).

CREATE TABLE IF NOT EXISTS tix (
  t  INTEGER NOT NULL,            -- issued at, ms (server clock)
  r  TEXT NOT NULL,               -- 9 random hex digits
  ip TEXT NOT NULL DEFAULT '',    -- hashed IP of the requester
  dv TEXT NOT NULL DEFAULT '',    -- device id sent with the request ('' from clients older than this change)
  u  INTEGER NOT NULL DEFAULT 0,  -- 1 = a score has used this ticket
  PRIMARY KEY (t, r)
) WITHOUT ROWID;
