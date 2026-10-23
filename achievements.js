// achievements.js — ความสำเร็จของหอคอยโชคชะตา
// API: window.ACH = { onEvent(type,data), onRunEnd(summary), list(), panelHTML(), count(), grant(id), add(defs) }  grant ปลดได้เฉพาะอันที่มี ext:1
// เก็บใน localStorage 'tof-ach-v1' แบบรวมของเดิมทุกครั้ง (ไม่ลบของที่ปลดล็อกแล้ว)
(function(){
'use strict';
const KEY='tof-ach-v1';
const CLS={war:'นักรบ',mag:'จอมเวท',arc:'นักธนู',pri:'นักบวช',rog:'โจร',far:'ชาวไร่',dra:'อัศวินมังกร',dsl:'นักล่ามังกร',nec:'เนโครแมนเซอร์',ang:'ทูตสวรรค์'};
const SEC=['nec','ang','dsl'];
const BASE7=['war','mag','arc','pri','rog','far','dra']; // win_all นับเฉพาะ 7 อาชีพปกติ ไม่รวมอาชีพลับ
const TIER={bronze:{n:'ทองแดง',c:'#c98a5a'},silver:{n:'เงิน',c:'#c9d3d6'},gold:{n:'ทอง',c:'#f4bb4a'},legend:{n:'ตำนาน',c:'#ff7a5a'}};

// ---------- helpers (ทนทุกค่าที่หายไป) ----------
const num=v=>{const n=+v;return isFinite(n)?n:0;};
const cnt=v=>Array.isArray(v)?v.length:(v&&typeof v==='object')?Object.keys(v).length:Math.max(0,num(v));
const str=v=>v==null?'':String(v);
const esc=s=>str(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- รายการความสำเร็จ ----------
// t: เงื่อนไขตอนจบรอบ (s=summary, R=สถิติในรอบ, M=สถิติสะสม)
const DEFS=[
 {id:'die1st',n:'ศพแรกของตระกูล',d:'ตายครั้งแรก ใครๆ ก็เริ่มจากตรงนี้',icon:'💀',tier:'bronze',t:s=>!s.won},
 {id:'floor1',n:'บันไดขั้นแรกก็ลื่น',d:'ตายตั้งแต่ชั้น 1',icon:'🍌',tier:'bronze',t:s=>!s.won&&num(s.floor)<=1},
 {id:'f10',n:'พ้นประตูหอ',d:'ขึ้นถึงชั้น 10',icon:'🚪',tier:'bronze',f:10},
 {id:'f25',n:'หนึ่งในสี่ของทาง',d:'ขึ้นถึงชั้น 25',icon:'🪜',tier:'bronze',f:25},
 {id:'f50',n:'ครึ่งหอคอย',d:'ขึ้นถึงชั้น 50',icon:'🏯',tier:'silver',f:50},
 {id:'f75',n:'อากาศเริ่มบาง',d:'ขึ้นถึงชั้น 75',icon:'🌫️',tier:'gold',f:75},
 {id:'f100',n:'ยอดหอคอย',d:'ขึ้นถึงชั้น 100',icon:'🗼',tier:'gold',f:100},
 {id:'boss1',n:'บอสตัวแรกล้ม',d:'ชนะบอสได้สักตัว',icon:'⚔️',tier:'bronze',t:(s,R)=>R.bossWins>0||num(s.bosses)>0},
 {id:'boss5',n:'นักล่าบอส',d:'ชนะบอส 5 ตัวในรอบเดียว',icon:'🗡️',tier:'silver',t:(s,R)=>Math.max(R.bossWins,num(s.bosses))>=5},
 {id:'win',n:'โชคชะตาพ่ายแพ้',d:'ล้มบอสสุดท้ายบนยอดหอได้',icon:'👑',tier:'gold',t:s=>!!s.won},
 {id:'win_war',n:'ดาบที่ไม่เคยถอย',d:'ชนะเกมด้วยนักรบ',icon:'🛡️',tier:'silver',cls:'war'},
 {id:'win_mag',n:'คาถาบทสุดท้าย',d:'ชนะเกมด้วยจอมเวท',icon:'🔮',tier:'silver',cls:'mag'},
 {id:'win_arc',n:'ลูกศรถึงยอดหอ',d:'ชนะเกมด้วยนักธนู',icon:'🏹',tier:'silver',cls:'arc'},
 {id:'win_pri',n:'คำอธิษฐานที่สัมฤทธิ์',d:'ชนะเกมด้วยนักบวช',icon:'📿',tier:'silver',cls:'pri'},
 {id:'win_rog',n:'ขโมยมงกุฎ',d:'ชนะเกมด้วยโจร',icon:'🗝️',tier:'silver',cls:'rog'},
 {id:'win_far',n:'จอบพลิกชะตา',d:'ชนะเกมด้วยชาวไร่',icon:'🌾',tier:'gold',cls:'far'},
 {id:'win_dra',n:'ปีกเหนือหอคอย',d:'ชนะเกมด้วยอัศวินมังกร',icon:'🐉',tier:'silver',cls:'dra'},
 {id:'win_all',n:'ครบทุกอาชีพ',d:'ชนะเกมครบทั้ง 7 อาชีพ',icon:'🌟',tier:'legend',t:(s,R,M)=>BASE7.every(k=>M.clsWins[k])},
 {id:'slime',n:'เยลลี่ผู้พิชิต',d:'ชนะเกมในร่างสไลม์',icon:'🟢',tier:'gold',t:s=>s.won&&str(s.form)==='slime'},
 {id:'ss',n:'เกิดมาพร้อมดาว',d:'สุ่มเกิดได้แรงค์ SS (ได้ทันทีตอนสุ่มเจอ)',icon:'✨',tier:'legend',t:s=>str(s.rankK)==='SS'},
 {id:'fwin',n:'แรงค์ F ก็ถึงยอด',d:'ชนะเกมทั้งที่เกิดมาแรงค์ F',icon:'🥔',tier:'legend',t:s=>s.won&&str(s.rankK)==='F'},
 {id:'odds',n:'หนึ่งในพัน',d:'เกิดมาด้วยโอกาสต่ำกว่า 1 ใน 1,000',icon:'🎲',tier:'silver',t:s=>num(s.odds)>=1000},
 {id:'pets2',n:'สวนสัตว์เคลื่อนที่',d:'มีสัตว์เลี้ยงพร้อมกัน 2 ตัว',icon:'🐾',tier:'silver',t:(s,R)=>Math.max(R.pets.size,cnt(s.pets))>=2},
 {id:'comps2',n:'ปาร์ตี้เต็มโต๊ะ',d:'จ้างทหารรับจ้างได้ 2 คนในรอบเดียว',icon:'🤝',tier:'silver',t:(s,R)=>Math.max(R.comps,cnt(s.comps))>=2},
 {id:'lone',n:'ไปคนเดียวก็ได้',d:'ชนะเกมโดยไม่มีสัตว์เลี้ยงและทหารรับจ้างเลย',icon:'🐺',tier:'gold',t:(s,R)=>s.won&&!R.pets.size&&!R.comps&&!cnt(s.pets)&&!cnt(s.comps)},
 {id:'mimic',n:'หีบนี้กัดได้',d:'ชนะมิมิก',icon:'📦',tier:'bronze',t:(s,R)=>R.mimicWins>0},
 {id:'legend',n:'เรื่องเล่าขานในหมู่บ้าน',d:'เจอเหตุการณ์ระดับตำนาน',icon:'📜',tier:'silver',t:(s,R)=>R.legends>0},
 {id:'omen',n:'ลางร้ายมาเยือน',d:'เจอลางบอกเหตุ',icon:'🌑',tier:'bronze',t:(s,R)=>R.omens>0},
 {id:'kgood',n:'บุญหนุนนำ',d:'กรรมดีสะสมถึง +20',icon:'🕊️',tier:'silver',t:(s,R)=>Math.max(R.kMax,num(s.karma))>=20},
 {id:'kbad',n:'บาปท่วมหัว',d:'กรรมชั่วสะสมถึง −20',icon:'😈',tier:'silver',t:(s,R)=>Math.min(R.kMin,num(s.karma))<=-20},
 {id:'evilwin',n:'คนชั่วได้ดี',d:'ชนะเกมทั้งที่กรรมติดลบถึง −20',icon:'🩸',tier:'gold',t:s=>s.won&&num(s.karma)<=-20},
 {id:'gen3',n:'สามชั่วคน',d:'ตระกูลสืบทอดมาถึงรุ่นที่ 3',icon:'🌳',tier:'silver',t:(s,R)=>Math.max(R.gen,num(s.gen))>=3},
 {id:'gen10',n:'ตระกูลไม่ยอมแพ้',d:'ตระกูลสืบทอดมาถึงรุ่นที่ 10',icon:'🏛️',tier:'gold',t:(s,R)=>Math.max(R.gen,num(s.gen))>=10},
 {id:'fate',n:'ให้ฟ้าลิขิต',d:'ปล่อยให้เวลาหมดแล้วระบบเลือกแทน 10 ครั้งในรอบเดียว',icon:'⏳',tier:'bronze',t:s=>num(s.timeouts)>=10},
 {id:'scars',n:'แผลเป็นคือเหรียญตรา',d:'มีแผลเป็นตั้งแต่ 5 แห่ง และยังรอดถึงชั้น 50',icon:'🩹',tier:'gold',t:s=>cnt(s.scars)>=5&&num(s.floor)>=50},
 {id:'runs10',n:'ขาประจำหอคอย',d:'เล่นจบครบ 10 รอบ',icon:'🔁',tier:'bronze',t:(s,R,M)=>M.runs>=10},
 {id:'runs50',n:'วิญญาณผูกกับหอ',d:'เล่นจบครบ 50 รอบ',icon:'♾️',tier:'silver',t:(s,R,M)=>M.runs>=50},
 // v2.1 ชั้นลับมังกร (hid = ซ่อนชื่อจนกว่าจะปลดล็อก)
 {id:'drg_find',n:'บันไดที่ไม่มีในแผนที่',d:'เจอบันไดที่พาขึ้นไปเหนือยอดหอ',icon:'🌌',tier:'gold',hid:1,t:s=>['n','f','s','x'].includes(str(s.drg))},
 {id:'drg_spare',n:'สหายมังกร',d:'ตีมังกรจนยอมแพ้ แล้วปล่อยมันไป',icon:'🐉',tier:'legend',hid:1,t:s=>str(s.drg)==='f'},
 {id:'drg_slay',n:'นักล่ามังกร',d:'ฆ่ามังกรบนชั้นลับ',icon:'🐲',tier:'legend',hid:1,t:s=>str(s.drg)==='s'},
 {id:'clan_pick',n:'ชื่อที่เลือกใช้',d:'เปลี่ยนฉายาตระกูลมังกรตอนเกิด',icon:'📜',tier:'silver',hid:1,ev:1},
 {id:'brink1',n:'ยังไม่ถึงเวลา',d:'รอดจากจุดเฉียดตาย',icon:'🕯',tier:'silver',ev:1},
 {id:'brink3',n:'แมวเก้าชีวิต',d:'รอดจากจุดเฉียดตายครบ 3 ครั้งในชีวิตเดียว',icon:'🐈‍⬛',tier:'gold',ev:1},
 {id:'clanpet_pick',n:'ตัวไหนก็ลูกรัก',d:'เปลี่ยนสัตว์ประจำตระกูลตอนเกิด',icon:'🥚',tier:'silver',hid:1,ev:1},
 {id:'drg_lift',n:'ดยุกปราบมังกร',d:'ตระกูลล้มมังกรครบ 3 ตัว คำสาปเลยหายไป',icon:'🏰',tier:'legend',hid:1,t:s=>s.lift===true},
 {id:'win_dsl',n:'เลือดมังกรบนคมดาบ',d:'ชนะเกมด้วยนักล่ามังกร',icon:'🔥',tier:'gold',hid:1,cls:'dsl'},
 // v2.4–v2.7 (ev:1 = ปลดล็อกจาก onEvent เท่านั้น)
 {id:'turn_nec',n:'คัมภีร์ที่ไม่ควรเปิด',d:'ชั่วจนสุดทาง แล้วกลายร่างเป็นเนโครแมนเซอร์กลางหอ',icon:'☠️',tier:'gold',hid:1,t:s=>!!s.turned&&str(s.clsId)==='nec'},
 {id:'turn_ang',n:'ขนนกร่วงใส่หัว',d:'ดีจนสุดทาง แล้วกลายร่างเป็นทูตสวรรค์กลางหอ',icon:'😇',tier:'gold',hid:1,t:s=>!!s.turned&&str(s.clsId)==='ang'},
 {id:'win_nec',n:'กองกระดูกบนยอดหอ',d:'ชนะเกมด้วยเนโครแมนเซอร์',icon:'💀',tier:'legend',hid:1,cls:'nec'},
 {id:'win_ang',n:'ปีกที่ไม่ต้องยืมมังกร',d:'ชนะเกมด้วยทูตสวรรค์',icon:'🪽',tier:'legend',hid:1,cls:'ang'},
 {id:'born_sec',n:'เกิดมาก็แปลกแล้ว',d:'เกิดเป็นอาชีพลับตั้งแต่ลืมตา',icon:'🥚',tier:'gold',hid:1,t:s=>SEC.includes(str(s.clsId))&&!s.turned&&!s.turn},
 {id:'path1',n:'เริ่มเข้าทาง',d:'ถึงขั้นแรกของทางอาชีพ',icon:'✦',tier:'bronze',t:s=>num(s.pathHi)>=1},
 {id:'path2',n:'ครึ่งทางของอาชีพ',d:'ถึงขั้นที่ 2 ของทางอาชีพ',icon:'✴️',tier:'silver',t:s=>num(s.pathHi)>=2},
 {id:'path3',n:'ตำแหน่งนี้ของข้า',d:'ชิงตำแหน่งชนะ ได้ขั้นสุดท้ายของทางอาชีพ',icon:'👑',tier:'gold',t:s=>num(s.pathHi)>=3},
 {id:'crown_gold',n:'เงินซื้อได้จริงด้วย',d:'ชิงตำแหน่งชนะเพราะทุ่มทอง',icon:'💰',tier:'silver',t:s=>!!(s.cw&&s.cw.won&&s.cw.how==='gold')},
 {id:'crown_cheat',n:'ไม่มีใครเห็นหรอก',d:'โกงตอนชิงตำแหน่งแล้วรอด',icon:'🃏',tier:'silver',hid:1,t:s=>!!(s.cw&&s.cw.won&&s.cw.how==='cheat')},
 {id:'crown_caught',n:'มือไว แต่ตาคนไวกว่า',d:'โกงตอนชิงตำแหน่งแล้วโดนจับได้กลางที่ชุมนุม',icon:'🚨',tier:'bronze',t:s=>!!(s.cw&&num(s.cw.caught)>0)},
 {id:'crown_retry',n:'แพ้แล้วขึ้นใหม่',d:'ชิงตำแหน่งครั้งแรกแพ้ ครั้งที่สองชนะ',icon:'🔂',tier:'gold',t:s=>!!(s.cw&&s.cw.won&&num(s.cw.n)>=2)},
 {id:'rez',n:'ยังไม่ถึงคิว',d:'นักบวชตายแล้วฟื้นกลับมากลางหอ',icon:'🙏',tier:'silver',t:s=>!!s.rez},
 {id:'rez_win',n:'ตายมาแล้วรอบหนึ่ง',d:'ชนะเกมทั้งที่เคยตายไปแล้วครั้งหนึ่ง',icon:'⚱️',tier:'gold',t:s=>!!s.won&&!!s.rez},
 {id:'sneak1',n:'เดินเขย่งปลายเท้า',d:'แอบอ้อมบอสได้โดยไม่โดนจับ',icon:'🦶',tier:'bronze',t:s=>num(s.sneaks)>=1},
 {id:'sneak3',n:'บอสจำหน้าไม่ได้',d:'แอบอ้อมบอสสำเร็จ 3 ครั้งในรอบเดียว',icon:'🥷',tier:'silver',t:s=>num(s.sneaks)>=3},
 {id:'caught',n:'ก้อนหินก้อนนั้น',d:'แอบอ้อมบอสแล้วเหยียบหินดังก๊อก',icon:'🪨',tier:'bronze',t:s=>num(s.caught)>=1},
 {id:'tw1',n:'ทั้งหอเจอเหมือนกัน',d:'เจอเหตุการณ์ระดับหอ',icon:'🌫️',tier:'bronze',t:s=>num(s.twN)>=1},
 {id:'fac_win',n:'เลือกข้างเป็น',d:'หนุนภาคีที่ได้ครองหอ',icon:'⚖️',tier:'bronze',t:s=>num(s.facW)>=1},
 {id:'bribe',n:'ไม่เข้าข้างใคร ยกเว้นทอง',d:'รับสินบนจากภาคีแล้วนั่งเฉยๆ',icon:'🤫',tier:'bronze',t:s=>num(s.facB)>=1},
 {id:'later',n:'ปลูกไว้ก่อน เก็บทีหลัง',d:'เรื่องที่เลือกไว้หลายชั้นก่อนออกผลดี',icon:'⏳',tier:'bronze',t:s=>num(s.ltG)>=1},
 {id:'dayhit',n:'ทันข่าววันนี้',d:'เจอเรื่องตามหัวข้อของวัน',icon:'📅',tier:'bronze',t:s=>num(s.dh)>0},
 {id:'dayzone',n:'ฝ่าข่าวร้ายมาได้',d:'เดินเข้าช่วงภัยประจำวันแล้วรอดออกมาอีกฝั่ง',icon:'📰',tier:'silver',t:s=>num(s.dz)>=2},
 {id:'stat5',n:'ร่างกายฟ้องทุกอย่าง',d:'ค่าสถานะส่งผลระหว่างทางครบ 5 แบบในรอบเดียว',icon:'📈',tier:'silver',t:s=>cnt(s.sn)>=5},
 {id:'stev3',n:'ชีวิตมีแต่เรื่องปวดหัว',d:'เจอเรื่องที่เกิดเพราะสถานะของตัวเอง 3 เรื่องในรอบเดียว',icon:'🐾',tier:'silver',t:s=>num(s.stE)>=3},
 {id:'gw',n:'วันที่ไม่ได้มาถึง',d:'มอบความปรารถนาที่ค้างไว้ให้ใครสักคน',icon:'🎁',tier:'bronze',ev:1},
 {id:'credits',n:'นั่งดูจนไฟเปิด',d:'อยู่ดูเรื่องที่ไม่มีใครรู้หลังคำจารึก',icon:'🎬',tier:'bronze',hid:1,ev:1},
 {id:'memo',n:'ป้ายหลุมศพออนไลน์',d:'ตั้งอนุสรณ์ออนไลน์ให้ชีวิตที่จบไป',icon:'🪦',tier:'bronze',ev:1},
 {id:'candle',n:'เทียนให้คนแปลกหน้า',d:'จุดเทียนที่อนุสรณ์ของคนอื่น',icon:'🕯',tier:'bronze',ev:1},
 {id:'move',n:'ขนเซฟย้ายบ้าน',d:'ย้ายเซฟข้ามเครื่องด้วยโค้ด 9 ตัว',icon:'📦',tier:'bronze',ev:1},
 // v0.2.8 หอเกียรติยศ: ext = ปลดจากข้างนอกผ่าน ACH.grant(id) เท่านั้น (leaderboard.js เรียกเมื่อเซิร์ฟเวอร์ตอบ hof:1)
 {id:'hof',n:'ขึ้นหอเกียรติยศ',d:'พิชิตยอดหอ แล้วชื่อได้ขึ้นหอเกียรติยศบนเว็บหลัก',icon:'🖼️',tier:'gold',ext:1},
 // ดาบศักดิ์สิทธิ์ในหิน (summary: exT ลองดึงกี่ครั้งในรอบนี้, exG ดึงออกในรอบนี้, sw มีดาบติดตัว)
 {id:'exc_try',n:'มือแรกบนด้ามดาบ',d:'ลองดึงดาบศักดิ์สิทธิ์ในหินเป็นครั้งแรก',icon:'🪨',tier:'bronze',t:s=>num(s.exT)>0},
 {id:'exc_got',n:'ผู้ถอนดาบในหิน',d:'ดึงดาบศักดิ์สิทธิ์ออกจากหินได้',icon:'🗡️',tier:'legend',t:s=>s.exG===true},
 // v0.2.23 อีเวนต์ที่ผู้เล่นต้องเลือกเอง (summary.nwA = ผลที่ได้ในรอบนั้น)
 {id:'orc_save',n:'อัศวินขี่ม้าขาว',d:'ช่วยหญิงสาวจากออร์ค จนเธอมาร่วมทีม',icon:'🪓',tier:'silver',t:s=>nw(s,'orc')},
 {id:'elf_free',n:'มิตรแห่งป่า',d:'ปลดเอลฟ์ออกจากตาข่ายพรานเถื่อน',icon:'🧝',tier:'silver',t:s=>nw(s,'elf')},
 {id:'isek_meet',n:'ประตูต่างโลก',d:'เจอคนที่ร่วงลงมาจากต่างโลก',icon:'🌀',tier:'bronze',t:s=>nw(s,'isek')},
 {id:'isek_pupil',n:'อาจารย์ข้ามมิติ',d:'รับคนจากต่างโลกเป็นศิษย์',icon:'🎓',tier:'silver',t:s=>nw(s,'isek_pupil')},
 {id:'isek_duel',n:'ดาบไม้ไผ่ก็ต้องแพ้',d:'ชนะดวลนักดาบจากต่างโลก',icon:'🎋',tier:'silver',t:s=>nw(s,'isek_duel')},
 {id:'isek_foe',n:'จอมมารกลับบ้านไป',d:'ไล่จอมมารจากต่างโลกกลับเข้าประตูมิติ',icon:'👿',tier:'gold',t:s=>nw(s,'isek_foe')},
 {id:'isek_recall',n:'ยังไม่ทันได้ลา',d:'เพื่อนจากต่างโลกโดนเรียกตัวกลับกลางทาง',icon:'📱',tier:'silver',hid:1,t:s=>nw(s,'isek_recall')},
 {id:'vgod_meet',n:'ผนังที่แตก',d:'เห็นตัวตนจากนอกโลกเจาะผนังหอเข้ามา',icon:'🕳️',tier:'gold',hid:1,t:s=>nw(s,'vgod')},
 {id:'vgod_win',n:'ผู้พิชิตเทพ',d:'ล้มตัวตนจากนอกโลกได้',icon:'🌑',tier:'legend',hid:1,t:s=>nw(s,'vgod_win')},
 {id:'vgod_touch',n:'ฝ่ามือสีดำ',d:'ให้ตัวตนจากนอกโลกแตะมือ แล้วได้เห็นหอคอยนับพันหอ',icon:'🖐️',tier:'gold',hid:1,t:s=>nw(s,'vgod_touch')},
 {id:'toll_free',n:'ไม่จ่ายสักแดง',d:'ผ่านด่านโจรป่าไปโดยไม่เสียค่าผ่านทาง',icon:'🪵',tier:'bronze',t:s=>nw(s,'toll')},
 {id:'gmkt',n:'ลูกค้าตลาดผี',d:'ซื้อขายกับแผงในตลาดผีตอนเที่ยงคืน',icon:'🏮',tier:'bronze',t:s=>nw(s,'gmkt')},
 {id:'siren',n:'เพลงใต้ทะเลสาบ',d:'ได้ของขวัญจากนางเงือกในทะเลสาบใต้ดิน',icon:'🧜',tier:'silver',t:s=>nw(s,'siren')},
 {id:'summon',n:'ปิดวงเวท',d:'จัดการปีศาจที่ศิษย์จอมเวทเรียกพลาด',icon:'🔮',tier:'bronze',t:s=>nw(s,'summon')},
 {id:'gwed',n:'แขกคนแรก',d:'ได้ของติดมือกลับจากงานแต่งก็อบลิน',icon:'💒',tier:'bronze',t:s=>nw(s,'gwed')},
 {id:'giant',n:'ตอบถูกเผง',d:'ตอบปริศนาของยักษ์ขวางบันไดถูก',icon:'🧠',tier:'bronze',t:s=>nw(s,'giant')},
 {id:'fugit',n:'คนช่วยคนหนี',d:'ช่วยนักโทษหนีคุกพ้นมือทหาร',icon:'⛓️',tier:'bronze',t:s=>nw(s,'fugit')},
 {id:'mirror',n:'ชนะเงาตัวเอง',d:'ผ่านเงาในกระจกที่ไม่ขยับตามมาได้',icon:'🪞',tier:'silver',t:s=>nw(s,'mirror')},
 {id:'statue',n:'คำสาปหิน',d:'ปลุกเจ้าหญิงที่กลายเป็นหินให้ฟื้น',icon:'👸',tier:'gold',t:s=>nw(s,'statue')},
 {id:'dwarf',n:'คอทองแดง',d:'ดื่มชนะคนแคระในโรงเหล้าใต้ดิน',icon:'🍺',tier:'silver',t:s=>nw(s,'dwarf')},
 {id:'exc_win',n:'ดาบกับมงกุฎ',d:'ชนะเกมทั้งที่มีดาบในหินติดตัว',icon:'⚜️',tier:'gold',t:s=>!!s.won&&s.sw===true}
];
function nw(s,id){return Array.isArray(s.nwA)&&s.nwA.includes(id);}
const BY={};DEFS.forEach(a=>{BY[a.id]=a;});

// ---------- storage: อ่าน-รวม-เขียน ไม่ลบของเก่า ----------
function blank(){return {v:1,got:{},runs:0,clsWins:{}};}
function load(){let o=null;try{o=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
 const b=blank();if(!o||typeof o!=='object')return b;
 if(o.got&&typeof o.got==='object')for(const k in o.got){const t=num(o.got[k]);if(t>0)b.got[k]=t;}
 b.runs=Math.max(0,Math.floor(num(o.runs)));
 if(o.clsWins&&typeof o.clsWins==='object')for(const k in o.clsWins)b.clsWins[k]=Math.max(0,Math.floor(num(o.clsWins[k])));
 return b;}
let M=load();
function save(){try{const cur=load();// รวมกับค่าที่อาจถูกเขียนจากแท็บอื่น
 for(const k in cur.got)if(!M.got[k]||cur.got[k]<M.got[k])M.got[k]=cur.got[k];
 M.runs=Math.max(M.runs,cur.runs);for(const k in cur.clsWins)M.clsWins[k]=Math.max(M.clsWins[k]||0,cur.clsWins[k]);
 localStorage.setItem(KEY,JSON.stringify(M));}catch(e){}}

// ---------- สถิติในรอบปัจจุบัน ----------
function freshRun(){return {floor:0,bossWins:0,pets:new Set(),comps:0,mimicWins:0,legends:0,omens:0,kMax:0,kMin:0,gen:0};}
let R=freshRun();

// ---------- toast ----------
let css=false;
function injectCSS(){if(css||typeof document==='undefined')return;css=true;const st=document.createElement('style');st.id='ach-css';st.textContent=`
#achToasts{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;width:min(360px,calc(100vw - 32px))}
.ach-t{display:flex;align-items:center;gap:10px;background:var(--panel,#15232a);border:2px solid var(--gold,#f4bb4a);box-shadow:0 0 0 2px #070c0e,0 6px 18px #000a;border-radius:3px;padding:8px 12px;color:var(--ink,#f1e7d0);font-family:'Mitr','Kanit',system-ui,sans-serif;font-size:13px;line-height:1.35;animation:achIn .35s steps(4) both}
.ach-t.out{animation:achOut .3s steps(3) both}
.ach-t .ic{font-size:24px;flex:none;width:34px;height:34px;display:grid;place-items:center;background:var(--bg2,#101b20);border:2px solid var(--line,#2c434d);border-radius:2px}
.ach-t .hd{font-family:'DotGothic16','Mitr',monospace;font-size:11px;letter-spacing:.04em;color:var(--gold,#f4bb4a)}
.ach-t b{display:block;font-weight:500;font-size:14px}
.ach-t .dd{color:var(--muted,#a3b5ad);font-size:12px}
@keyframes achIn{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}
@keyframes achOut{to{opacity:0;transform:translateY(-10px)}}
@media (prefers-reduced-motion:reduce){.ach-t,.ach-t.out{animation:none}}
.ach-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.ach-c{display:flex;gap:8px;align-items:flex-start;background:var(--bg2,#101b20);border:2px solid var(--line,#2c434d);border-radius:3px;padding:7px 8px;font-size:12px;line-height:1.35;color:var(--ink,#f1e7d0);min-width:0}
.ach-c .ic{font-size:20px;flex:none;width:28px;text-align:center}
.ach-c b{display:block;font-size:13px;font-weight:500}
.ach-c .dd{color:var(--muted,#a3b5ad)}
.ach-c .tr{font-family:'DotGothic16','Mitr',monospace;font-size:10px}
.ach-c.lock{opacity:.5;filter:grayscale(1)}
.ach-c.lock .ic{opacity:.6}
.ach-sum{font-size:13px;color:var(--muted,#a3b5ad);margin:0 0 8px}
.ach-sum b{color:var(--gold,#f4bb4a);font-family:'DotGothic16','Mitr',monospace}`;
 (document.head||document.documentElement).appendChild(st);}
const queue=[];let showing=false;
function toast(a){if(typeof document==='undefined')return;queue.push(a);if(!showing)nextToast();}
function nextToast(){const a=queue.shift();if(!a){showing=false;return;}showing=true;
 try{injectCSS();let box=document.getElementById('achToasts');
  if(!box){box=document.createElement('div');box.id='achToasts';box.setAttribute('role','status');box.setAttribute('aria-live','polite');document.body.appendChild(box);}
  const el=document.createElement('div');el.className='ach-t';el.style.borderColor=TIER[a.tier].c;
  el.innerHTML=`<span class="ic" aria-hidden="true">${a.icon}</span><span><span class="hd">ปลดล็อกความสำเร็จ · ${TIER[a.tier].n}</span><b>${esc(a.n)}</b><span class="dd">${esc(a.d)}</span></span>`;
  box.appendChild(el);
  try{if(window.AUDIO&&typeof window.AUDIO.sfx==='function')window.AUDIO.sfx('levelup');}catch(e){}
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>{el.remove();nextToast();},320);},queue.length>2?1500:queue.length?2200:3200);
 }catch(e){showing=false;}}

// ---------- unlock ----------
function unlock(id){const a=BY[id];if(!a||M.got[id])return false;M.got[id]=Date.now();save();toast(a);
 try{if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('ach:unlock',{detail:{id}}));}catch(e){}return true;}
