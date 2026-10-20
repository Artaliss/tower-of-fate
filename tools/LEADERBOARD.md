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
`{name, village, rankK, clsId, clsN, form, floor, won, title, score, karma, gen, ach, date, v, h}`:

| field | rule |
|---|---|
| name / village / title / clsN | strings, control chars and HTML stripped, max 24 / 24 / 40 / 16 chars |
| rankK | F E D C B A S SS |
| clsId | war mag arc pri rog far dra |
| form | `slime`, `human` or empty |
| floor | integer 1 to 100; `won:true` requires floor 100 |
| score | integer 0 to 10,000,000 |
| karma | integer −9999 to 9999 |
| gen / ach | integers 1 to 9999 / 0 to 500 |
| date | ms timestamp within the last 30 days |
| h | FNV-1a of `"tof-v1|" + canon(fields)` (see `leaderboard.js`) |

Responses: `200 {ok, id, rank}` (rank is null if it missed the top 100), `200 {ok, dup:true}`
for a repeat, `400 {error:'invalid', field}`, `403` other origin, `413` body over 4 KB,
`415` wrong content type, `429` after 10 posts per IP per 10 minutes, `503` no KV.

The `h` field only stops casual edits. Anyone who reads `leaderboard.js` can forge a valid
entry, so treat the board as for fun. If cheating becomes a problem, delete the bad entries
from `top` in the dashboard.

## Local testing

`node tools/serve.js` has no `/api`, so the dialog shows the offline message and runs stay
queued in `localStorage` (`tof-lb-queue-v1`) until a load where the POST succeeds.
