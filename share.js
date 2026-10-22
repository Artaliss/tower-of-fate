// share.js — share a finished life of หอคอยโชคชะตา (adapted from the 1in8b.life share system, see docs/rea/1in8b-rea-v2.md §3)
// - record card 1080x1350 (4:5) PNG
// - bottom share sheet: one-line note, native image share, LINE / X / Threads, copy, save, in-app browser fallback
// - share text built from scored "hooks" within a character budget
// - share link https://tower-of-fate.pages.dev/s/<code>: the run is packed into the path (no database);
//   functions/s/[[path]].js rewrites the og: tags for that link (decode() there must stay identical to the one here)
// - "someone sent you a fate" banner when the game is opened from such a link (/s/<code> or ?s=<code>)
// - birth card (v2.3): openBirth(d) = same sheet with the birth card, link /s/<code> with ver byte 3/4
// - share stats in localStorage tof-share-stat-v1, read with stats()
// API: window.SHARE = { open(d,{auto}), openBirth(d[,{onNote}]), stats(), close(), render(d) -> Promise<canvas>, text(d,mode), url(d), encode(d), decode(code), onPhase(ph), friend }
(function(){
'use strict';
const HOST='tower-of-fate.pages.dev',ORIGIN='https://'+HOST;
const W=1080,H=1350;
const P={paper:'#efe4c8',paper2:'#e4d5b0',card:'#f6eedb',ink:'#2b2118',ink2:'#5c4b39',ink3:'#8b7a62',rule:'#cdb98d',
 band:'#15232a',band2:'#0b1215',gold:'#f4bb4a',gold2:'#9a6418',red:'#a3322a',stamp:'#2f6b5c'};
const fT="'Mitr','Kanit','Noto Sans Thai',system-ui,sans-serif",fP="'DotGothic16','Mitr',monospace";
// append only: the index goes into share codes (3 bits, max 8 classes)
const CLS_IDS=['war','mag','arc','pri','rog','far','dra','dsl','nec','ang'],CLS_N=['นักรบ','จอมเวท','นักธนู','นักบวช','โจร','ชาวไร่','อัศวินมังกร','นักล่ามังกร','เนโครแมนเซอร์','ทูตสวรรค์'];
const RANK_K=['F','E','D','C','B','A','S','SS'];
const MAPC={fight:'#c0503a',treasure:'#e0aa2c',trap:'#8a4ab0',good:'#4fae5a',evil:'#6a1a2a',pet:'#e58bb2',comp:'#3f94d0',boss:'#ff8a2a',warp:'#5fc8d2',flee:'#8a9aa0',calm:'#6f7f84',bad:'#8a6a4a',farm:'#2a6a5a',death:'#14100c'};

// ---------- helpers ----------
function hashStr(s){let h=2166136261>>>0;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
const nf=n=>Number(n||0).toLocaleString('en-US');
const str=v=>v==null?'':String(v);
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));
// Thai combining marks stay with their base letter when text is cut
const MARK=/[ัิ-ฺ็-๎]/;
function graphemes(s){const out=[];for(const ch of Array.from(str(s))){if(out.length&&MARK.test(ch))out[out.length-1]+=ch;else out.push(ch);}return out;}
function clip(s,n){const g=graphemes(s);return g.length>n?g.slice(0,n).join(''):g.join('');}
function cleanNote(s){const n=clip(str(s).replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g,' ').replace(/\s+/g,' ').trim(),120);return crisis(n)?'':n;}
// crisis check (v2.7, keep identical to functions/api/posts.js): wanting to die or hurting oneself. Negations ("ไม่อยากตาย", "don't want to die") are dropped first.
// A line that hits is never put on the card, in the share text or on the wall; the player sees CARE (hotline 1323) instead
const CR_SQ=/[\s\-_.,!?*~'"()[\]{}|/\\:;ๆ]+/g,CR_NEG_TH=/ไม่(ได้|เคย)?อยาก(ไป)?ตาย/g,CR_NEG_EN=/\b(do\s*n[o']?t|never|not|no)\s*(want|wanna)\s*(to\s*)?die\b/g;
const CR_TH=['อยากตาย','อยากไปตาย','ฆ่าตัวตาย','ฆ่าตัวเอง','ทำร้ายตัวเอง','กรีดข้อมือ','กรีดแขน','กรีดตัวเอง','ไม่อยากมีชีวิต','ไม่อยากอยู่แล้ว','ไม่อยากอยู่บนโลก','ไม่อยากอยู่ในโลก',
 'ไม่อยากตื่นอีก','ไม่อยากตื่นขึ้นมาอีก','อยากหายไปจากโลก','จบชีวิตตัวเอง','ปลิดชีพตัวเอง','ปลิดชีวิตตัวเอง','กินยาตาย','กินยาฆ่าตัว','โดดตึกตาย','กระโดดตึก','ผูกคอตาย'];
const CR_EN=/\b(kill(ing)?\s*my\s*self|want(ed)?\s*to\s*die|wanna\s*die|suicid(e|al)|end(ing)?\s*my\s*life|end\s*it\s*all|self[\s-]*harm(ing)?|cut(ting)?\s*my\s*self|kms)\b/;
function crisis(t){const low=String(t||'').toLowerCase(),th=low.replace(CR_SQ,'').replace(CR_NEG_TH,'');return CR_TH.some(w=>th.includes(w))||CR_EN.test(low.replace(CR_NEG_EN,' '));}
const CARE='บรรทัดนี้จะยังไม่ขึ้นการ์ดและข้อความแชร์ ถ้าช่วงนี้คุณรู้สึกหนักจนอยากหายไป ลองโทรคุยกับสายด่วนสุขภาพจิต 1323 ดูนะ เปิดตลอด 24 ชั่วโมง ไม่เสียค่าโทร มีคนพร้อมฟังคุณอยู่';

