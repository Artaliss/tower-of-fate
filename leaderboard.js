// leaderboard.js — กระดานอันดับ + ความสำเร็จ + สถิติของฉัน
// API: window.LB = { submit(summary), open(tab?), flush(), mine(), live:{start(sid), beat(sid,floor), get(day)} }
// v2.3: แท็บ 'wall' ชีวิตที่แบ่งปัน (/api/posts) + แนบตัวนับการแชร์ (tof-share-stat-v1) ไปกับผลรอบเป็น field ss
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
 // v2.2: run ticket + presence id + daily theme (ไม่อยู่ใน canon)
 if(typeof s.tk==='string'&&/^[a-f0-9]{20}$/.test(s.tk))e.tk=s.tk;if(typeof s.sid==='string'&&/^[a-z0-9]{6,24}$/.test(s.sid))e.sid=s.sid;
 if(typeof s.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s.day)){e.day=s.day;e.dh=s.dh?1:0;}
 if(e.floor===101&&!(e.won&&(e.drg==='f'||e.drg==='s')))e.floor=100; // 101 = ผ่านชั้นลับมังกร (v2.1)
 if(e.won&&e.floor<100)e.won=false;
 if(e.date>Date.now())e.date=Date.now();
 e.h=fnv('tof-v1|'+canon(e));
 e.id=fnv(canon(e))+e.date.toString(36).slice(-3);
 return e;}

// ---- share analytics (v2.3): ตัวนับจาก share.js ติดไปกับผลรอบ (field ss ไม่อยู่ใน canon) ----
// ตัวนับที่ติดอยู่กับรอบในคิวถือว่า "จองไว้แล้ว" จะลบออกจาก storage ก็ต่อเมื่อเซิร์ฟเวอร์ตอบว่านับแล้ว (ss:1) จึงไม่นับซ้ำและไม่หาย
const K_SS='tof-share-stat-v1',SS_CAP=50,SHK=['img','line','x','threads','copy','native','save'],SSK=['ao','mo','bo',...SHK,'note'];
function ssRead(){const v=rd(K_SS,null),o={};const ok=v&&typeof v==='object';const sh=ok&&v.sh&&typeof v.sh==='object'?v.sh:{};
 for(const k of SSK){const n=ok?num(SHK.includes(k)?sh[k]:v[k]):0;o[k]=n>0?Math.floor(n):0;}return o;}
function ssTake(Q){const have=ssRead(),o={};let any=0;
 for(const k of SSK){let n=have[k];for(const e of Q)if(e&&e.ss)n-=int(e.ss[k],0,SS_CAP);n=Math.min(SS_CAP,n);if(n>0){o[k]=n;any=1;}}
 return any?o:null;}
function ssDone(sent){try{const v=rd(K_SS,null);if(!v||typeof v!=='object'||!sent)return;
 for(const k of SSK){const n=int(sent[k],0,SS_CAP);if(!n)continue;const t=SHK.includes(k)?v.sh:v;if(!t||typeof t!=='object')continue;
  const c=num(t[k]);if(c>0)t[k]=Math.max(0,Math.floor(c)-n);}
 wr(K_SS,v);}catch(e){}}

// ---- submit / queue ----
let flushing=false;
function submit(summary){try{if(!summary||typeof summary!=='object'||!(num(summary.floor)>=1))return null;const e=toEntry(summary);
 const mine=rd(K_MINE,[]);const L=Array.isArray(mine)?mine:[];
 if(!L.some(x=>x&&x.id===e.id)){L.push(Object.assign({cause:clean(String((summary&&summary.cause)||''),60)},e));L.sort(cmp);wr(K_MINE,L.slice(0,20));}
 const ids=rd(K_IDS,[]);if(Array.isArray(ids)&&!ids.includes(e.id)){ids.push(e.id);wr(K_IDS,ids.slice(-200));}
 const q=rd(K_Q,[]);const Q=Array.isArray(q)?q:[];if(!Q.some(x=>x&&x.id===e.id)){const ss=ssTake(Q);if(ss)e.ss=ss;Q.push(e);}wr(K_Q,Q.slice(-20));
 flush();return e.id;}catch(err){return null;}}

