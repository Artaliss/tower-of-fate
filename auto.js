// Tower of Fate — AUTO MODE "โหมดชะตากำหนด": the climb flows by itself, the player decides only at key moments.
// Sim region (SIM-START..SIM-END) is adapted from engine.js and runs headless (window.AUTO_SIM) when no DOM exists.
(function(){
'use strict';
const {RANKS,CLASSES,BIOMES,VILLAGES,NA,NB,COMPN,MONS,BOSSES,PETS,EVENTS,JUDGE}=window.CONTENT;
/*SIM-START*/
let rnd=Math.random;
const rr=(a,b)=>a+(b-a)*rnd(), pick=a=>a[Math.floor(rnd()*a.length)], clamp=(v,a,b)=>v<a?a:v>b?b:v, ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
function wIdx(ws){let s=0;for(const w of ws)s+=w;let r=rnd()*s;for(let i=0;i<ws.length;i++){r-=ws[i];if(r<0)return i;}return ws.length-1;}
function gauss(){let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
const BAL={mh0:38,mh1:4.2,mh2:0.03,ma0:9,ma1:0.62,ma2:0.0045,md0:3,md1:0.3,md2:0.002,bHp:1.6,bAtk:1.08,bDef:1.05,ex0:9,ex1:2.0,g0:4,g1:1.5,regen:0.03,gr:0.75,gp:0.7,fH:0.7,fA:0.8,fR:80};
const CLS_SUM=CLASSES.reduce((a,c)=>a+c.w,0);
const genName=()=>pick(NA)+pick(NB)+(rnd()<.4?pick(NB):'');
const PETK=Object.keys(PETS);
const biome=f=>clamp(Math.floor((f-1)/20),0,4);
const scl=f=>1+f/10;
const cid=R=>CLASSES[R.h.cls].id;
const hasPet=(R,p)=>R.pets.includes(p);
const need=L=>Math.round(18+9*L+0.9*L*L);
// string hash (FNV-1a) for seeded variants: same hero + same id -> same pick, different heroes differ
function shash(s){s=String(s);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
const vpick=(R,id,L)=>L[shash((R&&R.h?R.h.name+(R.h.look&&R.h.look.seed||''):'')+'|'+id)%L.length];
// sentence-repetition guard for flavour lines: each line of a list at most twice per run, never the same one twice in a row
function fresh(R,key,L){if(!R)return pick(L);const u=R.lu||(R.lu={});let best=0,bs=1e9;
 for(let i=0;i<L.length;i++){if(L.length>1&&u['_'+key]===i)continue;const n=u[key+i]||0,s=n+(n>=2?100:0)+rnd()*.5;if(s<bs){bs=s;best=i;}}
 u[key+best]=(u[key+best]||0)+1;u['_'+key]=best;return L[best];}
// ---- stance (ท่าที): always-available focus; modest effects on hazard, fights, loot and which encounters show up ----
const STANCES={atk:{n:'บุก',ic:'⚔',d:'ATK +10% แต่ DEF −5% เสี่ยงตายรายชั้นสูงขึ้นนิดหน่อย และเจอศึกหนักบ่อยขึ้น',a:1.1,df:.95,hz:1.08,g:1},
 def:{n:'ระวังตัว',ic:'🛡',d:'DEF +10% แต่ ATK −5% เสี่ยงตายรายชั้นลดลงนิดหน่อย',a:.95,df:1.1,hz:.92,g:.95},
 loot:{n:'หาของ',ic:'💰',d:'ทองที่ได้ +15% เจอหีบกับวงพนันบ่อยขึ้น แต่เสี่ยงขึ้นเล็กน้อย',a:1,df:.97,hz:1.04,g:1.15},
 help:{n:'ช่วยเหลือ',ic:'🤝',d:'เจอคนเจ็บและสัตว์หลงทางบ่อยขึ้น บางชั้นได้ทำบุญเล็กๆ แต่ทองที่ได้ลดลง 5%',a:1,df:1,hz:1,g:.95}};
const STK=['atk','def','loot','help'];
const stOf=R=>STANCES[R&&R.st]||STANCES.def;
const ST_SP={atk:{merc:1.6,dragon:1.6,door:1.3},def:{fountain:1.6,seer:1.3},loot:{mimic:1.8,gamble:1.6,starfall:1.3},help:{wounded:2.2,rpet:1.5,egg:1.4}};
const PST={bold:'atk',careful:'def',greedy:'loot',kind:'help'};
// headless heroes (cohort, balance sims) switch to guarding when badly hurt, otherwise follow their personality
const aiStance=R=>R.h.hp/R.h.mhp<.35?'def':PST[R.h.pers]||'def';
const HELPD=['ช่วยพยุงนักผจญภัยขาแพลงลงบันไดไปส่งที่ชั้นล่าง','แบ่งน้ำในกระติกให้เด็กยกของที่หลงขึ้นมาในหอ','ช่วยฝังศพนักผจญภัยนิรนามที่นอนอยู่ข้างทาง','ปล่อยนกที่ติดกับดักกลับออกไปทางหน้าต่าง','ช่วยพ่อค้าเร่เก็บของที่หกกระจายเต็มขั้นบันได'];
// ---- hazard model (1in8b life-table style): every floor 1..99 rolls death with p = 1-(1-q_f)^m ----
// q_f = A + E·e^{-(f-1)/4} (early bump) + B·e^{g·f} (Gompertz). g and B are fitted at load so that with m=1
// the median death floor is 53 and 2% of heroes survive to floor 100.
const HZ=(function(){const A=.002,E=.007,MED=53,S100=.02;
 const tab=(B,g)=>{const q=[0];for(let f=1;f<=100;f++)q.push(Math.min(.95,A+E*Math.exp(-(f-1)/4)+B*Math.exp(g*f)));return q;};
 const st=q=>{let s=1,med=0;for(let f=1;f<=99;f++){s*=1-q[f];if(!med&&s<=.5)med=f;}return{med,s};};
 const fitB=g=>{let lo=1e-9,hi=1;for(let i=0;i<50;i++){const B=Math.sqrt(lo*hi),r=st(tab(B,g));if(!r.med||r.med>MED)lo=B;else hi=B;}return hi;};
 let glo=.01,ghi=.08;for(let i=0;i<36;i++){const g=(glo+ghi)/2;if(st(tab(fitB(g),g)).s>S100)glo=g;else ghi=g;}
 const g=(glo+ghi)/2,B=fitB(g),q=tab(B,g);return{g,B,q,med:st(q).med,s100:st(q).s};})();
const pRoll=(f,m)=>f>=100?0:1-Math.pow(1-HZ.q[clamp(f,1,99)],clamp(m,.25,9));
// l(f): share of a base-hazard cohort (m=1) still alive on reaching floor f; milestone floors announce it
const LX=(function(){const l=[1,1];let s=1;for(let f=1;f<=99;f++){s*=1-HZ.q[f];l.push(s);}return l;})();
const MILES=[1,5,15,30,50,65,80,90,100];
const pctTxt=p=>{const v=p*100;return v>=10?Math.round(v)+'':v>=1?v.toFixed(1):v.toFixed(2);};
// projected death range if the multiplier stayed at m from floor f0 on
function project(f0,m){let s=1,a=0,b=0,med=0;for(let f=f0;f<=99;f++){s*=1-pRoll(f,m);if(!a&&s<=.75)a=f;if(!med&&s<=.5)med=f;if(!b&&s<=.25)b=f;}return{a:a||100,med:med||100,b:b||100,s100:s};}
const HINTS=['เทียนวันเกิดดับตั้งแต่ยังไม่ทันได้เป่า','หมอดูขมวดคิ้ว แล้วรีบทอนเงินคืนให้','เส้นชีวิตยาวพอๆ กับคนทั่วไป','เส้นชีวิตลากยาวเกินครึ่งฝ่ามือ','ยายทวดบอกว่าดวงแข็งกว่าใครในหมู่บ้าน','หมอดูเงียบไปนาน แล้วก้มลงไหว้'];
const hintIdx=f=>f<=30?0:f<=44?1:f<=56?2:f<=68?3:f<85?4:5;
function fuzzHint(f){let i=hintIdx(f);if(rnd()<.25)i=clamp(i+(rnd()<.5?-1:1),0,5);return i;}
// birth hazard: hidden constitution (log-normal frailty) x rank x LUK x run omen
const birthM=h=>h.con*Math.exp(-(h.rank-1.5)*.05)*clamp(Math.exp(-(h.luk-10)*.01),.75,1.25)*((omenOf(h).mod.hz)||1);
// hero personality: decides what the hero picks when the decision timer runs out
const PERS={bold:{n:'กล้าบ้าบิ่น',d:'ถ้าคุณไม่เลือก จะเลือกทางที่ได้สู้หรือได้เสี่ยง'},careful:{n:'ระมัดระวัง',d:'ถ้าคุณไม่เลือก จะเลี่ยงทางที่มีโอกาสเจ็บตัว'},
 greedy:{n:'โลภ',d:'ถ้าคุณไม่เลือก จะเลือกทางที่ได้ทองมากที่สุด'},kind:{n:'ใจบุญ',d:'ถ้าคุณไม่เลือก จะเลือกทางที่ได้ทำบุญ'}};
const PERS_W={war:[4,1,1,1],mag:[1,3,1,1],arc:[2,2,1,1],pri:[1,1,.5,4],rog:[1.5,1,4,.5],far:[1,1,2,2],dra:[3,1,1,1]};
function rollPers(ck,rk){const w=[...(PERS_W[CLASSES[ck].id]||[1,1,1,1])];if(rk>=3)w[0]+=1.5;if(rk===0)w[1]+=1.5;return['bold','careful','greedy','kind'][wIdx(w)];}
// rebirth: hidden karma of the previous life shifts the rank roll by about 2 percentage points per 10 karma (kShift in points)
function rankWeights(kShift){const w=RANKS.map(r=>r.w),s=clamp(kShift||0,-6,6);if(!s)return w;
 const hi=w.map((x,i)=>i>=3?x:0),hs=hi.reduce((a,b)=>a+b,0);
 if(s>0){const t=Math.min(s,w[0]-1);w[0]-=t;for(let i=3;i<w.length;i++)w[i]+=t*hi[i]/hs;}
 else{const t=Math.min(-s,hs/2);w[0]+=t;for(let i=3;i<w.length;i++)w[i]-=t*hi[i]/hs;}
 return w;}
function rollHero(o){o=o||{};
 const rk=wIdx(rankWeights(o.kShift)),ck=wIdx(CLASSES.map(c=>c.w)),C=CLASSES[ck],m=RANKS[rk].m;
 const h={name:genName(),village:pick(VILLAGES),rank:rk,cls:ck,lv:1,exp:0,mhp:C.hp*m,atk:C.atk*m,def:C.def*m,luk:C.luk+rk,mmp:C.mp*m,
  gold:Math.round(rr(12,28)*(1+rk*.45)*(C.id==='rog'?1.4:1)*(C.id==='far'?.6:1))};
 h.omen=pick(RUN_OMENS).id;const M=omenOf(h).mod;h.mhp*=M.hp||1;h.atk*=M.atk||1;h.def*=M.def||1;h.luk+=M.luk||0;h.gold=Math.round(h.gold*(M.g0||1));
 h.hp=h.mhp;h.mp=h.mmp;h.look=window.ART.rollLook(rollHero.form||'slime');h.odds=Math.round(1/((RANKS[rk].w/100)*(C.w/CLS_SUM)));
 h.con=clamp(Math.exp(gauss()*.35),.45,2.4);h.pers=rollPers(ck,rk);h.m0=birthM(h);h.proj=project(1,h.m0).med;h.hint=fuzzHint(h.proj);
 return h;
}
// ---- run omens: one blessing/curse per life, rolled at birth (data-driven multipliers read through R.mod) ----
const RUN_OMENS=[
 {id:'gold',k:'ผสม',n:'มือทอง ตัวบาง',d:'ทองตกมากขึ้นครึ่งหนึ่ง แต่ HP สูงสุดน้อยลง 15%',mod:{gold:1.5,hp:.85}},
 {id:'beast',k:'พร',n:'กลิ่นนมอุ่น',d:'สัตว์ชอบเดินตาม เจอสัตว์เลี้ยงบ่อยขึ้นมาก',mod:{pet:3}},
 {id:'merc',k:'ผสม',n:'ตลาดนักดาบ',d:'ทหารรับจ้างค่าตัวแพงขึ้น 60% แต่ฝีมือดีขึ้น 40%',mod:{cc:1.6,cp:1.4}},
 {id:'mimic',k:'คำสาป',n:'หีบหายใจได้',d:'หีบในหอคอยกลายเป็นมิมิกบ่อยกว่าปกติ ถ้าชนะก็ได้ของมากขึ้น',mod:{mimic:3,mimicP:.62,loot:1.4}},
 {id:'oldking',k:'ผสม',n:'บัลลังก์ผุ',d:'บอสอ่อนลง 15% แต่มอนสเตอร์ทั่วไปดุขึ้น 12%',mod:{boss:.85,mon:1.12}},
 {id:'blood',k:'ผสม',n:'เลือดร้อน',d:'ATK +20% แต่ DEF −20%',mod:{atk:1.2,def:.8}},
 {id:'shadow',k:'คำสาป',n:'เงาตามติด',d:'โอกาสตายทุกชั้นสูงขึ้น 20% แต่ LUK +6',mod:{hz:1.2,luk:6}},
 {id:'monk',k:'พร',n:'ศิษย์วัดป่า',d:'ฟื้น HP เพิ่มอีก 3% ทุกชั้น แต่ทองตั้งต้นเหลือครึ่งเดียว',mod:{regen:.03,g0:.5}},
 {id:'star',k:'พร',n:'เกิดคืนดาวตก',d:'เจอเรื่องระดับตำนานบ่อยกว่าคนอื่นสามเท่า',mod:{leg:3}},
 {id:'quiet',k:'ผสม',n:'ชีวิตเรียบง่าย',d:'โอกาสตายทุกชั้นลดลง 12% แต่จุดเปลี่ยนมาห่างกว่าเดิม',mod:{hz:.88,kg:2,quiet:2}},
 {id:'sage',k:'พร',n:'หัวไว',d:'ได้ EXP มากขึ้น 30%',mod:{xp:1.3}},
 {id:'debt',k:'คำสาป',n:'หนี้ข้ามชาติ',d:'ทุกครั้งที่ผ่านบอส เจ้าหนี้มาเก็บทอง 15% แต่ทหารรับจ้างค่าตัวถูกลงครึ่งหนึ่ง',mod:{debt:.15,cc:.5}}];
// mercenary personalities: a line they say + a trait that actually does something
const TRAITS=[
 {id:'brave',n:'บ้าบิ่น',d:'พลังโจมตีสูงกว่าคนอื่น 30%',pw:1.3,lines:['"ข้าไม่เคยถอยสักก้าว เลยมีแผลด้านหน้าเต็มตัว"','"เห็นอะไรใหญ่ๆ ข้าก็อยากฟันไปหมดแหละ"']},
 {id:'cheap',n:'งก',d:'ค่าจ้างถูก แต่ขอส่วนแบ่ง 10% ทุกครั้งที่ล้มบอสได้',cost:.6,lines:['"ค่าตัวข้าถูก แต่ของที่บอสทำหล่นข้าขอแบ่งด้วยนะ"','"ข้าคิดราคาเป็นมิตร ส่วนเรื่องแบ่งของค่อยว่ากันทีหลัง"']},
 {id:'lucky',n:'ดวงดี',d:'ปาร์ตี้ได้ LUK +4',lines:['"ข้าตกหอมาสามรอบแล้ว ยังไม่ตายสักที"','"ข้าเกิดวันพระ แม่บอกว่าโชคจะตามข้าไปทุกที่"']},
 {id:'shield',n:'โล่มนุษย์',d:'ยืนรับดาบแทน DEF ของคุณ +10%',lines:['"ยืนข้างหลังข้าไว้ก็พอ"','"ข้าตัวใหญ่ เอาไว้บังลูกธนูได้สบาย"']},
 {id:'loyal',n:'ภักดี',d:'ไม่ทรยศต่อให้กรรมคุณจะดำแค่ไหน',lines:['"นายจ้างคนก่อนของข้าตายไปแล้ว ข้ายังถือดาบของเขาอยู่เลย"','"ข้าให้สัญญาครั้งเดียว แล้วก็รักษามันจนตาย"']},
 {id:'mouth',n:'ปากหมา',d:'ฝีมือดีขึ้น 15% แต่ชอบด่าชาวบ้าน กรรมชั่ว −1 ตอนรับเข้าทีม',pw:1.15,lines:['"หน้าตาอย่างเจ้านี่นะจะขึ้นถึงยอดหอ ฮ่า! เอาเถอะ ข้าไปด้วย"','"เจ้าดูอ่อนกว่าที่ลือกันอีกนะ แต่ทองเจ้าดูดีอยู่"']},
 {id:'medic',n:'หมอยาเถื่อน',d:'ผ่านบอสได้ทีไร ต้มยาให้ 1 ขวด',pw:.9,lines:['"ข้ามียาทุกอย่าง ยกเว้นยาแก้โง่"','"ปวดหัวตัวร้อน มาหาข้า ส่วนขาขาดอันนั้นต้องลุ้นเอา"']}];
const trOf=c=>TRAITS.find(t=>t.id===c.tr);
const hasTr=(R,id)=>R.comps.some(c=>c.tr===id);
const omenOf=h=>RUN_OMENS.find(o=>o.id===h.omen)||RUN_OMENS[0];
const MD=(R,k,d)=>{const v=R.mod&&R.mod[k];return v===undefined?d:v;};
const keyGap=R=>ri(4,8)+(R?MD(R,'kg',0):0);
function newRun(h){const R={h:JSON.parse(JSON.stringify(h)),floor:1,pets:[],comps:[],potions:1,warps:0,map:Array(100).fill(''),farmed:Array(100).fill(0),farmN:0,retreats:0,kills:0,bosses:0,alive:true,won:false,cause:'',maxFloor:1,buys:{},seen:[],log:[],
 rolled:0,hzP:1,hzT:[],fateShift:0,mLog:0,mN:0,pMax:0,pMaxF:0,pPrev:[],lastP:0,omens:0,lastOmen:-9,scars:0,lethal:false,quiet:false,sinceKey:0,keyGap:5,egg:null,farmLeft:0,pend:null,keys:0,timeouts:0,reveal:null,cursed:0,lastSp:'',death:'',kt:{},
 way:{},sameN:0,plainN:0,ledger:[],kctx:'',lastKOmen:-9,
 mod:Object.assign({},omenOf(h).mod),used:{},omenX:[],arcs:{},quietN:0,drama:0,lastQuiet:0,lastDrama:0,lastDramaId:'',hist:[],xseen:null,
 st:PST[h.pers]||'def',stH:'',stCh:0,coh:[],mile:[],lu:{},gIn:0,gPrev:h.gold,ck:'',theme:''};
 trackKarma(R);R.keyGap=keyGap(R);planArcs(R);
 // apprentice inheritance: the pet joins at once, the master's karma follows as a ledger row and a small blessing or debt
 const I=h.inh;if(I&&typeof I==='object'){if(I.pet&&PETS[I.pet])R.pets.push(I.pet);
  if(I.k){R.kctx=`มรดกกรรมจาก${I.from||'อาจารย์'}`;R.karma+=I.k;R.kctx='';}
  if(I.k>=2)R.hzP*=.94;else if(I.k<=-2)R.hzP*=1.06;}
 return R;}
// ---- karma ledger: every change of R.karma is written down with the floor and what caused it (R.kctx) ----
function trackKarma(R){let k=0;Object.defineProperty(R,'karma',{enumerable:true,configurable:true,get:()=>k,set:v=>{const d=v-k;k=v;if(!d)return;
 const t=R.kctx||'เรื่องเล็กๆ ระหว่างทาง',L=R.ledger,l=L[L.length-1];if(l&&l.t===t&&l.f===R.floor){l.d+=d;if(!l.d)L.pop();}else L.push({f:R.floor,d,t});}});}
// ---- per-floor hazard multiplier m from the hero's current state ----
function hzParts(R){const h=R.h,hf=clamp(h.hp/h.mhp,0,1),P={};
 P.hp=Math.exp((.75-hf)*1.1);P.luk=clamp(Math.exp(-(eLuk(R)-10-R.floor*.08)*.01),.75,1.3);P.karma=clamp(Math.exp(-R.karma*.018),.6,2.4);
 P.curse=Math.pow(1.3,R.cursed);P.scar=1+.1*R.scars;const al=R.pets.length+R.comps.length;P.ally=al?Math.pow(.93,R.pets.length)*Math.pow(.9,R.comps.length):1.12;
 P.omen=MD(R,'hz',1);P.stance=stOf(R).hz;P.born=h.con*Math.exp(-(h.rank-1.5)*.05);P.fate=R.hzP;P.temp=R.hzT.reduce((a,t)=>t.until>=R.floor?a*t.k:a,1);return P;}
function hzM(R){const P=hzParts(R);let m=1;for(const k in P)m*=P[k];return clamp(m*HZ_NORM,.25,9);}
const HZ_NORM=1.3; // re-centres the typical in-run multiplier (geo-mean of the raw m in play is ~0.6-0.7) back to 1
const curP=R=>pRoll(R.floor,hzM(R));
// roll today's death once per floor number; returns true if fate takes the hero here
function rollFloor(R){if(R.floor<=R.rolled||R.floor>=100)return false;R.rolled=R.floor;R.stH=(R.stH||'')+(R.st||'def')[0];const m=hzM(R),p=pRoll(R.floor,m);
 R.mLog+=Math.log(m);R.mN++;if(p>R.pMax){R.pMax=p;R.pMaxF=R.floor;}R.pPrev.push(p);if(R.pPrev.length>4)R.pPrev.shift();R.lastP=p;R.hzT=R.hzT.filter(t=>t.until>=R.floor);
 return rnd()<p;}
// "fate shifts" from events: d floors of extra life ~ hazard x e^{-g d} (Gompertz slope)
function shiftFate(R,d){R.hzP*=Math.exp(-HZ.g*d);R.fateShift+=d;return d;}
const eAtk=R=>R.h.atk*(hasPet(R,'fox')?1.12:1)*stOf(R).a;
const eDef=R=>R.h.def*(hasPet(R,'wolf')?1.12:1)*(hasTr(R,'shield')?1.1:1)*stOf(R).df;
const eLuk=R=>(R.h.luk+(hasPet(R,'owl')?6:0)+(hasTr(R,'lucky')?4:0))*(cid(R)==='far'?1.5:1);
const riskAdj=(R,p)=>clamp(p*clamp(1-(eLuk(R)-8)*.012,.45,1.25),.02,.95);
const critCh=R=>clamp(.05+eLuk(R)*.004+(cid(R)==='arc'?.12:0),0,.5);
const dodgeCh=R=>clamp(eLuk(R)*.0025,0,.2);
const fleeCh=R=>clamp(.45+eLuk(R)*.008+(cid(R)==='arc'?.2:0),.1,.92);
const tameCh=R=>clamp(.12+eLuk(R)*.006,.05,.6);
const normT=t=>String(t).replace(/[\d.,]+/g,'#');
// the log never shows the same sentence (numbers ignored) twice in a row
function say(R,out,t,c){out.msgs.push({t,c:c||'info'});if(R.quiet)return;const p=R.log[0];if(p&&normT(p.t)===normT(t))return;R.log.unshift({f:R.floor,t,c:c||'info'});if(R.log.length>160)R.log.length=160;}
// a line that must survive a quiet stretch's summary (milestones, cohort news, rare finds)
function sayK(R,out,t,c){say(R,out,t,c);out.msgs[out.msgs.length-1].keep=1;}
function mkMon(t,f,k){const gr=1+BAL.gr*Math.pow(f/100,BAL.gp),hp=(BAL.mh0+BAL.mh1*f+BAL.mh2*f*f)*t.hp*k*gr;
 return{id:t.id,n:t.n,hp,mhp:hp,atk:gr*(BAL.ma0+BAL.ma1*f+BAL.ma2*f*f)*t.atk*(k>1?1.05:(k<1?.8:1)),def:(BAL.md0+BAL.md1*f+BAL.md2*f*f)*t.def,pet:t.pet||null,boss:false,x:t.x};}
const monsOf=b=>MONS.filter(m=>m.b.includes(b));
function genMonster(f,R){const en=mkMon(pick(monsOf(biome(f))),f,1);return R?modMon(R,en,MD(R,'mon',1)):en;}
function modMon(R,en,k){if(k!==1){en.hp*=k;en.mhp=en.hp;en.atk*=k;}return en;}
function mkBoss(f){const b=biome(f),B=BOSSES[b],second=f%20===0,fin=f===100;
 const base=mkMon({hp:1,atk:1,def:1},f,1),hk=BAL.bHp*(fin?BAL.fH:1)*(f<=20?.75:1),ak=BAL.bAtk*(fin?BAL.fA:1);
 return{id:B.id,n:second?B.n2:B.n,hp:base.hp*hk,mhp:base.hp*hk,atk:base.atk*ak,def:base.def*BAL.bDef,boss:true,x:B.x};}
function genComp(f,R){const c=pick(['war','mag','arc','pri']),T=pick(TRAITS);return{n:pick(COMPN),cls:c,pw:(4+f*.6)*(R?MD(R,'cp',1):1)*(T.pw||1),tr:T.id,line:pick(T.lines),cm:T.cost||1};}
const compCost=(R,c)=>Math.round(25*scl(R.floor)*MD(R,'cc',1)*(c&&c.cm||1));
const warpCost=R=>Math.round(70*scl(R.floor));
function power(a,d,hp){return Math.round(a*1.6+d*1.2+hp*.15);}
const heroPower=R=>power(eAtk(R)+R.comps.reduce((s,c)=>s+c.pw*.6,0),eDef(R),R.h.mhp);
function fight(R,en,o){o=o||{};const h=R.h,id=cid(R),A=eAtk(R),D=eDef(R),cc=critCh(R),dg=dodgeCh(R),rec=!o.dry;
 let hp=h.hp,ehp=en.hp,mp=h.mp;const ev=[];const bm=en.boss&&id==='dra'?1.25:1,em=o.enMul||1;
 const hit=(a,d)=>a*a/(a+d);
 if(mp>=10){mp-=10;if(id==='pri'){hp=Math.min(h.mhp,hp+h.mhp*.25);rec&&ev.push({t:'heal',hp,ehp});}else{const d=hit(A,en.def)*(id==='mag'?2.5:1.3)*bm;ehp-=d;rec&&ev.push({t:'skill',d,hp,ehp});}}
 if(o.ambush){const d=hit(en.atk*em,D)*rr(.85,1.15);hp-=d;rec&&ev.push({t:'e',d,hp,ehp});}
 for(let r=0;r<(en.boss&&R.floor===100?BAL.fR:40)&&ehp>0&&hp>0;r++){
  const cr=rnd()<cc;let d=hit(A,en.def)*rr(.85,1.15)*(cr?1.8:1)*bm;ehp-=d;rec&&ev.push({t:'h',d,cr,hp,ehp});if(ehp<=0)break;
  for(const c of R.comps){if(c.cls==='pri')hp=Math.min(h.mhp,hp+h.mhp*.03);const d2=hit(c.pw,en.def)*rr(.8,1.2)*(c.cls==='pri'?.5:1);ehp-=d2;rec&&ev.push({t:'c',n:c.n,d:d2,hp,ehp});if(ehp<=0)break;}
  if(ehp<=0)break;
  if(hasPet(R,'wolf')){const d3=hit(A*.25,en.def);ehp-=d3;rec&&ev.push({t:'p',d:d3,hp,ehp});if(ehp<=0)break;}
  if(rnd()<dg){rec&&ev.push({t:'miss',hp,ehp});continue;}
  const ed=hit(en.atk*em,D)*rr(.85,1.15)*(id==='war'?.88:1);hp-=ed;rec&&ev.push({t:'e',d:ed,hp,ehp});
 }
 return{win:hp>0,hp:Math.max(0,hp),mp,ev,ehp:Math.max(0,ehp)};
}
function estimateWin(R,en,n){let w=0;for(let i=0;i<n;i++)if(fight(R,en,{dry:true}).win)w++;return w/n;}
function gainExp(R,x,out){const h=R.h;if(cid(R)==='far')x*=1.25;x*=MD(R,'xp',1);h.exp+=x;const C=CLASSES[h.cls],m=RANKS[h.rank].m;
 while(h.exp>=need(h.lv)){h.exp-=need(h.lv);h.lv++;h.mhp+=C.g.hp*m;h.atk+=C.g.atk*m;h.def+=C.g.def*m;h.luk+=C.g.luk;h.mmp+=C.g.mp*m;h.hp=Math.min(h.mhp,h.hp+h.mhp*.3);h.mp=h.mmp;
  out&&say(R,out,`เลเวลอัป! ตอนนี้ Lv.${h.lv}`,'lv');}}
function addPet(R,p,out){if(R.pets.length>=2){R.h.gold+=Math.round(20*scl(R.floor));say(R,out,`ไม่มีที่ว่างเลี้ยง${PETS[p].n} เลยขายต่อได้ทองมา`,'info');return;}R.pets.push(p);say(R,out,`${PETS[p].n} เข้าร่วมปาร์ตี้! (${PETS[p].d})`,'good');}
function addComp(R,c,out){if(R.comps.length>=2)return;R.comps.push(c);const T=trOf(c);say(R,out,`${c.n} (${clsName(c.cls)}${T?' · '+T.n:''}) เข้าร่วมทีม!`,'good');if(c.tr==='mouth'){const kc=R.kctx;R.kctx=`${c.n}ปากเสีย ด่าพ่อค้าจนร้องไห้`;R.karma-=1;R.kctx=kc;say(R,out,`${c.n}เดินไปด่าพ่อค้าแถวนั้นจนเขาร้องไห้`,'bad');}}
const clsName=id=>CLASSES.find(c=>c.id===id).n;
function fxParts(R,fx){const s=scl(R.floor),P=[],f=R.floor;if(!fx)return P;
 if(fx.hp)P.push({t:`HP ${fx.hp>0?'+':'−'}${Math.round(Math.abs(fx.hp)*100)}%`,c:fx.hp>0?'g':'b'});
 if(fx.gold)P.push({t:`${fx.gold>0?'+':'−'}${Math.round(Math.abs(fx.gold)*s)} ทอง`,c:fx.gold>0?'g':'b'});
 if(fx.exp)P.push({t:`+${Math.round(fx.exp*s)} EXP`,c:'g'});
 if(fx.atk)P.push({t:`ATK +${(fx.atk*(1+f/30)).toFixed(1)}`,c:'g'});
 if(fx.def)P.push({t:`DEF +${(fx.def*(1+f/30)).toFixed(1)}`,c:'g'});
 if(fx.luk)P.push({t:`LUK ${fx.luk>0?'+':'−'}${Math.abs(fx.luk)}`,c:fx.luk>0?'g':'b'});
 if(fx.mhp)P.push({t:`HP สูงสุด +${Math.round(fx.mhp*100)}%`,c:'g'});
 if(fx.mmp)P.push({t:`MP สูงสุด +${fx.mmp}`,c:'g'});
 if(fx.pot)P.push({t:`+${fx.pot} ยา`,c:'g'});
 if(fx.warp)P.push({t:'+ม้วนวาร์ป',c:'g'});
 if(fx.pet)P.push({t:'ได้สัตว์เลี้ยง',c:'g'});
 if(fx.skip)P.push({t:`ข้าม ${fx.skip} ชั้น`,c:'g'});
 if(fx.fight)P.push({t:'ต้องสู้!',c:'b'});
 if(fx.k>0)P.push({t:'✦ กรรมดี',c:'kk'});if(fx.k<0)P.push({t:'✧ กรรมชั่ว',c:'kk'});
 return P;}
function applyFx(R,fx,out){const h=R.h,f=R.floor,s=scl(f);if(!fx)return;
 if(fx.hp){if(fx.hp>0)h.hp=Math.min(h.mhp,h.hp+fx.hp*h.mhp);else h.hp-=-fx.hp*h.mhp*(cid(R)==='war'?.88:1);}
 if(fx.gold){if(fx.gold>0)h.gold+=Math.round(fx.gold*s*(cid(R)==='rog'?1.3:1)*MD(R,'gold',1)*stOf(R).g);else h.gold=Math.max(0,h.gold-Math.round(-fx.gold*s));}
 if(fx.exp)gainExp(R,fx.exp*s,out);
 if(fx.atk)h.atk+=fx.atk*(1+f/30);if(fx.def)h.def+=fx.def*(1+f/30);
 if(fx.luk)h.luk=Math.max(0,h.luk+fx.luk);
 if(fx.mhp){h.mhp*=1+fx.mhp;h.hp=Math.min(h.mhp,h.hp);}
 if(fx.mmp){h.mmp+=fx.mmp;h.mp+=fx.mmp;}
 if(fx.k)R.karma+=fx.k;if(fx.pot)R.potions+=fx.pot;if(fx.warp)R.warps+=fx.warp;
 if(fx.pet)addPet(R,fx.pet==='r'?pick(PETK):fx.pet,out);
 // auto mode: a warp never skips a boss floor (skipped floors are not rolled for death)
 if(fx.skip){const nb=Math.ceil(f/10)*10,tg=Math.min(f+fx.skip,nb-1);for(let i=f;i<tg;i++)R.map[i]='warp';if(tg>f){R.floor=tg;if(tg>R.maxFloor)R.maxFloor=tg;say(R,out,`ถูกดูดขึ้นไปถึงชั้น ${tg}!`,'good');}}
 if(fx.fight&&h.hp>0)doFight(R,genMonster(R.floor,R),out);}
function bossPerks(R,gd,out){const h=R.h;
 R.comps.forEach(c=>{if(c.tr==='cheap'){const cut=Math.round(gd*.1);h.gold-=cut;say(R,out,`${c.n}หยิบส่วนแบ่งไป ${cut} ทอง ตามที่ตกลงกันไว้`,'info');}
  if(c.tr==='medic'){R.potions++;say(R,out,`${c.n}ต้มยาจากเลือดบอสได้หนึ่งขวด กลิ่นแย่มากแต่ใช้ได้`,'good');}});
 const dt=MD(R,'debt',0);if(dt){const cut=Math.round(h.gold*dt);h.gold-=cut;say(R,out,`เจ้าหนี้จากชาติก่อนโผล่มาเก็บดอก ${cut} ทอง`,'bad');}}
function doFight(R,en,out,o){o=o||{};const h=R.h,f=R.floor;const res=fight(R,en,o);
 out.combat={en,ev:res.ev,win:res.win,startHp:h.hp,mhp:h.mhp};h.hp=res.hp;h.mp=res.mp;out.enemy=en;
 if(res.win){R.kills++;const k=o.rw||1;const ex=(BAL.ex0+BAL.ex1*f)*(en.boss?6:1)*k;
  const gd=Math.round((en.boss?(60+15*f)*rr(.9,1.2):(BAL.g0+BAL.g1*f)*rr(.7,1.3)*k)*(cid(R)==='rog'?1.3:1)*MD(R,'gold',1)*stOf(R).g);
  h.gold+=gd;say(R,out,`ปราบ${en.n}! +${Math.round(ex)} EXP · +${gd} ทอง`,'good');gainExp(R,ex,out);if(en.boss){out.coins=gd;bossPerks(R,gd,out);}}
 else{out.cause=o.cause||`ถูก${en.n}สังหารที่ชั้น ${f}`;say(R,out,`พ่ายแพ้ต่อ${en.n}…`,'bad');}
 return res.win;}
function genEvent(R){const f=R.floor;if(f%10===0)return{kind:'boss',en:modMon(R,mkBoss(f),MD(R,'boss',1))};
 let r=rnd();if(r<.3)return{kind:'mon',en:genMonster(f,R)};r-=.3;
 const hk=R.st==='help'?1.3:1,pr=.05*MD(R,'pet',1)*hk;if(r<pr&&R.pets.length<2)return{kind:'pet',pet:pick(PETK)};r-=pr;
 if(r<.06*hk&&R.comps.length<2)return{kind:'comp',comp:genComp(f,R)};
 const b=biome(f);let pool=[];EVENTS.forEach((e,i)=>{if((e.b===b||e.b===-1)&&!R.seen.includes(i))pool.push(i);});
 if(!pool.length)EVENTS.forEach((e,i)=>{if(e.b===b||e.b===-1)pool.push(i);});
 const ti=pick(pool);R.seen.push(ti);if(R.seen.length>6)R.seen.shift();return{kind:'ev',ti};}
function chDis(R,ch){if(ch.c&&R.h.gold<Math.round(ch.c*scl(R.floor)))return'ทองไม่พอ';if(ch.req==='pot'&&R.potions<1)return'ไม่มียา';return'';}
function estCached(R,ev,n){const k=Math.round(R.h.hp)+'|'+Math.round(R.h.atk)+'|'+R.comps.length+'|'+R.pets.join();if(ev.ek!==k){ev.ek=k;ev.est=estimateWin(R,ev.en,n);}return ev.est;}
function choicesOf(R,ev){const h=R.h,f=R.floor,s=scl(f);
 if(ev.kind==='ev')return EVENTS[ev.ti].c.map(ch=>{const P=[];if(ch.c)P.push({t:`−${Math.round(ch.c*s)} ทอง`,c:'w'});
  if(ch.p){const pp=Math.round(riskAdj(R,ch.p)*100);
   if(ch.gn){P.push({t:`${100-pp}% ${ch.gn}`,c:'g'},...fxParts(R,ch.g),{t:`/ ${pp}% ${ch.pn}`,c:'b'},...fxParts(R,ch.b));}
   else{P.push(...fxParts(R,ch.g),{t:`· ${pp}% ${ch.pn}`,c:'b'});}}else P.push(...fxParts(R,ch.g));
  if(!P.length)P.push({t:'ไม่มีอะไรเปลี่ยน',c:''});const d=chDis(R,ch);if(d)P.push({t:`(${d})`,c:'b'});return{t:ch.t,P,dis:!!d};});
 if(ev.kind==='mon'){const w=Math.round(estCached(R,ev,60)*100),en=ev.en;
  const ex=Math.round(BAL.ex0+BAL.ex1*f),gd=Math.round(BAL.g0+BAL.g1*f);const can=en.pet&&R.pets.length<2;
  return[{t:'สู้!',P:[{t:`โอกาสชนะ ~${w}%`,c:w>=70?'g':w>=40?'w':'b'},{t:`+${ex} EXP`,c:'g'},{t:`+~${gd} ทอง`,c:'g'}]},
   {t:'หนี',P:[{t:`${Math.round(fleeCh(R)*100)}% หนีรอด`,c:'w'},{t:'พลาด = โดนตีก่อนแล้วต้องสู้',c:'b'}]},
   {t:'จับมาเลี้ยง',dis:!can,P:can?[{t:`${Math.round(tameCh(R)*100)}% สำเร็จ`,c:'w'},{t:`ได้${PETS[en.pet].n}`,c:'g'},{t:'พลาด = มันคลั่ง',c:'b'}]:[{t:en.pet?'(สัตว์เลี้ยงเต็ม 2 ตัวแล้ว)':'(ตัวนี้เชื่องไม่ได้)',c:'b'}]}];}
 if(ev.kind==='pet'){const P=PETS[ev.pet];return[{t:R.pets.length<2?`รับเลี้ยง${P.n}`:`สลับกับ${PETS[R.pets[0]].n}`,P:[{t:P.d,c:'g'}]},
  {t:'ให้อาหารแล้วปล่อยไป',P:[{t:'✦ กรรมดี',c:'kk'}]},{t:'จับไปขายตลาดมืด',P:[{t:`+${Math.round(15*s)} ทอง`,c:'g'},{t:'✧ กรรมชั่ว',c:'kk'}]}];}
 if(ev.kind==='comp'){const c=ev.comp,cost=compCost(R,c),full=R.comps.length>=2;
  return[{t:`จ้าง${c.n}`,dis:full||h.gold<cost,P:[{t:`−${cost} ทอง`,c:'w'},{t:`พลัง ${Math.round(c.pw)}`,c:'g'},...(full?[{t:'(ทีมเต็ม)',c:'b'}]:h.gold<cost?[{t:'(ทองไม่พอ)',c:'b'}]:[])]},
   {t:'ช่วยทำภารกิจ แลกกับให้เขาร่วมทีม',dis:full,P:[{t:`${100-Math.round(riskAdj(R,.35)*100)}% สำเร็จ`,c:'g'},{t:'✦ กรรมดี',c:'kk'},{t:`/ ${Math.round(riskAdj(R,.35)*100)}% ภารกิจพลาด HP −20%`,c:'b'}]},
   {t:'ปฏิเสธ',P:[{t:'เดินทางต่อคนเดียว',c:''}]}];}
 if(ev.kind==='boss'){const w=Math.round(estCached(R,ev,150)*100),wc=warpCost(R);
  return[{t:'สู้กับบอส!',P:[{t:`โอกาสชนะ ~${w}%`,c:w>=65?'g':w>=35?'w':'b'},{t:`+ทองก้อนโต`,c:'g'},{t:'แพ้ = ตาย',c:'b'}]},
   {t:'ใช้ม้วนวาร์ป',dis:f===100||(R.warps<1&&h.gold<wc),P:f===100?[{t:'(ชั้นสุดท้ายวาร์ปข้ามไม่ได้)',c:'b'}]:R.warps>0?[{t:`ใช้ม้วนที่มี (${R.warps})`,c:'w'},{t:'ข้ามบอส ไม่ได้รางวัล',c:''}]:[{t:`ซื้อฉุกเฉิน −${wc} ทอง`,c:'w'},{t:'ข้ามบอส ไม่ได้รางวัล',c:''}]},
   {t:'ถอยลงไปตั้งหลัก',P:[{t:`กลับชั้น ${f-1} ไปฟาร์มเวล`,c:'w'}]}];}
 return[];}
const SAVED=['เกือบตายไปแล้ว แต่ชะตายังไม่ถึงฆาต','ล้มลงไปรอบหนึ่ง ลืมตาขึ้นมาอีกทีก็ยังหายใจอยู่','ภาพตรงหน้ามืดไปครู่หนึ่ง พอรู้สึกตัวก็ลุกขึ้นเดินต่อได้','ร่างกายพังไปครึ่งหนึ่ง แต่หอคอยยังไม่ยอมรับวิญญาณคุณ'];
// death only when the fight was a chosen lethal one (boss); otherwise survive scarred (scars raise the floor hazard)
function mortal(R,out,cause){if(R.h.hp>0||!R.alive)return;
 if(R.lethal){die(R,cause||`สิ้นใจที่ชั้น ${R.floor}`);return;}
 R.h.hp=Math.max(1,R.h.mhp*.12);R.scars++;out.saved=true;say(R,out,fresh(R,'sv',SAVED)+` (แผลเป็น ${R.scars})`,'lv');}
function resolve(R,ev,i){const h=R.h,f=R.floor;const out={msgs:[],combat:null,after:'result',coins:0,enemy:null,cause:''};
 const cs=choicesOf(R,ev);if(!cs[i]||cs[i].dis)return null;
 if(ev.kind==='ev'){const T=EVENTS[ev.ti],ch=T.c[i];R.kctx=`${T.t}: ${ch.t}`;
  if(ch.c)h.gold-=Math.round(ch.c*scl(f));if(ch.req==='pot')R.potions--;
  say(R,out,`${T.t}: เลือก "${ch.t}"`,'info');gainExp(R,4+.6*f,out);
  const bad=ch.p?rnd()<riskAdj(R,ch.p):false;const fx=bad?(ch.b||{}):(ch.g||{});
  say(R,out,bad?(ch.bm||`${ch.pn}!`):(ch.gm||(ch.gn?`${ch.gn}!`:'ผ่านไปได้ด้วยดี')),bad?'bad':'good');
  R.map[f-1]=bad?(fx.hp<0||fx.fight?'trap':'bad'):(fx.k>0?'good':fx.k<0?'evil':fx.gold>0?'treasure':fx.pet?'pet':'calm');
  applyFx(R,fx,out);if(fx.fight)R.map[f-1]='fight';
  if(!out.cause)out.cause=`${T.t}: ${bad?ch.pn:'โชคร้าย'} (ชั้น ${f})`;}
 else if(ev.kind==='mon'){const en=ev.en;R.map[f-1]='fight';
  if(i===0){say(R,out,`เข้าปะทะ${en.n}!`,'info');doFight(R,en,out);}
  else if(i===1){if(rnd()<fleeCh(R)){say(R,out,`วิ่งหนี${en.n}ได้สำเร็จ`,'good');R.map[f-1]='flee';gainExp(R,2+.3*f,out);}
   else{say(R,out,'หนีไม่พ้น! โดนตีจากด้านหลัง','bad');doFight(R,en,out,{ambush:true});}}
  else{if(rnd()<tameCh(R)){say(R,out,`${en.n}ยอมสยบ!`,'good');addPet(R,en.pet,out);R.map[f-1]='pet';gainExp(R,(BAL.ex0+BAL.ex1*f)*.5,out);}
   else{say(R,out,`${en.n}คลั่งหนักกว่าเดิม!`,'bad');doFight(R,en,out,{enMul:1.2});}}}
 else if(ev.kind==='pet'){const P=PETS[ev.pet];R.map[f-1]='pet';R.kctx=`${P.n}: ${cs[i].t}`;
  if(i===0){if(R.pets.length>=2){say(R,out,`ปล่อย${PETS[R.pets[0]].n}กลับป่า`,'info');R.pets.shift();}addPet(R,ev.pet,out);}
  else if(i===1){R.karma+=2;say(R,out,`${P.n}กินอิ่มแล้ววิ่งจากไปอย่างมีความสุข`,'good');R.map[f-1]='good';}
  else{R.karma-=3;h.gold+=Math.round(15*scl(f));say(R,out,`ขาย${P.n}ได้ทองมา ก่อนไปมันหันมามองคุณตาละห้อย`,'bad');R.map[f-1]='evil';}}
 else if(ev.kind==='comp'){const c=ev.comp;R.map[f-1]='comp';R.kctx=`${c.n}: ${cs[i].t}`;
  if(i===0){h.gold-=compCost(R,c);addComp(R,c,out);}
  else if(i===1){if(rnd()<riskAdj(R,.35)){say(R,out,`ทำภารกิจให้${c.n}สำเร็จ`,'good');R.karma+=1;addComp(R,c,out);}else{say(R,out,'ภารกิจพลาด! บาดเจ็บหนัก','bad');h.hp-=h.mhp*.2;out.cause=`ภารกิจของ${c.n}ล้มเหลว (ชั้น ${f})`;}}
  else{say(R,out,`บอกลา${c.n} แล้วเดินต่อคนเดียว`,'info');R.map[f-1]='calm';}}
 else if(ev.kind==='boss'){const en=ev.en;
  if(i===0){say(R,out,`ท้าชิงบอส ${en.n}!`,'info');R.map[f-1]='boss';
   if(doFight(R,en,out,{cause:`พ่ายแพ้ต่อบอส ${en.n} (ชั้น ${f})`})){R.bosses++;R.retreats=0;if(f===100){R.won=true;out.after='end';say(R,out,'พิชิตยอดหอคอยโชคชะตา!','lv');}else out.after='shop';}}
  else if(i===1){if(R.warps>0)R.warps--;else h.gold-=warpCost(R);R.map[f-1]='warp';R.retreats=0;say(R,out,`ฉีกม้วนวาร์ป ข้าม${en.n}ไปอย่างเงียบๆ`,'info');out.after='shop';}
  else{R.retreats++;R.floor=Math.max(1,f-1);R.farmN=0;say(R,out,`ถอยลงไปชั้น ${R.floor} เพื่อตั้งหลักและฟาร์มเวล`,'info');out.after='retreat';}}
 if(R.alive&&h.hp<=0)mortal(R,out,out.cause||`สิ้นใจที่ชั้น ${f}`);
 if(R.won)R.alive=false;
 return out;}
function die(R,c){R.alive=false;R.cause=c;R.ck=R.ck||'boss';R.h.hp=0;R.map[R.floor-1]='death';}
function farm(R){const out={msgs:[],combat:null,after:'result',coins:0,cause:''},f=R.floor;const t=pick(monsOf(biome(f)));
 const amb=rnd()<riskAdj(R,.1);const en=modMon(R,mkMon(t,f,amb?1.05:.6),MD(R,"mon",1));if(amb)say(R,out,`ฝูง${t.n}รุมล้อม!`,'bad');else say(R,out,`ฟาร์มอยู่ชั้น ${f}: ล่า${t.n}`,'info');
 const m=Math.max(.25,1-.2*R.farmN);doFight(R,en,out,{rw:.6*m,cause:`ฟาร์มเพลินจนถูก${t.n}รุมสังหาร (ชั้น ${f})`});
 R.farmN++;R.farmed[f-1]++;if(!R.map[f-1])R.map[f-1]='farm';
 if(R.h.hp<=0)mortal(R,out,out.cause);return out;}
function drink(R){if(R.potions<1)return false;R.potions--;R.h.hp=Math.min(R.h.mhp,R.h.hp+R.h.mhp*.45);return true;}
function climb(R){const out={msgs:[]},h=R.h,id=cid(R);R.floor++;if(R.floor>R.maxFloor)R.maxFloor=R.floor;R.farmN=0;
 const rg=BAL.regen+MD(R,'regen',0)+(id==='pri'?.06:0)+(id==='dra'?.03:0)+(hasPet(R,'slime')?.04:0);h.hp=Math.min(h.mhp,h.hp+h.mhp*rg);h.mp=Math.min(h.mmp,h.mp+h.mmp*.2);
 R.comps.forEach(c=>c.pw*=1.015);
 {const d=h.gold-(R.gPrev||0);if(d>0)R.gIn=(R.gIn||0)+d;R.gPrev=h.gold;}
 // stance "help": now and then a small good deed on the way up
 if(R.st==='help'&&rnd()<.07){R.kctx='ช่วยคนระหว่างทาง';R.karma+=1;R.kctx='';say(R,out,fresh(R,'hd',HELPD)+' (ท่าทีช่วยเหลือ)','good');}
 cohTick(R,out);mileTick(R,out);
 // hidden karma only leaks through the odd bad omen when it is very negative
 if(R.karma<=-15&&R.floor-R.lastKOmen>=5&&rnd()<.15){R.lastKOmen=R.floor;say(R,out,fresh(R,'ko',KOMEN),'info');}
 if(R.karma<-8)for(let i=R.comps.length-1;i>=0;i--){if(R.comps[i].tr!=='loyal'&&rnd()<Math.min(.1,-R.karma*.004)){const c=R.comps[i];const st=Math.round(h.gold*.25);h.gold-=st;R.comps.splice(i,1);say(R,out,`${c.n}ทรยศ! ขโมยทอง ${st} แล้วหนีไป (กรรมตามสนอง)`,'bad');}}
 return out;}
// milestone floors: how much of a base-hazard cohort is still alive (from the same life table, m=1)
function mileTick(R,out){if(!R.mile)R.mile=[];let M=0;for(const m of MILES)if(m<=R.floor&&!R.mile.includes(m)){R.mile.push(m);M=m;}if(!M)return;
 const p=LX[M];sayK(R,out,M===1?'นักผจญภัยรุ่นเดียวกันทุกคนยังอยู่ครบ บันไดขั้นแรกแน่นไปด้วยคน':`ชั้น ${M}: นักผจญภัยรุ่นเดียวกันเหลือรอดราว ${pctTxt(p)}%`,'lv');out.mile={f:M,p};}
// cohort news: heroes who entered with you (simulated up front) are reported once you pass the floor where they fell
const COHL=['{n} เพื่อนรุ่นเดียวกัน จากไปที่ชั้น {f}','ข่าวมาถึงว่า {n} ({c}) เพื่อนรุ่นเดียวกัน ล้มลงที่ชั้น {f}','มีป้ายหลุมใหม่ที่ชั้น {f} เป็นของ {n} ที่เข้าหอมาพร้อมคุณ','{n} เพื่อนรุ่นเดียวกัน ไปได้ไม่เกินชั้น {f}'];
function cohTick(R,out){if(!R.coh)return;for(const c of R.coh){if(c.sh||c.won||c.f>=R.floor)continue;c.sh=1;
 sayK(R,out,fresh(R,'ch',COHL).replace('{n}',c.n).replace('{c}',c.cn).replace('{f}',c.f),'info');}}
const KOMEN=['หมาป่าทุกตัวในชั้นนี้หันมาหอนใส่คุณพร้อมกัน','น้ำในกระติกขมเหมือนสนิม ทั้งที่เพิ่งเติมมาเมื่อชั้นก่อน','กาดำเกาะเรียงกันบนราวบันได แล้วมองตามคุณจนลับตา','เงาของคุณบนผนังดูยาวกว่าที่ควร และมีมือมากกว่าสองข้าง','เมื่อคืนฝันว่ามีคนยืนต่อแถวรอทวงอะไรบางอย่างจากคุณ','เทียนที่จุดไว้ดับทุกครั้งที่คุณเดินเข้าใกล้'];
function enterShop(R){R.h.hp=Math.min(R.h.mhp,R.h.hp+R.h.mhp*.2);}
function shopList(R){const f=R.floor,h=R.h,b=R.buys,s=scl(f),inc=k=>Math.pow(1.3,b[k]||0);
 const L=[{id:'heal',n:'พักฟื้นเต็มที่',d:'ฟื้น HP และ MP จนเต็ม',cost:Math.round(8*s)},
 {id:'pot',n:'ยาฟื้นพลัง',d:'ฟื้น HP 45% (เก็บไว้ใช้)',cost:Math.round(12*s)},
 {id:'warp',n:'ม้วนวาร์ป',d:'ข้ามบอสได้ 1 ครั้ง',cost:Math.round(45*s)},
 {id:'atk',n:'ลับคมอาวุธ',d:`ATK +${(1.5+f*.1).toFixed(1)}`,cost:Math.round(28*s*inc('atk'))},
 {id:'def',n:'เสริมเกราะ',d:`DEF +${(1+f*.07).toFixed(1)}`,cost:Math.round(28*s*inc('def'))},
 {id:'mhp',n:'ยาอายุวัฒนะ',d:'HP สูงสุด +10%',cost:Math.round(32*s*inc('mhp'))},
 {id:'luk',n:'เครื่องรางนำโชค',d:'LUK +3',cost:Math.round(22*s*inc('luk'))}];
 if(h.rank<RANKS.length-1)L.push({id:'rank',n:`เลื่อนแรงค์ ${RANKS[h.rank].k}→${RANKS[h.rank+1].k}`,d:'พลังพื้นฐานทุกอย่างเพิ่มตามแรงค์',cost:Math.round((220+180*h.rank)*s*inc('rank'))});
 return L.map(x=>Object.assign(x,{dis:h.gold<x.cost||(x.id==='heal'&&h.hp>=h.mhp-.5&&h.mp>=h.mmp-.5)}));}
function buy(R,id){const it=shopList(R).find(x=>x.id===id);if(!it||it.dis)return false;const h=R.h,f=R.floor;h.gold-=it.cost;R.buys[id]=(R.buys[id]||0)+1;
 if(id==='heal'){h.hp=h.mhp;h.mp=h.mmp;R.buys.heal=0;}else if(id==='pot'){R.potions++;R.buys.pot=0;}else if(id==='warp'){R.warps++;R.buys.warp=0;}
 else if(id==='atk')h.atk+=1.5+f*.1;else if(id==='def')h.def+=1+f*.07;else if(id==='mhp'){h.mhp*=1.1;h.hp+=h.mhp*.1/1.1;}else if(id==='luk')h.luk+=3;
 else if(id==='rank'){const q=RANKS[h.rank+1].m/RANKS[h.rank].m;h.rank++;h.mhp*=q;h.hp*=q;h.atk*=q;h.def*=q;h.mmp*=q;}
 return true;}
// --- AI policy (also the default answer when a decision timer runs out) ---
function aiPick(R,ev){const h=R.h,hf=h.hp/h.mhp;
 if(ev.kind==='ev'){let best=0,bs=-1e9;EVENTS[ev.ti].c.forEach((ch,i)=>{if(chDis(R,ch))return;let s=rnd();if(ch.p)s-=ch.p*(hf<.5?3:.8);
  if(ch.g&&ch.g.hp>0&&hf<.6)s+=1.2;if(ch.g&&ch.g.hp<0&&hf<.5)s-=1;if(s>bs){bs=s;best=i;}});return best;}
 if(ev.kind==='mon'){const w=estimateWin(R,ev.en,24);if(w>=.75)return 0;if(ev.en.pet&&R.pets.length<2&&w>=.5&&rnd()<.5)return 2;return 1;}
 if(ev.kind==='pet')return 0;
 if(ev.kind==='comp'){if(R.comps.length>=2)return 2;if(h.gold>=compCost(R,ev.comp)+20)return 0;return hf>.6?1:2;}
 if(ev.kind==='boss'){const w=estimateWin(R,ev.en,60);if(w>=.6)return 0;const cw=(R.warps>0||h.gold>=warpCost(R))&&R.floor<100;
  if(w<.35&&cw&&R.retreats>=2)return 1;if(R.retreats<4)return 2;if(cw)return 1;return 0;}
 return 0;}
// auto mode boss policy: more cautious than engine.js, since losing a boss is the one real death besides fate
function aiBoss(R,ev){const w=estimateWin(R,ev.en,60),cw=(R.warps>0||R.h.gold>=warpCost(R))&&R.floor<100;if(w>=.9)return 0;if(R.retreats<4)return 2;if(cw)return 1;return 0;}
function aiPotion(R){if(R.h.hp/R.h.mhp<.45)drink(R);}
function aiShop(R){const h=R.h;if(h.hp<h.mhp*.8)buy(R,'heal');while(R.potions<3&&buy(R,'pot'));if(R.warps<1&&h.gold>warpCost(R)*2)buy(R,'warp');
 for(let g=0;g<20;g++){const L=shopList(R).filter(x=>['atk','def','mhp'].includes(x.id)&&!x.dis&&h.gold-x.cost>15).sort((a,b)=>a.cost-b.cost);if(!L.length)break;buy(R,L[0].id);}}

// ================= AUTO-FLOW LAYER =================
const mkOut=()=>({msgs:[],combat:null,after:'result',coins:0,enemy:null,cause:''});
const kk=(k)=>({t:k>0?'✦ กรรมดี':'✧ กรรมชั่ว',c:'kk'});
function fateFeel(d){return d>=6?'เส้นชะตาบนฝ่ามือยาวออกไปจนเห็นได้ชัด':d>=3?'รู้สึกได้ว่าเส้นชะตายืดออกไปอีกหน่อย':d>0?'เส้นชะตายืดออกนิดเดียว แทบมองไม่เห็น':d<0?'ได้ยินเสียงทรายในนาฬิกาชีวิตไหลเร็วขึ้น':'ไม่รู้สึกว่ามีอะไรเปลี่ยน';}
const OMEN_X=['กาดำตัวหนึ่งบินวนเหนือหัวสามรอบ แล้วเกาะนิ่งอยู่บนราวบันได จ้องหน้าคุณไม่วางตา','คบเพลิงทุกดวงในชั้นนี้ดับพร้อมกัน เหลือดวงเดียวที่ส่องลงมาตรงเงาของคุณพอดี','คืนนี้คุณฝันเห็นตัวเองนอนอยู่ในโลงหิน ตื่นมามือทั้งสองข้างยังเย็นเฉียบ','เสียงระฆังดังลงมาจากชั้นบน ทั้งที่หอคอยนี้ไม่มีระฆังสักใบ','เงาของคุณบนผนังขยับช้ากว่าตัวจริงไปจังหวะหนึ่ง'];
const LEGN=['ดาบเดียวไร้นาม','วาเลอร์ผู้ไม่เคยแพ้','แม่ทัพหญิงกาญจนา','ฮัลวาร์ดหมาป่าเหล็ก','เซอิ นักธนูตาเดียว','ราเชนทร์มือปราบมังกร'];
const RELN=['ดาบเลือดราชันย์','มงกุฎกระดูก','แหวนกลืนวิญญาณ','ผ้าคลุมเงาจันทร์ดับ'];
const omenCost=R=>Math.round(30*scl(R.floor));
const seerCost=R=>Math.round(20*scl(R.floor));
const relicCost=R=>Math.round(45*scl(R.floor));
const legCost=R=>Math.round(60*scl(R.floor)*MD(R,'cc',1));
// special "important encounter" types (forced roughly every 4..8 floors when nothing else was a key moment)
const SPECIAL={
 merc:{w:3,mk(R,K){const f=R.floor,T=pick(TRAITS),c={n:pick(LEGN),cls:pick(['war','mag','arc','pri']),pw:(4+f*.6)*1.7*MD(R,'cp',1)*(T.pw||1),legend:true,tr:T.id};K.data={c,duel:{...mkMon({hp:1.1,atk:1.05,def:1.1},f,1),id:'merc',n:c.n,cls:c.cls,boss:false}};
   K.tag=`ชั้น ${f} · ทหารรับจ้างในตำนาน`;K.title=`${c.n} · ${clsName(c.cls)}`;
   K.text=`นั่งลับอาวุธอยู่ข้างบันได ผ้าคลุมมีรอยไหม้เต็มไปหมด ${vpick(R,'merc:'+T.id+':'+R.floor,T.lines)} นิสัย: ${T.n} (${T.d})`;K.vis={t:'comp',cls:c.cls,gold:true};
   const cost=legCost(R),full=R.comps.length>=2,weak=full?[...R.comps].sort((a,b)=>a.pw-b.pw)[0]:null,w=Math.round(estimateWin(R,K.data.duel,40)*100);K.data.w=w/100;
   K.ch=[{t:'จ้างด้วยทอง',dis:R.h.gold<cost,P:[{t:`−${cost} ทอง`,c:'w'},{t:`พลัง ${Math.round(c.pw)}`,c:'g'},...(weak?[{t:`(ปลด${weak.n}ออกแทน)`,c:'w'}]:[]),...(R.h.gold<cost?[{t:'(ทองไม่พอ)',c:'b'}]:[])]},
    {t:'ท้าดวล ถ้าชนะเขาตามมาฟรี',P:[{t:`โอกาสชนะ ~${w}%`,c:w>=65?'g':w>=40?'w':'b'},{t:'+EXP',c:'g'},{t:'แพ้ = บาดเจ็บหนัก',c:'b'}]},
    {t:'ขอบคุณแล้วเดินผ่านไป',P:[{t:'เดินทางต่อ',c:''}]}];
   K.ai=R.h.gold>=cost+20?0:K.data.w>=.55?1:2;},
  res(R,K,i,out){const f=R.floor,c=K.data.c;R.map[f-1]='comp';
   const join=()=>{if(R.comps.length>=2){const weak=[...R.comps].sort((a,b)=>a.pw-b.pw)[0];R.comps.splice(R.comps.indexOf(weak),1);say(R,out,`${weak.n}ขอแยกทางไปเงียบๆ`,'info');}addComp(R,c,out);};
   if(i===0){R.h.gold-=legCost(R);join();}
   else if(i===1){say(R,out,`ดวลกับ${c.n}!`,'info');const en=K.data.duel;const res=fight(R,en,{});out.combat={en,ev:res.ev,win:res.win,startHp:R.h.hp,mhp:R.h.mhp};R.h.hp=res.hp;R.h.mp=res.mp;
    if(res.win){say(R,out,`${c.n}หัวเราะลั่น "ฝีมือใช้ได้ ข้าจะตามไปด้วย"`,'good');gainExp(R,(BAL.ex0+BAL.ex1*f)*1.5,out);join();R.h.hp=Math.max(R.h.hp,R.h.mhp*.3);}
    else{say(R,out,`${c.n}ฟันทีเดียวคุณก็ล้มลง เขาโยนยาให้หนึ่งขวดแล้วเดินจากไป`,'bad');R.h.hp=Math.max(R.h.hp,1);R.potions++;}}
   else{say(R,out,`${c.n}พยักหน้าเบาๆ แล้วกลับไปลับอาวุธต่อ`,'info');R.map[f-1]='calm';}}},
 mimic:{w:3,mk(R,K){const f=R.floor,s=scl(f),isM=rnd()<MD(R,'mimicP',.42),seen=rnd()<clamp(eLuk(R)*.025,.15,.75);
   const en=Object.assign(mkMon({id:'mimic',n:'มิมิก',hp:1.25,atk:1.15,def:1.2},f,1),{id:'mimic'});K.data={isM,en,w:estimateWin(R,en,40)};
   K.tag=`ชั้น ${f} · หีบปริศนา`;K.title='หีบสมบัติกลางทางเดิน';
   K.text='หีบไม้ขอบทองวางอยู่กลางทางเดินแบบไม่มีใครเฝ้า ฝุ่นรอบๆ สะอาดผิดปกติ '+(seen?(isM?'ดูดีๆ แล้วกล่องนี้แปลกๆ ฝาของมันขยับขึ้นลงช้าๆ เหมือนกำลังหายใจ':'คุณสังเกตอยู่นาน ก็เห็นแค่หีบเก่าที่บานพับขึ้นสนิม'):'ดูยังไงก็บอกไม่ได้ว่าเป็นหีบจริงหรือมิมิก');
   K.hint=seen;K.vis={t:'prop',pr:'chest'};const w=Math.round(K.data.w*100);
   K.ch=[{t:'เปิดเลย',P:[{t:`ถ้าของจริง +${Math.round(70*s)} ทอง +1 ยา`,c:'g'},{t:'ถ้าเป็นมิมิก โดนงับก่อนแล้วต้องสู้',c:'b'}]},
    {t:'เอาดาบเขี่ยดูก่อน',P:[{t:`ของจริง +${Math.round(55*s)} ทอง`,c:'g'},{t:`มิมิก = สู้แบบไม่โดนงับก่อน (~${w}%)`,c:'w'},{t:'ชนะได้ของดี',c:'g'}]},
    {t:'ปล่อยมันไว้อย่างนั้น',P:[{t:'ไม่เสี่ยง',c:''}]}];
   K.ai=seen&&isM?(K.data.w>=.65?1:2):(R.h.hp/R.h.mhp>.5?1:2);},
  res(R,K,i,out){const f=R.floor,s=scl(f),h=R.h,{isM,en}=K.data;
   if(i===2){R.map[f-1]='calm';say(R,out,isM?'เดินผ่านไปได้ไม่กี่ก้าว ก็ได้ยินเสียงฟันกระทบกันดังกึกๆ ไล่หลังมา':'คุณเดินผ่านหีบไป ไม่มีวันได้รู้ว่าข้างในมีอะไร','info');return;}
   if(!isM){const g=Math.round((i===0?70:55)*s*(cid(R)==='rog'?1.3:1)*MD(R,'loot',1)*MD(R,'gold',1));h.gold+=g;if(i===0)R.potions++;out.coins=g;R.map[f-1]='treasure';out.chest=true;
    say(R,out,`หีบของจริง! ได้ทอง ${g}${i===0?' กับยาอีกหนึ่งขวด':''}`,'good');return;}
   R.map[f-1]='fight';say(R,out,i===0?'ฝาหีบอ้าออก มีลิ้นยาวพุ่งออกมาพร้อมฟันซี่แหลม! มิมิกนี่เอง':'ปลายดาบแตะฝาหีบปุ๊บ มันก็แยกเขี้ยวใส่ทันที','bad');
   const win=doFight(R,en,out,{ambush:i===0,cause:`ถูกมิมิกงับ (ชั้น ${f})`});
   if(win){const g=Math.round(90*s*MD(R,'loot',1)*MD(R,'gold',1));h.gold+=g;h.atk+=2+f*.08;out.coins=(out.coins||0)+g;say(R,out,`ในท้องมิมิกมีทองอีก ${g} กับมีดสั้นเก่าเล่มหนึ่ง (ATK เพิ่ม)`,'good');}}},
 egg:{w:2,ok:R=>!R.egg,mk(R,K){const f=R.floor,s=scl(f);K.tag=`ชั้น ${f} · ไข่ประหลาด`;K.title='ไข่ที่อุ่นอยู่ตลอดเวลา';K.vis={t:'prop',pr:'egg'};
   K.text='ในซอกหินมีไข่ใบเท่าหัวคน เปลือกอุ่นเหมือนมีอะไรเต้นอยู่ข้างใน รอบๆ ไม่เห็นร่องรอยของแม่มันเลย';
   K.ch=[{t:'อุ้มไปฟักเอง',P:[{t:'อีกราว 5 ชั้นจะฟัก',c:'w'},{t:'ได้สัตว์เลี้ยง และ LUK เพิ่ม',c:'g'}]},
    {t:'ขายให้พ่อค้าเร่',P:[{t:`+${Math.round(40*s)} ทอง`,c:'g'},kk(-1)]},
    {t:'ต้มกินเป็นมื้อเย็น',P:[{t:'HP สูงสุด +15%',c:'g'},kk(-1)]}];K.ai=R.pets.length<2?0:1;},
  res(R,K,i,out){const f=R.floor,h=R.h;R.map[f-1]=i===0?'pet':'evil';
   if(i===0){R.egg={at:f+ri(4,6)};say(R,out,'คุณห่อไข่ด้วยผ้าคลุม มันอุ่นจนเหงื่อซึมหลัง','good');}
   else if(i===1){const g=Math.round(40*scl(f));h.gold+=g;R.karma-=1;out.coins=g;say(R,out,`พ่อค้าเร่ให้ทอง ${g} แล้วรีบเก็บไข่ใส่ลังเหมือนกลัวคุณเปลี่ยนใจ`,'info');}
   else{h.mhp*=1.15;h.hp=Math.min(h.mhp,h.hp+h.mhp*.15);R.karma-=2;say(R,out,'ไข่เจียวมื้อนั้นอร่อยจนน้ำตาไหล ร่างกายแข็งแรงขึ้นอย่างประหลาด','info');}}},
 relic:{w:2,mk(R,K){const f=R.floor,nm=vpick(R,'relic:'+(R.used['sp:relic']||0),RELN),cost=relicCost(R),ga=4+f*.25,gb=2+f*.12;K.data={nm,ga,gb};K.tag=`ชั้น ${f} · วัตถุต้องสาป`;K.title=nm;K.vis={t:'prop',pr:'altar'};
   K.text='วางอยู่บนแท่นหินกลางห้อง รอบแท่นมีโครงกระดูกนั่งพิงอยู่สามร่าง ทุกร่างยังกำอาวุธไว้แน่น แค่เข้าใกล้มือคุณก็สั่นแล้ว';
   K.ch=[{t:'สวมมันทันที',P:[{t:`ATK +${ga.toFixed(1)}`,c:'g'},{t:'อายุขัยสั้นลง (ไม่รู้ว่าเท่าไร)',c:'b'},kk(-1)]},
    {t:'จ้างนักบวชชำระคำสาปก่อน',dis:R.h.gold<cost,P:[{t:`−${cost} ทอง`,c:'w'},{t:`ATK +${gb.toFixed(1)}`,c:'g'},kk(1),...(R.h.gold<cost?[{t:'(ทองไม่พอ)',c:'b'}]:[])]},
    {t:'ฝังมันไว้กับเจ้าของเดิม',P:[kk(2)]}];K.ai=R.h.gold>=cost?1:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{nm,ga,gb}=K.data;
   if(i===0){h.atk+=ga;R.karma-=1;R.cursed++;shiftFate(R,-ri(2,5));
    R.map[f-1]='evil';say(R,out,`สวม${nm}แล้วพลังไหลเข้าแขนจนแสบร้อน ${fateFeel(-1)}`,'bad');}
   else if(i===1){h.gold-=relicCost(R);h.atk+=gb;R.karma+=1;R.map[f-1]='good';say(R,out,`นักบวชสวดอยู่ครึ่งคืน คำสาปหลุดออกไปเหลือแต่พลังบางส่วน`,'good');}
   else{R.karma+=2;R.map[f-1]='good';say(R,out,'คุณขุดหลุมฝังทั้งของและเจ้าของไว้ด้วยกัน ลมเย็นพัดผ่านเหมือนมีคนกระซิบขอบคุณ','good');}}},
 seer:{w:2,ok:R=>!R.reveal,mk(R,K){const f=R.floor,cost=seerCost(R);K.tag=`ชั้น ${f} · ผู้หยั่งรู้`;K.title='หมอดูตาบอด';K.vis={t:'prop',pr:'seer',fb:'npc'};
   K.text='หญิงชรานั่งอยู่หน้ากองไฟ ตาขาวขุ่นทั้งสองข้าง แต่หันมาทางคุณทันทีที่ก้าวขึ้นบันได "เส้นชะตาของเจ้าส่งเสียงดังเหลือเกิน"';
   K.ch=[{t:'จ่ายให้นางอ่านชะตา',dis:R.h.gold<cost,P:[{t:`−${cost} ทอง`,c:'w'},{t:'รู้ว่าชะตาจะขาดราวชั้นไหน (ดูได้ตลอดทางที่ช่องดวงชะตา)',c:'g'},...(R.h.gold<cost?[{t:'(ทองไม่พอ)',c:'b'}]:[])]},
    {t:'ขอพรให้แคล้วคลาด',P:[{t:'LUK +2',c:'g'},kk(1)]},{t:'ขอบคุณแล้วเดินผ่านไป',P:[{t:'เดินทางต่อ',c:''}]}];K.ai=1;},
  res(R,K,i,out){const f=R.floor;R.map[f-1]='calm';
   if(i===0){R.h.gold-=seerCost(R);R.reveal=true;const pj=project(f+1,hzM(R));if(pj.a>=100){say(R,out,'"เจ้าจะได้ยืนบนยอดหอ ถ้ายังเดินแบบนี้" นางยิ้มแล้วไม่พูดอะไรอีก','lv');}
    else say(R,out,`"ถ้ายังเดินแบบนี้ ชะตาของเจ้าจะขาดแถวชั้น ${pj.a} ถึง ${pj.b}" พูดจบนางก็ดับไฟแล้วหายไปในความมืด`,'lv');}
   else if(i===1){R.h.luk+=2;R.karma+=1;R.map[f-1]='good';say(R,out,'นางเอานิ้วแตะหน้าผากคุณ รู้สึกโล่งขึ้นมาทันที','good');}
   else say(R,out,'เสียงหัวเราะแหบๆ ไล่หลังคุณขึ้นบันไดไป','info');}},
 rpet:{w:2,mk(R,K){const f=R.floor,p=pick(PETK),P=PETS[p];K.data={p};K.tag=`ชั้น ${f} · สัตว์หายาก`;K.title=`${P.n}เผือก`;K.vis={t:'pet',p};
   K.text=`${P.n}ขนขาวทั้งตัว ตาสีทอง ยืนรอคุณอยู่ตรงบันได ชาวบ้านเชื่อกันว่าตัวเผือกจะเลือกเจ้านายเอง`;
   K.ch=[{t:R.pets.length<2?'รับมันเข้าปาร์ตี้':`รับมันแทน${PETS[R.pets[0]].n}`,P:[{t:P.d,c:'g'},{t:'LUK +3',c:'g'},{t:'HP สูงสุด +5%',c:'g'}]},
    {t:'ปล่อยให้มันกลับป่า',P:[kk(3)]}];K.ai=0;},
  res(R,K,i,out){const f=R.floor,p=K.data.p;R.map[f-1]=i?'good':'pet';
   if(i===0){if(R.pets.length>=2){say(R,out,`ปล่อย${PETS[R.pets[0]].n}กลับป่า`,'info');R.pets.shift();}addPet(R,p,out);R.h.luk+=3;R.h.mhp*=1.05;}
   else{R.karma+=3;say(R,out,`มันโค้งหัวให้คุณครั้งหนึ่ง แล้วหายเข้าไปในเงามืด`,'good');}}}};
// ---- more special key moments (rarity tier: c common / r rare / l legendary) ----
const CH=(t,P,dis)=>({t,P:P||[],dis:!!dis});
function duel(R,out,n,cls,k,o){const f=R.floor,en=Object.assign(mkMon({hp:k,atk:k,def:k},f,1),{id:'merc',n,cls});return doFight(R,en,out,o||{});}
Object.assign(SPECIAL,{
 gamble:{w:3,mk(R,K){const f=R.floor,bet=Math.max(10,Math.round(R.h.gold*.4)),wp=clamp(.42+eLuk(R)*.006,.42,.62);K.data={bet,wp};
   K.tag=`ชั้น ${f} · วงพนัน`;K.title='โครงกระดูกนักพนัน';K.vis={t:'prop',pr:'gambler',fb:'npc'};
   K.text='โครงกระดูกนั่งเขย่าถ้วยลูกเต๋าอยู่บนลังไม้ ข้างตัวมีถุงทองกับนาฬิกาทรายใบเล็กวางเรียงกัน "เล่นสักตาไหม จะลงทองหรือลงอายุก็ได้"';
   K.ch=[CH('ลงทองครึ่งกระเป๋า',[{t:`เดิมพัน ${bet} ทอง`,c:'w'},{t:`${Math.round(wp*100)}% ได้คืนสองเท่า`,c:'g'}],R.h.gold<10),
    CH('ลงอายุ',[{t:'ครึ่งต่อครึ่ง ชะตายาวขึ้นหรือสั้นลง',c:'w'},{t:'ไม่รู้ว่ากี่ชั้น',c:'b'}]),CH('ไม่เล่น',[{t:'เดินผ่านไป',c:''}])];
   K.ai=R.h.gold>=40&&wp>=.5?0:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{bet,wp}=K.data;R.map[f-1]='calm';
   if(i===0){if(rnd()<wp){h.gold+=bet;out.coins=bet;R.map[f-1]='treasure';say(R,out,`ลูกเต๋าออกหกสามลูก โครงกระดูกโยนทอง ${bet} มาให้แล้วหัวเราะกึกกัก`,'good');}
    else{h.gold=Math.max(0,h.gold-bet);R.map[f-1]='bad';say(R,out,`แพ้ เสียทอง ${bet} ไป มันเก็บเข้าถุงเร็วจนมองไม่ทัน`,'bad');}}
   else if(i===1){const up=rnd()<.5,d=shiftFate(R,up?ri(3,6):-ri(2,4));R.map[f-1]=up?'good':'bad';say(R,out,`ทรายในนาฬิกาพลิกกลับเอง ${fateFeel(d)}`,up?'good':'bad');}
   else say(R,out,'เสียงลูกเต๋ากลิ้งดังตามหลังมาอีกหลายชั้น','info');}},
 wounded:{w:3,mk(R,K){const f=R.floor,ga=2+f*.12;K.data={ga};K.tag=`ชั้น ${f} · คนเจ็บข้างทาง`;K.title='ทหารบาดเจ็บ';K.vis={t:'comp',cls:'war'};
   K.text='ชายในชุดเกราะบุบนั่งพิงกำแพง ผ้าพันแผลที่ท้องชุ่มเลือดจนดำ "ยา... มีสักขวดไหม"';
   K.ch=[CH('ให้ยาขวดหนึ่ง',[{t:'−1 ยา',c:'w'},{t:'LUK +2',c:'g'},kk(3)],R.potions<1),CH('เอาดาบของเขามาใช้',[{t:`ATK +${ga.toFixed(1)}`,c:'g'},kk(-3)]),CH('นั่งเป็นเพื่อนเขาสักพัก',[kk(1)])];
   K.ai=R.potions>=2?0:2;},
  res(R,K,i,out){const f=R.floor,h=R.h;
   if(i===0){R.potions--;h.luk+=2;R.karma+=3;R.map[f-1]='good';say(R,out,'เขาดื่มยาหมดขวด แล้วยื่นแผนที่ชั้นบนที่วาดเองให้ "ทางลัดอยู่หลังเสาต้นที่สาม"','good');}
   else if(i===1){h.atk+=K.data.ga;R.karma-=3;R.map[f-1]='evil';say(R,out,'คุณดึงดาบออกจากมือเขา เขาไม่มีแรงแม้แต่จะด่า','bad');}
   else{R.karma+=1;R.map[f-1]='calm';say(R,out,'เขาเล่าเรื่องลูกสาวที่บ้านจนหลับไป คุณห่มผ้าคลุมให้แล้วเดินต่อ','info');}}},
 door:{w:3,mk(R,K){const f=R.floor,p=riskAdj(R,.45);K.data={p};K.tag=`ชั้น ${f} · ประตูแปลกหน้า`;K.title='ประตูที่เมื่อวานยังไม่มี';K.vis={t:'prop',pr:'portal'};
   K.text='ผนังหินตรงหน้ามีประตูไม้บานเล็กโผล่ขึ้นมา ลมอุ่นพัดลอดช่องประตูออกมา กลิ่นเหมือนขนมปังเพิ่งออกจากเตา';
   K.ch=[CH('ผลักเข้าไปเลย',[{t:`${100-Math.round(p*100)}% HP เต็ม + EXP`,c:'g'},{t:`/ ${Math.round(p*100)}% รังมอนสเตอร์`,c:'b'}]),CH('เคาะก่อนสามที',[{t:'ปลอดภัยกว่า ได้ของน้อยกว่า',c:'w'}]),CH('เดินผ่านไป',[{t:'ไม่เสี่ยง',c:''}])];
   K.ai=R.h.hp/R.h.mhp>.6?0:1;},
  res(R,K,i,out){const f=R.floor,h=R.h;
   if(i===0){if(rnd()<K.data.p){R.map[f-1]='fight';say(R,out,'ข้างในไม่มีขนมปัง มีแต่ตาสีเหลืองนับสิบคู่','bad');const t=pick(monsOf(biome(f)));doFight(R,modMon(R,mkMon(t,f,1.3),MD(R,'mon',1)),out,{rw:2});}
    else{h.hp=h.mhp;h.mp=h.mmp;gainExp(R,12+2.5*f,out);R.map[f-1]='good';say(R,out,'ยายแก่คนหนึ่งเลี้ยงซุปร้อนๆ คุณกินจนอิ่มแล้วเผลอหลับไป ตื่นมาประตูหายไปแล้ว','good');}}
   else if(i===1){R.potions++;R.map[f-1]='calm';say(R,out,'มีมือยื่นขวดยาออกมาจากช่องประตูหนึ่งขวด แล้วประตูก็ปิดใส่หน้า','good');}
   else{R.map[f-1]='calm';say(R,out,'พอหันกลับไปดูอีกที ผนังก็กลับเป็นหินเรียบๆ เหมือนเดิม','info');}}},
 fountain:{w:2,mk(R,K){const f=R.floor,cost=Math.round(15*scl(f));K.data={cost};K.tag=`ชั้น ${f} · น้ำพุโบราณ`;K.title='น้ำพุหินอ่อน';K.vis={t:'prop',pr:'well'};
   K.text='กลางห้องมีน้ำพุเก่าแก่ น้ำใสจนเห็นเหรียญนับพันที่ก้นสระ ขอบสระสลักไว้ว่า "ดื่มหนึ่งอึก แลกหนึ่งปี"';
   K.ch=[CH('ดื่มหนึ่งอึก',[{t:'HP เต็ม',c:'g'},{t:'ชะตาเปลี่ยน ไม่รู้ว่าทางไหน',c:'w'}]),CH('โยนเหรียญอธิษฐาน',[{t:`−${cost} ทอง`,c:'w'},{t:'LUK +4',c:'g'}],R.h.gold<cost),CH('กรอกใส่ขวดไปสองขวด',[{t:'+2 ยา',c:'g'}])];K.ai=2;},
  res(R,K,i,out){const f=R.floor,h=R.h;R.map[f-1]='good';
   if(i===0){h.hp=h.mhp;const d=shiftFate(R,ri(-3,7));say(R,out,`น้ำเย็นจนฟันชา ${fateFeel(d)}`,d<0?'bad':'good');}
   else if(i===1){h.gold-=K.data.cost;h.luk+=4;say(R,out,'เหรียญจมลงไปโดยไม่มีเสียงกระทบพื้นเลยสักนิด','good');}
   else{R.potions+=2;say(R,out,'น้ำในขวดยังเรืองแสงจางๆ อยู่อีกหลายชั้น','good');}}},
 starfall:{w:1,mk(R,K){const f=R.floor,a=4+f*.2,d=2+f*.1,g=Math.round(150*scl(f));K.data={a,d,g};K.tag=`ชั้น ${f} · ดาวตก`;K.title='ดาวที่ตกลงมาในหอคอย';K.vis={t:'prop',pr:'star'};
   K.text='เพดานชั้นนี้เปิดโล่งเห็นฟ้า ดาวดวงหนึ่งตกลงมาห่างไปไม่กี่ก้าว พื้นหินรอบๆ ยังแดงร้อน ตำนานเล่าว่าคนแรกที่แตะดาวตกจะได้หนึ่งคำขอ';
   K.ch=[CH('ขอพลัง',[{t:`ATK +${a.toFixed(1)} · DEF +${d.toFixed(1)}`,c:'g'}]),CH('ขอชีวิต',[{t:'ชะตายืดออกไปมาก',c:'g'}]),CH('ขอทอง',[{t:`+${g} ทอง`,c:'g'}])];K.ai=1;},
  res(R,K,i,out){const f=R.floor,h=R.h,{a,d,g}=K.data;R.map[f-1]='treasure';
   if(i===0){h.atk+=a;h.def+=d;say(R,out,'แสงดาวไหลเข้าไปในแขนทั้งสองข้าง ดาบในมือเบาเหมือนกิ่งไม้','lv');}
   else if(i===1){const dd=shiftFate(R,ri(5,9));say(R,out,`ดาวดับลงช้าๆ ในฝ่ามือ ${fateFeel(dd)}`,'lv');}
   else{h.gold+=g;out.coins=g;say(R,out,`ดาวแตกออกเป็นก้อนทองเล็กๆ ${g} ก้อน`,'lv');}}},
 dragon:{w:1,mk(R,K){const f=R.floor,s=scl(f),sp=clamp(.35+eLuk(R)*.012,.35,.8),en=Object.assign(mkMon({hp:2.2,atk:1.5,def:1.4},f,1),{id:'sala',n:'มังกรเกล็ดเขียว'}),w=estimateWin(R,en,40);
   K.data={sp,en,g:Math.round(180*s)};K.tag=`ชั้น ${f} · รังมังกร`;K.title='มังกรหลับ';K.vis={t:'en',en};
   K.text='มังกรเกล็ดเขียวขดตัวหลับอยู่บนกองทอง ลมหายใจร้อนจนปลายผมคุณหยิก ทองกองที่ใกล้ที่สุดอยู่ห่างแค่สามก้าว';
   K.ch=[CH('ย่องไปหยิบทอง',[{t:`${Math.round(sp*100)}% ได้ ${K.data.g} ทอง`,c:'g'},{t:'พลาด = มันตื่น',c:'b'}]),CH('ปลุกมันขึ้นมาสู้',[{t:`โอกาสชนะ ~${Math.round(w*100)}%`,c:w>=.6?'g':'b'},{t:'ชนะได้ทองทั้งกอง',c:'g'}]),CH('ก้มหัวให้แล้วเดินผ่าน',[{t:'DEF +',c:'g'},kk(2)])];
   K.ai=w>=.75?1:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{sp,en,g}=K.data;
   if(i===2){R.karma+=2;h.def+=2+f*.05;R.map[f-1]='good';say(R,out,'มังกรลืมตาข้างหนึ่ง สะบัดเกล็ดหลุดมาให้แผ่นหนึ่ง แล้วหลับต่อ (DEF เพิ่ม)','good');return;}
   if(i===0&&rnd()<sp){h.gold+=g;out.coins=g;R.map[f-1]='treasure';say(R,out,`คุณกวาดทองได้ ${g} แล้วย่องออกมาโดยที่มันไม่ขยับเลย`,'good');return;}
   R.map[f-1]='fight';say(R,out,i===0?'เหรียญหล่นกระทบพื้นดังกริ๊ง มังกรลืมตาขึ้นทันที':'คุณตะโกนปลุกมันจนเสียงก้องไปทั้งชั้น','bad');
   if(doFight(R,en,out,{ambush:i===0,cause:`ถูกมังกรเผาที่ชั้น ${f}`})){const g2=Math.round(g*1.5);h.gold+=g2;h.atk+=3+f*.1;out.coins=g2;say(R,out,'ทองบนรังทั้งหมดเป็นของคุณ เกล็ดมังกรยังเอามาพันด้ามดาบได้อีก','lv');}}}});
const TIER={merc:'l',mimic:'c',egg:'c',relic:'r',seer:'r',rpet:'r',gamble:'c',wounded:'c',door:'c',fountain:'r',starfall:'l',dragon:'l'};
const tierW=(R,r)=>r==='l'?1*MD(R,'leg',1):r==='r'?2.5:6;
// ---- event chains: multi-part story arcs spanning floors; each stage is a key moment ----
const ARCS={
 child:{n:'เด็กหลงทาง',st:[
  {mk(R,K,A){const f=R.floor,c=Math.round(15*scl(f));A.v.c=c;K.title='เด็กหลงทาง';K.vis={t:'prop',pr:'child',fb:'npc'};
    K.text='เด็กผู้หญิงตัวเล็กนั่งกอดเข่าร้องไห้อยู่ใต้บันได มือกำตุ๊กตาฟางไว้แน่น บอกว่าตามพ่อขึ้นมาเก็บเห็ดแล้วพลัดกัน';
    K.ch=[CH('พาเธอลงไปส่งข้างล่าง',[{t:'HP −20%',c:'b'},kk(3)]),CH('ให้ขนมปังกับทองแล้วชี้ทางลง',[{t:`−${c} ทอง`,c:'w'},kk(1)],R.h.gold<c),CH('ทำเป็นไม่เห็น',[kk(-1)])];
    K.ai=R.h.hp/R.h.mhp>.6?0:R.h.gold>=c?1:2;},
   res(R,K,i,out,A){const f=R.floor,h=R.h;A.v.help=[2,1,0][i];
    if(i===0){h.hp-=h.mhp*.2;R.karma+=3;R.map[f-1]='good';say(R,out,'คุณอุ้มเธอลงไปหลายชั้นจนเจอพ่อ เขากอดลูกแน่นจนตุ๊กตาฟางแบน','good');}
    else if(i===1){h.gold-=A.v.c;R.karma+=1;R.map[f-1]='good';say(R,out,'เธอกัดขนมปังคำโต แล้วโบกมือลาก่อนวิ่งลงบันไดไป','good');}
    else{R.karma-=1;R.map[f-1]='evil';say(R,out,'เสียงร้องไห้เบาลงเรื่อยๆ ตามหลังคุณ จนเงียบไป','bad');}}},
  {r:'r',mk(R,K,A){const help=A.v.help;K.title='เด็กคนนั้นกลับมา';K.vis=help===0?{t:'prop',pr:'grave'}:{t:'comp',cls:'pri'};
    if(help===2){K.text='หญิงสาวในชุดนักบวชยืนรออยู่หัวบันได ที่เอวห้อยตุ๊กตาฟางตัวเดิม "จำหนูได้ไหมคะ หนูขึ้นมาตอบแทน"';
     K.ch=[CH('ชวนเธอเข้าทีม',[{t:'นักบวชภักดี พลังสูง',c:'g'},...(R.comps.length>=2?[{t:'(ปลดคนที่อ่อนสุดออก)',c:'w'}]:[])]),CH('ขอให้เธอสวดต่อชะตา',[{t:'ชะตายืดออก',c:'g'}]),CH('บอกให้เธอกลับบ้านไปหาพ่อ',[{t:'+2 ยา',c:'g'},kk(2)])];K.ai=1;}
    else if(help===1){K.text='ชายวัยกลางคนยื่นถุงผ้าให้ "ลูกสาวข้าเล่าว่าท่านให้ขนมปังกับบอกทาง ข้าเก็บเงินไว้คืนตั้งนาน"';
     K.ch=[CH('รับถุงทองไว้',[{t:`+${A.v.c*3} ทอง`,c:'g'}]),CH('รับแค่คำขอบคุณ',[{t:'LUK +2',c:'g'},kk(2)])];K.ai=0;}
    else{K.text='ร่างโปร่งแสงของเด็กผู้หญิงกอดตุ๊กตาฟางยืนขวางบันไดอยู่ "ทำไมวันนั้นพี่ไม่ช่วยหนู"';
     K.ch=[CH('ขอโทษแล้วจุดธูปให้',[{t:`−${A.v.c*2} ทอง`,c:'w'},kk(3)],R.h.gold<A.v.c*2),CH('ชักดาบไล่',[{t:'ต้องสู้กับวิญญาณ',c:'b'},kk(-1)]),CH('วิ่งหนีขึ้นบันได',[{t:'อายุอาจสั้นลง',c:'b'}])];K.ai=R.h.gold>=A.v.c*2?0:1;}},
   res(R,K,i,out,A){const f=R.floor,h=R.h,help=A.v.help;
    if(help===2){R.map[f-1]='good';
     if(i===0){if(R.comps.length>=2){const wk=[...R.comps].sort((a,b)=>a.pw-b.pw)[0];R.comps.splice(R.comps.indexOf(wk),1);say(R,out,`${wk.n}ขอแยกทางไปเงียบๆ`,'info');}addComp(R,{n:'ฟาง',cls:'pri',pw:(4+f*.6)*1.5,tr:'loyal'},out);}
     else if(i===1){const d=shiftFate(R,ri(4,7));say(R,out,`เธอสวดเสียงเบาจนคุณแทบไม่ได้ยิน ${fateFeel(d)}`,'lv');}
     else{R.potions+=2;R.karma+=2;say(R,out,'เธอยัดยาใส่มือคุณสองขวด แล้วเดินลงบันไดไปพร้อมตุ๊กตาฟาง','good');}}
    else if(help===1){R.map[f-1]='good';if(i===0){const g=A.v.c*3;h.gold+=g;out.coins=g;say(R,out,`ในถุงมีทอง ${g} เหรียญ บางเหรียญยังเปื้อนดินอยู่`,'good');}else{h.luk+=2;R.karma+=2;say(R,out,'เขาจับมือคุณเขย่าอยู่นาน คุณรู้สึกว่าโชคดีขึ้นอย่างบอกไม่ถูก','good');}}
    else{if(i===0){h.gold-=A.v.c*2;R.karma+=3;R.map[f-1]='good';say(R,out,'ควันธูปพันรอบร่างโปร่งแสง เธอยิ้มแล้วจางหายไป','good');}
     else if(i===1){R.karma-=1;R.map[f-1]='fight';const t=MONS.find(m=>m.id==='wraith')||pick(MONS);doFight(R,mkMon(t,f,1.1),out);}
     else{const d=shiftFate(R,-ri(1,3));R.map[f-1]='bad';say(R,out,`เสียงร้องไห้ไล่ตามคุณขึ้นมาอีกสามชั้น ${fateFeel(d)}`,'bad');}}}}]},
 rival:{n:'คู่แข่ง',st:[
  {mk(R,K,A){const f=R.floor;A.v.n=A.v.n||genName();A.v.cls=A.v.cls||pick(['war','mag','arc']);const n=A.v.n;K.title=`${n} คู่แข่งจากหมู่บ้านข้างๆ`;K.vis={t:'comp',cls:A.v.cls};
    const w=Math.round(estimateWin(R,Object.assign(mkMon({hp:1,atk:1,def:1},f,1),{n}),30)*100);
    K.text=`${n} นักผจญภัยรุ่นเดียวกับคุณยืนกอดอกรออยู่ "ได้ยินชื่อเจ้ามานานแล้ว มาดูกันว่าใครจะขึ้นไปได้สูงกว่า"`;
    K.ch=[CH('ดวลกันตรงนี้เลย',[{t:`โอกาสชนะ ~${w}%`,c:w>=60?'g':'w'},{t:'+EXP +ทอง',c:'g'}]),CH('จับมือแล้วแลกแผนที่กัน',[{t:'LUK +2',c:'g'}]),CH('แอบตัดเชือกปีนของเขา',[{t:`+${Math.round(30*scl(f))} ทอง`,c:'g'},kk(-3)])];K.ai=w>=70?0:1;},
   res(R,K,i,out,A){const f=R.floor,n=A.v.n;
    if(i===0){R.map[f-1]='fight';say(R,out,`ดวลกับ${n}!`,'info');const win=duel(R,out,n,A.v.cls,1,{});A.v.rel=win?'beaten':'beat';if(!win){R.h.hp=Math.max(R.h.hp,R.h.mhp*.15);say(R,out,`${n}เก็บดาบเข้าฝัก "อ่อนกว่าที่คิดนะ"`,'bad');}}
    else if(i===1){R.h.luk+=2;A.v.rel='friend';R.map[f-1]='good';say(R,out,`${n}วาดทางลับให้สองสามทาง แล้วแยกกันไปคนละทาง`,'good');}
    else{R.h.gold+=Math.round(30*scl(f));R.karma-=3;A.v.rel='wronged';R.map[f-1]='evil';say(R,out,'ได้ยินเสียงร้องกับเสียงของหนักตกกระแทกดังมาจากด้านหลัง คุณไม่หันไปดู','bad');}}},
  {r:'r',mk(R,K,A){const f=R.floor,n=A.v.n,rel=A.v.rel,c=Math.round(40*scl(f));A.v.c=c;K.title=`${n} อีกครั้ง`;K.vis={t:'comp',cls:A.v.cls};
    if(rel==='friend'){K.text=`พื้นใต้เท้าคุณถล่ม ${n} คว้าแขนดึงขึ้นมาได้ทัน "บอกแล้วว่าเราจะได้เจอกันอีก"`;
     K.ch=[CH('ชวนมาร่วมทีม',[{t:'ได้เพื่อนร่วมทางฝีมือดี',c:'g'}],R.comps.length>=2),CH('แลกเสบียงกัน',[{t:'+2 ยา',c:'g'},{t:'HP +30%',c:'g'}])];K.ai=R.comps.length<2?0:1;}
    else if(rel==='beaten'){K.text=`${n} กลับมาพร้อมแผลเป็นใหม่บนแก้ม "ข้าฝึกมาทั้งเดือน คราวนี้ไม่แพ้แล้ว"`;
     K.ch=[CH('รับคำท้า',[{t:'คู่ต่อสู้แข็งขึ้น',c:'b'},{t:'ชนะ = ATK เพิ่ม',c:'g'}]),CH('ยอมแพ้ให้เขาไปเลย',[{t:'−20% ทอง',c:'w'},kk(1)])];K.ai=R.h.hp/R.h.mhp>.6?0:1;}
    else if(rel==='beat'){K.text=`${n} หัวเราะลั่นเมื่อเห็นคุณ "ยังไม่ตายอีกเหรอ" แล้วโยนขวดยามาให้`;
     K.ch=[CH('ขอดวลแก้มือ',[{t:'ชนะ = ATK เพิ่ม',c:'g'}]),CH('ขอให้สอนวิชาให้',[{t:`−${c} ทอง`,c:'w'},{t:'ATK +',c:'g'}],R.h.gold<c)];K.ai=R.h.gold>=c?1:0;}
    else{K.text=`${n} เดินขากะเผลกเข้ามา จ้องคุณตาแดงก่ำ "เชือกเส้นนั้น ข้าจำรอยมีดได้"`;
     K.ch=[CH('สู้',[{t:'เขาจะลอบตีก่อน',c:'b'}]),CH('ชดใช้เป็นทอง',[{t:'−40% ทอง',c:'w'},kk(2)]),CH('วิ่งหนี',[{t:'HP −15%',c:'b'}])];K.ai=1;}},
   res(R,K,i,out,A){const f=R.floor,h=R.h,n=A.v.n,rel=A.v.rel;R.map[f-1]='comp';
    if(rel==='friend'){if(i===0)addComp(R,{n,cls:A.v.cls,pw:(4+f*.6)*1.3,tr:'loyal'},out);else{R.potions+=2;h.hp=Math.min(h.mhp,h.hp+h.mhp*.3);say(R,out,`${n}แบ่งเสบียงให้ครึ่งหนึ่ง นั่งกินข้าวด้วยกันก่อนแยกทาง`,'good');}}
    else if(rel==='beaten'){if(i===0){R.map[f-1]='fight';if(duel(R,out,n,A.v.cls,1.2,{})){h.atk+=2+f*.08;A.v.rel='respect';say(R,out,`${n}ทรุดลงนั่งแล้วหัวเราะ "ยอมแล้ว เจ้าเก่งจริง"`,'good');}else A.v.rel='beat';}
     else{h.gold=Math.round(h.gold*.8);R.karma+=1;A.v.rel='friend';say(R,out,`${n}งงไปพักหนึ่ง ก่อนจะยิ้มออกมาได้`,'good');}}
    else if(rel==='beat'){R.potions++;if(i===0){R.map[f-1]='fight';if(duel(R,out,n,A.v.cls,1.1,{})){h.atk+=2+f*.1;A.v.rel='respect';say(R,out,`คราวนี้${n}เป็นฝ่ายล้ม เขาพยักหน้าให้คุณเป็นครั้งแรก`,'good');}}
     else{h.gold-=A.v.c;h.atk+=2.5+f*.1;A.v.rel='friend';say(R,out,`${n}สอนท่าฟันให้สามท่า ท่าสุดท้ายเขาห้ามเอาไปใช้กับเขา`,'good');}}
    else{if(i===0){R.map[f-1]='fight';duel(R,out,n,A.v.cls,1.3,{ambush:true});}
     else if(i===1){h.gold=Math.round(h.gold*.6);R.karma+=2;A.v.rel='friend';say(R,out,`${n}รับทองไปเงียบๆ ก่อนไปพูดว่า "แค่นี้ก็พอแล้ว"`,'good');}
     else{h.hp-=h.mhp*.15;R.map[f-1]='flee';say(R,out,'มีดบินเฉียดหลังไปนิดเดียว คุณวิ่งขึ้นบันไดไม่คิดชีวิต','bad');}}}},
  {r:'l',mk(R,K,A){const n=A.v.n,ally=A.v.rel==='friend'||A.v.rel==='respect';K.title=`ศึกสุดท้ายของ${n}`;K.vis={t:'comp',cls:A.v.cls};A.v.ally=ally;
    if(ally){K.text=`${n} นอนหายใจรวยรินอยู่ข้างบันได พิษจากบอสลามไปทั้งแขน "ข้าไปต่อไม่ไหวแล้ว เอาชะตาที่เหลือของข้าไปใช้เถอะ"`;
     K.ch=[CH('รับชะตาของเพื่อน',[{t:'ชะตายืดออกมาก',c:'g'}]),CH('แบกเขาลงไปหาหมอ',[{t:'HP −30%',c:'b'},kk(4)]),CH('นั่งอยู่ด้วยจนวาระสุดท้าย',[{t:'LUK +3',c:'g'},kk(2)])];K.ai=0;}
    else{K.text=`${n} ยืนรออยู่บนสะพานหินแคบๆ ข้างล่างเป็นเหวมืด "ชั้นนี้มีที่ยืนแค่คนเดียว"`;
     K.ch=[CH('ดวลจนกว่าจะจบ',[{t:'คู่ต่อสู้แข็งมาก',c:'b'},{t:'ชนะได้ทองก้อนโต',c:'g'}]),CH('ยื่นมือให้เขา',[{t:'อาจจบดี หรือโดนผลักตก',c:'w'},kk(3)])];K.ai=1;}},
   res(R,K,i,out,A){const f=R.floor,h=R.h,n=A.v.n;const ix=R.comps.findIndex(c=>c.n===n);if(ix>=0)R.comps.splice(ix,1);
    if(A.v.ally){if(i===0){R.map[f-1]='good';const d=shiftFate(R,ri(6,10));say(R,out,`${n}หลับตาลงพร้อมรอยยิ้ม ${fateFeel(d)}`,'lv');}
     else if(i===1){h.hp-=h.mhp*.3;R.karma+=4;R.map[f-1]='good';say(R,out,`คุณแบก${n}ลงไปหกชั้นจนเจอหมอ เขารอด แต่คงไม่ได้ปีนหออีกแล้ว`,'good');}
     else{h.luk+=3;R.karma+=2;R.map[f-1]='calm';say(R,out,`${n}เล่าเรื่องหมู่บ้านจนหลับไป คุณฝังเขาไว้ใต้บันไดพร้อมดาบของเขา`,'info');}}
    else{if(i===0){R.map[f-1]='fight';if(duel(R,out,n,A.v.cls,1.35,{})){const g=Math.round(120*scl(f));h.gold+=g;h.atk+=3+f*.1;out.coins=g;say(R,out,`${n}ร่วงลงเหวไปพร้อมเสียงหัวเราะ ทิ้งถุงทอง ${g} กับดาบไว้บนสะพาน`,'lv');}}
     else{R.karma+=3;if(rnd()<.55){R.map[f-1]='good';const d=shiftFate(R,ri(2,4));say(R,out,`${n}จ้องมือคุณอยู่นาน แล้วจับมันไว้ "ข้าเหนื่อยแล้ว" ${fateFeel(d)}`,'good');}
      else{h.hp-=h.mhp*.3;R.map[f-1]='trap';out.cause=`ถูก${n}ผลักตกเหว (ชั้น ${f})`;say(R,out,`${n}กระชากคุณเข้าไปแล้วผลักลงเหว คุณเกาะขอบหินไว้ได้แบบเฉียดฉิว`,'bad');}}}}}]},
 blade:{n:'ดาบกระซิบ',st:[
  {mk(R,K,A){const f=R.floor,a=3+f*.15;A.v.a0=a;K.title='ดาบที่เรียกชื่อคุณ';K.vis={t:'prop',pr:'altar'};
    K.text='ดาบสีดำปักอยู่ในหินกลางห้อง คุณไม่เคยบอกชื่อใครในหอนี้ แต่มันกระซิบเรียกชื่อคุณได้ถูก';
    K.ch=[CH('ดึงมันออกมา',[{t:`ATK +${a.toFixed(1)}`,c:'g'},kk(-1)]),CH('ปล่อยมันไว้ที่เดิม',[kk(1)])];K.ai=0;},
   res(R,K,i,out,A){const f=R.floor;A.v.take=i===0;A.v.atk=0;
    if(i===0){R.h.atk+=A.v.a0;A.v.atk=A.v.a0;R.karma-=1;R.map[f-1]='evil';say(R,out,'ดาบหลุดออกจากหินง่ายเกินไป ด้ามของมันอุ่นเหมือนมือคน','bad');}
    else{R.karma+=1;R.map[f-1]='calm';A.v.short=1;say(R,out,'คุณเดินจากมา เสียงกระซิบไล่หลังอยู่นาน','info');}}},
  {r:'r',mk(R,K,A){const f=R.floor;
    if(A.v.take){const a=4+f*.15,a2=6+f*.2,c=Math.round(30*scl(f));A.v.a1=a;A.v.a2=a2;A.v.c=c;K.title='ดาบหิว';K.vis={t:'prop',pr:'altar'};
     K.text='คืนนี้ดาบสั่นไม่หยุด เสียงกระซิบดังขึ้นทุกชั้น "เลือด ขอเลือดหน่อย"';
     K.ch=[CH('กรีดเลือดให้มันกิน',[{t:'HP สูงสุด −10%',c:'b'},{t:`ATK +${a.toFixed(1)}`,c:'g'}]),CH('ให้มันกินสัตว์เลี้ยง',[{t:`ATK +${a2.toFixed(1)}`,c:'g'},{t:'เสียสัตว์เลี้ยง 1 ตัว',c:'b'},kk(-4)],!R.pets.length),
      CH('ห่อมันด้วยผ้ายันต์',[{t:`−${c} ทอง`,c:'w'},kk(1)],R.h.gold<c)];K.ai=R.h.gold>=c?2:0;}
    else{const en=Object.assign(mkMon({hp:1.25,atk:1.2,def:1.1},f,1),{id:'merc',n:'นักดาบถูกสิง',cls:'war'});A.v.en=en;K.title='นักดาบถูกสิง';K.vis={t:'en',en};
     const w=estimateWin(R,en,30);K.text='ชายคนหนึ่งถือดาบสีดำเล่มที่คุณเคยเห็นปักอยู่ในหิน ตาของเขาขาวไปทั้งลูก ปากขยับตามเสียงกระซิบที่ไม่ใช่เสียงของเขา';
     K.ch=[CH('สู้เพื่อปลดปล่อยเขา',[{t:`โอกาสชนะ ~${Math.round(w*100)}%`,c:'w'},kk(2)]),CH('หลบไปอีกทาง',[{t:'HP −10%',c:'b'}])];K.ai=w>=.6?0:1;}},
   res(R,K,i,out,A){const f=R.floor,h=R.h;
    if(A.v.take){if(i===0){h.mhp*=.9;h.hp=Math.min(h.hp,h.mhp);h.atk+=A.v.a1;A.v.atk+=A.v.a1;R.map[f-1]='bad';say(R,out,'ดาบดูดเลือดจนมือคุณซีด คมของมันวาวขึ้นอีก','bad');}
     else if(i===1){const p=R.pets.pop();h.atk+=A.v.a2;A.v.atk+=A.v.a2;R.karma-=4;R.map[f-1]='evil';say(R,out,`${PETS[p].n}ไม่ทันได้ร้องสักแอะ ดาบสั่นด้วยความพอใจ`,'bad');}
     else{h.gold-=A.v.c;R.karma+=1;A.v.seal=1;R.map[f-1]='good';say(R,out,'ผ้ายันต์ไหม้เป็นรอยดำ แต่เสียงกระซิบก็เงียบลง','good');}}
    else{A.done=1;if(i===0){R.map[f-1]='fight';if(doFight(R,A.v.en,out)){R.karma+=2;say(R,out,'ดาบดำแตกเป็นสองท่อน ชายคนนั้นร้องไห้ขอบคุณ','good');}}else{h.hp-=h.mhp*.1;R.map[f-1]='flee';say(R,out,'คุณอ้อมไปอีกทาง ดาบฟันเฉียดไหล่ไปนิดเดียว','bad');}}}},
  {r:'l',mk(R,K,A){const f=R.floor,a=8+f*.3;A.v.a3=a;K.title='ดาบตื่น';K.vis={t:'prop',pr:'portal'};
    K.text=`ดาบลอยขึ้นเองกลางอากาศ เสียงกระซิบกลายเป็นเสียงหัวเราะ "ถึงเวลาแล้ว เจ้าจะเป็นข้า หรือข้าจะเป็นเจ้า"${A.v.seal?' ผ้ายันต์ที่ห่อไว้ไหม้จนหมด':''}`;
    K.ch=[CH('หักดาบทิ้ง',[{t:`ATK −${A.v.atk.toFixed(1)}`,c:'b'},{t:'ชะตายืดออก',c:'g'},kk(3)]),CH('ยอมรวมร่างกับดาบ',[{t:`ATK +${a.toFixed(1)}`,c:'g'},{t:'อายุขัยสั้นลง',c:'b'},kk(-3)]),CH('โยนมันลงเหว',[{t:`ATK −${(A.v.atk/2).toFixed(1)}`,c:'b'},kk(1)])];K.ai=0;},
   res(R,K,i,out,A){const f=R.floor,h=R.h;
    if(i===0){h.atk=Math.max(1,h.atk-A.v.atk);R.karma+=3;R.map[f-1]='good';const d=shiftFate(R,ri(4,7));say(R,out,`ดาบแตกพร้อมเสียงกรีดร้อง แขนคุณเบาลงทันที ${fateFeel(d)}`,'lv');}
    else if(i===1){h.atk+=A.v.a3;R.karma-=3;R.cursed++;R.map[f-1]='evil';const d=shiftFate(R,-ri(4,8));say(R,out,`ดาบละลายเข้าไปในแขน เส้นเลือดกลายเป็นสีดำ ${fateFeel(d)}`,'bad');}
    else{h.atk=Math.max(1,h.atk-A.v.atk/2);R.karma+=1;R.map[f-1]='calm';say(R,out,'ดาบหายลงไปในความมืด เสียงกระซิบค่อยๆ เบาลงจนเงียบ','info');}}}]},
 mask:{n:'พ่อค้าหน้ากาก',st:[
  {mk(R,K,A){const f=R.floor,s=scl(f),d=3+f*.15;A.v.d=d;A.v.debt=Math.round(80*s);A.v.g=Math.round(120*s);K.title='พ่อค้าหน้ากากยิ้ม';K.vis={t:'prop',pr:'masked',fb:'npc'};
    K.text='ชายสวมหน้ากากยิ้มกว้างตั้งแผงขายของกลางทางเดิน ไม่มีป้ายราคาสักชิ้น "ของดีทั้งนั้น ไม่มีเงินก็จ่ายทีหลังได้"';
    K.ch=[CH('ซื้อเกราะเงินเชื่อ',[{t:`DEF +${d.toFixed(1)}`,c:'g'},{t:'เขาจะกลับมาทวง',c:'b'}]),CH('ขายอายุให้เขาหนึ่งปี',[{t:`+${A.v.g} ทอง`,c:'g'},{t:'อายุขัยสั้นลง',c:'b'}]),CH('ไม่ซื้ออะไร',[{t:'เดินผ่านไป',c:''}])];K.ai=0;},
   res(R,K,i,out,A){const f=R.floor,h=R.h;A.v.deal=['debt','sold','none'][i];R.map[f-1]='calm';
    if(i===0){h.def+=A.v.d;say(R,out,'เกราะเงินพอดีตัวเหมือนวัดมาก่อน หน้ากากยิ้มกว้างขึ้นอีกนิด','good');}
    else if(i===1){h.gold+=A.v.g;out.coins=A.v.g;R.map[f-1]='bad';const d=shiftFate(R,-ri(2,4));say(R,out,`เขาจับข้อมือคุณแล้วนับเบาๆ จนถึงสิบสอง ${fateFeel(d)}`,'bad');}
    else say(R,out,'"ไว้เจอกันใหม่นะ" เสียงเขาดังตามมาทั้งที่แผงหายไปแล้ว','info');}},
  {r:'r',mk(R,K,A){const f=R.floor,s=scl(f),deal=A.v.deal;K.title='พ่อค้าหน้ากากกลับมา';K.vis={t:'prop',pr:'masked',fb:'npc'};
    if(deal==='debt'){const pay=Math.round(A.v.debt*1.5);A.v.pay=pay;K.text='"ถึงเวลาจ่ายแล้วนะ" หน้ากากยิ้มกว้างกว่าครั้งก่อน ดอกเบี้ยขึ้นไปอีกครึ่งหนึ่ง';
     K.ch=[CH('จ่ายเต็มจำนวน',[{t:`−${pay} ทอง`,c:'w'}],R.h.gold<pay),CH('คืนเกราะให้เขา',[{t:`DEF −${A.v.d.toFixed(1)}`,c:'b'}]),CH('เบี้ยวหนี้',[{t:'ต้องสู้กับคนทวงหนี้',c:'b'},kk(-2)])];K.ai=R.h.gold>=pay?0:1;}
    else if(deal==='sold'){const c=Math.round(150*s);A.v.c=c;K.text='"อยากได้ปีนั้นคืนไหม ข้าขายคืนให้ในราคาพิเศษ" เขาเขย่าขวดแก้วที่มีแสงวิบวับอยู่ข้างใน';
     K.ch=[CH('ซื้อคืน',[{t:`−${c} ทอง`,c:'w'},{t:'ชะตายืดออก',c:'g'}],R.h.gold<c),CH('ไม่ต้อง',[{t:'เดินผ่านไป',c:''}])];K.ai=R.h.gold>=c?0:1;}
    else{K.text='"เจ้าเป็นคนเดียวที่ไม่ซื้ออะไรจากข้า ข้าชอบคนแบบนี้" เขาวางห่อผ้าเล็กๆ ไว้บนพื้น';
     K.ch=[CH('เปิดห่อผ้า',[{t:'LUK +3',c:'g'},{t:'+ม้วนวาร์ป',c:'g'}]),CH('ไม่รับของจากคนแปลกหน้า',[kk(1)])];K.ai=0;}},
   res(R,K,i,out,A){const f=R.floor,h=R.h,deal=A.v.deal;R.map[f-1]='calm';
    if(deal==='debt'){if(i===0){h.gold-=A.v.pay;say(R,out,'เขานับเหรียญทีละเหรียญจนครบ แล้วโค้งให้อย่างสุภาพ','info');}
     else if(i===1){h.def=Math.max(1,h.def-A.v.d);say(R,out,'เกราะเงินหลุดจากตัวเอง เหมือนรู้ว่าเจ้าของตัวจริงมาแล้ว','info');}
     else{R.karma-=2;R.map[f-1]='fight';say(R,out,'หน้ากากหยุดยิ้ม เงาใต้แผงลุกขึ้นมาถืออาวุธ','bad');duel(R,out,'คนทวงหนี้','war',1.2,{});}}
    else if(deal==='sold'){if(i===0){h.gold-=A.v.c;R.map[f-1]='good';const d=shiftFate(R,ri(3,5));say(R,out,`คุณดื่มแสงในขวดจนหมด ${fateFeel(d)}`,'good');}else say(R,out,'"ตามใจ" เขาเก็บขวดเข้าเสื้อ แล้วหายไปพร้อมแผง','info');}
    else{if(i===0){h.luk+=3;R.warps++;R.map[f-1]='good';say(R,out,'ในห่อผ้ามีเหรียญนำโชคกับม้วนวาร์ปหนึ่งม้วน','good');}else{R.karma+=1;say(R,out,'เขาหัวเราะเบาๆ "ยิ่งชอบเข้าไปใหญ่"','info');}}}}]}};
function planArcs(R){const ids=Object.keys(ARCS).sort(()=>rnd()-.5),n=rnd()<.5?1:2;
 for(let j=0;j<n;j++){let due=j===0?ri(5,20):ri(16,36);if(due%10===0)due++;R.arcs[ids[j]]={st:0,due,v:{},done:0};}}
function dueArc(R){for(const id in R.arcs){const A=R.arcs[id];if(!A.done&&R.floor>=A.due&&R.floor%10!==0)return id;}return null;}
function mkArcKey(R,K,id){const A=R.arcs[id],AR=ARCS[id],S2=AR.st[A.st];K.arc=id;K.rar=S2.r||'c';S2.mk(R,K,A);const tot=A.v.short?2:AR.st.length;
 K.tag=`ชั้น ${R.floor} · เรื่องต่อเนื่อง "${AR.n}" ตอน ${A.st+1}/${tot}`;
 const br=A.st===0?'':A.v.help!==undefined?A.v.help:A.v.rel||A.v.deal||(A.v.take?'t':'n');K.tid=`arc:${id}:${A.st}${br!==''?':'+br:''}`;}
function resArc(R,K,i,out){const id=K.arc,A=R.arcs[id],AR=ARCS[id];AR.st[A.st].res(R,K,i,out,A);A.st++;
 if(A.st>=AR.st.length)A.done=1;if(!A.done){A.due=R.floor+ri(10,18);if(A.due%10===0)A.due++;}}
// ---- pacing: dramatic floors and quiet stretches ----
const DRAMA=[
 {id:'horde',n:'ฝูงมอนสเตอร์ทะลัก',run(R,out){const f=R.floor,t=pick(monsOf(biome(f)));const en=modMon(R,mkMon(t,f,1.5),MD(R,'mon',1));en.n=`ฝูง${t.n}`;
   say(R,out,`พื้นสั่นสะเทือน ฝูง${t.n}นับสิบตัวทะลักขึ้นมาจากชั้นล่าง!`,'bad');R.map[f-1]='fight';doFight(R,en,out,{rw:2.5,cause:`ถูกฝูง${t.n}รุมจนสิ้นใจ (ชั้น ${f})`});}},
 {id:'elite',n:'จ่าฝูง',run(R,out){const f=R.floor,t=pick(monsOf(biome(f)));const en=modMon(R,mkMon(t,f,1.35),MD(R,'mon',1));en.n=`${t.n}จ่าฝูง`;
   say(R,out,`${t.n}ตัวใหญ่เกือบเท่าตัวเดินออกมาจากเงามืด`,'bad');R.map[f-1]='fight';doFight(R,en,out,{rw:2});}},
 {id:'quake',n:'หอคอยสั่น',run(R,out){const f=R.floor,h=R.h,lose=Math.round(h.gold*.1);h.hp-=h.mhp*.2;h.gold-=lose;R.map[f-1]='trap';out.shake=1;out.cause=`ถูกหินจากเพดานทับ (ชั้น ${f})`;
   say(R,out,`หอคอยทั้งหลังเอียงวูบ หินจากเพดานร่วงลงมาเป็นห่า ถุงทองขาด ทองหล่นหายไป ${lose} เหรียญ`,'bad');}},
 {id:'meteor',n:'ฝนดาวตก',run(R,out){const h=R.h;h.hp=h.mhp;h.mp=h.mmp;h.luk+=1;R.map[R.floor-1]='good';say(R,out,'ฝนดาวตกลอดหน้าต่างหอคอยเข้ามา แสงอุ่นจนแผลทุกแผลปิดสนิท (HP เต็ม · LUK +1)','lv');}},
 {id:'mirror',n:'เงาในกระจก',run(R,out){const f=R.floor,h=R.h;const en={id:'merc',cls:cid(R),n:'เงาของคุณ',hp:h.mhp*.75,mhp:h.mhp*.75,atk:eAtk(R)*.85,def:eDef(R)*.85,boss:false};
   say(R,out,'เงาของคุณก้าวออกมาจากกระจกบานใหญ่ แล้วชักอาวุธแบบเดียวกับคุณ','bad');R.map[f-1]='fight';doFight(R,en,out,{rw:2});}},
 {id:'vault',n:'ห้องสมบัติที่ถูกลืม',run(R,out){const f=R.floor,g=Math.round(60*scl(f)*MD(R,'gold',1));R.h.gold+=g;out.coins=g;R.map[f-1]='treasure';say(R,out,`ผนังพังลงมา ข้างหลังเป็นห้องเก็บสมบัติที่ไม่มีใครแตะมาเป็นร้อยปี ได้ทอง ${g}`,'lv');}}];
const QUIET=['ทุ่งหญ้าเงียบจนได้ยินเสียงแมลง','แสงคริสตัลส่องทางให้ตลอด','หมอกในป่าบางลงจนเห็นทางชัด','ลาวาสงบเหมือนหลับไปชั่วคราว','ดวงดาวรอบตัวหมุนช้าลงเหมือนรอคุณ'];
function quietLen(R){let n=0;const tg=ri(3,6)+(MD(R,'quiet',1)>1?1:0);
 for(let k=0;k<tg;k++){const fl=R.floor+k;if(fl%10===0||fl>=100||pRoll(fl,hzM(R))>=.045)break;let arcD=false;for(const id in R.arcs){const A=R.arcs[id];if(!A.done&&A.due<=fl)arcD=true;}if(arcD||(R.egg&&R.egg.at<=fl+1))break;n++;}return n;}
function quietTick(R,n){const out=mkOut(),f0=R.floor,g0=R.h.gold,l0=R.h.lv,k0=R.kills,keep=[];R.quiet=true;let k=0;
 let dead=false;const qb=[];for(;k<n&&R.alive;k++){if(rollFloor(R)){dead=true;break;}const ev=genEvent(R);if(ev.kind==='boss')break;const fg=R.h.gold,fh=R.h.hp,ff=R.floor;const o=resolve(R,ev,aiPick(R,ev))||mkOut();aiPotion(R);finishFloor(R,o);
  qb.push({f:ff,g:Math.round(R.h.gold-fg),hp:Math.round(R.h.hp-fh)});if(o.mile)out.mile=o.mile;
  o.msgs.forEach(m=>{if(m.keep||(m.c==='lv'&&!/^เลเวลอัป/.test(m.t))||/ทรยศ/.test(m.t))keep.push(m);});}
 R.quiet=false;R.quietN++;R.lastQuiet=R.floor;const dg=Math.round(R.h.gold-g0),dk=R.kills-k0;
 if(k)say(R,out,`${fresh(R,'qt',QUIET)} ผ่านไป ${k} ชั้นรวด (ชั้น ${f0}–${f0+k-1}) · สู้ ${dk} ครั้ง · ทอง ${dg>=0?'+':''}${dg}${R.h.lv>l0?` · เลเวล ${l0}→${R.h.lv}`:''}`,'info');
 keep.forEach(m=>say(R,out,m.t,m.c));if(dead){const d=deathTick(R);out.msgs.push(...d.msgs);out.vis=d.vis;}out.quietN=Math.max(1,k);out.f0=f0;out.qb=qb;return out;}
function dramaTick(R,D){const out=mkOut();R.drama++;R.lastDrama=R.floor;D.run(R,out);if(R.alive&&R.h.hp<=0)mortal(R,out,out.cause);finishFloor(R,out);return out;}
function hatch(R,out){R.egg=null;if(R.pets.length<2){const p=pick(PETK);R.pets.push(p);R.h.luk+=2;say(R,out,`ไข่ฟักแล้ว! ${PETS[p].n}ตัวน้อยมองคุณเป็นแม่ทันที (${PETS[p].d})`,'good');}
 else{R.h.luk+=4;say(R,out,'ไข่ฟักออกมาเป็นนกไฟตัวจิ๋ว มันบินวนรอบหัวคุณสามรอบแล้วหายไป ทิ้งโชคไว้ให้ (LUK +4)','good');}}
function genSpecial(R){const ok=Object.keys(SPECIAL).filter(k=>!SPECIAL[k].ok||SPECIAL[k].ok(R));
 let pool=ok.filter(k=>!R.used['sp:'+k]||(k==='mimic'&&MD(R,'mimic',1)>1&&R.used['sp:mimic']<3));if(!pool.length)pool=ok.filter(k=>k!==R.lastSp);
 const fresh=k=>R.xseen&&!R.xseen['sp:'+k]?1.6:1;
 const sw=ST_SP[R.st]||{};const k=pool[wIdx(pool.map(x=>tierW(R,TIER[x])*(x==='mimic'?MD(R,'mimic',1):1)*fresh(x)*(sw[x]||1)))];R.lastSp=k;return k;}
// build a decision card (key moment)
function mkKey(R,type,ev){const f=R.floor,K={type,ev,tag:'',title:'',text:'',vis:null,ch:[],ai:0,rar:'c',tid:type};
 if(type==='boss'){K.tag=`ชั้น ${f} · ชั้นบอส`;K.title=ev.en.n;K.text=ev.en.x;K.vis={t:'en',en:ev.en};K.ch=choicesOf(R,ev);K.ai=aiBoss(R,ev);K.vs=true;}
 else if(type==='ev'){const T=EVENTS[ev.ti];K.tid='ev:'+ev.ti;K.tag=`ชั้น ${f} · เหตุการณ์เสี่ยง`;K.title=T.t;K.text=T.x;K.vis={t:'prop',pr:T.pr};K.ch=choicesOf(R,ev);K.ai=aiPick(R,ev);}
 else if(type==='pet'){const P=PETS[ev.pet];K.tid='pet:'+ev.pet;K.tag=`ชั้น ${f} · สัตว์เลี้ยงหลงทาง`;K.title=P.n;K.text=P.x;K.vis={t:'pet',p:ev.pet};K.ch=choicesOf(R,ev);K.ai=aiPick(R,ev);}
 else if(type==='comp'){const c=ev.comp;K.tag=`ชั้น ${f} · นักผจญภัยพเนจร`;K.title=`${c.n} · ${clsName(c.cls)}`;
  const T=trOf(c);K.tid='comp:'+c.tr;K.text=`${R.karma<-8?'"ข้าได้ยินกิตติศัพท์ด้านไม่ดีของท่านมาบ้าง แต่ทองก็คือทอง" ':''}${c.line} นิสัย: ${T.n} (${T.d})${c.cls==='pri'?' นักบวชจะช่วยรักษาระหว่างต่อสู้':''}`;K.vis={t:'comp',cls:c.cls};K.ch=choicesOf(R,ev);K.ai=aiPick(R,ev);}
 else if(type==='omen'){const cost=omenCost(R);K.tag=`ชั้น ${f} · ลางบอกเหตุ`;K.title='ลางร้าย';let ox=OMEN_X.filter(x=>!R.omenX.includes(x));if(!ox.length)ox=OMEN_X;const oxt=vpick(R,'omen:'+R.omens,ox);R.omenX.push(oxt);const pp=Math.round(curP(R)*100);K.text=oxt+` ใจคุณบอกว่าแถวนี้อันตรายกว่าที่ตาเห็น (โอกาสตายชั้นนี้ราว ${pp}%)`;K.vis={t:'prop',pr:'portal'};
  K.ch=[{t:'จุดธูปขอต่ออายุ',dis:R.h.gold<cost,P:[{t:`−${cost} ทอง`,c:'w'},{t:'6 ชั้นข้างหน้า โอกาสตายลดลงครึ่งหนึ่ง',c:'g'},kk(1),...(R.h.gold<cost?[{t:'(ทองไม่พอ)',c:'b'}]:[])]},
   {t:'กรีดเลือดถวายหอคอย',P:[{t:'HP สูงสุด −10%',c:'b'},{t:'70% โอกาสตายลดลง 20% ไปตลอด',c:'g'},{t:'/ 30% หอคอยไม่รับ',c:'b'}]},
   {t:'ขโมยลมหายใจคนที่นอนหลับ',P:[{t:'โอกาสตายลดลง 35% ไปตลอด',c:'g'},{t:'✧ กรรมชั่วหนัก',c:'kk'}]},
   {t:'ยอมรับชะตา',P:[{t:'HP เต็ม',c:'g'},{t:'+EXP',c:'g'},{t:'3 ชั้นข้างหน้าใจนิ่งขึ้น',c:'g'},kk(2)]}];
  K.ai=R.h.gold>=cost?0:R.h.hp/R.h.mhp>.55?1:3;}
 else if(type==='shop'){enterShop(R);K.tag=`ชั้น ${f} · ศาลพักใจ`;K.title='ศาลพักใจ ⛩';K.vis={t:'prop',pr:'shrine'};
  K.text=`ผ่านบอสมาได้ พักฟื้น HP ไป 20% นักบวชเฒ่ายืนรอรับทองอยู่หน้าศาล (มีทอง ${Math.round(R.h.gold)})`;
  K.ch=[{t:'ให้ชะตาจัดของให้',P:[{t:'ฟื้น HP · ยาสำรอง · อัปเกรดตามทองที่มี',c:'g'}]},
   {t:'ทุ่มทองให้อาวุธ',P:[{t:'พักฟื้น + ยา 1 ขวด',c:''},{t:'ทองที่เหลือลับดาบทั้งหมด',c:'g'}]},
   {t:'ทุ่มทองให้เกราะกับพลังชีวิต',P:[{t:'พักฟื้น + ยา 1 ขวด',c:''},{t:'DEF และ HP สูงสุด',c:'g'}]},
   {t:'เก็บทองไว้ก่อน',P:[{t:'แค่พักฟื้นให้เต็ม',c:''}]}];K.ai=0;}
 else if(type==='arc')mkArcKey(R,K,ev);
 else{const S=SPECIAL[type];S.mk(R,K);K.tid='sp:'+type;K.rar=TIER[type]||'c';}
 if(!K.ch[K.ai]||K.ch[K.ai].dis){const j=K.ch.findIndex(c=>!c.dis);K.ai=j<0?0:j;}
 K.pick=persPick(R,K);if(!K.ch[K.pick]||K.ch[K.pick].dis)K.pick=K.ai;
 return K;}
function shopBuy(R,i,out){const h=R.h,n0={};const cnt=id=>{n0[id]=(n0[id]||0)+1;};const b=id=>{if(buy(R,id)){cnt(id);return true;}return false;};
 if(i===0){const g0=h.gold,a0=h.atk,d0=h.def,m0=h.mhp,p0=R.potions,w0=R.warps;aiShop(R);
  const L=[];if(R.potions>p0)L.push(`ยา ${R.potions-p0}`);if(R.warps>w0)L.push('ม้วนวาร์ป');if(h.atk>a0+.01)L.push('ลับอาวุธ');if(h.def>d0+.01)L.push('เสริมเกราะ');if(h.mhp>m0*1.01)L.push('ยาอายุวัฒนะ');
  say(R,out,L.length?`ชะตาจัดของให้: ${L.join(', ')} (จ่ายไป ${Math.round(g0-h.gold)} ทอง)`:'ทองไม่พอซื้ออะไรเลย ได้แค่นั่งพัก','info');return;}
 if(h.hp<h.mhp*.95||h.mp<h.mmp*.95)b('heal');
 if(i===1||i===2){if(R.potions<1)b('pot');for(let g=0;g<30;g++){const id=i===1?'atk':(g%2?'mhp':'def');if(!b(id)){if(i===2&&b(g%2?'def':'mhp'))continue;break;}}}
 const names={heal:'พักฟื้น',pot:'ยา',atk:'ลับอาวุธ',def:'เสริมเกราะ',mhp:'ยาอายุวัฒนะ'};const L=Object.keys(n0).map(k=>names[k]+(n0[k]>1?` x${n0[k]}`:''));
 say(R,out,L.length?`ซื้อ: ${L.join(', ')} · เหลือทอง ${Math.round(h.gold)}`:'ไม่ได้ซื้ออะไร เก็บทองไว้ทั้งหมด','info');}
// apply the chosen option of a key moment
function applyKey(R,K,i,auto){const f=R.floor;if(!K.ch[i]||K.ch[i].dis)return null;let out;R.kctx=`${K.title}: ${K.ch[i].t}`;
 if(K.type==='boss'||K.type==='ev'||K.type==='pet'||K.type==='comp'){R.lethal=K.type==='boss';out=resolve(R,K.ev,i);R.lethal=false;if(!out)return null;
  if(out.after==='shop')R.pend='shop';if(out.after==='retreat')R.farmLeft=6;}
 else{out=mkOut();
  if(K.type==='omen'){const h=R.h;R.omens++;R.lastOmen=f;R.map[f-1]='bad';
   if(i===0){h.gold-=omenCost(R);R.karma+=1;R.hzT.push({k:.5,until:f+6});say(R,out,'ควันธูปลอยขึ้นตรงเป็นเส้นเดียว ลมรอบตัวนิ่งลงไปอีกหลายชั้น','good');R.map[f-1]='good';}
   else if(i===1){h.mhp*=.9;h.hp=Math.max(1,Math.min(h.hp,h.mhp)-h.mhp*.15);if(rnd()<.7){R.hzP*=.8;R.fateShift+=6;say(R,out,`เลือดหยดลงบนพื้นหินแล้วหายวับไป ${fateFeel(6)}`,'good');}else say(R,out,'เลือดไหลนองพื้นแต่หอคอยไม่ยอมรับ เสียแรงเปล่า','bad');}
   else if(i===2){R.karma-=6;R.hzP*=.65;R.fateShift+=11;R.map[f-1]='evil';say(R,out,`คุณย่องเข้าไปใกล้นักผจญภัยที่หลับอยู่ ลมหายใจของเขาเบาลงเรื่อยๆ ${fateFeel(11)}`,'bad');}
   else{R.karma+=2;h.hp=h.mhp;h.mp=h.mmp;R.hzT.push({k:.8,until:f+3});gainExp(R,10+2*f,out);R.map[f-1]='calm';say(R,out,'คุณนั่งลงหายใจลึกๆ ยอมรับทุกอย่างที่จะเกิด ใจนิ่งลงกว่าทุกครั้ง','lv');}}
  else if(K.type==='shop')shopBuy(R,i,out);
  else if(K.type==='arc')resArc(R,K,i,out);
  else SPECIAL[K.type].res(R,K,i,out);
  if(R.alive&&R.h.hp<=0)mortal(R,out,out.cause);}
 if(auto===true){finishFloor(R,out);return out;}
 R.sinceKey=0;R.keyGap=keyGap(R);if(auto==='same')R.sameN++;else if(auto==='plain')R.plainN++;else R.keys++;
 R.kt[K.type]=(R.kt[K.type]||0)+1;R.used[K.tid]=(R.used[K.tid]||0)+1;if(!NO_WAY[K.type]){R.way[K.tid]=i;R.way[sigOf(K)]=i;}
 if(K.type!=='shop')R.hist.push({f,t:K.title,c:K.ch[i].t,rar:K.rar,tid:K.tid,q:auto||'',res:(out.msgs.find(m=>m.c!=='info')||out.msgs[out.msgs.length-1]||{t:''}).t});
 finishFloor(R,out);return out;}
function quietFarm(R,out){let n=0;const g0=R.h.gold,l0=R.h.lv;R.quiet=true;
 while(R.alive&&n<2&&R.h.hp/R.h.mhp>.6){const o=farm(R);n++;aiPotion(R);if(o.saved){R.quiet=false;say(R,out,o.msgs[o.msgs.length-1].t,'lv');R.quiet=true;}}
 R.quiet=false;if(n)say(R,out,`ล่ามอนสเตอร์แถวนั้นต่ออีก ${n} ตัว ได้ทอง ${Math.round(R.h.gold-g0)}${R.h.lv>l0?` · เลเวลอัปเป็น Lv.${R.h.lv}`:''}`,'info');}
function finishFloor(R,out){if(!R.alive)return;aiPotion(R);if(R.pend||R.farmLeft>0)return;
 R.kctx='';const c=climb(R);out.msgs.push(...c.msgs);if(c.mile)out.mile=c.mile;R.sinceKey++;if(R.egg&&R.floor>=R.egg.at)hatch(R,out);}
// omen key moment: today's hazard is high for this floor (m well above normal) or rising fast
function omenDue(R){if(R.omens>=3||R.floor<6||R.floor%10===0||R.floor>=99||R.floor-R.lastOmen<6)return false;const p=R.lastP,m=hzM(R),pv=R.pPrev;
 return p>=.03&&(m>=1.7||(pv.length>=4&&p>=pv[0]*1.8));}
// ---- SAME_WAY / PLAIN: key moments that do not need to stop the clock ----
const NO_WAY={boss:1,omen:1,shop:1};
const sigOf=K=>'cs:'+K.ch.map(c=>c.t).join('|');
const isGood=p=>p.c==='g'||(p.c==='kk'&&p.t.includes('✦'));
function dominant(K,en){const good=c=>c.P.some(isGood),clean=c=>c.P.every(p=>isGood(p)||p.c==='');
 const cand=en.filter(i=>good(K.ch[i])&&clean(K.ch[i]));if(cand.length!==1)return -1;const a=cand[0];return en.every(i=>i===a||!good(K.ch[i]))?a:-1;}
function autoAns(R,K){if(K.type==='boss')return K.ev&&K.ev.est>=.97&&!K.ch[0].dis?{how:'plain',i:0}:null;
 if(NO_WAY[K.type])return null;const en=K.ch.map((c,i)=>c.dis?-1:i).filter(i=>i>=0);if(!en.length)return null;
 if(en.length===1)return{how:'plain',i:en[0]};
 let w=R.way[K.tid];if(w===undefined)w=R.way[sigOf(K)];if(w!==undefined&&K.ch[w]&&!K.ch[w].dis)return{how:'same',i:w};
 const d=dominant(K,en);return d>=0?{how:'plain',i:d}:null;}
// ---- hero personality: what the hero picks when the timer runs out ----
const PW={bold:{g:.5,b:.35,k:.25,gold:.3,cost:.3,fight:1.1,safe:-.7},careful:{g:.5,b:1.1,k:.3,gold:.2,cost:.4,fight:-.7,safe:.6},
 greedy:{g:.4,b:.5,k:.05,gold:1.3,cost:1,fight:.2,safe:-.2},kind:{g:.4,b:.5,k:1.4,gold:.1,cost:.2,fight:-.1,safe:.1}};
function persPick(R,K){const ps=R.h.pers||'careful';
 if(K.type==='shop')return K.ai;
 if(K.type==='boss'){const w=K.ev.est||0;if(ps==='bold'&&w>=.8)return 0;if(ps==='careful'&&w<.95&&R.retreats<4)return 2;return K.ai;}
 const W=PW[ps]||PW.careful;let best=K.ai,bs=-1e9;
 K.ch.forEach((c,i)=>{if(c.dis)return;let s=(i===K.ai?1:0)+rnd()*.25;const txt=c.t+' '+c.P.map(p=>p.t).join(' ');
  c.P.forEach(p=>{if(p.c==='g')s+=W.g;else if(p.c==='b')s-=W.b;if(p.c==='kk')s+=(p.t.includes('✦')?1:-1)*W.k*(/หนัก/.test(p.t)?2:1);
   if(/ทอง/.test(p.t)){if(p.c==='g')s+=W.gold;else if(/−|เดิมพัน/.test(p.t))s-=W.cost;}
   const mm=p.t.match(/โอกาสชนะ ~(\d+)%/);if(mm){const w=+mm[1];s+=W.fight>0?(w>=45?W.fight:-.6):(w>=80?.3:W.fight);}});
  if(/สู้|ดวล|ปลุก|ท้า/.test(c.t))s+=W.fight*.5;if(/ไม่เสี่ยง|เดินผ่าน|ปล่อยมันไว้/.test(txt))s+=W.safe;
  if(s>bs){bs=s;best=i;}});return best;}
// what happens on the current floor (not resolved yet)
function planFloor(R){const P=planFloor0(R);
 if(P.type==='key'){const a=autoAns(R,P.K);if(a)return{type:'autokey',K:P.K,i:a.i,how:a.how};}return P;}
function planFloor0(R){
 if(R.pend){const p=R.pend;R.pend=null;return{type:p==='shop'?'autokey':'key',K:mkKey(R,p)};}
 if(R.farmLeft>0)return{type:'farm'};
 if(rollFloor(R))return{type:'death'};
 if(omenDue(R))return{type:'key',K:mkKey(R,'omen')};
 if(R.floor%10!==0){
  const aid=dueArc(R);if(aid&&R.sinceKey>=1)return{type:'key',K:mkKey(R,'arc',aid)};
  if(R.sinceKey>=1&&R.floor-R.lastQuiet>=8&&R.floor>2&&rnd()<.09*MD(R,'quiet',1)){const n=quietLen(R);if(n>=3)return{type:'quiet',n};}
  if(R.floor>3&&R.floor-R.lastDrama>=7&&rnd()<.07)return{type:'drama',D:pick(DRAMA.filter(d=>d.id!==R.lastDramaId))};}
 const ev=genEvent(R);
 if(ev.kind==='boss'){const K=mkKey(R,'boss',ev);const again=R.bossAt===R.floor;R.bossAt=R.floor;if(again&&K.ai!==0){K.auto=1;return{type:'autokey',K};}return{type:'key',K};}
 const risky=ev.kind==='ev'&&EVENTS[ev.ti].c.some(c=>c.p);
 const tid=ev.kind==='ev'?'ev:'+ev.ti:ev.kind==='pet'?'pet:'+ev.pet:ev.kind==='comp'?'comp:'+ev.comp.tr:'';
 if(tid&&R.way[tid]!==undefined&&rnd()<.6)return{type:'key',K:mkKey(R,ev.kind,ev)}; // repeat: answered the same way without pausing
 if(tid&&!R.used[tid]&&((R.sinceKey>=2&&(ev.kind==='pet'||ev.kind==='comp'))||(R.sinceKey>=4&&risky&&rnd()<.2)))return{type:'key',K:mkKey(R,ev.kind,ev)};
 if(R.sinceKey>=R.keyGap)return{type:'key',K:mkKey(R,genSpecial(R))};
 return{type:'auto',ev};}
function autoTick(R,ev){const out=resolve(R,ev,aiPick(R,ev));if(R.alive)quietFarm(R,out);finishFloor(R,out);return out;}
function farmTick(R){let out;if(R.h.hp/R.h.mhp<.5){out=mkOut();R.h.hp=Math.min(R.h.mhp,R.h.hp+R.h.mhp*.35);R.h.mp=R.h.mmp;say(R,out,'ก่อไฟพักแผลอยู่ชั้นล่าง ฟื้น HP ไป 35%','good');out.rest=true;}else out=farm(R);R.farmLeft--;if(R.farmLeft<=0){R.farmLeft=0;say(R,out,'ตั้งหลักได้แล้ว กลับขึ้นไปหาบอสอีกครั้ง','info');}finishFloor(R,out);return out;}
const BDEATH=['หญ้าสูงท่วมหัวบังขอบหน้าผาไว้ ก้าวพลาดไปก้าวเดียว','เพดานผลึกร้าวแล้วถล่มลงมาทับ','หลงอยู่ในหมอกพิษจนหายใจไม่ออก','พื้นหินแตกออก ร่างร่วงลงธารลาวา','ร่างค่อยๆ สลายกลายเป็นละอองดาว'];
// cause of a hazard death, weighted by whatever pushed today's multiplier up
function fateCause(R){const f=R.floor,b=biome(f),P=hzParts(R),hf=R.h.hp/R.h.mhp;
 if(f%10===0){const B=mkBoss(f);return{k:'bossfate',t:`ล้มลงต่อหน้า${B.n} ก่อนจะได้ชักอาวุธ`,vis:{t:'en',en:B}};}
 const O=[],W=[];const add=(w,o)=>{W.push(w);O.push(o);};const mon=genMonster(f);
 add(2.5*P.hp,{k:'ambush',t:`ถูก${mon.n}ซุ่มโจมตีจนสิ้นใจ`,vis:{t:'en',en:mon}});add(2,{k:'biome',t:BDEATH[b],vis:null});
 add(1.5,{k:'trap',t:'เหยียบแผ่นหินกลไก ลูกดอกพิษพุ่งออกมาจากผนัง',vis:null});
 if(hf<.4)add(3,{k:'bleed',t:'แผลจากศึกเมื่อครู่ยังไม่ปิด เลือดไหลไม่หยุดจนหมดแรง',vis:null});
 if(R.scars>=1)add(1.5*R.scars,{k:'scar',t:`แผลเก่า ${R.scars} แห่งกำเริบพร้อมกัน ล้มลงกลางบันได`,vis:null});
 if(R.karma<-10)add(2-R.karma/10,{k:'karma',t:'เงาของคนที่เคยถูกคุณทำร้ายตามมาทวงหนี้',vis:null});
 if(R.cursed)add(3*R.cursed,{k:'curse',t:'คำสาปจากวัตถุโบราณกัดกินจนหมดลม',vis:{t:'prop',pr:'altar'}});
 if(MD(R,'hz',1)>1)add(2,{k:'shadow',t:'เงาที่ตามติดมาตั้งแต่เกิดกลืนร่างคุณไปทั้งตัว',vis:null});
 if(!R.pets.length&&!R.comps.length)add(1,{k:'alone',t:'ล้มลงคนเดียวในทางเดินมืด ไม่มีใครได้ยินเสียงเรียก',vis:null});
 if(f<=6)add(4,{k:'slip',t:'ลื่นตกบันไดหินตั้งแต่ยังไม่ทันได้เห็นอะไรเลย',vis:null});
 return O[wIdx(W)];}
function deathTick(R){const out=mkOut(),c=fateCause(R);const cause=`${c.t} (ชั้น ${R.floor})`;say(R,out,cause,'bad');R.ck=c.k||'fate';die(R,cause);R.death='fate';out.vis=c.vis;return out;}
// headless full life with AI everywhere (used for balance checks)
// R.tk = floor-story units shown in the UI (each lasts 5 s / speed); paused key moments add 15 s of real time each
function autoLife(h){const R=newRun(h||rollHero());let g=0;R.tk=0;
 while(R.alive&&g++<5000){R.st=aiStance(R);const P=planFloor(R);R.tk+=P.type==='quiet'?1.6:P.type==='autokey'&&!P.how?1.3:1;
  if(P.type==='death'){deathTick(R);break;}
  if(P.type==='farm')farmTick(R);else if(P.type==='auto')autoTick(R,P.ev);else if(P.type==='quiet')quietTick(R,P.n);else if(P.type==='autokey'){applyKey(R,P.K,P.i!==undefined?P.i:P.K.ai,P.how||true);if(!R.alive&&!R.won)R.death=R.death||'boss';}else if(P.type==='drama'){R.lastDramaId=P.D.id;dramaTick(R,P.D);}else{R.timeouts++;applyKey(R,P.K,P.K.pick);if(!R.alive&&!R.won)R.death=R.death||'boss';}}
 return R;}
/*SIM-END*/
if(typeof document==='undefined'){window.AUTO_SIM={rollHero,HZ,LX,pRoll,project,hzM,autoLife,newRun,planFloor,applyKey,mkKey,BAL,RUN_OMENS,STANCES};return;}

// ================= UI =================
const {heroSpr,MSPR,BSPR,PSPR,PROPS,COIN,ICONS,sprCanvas,blit,bgImg,drawOverlay,drawProp}=window.ART;
const AUDIO=window.AUDIO;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('th-TH');
const BASE_MS=5000; // one floor lasts 5 s at 1x (speed divides it: 16x = 0.31 s)
const SPEEDS=[1,2,4,8,16];
const decMs=()=>15000; // key-moment countdown: always 15 s of real time, not scaled by speed
let S=null;
const VIS={hf:0,ef:0,nums:[],coins:[],shake:0,edead:false,walk0:0,show:null,dieAt:0};
const PXF='8px '+((getComputedStyle(document.documentElement).getPropertyValue('--fP')||'monospace').trim());
const sc=$('scene'),cx=sc.getContext('2d');cx.imageSmoothingEnabled=false;
const look=h=>window.ART.heroLook(h);
// ---- optional hooks into audio.js / share.js (the game runs without them) ----
const sting=n=>{try{if(AUDIO&&AUDIO.sting){AUDIO.sting(n);return true;}}catch(e){}return false;};
const music=(b,f)=>{try{AUDIO&&AUDIO.music&&AUDIO.music(b,f);}catch(e){}};
const heroSeed=h=>{const L=look(h);return shash(h.name+'|'+(L&&L.seed!=null?L.seed:''));};
function heroTheme(h){try{if(AUDIO&&AUDIO.setHero)return AUDIO.setHero({seed:heroSeed(h),cls:CLASSES[h.cls].id,rank:h.rank})||AUDIO.themeId||'';}catch(e){}return'';}
// seeded cosmetics: wall cracks, moss, a banner in the hero's rank colour, pebbles; same hero always gets the same tower
const decoC=new Map();
function heroDeco(b,h){const sd=heroSeed(h),key=sd+':'+b;let c=decoC.get(key);if(c)return c;if(decoC.size>12)decoC.clear();
 c=document.createElement('canvas');c.width=192;c.height=128;const x=c.getContext('2d');let a=(sd^Math.imul(b+1,0x9e3779b9))|0;
 const r=()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
 const px=(X,Y,w,hh,col)=>{x.fillStyle=col;x.fillRect(Math.floor(X),Math.floor(Y),w,hh);};
 const MOSS=['#3a6a2a','#5a8ab0','#2a4a22','#c83a10','#6a6ab8'][b];
 if(b!==4)for(let i=0,n=2+Math.floor(r()*3);i<n;i++){let X=r()*190,Y=6+r()*80;for(let j=0,l=4+Math.floor(r()*6);j<l;j++){px(X,Y,1,1,'#0006');X+=r()<.5?1:-1;Y+=1;}}
 for(let i=0,n=3+Math.floor(r()*4);i<n;i++){const X=r()*186,Y=r()<.5?96+r()*3:10+r()*70;px(X,Y,2+Math.floor(r()*3),1,MOSS);px(X+1,Y+1,1,1,MOSS);}
 if(r()<.75){const X=r()<.5?36+r()*30:126+r()*30,col=RANKS[h.rank]?RANKS[h.rank].col:'#c84a3a';px(X,3,7,13,col);px(X,3,7,1,'#d4a43a');px(X+3,7,1,3,'#fff6');px(X,16,2,2,col);px(X+5,16,2,2,col);}
 for(let i=0,n=6+Math.floor(r()*6);i<n;i++)px(r()*190,103+r()*22,1+Math.floor(r()*2),1,r()<.5?'#0004':'#ffffff18');
 if(b===4)for(let i=0;i<10;i++)px(r()*192,r()*96,1,1,r()<.3?'#ffe9a0':'#ffffff');
 decoC.set(key,c);return c;}
const ach=(t,d)=>{try{window.ACH&&window.ACH.onEvent&&window.ACH.onEvent(t,d||{});}catch(e){}};
// milestone banner over the scene
let mileT=0;function showMile(m){const b=$('mileBan');if(!b||!m)return;b.textContent=m.f===1?'นักผจญภัยรุ่นเดียวกันทุกคนยังอยู่ครบ':`ชั้น ${m.f} · นักผจญภัยรุ่นเดียวกันเหลือรอดราว ${pctTxt(m.p)}%`;b.hidden=false;
 clearTimeout(mileT);mileT=setTimeout(()=>{b.hidden=true;},S&&S.speed>=8?1600:2800);}
const VTINT=[null,'rgba(255,140,60,0.10)','rgba(60,80,200,0.13)'];
function drawShow(t,bob){const s=VIS.show;if(!s)return;
 if(s.t==='en'){const en=s.en;const dead=VIS.edead;if(dead&&Math.floor(t/80)%2===0)return;
  if(en.cls){blit(cx,heroSpr(en.cls),128,84+bob,{flip:true,flash:VIS.ef>t,key:'c'+en.cls});return;}
  const big=en.boss,spr=big?BSPR[en.id]:MSPR[en.id];if(!spr)return;const ex=big?118:128,ey=big?(70+bob):(84+(RM?0:Math.round(Math.sin(t/300+1))));
  blit(cx,spr,ex,ey,{flip:!big&&['wolf','sala'].indexOf(en.id)<0?false:true,flash:VIS.ef>t,key:en.id});}
 else if(s.t==='prop'){if(s.pr)drawProp(cx,s.fb&&!(window.ART.NPCS&&window.ART.NPCS[s.pr])?s.fb:s.pr,t);} // story NPC sprite when sprites.js has it, generic npc otherwise
 else if(s.t==='pet')blit(cx,PSPR[s.p],132,91+bob,{key:'p'+s.p});
 else if(s.t==='comp'){if(s.gold){cx.fillStyle=`rgba(244,187,74,${RM?.25:.18+.12*Math.sin(t/300)})`;cx.fillRect(124,76,24,30);}blit(cx,heroSpr(s.cls),128,84+bob,{flip:true,key:'c'+s.cls});}}
function drawScene(t){const R=S.R,h=R?R.h:S.hero;const b=R?biome(R.floor):0;const ph=S.phase;
 cx.save();if(VIS.shake>t&&!RM)cx.translate(Math.round(Math.random()*2-1),0);
 cx.drawImage(bgImg(b),0,0);if(h)try{cx.drawImage(heroDeco(b,h),0,0);}catch(e){}drawOverlay(cx,b,RM?0:t);
 if(ph==='decide'&&VIS.show&&VTINT[VIS.show.vr]){cx.fillStyle=VTINT[VIS.show.vr];cx.fillRect(0,0,192,128);}
 // birth reveal: one shooting star over the village for rank A and above
 if(ph==='birth'&&VIS.star&&!RM&&t>=VIS.star&&t<VIS.star+1200){const q=(t-VIS.star)/1200,sx=16+q*150,sy=6+q*44;for(let j=0;j<14;j++){cx.fillStyle=`rgba(255,${230-j*6},${160-j*8},${(1-j/14)*(1-q*.6)})`;cx.fillRect(Math.floor(sx-j*2.6),Math.floor(sy-j*.8),j<2?2:1,j<2?2:1);}
  if(q>.85){cx.fillStyle='#fff6c0';cx.fillRect(Math.floor(sx)-2,Math.floor(sy),5,1);cx.fillRect(Math.floor(sx),Math.floor(sy)-2,1,5);}}
 const bob=RM?0:Math.round(Math.sin(t/260));
 const dk=ph==='dying'?(RM?1:clamp((t-VIS.dieAt)/1400,0,1)):0;
 if(ph==='end'||dk>=1){blit(cx,PROPS.grave,88,84);cx.globalAlpha=.55;blit(cx,heroSpr('ghost',look(h)),88,60+(RM?0:Math.round(Math.sin(t/500)*3)),{key:'ghost'});cx.globalAlpha=1;if(ph==='dying')drawShow(t,bob);}
 else{
  const wp=RM||ph!=='flow'?1:clamp((t-VIS.walk0)/380,0,1),hx=ph==='birth'?88:Math.round(10+34*wp),walking=wp<1;
  const hb=walking?-Math.round(Math.abs(Math.sin(t/70))*2):bob;
  if(R){R.comps.forEach((c,i)=>{blit(cx,heroSpr(c.cls),hx-22-i*16,84+(walking?hb:(RM?0:Math.round(Math.sin(t/260+i+1)))),{key:'c'+c.cls});});
   R.pets.forEach((p,i)=>{blit(cx,PSPR[p],hx-(i?36:14),91+(RM?0:Math.abs(Math.round(Math.sin(t/180+i)*2))),{flip:true,key:'p'+p});});}
  if(ph==='birth'){cx.fillStyle='rgba(244,187,74,0.12)';cx.fillRect(84,0,24,100);cx.fillStyle='#5a4a3a';cx.fillRect(80,100,32,4);for(let i=0;i<6;i++){const a=(RM?0:t/600)+i;cx.fillStyle='#f4bb4a';cx.fillRect(96+Math.round(Math.cos(a)*16),88+Math.round(Math.sin(a)*12),1,1);}}
  {const hs=heroSpr(CLASSES[h.cls].id,look(h));if(dk>0)cx.globalAlpha=1-dk;blit(cx,hs,hx,84+hb,{flash:VIS.hf>t,key:'h'+hs.id});cx.globalAlpha=1;}
  if(ph!=='birth'&&(wp>.5||RM))drawShow(t,bob);
 }
 cx.font=PXF;cx.textAlign='center';
 VIS.nums=VIS.nums.filter(n=>t-n.t0<900);for(const n of VIS.nums){const k=(t-n.t0)/900;cx.globalAlpha=1-k;cx.fillStyle='#000';cx.fillText(n.s,n.x+1,n.y-k*14+1);cx.fillStyle=n.c;cx.fillText(n.s,n.x,n.y-k*14);}cx.globalAlpha=1;
 VIS.coins=VIS.coins.filter(c=>c.y<140);for(const c of VIS.coins){c.vy+=.18;c.x+=c.vx;c.y+=c.vy;if(c.y>104&&c.vy>0){c.vy*=-.45;c.y=104;c.b++;if(c.b>3)c.y=200;}blit(cx,COIN,c.x,c.y);}
 cx.restore();}
function coinBurst(n){AUDIO.sfx('coin');if(RM)return;for(let i=0;i<Math.min(40,n);i++)VIS.coins.push({x:130,y:80,vx:rr(-2.4,1.2),vy:rr(-4,-1.5),b:0});}
let lastT=0;function loop(t){requestAnimationFrame(loop);if(document.hidden)return;if(t-lastT<(RM?400:50))return;lastT=t;try{drawScene(t);}catch(e){}}
// ---- HUD ----
let snap=null;
const HINTS_S=['สั้นมาก','ไม่ค่อยดี','กลางๆ','ยืนยาว','แข็งผิดคน','ลึกลับ'];
const RISKW=['มั่นคง','ปกติ','สั่นไหว','อันตราย','ใกล้ฆาต'];
const riskIdx=p=>p<.015?0:p<.03?1:p<.06?2:p<.12?3:4;
function fateText(){const R=S.R;if(!R)return HINTS_S[S.hero.hint];
 if(R.reveal){const pj=project(R.floor,hzM(R));return pj.a>=100?'ยอดหอ':`ขาดราวชั้น ${pj.a}–${pj.b}`;}return RISKW[riskIdx(curP(R))];}
function achWatch(R){if(!R||!window.ACH)return;const W=S.aw||(S.aw={f:R.floor,p:R.pets.join(),c:R.comps.map(c=>c.n).join(),k:R.karma});
 if(R.floor!==W.f){W.f=R.floor;ach('floor',{floor:R.floor});}
 const pj=R.pets.join();if(pj!==W.p){R.pets.forEach(p=>{if(!W.p.split(',').includes(p))ach('pet',{id:p});});W.p=pj;}
 const cj=R.comps.map(c=>c.n).join();if(cj!==W.c){R.comps.forEach(c=>{if(!W.c.split(',').includes(c.n))ach('comp',{trait:c.tr});});W.c=cj;}
 if(R.karma!==W.k){ach('karma',{delta:R.karma-W.k,total:R.karma});W.k=R.karma;}}
function renderHUD(){const R=S.R,h=R?R.h:S.hero,C=CLASSES[h.cls];let hp=h.hp;if(S.phase==='combat'&&S.cb)hp=S.cb.hp;
 $('hName').textContent=h.name;$('hSub').textContent=`รุ่นที่ ${h.gen||1} · แรงค์ ${RANKS[h.rank].k} · ${C.n} · ${h.village}`;
 const f=R?R.floor:0;$('hFloor').textContent=f;
 $('v-hp').textContent=`${Math.ceil(hp)}/${Math.ceil(h.mhp)}`;$('b-hp').style.width=clamp(hp/h.mhp*100,0,100)+'%';
 const A=R?eAtk(R):h.atk,D=R?eDef(R):h.def,Lk=R?eLuk(R):h.luk;
 $('v-atk').textContent=Math.round(A);$('v-def').textContent=Math.round(D);$('v-luk').textContent=Math.round(Lk);
 $('v-mp').textContent=`${Math.round(h.mp)}`;$('b-mp').style.width=clamp(h.mp/h.mmp*100,0,100)+'%';
 $('v-lv').textContent=`Lv.${h.lv}`;$('b-lv').style.width=clamp(h.exp/need(h.lv)*100,0,100)+'%';$('v-gold').textContent=fmt(h.gold);
 $('v-fate').textContent=fateText();if(R)achWatch(R);
 $('pFill').style.width=f+'%';$('pMark').style.left=f+'%';$('track').setAttribute('aria-valuenow',f);
 $('biomeTag').textContent=R?`${BIOMES[biome(R.floor)]} · ชั้น ${R.floor}`:'ห้องโถงแห่งการสุ่มเกิด';
 const ticks=$('pTicks');if(!ticks.childElementCount)for(let i=10;i<=100;i+=10){const d=document.createElement('div');d.className='tick';d.style.left=i+'%';ticks.appendChild(d);}
 [...ticks.children].forEach((d,i)=>d.classList.toggle('done',f>(i+1)*10));
 const now={hp:Math.round(hp),atk:Math.round(A*10)/10,def:Math.round(D*10)/10,luk:Math.round(Lk),mp:Math.round(h.mp),lv:h.lv,gold:Math.round(h.gold),run:S.runId};
 if(snap&&snap.run===now.run&&now.lv>snap.lv)AUDIO.sfx('levelup');
 if(snap&&snap.run===now.run&&S.phase!=='birth'){let n=0;for(const k of ['hp','atk','def','luk','mp','lv','gold']){const d=now[k]-snap[k];if(Math.abs(d)>=(k==='atk'||k==='def'?.5:1))floatD(k,d,n++);}}
 snap=now;}
// stat chips: one per stat per update, released 140 ms apart, with the HUD chip pulsing as its number flies
function floatD(k,d,i){if(RM)return;const el=$('c-'+k);if(!el)return;if(i){setTimeout(()=>floatD(k,d,0),i*140);return;}
 el.classList.remove('pulse');void el.offsetWidth;el.classList.add('pulse');const s=document.createElement('span');s.className='flt '+(d>0?'up':'dn');s.textContent=(d>0?'+':'')+(Number.isInteger(d)?d:d.toFixed(1))+(d>0?' ▲':' ▼');el.appendChild(s);setTimeout(()=>s.remove(),1250);}
function miniCanvas(spr,key){const c=document.createElement('canvas');c.width=16;c.height=16;const x=c.getContext('2d');x.drawImage(sprCanvas(spr,false,false,key),Math.floor((16-spr.w)/2),Math.floor((16-spr.h)/2));return c;}
function renderParty(){const el=$('party');el.innerHTML='';const R=S.R,h=R?R.h:S.hero,C=CLASSES[h.cls];
 const add=(spr,key,title,desc)=>{const d=document.createElement('div');d.className='mem';d.appendChild(miniCanvas(spr,key));const t=document.createElement('div');t.innerHTML=`<div>${esc(title)}</div><div class="d">${esc(desc)}</div>`;d.appendChild(t);el.appendChild(d);};
 const hs=heroSpr(C.id,look(h));add(hs,'h'+hs.id,`${h.name} (Lv.${h.lv} ${C.n})`,`สกิลติดตัว: ${C.p} · ${C.pd}`);
 if(R){R.pets.forEach(p=>add(PSPR[p],'p'+p,`สัตว์เลี้ยง: ${PETS[p].n}`,PETS[p].d));R.comps.forEach(c=>add(heroSpr(c.cls),'c'+c.cls,`${c.n} · ${clsName(c.cls)}${c.legend?' ★':''}`,`พลังโจมตี ${Math.round(c.pw)}${c.cls==='pri'?' · ฟื้น HP ระหว่างสู้':''}`));
  if(!R.pets.length&&!R.comps.length){const p=document.createElement('div');p.className='d';p.style.cssText='font-size:12px;color:var(--dim);padding:4px 0';p.textContent='ยังไม่มีเพื่อนร่วมทาง';el.appendChild(p);}
  const inv=document.createElement('div');inv.className='inv';inv.innerHTML=`<span>ยาฟื้นพลัง <b>${R.potions}</b></span><span>ม้วนวาร์ป <b>${R.warps}</b></span><span>สังหาร <b>${R.kills}</b></span><span>แผลเป็น <b>${R.scars}</b></span><span>ดวงประจำชาติ <b>${esc(omenOf(R.h).n)}</b></span>${R.egg?'<span>อุ้มไข่อยู่ <b>1</b></span>':''}`;el.appendChild(inv);}}
function renderLog(){const el=$('log');const L=S.R?S.R.log:[];el.innerHTML=L.slice(0,80).map(l=>`<li class="${l.c}"><span class="f px">${l.f}F</span><span>${esc(l.t)}</span></li>`).join('')||'<li><span class="f"></span><span class="dim">ยังไม่มีบันทึก</span></li>';}
// ---- memorial ----
const MKEY='tof-auto-memorial-v1',SKEY='tof-auto-seen-v1';
function loadSeen(){try{const v=JSON.parse(localStorage.getItem(SKEY)||'{}');return v&&typeof v==='object'?v:{};}catch(e){return{};}}
function saveSeen(R){let n=0;try{const v=loadSeen();R.hist.forEach(x=>{if(!v[x.tid]){v[x.tid]=1;n++;}});localStorage.setItem(SKEY,JSON.stringify(v));}catch(e){}return n;}
function runTitle(R){const h=R.h,fl=R.won?100:R.floor,leg=R.hist.filter(x=>x.rar==='l').length,T=[];
 if(R.won)T.push([9,'ผู้พิชิตยอดหอ',1]);if(leg>=2)T.push([8,'ผู้เห็นตำนานซ้ำสองครั้ง',1]);
 if(R.karma>=20)T.push([6,'นักบุญแห่งหอคอย']);if(R.karma<=-20)T.push([6,'ปีศาจในคราบคน']);if(fl<=10)T.push([5,'ดาวที่ดับเร็ว']);
 if(R.fateShift>=8)T.push([6,'คนต่อชะตา']);if(R.fateShift<=-6)T.push([5,'คนขายอายุ']);if(R.pMax>=.15&&fl>R.pMaxF+5)T.push([5,'คนที่ยมทูตมองข้าม']);
 if(R.sameN>=3)T.push([2,'คนไม่เปลี่ยนใจ']);if(R.scars>=3)T.push([5,'คนที่ตายยาก']);
 if(R.death==='boss')T.push([4,'ผู้ท้าทายเกินตัว']);if(R.pets.length>=2)T.push([3,'เจ้าของสวนสัตว์เคลื่อนที่']);
 if(R.keys>3&&R.timeouts>=R.keys)T.push([4,'คนที่ปล่อยให้ฟ้าลิขิต']);if(R.keys>5&&R.timeouts===0)T.push([3,'ผู้เลือกทางเดินเอง']);
 if(h.gold>=400*scl(fl)/2)T.push([3,'เศรษฐีในหลุมศพ']);if(R.kills>=fl*.9)T.push([2,'นักล่าไม่รู้เหนื่อย']);if(R.comps.some(c=>c.legend))T.push([4,'นายจ้างของตำนาน']);
 T.push([1,'นักผจญภัยธรรมดาคนหนึ่ง']);T.sort((a,b)=>b[0]-a[0]);return{t:T[0][1],gold:!!T[0][2]};}
function montage(R){const H=R.hist;if(!H.length)return[];const n=Math.min(8,Math.max(2,2+Math.floor((R.won?100:R.floor)/14)),H.length),out=[];
 for(let k=0;k<n;k++){const a=Math.floor(k*H.length/n),b=Math.floor((k+1)*H.length/n);const seg=H.slice(a,Math.max(a+1,b));seg.sort((x,y)=>(y.rar==='l')-(x.rar==='l')||(y.rar==='r')-(x.rar==='r'));out.push(seg[0]);}
 return out;}
// memorial: entries are never deleted. Near the storage quota only bulky optional fields of the oldest entries are dropped.
const OLDMKEY='tof-memorial-v1';
function loadMemo(){try{const v=JSON.parse(localStorage.getItem(MKEY)||'[]');return Array.isArray(v)?v:[];}catch(e){return[];}}
function loadOldMemo(){try{const v=JSON.parse(localStorage.getItem(OLDMKEY)||'[]');return Array.isArray(v)?v.filter(isObj).map(m=>Object.assign({},m,{old:1})):[];}catch(e){return[];}}
const MEMO_BULK=['eu','cohN','cert','gen','house','stance'];
function saveMemo(e){const a=loadMemo();a.unshift(e);
 for(let k=a.length-1;k>=-1;k--){try{localStorage.setItem(MKEY,JSON.stringify(a));return;}catch(err){if(k<0)return;MEMO_BULK.forEach(f=>{if(a[k])delete a[k][f];});}}}
let memoAll=false;
function renderMemo(){const a=[...loadMemo(),...loadOldMemo()].sort((x,y)=>(y.t||0)-(x.t||0)),N=12,show=memoAll?a:a.slice(0,N);
 $('memo').innerHTML=a.length?show.map(m=>`<div class="row"><span class="px" style="color:${RANKS[m.rank]?RANKS[m.rank].col:'#fff'}">${esc(RANKS[m.rank]?RANKS[m.rank].k:'?')}</span><span>${esc(m.name)} · ${esc(m.cls)}${m.gen>1?` · รุ่นที่ ${m.gen}`:''}${m.old?' <span class="oldtag">โหมดเก่า</span>':''}<br><span class="x">${esc(m.cause)}</span></span><span class="px">${m.won?'👑 ':''}${m.floor}F</span></div>`).join('')
  +(a.length>N?`<button type="button" class="btn memomore" id="memoMore">${memoAll?'ย่อรายการ':`ดูเพิ่ม (อีก ${a.length-N} คน)`}</button>`:''):'<div class="dim" style="font-size:13px">ยังไม่มีใครนอนอยู่ที่นี่</div>';
 const b=$('memoMore');if(b)b.onclick=()=>{memoAll=!memoAll;renderMemo();};}
// ---- lineage (สายตระกูล): every life is appended to its line; apprentices continue the line, rebirth starts a new one ----
const LKEY='tof-lineage-v1';
function loadLin(){try{const v=JSON.parse(localStorage.getItem(LKEY)||'null');if(isObj(v)&&isArr(v.lines))return{v:1,lines:v.lines.filter(x=>isObj(x)&&isArr(x.lives))};}catch(e){}return{v:1,lines:[]};}
function saveLin(L){for(let n=L.lines.length;n>=1;n=Math.floor(n*.7)){try{localStorage.setItem(LKEY,JSON.stringify({v:1,lines:L.lines.slice(0,n)}));return;}catch(e){}}}
const newLinId=()=>'L'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);
function addLife(R){const h=R.h,L=loadLin();if(!h.lin){h.lin=newLinId();h.house=h.house||h.name;h.gen=h.gen||1;}
 let ln=L.lines.find(x=>x.id===h.lin);if(ln)L.lines.splice(L.lines.indexOf(ln),1);else ln={id:h.lin,house:h.house||h.name,lives:[],prev:h.prev||null};L.lines.unshift(ln);
 if(!ln.lives.some(x=>x.run===S.runId))ln.lives.push({gen:h.gen||1,name:h.name,rank:h.rank,cls:CLASSES[h.cls].n,floor:R.won?100:R.floor,won:R.won,karma:R.karma,run:S.runId,t:Date.now()});
 saveLin(L);}
function renderLineage(){const el=$('lineage');if(!el||!S)return;const L=loadLin(),h=S.R?S.R.h:S.hero,cur=h&&L.lines.find(x=>x.id===h.lin);
 const life=x=>`<span class="lv"><span class="px" style="color:${RANKS[x.rank]?RANKS[x.rank].col:'#fff'}">${esc(RANKS[x.rank]?RANKS[x.rank].k:'?')}</span> รุ่นที่ ${x.gen} ${esc(x.name)} · ${x.won?'👑 ':''}ชั้น ${x.floor}</span>`;
 const alive=S.phase!=='end'&&h?`<span class="lv now"><span class="px" style="color:${RANKS[h.rank].col}">${RANKS[h.rank].k}</span> รุ่นที่ ${h.gen||1} ${esc(h.name)} · ${S.R?`กำลังไต่ ชั้น ${S.R.floor}`:'เพิ่งเกิด'}</span>`:'';
 let html='';
 if(cur||h){const lives=cur?cur.lives.slice(-8):[];html+=`<div class="linehd">สาย${esc((cur&&cur.house)||(h&&h.house)||h.name)}${cur&&cur.lives.length>8?` <span class="dim">(แสดง 8 รุ่นล่าสุดจาก ${cur.lives.length})</span>`:''}</div><div class="chain">${[...lives.map(life),alive].filter(Boolean).join('<span class="ar">→</span>')}</div>`;}
 const others=L.lines.filter(x=>x!==cur).slice(0,3);
 if(others.length)html+=`<div class="others">${others.map(x=>`<div>สาย${esc(x.house)} · ${x.lives.length} รุ่น · ไกลสุดชั้น ${Math.max(...x.lives.map(v=>v.floor))}</div>`).join('')}</div>`;
 el.innerHTML=html||'<div class="dim" style="font-size:13px">ยังไม่มีสายตระกูล</div>';}
// ---- cause-of-death pool: headless lives simulated in idle slices (plus every cohort), cached across sessions ----
const PKEY='tof-causes-v1',POOL_V=2;let POOL=null;
function loadPool(){if(POOL)return POOL;try{const v=JSON.parse(localStorage.getItem(PKEY)||'null');POOL=isObj(v)&&v.v===POOL_V&&isArr(v.r)?v:{v:POOL_V,r:[]};}catch(e){POOL={v:POOL_V,r:[]};}return POOL;}
function poolAdd(L){const P=loadPool();P.r.push([L.won?100:L.floor,L.won?'win':(L.ck||'boss')]);if(P.r.length>3000)P.r.splice(0,P.r.length-3000);}
function poolSave(){try{localStorage.setItem(PKEY,JSON.stringify(loadPool()));}catch(e){}}
function poolBg(){let n=0;const step=()=>{if(loadPool().r.length>=600){poolSave();return;}if(document.hidden||(S&&S.phase==='combat')){setTimeout(step,700);return;}
  for(let i=0;i<3;i++)poolAdd(autoLife());n+=3;if(n%30===0)poolSave();setTimeout(step,80);};setTimeout(step,2500);}
const CAUSEN={ambush:'ถูกมอนสเตอร์ซุ่มโจมตี',biome:'อุบัติเหตุจากตัวหอ',trap:'กับดักกลไก',bleed:'เสียเลือดจนหมดแรง',scar:'แผลเก่ากำเริบ',karma:'เงากรรมตามทัน',curse:'คำสาป',shadow:'เงาที่ตามติดมาแต่เกิด',alone:'ล้มลงคนเดียว',slip:'ลื่นตกบันได',boss:'แพ้บอส',bossfate:'ชะตาขาดต่อหน้าบอส',fate:'ชะตาขาด'};
const SUDDEN={boss:1,bossfate:1,ambush:1,trap:1,slip:1,biome:1};
function causeStat(fl,ck){const r=loadPool().r.filter(x=>x[1]!=='win');if(r.length<20)return null;const b=Math.floor((fl-1)/10),inB=r.filter(x=>Math.floor((x[0]-1)/10)===b),use=inB.length>=25?inB:r;
 return{p:use.filter(x=>x[1]===ck).length/use.length,band:use===inB?`ชั้น ${b*10+1}–${b*10+10}`:'ทุกช่วงชั้น',N:r.length};}
// ---- save / resume (one live run) ----
const SAVEK='tof-auto-save-v1',SAVE_V=2; // v2: stance, cohort, milestones, lineage fields (v1 saves migrate on load)
function clearSave(){try{localStorage.removeItem(SAVEK);}catch(e){}}
// called on every render (floor change, decision, combat, pause); timers and DOM handles are never written
function saveRun(){if(!S)return;
 if(S.phase==='birth'){try{localStorage.setItem(SAVEK,JSON.stringify({v:SAVE_V,t:Date.now(),phase:'birth',hero:S.hero,rerolled:!!S.rerolled,bo:S.bo||null}));}catch(e){}return;} // refresh cannot re-roll the hero
 if(!S.R)return;if(!S.R.alive||S.R.won){finalizeRun();return;}if(!['flow','decide','combat'].includes(S.phase))return;
 try{localStorage.setItem(SAVEK,JSON.stringify({v:SAVE_V,t:Date.now(),phase:S.phase,paused:!!S.paused,runId:S.runId,t0:S.t0||0,hero:S.hero,R:S.R,K:S.phase==='decide'?S.K:null,frame:S.frame}));}catch(e){}}
// the run is over: write the memorial once and drop the save
function finalizeRun(){if(!S||!S.R||S.fin)return;S.fin=1;const R=S.R,h=R.h,fl=R.won?100:R.floor;
 try{addLife(R);S.hero.lin=h.lin;S.hero.house=h.house;S.hero.gen=h.gen;}catch(e){}
 saveMemo({name:h.name,rank:h.rank,cls:CLASSES[h.cls].n,floor:fl,won:R.won,cause:R.won?'พิชิตยอดหอคอย':R.cause,lv:h.lv,gen:h.gen||1,t:Date.now()});clearSave();poolAdd(R);poolSave();}
const isArr=Array.isArray,isObj=o=>!!o&&typeof o==='object'&&!isArr(o);
// heroes from older saves have no lineage yet: they become generation 1 of their own line
function linFix(h){if(!h)return;if(!(h.gen>=1))h.gen=1;if(!h.house)h.house=h.name;if(!h.lin)h.lin=newLinId();}
function resumeRun(){let d=null;try{d=JSON.parse(localStorage.getItem(SAVEK)||'null');}catch(e){d=null;}
 // legacy birth-only save from the earlier hotfix ('tof-auto-birth-v1')
 if(!d){try{const b=JSON.parse(localStorage.getItem('tof-auto-birth-v1')||'null');localStorage.removeItem('tof-auto-birth-v1');if(b&&isObj(b.hero))d={v:SAVE_V,phase:'birth',hero:b.hero,rerolled:!!b.rerolled};}catch(e){}}
 if(!d)return false;
 const okV=d.v===1||d.v===SAVE_V;
 try{if(okV&&d.phase==='birth'&&isObj(d.hero)){const hero=Object.assign(rollHero(),d.hero);if(!CLASSES[hero.cls]||!RANKS[hero.rank]||!PERS[hero.pers]||!hero.name)throw 0;
   if(hero.look&&hero.look.form)rollHero.form=hero.look.form;linFix(hero);
   S={phase:'birth',hero,rerolled:!!d.rerolled,bo:isObj(d.bo)?d.bo:null,rvDone:true,R:null,K:null,cb:null,cmp:null,saved:false,runId:0,speed:loadSpeed(),paused:false,tm:0,frame:null};snap=null;VIS.coins=[];VIS.show=null;S.themeId=heroTheme(hero);render();return true;}
  if(!okV||!isObj(d.R)||!isObj(d.hero)||!d.R.alive||d.R.won)throw 0;
  const hero=Object.assign(rollHero(),d.hero);if(!CLASSES[hero.cls]||!RANKS[hero.rank]||!PERS[hero.pers])throw 0;
  const R=newRun(hero),sv=Object.assign({},d.R),k=+sv.karma||0;delete sv.karma;R.karma=k;Object.assign(R,sv);
  R.h=Object.assign(JSON.parse(JSON.stringify(hero)),isObj(d.R.h)?d.R.h:{});
  if(!isArr(R.map)||R.map.length!==100||!isArr(R.farmed)||R.farmed.length!==100||!(R.floor>=1&&R.floor<=100)||!(R.h.mhp>0))throw 0;
  ['ledger','log','hist','pets','comps','hzT','pPrev','omenX','seen'].forEach(x=>{if(!isArr(R[x]))R[x]=[];});
  ['way','used','kt','arcs','buys','mod','lu'].forEach(x=>{if(!isObj(R[x]))R[x]={};});
  // v1 -> v2 migration: new state gets defaults; milestones already passed are not announced late
  linFix(hero);if(!R.h.lin){R.h.lin=hero.lin;R.h.house=hero.house;R.h.gen=hero.gen;}if(!STANCES[R.st])R.st=PST[R.h.pers]||'def';if(typeof R.stH!=='string')R.stH='';
  R.coh=isArr(R.coh)?R.coh.filter(c=>isObj(c)&&c.n&&c.f>0):[];if(!isArr(d.R.mile)||!isArr(R.mile))R.mile=MILES.filter(m=>m<=R.floor);
  if(typeof R.gPrev!=='number')R.gPrev=R.h.gold;if(typeof R.theme!=='string')R.theme='';if(typeof R.ck!=='string')R.ck='';
  for(const id in R.arcs)if(!ARCS[id])delete R.arcs[id];R.pets=R.pets.filter(p=>PETS[p]);
  ['rolled','hzP','fateShift','mLog','mN','pMax','pMaxF','lastP','scars','cursed','keys','timeouts','sameN','plainN','sinceKey','keyGap','stCh','gIn'].forEach(x=>{if(typeof R[x]!=='number'||!isFinite(R[x]))R[x]=x==='hzP'?1:x==='keyGap'?5:0;});
  S={phase:'flow',hero,rerolled:true,R,K:null,cb:null,cmp:null,saved:false,runId:d.runId||Date.now(),t0:+d.t0||Date.now(),speed:loadSpeed(),paused:!!d.paused,tm:0,
   frame:isObj(d.frame)&&isArr(d.frame.msgs)?d.frame:{f:R.floor,tag:`ชั้น ${R.floor}`,title:'',text:'',msgs:[]}};
  snap=null;VIS.coins=[];VIS.show=S.frame.vis||null;VIS.walk0=performance.now();
  S.themeId=heroTheme(R.h);if(!R.theme)R.theme=S.themeId;const lead={t:'กลับมาเดินต่อจากที่ค้างไว้',c:'lv'};R.log.unshift({f:R.floor,t:lead.t,c:lead.c});
  const K=d.K,okK=d.phase==='decide'&&isObj(K)&&isArr(K.ch)&&K.ch.length&&(['boss','ev','pet','comp','omen','arc','shop'].includes(K.type)||SPECIAL[K.type])&&(K.type!=='arc'||R.arcs[K.arc]);
  if(okK){if(!(K.pick>=0&&K.ch[K.pick]&&!K.ch[K.pick].dis))K.pick=K.ai||0;openKey(K);return true;}
  // flow or mid-combat (the combat result is already in R): replay the current floor story from the start
  S.frame=Object.assign({},S.frame,{msgs:[lead,...S.frame.msgs]});render();
  if(S.paused){S.tmDur=floorMs();S.pauseLeft=floorMs();S.tmAt=performance.now()+floorMs();render();}else schedule(floorMs());
  return true;}catch(e){clearSave();S=null;return false;}}
// ---- card ----
const card=$('card');
function partsHTML(P){return P.map(p=>`<span class="${p.c||''}">${esc(p.t)}</span>`).join(' ');}
function focusPrimary(){const b=card.querySelector('[data-enter]')||card.querySelector('button:not(:disabled)');if(b&&document.activeElement&&document.activeElement!==document.body&&!card.contains(document.activeElement))return;if(b)try{b.focus({preventScroll:true});}catch(e){}}
function render(){if(S.phase!=='decide')card.classList.remove('legend');$('formBox').hidden=S.phase!=='birth';renderHUD();renderParty();renderLog();renderCtl();renderLineage();saveRun();
 const ph=S.phase;
 if(ph==='birth')renderBirth();else if(ph==='flow'){renderFlow();revealArm();}else if(ph==='decide')renderDecide();else if(ph==='combat')renderCombat();else if(ph==='dying')renderDying();else if(ph==='end')renderEnd();
 if(ph!=='flow')focusPrimary();}
function renderCtl(){const on=S.phase==='flow'||S.phase==='decide'||S.phase==='combat';$('ctl').hidden=!on;if(!on){renderStance();return;}
 const p=$('btnPause');p.textContent=S.paused?'▶ เดินต่อ':'⏸ หยุด';p.setAttribute('aria-pressed',S.paused?'true':'false');
 document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.speed===S.speed?'true':'false'));
 $('ctlNote').textContent=S.R?`จุดเปลี่ยน ${S.R.keys} ครั้ง`:'';renderStance();}
// stance toggle under the speed bar: always available while the run is going
function renderStance(){const box=$('stanceBox');if(!box)return;const on=!!S.R&&['flow','decide','combat'].includes(S.phase);box.hidden=!on;if(!on)return;
 const el=$('stBtns');if(!el.childElementCount){el.innerHTML=STK.map(k=>`<button type="button" data-st="${k}" data-tip="stance">${STANCES[k].ic} ${STANCES[k].n}</button>`).join('');
  el.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>setStance(b.dataset.st));}
 el.querySelectorAll('[data-st]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.st===S.R.st?'true':'false'));$('stNote').textContent=STANCES[S.R.st].d;}
function setStance(k){const R=S.R;if(!R||!STANCES[k]||R.st===k||!R.alive)return;R.st=k;R.stCh=(R.stCh||0)+1;R.log.unshift({f:R.floor,t:`เปลี่ยนท่าทีเป็น "${STANCES[k].n}"`,c:'info'});
 renderStance();renderHUD();renderLog();saveRun();}
// look rarity: slime colour bands are uneven (gold is rarest), eyes x mouths are 8 x 7 equally likely
const HUEB=[[15,'สีแดง'],[38,'สีส้ม'],[52,'สีทอง'],[90,'สีมะนาว'],[160,'สีเขียว'],[220,'สีฟ้า'],[262,'สีน้ำเงิน'],[300,'สีม่วง'],[340,'สีชมพู'],[360,'สีแดง']];
const SKINN=['ผิวน้ำผึ้งอ่อน','ผิวน้ำผึ้ง','ผิวแทน','ผิวเข้ม','ผิวขาว','ผิวคล้ำ'];
function lookInfo(h){let L=null;try{L=window.ART.lookOf(look(h));}catch(e){}if(!L)return{n:'หน้าตาธรรมดา',p:1};const fe=1/56;
 if(L.form==='slime'){const hue=((L.hue%360)+360)%360;let lo=0;for(const [hi,nm] of HUEB){if(hue<hi)return{n:'สไลม์'+nm,p:(nm==='สีแดง'?35:hi-lo)/360*fe};lo=hi;}}
 return{n:'คน'+SKINN[(L.skin||0)%6],p:fe/6};}
const combOdds=h=>Math.max(1,Math.round(h.odds/lookInfo(h).p));
function renderBirth(){const h=S.hero,C=CLASSES[h.cls],Rk=RANKS[h.rank],O=omenOf(h),LI=lookInfo(h),mx=30,an=!S.rvDone&&!RM;
 if(!S.themeId||S.themeHero!==h){S.themeHero=h;S.themeId=heroTheme(h);}
 const D=i=>an?` style="--d:${i*350}ms"`:'';
 const bars=RANKS.map((r,i)=>`<div class="col ${i===h.rank?'me':''}">${i===h.rank?'<span class="me-tag">คุณ</span>':''}<div class="bar" style="height:${Math.max(3,r.w/mx*100)}%"></div></div>`).join('');
 const I=h.inh,lin=h.master?`<div class="vil" data-tip="lineage">รุ่นที่ ${h.gen} แห่งสาย${esc(h.house)} · ศิษย์ของ${esc(h.master)}</div>`:`<div class="vil" data-tip="gen">รุ่นที่ ${h.gen||1} แห่งสาย${esc(h.house||h.name)}${h.prev?` · ว่ากันว่าเป็น${esc(h.prev.name)}กลับชาติมาเกิด`:''}</div>`;
 const inh=I?`<div class="inhbox rv"${D(5)} data-tip="lineage">มรดกจากอาจารย์${esc(I.from)}: ทอง +${fmt(I.gold)}${I.pet&&PETS[I.pet]?` · ${esc(PETS[I.pet].n)}ตามมาด้วย`:''}${I.k>=2?' · บุญของอาจารย์คุ้มครอง (LUK +2 ความเสี่ยงตายลดลงเล็กน้อย)':I.k<=-2?' · หนี้กรรมของอาจารย์ตามมาด้วย (ความเสี่ยงตายสูงขึ้นเล็กน้อย)':''}</div>`:'';
 card.innerHTML=`<div class="cert${an?' anim':''}"><div class="hd">✦ ใบประกาศนักผจญภัย ✦</div><div class="nm">${esc(h.name)}</div><div class="vil">ถิ่นกำเนิด: ${esc(h.village)}</div>${lin}
 <div class="tiles"><div class="tile rv"${D(0)}><span class="tl">แรงค์</span><span class="rk" style="background:${Rk.col}">RANK ${Rk.k}</span><span class="tp px">${Rk.w}%</span></div>
  <div class="tile rv"${D(1)}><span class="tl">อาชีพ</span><span class="cls">${C.n}</span><span class="tp px">${(C.w/CLS_SUM*100).toFixed(1)}%</span></div>
  <div class="tile rv"${D(2)} data-tip="look"><span class="tl">หน้าตา</span><b>${esc(LI.n)}</b><span class="tp px">1 ใน ${fmt(1/LI.p)}</span></div></div>
 <div class="rv"${D(0)}><div class="rchart" aria-label="การกระจายแรงค์">${bars}</div><div class="rlab">${RANKS.map(r=>`<span>${r.k}</span>`).join('')}</div></div>
 <div class="pas rv"${D(1)}>สกิลติดตัว <b>${C.p}</b> · ${C.pd}</div>
 <div class="cstats rv"${D(3)}><div>HP<b>${Math.round(h.mhp)}</b></div><div>ATK<b>${Math.round(h.atk)}</b></div><div>DEF<b>${Math.round(h.def)}</b></div><div>LUK<b>${Math.round(h.luk)}</b></div><div>MP<b>${Math.round(h.mmp)}</b></div><div>ทอง<b>${fmt(h.gold)}</b></div></div>
 <div class="odds big rv"${D(4)} data-tip="combo">ฮีโร่แบบคุณ: <b>1 ใน ${fmt(combOdds(h))}</b><span class="sm">แรงค์กับอาชีพ 1 ใน ${fmt(h.odds)} · หน้าตา 1 ใน ${fmt(1/LI.p)}</span></div>
 ${inh}<div class="rv"${D(5)}><div class="fatebox">ดวงชะตา: <b>${esc(HINTS[h.hint])}</b></div>
 <div class="pas" style="margin-top:6px">นิสัย: <b>${esc(PERS[h.pers].n)}</b> · ${esc(PERS[h.pers].d)}</div>
 <div class="omenbox ${O.k==='พร'?'bless':O.k==='คำสาป'?'curse':'mix'}"><span class="ok">${O.k==='ผสม'?'พรปนคำสาป':O.k}ประจำชาตินี้</span> <b>${esc(O.n)}</b><br>${esc(O.d)}</div></div></div>
 <p class="dim" style="font-size:13px;margin:10px 0 0">ในโหมดนี้ชีวิตเดินไปเอง คุณได้ตัดสินใจเฉพาะตอนสำคัญ มีเวลาคิด 15 วินาที ถ้าไม่เลือก ฮีโร่จะเลือกเองตามนิสัย ทุกชั้นชะตาจะทอยว่าคุณรอดไหม โอกาสขึ้นอยู่กับ HP ที่เหลือ แผลเป็น กรรม คำสาป เพื่อนร่วมทาง และท่าทีที่คุณเลือก</p>
 <div class="acts"><button class="btn" id="btnReroll" data-k="1" ${S.rerolled?'disabled':''}>สุ่มใหม่ 1 ครั้ง${S.rerolled?' (ใช้แล้ว)':''}<span class="kb">[1]</span></button>
 <button class="btn pri" id="btnEnter" data-k="2" data-enter>เข้าหอ ▲<span class="kb">[Enter]</span></button></div>`;
 if(!S.rvDone){S.rvDone=true;
  if(RM)sting('birth');else{if(h.rank>=5)VIS.star=performance.now()+1400;clearTimeout(S.rvT);S.rvT=setTimeout(()=>{if(S.phase==='birth')sting('birth');},1400);}}
 const fb=$('formBox');fb.innerHTML=[['slime','สไลม์'],['human','คน']].map(([f,n])=>`<button class="btn${look(h).form===f?' on':''}" type="button" data-form="${f}" aria-pressed="${look(h).form===f}">ร่าง: ${n}</button>`).join('');
 fb.querySelectorAll('[data-form]').forEach(b=>b.onclick=()=>{const f=b.dataset.form;rollHero.form=f;S.hero.look=Object.assign({},look(S.hero),{form:f});S.themeId=heroTheme(S.hero);render();});
 $('btnReroll').onclick=()=>{if(S.rerolled)return;S.rerolled=true;S.hero=rollBirth(S.bo);S.rvDone=false;VIS.star=0;render();};
 $('btnEnter').onclick=startRun;}
// a new hero: fresh line (gen 1), apprentice of a finished life (bo.heir), or a rebirth whose past karma tilts the rank roll (bo.kShift)
function rollBirth(bo){let h;
 if(bo&&isObj(bo.heir)){const P=bo.heir;h=rollHero();h.village=P.village||h.village;h.gen=(P.gen||1)+1;h.lin=P.lin;h.house=P.house||P.name;h.master=P.name;
  const k=clamp(Math.round((P.karma||0)*.25),-6,6),g=Math.min(600,Math.round((P.gold||0)*.3));h.inh={gold:g,pet:P.pet&&PETS[P.pet]?P.pet:null,k,from:P.name};h.gold+=g;if(k>=2)h.luk+=2;
  h.m0=birthM(h);h.proj=project(1,h.m0).med;h.hint=fuzzHint(h.proj);}
 else{h=rollHero({kShift:bo?bo.kShift:0});h.gen=1;h.lin=newLinId();h.house=h.name;if(bo&&isObj(bo.prev))h.prev=bo.prev;}
 return h;}
function startRun(){clearTimeout(S.rvT);VIS.star=0;S.R=newRun(S.hero);const R=S.R;R.xseen=loadSeen();S.runId=Date.now();S.t0=Date.now();snap=null;
 S.themeId=heroTheme(S.hero)||S.themeId||'';R.theme=S.themeId;
 // cohort: 3-4 heroes rolled the same way enter with you; their whole lives are simulated now with the same hazard table and AI
 R.coh=[];for(let i=0,n=ri(3,4);i<n;i++){const ch=rollHero(),L=autoLife(ch);poolAdd(L);R.coh.push({n:ch.name,rk:RANKS[ch.rank].k,cn:CLASSES[ch.cls].n,f:L.won?100:L.floor,won:L.won,cause:L.won?'พิชิตยอดหอคอย':L.cause,ck:L.ck||''});}
 const o=mkOut();say(R,o,`${S.hero.name} ก้าวเข้าสู่หอคอยโชคชะตา`,'lv');
 say(R,o,`เพื่อนรุ่นเดียวกันอีก ${R.coh.length} คนเข้าหอมาพร้อมคุณ: ${R.coh.map(c=>c.n).join(', ')}`,'info');
 if(R.pets.length&&S.hero.inh)say(R,o,`${PETS[R.pets[0]].n}ของอาจารย์${S.hero.inh.from}เดินตามเข้ามาด้วย`,'good');
 mileTick(R,o);
 S.frame={f:1,tag:'ชั้น 1 · ทางเข้า',title:'ประตูหอคอยเปิดออก',text:'บันไดหินวนขึ้นไปจนลับตา ไม่มีใครรู้ว่าตัวเองจะไปได้ถึงไหน',msgs:o.msgs};
 S.phase='flow';VIS.walk0=performance.now();VIS.show=null;music(0,1);render();if(o.mile)showMile(o.mile);ach('lineage',{gen:S.hero.gen||1});schedule(floorMs());}
const floorMs=()=>BASE_MS/S.speed;
function schedule(ms){clearTimeout(S.tm);S.tmAt=performance.now()+ms;S.tmDur=ms;S.tm=setTimeout(tick,ms);revealArm();}
// speed change mid-floor: keep the fraction already shown, rescale what is left
function rescale(k){if(S.phase!=='flow'||S.paused||!S.tmAt)return;const left=Math.max(200,(S.tmAt-performance.now())*k);clearTimeout(S.tm);S.tmDur*=k;S.tmAt=performance.now()+left;S.tm=setTimeout(tick,left);revealArm();}
// "next floor" countdown bar above the scene: flow phase only (decisions show their own bar), wall-clock based
function revealArm(){updNext();}
function updNext(){const box=$('nextBox');if(!box||!S)return;const on=S.phase==='flow'&&!!S.tmAt;box.hidden=!on;if(!on)return;
 const dur=Math.max(1,S.tmDur||1),left=S.paused?(S.pauseLeft||0):Math.max(0,S.tmAt-performance.now());
 $('nextBar').style.width=clamp(left/dur*100,0,100)+'%';$('nextTxt').textContent=`${S.paused?'หยุดอยู่ · ':''}ชั้นถัดไปใน ${(left/1000).toFixed(1)} วิ`;}
setInterval(updNext,100);
let fxT=[];function clearFx(){fxT.forEach(clearTimeout);fxT=[];}
function evFrame(f,ev){const b=BIOMES[biome(f)];
 if(ev.kind==='mon')return{tag:`ชั้น ${f} · ${b} · มอนสเตอร์`,title:ev.en.n,text:'',vis:{t:'en',en:ev.en}};
 if(ev.kind==='ev'){const T=EVENTS[ev.ti];return{tag:`ชั้น ${f} · ${b} · เหตุการณ์`,title:T.t,text:T.x,vis:{t:'prop',pr:T.pr}};}
 if(ev.kind==='pet')return{tag:`ชั้น ${f} · ${b}`,title:PETS[ev.pet].n,text:PETS[ev.pet].x,vis:{t:'pet',p:ev.pet}};
 if(ev.kind==='comp')return{tag:`ชั้น ${f} · ${b}`,title:ev.comp.n,text:'',vis:{t:'comp',cls:ev.comp.cls}};
 return{tag:`ชั้น ${f}`,title:'',text:'',vis:null};}
// quick hit animation for auto-resolved fights (inside one floor tick)
function animFight(cb,dur){clearFx();if(RM||!cb||!cb.ev.length)return;const E=cb.ev,n=Math.min(8,E.length),st=dur/(n+1),base=380/Math.max(1,S.speed>2?2:1);
 for(let k=0;k<n;k++){const e=E[Math.floor(k*(E.length-1)/Math.max(1,n-1))];fxT.push(setTimeout(()=>{const t=performance.now();if(e.d&&k<4)AUDIO.sfx('hit');
  if(e.t==='e'){VIS.hf=t+120;VIS.shake=t+100;VIS.nums.push({s:'-'+Math.round(e.d),x:52,y:82,c:'#ff6a5a',t0:t});}
  else if(e.d){VIS.ef=t+120;VIS.nums.push({s:(e.cr?'!':'')+Math.round(e.d),x:cb.en.boss?134:136,y:cb.en.boss?68:80,c:e.cr||e.t==='skill'?'#ffd04a':'#ffffff',t0:t});}},base+k*st));}
 if(cb.win)fxT.push(setTimeout(()=>{VIS.edead=true;},base+n*st));}
function tick(){if(!S||S.phase!=='flow'||S.paused)return;const R=S.R,f=R.floor,g0=R.h.gold;clearFx();S.tmAt=0;VIS.edead=false;
 const P=planFloor(R);
 if(P.type==='death'){const p=R.lastP,out=deathTick(R);S.frame={f,tag:`ชั้น ${f} · ชะตาขาด`,title:'ถึงฆาตแล้ว',text:R.cause,msgs:[{t:`ชะตาทอยที่ชั้นนี้ โอกาสตาย ${(p*100).toFixed(1)}%`,c:'lv'}]};VIS.show=out.vis;goDying();return;}
 if(P.type==='key'){openKey(P.K);return;}
 let out,fr,slow=1;
 if(P.type==='drama'){R.lastDramaId=P.D.id;out=dramaTick(R,P.D);AUDIO.sfx('boss');
  S.frame={f,tag:`ชั้น ${f} · ⚡ ชั้นพลิกผัน`,title:P.D.n,text:'',msgs:out.msgs,drama:1};if(out.mile)showMile(out.mile);S.pendCoins=Math.max(0,R.h.gold-g0);VIS.walk0=performance.now();
  if(out.combat){S.cb={en:out.combat.en,ev:out.combat.ev,i:0,hp:out.combat.startHp,mhp:out.combat.mhp,ehp:out.combat.en.mhp,lines:[],win:out.combat.win};VIS.show={t:'en',en:out.combat.en};S.phase='combat';render();playCombat();return;}
  VIS.show=P.D.id==='vault'?{t:'prop',pr:'chest'}:P.D.id==='meteor'?{t:'prop',pr:'star'}:null;if(out.shake)VIS.shake=performance.now()+700;afterKey();return;}
 if(P.type==='autokey'&&P.how){quickKey(P);return;}
 if(P.type==='autokey'){out=applyKey(R,P.K,P.K.ai,true);fr={tag:P.K.tag,title:P.K.type==='shop'?'ศาลพักใจ ⛩':P.K.title,text:P.K.type==='boss'?`ถอยเหมือนครั้งก่อน: "${P.K.ch[P.K.ai].t}"`:'',vis:P.K.vis};slow=1.3;
  if(P.K.type==='shop'){const inc=Math.max(3,(R.gIn||0)/Math.max(1,R.floor-1));fr.shop={inc,L:shopList(R).filter(x=>x.id!=='heal').map(x=>({n:x.n,cost:x.cost,ok:R.h.gold>=x.cost}))};}}
 else if(P.type==='quiet'){out=quietTick(R,P.n);fr={tag:`ชั้น ${out.f0}–${out.f0+out.quietN-1} · ช่วงสงบ`,title:'ทางเดินเงียบสงบ',text:'',vis:out.vis||null,qb:out.qb};slow=1.6;}
 else if(P.type==='farm'){out=farmTick(R);fr={tag:`ชั้น ${f} · ตั้งหลัก`,title:'ฟาร์มเก็บเวล',text:'',vis:out.combat?{t:'en',en:out.combat.en}:null};}
 else{out=autoTick(R,P.ev);fr=evFrame(f,P.ev);}
 S.frame=Object.assign(fr,{f,msgs:out.msgs});VIS.show=fr.vis;VIS.walk0=performance.now();
 if(out.combat)animFight(out.combat,Math.min(floorMs()*.55,6000));
 const gd=R.h.gold-g0;if(gd>0&&!RM)setTimeout(()=>coinBurst(Math.max(3,Math.round(gd/8))),RM?0:420);
 if(P.ev&&P.ev.kind==='ev'&&EVENTS[P.ev.ti].pr==='chest')AUDIO.sfx('chest');if(R.floor>f+1)AUDIO.sfx('warp');
 music(biome(R.floor),R.floor);if(out.mile)showMile(out.mile);render();
 if(!R.alive){goDying();return;}
 schedule(floorMs()*slow);}
// time-skip panel: net gold and HP per skipped floor (red when negative)
function qbHTML(qb){if(!qb||qb.length<2)return'';const mg=Math.max(1,...qb.map(x=>Math.abs(x.g))),mh=Math.max(1,...qb.map(x=>Math.abs(x.hp)));
 const row=(k,m,lab)=>`<div class="qbr"><span class="ql">${lab}</span><div class="qbars">${qb.map(x=>{const v=x[k],hh=Math.max(2,Math.round(Math.abs(v)/m*18));const bar=`<i style="height:${hh}px"></i>`;return`<span title="ชั้น ${x.f}: ${v>=0?'+':''}${v}"><b class="up">${v>0?bar:''}</b><b class="dn">${v<0?bar:''}</b></span>`;}).join('')}</div></div>`;
 return`<div class="qb" aria-label="สรุปช่วงที่ข้ามไป">${row('g',mg,'ทอง')}${row('hp',mh,'HP')}<div class="qbf"><span>${qb[0].f}</span><span>${qb[qb.length-1].f}</span></div></div>`;}
function shopHTML(sh){if(!sh)return'';return`<div class="shopl">${sh.L.map(x=>x.ok?`<span class="ok">${esc(x.n)} <b class="px">${fmt(x.cost)}</b></span>`:`<span class="lk" data-tip="income">🔒 ${esc(x.n)} <b class="px">${fmt(x.cost)}</b> ≈${Math.max(1,Math.round(x.cost/sh.inc))} ชั้นของรายได้</span>`).join('')}</div>`;}
function renderFlow(){const fr=S.frame||{msgs:[]};
 card.innerHTML=`<div class="tag${fr.drama?' drama':''}">${esc(fr.tag||'')}</div><h3>${esc(fr.title||'')}</h3>${fr.text?`<p>${esc(fr.text)}</p>`:''}${qbHTML(fr.qb)}${shopHTML(fr.shop)}
 <ul class="msgs">${fr.msgs.map(m=>`<li class="${m.c}">${esc(m.t)}</li>`).join('')||'<li class="dim">ชั้นนี้เงียบสงบ</li>'}</ul>
 <div class="flowst">${S.paused?'หยุดไว้ก่อน กด Space หรือปุ่ม ▶ เพื่อเดินต่อ':'ชะตากำลังพาเดินขึ้นไป…'}</div>`;}
// ---- key moments ----
let cdI=null;
function openKey(K){const R=S.R;S.K=K;S.phase='decide';S.decMs=decMs(K);S.left=S.decMs;VIS.show=K.vis;VIS.walk0=0;VIS.edead=false;
 music(biome(R.floor),R.floor);if(K.vis&&K.type!=='boss'&&K.vis.vr===undefined)K.vis.vr=shash(R.h.name+'|'+K.tid)%3;
 if(!sting(K.type==='boss'||K.rar==='l'?'boss':'key'))AUDIO.sfx(K.type==='boss'||K.rar==='l'?'boss':'levelup');render();
 // wall-clock countdown (a throttled background tab must not stretch the 15 s)
 clearInterval(cdI);S.cdLast=performance.now();cdI=setInterval(()=>{if(S.phase!=='decide'){clearInterval(cdI);return;}const now=performance.now(),dt=now-S.cdLast;S.cdLast=now;if(S.paused)return;S.left-=dt;updCd();if(S.left<=0){clearInterval(cdI);choose(S.K.pick,true);}},100);}
function updCd(){const b=$('cdBar'),t=$('cdTxt');if(!b)return;const p=clamp(S.left/S.decMs,0,1);b.style.width=(p*100)+'%';b.classList.toggle('low',S.left<=3000);
 t.textContent=S.paused?'หยุดเวลาไว้':`เหลือเวลา ${Math.ceil(S.left/1000)} วินาที`;}
function renderDecide(){const K=S.K,R=S.R;
 const vs=K.vs?`<div class="vs"><div class="side">พลังของคุณ<br><b>${fmt(heroPower(R))}</b></div><div class="px" style="color:var(--ember)">VS</div><div class="side">พลังศัตรู<br><b>${fmt(power(K.ev.en.atk,K.ev.en.def,K.ev.en.mhp))}</b></div></div>`:'';
 const rt=K.rar==='l'?'<span class="rar l">★ ระดับตำนาน</span>':K.rar==='r'?'<span class="rar r">◆ หายาก</span>':'';
 card.innerHTML=`<div class="tag keytag">⚑ จุดเปลี่ยนชะตา · ${esc(K.tag)} ${rt}</div><h3>${esc(K.title)}</h3><p>${esc(K.text)}</p>${vs}
 <div class="cd" role="timer" aria-label="เวลาตัดสินใจ"><i id="cdBar"></i></div><div class="cdl" id="cdTxt"></div>
 <div class="chs">${K.ch.map((c,i)=>`<button class="ch${i===K.pick?' ai':''}" data-k="${i+1}" ${c.dis?'disabled':''}><span class="k">${i+1}</span><span><span class="t">${esc(c.t)}</span><span class="s">${partsHTML(c.P)}</span>${i===K.pick?`<span class="aitag">ถ้าหมดเวลา ${esc(R.h.name)} (${esc(PERS[R.h.pers].n)}) จะเลือกข้อนี้</span>`:''}</span></button>`).join('')}</div>`;
 card.querySelectorAll('button.ch').forEach((b,i)=>b.addEventListener('click',()=>choose(i,false)));card.classList.toggle('legend',K.rar==='l');updCd();}
function choose(i,timeout){if(S.phase!=='decide')return;const K=S.K,R=S.R,f=R.floor;if(!K.ch[i]||K.ch[i].dis)return;clearInterval(cdI);
 const g0=R.h.gold;const out=applyKey(R,K,i);if(!out)return;if(timeout)R.timeouts++;
 showOutcome(K,i,out,{t:timeout?`หมดเวลา ${R.h.name} (${PERS[R.h.pers].n}) เลือกเอง: "${K.ch[i].t}"`:`คุณเลือก "${K.ch[i].t}"`,c:timeout?'lv':'info'},g0,false,f);}
// SAME_WAY / PLAIN: answer without stopping the clock, then show the outcome like a normal choice
function quickKey(P){const R=S.R,K=P.K,i=P.i,g0=R.h.gold,f=R.floor;S.K=K;VIS.show=K.vis;const out=applyKey(R,K,i,P.how);if(!out){S.phase='flow';schedule(floorMs());return;}
 showOutcome(K,i,out,{t:P.how==='same'?`ตอบแบบเดิม: "${K.ch[i].t}"`:`ทางนี้ชัดอยู่แล้ว: "${K.ch[i].t}"`,c:'info'},g0,true,f);}
function showOutcome(K,i,out,lead,g0,quick,f){const R=S.R;if(out.mile)showMile(out.mile);
 if(K.type==='boss'&&i===0&&out.combat&&out.combat.win)ach('boss_win',{floor:f,boss:K.ev.en.id});
 if(out.combat&&out.combat.en&&out.combat.en.id==='mimic')ach('mimic',{won:!!out.combat.win});
 if(K.rar==='l')ach('legend',{id:K.type==='arc'?K.tid:K.type});if(K.type==='omen')ach('omen',{});
 R.log.unshift({f,t:lead.t,c:lead.c});
 S.frame={f,tag:(quick?'↺ ':'')+K.tag,title:K.title,text:'',msgs:[lead,...out.msgs]};
 if(out.chest||(K.ev&&K.ev.kind==='ev'&&EVENTS[K.ev.ti].pr==='chest'))AUDIO.sfx('chest');if(K.type==='boss'&&i===1)AUDIO.sfx('warp');
 S.pendCoins=Math.max(0,R.h.gold-g0);
 if(out.combat){S.cb={en:out.combat.en,ev:out.combat.ev,i:0,hp:out.combat.startHp,mhp:out.combat.mhp,ehp:out.combat.en.mhp,lines:[],win:out.combat.win};VIS.show={t:'en',en:out.combat.en};S.phase='combat';render();playCombat();}
 else afterKey();}
function afterKey(){const R=S.R;S.K=null;S.tmAt=0;S.cb=null;if(S.pendCoins>0)coinBurst(Math.max(3,Math.round(S.pendCoins/8)));S.pendCoins=0;
 if(!R.alive){if(R.won){sting('win');S.phase='end';S.saved=false;render();return;}R.death=R.death||'boss';S.frame.title='ถึงฆาตแล้ว';S.frame.text=R.cause;goDying();return;}
 S.phase='flow';VIS.walk0=performance.now();render();schedule(floorMs());}
let cbTimer=null;
function cbLine(e,en){const n=Math.round(e.d||0);
 if(e.t==='h')return(e.cr?'คริติคอล! ':'')+`คุณโจมตี ${n}`;if(e.t==='skill')return`ใช้สกิล! ${n} ดาเมจ`;if(e.t==='heal')return'สวดรักษาตัวเอง';if(e.t==='c')return`${e.n} โจมตี ${n}`;if(e.t==='p')return`สัตว์เลี้ยงกัด ${n}`;if(e.t==='miss')return`หลบการโจมตีได้!`;return`${en.n} โจมตี ${n}`;}
function playCombat(){clearTimeout(cbTimer);const cb=S.cb;if(!cb)return;const step=RM?0:clamp(2600/Math.max(1,cb.ev.length),60,240)/Math.sqrt(S.speed);
 const tick2=()=>{if(S.phase!=='combat'||S.cb!==cb)return;if(cb.i>=cb.ev.length){finishCombat();return;}
  const e=cb.ev[cb.i++];if(e.d)AUDIO.sfx('hit');cb.hp=e.hp;cb.ehp=e.ehp;cb.lines.unshift(cbLine(e,cb.en));const t=performance.now();
  if(e.t==='e'){VIS.hf=t+120;VIS.shake=t+100;VIS.nums.push({s:'-'+Math.round(e.d),x:52,y:82,c:'#ff6a5a',t0:t});}
  else if(e.d){VIS.ef=t+120;VIS.nums.push({s:(e.cr?'!':'')+Math.round(e.d),x:cb.en.boss?134:136,y:cb.en.boss?68:80,c:e.cr||e.t==='skill'?'#ffd04a':'#ffffff',t0:t});}
  updCombatUI();cbTimer=setTimeout(tick2,step);};
 if(RM){finishCombat();return;}tick2();}
function finishCombat(){clearTimeout(cbTimer);const cb=S.cb;if(cb&&cb.win)VIS.edead=true;afterKey();}
function renderCombat(){const cb=S.cb;card.innerHTML=`<div class="tag">ชั้น ${S.R.floor} · การต่อสู้</div><h3>ปะทะ ${esc(cb.en.n)}</h3>
 <div class="vs"><div class="side">คุณ <span class="px" id="cbH"></span><div class="hpbar"><i id="cbHB"></i></div></div><div class="px" style="color:var(--ember)">VS</div><div class="side">${esc(cb.en.n)} <span class="px" id="cbE"></span><div class="hpbar e"><i id="cbEB"></i></div></div></div>
 <ol class="blog" id="cbLog"></ol><div class="acts"><button class="btn pri" id="btnSkip" data-enter>ข้ามแอนิเมชัน<span class="kb">[Enter]</span></button></div>`;
 $('btnSkip').onclick=()=>{cb.i=cb.ev.length;finishCombat();};updCombatUI();}
function updCombatUI(){const cb=S.cb;if(!cb||!$('cbH'))return;$('cbH').textContent=`${Math.ceil(Math.max(0,cb.hp))}/${Math.round(cb.mhp)}`;$('cbHB').style.width=clamp(cb.hp/cb.mhp*100,0,100)+'%';
 $('cbE').textContent=`${Math.ceil(Math.max(0,cb.ehp))}`;$('cbEB').style.width=clamp(cb.ehp/cb.en.mhp*100,0,100)+'%';$('cbLog').innerHTML=cb.lines.slice(0,5).map(l=>`<li>${esc(l)}</li>`).join('');
 $('v-hp').textContent=`${Math.ceil(Math.max(0,cb.hp))}/${Math.ceil(S.R.h.mhp)}`;$('b-hp').style.width=clamp(cb.hp/S.R.h.mhp*100,0,100)+'%';}
// ---- death ----
let dyT=null;
function goDying(){clearTimeout(S.tm);clearFx();S.phase='dying';finalizeRun();VIS.dieAt=performance.now();if(!sting('death'))AUDIO.sfx('death');render();clearTimeout(dyT);dyT=setTimeout(toEnd,RM?1500:Math.max(1600,3200/S.speed));}
function toEnd(){clearTimeout(dyT);if(S.phase!=='dying')return;S.phase='end';S.saved=false;render();}
function renderDying(){const fr=S.frame||{};card.innerHTML=`<div class="tag" style="color:var(--bad)">${esc(fr.tag||`ชั้น ${S.R.floor}`)}</div><h3>ถึงฆาตแล้ว</h3><p>${esc(S.R.cause)}</p>
 <ul class="msgs">${(fr.msgs||[]).slice(0,6).map(m=>`<li class="${m.c}">${esc(m.t)}</li>`).join('')}</ul>
 <div class="acts"><button class="btn pri" id="btnGrave" data-enter>ไปที่แผ่นจารึก<span class="kb">[Enter]</span></button></div>`;$('btnGrave').onclick=toEnd;}
const MAPC={fight:'#c0503a',treasure:'#e8b840',trap:'#8a4ab0',good:'#5fc06a',evil:'#6a1a2a',pet:'#ea9bbd',comp:'#4fa6e0',boss:'#ff8a2a',warp:'#7ae8f0',flee:'#8a9aa0',calm:'#4a5a60',bad:'#8a6a4a',farm:'#2a6a5a',death:'#f1e7d0'};
const MAPN={fight:'ต่อสู้',treasure:'สมบัติ',trap:'กับดัก/บาดเจ็บ',good:'กรรมดี',evil:'กรรมชั่ว',pet:'สัตว์เลี้ยง',comp:'เพื่อน',boss:'บอส',warp:'วาร์ป',flee:'หนี',calm:'สงบ',bad:'โชคร้าย/ลางร้าย',death:'จุดจบ'};
function judge(k){for(const j of JUDGE)if(k>=j.min)return j.t;return JUDGE[JUDGE.length-1].t;}
function fateLine(R){const gm=R.mN?Math.exp(R.mLog/R.mN):1,sh=R.fateShift;
 const a=`ทอยชะตามา ${R.mN} ชั้น ตัวคูณความเสี่ยงเฉลี่ย ×${gm.toFixed(2)} (คนทั่วไป ×1.00)${R.pMaxF?` · ชั้นที่เฉียดที่สุดคือชั้น ${R.pMaxF} (โอกาสตาย ${(R.pMax*100).toFixed(1)}%)`:''}`;
 const b=Math.abs(sh)>=1?` · การตัดสินใจของคุณ${sh>0?'ต่อชะตา':'ตัดชะตา'}ไปราว ${Math.round(Math.abs(sh))} ชั้น`:'';
 if(R.won)return`${a}${b} และรอดมาได้ทุกครั้ง`;
 if(R.death==='boss')return`${a}${b} · ชะตายังไม่ทันเอาตัวไป คุณเลือกสู้บอสเองแล้วแพ้`;
 return a+b;}
// ---- karma ledger (revealed only at the end) ----
const FRUIT=['มีคนตั้งศาลเล็กๆ ไว้ให้ที่ชั้น {f}','คนที่คุณช่วยไว้ตั้งชื่อลูกตามคุณ','นักผจญภัยรุ่นหลังเล่าเรื่องนี้ต่อกันในโรงเตี๊ยม','มีดอกไม้สดวางอยู่หน้าหลุมทุกเช้า','ชื่อคุณถูกสลักไว้บนขั้นบันไดชั้น {f}'];
const ERUPT=['มีคนมาขุดหลุมศพเพื่อทวงของคืน','เรื่องนี้ถูกเล่าต่อจนชื่อคุณเสียไปทั้งหมู่บ้าน','ญาติของเขาตามมาสาปแช่งถึงหน้าหลุม','ป้ายหลุมศพถูกพ่นสีทับในคืนเดียว','วิญญาณที่ชั้น {f} ยังไม่ยอมไปไหน'];
function ledgerRoll(R){const K=R.karma;let rows=R.ledger.filter(x=>x.d).map((x,i)=>({f:x.f,d:x.d,t:x.t,i}));const more=Math.max(0,rows.length-14);
 if(more)rows=rows.sort((a,b)=>Math.abs(b.d)-Math.abs(a.d)).slice(0,14).sort((a,b)=>a.i-b.i);
 let fr=0,er=0,pts=0;
 rows.forEach(x=>{const good=x.d>0,p=good?clamp(.4+K*.008+x.d*.04,.15,.85):clamp(.4-K*.008-x.d*.04,.15,.85);x.hit=rnd()<p;
  if(x.hit){const pt=Math.min(6,2+Math.abs(x.d));x.pt=good?pt:-pt;pts+=x.pt;if(good)fr++;else er++;x.fx=pick(good?FRUIT:ERUPT).replace('{f}',x.f);}
  x.lab=good?(x.hit?'ส่งผล':'ยังไม่ส่งผล'):(x.hit?'ปะทุ':'ยังไม่ปะทุ');});
 const fl=R.won?100:R.floor,base=fl+R.bosses*3+(R.won?30:0)+Math.round(R.h.lv/2);
 return{rows,more,fr,er,pts,base,score:Math.max(0,base+pts)};}
function ledgerHTML(R){const L=S.lg,st=RM?0:.25,T=S.title;
 const fin=L.pts>=6?`${T.t} · มีบุญหนุนนำ`:L.pts<=-6?`${T.t} · กรรมตามทัน`:T.t;
 const sum=`<div class="lgsum" style="animation-delay:${(L.rows.length*st+.25).toFixed(2)}s">${L.rows.length?`ส่งผล <b>${L.fr}</b> · ปะทุ <b>${L.er}</b> · คะแนนจากกรรม <b class="${L.pts>=0?'g':'b'}">${L.pts>=0?'+':''}${L.pts}</b><br>`:''}
  คะแนนชีวิต <b class="px">${L.base}</b>${L.pts?` → <b class="px big">${L.score}</b>`:''}<br>ฉายาสุดท้าย: <b${T.gold?' style="color:var(--gold)"':''}>${esc(fin)}</b></div>`;
 if(!L.rows.length)return`<h2>บัญชีกรรม</h2><p class="dim" style="font-size:13px;margin:0 0 6px">บัญชีว่างเปล่า ชาตินี้ไม่ได้ทำบุญหรือบาปที่ใครจะจำได้</p>${sum}`;
 return`<h2>บัญชีกรรม</h2><p class="dim" style="font-size:12px;margin:0 0 6px">เรื่องดีและเรื่องร้ายที่คุณทำไว้ในหอ เรียงตามชั้น</p>
 <ol class="ledger">${L.rows.map((x,i)=>`<li style="animation-delay:${(i*st).toFixed(2)}s"><span class="px">${x.f}F</span><span><span class="${x.d>0?'kk':'b'}">${x.d>0?'✦':'✧'} ${esc(x.t)}</span>${x.fx?`<br><span class="x">${esc(x.fx)}</span>`:''}</span><span class="o ${x.hit?(x.d>0?'fr':'er'):'no'}" style="animation-delay:${(i*st+.15).toFixed(2)}s">${x.lab}${x.pt?` ${x.pt>0?'+':''}${x.pt}`:''}</span></li>`).join('')}</ol>
 ${L.more?`<p class="dim" style="font-size:12px;margin:0 0 6px">ยังมีเรื่องเล็กๆ อีก ${L.more} เรื่องที่ไม่มีใครจำ</p>`:''}${sum}`;}
// death-floor distribution of 2,000 heroes rolled through the same hazard table (birth multiplier only, no bosses)
function hazardSample(n){const a=[];for(let i=0;i<n;i++){const h=rollHero();let f=1;while(f<100&&rnd()>=pRoll(f,h.m0))f++;a.push(f);}return a;}
// eulogy from the stance history (one letter per rolled floor) plus the deeds of the run and how it ended
function eulogy(R){const H=R.stH||'',n=H.length,h=R.h,fl=R.won?100:R.floor,cnt=c=>H.split(c).length-1;
 const sh={a:cnt('a')/Math.max(1,n),d:cnt('d')/Math.max(1,n),l:cnt('l')/Math.max(1,n),h:cnt('h')/Math.max(1,n)};
 let who;if(n<8)who='คนที่ยังไม่ทันได้รู้จักตัวเอง';else if(sh.a>=.6)who='นักรบผู้ไม่เคยถอย';else if(sh.d>=.6)who='คนที่ระวังทุกย่างก้าว';
 else if(sh.l>=.6)who='นักล่าสมบัติที่ไม่เคยกลับมือเปล่า';else if(sh.h>=.6)who='คนที่ไม่เคยทิ้งใครไว้ข้างหลัง';
 else if((R.stCh||0)>=6)who='คนที่ปรับตัวไปตามทางเสมอ';else who='นักเดินทางที่เดินช้าแต่มั่นคง';
 let deed;if(R.bosses>=5)deed=`ล้มบอสมาได้ ${R.bosses} ตัว`;else if(R.karma>=15)deed='ทำบุญไว้มากจนคนในหอยังพูดถึง';else if(R.karma<=-15)deed='ทิ้งเรื่องร้ายไว้ให้คนข้างหลังเล่าต่อ';
 else if(R.kills>=40)deed=`ปราบมอนสเตอร์ไป ${R.kills} ตัว`;else if(R.pets.length)deed=`มี${PETS[R.pets[0]].n}อยู่ข้างกายจนวันสุดท้าย`;else deed=`เดินขึ้นมาได้ ${fl} ชั้น`;
 const last=R.won?'และได้ยืนบนยอดหอในวันสุดท้ายของเรื่องนี้':SUDDEN[R.ck]?'จากไปเร็วจนไม่มีใครทันได้ร่ำลา':'ร่างกายทรุดลงทีละน้อยก่อนจะหยุดเดิน';
 return{who,line:`${deed} ${last}`};}
function renderEnd(){const R=S.R,h=R.h,C=CLASSES[h.cls],won=R.won,fl=won?100:R.floor;clearTimeout(S.tm);clearInterval(cdI);
 if(!S.saved){S.fresh=saveSeen(R);S.title=runTitle(R);S.mont=montage(R);S.lg=ledgerRoll(R);S.eu=eulogy(R);}
 if(!S.saved){S.saved=true;finalizeRun();}
 if(!S.cmp)S.cmp=hazardSample(2000);
 const cells=R.map.map((m,i)=>`<span class="${(i+1)%10===0?'boss ':''}${R.farmed[i]?'farm':''}" style="${m?`background:${MAPC[m]}`:i<fl?'background:#2a3a40':''}" title="ชั้น ${i+1}${m?' · '+(MAPN[m]||'ฟาร์ม'):''}${R.farmed[i]?' · ฟาร์ม '+R.farmed[i]+' ครั้ง':''}"></span>`).join('');
 const a=S.cmp,below=a.filter(x=>x<fl).length,eq=a.filter(x=>x===fl).length,pct=Math.round((below+eq/2)/a.length*100);
 const bins=Array(10).fill(0);a.forEach(x=>bins[clamp(Math.floor((x-1)/10),0,9)]++);const mb=Math.max(...bins),my=clamp(Math.floor((fl-1)/10),0,9);
 const med=[...a].sort((x,y)=>x-y)[a.length>>1],top=(a.filter(x=>x>=100).length/a.length*100).toFixed(1);
 const cmpH=`<p style="font-size:14px;margin:4px 0">คุณอยู่ได้นานกว่า <b class="px" style="color:var(--gold);font-size:18px">${pct}%</b> ของนักผจญภัย · ครึ่งหนึ่งตายก่อนชั้น ${med} · รอดถึงชั้น 100 แค่ ${top}%</p>
  <div class="hist">${bins.map((v,i)=>`<div class="c ${i===my?'me':''}">${i===my?'<span class="me-tag">คุณ</span>':''}<i style="height:${v/mb*100}%"></i></div>`).join('')}</div>
  <div class="hlab">${bins.map((v,i)=>`<span>${i*10+1}</span>`).join('')}</div>`;
 // death certificate
 const pool=loadPool().r,avg=pool.length>=50?pool.reduce((s2,x)=>s2+x[0],0)/pool.length:a.reduce((s2,x)=>s2+x,0)/a.length,cs=won?null:causeStat(fl,R.ck);
 const coh=R.coh||[],beat=coh.filter(c=>!c.won&&c.f<fl).length,diff=Math.round(fl-avg);
 const certH=`<div class="dcert" data-tip="cert"><div class="dh">${won?'ใบประกาศผู้พิชิตหอ':'ใบมรณบัตร'}</div>
  <dl class="kv"><dt>ชื่อ</dt><dd>${esc(h.name)} · รุ่นที่ ${h.gen||1} แห่งสาย${esc(h.house||h.name)}</dd><dt>${won?'ชั้นสุดท้าย':'เสียชีวิตที่'}</dt><dd class="px">ชั้น ${fl}</dd>
  <dt>${won?'ผลลัพธ์':'สาเหตุ'}</dt><dd>${esc(won?'พิชิตยอดหอคอย':R.cause)}${won?'':` <span class="dim">(${esc(CAUSEN[R.ck]||'ชะตาขาด')})</span>`}</dd>
  ${won?'':`<dt>พบบ่อยแค่ไหน</dt><dd>${cs?`สาเหตุนี้พบใน${cs.band} ราว <b class="px">${cs.p<.01?'ไม่ถึง 1':Math.round(cs.p*100)}%</b> ของการตาย <span class="dim">(จากการจำลอง ${fmt(cs.N)} ชีวิต)</span>`:'ยังจำลองไม่พอจะบอกได้'}</dd>`}
  <dt>อายุในหอ</dt><dd>${fl} ชั้น · ค่าเฉลี่ยราว ${Math.round(avg)} ชั้น (${diff>=0?`นานกว่า ${diff}`:`สั้นกว่า ${-diff}`} ชั้น)</dd>
  ${coh.length?`<dt>เพื่อนรุ่นเดียวกัน</dt><dd>${coh.length} คน · คุณไปได้ไกลกว่า ${beat} คน</dd>`:''}</dl>
  <div class="eu">「${esc(S.eu.who)}」 ${esc(S.eu.line)}</div></div>`;
 const cohH=coh.length?`<h2 data-tip="cohort">เพื่อนรุ่นเดียวกัน</h2><ol class="coh">${[...coh].sort((x,y)=>y.f-x.f).map(c=>`<li><span class="px">${c.rk}</span><span>${esc(c.n)} · ${esc(c.cn)}<br><span class="x">${esc(c.cause)}</span></span><span class="px">${c.won?'👑 ':''}${c.f}F</span></li>`).join('')}</ol>`:'';
 const share=!!(window.SHARE&&window.SHARE.open),lb=!!(window.LB&&window.LB.open);
 card.innerHTML=`<div class="epi"><div class="tag">${won?'ตำนานบทใหม่':'แผ่นจารึกหน้าหลุมศพ'}</div><div class="big">${won?'👑 ':'✝ '}${esc(h.name)}</div><div class="rtitle${S.title.gold?' gold':''}">ฉายา: ${esc(S.title.t)}</div>
 <dl class="kv"><dt>แรงค์/อาชีพ</dt><dd>${RANKS[h.rank].k} · ${C.n} (1 ใน ${fmt(h.odds)})</dd><dt>ชั้นที่ไปถึง</dt><dd class="px">${fl} / 100</dd><dt>เลเวล</dt><dd class="px">${h.lv}</dd>
 <dt>${won?'ผลลัพธ์':'สาเหตุการตาย'}</dt><dd>${esc(won?'พิชิตผู้กลืนดาราและยืนบนยอดหอคอย':R.cause)}</dd><dt>ดวงชะตา</dt><dd>${esc(fateLine(R))}</dd>
 <dt>จุดเปลี่ยน</dt><dd>${R.keys} ครั้ง${R.timeouts?` · ปล่อยให้นิสัย${esc(PERS[h.pers].n)}เลือกแทน ${R.timeouts} ครั้ง`:''}${R.sameN+R.plainN?` · ตอบไปเองโดยไม่ต้องหยุด ${R.sameN+R.plainN} ครั้ง`:''}</dd><dt>ทองที่ทิ้งไว้</dt><dd class="px">${fmt(h.gold)}</dd>
 <dt>ปาร์ตี้</dt><dd>${[...R.pets.map(p=>PETS[p].n),...R.comps.map(c=>c.n+' ('+clsName(c.cls)+')')].join(', ')||'เดินทางคนเดียว'}</dd>
 <dt>กรรม</dt><dd class="px" style="color:var(--karma)">${R.karma>0?'+':''}${R.karma} ${R.karma>=0?'กรรมดี':'กรรมชั่ว'}</dd></dl>
 <div class="judge">${judge(R.karma)}</div></div>
 ${certH}
 <div class="acts"><button class="btn pri" id="btnHeir" data-k="1" data-enter data-tip="lineage">สืบทอดโดยลูกศิษย์ ↗<span class="kb">[Enter]</span></button><button class="btn" id="btnReborn" data-k="2" data-tip="reborn">เกิดใหม่ ↻<span class="kb">[2]</span></button></div>
 <p class="dim" style="font-size:12px;margin:4px 0 10px">ลูกศิษย์ได้ทอง ${fmt(Math.min(600,Math.round(h.gold*.3)))}${R.pets.length?` กับ${esc(PETS[R.pets[0]].n)}`:''} และรับกรรมของคุณไปบางส่วน · เกิดใหม่ได้เริ่มสายใหม่ แต่กรรมชาตินี้จะติดไปกับดวงเกิดนิดหน่อย</p>
 ${share||lb?`<div class="acts" style="margin-top:0">${share?'<button class="btn" id="btnShare" type="button">📤 การ์ดสรุปชีวิต</button>':''}${lb?'<button class="btn" id="btnLB2" type="button">🏆 อันดับ & ความสำเร็จ</button>':''}</div>`:''}
 ${ledgerHTML(R)}
 ${S.mont.length?`<h2>ช่วงเวลาที่ยังจำได้</h2><ol class="mont">${S.mont.map(m=>`<li class="${m.rar}"><span class="px">${m.f}F</span><span><b>${esc(m.t)}</b> · เลือก "${esc(m.c)}"${m.res?`<br><span class="x">${esc(m.res)}</span>`:''}</span></li>`).join('')}</ol>`:''}
 ${cohH}
 <p class="dim" style="font-size:12px;margin:6px 0 10px">ดวงประจำชาติ: ${esc(omenOf(h).n)}${S.fresh?` · ชาตินี้เจอเรื่องที่ไม่เคยเจอมาก่อน ${S.fresh} เรื่อง`:''}</p>
 <h2>แผนที่การไต่หอ</h2><div class="grid100">${cells}</div>
 <div class="legend">${Object.keys(MAPN).map(k=>`<span><i style="background:${MAPC[k]}"></i>${MAPN[k]}</span>`).join('')}<span><i style="background:#2a6a5a"></i>จุดเขียว = ฟาร์ม</span></div>
 <h2 style="margin-top:12px">เทียบกับนักผจญภัย 2,000 คนที่ทอยชะตาจากตารางเดียวกัน</h2>${cmpH}`;
 const P={name:h.name,village:h.village,gen:h.gen||1,lin:h.lin,house:h.house||h.name,gold:h.gold,pet:R.pets[0]||null,karma:R.karma};
 $('btnHeir').onclick=()=>newBirth({heir:P});
 $('btnReborn').onclick=()=>newBirth({kShift:clamp(R.karma/5,-6,6),prev:{name:h.name}});
 const L=S.lg,LI=lookInfo(h);
 const sum={name:h.name,village:h.village,rankK:RANKS[h.rank].k,rankIdx:h.rank,rankCol:RANKS[h.rank].col,clsId:C.id,clsN:C.n,look:look(h),form:look(h).form,floor:fl,won,title:S.title.t,cause:won?'พิชิตยอดหอคอย':R.cause,
  odds:combOdds(h),pct,karma:R.karma,score:L.score,themeId:R.theme||S.themeId||'',gen:h.gen||1,pets:[...R.pets],comps:R.comps.map(c=>c.n),kills:R.kills,bosses:R.bosses,scars:R.scars,keyMoments:R.keys,timeouts:R.timeouts,
  stanceHist:R.stH||'',durationMs:S.t0?Date.now()-S.t0:0,date:Date.now(),lookName:LI.n};
 if(!S.sent){S.sent=true;try{window.ACH&&window.ACH.onRunEnd&&window.ACH.onRunEnd(sum);}catch(e){}try{window.LB&&window.LB.submit&&window.LB.submit(sum);}catch(e){}}
 const bs=$('btnShare');if(bs)bs.onclick=()=>{try{window.SHARE.open({name:sum.name,village:sum.village,rankK:sum.rankK,rankCol:sum.rankCol,clsId:sum.clsId,clsN:sum.clsN,look:sum.look,floor:fl,won,title:sum.title,cause:sum.cause,odds:sum.odds,pct,karma:R.karma,score:L.score,themeId:sum.themeId,gen:sum.gen,pets:sum.pets,date:Date.now()});}catch(e){}};
 const bl=$('btnLB2');if(bl)bl.onclick=()=>{try{window.LB.open();}catch(e){}};
 renderMemo();}
function newBirth(bo){clearSave();if(S){clearTimeout(S.tm);clearInterval(cdI);clearTimeout(dyT);clearTimeout(cbTimer);clearTimeout(S.rvT);}clearFx();music(0,0);
 const sp=S?S.speed:loadSpeed();bo=isObj(bo)?bo:null;S={phase:'birth',hero:rollBirth(bo),bo,rerolled:false,rvDone:false,R:null,K:null,cb:null,cmp:null,saved:false,runId:0,speed:sp,paused:false,tm:0,frame:null};
 snap=null;VIS.coins=[];VIS.show=null;VIS.star=0;render();}
function loadSpeed(){try{const v=+localStorage.getItem('tof-auto-speed');return SPEEDS.includes(v)?v:1;}catch(e){return 1;}}
function setSpeed(v){const k=S.speed/v;S.speed=v;try{localStorage.setItem('tof-auto-speed',String(v));}catch(e){}renderCtl();rescale(k);}
function togglePause(){if(!['flow','decide','combat'].includes(S.phase))return;S.paused=!S.paused;renderCtl();saveRun();
 if(S.phase==='flow'){if(S.paused){clearTimeout(S.tm);S.pauseLeft=Math.max(0,S.tmAt-performance.now());renderFlow();revealArm();}else{renderFlow();const l=S.pauseLeft||250;S.pauseLeft=0;S.tmAt=performance.now()+l;clearTimeout(S.tm);S.tm=setTimeout(tick,l);revealArm();}}else if(S.phase==='decide')updCd();}
$('btnPause').onclick=togglePause;
document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>setSpeed(+b.dataset.speed));
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key;
 if(/^[1-4]$/.test(k)){const b=card.querySelector(`button[data-k="${k}"]`);if(b&&!b.disabled){e.preventDefault();b.click();}}
 else if(k===' '||k==='Spacebar'){if(['flow','decide','combat'].includes(S.phase)){e.preventDefault();togglePause();}}
 else if(k==='Enter'){if(document.activeElement&&document.activeElement.tagName==='BUTTON'&&card.contains(document.activeElement))return;const b=card.querySelector('[data-enter]');if(b&&!b.disabled){e.preventDefault();b.click();}}});
