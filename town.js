// town.js — ล็อบบี้ตระกูล: ลานหน้าบ้านพิกเซล รูปปั้นหัวหน้าตระกูล สมาชิก/สัตว์เดินเล่น ของตกแต่ง แฟชั่น อาคารลัดไปแท็บอื่น
// API: window.TOWN = { DECOR:{key:{n,draw(ctx,x,y,t)}}, WEAR:{key:{n,draw(ctx,cx,ty,t)}} }
// DECOR: x,y = กลางฐานของชิ้น · WEAR: cx = กลางหัว, ty = ขอบบนของหัว · t = performance.now()
// อ่าน P.mod.city.decor (key[]), P.mod.fest.wear[memberId] (key), P.mod.hard.statue (0 หิน/1 ทอง/2 รุ้ง)
// และ P.mod.city.jobs ({bldId:[memberId]}: pen = ยืนในคอกสัตว์, งานอื่น = ไม่อยู่ในลาน), CITY.petMood(petId) ถ้ามี
(function(){
'use strict';
if(!window.META)return;
const M=window.META,A=()=>window.ART||{},C=()=>window.CONTENT||{},esc=M.esc;
const W=192,H=160,MINI_Y=42,MINI_H=60;
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
 R(c,x+3,y-18,5,1,'#a060e0');R(c,x+5,y-19,1,3,'#a060e0');R(c,x+2,y-17,1,1,'#a060e0');R(c,x+8,y-17,1,1,'#a060e0');}},
// ของตกแต่งเทศกาลอื่นใน fest.js (ลอยกระทง คริสต์มาส สงกรานต์)
krathong:{n:'กระทงใบตอง',draw(c,x,y,t){const f=fl(t,300,2);R(c,x-8,y-1,16,1,'#4aa0e0');R(c,x-6,y-4,12,3,'#3e7a3a');R(c,x-5,y-5,10,1,'#4f9a46');R(c,x-3,y-8,6,3,'#ffd0e0');R(c,x-1,y-9,2,1,'#ffffff');
 R(c,x+2,y-12,1,4,'#f0e0a0');R(c,x+2,y-13-f,1,1,'#ffb030');}},
skylantern:{n:'โคมลอย',draw(c,x,y,t){const b=fl(t,600,2);R(c,x,y-14,1,14,'#c8c0a8');R(c,x-3,y-23-b,6,8,'#e0702a');R(c,x-2,y-22-b,4,6,'#ffd070');R(c,x-1,y-16-b,2,1,'#ff9a3a');
 const g=c.globalAlpha;c.globalAlpha=g*.15;R(c,x-6,y-26-b,12,13,'#ffd060');c.globalAlpha=g;}},
xmastree:{n:'ต้นคริสต์มาส',draw(c,x,y,t){const f=fl(t,400,2);R(c,x-1,y-3,3,3,'#6a4a2a');R(c,x-7,y-8,15,5,'#2f6e3a');R(c,x-5,y-13,11,5,'#3e7a3a');R(c,x-3,y-17,7,4,'#4f9a46');R(c,x,y-19,1,2,'#ffe060');
 R(c,x-4,y-7,1,1,f?'#ff4a4a':'#ffe060');R(c,x+3,y-11,1,1,f?'#4ab0ff':'#ff4a4a');R(c,x-2,y-14,1,1,f?'#ffe060':'#4ab0ff');}},
snowman:{n:'ตุ๊กตาหิมะ',draw(c,x,y){R(c,x-5,y-7,10,7,'#eef2fa');R(c,x-4,y-8,8,1,'#eef2fa');R(c,x-3,y-13,6,5,'#f4f8ff');R(c,x-3,y-15,6,2,'#22222a');R(c,x-4,y-13,8,1,'#22222a');
 R(c,x-2,y-11,1,1,'#22222a');R(c,x+1,y-11,1,1,'#22222a');R(c,x,y-10,2,1,'#ff8a2a');R(c,x-4,y-8,8,1,'#d0403a');}},
waterbowl:{n:'ขันน้ำพานรอง',draw(c,x,y,t){R(c,x-7,y-2,14,2,'#c8a040');R(c,x-5,y-3,10,1,'#e8c060');R(c,x-5,y-7,10,4,'#c8ccd6');R(c,x-5,y-7,10,1,'#eef2fa');R(c,x-4,y-6,8,1,fl(t,400,2)?'#4aa0e0':'#6ab8f0');
 R(c,x+2,y-9,2,2,'#ff9ab0');}},
// ลอยกระทง: สระบัว ประทีป
lotuspond:{n:'สระบัว',draw(c,x,y,t){const f=fl(t,500,2);R(c,x-10,y-5,20,1,'#7a828c');R(c,x-10,y-4,20,4,'#7a828c');R(c,x-9,y-4,18,3,'#3a86c8');R(c,x-7+f*3,y-3,3,1,'#6ab8f0');
 R(c,x-7,y-2,4,1,'#3e7a3a');R(c,x+4,y-3,3,1,'#3e7a3a');R(c,x-1,y-6,4,2,'#ff9ac0');R(c,x,y-7,2,1,'#ffd0e0');R(c,x,y-4,1,1,'#3e7a3a');R(c,x+5,y-5,2,2,'#ffb0d0');}},
candlerow:{n:'ประทีปดินเผา',draw(c,x,y,t){for(let i=0;i<3;i++){const ix=x-8+i*6,f=fl(t+i*170,240,2);R(c,ix,y-2,4,2,'#a0502a');R(c,ix,y-3,4,1,'#c06a3a');R(c,ix+1,y-4,1,1,'#f0e0a0');
 R(c,ix+1,y-6+f,1,2-f,f?'#ffe060':'#ffb030');const g=c.globalAlpha;c.globalAlpha=g*.14;R(c,ix-2,y-8,6,6,'#ffd060');c.globalAlpha=g;}}},
// คริสต์มาสและปีใหม่: กองของขวัญ พลุ
giftpile:{n:'กองของขวัญ',draw(c,x,y){R(c,x-9,y-7,8,7,'#d0302a');R(c,x-6,y-7,2,7,'#ffe060');R(c,x-9,y-5,8,1,'#ffe060');R(c,x,y-6,8,6,'#2f8a3a');R(c,x+3,y-6,1,6,'#f4f4f4');R(c,x,y-4,8,1,'#f4f4f4');
 R(c,x-5,y-12,7,5,'#3a6ad0');R(c,x-2,y-12,1,5,'#ffe060');R(c,x-4,y-14,2,2,'#ffe060');R(c,x-1,y-14,2,2,'#ffe060');}},
fireworks:{n:'พลุฉลองปีใหม่',draw(c,x,y,t){R(c,x-2,y-6,4,6,'#5a3a22');R(c,x-2,y-6,4,1,'#8a5a32');R(c,x-1,y-3,2,1,'#d0302a');
 const p=(t%2200)/2200,col=['#ffe060','#ff6a8a','#6ad0ff'][Math.floor(t/2200)%3];
 if(p<.35)R(c,x,y-7-p/.35*20,1,2,'#fff4c0');else if(p<.9){const r=Math.round(2+(p-.35)/.55*7),g=c.globalAlpha;c.globalAlpha=g*(1-(p-.35)/.55*.7);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;R(c,x+Math.cos(a)*r,y-27+Math.sin(a)*r,1,1,col);}R(c,x,y-27,1,1,'#ffffff');c.globalAlpha=g;}}},
// สงกรานต์: โอ่งมังกร เจดีย์ทราย ตุง
dragonjar:{n:'โอ่งมังกร',draw(c,x,y,t){R(c,x-4,y-1,8,1,'#5a2a10');R(c,x-6,y-9,12,8,'#7a3a1a');R(c,x-5,y-11,10,2,'#7a3a1a');R(c,x-3,y-12,6,1,'#9a5a2a');R(c,x-2,y-12,4,1,fl(t,450,2)?'#4aa0e0':'#6ab8f0');
 [[-4,-7],[-2,-6],[0,-7],[2,-6]].forEach(([dx,dy])=>R(c,x+dx,y+dy,2,1,'#e8b440'));R(c,x+4,y-7,1,1,'#ff4a2a');R(c,x-5,y-10,1,4,'#9a5a2a');}},
sandpagoda:{n:'เจดีย์ทราย',draw(c,x,y,t){R(c,x-7,y-3,14,3,'#c8b078');R(c,x-5,y-6,10,3,'#d8c088');R(c,x-3,y-9,6,3,'#e0c890');R(c,x-1,y-13,2,4,'#e8d098');R(c,x,y-14,1,1,'#f0e0a8');
 R(c,x-4,y-5,1,1,'#ff6a8a');R(c,x+3,y-5,1,1,'#ffd040');R(c,x+1,y-21,1,8,'#c8c0a8');R(c,x+2,y-21,3,2+fl(t,300,2),'#ff6a8a');}},
tung:{n:'ตุงล้านนา',draw(c,x,y,t){const w=fl(t,350,2);R(c,x,y-24,1,24,'#8a5a32');R(c,x-3,y-24,7,1,'#8a5a32');R(c,x-3,y-23,5,15,'#d0403a');
 for(let i=0;i<4;i++)R(c,x-3,y-21+i*4,5,1,'#ffe060');R(c,x-2,y-8,1,2+w,'#d0403a');R(c,x,y-8,1,3-w,'#d0403a');R(c,x-2,y-19,1,1,'#ffffff');R(c,x,y-15,1,1,'#ffffff');}}};
