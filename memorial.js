// memorial.js — online memorial /m/<id> of one finished life (v2.7, after 1in8b.life, docs/rea/1in8b-rea-v2.md §3.5; free, no login)
// - create(d,{onDone}): "ตั้งอนุสรณ์ออนไลน์" on the end screen -> notice that it is public -> the browser draws the 600x315 JPEG link preview
//   -> POST /api/memorial -> link, copy, share. The owner key (24 hex) stays in localStorage 'tof-memo-own-v1'; the server keeps its SHA-256.
// - viewer: /m/<id> (or ?m=<id>) opens an overlay over the game: cover, name, floor, title, HP/map strip of 100 floors,
//   candles (POST /api/candle), tabs album (floor bands 1–25/26–50/51–75/76–100) · guestbook (5 fixed words) · last moments (replays the ending),
//   "ลองเกิดดูบ้าง", random memorial, copy/share link, report, and removal for the owner
// - d (built by memoData() in auto.js, cleaned again by functions/api/memorial.js): run summary + up to 9 scene descriptors, no pictures.
//   Every picture here is drawn again from those descriptors with sprites.js.
// API: window.MEMO = { create(d,opt), open(id), close(), owned() }
(function(){
'use strict';
if(typeof document==='undefined')return;
const A=window.ART,CT=window.CONTENT||{};if(!A)return;
const ORIGIN='https://tower-of-fate.pages.dev',OWN_K='tof-memo-own-v1';
const RANK_K=['F','E','D','C','B','A','S','SS'];
const BIOMES=CT.BIOMES||['ทุ่งหญ้า','ถ้ำคริสตัล','ป่าต้องสาป','ภูเขาไฟ','ห้วงดารา'];
const MAPC={fight:'#c0503a',treasure:'#e8b840',trap:'#8a4ab0',good:'#5fc06a',evil:'#6a1a2a',pet:'#ea9bbd',comp:'#4fa6e0',boss:'#ff8a2a',warp:'#7ae8f0',flee:'#8a9aa0',calm:'#7a8a80',bad:'#8a6a4a',farm:'#2a6a5a',death:'#f1e7d0'};
const WORDS=['หลับให้สบายนะ','เดินมาไกลมากแล้ว','ไต่ได้สวยมาก','จะไม่ลืมเลย','ขอบคุณที่สู้มา'];
const BANDS=[[1,25],[26,50],[51,75],[76,100]];
const PEMO={'บ':'⚔️','ร':'🛡️','ห':'💰','ช':'🤝','ด':'🚶','พ':'👥','☀':'☀️','☾':'🌙'};
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fT="'Mitr','Kanit','Noto Sans Thai',system-ui,sans-serif";
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=n=>Number(n||0).toLocaleString('th-TH');
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));
const biome=f=>clampN(Math.floor(((f||1)-1)/20),0,4);
const okId=s=>typeof s==='string'&&/^[a-z2-9]{9}$/.test(s);
const linkOf=id=>ORIGIN+'/m/'+id;
const patEmo=c=>Array.from(c||'').map(x=>PEMO[x]||x).join('');
function el(tag,attrs,txt){const e=document.createElement(tag);if(attrs)for(const k in attrs)e.setAttribute(k,attrs[k]);if(txt!=null)e.textContent=txt;return e;}
function cvs(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=false;return{c,x};}
// scene canvases are 384x256 drawn in 192x128 coordinates (v2.7.2), so the 2x backgrounds from sprites.js show at full detail
function hx(c){const x=c.getContext('2d');x.setTransform(2,0,0,2,0,0);x.imageSmoothingEnabled=false;return x;}
function cvs2(){const c=document.createElement('canvas');c.width=384;c.height=256;return{c,x:hx(c)};}

