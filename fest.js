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
   {k:'pumpkin',t:'d',n:'โคมฟักทอง',ic:'🎃',c:40,g:600},{k:'ghostlamp',t:'d',n:'ตะเกียงผี',ic:'👻',c:70,g:1000},{k:'cauldron',t:'d',n:'หม้อยาแม่มด',ic:'🫕',c:90,g:1300},{k:'batflag',t:'d',n:'ธงค้างคาว',ic:'🚩',c:50,g:750}]},
 {id:'loy',n:'ลอยกระทง',ic:'🪷',a:[11,15],b:[11,30],it:'🪷',itn:'กลีบบัว',coin:'เหรียญกระทงทอง',col:'#ffd36a',
  d:'คืนเดือนเพ็ญ คนในเมืองพากันไปลอยกระทงที่คูน้ำหน้าหอ เก็บกลีบบัวไว้แลกของงานวัด',
  shop:[{k:'jasmine',t:'w',n:'มาลัยดอกมะลิ',ic:'💮',c:60,g:900},{k:'sabai',t:'w',n:'ผ้าสไบทอง',ic:'🧣',c:90,g:1300},
   {k:'krathong',t:'d',n:'กระทงใบตอง',ic:'🪷',c:50,g:700},{k:'skylantern',t:'d',n:'โคมลอย',ic:'🏮',c:80,g:1100}]},
 {id:'xmas',n:'คริสต์มาสและปีใหม่',ic:'🎄',a:[12,15],b:[1,10],it:'❄️',itn:'เกล็ดหิมะ',coin:'เหรียญดาวเหนือ',col:'#9fd8ff',
  d:'หิมะตกบนยอดหอเป็นครั้งแรกของปี เก็บเกล็ดหิมะไปแลกของขวัญ แล้วไปนับถอยหลังกัน',
  shop:[{k:'santahat',t:'w',n:'หมวกซานต้า',ic:'🎅',c:60,g:900},{k:'antlers',t:'w',n:'เขากวางเรนเดียร์',ic:'🦌',c:80,g:1200},
   {k:'xmastree',t:'d',n:'ต้นคริสต์มาส',ic:'🎄',c:90,g:1300},{k:'snowman',t:'d',n:'ตุ๊กตาหิมะ',ic:'⛄',c:60,g:900}]},
 {id:'songkran',n:'สงกรานต์',ic:'💦',a:[4,10],b:[4,20],it:'💧',itn:'หยดน้ำ',coin:'เหรียญขันเงิน',col:'#6ad0ff',
  d:'หน้าร้อนทั้งหอ มอนสเตอร์ก็ยังโดนสาดน้ำ เก็บหยดน้ำไปแลกเสื้อลายดอกกับขันใบใหม่',
  shop:[{k:'flowershirt',t:'w',n:'เสื้อลายดอก',ic:'🌺',c:60,g:900},{k:'sunglasses',t:'w',n:'แว่นกันแดด',ic:'🕶️',c:50,g:700},
   {k:'waterbowl',t:'d',n:'ขันน้ำพานรอง',ic:'🥣',c:70,g:1000}]}];
const BY={};FESTS.forEach(F=>BY[F.id]=F);
// ภารกิจเทศกาล (นับเฉพาะช่วงเทศกาลนั้นของปีนั้น) รับครบ Q_COIN ข้อได้เหรียญสะสม
const QUESTS=[{id:'runs',n:'ไต่หอ 3 รอบ',v:e=>e.runs,max:3,r:20},{id:'boss',n:'ล้มบอส 10 ตัว',v:e=>e.bosses,max:10,r:40},
 {id:'fl50',n:'ขึ้นถึงชั้น 50 ในรอบเดียว',v:e=>e.maxFl,max:50,r:40},{id:'got',n:'เก็บ{it}ได้ 300',v:e=>e.got,max:300,r:50},
 {id:'hard',n:'ชนะด่านโหมดยาก 3 ด่าน',v:e=>e.hard,max:3,r:60},{id:'buy',n:'แลกของในร้าน 2 ชิ้น',v:e=>e.buy,max:2,r:30}];
