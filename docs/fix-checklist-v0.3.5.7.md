# เช็กลิสต์แก้บัค v0.3.5.7

รวมทุกข้อจาก review ของ commit d2e688a (v0.3.5.6) และจาก audit ทั้ง repo
คอลัมน์ "ที่มา" บอกว่าข้อนั้นมาจากรายงานไหน: R = review, A = audit
แก้ข้อไหนเสร็จแล้วให้ติ๊ก `[x]`

## กติกาตอนแก้

- [x] อ่าน DEVELOPMENT.md กับ HANDOFF.md ก่อนเริ่ม ห้ามแตะ `classic/`
- [x] แก้ให้เล็กที่สุดที่ยังครบ ลบโค้ดได้ก็ลบแทนการเพิ่ม และเขียนให้เหมือนโค้ดรอบข้าง
- [x] ก่อนแก้ฟังก์ชันที่ใช้ร่วมกัน grep หาทุกที่ที่เรียกมันก่อน
- [x] subagent ที่แก้ไฟล์เดียวกันให้ใช้ worktree ของตัวเอง
- [x] ข้อความทุกอย่าง (changelog, docs, commit) ผ่าน humanizer ทั้งที่เขียนเองและที่ subagent เขียน
- [x] เทสในเบราว์เซอร์ให้ปิดเสียงก่อน: `AUDIO.setMuted(true)`
- [x] ตาราง D1 ใหม่ให้ทำเป็น `migrations/0005_*.sql` แล้วจดใน HANDOFF ว่าต้องรันบน production เอง
- [x] เสร็จแล้วเช็กแค่ว่าหน้าไม่พังและของที่แก้มีอยู่จริง bump เป็น v0.3.5.7 อัปเดต changelog.js, DEVELOPMENT.md, HANDOFF.md แล้ว commit กับ push ขึ้น main

## A. ต้องแก้: โกงอันดับ ข้อมูลหาย เว็บล่มได้

- [x] **A1** นำเข้าเซฟตอนกำลังสู้แล้วรอบเก่ากลับมาเขียนทับ (R1, R3, A6)
- [x] **A2** เขียนสคริปต์โพสต์คะแนนอันดับ 1 ได้ (A1)
- [x] **A3** คะแนนหายเมื่อมี request มาพร้อมกัน (A2)
- [x] **A4** `/api/live {a:'ss'}` ไม่มีลิมิต (A3)
- [x] **A5** ลิมิตเดารหัสผ่านกับลิมิตสมัครถูกข้ามได้ (A4)
- [x] **A6** ใครก็ล็อกบัญชีคนอื่นได้ (A5)

**A1** `savemove.js:157`, `account.js:130`, `auto.js` saveRun (~2477) กับ playCombat (~2877)
- ปัญหา: ใช้ `S.paused=true` กันไว้ แต่ playCombat ไม่ได้เช็กค่านี้ ฉากสู้จบเองแล้ววิ่ง `afterKey → render → saveRun` ไปเขียนรอบเก่าทับเซฟที่เพิ่งนำเข้า ถ้า apply ล้มเหลว เกมจะค้างอยู่ในสถานะหยุดทั้งที่ปุ่มโชว์ว่ากำลังเล่น
- แก้: ให้ saveRun เช็ก `if(!S||window.__tofMoving)return;` ทั้งสองไฟล์ตั้ง `window.__tofMoving=1` ก่อน apply และล้างธงถ้า apply ล้มเหลว แล้วลบบรรทัด `S.paused=true` ทั้งสองที่ออก

**A2** `functions/api/scores.js:226` (SALT อยู่บรรทัด 33)
- ปัญหา: ตั๋วบอกได้แค่ว่าเวลาผ่านไปแล้ว ส่วนชั้น ผลชนะ และคะแนนมาจากเครื่องคนเล่นทั้งหมด hash ก็ใช้ salt ที่ใครเปิดโค้ดก็เห็น IP เดียวเต็ม top 100 ได้ภายใน 20 นาที
- แก้: เก็บ IP hash (`tix.ip`) ไว้ใน entry ให้แต่ละ IP มีแถว `ok:1` ใน top ได้ไม่เกิน 3 แถว แล้วเพิ่ม action ลบแถวที่เช็กสิทธิ์แอดมินฝั่ง server (ใช้ `isAdmin` ใน acctlib.js กับ session token)