// ---------- share code (identical copy in functions/s/[[path]].js) ----------
// bytes: [ver, drg<<6|rank<<3|cls, floor|won<<7, pct|human<<7, ...name, 0, ...title, fnv8]  drg 0 none / 1 spared the dragon / 2 killed it (v2.1, only with won;
// old links have 0 there so they decode the same; clients older than v2.1 reject codes with drg set)  ver 1 = Thai/ASCII packed 1 byte per char, ver 2 = UTF-8
function fnv8(b){let h=2166136261>>>0;for(let i=0;i<b.length;i++){h^=b[i];h=Math.imul(h,16777619);}return(h^(h>>>8)^(h>>>16)^(h>>>24))&255;}
function packThai(s){const o=[];for(const ch of s){const c=ch.codePointAt(0);if(c>0&&c<128)o.push(c);else if(c>0xE00&&c<0xE80)o.push(0x80+c-0xE00);else return null;}return o;}
function unpackThai(b){let s='';for(const x of b)s+=String.fromCodePoint(x<128?x:0xE00+x-0x80);return s;}
function b64u(bytes){let s='';for(const x of bytes)s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function unb64u(c){const s=atob(c.replace(/-/g,'+').replace(/_/g,'/'));const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b;}
function cleanTxt(s,max){s=str(s).replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g,'').replace(/[<>"'`\\&]/g,'').replace(/\s+/g,' ').trim();
 const g=[];for(const ch of Array.from(s)){if(g.length&&/[ัิ-ฺ็-๎]/.test(ch))g[g.length-1]+=ch;else g.push(ch);}return g.slice(0,max).join('').trim();}
function encode(d){
 const rank=clampN(d.rankIdx|0,0,7),cls=Math.max(0,CLS_IDS.indexOf(d.clsId)),won=!!d.won,floor=won?100:clampN(Math.round(+d.floor||1),1,100),pct=clampN(Math.round(+d.pct||0),0,100);
 const name=cleanTxt(d.name,16)||'?',title=cleanTxt(d.title,18);
 let n=packThai(name),t=packThai(title),ver=1;
 if(!n||!t){const te=new TextEncoder();n=[...te.encode(name)];t=[...te.encode(title)];ver=2;}
 if(cls>7)ver+=4; // v2.5: classes 8+ ride in ver 5/6 with cls-8 in the 3-bit slot
 const dg=won?(d.drg==='f'?1:d.drg==='s'?2:0):0;
 const b=[ver,dg*64+rank*8+(cls&7),floor|(won?128:0),pct|(d.form==='human'?128:0),...n,0,...t];b.push(fnv8(b));return b64u(b);}
function decode(code){
 try{code=String(code||'');if(!/^[A-Za-z0-9_-]{8,120}$/.test(code))return null;
  const b=unb64u(code);if(b.length<7)return null;const body=b.subarray(0,b.length-1);if(fnv8(body)!==b[b.length-1])return null;
  let ver=b[0],cx=0;if(ver>=5&&ver<=8){ver-=4;cx=8;}
  if(ver===3||ver===4){if(b.length<11||b[1]>>6||b[2]>>1||b[3]<1)return null;
   const rank=(b[1]>>3)&7,cls=(b[1]&7)+cx,human=!!(b[2]&1),gen=b[3],odds=b[4]*16777216+b[5]*65536+b[6]*256+b[7];
   const rest=body.subarray(8),z=rest.indexOf(0);if(z<1)return null;
   const dec=x=>ver===3?unpackThai(x):new TextDecoder('utf-8',{fatal:true}).decode(x);
   const name=cleanTxt(dec(rest.subarray(0,z)),16),village=cleanTxt(dec(rest.subarray(z+1)),20);if(!name)return null;
   return{birth:true,rankIdx:rank,rankK:RANK_K[rank],clsId:CLS_IDS[cls],clsN:CLS_N[cls],form:human?'human':'slime',gen,odds,name,village};}
  if(ver!==1&&ver!==2)return null;const rank=(b[1]>>3)&7,cls=(b[1]&7)+cx,dg=b[1]>>6,floor=b[2]&127,won=!!(b[2]&128),pct=b[3]&127,human=!!(b[3]&128);
  if(dg>2||(dg&&!won)||floor<1||floor>100||pct>100||(won&&floor!==100))return null;
  const rest=body.subarray(4),z=rest.indexOf(0);if(z<1)return null;
  const dec=x=>ver===1?unpackThai(x):new TextDecoder('utf-8',{fatal:true}).decode(x);
  const name=cleanTxt(dec(rest.subarray(0,z)),16),title=cleanTxt(dec(rest.subarray(z+1)),18);if(!name)return null;
  return{rankIdx:rank,rankK:RANK_K[rank],clsId:CLS_IDS[cls],clsN:CLS_N[cls],floor,won,pct,form:human?'human':'slime',name,title,drg:['','f','s'][dg]};
 }catch(e){return null;}}
// birth link (v2.3): [ver 3 packed / 4 UTF-8, rank<<3|cls, human, gen 1-255, odds u32 big-endian, ...name, 0, ...village, fnv8]
// old clients only accept ver 1/2, so they just ignore these codes. Village (then name) is dropped if the code gets past 120 chars.
function encodeBirth(d){
 const rank=clampN(d.rankIdx|0,0,7),cls=Math.max(0,CLS_IDS.indexOf(d.clsId)),gen=clampN(Math.round(+d.gen||1),1,255),odds=clampN(Math.round(+d.odds||0),0,4294967295);
 let name=cleanTxt(d.name,16)||'?',vil=cleanTxt(d.village,20);
 for(;;){let n=packThai(name),v=packThai(vil),ver=3;
  if(!n||!v){const te=new TextEncoder();n=[...te.encode(name)];v=[...te.encode(vil)];ver=4;}
  if(cls>7)ver+=4;
  const b=[ver,rank*8+(cls&7),d.form==='human'?1:0,gen,(odds>>>24)&255,(odds>>>16)&255,(odds>>>8)&255,odds&255,...n,0,...v];b.push(fnv8(b));const c=b64u(b);
  if(c.length<=120||(!vil&&graphemes(name).length<=1))return c;
  if(vil)vil='';else name=clip(name,graphemes(name).length-1).trim()||'?';}}
function shareUrl(d){return ORIGIN+'/s/'+(d&&d.birth?encodeBirth(d):encode(d));}

// ---------- data ----------
function norm(d){d=Object.assign({},d||{});d.name=str(d.name)||'นักผจญภัยนิรนาม';d.village=str(d.village);d.rankK=str(d.rankK)||'?';d.rankCol=d.rankCol||P.gold;
 d.clsN=str(d.clsN);d.turn=str(d.turn);d.pathN=str(d.pathN);d.won=!!d.won;d.floor=d.won?100:Math.max(1,Math.round(+d.floor||1));d.title=str(d.title);d.arch=str(d.arch);d.cause=str(d.cause);
 d.karma=+d.karma||0;d.score=+d.score||0;d.date=d.date||Date.now();d.pets=Array.isArray(d.pets)?d.pets:[];d.petN=Array.isArray(d.petN)?d.petN:[];d.comps=Array.isArray(d.comps)?d.comps:[];
 d.map=Array.isArray(d.map)&&d.map.length===100?d.map:Array(100).fill('');d.hk=d.hk&&typeof d.hk==='object'?d.hk:{};d.note=cleanNote(d.note);d.gen=d.gen||1;
 if(!(d.rankIdx>=0))d.rankIdx=Math.max(0,RANK_K.indexOf(d.rankK));
 d.drg=['n','f','s','x'].includes(d.drg)?d.drg:'';d.drgC=['k','s','g'].includes(d.drgC)?d.drgC:'';
 d.drgW=d.won&&(d.drg==='f'||d.drg==='s'); // won the secret dragon floor
 d.secret=d.drgW||d.drg==='x';
 d.pat=d.pat&&typeof d.pat==='object'&&str(d.pat.code)&&Array.isArray(d.pat.v)&&d.pat.v.length===4?{code:str(d.pat.code),n:str(d.pat.n),v:d.pat.v.map(x=>clampN(+x||0,-100,100))}:null;return d;}
// birth card data: d = {name, village, rankK, rankIdx, rankCol, clsId, clsN, odds, clsOdds, look, form, lookName, omenN, omenK, dayN, gen, house, date}
function normB(d){d=Object.assign({},d||{});d.birth=true;d.name=str(d.name)||'นักผจญภัยนิรนาม';d.village=str(d.village);
 d.rankIdx=d.rankIdx>=0&&d.rankIdx<=7?d.rankIdx|0:Math.max(0,RANK_K.indexOf(str(d.rankK)));d.rankK=str(d.rankK)||RANK_K[d.rankIdx];d.rankCol=d.rankCol||P.gold;
 const ci=CLS_IDS.indexOf(d.clsId);d.clsN=str(d.clsN)||(ci>=0?CLS_N[ci]:'');d.odds=Math.max(0,Math.round(+d.odds||0));d.clsOdds=Math.max(0,Math.round(+d.clsOdds||0));
 d.omenN=str(d.omenN);d.omenK=str(d.omenK);d.dayN=str(d.dayN);d.lookName=str(d.lookName);d.gen=Math.max(1,Math.round(+d.gen||1));d.house=str(d.house);
 d.note=cleanNote(d.note);d.date=d.date||Date.now();d.floor=1;d.won=false;d.pets=[];d.drg='';d.secret=false;return d;}
// ลวดลายชะตา row: code + name on the left, four mini lean bars on the right. Codes travel as letters (บ/ร ห/ช ด/พ ☀/☾) and show as emoji.
const PAT_E={'บ':'⚔️','ร':'🛡️','ห':'💰','ช':'🤝','ด':'🚶','พ':'👥','☀':'☀️','☾':'🌙'},patEmo=c=>Array.from(c||'').map(x=>PAT_E[x]||x).join('');
const PAT_P=[['บุก','ระวังตัว'],['หาของ','ช่วยเหลือ'],['คนเดียว','มีเพื่อน'],['กรรมดี','กรรมชั่ว']];
function drawPat(ctx,d,y){const p=d.pat;
 line(ctx,'ลวดลายชะตา',64,y+28,{size:22,col:P.ink3,maxW:300});
 setF(ctx,600,40);const pc=patEmo(p.code),cw=Math.min(190,ctx.measureText(pc).width);line(ctx,pc,64,y+72,{size:40,weight:600,col:P.stamp,maxW:190,min:24});
 line(ctx,p.n,64+cw+22,y+70,{size:34,weight:600,col:P.ink,maxW:600-64-cw-22,min:20});
 const bx=738,bw=176;p.v.forEach((v,i)=>{const yy=y+9+i*18;
  line(ctx,PAT_P[i][0],bx-10,yy+7,{size:17,col:v<0?P.stamp:P.ink3,maxW:96,min:12,align:'right'});line(ctx,PAT_P[i][1],bx+bw+10,yy+7,{size:17,col:v>0?P.stamp:P.ink3,maxW:96,min:12});
  rect(ctx,bx,yy,bw,3,P.rule);rect(ctx,bx+bw/2-1,yy-4,2,11,P.ink3);const k=bx+bw*(.5+v/200);rect(ctx,k-5,yy-4,10,11,P.red);});
 return 84;}
function verdict(k){return k>=20?'ใจบุญทั้งหอ':k>=6?'กรรมดี':k>-6?'กลางๆ':k>-20?'กรรมชั่ว':'บาปหนา';}
function recNo(d){const y=new Date(d.date).getFullYear();return d.rankK+(CLS_IDS.indexOf(d.clsId)+1)+'-'+y+'-'+String(d.floor).padStart(3,'0');}

// ---------- canvas text ----------
let fontsP=null;
function waitFonts(){
 if(fontsP)return fontsP;
 const fs=document.fonts;if(!fs||!fs.load)return fontsP=Promise.resolve();
 const sample='หอคอยโชคชะตา ชั้นบอส 0123456789 ABC%';
 const loads=Promise.all(['400 20px Mitr','500 20px Mitr','600 20px Mitr','20px "DotGothic16"'].map(f=>fs.load(f,sample).catch(()=>null))).then(()=>fs.ready);
 return fontsP=Promise.race([loads,new Promise(r=>setTimeout(r,3000))]).then(()=>{});
}
function setF(ctx,weight,size,fam){ctx.font=(weight?weight+' ':'')+size+'px '+(fam||fT);}
function ellip(ctx,text,maxW){if(ctx.measureText(text).width<=maxW)return text;const g=graphemes(text);while(g.length>1&&ctx.measureText(g.join('')+'…').width>maxW)g.pop();return g.join('')+'…';}
function fitSize(ctx,text,maxW,size,weight,fam,min){let s=size;setF(ctx,weight,s,fam);while(s>min&&ctx.measureText(text).width>maxW){s-=2;setF(ctx,weight,s,fam);}return s;}
// one line: shrink to min, then ellipsize. o:{size,min,weight,fam,col,align,maxW}
function line(ctx,text,x,y,o){if(!text)return 0;o=o||{};const s=fitSize(ctx,text,o.maxW||W,o.size||28,o.weight||400,o.fam,o.min||o.size||28);
 ctx.textAlign=o.align||'left';ctx.textBaseline='alphabetic';ctx.fillStyle=o.col||P.ink;ctx.fillText(ellip(ctx,text,o.maxW||W),x,y);return s;}
function words(text){try{if(typeof Intl!=='undefined'&&Intl.Segmenter)return[...new Intl.Segmenter('th',{granularity:'word'}).segment(text)].map(s=>s.segment);}catch(e){}return graphemes(text);}
function wrapLines(ctx,text,maxW,maxLines){const out=[];let cur='';
 for(const w of words(text)){const t=cur+w;if(ctx.measureText(t).width<=maxW||!cur){if(ctx.measureText(t).width>maxW&&!cur){let c='';for(const g of graphemes(w)){if(ctx.measureText(c+g).width>maxW&&c){out.push(c);c='';}c+=g;}cur=c;}else cur=t;}
  else{out.push(cur.trim());cur=w.trimStart();}}
 if(cur.trim())out.push(cur.trim());
 if(out.length>maxLines){const keep=out.slice(0,maxLines);keep[maxLines-1]=ellip(ctx,keep[maxLines-1]+out.slice(maxLines).join(''),maxW);return keep;}return out;}
// wrapped text: tries 1 line at size, then up to maxLines while shrinking to min
function para(ctx,text,x,y,o){if(!text)return 0;const maxW=o.maxW,lh=o.lh||1.3,ml=o.lines||2;let s=o.size;
 for(;;){setF(ctx,o.weight||400,s,o.fam);const L=wrapLines(ctx,text,maxW,ml);const over=L.length>=ml&&ctx.measureText(L[L.length-1]).width>maxW*.98&&/…$/.test(L[L.length-1]);
  if((!over&&L.length<=ml)||s<=o.min){ctx.textAlign=o.align||'left';ctx.textBaseline='alphabetic';ctx.fillStyle=o.col||P.ink;L.forEach((l,i)=>ctx.fillText(l,x,y+i*s*lh));return L.length*s*lh;}
  s-=2;}}
function rect(ctx,x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}

// ---------- card pieces ----------
function drawPaper(ctx,d){
 rect(ctx,0,0,W,H,P.paper);
 // paper grain (seeded speckles)
 let s=hashStr(d.name+'|'+d.floor);const r=()=>((s=Math.imul(s^s>>>15,2246822507)^Math.imul(s^s>>>13,3266489909),(s^=s>>>16)>>>0)/4294967296);
 for(let i=0;i<900;i++){ctx.globalAlpha=.05+r()*.06;ctx.fillStyle=r()<.5?'#8b7a62':'#fff8e6';ctx.fillRect(Math.floor(r()*W),Math.floor(r()*H),2,2);}
 ctx.globalAlpha=1;
 // guilloche band behind the middle of the record
 ctx.strokeStyle=P.stamp;ctx.lineWidth=1.4;ctx.globalAlpha=.08;
 for(let k=0;k<16;k++){ctx.beginPath();for(let x=0;x<=W;x+=6){const y=H*.52+Math.sin(x/(70+k*3)+k*.7)*Math.cos(x/190+k*.4)*(120+k*6);x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
 ctx.globalAlpha=1;
 // pixel double border
 const o=16;ctx.strokeStyle=P.rule;ctx.lineWidth=4;ctx.strokeRect(o,o,W-2*o,H-2*o);ctx.lineWidth=2;ctx.strokeRect(o+10,o+10,W-2*o-20,H-2*o-20);
}
function drawHeader(ctx,d){
 rect(ctx,0,0,W,124,P.band);rect(ctx,0,124,W,6,P.gold2);rect(ctx,0,130,W,2,P.band2);
 // little tower glyph
 const tx=64,ty=34;ctx.fillStyle=P.gold;[[0,0,8,8],[16,0,8,8],[32,0,8,8],[0,8,40,6],[4,14,32,44],[0,58,40,6]].forEach(([x,y,w,h])=>ctx.fillRect(tx+x,ty+y,w,h));
 ctx.fillStyle=P.band;ctx.fillRect(tx+16,ty+24,8,10);ctx.fillRect(tx+15,ty+44,10,14);
 line(ctx,'หอคอยโชคชะตา',124,84,{size:52,weight:600,col:P.gold,maxW:520});
 line(ctx,'No. '+(d.birth?'B-'+d.rankK+(CLS_IDS.indexOf(d.clsId)+1)+'-'+new Date(d.date).getFullYear():recNo(d)),W-64,62,{size:28,fam:fP,col:'#e9dcb8',align:'right',maxW:380});
 line(ctx,new Date(d.date).toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'}),W-64,98,{size:22,col:'#a3b5ad',align:'right',maxW:380});
}
function sprBounds(spr){let t=spr.h,b=0,l=spr.w,r=0;spr.rows.forEach((row,y)=>{for(let x=0;x<row.length;x++)if(row[x]!=='.'&&spr.pal[row[x]]){t=Math.min(t,y);b=Math.max(b,y);l=Math.min(l,x);r=Math.max(r,x);}});
 return t>b?{t:0,b:spr.h-1,l:0,r:spr.w-1}:{t,b,l,r};}
function drawPortrait(ctx,d,X,Y,FW,FH){
 const A=window.ART;
 rect(ctx,X-6,Y-6,FW+12,FH+12,P.ink);rect(ctx,X-2,Y-2,FW+4,FH+4,P.gold2);
 ctx.save();ctx.beginPath();ctx.rect(X,Y,FW,FH);ctx.clip();ctx.imageSmoothingEnabled=false;
 const bi=clampN(Math.floor((d.floor-1)/20),0,4),sc=3;
 try{const bg=A&&A.bgImg&&A.bgImg(bi);if(bg){const sw=FW/sc,sh=FH/sc;ctx.drawImage(bg,(192-sw)/2,128-sh,sw,sh,X,Y,FW,FH);}else rect(ctx,X,Y,FW,FH,P.band);}catch(e){rect(ctx,X,Y,FW,FH,P.band);}
 const floorY=Y+FH-(128-100)*sc; // bg floor line sits at y=100 of 128
 if(!d.won&&!d.birth){ctx.fillStyle='rgba(20,16,12,.28)';ctx.fillRect(X,Y,FW,FH);}
 else{const g=ctx.createRadialGradient(X+FW/2,floorY-80,10,X+FW/2,floorY-80,200);g.addColorStop(0,'rgba(255,220,120,.45)');g.addColorStop(1,'rgba(255,220,120,0)');ctx.fillStyle=g;ctx.fillRect(X,Y,FW,FH);}
 let drawn=false;
 try{if(A&&A.heroSpr&&A.sprCanvas){const spr=A.heroSpr(d.clsId||'war',d.look),c=A.sprCanvas(spr,false,false,'card'),b=sprBounds(spr),s=10,bw=b.r-b.l+1;
  const x=Math.round(X+FW/2-(b.l+bw/2)*s),y=Math.round(floorY+12-(b.b+1)*s);
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(Math.round(X+FW/2-bw*s*.36),floorY+6,Math.round(bw*s*.72),10);
  ctx.drawImage(c,x,y,spr.w*s,spr.h*s);drawn=true;
  const PS=A.PSPR,pk=d.pets[0];if(PS&&pk&&PS[pk]){const ps=PS[pk],pc=A.sprCanvas(ps,true,false,'cardpet'),q=6;ctx.drawImage(pc,Math.round(X+FW/2+bw*s/2+4),Math.round(floorY+10-ps.h*q),ps.w*q,ps.h*q);}}}catch(e){}
 if(!drawn)line(ctx,d.won?'♛':'✦',X+FW/2,Y+FH/2,{size:120,align:'center',col:P.gold});
 ctx.restore();
 // floor tag
 const tag=d.birth?'ชั้น 1':d.secret?'ชั้นลับ':d.won?'ยอดหอ':'ชั้น '+d.floor;setF(ctx,500,24);const tw=ctx.measureText(tag).width+24;rect(ctx,X+10,Y+10,tw,36,'rgba(11,18,21,.8)');line(ctx,tag,X+22,Y+37,{size:24,weight:500,col:P.gold,maxW:200});
}
function drawStamp(ctx,text,cx,cy,col){ctx.save();ctx.translate(cx,cy);ctx.rotate(-.16);setF(ctx,600,30);const w=ctx.measureText(text).width+40,h=60;
 ctx.globalAlpha=.82;ctx.strokeStyle=col;ctx.lineWidth=5;ctx.strokeRect(-w/2,-h/2,w,h);ctx.lineWidth=2;ctx.strokeRect(-w/2+7,-h/2+7,w-14,h-14);
 ctx.fillStyle=col;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,0,3);ctx.restore();}
function drawBadge(ctx,x,y,s,k,col){rect(ctx,x,y+6,s,s-12,P.ink);rect(ctx,x+6,y,s-12,s,P.ink);rect(ctx,x+5,y+10,s-10,s-20,col);rect(ctx,x+10,y+5,s-20,s-10,col);rect(ctx,x+10,y+10,s-20,6,'rgba(255,255,255,.35)');
 setF(ctx,'',Math.round(s*(k.length>1?.46:.6)),fP);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#1a1010';ctx.fillText(k,x+s/2,y+s/2+3);}
function drawMap(ctx,d,X,Y,cw,ch,gap){
 const gw=10*cw+9*gap,gh=10*ch+9*gap;
 // tower silhouette: wall behind the cells + battlements
 rect(ctx,X-10,Y-8,gw+20,gh+16,P.paper2);ctx.strokeStyle=P.ink3;ctx.lineWidth=2;ctx.strokeRect(X-10,Y-8,gw+20,gh+16);
 const bw=Math.round((gw+20)/9);for(let i=0;i<9;i+=2){rect(ctx,X-10+i*bw,Y-26,bw,18,P.paper2);ctx.strokeRect(X-10+i*bw,Y-26,bw,18);}
 const fl=d.floor;
 for(let f=1;f<=100;f++){const row=Math.floor((f-1)/10),col=(f-1)%10,x=X+col*(cw+gap),y=Y+(9-row)*(ch+gap),m=d.map[f-1];
  const dead=!d.won&&f===fl;let c=dead?MAPC.death:m?(MAPC[m]||MAPC.calm):f<=fl?'#b3a27c':'rgba(43,33,24,.07)';
  rect(ctx,x,y,cw,ch,c);
  if(f%10===0){ctx.strokeStyle=f<=fl?'#c98a1a':'rgba(201,138,26,.55)';ctx.lineWidth=3;ctx.strokeRect(x+1.5,y+1.5,cw-3,ch-3);}
  if(dead){ctx.strokeStyle=P.red;ctx.lineWidth=3;ctx.strokeRect(x-2.5,y-2.5,cw+5,ch+5);ctx.fillStyle='#f1e7d0';const q=Math.min(cw,ch),cx=x+cw/2,cy=y+ch/2;ctx.fillRect(Math.round(cx-q*.09),Math.round(cy-q*.36),Math.max(2,Math.round(q*.18)),Math.round(q*.72));ctx.fillRect(Math.round(cx-q*.27),Math.round(cy-q*.2),Math.round(q*.54),Math.max(2,Math.round(q*.16)));}
 }
 return{gw,gh};
}

// ---------- render ----------
function render(d){return d&&d.gift?renderGift(d):d&&d.birth?renderBirth(d):renderRun(d);}
async function renderRun(d){
 d=norm(d);await waitFonts();
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
 drawPaper(ctx,d);drawHeader(ctx,d);
 line(ctx,d.won?'บันทึกผู้พิชิตหอ · CONQUEROR RECORD':'บันทึกนักผจญภัย · ADVENTURER RECORD',64,184,{size:26,weight:500,col:P.stamp,maxW:700});
 // portrait
 const PX=64,PY=212,PW=300,PH=300;drawPortrait(ctx,d,PX,PY,PW,PH);
 // identity column
 const RX=404,RW=W-64-RX;
 drawBadge(ctx,W-64-84,206,84,d.rankK,d.rankCol);
 line(ctx,[d.clsN,d.pathN,d.turn?'เดิมเป็น'+d.turn:'','แรงค์ '+d.rankK].filter(Boolean).join(' · '),RX,250,{size:30,weight:500,col:P.stamp,maxW:RW-110,min:20});
 line(ctx,d.name,RX,340,{size:84,weight:600,col:P.ink,maxW:RW,min:40});
 line(ctx,d.secret?'ชั้น 1 → ชั้น 100 → ชั้นลับ':d.won?'ชั้น 1 → ชั้น 100 · ถึงยอดหอ':'ชั้น 1 → ชั้น '+d.floor+' · ไต่มา '+d.floor+' ชั้น',RX,398,{size:32,fam:fP,col:P.ink2,maxW:RW,min:22});
 line(ctx,[d.village?'ถิ่นกำเนิด '+d.village:'',d.odds?'เกิดมา 1 ใน '+nf(d.odds):''].filter(Boolean).join(' · '),RX,448,{size:28,col:P.ink2,maxW:RW,min:20});
 const deeds=[d.lv?'Lv '+d.lv:'',d.bosses?'ล้มบอส '+d.bosses+' ตัว':'',d.kills?'สังหาร '+nf(d.kills):''].filter(Boolean).join(' · ');
 line(ctx,deeds,RX,496,{size:26,col:P.ink3,maxW:RW,min:18});
 drawStamp(ctx,d.won?'พิชิตยอดหอ':'สิ้นชีพ ชั้น '+d.floor,PX+PW/2+18,PY+PH-34,d.won?P.gold2:P.red);
 // stat grid 2x3
 const GY=544,GH=d.note&&d.pat?88:92,CW=456,CX=[64,560];
 const party=[...d.petN,...d.comps].filter(Boolean);
 const cells=[
  [d.won?'ผลลัพธ์':'สาเหตุการตาย',d.drgW?(d.drg==='f'?'สหายมังกร · ชั้นลับ':'นักล่ามังกร · ชั้นลับ'):d.won?'พิชิตยอดหอคอย':(d.cause.replace(/\s*\(ชั้น \d+\)\s*$/,'')||'ชะตาขาด'),d.won?P.gold2:P.red],
  ['ฉายา',(d.title?'「'+d.title+'」':'—')+(d.arch&&d.arch!==d.title?' · '+d.arch:''),P.ink],
  ['กรรม',(d.karma>0?'+':'')+d.karma+' · '+verdict(d.karma),d.karma>=6?P.stamp:d.karma<=-6?P.red:P.ink],
  ['สัตว์เลี้ยง / เพื่อนร่วมทาง',party.length?party.slice(0,3).join(', ')+(party.length>3?' +'+(party.length-3):''):'เดินทางคนเดียว',P.ink],
  ['รุ่น / สายตระกูล','รุ่นที่ '+d.gen+' · สาย'+(d.house||d.name),P.ink],
  ['ท่าทีหลัก',d.stance||'—',P.ink]];
 cells.forEach((c,i)=>{const x=CX[i%2],y=GY+Math.floor(i/2)*GH;
  rect(ctx,x,y,CW,2,P.rule);
  line(ctx,c[0],x,y+30,{size:22,col:P.ink3,maxW:CW});
  setF(ctx,600,32);if(i===0&&ctx.measureText(c[1]).width>CW)para(ctx,c[1],x,y+57,{size:25,min:20,weight:500,col:c[2],maxW:CW,lines:2,lh:1.2});
  else line(ctx,c[1],x,y+70,{size:32,weight:600,col:c[2],maxW:CW,min:20});});
 let y=GY+3*GH+8;rect(ctx,64,y-6,W-128,2,P.rule);
 if(d.pat){y+=drawPat(ctx,d,y);rect(ctx,64,y-6,W-128,2,P.rule);}
 // player's note
 if(d.note){setF(ctx,500,32);y+=40;const h=para(ctx,'“'+d.note+'”',64,y,{size:34,min:24,weight:500,col:P.red,maxW:W-128,lines:2,lh:1.25});y+=h-14;}
 // map + big number
 const footY=1232;
 line(ctx,'แผนที่หอ 100 ชั้น · ล่างซ้ายคือชั้น 1 · ขอบทองคือชั้นบอส',64,y+40,{size:22,col:P.ink3,maxW:W-128,min:18});
 const mapTop=y+84,gap=4,avail=footY-24-mapTop,ch=Math.max(10,Math.floor((avail-9*gap)/10)),cw=40;
 drawMap(ctx,d,74,mapTop,cw,ch,gap);
 const NX=560,NW=W-64-NX,pct=d.pct!=null&&isFinite(+d.pct)?clampN(Math.round(+d.pct),0,100):null;
 // legend sits on the bottom of the right column; the big number fills the space above it
 const LG=[['fight','ต่อสู้'],['treasure','สมบัติ'],['good','กรรมดี'],['evil','กรรมชั่ว'],['pet','สัตว์เลี้ยง'],['comp','เพื่อน'],['trap','บาดเจ็บ'],['death','จุดจบ']];
 const ly=footY-22-34;
 LG.forEach(([k,n],i)=>{const x=NX+(i%4)*(NW/4),yy=ly+Math.floor(i/4)*34;rect(ctx,x,yy-16,18,18,MAPC[k]);line(ctx,n,x+26,yy,{size:19,col:P.ink2,maxW:NW/4-30,min:14});});
 if(pct!=null){
  const room=ly-24-mapTop,tight=room<230,ns=tight?clampN(Math.round(room*.5),48,150):clampN(Math.round(room*.5),90,150),ny=mapTop+Math.round(ns*.78);
  line(ctx,pct+'%',NX-6,ny,{size:ns,weight:600,col:P.stamp,maxW:NW,min:40});
  const cap=d.won?'ของนักผจญภัยรุ่นเดียวกันขึ้นไปไม่ถึงยอดหอ':'ของนักผจญภัยรุ่นเดียวกันไปไม่ถึงชั้นนี้';
  const cl=Math.max(0,Math.min(2,Math.floor((ly-30-(ny+14))/34)));
  const hh=cl?para(ctx,cap,NX,ny+42,{size:27,min:21,col:P.ink,maxW:NW,lines:cl,lh:1.22}):0;
  const my=ny+42+hh+2;if(d.med&&my<ly-30)line(ctx,'ครึ่งหนึ่งล้มก่อนชั้น '+d.med,NX,my,{size:23,fam:fP,col:P.ink2,maxW:NW,min:18});
 }
 // footer
 rect(ctx,64,footY,W-128,3,P.ink);
 line(ctx,'คุณจะไปได้ถึงชั้นไหน?',64,footY+72,{size:42,weight:600,col:P.ink,maxW:560,min:28});
 line(ctx,HOST,W-64,footY+70,{size:30,fam:fP,col:P.red,align:'right',maxW:400,min:20});
 return cv;
}
// birth card: same paper/header/portrait, three big tiles, omen + today's theme, a big question and an empty 100-floor strip
async function renderBirth(d){
 d=normB(d);await waitFonts();
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
 drawPaper(ctx,d);drawHeader(ctx,d);
 line(ctx,'บันทึกแรกเกิด · BIRTH RECORD',64,184,{size:26,weight:500,col:P.stamp,maxW:700});
 const PX=64,PY=212,PS=340;drawPortrait(ctx,d,PX,PY,PS,PS);
 drawStamp(ctx,'แรกเกิด',PX+PS/2+18,PY+PS-34,P.gold);
 const RX=444,RW=W-64-RX;
 line(ctx,[d.clsN,'แรงค์ '+d.rankK].filter(Boolean).join(' · '),RX,250,{size:30,weight:500,col:P.stamp,maxW:RW,min:20});
 line(ctx,d.name,RX,340,{size:84,weight:600,col:P.ink,maxW:RW,min:40});
 let iy=406;if(d.village){line(ctx,'ถิ่นกำเนิด '+d.village,RX,iy,{size:30,col:P.ink2,maxW:RW,min:20});iy+=52;}
 line(ctx,'รุ่นที่ '+d.gen+' · สาย'+(d.house||d.name),RX,iy,{size:28,col:P.ink2,maxW:RW,min:20});
 line(ctx,d.lookName?'รูปลักษณ์ '+d.lookName:'',RX,iy+48,{size:24,col:P.ink3,maxW:RW,min:18});
 // three big tiles
 const TY=596,TH=260,TG=24,TW=(W-128-2*TG)/3;
 const tile=(i,lab)=>{const x=64+i*(TW+TG);rect(ctx,x,TY,TW,TH,P.card);ctx.strokeStyle=P.rule;ctx.lineWidth=3;ctx.strokeRect(x+1.5,TY+1.5,TW-3,TH-3);rect(ctx,x,TY,TW,6,P.gold2);
  line(ctx,lab,x+TW/2,TY+48,{size:24,col:P.ink3,maxW:TW-24,min:16,align:'center'});return x;};
 let x=tile(0,'แรงค์');drawBadge(ctx,Math.round(x+TW/2-72),TY+72,144,d.rankK,d.rankCol);
 x=tile(1,'อาชีพ');line(ctx,d.clsN||'?',x+TW/2,d.clsOdds>1?TY+162:TY+176,{size:64,weight:600,col:P.ink,maxW:TW-28,min:28,align:'center'});
 if(d.clsOdds>1)line(ctx,'อาชีพนี้ 1 ใน '+nf(d.clsOdds),x+TW/2,TY+222,{size:24,col:P.ink2,maxW:TW-28,min:16,align:'center'});
 x=tile(2,'โอกาสเกิดมาแบบนี้');line(ctx,'1 ใน',x+TW/2,TY+112,{size:34,weight:500,col:P.ink2,maxW:TW-28,align:'center'});
 line(ctx,d.odds?nf(d.odds):'?',x+TW/2,TY+198,{size:76,weight:600,col:P.red,maxW:TW-28,min:28,align:'center'});
 // omen / today's theme
 let y=TY+TH+30;
 const rows=[d.omenN?['ดวงประจำชาติ',d.omenN+(d.omenK?' · '+d.omenK:'')]:null,d.dayN?['หัวข้อของวันนี้',d.dayN]:null].filter(Boolean);
 rows.forEach((r,i)=>{const cw=rows.length>1?456:W-128,xx=64+i*496;rect(ctx,xx,y,cw,2,P.rule);line(ctx,r[0],xx,y+30,{size:22,col:P.ink3,maxW:cw});line(ctx,r[1],xx,y+72,{size:32,weight:600,col:P.ink,maxW:cw,min:20});});
 if(rows.length)y+=96;
 if(d.note){y+=44;const h=para(ctx,'“'+d.note+'”',64,y,{size:34,min:24,weight:500,col:P.red,maxW:W-128,lines:2,lh:1.25});y+=h-14;}
 // the big question + an empty tower strip (floor 1 lit)
 const footY=1232,room=footY-y,strip=room>=230;
 const qy=y+Math.round(strip?(room-120)/2+34:room/2+24);
 line(ctx,'ฮีโร่คนนี้จะไปได้ถึงชั้นไหน?',W/2,qy,{size:66,weight:600,col:P.ink,maxW:W-128,min:34,align:'center'});
 if(strip){const sy=qy+44,sw=W-128,g=2,cw=(sw-99*g)/100;
  for(let f=1;f<=100;f++){const sx=64+(f-1)*(cw+g);rect(ctx,sx,sy,cw,26,f===1?P.gold:f%10===0?'rgba(201,138,26,.35)':'rgba(43,33,24,.1)');}
  line(ctx,'ชั้น 1',64,sy+60,{size:22,fam:fP,col:P.ink2,maxW:200});line(ctx,'ชั้น 100',W-64,sy+60,{size:22,fam:fP,col:P.ink2,align:'right',maxW:200});}
 // footer
 rect(ctx,64,footY,W-128,3,P.ink);
 line(ctx,'ลองเกิดดูสักชาติ แล้วมาเทียบกัน',64,footY+72,{size:40,weight:600,col:P.ink,maxW:600,min:26});
 line(ctx,HOST,W-64,footY+70,{size:30,fam:fP,col:P.red,align:'right',maxW:360,min:20});
 return cv;
}
// wish card (v2.7): a day the hero never had, given after the run ended. d = run share data + d.gift
// gift = {k, t: name of the day, m: what was missing, w: the handwritten line, + scene fields for ART.drawWish}
function normG(d){d=norm(d);const g=d.gift&&typeof d.gift==='object'?d.gift:{};d.gift=Object.assign({},g,{k:str(g.k),t:str(g.t),m:str(g.m),w:str(g.w)});return d;}
async function renderGift(d){
 d=normG(d);await waitFonts();const g=d.gift,A=window.ART;
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
 drawPaper(ctx,d);drawHeader(ctx,d);
 line(ctx,'ความปรารถนาที่ค้างไว้',W/2,188,{size:28,weight:500,col:P.gold2,maxW:W-128,align:'center'});
 let y=262;y+=para(ctx,g.t,W/2,y,{size:64,min:40,weight:600,col:P.ink,maxW:W-160,lines:2,lh:1.15,align:'center'})-64*1.15;
 if(g.m){y+=58;y+=para(ctx,g.m,W/2,y,{size:30,min:22,col:P.ink2,maxW:W-200,lines:2,lh:1.3,align:'center'})-30*1.3;}
 // the photo: a slightly tilted print with the handwritten line under the picture
 const top=y+40,footY=1232,iH=Math.round(Math.min(512,footY-top-24-96-150)),iW=Math.round(iH*1.5),fw=iW+48,fh=iH+24+96,fx=(W-fw)/2;
 const sc=document.createElement('canvas');sc.width=192;sc.height=128;const sx=sc.getContext('2d');sx.imageSmoothingEnabled=false;
 let ok=false;try{if(A&&A.drawWish){A.drawWish(sx,g,0);ok=true;}}catch(e){}
 ctx.save();ctx.translate(W/2,top+fh/2);ctx.rotate(-.022);
 ctx.fillStyle='rgba(43,33,24,.22)';ctx.fillRect(-fw/2+8,-fh/2+12,fw,fh);
 rect(ctx,-fw/2,-fh/2,fw,fh,'#fbf7ec');ctx.strokeStyle=P.rule;ctx.lineWidth=2;ctx.strokeRect(-fw/2+1,-fh/2+1,fw-2,fh-2);
 ctx.imageSmoothingEnabled=false;if(ok)ctx.drawImage(sc,22,26,150,100,-iW/2,-fh/2+24,iW,iH);else rect(ctx,-iW/2,-fh/2+24,iW,iH,P.band);
 if(g.w)line(ctx,g.w,0,fh/2-36,{size:34,min:22,weight:'italic 400',col:'#2c3c6c',maxW:fw-60,align:'center'});
 ctx.restore();
 const ny=top+fh+64;
 line(ctx,d.name+(d.clsN?' · '+d.clsN:''),W/2,ny,{size:40,weight:600,col:P.ink,maxW:W-128,min:24,align:'center'});
 line(ctx,(d.won?'ขึ้นถึงยอดหอคอยแล้ว':'ล้มลงที่ชั้น '+d.floor)+(d.village?' · จาก'+d.village:''),W/2,ny+44,{size:26,col:P.ink3,maxW:W-128,min:18,align:'center'});
 rect(ctx,64,footY,W-128,3,P.ink);
 line(ctx,'วันที่ไม่เคยมีในหอนี้',64,footY+72,{size:40,weight:600,col:P.ink,maxW:560,min:26});
 line(ctx,HOST,W-64,footY+70,{size:30,fam:fP,col:P.red,align:'right',maxW:400,min:20});
 return cv;
}

// ---------- share text ----------
const CLOSE=['คุณจะไปได้ถึงชั้นไหน?','ถ้าเป็นคุณ จะไปได้ไกลกว่านี้ไหม?','ลองเกิดดูสักชาติไหม เผื่อได้แรงค์ดีกว่านี้','ชาติหน้าของคุณจะไปถึงชั้นไหน?'];
function xLen(s){let n=0;for(const ch of s){const c=ch.codePointAt(0);n+=(c<=4351||(c>=8192&&c<=8205)||(c>=8208&&c<=8223)||(c>=8242&&c<=8247))?1:2;}return n;}
// skip list (v2.7): heavy moments never get bragged about in the share text, even if a legend title or a name carries them (auto.js sens() filters at the source too)
const SKIP=/(เครื่องเซ่น|เรียกค่าไถ่|ป้อนหอคอย|ฆ่าตัว|ทำร้ายตัวเอง|ร่างโปร่งแสงของเด็ก)/;
function hooks(d){const k=d.hk||{},out=[],seed=hashStr(d.name+'|'+d.floor+'|'+d.clsId+'|'+d.rankK);
 const add=(id,g,s,t,f)=>{if(t&&!SKIP.test(t)&&!crisis(t))out.push({id,g,t,f:f||0,s:s+(hashStr(seed+':'+id)%1000)/400});};
 (k.legs||[]).slice(0,2).forEach((x,i)=>add('leg'+i,'leg',7-i,`ชั้น ${x.f} เจอเรื่องระดับตำนาน “${x.t}”`,x.f));
 if(k.betray&&k.betray.length){const b=k.betray[0];add('betray','betray',8,`ชั้น ${b.f} ${b.n}ทรยศ ขโมยทองแล้วหนีไป`,b.f);}
 if(d.bosses>=1&&k.bossLast)add('boss','boss',3.5+Math.min(4,d.bosses),d.bosses>1?`ล้มบอสได้ ${d.bosses} ตัว ตัวสุดท้ายอยู่ชั้น ${k.bossLast}`:`ล้มบอสชั้น ${k.bossLast} ได้`,k.bossLast);
 if(d.petN.length)add('pet','pet',3+d.petN.length,`มี${d.petN.slice(0,2).join('กับ')}อยู่ข้างกายจนวันสุดท้าย`,99);
 if(k.legComp)add('legc','comp',5,`ได้${k.legComp}ทหารรับจ้างระดับตำนานมาร่วมทาง`,k.legCompF||50);
 if(d.gen>=2)add('lin','lin',2+Math.min(5,d.gen),k.master?`ศิษย์รุ่นที่ ${d.gen} ของสาย${d.house}`:`ชาติที่ ${d.gen} ของสาย${d.house}`,0);
 if(d.pct!=null){const p=Math.round(d.pct);if(p>=50)add('odds','cmp',p>=88?6.5:2.5,d.won?`${p}% ของรุ่นเดียวกันขึ้นไปไม่ถึงยอด`:`${p}% ของรุ่นเดียวกันไปไม่ถึงชั้นนี้`,98);
  else add('odds','cmp',p<=12?5:2,`อีก ${100-p}% ของรุ่นเดียวกันไปได้ไกลกว่านี้`,98);}
 if(k.coh>0){if(k.beat===k.coh)add('coh','cmp',5,`ไปได้ไกลกว่าเพื่อนรุ่นเดียวกันทั้ง ${k.coh} คน`,97);else if(k.beat===0)add('coh','cmp',3,`เพื่อนรุ่นเดียวกัน ${k.coh} คนไปไกลกว่าทุกคน`,97);}
 if(k.nearP>=.15&&k.nearF&&k.nearF<d.floor)add('near','near',5,`ชั้น ${k.nearF} โอกาสตายพุ่งถึง ${Math.round(k.nearP*100)}% แต่ก็รอดมาได้`,k.nearF);
 if(d.drg){const c={k:'ดำ',s:'เงิน',g:'ทอง'}[d.drgC]||'';
  add('drg','drg',d.drg==='n'?4.5:9,d.drg==='f'?`ขึ้นไปถึงชั้นลับเหนือยอดหอ ตีมังกร${c}จนยอมแพ้แล้วไว้ชีวิตมัน`:d.drg==='s'?`ขึ้นไปถึงชั้นลับเหนือยอดหอ แล้วฆ่ามังกร${c}ตาย`:d.drg==='x'?`ขึ้นไปถึงชั้นลับเหนือยอดหอ แต่ไปตายต่อหน้ามังกร${c}`:'เจอบันไดลับเหนือยอดหอ แต่ไม่ขึ้นไป',100);}
 if(d.lift)add('lift','lift',8.5,'ตระกูลล้มมังกรครบ 3 ตัว คำสาปนักล่ามังกรเลยหายไป',100.5);
 if(d.title)add('title','title',k.gold?6:3,`ได้ฉายา「${d.title}」`,96);
 if(k.crown)add('crown','crown',5.5,k.crown,95.5);
 if(d.pat)add('pat','pat',4.2,`ลวดลายชะตาคือ ${patEmo(d.pat.code)} 「${d.pat.n}」`,96.5);
 if(Math.abs(d.karma)>=15)add('karma','karma',4,d.karma>0?`ทำบุญไว้จนกรรมดีถึง +${d.karma}`:`สะสมกรรมชั่วไว้ถึง ${d.karma}`,95);
 if(d.scars>=3)add('scar','scar',3,`มีแผลเป็น ${d.scars} แผล แต่ก็ยังเดินต่อ`,94);
 out.sort((a,b)=>b.s-a.s);const g={},pick=[];for(const h of out){if(g[h.g])continue;g[h.g]=1;pick.push(h);if(pick.length>=3)break;}
 return{pick,seed};}
// mode 'x' = X/Twitter text (weighted 240, the link goes in &url=), anything else = text + link within 480 chars
const CLOSE_B=['ฮีโร่คนนี้จะไปได้ถึงชั้นไหน? ทายกันหน่อย','ทายสิว่าจะรอดไปถึงชั้นไหน','ถ้าเป็นคุณ จะเกิดมาดีกว่านี้ไหม?'];
function textBirth(d,mode){d=normB(d);const isX=mode==='x',url=shareUrl(d),budget=isX?240:480,len=isX?xLen:(s=>Array.from(s).length);
 const L=[];if(d.note)L.push(d.note);
 L.push(`🐣 ${d.name} เพิ่งเกิดเป็น${d.clsN||'นักผจญภัย'}แรงค์ ${d.rankK}${d.village?' ที่'+d.village:''}${d.odds?` (1 ใน ${nf(d.odds)})`:''}`);
 if(d.omenN)L.push('ดวงประจำชาติ: '+d.omenN);
 L.push(CLOSE_B[hashStr(d.name+'|'+d.clsId+'|'+d.rankK)%CLOSE_B.length]+' #หอคอยโชคชะตา');
 if(!isX)L.push(url);
 let s=L.join('\n');if(len(s)>budget&&d.note){const over=len(s)-budget;L[0]=clip(d.note,Math.max(10,graphemes(d.note).length-over-1))+'…';s=L.join('\n');}
 return s;}
function textGift(d,mode){d=normG(d);const g=d.gift,isX=mode==='x',url=shareUrl(d),budget=isX?240:480,len=isX?xLen:(s=>Array.from(s).length);
 const L=[];if(d.note)L.push(d.note);
 L.push(`🕯 ${d.name}ไม่ทันได้มี「${g.t}」`);if(g.m)L.push(g.m);
 L.push((d.won?'ชีวิตนี้ขึ้นถึงยอดหอแล้ว':`ชีวิตนี้จบที่ชั้น ${d.floor}`)+' เลยวาดวันนั้นให้แทน #หอคอยโชคชะตา');
 if(!isX)L.push(url);
 let s=L.join('\n');if(len(s)>budget&&d.note){const over=len(s)-budget;L[0]=clip(d.note,Math.max(10,graphemes(d.note).length-over-1))+'…';s=L.join('\n');}
 return s;}
function text(d,mode){if(d&&d.gift)return textGift(d,mode);if(d&&d.birth)return textBirth(d,mode);d=norm(d);const {pick,seed}=hooks(d),isX=mode==='x',url=shareUrl(d),budget=isX?240:480,len=isX?xLen:(s=>Array.from(s).length);
 const birth=`🗼 ${d.name} เกิดเป็น${d.turn||d.clsN||'นักผจญภัย'}แรงค์ ${d.rankK}${d.village?' ที่'+d.village:''}${d.odds?` (1 ใน ${nf(d.odds)})`:''}${d.turn?` แล้วกลายเป็น${d.clsN}กลางหอ`:''}${d.pathN?` ไต่ทางอาชีพจนได้เป็น${d.pathN}`:''}`;
 const death=d.won?'👑 ไต่ขึ้นถึงชั้น 100 และพิชิตยอดหอคอยได้':`💀 ล้มที่ชั้น ${d.floor}: ${d.cause.replace(/\s*\(ชั้น \d+\)\s*$/,'')||'ชะตาขาด'}`;
 const close=CLOSE[seed%CLOSE.length]+' #หอคอยโชคชะตา';
 const fixed=[d.note,birth,death,close].filter(Boolean);let used=fixed.reduce((n,s)=>n+len(s)+1,0)+(isX?0:url.length+1);
 const got=[];for(const h of pick){const t='· '+h.t,n=len(t)+1;if(used+n<=budget){got.push(Object.assign({},h,{t}));used+=n;}}
 got.sort((a,b)=>a.f-b.f);
 const L=[];if(d.note)L.push(d.note);L.push(birth,...got.map(h=>h.t),death,close);if(!isX)L.push(url);
 let s=L.join('\n');if(len(s)>budget&&d.note){/* very long note: trim it */const over=len(s)-budget;L[0]=clip(d.note,Math.max(10,graphemes(d.note).length-over-1))+'…';s=L.join('\n');}
 return s;}

// ---------- share stats (local only; leaderboard.js sends them with the next score) ----------
// tof-share-stat-v1 = {v:1, ao:sheet auto-opened, mo:opened by hand, bo:birth sheet opened, sh:{img,line,x,threads,copy,native,save}, note:shares that carried the player's line}
// sh counts button presses (img = "share as image" pressed, native = the OS share sheet finished, save = save button or the save fallback, copy = either copy button)
const SK='tof-share-stat-v1',SHK=['img','line','x','threads','copy','native','save'];
const cntV=v=>{v=Math.floor(+v);return isFinite(v)&&v>0?Math.min(v,1e9):0;};
function stats(){let o=null;try{o=JSON.parse(localStorage.getItem(SK)||'null');}catch(e){}o=o&&typeof o==='object'?o:{};const sh=o.sh&&typeof o.sh==='object'?o.sh:{};
 const r={v:1,ao:cntV(o.ao),mo:cntV(o.mo),bo:cntV(o.bo),sh:{},note:cntV(o.note)};SHK.forEach(k=>{r.sh[k]=cntV(sh[k]);});return r;}
function statPut(o){try{localStorage.setItem(SK,JSON.stringify(o));}catch(e){}try{if(window.LB&&window.LB.ssSoon)window.LB.ssSoon();}catch(e){}}
function statBump(k){try{const o=stats();o[k]++;statPut(o);}catch(e){}}
// kind = one of SHK; withNote = the shared text/card includes the note line
function track(kind,withNote){try{const o=stats();o.sh[kind]++;if(withNote&&state&&state.d&&state.d.note)o.note++;statPut(o);}catch(e){}}

// ---------- sheet ----------
const CSS=`
.shs{border:0;padding:0;margin:auto auto 0;width:100%;max-width:540px;max-height:94dvh;background:transparent;color:#f1e7d0;font-family:${fT};overflow:visible}
.shs::backdrop{background:rgba(4,8,10,.72)}
.shs[open]{animation:shsUp .28s ease-out}
@keyframes shsUp{from{transform:translateY(40px)}to{transform:none}}
@media (prefers-reduced-motion:reduce){.shs[open]{animation:none}}
@media (min-width:700px){.shs{margin:auto;max-height:92vh}.shs .shs-box{border-radius:10px;border-bottom:3px solid #b97a22}}
.shs-box{background:#15232a;border:3px solid #b97a22;border-bottom:0;border-radius:14px 14px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.55);max-height:inherit;overflow:auto;overscroll-behavior:contain;
 padding:14px 16px calc(16px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:10px;box-sizing:border-box}
.shs-box>*{flex-shrink:0}
.shs-hd{display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:-14px;background:#15232a;margin:-14px -16px 0;padding:12px 16px 8px;z-index:1;border-bottom:1px solid #2c434d}
.shs-hd h2{margin:0;font:500 18px ${fT};color:#f4bb4a}
.shs-x{background:#1c2e36;border:1px solid #3d5a66;color:#f1e7d0;font:400 14px ${fT};padding:6px 14px;border-radius:4px;cursor:pointer;min-height:36px}
.shs-lead{margin:2px 0 0;font-size:15px;line-height:1.55;color:#f1e7d0}
.shs-lab{font-size:13px;color:#a3b5ad;display:flex;justify-content:space-between;gap:8px}
.shs textarea{width:100%;box-sizing:border-box;min-height:64px;resize:vertical;background:#0f1a1f;color:#f1e7d0;border:2px solid #3d5a66;border-radius:6px;padding:9px 11px;font:400 15px/1.5 ${fT}}
.shs textarea:focus{outline:2px solid #f4bb4a;outline-offset:1px;border-color:#b97a22}
.shs-hint{font-size:12px;color:#6f857e;margin:-4px 0 0}
.shs-care{font-size:13.5px;line-height:1.6;color:#f1e7d0;background:#1d2f2a;border:1px solid #4f8a72;border-radius:6px;padding:9px 11px;margin:0}
.shs-pri{display:flex;flex-direction:column;align-items:center;gap:3px;line-height:1.3;width:100%;background:#e86a3a;color:#1a0b04;border:2px solid #000;border-radius:8px;padding:12px 10px;cursor:pointer;
 box-shadow:inset 0 -4px 0 #a8431c,inset 0 2px 0 #ffb08a;font:600 19px ${fT};min-height:60px}
.shs-pri small{display:block;font:400 12.5px/1.4 ${fT};color:#3a1606}
.shs-pri:hover{filter:brightness(1.06)}.shs-pri:active{transform:translateY(1px)}
.shs-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.shs-grid button,.shs-mini button{font:500 14.5px ${fT};color:#f1e7d0;background:#1c2e36;border:2px solid #3d5a66;border-radius:6px;padding:10px 8px;cursor:pointer;min-height:46px;display:flex;align-items:center;justify-content:center;gap:7px}
.shs-grid button:hover,.shs-mini button:hover{border-color:#b97a22}
.shs-grid .ln{background:#06c755;border-color:#048a3b;color:#fff}
.shs-grid .ln:hover{border-color:#fff}
.shs-grid i{font-style:normal;font-weight:600}
.shs-mini{display:flex;gap:8px}.shs-mini button{flex:1;min-height:38px;font-size:13px;background:transparent}
.shs details{font-size:13px;color:#a3b5ad}
.shs summary{cursor:pointer;padding:4px 0;color:#f4bb4a}
.shs pre{white-space:pre-wrap;word-break:break-word;font:400 13.5px/1.6 ${fT};color:#f1e7d0;background:#0f1a1f;border:1px solid #2c434d;border-radius:6px;padding:10px;margin:6px 0 0}
.shs-img{display:block;width:100%;height:auto;aspect-ratio:4/5;border-radius:6px;background:#efe4c8;border:2px solid #000}
.shs-load{display:grid;place-items:center;aspect-ratio:4/5;color:#6f857e;background:#0f1a1f;border-radius:6px;font:400 15px ${fT}}
.shs-note{font-size:12px;color:#6f857e;margin:0;line-height:1.5}
.shs-inapp{font-size:13px;color:#f2c14e;background:#2a2414;border:1px solid #6a5420;border-radius:6px;padding:8px 10px;margin:0;line-height:1.5}
.shs-msg{min-height:18px;font-size:13px;color:#86d67f;text-align:center;margin:0}
.shs :focus-visible{outline:3px solid #ffd76a;outline-offset:2px}
.tof-friend{display:flex;gap:10px;align-items:flex-start;margin:10px 0 0;padding:10px 12px;background:#2a2414;border:2px solid #b97a22;border-radius:6px;font-size:14px;line-height:1.55;color:#f1e7d0;box-shadow:0 0 0 2px #070c0e}
.tof-friend .fi{flex:none;font-size:20px;line-height:1.2}
.tof-friend .ft{flex:1;min-width:0}.tof-friend b{color:#f4bb4a;font-weight:500}
.tof-friend button{flex:none;background:none;border:1px solid #6a5420;color:#a3b5ad;border-radius:4px;padding:2px 9px;font:400 13px ${fT};cursor:pointer;min-height:30px}
`;
const INAPP=/\bLine\/|FBAN|FBAV|FB_IAB|Instagram|Barcelona|Threads|KAKAOTALK|Twitter/i.test(navigator.userAgent||'');
const MOBILE=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
let dlg=null,state=null,lastFocus=null,cssDone=false;
function el(tag,attrs,txt){const e=document.createElement(tag);if(attrs)for(const k in attrs)e.setAttribute(k,attrs[k]);if(txt!=null)e.textContent=txt;return e;}
function css(){if(cssDone)return;cssDone=true;const st=el('style');st.textContent=CSS;document.head.appendChild(st);}
function placeholders(d){if(d.birth){const P=[];
  if(d.rankIdx>=6)P.push('ชาตินี้ดวงมาแล้ว','แรงค์นี้ต้องไปได้ไกลแน่');if(d.rankIdx<=1)P.push('เกิดมาก็ต้องสู้ชีวิตเลย');
  P.push('ขอแค่รอดเกินชั้น 10 ก็พอ','หน้าตาดีกว่าฝีมืออีก');return [...new Set(P)].map(s=>'เช่น '+s);}
 const P=[],k=d.hk||{};
 if(d.won)P.push('ในที่สุดก็ได้ยืนบนยอดหอ');
 if(!d.won&&d.floor<=12)P.push('ยังไม่ทันได้เริ่มเลย');
 if(!d.won&&d.med&&d.floor>d.med+8)P.push('ไปได้ไกลกว่าที่คิดไว้เยอะ');
 if(d.petN.length)P.push('คิดถึง'+d.petN[0]+'นะ');
 if(k.betray&&k.betray.length)P.push('ไม่น่าไว้ใจ'+k.betray[0].n+'เลย');
 if(!d.won&&/บอส/.test(d.cause))P.push('ไม่น่าไปท้าบอสเลย');
 if(d.karma>=15)P.push('ทำดีไว้เยอะ ก็ยังไปไม่ถึงอยู่ดี');
 if(d.karma<=-15)P.push('ชาตินี้บาปเยอะไปหน่อย');
 if(d.gen>=2)P.push('ฝากสายตระกูลไว้กับรุ่นต่อไปด้วย');
 P.push('ชาตินี้ขอแค่นี้ก่อน','ชะตามันลิขิตไว้แล้วจริงๆ');
 return [...new Set(P)].map(s=>'เช่น '+s);}
function build(){
 if(dlg)return dlg;css();
 dlg=el('dialog',{class:'shs','aria-labelledby':'shs-ttl'});
 const box=el('div',{class:'shs-box'});
 const hd=el('div',{class:'shs-hd'});const ttl=el('h2',{id:'shs-ttl'},'แชร์ชีวิตนี้');hd.append(ttl);const x=el('button',{class:'shs-x',type:'button'},'ปิด');hd.append(x);
 const lead=el('p',{class:'shs-lead'});
 const lab=el('label',{class:'shs-lab',for:'shs-note'});const labT=el('span');lab.append(labT);const cnt=el('span',{'aria-live':'off'},'0/120');lab.append(cnt);
 const ta=el('textarea',{id:'shs-note',maxlength:'120',rows:'2',autocomplete:'off'});
 const hint=el('p',{class:'shs-hint'},'ถ้าเขียนไว้ จะขึ้นเป็นบรรทัดแรกของโพสต์และอยู่บนการ์ดด้วย');
 const care=el('p',{class:'shs-care',role:'status'},CARE);care.hidden=true;
 const inapp=el('p',{class:'shs-inapp'},'แอปที่เปิดเกมอยู่ตอนนี้ (เช่น LINE หรือ Facebook) แชร์รูปตรงๆ ไม่ได้ ให้กดคัดลอกข้อความกับลิงก์ไปวางแทน ส่วนรูปการ์ด กดค้างที่รูปด้านล่างแล้วเลือกบันทึก หรือแตะ ⋯ แล้วเลือกเปิดในเบราว์เซอร์');inapp.hidden=!INAPP;
 const pri=el('button',{type:'button',class:'shs-pri'});
 const grid=el('div',{class:'shs-grid'});
 const bLine=el('button',{type:'button',class:'ln'});bLine.innerHTML='<i>LINE</i> ส่งใน LINE';
 const bX=el('button',{type:'button'});bX.innerHTML='<i>𝕏</i> โพสต์ลง X';
 const bTh=el('button',{type:'button'});bTh.innerHTML='<i>@</i> โพสต์ลง Threads';
 const bCopy=el('button',{type:'button'},'คัดลอกข้อความและลิงก์');
 grid.append(bLine,bX,bTh,bCopy);
 const mini=el('div',{class:'shs-mini'});const bSave=el('button',{type:'button'},'บันทึกรูปการ์ด'),bLink=el('button',{type:'button'},'คัดลอกเฉพาะลิงก์');mini.append(bSave,bLink);
 const msg=el('p',{class:'shs-msg',role:'status','aria-live':'polite'});
 const det=el('details');det.append(el('summary',null,'ดูข้อความที่จะโพสต์'));const pre=el('pre');det.append(pre);
 const hold=el('p',{class:'shs-note'},'กดค้างที่รูปเพื่อบันทึก');hold.hidden=!INAPP;
 const wrap=el('div');
 const foot=el('p',{class:'shs-note'},'ลิงก์ที่ส่งใน LINE, X และ Threads จะมีภาพตัวอย่างขึ้นเอง ถ้าอยากให้เพื่อนเห็นการ์ดใบนี้ด้วย ให้บันทึกรูปแล้วแนบไปกับโพสต์');
 box.append(hd,lead,lab,ta,hint,care,inapp,pri,grid,mini,msg,det,hold,wrap,foot);dlg.append(box);document.body.append(dlg);
 dlg._={ttl,labT,box,lead,ta,care,cnt,pri,bLine,bX,bTh,bCopy,bSave,bLink,msg,pre,wrap};
 x.onclick=close;
 dlg.addEventListener('cancel',e=>{e.preventDefault();close();});
 dlg.addEventListener('click',e=>{if(e.target!==dlg)return;const r=box.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
 dlg.addEventListener('keydown',e=>{if(e.key==='Tab'){const f=[...dlg.querySelectorAll('button:not([hidden]),textarea,summary')].filter(n=>n.offsetParent!==null);if(!f.length)return;const a=f[0],z=f[f.length-1];
  if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}});
 ta.addEventListener('input',()=>{if(!state)return;state.d.note=cleanNote(ta.value);care.hidden=!crisis(ta.value);cnt.textContent=Array.from(ta.value).length+'/120';refreshText();clearTimeout(state.rt);state.rt=setTimeout(()=>redraw(),450);
  try{if(state.onNote)state.onNote(state.d.note);}catch(e){}});
 pri.onclick=()=>{if(INAPP){track('copy',true);copy(true);}else{track('img',true);shareImage();}};
 bCopy.onclick=()=>{track('copy',true);copy(true);};bLink.onclick=()=>{track('copy',false);copy(false);};bSave.onclick=()=>{track('save',false);save();};
 bLine.onclick=()=>{const s=state;if(!s)return;track('line',true);const t=text(s.d,'line');go(MOBILE?'https://line.me/R/msg/text/?'+encodeURIComponent(t):'https://social-plugins.line.me/lineit/share?url='+encodeURIComponent(s.url)+'&text='+encodeURIComponent(t));};
 bX.onclick=()=>{const s=state;if(!s)return;track('x',true);go('https://x.com/intent/tweet?text='+encodeURIComponent(text(s.d,'x'))+'&url='+encodeURIComponent(s.url));};
 bTh.onclick=()=>{const s=state;if(!s)return;track('threads',true);go('https://www.threads.net/intent/post?text='+encodeURIComponent(text(s.d,'threads')));};
 return dlg;}
function go(u){const w=window.open(u,'_blank','noopener');if(!w)location.href=u;}
function say(t,bad){if(!dlg)return;const m=dlg._.msg;m.style.color=bad?'#ef6b5e':'#86d67f';m.textContent=t;clearTimeout(say._t);say._t=setTimeout(()=>{m.textContent='';},2800);}
function fname(d){return 'tower-of-fate-'+(str(d.name).trim().replace(/[\\/:*?"<>|\s]+/g,'-').slice(0,40)||'hero')+'-'+(d.gift?'wish-'+str(d.gift.k):d.birth?'birth':d.floor)+'.png';}
function refreshText(){const s=state;if(!s)return;dlg._.pre.textContent=text(s.d,'full');}
function redraw(){const s=state;if(!s)return;s.blob=null;const D=dlg._,v=++s.ver;
 if(!D.wrap.querySelector('img'))D.wrap.replaceChildren(el('div',{class:'shs-load'},'กำลังวาดการ์ด…'));
 s.cvP=render(s.d);
 s.cvP.then(cv=>{if(s!==state||v!==s.ver)return;let img=D.wrap.querySelector('img');
  if(!img){img=el('img',{class:'shs-img',width:'1080',height:'1350'});D.wrap.replaceChildren(img);}
  img.alt=s.d.gift?'การ์ดความปรารถนาของ '+s.d.name+': '+s.d.gift.t:s.d.birth?'การ์ดแรกเกิดของ '+s.d.name+': '+s.d.clsN+'แรงค์ '+s.d.rankK:'การ์ดของ '+s.d.name+': '+(s.d.won?'พิชิตยอดหอคอย':'ไปถึงชั้น '+s.d.floor+' จาก 100');img.src=cv.toDataURL('image/png');
  cv.toBlob(b=>{if(s===state&&v===s.ver)s.blob=b;},'image/png');}).catch(()=>{if(s===state)D.wrap.replaceChildren(el('div',{class:'shs-load'},'วาดการ์ดไม่สำเร็จ'));});
 return s.cvP;}
function getBlob(){const s=state;if(!s)return Promise.resolve(null);if(s.blob)return Promise.resolve(s.blob);
 return s.cvP.then(cv=>new Promise(r=>cv.toBlob(b=>{if(s===state)s.blob=b;r(b);},'image/png')));}
function dl(b,name){const u=URL.createObjectURL(b);const a=el('a',{href:u,download:name});a.style.display='none';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);}
async function save(){const s=state;const b=await getBlob();if(!b||s!==state)return;dl(b,fname(s.d));say('บันทึกรูปแล้ว');}
async function shareImage(){const s=state;if(!s)return;const t=text(s.d,'full');
 try{const b=s.blob||await getBlob();let file=null;try{file=b&&new File([b],fname(s.d),{type:'image/png'});}catch(e){}
  if(file&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:t});track('native',false);return;}
  if(b){track('save',false);dl(b,fname(s.d));say('เครื่องนี้แชร์รูปตรงๆ ไม่ได้ เลยบันทึกรูปให้แทน');}
 }catch(e){if(e&&e.name!=='AbortError')say('แชร์ไม่สำเร็จ ลองบันทึกรูปแทน',true);}}
async function copy(all){const s=state;if(!s)return;const t=all?text(s.d,'full'):s.url;let ok=false;
 try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(t);ok=true;}}catch(e){}
 if(!ok){try{const ta=el('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0;left:-9999px';dlg.append(ta);ta.select();ok=document.execCommand('copy');ta.remove();}catch(e){}}
 say(ok?(all?'คัดลอกข้อความกับลิงก์แล้ว':'คัดลอกลิงก์แล้ว'):'คัดลอกไม่ได้',!ok);}
function close(){if(!dlg)return;if(dlg.open){try{dlg.close();}catch(e){dlg.removeAttribute('open');}}if(state){clearInterval(state.ph);clearTimeout(state.rt);}state=null;
 const f=lastFocus;lastFocus=null;if(f&&f.focus&&document.contains(f))try{f.focus({preventScroll:true});}catch(e){}}
function open(d,opt){opt=opt||{};statBump(opt.auto?'ao':'mo');return openSheet(norm(d),opt);}
function openBirth(d,opt){opt=opt||{};statBump('bo');return openSheet(normB(d),Object.assign({},opt,{auto:false}));}
// wish card sheet: same sheet, its own title and lead
function openGift(d,opt){opt=opt||{};statBump('mo');const p=openSheet(normG(d),Object.assign({},opt,{auto:false}));const D=dlg._;
 D.ttl.textContent='แชร์วันที่มอบให้';D.labT.textContent='อยากเขียนอะไรถึงวันนี้ไหม (ไม่ต้องเขียนก็ได้)';D.lead.textContent=`วันที่${str(d.name)||'ฮีโร่'}ไม่ทันได้มี ส่งให้เพื่อนดูก็ได้`;return p;}
function openSheet(d,opt){
 build();const D=dlg._;
 if(!dlg.open)lastFocus=document.activeElement;
 if(state){clearInterval(state.ph);clearTimeout(state.rt);}
 state={d,blob:null,ver:0,url:shareUrl(d),onNote:typeof opt.onNote==='function'?opt.onNote:null};const s=state;
 D.ttl.textContent=d.birth?'แชร์ฮีโร่ที่เพิ่งเกิด':'แชร์ชีวิตนี้';
 D.labT.textContent=d.birth?'อยากฝากอะไรถึงฮีโร่คนนี้ไหม (ไม่ต้องเขียนก็ได้)':'ความรู้สึกหนึ่งบรรทัดหลังจบชีวิตนี้ (ไม่ต้องเขียนก็ได้)';
 D.lead.textContent=d.birth?'ฮีโร่คนนี้เพิ่งเกิด ส่งให้เพื่อนทายกันไหมว่าจะไปได้ถึงชั้นไหน?':opt.auto?(d.won?'ชีวิตนี้ขึ้นถึงยอดหอแล้ว เขียนอะไรถึงมันสักบรรทัด แล้วอวดเพื่อนไหม?':'ชีวิตนี้จบลงแล้ว ลองเขียนความรู้สึกสักบรรทัด แล้วส่งให้เพื่อนดูไหม?'):'อยากเขียนความรู้สึกก็เขียนสั้นๆ ไว้ได้ แล้วเลือกว่าจะแชร์ทางไหน';
 D.ta.value=d.note;D.care.hidden=true;D.cnt.textContent=Array.from(d.note).length+'/120';
 const ph=placeholders(d);let pi=hashStr(d.name)%ph.length;D.ta.placeholder=ph[pi];s.ph=setInterval(()=>{if(document.activeElement===D.ta&&D.ta.value)return;pi=(pi+1)%ph.length;D.ta.placeholder=ph[pi];},3200);
 const canFiles=!INAPP&&!!(navigator.canShare&&(()=>{try{return navigator.canShare({files:[new File([''],'a.png',{type:'image/png'})]});}catch(e){return false;}})());
 D.pri.innerHTML='';D.pri.append(document.createTextNode(INAPP?'คัดลอกข้อความและลิงก์':'แชร์เป็นรูปภาพ'),el('small',null,INAPP?'แล้วไปวางในแชตหรือโพสต์ได้เลย':canFiles?'LINE · Facebook · Instagram · X และแอปอื่นๆ':'เครื่องนี้แชร์รูปตรงๆ ไม่ได้ จะบันทึกรูปการ์ดให้แทน'));
 D.bCopy.hidden=INAPP;D.msg.textContent='';D.wrap.replaceChildren(el('div',{class:'shs-load'},'กำลังวาดการ์ด…'));
 refreshText();
 if(!dlg.open){try{dlg.showModal();}catch(e){dlg.setAttribute('open','');}}
 D.box.scrollTop=0;try{(opt.auto&&!MOBILE?D.ta:D.pri).focus({preventScroll:true});}catch(e){}
 return redraw();}

// ---------- "someone sent you a fate" ----------
let friend=null,friendEl=null,fShown=false,lastPh='';
function readFriend(){try{const L=location;let code=null,m=L.pathname.match(/\/s\/([A-Za-z0-9_-]+)\/?$/);if(m)code=m[1];
  const q=new URLSearchParams(L.search);if(!code&&q.get('s'))code=q.get('s');if(!code)return;
  friend=decode(code);
  q.delete('s');const base=L.pathname.replace(/\/s\/[^/]*\/?$/,'/');const qs=q.toString();history.replaceState(history.state,'',base+(qs?'?'+qs:'')+L.hash);
 }catch(e){}}
function showFriend(){if(!friend||friendEl||fShown)return;const main=document.querySelector('main.main')||document.querySelector('.wrap');if(!main)return;css();
 const f=friend;friendEl=el('div',{class:'tof-friend',role:'note'});
 const t=el('div',{class:'ft'});
 if(f.birth){t.append('มีคนส่งฮีโร่ที่เพิ่งเกิดมาให้ดู: ',el('b',null,f.name),` ${f.clsN}แรงค์ ${f.rankK}${f.odds>1?` (1 ใน ${nf(f.odds)})`:''} ทายสิว่าจะไปได้ถึงชั้นไหน หรือจะลองเกิดมาแข่งกันก็ได้`);}
 else{t.append('มีคนส่งชะตามาให้คุณ: ');const b=el('b',null,f.name);t.append(b,` ${f.clsN}แรงค์ ${f.rankK}${f.title?` 「${f.title}」`:''} `);
 t.append(f.drg==='f'?'พิชิตยอดหอคอย แล้วยังไว้ชีวิตมังกรบนชั้นลับด้วย คุณจะทำได้แบบนี้ไหม?':f.drg==='s'?'พิชิตยอดหอคอย แล้วยังล้มมังกรบนชั้นลับได้ด้วย คุณจะทำได้แบบนี้ไหม?':f.won?'พิชิตยอดหอคอยได้ คุณจะทำได้แบบเดียวกันไหม?':`ไปถึงชั้น ${f.floor} คุณจะไปได้ไกลกว่านี้ไหม?`);}
 const x=el('button',{type:'button','aria-label':'ปิดข้อความนี้'},'ปิด');x.onclick=hideFriend;
 friendEl.append(el('span',{class:'fi','aria-hidden':'true'},f.birth?'🐣':'📜'),t,x);main.parentNode.insertBefore(friendEl,main);fShown=true;}
function hideFriend(){if(friendEl){friendEl.remove();}friend=null;}
function onPhase(ph){if(friend&&!fShown)showFriend();if(friendEl&&lastPh==='birth'&&ph!=='birth')hideFriend();lastPh=ph;}
readFriend();
if(friend)setTimeout(showFriend,0); // auto.js normally shows it first through onPhase()

window.SHARE={open,openBirth,openGift,stats,crisis,close,render,text,url:shareUrl,encode,decode,onPhase,get friend(){return friend;},get isOpen(){return!!(dlg&&dlg.open);}};
})();
