# REA: 1-in-65-million-song.pages.dev ("1 ใน 65 ล้าน")

Target: https://1-in-65-million-song.pages.dev/ (captured 2026-10-20, read-only, headless Chrome via REA `capture_browser_scenario`, load + 2.5 s wait, no clicks).
Evidence: `ev_6417ab9b…6a38` (capture with response bodies), `ev_8a59d898…d0` (first capture, HTML body omitted by budget), `ev_9185627f…` (script export: none, since all JS is inline).
Local copy of the captured document: `C:\Users\mikky\AppData\Local\Temp\claude\C--Users-mikky-Desktop-Claude-Tower\817ede3d-dda1-4d65-af9a-f78b90bae2d6\scratchpad\site\index.html` (469 KB, 3,498 lines, readable, not minified).

## 0. Most important finding: it is not a song generator

The "song" in the subdomain is misleading. The page is a Thai 8-bit **life simulator** called "1 ใน 65 ล้าน" ("1 in 65 million"). Its `og:url` points to `one-in-65m.pages.dev`, so this looks like a second deployment (the "song" build). Music matters in this build, but it is **4 looping MP3 files (Pixabay)** cross-faded by life stage. There is no WebAudio synthesis, no procedural music, and no per-run song. Everything else (art, events, story text) is generated in code.

Network (observed): one HTML document (all CSS and JS inline), Google Fonts (Chakra Petch, IBM Plex Sans Thai, Silkscreen). MP3s are requested lazily, only after the first user gesture, so they do not appear in this capture. No API calls, no analytics, no backend.

## 1. What it is: the core loop

`boot()` → title screen → `playFrom(newPlayer())`, which loops forever:

```
live(p) = birth → stage1 school → stage2 uni → stage3 career (with stage4 marriage, stage5 kids as beats)
          → stage6 retirement → (throw Death anywhere) → stage7 funeral + karma ledger + score
summaryScreen → afterScreen: [play as child k | reborn (karma shifts wealth odds) | brand-new life]
```

- Six stats: H health (0 = death), J happiness, S skill, C connections (also sets funeral guest count), money (going negative turns into debt), and K karma, which stays **hidden until death**.
- Time moves by "beats": scheduled decisions at given ages. `years(p, n)` simulates the time between beats one year at a time (income × gauss noise, recession 10%/yr, interest, aging, habits, crime, omens) and then shows a **time-skip panel** with a per-year bar chart.
- Choices take three forms: `ask` (pick 1, keys 1–9), `say` (press Next or Enter), and `multi` (checkbox list with a running cost total). Unaffordable options show how many months of household income they would cost, for example "= 37 เดือนของรายได้บ้านคุณ".
- Outcomes use `roll3(p,[good,mid,bad])`. Each base distribution is shifted by `M = 0.3(S-50) + 0.2(C-50) + 0.05K`, and each band is clamped to 5–85%.

## 2. How "1 in 65 million" is computed and shown

**It is not a combinatorial rarity number.** It is the literal Thai population, and the birth is a weighted draw from real demographic tables:

```js
const POP_TOTAL = 65852335;
TIERS[1..6] = { name, H,J,C base stats, skip (grandparent-raised chance),
                q:[6 wealth-quintile %], prov:[[province, % of population]...] }
tier = wpick(TIERS, t => t.pct)   // t.pct = sum of its provinces' %
prov = wpick(tier.prov, x => x[1])
qi   = cumulative draw over tier.q  // Q1 poor .. TOP ultra-rich
sex 48.7% M; religion: 80% Islam in deep south, 6% tier 4, else 2%
```

Presentation on the birth screen (`birthHTML`):
- Title: "คุณคือ 1 ใน 65,852,335 คน". The exact digits with commas make it feel like a real number, not a slogan.
- Province tile: "โอกาส 2.73%" plus a small meter.
- **Wealth "ladder"**: 6 vertical bars showing each quintile's % in *your* region. Coin icons show the class (a crown for TOP). Your bar is gold and labeled "คุณ" ("you"). You see the odds you were drawn from, not only the result.
- Money tile: what your family can spend on you, plus your starting stat bars.

There is **no seed**. The game RNG is `Math.random` (`let RNG = Math.random`; it is swappable, but nothing swaps it). `mulberry32(seed)` is used only to make **visuals** deterministic: stars, window lights, the karma bookshelf, card starfields. Runs cannot be replayed or shared by seed.

