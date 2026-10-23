// city.js — กระดานเควส (เควสรายวัน + เควสถาวรหลายขั้น), บริหารเมือง (อาคาร 6 หลัง), ร้านของตกแต่ง
// API: window.CITY = { bonus(k), lv(id) }  bonus: 'train' ตัวคูณค่าฝึก (<1), 'gold' ตัวคูณเหรียญดันเจี้ยน, 'hp' ตัวคูณ HP ตี้, 'exp' ตัวคูณ EXP เควส, 'egg' โอกาสไข่
// ข้อมูลอยู่ใน META P.mod.city = {b:{id:lv}, decor:[key], c:{runs,wins,sec,hard,train,kills}, best:{f,b}, wc:[cls], q:{day,L:[...]}, perm:{id:ขั้นที่ส่งแล้ว}, n:ส่งเควสแล้ว, pick:id สมาชิกรับ EXP, sl:{m,p}}
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
 {id:'inn',ic:'🏨',n:'บ้านพัก',c:350,d:l=>`เพิ่มช่องในตระกูลแล้วได้เหรียญคืน ${l*8}%`}];
const BMAX=5,BMUL=[1,2.5,5,9,15];
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
 if(!isObj(s.best))s.best={f:0,b:0};if(!isObj(s.sl))s.sl={m:P.slots.m,p:P.slots.p};s.n=s.n|0;return s;}
const lvOf=(P,id)=>Math.max(0,Math.min(BMAX,(st(P).b[id]|0)));
function bonus(k){const P=M.load(),L=id=>lvOf(P,id);
 switch(k){case'train':return 1-.06*L('train');case'gold':return 1+.08*L('market');case'hp':return 1+.05*L('hosp');case'exp':return 1+.12*L('lib');case'egg':return eggP(L('hatch'),1);default:return 1;}}
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
function giveXp(m,x){m.xp=(m.xp|0)+x;let up=0;while(m.xp>=100){m.xp-=100;m.lv=(m.lv|0)+1;up++;
 m.hp=Math.round(m.hp*1.08);m.atk=Math.round(m.atk*1.06);m.def=Math.round(m.def*1.06);}return up;}
function giveEgg(P){if(P.pets.length>=P.slots.p)return'';const own=k=>P.pets.some(p=>p.k===k);
 const ks=Object.keys(EGG).filter(k=>!own(k)),k=(ks.length?ks:Object.keys(EGG))[Math.floor(Math.random()*(ks.length||2))];
 P.pets.push({id:M.uid(),k,from:'เควส',legend:true,t:Date.now()});ach('city_egg');return k;}
// รับรางวัล rw = {g,x,d,egg} egg 1 = ลุ้นตามโรงฟักไข่, 2 = ได้แน่
function pay(P,s,rw){const out=[];if(rw.g){P.gold+=rw.g;P.goldAll+=rw.g;out.push(`🪙 ${rw.g}`);}
 if(rw.x){const m=P.roster.find(m=>m.id===s.pick)||P.roster.find(m=>m.id===P.head)||P.roster[0];
  if(m){const x=Math.round(rw.x*(1+.12*lvOf(P,'lib'))),up=giveXp(m,x);out.push(`${m.name} ได้ EXP ${x}${up?` เลเวลขึ้นเป็น ${m.lv}`:''}`);}}
 if(rw.d){if(s.decor.length<DECOR_MAX){s.decor.push(rw.d);out.push(`ได้${dName(rw.d)}ไปตั้งในเมือง`);decorAch(s);}else{P.gold+=150;P.goldAll+=150;out.push(`ที่ในเมืองเต็ม เลยได้ 🪙 150 แทน${dName(rw.d)}`);}}
 const lh=lvOf(P,'hatch'),ch=rw.egg===2?1:rw.egg?eggP(lh,1):eggP(lh,0);
 if(ch>0&&Math.random()<ch){const k=giveEgg(P);if(k)out.push(`✨ ได้ไข่${petN(k)}! ฟักแล้วไปอยู่ในตระกูล`);else if(rw.egg){P.gold+=300;P.goldAll+=300;out.push('ได้ไข่สัตว์พิเศษ แต่ช่องสัตว์เลี้ยงเต็ม เลยขายได้ 🪙 300');}}
 s.n++;ach('city_q1');if(s.n>=10)ach('city_q10');if(s.n>=50)ach('city_q50');return out.join(' · ');}