**A3** `scores.js:204-264`, `live.js:101-104`, `posts.js:147-186`
- ปัญหา: top, recent, hof, ยอด live, reacts และ reports ทุกตัวอ่าน JSON ทั้งก้อน แก้ แล้วเขียนกลับ ใครเขียนทีหลังก็ทับของอีกคน
- แก้: เพิ่มคอลัมน์ `ver` ในตาราง kv แล้วใช้ `UPDATE kv SET v=?, ver=ver+1 WHERE k=? AND ver=?` ถ้าไม่มีแถวไหนเปลี่ยนให้ retry 3 ครั้ง หรือย้ายคะแนนไปเป็นตาราง D1 แยก ถ้าแบบนั้นง่ายกว่า

**A4** `live.js:98-105`
- ปัญหา: เขียน D1 ทุกครั้งที่ถูกเรียก สคริปต์ปลอม header Origin ได้ ยิงวนแค่นี้ก็หมดโควตาเขียนรายวัน แล้วทั้งเว็บก็พังตาม
- แก้: จำกัดต่อ IP ด้วย `bump()` แบบเดียวกับใน `functions/api/memorial.js` เกินประมาณ 20 ครั้งต่อวันให้ตอบ 429

**A5** `acctlib.js:38-46` ที่ใช้ใน `acct.js:47-84` และ `pay/checkout.js:32`
- ปัญหา: นับก่อน (`count`) แล้วค่อยบันทึก (`hit`) ยิง 200 request พร้อมกัน ทุกตัวเลยผ่านลิมิตไปได้หมด
- แก้: บันทึกก่อนแล้วค่อยเช็ก ใช้ `INSERT … ON CONFLICT … RETURNING n` แล้วปฏิเสธถ้า n เกินลิมิต

**A6** `acct.js:64`
- ปัญหา: ลิมิตล็อกอินผิดนับตามชื่ออย่างเดียว ใส่รหัสผิด 8 ครั้งทุก 15 นาทีให้ `edzero` เจ้าของจะเข้าบัญชีไม่ได้ไปตลอด
- แก้: นับตามชื่อคู่กับ IP (`'fn:'+nk+':'+ip`) แล้วเก็บเพดานตามชื่ออย่างเดียวไว้ที่ 200 กันอีกชั้น

## B. ควรแก้

- [x] **B1** (A7) เพิ่ม index ตาราง tix: `CREATE INDEX tix_ip ON tix(ip, t)` ตอนนี้ `store.js:80-83` สแกนตั๋วทุกใบใน 10 นาทีทุกครั้งที่มีคนเริ่มรอบ
- [x] **B2** (A8) ปุ่มสุ่มอนุสรณ์ `functions/api/memorial.js:204` เลิกใช้ `ORDER BY RANDOM()` ที่อ่านทุกแถว เปลี่ยนเป็นสุ่ม id แล้วใช้ `WHERE hid=0 AND id>=? ORDER BY id LIMIT 1` ถ้าไม่เจอให้ลอง `id<?`
- [x] **B3** (A9) โค้ดย้ายเซฟ `move.js:60-65` ใช้ได้ครั้งเดียวจริง: `UPDATE kv SET v='0' WHERE k=? AND v<>'0'` แล้วคืนเซฟเฉพาะตอน `changes===1`
- [x] **B4** (A10) limiter กับ dedupe ที่อ่านก่อนเขียน (`scores.js:131-143`, `:214-216`, `move.js:17-24`) เปลี่ยนไปใช้ `bump()` แบบ atomic เหมือน A5 ตอนนี้ตั๋ว KV ใบเดียวได้ `ok:1` หลายแถว
- [x] **B5** (R2) หัวหน้าตระกูลที่ทำงานในเมืองจากเซฟเก่ายังลงดันเจี้ยนได้ ตอนโหลดหน้าเมือง (`city.js`) ให้เอา `P.head` ออกจาก `s.jobs` ทุกงาน
- [x] **B6** (A18) เซฟใหญ่เกินลิมิต row ของ D1 (`acct.js:97`, `move.js:45`) ให้เช็ก `new TextEncoder().encode(b.p).length <= 1900000` ถ้าเกินตอบ 413 และ client โชว์ว่าเซฟใหญ่เกิน
- [x] **B7** (A14) รวม helper ฝั่ง server ไว้ใน `functions/api/util.js` (ไม่ทำเป็น route แบบเดียวกับ acctlib.js) ได้แก่ `fnv json okId thDay sameOrigin clean isInt RANKS CLS DRG` แล้วให้ scores.js, posts.js, live.js, memorial.js import จากไฟล์นี้ `clean` ของ memorial.js รับตัวเลขได้ ต้องเก็บพฤติกรรมนี้ไว้
- [x] **B8** (A15) เพิ่มเทส `tools/sync-check.js` ที่เทียบ `canon`/`fnv` ของ leaderboard.js กับ scores.js และตัวถอดรหัสของ share.js กับ `functions/s/[[path]].js` แล้ว assert ว่าผลออกมาเหมือนกัน
- [x] **B9** (A11, A12) ลบ `tools/orig.html`, `tools/split.js`, `tools/sim.js` (sim.js อ่าน engine.js ที่ไม่มีแล้ว) และ `tools/1in8b-rea.md`, `tools/65m-song-rea.md` ที่ซ้ำกับใน `docs/rea/` ทุกไบต์
- [x] **B10** (A13) ฉากจบที่ copy ไว้ใน `memorial.js:49-80` และ `:333-384` (ต้นฉบับอยู่ที่ `auto.js:3034-3145`) ให้ย้ายตัววาดเฟรมไปไว้ใน `window.ART` ใน sprites.js ที่เดียว สี `calm` ใน MAPC ให้ใช้ค่าของ auto.js ถ้ากินเวลาเกินไปให้ข้ามแล้วจดลง HANDOFF