// ---------- storage of owner keys ----------
function ownLoad(){try{const v=JSON.parse(localStorage.getItem(OWN_K)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch(e){return{};}}
function ownSave(o){try{localStorage.setItem(OWN_K,JSON.stringify(o));}catch(e){}}
function rndHex(n){const b=new Uint8Array(n/2);crypto.getRandomValues(b);return[...b].map(x=>x.toString(16).padStart(2,'0')).join('');}

// ---------- network ----------
async function api(url,body,ms){const ctl=typeof AbortController!=='undefined'?new AbortController():null;const tm=setTimeout(()=>{try{ctl&&ctl.abort();}catch(e){}},ms||15000);
 try{const o=body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{};if(ctl)o.signal=ctl.signal;
  const r=await fetch(url,o);let j=null;try{j=await r.json();}catch(e){}return{st:r.status,j:j&&typeof j==='object'?j:{}};}
 catch(e){return{st:0,j:{}};}finally{clearTimeout(tm);}}
function errTxt(r){if(r.st===0)return'ต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้งนะ';if(r.st===429)return'วันนี้กดแบบนี้บ่อยไปหน่อย พักสักครู่แล้วค่อยลองใหม่';
 if(r.j.error==='not-found')return'ไม่พบอนุสรณ์นี้ อาจถูกถอดออกไปแล้ว หรือไม่มีใครเปิดดูเลย 90 วันจนถูกลบไป';if(r.j.error==='too-large')return'ข้อมูลของชีวิตนี้ยาวเกินไป ตั้งอนุสรณ์ไม่ได้';
 return'ตอนนี้ระบบอนุสรณ์ยังไม่เปิด ลองใหม่ทีหลังนะ';}

// ---------- scenes (same layout as the end cinematic in auto.js, drawn from the stored descriptors) ----------
const heroS=d=>A.heroSpr(d.ck,d.lk);
function compS(c){const cc={n:c.n,cls:c.cls||'war',tr:c.tr||'',legend:!!c.legend};return{s:A.compSpr(cc),k:'c'+A.compKey(cc)};}
function enS(e){if(!e)return null;if(e.cls)return{spr:A.heroSpr(e.cls),x:128,y:84,flip:true,key:'c'+e.cls};
 const big=e.boss,spr=big?A.BSPR[e.id]:A.MSPR[e.id];if(!spr)return null;if(/^hoard_/.test(e.id))return{spr,x:130,y:62,flip:false,key:e.id};
 return{spr,x:big?118:128,y:big?70:84,flip:!big&&['wolf','sala'].indexOf(e.id)<0?false:true,key:e.id};}
function drawVis(x,v,t,bob){if(!v)return;
 if(v.t==='en'){const E=enS(v.en);if(E)A.blit(x,E.spr,E.x,v.en.cls?84+bob:v.en.boss?70+bob:84,{flip:E.flip,key:E.key});}
 else if(v.t==='prop'){const N=A.NPCS||{};A.drawProp(x,v.fb&&!N[v.pr]?v.fb:v.pr,t);}
 else if(v.t==='pet'){if(A.PSPR[v.p])A.blit(x,A.PSPR[v.p],132,91+bob,{key:'p'+v.p});}
 else if(v.t==='comp'){const s=v.c&&v.c.cls?compS(v.c):{s:A.heroSpr(v.cls||'war'),k:'c'+(v.cls||'war')};A.blit(x,s.s,128,84+bob,{flip:true,key:s.k});}}
function mourners(d){const M=(d.cm||[]).map(c=>Object.assign(compS(c),{n:c.n}));(d.pets||[]).forEach(p=>{if(A.PSPR[p])M.push({s:A.PSPR[p],k:'p'+p,pet:1});});return M.slice(0,8);}
const FUN_X=[68,108,52,124,36,140,20,156];
function drawFun(x,d,t){const won=!!d.w,bob=t?Math.round(Math.sin(t/260)):0;if(A.funeralDraw)A.funeralDraw(x,won);else x.drawImage(A.funeralBg(won),0,0);
 if(won){const hs=heroS(d);x.fillStyle='rgba(244,187,74,0.16)';x.fillRect(84,40,24,60);A.blit(x,hs,88,82+bob,{key:'h'+hs.id});}
 else{A.blit(x,A.STONE,90,86,{key:'stone',noShadow:true});x.fillStyle='#1a1418';x.fillRect(93,90,6,1);A.blit(x,A.WREATH,92,93,{key:'wreath',noShadow:true});
  [[80,94],[110,94],[84,97],[106,97]].forEach(([X,Y],i)=>A.drawCandle(x,X,Y,t,i));}
 mourners(d).forEach((m,i)=>{const yy=m.pet?91:100-m.s.h,sb=t&&!m.pet?Math.round(Math.sin(t/700+i)*.6):0;A.blit(x,m.s,FUN_X[i],yy+sb,{flip:i%2!==0,key:m.k});});
 if(d.rain){x.fillStyle='rgba(170,190,230,0.45)';for(let i=0;i<70;i++){const X=Math.floor((A.hash(i)*192+(t||0)*.04)%192),Y=Math.floor((A.hash(i+77)*128+(t||0)*.22)%128);x.fillRect(X,Y,1,3);}
  x.fillStyle='rgba(20,24,40,0.18)';x.fillRect(0,0,192,128);}}
function drawFrame(x,fr,d,t){if(!fr)return;if(fr.k==='u'){drawFun(x,d,t);return;}
 const b=fr.k==='b'?0:biome(fr.f),hs=heroS(d),hk='h'+hs.id,bob=t?Math.round(Math.sin(t/260)):0;
 if(A.bgDraw)A.bgDraw(x,b);else x.drawImage(A.bgImg(b),0,0);A.drawOverlay(x,b,t||0);
 if(fr.k==='b'){x.fillStyle='rgba(244,187,74,0.14)';x.fillRect(84,0,24,100);x.fillStyle='#5a4a3a';x.fillRect(80,100,32,4);A.blit(x,hs,88,84+bob,{key:hk});return;}
 if(fr.k==='d'){A.blit(x,A.PROPS.grave,88,84);x.globalAlpha=.55;A.blit(x,A.heroSpr('ghost',d.lk),88,60+(t?Math.round(Math.sin(t/500)*3):0),{key:'ghost'});x.globalAlpha=1;drawVis(x,fr.v,t,bob);return;}
 if(fr.k==='w'){(d.cm||[]).forEach((c,i)=>{const v=compS(c);A.blit(x,v.s,62-i*16,84+bob,{key:v.k});});(d.pets||[]).forEach((p,i)=>{if(A.PSPR[p])A.blit(x,A.PSPR[p],112+i*14,91,{key:'p'+p});});
  x.fillStyle='rgba(244,187,74,0.16)';x.fillRect(84,0,24,100);A.blit(x,hs,88,84+bob,{key:hk});
  for(let i=0;i<8;i++){const a=(t||0)/700+i*.785;x.fillStyle=i%2?'#fff6c0':'#ffd04a';x.fillRect(96+Math.round(Math.cos(a)*22),80+Math.round(Math.sin(a)*14),1,1);}return;}
 A.blit(x,hs,52,84+bob,{key:hk});drawVis(x,fr.v,t,bob);}
const lastFr=d=>(d.fr||[]).find(f=>f.k==='d'||f.k==='w')||(d.fr||[])[0];
function safeDraw(x,fr,d,t){try{drawFrame(x,fr,d,t);}catch(e){x.fillStyle='#15232a';x.fillRect(0,0,192,128);}}

// ---------- link preview (laid out at 1200x630, scaled to 600x315 JPEG ~25–40 KB before upload; the server drops images over 160 KB) ----------
let fontsP=null;
function waitFonts(){if(fontsP)return fontsP;const fs=document.fonts;if(!fs||!fs.load)return fontsP=Promise.resolve();
 const L=Promise.all(['500 20px Mitr','600 20px Mitr'].map(f=>fs.load(f,'หอคอยโชคชะตา 0123').catch(()=>null)));
 return fontsP=Promise.race([L,new Promise(r=>setTimeout(r,2500))]).then(()=>{});}
function fit(x,s,max){if(x.measureText(s).width<=max)return s;const g=Array.from(s);while(g.length>1&&x.measureText(g.join('')+'…').width>max)g.pop();return g.join('')+'…';}
async function ogImage(d){await waitFonts();const W=1200,H=630,{c,x}=cvs(W,H),s=cvs2();
 safeDraw(s.x,lastFr(d),d,0);x.imageSmoothingEnabled=false;x.drawImage(s.c,0,84,384,120,0,0,W,375);
 const g=x.createLinearGradient(0,300,0,375);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.35)');x.fillStyle=g;x.fillRect(0,300,W,75);
 x.fillStyle='#b9682f';x.fillRect(0,375,W,6);x.fillStyle='#f3e9d2';x.fillRect(0,381,W,H-381);
 x.fillStyle='#e6d6b4';for(let i=0;i<W;i+=24)x.fillRect(i,381,12,3);
 const fl=d.f>100?100:d.f;x.textBaseline='alphabetic';
 x.fillStyle='#2f6b5c';x.font=`500 26px ${fT}`;x.fillText('หอคอยโชคชะตา · อนุสรณ์',64,432);
 x.fillStyle='#2b2118';x.font=`600 66px ${fT}`;x.fillText(fit(x,d.n,760),64,508);
 x.fillStyle='#5c4b39';x.font=`500 30px ${fT}`;x.fillText(fit(x,`${d.w?'พิชิตยอดหอ ชั้น 100':'ล้มลงที่ชั้น '+fl} · ${String(d.cn||'').split(' · ')[0]}แรงค์ ${RANK_K[d.rk]||'?'}`,800),64,558);
 if(d.ti){x.fillStyle='#8b7a62';x.font=`400 26px ${fT}`;x.fillText(fit(x,`ฉายา「${d.ti}」`,760),64,600);}
 const st=cvs(64,36);A.blit(st.x,A.STONE,26,14,{key:'stone',noShadow:true});A.blit(st.x,A.WREATH,28,21,{key:'wreath',noShadow:true});[[14,26],[46,26],[18,29],[42,29]].forEach(([X,Y],i)=>A.drawCandle(st.x,X,Y,0,i));
 x.drawImage(st.c,0,0,64,36,880,396,256,144);
 x.fillStyle='#8b7a62';x.font=`400 22px ${fT}`;x.textAlign='right';x.fillText('tower-of-fate.pages.dev',1136,600);x.textAlign='left';
 const o=cvs(600,315);o.x.imageSmoothingEnabled=true;try{o.x.imageSmoothingQuality='high';}catch(e){}o.x.drawImage(c,0,0,600,315);
 let u=o.c.toDataURL('image/jpeg',.82);if(u.length>110000)u=o.c.toDataURL('image/jpeg',.65);
 return /^data:image\/jpeg;/.test(u)&&u.length<=150000?u:null;}

// ---------- CSS ----------
let cssDone=false;
function css(){if(cssDone)return;cssDone=true;const st=el('style');st.textContent=`
.mmv{position:fixed;inset:0;z-index:55;overflow-y:auto;background:#17110d;color:#2b2118;font-family:${fT};font-weight:400;-webkit-overflow-scrolling:touch}
.mmv *{box-sizing:border-box}
.mmv-top{position:sticky;top:0;z-index:2;display:flex;gap:8px;align-items:center;padding:8px 12px;padding-top:calc(8px + env(safe-area-inset-top,0px));background:#17110de6;border-bottom:1px solid #3a2c20}
.mmv-brand{flex:1;min-width:0;color:#e6d6b4;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mmv-top button{font:500 13.5px ${fT};border-radius:999px;padding:6px 14px;min-height:36px;cursor:pointer;border:1px solid #6a5038;background:transparent;color:#e6d6b4}
.mmv-top .try{background:#b9682f;border-color:#b9682f;color:#1a0d04}
.mmv-body{width:min(560px,100%);margin:0 auto;padding:14px 14px 40px}
.mmv-card{background:#f6eedb;border:1px solid #e0cfa8;border-radius:14px;box-shadow:0 6px 18px #0006;padding:14px;margin-bottom:12px}
.mmv-hd{display:flex;gap:12px;align-items:flex-start}
.mmv-cover{flex:none;width:112px;height:112px;border-radius:12px;border:2px solid #d9c49a;object-fit:cover;image-rendering:pixelated;background:#15232a}
.mmv-nm{font-size:clamp(24px,7vw,30px);font-weight:600;line-height:1.2;color:#2b2118;word-break:break-word}
.mmv-sub{font-size:13px;color:#7a6553;margin-top:2px}
.mmv-fl{font-family:'DotGothic16',monospace;font-size:15px;color:#9a6418;margin-top:4px}
.mmv-ti{font-size:14px;margin-top:8px;color:#2b2118}.mmv-ti b{color:#9a6418;font-weight:500}
.mmv-ca{font-size:14px;color:#5c4b39;margin-top:2px}
.mmv-eu{font-size:13.5px;color:#5c4b39;margin-top:8px;padding:6px 10px;border-left:3px solid #d9c49a;background:#efe3c6;border-radius:0 8px 8px 0}
.mmv-strip{display:flex;align-items:flex-end;gap:1px;height:46px;margin-top:12px;padding:4px;background:#2a2118;border-radius:8px}
.mmv-strip i{flex:1;min-height:2px;border-radius:1px 1px 0 0;background:#4a3e30}
.mmv-strip i.no{background:#3a3026;opacity:.45}.mmv-strip i.dead{background:#e85a4a!important;box-shadow:0 0 5px #e85a4a}
.mmv-sl{display:flex;justify-content:space-between;font-size:11.5px;color:#8b7a62;margin-top:3px}
.mmv-cdl{margin-top:12px;border-radius:12px;padding:12px;background:linear-gradient(180deg,#3a2618,#22160e);color:#f1e7d0;display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.mmv-cdl canvas{width:192px;max-width:100%;height:auto;image-rendering:pixelated;flex:none}
.mmv-cdt{flex:1;min-width:140px;font-size:14px;line-height:1.5}.mmv-cdt b{color:#f4bb4a;font-weight:500}
.mmv-btn{font:500 15px ${fT};border-radius:10px;padding:9px 16px;min-height:44px;cursor:pointer;border:2px solid #000;background:#8a2a3a;color:#fff3e8;box-shadow:inset 0 -3px 0 #5a1622}
.mmv-btn:disabled{opacity:.6;cursor:default}
.mmv-tabs{display:flex;gap:4px;margin:4px 0 0;padding:0 6px}
.mmv-tabs button{flex:1;font:500 14px ${fT};padding:9px 6px;min-height:42px;border:1px solid #e0cfa8;border-bottom:none;border-radius:10px 10px 0 0;background:#e8d9b8;color:#7a6553;cursor:pointer}
.mmv-tabs button[aria-selected=true]{background:#f6eedb;color:#2b2118;border-color:#b9682f;box-shadow:inset 0 3px 0 #b9682f}
.mmv-pane{border-radius:0 0 14px 14px;margin-top:0}
.mmv-band h3{font-size:14.5px;font-weight:500;margin:4px 0 8px;color:#5c4b39}.mmv-band+.mmv-band{margin-top:14px}
.mmv-band .none{font-size:13px;color:#8b7a62;margin:0}
.mmv-pol{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.mmv-pol figure{margin:0;background:#fffaf0;border:1px solid #e0cfa8;border-radius:6px;padding:6px 6px 8px;box-shadow:0 2px 6px #0002}
.mmv-pol canvas{width:100%;height:auto;display:block;image-rendering:pixelated;border-radius:3px;background:#15232a}
.mmv-pol figure.l{border-color:#d4a43a;box-shadow:0 0 0 1px #d4a43a}
.mmv-pol figcaption{font-size:12.5px;line-height:1.4;margin-top:5px;color:#2b2118}.mmv-pol figcaption span{display:block;color:#8b7a62;font-size:11.5px}
.mmv-pol .f{font-family:'DotGothic16',monospace;color:#9a6418;font-size:12px}
.mmv-words{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px}
.mmv-words button{font:400 14px ${fT};padding:8px 14px;min-height:40px;border-radius:999px;border:1px solid #d9c49a;background:#fffaf0;color:#2b2118;cursor:pointer}
.mmv-words button[aria-pressed=true]{background:#b9682f;color:#fff8ee;border-color:#b9682f}
.mmv-left{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.mmv-left li{display:flex;justify-content:space-between;gap:8px;font-size:14px;padding:7px 10px;background:#efe3c6;border-radius:8px}.mmv-left li span{color:#8b7a62;font-size:12.5px}
.mmv-fun{width:100%;height:auto;image-rendering:pixelated;border-radius:8px;display:block;background:#15232a}
.mmv-ep{font-size:14px;line-height:1.6;margin:10px 0}.mmv-ep div+div{margin-top:3px}
.mmv-cta{text-align:center;background:#2a2118;color:#f1e7d0;border-color:#4a3a2a}
.mmv-cta p{margin:0 0 10px;font-size:16px;line-height:1.5}
.mmv-cta .mmv-btn{width:100%;font-size:18px;min-height:52px;background:#b9682f;color:#1a0d04;box-shadow:inset 0 -4px 0 #7a401a}
.mmv-cta small{display:block;margin-top:8px;color:#a3917a;font-size:12px}
.mmv-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.mmv-chips button{font:400 13.5px ${fT};padding:7px 13px;min-height:38px;border-radius:999px;border:1px solid #6a5038;background:transparent;color:#e6d6b4;cursor:pointer}
.mmv-chips .own{border-color:#a3322a;color:#f0a090}
.mmv-msg{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:3;max-width:calc(100vw - 32px);text-align:center;color:#9ad08a;font-size:13.5px;margin:0;padding:8px 14px;border-radius:999px;background:#17110df2;border:1px solid #6a5038;box-shadow:0 4px 14px #0008;pointer-events:none}
.mmv-msg:empty{display:none}
.mmv-act{display:flex;gap:8px;width:100%}.mmv-act .mmv-btn{flex:1}
.mmv-act .gb{background:#f6eedb;color:#2b2118;box-shadow:inset 0 -3px 0 #d9c49a}
.mmv-tabs{scroll-margin-top:calc(60px + env(safe-area-inset-top,0px))}
@media (max-width:560px),(max-height:760px){.mmv-body{padding-top:10px}.mmv-card{padding:12px}.mmv-cover{width:84px;height:84px}.mmv-nm{font-size:clamp(21px,6.4vw,26px)}
 .mmv-ti{margin-top:6px}.mmv-eu{margin-top:6px;padding:4px 8px}.mmv-strip{height:32px;margin-top:8px}.mmv-sl{font-size:10.5px}
 .mmv-cdl{margin-top:8px;padding:10px;gap:8px}.mmv-cdl canvas{width:128px}.mmv-cdt{font-size:13.5px}}
@media (max-height:560px) and (min-width:600px){.mmv-body{width:min(900px,100%)}
 .mmv-body>.mmv-card:first-child{display:grid;grid-template-columns:minmax(0,1fr) 260px;column-gap:12px;align-items:start}
 .mmv-body>.mmv-card:first-child>*{grid-column:1}.mmv-body>.mmv-card:first-child>.mmv-cdl{grid-column:2;grid-row:1/span 6;margin-top:0;flex-direction:column;align-items:stretch;text-align:center}
 .mmv-cdl canvas{align-self:center}.mmv-act{flex-direction:column}}
.mmv-state{color:#e6d6b4;text-align:center;padding:60px 10px;font-size:15px;line-height:1.6}
.mmv :focus-visible{outline:3px solid #ffd76a;outline-offset:2px}
.mmc{box-sizing:border-box;border:none;padding:0;margin:auto;background:transparent;max-width:none;width:min(480px,calc(100vw - 24px));max-height:none;overflow:visible;color:#f1e7d0;font-family:${fT}}
.mmc::backdrop{background:#000b}
.mmc-box{box-sizing:border-box;background:#15232a;border:2px solid #3d5a66;border-radius:12px;display:flex;flex-direction:column;max-height:min(90vh,720px);max-height:min(90dvh,720px);overflow:hidden;box-shadow:0 0 0 2px #070c0e}
.mmc-hd{flex:none;display:flex;align-items:center;gap:8px;padding:12px 12px 10px 16px;border-bottom:1px solid #2c434d}
.mmc-hd h2{flex:1;min-width:0}
.mmc .mmc-x{flex:none;min-width:40px;min-height:36px;padding:4px 10px;font-size:15px}
.mmc-bd{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:12px 16px;display:flex;flex-direction:column;gap:10px}
.mmc-bd>*{flex-shrink:0}
.mmc-ft{flex:none;display:flex;flex-direction:column;gap:8px;padding:10px 16px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid #2c434d;background:#121e24}
.mmc-ft .mmc-msg:empty{display:none}
@media (max-width:560px){.mmc{width:100vw;height:100vh;height:100dvh;margin:0}.mmc-box{height:100%;max-height:none;border-radius:0;border-width:0}.mmc-hd{padding-top:calc(12px + env(safe-area-inset-top,0px))}}
@media (max-height:560px) and (min-width:561px){.mmc{height:100vh;height:100dvh;margin:0 auto}.mmc-box{height:100%;max-height:none;border-radius:0;border-top-width:0;border-bottom-width:0}}
.mmc h2{margin:0;font-size:19px;font-weight:600;color:#f4bb4a}
.mmc p{margin:0;font-size:14px;line-height:1.6;color:#d8cdb4}
.mmc .dim{color:#8fa39b;font-size:12.5px}
.mmc img{width:100%;height:auto;aspect-ratio:600/315;border-radius:6px;border:1px solid #3d5a66;background:#0f1a1f;display:block}
.mmc-row{display:flex;gap:8px;flex-wrap:wrap}.mmc-row button{flex:1;min-width:120px}
.mmc button{font:500 14.5px ${fT};border-radius:8px;padding:10px 12px;min-height:44px;cursor:pointer;border:2px solid #3d5a66;background:#1c2e36;color:#f1e7d0}
.mmc button.pri{background:#e86a3a;border-color:#000;color:#1a0b04;box-shadow:inset 0 -3px 0 #a8431c}
.mmc button:disabled{opacity:.6;cursor:default}
.mmc input{width:100%;font:400 14px ${fT};padding:9px 10px;border-radius:6px;border:2px solid #3d5a66;background:#0f1a1f;color:#f1e7d0}
.mmc-msg{min-height:18px;font-size:13px;color:#86d67f;text-align:center}
.mmc :focus-visible{outline:3px solid #ffd76a;outline-offset:2px}
`;document.head.appendChild(st);}

// ---------- create (owner, from the end screen) ----------
let cdlg=null,cbusy=false;
function cBuild(){if(cdlg)return cdlg;css();cdlg=el('dialog',{class:'mmc','aria-labelledby':'mmc-t'});const box=el('div',{class:'mmc-box'});cdlg.append(box);document.body.append(cdlg);
 cdlg.addEventListener('cancel',e=>{e.preventDefault();cClose();});cdlg._box=box;return cdlg;}
function cClose(){if(!cdlg)return;try{cdlg.close();}catch(e){cdlg.removeAttribute('open');}}
function cShow(){if(!cdlg.open){try{cdlg.showModal();}catch(e){cdlg.setAttribute('open','');}}}
// title + ✕ on top, buttons and status pinned at the bottom, everything else scrolls in between
function cLay(t,body,foot){const box=cdlg._box,hd=el('div',{class:'mmc-hd'}),x=el('button',{type:'button',class:'mmc-x','aria-label':'ปิด'},'✕');x.onclick=cClose;hd.append(t,x);
 const bd=el('div',{class:'mmc-bd'}),ft=el('div',{class:'mmc-ft'});bd.append(...body);ft.append(...foot);box.replaceChildren(hd,bd,ft);}
function create(d,opt){opt=opt||{};if(!d||cbusy)return;cBuild();const box=cdlg._box;box.replaceChildren();
 const t=el('h2',{id:'mmc-t'},'ตั้งอนุสรณ์ออนไลน์');
 const p1=el('p',null,`อนุสรณ์คือหน้าเว็บของ${d.n} ใครได้ลิงก์ไปก็เปิดดู จุดเทียน และฝากคำไว้ได้`);
 const p2=el('p',null,'ชื่อ ฉายา ฉากที่จำได้ และสาเหตุที่จากไปจะขึ้นให้ทุกคนเห็น ไม่ต้องสมัครสมาชิก ถ้าเปลี่ยนใจก็ถอดออกจากเครื่องนี้ได้ ถ้าไม่มีใครเปิดลิงก์เลย 90 วัน อนุสรณ์จะหายไปเอง');
 const img=el('img',{alt:`ภาพตัวอย่างลิงก์อนุสรณ์ของ ${d.n}`,width:'600',height:'315'});
 const msg=el('p',{class:'mmc-msg',role:'status','aria-live':'polite'});
 const go=el('button',{type:'button',class:'pri'},'ตั้งอนุสรณ์'),no=el('button',{type:'button'},'ยังก่อน');
 const row=el('div',{class:'mmc-row'});row.append(go,no);cLay(t,[img,p1,p2],[row,msg]);no.onclick=cClose;
 let og=null;const ogP=ogImage(d).then(u=>{og=u;if(u)img.src=u;}).catch(()=>{});
 cShow();try{go.focus({preventScroll:true});}catch(e){}
 go.onclick=async()=>{if(cbusy)return;cbusy=true;go.disabled=no.disabled=true;msg.style.color='#86d67f';msg.textContent='กำลังตั้งอนุสรณ์…';
  await ogP;const dk=rndHex(24);const r=await api('/api/memorial',{a:'create',d,img:og||undefined,dk},30000);cbusy=false;
  if(!r.j.ok||!okId(r.j.id)){go.disabled=no.disabled=false;msg.style.color='#ef6b5e';msg.textContent=errTxt(r);return;}
  const id=r.j.id,O=ownLoad();O[id]={k:dk,n:d.n,f:d.f,at:Date.now()};ownSave(O);try{opt.onDone&&opt.onDone(id);}catch(e){}try{window.ACH&&window.ACH.onEvent&&window.ACH.onEvent('memo',{id});}catch(e){}
  done(d,id,og);};}
function done(d,id,og){const box=cdlg._box;box.replaceChildren();const url=linkOf(id);
 const t=el('h2',{id:'mmc-t'},'อนุสรณ์เปิดแล้ว');const img=el('img',{alt:`ภาพตัวอย่างลิงก์อนุสรณ์ของ ${d.n}`,width:'600',height:'315'});if(og)img.src=og;else img.hidden=true;
 const p=el('p',null,`ส่งลิงก์นี้ให้เพื่อน แล้วเขาจะจุดเทียนให้${d.n}ได้`);const inp=el('input',{type:'text',readonly:'',value:url,'aria-label':'ลิงก์อนุสรณ์'});
 const msg=el('p',{class:'mmc-msg',role:'status','aria-live':'polite'});
 const bC=el('button',{type:'button',class:'pri'},'คัดลอกลิงก์'),bS=el('button',{type:'button'},'แชร์'),bL=el('button',{type:'button'},'ส่งใน LINE'),bO=el('button',{type:'button'},'เปิดดูอนุสรณ์'),bX=el('button',{type:'button'},'ปิด');
 const r1=el('div',{class:'mmc-row'}),r2=el('div',{class:'mmc-row'});r1.append(bC,navigator.share?bS:bL);r2.append(bO,bX);
 const note=el('p',{class:'dim'},'เครื่องนี้เก็บกุญแจสำหรับถอดอนุสรณ์ไว้ ถ้าล้างข้อมูลเบราว์เซอร์ กุญแจจะหายไปด้วย (ย้ายเซฟไปเครื่องใหม่ กุญแจจะไปด้วย)');
 cLay(t,[img,p,inp,note],[r1,r2,msg]);
 bC.onclick=async()=>{const ok=await copyTxt(url,box);msg.style.color=ok?'#86d67f':'#ef6b5e';msg.textContent=ok?'คัดลอกลิงก์แล้ว':'คัดลอกไม่ได้ กดค้างที่ลิงก์แล้วคัดลอกเองนะ';};
 bS.onclick=async()=>{try{await navigator.share({title:`อนุสรณ์ของ ${d.n}`,text:`รำลึกถึง${d.n} จากหอคอยโชคชะตา`,url});}catch(e){}};
 bL.onclick=()=>{const u='https://social-plugins.line.me/lineit/share?url='+encodeURIComponent(url);const w=window.open(u,'_blank','noopener');if(!w)location.href=u;};
 bO.onclick=()=>{cClose();open(id);};bX.onclick=cClose;try{bC.focus({preventScroll:true});}catch(e){}}
async function copyTxt(t,host){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(t);return true;}}catch(e){}
 try{const ta=el('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0;left:-9999px';(host||document.body).append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;}catch(e){return false;}}

