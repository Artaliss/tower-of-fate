// hard.js — ลานฝึก + ดันเจี้ยนโหมดยาก 20 ด่าน + หอท้าทาย + ร้านเหรียญรุ้ง (v0.3)
// ข้อมูลใน META P.mod.hard = {rb เหรียญรุ้ง, rbAll, best ด่านสูงสุดที่ผ่าน(0-20), ch ระดับท้าทายสูงสุด, party:[id], pet:id, inj:{id:หายเมื่อ}, xp:{id:แต้ม}, statue 0/1/2, tk ตั๋ว Master, tr ฝึกกี่ครั้ง}
// event: tof:hard-clear {stage,first} (หอท้าทายส่ง stage=20+ระดับ) · tof:train {id}
// ส่วนต่อสู้ (fight/foe) เป็นฟังก์ชันล้วน รันใน node ได้: window.HARD
(function(){
'use strict';
const C=()=>window.CONTENT||{};
const BONUS=k=>{try{return window.CITY&&window.CITY.bonus?(+window.CITY.bonus(k)||1):1;}catch(e){return 1;}};
// บัพประจำอาชีพ (สเปกเดียวกับโหมดไต่หอ): t:'me' ได้เฉพาะตัวเอง · t:'pt' ทั้งตี้ ไม่ซ้อนกัน ใช้ของคนที่แรงสุด · Master แรงขึ้นครึ่งเท่า
const BUFF={
 war:{t:'me',n:'ใจนักสู้',d:'HP ต่ำกว่า 40% ตีแรงขึ้น 8% นาน 5 เทิร์น'},
 mag:{t:'me',n:'เวทเข้มข้น',d:'ดาเมจเวท +5%'},
 arc:{t:'pt',n:'ตาเหยี่ยว',d:'ทั้งตี้คริติคอล +5%'},
 pri:{t:'pt',n:'แสงศักดิ์สิทธิ์',d:'ฮีลทั้งตี้ทุกเทิร์น ฮีลแรงขึ้น 6%'},
 rog:{t:'pt',n:'มือไว',d:'ทั้งตี้หลบ +5% · เหรียญดรอปเพิ่ม'},
 far:{t:'pt',n:'มือเลี้ยงสัตว์',d:'บัพสัตว์เลี้ยงในตี้แรงขึ้น 4%'},
 dra:{t:'me',n:'เลือดมังกร',d:'ATK/DEF +15%'},
 dsl:{t:'me',n:'ล่ามังกร',d:'ดาเมจใส่บอสมังกร +20%'},
 nec:{t:'pt',n:'ปลุกศพ',d:'ลูกน้องบอสที่ล้มลุกมาช่วยตี 1 ตัวต่อด่าน'},
 ang:{t:'me',n:'ปีกสวรรค์',d:'HP ต่ำกว่า 20% ฟื้น 50% คืนชีพได้ 1 ครั้งต่อด่าน หลังจากนั้น ATK −15%'}};
// สัตว์เลี้ยงลงดันเจี้ยนได้ 1 ตัว · ตัวตำนาน (legend) แรงกว่า
const PETB={slime:{d:'ฟื้น HP ตี้ 3% ทุกเทิร์น',heal:.03},fox:{d:'ATK ตี้ +10%',atk:.1},owl:{d:'คริติคอลง่ายขึ้น 8%',crit:.08},wolf:{d:'DEF ตี้ +10% · ช่วยกัด',def:.1,bite:.4},
 drk:{d:'ATK ตี้ +12%',atk:.12},drs:{d:'DEF ตี้ +10% · ฟื้น HP 2% ทุกเทิร์น',def:.1,heal:.02},drg:{d:'เหรียญเมือง +25% · คริติคอล +3%',gold:.25,crit:.03},
 unicorn:{d:'ฟื้น HP ตี้ 6% ทุกเทิร์น · ATK +10%',heal:.06,atk:.1},fairy:{d:'หลบง่ายขึ้น 12% · ATK +10%',dodge:.12,atk:.1},
 phoenix:{d:'ชุบทั้งตี้ได้ 1 ครั้ง · ATK +15%',rev:1,atk:.15},griffin:{d:'ATK ตี้ +25% · ช่วยจิก',atk:.25,bite:.6}};
function petB(p){if(!p)return null;const b=PETB[p.k];if(b)return b;return p.legend?{d:'ATK/DEF ตี้ +15% · ฟื้น HP 3% ทุกเทิร์น',atk:.15,def:.15,heal:.03}:{d:'ATK/DEF ตี้ +5%',atk:.05,def:.05};}
// 20 ด่าน บอสธีมแฟนตาซีไทย: n ชื่อ, drg บอสมังกร (นักล่ามังกรตีแรงขึ้น), mn ลูกสมุน, sk ท่าไม้ตาย, x คำโปรย
const STAGES=[
 {n:'ผีปอบหมู่บ้านร้าง',mn:'ปอบลูกกระจ๊อก',sk:'สูดไส้ทั้งหมู่บ้าน',x:'หมู่บ้านนี้เงียบเกินไป มีแต่เสียงเคี้ยวดังมาจากใต้ถุนบ้าน'},
 {n:'นางพรายตะเคียน',mn:'ภูตใบตะเคียน',sk:'ผมยาวรัดคอ',x:'ต้นตะเคียนพันปีพันผ้าเจ็ดสีไว้รอบลำต้น มีคนร้องไห้อยู่ข้างใน'},
 {n:'กุมารทองคลั่ง',mn:'ตุ๊กตาไม้ไผ่',sk:'งอแงพังศาล',x:'เด็กตัวทองวิ่งเล่นกลางศาลร้าง เสียงหัวเราะทำขนลุกไปทั้งตัว'},
 {n:'ชาละวันแห่งบึงดำ',mn:'จระเข้บริวาร',sk:'ม้วนตัวลากลงน้ำ',x:'ผิวน้ำในบึงนิ่งผิดปกติ จนเห็นเขี้ยวคู่หนึ่งโผล่ขึ้นมา'},
 {n:'ยักษ์เฝ้าประตูหิน',mn:'ทหารยักษ์ตัวจิ๋ว',sk:'กระบองทุบแผ่นดิน',x:'ยักษ์หินลืมตาตื่นหลังหลับมาสามร้อยปี และมันหิวมาก'},
 {n:'เปรตสูงเสียดฟ้า',mn:'เปรตปากเข็ม',sk:'หวีดร้องขอส่วนบุญ',x:'เงาผอมสูงชะลูดยื่นมือยาวลงมาจากเมฆ ขอข้าวคุณกิน'},
 {n:'นาคราชแม่น้ำโขง',drg:1,mn:'งูน้ำเกล็ดเงิน',sk:'พ่นบั้งไฟพญานาค',x:'ลูกไฟสีแดงพุ่งขึ้นจากแม่น้ำ แล้วหัวนาคเจ็ดเศียรก็ตามขึ้นมา'},
 {n:'สางป่าหิมพานต์',mn:'ลิงกังสีหมอก',sk:'หมอกหลงทาง',x:'ในป่าที่ไม่มีแผนที่ มีบางอย่างเลียนเสียงเพื่อนคุณเรียกให้เดินลึกเข้าไป'},
 {n:'คชสีห์คลั่ง',mn:'ช้างป่าตาแดง',sk:'งาสิงห์กระแทก',x:'ตัวเป็นสิงห์ หัวเป็นช้าง แผดเสียงทีเดียวต้นไม้ล้มเป็นแถบ'},
 {n:'ทศพักตร์จำแลง',mn:'ยักษ์ทหารเลว',sk:'สิบหน้าสิบคำสาป',x:'ราชายักษ์สิบหน้าหัวเราะพร้อมกันทั้งสิบปาก ฟังแล้วหูอื้อ'},
 {n:'กินรีต้องสาป',mn:'นกหน้าคน',sk:'ร่ายรำสะกดใจ',x:'นางรำครึ่งนกร่ายรำอยู่ริมสระบัว ใครเผลอมองนานเกินไปจะเดินตามนางไป'},
 {n:'มังกรเงาทะเลลึก',drg:1,mn:'ปลาหมึกสีหมึก',sk:'คลื่นยักษ์ซัดฝั่ง',x:'เกล็ดสีทองโผล่จากทะเลสีดำ แล้วทั้งชายหาดก็มืดลง'},
 {n:'วิรุฬหกผู้เฝ้าทิศใต้',mn:'กุมภัณฑ์บริวาร',sk:'พระขรรค์ฟาดทิศ',x:'ท้าวผู้เฝ้าทิศใต้ไม่ยอมให้ใครผ่าน เว้นแต่จะชนะเขาได้'},
 {n:'พญาครุฑเพลิง',mn:'ลูกครุฑปีกไฟ',sk:'กระพือปีกพายุเพลิง',x:'เงาปีกใหญ่บังแสงอาทิตย์ทั้งหุบเขา ขนแต่ละเส้นลุกเป็นไฟ'},
 {n:'ไมยราพณ์ผู้สะกดทัพ',mn:'ภูตกล้องยาสั่ง',sk:'เป่ากล้องสะกดหลับ',x:'ควันหอมลอยมาจากที่ไหนไม่รู้ เพื่อนในตี้เริ่มหาวกันทีละคน'},
 {n:'นางผีเสื้อสมุทร',mn:'ผีพรายทะเล',sk:'แปลงร่างยักษ์ไล่กวด',x:'หญิงงามยืนรอบนโขดหิน ยิ้มหวานจนลืมไปว่านางกินคนมาแล้วกี่ลำเรือ'},
 {n:'อสุรกายพันกร',mn:'แขนงอกจากดิน',sk:'พันมือพันอาวุธ',x:'มือนับพันโผล่ขึ้นจากพื้น แต่ละมือถืออาวุธคนละแบบ'},
 {n:'ราหูอมจันทร์',mn:'ดาวตกสีดำ',sk:'กลืนแสงทั้งฟ้า',x:'พระจันทร์หายไปครึ่งดวง มีปากมหึมาค่อยๆ เคี้ยวมันอยู่บนฟ้า'},
 {n:'กุมภกรรณตื่นจากนิทรา',mn:'ยักษ์ปลุกตื่น',sk:'หอกโมกขศักดิ์',x:'ยักษ์ที่นอนมาหกเดือนเพิ่งถูกปลุก อารมณ์ไม่ดีเลยสักนิด'},
 {n:'พญามารแห่งหิมพานต์',mn:'มารรับใช้',sk:'คำสาปปลายกัป',x:'ที่ปลายสุดของป่าหิมพานต์ มีบัลลังก์สีดำรอผู้กล้ามานั่งแทน'}];
// ด่าน s (1-20, 21+ = หอท้าทาย) — บอสโตราว 16.5%/ด่าน (HP) 10% (ATK/DEF)
function foe(s){const i=Math.max(1,s|0),b=STAGES[(i-1)%20],ch=i>20,name=ch?b.n+' ร่างท้าทาย '+(i-20):b.n;
 return{n:name,drg:b.drg||0,mn:b.mn,sk:b.sk,x:b.x,s:i,hp:Math.round(2300*Math.pow(1.165,i-1)),atk:Math.round(85*Math.pow(1.1,i-1)),def:Math.round(45*Math.pow(1.1,i-1))};}
const cls=id=>(C().CLASSES||[]).find(x=>x.id===id);
// บัพแบบทั้งตี้: {id: ตัวคูณ 1 หรือ 1.5 (Master)}
function buffs(team){const B={};team.forEach(m=>{const b=BUFF[m.cls];if(!b||b.t!=='pt')return;const f=m.master?1.5:1;if(!B[m.cls]||B[m.cls]<f)B[m.cls]=f;});return B;}
// พลังสัตว์เลี้ยงหลังคูณบัพชาวไร่และอารมณ์สัตว์จาก city.js (ไม่คูณการชุบชีวิต)
function petPow(pet,B,mul){const b=petB(pet);if(!b)return{};const f=(1+(B.far?.04*B.far:0))*(mul||1),o={};for(const k in b)o[k]=typeof b[k]==='number'&&k!=='rev'?b[k]*f:b[k];return o;}
// สกิลประจำอาชีพในดันเจี้ยน (ผู้เล่นกดเอง): k ชนิด · m ตัวคูณ · dm ตัวคูณใส่บอสมังกร · cd ใช้แล้วต้องรอกี่เทิร์น
const SKILL={
 war:{n:'ฟันทะลวง',i:'🗡',k:'hit',m:2.2,cd:2,d:'ฟันเป้าหมายแรง ×2.2'},
 mag:{n:'ฝนดาวตก',i:'☄️',k:'aoe',m:1.2,cd:2,d:'ตีศัตรูทุกตัว ×1.2'},
 arc:{n:'ยิงเจาะเกราะ',i:'🏹',k:'pierce',m:1.8,cd:2,d:'ยิง ×1.8 ไม่สนเกราะ'},
 pri:{n:'แสงเยียวยา',i:'✨',k:'heal',m:.3,cd:3,d:'ฮีลทั้งตี้ 30% ของ HP'},
 rog:{n:'แทงข้างหลัง',i:'🔪',k:'crit',m:1.5,cd:2,d:'แทง ×1.5 ติดคริติคอลแน่นอน'},
 far:{n:'สมุนไพรบ้านนา',i:'🌿',k:'heal1',m:.5,cd:2,d:'ฮีลคนเลือดน้อยสุด 50%'},
 dra:{n:'ลมหายใจมังกร',i:'🔥',k:'aoe',m:1.5,cd:3,d:'พ่นไฟใส่ศัตรูทุกตัว ×1.5'},
 dsl:{n:'ฟันเกล็ดมังกร',i:'⚔️',k:'hit',m:2,dm:3,cd:2,d:'ฟัน ×2 (บอสมังกรโดน ×3)'},
 nec:{n:'ดูดวิญญาณ',i:'💀',k:'drain',m:1.6,cd:2,d:'ตี ×1.6 แล้วดูดเลือดกลับครึ่งหนึ่ง'},
 ang:{n:'ม่านปีกสวรรค์',i:'🪽',k:'shield',cd:3,d:'เทิร์นนี้ทั้งตี้รับดาเมจแค่ครึ่งเดียว'},
 '':{n:'ทุ่มสุดตัว',i:'💢',k:'hit',m:1.8,cd:2,d:'ตี ×1.8'}};
const skillOf=c=>SKILL[c]||SKILL[''];
// การต่อสู้แบบสั่งทีละเทิร์น (ฟังก์ชันล้วน): S=start(team,F,pet,o) แล้ว turn(S,orders) จนกว่า S.end
// team [{id,name,cls,hp,atk,def,luk,master}] · pet {k,legend} · o {hpM, petM, rng}
// orders[i]={s:'atk'|'sk'|'grd',tg:index ใน S.E} ของ S.A[i] · turn คืน event ของเทิร์นนั้นให้ UI เล่นอนิเมชัน
function start(team,F,pet,o){o=o||{};const B=buffs(team),PB=petPow(pet,B,o.petM),hpM=o.hpM||1;
 const A=team.map(m=>{const f=m.master?1.5:1,me=BUFF[m.cls]&&BUFF[m.cls].t==='me'?f:0,dr=m.cls==='dra'?1+.15*me:1;
  return{id:m.id,n:m.name,cls:m.cls,f:me,mhp:m.hp*hpM,hp:m.hp*hpM,atk:m.atk*(1+(PB.atk||0))*dr,def:m.def*(1+(PB.def||0))*dr,luk:m.luk|0,me:1,rg:0,wing:m.cls==='ang'?1:0,cd:0,grd:0};});
 const E=[{n:F.n,hp:F.hp,mhp:F.hp,atk:F.atk,def:F.def,boss:1},{n:F.mn+' ซ้าย',hp:F.hp*.12,mhp:F.hp*.12,atk:F.atk*.35,def:F.def*.5},{n:F.mn+' ขวา',hp:F.hp*.12,mhp:F.hp*.12,atk:F.atk*.35,def:F.def*.5}];
 return{F,B,PB,R:o.rng||Math.random,A,E,t:0,phx:PB.rev?1:0,nec:B.nec?1:0,shd:0,warn:0,down:[],end:0,win:false,log:[`⚔️ ${F.n} ขวางทางอยู่ พร้อม${F.mn}อีกสองตัว`]};}
function turn(S,O){if(S.end)return[];const{F,B,PB,R,A,E}=S,ev=[],L=S.log,say=s=>L.push(s),boss=E[0];
 const rnd=(a,b)=>a+R()*(b-a),pick=a=>a[Math.floor(R()*a.length)],fmt=n=>Math.round(n).toLocaleString();
 const live=a=>a.filter(x=>x.hp>0),foes=()=>live(E),ai=a=>'a'+A.indexOf(a),ei=e=>'e'+E.indexOf(e);
 const crit=a=>.05+a.luk/600+(B.arc?.05*B.arc:0)+(PB.crit||0),dodge=.03+(B.rog?.05*B.rog:0)+(PB.dodge||0);
 const hit=(at,df)=>at*at/(at+df)*rnd(.9,1.1);
 const pow=a=>{let x=a.atk;if(a.cls==='war'&&a.rg>0)x*=1+.08*a.f;if(a.cls==='mag')x*=1+.05*a.f;if(a.fall)x*=1-.15;return x;};
 const heal=(a,v)=>{if(a.hp<=0)return;const d=Math.min(a.mhp-a.hp,v);a.hp+=d;if(d>=1)ev.push({k:'heal',to:ai(a),d});};
 const strike=(a,tg,m,o)=>{o=o||{};let d=(o.pierce?pow(a)*rnd(.9,1.1):hit(pow(a),tg.def))*m;if(a.cls==='dsl'&&F.drg)d*=1+.2*a.f;
  const c=a.me&&(o.crit||R()<crit(a));if(c)d*=1.7;tg.hp-=d;ev.push({k:'hit',from:ai(a),to:ei(tg),d,c,sk:o.sk});return d;};
 const hurt=(a,d,src,from)=>{d*=(a.grd?.4:1)*(S.shd?.5:1);a.hp-=d;ev.push({k:'hit',from,to:ai(a),d});
  if(a.wing&&a.hp>0&&a.hp<a.mhp*.2){a.wing=0;a.fall=1;a.hp=Math.min(a.mhp,a.hp+a.mhp*.5*a.f);say(`🪽 ${a.n} กางปีกสวรรค์ ฟื้นกลับมาครึ่งหลอด แต่แรงตกลง`);return;}
  if(a.cls==='war'&&a.hp>0&&a.hp<a.mhp*.4&&a.rg<=0){a.rg=5;say(`😤 ${a.n} เลือดขึ้นหน้า ตีแรงขึ้นอีก 5 เทิร์น`);}
  if(a.hp<=0){if(a.wing){a.wing=0;a.fall=1;a.hp=a.mhp*.5*a.f;say(`🪽 ${a.n} คืนชีพด้วยปีกสวรรค์ แต่แรงตกลง`);return;}a.hp=0;say(a.me?`💥 ${a.n} ล้มลงเพราะ${src}`:`🦴 ${a.n}แตกสลายไปอีกรอบ`);if(a.me&&!S.down.includes(a.id))S.down.push(a.id);}};
 const t=++S.t;S.shd=0;let sum=0;
 // ฝั่งเรา: ทำตามคำสั่งทีละคน
 A.forEach((a,i)=>{a.grd=0;if(a.hp<=0||!foes().length)return;const od=(a.me&&O&&O[i])||{s:'atk'},sk=skillOf(a.cls);let tg=E[od.tg];if(!tg||tg.hp<=0)tg=boss.hp>0?boss:foes()[0];
  if(od.s==='grd'&&a.me){a.grd=1;ev.push({k:'grd',to:ai(a)});say(`🛡 ${a.n} ตั้งรับ`);return;}
  if(od.s!=='sk'||!a.me||a.cd>0){sum+=strike(a,tg,1);return;}
  a.cd=sk.cd+1;say(`${sk.i} ${a.n} ใช้ "${sk.n}"`);ev.push({k:'sk',to:ai(a),i:sk.i});const so={sk:sk.i};
  if(sk.k==='hit')sum+=strike(a,tg,F.drg&&sk.dm?sk.dm:sk.m,so);
  else if(sk.k==='aoe')foes().forEach(e=>{sum+=strike(a,e,sk.m,so);});
  else if(sk.k==='pierce')sum+=strike(a,tg,sk.m,Object.assign({pierce:1},so));
  else if(sk.k==='crit')sum+=strike(a,tg,sk.m,Object.assign({crit:1},so));
  else if(sk.k==='drain'){const d=strike(a,tg,sk.m,so);sum+=d;heal(a,d*.5);}
  else if(sk.k==='heal')live(A).forEach(b=>heal(b,b.mhp*sk.m));
  else if(sk.k==='heal1'){const lo=live(A).filter(b=>b.me).sort((x,y)=>x.hp/x.mhp-y.hp/y.mhp)[0];if(lo)heal(lo,lo.mhp*sk.m);}
  else if(sk.k==='shield'){S.shd=1;ev.push({k:'shd'});}});
 const ally=live(A).filter(a=>a.me);
 if(PB.bite&&foes().length&&ally.length){const tg=foes()[0],av=ally.reduce((s,a)=>s+a.atk,0)/ally.length,d=hit(av*PB.bite,tg.def);tg.hp-=d;sum+=d;ev.push({k:'hit',from:'pet',to:ei(tg),d});}
 E.forEach(e=>{if(e.hp<=0&&!e.dead){e.dead=1;e.hp=0;if(e.boss)return;const nm=e.n.replace(/ (ซ้าย|ขวา)$/,'');say(`🗡 ${nm}ล้มไปหนึ่งตัว`);
  if(S.nec){S.nec=0;const k=B.nec;A.push({id:'nec',n:nm+'ผีดิบ',cls:'',f:0,mhp:e.mhp*.6*k,hp:e.mhp*.6*k,atk:e.atk*1.2*k,def:e.def,luk:0,me:0,rg:0,wing:0,cd:0,grd:0});say(`💀 เนโครแมนเซอร์ปลุก${nm}ขึ้นมาสู้ข้างตี้`);}}});
 if(boss.hp<=0){say(`🏆 เทิร์น ${t}: ${F.n} ล้มลงแล้ว!`);S.end=1;S.win=true;return ev;}
 say(`🔸 เทิร์น ${t}: ตี้ทำดาเมจรวม ${fmt(sum)} (บอสเหลือ ${Math.max(1,Math.round(boss.hp/boss.mhp*100))}%)`);
 A.forEach(a=>{if(a.rg>0)a.rg--;});
 // ฝั่งศัตรู: ทุก 3 เทิร์นบอสใช้ท่าไม้ตายใส่ทั้งตี้ (เตือนก่อน 1 เทิร์น) · คนที่ตั้งรับจะดึงการโจมตีเดี่ยวของบอสมาที่ตัวเอง
 const rage=t>15?Math.pow(1.12,t-15):1;if(t===16)say(`😡 ${F.n} เริ่มคลั่ง แรงขึ้นทุกเทิร์น`);
 E.forEach((e,j)=>{if(e.boss||e.hp<=0)return;const tg=live(A);if(!tg.length)return;const a=pick(tg);if(R()<dodge)return;hurt(a,hit(e.atk,a.def),F.mn,'e'+j);});
 if(t%3===0){say(`🌀 ${F.n} ใช้ท่า "${F.sk}" ใส่ทั้งตี้!`);ev.push({k:'ult'});live(A).forEach(a=>{if(R()<dodge)return;hurt(a,hit(boss.atk*.7*rage,a.def),F.sk,'e0');});}
 else{const tg=live(A),gs=tg.filter(a=>a.grd);if(tg.length){const a=gs.length?pick(gs):pick(tg);
  if(R()<dodge)say(`💨 ${a.n} หลบการโจมตีของ${F.n}ได้ฉิวเฉียด`);else{const d=hit(boss.atk*rage,a.def);say(`👊 ${F.n}ฟาดใส่ ${a.n} ${fmt(d*(a.grd?.4:1)*(S.shd?.5:1))}`);hurt(a,d,F.n,'e0');}}}
 // ฟื้นตัวท้ายเทิร์น: นักบวชฮีล 5% ×(1+6%) · สัตว์เลี้ยงบางตัวฮีลเพิ่ม
 const hl=(B.pri?.05*(1+.06*B.pri):0)+(PB.heal||0);if(hl)live(A).forEach(a=>heal(a,a.mhp*hl));
 if(!live(A).some(a=>a.me)&&S.phx){S.phx=0;A.forEach(a=>{if(a.me){a.hp=a.mhp*.4;S.down=S.down.filter(x=>x!==a.id);}});say('🔥 ฟีนิกซ์กางปีก ทั้งตี้ลุกขึ้นจากเถ้าถ่าน!');}
 A.forEach(a=>{if(a.cd>0)a.cd--;});
 S.warn=(t+1)%3===0;
 if(!live(A).some(a=>a.me)){say('☠️ ตี้ล้มหมด ต้องหามกลับเมือง');S.end=1;}
 else if(t>=30){say(`⌛ ${F.n} ทนจนตี้หมดแรง ต้องถอยออกมาก่อน`);S.end=1;}
 else if(S.warn)say(`⚠️ ${F.n} กำลังรวมพลัง เทิร์นหน้าจะใช้ "${F.sk}" ใส่ทั้งตี้`);
 return ev;}
// คำสั่งอัตโนมัติ (ปุ่มออโต้ และ fight() สำหรับรันใน node): ใช้สกิลเมื่อพร้อม ฮีลเมื่อมีคนเลือดต่ำ กางม่านเมื่อบอสจะใช้ท่าไม้ตาย
function auto(S){const low=S.A.some(b=>b.me&&b.hp>0&&b.hp<b.mhp*.55);
 return S.A.map(a=>{const k=skillOf(a.cls).k;if(a.cd>0||(k==='heal'||k==='heal1')&&!low||k==='shield'&&!S.warn)return{s:'atk'};return{s:'sk'};});}
// ต่อสู้ออโต้จนจบ · คืน {win,turns,log,down:[id]}
function fight(team,F,pet,o){const S=start(team,F,pet,o);while(!S.end)turn(S,auto(S));return{win:S.win,turns:S.t,log:S.log,down:S.down};}
// สูตรเลเวล (ตรงกับ city.js): lv+1 → hp+8% atk+6% def+6%
function lvUp(m){m.lv=(m.lv|0)+1;m.hp=Math.round(m.hp*1.08);m.atk=Math.round(m.atk*1.06);m.def=Math.round(m.def*1.06);}
const trainCost=lv=>Math.round((20+lv*lv*.25)*BONUS('train'));
// เลื่อนแรงค์ไป ri ใหม่: [เหรียญ, เลเวลขั้นต่ำ]
const RKUP=[null,[150,8],[300,14],[500,20],[800,26],[1200,32],[2000,38]];
const MASTER={lv:45,gold:3000,rb:5,stage:10};
const xpNeed=lv=>lv*10;
window.HARD={fight,foe,start,turn,auto,SKILL,skillOf,BUFF,petB,buffs,RKUP,MASTER};
if(!window.META||typeof document==='undefined')return;

// ---------- ส่วน UI ----------
const M=window.META,esc=M.esc;
function H(P){const h=P.mod.hard=Object.assign({rb:0,rbAll:0,best:0,ch:0,party:[],pet:'',inj:{},xp:{},statue:0,tk:0,tr:0},P.mod.hard||{});
 ['inj','xp'].forEach(k=>{if(!h[k]||typeof h[k]!=='object')h[k]={};});if(!Array.isArray(h.party))h.party=[];return h;}
const upd=f=>{const P=M.load();H(P);const r=f(P,P.mod.hard);M.save(P);M.refresh();return r;};
const fire=(n,d)=>{try{window.dispatchEvent(new CustomEvent(n,{detail:d}));}catch(e){}};
const injLeft=(h,id)=>Math.max(0,(h.inj[id]||0)-Date.now());
const RK=()=>C().RANKS||[];
const rkOf=m=>m.master?'Master':(m.rank||((RK()[m.ri|0]||{}).k)||'F');
const mins=ms=>Math.ceil(ms/60000);
function css(){const st=document.createElement('style');st.textContent=`
.hd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,210px),1fr));gap:8px}
.hd-bf{font-size:12px;color:var(--luk,#5fd0a6);margin-top:3px}.hd-bf b{color:var(--ink,#e8f1ec);font-weight:500}
.hd-top{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-bottom:6px;font-size:13.5px}
.hd-rb{font-family:var(--fP,monospace);background:linear-gradient(90deg,#ff7a7a,#ffd36a,#7ae08a,#6ab8ff,#c99bff);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:700}
.hd-pick{cursor:pointer;user-select:none}.hd-pick.on{border-color:var(--gold,#f4bb4a);background:rgba(244,187,74,.09)}.hd-pick.off{opacity:.45;cursor:default}
.hd-st{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:5px;margin:6px 0}
.hd-st button{padding:6px 0;border-radius:6px;border:1px solid var(--line,#2c3a36);background:transparent;color:inherit;font:inherit;font-size:13px;cursor:pointer}
.hd-st button.ok{background:rgba(134,214,127,.14)}.hd-st button.sel{background:var(--gold,#f4bb4a);color:#1a1206;border-color:transparent}.hd-st button:disabled{opacity:.35;cursor:default}
.hd-log{background:rgba(0,0,0,.28);border:1px solid var(--line,#2c3a36);border-radius:8px;padding:8px 10px;max-height:240px;overflow-y:auto;font-size:13px;line-height:1.55;margin-top:8px}
.hd-log div{animation:hdIn .25s ease-out}@keyframes hdIn{from{opacity:0;transform:translateY(3px)}}
.hd-res{margin-top:6px;padding:8px 10px;border-radius:8px;font-size:13.5px}.hd-res.w{background:rgba(134,214,127,.15);color:var(--ink,#f1e7d0)}.hd-res.l{background:rgba(239,107,94,.15)}
.hd-pw{font-size:12.5px}.hd-pw.g{color:var(--good,#86d67f)}.hd-pw.m{color:var(--warn,#f2c14e)}.hd-pw.b{color:var(--bad,#ef6b5e)}
/* การ์ดบอส + ปุ่มลุยติดขอบล่างของหน้าต่าง เลือกตี้ยาวแค่ไหนก็กดสู้ได้โดยไม่ต้องเลื่อนลงไปหา */
#metaBody .hd-boss{position:sticky;bottom:-12px;padding-bottom:12px;z-index:2;margin:8px 0 0;background:var(--bg,#0e1513);background-image:linear-gradient(rgba(255,255,255,.04),rgba(255,255,255,.04));box-shadow:0 -8px 14px rgba(0,0,0,.55)}
@media (max-width:640px),(max-height:520px){#metaBody .hd-boss{bottom:calc(-14px - env(safe-area-inset-bottom,0px));padding-bottom:calc(12px + env(safe-area-inset-bottom,0px))}}
#metaBody .hd-boss #hdGo{min-height:38px;padding:6px 18px;font-size:14px}
.hd-sel{max-width:100%;padding:5px;border-radius:6px;background:var(--panel2,#1c2e36);color:inherit;border:1px solid var(--line,#2c3a36);font:inherit;font-size:13px}`;document.head.appendChild(st);}
css();
const skHTML=m=>{const k=skillOf(m.cls);return`<div class="hd-bf">${k.i} สกิลในดันเจี้ยน <b>${esc(k.n)}</b>: ${esc(k.d)}</div>`;};
const bfHTML=m=>{const b=BUFF[m.cls];return skHTML(m)+(b?`<div class="hd-bf">✦ <b>${esc(b.n)}</b>${m.master?' (Master)':''}: ${esc(b.d)}</div>`:'<div class="hd-bf" style="color:var(--dim,#8aa39a)">ไม่มีบัพประจำอาชีพ</div>');};
const head=(m,P)=>`<div><span class="rk" style="background:${M.rkCol(rkOf(m))}">${esc(rkOf(m))}</span><b>${esc(m.name)}</b>${P&&P.head===m.id?' 👑':''}</div>`;
const stat=m=>`<div class="mt-dim">${esc(M.clsN(m.cls)||'ไร้อาชีพ')} Lv.${m.lv} · HP ${m.hp} ATK ${m.atk} DEF ${m.def} LUK ${m.luk}</div>`;

// ---------- แท็บลานฝึก ----------
function canMaster(m,h,P){const ri=m.ri|0;if(m.master)return'เป็น Master แล้ว';if(ri<6)return'ต้องแรงค์ S ขึ้นไป';if(m.lv<MASTER.lv)return`ต้อง Lv.${MASTER.lv}`;
 if(h.tk>0)return'';if(h.best<MASTER.stage)return`ต้องผ่านดันเจี้ยนด่าน ${MASTER.stage} ก่อน (หรือใช้ตั๋ว)`;if(h.rb<MASTER.rb)return`ต้องมีเหรียญรุ้ง ${MASTER.rb}`;if(P.gold<MASTER.gold)return`ต้องมี 🪙 ${MASTER.gold}`;return'';}
M.tab('train',{n:'⚔️ ลานฝึก',o:15,render(el,P){const h=H(P);
 el.innerHTML=`<div class="hd-top"><span>🌈 <span class="hd-rb">${h.rb}</span> เหรียญรุ้ง</span>${h.tk?`<span>🎫 ตั๋ว Master ${h.tk} ใบ</span>`:''}</div>
 <p class="mt-dim">ใช้เหรียญเมืองฝึกคนในตระกูลให้เก่งขึ้น ทุกเลเวล HP +8% ATK/DEF +6% เลื่อนแรงค์ได้ถึง S ส่วน SS ต้องไปพิชิตชั้นลับเอง ทุกอาชีพมีบัพของตัวเองตอนลงดันเจี้ยน</p>
 <div class="hd-grid">${P.roster.map(m=>{const ri=m.ri|0,up=ri<6&&!m.master?RKUP[ri+1]:null,tc=trainCost(m.lv),il=injLeft(h,m.id),mm=canMaster(m,h,P),nx=(RK()[ri+1]||{}).k;
  return`<div class="mt-card${P.head===m.id?' head':''}">${head(m,P)}${stat(m)}${bfHTML(m)}
  <div class="mt-dim">EXP ${h.xp[m.id]|0}/${xpNeed(m.lv)}${il?` · 🤕 พักฟื้นอีก ${mins(il)} นาที`:''}</div>
  <button class="mt-btn pri" data-tr="${m.id}" ${P.gold<tc?'disabled':''}>ฝึก +1 Lv (🪙 ${tc})</button>
  ${up?`<button class="mt-btn" data-rk="${m.id}" ${P.gold<up[0]||m.lv<up[1]?'disabled':''} title="ต้อง Lv.${up[1]}">เลื่อนเป็น ${nx} (🪙 ${up[0]}${m.lv<up[1]?` · Lv.${up[1]}`:''})</button>`:''}
  ${!m.master&&ri>=6?`<button class="mt-btn" data-ms="${m.id}" ${mm?'disabled':''} title="${esc(mm)}">👑 เลื่อนเป็น Master${mm?` (${esc(mm)})`:h.tk?' (ใช้ตั๋ว)':` (🪙 ${MASTER.gold} · 🌈 ${MASTER.rb})`}</button>`:''}</div>`;}).join('')||'<span class="mt-dim">ยังไม่มีสมาชิกในตระกูล</span>'}</div>
 <p class="mt-dim">Master: ต้องแรงค์ S หรือ SS, Lv.${MASTER.lv} และผ่านดันเจี้ยนด่าน ${MASTER.stage} ได้สเตตัส +15% และบัพอาชีพแรงขึ้นครึ่งเท่า</p>`;
 const mem=(Q,id)=>Q.roster.find(x=>x.id===id);
 el.querySelectorAll('[data-tr]').forEach(b=>b.onclick=()=>{const id=b.dataset.tr;upd((Q,h)=>{const m=mem(Q,id),c=m&&trainCost(m.lv);if(!m||Q.gold<c)return;Q.gold-=c;lvUp(m);h.tr++;M.grantAch('hd_train');});fire('tof:train',{id});});
 el.querySelectorAll('[data-rk]').forEach(b=>b.onclick=()=>{const id=b.dataset.rk;upd(Q=>{const m=mem(Q,id);if(!m||m.master)return;const ri=m.ri|0,u=RKUP[ri+1],R0=RK()[ri],R1=RK()[ri+1];if(!u||!R1||Q.gold<u[0]||m.lv<u[1])return;
  Q.gold-=u[0];const f=R1.m/(R0?R0.m:1);m.hp=Math.round(m.hp*f);m.atk=Math.round(m.atk*f);m.def=Math.round(m.def*f);m.ri=ri+1;m.rank=R1.k;if(R1.k==='S')M.grantAch('hd_rankS');});fire('tof:train',{id});});
 el.querySelectorAll('[data-ms]').forEach(b=>b.onclick=()=>{const id=b.dataset.ms;upd((Q,h)=>{const m=mem(Q,id);if(!m||canMaster(m,h,Q))return;if(h.tk>0)h.tk--;else{Q.gold-=MASTER.gold;h.rb-=MASTER.rb;}
  m.master=true;m.hp=Math.round(m.hp*1.15);m.atk=Math.round(m.atk*1.15);m.def=Math.round(m.def*1.15);M.grantAch('hd_master');});fire('tof:train',{id});});}});

// ---------- แท็บดันเจี้ยนโหมดยาก ----------
const LOCK=P=>!P.unlock.hard?'ผ่านชั้น 100 ก่อน':!P.head||!P.roster.some(m=>m.id===P.head)?'ตั้งหัวหน้าตระกูลก่อน (แท็บสมาชิกตระกูล)':'';
let sel=0,last=null;
// city.js: สมาชิกที่ไปทำงานในเมืองลงดันเจี้ยนไม่ได้ · สัตว์อารมณ์ดีแรงขึ้น อารมณ์เสียอ่อนลง
const busy=id=>{try{return!!(window.CITY&&window.CITY.busy&&window.CITY.busy(id));}catch(e){return false;}};
const petMul=p=>{try{return p&&window.CITY&&window.CITY.petMul?(+window.CITY.petMul(p.id)||1):1;}catch(e){return 1;}};
function team(P,h){const ids=[P.head,...h.party.filter(id=>id!==P.head&&!busy(id))].slice(0,4);return ids.map(id=>P.roster.find(m=>m.id===id)).filter(Boolean);}
const power=T=>T.reduce((s,m)=>s+Math.sqrt(m.hp*m.atk*(1+m.def/100)),0);
const foePow=F=>Math.sqrt(F.hp*1.24*F.atk*(1+F.def/100))*1.35;
function play(stage){if(AR&&AR.dlg.open)return;const P=M.load(),h=H(P),T=team(P,h);if(!T.length||T.some(m=>injLeft(h,m.id)))return;
 // ปิดหน้าหนีกลางทาง = ทั้งตี้บาดเจ็บ 10 นาที (settle ล้างออกตอนจบ)
 T.forEach(m=>{h.inj[m.id]=Date.now()+10*60000;});M.save(P);arena(stage,T,P.pets.find(p=>p.id===h.pet));}
// ให้รางวัล/บาดเจ็บหลังจบการต่อสู้ · r = S จาก start/turn
function settle(stage,T0,pet,r,autoUsed){const P=M.load(),h=H(P),T=T0.map(m=>P.roster.find(x=>x.id===m.id)).filter(Boolean),B=buffs(T),PB=petPow(pet,B,petMul(pet));
 T.forEach(m=>{delete h.inj[m.id];});
 const ch=stage>20,first=r.win&&(ch?stage-20>h.ch:stage>h.best),res={win:r.win,stage,first,g:0,rb:0,lv:[]};
 if(r.win){const base=ch?300+(stage-20)*60:100+stage*50,mul=(first?1:.6)*(1+(B.rog?.15*B.rog:0)+(PB.gold||0))*BONUS('gold');
  res.g=Math.round(base*mul);P.gold+=res.g;P.goldAll+=res.g;
  if(first){if(ch){h.ch=stage-20;res.rb=(h.ch%5===0)?3:1;}else{h.best=stage;res.rb=1+(stage%5===0?2:0);}}
  if(Math.random()<.05+(B.rog?.1*B.rog:0)){res.rb++;res.drop=1;}h.rb+=res.rb;h.rbAll+=res.rb;
  const xp=30+stage*12;T.forEach(m=>{h.xp[m.id]=(h.xp[m.id]|0)+xp;let n=0;while(h.xp[m.id]>=xpNeed(m.lv)){h.xp[m.id]-=xpNeed(m.lv);lvUp(m);n++;}if(n)res.lv.push(m.name+' +'+n);});res.xp=xp;
  if(stage>=1)M.grantAch('hd_s1');if(stage>=10)M.grantAch('hd_s10');if(stage>=20)M.grantAch('hd_s20');if(ch&&h.ch>=10)M.grantAch('hd_ch10');
  if(new Set(T.map(m=>m.cls).filter(Boolean)).size>=4)M.grantAch('hd_4cls');
  if(!autoUsed)M.grantAch('hd_cmd');if(!r.down.length)M.grantAch('hd_flaw');}
 else{r.down.forEach(id=>{if(T.some(m=>m.id===id))h.inj[id]=Date.now()+10*60000;});res.inj=r.down.filter(id=>T.some(m=>m.id===id)).length;}
 M.save(P);if(r.win)fire('tof:hard-clear',{stage,first,pets:pet?[pet.id]:[]}); // city.js: เฉพาะตัวที่พาไปถึงจะเหนื่อย
 return res;}
function resHTML(r){if(r.win)return`<div class="hd-res w">🏆 ชนะ! ได้ 🪙 ${r.g}${r.rb?` · 🌈 ${r.rb}${r.drop?' (มือไวเก็บได้เพิ่ม)':''}`:''} · EXP +${r.xp} ทุกคน${r.lv.length?` · เลเวลอัป: ${esc(r.lv.join(', '))}`:''}${r.first?'<br>ผ่านครั้งแรก รับเหรียญรุ้งเต็มๆ':''}</div>`;
 return`<div class="hd-res l">แพ้ ${r.inj?`มี ${r.inj} คนบาดเจ็บต้องพัก 10 นาที (หรือจ่ายค่าหมอ)`:''} ลองฝึกที่ลานฝึก เปลี่ยนตี้ หรือเปลี่ยนจังหวะใช้สกิลแล้วมาใหม่</div>`;}

// ---------- สนามรบ: เดินไต่หอขึ้นไปถึงด่าน แล้วรุมบอสแบบมองจากด้านบน สั่งสกิลทีละคน ----------
let AR=null;
const BOSSK=['gking','cqueen','treant','devour','vgod'],MINK=['slime','goblin','bat','wolf','shroom','golem','wraith','sala','orc','star'];
const biome=s=>Math.min(4,Math.floor((Math.min(20,s)-1)/4));
// ตำแหน่งบนสนาม (พิกัด 192×128): ศัตรู 0 บอส 1 ซ้าย 2 ขวา · ตี้เรียงโค้งด้านล่าง · ผีดิบของเนโครยืนข้างตี้
const EPOS=[[96,30],[44,40],[148,40]];
const apos=(i,n)=>i>=n?[20,96]:[96+(i-(n-1)/2)*34,98-Math.abs(i-(n-1)/2)*5];
function arCss(){const st=document.createElement('style');st.textContent=`
#hdAr{box-sizing:border-box;width:min(600px,calc(100vw - 12px));max-width:none;max-height:96vh;max-height:96dvh;padding:0;border:2px solid var(--line,#2c3a36);background:var(--bg,#0e1513);color:var(--ink,#e8f1ec);border-radius:10px;overflow-y:auto}
#hdAr::backdrop{background:rgba(0,0,0,.75)}
#hdAr .ar-hd{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 12px}#hdAr .ar-hd b{flex:1;min-width:0;font-size:15px}
#hdAr .ar-x{width:40px;height:40px;background:none;border:0;color:inherit;font-size:18px;cursor:pointer}
#hdAr canvas{display:block;width:100%;aspect-ratio:3/2;image-rendering:pixelated;background:#000;cursor:pointer}
#hdAr .ar-cmd{padding:8px 10px;font-size:13.5px}
#hdAr .ar-bt{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0}
#hdAr .ar-bt button,#hdAr .ar-tg button{padding:7px 6px;border-radius:7px;border:1px solid var(--line,#2c3a36);background:rgba(255,255,255,.04);color:inherit;font:inherit;font-size:13.5px;cursor:pointer;text-align:center}
#hdAr .ar-bt button small{display:block;font-size:11px;opacity:.75;margin-top:2px}
#hdAr .ar-bt button:disabled{opacity:.4;cursor:default}
#hdAr .ar-tg{display:flex;flex-wrap:wrap;gap:5px;align-items:center}#hdAr .ar-tg button[aria-pressed=true]{background:var(--gold,#f4bb4a);color:#1a1206;border-color:transparent}
#hdAr .ar-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#hdAr .hd-log{margin:0 10px 10px;max-height:150px}
#hdAr .ar-warn{color:var(--warn,#f2c14e)}`;document.head.appendChild(st);}
function arena(stage,T,pet){const A=window.ART;
 if(!AR){arCss();const d=document.createElement('dialog');d.id='hdAr';d.setAttribute('aria-label','ดันเจี้ยนโหมดยาก');
  d.innerHTML='<div class="ar-hd"><b id="arT"></b><button type="button" class="ar-x" id="arX" aria-label="ถอยออกจากดันเจี้ยน">✕</button></div><canvas id="arC" width="384" height="256" aria-label="สนามรบมุมมองจากด้านบน แตะศัตรูเพื่อเลือกเป้าหมาย"></canvas><div class="ar-cmd" id="arCmd"></div><div class="hd-log" id="arLog" aria-live="polite"></div>';
  document.body.appendChild(d);AR={dlg:d};const x=d.querySelector('#arC').getContext('2d');x.setTransform(2,0,0,2,0,0);x.imageSmoothingEnabled=false;AR.cx=x;
  d.querySelector('#arX').onclick=()=>arQuit();d.addEventListener('cancel',e=>{e.preventDefault();arQuit();});d.addEventListener('close',()=>M.refresh());
  d.querySelector('#arC').onclick=e=>{if(!AR.S||AR.ph!=='fight')return;const r=e.target.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*192,py=(e.clientY-r.top)/r.height*128;
   let b=-1,bd=30*30;AR.S.E.forEach((en,j)=>{if(en.hp<=0)return;const[ex,ey]=EPOS[j],dd=(ex-px)**2+(ey-py)**2;if(dd<bd){bd=dd;b=j;}});if(b>=0){AR.tg=b;cmd();}};}
 const F=foe(stage),S=start(T,F,pet,{hpM:BONUS('hp'),petM:petMul(pet)});
 Object.assign(AR,{S,stage,T,pet,F,ph:'climb',t0:performance.now(),cur:0,ord:[],tg:0,fx:[],nums:[],flash:{},q:[],autoUsed:0,auto:0,res:null,
  sp:T.map(m=>{try{return m.kind==='merc'?A.compSpr({n:m.name,cls:m.cls,tr:m.tr}):A.heroSpr(m.cls||'npc',A.heroLook(m));}catch(e){return A.heroSpr('npc');}}),
  bs:F.drg?A.BSPR.dragon:A.BSPR[BOSSK[(stage-1)%BOSSK.length]],ms:A.MSPR[MINK[(stage-1)%MINK.length]]||A.MSPR.slime,
  pt:pet&&A.PSPR[pet.k]||null});
 AR.dlg.querySelector('#arT').textContent=`${stage>20?'🗼 ท้าทาย '+(stage-20):'🔥 ด่าน '+stage}: ${F.n}`;
 AR.dlg.querySelector('#arLog').innerHTML='';logAdd();
 AR.dlg.querySelector('#arCmd').innerHTML=`<p class="mt-dim">${esc(F.x)}</p><button type="button" class="mt-btn" id="arSkip">ข้ามไปห้องบอส</button>`;
 AR.dlg.querySelector('#arSkip').onclick=()=>{AR.t0=-1e9;};
 if(!AR.dlg.open)AR.dlg.showModal();cancelAnimationFrame(AR.raf);AR.raf=requestAnimationFrame(draw);}
function logAdd(){const el=AR.dlg.querySelector('#arLog'),n=el.childElementCount;AR.S.log.slice(n).forEach(s=>{const d=document.createElement('div');d.textContent=s;el.appendChild(d);});el.scrollTop=el.scrollHeight;}
function arQuit(){if(AR.ph==='climb'){upd((Q,h)=>{AR.T.forEach(m=>{delete h.inj[m.id];});});AR.dlg.close();return;}
 if(AR.ph!=='end'){if(!confirm('ถอยออกจากดันเจี้ยน? นับว่าแพ้ คนที่ล้มไปแล้วต้องพักฟื้น'))return;AR.S.log.push('🏃 ตี้ถอยออกมาก่อน');AR.S.end=1;finish();}
 AR.dlg.close();}
function finish(){AR.ph='end';AR.res=settle(AR.stage,AR.T,AR.pet,AR.S,AR.autoUsed);last=AR.res;logAdd();
 const el=AR.dlg.querySelector('#arCmd');el.innerHTML=resHTML(AR.res)+'<div class="ar-row"><button type="button" class="mt-btn pri" id="arBack">กลับเมือง</button></div>';
 el.querySelector('#arBack').onclick=()=>AR.dlg.close();el.querySelector('#arBack').focus();M.refresh();}
// แผงสั่งการ: ทีละคนในตี้ที่ยังยืนอยู่
function cmd(){const S=AR.S,el=AR.dlg.querySelector('#arCmd');if(AR.ph!=='fight'||AR.q.length)return;
 while(AR.cur<AR.T.length&&S.A[AR.cur].hp<=0)AR.cur++;
 if(AR.cur>=AR.T.length||AR.auto){go();return;}
 if(!S.E[AR.tg]||S.E[AR.tg].hp<=0)AR.tg=S.E.findIndex(e=>e.hp>0);
 const a=S.A[AR.cur],sk=skillOf(a.cls),en=S.E.map((e,j)=>e.hp>0?`<button type="button" data-tg="${j}" aria-pressed="${AR.tg===j}">${e.boss?'👹':'👺'} ${esc(e.n)} ${Math.max(1,Math.round(e.hp/e.mhp*100))}%</button>`:'').join('');
 el.innerHTML=`${S.warn?`<div class="ar-warn">⚠️ เทิร์นหน้าบอสจะใช้ "${esc(AR.F.sk)}" ใส่ทั้งตี้ ตั้งรับหรือกางม่านไว้</div>`:''}
 <div>ตาของ <b>${esc(a.n)}</b> (${esc(M.clsN(a.cls)||'ไร้อาชีพ')}) · HP ${Math.round(a.hp).toLocaleString()}/${Math.round(a.mhp).toLocaleString()} · เทิร์น ${S.t+1}</div>
 <div class="ar-bt"><button type="button" data-s="atk">⚔️ โจมตี<small>ตีเป้าหมายที่เลือก</small></button>
 <button type="button" data-s="sk" ${a.cd>0?'disabled':''}>${sk.i} ${esc(sk.n)}<small>${a.cd>0?`รออีก ${a.cd} เทิร์น`:esc(sk.d)}</small></button>
 <button type="button" data-s="grd">🛡 ตั้งรับ<small>รับดาเมจ −60% และล่อบอสมาตีตัวเอง</small></button></div>
 <div class="ar-tg"><span class="mt-dim">เป้าหมาย:</span>${en}</div>
 <div class="ar-row">${AR.cur>0?'<button type="button" class="mt-btn" id="arBk">↩ สั่งคนก่อนหน้าใหม่</button>':''}<button type="button" class="mt-btn" id="arAu">🤖 ออโต้เทิร์นนี้</button><button type="button" class="mt-btn" id="arAA">⏩ ออโต้จนจบ</button></div>`;
 el.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{AR.ord[AR.cur]={s:b.dataset.s,tg:AR.tg};AR.cur++;cmd();});
 el.querySelectorAll('[data-tg]').forEach(b=>b.onclick=()=>{AR.tg=+b.dataset.tg;cmd();});
 const bk=el.querySelector('#arBk');if(bk)bk.onclick=()=>{do AR.cur--;while(AR.cur>0&&S.A[AR.cur].hp<=0);cmd();};
 el.querySelector('#arAu').onclick=()=>{AR.autoUsed=1;const o=auto(S);for(let i=AR.cur;i<AR.T.length;i++)AR.ord[i]=o[i];AR.cur=AR.T.length;cmd();};
 el.querySelector('#arAA').onclick=()=>{AR.autoUsed=1;AR.auto=1;cmd();};
 const f=el.querySelector('[data-s]');if(f&&!AR.dlg.contains(document.activeElement))f.focus();}
// รันหนึ่งเทิร์น แล้วเล่น event ทีละอันบนสนาม
function go(){const S=AR.S,o=AR.auto?auto(S):AR.ord;AR.ord=[];AR.cur=0;const ev=turn(S,o);logAdd();
 AR.dlg.querySelector('#arCmd').innerHTML='<div class="mt-dim">⚔️ กำลังสู้...</div>';
 const t=performance.now(),gap=AR.auto?110:170;ev.forEach((e,i)=>AR.q.push({at:t+i*gap,e}));AR.q.push({at:t+ev.length*gap+250,e:{k:'done'}});}
const posOf=id=>{if(!id||id==='pet')return[96,84];const S=AR.S,i=+id.slice(1);return id[0]==='e'?EPOS[i]:apos(i,AR.T.length);};
function play1(e,t){if(e.k==='done'){if(AR.S.end)finish();else cmd();return;}
 const col=e.k==='heal'?'#7ae08a':e.to&&e.to[0]==='a'?'#ff7a6a':e.c?'#ffd84a':'#ffffff';
 if(e.k==='hit'||e.k==='heal'){const[x,y]=posOf(e.to);AR.nums.push({x,y:y-14,s:(e.k==='heal'?'+':'')+Math.round(e.d).toLocaleString()+(e.c?'!':''),c:col,t0:t});AR.flash[e.to]=t;
  if(e.k==='hit'&&e.from)AR.fx.push({a:posOf(e.from),b:[x,y],t0:t,c:e.sk?'#c99bff':e.from[0]==='e'?'#ff5a4a':'#fff3a0'});}
 else if(e.k==='sk'||e.k==='grd'){const[x,y]=posOf(e.to);AR.nums.push({x,y:y-20,s:e.k==='grd'?'🛡':e.i,c:'#fff',t0:t});}
 else if(e.k==='ult'){AR.shake=t+400;}
 else if(e.k==='shd')AR.shd=t;}
function draw(t){if(!AR||!AR.dlg.open)return;AR.raf=requestAnimationFrame(draw);const x=AR.cx,A=window.ART,S=AR.S,st=AR.stage;
 while(AR.q.length&&AR.q[0].at<=t)play1(AR.q.shift().e,t);
 x.save();if(AR.shake>t)x.translate(Math.round(Math.random()*4-2),Math.round(Math.random()*4-2));
 if(AR.ph==='climb'){
  // ไต่หอแบบโหมดปกติ: ฉากตามโซน ตี้เดินขึ้นทีละชั้นจนถึงชั้นของด่านนี้ ข้างขวาเป็นแผนที่หอ 20 ชั้น
  const N=Math.min(20,st),dur=Math.min(3600,500+N*150),p=Math.min(1,(t-AR.t0)/dur),fl=Math.max(1,Math.ceil(p*N)),b=biome(fl),bob=Math.round(Math.sin(t/120));
  A.bgDraw(x,b);try{A.drawOverlay(x,b,t);}catch(e){}
  const n=AR.sp.length;AR.sp.forEach((s,i)=>A.blit(x,s,70-i*16,84+((i+fl)%2?bob:-bob),{key:'hd'}));if(AR.pt)A.blit(x,AR.pt,86,92,{key:'hdp'});
  x.fillStyle='rgba(0,0,0,.55)';x.fillRect(176,6,12,104);for(let i=0;i<20;i++){x.fillStyle=i+1===fl?'#ffd84a':i<fl?'#86d67f':i+1===N?'#ef6b5e':'#3a4844';x.fillRect(178,104-i*5,8,4);}
  x.font='8px '+(getComputedStyle(document.documentElement).getPropertyValue('--fP').trim()||'monospace');x.fillStyle='#fff';x.textAlign='left';
  x.fillText(st>20&&p>=1?'หอท้าทาย '+(st-20):'ชั้น '+fl+'/20',6,12);x.fillStyle='#000';x.fillRect(6,16,60,3);x.fillStyle='#ffd84a';x.fillRect(6,16,Math.round(60*p),3);
  if(p>=1){x.fillStyle='rgba(0,0,0,.5)';x.fillRect(0,50,192,20);x.fillStyle='#ffd84a';x.textAlign='center';x.fillText('ประตูห้องบอสเปิดออก…',96,63);}
  if(t-AR.t0>dur+900){AR.ph='fight';cmd();}
  x.restore();return;}
 // มุมมองจากด้านบน: พื้นห้องบอสเป็นตาราง ศัตรูอยู่บน ตี้อยู่ล่าง
 const B=A.BG[biome(st)]||A.BG[0];for(let gy=0;gy<16;gy++)for(let gx=0;gx<24;gx++){x.fillStyle=(gx+gy)%2?B.fl:B.f2;x.fillRect(gx*8,gy*8,8,8);}
 x.fillStyle=B.m;x.fillRect(0,0,192,8);x.fillStyle=B.w1;x.fillRect(0,0,192,6);x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,8,192,3);
 const shadow=(cx0,cy0,w)=>{x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(cx0,cy0,w,w*.4,0,0,7);x.fill();};
 const bar=(cx0,y0,w,v,c)=>{x.fillStyle='#000';x.fillRect(cx0-w/2-.5,y0-.5,w+1,3);x.fillStyle=c;x.fillRect(cx0-w/2,y0,Math.max(0,w*v),2);};
 const fl=k=>AR.flash[k]&&t-AR.flash[k]<140;
 const sel=AR.ph==='fight'&&!AR.q.length&&AR.cur<AR.T.length;
 S.E.forEach((e,j)=>{const[ex,ey]=EPOS[j],big=e.boss,sz=big?32:16,s=big?AR.bs:AR.ms;if(e.hp<=0)x.globalAlpha=.25;
  shadow(ex,ey+sz/2-2,big?14:7);const c=A.sprCanvas(s,j===2,fl('e'+j),'hde');x.drawImage(c,Math.round(ex-sz/2),Math.round(ey-sz/2),sz,sz);x.globalAlpha=1;
  if(e.hp>0){bar(ex,ey-sz/2-5,big?36:16,e.hp/e.mhp,big?'#ef6b5e':'#f2c14e');if(sel&&AR.tg===j&&(t/300|0)%2){x.strokeStyle='#ffd84a';x.lineWidth=1;x.beginPath();x.ellipse(ex,ey+sz/2-2,big?18:10,big?7:4,0,0,7);x.stroke();}}});
 if(S.warn&&S.E[0].hp>0){x.fillStyle=`rgba(239,107,94,${.25+.2*Math.sin(t/120)})`;x.beginPath();x.arc(EPOS[0][0],EPOS[0][1],22,0,7);x.fill();}
 const n=AR.T.length;S.A.forEach((a,i)=>{const[ax,ay]=apos(i,n),s=i<n?AR.sp[i]:A.MSPR.wraith||AR.ms;if(a.hp<=0)x.globalAlpha=.3;shadow(ax,ay+7,6);
  if(i===AR.cur&&sel){x.strokeStyle='#ffd84a';x.beginPath();x.ellipse(ax,ay+7,10,4,0,0,7);x.stroke();x.fillStyle='#ffd84a';x.fillRect(ax-1,ay-20+Math.round(Math.sin(t/150)),3,3);}
  A.blit(x,s,ax-s.w/2,ay-8,{key:'hda',flash:fl('a'+i),noShadow:true});x.globalAlpha=1;
  if(a.hp>0){bar(ax,ay-12,16,a.hp/a.mhp,'#86d67f');if(a.cd>0&&i<n){x.fillStyle='#8aa39a';x.fillRect(ax-8,ay-9,16*Math.min(1,a.cd/(skillOf(a.cls).cd+1)),1);}if(a.grd){x.strokeStyle='#6ab8ff';x.strokeRect(ax-8.5,ay-8.5,17,17);}}});
 if(AR.pt){A.blit(x,AR.pt,90,108,{key:'hdp'});}
 if(AR.shd&&t-AR.shd<700||S.shd){x.fillStyle='rgba(255,243,160,.12)';x.fillRect(0,80,192,48);}
 AR.fx=AR.fx.filter(f=>t-f.t0<220);AR.fx.forEach(f=>{const q=(t-f.t0)/220,px=f.a[0]+(f.b[0]-f.a[0])*q,py=f.a[1]+(f.b[1]-f.a[1])*q;x.fillStyle=f.c;x.fillRect(px-1.5,py-1.5,3,3);x.globalAlpha=.5;x.fillRect(px-(f.b[0]-f.a[0])*.08-1,py-(f.b[1]-f.a[1])*.08-1,2,2);x.globalAlpha=1;});
 x.font='8px '+(getComputedStyle(document.documentElement).getPropertyValue('--fP').trim()||'monospace');x.textAlign='center';
 AR.nums=AR.nums.filter(m=>t-m.t0<800);AR.nums.forEach(m=>{const q=(t-m.t0)/800;x.globalAlpha=1-q*q;x.fillStyle='#000';x.fillText(m.s,m.x+.5,m.y-q*10+.5);x.fillStyle=m.c;x.fillText(m.s,m.x,m.y-q*10);x.globalAlpha=1;});
 x.textAlign='left';x.fillStyle='#fff';x.fillText('เทิร์น '+S.t,4,18);
 x.restore();}
