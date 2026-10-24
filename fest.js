// fest.js — เทศกาลตามวันที่: ฟาร์มของเทศกาลจากการไต่หอ/โหมดยาก ภารกิจ เหรียญสะสมประจำปี ร้านแลกแฟชั่นและของตกแต่งเมือง
// API: window.FEST = { active(), list(), force(id|null) }  force ใช้เทส (จำไว้ใน sessionStorage 'tof-fest-force' จนปิดแท็บ)
// เก็บใน META P.mod.fest = {ev:{'halloween-2026':{item,got,runs,bosses,maxFl,hard,buy,q:{}}}, own:{key:1}, wear:{memberId:key}, coins:['halloween-2026'], last:{inst,n,t}}
// ของตกแต่งที่แลกได้ push key ลง P.mod.city.decor ให้ town.js วาด
(function(){
'use strict';
if(!window.META)return;
const M=window.META,esc=M.esc,FK='tof-fest-force';
const TH_M=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
// a=[เดือน,วัน] วันเริ่ม b=วันสุดท้าย (ข้ามปีได้) · c=ราคาเป็นของเทศกาล g=ราคาเป็นเหรียญเมือง
const FESTS=[
 {id:'halloween',n:'ฮาโลวีน',ic:'🎃',a:[10,15],b:[11,10],it:'🍬',itn:'ลูกอม',coin:'เหรียญราชาฟักทอง',col:'#ff8a3a',
  d:'ค้างคาวบินวนรอบหอ ผีตนไหนก็แจกลูกอม เก็บไปแลกหมวกกับปีกมาแต่งให้คนในตระกูล',
  shop:[{k:'wizhat',t:'w',n:'หมวกนักเวท',ic:'🧙',c:60,g:900},{k:'witchhat',t:'w',n:'หมวกแม่มด',ic:'🧹',c:80,g:1200},{k:'catears',t:'w',n:'หูแมวดำ',ic:'🐈‍⬛',c:50,g:750},
   {k:'pumpkinhead',t:'w',n:'หัวฟักทอง',ic:'🎃',c:120,g:1800},{k:'batwings',t:'w',n:'ปีกค้างคาว',ic:'🦇',c:150,g:2200},{k:'crown',t:'w',n:'มงกุฎราชันย์ผี',ic:'👑',c:260,g:4000},
   {k:'pumpkin',t:'d',n:'โคมฟักทอง',ic:'🎃',c:40,g:600},{k:'ghostlamp',t:'d',n:'ตะเกียงผี',ic:'👻',c:70,g:1000},{k:'cauldron',t:'d',n:'หม้อยาแม่มด',ic:'🫕',c:90,g:1300},{k:'batflag',t:'d',n:'ธงค้างคาว',ic:'🚩',c:50,g:750}],
  bonus:R=>Math.min(5,Math.max(0,R.bosses|0))*6,bn:'บอสแจกขนม',bd:'บอสที่ล้มได้ในรอบนั้นแจกลูกอมเพิ่มตัวละ 6 (นับไม่เกิน 5 ตัว)',
  q:[{id:'hw_kill',n:'ไล่ผีออกจากหอ: ปราบมอนสเตอร์รวม 250 ตัว',v:e=>e.kills,max:250,r:40},{id:'hw_curse',n:'โดนผีแกล้ง: จบรอบที่ติดคำสาปมาด้วย 2 รอบ',v:e=>e.curseRuns,max:2,r:30},
   {id:'hw_fl70',n:'เดินเคาะประตูขอขนมขึ้นไปถึงชั้น 70',v:e=>e.maxFl,max:70,r:50}],
  ach:['fest_coin_hw','fest_hw_all']},
 {id:'loy',n:'ลอยกระทง',ic:'🪷',a:[11,15],b:[11,30],it:'🪷',itn:'กลีบบัว',coin:'เหรียญกระทงทอง',col:'#ffd36a',
  d:'คืนเดือนเพ็ญ คนในเมืองพากันไปลอยกระทงที่คูน้ำหน้าหอ เก็บกลีบบัวไว้แลกของงานวัด',
  shop:[{k:'jasmine',t:'w',n:'มาลัยดอกมะลิ',ic:'💮',c:60,g:900},{k:'sabai',t:'w',n:'ผ้าสไบทอง',ic:'🧣',c:90,g:1300},{k:'lotuspin',t:'w',n:'ดอกบัวทัดหู',ic:'🌸',c:50,g:750},
   {k:'krathonghat',t:'w',n:'หมวกกระทง',ic:'🪷',c:120,g:1800},{k:'fireflies',t:'w',n:'หิ่งห้อยล้อมตัว',ic:'✨',c:150,g:2200},{k:'chada',t:'w',n:'ชฎาทอง',ic:'🏵️',c:260,g:4000},
   {k:'krathong',t:'d',n:'กระทงใบตอง',ic:'🪷',c:50,g:700},{k:'skylantern',t:'d',n:'โคมลอย',ic:'🏮',c:80,g:1100},{k:'lotuspond',t:'d',n:'สระบัว',ic:'🌷',c:90,g:1300},{k:'candlerow',t:'d',n:'ประทีปดินเผา',ic:'🕯️',c:50,g:750}],
  // โบนัสตอนจบรอบ (ต่อจากสูตรปกติ) · q = ภารกิจเฉพาะงาน ต่อท้าย QUESTS
  bonus:R=>(R.karma|0)>=10?20:0,bn:'ทำบุญได้บุญ',bd:'จบรอบโดยกรรมดีได้กลีบบัวเพิ่ม 20',
  q:[{id:'loy_good',n:'ทำบุญก่อนไปลอยกระทง: จบรอบโดยกรรมดี 2 รอบ',v:e=>e.good,max:2,r:40},{id:'loy_pet',n:'พาสัตว์เลี้ยงไปเที่ยวงานวัด: จบรอบที่มีสัตว์เลี้ยงไปด้วย 2 รอบ',v:e=>e.petRuns,max:2,r:30},
   {id:'loy_fl80',n:'ปีนขึ้นไปปล่อยโคมที่ชั้น 80',v:e=>e.maxFl,max:80,r:50}],ach:['fest_coin_loy','fest_loy_all']},
 {id:'xmas',n:'คริสต์มาสและปีใหม่',ic:'🎄',a:[12,15],b:[1,10],it:'❄️',itn:'เกล็ดหิมะ',coin:'เหรียญดาวเหนือ',col:'#9fd8ff',
  d:'หิมะตกบนยอดหอเป็นครั้งแรกของปี เก็บเกล็ดหิมะไปแลกของขวัญ แล้วไปนับถอยหลังกัน',
  shop:[{k:'santahat',t:'w',n:'หมวกซานต้า',ic:'🎅',c:60,g:900},{k:'antlers',t:'w',n:'เขากวางเรนเดียร์',ic:'🦌',c:80,g:1200},{k:'scarf',t:'w',n:'ผ้าพันคอไหมพรม',ic:'🧶',c:50,g:750},
   {k:'earmuffs',t:'w',n:'ที่ปิดหูขนฟู',ic:'🎧',c:70,g:1000},{k:'elfhat',t:'w',n:'หมวกเอลฟ์',ic:'🧝',c:120,g:1800},{k:'partyhat',t:'w',n:'หมวกปาร์ตี้ปีใหม่',ic:'🥳',c:200,g:3000},
   {k:'xmastree',t:'d',n:'ต้นคริสต์มาส',ic:'🎄',c:90,g:1300},{k:'snowman',t:'d',n:'ตุ๊กตาหิมะ',ic:'⛄',c:60,g:900},{k:'giftpile',t:'d',n:'กองของขวัญ',ic:'🎁',c:60,g:900},{k:'fireworks',t:'d',n:'พลุฉลองปีใหม่',ic:'🎆',c:120,g:1700}],
  bonus:R=>Math.min(2,Array.isArray(R.comps)?R.comps.length:0)*10,bn:'ของขวัญจากเพื่อน',bd:'เพื่อนร่วมทางในรอบนั้นให้เกล็ดหิมะคนละ 10',
  q:[{id:'xm_kill',n:'ปราบมอนสเตอร์รวม 300 ตัว ก่อนซานต้ามาถึง',v:e=>e.kills,max:300,r:40},{id:'xm_comp',n:'ฉลองกับเพื่อน: จบรอบที่มีเพื่อนร่วมทาง 2 รอบ',v:e=>e.compRuns,max:2,r:30},
   {id:'xm_top',n:'นับถอยหลังบนยอดหอ: พิชิตชั้น 100',v:e=>e.wins,max:1,r:60}],ach:['fest_coin_xm','fest_xm_all']},
 {id:'songkran',n:'สงกรานต์',ic:'💦',a:[4,10],b:[4,20],it:'💧',itn:'หยดน้ำ',coin:'เหรียญขันเงิน',col:'#6ad0ff',
  d:'หน้าร้อนทั้งหอ มอนสเตอร์ก็ยังโดนสาดน้ำ เก็บหยดน้ำไปแลกเสื้อลายดอกกับขันใบใหม่',
  shop:[{k:'flowershirt',t:'w',n:'เสื้อลายดอก',ic:'🌺',c:60,g:900},{k:'sunglasses',t:'w',n:'แว่นกันแดด',ic:'🕶️',c:50,g:700},{k:'dinsor',t:'w',n:'ดินสอพองแต้มหน้า',ic:'⚪',c:40,g:600},
   {k:'phakhaoma',t:'w',n:'ผ้าขาวม้าคาดหัว',ic:'🎀',c:70,g:1000},{k:'strawhat',t:'w',n:'หมวกสาน',ic:'👒',c:100,g:1500},{k:'watergun',t:'w',n:'ปืนฉีดน้ำ',ic:'🔫',c:180,g:2600},
   {k:'waterbowl',t:'d',n:'ขันน้ำพานรอง',ic:'🥣',c:70,g:1000},{k:'dragonjar',t:'d',n:'โอ่งมังกร',ic:'🏺',c:80,g:1100},{k:'sandpagoda',t:'d',n:'เจดีย์ทราย',ic:'🏖️',c:60,g:900},{k:'tung',t:'d',n:'ตุงล้านนา',ic:'🎏',c:50,g:750}],
  bonus:R=>Math.min(5,Math.max(0,R.potions|0))*8,bn:'น้ำเหลือเก็บ',bd:'ยาฟื้นพลังที่เหลือตอนจบรอบแลกเป็นหยดน้ำได้ขวดละ 8 (นับไม่เกิน 5 ขวด)',
  q:[{id:'sk_kill',n:'สาดน้ำใส่มอนสเตอร์ให้ครบ 200 ตัว',v:e=>e.kills,max:200,r:40},{id:'sk_pot',n:'ประหยัดน้ำ: จบรอบโดยยังมียาฟื้นพลังเหลือ 2 รอบ',v:e=>e.potRuns,max:2,r:30},
   {id:'sk_clan',n:'รดน้ำดำหัว: พาคนในตระกูลจากป้อมทหารรับจ้างไปไต่หอด้วย 1 รอบ',v:e=>e.clanRuns,max:1,r:40}],ach:['fest_coin_sk','fest_sk_all']}];
const BY={};FESTS.forEach(F=>BY[F.id]=F);
// ภารกิจเทศกาล (นับเฉพาะช่วงเทศกาลนั้นของปีนั้น) รับครบ Q_COIN ข้อได้เหรียญสะสม
const QUESTS=[{id:'runs',n:'ไต่หอ 3 รอบ',v:e=>e.runs,max:3,r:20},{id:'boss',n:'ล้มบอส 10 ตัว',v:e=>e.bosses,max:10,r:40},
 {id:'fl50',n:'ขึ้นถึงชั้น 50 ในรอบเดียว',v:e=>e.maxFl,max:50,r:40},{id:'got',n:'เก็บ{it}ได้ 300',v:e=>e.got,max:300,r:50},
 {id:'hard',n:'ชนะด่านโหมดยาก 3 ด่าน',v:e=>e.hard,max:3,r:60},{id:'buy',n:'แลกของในร้าน 2 ชิ้น',v:e=>e.buy,max:2,r:30}];
const Q_COIN=4,DMAX=16; // DMAX = DECOR_MAX ของ city.js (town.js วาดได้ 16 ช่อง)
const qs=F=>F&&Array.isArray(F.q)?QUESTS.concat(F.q):QUESTS;

// ---------- วันที่ ----------
const md=d=>(d.getMonth()+1)*100+d.getDate(),A_=F=>F.a[0]*100+F.a[1],B_=F=>F.b[0]*100+F.b[1],cross=F=>A_(F)>B_(F);
function within(F,d){const x=md(d);return cross(F)?x>=A_(F)||x<=B_(F):x>=A_(F)&&x<=B_(F);}
const yearOf=(F,d)=>cross(F)&&md(d)<A_(F)?d.getFullYear()-1:d.getFullYear();
const dtxt=p=>`${p[1]} ${TH_M[p[0]-1]}`;
let FORCE='';try{FORCE=sessionStorage.getItem(FK)||'';}catch(e){}
function active(){const d=new Date(),F=BY[FORCE]||FESTS.find(f=>within(f,d));if(!F)return null;const y=yearOf(F,d);
 const end=new Date(cross(F)?y+1:y,F.b[0]-1,F.b[1]);return{F,y,inst:F.id+'-'+y,left:Math.max(0,Math.ceil((end-d)/864e5))};}
// เทศกาลถัดไปเรียงตามวันเริ่ม
function upcoming(){const d=new Date(),A=active();return FESTS.map(F=>{let s=new Date(d.getFullYear(),F.a[0]-1,F.a[1]);if(s<=d)s=new Date(d.getFullYear()+1,F.a[0]-1,F.a[1]);
 return{F,s,on:!!A&&A.F===F,days:Math.ceil((s-d)/864e5)};}).sort((x,y)=>(y.on-x.on)||(x.s-y.s));}

// ---------- ข้อมูล ----------
const isObj=M.isObj;
function st(P){if(!isObj(P.mod))P.mod={};const m=P.mod.fest=isObj(P.mod.fest)?P.mod.fest:{};['ev','own','wear'].forEach(k=>{if(!isObj(m[k]))m[k]={};});['coins','stash'].forEach(k=>{if(!Array.isArray(m[k]))m[k]=[];});return m;}
function ev(m,inst){const e=m.ev[inst]=Object.assign({item:0,got:0,runs:0,bosses:0,maxFl:0,hard:0,buy:0,kills:0,wins:0,good:0,petRuns:0,compRuns:0,potRuns:0,clanRuns:0,curseRuns:0,bonus:0},isObj(m.ev[inst])?m.ev[inst]:{});if(!isObj(e.q))e.q={};return e;}
const joined=m=>Object.keys(m.ev).filter(k=>(m.ev[k].got|0)>0);
const allItems=()=>FESTS.reduce((a,F)=>a.concat(F.shop.map(s=>Object.assign({f:F.id},s))),[]);
const item=k=>allItems().find(s=>s.k===k);
function nm(k){const T=window.TOWN||{},r=(T.WEAR&&T.WEAR[k])||(T.DECOR&&T.DECOR[k]),s=item(k);return(r&&r.n)||(s&&s.n)||k;}
const ic=k=>{const s=item(k);return s?s.ic:'🎁';};
function checkAch(m,P){const g=M.grantAch;if(joined(m).length)g('fest_join');if(joined(m).length>=3)g('fest_3');
 const dec=(P&&P.mod&&P.mod.city&&Array.isArray(P.mod.city.decor))?P.mod.city.decor:[];let coins=0;
 FESTS.forEach(F=>{const hc=m.coins.some(c=>c.indexOf(F.id+'-')===0);if(hc)coins++;if(!F.ach)return;
  if(hc)g(F.ach[0]);if(F.shop.filter(s=>s.t==='w').every(s=>m.own[s.k]))g(F.ach[1]);
  if(F.shop.filter(s=>s.t==='d').every(s=>dec.includes(s.k)))g('fest_decor_set');});
 if(coins>=FESTS.length)g('fest_coin_4');
 // ภารกิจประจำธีมครบทุกข้อในงานเดียว
 Object.keys(m.ev).forEach(inst=>{const F=BY[inst.slice(0,inst.lastIndexOf('-'))],q=(m.ev[inst]||{}).q||{};if(F&&Array.isArray(F.q)&&F.q.every(x=>q[x.id])){g('fest_theme');if(F.id==='halloween')g('fest_hw_q');}});}
// โหลด แก้ บันทึก แล้ววาดใหม่
function upd(f){const P=M.load(),m=st(P);const r=f(P,m);save(P,m);return r;}
function save(P,m){M.save(P);checkAch(m,P);M.refresh();banner();}
function gain(n,kind,x){const A=active();if(!A)return 0;n=Math.max(0,Math.round(n));const bx=Math.max(0,Math.round((x&&x.bx)||0));
 return upd((P,m)=>{const e=ev(m,A.inst);e.item+=n;e.got+=n;if(kind)kind(e,x);m.last={inst:A.inst,n,bx,t:Date.now()};return n;});}

// จบรอบไต่หอ: ชั้นละครึ่งชิ้น บอสตัวละ 5 พิชิตยอดแถม 30 + โบนัสตามธีมของงานนั้น
// ตัวนับสำหรับภารกิจประจำธีมก็เก็บจาก R ของรอบนี้ (kills karma pets comps potions cursed)
M.onRun(R=>{const A=active();if(!A)return;const fl=R.won?100:(R.floor|0),b=R.bosses|0;let bx=0;try{bx=A.F.bonus?Math.max(0,A.F.bonus(R)|0):0;}catch(er){}
 const cp=Array.isArray(R.comps)?R.comps:[];
 gain(fl/2+b*5+(R.won?30:0)+bx,e=>{e.runs++;e.bosses+=b;e.maxFl=Math.max(e.maxFl,fl);e.kills+=R.kills|0;if(R.won)e.wins++;
  if((R.karma|0)>=10)e.good++;if(Array.isArray(R.pets)&&R.pets.length)e.petRuns++;if(cp.length)e.compRuns++;if((R.potions|0)>0)e.potRuns++;
  if(R.clanGo||cp.some(c=>c&&c.clan))e.clanRuns++;if((R.cursed|0)>0)e.curseRuns++;e.bonus+=bx;},{bx});
 if(bx)M.grantAch('fest_bonus');});
// ชนะด่านโหมดยาก (hard.js): +15 ด่านที่ผ่านครั้งแรกได้ 25
window.addEventListener('tof:hard-clear',ev=>{const d=(ev&&ev.detail)||{};gain(d.first?25:15,e=>{e.hard++;});});

// ---------- หน้าต่าง ----------
function css(){const s=document.createElement('style');s.textContent=`
.fs-hd{border:1px solid var(--fc,#ff8a3a);border-radius:8px;padding:10px;background:linear-gradient(135deg,rgba(255,138,58,.12),rgba(255,255,255,.02))}
.fs-hd b.big{font-size:16px}.fs-bal{font-family:var(--fP,'DotGothic16',monospace);color:var(--gold,#f4bb4a);font-size:15px}
.fs-q{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0;border-bottom:1px dashed var(--line,#2c3a36)}
.fs-q .qn{flex:1 1 150px;min-width:0}.fs-q .pb{flex:0 0 70px;height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}.fs-q .pb i{display:block;height:100%;background:var(--fc,#ff8a3a)}
.fs-q .mt-btn{margin:0}.fs-it .ic{font-size:22px;line-height:1}.fs-it .mt-btn{padding:4px 7px}
.fs-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)}.fs-row b{flex:1 1 120px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fs-row select{max-width:100%;padding:4px 6px;border-radius:6px;border:1px solid var(--line,#2c3a36);background:var(--bg,#0e1513);color:inherit;font:inherit;font-size:13px}
.fs-coin{display:inline-flex;align-items:center;gap:4px;margin:0 6px 6px 0;padding:4px 8px;border-radius:14px;border:1px solid var(--gold,#f4bb4a);font-size:12.5px}
.fs-sch{display:flex;justify-content:space-between;gap:8px;padding:4px 0;font-size:13px}
.fest-ban{display:flex;align-items:center;gap:8px;width:100%;margin:0 0 8px;padding:6px 10px;border-radius:8px;border:1px dashed var(--fc,#ff8a3a);background:rgba(255,138,58,.08);color:var(--ink,#f1e7d0);font:inherit;font-size:13px;text-align:left;cursor:pointer}
.fest-ban .t{flex:1;min-width:0}.fest-ban .go{color:var(--fc,#ff8a3a);flex:none}
.fs-bx{margin-top:6px;padding:5px 8px;border-radius:6px;background:rgba(255,255,255,.05);font-size:13px}
body.fest-halloween .cert{box-shadow:inset 0 0 0 3px var(--parch2),inset 0 0 0 5px #8b6a3a,0 0 0 1px rgba(255,138,58,.22),0 0 18px rgba(255,138,58,.08)}
body.fest-loy .cert{box-shadow:inset 0 0 0 3px var(--parch2),inset 0 0 0 5px #8b6a3a,0 0 0 1px rgba(255,211,106,.25),0 0 18px rgba(255,211,106,.1)}
body.fest-xmas .cert{box-shadow:inset 0 0 0 3px var(--parch2),inset 0 0 0 5px #8b6a3a,0 0 0 1px rgba(159,216,255,.25),0 0 18px rgba(159,216,255,.1)}
body.fest-songkran .cert{box-shadow:inset 0 0 0 3px var(--parch2),inset 0 0 0 5px #8b6a3a,0 0 0 1px rgba(106,208,255,.25),0 0 18px rgba(106,208,255,.1)}
#card.fest-fxon{position:relative;isolation:isolate}
#card>.fest-fx{position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;image-rendering:pixelated;opacity:.55;border-radius:inherit}
#card>.fest-fx.fest-fxt{z-index:2;opacity:.5}`;document.head.appendChild(s);}
const decs=P=>(P.mod.city&&Array.isArray(P.mod.city.decor))?P.mod.city.decor:[];
function shopCard(s,e,m,P,F){const own=s.t==='w'&&m.own[s.k],dec=s.t==='d'?decs(P).filter(k=>k===s.k).length:0,full=s.t==='d'&&decs(P).length>=DMAX;
 return`<div class="mt-card fs-it"><div><span class="ic">${s.ic}</span> <b>${esc(nm(s.k))}</b></div><div class="mt-dim">${s.t==='w'?'แฟชั่น':'ของตกแต่งเมือง'}${dec?` · ตั้งไว้ในเมือง ${dec} ชิ้น`:''}</div>
 ${own?'<div class="mt-dim">✔ มีแล้ว</div>':`${full?`<div class="mt-dim">ในเมืองเต็มแล้ว (${DMAX}/${DMAX}) เก็บบางชิ้นเข้าคลังก่อน</div>`:''}<button class="mt-btn pri" data-buy="${s.k}" data-pay="i" ${full||e.item<s.c?'disabled':''}>${F.it} ${s.c}</button><button class="mt-btn" data-buy="${s.k}" data-pay="g" ${full||P.gold<s.g?'disabled':''}>🪙 ${s.g.toLocaleString()}</button>`}</div>`;}
// ของตกแต่งเทศกาลที่ตั้งในเมือง: ร้านของ city.js เก็บออกได้เฉพาะของตัวเอง ที่นี่จึงเก็บเข้าคลัง (m.stash) แล้วเอากลับไปตั้งได้ แม้หมดเทศกาลแล้ว
function decorHTML(P,m){const d=decs(P),full=d.length>=DMAX,K=[...new Set(d.concat(m.stash))].filter(k=>{const s=item(k);return s&&s.t==='d';});if(!K.length)return'';
 return`<h3>ของตกแต่งเทศกาล <span class="mt-dim">ในเมือง ${d.length}/${DMAX} ชิ้น</span></h3><p class="mt-dim">ของที่เก็บเข้าคลังไม่หายไปไหน เอากลับไปตั้งได้ทุกเมื่อที่ในเมืองยังมีที่ว่าง</p>
 ${K.map(k=>{const on=d.filter(x=>x===k).length,st=m.stash.filter(x=>x===k).length;return`<div class="fs-row"><b>${ic(k)} ${esc(nm(k))}</b><span class="mt-dim">${on?`ตั้งในเมือง ${on} ชิ้น`:''}${on&&st?' · ':''}${st?`อยู่ในคลัง ${st} ชิ้น`:''}</span>
 ${on?`<button class="mt-btn" data-dst="${k}">เก็บเข้าคลัง</button>`:''}${st?`<button class="mt-btn" data-dpl="${k}" ${full?'disabled':''}>เอาไปตั้ง</button>`:''}</div>`;}).join('')}`;}
function dressHTML(P,m){const W=Object.keys(m.own).filter(k=>m.own[k]&&item(k));
 if(!W.length)return'<p class="mt-dim">ยังไม่มีแฟชั่น แลกจากร้านช่วงเทศกาลได้ ของที่แลกแล้วเป็นของตระกูลตลอดไป</p>';
 if(!P.roster.length)return'<p class="mt-dim">ยังไม่มีสมาชิกในตระกูลให้แต่งตัว ไต่หอให้จบสักรอบก่อน</p>';
 return P.roster.map(x=>`<div class="fs-row"><b>${P.head===x.id?'👑 ':''}${esc(x.name)}</b><select data-wear="${x.id}" aria-label="แฟชั่นของ ${esc(x.name)}"><option value="">ไม่สวม</option>${W.map(k=>`<option value="${k}"${m.wear[x.id]===k?' selected':''}>${ic(k)} ${esc(nm(k))}</option>`).join('')}</select></div>`).join('');}
function collHTML(m){const C=m.coins.map(c=>{const i=c.lastIndexOf('-'),F=BY[c.slice(0,i)];return F?`<span class="fs-coin">${F.ic} ${esc(F.coin)} ${c.slice(i+1)}</span>`:'';}).join('');
 const W=Object.keys(m.own).filter(k=>m.own[k]&&item(k));
 return`<div>${C||'<span class="mt-dim">ยังไม่มีเหรียญเทศกาล ทำภารกิจให้ครบ '+Q_COIN+' ข้อในเทศกาลไหนก็ได้</span>'}</div>${W.length?`<p class="mt-dim" style="margin-top:6px">แฟชั่นที่มี ${W.length}/${allItems().filter(s=>s.t==='w').length}: ${W.map(k=>ic(k)+' '+esc(nm(k))).join(' · ')}</p>`:''}`;}
function schHTML(){return upcoming().map(u=>`<div class="fs-sch"><span>${u.F.ic} ${esc(u.F.n)}</span><span class="mt-dim">${dtxt(u.F.a)} – ${dtxt(u.F.b)} · ${u.on?'<b style="color:var(--gold,#f4bb4a)">เปิดอยู่</b>':`อีก ${u.days} วัน`}</span></div>`).join('');}
function render(el,P){const m=st(P),A=active();let h='';
 if(A){const F=A.F,e=ev(m,A.inst),QL=qs(F),done=QL.filter(q=>e.q[q.id]).length,has=m.coins.includes(A.inst);
  h+=`<div class="fs-hd" style="--fc:${F.col}"><div><b class="big">${F.ic} เทศกาล${esc(F.n)} ${A.y}</b></div><div class="mt-dim">เปิดถึง ${dtxt(F.b)}${A.left?` (อีก ${A.left} วัน)`:' (วันสุดท้าย)'}</div>
  <p style="margin:6px 0">${esc(F.d)}</p><div class="fs-bal">${F.it} ${esc(F.itn)} ${e.item.toLocaleString()}</div>
  <div class="mt-dim">จบรอบไต่หอได้${esc(F.itn)}ชั้นละครึ่งชิ้น ล้มบอสตัวละ 5 พิชิตยอดหอแถมอีก 30 · ชนะด่านโหมดยากได้ 15 (ด่านแรกที่ผ่าน 25) · ${esc(F.itn)}ใช้ได้ถึงวันจบเทศกาลเท่านั้น</div>
  ${F.bonus?`<div class="fs-bx">🎁 โบนัสประจำงาน "${esc(F.bn)}": ${esc(F.bd)}${e.bonus?` · ได้ไปแล้ว ${F.it} ${e.bonus.toLocaleString()}`:''}</div>`:''}</div>
  <h3>ภารกิจเทศกาล ${done}/${QL.length}</h3><p class="mt-dim">${has?`ได้${esc(F.coin)}ปี ${A.y} แล้ว ภารกิจที่เหลือยังรับ${esc(F.itn)}ได้`:`รับรางวัลครบ ${Q_COIN} ข้อ ได้${esc(F.coin)}ประจำปี ${A.y} เก็บไว้ในคอลเลกชันตลอดไป`}</p>
  ${QL.map(q=>{const v=Math.min(q.max,q.v(e)|0),ok=v>=q.max,got=e.q[q.id];return`<div class="fs-q" style="--fc:${F.col}"><span class="qn">${esc(q.n.replace('{it}',F.itn))}<br><span class="mt-dim">${v}/${q.max} · รางวัล ${F.it} ${q.r}</span></span><span class="pb"><i style="width:${v/q.max*100}%"></i></span>${got?'<span class="mt-dim">✔ รับแล้ว</span>':`<button class="mt-btn${ok?' pri':''}" data-q="${q.id}" ${ok?'':'disabled'}>รับ</button>`}</div>`;}).join('')}
  <h3>ร้านเทศกาล</h3><p class="mt-dim">จ่ายด้วย${esc(F.itn)}หรือเหรียญเมืองก็ได้ ของตกแต่งไปตั้งอยู่ในเมืองทันที</p><div class="mt-grid">${F.shop.map(s=>shopCard(s,e,m,P,F)).join('')}</div>`;}
 else h+=`<div class="fs-hd"><b class="big">🎪 ตอนนี้ยังไม่มีเทศกาล</b><p class="mt-dim" style="margin:6px 0 0">พอถึงช่วงเทศกาล จบรอบไต่หอหรือชนะโหมดยากจะได้ของเทศกาลไว้แลกแฟชั่นกับของตกแต่งเมือง</p></div>`;
 h+=`<h3>แต่งตัวให้คนในตระกูล</h3>${dressHTML(P,m)}${decorHTML(P,m)}<h3>คอลเลกชัน</h3>${collHTML(m)}<h3>ตารางเทศกาล</h3>${schHTML()}`;
 el.innerHTML=h;
 el.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>upd((P,m)=>{const A=active();if(!A)return;const e=ev(m,A.inst),QL=qs(A.F),q=QL.find(x=>x.id===b.dataset.q);
  if(!q||e.q[q.id]||(q.v(e)|0)<q.max)return;e.q[q.id]=1;e.item+=q.r;if(QL.filter(x=>e.q[x.id]).length>=Q_COIN&&!m.coins.includes(A.inst))m.coins.push(A.inst);}));
 el.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>upd((P,m)=>{const A=active();if(!A)return;const e=ev(m,A.inst),s=A.F.shop.find(x=>x.k===b.dataset.buy),g=b.dataset.pay==='g';
  if(!s||(s.t==='w'&&m.own[s.k])||(s.t==='d'&&decs(P).length>=DMAX))return;if(g?P.gold<s.g:e.item<s.c)return;if(g)P.gold-=s.g;else e.item-=s.c;e.buy++;
  if(s.t==='w')m.own[s.k]=1;else{if(!isObj(P.mod.city))P.mod.city={};if(!Array.isArray(P.mod.city.decor))P.mod.city.decor=[];if(P.mod.city.decor.length>=DMAX)return;P.mod.city.decor.push(s.k);M.grantAch('fest_decor');}
  try{window.dispatchEvent(new CustomEvent('tof:fest-buy',{detail:{k:s.k,t:s.t}}));}catch(x){}}));
 el.querySelectorAll('[data-wear]').forEach(sl=>sl.onchange=()=>upd((P,m)=>{const id=sl.dataset.wear,k=sl.value;if(!k)delete m.wear[id];else if(m.own[k]){m.wear[id]=k;M.grantAch('fest_wear');}
  try{window.dispatchEvent(new CustomEvent('tof:fest-wear',{detail:{id,k}}));}catch(x){}}));
 el.querySelectorAll('[data-dst]').forEach(b=>b.onclick=()=>upd((P,m)=>{const d=decs(P),i=d.lastIndexOf(b.dataset.dst);if(i<0)return;d.splice(i,1);m.stash.push(b.dataset.dst);}));
 el.querySelectorAll('[data-dpl]').forEach(b=>b.onclick=()=>upd((P,m)=>{const i=m.stash.indexOf(b.dataset.dpl);if(i<0||!isObj(P.mod.city)||!Array.isArray(P.mod.city.decor)||P.mod.city.decor.length>=DMAX)return;m.stash.splice(i,1);P.mod.city.decor.push(b.dataset.dpl);}));}
