// savemove.js — move the whole save to another browser with a 9-character code (v2.7, after 1in8b.life "ย้ายบันทึก"; no login)
// - "ส่งเซฟไปเครื่องอื่น": every localStorage key starting with 'tof-' (except the temporary ones in SKIP) -> one JSON object
//   -> gzip + base64 when the browser has CompressionStream -> POST /api/move {a:'put'} -> code [a-z2-9]{9}, one use, 3 days
// - "รับเซฟด้วยโค้ด" or a link /?move=<code>: peek first (the code is not used up), show what will replace this browser's save,
//   and only after the player confirms: take (the code is spent), clear this browser's tof-* keys, write the new ones, reload
// The panel is added under the graveyard panel of index.html by this file.
// API: window.MOVE = { out(), in(code) }
(function(){
'use strict';
if(typeof document==='undefined')return;
const ORIGIN='https://tower-of-fate.pages.dev';
// pending queues, caches and per-device counters: not part of what moves
const SKIP=['tof-lb-queue-v1','tof-share-stat-v1','tofc-auto-birth-v1','tof-causes-v1','tof-help-tab','tof-acct-v1'];   // tof-acct-v1 = โทเคนล็อกอินของฉบับหลัก ไม่ย้ายไปกับโค้ด
const fT="'Mitr','Kanit','Noto Sans Thai',system-ui,sans-serif";
const okCode=s=>typeof s==='string'&&/^[a-z2-9]{9}$/.test(s);
const nf=n=>Number(n||0).toLocaleString('th-TH');
function el(tag,attrs,txt){const e=document.createElement(tag);if(attrs)for(const k in attrs)e.setAttribute(k,attrs[k]);if(txt!=null)e.textContent=txt;return e;}

// ---------- what is in a save ----------
function collect(){const o={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('tof-')&&!SKIP.includes(k)){const v=localStorage.getItem(k);if(v!=null)o[k]=v;}}}catch(e){}return o;}
const pj=s=>{try{return JSON.parse(s);}catch(e){return null;}};
// counts shown on the confirm screen, computed the same way for both browsers
function summary(o){const m={keys:Object.keys(o).length};
 const mem=pj(o['tof-auto-memorial-v1']),old=pj(o['tof-memorial-v1']);m.memo=(Array.isArray(mem)?mem.length:0)+(Array.isArray(old)?old.length:0);
 const lin=pj(o['tof-lineage-v1']);m.lines=lin&&Array.isArray(lin.lines)?lin.lines.length:0;
 const a=pj(o['tof-ach-v1']);m.ach=a&&a.got&&typeof a.got==='object'?Object.keys(a.got).length:0;
 const u=pj(o['tof-unlock-v1']);m.unl=u&&typeof u==='object'?Object.keys(u).length:0;
 const sv=pj(o['tofc-auto-save-v1']);if(sv&&sv.hero&&typeof sv.hero.name==='string'){m.hero=sv.hero.name.slice(0,24);if(sv.R&&typeof sv.R.floor==='number')m.run=Math.max(0,Math.min(101,Math.floor(sv.R.floor)));}
 return m;}
function sumLines(m){const L=[];L.push(`สุสาน ${nf(m.memo||0)} ชีวิต · สายตระกูล ${nf(m.lines||0)} สาย · ความสำเร็จ ${nf(m.ach||0)} อย่าง`);
 if(m.unl)L.push(`ปลดล็อกอาชีพจากกรรมแล้ว ${m.unl} อาชีพ`);
 if(m.hero)L.push(m.run?`ฮีโร่ที่ยังเล่นค้างอยู่: ${m.hero} (ชั้น ${m.run})`:`ฮีโร่ที่รอเกิดอยู่: ${m.hero}`);
 return L;}

// ---------- packing ----------
function b64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s);}
function unb64(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}
async function pack(o){const txt=JSON.stringify(o);
 if(typeof CompressionStream==='function'){try{const st=new Blob([txt]).stream().pipeThrough(new CompressionStream('gzip'));return{z:'gz',p:b64(new Uint8Array(await new Response(st).arrayBuffer()))};}catch(e){}}
 return{z:'',p:txt};}