// ---------- viewer ----------
const V={el:null,id:'',m:null,raf:0,lt:0,tab:'alb',fromUrl:false,lastFocus:null,lit:{},word:{},anim:[]};
function inertWrap(on){const w=document.querySelector('.wrap');if(w)w.inert=on;const eb=document.getElementById('endBar');if(eb)eb.inert=on;}
function vBuild(){css();if(V.el)V.el.remove();const o=el('div',{class:'mmv',role:'dialog','aria-modal':'true','aria-label':'อนุสรณ์'});
 o.innerHTML=`<div class="mmv-top"><span class="mmv-brand">หอคอยโชคชะตา · อนุสรณ์</span><button type="button" class="try">ลองเกิดบ้าง</button><button type="button" class="x">ปิด</button></div><div class="mmv-body"><div class="mmv-state" role="status">กำลังเปิดอนุสรณ์…</div></div>`;
 o.querySelector('.x').onclick=close;o.querySelector('.try').onclick=tryBirth;
 o.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'||e.key==='Esc'){e.preventDefault();close();}});
 document.body.append(o);V.el=o;inertWrap(true);return o;}
function tryBirth(){close();try{window.scrollTo({top:0,behavior:'auto'});}catch(e){}}
// while the memorial (or its replay) is open, keys typed outside it must not reach the game's shortcuts underneath
window.addEventListener('keydown',e=>{const top=RP.on?RP.el:V.el;if(!top||top.contains(e.target))return;e.stopPropagation();
 if(e.key==='Escape'||e.key==='Esc'){e.preventDefault();if(RP.on)rpClose();else close();}},true);
