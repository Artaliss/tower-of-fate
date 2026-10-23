// town.js — ล็อบบี้ตระกูล: ลานหน้าบ้านพิกเซล รูปปั้นหัวหน้าตระกูล สมาชิก/สัตว์เดินเล่น ของตกแต่ง แฟชั่น อาคารลัดไปแท็บอื่น
// API: window.TOWN = { DECOR:{key:{n,draw(ctx,x,y,t)}}, WEAR:{key:{n,draw(ctx,cx,ty,t)}}, mini() }
// DECOR: x,y = กลางฐานของชิ้น · WEAR: cx = กลางหัว, ty = ขอบบนของหัว · t = performance.now()
// อ่าน P.mod.city.decor (key[]), P.mod.fest.wear[memberId] (key), P.mod.hard.statue (0 หิน/1 ทอง/2 รุ้ง)
(function(){
'use strict';
if(!window.META)return;
const M=window.META,A=()=>window.ART||{},C=()=>window.CONTENT||{},esc=M.esc;
const W=192,H=128,MINI_Y=44,MINI_H=52;
const RMQ=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const R=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h);};
const fl=(t,ms,n)=>Math.floor(t/ms)%n;
const hsh=n=>{n=(n^61)^(n>>>16);n=n+(n<<3);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);n^=n>>>15;return(n>>>0)/4294967296;};
// ---------- ของตกแต่ง (city.js + fest.js อ้างชื่อไทยจากที่นี่ได้) ----------
const DECOR={
fountain:{n:'น้ำพุ',draw(c,x,y,t){const f=fl(t,160,3);R(c,x-9,y-5,18,5,'#7a828c');R(c,x-9,y-5,18,1,'#b4bcc6');R(c,x-8,y-4,16,2,'#4aa0e0');R(c,x-2,y-11,4,6,'#8a929a');R(c,x-4,y-12,8,2,'#b4bcc6');
 R(c,x-1,y-15-f,2,3+f,'#9ad8ff');R(c,x-4,y-11+f,1,1,'#9ad8ff');R(c,x+3,y-10+f,1,1,'#9ad8ff');}},
lamp:{n:'โคมไฟ',draw(c,x,y,t){R(c,x,y-14,1,14,'#2a2a33');R(c,x-2,y-17,5,4,'#2a2a33');R(c,x-1,y-16,3,2,fl(t,300,2)?'#ffe08a':'#ffd060');
 const g=c.globalAlpha;c.globalAlpha=g*.16;R(c,x-5,y-20,11,9,'#ffd060');c.globalAlpha=g;}},
tree:{n:'ต้นไม้',draw(c,x,y){R(c,x-1,y-6,3,6,'#6a4a2a');R(c,x-6,y-15,13,8,'#3e7a3a');R(c,x-4,y-18,9,3,'#4f9a46');R(c,x-5,y-8,11,2,'#2f5e2c');R(c,x-3,y-16,3,2,'#7ac06a');}},
flag:{n:'ธงตระกูล',draw(c,x,y,t){const w=fl(t,260,2);R(c,x,y-20,1,20,'#c8c0a8');R(c,x+1,y-20,8,5,'#d0403a');R(c,x+9,y-19+w,2,4,'#d0403a');R(c,x+3,y-18,3,1,'#f4bb4a');}},
bench:{n:'ม้านั่ง',draw(c,x,y){R(c,x-7,y-5,14,2,'#8a5a32');R(c,x-7,y-8,14,1,'#a06a3a');R(c,x-6,y-3,1,3,'#4a3020');R(c,x+5,y-3,1,3,'#4a3020');R(c,x-7,y-7,1,2,'#4a3020');R(c,x+6,y-7,1,2,'#4a3020');}},
well:{n:'บ่อน้ำ',draw(c,x,y){R(c,x-6,y-6,12,6,'#7a828c');R(c,x-6,y-6,12,1,'#b4bcc6');R(c,x-4,y-5,8,1,'#1a2a3a');R(c,x-6,y-14,1,8,'#6a4a2a');R(c,x+5,y-14,1,8,'#6a4a2a');
 R(c,x-8,y-16,16,2,'#a0402a');R(c,x-6,y-18,12,2,'#c0503a');R(c,x,y-14,1,3,'#c8c0a8');R(c,x-1,y-11,3,2,'#8a5a32');}},
garden:{n:'แปลงดอกไม้',draw(c,x,y){R(c,x-8,y-3,16,3,'#5a3a22');[[-6,'#ff6a8a'],[-3,'#ffd040'],[0,'#c070ff'],[3,'#ff6a8a'],[6,'#ffffff']].forEach(([d,col])=>{R(c,x+d,y-6,1,3,'#3e7a3a');R(c,x+d-1,y-7,3,2,col);});}},
banner:{n:'ผืนธงประจำตระกูล',draw(c,x,y,t){R(c,x-6,y-22,13,1,'#6a4a2a');R(c,x+6,y-22,1,22,'#6a4a2a');R(c,x-5,y-21,9,13,'#3a5aa8');R(c,x-5,y-8,3,2+fl(t,400,2),'#3a5aa8');R(c,x+1,y-8,3,2,'#3a5aa8');
 R(c,x-2,y-18,3,3,'#f4bb4a');R(c,x-1,y-15,1,4,'#f4bb4a');}},
pumpkin:{n:'ฟักทองฮาโลวีน',draw(c,x,y,t){R(c,x-5,y-7,10,7,'#e07a1a');R(c,x-6,y-6,12,5,'#e07a1a');R(c,x-2,y-7,1,7,'#b0560e');R(c,x+2,y-7,1,7,'#b0560e');R(c,x-1,y-9,2,2,'#4a7a2a');
 const g=fl(t,350,2)?'#ffe060':'#ffb030';R(c,x-4,y-5,2,2,g);R(c,x+2,y-5,2,2,g);R(c,x-3,y-2,6,1,g);}},
ghostlamp:{n:'โคมผี',draw(c,x,y,t){const b=fl(t,400,2);R(c,x,y-14,1,14,'#3a3048');R(c,x-2,y-17,5,4,'#3a3048');R(c,x-1,y-16,3,2,b?'#8ad8ff':'#5ab0f0');
 R(c,x+3,y-22+b,3,3,'#e8f4ff');R(c,x+3,y-19+b,1,1,'#e8f4ff');R(c,x+5,y-19+b,1,1,'#e8f4ff');R(c,x+4,y-21+b,1,1,'#2a2034');}},
cauldron:{n:'หม้อแม่มด',draw(c,x,y,t){const f=fl(t,220,3);R(c,x-6,y-7,12,6,'#22222a');R(c,x-7,y-8,14,2,'#3a3a44');R(c,x-5,y-1,2,1,'#22222a');R(c,x+3,y-1,2,1,'#22222a');
 R(c,x-5,y-8,10,1,'#6af04a');R(c,x-2+f,y-10-f,2,2,'#9aff7a');R(c,x-3,y-1,6,1,f?'#ff7a2a':'#ffb040');}},
batflag:{n:'ธงค้างคาว',draw(c,x,y,t){const w=fl(t,260,2);R(c,x,y-20,1,20,'#8a8a9a');R(c,x+1,y-20,9,6,'#1a1424');R(c,x+10,y-19+w,2,4,'#1a1424');
 R(c,x+3,y-18,5,1,'#a060e0');R(c,x+5,y-19,1,3,'#a060e0');R(c,x+2,y-17,1,1,'#a060e0');R(c,x+8,y-17,1,1,'#a060e0');}}};