function regTab(){const A=active();M.tab('fest',{n:A?`${A.F.ic} ${A.F.n}`:'🎪 เทศกาล',o:35,render});}

// ---------- บรรยากาศบนหน้าเกิด: แบนเนอร์เล็กบนการ์ด กดแล้วเปิดแท็บเทศกาล ----------
// เอฟเฟกต์พิกเซลจางๆ หลังเนื้อหาการ์ด (canvas z-index:-1 ใน #card ที่ isolate ไว้) ไม่รับการแตะ
// ใบประกาศบังเกือบทั้งการ์ด (จอมือถือเห็นแทบไม่ได้) จึงมี canvas ชั้นบน .fest-fxt จางกว่า วาดอนุภาคทุกตัวที่สาม ลอยผ่านหน้าใบประกาศ ไม่รับการแตะ
// ฮาโลวีน = ค้างคาว+ประกายไฟ · ลอยกระทง = กระทงบนน้ำ+โคมลอย+จันทร์เพ็ญ · คริสต์มาส = หิมะ+ดาว · สงกรานต์ = ละอองน้ำ+กลีบดอก
// หยุดเองเมื่อสลับแท็บหรือ canvas หลุดจากหน้า · prefers-reduced-motion วาดภาพนิ่งเฟรมเดียว
const RMQ=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const FXS=3,rr=(a,b)=>a+Math.random()*(b-a),px=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h);};
const FXK={
 halloween:{n:(w,h)=>Math.min(24,4+Math.round(w*h/1400)),
  mk(i,w,h,init){if(i%3===2)return{k:'e',x:rr(0,w),y:init?rr(0,h):h+2,vy:-rr(2,5),ph:rr(0,6)};const d=Math.random()<.5?1:-1;return{k:'b',x:init?rr(0,w):d>0?-5:w+5,y:rr(3,h*.65),vx:d*rr(6,12),ph:rr(0,6)};},
  step(p,dt,w,h,t){if(p.k==='e'){p.y+=p.vy*dt;p.x+=Math.sin(t/700+p.ph)*.1;return p.y>-2;}p.x+=p.vx*dt;p.y+=Math.sin(t/500+p.ph)*.15;return p.x>-7&&p.x<w+7;},
  draw(c,p,t){if(p.k==='e'){if((t/180+p.ph|0)%3)px(c,p.x,p.y,1,1,'#ff9a3a');return;}const f=(t/140+p.ph|0)%2;px(c,p.x,p.y,2,2,'#9a6ad0');px(c,p.x,p.y,1,1,'#ffb040');
   if(f){px(c,p.x-2,p.y-1,2,1,'#9a6ad0');px(c,p.x+2,p.y-1,2,1,'#9a6ad0');px(c,p.x-3,p.y-2,1,1,'#9a6ad0');px(c,p.x+4,p.y-2,1,1,'#9a6ad0');}
   else{px(c,p.x-2,p.y+1,2,1,'#9a6ad0');px(c,p.x+2,p.y+1,2,1,'#9a6ad0');px(c,p.x-3,p.y+2,1,1,'#9a6ad0');px(c,p.x+4,p.y+2,1,1,'#9a6ad0');}}},
 loy:{n:(w,h)=>3+Math.min(14,2+Math.round(w*h/2500)),
  bg(c,w,h,t){const mx=w-6,my=6,g=c.globalAlpha;c.globalAlpha=g*.8;for(let y=-4;y<=4;y++){const hw=Math.round(Math.sqrt(16-y*y));px(c,mx-hw,my+y,hw*2,1,'#ffeaa0');}c.globalAlpha=g; // จันทร์เพ็ญโผล่มุมขวาบนของการ์ด ไม่ไปจมอยู่ใต้แบนเนอร์
   px(c,0,h-5,w,5,'#1e4a78');const k=Math.floor(t/400);for(let i=0;i<Math.round(w/12);i++)px(c,(i*37+k*7)%w,h-4+(i%3),3,1,'#4a8ac8');},
  mk(i,w,h,init){if(i<3)return{k:'k',x:init?rr(0,w):-8,y:h-4-(i%2),vx:rr(2,4),ph:rr(0,6)};return{k:'l',x:rr(4,w-4),y:init?rr(0,h):h+4,vy:-rr(3,6),ph:rr(0,6)};},
  step(p,dt,w,h,t){if(p.k==='k'){p.x+=p.vx*dt;return p.x<w+8;}p.y+=p.vy*dt;p.x+=Math.sin(t/900+p.ph)*.12;return p.y>-8;},
  draw(c,p,t){const f=(t/220+p.ph|0)%2;if(p.k==='k'){px(c,p.x-3,p.y-1,7,2,'#3e7a3a');px(c,p.x-2,p.y-2,5,1,'#ffb0d0');px(c,p.x,p.y-4,1,2,'#f0e0a0');px(c,p.x,p.y-5-f,1,1,'#ffd040');return;}
   const g=c.globalAlpha;c.globalAlpha=g*.3;px(c,p.x-3,p.y-3,7,8,'#ffd060');c.globalAlpha=g;px(c,p.x-1,p.y-1,3,4,'#e0702a');px(c,p.x,p.y,1,2,f?'#ffe080':'#ffc060');}},
 xmas:{n:(w,h)=>Math.min(50,10+Math.round(w*h/260)),
  mk(i,w,h,init){if(i<3)return{k:'s',x:rr(3,w-3),y:rr(2,h*.4),ph:rr(0,6)};return{k:'f',x:rr(0,w),y:init?rr(0,h):-2,vy:rr(4,9),sz:Math.random()<.2?2:1,ph:rr(0,6)};},
  step(p,dt,w,h,t){if(p.k==='s')return true;p.y+=p.vy*dt;p.x+=Math.sin(t/800+p.ph)*.15;return p.y<h+2;},
  draw(c,p,t,top){if(p.k==='s'){const b=(t/400+p.ph|0)%4;if(b<2){px(c,p.x,p.y,1,1,'#ffe060');if(!b){px(c,p.x-1,p.y,1,1,'#ffe060');px(c,p.x+1,p.y,1,1,'#ffe060');px(c,p.x,p.y-1,1,1,'#ffe060');px(c,p.x,p.y+1,1,1,'#ffe060');}}return;}
   px(c,p.x,p.y,p.sz,p.sz,top?'#8ab8e0':'#eef6ff');}}, // ชั้นบนอยู่บนกระดาษสีอ่อน หิมะขาวจะมองไม่เห็น
 songkran:{n:(w,h)=>Math.min(40,10+Math.round(w*h/900)),
  mk(i,w,h,init){if(i<8)return{k:'p',x:rr(0,w),y:init?rr(0,h):-2,vy:rr(3,6),ph:rr(0,6),col:i%2?'#ff9ac0':'#ffd040'};
   const y0=rr(h*.1,h);return{k:'d',x:rr(0,w),y:y0,y0,vx:rr(-9,9),vy:-rr(16,30),wait:init?rr(0,3):rr(0,1.5)};},
  step(p,dt,w,h,t){if(p.k==='p'){p.y+=p.vy*dt;p.x+=Math.sin(t/600+p.ph)*.2;return p.y<h+2;}if(p.wait>0){p.wait-=dt;return true;}
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=26*dt;return p.y<Math.min(h+2,p.y0+12);},
  draw(c,p){if(p.k==='p'){px(c,p.x,p.y,2,1,p.col);return;}if(p.wait>0)return;px(c,p.x,p.y,1,2,'#9ad8ff');}}};
