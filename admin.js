// admin.js — แท็บแอดมินสำหรับเทส (เฉพาะบัญชีที่เซิร์ฟเวอร์ตอบ admin:true ใน /api/acct me ดู isAdmin ใน acctlib.js)
// - เซฟแอดมินแยกจากเซฟปกติ: สลับแล้วเก็บคีย์ tof-*/tofc-* ชุดปัจจุบันไว้ที่ 'tofadm-<โหมด>' แล้วเขียนอีกชุดลงไป (MOVE.collect/apply) แล้วรีโหลด
//   คีย์ tofadm-* ไม่ขึ้นต้นด้วย tof- เลยไม่ติดไปกับโค้ดย้ายเซฟหรือเซฟคลาวด์
// - ในเซฟแอดมิน: ไม่ส่งคะแนนขึ้นอันดับ ไม่ตั้งอนุสรณ์ ไม่ซิงก์คลาวด์ (account.js เช็ก ADMIN.on) และมีป้ายมุมจอให้กดกลับเซฟปกติได้เสมอ แม้ไม่ได้ล็อกอิน
// - เสกของได้เฉพาะตอนอยู่ในเซฟแอดมิน ของส่วนใหญ่เขียนลง localStorage แล้วรีโหลดให้ทุกโมดูลอ่านใหม่
// API: window.ADMIN = { on, ok, force:{rank,cls,form,look}|null, open() }
(function(){
'use strict';
if(typeof document==='undefined')return;
const MK='tofadm-mode',SK=m=>'tofadm-'+m;
const rd=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const wr=(k,v)=>{try{localStorage.setItem(k,v);return true;}catch(e){return false;}};
const pj=s=>{try{return JSON.parse(s);}catch(e){return null;}};
const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
const mode=()=>rd(MK)==='admin'?'admin':'normal';
const A=window.ADMIN={on:mode()==='admin',ok:false,force:null,open:()=>{if(window.META)window.META.open('admin');}};
const M=()=>window.META,C=()=>window.CONTENT||{};
let flash='';

// ---------- สลับเซฟ ----------
function swap(to,fresh){const mv=window.MOVE;if(!mv||!mv.collect||!mv.apply){alert('ระบบย้ายเซฟยังไม่พร้อม ลองรีเฟรชหน้าก่อน');return;}
 const cur=mode();if(to===cur&&!fresh)return;
 const now=mv.collect();
 if(to!==cur&&!wr(SK(cur),JSON.stringify(now))){alert('เก็บเซฟตอนนี้ไม่สำเร็จ พื้นที่ในเบราว์เซอร์อาจเต็ม');return;}
 // เซฟแอดมินครั้งแรก (หรือกดเริ่มใหม่) = สำเนาของเซฟปกติ
 let next=fresh?pj(rd(SK('normal')))||(cur==='normal'?now:{}):pj(rd(SK(to)));
 if(!isObj(next))next=to==='admin'?now:{};
 if(!mv.apply(next)){alert('เขียนเซฟไม่สำเร็จ พื้นที่ในเบราว์เซอร์อาจเต็ม');return;}
 wr(MK,to);location.reload();}

// ---------- กันข้อมูลทดสอบหลุดออกไปข้างนอก ----------
function guard(){if(!A.on)return;
 const L=window.LB;if(L){L.submit=()=>null;if(L.live){L.live.start=()=>{};L.live.beat=()=>{};}}
 const MM=window.MEMO;if(MM&&MM.create)MM.create=()=>alert('อยู่ในเซฟแอดมิน ตั้งอนุสรณ์ไม่ได้ สลับกลับเซฟปกติก่อน');}

// ---------- ป้ายมุมจอตอนอยู่ในเซฟแอดมิน ----------
function badge(){if(!A.on||document.getElementById('admBadge'))return;
 const b=document.createElement('div');b.id='admBadge';
 b.innerHTML='<span>🛠 เซฟแอดมิน</span><button type="button" data-g="open">เปิด</button><button type="button" data-g="back">กลับเซฟปกติ</button>';
 b.querySelector('[data-g=open]').onclick=()=>A.open();
 b.querySelector('[data-g=back]').onclick=()=>{if(confirm('กลับไปเซฟปกติ? เซฟแอดมินเก็บไว้ให้ สลับกลับมาเล่นต่อได้'))swap('normal');};
 document.body.appendChild(b);}
function css(){const st=document.createElement('style');st.textContent=`
#admBadge{position:fixed;left:6px;bottom:6px;z-index:9000;display:flex;gap:4px;align-items:center;padding:4px 6px;border-radius:8px;background:rgba(120,20,20,.92);color:#fff;font-size:12px;box-shadow:0 2px 8px #0008}
#admBadge button{font:inherit;font-size:11.5px;padding:2px 7px;border-radius:5px;border:1px solid #fff6;background:transparent;color:#fff;cursor:pointer}
.adm h3{margin:14px 0 6px}.adm .row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0}
.adm select,.adm input{font:inherit;font-size:13px;padding:4px 6px;border-radius:6px;border:1px solid var(--line,#2c3a36);background:#0b1110;color:inherit}
.adm input[type=number]{width:110px}.adm .fl{padding:6px 10px;border-radius:6px;background:rgba(244,187,74,.15);border:1px solid var(--gold,#f4bb4a);margin-bottom:8px}
.adm .warn{color:#ff9a7a}`;document.head.appendChild(st);}

// ---------- ของที่เสกได้ ----------
const LEG=['drk','drs','drg','unicorn','fairy','phoenix','griffin'];
const BLD=['train','market','hosp','hatch','lib','inn','pen','scout','gate'];
function metaUpd(f){const P=M().load();f(P);M().save(P);}
function unlockAll(){
 metaUpd(P=>{P.unlock.city=true;P.unlock.hard=true;P.wins=Math.max(1,P.wins|0);P.slots.m=M().SLOT_M_MAX;P.slots.p=M().SLOT_P_MAX;
  const have=new Set(P.pets.map(p=>p.k));for(const k of LEG){if(P.pets.length>=P.slots.p)break;if(!have.has(k))P.pets.push({id:M().uid(),k,from:'แอดมิน',t:Date.now(),legend:true});}
  const c=P.mod.city=isObj(P.mod.city)?P.mod.city:{};c.b=isObj(c.b)?c.b:{};for(const k of BLD)c.b[k]=5;
  const h=P.mod.hard=isObj(P.mod.hard)?P.mod.hard:{};h.best=20;h.statue=2;
  const f=P.mod.fest=isObj(P.mod.fest)?P.mod.fest:{};f.own=isObj(f.own)?f.own:{};const W=(window.TOWN&&window.TOWN.WEAR)||{};for(const k in W)f.own[k]=1;
  f.stash=Array.isArray(f.stash)?f.stash:[];const D=(window.TOWN&&window.TOWN.DECOR)||{};for(const k in D)if(!f.stash.includes(k))f.stash.push(k);
  const a=P.mod.acct=isObj(P.mod.acct)?P.mod.acct:{};a.own=Object.assign(isObj(a.own)?a.own:{},{halo:1,drhelm:1});});
 wr('tof-unlock-v1',JSON.stringify({nec:1,ang:1}));
 const cl=pj(rd('tof-clan-v1'))||{};Object.assign(cl,{v:1,m:cl.m||'d',got:'fsd',cls:1,g2:1,g3:1,pg:'drk,drs,drg'});if(!Array.isArray(cl.log))cl.log=[];wr('tof-clan-v1',JSON.stringify(cl));
 const ex=pj(rd('tof-excal-v1'))||{};ex.v=ex.v||1;ex.got=1;ex.n=Math.max(1,ex.n|0);wr('tof-excal-v1',JSON.stringify(ex));
 achAll();}
function achAll(){const a=pj(rd('tof-ach-v1'))||{v:1,got:{},runs:0,clsWins:{}};a.got=isObj(a.got)?a.got:{};const t=Date.now();
 for(const x of (window.ACH?window.ACH.list():[]))if(!a.got[x.id])a.got[x.id]=t;wr('tof-ach-v1',JSON.stringify(a));}
function achClear(){const a=pj(rd('tof-ach-v1'))||{};a.got={};wr('tof-ach-v1',JSON.stringify(a));}
const reload=()=>location.reload();

// ---------- แท็บ ----------
function sel(id,opts,v){return`<select id="${id}">${opts.map(([k,n])=>`<option value="${k}"${String(k)===String(v)?' selected':''}>${M().esc(n)}</option>`).join('')}</select>`;}
function render(el,P){const esc=M().esc,on=A.on,au=window.__auto,S=au&&au.S,R=S&&S.R,K=C(),F=A.force||{};
 const hasN=!!rd(SK('normal')),hasA=!!rd(SK('admin'));
 let h=`<div class="adm">${flash?`<div class="fl">${esc(flash)}</div>`:''}
 <h3>💾 เซฟ</h3><p class="mt-dim">ตอนนี้ใช้ <b>${on?'เซฟแอดมิน':'เซฟปกติ'}</b> · เซฟแอดมินแยกจากเซฟปกติ ไม่ขึ้นอันดับ ไม่ตั้งอนุสรณ์ และไม่ซิงก์คลาวด์</p>
 <div class="row">${on?`<button class="mt-btn pri" data-a="toN">กลับเซฟปกติ</button><button class="mt-btn" data-a="fresh">ล้างเซฟแอดมิน เริ่มใหม่จากสำเนาเซฟปกติ</button>`
  :`<button class="mt-btn pri" data-a="toA">${hasA?'สลับไปเซฟแอดมิน':'สร้างเซฟแอดมิน (คัดลอกจากเซฟนี้)'}</button>`}</div>`;
 if(!on){el.innerHTML=h+`<p class="mt-dim">ปุ่มเสกของจะโผล่หลังสลับไปเซฟแอดมิน จะได้ไม่กระทบเซฟจริง</p></div>`;bind(el);return;}
 if(!hasN)h+=`<p class="mt-dim warn">ไม่เจอเซฟปกติที่เก็บไว้ ถ้ากลับเซฟปกติจะได้เซฟว่าง</p>`;
 const RK=(K.RANKS||[]).map((r,i)=>[i,r.k]),CL=(K.CLASSES||[]).map((c,i)=>[i,c.n]),PE=Object.keys(K.PETS||{}).map(k=>[k,(LEG.includes(k)?'✨ ':'')+K.PETS[k].n]);
 h+=`<h3>🔓 ปลดล็อก</h3><div class="row"><button class="mt-btn pri" data-a="all">ปลดล็อกทุกอย่าง</button><button class="mt-btn" data-a="achAll">ปลดความสำเร็จทั้งหมด</button><button class="mt-btn" data-a="achClr">ล้างความสำเร็จ</button></div>
 <p class="mt-dim">ปลดล็อกทุกอย่าง = เมือง โหมดยากผ่านครบ 20 ด่าน รูปปั้นรุ้ง ช่องเต็ม สัตว์ตำนาน อาคารเลเวล 5 ชุดแฟชั่นและของแต่งทุกชิ้น อาชีพลับทั้ง 3 ดาบในหิน และความสำเร็จทั้งหมด แล้วรีโหลดหน้า</p>
 <h3>🪙 เสกเหรียญ</h3><div class="row">เหรียญเมือง <input type="number" id="admG" value="100000"><button class="mt-btn" data-a="gold">เสก</button></div>
 <div class="row">เหรียญรุ้ง <input type="number" id="admRb" value="100"><button class="mt-btn" data-a="rb">เสก</button></div>
 <h3>🐾 เสกสัตว์เข้าคอก</h3><div class="row">${sel('admPet',PE,'')}<button class="mt-btn" data-a="pet">เสก</button><span class="mt-dim">คอก ${P.pets.length}/${P.slots.p}</span></div>
 <h3>👶 ฮีโร่ที่จะเกิด</h3><div class="row">แรงค์ ${sel('admRk',[['','สุ่ม'],...RK],F.rank??'')} อาชีพ ${sel('admCl',[['','สุ่ม'],...CL],F.cls??'')} ร่าง ${sel('admFm',[['','สุ่ม'],['slime','สไลม์'],['human','คน']],F.form||'')}
 หน้าตาหายาก ${sel('admRr',[['','สุ่ม'],['0.001','สไลม์ทองคำ / คนผมไฟ'],['0.01','สไลม์เงามืด / คนตาสองสี'],['0.025','สไลม์คริสตัล / คนตาสองสี']],F.look&&F.look.rr!=null?F.look.rr:'')}</div>
 <div class="row"><button class="mt-btn pri" data-a="born" ${S&&S.phase==='birth'?'':'disabled'}>เกิดใหม่ตามนี้</button><button class="mt-btn" data-a="keep">จำไว้ใช้ตอนเกิดครั้งหน้า</button><button class="mt-btn" data-a="unforce">เลิกบังคับ</button></div>
 <p class="mt-dim">${S&&S.phase==='birth'?'อยู่หน้าเกิด กดเกิดใหม่ได้เลย':'ปุ่มเกิดใหม่ใช้ได้ที่หน้าเกิด ตอนนี้กดจำไว้ก่อน ฮีโร่คนถัดไปจะออกมาตามนี้'}</p>`;
 if(R&&R.alive){h+=`<h3>⚔️ รอบที่เล่นอยู่ (${esc(R.h.name)} ชั้น ${R.floor})</h3>
 <div class="row"><button class="mt-btn" data-a="heal">เติม HP/MP เต็ม</button><button class="mt-btn" data-a="pot">ยาฟื้นพลัง +3</button><button class="mt-btn" data-a="rgold">ทอง +1,000</button><button class="mt-btn" data-a="buff">ค่าพลัง x2</button></div>
 <div class="row">ข้ามไปชั้น <input type="number" id="admFl" min="1" max="100" value="${Math.min(100,R.floor+10)}"><button class="mt-btn" data-a="floor">ไป</button></div>`;}
 const WL=window.WEV?window.WEV.list():[],FL=window.FEST?window.FEST.list():[];
 h+=`<h3>📅 อีเวนต์ (จำไว้จนปิดแท็บ)</h3><div class="row">ประจำสัปดาห์ ${sel('admWev',[['','ตามปฏิทิน'],...WL.map(e=>[e.id,(e.ic||'')+' '+e.n])],'')}<button class="mt-btn" data-a="wev">ตั้ง</button></div>
 <div class="row">เทศกาล ${sel('admFest',[['','ตามปฏิทิน'],...FL.map(e=>[e.id,(e.ic||'')+' '+e.n])],'')}<button class="mt-btn" data-a="fest">ตั้ง</button></div></div>`;
 el.innerHTML=h;bind(el);}
function readForce(el){const v=id=>{const e=el.querySelector('#'+id);return e?e.value:'';};const f={};
 if(v('admRk')!=='')f.rank=+v('admRk');if(v('admCl')!=='')f.cls=+v('admCl');if(v('admFm'))f.form=v('admFm');if(v('admRr'))f.look={rr:+v('admRr')};
 A.force=Object.keys(f).length?f:null;try{A.force?sessionStorage.setItem('tofadm-force',JSON.stringify(A.force)):sessionStorage.removeItem('tofadm-force');}catch(e){}}
function bind(el){const q=s=>el.querySelector(s),num=id=>Math.round(+((q('#'+id)||{}).value)||0),au=window.__auto,done=t=>{flash=t;M().refresh();};
 const on=(a,f)=>{const b=q(`[data-a=${a}]`);if(b)b.onclick=f;};
 on('toA',()=>swap('admin'));on('toN',()=>{if(confirm('กลับไปเซฟปกติ? เซฟแอดมินเก็บไว้ให้'))swap('normal');});
 on('fresh',()=>{if(confirm('ลบเซฟแอดมินตอนนี้ทิ้ง แล้วเริ่มใหม่จากสำเนาเซฟปกติ?'))swap('admin',true);});
 on('all',()=>{unlockAll();reload();});on('achAll',()=>{achAll();reload();});on('achClr',()=>{if(confirm('ล้างความสำเร็จในเซฟแอดมินทั้งหมด?')){achClear();reload();}});
 on('gold',()=>{M().addGold(num('admG'));done('เสกเหรียญเมืองแล้ว');});
 on('rb',()=>{metaUpd(P=>{const h=P.mod.hard=isObj(P.mod.hard)?P.mod.hard:{};const n=num('admRb');h.rb=Math.max(0,(h.rb|0)+n);if(n>0)h.rbAll=(h.rbAll|0)+n;});done('เสกเหรียญรุ้งแล้ว');});
 on('pet',()=>{const k=(q('#admPet')||{}).value;if(!k)return;metaUpd(P=>{if(P.pets.length>=P.slots.p)P.slots.p=Math.min(M().SLOT_P_MAX,P.slots.p+1);if(P.pets.length<P.slots.p)P.pets.push({id:M().uid(),k,from:'แอดมิน',t:Date.now(),legend:LEG.includes(k)||undefined});});done('เสกสัตว์แล้ว (ถ้าคอกเต็ม 6 ช่องจะไม่เพิ่ม)');});
 on('keep',()=>{readForce(el);done(A.force?'จำไว้แล้ว ฮีโร่คนถัดไปจะเกิดตามนี้':'ไม่ได้เลือกอะไร ฮีโร่จะสุ่มตามปกติ');});
 on('unforce',()=>{A.force=null;try{sessionStorage.removeItem('tofadm-force');}catch(e){}done('เลิกบังคับแล้ว');});
 on('born',()=>{readForce(el);if(au&&au.adminBirth&&au.adminBirth())done('เกิดใหม่แล้ว');else done('ใช้ได้เฉพาะที่หน้าเกิด');});
 const R=au&&au.S&&au.S.R,run=(f,t)=>{if(!R||!R.alive)return;f(R,R.h);try{au.render();au.save();}catch(e){}done(t);};
 on('heal',()=>run((R,h)=>{h.hp=h.mhp;h.mp=h.mmp;},'เติมเต็มแล้ว'));
 on('pot',()=>run(R=>{R.potions=(R.potions|0)+3;},'ได้ยาเพิ่ม 3 ขวด'));
 on('rgold',()=>run((R,h)=>{h.gold=(h.gold|0)+1000;},'ได้ทอง 1,000'));
 on('buff',()=>run((R,h)=>{h.mhp*=2;h.hp=h.mhp;h.atk*=2;h.def*=2;},'HP ATK DEF คูณสองแล้ว'));
 on('floor',()=>run(R=>{const f=Math.max(1,Math.min(100,num('admFl')));R.floor=f;R.maxFloor=Math.max(R.maxFloor|0,f);},'ย้ายชั้นแล้ว'));
 on('wev',()=>{const v=(q('#admWev')||{}).value;window.WEV&&window.WEV.force(v||null);done(v?'ตั้งอีเวนต์แล้ว':'กลับไปตามปฏิทินแล้ว');});
 on('fest',()=>{const v=(q('#admFest')||{}).value;window.FEST&&window.FEST.force(v||'');done(v?'ตั้งเทศกาลแล้ว':'กลับไปตามปฏิทินแล้ว');});}
function regTab(){if(!M()||M().hasTab('admin'))return;M().tab('admin',{n:'🛠 แอดมิน',o:95,render});}

// ---------- เริ่ม ----------
function boot(){css();try{const f=pj(sessionStorage.getItem('tofadm-force'));if(isObj(f))A.force=f;}catch(e){}
 if(A.on){guard();badge();regTab();}   // อยู่ในเซฟแอดมินอยู่แล้ว: เปิดแท็บได้เสมอ จะได้กลับเซฟปกติได้แม้หลุดล็อกอิน
 const ac=window.ACCT;if(ac&&ac.name&&ac.name())ac.me().then(j=>{if(j&&j.admin){A.ok=true;regTab();}}).catch(()=>{});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,0);
})();
