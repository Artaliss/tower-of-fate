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

Stored data is visible in the dashboard under Workers KV → `tower-of-fate-scores` → KV Pairs:
`top` (best 100), `recent` (last 50), plus short-lived `rl:*` (rate limit) and `dup:*` keys.
To reset the board, delete `top` and `recent`.

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

Responses: `200 {ok, id, rank}` (rank is null if it missed the top 100), `200 {ok, dup:true}`
for a repeat, `400 {error:'invalid', field}`, `403` other origin, `413` body over 4 KB,
`415` wrong content type, `429` after 10 posts per IP per 10 minutes, `503` no KV.

`drg` and `clan` are deliberately left out of `canon()`, so clients cached from before v2.1
(which don't send them) still pass the integrity check. The flip side is that they aren't
covered by `h`. `floor` stays capped at 100 even after the secret floor, and `won` stays a
boolean; the board shows a 🐉 สหายมังกร / ⚔ นักล่ามังกร badge for `drg` `f` / `s` and an
"อาชีพลับ" tag on `dsl` rows. Sorting is unchanged.

The `h` field only stops casual edits. Anyone who reads `leaderboard.js` can forge a valid
entry, so treat the board as for fun. If cheating becomes a problem, delete the bad entries
from `top` in the dashboard.

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
extra KV write. `day` is the entry's `day` when within 3 days, otherwise today's Thai
date. Entries without `sid`/`day` don't write `live`, so their `ss` is not counted and the
response says `ss:0`. The client subtracts the sent counters from localStorage only when a
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