## C. แก้ได้ถ้ามีเวลา

- [x] **C1** (A17) (เจ้าของบอกให้เอาออกเลย ยังไม่ได้ตั้ง ADMIN_NAMES จดไว้ใน HANDOFF แล้ว) เอาค่า default `'edzero'` ออกจาก `isAdmin` ใน `acctlib.js:70` **ต้องถามเจ้าของเกมก่อน** ว่าตั้ง `ADMIN_NAMES` บน production แล้วหรือยัง ถ้ายังไม่ได้ตั้ง ห้ามเอาออก
- [x] **C2** (A19) helper ฝั่ง client ที่ซ้ำกัน
  - [x] ไฟล์ที่โหลดหลัง meta.js ให้ใช้ `META.esc` แทนตัวที่เขียนเอง: auto.js:2099 (ตัวนี้ไม่ escape `'` อยู่ด้วย), changelog.js, guide.js, memorial.js, tips.js, tour.js ส่วน achievements.js กับ leaderboard.js โหลดก่อน meta.js ให้คงไว้
  - [x] export `isObj` จาก META แล้วลบตัวที่ซ้ำใน admin.js, city.js, fest.js, wevent.js, account.js
  - [x] `gate.js:13` เปลี่ยนไปใช้ `M.clsN`
  - [x] `nf` ที่ซ้ำใน account.js, memorial.js, savemove.js
  - [x] (errTxt ยังแยก 3 ที่ เพราะข้อความไม่เหมือนกัน รวมแล้วโค้ดยาวขึ้น) fetch wrapper ที่เขียนซ้ำ 5 ที่ (account.js:27, memorial.js:42, savemove.js:49, leaderboard.js:240/274/324) และ `errTxt` อีก 3 ที่ ให้รวมเป็น `META.api(url, body, ms)` ตัวเดียว
  - [x] `leaderboard.js:13-14` เลิกเก็บ `RANKC`/`CLSN` เอง ให้ใช้ `META.rkCol`/`META.clsN` ตอน render
- [x] **C3** (A20) ลบโค้ดตาย ก่อนลบให้ grep ทั้ง tree อีกรอบ รวมที่อ้างผ่าน string ด้วย
  - [x] `pathName` ที่ auto.js:58
  - [x] CSS `.shopg` (index.html:180, 190), `.hdbtn` (index.html:315-316), `.ti-row` (tips.js:176-179) และ `.formbar .btn` ใน SEL ของ tips.js
  - [x] field ใน window ที่ไม่มีใครอ่าน: `ACH.TIERS`, `CHANGELOG.LOG`/`version`, `HARD.STAGES`/`PETB`/`petPow`/`lvUp`/`trainCost`, `MEMO.owned` กับฟังก์ชัน `owned`, `META.hasWon` กับฟังก์ชัน `hasWon`, `TOWN.bindMini`
  - [x] `AUTO_SIM` (auto.js:2083) ให้เหลือเฉพาะ field ที่ tools/autosim.js ใช้: `HZ LX autoLife pRoll rollHero`
  - [x] fallback ที่ไม่มีทางเข้าใน memorial.js:16, 63, 72

## ไม่ต้องทำรอบนี้

- (A16) webhook ของ Stripe ยังไม่ดึงของคืนตอน refund หรือ dispute ร้านพักไว้อยู่ ค่อยทำตอนเปิดร้าน

## ตอนจบ

- [x] bump v0.3.5.7 แล้วอัปเดต changelog, DEVELOPMENT, HANDOFF
- [x] commit และ push ขึ้น main
- [x] สรุปเป็นภาษาไทยว่าแก้ข้อไหนไปแล้ว ข้ามข้อไหนเพราะอะไร และมีอะไรที่เจ้าของต้องทำเอง เช่น รัน migration 0005 หรือตั้ง `ADMIN_NAMES`