function decorDraw(c,k,x,y,t){const d=DECOR[k];if(d)return d.draw(c,x,y,t);R(c,x-5,y-8,10,8,'#8a6a4a');R(c,x-5,y-8,10,1,'#b08a5a');R(c,x-1,y-8,2,8,'#6a4a2a');}
// ---------- แฟชั่นทับหัว (fest.js อ้างชื่อไทยจากที่นี่ได้) ----------
const WEAR={
wizhat:{n:'หมวกพ่อมด',draw(c,x,y){R(c,x-5,y-1,10,2,'#2e4d8a');R(c,x-3,y-4,6,3,'#3b62a8');R(c,x-2,y-7,4,3,'#3b62a8');R(c,x-1,y-9,2,2,'#3b62a8');R(c,x,y-5,1,1,'#ffe060');}},
witchhat:{n:'หมวกแม่มด',draw(c,x,y){R(c,x-6,y-1,12,2,'#1a1424');R(c,x-3,y-4,6,3,'#2a2034');R(c,x-2,y-7,3,3,'#2a2034');R(c,x,y-9,2,2,'#2a2034');R(c,x-3,y-2,6,1,'#a060e0');}},
pumpkinhead:{n:'หัวฟักทอง',draw(c,x,y,t){R(c,x-5,y-1,10,9,'#e07a1a');R(c,x-6,y,12,7,'#e07a1a');R(c,x-1,y-3,2,2,'#4a7a2a');const g=fl(t||0,350,2)?'#ffe060':'#ffb030';
 R(c,x-3,y+2,2,2,g);R(c,x+1,y+2,2,2,g);R(c,x-2,y+5,4,1,g);}},
catears:{n:'หูแมว',draw(c,x,y){[x-5,x+2].forEach(e=>{R(c,e,y-2,3,2,'#2a2a33');R(c,e+1,y-3,1,1,'#2a2a33');R(c,e+1,y-2,1,1,'#ff9ab0');});}},
batwings:{n:'ปีกค้างคาว',draw(c,x,y,t){const f=fl(t||0,300,2);[[-1,x-7],[1,x+6]].forEach(([s,e])=>{R(c,e+(s<0?-3:0),y+5-f,4,3,'#2a1a3a');R(c,e+(s<0?-5:3),y+4-f,3,2,'#2a1a3a');R(c,e+(s<0?-4:2),y+8-f,2,1,'#2a1a3a');});}},
crown:{n:'มงกุฎ',draw(c,x,y){R(c,x-4,y-2,8,2,'#f4bb4a');R(c,x-4,y-4,1,2,'#f4bb4a');R(c,x-1,y-4,2,2,'#f4bb4a');R(c,x+3,y-4,1,2,'#f4bb4a');R(c,x-1,y-2,1,1,'#e0302a');}},
// แฟชั่นเทศกาลอื่น: มาลัย/สไบ (ลอยกระทง) หมวกซานต้า/เขากวาง (คริสต์มาส) เสื้อลายดอก/แว่นกันแดด (สงกรานต์)
jasmine:{n:'มาลัยดอกมะลิ',draw(c,x,y){R(c,x-5,y+7,10,1,'#f4f4ec');R(c,x-4,y+8,8,1,'#f4f4ec');[-4,-1,2].forEach(d=>R(c,x+d,y+8,1,1,'#ffd040'));R(c,x-1,y+9,2,2,'#d0405a');}},
sabai:{n:'ผ้าสไบทอง',draw(c,x,y){for(let i=0;i<6;i++)R(c,x-4+i*1.5,y+7+i,2,1,'#e8b440');R(c,x+4,y+12,2,2,'#c8901a');}},
santahat:{n:'หมวกซานต้า',draw(c,x,y){R(c,x-5,y-1,10,2,'#f4f4f4');R(c,x-4,y-4,8,3,'#d0302a');R(c,x-2,y-6,5,2,'#d0302a');R(c,x+2,y-7,2,1,'#d0302a');R(c,x+4,y-8,2,2,'#f4f4f4');}},
antlers:{n:'เขากวางเรนเดียร์',draw(c,x,y){[[-1,x-4],[1,x+3]].forEach(([s,e])=>{R(c,e,y-5,1,5,'#8a5a32');R(c,e+s,y-4,1,1,'#8a5a32');R(c,e+2*s,y-5,1,2,'#8a5a32');R(c,e,y-6,1,1,'#a06a3a');});}},
flowershirt:{n:'เสื้อลายดอก',draw(c,x,y){R(c,x-5,y+9,10,4,'#3aa0c8');[[-4,9],[0,10],[3,9],[-2,12],[2,12]].forEach(([dx,dy])=>R(c,x+dx,y+dy,1,1,dy%2?'#ffd040':'#ff6a8a'));}},
sunglasses:{n:'แว่นกันแดด',draw(c,x,y){R(c,x-4,y+3,3,2,'#14141a');R(c,x+1,y+3,3,2,'#14141a');R(c,x-1,y+3,2,1,'#14141a');R(c,x-3,y+3,1,1,'#6a7a8a');R(c,x+2,y+3,1,1,'#6a7a8a');}},
// ลอยกระทง: ชฎา ดอกบัวทัดหู กระทงบนหัว หิ่งห้อย
chada:{n:'ชฎาทอง',draw(c,x,y){R(c,x-4,y-1,8,2,'#e8b440');R(c,x-3,y-3,6,2,'#f4bb4a');R(c,x-2,y-6,4,3,'#e8b440');R(c,x-1,y-9,2,3,'#f4bb4a');R(c,x,y-11,1,2,'#ffe08a');
 R(c,x-1,y-2,2,1,'#d0302a');R(c,x-1,y-5,1,1,'#3ac070');R(c,x-6,y,2,4,'#e8b440');R(c,x+4,y,2,4,'#e8b440');R(c,x-6,y+3,1,1,'#a8741a');R(c,x+5,y+3,1,1,'#a8741a');}},
lotuspin:{n:'ดอกบัวทัดหู',draw(c,x,y){R(c,x+3,y,3,2,'#ff9ac0');R(c,x+4,y-1,1,1,'#ffd0e0');R(c,x+6,y+1,1,1,'#ff9ac0');R(c,x+4,y+1,1,1,'#ffe060');R(c,x+3,y+2,2,1,'#3e7a3a');}},
krathonghat:{n:'หมวกกระทง',draw(c,x,y,t){const f=fl(t||0,260,2);R(c,x-5,y-2,10,2,'#3e7a3a');R(c,x-4,y-3,8,1,'#4f9a46');R(c,x-5,y-3,1,1,'#2f5e2c');R(c,x+4,y-3,1,1,'#2f5e2c');
 R(c,x-3,y-5,6,2,'#ffd0e0');R(c,x-1,y-6,2,1,'#ffffff');R(c,x+1,y-8,1,3,'#f0e0a0');R(c,x+1,y-9-f,1,1,'#ffb030');}},
fireflies:{n:'หิ่งห้อยล้อมตัว',draw(c,x,y,t){t=t||0;for(let i=0;i<4;i++){const a=t/700+i*1.57,on=fl(t+i*230,320,3);if(!on)continue;R(c,x+Math.cos(a)*8,y+5+Math.sin(a*1.3)*6,1,1,i%2?'#d8ff6a':'#fff6a0');}}},
// คริสต์มาสและปีใหม่: ผ้าพันคอ ที่ปิดหู หมวกเอลฟ์ หมวกปาร์ตี้
scarf:{n:'ผ้าพันคอไหมพรม',draw(c,x,y){R(c,x-5,y+7,10,2,'#d0302a');R(c,x-3,y+7,1,2,'#f4f4f4');R(c,x+1,y+7,1,2,'#f4f4f4');R(c,x+2,y+9,2,3,'#d0302a');R(c,x+2,y+11,2,1,'#f4f4f4');}},
earmuffs:{n:'ที่ปิดหูขนฟู',draw(c,x,y){R(c,x-4,y-2,8,1,'#8a8a9a');R(c,x-5,y-1,1,2,'#8a8a9a');R(c,x+4,y-1,1,2,'#8a8a9a');R(c,x-7,y+1,3,4,'#f4f4f4');R(c,x+4,y+1,3,4,'#f4f4f4');R(c,x-6,y+2,1,2,'#ff9ab0');R(c,x+5,y+2,1,2,'#ff9ab0');}},
elfhat:{n:'หมวกเอลฟ์',draw(c,x,y,t){R(c,x-5,y-1,10,2,'#d0302a');R(c,x-4,y-4,8,3,'#2f8a3a');R(c,x-2,y-6,5,2,'#2f8a3a');R(c,x+2,y-7,3,1,'#2f8a3a');R(c,x+5,y-8,1,2,'#2f8a3a');
 R(c,x+5,y-6+fl(t||0,400,2),2,2,'#ffe060');R(c,x-3,y-3,1,1,'#4fb05a');}},
partyhat:{n:'หมวกปาร์ตี้ปีใหม่',draw(c,x,y,t){t=t||0;R(c,x-3,y-2,6,2,'#a040c0');R(c,x-2,y-4,4,2,'#ffe060');R(c,x-1,y-6,2,2,'#a040c0');R(c,x-1,y-8,2,2,'#ff4a8a');
 const k=fl(t,300,4);R(c,x-5+k,y-6-k%2,1,1,['#ffe060','#6ad0ff','#ff6a8a','#9aff7a'][k]);R(c,x+4-k,y-8+k%2,1,1,['#6ad0ff','#ff6a8a','#9aff7a','#ffe060'][k]);}},
// สงกรานต์: ปืนฉีดน้ำ ดินสอพอง หมวกสาน ผ้าขาวม้า
watergun:{n:'ปืนฉีดน้ำ',draw(c,x,y,t){const f=fl(t||0,150,4);R(c,x+5,y+9,5,2,'#ff8a2a');R(c,x+5,y+11,2,2,'#ff8a2a');R(c,x+6,y+8,3,1,'#4ab0ff');R(c,x+10,y+9,1,1,'#ffe060');
 R(c,x+12+f*2,y+9+(f>>1),1,1,'#9ad8ff');if(f>1)R(c,x+11+f,y+10,1,1,'#bfe6ff');}},
dinsor:{n:'ดินสอพองแต้มหน้า',draw(c,x,y){[[-3,4],[2,5],[-1,2],[1,6],[-2,6],[3,3]].forEach(([dx,dy])=>R(c,x+dx,y+dy,1,1,'#f4f4ec'));}},
strawhat:{n:'หมวกสาน',draw(c,x,y){R(c,x-7,y-1,14,2,'#d8b850');R(c,x-4,y-4,8,3,'#e8c868');R(c,x-3,y-5,6,1,'#e8c868');R(c,x-4,y-2,8,1,'#d0403a');
 [-6,-2,2,6].forEach(d=>R(c,x+d,y,1,1,'#a88a30'));R(c,x-2,y-4,1,1,'#c8a848');R(c,x+1,y-4,1,1,'#c8a848');}},
phakhaoma:{n:'ผ้าขาวม้าคาดหัว',draw(c,x,y){R(c,x-5,y,10,2,'#3a6ad0');[[-4,0],[-1,1],[2,0],[-3,1],[3,1]].forEach(([dx,dy],i)=>R(c,x+dx,y+dy,1,1,i%2?'#f4f4f4':'#d0403a'));
 R(c,x+5,y,2,1,'#3a6ad0');R(c,x+6,y+1,1,3,'#3a6ad0');R(c,x+7,y+2,1,2,'#d0403a');}}};