**Rarity tiers** exist only at the end, as an **archetype title** (`archetype()`, about 30 ordered rules, first match wins):
- `rare:true` only for "ชีวิตครบสูตร" ("the complete life": rich, happy, healthy, respected, karma > −20). Its description says lives like this are few among 65 million. It is shown in gold instead of teal.
- Other examples: "เจ้าพ่อแห่ง<province>" (local godfather, uses your province), "จนแต่สุข" (poor but happy), "เศรษฐีผู้เดียวดาย" (lonely millionaire), "คนที่ถูกลืม" (the forgotten one, <40 funeral guests), fallback "คนธรรมดาคนหนึ่ง" (an ordinary person, "like millions of others").

**Percentile ("this life was better than X% of Thais")**: at boot, `simulateLives(160)` runs 160 full lives in the background with a random-choice `SimIO` (it yields every 5 lives so the UI stays responsive). Status text shows "กำลังจำลองชีวิตเปรียบเทียบ…" ("simulating comparison lives…"), then "เทียบผลกับชีวิตจำลอง 160 ชีวิต" ("compared against 160 simulated lives"). Your final score is ranked against these. Until they finish, a logistic fallback is used: `100/(1+e^(-1.7(s-48)/10))`.

Score = 0.30·avgJ + 0.25·avgH + 0.20·wealthPct(estate, log-interpolated) + 0.20·(K+100)/2 + 0.05·C + goodKarmaFruit (≤15).

## 3. Generation pipeline

**Visuals, all procedural on a 192×108 canvas** (CSS-scaled, `image-rendering:pixelated`, scanline overlay div):
- Palette `P8`: PICO-8's 16 colours plus about 14 extras (Thai temple gold, teal, and so on).
- Primitives: `R()` rect, `bands()` dithered sky gradient, `stars(t,n,seed)` twinkling, `bldg()` with seeded lit windows, `roof()`, trees (round/palm/banana/rubber), `thaiFlag`, `spiritHouse`, `lotus`, `lightning`.
- About 30 `SCENES` keyed by context (birth, school×4 types, uni, factory, office, farm, hospital, prison, court, funeral (Buddhist or Muslim variant), karma, sharesouls, timeskip, end…).
- **Personalisation**: the far background depends on region tier (city, industry, town, rice, mountain, south mosque). The house sprite has 6 versions by wealth (shack → mansion with gold trim). The family row shows spouse and up to 3 kids at their real ages. Characters come from string templates (`adultM`/`adultF`, 8 px wide) with skin tone, age, and outfit by context.
- Badge overlays: lightning for events, lotus for good deeds, fork for forced choices, a coloured square for good/mid/bad results.
- Render loop: `requestAnimationFrame` throttled by `setTimeout(…,90)`, about 11 fps for a chunky retro feel. Under reduced-motion, t is frozen at 1.2.
- Birth scene: a shooting star crosses the sky and bursts into 8 sparks over your house.

**Text**: about 258 titled events and choices. `storyFor()` writes a 1–2 sentence vignette after every decision from `PLACE[tier][poor|mid|rich]` (home, sound, commute, play, food, shop), plus current place and work context (for example "after the factory shift"). `fresh()` prevents repetition: each sentence template is used at most twice per life and never twice in a row (numbers are normalised to `#` before comparing).

**Audio** (`Music` IIFE):
- Tracks `arcade` (childhood) → `quest` (stage ≥ 3, working) → `guitar` (stage ≥ 6 or hospital/oldhome) → `piano` (funeral/karma/death/end).
- Volumes .40–.55. Cross-fade runs at 0.45 volume per second on rAF. Time-skip keeps the current track. A new track restarts from 0, but returning quickly to a paused track resumes it.
- Unlocked on the first pointerdown or keydown. M key toggles. Pauses on `visibilitychange`. The on/off setting persists in `localStorage['o65m_music']`.

## 4. UI flow and reveal pacing