function decorDraw(c,k,x,y,t){const d=DECOR[k];if(d)return d.draw(c,x,y,t);R(c,x-5,y-8,10,8,'#8a6a4a');R(c,x-5,y-8,10,1,'#b08a5a');R(c,x-1,y-8,2,8,'#6a4a2a');}
// ---------- แฟชั่นทับหัว (fest.js อ้างชื่อไทยจากที่นี่ได้) ----------
const WEAR={
wizhat:{n:'หมวกพ่อมด',draw(c,x,y){R(c,x-5,y-1,10,2,'#2e4d8a');R(c,x-3,y-4,6,3,'#3b62a8');R(c,x-2,y-7,4,3,'#3b62a8');R(c,x-1,y-9,2,2,'#3b62a8');R(c,x,y-5,1,1,'#ffe060');}},
witchhat:{n:'หมวกแม่มด',draw(c,x,y){R(c,x-6,y-1,12,2,'#1a1424');R(c,x-3,y-4,6,3,'#2a2034');R(c,x-2,y-7,3,3,'#2a2034');R(c,x,y-9,2,2,'#2a2034');R(c,x-3,y-2,6,1,'#a060e0');}},
pumpkinhead:{n:'หัวฟักทอง',draw(c,x,y,t){R(c,x-5,y-1,10,9,'#e07a1a');R(c,x-6,y,12,7,'#e07a1a');R(c,x-1,y-3,2,2,'#4a7a2a');const g=fl(t||0,350,2)?'#ffe060':'#ffb030';
 R(c,x-3,y+2,2,2,g);R(c,x+1,y+2,2,2,g);R(c,x-2,y+5,4,1,g);}},
catears:{n:'หูแมว',draw(c,x,y){[x-5,x+2].forEach(e=>{R(c,e,y-2,3,2,'#2a2a33');R(c,e+1,y-3,1,1,'#2a2a33');R(c,e+1,y-2,1,1,'#ff9ab0');});}},
batwings:{n:'ปีกค้างคาว',draw(c,x,y,t){const f=fl(t||0,300,2);[[-1,x-7],[1,x+6]].forEach(([s,e])=>{R(c,e+(s<0?-3:0),y+5-f,4,3,'#2a1a3a');R(c,e+(s<0?-5:3),y+4-f,3,2,'#2a1a3a');R(c,e+(s<0?-4:2),y+8-f,2,1,'#2a1a3a');});}},
crown:{n:'มงกุฎ',draw(c,x,y){R(c,x-4,y-2,8,2,'#f4bb4a');R(c,x-4,y-4,1,2,'#f4bb4a');R(c,x-1,y-4,2,2,'#f4bb4a');R(c,x+3,y-4,1,2,'#f4bb4a');R(c,x-1,y-2,1,1,'#e0302a');}}};
// ---------- อาคารในลาน (แตะแล้วเปิดแท็บ) ----------
const BLD=[{id:'clan',n:'ป้อมทหารรับจ้าง',ic:'🛡',x:19},{id:'quest',n:'กระดานเควส',ic:'📜',x:57},{id:'hard',n:'ประตูดันเจี้ยน',ic:'🌀',x:96},{id:'train',n:'ลานฝึก',ic:'🎯',x:135},{id:'fest',n:'ร้านเทศกาล',ic:'🎃',x:173}];
const BY=46;
function bldDraw(c,id,x,y){
 if(id==='clan'){R(c,x-10,y-30,20,30,'#7a6a5a');for(let i=0;i<4;i++)R(c,x-10+i*6,y-33,3,3,'#7a6a5a');for(let r=0;r<5;r++)R(c,x-10,y-26+r*6,20,1,'#5e5044');
  R(c,x-4,y-12,8,12,'#3a2414');R(c,x-4,y-12,8,1,'#5a3a22');R(c,x-2,y-24,4,5,'#1a1424');R(c,x,y-42,1,9,'#c8c0a8');R(c,x-15,y-11,6,7,'#3a5aa8');R(c,x-13,y-9,2,3,'#f4bb4a');}
 else if(id==='quest'){R(c,x-12,y-18,2,18,'#5a3a22');R(c,x+10,y-18,2,18,'#5a3a22');R(c,x-13,y-26,26,14,'#8a5a32');R(c,x-13,y-26,26,1,'#b07a42');R(c,x-15,y-29,30,3,'#a0402a');
  R(c,x-10,y-23,5,6,'#f0e8d0');R(c,x-3,y-24,5,5,'#fff4c0');R(c,x+4,y-22,6,6,'#f0e8d0');R(c,x-8,y-23,1,1,'#d0403a');R(c,x-1,y-24,1,1,'#d0403a');R(c,x+6,y-22,1,1,'#d0403a');}
 else if(id==='hard'){R(c,x-15,y-34,30,34,'#5a6068');for(let i=0;i<5;i++)R(c,x-15+i*6.5,y-37,4,3,'#5a6068');for(let r=0;r<5;r++)R(c,x-15,y-30+r*7,30,1,'#454a52');
  R(c,x-8,y-24,16,24,'#140c20');R(c,x-6,y-26,12,2,'#140c20');R(c,x-13,y-20,2,5,'#6a4a2a');R(c,x+11,y-20,2,5,'#6a4a2a');}
 else if(id==='train'){R(c,x-1,y-20,2,16,'#6a4a2a');R(c,x-6,y-16,12,2,'#6a4a2a');R(c,x-3,y-23,6,6,'#d8b878');R(c,x-2,y-15,4,8,'#c8a868');
  R(c,x+8,y-18,7,7,'#e8e0d0');R(c,x+9,y-17,5,5,'#d0403a');R(c,x+10,y-16,3,3,'#e8e0d0');R(c,x+11,y-15,1,1,'#d0403a');R(c,x+11,y-11,1,11,'#6a4a2a');
  R(c,x-16,y-6,32,1,'#8a5a32');R(c,x-16,y-3,32,1,'#8a5a32');for(let i=0;i<7;i++)R(c,x-16+i*5,y-8,1,8,'#6a4a2a');}
 else if(id==='fest'){R(c,x-14,y-14,28,14,'#e8e0d0');for(let i=0;i<8;i++)R(c,x-16+i*4,y-20,4,6,i%2?'#ff8a2a':'#a040c0');for(let i=0;i<8;i++)R(c,x-15+i*4,y-14,2,1,i%2?'#ff8a2a':'#a040c0');
  for(let r=0;r<6;r++)R(c,x-1-r*2.6,y-26+r,2+r*5.2,1,'#a040c0');R(c,x,y-29,1,3,'#c8c0a8');R(c,x-4,y-10,8,10,'#2a1424');R(c,x-12,y-6,6,6,'#8a5a32');R(c,x+7,y-5,5,5,'#e07a1a');R(c,x+9,y-6,1,1,'#4a7a2a');}}
