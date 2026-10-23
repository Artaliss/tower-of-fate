# Leaderboard setup (Cloudflare Pages + KV)

The game posts finished runs to `/api/scores`, served by `functions/api/scores.js`
(a Pages Function deployed with the site). It needs one KV namespace bound as `TOF_KV`.
Without it the API answers `503 {"error":"kv-not-configured"}` and the game shows only the
local tabs (achievements, my runs). GitHub Pages has no functions, so the global board only
works on tower-of-fate.pages.dev.

## 1. Create the KV namespace

Cloudflare dashboard → Storage & Databases → Workers KV → Create a namespace
→ name it `tower-of-fate-scores` → Add.

## 2. Bind it to the Pages project

Workers & Pages → `tower-of-fate` → Settings → Bindings → Add → KV namespace
- Variable name: `TOF_KV` (exactly)
- KV namespace: `tower-of-fate-scores`

Save. Add the binding for both Production and Preview if the dashboard asks for each.

## 3. Redeploy

Bindings apply only to new deployments. Push any commit (or Deployments → latest →
Retry deployment). The `functions/` folder must be at the repo root next to `index.html`,
which it is.

## 4. Test

```sh
# empty board: {"top":[],"recent":[]}
curl -i https://tower-of-fate.pages.dev/api/scores
```

`503 kv-not-configured` means the binding is missing or the site wasn't redeployed.
`404` means the function wasn't deployed (check that `functions/api/scores.js` is in the commit).

Then play one run in the browser and open "อันดับ & ความสำเร็จ". The entry should appear in
"ล่าสุด" and (if good enough) "อันดับทั่วโลก", marked "คุณ". A hand-made curl POST is
rejected with 400 `integrity` or 403 (no same-site Origin), which is expected.

Since v2.4.1 the data lives in D1 (`TOF_DB`, table `kv`, see `functions/api/store.js`), with KV as the fallback.
Keys: `top` (best 100), `recent` (last 50), `hof`, `live`, plus short-lived `rl:*` (rate limit for posts without a D1
ticket). Run tickets are rows of the D1 table `tix` (see "Run tickets" below); in KV-only mode they are `tk:*` keys with
`dup:tk:*` as the dedupe. To reset the board, delete `top` and `recent`.

## API

`GET /api/scores` → `{top:[entry], recent:[entry]}`, `Cache-Control: public, max-age=30`.

`POST /api/scores` (`Content-Type: application/json`, same-origin) with
`{name, village, rankK, clsId, clsN, form, floor, won, title, score, karma, gen, ach, date, v, h}`
plus the optional v2.1 fields `drg` and `clan`:

| field | rule |
|---|---|
| name / village / title / clsN | strings, control chars and HTML stripped, max 24 / 24 / 40 / 16 chars |
| rankK | F E D C B A S SS |
| clsId | war mag arc pri rog far dra dsl (`dsl` = hidden class นักล่ามังกร, v2.1; append new ids at the end) |
| form | `slime`, `human` or empty |
| floor | integer 1 to 100; `won:true` requires floor 100 |
| score | integer 0 to 10,000,000 |
| karma | integer −9999 to 9999 |
| gen / ach | integers 1 to 9999 / 0 to 500 |
| date | ms timestamp within the last 30 days |
| drg | secret dragon floor result: `''` none, `n` found but declined, `f` spared the dragon (won), `s` killed it (won), `x` died to it. Anything else is stored as `''` |
| clan | family dragon mark after the run: `''`, `f` สหายมังกร, `s` นักล่ามังกร (cursed), `d` ดยุกปราบมังกร (curse lifted). Anything else is stored as `''` |
| h | FNV-1a of `"tof-v1|" + canon(fields)` (see `leaderboard.js`) |

Responses: `200 {ok, id, rank, v}` (rank is null if it missed the top 100, `v` is the `ok` flag), `200 {ok, dup:true}`
for a repeat, `400 {error:'invalid', field}`, `403` other origin, `413` body over 4 KB,
`415` wrong content type, `429` after 10 posts per IP per 10 minutes or 150 per device per Thai day (posts without a D1
ticket only), `503` no storage.