async function open(id){if(!okId(id))return;if(!V.el){V.lastFocus=document.activeElement;}V.id=id;V.m=null;const o=vBuild();try{o.querySelector('.x').focus({preventScroll:true});}catch(e){}
 const r=await api('/api/memorial?id='+id);if(V.id!==id||V.el!==o)return;
 if(r.st===404&&r.j.error==='not-found'){const O=ownLoad();if(O[id]){delete O[id];ownSave(O);}}
 if(!r.j.ok||!r.j.m||!r.j.m.d){o.querySelector('.mmv-body').innerHTML=`<div class="mmv-state" role="status">${esc(errTxt(r))}<br><br><button type="button" class="mmv-btn">ลองเกิดดูบ้าง</button></div>`;o.querySelector('.mmv-state .mmv-btn').onclick=tryBirth;return;}
 V.m=r.j.m;render();}
function stripHTML(d){const fl=d.f>100?100:d.f,hp=d.hp||[],mp=d.mp||[];let s='';
 for(let i=0;i<100;i++){const f=i+1,m=mp[i],h=hp[i];if(f>fl){s+='<i class="no" style="height:6%"></i>';continue;}
  const ht=h>=0?clampN(h,6,100):m?62:40,col=MAPC[m]||'#d8c89a',dead=!d.w&&f===fl;s+=`<i class="${dead?'dead':''}" style="height:${ht}%;background:${col}" title="ชั้น ${f}${h>=0?' · HP เหลือต่ำสุด '+h+'%':''}"></i>`;}
 return s;}
