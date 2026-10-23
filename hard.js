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
// ต่อสู้ออโต้: team [{id,name,cls,hp,atk,def,luk,master}] · pet {k,legend} · o {hpM, petM, rng} · คืน {win,turns,log,down:[id]}
function fight(team,F,pet,o){o=o||{};const R=o.rng||Math.random,B=buffs(team),PB=petPow(pet,B,o.petM),hpM=o.hpM||1,L=[];const say=s=>L.push(s);
 const rnd=(a,b)=>a+R()*(b-a),pick=a=>a[Math.floor(R()*a.length)],fmt=n=>Math.round(n).toLocaleString();
 const A=team.map(m=>{const f=m.master?1.5:1,me=BUFF[m.cls]&&BUFF[m.cls].t==='me'?f:0,dr=m.cls==='dra'?1+.15*me:1;
  return{id:m.id,n:m.name,cls:m.cls,f:me,mhp:m.hp*hpM,hp:m.hp*hpM,atk:m.atk*(1+(PB.atk||0))*dr,def:m.def*(1+(PB.def||0))*dr,luk:m.luk|0,me:1,rg:0,wing:m.cls==='ang'?1:0};});
 const E=[{n:F.n,hp:F.hp,mhp:F.hp,atk:F.atk,def:F.def,boss:1},{n:F.mn+' ซ้าย',hp:F.hp*.12,mhp:F.hp*.12,atk:F.atk*.35,def:F.def*.5},{n:F.mn+' ขวา',hp:F.hp*.12,mhp:F.hp*.12,atk:F.atk*.35,def:F.def*.5}];
 const crit=a=>.05+a.luk/600+(B.arc?.05*B.arc:0)+(PB.crit||0),dodge=.03+(B.rog?.05*B.rog:0)+(PB.dodge||0);
 const hit=(at,df)=>at*at/(at+df)*rnd(.9,1.1);
 // ดาเมจของสมาชิกหลังบัพตัวเอง
 const pow=a=>{let x=a.atk;if(a.cls==='war'&&a.rg>0)x*=1+.08*a.f;if(a.cls==='mag')x*=1+.05*a.f;if(a.fall)x*=1-.15;return x;};
 let phx=PB.rev?1:0,nec=B.nec?1:0,t=0;const live=a=>a.filter(x=>x.hp>0),down=new Set();
 say(`⚔️ ${F.n} ขวางทางอยู่ พร้อม${F.mn}อีกสองตัว`);
 const hurt=(a,d,src)=>{a.hp-=d;
  if(a.wing&&a.hp>0&&a.hp<a.mhp*.2){a.wing=0;a.fall=1;a.hp=Math.min(a.mhp,a.hp+a.mhp*.5*a.f);say(`🪽 ${a.n} กางปีกสวรรค์ ฟื้นกลับมาครึ่งหลอด แต่แรงตกลง`);return;}
  if(a.cls==='war'&&a.hp>0&&a.hp<a.mhp*.4&&a.rg<=0){a.rg=5;say(`😤 ${a.n} เลือดขึ้นหน้า ตีแรงขึ้นอีก 5 เทิร์น`);}
  if(a.hp<=0){if(a.wing){a.wing=0;a.fall=1;a.hp=a.mhp*.5*a.f;say(`🪽 ${a.n} คืนชีพด้วยปีกสวรรค์ แต่แรงตกลง`);return;}a.hp=0;say(a.me?`💥 ${a.n} ล้มลงเพราะ${src}`:`🦴 ${a.n}แตกสลายไปอีกรอบ`);if(a.me)down.add(a.id);}};
 while(t<30){t++;const ally=live(A).filter(a=>a.me);if(!ally.length)break;
  // ฝั่งเรา
  let sum=0,crits=[];const foes=()=>live(E);
  live(A).forEach(a=>{const fs=foes();if(!fs.length)return;const mins=fs.filter(e=>!e.boss),tg=mins.length&&R()<.5?mins[0]:(fs.find(e=>e.boss)||fs[0]);
   let d=hit(pow(a),tg.def);if(a.cls==='dsl'&&F.drg)d*=1+.2*a.f;if(a.me&&R()<crit(a)){d*=1.7;crits.push(a.n);}tg.hp-=d;sum+=d;});
  if(PB.bite&&foes().length){const tg=foes()[0],av=ally.reduce((s,a)=>s+a.atk,0)/ally.length,d=hit(av*PB.bite,tg.def);tg.hp-=d;sum+=d;}
  E.forEach(e=>{if(e.hp<=0&&!e.dead){e.dead=1;if(e.boss)return;const nm=e.n.replace(/ (ซ้าย|ขวา)$/,'');say(`🗡 ${nm}ล้มไปหนึ่งตัว`);
   if(nec){nec=0;const k=B.nec;A.push({id:'nec',n:nm+'ผีดิบ',cls:'',f:0,mhp:e.mhp*.6*k,hp:e.mhp*.6*k,atk:e.atk*1.2*k,def:e.def,luk:0,me:0,rg:0,wing:0});say(`💀 เนโครแมนเซอร์ปลุก${nm}ขึ้นมาสู้ข้างตี้`);}}});
  const bo=E[0];if(bo.hp<=0){say(`🏆 เทิร์น ${t}: ${crits.length?crits[0]+' ปิดฉากด้วยคริติคอล ':''}${F.n} ล้มลงแล้ว!`);return{win:true,turns:t,log:L,down:[...down]};}
  say(`🔸 เทิร์น ${t}: ตี้รุมตีรวม ${fmt(sum)}${crits.length?` · คริโดย ${crits.slice(0,2).join(', ')}`:''} (บอสเหลือ ${Math.max(1,Math.round(bo.hp/bo.mhp*100))}%)`);
  A.forEach(a=>{if(a.rg>0)a.rg--;});
  // ฝั่งศัตรู
  const rage=t>15?Math.pow(1.12,t-15):1;if(t===16)say(`😡 ${F.n} เริ่มคลั่ง แรงขึ้นทุกเทิร์น`);
  live(E).filter(e=>!e.boss).forEach(e=>{const tg=live(A);if(!tg.length)return;const a=pick(tg);if(R()<dodge)return;hurt(a,hit(e.atk,a.def),F.mn);});
  if(t%3===0){say(`🌀 ${F.n} ใช้ท่า "${F.sk}" ใส่ทั้งตี้!`);live(A).forEach(a=>{if(R()<dodge)return;hurt(a,hit(bo.atk*.55*rage,a.def),F.sk);});}
  else{const tg=live(A);if(tg.length){const a=pick(tg);
   if(R()<dodge)say(`💨 ${a.n} หลบการโจมตีของ${F.n}ได้ฉิวเฉียด`);else{const d=hit(bo.atk*rage,a.def);say(`👊 ${F.n}ฟาดใส่ ${a.n} ${fmt(d)}`);hurt(a,d,F.n);}}}
  // ฟื้นตัวท้ายเทิร์น: นักบวชฮีล 5% ×(1+6%) · สัตว์เลี้ยงบางตัวฮีลเพิ่ม
  const hl=(B.pri?.05*(1+.06*B.pri):0)+(PB.heal||0);if(hl)live(A).forEach(a=>a.hp=Math.min(a.mhp,a.hp+a.mhp*hl));
  if(!live(A).some(a=>a.me)&&phx){phx=0;A.forEach(a=>{if(a.me){a.hp=a.mhp*.4;down.delete(a.id);}});say('🔥 ฟีนิกซ์กางปีก ทั้งตี้ลุกขึ้นจากเถ้าถ่าน!');}}
 say(live(A).some(a=>a.me)?`⌛ ${F.n} ทนจนตี้หมดแรง ต้องถอยออกมาก่อน`:`☠️ ตี้ล้มหมด ต้องหามกลับเมือง`);
 A.forEach(a=>{if(a.me&&a.hp<=0)down.add(a.id);});return{win:false,turns:t,log:L,down:[...down]};}