function floorCheck(f){DEFS.forEach(a=>{if(a.f&&f>=a.f)unlock(a.id);});}

function onEvent(type,data){try{const d=(data&&typeof data==='object')?data:{};
 switch(str(type)){
  case 'floor':{const f=Math.floor(num(d.floor));if(f>0&&f<R.floor&&f<=1)R=freshRun();R.floor=Math.max(R.floor,f);floorCheck(f);break;}
  case 'boss_win':R.bossWins++;unlock('boss1');if(R.bossWins>=5)unlock('boss5');if(num(d.floor))floorCheck(num(d.floor));break;
  case 'pet':R.pets.add(str(d.id)||('p'+R.pets.size));if(R.pets.size>=2)unlock('pets2');break;
  case 'comp':R.comps++;if(R.comps>=2)unlock('comps2');break;
  case 'mimic':if(d.won!==false){R.mimicWins++;unlock('mimic');}break;
  case 'legend':R.legends++;unlock('legend');break;
  case 'omen':R.omens++;unlock('omen');break;
  case 'lineage':{const g=Math.floor(num(d.gen));R.gen=Math.max(R.gen,g);if(g>=3)unlock('gen3');if(g>=10)unlock('gen10');break;}
  case 'gw':unlock('gw');break;
  case 'credits':unlock('credits');break;
  case 'birth_ss':unlock('ss');break;
  case 'brink':unlock('brink1');if(num(d.n)>=3)unlock('brink3');break;
  case 'clan':unlock('clan_pick');break;
  case 'clanpet':unlock('clanpet_pick');break;
  case 'memo':unlock('memo');break;
  case 'candle':unlock('candle');break;
  case 'move':if(str(d.dir)==='in')M=load();unlock('move');break;// รับเซฟ: เริ่มจากของที่เพิ่งย้ายมา ไม่เอาของเครื่องเดิมกลับมาปน
  case 'karma':{const t=num(d.total);R.kMax=Math.max(R.kMax,t);R.kMin=Math.min(R.kMin,t);if(t>=20)unlock('kgood');if(t<=-20)unlock('kbad');break;}
 }}catch(e){}}

