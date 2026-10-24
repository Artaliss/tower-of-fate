// Tower of Fate — TOUR: guided spotlight tour on a brand-new player's first visit (birth screen), replayable from ❓ and ☰.
// API: window.TOUR = { start(), stop(), open (bool) }
// First visit only: key 'tof-tour-v1'. Returning players (finished runs, graveyard, started run, lineage) are marked seen silently.
// Holds game time with the same 'tof:pause' event tips.js and the ☰ sheet use (counted, so it nests with them).
(function(){
'use strict';
const KEY='tof-tour-v1';
const ls={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
const esc=window.META.esc;

// q: selectors tried in order, the first one on screen gets the spotlight (none = centred bubble, whole page dimmed)
const STEPS=[
{q:['.card .cert .tiles','.card .cert','#hSub'],t:'แรงค์กับอาชีพ',d:'สุ่มมาตั้งแต่เกิด แรงค์ยิ่งสูงค่าสถานะยิ่งดี และแต่ละอาชีพมีสกิลติดตัวไม่เหมือนกัน ถ้าไม่ถูกใจ กด 🔄 สุ่มแรงค์ใหม่ได้หนึ่งครั้ง',dr:'สุ่มมาตั้งแต่เกิด แรงค์ยิ่งสูงค่าสถานะยิ่งดี และแต่ละอาชีพมีสกิลติดตัวไม่เหมือนกัน ดูได้ที่บรรทัดใต้ชื่อฮีโร่'},
{q:['#formBox'],birth:1,t:'ร่างสไลม์หรือคน',d:'เลือกได้ก่อนเข้าหอ ร่างเปลี่ยนแค่หน้าตา ค่าสถานะเท่าเดิม ส่วนปุ่ม 🎲 สุ่มหน้าตาได้ไม่จำกัด'},
{q:['.chips.onscene'],t:'ค่าสถานะ',d:'HP พลังชีวิต, ATK โจมตี, DEF ป้องกัน, LUK โชค และ MP มานา ฮีโร่สู้และใช้สกิลเอง ช่องไหนสงสัยก็แตะดูคำอธิบายได้'},
{q:['#c-fate'],t:'ดวงชะตา ☽',d:'ทุกชั้นเกมจะทอยว่าฮีโร่รอดไหม ยิ่งสูงยิ่งเสี่ยง พอเข้าหอแล้ว ช่องนี้บอกความเสี่ยงของชั้นนั้น ตั้งแต่มั่นคงไปจนถึงใกล้ฆาต (ตอนนี้ยังเป็นดวงที่ติดตัวมาแต่เกิด)',dr:'ทุกชั้นเกมจะทอยว่าฮีโร่รอดไหม ยิ่งสูงยิ่งเสี่ยง ช่องนี้บอกความเสี่ยงของชั้นที่อยู่ ตั้งแต่มั่นคงไปจนถึงใกล้ฆาต'},
{q:['#c-luk'],t:'โชค',d:'โชคช่วยให้ตีคริติคอลและหลบได้บ่อยขึ้น หนีรอดง่ายขึ้น เจอผลร้ายในเหตุการณ์น้อยลง และลดความเสี่ยงตายรายชั้น HP ต่ำ แผลเป็น กับกรรมชั่วทำให้เสี่ยงขึ้น'},
{q:['#ctl'],t:'จุดเปลี่ยนชะตา',d:'ฮีโร่เดินขึ้นหอเอง เจอเรื่องสำคัญอย่างหีบสมบัติ ทหารรับจ้าง หรือบอส เกมจะหยุดให้คุณเลือก คิดนานแค่ไหนก็ได้ ถ้าอยากให้นับถอยหลัง 30 วินาทีก็กดปุ่ม ⏱ · ท่าที (บุก ระวังตัว หาของ ช่วยเหลือ) เปลี่ยนได้ตลอดทาง ผลไม่มากแต่สะสมทุกชั้น'},
{q:['#app .tbtns'],t:'ปุ่มด้านบน',d:'☰ เปิดปาร์ตี้ บันทึก ตระกูล และสุสาน · ❓ คือวิธีเล่นทั้งหมด และเปิดทัวร์นี้ซ้ำได้ · 🏆 คืออันดับกับความสำเร็จ'},
{q:['#btnEnter'],birth:1,t:'เข้าหอ',d:'พร้อมเมื่อไหร่ก็กดเข้าหอ เป้าหมายคือชั้น 100 ล้มกลางทางก็ให้ลูกศิษย์สืบทอดต่อได้',last:'เริ่มเลย'}];

const css=document.createElement('style');css.textContent=`
#tofTour{position:fixed;inset:0;z-index:70;pointer-events:none}
#tofTour .tt-blk{position:absolute;inset:0;pointer-events:auto;background:transparent}
#tofTour.nohole .tt-blk{background:rgba(4,8,10,.74)}
#tofTour .tt-hole{position:fixed;border-radius:6px;box-shadow:0 0 0 200vmax rgba(4,8,10,.74);outline:2px solid var(--gold,#f4bb4a);outline-offset:0;pointer-events:none}
#tofTour.nohole .tt-hole{display:none}
#tofTour .tt-bub{position:fixed;pointer-events:auto;box-sizing:border-box;width:min(340px,calc(100vw - 24px));max-height:calc(100dvh - 16px);overflow:auto;overscroll-behavior:contain;
 background:var(--panel,#15232a);color:var(--ink,#f1e7d0);border:2px solid var(--gold2,#b97a22);border-radius:6px;box-shadow:0 4px 0 #0009,0 0 0 2px #070c0e;padding:10px 12px;font:300 14px/1.5 var(--fT,system-ui)}
#tofTour .tt-bub.in{animation:ttIn .18s ease-out}@keyframes ttIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
#tofTour .tt-bub:focus{outline:none}
#tofTour .tt-h{display:flex;align-items:baseline;gap:8px;margin:0 0 4px}
#tofTour .tt-h b{flex:1;color:var(--gold,#f4bb4a);font-weight:500;font-size:16px}
#tofTour .tt-n{font-family:var(--fP,monospace);font-size:12px;color:var(--dim,#6f857e)}
#tofTour .tt-d{margin:0 0 10px}
#tofTour .tt-f{display:flex;align-items:center;gap:6px}
#tofTour .tt-dots{display:flex;gap:4px;flex:1;min-width:0}
#tofTour .tt-dots i{width:7px;height:7px;border-radius:50%;background:var(--line2,#3d5a66)}
#tofTour .tt-dots i.on{background:var(--gold,#f4bb4a)}
#tofTour .tt-dots i.ok{background:var(--gold2,#b97a22)}
#tofTour button{font:400 14px var(--fT,system-ui);border-radius:3px;padding:6px 12px;min-height:36px;cursor:pointer}
#tofTour .tt-skip{background:none;border:1px solid var(--line2,#3d5a66);color:var(--muted,#a3b5ad)}
#tofTour .tt-back{background:var(--panel2,#1c2e36);border:1px solid var(--line2,#3d5a66);color:var(--ink,#f1e7d0);padding:6px 10px}
#tofTour .tt-next{background:var(--gold,#f4bb4a);border:2px solid #7a5214;color:#1a1206;font-weight:500}
#tofTour button:focus-visible{outline:3px solid var(--focus,#ffd76a);outline-offset:2px}
#tofTour .tt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
html.tt-on .tofintro .ti-body{display:none}
.tt-replay{display:flex;align-items:center;gap:6px;width:100%;margin:0 0 10px;background:#2a2412;border:1px solid var(--gold2,#b97a22);border-radius:4px;padding:7px 10px;color:var(--gold,#f4bb4a);font:500 14px var(--fT,system-ui);text-align:left;cursor:pointer}
.tt-replay small{flex:1;color:var(--muted,#a3b5ad);font-weight:300;font-size:12px;text-align:right}
.tt-acts{margin-top:8px}
@media (prefers-reduced-motion:reduce){#tofTour .tt-bub.in{animation:none}}`;
document.head.appendChild(css);

let root=null,hole=null,bub=null,live=null,i=0,steps=[],tgt=null,prevFocus=null,iv=0,auto=false,held=false;
const hold=on=>{if(on===held)return;held=on;try{document.dispatchEvent(new CustomEvent('tof:pause',{detail:{on}}));}catch(e){}};

function shown(el){if(!el||!el.isConnected||el.closest('[hidden]'))return false;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return false;
 try{if(el.checkVisibility&&!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))return false;}catch(e){}return true;}
const atBirth=()=>{const S=window.__auto&&window.__auto.S;return !!S&&S.phase==='birth'&&!S.R;};
function find(s){for(const q of s.q){const el=document.querySelector(q);if(shown(el))return el;}return null;}

function build(){root=document.createElement('div');root.id='tofTour';
 root.innerHTML=`<div class="tt-blk"></div><div class="tt-hole"></div>
 <div class="tt-bub" role="dialog" aria-modal="true" aria-labelledby="ttT" aria-describedby="ttD" tabindex="-1">
  <div class="tt-h"><b id="ttT"></b><span class="tt-n" aria-hidden="true"></span></div><p class="tt-d" id="ttD"></p>
  <div class="tt-f"><span class="tt-dots" aria-hidden="true"></span><button type="button" class="tt-skip">ข้าม</button><button type="button" class="tt-back" aria-label="ย้อนกลับ">←</button><button type="button" class="tt-next">ต่อไป</button></div>
  <div class="tt-sr" aria-live="polite" aria-atomic="true"></div></div>`;
 hole=root.querySelector('.tt-hole');bub=root.querySelector('.tt-bub');live=root.querySelector('.tt-sr');
 root.querySelector('.tt-skip').onclick=()=>stop(false);
 root.querySelector('.tt-back').onclick=()=>go(i-1);
 root.querySelector('.tt-next').onclick=next;
 document.body.appendChild(root);}

function next(){if(i>=steps.length-1)stop(true);else go(i+1);}

function go(n){if(n<0||n>=steps.length)return;i=n;const s=steps[i];
 try{window.TIPS&&window.TIPS.hide&&window.TIPS.hide();}catch(e){}
 tgt=find(s);if(tgt){try{tgt.scrollIntoView({block:'center',inline:'nearest'});}catch(e){}}
 root.querySelector('#ttT').textContent=s.t;root.querySelector('#ttD').textContent=(!atBirth()&&s.dr)||s.d;
 root.querySelector('.tt-n').textContent=`${i+1}/${steps.length}`;
 root.querySelector('.tt-dots').innerHTML=steps.map((x,k)=>`<i class="${k===i?'on':k<i?'ok':''}"></i>`).join('');
 const nb=root.querySelector('.tt-next');nb.textContent=i===steps.length-1?(s.last||'จบ'):'ต่อไป';
 root.querySelector('.tt-back').hidden=i===0;
 live.textContent=`ขั้นที่ ${i+1} จาก ${steps.length}: ${s.t}`;
 bub.classList.remove('in');void bub.offsetWidth;bub.classList.add('in');
 place();try{nb.focus({preventScroll:true});}catch(e){}}

// spotlight + bubble: above or below the target, else beside it, else in the bigger gap with its own scroll; never off screen
let last='';
function place(){if(!root)return;const W=innerWidth,H=innerHeight,M=8,G=10;
 if(tgt&&!shown(tgt))tgt=find(steps[i]);
 root.classList.toggle('nohole',!tgt);
 bub.style.maxHeight='';const bw=bub.offsetWidth;let bh=bub.offsetHeight,x,y,r=null;
 if(tgt){const b=tgt.getBoundingClientRect(),p=4;
  r={l:Math.max(2,b.left-p),t:Math.max(2,b.top-p),r:Math.min(W-2,b.right+p),b:Math.min(H-2,b.bottom+p)};
  const below=H-r.b-G-M,above=r.t-G-M,cx=(r.l+r.r)/2;
  x=Math.min(Math.max(M,cx-bw/2),W-bw-M);
  if(bh<=below)y=r.b+G;else if(bh<=above)y=r.t-G-bh;
  else{const rs=W-r.r-G-M,lsp=r.l-G-M;
   if(rs>=bw||lsp>=bw){x=rs>=bw?r.r+G:r.l-G-bw;y=Math.min(Math.max(M,(r.t+r.b)/2-bh/2),H-bh-M);}
   else{const up=above>below,sp=Math.max(80,up?above:below);bub.style.maxHeight=sp+'px';bh=Math.min(bh,sp);y=up?r.t-G-bh:r.b+G;}}}
 else{x=(W-bw)/2;y=Math.max(M,(H-bh)/2);}
 const k=[x,y,r&&r.l,r&&r.t,r&&r.r,r&&r.b].map(v=>v==null?'':Math.round(v)).join();if(k===last)return;last=k;
 bub.style.left=Math.round(x)+'px';bub.style.top=Math.round(y)+'px';
 if(r){hole.style.left=r.l+'px';hole.style.top=r.t+'px';hole.style.width=(r.r-r.l)+'px';hole.style.height=(r.b-r.t)+'px';}}

function onKey(e){if(!root)return;const k=e.key,inB=bub.contains(document.activeElement);
 if(k==='Escape'){e.preventDefault();e.stopPropagation();stop(false);return;}
 if(k==='Tab'){const f=[...bub.querySelectorAll('button')].filter(b=>!b.hidden);if(!f.length)return;const a=f.indexOf(document.activeElement);
  e.preventDefault();e.stopPropagation();f[(a<0?0:(a+(e.shiftKey?-1:1)+f.length)%f.length)].focus();return;}
 if(k==='ArrowRight'||(k==='Enter'&&!(inB&&document.activeElement.tagName==='BUTTON'))){e.preventDefault();e.stopPropagation();next();return;}
 if(k==='ArrowLeft'){e.preventDefault();e.stopPropagation();go(i-1);return;}
 e.stopPropagation(); // Enter/Space on a bubble button still click it; game hotkeys (1–4, Space, Enter) stay out
}
const onMove=()=>{last='';place();};

function start(){if(root)return;
 // close whatever window is open so the spotlight is not under a modal
 try{window.TIPS&&window.TIPS.close&&window.TIPS.close();}catch(e){}
 try{const d=document.getElementById('moreDlg');if(d&&d.open)window.MORE&&window.MORE.close();}catch(e){}
 prevFocus=document.activeElement;steps=atBirth()?STEPS:STEPS.filter(x=>!x.birth);i=0;last='';build();
 document.documentElement.classList.add('tt-on');hold(true);
 window.addEventListener('keydown',onKey,true);window.addEventListener('resize',onMove);
 try{window.visualViewport&&window.visualViewport.addEventListener('resize',onMove);}catch(e){}
 iv=setInterval(place,350); // birth reveal animations and late layout shifts
 go(0);}

function stop(done){if(!root)return;clearInterval(iv);window.removeEventListener('keydown',onKey,true);window.removeEventListener('resize',onMove);
 try{window.visualViewport&&window.visualViewport.removeEventListener('resize',onMove);}catch(e){}
 root.remove();root=null;tgt=null;document.documentElement.classList.remove('tt-on');hold(false);ls.set(KEY,done?'done':'skip');
 if(done){try{if(window.META&&window.META.grantAch)window.META.grantAch('tour_done');else if(window.ACH)window.ACH.grant('tour_done');}catch(e){}
  // the first-visit tour already covered the "📖 เล่นยังไง" strip: fold it unless the player set it themselves
  if(auto&&ls.get('tof-intro-v1')==null){const h=document.querySelector('.tofintro:not(.shut) .ti-hd');if(h)h.click();}}
 auto=false;if(prevFocus&&prevFocus.isConnected&&prevFocus!==document.body)try{prevFocus.focus({preventScroll:true});}catch(e){}prevFocus=null;}

try{window.ACH&&window.ACH.add&&window.ACH.add([{id:'tour_done',n:'รู้ทางก่อนขึ้นหอ',d:'ดูทัวร์แนะนำจนจบ',icon:'🧭',tier:'bronze'}]);}catch(e){}

// ---- replay buttons: top of the help window's first tab, and the ☰ sheet's "อื่นๆ" tab ----
function mkBtn(cls,html,pre){const b=document.createElement('button');b.type='button';b.className=cls;b.innerHTML=html;b.onclick=()=>{pre();setTimeout(start,30);};return b;}
function addReplay(){
 const hp=document.getElementById('hpan-basic');
 if(hp&&!hp.querySelector('.tt-replay'))hp.insertBefore(mkBtn('tt-replay','<span aria-hidden="true">🧭</span> ทัวร์แนะนำ<small>พาดูทีละจุดบนจอ</small>',()=>{try{window.TIPS.close();}catch(e){}}),hp.firstChild);
 const ma=document.getElementById('moreActs');
 if(ma&&!document.getElementById('ttMore')){const w=document.createElement('div');w.className='acts tt-acts';w.id='ttMore';
  w.appendChild(mkBtn('btn','🧭 ทัวร์แนะนำ',()=>{try{window.MORE.close();}catch(e){}}));ma.parentNode.insertBefore(w,ma.nextSibling);}}

// ---- first visit: brand-new players only, once the screen is free (no town gate, no open window) ----
function returning(){const g=k=>ls.get(k);try{if(window.META&&window.META.load&&window.META.load().runs>0)return true;}catch(e){}
 const m=g('tof-auto-memorial-v1');if(m&&m!=='[]')return true;if(g('tof-lineage-v1'))return true;
 try{const s=JSON.parse(g('tof-auto-save-v1')||'null');if(s&&s.phase!=='birth')return true;}catch(e){}return false;}
function free(){const S=window.__auto&&window.__auto.S;if(!S||S.phase!=='birth'||S.R)return false;
 if(document.getElementById('townGate')||document.querySelector('dialog[open]'))return false;
 if(document.hidden)return false;const b=document.getElementById('btnEnter');return shown(b);}
function boot(){addReplay();
 if(ls.get(KEY))return;if(returning()){ls.set(KEY,'old');return;}
 let n=0;const t=setInterval(()=>{n++;if(root||ls.get(KEY)||n>200){clearInterval(t);return;}
  if(n>=4&&free()){clearInterval(t);auto=true;start();}},700);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.TOUR={start,stop:()=>stop(false),get open(){return !!root;}};
})();