function decorAch(s){if(DK.every(k=>s.decor.includes(k)))ach('city_decor8');}
// บ้านพัก: คืนเหรียญส่วนต่างเมื่อเห็นว่ามีการเพิ่มช่องในตระกูล (ราคาเดียวกับ meta.js)
function syncSlots(){const P=M.load(),s=st(P),l=lvOf(P,'inn');let ref=0;
 for(let i=s.sl.m;i<P.slots.m;i++)ref+=600+(i-10)*300;for(let i=s.sl.p;i<P.slots.p;i++)ref+=800+(i-5)*800;
 const ch=s.sl.m!==P.slots.m||s.sl.p!==P.slots.p;if(!ch)return;s.sl={m:P.slots.m,p:P.slots.p};ref=Math.round(ref*.08*l);
 if(ref>0){P.gold+=ref;P.goldAll+=ref;flash=`🏨 บ้านพักคืนเหรียญให้ ${ref}`;}M.save(P);M.refresh();}
document.addEventListener('click',e=>{if(e.target&&e.target.closest&&e.target.closest('#metaDlg [data-slot]'))setTimeout(syncSlots,0);});
// ---------- ติดตามผล ----------
function upd(f){const P=M.load(),s=st(P);f(P,s);M.save(P);M.refresh();}
M.onRun(R=>upd((P,s)=>{const fl=R.won?100:(R.floor|0),bo=R.bosses|0,ki=R.kills|0,sec=!!(R.won&&R.sec&&(R.sec.res==='f'||R.sec.res==='s'));
 const cid=((C().CLASSES||[])[R.h.cls]||{}).id||'';
 s.c.runs++;s.c.kills+=ki;if(R.won){s.c.wins++;if(cid&&!s.wc.includes(cid))s.wc.push(cid);}if(sec)s.c.sec++;
 s.best.f=Math.max(s.best.f,fl);s.best.b=Math.max(s.best.b,bo);
 daily(P,s).forEach(q=>{if(q.k==='floor')q.p=Math.max(q.p|0,fl);else if(q.k==='boss')q.p=Math.max(q.p|0,bo);else if(q.k==='kills')q.p=Math.max(q.p|0,ki);else if(q.k==='wincls'&&R.won&&cid===q.cls)q.p=1;});
 // ตลาด: เหรียญเมืองตอนจบรอบเพิ่มตามเลเวล
 const lm=lvOf(P,'market');if(lm&&P.last&&P.last.g){const x=Math.round(P.last.g*.08*lm);P.gold+=x;P.goldAll+=x;P.last.cx=x;}}));
