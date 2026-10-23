// meta.js — โปรไฟล์ถาวรข้ามรอบ: สมาชิกตระกูล สัตว์เลี้ยง เหรียญเมือง ปลดล็อกเมือง/โหมดยาก
// API: window.META = { load(), save(P), recordRun(R), open(tab), tab(id,def), addGold(n,why), grantAch(id), hasWon(), refresh() }
// เก็บใน localStorage 'tof-meta-v1' · โมดูลอื่น (city.js, hard.js, fest.js ...) เก็บข้อมูลของตัวเองใน P.mod[ชื่อโมดูล]
// ลงทะเบียนแท็บด้วย META.tab('city',{n:'🏘 เมือง',o:20,lock:P=>P.unlock.city?'':'ผ่านชั้น 100 ก่อน',render:(el,P,api)=>{...}})
(function(){
'use strict';
const KEY='tof-meta-v1',SLOT_M=10,SLOT_P=5,SLOT_M_MAX=20,SLOT_P_MAX=6;
const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const C=()=>window.CONTENT||{};
function blank(){return{v:1,gold:0,goldAll:0,wins:0,runs:0,unlock:{city:false,hard:false},roster:[],pets:[],slots:{m:SLOT_M,p:SLOT_P},head:'',statues:[],mod:{}};}
function load(){let P=blank();try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(isObj(v)){P=Object.assign(P,v);P.unlock=Object.assign(blank().unlock,v.unlock);P.slots=Object.assign(blank().slots,v.slots);
 ['roster','pets','statues'].forEach(k=>{if(!Array.isArray(P[k]))P[k]=[];});if(!isObj(P.mod))P.mod={};}}catch(e){}return P;}
function save(P){try{localStorage.setItem(KEY,JSON.stringify(P));}catch(e){}}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function addGold(n,why){const P=load();n=Math.round(+n||0);P.gold=Math.max(0,P.gold+n);if(n>0)P.goldAll+=n;save(P);refresh();return P.gold;}
function grantAch(id){try{window.ACH&&window.ACH.grant&&window.ACH.grant(id);}catch(e){}}
// ฮีโร่ที่จบรอบแล้วเข้าทะเบียนตระกูล (ถ้าที่เต็ม เก็บไว้ในคิว P.wait ให้ผู้เล่นเลือกลบคนเก่าเอง)
function snapHero(R){const h=R.h,K=C().CLASSES||[],Rk=(C().RANKS||[])[h.rank]||{};const ss=R.won&&R.sec&&(R.sec.res==='f'||R.sec.res==='s'); // ผ่านชั้นลับ = แรงค์ SS ในตระกูล
 return{id:uid(),kind:'hero',name:h.name,rank:ss?'SS':(Rk.k||'F'),ri:ss?7:(h.rank|0),cls:(K[h.cls]||{}).id||'',lv:h.lv|0,
 hp:Math.round(h.mhp),atk:Math.round(h.atk),def:Math.round(h.def),luk:Math.round(h.luk),form:(h.look&&h.look.form)||'human',look:h.look||null,
 floor:R.won?100:(R.floor|0),won:!!R.won,sec:(R.sec&&R.sec.res)||'',gen:h.gen||1,t:Date.now()};}
function snapComp(R,c){const h=R.h;return{id:uid(),kind:'merc',name:c.n,rank:'',ri:Math.max(0,(h.rank|0)-1),cls:c.cls||'',lv:Math.max(1,(h.lv|0)-3),
 hp:Math.round(h.mhp*.7),atk:Math.round(h.atk*.7),def:Math.round(h.def*.7),luk:Math.round(h.luk*.7),form:'human',look:null,tr:c.tr||'',floor:R.won?100:(R.floor|0),won:!!R.won,t:Date.now()};}
function recordRun(R){if(!R||!R.h)return;const P=load();P.runs++;
 const fl=R.won?100:(R.floor|0),g=Math.round(fl*2+(R.won?150:0)+((R.sec&&(R.sec.res==='f'||R.sec.res==='s'))?200:0));P.gold+=g;P.goldAll+=g;P.last={g,fl,won:!!R.won,t:Date.now()};
 if(R.won){P.wins++;if(!P.unlock.city){P.unlock.city=true;P.newUnl=1;}if(!P.unlock.hard){P.unlock.hard=true;P.newUnl=1;}
  // หัวหน้าตระกูลคนแรกได้รูปปั้นที่ lobby
  P.statues.push({name:R.h.name,cls:((C().CLASSES||[])[R.h.cls]||{}).id||'',sec:(R.sec&&R.sec.res)||'',t:Date.now()});if(P.statues.length>30)P.statues.shift();}
 const add=[snapHero(R)];if(R.won&&Array.isArray(R.comps))R.comps.slice(0,2).forEach(c=>{if(c&&c.n&&!c.clan)add.push(snapComp(R,c));}); // c.clan = คนในตระกูลที่จ้างจากป้อม มีชื่อในทะเบียนอยู่แล้ว
 P.wait=(Array.isArray(P.wait)?P.wait:[]);add.forEach(m=>{if(P.roster.length<P.slots.m)P.roster.push(m);else P.wait.unshift(m);});P.wait=P.wait.slice(0,6);
 if(R.won&&Array.isArray(R.pets))R.pets.forEach(k=>{if(P.pets.length<P.slots.p&&!P.pets.some(p=>p.k===k&&p.from===R.h.name))P.pets.push({id:uid(),k,from:R.h.name,t:Date.now(),legend:['drk','drs','drg','unicorn','fairy','phoenix','griffin'].includes(k)||undefined});});
 save(P);H.forEach(f=>{try{f(R,P);}catch(e){}});}
// ---------- หน้าต่าง "ตระกูลและเมือง" ----------
const TABS={},H=[];let dlg=null,cur='';
function tab(id,def){TABS[id]=Object.assign({o:50},def);if(dlg)drawTabs();}
function onRun(f){H.push(f);}
function css(){const st=document.createElement('style');st.textContent=`
#metaDlg{max-width:min(680px,calc(100vw - 16px));width:100%;max-height:calc(100dvh - 24px);padding:0;border:2px solid var(--line,#2c3a36);background:var(--bg,#0e1513);color:var(--ink,#e8f1ec);border-radius:10px;overflow:hidden}
#metaDlg::backdrop{background:rgba(0,0,0,.6)}
#metaDlg .mt-hd{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line,#2c3a36)}
#metaDlg .mt-hd h2{margin:0;font-size:17px}#metaDlg .mt-g{font-family:var(--fP,'DotGothic16',monospace);color:var(--gold,#f4bb4a)}
#metaDlg .mt-x{background:none;border:0;color:inherit;font-size:18px;cursor:pointer}
#metaDlg .mt-tabs{display:flex;gap:4px;overflow-x:auto;padding:8px 10px;border-bottom:1px solid var(--line,#2c3a36)}
#metaDlg .mt-tabs button{flex:none;padding:6px 10px;border-radius:6px;border:1px solid var(--line,#2c3a36);background:transparent;color:inherit;font:inherit;font-size:13px;cursor:pointer}
#metaDlg .mt-tabs button[aria-selected=true]{background:var(--gold,#f4bb4a);color:#1a1206;border-color:transparent}
#metaDlg .mt-tabs button.lk{opacity:.55}
#metaDlg .mt-body{padding:12px 14px;overflow-y:auto;max-height:calc(100dvh - 150px);font-size:14px}
.mt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.mt-card{border:1px solid var(--line,#2c3a36);border-radius:8px;padding:8px;background:rgba(255,255,255,.03)}
.mt-card .rk{display:inline-block;padding:0 5px;border-radius:4px;color:#111;font-size:11px;margin-right:4px}
.mt-card.head{border-color:var(--gold,#f4bb4a)}.mt-dim{color:var(--dim,#8aa39a);font-size:12.5px}
.mt-btn{padding:5px 9px;border-radius:6px;border:1px solid var(--line,#2c3a36);background:transparent;color:inherit;font:inherit;font-size:12.5px;cursor:pointer;margin:4px 4px 0 0}
.mt-btn.pri{background:var(--gold,#f4bb4a);color:#1a1206;border-color:transparent}.mt-btn:disabled{opacity:.45;cursor:default}
.mt-lock{padding:28px 10px;text-align:center;color:var(--dim,#8aa39a)}
#btnMeta{position:relative}#btnMeta .dot{position:absolute;top:-4px;right:-4px;width:9px;height:9px;border-radius:50%;background:#ff7a5a}`;document.head.appendChild(st);}
function build(){css();dlg=document.createElement('dialog');dlg.id='metaDlg';dlg.setAttribute('aria-labelledby','metaTitle');
 dlg.innerHTML=`<div class="mt-hd"><h2 id="metaTitle">🏰 ตระกูลและเมือง</h2><span class="mt-g" id="metaGold"></span><button class="mt-x" type="button" aria-label="ปิด">✕</button></div><div class="mt-tabs" role="tablist"></div><div class="mt-body" id="metaBody" role="tabpanel"></div>`;
 document.body.appendChild(dlg);dlg.querySelector('.mt-x').onclick=()=>dlg.close();dlg.addEventListener('click',ev=>{if(ev.target===dlg)dlg.close();});
 dlg.addEventListener('close',()=>{try{window.dispatchEvent(new Event('tof:meta-close'));}catch(e){}});}
const order=()=>Object.keys(TABS).sort((a,b)=>TABS[a].o-TABS[b].o);
function drawTabs(){const P=load(),el=dlg.querySelector('.mt-tabs');el.innerHTML=order().map(k=>{const T=TABS[k],lk=T.lock&&T.lock(P);return`<button type="button" role="tab" data-t="${k}" class="${lk?'lk':''}" aria-selected="${k===cur}">${lk?'🔒 ':''}${esc(T.n)}</button>`;}).join('');
 el.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>show(b.dataset.t));}