// ส่วนที่ขยับของอาคาร: ธงป้อม คบเพลิง ประตูวน
function bldAnim(c,t){const f=fl(t,260,2);R(c,19+1,BY-42,7,4,'#3a5aa8');R(c,19+8,BY-41+f,2,3,'#3a5aa8');
 const g=fl(t,140,3);R(c,96-13,BY-23-g%2,2,3,g?'#ffb040':'#ffe080');R(c,96+11,BY-23-(g+1)%2,2,3,g?'#ffe080':'#ffb040');
 const p=(t/90)%22;R(c,96-6,BY-20,12,20,'#2a1440');R(c,96-4+Math.round(Math.sin(t/300)*3),BY-4-p,2,2,'#c070ff');R(c,96+2-Math.round(Math.sin(t/260)*3),BY-4-(p+11)%22,1,1,'#ffb0ff');}
// ---------- ฉากหลังนิ่ง (วาดครั้งเดียว) ----------
let BG=null;
function bg(){if(BG)return BG;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
 ['#141c30','#1a2440','#22304c','#2c3c58'].forEach((col,i)=>R(c,0,i*4,W,4,col));R(c,0,16,W,4,'#3a4a5e');
 for(let i=0;i<12;i++)R(c,Math.floor(hsh(i*31+7)*W),Math.floor(hsh(i*17+3)*12),1,1,'#e8f0ff');
 for(let x=0;x<W;x+=2){const h=4+Math.floor(4*(Math.sin(x/17)+1)+hsh(x)*2);R(c,x,22-h,2,h,'#22382c');}
 R(c,0,20,W,26,'#2f4a2e');R(c,0,BY-2,W,8,'#6a5a48');for(let x=0;x<W;x+=5)R(c,x+(x%10?2:0),BY,2,1,'#5a4a3a');
 R(c,0,BY+6,W,H-BY-6,'#3d5a34');
 for(let i=0;i<70;i++){const x=Math.floor(hsh(i*13+1)*W),y=BY+8+Math.floor(hsh(i*7+5)*(H-BY-10));R(c,x,y,1,2,i%3?'#4f7a3a':'#33502c');}
 // ลานหินรอบรูปปั้นกลาง
 for(let y=60;y<=118;y++){const d=(y-89)/29,hw=Math.round(58*Math.sqrt(Math.max(0,1-d*d)));if(!hw)continue;R(c,96-hw,y,hw*2,1,'#7a7064');
  for(let x=96-hw;x<96+hw;x+=4)if((y+(x>>2))%3===0)R(c,x+(y%2),y,2,1,'#8a8072');else if((x+y)%7===0)R(c,x,y,1,1,'#5e564c');}
 R(c,90,BY+6,12,14,'#7a7064');for(let y=BY+6;y<60;y+=3)R(c,92,y,8,1,'#8a8072');
 BLD.forEach(b=>bldDraw(c,b.id,b.x,BY));return BG=cv;}