// ---------- ผังลาน ----------
// แถวบน: ป้อม/ประตูดันเจี้ยน/ร้านเทศกาล · กลาง: น้ำพุ + รูปปั้นหัวหน้าตระกูล · ซ้าย: กระดานเควส · ขวา: ลานฝึก · ล่าง: คอกสัตว์เลี้ยง
const BY=46,FX=96,FY=88,PEN={x0:50,y0:120,x1:142,y1:156};
// r = กรอบแตะ [x0,y0,x1,y1] · tab = แท็บที่เปิด · focus = ส่งต่อให้ CITY.focus
const BLD=[{id:'clan',tab:'merc',n:'ป้อมทหารรับจ้าง',ic:'🛡',x:30,r:[14,0,46,BY]},
 {id:'hard',tab:'hard',n:'ประตูดันเจี้ยน',ic:'🌀',x:96,r:[80,6,112,BY]},
 {id:'fest',tab:'fest',n:'ร้านเทศกาล',ic:'🎃',x:162,r:[146,14,178,BY]},
 {id:'quest',tab:'quest',n:'กระดานเควส',ic:'📜',x:22,y:90,r:[7,58,37,91]},
 {id:'train',tab:'train',n:'ลานฝึก (ฟาร์มเวล)',ic:'🎯',x:170,y:90,r:[153,64,188,91]},
 {id:'pen',tab:'city',focus:'pen',n:'ลานฝึกสัตว์เลี้ยง',ic:'🐾',r:[PEN.x0-2,PEN.y0-12,PEN.x1+2,PEN.y1+2]}];
function bldDraw(c,id,x,y){
 if(id==='clan'){R(c,x-10,y-30,20,30,'#7a6a5a');for(let i=0;i<4;i++)R(c,x-10+i*6,y-33,3,3,'#7a6a5a');for(let r=0;r<5;r++)R(c,x-10,y-26+r*6,20,1,'#5e5044');
  R(c,x-4,y-12,8,12,'#3a2414');R(c,x-4,y-12,8,1,'#5a3a22');R(c,x-2,y-24,4,5,'#1a1424');R(c,x,y-42,1,9,'#c8c0a8');R(c,x-15,y-11,6,7,'#3a5aa8');R(c,x-13,y-9,2,3,'#f4bb4a');}
 else if(id==='quest'){R(c,x-12,y-18,2,18,'#5a3a22');R(c,x+10,y-18,2,18,'#5a3a22');R(c,x-13,y-26,26,14,'#8a5a32');R(c,x-13,y-26,26,1,'#b07a42');R(c,x-15,y-29,30,3,'#a0402a');
  R(c,x-10,y-23,5,6,'#f0e8d0');R(c,x-3,y-24,5,5,'#fff4c0');R(c,x+4,y-22,6,6,'#f0e8d0');R(c,x-8,y-23,1,1,'#d0403a');R(c,x-1,y-24,1,1,'#d0403a');R(c,x+6,y-22,1,1,'#d0403a');}
 else if(id==='hard'){R(c,x-15,y-34,30,34,'#5a6068');for(let i=0;i<5;i++)R(c,x-15+i*6.5,y-37,4,3,'#5a6068');for(let r=0;r<5;r++)R(c,x-15,y-30+r*7,30,1,'#454a52');
  R(c,x-8,y-24,16,24,'#140c20');R(c,x-6,y-26,12,2,'#140c20');R(c,x-13,y-20,2,5,'#6a4a2a');R(c,x+11,y-20,2,5,'#6a4a2a');}
 else if(id==='train'){R(c,x-1,y-20,2,16,'#6a4a2a');R(c,x-6,y-16,12,2,'#6a4a2a');R(c,x-3,y-23,6,6,'#d8b878');R(c,x-2,y-15,4,8,'#c8a868');
  R(c,x+8,y-18,7,7,'#e8e0d0');R(c,x+9,y-17,5,5,'#d0403a');R(c,x+10,y-16,3,3,'#e8e0d0');R(c,x+11,y-15,1,1,'#d0403a');R(c,x+11,y-11,1,11,'#6a4a2a');
  R(c,x-15,y-9,7,5,'#d8b850');R(c,x-15,y-7,7,1,'#a88a30');
  R(c,x-16,y-6,32,1,'#8a5a32');R(c,x-16,y-3,32,1,'#8a5a32');for(let i=0;i<7;i++)R(c,x-16+i*5,y-8,1,8,'#6a4a2a');}
 else if(id==='fest'){R(c,x-14,y-14,28,14,'#e8e0d0');for(let i=0;i<8;i++)R(c,x-16+i*4,y-20,4,6,i%2?'#ff8a2a':'#a040c0');for(let i=0;i<8;i++)R(c,x-15+i*4,y-14,2,1,i%2?'#ff8a2a':'#a040c0');
  for(let r=0;r<6;r++)R(c,x-1-r*2.6,y-26+r,2+r*5.2,1,'#a040c0');R(c,x,y-29,1,3,'#c8c0a8');R(c,x-4,y-10,8,10,'#2a1424');R(c,x-12,y-6,6,6,'#8a5a32');R(c,x+7,y-5,5,5,'#e07a1a');R(c,x+9,y-6,1,1,'#4a7a2a');}}
// ส่วนที่ขยับของอาคาร: ธงป้อม คบเพลิง ประตูวน
function bldAnim(c,t){const f=fl(t,260,2);R(c,31,BY-42,7,4,'#3a5aa8');R(c,38,BY-41+f,2,3,'#3a5aa8');
 const g=fl(t,140,3);R(c,96-13,BY-23-g%2,2,3,g?'#ffb040':'#ffe080');R(c,96+11,BY-23-(g+1)%2,2,3,g?'#ffe080':'#ffb040');
 const p=(t/90)%22;R(c,96-6,BY-20,12,20,'#2a1440');R(c,96-4+Math.round(Math.sin(t/300)*3),BY-4-p,2,2,'#c070ff');R(c,96+2-Math.round(Math.sin(t/260)*3),BY-4-(p+11)%22,1,1,'#ffb0ff');}
// น้ำพุใหญ่กลางลาน (รูปปั้นหัวหน้าตระกูลตั้งอยู่กลางน้ำ)
function fountainBack(c,t){const cy=FY-2;
 for(let y=-12;y<=14;y++){const yy=Math.min(y,12),hw=Math.round(31*Math.sqrt(Math.max(0,1-(yy/12)**2)));if(!hw)continue;R(c,FX-hw,cy+y,hw*2,1,y>10?'#5e646c':y<-9?'#b4bcc6':'#8a929a');}
 const sh=fl(t,500,4);for(let y=-8;y<=8;y++){const iw=Math.round(27*Math.sqrt(Math.max(0,1-(y/9)**2)));if(iw)R(c,FX-iw,cy+y,iw*2,1,(y+40+sh)%4?'#3a86c8':'#4a98da');}
 if(!RMQ){const k=Math.floor(t/240);for(let i=0;i<5;i++){const a=hsh(k*7+i)*Math.PI*2,r=.4+hsh(k*3+i)*.5;R(c,FX+Math.cos(a)*24*r,cy+Math.sin(a)*7*r,2,1,'#bfe6ff');}}}