M.tab('hard',{n:'🔥 ดันเจี้ยนโหมดยาก',o:40,lock:LOCK,render(el,P){const h=H(P),T=team(P,h),hd=P.roster.find(m=>m.id===P.head);
 const cnt={};T.forEach(m=>{if(m.cls)cnt[m.cls]=(cnt[m.cls]||0)+1;});
 const nx=Math.min(20,h.best+1);if(!sel||sel>Math.max(nx,h.best>=20?20+h.ch+1:0))sel=h.best>=20?20+h.ch+1:nx;
 const F=foe(sel),pt0=P.pets.find(p=>p.id===h.pet),pw=power(T)*(1+(petPow(pt0,buffs(T),petMul(pt0)).atk||0)),fp=foePow(F),rt=pw/fp;
 const hurt=T.filter(m=>injLeft(h,m.id)),going=!!(AR&&AR.dlg.open);
 el.innerHTML=`<div class="hd-top"><span>🌈 <span class="hd-rb">${h.rb}</span></span><span>ผ่านแล้ว ${h.best}/20 ด่าน</span>${h.best>=20?`<span>🗼 หอท้าทายสูงสุด ระดับ ${h.ch}</span>`:''}</div>
 <h3>ตี้ของคุณ (${T.length}/4)</h3><p class="mt-dim">หัวหน้าตระกูลต้องไปทุกครั้ง เลือกคนอื่นได้อีก 3 คน อาชีพเดียวกันได้ไม่เกิน 2 คน ในห้องบอสคุณสั่งเองทีละคนว่าจะตี ใช้สกิล หรือตั้งรับ</p>
 <div class="hd-grid">${P.roster.map(m=>{const on=T.includes(m),il=injLeft(h,m.id),bz=m.id!==P.head&&busy(m.id),full=bz||!on&&(T.length>=4||(m.cls&&cnt[m.cls]>=2)),hd0=m.id===P.head;
  return`<div class="mt-card hd-pick${on?' on':''}${(full||il||bz)&&!on?' off':''}" data-pk="${m.id}" role="button" tabindex="0" aria-pressed="${on}">${head(m,P)}${stat(m)}${bfHTML(m)}${bz?'<div class="mt-dim">🏘 ทำงานในเมืองอยู่</div>':''}
  ${il?`<div class="mt-dim">🤕 พักฟื้นอีก ${mins(il)} นาที <button class="mt-btn" data-heal="${m.id}" ${P.gold<100?'disabled':''}>ค่าหมอ 🪙 100</button></div>`:''}</div>`;}).join('')}</div>
 <h3>สัตว์เลี้ยงคู่ตี้</h3><select class="hd-sel" id="hdPet"><option value="">ไม่พาไป</option>${P.pets.map(p=>{const d=(C().PETS||{})[p.k]||{n:p.k},b=petB(p);return`<option value="${p.id}" ${h.pet===p.id?'selected':''}>${p.legend?'✨ ':''}${esc(d.n)}: ${esc(b.d)}</option>`;}).join('')}</select>
 <h3>เลือกด่าน</h3><div class="hd-st">${STAGES.map((s,i)=>`<button type="button" data-sg="${i+1}" class="${i+1<=h.best?'ok':''} ${sel===i+1?'sel':''}" ${i+1>nx?'disabled':''}>${i+1<=h.best?'✓':''}${i+1}</button>`).join('')}
 ${h.best>=20?`<button type="button" data-sg="${21+h.ch}" class="${sel>20?'sel':''}" style="grid-column:span 2">🗼 ท้าทาย ${h.ch+1}</button>`:''}</div>
 <div class="mt-card hd-boss"><b>${sel>20?'🗼':'🔥'} ด่าน ${sel>20?'ท้าทาย '+(sel-20):sel}: ${esc(F.n)}</b><div class="mt-dim">${esc(F.x)}</div><div class="mt-dim">HP ${F.hp.toLocaleString()} ATK ${F.atk} DEF ${F.def} · ท่าไม้ตาย "${esc(F.sk)}" · ลูกสมุน ${esc(F.mn)} ×2</div>
 <div class="hd-pw ${rt>=1.15?'g':rt>=.85?'m':'b'}">พลังตี้เทียบบอส: ${rt>=1.15?'ได้เปรียบ':rt>=.85?'สูสี':'ยังอ่อนกว่ามาก ฝึกก่อนดีกว่า'} (${Math.round(rt*100)}%)</div>
 <button class="mt-btn pri" id="hdGo" ${going||hurt.length||!hd?'disabled':''}>${going?'กำลังสู้...':hurt.length?'มีคนในตี้ยังเจ็บอยู่':'⚔️ ลุย!'}</button></div>
 ${last&&!going?resHTML(last):''}`;
 el.querySelectorAll('[data-pk]').forEach(c=>{const go=()=>{const id=c.dataset.pk;if(id===P.head)return;upd((Q,hh)=>{const i=hh.party.indexOf(id);if(i>=0){hh.party.splice(i,1);return;}
  const TT=team(Q,hh),m=Q.roster.find(x=>x.id===id);if(!m||TT.length>=4||injLeft(hh,id)||busy(id))return;if(m.cls&&TT.filter(x=>x.cls===m.cls).length>=2)return;hh.party=hh.party.filter(x=>x!==Q.head&&Q.roster.some(r=>r.id===x));hh.party.push(id);});};
  c.onclick=ev=>{if(ev.target.closest('[data-heal]'))return;go();};c.onkeydown=ev=>{if(ev.target!==c)return;if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();go();}};});
 el.querySelectorAll('[data-heal]').forEach(b=>b.onclick=()=>upd((Q,hh)=>{if(Q.gold<100)return;Q.gold-=100;delete hh.inj[b.dataset.heal];}));
 const ps=el.querySelector('#hdPet');if(ps)ps.onchange=()=>upd((Q,hh)=>{hh.pet=ps.value;});
 el.querySelectorAll('[data-sg]').forEach(b=>b.onclick=()=>{sel=+b.dataset.sg;M.refresh();});
 const g=el.querySelector('#hdGo');if(g)g.onclick=()=>play(sel);
}});

