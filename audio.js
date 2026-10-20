// Tower of Fate — AUDIO: WebAudio-synthesized chiptune music per biome + sfx. No audio files.
// API: init() (on first gesture), setMuted(bool), music(biomeIndex) idempotent, sfx(name). Muted by default.
(function(){
'use strict';
const MASTER=0.15,LOOK=0.15,TICK=30,FADE=0.8;
// Biomes: 0 ทุ่งหญ้า, 1 ถ้ำคริสตัล, 2 ป่าต้องสาป, 3 ภูเขาไฟ, 4 ห้วงดารา
const MAJ=[0,2,4,5,7,9,11],MIN=[0,2,3,5,7,8,10],DOR=[0,2,3,5,7,9,10],PHR=[0,1,3,5,7,8,10],LYD=[0,2,4,6,7,9,11];
const TRACKS=[
 {root:60,bpm:118,scale:MAJ,lead:'square',duty:.5,prog:[0,3,4,0],seed:11,drum:1,arp:0},
 {root:63,bpm:96, scale:LYD,lead:'triangle',duty:0,prog:[0,1,0,4],seed:23,drum:0,arp:1},
 {root:57,bpm:84, scale:DOR,lead:'square',duty:.25,prog:[0,6,3,4],seed:37,drum:0,arp:1},
 {root:52,bpm:140,scale:PHR,lead:'sawtooth',duty:0,prog:[0,1,0,5],seed:41,drum:2,arp:0},
 {root:62,bpm:72, scale:MIN,lead:'triangle',duty:0,prog:[0,5,2,6],seed:53,drum:0,arp:2}
];
const mtof=m=>440*Math.pow(2,(m-69)/12);
function rng(s){return()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};}
// Build a deterministic 4-bar (64 x 16th) pattern for each track.
function build(t){
 const r=rng(t.seed),sc=t.scale,deg=(d,o)=>{const n=sc.length,q=Math.floor(d/n),i=((d%n)+n)%n;return t.root+sc[i]+12*(q+(o||0));};
 const lead=[],bass=[],arp=[],drum=[];let cur=2;
 for(let bar=0;bar<4;bar++){const ch=t.prog[bar];
  for(let s=0;s<16;s++){const i=bar*16+s;
   // lead: notes on strong steps, random walk around chord
   if(s%2===0&&r()<(s%4===0?.85:.45)){cur+=Math.round((r()-.5)*4);if(cur<-1)cur=-1;if(cur>9)cur=9;if(s===0)cur=ch+(r()<.5?2:4);lead[i]={m:deg(cur,1),l:r()<.3?3:1};}
   if(s%4===0||(t.drum===2&&s%2===0))bass[i]=deg(ch,-1)+(s%8===4&&t.drum!==2?7:0);
   if(t.arp)arp[i]=deg(ch+[0,2,4,7][s%4]-(t.arp===2&&s%8>=4?7:0),t.arp===2?1:0);
   drum[i]=t.drum===0?(s===0||s===8?(s===0?2:1):0):(s%8===0?2:(s%4===2?1:(t.drum===2&&s%2===1?1:0)));
  }}
 return{lead,bass,arp,drum,step:60/t.bpm/4};
}
let PAT=null;

const A={muted:true,ctx:null,master:null,noise:null,cur:-1,bus:null,timer:0,next:0,step:0,_ok:true,_scheduled:0,
 init(){
  if(this.ctx||!this._ok)return;
  try{
   const AC=window.AudioContext||window.webkitAudioContext;if(!AC){this._ok=false;return;}
   const c=new AC();this.ctx=c;
   this.master=c.createGain();this.master.gain.value=this.muted?0:MASTER;this.master.connect(c.destination);
   const len=c.sampleRate,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;this.noise=b;
   PAT=TRACKS.map(build);
   if(this.muted){c.suspend&&c.suspend().catch(()=>{});}else this._start();
  }catch(e){this._ok=false;this.ctx=null;}
 },
 setMuted(m){
  this.muted=!!m;const c=this.ctx;if(!c)return;
  try{
   const t=c.currentTime,g=this.master.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);
   if(this.muted){g.linearRampToValueAtTime(0,t+.15);this._stop();
    setTimeout(()=>{if(this.muted&&this.ctx)this.ctx.suspend().catch(()=>{});},250);}
   else{c.resume().catch(()=>{});g.linearRampToValueAtTime(MASTER,t+.2);this._start();}
  }catch(e){}
 },
 music(b){
  b=Math.max(0,Math.min(TRACKS.length-1,(b|0)));
  if(b===this.cur&&(this.timer||this.muted||!this.ctx))return;
  const changed=b!==this.cur;this.cur=b;
  if(!this.ctx||this.muted)return;
  try{if(changed)this._fadeOut();this._start();}catch(e){}
 },
 _fadeOut(){
  const c=this.ctx,old=this.bus;if(!old)return;this.bus=null;
  const t=c.currentTime;old.gain.cancelScheduledValues(t);old.gain.setValueAtTime(old.gain.value,t);old.gain.linearRampToValueAtTime(0,t+FADE);
  setTimeout(()=>{try{old.disconnect();}catch(e){}},FADE*1000+300);
  clearInterval(this.timer);this.timer=0;
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
   const p=PAT[this.cur],t=TRACKS[this.cur];
   if(this.next<c.currentTime-.2)this.next=c.currentTime+.02; // tab was throttled: resync
   while(this.next<c.currentTime+LOOK){
    const i=this.step%64,T=this.next,d=p.step;
    const L=p.lead[i];if(L)this._tone(t.lead,mtof(L.m),T,d*L.l*.9,.16,this.bus,t.duty);
    if(p.bass[i]!=null)this._tone('triangle',mtof(p.bass[i]),T,d*(t.drum===2?1.6:3.2),.32,this.bus);
    if(p.arp[i]!=null)this._tone('square',mtof(p.arp[i]),T,d*.5,.045,this.bus,.125);
    const D=p.drum[i];if(D)this._noise(T,D===2?.12:.04,D===2?.22:.09,D===2?900:6000,this.bus);
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
window.AUDIO=A;
})();
