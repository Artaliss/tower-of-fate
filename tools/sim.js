// Tower of Fate balance sim. Usage: node tools/sim.js [N=1000] [balOverrideJSON]
// Loads events.js (window.CONTENT) in a vm, evaluates engine.js ENGINE-START..END, runs simFloors(N).
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const N=+process.argv[2]||1000;
const over=process.argv[3]?JSON.parse(process.argv[3]):null;
const ctx={console,Math,JSON};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'events.js'),'utf8'),ctx,{filename:'events.js'});
// engine region may call window.ART/AUDIO helpers (e.g. ART.rollLook): stub every member as a no-op returning {}
const noop=()=>({}),stub=()=>new Proxy({},{get:(t,k)=>k in t?t[k]:noop});
if(!ctx.ART)ctx.ART=stub();if(!ctx.AUDIO)ctx.AUDIO=stub();
if(!ctx.CONTENT)throw new Error('events.js did not set window.CONTENT');
const src=fs.readFileSync(path.join(root,'engine.js'),'utf8');
const head=src.match(/const\s*\{[^}]*\}\s*=\s*window\.CONTENT\s*;/);
if(!head)throw new Error('CONTENT destructuring not found in engine.js');
let eng=src.split('/*ENGINE-START*/')[1].split('/*ENGINE-END*/')[0];
if(over)eng=eng.replace(/const BAL=(\{[^}]*\});/,(m,o)=>'const BAL=Object.assign('+o+','+JSON.stringify(over)+');');
const api=vm.runInContext('(function(){'+head[0]+eng+';return {simFloors,RANKS,BAL,autoRun,rollHero};})()',ctx,{filename:'engine-region'});
const a=api.simFloors(N);const f=a.map(x=>x.f).sort((x,y)=>x-y);
const q=p=>f[Math.floor(p*(f.length-1))];
if(over)console.log('BAL override',JSON.stringify(over));
console.log('N',N,'p10',q(.1),'p25',q(.25),'med',q(.5),'p75',q(.75),'p90',q(.9),'won',a.filter(x=>x.won).length);
const by={};a.forEach(x=>{(by[x.rank]=by[x.rank]||[]).push(x.f)});
for(const r of Object.keys(by).sort((x,y)=>x-y)){const v=by[r].sort((x,y)=>x-y);const k=api.RANKS[r].k||api.RANKS[r].n||r;
 console.log(String(k).padEnd(4),'n',String(v.length).padStart(4),'med',v[Math.floor(v.length/2)],'max',v[v.length-1],'won',a.filter(x=>x.rank==r&&x.won).length);}
if(process.argv.includes('-v')){// death-cause breakdown for runs reaching floor >=60
 const c={};let r100=0;for(let i=0;i<N;i++){const R=api.autoRun(api.rollHero());if(R.floor>=100)r100++;if(R.floor<60)continue;
  const k=(R.won?'WON':(R.floor>=100?'f100:':(R.floor%10===0?'boss:':'f'+Math.floor(R.floor/10)*10+':'))+String(R.cause).slice(0,30));c[k]=(c[k]||0)+1;}
 console.log('reached100',r100);Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,25).forEach(e=>console.log(e[1],e[0]));}