// ---------- ร้านเหรียญรุ้ง ----------
const ITEMS=[{k:'hp',n:'ผลท้อสวรรค์',d:'HP ถาวร +5%',c:3},{k:'atk',n:'หินลับคมนาคราช',d:'ATK ถาวร +5%',c:3},{k:'def',n:'เกล็ดเต่าพันปี',d:'DEF ถาวร +5%',c:3},{k:'luk',n:'เหรียญเสี่ยงทาย',d:'LUK ถาวร +5',c:2}];
M.tab('rbshop',{n:'🌈 ร้านเหรียญรุ้ง',o:45,lock:LOCK,render(el,P){const h=H(P);let who=el.dataset.who;if(!P.roster.some(m=>m.id===who))who=P.head;
 el.innerHTML=`<div class="hd-top"><span>🌈 <span class="hd-rb">${h.rb}</span> เหรียญรุ้ง</span><span class="mt-dim">ได้จากผ่านดันเจี้ยนครั้งแรก หอท้าทาย และโจรมือไว</span></div>
 <h3>รูปปั้นหน้าตระกูล</h3><div class="hd-grid">
 <div class="mt-card"><b>🥇 รูปปั้นทอง</b><div class="mt-dim">เปลี่ยนรูปปั้นหัวหน้าตระกูลในเมืองให้เป็นทองอร่าม</div><button class="mt-btn pri" data-sta="1" ${h.statue>=1||h.rb<12?'disabled':''}>${h.statue>=1?'มีแล้ว':'แลก 🌈 12'}</button></div>
 <div class="mt-card"><b>🌈 รูปปั้นรุ้ง</b><div class="mt-dim">รูปปั้นเรืองแสงเจ็ดสี ใครผ่านมาก็ต้องหันมอง (ต้องมีรูปปั้นทองก่อน)</div><button class="mt-btn pri" data-sta="2" ${h.statue!==1||h.rb<30?'disabled':''}>${h.statue>=2?'มีแล้ว':'แลก 🌈 30'}</button></div>
 <div class="mt-card"><b>🎫 ตั๋วเลื่อน Master</b><div class="mt-dim">ข้ามเงื่อนไขด่าน ${MASTER.stage} และไม่ต้องจ่ายเหรียญตอนเลื่อน (ยังต้องแรงค์ S และ Lv.${MASTER.lv})</div><button class="mt-btn pri" data-tk="1" ${h.rb<10?'disabled':''}>แลก 🌈 10 (มี ${h.tk})</button></div></div>
 <h3>ของเพิ่มสเตตัสถาวร</h3><label class="mt-dim">ให้ใคร: <select class="hd-sel" id="hdWho">${P.roster.map(m=>`<option value="${m.id}" ${m.id===who?'selected':''}>${esc(m.name)} (${esc(M.clsN(m.cls)||'-')} Lv.${m.lv})</option>`).join('')}</select></label>
 <div class="hd-grid" style="margin-top:6px">${ITEMS.map(it=>`<div class="mt-card"><b>${esc(it.n)}</b><div class="mt-dim">${esc(it.d)}</div><button class="mt-btn" data-it="${it.k}" ${h.rb<it.c||!who?'disabled':''}>แลก 🌈 ${it.c}</button></div>`).join('')}</div>`;
 const ws=el.querySelector('#hdWho');if(ws)ws.onchange=()=>{el.dataset.who=ws.value;};el.dataset.who=who||'';
 el.querySelectorAll('[data-sta]').forEach(b=>b.onclick=()=>upd((Q,hh)=>{const v=+b.dataset.sta,c=v===1?12:30;if(hh.rb<c||hh.statue!==v-1)return;hh.rb-=c;hh.statue=v;M.grantAch(v===1?'hd_gold':'hd_rainbow');}));
 el.querySelector('[data-tk]').onclick=()=>upd((Q,hh)=>{if(hh.rb<10)return;hh.rb-=10;hh.tk++;});
 el.querySelectorAll('[data-it]').forEach(b=>b.onclick=()=>{const id=el.dataset.who;upd((Q,hh)=>{const it=ITEMS.find(x=>x.k===b.dataset.it),m=Q.roster.find(x=>x.id===id);if(!it||!m||hh.rb<it.c)return;hh.rb-=it.c;
  if(it.k==='luk')m.luk=(m.luk|0)+5;else m[it.k]=Math.round(m[it.k]*1.05);});});}});

