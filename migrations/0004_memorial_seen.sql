-- memorial.seen: last time anyone opened the memorial (ms), used to delete memorials nobody visits.
-- No manual step: functions/api/memorial.js ensureSeen() runs the ALTER below on first use in each isolate
-- and treats "duplicate column name" as already done. Running it by hand is also fine (it fails harmlessly if the column exists).
--   npx wrangler d1 execute tower-of-fate --remote --file=migrations/0004_memorial_seen.sql
--
-- Writes: /m/<id>, /m/<id>.png|.jpg and GET /api/memorial?id= set seen = now only when seen is older than 1 day.
-- Cleanup (about 1 in 100 of those views, sweepOld()): delete up to 50 memorials where
--   max(at, seen, 2026-10-23 00:00 UTC) < now - 90 days
-- (rows from before the column existed have seen = 0, so they count from 2026-10-23), then up to 50 memorial_img rows
-- whose memorial no longer exists. Hidden memorials (hid = 1) are never marked seen, so they expire the same way.

ALTER TABLE memorial ADD COLUMN seen INTEGER NOT NULL DEFAULT 0;