const Q_COIN=4;

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
const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
function st(P){if(!isObj(P.mod))P.mod={};const m=P.mod.fest=isObj(P.mod.fest)?P.mod.fest:{};['ev','own','wear'].forEach(k=>{if(!isObj(m[k]))m[k]={};});if(!Array.isArray(m.coins))m.coins=[];return m;}
function ev(m,inst){const e=m.ev[inst]=Object.assign({item:0,got:0,runs:0,bosses:0,maxFl:0,hard:0,buy:0},isObj(m.ev[inst])?m.ev[inst]:{});if(!isObj(e.q))e.q={};return e;}
const joined=m=>Object.keys(m.ev).filter(k=>(m.ev[k].got|0)>0);
const allItems=()=>FESTS.reduce((a,F)=>a.concat(F.shop.map(s=>Object.assign({f:F.id},s))),[]);
const item=k=>allItems().find(s=>s.k===k);
function nm(k){const T=window.TOWN||{},r=(T.WEAR&&T.WEAR[k])||(T.DECOR&&T.DECOR[k]),s=item(k);return(r&&r.n)||(s&&s.n)||k;}
const ic=k=>{const s=item(k);return s?s.ic:'🎁';};
function checkAch(m){const g=M.grantAch;if(joined(m).length)g('fest_join');if(joined(m).length>=3)g('fest_3');
 if(m.coins.some(c=>c.indexOf('halloween-')===0))g('fest_coin_hw');if(BY.halloween.shop.filter(s=>s.t==='w').every(s=>m.own[s.k]))g('fest_hw_all');}
// โหลด แก้ บันทึก แล้ววาดใหม่ · ส่ง P.mod.fest กลับไปให้ตัวที่ถือ P เดิมอยู่ด้วย
function upd(f,P0){const P=M.load(),m=st(P);const r=f(P,m);save(P,m);if(P0&&isObj(P0.mod))P0.mod.fest=m,P0.mod.city=P.mod.city;return r;}
function save(P,m){M.save(P);checkAch(m);M.refresh();banner();}
function gain(n,kind,x){const A=active();if(!A)return 0;n=Math.max(0,Math.round(n));return upd((P,m)=>{const e=ev(m,A.inst);e.item+=n;e.got+=n;if(kind)kind(e,x);m.last={inst:A.inst,n,t:Date.now()};return n;},x&&x.P);}