// ---------- สไปรต์ ----------
function spOf(m){const a=A();try{return m.kind==='merc'?a.compSpr({n:m.name,cls:m.cls,tr:m.tr}):a.heroSpr(m.cls||'war',m.look||{form:m.form||'human',seed:m.name});}catch(e){try{return a.heroSpr('npc');}catch(e2){return null;}}}
function petSp(k){const P=A().PSPR||{};return P[k]||P.slime||null;}
function topRow(s){if(s._tw!=null)return s._tw;let i=0;while(i<s.h-1&&!/[^.]/.test(s.rows[i]))i++;return s._tw=i;}
function lum(col){if(typeof col!=='string')return .5;if(col[0]==='#'&&col.length===7){const n=parseInt(col.slice(1),16);return((n>>16)*.3+(n>>8&255)*.59+(n&255)*.11)/255;}
 const m=/hsl\([^,]+,[^,]+,\s*([\d.]+)%/.exec(col);return m?(+m[1])/100:.5;}
const stC=new Map();
function statueCv(s,mat){const k=s.id+'|'+s.rows.join('').length+'|'+s.rows[0]+'|'+mat;let cv=stC.get(k);if(cv)return cv;cv=document.createElement('canvas');cv.width=s.w;cv.height=s.h;const x=cv.getContext('2d');
 s.rows.forEach((row,y)=>{for(let i=0;i<row.length;i++){const col=s.pal[row[i]];if(row[i]==='.'||!col)continue;const L=lum(col);
  x.fillStyle=mat===2?`hsl(${(i*22+y*9)%360},75%,${Math.round(50+L*30)}%)`:mat===1?`hsl(42,${Math.round(68+L*22)}%,${Math.round(32+L*48)}%)`:`hsl(210,6%,${Math.round(36+L*46)}%)`;x.fillRect(i,y,1,1);}});
 if(stC.size>80)stC.clear();stC.set(k,cv);return cv;}
const PED=[['#5a6068','#8a929a','#3a3e44'],['#8a5a14','#e8b440','#5a3a0a'],['#8a94a8','#eef2fa','#5a6070']];
// รูปปั้น: ฐาน + ตัวสไปรต์ย้อมเป็นหิน/ทอง/รุ้ง (s=null = แท่นว่าง)
function drawStatue(c,s,x,yb,sc,mat,t,seed){const pc=PED[mat]||PED[0],pw=sc>1?28:16,ph=sc>1?8:5;
 R(c,x-pw/2,yb-ph,pw,ph,pc[0]);R(c,x-pw/2,yb-ph,pw,1,pc[1]);R(c,x-pw/2-1,yb-1,pw+2,1,pc[2]);if(sc>1)R(c,x-pw/2+3,yb-ph+3,pw-6,2,pc[2]);
 const top=yb-ph;if(!s){const g=c.globalAlpha;c.globalAlpha=g*(.18+.08*Math.sin(t/500));R(c,x-5,top-16*sc/2,10,16*sc/2,'#e8f0ff');R(c,x-3,top-16*sc/2-6,6,6,'#e8f0ff');c.globalAlpha=g;return;}
 const cv=statueCv(s,mat),dw=s.w*sc,dh=s.h*sc,sm=c.imageSmoothingEnabled;c.imageSmoothingEnabled=false;c.drawImage(cv,Math.round(x-dw/2),Math.round(top-dh),dw,dh);c.imageSmoothingEnabled=sm;
 if(mat&&!RMQ){const k=Math.floor(t/280)+seed;if(hsh(k)<.6){const lx=Math.floor(x-dw/2+hsh(k*3+1)*dw),ly=Math.floor(top-dh+hsh(k*5+2)*dh);R(c,lx,ly,1,1,'#ffffff');R(c,lx-1,ly,1,1,'rgba(255,255,255,.5)');R(c,lx+1,ly,1,1,'rgba(255,255,255,.5)');}}}
// ---------- ข้อมูลฉาก ----------
const ST_SLOT=[[30,74],[162,74],[16,106],[176,106],[42,124],[150,124]];
const DE_SLOT=[[56,64],[136,64],[8,72],[184,72],[74,62],[118,62],[6,92],[186,92],[70,126],[122,126],[96,127],[30,92],[162,92],[100,52]];
function mat(P){const v=((P.mod||{}).hard||{}).statue;return v===1||v===2?v:0;}
function wearOf(P,id){const w=((P.mod||{}).fest||{}).wear;return w&&typeof w==='object'?w[id]:'';}
function decorOf(P){const d=((P.mod||{}).city||{}).decor;return Array.isArray(d)?d.filter(k=>typeof k==='string'):[];}
const rnd=(a,b)=>a+Math.random()*(b-a);
function pick(e){for(let i=0;i<8;i++){const x=rnd(12,180),y=rnd(68,124);if(Math.abs(x-96)<22&&y<98)continue;e.tx=x;e.ty=y;return;}e.tx=rnd(12,60);e.ty=rnd(100,124);}
function build(P){const hd=P.roster.find(m=>m.id===P.head),mt=mat(P),ents=[],stat=[];
 stat.push({s:hd?spOf(hd):null,x:96,y:94,sc:2,info:hd?`<b>👑 ${esc(hd.name)}</b><br><span class="mt-dim">รูปปั้นหัวหน้าตระกูล${mt===1?' (ทอง)':mt===2?' (รุ้ง)':''}</span>`:`<b>แท่นรูปปั้นว่างอยู่</b><br><span class="mt-dim">${P.wins?'ตั้งผู้พิชิตยอดหอเป็นหัวหน้าตระกูลได้ที่ป้อมทหารรับจ้าง':'ไต่หอให้ถึงชั้น 100 เพื่อหาลูกรักมาเป็นหัวหน้าตระกูล'}</span>`});
 P.statues.filter(s=>!hd||s.name!==hd.name).slice(-ST_SLOT.length).reverse().forEach((s,i)=>{let sp=null;try{sp=A().heroSpr(s.cls||'war',{form:'human',seed:s.name});}catch(e){}
  stat.push({s:sp,x:ST_SLOT[i][0],y:ST_SLOT[i][1],sc:1,info:`<b>🗿 ${esc(s.name)}</b><br><span class="mt-dim">${esc(M.clsN(s.cls))} · ผู้พิชิตยอดหอ${s.sec==='f'||s.sec==='s'?' และชั้นลับ':''}</span>`});});
 P.roster.forEach(m=>{const s=spOf(m);if(!s)return;const e={k:'m',m,s,w:wearOf(P,m.id),sp:rnd(9,15),x:rnd(14,178),y:rnd(70,124),pause:rnd(0,2)};pick(e);ents.push(e);});
 P.pets.forEach(p=>{const s=petSp(p.k);if(!s)return;const e={k:'p',p,s,sp:rnd(12,20),x:rnd(14,178),y:rnd(70,124),pause:rnd(0,2)};pick(e);ents.push(e);});
 const dec=decorOf(P).slice(0,DE_SLOT.length).map((k,i)=>({k,x:DE_SLOT[i][0],y:DE_SLOT[i][1]}));
 return{ents,stat,dec,mt};}
function step(D,dt){D.ents.forEach(e=>{if(e.pause>0){e.pause-=dt;return;}const dx=e.tx-e.x,dy=e.ty-e.y,d=Math.hypot(dx,dy);
 if(d<1){e.pause=e.k==='p'?rnd(.5,2.5):rnd(1,4);pick(e);return;}const v=Math.min(d,e.sp*dt);e.x+=dx/d*v;e.y+=dy/d*v;if(Math.abs(dx)>.5)e.flip=dx<0;});}
function draw(c,D,t){c.imageSmoothingEnabled=false;c.drawImage(bg(),0,0);bldAnim(c,t);const L=[],a=A();
 D.stat.forEach((s,i)=>L.push({y:s.y,f:()=>drawStatue(c,s.s,s.x,s.y,s.sc,D.mt,t,i*97)}));
 D.dec.forEach(d=>L.push({y:d.y,f:()=>decorDraw(c,d.k,d.x,d.y,t)}));
 D.ents.forEach(e=>L.push({y:e.y,f:()=>{const s=e.s,bob=e.pause>0||RMQ?0:fl(t,180,2),x=Math.round(e.x-s.w/2),y=Math.round(e.y-s.h)-bob;
  try{a.blit(c,s,x,y,{flip:!!e.flip,key:'tw'});}catch(er){R(c,x,y,s.w,s.h,'#888');}
  if(e.w){const wr=WEAR[e.w];if(wr)wr.draw(c,x+Math.floor(s.w/2),y+topRow(s),t);}
  if(e.k==='p'&&e.p.legend&&!RMQ&&hsh(Math.floor(t/200)+e.x|0)<.4)R(c,x+Math.floor(hsh(Math.floor(t/200))*s.w),y-1,1,1,'#fff6a0');}}));
 L.sort((p,q)=>p.y-q.y).forEach(o=>o.f());}
// ---------- วงจรวาด (หยุดเมื่อปิดหน้าต่าง/สลับแท็บ/canvas หลุดจากหน้า) ----------
const LIVE=new Set();
function scene(cv,P,mini){const off=mini?document.createElement('canvas'):cv;if(mini){off.width=W;off.height=H;}const c=off.getContext('2d'),D=build(P),S={cv,D,run:false,last:0};
 function frame(now){if(!S.run)return;const dl=cv.closest('dialog');if(!cv.isConnected){S.run=false;LIVE.delete(S);return;}if((dl&&!dl.open)||document.hidden){S.run=false;return;}
  const dt=S.last?Math.min(.1,(now-S.last)/1000):0;S.last=now;if(!RMQ)step(D,dt);draw(c,D,now);
  if(mini){const m=cv.getContext('2d');m.imageSmoothingEnabled=false;m.drawImage(off,0,MINI_Y,W,MINI_H,0,0,W,MINI_H);}
  if(RMQ){S.run=false;return;}requestAnimationFrame(frame);}
 S.start=()=>{if(S.run)return;S.run=true;S.last=0;requestAnimationFrame(frame);};LIVE.add(S);S.start();return S;}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)LIVE.forEach(s=>{if(s.cv.isConnected)s.start();else LIVE.delete(s);});});