// สูตรเลเวล (ตรงกับ city.js): lv+1 → hp+8% atk+6% def+6%
function lvUp(m){m.lv=(m.lv|0)+1;m.hp=Math.round(m.hp*1.08);m.atk=Math.round(m.atk*1.06);m.def=Math.round(m.def*1.06);}
const trainCost=lv=>Math.round((20+lv*lv*.25)*BONUS('train'));
// เลื่อนแรงค์ไป ri ใหม่: [เหรียญ, เลเวลขั้นต่ำ]
const RKUP=[null,[150,8],[300,14],[500,20],[800,26],[1200,32],[2000,38]];
const MASTER={lv:45,gold:3000,rb:5,stage:10};
const xpNeed=lv=>lv*10;
window.HARD={fight,foe,STAGES,BUFF,PETB,petB,petPow,buffs,lvUp,trainCost,RKUP,MASTER};
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
.hd-res{margin-top:6px;padding:8px 10px;border-radius:8px;font-size:13.5px}.hd-res.w{background:rgba(134,214,127,.15)}.hd-res.l{background:rgba(239,107,94,.15)}
.hd-pw{font-size:12.5px}.hd-pw.g{color:var(--good,#86d67f)}.hd-pw.m{color:var(--warn,#f2c14e)}.hd-pw.b{color:var(--bad,#ef6b5e)}
.hd-sel{max-width:100%;padding:5px;border-radius:6px;background:var(--panel2,#1c2e36);color:inherit;border:1px solid var(--line,#2c3a36);font:inherit;font-size:13px}`;document.head.appendChild(st);}
css();
const bfHTML=m=>{const b=BUFF[m.cls];return b?`<div class="hd-bf">✦ <b>${esc(b.n)}</b>${m.master?' (Master)':''}: ${esc(b.d)}</div>`:'<div class="hd-bf" style="color:var(--dim,#8aa39a)">ไม่มีบัพประจำอาชีพ</div>';};
const head=(m,P)=>`<div><span class="rk" style="background:${M.rkCol(rkOf(m))}">${rkOf(m)}</span><b>${esc(m.name)}</b>${P&&P.head===m.id?' 👑':''}</div>`;
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
let sel=0,bt=null,timer=0;
// city.js: สมาชิกที่ไปทำงานในเมืองลงดันเจี้ยนไม่ได้ · สัตว์อารมณ์ดีแรงขึ้น อารมณ์เสียอ่อนลง
const busy=id=>{try{return!!(window.CITY&&window.CITY.busy&&window.CITY.busy(id));}catch(e){return false;}};
const petMul=p=>{try{return p&&window.CITY&&window.CITY.petMul?(+window.CITY.petMul(p.id)||1):1;}catch(e){return 1;}};
function team(P,h){const ids=[P.head,...h.party.filter(id=>id!==P.head&&!busy(id))].slice(0,4);return ids.map(id=>P.roster.find(m=>m.id===id)).filter(Boolean);}
const power=T=>T.reduce((s,m)=>s+Math.sqrt(m.hp*m.atk*(1+m.def/100)),0);
const foePow=F=>Math.sqrt(F.hp*1.24*F.atk*(1+F.def/100))*1.35;
function play(stage){const P=M.load(),h=H(P),T=team(P,h);if(!T.length||T.some(m=>injLeft(h,m.id)))return;
 const pet=P.pets.find(p=>p.id===h.pet),B=buffs(T),PB=petPow(pet,B,petMul(pet)),F=foe(stage),r=fight(T,F,pet,{hpM:BONUS('hp'),petM:petMul(pet)});
 const ch=stage>20,first=r.win&&(ch?stage-20>h.ch:stage>h.best),res={win:r.win,stage,first,g:0,rb:0,lv:[]};
 if(r.win){const base=ch?300+(stage-20)*60:100+stage*50,mul=(first?1:.6)*(1+(B.rog?.15*B.rog:0)+(PB.gold||0))*BONUS('gold');
  res.g=Math.round(base*mul);P.gold+=res.g;P.goldAll+=res.g;
  if(first){if(ch){h.ch=stage-20;res.rb=(h.ch%5===0)?3:1;}else{h.best=stage;res.rb=1+(stage%5===0?2:0);}}
  if(Math.random()<.05+(B.rog?.1*B.rog:0)){res.rb++;res.drop=1;}h.rb+=res.rb;h.rbAll+=res.rb;
  const xp=30+stage*12;T.forEach(m=>{h.xp[m.id]=(h.xp[m.id]|0)+xp;let n=0;while(h.xp[m.id]>=xpNeed(m.lv)){h.xp[m.id]-=xpNeed(m.lv);lvUp(m);n++;}if(n)res.lv.push(m.name+' +'+n);});res.xp=xp;
  if(stage>=1)M.grantAch('hd_s1');if(stage>=10)M.grantAch('hd_s10');if(stage>=20)M.grantAch('hd_s20');if(ch&&h.ch>=10)M.grantAch('hd_ch10');
  if(new Set(T.map(m=>m.cls).filter(Boolean)).size>=4)M.grantAch('hd_4cls');}
 else{r.down.forEach(id=>{if(T.some(m=>m.id===id))h.inj[id]=Date.now()+10*60000;});res.inj=r.down.filter(id=>T.some(m=>m.id===id)).length;}
 M.save(P);if(r.win)fire('tof:hard-clear',{stage,first,pets:pet?[pet.id]:[]}); // city.js: เฉพาะตัวที่พาไปถึงจะเหนื่อย
 clearInterval(timer);bt={log:r.log,n:0,res};timer=setInterval(()=>{if(!bt)return clearInterval(timer);bt.n++;const el=document.getElementById('hdLog');
  if(el&&bt.n<=bt.log.length){const d=document.createElement('div');d.textContent=bt.log[bt.n-1];el.appendChild(d);el.scrollTop=el.scrollHeight;}
  if(bt.n>=bt.log.length){clearInterval(timer);M.refresh();}},330);M.refresh();}
function resHTML(r){if(r.win)return`<div class="hd-res w">🏆 ชนะ! ได้ 🪙 ${r.g}${r.rb?` · 🌈 ${r.rb}${r.drop?' (มือไวเก็บได้เพิ่ม)':''}`:''} · EXP +${r.xp} ทุกคน${r.lv.length?` · เลเวลอัป: ${esc(r.lv.join(', '))}`:''}${r.first?'<br>ผ่านครั้งแรก รับเหรียญรุ้งเต็มๆ':''}</div>`;
 return`<div class="hd-res l">แพ้ ${r.inj?`มี ${r.inj} คนบาดเจ็บต้องพัก 10 นาที (หรือจ่ายค่าหมอ)`:''} ลองฝึกที่ลานฝึก หรือเปลี่ยนตี้แล้วมาใหม่</div>`;}
M.tab('hard',{n:'🔥 ดันเจี้ยนโหมดยาก',o:40,lock:LOCK,render(el,P){const h=H(P),T=team(P,h),hd=P.roster.find(m=>m.id===P.head);
 const cnt={};T.forEach(m=>{if(m.cls)cnt[m.cls]=(cnt[m.cls]||0)+1;});
 const nx=Math.min(20,h.best+1);if(!sel||sel>Math.max(nx,h.best>=20?20+h.ch+1:0))sel=h.best>=20?20+h.ch+1:nx;
 const F=foe(sel),pt0=P.pets.find(p=>p.id===h.pet),pw=power(T)*(1+(petPow(pt0,buffs(T),petMul(pt0)).atk||0)),fp=foePow(F),rt=pw/fp;
 const hurt=T.filter(m=>injLeft(h,m.id)),going=bt&&bt.n<bt.log.length;
 el.innerHTML=`<div class="hd-top"><span>🌈 <span class="hd-rb">${h.rb}</span></span><span>ผ่านแล้ว ${h.best}/20 ด่าน</span>${h.best>=20?`<span>🗼 หอท้าทายสูงสุด ระดับ ${h.ch}</span>`:''}</div>
 <h3>ตี้ของคุณ (${T.length}/4)</h3><p class="mt-dim">หัวหน้าตระกูลต้องไปทุกครั้ง เลือกคนอื่นได้อีก 3 คน อาชีพเดียวกันได้ไม่เกิน 2 คน</p>
 <div class="hd-grid">${P.roster.map(m=>{const on=T.includes(m),il=injLeft(h,m.id),bz=m.id!==P.head&&busy(m.id),full=bz||!on&&(T.length>=4||(m.cls&&cnt[m.cls]>=2)),hd0=m.id===P.head;
  return`<div class="mt-card hd-pick${on?' on':''}${(full||il||bz)&&!on?' off':''}" data-pk="${m.id}" role="button" tabindex="0" aria-pressed="${on}">${head(m,P)}${stat(m)}${bfHTML(m)}${bz?'<div class="mt-dim">🏘 ทำงานในเมืองอยู่</div>':''}
  ${il?`<div class="mt-dim">🤕 พักฟื้นอีก ${mins(il)} นาที <button class="mt-btn" data-heal="${m.id}" ${P.gold<100?'disabled':''}>ค่าหมอ 🪙 100</button></div>`:''}</div>`;}).join('')}</div>
 <h3>สัตว์เลี้ยงคู่ตี้</h3><select class="hd-sel" id="hdPet"><option value="">ไม่พาไป</option>${P.pets.map(p=>{const d=(C().PETS||{})[p.k]||{n:p.k},b=petB(p);return`<option value="${p.id}" ${h.pet===p.id?'selected':''}>${p.legend?'✨ ':''}${esc(d.n)}: ${esc(b.d)}</option>`;}).join('')}</select>
 <h3>เลือกด่าน</h3><div class="hd-st">${STAGES.map((s,i)=>`<button type="button" data-sg="${i+1}" class="${i+1<=h.best?'ok':''} ${sel===i+1?'sel':''}" ${i+1>nx?'disabled':''}>${i+1<=h.best?'✓':''}${i+1}</button>`).join('')}
 ${h.best>=20?`<button type="button" data-sg="${21+h.ch}" class="${sel>20?'sel':''}" style="grid-column:span 2">🗼 ท้าทาย ${h.ch+1}</button>`:''}</div>
 <div class="mt-card"><b>${sel>20?'🗼':'🔥'} ด่าน ${sel>20?'ท้าทาย '+(sel-20):sel}: ${esc(F.n)}</b><div class="mt-dim">${esc(F.x)}</div><div class="mt-dim">HP ${F.hp.toLocaleString()} ATK ${F.atk} DEF ${F.def} · ท่าไม้ตาย "${esc(F.sk)}" · ลูกสมุน ${esc(F.mn)} ×2</div>
 <div class="hd-pw ${rt>=1.15?'g':rt>=.85?'m':'b'}">พลังตี้เทียบบอส: ${rt>=1.15?'ได้เปรียบ':rt>=.85?'สูสี':'ยังอ่อนกว่ามาก ฝึกก่อนดีกว่า'} (${Math.round(rt*100)}%)</div>
 <button class="mt-btn pri" id="hdGo" ${going||hurt.length||!hd?'disabled':''}>${going?'กำลังสู้...':hurt.length?'มีคนในตี้ยังเจ็บอยู่':'⚔️ ลุย!'}</button></div>
 ${bt?`<div class="hd-log" id="hdLog" aria-live="polite">${bt.log.slice(0,bt.n).map(s=>`<div>${esc(s)}</div>`).join('')}</div>${going?'<button class="mt-btn" id="hdSkip">ข้ามไปดูผล</button>':resHTML(bt.res)}`:''}`;
 el.querySelectorAll('[data-pk]').forEach(c=>{const go=()=>{const id=c.dataset.pk;if(id===P.head)return;upd((Q,hh)=>{const i=hh.party.indexOf(id);if(i>=0){hh.party.splice(i,1);return;}
  const TT=team(Q,hh),m=Q.roster.find(x=>x.id===id);if(!m||TT.length>=4||injLeft(hh,id)||busy(id))return;if(m.cls&&TT.filter(x=>x.cls===m.cls).length>=2)return;hh.party=hh.party.filter(x=>x!==Q.head&&Q.roster.some(r=>r.id===x));hh.party.push(id);});};
  c.onclick=ev=>{if(ev.target.closest('[data-heal]'))return;go();};c.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();go();}};});
 el.querySelectorAll('[data-heal]').forEach(b=>b.onclick=()=>upd((Q,hh)=>{if(Q.gold<100)return;Q.gold-=100;delete hh.inj[b.dataset.heal];}));
 const ps=el.querySelector('#hdPet');if(ps)ps.onchange=()=>upd((Q,hh)=>{hh.pet=ps.value;});
 el.querySelectorAll('[data-sg]').forEach(b=>b.onclick=()=>{sel=+b.dataset.sg;M.refresh();});
 const g=el.querySelector('#hdGo');if(g)g.onclick=()=>play(sel);
 const sk=el.querySelector('#hdSkip');if(sk)sk.onclick=()=>{if(bt){bt.n=bt.log.length;clearInterval(timer);M.refresh();}};
 const lg=el.querySelector('#hdLog');if(lg)lg.scrollTop=lg.scrollHeight;}});

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
 {id:'hd_ch10',n:'หอท้าทายชั้นสิบ',d:'ผ่านหอท้าทายระดับ 10',icon:'🗼',tier:'gold'}]);}catch(e){}
})();