function show(k){if(!TABS[k])k=order()[0];cur=k;drawTabs();refresh();}
function refresh(){if(!dlg||!dlg.open)return;const P=load(),T=TABS[cur],b=$b();const g=dlg.querySelector('#metaGold');if(g)g.textContent=`🪙 ${P.gold.toLocaleString()} เหรียญเมือง`;
 if(!T){b.innerHTML='';return;}const lk=T.lock&&T.lock(P);if(lk){b.innerHTML=`<div class="mt-lock">🔒 ${esc(lk)}</div>`;return;}
 try{T.render(b,P,API);}catch(e){b.innerHTML=`<div class="mt-lock">หน้านี้เปิดไม่ขึ้น</div>`;console.error(e);}}
const $b=()=>dlg.querySelector('#metaBody');
function open(k){if(!dlg)build();const P=load();if(P.newUnl){delete P.newUnl;save(P);}if(!dlg.open)dlg.showModal();show(k||cur);try{const d=document.querySelector('#btnMeta .dot');if(d)d.remove();}catch(e){}}
function hasWon(){return load().wins>0;}
// ---------- แท็บพื้นฐาน: สมาชิกตระกูล ----------
function rkCol(k){const r=(C().RANKS||[]).find(x=>x.k===k);return r?r.col:(k==='Master'?'#ffffff':'#888');}
function clsN(id){const c=(C().CLASSES||[]).find(x=>x.id===id);return c?c.n:'';}
function memberCard(m,P){const hd=P.head===m.id;return`<div class="mt-card${hd?' head':''}"><div>${m.rank?`<span class="rk" style="background:${rkCol(m.master?'Master':m.rank)}">${m.master?'Master':esc(m.rank)}</span>`:''}<b>${esc(m.name)}</b>${hd?' 👑':''}</div>
 <div class="mt-dim">${m.kind==='merc'?'ลูกจ้าง · ':''}${esc(clsN(m.cls))} Lv.${m.lv} · ${m.won?'พิชิตยอด':'ชั้น '+m.floor}</div><div class="mt-dim">HP ${m.hp} ATK ${m.atk} DEF ${m.def} LUK ${m.luk}</div>
 ${m.kind==='hero'&&m.won&&!hd?`<button class="mt-btn" data-head="${m.id}">ตั้งเป็นหัวหน้าตระกูล</button>`:''}${!hd?`<button class="mt-btn" data-del="${m.id}">ลบออก</button>`:''}</div>`;}