function render(){const o=V.el,M=V.m,d=M.d,fl=d.f>100?100:d.f,own=ownLoad()[M.id],cls=String(d.cn||'');
 o.setAttribute('aria-label',`อนุสรณ์ของ ${d.n}`);
 const head=`<section class="mmv-card"><div class="mmv-hd"><canvas class="mmv-cover" width="256" height="256" aria-hidden="true"></canvas><div style="min-width:0">
  <div class="mmv-nm">${esc(d.n)}</div><div class="mmv-sub">แรงค์ ${esc(RANK_K[d.rk]||'?')} · ${esc(cls)}${d.vl?` · จาก${esc(d.vl)}`:''}${d.g>1?` · รุ่นที่ ${d.g}`:''}</div>
  <div class="mmv-fl">${d.w?(d.f>100?'👑 ชั้น 100 + ชั้นลับ':'👑 ชั้น 100 / 100'):`ชั้น ${fl} / 100`}</div></div></div>
  ${d.ti?`<div class="mmv-ti">ฉายา <b>「${esc(d.ti)}」</b></div>`:''}<div class="mmv-ca">${esc(d.w?'พิชิตยอดหอคอย':d.ca)}</div>
  ${d.eu||d.el?`<div class="mmv-eu">${d.eu?`「${esc(d.eu)}」 `:''}${esc(d.el||'')}</div>`:''}
  <div class="mmv-strip" role="img" aria-label="แผนที่ ${fl} ชั้นที่ผ่านมา ความสูงของแท่งคือ HP ที่เหลือในชั้นนั้น">${stripHTML(d)}</div><div class="mmv-sl"><span>ชั้น 1</span><span>แท่งสูงต่ำตาม HP ที่เหลือ สีบอกว่าเจออะไร</span><span>100</span></div>
  <div class="mmv-cdl"><canvas class="cdc" width="64" height="24" aria-hidden="true"></canvas><div class="mmv-cdt" aria-live="polite"></div><div class="mmv-act"><button type="button" class="mmv-btn cdb">🕯 จุดเทียน</button><button type="button" class="mmv-btn gb">💬 ฝากคำ</button></div></div></section>
 <div class="mmv-tabs" role="tablist"><button type="button" role="tab" data-t="alb">อัลบั้ม</button><button type="button" role="tab" data-t="gst">สมุดเยี่ยม</button><button type="button" role="tab" data-t="last">ช่วงเวลาสุดท้าย</button></div>
 <section class="mmv-card mmv-pane" role="tabpanel"></section>
 <section class="mmv-card mmv-cta"><p>${d.w?`${esc(d.n)}ขึ้นถึงยอดหอได้ แล้วคุณล่ะ จะไปได้ถึงชั้นไหน?`:`${esc(d.n)}ไปได้ถึงชั้น ${fl} แล้วคุณล่ะ จะไปได้ถึงชั้นไหน?`}</p><button type="button" class="mmv-btn go">ลองเกิดดูบ้าง</button><small>ชีวิตนี้มีคนเล่นจริงในหอคอยโชคชะตา เกิดแล้วไต่ได้ครั้งเดียว</small></section>
 <div class="mmv-chips"><button type="button" class="rnd">🎲 อนุสรณ์แบบสุ่ม</button><button type="button" class="cp">🔗 คัดลอกลิงก์</button>${navigator.share?'<button type="button" class="sh">📤 แชร์</button>':''}<button type="button" class="rp">⚑ รายงาน</button>${own?'<button type="button" class="own">ถอดอนุสรณ์นี้</button>':''}</div>
 <p class="mmv-msg" role="status" aria-live="polite"></p>`;
 const body=o.querySelector('.mmv-body');body.innerHTML=head;
 const cv=o.querySelector('.mmv-cover').getContext('2d');cv.imageSmoothingEnabled=false;
 V.cover={x:cv,fr:lastFr(d)};V.cd={x:o.querySelector('.cdc').getContext('2d')};V.cd.x.imageSmoothingEnabled=false;candleTxt();
 o.querySelector('.cdb').onclick=candle;o.querySelector('.go').onclick=tryBirth;
 o.querySelector('.gb').onclick=()=>{tab('gst');const tb=o.querySelector('.mmv-tabs');try{tb.scrollIntoView({block:'start',behavior:RM?'auto':'smooth'});}catch(e){}const w=o.querySelector('.mmv-words button:not([disabled])');if(w)try{w.focus({preventScroll:true});}catch(e){}};o.querySelector('.rnd').onclick=randomOne;
 o.querySelector('.cp').onclick=async()=>{const ok=await copyTxt(linkOf(M.id),o);say(ok?'คัดลอกลิงก์แล้ว':'คัดลอกไม่ได้',!ok);};
 const sh=o.querySelector('.sh');if(sh)sh.onclick=async()=>{try{await navigator.share({title:`อนุสรณ์ของ ${d.n}`,url:linkOf(M.id)});}catch(e){}};
 o.querySelector('.rp').onclick=report;const ob=o.querySelector('.own');if(ob)ob.onclick=removeOwn;
 o.querySelectorAll('.mmv-tabs button').forEach(b=>b.onclick=()=>tab(b.dataset.t));
 tab(V.tab||'alb');loopStart();}
