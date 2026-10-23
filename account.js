// account.js — บัญชีผู้เล่น (ชื่อ + รหัสผ่าน) เซฟคลาวด์ และร้านพิเศษที่จ่ายเงินจริง
// โหลดต่อจาก meta.js · แท็บ 'acct' ในหน้าต่างตระกูลและเมือง + ปุ่มเล็กบนหน้าเกิด (ห่อ META.button/bind)
// เซิร์ฟเวอร์: /api/acct (functions/api/acct.js), /api/pay/checkout, /api/pay/webhook · ตาราง migrations/0003_account.sql
// เซฟคลาวด์ใช้ชุดคีย์ tof-* เดียวกับโค้ดย้ายเซฟ (MOVE.collect/pack/unpack/apply ใน savemove.js) · โทเคนอยู่ใน tof-acct-v1 ซึ่งไม่ถูกย้าย/อัปโหลด
// ของที่ซื้อ: เซิร์ฟเวอร์ส่งรายการ ent มาตอนเข้าระบบ/ซิงก์ เกมใส่ให้ครั้งเดียวต่อรายการ จำไว้ใน P.mod.acct.ap[id] (เชื่อแค่ข้อมูลจากเซิร์ฟเวอร์)
// API: window.ACCT = { name(), me(), sync(force), open() }
(function(){
'use strict';
if(typeof document==='undefined'||!window.META)return;
const M=window.META,KEY='tof-acct-v1',GAP=90e3;   // ซิงก์อัตโนมัติไม่ถี่กว่าทุก 90 วินาที
const esc=M.esc,isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
const NAME_RE=/^[a-zA-Z0-9_ก-๎]{3,16}$/;
const nf=n=>Number(n||0).toLocaleString('th-TH');
const baht=a=>(a/100).toLocaleString('th-TH',{maximumFractionDigits:2});
const dateTxt=t=>{try{return new Date(t).toLocaleString('th-TH',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){return'';}};
const fnv=s=>{let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(36);};

// ---------- สถานะในเครื่อง ----------
function st(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(isObj(v))return v;}catch(e){}return{};}
function put(o){try{if(o&&o.tok)localStorage.setItem(KEY,JSON.stringify(o));else localStorage.removeItem(KEY);}catch(e){}}
const S0=st();if(S0.exp&&S0.exp<Date.now())put(null);
const name=()=>{const s=st();return s.tok?s.name||'':'';};
let me0=null,shop=null,busy=false,msg={t:'',bad:false},pend=null;   // pend = เซฟจากคลาวด์ที่รอยืนยันก่อนทับ
function say(t,bad){msg={t,bad:!!bad};M.refresh();}

// ---------- เครือข่าย ----------
async function call(url,body,auth){const ctl=typeof AbortController!=='undefined'?new AbortController():null;const tm=setTimeout(()=>{try{ctl&&ctl.abort();}catch(e){}},30000);
 try{const h={'Content-Type':'application/json'},s=st();if(auth&&s.tok)h.Authorization='Bearer '+s.tok;
  const o={method:body?'POST':'GET',headers:h};if(body)o.body=JSON.stringify(body);if(ctl)o.signal=ctl.signal;
  const r=await fetch(url,o);let j=null;try{j=await r.json();}catch(e){}j=isObj(j)?j:{};
  if(auth&&r.status===401&&j.error==='auth'){put(null);me0=null;}   // โทเคนหมดอายุหรือถูกออกจากระบบที่เครื่องอื่น
  return{st:r.status,j};}catch(e){return{st:0,j:{}};}finally{clearTimeout(tm);}}
const acct=(b,auth=true)=>call('/api/acct',b,auth);
function errTxt(r){const e=r.j.error;if(r.st===0)return'ต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้งนะ';
 if(e==='rate-limited'){const m=Math.ceil((r.j.retryAfter||60)/60);return`ลองบ่อยเกินไปแล้ว รออีกราว ${m} นาทีค่อยลองใหม่`;}
 return({taken:'ชื่อนี้มีคนใช้แล้ว ลองชื่ออื่นนะ','bad-name':'ชื่อต้องยาว 3–16 ตัว ใช้ได้แค่อักษรไทย อังกฤษ ตัวเลข และ _','bad-pw':'รหัสผ่านต้องยาว 8 ตัวขึ้นไป',
  'bad-login':'ชื่อหรือรหัสผ่านไม่ถูก',auth:'หลุดจากระบบแล้ว เข้าสู่ระบบใหม่อีกครั้งนะ','too-large':'เซฟในเครื่องนี้ใหญ่เกินกว่าจะเก็บขึ้นคลาวด์ได้',
  'no-save':'ยังไม่มีเซฟบนคลาวด์ของบัญชีนี้',closed:'ร้านยังไม่เปิดขาย','not-ready':'ระบบบัญชียังไม่เปิด ลองใหม่ทีหลังนะ',stripe:'ระบบจ่ายเงินมีปัญหา ลองใหม่ทีหลังนะ'})[e]||'มีบางอย่างผิดพลาด ลองใหม่อีกครั้งนะ';}

// ---------- ของที่ซื้อ ----------
const MAXM=M.SLOT_M_MAX,MAXP=M.SLOT_P_MAX;
const WEAR_N={halo:'วงแหวนเทวดา',drhelm:'หมวกเขามังกร'};
function ast(P){if(!isObj(P.mod))P.mod={};const a=P.mod.acct=isObj(P.mod.acct)?P.mod.acct:{};if(!isObj(a.ap))a.ap={};if(!isObj(a.own))a.own={};return a;}
// รายการ ent ที่ยังไม่เคยใส่ในโปรไฟล์นี้ → ใส่ให้ (ช่องเกินเพดานของ meta ไม่ได้ ส่วนเกินทิ้งไป ร้านจึงปิดปุ่มเมื่อเต็มแล้ว)
function applyEnts(list){if(!Array.isArray(list)||!list.length)return 0;const P=M.load(),a=ast(P);let n=0;
 list.forEach(e=>{if(!e||!e.id||a.ap[e.id])return;const g=GIVE[e.sku];if(!g)return;
  for(let i=0;i<Math.max(1,e.qty|0);i++)g(P,a);a.ap[e.id]=1;n++;});
 if(n){M.save(P);M.grantAch('acct_vip');M.refresh();}return n;}
const GIVE={slot_m5:P=>{P.slots.m=Math.min(MAXM,P.slots.m+5);},slot_p1:P=>{P.slots.p=Math.min(MAXP,P.slots.p+1);},
 gold_s:P=>{P.gold+=3000;},gold_l:P=>{P.gold+=10000;},wear_halo:(P,a)=>{a.own.halo=1;},wear_drhelm:(P,a)=>{a.own.drhelm=1;}};
// ซื้อได้ไหม (ช่องเต็มแล้ว/มีชุดแล้ว = ไม่ต้องซื้อ)
function canBuy(sku,P){const a=ast(P);if(sku==='slot_m5')return P.slots.m<MAXM;if(sku==='slot_p1')return P.slots.p<MAXP;
 if(sku.indexOf('wear_')===0)return!a.own[sku.slice(5)];return true;}
async function loadShop(){if(shop)return shop;const r=await call('/api/pay/checkout');
 shop=r.st===200&&isObj(r.j.items)?{open:!!r.j.open,items:r.j.items}:{open:false,items:{}};return shop;}

// ---------- แฟชั่นพิเศษ (วาดในล็อบบี้ผ่าน TOWN.WEAR · ใส่ทับ P.mod.fest.wear ที่ town.js อ่านอยู่แล้ว) ----------
function px(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h);}
const WEAR={
 halo:{n:WEAR_N.halo,draw(c,x,y,t){const g=Math.floor((t||0)/400)%2?'#fff4b0':'#ffe27a';px(c,x-4,y-6,8,1,g);px(c,x-5,y-5,1,1,g);px(c,x+4,y-5,1,1,g);px(c,x-4,y-4,8,1,'#e8b84a');}},
 drhelm:{n:WEAR_N.drhelm,draw(c,x,y){px(c,x-5,y-2,10,3,'#3a7a4a');px(c,x-4,y-3,8,1,'#4e9a5e');px(c,x-6,y-5,2,3,'#e8e0c8');px(c,x-7,y-7,1,2,'#e8e0c8');
  px(c,x+4,y-5,2,3,'#e8e0c8');px(c,x+6,y-7,1,2,'#e8e0c8');px(c,x-1,y-1,2,1,'#e0302a');}}};
function regWear(){const T=window.TOWN;if(T&&T.WEAR)for(const k in WEAR)if(!T.WEAR[k])T.WEAR[k]=WEAR[k];}

// ---------- เซฟคลาวด์ ----------
const MV=()=>window.MOVE&&window.MOVE.collect?window.MOVE:null;
let last={at:0,h:''},timer=0;try{const s=st();if(isObj(s.last))last=s.last;}catch(e){}
function keepLast(){const s=st();if(s.tok){s.last=last;put(s);}}
async function upload(force){const mv=MV();if(!mv||!name())return{st:0,j:{error:'auth'}};
 const o=mv.collect(),h=fnv(JSON.stringify(o));if(!force&&h===last.h)return{st:200,j:{ok:true,same:true}};
 let pk=null;try{pk=await mv.pack(o);}catch(e){}if(!pk)return{st:413,j:{error:'too-large'}};
 const r=await acct({a:'save',z:pk.z,p:pk.p,m:mv.summary(o)});
 if(r.j.ok){last={at:r.j.at||Date.now(),h};keepLast();if(me0)me0.save={at:last.at,m:mv.summary(o)};M.grantAch('acct_cloud');}
 return r;}
// ซิงก์เบาๆ: จบรอบหรือปิดหน้าต่างตระกูล → รอให้เซฟเขียนเสร็จก่อน แล้วอัปโหลดถ้าข้อมูลเปลี่ยนและห่างครั้งก่อนพอ
function soon(){if(!name()||st().auto===false)return;clearTimeout(timer);const d=Math.max(2000,last.at+GAP-Date.now());
 timer=setTimeout(async()=>{if(busy)return soon();const r=await upload(false);if(r.j.ok&&!r.j.same)M.refresh();
  if(r.j.error==='rate-limited'){last.at=Date.now();soon();}},d);}
async function me(){if(!name())return null;const r=await acct({a:'me'});if(!r.j.ok)return null;me0=r.j;
 const s=st();if(s.tok&&s.name!==r.j.name){s.name=r.j.name;put(s);}
 await loadShop();applyEnts(r.j.ent);return me0;}

// ---------- แท็บ 👤 บัญชี ----------
function css(){const s=document.createElement('style');s.textContent=`
.ac-f{display:grid;gap:6px;max-width:320px}.ac-f input{padding:8px 10px;border-radius:6px;border:1px solid var(--line,#2c3a36);background:rgba(0,0,0,.25);color:inherit;font:inherit;font-size:15px}
.ac-f input:focus{outline:2px solid var(--gold,#f4bb4a);outline-offset:1px}
.ac-msg{min-height:18px;margin:6px 0;font-size:13px;color:#86d67f}.ac-msg.bad{color:#ef6b5e}
.ac-box{border:1px solid var(--line,#2c3a36);border-radius:8px;padding:10px;margin:10px 0;background:rgba(255,255,255,.03)}
.ac-box h3{margin:0 0 6px;font-size:15px}.ac-warn{color:#f2c14e;font-size:13px}
.ac-shop{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}
.ac-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0}.ac-row select{font:inherit;font-size:13px;padding:3px;border-radius:5px;background:rgba(0,0,0,.25);color:inherit;border:1px solid var(--line,#2c3a36)}
#btnAcct{font-size:13px;padding:6px 10px;min-height:0}`;document.head.appendChild(s);}
css();
const msgHTML=()=>`<p class="ac-msg${msg.bad?' bad':''}" role="status" aria-live="polite">${esc(msg.t)}</p>`;
function renderOut(el){
 el.innerHTML=`<p class="mt-dim">มีบัญชีไว้ก็เก็บตระกูล สุสาน และความสำเร็จขึ้นคลาวด์ได้ ตัวละครที่ชอบจะไม่หายไปกับเบราว์เซอร์ แค่ตั้งชื่อกับรหัสผ่าน ไม่ต้องใช้อีเมล</p>
 <form class="ac-f" id="acForm" autocomplete="on"><input id="acName" name="username" autocomplete="username" maxlength="16" placeholder="ชื่อบัญชี (3–16 ตัว)" aria-label="ชื่อบัญชี">
 <input id="acPw" name="password" type="password" autocomplete="current-password" maxlength="72" placeholder="รหัสผ่าน (8 ตัวขึ้นไป)" aria-label="รหัสผ่าน">
 <div><button class="mt-btn pri" type="submit" data-a="login">เข้าสู่ระบบ</button><button class="mt-btn" type="button" data-a="signup">สมัครบัญชีใหม่</button></div></form>
 ${msgHTML()}<p class="mt-dim">ลืมรหัสผ่านแล้วกู้คืนไม่ได้ เพราะเราไม่เก็บอีเมล จดไว้ให้ดีนะ</p>${shopHTML(M.load())}`;
 const f=el.querySelector('#acForm'),go=async a=>{if(busy)return;const n=f.querySelector('#acName').value.trim(),pw=f.querySelector('#acPw').value;
  if(!NAME_RE.test(n)){say(errTxt({st:400,j:{error:'bad-name'}}),true);return;}if(pw.length<8){say(errTxt({st:400,j:{error:'bad-pw'}}),true);return;}
  busy=true;say(a==='signup'?'กำลังสร้างบัญชี…':'กำลังเข้าสู่ระบบ…');const r=await acct({a,name:n,pw},false);busy=false;
  if(!r.j.ok||!r.j.tok){say(errTxt(r),true);return;}
  put({name:r.j.name,tok:r.j.tok,exp:r.j.exp,auto:true});last={at:0,h:''};if(a==='signup')M.grantAch('acct_new');
  await me();say(a==='signup'?`สร้างบัญชี ${r.j.name} แล้ว ลองกด "บันทึกขึ้นคลาวด์" ดูนะ`:`ยินดีต้อนรับกลับ ${r.j.name}`);bindBirth();};
 f.onsubmit=e=>{e.preventDefault();go('login');};el.querySelector('[data-a=signup]').onclick=()=>go('signup');}
function renderIn(el,P){const s=st(),sv=me0&&me0.save,mv=MV();
 if(pend){const here=mv.summary(mv.collect());
  el.innerHTML=`<div class="ac-box"><h3>โหลดเซฟจากคลาวด์มาทับเครื่องนี้?</h3>
  <p><b>บนคลาวด์</b> (บันทึกเมื่อ ${esc(dateTxt(pend.at))})<br>${mv.sumLines(mv.summary(pend.o)).map(esc).join('<br>')}</p>
  <p><b>ในเครื่องนี้ตอนนี้</b><br>${(here.keys?mv.sumLines(here):['ยังไม่มีเซฟ']).map(esc).join('<br>')}</p>
  <p class="ac-warn">เซฟในเครื่องนี้จะหายทั้งหมด ถ้ายังอยากเก็บไว้ ให้กด "บันทึกขึ้นคลาวด์" ก่อน (เซฟบนคลาวด์จะถูกทับแทน)</p>
  <button class="mt-btn pri" data-a="yes">แทนที่เซฟเครื่องนี้</button><button class="mt-btn" data-a="no">ยกเลิก</button></div>${msgHTML()}`;
  el.querySelector('[data-a=no]').onclick=()=>{pend=null;say('');};
  el.querySelector('[data-a=yes]').onclick=()=>{const o=pend.o;pend=null;if(!mv.apply(o)){say('เขียนเซฟไม่สำเร็จ พื้นที่เก็บข้อมูลในเบราว์เซอร์อาจเต็ม',true);return;}
   last={at:Date.now(),h:fnv(JSON.stringify(mv.collect()))};keepLast();say('โหลดเซฟเสร็จแล้ว กำลังเปิดเกมใหม่…');setTimeout(()=>location.reload(),600);};
  return;}
 el.innerHTML=`<p>เข้าสู่ระบบเป็น <b>${esc(s.name)}</b></p>
 <div class="ac-box"><h3>☁️ เซฟคลาวด์</h3>
 <p class="mt-dim">${sv?`บันทึกล่าสุด ${esc(dateTxt(sv.at))}${sv.m&&mv?' · '+esc(mv.sumLines(sv.m)[0]):''}`:(me0?'ยังไม่เคยบันทึกขึ้นคลาวด์':'กำลังดูข้อมูลบนคลาวด์…')}</p>
 <button class="mt-btn pri" data-a="up">บันทึกขึ้นคลาวด์</button><button class="mt-btn" data-a="down" ${sv?'':'disabled'}>โหลดจากคลาวด์</button>
 <label class="ac-row mt-dim"><input type="checkbox" data-a="auto" ${s.auto!==false?'checked':''}> บันทึกให้เองตอนจบรอบและตอนปิดหน้าต่างนี้</label></div>
 ${msgHTML()}${shopHTML(P)}${dressHTML(P)}
 <details class="ac-box"><summary>เปลี่ยนรหัสผ่าน</summary><form class="ac-f" id="acPwF" style="margin-top:8px">
 <input type="text" name="username" autocomplete="username" value="${esc(s.name)}" hidden>
 <input id="acOld" type="password" autocomplete="current-password" maxlength="72" placeholder="รหัสผ่านเดิม" aria-label="รหัสผ่านเดิม">
 <input id="acNew" type="password" autocomplete="new-password" maxlength="72" placeholder="รหัสผ่านใหม่ (8 ตัวขึ้นไป)" aria-label="รหัสผ่านใหม่">
 <div><button class="mt-btn pri" type="submit">เปลี่ยนรหัสผ่าน</button></div></form><p class="mt-dim">เปลี่ยนแล้วเครื่องอื่นที่เข้าบัญชีนี้อยู่จะถูกออกจากระบบ</p></details>
 <button class="mt-btn" data-a="out">ออกจากระบบ</button>`;
 const q=s=>el.querySelector(s);
 q('[data-a=up]').onclick=async()=>{if(busy)return;busy=true;say('กำลังบันทึก…');const r=await upload(true);busy=false;say(r.j.ok?'บันทึกขึ้นคลาวด์แล้ว':errTxt(r),!r.j.ok);};
 q('[data-a=down]').onclick=async()=>{if(busy)return;busy=true;say('กำลังโหลดเซฟจากคลาวด์…');const r=await acct({a:'load'});busy=false;
  if(!r.j.ok||typeof r.j.p!=='string'){say(errTxt(r),true);return;}let o=null;try{o=await mv.unpack(r.j.z,r.j.p);}catch(e){}
  if(!isObj(o)){say('อ่านเซฟไม่ได้ เบราว์เซอร์นี้อาจเก่าเกินไป',true);return;}pend={o,at:r.j.at};say('');};
 q('[data-a=auto]').onchange=e=>{const s=st();s.auto=!!e.target.checked;put(s);};
 q('#acPwF').onsubmit=async e=>{e.preventDefault();if(busy)return;const pw=q('#acOld').value,npw=q('#acNew').value;if(npw.length<8){say(errTxt({st:400,j:{error:'bad-pw'}}),true);return;}
  busy=true;say('กำลังเปลี่ยนรหัสผ่าน…');const r=await acct({a:'passwd',pw,npw});busy=false;
  if(!r.j.ok){say(errTxt(r),true);return;}const s=st();s.tok=r.j.tok;s.exp=r.j.exp;put(s);say('เปลี่ยนรหัสผ่านแล้ว');};
 q('[data-a=out]').onclick=async()=>{if(busy)return;busy=true;await acct({a:'logout'});busy=false;put(null);me0=null;last={at:0,h:''};say('ออกจากระบบแล้ว เซฟในเครื่องนี้ยังอยู่เหมือนเดิม');bindBirth();};
 bindDress(el);}
// 💎 ร้านพิเศษ
function shopHTML(P){if(!shop)return`<div class="ac-box"><h3>💎 ร้านพิเศษ</h3><p class="mt-dim">กำลังเปิดร้าน…</p></div>`;
 if(!shop.open)return`<div class="ac-box"><h3>💎 ร้านพิเศษ</h3><p class="mt-dim">ยังไม่เปิดขาย</p></div>`;
 const login=!!name();
 return`<div class="ac-box"><h3>💎 ร้านพิเศษ</h3><p class="mt-dim">${login?'จ่ายด้วยบัตรหรือพร้อมเพย์ผ่าน Stripe ของจะเข้าบัญชีหลังจ่ายเสร็จ เครื่องไหนที่เข้าบัญชีนี้ก็ได้ของเหมือนกัน':'เข้าสู่ระบบก่อนถึงจะซื้อได้ ของที่ซื้อจะผูกกับบัญชี'}</p>
 <div class="ac-shop">${Object.keys(shop.items).filter(k=>GIVE[k]).map(k=>{const it=shop.items[k],ok=canBuy(k,P);
  return`<div class="mt-card"><b>${esc(it.n)}</b><div class="mt-dim">${esc(it.d)}</div><button class="mt-btn pri" data-buy="${esc(k)}" ${login&&ok?'':'disabled'}>${ok?`${baht(it.amt)} บาท`:(k.indexOf('wear_')===0?'มีแล้ว':'เต็มแล้ว')}</button></div>`;}).join('')}</div></div>`;}
function bindShop(el){el.querySelectorAll('[data-buy]').forEach(b=>b.onclick=async()=>{if(busy)return;busy=true;say('กำลังเปิดหน้าจ่ายเงิน…');
 const r=await call('/api/pay/checkout',{sku:b.dataset.buy},true);busy=false;
 if(!r.j.ok||typeof r.j.url!=='string'||r.j.url.indexOf('https://checkout.stripe.com/')!==0){say(errTxt(r),true);return;}
 // เก็บเซฟขึ้นคลาวด์ก่อนออกไปหน้าจ่ายเงิน กันของหายถ้าเบราว์เซอร์ปิดแท็บ
 try{await upload(false);}catch(e){}location.href=r.j.url;});}
// แต่งตัวด้วยชุดพิเศษ
function dressHTML(P){const own=Object.keys(ast(P).own).filter(k=>WEAR[k]);if(!own.length||!P.roster.length)return'';const W=((P.mod.fest||{}).wear)||{};
 return`<div class="ac-box"><h3>👒 ชุดพิเศษ</h3>${P.roster.map(m=>{const cur=W[m.id]||'',other=cur&&!WEAR[cur];
  return`<div class="ac-row"><b>${esc(m.name)}</b><select data-dress="${esc(m.id)}" aria-label="ชุดของ ${esc(m.name)}"><option value="">ไม่สวม</option>${other?`<option value="${esc(cur)}" selected>ชุดเทศกาลที่ใส่อยู่</option>`:''}${own.map(k=>`<option value="${k}"${cur===k?' selected':''}>${esc(WEAR[k].n)}</option>`).join('')}</select></div>`;}).join('')}</div>`;}
function bindDress(el){el.querySelectorAll('[data-dress]').forEach(sl=>sl.onchange=()=>{const P=M.load(),a=ast(P),id=sl.dataset.dress,k=sl.value;
 if(!isObj(P.mod.fest))P.mod.fest={};const f=P.mod.fest;if(!isObj(f.wear))f.wear={};
 if(!k)delete f.wear[id];else if(a.own[k])f.wear[id]=k;else return;M.save(P);
 try{window.dispatchEvent(new CustomEvent('tof:fest-wear',{detail:{id,k}}));}catch(e){}});}

let fetched=false;
M.tab('acct',{n:'👤 บัญชี',o:90,render(el,P){
 if(!shop)loadShop().then(()=>M.refresh());
 if(name()&&!fetched){fetched=true;me().then(()=>M.refresh());}
 if(name())renderIn(el,P);else{pend=null;renderOut(el);}
 bindShop(el);}});

// ---------- ปุ่มเล็กบนหน้าเกิด ----------
const b0=M.button,bd0=M.bind;
M.button=function(){const n=name();return b0.apply(this,arguments)+`<button class="btn" id="btnAcct" type="button" title="บัญชีและเซฟคลาวด์">👤 ${n?esc(n):'บัญชี'}</button>`;};
M.bind=function(){bd0.apply(this,arguments);const b=document.getElementById('btnAcct');if(b)b.onclick=()=>M.open('acct');};
function bindBirth(){const b=document.getElementById('btnAcct');if(b){const n=name();b.textContent='👤 '+(n||'บัญชี');}}

// ---------- ซิงก์อัตโนมัติ ----------
M.onRun(()=>soon());
window.addEventListener('tof:meta-close',()=>{msg={t:'',bad:false};pend=null;soon();});

try{window.ACH&&window.ACH.add&&window.ACH.add([
 {id:'acct_new',n:'มีชื่อในทะเบียน',d:'สร้างบัญชีผู้เล่น',icon:'👤',tier:'bronze'},
 {id:'acct_cloud',n:'ฝากไว้บนฟ้า',d:'บันทึกเซฟขึ้นคลาวด์ครั้งแรก',icon:'☁️',tier:'bronze'},
 {id:'acct_vip',n:'ผู้อุปถัมภ์หอคอย',d:'ได้ของจากร้านพิเศษเป็นครั้งแรก',icon:'💎',tier:'silver'}]);}catch(e){}

// ---------- เปิดเกม: กลับมาจากหน้าจ่ายเงิน (?paid=sku|0) / ดึงของที่ซื้อ ----------
function boot(){regWear();let paid=null;try{const q=new URLSearchParams(location.search);paid=q.get('paid');if(paid!=null){q.delete('paid');const qs=q.toString();history.replaceState(history.state,'',location.pathname+(qs?'?'+qs:'')+location.hash);}}catch(e){}
 if(!name())return;
 fetched=true;
 if(paid==null){me();return;}
 if(paid==='0'){msg={t:'ยกเลิกการจ่ายเงินแล้ว ไม่มีการตัดเงิน',bad:false};setTimeout(()=>M.open('acct'),400);return;}
 // webhook อาจมาช้ากว่าคนกลับมาที่เกมนิดหน่อย ถามซ้ำสักพัก
 msg={t:'กำลังรอยืนยันการจ่ายเงิน…',bad:false};setTimeout(()=>M.open('acct'),400);let n=0;
 const poll=async()=>{const P0=M.load(),a0=Object.keys(ast(P0).ap).length;await me();fetched=true;const a1=Object.keys(ast(M.load()).ap).length;
  if(a1>a0){say('ได้รับของแล้ว ขอบคุณที่สนับสนุนหอคอยนะ');return;}
  if(++n<10)setTimeout(poll,3000);else say('ยังไม่เห็นการจ่ายเงิน ถ้าจ่ายแล้ว ของจะเข้าเองตอนเปิดเกมครั้งหน้า',true);};
 poll();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,0);

window.ACCT={name,me,sync:f=>upload(!!f),open:()=>M.open('acct')};
})();