- Layout: the pixel screen and timeline sit on the left, the decision panel on the right. On mobile, the HUD and screen stick to the top and the panel scrolls under them. Panel content is rebuilt on every step: eyebrow (kind · stage · age) → event header → pending notes → story vignette → title → choices.
- **Stat-change chips** float over the canvas: changes are aggregated per step and appear one after another 140 ms apart. Each rises and fades over 2.2 s while the matching HUD stat pulses with scale 1.15.
- The timeline bar (0–100 years) gets a tick for each logged event age.
- **Death sequence, a deliberate 4-step reveal**:
  1. Death card (the scene fades to white).
  2. You choose your own funeral style and last wishes.
  3. "มีคน N คนมาส่งคุณ" ("N people came to see you off"), funeral envelope money, then a button "เปิดบัญชีกรรม" ("open the karma ledger").
  4. The **karma ledger**: every hidden good or bad act, sorted by age. Rows animate in 0.25 s apart. Each one rolls "ปะทุ / รอด" (erupted / escaped) for sins or "ออกผล / เงียบ" (bore fruit / stayed silent) for good deeds, with probability based on K. Effects land after death: heirs fined, a hall carries your name, a scholarship in your name, and so on. The scene behind it is a bookshelf of gold and purple books in your good:bad ratio.
  5. Then the summary: big score, percentile, archetype box, weighted part bars, the share card.
- Omens during time-skips: if K < −30, there is a 15% chance per year of a creepy line such as "หมาข้างบ้านเห่าใส่คุณทุกครั้งที่เดินผ่าน" ("the neighbour's dog barks at you every time you pass"), foreshadowing the hidden karma.

## 5. Share and persistence

- `makeCard()` draws a 600×750 canvas PNG (dataURL in an `<img>`; the user long-presses to save):
  - Gradient background with a starfield seeded by `mulberry(age*7+guests)`.
  - Gold dashed frame.
  - Your final-age pixel character, scaled up 8×.
  - Name, province, wealth class, career, lifespan, funeral guests.
  - Archetype in 「」 brackets (yellow if rare).
  - "ชีวิตนี้ดีกว่าคนไทย" ("this life beat Thais") with a huge **N%**.
  - Family line "จาก Q1 สู่ Q4" ("from Q1 to Q4") when there are generations.
  - Footer brand "1 ใน 65 ล้าน".
- "คัดลอกข้อความ" ("copy text") copies a short brag paragraph via `navigator.clipboard`, with a `execCommand` fallback. There is no Web Share API, no URL state and no seed link.
- Persistence: only the music on/off setting. Lives, family trees and history are lost on reload.

## 6. What makes each result feel unique and collectible

1. Real-data odds shown at birth (the province % and your quintile bar in the ladder). A bad roll feels like fate, not design.
2. Hidden karma revealed after death, with consequences rolled live. The best "one more run" hook.
3. An archetype title that names the *shape* of a life (≈30 titles, one rare gold one). People share titles, not numbers.
4. Percentile against 160 simulated lives makes "better than 73%" mean something.
5. Generations: play as your child, who inherits estate, debt, karma-derived bonuses and parent-death events. The family-tree screen shows class mobility over generations ("from Q1 to Q4 in 3 generations").
6. Reincarnation: positive or negative karma shifts the next life's wealth odds by 2 points per 10 K.
7. Scenery and house tied to region and wealth, plus non-repeating micro-stories, so two lives rarely look the same.

## Apply to Tower of Fate

Context: `auto.js` already rolls `rank`, `cls` and computes `h.odds = 1/(P(rank)·P(class))`, shown as "1 ใน N". `audio.js` is WebAudio chiptune.