function say(t,bad){const m=V.el&&V.el.querySelector('.mmv-msg');if(!m)return;m.style.color=bad?'#f0a090':'#9ad08a';m.textContent=t;clearTimeout(say._t);say._t=setTimeout(()=>{m.textContent='';},3200);}
function candleTxt(){const c=V.m.c|0,t=V.el.querySelector('.mmv-cdt');if(!t)return;t.innerHTML=c?`มีคนจุดเทียนไว้ที่นี่ <b>${nf(c)}</b> เล่ม`:'ยังไม่มีใครจุดเทียน เป็นคนแรกไหม?';
 const b=V.el.querySelector('.cdb');if(b&&V.lit[V.m.id]){b.disabled=true;b.textContent='🕯 จุดแล้ววันนี้';}}
function drawCandles(t){const x=V.cd&&V.cd.x;if(!x)return;x.clearRect(0,0,64,24);const n=clampN(V.m.c|0,0,9),N=Math.max(1,n);
 for(let i=0;i<N;i++){const X=Math.round(32-(N*7)/2+i*7);if(n)A.drawCandle(x,X,15,t,i);else{x.globalAlpha=.35;A.blit(x,A.CANDLE,X,15,{key:'candle',noShadow:true});x.globalAlpha=1;}}}
async function candle(){const M=V.m,b=V.el.querySelector('.cdb');if(!M||!b||V.lit[M.id])return;b.disabled=true;
 const r=await api('/api/candle',{id:M.id});if(V.m!==M)return;
 if(r.j.ok){V.lit[M.id]=1;if(!r.j.dup&&!ownLoad()[M.id])try{window.ACH&&window.ACH.onEvent&&window.ACH.onEvent('candle',{id:M.id});}catch(e){}if(typeof r.j.c==='number')M.c=r.j.c;candleTxt();say(r.j.dup?'วันนี้คุณจุดเทียนให้ไปแล้ว':'จุดเทียนแล้ว');}else{b.disabled=false;say(errTxt(r),true);}}