async function unpack(z,p){if(z!=='gz')return JSON.parse(p);if(typeof DecompressionStream!=='function')throw new Error('no-gzip');
 const st=new Blob([unb64(p)]).stream().pipeThrough(new DecompressionStream('gzip'));return JSON.parse(await new Response(st).text());}

// ---------- network ----------
async function api(body){const ctl=typeof AbortController!=='undefined'?new AbortController():null;const tm=setTimeout(()=>{try{ctl&&ctl.abort();}catch(e){}},30000);
 try{const o={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};if(ctl)o.signal=ctl.signal;const r=await fetch('/api/move',o);
  let j=null;try{j=await r.json();}catch(e){}return{st:r.status,j:j&&typeof j==='object'?j:{}};}catch(e){return{st:0,j:{}};}finally{clearTimeout(tm);}}
function errTxt(r){if(r.st===0)return'ต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้งนะ';if(r.st===429)return'ลองบ่อยเกินไปแล้ว รอสักครู่ค่อยลองใหม่';
 if(r.j.error==='used')return'โค้ดนี้ใช้ไปแล้ว ขอโค้ดใหม่จากเครื่องเดิมนะ';if(r.j.error==='not-found')return'ไม่พบโค้ดนี้ อาจพิมพ์ผิดหรือหมดอายุแล้ว (โค้ดมีอายุ 3 วัน)';
 if(r.j.error==='invalid'||r.j.error==='too-large')return'เซฟในเครื่องนี้ใหญ่เกินกว่าจะย้ายด้วยโค้ดได้';
 return'ตอนนี้ระบบย้ายเซฟยังไม่เปิด ลองใหม่ทีหลังนะ';}

// ---------- dialog ----------
let css0=false;
function css(){if(css0)return;css0=true;const st=el('style');st.textContent=`
.mvd{border:none;padding:0;background:transparent;max-width:min(460px,calc(100vw - 20px));width:100%;color:#f1e7d0;font-family:${fT}}
.mvd::backdrop{background:#000b}
.mvd-box{background:#15232a;border:2px solid #3d5a66;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;max-height:calc(100vh - 40px);overflow-y:auto;box-shadow:0 0 0 2px #070c0e}
.mvd h2{margin:0;font-size:19px;font-weight:600;color:#f4bb4a}
.mvd p{margin:0;font-size:14px;line-height:1.6;color:#d8cdb4}
.mvd .dim{color:#8fa39b;font-size:12.5px}
.mvd .warn{color:#f2c14e;background:#2a2414;border:1px solid #6a5420;border-radius:6px;padding:8px 10px}
.mvd-code{font:400 30px 'DotGothic16',monospace;letter-spacing:.18em;text-align:center;color:#f4bb4a;background:#0f1a1f;border:2px dashed #b97a22;border-radius:8px;padding:10px 6px;user-select:all;word-break:break-all}
.mvd input{width:100%;box-sizing:border-box;font:400 22px 'DotGothic16',monospace;letter-spacing:.14em;text-align:center;padding:10px;border-radius:8px;border:2px solid #3d5a66;background:#0f1a1f;color:#f1e7d0;text-transform:lowercase}
.mvd input:focus{outline:2px solid #f4bb4a;outline-offset:1px}
.mvd-cmp{display:grid;grid-template-columns:1fr;gap:8px}
.mvd-cmp div{background:#0f1a1f;border:1px solid #2c434d;border-radius:8px;padding:8px 10px;font-size:13.5px;line-height:1.55}
.mvd-cmp b{display:block;color:#f4bb4a;font-weight:500;font-size:13px;margin-bottom:2px}
.mvd-row{display:flex;gap:8px;flex-wrap:wrap}.mvd-row button{flex:1;min-width:120px}
.mvd button{font:500 14.5px ${fT};border-radius:8px;padding:10px 12px;min-height:44px;cursor:pointer;border:2px solid #3d5a66;background:#1c2e36;color:#f1e7d0}
.mvd button.pri{background:#e86a3a;border-color:#000;color:#1a0b04;box-shadow:inset 0 -3px 0 #a8431c}
.mvd button.bad{background:#a3322a;border-color:#000;color:#fff3e8}
.mvd button:disabled{opacity:.6;cursor:default}
.mvd-msg{min-height:18px;font-size:13px;color:#86d67f;text-align:center;margin:0}
.mvd :focus-visible{outline:3px solid #ffd76a;outline-offset:2px}
.mvp p{font-size:12.5px;color:var(--dim,#6f857e);margin:0 0 8px;line-height:1.5}
.mvp .mvp-r{display:flex;gap:8px;flex-wrap:wrap}.mvp .mvp-r button{flex:1;min-width:150px}
`;document.head.appendChild(st);}
let dlg=null,busy=false;
function build(){if(dlg)return dlg;css();dlg=el('dialog',{class:'mvd','aria-labelledby':'mvd-t'});const box=el('div',{class:'mvd-box'});dlg.append(box);document.body.append(dlg);
 dlg.addEventListener('cancel',e=>{e.preventDefault();if(!busy)closeD();});dlg.addEventListener('keydown',e=>e.stopPropagation());dlg._box=box;return dlg;}