// จบรอบไต่หอ: ชั้นละครึ่งชิ้น บอสตัวละ 5 พิชิตยอดแถม 30
M.onRun((R,P)=>{const fl=R.won?100:(R.floor|0),b=R.bosses|0;gain(fl/2+b*5+(R.won?30:0),e=>{e.runs++;e.bosses+=b;e.maxFl=Math.max(e.maxFl,fl);},{P});});
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
body.fest-halloween .cert{box-shadow:0 0 0 1px rgba(255,138,58,.22),0 0 18px rgba(255,138,58,.08)}`;document.head.appendChild(s);}
function shopCard(s,e,m,P,F){const own=s.t==='w'&&m.own[s.k],dec=s.t==='d'?((P.mod.city&&Array.isArray(P.mod.city.decor))?P.mod.city.decor.filter(k=>k===s.k).length:0):0;
 return`<div class="mt-card fs-it"><div><span class="ic">${s.ic}</span> <b>${esc(nm(s.k))}</b></div><div class="mt-dim">${s.t==='w'?'แฟชั่น':'ของตกแต่งเมือง'}${dec?` · ตั้งไว้ในเมือง ${dec} ชิ้น`:''}</div>
 ${own?'<div class="mt-dim">✔ มีแล้ว</div>':`<button class="mt-btn pri" data-buy="${s.k}" data-pay="i" ${e.item<s.c?'disabled':''}>${F.it} ${s.c}</button><button class="mt-btn" data-buy="${s.k}" data-pay="g" ${P.gold<s.g?'disabled':''}>🪙 ${s.g.toLocaleString()}</button>`}</div>`;}
function dressHTML(P,m){const W=Object.keys(m.own).filter(k=>m.own[k]&&item(k));
 if(!W.length)return'<p class="mt-dim">ยังไม่มีแฟชั่น แลกจากร้านช่วงเทศกาลได้ ของที่แลกแล้วเป็นของตระกูลตลอดไป</p>';
 if(!P.roster.length)return'<p class="mt-dim">ยังไม่มีสมาชิกในตระกูลให้แต่งตัว ไต่หอให้จบสักรอบก่อน</p>';
 return P.roster.map(x=>`<div class="fs-row"><b>${P.head===x.id?'👑 ':''}${esc(x.name)}</b><select data-wear="${x.id}" aria-label="แฟชั่นของ ${esc(x.name)}"><option value="">ไม่สวม</option>${W.map(k=>`<option value="${k}"${m.wear[x.id]===k?' selected':''}>${ic(k)} ${esc(nm(k))}</option>`).join('')}</select></div>`).join('');}
function collHTML(m){const C=m.coins.map(c=>{const i=c.lastIndexOf('-'),F=BY[c.slice(0,i)];return F?`<span class="fs-coin">${F.ic} ${esc(F.coin)} ${c.slice(i+1)}</span>`:'';}).join('');
 const W=Object.keys(m.own).filter(k=>m.own[k]&&item(k));
 return`<div>${C||'<span class="mt-dim">ยังไม่มีเหรียญเทศกาล ทำภารกิจให้ครบ '+Q_COIN+' ข้อในเทศกาลไหนก็ได้</span>'}</div>${W.length?`<p class="mt-dim" style="margin-top:6px">แฟชั่นที่มี ${W.length}/${allItems().filter(s=>s.t==='w').length}: ${W.map(k=>ic(k)+' '+esc(nm(k))).join(' · ')}</p>`:''}`;}
function schHTML(){return upcoming().map(u=>`<div class="fs-sch"><span>${u.F.ic} ${esc(u.F.n)}</span><span class="mt-dim">${dtxt(u.F.a)} – ${dtxt(u.F.b)} · ${u.on?'<b style="color:var(--gold,#f4bb4a)">เปิดอยู่</b>':`อีก ${u.days} วัน`}</span></div>`).join('');}
function render(el,P){const m=st(P),A=active();let h='';
 if(A){const F=A.F,e=ev(m,A.inst),done=QUESTS.filter(q=>e.q[q.id]).length,has=m.coins.includes(A.inst);
  h+=`<div class="fs-hd" style="--fc:${F.col}"><div><b class="big">${F.ic} เทศกาล${esc(F.n)} ${A.y}</b></div><div class="mt-dim">เปิดถึง ${dtxt(F.b)}${A.left?` (อีก ${A.left} วัน)`:' (วันสุดท้าย)'}</div>
  <p style="margin:6px 0">${esc(F.d)}</p><div class="fs-bal">${F.it} ${esc(F.itn)} ${e.item.toLocaleString()}</div>
  <div class="mt-dim">จบรอบไต่หอได้${esc(F.itn)}ชั้นละครึ่งชิ้น ล้มบอสตัวละ 5 พิชิตยอดหอแถมอีก 30 · ชนะด่านโหมดยากได้ 15 (ด่านแรกที่ผ่าน 25) · ${esc(F.itn)}ใช้ได้ถึงวันจบเทศกาลเท่านั้น</div></div>
  <h3>ภารกิจเทศกาล ${done}/${QUESTS.length}</h3><p class="mt-dim">${has?`ได้${esc(F.coin)}ปี ${A.y} แล้ว ภารกิจที่เหลือยังรับ${esc(F.itn)}ได้`:`รับรางวัลครบ ${Q_COIN} ข้อ ได้${esc(F.coin)}ประจำปี ${A.y} เก็บไว้ในคอลเลกชันตลอดไป`}</p>
  ${QUESTS.map(q=>{const v=Math.min(q.max,q.v(e)|0),ok=v>=q.max,got=e.q[q.id];return`<div class="fs-q" style="--fc:${F.col}"><span class="qn">${esc(q.n.replace('{it}',F.itn))}<br><span class="mt-dim">${v}/${q.max} · รางวัล ${F.it} ${q.r}</span></span><span class="pb"><i style="width:${v/q.max*100}%"></i></span>${got?'<span class="mt-dim">✔ รับแล้ว</span>':`<button class="mt-btn${ok?' pri':''}" data-q="${q.id}" ${ok?'':'disabled'}>รับ</button>`}</div>`;}).join('')}
  <h3>ร้านเทศกาล</h3><p class="mt-dim">จ่ายด้วย${esc(F.itn)}หรือเหรียญเมืองก็ได้ ของตกแต่งไปตั้งอยู่ในเมืองทันที</p><div class="mt-grid">${F.shop.map(s=>shopCard(s,e,m,P,F)).join('')}</div>`;}
 else h+=`<div class="fs-hd"><b class="big">🎪 ตอนนี้ยังไม่มีเทศกาล</b><p class="mt-dim" style="margin:6px 0 0">พอถึงช่วงเทศกาล จบรอบไต่หอหรือชนะโหมดยากจะได้ของเทศกาลไว้แลกแฟชั่นกับของตกแต่งเมือง</p></div>`;
 h+=`<h3>แต่งตัวให้คนในตระกูล</h3>${dressHTML(P,m)}<h3>คอลเลกชัน</h3>${collHTML(m)}<h3>ตารางเทศกาล</h3>${schHTML()}`;
 el.innerHTML=h;
 el.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>upd((P,m)=>{const A=active();if(!A)return;const e=ev(m,A.inst),q=QUESTS.find(x=>x.id===b.dataset.q);
  if(!q||e.q[q.id]||(q.v(e)|0)<q.max)return;e.q[q.id]=1;e.item+=q.r;if(QUESTS.filter(x=>e.q[x.id]).length>=Q_COIN&&!m.coins.includes(A.inst))m.coins.push(A.inst);}));
 el.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>upd((P,m)=>{const A=active();if(!A)return;const e=ev(m,A.inst),s=A.F.shop.find(x=>x.k===b.dataset.buy),g=b.dataset.pay==='g';
  if(!s||(s.t==='w'&&m.own[s.k]))return;if(g?P.gold<s.g:e.item<s.c)return;if(g)P.gold-=s.g;else e.item-=s.c;e.buy++;
  if(s.t==='w')m.own[s.k]=1;else{if(!isObj(P.mod.city))P.mod.city={};if(!Array.isArray(P.mod.city.decor))P.mod.city.decor=[];P.mod.city.decor.push(s.k);M.grantAch('fest_decor');}
  try{window.dispatchEvent(new CustomEvent('tof:fest-buy',{detail:{k:s.k,t:s.t}}));}catch(x){}}));
 el.querySelectorAll('[data-wear]').forEach(sl=>sl.onchange=()=>upd((P,m)=>{const id=sl.dataset.wear,k=sl.value;if(!k)delete m.wear[id];else if(m.own[k]){m.wear[id]=k;M.grantAch('fest_wear');}
  try{window.dispatchEvent(new CustomEvent('tof:fest-wear',{detail:{id,k}}));}catch(x){}}));}
function regTab(){const A=active();M.tab('fest',{n:A?`${A.F.ic} ${A.F.n}`:'🎪 เทศกาล',o:35,render});}

// ---------- บรรยากาศบนหน้าเกิด: แบนเนอร์เล็กบนการ์ด กดแล้วเปิดแท็บเทศกาล ----------
function banner(){const A=active();document.body.className=document.body.className.replace(/\bfest-\w+/g,'').trim();if(A)document.body.classList.add('fest-'+A.F.id);
 const c=document.getElementById('card');if(!c)return;const ex=c.querySelector('#festBan'),birth=!!(c.querySelector('#btnEnter')&&c.querySelector('#inName'));
 if(!A||!birth){if(ex)ex.remove();return;}
 const P=M.load(),m=st(P),e=m.ev[A.inst]||{},L=m.last&&m.last.inst===A.inst&&Date.now()-m.last.t<6e5?m.last.n:0;
 const t=`${A.F.ic} เทศกาล${esc(A.F.n)}เปิดถึง ${dtxt(A.F.b)} · ${A.F.it} ${(e.item|0).toLocaleString()}${L?` <span class="mt-dim">(รอบที่แล้ว +${L})</span>`:''}`;
 if(ex){if(ex.dataset.t!==t){ex.dataset.t=t;ex.querySelector('.t').innerHTML=t;}return;}
 const b=document.createElement('button');b.type='button';b.id='festBan';b.className='fest-ban';b.style.setProperty('--fc',A.F.col);b.dataset.t=t;
 b.innerHTML=`<span class="t">${t}</span><span class="go">ดูร้าน ›</span>`;b.onclick=()=>M.open('fest');c.insertBefore(b,c.firstChild);}
function init(){css();regTab();banner();const c=document.getElementById('card');if(c)new MutationObserver(banner).observe(c,{childList:true});}

try{window.ACH&&window.ACH.add&&window.ACH.add([
 {id:'fest_join',n:'งานวัดเปิดแล้ว',d:'เก็บของเทศกาลได้เป็นครั้งแรก',icon:'🎪',tier:'bronze'},
 {id:'fest_coin_hw',n:'ฟักทองสีทอง',d:'ทำภารกิจฮาโลวีนครบจนได้เหรียญประจำปี',icon:'🎃',tier:'silver'},
 {id:'fest_wear',n:'แต่งตัวไปเที่ยวงาน',d:'จับคนในตระกูลใส่แฟชั่นเทศกาลครั้งแรก',icon:'👒',tier:'bronze'},
 {id:'fest_hw_all',n:'ตู้เสื้อผ้าผีสิง',d:'มีแฟชั่นฮาโลวีนครบทุกชิ้น',icon:'🦇',tier:'gold'},
 {id:'fest_decor',n:'เมืองนี้มีงาน',d:'เอาของตกแต่งเทศกาลไปตั้งในเมือง',icon:'🏮',tier:'bronze'},
 {id:'fest_3',n:'ไม่พลาดสักงาน',d:'ร่วมเทศกาลมาแล้ว 3 ครั้ง',icon:'🎊',tier:'gold'}]);}catch(e){}
window.FEST={active,list:()=>FESTS.slice(),
 force(id){FORCE=BY[id]?id:'';try{FORCE?sessionStorage.setItem(FK,FORCE):sessionStorage.removeItem(FK);}catch(e){}regTab();banner();M.refresh();return active();}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