// ---------- แท็บล็อบบี้ ----------
function css(){if(document.getElementById('twCss'))return;const st=document.createElement('style');st.id='twCss';st.textContent=`
.tw-wrap{position:relative;max-width:576px;margin:8px auto 0;border:1px solid var(--line,#2c3a36);border-radius:8px;overflow:hidden;background:#0e1513}
.tw-cv{display:block;width:100%;height:auto;image-rendering:pixelated;cursor:pointer;touch-action:manipulation}
.tw-pop{position:absolute;z-index:2;max-width:min(230px,calc(100% - 8px));padding:6px 9px;border-radius:8px;background:rgba(14,21,19,.95);border:1px solid var(--gold,#f4bb4a);font-size:12.5px;line-height:1.5;pointer-events:none}
.tw-pop .rk{display:inline-block;padding:0 5px;border-radius:4px;color:#111;font-size:11px;margin-right:4px}
.tw-note{margin:8px 0 0;padding:6px 10px;border-radius:6px;border:1px dashed var(--line,#2c3a36);text-align:center;font-size:13px;color:var(--muted,#a3b5ad)}
.tw-bld{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px;margin-top:10px}
.tw-bld .mt-btn{margin:0;text-align:left;min-height:38px}.tw-bld .mt-btn small{display:block;font-size:11px;color:var(--dim,#8aa39a)}
.tw-mini{flex:1 1 100%;display:block;position:relative;width:100%;max-width:420px;padding:0;border:1px solid var(--line,#2c3a36);border-radius:8px;overflow:hidden;background:#0e1513;cursor:pointer;color:inherit;font:inherit}
.tw-mini canvas{display:block;width:100%;height:auto;max-height:110px;image-rendering:pixelated}
.tw-mini span{position:absolute;left:6px;bottom:5px;padding:1px 7px;border-radius:5px;background:rgba(10,14,16,.78);font-size:12px}
.tw-mini:focus-visible{outline:2px solid var(--focus,#ffd76a);outline-offset:2px}`;document.head.appendChild(st);}
const tabOf=id=>document.querySelector(`#metaDlg .mt-tabs [data-t="${id}"]`);
function render(el,P){css();const hd=P.roster.find(m=>m.id===P.head),dec=decorOf(P);
 el.innerHTML=`<p class="mt-dim" style="margin:0">ลานหน้าบ้านของตระกูล คนในตระกูลกับสัตว์เลี้ยงมาเดินเล่นกันที่นี่ แตะใครก็ได้เพื่อดูว่าเป็นใคร แตะอาคารเพื่อไปทำธุระ</p>
 <div class="tw-wrap"><canvas class="tw-cv" width="${W}" height="${H}" role="img" aria-label="ลานหน้าบ้านตระกูล มีสมาชิก ${P.roster.length} คน สัตว์เลี้ยง ${P.pets.length} ตัว"></canvas><div class="tw-pop" hidden></div></div>
 ${hd?'':`<p class="tw-note">🗿 ${P.wins?'ตั้งผู้พิชิตยอดหอเป็นหัวหน้าตระกูลได้ที่ป้อมทหารรับจ้าง แล้วรูปปั้นจะขึ้นกลางลาน':'ไต่หอให้ถึงชั้น 100 เพื่อหาลูกรักมาเป็นหัวหน้าตระกูล'}</p>`}
 <div class="tw-bld">${BLD.map(b=>{const tb=tabOf(b.id),lk=tb&&tb.classList.contains('lk');return`<button class="mt-btn" type="button" data-go="${b.id}" ${tb?'':'disabled'}>${b.ic} ${esc(b.n)}<small>${!tb?'เร็วๆ นี้':lk?'🔒 ยังเข้าไม่ได้':'แตะเพื่อเข้าไป'}</small></button>`;}).join('')}</div>
 <p class="mt-dim" style="margin:8px 0 0">เดินเล่นอยู่ ${P.roster.length} คน · สัตว์เลี้ยง ${P.pets.length} ตัว · รูปปั้น ${Math.min(P.statues.filter(s=>!hd||s.name!==hd.name).length,ST_SLOT.length)+(hd?1:0)} รูป${dec.length?` · ของตกแต่ง ${Math.min(dec.length,DE_SLOT.length)} ชิ้น`:''}</p>`;
 el.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>M.open(b.dataset.go));
 const cv=el.querySelector('.tw-cv'),pop=el.querySelector('.tw-pop'),S=scene(cv,P);let pt=0;
 const say=(html,px,py)=>{pop.innerHTML=html;pop.hidden=false;const wr=cv.parentNode.getBoundingClientRect(),pw=pop.offsetWidth,ph=pop.offsetHeight;
  pop.style.left=Math.max(4,Math.min(wr.width-pw-4,px-pw/2))+'px';pop.style.top=Math.max(4,py-ph-10<4?py+14:py-ph-10)+'px';clearTimeout(pt);pt=setTimeout(()=>{pop.hidden=true;},3500);};
 cv.addEventListener('click',ev=>{const r=cv.getBoundingClientRect(),k=W/r.width,x=(ev.clientX-r.left)*k,y=(ev.clientY-r.top)*k,px=ev.clientX-r.left,py=ev.clientY-r.top,D=S.D;
  const e=D.ents.slice().sort((p,q)=>q.y-p.y).find(e=>x>=e.x-e.s.w/2-1&&x<=e.x+e.s.w/2+1&&y>=e.y-e.s.h-2&&y<=e.y+1);
  if(e){if(e.k==='p'){const d=(C().PETS||{})[e.p.k]||{n:e.p.k};return say(`<b>${e.p.legend?'✨ ':''}${esc(d.n)}</b><br><span class="mt-dim">สัตว์เลี้ยงจาก ${esc(e.p.from||'')}</span>`,px,py);}
   const m=e.m,rk=m.master?'Master':m.rank,wr=WEAR[e.w];return say(`${rk?`<span class="rk" style="background:${M.rkCol(rk)}">${esc(rk)}</span>`:''}<b>${esc(m.name)}</b>${P.head===m.id?' 👑':''}<br><span class="mt-dim">${m.kind==='merc'?'ลูกจ้าง · ':''}${esc(M.clsN(m.cls))} Lv.${m.lv|0}${wr?' · ใส่'+esc(wr.n):''}</span>`,px,py);}
  const s=D.stat.find(s=>{const h=(s.sc>1?8:5)+16*s.sc;return Math.abs(x-s.x)<=Math.max(8,8*s.sc)&&y>=s.y-h-2&&y<=s.y+1;});if(s)return say(s.info,px,py);
  if(y<BY+2){const b=BLD.find(b=>Math.abs(x-b.x)<=17);if(b){if(tabOf(b.id))return M.open(b.id);return say(`<b>${b.ic} ${esc(b.n)}</b><br><span class="mt-dim">เร็วๆ นี้</span>`,px,py);}}
  pop.hidden=true;});
 grants(P);}