function closeD(){if(!dlg)return;try{dlg.close();}catch(e){dlg.removeAttribute('open');}}
function show(nodes,focus){build();dlg._box.replaceChildren(...nodes);if(!dlg.open){try{dlg.showModal();}catch(e){dlg.setAttribute('open','');}}if(focus)try{focus.focus({preventScroll:true});}catch(e){}}
const msgEl=()=>el('p',{class:'mvd-msg',role:'status','aria-live':'polite'});
function sayIn(m,t,bad){m.style.color=bad?'#ef6b5e':'#86d67f';m.textContent=t;}
const dateTxt=t=>{try{return new Date(t).toLocaleString('th-TH',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){return'';}};

// send this browser's save
function out(){const o=collect(),m=summary(o);
 const t=el('h2',{id:'mvd-t'},'ส่งเซฟไปเครื่องอื่น');
 const p=el('p',null,'เซฟทั้งหมดในเครื่องนี้จะถูกฝากไว้กับโค้ด 9 ตัว เอาโค้ดไปกรอกที่อีกเครื่องภายใน 3 วัน โค้ดใช้ได้ครั้งเดียว');
 const s=el('p',{class:'dim'},sumLines(m).join(' · '));
 const go=el('button',{type:'button',class:'pri'},'สร้างโค้ด'),no=el('button',{type:'button'},'ปิด'),row=el('div',{class:'mvd-row'}),msg=msgEl();row.append(go,no);no.onclick=closeD;
 show([t,p,s,row,msg],go);
 if(!m.keys){go.disabled=true;sayIn(msg,'เครื่องนี้ยังไม่มีเซฟให้ย้าย',true);return;}
 go.onclick=async()=>{if(busy)return;busy=true;go.disabled=no.disabled=true;sayIn(msg,'กำลังสร้างโค้ด…');
  let pk=null;try{pk=await pack(o);}catch(e){pk=null;}
  const r=pk?await api({a:'put',z:pk.z,p:pk.p,m}):{st:400,j:{error:'invalid'}};busy=false;no.disabled=false;
  if(!r.j.ok||!okCode(r.j.code)){go.disabled=false;sayIn(msg,errTxt(r),true);return;}
  try{window.ACH&&window.ACH.onEvent&&window.ACH.onEvent('move',{dir:'out'});}catch(e){}
  shown(r.j.code,r.j.exp);};}
function shown(code,exp){const url=ORIGIN+'/?move='+code;
 const t=el('h2',{id:'mvd-t'},'ได้โค้ดแล้ว'),c=el('div',{class:'mvd-code','aria-label':'โค้ดย้ายเซฟ'},code);
 const p=el('p',null,'ที่อีกเครื่อง เปิดเกมแล้วกด "รับเซฟด้วยโค้ด" หรือเปิดลิงก์นี้ตรงๆ ก็ได้');
 const d=el('p',{class:'dim'},`ใช้ได้ครั้งเดียว หมดอายุ ${dateTxt(exp)} · เซฟในเครื่องนี้ยังอยู่เหมือนเดิม`);
 const bC=el('button',{type:'button',class:'pri'},'คัดลอกลิงก์'),bK=el('button',{type:'button'},'คัดลอกโค้ด'),bX=el('button',{type:'button'},'ปิด'),row=el('div',{class:'mvd-row'}),msg=msgEl();
 row.append(bC,bK);const r2=el('div',{class:'mvd-row'});r2.append(bX);bX.onclick=closeD;
 bC.onclick=async()=>{const ok=await copy(url);sayIn(msg,ok?'คัดลอกลิงก์แล้ว':'คัดลอกไม่ได้ จดโค้ดไว้แทนนะ',!ok);};
 bK.onclick=async()=>{const ok=await copy(code);sayIn(msg,ok?'คัดลอกโค้ดแล้ว':'คัดลอกไม่ได้ จดโค้ดไว้แทนนะ',!ok);};
 show([t,c,p,d,row,r2,msg],bC);}
async function copy(t){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(t);return true;}}catch(e){}
 try{const ta=el('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0;left:-9999px';dlg.append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;}catch(e){return false;}}