let FX=null;
function fxSize(){const cv=FX.cv,w=Math.max(1,Math.ceil(cv.clientWidth/FXS)),h=Math.max(1,Math.ceil(cv.clientHeight/FXS));if(w===FX.w&&h===FX.h)return;
 FX.w=cv.width=FX.top.width=w;FX.h=cv.height=FX.top.height=h;const K=FXK[FX.id],n=K.n(w,h);FX.P=[];for(let i=0;i<n;i++)FX.P.push(K.mk(i,w,h,true));}
function fxDraw(t,dt){const c=FX.cv.getContext('2d'),c2=FX.top.getContext('2d'),K=FXK[FX.id],w=FX.w,h=FX.h;c.clearRect(0,0,w,h);c2.clearRect(0,0,w,h);if(K.bg)K.bg(c,w,h,t);
 FX.P.forEach((p,i)=>{if(dt&&!K.step(p,dt,w,h,t))FX.P[i]=p=K.mk(i,w,h,false);K.draw(i%3===1?c2:c,p,t,i%3===1);});}
function fxFrame(now){if(!FX||!FX.run)return;if(!FX.cv.isConnected||document.hidden){FX.run=false;return;}
 {const cov=document.querySelector('#townGate,#metaDlg[open]');if(cov&&!cov.contains(FX.cv)){requestAnimationFrame(fxFrame);return;}}
 if(now-FX.last>=40){const dt=FX.last?Math.min(.1,(now-FX.last)/1000):0;FX.last=now;if(now-FX.chk>1000){FX.chk=now;fxSize();}fxDraw(now,dt);}
 requestAnimationFrame(fxFrame);}
