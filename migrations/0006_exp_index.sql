-- indexes for the expired-row sweeps in functions/api/acctlib.js
-- No manual step needed: acctlib.js ensureSchema() creates them on first use (IF NOT EXISTS).
--   npx wrangler d1 execute tower-of-fate --remote --file=migrations/0006_exp_index.sql
--
-- hit() deletes expired acct_lim rows on 2% of calls and newSession() deletes expired acct_sess rows on 5% of logins.
-- Without an index on exp each of those deletes reads the whole table.

CREATE INDEX IF NOT EXISTS acct_lim_exp ON acct_lim (exp);
CREATE INDEX IF NOT EXISTS acct_sess_exp ON acct_sess (exp);