// receive a save
function inp(code){const t=el('h2',{id:'mvd-t'},'รับเซฟด้วยโค้ด');
 const p=el('p',null,'กรอกโค้ด 9 ตัวที่ได้จากอีกเครื่อง');
 const i=el('input',{type:'text',inputmode:'text',autocomplete:'off',autocapitalize:'off',spellcheck:'false',maxlength:'12','aria-label':'โค้ดย้ายเซฟ 9 ตัว',placeholder:'เช่น abcd2345x'});i.value=code||'';
 const go=el('button',{type:'button',class:'pri'},'ตรวจโค้ด'),no=el('button',{type:'button'},'ปิด'),row=el('div',{class:'mvd-row'}),msg=msgEl();row.append(go,no);no.onclick=closeD;
 show([t,p,i,row,msg],code?go:i);
 const norm=()=>i.value.toLowerCase().replace(/[^a-z0-9]/g,'');
 i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go.click();}});
 go.onclick=async()=>{if(busy)return;const c=norm();if(!okCode(c)){sayIn(msg,'โค้ดต้องเป็นตัวอักษร a–z กับเลข 2–9 รวม 9 ตัว',true);return;}
  busy=true;go.disabled=true;sayIn(msg,'กำลังตรวจโค้ด…');const r=await api({a:'peek',code:c});busy=false;go.disabled=false;
  if(!r.j.ok){sayIn(msg,errTxt(r),true);return;}confirmIn(c,r.j);};
 if(code&&okCode(code))go.click();}