function fountainJets(c,t){if(RMQ)return;const cy=FY-2;
 for(let j=0;j<6;j++){const p=((t/70+j*3.4)%20)/20,s=j%2?1:-1,x=FX+s*(23-p*11),y=cy-1-Math.sin(p*Math.PI)*12+(j>3?4:0);R(c,x,y,1,1,'#9ad8ff');if(p>.85)R(c,x,cy+(j>3?4:0),2,1,'#d8f0ff');}}
// คอกสัตว์เลี้ยง: รั้วหลัง/ข้างอยู่ในฉากนิ่ง รั้วหน้าวาดทับตัวที่อยู่ในคอก
function penBack(c){const{x0,y0,x1,y1}=PEN,w=x1-x0;R(c,x0,y0,w,y1-y0,'#5e5034');
 for(let i=0;i<40;i++)R(c,x0+2+Math.floor(hsh(i*11+3)*(w-4)),y0+2+Math.floor(hsh(i*5+9)*(y1-y0-4)),2,1,i%2?'#a88a40':'#7a6a3a');
 [[x0,88],[104,x1]].forEach(([a,b])=>{R(c,a,y0-6,b-a,1,'#a06a3a');R(c,a,y0-3,b-a,1,'#8a5a32');for(let x=a;x<b;x+=8)R(c,x,y0-8,2,9,'#6a4a2a');});
 R(c,x1-2,y0-8,2,9,'#6a4a2a');R(c,86,y0-10,2,11,'#6a4a2a');R(c,104,y0-10,2,11,'#6a4a2a');
 [x0,x1-1].forEach(x=>{R(c,x,y0-6,1,y1-y0+6,'#8a5a32');for(let y=y0;y<y1;y+=9)R(c,x-(x===x0?0:1),y-2,2,6,'#6a4a2a');});
 R(c,108,y0-15,12,7,'#8a5a32');R(c,108,y0-15,12,1,'#b07a42');R(c,113,y0-8,2,4,'#6a4a2a');R(c,112,y0-13,4,3,'#f0e8d0');R(c,111,y0-14,1,1,'#f0e8d0');R(c,116,y0-14,1,1,'#f0e8d0');
 R(c,56,y0+4,10,6,'#d8b850');R(c,56,y0+6,10,1,'#a88a30');R(c,128,y1-10,9,3,'#6a4a2a');R(c,129,y1-10,7,1,'#4aa0e0');}
function penFront(c){const{x0,y1}=PEN,w=PEN.x1-x0;R(c,x0,y1-4,w,1,'#a06a3a');R(c,x0,y1-1,w,1,'#8a5a32');for(let x=x0;x<PEN.x1;x+=8)R(c,x,y1-7,2,8,'#6a4a2a');R(c,PEN.x1-2,y1-7,2,8,'#6a4a2a');}
// ---------- ฉากหลังนิ่ง (วาดครั้งเดียว) ----------
let BG=null;
function bg(){if(BG)return BG;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
 ['#141c30','#1a2440','#22304c','#2c3c58'].forEach((col,i)=>R(c,0,i*4,W,4,col));R(c,0,16,W,4,'#3a4a5e');
 for(let i=0;i<12;i++)R(c,Math.floor(hsh(i*31+7)*W),Math.floor(hsh(i*17+3)*12),1,1,'#e8f0ff');
 for(let x=0;x<W;x+=2){const h=4+Math.floor(4*(Math.sin(x/17)+1)+hsh(x)*2);R(c,x,22-h,2,h,'#22382c');}
 R(c,0,20,W,26,'#2f4a2e');R(c,0,BY-2,W,8,'#6a5a48');for(let x=0;x<W;x+=5)R(c,x+(x%10?2:0),BY,2,1,'#5a4a3a');
 R(c,0,BY+6,W,H-BY-6,'#3d5a34');
 for(let i=0;i<90;i++){const x=Math.floor(hsh(i*13+1)*W),y=BY+8+Math.floor(hsh(i*7+5)*(H-BY-10));R(c,x,y,1,2,i%3?'#4f7a3a':'#33502c');}
 // ลานหินรอบน้ำพุ + ทางเดินจากถนนลงไปคอก
 const cob=(x,y,w)=>{R(c,x,y,w,1,'#7a7064');for(let i=x;i<x+w;i+=4)if((y+(i>>2))%3===0)R(c,i+(y%2),y,2,1,'#8a8072');else if((i+y)%7===0)R(c,i,y,1,1,'#5e564c');};
 for(let y=62;y<=114;y++){const d=(y-FY)/26,hw=Math.round(60*Math.sqrt(Math.max(0,1-d*d)));if(hw)cob(FX-hw,y,hw*2);}
 for(let y=BY+6;y<64;y++)cob(FX-7,y,14);for(let y=112;y<PEN.y0;y++)cob(FX-8,y,16);
 penBack(c);[0,1,2].forEach(i=>bldDraw(c,BLD[i].id,BLD[i].x,BY));return BG=cv;}
// ---------- สไปรต์ ----------
function spOf(m){const a=A();try{return m.kind==='merc'?a.compSpr({n:m.name,cls:m.cls,tr:m.tr}):a.heroSpr(m.cls||'war',m.look||{form:m.form||'human',seed:m.name});}catch(e){try{return a.heroSpr('npc');}catch(e2){return null;}}}
function petSp(k){const P=A().PSPR||{};return P[k]||P.slime||null;}
// head = first row with a body pixel (lowercase key); class hats use uppercase keys
function headRow(s){if(s._hr!=null)return s._hr;let i=0;while(i<s.h-1&&!/[a-z]/.test(s.rows[i]))i++;return s._hr=i;}
// the clan head's statue wears the crown instead of a class hat
function noHat(s){if(!s)return s;const hr=headRow(s);if(!hr)return s;return Object.assign({},s,{id:(s.id||'')+'~nh',rows:s.rows.map((r,i)=>i<hr?'.'.repeat(r.length):r),_hr:hr,_tw:hr});}
// แฟชั่นบนหัว: ถอดหมวกอาชีพ (ตัวพิมพ์ใหญ่ถึงแถวใต้ขอบหัว เฉพาะช่วงกว้างของหัว) ก่อนใส่ หมวกจะได้ไม่ซ้อนหมวก อาวุธข้างตัวยังอยู่
const HAT=new Set(['wizhat','witchhat','pumpkinhead','catears','crown','chada','krathonghat','santahat','antlers','earmuffs','elfhat','partyhat','strawhat','phakhaoma']);
// แฟชั่นที่ลำตัว: สไลม์หัวอยู่ต่ำ ยึดตำแหน่งไม่ให้หลุดใต้ตัว
const BODY=new Set(['jasmine','sabai','scarf','flowershirt','watergun','batwings','fireflies']);
function bare(s){if(!s||s._bare)return s&&s._bare;const hr=headRow(s),r1=s.rows[Math.min(s.h-1,hr+1)]||'';let lo=r1.search(/[a-z]/),hi=r1.length-1;while(hi>=0&&!/[a-z]/.test(r1[hi]))hi--;
 if(lo<0)return s._bare=s;lo=Math.max(0,lo-2);
 const rows=s.rows.map((r,i)=>i>hr+1?r:r.replace(/[A-Z]/g,(ch,j)=>j>=lo&&j<=hi?'.':ch));
 return s._bare=Object.assign({},s,{id:(s.id||'')+'~bh',rows,_hr:hr,_tw:null,_bare:null});}
function wearY(s,k){const hr=headRow(s);return BODY.has(k)?Math.min(hr,s.h-13):hr;}
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
function drawStatue(c,s,x,yb,sc,mat,t,seed,rg){const pc=PED[mat]||PED[0],pw=sc>1?24:16,ph=sc>1?9:5;
 R(c,x-pw/2,yb-ph,pw,ph,pc[0]);R(c,x-pw/2,yb-ph,pw,1,pc[1]);R(c,x-pw/2-1,yb-1,pw+2,1,pc[2]);if(sc>1)R(c,x-pw/2+3,yb-ph+3,pw-6,2,pc[2]);
 const top=yb-ph;if(!s){const g=c.globalAlpha;c.globalAlpha=g*(.18+.08*Math.sin(t/500));R(c,x-5,top-16*sc/2,10,16*sc/2,'#e8f0ff');R(c,x-3,top-16*sc/2-6,6,6,'#e8f0ff');c.globalAlpha=g;return;}
 const cv=statueCv(s,mat),dw=s.w*sc,dh=s.h*sc,sm=c.imageSmoothingEnabled;c.imageSmoothingEnabled=false;c.drawImage(cv,Math.round(x-dw/2),Math.round(top-dh),dw,dh);c.imageSmoothingEnabled=sm;
 if(rg){const u=sc,hx=Math.round(x),hy=Math.round(top-dh+(headRow(s)+1.5)*sc),cg=mat===2?`hsl(${Math.floor(t/20)%360},80%,62%)`:'#f4bb4a',cd=mat===2?'#b04ad0':'#a8741a';
  // crown: band + three points with a gem; sword: blade raised at the right hand
  R(c,hx-4*u,hy-2*u,8*u,2*u,cg);R(c,hx-4*u,hy-4*u,u,2*u,cg);R(c,hx-u/2,hy-5*u,u,3*u,cg);R(c,hx+3*u,hy-4*u,u,2*u,cg);R(c,hx-4*u,hy-u,8*u,u,cd);R(c,hx-u/2,hy-2*u,u,u,'#ff5a7a');
  const sx=Math.round(x+dw/2-2*u),sy=Math.round(top-dh*.55),bl=mat===1?'#ffe9a8':mat===2?'#eef2fa':'#c8d0d8';
  R(c,sx,sy-12*u,u,12*u,bl);R(c,sx+u,sy-11*u,u/2,10*u,'rgba(255,255,255,.6)');R(c,sx-2*u,sy,5*u,u,cd);R(c,sx,sy+u,u,3*u,'#5a3a1a');R(c,sx,sy+4*u,u,u,cg);}
 if(mat&&!RMQ){const k=Math.floor(t/280)+seed;if(hsh(k)<.6){const lx=Math.floor(x-dw/2+hsh(k*3+1)*dw),ly=Math.floor(top-dh+hsh(k*5+2)*dh);R(c,lx,ly,1,1,'#ffffff');R(c,lx-1,ly,1,1,'rgba(255,255,255,.5)');R(c,lx+1,ly,1,1,'rgba(255,255,255,.5)');}}}