window.addEventListener('tof:hard-clear',()=>upd((P,s)=>{s.c.hard++;}));
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
.cq-lv{display:inline-flex;gap:2px;margin-left:4px}.cq-lv i{width:8px;height:8px;border-radius:2px;background:var(--line,#2c3a36)}.cq-lv i.on{background:var(--gold,#f4bb4a)}`;document.head.appendChild(el);})();
function rwTxt(rw,P){const a=[];if(rw.g)a.push(`🪙 ${rw.g}`);if(rw.x)a.push(`EXP ${Math.round(rw.x*(1+.12*lvOf(P,'lib')))}`);if(rw.d)a.push(`${(DEC[rw.d]||{}).ic||'🎁'} ${dName(rw.d)}`);if(rw.egg===2)a.push('🥚 ไข่สัตว์พิเศษ');return a.join(' · ');}
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
 <div class="cq-pick">EXP จากเควสเข้าตัว: ${ros.length?`<select id="cqPick">${ros.map(m=>`<option value="${m.id}" ${m.id===pick?'selected':''}>${esc(m.name)} Lv.${m.lv} (${m.xp|0}/100)</option>`).join('')}</select>`:'<span class="mt-dim">ยังไม่มีสมาชิก EXP จะหายไปเปล่าๆ</span>'}</div>
 <div class="cq-board"><h4>📌 ประกาศวันนี้</h4><div class="cq-notes">${L.map(q=>noteHTML(q,s,P)).join('')}</div></div>
 <div class="cq-board"><h4>📜 งานใหญ่ของตระกูล</h4><div class="cq-notes">${perms.map(Q=>permHTML(Q,s,P)).join('')}</div></div>`;
 flash='';
 const sel=el.querySelector('#cqPick');if(sel)sel.onchange=()=>upd((Q,s)=>{s.pick=sel.value;});
 el.querySelectorAll('[data-qd]').forEach(b=>b.onclick=()=>upd((Q,s)=>{const q=daily(Q,s)[+b.dataset.qd];if(!q||q.ok||qProg(q,s)<q.a)return;s.pick=sel?sel.value:pick;q.ok=1;flash='ส่งเควสแล้ว: '+pay(Q,s,q.rw);}));
 el.querySelectorAll('[data-qp]').forEach(b=>b.onclick=()=>upd((Q,s)=>{const D=PERM.find(x=>x.id===b.dataset.qp),i=s.perm[D.id]|0;if(i>=D.st.length||(D.m(s)|0)<D.st[i])return;
  s.pick=sel?sel.value:pick;s.perm[D.id]=i+1;flash='ส่งเควสแล้ว: '+pay(Q,s,D.rw[i]);}));}});
M.tab('city',{n:'🏗 บริหารเมือง',o:30,lock:P=>P.unlock.city?'':'ผ่านชั้น 100 ก่อน เมืองถึงจะเปิด',render(el,P){const s=st(P),cnt=k=>s.decor.filter(x=>x===k).length,full=s.decor.length>=DECOR_MAX;
 el.innerHTML=`${flash?`<div class="cq-flash">${esc(flash)}</div>`:''}<p class="mt-dim">ใช้เหรียญเมืองสร้างและขยายอาคาร หลังละไม่เกินเลเวล ${BMAX} บัฟมีผลกับทั้งตระกูลทันที</p>
 <div class="mt-grid">${BLD.map(b=>{const l=lvOf(P,b.id),mx=l>=BMAX,c=mx?0:bCost(b,l);return`<div class="mt-card"><b>${b.ic} ${esc(b.n)}</b><span class="cq-lv">${[1,2,3,4,5].map(i=>`<i class="${i<=l?'on':''}"></i>`).join('')}</span>
  <div class="mt-dim">${l?esc(b.d(l)):'ยังไม่ได้สร้าง'}</div>${mx?'<div class="mt-dim">เลเวลสูงสุดแล้ว</div>':`<div class="mt-dim">เลเวลถัดไป: ${esc(b.d(l+1))}</div><button class="mt-btn pri" data-up="${b.id}" ${P.gold<c?'disabled':''}>${l?'ขยาย':'สร้าง'} (🪙 ${c})</button>`}</div>`;}).join('')}</div>
 <h3>🛒 ร้านของตกแต่ง <span class="mt-dim">ในเมือง ${s.decor.length}/${DECOR_MAX} ชิ้น</span></h3><p class="mt-dim">ซื้อซ้ำได้ ของจะไปตั้งอยู่ในลานเมือง เก็บออกแล้วได้เหรียญคืนครึ่งราคา</p>
 <div class="mt-grid">${DK.map(k=>{const D=DEC[k],n=cnt(k);return`<div class="mt-card"><b>${D.ic} ${esc(dName(k))}</b><div class="mt-dim">มีอยู่ ${n} ชิ้น</div>
  <button class="mt-btn pri" data-buy="${k}" ${full||P.gold<D.g?'disabled':''}>ซื้อ (🪙 ${D.g})</button>${n?`<button class="mt-btn" data-rm="${k}">เก็บออก</button>`:''}</div>`;}).join('')}</div>`;
 flash='';
 el.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>upd((Q,s)=>{const B=BLD.find(x=>x.id===b.dataset.up),l=lvOf(Q,B.id);if(l>=BMAX)return;const c=bCost(B,l);if(Q.gold<c)return;
  Q.gold-=c;s.b[B.id]=l+1;ach('city_b1');if(l+1>=BMAX)ach('city_b5');flash=`${B.n} เลเวล ${l+1}: ${B.d(l+1)}`;}));
 el.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>upd((Q,s)=>{const k=b.dataset.buy;if(s.decor.length>=DECOR_MAX||Q.gold<DEC[k].g)return;Q.gold-=DEC[k].g;s.decor.push(k);decorAch(s);}));
 el.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>upd((Q,s)=>{const k=b.dataset.rm,i=s.decor.lastIndexOf(k);if(i<0)return;s.decor.splice(i,1);const g=Math.round(DEC[k].g/2);Q.gold+=g;}));}});
try{window.ACH&&window.ACH.add&&window.ACH.add([
 {id:'city_q1',n:'งานแรกจากกระดาน',d:'ส่งเควสสำเร็จครั้งแรก',icon:'📜',tier:'bronze'},
 {id:'city_q10',n:'ขาประจำกระดานเควส',d:'ส่งเควสครบ 10 ครั้ง',icon:'📋',tier:'silver'},
 {id:'city_q50',n:'ที่พึ่งของชาวเมือง',d:'ส่งเควสครบ 50 ครั้ง',icon:'🏅',tier:'gold'},
 {id:'city_b1',n:'วางศิลาฤกษ์',d:'สร้างหรือขยายอาคารในเมืองครั้งแรก',icon:'🏗',tier:'bronze'},
 {id:'city_b5',n:'อาคารเต็มขั้น',d:'ขยายอาคารหลังใดหลังหนึ่งจนถึงเลเวล 5',icon:'🏛',tier:'gold'},
 {id:'city_decor8',n:'เมืองนี้น่าอยู่',d:'มีของตกแต่งครบทั้ง 8 แบบในเมือง',icon:'⛲',tier:'silver'},
 {id:'city_egg',n:'ไข่ใบนี้ไม่ธรรมดา',d:'ได้สัตว์พิเศษจากการทำเควส',icon:'🥚',tier:'legend'}]);}catch(e){}
window.CITY={bonus,lv:id=>lvOf(M.load(),id)};
})();