document.querySelectorAll('canvas.ico').forEach(c=>{const s=ICONS[c.dataset.ico];if(s)c.getContext('2d').drawImage(sprCanvas(s,false,false,'i'+c.dataset.ico),0,0);});
// ---- audio wiring ----
let audioInit=false;
document.addEventListener('pointerdown',()=>{if(audioInit)return;audioInit=true;try{AUDIO.init();}catch(e){}},true);
card.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled)AUDIO.sfx('click');});
(function(){const b=$('btnMute');if(!b)return;const sync=()=>b.setAttribute('aria-pressed',AUDIO.muted?'true':'false');sync();
 b.addEventListener('click',()=>{if(!audioInit){audioInit=true;try{AUDIO.init();}catch(e){}}AUDIO.setMuted(!AUDIO.muted);sync();if(S&&S.R)music(biome(S.R.floor),S.R.floor);else music(0,0);});})();
renderMemo();if(!resumeRun())newBirth();requestAnimationFrame(loop);poolBg();
(function(){const b=$('btnLB');if(!b)return;const sync=()=>{b.hidden=!(window.LB&&window.LB.open);};sync();setTimeout(sync,1500);b.onclick=()=>{try{window.LB.open();}catch(e){}};})();
window.__auto={get S(){return S;},tick,choose,render};
})();
