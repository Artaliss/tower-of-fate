// city.js — กระดานเควส (เควสรายวัน + เควสถาวรหลายขั้น), บริหารเมือง (อาคาร 9 หลัง + ส่งสมาชิกไปทำงาน + ความสุขสัตว์), ร้านของตกแต่ง
// API: window.CITY = { bonus(k), lv(id), busy(memberId), petMood(petId) 0-100, petMul(petId) 1.1/1/0.8, focus(bldId) }  bonus: 'train' ตัวคูณค่าฝึก (<1), 'gold' ตัวคูณเหรียญดันเจี้ยน, 'hp' ตัวคูณ HP ตี้, 'exp' ตัวคูณ EXP เควส, 'egg' โอกาสไข่
// ข้อมูลอยู่ใน META P.mod.city = {b:{id:lv}, decor:[key], c:{runs,wins,sec,hard,train,kills}, best:{f,b}, wc:[cls], q:{day,L:[...]}, perm:{id:ขั้นที่ส่งแล้ว}, n:ส่งเควสแล้ว, pick:id สมาชิกรับ EXP, sl:{m,p}, jobs:{bldId:[memberId]}, mood:{petId:0-100 ณ เวลา mt}, mt, tr:{petId:เวลาให้ขนม}, fg:ผลผลิตลานฝึกสัตว์เลี้ยง}
// ฟัง: META.onRun, 'tof:hard-clear' (hard.js ชนะด่าน), 'tof:train' (hard.js ฝึกสมาชิก)
(function(){
'use strict';
if(!window.META)return;
const M=window.META,esc=M.esc,C=()=>window.CONTENT||{},DECOR_MAX=16;
const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
const ach=id=>M.grantAch(id);
// ---------- อาคาร ----------
const BLD=[
 {id:'train',ic:'🥋',n:'ลานฝึก',c:300,d:l=>`ค่าฝึกสมาชิกถูกลง ${l*6}%`},
 {id:'market',ic:'🏪',n:'ตลาด',c:400,d:l=>`เหรียญเมืองจากการไต่หอและดันเจี้ยน +${l*8}%`},
 {id:'hosp',ic:'🏥',n:'โรงพยาบาล',c:350,d:l=>`HP ของตี้ในดันเจี้ยน +${l*5}%`},
 {id:'hatch',ic:'🥚',n:'โรงฟักไข่',c:450,d:l=>`เควสหายากให้ไข่ ${Math.round(eggP(l,1)*100)}% · เควสทั่วไป ${Math.round(eggP(l,0)*100)}%`},
 {id:'lib',ic:'📚',n:'หอสมุด',c:300,d:l=>`EXP จากเควส +${l*12}%`},
 {id:'inn',ic:'🏨',n:'บ้านพัก',c:350,d:l=>`เพิ่มช่องในตระกูลแล้วได้เหรียญคืน ${l*8}%`},
 {id:'pen',ic:'🐾',n:'ลานฝึกสัตว์เลี้ยง',c:300,d:l=>`สัตว์เลี้ยงเครียดช้าลง ${l*10}% · คนประจำลานเก็บผลผลิตได้วันละ 🪙 ${20+10*l} ต่อหัว`},
 {id:'scout',ic:'🏹',n:'หน่วยลาดตระเวน',c:350,d:l=>`ส่งเควสแล้วมีโอกาส ${l*6}% ได้ของตกแต่งแถม`},
 {id:'gate',ic:'🏯',n:'ประตูเมือง',c:400,d:l=>`HP ของตี้ในดันเจี้ยน +${l*2}%`}];
const BMAX=5,BMUL=[1,2.5,5,9,15];
// ---------- งานในเมือง: ส่งสมาชิกไปประจำอาคาร อาชีพตรงงานได้ 1 หน่วย ไม่ตรงได้ครึ่ง ----------
const GATE_T={dra:'HP ตี้ +4%',dsl:'เหรียญจากดันเจี้ยน +4%',nec:'EXP เควส +6%',ang:'สัตว์เลี้ยงเครียดช้าลง 15%'};
const JOB={train:{c:['war'],t:u=>`ค่าฝึกถูกลงอีก ${Math.round(u*4)}%`},market:{c:['rog'],t:u=>`เหรียญเพิ่มอีก ${Math.round(u*5)}%`},
 hosp:{c:['pri'],t:u=>`HP ตี้เพิ่มอีก ${Math.round(u*4)}%`},lib:{c:['mag'],t:u=>`EXP เควสเพิ่มอีก ${Math.round(u*8)}%`},
 pen:{c:['far'],t:u=>`สัตว์อารมณ์ดีขึ้นวันละ ${Math.round(u*14)} · ผลผลิตเหรียญ`},scout:{c:['arc'],t:u=>`โอกาสได้ไข่และของแถมจากเควส +${Math.round(u*4)}%`},
 gate:{c:Object.keys(GATE_T),t:()=>'บัฟตามอาชีพของยาม'}};
const JK=Object.keys(JOB);
const jSlots=l=>l>=3?2:l>=1?1:0;
const bCost=(b,l)=>Math.round(b.c*BMUL[l]);
const eggP=(l,rare)=>rare?.4+.11*l:.03*l;
// ---------- ของตกแต่ง (ชื่อจริงดึงจาก TOWN.DECOR ถ้ามี) ----------
const DEC={fountain:{n:'น้ำพุ',ic:'⛲',g:900},lamp:{n:'โคมไฟถนน',ic:'🏮',g:200},tree:{n:'ต้นไม้',ic:'🌳',g:250},flag:{n:'เสาธงตระกูล',ic:'🚩',g:300},
 bench:{n:'ม้านั่ง',ic:'🪑',g:200},well:{n:'บ่อน้ำ',ic:'🪣',g:500},garden:{n:'แปลงดอกไม้',ic:'🌷',g:400},banner:{n:'ป้ายผ้าตระกูล',ic:'🎏',g:350}};
const DK=Object.keys(DEC);
const dName=k=>{try{const T=window.TOWN&&window.TOWN.DECOR&&window.TOWN.DECOR[k];if(T&&T.n)return T.n;}catch(e){}return(DEC[k]||{n:k}).n;};
// ---------- สัตว์พิเศษจากเควส ----------
const EGG={fairy:'ภูตน้อย',unicorn:'ยูนิคอร์น'};
const petN=k=>((C().PETS||{})[k]||{}).n||EGG[k]||k;
// ---------- สถานะ ----------
function st(P){let s=P.mod.city;if(!isObj(s))s=P.mod.city={};
 if(!isObj(s.b))s.b={};if(!Array.isArray(s.decor))s.decor=[];if(!isObj(s.perm))s.perm={};if(!Array.isArray(s.wc))s.wc=[];
 if(!isObj(s.c)){ // ครั้งแรก: นับย้อนจากทะเบียนตระกูลที่มีอยู่แล้ว
  const R=P.roster||[];s.c={runs:P.runs|0,wins:P.wins|0,sec:R.filter(m=>m.sec==='f'||m.sec==='s').length,hard:0,train:0,kills:0};
  s.best={f:R.reduce((a,m)=>Math.max(a,m.floor|0),0),b:0};R.forEach(m=>{if(m.kind==='hero'&&m.won&&m.cls&&!s.wc.includes(m.cls))s.wc.push(m.cls);});}
 if(!isObj(s.best))s.best={f:0,b:0};if(!isObj(s.sl))s.sl={m:P.slots.m,p:P.slots.p};s.n=s.n|0;
 if(!isObj(s.jobs))s.jobs={};if(!isObj(s.mood))s.mood={};if(!isObj(s.tr))s.tr={};if(!s.mt)s.mt=Date.now();s.fg=+s.fg||0;
 // คนที่ออกจากตระกูลไปแล้วหลุดจากงานเอง
 const ids=new Set((P.roster||[]).map(m=>m.id));JK.forEach(b=>{s.jobs[b]=(Array.isArray(s.jobs[b])?s.jobs[b]:[]).filter(id=>ids.has(id)).slice(0,jSlots(s.b[b]|0));});return s;}
const lvOf=(P,id)=>Math.max(0,Math.min(BMAX,(st(P).b[id]|0)));
const mem=(P,id)=>(P.roster||[]).find(m=>m.id===id);
const workers=(P,b)=>(st(P).jobs[b]||[]).map(id=>mem(P,id)).filter(Boolean);
const fits=(b,m)=>JOB[b].c.includes(m.cls);
const units=(P,b)=>workers(P,b).reduce((a,m)=>a+(fits(b,m)?1:.5),0);
const gateN=(P,c)=>workers(P,'gate').filter(m=>m.cls===c).length;
function bon(P,k){const L=id=>lvOf(P,id),U=b=>units(P,b),G=c=>gateN(P,c);
 switch(k){case'train':return Math.max(.4,1-.06*L('train')-.04*U('train'));case'gold':return 1+.08*L('market')+.05*U('market')+.04*G('dsl');
  case'hp':return 1+.05*L('hosp')+.04*U('hosp')+.02*L('gate')+.04*G('dra')+.02*workers(P,'gate').filter(m=>!fits('gate',m)).length;
  case'exp':return 1+.12*L('lib')+.08*U('lib')+.06*G('nec');case'egg':return eggP(L('hatch'),1)+.04*U('scout');default:return 1;}}
function bonus(k){return bon(M.load(),k);}
const busy=id=>{const s=st(M.load());return JK.some(b=>(s.jobs[b]||[]).includes(id));};
// ---------- ความสุขสัตว์: ค่า mood เก็บพร้อมเวลา s.mt แล้วคิดต่อตามเวลาจริง ----------
const MOOD0=70;
function moodRate(P){const s=st(P),l=lvOf(P,'pen');return units(P,'pen')*14-15*(1-.1*l)*(gateN(P,'ang')?.85:1);} // ต่อวัน
function moodAt(P,id){const s=st(P),v=s.mood[id]==null?MOOD0:+s.mood[id];return Math.max(0,Math.min(100,v+moodRate(P)*(Date.now()-s.mt)/864e5));}
// บันทึกค่าปัจจุบันลงเซฟ เรียกก่อนเปลี่ยนคนประจำลานหรือแก้ค่า mood
function tick(P){const s=st(P),now=Date.now(),dt=Math.max(0,(now-s.mt)/864e5),l=lvOf(P,'pen'),u=units(P,'pen');
 P.pets.forEach(p=>{s.mood[p.id]=Math.round(moodAt(P,p.id)*10)/10;});Object.keys(s.mood).forEach(k=>{if(!P.pets.some(p=>p.id===k))delete s.mood[k];});
 if(u)s.fg=Math.min(s.fg+u*(20+10*l)*dt,u*(20+10*l)*3);s.mt=now;
 if(P.pets.length&&workers(P,'pen').some(m=>m.cls==='far')&&P.pets.every(p=>s.mood[p.id]>=70))ach('city_farm');}
const petMood=id=>Math.round(moodAt(M.load(),id));
const petMul=id=>{const v=petMood(id);return v>=70?1.1:v<35?.8:1;};
const face=v=>v>=80?'😄':v>=55?'🙂':v>=35?'😐':'😣';
// ---------- เควสรายวัน ----------
const today=()=>{const d=new Date();return`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;};
function rngOf(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);
 return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const RUN1={floor:1,boss:1,kills:1,wincls:1}; // นับผลดีที่สุดในรอบเดียว ที่เหลือนับสะสมหลังติดประกาศ
const CNT={runs:'runs',sec:'sec',hard:'hard',train:'train'};
const BASE_CLS=['war','mag','arc','pri','rog','far'];
const clsN=id=>M.clsN(id)||id;
function mkQ(k,r,s){const pk=a=>a[Math.floor(r()*a.length)];let q={k,a:1,p:0,rw:{g:0,x:0}};
 if(k==='floor'){q.a=pk([20,30,40,50,60,70]);q.rw={g:40+q.a*2,x:40+q.a};}
 else if(k==='boss'){q.a=pk([2,3,4,5,6]);q.rw={g:50+q.a*30,x:30+q.a*15};}
 else if(k==='kills'){q.a=pk([15,25,35,45]);q.rw={g:60+q.a*2,x:30+q.a};}
 else if(k==='runs'){q.a=pk([2,3]);q.rw={g:60*q.a,x:30*q.a};}
 else if(k==='wincls'){q.cls=pk(BASE_CLS);q.rw={g:500,x:200,egg:1};}
 else if(k==='sec'){q.rw={g:600,x:250,egg:1};}
 else if(k==='hard'){q.a=pk([1,2,3]);q.rw={g:150*q.a,x:80*q.a};}
 else if(k==='train'){q.a=pk([2,3,5]);q.rw={g:60*q.a,x:20*q.a};}
 if(CNT[k])q.b=s.c[CNT[k]]|0;return q;}
function daily(P,s){const day=today();if(s.q&&s.q.day===day&&Array.isArray(s.q.L))return s.q.L;
 const r=rngOf('tof-quest|'+day),pool=['floor','boss','kills','runs'];if(P.wins>0)pool.push('wincls','sec');if(P.unlock.hard)pool.push('hard','train');
 const n=3+(r()<.6)+(r()<.3),L=[],used={};
 for(let i=0;i<40&&L.length<n;i++){const k=pool[Math.floor(r()*pool.length)];if(used[k])continue;used[k]=1;L.push(mkQ(k,r,s));}
 L[Math.floor(r()*L.length)].rw.d=DK[Math.floor(r()*DK.length)];L.forEach((q,i)=>q.i=i);
 s.q={day,L};return L;}
const qProg=(q,s)=>RUN1[q.k]?q.p|0:Math.max(0,(s.c[CNT[q.k]]|0)-(q.b|0));
const QT={
 floor:q=>['ขอคนไปดูวิวชั้นบน',`ไต่ให้ถึงชั้น ${q.a} ภายในรอบเดียว`],
 boss:q=>['ค่าหัวบอส',`ล้มบอสให้ได้ ${q.a} ตัวในรอบเดียว`],
 kills:q=>['มอนป่วนหมู่บ้าน',`ปราบมอนสเตอร์ ${q.a} ตัวในรอบเดียว`],
 runs:q=>['ฝากจดหมายขึ้นหอ',`ไต่หอให้จบ ${q.a} รอบ`],
 wincls:q=>[`ตามหา${clsN(q.cls)}ฝีมือดี`,`พิชิตยอดหอด้วยอาชีพ${clsN(q.cls)}`],
 sec:()=>['ข่าวลือเรื่องมังกร','ผ่านชั้นลับเหนือยอดหอให้ได้'],
 hard:q=>['กวาดดันเจี้ยน',`ชนะด่านโหมดยาก ${q.a} ครั้ง`],
 train:q=>['ครูฝึกขาดลูกมือ',`ฝึกสมาชิกตระกูล ${q.a} ครั้ง`]};
// ---------- เควสถาวรหลายขั้น ----------
const PERM=[
 {id:'top',ic:'🗼',n:'เส้นทางสู่ยอดหอ',m:s=>s.best.f,st:[30,60,100],d:a=>`ไต่ถึงชั้น ${a}`,rw:[{g:150,x:80},{g:300,x:150},{g:800,x:300,d:'fountain'}]},
 {id:'boss',ic:'💀',n:'นักล่าบอส',m:s=>s.best.b,st:[3,6,9],d:a=>`ล้มบอส ${a} ตัวในรอบเดียว`,rw:[{g:150,x:80},{g:300,x:150},{g:600,x:250,d:'banner'}]},
 {id:'cls',ic:'🎭',n:'ตำนานหลายอาชีพ',m:s=>s.wc.length,st:[1,3,6],d:a=>`พิชิตยอดหอด้วยอาชีพต่างกัน ${a} อาชีพ`,rw:[{g:300,x:150},{g:700,x:300},{g:1500,x:500,egg:2}]},
 {id:'sec',ic:'🐉',n:'ผู้เผชิญมังกร',m:s=>s.c.sec,st:[1,3],d:a=>`ผ่านชั้นลับ ${a} ครั้ง`,rw:[{g:500,x:200},{g:1200,x:400,egg:2}]},
 {id:'runs',ic:'🥾',n:'ตระกูลนักเดินทาง',m:s=>s.c.runs,st:[5,20,50],d:a=>`ไต่หอจบ ${a} รอบ`,rw:[{g:100,x:60,d:'lamp'},{g:300,x:120,d:'tree'},{g:700,x:250,d:'well'}]},
 {id:'hard',ic:'⚔',n:'นักบุกดันเจี้ยน',hard:1,m:s=>s.c.hard,st:[1,5,15],d:a=>`ชนะด่านโหมดยาก ${a} ครั้ง`,rw:[{g:200,x:100},{g:500,x:250},{g:1200,x:500,egg:2}]},
 {id:'train',ic:'🏋',n:'สำนักฝึกตน',hard:1,m:s=>s.c.train,st:[3,10,30],d:a=>`ฝึกสมาชิก ${a} ครั้ง`,rw:[{g:100,x:60},{g:300,x:120,d:'bench'},{g:700,x:250,d:'garden'}]}];
// ---------- รางวัล ----------
// EXP ก้อนเดียวกับลานฝึก/ดันเจี้ยน (P.mod.hard.xp, เลเวลละ lv×10) จะได้ไม่มีหลอด EXP สองหลอด
const xpOf=(P,m)=>{const h=P.mod.hard=isObj(P.mod.hard)?P.mod.hard:{};if(!isObj(h.xp))h.xp={};if(m.xp){h.xp[m.id]=(h.xp[m.id]|0)+(m.xp|0);delete m.xp;}return h.xp;};
function giveXp(P,m,x){const X=xpOf(P,m);X[m.id]=(X[m.id]|0)+x;let up=0;while(X[m.id]>=Math.max(10,(m.lv|0)*10)){X[m.id]-=Math.max(10,(m.lv|0)*10);m.lv=(m.lv|0)+1;up++;
 m.hp=Math.round(m.hp*1.08);m.atk=Math.round(m.atk*1.06);m.def=Math.round(m.def*1.06);}return up;}
function giveEgg(P){if(P.pets.length>=P.slots.p)return'';const own=k=>P.pets.some(p=>p.k===k);
 const ks=Object.keys(EGG).filter(k=>!own(k)),k=(ks.length?ks:Object.keys(EGG))[Math.floor(Math.random()*(ks.length||2))];
 P.pets.push({id:M.uid(),k,from:'เควส',legend:true,t:Date.now()});ach('city_egg');if(['unicorn','fairy','phoenix','griffin'].every(x=>own(x)))ach('leg_all');return k;}
// รับรางวัล rw = {g,x,d,egg} egg 1 = ลุ้นตามโรงฟักไข่, 2 = ได้แน่
function pay(P,s,rw){const out=[];if(rw.g){P.gold+=rw.g;P.goldAll+=rw.g;out.push(`🪙 ${rw.g}`);}
 if(rw.x){const m=P.roster.find(m=>m.id===s.pick)||P.roster.find(m=>m.id===P.head)||P.roster[0];
  if(m){const x=Math.round(rw.x*bon(P,'exp')),up=giveXp(P,m,x);out.push(`${m.name} ได้ EXP ${x}${up?` เลเวลขึ้นเป็น ${m.lv}`:''}`);}}
 if(rw.d){if(s.decor.length<DECOR_MAX){s.decor.push(rw.d);out.push(`ได้${dName(rw.d)}ไปตั้งในเมือง`);decorAch(s);}else{P.gold+=150;P.goldAll+=150;out.push(`ที่ในเมืองเต็ม เลยได้ 🪙 150 แทน${dName(rw.d)}`);}}
 // หน่วยลาดตระเวน: ของตกแต่งแถม
 const us=units(P,'scout'),sc=lvOf(P,'scout')*.06+us*.04;if(sc>0&&Math.random()<sc&&s.decor.length<DECOR_MAX){const k=DK[Math.floor(Math.random()*DK.length)];s.decor.push(k);out.push(`🏹 หน่วยลาดตระเวนเก็บ${dName(k)}กลับมาด้วย`);decorAch(s);}
 const lh=lvOf(P,'hatch'),ch=rw.egg===2?1:rw.egg?bon(P,'egg'):eggP(lh,0)+us*.015;
 if(ch>0&&Math.random()<ch){const k=giveEgg(P);if(k)out.push(`✨ ได้ไข่${petN(k)}! ฟักแล้วไปอยู่ในตระกูล`);else if(rw.egg){P.gold+=300;P.goldAll+=300;out.push('ได้ไข่สัตว์พิเศษ แต่ช่องสัตว์เลี้ยงเต็ม เลยขายได้ 🪙 300');}}
 s.n++;ach('city_q1');if(s.n>=10)ach('city_q10');if(s.n>=50)ach('city_q50');return out.join(' · ');}
function decorAch(s){if(DK.every(k=>s.decor.includes(k)))ach('city_decor8');}
// บ้านพัก: คืนเหรียญส่วนต่างเมื่อเห็นว่ามีการเพิ่มช่องในตระกูล (ราคาเดียวกับ meta.js)
function syncSlots(){const P=M.load(),s=st(P),l=lvOf(P,'inn');let ref=0;
 for(let i=s.sl.m;i<P.slots.m;i++)ref+=600+(i-10)*300;for(let i=s.sl.p;i<P.slots.p;i++)ref+=800+(i-5)*800;
 const ch=s.sl.m!==P.slots.m||s.sl.p!==P.slots.p;if(!ch)return;s.sl={m:P.slots.m,p:P.slots.p};ref=Math.round(ref*.08*l);
 if(ref>0){P.gold+=ref;P.goldAll+=ref;flash=`🏨 บ้านพักคืนเหรียญให้ ${ref}`;}M.save(P);M.refresh();}
// capture: ปุ่มถูกวาดใหม่ทันทีที่กด ถ้ารอ bubble ปุ่มจะหลุดจาก #metaDlg ไปแล้ว
document.addEventListener('click',e=>{if(e.target&&e.target.closest&&e.target.closest('#metaDlg [data-slot]'))setTimeout(syncSlots,0);},true);
// ---------- ติดตามผล ----------
function upd(f){const P=M.load(),s=st(P);f(P,s);M.save(P);M.refresh();}
M.onRun(R=>upd((P,s)=>{const fl=R.won?100:(R.floor|0),bo=R.bosses|0,ki=R.kills|0,sec=!!(R.won&&R.sec&&(R.sec.res==='f'||R.sec.res==='s'));
 const cid=((C().CLASSES||[])[R.h.cls]||{}).id||'';
 // upd สร้าง s.c ครั้งแรกจาก P.runs/ทะเบียนที่นับรอบนี้ไปแล้ว ไม่ต้องบวกซ้ำ
 const fresh=(s.c.runs|0)>=(P.runs|0);
 if(!fresh){s.c.runs++;if(R.won)s.c.wins++;if(sec)s.c.sec++;}s.c.kills+=ki;if(R.won&&cid&&!s.wc.includes(cid))s.wc.push(cid);
 s.best.f=Math.max(s.best.f,fl);s.best.b=Math.max(s.best.b,bo);
 daily(P,s).forEach(q=>{if(q.k==='floor')q.p=Math.max(q.p|0,fl);else if(q.k==='boss')q.p=Math.max(q.p|0,bo);else if(q.k==='kills')q.p=Math.max(q.p|0,ki);else if(q.k==='wincls'&&R.won&&cid===q.cls)q.p=1;});
 // ตลาด: เหรียญเมืองตอนจบรอบเพิ่มตามเลเวล
 const gm=bon(P,'gold')-1;if(gm>0&&P.last&&P.last.g){const x=Math.round(P.last.g*gm);P.gold+=x;P.goldAll+=x;P.last.cx=x;}}));
// ลงดันเจี้ยนแล้วสัตว์เหนื่อย: ถ้า hard.js ส่ง detail.pets มาจะลดเฉพาะตัวนั้น ไม่งั้นลดทุกตัวเล็กน้อย
window.addEventListener('tof:hard-clear',e=>upd((P,s)=>{s.c.hard++;tick(P);const d=(e&&e.detail)||{},L=Array.isArray(d.pets)?d.pets:null;
 P.pets.forEach(p=>{if(!L||L.includes(p.id))s.mood[p.id]=Math.max(0,s.mood[p.id]-(L?10:5));});}));
window.addEventListener('tof:train',()=>upd((P,s)=>{s.c.train++;}));
// ---------- หน้าตา ----------
let flash='';
(function css(){const el=document.createElement('style');el.textContent=`
.cq-board{background:repeating-linear-gradient(0deg,#5a3d22 0 22px,#4d331c 22px 24px);border:3px solid #2e1e10;border-radius:8px;padding:12px 10px;margin:8px 0 12px;box-shadow:inset 0 0 18px rgba(0,0,0,.45)}
.cq-board h4{margin:0 0 8px;color:#f6e3b8;font-size:14px;text-shadow:0 1px 0 #000}
.cq-notes{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr));gap:10px}
.cq-note{position:relative;background:#f3e6c4;color:#2b2013;border-radius:3px;padding:14px 10px 10px;box-shadow:2px 3px 0 rgba(0,0,0,.35);font-size:13px;transform:rotate(var(--r,0deg))}
.cq-note::before{content:'';position:absolute;top:4px;left:50%;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:#c4402f;box-shadow:0 1px 0 #6b1d14}
.cq-note.ok{background:#dfeec4}.cq-note.done{opacity:.55}.cq-note b{display:block;font-size:13.5px;margin-bottom:2px}
.cq-note .rare{color:#8a3fb8;font-size:11.5px}
.cq-bar{height:6px;background:rgba(0,0,0,.15);border-radius:3px;margin:6px 0 4px;overflow:hidden}.cq-bar i{display:block;height:100%;background:#4f8a3a}
.cq-rw{font-size:12px;color:#5a4630}.cq-note .mt-btn{border-color:#5a4630;color:#2b2013}.cq-note .mt-btn.pri{background:#4f8a3a;color:#fff}
.cq-flash{border:1px solid var(--gold,#f4bb4a);border-radius:6px;padding:7px 9px;margin:6px 0;font-size:13px}
.cq-pick{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:13px}.cq-pick select{max-width:100%;font:inherit;padding:3px;background:var(--bg,#0e1513);color:inherit;border:1px solid var(--line,#2c3a36);border-radius:5px}
.cq-job{border-top:1px dashed var(--line,#2c3a36);margin-top:6px;padding-top:5px}.cq-w{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px;font-size:12.5px}
.cq-w select{flex:1 1 120px;min-width:0;font:inherit;font-size:12.5px;padding:3px;background:var(--bg,#0e1513);color:inherit;border:1px solid var(--line,#2c3a36);border-radius:5px}
.mt-card.cq-hi{border-color:var(--gold,#f4bb4a);box-shadow:0 0 0 2px var(--gold,#f4bb4a)}
.cq-lv{display:inline-flex;gap:2px;margin-left:4px}.cq-lv i{width:8px;height:8px;border-radius:2px;background:var(--line,#2c3a36)}.cq-lv i.on{background:var(--gold,#f4bb4a)}`;document.head.appendChild(el);})();
function rwTxt(rw,P){const a=[];if(rw.g)a.push(`🪙 ${rw.g}`);if(rw.x)a.push(`EXP ${Math.round(rw.x*bon(P,'exp'))}`);if(rw.d)a.push(`${(DEC[rw.d]||{}).ic||'🎁'} ${dName(rw.d)}`);if(rw.egg===2)a.push('🥚 ไข่สัตว์พิเศษ');return a.join(' · ');}
const tilt=i=>`--r:${[-1.5,1,-.5,1.5,-1,.5][i%6]}deg`;
function noteHTML(q,s,P){const[t,d]=QT[q.k](q),pr=Math.min(q.a,qProg(q,s)),ok=pr>=q.a;
 return`<div class="cq-note${q.ok?' done':ok?' ok':''}" style="${tilt(q.i)}"><b>${esc(t)}</b>${esc(d)}${q.rw.egg?'<div class="rare">✦ เควสหายาก ลุ้นไข่สัตว์พิเศษ</div>':''}
 <div class="cq-bar"><i style="width:${Math.round(pr/q.a*100)}%"></i></div><div class="cq-rw">${pr}/${q.a} · ${rwTxt(q.rw,P)}</div>
 ${q.ok?'<div class="cq-rw">ส่งแล้ว ✓</div>':`<button class="mt-btn pri" data-qd="${q.i}" ${ok?'':'disabled'}>ส่งเควส</button>`}</div>`;}
function permHTML(Q,s,P){const i=s.perm[Q.id]|0,fin=i>=Q.st.length,a=Q.st[Math.min(i,Q.st.length-1)],v=Q.m(s)|0,ok=!fin&&v>=a;
 return`<div class="cq-note${fin?' done':ok?' ok':''}" style="${tilt(i+Q.id.length)}"><b>${Q.ic} ${esc(Q.n)} <span class="cq-rw">ขั้น ${Math.min(i+1,Q.st.length)}/${Q.st.length}</span></b>${fin?'ทำครบทุกขั้นแล้ว':esc(Q.d(a))}
 ${fin?'':`<div class="cq-bar"><i style="width:${Math.min(100,Math.round(v/a*100))}%"></i></div><div class="cq-rw">${Math.min(v,a)}/${a} · ${rwTxt(Q.rw[i],P)}</div><button class="mt-btn pri" data-qp="${Q.id}" ${ok?'':'disabled'}>ส่งเควส</button>`}</div>`;}
M.tab('quest',{n:'📜 กระดานเควส',o:20,render(el,P){const s=st(P),L=daily(P,s);M.save(P);
 const ros=P.roster,pick=ros.some(m=>m.id===s.pick)?s.pick:(P.head||(ros[0]||{}).id||'');
 const perms=PERM.filter(Q=>!Q.hard||P.unlock.hard);
 el.innerHTML=`<p class="mt-dim">ใบประกาศเปลี่ยนทุกเที่ยงคืน ผลจากรอบที่ไต่จบหลังติดประกาศถึงจะนับ ทำเสร็จแล้วกดส่งเพื่อรับรางวัล</p>
 ${flash?`<div class="cq-flash">${esc(flash)}</div>`:''}
 <div class="cq-pick">EXP จากเควสเข้าตัว: ${ros.length?`<select id="cqPick">${ros.map(m=>`<option value="${m.id}" ${m.id===pick?'selected':''}>${esc(m.name)} Lv.${m.lv} (EXP ${xpOf(P,m)[m.id]|0}/${Math.max(10,(m.lv|0)*10)})</option>`).join('')}</select>`:'<span class="mt-dim">ยังไม่มีสมาชิก EXP จะหายไปเปล่าๆ</span>'}</div>
 <div class="cq-board"><h4>📌 ประกาศวันนี้</h4><div class="cq-notes">${L.map(q=>noteHTML(q,s,P)).join('')}</div></div>
 <div class="cq-board"><h4>📜 งานใหญ่ของตระกูล</h4><div class="cq-notes">${perms.map(Q=>permHTML(Q,s,P)).join('')}</div></div>`;
 flash='';
 const sel=el.querySelector('#cqPick');if(sel)sel.onchange=()=>upd((Q,s)=>{s.pick=sel.value;});
 el.querySelectorAll('[data-qd]').forEach(b=>b.onclick=()=>upd((Q,s)=>{const q=daily(Q,s)[+b.dataset.qd];if(!q||q.ok||qProg(q,s)<q.a)return;s.pick=sel?sel.value:pick;q.ok=1;flash='ส่งเควสแล้ว: '+pay(Q,s,q.rw);}));
 el.querySelectorAll('[data-qp]').forEach(b=>b.onclick=()=>upd((Q,s)=>{const D=PERM.find(x=>x.id===b.dataset.qp),i=s.perm[D.id]|0;if(i>=D.st.length||(D.m(s)|0)<D.st[i])return;
  s.pick=sel?sel.value:pick;s.perm[D.id]=i+1;flash='ส่งเควสแล้ว: '+pay(Q,s,D.rw[i]);}));}});
function jobHTML(b,P,s){const J=JOB[b.id];if(!J)return'';const l=lvOf(P,b.id),n=jSlots(l),W=workers(P,b.id),u=units(P,b.id);
 const fitN=J.c.map(c=>clsN(c)).join(' / ');
 let h=`<div class="cq-job"><div class="mt-dim">👷 คนประจำ ${W.length}/${n} · เหมาะกับ${esc(fitN)}</div>`;
 h+=W.map(m=>`<div class="cq-w"><span>${fits(b.id,m)?'⭐':'·'} ${esc(m.name)} <span class="mt-dim">${esc(clsN(m.cls))}</span>${b.id==='gate'&&GATE_T[m.cls]?` <span class="mt-dim">(${esc(GATE_T[m.cls])})</span>`:''}</span><button class="mt-btn" data-off="${b.id}|${m.id}">เรียกกลับ</button></div>`).join('');
 if(u&&b.id!=='gate')h+=`<div class="mt-dim">ตอนนี้: ${esc(J.t(u))}</div>`;
 if(!l)h+='<div class="mt-dim">สร้างอาคารก่อนถึงจะส่งคนมาได้</div>';
 else if(W.length<n){const free=P.roster.filter(m=>!JK.some(k=>(s.jobs[k]||[]).includes(m.id))).sort((x,y)=>fits(b.id,y)-fits(b.id,x));
  h+=free.length?`<div class="cq-w"><select data-js="${b.id}">${free.map(m=>`<option value="${m.id}">${fits(b.id,m)?'⭐ ':''}${esc(m.name)} (${esc(clsN(m.cls)||'ลูกจ้าง')})</option>`).join('')}</select><button class="mt-btn pri" data-on="${b.id}">ส่งไปทำงาน</button></div>`:'<div class="mt-dim">ไม่มีสมาชิกว่างแล้ว</div>';}
 else if(n<2)h+='<div class="mt-dim">ขยายถึงเลเวล 3 รับเพิ่มได้อีกคน</div>';
 return h+'</div>';}
function petHTML(P,s){const ok=Date.now();if(!P.pets.length)return'<p class="mt-dim">ยังไม่มีสัตว์เลี้ยงในตระกูล</p>';
 const r=moodRate(P);return`<p class="mt-dim">สัตว์เลี้ยงเครียดลงเรื่อยๆ ทุกวัน และเหนื่อยทุกครั้งที่ลงดันเจี้ยน ตัวที่อารมณ์ดีจะสู้เก่งขึ้น 10% ตัวที่เครียดจะอ่อนลง 20% ${r>=0?'ตอนนี้คนในลานดูแลทัน อารมณ์สัตว์ดีขึ้นทุกวัน':'ส่งคนไปประจำลานฝึกสัตว์เลี้ยงช่วยได้ ชาวไร่ดูแลเก่งที่สุด'}</p>
 <div class="mt-grid">${P.pets.map(p=>{const v=Math.round(moodAt(P,p.id)),cd=(s.tr[p.id]||0)+TREAT_CD-ok;return`<div class="mt-card"><b>${face(v)} ${p.legend?'✨ ':''}${esc(petN(p.k))}</b>
  <div class="cq-bar"><i style="width:${v}%;background:${v>=70?'#4f8a3a':v>=35?'#c9a23a':'#b8452f'}"></i></div><div class="mt-dim">อารมณ์ ${v}/100${v>=70?' · ร่าเริง สู้เก่งขึ้น':v<35?' · เครียด สู้แย่ลง':''}</div>
  <button class="mt-btn" data-pet="${p.id}" ${cd>0||P.gold<TREAT_G?'disabled':''}>${cd>0?`อิ่มแล้ว อีก ${Math.ceil(cd/36e5)} ชม.`:`เล่นด้วยและให้ขนม (🪙 ${TREAT_G})`}</button></div>`;}).join('')}</div>`;}
const TREAT_G=30,TREAT_CD=4*36e5,TREAT_UP=20;
M.tab('city',{n:'🏗 บริหารเมือง',o:30,lock:P=>P.unlock.city?'':'ผ่านชั้น 100 ก่อน เมืองถึงจะเปิด',render(el,P){const s=st(P),cnt=k=>s.decor.filter(x=>x===k).length,full=s.decor.length>=DECOR_MAX;
 tick(P);M.save(P);const fg=Math.floor(s.fg);
 el.innerHTML=`${flash?`<div class="cq-flash">${esc(flash)}</div>`:''}<p class="mt-dim">ใช้เหรียญเมืองสร้างและขยายอาคาร หลังละไม่เกินเลเวล ${BMAX} ส่งสมาชิกไปประจำอาคารได้ คนที่อาชีพตรงงาน (⭐) ได้บัฟเต็ม คนอื่นได้ครึ่งเดียว คนที่ทำงานอยู่ลงดันเจี้ยนไม่ได้</p>
 <div class="mt-grid">${BLD.map(b=>{const l=lvOf(P,b.id),mx=l>=BMAX,c=mx?0:bCost(b,l);return`<div class="mt-card" data-bld="${b.id}"><b>${b.ic} ${esc(b.n)}</b><span class="cq-lv">${[1,2,3,4,5].map(i=>`<i class="${i<=l?'on':''}"></i>`).join('')}</span>
  <div class="mt-dim">${l?esc(b.d(l)):'ยังไม่ได้สร้าง'}</div>${mx?'<div class="mt-dim">เลเวลสูงสุดแล้ว</div>':`<div class="mt-dim">เลเวลถัดไป: ${esc(b.d(l+1))}</div><button class="mt-btn pri" data-up="${b.id}" ${P.gold<c?'disabled':''}>${l?'ขยาย':'สร้าง'} (🪙 ${c})</button>`}
  ${b.id==='pen'&&fg>0?`<button class="mt-btn" data-fg="1">เก็บผลผลิต (🪙 ${fg})</button>`:''}${jobHTML(b,P,s)}</div>`;}).join('')}</div>
 <h3>🐾 สัตว์เลี้ยงในลาน</h3>${petHTML(P,s)}
 <h3>🛒 ร้านของตกแต่ง <span class="mt-dim">ในเมือง ${s.decor.length}/${DECOR_MAX} ชิ้น</span></h3><p class="mt-dim">ซื้อซ้ำได้ ของจะไปตั้งอยู่ในลานเมือง เก็บออกแล้วได้เหรียญคืนครึ่งราคา</p>
 <div class="mt-grid">${DK.map(k=>{const D=DEC[k],n=cnt(k);return`<div class="mt-card"><b>${D.ic} ${esc(dName(k))}</b><div class="mt-dim">มีอยู่ ${n} ชิ้น</div>
  <button class="mt-btn pri" data-buy="${k}" ${full||P.gold<D.g?'disabled':''}>ซื้อ (🪙 ${D.g})</button>${n?`<button class="mt-btn" data-rm="${k}">เก็บออก</button>`:''}</div>`;}).join('')}</div>`;
 flash='';
 el.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>upd((Q,s)=>{const B=BLD.find(x=>x.id===b.dataset.up),l=lvOf(Q,B.id);if(l>=BMAX)return;const c=bCost(B,l);if(Q.gold<c)return;
  tick(Q);Q.gold-=c;s.b[B.id]=l+1;ach('city_b1');if(l+1>=BMAX)ach('city_b5');flash=`${B.n} เลเวล ${l+1}: ${B.d(l+1)}`;}));
 el.querySelectorAll('[data-on]').forEach(b=>b.onclick=()=>{const sel=el.querySelector(`[data-js="${b.dataset.on}"]`);if(!sel)return;upd((Q,s)=>{const k=b.dataset.on,id=sel.value,m=mem(Q,id);
  if(!m||JK.some(x=>(s.jobs[x]||[]).includes(id))||(s.jobs[k]||[]).length>=jSlots(lvOf(Q,k)))return;tick(Q);s.jobs[k].push(id);ach('city_job1');
  flash=`${m.name} ไปประจำ${BLD.find(x=>x.id===k).n}แล้ว${fits(k,m)?' งานนี้ถนัดพอดี':''}`;if(JK.every(x=>(s.jobs[x]||[]).length))ach('city_jobs');tick(Q);});});
 el.querySelectorAll('[data-off]').forEach(b=>b.onclick=()=>upd((Q,s)=>{const[k,id]=b.dataset.off.split('|');tick(Q);s.jobs[k]=(s.jobs[k]||[]).filter(x=>x!==id);}));
 el.querySelectorAll('[data-fg]').forEach(b=>b.onclick=()=>upd((Q,s)=>{tick(Q);const g=Math.floor(s.fg);if(g<1)return;s.fg-=g;Q.gold+=g;Q.goldAll+=g;flash=`เก็บผลผลิตจากลานฝึกสัตว์เลี้ยงได้ 🪙 ${g}`;}));
 el.querySelectorAll('[data-pet]').forEach(b=>b.onclick=()=>upd((Q,s)=>{const id=b.dataset.pet;if(Q.gold<TREAT_G||(s.tr[id]||0)+TREAT_CD>Date.now())return;tick(Q);
  Q.gold-=TREAT_G;s.tr[id]=Date.now();s.mood[id]=Math.min(100,(s.mood[id]||0)+TREAT_UP);tick(Q);}));
 el.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>upd((Q,s)=>{const k=b.dataset.buy;if(s.decor.length>=DECOR_MAX||Q.gold<DEC[k].g)return;Q.gold-=DEC[k].g;s.decor.push(k);decorAch(s);}));
 el.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>upd((Q,s)=>{const k=b.dataset.rm,i=s.decor.lastIndexOf(k);if(i<0)return;s.decor.splice(i,1);const g=Math.round(DEC[k].g/2);Q.gold+=g;}));}});
try{window.ACH&&window.ACH.add&&window.ACH.add([
 {id:'city_q1',n:'งานแรกจากกระดาน',d:'ส่งเควสสำเร็จครั้งแรก',icon:'📜',tier:'bronze'},
 {id:'city_q10',n:'ขาประจำกระดานเควส',d:'ส่งเควสครบ 10 ครั้ง',icon:'📋',tier:'silver'},
 {id:'city_q50',n:'ที่พึ่งของชาวเมือง',d:'ส่งเควสครบ 50 ครั้ง',icon:'🏅',tier:'gold'},
 {id:'city_b1',n:'วางศิลาฤกษ์',d:'สร้างหรือขยายอาคารในเมืองครั้งแรก',icon:'🏗',tier:'bronze'},
 {id:'city_b5',n:'อาคารเต็มขั้น',d:'ขยายอาคารหลังใดหลังหนึ่งจนถึงเลเวล 5',icon:'🏛',tier:'gold'},
 {id:'city_decor8',n:'เมืองนี้น่าอยู่',d:'มีของตกแต่งครบทั้ง 8 แบบในเมือง',icon:'⛲',tier:'silver'},
 {id:'city_egg',n:'ไข่ใบนี้ไม่ธรรมดา',d:'ได้สัตว์พิเศษจากการทำเควส',icon:'🥚',tier:'legend'},
 {id:'city_job1',n:'มีงานมีการทำ',d:'ส่งสมาชิกตระกูลไปประจำอาคารในเมืองครั้งแรก',icon:'👷',tier:'bronze'},
 {id:'city_farm',n:'ลานนี้มีแต่รอยยิ้ม',d:'ให้ชาวไร่ประจำลานฝึกสัตว์เลี้ยงจนสัตว์ทุกตัวอารมณ์ดี',icon:'🐄',tier:'silver'},
 {id:'city_jobs',n:'เมืองที่ไม่เคยหลับ',d:'มีคนประจำครบทุกอาคารที่รับคนทำงาน',icon:'🌃',tier:'gold'}]);}catch(e){}
// เปิดแท็บเมืองแล้วเลื่อนไปที่การ์ดอาคาร (town.js เรียกตอนแตะอาคารในล็อบบี้)
function focus(id){M.open('city');setTimeout(()=>{const c=document.querySelector(`#metaDlg [data-bld="${id}"]`);if(!c)return;c.scrollIntoView({block:'center',behavior:'smooth'});c.classList.add('cq-hi');setTimeout(()=>c.classList.remove('cq-hi'),1600);},60);}
window.CITY={bonus,lv:id=>lvOf(M.load(),id),busy,petMood,petMul,focus};
})();