function confirmIn(code,info){const here=summary(collect()),there=info.m||{};
 const t=el('h2',{id:'mvd-t'},'แทนที่เซฟในเครื่องนี้?');
 const cmp=el('div',{class:'mvd-cmp'});
 const a=el('div');a.append(el('b',null,`เซฟที่จะย้ายเข้ามา (ส่งมาเมื่อ ${dateTxt(info.at)})`));sumLines(there).forEach(s=>a.append(el('div',null,s)));
 const b=el('div');b.append(el('b',null,'เซฟที่อยู่ในเครื่องนี้ตอนนี้'));(here.keys?sumLines(here):['ยังไม่มีเซฟ']).forEach(s=>b.append(el('div',null,s)));
 cmp.append(a,b);
 const w=el('p',{class:'warn'},'เซฟเดิมในเครื่องนี้จะหายทั้งหมดและเอากลับมาไม่ได้ ถ้ายังอยากเก็บไว้ ให้กด "ส่งเซฟไปเครื่องอื่น" ที่เครื่องนี้ก่อน พอกดแทนที่แล้ว โค้ดนี้จะใช้ไม่ได้อีก');
 const go=el('button',{type:'button',class:'bad'},'แทนที่เซฟเครื่องนี้'),no=el('button',{type:'button'},'ยกเลิก'),row=el('div',{class:'mvd-row'}),msg=msgEl();row.append(go,no);no.onclick=closeD;
 show([t,cmp,w,row,msg],no);
 go.onclick=async()=>{if(busy)return;busy=true;go.disabled=no.disabled=true;sayIn(msg,'กำลังย้ายเซฟ…');
  const r=await api({a:'take',code});
  if(!r.j.ok||typeof r.j.p!=='string'){busy=false;no.disabled=false;sayIn(msg,errTxt(r),true);return;}
  let o=null;try{o=await unpack(r.j.z,r.j.p);}catch(e){o=null;}
  if(!o||typeof o!=='object'||Array.isArray(o)){busy=false;no.disabled=false;sayIn(msg,'อ่านเซฟไม่ได้ เบราว์เซอร์นี้อาจเก่าเกินไป ลองเปิดด้วย Chrome หรือ Safari รุ่นใหม่',true);return;}
  if(!apply(o)){busy=false;no.disabled=false;sayIn(msg,'เขียนเซฟไม่สำเร็จ พื้นที่เก็บข้อมูลในเบราว์เซอร์อาจเต็ม',true);return;}
  try{window.ACH&&window.ACH.onEvent&&window.ACH.onEvent('move',{dir:'in'});}catch(e){}
  sayIn(msg,'ย้ายเซฟเสร็จแล้ว กำลังโหลดเกมใหม่…');setTimeout(()=>{try{location.replace(cleanUrl());}catch(e){location.reload();}},700);};}
// replace every tof-* key (except SKIP) with the incoming ones; on a storage error the old values are put back
function apply(o){const old=collect(),ks=Object.keys(o).filter(k=>typeof k==='string'&&k.startsWith('tof-')&&!SKIP.includes(k)&&typeof o[k]==='string');
 try{Object.keys(old).forEach(k=>localStorage.removeItem(k));ks.forEach(k=>localStorage.setItem(k,o[k]));return true;}
 catch(e){try{ks.forEach(k=>localStorage.removeItem(k));Object.keys(old).forEach(k=>localStorage.setItem(k,old[k]));}catch(e2){}return false;}}
function cleanUrl(){const L=location,q=new URLSearchParams(L.search);q.delete('move');const qs=q.toString();return L.pathname+(qs?'?'+qs:'')+L.hash;}

// ---------- panel + ?move=<code> ----------
function panel(){const memo=document.getElementById('memo'),sec=memo&&memo.closest('section');if(!sec||document.getElementById('mvPanel'))return;css();
 const p=el('section',{class:'panel memo mvp',id:'mvPanel'});p.append(el('h2',null,'ย้ายเซฟ'),el('p',null,'เปลี่ยนมือถือหรือเบราว์เซอร์? ย้ายสุสาน สายตระกูล ความสำเร็จ และรอบที่เล่นค้างไปได้ด้วยโค้ด 9 ตัว ไม่ต้องสมัครสมาชิก'));
 const r=el('div',{class:'mvp-r'}),a=el('button',{type:'button',class:'btn',id:'btnMoveOut'},'📦 ส่งเซฟไปเครื่องอื่น'),b=el('button',{type:'button',class:'btn',id:'btnMoveIn'},'📥 รับเซฟด้วยโค้ด');
 a.onclick=out;b.onclick=()=>inp('');r.append(a,b);p.append(r);sec.after(p);}
function boot(){panel();let code=null;try{code=new URLSearchParams(location.search).get('move');}catch(e){}
 if(code){code=code.toLowerCase().replace(/[^a-z0-9]/g,'');try{history.replaceState(history.state,'',cleanUrl());}catch(e){}if(okCode(code))setTimeout(()=>inp(code),300);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.MOVE={out,in:inp};
})();
