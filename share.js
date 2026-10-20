// share.js — share card (600x750 PNG) + share dialog for หอคอยโชคชะตา.
// API: window.SHARE = { open(d), render(d) -> Promise<HTMLCanvasElement> }
(function(){
'use strict';
const URL_='https://tower-of-fate.pages.dev',HOST='tower-of-fate.pages.dev';
const W=600,H=750;
const C={bg:'#0b1215',bg2:'#101b20',panel:'#15232a',panel2:'#1c2e36',line:'#2c434d',line2:'#3d5a66',ink:'#f1e7d0',muted:'#a3b5ad',dim:'#6f857e',
 gold:'#f4bb4a',gold2:'#b97a22',ember:'#e86a3a',good:'#86d67f',bad:'#ef6b5e',karma:'#d7b8f0',mp:'#4fa6e0'};
const fT="'Mitr','Kanit','Noto Sans Thai',system-ui,sans-serif",fP="'DotGothic16','Mitr',monospace";

// ---------- helpers ----------
function hashStr(s){let h=2166136261>>>0;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const nf=n=>Number(n||0).toLocaleString('en-US');
const sgn=n=>(n>0?'+':'')+nf(n);
const str=v=>v==null?'':String(v);
function norm(d){d=Object.assign({},d||{});d.name=str(d.name)||'นักผจญภัยนิรนาม';d.village=str(d.village);d.rankK=str(d.rankK)||'?';d.rankCol=d.rankCol||C.gold;
 d.clsN=str(d.clsN);d.floor=Math.max(0,Math.round(+d.floor||0));d.won=!!d.won;d.title=str(d.title);d.cause=str(d.cause);
 d.karma=+d.karma||0;d.score=+d.score||0;d.date=d.date||Date.now();d.pets=Array.isArray(d.pets)?d.pets:[];return d;}

let fontsP=null;
function waitFonts(){
 if(fontsP)return fontsP;
 const fs=document.fonts;if(!fs||!fs.load)return fontsP=Promise.resolve();
 const sample='ชั้นหอคอยโชคชะตา 0123 ABC';
 const loads=Promise.all(['400 20px Mitr','500 20px Mitr','600 20px Mitr','20px "DotGothic16"'].map(f=>fs.load(f,sample).catch(()=>null))).then(()=>fs.ready);
 return fontsP=Promise.race([loads,new Promise(r=>setTimeout(r,2500))]).then(()=>{});
}
function setF(ctx,weight,size,fam){ctx.font=(weight?weight+' ':'')+size+'px '+fam;}
// shrink font until text fits maxW (down to min), then ellipsize
function fit(ctx,text,maxW,size,weight,fam,min){
 min=min||Math.round(size*.55);let s=size;setF(ctx,weight,s,fam);
 while(s>min&&ctx.measureText(text).width>maxW){s--;setF(ctx,weight,s,fam);}
 if(ctx.measureText(text).width>maxW){const ch=Array.from(text);while(ch.length>1&&ctx.measureText(ch.join('')+'…').width>maxW)ch.pop();text=ch.join('')+'…';}
 return {text,size:s};
}
function txt(ctx,text,x,y,o){o=o||{};if(!text)return 0;
 const r=fit(ctx,text,o.maxW||W-96,o.size||20,o.weight||'',o.fam||fT,o.min);
 ctx.textAlign=o.align||'center';ctx.textBaseline=o.base||'alphabetic';
 if(o.shadow!==false){ctx.fillStyle=o.shadowCol||'rgba(0,0,0,.65)';ctx.fillText(r.text,x+(o.sd||2),y+(o.sd||2));}
 ctx.fillStyle=o.col||C.ink;ctx.fillText(r.text,x,y);return r.size;}
function pxRect(ctx,x,y,w,h,col){ctx.fillStyle=col;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}

// ---------- background ----------
function drawBg(ctx,d,rnd){
 const g=ctx.createLinearGradient(0,0,0,H);
 if(d.won){g.addColorStop(0,'#1a1430');g.addColorStop(.55,'#122029');g.addColorStop(1,'#0b1215');}
 else{g.addColorStop(0,'#070c12');g.addColorStop(.55,'#0f1a20');g.addColorStop(1,'#0b1215');}
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // stars (pixel squares, seeded)
 for(let i=0;i<150;i++){const x=rnd()*W,y=rnd()*H*.8,s=rnd()<.12?3:rnd()<.4?2:1,a=.25+rnd()*.7;
  ctx.globalAlpha=a*(1-y/(H*.95));ctx.fillStyle=rnd()<.15?'#ffe7a8':rnd()<.2?'#bfe0ff':'#ffffff';ctx.fillRect(Math.round(x),Math.round(y),s,s);
  if(s===3&&rnd()<.5){ctx.fillRect(Math.round(x)-2,Math.round(y)+1,7,1);ctx.fillRect(Math.round(x)+1,Math.round(y)-2,1,7);}}
 ctx.globalAlpha=1;
 // moon
 const mx=70+rnd()*460,my=60+rnd()*60;ctx.globalAlpha=.18;ctx.fillStyle='#f6e7b8';
 for(let r=22;r>0;r-=2){const w=Math.round(Math.sqrt(22*22-r*r))*2;ctx.fillRect(mx-w/2,my-r,w,2);ctx.fillRect(mx-w/2,my+r-2,w,2);}
 ctx.globalAlpha=1;
 // distant hills
 ctx.fillStyle='#0d171c';let hy=H-150;for(let x=0;x<W;x+=6){hy+=Math.round((rnd()-.5)*8);hy=Math.max(H-190,Math.min(H-120,hy));ctx.fillRect(x,hy,6,H-hy);}
 // tower silhouette (seeded windows)
 const tw=120,tx=W/2-tw/2,ty=60;ctx.globalAlpha=.55;
 const tg=ctx.createLinearGradient(0,ty,0,H);tg.addColorStop(0,'#16242b');tg.addColorStop(1,'#0c1418');ctx.fillStyle=tg;
 for(let y=ty;y<H;y+=4){const k=Math.min(1,(y-ty)/260),w=Math.round(tw*(.55+.45*k)/4)*4;ctx.fillRect(Math.round(W/2-w/2),y,w,4);}
 // battlements
 for(let i=0;i<5;i++)ctx.fillRect(W/2-34+i*16,ty-10,8,10);
 ctx.globalAlpha=1;
 for(let y=ty+24;y<H-60;y+=26){const k=Math.min(1,(y-ty)/260),w=tw*(.55+.45*k);for(let x=W/2-w/2+10;x<W/2+w/2-14;x+=18){if(rnd()<.32){ctx.globalAlpha=.25+rnd()*.35;ctx.fillStyle=rnd()<.8?'#f4bb4a':'#e86a3a';ctx.fillRect(Math.round(x),y,6,8);}}}
 ctx.globalAlpha=1;
 // vignette
 const v=ctx.createRadialGradient(W/2,H*.42,120,W/2,H*.5,520);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.6)');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
}
function drawFrame(ctx,won){
 const o=12;pxRect(ctx,o,o,W-2*o,4,C.gold2);pxRect(ctx,o,H-o-4,W-2*o,4,C.gold2);pxRect(ctx,o,o,4,H-2*o,C.gold2);pxRect(ctx,W-o-4,o,4,H-2*o,C.gold2);
 const i=o+6;ctx.fillStyle=C.gold;
 for(let x=i;x<W-i;x+=12){ctx.fillRect(x,i,8,3);ctx.fillRect(x,H-i-3,8,3);}
 for(let y=i;y<H-i;y+=12){ctx.fillRect(i,y,3,8);ctx.fillRect(W-i-3,y,3,8);}
 // corner studs
 [[o-4,o-4],[W-o-12,o-4],[o-4,H-o-12],[W-o-12,H-o-12]].forEach(([x,y])=>{pxRect(ctx,x,y,16,16,C.gold2);pxRect(ctx,x+3,y+3,10,10,won?'#ffe58a':C.gold);pxRect(ctx,x+6,y+6,4,4,'#fff4c8');});
 // outer black edge
 ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.strokeRect(o-1,o-1,W-2*o+2,H-2*o+2);
}

// ---------- hero ----------
const CROWN=['..y..y..y..','..y..y..y..','.yyy.yyy.yy','.yryyyyyryy','yyyyyyyyyyy','ydydydydydy','yyyyyyyyyyy'];
function drawPix(ctx,rows,pal,x,y,s){rows.forEach((r,j)=>{for(let i=0;i<r.length;i++){const c=pal[r[i]];if(!c)continue;ctx.fillStyle=c;ctx.fillRect(x+i*s,y+j*s,s,s);}});}
function heroCanvas(d){
 const A=window.ART;if(!A||!A.heroSpr||!A.sprCanvas)return null;
 try{const spr=A.heroSpr(d.clsId||'war',d.look);return {spr,c:A.sprCanvas(spr,false,false,'share')};}catch(e){return null;}
}
function bounds(spr){let top=spr.h,bot=0,l=spr.w,r=0;spr.rows.forEach((row,y)=>{for(let x=0;x<row.length;x++)if(row[x]!=='.'&&spr.pal[row[x]]){top=Math.min(top,y);bot=Math.max(bot,y);l=Math.min(l,x);r=Math.max(r,x);}});
 if(top>bot)return{top:0,bot:spr.h-1,l:0,r:spr.w-1};return{top,bot,l,r};}
function drawHero(ctx,d,cy){
 const h=heroCanvas(d);
 // pedestal glow
 const gl=ctx.createRadialGradient(W/2,cy+40,10,W/2,cy+40,150);gl.addColorStop(0,d.won?'rgba(244,187,74,.35)':'rgba(120,170,230,.22)');gl.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gl;ctx.fillRect(W/2-160,cy-110,320,300);
 if(!h){txt(ctx,d.won?'♛':'✦',W/2,cy+30,{size:96,fam:fT,col:C.gold});return;}
 const {spr,c}=h,b=bounds(spr),bw=b.r-b.l+1,bh=b.bot-b.top+1;
 const s=Math.max(2,Math.min(8,Math.floor(150/Math.max(bw,bh))));
 const dw=spr.w*s,dh=spr.h*s,x=Math.round(W/2-(b.l+bw/2)*s),y=Math.round(cy+70-(b.bot+1)*s);
 // ground shadow
 ctx.fillStyle='rgba(0,0,0,.45)';const sw=Math.round(bw*s*.7);ctx.fillRect(W/2-sw/2,y+(b.bot+1)*s-4,sw,8);ctx.fillRect(W/2-sw/2+8,y+(b.bot+1)*s+4,sw-16,4);
 let src=c;
 if(!d.won){ // ghost-ish tint
  const t=document.createElement('canvas');t.width=spr.w;t.height=spr.h;const tc=t.getContext('2d');tc.drawImage(c,0,0);
  tc.globalCompositeOperation='source-atop';tc.fillStyle='rgba(150,190,255,.5)';tc.fillRect(0,0,t.width,t.height);src=t;
 }
 ctx.imageSmoothingEnabled=false;
 if(!d.won)ctx.globalAlpha=.82;
 ctx.drawImage(src,x,y,dw,dh);ctx.globalAlpha=1;
 if(d.won){const cs=Math.max(3,s-2),cw=CROWN[0].length*cs;drawPix(ctx,CROWN,{y:'#f6d84e',r:'#e0574b',d:'#b97a22'},Math.round(W/2-cw/2),y+b.top*s-CROWN.length*cs-4,cs);
  // sparkles
  ctx.fillStyle='#fff4c8';[[-90,-20],[86,-40],[-70,50],[96,30]].forEach(([dx,dy])=>{const px=W/2+dx,py=cy+dy;ctx.fillRect(px-1,py-6,3,13);ctx.fillRect(px-6,py-1,13,3);});}
 else{ // halo
  ctx.strokeStyle='rgba(200,224,255,.7)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(W/2,y+b.top*s-12,Math.max(18,bw*s*.28),7,0,0,Math.PI*2);ctx.stroke();}
 // pets beside hero
 const P=window.ART&&window.ART.PSPR;
 if(P&&d.pets.length){d.pets.slice(0,2).forEach((k,i)=>{const ps=P[k];if(!ps)return;try{const pc=window.ART.sprCanvas(ps,i===0,false,'sharepet');const sc=4;
  const px=i===0?W/2-bw*s/2-ps.w*sc-14:W/2+bw*s/2+14,py=cy+70-ps.h*sc;if(!d.won)ctx.globalAlpha=.75;ctx.drawImage(pc,Math.round(px),Math.round(py),ps.w*sc,ps.h*sc);ctx.globalAlpha=1;}catch(e){}});}
}
function badge(ctx,x,y,size,letter,col){
 pxRect(ctx,x,y+4,size,size-8,'#000');pxRect(ctx,x+4,y,size-8,size,'#000');
 pxRect(ctx,x+3,y+6,size-6,size-12,col);pxRect(ctx,x+6,y+3,size-12,size-6,col);
 pxRect(ctx,x+6,y+6,size-12,4,'rgba(255,255,255,.35)');
 ctx.textAlign='center';ctx.textBaseline='middle';setF(ctx,'',Math.round(size*.62),fP);ctx.fillStyle='#1a1010';ctx.fillText(letter,x+size/2,y+size/2+2);
}

// ---------- render ----------
async function render(d){
 d=norm(d);await waitFonts();
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
 const rnd=mulberry32(hashStr(d.name+'|'+d.village+'|'+d.clsId));
 drawBg(ctx,d,rnd);drawFrame(ctx,d.won);
 // header
 txt(ctx,'TOWER OF FATE',W/2,58,{size:18,fam:fP,col:C.gold,sd:2});
 if(d.gen>1)txt(ctx,'รุ่นที่ '+d.gen,W-48,58,{size:16,weight:500,align:'right',col:C.karma,maxW:120});
 txt(ctx,new Date(d.date).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}),48,58,{size:14,align:'left',col:C.dim,maxW:150});
 drawHero(ctx,d,150);
 // name
 let y=286;txt(ctx,d.name,W/2,y,{size:36,weight:600,maxW:500,min:18,col:d.won?'#ffe7a0':C.ink,sd:3});
 // rank badge + class · village
 y+=16;const line=[d.clsN,d.village].filter(Boolean).join(' · ');
 const lr=fit(ctx,line,420,20,400,fT,13),bs=40;ctx.font='400 '+lr.size+'px '+fT;const lw=line?ctx.measureText(lr.text).width:0,tot=bs+(line?12+lw:0),bx=Math.round(W/2-tot/2);
 badge(ctx,bx,y,bs,d.rankK,d.rankCol);
 if(line)txt(ctx,line,bx+bs+12,y+bs/2+lr.size*.36,{size:lr.size,align:'left',col:C.muted,maxW:420,min:lr.size});
 y+=bs+40;
 if(d.title)txt(ctx,'「'+d.title+'」',W/2,y,{size:26,weight:500,col:C.gold,maxW:500,min:15});
 // big floor
 y+=74;
 if(d.won){txt(ctx,'พิชิตยอดหอคอย',W/2,y,{size:60,weight:600,col:'#f6d84e',maxW:500,sd:4,shadowCol:'#5a3a08'});}
 else{const a='ชั้น '+d.floor,b=' / 100';setF(ctx,600,66,fT);const aw=ctx.measureText(a).width;setF(ctx,500,32,fT);const bw=ctx.measureText(b).width;const sx=W/2-(aw+bw)/2;
  txt(ctx,a,sx,y,{size:66,weight:600,align:'left',col:C.ink,sd:4,shadowCol:'#3a1a10',maxW:500});txt(ctx,b,sx+aw,y,{size:32,weight:500,align:'left',col:C.dim,maxW:200});}
 y+=40;
 if(d.pct!=null&&isFinite(+d.pct)){const p=Math.max(0,Math.min(100,Math.round(+d.pct)));txt(ctx,'ดีกว่า '+p+'% ของนักผจญภัย',W/2,y,{size:22,weight:500,col:C.good,maxW:480});y+=34;}
 if(d.cause){txt(ctx,(d.won?'':'สาเหตุ: ')+d.cause,W/2,y,{size:18,col:d.won?C.muted:'#e9a59c',maxW:500,min:12});}
 // stat boxes
 const by=566,bh=74,gap=12,boxW=(W-96-gap*2)/3;
 const boxes=[['เกิดมา',d.odds?'1 ใน '+nf(d.odds):'—',C.ink],['กรรม',sgn(d.karma),d.karma>0?C.good:d.karma<0?C.bad:C.muted],['คะแนน',nf(d.score),C.gold]];
 boxes.forEach((bx_,i)=>{const x=48+i*(boxW+gap);pxRect(ctx,x,by,boxW,bh,'rgba(0,0,0,.55)');ctx.strokeStyle=C.line2;ctx.lineWidth=2;ctx.strokeRect(x+1,by+1,boxW-2,bh-2);
  pxRect(ctx,x+2,by+2,boxW-4,3,'rgba(255,255,255,.06)');
  txt(ctx,bx_[0],x+boxW/2,by+26,{size:15,col:C.dim,maxW:boxW-16,shadow:false});
  txt(ctx,bx_[1],x+boxW/2,by+58,{size:24,weight:600,col:bx_[2],maxW:boxW-16,min:12});});
 // theme
 let fy=670;
 if(d.themeId){txt(ctx,'♪ เพลงประจำตัว '+d.themeId,W/2,fy,{size:17,col:C.karma,maxW:480});}
 // footer
 pxRect(ctx,48,692,W-96,2,'rgba(244,187,74,.35)');
 txt(ctx,'หอคอยโชคชะตา · '+HOST,W/2,720,{size:16,weight:500,col:C.gold,maxW:500});
 return cv;
}

// ---------- text ----------
function summary(d){d=norm(d);const L=[];
 L.push('🗼 '+d.name+(d.village?' จาก'+d.village:'')+' · แรงค์ '+d.rankK+(d.clsN?' '+d.clsN:'')+(d.gen>1?' (รุ่นที่ '+d.gen+')':''));
 if(d.title)L.push('「'+d.title+'」');
 L.push(d.won?'👑 พิชิตยอดหอคอยโชคชะตา!':'ไปถึงชั้น '+d.floor+' / 100'+(d.cause?' — '+d.cause:''));
 if(d.pct!=null&&isFinite(+d.pct))L.push('ดีกว่า '+Math.round(+d.pct)+'% ของนักผจญภัย');
 L.push((d.odds?'เกิดมา 1 ใน '+nf(d.odds)+' · ':'')+'กรรม '+sgn(d.karma)+' · คะแนน '+nf(d.score));
 if(d.themeId)L.push('♪ เพลงประจำตัว '+d.themeId);
 L.push('ลองเกิดใหม่ในหอคอยโชคชะตา: '+URL_);return L.join('\n');}

// ---------- dialog ----------
const CSS=`
.shr-dlg{border:0;padding:0;background:transparent;color:#f1e7d0;max-width:min(440px,calc(100vw - 24px));width:100%;max-height:calc(100dvh - 24px);overflow:visible;font-family:${fT}}
.shr-dlg::backdrop{background:rgba(4,8,10,.78);backdrop-filter:blur(2px)}
.shr-box{background:#15232a;border:3px solid #b97a22;box-shadow:0 0 0 3px #000,inset 0 0 0 2px #f4bb4a33,0 18px 50px rgba(0,0,0,.6);border-radius:6px;padding:12px;display:flex;flex-direction:column;gap:10px;max-height:calc(100dvh - 24px);box-sizing:border-box}
.shr-hd{display:flex;align-items:center;justify-content:space-between;gap:8px}
.shr-hd h2{margin:0;font:400 17px ${fP};color:#f4bb4a;letter-spacing:.5px}
.shr-x{background:none;border:0;color:#a3b5ad;font-size:22px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:4px}
.shr-x:hover{color:#f1e7d0}
.shr-img{display:block;width:100%;height:auto;max-height:calc(100dvh - 190px);object-fit:contain;border-radius:3px;background:#0b1215;min-height:120px}
.shr-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.shr-row button{font:500 15px ${fT};color:#1a1008;background:#f4bb4a;border:2px solid #000;box-shadow:inset 0 -3px 0 #b97a22,inset 0 2px 0 #ffe7a0;border-radius:4px;padding:10px 8px;cursor:pointer;min-height:44px}
.shr-row button:hover{filter:brightness(1.08)}.shr-row button:active{transform:translateY(1px)}
.shr-row button.sec{background:#1c2e36;color:#f1e7d0;box-shadow:inset 0 -3px 0 #0b1215,inset 0 2px 0 #3d5a66}
.shr-row button[hidden]{display:none}
.shr-dlg :focus-visible{outline:3px solid #ffd76a;outline-offset:2px}
.shr-msg{min-height:18px;font-size:13px;color:#86d67f;text-align:center;margin:-4px 0 0}
.shr-load{display:flex;align-items:center;justify-content:center;min-height:200px;color:#a3b5ad;font:400 15px ${fP}}
`;
let dlg=null,state=null,lastFocus=null;
function el(tag,attrs,html){const e=document.createElement(tag);if(attrs)for(const k in attrs)e.setAttribute(k,attrs[k]);if(html!=null)e.textContent=html;return e;}
function build(){
 if(dlg)return dlg;
 const st=el('style');st.textContent=CSS;document.head.appendChild(st);
 dlg=el('dialog',{class:'shr-dlg','aria-labelledby':'shr-ttl'});
 const box=el('div',{class:'shr-box'});
 const hd=el('div',{class:'shr-hd'});hd.appendChild(el('h2',{id:'shr-ttl'},'การ์ดนักผจญภัย'));const x=el('button',{class:'shr-x',type:'button','aria-label':'ปิด'},'✕');hd.appendChild(x);
 const wrap=el('div',{class:'shr-wrap'});
 const msg=el('p',{class:'shr-msg',role:'status','aria-live':'polite'});
 const row=el('div',{class:'shr-row'});
 const bSave=el('button',{type:'button','data-a':'save'},'บันทึกรูป'),bShare=el('button',{type:'button','data-a':'share'},'แชร์'),
  bCopy=el('button',{type:'button',class:'sec','data-a':'copy'},'คัดลอกข้อความ'),bClose=el('button',{type:'button',class:'sec','data-a':'close'},'ปิด');
 row.append(bSave,bShare,bCopy,bClose);box.append(hd,wrap,row,msg);dlg.appendChild(box);document.body.appendChild(dlg);
 dlg._={wrap,msg,bSave,bShare,bCopy,bClose};
 x.onclick=bClose.onclick=()=>close();
 dlg.addEventListener('cancel',e=>{e.preventDefault();close();});
 dlg.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}
  else if(e.key==='Tab'){const f=[...dlg.querySelectorAll('button:not([hidden]):not([disabled])')];if(!f.length)return;const a=f[0],z=f[f.length-1];
   if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}});
 dlg.addEventListener('click',e=>{if(e.target!==dlg)return;const r=box.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
 bSave.onclick=save;bShare.onclick=share;bCopy.onclick=copy;
 return dlg;
}
function say(t,bad){const m=dlg._.msg;m.style.color=bad?C.bad:C.good;m.textContent=t;clearTimeout(say._t);say._t=setTimeout(()=>{m.textContent='';},2600);}
function fname(d){return 'tower-of-fate-'+(str(d.name).trim().replace(/[\\/:*?"<>|\s]+/g,'-').slice(0,40)||'hero')+'.png';}
function getBlob(){if(!state)return Promise.resolve(null);if(state.blob)return Promise.resolve(state.blob);
 return state.cvP.then(cv=>new Promise(r=>cv.toBlob(b=>{state.blob=b;r(b);},'image/png')));}
async function save(){const s=state;const b=await getBlob();if(!b||s!==state)return;const u=URL.createObjectURL(b);const a=el('a',{href:u,download:fname(s.d)});a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);say('บันทึกรูปแล้ว');}
async function share(){const s=state,text=summary(s.d);
 try{const b=await getBlob();let file=null;try{file=b&&new File([b],fname(s.d),{type:'image/png'});}catch(e){}
  if(file&&navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({files:[file],title:'หอคอยโชคชะตา',text});
  else await navigator.share({title:'หอคอยโชคชะตา',text,url:URL_});
 }catch(e){if(e&&e.name!=='AbortError')say('แชร์ไม่สำเร็จ',true);}}
async function copy(){const t=summary(state.d);let ok=false;
 try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(t);ok=true;}}catch(e){}
 if(!ok){try{const ta=el('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0;left:-9999px';dlg.appendChild(ta);ta.select();ok=document.execCommand('copy');ta.remove();}catch(e){}}
 say(ok?'คัดลอกข้อความแล้ว':'คัดลอกไม่ได้',!ok);}
function close(){if(!dlg)return;if(dlg.open){try{dlg.close();}catch(e){dlg.removeAttribute('open');}}state=null;
 const f=lastFocus;lastFocus=null;if(f&&f.focus&&document.contains(f))try{f.focus();}catch(e){}}
function open(d){
 build();d=norm(d);const D=dlg._;
 if(!dlg.open)lastFocus=document.activeElement;
 state={d,blob:null};const s=state;
 D.bShare.hidden=!navigator.share;D.bClose.style.gridColumn=navigator.share?'':'1 / -1';D.msg.textContent='';
 D.wrap.replaceChildren(el('div',{class:'shr-load'},'กำลังวาดการ์ด…'));
 if(!dlg.open){try{dlg.showModal();}catch(e){dlg.setAttribute('open','');}}
 D.bSave.focus();
 s.cvP=render(d);
 s.cvP.then(cv=>{if(s!==state)return;const img=el('img',{class:'shr-img',alt:'การ์ดของ '+d.name+': '+(d.won?'พิชิตยอดหอคอย':'ชั้น '+d.floor+' / 100')});
  img.src=cv.toDataURL('image/png');D.wrap.replaceChildren(img);getBlob();}).catch(()=>{if(s===state)D.wrap.replaceChildren(el('div',{class:'shr-load'},'วาดการ์ดไม่สำเร็จ'));});
 return s.cvP;
}
window.SHARE={open,render,text:summary,close};
})();
