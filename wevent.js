// wevent.js — อีเวนต์ประจำสัปดาห์ (เติมช่วงที่ไม่มีเทศกาล) + เหตุการณ์ระดับโลกที่สุ่มเจอได้บางรอบ
// สัปดาห์เริ่มวันจันทร์ตามเวลาไทย สุ่มลำดับจากเลขสัปดาห์ (ทุก 8 สัปดาห์ได้ครบทุกอีเวนต์ ไม่ซ้ำติดกัน) ทุกคนเห็นอีเวนต์เดียวกัน
// API: window.WEV = { active(), list(), force(id|null), world(on) }  force/world ใช้เทส (จำไว้ใน sessionStorage จนปิดแท็บ)
// เก็บใน META P.mod.wev = {wk:{'w2856':{id,runs,gold,bosses,bossBest,maxFl,petRuns,pets,petFl,buys,compRuns,clanRuns,hard,train,treas,mimic,good,potRuns,wins,buy,coins,q:{},badge}}, badges:{evId:n}, opt:{wk:1}, world:n}
// ฮุกใน auto.js: 'tof:run-start' {R,say} ตอนเริ่มรอบ (ใส่ R.mod, R.wsp, R.wev) · R.wsp[k] คูณน้ำหนักเหตุการณ์พิเศษใน genSpecial
(function(){
'use strict';
if(!window.META)return;
const M=window.META,esc=M.esc,FK='tof-wev-force',WK='tof-wev-world',WORLD_P=.03;
const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
const TH_M=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
// mod = ตัวคูณ R.mod ของรอบ (regen บวกเพิ่ม) · sp = ตัวคูณน้ำหนักเหตุการณ์พิเศษ · opt = ต้องกดเข้าร่วมเองในแท็บ · sh = สรุปสั้นบนแบนเนอร์
const EVS=[
 {id:'goldrain',n:'สัปดาห์ฝนทอง',ic:'🪙',col:'#f4bb4a',sh:'ทองในหอ +15%',mod:{gold:1.15},
  d:'ฝนในหอตกลงมาเป็นเกล็ดทองทั้งสัปดาห์ มอนสเตอร์ หีบ และงานทุกอย่างให้ทองมากขึ้น 15%',
  q:[{id:'g',n:'เก็บทองในหอรวม 8,000',v:e=>e.gold,max:8000,r:150},{id:'fl',n:'ไต่ให้ถึงชั้น 50',v:e=>e.maxFl,max:50,r:100},{id:'runs',n:'ไต่หอจบ 3 รอบ',v:e=>e.runs,max:3,r:120}]},
 {id:'bossnight',n:'ราตรีบอสคลั่ง',ic:'💀',col:'#ff6a6a',sh:'บอสแรงขึ้น 10% ล้มได้เหรียญเมือง',mod:{boss:1.1},opt:1,
  d:'บอสทุกชั้นได้ยินว่ามีคนจะมาท้า เลยตื่นมาซ้อมกันทั้งคืน ถ้าเข้าร่วม บอสจะแรงขึ้น 10% แต่ล้มได้ตัวละ 🪙 12 เหรียญเมือง (นับไม่เกิน 10 ตัวต่อรอบ)',
  q:[{id:'b',n:'ล้มบอสรวม 8 ตัว',v:e=>e.bosses,max:8,r:150},{id:'b1',n:'ล้มบอส 4 ตัวในรอบเดียว',v:e=>e.bossBest,max:4,r:150},{id:'fl',n:'ไต่ให้ถึงชั้น 60',v:e=>e.maxFl,max:60,r:120}]},
 {id:'petfest',n:'เทศกาลสัตว์เลี้ยง',ic:'🐾',col:'#8fd88f',sh:'เจอสัตว์เลี้ยงบ่อยขึ้น',mod:{pet:1.5},sp:{rpet:3},
  d:'สัตว์เล็กสัตว์น้อยมาเที่ยวงานในหอ เจอสัตว์เลี้ยงบ่อยขึ้น จบรอบที่มีสัตว์ไปด้วย สัตว์ในคอกของตระกูลก็อารมณ์ดีขึ้นอีก 8',
  q:[{id:'pr',n:'จบรอบที่มีสัตว์เลี้ยงไปด้วย 2 รอบ',v:e=>e.petRuns,max:2,r:120},{id:'pn',n:'มีสัตว์เลี้ยงติดตัวตอนจบรอบรวม 3 ตัว',v:e=>e.pets,max:3,r:120},{id:'pf',n:'พาสัตว์เลี้ยงขึ้นไปถึงชั้น 50',v:e=>e.petFl,max:50,r:150}]},
 {id:'bazaar',n:'ตลาดนัดพ่อค้าเร่',ic:'🛒',col:'#e0a050',sh:'ของแต่งเมืองลด 30%',mod:{cc:.9},sp:{peddler:3,thief:2},
  d:'พ่อค้าเร่มาตั้งแผงทั้งในหอและในเมือง ในหอเจอพ่อค้าบ่อยขึ้นและค่าจ้างทหารถูกลง 10% ส่วนในเมืองมีของตกแต่งลดราคา 30% ตลอดสัปดาห์',
  q:[{id:'buy',n:'ซื้อของจากร้านในหอรวม 10 ชิ้น',v:e=>e.buys,max:10,r:100},{id:'cp',n:'จบรอบโดยมีทหารรับจ้างอยู่ในทีม 2 รอบ',v:e=>e.compRuns,max:2,r:120},{id:'mk',n:'ซื้อของตกแต่งจากตลาดนัด 1 ชิ้น',v:e=>e.buy,max:1,r:100}]},
 {id:'portal',n:'ประตูมิติ',ic:'🌀',col:'#b48aff',sh:'ชนะโหมดยากได้เหรียญเมืองเพิ่ม',sp:{astral:2,whale:2},
  d:'ประตูมิติเปิดค้างอยู่ข้างดันเจี้ยน ชนะด่านโหมดยากได้ 🪙 40 เหรียญเมืองเพิ่มทุกครั้ง ในหอก็เจอบันไดดวงดาวกับวาฬลอยฟ้าบ่อยขึ้น',
  q:[{id:'hd',n:'ชนะด่านโหมดยาก 3 ครั้ง',v:e=>e.hard,max:3,r:150},{id:'tr',n:'ฝึกสมาชิกที่ลานฝึก 2 ครั้ง',v:e=>e.train,max:2,r:100},{id:'fl',n:'ไต่ให้ถึงชั้น 70',v:e=>e.maxFl,max:70,r:150}]},
 {id:'treasure',n:'ฤดูล่าสมบัติ',ic:'💎',col:'#5ad0d0',sh:'หีบกับสมบัติโผล่บ่อยขึ้น',mod:{mimic:1.5,loot:1.2},sp:{starfall:2,heist:2},
  d:'แผนที่ขุมทรัพย์หลุดออกมาหลายใบ หีบ ดาวตก และคลังสมบัติโผล่บ่อยขึ้น ของในหีบก็มากขึ้น 20% แต่หีบที่กัดได้ก็มากขึ้นด้วย',
  q:[{id:'tr',n:'ได้สมบัติรวม 5 ครั้ง',v:e=>e.treas,max:5,r:150},{id:'mm',n:'เจอหีบกลางทาง 2 ครั้ง',v:e=>e.mimic,max:2,r:120},{id:'runs',n:'ไต่หอจบ 3 รอบ',v:e=>e.runs,max:3,r:100}]},
 {id:'calm',n:'สัปดาห์ลมสงบ',ic:'🍃',col:'#9fd8c0',sh:'ฟื้น HP เพิ่ม EXP +10%',mod:{regen:.005,xp:1.1},sp:{campfire:2,fountain:2},
  d:'ลมในหอพัดเย็นสบาย ฟื้น HP เพิ่มทุกชั้นอีกนิด EXP มากขึ้น 10% กองไฟกับน้ำพุก็หาเจอง่ายขึ้น',
  q:[{id:'gd',n:'จบรอบโดยกรรมดี 2 รอบ',v:e=>e.good,max:2,r:120},{id:'pt',n:'จบรอบโดยยังมียาเหลือ 2 รอบ',v:e=>e.potRuns,max:2,r:100},{id:'fl',n:'ไต่ให้ถึงชั้น 70',v:e=>e.maxFl,max:70,r:150}]},
 {id:'rally',n:'สัปดาห์รวมพล',ic:'🤝',col:'#7ab0ff',sh:'ทหารรับจ้างถูกลงและเก่งขึ้น',mod:{cc:.85,cp:1.1},sp:{merc:2},
  d:'นักผจญภัยจากทุกเมืองมารวมตัวกันหน้าหอ ค่าจ้างทหารถูกลง 15% และเก่งขึ้น 10% ทหารระดับตำนานก็เดินผ่านมาบ่อยขึ้น',
  q:[{id:'cp',n:'จบรอบโดยมีทหารรับจ้างอยู่ในทีม 2 รอบ',v:e=>e.compRuns,max:2,r:120},{id:'cl',n:'พาคนในตระกูลจากป้อมทหารรับจ้างไปไต่หอ 1 รอบ',v:e=>e.clanRuns,max:1,r:150},{id:'win',n:'พิชิตยอดหอ 1 ครั้ง',v:e=>e.wins,max:1,r:200}]}];
const BY={};EVS.forEach(E=>BY[E.id]=E);
const MARKET=[{k:'lamp',n:'โคมไฟถนน',ic:'🏮',g:200},{k:'bench',n:'ม้านั่ง',ic:'🪑',g:200},{k:'tree',n:'ต้นไม้',ic:'🌳',g:250},{k:'flag',n:'เสาธงตระกูล',ic:'🚩',g:300},
 {k:'banner',n:'ป้ายผ้าตระกูล',ic:'🎏',g:350},{k:'garden',n:'แปลงดอกไม้',ic:'🌷',g:400},{k:'well',n:'บ่อน้ำ',ic:'🪣',g:500},{k:'fountain',n:'น้ำพุ',ic:'⛲',g:900}];
const MK_OFF=.7,DMAX=16,BOSS_G=12,HARD_G=40,WORLD_G=100,PET_MOOD=8;
const WORLD={n:'ดาวหางผ่านหอ',ic:'☄️',d:'ดาวหางสีรุ้งลากหางผ่านยอดหอ รอบนี้ทองในหอ +25% EXP +20% จบรอบได้ 🪙 100 เหรียญเมือง'};

// ---------- สัปดาห์ (เวลาไทย จันทร์ถึงอาทิตย์) ----------
const dayNo=()=>Math.floor((Date.now()+7*36e5)/864e5); // 1970-01-05 = วันจันทร์ = วันที่ 4
const weekNo=d=>Math.floor((d-4)/7);
function rngOf(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);
 return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function perm(c){const r=rngOf('tof-wev|'+c),a=EVS.map((_,i)=>i);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function evOfWeek(w){const n=EVS.length,c=Math.floor(w/n),p=perm(c);if(c>0&&p[0]===perm(c-1)[n-1])[p[0],p[1]]=[p[1],p[0]];return EVS[p[((w%n)+n)%n]];}
const dtxt=d=>{const x=new Date(d*864e5);return`${x.getUTCDate()} ${TH_M[x.getUTCMonth()]}`;};
let FORCE='';try{FORCE=sessionStorage.getItem(FK)||'';}catch(e){}
function active(){const d=dayNo(),w=weekNo(d),E=BY[FORCE]||evOfWeek(w),a=w*7+4;return{E,w,key:'w'+w,from:a,to:a+6,left:a+6-d+1};}
const upcoming=n=>{const w=weekNo(dayNo()),L=[];for(let i=1;i<=n;i++){const a=(w+i)*7+4;L.push({E:evOfWeek(w+i),from:a,to:a+6});}return L;};

// ---------- ข้อมูล ----------
const F0={runs:0,gold:0,bosses:0,bossBest:0,maxFl:0,petRuns:0,pets:0,petFl:0,buys:0,compRuns:0,clanRuns:0,hard:0,train:0,treas:0,mimic:0,good:0,potRuns:0,wins:0,buy:0,coins:0};
function st(P){if(!isObj(P.mod))P.mod={};const m=P.mod.wev=isObj(P.mod.wev)?P.mod.wev:{};['wk','badges','opt'].forEach(k=>{if(!isObj(m[k]))m[k]={};});m.world=m.world|0;return m;}
function wk(m,A){let e=m.wk[A.key];e=m.wk[A.key]=Object.assign({},F0,isObj(e)?e:{});if(!isObj(e.q)||(e.id&&e.id!==A.E.id)){e.q={};e.badge=0;}e.id=A.E.id; // ใช้ WEV.force สลับอีเวนต์กลางสัปดาห์ ภารกิจเริ่มใหม่
 // เก็บย้อนหลังแค่ 12 สัปดาห์
 Object.keys(m.wk).forEach(k=>{const n=+k.slice(1);if(!(n>=A.w-12))delete m.wk[k];});return e;}
const joined=(m,A)=>!A.E.opt||!!m.opt[A.key];
function checkAch(m){const g=M.grantAch,b=Object.keys(m.badges).filter(k=>BY[k]&&m.badges[k]>0);if(b.length)g('wev_badge');if(b.length>=4)g('wev_4');if(b.length>=EVS.length)g('wev_all');if(m.world)g('wev_world');}
function upd(f){const P=M.load(),m=st(P),A=active(),e=wk(m,A);const r=f(P,m,e,A);M.save(P);checkAch(m);M.refresh();banner();return r;}

// ---------- เริ่มรอบ: ใส่ตัวคูณของสัปดาห์นี้ลง R (เซฟรอบค้างพาไปด้วย) ----------
function applyMod(R,mod){if(!isObj(R.mod))R.mod={};for(const k in mod)R.mod[k]=k==='regen'?(R.mod[k]||0)+mod[k]:(R.mod[k]===undefined?1:R.mod[k])*mod[k];}
window.addEventListener('tof:run-start',ev=>{const d=(ev&&ev.detail)||{},R=d.R,say=typeof d.say==='function'?d.say:()=>{};if(!R||R.wev)return;
 const A=active(),E=A.E,m=st(M.load()),on=joined(m,A);R.wev={id:E.id,wk:A.key,on};
 if(on){applyMod(R,E.mod||{});if(E.sp)R.wsp=Object.assign({},E.sp);say(`${E.ic} อีเวนต์สัปดาห์นี้: ${E.n} (${E.sh})`,'info');}
 else say(`${E.ic} สัปดาห์นี้มี${E.n} ยังไม่ได้กดเข้าร่วม เปิดได้ในแท็บอีเวนต์ของเมือง`,'info');
 let wf=false;try{wf=sessionStorage.getItem(WK)==='1';if(wf)sessionStorage.removeItem(WK);}catch(e){}
 if(wf||Math.random()<WORLD_P){R.wev.world=1;applyMod(R,{gold:1.25,xp:1.2});say(`${WORLD.ic} ${WORLD.n}! ${WORLD.d}`,'lv');}});

// ---------- จบรอบ ----------
const cnt=R=>Object.values(isObj(R.buys)?R.buys:{}).reduce((a,v)=>a+(+v||0),0);
M.onRun(R=>{const fl=R.won?100:(R.floor|0),b=R.bosses|0,pets=Array.isArray(R.pets)?R.pets:[],cp=Array.isArray(R.comps)?R.comps:[],W=isObj(R.wev)?R.wev:null;
 upd((P,m,e,A)=>{e.runs++;e.gold+=Math.max(0,Math.round(R.gIn||0));e.bosses+=b;e.bossBest=Math.max(e.bossBest,b);e.maxFl=Math.max(e.maxFl,fl);
  if(pets.length){e.petRuns++;e.pets+=pets.length;e.petFl=Math.max(e.petFl,fl);}e.buys+=R.nBuy!=null?(R.nBuy|0):cnt(R);if(cp.length)e.compRuns++;if(R.clanGo||cp.some(c=>c&&c.clan))e.clanRuns++;
  e.treas+=(Array.isArray(R.map)?R.map:[]).filter(x=>x==='treasure').length;e.mimic+=(isObj(R.used)&&+R.used['sp:mimic'])||0;
  if((R.karma|0)>=10)e.good++;if((R.potions|0)>0)e.potRuns++;if(R.won)e.wins++;
  M.grantAch('wev_join');
  const mine=W&&W.on&&W.id===A.E.id&&W.wk===A.key;let g=0;
  if(mine&&A.E.id==='bossnight'&&b){g+=Math.min(10,b)*BOSS_G;if(b>=5)M.grantAch('wev_boss');}
  if(mine&&A.E.id==='petfest'&&pets.length&&P.pets.length){const c=isObj(P.mod.city)?P.mod.city:null;if(c){if(!isObj(c.mood))c.mood={};P.pets.forEach(p=>{c.mood[p.id]=Math.min(120,(c.mood[p.id]==null?70:+c.mood[p.id])+PET_MOOD);});}}
  if(W&&W.world){g+=WORLD_G;m.world++;}
  if(g){P.gold+=g;P.goldAll+=g;e.coins+=g;}m.last={g,t:Date.now(),w:W&&W.world?1:0};});});
window.addEventListener('tof:hard-clear',()=>upd((P,m,e,A)=>{e.hard++;if(A.E.id==='portal'){P.gold+=HARD_G;P.goldAll+=HARD_G;e.coins+=HARD_G;}}));
window.addEventListener('tof:train',()=>upd((P,m,e)=>{e.train++;}));

// ---------- หน้าต่าง ----------
function css(){const s=document.createElement('style');s.textContent=`
.wv-hd{border:1px solid var(--fc);border-radius:8px;padding:10px;background:linear-gradient(135deg,color-mix(in srgb,var(--fc) 14%,transparent),rgba(255,255,255,.02))}
.wv-hd b.big{font-size:16px}.wv-hd p{margin:6px 0}
.wv-q{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0;border-bottom:1px dashed var(--line,#2c3a36)}
.wv-q .qn{flex:1 1 150px;min-width:0}.wv-q .pb{flex:0 0 70px;height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}.wv-q .pb i{display:block;height:100%;background:var(--fc)}.wv-q .mt-btn{margin:0}
.wv-bd{display:inline-flex;align-items:center;gap:4px;margin:0 6px 6px 0;padding:4px 8px;border-radius:14px;border:1px solid var(--line,#2c3a36);font-size:12.5px}.wv-bd.on{border-color:var(--gold,#f4bb4a)}.wv-bd.off{opacity:.45}
.wv-sch{display:flex;justify-content:space-between;gap:8px;padding:4px 0;font-size:13px}
.wv-it .ic{font-size:22px;line-height:1}.wv-it .mt-btn{padding:4px 7px}
.wev-ban{display:flex;align-items:center;gap:8px;width:100%;margin:0 0 8px;padding:6px 10px;border-radius:8px;border:1px dashed var(--fc);background:color-mix(in srgb,var(--fc) 9%,transparent);color:var(--ink,#f1e7d0);font:inherit;font-size:13px;text-align:left;cursor:pointer}
.wev-ban .t{flex:1;min-width:0}.wev-ban .go{color:var(--fc);flex:none}
.wev-chip{flex:none;display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:10px;border:1px solid var(--wc);color:var(--ink,#f1e7d0);font-size:12px;white-space:nowrap;cursor:pointer}
@media (max-width:520px){.wev-chip .n{display:none}}`;document.head.appendChild(s);}
function qHTML(E,e,A){return E.q.map(q=>{const v=Math.min(q.max,q.v(e)|0),ok=v>=q.max,got=e.q[q.id];
 return`<div class="wv-q"><span class="qn">${esc(q.n)}<br><span class="mt-dim">${v.toLocaleString()}/${q.max.toLocaleString()} · รางวัล 🪙 ${q.r}</span></span><span class="pb"><i style="width:${v/q.max*100}%"></i></span>${got?'<span class="mt-dim">✔ รับแล้ว</span>':`<button class="mt-btn${ok?' pri':''}" data-wq="${q.id}" ${ok?'':'disabled'}>รับ</button>`}</div>`;}).join('');}
function marketHTML(P){if(!P.unlock.city)return'<p class="mt-dim">แผงของแต่งเมืองเปิดให้เฉพาะตระกูลที่มีเมืองแล้ว พิชิตยอดหอสักครั้งก่อน</p>';
 const d=(isObj(P.mod.city)&&Array.isArray(P.mod.city.decor))?P.mod.city.decor:[],full=d.length>=DMAX;
 return`<h3>แผงตลาดนัด <span class="mt-dim">ในเมือง ${d.length}/${DMAX} ชิ้น</span></h3>${full?`<p class="mt-dim">ในเมืองเต็มแล้ว เก็บบางชิ้นออกก่อน</p>`:''}<div class="mt-grid">${MARKET.map(x=>{const c=Math.round(x.g*MK_OFF);
 return`<div class="mt-card wv-it"><div><span class="ic">${x.ic}</span> <b>${esc(x.n)}</b></div><div class="mt-dim"><s>${x.g}</s> เหลือ 🪙 ${c}</div><button class="mt-btn pri" data-mk="${x.k}" ${full||P.gold<c?'disabled':''}>ซื้อ</button></div>`;}).join('')}</div>`;}
function render(el,P){const m=st(P),A=active(),E=A.E,e=wk(m,A),on=joined(m,A),done=E.q.filter(q=>e.q[q.id]).length;
 let h=`<div class="wv-hd" style="--fc:${E.col}"><b class="big">${E.ic} ${esc(E.n)}</b><div class="mt-dim">อีเวนต์ประจำสัปดาห์ ${dtxt(A.from)} ถึง ${dtxt(A.to)} · ${A.left>1?`อีก ${A.left} วัน`:'วันสุดท้าย'}</div>
 <p>${esc(E.d)}</p>${E.opt?`<div>${on?'✔ เข้าร่วมแล้ว':'ยังไม่ได้เข้าร่วม ผลของอีเวนต์จะมีเฉพาะรอบที่เริ่มหลังกดเข้าร่วม'} <button class="mt-btn${on?'':' pri'}" data-wopt>${on?'ถอนตัว':'เข้าร่วม'}</button></div>`:''}
 ${e.coins?`<div class="mt-dim">ได้เหรียญเมืองจากอีเวนต์สัปดาห์นี้แล้ว 🪙 ${e.coins.toLocaleString()}</div>`:''}</div>
 <h3>ภารกิจประจำสัปดาห์ ${done}/${E.q.length}</h3><p class="mt-dim">${e.badge?`ได้ตรา${esc(E.n)}ของสัปดาห์นี้แล้ว`:'รับรางวัลครบ 3 ข้อ ได้ตราประจำอีเวนต์เก็บไว้ในคอลเลกชัน'} · ภารกิจเริ่มนับใหม่ทุกวันจันทร์</p>
 <div style="--fc:${E.col}">${qHTML(E,e,A)}</div>${E.id==='bazaar'?marketHTML(P):''}
 <h3>ตราที่สะสม</h3><div>${EVS.map(x=>{const n=m.badges[x.id]|0;return`<span class="wv-bd ${n?'on':'off'}" title="${esc(x.n)}">${x.ic} ${esc(x.n)}${n>1?` ×${n}`:''}</span>`;}).join('')}</div>
 <p class="mt-dim">${WORLD.ic} ${esc(WORLD.n)}: บางรอบ (ราว 3 ใน 100) ดาวหางจะผ่านหอตอนเริ่มรอบ ทองในหอ +25% EXP +20% และจบรอบได้ 🪙 ${WORLD_G}${m.world?` · เจอมาแล้ว ${m.world} ครั้ง`:''}</p>
 <h3>สัปดาห์ถัดไป</h3>${upcoming(3).map(u=>`<div class="wv-sch"><span>${u.E.ic} ${esc(u.E.n)}</span><span class="mt-dim">${dtxt(u.from)} ถึง ${dtxt(u.to)}</span></div>`).join('')}`;
 el.innerHTML=h;
 el.querySelectorAll('[data-wq]').forEach(b=>b.onclick=()=>upd((P,m,e,A)=>{const q=A.E.q.find(x=>x.id===b.dataset.wq);if(!q||e.q[q.id]||(q.v(e)|0)<q.max)return;
  e.q[q.id]=1;P.gold+=q.r;P.goldAll+=q.r;e.coins+=q.r;M.grantAch('wev_q');if(!e.badge&&A.E.q.every(x=>e.q[x.id])){e.badge=1;m.badges[A.E.id]=(m.badges[A.E.id]|0)+1;}}));
 el.querySelectorAll('[data-wopt]').forEach(b=>b.onclick=()=>upd((P,m,e,A)=>{if(m.opt[A.key])delete m.opt[A.key];else m.opt[A.key]=1;Object.keys(m.opt).forEach(k=>{if(k!==A.key)delete m.opt[k];});}));
 el.querySelectorAll('[data-mk]').forEach(b=>b.onclick=()=>upd((P,m,e,A)=>{const x=MARKET.find(y=>y.k===b.dataset.mk),c=x&&Math.round(x.g*MK_OFF);if(!x||A.E.id!=='bazaar'||!P.unlock.city||P.gold<c)return;
  if(!isObj(P.mod.city))P.mod.city={};if(!Array.isArray(P.mod.city.decor))P.mod.city.decor=[];if(P.mod.city.decor.length>=DMAX)return;P.gold-=c;P.mod.city.decor.push(x.k);e.buy++;M.grantAch('wev_market');}));}
function regTab(){const A=active();M.tab('wev',{n:`${A.E.ic} อีเวนต์สัปดาห์`,o:36,render});}

// ---------- แบนเนอร์บนหน้าเกิด: ถ้ามีแบนเนอร์เทศกาลอยู่แล้ว ใส่เป็นป้ายเล็กในแบนเนอร์นั้นแทน ----------
function bText(){const A=active(),E=A.E,m=st(M.load()),e=m.wk[A.key]||{q:{}},d=E.q.filter(q=>e.q&&e.q[q.id]).length,on=joined(m,A),L=m.last&&Date.now()-m.last.t<6e5&&Date.now()>=m.last.t?m.last:null;
 return{A,t:`${E.ic} ${esc(E.n)} · ${on?esc(E.sh):'ยังไม่เข้าร่วม'} · ภารกิจ ${d}/3${L&&L.g?` <span class="mt-dim">(รอบที่แล้ว 🪙 +${L.g}${L.w?' ดาวหาง!':''})</span>`:''}`};}
function banner(){const c=document.getElementById('card');if(!c)return;const birth=!!(c.querySelector('#btnEnter')&&document.getElementById('inName'));
 let own=c.querySelector('#wevBan'),fb=c.querySelector('#festBan'),chip=fb&&fb.querySelector('.wev-chip');
 if(!birth){if(own)own.remove();return;}
 const{A,t}=bText(),E=A.E;
 if(fb){if(own)own.remove();if(!chip){chip=document.createElement('span');chip.className='wev-chip';chip.setAttribute('role','button');chip.tabIndex=0;
   const go=ev=>{ev.stopPropagation();ev.preventDefault();M.open('wev');};chip.onclick=go;chip.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' ')go(ev);};fb.insertBefore(chip,fb.querySelector('.go'));}
  chip.style.setProperty('--wc',E.col);const ct=`${E.ic}<span class="n"> ${esc(E.n)}</span>`;if(chip.innerHTML!==ct){chip.innerHTML=ct;chip.title=`อีเวนต์สัปดาห์นี้: ${E.n}`;chip.setAttribute('aria-label',chip.title);}return;}
 if(own){if(own.dataset.t!==t){own.dataset.t=t;own.querySelector('.t').innerHTML=t;own.style.setProperty('--fc',E.col);}return;}
 const b=document.createElement('button');b.type='button';b.id='wevBan';b.className='wev-ban';b.style.setProperty('--fc',E.col);b.dataset.t=t;
 b.innerHTML=`<span class="t">${t}</span><span class="go">ดูภารกิจ ›</span>`;b.onclick=()=>M.open('wev');c.insertBefore(b,c.firstChild);}
function init(){css();regTab();banner();const c=document.getElementById('card');if(c)new MutationObserver(()=>banner()).observe(c,{childList:true});}

try{window.ACH&&window.ACH.add&&window.ACH.add([
 {id:'wev_join',n:'สัปดาห์นี้มีอะไร',d:'ไต่หอจบรอบระหว่างอีเวนต์ประจำสัปดาห์เป็นครั้งแรก',icon:'📅',tier:'bronze'},
 {id:'wev_q',n:'รับงานรายสัปดาห์',d:'รับรางวัลภารกิจประจำสัปดาห์เป็นครั้งแรก',icon:'📋',tier:'bronze'},
 {id:'wev_badge',n:'ตราประจำสัปดาห์',d:'ทำภารกิจประจำสัปดาห์ครบทั้ง 3 ข้อจนได้ตรา',icon:'🎖️',tier:'silver'},
 {id:'wev_4',n:'ขาประจำทุกวันจันทร์',d:'มีตราจากอีเวนต์ประจำสัปดาห์ 4 แบบ',icon:'🗓️',tier:'gold'},
 {id:'wev_all',n:'ครบทุกสัปดาห์',d:'มีตราครบทั้ง 8 อีเวนต์ประจำสัปดาห์',icon:'🏵️',tier:'legend'},
 {id:'wev_boss',n:'ไม่กลัวคืนคลั่ง',d:'เข้าร่วมราตรีบอสคลั่งแล้วล้มบอสได้ 5 ตัวในรอบเดียว',icon:'💀',tier:'silver'},
 {id:'wev_market',n:'ของถูกต้องรีบซื้อ',d:'ซื้อของตกแต่งราคาพิเศษจากตลาดนัดพ่อค้าเร่',icon:'🛒',tier:'bronze'},
 {id:'wev_world',n:'ดาวหางผ่านหอ',d:'ไต่หอในรอบที่ดาวหางสีรุ้งผ่านยอดหอ',icon:'☄️',tier:'gold',hid:1}]);}catch(e){}
window.WEV={active,list:()=>EVS.slice(),
 force(id){FORCE=BY[id]?id:'';try{FORCE?sessionStorage.setItem(FK,FORCE):sessionStorage.removeItem(FK);}catch(e){}regTab();banner();M.refresh();return active();},
 world(on){try{on===false?sessionStorage.removeItem(WK):sessionStorage.setItem(WK,'1');}catch(e){}return on!==false;}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