function onRunEnd(summary){const out=[];try{const s=(summary&&typeof summary==='object')?summary:{};
 M.runs++;if(s.won&&CLS[str(s.clsId)])M.clsWins[s.clsId]=(M.clsWins[s.clsId]||0)+1;save();
 floorCheck(num(s.floor));
 DEFS.forEach(a=>{let ok=false;try{if(a.cls)ok=!!s.won&&str(s.clsId)===a.cls;else if(a.t)ok=!!a.t(s,R,M);}catch(e){}
  if(ok&&unlock(a.id))out.push(a.id);});
 }catch(e){}R=freshRun();return out;}

function list(){return DEFS.map(a=>({id:a.id,n:a.n,d:a.d,icon:a.icon,tier:a.tier,hid:!!a.hid,got:!!M.got[a.id],at:M.got[a.id]||null}));}
function count(){return DEFS.reduce((n,a)=>n+(M.got[a.id]?1:0),0);}
function panelHTML(){injectCSS();const L=list(),g=L.filter(a=>a.got).length;
 const fd=t=>{try{return new Date(t).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});}catch(e){return '';}};
 return `<p class="ach-sum">ปลดล็อกแล้ว <b>${g}/${L.length}</b> · เล่นจบไปแล้ว ${M.runs} รอบ</p><div class="ach-grid">`+
  L.map(a=>{const T=TIER[a.tier];if(a.hid&&!a.got)a=Object.assign({},a,{n:'???',d:'ความสำเร็จลับ'});return `<div class="ach-c${a.got?'':' lock'}" title="${esc(a.d)}"><span class="ic" aria-hidden="true">${a.got?a.icon:'🔒'}</span><span style="min-width:0"><b>${esc(a.n)}</b><span class="dd">${esc(a.d)}</span><br><span class="tr" style="color:${T.c}">${T.n}${a.got&&a.at?' · '+fd(a.at):''}</span></span></div>`;}).join('')+'</div>';}

const grant=id=>{try{return !!(BY[id]&&BY[id].ext)&&unlock(id);}catch(e){return false;}};
// v0.3: โมดูลอื่นลงทะเบียนความสำเร็จของตัวเอง (ext:1 เสมอ ปลดผ่าน grant) ACH.add([{id,n,d,icon,tier,hid}])
const add=L=>{(Array.isArray(L)?L:[L]).forEach(a=>{if(a&&a.id&&!BY[a.id]){const d=Object.assign({tier:'silver',icon:'🏅'},a,{ext:1});DEFS.push(d);BY[d.id]=d;}});};
window.ACH={onEvent,onRunEnd,list,panelHTML,count,grant,add,TIERS:TIER};
})();
