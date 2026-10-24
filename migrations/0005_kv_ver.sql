-- v0.3.5.7: write counter on the kv table + index for the per-IP ticket count.
-- No manual step needed: functions/api/store.js adds the column on first use in each isolate (and treats
-- "duplicate column name" as already done) and creates the index together with the tix table.
-- Running it by hand is also fine (the ALTER fails harmlessly if the column already exists):
--   npx wrangler d1 execute tower-of-fate --remote --file=migrations/0005_kv_ver.sql
--
-- kv.ver goes up by one on every update() (store.js). A read-modify-write of 'top', 'recent', 'hof', 'live' or 'posts'
-- only lands with "WHERE k = ? AND ver = ?", so two requests at once can no longer wipe each other's change.

ALTER TABLE kv ADD COLUMN ver INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS tix_ip ON tix (ip, t);