// ---------- ข้อมูลฉาก ----------
const ST_SLOT=[[52,68],[140,68],[42,110],[150,110],[10,114],[182,114]];
// ครบ DECOR_MAX 16 ของ city.js · เว้นมุมล่างที่ปุ่ม HUD บัง (จอมือถือปุ่มกินพื้นที่มากกว่า) หลังกระดานเควส/ลานฝึก ร้านเทศกาล และแท่นรูปปั้น ST_SLOT
const DE_SLOT=[[8,62],[184,62],[42,60],[136,60],[70,60],[122,60],[6,100],[186,100],[24,130],[156,132],[36,152],[152,152],[64,104],[128,104],[58,92],[134,92]];
function mat(P){const v=((P.mod||{}).hard||{}).statue;return v===1||v===2?v:0;}
function wearOf(P,id){const w=((P.mod||{}).fest||{}).wear;return w&&typeof w==='object'?w[id]:'';}
function decorOf(P){const d=((P.mod||{}).city||{}).decor;return Array.isArray(d)?d.filter(k=>typeof k==='string'):[];}
// งานจาก city.js: P.mod.city.jobs = {bldId:[memberId]} · คอกสัตว์ = 'pen' ยืนในคอก · งานอื่นไม่อยู่ในลาน
function jobsOf(P){const j=((P.mod||{}).city||{}).jobs,pen=new Set(),busy=new Set();if(j&&typeof j==='object')for(const k in j)if(Array.isArray(j[k]))j[k].forEach(id=>(k==='pen'?pen:busy).add(id));
 pen.forEach(id=>busy.delete(id));return{pen,busy};}
function petMood(id){try{const m=window.CITY&&window.CITY.petMood&&window.CITY.petMood(id);if(typeof m==='number')return{e:m>=80?'😄':m>=55?'🙂':m>=35?'😐':'😣',n:`อารมณ์ ${m}/100`};if(!m)return null;if(typeof m==='string')return{e:m,n:''};return{e:m.e||m.emoji||m.icon||'',n:m.n||m.t||m.text||''};}catch(e){return null;}}
// ความรู้สึกสัตว์: CITY.petMood ให้เลข 0-100 (หรือสตริง/อ็อบเจกต์จากเวอร์ชันอื่น) → อีโมจิ + ประโยคสั้นๆ
const MOOD=[[80,'😄',n=>`${n}กำลังอารมณ์ดี วิ่งเล่นไม่หยุด`],[60,'🙂',n=>`${n}นอนอาบแดดข้างกองฟาง ดูสบายใจ`],[35,'😐',n=>`${n}เริ่มเบื่อ อยากให้ใครมาเล่นด้วย`],[-1,'😢',n=>`${n}งอนอยู่มุมคอก รอขนมอยู่`]];
function moodLine(p,n){let v=null;try{v=window.CITY&&window.CITY.petMood&&window.CITY.petMood(p.id);}catch(e){}const dft={e:'🙂',t:`${n}เดินเล่นอยู่ในคอก`};
 if(typeof v==='number'&&isFinite(v)){const r=MOOD.find(x=>v>=x[0]);return{e:r[1],t:r[2](n)};}
 if(typeof v==='string'&&v)return{e:v,t:dft.t};if(v&&typeof v==='object')return{e:v.e||v.emoji||v.icon||dft.e,t:v.n||v.t||v.text||dft.t};return dft;}
const rnd=(a,b)=>a+Math.random()*(b-a);
// พื้นที่เดินในลาน: เว้นน้ำพุ กระดานเควส ลานฝึก และไม่ลงไปแถวคอก
function okPlaza(x,y){return((x-FX)/40)**2+((y-FY+2)/19)**2>=1&&!(x<40&&y<94)&&!(x>150&&y<94);}
function pick(e){let tx,ty;if(e.pen){e.q=[{x:rnd(PEN.x0+8,PEN.x1-8),y:rnd(PEN.y0+8,PEN.y1-4)}];return;}
 for(let i=0;i<12;i++){tx=rnd(10,182);ty=rnd(64,112);if(okPlaza(tx,ty))break;}
 // ข้ามฝั่งน้ำพุ: อ้อมใต้น้ำพุก่อน
 e.q=(e.x<FX)!==(tx<FX)?[{x:FX+rnd(-12,12),y:rnd(108,113)},{x:tx,y:ty}]:[{x:tx,y:ty}];}
function build(P){const hd=P.roster.find(m=>m.id===P.head),mt=mat(P),ents=[],stat=[],J=jobsOf(P);
 stat.push({s:hd?noHat(spOf(hd)):null,x:FX,y:FY,sc:2,rg:1,info:hd?`<b>👑 ${esc(hd.name)}</b><br><span class="mt-dim">รูปปั้นหัวหน้าตระกูลกลางน้ำพุ${mt===1?' (ทอง)':mt===2?' (รุ้ง)':''}</span>`:`<b>แท่นกลางน้ำพุยังว่างอยู่</b><br><span class="mt-dim">${P.wins?'ตั้งผู้พิชิตยอดหอเป็นหัวหน้าตระกูลได้ที่ปุ่มคนในตระกูล 🧑 มุมขวาล่าง':'ไต่หอให้ถึงชั้น 100 เพื่อหาลูกรักมาเป็นหัวหน้าตระกูล'}</span>`});
 P.statues.filter(s=>!hd||s.name!==hd.name).slice(-ST_SLOT.length).reverse().forEach((s,i)=>{let sp=null;try{sp=A().heroSpr(s.cls||'war',{form:'human',seed:s.name});}catch(e){}
  stat.push({s:sp,x:ST_SLOT[i][0],y:ST_SLOT[i][1],sc:1,info:`<b>🗿 ${esc(s.name)}</b><br><span class="mt-dim">${esc(M.clsN(s.cls))} · ผู้พิชิตยอดหอ${s.sec==='f'||s.sec==='s'?' และชั้นลับ':''}</span>`});});
 const spawn=e=>{if(e.pen){e.x=rnd(PEN.x0+8,PEN.x1-8);e.y=rnd(PEN.y0+8,PEN.y1-4);}else{for(let i=0;i<12;i++){e.x=rnd(10,182);e.y=rnd(64,112);if(okPlaza(e.x,e.y))break;}}pick(e);ents.push(e);};
 P.roster.forEach(m=>{if(J.busy.has(m.id))return;const s=spOf(m);if(!s)return;const pen=J.pen.has(m.id);spawn({k:'m',m,s,pen,w:wearOf(P,m.id),sp:pen?rnd(5,8):rnd(9,15),pause:rnd(0,2)});});
 P.pets.forEach(p=>{const s=petSp(p.k);if(s)spawn({k:'p',p,s,pen:true,sp:rnd(10,17),pause:rnd(0,2)});});
 // ยังไม่มีใครในตระกูลมาดูแลคอก: ชาวไร่ประจำคอกยืนเฝ้าแทน
 if(!J.pen.size){let s=null;try{s=A().heroSpr('far',{form:'human',seed:'ชาวไร่'});}catch(e){}if(s)spawn({k:'n',s,pen:true,sp:rnd(4,6),pause:rnd(1,3)});}
 const dec=decorOf(P).slice(0,DE_SLOT.length).map((k,i)=>({k,x:DE_SLOT[i][0],y:DE_SLOT[i][1]}));
 return{ents,stat,dec,mt,J};}
function step(D,dt){D.ents.forEach(e=>{if(e.pause>0){e.pause-=dt;return;}const g=e.q&&e.q[0];if(!g){pick(e);return;}const dx=g.x-e.x,dy=g.y-e.y,d=Math.hypot(dx,dy);
 if(d<1){e.q.shift();if(!e.q.length){e.pause=e.k==='p'?rnd(.5,2.5):e.pen?rnd(2,5):rnd(1,4);pick(e);}return;}const v=Math.min(d,e.sp*dt);e.x+=dx/d*v;e.y+=dy/d*v;if(Math.abs(dx)>.5)e.flip=dx<0;});}