`drg` and `clan` are deliberately left out of `canon()`, so clients cached from before v2.1
(which don't send them) still pass the integrity check. The flip side is that they aren't
covered by `h`. `floor` stays capped at 100 even after the secret floor, and `won` stays a
boolean; the board shows a 🐉 สหายมังกร / ⚔ นักล่ามังกร badge for `drg` `f` / `s` and an
"อาชีพลับ" tag on `dsl` rows. Sorting is unchanged.

The `h` field only stops casual edits. Anyone who reads `leaderboard.js` can forge a valid
entry, so the server also checks each run before it may enter `top` (next section). Delete bad
entries with `tools/lb-remove.js`.

## Run tickets and the `ok` flag (v2.2, reworked with the D1 write cut)

`POST /api/live {a:'start', sid, dv}` returns `{tk, n}`. With D1, `tk` is one row of table `tix`:

```
tix(t INTEGER, r TEXT, ip TEXT, dv TEXT, u INTEGER, PRIMARY KEY (t, r)) WITHOUT ROWID
tk = t (issue time, ms) as 11 hex digits + r (9 random hex digits)   // same 20-hex format as before
```

`store.js` creates the table with `CREATE TABLE IF NOT EXISTS` on first use; `migrations/0002_tix.sql` has the same
schema for running by hand. Rows older than 30 days are deleted on 0.2% of ticket requests. A ticket request is
refused (the response has no `tk`) after 60 tickets from one IP in 10 minutes; the count is a read of the last
10 minutes of the key, so the limit costs no write.

A score with a D1 ticket stamps it (`UPDATE tix SET u = 1 WHERE ... AND u = 0`). That stamp is the dedupe: a second
post with the same ticket gets `{ok, dup:true}` and writes nothing. Such posts skip the `rl:` limiter, because tickets
are already limited when issued. Posts without a D1 ticket (old clients, KV-only mode, tickets from before the change)
go through one `rl:<ip>` row that holds both the per-IP window and the per-device daily counts; an identical entry
already in `top` or `recent` counts as a dup.

`e.ok` is 1 only when all of these hold; otherwise the row is stored with `ok:0` and `nok` set to the first failed
check, and it shows in `recent` only:

| nok | check |
|---|---|
| `tk` | the ticket exists (D1 row, or KV `tk:<id>`) |
| `time` | server time since the ticket ≥ `minMs` = `max(0, min(floor,100) × 280 − 3000)` ms (a win: 25 s). The fastest of 20,000 simulated lives at 16x took 4.9 s for 20 floors, 13.8 s for 50 and 28 s for a win |
| `dv` | a ticket issued with `dv` is used with the same `dv` (tickets from clients that sent no `dv` skip this) |
| `score` | `score` fits `ledgerRoll()` in auto.js: base = floor (100 on a win) + 3 per boss + 30 for a win + level/2 + 10/15 for the secret floor, plus or minus at most 84 karma points. The upper bound assumes floor/10 + 2 bosses and level floor + 30 |
| `drg` | `drg` is set only at floor 100 or 101 |

All bounds are loose on purpose. If a real player shows up with `ok:0`, read `nok` on the row in `recent` and widen
that check in `functions/api/scores.js`.

"Playing now" (`n` in `GET /api/live`) is the number of tickets issued in the last 20 minutes with no score yet,
cached per isolate for 20 s. The game no longer sends `{a:'beat'}`; an old client that still does gets `{n}` and
nothing is written. A run longer than 20 minutes drops out of the count. In KV-only mode `n` still comes from the
`live.u` presence map that `start` and `beat` write.

Writes per run with D1 (`node tools/lb-writes-test.mjs` counts them against a mock D1, `--kv` for KV-only):

| run | before | now |
|---|---|---|
| lost, not in top | 7 + 1 to 3 beats | 4 (ticket, stamp, `recent`, `live`) |
| lost, enters top | 8 + beats | 5 |
| won (top + `hof`) | 9 + beats | 6 |
| no ticket | 5 | 3 (`rl`, `recent`, `live`) |
| same ticket again | 2 | 0 |

## Local testing

`node tools/serve.js` has no `/api`, so the dialog shows the offline message and runs stay
queued in `localStorage` (`tof-lb-queue-v1`) until a load where the POST succeeds.

## Share analytics (v2.3, field `ss`)

`share.js` counts card opens and share actions in `localStorage['tof-share-stat-v1']`
(`{v:1, ao, mo, bo, sh:{img,line,x,threads,copy,native,save}, note}`). `leaderboard.js`
`submit()` attaches what is not yet reserved by other queued entries as a flat object
`ss:{ao,mo,bo,img,line,x,threads,copy,native,save,note}` (zero keys left out, each capped
at 50, the rest goes with the next run). `ss` is not part of `canon()`.

`scores.js` keeps only those keys with integers 1 to 50 and adds them into
`live.d[day].ss` inside the `live` write that the post already does, so it costs no
extra write. `day` is the entry's `day` when within 3 days, otherwise today's Thai
date. With D1, `live` is written when the entry has a fresh `day` or carries `ss`; in KV-only
mode, when it has `sid` or `day`. Otherwise `ss` is not counted and the response says `ss:0`. The client subtracts the sent counters from localStorage only when a
2xx response has `ss:1`; a dup, 4xx, network error or an older server keeps them for the
next run.

Read it (last 3 days are kept):

```sh
curl -s "https://tower-of-fate.pages.dev/api/live?day=2026-10-22"
# {"n":3,"day":{"n":41,"h":12,"w":1,"f":2010,"ss":{"ao":30,"mo":6,"img":4,"line":9,"copy":3,"note":2}}}
```

or open the `live` key in the KV dashboard. Rates per day: auto-open share rate =
`(img+line+x+threads+copy+native+save) / ao`, note usage = `note / shares`. Counters arrive
with the player's next finished run, so a day's numbers lag a little.

## Community wall "ชีวิตที่แบ่งปัน" (v2.3, `functions/api/posts.js`)

A tab in the leaderboard dialog. A post is an auto-built summary of one of the player's
own finished runs (from `tof-lb-mine-v1`) plus an optional quote. No accounts or usernames.

One KV key `posts` holds everything, so every accepted action is exactly 1 write:

```
{v:1,
 p:[{id, t, s:{n,r,c,o,f,w,d,ti,ca,g}, q, rm, rp, x?, k}],  // newest first, max 200
 qp:{<ipHash>:[ts]}, qa:{<ipHash>:[ts]},                   // post / react+report times in the last hour
 rk:['<ipHash>:<id>'], pk:[...]}                           // last 1500 react / report keys
```

`s` = name, rank, class id, form, floor (101 only with won + drg f/s), won 0/1, drg, title,
cause, generation. `rm` = ระลึกถึง count, `rp` = reports, `x:1` hidden, `k` = dedupe hash.

| request | result | KV writes |
|---|---|---|
| `GET /api/posts` | `{posts:[{id,t,s,q,rm}]}` newest 50 visible, `Cache-Control: public, max-age=20` (KV read cacheTtl 30) | 0 |
| `POST {a:'post', s, q}` | `200 {ok, post}` · `400 {error:'len'}` (quote 1 to 3 chars or over 300) · `400 {error:'filtered', why:'link'\|'personal'\|'abuse'}` · `409 {error:'dup'}` · `429 {error:'rate-limited', retryAfter}` (3 posts / IP / hour) · `429 {error:'busy'}` (40 posts / hour for everyone) | 1 (0 when rejected) |
| `POST {a:'react', id}` | `200 {ok, rm}`; same IP again → `{ok, dup:true}` | 1 (0 on repeat) |
| `POST {a:'report', id}` | `200 {ok}`; hidden after 3 reports from different IPs | 1 (0 on repeat) |

React + report share a cap of 40 per IP per hour. All POSTs need a same-origin `Origin`
(403 otherwise), JSON content type, body under 2 KB.

Filtering (server, `screen()` in posts.js, also applied to name/title/cause, which are
replaced or blanked instead of rejected): URLs, `www.`, `xxx.com`/`ดอท com`, short-link
hosts; emails, LINE id / `@handle` / "แอดไลน์"; 9+ digits after removing separators (Thai
digits too); a short Thai list matched with spaces/punctuation removed (avoiding stems hidden
inside game words such as หีบ, สัตว์เลี้ยง, สัดส่วน) and an English list with leetspeak.
Edit `TH_BAD` / `EN_SQUASH` / `EN_WORD` to tune.

Client remembers its own reactions, reports and posted run ids in
`localStorage['tof-posts-v1'] = {rm:[postId], rp:[postId], ps:[runId]}`. Without the function
(GitHub Pages, `tools/serve.js`) or without KV, the tab shows "ยังไม่เปิดใช้".

Moderation: to delete a post, edit the `posts` key in the KV dashboard (remove the item from
`p`, or set `"x":1`). Concurrent writes within ~1 s can overwrite each other (KV is last
write wins), so a reaction can occasionally be lost; acceptable for this traffic.

Write budget: each post / first reaction / first report = 1 write against the free 1,000/day
shared with the leaderboard. If reactions start eating the budget, lower `ACT_PER_HOUR`.

## Hall of fame "ผู้พิชิตยอด" (v0.2.8, fields `lk` and `gear`)

A tab in the leaderboard dialog with a card per winner (floor 100, or 🐉 101), drawn with the
game's own sprites (`ART.heroSpr`, `PSPR`, `ICONS.sword`). Two optional fields ride along with
the score post. Neither is part of `canon()` or `h`, so older clients still pass:

| field | rule |
|---|---|
| lk | `{f, s, p?}`: `f` is `'s'` slime or `'h'` human, `s` the look seed as an integer 0 to 4294967295 (a string seed from an old save is turned into the same number `seedOf()` gives), `p` up to 2 pet ids from `slime fox owl wolf drk drs drg`. If `f` or `s` is wrong the whole field is dropped; unknown pets are dropped |
| gear | array of up to 4 ids from `GEAR` (now only `excal`, Excalibur carried across lives). Unknown ids and repeats are dropped, an empty result drops the field |

`lookIn()` / `gearIn()` and the `PETS` / `GEAR` lists are in both `leaderboard.js` and
`scores.js`; keep them the same. New pets or gear go at the end of both lists. Both fields are
stored on the `top` / `recent` rows.

Storage: key `hof` holds the newest 100 winners, trimmed to what a card needs
(`id name village rankK clsId clsN form floor won title score gen date drg clan lk gear ac`).
It is written only for a ticketed win (`won` and `ok:1`), so it costs one extra write on roughly
3 to 4% of runs and nothing on the rest. The POST response then carries `hof:1`, which unlocks
the achievement `hof` (ขึ้นหอเกียรติยศ) through `ACH.grant('hof')`.

`GET /api/scores?hof=1` → `{hof:[row]}`, newest first, max 100, `Cache-Control: public, max-age=60`.
It merges `hof` with the won rows still in `top` and `recent` (skipping `ok:0`), so wins from
before the key existed show up too. Rows without `lk` are drawn from `form` with a face seeded
from the name, the same fallback old saves use.

Not wired yet: `summary.gear` (see the TODO in `toEntry()` in leaderboard.js). Add
`gear: carriesExcalibur ? ['excal'] : []` to `const sum = {...}` in auto.js.

## Account name on rows (v0.3.5, field `ac`)

When the player is signed in (account.js keeps the session in `tof-acct-v1`), `leaderboard.js`
sends the score with `Authorization: Bearer <token>`, the same header `/api/acct` uses. The body
never carries the name; an `ac` in the body is dropped by `validate()` like any unknown field.

`scores.js` looks the token up with `who()` from `acctlib.js` (one read: `acct_sess JOIN acct`,
no write), cleans the name with `clean(name, 16)` and checks it with `okName()`, then stores it as
`ac` on the row in `recent`, `top` and `hof`. A missing, malformed, unknown or expired token, or
account tables that do not exist yet, just leave `ac` off and the score goes through as before.
The lookup runs after the dup checks, so a duplicate post costs no extra read. `ac` is not part
of `canon()`, so ids and hashes are unchanged and old clients keep working.

Accounts have one name (login name = public name), so that is what shows. The sign-up form says
the name appears on the leaderboard.

Shown in: top and recent rows (first item of the grey line under the hero name, `👤 name`, cut
with `…` and a tooltip), hall of fame cards (line under the name), the "ของฉัน" tab (which
account is signed in, plus `ac` saved locally on each run) and the birth-screen feed in auto.js.
The ticket request (`/api/live start`) does not send the token.

Test: `node tools/lb-acct-test.mjs` (real SQLite as D1: session gives `ac`, bad/expired token
gives no `ac` but the score is accepted, body `ac` ignored, same writes with or without a session).
