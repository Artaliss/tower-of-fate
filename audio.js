// Tower of Fate — AUDIO: WebAudio-synthesized chiptune music per biome + sfx. No audio files.
// API: init() (on first gesture), setMuted(bool), music(biome[,floor]) idempotent, sfx(name),
// setHero({seed,cls,rank}) -> '#A7F3' (per-hero leitmotif woven into every biome), sting(kind), themeId. Muted by default.
(function(){
'use strict';
const MASTER=0.15,LOOK=0.15,TICK=30,FADE=0.8;
// Biomes: 0 ทุ่งหญ้า, 1 ถ้ำคริสตัล, 2 ป่าต้องสาป, 3 ภูเขาไฟ, 4 ห้วงดารา
const MAJ=[0,2,4,5,7,9,11],MIN=[0,2,3,5,7,8,10],DOR=[0,2,3,5,7,9,10],PHR=[0,1,3,5,7,8,10],LYD=[0,2,4,6,7,9,11];
const MIX=[0,2,4,5,7,9,10],HMIN=[0,2,3,5,7,8,11],MPEN=[0,3,5,7,10],JPEN=[0,2,4,7,9];
const CLS={war:DOR,mag:PHR,arc:MIX,pri:LYD,rog:MPEN,far:JPEN,dra:HMIN};
const RANKS=['F','E','D','C','B','A','S','SS'];
const TRACKS=[
 {root:60,bpm:118,scale:MAJ,lead:'square',duty:.5,prog:[0,3,4,0],seed:11,drum:1,arp:0},
 {root:63,bpm:96, scale:LYD,lead:'triangle',duty:0,prog:[0,1,0,4],seed:23,drum:0,arp:1},
 {root:57,bpm:84, scale:DOR,lead:'square',duty:.25,prog:[0,6,3,4],seed:37,drum:0,arp:1},
 {root:52,bpm:140,scale:PHR,lead:'sawtooth',duty:0,prog:[0,1,0,5],seed:41,drum:2,arp:0},
 {root:62,bpm:72, scale:MIN,lead:'triangle',duty:0,prog:[0,5,2,6],seed:53,drum:0,arp:2}
];
const mtof=m=>440*Math.pow(2,(m-69)/12);
function rng(s){return()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};}
function hashStr(v){const s=String(v);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(a){return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const degOf=(sc,root,d,o)=>{const n=sc.length,q=Math.floor(d/n),i=((d%n)+n)%n;return root+sc[i]+12*(q+(o||0));};
function rankIdx(r){if(r&&typeof r==='object')r=r.k!=null?r.k:r.i;if(typeof r==='number')return Math.max(0,Math.min(7,r|0));const i=RANKS.indexOf(String(r||'').toUpperCase());return i<0?0:i;}
// Hero leitmotif: 4–8 bars of {s:step(16ths), d:scale degree, l:length in 16ths}.
function makeHero(o){
 o=o||{};const cls=String(o.cls&&typeof o.cls==='object'?o.cls.id:(o.cls||'war')),rk=rankIdx(o.rank);
 const h=hashStr(String(o.seed!=null?o.seed:'')+'|'+cls+'|'+rk),r=mulberry32(h);
 const id='#'+(h&0xffff).toString(16).toUpperCase().padStart(4,'0');
 const bars=4+Math.floor(r()*5),mot=[],CELLS=[[0,4,8,12],[0,2,4,8,12],[0,6,8,12],[0,4,6,8,10,12],[0,8,12],[0,3,4,8,11,12],[0,2,4,6,8,10,12,14]];
 let cur=[0,2,4][Math.floor(r()*3)];
 for(let b=0;b<bars;b++){
  const last=b===bars-1,cell=last?[0,4,8]:CELLS[Math.floor(r()*CELLS.length)];
  cell.forEach((s,k)=>{
   const nx=k+1<cell.length?cell[k+1]:16;
   if(last&&k===cell.length-1)cur=0;else if(b>0||k>0){cur+=Math.round((r()-.5)*4)||(r()<.5?1:-1);cur=Math.max(-2,Math.min(8,cur));}
   mot.push({s:b*16+s,d:cur,l:Math.max(1,nx-s-(r()<.25?1:0))});});
 }
 return{id,cls,rk,sc:CLS[cls]||DOR,bars,len:bars*16,mot,tempo:.9+rk*.035,oct:rk>=5?1:0,duty:[.5,.5,.25,.25,.25,.125,.125,.125][rk]};
}
// Build the pattern for a track. With a hero: hero scale on the biome root, motif as lead (A), biome variation (B).
function build(t,H){
 const r=rng(t.seed),sc=H?H.sc:t.scale,deg=(d,o)=>degOf(sc,t.root,d,o);
 const lead=[],bass=[],arp=[],drum=[];let cur=2;
 const N=H?Math.max(64,H.len*2):64;
 if(H){H.mot.forEach(n=>{lead[n.s]={m:deg(n.d,1+H.oct),l:n.l};
   const v=r(),d=v<.25?n.d+(r()<.5?2:-2):v<.4?n.d+7:n.d; // B-section: same rhythm, biome-flavoured variation
   const sp=n.l>=4&&n.l%2===0&&r()<.4,hl=n.l>>1; // B-section sometimes splits long notes in two
   lead[H.len+n.s]={m:deg(d,1+H.oct),l:sp?hl:n.l};if(sp)lead[H.len+n.s+hl]={m:deg(d+1,1+H.oct),l:hl};});}
 for(let i=0;i<N;i++){const bar=Math.floor(i/16)%4,s=i%16,ch=t.prog[bar];
  if(!H&&i<64&&s%2===0&&r()<(s%4===0?.85:.45)){cur+=Math.round((r()-.5)*4);if(cur<-1)cur=-1;if(cur>9)cur=9;if(s===0)cur=ch+(r()<.5?2:4);lead[i]={m:deg(cur,1),l:r()<.3?3:1};}
  if(s%4===0||(t.drum===2&&s%2===0))bass[i]=deg(ch,-1)+(s%8===4&&t.drum!==2?7:0);
  arp[i]=deg(ch+[0,2,4,7][s%4]-(t.arp===2&&s%8>=4?7:0),t.arp===2?1:0);
  drum[i]=t.drum===0?(s===0||s===8?(s===0?2:1):0):(s%8===0?2:(s%4===2?1:(t.drum===2&&s%2===1?1:0)));
 }
 return{lead,bass,arp,drum,N,step:60/(t.bpm*(H?H.tempo:1))/4};
}
let PAT=null,HERO=null;
const pat=i=>{if(!PAT)PAT=TRACKS.map(t=>build(t,HERO));return PAT[i];};
const band=f=>f>0?Math.min(3,Math.floor((f-1)/25)):0;

const MKEY="tof-muted";
const A={muted:(()=>{try{return localStorage.getItem(MKEY)==="1";}catch(e){return false;}})(), // sound on by default; starts on first gesture (browser autoplay rule)
 ctx:null,master:null,noise:null,cur:-1,bus:null,timer:0,next:0,step:0,_ok:true,_scheduled:0,
 themeId:null,lvl:0,boss:false,
 init(){
  if(this.ctx||!this._ok)return;
  try{
   const AC=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);if(!AC){this._ok=false;return;}
   const c=new AC();this.ctx=c;
   this.master=c.createGain();this.master.gain.value=this.muted?0:this._g();this.master.connect(c.destination);
   const len=c.sampleRate,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;this.noise=b;
   PAT=null;
   if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{try{if(document.hidden)c.suspend().catch(()=>{});else if(!this.muted)c.resume().catch(()=>{});}catch(e){}});
   if(this.cur<0)this.cur=0;
   if(this.muted){c.suspend&&c.suspend().catch(()=>{});}else this._start();
  }catch(e){this._ok=false;this.ctx=null;}
 },
 vol:(()=>{try{const v=parseFloat(localStorage.getItem("tof-volume"));return isFinite(v)?Math.min(1,Math.max(0,v)):.5;}catch(e){return .5;}})(),
 _g(){return MASTER*2*this.vol;},
 setVolume(v){this.vol=Math.min(1,Math.max(0,+v||0));try{localStorage.setItem("tof-volume",String(this.vol));}catch(e){}
  const c=this.ctx;if(!c||this.muted)return;try{const t=c.currentTime,g=this.master.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(this._g(),t+.08);}catch(e){}},
 setMuted(m){
  this.muted=!!m;try{localStorage.setItem(MKEY,this.muted?"1":"0");}catch(e){}const c=this.ctx;if(!c)return;
  try{
   const t=c.currentTime,g=this.master.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);
   if(this.muted){g.linearRampToValueAtTime(0,t+.15);this._stop();
    setTimeout(()=>{if(this.muted&&this.ctx)this.ctx.suspend().catch(()=>{});},250);}
   else{c.resume().catch(()=>{});g.linearRampToValueAtTime(this._g(),t+.2);this._start();}
  }catch(e){}
 },
 setHero(o){
  let H;try{H=makeHero(o);}catch(e){return this.themeId;}
  if(HERO&&HERO.id===H.id&&HERO.cls===H.cls&&HERO.rk===H.rk)return this.themeId;
  HERO=H;PAT=null;this.themeId=H.id;
  if(this.ctx&&this.timer){try{this._fadeOut();this._start();}catch(e){}}
  return H.id;
 },
 music(b,floor){
  b=Math.max(0,Math.min(TRACKS.length-1,(b|0)));
  if(floor!=null){this.lvl=band(floor|0);this.boss=(floor|0)>0&&(floor|0)%10===0;}
  if(b===this.cur&&(this.timer||this.muted||!this.ctx))return; // intensity change applies live in _tick
  const changed=b!==this.cur;this.cur=b;
  if(!this.ctx||this.muted)return;
  try{if(changed)this._fadeOut();this._start();}catch(e){}
 },
 _fadeOut(){
  const c=this.ctx,old=this.bus;clearInterval(this.timer);this.timer=0;if(!old)return;this.bus=null;
  const t=c.currentTime;old.gain.cancelScheduledValues(t);old.gain.setValueAtTime(old.gain.value,t);old.gain.linearRampToValueAtTime(0,t+FADE);
  setTimeout(()=>{try{old.disconnect();}catch(e){}},FADE*1000+300);
 },
 _start(){
  const c=this.ctx;if(!c||this.muted||this.cur<0||this.timer)return;
  if(!this.bus){this.bus=c.createGain();this.bus.connect(this.master);const t=c.currentTime;this.bus.gain.setValueAtTime(0,t);this.bus.gain.linearRampToValueAtTime(1,t+FADE);}
  this.next=c.currentTime+.06;this.step=0;
  this.timer=setInterval(()=>this._tick(),TICK);this._tick();
 },
 _stop(){clearInterval(this.timer);this.timer=0;const b=this.bus;this.bus=null;if(b)setTimeout(()=>{try{b.disconnect();}catch(e){}},300);},
 _tick(){
  const c=this.ctx;if(!c||!this.bus)return;
  try{
   const p=pat(this.cur),t=TRACKS[this.cur],L4=this.lvl,B=this.boss,arpOn=t.arp||L4>=2;
   if(this.next<c.currentTime-.2)this.next=c.currentTime+.02; // tab was throttled: resync
   while(this.next<c.currentTime+LOOK){
    const i=this.step%p.N,s=i%16,T=this.next,d=p.step*(B?.9:1),bar=Math.floor(i/16);
    const tense=B&&bar%2===1?1:0; // boss: lift alternate bars a semitone (b2 tension)
    const L=p.lead[i];if(L)this._tone(t.lead,mtof(L.m+tense),T,d*L.l*.9,.16,this.bus,HERO?HERO.duty:t.duty);
    if(p.bass[i]!=null){this._tone('triangle',mtof(p.bass[i]+tense),T,d*(t.drum===2?1.6:3.2),.32,this.bus);
     if(L4>=3&&s%8===4)this._tone('triangle',mtof(p.bass[i]+12+tense),T,d*1.2,.14,this.bus);}
    if(arpOn&&p.arp[i]!=null&&(t.arp||L4>=3||s%2===0))this._tone('square',mtof(p.arp[i]+tense+(t.arp?0:12)),T,d*.5,t.arp?.045:.03,this.bus,.125);
    let D=p.drum[i];
    if(L4>=1&&!D&&s%4===2)D=1;if(L4>=3&&!D&&s%2===1)D=1;if(B&&s%4===0&&D!==2)D=2;
    if(D)this._noise(T,D===2?.12:.04,D===2?.22:(L4>=1&&p.drum[i]!==1?.05:.09),D===2?900:6000,this.bus);
    this.next+=d;this.step++;
   }
  }catch(e){}
 },
 _tone(type,f,t,dur,vol,dest,duty,slide){
  const c=this.ctx,o=c.createOscillator(),g=c.createGain();
  if(type==='square'&&duty&&duty!==.5&&c.createPeriodicWave)o.setPeriodicWave(pulse(c,duty));else o.type=type==='sawtooth'?'sawtooth':type;
  o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+.005);g.gain.setValueAtTime(vol,t+Math.max(.006,dur*.6));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+.02);o.onended=()=>{try{g.disconnect();}catch(e){}};
  this._scheduled++;
 },
 _noise(t,dur,vol,freq,dest){
  const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
  s.buffer=this.noise;f.type=freq<2000?'lowpass':'highpass';f.frequency.value=freq;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f);f.connect(g);g.connect(dest);s.start(t,Math.random()*.5);s.stop(t+dur+.02);s.onended=()=>{try{g.disconnect();}catch(e){}};
  this._scheduled++;
 },
 _duck(sec){const b=this.bus,c=this.ctx;if(!b)return;try{const t=c.currentTime,g=b.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);
  g.linearRampToValueAtTime(.3,t+.08);g.setValueAtTime(.3,t+sec);g.linearRampToValueAtTime(1,t+sec+.6);}catch(e){}},
 // Short jingles built from the hero's leitmotif (falls back to a generic motif before setHero).
 sting(kind){
  const c=this.ctx;if(!c||this.muted||c.state!=='running')return;
  try{
   const H=HERO||makeHero({seed:'tower',cls:'war',rank:3}),m=this.master,t0=c.currentTime+.03,sc=H.sc;
   const notes=n=>H.mot.slice(0,n),dg=(scale,d,o)=>degOf(scale,60,d,o);
   const play=(list,sp,scale,wave,vol,oct,duty,tr)=>{let end=0;list.forEach(n=>{const T=n.s*sp,D=n.l*sp*.92;end=Math.max(end,T+D);
     this._tone(wave,mtof(dg(scale,n.d,oct)+(tr||0)),t0+T,D,vol,m,duty);});return end;};
   let e=0;
   switch(kind){
    case 'birth':{const lst=H.mot.filter(n=>n.s<32);e=play(lst,.085,sc,'square',.14,1+H.oct,H.duty);
     [0,2,4].forEach(d=>this._tone('triangle',mtof(dg(sc,d,0)),t0+e,.9,.12,m));this._noise(t0,.15,.15,900,m);e+=.9;break;}
    case 'boss':{const lst=notes(6).map((n,k)=>({s:k*3,d:n.d,l:3}));e=play(lst,.11,HMIN,'sawtooth',.11,0,0,-12);
     this._tone('square',mtof(dg(HMIN,0,-1)),t0,e+.4,.1,m,.5,mtof(dg(HMIN,0,-1)-5));this._noise(t0,e,.12,400,m);break;}
    case 'death':{const lst=notes(5).map((n,k)=>({s:k*4,d:n.d-k,l:4}));e=play(lst,.15,MIN,'square',.13,1,.5);
     this._tone('triangle',mtof(dg(MIN,0,-1)),t0+e,1.4,.2,m,0,mtof(dg(MIN,0,-2)));e+=1.4;break;}
    case 'win':{const lst=notes(8).map((n,k)=>({s:k*2,d:Math.abs(n.d),l:2}));e=play(lst,.07,MAJ,'square',.13,1,.25);
     [0,4,7,12].forEach((s,k)=>this._tone('square',mtof(72+s),t0+e+k*.08,.14,.12,m,.125));
     [0,4,7].forEach(s=>this._tone('triangle',mtof(72+s),t0+e+.32,1,.12,m));e+=1.3;break;}
    // funeral: the hero's motif slowed to a hymn over a soft minor pad (end cinematic)
    case 'funeral':{const lst=notes(4).map((n,k)=>({s:k*6,d:Math.abs(n.d)%5,l:6}));e=play(lst,.16,MIN,'triangle',.15,1,0);
     [0,2,4].forEach((d,k)=>this._tone('triangle',mtof(dg(MIN,d,0)),t0+k*.05,e+1.2,.07,m));this._tone('triangle',mtof(dg(MIN,0,-1)),t0,e+1.6,.12,m);e+=1.6;break;}
    case 'key':{notes(2).forEach((n,k)=>this._tone('triangle',mtof(dg(sc,n.d,1+H.oct)),t0+k*.07,.1,.13,m));return;}
    default:return;
   }
   this._duck(e);
  }catch(e){}
 },
 // hush(true) holds the music bus at 45% (end cinematic); hush(false) brings it back
 hush(on){this.hushed=!!on;const b=this.bus,c=this.ctx;if(!b||!c)return;try{const t=c.currentTime,g=b.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(on?.45:1,t+.6);}catch(e){}},
 sfx(name){
  const c=this.ctx;if(!c||this.muted||c.state!=='running')return;
  try{
   const t=c.currentTime+.01,m=this.master,T=(w,f,s,d,v,sl,du)=>this._tone(w,f,t+s,d,v,m,du,sl);
   switch(name){
    case 'click':T('square',1200,0,.035,.12,0,.25);break;
    case 'coin':T('square',988,0,.06,.18,0,.5);T('square',1319,.06,.14,.18,0,.5);break;
    case 'chest':[523,659,784,1047].forEach((f,i)=>T('square',f,i*.07,.12,.15,0,.25));T('triangle',1568,.28,.3,.2);break;
    case 'warp':T('square',200,0,.45,.12,1600,.25);T('triangle',300,.05,.4,.15,2400);break;
    case 'hit':this._noise(t,.08,.35,1200,m);T('square',180,0,.08,.15,60,.5);break;
    case 'levelup':[0,4,7,12,16].forEach((s,i)=>T('square',mtof(72+s),i*.08,.14,.15,0,.25));T('triangle',mtof(84),.4,.4,.2);break;
    case 'boss':T('sawtooth',mtof(40),0,.9,.18,mtof(34));T('square',mtof(46),0,.9,.1,mtof(40),.5);this._noise(t,.6,.25,400,m);break;
    case 'death':[67,63,60,55].forEach((n,i)=>T('square',mtof(n),i*.18,.22,.16,0,.5));T('triangle',mtof(43),.72,.9,.25,mtof(31));break;
   }
  }catch(e){}
 }
};
const PW={};
function pulse(c,duty){if(PW[duty]&&PW[duty].c===c)return PW[duty].w;const n=32,re=new Float32Array(n),im=new Float32Array(n);
 for(let k=1;k<n;k++)re[k]=2/(k*Math.PI)*Math.sin(k*Math.PI*duty);
 const w=c.createPeriodicWave(re,im);PW[duty]={c,w};return w;}