function draw(c,D,t){c.imageSmoothingEnabled=false;c.drawImage(bg(),0,0);bldAnim(c,t);const L=[],a=A();
 L.push({y:FY-14,f:()=>fountainBack(c,t)},{y:FY+.5,f:()=>fountainJets(c,t)},{y:PEN.y1+1,f:()=>penFront(c)});
 BLD.forEach(b=>{if(b.y)L.push({y:b.y,f:()=>bldDraw(c,b.id,b.x,b.y)});});
 D.stat.forEach((s,i)=>L.push({y:s.y,f:()=>drawStatue(c,s.s,s.x,s.y,s.sc,D.mt,t,i*97,s.rg)}));
 D.dec.forEach(d=>L.push({y:d.y,f:()=>decorDraw(c,d.k,d.x,d.y,t)}));
 D.ents.forEach(e=>L.push({y:e.y,f:()=>{const s=e.s,bob=e.pause>0||RMQ?0:fl(t,180,2),x=Math.round(e.x-s.w/2),y=Math.round(e.y-s.h)-bob;
  const wr=e.w&&WEAR[e.w],sb=wr&&HAT.has(e.w)?bare(s):s;
  try{a.blit(c,sb,x,y,{flip:!!e.flip,key:'tw'});}catch(er){R(c,x,y,s.w,s.h,'#888');}
  if(wr){if(e.flip){c.save();c.translate(2*x+s.w,0);c.scale(-1,1);}wr.draw(c,x+Math.floor(s.w/2),y+wearY(s,e.w),t);if(e.flip)c.restore();}
  if(e.k==='p'&&e.p.legend&&!RMQ&&hsh(Math.floor(t/200)+e.x|0)<.4)R(c,x+Math.floor(hsh(Math.floor(t/200))*s.w),y-1,1,1,'#fff6a0');
  if(e.mood&&t<e.mood.until){c.font='9px sans-serif';c.textAlign='center';c.textBaseline='bottom';c.fillText(e.mood.e,x+s.w/2,y+topRow(s)-1);}}}));
 L.sort((p,q)=>p.y-q.y).forEach(o=>o.f());}