function fxGo(){if(!FX)return;fxSize();if(RMQ){fxDraw(performance.now(),0);return;}if(FX.run)return;FX.run=true;FX.last=0;requestAnimationFrame(fxFrame);}
function fxSync(c,A,on){let cv=c.querySelector(':scope>canvas.fest-fx:not(.fest-fxt)'),top=c.querySelector(':scope>canvas.fest-fxt');
 if(!on||!FXK[A&&A.F.id]){if(cv)cv.remove();if(top)top.remove();c.classList.remove('fest-fxon');if(FX)FX.run=false;return;}
 const mk=k=>{const x=document.createElement('canvas');x.className=k;x.setAttribute('aria-hidden','true');c.insertBefore(x,c.firstChild);return x;};
 if(!cv)cv=mk('fest-fx');if(!top)top=mk('fest-fx fest-fxt');
 c.classList.add('fest-fxon');if(!FX||FX.cv!==cv||FX.top!==top||FX.id!==A.F.id){if(FX)FX.run=false;FX={cv,top,id:A.F.id,w:0,h:0,P:[],run:false,last:0,chk:0};}fxGo();}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&FX&&FX.cv.isConnected)fxGo();});

function banner(){const A=active();document.body.className=document.body.className.replace(/\bfest-\w+/g,'').trim();if(A)document.body.classList.add('fest-'+A.F.id);
 const c=document.getElementById('card');if(!c)return;const ex=c.querySelector('#festBan'),birth=!!(c.querySelector('#btnEnter')&&document.getElementById('inName'));
 fxSync(c,A,!!A&&birth);
 if(!A||!birth){if(ex)ex.remove();return;}
 const P=M.load(),m=st(P),e=m.ev[A.inst]||{},rc=m.last&&m.last.inst===A.inst&&Date.now()-m.last.t<6e5,L=rc?m.last.n:0,LB=rc?m.last.bx|0:0;
 const t=`${A.F.ic} เทศกาล${esc(A.F.n)}เปิดถึง ${dtxt(A.F.b)} · ${A.F.it} ${(e.item|0).toLocaleString()}${L?` <span class="mt-dim">(รอบที่แล้ว +${L}${LB?` รวมโบนัส${esc(A.F.bn||'')} ${LB}`:''})</span>`:''}`;
 if(ex){if(ex.dataset.t!==t){ex.dataset.t=t;ex.querySelector('.t').innerHTML=t;}return;}
 const b=document.createElement('button');b.type='button';b.id='festBan';b.className='fest-ban';b.style.setProperty('--fc',A.F.col);b.dataset.t=t;
 b.innerHTML=`<span class="t">${t}</span><span class="go">ดูร้าน ›</span>`;b.onclick=()=>M.open('fest');c.insertBefore(b,c.firstChild);}
