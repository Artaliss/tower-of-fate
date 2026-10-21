// leaderboard.js — กระดานอันดับ + ความสำเร็จ + สถิติของฉัน
// API: window.LB = { submit(summary), open(tab?), flush(), mine() }
// POST/GET '/api/scores' (Cloudflare Pages Function). ส่งไม่สำเร็จจะเก็บคิวไว้ใน localStorage แล้วส่งใหม่ตอนโหลดครั้งหน้า
(function(){
'use strict';
const API='/api/scores',VER='tof-1';
const K_Q='tof-lb-queue-v1',K_MINE='tof-lb-mine-v1',K_IDS='tof-lb-ids-v1';
const RANKC={F:'#9aa0a6',E:'#a7c48f',D:'#6fc0a8',C:'#74acdf',B:'#c39be8',A:'#f0a64e',S:'#f6d84e',SS:'#ff7a5a'};
const CLSN={war:'นักรบ',mag:'จอมเวท',arc:'นักธนู',pri:'นักบวช',rog:'โจร',far:'ชาวไร่',dra:'อัศวินมังกร',dsl:'นักล่ามังกร'};
const DRG=['','n','f','s','x'],CLAN=['','f','s','d']; // ชั้นลับมังกร (v2.1) ไม่อยู่ใน canon() เพื่อให้ client เก่ายังส่งผ่าน
const RANKS=Object.keys(RANKC),FORMS=['slime','human'];

// ---- shared with functions/api/scores.js (keep identical) ----
function fnv(s){let h=2166136261>>>0;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function clean(v,max){let s=typeof v==='string'?v:'';
 s=s.replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g,'').replace(/[<>"'`\\]/g,'').replace(/\s+/g,' ').trim();
 return Array.from(s).slice(0,max).join('').trim();}
function canon(e){return [e.name,e.village,e.rankK,e.clsId,e.form,e.floor,e.won?1:0,e.title,e.score,e.karma,e.gen,e.ach,e.date].join('|');}
// ---------------------------------------------------------------

const num=v=>{const n=+v;return isFinite(n)?n:0;};
const int=(v,lo,hi)=>Math.min(hi,Math.max(lo,Math.round(num(v))));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function rd(k,d){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v;}catch(e){return d;}}
function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
const cmp=(a,b)=>((b.won?1:0)-(a.won?1:0))||(b.floor-a.floor)||(b.score-a.score)||(a.date-b.date);

function toEntry(s){s=(s&&typeof s==='object')?s:{};
 const achN=(()=>{try{return window.ACH&&ACH.count?ACH.count():(window.ACH?ACH.list().filter(a=>a.got).length:0);}catch(e){return 0;}})();
 const e={name:clean(String(s.name||''),24)||'นักผจญภัยนิรนาม',village:clean(String(s.village||''),24),
  rankK:RANKS.includes(s.rankK)?s.rankK:'F',clsId:CLSN[s.clsId]?s.clsId:'war',clsN:clean(String(s.clsN||CLSN[s.clsId]||''),16),
  form:FORMS.includes(s.form)?s.form:'',floor:int(s.floor,1,101),won:!!s.won,title:clean(String(s.title||''),40),
  score:int(s.score,0,1e7),karma:int(s.karma,-9999,9999),gen:int(s.gen||1,1,9999),ach:int(achN,0,500),
  date:Math.round(num(s.date)>1e12?num(s.date):Date.now()),v:VER,
  drg:DRG.includes(s.drg)?s.drg:'',clan:CLAN.includes(s.clan)?s.clan:''};
 if(e.floor===101&&!(e.won&&(e.drg==='f'||e.drg==='s')))e.floor=100; // 101 = ผ่านชั้นลับมังกร (v2.1)
 if(e.won&&e.floor<100)e.won=false;
 if(e.date>Date.now())e.date=Date.now();
 e.h=fnv('tof-v1|'+canon(e));
 e.id=fnv(canon(e))+e.date.toString(36).slice(-3);
 return e;}

// ---- submit / queue ----
let flushing=false;
function submit(summary){try{if(!summary||typeof summary!=='object'||!(num(summary.floor)>=1))return null;const e=toEntry(summary);
 const mine=rd(K_MINE,[]);const L=Array.isArray(mine)?mine:[];
 if(!L.some(x=>x&&x.id===e.id)){L.push(Object.assign({cause:clean(String((summary&&summary.cause)||''),60)},e));L.sort(cmp);wr(K_MINE,L.slice(0,20));}
 const ids=rd(K_IDS,[]);if(Array.isArray(ids)&&!ids.includes(e.id)){ids.push(e.id);wr(K_IDS,ids.slice(-200));}
 const q=rd(K_Q,[]);const Q=Array.isArray(q)?q:[];if(!Q.some(x=>x&&x.id===e.id))Q.push(e);wr(K_Q,Q.slice(-20));
 flush();return e.id;}catch(err){return null;}}

async function flush(){if(flushing||typeof fetch!=='function')return;flushing=true;
 try{let Q=rd(K_Q,[]);if(!Array.isArray(Q))Q=[];
  const old=Date.now()-29*86400e3;Q=Q.filter(e=>e&&num(e.date)>old);
  const keep=[];
  for(const e of Q){let st=0;
   try{const {id,...body}=e;const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'same-origin'});st=r.status;}catch(err){st=0;}
   // 2xx = ส่งแล้ว, 4xx (ยกเว้น 429/404/408) = ข้อมูลไม่ผ่าน ส่งซ้ำก็ไม่ผ่าน ทิ้งได้
   const done=(st>=200&&st<300)||(st>=400&&st<500&&st!==429&&st!==404&&st!==408);
   if(!done)keep.push(e);
   if(st===429||st===0||st===404||st===503){keep.push(...Q.slice(Q.indexOf(e)+1));break;}}
  wr(K_Q,keep);
 }catch(err){}finally{flushing=false;}}

// ---- dialog ----
let dlg=null,cur='top',cache=null,cacheAt=0;
function css(){if(document.getElementById('lb-css'))return;const st=document.createElement('style');st.id='lb-css';st.textContent=`
#lbDlg{width:min(640px,calc(100vw - 16px));max-width:none;max-height:min(86vh,760px);padding:0;border:2px solid var(--line2,#3d5a66);border-radius:4px;background:var(--panel,#15232a);color:var(--ink,#f1e7d0);box-shadow:0 0 0 2px #070c0e,0 10px 40px #000c;font-family:var(--fT,'Mitr','Kanit',system-ui,sans-serif);font-weight:300;overflow:hidden}
#lbDlg::backdrop{background:#000b}
#lbDlg[open]{display:flex;flex-direction:column}
.lb-hd{flex:none;display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:2px solid var(--line,#2c434d);background:var(--panel2,#1c2e36)}
.lb-hd h2{margin:0;flex:1;font-size:17px;font-weight:500;color:var(--gold,#f4bb4a);font-family:'DotGothic16','Mitr',monospace;letter-spacing:.02em}
.lb-x{background:var(--bg2,#101b20);border:2px solid var(--line2,#3d5a66);color:var(--ink,#f1e7d0);width:32px;height:32px;border-radius:3px;font-size:16px;cursor:pointer;flex:none}
.lb-x:hover{border-color:var(--gold2,#b97a22)}
.lb-tabs{flex:none;display:flex;gap:4px;padding:8px 10px 0;border-bottom:2px solid var(--line,#2c434d);overflow-x:auto;scrollbar-width:none}
.lb-tabs button{flex:none;background:transparent;border:2px solid transparent;border-bottom:0;color:var(--muted,#a3b5ad);padding:6px 10px;font:inherit;font-size:13px;border-radius:3px 3px 0 0;cursor:pointer}
.lb-tabs button[aria-selected=true]{background:var(--bg2,#101b20);border-color:var(--line,#2c434d);color:var(--gold,#f4bb4a)}
.lb-body{padding:10px 12px 14px;overflow-y:auto;flex:1 1 auto;min-height:0}
.lb-msg{background:var(--bg2,#101b20);border:1px dashed var(--line2,#3d5a66);padding:12px;border-radius:3px;color:var(--muted,#a3b5ad);font-size:13px;text-align:center}
.lb-msg b{color:var(--ink,#f1e7d0);font-weight:500;display:block;margin-bottom:2px}
.lb-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}
.lb-row{display:grid;grid-template-columns:30px 34px 1fr auto;align-items:center;gap:8px;background:var(--bg2,#101b20);border:2px solid var(--line,#2c434d);border-radius:3px;padding:6px 8px;font-size:13px;min-width:0}
.lb-row.me{border-color:var(--gold,#f4bb4a);background:#262414}
.lb-row.win .no{color:var(--gold,#f4bb4a)}
.lb-row .no{font-family:'DotGothic16','Mitr',monospace;font-weight:700;color:var(--muted,#a3b5ad);text-align:right}
.lb-rk{font-family:'DotGothic16','Mitr',monospace;font-weight:700;font-size:13px;color:#111;text-align:center;padding:1px 0;border-radius:2px;border:2px solid #0004}
.lb-who{min-width:0}
.lb-who b{font-weight:500;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lb-who b i{font-style:normal;color:var(--gold,#f4bb4a);font-weight:400}
.lb-who span{display:block;color:var(--muted,#a3b5ad);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lb-fl{text-align:right;font-family:'DotGothic16','Mitr',monospace;line-height:1.2}
.lb-fl b{font-size:16px;color:var(--ink,#f1e7d0)}
.lb-fl span{display:block;font-size:11px;color:var(--dim,#6f857e)}
.lb-hid{color:#ff9a6a;font-weight:500}
.lb-hid em{font-style:normal;font-size:10px;font-family:'DotGothic16','Mitr',monospace;background:#5a1d14;color:#ffd2b8;border:1px solid #ff7a5a;padding:0 3px;border-radius:2px;margin-right:4px;vertical-align:1px}
.lb-drg{font-size:10px;font-weight:400;font-family:'DotGothic16','Mitr',monospace;padding:0 4px;border-radius:2px;margin-left:4px;vertical-align:1px;white-space:nowrap}
.lb-drg.f{background:#1f4a3a;color:#bff3d8;border:1px solid #5fd3a0}
.lb-drg.s{background:#4a1a1a;color:#ffc9b8;border:1px solid #ff7a5a}
.lb-tag{font-size:10px;font-family:'DotGothic16','Mitr',monospace;background:var(--gold,#f4bb4a);color:#1a1206;padding:0 4px;border-radius:2px;margin-left:4px;vertical-align:1px}
.lb-note{font-size:11.5px;color:var(--dim,#6f857e);margin:8px 0 0;text-align:center}
@media (max-width:420px){.lb-row{grid-template-columns:22px 30px 1fr auto;gap:6px;padding:5px 6px}.lb-hd h2{font-size:15px}.lb-tabs button{padding:6px 8px;font-size:12.5px}}
@media (prefers-reduced-motion:no-preference){#lbDlg[open]{animation:lbIn .2s steps(3)}@keyframes lbIn{from{opacity:0;transform:translateY(8px)}}}`;
 document.head.appendChild(st);}

const TABS=[['top','อันดับทั่วโลก'],['recent','ล่าสุด'],['ach','ความสำเร็จ'],['mine','ของฉัน']];
function build(){css();dlg=document.createElement('dialog');dlg.id='lbDlg';dlg.setAttribute('aria-labelledby','lbTitle');
 dlg.innerHTML=`<div class="lb-hd"><h2 id="lbTitle">หอเกียรติยศ</h2><button class="lb-x" type="button" aria-label="ปิด">✕</button></div>
<div class="lb-tabs" role="tablist">${TABS.map(([k,n])=>`<button type="button" role="tab" data-t="${k}" aria-selected="false" aria-controls="lbBody">${n}</button>`).join('')}</div>
<div class="lb-body" id="lbBody" role="tabpanel"></div>`;
 document.body.appendChild(dlg);
 dlg.querySelector('.lb-x').onclick=()=>dlg.close();
 dlg.addEventListener('click',ev=>{if(ev.target===dlg)dlg.close();});
 dlg.querySelectorAll('[role=tab]').forEach(b=>b.onclick=()=>show(b.dataset.t));
 dlg.querySelector('.lb-tabs').addEventListener('keydown',ev=>{if(ev.key!=='ArrowRight'&&ev.key!=='ArrowLeft')return;const i=TABS.findIndex(t=>t[0]===cur);const n=TABS[(i+(ev.key==='ArrowRight'?1:TABS.length-1))%TABS.length][0];show(n);dlg.querySelector(`[data-t="${n}"]`).focus();});}

function myIds(){const a=rd(K_IDS,[]);return new Set(Array.isArray(a)?a:[]);}
function isMine(e,ids,mine){if(ids.has(e.id))return true;return mine.some(m=>m.name===e.name&&m.floor===e.floor&&m.score===e.score&&m.date===e.date);}
function fdate(t){try{return new Date(t).toLocaleDateString('th-TH',{day:'numeric',month:'short'});}catch(e){return '';}}
function row(e,i,me){const rk=RANKC[e.rankK]?e.rankK:'?';
 const cls0=CLSN[e.clsId]||esc(e.clsN)||'';
 const cls=e.clsId==='dsl'?`<span class="lb-hid"><em>อาชีพลับ</em>${cls0}</span>`:cls0;
 const drg=e.drg==='f'?'<span class="lb-drg f" title="ไว้ชีวิตมังกรบนชั้นลับ">🐉 สหายมังกร</span>':e.drg==='s'?'<span class="lb-drg s" title="ล้มมังกรบนชั้นลับ">⚔ นักล่ามังกร</span>':'';
 const sub=[cls+(e.form==='slime'?' (สไลม์)':''),e.village?'จาก'+esc(e.village):'','รุ่นที่ '+int(e.gen,1,9999),e.ach?'🏅'+int(e.ach,0,500):''].filter(Boolean).join(' · ');
 return `<li class="lb-row${me?' me':''}${e.won?' win':''}"><span class="no">${i==null?'':i+1}</span><span class="lb-rk" style="background:${RANKC[rk]||'#888'}">${esc(rk)}</span>
<span class="lb-who"><b>${esc(e.name)}${drg}${e.title?` <i>“${esc(e.title)}”</i>`:''}${me?'<span class="lb-tag">คุณ</span>':''}</b><span>${sub}</span></span>
<span class="lb-fl">${e.floor===101?'<b>🐉 101</b>':e.won?'<b>👑</b>':`<b>${int(e.floor,0,100)}</b>`}<span>${e.floor===101?'ชั้นลับ':e.won?'พิชิตยอด':'ชั้น'} · ${num(e.score).toLocaleString('en-US')}</span></span></li>`;}

function msg(t,s){return `<div class="lb-msg"><b>${t}</b>${s||''}</div>`;}
async function load(){if(cache&&Date.now()-cacheAt<30e3)return cache;
 const ac=typeof AbortController==='function'?new AbortController():null;const to=setTimeout(()=>ac&&ac.abort(),7000);
 try{const r=await fetch(API,{headers:{Accept:'application/json'},signal:ac&&ac.signal,credentials:'same-origin'});
  let j=null;try{j=await r.json();}catch(e){}
  if(!r.ok||!j||j.error)return {error:(j&&j.error)||('http-'+r.status)};
  cache={top:Array.isArray(j.top)?j.top:[],recent:Array.isArray(j.recent)?j.recent:[]};cacheAt=Date.now();return cache;
 }catch(e){return {error:'offline'};}finally{clearTimeout(to);}}

async function show(t){if(!dlg)return;cur=t;
 dlg.querySelectorAll('[role=tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.t===t)));
 const B=dlg.querySelector('#lbBody');
 if(t==='ach'){B.innerHTML=window.ACH&&ACH.panelHTML?ACH.panelHTML():msg('ยังไม่มีระบบความสำเร็จ','');return;}
 const mine=(()=>{const m=rd(K_MINE,[]);return Array.isArray(m)?m.filter(x=>x&&typeof x==='object'):[];})();
 if(t==='mine'){const q=rd(K_Q,[]);const pend=Array.isArray(q)?q.length:0;
  B.innerHTML=mine.length?`<ul class="lb-list">${mine.slice().sort(cmp).map((e,i)=>row(e,i,false)).join('')}</ul>`+
   `<p class="lb-note">เก็บไว้ในเครื่องนี้ 20 รอบที่ดีที่สุด${pend?` · รอส่งขึ้นกระดาน ${pend} รอบ`:''}</p>`
   :msg('ยังไม่มีบันทึก','ลองปีนหอสักรอบ แล้วผลจะมาโผล่ตรงนี้');return;}
 B.innerHTML=msg('กำลังโหลดกระดาน…','');
 const d=await load();if(cur!==t)return;
 if(d.error){B.innerHTML=msg(d.error==='kv-not-configured'?'กระดานอันดับยังไม่เปิดใช้':'ต่อกระดานอันดับไม่ได้ตอนนี้',
  d.error==='kv-not-configured'?'ผู้ดูแลยังตั้งค่าเซิร์ฟเวอร์ไม่เสร็จ ระหว่างนี้ดูความสำเร็จกับสถิติของคุณได้ที่แท็บอื่น':'อาจเป็นเพราะเน็ตหลุดหรือเซิร์ฟเวอร์ไม่ตอบ ผลรอบของคุณเก็บไว้ในเครื่องแล้ว จะส่งให้เองเมื่อกลับมาออนไลน์')+
  `<p class="lb-note"><button type="button" class="lb-x" style="width:auto;padding:0 10px;font:inherit;font-size:12px" data-go="mine">ดูสถิติของฉัน</button></p>`;
  const go=B.querySelector('[data-go]');if(go)go.onclick=()=>show('mine');return;}
 const L=t==='top'?d.top:d.recent,ids=myIds();
 B.innerHTML=L.length?`<ul class="lb-list">${L.map((e,i)=>row(e,t==='top'?i:null,isMine(e,ids,mine))).join('')}</ul>`+
  (t==='top'?'<p class="lb-note">เรียงตาม: พิชิตยอดก่อน → ชั้นสูงสุด → คะแนน</p>':'')
  :msg('ยังว่างเปล่า','ยังไม่มีใครส่งผลขึ้นกระดานเลย คุณอาจเป็นคนแรก');}

function open(tab){try{if(typeof document==='undefined')return;if(!dlg)build();
 if(!dlg.open){if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');}
 show(TABS.some(x=>x[0]===tab)?tab:'top');}catch(e){}}

window.LB={submit,open,flush,mine:()=>rd(K_MINE,[])};
// ส่งคิวที่ค้างจากรอบก่อน
try{const go=()=>setTimeout(flush,2500);if(document.readyState==='complete')go();else window.addEventListener('load',go);window.addEventListener('online',()=>flush());}catch(e){}
})();