if(typeof document!=="undefined"){const go=()=>{A.init();if(A.ctx){document.removeEventListener("keydown",go,true);document.removeEventListener("pointerdown",go,true);}};document.addEventListener("keydown",go,true);document.addEventListener("pointerdown",go,true);}
if(typeof document!=="undefined"){
 const css=document.createElement("style");css.textContent=".volpop{position:fixed;z-index:70;background:var(--panel,#15232a);border:2px solid var(--gold2,#b97a22);border-radius:4px;padding:10px 12px;box-shadow:0 4px 0 #0008;display:flex;flex-direction:column;gap:8px;min-width:200px;font:300 13px var(--fT,system-ui);color:var(--ink,#f1e7d0)}.volpop[hidden]{display:none!important}.volpop .row{display:flex;align-items:center;gap:8px}.volpop input[type=range]{flex:1;accent-color:var(--gold,#f4bb4a)}.volpop .pct{font-family:var(--fP,monospace);min-width:3ch;text-align:right;color:var(--gold,#f4bb4a)}.volpop button{background:var(--panel2,#1c2e36);border:2px solid var(--line2,#3d5a66);border-radius:3px;color:var(--ink,#f1e7d0);padding:5px 10px;font:inherit;cursor:pointer}";
 document.head.appendChild(css);
 let pop=null,btn=null;
 const sync=()=>{if(btn)btn.setAttribute("aria-pressed",A.muted?"true":"false");if(!pop)return;pop.querySelector(".mt").textContent=A.muted?"🔇 เปิดเสียง":"🔊 ปิดเสียง";const r=pop.querySelector("input");r.value=Math.round(A.vol*100);pop.querySelector(".pct").textContent=r.value;};
 const build=()=>{pop=document.createElement("div");pop.className="volpop";pop.hidden=true;pop.setAttribute("role","dialog");pop.setAttribute("aria-label","ระดับเสียง");
  pop.innerHTML='<div class="row"><span>เสียงเพลง</span><input type="range" min="0" max="100" step="5" aria-label="ระดับเสียงเพลง"><span class="pct"></span></div><button type="button" class="mt"></button>';
  document.body.appendChild(pop);
  pop.querySelector("input").addEventListener("input",e=>{A.init();if(A.muted&&+e.target.value>0)A.setMuted(false);A.setVolume(e.target.value/100);if(+e.target.value===0)A.setMuted(true);sync();});
  pop.querySelector(".mt").addEventListener("click",()=>{A.init();A.setMuted(!A.muted);if(!A.muted&&A.vol===0)A.setVolume(.5);if(!A.muted&&A.cur>=0)A.music(A.cur);sync();});
  document.addEventListener("pointerdown",e=>{if(pop.hidden)return;if(pop.contains(e.target)||(btn&&btn.contains(e.target)))return;pop.hidden=true;},true);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!pop.hidden){pop.hidden=true;btn&&btn.focus();}});};
 document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("#btnMute");if(!b)return;e.stopPropagation();e.preventDefault();btn=b;if(!pop)build();
  if(!pop.hidden){pop.hidden=true;return;}A.init();sync();pop.hidden=false;const r=b.getBoundingClientRect(),w=pop.offsetWidth;pop.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+"px";pop.style.top=(r.bottom+6)+"px";pop.querySelector("input").focus();},true);
}
window.AUDIO=A;})();