function init(){css();regTab();banner();const c=document.getElementById('card');if(c)new MutationObserver(banner).observe(c,{childList:true});}

try{window.ACH&&window.ACH.add&&window.ACH.add([
 {id:'fest_join',n:'งานวัดเปิดแล้ว',d:'เก็บของเทศกาลได้เป็นครั้งแรก',icon:'🎪',tier:'bronze'},
 {id:'fest_coin_hw',n:'ฟักทองสีทอง',d:'ทำภารกิจฮาโลวีนครบจนได้เหรียญประจำปี',icon:'🎃',tier:'silver'},
 {id:'fest_wear',n:'แต่งตัวไปเที่ยวงาน',d:'จับคนในตระกูลใส่แฟชั่นเทศกาลครั้งแรก',icon:'👒',tier:'bronze'},
 {id:'fest_hw_q',n:'คืนปล่อยผี',d:'ทำภารกิจประจำงานฮาโลวีนครบทั้ง 3 ข้อ',icon:'👻',tier:'silver'},
 {id:'fest_hw_all',n:'ตู้เสื้อผ้าผีสิง',d:'มีแฟชั่นฮาโลวีนครบทุกชิ้น',icon:'🦇',tier:'gold'},
 {id:'fest_decor',n:'เมืองนี้มีงาน',d:'เอาของตกแต่งเทศกาลไปตั้งในเมือง',icon:'🏮',tier:'bronze'},
 {id:'fest_3',n:'ไม่พลาดสักงาน',d:'ร่วมเทศกาลมาแล้ว 3 ครั้ง',icon:'🎊',tier:'gold'},
 {id:'fest_coin_loy',n:'กระทงทองคำ',d:'ทำภารกิจลอยกระทงครบจนได้เหรียญประจำปี',icon:'🪷',tier:'silver'},
 {id:'fest_loy_all',n:'แต่งไทยไปงานวัด',d:'มีแฟชั่นลอยกระทงครบทุกชิ้น',icon:'🏵️',tier:'gold'},
 {id:'fest_coin_xm',n:'ดาวเหนือนำทาง',d:'ทำภารกิจคริสต์มาสและปีใหม่ครบจนได้เหรียญประจำปี',icon:'⭐',tier:'silver'},
 {id:'fest_xm_all',n:'ตู้เสื้อผ้าหน้าหนาว',d:'มีแฟชั่นคริสต์มาสและปีใหม่ครบทุกชิ้น',icon:'🧶',tier:'gold'},
 {id:'fest_coin_sk',n:'ขันเงินใบแรก',d:'ทำภารกิจสงกรานต์ครบจนได้เหรียญประจำปี',icon:'💦',tier:'silver'},
 {id:'fest_sk_all',n:'พร้อมลุยน้ำ',d:'มีแฟชั่นสงกรานต์ครบทุกชิ้น',icon:'🔫',tier:'gold'},
 {id:'fest_bonus',n:'ของแถมประจำงาน',d:'ได้โบนัสประจำเทศกาลตอนจบรอบเป็นครั้งแรก',icon:'🎁',tier:'bronze'},
 {id:'fest_theme',n:'รู้ธรรมเนียม',d:'ทำภารกิจประจำงานของเทศกาลไหนก็ได้ครบทุกข้อ',icon:'📿',tier:'silver'},
 {id:'fest_decor_set',n:'งานวัดหน้าบ้าน',d:'ตั้งของตกแต่งของเทศกาลเดียวกันในเมืองครบทุกแบบ',icon:'🏮',tier:'silver'},
 {id:'fest_coin_4',n:'ครบทุกงานในรอบปี',d:'มีเหรียญประจำปีของทั้ง 4 เทศกาล',icon:'🏅',tier:'gold'}]);}catch(e){}
window.FEST={active,list:()=>FESTS.slice(),
 force(id){FORCE=BY[id]?id:'';try{FORCE?sessionStorage.setItem(FK,FORCE):sessionStorage.removeItem(FK);}catch(e){}regTab();banner();M.refresh();return active();}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