function tab(t){V.tab=t;const o=V.el,M=V.m,d=M.d,p=o.querySelector('.mmv-pane');V.anim=[];
 o.querySelectorAll('.mmv-tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===t?'true':'false'));
 if(t==='alb'){const fl=d.f>100?100:d.f;p.innerHTML=BANDS.map(([a,b],bi)=>{const F=(d.fr||[]).map((f,i)=>({f,i})).filter(o=>o.f.f>=a&&o.f.f<=b);
   const h=`<h3>ชั้น ${a}–${b} · ${esc(BIOMES[biome(a)]||'')}${biome(b)!==biome(a)?' และ'+esc(BIOMES[biome(b)]||''):''}</h3>`;
   if(!F.length)return`<div class="mmv-band">${h}<p class="none">${fl<a?'ไปไม่ถึงช่วงนี้':'ช่วงนี้ไม่มีภาพที่เก็บไว้'}</p></div>`;
   return`<div class="mmv-band">${h}<div class="mmv-pol">${F.map(o=>`<figure class="${o.f.r==='l'?'l':''}"><canvas width="384" height="256" data-i="${o.i}" aria-hidden="true"></canvas><figcaption><span class="f">ชั้น ${o.f.f}</span>${esc(o.f.c)}${o.f.s?`<span>${esc(o.f.s)}</span>`:''}</figcaption></figure>`).join('')}</div></div>`;}).join('');
  p.querySelectorAll('canvas').forEach(c=>{const x=hx(c);safeDraw(x,d.fr[+c.dataset.i],d,0);});}
 else if(t==='gst'){const w=M.w||[0,0,0,0,0],mine=V.word[M.id],left=WORDS.map((s,i)=>({s,n:w[i]|0})).filter(o=>o.n);
  p.innerHTML=`<p style="margin:0;font-size:14px">ฝากคำสั้นๆ ไว้ให้${esc(d.n)} เลือกได้วันละหนึ่งคำ ไม่ต้องบอกชื่อ</p><div class="mmv-words">${WORDS.map((s,i)=>`<button type="button" data-w="${i}" aria-pressed="${mine===i?'true':'false'}"${mine!=null?' disabled':''}>${esc(s)}</button>`).join('')}</div>
   ${left.length?`<ul class="mmv-left">${left.map(o=>`<li>${esc(o.s)}<span>${nf(o.n)} ครั้ง</span></li>`).join('')}</ul>`:'<p class="none" style="font-size:13px;color:#8b7a62;margin:0">ยังไม่มีใครฝากคำไว้</p>'}`;
  p.querySelectorAll('.mmv-words button').forEach(b=>b.onclick=()=>word(+b.dataset.w));}
 else{const fl=d.f>100?100:d.f,M2=mourners(d),np=M2.filter(m=>!m.pet).length,pp=M2.filter(m=>m.pet).length;
  const who=[np?`เพื่อนร่วมทาง ${np} คน`:'',pp?`สัตว์เลี้ยง ${pp} ตัว`:''].filter(Boolean).join(' กับ');
  p.innerHTML=`<canvas class="mmv-fun" width="384" height="256" aria-hidden="true"></canvas>
   <div class="mmv-ep"><div><b>${esc(d.w?`คนที่${d.vl||'บ้านเกิด'}จุดพลุรอรับ${d.n}กลับบ้าน`:`ร่างของ${d.n}ถูกฝังไว้ที่เชิงหอคอย`)}</b></div>
   <div>${esc(who?`${who} มายืนส่งเป็นครั้งสุดท้าย`:'ไม่มีใครมาส่ง มีแค่ลมที่พัดลงมาจากหอคอย')}</div>
   <div>${esc(d.w?`เกิดที่${d.vl} และได้ยืนบนยอดหอคอย`:`เกิดที่${d.vl} และหลับลงที่${BIOMES[biome(fl)]||''} ชั้น ${fl}`)}</div>
   ${d.pt?`<div>ลวดลายชะตา ${esc(patEmo(d.pt.c))} · ${esc(d.pt.n)}</div>`:''}${d.jd?`<div style="color:#7a6553">${esc(d.jd)}</div>`:''}</div>
   <button type="button" class="mmv-btn rep" style="width:100%">▶ ดูช่วงเวลาสุดท้ายด้วยกัน</button>`;
  const x=hx(p.querySelector('.mmv-fun'));V.anim.push({x,fr:{k:'u'}});safeDraw(x,{k:'u'},d,0);
  p.querySelector('.rep').onclick=()=>replay(d);}}
async function word(i){const M=V.m;if(!M||V.word[M.id]!=null)return;V.word[M.id]=i;tab('gst');
 const r=await api('/api/memorial',{a:'word',id:M.id,w:i});if(V.m!==M)return;
 if(r.j.ok){if(Array.isArray(r.j.w)&&r.j.w.length===5)M.w=r.j.w;say(r.j.dup?'วันนี้คุณฝากคำไว้แล้ว':'ฝากคำไว้แล้ว');}else{delete V.word[M.id];say(errTxt(r),true);}
 if(V.tab==='gst')tab('gst');}
async function report(){const M=V.m;if(!M)return;if(!confirm('รายงานอนุสรณ์นี้ว่ามีชื่อหรือข้อความไม่เหมาะสมใช่ไหม? ถ้ามีคนรายงานหลายคน อนุสรณ์จะถูกซ่อน'))return;
 const r=await api('/api/memorial',{a:'report',id:M.id});say(r.j.ok?'ส่งรายงานแล้ว ขอบคุณนะ':errTxt(r),!r.j.ok);}
async function removeOwn(){const M=V.m,O=ownLoad(),k=M&&O[M.id];if(!k)return;if(!confirm(`ถอดอนุสรณ์ของ ${M.d.n} ออกใช่ไหม? ลิงก์จะใช้ไม่ได้อีก เทียนกับคำที่คนฝากไว้จะหายไปด้วย`))return;
 const r=await api('/api/memorial',{a:'remove',id:M.id,dk:k.k});
 if(r.j.ok||r.j.error==='not-found'){delete O[M.id];ownSave(O);V.el.querySelector('.mmv-body').innerHTML='<div class="mmv-state" role="status">ถอดอนุสรณ์แล้ว</div>';loopStop();}else say(errTxt(r),true);}
async function randomOne(){const M=V.m;const r=await api('/api/memorial?random=1&not='+(M?M.id:''));
 if(r.j.ok&&okId(r.j.id)){if(V.fromUrl)setUrl(r.j.id);V.tab='alb';open(r.j.id);}else say(r.st===404&&r.j.error==='empty'?'ยังไม่มีอนุสรณ์อื่นเลย':errTxt(r),true);}
function loopStart(){loopStop();if(RM){drawStill();return;}const f=t=>{V.raf=requestAnimationFrame(f);if(document.hidden||t-V.lt<110)return;V.lt=t;drawLive(t);};V.raf=requestAnimationFrame(f);}
function loopStop(){cancelAnimationFrame(V.raf);V.raf=0;}
function drawStill(){drawLive(0);}
function drawLive(t){if(!V.m)return;const d=V.m.d;try{if(V.cover){const x=V.cover.x,s=drawLive.s||(drawLive.s=cvs2());safeDraw(s.x,V.cover.fr,d,t);x.clearRect(0,0,256,256);x.drawImage(s.c,64,0,256,256,0,0,256,256);}
 drawCandles(t);V.anim.forEach(a=>safeDraw(a.x,a.fr,d,t));}catch(e){}}
function setUrl(id){try{const L=location,q=new URLSearchParams(L.search);if(/\/m\/[a-z2-9]{9}\/?$/.test(L.pathname))history.replaceState(history.state,'',L.pathname.replace(/\/m\/[a-z2-9]{9}\/?$/,'/m/'+id)+L.search+L.hash);
 else{q.set('m',id);history.replaceState(history.state,'',L.pathname+'?'+q.toString()+L.hash);}}catch(e){}}
function clearUrl(){try{const L=location,q=new URLSearchParams(L.search);q.delete('m');const p=L.pathname.replace(/\/m\/[a-z2-9]{9}\/?$/,'/'),qs=q.toString();history.replaceState(history.state,'',p+(qs?'?'+qs:'')+L.hash);}catch(e){}}
function close(){if(RP.on)rpClose();if(!V.el)return;loopStop();V.el.remove();V.el=null;V.m=null;V.id='';V.anim=[];inertWrap(false);if(V.fromUrl){V.fromUrl=false;clearUrl();}
 const f=V.lastFocus;V.lastFocus=null;if(f&&f.focus&&document.contains(f))try{f.focus({preventScroll:true});}catch(e){}}

// ---------- replay of the ending (same steps and look as the end cinematic in auto.js) ----------
const RP={on:false,el:null,steps:[],i:-1,tm:0,raf:0,st:0,cur:0,cv:[],fr:[null,null],lit:0,arm:0,armT:0,epT:[],d:null};
function rpSteps(d){const fl=d.f>100?100:d.f,S=[],hold=(c,u)=>Math.min(3200,2100+(String(c||'').length+String(u||'').length*.4)*20)+420;
 S.push({k:'t',a:`ชีวิตของ ${d.n}`,b:`แรงค์ ${RANK_K[d.rk]||'?'} · ${String(d.cn||'').split(' · ')[0]}${d.vl?' · จาก'+d.vl:''}`,d:2100});
 S.push(d.w?{k:'t',a:'ขึ้นไปถึงยอดหอคอย',b:'ชั้น 100 · ผู้กลืนดาราล้มลงแล้ว',d:2400}:{k:'t',a:`จากไปที่ชั้น ${fl}`,b:d.ca||'',d:2600});
 S.push({k:'t',a:d.w?'มองลงไปข้างล่าง ทุกชั้นที่ผ่านมายังอยู่ตรงนั้น':'หลับตาลง ภาพทุกชั้นที่ผ่านมาย้อนกลับมาทีละภาพ',b:'',d:2200});
 (d.fr||[]).forEach(f=>S.push({k:'m',fr:f,d:hold(f.c,f.s)}));
 const M=mourners(d),np=M.filter(m=>!m.pet).length,pp=M.filter(m=>m.pet).length,who=[np?`เพื่อนร่วมทาง ${np} คน`:'',pp?`สัตว์เลี้ยง ${pp} ตัว`:''].filter(Boolean).join(' และ');
 S.push({k:'m',fun:1,d:5600,fr:{k:'u',f:fl,c:d.w?`คนที่${d.vl||'บ้านเกิด'}จุดพลุรอรับ${d.n}กลับบ้าน`:`ร่างของ${d.n}ถูกฝังไว้ที่เชิงหอคอย`,s:who?(d.w?`${who} ขึ้นมายืนบนยอดหอด้วยกัน`:`${who} มายืนส่งเป็นครั้งสุดท้าย`):(d.w?'บนยอดหอมีแค่คุณกับดาวทั้งฟ้า':'ไม่มีใครมาส่ง มีแค่ลมที่พัดลงมาจากหอคอย')}});
 S.push({k:'e',lines:[d.w?`เกิดที่${d.vl} และได้ยืนบนยอดหอคอย`:`เกิดที่${d.vl} และหลับลงที่${BIOMES[biome(fl)]||''} ชั้น ${fl}`,`ผ่านไป ${fl} ชั้น${d.kl?` ปราบมอนสเตอร์ ${nf(d.kl)} ตัว`:''}`,d.eu?`「${d.eu}」`:'',d.pt?`ลวดลายชะตา ${patEmo(d.pt.c)} · ${d.pt.n}`:''].filter(Boolean),close:'หอคอยร้อยชั้นนี้ เดินแบบนี้ได้เพียงครั้งเดียว'});
 return S;}
function replay(d){if(RP.on)return;RP.d=d;RP.steps=rpSteps(d);RP.i=-1;RP.cur=0;RP.lit=0;RP.fr=[null,null];RP.arm=0;RP.on=true;
 const fl=d.f>100?100:d.f,el=document.createElement('div');el.className='cine';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',`ช่วงเวลาสุดท้ายของ ${d.n}`);
 el.innerHTML=`<button type="button" class="cskip">ข้าม ⏭</button><div class="cstage"><div class="ct" aria-live="polite"><div class="cta"></div><div class="ctb"></div></div>
  <div class="cm"><div class="cfr"><canvas width="384" height="256"></canvas><canvas width="384" height="256"></canvas></div><div class="cfl px"></div><div class="ccap" aria-live="polite"></div><div class="csub"></div>
  <div class="cstrip" aria-hidden="true">${Array.from({length:100},(_,i)=>`<i${(i+1)%10===0?' class="b"':''}></i>`).join('')}</div></div>
  <div class="ce"><div class="cen">${esc(d.n)}</div><div class="cey px">ชั้น 1 – ชั้น ${fl}</div><div class="cel"></div><div class="cec"></div><button type="button" class="btn pri cgo">กลับไปที่อนุสรณ์</button></div></div>`;
 document.body.appendChild(el);RP.el=el;RP.cv=[...el.querySelectorAll('.cfr canvas')].map(c=>({c,x:hx(c)}));
 el.querySelector('.cskip').onclick=e=>{e.stopPropagation();rpSkip();};el.querySelector('.cgo').onclick=e=>{e.stopPropagation();rpClose();};
 el.addEventListener('click',e=>{if(e.target.closest('button'))return;rpTap();});
 el.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'||e.key==='Esc'){e.preventDefault();rpClose();}else if((e.key===' '||e.key==='ArrowRight')&&!RM){e.preventDefault();rpTap();}});
 if(V.el)V.el.inert=true;
 if(RM)rpStatic();else{rpGo(0);const f=t=>{RP.raf=requestAnimationFrame(f);if(t-(RP.lt||0)<50)return;RP.lt=t;RP.cv.forEach((v,i)=>{if(RP.fr[i]&&(i===RP.cur||t-RP.st<500))safeDraw(v.x,RP.fr[i],RP.d,t);});};RP.raf=requestAnimationFrame(f);}
 try{el.querySelector(RM?'.cgo':'.cskip').focus({preventScroll:true});}catch(e){}
 requestAnimationFrame(()=>RP.el&&RP.el.classList.add('open'));}
function reanim(n){if(!n)return;n.classList.remove('in');void n.offsetWidth;n.classList.add('in');}
function rpStrip(f,dead){const cells=RP.el.querySelectorAll('.cstrip i'),mp=RP.d.mp||[],a=RP.lit,n=Math.max(1,f-a);
 for(let j=a;j<f&&j<100;j++){const c=cells[j];c.style.transitionDelay=(((j-a)/n)*.8).toFixed(2)+'s';const m=mp[j];c.style.background=m&&m!=='calm'&&m!=='farm'?(MAPC[m]||'#d8c89a'):'#d8c89a';c.classList.add('on');}
 if(dead&&cells[f-1])cells[f-1].classList.add('dead');RP.lit=Math.max(a,f);}
function rpShow(s){const el=RP.el;
 if(s.k==='t'){el.dataset.mode='t';el.querySelector('.cta').textContent=s.a;el.querySelector('.ctb').textContent=s.b||'';reanim(el.querySelector('.ct'));return;}
 if(s.k==='m'){el.dataset.mode=s.fun?'f':'m';const fr=s.fr,nx=1-RP.cur,N=RP.cv[nx];RP.fr[nx]=fr;safeDraw(N.x,fr,RP.d,performance.now());N.c.classList.add('on');RP.cv[RP.cur].c.classList.remove('on');RP.cur=nx;
  el.querySelector('.cfl').textContent=fr.k==='u'?(RP.d.w?'ยอดหอคอย':'เชิงหอคอย'):`ชั้น ${fr.f}`;el.querySelector('.ccap').textContent=fr.c||'';el.querySelector('.csub').textContent=fr.s||'';
  el.querySelector('.cfr').classList.toggle('leg',fr.r==='l');reanim(el.querySelector('.ccap'));reanim(el.querySelector('.csub'));reanim(el.querySelector('.cfl'));
  if(fr.k!=='u')rpStrip(fr.f,fr.k==='d');return;}
 if(s.k==='e'){el.dataset.mode='e';const L=el.querySelector('.cel');L.innerHTML=s.lines.map(t=>`<div>${esc(t)}</div>`).join('');el.querySelector('.cec').textContent=s.close;
  const rows=[...L.children,el.querySelector('.cec'),el.querySelector('.cgo')];RP.epT.forEach(clearTimeout);RP.epT=[];
  rows.forEach((r,i)=>{r.classList.remove('vis');RP.epT.push(setTimeout(()=>{r.classList.add('vis');if(r.classList.contains('cgo'))try{r.focus({preventScroll:true});}catch(e){}},500+i*900));});}}
function rpGo(i){clearTimeout(RP.tm);const s=RP.steps[i];if(!s){rpClose();return;}RP.i=i;RP.st=performance.now();rpShow(s);if(s.d)RP.tm=setTimeout(()=>rpGo(i+1),s.d);}
function rpTap(){if(!RP.on||RM)return;if(performance.now()-RP.st<900)return;const s=RP.steps[RP.i];
 if(s&&s.k==='e'){RP.epT.forEach(clearTimeout);RP.epT=[];RP.el.querySelectorAll('.cel div,.cec,.cgo').forEach(r=>r.classList.add('vis'));return;}rpGo(RP.i+1);}
function rpSkip(){const b=RP.el&&RP.el.querySelector('.cskip');if(!b)return;if(RP.arm){rpClose();return;}RP.arm=1;b.textContent='แตะอีกครั้งเพื่อข้าม';b.classList.add('arm');
 clearTimeout(RP.armT);RP.armT=setTimeout(()=>{RP.arm=0;b.textContent='ข้าม ⏭';b.classList.remove('arm');},3000);}
function rpStatic(){const el=RP.el;el.dataset.mode='s';el.classList.add('static');const st=el.querySelector('.cstage'),S=RP.steps,T=S.filter(x=>x.k==='t'),F=S.filter(x=>x.k==='m'),E=S.find(x=>x.k==='e');
 const list=document.createElement('div');list.className='cslist';
 list.innerHTML=T.map(x=>`<div class="cst"><b>${esc(x.a)}</b>${x.b?`<span>${esc(x.b)}</span>`:''}</div>`).join('')+F.map((x,i)=>`<figure class="csf"><canvas width="384" height="256" data-i="${i}"></canvas><figcaption><span class="px">${x.fr.k==='u'?(RP.d.w?'ยอดหอคอย':'เชิงหอคอย'):'ชั้น '+x.fr.f}</span><b>${esc(x.fr.c||'')}</b><span>${esc(x.fr.s||'')}</span></figcaption></figure>`).join('');
 st.querySelector('.ct').remove();st.querySelector('.cm').remove();st.insertBefore(list,st.firstChild);
 list.querySelectorAll('canvas').forEach(c=>{const x=hx(c);safeDraw(x,F[+c.dataset.i].fr,RP.d,0);});
 el.querySelector('.cel').innerHTML=E.lines.map(t=>`<div class="vis">${esc(t)}</div>`).join('');const cc=el.querySelector('.cec');cc.textContent=E.close;cc.classList.add('vis');el.querySelector('.cgo').classList.add('vis');}
function rpClose(){if(!RP.on)return;RP.on=false;clearTimeout(RP.tm);clearTimeout(RP.armT);RP.epT.forEach(clearTimeout);RP.epT=[];cancelAnimationFrame(RP.raf);
 const el=RP.el;RP.el=null;if(el){el.classList.remove('open');el.classList.add('closing');setTimeout(()=>el.remove(),RM?0:320);}
 if(V.el){V.el.inert=false;const b=V.el.querySelector('.rep');if(b)try{b.focus({preventScroll:true});}catch(e){}}}

// ---------- boot: /m/<id> or ?m=<id> ----------
function bootId(){try{const L=location,m=L.pathname.match(/\/m\/([a-z2-9]{9})\/?$/);if(m)return m[1];const q=new URLSearchParams(L.search).get('m');return okId(q)?q:null;}catch(e){return null;}}
const owned=()=>Object.keys(ownLoad()).filter(okId);
window.MEMO={create,open:id=>{V.fromUrl=V.fromUrl&&!!V.el;open(id);},close,owned};
const bid=bootId();if(bid){V.fromUrl=true;setTimeout(()=>open(bid),0);}
})();