// ---------- วงจรวาด (หยุดเมื่อปิดหน้าต่าง/สลับแท็บ/canvas หลุดจากหน้า) ----------
const LIVE=new Set();
function scene(cv,P,mini){const off=mini?document.createElement('canvas'):cv;if(mini){off.width=W;off.height=H;}const c=off.getContext('2d'),D=build(P),S={cv,D,run:false,last:0};
 function frame(now){if(!S.run)return;const dl=cv.closest('dialog');if(!cv.isConnected){S.run=false;LIVE.delete(S);return;}if((dl&&!dl.open)||document.hidden){S.run=false;return;}
  {const cov=document.querySelector('#townGate,#metaDlg[open]');if(cov&&!cov.contains(cv)){requestAnimationFrame(frame);return;}} // hidden under a full-screen window: skip drawing
  if(S.last&&now-S.last<40){requestAnimationFrame(frame);return;} // 25fps พอสำหรับพิกเซลอาร์ต ประหยัดแบตมือถือ
  const dt=S.last?Math.min(.1,(now-S.last)/1000):0;S.last=now;if(!RMQ)step(D,dt);draw(c,D,now);
  if(mini){const m=cv.getContext('2d');m.imageSmoothingEnabled=false;m.drawImage(off,0,MINI_Y,W,MINI_H,0,0,W,MINI_H);}
  if(RMQ){S.run=false;return;}requestAnimationFrame(frame);}
 S.start=()=>{if(S.run)return;S.run=true;S.last=0;requestAnimationFrame(frame);};S.redraw=()=>{if(RMQ&&!S.run)draw(c,D,performance.now());};LIVE.add(S);S.start();return S;}
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
.tw-mini canvas{display:block;width:100%;height:auto;max-height:130px;image-rendering:pixelated}
.tw-mini span{position:absolute;left:6px;bottom:5px;padding:1px 7px;border-radius:5px;background:rgba(10,14,16,.78);font-size:12px}
.tw-mini.nw canvas{filter:grayscale(.6) brightness(.7)}
.tw-mini:focus-visible{outline:2px solid var(--focus,#ffd76a);outline-offset:2px}
.tw-hud{position:absolute;inset:0;z-index:1;pointer-events:none}.tw-hud button,.tw-hud .tw-panel{pointer-events:auto}
.tw-gold{position:absolute;top:3px;right:8px;font-family:var(--fP,'DotGothic16',monospace);font-size:clamp(16px,4.6vw,24px);color:var(--gold,#f4bb4a);text-shadow:0 2px 0 #000,0 0 6px rgba(0,0,0,.9);white-space:nowrap}
.tw-sign{position:absolute;top:1.5%;left:50%;transform:translateX(-50%);max-width:44%;padding:2px 10px;border:2px solid #4a2e16;border-radius:4px;background:#8a5a32;color:#fff4d8;font:inherit;font-size:clamp(11px,2.8vw,15px);line-height:1.25;text-align:center;cursor:pointer;box-shadow:inset 0 1px 0 #b07a42,0 2px 0 rgba(0,0,0,.5)}
.tw-sign b,.tw-sign small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tw-sign small{font-size:.74em;color:#ffd98a}
.tw-bot{position:absolute;bottom:4px;left:50%;transform:translateX(-50%);display:flex;gap:4px}
.tw-gatebtn{padding:2px 8px;border-radius:10px;border:1px solid #a060ff;background:rgba(30,10,50,.8);color:#f0e0ff;font:inherit;font-size:11.5px;white-space:nowrap;cursor:pointer}
.tw-ic{width:42px;height:42px;padding:0;border-radius:10px;border:2px solid var(--line2,#3d5a66);background:rgba(20,28,34,.9);font-size:21px;line-height:1;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.5)}
.tw-bl{position:absolute;left:6px;bottom:6px}.tw-br{position:absolute;right:6px;bottom:6px;display:flex;flex-direction:column;gap:6px}
.tw-hud button:focus-visible{outline:2px solid var(--focus,#ffd76a);outline-offset:2px}
.tw-panel{position:absolute;left:5%;right:5%;top:7%;max-height:86%;overflow-y:auto;z-index:3;padding:10px 12px;border-radius:8px;border:1px solid var(--gold,#f4bb4a);background:rgba(14,21,19,.97);font-size:13px;line-height:1.5}
.tw-ph{display:flex;justify-content:space-between;align-items:center;gap:8px}.tw-x{background:none;border:0;color:inherit;font-size:16px;cursor:pointer;padding:2px 6px}
.tw-pets{list-style:none;margin:6px 0;padding:0}.tw-pets li{display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.06)}.tw-pets .e{font-size:20px;flex:none}
.tw-in{width:100%;box-sizing:border-box;margin:6px 0;padding:6px 8px;border-radius:6px;border:1px solid var(--line,#2c3a36);background:#0b1215;color:inherit;font:inherit;font-size:16px}
#metaDlg .tw-wrap{min-width:min(100%,220px)}
/* ปุ่มบนลานย่อตามขนาดลาน (กว้างราว 10% ของลาน) จะได้ไม่บังรูปปั้นและของตกแต่งตอนลานเล็ก */
.tw-wrap{container-type:inline-size}
.tw-gold{font-size:clamp(13px,6cqw,24px);right:2.5cqw}
.tw-sign{font-size:clamp(10px,3.6cqw,15px)}
.tw-gatebtn{font-size:clamp(10px,3.1cqw,12.5px);padding:.15em .6em}
.tw-bot{bottom:1.5cqw}
.tw-ic{width:clamp(28px,10cqw,44px);height:clamp(28px,10cqw,44px);font-size:clamp(15px,5cqw,22px);border-radius:clamp(7px,2.4cqw,10px)}
.tw-bl{left:1.5cqw;bottom:1.5cqw}
@container (max-width:330px){.tw-gatebtn span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.tw-gatebtn{font-size:14px;padding:2px 7px}}.tw-br{right:1.5cqw;bottom:1.5cqw;gap:1.5cqw}
#metaDlg .tw-bld .mt-btn small,#metaDlg .tw-bld .mt-btn{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-height:760px){#metaDlg .tw-bld .mt-btn small{display:none}#metaDlg .tw-bld .mt-btn{min-height:36px}#metaDlg .tw-bld{margin-top:8px}}
@media (max-height:600px){#metaDlg .tw-lead{display:none}}
/* จอแนวนอนเตี้ยๆ: ลานซ้าย ปุ่มอาคารขวา */
@media (max-height:520px) and (min-width:600px){#metaDlg .tw-tab{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 12px;align-items:start}
#metaDlg .tw-tab>*{grid-column:2}#metaDlg .tw-tab>.tw-wrap{grid-column:1;grid-row:1/span 5;margin:0;min-width:0}#metaDlg .tw-tab .tw-bld{margin-top:0;grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}#metaDlg .tw-tab .tw-note{margin-top:0}}`;document.head.appendChild(st);}
// ถามจาก META ตรงๆ เพราะหน้าเมืองตอนเปิดเกมยังไม่มีหน้าต่าง #metaDlg
const tabOf=id=>M.hasTab?M.hasTab(id):!!document.querySelector(`#metaDlg .mt-tabs [data-t="${id}"]`);
const tabLk=id=>{try{return M.tabLock?!!M.tabLock(id):false;}catch(e){return false;}};
function go(b){M.open(b.tab);if(b.focus)try{window.CITY&&window.CITY.focus&&window.CITY.focus(b.focus);}catch(e){}}
// แตะในฉาก: คน/สัตว์/รูปปั้นขึ้นป้ายบอก อาคารพาไปแท็บนั้น (ใช้ทั้งแท็บล็อบบี้และหน้าเมืองตอนเปิดเกม)
function tapper(cv,pop,S,P,o){let pt=0;
 const say=(html,px,py)=>{pop.innerHTML=html;pop.hidden=false;const wr=cv.parentNode.getBoundingClientRect(),pw=pop.offsetWidth,ph=pop.offsetHeight;
  pop.style.left=Math.max(4,Math.min(wr.width-pw-4,px-pw/2))+'px';pop.style.top=Math.max(4,py-ph-10<4?py+14:py-ph-10)+'px';clearTimeout(pt);pt=setTimeout(()=>{pop.hidden=true;},3500);};
 cv.addEventListener('click',ev=>{const r=cv.getBoundingClientRect(),k=W/r.width,x=(ev.clientX-r.left)*k,y=(ev.clientY-r.top)*k,px=ev.clientX-r.left,py=ev.clientY-r.top,D=S.D;
  const e=D.ents.slice().sort((p,q)=>q.y-p.y).find(e=>x>=e.x-e.s.w/2-1&&x<=e.x+e.s.w/2+1&&y>=e.y-e.s.h-2&&y<=e.y+1);
  if(e){if(e.k==='p'){const d=(C().PETS||{})[e.p.k]||{n:e.p.k},md=moodLine(e.p,d.n);e.mood={e:md.e,until:performance.now()+2500};S.redraw();
    return say(`<b>${e.p.legend?'✨ ':''}${esc(d.n)}</b> ${esc(md.e)}<br><span class="mt-dim">${esc(md.t)} · สัตว์เลี้ยงจาก ${esc(e.p.from||'')}</span>`,px,py);}
   if(e.k==='n')return say('<b>🧑‍🌾 ชาวไร่ประจำคอก</b><br><span class="mt-dim">ส่งคนในตระกูลมาช่วยดูแลสัตว์ได้ที่หน้าบริหารเมือง</span>',px,py);
   const m=e.m,rk=m.master?'Master':m.rank,wr=WEAR[e.w];return say(`${rk?`<span class="rk" style="background:${M.rkCol(rk)}">${esc(rk)}</span>`:''}<b>${esc(m.name)}</b>${P.head===m.id?' 👑':''}<br><span class="mt-dim">${m.kind==='merc'?'ลูกจ้าง · ':''}${esc(M.clsN(m.cls))} Lv.${m.lv|0}${wr?' · ใส่'+esc(wr.n):''}${e.pen?' · ดูแลคอกสัตว์':''}</span>`,px,py);}
  const s=D.stat.find(s=>{const h=(s.sc>1?9:5)+16*s.sc;return Math.abs(x-s.x)<=Math.max(8,8*s.sc)&&y>=s.y-h-2&&y<=s.y+1;});if(s)return say(s.info,px,py);
  const b=BLD.find(b=>x>=b.r[0]&&x<=b.r[2]&&y>=b.r[1]&&y<=b.r[3]);
  if(b){if(o&&o.on&&o.on(b))return;if(b.tab&&tabOf(b.tab))return go(b);return say(`<b>${b.ic} ${esc(b.n)}</b><br><span class="mt-dim">เร็วๆ นี้</span>`,px,py);}
  if(((x-FX)/31)**2+((y-FY+2)/13)**2<1)return say(D.stat[0].info,px,py);
  pop.hidden=true;});
 return S;}
// ---------- ปุ่มมุมจอ ป้ายชื่อตระกูล และหน้าต่างเล็กในห้อง (ใช้ทั้งแท็บล็อบบี้และหน้าเมืองตอนเปิดเกม) ----------
// ชื่อตระกูล: ตั้งเอง (P.clanName) > ฉายาตระกูลจากมังกร (CLAN_T) > สายตระกูลของทายาท (รุ่น 2 ขึ้นไป) > ชื่อหัวหน้าตระกูล > สายตระกูลของฮีโร่รุ่นแรก
function clanT(){try{const T=C().CLAN_T||{},K=window.__auto&&window.__auto.clan&&window.__auto.clan.load();return(K&&T[K.m])||'';}catch(e){return'';}}
function defName(P){const t=clanT();if(t)return t;let hs='',gen=1;try{const h=window.__auto.S.hero;hs=h.house||'';gen=h.gen||1;}catch(e){}
 // ฮีโร่รุ่นแรกที่เพิ่งสุ่มเกิดยังไม่ใช่คนในตระกูล ใช้ชื่อหัวหน้าก่อน ป้ายจะได้ไม่เปลี่ยนทุกครั้งที่สุ่มเกิดใหม่
 const hd=P.roster.find(m=>m.id===P.head);if(hs&&(gen>1||!hd))return'ตระกูล'+hs;return hd?'ตระกูล'+hd.name:'ตระกูลของเรา';}
function clanName(P){const t=clanT();return P.clanName?{n:P.clanName,t}:{n:defName(P),t:''};}
const signHTML=P=>{const cn=clanName(P);return`<b>${esc(cn.n)}</b>${cn.t?`<small>${esc(cn.t)}</small>`:''}`;};
function hudSync(){const P=M.load();document.querySelectorAll('.tw-hud').forEach(dv=>{const g=dv.querySelector('.tw-gold b'),s=dv.querySelector('.tw-sign');if(g)g.textContent=P.gold.toLocaleString();if(s)s.innerHTML=signHTML(P);});}
window.addEventListener('tof:meta-close',()=>{try{hudSync();}catch(e){}});
function panel(pn,title,body){pn.hidden=false;pn.innerHTML=`<div class="tw-ph"><b>${title}</b><button type="button" class="tw-x" aria-label="ปิด">✕</button></div>${body}`;pn.querySelector('.tw-x').onclick=()=>{pn.hidden=true;};}
function nameEdit(pn){const P=M.load(),t=clanT();
 panel(pn,'🪧 ตั้งชื่อตระกูล',`<p class="mt-dim" style="margin:4px 0 0">ชื่อนี้จะขึ้นบนป้ายเหนือลานหน้าบ้าน${t?` ส่วนฉายา "${esc(t)}" ยังอยู่ใต้ชื่อเหมือนเดิม`:''}</p>
 <input type="text" class="tw-in" maxlength="20" autocomplete="off" value="${esc(P.clanName||'')}" placeholder="${esc(defName(P))}" aria-label="ชื่อตระกูล">
 <button type="button" class="mt-btn pri" data-sv>บันทึก</button>${P.clanName?'<button type="button" class="mt-btn" data-rs>กลับไปใช้ชื่อเดิม</button>':''}`);
 const inp=pn.querySelector('input'),done=v=>{const Q=M.load();if(v)Q.clanName=v;else delete Q.clanName;M.save(Q);if(v)M.grantAch('clan_name');pn.hidden=true;hudSync();};
 setTimeout(()=>{try{inp.focus();}catch(e){}},0);
 pn.querySelector('[data-sv]').onclick=()=>done(inp.value.replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,20));
 inp.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();pn.querySelector('[data-sv]').click();}};
 const rs=pn.querySelector('[data-rs]');if(rs)rs.onclick=()=>done('');}
function garden(pn){const P=M.load(),J=jobsOf(P),care=P.roster.filter(m=>J.pen.has(m.id)),PE=C().PETS||{};
 panel(pn,'🐾 คอกสัตว์เลี้ยง',`<p class="mt-dim" style="margin:4px 0 0">สัตว์ในคอก ${P.pets.length} ตัว · ${care.length?'คนดูแล: '+care.map(m=>esc(m.name)).join(', '):'ยังไม่มีคนในตระกูลมาช่วยดูแล มีแต่ชาวไร่ประจำคอก'}</p>
 ${P.pets.length?`<ul class="tw-pets">${P.pets.map(p=>{const d=PE[p.k]||{n:p.k},md=moodLine(p,d.n);return`<li><span class="e" aria-hidden="true">${esc(md.e)}</span><span><b>${p.legend?'✨ ':''}${esc(d.n)}</b><br><span class="mt-dim">${esc(md.t)}</span></span></li>`;}).join('')}</ul>`:'<p class="mt-dim">คอกยังว่างอยู่ สัตว์ที่อยู่กับฮีโร่จนพิชิตยอดหอจะมาวิ่งเล่นที่นี่</p>'}
 <button type="button" class="mt-btn pri" data-gp>🏘 ไปหน้าเมือง ให้ขนมหรือส่งคนมาดูแล</button>`);
 pn.querySelector('[data-gp]').onclick=()=>{pn.hidden=true;go(BLD.find(b=>b.id==='pen'));};}
function shop(){try{if(window.FEST&&window.FEST.active()&&tabOf('fest')&&!tabLk('fest'))return M.open('fest');}catch(e){}
 M.open('city');setTimeout(()=>{const h=[...document.querySelectorAll('#metaDlg h3')].find(x=>x.textContent.indexOf('ร้านของตกแต่ง')>=0);if(h)h.scrollIntoView({block:'start',behavior:'smooth'});},80);}
// o.portal() = ปุ่มกลับไปลงดันเจี้ยน · คืน {on(b)} ให้ tapper ส่งการแตะคอกสัตว์มาที่นี่
function hud(wrap,P,o){o=o||{};css();const dv=document.createElement('div');dv.className='tw-hud';const hardOk=P.unlock&&P.unlock.hard&&tabOf('hard');
 dv.innerHTML=`<div class="tw-gold" aria-label="เหรียญเมือง ${P.gold}"><span aria-hidden="true">🪙</span> <b>${P.gold.toLocaleString()}</b></div>
 <button type="button" class="tw-sign" data-h="sign" title="แตะเพื่อตั้งชื่อตระกูล">${signHTML(P)}</button>
 <div class="tw-bot"><button type="button" class="tw-gatebtn" data-h="gate" title="กลับไปลงดันเจี้ยน">✨<span> กลับไปลงดันเจี้ยน</span></button>${hardOk?'<button type="button" class="tw-gatebtn" data-h="hard" title="โหมดยาก">🌀<span> โหมดยาก</span></button>':''}</div>
 <button type="button" class="tw-ic tw-bl" data-h="trophy" title="ห้องรางวัล" aria-label="ห้องรางวัล: ความสำเร็จ เหรียญตรา โล่รางวัลเควส">🏠</button>
 <div class="tw-br"><button type="button" class="tw-ic" data-h="clan" title="คนในตระกูล" aria-label="คนในตระกูล">🧑</button><button type="button" class="tw-ic" data-h="shop" title="ร้านของตกแต่ง" aria-label="ร้านของตกแต่งเมือง">🛒</button></div>
 <div class="tw-panel" hidden role="dialog" aria-label="รายละเอียด"></div>`;
 wrap.appendChild(dv);const pn=dv.querySelector('.tw-panel'),portal=()=>{if(o.portal)o.portal();};
 const act={sign:()=>nameEdit(pn),gate:portal,hard:()=>M.open('hard'),trophy:()=>M.open(tabOf('trophy')?'trophy':'clan'),clan:()=>M.open('clan'),shop};
 dv.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>act[b.dataset.h]());
 const onB={pen:()=>garden(pn)};return{on(b){const f=onB[b.id];if(!f)return false;f();return true;}};}
// ปุ่มกลับไปลงดันเจี้ยนในแท็บล็อบบี้: ปิดหน้าต่าง (และหน้าเมืองตอนเปิดเกมถ้ายังเปิดอยู่) กลับไปหน้าเกิด/รอบที่เล่นอยู่
function leave(){const d=document.getElementById('metaDlg');if(d&&d.open)d.close();try{window.HIRE&&window.HIRE.closeGate&&window.HIRE.closeGate();}catch(e){}}
function render(el,P){css();const hd=P.roster.find(m=>m.id===P.head),dec=decorOf(P),J=jobsOf(P),inPen=P.roster.filter(m=>J.pen.has(m.id)).length,away=P.roster.filter(m=>J.busy.has(m.id)).length,walk=P.roster.length-inPen-away;
 el.innerHTML=`<div class="tw-tab"><p class="mt-dim tw-lead" style="margin:0">ลานหน้าบ้านของตระกูล แตะใครก็ได้เพื่อดูว่าเป็นใคร แตะอาคารหรือคอกสัตว์เพื่อไปทำธุระ แตะป้ายชื่อด้านบนเพื่อตั้งชื่อตระกูล</p>
 <div class="tw-wrap"><canvas class="tw-cv" width="${W}" height="${H}" role="img" aria-label="ลานหน้าบ้านตระกูล มีน้ำพุกลางลาน คนเดินเล่น ${walk} คน สัตว์เลี้ยงในคอก ${P.pets.length} ตัว"></canvas><div class="tw-pop" hidden></div></div>
 ${hd?'':`<p class="tw-note">🗿 ${P.wins?'ตั้งผู้พิชิตยอดหอเป็นหัวหน้าตระกูลได้ที่ปุ่มคนในตระกูล 🧑 แล้วรูปปั้นจะขึ้นกลางน้ำพุ':'ไต่หอให้ถึงชั้น 100 เพื่อหาลูกรักมาเป็นหัวหน้าตระกูล'}</p>`}
 <div class="tw-bld">${BLD.filter(b=>b.tab).map(b=>{const tb=tabOf(b.tab),lk=tb&&tabLk(b.tab);return`<button class="mt-btn" type="button" data-go="${b.id}" ${tb?'':'disabled'}>${b.ic} ${esc(b.n)}<small>${!tb?'เร็วๆ นี้':lk?'🔒 ยังเข้าไม่ได้':'แตะเพื่อเข้าไป'}</small></button>`.replace('<button ',`<button title="${esc(b.n)}${!tb?' · เร็วๆ นี้':lk?' · ยังเข้าไม่ได้':''}" `);}).join('')}</div>
 <p class="mt-dim" style="margin:8px 0 0">เดินเล่นอยู่ ${walk} คน${inPen?` · ดูแลคอกสัตว์ ${inPen} คน`:''}${away?` · ไปทำงาน ${away} คน`:''} · สัตว์เลี้ยง ${P.pets.length} ตัว · รูปปั้น ${Math.min(P.statues.filter(s=>!hd||s.name!==hd.name).length,ST_SLOT.length)+(hd?1:0)} รูป${dec.length?` · ของตกแต่ง ${Math.min(dec.length,DE_SLOT.length)} ชิ้น`:''}</p></div>`;
 el.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{const d=BLD.find(x=>x.id===b.dataset.go);if(d)go(d);});
 const cv=el.querySelector('.tw-cv');tapper(cv,el.querySelector('.tw-pop'),scene(cv,P),P,hud(el.querySelector('.tw-wrap'),P,{portal:leave}));
 fitTab(el);grants(P);}
// ย่อลานให้ปุ่มอาคารใต้ลานอยู่ในจอเดียวกัน ไม่ต้องเลื่อนลงไปหา (หน้าต่างเตี้ยแค่ไหนก็ยังกว้างอย่างน้อย 220px)
function fitTab(el){const wr=el&&el.querySelector('.tw-wrap'),tb=el&&el.querySelector('.tw-tab');if(!wr||!tb||!wr.isConnected)return;wr.style.maxWidth='';wr.style.width='';
 if(getComputedStyle(tb).display==='grid'){const cs=getComputedStyle(el),ih=el.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom)-2;
  wr.style.width=Math.max(160,Math.min(576,Math.floor(ih*W/H),Math.floor(el.clientWidth*.62)))+'px';return;}
 const over=el.scrollHeight-el.clientHeight;
 if(over>0){const h=wr.getBoundingClientRect().height-over-2;wr.style.maxWidth=Math.max(220,Math.floor(h*W/H))+'px';}}
let fitT=0;window.addEventListener('resize',()=>{clearTimeout(fitT);fitT=setTimeout(()=>{const b=document.querySelector('#metaDlg[open] #metaBody');if(b&&b.querySelector('.tw-tab'))fitTab(b);},120);});
function grants(P){const g=M.grantAch;g('town_open');if(P.roster.length>=10)g('town_10');if(P.statues.length>=3)g('town_st3');if(decorOf(P).length>=6)g('town_decor');if(P.pets.length>=5)g('town_pets');}
M.tab('town',{n:'🏘 ล็อบบี้ตระกูล',o:5,render});
try{window.ACH&&window.ACH.add&&window.ACH.add([
 {id:'town_open',n:'กลับบ้าน',d:'เปิดล็อบบี้ตระกูลเป็นครั้งแรก',icon:'🏘',tier:'bronze',ext:1},
 {id:'town_10',n:'ลานคึกคัก',d:'มีคนในตระกูลครบ 10 คน',icon:'👪',tier:'silver',ext:1},
 {id:'town_st3',n:'สวนรูปปั้น',d:'มีรูปปั้นผู้พิชิตยอดหอตั้งอยู่ในลาน 3 รูป',icon:'🗿',tier:'gold',ext:1},
 {id:'town_decor',n:'บ้านใครสวยขนาดนี้',d:'วางของตกแต่งในลานครบ 6 ชิ้น',icon:'⛲',tier:'silver',ext:1},
 {id:'town_pets',n:'คอกเต็ม',d:'มีสัตว์เลี้ยงวิ่งเล่นในคอก 5 ตัว',icon:'🐾',tier:'silver',ext:1},
 {id:'clan_name',n:'ป้ายนี้ของเรา',d:'ตั้งชื่อตระกูลเองบนป้ายเหนือลาน',icon:'🪧',tier:'bronze',ext:1}]);}catch(e){}
// ---------- พรีวิวบนหน้าเกิด: ต่อท้ายปุ่ม 🏰 ผ่าน META.button/bind (ไม่ต้องแก้ auto.js) ----------
function mini(){css();const nw=!(M.load().runs>0);return`<button type="button" class="tw-mini${nw?' nw':''}" id="twMini" aria-label="${nw?'เมืองแรกของตระกูล จะเปิดหลังจบรอบแรก':'เข้าล็อบบี้ตระกูล'}"><canvas width="${W}" height="${MINI_H}"></canvas><span>${nw?'🏘 เมืองแรก · เปิดหลังไต่หอจบรอบแรก':'🏘 ล็อบบี้ตระกูล · แตะเพื่อเข้าไป'}</span></button>`;}
function bindMini(){const b=document.getElementById('twMini');if(!b||b._tw)return;b._tw=1;b.onclick=()=>M.open('town');scene(b.querySelector('canvas'),M.load(),true);}
const ob=M.button,obd=M.bind;
M.button=function(){return ob.apply(this,arguments)+mini();};
M.bind=function(){obd.apply(this,arguments);try{bindMini();}catch(e){}};
window.TOWN={DECOR,WEAR,W,H,BLD,scene,tapper,hud,hudSync,clanName,go,tabOf,tabLk,css,spOf};
window.TOWN.grants=grants; // gate.js: หน้าเมืองตอนเปิดเกมปลดความสำเร็จของลานแบบเดียวกับแท็บล็อบบี้
})();