function slotCost(kind,P){return kind==='m'?600+(P.slots.m-SLOT_M)*300:800+(P.slots.p-SLOT_P)*800;}
tab('clan',{n:'👪 สมาชิกตระกูล',o:10,render(el,P){const W=Array.isArray(P.wait)?P.wait:[],PE=C().PETS||{};
 const mMax=P.slots.m>=SLOT_M_MAX,pMax=P.slots.p>=SLOT_P_MAX,cm=slotCost('m',P),cp=slotCost('p',P);
 el.innerHTML=`<p class="mt-dim">ทุกคนที่ไต่หอจบรอบจะเข้ามาอยู่ในตระกูล ใช้เป็นกองทัพและตี้ลงดันเจี้ยนโหมดยากได้ ลูกจ้างที่รอดถึงยอดหอก็ตามมาด้วย</p>
 <h3>สมาชิก ${P.roster.length}/${P.slots.m}</h3>${P.roster.length?[['hero','🧝 ฮีโร่'],['merc','🛡 ลูกจ้าง']].map(([k,t])=>{const L=P.roster.filter(m=>(m.kind==='merc')===(k==='merc'));return L.length?`<h4 style="margin:10px 0 6px">${t} ${L.length} คน</h4><div class="mt-grid">${L.map(m=>memberCard(m,P)).join('')}</div>`:'';}).join(''):'<span class="mt-dim">ยังไม่มีใคร ลองไต่หอให้จบสักรอบ</span>'}
 <button class="mt-btn" data-slot="m" ${mMax||P.gold<cm?'disabled':''}>${mMax?'ช่องสมาชิกเต็มขั้นแล้ว':`เพิ่มช่องสมาชิก (🪙 ${cm})`}</button>
 ${W.length?`<h3>รอเข้าตระกูล (ที่เต็ม)</h3><p class="mt-dim">ลบคนเก่าออกก่อน แล้วรับคนใหม่เข้ามา</p><div class="mt-grid">${W.map(m=>`<div class="mt-card"><b>${esc(m.name)}</b><div class="mt-dim">${esc(clsN(m.cls))} Lv.${m.lv} · ${m.won?'พิชิตยอด':'ชั้น '+m.floor}</div><button class="mt-btn pri" data-take="${m.id}" ${P.roster.length>=P.slots.m?'disabled':''}>รับเข้าตระกูล</button><button class="mt-btn" data-drop="${m.id}">ปล่อยไป</button></div>`).join('')}</div>`:''}
 <h3>🐾 สัตว์เลี้ยง ${P.pets.length}/${P.slots.p}</h3><div class="mt-grid">${P.pets.map(p=>{const d=PE[p.k]||{n:p.k};return`<div class="mt-card"><b>${p.legend?'✨ ':''}${esc(d.n)}</b><div class="mt-dim">${esc(d.d||'')}</div><div class="mt-dim">จาก ${esc(p.from||'')}</div><button class="mt-btn" data-pdel="${p.id}">ปล่อยคืนป่า</button></div>`;}).join('')||'<span class="mt-dim">สัตว์ที่อยู่กับคุณจนพิชิตยอดหอจะมาอยู่ที่นี่</span>'}</div>
 <button class="mt-btn" data-slot="p" ${pMax||P.gold<cp?'disabled':''}>${pMax?'ช่องสัตว์เลี้ยงเต็มขั้นแล้ว':`เพิ่มช่องสัตว์เลี้ยง (🪙 ${cp})`}</button>`;
 const upd=f=>{const Q=load();f(Q);save(Q);refresh();};
 el.querySelectorAll('[data-head]').forEach(b=>b.onclick=()=>upd(Q=>{Q.head=b.dataset.head;grantAch('meta_head');}));
 el.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(!confirm('ลบสมาชิกคนนี้ออกจากตระกูล? ลบแล้วเอาคืนไม่ได้'))return;upd(Q=>{Q.roster=Q.roster.filter(m=>m.id!==b.dataset.del);});});
 el.querySelectorAll('[data-take]').forEach(b=>b.onclick=()=>upd(Q=>{const i=(Q.wait||[]).findIndex(m=>m.id===b.dataset.take);if(i>=0&&Q.roster.length<Q.slots.m)Q.roster.push(Q.wait.splice(i,1)[0]);}));
 el.querySelectorAll('[data-drop]').forEach(b=>b.onclick=()=>upd(Q=>{Q.wait=(Q.wait||[]).filter(m=>m.id!==b.dataset.drop);}));
 el.querySelectorAll('[data-pdel]').forEach(b=>b.onclick=()=>{if(!confirm('ปล่อยสัตว์ตัวนี้คืนป่า?'))return;upd(Q=>{Q.pets=Q.pets.filter(p=>p.id!==b.dataset.pdel);});});
 el.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>upd(Q=>{const k=b.dataset.slot,c=slotCost(k,Q),mx=k==='m'?SLOT_M_MAX:SLOT_P_MAX;if(Q.gold<c||Q.slots[k]>=mx)return;Q.gold-=c;Q.slots[k]++;grantAch('meta_slot');}));}});
// ปุ่มเปิดบนหน้าเกิด (auto.js เรียก META.button() ใน renderBirth)
function button(){const P=load();return`<button class="btn" id="btnMeta" type="button">🏰 ตระกูลและเมือง${P.newUnl?'<span class="dot"></span>':''}</button>`;}
function bind(){const b=document.getElementById('btnMeta');if(b)b.onclick=()=>open();}
try{window.ACH&&window.ACH.add&&window.ACH.add([{id:'meta_head',n:'ลูกรักของตระกูล',d:'ตั้งผู้พิชิตยอดหอเป็นหัวหน้าตระกูล',icon:'👑',tier:'gold'},{id:'meta_slot',n:'บ้านหลังใหญ่ขึ้น',d:'จ่ายเหรียญเมืองเพิ่มช่องในตระกูล',icon:'🏠',tier:'bronze'}]);}catch(e){}
const API={load,save,refresh,addGold,grantAch,open,uid,esc,clsN,rkCol};
window.META=Object.assign(API,{recordRun,tab,onRun,hasWon,button,bind,SLOT_M_MAX,SLOT_P_MAX,hasTab:id=>!!TABS[id],tabLock:id=>{const T=TABS[id];return T&&T.lock?T.lock(load()):'';}});
})();