try{window.ACH&&window.ACH.add&&window.ACH.add([
 {id:'hd_train',n:'เหงื่อแรกที่ลานฝึก',d:'ฝึกสมาชิกตระกูลครั้งแรก',icon:'🏋️',tier:'bronze'},
 {id:'hd_rankS',n:'ปั้นจนเป็นดาว',d:'เลื่อนแรงค์สมาชิกขึ้นถึง S',icon:'⭐',tier:'silver'},
 {id:'hd_master',n:'ปรมาจารย์ประจำตระกูล',d:'เลื่อนสมาชิกเป็น Master ได้คนแรก',icon:'👑',tier:'gold'},
 {id:'hd_s1',n:'ก้าวแรกในโหมดยาก',d:'ชนะดันเจี้ยนโหมดยากด่าน 1',icon:'🔥',tier:'bronze'},
 {id:'hd_s10',n:'ผ่านครึ่งทางนรก',d:'ชนะดันเจี้ยนโหมดยากด่าน 10',icon:'🌋',tier:'silver'},
 {id:'hd_s20',n:'ผู้ปราบพญามาร',d:'ชนะดันเจี้ยนโหมดยากครบ 20 ด่าน',icon:'😈',tier:'gold'},
 {id:'hd_4cls',n:'ตี้ครบเครื่อง',d:'ชนะดันเจี้ยนด้วยตี้ 4 อาชีพไม่ซ้ำกัน',icon:'🧩',tier:'silver'},
 {id:'hd_gold',n:'รูปปั้นทองหน้าบ้าน',d:'แลกรูปปั้นทองให้หัวหน้าตระกูล',icon:'🥇',tier:'silver'},
 {id:'hd_rainbow',n:'รุ้งเจ็ดสีกลางเมือง',d:'แลกรูปปั้นรุ้งให้หัวหน้าตระกูล',icon:'🌈',tier:'gold'},
 {id:'hd_cmd',n:'แม่ทัพตัวจริง',d:'ชนะดันเจี้ยนโหมดยากโดยสั่งเองทุกเทิร์น ไม่กดออโต้เลย',icon:'🎯',tier:'silver'},
 {id:'hd_flaw',n:'ไม่มีใครต้องหามกลับ',d:'ชนะดันเจี้ยนโหมดยากโดยไม่มีใครในตี้ล้มสักคน',icon:'🛡',tier:'silver'},
 {id:'hd_ch10',n:'หอท้าทายชั้นสิบ',d:'ผ่านหอท้าทายระดับ 10',icon:'🗼',tier:'gold'}]);}catch(e){}
})();