function grants(P){const g=M.grantAch;g('town_open');if(P.roster.length>=10)g('town_10');if(P.statues.length>=3)g('town_st3');if(decorOf(P).length>=6)g('town_decor');if(P.pets.length>=5)g('town_pets');}
M.tab('town',{n:'🏘 ล็อบบี้ตระกูล',o:5,render});
try{window.ACH&&window.ACH.add&&window.ACH.add([
 {id:'town_open',n:'กลับบ้าน',d:'เปิดล็อบบี้ตระกูลเป็นครั้งแรก',icon:'🏘',tier:'bronze'},
 {id:'town_10',n:'ลานคึกคัก',d:'มีคนในตระกูลเดินเล่นในลานครบ 10 คน',icon:'👪',tier:'silver'},
 {id:'town_st3',n:'สวนรูปปั้น',d:'มีรูปปั้นผู้พิชิตยอดหอตั้งอยู่ในลาน 3 รูป',icon:'🗿',tier:'gold'},
 {id:'town_decor',n:'บ้านใครสวยขนาดนี้',d:'วางของตกแต่งในลานครบ 6 ชิ้น',icon:'⛲',tier:'silver'},
 {id:'town_pets',n:'สวนสัตว์ย่อม',d:'มีสัตว์เลี้ยงวิ่งเล่นในลาน 5 ตัว',icon:'🐾',tier:'silver'}]);}catch(e){}
// ---------- พรีวิวบนหน้าเกิด: ต่อท้ายปุ่ม 🏰 ผ่าน META.button/bind (ไม่ต้องแก้ auto.js) ----------
function mini(){css();return`<button type="button" class="tw-mini" id="twMini" aria-label="เข้าล็อบบี้ตระกูล"><canvas width="${W}" height="${MINI_H}"></canvas><span>🏘 ล็อบบี้ตระกูล · แตะเพื่อเข้าไป</span></button>`;}
function bindMini(){const b=document.getElementById('twMini');if(!b||b._tw)return;b._tw=1;b.onclick=()=>M.open('town');scene(b.querySelector('canvas'),M.load(),true);}
const ob=M.button,obd=M.bind;
M.button=function(){return ob.apply(this,arguments)+mini();};
M.bind=function(){obd.apply(this,arguments);try{bindMini();}catch(e){}};
window.TOWN={DECOR,WEAR,mini,bindMini};
})();