**Hero rarity and odds presentation (birth screen)**
- Do what their ladder does. Show the **whole distribution you were drawn from**, not only "1 ใน N": a 5–7 bar rank ladder (each rank's %, your bar gold and tagged "คุณ"), plus a class row with each class's weight. Show N with exact digits and commas (e.g. "1 ใน 1,284"). It reads as real, and it is cheap since the RANKS and CLASSES weights already exist.
- Multiply in the look rarity too (form, palette, pet) for a "combined odds" line, e.g. "ฮีโร่แบบคุณ: 1 ใน 48,213" ("heroes like you: 1 in 48,213"). Larger numbers feel more collectible. Keep each factor visible as a tile (rank %, class %, look %), as their province tile + meter does.
- Birth reveal pacing: one tile at a time, about 300–400 ms apart (rank → class → look → stats), then the big "1 ใน N" last. Add one "shooting star bursts over the village" beat on the canvas for top ranks only.

**Hidden stat revealed at the end (karma-ledger equivalent)**
- Track one or two hidden values per run (e.g. "ดวง/กรรม", luck or karma, from events in `events.js`: sparing monsters, greedy chests, betraying companions). At death or floor 100, show a ledger screen. Rows animate in 250 ms apart, each rolling "ออกผล / ปะทุ" (bore fruit / erupted) with a small post-run effect (bonus or penalty for the next hero, a title modifier). Foreshadow it with rare omen lines in auto-flow logs when the hidden value is very negative.

**Archetype titles instead of only "died on floor X"**
- Write about 20–30 ordered rules over final stats (floor reached, gold, kills, deaths avoided, pet bond, rank start vs. end, class). Examples: "ตายตามทางที่เลือก" (died the way they chose), "แรงค์ต่ำแต่ใจสู้" (low rank, big heart), "ผู้พิชิตยอดหอ" (tower conqueror, rare gold: the ~3% final-boss win), "นักบุญติดดิน" (humble saint, high karma, low gold), "เศรษฐีผู้เดียวดาย" (lonely rich, no pet), and a fallback "นักผจญภัยธรรมดาคนหนึ่ง" (just another adventurer). Mark one or two `rare:true` and render them gold.

**Percentile against simulated runs**
- `sim.js` and auto-flow already simulate runs. At boot, run about 150–300 headless auto runs in idle slices (yield every N runs as `simulateLives` does), or ship a precomputed CDF of floor/score from your balance sims. Then show "รอบนี้ดีกว่านักผจญภัย 81%" ("this run beat 81% of adventurers"). Use a logistic fallback until the sims finish. This pairs well with the documented median death floor of ~47.

**Unique per-run music (where you can beat them)**
- They use 4 fixed MP3s. You have WebAudio, so make the run's theme a **function of the hero**. Seed `mulberry32(hash(name+rank+cls+look))`, then pick:
  - scale/mode by class (e.g. warrior Dorian, mage Phrygian, thief pentatonic, cleric Lydian),
  - tempo by rank (higher rank is faster or brighter),
  - a 4–8 bar motif generated once and reused as the leitmotif on the birth reveal, the boss intro (minor shift) and the death or ending jingle (slow piano-like square wave).
- Then show "เพลงประจำตัว #A7F3" ("signature theme #A7F3") on the share card, so the theme itself becomes a collectible. Keep the stage-based **cross-fade** idea: an intensity layer by floor band (1–25, 26–50, 51–75, 76–99, boss 100), adding or dropping percussion and arpeggio voices rather than switching tracks. Fade at ~0.45/s and pause on `visibilitychange`.

**Per-run visuals**
- Copy their split between seeded and live randomness: `mulberry(seed)` for cosmetics only (village skyline, tower brick pattern, star field, card background), so the same hero always looks the same while gameplay stays `Math.random`. Make the far background depend on the birth village and the hero's house or tent on rank, the way they map region and wealth.
- Throttle the canvas loop to ~10–12 fps in auto-flow for a chunky retro look and lower CPU (they use `setTimeout(rAF, 90)`).

**Share card**
- Draw a 600×750 canvas PNG: seeded starfield, gold pixel frame, hero sprite scaled 8× at the death floor, name · village · rank · class, archetype in 「」, a huge "ชั้น 63 / 100" or "ดีกว่า 81%", the "1 ใน N" birth odds as a subtitle, the theme ID, and the footer "Tower of Fate". Add a copy-text button with a clipboard fallback. Add **a seed or hero code in the text** (which they lack) so friends can replay the same hero. That requires a seedable gameplay RNG in `engine.js`.

**Lineage and reincarnation (meta loop)**
- After death, offer "สืบทอดโดยลูกศิษย์/ลูก" (continue as your apprentice or child: inherits a share of gold, pet, a karma-derived bonus) or "เกิดใหม่" (reborn: hidden karma shifts the next rank roll by ±2 percentage points per 10 karma, as their `rebornPlayer` does). Then add a family-tree screen: "GEN 1 แรงค์ D ชั้น 31 → GEN 3 แรงค์ B ชั้น 88". Persist the lineage in `localStorage` (they don't, which is a missed opportunity).

**Small UX patterns worth copying**
- Floating stat chips aggregated per step and released 140 ms apart, with the matching HUD stat pulsing, which suits auto-flow combat summaries.
- A time-skip panel with a per-floor bar chart (gold or HP net per floor, red when negative) for auto-flow fast-forward segments.
- A sentence-repetition guard for generated log lines (`fresh()`: normalise numbers, max 2 uses per run, never twice in a row).
- Show unaffordable shop items with a lock and the cost in "floors of income", like their "= N months of household income".
