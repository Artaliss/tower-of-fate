// gate.js — เมืองแรกตอนเปิดเกม + ป้อมทหารรับจ้าง (จ้างคน 1 คนพาเข้าหอในรอบถัดไป)
// โหลดต่อจาก town.js ก่อน auto.js (ห่อ META.button/bind ต่อจาก town.js) · auto.js startRun เรียก HIRE.take(R,{cp,nec,say})
// P.mod.hire = {cur:{n,cls,tr,k,cost,mid?}|null, n:จ้างไปกี่ครั้ง} · mid = id สมาชิกตระกูล (คอมพ์ได้ c.clan=mid, recordRun ไม่ลงทะเบียนซ้ำ)
// พลังตอนเข้าหอเท่าเพื่อนที่เจอราวชั้น 3 (ไม่ใช้พลังจริงของสมาชิก) แล้วโตตามชั้นแบบเพื่อนร่วมทางทั่วไป
(function(){
'use strict';
if(!window.META)return;
const M=window.META,TW=()=>window.TOWN,A=()=>window.ART||{},C=()=>window.CONTENT||{},esc=M.esc;
const FL=3,CMAP={war:'war',mag:'mag',arc:'arc',pri:'pri',rog:'arc',far:'war',dra:'war',dsl:'war',nec:'mag',ang:'pri'};
const st=P=>P.mod.hire=Object.assign({cur:null,n:0},P.mod.hire||{});
const upd=f=>{const P=M.load(),r=f(P,st(P));M.save(P);M.refresh();return r;};
const trOf=id=>(C().TRAITS||[]).find(t=>t.id===id)||null;
const clsN=id=>{const c=(C().CLASSES||[]).find(x=>x.id===id);return c?c.n:'';};
const fmt=n=>Math.round(n).toLocaleString();
// อาชีพที่โชว์: สมาชิกตระกูลโชว์อาชีพจริง ถ้าในหอต้องสู้แบบอาชีพพื้นฐานอื่นก็บอกไว้ด้วย (เช่น ชาวไร่สู้แบบนักรบ)
const clsTxt=o=>{const a=clsN(o.mc||o.cls),b=clsN(o.cls);return o.mc&&o.mc!==o.cls&&a?`${a} (สู้แบบ${b})`:b;};
// ฮีโร่บนหน้าเกิดตอนนี้เป็นเนโครแมนเซอร์ไหม (จ้างใครไม่ได้ตามกติกาเดิม)
function necNow(){try{const S=window.__auto&&window.__auto.S,h=S&&S.hero,K=C().CLASSES||[];return!!(h&&K[h.cls]&&K[h.cls].id==='nec');}catch(e){return false;}}
// ---------- ทหารรับจ้างสุ่ม 3 คน เปลี่ยนทุกวัน ----------
function dayKey(){const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function rng(s){let a=7;for(const ch of s)a=Math.imul(a^ch.charCodeAt(0),2654435761);return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function offers(){const r=rng('tof-hire-'+dayKey()),N=C().COMPN||['ทหาร'],TR=C().TRAITS||[{id:'loyal'}],cl=['war','mag','arc','pri'],out=[];
 for(let i=0;i<3;i++){const T=TR[Math.floor(r()*TR.length)];let n=N[Math.floor(r()*N.length)];while(out.some(o=>o.n===n))n=N[(N.indexOf(n)+1)%N.length];
  out.push({id:'d'+dayKey()+'-'+i,n,cls:cl[Math.floor(r()*4)],tr:T.id,k:1,cost:Math.round((55+r()*25)*(T.cost||1))});}return out;}
// ---------- คนในตระกูล ----------
const inj=(P,id)=>{const h=(P.mod.hard||{}).inj||{};return(h[id]||0)>Date.now();};
const busy=id=>{try{return!!(window.CITY&&window.CITY.busy&&window.CITY.busy(id));}catch(e){return false;}};
function why(P,m){return busy(m.id)?'ไปทำงานในเมือง':inj(P,m.id)?'บาดเจ็บจากดันเจี้ยน':'';}
function memOffer(m){const ri=Math.max(0,Math.min(7,m.ri|0));return{id:m.id,mid:m.id,n:m.name,mc:m.cls||'',cls:CMAP[m.cls]||'war',tr:m.kind==='merc'&&trOf(m.tr)?m.tr:'loyal',k:1+ri*.04,cost:90+ri*15};}
// ---------- auto.js เรียกตอนกดเข้าหอ ----------
function take(R,o){const P=M.load(),h=st(P),c=h.cur;if(!c)return null;h.cur=null;
 const back=t=>{P.gold+=c.cost;M.save(P);o.say(`${t} เหรียญเมือง ${fmt(c.cost)} คืนเข้าคลังตระกูลแล้ว`,'info');return null;};
 if(o.nec)return back(`${c.n}เห็นโครงกระดูกรอบตัวคุณแล้วถอยกรูด ไม่ยอมมาด้วย`);
 if(c.mid){const m=P.roster.find(x=>x.id===c.mid);if(!m||why(P,m))return back(`${c.n}ติดธุระ มาด้วยไม่ได้`);}
 M.save(P);const T=trOf(c.tr)||{};
 const cp={n:c.n,cls:c.cls,pw:(4+FL*.6)*(o.cp||1)*(T.pw||1)*(c.k||1),tr:c.tr,line:(T.lines||[''])[0],cm:T.cost||1,hired:1};if(c.mid){cp.clan=c.mid;if(R)R.clanGo=c.mid;} // fest.js นับภารกิจสงกรานต์จาก R.clanGo แม้คนในตระกูลจะล้มกลางทาง
 o.say(c.mid?`${c.n}จากตระกูลเดินตามเข้าหอมาด้วย`:`${c.n} ทหารรับจ้างจากป้อม เดินตามเข้าหอมาด้วย`,'good');return cp;}
M.onRun(R=>{if(R&&R.won&&Array.isArray(R.comps)&&R.comps.some(c=>c&&c.clan))M.grantAch('hire_clanwin');});
// ---------- สไปรต์เล็กในการ์ด ----------
function sprOf(o,P){try{if(o.mid){const m=P.roster.find(x=>x.id===o.mid);if(m)return TW().spOf(m);}return A().compSpr({n:o.n,cls:o.cls,tr:o.tr});}catch(e){return null;}}
function paint(cv,s){if(!s||!s.rows)return;cv.width=s.w;cv.height=s.h;const x=cv.getContext('2d');s.rows.forEach((row,y)=>{for(let i=0;i<row.length;i++){const col=s.pal[row[i]];if(row[i]==='.'||!col)continue;x.fillStyle=col;x.fillRect(i,y,1,1);}});}
// ---------- แท็บป้อมทหารรับจ้าง ----------
function css(){if(document.getElementById('hireCss'))return;const s=document.createElement('style');s.id='hireCss';s.textContent=`
.hr-card{display:flex;gap:8px;align-items:center}.hr-card canvas{flex:none;width:36px;height:auto;image-rendering:pixelated}
.hr-card .hr-t{min-width:0;flex:1}.hr-cur{border-color:var(--gold,#f4bb4a)}
.hire-strip{flex:1 1 100%;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 10px;padding:6px 10px;border:1px dashed var(--gold,#f4bb4a);border-radius:8px;font-size:13.5px}
.hire-strip .btn{padding:4px 10px;font-size:12.5px}
#townGate{position:fixed;inset:0;z-index:60;overflow-y:auto;background:var(--bg,#0b1215);color:var(--ink,#f1e7d0)}
#townGate .tg-in{max-width:620px;margin:0 auto;padding:12px 16px 24px}
#townGate .tg-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
#townGate .tg-sub{margin:0;font-size:12.5px;color:var(--muted,#a3b5ad);text-align:center}
#townGate .tw-wrap{max-width:min(100%,calc((100dvh - 150px)*1.2));min-width:min(100%,300px);margin-top:6px}
.tp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
.tp-it{display:flex;gap:8px;align-items:flex-start;padding:6px 8px;border-radius:8px;border:1px solid var(--line,#2c3a36);background:rgba(255,255,255,.03)}
.tp-it .ic{font-size:20px;flex:none}.tp-it b{display:block;font-size:13px}.tp-it small{display:block;font-size:11.5px;color:var(--dim,#8aa39a)}
.tp-it.gold{border-color:#f4bb4a}.tp-it.legend{border-color:#ff7a5a}.tp-it.silver{border-color:#c8d0d8}.tp-it.bronze{border-color:#c0804a}.tp-it.off{opacity:.45;border-color:var(--line,#2c3a36)}
.tp-row{display:flex;flex-wrap:wrap;gap:6px}.tp-coin{padding:4px 9px;border-radius:999px;border:1px solid var(--gold,#f4bb4a);font-size:12.5px}
#townGate .tg-go{display:block;width:100%;margin:12px 0 0;padding:14px;border-radius:10px;border:0;background:var(--gold,#f4bb4a);color:#1a1206;font:inherit;font-size:18px;font-weight:700;cursor:pointer}
#townGate .tg-go:focus-visible{outline:3px solid #fff;outline-offset:2px}
#townGate .tw-bld{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}
#townGate .hire-strip{margin-top:10px}`;document.head.appendChild(s);}
function card(o,P,btn,cur){const T=trOf(o.tr),m=o.mid&&P.roster.find(x=>x.id===o.mid);
 return`<div class="mt-card hr-card${cur?' hr-cur':''}"><canvas data-spr="${esc(o.id)}" width="1" height="1" aria-hidden="true"></canvas><div class="hr-t">
 <div>${m&&m.rank?`<span class="rk" style="background:${M.rkCol(m.master?'Master':m.rank)}">${m.master?'Master':esc(m.rank)}</span>`:''}<b>${esc(o.n)}</b>${P.head===o.mid?' 👑':''}</div>
 <div class="mt-dim">${esc(clsTxt(o))}${T?' · '+esc(T.n):''}${m?` · ${m.kind==='merc'?'ลูกจ้างเก่า':'ฮีโร่รุ่นก่อน'}`:''}</div>${T&&T.d?`<div class="mt-dim">${esc(T.d)}</div>`:''}${btn}</div></div>`;}
function render(el,P){css();const h=st(P),cur=h.cur,nec=necNow(),of=offers(),fam=P.roster.map(m=>({m,o:memOffer(m),w:why(P,m)}));
 const hb=o=>{const mine=cur&&cur.id===o.id,cost=o.cost;if(mine)return`<button class="mt-btn" data-hx="1">ยกเลิก คืน 🪙 ${fmt(cur.cost)}</button>`;
  const refund=cur?cur.cost:0,lack=P.gold+refund<cost;return`<button class="mt-btn pri" data-hire="${esc(o.id)}" ${nec||lack?'disabled':''}>${cur?'เปลี่ยนเป็นคนนี้':'จ้าง'} 🪙 ${fmt(cost)}</button>`;};
 el.innerHTML=`<p class="mt-dim" style="margin-top:0">จ้างได้ 1 คนต่อรอบ คนที่จ้างจะเดินตามเข้าหอตอนกดเข้าหอครั้งถัดไป ฝีมือตอนเริ่มเท่ากับเพื่อนที่เจอในหอชั้นแรกๆ แล้วเก่งขึ้นตามชั้นที่ไต่ขึ้นไป ยกเลิกก่อนเข้าหอได้ เหรียญคืนเต็มจำนวน</p>
 ${nec?'<p class="tw-note">💀 ฮีโร่ชาตินี้เป็นเนโครแมนเซอร์ ไม่มีใครยอมเดินข้างโครงกระดูก ชาตินี้จ้างใครไม่ได้</p>':''}
 ${cur?`<h3>จะตามไปด้วยรอบหน้า</h3>${card(cur,P,`<button class="mt-btn" data-hx="1">ยกเลิก คืน 🪙 ${fmt(cur.cost)}</button>`,true)}`:''}
 <h3>คนในตระกูล</h3>${fam.length?`<div class="mt-grid">${fam.map(x=>x.o.id===(cur&&cur.id)?'':card(x.o,P,x.w?`<button class="mt-btn" disabled>${x.w}</button>`:hb(x.o))).join('')}</div>`:'<p class="mt-dim">ยังไม่มีใครในตระกูล ไต่หอจบสักรอบแล้วฮีโร่คนนั้นจะกลับมาอยู่ที่นี่</p>'}
 <h3>ทหารรับจ้างวันนี้</h3><p class="mt-dim" style="margin-top:0">หน้าใหม่มาที่ป้อมทุกวัน พรุ่งนี้จะเป็นอีกชุด</p><div class="mt-grid">${of.map(o=>o.id===(cur&&cur.id)?'':card(o,P,hb(o))).join('')}</div>
 <button class="mt-btn" data-clan="1">👪 ดูสมาชิกตระกูลทั้งหมด</button>`;
 const all=[...(cur?[cur]:[]),...fam.map(x=>x.o),...of];el.querySelectorAll('canvas[data-spr]').forEach(cv=>{const o=all.find(x=>x.id===cv.dataset.spr);if(o)paint(cv,sprOf(o,P));});
 el.querySelectorAll('[data-hx]').forEach(b=>b.onclick=()=>cancel());
 el.querySelectorAll('[data-clan]').forEach(b=>b.onclick=()=>M.open('clan'));
 el.querySelectorAll('[data-hire]').forEach(b=>b.onclick=()=>{const id=b.dataset.hire;if(necNow())return;
  const ok=upd((Q,hh)=>{const m=Q.roster.find(x=>x.id===id),o=m?memOffer(m):offers().find(x=>x.id===id);if(!o||(m&&why(Q,m)))return false;
   const back=hh.cur?hh.cur.cost:0;if(Q.gold+back<o.cost)return false;Q.gold+=back-o.cost;hh.cur=o;hh.n++;return true;});
  if(ok){M.grantAch('hire_first');syncAll();}});}
function cancel(){upd((Q,hh)=>{if(hh.cur){Q.gold+=hh.cur.cost;hh.cur=null;}});syncAll();}
M.tab('merc',{n:'🛡 ป้อมทหารรับจ้าง',o:8,render});
try{window.ACH&&window.ACH.add&&window.ACH.add([
 {id:'hire_first',n:'ค่าจ้างงวดแรก',d:'จ้างคนจากป้อมทหารรับจ้างให้ตามเข้าหอ',icon:'🛡',tier:'bronze',ext:1},
 {id:'hire_clanwin',n:'ขึ้นยอดไปด้วยกัน',d:'พาคนในตระกูลเข้าหอไปด้วย แล้วพิชิตยอดหอโดยเขายังอยู่ข้างกาย',icon:'🤝',tier:'gold',ext:1}]);}catch(e){}
// ---------- แถบบนหน้าเกิด: ใครจะตามไปด้วย ----------
function stripHTML(P){const c=st(P).cur;if(!c){return P.runs>0?`<button class="btn" type="button" data-hgo="1">🛡 จ้างคนตามเข้าหอที่ป้อม</button>`:'';}
 const T=trOf(c.tr);return`<div class="hire-strip" role="status">${necNow()?`<span>💀 ${esc(c.n)}ไม่ยอมเดินกับเนโครแมนเซอร์ ถ้าเข้าหอไปแบบนี้ เหรียญจะคืนเอง</span>`:`<span>🛡 ตามไปด้วยรอบนี้: <b>${esc(c.n)}</b> · ${esc(clsTxt(c))}${T?' · '+esc(T.n):''}</span>`}
 <button class="btn" type="button" data-hx="1">ยกเลิก คืน 🪙 ${fmt(c.cost)}</button></div>`;}
function bindStrip(root){(root||document).querySelectorAll('[data-hx]').forEach(b=>{if(b.closest('#metaDlg'))return;b.onclick=()=>cancel();});
 (root||document).querySelectorAll('[data-hgo]').forEach(b=>{if(b.closest('#metaDlg'))return;b.onclick=()=>M.open('merc');});}
const ob=M.button,obd=M.bind;
M.button=function(){css();return ob.apply(this,arguments)+`<span id="hireBirth" style="display:contents">${stripHTML(M.load())}</span>`;};
M.bind=function(){obd.apply(this,arguments);try{bindStrip();}catch(e){}};
// ซิงก์หน้าเกิดกับหน้าเมืองหลังจ้าง/ยกเลิก โดยไม่ต้องวาดหน้าเกิดใหม่ทั้งหน้า
function syncAll(){const P=M.load();const hb=document.getElementById('hireBirth');if(hb){hb.innerHTML=stripHTML(P);bindStrip(hb);}if(gate)gateSync();}
window.addEventListener('tof:meta-close',()=>{try{syncAll();}catch(e){}});
// ---------- เมืองแรกตอนเปิดเกม ----------
let gate=null,keyH=null;
function gateOk(){try{const S=window.__auto&&window.__auto.S;if(!S||S.phase!=='birth'||S.R)return false;if(!(M.load().runs>0))return false;
 const L=location;if(L.search||/\/(s|m)\//.test(L.pathname))return false;if(window.SHARE&&window.SHARE.friend)return false;return!!(window.TOWN&&window.TOWN.scene);}catch(e){return false;}}
function gateSync(){if(!gate)return;const P=M.load();try{TW().hudSync();}catch(e){}
 const hs=gate.querySelector('.tg-hire');if(hs){hs.innerHTML=stripHTML(P);bindStrip(hs);}
 const T=TW();gate.querySelectorAll('[data-tgo]').forEach(b=>{const d=T.BLD.find(x=>x.id===b.dataset.tgo),tb=d&&T.tabOf(d.tab),lk=tb&&T.tabLk(d.tab);b.disabled=!tb;const s=b.querySelector('small');if(s)s.textContent=!tb?'เร็วๆ นี้':lk?'🔒 ยังเข้าไม่ได้':d.id==='clan'?'จ้างคนตามเข้าหอ':'แตะเพื่อเข้าไป';});}
function gateClose(){if(!gate)return;gate.remove();gate=null;document.body.style.overflow='';if(keyH)window.removeEventListener('keydown',keyH,true);keyH=null;
 try{window.scrollTo(0,0);const b=document.getElementById('btnEnter');if(b)b.focus({preventScroll:true});}catch(e){}}
function gateOpen(){const T=TW(),P=M.load();T.css();css();
 gate=document.createElement('div');gate.id='townGate';gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');gate.setAttribute('aria-labelledby','tgT');
 gate.innerHTML=`<div class="tg-in"><h2 id="tgT" class="tg-sr">เมืองของ${esc(T.clanName(P).n)}</h2>
 <p class="tg-sub">แวะจ้างคนที่ป้อมก่อนก็ได้ หรือจะตรงไปหอคอยเลยก็ได้</p>
 <div class="tw-wrap"><canvas class="tw-cv" width="${T.W}" height="${T.H}" role="img" aria-label="ลานกลางเมืองของตระกูล มีน้ำพุ รูปปั้นหัวหน้าตระกูล และคนในตระกูลเดินเล่น"></canvas><div class="tw-pop" hidden></div></div>
 <div class="tg-hire"></div>
 <button class="tg-go" type="button" id="tgGo">ไปหอคอย ▲</button>
 <div class="tw-bld">${T.BLD.filter(b=>b.tab).map(b=>`<button class="mt-btn" type="button" data-tgo="${b.id}">${b.ic} ${esc(b.n)}<small></small></button>`).join('')}</div></div>`;
 document.body.appendChild(gate);document.body.style.overflow='hidden';
 gate.querySelector('#tgGo').onclick=gateClose;
 gate.querySelectorAll('[data-tgo]').forEach(b=>b.onclick=()=>{const d=T.BLD.find(x=>x.id===b.dataset.tgo);if(d)T.go(d);});
 const cv=gate.querySelector('.tw-cv');T.tapper(cv,gate.querySelector('.tw-pop'),T.scene(cv,P),P,T.hud(gate.querySelector('.tw-wrap'),P,{portal:gateClose}));gateSync();
 // auto.js กด Enter/1-4 แล้วเข้าหอทันที: กันไว้ตอนหน้าเมืองเปิดอยู่ ปุ่มที่โฟกัสยังกดได้ตามปกติ
 keyH=e=>{if(!gate)return;const t=e.target;if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))return;const dl=document.getElementById('metaDlg');
  if(e.key==='Escape'&&!(dl&&dl.open)){e.preventDefault();gateClose();return;}if(e.key==='Enter'||e.key===' '||/^[1-4]$/.test(e.key))e.stopPropagation();};
 window.addEventListener('keydown',keyH,true);try{gate.querySelector('#tgGo').focus({preventScroll:true});}catch(e){}
 try{if(T.grants)T.grants(P);else M.grantAch('town_open');}catch(e){}}
function boot(){try{if(gateOk())gateOpen();}catch(e){console.error(e);}}
// รอให้โมดูลที่ลงแท็บตอน DOMContentLoaded (fest.js) ทำงานก่อน ไม่งั้นปุ่มร้านเทศกาลบนหน้าเมืองขึ้นว่า "เร็วๆ นี้"
const bootL=()=>setTimeout(boot,0);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootL);else bootL();
// ---------- ห้องรางวัล (ปุ่มบ้านมุมซ้ายล่างของลาน): ความสำเร็จของระบบตระกูล เหรียญตราเทศกาล โล่รางวัลเควส ----------
const ACHP=/^(meta_|town_|city_|hd_|fest_|hire_|leg_|clan_name)/;
M.tab('trophy',{n:'🏆 ห้องรางวัล',o:6,render(el,P){css();let L=[];try{L=window.ACH.list().filter(a=>ACHP.test(a.id));}catch(e){}const got=L.filter(a=>a.got).length;
 const fs=((P.mod.fest||{}).coins)||[],FS=(window.FEST&&window.FEST.list)?window.FEST.list():[],cp=((P.mod.city||{}).perm)||{};let PQ=[];try{PQ=window.CITY.perm().filter(q=>!q.hard||P.unlock.hard);}catch(e){}
 const coin=c=>{const i=c.lastIndexOf('-'),F=FS.find(f=>f.id===c.slice(0,i));return`<span class="tp-coin">${F?`${F.ic} ${esc(F.coin||F.n)}`:'🎖 '+esc(c.slice(0,i))} ${esc(c.slice(i+1))}</span>`;};
 el.innerHTML=`<p class="mt-dim" style="margin-top:0">ของที่ตระกูลสะสมมาทั้งหมดอยู่ในห้องนี้</p>
 <h3>🏅 ความสำเร็จของตระกูล ${got}/${L.length}</h3><div class="tp-grid">${L.map(a=>{const sh=a.got||!a.hid;return`<div class="tp-it ${a.got?esc(a.tier||''):'off'}"><span class="ic" aria-hidden="true">${sh?esc(a.icon||'🏅'):'❔'}</span><span><b>${sh?esc(a.n):'???'}</b><small>${sh?esc(a.d):'ยังเป็นความลับ'}</small></span></div>`;}).join('')||'<span class="mt-dim">ยังไม่มี</span>'}</div>
 <h3>🎖 เหรียญตราเทศกาล ${fs.length}</h3>${fs.length?`<div class="tp-row">${fs.map(coin).join('')}</div>`:'<p class="mt-dim">ยังไม่มี ทำภารกิจเทศกาลให้ครบแล้วจะได้เหรียญประจำปีมาเก็บไว้ที่นี่</p>'}
 <h3>🏆 โล่รางวัลเควส</h3>${PQ.length?`<div class="tp-grid">${PQ.map(q=>{const n=Math.min(q.st,cp[q.id]|0);return`<div class="tp-it ${n>=q.st?'gold':n?'silver':'off'}"><span class="ic" aria-hidden="true">${esc(q.ic)}</span><span><b>${esc(q.n)}</b><small>${'🏆'.repeat(n)}${'▫️'.repeat(q.st-n)} ส่งแล้ว ${n}/${q.st} ขั้น</small></span></div>`;}).join('')}</div>`:'<p class="mt-dim">กระดานเควสยังไม่เปิด</p>'}`;}});
window.HIRE={take,offers,open:()=>M.open('merc'),gate:gateOpen,closeGate:gateClose};
})();