async function flush(){if(flushing||typeof fetch!=='function')return;flushing=true;
 try{let Q0=rd(K_Q,[]);if(!Array.isArray(Q0))Q0=[];
  const old=Date.now()-29*86400e3;const Q=Q0.filter(e=>e&&num(e.date)>old);
  const keep=[];
  for(const e of Q){let st=0;
   try{const {id,...body}=e;const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'same-origin'});st=r.status;
    if(st>=200&&st<300&&e.ss){let j=null;try{j=await r.json();}catch(err){}if(j&&j.ss===1)ssDone(e.ss);}}catch(err){st=0;}
   // 2xx = ส่งแล้ว, 4xx (ยกเว้น 429/404/408) = ข้อมูลไม่ผ่าน ส่งซ้ำก็ไม่ผ่าน ทิ้งได้
   const done=(st>=200&&st<300)||(st>=400&&st<500&&st!==429&&st!==404&&st!==408);
   if(!done)keep.push(e);
   if(st===429||st===0||st===404||st===503){keep.push(...Q.slice(Q.indexOf(e)+1));break;}}
  // รอบที่ submit เข้ามาระหว่างกำลังส่งต้องไม่หาย
  const now=rd(K_Q,[]);const added=Array.isArray(now)?now.filter(x=>x&&!Q0.some(y=>y&&y.id===x.id)):[];
  wr(K_Q,keep.concat(added).slice(-20));
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
.lb-leg{margin:0 0 8px;font-size:12px;color:var(--muted,#a3b5ad);background:var(--bg2,#101b20);border:1px dashed var(--line2,#3d5a66);border-radius:3px;padding:6px 10px}
.lb-leg summary{cursor:pointer;color:var(--gold,#f4bb4a)}.lb-leg ul{margin:6px 0 0;padding-left:16px}.lb-leg li{margin:3px 0}.lb-leg b{color:var(--ink,#f1e7d0);font-weight:500}
.lb-note{font-size:11.5px;color:var(--dim,#6f857e);margin:8px 0 0;text-align:center}
.lb-cmp{margin:0 0 10px}.lb-cmp[open]{color:var(--ink,#f1e7d0)}
.lb-cmp label{display:block;margin:8px 0 3px;font-size:12px;color:var(--muted,#a3b5ad)}
.lb-cmp select,.lb-cmp textarea{width:100%;box-sizing:border-box;background:var(--panel,#15232a);color:var(--ink,#f1e7d0);border:2px solid var(--line2,#3d5a66);border-radius:3px;padding:6px 8px;font:inherit;font-size:13px}
.lb-cmp textarea{resize:vertical;min-height:64px}
.lb-cmp select:focus,.lb-cmp textarea:focus{outline:none;border-color:var(--gold,#f4bb4a)}
.lb-crow{display:flex;align-items:center;gap:8px;margin-top:8px}.lb-crow span{flex:1;font-size:12px;min-width:0}
.lb-crow .err{color:#ff9a6a}.lb-crow .okm{color:#8fe3b0}
.lb-btn{background:var(--gold,#f4bb4a);color:#1a1206;border:2px solid #0006;border-radius:3px;padding:5px 14px;font:inherit;font-size:13px;font-weight:500;cursor:pointer;flex:none}
.lb-btn:disabled{opacity:.5;cursor:default}
.lb-post{display:grid;grid-template-columns:34px 1fr;gap:8px;background:var(--bg2,#101b20);border:2px solid var(--line,#2c434d);border-radius:3px;padding:8px;font-size:13px;min-width:0}
.lb-post .lb-rk{align-self:start}
.lb-post .lb-who b,.lb-cmp .lb-who b{white-space:normal}.lb-post .lb-who b span,.lb-cmp .lb-who b span{display:inline}
.lb-post blockquote{margin:6px 0 0;padding:4px 0 4px 10px;border-left:3px solid var(--gold2,#b97a22);color:var(--ink,#f1e7d0);white-space:pre-wrap;overflow-wrap:anywhere}
.lb-pf{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:11.5px;color:var(--dim,#6f857e)}.lb-pf>span{flex:1}
.lb-pf button{background:transparent;border:1px solid var(--line2,#3d5a66);color:var(--muted,#a3b5ad);border-radius:3px;padding:2px 8px;font:inherit;font-size:12px;cursor:pointer}
.lb-pf button[aria-pressed=true]{border-color:var(--gold,#f4bb4a);color:var(--gold,#f4bb4a)}
.lb-pf button:disabled{cursor:default}
.lb-pf .rep{border-color:transparent;color:var(--dim,#6f857e);text-decoration:underline}.lb-pf .rep.arm{color:#ff9a6a}
@media (max-width:420px){.lb-row{grid-template-columns:22px 30px 1fr auto;gap:6px;padding:5px 6px}.lb-hd h2{font-size:15px}.lb-tabs button{padding:6px 8px;font-size:12.5px}}
@media (prefers-reduced-motion:no-preference){#lbDlg[open]{animation:lbIn .2s steps(3)}@keyframes lbIn{from{opacity:0;transform:translateY(8px)}}}`;
 document.head.appendChild(st);}

const TABS=[['top','อันดับทั่วโลก'],['recent','ล่าสุด'],['wall','ชีวิตที่แบ่งปัน'],['ach','ความสำเร็จ'],['mine','ของฉัน']];
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
 const sub=[cls+(e.form==='slime'?' (สไลม์)':''),e.village?'จาก'+esc(e.village):'','รุ่นที่ '+int(e.gen,1,9999),e.ach?`<span title="ความสำเร็จที่ปลดล็อกแล้ว ${int(e.ach,0,500)} อย่าง">🏅${int(e.ach,0,500)}</span>`:''].filter(Boolean).join(' · ');
 return `<li class="lb-row${me?' me':''}${e.won?' win':''}"><span class="no">${i==null?'':i+1}</span><span class="lb-rk" style="background:${RANKC[rk]||'#888'}">${esc(rk)}</span>
<span class="lb-who"><b>${esc(e.name)}${drg}${e.title?` <i>“${esc(e.title)}”</i>`:''}${me?'<span class="lb-tag">คุณ</span>':''}${e.ok===0?'<span class="lb-drg" style="border:1px solid #6f857e;color:#a3b5ad" title="รอบนี้ไม่มีตั๋วจากเซิร์ฟเวอร์ หรือจบเร็วเกินกว่าที่เล่นได้จริง">ไม่นับอันดับ</span>':''}</b><span>${sub}</span></span>
<span class="lb-fl">${e.floor===101?'<b>🐉 101</b>':e.won?'<b>👑</b>':`<b>${int(e.floor,0,100)}</b>`}<span title="คะแนนชีวิต">${e.floor===101?'ชั้นลับ':e.won?'พิชิตยอด':'ชั้น'} · ${num(e.score).toLocaleString('en-US')} คะแนน</span></span></li>`;}

// วิธีอ่านแถวในตาราง (แสดงใต้แท็บอันดับทั่วโลก/ล่าสุด)
const LEGEND=`<details class="lb-leg"><summary>อ่านตารางยังไง</summary><ul>
<li><b>👑</b> พิชิตยอดหอชั้น 100 · <b>🐉 101</b> ขึ้นไปผ่านชั้นลับเหนือยอดหอได้ · ตัวเลขเดี่ยวคือชั้นที่ล้มลง</li>
<li><b>คะแนน</b> คือคะแนนชีวิต ได้จากชั้นที่ไปถึง + บอสที่ล้มได้ตัวละ 3 + พิชิตยอดอีก 30 + ครึ่งหนึ่งของเลเวล + ผ่านชั้นลับอีก 10 ถึง 15 แล้วบวกหรือลบตามบัญชีกรรมตอนจบ ใช้ตัดสินตอนไปได้ชั้นเท่ากัน</li>
<li><b>🏅</b> จำนวนความสำเร็จที่คนนั้นปลดล็อกไว้ตอนส่งผล</li>
<li><b>อันดับทั่วโลก</b> รับเฉพาะรอบที่เล่นจบบนเว็บนี้จริง (เซิร์ฟเวอร์ออกตั๋วให้ตอนเข้าหอ) รอบที่ไม่มีตั๋วหรือจบเร็วผิดปกติจะขึ้นแค่ในแท็บล่าสุด พร้อมป้าย "ไม่นับอันดับ"</li>
<li><b>รุ่นที่</b> ลำดับรุ่นในสายตระกูล (ลูกศิษย์สืบทอดต่อกันมากี่รุ่น) · <b>F ถึง SS</b> แรงค์ตอนเกิด</li></ul></details>`;
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
 if(t==='wall'){wall(B,mine);return;}
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
 B.innerHTML=L.length?LEGEND+`<ul class="lb-list">${L.map((e,i)=>row(e,t==='top'?i:null,isMine(e,ids,mine))).join('')}</ul>`+
  (t==='top'?'<p class="lb-note">เรียงตาม: พิชิตยอดก่อน → ชั้นสูงสุด → คะแนน</p>':'')
  :msg('ยังว่างเปล่า','ยังไม่มีใครส่งผลขึ้นกระดานเลย คุณอาจเป็นคนแรก');}

// ---- ชีวิตที่แบ่งปัน (v2.3): /api/posts ----
const API_P='/api/posts',K_P='tof-posts-v1';
let pcache=null,pcacheAt=0;
function pstore(){const v=rd(K_P,{});const o=v&&typeof v==='object'?v:{};for(const k of ['rm','rp','ps'])if(!Array.isArray(o[k]))o[k]=[];return o;}
function pmark(k,id){const o=pstore();if(!o[k].includes(id)){o[k].push(id);o[k]=o[k].slice(-300);wr(K_P,o);}}
function punmark(k,id){const o=pstore();o[k]=o[k].filter(x=>x!==id);wr(K_P,o);}
async function loadPosts(){if(pcache&&Date.now()-pcacheAt<20e3)return pcache;
 const ac=typeof AbortController==='function'?new AbortController():null;const to=setTimeout(()=>ac&&ac.abort(),7000);
 try{const r=await fetch(API_P,{headers:{Accept:'application/json'},signal:ac&&ac.signal,credentials:'same-origin'});
  let j=null;try{j=await r.json();}catch(e){}
  // ไม่มี function (GitHub Pages / localhost) = 404 หรือได้ HTML กลับมา, ไม่มี KV = 503 kv-not-configured
  if(!j||typeof j!=='object'||r.status===404||r.status===405||j.error==='kv-not-configured')return {error:'off'};
  if(!r.ok||!Array.isArray(j.posts))return {error:'net'};
  pcache={posts:j.posts.filter(p=>p&&typeof p==='object'&&p.s&&typeof p.s==='object')};pcacheAt=Date.now();return pcache;
 }catch(e){return {error:'net'};}finally{clearTimeout(to);}}
async function postsCall(body){if(typeof fetch!=='function')return {st:0,j:{}};
 try{const r=await fetch(API_P,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'same-origin'});
  let j=null;try{j=await r.json();}catch(e){}return {st:r.status,j:j&&typeof j==='object'?j:{}};}catch(e){return {st:0,j:{}};}}
function ago(t){const m=Math.floor((Date.now()-num(t))/60e3);if(m<2)return 'เมื่อกี้';if(m<60)return m+' นาทีก่อน';const h=Math.floor(m/60);if(h<24)return h+' ชั่วโมงก่อน';return Math.floor(h/24)+' วันก่อน';}
function endTxt(s){return s.f===101?'ผ่านชั้นลับมังกร':s.w?'พิชิตยอดหอ':'ล้มที่ชั้น '+int(s.f,1,100);}
function runSum(e){return {n:e.name,r:e.rankK,c:e.clsId,o:e.form||'',f:int(e.floor,1,101),w:e.won?1:0,d:e.drg||'',ti:e.title||'',ca:e.cause||'',g:int(e.gen||1,1,9999)};}
function sumHTML(s){const cls=CLSN[s.c]||'';
 const sub=['แรงค์ '+esc(s.r),cls+(s.o==='slime'?' (สไลม์)':''),'รุ่นที่ '+int(s.g||1,1,9999),endTxt(s)+(s.ca&&!s.w?' · สาเหตุ: '+esc(s.ca):'')].filter(Boolean).join(' · ');
 const drg=s.d==='f'?'<span class="lb-drg f">🐉 สหายมังกร</span>':s.d==='s'?'<span class="lb-drg s">⚔ นักล่ามังกร</span>':'';
 return `<div class="lb-who"><b>${esc(s.n)}${drg}${s.ti?` <i>“${esc(s.ti)}”</i>`:''}</b><span style="white-space:normal">${sub}</span></div>`;}
function postHTML(p,st){const s=p.s,rk=RANKC[s.r]?s.r:'?',rm=st.rm.includes(p.id),rp=st.rp.includes(p.id);
 return `<li class="lb-post" data-id="${esc(p.id)}"><span class="lb-rk" style="background:${RANKC[rk]||'#888'}">${esc(rk)}</span><div style="min-width:0">${sumHTML(s)}
${p.q?`<blockquote>“${esc(p.q)}”</blockquote>`:''}<div class="lb-pf"><span>${ago(p.t)}</span>
<button type="button" class="rm" aria-pressed="${rm}" title="ระลึกถึงชีวิตนี้"${rm?' disabled':''}>🕯 ระลึกถึง <b>${int(p.rm,0,1e9)}</b></button>
<button type="button" class="rep"${rp?' disabled':''}>${rp?'รายงานแล้ว':'รายงาน'}</button></div></div></li>`;}
const PERR={link:'มีลิงก์อยู่ในข้อความ เอาออกก่อนนะ',personal:'เหมือนจะมีเบอร์โทรหรืออีเมลอยู่ เอาออกก่อนนะ',abuse:'มีคำไม่สุภาพอยู่ ลองเขียนใหม่อีกที',
 len:'สั้นไปหน่อย ต้องมีอย่างน้อย 4 ตัวอักษร หรือเว้นว่างไว้เลยก็ได้',dup:'รอบนี้แบ่งปันไปแล้ว',busy:'ช่วงนี้คนโพสต์เยอะมาก ลองใหม่อีกสักพัก',fail:'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง'};
function postErr(r){const j=r.j||{};if(j.error==='rate-limited')return `โพสต์ได้ชั่วโมงละ 3 ครั้ง รออีกราว ${Math.max(1,Math.ceil(num(j.retryAfter)/60))} นาทีนะ`;
 if(j.error==='filtered')return PERR[j.why]||PERR.abuse;return PERR[j.error]||PERR.fail;}

function bindPosts(ul){
 ul.querySelectorAll('.lb-post').forEach(li=>{const id=li.dataset.id,rmB=li.querySelector('.rm'),repB=li.querySelector('.rep');
  rmB.onclick=async()=>{if(rmB.disabled)return;const b=rmB.querySelector('b');const n0=int(b.textContent,0,1e9);
   rmB.disabled=true;rmB.setAttribute('aria-pressed','true');b.textContent=n0+1;pmark('rm',id);
   const r=await postsCall({a:'react',id});
   if(r.st>=200&&r.st<300){if(r.j.rm!=null)b.textContent=int(r.j.rm,0,1e9);const p=pcache&&pcache.posts.find(x=>x.id===id);if(p)p.rm=int(b.textContent,0,1e9);}
   else if(r.st!==404){punmark('rm',id);rmB.disabled=false;rmB.setAttribute('aria-pressed','false');b.textContent=n0;}};
  let armT=0;
  repB.onclick=async()=>{if(repB.disabled)return;
   if(!repB.classList.contains('arm')){repB.classList.add('arm');repB.textContent='กดอีกทีเพื่อยืนยันการรายงาน';clearTimeout(armT);
    armT=setTimeout(()=>{repB.classList.remove('arm');repB.textContent='รายงาน';},4000);return;}
   clearTimeout(armT);repB.disabled=true;repB.classList.remove('arm');
   const r=await postsCall({a:'report',id});
   if((r.st>=200&&r.st<300)||r.st===404){pmark('rp',id);repB.textContent='รายงานแล้ว ขอบคุณนะ';}else{repB.disabled=false;repB.textContent='รายงาน';}};});}

function composer(mine){const runs=mine.slice().sort((a,b)=>num(b.date)-num(a.date)).slice(0,20);
 if(!runs.length)return msg('ยังไม่มีรอบให้เล่า','ปีนหอให้จบสักรอบ แล้วกลับมาเล่าตรงนี้ได้');
 const ps=pstore().ps;
 return `<details class="lb-leg lb-cmp"><summary>✍ เล่าชีวิตนี้ให้คนอื่นฟัง</summary>
<label for="lbPRun">เลือกรอบ</label><select id="lbPRun">${runs.map((e,i)=>`<option value="${i}">${esc(e.name)} · ${esc(endTxt(runSum(e)))} · ${esc(fdate(e.date))}${ps.includes(e.id)?' (แบ่งปันแล้ว)':''}</option>`).join('')}</select>
<div id="lbPPrev" style="margin-top:6px"></div>
<label for="lbPQ">อยากบอกอะไรถึงชีวิตนี้ไหม (เว้นว่างได้ ถ้าเขียนต้องยาว 4 ถึง 300 ตัว)</label>
<textarea id="lbPQ" maxlength="300" rows="3" autocomplete="off"></textarea>
<div class="lb-crow"><span id="lbPSt" aria-live="polite">0/300</span><button type="button" class="lb-btn" id="lbPGo">แบ่งปัน</button></div>
<p class="lb-note" style="text-align:left">ไม่ต้องสมัครอะไร และไม่มีชื่อบัญชีโชว์ ห้ามใส่ลิงก์ เบอร์โทร อีเมล หรือคำหยาบ</p></details>`;}

async function wall(B,mine){
 B.innerHTML=msg('กำลังโหลด…','');
 const d=await loadPosts();if(cur!=='wall')return;
 if(d.error){B.innerHTML=d.error==='off'?msg('ชีวิตที่แบ่งปันยังไม่เปิดใช้','ส่วนนี้ใช้ได้เฉพาะบนเว็บหลัก ระหว่างนี้ดูแท็บอื่นไปก่อนได้')
  :msg('ต่อไม่ได้ตอนนี้','เน็ตอาจหลุดหรือเซิร์ฟเวอร์ไม่ตอบ ลองเปิดใหม่อีกที');return;}
 const runs=mine.slice().sort((a,b)=>num(b.date)-num(a.date)).slice(0,20);
 B.innerHTML=composer(mine)+'<ul class="lb-list" id="lbPosts"></ul>';
 const ul=B.querySelector('#lbPosts');
 const paint=()=>{const st=pstore();ul.innerHTML=d.posts.length?d.posts.map(p=>postHTML(p,st)).join(''):`<li>${msg('ยังไม่มีใครแบ่งปัน','เล่าชีวิตของคุณเป็นคนแรกเลย')}</li>`;bindPosts(ul);};
 paint();
 const sel=B.querySelector('#lbPRun');if(!sel)return;
 const ta=B.querySelector('#lbPQ'),stE=B.querySelector('#lbPSt'),go=B.querySelector('#lbPGo'),prev=B.querySelector('#lbPPrev');
 const sync=()=>{const e=runs[+sel.value];prev.innerHTML=e?sumHTML(runSum(e)):'';};
 const say=(t,cls)=>{stE.textContent=t;stE.className=cls||'';};
 sel.onchange=sync;sync();
 ta.oninput=()=>say(Array.from(ta.value).length+'/300');
 go.onclick=async()=>{const e=runs[+sel.value];if(!e)return;const q=ta.value.replace(/\s+/g,' ').trim(),ql=Array.from(q).length;
  if(ql>0&&ql<4){say(PERR.len,'err');return;}
  go.disabled=true;say('กำลังส่ง…');
  const r=await postsCall({a:'post',s:runSum(e),q});go.disabled=false;
  if(r.st>=200&&r.st<300&&r.j.post){pmark('ps',e.id);ta.value='';say('แบ่งปันแล้ว','okm');
   d.posts=[r.j.post,...d.posts.filter(x=>x.id!==r.j.post.id)];if(pcache)pcache.posts=d.posts;const o=sel.options[sel.selectedIndex];if(o&&!/\(แบ่งปันแล้ว\)$/.test(o.textContent))o.textContent+=' (แบ่งปันแล้ว)';
   paint();return;}
  if(r.j.error==='dup')pmark('ps',e.id);
  say(r.st===0?PERR.fail:postErr(r),'err');};}

function open(tab){try{if(typeof document==='undefined')return;if(!dlg)build();
 if(!dlg.open){if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');}
 show(TABS.some(x=>x[0]===tab)?tab:'top');}catch(e){}}

// ---- live: คนกำลังไต่หอ + ตั๋วรอบ (กันโกง) + สถิติหัวข้อของวัน ----
const LIVE='/api/live';
async function liveCall(body){if(typeof fetch!=='function')return null;
 try{const r=await fetch(LIVE,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{Accept:'application/json'},body:body?JSON.stringify(body):undefined,credentials:'same-origin'});
  if(!r.ok)return null;const j=await r.json();return j&&!j.error?j:null;}catch(e){return null;}}
const live={start:sid=>liveCall({a:'start',sid}),beat:(sid,f)=>liveCall({a:'beat',sid,f:int(f,1,101)}),
 get:day=>{if(typeof fetch!=='function')return Promise.resolve(null);return fetch(LIVE+'?day='+encodeURIComponent(day||''),{headers:{Accept:'application/json'},credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(j=>j&&!j.error?j:null).catch(()=>null);},
 recent:()=>load().then(d=>d&&!d.error?d.recent:[])};
window.LB={submit,open,flush,mine:()=>rd(K_MINE,[]),live};
// ส่งคิวที่ค้างจากรอบก่อน
try{const go=()=>setTimeout(flush,2500);if(document.readyState==='complete')go();else window.addEventListener('load',go);window.addEventListener('online',()=>flush());}catch(e){}
})();
