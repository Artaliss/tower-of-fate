// Auto-mode sim. Usage: node tools/autosim.js [N=10000] [runsForTemplates=20] [fullRuns] [-v]
// Simulated player lets every timer expire, so key moments are answered by the hero's personality.
// UI pacing: each floor = 5 s / speed (1,2,4,8,16x); key-moment countdown = fixed 15 s real time.
const fs=require('fs'),path=require('path'),vm=require('vm');const root=path.join(__dirname,'..');
const N=+process.argv[2]||10000,RUNS=+process.argv[3]||20;
const ctx={console,Math,JSON};ctx.window=ctx;vm.createContext(ctx);
ctx.ART={rollLook:f=>({form:f,seed:1})};ctx.AUDIO={};
vm.runInContext(fs.readFileSync(path.join(root,'events.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'auto.js'),'utf8'),ctx);
const A=ctx.AUTO_SIM;const q=(a,p)=>a[Math.floor(p*(a.length-1))];const pct=(n,d)=>(n/d*100).toFixed(1)+'%';
// 1) base hazard table (m=1) and the birth-multiplier model, without any gameplay
const H=A.HZ;console.log(`hazard fit: g=${H.g.toFixed(4)} B=${H.B.toExponential(3)} base median ${H.med} survive-to-100 ${pct(H.s100,1)} · q1 ${H.q[1].toFixed(4)} q50 ${H.q[50].toFixed(4)} q90 ${H.q[90].toFixed(4)}`);
const fa=[];for(let i=0;i<N;i++){const h=A.rollHero();let f=1;while(f<100&&Math.random()>=A.pRoll(f,h.m0))f++;fa.push(f);}fa.sort((x,y)=>x-y);
console.log(`hazard-only (birth m, N=${N}): p10 ${q(fa,.1)} p25 ${q(fa,.25)} median ${q(fa,.5)} p75 ${q(fa,.75)} p90 ${q(fa,.9)} reach100 ${pct(fa.filter(x=>x>=100).length,N)} early<=10 ${pct(fa.filter(x=>x<=10).length,N)}`);
// 2) full auto lives
const tids=new Set(),per=[];let tk=0,keys=0,floors=0,won=0,boss=0,fate=0,quiet=0,drama=0,arcs=0,same=0,plain=0,omens=0,reach=0,mlog=0,mn=0,ledger=0,scars=0;const ends=[];const dist=[];const pers={};
const M=Math.max(RUNS,+process.argv[4]||0);const ck={},stc={a:0,d:0,l:0,h:0};const T0=Date.now();
for(let r=0;r<M;r++){const R=A.autoLife();if(!R.won)ck[R.ck||'?']=(ck[R.ck||'?']||0)+1;for(const c of R.stH||'')stc[c]=(stc[c]||0)+1;const t=new Set(R.hist.map(h=>h.tid));per.push(t.size);if(r<RUNS)t.forEach(x=>tids.add(x));
 const end=R.won?100:R.floor;keys+=R.keys;floors+=end;if(R.won)won++;if(R.death==='boss')boss++;if(R.death==='fate')fate++;if(R.maxFloor>=100)reach++;
 quiet+=R.quietN;drama+=R.drama;arcs+=Object.keys(R.arcs).length;same+=R.sameN;plain+=R.plainN;omens+=R.omens;mlog+=R.mLog;mn+=R.mN;ledger+=R.ledger.length;tk+=R.tk;scars+=R.scars;ends.push(end);
 const p=R.h.pers;pers[p]=pers[p]||{n:0,f:0,w:0};pers[p].n++;pers[p].f+=end;if(R.won)pers[p].w++;
 dist.push(R.hist.length-t.size);}
const ms=(Date.now()-T0)/M;ends.sort((x,y)=>x-y);
console.log(`runs ${M}: end-floor p10 ${q(ends,.1)} median ${q(ends,.5)} p90 ${q(ends,.9)} · reach100 ${pct(reach,M)} · won ${pct(won,M)} · deaths: hazard ${pct(fate,M)} boss ${pct(boss,M)}`);
console.log(`per run: key moments (paused) ${(keys/M).toFixed(1)} · SAME_WAY ${(same/M).toFixed(2)} · PLAIN ${(plain/M).toFixed(2)} · omens ${(omens/M).toFixed(2)} · quiet ${(quiet/M).toFixed(2)} · drama ${(drama/M).toFixed(2)} · arcs ${(arcs/M).toFixed(2)} · ledger rows ${(ledger/M).toFixed(1)} · scars ${(scars/M).toFixed(2)} · geo-mean m ${Math.exp(mlog/mn).toFixed(2)} · floors/key ${(floors/keys).toFixed(1)}`);
const mins=sp=>((tk/M)*5/sp+(keys/M)*15)/60;console.log(`est. real time per run (all timers expire): 1x ${mins(1).toFixed(0)} min · 4x ${mins(4).toFixed(1)} min · 16x ${mins(16).toFixed(1)} min (floor ticks ${(tk/M).toFixed(1)}/run)`);
console.log('by personality: '+Object.keys(pers).map(k=>`${k} n${pers[k].n} avgFloor ${(pers[k].f/pers[k].n).toFixed(1)} won ${pct(pers[k].w,pers[k].n)}`).join(' | '));
console.log(`distinct key-moment templates across first ${RUNS} runs: ${tids.size} (excluding boss/omen: ${[...tids].filter(x=>!['boss','omen'].includes(x)).length})`);
if(process.argv.includes('-v'))console.log([...tids].sort().join(' '));
console.log(`sim cost: ${ms.toFixed(2)} ms per headless life (a 4-hero cohort at run start ~${(ms*4).toFixed(0)} ms)`);
const sT=Object.values(stc).reduce((a,b)=>a+b,0)||1;console.log('AI stance share per floor: '+Object.keys(stc).map(k=>`${k} ${pct(stc[k],sT)}`).join(' · '));
const cT=Object.values(ck).reduce((a,b)=>a+b,0)||1;console.log('death causes: '+Object.keys(ck).sort((a,b)=>ck[b]-ck[a]).map(k=>`${k} ${pct(ck[k],cT)}`).join(' · '));
console.log('milestones l(f): '+A.LX.map((v,f)=>[f,v]).filter(([f])=>[1,5,15,30,50,65,80,90,100].includes(f)).map(([f,v])=>`${f}:${(v*100).toFixed(1)}%`).join(' '));
