// Tower of Fate — AUTO MODE "โหมดชะตากำหนด": the climb flows by itself, the player decides only at key moments.
// Sim region (SIM-START..SIM-END) is adapted from engine.js and runs headless (window.AUTO_SIM) when no DOM exists.
(function(){
'use strict';
const {RANKS,CLASSES,BIOMES,VILLAGES,NA,NB,COMPN,MONS,BOSSES,PETS,EVENTS,JUDGE}=window.CONTENT,DAYS=window.CONTENT.DAYS||[];
/*SIM-START*/
let rnd=Math.random;
const rr=(a,b)=>a+(b-a)*rnd(), pick=a=>a[Math.floor(rnd()*a.length)], clamp=(v,a,b)=>v<a?a:v>b?b:v, ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
function wIdx(ws){let s=0;for(const w of ws)s+=w;let r=rnd()*s;for(let i=0;i<ws.length;i++){r-=ws[i];if(r<0)return i;}return ws.length-1;}
function gauss(){let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
const BAL={mh0:38,mh1:4.2,mh2:0.03,ma0:9,ma1:0.62,ma2:0.0045,md0:3,md1:0.3,md2:0.002,bHp:1.6,bAtk:1.08,bDef:1.05,ex0:9,ex1:2.0,g0:4,g1:1.5,regen:0.03,gr:0.75,gp:0.7,fH:0.8,fA:0.85,fR:80};
const CLS_SUM=CLASSES.reduce((a,c)=>a+c.w,0);
const genName=()=>pick(NA)+pick(NB)+(rnd()<.4?pick(NB):'');
const PETK=Object.keys(PETS).filter(k=>!PETS[k].clan);
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
const ST_SP={atk:{merc:1.6,dragon:1.6,door:1.3,pit:1.4,bridge:1.3,hunter:1.3},def:{fountain:1.6,seer:1.3,healer:1.5,monk:1.4},loot:{mimic:1.8,gamble:1.6,starfall:1.3,peddler:1.5,snailrace:1.4,heist:1.4},help:{wounded:2.2,rpet:1.5,egg:1.4,cavein:1.8,lantern:1.6,snack:1.3}};
const PST={bold:'atk',careful:'def',greedy:'loot',kind:'help'};
// headless heroes (cohort, balance sims) switch to guarding when badly hurt, otherwise follow their personality
// ---- class paths (v2.4): acting like your class earns path points R.path (0-100); tiers at PATH_T give bonuses ----
const PATH_T=[20,50,80];
const PATH_TG={war:{fight:3,guard:4,dragon:2},mag:{study:6,curse:5},arc:{scout:6,hunt:5,sneak:3},pri:{help:4,pray:5},rog:{steal:5,trick:4,sneak:3},
 far:{tame:4,trade:2,forage:4,gamble:2,hunt:2},dra:{fight:4,dragon:6,guard:2},dsl:{hunt:5,dragon:6,fight:2},nec:{curse:5,steal:2,trick:3},ang:{help:4,pray:5,guard:3}};
const PATH_ST={war:'atk',dra:'atk',dsl:'atk',nec:'atk',ang:'help',mag:'def',arc:'def',pri:'help',rog:'loot',far:'loot'};
const PATHS={
 war:{n:'ทางเกียรติ',src:'สู้ซึ่งๆ หน้า ปกป้องคน ท้าดวล ล้มบอสโดยไม่อ้อม ท่าทีบุก',t:['ทหารหาญ','ขุนพล','วีรชนแห่งหอ'],b:['ATK +4%','ATK +8% · โดนตีแล้วมีโอกาสสวนกลับ','ATK +12% · สวนกลับบ่อยขึ้น']},
 mag:{n:'ทางคาถา',src:'อ่านตำรา แตะรูน ศึกษาของต้องสาป ท่าทีระวังตัว',t:['ศิษย์คาถา','ผู้ไขรูน','จอมปราชญ์'],b:['MP สูงสุด +5','MP สูงสุด +5 · ร่ายสกิลซ้ำได้ถ้า MP พอ','MP สูงสุด +5 · ตัวเลือกของต้องสาปพลาดน้อยลงครึ่งหนึ่ง']},
 arc:{n:'ทางพราน',src:'สำรวจ สะกดรอย ล่าสัตว์ หาทางลัด ท่าทีระวังตัว',t:['พรานป่า','ตาเหยี่ยว','เงาแห่งยอดไม้'],b:['ยิงชุดแรกก่อนศัตรูขยับ · โอกาสพลาดในตัวเลือกลดลง','ยิงชุดแรกแรงขึ้น · หลบเก่งขึ้น','ยิงชุดแรกแรงที่สุด · พลาดน้อยลงอีก']},
 pri:{n:'ทางศรัทธา',src:'ช่วยคน รักษา ทำบุญ สวด ให้อภัย ท่าทีช่วยเหลือ ทำชั่วแล้วแต้มลด',t:['ผู้สวดภาวนา','ผู้ถือแสง','นักบุญแห่งหอ'],b:['ฮีลแรงขึ้น · ฟื้น HP ทุกชั้นเพิ่ม','ฮีลตอน HP ต่ำกว่า 40% แทนตอนเปิดฉาก','ฮีลแรงที่สุด']},
 rog:{n:'ทางเงา',src:'ขโมย หลอก แอบ ย่อง ท่าทีหาของ',t:['ขโมยมือใหม่','มือไวมีชื่อ','เจ้าแห่งเงา'],b:['ทองจากเหตุการณ์ +12% · แทงจากเงาตอนเปิดฉาก','ทอง +24% · โดนซุ่มตีน้อยลง','ทอง +36% · ฉกทองกลางการต่อสู้']},
 far:{n:'ทางไร่นา',src:'เลี้ยงสัตว์ ต่อรองราคา เก็บของป่า เสี่ยงดวง ท่าทีหาของ',t:['ชาวนาหัวไว','เจ้าของไร่','เศรษฐีบ้านนา'],b:['สัตว์เลี้ยงช่วยตี · ศาลพักใจลด 8%','สัตว์เลี้ยงตีแรงขึ้น · ลด 16% · ช่วงสงบเก็บยาได้','สัตว์เลี้ยงตีแรงที่สุด · ลด 24%']},
 dra:{n:'ทางเลือดมังกร',src:'สู้ บุก ปกป้องคน เรื่องมังกร ท่าทีบุก',t:['ผู้สืบเลือด','ผู้ปลุกเลือด','มังกรในร่างคน'],b:['ดาเมจใส่บอส +6%','ดาเมจใส่บอส +12%','ดาเมจใส่บอส +18% · โดนบอสตีตายแล้วรอดได้ครั้งเดียว']},
 nec:{n:'ทางวิญญาณมืด',src:'แตะของต้องสาป หลอก ขโมย ทุกครั้งที่กรรมชั่วเพิ่ม',t:['ผู้ปลุกศพ','เจ้าแห่งสุสาน','ราชันย์ไร้ชีพ'],b:['โครงกระดูก 3 ตัว','โครงกระดูกตีแรงขึ้น','โครงกระดูก 4 ตัว · ดูดเลือดศัตรูมาเป็นของตัวเอง']},
 ang:{n:'ทางสวรรค์',src:'ช่วยคน สวด ปกป้องคน ทุกครั้งที่กรรมดีเพิ่ม ทำชั่วแล้วแต้มลด',t:['ทูตฝึกหัด','ทูตผู้พิทักษ์','อัครทูต'],b:['หลบเพิ่ม 2% · ATK +3%','หลบเพิ่ม 4% · ATK +6%','บินข้ามกับดัก ตัวเลือกพลาดน้อยลง 15%']},
 dsl:{n:'ทางล่ามังกร',src:'ล่าสัตว์ สู้ เรื่องมังกร ท่าทีบุก',t:['นักล่า','นักล่าเกล็ด','ผู้ปิดตำนาน'],b:['ดาเมจใส่มังกร +10%','ดาเมจใส่มังกร +20% · ใส่บอส +3%','ดาเมจใส่มังกร +30% · ใส่บอส +6%']}};
const pathOf=R=>PATHS[cid(R)]||null;
// necromancer minions (v2.5): skeletons fight in the companions' place
const boneN=R=>2+(pathTier(R)>=1?1:0)+(pathTier(R)>=3?1:0);
const bonePw=R=>(4+R.floor*.7)*1.3*(1+.12*pathTier(R));
const pathTier=R=>{const v=R&&R.path||0;let t=0;for(const x of PATH_T)if(v>=x&&(x<PATH_T[2]||(R.pathHi||0)>=3))t++;return t;}; // v2.7: the last tier is won in a contest (crownWin)
const pathName=R=>{const P=pathOf(R),t=pathTier(R);return P&&t?P.t[t-1]:'';};
const pathPts=(R,tg)=>{if(!tg||!tg.length)return 0;const M=PATH_TG[cid(R)]||{};let s=0;for(const x of tg)s+=M[x]||0;return s;};
// regex fallback for key moments without explicit tags (story arcs)
const TG_RX=[['steal',/ขโมย|ปล้น|ล้วง|ฉก|ริบ/],['trick',/หลอก|โกง|ต้มตุ๋น/],['sneak',/แอบ|ย่อง|อ้อม|หลบ/],['fight',/สู้|ดวล|ประลอง|บุก|ท้า/],['guard',/ปกป้อง|คุ้มกัน|ขวาง/],
 ['study',/อ่าน|ศึกษา|รูน|ตำรา/],['curse',/สาป/],['scout',/สำรวจ|สะกดรอย|ลาดตระเวน|ทางลัด/],['hunt',/ล่า/],['help',/ช่วย|รักษา|ให้ยา/],['pray',/สวด|ทำบุญ|ไหว้|อภัย|ถวาย/],
 ['tame',/เลี้ยง|ลูบ|อุ้ม/],['trade',/ซื้อ|ขาย|ต่อรอง/],['gamble',/พนัน|เดิมพัน/],['forage',/เก็บ|ขุด/],['dragon',/มังกร/]];
const tgOf=t=>TG_RX.filter(([,rx])=>rx.test(t)).map(([k])=>k);
// tags per choice index of the built-in key moments
const KEY_TG={omen:[['pray'],['curse'],['steal','curse'],['pray']],pet:[['tame'],['tame','help'],['trade']],comp:[['trade'],['help','guard'],[]],boss:[['fight'],[],['sneak']],
 merc:[['trade'],['fight'],[]],mimic:[[],['scout'],['sneak']],egg:[['tame'],['trade'],[]],relic:[['curse'],['pray'],['pray']],seer:[['study'],['pray'],[]],rpet:[['tame'],['tame']],
 gamble:[['gamble'],['gamble','curse'],[]],wounded:[['help'],['steal'],['help']],door:[['fight'],['scout'],[]],fountain:[[],['pray','gamble'],['forage']],starfall:[['study'],['pray'],[]],
 dragon:[['steal','sneak','dragon'],['fight','dragon'],['dragon']],smith:[['trade'],['trade'],['help']],bard:[['trade'],['help'],['steal']],thief:[['steal','guard'],['help'],['trade']],
 monk:[['pray','study'],['pray'],['fight']],cat:[['tame'],['sneak'],['tame','help']],hunter:[['hunt'],['trade'],['help']],scholar:[['study'],['study','trade'],['help']],
 noble:[['guard','help'],['fight'],['trick','steal']],cultist:[['curse'],['fight','guard'],['steal','sneak']],imp:[['curse'],['curse','trade'],['study']],healer:[['help'],['trade'],['forage','help']],
 tomb:[['steal'],['study'],['pray']],bridge:[['fight'],['trade'],['scout','sneak']],crystal:[['study'],['forage'],['curse']],book:[['study'],['study'],[]],campfire:[['guard'],['help'],['steal']],
 snack:[['trade'],['help'],['steal']],cavein:[['help'],['steal'],['help']],drill:[['fight'],['trade'],[]],lantern:[['guard','help'],['scout'],['help']],bones:[['help'],['trick'],[]],
 fairyq:[['gamble'],['gamble'],[]],stars:[['study'],['study'],['gamble']],peddler:[['trade'],['trade'],['gamble','trade'],[]],snailrace:[['gamble'],['gamble'],[]],brew:[['curse'],['study','curse'],[]],
 ruin:[['help'],['pray'],['pray']],harvest:[['forage','help'],['trade'],['steal']],pit:[['fight'],['gamble'],[]],oathk:[['guard'],[],['pray']],heist:[['steal'],['guard','trick'],[]],
 whale:[['tame'],['tame'],['hunt']],nec:[['curse'],[],['pray']],ang:[['pray'],[]],phoenix:[['pray'],['hunt','steal'],['forage']],kingless:[['curse'],['steal'],['help']],astral:[['scout'],['forage'],['study']]};
// add (or, for a priest doing evil, remove) path points; a new tier is announced once
function pathAdd(R,pts,out){if(!pts||(!R.alive&&pts>0))return;const P=pathOf(R);if(!P)return;const t0=pathTier(R);R.path=clamp((R.path||0)+pts,0,100);const t=pathTier(R);
 if(t>t0&&t>(R.pathHi||0)){R.pathHi=t;if(cid(R)==='mag'){R.h.mmp+=5;R.h.mp+=5;}
  if(out){say(R,out,`${P.n}: ขึ้นขั้น "${P.t[t-1]}" (${P.b[t-1]})`,'lv');out.pathUp=t;}}}
const pathHiName=R=>{const P=pathOf(R),t=R&&R.pathHi||0;return P&&t?P.t[t-1]:'';};
// karma lean (v2.4): the hero copies the way you answer key moments, so evil picks there also tilt the automatic choices
const kLean=R=>clamp((R.kl||0)/6,-1,1);
const pathTg=(R,tg,out,k)=>pathAdd(R,pathPts(R,tg)*(k||1),out);
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
const PERS_W={nec:[2,1,3,.3],ang:[1,1,.5,4],war:[4,1,1,1],mag:[1,3,1,1],arc:[2,2,1,1],pri:[1,1,.5,4],rog:[1.5,1,4,.5],far:[1,1,2,2],dra:[3,1,1,1],dsl:[3,1,2,1]};
function rollPers(ck,rk){const w=[...(PERS_W[CLASSES[ck].id]||[1,1,1,1])];if(rk>=3)w[0]+=1.5;if(rk===0)w[1]+=1.5;return['bold','careful','greedy','kind'][wIdx(w)];}
// rebirth: hidden karma of the previous life shifts the rank roll by about 2 percentage points per 10 karma (kShift in points)
function rankWeights(kShift){const w=RANKS.map(r=>r.w),s=clamp(kShift||0,-6,6);if(!s)return w;
 const hi=w.map((x,i)=>i>=3?x:0),hs=hi.reduce((a,b)=>a+b,0);
 if(s>0){const t=Math.min(s,w[0]-1);w[0]-=t;for(let i=3;i<w.length;i++)w[i]+=t*hi[i]/hs;}
 else{const t=Math.min(-s,hs/2);w[0]+=t;for(let i=3;i<w.length;i++)w[i]-=t*hi[i]/hs;}
 return w;}
function rollHero(o){o=o||{};
 const rk=wIdx(rankWeights(o.kShift)),cw=CLASSES.map(c=>c.w||((c.id==='dsl'?o.dsl:o.unl&&o.unl[c.id])?c.sw:0)||0),ck=wIdx(cw),C=CLASSES[ck],m=RANKS[rk].m;
 const h={name:genName(),village:pick(VILLAGES),rank:rk,cls:ck,lv:1,exp:0,mhp:C.hp*m,atk:C.atk*m,def:C.def*m,luk:C.luk+rk,mmp:C.mp*m,
  gold:Math.round(rr(12,28)*(1+rk*.45)*(C.id==='rog'?1.4:1)*(C.id==='far'?.6:1))};
 h.omen=pick(RUN_OMENS).id;const M=omenOf(h).mod;h.mhp*=M.hp||1;h.atk*=M.atk||1;h.def*=M.def||1;h.luk+=M.luk||0;h.gold=Math.round(h.gold*(M.g0||1));
 h.hp=h.mhp;h.mp=h.mmp;h.look=window.ART.rollLook(rollHero.form||'slime');h.cp=cw[ck]/cw.reduce((a,b)=>a+b,0);h.odds=Math.round(1/((RANKS[rk].w/100)*h.cp));
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
// daily theme (v2.2): h.day={d:'YYYY-MM-DD',t:id} is set at birth; the run keeps it even past midnight
const dayOf=h=>h&&h.day&&DAYS.find(x=>x.id===h.day.t)||null;
const dayW=(R,k)=>{const D=R.dayT&&DAYS.find(x=>x.id===R.dayT),w=D&&D.sp[k]||1,Z=w>1&&dayZone(R);return Z&&R.floor>=Z.a&&R.floor<=Z.b?w*2:w;};
// day hazards (v2.7): a theme with zn hits one 10-floor band (same band for everyone born that day). Inside it the theme's SPECIAL boosts double
// and zn.k joins R.hzT; heroes still below it hear the news once instead
const dayZone=R=>{const D=R.dayT&&DAYS.find(x=>x.id===R.dayT),d=R.h&&R.h.day&&R.h.day.d;if(!D||!D.zn||!d)return null;const a=11+10*(shash('tof-dayz|'+d)%8);return{z:D.zn,a,b:a+9};};
function dayTick(R,out){const Z=dayZone(R);if(!Z)return;const f=R.floor,u=R.dZ||(R.dZ={});
 if(!u.nw&&f>=Math.max(2,Z.a-10)&&f<Z.a){u.nw=1;sayK(R,out,`📰 ได้ยินว่าชั้น ${Z.a}–${Z.b} ${Z.z.w}`,'info');}
 if(!u.in&&f>=Z.a&&f<=Z.b){u.in=1;R.hzT.push({k:Z.z.k,until:Z.b,n:Z.z.n,ic:Z.z.ic});sayK(R,out,`${Z.z.ic} ${Z.z.in} (อันตราย +${Math.round((Z.z.k-1)*100)}% ถึงชั้น ${Z.b})`,'bad');}}
const dayHit=R=>{const D=R.dayT&&DAYS.find(x=>x.id===R.dayT);return!!D&&(D.hit||Object.keys(D.sp)).some(k=>R.used['sp:'+k]);};
const MD=(R,k,d)=>{const v=R.mod&&R.mod[k];return v===undefined?d:v;};
const gMul=R=>MD(R,'gold',1)*(hasPet(R,'drg')?1.2:1)*hzF(R,'g');
const keyGap=R=>ri(4,8)+(R?MD(R,'kg',0):0);
function newRun(h){const R={h:JSON.parse(JSON.stringify(h)),floor:1,pets:[],comps:[],potions:1,warps:0,map:Array(100).fill(''),farmed:Array(100).fill(0),farmN:0,retreats:0,kills:0,bosses:0,alive:true,won:false,cause:'',maxFloor:1,buys:{},seen:[],log:[],
 rolled:0,hzP:1,hzT:[],fateShift:0,mLog:0,mN:0,pMax:0,pMaxF:0,pPrev:[],lastP:0,omens:0,lastOmen:-9,scars:0,lethal:false,quiet:false,sinceKey:0,keyGap:5,egg:null,farmLeft:0,pend:null,keys:0,timeouts:0,reveal:null,cursed:0,lastSp:'',death:'',kt:{},
 way:{},sameN:0,plainN:0,ledger:[],kctx:'',lastKOmen:-9,
 mod:Object.assign({},omenOf(h).mod),used:{},omenX:[],arcs:{},quietN:0,drama:0,lastQuiet:0,lastDrama:0,lastDramaId:'',hist:[],xseen:null,
 st:PST[h.pers]||'def',stH:'',stCh:0,coh:[],mile:[],lu:{},gIn:0,gPrev:h.gold,ck:'',theme:'',path:0,pathHi:0};
 {const DT=dayOf(h);if(DT){R.dayT=DT.id;for(const k in DT.mod||{})R.mod[k]=k==='regen'?(R.mod[k]||0)+DT.mod[k]:(R.mod[k]===undefined?1:R.mod[k])*DT.mod[k];}}
 trackKarma(R);R.keyGap=keyGap(R);planArcs(R);
 // apprentice inheritance: the pet joins at once, the master's karma follows as a ledger row and a small blessing or debt
 const I=h.inh;if(I&&typeof I==='object'){if(I.pet&&PETS[I.pet])R.pets.push(I.pet);
  if(I.k){R.kctx=`มรดกกรรมจาก${I.from||'อาจารย์'}`;R.karma+=I.k;R.kctx='';}
  if(I.k>=2)R.hzP*=.94;else if(I.k<=-2)R.hzP*=1.06;}
 // family pet hatched from a secret-floor egg: every new life starts with it, unless left at home on the birth screen (h.petHome)
 const CP=h.clan&&h.clan.pet;if(CP&&!h.petHome&&PETS[CP]&&!R.pets.includes(CP)&&R.pets.length<2)R.pets.push(CP);
 R.exF=!hasSw(R)&&rnd()<EXC.fq?ri(EXC.lo,EXC.hi):0; // floor from which the sword in the stone may show up (0 = not this life)
 return R;}
// ---- karma ledger: every change of R.karma is written down with the floor and what caused it (R.kctx) ----
function trackKarma(R){let k=0;Object.defineProperty(R,'karma',{enumerable:true,configurable:true,get:()=>k,set:v=>{const d=v-k;k=v;if(!d)return;if(R.h){const ci=cid(R);if(d<0&&(ci==='pri'||ci==='ang')){if(R.path)R.path=Math.max(0,R.path+d*1.5);}else if((ci==='nec'&&d<0)||(ci==='ang'&&d>0))R.pathQ=(R.pathQ||0)+Math.abs(d);}
 const t=R.kctx||'เรื่องเล็กๆ ระหว่างทาง',L=R.ledger,l=L[L.length-1];if(l&&l.t===t&&l.f===R.floor){l.d+=d;if(!l.d)L.pop();}else L.push({f:R.floor,d,t});}});}
// ---- per-floor hazard multiplier m from the hero's current state ----
function hzParts(R){const h=R.h,hf=clamp(h.hp/h.mhp,0,1),P={};
 P.hp=Math.exp((.75-hf)*1.1);P.luk=clamp(Math.exp(-(eLuk(R)-10-R.floor*.08)*.01),.75,1.3);P.karma=clamp(Math.exp(-R.karma*.018),.6,2.4);
 P.curse=Math.pow(1.3,R.cursed);P.scar=1+.1*R.scars;const cn=R.comps.length+(cid(R)==='nec'?2:0),al=R.pets.length+cn;P.ally=al?Math.pow(.93,R.pets.length)*Math.pow(.9,cn):1.12;
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
const hasSw=R=>!!(R&&(R.exc||(R.h&&R.h.ex&&R.h.ex.got))); // sword in the stone (EXC): pulled this life or carried since birth
const eAtk=R=>R.h.atk*(hasPet(R,'fox')?1.12:1)*(hasPet(R,'drk')?1.1:1)*(hasSw(R)?EXC.atk:1)*stOf(R).a*hzF(R,'a');
const eDef=R=>R.h.def*(hasPet(R,'wolf')?1.12:1)*(hasPet(R,'drs')?1.1:1)*(hasTr(R,'shield')?1.1:1)*stOf(R).df;
const eLuk=R=>(R.h.luk+(hasPet(R,'owl')?6:0)+(hasPet(R,'drg')?3:0)+(hasTr(R,'lucky')?4:0))*(cid(R)==='far'?1.5:1);
const riskAdj=(R,p)=>clamp(p*clamp(1-(eLuk(R)-8)*.012,.45,1.25)*(cid(R)==='arc'?1-.05*pathTier(R):cid(R)==='ang'&&pathTier(R)>=3?.85:1),.02,.95);
const critCh=R=>clamp(.05+eLuk(R)*.004+(cid(R)==='arc'?.12:0),0,.5);
const dodgeCh=R=>clamp(eLuk(R)*.0025+(cid(R)==='arc'?.03*pathTier(R):0)+(cid(R)==='ang'?.05+.02*Math.min(2,pathTier(R)):0),0,.3);
const fleeCh=R=>clamp(.45+eLuk(R)*.008+(cid(R)==='arc'?.2:0),.1,.92);
const tameCh=R=>clamp(.12+eLuk(R)*.006,.05,.6);
const normT=t=>String(t).replace(/[\d.,]+/g,'#');
// the log never shows the same sentence (numbers ignored) twice in a row
function say(R,out,t,c){gwSeen(R);out.msgs.push({t,c:c||'info'});if(R.quiet)return;const p=R.log[0];if(p&&normT(p.t)===normT(t))return;R.log.unshift({f:R.floor,t,c:c||'info'});if(R.log.length>160)R.log.length=160;}
// a line that must survive a quiet stretch's summary (milestones, cohort news, rare finds)
function sayK(R,out,t,c){say(R,out,t,c);out.msgs[out.msgs.length-1].keep=1;}
function mkMon(t,f,k){const gr=1+BAL.gr*Math.pow(f/100,BAL.gp),hp=(BAL.mh0+BAL.mh1*f+BAL.mh2*f*f)*t.hp*k*gr;
 return{id:t.id,n:t.n,hp,mhp:hp,atk:gr*(BAL.ma0+BAL.ma1*f+BAL.ma2*f*f)*t.atk*(k>1?1.05:(k<1?.8:1)),def:(BAL.md0+BAL.md1*f+BAL.md2*f*f)*t.def,pet:t.pet||null,boss:false,x:t.x};}
const monsOf=b=>MONS.filter(m=>m.b.includes(b));
function genMonster(f,R){const en=mkMon(pick(monsOf(biome(f))),f,1);return R?monFit(R,modMon(R,en,MD(R,'mon',1))):en;}
// underdog (v2.3): ordinary monsters ease off for a hero far weaker than them (power ratio below MFIT.r), never below MFIT.lo
const MFIT={r:1.8,lo:.55,e:1};
function monFit(R,en){const r=heroPower(R)/Math.max(1,power(en.atk,en.def,en.mhp)),k=clamp(Math.pow(r/MFIT.r,MFIT.e),MFIT.lo,1);if(k<1){en.hp*=k;en.mhp=en.hp;en.atk*=k;}return en;}
function modMon(R,en,k){if(k!==1){en.hp*=k;en.mhp=en.hp;en.atk*=k;}return drgMod(R,en);}
// dragon-type foes and the family mark from the secret floor (h.clan.m: f friend, s slayer curse, d curse lifted)
const isDrg=en=>!!en&&(en.id==='sala'||en.id==='dragon'||!!en.drg);
const clanM=R=>R.lift?'d':(R.h.clan&&R.h.clan.m)||'';
function drgMod(R,en){if(!isDrg(en))return en;const m=clanM(R);
 if(m==='f'){if(en.boss)en.atk*=.8;else if(!en.drg)en.calm=1;}
 else if(m==='s'){en.hp*=1.25;en.mhp=en.hp;en.atk*=1.25;en.cur=1;}
 return en;}
// slayer curse: every dragon boss / dragon legend the family fells counts; the third lifts it
function drgFell(R,out){R.dk=(R.dk||0)+1;const n=((R.h.clan&&R.h.clan.n)||0)+R.dk;
 if(n>=3){R.lift=1;sayK(R,out,'มังกรตัวที่สามล้มลงแล้ว คำสาปนักล่ามังกรของตระกูลคลายลง จากนี้ไปคนจะเรียกตระกูลนี้ว่าดยุกปราบมังกร','lv');}
 else sayK(R,out,`ล้มมังกรได้อีกตัว คำสาปของตระกูลเบาลง (${n}/3)`,'lv');}
function mkBoss(f){const b=biome(f),B=BOSSES[b],second=f%20===0,fin=f===100;
 const base=mkMon({hp:1,atk:1,def:1},f,1),hk=BAL.bHp*(fin?BAL.fH:1)*(f<=20?.75:1),ak=BAL.bAtk*(fin?BAL.fA:1);
 return{id:B.id,n:second?B.n2:B.n,hp:base.hp*hk,mhp:base.hp*hk,atk:base.atk*ak,def:base.def*BAL.bDef,boss:true,x:B.x};}
function genComp(f,R){const c=pick(['war','mag','arc','pri']),T=pick(TRAITS);return{n:pick(COMPN),cls:c,pw:(4+f*.6)*(R?MD(R,'cp',1):1)*(T.pw||1),tr:T.id,line:pick(T.lines),cm:T.cost||1};}
const visC=c=>({n:c.n,cls:c.cls,tr:c.tr||'',legend:!!c.legend}); // card visual for compSpr (JSON-safe)
const compCost=(R,c)=>Math.round(25*scl(R.floor)*MD(R,'cc',1)*(c&&c.cm||1));
const warpCost=R=>Math.round(70*scl(R.floor));
// boss sneak (v2.5.1): a roll, not a free pass. LUK, class and path tier raise it, higher floors lower it; caught = boss fight at −25% HP and the boss strikes first
const SNK={b:.5,f:.0025,c:{rog:.15,arc:.1,ang:.05},hp:.25,ai:.05};
const sneakCh=R=>{const id=cid(R),T=pathTier(R);return clamp(SNK.b+clamp((eLuk(R)-8)*.01,-.05,.2)+(SNK.c[id]||0)+(id==='rog'||id==='arc'?.05:.02)*T-SNK.f*R.floor,.1,.9);};
function sneakWin(R,en,n){const h=R.h,hp0=h.hp;h.hp=Math.max(1,hp0-h.mhp*SNK.hp);const w=estimateWin(R,en,n,{ambush:true});h.hp=hp0;return w;}
function power(a,d,hp){return Math.round(a*1.6+d*1.2+hp*.15);}
const heroPower=R=>power(eAtk(R)+R.comps.reduce((s,c)=>s+c.pw*.6,0)+(cid(R)==='nec'?boneN(R)*bonePw(R)*.6:0),eDef(R),R.h.mhp);
function fight(R,en,o){o=o||{};const h=R.h,id=cid(R),T=pathTier(R),A=eAtk(R)*(id==='war'?1+.02*T:id==='ang'?1+.03*Math.min(2,T):1),D=eDef(R),cc=critCh(R),dg=dodgeCh(R),rec=!o.dry;
 let hp=h.hp,ehp=en.hp,mp=h.mp,stole=0,ph=0;const ev=[];const bm=(id==='dsl'?(isDrg(en)?1.5+.1*T:en.boss?1.1+.03*T:1):en.boss&&id==='dra'?1.25+.03*T:1)*(en.boss&&hasSw(R)?EXC.boss:1),em=o.enMul||1,st=o.stop||0;
 const hit=(a,d)=>a*a/(a+d);
 // class path styles (v2.4): archer volley first, rogue stab from the shadows, mage double cast, priest heals when low
 const amb=o.ambush&&!en.calm&&!(id==='rog'&&T>=2&&rnd()<.3*(T-1));
 if(id==='arc'&&T>=1){const d=hit(A,en.def)*(.35+.15*T)*bm;ehp-=d;rec&&ev.push({t:'volley',d,hp,ehp});}
 if(mp>=10&&!(id==='pri'&&T>=2)){mp-=10;if(id==='pri'){hp=Math.min(h.mhp,hp+h.mhp*(.2+.03*T));rec&&ev.push({t:'heal',hp,ehp});}else{const d=hit(A,en.def)*(id==='mag'?2.2:1.3)*bm;ehp-=d;rec&&ev.push({t:'skill',d,hp,ehp});
  if(id==='mag'&&T>=2&&mp>=10&&ehp>st){mp-=10;const d2=hit(A,en.def)*.8*bm;ehp-=d2;rec&&ev.push({t:'skill',d:d2,hp,ehp,x2:1});}}}
 if(id==='rog'&&T>=1&&!amb&&ehp>st){const d=hit(A,en.def)*1.8*(1+.15*(T-1))*bm;ehp-=d;rec&&ev.push({t:'stab',d,hp,ehp});}
 if(amb){const d=hit(en.atk*em,D)*rr(.85,1.15);hp-=d;rec&&ev.push({t:'e',d,hp,ehp});}
 for(let r=0;r<(o.lim||(en.boss&&R.floor===100?BAL.fR:40))&&ehp>st&&hp>0;r++){
  const cr=rnd()<cc;let d=hit(A,en.def)*rr(.85,1.15)*(cr?1.8:1)*bm;ehp-=d;rec&&ev.push({t:'h',d,cr,hp,ehp});if(ehp<=st)break;
  for(const c of R.comps){if(c.cls==='pri')hp=Math.min(h.mhp,hp+h.mhp*.03);const d2=hit(c.pw,en.def)*rr(.8,1.2)*(c.cls==='pri'?.5:1);ehp-=d2;rec&&ev.push({t:'c',n:c.n,d:d2,hp,ehp});if(ehp<=st)break;}
  if(ehp<=st)break;
  if(id==='nec'){const bp=bonePw(R);for(let j=0,nb=boneN(R);j<nb&&ehp>st;j++){const d=hit(bp,en.def)*rr(.8,1.2);ehp-=d;if(T>=3)hp=Math.min(h.mhp,hp+d*.15);rec&&ev.push({t:'c',n:'โครงกระดูก',d,hp,ehp,bone:j});}if(ehp<=st)break;}
  for(let pi=0;pi<R.pets.length&&ehp>st;pi++){const p=R.pets[pi],k=(p==='wolf'?.25:0)+(id==='far'&&T>=1?.06+.06*T:0);if(!k)continue;const d3=hit(A*k,en.def);ehp-=d3;rec&&ev.push({t:'p',d:d3,hp,ehp,pi});}
  if(ehp<=st)break;
  if(id==='rog'&&T>=3&&rec&&!stole&&rnd()<.25){stole=Math.round((BAL.g0+BAL.g1*R.floor)*.8*gMul(R));h.gold+=stole;ev.push({t:'steal',g:stole,hp,ehp});}
  if(en.calm)continue;
  if(rnd()<dg){rec&&ev.push({t:'miss',hp,ehp});continue;}
  const ed=hit(en.atk*em,D)*rr(.85,1.15)*(id==='war'?.9:1);hp-=ed;rec&&ev.push({t:'e',d:ed,hp,ehp});
  if(hp<=0&&id==='dra'&&T>=3&&en.boss&&!R.dsv){hp=1;if(rec){R.dsv=1;ev.push({t:'save',hp,ehp});}}
  if(hp>0&&id==='war'&&T>=2&&rnd()<.1+.05*(T-2)){const d=hit(A,en.def)*.6*bm;ehp-=d;rec&&ev.push({t:'counter',d,hp,ehp});if(ehp<=st)break;}
  if(hp>0&&id==='pri'&&T>=2&&!ph&&hp<h.mhp*.4&&mp>=10){ph=1;mp-=10;hp=Math.min(h.mhp,hp+h.mhp*(.22+.03*T));rec&&ev.push({t:'heal',hp,ehp});}
 }
 return{win:hp>0&&(!o.need||ehp<=st),hp:Math.max(0,hp),mp,ev,ehp:Math.max(0,ehp),stole};
}
// boss rubber band (v2.3): no farming loop any more, so a boss far above the hero eases off until the hero has about BFIT.t to win at full HP
const BFIT={t:.3,lo:.55,st:.9};
// late bosses hit harder (v2.7): reaching the top should cost something; the rubber band above still eases a boss that is hopeless
const BLATE={80:1.15,90:1.25,100:1.05};
function bossFit(R,en,t,o){const h=R.h,hp0=h.hp,mp0=h.mp;h.hp=h.mhp;h.mp=h.mmp;let k=1;
 while(k>BFIT.lo&&estimateWin(R,en,40,o)<t){k*=BFIT.st;en.hp*=BFIT.st;en.mhp=en.hp;en.atk*=BFIT.st;}
 h.hp=hp0;h.mp=mp0;if(k<1)en.fit=Math.round(k*100)/100;return en;}
function estimateWin(R,en,n,o){let w=0;for(let i=0;i<n;i++)if(fight(R,en,Object.assign({dry:true},o)).win)w++;return w/n;}
function gainExp(R,x,out){const h=R.h;if(cid(R)==='far')x*=1.25;x*=MD(R,'xp',1);h.exp+=x;const C=CLASSES[h.cls],m=RANKS[h.rank].m;
 while(h.exp>=need(h.lv)){h.exp-=need(h.lv);h.lv++;h.mhp+=C.g.hp*m;h.atk+=C.g.atk*m;h.def+=C.g.def*m;h.luk+=C.g.luk;h.mmp+=C.g.mp*m;h.hp=Math.min(h.mhp,h.hp+h.mhp*.3);h.mp=h.mmp;
  out&&say(R,out,`เลเวลอัป! ตอนนี้ Lv.${h.lv}`,'lv');}}
function addPet(R,p,out){if(R.pets.length>=2){R.h.gold+=Math.round(20*scl(R.floor));say(R,out,`ไม่มีที่ว่างเลี้ยง${PETS[p].n} เลยขายต่อได้ทองมา`,'info');return;}R.pets.push(p);say(R,out,`${PETS[p].n} เข้าร่วมปาร์ตี้! (${PETS[p].d})`,'good');}
function addComp(R,c,out){if(R.comps.length>=2)return;if(cid(R)==='nec'){say(R,out,`${c.n}เห็นโครงกระดูกรอบตัวคุณแล้วถอยกรูด ไม่ยอมมาด้วย`,'info');return;}R.comps.push(c);const T=trOf(c);say(R,out,`${c.n} (${clsName(c.cls)}${T?' · '+T.n:''}) เข้าร่วมทีม!`,'good');if(c.tr==='mouth'){const kc=R.kctx;R.kctx=`${c.n}ปากเสีย ด่าพ่อค้าจนร้องไห้`;R.karma-=1;R.kctx=kc;say(R,out,`${c.n}เดินไปด่าพ่อค้าแถวนั้นจนเขาร้องไห้`,'bad');}}
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
 if(fx.fight)P.push({t:'ต้องสู้!',c:'b'});if(fx.go)P.push({t:`${R.comps[fx.go-1]?R.comps[fx.go-1].n:'เพื่อนร่วมทาง'}แยกไป`,c:'b'});
 if(fx.k>0)P.push({t:'✦ กรรมดี',c:'kk'});if(fx.k<0)P.push({t:'✧ กรรมชั่ว',c:'kk'});
 return P;}
function applyFx(R,fx,out){const h=R.h,f=R.floor,s=scl(f);if(!fx)return;
 if(fx.hp){if(fx.hp>0)h.hp=Math.min(h.mhp,h.hp+fx.hp*h.mhp);else h.hp-=-fx.hp*h.mhp*(cid(R)==='war'?.88:1);}
 if(fx.gold){if(fx.gold>0)h.gold+=Math.round(fx.gold*s*(cid(R)==='rog'?1.3*(1+.12*pathTier(R)):1)*gMul(R)*stOf(R).g);else h.gold=Math.max(0,h.gold-Math.round(-fx.gold*s));}
 if(fx.exp)gainExp(R,fx.exp*s,out);
 if(fx.atk)h.atk+=fx.atk*(1+f/30);if(fx.def)h.def+=fx.def*(1+f/30);
 if(fx.luk)h.luk=Math.max(0,h.luk+fx.luk);
 if(fx.mhp){h.mhp*=1+fx.mhp;h.hp=Math.min(h.mhp,h.hp);}
 if(fx.mmp){h.mmp+=fx.mmp;h.mp+=fx.mmp;}
 if(fx.go&&R.comps.length){const c=R.comps.splice(Math.min(fx.go,R.comps.length)-1,1)[0];say(R,out,`${c.n}เก็บของแล้วแยกทางไป`,'bad');}if(fx.k)R.karma+=fx.k;if(fx.pot)R.potions+=fx.pot;if(fx.warp)R.warps+=fx.warp;
 if(fx.pet)addPet(R,fx.pet==='r'?pick(PETK):fx.pet,out);
 // auto mode: a warp never skips a boss floor (skipped floors are not rolled for death)
 if(fx.skip){const nb=Math.ceil(f/10)*10,tg=Math.min(f+fx.skip,nb-1);for(let i=f;i<tg;i++)R.map[i]='warp';if(tg>f){R.floor=tg;if(tg>R.maxFloor)R.maxFloor=tg;say(R,out,`ถูกดูดขึ้นไปถึงชั้น ${tg}!`,'good');}}
 if(fx.fight&&h.hp>0)doFight(R,genMonster(R.floor,R),out);}
function bossPerks(R,gd,out){const h=R.h;
 R.comps.forEach(c=>{if(c.tr==='cheap'){const cut=Math.round(gd*.1);h.gold-=cut;say(R,out,`${c.n}หยิบส่วนแบ่งไป ${cut} ทอง ตามที่ตกลงกันไว้`,'info');}
  if(c.tr==='medic'){R.potions++;say(R,out,`${c.n}ต้มยาจากเลือดบอสได้หนึ่งขวด กลิ่นแย่มากแต่ใช้ได้`,'good');}});
 const dt=MD(R,'debt',0);if(dt){const cut=Math.round(h.gold*dt);h.gold-=cut;say(R,out,`เจ้าหนี้จากชาติก่อนโผล่มาเก็บดอก ${cut} ทอง`,'bad');}}
function doFight(R,en,out,o){o=o||{};const h=R.h,f=R.floor;
 // family of dragon friends: small dragon-kin bow out instead of fighting
 if(en.calm){say(R,out,`${en.n}ได้กลิ่นสหายมังกรจากตัวคุณ มันก้มหัวแล้วเลื้อยหลบไปเอง`,'good');gainExp(R,(BAL.ex0+BAL.ex1*f)*.5*(o.rw||1),out);return true;}
 if(en.cur&&(en.boss||en.drg))say(R,out,`${en.n}จำกลิ่นตระกูลนักล่ามังกรได้ มันดุกว่าปกติ`,'bad');
 const res=fight(R,en,o);
 out.combat={en,ev:res.ev,win:res.win,startHp:h.hp,mhp:h.mhp};h.hp=res.hp;h.mp=res.mp;out.enemy=en;
 if(res.stole)say(R,out,`ฉกทองจาก${en.n}กลางวงต่อสู้ได้ ${res.stole} ทอง`,'good');if(res.ev.some(e=>e.t==='save'))say(R,out,'เลือดมังกรพยุงร่างไว้ คุณไม่ยอมล้มทั้งที่ควรจะตายไปแล้ว','lv');
 if(res.win){R.kills++;const k=o.rw||1;const ex=(BAL.ex0+BAL.ex1*f)*(en.boss?6:1)*k;
  const gd=Math.round((en.boss?(60+15*f)*rr(.9,1.2):(BAL.g0+BAL.g1*f)*rr(.7,1.3)*k)*(cid(R)==='rog'?1.3:1)*gMul(R)*stOf(R).g);
  h.gold+=gd;say(R,out,`ปราบ${en.n}! +${Math.round(ex)} EXP · +${gd} ทอง`,'good');gainExp(R,ex,out);if(en.boss){out.coins=gd;bossPerks(R,gd,out);}if(clanM(R)==='s'&&isDrg(en)&&(en.boss||en.drg))drgFell(R,out);}
 else{out.cause=o.cause||`ถูก${en.n}สังหารที่ชั้น ${f}`;say(R,out,`พ่ายแพ้ต่อ${en.n}…`,'bad');}
 return res.win;}
function genEvent(R){const f=R.floor;if(f%10===0){const en=modMon(R,mkBoss(f),MD(R,'boss',1)),k=BLATE[f]||1;en.hp*=k;en.mhp=en.hp;en.atk*=k;return{kind:'boss',en:bossFit(R,en,BFIT.t)};}
 let r=rnd();if(r<.3)return{kind:'mon',en:genMonster(f,R)};r-=.3;
 const hk=R.st==='help'?1.3:1,pr=.05*MD(R,'pet',1)*hk;if(r<pr&&R.pets.length<2)return{kind:'pet',pet:pick(PETK)};r-=pr;
 if(r<.06*hk&&R.comps.length<2)return{kind:'comp',comp:genComp(f,R)};
 const b=biome(f);let pool=[];EVENTS.forEach((e,i)=>{if((e.b===b||e.b===-1)&&!R.seen.includes(i)&&evW(R,e)>0)pool.push(i);});
 if(!pool.length)EVENTS.forEach((e,i)=>{if((e.b===b||e.b===-1)&&evW(R,e)>0)pool.push(i);});
 let x=rnd()*pool.reduce((a,i)=>a+evW(R,EVENTS[i]),0),ti=pool[pool.length-1];for(const i of pool){x-=evW(R,EVENTS[i]);if(x<0){ti=i;break;}}
 R.seen.push(ti);if(R.seen.length>6)R.seen.shift();if(EVENTS[ti].ok)(R.stE||(R.stE={}))[ti]=1;
 const pt=R.pets[0],c=R.comps;return{kind:'ev',ti,sub:{pet:pt&&PETS[pt]?PETS[pt].n:'',comp:c[0]?c[0].n:'',comp2:c[1]?c[1].n:''}};}
const evW=(R,e)=>e.ok&&!e.ok(R)?0:e.w?e.w(R):1;
const evS=(ev,s)=>s&&ev&&ev.sub?String(s).replace(/\{(pet|comp|comp2)\}/g,(m,k)=>ev.sub[k]||m):s;
// ---- v2.7 autoProp: an event without `pr` gets a scene prop from the words of its title (then its text);
// nothing matches -> hash of the title picks from a neutral pool, so the same event always shows the same prop ----
const PROP_NPC=new Set(['snail','dwarf','miner','witch','ghostkid','trainer','farmer','granny','fairkid','fairy','skeleton','phoenix','stargazer','whale','seer','gambler','masked','child','merchant','knight','bard','monk','thief','smith','cat','hunter','scholar','noble','cultist','imp','healer']);
const PROP_RX=[[/อิมป์/,'imp'],[/นักล่า|พราน|ล่าสัตว์|รอยเท้า|หมาป่า/,'hunter'],[/นักบวช|พระ(?!อาทิตย์|จันทร์)|ธุดงค์/,'monk'],[/ลาวา|กำมะถัน|ซาลาแมนเดอร์|นักระบำไฟ/,'fire'],[/มิมิก|หีบ|สมบัติ|คลังทอง/,'chest'],[/ไข่/,'egg'],[/หลุมศพ|ป้ายหลุม|สุสาน/,'grave'],[/โครงกระดูก|กระดูก/,'skeleton'],[/หมอดู|ทำนาย/,'seer'],[/หน้ากาก|โรงละคร|หุ่นเชิด/,'masked'],
 [/นกไฟ|นกเพลิง/,'phoenix'],[/วาฬ/,'whale'],[/หอยทาก/,'snail'],[/นางฟ้า|ภูต/,'fairy'],[/แม่มด|หม้อยา/,'witch'],[/ปีศาจ|ม้วนสัญญา/,'imp'],[/ลัทธิ/,'cultist'],[/ผี(?!เสื้อ)|วิญญาณ/,'ghostkid'],
 [/พ่อค้า|ร้าน|ตลาด|คาราวาน/,'merchant'],[/โจร|ขโมย|ปล้น|ล้วง/,'thief'],[/อัศวิน|ทหาร|ยามเฝ้า|องครักษ์/,'knight'],[/หมอ(?!ก)|รักษา|ป่วย|โรค|สมุนไพร/,'healer'],
 [/แมว/,'cat'],[/ยาย|คนแก่/,'granny'],[/เด็ก/,'child'],[/ช่าง|ทั่ง|ตีเหล็ก/,'smith'],[/นักกวี|พิณ|เพลง|ดนตรี/,'bard'],
 [/ขุนนาง|เจ้าเมือง|ราชา|มงกุฎ/,'noble'],[/นักปราชญ์|ปริศนา/,'scholar'],[/คนแคระ/,'dwarf'],[/เหมือง|แร่|อุโมงค์/,'miner'],[/พนัน|เดิมพัน|ลูกเต๋า/,'gambler'],[/ชาวนา|ไร่|แปลงผัก|เก็บเกี่ยว/,'farmer'],
 [/ครูฝึก|ลานฝึก/,'trainer'],[/ดูดาว|กล้องส่อง/,'stargazer'],[/แท่น|ต้องสาป|คำสาป|รูปปั้น/,'altar'],[/หนังสือ|ตำรา|คัมภีร์|ห้องสมุด/,'book'],[/คริสตัล|ผลึก|อัญมณี/,'crystal'],
 [/ประตู|มิติ|วาร์ป|รอยแยก|กระจก/,'portal'],[/ศาล|วัด|สวด|ไหว้|เทพ/,'shrine'],[/ดาว|จันทร์|ท้องฟ้า|หิ่งห้อย/,'star'],[/บ่อ(?!ย)|น้ำพุ|ธาร|บึง|ทะเลสาบ|แม่น้ำ/,'well'],[/ไฟ|เทียน|โคม|เตา/,'fire']];
const PROP_POOL=['npc','fire','well','star','crystal','shrine','book','portal'];
function autoProp(t,x){const s=String(t||''),sx=String(x||'');for(const r of PROP_RX)if(r[0].test(s))return r[1];for(const r of PROP_RX)if(r[0].test(sx))return r[1];return PROP_POOL[shash(s)%PROP_POOL.length];}
const autoVis=(t,x)=>{const pr=autoProp(t,x);return PROP_NPC.has(pr)?{t:'prop',pr,fb:'npc'}:{t:'prop',pr};};
const evVis=(ev,T)=>T.pr?{t:'prop',pr:T.pr}:autoVis(evS(ev,T.t),evS(ev,T.x));
const evPr=T=>T.pr||autoProp(T.t,T.x);
const chRisk=(R,ch)=>riskAdj(R,ch.p)*(cid(R)==='mag'&&pathTier(R)>=3&&ch.tg&&ch.tg.includes('curse')?.5:1);
function chDis(R,ch){const c=ch.c?Math.round(ch.c*scl(R.floor)):0;if(c&&R.h.gold<c)return`ทองไม่พอ ขาด ${Math.ceil(c-R.h.gold)}`;if(ch.req==='pot'&&R.potions<1)return'ไม่มียา';return'';}
function estCached(R,ev,n){const k=Math.round(R.h.hp)+'|'+Math.round(R.h.atk)+'|'+R.comps.length+'|'+R.pets.join();if(ev.ek!==k){ev.ek=k;ev.est=estimateWin(R,ev.en,n);ev.sw=sneakWin(R,ev.en,n);}return ev.est;}
function choicesOf(R,ev){const h=R.h,f=R.floor,s=scl(f);
 if(ev.kind==='ev')return EVENTS[ev.ti].c.map(ch0=>{const ch=Object.assign({},ch0,{t:evS(ev,ch0.t)});if(ch.cl&&ch.cl!==cid(R))return{t:ch.t,P:[],dis:true,hide:true};const P=[];if(ch.c)P.push({t:`−${Math.round(ch.c*s)} ทอง`,c:'w'});
  if(ch.p){const pp=Math.round(chRisk(R,ch)*100);
   if(ch.gn){P.push({t:`${100-pp}% ${ch.gn}`,c:'g'},...fxParts(R,ch.g),{t:`/ ${pp}% ${ch.pn}`,c:'b'},...fxParts(R,ch.b));}
   else{P.push(...fxParts(R,ch.g),{t:`· ${pp}% ${ch.pn}`,c:'b'});}}else P.push(...fxParts(R,ch.g));
  if(!P.length)P.push({t:'ไม่มีอะไรเปลี่ยน',c:''});const d=chDis(R,ch);if(d)P.push({t:`(${d})`,c:'b'});return{t:ch.t,P,dis:!!d,tg:ch.tg,cl:ch.cl};});
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
   {t:'หาทางลัดอ้อมบอส',dis:f===100,P:f===100?[{t:'(ชั้นสุดท้ายไม่มีทางอ้อม)',c:'b'}]:(()=>{const p=Math.round(sneakCh(R)*100),sw=Math.round((ev.sw||0)*100);
    return[{t:`${p}% แอบผ่านได้`,c:p>=60?'g':p>=35?'w':'b'},{t:'ข้ามบอส ไม่ได้รางวัล · ชะตาสั้นลงนิดหน่อย',c:''},{t:`/ ถ้าบอสเห็น ต้องสู้ทั้งที่ HP −25% และโดนตีก่อน (ชนะ ~${sw}%)`,c:'b'}];})()}];}
 return[];}
const SAVED=['เกือบตายไปแล้ว แต่ชะตายังไม่ถึงฆาต','ล้มลงไปรอบหนึ่ง ลืมตาขึ้นมาอีกทีก็ยังหายใจอยู่','ภาพตรงหน้ามืดไปครู่หนึ่ง พอรู้สึกตัวก็ลุกขึ้นเดินต่อได้','ร่างกายพังไปครึ่งหนึ่ง แต่หอคอยยังไม่ยอมรับวิญญาณคุณ'];
// death only when the fight was a chosen lethal one (boss); otherwise survive scarred (scars raise the floor hazard)
// priest (v2.4): once per life the light pulls the priest back from death
const REZ_HZ=5; // borrowed life: fate runs out faster after coming back
const canRez=R=>cid(R)==='pri'&&!R.rez;
function rezNow(R,out){R.rez=1;R.rezFx=1;R.h.hp=Math.max(1,R.h.mhp*.3);R.h.mp=R.h.mmp;R.hzP*=REZ_HZ;say(R,out,'แสงศักดิ์สิทธิ์ดึงวิญญาณกลับเข้าร่าง คุณลืมตาขึ้นอีกครั้ง (นักบวชฟื้นคืนชีพได้ครั้งเดียว)','lv');out.rez=1;}
function mortal(R,out,cause){if(R.h.hp>0||!R.alive)return;
 if(R.lethal&&canRez(R)){rezNow(R,out);return;}
 if(R.lethal){die(R,cause||`สิ้นใจที่ชั้น ${R.floor}`);return;}
 R.h.hp=Math.max(1,R.h.mhp*.12);R.scars++;out.saved=true;say(R,out,fresh(R,'sv',SAVED)+` (แผลเป็น ${R.scars})`,'lv');}
function resolve(R,ev,i){const h=R.h,f=R.floor;const out={msgs:[],combat:null,after:'result',coins:0,enemy:null,cause:''};
 const cs=choicesOf(R,ev);if(!cs[i]||cs[i].dis)return null;
 if(ev.kind==='ev'){const T0=EVENTS[ev.ti],T={t:evS(ev,T0.t)},ch=T0.c[i];R.kctx=`${T.t}: ${evS(ev,ch.t)}`;
  if(ch.c)h.gold-=Math.round(ch.c*scl(f));if(ch.req==='pot')R.potions--;
  say(R,out,`${T.t}: เลือก "${evS(ev,ch.t)}"`,'info');gainExp(R,4+.6*f,out);
  const bad=ch.p?rnd()<chRisk(R,ch):false;pathTg(R,ch.tg,out);const fx=bad?(ch.b||{}):(ch.g||{});
  say(R,out,evS(ev,bad?(ch.bm||`${ch.pn}!`):(ch.gm||(ch.gn?`${ch.gn}!`:'ผ่านไปได้ด้วยดี'))),bad?'bad':'good');
  R.map[f-1]=bad?(fx.hp<0||fx.fight?'trap':'bad'):(fx.k>0?'good':fx.k<0?'evil':fx.gold>0?'treasure':fx.pet?'pet':'calm');
  applyFx(R,fx,out);if(fx.fight)R.map[f-1]='fight';
  if(!out.cause)out.cause=`${T.t}: ${bad?ch.pn:'โชคร้าย'} (ชั้น ${f})`;}
 else if(ev.kind==='mon'){const en=ev.en;R.map[f-1]='fight';
  if(i===0){say(R,out,`เข้าปะทะ${en.n}!`,'info');if(doFight(R,en,out))pathTg(R,isDrg(en)?['fight','dragon','hunt']:['fight','hunt'],out,.15);}
  else if(i===1){if(rnd()<fleeCh(R)){say(R,out,`วิ่งหนี${en.n}ได้สำเร็จ`,'good');R.map[f-1]='flee';gainExp(R,2+.3*f,out);}
   else{say(R,out,'หนีไม่พ้น! โดนตีจากด้านหลัง','bad');doFight(R,en,out,{ambush:true});}}
  else{pathTg(R,['tame'],out,.6);if(rnd()<tameCh(R)){say(R,out,`${en.n}ยอมสยบ!`,'good');addPet(R,en.pet,out);R.map[f-1]='pet';gainExp(R,(BAL.ex0+BAL.ex1*f)*.5,out);}
   else{say(R,out,`${en.n}คลั่งหนักกว่าเดิม!`,'bad');doFight(R,en,out,{enMul:1.2});}}}
 else if(ev.kind==='pet'){const P=PETS[ev.pet];R.map[f-1]='pet';R.kctx=`${P.n}: ${cs[i].t}`;pathTg(R,KEY_TG.pet[i],out);
  if(i===0){if(R.pets.length>=2){say(R,out,`ปล่อย${PETS[R.pets[0]].n}กลับป่า`,'info');R.pets.shift();}addPet(R,ev.pet,out);}
  else if(i===1){R.karma+=2;say(R,out,`${P.n}กินอิ่มแล้ววิ่งจากไปอย่างมีความสุข`,'good');R.map[f-1]='good';}
  else{R.karma-=3;h.gold+=Math.round(15*scl(f));say(R,out,`ขาย${P.n}ได้ทองมา ก่อนไปมันหันมามองคุณตาละห้อย`,'bad');R.map[f-1]='evil';}}
 else if(ev.kind==='comp'){const c=ev.comp;R.map[f-1]='comp';R.kctx=`${c.n}: ${cs[i].t}`;pathTg(R,KEY_TG.comp[i],out);
  if(i===0){h.gold-=compCost(R,c);addComp(R,c,out);}
  else if(i===1){if(rnd()<riskAdj(R,.35)){say(R,out,`ทำภารกิจให้${c.n}สำเร็จ`,'good');R.karma+=1;addComp(R,c,out);}else{say(R,out,'ภารกิจพลาด! บาดเจ็บหนัก','bad');h.hp-=h.mhp*.2;out.cause=`ภารกิจของ${c.n}ล้มเหลว (ชั้น ${f})`;}}
  else{say(R,out,`บอกลา${c.n} แล้วเดินต่อคนเดียว`,'info');R.map[f-1]='calm';}}
 else if(ev.kind==='boss'){const en=ev.en;
  if(i===0){say(R,out,`ท้าชิงบอส ${en.n}!`,'info');R.map[f-1]='boss';
   if(doFight(R,en,out,{cause:`พ่ายแพ้ต่อบอส ${en.n} (ชั้น ${f})`})){R.bosses++;pathTg(R,isDrg(en)?['fight','dragon']:['fight'],out);R.retreats=0;if(f===100){R.won=true;R.sec=rnd()<SEC_P?{st:'ask',c:pick(['k','s','g'])}:{st:'none'};out.after='end';say(R,out,'พิชิตยอดหอคอยโชคชะตา!','lv');}else out.after='shop';}}
  else if(i===1){if(R.warps>0)R.warps--;else h.gold-=warpCost(R);R.map[f-1]='warp';R.retreats=0;say(R,out,`ฉีกม้วนวาร์ป ข้าม${en.n}ไปอย่างเงียบๆ`,'info');out.after='shop';}
  else{R.retreats=0;
   if(rnd()<sneakCh(R)){R.sneaks=(R.sneaks||0)+1;pathTg(R,['sneak'],out);shiftFate(R,-2);R.map[f-1]='flee';say(R,out,`ลัดเลาะช่องแคบหลังห้องบอส ผ่าน${en.n}ไปได้โดยมันไม่ทันเห็น`,'info');out.after='shop';}
   else{R.caught=(R.caught||0)+1;h.hp=Math.max(1,h.hp-h.mhp*SNK.hp);R.map[f-1]='boss';say(R,out,`ก้อนหินใต้เท้าหลุดดังก๊อก ${en.n}หันมาเห็นพอดี คุณถลอกไปทั้งตัวตอนถอยหนี และยังตั้งหลักไม่ทัน`,'bad');
    if(doFight(R,en,out,{ambush:true,cause:`${en.n}จับได้ตอนแอบย่องผ่าน (ชั้น ${f})`})){R.bosses++;pathTg(R,isDrg(en)?['fight','dragon']:['fight'],out);out.after='shop';}}}}
 if(R.alive&&h.hp<=0)mortal(R,out,out.cause||`สิ้นใจที่ชั้น ${f}`);
 if(R.won)R.alive=false;
 return out;}
function die(R,c){R.alive=false;R.cause=c;R.ck=R.ck||'boss';R.h.hp=0;R.map[R.floor-1]='death';}
function farm(R){const out={msgs:[],combat:null,after:'result',coins:0,cause:''},f=R.floor;const t=pick(monsOf(biome(f)));
 const amb=rnd()<riskAdj(R,.1);const en=monFit(R,modMon(R,mkMon(t,f,amb?1.05:.6),MD(R,"mon",1)));if(amb)say(R,out,`ฝูง${t.n}รุมล้อม!`,'bad');else say(R,out,`ฟาร์มอยู่ชั้น ${f}: ล่า${t.n}`,'info');
 const m=Math.max(.25,1-.2*R.farmN);doFight(R,en,out,{rw:.6*m,cause:`ฟาร์มเพลินจนถูก${t.n}รุมสังหาร (ชั้น ${f})`});
 R.farmN++;R.farmed[f-1]++;if(!R.map[f-1])R.map[f-1]='farm';
 if(R.h.hp<=0)mortal(R,out,out.cause);return out;}
function drink(R){if(R.potions<1)return false;R.potions--;R.h.hp=Math.min(R.h.mhp,R.h.hp+R.h.mhp*.45);return true;}
function climb(R){const out={msgs:[]},h=R.h,id=cid(R),hf0=h.hp/h.mhp;R.floor++;if(R.floor>R.maxFloor)R.maxFloor=R.floor;R.farmN=0;
 const rg=BAL.regen+MD(R,'regen',0)+(id==='pri'?.05+.005*pathTier(R):0)+(id==='dra'?.03:0)+(id==='ang'?.02:0)+(hasPet(R,'slime')?.04:0)+(hasPet(R,'drs')?.02:0);h.hp=Math.min(h.mhp,h.hp+h.mhp*rg);h.mp=Math.min(h.mmp,h.mp+h.mmp*.2);
 R.comps.forEach(c=>c.pw*=1.015);
 {const d=h.gold-(R.gPrev||0);if(d>0)R.gIn=(R.gIn||0)+d;R.gPrev=h.gold;}
 // stance "help": now and then a small good deed on the way up
 if(R.st==='help'&&rnd()<.07){R.kctx='ช่วยคนระหว่างทาง';R.karma+=1;R.kctx='';say(R,out,fresh(R,'hd',HELPD)+' (ท่าทีช่วยเหลือ)','good');}
 if(R.st===PATH_ST[id])pathAdd(R,.4,out);if(R.pathQ){pathAdd(R,R.pathQ,out);R.pathQ=0;}
 cohTick(R,out);mileTick(R,out);towerTick(R,out);statFloor(R,out,hf0);
 // hidden karma only leaks through the odd bad omen when it is very negative
 if(R.karma<=-15&&R.floor-R.lastKOmen>=5&&rnd()<.15){R.lastKOmen=R.floor;say(R,out,fresh(R,'ko',KOMEN),'info');}
 if(R.karma<-8)for(let i=R.comps.length-1;i>=0;i--){if(R.comps[i].tr!=='loyal'&&rnd()<Math.min(.1,-R.karma*.004)){const c=R.comps[i];const st=Math.round(h.gold*.25);h.gold-=st;R.comps.splice(i,1);say(R,out,`${c.n}ทรยศ! ขโมยทอง ${st} แล้วหนีไป (กรรมตามสนอง)`,'bad');}}
 return out;}
// ---- stat effects between floors: small nudges, each line names the stat behind it ----
// at most one line per floor; the same rule speaks again only after STAT_CD floors
const STAT_CD=10;
function statFloor(R,out,hf0){const h=R.h,f=R.floor,s=scl(f),sn=R.sn||(R.sn={});
 R.lowN=hf0<.35?(R.lowN||0)+1:0;R.fitN=hf0>=.9?(R.fitN||0)+1:0;R.soloN=R.comps.length+R.pets.length?0:(R.soloN||0)+1;
 const L=eLuk(R),rules=[
  ['low',()=>R.lowN>=2,()=>{const c=Math.round(4*s);if(h.gold>=c){h.gold-=c;h.hp=Math.min(h.mhp,h.hp+h.mhp*.06);say(R,out,`ซื้อผ้าพันแผลจากคนเดินสวน −${c} ทอง HP +6% (HP ต่ำมาหลายชั้นแล้ว)`,'info');}
   else say(R,out,'แผลยังไม่หาย แต่ไม่มีเงินซื้อผ้าพันแผล ชั้นนี้เลยเสี่ยงกว่าปกติ (HP ต่ำ)','bad');}],
  ['fit',()=>R.fitN>=3,()=>{const x=Math.round(3+.4*f);gainExp(R,x,out);say(R,out,`ร่างกายพร้อม เดินเร็วจนเหลือเวลาซ้อมท่า +${x} EXP (HP เต็มมาหลายชั้น)`,'good');}],
  ['lucky',()=>L>=20+f*.15&&rnd()<.08,()=>{const g=Math.round(5*s*gMul(R));h.gold+=g;say(R,out,`เตะโดนถุงเงินที่ใครทำตกไว้ +${g} ทอง (LUK ${Math.round(L)})`,'good');}],
  ['unlucky',()=>L<6&&h.gold>=1&&rnd()<.08,()=>{const g=Math.min(Math.floor(h.gold),Math.round(3*s));h.gold-=g;say(R,out,`กระเป๋าขาด เหรียญร่วงหายไป −${g} ทอง (LUK ต่ำ)`,'bad');}],
  ['rich',()=>h.gold>=30*s&&rnd()<.07,()=>{if(cid(R)==='rog'){say(R,out,'มีมือแปลกหน้าล้วงกระเป๋า คุณคว้าข้อมือไว้ทัน มือแบบนี้คุณรู้จักดี (โจร)','good');return;}
   const g=Math.round(h.gold*.06);h.gold-=g;say(R,out,`พกทองเยอะจนเป็นเป้า โดนล้วงกระเป๋าไป −${g} ทอง (ทอง ${Math.round(h.gold+g)})`,'bad');}],
  ['scar',()=>R.scars>=2&&rnd()<.06,()=>{h.hp=Math.max(1,h.hp-h.mhp*.04);say(R,out,`แผลเป็นเก่าปวดตุบๆ ตอนอากาศเปลี่ยน HP −4% (แผลเป็น ${R.scars} แผล)`,'bad');}],
  ['solo',()=>R.soloN>=8,()=>say(R,out,'เดินคนเดียวมาหลายชั้นแล้ว ไม่มีใครคอยระวังหลังให้ ชั้นต่อๆ ไปเสี่ยงกว่าตอนมีเพื่อน (ไม่มีเพื่อนร่วมทาง)','info')]];
 for(const[k,when,run]of rules){if(f-(sn[k]===undefined?-99:sn[k])<STAT_CD||!when())continue;sn[k]=f;run();break;}}
// ---- "the tower right now": named timed hazard modifiers (R.hzT) show under the scene and say when they wear off ----
function towerTick(R,out){dayTick(R,out);for(const t of R.hzT)if(t.n&&t.until<R.floor&&!t.gone){t.gone=1;say(R,out,t.e||`${t.n} หมดผลแล้ว`,'info');}laterTick(R,out);}
function towerNow(R){if(!R||!R.alive)return'';const f=R.floor,L=R.hzT.filter(t=>t.n&&t.until>=f).map(t=>`${t.ic||'•'} ${t.n} (${modTxt(t)||'ไม่กระทบคุณ'} อีก ${t.until-f+1} ชั้น)`);L.push(...laterNow(R));
 if(R.cursed)L.push(`☠ ติดคำสาป ${R.cursed} ครั้ง (อันตราย +${Math.round((Math.pow(1.3,R.cursed)-1)*100)}%)`);
 const D=R.dayT&&DAYS.find(x=>x.id===R.dayT);if(D)L.push(`📅 ${D.n}`);
 return L.length?'หอตอนนี้: '+L.join(' · '):'';}
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
 if(cid(R)==='far'&&pathTier(R))L.forEach(x=>x.cost=Math.round(x.cost*(1-.08*pathTier(R))));
 {const pk=hzF(R,'p');if(pk!==1)L.forEach(x=>x.cost=Math.round(x.cost*pk));} // v2.7 tower mods: shop prices
 return L.map(x=>Object.assign(x,{dis:h.gold<x.cost||(x.id==='heal'&&h.hp>=h.mhp-.5&&h.mp>=h.mmp-.5)}));}
function buy(R,id){const it=shopList(R).find(x=>x.id===id);if(!it||it.dis)return false;const h=R.h,f=R.floor;h.gold-=it.cost;R.buys[id]=(R.buys[id]||0)+1;
 if(id==='heal'){h.hp=h.mhp;h.mp=h.mmp;R.buys.heal=0;}else if(id==='pot'){R.potions++;R.buys.pot=0;}else if(id==='warp'){R.warps++;R.buys.warp=0;}
 else if(id==='atk')h.atk+=1.5+f*.1;else if(id==='def')h.def+=1+f*.07;else if(id==='mhp'){h.mhp*=1.1;h.hp+=h.mhp*.1/1.1;}else if(id==='luk')h.luk+=3;
 else if(id==='rank'){const q=RANKS[h.rank+1].m/RANKS[h.rank].m;h.rank++;h.mhp*=q;h.hp*=q;h.atk*=q;h.def*=q;h.mmp*=q;}
 return true;}
// --- AI policy (also the default answer when a decision timer runs out) ---
function aiPick(R,ev){const h=R.h,hf=h.hp/h.mhp;
 if(ev.kind==='ev'){let best=0,bs=-1e9;EVENTS[ev.ti].c.forEach((ch,i)=>{if(chDis(R,ch)||(ch.cl&&ch.cl!==cid(R)))return;let s=rnd()+(pathPts(R,ch.tg)>0?.15:0)+(ch.cl?.15:0);{const kv=(ch.g&&ch.g.k||0)+(ch.b&&ch.b.k||0)*(ch.p||0);if(kv)s+=Math.sign(kv)*kLean(R)*1.2;}if(ch.p)s-=ch.p*(hf<.5?3:.8);
  if(ch.g&&ch.g.hp>0&&hf<.6)s+=1.2;if(ch.g&&ch.g.hp<0&&hf<.5)s-=1;if(s>bs){bs=s;best=i;}});return best;}
 if(ev.kind==='mon'){const w=estimateWin(R,ev.en,24);if(w>=.75)return 0;if(ev.en.pet&&R.pets.length<2&&w>=.5&&rnd()<.5)return 2;return 1;}
 if(ev.kind==='pet')return kLean(R)<-.4&&rnd()<-kLean(R)?2:0;
 if(ev.kind==='comp'){if(R.comps.length>=2||cid(R)==='nec')return 2;if(h.gold>=compCost(R,ev.comp)+20)return 0;return hf>.6?1:2;}
 if(ev.kind==='boss')return aiBoss(R,ev);
 return 0;}
// auto mode boss policy: more cautious than engine.js, since losing a boss is the one real death besides fate; sneak only when its odds (pass, or win the ambush) beat a straight fight
function aiBoss(R,ev){const w=estimateWin(R,ev.en,60),top=R.floor>=100,cw=(R.warps>0||R.h.gold>=warpCost(R))&&!top;if(w>=.6)return 0;if(cw&&w<.45)return 1;if(top)return 0;
 const p=sneakCh(R);return p+(1-p)*sneakWin(R,ev.en,40)>w+SNK.ai?2:0;}
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
   K.text=`นั่งลับอาวุธอยู่ข้างบันได ผ้าคลุมมีรอยไหม้เต็มไปหมด ${vpick(R,'merc:'+T.id+':'+R.floor,T.lines)} นิสัย: ${T.n} (${T.d})`;K.vis={t:'comp',cls:c.cls,gold:true,c:visC(c)};
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
   K.ch=[{t:'เปิดเลย',P:[{t:`ถ้าของจริง +${mimG(R,70)} ทอง +1 ยา`,c:'g'},{t:'ถ้าเป็นมิมิก โดนงับก่อนแล้วต้องสู้',c:'b'}]},
    {t:'เอาดาบเขี่ยดูก่อน',P:[{t:`ของจริง +${mimG(R,55)} ทอง`,c:'g'},{t:`มิมิก = สู้แบบไม่โดนงับก่อน (~${w}%)`,c:'w'},{t:'ชนะได้ของดี',c:'g'}]},
    {t:'ปล่อยมันไว้อย่างนั้น',P:[{t:'ไม่เสี่ยง',c:''}]}];
   K.ai=seen&&isM?(K.data.w>=.65?1:2):(R.h.hp/R.h.mhp>.5?1:2);},
  res(R,K,i,out){const f=R.floor,s=scl(f),h=R.h,{isM,en}=K.data;
   if(i===2){R.map[f-1]='calm';say(R,out,isM?'เดินผ่านไปได้ไม่กี่ก้าว ก็ได้ยินเสียงฟันกระทบกันดังกึกๆ ไล่หลังมา':'คุณเดินผ่านหีบไป ไม่มีวันได้รู้ว่าข้างในมีอะไร','info');return;}
   if(!isM){const g=mimG(R,i===0?70:55);h.gold+=g;if(i===0)R.potions++;out.coins=g;R.map[f-1]='treasure';out.chest=true;
    say(R,out,`หีบของจริง! ได้ทอง ${g}${i===0?' กับยาอีกหนึ่งขวด':''}`,'good');return;}
   R.map[f-1]='fight';say(R,out,i===0?'ฝาหีบอ้าออก มีลิ้นยาวพุ่งออกมาพร้อมฟันซี่แหลม! มิมิกนี่เอง':'ปลายดาบแตะฝาหีบปุ๊บ มันก็แยกเขี้ยวใส่ทันที','bad');
   const win=doFight(R,en,out,{ambush:i===0,cause:`ถูกมิมิกงับ (ชั้น ${f})`});
   if(win){const g=Math.round(90*s*MD(R,'loot',1)*gMul(R));h.gold+=g;h.atk+=2+f*.08;out.coins=(out.coins||0)+g;say(R,out,`ในท้องมิมิกมีทองอีก ${g} กับมีดสั้นเก่าเล่มหนึ่ง (ATK เพิ่ม)`,'good');}}},
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
 wounded:{w:3,mk(R,K){const f=R.floor,ga=2+f*.12;K.data={ga};K.tag=`ชั้น ${f} · คนเจ็บข้างทาง`;K.title='ทหารบาดเจ็บ';K.vis={t:'comp',cls:'war',c:{n:'ทหารบาดเจ็บ',cls:'war',tr:'shield',legend:false}};
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
 starfall:{w:1,mk(R,K){const f=R.floor,a=4+f*.2,d=2+f*.1,g=gG(R,150);K.data={a,d,g};K.tag=`ชั้น ${f} · ดาวตก`;K.title='ดาวที่ตกลงมาในหอคอย';K.vis={t:'prop',pr:'star'};
   K.text='เพดานชั้นนี้เปิดโล่งเห็นฟ้า ดาวดวงหนึ่งตกลงมาห่างไปไม่กี่ก้าว พื้นหินรอบๆ ยังแดงร้อน ตำนานเล่าว่าคนแรกที่แตะดาวตกจะได้หนึ่งคำขอ';
   K.ch=[CH('ขอพลัง',[{t:`ATK +${a.toFixed(1)} · DEF +${d.toFixed(1)}`,c:'g'}]),CH('ขอชีวิต',[{t:'ชะตายืดออกไปมาก',c:'g'}]),CH('ขอทอง',[{t:`+${g} ทอง`,c:'g'}])];K.ai=1;},
  res(R,K,i,out){const f=R.floor,h=R.h,{a,d,g}=K.data;R.map[f-1]='treasure';
   if(i===0){h.atk+=a;h.def+=d;say(R,out,'แสงดาวไหลเข้าไปในแขนทั้งสองข้าง ดาบในมือเบาเหมือนกิ่งไม้','lv');}
   else if(i===1){const dd=shiftFate(R,ri(5,9));say(R,out,`ดาวดับลงช้าๆ ในฝ่ามือ ${fateFeel(dd)}`,'lv');}
   else{h.gold+=g;out.coins=g;say(R,out,`ดาวแตกออกเป็นก้อนทองเล็กๆ ${g} ก้อน`,'lv');}}},
 dragon:{w:1,mk(R,K){const f=R.floor,s=scl(f),sp=clamp(.35+eLuk(R)*.012,.35,.8),en=drgMod(R,Object.assign(mkMon({hp:2.2,atk:1.5,def:1.4},f,1),{id:'sala',n:'มังกรเกล็ดเขียว',drg:1})),w=estimateWin(R,en,40);
   K.data={sp,en,g:gG(R,180)};K.tag=`ชั้น ${f} · รังมังกร`;K.title='มังกรหลับ';K.vis={t:'en',en};
   K.text='มังกรเกล็ดเขียวขดตัวหลับอยู่บนกองทอง ลมหายใจร้อนจนปลายผมคุณหยิก ทองกองที่ใกล้ที่สุดอยู่ห่างแค่สามก้าว';
   K.ch=[CH('ย่องไปหยิบทอง',[{t:`${Math.round(sp*100)}% ได้ ${K.data.g} ทอง`,c:'g'},{t:'พลาด = มันตื่น',c:'b'}]),CH('ปลุกมันขึ้นมาสู้',[{t:`โอกาสชนะ ~${Math.round(w*100)}%`,c:w>=.6?'g':'b'},{t:'ชนะได้ทองทั้งกอง',c:'g'}]),CH('ก้มหัวให้แล้วเดินผ่าน',[{t:'DEF +',c:'g'},kk(2)])];
   if(clanM(R)==='s')K.ch[1].P.push({t:'ชนะ = คำสาปตระกูลเบาลง',c:'g'});
   K.ai=w>=.75?1:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{sp,en,g}=K.data;
   if(i===2){R.karma+=2;h.def+=2+f*.05;R.map[f-1]='good';say(R,out,'มังกรลืมตาข้างหนึ่ง สะบัดเกล็ดหลุดมาให้แผ่นหนึ่ง แล้วหลับต่อ (DEF เพิ่ม)','good');return;}
   if(i===0&&rnd()<sp){h.gold+=g;out.coins=g;R.map[f-1]='treasure';say(R,out,`คุณกวาดทองได้ ${g} แล้วย่องออกมาโดยที่มันไม่ขยับเลย`,'good');return;}
   R.map[f-1]='fight';say(R,out,i===0?'เหรียญหล่นกระทบพื้นดังกริ๊ง มังกรลืมตาขึ้นทันที':'คุณตะโกนปลุกมันจนเสียงก้องไปทั้งชั้น','bad');
   if(doFight(R,en,out,{ambush:i===0,cause:`ถูกมังกรเผาที่ชั้น ${f}`})){const g2=Math.round(g*1.5);h.gold+=g2;h.atk+=3+f*.1;out.coins=g2;say(R,out,'ทองบนรังทั้งหมดเป็นของคุณ เกล็ดมังกรยังเอามาพันด้ามดาบได้อีก','lv');}}}});
// ---- key moments wave 2: wandering NPCs, small bargains, a few legends (helpers first) ----
const gS=(R,b)=>Math.round(b*scl(R.floor));
const gG=(R,b)=>Math.round(b*scl(R.floor)*gMul(R));
const NOG={t:'(ทองไม่พอ)',c:'b'};
const ngP=(R,c)=>R.h.gold<c?[NOG]:[];
const npc=pr=>({t:'prop',pr,fb:'npc'});
const wPart=w=>({t:`โอกาสชนะ ~${w}%`,c:w>=65?'g':w>=40?'w':'b'});
const estW=(R,en)=>Math.round(estimateWin(R,en,30)*100);
function foe(R,n,cls,k){return Object.assign(mkMon({hp:k,atk:k,def:k},R.floor,1),{id:'merc',n,cls,boss:false});}
function beast(R,k,fm){const t=pick(monsOf(biome(R.floor))),en=modMon(R,mkMon(t,R.floor,k),MD(R,'mon',1));if(fm)en.n=fm.replace('{m}',t.n);return en;}
// a companion shaped like genComp's output
function mkHire(R,n,cls,tr,k){const T=TRAITS.find(t=>t.id===tr)||TRAITS[0];return{n,cls,pw:(4+R.floor*.6)*(k||1)*MD(R,'cp',1)*(T.pw||1),tr:T.id,line:T.lines[0],cm:T.cost||1};}
function hire(R,out,c){if(cid(R)==='nec')return addComp(R,c,out);if(R.comps.length>=2){const wk=[...R.comps].sort((a,b)=>a.pw-b.pw)[0];R.comps.splice(R.comps.indexOf(wk),1);say(R,out,`${wk.n}ขอแยกทางไปเงียบๆ`,'info');}addComp(R,c,out);}
const fullP=R=>R.comps.length>=2?[{t:`(ปลด${[...R.comps].sort((a,b)=>a.pw-b.pw)[0].n}ออกแทน)`,c:'w'}]:[];
const coin=(R,out,g)=>{if(cid(R)==='rog')g=Math.round(g*(1+.12*pathTier(R)));R.h.gold+=g;out.coins=(out.coins||0)+g;return g;};
const heal=(R,k)=>{R.h.hp=Math.min(R.h.mhp,R.h.hp+R.h.mhp*k);};
const xp=(R,out,b,k)=>gainExp(R,b+k*R.floor,out);
const skipN=(R,n)=>Math.max(0,Math.min(n,Math.ceil(R.floor/10)*10-1-R.floor));
// v2.7: flat MP gifts grow with the floor like ATK/DEF gifts do (1+f/30); chest gold shown on the card = gold paid out
const mpU=(R,b)=>Math.round(b*(1+R.floor/30));
const mimG=(R,b)=>Math.round(b*scl(R.floor)*(cid(R)==='rog'?1.3:1)*MD(R,'loot',1)*gMul(R));
Object.assign(SPECIAL,{
 smith:{w:2,mk(R,K){const f=R.floor,ca=gS(R,30),cd=gS(R,28),a=3+f*.14,d=2.2+f*.1;K.data={ca,cd,a,d};
   K.tag=`ชั้น ${f} · ช่างตีเหล็กพเนจร`;K.title='ช่างตีเหล็กกลางบันได';K.vis=npc('smith');
   K.text='ชายแขนใหญ่เท่าต้นขาตั้งทั่งไว้กลางบันได ค้อนลงทีไรประกายไฟก็กระเด็นใส่ผนัง เขาเหลือบมองอาวุธของคุณ "บิ่นหมดแล้วนั่น เอามาให้ข้าดูหน่อย"';
   K.ch=[CH('ตีดาบใหม่ทั้งเล่ม',[{t:`−${ca} ทอง`,c:'w'},{t:`ATK +${a.toFixed(1)}`,c:'g'},...ngP(R,ca)],R.h.gold<ca),
    CH('ตีเกราะให้หนาขึ้น',[{t:`−${cd} ทอง`,c:'w'},{t:`DEF +${d.toFixed(1)}`,c:'g'},...ngP(R,cd)],R.h.gold<cd),
    CH('ช่วยสูบเตาแลกค่าแรง',[{t:'HP −15%',c:'b'},{t:`ATK +${(a*.5).toFixed(1)}`,c:'g'}])];
   K.ai=R.h.gold>=ca+20?0:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{ca,cd,a,d}=K.data;R.map[f-1]='good';
   if(i===0){h.gold-=ca;h.atk+=a;say(R,out,'เขาตีดาบอยู่ทั้งคืน พอชุบน้ำเสร็จ ใบดาบก็ส่งเสียงหึ่งเบาๆ','good');}
   else if(i===1){h.gold-=cd;h.def+=d;say(R,out,'เกราะหนักขึ้นนิดหน่อย แต่รอยบุบทุกรอยเรียบหมดแล้ว','good');}
   else{h.hp-=h.mhp*.15;h.atk+=a*.5;R.map[f-1]='calm';say(R,out,'สูบเตาจนแขนแทบหลุด เขาตอบแทนด้วยการลับดาบให้ฟรีหนึ่งรอบ','good');}}},
 bard:{w:2,mk(R,K){const f=R.floor,c=gS(R,15),g=gG(R,25);K.data={c,g};K.tag=`ชั้น ${f} · นักกวีพเนจร`;K.title='นักกวีขี้เมา';K.vis=npc('bard');
   K.text='ชายถือพิณสามสายนั่งพิงราวบันได เมาจนหน้าแดงก่ำ แต่เสียงเพลงยังเพราะอยู่ "ให้ข้าแต่งเพลงเรื่องเจ้าไหม ชื่อเจ้าจะได้ดังไปถึงยอดหอ"';
   K.ch=[CH('จ้างให้แต่งเพลง',[{t:`−${c} ทอง`,c:'w'},{t:'LUK +3',c:'g'},...ngP(R,c)],R.h.gold<c),
    CH('ร้องคลอไปด้วยทั้งคืน',[{t:'HP +30%',c:'g'},{t:'+EXP',c:'g'}]),
    CH('ขโมยพิณตอนเขาหลับ',[{t:`+${g} ทอง`,c:'g'},kk(-2)])];K.ai=R.h.gold>=c+20?0:1;},
  res(R,K,i,out){const f=R.floor,h=R.h,{c,g}=K.data;
   if(i===0){h.gold-=c;h.luk+=3;R.map[f-1]='good';say(R,out,'ท่อนแรกของเพลงฟังดูเกินจริงไปมาก แต่คุณก็ฮัมตามไปอีกหลายชั้น','good');}
   else if(i===1){heal(R,.3);xp(R,out,6,1.5);R.map[f-1]='calm';say(R,out,'ร้องกันจนเสียงแหบ ตื่นมาเขาหายไปแล้ว เหลือแต่ขวดเหล้าเปล่าวางอยู่ข้างตัว','good');}
   else{coin(R,out,g);R.karma-=2;R.map[f-1]='evil';say(R,out,`พ่อค้าเร่ชั้นถัดไปรับซื้อพิณไป ${g} ทอง เสียงกรนของนักกวียังดังไล่หลังมา`,'bad');}}},
 thief:{w:2,mk(R,K){const f=R.floor,g=gG(R,35),c=gS(R,10),cp=mkHire(R,pick(COMPN),'arc','cheap',.95),hc=compCost(R,cp);K.data={g,c,cp,hc};
   K.tag=`ชั้น ${f} · หัวขโมย`;K.title='มือที่ล้วงเข้ามาในถุงทอง';K.vis=npc('thief');
   K.text=`มือผอมๆ ล้วงเข้ามาในถุงทองของคุณ คุณคว้าข้อมือไว้ทัน เป็นเด็กหนุ่มมอมแมมชื่อ${cp.n} กระเป๋าเสื้อตุงไปด้วยของที่ล้วงมาจากคนอื่น "ปล่อยข้าเถอะ หรือจะจ้างข้าก็ได้นะ กุญแจแบบไหนข้าก็เปิดได้"`;
   K.ch=[CH('ริบของที่เขาขโมยมาทั้งหมด',[{t:`+${g} ทอง`,c:'g'},kk(-1)]),
    CH('ปล่อยไปพร้อมเศษเงิน',[{t:`−${c} ทอง`,c:'w'},{t:'LUK +2',c:'g'},kk(2),...ngP(R,c)],R.h.gold<c),
    CH('จ้างเขาเข้าทีม',[{t:`−${hc} ทอง`,c:'w'},{t:`พลัง ${Math.round(cp.pw)}`,c:'g'},{t:'ขอส่วนแบ่งทุกครั้งที่ล้มบอส',c:'b'},...fullP(R),...ngP(R,hc)],R.h.gold<hc)];
   K.ai=R.comps.length<2&&R.h.gold>=hc+20?2:R.h.gold>=c?1:0;},
  res(R,K,i,out){const f=R.floor,h=R.h,{g,c,cp,hc}=K.data;
   if(i===0){coin(R,out,g);R.karma-=1;R.map[f-1]='treasure';say(R,out,`ในกระเป๋าเสื้อมีทอง ${g} กับแหวนอีกสองวง เขาร้องไห้โฮตอนคุณเดินจากไป`,'info');}
   else if(i===1){h.gold-=c;h.luk+=2;R.karma+=2;R.map[f-1]='good';say(R,out,'เขากำเหรียญไว้แน่น วิ่งไปได้ครึ่งทางก็หันมาตะโกนบอกว่าพื้นชั้นบนมีแผ่นหินกลไกสามแผ่น','good');}
   else{h.gold-=hc;R.map[f-1]='comp';hire(R,out,Object.assign({},cp));}}},
 monk:{w:2,mk(R,K){const f=R.floor,c=gS(R,20),d=2+f*.09;K.data={c,d};
   K.tag=`ชั้น ${f} · พระธุดงค์`;K.title='พระนั่งสมาธิกลางบันได';K.vis=npc('monk');
   K.text='พระรูปหนึ่งนั่งสมาธิอยู่บนขั้นบันไดที่แคบที่สุด ไม่หลบให้ใคร มอนสเตอร์แถวนั้นเดินวนอยู่ห่างๆ ไม่กล้าเข้าใกล้ ท่านลืมตาข้างหนึ่งขึ้นมามองตอนคุณมาถึง';
   K.ch=[CH('นั่งสมาธิกับท่านหนึ่งคืน',[{t:'5 ชั้นข้างหน้า โอกาสตายลดลง 30%',c:'g'}]),
    CH('ถวายทองทำบุญ',[{t:`−${c} ทอง`,c:'w'},{t:'ชะตายืดออกนิดหน่อย',c:'g'},kk(2),...ngP(R,c)],R.h.gold<c),
    CH('ขอให้ท่านสอนมวย',[{t:'HP −15%',c:'b'},{t:`DEF +${d.toFixed(1)}`,c:'g'}])];K.ai=0;},
  res(R,K,i,out){const f=R.floor,h=R.h,{c,d}=K.data;
   if(i===0){R.hzT.push({k:.7,until:f+5,n:'ใจนิ่งหลังนั่งสมาธิทั้งคืน',ic:'🧘'});R.map[f-1]='calm';say(R,out,'นั่งไปได้ครึ่งคืนขาก็ชาจนไม่รู้สึก แต่พอรุ่งเช้า ใจคุณนิ่งกว่าที่เคยเป็นมา','good');}
   else if(i===1){h.gold-=c;R.karma+=2;const dd=shiftFate(R,ri(1,3));R.map[f-1]='good';say(R,out,`ท่านรับทองไว้ แล้วเอาไปใส่มือขอทานที่ชั้นล่างต่อทันที ${fateFeel(dd)}`,'good');}
   else{h.hp-=h.mhp*.15;h.def+=d;R.map[f-1]='calm';say(R,out,'ท่านตบไหล่คุณเบาๆ ทีเดียว คุณกระเด็นไปติดผนัง แต่ก็ได้รู้วิธีรับแรงกระแทก','good');}}},
 cat:{w:2,mk(R,K){const f=R.floor,p=riskAdj(R,.4),en=beast(R,1),w=estW(R,en);K.data={p,en};
   K.tag=`ชั้น ${f} · แมวดำ`;K.title='แมวดำขวางบันได';K.vis=npc('cat');
   K.text='แมวดำตาสีเหลืองนั่งเลียอุ้งเท้าอยู่กลางบันได ไม่มีท่าว่าจะหลบ คนแก่ที่หมู่บ้านเคยเตือนไว้ว่าเจอแมวดำในที่สูง ห้ามเดินข้ามหน้ามัน';
   K.ch=[CH('ก้มลงลูบหัวมัน',[{t:`${100-Math.round(p*100)}% LUK +3`,c:'g'},{t:`/ ${Math.round(p*100)}% โดนข่วน HP −10% LUK −1`,c:'b'}]),
    CH('เดินอ้อมไปทางมืด',[{t:'ต้องสู้!',c:'b'},wPart(w),{t:'+EXP +ทอง',c:'g'}]),
    CH('อุ้มมันไปวางข้างทางเบาๆ',[kk(1)])];K.ai=w>=70?1:0;},
  res(R,K,i,out){const f=R.floor,h=R.h;
   if(i===0){if(rnd()<K.data.p){h.hp-=h.mhp*.1;h.luk=Math.max(0,h.luk-1);R.map[f-1]='bad';say(R,out,'มันตะปบมือคุณเป็นแผลสามริ้วแล้ววิ่งหายไป แผลแสบไปอีกหลายชั้น','bad');}
    else{h.luk+=3;R.map[f-1]='good';say(R,out,'มันครางเบาๆ เอาหัวถูขาคุณ แล้วเดินนำขึ้นบันไดไปเหมือนชี้ทาง','good');}}
   else if(i===1){R.map[f-1]='fight';say(R,out,`ทางอ้อมมืดสนิท แล้ว${K.data.en.n}ก็โผล่ออกมาจริงๆ`,'bad');doFight(R,K.data.en,out,{rw:1.5});}
   else{R.karma+=1;R.map[f-1]='calm';say(R,out,'มันไม่ขัดขืนเลย แต่ตอนคุณเดินผ่าน มันหันมามองตามจนลับตา','info');}}},
 hunter:{w:2,mk(R,K){const f=R.floor,en=beast(R,1.35,'{m}ตัวยักษ์');en.atk*=.85;const w=estW(R,en),c=gS(R,25),d=2+f*.09;K.data={en,c,d};
   K.tag=`ชั้น ${f} · นายพราน`;K.title='นายพรานกับรอยเท้าใหญ่';K.vis=npc('hunter');
   K.text=`นายพรานหนวดเฟิ้มนั่งยองๆ ดูรอยเท้าบนพื้นฝุ่น "${en.n}ตัวนี้ใหญ่กว่าทุกตัวที่ข้าเคยล่ามา ไปด้วยกันไหม ข้ายิงสกัดให้ เจ้าเข้าไปฟัน"`;
   K.ch=[CH('ออกล่าด้วยกัน',[wPart(w),{t:'ชนะได้ทองกับ EXP สองเท่า',c:'g'},{t:'แพ้ = บาดเจ็บหนัก',c:'b'}]),
    CH('ซื้อหนังสัตว์ไปบุเกราะ',[{t:`−${c} ทอง`,c:'w'},{t:`DEF +${d.toFixed(1)}`,c:'g'},...ngP(R,c)],R.h.gold<c),
    CH('บอกเขาว่ามันกำลังเลี้ยงลูกอ่อน',[{t:'LUK +1',c:'g'},kk(2)])];K.ai=w>=70?0:R.h.gold>=c+20?1:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{en,c,d}=K.data;
   if(i===0){R.map[f-1]='fight';say(R,out,'นายพรานยิงธนูปักขามันไว้ คุณพุ่งเข้าไปก่อนมันจะดึงออก','info');doFight(R,en,out,{rw:2,cause:`ถูก${en.n}ขย้ำระหว่างล่า (ชั้น ${f})`});}
   else if(i===1){h.gold-=c;h.def+=d;R.map[f-1]='calm';say(R,out,'หนังสัตว์เหนียวจนมีดแทบไม่เข้า เย็บบุเกราะได้สองชั้น','good');}
   else{h.luk+=1;R.karma+=2;R.map[f-1]='good';say(R,out,'นายพรานนิ่งไปนาน แล้วปลดสายธนูลง "ปีนี้ข้าได้แค่นี้ก็พอแล้ว"','good');}}},
 scholar:{w:2,mk(R,K){const f=R.floor,p=clamp(.45+eLuk(R)*.008+(cid(R)==='mag'?.2:0),.4,.85),c=gS(R,20);K.data={p,c};
   K.tag=`ชั้น ${f} · นักปราชญ์`;K.title='ปริศนาของนักปราชญ์';K.vis=npc('scholar');
   K.text='ชายแก่ใส่แว่นหนาเตอะนั่งอยู่บนกองหนังสือที่สูงกว่าตัวเขาอีก "ตอบปริศนาข้าได้ ข้าจะยกความรู้ให้ครึ่งหัว ตอบผิดก็แค่โดนหนังสือฟาดหัวสักเล่ม"';
   K.ch=[CH('รับคำท้า',[{t:`${Math.round(p*100)}% EXP ก้อนใหญ่ · MP สูงสุด +${mpU(R,10)}`,c:'g'},{t:`/ ${100-Math.round(p*100)}% โดนฟาด HP −15%`,c:'b'}]),
    CH('ซื้อตำราเล่มที่บางที่สุด',[{t:`−${c} ทอง`,c:'w'},{t:'+EXP',c:'g'},...ngP(R,c)],R.h.gold<c),
    CH('ช่วยแบกหนังสือขึ้นไปส่ง',[{t:'HP −10%',c:'b'},{t:'LUK +1',c:'g'},kk(1)])];K.ai=p>=.6?0:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{p,c}=K.data;
   if(i===0){if(rnd()<p){xp(R,out,15,3);const m=mpU(R,10);h.mmp+=m;h.mp+=m;R.map[f-1]='good';say(R,out,'คุณตอบได้ก่อนเขาถามจบ เขาเลยนั่งสอนจนคุณหัวตื้อไปทั้งคืน','good');}
    else{h.hp-=h.mhp*.15;R.map[f-1]='bad';say(R,out,'ตอบผิด หนังสือเล่มที่หนาที่สุดฟาดลงกลางกระหม่อม','bad');}}
   else if(i===1){h.gold-=c;xp(R,out,8,1.8);R.map[f-1]='calm';say(R,out,'ตำราบางนิดเดียว อ่านจบก่อนถึงชั้นถัดไป ข้างในมีแผนผังรังมอนสเตอร์ของชั้นแถวนี้','good');}
   else{h.hp-=h.mhp*.1;h.luk+=1;R.karma+=1;R.map[f-1]='good';say(R,out,'หนังสือหนักยิ่งกว่าหิน เขาบ่นตลอดทางว่าคุณเดินช้า แต่ก่อนแยกกันก็อวยพรให้','good');}}},
 noble:{w:2,mk(R,K){const f=R.floor,g=gG(R,45),r=gG(R,80);K.data={g,r};
   K.tag=`ชั้น ${f} · ลูกขุนนาง`;K.title='ลูกขุนนางหนีออกจากบ้าน';K.vis=npc('noble');
   K.text='เด็กหนุ่มแต่งตัวหรูเกินกว่าจะมาอยู่ในหอนี้ ดาบที่เอวยังไม่เคยเปื้อนเลือดสักหยด "ข้าจะปีนให้ถึงยอด ท่านพ่อจะได้เลิกดูถูกข้าเสียที"';
   K.ch=[CH('พาเขาลงไปส่งบ้าน',[{t:'HP −15%',c:'b'},{t:`+${g} ทอง (ค่าตอบแทน)`,c:'g'},kk(1)]),
    CH('สอนวิชาดาบให้สักสองสามท่า',[{t:'+EXP',c:'g'},kk(2)]),
    CH('จับไปเรียกค่าไถ่',[{t:`+${r} ทอง`,c:'g'},{t:'✧ กรรมชั่วหนัก',c:'kk'}])];K.ai=1;},
  res(R,K,i,out){const f=R.floor,h=R.h,{g,r}=K.data;
   if(i===0){h.hp-=h.mhp*.15;coin(R,out,g);R.karma+=1;R.map[f-1]='good';say(R,out,'แม่ของเขาร้องไห้กอดลูกแน่น ส่วนพ่อยื่นถุงทองให้คุณโดยไม่พูดสักคำ','good');}
   else if(i===1){xp(R,out,8,1.5);R.karma+=2;R.map[f-1]='good';say(R,out,'เขาฝึกจนมือพอง แล้วสัญญาว่าจะกลับบ้านไปซ้อมให้ดีก่อนค่อยมาใหม่','good');}
   else{coin(R,out,r);R.karma-=4;R.map[f-1]='evil';say(R,out,`คนรับใช้ของตระกูลมาจ่ายค่าไถ่ ${r} ทอง แววตาของเด็กคนนั้นตอนถูกพากลับไม่เหมือนเดิมอีกแล้ว`,'bad');}}},
 cultist:{w:2,mk(R,K){const f=R.floor,en=foe(R,'ผู้นำลัทธิ','mag',1.15),w=estW(R,en),g=gG(R,45);K.data={en,g};
   K.tag=`ชั้น ${f} · ลัทธิลับ`;K.title='พิธีป้อนหอคอย';K.vis=npc('cultist');
   K.text='คนในชุดคลุมแดงหลายสิบคนนั่งสวดล้อมวงเทียน กลางวงมีคนถูกมัดไว้สองคน ผู้นำหันมายิ้มให้ "หอคอยหิวอยู่เสมอ ป้อนมันสักหน่อย แล้วมันจะปล่อยเจ้าไว้นานขึ้น"';
   K.ch=[CH('เข้าร่วมพิธี',[{t:'ชะตายืดออก',c:'g'},{t:'HP สูงสุด −8%',c:'b'},kk(-3)]),
    CH('บุกล้มพิธีแล้วแก้มัดให้เหยื่อ',[{t:'สู้กับผู้นำลัทธิ',c:'b'},wPart(w),{t:`ชนะ +${g} ทอง`,c:'g'},kk(3)]),
    CH('แอบหยิบเครื่องเซ่นตอนทุกคนหลับตา',[{t:`+${g} ทอง`,c:'g'},kk(-1)])];K.ai=w>=65?1:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{en,g}=K.data;
   if(i===0){h.mhp*=.92;h.hp=Math.min(h.hp,h.mhp);R.karma-=3;const d=shiftFate(R,ri(3,5));R.map[f-1]='evil';say(R,out,`คุณร่วมสวดจนรุ่งเช้า เหยื่อสองคนหายไปจากวงตอนไหนไม่มีใครเห็น ${fateFeel(d)}`,'bad');}
   else if(i===1){R.karma+=3;R.map[f-1]='fight';say(R,out,'คุณถีบเทียนล้มทั้งวง ผู้นำลัทธิลุกขึ้นพร้อมคาถาเต็มปาก','bad');
    if(doFight(R,en,out,{cause:`ถูกผู้นำลัทธิสังเวยกลางวงเทียน (ชั้น ${f})`})){coin(R,out,g);say(R,out,`เหยื่อสองคนวิ่งหนีลงบันไดไปได้ ใต้แท่นบูชามีทองซ่อนอยู่ ${g}`,'good');}}
   else{coin(R,out,g);R.karma-=1;R.map[f-1]='treasure';say(R,out,`คุณกวาดเครื่องเซ่นใส่ถุงได้ ${g} ทอง เสียงสวดไม่สะดุดเลยสักคำ`,'info');}}},
 imp:{w:2,mk(R,K){const f=R.floor,a=4+f*.2,d=1.5+f*.07,g=gG(R,60),p=riskAdj(R,.35),gb=gG(R,40);K.data={a,d,g,p,gb};
   K.tag=`ชั้น ${f} · สัญญาปีศาจ`;K.title='ปีศาจตัวจ้อยกับม้วนสัญญา';K.vis=npc('imp');
   K.text='ปีศาจตัวเท่าแมวนั่งไขว่ห้างอยู่บนกองกระดูก ม้วนสัญญายาวลากไปถึงพื้น "เซ็นตรงนี้ ได้ของทันที จ่ายทีหลัง ไม่มีดอกเบี้ยด้วย ข้าสาบาน"';
   K.ch=[CH('เซ็นขอพลัง',[{t:`ATK +${a.toFixed(1)}`,c:'g'},{t:`DEF −${d.toFixed(1)}`,c:'b'}]),
    CH('เซ็นขอทอง',[{t:`+${g} ทอง`,c:'g'},{t:'LUK −2',c:'b'}]),
    CH('จับมันยัดใส่ขวด',[{t:`${100-Math.round(p*100)}% ขายได้ +${gb} ทอง`,c:'g'},{t:`/ ${Math.round(p*100)}% โดนพ่นไฟ HP −20%`,c:'b'}])];K.ai=2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{a,d,g,p,gb}=K.data;
   if(i===0){h.atk+=a;h.def=Math.max(1,h.def-d);R.map[f-1]='bad';say(R,out,'ลายเซ็นของคุณลุกเป็นไฟ แขนข้างที่ถือดาบร้อนผ่าว แต่ผิวหนังบางลงเหมือนกระดาษ','bad');}
   else if(i===1){coin(R,out,g);h.luk=Math.max(0,h.luk-2);R.map[f-1]='treasure';say(R,out,'ทองไหลออกมาจากม้วนสัญญาไม่หยุด ปีศาจหัวเราะคิกคักตอนเก็บม้วนเข้าอก','info');}
   else if(rnd()<p){h.hp-=h.mhp*.2;R.map[f-1]='trap';out.cause=`ถูกปีศาจพ่นไฟใส่หน้า (ชั้น ${f})`;say(R,out,'มันพ่นไฟใส่หน้าคุณแล้วกระโดดหนีออกทางหน้าต่าง','bad');}
   else{coin(R,out,gb);R.map[f-1]='treasure';say(R,out,`คุณปิดจุกขวดได้ทัน พ่อค้าชั้นถัดไปให้ ${gb} ทองโดยไม่ถามอะไรสักคำ`,'good');}}},
 healer:{w:2,mk(R,K){const f=R.floor,c1=gS(R,35),c2=gS(R,20);K.data={c1,c2};
   K.tag=`ชั้น ${f} · หมอยาพเนจร`;K.title='หมอยาสะพายตะกร้า';K.vis=npc('healer');
   K.text=`หญิงสาวสะพายตะกร้าสมุนไพรเดินสวนลงมา แล้วหยุดมองแผลบนตัวคุณ ${R.scars?`"แผลเป็น${R.scars>1?'ทั้ง '+R.scars+' แห่ง':''}นี่ ถ้าไม่รักษา สักวันมันจะกำเริบพร้อมกัน"`:'"ตัวยังดีอยู่นะ แต่ขึ้นไปอีกไม่นานก็คงมีแผลแล้วล่ะ"'}`;
   K.ch=[CH('ให้เธอรักษาแผลเป็น',[{t:`−${c1} ทอง`,c:'w'},{t:'แผลเป็น −1 (โอกาสตายรายชั้นลดลง)',c:'g'},...(R.scars<1?[{t:'(ไม่มีแผลเป็น)',c:'b'}]:ngP(R,c1))],R.scars<1||R.h.gold<c1),
    CH('ซื้อยาสองขวด',[{t:`−${c2} ทอง`,c:'w'},{t:'+2 ยา',c:'g'},...ngP(R,c2)],R.h.gold<c2),
    CH('ช่วยเธอเก็บสมุนไพร',[{t:'HP −10%',c:'b'},{t:'+1 ยา',c:'g'},kk(1)])];K.ai=R.scars&&R.h.gold>=c1?0:R.h.gold>=c2?1:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{c1,c2}=K.data;
   if(i===0){h.gold-=c1;R.scars=Math.max(0,R.scars-1);R.map[f-1]='good';say(R,out,'เธอพอกยาเขียวกลิ่นแรงลงบนแผลเก่า รุ่งเช้ารอยนูนนั้นก็เรียบเหมือนไม่เคยมีมาก่อน','good');}
   else if(i===1){h.gold-=c2;R.potions+=2;R.map[f-1]='calm';say(R,out,'เธอห่อยาสองขวดด้วยใบตอง แล้วกำชับว่าห้ามดื่มตอนท้องว่าง','good');}
   else{h.hp-=h.mhp*.1;R.potions++;R.karma+=1;R.map[f-1]='good';say(R,out,'หนามสมุนไพรบาดมือคุณเป็นริ้ว เธอแบ่งยาให้ขวดหนึ่งเป็นค่าแรง','good');}}},
 tomb:{w:2,mk(R,K){const f=R.floor,g=gG(R,35);K.data={g};K.tag=`ชั้น ${f} · หลุมศพข้างทาง`;K.title='หลุมศพนักผจญภัยนิรนาม';K.vis={t:'prop',pr:'grave'};
   K.text='หลุมดินพูนต่ำๆ มีดาบหักปักไว้แทนป้าย ข้างหลุมมีกระเป๋าหนังที่ยังไม่มีใครแตะ บนใบดาบมีรอยมีดสลักไว้ว่า "ถึงแค่นี้"';
   K.ch=[CH('เปิดกระเป๋าเอาของไปใช้',[{t:`+${g} ทอง`,c:'g'},{t:'+1 ยา',c:'g'},kk(-1)]),
    CH('อ่านบันทึกในกระเป๋าแล้ววางคืน',[{t:'+EXP',c:'g'}]),
    CH('ฝังกระเป๋าไปกับเขาแล้วไหว้',[{t:'LUK +1',c:'g'},kk(2)])];K.ai=2;},
  res(R,K,i,out){const f=R.floor,h=R.h;
   if(i===0){coin(R,out,K.data.g);R.potions++;R.karma-=1;R.map[f-1]='treasure';say(R,out,'ในกระเป๋ามีทอง ยาหนึ่งขวด กับจดหมายที่ยังไม่ได้ส่ง คุณวางจดหมายไว้บนหลุม','info');}
   else if(i===1){xp(R,out,10,2);R.map[f-1]='calm';say(R,out,'บันทึกเล่าทางเดินของสามชั้นถัดไปไว้ละเอียดมาก หน้าสุดท้ายเขียนค้างไว้ครึ่งประโยค','good');}
   else{h.luk+=1;R.karma+=2;R.map[f-1]='good';say(R,out,'คุณกลบดินจนเรียบ ก่อนไปมีผีเสื้อสีเทาตัวหนึ่งบินมาเกาะบนด้ามดาบ','good');}}},
 bridge:{w:2,mk(R,K){const f=R.floor,en=foe(R,'อัศวินเฝ้าสะพาน','war',1.1),w=estW(R,en),toll=gS(R,25),p=riskAdj(R,.4),d=2+f*.1;K.data={en,toll,p,d};
   K.tag=`ชั้น ${f} · สะพานข้ามเหว`;K.title='อัศวินเฝ้าสะพาน';K.vis=npc('knight');
   K.text='สะพานหินแคบๆ พาดข้ามเหวมืด อัศวินในชุดเกราะเต็มยศยืนขวางอยู่กลางสะพาน "จะผ่านต้องจ่ายค่าผ่าน หรือไม่ก็ล้มข้าให้ได้ นายข้าสั่งไว้อย่างนั้น"';
   K.ch=[CH('ท้าประลองกับเขา',[wPart(w),{t:`ชนะได้โล่ DEF +${d.toFixed(1)}`,c:'g'},{t:'แพ้ = บาดเจ็บหนัก',c:'b'}]),
    CH('จ่ายค่าผ่าน',[{t:`−${toll} ทอง`,c:'w'},{t:'ไม่เสี่ยง',c:''},...ngP(R,toll)],R.h.gold<toll),
    CH('ปีนหน้าผาอ้อมไปอีกฝั่ง',[{t:`${100-Math.round(p*100)}% +EXP`,c:'g'},{t:`/ ${Math.round(p*100)}% ลื่นตก HP −25%`,c:'b'}])];K.ai=w>=70?0:R.h.gold>=toll+20?1:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{en,toll,p,d}=K.data;
   if(i===0){R.map[f-1]='fight';say(R,out,'เขาลดหน้ากากเหล็กลง แล้วยกดาบขึ้นคำนับ','info');
    if(doFight(R,en,out,{cause:`ล้มลงกลางสะพานระหว่างประลองกับอัศวิน (ชั้น ${f})`})){h.def+=d;say(R,out,'อัศวินคุกเข่าลงแล้วยื่นโล่ให้ "สะพานนี้เป็นของเจ้าแล้ว"','good');}}
   else if(i===1){h.gold-=toll;R.map[f-1]='calm';say(R,out,'เขารับเหรียญไปนับทีละเหรียญ แล้วหลีกทางให้อย่างสุภาพที่สุด','info');}
   else if(rnd()<p){h.hp-=h.mhp*.25;R.map[f-1]='trap';out.cause=`ลื่นตกหน้าผาข้างสะพาน (ชั้น ${f})`;say(R,out,'หินที่จับหลุดติดมือ คุณร่วงลงไปกระแทกหิ้งหินข้างล่าง กว่าจะปีนกลับขึ้นมาได้ก็เกือบเช้า','bad');}
   else{xp(R,out,10,2);R.map[f-1]='good';say(R,out,'คุณปีนอ้อมไปถึงอีกฝั่งได้ อัศวินหันมามองแล้วปรบมือให้สามที','good');}}},
 crystal:{w:2,mk(R,K){const f=R.floor,g=gG(R,45);K.data={g};K.tag=`ชั้น ${f} · คริสตัลร้องเพลง`;K.title='คริสตัลที่ร้องเพลงได้';K.vis={t:'prop',pr:'crystal'};
   K.text='แท่งคริสตัลสูงท่วมหัวส่งเสียงหึ่งเป็นทำนองช้าๆ ยิ่งเดินเข้าใกล้ แผลบนตัวยิ่งเย็นลง';
   K.ch=[CH('นั่งฟังจนเพลงจบ',[{t:'HP เต็ม · MP เต็ม',c:'g'}]),
    CH('ทุบเอาเศษไปขาย',[{t:`+${g} ทอง`,c:'g'},kk(-1)]),
    CH('แตะมันด้วยมือเปล่า',[{t:'HP −10%',c:'b'},{t:`MP สูงสุด +${mpU(R,8)}`,c:'g'},{t:'LUK +1',c:'g'}])];K.ai=R.h.hp/R.h.mhp<.6?0:1;},
  res(R,K,i,out){const f=R.floor,h=R.h;
   if(i===0){h.hp=h.mhp;h.mp=h.mmp;R.map[f-1]='good';say(R,out,'เพลงจบตอนฟ้าสาง แผลทุกแผลบนตัวปิดสนิท','good');}
   else if(i===1){coin(R,out,K.data.g);R.karma-=1;R.map[f-1]='treasure';say(R,out,'เสียงเพลงขาดหายไปกลางท่อน เศษคริสตัลในถุงยังสั่นเบาๆ อยู่ทั้งวัน','info');}
   else{h.hp-=h.mhp*.1;const m=mpU(R,8);h.mmp+=m;h.mp+=m;h.luk+=1;R.map[f-1]='calm';say(R,out,'ความเย็นแล่นจากปลายนิ้วขึ้นไปถึงต้นคอ มือคุณเรืองแสงจางๆ อยู่หลายชั้น','good');}}},
 book:{w:2,mk(R,K){const f=R.floor;K.tag=`ชั้น ${f} · ตำราต้องห้าม`;K.title='หนังสือที่พลิกหน้าเอง';K.vis={t:'prop',pr:'book'};
   K.text='หนังสือหนาเตอะลอยอยู่กลางอากาศ หน้ากระดาษพลิกไปมาเอง ตัวอักษรบางตัวคลานออกมาเดินเล่นบนขอบหน้า แล้วก็คลานกลับเข้าไป';
   K.ch=[CH('อ่านจนจบเล่ม',[{t:'EXP ก้อนใหญ่มาก',c:'g'},{t:'อายุขัยสั้นลงนิดหน่อย',c:'b'}]),
    CH('อ่านแค่บทแรก',[{t:'+EXP',c:'g'}]),
    CH('เผาทิ้ง',[{t:'LUK +1',c:'g'},kk(2)])];K.ai=1;},
  res(R,K,i,out){const f=R.floor,h=R.h;
   if(i===0){xp(R,out,25,4.5);const d=shiftFate(R,-ri(1,3));R.map[f-1]='bad';say(R,out,`อ่านจบตอนฟ้าสาง ตาแดงก่ำ ในหัวมีคาถาที่ไม่เคยรู้มาก่อนเต็มไปหมด ${fateFeel(d)}`,'bad');}
   else if(i===1){xp(R,out,8,1.5);R.map[f-1]='calm';say(R,out,'บทแรกเป็นแค่คำนำ อ่านจบก็จำศัพท์คาถาได้สองสามคำ','good');}
   else{h.luk+=1;R.karma+=2;R.map[f-1]='good';say(R,out,'ไฟลุกท่วมทั้งเล่ม มีเสียงกรีดร้องเบาๆ ดังออกมาจากกองขี้เถ้า','good');}}},
 campfire:{w:2,mk(R,K){const f=R.floor,p=riskAdj(R,.25);K.data={p};K.tag=`ชั้น ${f} · กองไฟข้างทาง`;K.title='กองไฟของคนแปลกหน้า';K.vis={t:'prop',pr:'fire'};
   K.text='กองไฟยังไม่มอด หม้อซุปเดือดปุดๆ อยู่บนเตา เจ้าของไฟนอนกรนอยู่ข้างๆ กอดถุงเสบียงไว้แน่น';
   K.ch=[CH('นั่งผิงไฟรอเขาตื่น',[{t:'HP +40%',c:'g'},{t:`/ ${Math.round(p*100)}% เขาเป็นโจร ทอง −15%`,c:'b'}]),
    CH('ทิ้งยาไว้ให้เขาขวดหนึ่ง',[{t:'−1 ยา',c:'w'},{t:'LUK +1',c:'g'},kk(2)],R.potions<1),
    CH('ขโมยถุงเสบียงไป',[{t:'+2 ยา',c:'g'},kk(-2)])];K.ai=R.h.hp/R.h.mhp<.6?0:R.potions>=2?1:0;},
  res(R,K,i,out){const f=R.floor,h=R.h;
   if(i===0){heal(R,.4);if(rnd()<K.data.p){const lose=Math.round(h.gold*.15);h.gold-=lose;R.map[f-1]='bad';say(R,out,`คุณเผลอหลับไป ตื่นมาเขาหายไปแล้วพร้อมทอง ${lose} เหรียญ ยังดีที่ซุปอร่อย`,'bad');}
    else{R.map[f-1]='good';say(R,out,'เขาตื่นมาตักซุปให้ชามโต แล้วนั่งเล่าเรื่องลูกเมียให้ฟังจนดึก','good');}}
   else if(i===1){R.potions--;h.luk+=1;R.karma+=2;R.map[f-1]='good';say(R,out,'คุณวางยาไว้ข้างมือเขาแล้วเดินต่อ เสียงกรนไม่สะดุดเลย','good');}
   else{R.potions+=2;R.karma-=2;R.map[f-1]='evil';say(R,out,'ในถุงมียาสองขวดกับขนมปังแข็งๆ ก้อนหนึ่ง คุณเอาไปทั้งหมด','bad');}}},
 snack:{w:2,mk(R,K){const f=R.floor,c=gS(R,8);K.data={c};K.tag=`ชั้น ${f} · ยายขายขนม`;K.title='ยายขายขนมครก';K.vis=npc('granny');
   K.text='ยายแก่นั่งอยู่หน้าเตาถ่านเล็กๆ กลิ่นขนมหอมไปทั้งชั้น "ปีนมาถึงนี่หิวแย่แล้วสิ กินอะไรหน่อยไหมหลาน"';
   K.ch=[CH('ซื้อขนมกิน',[{t:`−${c} ทอง`,c:'w'},{t:'HP เต็ม',c:'g'},...ngP(R,c)],R.h.gold<c),
    CH('ช่วยยายแบกเตาขึ้นชั้นบน',[{t:'HP −15%',c:'b'},{t:'+1 ยา',c:'g'},kk(2)]),
    CH('ฉกขนมแล้ววิ่ง',[{t:'HP +30%',c:'g'},kk(-1)])];K.ai=R.h.gold>=c?0:1;},
  res(R,K,i,out){const f=R.floor,h=R.h;
   if(i===0){h.gold-=K.data.c;h.hp=h.mhp;R.map[f-1]='good';say(R,out,'ขนมครกร้อนจนลวกลิ้น แต่อร่อยจนต้องขอเพิ่มอีกถาด','good');}
   else if(i===1){h.hp-=h.mhp*.15;R.potions++;R.karma+=2;R.map[f-1]='good';say(R,out,'เตาถ่านหนักกว่าที่คิดมาก ถึงชั้นบนยายยัดยาหอมใส่มือให้ขวดหนึ่ง','good');}
   else{heal(R,.3);R.karma-=1;R.map[f-1]='evil';say(R,out,'ยายไม่ได้วิ่งตาม แค่ตะโกนไล่หลังมาว่า "กินให้อิ่มนะหลาน"','bad');}}},
 cavein:{w:2,mk(R,K){const f=R.floor,g=gG(R,50),d=2+f*.1;K.data={g,d};K.tag=`ชั้น ${f} · หินถล่ม`;K.title='คนแคระติดใต้หิน';K.vis=npc('dwarf');
   K.text='หินถล่มลงมาทับขาคนแคระคนหนึ่งไว้ เขาร้องเรียกพลางชี้ไปที่ถุงแร่ที่กระเด็นไปตกอยู่ข้างบันได "ช่วยข้าก่อน ถุงนั่นค่อยว่ากันทีหลัง"';
   K.ch=[CH('ยกหินออกให้',[{t:'HP −20%',c:'b'},{t:`DEF +${d.toFixed(1)} (เขาตีเกราะให้)`,c:'g'},kk(2)]),
    CH('คว้าถุงแร่แล้วไป',[{t:`+${g} ทอง`,c:'g'},{t:'✧ กรรมชั่วหนัก',c:'kk'}]),
    CH('ให้ยาไว้ แล้วไปตามคนมาช่วย',[{t:'−1 ยา',c:'w'},{t:'LUK +2',c:'g'},kk(1)],R.potions<1)];K.ai=R.h.hp/R.h.mhp>.5?0:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{g,d}=K.data;
   if(i===0){h.hp-=h.mhp*.2;h.def+=d;R.karma+=2;R.map[f-1]='good';say(R,out,'หินก้อนนั้นหนักจนหลังแทบหัก เขาตีเกราะให้คุณใหม่ทั้งชุดด้วยเหล็กในถุงนั่นเอง','good');}
   else if(i===1){coin(R,out,g);R.karma-=3;R.map[f-1]='evil';say(R,out,'เสียงเรียกของเขาแหบลงเรื่อยๆ จนคุณขึ้นบันไดไปพ้น','bad');}
   else{R.potions--;h.luk+=2;R.karma+=1;R.map[f-1]='good';say(R,out,'พอคุณพาคนลงมาถึง เขาดื่มยาหมดขวดแล้ว กำลังด่าหินก้อนนั้นอยู่เสียงดัง','good');}}},
 drill:{w:2,mk(R,K){const f=R.floor,a=3+f*.14,d=2.2+f*.1,c=gS(R,25);K.data={a,d,c};K.tag=`ชั้น ${f} · ครูฝึกพเนจร`;K.title='ครูฝึกขาเดียว';K.vis=npc('trainer');
   K.text='ชายแก่ขาเดียวถือไม้เท้าเหล็กยืนอยู่หน้าลานฝึกร้าง "ท่ายืนของเจ้าผิดหมดเลย ให้ข้าฝึกให้สักคืน รับรองว่าเจ็บ"';
   K.ch=[CH('ฝึกหนักทั้งคืน',[{t:'HP −30%',c:'b'},{t:`ATK +${a.toFixed(1)}`,c:'g'},{t:`DEF +${d.toFixed(1)}`,c:'g'}]),
    CH('จ่ายให้สอนแค่ท่าเดียว',[{t:`−${c} ทอง`,c:'w'},{t:`ATK +${(a*.6).toFixed(1)}`,c:'g'},...ngP(R,c)],R.h.gold<c),
    CH('ขอบคุณแล้วเดินผ่านไป',[{t:'ไม่เสี่ยง',c:''}])];K.ai=R.h.hp/R.h.mhp>.65?0:R.h.gold>=c+20?1:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{a,d,c}=K.data;
   if(i===0){h.hp-=h.mhp*.3;h.atk+=a;h.def+=d;R.map[f-1]='good';say(R,out,'ไม้เท้าเหล็กฟาดลงทุกครั้งที่ท่าผิด ตอนเช้าตัวคุณเขียวไปทั้งตัว แต่ยืนได้มั่นกว่าเดิมมาก','good');}
   else if(i===1){h.gold-=c;h.atk+=a*.6;R.map[f-1]='calm';say(R,out,'เขาสอนท่าฟันเฉียงท่าเดียว แล้วให้ซ้อมซ้ำจนฟ้าสาง','good');}
   else{R.map[f-1]='calm';say(R,out,'เขาส่ายหัว "อีกไม่กี่ชั้นเจ้าก็รู้เองว่าข้าพูดถูก"','info');}}},
 lantern:{w:2,mk(R,K){const f=R.floor;K.tag=`ชั้น ${f} · วิญญาณหลงทาง`;K.title='เด็กถือโคม';K.vis=npc('ghostkid');
   K.text='เด็กตัวโปร่งแสงถือโคมกระดาษเดินวนไปมาในความมืด "หนูหาทางขึ้นไม่เจอ พี่พาหนูไปส่งข้างบนได้ไหม"';
   K.ch=[CH('จูงมือพาขึ้นไป',[{t:'HP −10% (มือเย็นเฉียบ)',c:'b'},kk(3)]),
    CH('ขอยืมโคมไปส่องทาง',[{t:'LUK +3',c:'g'},kk(-2)]),
    CH('ชี้ทางให้แล้วเดินต่อ',[kk(1)])];K.ai=0;},
  res(R,K,i,out){const f=R.floor,h=R.h;
   if(i===0){h.hp-=h.mhp*.1;R.karma+=3;R.map[f-1]='good';say(R,out,'มือเล็กๆ นั้นเย็นจนเจ็บ พอถึงชั้นบนเธอก็จางหายไปพร้อมรอยยิ้ม เหลือโคมกระดาษตกอยู่ตรงที่เธอยืน','good');}
   else if(i===1){h.luk+=3;R.karma-=2;R.map[f-1]='evil';say(R,out,'แสงโคมส่องทางได้ชัดขึ้นมาก ส่วนเสียงสะอื้นในความมืดก็ค่อยๆ ไกลออกไป','bad');}
   else{R.karma+=1;R.map[f-1]='calm';say(R,out,'เธอพยักหน้าแล้วเดินไปตามที่ชี้ คุณไม่แน่ใจว่าเธอจะหาทางเจอไหม','info');}}},
 bones:{w:2,mk(R,K){const f=R.floor,p=riskAdj(R,.35),g=gG(R,35),g2=gG(R,15),en=beast(R,1.1);K.data={p,g,g2,en};
   K.tag=`ชั้น ${f} · โครงกระดูกเดินได้`;K.title='โครงกระดูกตามหาซี่โครง';K.vis=npc('skeleton');
   K.text='โครงกระดูกตัวหนึ่งเดินคลำทางอยู่ข้างบันได ซี่โครงหายไปสามซี่ "ใครเก็บกระดูกข้าไปหรือเปล่า ขาดไปสามซี่แล้วเดินไม่ตรงเลย"';
   K.ch=[CH('ช่วยค้นทั่วชั้น',[{t:`${100-Math.round(p*100)}% เจอ ได้ค่าตอบแทน +${g} ทอง`,c:'g'},{t:`/ ${Math.round(p*100)}% เจอรังมอนสเตอร์ ต้องสู้`,c:'b'},kk(1)]),
    CH('เอากระดูกมอนสเตอร์ให้แทน',[{t:`+${g2} ทอง`,c:'g'},{t:'LUK +1',c:'g'}]),
    CH('เตะมันกระจาย',[{t:'+EXP',c:'g'},kk(-2)])];K.ai=0;},
  res(R,K,i,out){const f=R.floor,h=R.h,{p,g,g2,en}=K.data;
   if(i===0){R.karma+=1;if(rnd()<p){R.map[f-1]='fight';say(R,out,`ซี่โครงอยู่ในรังจริง แต่${en.n}เจ้าของรังไม่ยอมคืนง่ายๆ`,'bad');if(doFight(R,en,out)){coin(R,out,g);say(R,out,`มันใส่ซี่โครงกลับเข้าที่ดังกริ๊ก แล้วควักทอง ${g} ออกมาจากกะโหลกให้`,'good');}}
    else{coin(R,out,g);R.map[f-1]='treasure';say(R,out,`เจอซี่โครงครบสามซี่ในกองขยะ มันใส่กลับเข้าที่ดังกริ๊ก แล้วควักทอง ${g} ออกมาจากกะโหลกให้`,'good');}}
   else if(i===1){coin(R,out,g2);h.luk+=1;R.map[f-1]='calm';say(R,out,'มันลองใส่ดูแล้วหลวมไปหน่อย แต่ก็พอใจ จ่ายให้เป็นเหรียญเก่าที่ขึ้นสนิมเขียว','good');}
   else{xp(R,out,6,1.2);R.karma-=2;R.map[f-1]='evil';say(R,out,'กระดูกกระจายเต็มพื้น เสียงบ่นของมันยังดังลอดออกมาจากกะโหลกที่กลิ้งไปอยู่มุมห้อง','bad');}}},
 fairyq:{w:2,mk(R,K){const f=R.floor;K.tag=`ชั้น ${f} · นางฟ้าขี้เล่น`;K.title='นางฟ้าเล่นทายมือ';K.vis=npc('fairy');
   K.text='นางฟ้าตัวเท่าฝ่ามือบินวนรอบหัวคุณ โปรยผงวิบวับใส่จนจามไม่หยุด "ทายสิว่าข้าซ่อนของขวัญไว้มือไหน ทายผิดก็มีของขวัญนะ แต่เป็นแบบอื่น"';
   K.ch=[CH('มือซ้าย',[{t:'50% LUK +4',c:'g'},{t:'/ 50% ผงคันทั้งตัว HP −10%',c:'b'}]),
    CH('มือขวา',[{t:'50% +2 ยา',c:'g'},{t:'/ 50% ได้ดอกไม้หนึ่งดอก',c:''}]),
    CH('ไม่ทาย ขอให้ร้องเพลงแทน',[{t:'HP +25%',c:'g'}])];K.ai=1;},
  res(R,K,i,out){const f=R.floor,h=R.h,win=rnd()<.5;
   if(i===0){if(win){h.luk+=4;R.map[f-1]='good';say(R,out,'ในมือซ้ายมีเหรียญเงินเล็กจิ๋ว เธอกดมันลงบนหน้าผากคุณจนจมหายเข้าไปในผิว','good');}
    else{h.hp-=h.mhp*.1;R.map[f-1]='bad';say(R,out,'มือซ้ายว่างเปล่า เธอเป่าผงคันใส่หน้าคุณแล้วหัวเราะจนตกลงมาจากอากาศ','bad');}}
   else if(i===1){if(win){R.potions+=2;R.map[f-1]='good';say(R,out,'ในมือขวามียาขวดจิ๋วสองขวด พอหลุดจากมือเธอก็ขยายเป็นขวดขนาดปกติ','good');}
    else{R.map[f-1]='calm';say(R,out,'ในมือขวามีดอกไม้สีฟ้าหนึ่งดอก เธอเหน็บมันไว้หลังหูคุณ','info');}}
   else{heal(R,.25);R.map[f-1]='calm';say(R,out,'เสียงเธอเล็กแหลมเหมือนจิ้งหรีด แต่ฟังจบแล้วตัวเบาขึ้นมาก','good');}}},
 stars:{w:2,mk(R,K){const f=R.floor,c=gS(R,15),g=gG(R,45);K.data={c,g};K.tag=`ชั้น ${f} · นักดูดาว`;K.title='นักดูดาวบนระเบียง';K.vis=npc('stargazer');
   K.text='บนระเบียงหอคอยมีชายคนหนึ่งตั้งกล้องส่องดาวไว้ "คืนนี้ดาวเรียงตัวแปลกมาก ใครหาดาวตัวเองเจอคืนนี้ ดวงจะพลิก เจ้าจะลองไหม"';
   K.ch=[CH('ส่องหาดาวประจำตัว',[{t:'ชะตาพลิก ไม่รู้ว่าดีขึ้นหรือแย่ลง',c:'w'}]),
    CH('ขอให้สอนอ่านดาว',[{t:'+EXP',c:'g'},{t:'LUK +1',c:'g'}]),
    CH('จ่ายให้ทำนายเลขทอง',[{t:`−${c} ทอง`,c:'w'},{t:`55% ได้ ${g} ทอง`,c:'g'},...ngP(R,c)],R.h.gold<c)];K.ai=1;},
  res(R,K,i,out){const f=R.floor,h=R.h,{c,g}=K.data;
   if(i===0){const d=shiftFate(R,ri(-2,5));R.map[f-1]=d<0?'bad':'good';say(R,out,`ดาวของคุณกะพริบสองที ${fateFeel(d)}`,d<0?'bad':'good');}
   else if(i===1){xp(R,out,8,1.5);h.luk+=1;R.map[f-1]='calm';say(R,out,'เขาชี้ให้ดูดาวเหนือ ดาวลูกไก่ กับดาวที่ชาวบ้านเรียกว่าดาวโจร','good');}
   else{h.gold-=c;if(rnd()<.55){coin(R,out,g);R.map[f-1]='treasure';say(R,out,`เลขที่เขาให้มาตรงกับเลขบนหีบที่ชั้นถัดไปพอดี ในหีบมีทอง ${g}`,'good');}
    else{R.map[f-1]='bad';say(R,out,'เลขที่เขาให้มาไม่ตรงกับอะไรเลยสักอย่าง','bad');}}}},
 peddler:{w:2,mk(R,K){const f=R.floor,c1=gS(R,24),c2=gS(R,30),c3=gS(R,20),ga=gG(R,45),a=2+f*.1;K.data={c1,c2,c3,ga,a};
   K.tag=`ชั้น ${f} · พ่อค้าเร่`;K.title='พ่อค้าเร่เลหลังของ';K.vis=npc('merchant');
   K.text='พ่อค้าเร่เทของทั้งหมดลงบนผ้าปู "ปีนี้ข้าจะเลิกขายแล้ว เลหลังทุกชิ้น ของไม่ดีข้าไม่เอามาขายหรอก"';
   K.ch=[CH('เหมายาสามขวด',[{t:`−${c1} ทอง`,c:'w'},{t:'+3 ยา',c:'g'},...ngP(R,c1)],R.h.gold<c1),
    CH('ซื้อม้วนวาร์ปราคาถูก',[{t:`−${c2} ทอง`,c:'w'},{t:'+ม้วนวาร์ป',c:'g'},...ngP(R,c2)],R.h.gold<c2),
    CH('ซื้อกล่องปิดผนึก',[{t:`−${c3} ทอง`,c:'w'},{t:`สุ่มได้ ${ga} ทอง / ATK +${a.toFixed(1)} / ของไร้ค่า`,c:'w'},...ngP(R,c3)],R.h.gold<c3),
    CH('ไม่ซื้ออะไร',[{t:'เดินผ่านไป',c:''}])];K.ai=R.potions<2&&R.h.gold>=c1?0:R.warps<1&&R.h.gold>=c2+20?1:3;},
  res(R,K,i,out){const f=R.floor,h=R.h,{c1,c2,c3,ga,a}=K.data;R.map[f-1]='calm';
   if(i===0){h.gold-=c1;R.potions+=3;say(R,out,'ยาสามขวดยังใหม่อยู่ ฉลากเขียนว่าหมดอายุอีกสิบปี','good');}
   else if(i===1){h.gold-=c2;R.warps++;say(R,out,'ม้วนวาร์ปมีรอยพับนิดหน่อย แต่ตราประทับยังสมบูรณ์','good');}
   else if(i===2){h.gold-=c3;const r=rnd();if(r<.4){coin(R,out,ga);R.map[f-1]='treasure';say(R,out,`ในกล่องมีทอง ${ga} เหรียญห่อผ้าไว้อย่างดี`,'good');}
    else if(r<.75){h.atk+=a;say(R,out,'ในกล่องมีหินลับมีดเนื้อละเอียดก้อนหนึ่ง ลับไปสองทีดาบก็คมกริบ','good');}
    else{R.map[f-1]='bad';say(R,out,'ในกล่องมีแต่ถุงเท้าข้างเดียวกับจดหมายรักที่ไม่ได้ส่ง','bad');}}
   else say(R,out,'"ไม่เป็นไร ของพวกนี้ข้าขายคนอื่นได้" เขาว่าแล้วเก็บผ้าปูช้าๆ','info');}},
 snailrace:{w:2,mk(R,K){const f=R.floor,bet=Math.max(5,gS(R,15));K.data={bet};K.tag=`ชั้น ${f} · สนามแข่ง`;K.title='สนามแข่งหอยทาก';K.vis=npc('snail');
   K.text='หอยทากยักษ์สองตัวจอดรออยู่หลังเส้นชอล์ก คนดูล้อมวงตะโกนกันลั่น เจ้ามือร้องรับพนัน "ตัวแดงเป็นตัวเต็ง ตัวเขียวเพิ่งหายป่วย จะลงตัวไหนก็ลงมาเลย"';
   K.ch=[CH('แทงตัวแดง (ตัวเต็ง)',[{t:`เดิมพัน ${bet} ทอง`,c:'w'},{t:`60% ได้ +${Math.round(bet*.8)} ทอง`,c:'g'}],R.h.gold<bet),
    CH('แทงตัวเขียว (ตัวรอง)',[{t:`เดิมพัน ${bet} ทอง`,c:'w'},{t:`30% ได้ +${Math.round(bet*2.5)} ทอง`,c:'g'}],R.h.gold<bet),
    CH('ยืนดูเฉยๆ',[{t:'ไม่เสี่ยง',c:''}])];K.ai=2;},
  res(R,K,i,out){const f=R.floor,h=R.h,bet=K.data.bet;R.map[f-1]='calm';
   if(i===0){if(rnd()<.6){const g=Math.round(bet*.8);coin(R,out,g);R.map[f-1]='treasure';say(R,out,`ตัวแดงเลื้อยเข้าเส้นชัยก่อนช่วงตัวหนึ่ง เจ้ามือจ่าย ${g} ทองด้วยหน้าบึ้งๆ`,'good');}
    else{h.gold=Math.max(0,h.gold-bet);R.map[f-1]='bad';say(R,out,'ตัวแดงหยุดกินใบผักกลางสนาม แล้วไม่ขยับอีกเลย','bad');}}
   else if(i===1){if(rnd()<.3){const g=Math.round(bet*2.5);coin(R,out,g);R.map[f-1]='treasure';say(R,out,`ตัวเขียวพุ่งแซงตอนโค้งสุดท้าย คนทั้งวงร้องลั่น คุณได้ ${g} ทอง`,'good');}
    else{h.gold=Math.max(0,h.gold-bet);R.map[f-1]='bad';say(R,out,'ตัวเขียวหลับไปตั้งแต่เส้นสตาร์ต','bad');}}
   else say(R,out,'แข่งรอบนี้ยืดเยื้อกว่าที่คิด คุณเดินจากมาก่อนจะรู้ผล','info');}},
 brew:{w:2,mk(R,K){const f=R.floor,p=clamp(.45+eLuk(R)*.005,.45,.7);K.data={p};K.tag=`ชั้น ${f} · แม่มด`;K.title='หม้อยาของแม่มด';K.vis=npc('witch');
   K.text='หม้อใบใหญ่เดือดเป็นฟองสีม่วง แม่มดคนหนึ่งยืนกวนพลางพึมพำ "ขาดอีกอย่างเดียว เลือดของคนที่ยังปีนไม่ถึงยอด เจ้าพอดีเลย"';
   K.ch=[CH('ยอมให้เลือดหนึ่งถ้วย',[{t:'HP สูงสุด −5%',c:'b'},{t:'+2 ยา',c:'g'},{t:'LUK +2',c:'g'}]),
    CH('ชิมยาในหม้อ',[{t:`${Math.round(p*100)}% HP สูงสุด +12%`,c:'g'},{t:`/ ${100-Math.round(p*100)}% ท้องเสีย HP −20% LUK −2`,c:'b'}]),
    CH('คว่ำหม้อทิ้ง',[kk(2),{t:'โดนสาปไล่หลัง LUK −1',c:'b'}])];K.ai=0;},
  res(R,K,i,out){const f=R.floor,h=R.h;
   if(i===0){h.mhp*=.95;h.hp=Math.min(h.hp,h.mhp);R.potions+=2;h.luk+=2;R.map[f-1]='calm';say(R,out,'เลือดหยดลงหม้อแล้วฟองเปลี่ยนเป็นสีทอง เธอกรอกยาใส่ขวดให้สองขวดเป็นค่าเลือด','good');}
   else if(i===1){if(rnd()<K.data.p){h.mhp*=1.12;R.map[f-1]='good';say(R,out,'รสชาติเหมือนน้ำบ่อผสมดอกมะลิ แต่ร่างกายแข็งแรงขึ้นจนรู้สึกได้','good');}
    else{h.hp-=h.mhp*.2;h.luk=Math.max(0,h.luk-2);R.map[f-1]='bad';out.cause=`ยาของแม่มดออกฤทธิ์ผิดทาง (ชั้น ${f})`;say(R,out,'ท้องปั่นป่วนอยู่ครึ่งคืน แม่มดจดอะไรบางอย่างลงสมุดอย่างตั้งใจ','bad');}}
   else{R.karma+=2;h.luk=Math.max(0,h.luk-1);R.map[f-1]='good';say(R,out,'ยาสีม่วงไหลนองพื้น แม่มดกรีดร้องสาปแช่งตามหลังคุณไปถึงชั้นบน','info');}}},
 ruin:{w:2,mk(R,K){const f=R.floor,c=gS(R,20),g=gG(R,40);K.data={c,g};K.tag=`ชั้น ${f} · ศาลเจ้าร้าง`;K.title='ศาลเจ้าร้าง';K.vis={t:'prop',pr:'shrine'};
   K.text='ศาลไม้หลังเล็กหลังคาพังไปครึ่งหนึ่ง ตุ๊กตาเทพข้างในล้มคว่ำหน้าอยู่ แต่กล่องรับบริจาคยังมีเหรียญเก่าอยู่เต็ม';
   K.ch=[CH('ซ่อมหลังคาให้',[{t:`−${c} ทอง`,c:'w'},{t:'ชะตายืดออกนิดหน่อย',c:'g'},kk(2),...ngP(R,c)],R.h.gold<c),
    CH('ตั้งตุ๊กตาเทพขึ้นแล้วไหว้',[{t:'LUK +2',c:'g'}]),
    CH('เทเงินในกล่องบริจาค',[{t:`+${g} ทอง`,c:'g'},{t:'✧ กรรมชั่วหนัก',c:'kk'}])];K.ai=R.h.gold>=c+20?0:1;},
  res(R,K,i,out){const f=R.floor,h=R.h,{c,g}=K.data;
   if(i===0){h.gold-=c;R.karma+=2;const d=shiftFate(R,ri(1,3));R.map[f-1]='good';say(R,out,`คุณมุงหลังคาใหม่ด้วยแผ่นไม้จากชั้นล่าง ฝนที่รั่วลงมาหยุดหยดเสียที ${fateFeel(d)}`,'good');}
   else if(i===1){h.luk+=2;R.map[f-1]='calm';say(R,out,'คุณปัดฝุ่นออกจากหน้าตุ๊กตาเทพ รอยยิ้มบนหน้าดูกว้างกว่าตอนแรก','good');}
   else{coin(R,out,g);R.karma-=3;R.map[f-1]='evil';say(R,out,`เหรียญเก่าในกล่องรวมได้ ${g} ทอง ตุ๊กตาเทพยังนอนคว่ำหน้าอยู่อย่างนั้น`,'bad');}}},
 harvest:{w:2,mk(R,K){const f=R.floor,c=gS(R,12);K.data={c};K.tag=`ชั้น ${f} · แปลงผัก`;K.title='แปลงผักในหอคอย';K.vis=npc('farmer');
   K.text='ชายคนหนึ่งพรวนดินอยู่บนพื้นหิน ดินพวกนี้เขาแบกขึ้นมาเองทีละถุง "ข้างบนอันตรายเกินไป ข้าเลยปลูกผักอยู่ตรงนี้ อยู่มาสิบปีแล้ว ยังไม่ตายสักที"';
   K.ch=[CH('ช่วยพรวนดินแลกข้าวหนึ่งมื้อ',[{t:'HP −10%',c:'b'},{t:'HP สูงสุด +6%',c:'g'},kk(1)]),
    CH('ซื้อผักติดตัวไป',[{t:`−${c} ทอง`,c:'w'},{t:'+1 ยา',c:'g'},{t:'HP +30%',c:'g'},...ngP(R,c)],R.h.gold<c),
    CH('ถอนผักกินตอนเขาเผลอ',[{t:'HP เต็ม',c:'g'},kk(-2)])];K.ai=0;},
  res(R,K,i,out){const f=R.floor,h=R.h;
   if(i===0){h.hp-=h.mhp*.1;h.mhp*=1.06;R.karma+=1;R.map[f-1]='good';say(R,out,'ข้าวกับผักต้มมื้อนั้นธรรมดามาก แต่อิ่มไปจนถึงชั้นถัดไปอีกหลายชั้น','good');}
   else if(i===1){h.gold-=K.data.c;R.potions++;heal(R,.3);R.map[f-1]='calm';say(R,out,'เขาห่อผักให้ด้วยใบตอง แถมยาสมุนไพรที่ปลูกเองอีกขวด','good');}
   else{h.hp=h.mhp;R.karma-=2;R.map[f-1]='evil';say(R,out,'แครอทหัวโตกรอบอร่อย ข้างหลังคุณมีเสียงถอนหายใจยาวๆ','bad');}}},
 pit:{w:2,mk(R,K){const f=R.floor,en=foe(R,'นักสู้ใต้ดิน','war',1.15),w=estW(R,en),g=gG(R,55),bet=Math.max(5,gS(R,20));K.data={en,g,bet};
   K.tag=`ชั้น ${f} · สังเวียนใต้ดิน`;K.title='สังเวียนใต้ดิน';K.vis=npc('gambler');
   K.text='เสียงโห่ร้องดังลอดพื้นขึ้นมา ข้างล่างเป็นลานทรายที่มีคนดูล้อมอยู่นับร้อย เจ้าของสังเวียนตะโกนหาคนลงสนาม "ชนะได้ทองเต็มถุง แพ้ก็ได้นอนพักฟรีหนึ่งคืน"';
   K.ch=[CH('ลงสังเวียนเอง',[wPart(w),{t:`ชนะได้ +${g} ทอง`,c:'g'},{t:'แพ้ = บาดเจ็บหนัก',c:'b'}]),
    CH('แทงข้างสนาม',[{t:`เดิมพัน ${bet} ทอง`,c:'w'},{t:`50% ได้ +${Math.round(bet*1.2)} ทอง`,c:'g'}],R.h.gold<bet),
    CH('ดูอยู่ห่างๆ แล้วไปต่อ',[{t:'ไม่เสี่ยง',c:''}])];K.ai=w>=70?0:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{en,g,bet}=K.data;
   if(i===0){R.map[f-1]='fight';say(R,out,'คุณกระโดดลงลานทราย เสียงคนดูดังจนหูอื้อ','info');
    if(doFight(R,en,out,{cause:`ล้มในสังเวียนใต้ดิน (ชั้น ${f})`})){coin(R,out,g);say(R,out,`เจ้าของสังเวียนโยนถุงทองมาให้ ${g} เหรียญ คนดูโยนดอกไม้ลงมาเต็มลาน`,'good');}}
   else if(i===1){if(rnd()<.5){const gg=Math.round(bet*1.2);coin(R,out,gg);R.map[f-1]='treasure';say(R,out,`คนที่คุณแทงชนะน็อกในยกที่สอง ได้ทอง ${gg}`,'good');}
    else{h.gold=Math.max(0,h.gold-bet);R.map[f-1]='bad';say(R,out,'คนที่คุณแทงล้มตั้งแต่ยกแรก แล้วไม่ลุกขึ้นมาอีก','bad');}}
   else{R.map[f-1]='calm';say(R,out,'คุณดูอยู่สองสามยกแล้วเดินขึ้นบันไดต่อ เสียงโห่ยังดังตามมาอีกนาน','info');}}},
 // ---- rare ----
 oathk:{w:2,mk(R,K){const f=R.floor,d=3+f*.15,d2=2+f*.1;K.data={d,d2};K.tag=`ชั้น ${f} · อัศวินชรา`;K.title='อัศวินชรากับคำสาบาน';K.vis=npc('knight');
   K.text='อัศวินชรานั่งพิงโล่ใบใหญ่ เกราะขึ้นสนิมไปทั้งตัว "ข้าสาบานไว้ว่าจะคุ้มกันคนที่ปีนหอนี้จนตัวตาย ตอนนี้ใกล้ตายแล้ว แต่ยังไม่มีใครรับคำสาบานต่อ"';
   K.ch=[CH('รับคำสาบานต่อ',[{t:`DEF +${d.toFixed(1)}`,c:'g'},{t:'HP สูงสุด +10%',c:'g'},{t:'ต้องบริจาคทองครึ่งหนึ่งบูรณะหอ',c:'b'},kk(2)]),
    CH('ขอโล่ของเขามาใช้',[{t:`DEF +${d2.toFixed(1)}`,c:'g'},kk(-1)]),
    CH('อยู่เป็นเพื่อนจนเขาหมดลม',[{t:'LUK +3',c:'g'},kk(2)])];K.ai=R.h.gold<gS(R,40)?0:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{d,d2}=K.data;
   if(i===0){h.gold=Math.round(h.gold*.5);h.def+=d;h.mhp*=1.1;R.karma+=2;R.map[f-1]='good';say(R,out,'คุณคุกเข่าให้เขาแตะดาบลงบนไหล่ ทองครึ่งถุงลงไปอยู่ในกล่องบูรณะหอที่ตั้งอยู่ข้างๆ','good');}
   else if(i===1){h.def+=d2;R.karma-=1;R.map[f-1]='calm';say(R,out,'เขายื่นโล่ให้โดยไม่ว่าอะไร แต่มือที่ว่างลงของเขาสั่นอยู่นาน','info');}
   else{h.luk+=3;R.karma+=2;R.map[f-1]='good';say(R,out,'เขาเล่าเรื่องนายคนแรกของเขาจนเสียงแผ่วลง คุณวางดาบของเขาไว้บนอก','good');}}},
 heist:{w:2,mk(R,K){const f=R.floor,p=riskAdj(R,.4),g=gG(R,110),gr=gG(R,30),en=foe(R,'ยามเฝ้าคลัง','war',1.25),w=estW(R,en);K.data={p,g,gr,en};
   K.tag=`ชั้น ${f} · แผนปล้น`;K.title='แผนปล้นคลังบอส';K.vis=npc('thief');
   K.text='โจรหน้าบากคนหนึ่งกางแผนที่ลงบนพื้น "คลังสมบัติของบอสชั้นนี้มียามแค่คนเดียว ข้ารู้ทางเข้า ขาดแค่คนตัวใหญ่ๆ ไว้รับมือยาม"';
   K.ch=[CH('ร่วมปล้น',[{t:`${100-Math.round(p*100)}% ได้ ${g} ทอง`,c:'g'},{t:`/ ${Math.round(p*100)}% ยามตื่น ต้องสู้ (~${w}%)`,c:'b'},kk(-2)]),
    CH('แอบไปบอกยาม',[{t:`+${gr} ทอง (รางวัลนำจับ)`,c:'g'},kk(1)]),
    CH('ไม่ยุ่งด้วย',[{t:'ไม่เสี่ยง',c:''}])];K.ai=w>=60?0:1;},
  res(R,K,i,out){const f=R.floor,h=R.h,{p,g,gr,en}=K.data;
   if(i===0){R.karma-=2;if(rnd()<p){R.map[f-1]='fight';say(R,out,'ยามลืมตาขึ้นตอนคุณยกหีบใบแรก โจรหน้าบากหายไปแล้ว','bad');
     if(doFight(R,en,out,{cause:`ถูกยามเฝ้าคลังจับได้คาหนังคาเขา (ชั้น ${f})`})){const g2=Math.round(g*.5);coin(R,out,g2);say(R,out,`หีบใบแรกยังอยู่ในมือ ข้างในมีทอง ${g2}`,'good');}}
    else{coin(R,out,g);R.map[f-1]='treasure';say(R,out,`ปล้นสำเร็จ แบ่งกันคนละครึ่ง ส่วนของคุณคือ ${g} ทอง`,'good');}}
   else if(i===1){coin(R,out,gr);R.karma+=1;R.map[f-1]='good';say(R,out,'ยามจับโจรหน้าบากได้ตอนกำลังงัดประตู เขาตะโกนด่าคุณจนเสียงแหบ','good');}
   else{R.map[f-1]='calm';say(R,out,'"ขี้ขลาด" โจรหน้าบากถุยน้ำลายลงพื้น แล้วม้วนแผนที่เดินจากไป','info');}}},
 whale:{w:2,mk(R,K){const f=R.floor,p=riskAdj(R,.3),sk=skipN(R,ri(2,3)),g=gG(R,70);K.data={p,sk,g};K.tag=`ชั้น ${f} · วาฬลอยฟ้า`;K.title='วาฬว่ายผ่านหน้าต่าง';K.vis=npc('whale');
   K.text='วาฬตัวมหึมาว่ายผ่านหน้าต่างหอคอยไปช้าๆ เหมือนอากาศเป็นน้ำทะเล มันร้องเสียงทุ้มยาวจนพื้นสั่น ปลายหางปัดผ่านมาใกล้พอให้กระโดดเกาะได้';
   K.ch=[CH('กระโดดเกาะหาง',[{t:`${100-Math.round(p*100)}% ${sk>0?`ข้ามไป ${sk} ชั้น`:'EXP ก้อนใหญ่'}`,c:'g'},{t:`/ ${Math.round(p*100)}% ร่วงลงมา HP −25%`,c:'b'}]),
    CH('ร้องเพลงตอบมัน',[{t:'LUK +3',c:'g'},kk(1)]),
    CH('ยิงฉมวกเอาไขวาฬ',[{t:`+${g} ทอง`,c:'g'},{t:'✧ กรรมชั่วหนัก',c:'kk'}])];K.ai=1;},
  res(R,K,i,out){const f=R.floor,h=R.h,{p,sk,g}=K.data;
   if(i===0){if(rnd()<p){h.hp-=h.mhp*.25;R.map[f-1]='trap';out.cause=`ร่วงจากหางวาฬ (ชั้น ${f})`;say(R,out,'มือลื่นหลุดจากครีบหาง คุณร่วงลงมากระแทกระเบียงชั้นล่าง','bad');}
    else{R.map[f-1]='good';say(R,out,'คุณเกาะหางวาฬไว้แน่น ลมตีหน้าจนน้ำตาไหล มันพาคุณว่ายวนรอบหอขึ้นไปช้าๆ','good');if(sk>0)applyFx(R,{skip:sk},out);else xp(R,out,20,4);}}
   else if(i===1){h.luk+=3;R.karma+=1;R.map[f-1]='good';say(R,out,'มันร้องตอบกลับมาหนึ่งครั้ง เสียงทุ้มนั้นสั่นอยู่ในอกคุณอีกหลายชั้น','good');}
   else{coin(R,out,g);R.karma-=3;R.map[f-1]='evil';say(R,out,`ฉมวกปักเข้าข้างลำตัว มันร้องเสียงแหลมแล้วว่ายหนีไป ไขวาฬที่ไหลออกมาขายได้ ${g} ทอง`,'bad');}}},
 // ---- legendary ----
 phoenix:{w:1,mk(R,K){const f=R.floor,a=5+f*.25;K.data={a};K.tag=`ชั้น ${f} · นกไฟ`;K.title='นกไฟใกล้มอด';K.vis=npc('phoenix');
   K.text='นกเพลิงตัวใหญ่นอนหอบอยู่บนกองเถ้า ขนหางที่เคยลุกโชนเหลือแค่ถ่านแดง มันหันมามองคุณด้วยตาที่ยังร้อนอยู่ "อีกไม่นานข้าจะเกิดใหม่ เจ้าจะอยู่ดู หรือจะหยิบอะไรไปก่อนก็ได้"';
   K.ch=[CH('เฝ้าจนมันเกิดใหม่',[{t:R.scars?`แผลเป็นหายหมด (${R.scars} แห่ง)`:'HP สูงสุด +10%',c:'g'},{t:'HP เต็ม',c:'g'},{t:'ชะตายืดออก',c:'g'}]),
    CH('ดึงขนหางที่ยังร้อนไปทำอาวุธ',[{t:`ATK +${a.toFixed(1)}`,c:'g'},kk(-1)]),
    CH('เก็บเถ้าใส่ขวด',[{t:'+3 ยา',c:'g'},{t:'HP สูงสุด +10%',c:'g'}])];K.ai=R.scars>=2?0:1;},
  res(R,K,i,out){const f=R.floor,h=R.h;R.map[f-1]='treasure';
   if(i===0){if(R.scars)R.scars=0;else h.mhp*=1.1;h.hp=h.mhp;const d=shiftFate(R,ri(2,4));R.map[f-1]='good';say(R,out,`เปลวไฟลุกพรึบขึ้นจากกองเถ้า ไออุ่นของมันลามมาถึงตัวคุณ แผลเก่าทุกแผลปิดสนิท ${fateFeel(d)}`,'lv');}
   else if(i===1){h.atk+=K.data.a;R.karma-=1;say(R,out,'ขนหางร้อนจนมือพอง พอพันเข้ากับด้ามดาบ ใบดาบก็แดงเรื่อขึ้นมา','lv');}
   else{R.potions+=3;h.mhp*=1.1;say(R,out,'เถ้าในขวดยังอุ่นอยู่ ได้กลิ่นทีไรความเหนื่อยก็หายไปหมด','lv');}}},
 kingless:{w:1,mk(R,K){const f=R.floor,a=5+f*.25,d=3+f*.12,g=gG(R,160);K.data={a,d,g};K.tag=`ชั้น ${f} · ท้องพระโรงร้าง`;K.title='ราชาไร้บัลลังก์';K.vis=npc('noble');
   K.text='ชายชราสวมมงกุฎเบี้ยวๆ นั่งอยู่บนบัลลังก์ที่พังไปครึ่งหนึ่ง ห้องโถงรอบตัวว่างเปล่า "ข้าปกครองหอนี้มาสามร้อยปี เหนื่อยเต็มทีแล้ว มงกุฎนี่ใครอยากได้ก็เอาไป"';
   K.ch=[CH('สวมมงกุฎ',[{t:`ATK +${a.toFixed(1)} · DEF +${d.toFixed(1)}`,c:'g'},{t:'อายุขัยสั้นลง',c:'b'}]),
    CH('ขอทองในคลังแทน',[{t:`+${g} ทอง`,c:'g'}]),
    CH('พาเขาลงไปดูท้องฟ้าข้างนอก',[{t:'HP −20%',c:'b'},{t:'ชะตายืดออก',c:'g'},kk(3)])];K.ai=2;},
  res(R,K,i,out){const f=R.floor,h=R.h,{a,d,g}=K.data;
   if(i===0){h.atk+=a;h.def+=d;const dd=shiftFate(R,-ri(3,6));R.map[f-1]='evil';say(R,out,`มงกุฎหนักกว่าที่เห็น พอสวมลงไป เสียงกระซิบของราชาทุกองค์ก่อนหน้าก็ดังขึ้นในหัว ${fateFeel(dd)}`,'lv');}
   else if(i===1){coin(R,out,g);R.map[f-1]='treasure';say(R,out,`คลังของเขาเหลืออยู่มุมเดียว แต่มุมนั้นก็มีทองถึง ${g} เหรียญ`,'lv');}
   else{h.hp-=h.mhp*.2;R.karma+=3;const dd=shiftFate(R,ri(3,6));R.map[f-1]='good';say(R,out,`เขายืนดูพระอาทิตย์ตกอยู่นาน แล้วถอดมงกุฎวางไว้บนพื้นหญ้า ${fateFeel(dd)}`,'lv');}}},
 astral:{w:1,mk(R,K){const f=R.floor,g=gG(R,60),sk=skipN(R,ri(3,5));K.data={g,sk};K.tag=`ชั้น ${f} · บันไดดวงดาว`;K.title='บันไดแก้วสู่ดวงดาว';K.vis={t:'prop',pr:'star'};
   K.text='บันไดแก้วเส้นหนึ่งทอดยาวออกไปนอกหน้าต่าง ปลายทางหายเข้าไปในกลุ่มดาว ลมที่พัดลงมาหอมเหมือนดอกไม้ตอนเช้ามืด';
   K.ch=[CH('เดินขึ้นไปจนสุดบันได',[...(sk>0?[{t:`ข้ามไป ${sk} ชั้น`,c:'g'}]:[]),{t:'HP เต็ม · MP เต็ม',c:'g'}]),
    CH('เก็บดาวที่ร่วงอยู่บนขั้นบันได',[{t:'LUK +5',c:'g'},{t:`+${g} ทอง`,c:'g'}]),
    CH('นั่งดูดาวอยู่ที่ขั้นล่างสุด',[{t:'EXP ก้อนใหญ่มาก',c:'g'},{t:`MP สูงสุด +${mpU(R,10)}`,c:'g'}])];K.ai=sk>0?0:1;},
  res(R,K,i,out){const f=R.floor,h=R.h,{g,sk}=K.data;R.map[f-1]='good';
   if(i===0){h.hp=h.mhp;h.mp=h.mmp;say(R,out,'บันไดแก้วเย็นเฉียบใต้ฝ่าเท้า เดินไปเรื่อยๆ จนลมหายใจกลายเป็นไอ พอก้าวลงมาอีกทีก็อยู่สูงขึ้นไปแล้ว','lv');if(sk>0)applyFx(R,{skip:sk},out);}
   else if(i===1){h.luk+=5;coin(R,out,g);R.map[f-1]='treasure';say(R,out,`ดาวดวงเล็กๆ อุ่นอยู่ในมือ บางดวงแข็งตัวกลายเป็นทอง รวมได้ ${g} เหรียญ`,'lv');}
   else{xp(R,out,25,4.5);const m=mpU(R,10);h.mmp+=m;h.mp+=m;say(R,out,'คุณนั่งนับดาวจนลืมนับเวลา พอลุกขึ้นก็จำได้ว่าดาวแต่ละดวงอยู่ตรงหน้าต่างของชั้นไหน','lv');}}}});
const TIER={merc:'l',mimic:'c',egg:'c',relic:'r',seer:'r',rpet:'r',gamble:'c',wounded:'c',door:'c',fountain:'r',starfall:'l',dragon:'l'};
// class promotion (v2.3): once per life, floor 25-85, hero doing well; per-class text in CONTENT.PROMO
const PROMO=window.CONTENT.PROMO||{};
const promoOk=R=>!!PROMO[cid(R)]&&!R.used['sp:promo']&&R.floor>=25&&R.floor<=85&&R.h.lv>=Math.round(R.floor*.33)+2&&R.h.hp>=R.h.mhp*.45;
Object.assign(SPECIAL,{promo:{w:2,ok:promoOk,mk(R,K){const f=R.floor,id=cid(R),P=PROMO[id],U=2+f*.1;
  const en=P.c.map(c=>c.fx.fight?beast(R,c.fx.fight,c.en||'{m}'):null),g=P.c.map(c=>c.fx.g?gG(R,c.fx.g):0),cost=P.c.map(c=>c.fx.c?gS(R,c.fx.c):0),w=en.map(e=>e?estW(R,e):0);
  K.data={id,U,en,g,cost};K.tag=`ชั้น ${f} · เลื่อนขั้น`;K.title=P.t;K.text=P.x;K.vis=npc(P.npc||'knight');
  K.ch=P.c.map((c,i)=>{const x=c.fx,B=[],Q=[];const pre=t=>x.fight&&!B.length?'ชนะได้ '+t:t;
   if(cost[i])Q.push({t:`−${cost[i]} ทอง`,c:'w'});if(en[i])Q.push(wPart(w[i]));
   if(x.a)B.push({t:pre(`ATK +${(x.a*U).toFixed(1)}`),c:'g'});if(x.d)B.push({t:pre(`DEF +${(x.d*U).toFixed(1)}`),c:'g'});if(x.hp)B.push({t:pre(`HP สูงสุด +${Math.round(x.hp*100)}%`),c:'g'});
   if(x.m)B.push({t:pre(`MP สูงสุด +${mpU(R,x.m)}`),c:'g'});if(x.l)B.push({t:pre(`LUK +${x.l}`),c:'g'});if(x.pot)B.push({t:pre(`+${x.pot} ยา`),c:'g'});if(x.x)B.push({t:pre('+EXP'),c:'g'});if(g[i])B.push({t:pre(`+${g[i]} ทอง`),c:'g'});
   if(x.dmg)B.push({t:`HP −${Math.round(x.dmg*100)}%`,c:'b'});if(x.fight)B.push({t:'แพ้ = บาดเจ็บหนัก',c:'b'});
   if(x.k)B.push(x.k<=-3?{t:'✧ กรรมชั่วหนัก',c:'kk'}:kk(x.k));
   return CH(c.t,[...Q,...B],cost[i]>0&&R.h.gold<cost[i]);});
  const fi=en.findIndex(Boolean);let ai=0,bk=-99;P.c.forEach((c,i)=>{const k=(c.fx.k||0)+(c.fx.fight?-1:0);if(k>bk){bk=k;ai=i;}});
  K.ai=fi>=0&&w[fi]>=70?fi:R.h.gold<gS(R,25)&&g.some(Boolean)?g.indexOf(Math.max(...g)):ai;},
 res(R,K,i,out){const f=R.floor,h=R.h,D=K.data,P=PROMO[D.id],c=P&&P.c[i];if(!c)return;const x=c.fx,U=D.U||2+f*.1;R.map[f-1]=c.mk||'calm';
  if(x.fight){const en=D.en[i];R.map[f-1]='fight';if(!doFight(R,en,out,{rw:1.5,cause:`ล้มลงในงานแรกของตำแหน่ง${P.t} (ชั้น ${f})`})){say(R,out,c.rl,'bad');return;}}
  if(D.cost[i])h.gold-=D.cost[i];if(x.a)h.atk+=x.a*U;if(x.d)h.def+=x.d*U;if(x.hp)h.mhp*=1+x.hp;if(x.m){const m=mpU(R,x.m);h.mmp+=m;h.mp+=m;}if(x.l)h.luk+=x.l;if(x.pot)R.potions+=x.pot;
  if(x.x)xp(R,out,10*x.x,1.6*x.x);if(D.g[i])coin(R,out,D.g[i]);if(x.dmg)h.hp-=h.mhp*x.dmg;if(x.k)R.karma+=x.k;
  R.promo={id:D.id,i};say(R,out,x.fight?c.rw:c.r,x.k<0?'bad':x.fight?'lv':'good');}}});
TIER.promo='r';
// v2.5: extreme karma turns the hero into a necromancer or an angel (once per life); finishing such a life unlocks the class at birth
const NEC_K=-50,ANG_K=55;
const turnOk=(R,id)=>!R.turned&&!['nec','ang','dsl'].includes(cid(R))&&R.floor>=30&&R.floor<=95&&(id==='nec'?R.karma<=NEC_K:R.karma>=ANG_K);
function turnClass(R,id,out){const h=R.h,i=CLASSES.findIndex(c=>c.id===id);if(i<0)return;R.turned={from:cid(R),f:R.floor};h.cls=i;R.path=0;R.pathHi=0;
 if(id==='nec'){h.atk*=1.08;h.mhp*=.92;h.hp=Math.min(h.hp,h.mhp);h.mmp+=20;h.mp=h.mmp;
  if(R.comps.length){say(R,out,`${R.comps.map(c=>c.n).join(' กับ ')}เห็นร่างคุณกลายเป็นกระดูกแล้ววิ่งหนีไป`,'bad');R.comps=[];}}
 else{h.mhp*=1.1;h.hp=h.mhp;h.luk+=5;h.def*=1.05;}}
Object.assign(SPECIAL,{
 nec:{w:0,ok:R=>turnOk(R,'nec'),mk(R,K){K.tag=`ชั้น ${R.floor} · ทางที่ย้อนกลับไม่ได้`;K.title='คัมภีร์แห่งความตาย';K.vis=npc('skeleton');
   K.text='หนังสือปกหนังสีดำเปิดค้างอยู่กลางบันได กระดูกที่กองอยู่รอบๆ ขยับตามจังหวะหายใจของคุณ เสียงแหบๆ กระซิบว่าทุกเรื่องที่คุณทำมาพาคุณมาถึงหน้านี้พอดี ถ้ายอมรับ ความตายจะเดินตามคำสั่งคุณ';
   K.ch=[CH('รับพลังแห่งความตาย',[{t:'กลายเป็นเนโครแมนเซอร์',c:'g'},{t:'เสกโครงกระดูกมาสู้ด้วย',c:'g'},{t:'จ้างใครไม่ได้อีก',c:'b'},{t:'✧ กรรมชั่ว',c:'kk'}]),
    CH('ปิดหนังสือแล้วเดินต่อ',[{t:'เป็นคนเดิม',c:''}]),CH('เผาหนังสือทิ้ง',[{t:'HP −10%',c:'b'},kk(2)])];K.ai=0;},
  res(R,K,i,out){const f=R.floor,h=R.h;
   if(i===0){R.karma-=2;R.map[f-1]='evil';turnClass(R,'nec',out);say(R,out,'กระดูกทั่วชั้นลุกขึ้นยืนพร้อมกันแล้วหันมาทางคุณเหมือนรอคำสั่ง เนื้อหนังของคุณร่วงหลุดจนเหลือแต่กระดูก','lv');}
   else if(i===1){R.map[f-1]='calm';say(R,out,'คุณปิดหนังสือ เสียงกระซิบเงียบไป แต่กระดูกยังมองตามหลังคุณ','info');}
   else{R.karma+=3;h.hp=Math.max(1,h.hp-h.mhp*.1);R.map[f-1]='good';say(R,out,'หนังสือกรีดร้องตอนไฟลุก มือคุณพองไปหลายแผล แต่ใจเบาลงเยอะ','good');}}},
 ang:{w:0,ok:R=>turnOk(R,'ang'),mk(R,K){K.tag=`ชั้น ${R.floor} · แสงจากเบื้องบน`;K.title='ขนนกสีขาว';K.vis={t:'prop',pr:'shrine'};
   K.text='แสงสีขาวลอดลงมาจากรอยแยกบนเพดาน ขนนกร่วงเต็มขั้นบันได เสียงหนึ่งบอกว่าหอคอยเห็นทุกเรื่องดีที่คุณทำมา แล้วถามว่าคุณพร้อมจะทิ้งร่างมนุษย์หรือยัง';
   K.ch=[CH('รับปีก',[{t:'กลายเป็นทูตสวรรค์',c:'g'},{t:'HP สูงสุด +10%',c:'g'},{t:'หลบเก่งขึ้น',c:'g'}]),CH('ขอเป็นคนเดิมต่อไป',[{t:'HP เต็ม',c:'g'}])];K.ai=0;},
  res(R,K,i,out){const f=R.floor,h=R.h;R.map[f-1]='good';
   if(i===0){turnClass(R,'ang',out);say(R,out,'ปีกสีขาวกางออกจากแผ่นหลัง วงแหวนแสงลอยขึ้นเหนือศีรษะ ตัวคุณเบาจนเกือบลอยได้','lv');}
   else{h.hp=h.mhp;say(R,out,'แสงค่อยๆ หรี่ลง ทิ้งไออุ่นไว้ทั่วตัว แผลทุกแห่งปิดสนิท','good');}}}});
Object.assign(TIER,{nec:'l',ang:'l'});
Object.assign(TIER,{smith:'c',bard:'c',thief:'c',monk:'c',cat:'c',hunter:'c',scholar:'c',noble:'c',imp:'c',tomb:'c',bridge:'c',crystal:'c',book:'c',campfire:'c',snack:'c',cavein:'c',drill:'c',lantern:'c',bones:'c',fairyq:'c',stars:'c',peddler:'c',snailrace:'c',brew:'c',ruin:'c',harvest:'c',pit:'c',
 cultist:'r',healer:'r',oathk:'r',heist:'r',whale:'r',phoenix:'l',kingless:'l',astral:'l'});
// tier shares per draw stay at the original mix (~70% common / 23% rare / 7% legendary) however many keys each tier holds
const TIER_N=Object.values(TIER).reduce((a,t)=>(a[t]=(a[t]||0)+1,a),{});
const tierW=(R,r)=>{const sh=r==='l'?.07:r==='r'?.23:.7;return 6*(sh/(TIER_N[r]||1))/(.7/(TIER_N.c||1))*(r==='l'?MD(R,'leg',1):1);};
// ---- the sword in the stone (Excalibur): shows up in about 1 of 4 lives that reach the middle floors (R.exF, rolled in newRun), one try per life.
// Chance starts at EXC.p0% and grows EXC.dp% for every failed try across lives (tof-excal-v1 {v,n tries,got,f,who,t}: merged, never deleted or lowered).
// Only the player's hero carries h.ex={n,got} (snapshot at birth), so cohort heroes and the headless sim never touch storage. Pulled = every later life starts with the sword.
const EXC={p0:1,dp:2,max:50,atk:1.1,boss:1.1,fq:.32,lo:28,hi:58,hp:.05},EXK='tof-excal-v1';
function excLoad(){try{if(typeof localStorage==='undefined')return null;const v=JSON.parse(localStorage.getItem(EXK)||'null');return v&&typeof v==='object'?v:{};}catch(e){return null;}}
const excN=R=>{if(!R.h.ex)return 0;const v=excLoad();return Math.max(R.h.ex.n|0,v?Math.floor(+v.n||0):0);};
const excCh=(n,b)=>clamp(EXC.p0+EXC.dp*n+(b||0),EXC.p0,EXC.max);
function excRec(R,ok){if(!R.h.ex)return;const v=excLoad();if(!v)return;const o=Object.assign({},v,{v:1,n:Math.max(0,Math.floor(+v.n||0))+1});
 if(ok&&!v.got){o.got=1;o.f=R.floor;o.who=R.h.name;o.t=Date.now();}try{localStorage.setItem(EXK,JSON.stringify(o));}catch(e){}}
const excOk=R=>!!R.exF&&!hasSw(R)&&!R.used['sp:excal']&&R.floor>=R.exF&&R.floor<=95;
const EXS=[[0,'ด้ามดาบมีฝุ่นจับหนา ยังไม่มีรอยมือใครเลย'],[1,'บนด้ามมีรอยมือเก่าๆ ขนาดพอดีกับมือคุณ'],[4,'หินรอบใบดาบมีรอยร้าวเส้นเล็กๆ อยู่หลายเส้น'],[10,'รอยร้าวลามไปครึ่งก้อนแล้ว เศษหินกองอยู่ที่โคนดาบ'],[18,'หินแตกลายงาทั้งก้อน ใบดาบเอียงไปข้างหนึ่งนิดๆ']];
const EXF=[[1,'ดึงจนสุดแรงแล้ว ดาบไม่ขยับสักนิด เหมือนดึงเสาหอคอย'],[2,'ด้ามดาบอุ่นขึ้นในมือ แต่ใบดาบยังจมอยู่ในหินเท่าเดิม'],[4,'ดาบขยับขึ้นมานิดหนึ่ง มีเสียงหินครูดเบาๆ แล้วก็ติดแน่นอีก'],[7,'มีเสียงดังเปรี๊ยะ รอยร้าวเส้นใหม่วิ่งรอบใบดาบ'],[12,'หินร้าวเป็นทางยาว เศษหินร่วงลงพื้น ใบดาบโผล่ขึ้นมาอีกเกือบคืบ'],[18,'ดาบโยกไปมาในหินได้แล้ว อีกไม่กี่ชาติคงหลุด']];
const excLine=(L,n)=>{let t=L[0][1];for(const [k,s] of L)if(n>=k)t=s;return t;};
// extra choices by class (index fixed so saves stay valid; other classes get them hidden): 2 strength, 3 pry the stone, 4 pray first
const EXO=[null,null,{cl:['war','dra','dsl'],t:'ใช้แรงทั้งตัวกระชาก',b:4,hp:.15},{cl:['rog'],t:'แงะหินรอบใบดาบก่อน',b:3,hp:0,k:-1},{cl:['pri','ang'],t:'สวดขอพรก่อนแล้วค่อยดึง',b:2,hp:EXC.hp,k:1}];
SPECIAL.excal={w:0,ok:excOk,mk(R,K){const f=R.floor,n=excN(R),id=cid(R);K.data={n};K.tag=`ชั้น ${f} · ดาบที่รอเจ้าของ`;K.title='ดาบศักดิ์สิทธิ์ในหิน';K.vis={t:'prop',pr:'swordstone'};
  K.text=`แสงลอดลงมาจากรอยแยกบนเพดาน ตกลงบนหินก้อนใหญ่กลางห้อง ดาบเล่มหนึ่งปักจมอยู่ในหินถึงครึ่งใบ ตัวอักษรเก่าที่ฐานเขียนว่า "ผู้ใดถอนดาบนี้ได้ ผู้นั้นคือเจ้าของ" ${excLine(EXS,n)}${n?` (คนในชาติก่อนๆ ของคุณลองดึงมาแล้ว ${n} ครั้ง)`:''}`;
  const pull=(t,b,hp,k)=>CH(t,[{t:`โอกาสดึงออก ${excCh(n,b)}%`,c:'w'},{t:'ได้ดาบติดตัวไปทุกชาติ',c:'g'},...(hp?[{t:`ดึงไม่ออก HP −${Math.round(hp*100)}%`,c:'b'}]:[]),...(k?[kk(k)]:[])]);
  K.ch=[pull('ลองดึงดาบ',0,EXC.hp),CH('ไม่แตะ เดินผ่านไป',[{t:'ไม่เสี่ยง',c:''}])];
  for(let i=2;i<EXO.length;i++){const o=EXO[i],c=pull(o.t,o.b,o.hp,o.k);if(o.cl.includes(id))c.cl=id;else Object.assign(c,{cl:o.cl[0],hide:true,dis:true});K.ch.push(c);}
  K.ai=0;},
 res(R,K,i,out){const f=R.floor,h=R.h,n=K.data&&K.data.n||0,o=EXO[i]||{b:0,hp:EXC.hp};
  if(i===1){R.map[f-1]='calm';say(R,out,'คุณยืนมองดาบอยู่ครู่หนึ่ง แล้วเดินผ่านไป แสงบนเพดานค่อยๆ หรี่ลงข้างหลัง','info');return;}
  R.exT=(R.exT||0)+1;if(o.k)R.karma+=o.k;
  if(rnd()<excCh(n,o.b)/100){R.exc=1;R.excF=f;R.map[f-1]='good';excRec(R,true);out.excal=1;
   sayK(R,out,`ใบดาบเลื่อนออกจากหินง่ายจนแทบไม่ต้องออกแรง${n?` หลังจากคนในชาติก่อนๆ ลองมาแล้ว ${n} ครั้ง`:''} แสงจากเพดานตกลงบนคมดาบพอดี ดาบเล่มนี้จะอยู่กับคุณและทุกชาติที่ตามมา (ATK +10% · ตีบอสแรงขึ้น 10%)`,'lv');return;}
  excRec(R,false);R.map[f-1]='calm';if(o.hp)h.hp=Math.max(1,h.hp-h.mhp*o.hp);
  say(R,out,`${excLine(EXF,n+1)}${o.hp?` (HP −${Math.round(o.hp*100)}%)`:''} ชาติหน้าคงดึงง่ายขึ้นอีกหน่อย`,'bad');}};
TIER.excal='l';KEY_TG.excal=[['fight'],[],['fight'],['trick'],['pray']];
// ---- v2.7: the last path tier has to be won. Path 80 -> contest key moment "crown", one retry at 90.
// Ways: fair / spend gold / a patron's backing (a favour collected a few floors later, key "favor") / cheat (may be caught).
// R.cw={id,n tries,won,how,f,pat,caught,paid}; the tier itself is R.pathHi=3 (pathTier checks it). {r} = the rival's name.
const CROWN_T=[80,90];
const CROWN={
 war:{t:'ชิงชื่อวีรชนแห่งหอ',v:'knight',p:'แม่ทัพเฒ่าแห่งกองรักษาหอ',x:'ลานประลองชั้นนี้มีคนมุงจนล้นบันได ชื่อวีรชนแห่งหอมีได้คนเดียว และคนที่ถือชื่อนี้อยู่ตอนนี้คือ{r} นักรบหนวดขาวที่ไม่แพ้ใครมาสิบปี เขาชี้ดาบมาที่คุณ "อยากได้ก็มาเอาไปสิ"',
  h:'ประลองตัวต่อตัวตามกติกา',g:'จ้างครูดาบมาซ้อมให้ทั้งคืนก่อนลงสนาม',c:'แอบเลื่อยด้ามดาบของเขาไว้ครึ่งหนึ่ง',
  w:'ดาบของ{r}หลุดจากมือเป็นครั้งแรกในรอบสิบปี เขาคุกเข่าแล้วยื่นผ้าคาดหัวสีแดงให้คุณ คนดูตะโกนชื่อคุณจนหอสั่น',l:'{r}ฟาดสันดาบลงที่ไหล่คุณจนทรุด "ยังไม่ถึงเวลาของเจ้า" แล้วเดินกลับไปนั่งที่เดิม'},
 mag:{t:'สอบชิงตำแหน่งจอมปราชญ์',v:'scholar',p:'สภาจอมเวทชั้นบน',x:'หอสมุดลอยฟ้าเปิดสอบชิงตำแหน่งจอมปราชญ์สิบปีครั้ง ผู้คุมสอบคือ{r} ที่นั่งเก้าอี้นี้มานานจนเคราลากพื้น ข้อสอบมีข้อเดียว ให้เขียนรูนที่ยังไม่มีใครเขียนได้',
  h:'เขียนรูนด้วยความรู้ของตัวเอง',g:'ซื้อตำราเก่าจากพ่อค้าใต้ดินมาอ่านก่อนสอบ',c:'แอบลอกรูนจากกระดาษของคนข้างๆ',
  w:'รูนของคุณลอยขึ้นจากกระดาษแล้วลุกเป็นไฟสีน้ำเงิน {r}ลุกขึ้นยืนเป็นครั้งแรกในรอบหลายปี แล้วถอดแหวนประจำตำแหน่งวางไว้บนโต๊ะคุณ',l:'รูนของคุณระเบิดเป็นควันดำ {r}ส่ายหน้าช้าๆ แล้วขีดฆ่าชื่อคุณออกจากบัญชี'},
 arc:{t:'ล่าชิงชื่อเงาแห่งยอดไม้',v:'hunter',p:'สมาคมพรานป่า',x:'พรานทั้งหอนัดกันที่ป่าในร่มชั้นนี้ ใครยิงกวางเขาเงินได้ก่อนจะได้ชื่อเงาแห่งยอดไม้ไปครอง คู่แข่งตัวจริงคือ{r} ที่ว่ากันว่ายิงแมลงวันตกได้จากอีกฝั่งหุบ',
  h:'ตามรอยกวางด้วยตาของตัวเอง',g:'จ้างพรานท้องถิ่นพาไปที่ซ่อนของมัน',c:'ตัดสายธนูของ{r}ตอนเขาหลับ',
  w:'ลูกศรของคุณปักเขากวางเงินติดต้นไม้โดยไม่ถูกตัวมันเลย {r}ปรบมือให้ช้าๆ แล้วหักลูกศรของตัวเองทิ้ง',l:'ลูกศรของ{r}ถึงตัวกวางก่อนคุณแค่ช่วงหายใจเดียว เขาพยักหน้าให้คุณเหมือนจะบอกว่าคราวหน้าค่อยว่ากันใหม่'},
 pri:{t:'เลือกนักบุญแห่งหอ',v:'monk',p:'เจ้าอาวาสวัดใหญ่ชั้นล่าง',x:'ศาลาใหญ่ชั้นนี้กำลังเลือกนักบุญแห่งหอคนใหม่ อีกคนที่ถูกเสนอชื่อคือ{r} นักบวชที่คนทั้งหอรัก ชาวบ้านยืนรอฟังว่าใครจะได้ถือตะเกียงศักดิ์สิทธิ์ดวงนั้น',
  h:'รักษาคนเจ็บที่มารอให้ครบทุกคน แล้วให้ชาวบ้านตัดสิน',g:'บริจาคทองตั้งโรงทานหน้าศาลา',c:'ปล่อยข่าวว่า{r}แอบรับเงินคนป่วย',
  w:'ชาวบ้านยกมือให้คุณจนเต็มศาลา {r}เป็นคนแรกที่ก้มลงไหว้ แล้วส่งตะเกียงศักดิ์สิทธิ์ให้ด้วยมือตัวเอง',l:'มือที่ยกให้{r}มากกว่าของคุณอยู่แถวเดียว เขาเดินมาจับมือคุณ "ท่านช่วยข้าดูแลชั้นล่างได้ไหม"'},
 rog:{t:'ชิงบัลลังก์เจ้าแห่งเงา',v:'thief',p:'เจ้าพ่อตลาดมืด',x:'กิลด์เงาเรียกประชุมใต้สะพานหิน เจ้าแห่งเงาคนเก่าตายไปแล้ว ใครขโมยมงกุฎแก้วจากห้องนอนเจ้าเมืองชั้นบนได้ก่อนจะได้นั่งบัลลังก์ คู่แข่งที่น่ากลัวที่สุดคือ{r}',
  h:'ย่องเข้าไปเองด้วยฝีมือล้วนๆ',g:'ซื้อแผนผังห้องนอนจากคนรับใช้',c:'แจ้งยามว่า{r}จะเข้าไปคืนนี้',
  w:'คุณวางมงกุฎแก้วลงกลางวงประชุมก่อนรุ่งสาง {r}มาถึงทีหลังด้วยมือเปล่า คนทั้งกิลด์ยกมือแตะหน้าผากให้คุณ',l:'{r}โยนมงกุฎแก้วเล่นอยู่กลางวง ตอนที่คุณเพิ่งปีนหน้าต่างห้องเจ้าเมืองได้ครึ่งทาง'},
 far:{t:'ประกวดชิงชื่อเศรษฐีบ้านนา',v:'farmer',p:'กำนันประจำชั้น',x:'งานวัดชั้นนี้มีประกวดผลผลิตประจำปี คนชนะจะได้ชื่อเศรษฐีบ้านนาไปทั้งปี แผงข้างๆ คุณเป็นของ{r} ที่ชนะมาสามปีซ้อน ฟักทองของเขาใหญ่เท่าเกวียน',
  h:'ส่งผักที่ปลูกเองเข้าประกวด',g:'ซื้อปุ๋ยชั้นดีจากพ่อค้าเร่มาเร่งผลผลิต',c:'แอบเจาะฟักทองของ{r}ให้แห้งข้างใน',
  w:'กรรมการชิมผักของคุณแล้วนิ่งไปนาน ก่อนจะคล้องพวงมาลัยให้ {r}ยิ้มแห้งๆ แล้วขอเมล็ดพันธุ์ไปลองปลูกบ้าง',l:'ฟักทองของ{r}ได้ริบบิ้นทองไปอีกปี เขาตบไหล่คุณ "ปีหน้าลองใหม่นะ ดินของเจ้าดีอยู่แล้ว"'},
 dra:{t:'พิธีชิงเลือดมังกรแท้',vis:{t:'prop',pr:'altar'},p:'ผู้เฒ่าตระกูลมังกร',x:'แท่นศิลาเก่าชั้นนี้ส่งเสียงคำราม คนที่มีเลือดมังกรถูกเรียกมาที่นี่ คนที่ได้เลือดแท้จะเป็นมังกรในร่างคน อีกคนที่ยืนบนแท่นคือ{r} ตาของเขาเป็นสีเหลืองเหมือนตาคุณ',
  h:'ยืนต้านไฟจากแท่นด้วยตัวเอง',g:'ซื้อเกล็ดมังกรโบราณมากลืนก่อนพิธี',c:'ราดน้ำมนต์ลงบนแท่นฝั่งของ{r}',
  w:'ไฟจากแท่นไหลเข้าตัวคุณจนเกล็ดขึ้นเต็มแขน {r}ทรุดลงคุกเข่า ไฟฝั่งของเขาดับไปแล้ว',l:'ไฟเลือก{r}แทน แรงไฟผลักคุณตกจากแท่น ผิวแขนยังไหม้อยู่'},
 dsl:{t:'ล่าชิงชื่อผู้ปิดตำนาน',v:'hunter',p:'ประธานสมาคมนักล่ามังกร',x:'สมาคมนักล่ามังกรตั้งค่าหัวมังกรแก่ตัวสุดท้ายในหอ ใครได้เขี้ยวมันมาก่อนจะได้ชื่อผู้ปิดตำนาน {r}ออกล่าตัวเดียวกัน และออกจากเมืองก่อนคุณสองวัน',
  h:'ตามรอยเกล็ดที่หลุดร่วงไปเอง',g:'ซื้อหอกเงินจากช่างตีเหล็กของสมาคม',c:'ย้ายรอยเกล็ดล่อให้{r}เดินผิดทาง',
  w:'คุณกลับมาพร้อมเขี้ยวที่ยาวกว่าแขน ประธานสมาคมสลักชื่อคุณต่อท้ายรายชื่อบนกำแพง {r}ไม่พูดอะไร แต่ก็ยืนปรบมือ',l:'{r}โยนเขี้ยวมังกรลงบนโต๊ะสมาคมก่อนคุณกลับมาถึงครึ่งวัน'},
 nec:{t:'ชิงบัลลังก์ราชันย์ไร้ชีพ',v:'skeleton',p:'วิญญาณราชาองค์ก่อน',x:'สุสานใต้ชั้นนี้ไม่มีเจ้าของมาร้อยปี บัลลังก์กระดูกรอคนที่ปลุกศพได้มากที่สุด {r} เนโครแมนเซอร์อีกคน นั่งรออยู่แล้วกับกองทัพโครงกระดูกของเขา',
  h:'ปลุกศพทั้งสุสานด้วยพลังของตัวเอง',g:'ซื้อศพใหม่จากสัปเหร่อชั้นล่าง',c:'ขโมยคัมภีร์ของ{r}ไปเผาก่อนพิธี',
  w:'กระดูกทั้งสุสานลุกขึ้นหันหน้ามาทางคุณ {r}ได้แต่มองโครงกระดูกของตัวเองเดินข้ามมาฝั่งคุณทีละตัว',l:'ศพในสุสานลุกไปยืนข้าง{r}มากกว่า บัลลังก์กระดูกสั่นแล้วหันไปทางเขา'},
 ang:{t:'เลือกอัครทูต',vis:{t:'prop',pr:'shrine'},p:'อัครทูตองค์เก่า',x:'แสงจากเพดานรวมเป็นวงกลางห้อง ทูตสวรรค์ทั้งหอมาชุมนุมกันเพื่อเลือกอัครทูตองค์ใหม่ {r} ยืนอยู่ในวงแสงอีกฝั่ง ปีกของเธอขาวกว่าปีกคุณ',
  h:'ยืนในวงแสงแล้วให้สวรรค์ตัดสิน',g:'ถวายทองบูรณะวิหารทั้งหลัง',c:'บอกที่ประชุมว่า{r}เคยปล่อยให้คนตายต่อหน้า',
  w:'แสงทั้งวงไหลมาที่ปีกคุณจนห้องสว่างไปหมด {r}ยิ้มให้แล้วก้าวถอยออกจากวง',l:'แสงไหลไปที่ปีกของ{r} คุณยังยืนอยู่ในวง แต่รู้ตัวดีว่ารอบนี้ไม่ใช่คุณ'}};
const crownN=R=>R.cw&&R.cw.id===cid(R)?R.cw.n:0;
const crownDue=R=>{const id=cid(R);if(!R.alive||!pathOf(R)||!CROWN[id]||(R.pathHi||0)>=3)return false;const n=crownN(R);return n<CROWN_T.length&&(R.path||0)>=CROWN_T[n];};
const crownKey=R=>R.favor&&R.floor>=R.favor.at?'favor':crownDue(R)?'crown':'';
// base odds: level against the floor (promo's yardstick), karma (a necromancer counts dark karma), friends, and a little for trying again
function crownP(R){const h=R.h,ks=cid(R)==='nec'?-R.karma:R.karma;
 return clamp(.42+.015*(h.lv-(R.floor*.33+2))+clamp(ks*.004,-.1,.1)+.05*R.comps.length+.03*R.pets.length+(crownN(R)?.05:0),.15,.85);}
const crownCh=(R,id)=>clamp(.3-(eLuk(R)-8)*.008-(id==='rog'||id==='nec'?.1:0),.08,.45);
function crownWin(R,out){const P=pathOf(R);R.pathHi=3;if((R.path||0)<PATH_T[2])R.path=PATH_T[2];if(cid(R)==='mag'){R.h.mmp+=5;R.h.mp+=5;}
 if(P){say(R,out,`${P.n}: ขึ้นขั้น "${P.t[2]}" (${P.b[2]})`,'lv');out.pathUp=3;}}
const crownT=(C,r,s)=>String(s).replace(/\{r\}/g,r);
Object.assign(SPECIAL,{
 crown:{w:0,ok:crownDue,mk(R,K){const f=R.floor,id=cid(R),C=CROWN[id],P=pathOf(R),r=genName(),p0=crownP(R),cost=gS(R,60),pc=crownCh(R,id),n=crownN(R);
   const w=[p0,p0+.18,p0+.22,Math.min(.95,p0+.3)].map(x=>clamp(x,.05,.95));K.data={id,r,w,cost,pc};
   K.tag=`ชั้น ${f} · ชิงตำแหน่ง${n?' (ครั้งที่ 2)':''}`;K.title=C.t;K.vis=C.vis||npc(C.v);
   K.text=crownT(C,r,C.x)+` ชนะแล้วจะได้ขั้น "${P.t[2]}" (${P.b[2]})${n?' นี่เป็นโอกาสสุดท้ายของชาตินี้':' ถ้าแพ้ แต้มทางถึง 90 เมื่อไหร่ยังลองได้อีกครั้ง'}`;
   const wp=x=>{const v=Math.round(x*100);return{t:`โอกาสได้ตำแหน่ง ~${v}%`,c:v>=65?'g':v>=40?'w':'b'};};
   K.ch=[CH(crownT(C,r,C.h),[wp(w[0]),{t:'ไม่ติดค้างใคร',c:''}]),
    CH(crownT(C,r,C.g),[{t:`−${cost} ทอง`,c:'w'},wp(w[1]),...ngP(R,cost)],R.h.gold<cost),
    CH(`ขอให้${C.p}หนุนหลัง`,[wp(w[2]),{t:'ติดหนี้บุญคุณ อีกไม่กี่ชั้นจะมาทวง',c:'b'}]),
    CH(crownT(C,r,C.c),[wp(w[3]),{t:`${Math.round(pc*100)}% ถูกจับได้`,c:'b'},kk(-1)])];
   K.ch[0].tg=[];K.ch[1].tg=['trade'];K.ch[2].tg=[];K.ch[3].tg=['trick'];
   K.ai=(id==='rog'||id==='nec')&&pc<.2?3:R.h.gold>=cost+gS(R,20)?1:0;},
  res(R,K,i,out){const f=R.floor,h=R.h,D=K.data,C=CROWN[D.id],r=D.r;
   const cw=R.cw&&R.cw.id===D.id?R.cw:(R.cw={id:D.id,n:0,won:0});cw.n++;cw.f=f;cw.how=['fair','gold','pat','cheat'][i];
   const lose=t=>{h.hp-=h.mhp*.1;out.cause=`บาดเจ็บหนักตอนชิงตำแหน่ง (ชั้น ${f})`;R.map[f-1]='bad';say(R,out,t,'bad');
    say(R,out,cw.n<CROWN_T.length?'แต้มทางถึง 90 เมื่อไหร่ ยังมีสิทธิ์ชิงอีกครั้ง':'โอกาสชิงตำแหน่งนี้หมดแล้วสำหรับชาตินี้','info');};
   if(i===1)h.gold-=D.cost;
   if(i===2){R.favor={p:C.p,at:f+ri(5,9)};cw.pat=1;}
   if(i===3){R.karma-=1;if(rnd()<D.pc){cw.caught=(cw.caught||0)+1;R.karma-=2;const fine=Math.round(h.gold*.25);h.gold-=fine;
     lose(`มีคนเห็นตอนคุณลงมือ เรื่องแดงกลางที่ชุมนุม คุณถูกตัดสิทธิ์และโดนปรับไป ${fine} ทอง`);R.map[f-1]='evil';return;}}
   if(rnd()<D.w[i]){cw.won=1;R.map[f-1]=i===3?'evil':'good';say(R,out,crownT(C,r,C.w),'lv');crownWin(R,out);}
   else lose(crownT(C,r,C.l));}},
 favor:{w:0,ok:R=>!!R.favor&&R.floor>=R.favor.at,mk(R,K){const f=R.floor,F=R.favor,cost=Math.max(gS(R,70),Math.round(R.h.gold*.3)),en=foe(R,'คู่อริของผู้มีอิทธิพล','war',1.15),w=estW(R,en),g=gG(R,40);
   K.data={cost,en,g};K.tag=`ชั้น ${f} · ทวงบุญคุณ`;K.title=`คนของ${F.p}`;K.vis=npc('masked');
   K.text=`ชายใส่หน้ากากยืนรอคุณอยู่หัวบันได "${F.p}ฝากมาถามว่ายังจำได้ไหม ตอนชิงตำแหน่งท่านช่วยเจ้าไว้ ถึงคราวเจ้าตอบแทนบ้างแล้ว"`;
   K.ch=[CH('จ่ายคืนเป็นทอง',[{t:`−${cost} ทอง`,c:'w'},{t:'หมดหนี้กัน',c:'g'},...ngP(R,cost)],R.h.gold<cost),
    CH('รับงานสกปรกให้หนึ่งงาน',[{t:'ต้องสู้!',c:'b'},wPart(w),{t:`ชนะได้ +${g} ทอง`,c:'g'},kk(-1)]),
    CH('ปฏิเสธ',[{t:'LUK −2',c:'b'},{t:'6 ชั้นข้างหน้า โอกาสตายสูงขึ้น 25%',c:'b'}])];
   K.ch[0].tg=['trade'];K.ch[1].tg=['fight'];K.ch[2].tg=[];K.ai=R.h.gold>=cost?0:w>=60?1:2;},
  res(R,K,i,out){const f=R.floor,h=R.h,F=R.favor||{p:'ผู้มีอิทธิพล'},D=K.data;R.favor=null;if(R.cw)R.cw.paid=['gold','job','spurn'][i];
   if(i===0){h.gold-=D.cost;R.map[f-1]='calm';say(R,out,`ชายหน้ากากนับเหรียญจนครบ "${F.p}จะจำไว้ว่าเจ้าไม่เบี้ยว"`,'info');}
   else if(i===1){R.karma-=3;R.map[f-1]='fight';say(R,out,`งานที่ได้มาคือไปจัดการคนที่ขวางทาง${F.p}`,'bad');
    if(doFight(R,D.en,out,{cause:`ล้มลงระหว่างทำงานให้${F.p} (ชั้น ${f})`})){coin(R,out,D.g);say(R,out,`งานเสร็จ ${F.p}ส่งทองมาให้ ${D.g} พร้อมข้อความสั้นๆ ว่าหายกันแล้ว`,'info');}}
   else{h.luk=Math.max(0,h.luk-2);R.hzT.push({k:1.25,until:f+6,n:`${F.p}หันหลังให้`,ic:'🗡'});R.map[f-1]='bad';say(R,out,'ชายหน้ากากหัวเราะในคอ "ก็ได้ แต่ต่อจากนี้อย่าหวังว่าใครในหอจะช่วยเจ้า"','bad');}}}});
Object.assign(TIER,{crown:'l',favor:'r'});
// end-of-life archetype from the contest (feeds runTitle, the end screen and the share card)
function crownArch(R){const c=R.cw;if(!c||!c.n||c.id!==cid(R))return null;const P=pathOf(R),t3=P?P.t[2]:'';
 if(c.won){if(c.how==='cheat')return{p:7,t:'ผู้ไต่มาด้วยเล่ห์กล',d:`ได้ชื่อ${t3}มาเพราะโกงคู่แข่ง`};
  if(c.how==='pat')return c.paid==='spurn'?{p:7,t:'ผู้เบี้ยวหนี้บุญคุณ',d:`ได้ชื่อ${t3}เพราะมีคนหนุน แล้วไม่ยอมตอบแทน`}:{p:6,t:'ผู้มีเส้นสาย',d:`ได้ชื่อ${t3}เพราะมีคนใหญ่คนโตหนุนหลัง`};
  if(c.how==='gold')return{p:6,t:'ผู้ทุ่มทองชิงตำแหน่ง',d:`ทุ่มทองจนได้ชื่อ${t3}`};
  return c.n>=2?{p:7,t:'ผู้ไม่ยอมแพ้',d:`แพ้ครั้งแรก แล้วกลับมาชนะเป็น${t3}`,g:1}:{p:7,t:t3,d:`ชนะการชิงตำแหน่ง${t3}ด้วยฝีมือตัวเอง`,g:1};}
 if(c.caught)return{p:6,t:'คนโกงที่ถูกจับได้',d:`โกงตอนชิงชื่อ${t3}แล้วโดนจับได้กลางที่ชุมนุม`};
 if(c.n>=CROWN_T.length)return{p:6,t:'ผู้ชิงที่ไม่เคยได้ตำแหน่ง',d:`ชิงชื่อ${t3}สองครั้ง แพ้ทั้งสองครั้ง`};
 return{p:4,t:'ผู้ที่ยังไม่ได้แก้มือ',d:`แพ้การชิงชื่อ${t3} แล้วไม่ได้กลับมาแก้มือ`};}
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
  {r:'r',mk(R,K,A){const help=A.v.help;A.v.c=Math.max(A.v.c||0,gS(R,15));K.title='เด็กคนนั้นกลับมา';K.vis=help===0?{t:'prop',pr:'grave'}:{t:'comp',cls:'pri',c:{n:'ฟาง',cls:'pri',tr:'loyal',legend:false}};
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
  {mk(R,K,A){const f=R.floor;A.v.n=A.v.n||genName();A.v.cls=A.v.cls||pick(['war','mag','arc']);const n=A.v.n;K.title=`${n} คู่แข่งจากหมู่บ้านข้างๆ`;K.vis={t:'comp',cls:A.v.cls,c:{n,cls:A.v.cls,tr:'brave',legend:false}};
    const w=Math.round(estimateWin(R,Object.assign(mkMon({hp:1,atk:1,def:1},f,1),{n}),30)*100);
    K.text=`${n} นักผจญภัยรุ่นเดียวกับคุณยืนกอดอกรออยู่ "ได้ยินชื่อเจ้ามานานแล้ว มาดูกันว่าใครจะขึ้นไปได้สูงกว่า"`;
    K.ch=[CH('ดวลกันตรงนี้เลย',[{t:`โอกาสชนะ ~${w}%`,c:w>=60?'g':'w'},{t:'+EXP +ทอง',c:'g'}]),CH('จับมือแล้วแลกแผนที่กัน',[{t:'LUK +2',c:'g'}]),CH('แอบตัดเชือกปีนของเขา',[{t:`+${gG(R,30)} ทอง`,c:'g'},kk(-3)])];K.ai=w>=70?0:1;},
   res(R,K,i,out,A){const f=R.floor,n=A.v.n;
    if(i===0){R.map[f-1]='fight';say(R,out,`ดวลกับ${n}!`,'info');const win=duel(R,out,n,A.v.cls,1,{});A.v.rel=win?'beaten':'beat';if(!win){R.h.hp=Math.max(R.h.hp,R.h.mhp*.15);say(R,out,`${n}เก็บดาบเข้าฝัก "อ่อนกว่าที่คิดนะ"`,'bad');}}
    else if(i===1){R.h.luk+=2;A.v.rel='friend';R.map[f-1]='good';say(R,out,`${n}วาดทางลับให้สองสามทาง แล้วแยกกันไปคนละทาง`,'good');}
    else{coin(R,out,gG(R,30));R.karma-=3;A.v.rel='wronged';R.map[f-1]='evil';say(R,out,'ได้ยินเสียงร้องกับเสียงของหนักตกกระแทกดังมาจากด้านหลัง คุณไม่หันไปดู','bad');}}},
  {r:'r',mk(R,K,A){const f=R.floor,n=A.v.n,rel=A.v.rel,c=Math.round(40*scl(f));A.v.c=c;K.title=`${n} อีกครั้ง`;K.vis={t:'comp',cls:A.v.cls,c:{n,cls:A.v.cls,tr:rel==='friend'?'loyal':'brave',legend:false}};
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
  {r:'l',mk(R,K,A){const n=A.v.n,ally=A.v.rel==='friend'||A.v.rel==='respect';K.title=`ศึกสุดท้ายของ${n}`;K.vis={t:'comp',cls:A.v.cls,c:{n,cls:A.v.cls,tr:ally?'loyal':'brave',legend:false}};A.v.ally=ally;
    if(ally){K.text=`${n} นอนหายใจรวยรินอยู่ข้างบันได พิษจากบอสลามไปทั้งแขน "ข้าไปต่อไม่ไหวแล้ว เอาชะตาที่เหลือของข้าไปใช้เถอะ"`;
     K.ch=[CH('รับชะตาของเพื่อน',[{t:'ชะตายืดออกมาก',c:'g'}]),CH('แบกเขาลงไปหาหมอ',[{t:'HP −30%',c:'b'},kk(4)]),CH('นั่งอยู่ด้วยจนวาระสุดท้าย',[{t:'LUK +3',c:'g'},kk(2)])];K.ai=0;}
    else{K.text=`${n} ยืนรออยู่บนสะพานหินแคบๆ ข้างล่างเป็นเหวมืด "ชั้นนี้มีที่ยืนแค่คนเดียว"`;
     K.ch=[CH('ดวลจนกว่าจะจบ',[{t:'คู่ต่อสู้แข็งมาก',c:'b'},{t:'ชนะได้ทองก้อนโต',c:'g'}]),CH('ยื่นมือให้เขา',[{t:'อาจจบดี หรือโดนผลักตก',c:'w'},kk(3)])];K.ai=1;}},
   res(R,K,i,out,A){const f=R.floor,h=R.h,n=A.v.n;const ix=R.comps.findIndex(c=>c.n===n);if(ix>=0)R.comps.splice(ix,1);
    if(A.v.ally){if(i===0){R.map[f-1]='good';const d=shiftFate(R,ri(6,10));say(R,out,`${n}หลับตาลงพร้อมรอยยิ้ม ${fateFeel(d)}`,'lv');}
     else if(i===1){h.hp-=h.mhp*.3;R.karma+=4;R.map[f-1]='good';say(R,out,`คุณแบก${n}ลงไปหกชั้นจนเจอหมอ เขารอด แต่คงไม่ได้ปีนหออีกแล้ว`,'good');}
     else{h.luk+=3;R.karma+=2;R.map[f-1]='calm';say(R,out,`${n}เล่าเรื่องหมู่บ้านจนหลับไป คุณฝังเขาไว้ใต้บันไดพร้อมดาบของเขา`,'info');}}
    else{if(i===0){R.map[f-1]='fight';if(duel(R,out,n,A.v.cls,1.35,{})){const g=gG(R,120);h.gold+=g;h.atk+=3+f*.1;out.coins=g;say(R,out,`${n}ร่วงลงเหวไปพร้อมเสียงหัวเราะ ทิ้งถุงทอง ${g} กับดาบไว้บนสะพาน`,'lv');}}
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
// arcs wave 2 (branch key kept in A.v.deal so each branch gets its own tid)
Object.assign(ARCS,{
 squire:{n:'เด็กฝึกอัศวิน',st:[
  {mk(R,K,A){const c=gS(R,15);A.v.n=A.v.n||genName();A.v.c=c;const n=A.v.n;K.title=`${n} เด็กฝึกอัศวิน`;K.vis=npc('knight');
    K.text=`เด็กหนุ่มสวมเกราะหลวมโพรกเดินตามคุณมาสามชั้นแล้ว เขาชื่อ${n} "ข้าอยากเป็นอัศวิน ให้ข้าถือของให้ท่านเถอะ ไม่เอาค่าจ้างสักเหรียญ"`;
    K.ch=[CH('รับเป็นลูกศิษย์',[{t:`−${c} ทอง (ค่าเสบียง)`,c:'w'},{t:'LUK +1',c:'g'},kk(1),...ngP(R,c)],R.h.gold<c),
     CH('สอนท่าพื้นฐานแล้วส่งกลับบ้าน',[{t:'+EXP',c:'g'},kk(1)]),
     CH('ให้เขาเดินนำหน้าลองกับดัก',[{t:'ชะตายืดออกนิดหน่อย',c:'g'},{t:'✧ กรรมชั่วหนัก',c:'kk'}])];K.ai=R.h.gold>=c?0:1;},
   res(R,K,i,out,A){const f=R.floor,h=R.h,n=A.v.n;A.v.deal=['took','taught','used'][i];if(i)A.v.short=1;
    if(i===0){h.gold-=A.v.c;h.luk+=1;R.karma+=1;R.map[f-1]='good';say(R,out,`${n}แบกเป้ของคุณขึ้นบันไดอย่างภูมิใจ ทั้งที่เป้ใหญ่กว่าตัวเขาเสียอีก`,'good');}
    else if(i===1){xp(R,out,8,1.5);R.karma+=1;R.map[f-1]='calm';say(R,out,`${n}ฝึกจนมือพอง แล้วสัญญาว่าจะกลับมาอีกตอนพร้อม`,'good');}
    else{R.karma-=4;const d=shiftFate(R,ri(1,2));R.map[f-1]='evil';say(R,out,`${n}เหยียบแผ่นหินกลไกแทนคุณสองแผ่น แผ่นที่สองลูกดอกปักขาเขาจนล้ม ${fateFeel(d)}`,'bad');}}},
  {r:'r',mk(R,K,A){const f=R.floor,n=A.v.n,deal=A.v.deal;K.vis=npc('knight');
    if(deal==='took'){const cp=mkHire(R,n,'war','loyal',1.25),c=gS(R,30);A.v.cp=cp;A.v.c2=c;K.title=`${n} โตขึ้นแล้ว`;
     K.text=`${n}ไม่ใช่เด็กที่เดินตามหลังอีกต่อไป เมื่อคืนมอนสเตอร์บุกเข้ามา เขาชักดาบได้ก่อนคุณเสียอีก "ข้าพร้อมแล้ว จะให้ข้ายืนข้างท่าน หรือจะส่งข้าไปสอบเป็นอัศวินก็ได้"`;
     K.ch=[CH('ให้เขาร่วมทีมเต็มตัว',[{t:`พลัง ${Math.round(cp.pw)} · ภักดี`,c:'g'},...fullP(R)]),
      CH('ส่งเขาไปสอบเป็นอัศวิน',[{t:`−${c} ทอง (ค่าสอบ)`,c:'w'},kk(2),{t:'เขาจะกลับมาตอบแทน',c:'g'},...ngP(R,c)],R.h.gold<c)];K.ai=R.comps.length<2?0:R.h.gold>=c?1:0;}
    else if(deal==='taught'){const d=2+f*.1;A.v.d=d;K.title=`อัศวิน${n}`;
     K.text=`อัศวินหนุ่มในเกราะใหม่เอี่ยมโค้งให้คุณกลางบันได เขาคือ${n} "ท่าที่ท่านสอนวันนั้น ข้ายังซ้อมทุกเช้า วันนี้ข้าขอตอบแทนบ้าง"`;
     K.ch=[CH('รับโล่ที่เขาตีมาให้',[{t:`DEF +${d.toFixed(1)}`,c:'g'}]),CH('ชวนเขาร่วมทีม',[{t:'ได้อัศวินภักดีร่วมทาง',c:'g'},...fullP(R)])];K.ai=R.comps.length<2?1:0;}
    else{const c=gS(R,40);A.v.c2=c;K.title=`${n} กับขาข้างนั้น`;
     K.text=`${n}เดินกะเผลกสวนลงมา ขาข้างที่โดนลูกดอกวันนั้นยังพันผ้าอยู่ "ข้ายังอยากเป็นอัศวินอยู่นะ แต่ไม่ใช่อัศวินแบบท่าน"`;
     K.ch=[CH('ขอโทษแล้วจ่ายค่ารักษา',[{t:`−${c} ทอง`,c:'w'},{t:'LUK +2',c:'g'},kk(3),...ngP(R,c)],R.h.gold<c),CH('บอกว่าเขาอ่อนเกินไปเอง',[{t:'ATK +',c:'g'},kk(-2)]),CH('เดินผ่านไปไม่พูดอะไร',[{t:'อายุขัยสั้นลงนิดหน่อย',c:'b'}])];K.ai=R.h.gold>=c?0:2;}},
   res(R,K,i,out,A){const f=R.floor,h=R.h,n=A.v.n,deal=A.v.deal;R.map[f-1]='comp';
    if(deal==='took'){if(i===0){A.v.deal='party';hire(R,out,Object.assign({},A.v.cp));}else{h.gold-=A.v.c2;R.karma+=2;A.v.deal='knight';R.map[f-1]='good';say(R,out,`${n}โค้งให้คุณจนหัวแทบจรดพื้น แล้ววิ่งลงบันไดไปทางเมืองหลวง`,'good');}}
    else if(deal==='taught'){A.done=1;if(i===0){h.def+=A.v.d;R.map[f-1]='good';say(R,out,'ขอบโล่สลักชื่อคุณไว้ ตัวหนังสือเบี้ยวไปนิดหน่อย','good');}else hire(R,out,mkHire(R,n,'war','loyal',1.2));}
    else{A.done=1;if(i===0){h.gold-=A.v.c2;h.luk+=2;R.karma+=3;R.map[f-1]='good';say(R,out,`${n}รับเงินไปเงียบๆ ก่อนเดินจากไปเขาหันมาพยักหน้าให้ครั้งหนึ่ง`,'good');}
     else if(i===1){h.atk+=1.5+f*.08;R.karma-=2;R.map[f-1]='evil';say(R,out,`${n}กำหมัดแน่นแต่ไม่พูดอะไร คุณเดินผ่านไปโดยไม่หันกลับไปมอง`,'bad');}
     else{const d=shiftFate(R,-ri(1,2));R.map[f-1]='bad';say(R,out,`สายตาของ${n}ตามหลังคุณไปอีกหลายชั้น ${fateFeel(d)}`,'bad');}}}},
  {r:'l',mk(R,K,A){const f=R.floor,n=A.v.n,inP=R.comps.some(c=>c.n===n);A.v.inP=inP;K.vis=npc('knight');K.title=`คำสาบานของ${n}`;
    if(inP){const en=Object.assign(mkMon({hp:1.6,atk:1.3,def:1.2},f,1),{id:'merc',n:'อัศวินดำไร้หัว',cls:'war'}),w=estW(R,en);A.v.en=en;
     K.text=`อัศวินดำไร้หัวควบม้ากระดูกลงบันไดมา ${n}ก้าวออกไปยืนบังหน้าคุณ "ครั้งนี้ขอให้ข้าเป็นโล่ให้ท่านบ้าง"`;
     K.ch=[CH('ให้เขารับศึกนี้แทน',[{t:`${n}จะไม่กลับมา`,c:'b'},{t:'ชะตายืดออก',c:'g'}]),CH('ผลักเขาออกแล้วรับเอง',[{t:'HP −35%',c:'b'},{t:'DEF +',c:'g'},kk(3)]),CH('สู้ไปด้วยกัน',[wPart(w),{t:'ชนะได้ทองก้อนโต + ATK',c:'g'}])];K.ai=w>=60?2:1;}
    else{const d=3+f*.15;A.v.d=d;
     K.text=`${A.v.deal==='party'?`${n}ที่แยกทางไปเมื่อหลายชั้นก่อน`:n}ยืนรออยู่หัวบันไดในชุดอัศวินเต็มยศ ตราบนโล่เป็นรูปถุงเสบียงใบเดียวกับที่คุณเคยแบ่งให้ "ข้าสาบานไว้แล้วว่าจะตอบแทนท่านหนึ่งครั้ง"`;
     K.ch=[CH('รับโล่ประจำตระกูลของเขา',[{t:`DEF +${d.toFixed(1)}`,c:'g'},{t:'HP สูงสุด +8%',c:'g'}]),CH('ขอให้เขาคุ้มกันคุณสักพัก',[{t:'8 ชั้นข้างหน้า โอกาสตายลดลง 40%',c:'g'}]),CH('ไม่ขออะไร บอกให้เขาปีนต่อไป',[{t:'LUK +3',c:'g'},kk(3)])];K.ai=1;}},
   res(R,K,i,out,A){const f=R.floor,h=R.h,n=A.v.n;
    if(A.v.inP){if(i===0){const ix=R.comps.findIndex(c=>c.n===n);if(ix>=0)R.comps.splice(ix,1);const d=shiftFate(R,ri(5,8));R.map[f-1]='good';say(R,out,`${n}กอดอัศวินดำร่วงลงเหวไปด้วยกัน ${fateFeel(d)}`,'lv');}
     else if(i===1){h.hp-=h.mhp*.35;h.def+=3+f*.12;R.karma+=3;R.map[f-1]='good';say(R,out,`หอกของอัศวินดำแทงทะลุเกราะคุณเข้าไปครึ่งนิ้ว ${n}ร้องไห้ตอนช่วยพันแผล แล้วเอาเกราะของศัตรูมาตีให้คุณใหม่`,'good');}
     else{R.map[f-1]='fight';if(doFight(R,A.v.en,out,{cause:`ล้มลงข้าง${n}ในศึกกับอัศวินดำ (ชั้น ${f})`})){const g=gG(R,120);coin(R,out,g);h.atk+=3+f*.1;say(R,out,`อัศวินดำแตกเป็นผงกระดูก ${n}ชูดาบขึ้นฟ้าแล้วหัวเราะลั่น ในอานม้ากระดูกมีทอง ${g}`,'lv');}}}
    else{if(i===0){h.def+=A.v.d;h.mhp*=1.08;R.map[f-1]='good';say(R,out,'โล่ประจำตระกูลหนักจนต้องถือสองมือ แต่พอถือแล้วก็ไม่อยากวางลง','good');}
     else if(i===1){R.hzT.push({k:.6,until:f+8,n:`${n}คอยคุ้มกันอยู่ห่างๆ`,ic:'🛡'});R.map[f-1]='good';say(R,out,`${n}เดินตามคุณห่างๆ อยู่แปดชั้น ไม่มีอะไรเข้าใกล้คุณได้เลย`,'good');}
     else{h.luk+=3;R.karma+=3;R.map[f-1]='good';say(R,out,`${n}ยิ้มกว้าง แล้ววิ่งขึ้นบันไดนำหน้าคุณไปเหมือนวันแรกที่เจอกัน`,'good');}}}}]},
 cult:{n:'ลัทธิเปลวเทียน',st:[
  {mk(R,K,A){K.title='คนแจกเทียน';K.vis=npc('cultist');
    K.text='ชายในชุดคลุมแดงยื่นเทียนเล่มเล็กให้คุณ เปลวไฟของมันเป็นสีเขียว "พวกเราสวดกล่อมให้หอคอยหลับ ใครอยู่กับเรา หอจะไม่กินคนนั้น"';
    K.ch=[CH('รับเทียนแล้วเข้าร่วม',[{t:'ชะตายืดออกนิดหน่อย',c:'g'},kk(-1)]),CH('แกล้งเข้าร่วมเพื่อสืบความลับ',[{t:'LUK +1',c:'g'},{t:'ถ้าถูกจับได้จะเจ็บตัว',c:'b'}]),CH('ปฏิเสธแล้วเป่าเทียนดับ',[kk(1),{t:'ลัทธิจะจำหน้าคุณได้',c:'b'}])];K.ai=1;},
   res(R,K,i,out,A){const f=R.floor;A.v.deal=['join','spy','refuse'][i];
    if(i===0){R.karma-=1;const d=shiftFate(R,ri(1,2));R.map[f-1]='evil';say(R,out,`เทียนในมือคุณอุ่นขึ้นมาเอง ${fateFeel(d)}`,'info');}
    else if(i===1){R.h.luk+=1;R.map[f-1]='calm';say(R,out,'คุณสวดตามพวกเขาได้คล่องจนตัวเองยังตกใจ','info');}
    else{R.karma+=1;R.map[f-1]='calm';say(R,out,'เปลวเขียวดับลง ชายชุดแดงจ้องหน้าคุณนิ่ง แล้วจดอะไรบางอย่างลงสมุดเล่มเล็ก','info');}}},
  {r:'r',mk(R,K,A){const f=R.floor,deal=A.v.deal;K.vis=npc('cultist');
    if(deal==='join'){K.title='เครื่องเซ่นคืนเดือนดับ';const en=foe(R,'สาวกลัทธิ','mag',1);A.v.en=en;const w=estW(R,en);
     K.text='พิธีใหญ่คืนนี้ต้องใช้เครื่องเซ่น หัวหน้าลัทธิชี้นิ้วมาที่คุณ "ของรักของเจ้าสักอย่าง หรือไม่ก็เลือดของเจ้าเอง เลือกเอา"';
     K.ch=[CH('ถวายสัตว์เลี้ยง',[{t:'เสียสัตว์เลี้ยง 1 ตัว',c:'b'},{t:'ชะตายืดออกมาก',c:'g'},{t:'✧ กรรมชั่วหนัก',c:'kk'}],!R.pets.length),CH('ถวายเลือดตัวเอง',[{t:'HP สูงสุด −12%',c:'b'},{t:'ชะตายืดออก',c:'g'}]),CH('หนีออกจากลัทธิกลางพิธี',[{t:'ต้องสู้กับสาวกลัทธิ',c:'b'},wPart(w),kk(2)])];K.ai=1;}
    else if(deal==='spy'){const p=riskAdj(R,.45),g=gG(R,70),en=foe(R,'สาวกลัทธิ','mag',1.1);A.v.p=p;A.v.g=g;A.v.en=en;K.title='ห้องลับของหัวหน้าลัทธิ';
     K.text='คุณแฝงตัวอยู่ในลัทธิมาหลายชั้น คืนนี้ห้องของหัวหน้าลัทธิเปิดทิ้งไว้ บนโต๊ะมีถุงทองกับรายชื่อเหยื่อรอบหน้า ชื่อแรกเป็นคนที่คุณรู้จัก';
     K.ch=[CH('ขโมยรายชื่อไปเตือนคนอื่น',[{t:'LUK +2',c:'g'},kk(3)]),CH('ขโมยถุงทอง',[{t:`+${g} ทอง`,c:'g'},kk(-1)]),CH('เอาไปทั้งสองอย่าง',[{t:`+${g} ทอง`,c:'g'},kk(2),{t:`${Math.round(p*100)}% ถูกจับได้ ต้องสู้`,c:'b'}])];K.ai=0;}
    else{const en=Object.assign(mkMon({hp:1.4,atk:1.1,def:1},f,1),{id:'merc',n:'สาวกลัทธิสามคน',cls:'mag'}),w=estW(R,en);A.v.en=en;K.title='เทียนสีเขียวสามเล่ม';
     K.text='สาวกลัทธิสามคนดักรออยู่หัวบันได เทียนในมือพวกมันเป็นเปลวสีเขียวเหมือนเล่มที่คุณเป่าดับวันนั้น "หัวหน้าอยากคุยกับเจ้า"';
     K.ch=[CH('สู้',[wPart(w),{t:'+EXP +ทอง',c:'g'}]),CH('วิ่งฝ่าไป',[{t:'HP −20%',c:'b'}]),CH('ยอมไปพบหัวหน้า',[{t:'ชะตายืดออกนิดหน่อย',c:'g'},kk(-2)])];K.ai=w>=60?0:1;}},
   res(R,K,i,out,A){const f=R.floor,h=R.h,deal=A.v.deal;
    if(deal==='join'){if(i===0){const p=R.pets.pop();R.karma-=5;const d=shiftFate(R,ri(4,7));R.map[f-1]='evil';A.v.deal='deep';say(R,out,`${PETS[p].n}มองหน้าคุณจนวินาทีสุดท้าย ${fateFeel(d)}`,'bad');}
     else if(i===1){h.mhp*=.88;h.hp=Math.min(h.hp,h.mhp);const d=shiftFate(R,ri(2,4));R.map[f-1]='bad';A.v.deal='deep';say(R,out,`เลือดไหลลงร่องหินเป็นวงกลม ${fateFeel(d)}`,'bad');}
     else{R.karma+=2;R.map[f-1]='fight';A.v.deal='fled';say(R,out,'คุณคว่ำแท่นบูชาแล้ววิ่ง สาวกลัทธิไล่ตามมาติดๆ','bad');doFight(R,A.v.en,out);}}
    else if(deal==='spy'){if(i===0){h.luk+=2;R.karma+=3;R.map[f-1]='good';A.v.deal='hero';say(R,out,'คนในรายชื่อหนีลงหอไปได้ทันทุกคน หัวหน้าลัทธิพลิกหาตัวคนทรยศอยู่ทั้งคืน','good');}
     else if(i===1){coin(R,out,A.v.g);R.karma-=1;R.map[f-1]='treasure';A.v.deal='thief';say(R,out,`ถุงทองหนักกว่าที่คิด ข้างในมี ${A.v.g} เหรียญ`,'good');}
     else{coin(R,out,A.v.g);R.karma+=2;A.v.deal='hero';if(rnd()<A.v.p){R.map[f-1]='fight';say(R,out,'ประตูห้องปิดลงข้างหลัง สาวกลัทธิยืนขวางทางออกไว้','bad');doFight(R,A.v.en,out);}else{R.map[f-1]='treasure';say(R,out,'คุณออกมาได้ทั้งทองและรายชื่อ ไม่มีใครรู้ตัวเลย','good');}}}
    else{if(i===0){R.map[f-1]='fight';A.v.deal='enemy';doFight(R,A.v.en,out,{rw:1.5});}
     else if(i===1){h.hp-=h.mhp*.2;R.map[f-1]='flee';A.v.deal='enemy';say(R,out,'มีดพิธีเฉือนแขนไปแผลหนึ่ง แต่คุณก็ฝ่าออกมาได้','bad');}
     else{R.karma-=2;const d=shiftFate(R,ri(1,2));R.map[f-1]='evil';A.v.deal='deep';say(R,out,`หัวหน้าลัทธิยิ้มแล้วยื่นเทียนเล่มใหม่ให้ ${fateFeel(d)}`,'info');}}}},
  {r:'l',mk(R,K,A){const f=R.floor,deep=A.v.deal==='deep',en=Object.assign(mkMon({hp:1.5,atk:1.3,def:1.2},f,1),{id:'merc',n:'หัวหน้าลัทธิเปลวเทียน',cls:'mag'}),w=estW(R,en);A.v.en=en;K.vis=npc('cultist');K.title='คืนปลุกหอคอย';
    if(deep){const a=5+f*.22;A.v.a=a;K.text='หัวหน้าลัทธิวางมีดพิธีลงในมือคุณ กลางวงเทียนมีหัวใจหินก้อนใหญ่เต้นตุบๆ "แทงลงไป แล้วหอคอยจะจำชื่อเจ้าไปตลอดกาล"';
     K.ch=[CH('แทงลงไป',[{t:`ATK +${a.toFixed(1)}`,c:'g'},{t:'ชะตายืดออกมาก',c:'g'},{t:'✧ กรรมชั่วหนัก',c:'kk'}]),CH('แทงหัวหน้าลัทธิแทน',[wPart(w),{t:'ชนะได้ทองก้อนโต',c:'g'},kk(3)]),CH('วางมีดแล้วเดินออกมา',[{t:'LUK +2',c:'g'},kk(2)])];K.ai=w>=65?1:2;}
    else{const p=riskAdj(R,.45);A.v.p=p;K.text=`หัวหน้าลัทธิยืนรออยู่กลางวงเทียนนับพันเล่ม "เจ้าคือคนที่ทำพิธีของข้าพัง${A.v.deal==='thief'?' แล้วยังขโมยทองข้าไปอีก':''} คืนนี้หอคอยจะได้กินเจ้าแทน"`;
     K.ch=[CH('สู้กับหัวหน้าลัทธิ',[wPart(w),{t:'ชนะได้ทองก้อนโต + ATK',c:'g'}]),CH('ดับเทียนทุกเล่มก่อนพิธีเสร็จ',[{t:`${100-Math.round(p*100)}% ชะตายืดออก`,c:'g'},kk(3),{t:`/ ${Math.round(p*100)}% โดนไฟลวก HP −30%`,c:'b'}]),CH('วิ่งลงบันได',[{t:'HP −10%',c:'b'}])];K.ai=w>=60?0:1;}},
   res(R,K,i,out,A){const f=R.floor,h=R.h,cause=`ถูกหัวหน้าลัทธิสังเวยกลางวงเทียน (ชั้น ${f})`;
    if(A.v.deal==='deep'){if(i===0){h.atk+=A.v.a;R.karma-=5;const d=shiftFate(R,ri(5,8));R.map[f-1]='evil';say(R,out,`หัวใจหินหยุดเต้น เสียงหัวเราะดังมาจากผนังทุกด้าน ${fateFeel(d)}`,'bad');}
     else if(i===1){R.karma+=3;R.map[f-1]='fight';if(doFight(R,A.v.en,out,{cause})){const g=gG(R,130);coin(R,out,g);say(R,out,`เทียนทุกเล่มดับพร้อมกัน ใต้แท่นมีทอง ${g} ที่ลัทธิสะสมไว้`,'lv');}}
     else{h.luk+=2;R.karma+=2;R.map[f-1]='good';say(R,out,'คุณวางมีดลงแล้วเดินออกมา ไม่มีใครกล้าขวาง','good');}}
    else{if(i===0){R.map[f-1]='fight';if(doFight(R,A.v.en,out,{cause})){const g=gG(R,130);coin(R,out,g);h.atk+=3+f*.1;say(R,out,`หัวหน้าลัทธิล้มลงกลางวงเทียน ในเสื้อคลุมมีทอง ${g} กับแหวนตราลัทธิ`,'lv');}}
     else if(i===1){if(rnd()<A.v.p){h.hp-=h.mhp*.3;R.map[f-1]='trap';out.cause=`ไฟจากวงเทียนลามทั้งตัว (ชั้น ${f})`;say(R,out,'เทียนเล่มสุดท้ายล้มใส่เสื้อคลุม ไฟลุกขึ้นมาถึงคอ','bad');}
      else{R.karma+=3;const d=shiftFate(R,ri(3,5));R.map[f-1]='good';say(R,out,`เทียนดับลงทีละเล่มจนห้องมืดสนิท หัวหน้าลัทธิกรีดร้องอยู่ในความมืด ${fateFeel(d)}`,'good');}}
     else{h.hp-=h.mhp*.1;R.map[f-1]='flee';say(R,out,'คุณวิ่งลงบันไดไปสองชั้นกว่าจะกล้าหันกลับไปมอง','bad');}}}}]},
 cat9:{n:'แมวเก้าชีวิต',st:[
  {mk(R,K,A){K.title='แมวดำผอมโซ';K.vis=npc('cat');
    K.text='แมวดำผอมจนเห็นซี่โครงเดินตามคุณมาสองชั้นแล้ว ทุกครั้งที่คุณหยุด มันก็หยุดด้วยแล้วร้องเสียงแหบๆ';
    K.ch=[CH('แบ่งเสบียงให้มันกิน',[{t:'−1 ยา',c:'w'},kk(2)],R.potions<1),CH('อุ้มขึ้นบ่าไปด้วย',[{t:'LUK +1',c:'g'},{t:'โดนข่วน HP −5%',c:'b'}]),CH('ไล่มันไป',[{t:'ไม่ต้องแบ่งเสบียง',c:''},kk(-1)])];K.ai=R.potions>=2?0:1;},
   res(R,K,i,out,A){const f=R.floor,h=R.h;A.v.deal=['fed','carry','shoo'][i];if(i===2)A.v.short=1;
    if(i===0){R.potions--;R.karma+=2;R.map[f-1]='good';say(R,out,'มันกินจนพุงกาง แล้วนอนหลับบนเท้าคุณจนเช้า','good');}
    else if(i===1){h.luk+=1;h.hp-=h.mhp*.05;R.map[f-1]='calm';say(R,out,'มันข่วนคุณไปทีหนึ่ง ก่อนจะยอมนั่งบนบ่าแล้วหลับไป','info');}
    else{R.karma-=1;R.map[f-1]='calm';say(R,out,'มันวิ่งหายเข้าไปในเงามืด แต่เสียงร้องยังดังตามมาอีกนาน','info');}}},
  {r:'r',mk(R,K,A){const f=R.floor;K.vis=npc('cat');
    if(A.v.deal!=='shoo'){const g=gG(R,45),en=beast(R,1.3,'{m}ตัวโต'),w=estW(R,en);A.v.g=g;A.v.en=en;K.title='ทางแยกที่แมวเลือก';
     K.text='แมวตัวนั้นนั่งรออยู่ตรงทางแยก หางชี้ไปทางซ้าย ส่วนทางขวามีกลิ่นคาวเลือดลอยมา กับเสียงอะไรบางอย่างกำลังแทะกระดูก';
     K.ch=[CH('เดินตามหางแมว',[{t:`+${g} ทอง`,c:'g'},{t:'ไม่เสี่ยง',c:''}]),CH('ไปทางขวา ตามกลิ่นเลือด',[{t:'ต้องสู้!',c:'b'},wPart(w),{t:'ชนะได้ทองกับ EXP สองเท่า',c:'g'}])];K.ai=0;}
    else{const en=Object.assign(mkMon({hp:1.1,atk:1.1,def:1},f,1),{id:'wraith',n:'เงาแมวแปดตัว'}),w=estW(R,en);A.v.en=en;K.title='เงาแมวแปดตัว';
     K.text='แมวดำตัวเดิมยืนขวางบันได ขนตั้งชันไปทั้งตัว ข้างหลังมันมีเงาแมวอีกแปดตัวยืนเรียงแถว ตาทุกคู่จ้องมาที่คุณ';
     K.ch=[CH('ขอโทษแล้ววางอาหารไว้ให้',[{t:'−1 ยา',c:'w'},kk(2)],R.potions<1),CH('ชักดาบไล่',[wPart(w),kk(-1)]),CH('ยืนนิ่งให้มันข่วนสักที',[{t:'HP −15%',c:'b'},{t:'หายกัน',c:''}])];K.ai=R.potions>=1?0:2;}},
   res(R,K,i,out,A){const f=R.floor,h=R.h;
    if(A.v.deal!=='shoo'){if(i===0){coin(R,out,A.v.g);R.map[f-1]='treasure';say(R,out,`ทางซ้ายพาไปเจอโพรงหนูที่มีทองซ่อนอยู่ ${A.v.g} เหรียญ แมวนั่งรอจนคุณเก็บครบ`,'good');}
     else{R.map[f-1]='fight';say(R,out,`${A.v.en.n}เงยหน้าขึ้นจากกองกระดูก ปากยังแดงอยู่`,'bad');doFight(R,A.v.en,out,{rw:2});}}
    else{A.done=1;if(i===0){R.potions--;R.karma+=2;R.map[f-1]='good';say(R,out,'เงาแปดตัวหายไปทีละตัว แมวดำกินอาหารจนหมดแล้วเดินจากไปเงียบๆ','good');}
     else if(i===1){R.karma-=1;R.map[f-1]='fight';doFight(R,A.v.en,out);}
     else{h.hp-=h.mhp*.15;R.map[f-1]='bad';say(R,out,'มันข่วนทีเดียวแต่ลึกถึงกระดูก แล้วเดินจากไปเหมือนไม่เคยรู้จักกัน','bad');}}}},
  {r:'l',mk(R,K,A){K.vis=npc('cat');K.title='แมวที่เหลือสี่ชีวิต';
    K.text='แมวตัวนั้นนั่งอยู่บนบันไดขั้นบนสุด ตัวมันใหญ่ขึ้นเท่าเสือ ตาสองข้างเหมือนดาวสองดวง "เจ้าดูแลข้ามาตลอดทาง ข้าเหลือชีวิตอยู่สี่ดวง จะแบ่งให้เจ้าดวงหนึ่ง"';
    K.ch=[CH('รับชีวิตของมัน',[{t:'ชะตายืดออกมาก',c:'g'}]),CH('ขอโชคของแมวแทน',[{t:'LUK +5',c:'g'},{t:'HP สูงสุด +8%',c:'g'}]),CH('บอกให้มันเก็บไว้ใช้เอง',[{t:'LUK +2',c:'g'},kk(4)])];K.ai=0;},
   res(R,K,i,out,A){const f=R.floor,h=R.h;R.map[f-1]='good';
    if(i===0){const d=shiftFate(R,ri(6,9));say(R,out,`มันเอาหน้าผากแตะหน้าผากคุณ แสงอุ่นๆ ไหลเข้ามา ${fateFeel(d)}`,'lv');}
    else if(i===1){h.luk+=5;h.mhp*=1.08;say(R,out,'มันเลียหลังมือคุณทีหนึ่ง จากนั้นคุณก็รู้สึกว่าจะตกจากที่สูงแค่ไหนก็คงลงพื้นด้วยเท้า','lv');}
    else{h.luk+=2;R.karma+=4;say(R,out,'มันหัวเราะแบบที่แมวไม่น่าจะหัวเราะได้ แล้วกระโดดหายเข้าไปในกลุ่มดาว','lv');}}}]}});
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
 {id:'vault',n:'ห้องสมบัติที่ถูกลืม',run(R,out){const f=R.floor,g=Math.round(60*scl(f)*gMul(R));R.h.gold+=g;out.coins=g;R.map[f-1]='treasure';say(R,out,`ผนังพังลงมา ข้างหลังเป็นห้องเก็บสมบัติที่ไม่มีใครแตะมาเป็นร้อยปี ได้ทอง ${g}`,'lv');}}];
// drama wave 2 (vis: optional scene for floors without a fight; the UI may read D.vis)
DRAMA.push(
 {id:'bandits',n:'กองโจรดักปล้น',run(R,out){const f=R.floor,en=Object.assign(mkMon({hp:1.4,atk:1.15,def:1},f,1),{id:'merc',n:'กองโจรป่า',cls:'war'});
   say(R,out,'เชือกที่ขึงขวางบันไดดีดขึ้นมาพร้อมเสียงโห่ โจรคลุมหน้าหกเจ็ดคนกระโดดลงมาจากคานเพดาน','bad');R.map[f-1]='fight';doFight(R,en,out,{rw:2,cause:`ถูกกองโจรป่ารุมปล้นจนสิ้นใจ (ชั้น ${f})`});}},
 {id:'lanterns',n:'คืนโคมลอย',vis:{t:'prop',pr:'fire'},run(R,out){const h=R.h;heal(R,.3);h.luk+=1;R.kctx='ปล่อยโคมลอยกับนักผจญภัยคนอื่น';R.karma+=1;R.kctx='';R.map[R.floor-1]='good';
   say(R,out,'นักผจญภัยทั้งชั้นมารวมกันที่ระเบียง ปล่อยโคมกระดาษขึ้นฟ้าพร้อมกันหลายร้อยดวง มีคนยื่นโคมให้คุณดวงหนึ่ง (HP +30% · LUK +1)','lv');}},
 {id:'nightthief',n:'มือมืดยามดึก',vis:npc('thief'),run(R,out){const f=R.floor,h=R.h,gp=R.pets.find(p=>p==='wolf'||p==='owl');
   if(R.comps.length||gp){const g=gG(R,20),who=R.comps.length?R.comps[0].n:PETS[gp].n;coin(R,out,g);R.map[f-1]='good';say(R,out,`ตกดึกมีเงาคนย่องเข้ามาใกล้ถุงทอง ${who}จับได้คาหนังคาเขา เจ้าหัวขโมยทิ้งถุงของตัวเองไว้แล้ววิ่งหนี ได้ทอง ${g}`,'good');}
   else{const lose=Math.round(h.gold*.15);h.gold-=lose;R.map[f-1]='bad';say(R,out,`ตื่นมาถุงทองเบากว่าเมื่อคืน หายไป ${lose} เหรียญ รอยเท้าเปล่าเดินลงบันไดไปทางเดียว`,'bad');}}},
 {id:'eclipse',n:'สุริยุปราคาในหอ',vis:{t:'prop',pr:'star'},run(R,out){const f=R.floor;R.hzT.push({k:1.25,until:f+2,n:'สุริยุปราคาในหอ',ic:'🌑'});gainExp(R,10+2*f,out);R.map[f-1]='bad';
   say(R,out,'ช่องแสงทุกช่องในหอมืดลงพร้อมกันกลางวัน มอนสเตอร์ทั้งชั้นร้องโหยหวน คุณนั่งนิ่งจนแสงกลับมา ระหว่างนั้นจับทางได้ว่ามอนสเตอร์เดินกันยังไงในความมืด แต่ใจยังสั่นไปอีกสองสามชั้น','bad');}},
 {id:'caravan',n:'คาราวานหลงทาง',vis:npc('merchant'),run(R,out){const f=R.floor,g=gG(R,25);R.potions++;coin(R,out,g);R.map[f-1]='treasure';
   say(R,out,`คาราวานพ่อค้าหลงขึ้นมาถึงชั้นนี้ พวกเขาขอให้ชี้ทางลง แล้วแบ่งยาให้หนึ่งขวดกับทองอีก ${g} (+1 ยา)`,'good');}},
 {id:'miasma',n:'หมอกพิษ',run(R,out){const f=R.floor,h=R.h;
   if(cid(R)==='pri'){heal(R,.1);R.map[f-1]='calm';say(R,out,'หมอกสีม่วงไหลลงมาจากชั้นบน คุณสวดกันพิษไว้ทัน ผ่านไปได้แบบไอนิดหน่อย','info');return;}
   h.hp-=h.mhp*.15;h.mp=0;R.map[f-1]='trap';out.cause=`สำลักหมอกพิษ (ชั้น ${f})`;say(R,out,'หมอกสีม่วงไหลลงมาจากชั้นบน แสบตาแสบคอไปหมด เวทมนตร์ในตัวหายเกลี้ยง (HP −15% · MP 0)','bad');}});
const QUIET=['ทุ่งหญ้าเงียบจนได้ยินเสียงแมลง','แสงคริสตัลส่องทางให้ตลอด','หมอกในป่าบางลงจนเห็นทางชัด','ลาวาสงบเหมือนหลับไปชั่วคราว','ดวงดาวรอบตัวหมุนช้าลงเหมือนรอคุณ'];
function quietLen(R){let n=0;const tg=ri(3,6)+(MD(R,'quiet',1)>1?1:0);
 for(let k=0;k<tg;k++){const fl=R.floor+k;if(fl%10===0||fl>=100||pRoll(fl,hzM(R))>=.045)break;let arcD=false;for(const id in R.arcs){const A=R.arcs[id];if(!A.done&&A.due<=fl)arcD=true;}if(arcD||(R.egg&&R.egg.at<=fl+1))break;n++;}return n;}
function quietTick(R,n){const out=mkOut(),f0=R.floor,g0=R.h.gold,l0=R.h.lv,k0=R.kills,keep=[];R.quiet=true;let k=0;
 let dead=false;const qb=[];for(;k<n&&R.alive;k++){if(rollFloor(R)){dead=true;break;}const ev=genEvent(R);if(ev.kind==='boss')break;const fg=R.h.gold,fh=R.h.hp,ff=R.floor;const o=resolve(R,ev,aiPick(R,ev))||mkOut();aiPotion(R);finishFloor(R,o);
  qb.push({f:ff,g:Math.round(R.h.gold-fg),hp:Math.round(R.h.hp-fh)});if(o.mile)out.mile=o.mile;
  o.msgs.forEach(m=>{if(m.keep||(m.c==='lv'&&!/^เลเวลอัป/.test(m.t))||/ทรยศ/.test(m.t))keep.push(m);});}
 R.quiet=false;R.quietN++;R.lastQuiet=R.floor;if(cid(R)==='far'&&pathTier(R)>=2&&k&&rnd()<.5){R.potions++;keep.push({t:'เก็บสมุนไพรข้างทางมาต้มเป็นยาได้หนึ่งขวด',c:'good'});}const dg=Math.round(R.h.gold-g0),dk=R.kills-k0;
 if(k)say(R,out,`${fresh(R,'qt',QUIET)} ผ่านไป ${k} ชั้นรวด (ชั้น ${f0}–${f0+k-1}) · สู้ ${dk} ครั้ง · ทอง ${dg>=0?'+':''}${dg}${R.h.lv>l0?` · เลเวล ${l0}→${R.h.lv}`:''}`,'info');
 keep.forEach(m=>say(R,out,m.t,m.c));if(dead){const d=deathTick(R);out.msgs.push(...d.msgs);out.vis=d.vis;}out.quietN=Math.max(1,k);out.f0=f0;out.qb=qb;return out;}
function dramaTick(R,D){const out=mkOut();R.drama++;R.lastDrama=R.floor;D.run(R,out);if(R.alive&&R.h.hp<=0)mortal(R,out,out.cause);finishFloor(R,out);return out;}
function hatch(R,out){R.egg=null;if(R.pets.length<2){const p=pick(PETK);R.pets.push(p);R.h.luk+=2;say(R,out,`ไข่ฟักแล้ว! ${PETS[p].n}ตัวน้อยมองคุณเป็นแม่ทันที (${PETS[p].d})`,'good');}
 else{R.h.luk+=4;say(R,out,'ไข่ฟักออกมาเป็นนกไฟตัวจิ๋ว มันบินวนรอบหัวคุณสามรอบแล้วหายไป ทิ้งโชคไว้ให้ (LUK +4)','good');}}
function genSpecial(R){const ck=crownKey(R);if(ck)return R.lastSp=ck;for(const k of ['nec','ang'])if(!R.used['sp:'+k]&&SPECIAL[k].ok(R))return R.lastSp=k;if(excOk(R))return R.lastSp='excal';const ok=Object.keys(SPECIAL).filter(k=>!SPECIAL[k].ok||SPECIAL[k].ok(R));
 let pool=ok.filter(k=>!R.used['sp:'+k]||(k==='mimic'&&MD(R,'mimic',1)>1&&R.used['sp:mimic']<3));if(!pool.length)pool=ok.filter(k=>k!==R.lastSp);
 const fresh=k=>R.xseen&&!R.xseen['sp:'+k]?1.6:1;
 const sw=ST_SP[R.st]||{};const k=pool[wIdx(pool.map(x=>tierW(R,TIER[x])*(x==='mimic'?MD(R,'mimic',1):1)*(x==='dragon'&&clanM(R)==='s'?12:1)*(x==='promo'?10:1)*dayW(R,x)*fresh(x)*(sw[x]||1)))];R.lastSp=k;return k;}
// build a decision card (key moment)
function mkKey(R,type,ev){const f=R.floor,K={type,ev,tag:'',title:'',text:'',vis:null,ch:[],ai:0,rar:'c',tid:type};
 if(type==='boss'){K.tag=`ชั้น ${f} · ชั้นบอส`;K.title=ev.en.n;K.text=ev.en.x+(ev.en.fit?' มันมองคุณแล้วหัวเราะ เหมือนไม่คิดจะเอาจริง':'');K.vis={t:'en',en:ev.en};K.ch=choicesOf(R,ev);K.ai=aiBoss(R,ev);K.vs=true;}
 else if(type==='ev'){const T=EVENTS[ev.ti];K.tid='ev:'+ev.ti;K.tag=`ชั้น ${f} · เหตุการณ์เสี่ยง`;K.title=evS(ev,T.t);K.text=evS(ev,T.x);K.vis=evVis(ev,T);K.ch=choicesOf(R,ev);K.ai=aiPick(R,ev);}
 else if(type==='pet'){const P=PETS[ev.pet];K.tid='pet:'+ev.pet;K.tag=`ชั้น ${f} · สัตว์เลี้ยงหลงทาง`;K.title=P.n;K.text=P.x;K.vis={t:'pet',p:ev.pet};K.ch=choicesOf(R,ev);K.ai=aiPick(R,ev);}
 else if(type==='comp'){const c=ev.comp;K.tag=`ชั้น ${f} · นักผจญภัยพเนจร`;K.title=`${c.n} · ${clsName(c.cls)}`;
  const T=trOf(c);K.tid='comp:'+c.tr;K.text=`${R.karma<-8?'"ข้าได้ยินกิตติศัพท์ด้านไม่ดีของท่านมาบ้าง แต่ทองก็คือทอง" ':''}${c.line} นิสัย: ${T.n} (${T.d})${c.cls==='pri'?' นักบวชจะช่วยรักษาระหว่างต่อสู้':''}`;K.vis={t:'comp',cls:c.cls,c:visC(c)};K.ch=choicesOf(R,ev);K.ai=aiPick(R,ev);}
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
 if(cid(R)==='nec'&&type!=='shop')K.ch.forEach(c=>{if(!c.dis&&/จ้าง|ร่วมทีม|เข้าทีม|ตามมา|ตามไปด้วย/.test(c.t)){c.dis=true;c.P=[{t:'(เนโครแมนเซอร์จ้างใครไม่ได้)',c:'b'}];}});
 if(!K.vis)K.vis=autoVis(K.title,K.text);
 {const KT=KEY_TG[type];K.ch.forEach((c,i)=>{if(!c.tg)c.tg=KT?KT[i]||[]:type==='arc'?tgOf(c.t):[];if(c.hide)return;
  if(c.cl)c.P.unshift({t:`✦ เฉพาะ${clsName(c.cl)}`,c:'pt'});else if(type!=='promo'&&pathPts(R,c.tg)>0)c.P.push({t:`✦ ${pathOf(R).n}`,c:'pt'});});}
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
   if(i===0){h.gold-=omenCost(R);R.karma+=1;R.hzT.push({k:.5,until:f+6,n:'ควันธูปพาลมให้นิ่ง',ic:'🕯'});say(R,out,'ควันธูปลอยขึ้นตรงเป็นเส้นเดียว ลมรอบตัวนิ่งลงไปอีกหลายชั้น','good');R.map[f-1]='good';}
   else if(i===1){h.mhp*=.9;h.hp=Math.max(1,Math.min(h.hp,h.mhp)-h.mhp*.15);if(rnd()<.7){R.hzP*=.8;R.fateShift+=6;say(R,out,`เลือดหยดลงบนพื้นหินแล้วหายวับไป ${fateFeel(6)}`,'good');}else say(R,out,'เลือดไหลนองพื้นแต่หอคอยไม่ยอมรับ เสียแรงเปล่า','bad');}
   else if(i===2){R.karma-=6;R.hzP*=.65;R.fateShift+=11;R.map[f-1]='evil';say(R,out,`คุณย่องเข้าไปใกล้นักผจญภัยที่หลับอยู่ ลมหายใจของเขาเบาลงเรื่อยๆ ${fateFeel(11)}`,'bad');}
   else{R.karma+=2;h.hp=h.mhp;h.mp=h.mmp;R.hzT.push({k:.8,until:f+3,n:'ใจที่ยอมรับชะตา',ic:'☯'});gainExp(R,10+2*f,out);R.map[f-1]='calm';say(R,out,'คุณนั่งลงหายใจลึกๆ ยอมรับทุกอย่างที่จะเกิด ใจนิ่งลงกว่าทุกครั้ง','lv');}}
  else if(K.type==='shop')shopBuy(R,i,out);
  else if(K.type==='arc')resArc(R,K,i,out);
  else SPECIAL[K.type].res(R,K,i,out);
  if(K.type==='promo')pathAdd(R,6,out);else if(K.type!=='shop')pathTg(R,K.ch[i].tg,out);
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
const NO_WAY={boss:1,omen:1,shop:1,crown:1,favor:1}; // v2.7: the contest retry at 90 and a favour being called in always stop and ask
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
 if(K.type==='boss'){const w=K.ev.est||0;if(ps==='bold'&&w>=.8)return 0;if(ps==='careful'&&w<.8&&!K.ch[2].dis)return K.ch[1].dis?2:1;return K.ai;}
 const W=PW[ps]||PW.careful;let best=K.ai,bs=-1e9;
 K.ch.forEach((c,i)=>{if(c.dis)return;let s=(i===K.ai?1:0)+rnd()*.25+(pathPts(R,c.tg)>0?.15:0);const txt=c.t+' '+c.P.map(p=>p.t).join(' ');
  c.P.forEach(p=>{if(p.c==='g')s+=W.g;else if(p.c==='b')s-=W.b;if(p.c==='kk')s+=(p.t.includes('✦')?1:-1)*(W.k+kLean(R)*1.2)*(/หนัก/.test(p.t)?2:1);
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
 {const tk=towerKey(R);if(tk)return{type:'key',K:mkKey(R,tk)};} // v2.7: faction vote / tower-wide event
 if(R.floor%10!==0){
  const aid=dueArc(R);if(aid&&R.sinceKey>=1)return{type:'key',K:mkKey(R,'arc',aid)};
  if(R.sinceKey>=1&&crownKey(R))return{type:'key',K:mkKey(R,genSpecial(R))}; // v2.7: a contest or a favour being called in does not wait for the usual key gap
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
function deathTick(R){const out=mkOut(),c=fateCause(R);const cause=`${c.t} (ชั้น ${R.floor})`;say(R,out,cause,'bad');if(canRez(R)){rezNow(R,out);out.vis=c.vis;return out;}R.ck=c.k||'fate';die(R,cause);R.death='fate';out.vis=c.vis;return out;}
// headless full life with AI everywhere (used for balance checks)
// R.tk = floor-story units shown in the UI (each lasts 5 s / speed); paused key moments add 15 s of real time each
function autoLife(h){const R=newRun(h||rollHero());let g=0;R.tk=0;
 while(R.alive&&g++<5000){R.st=aiStance(R);const P=planFloor(R);R.tk+=P.type==='quiet'?1.6:P.type==='autokey'&&!P.how?1.3:1;
  if(P.type==='death'){deathTick(R);if(!R.alive)break;continue;}
  if(P.type==='farm')farmTick(R);else if(P.type==='auto')autoTick(R,P.ev);else if(P.type==='quiet')quietTick(R,P.n);else if(P.type==='autokey'){applyKey(R,P.K,P.i!==undefined?P.i:P.K.ai,P.how||true);if(!R.alive&&!R.won)R.death=R.death||'boss';}else if(P.type==='drama'){R.lastDramaId=P.D.id;dramaTick(R,P.D);}else{R.timeouts++;applyKey(R,P.K,P.K.pick);if(!R.alive&&!R.won)R.death=R.death||'boss';}}
 return R;}
// ---- secret floor above 100 (v2.1): a dragon on its hoard, spared once wounded (way 0) or slain (way 1) ----
const SEC_P=.4,SEC_SP=.35,DRG={k:{n:'มังกรดำ',h:1.5,a:1.25,d:1},s:{n:'มังกรเงิน',h:1.5,a:1,d:1.35},g:{n:'มังกรทอง',h:1.9,a:1.05,d:1.05}},SEC_K={h:.7,a:.75};
function secEn(R){const c=R.sec.c,D=DRG[c]||DRG.k,b=mkMon({hp:1,atk:1,def:1},100,1),k=R.sec.k||1,hp=b.hp*BAL.bHp*D.h*SEC_K.h*k;
 return drgMod(R,{id:'hoard_'+(DRG[c]?c:'k'),n:D.n,hp,mhp:hp,atk:b.atk*BAL.bAtk*D.a*SEC_K.a*k,def:b.def*BAL.bDef*D.d,boss:true,drg:1});}
// the dragon sizes the hero up once: if even sparing it is hopeless it holds back (R.sec.k, saved with the run)
function secPrep(R){if(R.sec.k)return;const en=secEn(R);bossFit(R,en,SEC_FIT,secOpts(en,0));R.sec.k=en.fit||1;}
const SEC_FIT=.3;
// sparing ends the fight once the dragon is down to 35% HP; either way the dragon must be beaten within 40 rounds
const secOpts=(en,way)=>({need:1,lim:40,stop:way?0:en.mhp*SEC_SP});
function secFight(R,way){const en=secEn(R),h=R.h,out=mkOut();R.sec.m0=clanM(R);R.sec.way=way;
 const res=fight(R,en,secOpts(en,way));out.combat={en,ev:res.ev,win:res.win,startHp:h.hp,mhp:h.mhp};h.hp=res.hp;h.mp=res.mp;
 R.sec.win=res.win?1:0;R.sec.res=res.win?(way?'s':'f'):'x';
 if(res.win){R.kills++;R.sec.g=Math.round((way?2600:1200)*(R.sec.c==='g'?1.2:1));h.gold+=R.sec.g;if(R.sec.m0==='s')drgFell(R,out);}
 else{R.cause=`ถูก${en.n}ฆ่าบนชั้นลับเหนือยอดหอคอย`;h.hp=0;}
 return out;}
// v2.7 wishes: everyone who ever walked with the hero (R.gwS), so the end screen can tell who was missing at the end.
// say() runs right after every party change, so recording here catches each companion and pet once.
function gwSeen(R){if(!R||!R.comps||!R.pets)return;const g=R.gwS||(R.gwS={c:{},p:{}});
 for(const c of R.comps)if(c&&c.n&&!g.c[c.n])g.c[c.n]={cls:c.cls,tr:c.tr,legend:!!c.legend,f:R.floor};
 for(const p of R.pets)if(p&&!g.p[p])g.p[p]=R.floor;}
// ================= v2.7 set A: the tower changes over time (65m REA v3: world mods, world events, results later, factions) =================
const TWE=window.CONTENT.TWE||[],FACS=window.CONTENT.FACS||[];
// ---- tower mods on R.hzT: {k hazard, g gold, a ATK, p shop price, until, n, ic, e end line, src}; hzF multiplies one field over the live mods ----
function hzF(R,x){let m=1;if(R&&R.hzT)for(const t of R.hzT)if(t.until>=R.floor&&t[x])m*=t[x];return m;}
const MODK=[['k','อันตราย'],['g','ทอง'],['a','ATK'],['p','ราคาร้าน']];
const modTxt=m=>MODK.filter(([x])=>m&&m[x]&&Math.abs(m[x]-1)>.001).map(([x,l])=>`${l} ${m[x]>1?'+':'−'}${Math.round(Math.abs(m[x]-1)*100)}%`).join(' · ');
const modVal=(m,d)=>(d||1)*(-((m.k||1)-1)*1.2+((m.g||1)-1)*.5+((m.a||1)-1)*1.5-((m.p||1)-1)*.3);
const twC=m=>{const v=modVal(m);return v>.001?'g':v<-.001?'b':'w';};
function addMod(R,m,d,n,ic,src,e){const t={k:m.k||1,until:R.floor+d,n,ic,src:src||''};for(const x of ['g','a','p'])if(m[x]&&m[x]!==1)t[x]=m[x];if(e)t.e=e;R.hzT.push(t);return t;}
// stat checks behind the odds shown on a choice (each is relative to what is normal for the floor)
const TW_ST={luk:R=>eLuk(R)-10-R.floor*.15,kar:R=>R.karma,lv:R=>R.h.lv-R.floor*.33-2,hp:R=>(R.h.hp/R.h.mhp-.5)*100};
const TW_SL={luk:R=>`LUK ${Math.round(eLuk(R))}`,kar:()=>'จากกรรมที่สะสมมา',lv:R=>`Lv.${R.h.lv}`,hp:R=>`HP ${Math.round(R.h.hp/R.h.mhp*100)}%`};
const chkP=(R,c)=>c.s&&TW_ST[c.s]?clamp(c.b+c.k*TW_ST[c.s](R),.1,.92):1;
const fxVal=(R,x)=>x?(x.hp||0)*3+(x.gold||0)*.03+(x.exp||0)*.02+(x.pot||0)*.6+(x.luk||0)*.25+(x.k||0)*.04*(1+kLean(R)):0;
const pctC=p=>p>=60?'g':p>=35?'w':'b';
// ---- laterAt: choose now, learn the result n floors on; entries are plain data {at,id,d,l} (handler id, no functions) so saves resume them ----
const latS=R=>Array.isArray(R.later)?R.later:(R.later=[]);
function laterAt(R,n,id,d,l){latS(R).push({at:R.floor+n,id,d:d||{},l:l||''});}
function laterTick(R,out){const L=latS(R);if(!L.length||!R.alive)return;for(const x of L.filter(x=>x.at<=R.floor)){L.splice(L.indexOf(x),1);const fn=LATER[x.id];if(!fn)continue;const kc=R.kctx,n0=out.msgs.length;R.kctx=x.l||'ผลจากเรื่องเก่า';fn(R,out,x.d||{});R.kctx=kc;if(out.msgs.slice(n0).some(m=>m.c==='good'))R.ltG=(R.ltG||0)+1;}}
const laterNow=R=>R&&R.later?latS(R).filter(x=>x.l&&x.at>R.floor).map(x=>`⏳ ${x.l} (อีก ${x.at-R.floor} ชั้น)`):[];
const hurt=(R,k)=>{R.h.hp=Math.max(1,R.h.hp-R.h.mhp*k);};
const LATER={
 star(R,out){const a=1.5+R.floor*.08;R.h.atk+=a;sayK(R,out,`ตัวเลขในสมุดที่จดไว้คืนฝนดาวตกเรียงกันเป็นท่าฟันได้ท่าหนึ่ง (ATK +${a.toFixed(1)})`,'good');},
 invest(R,out,d){if(rnd()<d.p){const g=coin(R,out,d.g||0);sayK(R,out,`พ่อค้าเร่ที่คุณร่วมหุ้นด้วยวิ่งขึ้นบันไดมาหา ยื่นถุงทอง ${g} ให้ ครบตามที่สัญญาไว้ทุกเหรียญ`,'good');}
  else sayK(R,out,'ข่าวลอยมาว่าคาราวานของพ่อค้าเร่ที่คุณร่วมหุ้นด้วยโดนปล้นกลางทาง เงินลงทุนหายหมด','bad');},
 wound(R,out,d){if(rnd()<d.p){const x=d.d||1;R.h.def+=x;heal(R,.1);sayK(R,out,`แผลจากหนามเหล็กหายสนิท ผิวตรงนั้นหนาขึ้นกว่าเดิม (DEF +${x.toFixed(1)})`,'good');}
  else{R.scars++;sayK(R,out,`แผลจากหนามเหล็กอักเสบจนกลายเป็นแผลเป็น (แผลเป็น ${R.scars})`,'bad');}},
 seed(R,out,d){if(rnd()<d.p){R.potions+=2;R.h.mhp*=1.05;sayK(R,out,'ชาวไร่ปีนบันไดขึ้นมาตามหาคุณ ในตะกร้ามีผลไม้จากต้นที่คุณปลูกไว้ (+2 ยา · HP สูงสุด +5%)','good');}
  else sayK(R,out,'ชาวไร่ฝากข่าวขึ้นมาว่านกจิกกินต้นอ่อนที่คุณปลูกไว้หมดแล้ว','info');},
 letter(R,out){R.karma+=3;R.h.luk+=2;const g=coin(R,out,gG(R,20));sayK(R,out,`หญิงสาวคนหนึ่งรออยู่หน้าห้องม่านเหลือง เธออ่านจดหมายของพ่อจบแล้วร้องไห้ ก่อนยัดเหรียญ ${g} เหรียญใส่มือคุณ (LUK +2)`,'good');},
 bounty(R,out,d){if(rnd()<d.p){sayK(R,out,'ไม่มีใครตามมาทวงเรื่องจดหมายฉบับนั้น ข่าวที่คุณขายไปคงไม่มีใครสนใจ','info');return;}
  const g=Math.round(R.h.gold*.2);R.h.gold-=g;hurt(R,.25);sayK(R,out,`คนที่ซื้อข่าวไปส่งนักล่าค่าหัวมาปิดปากคุณ คุณหนีรอดมาได้ แต่เจ็บหนักและทองหายไป ${g}`,'bad');},
 loan(R,out,d){const x=d.x||0;if(R.h.gold>=x){R.h.gold-=x;sayK(R,out,`ก็อบลินเจ้าหนี้มาทวงตรงเวลา คุณจ่ายคืนไป ${x} ทอง`,'info');return;}
  R.h.gold=0;hurt(R,.3);sayK(R,out,'จ่ายหนี้ก็อบลินไม่ไหว พวกมันรุมทุบคุณแล้วกวาดทองไปหมดกระเป๋า','bad');},
 cheat(R,out,d){if(rnd()<d.p){sayK(R,out,'ก็อบลินเจ้าหนี้ตามคุณขึ้นมาไม่ถึงชั้นนี้ หนี้ก้อนนั้นหายไปกับลม','info');return;}
  const g=Math.min(Math.floor(R.h.gold),d.x||0);R.h.gold-=g;hurt(R,.25);sayK(R,out,`ก็อบลินเจ้าหนี้ตามมาเจอพร้อมพวกอีกโขลง ริบทองไป ${g} แล้วทิ้งรอยฟกช้ำไว้เต็มตัว`,'bad');},
 train(R,out,d){const a=d.a||1;R.h.atk+=a;sayK(R,out,`ท่าที่ครูดาบสอนไว้เริ่มเข้ามือ ฟันได้เร็วขึ้นโดยไม่ต้องคิด (ATK +${a.toFixed(1)})`,'good');}};
// ---- tower-wide events (TWE in events.js): once each per run, weighted by class and rank, choices show odds from stats ----
const twS=R=>R.tw&&typeof R.tw==='object'?R.tw:(R.tw={at:-99});
const twBase=(R,e)=>Object.assign({},e.m,(e.cm||{})[cid(R)]||{});
const twW=(R,e)=>(e.w||1)*((e.cw||{})[cid(R)]||1)*Math.exp((e.rk||0)*(R.h.rank-2));
const twPool=R=>TWE.filter(e=>!R.used['sp:tw_'+e.id]&&R.floor>=e.f[0]&&R.floor<=e.f[1]);
function twMk(R,K,e){const f=R.floor,d=ri(e.d[0],e.d[1]),base=twBase(R,e),D=K.data={id:e.id,d,base,p:e.c.map(c=>chkP(R,c))};
 K.tag=`ชั้น ${f} · เหตุการณ์ทั้งหอ`;K.title=`${e.ic} ${e.n}`;K.vis=npc(e.pr);K.text=e.x+(modTxt(base)?` (ถ้าไม่ทำอะไร ${d} ชั้นข้างหน้า: ${modTxt(base)})`:'');
 const br=o=>{const m=Object.assign({},base,o.m||{}),mt=modTxt(m);return[...(mt?[{t:`${d} ชั้น: ${mt}`,c:twC(m)}]:[]),...fxParts(R,o.fx),...(o.lt?[{t:`อีก ${o.lt.n} ชั้นรู้ผล`,c:'w'}]:[])];};
 K.ch=e.c.map((c,i)=>{const cost=c.c?gS(R,c.c):0,P=[];if(cost)P.push({t:`−${cost} ทอง`,c:'w'});
  if(c.s){const pp=Math.round(D.p[i]*100);P.push({t:`${pp}% สำเร็จ (${TW_SL[c.s](R)})`,c:pctC(pp)},...br(c.y),{t:`/ ${100-pp}% พลาด`,c:'b'},...br(c.n||{}));}else P.push(...br(c.y));
  if(!P.length)P.push({t:'ไม่มีอะไรเปลี่ยน',c:''});const dis=cost>0&&R.h.gold<cost;if(dis)P.push({t:'(ทองไม่พอ)',c:'b'});return Object.assign(CH(c.t,P,dis),{tg:c.tg||[]});});
 let ai=0,bv=-1e9;e.c.forEach((c,i)=>{if(K.ch[i].dis)return;const p=D.p[i],v=o=>modVal(Object.assign({},base,o.m||{}),d)+fxVal(R,o.fx)+(o.lt?.5:0);
  const s=p*v(c.y)+(1-p)*v(c.n||{})-(c.c?c.c*.03:0)+rnd()*.2;if(s>bv){bv=s;ai=i;}});K.ai=ai;}
function twRes(R,K,i,out,e){const f=R.floor,c=e.c[i],D=K.data;if(!c||!D)return;if(c.c)R.h.gold-=gS(R,c.c);
 const ok=!c.s||rnd()<D.p[i],o=ok?c.y:(c.n||{}),m=Object.assign({},D.base,o.m||{});
 say(R,out,o.r||e.n,ok?'good':'bad');if(o.fx)applyFx(R,o.fx,out);
 if(modTxt(m))addMod(R,m,D.d,e.n,e.ic,'tw',`${e.ic} ${e.n}ผ่านไปแล้ว หอกลับมาเป็นเหมือนเดิม`);
 if(o.lt)laterAt(R,o.lt.n,o.lt.id,{},o.lt.l);
 R.map[f-1]=!ok?'bad':o.fx&&o.fx.k<0?'evil':o.fx&&o.fx.k>0?'good':'calm';twS(R).at=f;}
for(const e of TWE)SPECIAL['tw_'+e.id]={w:0,ok:()=>false,mk(R,K){twMk(R,K,e);},res(R,K,i,out){twRes(R,K,i,out,e);}};
// ---- factions that rule the tower: every 20 floors back one of three; the winner's mod (good/bad per class) lasts 20 floors; a bribe costs karma ----
const FAC=id=>FACS.find(F=>F.id===id)||FACS[0];
const facS=R=>R.fac&&typeof R.fac==='object'?R.fac:(R.fac={nx:21,n:0});
function facMod(R,F,me){const id=cid(R),m=Object.assign({},F.all),x=F.good.includes(id)?F.gm:F.bad.includes(id)?F.bm:null;if(x)for(const k in x)m[k]=(m[k]||1)*x[k];
 if(me===1){m.g=(m.g||1)*1.05;m.k=(m.k||1)*.97;}else if(me===-1)m.k=(m.k||1)*1.04;return m;}
const facSway=R=>clamp(.18+TW_ST.lv(R)*.01+TW_ST.luk(R)*.006+R.comps.length*.04,.08,.4);
const facOdds=(s,i,sw)=>{const pi=s[i]+sw*(1-s[i]);return s.map((x,j)=>j===i?pi:x*(1-pi)/(1-s[i]));};
SPECIAL.fac={w:0,ok:()=>false,mk(R,K){const f=R.floor,L=[...FACS],o=[];while(o.length<3&&L.length)o.push(L.splice(Math.floor(rnd()*L.length),1)[0].id);
  const s0=o.map(()=>rr(.8,1.25)),ss=s0.reduce((a,b)=>a+b,0),s=s0.map(x=>x/ss),sw=facSway(R),bi=s.indexOf(Math.max(...s)),bribe=gG(R,35);
  K.data={o,s,sw,bi,bribe};K.tag=`ชั้น ${f} · ภาคีที่ครองหอ`;K.title='ใครจะได้คุมหอ 20 ชั้นข้างหน้า';K.vis=npc('noble');
  K.text=`ทุกยี่สิบชั้น ภาคีใหญ่ในหอจะชิงกันคุมบันได ฝ่ายที่ชนะคุมหอไปอีก 20 ชั้น ${o.map(id=>{const F=FAC(id);return`${F.ic} ${F.n}: ${F.x}`;}).join(' · ')} เสียงของคุณมีน้ำหนักราว ${Math.round(sw*100)}% (ขึ้นกับเลเวล โชค และเพื่อนร่วมทาง)`;
  K.ch=o.map((id,i)=>{const F=FAC(id),pw=Math.round(facOdds(s,i,sw)[i]*100),my=facMod(R,F,1);
   return Object.assign(CH(`หนุน${F.n}`,[{t:`${pw}% ได้ครองหอ`,c:pctC(pw)},{t:`ถ้าชนะ 20 ชั้น: ${modTxt(my)||'ไม่กระทบคุณ'}`,c:twC(my)},{t:'/ ถ้าแพ้ ฝ่ายที่ชนะจะเพ่งเล็งคุณ (อันตราย +4%)',c:'w'}]),{tg:[]});});
  K.ch.push(Object.assign(CH(`รับสินบนจาก${FAC(o[bi]).n} แล้วไม่ช่วยใคร`,[{t:`+${bribe} ทอง`,c:'g'},kk(-3)]),{tg:['trade']}));
  let ai=0,bv=-1e9;for(let i=0;i<=o.length;i++){const od=i<o.length?facOdds(s,i,sw):s;let v=0;o.forEach((id,j)=>{v+=od[j]*modVal(facMod(R,FAC(id),i>=o.length?0:i===j?1:-1),20);});
   if(i===o.length)v+=35*.03-3*.15*(1-kLean(R));if(v>bv){bv=v;ai=i;}}K.ai=ai;},
 res(R,K,i,out){const f=R.floor,D=K.data,F0=facS(R),br=i>=D.o.length,w=wIdx(br?D.s:facOdds(D.s,i,D.sw)),W=FAC(D.o[w]),me=br?0:i===w?1:-1;
  if(br){R.karma-=3;coin(R,out,D.bribe);say(R,out,`คนของ${FAC(D.o[D.bi]).n}ยัดถุงทอง ${D.bribe} ใส่มือคุณ แล้วกระซิบว่าวันชิงตำแหน่งให้อยู่เฉยๆ`,'bad');}
  R.hzT=R.hzT.filter(t=>t.src!=='fac');const m=facMod(R,W,me);addMod(R,m,20,`${W.n}ครองหอ`,W.ic,'fac',`${W.n}หมดวาระคุมหอแล้ว`);
  say(R,out,`${W.ic} ${W.n}ได้ครองหอ${me===1?' ฝ่ายที่คุณหนุนชนะ พวกเขาจำหน้าคุณได้':me===-1?' ฝ่ายที่คุณหนุนแพ้ คนของฝ่ายที่ชนะจดชื่อคุณไว้แล้ว':''} (20 ชั้น: ${modTxt(m)||'ไม่กระทบคุณ'})`,me<0?'bad':'lv');
  R.map[f-1]=br?'evil':me>0?'good':me<0?'bad':'calm';F0.nx=Math.floor((f-1)/20)*20+21;F0.n=(F0.n||0)+1;(F0.h||(F0.h=[])).push({f,w:W.id,me,b:br?1:0});}};
// key moment due from the tower itself: the faction vote after each 20th floor, otherwise now and then a tower event in place of a special
function towerKey(R){const f=R.floor;if(f%10===0||f>=98||!R.alive)return'';
 if(FACS.length>=3&&f>=facS(R).nx&&R.sinceKey>=1)return'fac';
 if(R.sinceKey>=R.keyGap&&f>=6&&f-twS(R).at>=10&&rnd()<.4){const L=twPool(R);if(L.length)return'tw_'+L[wIdx(L.map(e=>twW(R,e)))].id;}
 return'';}
for(const k of ['fac',...TWE.map(e=>'tw_'+e.id)]){NO_WAY[k]=1;TIER[k]='r';}
// ---- key moments whose result comes some floors later (laterAt) ----
Object.assign(SPECIAL,{
 invest:{w:2,ok:R=>R.h.gold>=gS(R,20)&&R.floor<=90,mk(R,K){const f=R.floor,a=Math.max(gS(R,20),Math.round(R.h.gold*.35)),b=Math.max(1,Math.round(a/3)),p=clamp(.55+TW_ST.luk(R)*.01,.25,.85),p2=clamp(p+.1,.3,.92);
   K.data={a,b,p,p2};K.tag=`ชั้น ${f} · ขอร่วมหุ้น`;K.title='พ่อค้าเร่ขอทุน';K.vis=npc('merchant');const L=`LUK ${Math.round(eLuk(R))}`;
   K.text='ชายแบกลังไม้ใบใหญ่ยืนขวางทาง เขาบอกว่ารู้แหล่งผ้าไหมราคาถูกที่ชั้นล่าง ขาดทุนอีกนิดเดียว ถ้าร่วมหุ้นด้วย อีกแปดชั้นเขาจะขึ้นมาแบ่งกำไรให้';
   K.ch=[CH(`ลงทุน ${a} ทอง`,[{t:`−${a} ทอง`,c:'w'},{t:`อีก 8 ชั้น ${Math.round(p*100)}% ได้คืน ${Math.round(a*2.2)} (${L})`,c:'g'},{t:`/ ${100-Math.round(p*100)}% เงินหาย`,c:'b'}],R.h.gold<a),
    CH(`ลงพอเป็นน้ำใจ ${b} ทอง`,[{t:`−${b} ทอง`,c:'w'},{t:`อีก 8 ชั้น ${Math.round(p2*100)}% ได้คืน ${Math.round(b*1.8)} (${L})`,c:'g'},{t:`/ ${100-Math.round(p2*100)}% เงินหาย`,c:'b'}],R.h.gold<b),
    CH('ไม่ลงทุน',[{t:'เดินผ่านไป',c:''}])];K.ch[0].tg=K.ch[1].tg=['trade','gamble'];K.ai=p>=.55?0:p2>=.5?1:2;},
  res(R,K,i,out){const f=R.floor,D=K.data;R.map[f-1]='calm';if(i===2){say(R,out,'พ่อค้าเร่ถอนหายใจ แล้วแบกลังเดินลงบันไดไป','info');return;}
   const a=i?D.b:D.a;R.h.gold-=a;laterAt(R,8,'invest',{g:Math.round(a*(i?1.8:2.2)),p:i?D.p2:D.p},'เงินที่ลงหุ้นกับพ่อค้าเร่');say(R,out,`พ่อค้าเร่นับเหรียญ ${a} เหรียญใส่ถุง จดชื่อคุณไว้ในสมุดเล่มเล็ก แล้วรีบลงบันไดไป`,'info');}},
 thorn:{w:2,ok:R=>R.floor>=4&&R.floor<=92,mk(R,K){const f=R.floor,p=clamp(.55+TW_ST.hp(R)*.004+TW_ST.luk(R)*.006,.2,.9),d=1+f*.05;K.data={p,d};
   K.tag=`ชั้น ${f} · แผลลึก`;K.title='หนามเหล็กใต้ใบไม้แห้ง';K.vis={t:'prop',pr:'healer',fb:'npc'};
   K.text='หนามเหล็กที่ซ่อนอยู่ใต้กองใบไม้แห้งกรีดน่องคุณเป็นทางยาว เลือดไหลไม่ยอมหยุด ไม่มีใครรู้ว่าหนามนั้นทาอะไรไว้';
   K.ch=[CH('ใช้ยาล้างแผลเดี๋ยวนี้',[{t:'−1 ยา',c:'w'},{t:'แผลหายสนิท',c:'g'}],R.potions<1),
    CH('พันผ้าไว้แล้วเดินต่อ',[{t:'HP −8%',c:'b'},{t:`อีก 6 ชั้น ${Math.round(p*100)}% แผลหายแล้วผิวหนาขึ้น DEF +${d.toFixed(1)} (HP กับ LUK)`,c:'g'},{t:`/ ${100-Math.round(p*100)}% กลายเป็นแผลเป็น`,c:'b'}]),
    CH('เผามีดจี้แผล',[{t:'HP −20%',c:'b'},{t:'แผลไม่กลับมาอีก',c:''}])];K.ai=R.potions>=2?0:p>=.6?1:2;},
  res(R,K,i,out){const f=R.floor,D=K.data;R.map[f-1]='trap';
   if(i===0){R.potions--;R.map[f-1]='calm';say(R,out,'น้ำยาแสบจนน้ำตาไหล แต่แผลหยุดเลือดทันที','good');}
   else if(i===1){hurt(R,.08);laterAt(R,6,'wound',{p:D.p,d:D.d},'แผลจากหนามเหล็ก');say(R,out,'คุณฉีกชายเสื้อพันแผลไว้แน่น เดินกะเผลกต่อไป','info');}
   else{hurt(R,.2);say(R,out,'กลิ่นเนื้อไหม้ลอยขึ้นมา คุณกัดฟันจนกรามชา แต่แผลปิดสนิท','info');}}},
 seed:{w:2,ok:R=>R.floor<=88,mk(R,K){const f=R.floor,p=clamp(.6+R.karma*.01,.3,.9),g=gG(R,15);K.data={p,g};
   K.tag=`ชั้น ${f} · เมล็ดพันธุ์`;K.title='เมล็ดสีทองของชาวไร่';K.vis=npc('farmer');
   K.text='ชาวไร่แก่ๆ ยื่นเมล็ดสีทองให้กำมือหนึ่ง บอกว่าทั้งหอปลูกขึ้นที่เดียวคือขอบหน้าต่างชั้นนี้ แกจะรดน้ำให้ แล้วเอาผลขึ้นไปส่งเมื่อมันออกลูก';
   K.ch=[CH('ฝังเมล็ดไว้ที่ขอบหน้าต่าง',[{t:`อีก 10 ชั้น ${Math.round(p*100)}% ได้ +2 ยา · HP สูงสุด +5% (${TW_SL.kar()})`,c:'g'}]),CH('กินเมล็ดเลย',[{t:'HP +20%',c:'g'}]),CH('ขายให้นักสะสม',[{t:`+${g} ทอง`,c:'g'}])];
   K.ch[0].tg=['forage','tame'];K.ch[2].tg=['trade'];K.ai=0;},
  res(R,K,i,out){const f=R.floor,D=K.data;R.map[f-1]='calm';
   if(i===0){laterAt(R,10,'seed',{p:D.p},'ต้นไม้ที่ปลูกไว้');R.map[f-1]='good';say(R,out,'คุณกดเมล็ดลงดินที่ขอบหน้าต่าง ชาวไร่รดน้ำตามแล้วยิ้มจนเห็นเหงือก','good');}
   else if(i===1){heal(R,.2);say(R,out,'เมล็ดมีรสหวานเหมือนน้ำผึ้ง ท้องอุ่นขึ้นมาทันที','good');}
   else{coin(R,out,D.g);say(R,out,`นักสะสมให้ทอง ${D.g} แล้วเก็บเมล็ดใส่กล่องกำมะหยี่`,'info');}}},
 letter:{w:2,ok:R=>R.floor<=92,mk(R,K){const f=R.floor,p=clamp(.5+TW_ST.luk(R)*.015,.2,.85),g=gG(R,15);K.data={p,g};
   K.tag=`ชั้น ${f} · จดหมายที่ยังไม่ถึงมือ`;K.title='จดหมายของทหารนิรนาม';K.vis={t:'prop',pr:'grave'};
   K.text='ทหารคนหนึ่งนอนตายพิงกำแพง มือยังกำซองจดหมายไว้แน่น หน้าซองเขียนว่า ถึงลูกสาว ชั้นบน ห้องที่แขวนม่านสีเหลือง';
   K.ch=[CH('เก็บจดหมายไว้ส่งให้ลูกสาวเขา',[{t:'อีกราว 7 ชั้นจะได้เจอเธอ',c:'w'},{t:'+ทอง · LUK +2',c:'g'},kk(3)]),
    CH('แกะอ่านแล้วขายข่าวในนั้น',[{t:`+${g} ทอง`,c:'g'},kk(-2),{t:`/ อีก 6 ชั้น ${100-Math.round(p*100)}% มีคนตามมาปิดปาก (LUK ${Math.round(eLuk(R))})`,c:'b'}]),
    CH('ฝังจดหมายไว้กับเขา',[kk(1)])];K.ch[0].tg=['help'];K.ch[1].tg=['steal','trick'];K.ch[2].tg=['pray'];K.ai=0;},
  res(R,K,i,out){const f=R.floor,D=K.data;
   if(i===0){laterAt(R,7,'letter',{},'จดหมายถึงลูกสาวทหาร');R.map[f-1]='good';say(R,out,'คุณเหน็บซองจดหมายไว้ในเสื้อ ใกล้หัวใจ','good');}
   else if(i===1){R.karma-=2;coin(R,out,D.g);laterAt(R,6,'bounty',{p:D.p},'ข่าวที่ขายไป');R.map[f-1]='evil';say(R,out,`ในจดหมายมีแผนที่คลังเสบียงของกองทัพ พ่อค้าข่าวจ่ายให้ ${D.g} ทองโดยไม่ต่อรองสักคำ`,'bad');}
   else{R.karma+=1;R.map[f-1]='calm';say(R,out,'คุณขุดหลุมตื้นๆ วางจดหมายไว้บนอกเขาแล้วกลบดิน','info');}}},
 loan:{w:2,ok:R=>R.floor<=90,mk(R,K){const f=R.floor,x=gS(R,40),pay=Math.round(x*1.5),p=clamp(.4+TW_ST.luk(R)*.015,.15,.8);K.data={x,pay,p};
   K.tag=`ชั้น ${f} · เงินกู้นอกระบบ`;K.title='ก็อบลินแว่นตาเดียว';K.vis=npc('imp');
   K.text='ก็อบลินใส่แว่นตาเดียวนั่งหลังโต๊ะไม้ผุ บนโต๊ะมีถุงทองวางเรียงกัน ป้ายเขียนว่า กู้ง่าย ไม่ต้องค้ำ คืนภายในแปดชั้น ดอกห้าสิบส่วนร้อย';
   K.ch=[CH(`กู้ ${x} ทอง`,[{t:`+${x} ทอง`,c:'g'},{t:`อีก 8 ชั้นต้องคืน ${pay}`,c:'w'},{t:'/ ถ้าทองไม่พอ โดนรุมทุบ HP −30% เสียทองทั้งกระเป๋า',c:'b'}]),
    CH('กู้แล้วเชิดหนี',[{t:`+${x} ทอง`,c:'g'},kk(-3),{t:`อีก 8 ชั้น ${Math.round(p*100)}% ตามไม่เจอ (LUK ${Math.round(eLuk(R))})`,c:'w'},{t:`/ ${100-Math.round(p*100)}% โดนตามเจอ HP −25% เสียทอง`,c:'b'}]),
    CH('ไม่กู้',[{t:'เดินผ่านไป',c:''}])];K.ch[0].tg=['trade'];K.ch[1].tg=['trick','steal'];K.ai=2;},
  res(R,K,i,out){const f=R.floor,D=K.data;R.map[f-1]='calm';if(i===2){say(R,out,'ก็อบลินเลื่อนแว่นแล้วจดอะไรบางอย่างลงสมุด','info');return;}
   R.h.gold+=D.x;out.coins=D.x;if(i===0){laterAt(R,8,'loan',{x:D.pay},'หนี้ก็อบลิน');say(R,out,`ก็อบลินนับทอง ${D.x} ใส่มือคุณ แล้วชี้นิ้วที่ใต้ตาตัวเองว่าจะจับตาดูไว้`,'info');}
   else{R.karma-=3;R.map[f-1]='evil';laterAt(R,8,'cheat',{p:D.p,x:D.pay},'ก็อบลินเจ้าหนี้ที่คุณเชิดมา');say(R,out,'คุณเซ็นชื่อปลอมลงสัญญา คว้าถุงทองแล้วรีบขึ้นบันได','bad');}}},
 tutor:{w:2,ok:R=>R.floor<=92,mk(R,K){const f=R.floor,cost=gS(R,25),a=2+f*.12;K.data={cost,a};
   K.tag=`ชั้น ${f} · ครูดาบพเนจร`;K.title='ชายแก่กับไม้เท้าเหล็ก';K.vis=npc('trainer');
   K.text='ชายแก่ถือไม้เท้าเหล็กรำดาบอยู่กลางลาน ทุกท่าช้าแต่หาช่องโหว่ไม่เจอ เขาบอกว่ายังรับศิษย์ได้อีกคน แต่ท่าของเขาต้องใช้เวลาราวหกชั้นกว่าจะเข้ามือ';
   K.ch=[CH('จ่ายค่าเรียน',[{t:`−${cost} ทอง`,c:'w'},{t:`อีก 6 ชั้น ATK +${a.toFixed(1)}`,c:'g'}],R.h.gold<cost),CH('ขอฝึกฟรี แลกกับแบกน้ำให้ครู',[{t:'HP −15%',c:'b'},{t:`อีก 6 ชั้น ATK +${(a/2).toFixed(1)}`,c:'g'}]),CH('ขอบคุณแล้วเดินต่อ',[{t:'เดินทางต่อ',c:''}])];
   K.ch[0].tg=['study','fight'];K.ch[1].tg=['fight'];K.ai=R.h.gold>=cost+20?0:1;},
  res(R,K,i,out){const f=R.floor,D=K.data;R.map[f-1]='calm';
   if(i===0){R.h.gold-=D.cost;laterAt(R,6,'train',{a:D.a},'ท่าดาบของครูพเนจร');say(R,out,'ครูดาบรับเงินแล้วเริ่มสอนท่าแรกทันที เขาบอกว่าที่เหลือจะตามขึ้นไปสอนเอง','good');}
   else if(i===1){hurt(R,.15);laterAt(R,6,'train',{a:D.a/2},'ท่าดาบของครูพเนจร');say(R,out,'คุณแบกถังน้ำขึ้นลงบันไดจนไหล่ระบม ครูพยักหน้าแล้วสอนให้ครึ่งท่า','info');}
   else say(R,out,'เสียงไม้เท้าเหล็กกระทบพื้นดังตามหลังคุณขึ้นบันไดไป','info');}}});
Object.assign(TIER,{invest:'c',thorn:'c',seed:'c',letter:'r',loan:'c',tutor:'c'});
/*SIM-END*/
if(typeof document==='undefined'){window.AUTO_SIM={SPECIAL,ARCS,DRAMA,PATHS,pathTier,MFIT,secPrep,BFIT,DAYS,dayHit,secEn,secFight,secOpts,estimateWin,fight,SEC_K,DRG,rollHero,HZ,LX,pRoll,project,hzM,autoLife,newRun,planFloor,applyKey,mkKey,BAL,RUN_OMENS,STANCES};return;}

// ================= UI =================
const {heroSpr,MSPR,BSPR,PSPR,PROPS,COIN,ICONS,sprCanvas,blit,bgImg,bgDraw,drawOverlay,drawProp,compSpr,compKey}=window.ART;
const AUDIO=window.AUDIO;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('th-TH');
const BASE_MS=5000; // one floor lasts 5 s at 1x (speed divides it: 16x = 0.31 s)
const SPEEDS=[1,2,4,8,16];
// key-moment countdown: off by default (0 = no timer); player option 'tof-dtime2' turns on 30 s of real time, not scaled by speed
const DTK='tof-dtime2';let dTime=(()=>{try{return +localStorage.getItem(DTK)===30?30:0;}catch(e){return 0;}})();
const decMs=()=>dTime*1000;
function setDTime(v){v=v===30?30:0;dTime=v;try{localStorage.setItem(DTK,String(v));}catch(e){}
 if(S&&S.phase==='decide'){S.decMs=v*1000;S.left=S.decMs;S.cdLast=performance.now();updCd();}renderCtl();}
let S=null;
const VIS={hf:0,ef:0,nums:[],coins:[],shake:0,edead:false,walk0:0,show:null,dieAt:0};
const THF='600 9px '+((getComputedStyle(document.documentElement).getPropertyValue('--fT')||'sans-serif').trim());
const PXF='8px '+((getComputedStyle(document.documentElement).getPropertyValue('--fP')||'monospace').trim());
const sc=$('scene'),cx=sc.getContext('2d');cx.setTransform(2,0,0,2,0,0);cx.imageSmoothingEnabled=false; // 384x256 backing store, drawn in 192x128 coordinates
const look=h=>window.ART.heroLook(h);
// ---- FX: lunges/recoil, hit sparks, class skills, death dissolve, ambient life. Canvas-drawn at 192x128; skipped under RM.
// Particles live in a fixed ring-buffer pool; shaped effects (slash, ring, projectile, column...) are capped too.
const fr=(a,b)=>a+Math.random()*(b-a);
const FXN=260,FXP=[];let fxI=0;for(let i=0;i<FXN;i++)FXP.push({on:0});
const FXO=[];VIS.mv={};VIS.q=[];VIS.stop=0;VIS.busy=0;VIS.shA=1;
const busy=()=>{VIS.busy=performance.now()+1400;};
function pt(x,y,vx,vy,c,life,o){const p=FXP[fxI];fxI=(fxI+1)%FXN;o=o||{};p.on=1;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.c=c;p.t0=performance.now();p.life=life;
 p.g=o.g!=null?o.g:.12;p.s=o.s||1;p.dr=o.dr||.94;p.k=o.k||0;busy();return p;}
function fo(o){o.t0=o.t0||performance.now();if(FXO.length>=28)FXO.shift();FXO.push(o);busy();return o;}
function burst(x,y,n,cols,sp,o){o=o||{};for(let i=0;i<n;i++){const a=Math.random()*6.283,v=fr(.35,1)*sp;pt(x,y,Math.cos(a)*v,Math.sin(a)*v-(o.up||0),cols[i%cols.length],fr(220,460)*(o.lf||1),{g:o.g!=null?o.g:.1,s:o.s||(i%3?1:2)});}}
function later(ms,f){VIS.q.push({at:performance.now()+ms,f});busy();}
function runQ(t){const due=VIS.q.filter(x=>x.at<=t);if(!due.length)return;VIS.q=VIS.q.filter(x=>x.at>t);due.forEach(x=>{try{x.f();}catch(e){}});}
function shake(ms,a){const t=performance.now();if(VIS.shake<=t||a>=VIS.shA)VIS.shA=a||1;VIS.shake=Math.max(VIS.shake,t+ms);}
// hit-stop: everything in flight freezes for ms (moves, effects, particles and queued impacts are pushed back)
function hitStop(ms){if(RM)return;const t=performance.now();VIS.stop=Math.max(VIS.stop,t+ms);for(const k in VIS.mv)VIS.mv[k].t0+=ms;FXO.forEach(o=>o.t0+=ms);VIS.q.forEach(x=>x.at+=ms);FXP.forEach(p=>{if(p.on)p.t0+=ms;});}
function mv(k,kind,d,a,h){VIS.mv[k]={k:kind,t0:performance.now(),d:Math.max(1,d),a:a||0,h:h||0};busy();}
const Z0={dx:0,dy:0,sx:0,sy:0};
function mvOff(k,t){const m=VIS.mv[k];if(!m||RM)return Z0;const q=(t-m.t0)/m.d;if(q>=1){delete VIS.mv[k];return Z0;}if(q<0)return Z0;
 let dx=0,dy=0,sx=0,sy=0;const a=m.a,h=m.h;
 if(m.k==='lunge'){dx=a*(q<.35?q/.35:1-(q-.35)/.65);dy=-h*Math.sin(Math.PI*q);}
 else if(m.k==='knock'){const e=1-q;dx=a*e*e;}
 else if(m.k==='tele'){if(q<.4){const w=Math.sin(Math.PI*q/.4);sx=2*w;sy=-2*w;dx=-a*.15*w;}else{const r=(q-.4)/.6;dx=a*(r<.4?r/.4:1-(r-.4)/.6);if(r<.25){sx=-1;sy=1;}}}
 else if(m.k==='side'){const w=Math.sin(Math.PI*q);dx=a*w;dy=-3*w;}
 else if(m.k==='blink')dx=q>.18&&q<.72?a:0;
 return{dx:Math.round(dx),dy:Math.round(dy),sx:Math.round(sx),sy:Math.round(sy)};}
// blit with an optional squash/stretch (sx/sy in pixels, anchored at the feet)
function blitM(spr,x,y,o,m){if(!m.sx&&!m.sy){blit(cx,spr,x+m.dx,y+m.dy,o);return;}const c=sprCanvas(spr,o.flip,o.flash,o.key),dw=spr.w+m.sx,dh=spr.h+m.sy;
 cx.drawImage(c,Math.round(x+m.dx-(dw-spr.w)/2),Math.round(y+m.dy+spr.h-dh),dw,dh);}
// ambient blink: paint the eye pixels ('e') with the colour above them for ~130 ms every few seconds (human sprites only)
function blink(spr,x,y,flip,ph,t){if(RM||!spr||spr.squish)return;const per=2900+(ph*53)%1600;if((t+ph*977)%per>130)return;
 if(!spr._eyes){spr._eyes=[];spr.rows.forEach((row,yy)=>{for(let i=0;i<row.length;i++)if(row[i]==='e'&&spr.pal.e){const up=yy>0?spr.pal[spr.rows[yy-1][i]]:null;spr._eyes.push([i,yy,up||spr.pal.s||'#000']);}});}
 for(const [i,yy,c] of spr._eyes){cx.fillStyle=c;cx.fillRect(Math.round(x)+(flip?spr.w-1-i:i),Math.round(y)+yy,1,1);}}
const CSC=new Map();
function cSpr(c){const id=c.n+'|'+c.cls+'|'+c.tr+'|'+(c.legend?1:0);let v=CSC.get(id);if(!v){v={s:compSpr(c),k:'c'+compKey(c)};if(CSC.size>40)CSC.clear();CSC.set(id,v);}return v;}
function enSpr(en){if(!en)return null;if(en.cls)return{spr:heroSpr(en.cls),x:128,y:84,flip:true,key:'c'+en.cls};
 const big=en.boss,spr=big?BSPR[en.id]:MSPR[en.id];if(!spr)return null;if(/^hoard_/.test(en.id))return{spr,x:130,y:62,flip:false,key:en.id};return{spr,x:big?118:128,y:big?70:84,flip:!big&&['wolf','sala'].indexOf(en.id)<0?false:true,key:en.id};}
const ePos=en=>en&&/^hoard_/.test(en.id||'')?{x:160,y:82}:en&&en.boss?{x:134,y:86}:{x:136,y:92};
const FIRE=['#fff6c0','#ffd04a','#ff8a2a','#ff5a1a'];
function sprPix(spr,flip){const k=flip?'_pxf':'_px';if(spr[k])return spr[k];const a=[];
 spr.rows.forEach((row,y)=>{for(let i=0;i<row.length;i++){const c=spr.pal[row[i]];if(row[i]!=='.'&&c)a.push([flip?spr.w-1-i:i,y,c]);}});return spr[k]=a;}
// enemy death: white blink, then the sprite breaks into its own pixels drifting up; bosses also blow up
function killFx(en,delay){if(VIS.edead)return;const t=performance.now();VIS.edead=t+(RM?0:delay);if(RM)return;
 later(delay,()=>{const E=enSpr(en);if(E){const px=sprPix(E.spr,E.flip),st=Math.max(1,Math.ceil(px.length/(en.boss?150:110)));
   for(let j=0;j<px.length;j+=st){const p=px[j];pt(E.x+p[0],E.y+p[1],fr(-.35,.5),fr(-1.1,-.15),p[2],fr(500,1050),{g:-.012,s:st>1?2:1,dr:.97});}}
  if(en.boss){const P=ePos(en);fo({k:'flash',a:.55,d:320});shake(520,3);hitStop(110);AUDIO.sfx('hit');
   for(let j=0;j<4;j++)later(j*120,()=>{const x=P.x+fr(-12,12),y=P.y+fr(-12,10);burst(x,y,14,FIRE,2.6,{g:.04,lf:1.3});fo({k:'ring',x,y,r0:2,r1:12+j*2,col:j%2?'#ffd04a':'#ff8a2a',d:320});if(j===2)AUDIO.sfx('hit');});}
  else burst(ePos(en).x,ePos(en).y,8,['#ffffff','#ffe9a0'],1.2,{g:.02});});}
function lvlFx(){if(RM||!S||S.phase==='birth')return;const x=52;fo({k:'col',x,w:14,col:'255,214,90',d:800});fo({k:'ring',x,y:94,r0:2,r1:18,col:'#ffd04a',d:520,fy:.4});
 for(let i=0;i<16;i++)pt(x+fr(-8,8),fr(86,100),fr(-.2,.2),fr(-1.4,-.5),i%3?'#ffd04a':'#ffffff',fr(500,900),{g:-.01,s:i%4?1:2,dr:.98});}
// one fight event -> animation. C: {en, beat (ms between events), prev (hero HP before), last, win, snd}
function fxEv(e,C){if(RM||!S)return;const en=C.en,E=ePos(en),boss=!!en.boss,R=S.R,hc=R?CLASSES[R.h.cls].id:'war',lo=S.speed>=8,B=C.beat;
 const D=clamp(B*.85,70,240),t0=performance.now();
 const num=(s,x,y,c,th)=>VIS.nums.push({s,x,y,c,t0:performance.now(),th});
 const hitE=(col,o)=>{o=o||{};VIS.ef=performance.now()+(o.cr||o.big?150:100);mv('e','knock',D*.9,boss?2:(o.cr||o.big?6:4));
  burst(E.x-4,E.y,o.n||6,o.cols||['#ffffff','#ffe9a0'],o.sp||1.6);
  if(!o.noSlash)fo({k:'slash',x:E.x,y:E.y,r:o.cr?9:7,a0:-2.3,a1:.7,col:o.sc||'#ffffff',d:Math.max(120,D*1.2)});
  if(e.d)num((o.pre||'')+Math.round(e.d),boss?134:136,boss?68:80,col);
  if(e.d&&C.snd&&!o.quiet)AUDIO.sfx('hit');
  if(o.cr){hitStop(lo?40:75);shake(200,2);fo({k:'ring',x:E.x,y:E.y,r0:2,r1:14,col:'#ffd04a',d:260});}
  if(o.big)shake(180,2);
  if(C.last&&C.win)killFx(en,Math.max(70,D*.35));};
 const proj=(s,x0,y0,arc,d,hit,o)=>fo(Object.assign({k:'proj',s,x0,y0,x1:E.x-2,y1:E.y,arc,d,hit},o||{}));
 const heal=(amt,big)=>{if(amt<.5)return;num('+'+Math.round(amt),52,big?78:84,'#6aff8a');for(let i=0;i<(big?14:4);i++)pt(52+fr(-7,7),fr(84,100),0,fr(-1.2,-.4),i%2?'#8aff9a':'#ffffff',fr(400,750),{g:-.01,dr:.98});};
 if(e.t==='volley'||e.t==='stab')e=Object.assign({},e,{t:'skill'});else if(e.t==='counter')e=Object.assign({},e,{t:'h'});
 if(e.t==='steal'){num('+'+e.g,52,74,'#ffd04a');if(C.snd)AUDIO.sfx('coin');for(let i=0;i<6;i++)pt(E.x,E.y,-fr(1,2.2),fr(-1.5,-.4),'#ffd04a',fr(300,520),{g:.05,dr:.97});return;}
 if(e.t==='save'){fo({k:'ring',x:52,y:99,r0:3,r1:16,col:'#ff8a2a',d:520,fy:.35});burst(52,90,12,FIRE,1.8);num('รอด!',50,76,'#ffd04a',1);return;}
 if(e.t==='h'){mv('h','lunge',D,7,0);later(D*.33,()=>hitE(e.cr?'#ffd04a':'#ffffff',e.cr?{cr:1,pre:'!',n:18,cols:['#ffffff','#ffd04a','#ff8a2a'],sp:2.4}:{}));}
 else if(e.t==='c'){let i=e.bone!==undefined?e.bone%2:R?R.comps.findIndex(c=>c.n===e.n):0;if(i<0)i=0;const c=R&&R.comps[i],cc=c?c.cls:'war',x0=30-16*i+6;
  mv('c'+i,'lunge',D,5,3);
  const s=cc==='mag'?'bolt':cc==='arc'?'arrow':cc==='pri'?'holy':'wave';
  later(D*.25,()=>proj(s,x0,90,cc==='arc'?-10:-3,Math.max(90,D*.6),()=>hitE('#9ad8ff',{n:4,sp:1.2,noSlash:cc!=='war',quiet:lo})));
  if(e.hp>C.prev+.5)heal(e.hp-C.prev,false);}
 else if(e.t==='p'){const i=e.pi!==undefined?e.pi:R?Math.max(0,R.pets.indexOf('wolf')):0;mv('p'+i,'lunge',D,i?36:16,4);later(D*.35,()=>hitE('#ffb0d0',{n:4,noSlash:true,cols:['#ffffff','#ffb0d0']}));}
 else if(e.t==='miss'||e.t==='e'){const DD=D*1.2;mv('e','tele',DD,boss?-10:-16);
  later(DD*.62,()=>{const t=performance.now();
   if(e.t==='miss'){mv('h','side',D,-6);num('หลบ!',50,78,'#7ae8f0',1);for(let i=0;i<3;i++)pt(60,86+i*4,-fr(1.5,2.5),0,'#cfe8ff',fr(160,260),{g:0,dr:.9});}
   else{VIS.hf=t+120;mv('h','knock',D*.9,-4);burst(56,90,boss?10:6,['#ff6a5a','#ffb0a0','#ffffff'],1.5);shake(110,boss?2:1);num('-'+Math.round(e.d),52,82,'#ff6a5a');if(C.snd)AUDIO.sfx('hit');}});}
 else if(e.t==='heal'){const amt=e.hp-C.prev;fo({k:'col',x:52,w:12,col:'255,240,170',d:Math.max(420,B*2.2)});fo({k:'ring',x:52,y:99,r0:3,r1:14,col:'#fff6a0',d:500,fy:.35});heal(amt,true);}
 else if(e.t==='skill'){if(C.snd&&!lo)AUDIO.sfx('warp');const SD=clamp(B*1.6,160,520);
  if(hc==='mag'){mv('h','lunge',SD*.5,2,3);fo({k:'ring',x:52,y:99,r0:4,r1:12,col:'#c8a0ff',d:SD*.6,fy:.35});
   later(SD*.25,()=>proj('fire',60,86,-10,SD*.6,()=>{hitE('#ffd04a',{n:22,cols:FIRE,sp:2.6,noSlash:true,big:1});fo({k:'ring',x:E.x,y:E.y,r0:2,r1:16,col:'#ff8a2a',d:320});fo({k:'ring',x:E.x,y:E.y,r0:1,r1:9,col:'#fff6c0',d:240});fo({k:'flash',a:.18,d:180});}));}
  else if(hc==='arc'){mv('h','knock',SD*.6,-3);for(let j=0;j<5;j++)later(j*SD*.09,()=>{const dy=fr(-6,4),last=j===4;
    fo({k:'proj',s:'arrow',x0:60,y0:88,x1:E.x+fr(-4,3),y1:E.y+dy,arc:-fr(8,16),d:SD*.45,hit:()=>{if(last)hitE('#ffd04a',{n:10,cols:['#ffffff','#c79a5a'],sp:1.8,noSlash:true,big:1});else burst(E.x-3,E.y+dy,3,['#ffffff','#c79a5a'],1);}});});}
  else if(hc==='rog'){const T=E.x-24-52;fo({k:'after',x:44,y:84,d:SD*.7});mv('h','blink',SD,T);
   later(SD*.2,()=>{for(let j=1;j<4;j++)fo({k:'after',x:44+T*j/4,y:84,d:SD*.5});});
   later(SD*.32,()=>{fo({k:'slash',x:E.x,y:E.y,r:8,a0:-2.4,a1:.6,col:'#d8b0ff',d:220});fo({k:'slash',x:E.x,y:E.y,r:8,a0:-.7,a1:2.4,col:'#ffffff',d:220,t0:performance.now()+50});hitE('#ffd04a',{n:12,cols:['#ffffff','#d8b0ff','#8a5ad0'],sp:2,noSlash:true,big:1});});
   later(SD*.72,()=>fo({k:'after',x:44+T,y:84,d:SD*.5}));}
  else if(hc==='far'){mv('h','lunge',SD*.6,8,1);later(SD*.2,()=>proj('fork',62,90,-2,SD*.35,()=>{hitE('#ffd04a',{n:8,cols:['#ffffff','#ffd04a'],sp:1.6,noSlash:true,big:1});
    for(let i=0;i<9;i++){const a=i/9*6.283;pt(E.x,E.y,Math.cos(a)*fr(1,2),Math.sin(a)*fr(1,2)-.6,i%3?'#4ad86a':'#7af08a',fr(600,900),{g:.03,k:1,dr:.95});}}));}
  else if(hc==='dra'){mv('h','knock',SD*.5,-2);fo({k:'breath',x0:62,y0:88,x1:E.x,y1:E.y,d:SD*.8});
   later(SD*.5,()=>{hitE('#ffd04a',{n:18,cols:FIRE,sp:2.4,noSlash:true,big:1});fo({k:'flash',a:.14,d:160});shake(260,2);});}
  else{mv('h','lunge',SD*.7,9,2);later(SD*.25,()=>proj('wave',62,90,0,SD*.4,()=>{hitE('#ffd04a',{n:14,cols:['#ffffff','#9ad8ff','#5a9ae0'],sp:2.2,sc:'#9ad8ff',big:1});fo({k:'slash',x:E.x,y:E.y,r:9,a0:-.6,a1:2.4,col:'#ffffff',d:200});}));}}}
// draw particles + shaped effects (called every frame from drawScene)
function drawFx(t){const dt=Math.min(100,t-(VIS.fxT||t));VIS.fxT=t;const run=t>=VIS.stop,k=dt/33;
 for(const p of FXP){if(!p.on)continue;const a=(t-p.t0)/p.life;if(a>=1){p.on=0;continue;}
  if(run){const dr=Math.pow(p.dr,k);p.vx*=dr;p.vy=p.vy*dr+p.g*k;p.x+=p.vx*k;p.y+=p.vy*k;}
  cx.globalAlpha=a>.6?(1-a)/.4:1;cx.fillStyle=p.c;const x=Math.round(p.x),y=Math.round(p.y);
  if(p.k===1){cx.fillRect(x-1,y,3,1);cx.fillRect(x,y-1,1,3);cx.fillStyle='#1a6a2a';cx.fillRect(x,y,1,1);}else cx.fillRect(x,y,p.s,p.s);}
 cx.globalAlpha=1;
 for(let i=FXO.length-1;i>=0;i--){const o=FXO[i],q=(t-o.t0)/o.d;if(q<0)continue;
  if(q>=1){FXO.splice(i,1);if(o.hit&&!o.done){o.done=1;try{o.hit();}catch(e){}}continue;}
  try{drawO(o,q,run);}catch(e){}cx.globalAlpha=1;}}
function drawO(o,q,run){
 if(o.k==='slash'){const a=o.a0+(o.a1-o.a0)*Math.min(1,q*2.2),n=12;cx.globalAlpha=1-q;cx.fillStyle=o.col;
  for(let j=0;j<=n;j++){const g=o.a0+(a-o.a0)*j/n;cx.fillRect(Math.round(o.x+Math.cos(g)*o.r),Math.round(o.y+Math.sin(g)*o.r*.8),j>n-4?2:1,1);}
  cx.fillStyle='#ffffff';cx.fillRect(Math.round(o.x+Math.cos(a)*o.r),Math.round(o.y+Math.sin(a)*o.r*.8),2,2);}
 else if(o.k==='ring'){const e=1-(1-q)*(1-q),r=o.r0+(o.r1-o.r0)*e,n=Math.max(10,Math.round(r*2.2));cx.globalAlpha=1-q;cx.fillStyle=o.col;
  for(let j=0;j<n;j++){const g=j/n*6.283;cx.fillRect(Math.round(o.x+Math.cos(g)*r),Math.round(o.y+Math.sin(g)*r*(o.fy||1)),1,1);}}
 else if(o.k==='col'){const a=Math.sin(Math.PI*q)*.5;cx.fillStyle=`rgba(${o.col},${a})`;cx.fillRect(Math.round(o.x-o.w/2),0,o.w,100);
  cx.fillStyle=`rgba(255,255,255,${a*.7})`;cx.fillRect(Math.round(o.x-o.w/6),0,Math.max(2,Math.round(o.w/3)),100);
  if(run&&Math.random()<.5)pt(o.x+fr(-o.w/2,o.w/2),fr(20,96),0,fr(-1.2,-.4),'#fff6c0',fr(300,500),{g:0,dr:.98});}
 else if(o.k==='flash'){cx.fillStyle=`rgba(255,255,255,${o.a*(1-q)})`;cx.fillRect(0,0,192,128);}
 else if(o.k==='after'){if(!VIS.hs)return;cx.globalAlpha=.45*(1-q);blit(cx,VIS.hs.spr,o.x,o.y,{key:VIS.hs.key,flash:true,noShadow:true,noAnim:true});}
 else if(o.k==='breath'){if(!run||q>.75)return;const dx=o.x1-o.x0,dy=o.y1-o.y0,L=Math.hypot(dx,dy);
  for(let j=0;j<5;j++){const v=fr(3,4.5);pt(o.x0,o.y0+fr(-1,1),dx/L*v,dy/L*v+fr(-.5,.5),FIRE[j%4],L/v*33*fr(.8,1.05),{g:0,s:j%2?2:1,dr:.995});}}
 else if(o.k==='proj'){const x=o.x0+(o.x1-o.x0)*q,y=o.y0+(o.y1-o.y0)*q+o.arc*Math.sin(Math.PI*q),X=Math.round(x),Y=Math.round(y);
  const ang=Math.atan2((o.y1-o.y0)+o.arc*Math.PI*Math.cos(Math.PI*q),o.x1-o.x0),ca=Math.cos(ang),sa=Math.sin(ang);
  if(o.s==='fire'){cx.fillStyle='#ff8a2a';cx.fillRect(X-1,Y-1,3,3);cx.fillStyle='#fff6c0';cx.fillRect(X,Y,1,1);if(run){pt(x-2,y+fr(-1,1),fr(-.4,0),fr(-.3,.1),Math.random()<.5?'#ff5a1a':'#ffb03a',fr(180,300),{g:-.02});}}
  else if(o.s==='wave'){cx.fillStyle='#cfe8ff';for(let j=-4;j<=4;j++)cx.fillRect(X+Math.round((4-Math.abs(j))*.6),Y+j,j===0?2:1,1);cx.fillStyle='#ffffff';cx.fillRect(X+2,Y-1,1,3);if(run)pt(x-3,y+fr(-4,4),-.3,0,'#9ad8ff',200,{g:0});}
  else if(o.s==='arrow'||o.s==='fork'){cx.fillStyle='#c79a5a';for(let j=1;j<(o.s==='fork'?7:5);j++)cx.fillRect(Math.round(x-ca*j),Math.round(y-sa*j),1,1);
   cx.fillStyle=o.s==='fork'?'#c8c8d0':'#ffffff';cx.fillRect(X,Y,1,1);if(o.s==='fork'){cx.fillRect(X-1,Y-2,2,1);cx.fillRect(X-1,Y+2,2,1);cx.fillRect(X,Y-2,1,5);}}
  else{const c=o.s==='holy'?'#fff6a0':'#c8a0ff';cx.fillStyle=c;cx.fillRect(X-1,Y-1,2,2);cx.fillStyle='#ffffff';cx.fillRect(X,Y,1,1);if(run)pt(x,y,fr(-.3,0),fr(-.2,.2),c,180,{g:0});}}}
// ---- optional hooks into audio.js / share.js (the game runs without them) ----
const sting=n=>{try{if(AUDIO&&AUDIO.sting){AUDIO.sting(n);return true;}}catch(e){}return false;};
const music=(b,f)=>{try{AUDIO&&AUDIO.music&&AUDIO.music(b,f);}catch(e){}};
const heroSeed=h=>{const L=look(h);return shash(h.name+'|'+(L&&L.seed!=null?L.seed:''));};
function heroTheme(h){try{if(AUDIO&&AUDIO.setHero)return AUDIO.setHero({seed:heroSeed(h),cls:CLASSES[h.cls].id,rank:h.rank})||AUDIO.themeId||'';}catch(e){}return'';}
// seeded cosmetics: wall cracks, moss, a banner in the hero's rank colour, pebbles; same hero always gets the same tower.
// v2.7.2: painted at 384x256 (scaled by 2, so 0.5 is one fine pixel) like ART.bgHi; decoDraw() picks the full or the smoothed small copy.
// r() is called in the same order as before, so the layout of each hero's tower did not move; the extra detail uses r2().
const decoC=new Map();
function heroDeco(b,h){const sd=heroSeed(h),key=sd+':'+b;let c=decoC.get(key);if(c)return c;if(decoC.size>12)decoC.clear();
 c=document.createElement('canvas');c.width=384;c.height=256;const x=c.getContext('2d');x.scale(2,2);let a=(sd^Math.imul(b+1,0x9e3779b9))|0,a2=(sd^0x5bd1e995)|0;
 const mul=s=>{let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
 const r=()=>{a=a+0x6D2B79F5|0;return mul(a);},r2=()=>{a2=a2+0x6D2B79F5|0;return mul(a2);};
 const R=(X,Y,w,hh,col)=>{x.fillStyle=col;x.fillRect(X,Y,w,hh);},px=(X,Y,w,hh,col)=>R(Math.floor(X),Math.floor(Y),w,hh,col);
 const ell=(X,Y,rx,ry,col)=>{x.fillStyle=col;x.beginPath();x.ellipse(X,Y,rx,ry,0,0,7);x.fill();};
 const MOSS=['#3a6a2a','#5a8ab0','#2a4a22','#c83a10','#6a6ab8'][b];
 // cracks: the same pixel walk, drawn as a thin chiselled line with a lit lip and a short side branch now and then
 if(b!==4)for(let i=0,n=2+Math.floor(r()*3);i<n;i++){let X=Math.floor(r()*190),Y=Math.floor(6+r()*80);const P=[[X+.5,Y]];for(let j=0,l=4+Math.floor(r()*6);j<l;j++){X+=r()<.5?1:-1;Y+=1;P.push([X+.5,Y]);}
  x.lineCap='round';x.lineJoin='round';for(const [col,dx,w] of [['rgba(255,255,255,0.07)',.5,.5],['rgba(0,0,0,0.42)',0,.75]]){x.strokeStyle=col;x.lineWidth=w;x.beginPath();P.forEach(([X0,Y0],k)=>k?x.lineTo(X0+dx,Y0):x.moveTo(X0+dx,Y0));x.stroke();}
  if(P.length>5&&r2()<.6){const [X0,Y0]=P[2+Math.floor(r2()*(P.length-4))],s=r2()<.5?-1:1;x.strokeStyle='rgba(0,0,0,0.3)';x.lineWidth=.5;x.beginPath();x.moveTo(X0,Y0);x.lineTo(X0+s*1.5,Y0+1);x.lineTo(X0+s*2.5,Y0+2.5);x.stroke();}
  R(P[0][0]-.5,P[0][1]-.5,1,.5,'rgba(0,0,0,0.25)');}
 // moss: soft clumps in the biome colour with a lit top and a shaded underside
 for(let i=0,n=3+Math.floor(r()*4);i<n;i++){const X=Math.floor(r()*186),Y=Math.floor(r()<.5?96+r()*3:10+r()*70),w=2+Math.floor(r()*3);
  ell(X+w/2,Y+.9,w/2+.6,1.2,'rgba(0,0,0,0.22)');ell(X+w/2,Y+.5,w/2+.4,.9,MOSS);ell(X+1.5,Y+1.5,.9,.7,MOSS);
  for(let k=0;k<w*2;k++)R(X+k*.5,Y+(r2()<.5?0:.5)-.5,.5,.5,'rgba(255,255,255,0.16)');if(r2()<.5)R(X+1.25+r2()*w*.5,Y+2,.5,1+r2(),MOSS);}
 // banner in the rank colour: rod, cloth with folds and gold trim, swallowtail
 if(r()<.75){const X=Math.floor(r()<.5?36+r()*30:126+r()*30),col=RANKS[h.rank]?RANKS[h.rank].col:'#c84a3a';
  R(X+7.5,4,1,12,'rgba(0,0,0,0.18)');R(X-1,2,9,1,'#3a2a1a');R(X-1,2,9,.5,'rgba(255,220,170,0.25)');R(X-1.5,1.75,1,1.5,'#d4a43a');R(X+7.5,1.75,1,1.5,'#d4a43a');
  x.fillStyle=col;x.beginPath();x.moveTo(X,3);x.lineTo(X+7,3);x.lineTo(X+7,18);x.lineTo(X+5,16.5);x.lineTo(X+3.5,17);x.lineTo(X+2,16.5);x.lineTo(X,18);x.closePath();x.fill();
  const g=x.createLinearGradient(X,0,X+7,0);g.addColorStop(0,'rgba(0,0,0,0.22)');g.addColorStop(.35,'rgba(255,255,255,0.12)');g.addColorStop(.6,'rgba(0,0,0,0.05)');g.addColorStop(1,'rgba(0,0,0,0.28)');x.fillStyle=g;x.fill();
  R(X,3,7,1,'#d4a43a');R(X,3,7,.5,'#f4d070');R(X,15,7,.5,'rgba(212,164,58,0.8)');R(X+3,6.5,1,.5,'#fff6');R(X+2.5,7,2,2,'rgba(255,255,255,0.4)');R(X+3,7,1,3,'#fff8');R(X+3,10,1,.5,'rgba(255,255,255,0.3)');}
 // pebbles: same spots, now little stones with a shadow and a highlight
 for(let i=0,n=6+Math.floor(r()*6);i<n;i++){const X=Math.floor(r()*190),Y=Math.floor(103+r()*22),w=1+Math.floor(r()*2),dk=r()<.5;
  if(dk){ell(X+w/2,Y+.75,w/2+.25,.5,'rgba(0,0,0,0.25)');ell(X+w/2,Y+.4,w/2,.45,'rgba(0,0,0,0.3)');R(X+.25,Y,.5,.5,'rgba(255,255,255,0.14)');}
  else{ell(X+w/2,Y+.5,w/2,.5,'rgba(255,255,255,0.09)');R(X,Y,.5,.5,'rgba(255,255,255,0.12)');}}
 if(b===4)for(let i=0;i<10;i++){const X=Math.floor(r()*192),Y=Math.floor(r()*96),gd=r()<.3;
  if(gd){x.fillStyle='rgba(255,233,160,0.22)';x.beginPath();x.arc(X+.5,Y+.5,1.6,0,7);x.fill();R(X,Y,1,1,'#ffe9a0');R(X+.25,Y+.25,.5,.5,'#fffbe8');}else{R(X+.25,Y+.25,.5,.5,'#ffffff');R(X,Y+.25,1,.5,'rgba(255,255,255,0.35)');}}
 decoC.set(key,c);return c;}
function decoDraw(x,b,h){if(!h)return;try{const c=heroDeco(b,h);if(window.ART.hiDraw)window.ART.hiDraw(x,c);else x.drawImage(c,0,0,192,128);}catch(e){}}
const ach=(t,d)=>{try{window.ACH&&window.ACH.onEvent&&window.ACH.onEvent(t,d||{});}catch(e){}};
// milestone banner over the scene
let mileT=0;function showMile(m){const b=$('mileBan');if(!b||!m)return;b.textContent=m.f===1?'นักผจญภัยรุ่นเดียวกันทุกคนยังอยู่ครบ':`ชั้น ${m.f} · นักผจญภัยรุ่นเดียวกันเหลือรอดราว ${pctTxt(m.p)}%`;b.hidden=false;
 clearTimeout(mileT);mileT=setTimeout(()=>{b.hidden=true;},S&&S.speed>=8?1600:2800);}
const VTINT=[null,'rgba(255,140,60,0.10)','rgba(60,80,200,0.13)'];
function drawShow(t,bob){const s=VIS.show;if(!s)return;
 if(s.t==='en'){const en=s.en,E=enSpr(en);if(!E)return;let fl=VIS.ef>t;if(VIS.edead){if(t>=VIS.edead)return;fl=Math.floor(t/50)%2===0;}
  const m=mvOff('e',t),ey=en.cls?84+bob:en.boss?E.y+bob:84+(RM?0:Math.round(Math.sin(t/300+1)));
  blitM(E.spr,E.x,ey,{flip:E.flip,flash:fl,key:E.key},m);if(en.cls&&!fl)blink(E.spr,E.x+m.dx,ey+m.dy,true,11,t);}
 else if(s.t==='prop'){if(s.pr)drawProp(cx,s.fb&&!(window.ART.NPCS&&window.ART.NPCS[s.pr])?s.fb:s.pr,t);} // story NPC sprite when sprites.js has it, generic npc otherwise
 else if(s.t==='pet')blit(cx,PSPR[s.p],132,91+bob,{key:'p'+s.p});
 else if(s.t==='comp'){if(s.gold){cx.fillStyle=`rgba(244,187,74,${RM?.25:.18+.12*Math.sin(t/300)})`;cx.fillRect(124,76,24,30);}
  const v=s.c&&s.c.cls?cSpr(s.c):{s:heroSpr(s.cls),k:'c'+s.cls};blit(cx,v.s,128,84+bob,{flip:true,key:v.k});blink(v.s,128,84+bob,true,5,t);
  if(s.gold&&!RM&&Math.random()<.3)pt(fr(126,146),fr(80,100),0,-.4,'#ffe890',fr(300,600),{g:-.01});}}
function drawScene(t){const R=S.R,h=R?R.h:S.hero;const b=R?biome(R.floor):0;const ph=S.phase;
 if(VIS.q.length)runQ(t);
 cx.save();if(VIS.shake>t&&!RM){const a=VIS.shA||1;cx.translate(Math.round((Math.random()*2-1)*a),a>1?Math.round((Math.random()*2-1)*(a-1)):0);}
 bgDraw(cx,b);decoDraw(cx,b,h);drawOverlay(cx,b,RM?0:t);
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
  if(R&&cid(R)==='nec'&&window.ART.BONE){const B=window.ART.BONE;for(let i=0;i<2;i++){const m=mvOff('c'+i,t),x=hx-22-i*16+m.dx,y=84+(walking?hb:(RM?0:Math.round(Math.sin(t/300+i*2))))+m.dy;blit(cx,B,x,y,{key:'bone'});}}
  if(R){R.comps.forEach((c,i)=>{const v=cSpr(c),m=mvOff('c'+i,t),x=hx-22-i*16+m.dx,y=84+(walking?hb:(RM?0:Math.round(Math.sin(t/260+i+1))))+m.dy;blit(cx,v.s,x,y,{key:v.k});blink(v.s,x,y,false,i*331+7,t);});
   R.pets.forEach((p,i)=>{const m=mvOff('p'+i,t);blit(cx,PSPR[p],hx-(i?36:14)+m.dx,91+(RM?0:Math.abs(Math.round(Math.sin(t/180+i)*2)))+m.dy,{flip:true,key:'p'+p});});}
  if(ph==='birth'){cx.fillStyle='rgba(244,187,74,0.12)';cx.fillRect(84,0,24,100);cx.fillStyle='#5a4a3a';cx.fillRect(80,100,32,4);for(let i=0;i<6;i++){const a=(RM?0:t/600)+i;cx.fillStyle='#f4bb4a';cx.fillRect(96+Math.round(Math.cos(a)*16),88+Math.round(Math.sin(a)*12),1,1);}}
  {const hs=heroSpr(CLASSES[h.cls].id,look(h)),m=dk>0?Z0:mvOff('h',t),X=hx+m.dx,Y=84+hb+m.dy;VIS.hs={spr:hs,key:'h'+hs.id};if(dk>0)cx.globalAlpha=1-dk;blit(cx,hs,X,Y,{flash:VIS.hf>t,key:'h'+hs.id});cx.globalAlpha=1;
   if(!dk&&VIS.hf<=t)blink(hs,X,Y,false,3,t);
   if(walking&&!RM&&Math.random()<.55)pt(hx+fr(2,7),99,-fr(.2,.6),-fr(.05,.3),'rgba(200,184,154,.7)',fr(220,380),{g:-.004,dr:.95});}
  if(ph!=='birth'&&(wp>.5||RM))drawShow(t,bob);
 }
 drawFx(t);
 cx.textAlign='center';
 VIS.nums=VIS.nums.filter(n=>t-n.t0<900);for(const n of VIS.nums){const k=(t-n.t0)/900;cx.font=n.th?THF:PXF;cx.globalAlpha=1-k;cx.fillStyle='#000';cx.fillText(n.s,n.x+1,n.y-k*14+1);cx.fillStyle=n.c;cx.fillText(n.s,n.x,n.y-k*14);}cx.globalAlpha=1;
 VIS.coins=VIS.coins.filter(c=>c.y<140);for(const c of VIS.coins){c.vy+=.18;c.x+=c.vx;c.y+=c.vy;if(c.y>104&&c.vy>0){c.vy*=-.45;c.y=104;c.b++;if(c.b>3)c.y=200;}blit(cx,COIN,c.x,c.y);if(!RM&&Math.random()<.12){cx.fillStyle='#ffffff';cx.fillRect(Math.round(c.x)+3,Math.round(c.y)-1,1,3);cx.fillRect(Math.round(c.x)+2,Math.round(c.y),3,1);}}
 cx.restore();}
function coinBurst(n){AUDIO.sfx('coin');if(RM)return;for(let i=0;i<Math.min(40,n);i++)VIS.coins.push({x:130,y:80,vx:rr(-2.4,1.2),vy:rr(-4,-1.5),b:0});}
let lastT=0;function loop(t){requestAnimationFrame(loop);if(document.hidden)return;if(t-lastT<(RM?400:(t<VIS.busy||(S&&S.phase==='combat'))?30:50))return;lastT=t;try{drawScene(t);}catch(e){}}
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
 {const nm=$('hName'),sw=!!(R?hasSw(R):h.ex&&h.ex.got),v=h.name+'|'+sw;if(nm.dataset.v!==v){nm.dataset.v=v;nm.textContent=h.name;if(sw){const e=document.createElement('span');e.className='hexc';e.dataset.tip='excal';e.textContent=' 🗡';nm.appendChild(e);}}}$('hSub').textContent=`รุ่นที่ ${h.gen||1} · แรงค์ ${RANKS[h.rank].k} · ${C.n} · ${h.village}`;
 {const el=$('hPath'),P=R&&pathOf(R);if(el){if(!P)el.hidden=true;else{const v=R.path||0,t=pathTier(R),nx=PATH_T[t];el.hidden=false;
  el.innerHTML=`<span class="pt">✦ ${esc(P.n)}${t?' · '+esc(P.t[t-1]):''}</span> <span class="pbar"><i style="width:${clamp(v,0,100)}%"></i></span> <span class="px">${Math.floor(v)}${nx?'/'+nx:''}</span>`;
  el.dataset.tipn=P.n;el.dataset.tipd=`ได้แต้มจาก: ${P.src}${nx?` · ครบ ${nx} แต้มเป็น "${P.t[t]}": ${P.b[t]}`:' · ขึ้นถึงขั้นสุดท้ายแล้ว'}${t?` · ตอนนี้ได้: ${P.b[t-1]}`:''}${t===2&&v>=PATH_T[2]?' · แต้มครบแล้ว ต้องชนะการชิงตำแหน่งก่อนจึงจะได้ขั้นสุดท้าย':''}`;}}}
 const f=R?R.floor:0;$('hFloor').textContent=f;
 $('v-hp').textContent=`${Math.ceil(hp)}/${Math.ceil(h.mhp)}`;$('b-hp').style.width=clamp(hp/h.mhp*100,0,100)+'%';
 const A=R?eAtk(R):h.atk,D=R?eDef(R):h.def,Lk=R?eLuk(R):h.luk;
 $('v-atk').textContent=Math.round(A);$('v-def').textContent=Math.round(D);$('v-luk').textContent=Math.round(Lk);
 $('v-mp').textContent=`${Math.round(h.mp)}`;$('b-mp').style.width=clamp(h.mp/h.mmp*100,0,100)+'%';
 $('v-lv').textContent=`Lv.${h.lv}`;$('b-lv').style.width=clamp(h.exp/need(h.lv)*100,0,100)+'%';$('v-gold').textContent=fmt(h.gold);
 $('v-fate').textContent=fateText();if(R){achWatch(R);if(R.alive){partyTick(R);hpTick(R,hp);}}
 $('pFill').style.width=f+'%';$('pMark').style.left=f+'%';$('track').setAttribute('aria-valuenow',f);
 $('biomeTag').textContent=R?`${BIOMES[biome(R.floor)]} · ชั้น ${R.floor}`:'ห้องโถงแห่งการสุ่มเกิด';
 {const tn=$('towerNow'),t=towerNow(R);if(tn){tn.hidden=!t;tn.textContent=t;}}
 const ticks=$('pTicks');if(!ticks.childElementCount)for(let i=10;i<=100;i+=10){const d=document.createElement('div');d.className='tick';d.style.left=i+'%';ticks.appendChild(d);}
 [...ticks.children].forEach((d,i)=>d.classList.toggle('done',f>(i+1)*10));
 const now={hp:Math.round(hp),atk:Math.round(A*10)/10,def:Math.round(D*10)/10,luk:Math.round(Lk),mp:Math.round(h.mp),lv:h.lv,gold:Math.round(h.gold),run:S.runId,pt:R?R.pathHi||0:0};
 if(snap&&snap.run===now.run&&now.pt>(snap.pt||0)){AUDIO.sfx('chest');const el=$('hPath');if(el&&!RM){el.classList.remove('up');void el.offsetWidth;el.classList.add('up');}}
 if(snap&&snap.run===now.run&&now.lv>snap.lv){AUDIO.sfx('levelup');lvlFx();}
 if(snap&&snap.run===now.run&&S.phase!=='birth'){let n=0;for(const k of ['hp','atk','def','luk','mp','lv','gold']){const d=now[k]-snap[k];if(Math.abs(d)>=(k==='atk'||k==='def'?.5:1))floatD(k,d,n++);}}
 snap=now;}
// stat chips: one per stat per update, released 140 ms apart, with the HUD chip pulsing as its number flies
function floatD(k,d,i){if(RM)return;const el=$('c-'+k);if(!el)return;if(i){setTimeout(()=>floatD(k,d,0),i*140);return;}
 el.classList.remove('pulse');void el.offsetWidth;el.classList.add('pulse');const s=document.createElement('span');s.className='flt '+(d>0?'up':'dn');s.textContent=(d>0?'+':'')+(Number.isInteger(d)?d:d.toFixed(1))+(d>0?' ▲':' ▼');el.appendChild(s);setTimeout(()=>s.remove(),1250);}
function miniCanvas(spr,key){const c=document.createElement('canvas');c.width=16;c.height=16;const x=c.getContext('2d');x.drawImage(sprCanvas(spr,false,false,key),Math.floor((16-spr.w)/2),Math.floor((16-spr.h)/2));return c;}
function renderParty(){const el=$('party');el.innerHTML='';const R=S.R,h=R?R.h:S.hero,C=CLASSES[h.cls];
 const add=(spr,key,title,desc)=>{const d=document.createElement('div');d.className='mem';d.appendChild(miniCanvas(spr,key));const t=document.createElement('div');t.innerHTML=`<div>${esc(title)}</div><div class="d">${esc(desc)}</div>`;d.appendChild(t);el.appendChild(d);};
 const hs=heroSpr(C.id,look(h));add(hs,'h'+hs.id,`${h.name} (Lv.${h.lv} ${C.n})`,`สกิลติดตัว: ${C.p} · ${C.pd}`);
 if(R){R.pets.forEach(p=>add(PSPR[p],'p'+p,`สัตว์เลี้ยง: ${PETS[p].n}`,PETS[p].d));R.comps.forEach(c=>{const v=cSpr(c),T=trOf(c);add(v.s,v.k,`${c.n} · ${clsName(c.cls)}${T?' · '+T.n:''}${c.legend?' ★':''}`,`พลังโจมตี ${Math.round(c.pw)}${c.cls==='pri'?' · ฟื้น HP ระหว่างสู้':''}`);});
  if(!R.pets.length&&!R.comps.length){const p=document.createElement('div');p.className='d';p.style.cssText='font-size:12px;color:var(--dim);padding:4px 0';p.textContent='ยังไม่มีเพื่อนร่วมทาง';el.appendChild(p);}
  const inv=document.createElement('div');inv.className='inv';inv.innerHTML=`<span>ยาฟื้นพลัง <b>${R.potions}</b></span><span>ม้วนวาร์ป <b>${R.warps}</b></span><span>สังหาร <b>${R.kills}</b></span><span>แผลเป็น <b>${R.scars}</b></span><span>ดวงประจำชาติ <b>${esc(omenOf(R.h).n)}</b></span>${R.egg?'<span>อุ้มไข่อยู่ <b>1</b></span>':''}`;el.appendChild(inv);}}
function renderLog(){const el=$('log');const L=S.R?S.R.log:[];el.innerHTML=L.slice(0,80).map(l=>`<li class="${l.c}"><span class="f px">${l.f}F</span><span>${esc(l.t)}</span></li>`).join('')||'<li><span class="f"></span><span class="dim">ยังไม่มีบันทึก</span></li>';}
// ---- memorial ----
const MKEY='tof-auto-memorial-v1',SKEY='tof-auto-seen-v1';
function loadSeen(){try{const v=JSON.parse(localStorage.getItem(SKEY)||'{}');return v&&typeof v==='object'?v:{};}catch(e){return{};}}
function saveSeen(R){let n=0;try{const v=loadSeen();R.hist.forEach(x=>{if(!v[x.tid]){v[x.tid]=1;n++;}});localStorage.setItem(SKEY,JSON.stringify(v));}catch(e){}return n;}
const excRow=R=>R.exc?`<dt>ดาบในหิน</dt><dd><span data-tip="excal">ถอนออกจากหินได้ที่ชั้น ${R.excF} ทุกชาติต่อไปจะเกิดมาพร้อมดาบเล่มนี้</span></dd>`:hasSw(R)?'<dt>ดาบในหิน</dt><dd><span data-tip="excal">พกติดตัวมาตั้งแต่เกิด</span></dd>':R.exT?`<dt>ดาบในหิน</dt><dd><span data-tip="excal">ลองดึงแล้วแต่ไม่ออก ชาติหน้าโอกาสขึ้นเป็น ${excCh(Math.max(excN(R),(R.h.ex&&R.h.ex.n|0)+1))}%</span></dd>`:'';
function runTitle(R){const h=R.h,fl=R.won?100:R.floor,leg=R.hist.filter(x=>x.rar==='l').length,T=[];
 if(R.won)T.push([9,'ผู้พิชิตยอดหอ',1]);if(R.sec&&R.sec.res==='s')T.push([11,'นักล่ามังกร',1]);if(R.sec&&R.sec.res==='f')T.push([11,R.sec.m0==='s'?'ผู้ไว้ชีวิตมังกร':'สหายมังกร',1]);if(R.lift)T.push([12,'ดยุกปราบมังกร',1]);if(R.sec&&R.sec.res==='x')T.push([10,'ผู้ท้ามังกร',1]);if(leg>=2)T.push([8,'ผู้เห็นตำนานซ้ำสองครั้ง',1]);if(R.exc)T.push([13,'ผู้ถอนดาบในหิน',1]);else if(hasSw(R))T.push([2,'ผู้ถือดาบในหิน']);
 if(R.karma>=20)T.push([6,'นักบุญแห่งหอคอย']);if(R.karma<=-20)T.push([6,'ปีศาจในคราบคน']);if(fl<=10)T.push([5,'ดาวที่ดับเร็ว']);
 if(R.fateShift>=8)T.push([6,'คนต่อชะตา']);if(R.fateShift<=-6)T.push([5,'คนขายอายุ']);if(R.pMax>=.15&&fl>R.pMaxF+5)T.push([5,'คนที่ยมทูตมองข้าม']);
 if(R.sameN>=3)T.push([2,'คนไม่เปลี่ยนใจ']);if(R.scars>=3)T.push([5,'คนที่ตายยาก']);
 if(R.death==='boss')T.push([4,'ผู้ท้าทายเกินตัว']);if(R.pets.length>=2)T.push([3,'เจ้าของสวนสัตว์เคลื่อนที่']);
 if(R.keys>3&&R.timeouts>=R.keys)T.push([4,'คนที่ปล่อยให้ฟ้าลิขิต']);if(R.keys>5&&R.timeouts===0)T.push([3,'ผู้เลือกทางเดินเอง']);
 if(h.gold>=400*scl(fl)/2)T.push([3,'เศรษฐีในหลุมศพ']);if(R.kills>=fl*.9)T.push([2,'นักล่าไม่รู้เหนื่อย']);if(R.comps.some(c=>c.legend))T.push([4,'นายจ้างของตำนาน']);
 {const a=crownArch(R);if(a)T.push([a.p,a.t,a.g]);}
 T.push([1,'นักผจญภัยธรรมดาคนหนึ่ง']);T.sort((a,b)=>b[0]-a[0]);return{t:T[0][1],gold:!!T[0][2]};}
// sensitive moments (v2.7): never picked for the end montage or bragged about in the share text (legend hooks)
// SENS_TID = the lost child's ghost (the hero walked past her); SENS_CH = choices that hurt someone helpless or sacrifice a pet
const SENS_TID=/^arc:child:1:0$/,SENS_CH=['ทำเป็นไม่เห็น','จับไปเรียกค่าไถ่','เข้าร่วมพิธี','ถวายสัตว์เลี้ยง','ถวายเลือดตัวเอง','แทงลงไป'];
const sens=m=>!!m&&(SENS_TID.test(String(m.tid||''))||SENS_CH.includes(m.c));
function montage(R){const H=R.hist.filter(m=>!sens(m));if(!H.length)return[];const n=Math.min(8,Math.max(2,2+Math.floor((R.won?100:R.floor)/14)),H.length),out=[];
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
 $('memo').innerHTML=a.length?show.map(m=>`<div class="row"><span class="px" style="color:${RANKS[m.rank]?RANKS[m.rank].col:'#fff'}">${esc(RANKS[m.rank]?RANKS[m.rank].k:'?')}</span><span>${esc(m.name)}${m.drg==='f'?' 🐉':m.drg==='s'?' ⚔':''} · ${esc(m.cls)}${m.pth?' · '+esc(m.pth):''}${m.gen>1?` · รุ่นที่ ${m.gen}`:''}${m.old?' <span class="oldtag">โหมดเก่า</span>':''}${m.pat?` <span class="mpat"${patTip(m.pat,m.patN)}>${esc(patEmo(m.pat))}${m.patN?' '+esc(m.patN):''}</span>`:''}<br><span class="x">${esc(m.cause)}</span></span><span class="px">${m.won?'👑 ':''}${m.floor}F</span></div>`).join('')
  +(a.length>N?`<button type="button" class="btn memomore" id="memoMore">${memoAll?'ย่อรายการ':`ดูเพิ่ม (อีก ${a.length-N} คน)`}</button>`:''):'<div class="dim" style="font-size:13px">ยังไม่มีใครนอนอยู่ที่นี่</div>';
 const b=$('memoMore');if(b)b.onclick=()=>{memoAll=!memoAll;renderMemo();};
 try{memoGw(show);}catch(e){}}
// ---- lineage (สายตระกูล): every life is appended to its line; apprentices continue the line, rebirth starts a new one ----
const LKEY='tof-lineage-v1';
function loadLin(){try{const v=JSON.parse(localStorage.getItem(LKEY)||'null');if(isObj(v)&&isArr(v.lines))return{v:1,lines:v.lines.filter(x=>isObj(x)&&isArr(x.lives))};}catch(e){}return{v:1,lines:[]};}
function saveLin(L){for(let n=L.lines.length;n>=1;n=Math.floor(n*.7)){try{localStorage.setItem(LKEY,JSON.stringify({v:1,lines:L.lines.slice(0,n)}));return;}catch(e){}}}
const newLinId=()=>'L'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);
// ---- dragon family (v2.1): mark, curse counter, unhatched egg, family pet, hidden-class unlock; one per player, survives rebirth ----
// v2.5: karma classes unlocked for later births ({nec:1, ang:1})
const UKEY='tof-unlock-v1';
function loadUnl(){try{const v=JSON.parse(localStorage.getItem(UKEY)||'null');return v&&typeof v==='object'?v:{};}catch(e){return{};}}
function unlApply(R){const U=loadUnl(),t=R.turned?cid(R):'';let ch=0;
 if(t==='nec'&&!U.nec){U.nec=1;ch=1;R.unl='nec';}
 if(t==='ang'&&!U.ang){U.ang=1;ch=1;R.unl=R.unl||'ang';}
 if(ch)try{localStorage.setItem(UKEY,JSON.stringify(U));}catch(e){}}
const CKEY='tof-clan-v1',CLAN_T={f:'ตระกูลสหายมังกร',s:'ตระกูลนักล่ามังกร',d:'ตระกูลดยุกปราบมังกร'},EGGP={k:'drk',s:'drs',g:'drg'};
const clan0=()=>({v:1,m:'',n:0,egg:'',pet:'',cls:0,fresh:'',log:[],g2:1,g3:1});
// g2: saves from before v0.2.14 that already carry a mark get every mark at once (they could not switch before)
function loadClan(){try{const v=JSON.parse(localStorage.getItem(CKEY)||'null');if(isObj(v)){const C=Object.assign(clan0(),v);if(!v.g2){if(['f','s','d'].includes(C.m))C.got='fsd';saveClan(C);}
 // g3: same deal for family pets (v0.2.15): a family with a mark gets all three dragon hatchlings
 if(!v.g3){C.g3=1;if(['f','s','d'].includes(C.m))C.pg=[...new Set([...clanPets(C),...Object.values(EGGP)])].join(',');saveClan(C);}return C;}}catch(e){}return clan0();}
function saveClan(C){try{localStorage.setItem(CKEY,JSON.stringify(C));}catch(e){}}
// birth: an egg brought back from the secret floor hatches (once) into the family pet
function clanBirth(){const C=loadClan();if(C.egg){const c=C.egg;C.pet=Math.random()<.6?EGGP[c]||'drk':pick(PETK);C.fresh=c;C.egg='';C.pg=clanPets(C).join(',');saveClan(C);}return C;}
// marks this player has earned at least once (C.got, filled in from C.m for saves made before it existed); d implies s was held
const clanGot=C=>{const g=String(C.got||'')+(C.m||'')+(C.m==='d'?'s':'');return['f','s','d'].filter(x=>g.includes(x));};
// family pets this player has hatched (C.pg, plus the current C.pet for older saves)
const clanPets=C=>[...new Set([...String(C.pg||'').split(','),C.pet||''])].filter(p=>PETS[p]);
const clanOf=C=>({m:['f','s','d'].includes(C.m)?C.m:'',n:clamp(C.n|0,0,2),pet:PETS[C.pet]?C.pet:''});
function clanApply(R){const C=loadClan(),X=R.sec||{};let m=C.m;
 if(m==='s'){if(R.lift){m='d';C.n=0;}else C.n=clamp((C.n|0)+(R.dk|0),0,2);}
 if(X.win){C.egg=DRG[X.c]?X.c:'k';if(X.way===1){C.cls=1;if(X.m0!=='s'){m='s';C.n=0;}}else if(X.m0!=='s')m='f';}
 if(m!==C.m||X.win||R.dk){C.m=m;C.got=clanGot(C).join('');C.log=[...(isArr(C.log)?C.log:[]).slice(-19),{t:Date.now(),name:R.h.name,r:X.res||'',lift:R.lift?1:0}];saveClan(C);}
 R.clanM=m;R.clanN=C.n|0;}
const clanLine=(m,n)=>m==='f'?'มอนสเตอร์เผ่ามังกรตัวเล็กจะไม่ทำร้ายคนในตระกูล บอสมังกรก็ออมมือให้':m==='s'?`คำสาปติดตัวมาแต่เกิด มอนสเตอร์เผ่ามังกรดุขึ้น 25% จะคลายเมื่อคนในตระกูลล้มมังกรครบ 3 ตัว (ตอนนี้ ${n}/3)`:m==='d'?'คำสาปคลายไปแล้ว แต่คนยังเรียกตระกูลนี้ด้วยชื่อนั้น':'';
function addLife(R){const h=R.h,L=loadLin();if(!h.lin){h.lin=newLinId();h.house=h.house||h.name;h.gen=h.gen||1;}
 let ln=L.lines.find(x=>x.id===h.lin);if(ln)L.lines.splice(L.lines.indexOf(ln),1);else ln={id:h.lin,house:h.house||h.name,lives:[],prev:h.prev||null};L.lines.unshift(ln);
 if(!ln.lives.some(x=>x.run===S.runId))ln.lives.push({gen:h.gen||1,name:h.name,rank:h.rank,cls:CLASSES[h.cls].n,floor:R.won?100:R.floor,won:R.won,karma:R.karma,run:S.runId,t:Date.now(),d:R.sec&&R.sec.res||''});
 saveLin(L);}
function renderLineage(){const el=$('lineage');if(!el||!S)return;const L=loadLin(),h=S.R?S.R.h:S.hero,cur=h&&L.lines.find(x=>x.id===h.lin);
 const life=x=>`<span class="lv"><span class="px" style="color:${RANKS[x.rank]?RANKS[x.rank].col:'#fff'}">${esc(RANKS[x.rank]?RANKS[x.rank].k:'?')}</span> รุ่นที่ ${x.gen} ${esc(x.name)} · ${x.won?'👑 ':''}ชั้น ${x.floor}${x.d==='f'?' 🐉':x.d==='s'?' ⚔':''}</span>`;
 const alive=S.phase!=='end'&&h?`<span class="lv now"><span class="px" style="color:${RANKS[h.rank].col}">${RANKS[h.rank].k}</span> รุ่นที่ ${h.gen||1} ${esc(h.name)} · ${S.R?`กำลังไต่ ชั้น ${S.R.floor}`:'เพิ่งเกิด'}</span>`:'';
 let html='';
 if(cur||h){const lives=cur?cur.lives.slice(-8):[];const CM=loadClan().m;html+=`<div class="linehd">สาย${esc((cur&&cur.house)||(h&&h.house)||h.name)}${CLAN_T[CM]?` · <span data-tip="clan">${CLAN_T[CM]}</span>`:''}${cur&&cur.lives.length>8?` <span class="dim">(แสดง 8 รุ่นล่าสุดจาก ${cur.lives.length})</span>`:''}</div><div class="chain">${[...lives.map(life),alive].filter(Boolean).join('<span class="ar">→</span>')}</div>`;}
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
 if(!S.R)return;if(secOpen(S.R)){try{localStorage.setItem(SAVEK,JSON.stringify({v:SAVE_V,t:Date.now(),phase:'secret',runId:S.runId,t0:S.t0||0,hero:S.hero,R:S.R,frame:S.frame}));}catch(e){}return;}
 if(!S.R.alive||S.R.won){finalizeRun();return;}if(!['flow','decide','combat'].includes(S.phase))return;
 try{localStorage.setItem(SAVEK,JSON.stringify({v:SAVE_V,t:Date.now(),phase:S.phase,paused:!!S.paused,runId:S.runId,t0:S.t0||0,hero:S.hero,R:S.R,K:S.phase==='decide'?S.K:null,frame:S.frame}));}catch(e){}}
// the run is over: write the memorial once and drop the save
function finalizeRun(){if(!S||!S.R||S.fin)return;S.fin=1;const R=S.R,h=R.h,fl=R.won?100:R.floor;
 try{addLife(R);S.hero.lin=h.lin;S.hero.house=h.house;S.hero.gen=h.gen;}catch(e){}
 try{clanApply(R);}catch(e){}
 try{unlApply(R);}catch(e){}
 let pt=null;try{pt=fatePattern(R);}catch(e){}
 saveMemo(Object.assign({name:h.name,rank:h.rank,cls:CLASSES[h.cls].n,pth:pathHiName(R)||undefined,floor:fl,won:R.won,cause:R.won&&!(R.sec&&R.sec.res==='x')?'พิชิตยอดหอคอย':R.cause,lv:h.lv,gen:h.gen||1,t:Date.now()},pt?{pat:pt.code,patN:pt.n}:{},R.sec&&R.sec.res&&R.sec.res!=='n'?{drg:R.sec.res}:{}));clearSave();poolAdd(R);poolSave();}
const isArr=Array.isArray,isObj=o=>!!o&&typeof o==='object'&&!isArr(o);
// heroes from older saves have no lineage yet: they become generation 1 of their own line
function linFix(h){if(!h)return;if(!(h.gen>=1))h.gen=1;if(!h.house)h.house=h.name;if(!h.lin)h.lin=newLinId();}
function resumeRun(){let d=null;try{d=JSON.parse(localStorage.getItem(SAVEK)||'null');}catch(e){d=null;}
 // legacy birth-only save from the earlier hotfix ('tof-auto-birth-v1')
 if(!d){try{const b=JSON.parse(localStorage.getItem('tof-auto-birth-v1')||'null');localStorage.removeItem('tof-auto-birth-v1');if(b&&isObj(b.hero))d={v:SAVE_V,phase:'birth',hero:b.hero,rerolled:!!b.rerolled};}catch(e){}}
 if(!d)return false;
 const okV=d.v===1||d.v===SAVE_V;
 try{if(okV&&d.phase==='birth'&&isObj(d.hero)){const hero=Object.assign(rollHero(),d.hero);if(!CLASSES[hero.cls]||!RANKS[hero.rank]||!PERS[hero.pers]||!hero.name)throw 0;
   if(hero.look&&hero.look.form)rollHero.form=hero.look.form;linFix(hero);if(!hero.day){const dk=dayKey(),D=dayPick(dk);if(D)hero.day={d:dk,t:D.id};}
   S={phase:'birth',hero,rerolled:!!d.rerolled,bo:isObj(d.bo)?d.bo:null,rvDone:true,R:null,K:null,cb:null,cmp:null,saved:false,runId:0,speed:loadSpeed(),paused:false,tm:0,frame:null};snap=null;VIS.coins=[];VIS.show=null;S.themeId=heroTheme(hero);render();return true;}
  const sec=d.phase==='secret'&&isObj(d.R)&&d.R.won&&isObj(d.R.sec)&&['ask','talk','choose','res'].includes(d.R.sec.st)&&!!DRG[d.R.sec.c];
  if(!okV||!isObj(d.R)||!isObj(d.hero)||(!sec&&(!d.R.alive||d.R.won)))throw 0;
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
  ['rolled','hzP','fateShift','mLog','mN','pMax','pMaxF','lastP','scars','cursed','keys','timeouts','sameN','plainN','sinceKey','keyGap','stCh','gIn','path','pathHi','kl','pathQ'].forEach(x=>{if(typeof R[x]!=='number'||!isFinite(R[x]))R[x]=x==='hzP'?1:x==='keyGap'?5:0;});
  S={phase:'flow',hero,rerolled:true,R,K:null,cb:null,cmp:null,saved:false,runId:d.runId||Date.now(),t0:+d.t0||Date.now(),speed:loadSpeed(),paused:!!d.paused,tm:0,
   frame:isObj(d.frame)&&isArr(d.frame.msgs)?d.frame:{f:R.floor,tag:`ชั้น ${R.floor}`,title:'',text:'',msgs:[]}};
  snap=null;VIS.coins=[];VIS.show=S.frame.vis||null;VIS.walk0=performance.now();
  if(isObj(R.net)&&typeof R.net.sid==='string')setTimeout(liveBeat,1500);else R.net=null;
  S.themeId=heroTheme(R.h);if(!R.theme)R.theme=S.themeId;const lead={t:'กลับมาเดินต่อจากที่ค้างไว้',c:'lv'};R.log.unshift({f:R.floor,t:lead.t,c:lead.c});
  if(sec){S.phase='secret';render();return true;}
  const K=d.K,okK=d.phase==='decide'&&isObj(K)&&isArr(K.ch)&&K.ch.length&&(['boss','ev','pet','comp','omen','arc','shop'].includes(K.type)||SPECIAL[K.type])&&(K.type!=='arc'||R.arcs[K.arc]);
  if(okK){if(!(K.pick>=0&&K.ch[K.pick]&&!K.ch[K.pick].dis))K.pick=K.ai||0;openKey(K);return true;}
  // flow or mid-combat (the combat result is already in R): replay the current floor story from the start
  S.frame=Object.assign({},S.frame,{msgs:[lead,...S.frame.msgs]});render();
  if(S.paused){S.tmDur=floorMs();S.pauseLeft=floorMs();S.tmAt=performance.now()+floorMs();render();}else schedule(floorMs());
  return true;}catch(e){clearSave();S=null;return false;}}
// ---- card ----
const card=$('card');
// choice preview chips carry data-tip keys so tips.js can attach tooltips
const CHIPK=[[/กรรมชั่ว/,'karma_bad'],[/กรรมดี/,'karma_good'],[/แผลเป็น/,'scar'],[/โอกาสตาย|ตาย|อายุขัย|อายุอาจ|เสี่ยง/,'death_risk'],[/ชะตา/,'fate'],[/วาร์ป/,'warp'],
 [new RegExp('(^|[^฀-๿])ยา([^฀-๿]|$)'),'potion'],[/สัตว์เลี้ยง/,'pet'],[/เพื่อน|ทีม|ร่วมทาง|ปลด|ทหารรับจ้าง|^พลัง d/,'comp'],
 [/EXP/,'exp'],[/ATK/,'atk'],[/DEF/,'def'],[/LUK/,'luk'],[/HP/,'hp'],[/ทอง/,'gold']];
function chipKey(p){const t=String(p.t||'');if(p.c==='pt')return'path';if(p.c==='kk')return /ชั่ว/.test(t)?'karma_bad':'karma_good';for(const [re,k] of CHIPK)if(re.test(t))return k;return'';}
function partsHTML(P){return P.map(p=>{const k=chipKey(p);return`<span class="${p.c||''}"${k?` data-tip="${k}"`:''}>${esc(p.t)}</span>`;}).join(' ');}
const actQ=sel=>card.querySelector(sel)||(S&&S.phase==='end'&&!$('sceneActs').hidden?$('sceneActs').querySelector(sel):null);
const inActs=el=>card.contains(el)||$('sceneActs').contains(el);
function focusPrimary(){const b=actQ('[data-enter]')||card.querySelector('button:not(:disabled)');if(b&&document.activeElement&&document.activeElement!==document.body&&!inActs(document.activeElement))return;if(b)try{b.focus({preventScroll:true});}catch(e){}}
function render(){if(S.phase!=='decide')card.classList.remove('legend');$('formBox').hidden=S.phase!=='birth';if(S.phase!=='end')$('sceneActs').hidden=true;renderHUD();renderParty();renderLog();renderCtl();renderLineage();saveRun();
 const ph=S.phase;
 if(ph==='birth')renderBirth();else if(ph==='flow'){renderFlow();revealArm();}else if(ph==='decide')renderDecide();else if(ph==='combat')renderCombat();else if(ph==='dying')renderDying();else if(ph==='end')renderEnd();else if(ph==='secret')renderSecret();
 if(ph!=='end')endBar(false);try{window.SHARE&&window.SHARE.onPhase&&window.SHARE.onPhase(ph);}catch(e){}
 if(ph!=='flow')focusPrimary();}
function renderCtl(){const on=S.phase==='flow'||S.phase==='decide'||S.phase==='combat';$('ctl').hidden=!on;if(!on){renderStance();return;}
 const p=$('btnPause');p.textContent=S.paused?'▶ เดินต่อ':'⏸ หยุด';p.setAttribute('aria-pressed',S.paused?'true':'false');
 document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.speed===S.speed?'true':'false'));
 const dt=$('btnDT');if(dt){dt.textContent=dTime?`⏱ ${dTime} วิ`:'⏱ ไม่จับเวลา';dt.setAttribute('aria-pressed',dTime?'true':'false');}
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
function renderBirth(){const h=S.hero,C=CLASSES[h.cls],Rk=RANKS[h.rank],O=omenOf(h),DT=dayOf(h),LI=lookInfo(h),mx=30,an=!S.rvDone&&!RM;
 if(!S.themeId||S.themeHero!==h){S.themeHero=h;S.themeId=heroTheme(h);}
 const D=i=>an?` style="--d:${i*350}ms"`:'';
 const bars=RANKS.map((r,i)=>`<div class="col ${i===h.rank?'me':''}">${i===h.rank?'<span class="me-tag">คุณ</span>':''}<div class="bar" style="height:${Math.max(3,r.w/mx*100)}%"></div></div>`).join('');
 const I=h.inh,lin=h.master?`<div class="vil" data-tip="lineage">รุ่นที่ ${h.gen} แห่งสาย${esc(h.house)} · ศิษย์ของ${esc(h.master)}</div>`:`<div class="vil" data-tip="gen">รุ่นที่ ${h.gen||1} แห่งสาย${esc(h.house||h.name)}${h.prev?` · ว่ากันว่าเป็น${esc(h.prev.name)}กลับชาติมาเกิด`:''}</div>`;
 const inh=I?`<div class="inhbox rv"${D(5)} data-tip="lineage">มรดกจากอาจารย์${esc(I.from)}: ทอง +${fmt(I.gold)}${I.pet&&PETS[I.pet]?` · ${esc(PETS[I.pet].n)}ตามมาด้วย`:''}${I.k>=2?' · บุญของอาจารย์คุ้มครอง (LUK +2 ความเสี่ยงตายลดลงเล็กน้อย)':I.k<=-2?' · หนี้กรรมของอาจารย์ตามมาด้วย (ความเสี่ยงตายสูงขึ้นเล็กน้อย)':''}</div>`:'';
 const CL=h.clan||{},CC=loadClan(),CF=CC.fresh,cp=CL.pet&&PETS[CL.pet];
 // the family may go by any mark it has earned; the pet can stay home for this life
 const cOpt=(v,t,on)=>`<option value="${v}"${on?' selected':''}>${t}</option>`,cGot=clanGot(CC),cPets=clanPets(CC);
 const cAct=[cGot.length>1?`<label class="csel">ชื่อตระกูล <select id="selClanM">${cGot.map(x=>cOpt(x,CLAN_T[x],x===CL.m)).join('')}</select></label>`:'',
  cp?`<label class="csel">สัตว์ประจำตระกูล <select id="selClanPet">${cPets.map(p=>cOpt(p,esc(PETS[p].n),!h.petHome&&p===CL.pet)).join('')}${cOpt('home','ฝากไว้ที่บ้าน',!!h.petHome)}</select></label>`:''].join('');
 const clanH=CL.m||cp||C.id==='dsl'?`<div class="inhbox clanbox rv"${D(5)}>${CL.m?`<span data-tip="clan"><b>${CLAN_T[CL.m]}</b></span> · ${esc(clanLine(CL.m,CL.n))}`:''}${cp?`${CL.m?'<br>':''}<span data-tip="clanpet">${CF?`ไข่มังกร${esc(DRG[CF]?DRG[CF].n.replace('มังกร',''):'')}ที่คนในตระกูลเก็บกลับมาฟักแล้ว ได้${esc(cp.n)}เป็นสัตว์ประจำตระกูล`:h.petHome?`${esc(cp.n)} สัตว์ประจำตระกูล ชาตินี้ฝากไว้ที่บ้าน`:`${esc(cp.n)} สัตว์ประจำตระกูล เดินตามมาด้วย`} (${esc(cp.d)})</span>`:''}${C.id==='dsl'?`${CL.m||cp?'<br>':''}<span data-tip="dsl">เกิดมาเป็นนักล่ามังกร อาชีพลับที่เกิดได้เฉพาะในตระกูลที่เคยฆ่ามังกร</span>`:''}${cAct.trim()?`<div class="clanacts">${cAct}</div>`:''}</div>`:'';
 const excH=h.ex&&h.ex.got?`<div class="inhbox clanbox rv"${D(5)}><span data-tip="excal"><b>🗡 ดาบศักดิ์สิทธิ์ในหิน</b></span> · ติดตัวมาตั้งแต่เกิด (ATK +10% · ตีบอสแรงขึ้น 10%)</div>`:'';
 card.innerHTML=`<div class="cert${an?' anim':''}"><div class="hd">✦ ใบประกาศนักผจญภัย ✦</div><div class="nm">${esc(h.name)}</div><div class="vil">ถิ่นกำเนิด: ${esc(h.village)}</div>${lin}
 <div class="tiles"><div class="tile rv"${D(0)}><span class="tl">แรงค์</span><span class="rk" style="background:${Rk.col}">RANK ${Rk.k}</span><span class="tp px">${Rk.w}%</span></div>
  <div class="tile rv"${D(1)}><span class="tl">อาชีพ</span><span class="cls">${C.n}</span><span class="tp px">${((h.cp||C.w/CLS_SUM)*100).toFixed(1)}%</span></div>
  <div class="tile rv"${D(2)} data-tip="look"><span class="tl">หน้าตา</span><b>${esc(LI.n)}</b><span class="tp px">1 ใน ${fmt(1/LI.p)}</span></div></div>
 <div class="rv"${D(0)}><div class="rchart" aria-label="การกระจายแรงค์">${bars}</div><div class="rlab">${RANKS.map(r=>`<span>${r.k}</span>`).join('')}</div></div>
 <div class="pas rv"${D(1)}>สกิลติดตัว <b>${C.p}</b> · ${C.pd}</div>
 <div class="cstats rv"${D(3)}><div>HP<b>${Math.round(h.mhp)}</b></div><div>ATK<b>${Math.round(h.atk)}</b></div><div>DEF<b>${Math.round(h.def)}</b></div><div>LUK<b>${Math.round(h.luk)}</b></div><div>MP<b>${Math.round(h.mmp)}</b></div><div>ทอง<b>${fmt(h.gold)}</b></div></div>
 <div class="odds big rv"${D(4)} data-tip="combo">ฮีโร่แบบคุณ: <b>1 ใน ${fmt(combOdds(h))}</b><span class="sm">แรงค์กับอาชีพ 1 ใน ${fmt(h.odds)} · หน้าตา 1 ใน ${fmt(1/LI.p)}</span></div>
 ${inh}${clanH}${excH}<div class="rv"${D(5)}><div class="fatebox">ดวงชะตา: <b>${esc(HINTS[h.hint])}</b></div>
 <div class="pas" style="margin-top:6px">นิสัย: <b>${esc(PERS[h.pers].n)}</b> · ${esc(PERS[h.pers].d)}</div>
 <div class="omenbox ${O.k==='พร'?'bless':O.k==='คำสาป'?'curse':'mix'}"><span class="ok">${O.k==='ผสม'?'พรปนคำสาป':O.k}ประจำชาตินี้</span> <b>${esc(O.n)}</b><br>${esc(O.d)}</div>${DT?`<div class="daybox" data-tip="day"><span class="ok">หัวข้อวันนี้</span> <b>${esc(DT.n)}</b><br>${esc(DT.d)}</div>`:''}</div></div>
 <div class="livebox" id="liveBox"${S.liveHTML?'':' hidden'}>${S.liveHTML||''}</div>
 <p class="dim" style="font-size:13px;margin:10px 0 0">ในโหมดนี้ชีวิตเดินไปเอง คุณได้ตัดสินใจเฉพาะตอนสำคัญ ${dTime?`มีเวลาคิด ${dTime} วินาที ถ้าไม่เลือก ฮีโร่จะเลือกเองตามนิสัย (ปิดการจับเวลาได้ที่ปุ่ม ⏱ ข้างปุ่มความเร็ว)`:'คิดได้นานเท่าที่อยาก ถ้าอยากให้นับถอยหลัง 30 วินาทีแล้วฮีโร่เลือกเองเมื่อหมดเวลา กดปุ่ม ⏱ ข้างปุ่มความเร็ว'} ทุกชั้นชะตาจะทอยว่าคุณรอดไหม โอกาสขึ้นอยู่กับ HP ที่เหลือ แผลเป็น กรรม คำสาป เพื่อนร่วมทาง และท่าทีที่คุณเลือก</p>
 <div class="nmset"><label for="inName">ตั้งชื่อเอง</label><input id="inName" type="text" maxlength="${NAME_MAX}" autocomplete="off" spellcheck="false" placeholder="${esc(h.name0||h.name)}" value="${h.cname?esc(h.name):''}"><span class="hint">ปล่อยว่างไว้ก็ใช้ชื่อที่สุ่มมา</span></div>
 <div class="acts"><button class="btn" id="btnReroll" data-k="1" ${S.rerolled?'disabled':''}>สุ่มแรงค์/อาชีพใหม่ ${S.rerolled?'(ใช้ไปแล้ว)':'(เหลือ 1 ครั้ง)'}<span class="kb">[1]</span></button>
 <button class="btn" id="btnLook" data-k="3" type="button">🎲 สุ่มหน้าตาใหม่<span class="kb">[3]</span></button>
 <button class="btn pri" id="btnEnter" data-k="2" data-enter>เข้าหอ ▲<span class="kb">[Enter]</span></button></div>
 <p class="lookn">สุ่มหน้าตาได้ไม่จำกัด แรงค์ อาชีพ และนิสัยยังเหมือนเดิม</p>${birthExtras(h)}`;
 if(!S.rvDone){S.rvDone=true;
  if(RM)sting('birth');else{if(h.rank>=5)VIS.star=performance.now()+1400;clearTimeout(S.rvT);S.rvT=setTimeout(()=>{if(S.phase==='birth')sting('birth');},1400);}}
 const fb=$('formBox');fb.innerHTML=[['slime','สไลม์'],['human','คน']].map(([f,n])=>`<button class="btn${look(h).form===f?' on':''}" type="button" data-form="${f}" aria-pressed="${look(h).form===f}">ร่าง: ${n}</button>`).join('');
 fb.querySelectorAll('[data-form]').forEach(b=>b.onclick=()=>{const f=b.dataset.form;rollHero.form=f;S.hero.look=Object.assign({},look(S.hero),{form:f});S.themeId=heroTheme(S.hero);render();});
 // full re-roll (once): rank/class/omen/name; a custom name typed by the player is carried over
 $('btnReroll').onclick=()=>{if(S.rerolled)return;S.rerolled=true;const old=S.hero;unlivedAdd(old);S.hero=rollBirth(S.bo);if(old.cname)setName(S.hero,old.name);if(old.petHome)S.hero.petHome=1;S.rvDone=false;VIS.star=0;render();};
 // appearance only, unlimited: new look seed in the same form; rank/class/personality/omen stay
 $('btnLook').onclick=()=>{const h2=S.hero;h2.look=window.ART.rollLook(look(h2).form);S.themeId=heroTheme(h2);render();};
 const inp=$('inName');inp.addEventListener('input',()=>{setName(S.hero,inp.value);const nm=card.querySelector('.cert .nm');if(nm)nm.textContent=S.hero.name;renderHUD();renderParty();saveRun();});
 inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();inp.blur();}});
 inp.addEventListener('change',()=>{if(cleanName(inp.value)!==inp.value)inp.value=S.hero.cname?S.hero.name:'';});
 $('btnEnter').onclick=startRun;liveBox();
 // family pet stays home for this life only (lets the no-pet win stay reachable)
 const sm=$('selClanM');if(sm)sm.onchange=()=>{const C=loadClan(),m=sm.value;if(!clanGot(C).includes(m)||m===C.m)return;C.got=clanGot(C).join('');C.m=m;saveClan(C);S.hero.clan=clanOf(C);ach('clan',{m});render();saveRun();};
 // pet picker: a hatched pet becomes the family pet for good; "home" leaves it behind for this life only
 const sp=$('selClanPet');if(sp)sp.onchange=()=>{const h2=S.hero,p=sp.value;if(p==='home')h2.petHome=1;else{delete h2.petHome;const C=loadClan();if(clanPets(C).includes(p)&&p!==C.pet){C.pg=clanPets(C).join(',');C.pet=p;saveClan(C);h2.clan=clanOf(C);ach('clanpet',{p});}}render();saveRun();};
 const bu=$('btnUnl');if(bu)bu.onclick=()=>{S.unlOpen=!S.unlOpen;const pn=$('unlPanel');if(pn)pn.hidden=!S.unlOpen;bu.setAttribute('aria-expanded',S.unlOpen?'true':'false');};
 const bs=$('btnShareBirth');if(bs)bs.onclick=()=>{try{window.SHARE.openBirth(birthShareData(S.hero));}catch(e){}};}
// ---- unlived lives (v2.3): heroes thrown away with the one-time re-roll; total count n only grows, list capped at 60 ----
const UNL_K='tof-unlived-v1',UNL_MAX=60;
// null = storage unreadable or the stored value is not ours: never overwrite it then
function unlivedLoad(){let raw=null;try{raw=localStorage.getItem(UNL_K);}catch(e){return null;}if(raw==null)return{v:1,n:0,list:[]};
 try{const d=JSON.parse(raw);if(isObj(d)&&isArr(d.list)){const list=d.list.filter(isObj);return{v:1,n:Math.max(+d.n||0,list.length),list};}}catch(e){}return null;}
function unlivedAdd(h){try{const d=unlivedLoad();if(!d||!h)return;const C=CLASSES[h.cls]||{},Rk=RANKS[h.rank]||{};
 d.list.unshift({name:h.name,rank:Rk.k||'',ri:h.rank|0,cls:C.id||'',cn:C.n||'',odds:combOdds(h),village:h.village||'',t:Date.now()});d.n++;if(d.list.length>UNL_MAX)d.list.length=UNL_MAX;
 localStorage.setItem(UNL_K,JSON.stringify(d));}catch(e){}}
function birthExtras(h){const d=unlivedLoad(),sh=!!(window.SHARE&&window.SHARE.openBirth);let u='';
 if(d&&d.n>0){const st=Math.min(15,d.n),rows=[];let left=st;for(let r=5;r>0&&left>0;r--){const k=Math.min(r,left);rows.push(k);left-=k;}
  const pile=`<span class="pile" aria-hidden="true">${rows.map(k=>`<span>${'<i></i>'.repeat(k)}</span>`).join('')}</span>`;
  const dt=t=>{try{return new Date(t).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});}catch(e){return'';}};
  const li=d.list.map(x=>{const Rk=RANKS[x.ri]||RANKS.find(r=>r.k===x.rank)||{col:'#666'};return`<li><span class="rk" style="background:${Rk.col}">${esc(x.rank||'?')}</span><span>${esc(x.name||'ไม่มีชื่อ')} · ${esc(x.cn||'')}<br><span class="x">1 ใน ${fmt(x.odds||1)}${x.village?` · ${esc(x.village)}`:''}</span></span><span class="x">${esc(dt(x.t))}</span></li>`;}).join('');
  u=`<div class="unl"><button type="button" class="unlb" id="btnUnl" aria-expanded="${S.unlOpen?'true':'false'}" aria-controls="unlPanel">${pile}<span>ชะตาที่ไม่ได้ไปต่อ <b class="px">${fmt(d.n)}</b></span></button>
  <div class="unlp" id="unlPanel"${S.unlOpen?'':' hidden'}><p class="dim">ฮีโร่ที่คุณสุ่มทิ้งตอนเกิด ไม่มีใครรู้ว่าถ้าได้เข้าหอ พวกเขาจะไปได้ถึงชั้นไหน</p><ol>${li}</ol>${d.n>d.list.length?`<p class="dim">เก่ากว่านี้อีก ${fmt(d.n-d.list.length)} คน จำได้แค่ว่าเคยมีอยู่</p>`:''}</div></div>`;}
 return(sh?`<div class="acts bshare"><button type="button" class="btn bsh" id="btnShareBirth">📤 แชร์ฮีโร่ตัวนี้</button></div>`:'')+u;}
function birthShareData(h){const C=CLASSES[h.cls],Rk=RANKS[h.rank],O=omenOf(h),DT=dayOf(h),lk=look(h);
 return{name:h.name,village:h.village,rankK:Rk.k,rankIdx:h.rank,rankCol:Rk.col,clsId:C.id,clsN:C.n,odds:combOdds(h),clsOdds:h.odds,look:lk,form:lk.form,lookName:lookInfo(h).n,
  omenN:O.n,omenK:O.k,dayN:DT?DT.n:'',gen:h.gen||1,house:h.house||h.name,sw:!!(h.ex&&h.ex.got),date:Date.now()};}
// player-typed hero name: no control chars or HTML-ish characters, single spaces, at most NAME_MAX characters; empty = the rolled name
const NAME_MAX=16;
const cleanName=v=>Array.from(String(v||'').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e<>&"'`\\]/g,'').replace(/\s+/g,' ').trim()).slice(0,NAME_MAX).join('').trim();
function setName(h,v){const n=cleanName(v);if(!h.name0)h.name0=h.name;const own=!h.master&&(h.house===h.name||!h.house);
 h.name=n||h.name0;h.cname=n?1:0;if(own)h.house=h.name;}
// a new hero: fresh line (gen 1), apprentice of a finished life (bo.heir), or a rebirth whose past karma tilts the rank roll (bo.kShift)
// sword in the stone: what this player's line has done so far (tries, pulled), copied onto the hero at birth
function excBirth(){const v=excLoad()||{};return{n:Math.max(0,Math.floor(+v.n||0)),got:v.got?1:0};}
function rollBirth(bo){let h;const C=clanBirth();
 if(bo&&isObj(bo.heir)){const P=bo.heir;h=rollHero({dsl:C.cls,unl:loadUnl()});h.village=P.village||h.village;h.gen=(P.gen||1)+1;h.lin=P.lin;h.house=P.house||P.name;h.master=P.name;
  const k=clamp(Math.round((P.karma||0)*.25),-6,6),g=Math.min(600,Math.round((P.gold||0)*.3));h.inh={gold:g,pet:P.pet&&PETS[P.pet]?P.pet:null,k,from:P.name};h.gold+=g;if(k>=2)h.luk+=2;
  h.m0=birthM(h);h.proj=project(1,h.m0).med;h.hint=fuzzHint(h.proj);}
 else{h=rollHero({kShift:bo?bo.kShift:0,dsl:C.cls,unl:loadUnl()});h.gen=1;h.lin=newLinId();h.house=h.name;if(bo&&isObj(bo.prev))h.prev=bo.prev;}
 h.clan=clanOf(C);h.ex=excBirth();{const d=dayKey(),D=dayPick(d);if(D)h.day={d,t:D.id};}return h;}
function startRun(){clearTimeout(S.rvT);VIS.star=0;if(!S.hero.ex)S.hero.ex=excBirth();S.R=newRun(S.hero);const R=S.R;R.xseen=loadSeen();S.runId=Date.now();S.t0=Date.now();snap=null;
 S.themeId=heroTheme(S.hero)||S.themeId||'';R.theme=S.themeId;
 // cohort: 3-4 heroes rolled the same way enter with you; their whole lives are simulated now with the same hazard table and AI
 R.coh=[];for(let i=0,n=ri(3,4);i<n;i++){const ch=rollHero();ch.day=S.hero.day;const L=autoLife(ch);poolAdd(L);R.coh.push({n:ch.name,rk:RANKS[ch.rank].k,cn:CLASSES[ch.cls].n,f:L.won?100:L.floor,won:L.won,cause:L.won?'พิชิตยอดหอคอย':L.cause,ck:L.ck||''});}
 const o=mkOut();say(R,o,`${S.hero.name} ก้าวเข้าสู่หอคอยโชคชะตา`,'lv');
 say(R,o,`เพื่อนรุ่นเดียวกันอีก ${R.coh.length} คนเข้าหอมาพร้อมคุณ: ${R.coh.map(c=>c.n).join(', ')}`,'info');
 if(R.pets.length&&S.hero.inh&&S.hero.inh.pet)say(R,o,`${PETS[R.pets[0]].n}ของอาจารย์${S.hero.inh.from}เดินตามเข้ามาด้วย`,'good');
 {const CL=S.hero.clan||{};if(CL.pet&&R.pets.includes(CL.pet))say(R,o,`${PETS[CL.pet].n} สัตว์ประจำตระกูล เดินตามเข้ามาด้วย`,'good');if(CL.m==='s')say(R,o,`คำสาปนักล่ามังกรติดตัวมาด้วย มอนสเตอร์เผ่ามังกรจะดุกว่าปกติ (ล้มมังกรไปแล้ว ${CL.n||0}/3)`,'bad');
  const C=loadClan();if(C.fresh){C.fresh='';saveClan(C);}}
 if(hasSw(R))say(R,o,'ดาบศักดิ์สิทธิ์ที่คนในชาติก่อนถอนออกจากหิน ห้อยอยู่ข้างเอวคุณมาตั้งแต่เกิด','good');
 {const DT=dayOf(S.hero);if(DT)say(R,o,`หัวข้อวันนี้: ${DT.n} · ${DT.d}`,'info');}
 R.net={sid:newSid()};liveStart(R);
 mileTick(R,o);
 S.frame={f:1,tag:'ชั้น 1 · ทางเข้า',title:'ประตูหอคอยเปิดออก',text:'บันไดหินวนขึ้นไปจนลับตา ไม่มีใครรู้ว่าตัวเองจะไปได้ถึงไหน',msgs:o.msgs};
 S.phase='flow';VIS.walk0=performance.now();VIS.show=null;music(0,1);render();if(o.mile)showMile(o.mile);ach('lineage',{gen:S.hero.gen||1});schedule(floorMs());}
const floorMs=()=>BASE_MS/S.speed;
// ---- daily theme + live presence (v2.2) ----
const dayKey=()=>new Date(Date.now()+7*3600e3).toISOString().slice(0,10); // Thai calendar day
const dayPick=d=>DAYS.length?DAYS[shash('tof-day|'+d)%DAYS.length]:null;
const newSid=()=>(Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-6)).replace(/[^a-z0-9]/g,'');
// the server hands out a run ticket at the start; only ticketed runs can reach the global top list. Silent no-op where /api/live is missing
// "playing now" is counted from tickets that have no score yet, so there is no heartbeat any more (it cost 1-3 D1 writes a run).
// A resumed run whose ticket request failed asks once more when it loads.
function liveStart(R){const L=window.LB&&window.LB.live;if(!L||!R.net)return;L.start(R.net.sid).then(j=>{if(j&&j.tk&&R.net)R.net.tk=j.tk;}).catch(()=>{});}
function liveBeat(){const L=window.LB&&window.LB.live,R=S&&S.R;if(!L||!R||!R.net||!R.alive||R.net.tk||!['flow','decide','combat'].includes(S.phase))return;liveStart(R);}
const agoT=ms=>ms<9e4?'เมื่อสักครู่':ms<36e5?`${Math.round(ms/6e4)} นาทีก่อน`:`${Math.round(ms/36e5)} ชั่วโมงก่อน`;
// birth screen: how many people are climbing right now + a rotating line about recent lives
function liveBox(){const L=window.LB&&window.LB.live;if(!L||S.liveAsk)return;S.liveAsk=1;const run=S;
 Promise.all([L.get(dayKey()),L.recent()]).then(([g,rec])=>{if(S!==run)return;const now=Date.now();
  const feed=(Array.isArray(rec)?rec:[]).filter(e=>e&&now-(e.at||e.date)<864e5).slice(0,8).map(e=>`${agoT(now-(e.at||e.date))} ${e.name} ${e.floor===101?'ผ่านชั้นลับเหนือยอดหอ':e.won?'พิชิตยอดหอคอย':`ล้มลงที่ชั้น ${e.floor}`}`);
  if(!g&&!feed.length)return;
  S.liveHTML=`${g?`<div>🔥 ${g.n?`ตอนนี้มี <b class="px">${fmt(g.n)}</b> คนกำลังไต่หอ`:'ตอนนี้ในหอยังเงียบ ยังไม่มีใครไต่อยู่'}${g.day&&g.day.n?` · วันนี้เข้าหอไปแล้ว ${fmt(g.day.n)} คน`:''}</div>`:''}${feed.length?`<div class="feed" id="liveFeed">${esc(feed[0])}</div>`:''}`;
  const box=$('liveBox');if(box){box.innerHTML=S.liveHTML;box.hidden=false;}
  clearInterval(S.feedI);let i=0;if(feed.length>1)S.feedI=setInterval(()=>{const f=$('liveFeed');if(S!==run||!f){clearInterval(run.feedI);return;}i=(i+1)%feed.length;f.textContent=feed[i];},4500);}).catch(()=>{});}
// tooltip/help pause: tips.js dispatches 'tof:pause' {on:true|false} (may nest). While >0 the decision countdown and the floor timer hold.
let tipPause=0;
function tipHold(){if(!S||tipPause<=0||S.phase!=='flow'||S.paused||!S.tmAt||S.tipHold)return;clearTimeout(S.tm);S.tipLeft=Math.max(0,S.tmAt-performance.now());S.tipHold=1;}
function tipFree(){if(!S||!S.tipHold)return;S.tipHold=0;if(S.phase!=='flow'||S.paused)return;const l=Math.max(150,S.tipLeft||0);S.tmAt=performance.now()+l;clearTimeout(S.tm);S.tm=setTimeout(tick,l);}
document.addEventListener('tof:pause',e=>{const on=!!(e.detail&&e.detail.on);tipPause=Math.max(0,tipPause+(on?1:-1));if(tipPause>0)tipHold();else tipFree();if(S&&S.phase==='decide')updCd();updNext();});
function schedule(ms){clearTimeout(S.tm);S.tipHold=0;S.tmAt=performance.now()+ms;S.tmDur=ms;S.tm=setTimeout(tick,ms);tipHold();revealArm();}
// speed change mid-floor: keep the fraction already shown, rescale what is left
function rescale(k){if(S.tipHold){S.tipLeft*=k;S.tmDur*=k;return;}if(S.phase!=='flow'||S.paused||!S.tmAt)return;const left=Math.max(200,(S.tmAt-performance.now())*k);clearTimeout(S.tm);S.tmDur*=k;S.tmAt=performance.now()+left;S.tm=setTimeout(tick,left);revealArm();}
// "next floor" countdown bar above the scene: flow phase only (decisions show their own bar), wall-clock based
function revealArm(){updNext();}
function updNext(){const box=$('nextBox');if(!box||!S)return;const on=S.phase==='flow'&&!!S.tmAt;box.hidden=!on;if(!on)return;
 const dur=Math.max(1,S.tmDur||1),left=S.paused?(S.pauseLeft||0):S.tipHold?(S.tipLeft||0):Math.max(0,S.tmAt-performance.now());
 $('nextBar').style.width=clamp(left/dur*100,0,100)+'%';$('nextTxt').textContent=`${S.paused?'หยุดอยู่ · ':''}ชั้นถัดไปใน ${(left/1000).toFixed(1)} วิ`;}
setInterval(updNext,100);
let fxT=[];function clearFx(){fxT.forEach(clearTimeout);fxT=[];VIS.q=[];VIS.mv={};VIS.stop=0;}
function evFrame(f,ev){const b=BIOMES[biome(f)];
 if(ev.kind==='mon')return{tag:`ชั้น ${f} · ${b} · มอนสเตอร์`,title:ev.en.n,text:'',vis:{t:'en',en:ev.en}};
 if(ev.kind==='ev'){const T=EVENTS[ev.ti];return{tag:`ชั้น ${f} · ${b} · เหตุการณ์`,title:evS(ev,T.t),text:evS(ev,T.x),vis:evVis(ev,T)};}
 if(ev.kind==='pet')return{tag:`ชั้น ${f} · ${b}`,title:PETS[ev.pet].n,text:PETS[ev.pet].x,vis:{t:'pet',p:ev.pet}};
 if(ev.kind==='comp')return{tag:`ชั้น ${f} · ${b}`,title:ev.comp.n,text:'',vis:{t:'comp',cls:ev.comp.cls,c:visC(ev.comp)}};
 return{tag:`ชั้น ${f}`,title:'',text:'',vis:null};}
// quick hit animation for auto-resolved fights (inside one floor tick)
function animFight(cb,dur){clearFx();if(RM||!cb||!cb.ev.length)return;const E=cb.ev,n=Math.min(8,E.length,Math.max(2,Math.floor(dur/110))),st=dur/(n+1),base=380/Math.max(1,S.speed>2?2:1);
 for(let k=0;k<n;k++){const i=Math.floor(k*(E.length-1)/Math.max(1,n-1)),e=E[i],pv=i>0?E[i-1].hp:cb.startHp,last=i===E.length-1;
  fxT.push(setTimeout(()=>fxEv(e,{en:cb.en,beat:st,prev:pv,last,win:cb.win,snd:k<4}),base+k*st));}
 if(cb.win)fxT.push(setTimeout(()=>{if(!VIS.edead)VIS.edead=performance.now();},base+n*st+450));}
function tick(){if(!S||S.phase!=='flow'||S.paused)return;const R=S.R,f=R.floor,g0=R.h.gold;clearFx();S.tmAt=0;VIS.edead=false;
 const P=planFloor(R);
 if(P.type==='death'){const p=R.lastP,out=deathTick(R);if(R.alive){R.rezFx=0;S.frame={f,tag:`ชั้น ${f} · ฟื้นคืนชีพ`,title:'แสงศักดิ์สิทธิ์',text:'',msgs:out.msgs};VIS.show=null;AUDIO.sfx('levelup');lvlFx();render();schedule(floorMs()*1.6);return;}S.frame={f,tag:`ชั้น ${f} · ชะตาขาด`,title:'ถึงฆาตแล้ว',text:R.cause,msgs:[{t:`ชะตาทอยที่ชั้นนี้ โอกาสตาย ${(p*100).toFixed(1)}%`,c:'lv'}]};VIS.show=out.vis;goDying();return;}
 if(P.type==='key'){openKey(P.K);return;}
 let out,fr,slow=1;
 if(P.type==='drama'){R.lastDramaId=P.D.id;out=dramaTick(R,P.D);AUDIO.sfx('boss');
  S.frame={f,tag:`ชั้น ${f} · ⚡ ชั้นพลิกผัน`,title:P.D.n,text:'',msgs:out.msgs,drama:1};if(out.mile)showMile(out.mile);S.pendCoins=Math.max(0,R.h.gold-g0);VIS.walk0=performance.now();
  if(out.combat){S.cb={en:out.combat.en,ev:out.combat.ev,i:0,hp:out.combat.startHp,mhp:out.combat.mhp,ehp:out.combat.en.mhp,lines:[],win:out.combat.win};VIS.show={t:'en',en:out.combat.en};S.phase='combat';render();playCombat();return;}
  VIS.show=P.D.vis||(P.D.id==='vault'?{t:'prop',pr:'chest'}:P.D.id==='meteor'?{t:'prop',pr:'star'}:null);if(out.shake)VIS.shake=performance.now()+700;afterKey();return;}
 if(P.type==='autokey'&&P.how){quickKey(P);return;}
 if(P.type==='autokey'){out=applyKey(R,P.K,P.K.ai,true);fr={tag:P.K.tag,title:P.K.type==='shop'?'ศาลพักใจ ⛩':P.K.title,text:P.K.type==='boss'?`เลือกเหมือนครั้งก่อน: "${P.K.ch[P.K.ai].t}"`:'',vis:P.K.vis};slow=1.3;
  if(P.K.type==='shop'){const inc=Math.max(3,(R.gIn||0)/Math.max(1,R.floor-1));fr.shop={inc,L:shopList(R).filter(x=>x.id!=='heal').map(x=>({n:x.n,cost:x.cost,ok:R.h.gold>=x.cost,miss:Math.ceil(x.cost-R.h.gold)}))};}}
 else if(P.type==='quiet'){out=quietTick(R,P.n);fr={tag:`ชั้น ${out.f0}–${out.f0+out.quietN-1} · ช่วงสงบ`,title:'ทางเดินเงียบสงบ',text:'',vis:out.vis||null,qb:out.qb};slow=1.6;}
 else if(P.type==='farm'){out=farmTick(R);fr={tag:`ชั้น ${f} · ตั้งหลัก`,title:'ฟาร์มเก็บเวล',text:'',vis:out.combat?{t:'en',en:out.combat.en}:null};}
 else{out=autoTick(R,P.ev);fr=evFrame(f,P.ev);}
 S.frame=Object.assign(fr,{f,msgs:out.msgs});VIS.show=fr.vis;VIS.walk0=performance.now();
 if(out.combat)animFight(out.combat,Math.min(floorMs()*.55,6000));
 const gd=R.h.gold-g0;if(gd>0&&!RM)setTimeout(()=>coinBurst(Math.max(3,Math.round(gd/8))),RM?0:420);
 if(P.ev&&P.ev.kind==='ev'&&evPr(EVENTS[P.ev.ti])==='chest')AUDIO.sfx('chest');if(R.floor>f+1)AUDIO.sfx('warp');
 music(biome(R.floor),R.floor);if(out.mile)showMile(out.mile);render();
 if(!R.alive){goDying();return;}
 schedule(floorMs()*slow);}
// time-skip panel: net gold and HP per skipped floor (red when negative)
function qbHTML(qb){if(!qb||qb.length<2)return'';const mg=Math.max(1,...qb.map(x=>Math.abs(x.g))),mh=Math.max(1,...qb.map(x=>Math.abs(x.hp)));
 const row=(k,m,lab)=>`<div class="qbr"><span class="ql">${lab}</span><div class="qbars">${qb.map(x=>{const v=x[k],hh=Math.max(2,Math.round(Math.abs(v)/m*18));const bar=`<i style="height:${hh}px"></i>`;return`<span title="ชั้น ${x.f}: ${v>=0?'+':''}${v}"><b class="up">${v>0?bar:''}</b><b class="dn">${v<0?bar:''}</b></span>`;}).join('')}</div></div>`;
 return`<div class="qb" aria-label="สรุปช่วงที่ข้ามไป">${row('g',mg,'ทอง')}${row('hp',mh,'HP')}<div class="qbf"><span>${qb[0].f}</span><span>${qb[qb.length-1].f}</span></div></div>`;}
function shopHTML(sh){if(!sh)return'';return`<div class="shopl">${sh.L.map(x=>x.ok?`<span class="ok">${esc(x.n)} <b class="px">${fmt(x.cost)}</b></span>`:`<span class="lk" data-tip="income">🔒 ${esc(x.n)} <b class="px">${fmt(x.cost)}</b>${x.miss>0?` ขาด ${fmt(x.miss)}`:''} ≈${Math.max(1,Math.round(x.cost/sh.inc))} ชั้นของรายได้</span>`).join('')}</div>`;}
function renderFlow(){const fr=S.frame||{msgs:[]};
 card.innerHTML=`<div class="tag${fr.drama?' drama':''}">${esc(fr.tag||'')}</div><h3>${esc(fr.title||'')}</h3>${fr.text?`<p>${esc(fr.text)}</p>`:''}${qbHTML(fr.qb)}${shopHTML(fr.shop)}
 <ul class="msgs">${fr.msgs.map(m=>`<li class="${m.c}">${esc(m.t)}</li>`).join('')||'<li class="dim">ชั้นนี้เงียบสงบ</li>'}</ul>
 <div class="flowst">${S.paused?'หยุดไว้ก่อน กด Space หรือปุ่ม ▶ เพื่อเดินต่อ':'ชะตากำลังพาเดินขึ้นไป…'}</div>`;}
// ---- key moments ----
let cdI=null;
function openKey(K){const R=S.R;S.K=K;S.phase='decide';S.decMs=decMs(K);S.left=S.decMs;VIS.show=K.vis;VIS.walk0=0;VIS.edead=false;
 music(biome(R.floor),R.floor);if(K.vis&&K.type!=='boss'&&K.vis.vr===undefined)K.vis.vr=shash(R.h.name+'|'+K.tid)%3;
 if(!sting(K.type==='boss'||K.rar==='l'?'boss':'key'))AUDIO.sfx(K.type==='boss'||K.rar==='l'?'boss':'levelup');render();
 // wall-clock countdown (a throttled background tab must not stretch the 30 s); decMs 0 = no timer
 clearInterval(cdI);S.cdLast=performance.now();cdI=setInterval(()=>{if(S.phase!=='decide'){clearInterval(cdI);return;}const now=performance.now(),dt=now-S.cdLast;S.cdLast=now;if(S.paused||tipPause>0||!S.decMs)return;S.left-=dt;updCd();if(S.left<=0){clearInterval(cdI);choose(S.K.pick,true);}},100);}
function updCd(){const b=$('cdBar'),t=$('cdTxt');if(!b)return;if(!S.decMs){b.style.width='100%';b.classList.remove('low');t.textContent='ไม่จับเวลา คิดได้เต็มที่';return;}const p=clamp(S.left/S.decMs,0,1);b.style.width=(p*100)+'%';b.classList.toggle('low',S.left<=3000);
 t.textContent=S.paused?'หยุดเวลาไว้':`เหลือเวลา ${Math.ceil(S.left/1000)} วินาที`;}
// why a choice is locked: a "(…)" red chip if there is one, and how much gold is missing when the cost shows as "−N ทอง"
function disWhy(R,c){let w='',j=-1,cost=0;(c.P||[]).forEach((p,i)=>{if(j<0&&p.c==='b'&&/^\(.+\)$/.test(p.t)){j=i;w=p.t.slice(1,-1);}
  const m=/−([\d,]+) ทอง/.exec(p.t);if(m&&!cost)cost=+m[1].replace(/,/g,'');});
 if(cost&&R.h.gold<cost&&(!w||/ทองไม่พอ/.test(w)))w=`ทองไม่พอ ขาด ${fmt(Math.ceil(cost-R.h.gold))}`;return{w:w||'ตอนนี้ยังเลือกข้อนี้ไม่ได้',j};}
function renderDecide(){const K=S.K,R=S.R;
 const vs=K.vs?`<div class="vs"><div class="side">พลังของคุณ<br><b>${fmt(heroPower(R))}</b></div><div class="px" style="color:var(--ember)">VS</div><div class="side">พลังศัตรู<br><b>${fmt(power(K.ev.en.atk,K.ev.en.def,K.ev.en.mhp))}</b></div></div>`:'';
 const rt=K.rar==='l'?'<span class="rar l">★ ระดับตำนาน</span>':K.rar==='r'?'<span class="rar r">◆ หายาก</span>':'';
 card.innerHTML=`<div class="tag keytag">⚑ จุดเปลี่ยนชะตา · ${esc(K.tag)} ${rt}</div><h3>${esc(K.title)}</h3><p>${esc(K.text)}</p>${vs}
 <div class="cd" role="timer" aria-label="เวลาตัดสินใจ"><i id="cdBar"></i></div><div class="cdl" id="cdTxt"></div>
 <div class="chs">${K.ch.map((c,i)=>c.hide?'':`<button class="ch${i===K.pick?' ai':''}${c.cl?' cl':''}" data-i="${i}" data-k="${K.ch.slice(0,i+1).filter(x=>!x.hide).length}" ${c.dis?'disabled':''}><span class="k">${K.ch.slice(0,i+1).filter(x=>!x.hide).length}</span><span><span class="t">${esc(c.t)}</span><span class="s">${partsHTML(c.dis?c.P.filter((p,j)=>j!==disWhy(R,c).j):c.P)}</span>${c.dis?`<span class="lock">🔒 ${esc(disWhy(R,c).w)}</span>`:''}${i===K.pick?`<span class="aitag">ถ้าหมดเวลา ${esc(R.h.name)} (${esc(PERS[R.h.pers].n)}) จะเลือกข้อนี้</span>`:''}</span></button>`).join('')}</div>`;
 card.querySelectorAll('button.ch').forEach(b=>b.addEventListener('click',()=>choose(+b.dataset.i,false)));card.classList.toggle('legend',K.rar==='l');updCd();}
function choose(i,timeout){if(S.phase!=='decide')return;const K=S.K,R=S.R,f=R.floor;if(!K.ch[i]||K.ch[i].dis)return;clearInterval(cdI);
 const g0=R.h.gold,k0=R.karma;const out=applyKey(R,K,i);if(!out)return;if(timeout)R.timeouts++;
 else if(K.type!=='shop'){const dk=clamp(R.karma-k0,-4,4);if(dk)R.kl=clamp((R.kl||0)*.9+dk,-12,12);} // only your own picks move the lean
 showOutcome(K,i,out,{t:timeout?`หมดเวลา ${R.h.name} (${PERS[R.h.pers].n}) เลือกเอง: "${K.ch[i].t}"`:`คุณเลือก "${K.ch[i].t}"`,c:timeout?'lv':'info'},g0,false,f);}
// SAME_WAY / PLAIN: answer without stopping the clock, then show the outcome like a normal choice
function quickKey(P){const R=S.R,K=P.K,i=P.i,g0=R.h.gold,f=R.floor;S.K=K;VIS.show=K.vis;const out=applyKey(R,K,i,P.how);if(!out){S.phase='flow';schedule(floorMs());return;}
 showOutcome(K,i,out,{t:P.how==='same'?`ตอบแบบเดิม: "${K.ch[i].t}"`:`ทางนี้ชัดอยู่แล้ว: "${K.ch[i].t}"`,c:'info'},g0,true,f);}
function showOutcome(K,i,out,lead,g0,quick,f){const R=S.R;if(out.mile)showMile(out.mile);
 if(K.type==='boss'&&i===0&&out.combat&&out.combat.win)ach('boss_win',{floor:f,boss:K.ev.en.id});
 if(out.combat&&out.combat.en&&out.combat.en.id==='mimic')ach('mimic',{won:!!out.combat.win});
 if(K.rar==='l')ach('legend',{id:K.type==='arc'?K.tid:K.type});if(K.type==='omen')ach('omen',{});
 {const Hl=R.hist[R.hist.length-1];if(Hl&&Hl.f===f&&!Hl.v)Hl.v=visLite(out.combat&&out.combat.en?{t:'en',en:out.combat.en}:K.vis);} // scene for the end montage
 R.log.unshift({f,t:lead.t,c:lead.c});
 S.frame={f,tag:(quick?'↺ ':'')+K.tag,title:K.title,text:'',msgs:[lead,...out.msgs]};
 if(out.chest||(K.ev&&K.ev.kind==='ev'&&evPr(EVENTS[K.ev.ti])==='chest'))AUDIO.sfx('chest');if(K.type==='boss'&&i===1)AUDIO.sfx('warp');
 S.pendCoins=Math.max(0,R.h.gold-g0);
 if(out.combat){S.cb={en:out.combat.en,ev:out.combat.ev,i:0,hp:out.combat.startHp,mhp:out.combat.mhp,ehp:out.combat.en.mhp,lines:[],win:out.combat.win};VIS.show={t:'en',en:out.combat.en};S.phase='combat';render();playCombat();}
 else afterKey();}
function afterKey(){const R=S.R;S.K=null;S.tmAt=0;S.cb=null;if(R.rezFx){R.rezFx=0;AUDIO.sfx('levelup');lvlFx();}if(S.pendCoins>0)coinBurst(Math.max(3,Math.round(S.pendCoins/8)));S.pendCoins=0;
 if(!R.alive){if(R.won){if(secOpen(R)){S.phase='secret';render();return;}sting('win');S.phase='end';S.saved=false;render();return;}R.death=R.death||'boss';S.frame.title='ถึงฆาตแล้ว';S.frame.text=R.cause;goDying();return;}
 S.phase='flow';VIS.walk0=performance.now();render();schedule(floorMs());}
// ---- secret floor above 100 (v2.1) ----
const secOpen=R=>!!(R&&R.won&&R.sec&&['ask','talk','choose','res'].includes(R.sec.st));
const SEC_TALK={k:['เก่งมากที่มาถึงตรงนี้ได้ เจ้าตัวเล็ก','ร้อยปีมานี้ มีมนุษย์ขึ้นมาถึงห้องนี้ไม่ถึงสิบคน และยังไม่มีใครได้เดินลงไป','ถ้าเจ้าสู้ชนะ ข้าจะให้รางวัลแก่เจ้า ถ้าแพ้ ก็นอนอยู่ใต้กองทองนี่กับคนอื่นๆ ไปแล้วกัน'],
 s:['เก่งมากที่มาถึงตรงนี้ได้ ข้าเห็นเจ้าไต่ขึ้นมาตั้งแต่ชั้นแรกแล้ว','หอคอยนี้มีไว้ให้คนอย่างเจ้าได้พิสูจน์ตัวเอง ส่วนข้าเป็นบททดสอบบทสุดท้าย','ถ้าเจ้าสู้ชนะ ข้าจะให้รางวัลแก่เจ้า จะเอาชีวิตข้าไปด้วยหรือไม่ ก็แล้วแต่ใจเจ้า'],
 g:['เก่งมากที่มาถึงตรงนี้ได้ แต่อย่าคิดจะหยิบเหรียญของข้าไปแม้แต่เหรียญเดียว','ข้านับเหรียญพวกนี้ทุกคืน ขาดไปเหรียญเดียวข้าก็รู้','ถ้าเจ้าสู้ชนะ ข้าจะให้รางวัลแก่เจ้า ข้าใจกว้างกับคนเก่งเสมอ']};
const SEC_CLAN={f:'กลิ่นนี้ข้าจำได้ ตระกูลของเจ้าเคยไว้ชีวิตพี่น้องข้า วันนี้ข้าจะออมมือให้บ้าง',s:'กลิ่นเลือดพี่น้องข้ายังติดอยู่บนตัวคนตระกูลเจ้า วันนี้ข้าจะไม่ออมมือ',d:'ตระกูลของเจ้าเคยล้มพวกข้าไปหลายตัว แต่ก็ชดใช้ครบแล้ว ข้าจะสู้กับเจ้าอย่างยุติธรรม'};
function secLines(R){const D=DRG[R.sec.c],T=SEC_TALK[R.sec.c],m=R.sec.m0||clanM(R);
 return[{n:1,t:`บนสุดของบันไดเป็นโถงกว้างที่มีกองทองสูงเท่าภูเขาย่อมๆ ${D.n}ตัวใหญ่นอนขดอยู่บนนั้น พอคุณก้าวเข้าไป มันก็ค่อยๆ ลืมตาขึ้น`},{t:T[0]},...(SEC_CLAN[m]?[{t:SEC_CLAN[m]}]:[]),{t:T[1]},{t:T[2]},
  {n:1,t:'ไอร้อนจากกองสมบัติทำให้แผลทั้งตัวของคุณปิดสนิท มังกรนอนรอจนคุณหายใจทัน'}];}
function secEnter(){const R=S.R;R.sec.st='talk';R.sec.i=0;R.sec.m0=clanM(R);R.h.hp=R.h.mhp;R.h.mp=R.h.mmp;secPrep(R);
 const en=secEn(R);R.sec.e=[0,1].map(w=>estimateWin(R,en,80,secOpts(en,w)));VIS.edead=false;AUDIO.sfx('boss');render();}
function secLeave(){const R=S.R;R.sec.st='done';if(!R.sec.res)R.sec.res='n';if(R.sec.res==='x'){if(!sting('death'))AUDIO.sfx('death');}else sting('win');S.phase='end';S.saved=false;render();}
function secGo(way){const R=S.R;if(R.sec.st!=='choose')return;const out=secFight(R,way),c=out.combat;R.sec.st='res';R.sec.msgs=out.msgs.map(m=>({t:m.t,c:m.c}));
 S.frame={f:100,tag:'ชั้นลับ',title:'',text:'',msgs:out.msgs};S.pendCoins=R.sec.g||0;
 S.cb={en:c.en,ev:c.ev,i:0,hp:c.startHp,mhp:c.mhp,ehp:c.en.mhp,lines:[],win:c.win,spare:way===0,tag:'ชั้นลับ'};VIS.show={t:'en',en:c.en};VIS.edead=false;S.phase='combat';render();playCombat();}
function renderSecret(){const R=S.R,X=R.sec,D=DRG[X.c],h=R.h,EGN=`ไข่มังกร${D.n.replace('มังกร','')}`;
 if(X.st==='talk'||X.st==='choose'||(X.st==='res'&&X.res==='f'))VIS.show={t:'en',en:secEn(R)};else if(X.st==='ask')VIS.show=null;
 const tag=`<div class="tag keytag">✦ ชั้นลับ · ไม่มีในแผนที่</div>`,btn=(k,t,s,pri)=>`<button class="ch${pri?' ai':''}" data-k="${k}"><span class="k">${k}</span><span><span class="t">${esc(t)}</span>${s?`<span class="s">${s}</span>`:''}</span></button>`,chip=(t,c)=>`<span class="${c||''}">${esc(t)}</span>`;
 if(X.st==='ask'){card.innerHTML=`${tag}<h3>คุณค้นพบชั้นใหม่</h3><p>ผู้กลืนดาราล้มลงแล้ว แต่หลังบัลลังก์ของมันมีบันไดแคบๆ ทอดขึ้นไปอีก บันไดนี้ไม่มีในแผนที่ของใครเลย ลมร้อนที่พัดลงมามีกลิ่นเหมือนทองเก่า</p><p><b>ต้องการเข้าท้าทายหรือไม่</b></p>
  <div class="chs">${btn(1,'ขึ้นไปท้าทาย',chip('ยังไม่รู้ว่าข้างบนมีอะไร','b'),1)}${btn(2,'ไม่ขึ้น จบการเดินทางที่นี่',chip('จบแบบผู้พิชิตยอดหอ','g'))}</div>`;
  const b=card.querySelectorAll('button.ch');b[0].onclick=secEnter;b[1].onclick=secLeave;return;}
 if(X.st==='talk'){const L=secLines(R),i=clamp(X.i|0,0,L.length-1),last=i>=L.length-1;
  card.innerHTML=`${tag}<h3>${esc(D.n)}แห่งกองสมบัติ</h3><div class="sectalk">${L.slice(0,i+1).map(l=>l.n?`<p class="dim">${esc(l.t)}</p>`:`<p class="say">「${esc(l.t)}」</p>`).join('')}</div>
  <p class="dim" style="font-size:12px">ช่วงนี้ไม่มีเวลานับถอยหลัง อ่านได้ตามสบาย</p><div class="acts"><button class="btn" id="secSkip" data-k="2">ข้ามบทพูด<span class="kb">[2]</span></button><button class="btn pri" id="secNext" data-enter>${last?'พร้อมแล้ว ▸':'ถัดไป ▸'}<span class="kb">[Enter]</span></button></div>`;
  $('secNext').onclick=()=>{if(last)X.st='choose';else X.i=i+1;render();};$('secSkip').onclick=()=>{X.st='choose';render();};return;}
 if(X.st==='choose'){const e=X.e||[.5,.3],cur=X.m0==='s',pc=v=>`โอกาสชนะ ~${Math.round(v*100)}%`;
  card.innerHTML=`${tag}<h3>${esc(D.n)}ลุกขึ้นยืนบนกองทอง</h3><p>เหรียญไหลลงจากเกล็ดเป็นสาย มันกางปีกจนเต็มโถง แล้วรอให้คุณเลือกว่าจะสู้แบบไหน</p>
  <div class="chs">${btn(1,'สู้จนมันยอมแพ้ แล้วไว้ชีวิต',[chip(pc(e[0]),e[0]>=.6?'g':'b'),chip(cur?'นับเป็นมังกรที่ล้มได้ แต่มันจะไม่ยอมเป็นสหาย':'ตระกูลได้ฉายา สหายมังกร','g'),chip(`ได้${EGN}`,'g'),chip('แพ้ = ตาย','b')].join(''),1)}
  ${btn(2,'สู้จนมันตาย',[chip(pc(e[1]),e[1]>=.6?'g':'b'),chip(`ขนสมบัติทั้งกอง + ${EGN}`,'g'),chip(cur?'นับเป็นมังกรที่ล้มได้':'ตระกูลจะติดคำสาปนักล่ามังกร','b'),chip('แพ้ = ตาย','b')].join(''))}
  ${btn(3,'ก้มหัวให้ แล้วเดินลงบันไดไป',chip('จบแบบผู้พิชิตยอดหอ','g'))}</div>`;
  const b=card.querySelectorAll('button.ch');b[0].onclick=()=>secGo(0);b[1].onclick=()=>secGo(1);b[2].onclick=secLeave;return;}
 // result
 const res=X.res,cur=X.m0==='s';let t,p,gain=[];
 if(res==='f'){t='มังกรยอมรับคุณ';p=`${D.n}ทรุดตัวลงบนกองทองแล้วหัวเราะเสียงต่ำ 「ดีมาก ข้าแพ้แล้ว รางวัลของเจ้าอยู่ตรงนี้」 มันใช้หางเขี่ยไข่ใบหนึ่งออกมาจากใต้กองเหรียญ`;
  gain=[`+${fmt(X.g||0)} ทอง`,`${EGN} (จะฟักตอนคนรุ่นต่อไปเกิด)`,cur?'มังกรยังไม่ยอมนับเป็นสหาย แต่คำสาปของตระกูลเบาลง':'ตระกูลได้ฉายา สหายมังกร มอนสเตอร์เผ่ามังกรจะไม่ทำร้ายลูกหลาน'];}
 else if(res==='s'){t='มังกรสิ้นใจ';p=`${D.n}ล้มลงบนกองทองจนเหรียญกระเด็นไปทั่วโถง ไม่เหลือใครให้รางวัลคุณแล้ว คุณเลยหยิบเอาเอง`;
  gain=[`+${fmt(X.g||0)} ทอง`,`${EGN} (ขโมยมา จะฟักตอนคนรุ่นต่อไปเกิด)`,'ฉายา นักล่ามังกร',cur?'นับเป็นมังกรที่ล้มได้อีกตัว':'ตระกูลติดคำสาปนักล่ามังกร มอนสเตอร์เผ่ามังกรจะดุใส่ลูกหลาน จนกว่าจะล้มมังกรครบ 3 ตัว','ลูกหลานมีโอกาสเกิดเป็นอาชีพลับ'];}
 else{t='ชั้นลับกลายเป็นหลุมศพ';p=`คุณล้มลงข้างกองทอง ${D.n}ใช้กรงเล็บดันร่างของ${h.name}ไปกองรวมกับกระดูกของคนอื่นๆ ที่เคยขึ้นมาถึงตรงนี้`;}
 const ms=(X.msgs||[]).filter(m=>m.c==='lv');
 card.innerHTML=`${tag}<h3>${esc(t)}</h3><p>${esc(p)}</p>${gain.length?`<ul class="msgs">${gain.map(g=>`<li class="good">${esc(g)}</li>`).join('')}${ms.map(m=>`<li class="lv">${esc(m.t)}</li>`).join('')}</ul>`:''}
 <div class="acts"><button class="btn pri" id="secEnd" data-enter>ไปที่แผ่นจารึก<span class="kb">[Enter]</span></button></div>`;
 $('secEnd').onclick=secLeave;}
const secSum=R=>{const X=R.sec||{},D=DRG[X.c];if(!D)return'';return X.res==='n'?'พบบันไดขึ้นไปแต่เลือกไม่ขึ้น':X.res==='f'?`ล้ม${D.n}แล้วไว้ชีวิต ได้ไข่มังกรกลับมา`:X.res==='s'?`ฆ่า${D.n}แล้วขนสมบัติกลับมา`:X.res==='x'?`ตายในกรงเล็บของ${D.n}`:'';};
let cbTimer=null;
function cbLine(e,en){const n=Math.round(e.d||0);
 if(e.t==='h')return(e.cr?'คริติคอล! ':'')+`คุณโจมตี ${n}`;if(e.t==='skill')return e.x2?`ร่ายซ้ำอีกรอบ! ${n} ดาเมจ`:`ใช้สกิล! ${n} ดาเมจ`;if(e.t==='volley')return`ยิงชุดแรกก่อนศัตรูขยับ ${n}`;if(e.t==='stab')return`แทงจากเงา! ${n}`;
 if(e.t==='counter')return`สวนกลับ ${n}`;if(e.t==='steal')return`ฉกทองมาได้ ${e.g}`;if(e.t==='save')return'เลือดมังกรพยุงร่างไว้';if(e.t==='heal')return'สวดรักษาตัวเอง';if(e.t==='c')return`${e.n} โจมตี ${n}`;if(e.t==='p')return`สัตว์เลี้ยงกัด ${n}`;if(e.t==='miss')return`หลบการโจมตีได้!`;return`${en.n} โจมตี ${n}`;}
function playCombat(){clearTimeout(cbTimer);const cb=S.cb;if(!cb)return;const step=RM?0:clamp(2600/Math.max(1,cb.ev.length),60,240)/Math.sqrt(S.speed);
 const tick2=()=>{if(S.phase!=='combat'||S.cb!==cb)return;if(cb.i>=cb.ev.length){finishCombat();return;}
  const pv=cb.hp,e=cb.ev[cb.i++];cb.hp=e.hp;cb.ehp=e.ehp;cb.lines.unshift(cbLine(e,cb.en));const last=cb.i>=cb.ev.length;
  fxEv(e,{en:cb.en,beat:step,prev:pv,last,win:cb.win,snd:true});
  // skills/heals and the killing blow get a longer beat so their effect can play out
  updCombatUI();cbTimer=setTimeout(tick2,step*(/^(skill|heal|volley|stab|save)$/.test(e.t)?2:1)*(last&&cb.win?2.5:1));};
 if(RM){finishCombat();return;}tick2();}
function finishCombat(){clearTimeout(cbTimer);const cb=S.cb;if(cb&&cb.win&&!cb.spare&&!VIS.edead)killFx(cb.en,120);afterKey();}
function renderCombat(){const cb=S.cb;card.innerHTML=`<div class="tag">${esc(cb.tag||`ชั้น ${S.R.floor}`)} · การต่อสู้</div><h3>ปะทะ ${esc(cb.en.n)}</h3>
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
 if(R.death==='boss')return`${a}${b} · คุณทอยชะตารอดมาทุกชั้น จุดจบมาจากการแพ้บอส`;
 return a+b;}
// ---- cohort panel: everyone who entered together (you included), shortest life first, one line of story each ----
const COH_W={ambush:'โดนมอนสเตอร์ซุ่มโจมตี',biome:'เจออุบัติเหตุจากตัวหอ',trap:'ติดกับดักกลไก',bleed:'เสียเลือดจนหมดแรง',scar:'แผลเก่ากำเริบ',karma:'โดนเงากรรมตามทัน',curse:'แพ้คำสาป',
 shadow:'โดนเงาที่ตามมาแต่เกิดกลืนไป',alone:'ล้มลงคนเดียว',slip:'ลื่นตกบันได',boss:'แพ้บอส',bossfate:'ชะตาขาดต่อหน้าบอส',fate:'ชะตาขาด'};
const COH_S={e:['ไปได้แค่ชั้น {f} ก็{w}','ยังไม่ทันได้รู้จักหอคอยดี ก็{w}ที่ชั้น {f}','อยู่ในหอได้แค่ {f} ชั้น เรื่องจบลงเพราะ{w}'],
 m:['เดินมาถึงชั้น {f} แล้ว{w}','ประคองตัวมาได้ {f} ชั้น ก่อนจะ{w}','ผ่านมา {f} ชั้น เรื่องจบลงเพราะ{w}'],
 l:['เกือบถึงยอดแล้ว แต่{w}ที่ชั้น {f}','ไปได้ไกลถึงชั้น {f} ไกลกว่าคนส่วนใหญ่ ก่อนจะ{w}','อีก {r} ชั้นก็ถึงยอด แต่{w}เสียก่อน'],
 w:['ขึ้นไปยืนบนยอดหอได้จริงๆ','ไต่ครบ 100 ชั้น แล้วล้มผู้กลืนดาราได้']};
function cohStory(c){const hs=shash(c.n+'|'+c.f),ri=RANKS.findIndex(r=>r.k===c.rk),w=COH_W[c.ck]||'ชะตาขาด';
 const band=c.won?'w':c.f<=15?'e':c.f<=60?'m':'l',L=COH_S[band].filter(x=>!(x.includes('{r}')&&c.f>97));let t=L[hs%L.length].replace('{f}',c.f).replace('{w}',w).replace('{r}',100-c.f);
 if(ri>=RANKS.length-2&&!c.won&&c.f<40)t=`เกิดมาเป็น${c.cn}แรงค์ ${c.rk} แท้ๆ แต่${t}`;else if(ri===0&&(c.won||c.f>=70))t=`${c.cn}แรงค์ ${c.rk} ที่ไม่มีใครฝากความหวังไว้ ${t}`;return t;}
function cohHTML(R,coh,fl){if(!coh.length)return'';const h=R.h,me={n:h.name,rk:RANKS[h.rank].k,cn:CLASSES[h.cls].n,f:fl,won:R.won,ck:R.won?'':R.ck||'',me:1};
 const all=[...coh,me].sort((x,y)=>(x.won?100:x.f)-(y.won?100:y.f)||(x.won?1:0)-(y.won?1:0)),fell=all.filter(c=>!c.won).map(c=>c.f),wn=all.filter(c=>c.won);
 const ls=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' และ '+a[a.length-1];
 const end=!wn.length?`ทั้ง ${all.length} คนล้มที่ชั้น ${ls(fell)} ไม่มีใครเลือกชะตาได้`:!fell.length?`ทั้ง ${all.length} คนขึ้นถึงยอดหอ รุ่นแบบนี้หาได้ยากมาก`
  :`${ls(wn.map(c=>c.me?'คุณ':c.n))} ขึ้นถึงยอด คนที่เหลือล้มที่ชั้น ${ls(fell)} ไม่มีใครเลือกชะตาได้`;
 return`<h2 data-tip="cohort">เพื่อนรุ่นเดียวกัน</h2><p class="dim" style="font-size:12px;margin:0 0 6px">ทุกคนที่เข้าหอมาพร้อมคุณ เรียงจากคนที่จากไปก่อน</p><ol class="coh">${all.map(c=>`<li${c.me?' class="me"':''}><span class="px">${esc(c.rk)}</span><span>${esc(c.n)} · ${esc(c.cn)}${c.me?' <span class="metag">คุณ</span>':''}<br><span class="x">${esc(cohStory(c))}</span></span><span class="px">${c.won?'👑 ':''}${c.won?100:c.f}F</span></li>`).join('')}</ol><p class="cohend">${esc(end)}</p>`;}
// ---- karma ledger (revealed only at the end) ----
const FRUIT=['มีคนตั้งศาลเล็กๆ ไว้ให้ที่ชั้น {f}','คนที่คุณช่วยไว้ตั้งชื่อลูกตามคุณ','นักผจญภัยรุ่นหลังเล่าเรื่องนี้ต่อกันในโรงเตี๊ยม','มีดอกไม้สดวางอยู่หน้าหลุมทุกเช้า','ชื่อคุณถูกสลักไว้บนขั้นบันไดชั้น {f}'];
const ERUPT=['มีคนมาขุดหลุมศพเพื่อทวงของคืน','เรื่องนี้ถูกเล่าต่อจนชื่อคุณเสียไปทั้งหมู่บ้าน','ญาติของเขาตามมาสาปแช่งถึงหน้าหลุม','ป้ายหลุมศพถูกพ่นสีทับในคืนเดียว','วิญญาณที่ชั้น {f} ยังไม่ยอมไปไหน'];
function ledgerRoll(R){const K=R.karma;let rows=R.ledger.filter(x=>x.d).map((x,i)=>({f:x.f,d:x.d,t:x.t,i}));const more=Math.max(0,rows.length-14);
 if(more)rows=rows.sort((a,b)=>Math.abs(b.d)-Math.abs(a.d)).slice(0,14).sort((a,b)=>a.i-b.i);
 let fr=0,er=0,pts=0;
 rows.forEach(x=>{const good=x.d>0,p=good?clamp(.4+K*.008+x.d*.04,.15,.85):clamp(.4-K*.008-x.d*.04,.15,.85);x.hit=rnd()<p;
  if(x.hit){const pt=Math.min(6,2+Math.abs(x.d));x.pt=good?pt:-pt;pts+=x.pt;if(good)fr++;else er++;x.fx=pick(good?FRUIT:ERUPT).replace('{f}',x.f);}
  x.lab=good?(x.hit?'ส่งผล':'ยังไม่ส่งผล'):(x.hit?'ปะทุ':'ยังไม่ปะทุ');});
 const fl=R.won?100:R.floor,base=fl+R.bosses*3+(R.won?30:0)+Math.round(R.h.lv/2)+(R.sec&&R.sec.win?(R.sec.way?15:10):0);
 return{rows,more,fr,er,pts,base,score:Math.max(0,base+pts),parts:scoreParts(R,pts)};}
// where the life score comes from (same terms as ledgerRoll's base, plus the karma rows)
function scoreParts(R,pts){const P=[{k:'fl',n:'ชั้น',v:R.won?100:R.floor},{k:'bo',n:'บอส',v:R.bosses*3},{k:'won',n:'พิชิตยอด',v:R.won?30:0},{k:'lv',n:'เลเวล',v:Math.round(R.h.lv/2)},
 {k:'sec',n:'ชั้นลับ',v:R.sec&&R.sec.win?(R.sec.way?15:10):0},{k:'kar',n:'กรรม',v:pts|0}];return P.filter(p=>p.v||p.k==='fl');}
function scoreBar(R,L){const P=L.parts||scoreParts(R,L.pts),pos=P.filter(p=>p.v>0),neg=P.find(p=>p.v<0),tot=pos.reduce((a,p)=>a+p.v,0)||1,sg=v=>(v>0?'+':v<0?'−':'')+Math.abs(v);
 const cut=neg?Math.min(100,-neg.v/tot*100):0;
 return`<div class="scb" role="img" aria-label="${esc(P.map(p=>p.n+' '+sg(p.v)).join(' ')+' = '+L.score)}">${pos.map(p=>`<i class="s-${p.k}" style="flex:${p.v}"></i>`).join('')}${cut?`<i class="scut" style="width:${cut.toFixed(1)}%"></i>`:''}</div>
 <div class="scl">${P.map(p=>`<span class="s-${p.k}${p.v<0?' neg':''}"><i></i>${p.n} <b>${p.k==='kar'?sg(p.v):p.v}</b></span>`).join('')}<span class="eq">= <b>${L.score}</b></span></div>`;}
function ledgerHTML(R){const L=S.lg,st=RM?0:.25,T=S.title;
 const fin=L.pts>=6?`${T.t} · มีบุญหนุนนำ`:L.pts<=-6?`${T.t} · กรรมตามทัน`:T.t;
 const sum=`<div class="lgsum" style="animation-delay:${(L.rows.length*st+.25).toFixed(2)}s">${L.rows.length?`ส่งผล <b>${L.fr}</b> · ปะทุ <b>${L.er}</b> · คะแนนจากกรรม <b class="${L.pts>=0?'g':'b'}">${L.pts>=0?'+':''}${L.pts}</b><br>`:''}
  คะแนนชีวิต <b class="px">${L.base}</b>${L.pts?` → <b class="px big">${L.score}</b>`:''}${scoreBar(R,L)}ฉายาสุดท้าย: <b${T.gold?' style="color:var(--gold)"':''}>${esc(fin)}</b></div>`;
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
// ---- share (share.js): card data, sheet, sticky end bar ----
function shareData(R,sum,x){const h=R.h,cnt={};for(const c of R.stH||'')cnt[c]=(cnt[c]||0)+1;
 const top=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0],sk=STK.find(k=>k[0]===top),n=(R.stH||'').length;
 const betray=[];[...R.log].reverse().forEach(l=>{const m=/^(.+?)ทรยศ!/.exec(l.t||'');if(m&&betray.length<2)betray.push({f:l.f,n:m[1]});});
 let bossLast=0;R.map.forEach((m,i)=>{if(m==='boss')bossLast=i+1;});const lc=R.comps.find(c=>c.legend);
 return Object.assign({},sum,{pct:x.pct,med:x.med,lv:h.lv,house:h.house||h.name,petN:R.pets.map(p=>PETS[p]?PETS[p].n:'').filter(Boolean),comps:R.comps.map(c=>c.n),
  map:R.map.slice(),pat:S.pat?{code:S.pat.code,n:S.pat.n,d:S.pat.d,v:S.pat.v.slice()}:null,stance:sk&&n?`${STANCES[sk].n} · ${Math.round(cnt[top]/n*100)}% ของทาง`:'',note:S.shareNote||'',
  hk:{legs:R.hist.filter(v=>v.rar==='l'&&!sens(v)).map(v=>({f:v.f,t:v.t})),betray,bossLast,legComp:lc?lc.n:'',master:h.master||'',coh:x.coh.length,beat:x.beat,nearP:R.pMax||0,nearF:R.pMaxF||0,gold:!!(S.title&&S.title.gold)}});}
function openShare(auto){if(!S||!S.shareD||!window.SHARE)return;try{window.SHARE.open(Object.assign({},S.shareD,{note:S.shareNote||'',date:Date.now()}),{auto,onNote:v=>{S.shareNote=v;}});}catch(e){}}
let ebIO=null;
function endBar(on){const b=$('endBar');if(!b)return;if(ebIO){ebIO.disconnect();ebIO=null;}
 if(!on){b.hidden=true;document.body.classList.remove('eb-on');return;}
 const acts=[...document.querySelectorAll('#card .endacts,#sceneActs .endacts')],vis=new Set();
 const upd=()=>{const show=S&&S.phase==='end'&&!S.cineOn&&vis.size===0;b.hidden=!show;document.body.classList.toggle('eb-on',show);};
 if(!('IntersectionObserver' in window)||!acts.length){upd();return;}
 ebIO=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting)vis.add(e.target);else vis.delete(e.target);});upd();},{threshold:.4});acts.forEach(a=>ebIO.observe(a));
 if(!b._w){b._w=1;$('ebShare').onclick=()=>openShare(false);}}
// ---- ลวดลายชะตา: 16 patterns from four two-pole axes (log-ratio lean with a prior, so short runs stay near the middle) ----
// cL/cR: the letters stored in saves and share links (keep them), eL/eR: what players see
const PAX=[{L:'บุก',R:'ระวังตัว',cL:'บ',cR:'ร',eL:'⚔️',eR:'🛡️'},{L:'หาของ',R:'ช่วยเหลือ',cL:'ห',cR:'ช',eL:'💰',eR:'🤝'},{L:'ไปคนเดียว',R:'มีเพื่อน',cL:'ด',cR:'พ',eL:'🚶',eR:'👥'},{L:'กรรมดี',R:'กรรมชั่ว',cL:'☀',cR:'☾',eL:'☀️',eR:'🌙'}];
const patEmo=code=>Array.from(code||'').map((c,i)=>!PAX[i]?c:c===PAX[i].cL?PAX[i].eL:c===PAX[i].cR?PAX[i].eR:c).join('');
const PATS={
 'บหด☀':['พรานเดี่ยวใจซื่อ','บุกไปข้างหน้าคนเดียว เก็บทุกอย่างที่เจอ แต่ไม่เคยหยิบของของใคร'],
 'บหด☾':['โจรสลัดแห่งหอคอย','ลุยเข้าไปคนเดียวแล้วกวาดทุกอย่างที่ขวางทาง ไม่สนว่าเป็นของใคร'],
 'บหพ☀':['หัวหน้าคณะล่าสมบัติ','เดินนำทีมไปหาของ แล้วแบ่งให้ทุกคนเท่ากัน'],
 'บหพ☾':['หัวหน้าแก๊งปล้นหอ','พาพวกบุกเข้าไปปล้น ใครขวางก็ไม่เหลือ'],
 'บชด☀':['อัศวินพเนจร','ฝ่าเข้าไปช่วยคนแปลกหน้า แล้วเดินจากไปคนเดียวโดยไม่รอคำขอบคุณ'],
 'บชด☾':['ผู้พิทักษ์มือเปื้อน','ช่วยคนได้จริง แต่อย่าถามว่าช่วยด้วยวิธีไหน'],
 'บชพ☀':['แม่ทัพของคนธรรมดา','ยืนหน้าสุดของกลุ่มเสมอ และพาทุกคนกลับมาได้'],
 'บชพ☾':['ขุนศึกผู้รักพวกพ้อง','ปกป้องคนของตัวเองสุดชีวิต ส่วนคนนอกไม่อยู่ในสายตา'],
 'รหด☀':['นักสะสมเงียบ','ค่อยๆ เก็บของทีละชิ้นอย่างใจเย็น ไม่เคยรบกวนใคร'],
 'รหด☾':['หนูในกำแพง','หลบอยู่ในเงา แล้วหยิบของคนอื่นไปทีละนิด'],
 'รหพ☀':['พ่อค้าเร่ใจดี','เดินทางเป็นกลุ่ม ค้าขายแบบไม่เอาเปรียบใคร'],
 'รหพ☾':['นายหน้าเจ้าเล่ห์','ให้คนอื่นออกหน้าเสี่ยงแทน แล้วเก็บส่วนแบ่งก้อนใหญ่ไว้เอง'],
 'รชด☀':['ฤๅษีริมทาง','อยู่ห่างผู้คน แต่ไม่เคยปล่อยให้คนที่เดินผ่านต้องลำบาก'],
 'รชด☾':['หมอเถื่อนแห่งหอ','ช่วยชีวิตคนได้ แต่ทุกครั้งมีราคาที่ต้องจ่าย'],
 'รชพ☀':['ร่มไม้ของทุกคน','ยอมเดินช้า เพื่อไม่ให้ใครต้องตกอยู่ข้างหลัง'],
 'รชพ☾':['ผู้ดูแลสองหน้า','ดูแลพวกพ้องดีทุกอย่าง แต่จดบัญชีบุญคุณไว้ทุกเรื่อง']};
// floors walked with a companion or pet; counted in the UI from floor changes (quiet stretches count at their end)
function partyTick(R){if(typeof R.ptF!=='number'||typeof R.ptW!=='number'){R.ptF=R.floor;R.ptW=0;return;}
 if(R.floor>R.ptF){if(R.comps.length||R.pets.length)R.ptW+=R.floor-R.ptF;R.ptF=R.floor;}}
const leanOf=(l,r,P,w)=>clamp(Math.round(Math.log((r+P)/(l+P))/w*100),-100,100); // <0 = left pole
function fatePattern(R){const H=R.stH||'',cnt=c=>H.split(c).length-1,p=R.h.pers,fl=R.won?100:R.floor,M=R.map||[],mc=k=>M.filter(m=>m===k).length,w3=Math.log(4);
 let pw=typeof R.ptW==='number'?R.ptW:0;if(typeof R.ptF!=='number'){const j=M.findIndex(m=>m==='comp'||m==='pet');pw=j>=0&&(R.comps.length||R.pets.length)?fl-j-1:0;}
 let g=0,b=0;(R.ledger||[]).forEach(x=>{if(x.d>0)g+=x.d;else if(x.d<0)b-=x.d;});if(!g&&!b){if(R.karma>0)g=R.karma;else b=-R.karma;}
 const v=[leanOf(cnt('a')+(p==='bold'?3:0)+(R.bosses||0)*.5,cnt('d')+(p==='careful'?3:0)+(R.retreats||0)*1.5+(R.sneaks||0)*1.5,5,w3),
  leanOf(cnt('l')+(p==='greedy'?3:0)+mc('treasure')*.5,cnt('h')+(p==='kind'?3:0)+mc('good')*.5+mc('pet')*.5,5,w3),
  leanOf(fl-pw,pw,4,w3),leanOf(g,b,3,w3)];
 const sd=shash(R.h.name+'|'+fl);v.forEach((x,i)=>{if(!x)v[i]=(sd>>i)&1?1:-1;});
 const code=v.map((x,i)=>x<0?PAX[i].cL:PAX[i].cR).join(''),P=PATS[code]||['นักผจญภัย',''];return{code,n:P[0],d:P[1],v};}
// tooltip attributes for a pattern code: what each of the four letters means
function patTip(code,name){const L=Array.from(code||'');if(L.length!==4)return' data-tip="pat"';
 const d=L.map((c,i)=>c===PAX[i].cL?`${PAX[i].eL} ${PAX[i].L}`:`${PAX[i].eR} ${PAX[i].R}`).join(' · ');
 return` data-tip="pat" tabindex="0" data-tipn="${esc(patEmo(code)+(name?' '+name:''))}" data-tipd="${esc(d+(PATS[code]&&PATS[code][1]?'\n'+PATS[code][1]:''))}"`;}
function leanLab(x,ax){const a=Math.abs(x),pole=x<0?ax.L:ax.R;return a<12?'เกือบตรงกลาง':a<40?`เอนไปทาง${pole}นิดหน่อย`:a<75?`ค่อนไปทาง${pole}`:`${pole}เต็มตัว`;}
function patHTML(pt){if(!pt)return'';
 return`<div class="patc"><div class="pth"><span class="ptk" data-tip="pat">ลวดลายชะตา</span><span class="ptcode"${patTip(pt.code,pt.n)}>${esc(patEmo(pt.code))}</span></div><div class="ptn">${esc(pt.n)}</div><div class="ptd">${esc(pt.d)}</div>
 <div class="ptax">${PAX.map((ax,i)=>`<div class="pta"><span class="pl${pt.v[i]<0?' on':''}">${ax.eL} ${ax.L}</span><span class="ptr" role="img" aria-label="${esc(leanLab(pt.v[i],ax))}"><i style="left:${(50+pt.v[i]/2).toFixed(1)}%"></i></span><span class="pr${pt.v[i]>0?' on':''}">${ax.R} ${ax.eR}</span><span class="ptl">${esc(leanLab(pt.v[i],ax))}</span></div>`).join('')}</div>
 <details class="ptmore"><summary>ลวดลายทั้ง 16 แบบ</summary><ul>${Object.keys(PATS).map(k=>`<li${k===pt.code?' class="me"':''}><b class="px"${patTip(k,PATS[k][0])}>${patEmo(k)}</b> ${esc(PATS[k][0])}</li>`).join('')}</ul></details>
 <p class="ptnote">คิดจากท่าทีที่ใช้ ของที่เก็บกับคนที่ช่วย เวลาที่มีเพื่อนร่วมทาง และบัญชีกรรม ไม่มีลวดลายไหนดีกว่ากัน</p></div>`;}

// ---- end cinematic (after 1in8b): title → montage of key moments → funeral (or summit fireworks) → epitaph → "ดูบันทึก" ----
// It plays over the end screen. By the time it starts the run is already finalized: memorial, lineage, leaderboard and achievements are written.
const CINE={on:false,el:null,steps:[],i:-1,tm:0,raf:0,st:0,arm:0,armT:0,cv:[],fr:[null,null],cur:0,lit:0,epT:[],epN:0};
const hash=n=>window.ART.hash(n);
const CTR=['brave','cheap','lucky','shield','loyal','mouth','medic'];
function visLite(v){if(!v)return null;if(v.t==='en'){const e=v.en||{};return{t:'en',en:{id:e.id,boss:!!e.boss,cls:e.cls||'',n:e.n||''}};}
 if(v.t==='prop')return{t:'prop',pr:v.pr,fb:v.fb||''};if(v.t==='pet')return{t:'pet',p:v.p};if(v.t==='comp')return{t:'comp',cls:v.cls,c:v.c||null};return null;}
function momVis(m){if(m.v)return m.v;const id=String(m.tid||''),f=m.f||1;
 if(id.startsWith('pet:')&&PSPR[id.slice(4)])return{t:'pet',p:id.slice(4)};if(id.startsWith('comp:'))return{t:'comp',cls:'war',c:{n:m.t||'',cls:'war',tr:id.slice(5)}};
 if(id.startsWith('ev:')){const E=EVENTS[+id.slice(3)];if(E)return evVis(null,E);}
 if(id==='boss')return{t:'en',en:{id:BOSSES[biome(f)].id,boss:true}};if(id==='omen')return{t:'prop',pr:'portal'};return{t:'prop',pr:'npc'};}
function drawVis(x,v,t,bob){if(!v)return;
 if(v.t==='en'){const E=enSpr(v.en);if(!E)return;blit(x,E.spr,E.x,v.en.cls?84+bob:v.en.boss?70+bob:84,{flip:E.flip,key:E.key});}
 else if(v.t==='prop'){const N=window.ART.NPCS||{};drawProp(x,v.fb&&!N[v.pr]?v.fb:v.pr,t);}
 else if(v.t==='pet'){if(PSPR[v.p])blit(x,PSPR[v.p],132,91+bob,{key:'p'+v.p});}
 else if(v.t==='comp'){const s=v.c&&v.c.cls?cSpr(v.c):{s:heroSpr(v.cls||'war'),k:'c'+(v.cls||'war')};blit(x,s.s,128,84+bob,{flip:true,key:s.k});}}
const clsIdOf=n=>{const c=CLASSES.find(c=>c.n===n);return c?c.id:'war';};
function cineMourners(R){const fl=R.won?100:R.floor,M=[];
 R.comps.forEach(c=>{const v=cSpr(c);M.push({s:v.s,k:v.k,n:c.n});});
 (R.coh||[]).filter(c=>c.won||c.f>fl).forEach(c=>{const cc={n:c.n,cls:clsIdOf(c.cn),tr:CTR[shash(c.n)%CTR.length]};M.push({s:compSpr(cc),k:'cp'+compKey(cc),n:c.n,coh:1});});
 const N=window.ART.NPCS||{},seen={};[...R.hist].reverse().forEach(m=>{const v=m.v;if(v&&v.t==='prop'&&N[v.pr]&&!seen[v.pr]&&Object.keys(seen).length<2){seen[v.pr]=1;M.push({s:N[v.pr],k:'npc:'+v.pr,npc:1});}});
 const ppl=M.slice(0,6);R.pets.forEach(p=>{if(PSPR[p])ppl.push({s:PSPR[p],k:'p'+p,pet:1,n:PETS[p].n});});return ppl.slice(0,8);}
const FUN_X=[68,108,52,124,36,140,20,156];
function drawFuneral(x,t){const R=S.R,h=R.h,won=R.won,A=window.ART,bob=t?Math.round(Math.sin(t/260)):0;A.funeralDraw(x,won);
 const M=S.cineM||[];
 if(won){const hs=heroSpr(CLASSES[h.cls].id,look(h));x.fillStyle='rgba(244,187,74,0.16)';x.fillRect(84,40,24,60);blit(x,hs,88,82+bob,{key:'h'+hs.id});}
 else{blit(x,A.STONE,90,86,{key:'stone',noShadow:true});x.fillStyle='#1a1418';x.fillRect(93,90,6,1);blit(x,A.WREATH,92,93,{key:'wreath',noShadow:true});
  [[80,94],[110,94],[84,97],[106,97]].forEach(([X,Y],i)=>A.drawCandle(x,X,Y,t,i));}
 M.forEach((m,i)=>{const X=FUN_X[i],left=i%2===0,yy=m.pet?91:m.npc?88+(m.s.dy||0)+16-m.s.h:100-m.s.h;const sb=t&&!m.pet?Math.round(Math.sin(t/700+i)*.6):0;
  if(m.npc&&m.s.al){x.globalAlpha=m.s.al;}blit(x,m.s,X,yy+sb,{flip:!left,key:m.k});x.globalAlpha=1;});
 if(S.cineRain){x.fillStyle='rgba(170,190,230,0.45)';for(let i=0;i<70;i++){const X=Math.floor((hash(i)*192+(t||0)*.04)%192),Y=Math.floor((hash(i+77)*128+(t||0)*.22)%128);x.fillRect(X,Y,1,3);}
  x.fillStyle='rgba(20,24,40,0.18)';x.fillRect(0,0,192,128);}
 if(won){const T=t||900;for(let k=0;k<3;k++){const per=1900,tt=T+k*640,cyc=Math.floor(tt/per),q=(tt%per)/per,cx0=30+Math.floor(hash(cyc*3+k)*132),cy0=18+Math.floor(hash(cyc*5+k+1)*34),col=['#ffd04a','#ff6a8a','#7ae8f0','#b49af0'][(cyc+k)%4];
  if(q<.22){x.fillStyle='#fff6c0';x.fillRect(cx0,Math.floor(100-(100-cy0)*(q/.22)),1,2);continue;}
  const r=(q-.22)/.78,R0=4+r*16;x.globalAlpha=Math.max(0,1-r*1.1);x.fillStyle=col;for(let j=0;j<14;j++){const a=j/14*6.283;x.fillRect(Math.round(cx0+Math.cos(a)*R0),Math.round(cy0+Math.sin(a)*R0+r*r*6),1,1);}x.globalAlpha=1;}}}
function drawCineFrame(x,fr,t){if(!fr)return;if(fr.kind==='fun'){drawFuneral(x,t);return;}
 const R=S.R,h=R.h,b=fr.kind==='birth'?0:biome(fr.f),hs=heroSpr(CLASSES[h.cls].id,look(h)),bob=t?Math.round(Math.sin(t/260)):0;
 bgDraw(x,b);decoDraw(x,b,h);drawOverlay(x,b,t||0);
 if(fr.kind==='birth'){x.fillStyle='rgba(244,187,74,0.14)';x.fillRect(84,0,24,100);x.fillStyle='#5a4a3a';x.fillRect(80,100,32,4);blit(x,hs,88,84+bob,{key:'h'+hs.id});return;}
 if(fr.kind==='death'){blit(x,PROPS.grave,88,84);x.globalAlpha=.55;blit(x,heroSpr('ghost',look(h)),88,60+(t?Math.round(Math.sin(t/500)*3):0),{key:'ghost'});x.globalAlpha=1;if(fr.v)drawVis(x,fr.v,t,bob);return;}
 if(fr.kind==='win'){R.comps.forEach((c,i)=>{const v=cSpr(c);blit(x,v.s,62-i*16,84+bob,{key:v.k});});R.pets.forEach((p,i)=>{if(PSPR[p])blit(x,PSPR[p],112+i*14,91,{key:'p'+p});});
  x.fillStyle='rgba(244,187,74,0.16)';x.fillRect(84,0,24,100);blit(x,hs,88,84+bob,{key:'h'+hs.id});
  for(let i=0;i<8;i++){const a=(t||0)/700+i*.785;x.fillStyle=i%2?'#fff6c0':'#ffd04a';x.fillRect(96+Math.round(Math.cos(a)*22),80+Math.round(Math.sin(a)*14),1,1);}return;}
 blit(x,hs,52,84+bob,{key:'h'+hs.id});drawVis(x,fr.v,t,bob);}
const cauShort=s=>String(s||'').replace(/\s*\(ชั้น \d+\)\s*$/,'');
function cineSteps(R){const h=R.h,won=R.won,fl=won?100:R.floor,C=CLASSES[h.cls],St=[],hold=(c,u)=>Math.min(3200,2100+(String(c||'').length+String(u||'').length*.4)*20)+420;
 St.push({k:'t',a:`ชีวิตของ ${h.name}`,b:`แรงค์ ${RANKS[h.rank].k} · ${C.n} · จาก${h.village}`,d:2100});
 St.push(won?{k:'t',a:'ขึ้นไปถึงยอดหอคอย',b:'ชั้น 100 · ผู้กลืนดาราล้มลงแล้ว',d:2400}:{k:'t',a:`จากไปที่ชั้น ${fl}`,b:cauShort(R.cause),d:2600});
 {const X=R.sec||{},D=DRG[X.c];if(D&&['f','s','x'].includes(X.res))St.push({k:'t',a:'เหนือยอดหอยังมีชั้นลับอีกชั้น',b:X.res==='f'?`${D.n}ยอมแพ้ แล้วมอบไข่ให้หนึ่งใบ`:X.res==='s'?`${D.n}สิ้นใจบนกองสมบัติของมันเอง`:`${h.name}ไม่ได้เดินลงมาอีกเลย`,d:2600});}
 St.push({k:'t',a:won?'มองลงไปข้างล่าง ทุกชั้นที่ผ่านมายังอยู่ตรงนั้น':'หลับตาลง ภาพทุกชั้นที่ผ่านมาย้อนกลับมาทีละภาพ',b:'',d:2200});
 const fr=[{kind:'birth',f:1,cap:`เกิดที่${h.village}`,sub:`แรงค์ ${RANKS[h.rank].k} · 1 ใน ${fmt(h.odds)}`}];
 (S.mont||[]).slice(0,5).forEach(m=>fr.push({kind:'mom',f:m.f,v:momVis(m),rar:m.rar,cap:m.t,sub:`เลือก "${m.c}"${m.res?` · ${m.res}`:''}`}));
 fr.push(won?{kind:'win',f:100,cap:'ยืนอยู่บนยอดหอคอย',sub:'ลมบนนี้เย็นกว่าที่คิด'}:{kind:'death',f:fl,v:R.death==='boss'?{t:'en',en:{id:BOSSES[biome(fl)].id,boss:true}}:null,cap:cauShort(R.cause)||'ชะตาขาด',sub:BIOMES[biome(fl)]});
 fr.forEach(f=>St.push({k:'m',fr:f,d:hold(f.cap,f.sub)}));
 const M=S.cineM,np=M.filter(m=>!m.pet&&!m.npc&&!m.coh).length,nc=M.filter(m=>m.coh).length,nn=M.filter(m=>m.npc).length,pp=M.filter(m=>m.pet).length;
 const who=[np?`เพื่อนร่วมทาง ${np} คน`:'',nc?`เพื่อนรุ่นเดียวกัน ${nc} คน`:'',nn?`คนที่เคยพบระหว่างทาง ${nn} คน`:'',pp?`สัตว์เลี้ยง ${pp} ตัว`:''].filter(Boolean);
 const wj=who.length>1?who.slice(0,-1).join(' ')+' และ'+who[who.length-1]:who[0]||'';
 St.push(won?{k:'m',fr:{kind:'fun',f:100,cap:`คนที่${h.village}จุดพลุรอรับ${h.name}กลับบ้าน`,sub:wj?`${wj} ขึ้นมายืนบนยอดหอด้วยกัน`:'บนยอดหอมีแค่คุณกับดาวทั้งฟ้า'},d:5600,fun:1}
  :{k:'m',fr:{kind:'fun',f:fl,cap:`ร่างของ${h.name}ถูกฝังไว้ที่เชิงหอคอย`,sub:wj?`${wj} มายืนส่งเป็นครั้งสุดท้าย`:'ไม่มีใครมาส่ง มีแค่ลมที่พัดลงมาจากหอคอย'},d:5600,fun:1});
 const eu=S.eu||{who:'',line:''},pt=S.pat;
 St.push({k:'e',lines:[won?`เกิดที่${h.village} และได้ยืนบนยอดหอคอย`:`เกิดที่${h.village} และหลับลงที่${BIOMES[biome(fl)]} ชั้น ${fl}`,
  `ผ่านไป ${fl} ชั้น เลือกทางเอง ${R.keys} ครั้ง${R.kills?` ปราบมอนสเตอร์ ${fmt(R.kills)} ตัว`:''}`,eu.who?`「${eu.who}」`:'',pt?`ลวดลายชะตา ${patEmo(pt.code)} · ${pt.n}`:''].filter(Boolean),
  close:'หอคอยร้อยชั้นนี้ เดินแบบนี้ได้เพียงครั้งเดียว'});
 return St;}
function cineBuild(){const R=S.R,h=R.h,fl=R.won?100:R.floor;let el=CINE.el;if(el)el.remove();
 el=document.createElement('div');el.className='cine';el.id='cine';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',`ฉากจบชีวิตของ ${h.name}`);
 el.innerHTML=`<button type="button" class="cskip" id="cSkip">ข้าม ⏭</button><div class="cstage">
  <div class="ct" aria-live="polite"><div class="cta"></div><div class="ctb"></div></div>
  <div class="cm"><div class="cfr"><canvas width="384" height="256"></canvas><canvas width="384" height="256"></canvas></div><div class="cfl px"></div><div class="ccap" aria-live="polite"></div><div class="csub"></div>
   <div class="cstrip" aria-hidden="true">${Array.from({length:100},(_,i)=>`<i${(i+1)%10===0?' class="b"':''}></i>`).join('')}</div></div>
  <div class="ce"><div class="cen">${esc(h.name)}</div><div class="cey px">ชั้น 1 – ชั้น ${fl}</div><div class="cel"></div><div class="cec"></div><button type="button" class="btn pri cgo" id="cGo">ดูบันทึก</button></div></div>`;
 document.body.appendChild(el);CINE.el=el;CINE.cv=[...el.querySelectorAll('.cfr canvas')].map(c=>{const x=c.getContext('2d');x.setTransform(2,0,0,2,0,0);x.imageSmoothingEnabled=false;return{c,x};});
 el.querySelector('#cSkip').onclick=e=>{e.stopPropagation();cineSkip();};el.querySelector('#cGo').onclick=e=>{e.stopPropagation();cineClose();};
 el.addEventListener('click',e=>{if(e.target.closest('button,a,details'))return;cineTap();});
 return el;}
function cineMode(m){CINE.el.dataset.mode=m;}
function reanim(n){if(!n)return;n.classList.remove('in');void n.offsetWidth;n.classList.add('in');}
function cineStrip(f,dead){const cells=CINE.el.querySelectorAll('.cstrip i'),R=S.R,a=CINE.lit,n=Math.max(1,f-a);
 for(let j=a;j<f&&j<100;j++){const c=cells[j];c.style.transitionDelay=RM?'0s':(((j-a)/n)*.8).toFixed(2)+'s';const m=R.map[j];c.style.background=m&&m!=='calm'&&m!=='farm'?(MAPC[m]||'#d8c89a'):'#d8c89a';c.classList.add('on');}
 if(dead&&cells[f-1])cells[f-1].classList.add('dead');CINE.lit=Math.max(a,f);}
function cineShow(s){const el=CINE.el;
 if(s.k==='t'){cineMode('t');el.querySelector('.cta').textContent=s.a;el.querySelector('.ctb').textContent=s.b||'';reanim(el.querySelector('.ct'));return;}
 if(s.k==='m'){cineMode(s.fun?'f':'m');const fr=s.fr,nx=1-CINE.cur,N=CINE.cv[nx];CINE.fr[nx]=fr;drawCineFrame(N.x,fr,performance.now());N.c.classList.add('on');CINE.cv[CINE.cur].c.classList.remove('on');CINE.cur=nx;
  el.querySelector('.cfl').textContent=fr.kind==='fun'?(S.R.won?'ยอดหอคอย':'เชิงหอคอย'):`ชั้น ${fr.f}`;el.querySelector('.ccap').textContent=fr.cap||'';el.querySelector('.csub').textContent=fr.sub||'';
  el.querySelector('.cfr').classList.toggle('leg',fr.rar==='l');reanim(el.querySelector('.ccap'));reanim(el.querySelector('.csub'));reanim(el.querySelector('.cfl'));
  if(fr.kind!=='fun')cineStrip(fr.f,fr.kind==='death');
  if(s.fun){if(!sting('funeral'))AUDIO.sfx('death');clearTimeout(CINE.hushT);CINE.hushT=setTimeout(()=>{try{AUDIO.hush&&AUDIO.hush(true);}catch(e){}},6200);}
  return;}
 if(s.k==='e'){cineMode('e');const L=el.querySelector('.cel');L.innerHTML=s.lines.map(t=>`<div>${esc(t)}</div>`).join('');el.querySelector('.cec').textContent=s.close;
  const rows=[...L.children,el.querySelector('.cec'),el.querySelector('#cGo')];CINE.epT.forEach(clearTimeout);CINE.epT=[];CINE.epN=rows.length;
  rows.forEach((r,i)=>{r.classList.remove('vis');CINE.epT.push(setTimeout(()=>{r.classList.add('vis');if(r.id==='cGo')try{r.focus({preventScroll:true});}catch(e){}},500+i*900));});}}
function cineGo(i){clearTimeout(CINE.tm);const s=CINE.steps[i];if(!s){cineClose();return;}CINE.i=i;CINE.st=performance.now();cineShow(s);if(s.d)CINE.tm=setTimeout(()=>cineGo(i+1),s.d);}
function cineTap(){if(!CINE.on||CINE.static)return;if(performance.now()-CINE.st<900)return;const s=CINE.steps[CINE.i];
 if(s&&s.k==='e'){CINE.epT.forEach(clearTimeout);CINE.epT=[];CINE.el.querySelectorAll('.cel div,.cec,#cGo').forEach(r=>r.classList.add('vis'));try{CINE.el.querySelector('#cGo').focus({preventScroll:true});}catch(e){}return;}
 cineGo(CINE.i+1);}
function cineSkip(){const b=CINE.el&&CINE.el.querySelector('#cSkip');if(!b)return;if(CINE.arm){cineClose();return;}
 CINE.arm=1;b.textContent='แตะอีกครั้งเพื่อข้าม';b.classList.add('arm');clearTimeout(CINE.armT);CINE.armT=setTimeout(()=>{CINE.arm=0;b.textContent='ข้าม ⏭';b.classList.remove('arm');},3000);}
function cineLoop(t){CINE.raf=requestAnimationFrame(cineLoop);if(t-(CINE.lt||0)<50)return;CINE.lt=t;
 CINE.cv.forEach((v,i)=>{if(CINE.fr[i]&&(i===CINE.cur||t-CINE.st<500))try{drawCineFrame(v.x,CINE.fr[i],t);}catch(e){}});}
// prefers-reduced-motion: no timers or crossfades, everything laid out as one still page
function cineStatic(){const el=CINE.el;CINE.static=true;el.dataset.mode='s';el.classList.add('static');const st=el.querySelector('.cstage'),s=CINE.steps;
 const T=s.filter(x=>x.k==='t'),F=s.filter(x=>x.k==='m'),E=s.find(x=>x.k==='e');
 const list=document.createElement('div');list.className='cslist';
 list.innerHTML=T.map(x=>`<div class="cst"><b>${esc(x.a)}</b>${x.b?`<span>${esc(x.b)}</span>`:''}</div>`).join('')+F.map((x,i)=>`<figure class="csf"><canvas width="384" height="256" data-i="${i}"></canvas><figcaption><span class="px">${x.fr.kind==='fun'?(S.R.won?'ยอดหอคอย':'เชิงหอคอย'):'ชั้น '+x.fr.f}</span><b>${esc(x.fr.cap||'')}</b><span>${esc(x.fr.sub||'')}</span></figcaption></figure>`).join('');
 st.querySelector('.ct').remove();st.querySelector('.cm').remove();st.insertBefore(list,st.firstChild);
 list.querySelectorAll('canvas').forEach(c=>{const x=c.getContext('2d');x.setTransform(2,0,0,2,0,0);x.imageSmoothingEnabled=false;try{drawCineFrame(x,F[+c.dataset.i].fr,0);}catch(e){}});
 el.querySelector('.cel').innerHTML=E.lines.map(t=>`<div class="vis">${esc(t)}</div>`).join('');const cc=el.querySelector('.cec');cc.textContent=E.close;cc.classList.add('vis');el.querySelector('#cGo').classList.add('vis');}
function cineKey(e){if(!CINE.on)return;const k=e.key;if(k==='Tab')return;e.stopPropagation();
 if(k==='Escape'||k==='Esc'){e.preventDefault();cineClose();return;}
 if(k==='Enter'||k===' '||k==='Spacebar'||k==='ArrowRight'){e.preventDefault();const s=CINE.steps[CINE.i];const go=CINE.el.querySelector('#cGo');
  if(CINE.static||(s&&s.k==='e'&&go.classList.contains('vis'))){if(k==='Enter'||k===' ')cineClose();return;}cineTap();return;}
 if(/^[1-4]$/.test(k))e.preventDefault();}
window.addEventListener('keydown',cineKey,true);
function cineStart(){const R=S.R;if(!R)return false;S.cineM=cineMourners(R);S.cineRain=!R.won&&((R.won?100:R.floor)<30||!!SUDDEN[R.ck]||!S.cineM.length||R.karma<-8);
 CINE.steps=cineSteps(R);CINE.i=-1;CINE.cur=0;CINE.lit=0;CINE.fr=[null,null];CINE.arm=0;CINE.static=false;CINE.on=true;S.cineOn=true;
 cineBuild();const w=document.querySelector('.wrap');if(w)w.inert=true;endBar(false);
 try{AUDIO.hush&&AUDIO.hush(true);}catch(e){}
 if(RM)cineStatic();else{cineGo(0);CINE.raf=requestAnimationFrame(cineLoop);}
 try{CINE.el.querySelector(RM?'#cGo':'#cSkip').focus({preventScroll:true});}catch(e){}
 requestAnimationFrame(()=>CINE.el&&CINE.el.classList.add('open'));return true;}
function cineClose(quiet){if(!CINE.on)return;if(!quiet&&bxTry())return;CINE.on=false;clearTimeout(CINE.tm);clearTimeout(CINE.armT);clearTimeout(CINE.hushT);CINE.epT.forEach(clearTimeout);CINE.epT=[];cancelAnimationFrame(CINE.raf);
 const el=CINE.el;CINE.el=null;if(el){el.classList.remove('open');el.classList.add('closing');setTimeout(()=>el.remove(),RM?0:320);}
 const w=document.querySelector('.wrap');if(w)w.inert=false;try{AUDIO.hush&&AUDIO.hush(false);}catch(e){}
 if(!S)return;S.cineOn=false;S.cineDone=true;if(quiet||S.phase!=='end')return;
 try{window.scrollTo({top:0,behavior:'auto'});}catch(e){}renderEnd();focusPrimary();}

function renderEnd(){const R=S.R,h=R.h,C=CLASSES[h.cls],won=R.won,fl=won?100:R.floor;clearTimeout(S.tm);clearInterval(cdI);
 if(!S.saved){S.fresh=saveSeen(R);S.title=runTitle(R);S.mont=montage(R);S.lg=ledgerRoll(R);S.eu=eulogy(R);}
 if(!S.saved){S.saved=true;finalizeRun();}
 if(!S.cmp)S.cmp=hazardSample(2000);
 if(!S.pat)try{S.pat=fatePattern(R);}catch(e){S.pat=null;}
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
 const cohH=cohHTML(R,coh,fl);
 const DT=dayOf(h),dHit=!!DT&&dayHit(R);
 const dayH=DT?`<div class="daybox end" data-tip="day"><span class="ok">หัวข้อวันนี้</span> <b>${esc(DT.n)}</b><br>${dHit?`ชีวิตนี้ได้เจอ${esc(DT.hn)}`:`ชีวิตนี้ไม่ได้เจอ${esc(DT.hn)}`}<span id="dayStat">${esc(S.dayStat||'')}</span></div>`:'';
 const share=!!(window.SHARE&&window.SHARE.open),lb=!!(window.LB&&window.LB.open);
 card.innerHTML=`<div class="epi"><div class="tag">${won?'ตำนานบทใหม่':'แผ่นจารึกหน้าหลุมศพ'}</div><div class="big">${won?'👑 ':'✝ '}${esc(h.name)}</div><div class="rtitle${S.title.gold?' gold':''}">ฉายา: ${esc(S.title.t)}</div>
 <dl class="kv"><dt>แรงค์/อาชีพ</dt><dd>${RANKS[h.rank].k} · ${R.turned?esc(clsName(R.turned.from)):C.n} (1 ใน ${fmt(h.odds)})</dd>${R.turned?`<dt>เปลี่ยนร่าง</dt><dd>จาก${esc(clsName(R.turned.from))}เป็น${esc(C.n)} ที่ชั้น ${R.turned.f}</dd>`:''}${R.unl?`<dt>ปลดล็อก</dt><dd>ชีวิตต่อไปมีโอกาสเกิดเป็น${esc(clsName(R.unl))}</dd>`:''}${pathOf(R)?`<dt>ทางของอาชีพ</dt><dd><span data-tip="path">${esc(pathOf(R).n)}</span> · ${R.pathHi?`ขั้นสูงสุด "${esc(pathHiName(R))}"`:'ยังไม่ถึงขั้นแรก'} · ${Math.floor(R.path||0)} แต้ม</dd>`:''}${crownArch(R)?`<dt>ชิงตำแหน่ง</dt><dd>「${esc(crownArch(R).t)}」 ${esc(crownArch(R).d)}</dd>`:''}<dt>ชั้นที่ไปถึง</dt><dd class="px">${fl} / 100</dd><dt>เลเวล</dt><dd class="px">${h.lv}</dd>
 <dt>${won?'ผลลัพธ์':'สาเหตุการตาย'}</dt><dd>${esc(won?'พิชิตผู้กลืนดาราและยืนบนยอดหอคอย':R.cause)}</dd>${secSum(R)?`<dt>ชั้นลับ</dt><dd>${esc(secSum(R))}</dd>`:''}${CLAN_T[R.clanM]?`<dt>ตระกูล</dt><dd><span data-tip="clan">${CLAN_T[R.clanM]}</span>${R.clanM==='s'?` · ต้องล้มมังกรอีก ${3-(R.clanN|0)} ตัวคำสาปจึงจะคลาย`:''}</dd>`:''}${excRow(R)}<dt>ดวงชะตา</dt><dd>${esc(fateLine(R))}</dd>
 <dt>จุดเปลี่ยน</dt><dd>${R.keys} ครั้ง${R.timeouts?` · ปล่อยให้นิสัย${esc(PERS[h.pers].n)}เลือกแทน ${R.timeouts} ครั้ง`:''}${R.sameN+R.plainN?` · ตอบไปเองโดยไม่ต้องหยุด ${R.sameN+R.plainN} ครั้ง`:''}</dd><dt>ทองที่ทิ้งไว้</dt><dd class="px">${fmt(h.gold)}</dd>
 <dt>ปาร์ตี้</dt><dd>${[...R.pets.map(p=>PETS[p].n),...R.comps.map(c=>c.n+' ('+clsName(c.cls)+')')].join(', ')||'เดินทางคนเดียว'}</dd>
 <dt>กรรม</dt><dd class="px" style="color:var(--karma)">${R.karma>0?'+':''}${R.karma} ${R.karma>=0?'กรรมดี':'กรรมชั่ว'}</dd></dl>
 <div class="judge">${judge(R.karma)}</div></div>
 ${certH}
 ${patHTML(S.pat)}
 ${dayH}
 ${share||lb?`<div class="acts endacts" style="margin-top:0">${share?'<button class="btn shr" id="btnShare" type="button">📤 แชร์ชีวิตนี้<small>การ์ด + ลิงก์ให้เพื่อนมาลองบ้าง</small></button>':''}${lb?'<button class="btn" id="btnLB2" type="button">🏆 อันดับ & ความสำเร็จ</button>':''}</div>`:''}
 ${ledgerHTML(R)}
 ${S.mont.length?`<h2>ช่วงเวลาที่ยังจำได้</h2><ol class="mont">${S.mont.map(m=>`<li class="${m.rar}"><span class="px">${m.f}F</span><span><b>${esc(m.t)}</b> · เลือก "${esc(m.c)}"${m.res?`<br><span class="x">${esc(m.res)}</span>`:''}</span></li>`).join('')}</ol>`:''}
 ${cohH}
 <p class="dim" style="font-size:12px;margin:6px 0 10px">ดวงประจำชาติ: ${esc(omenOf(h).n)}${S.fresh?` · ชาตินี้เจอเรื่องที่ไม่เคยเจอมาก่อน ${S.fresh} เรื่อง`:''}</p>
 <h2>แผนที่การไต่หอ</h2><div class="grid100">${cells}</div>
 <div class="legend">${Object.keys(MAPN).map(k=>`<span><i style="background:${MAPC[k]}"></i>${MAPN[k]}</span>`).join('')}<span><i style="background:#2a6a5a"></i>จุดเขียว = ฟาร์ม</span></div>
 <h2 style="margin-top:12px">เทียบกับนักผจญภัย 2,000 คนที่ทอยชะตาจากตารางเดียวกัน</h2>${cmpH}`;
 // heir / reborn sit right under the scene so they can be pressed without scrolling down the card
 const SA=$('sceneActs');SA.innerHTML=`<div class="acts endacts"><button class="btn pri" id="btnHeir" data-k="1" data-enter data-tip="lineage">สืบทอดโดยลูกศิษย์ ↗<span class="kb">[Enter]</span></button><button class="btn" id="btnReborn" data-k="2" data-tip="reborn">เกิดใหม่ ↻<span class="kb">[2]</span></button></div>
 <p class="dim">ลูกศิษย์ได้ทอง ${fmt(Math.min(600,Math.round(h.gold*.3)))}${R.pets.length?` กับ${esc(PETS[R.pets[0]].n)}`:''} และรับกรรมของคุณไปบางส่วน · เกิดใหม่ได้เริ่มสายใหม่ แต่กรรมชาตินี้จะติดไปกับดวงเกิดนิดหน่อย</p>`;SA.hidden=false;
 const P={name:h.name,village:h.village,gen:h.gen||1,lin:h.lin,house:h.house||h.name,gold:h.gold,pet:R.pets[0]||null,karma:R.karma};
 $('btnHeir').onclick=()=>newBirth({heir:P});
 $('btnReborn').onclick=()=>newBirth({kShift:clamp(R.karma/5,-6,6),prev:{name:h.name}});
 const L=S.lg,LI=lookInfo(h);
 const sum={name:h.name,village:h.village,rankK:RANKS[h.rank].k,rankIdx:h.rank,rankCol:RANKS[h.rank].col,clsId:C.id,clsN:C.n,pathN:pathHiName(R)||'',turn:R.turned?clsName(R.turned.from):'',look:look(h),form:look(h).form,floor:R.sec&&R.sec.win?101:fl,won,title:S.title.t,cause:won?'พิชิตยอดหอคอย':R.cause,
  odds:combOdds(h),pct,karma:R.karma,score:L.score,themeId:R.theme||S.themeId||'',gen:h.gen||1,pets:[...R.pets],comps:R.comps.map(c=>c.n),kills:R.kills,bosses:R.bosses,scars:R.scars,keyMoments:R.keys,timeouts:R.timeouts,
  stanceHist:R.stH||'',durationMs:S.t0?Date.now()-S.t0:0,date:Date.now(),lookName:LI.n,
  tk:R.net&&R.net.tk||'',sid:R.net&&R.net.sid||'',day:h.day&&h.day.d||'',dh:dHit?1:0,
  drg:R.sec&&['n','f','s','x'].includes(R.sec.res)?R.sec.res:'',drgC:R.sec&&R.sec.res&&DRG[R.sec.c]?R.sec.c:'',clan:R.clanM||'',lift:!!R.lift,
  pathHi:R.pathHi||0,turned:R.turned?1:0,rez:R.rez?1:0,sneaks:R.sneaks||0,caught:R.caught||0,cw:R.cw&&R.cw.id===C.id?{n:R.cw.n||0,won:R.cw.won?1:0,how:R.cw.how||'',caught:R.cw.caught||0,paid:R.cw.paid||''}:null,
  twN:Object.keys(R.used).filter(k=>k.startsWith('sp:tw_')).length,facW:(R.fac&&R.fac.h||[]).filter(x=>x.me===1).length,facB:(R.fac&&R.fac.h||[]).filter(x=>x.b).length,ltG:R.ltG||0,
  dz:R.dZ&&R.dZ.in?(dayZone(R)&&fl>dayZone(R).b?2:1):0,sn:Object.keys(R.sn||{}),stE:Object.keys(R.stE||{}).length,
  exT:R.exT|0,exG:!!R.exc,sw:hasSw(R),gear:hasSw(R)?['excal']:[]};
 if(!S.sent){S.sent=true;try{window.ACH&&window.ACH.onRunEnd&&window.ACH.onRunEnd(sum);}catch(e){}try{window.LB&&window.LB.submit&&window.LB.submit(sum);}catch(e){}
  // day stats come back a moment after this run was submitted
  if(DT&&h.day&&window.LB&&window.LB.live){const run=S.runId;setTimeout(()=>window.LB.live.get(h.day.d).then(g=>{const d=g&&g.day;if(!d||!d.n||!S||S.runId!==run)return;
   S.dayStat=` · จาก ${fmt(d.n)} คนที่เข้าหอวันนี้ ${Math.round(d.h/d.n*100)}% ได้เจอเรื่องนี้ ${dHit?'ชีวิตนี้เป็นหนึ่งในนั้น':'ชีวิตนี้ไม่ได้อยู่ในกลุ่มนั้น'}`;const el=$('dayStat');if(el)el.textContent=S.dayStat;}),3500);}}
 S.shareD=shareData(R,sum,{pct,med,coh,beat});
 {const a=crownArch(R);if(a){S.shareD.arch=a.t;S.shareD.hk.crown=a.d;}}
 const bs=$('btnShare');if(bs)bs.onclick=()=>openShare(false);
 endBar(share);
 // first visit to the end screen plays the cinematic over it; "ดูบันทึก" (or skip) re-renders this screen
 if(!S.cineDone&&!CINE.on){let ok=false;try{ok=cineStart();}catch(e){ok=false;}if(!ok){CINE.on=true;cineClose(true);}}
 const bl=$('btnLB2');if(bl)bl.onclick=()=>{try{window.LB.open();}catch(e){}};
 try{gwMount(R);}catch(e){}
 memoBtn();
 renderMemo();}
// ---- v2.7 after death (1in8b REA v3): wishes left undone, the days given to them (kept in the memorial), and a scene nobody saw ----
// A wish = {k, t: name of the day, m: what was missing, w: handwritten line, + scene fields for ART.drawWish}. Free, no card needed.
const GW_MAX=3,GW_TILT=[-2,1.5,-1];
const gwC=c=>({n:c.n,cls:c.cls,tr:c.tr,legend:!!c.legend});
// companions and pets that walked with the hero at some point but were gone by the end (left, betrayed, released...)
function gwLost(R){const g=isObj(R.gwS)?R.gwS:{},gc=isObj(g.c)?g.c:{},gp=isObj(g.p)?g.p:{},now=new Set(R.comps.map(c=>c.n)),bt={};
 R.log.forEach(l=>{const m=/^(.+?)ทรยศ!/.exec(l.t||'');if(m)bt[m[1]]=1;});
 const cs=Object.keys(gc).filter(n=>!now.has(n)&&isObj(gc[n])).map(n=>Object.assign({n},gc[n],{bt:!!bt[n]})).sort((a,b)=>b.bt-a.bt);
 return{cs,ps:Object.keys(gp).filter(p=>PETS[p]&&!R.pets.includes(p))};}
// checked in this order, the first three that fit are shown
function gwList(R){const h=R.h,won=R.won,fl=won?100:R.floor,b=biome(fl),L=gwLost(R),nm=h.name,W=[];
 const add=(k,o)=>W.push(Object.assign({k,b,hc:CLASSES[h.cls].id,lk:look(h),cs:R.comps.slice(0,2).map(gwC),ps:R.pets.slice(0,2)},o));
 if(L.cs.length){const c=L.cs.slice(0,3),bt=c.find(x=>x.bt);
  add('meal',{cs:c.map(gwC),t:'มื้อเย็นที่ได้พร้อมหน้ากันอีกครั้ง',m:bt?`${bt.n}ทรยศกลางทาง ไม่มีใครได้นั่งกินข้าวด้วยกันอีก`:`${c.map(x=>x.n).join(' กับ ')}แยกทางไปก่อนถึงวันสุดท้าย`,w:'วันนั้นไม่มีใครต้องรีบลุกไปไหน'});}
 if(L.ps.length){const p=L.ps[0],n=PETS[p].n;add('pet',{ps:[p],t:`วันที่ได้เล่นกับ${n}อีกครั้ง`,m:`${n}ไม่ได้อยู่ด้วยกันจนถึงวันสุดท้าย`,w:'โยนลูกบอลไปกี่ครั้ง มันก็วิ่งคาบกลับมาทุกครั้ง'});}
 if(R.egg&&!won)add('egg',{eg:PETK[shash(nm)%PETK.length],t:'วันที่ไข่ฟัก',m:'อุ้มไข่มาตลอดทาง แต่ไม่ทันได้เห็นมันฟัก',w:'หน้าแรกที่มันเห็นคือหน้าเรา'});
 if(isObj(h.inh)&&h.inh.from)add('mst',{t:`วันที่ได้เล่าให้${h.inh.from}ฟัง`,m:`อาจารย์${h.inh.from}ไม่ได้เห็นว่าศิษย์ไปถึงชั้น ${fl}`,w:'อาจารย์พยักหน้าครั้งเดียว ไม่ได้พูดอะไรเลย'});
 if(R.death==='boss'&&!won){const B=BOSSES[b];add('boss',{bo:B.id,t:`วันที่ล้ม${B.n}ได้`,m:`ล้มลงต่อหน้า${B.n}ที่ชั้น ${fl}`,w:'ครั้งนี้มันเป็นฝ่ายถอยก่อน'});}
 if(R.scars>=2)add('rest',{t:'วันที่ได้พักจนแผลหายดี',m:`มีแผลเป็น ${R.scars} แผล ยังไม่ทันหายก็ต้องเดินต่อ`,w:'หลับยาวถึงเที่ยง ไม่มีใครมาปลุก'});
 if(h.gold>=400*scl(fl)/2)add('gold',{t:'วันที่ได้ใช้ทองที่เก็บไว้',m:`ทองเหลืออยู่ ${fmt(h.gold)} เหรียญ ไม่ได้ใช้สักเหรียญ`,w:'ซื้อขนมแจกเด็กทั้งหมู่บ้าน'});
 if(!won)add('top',{t:'วันที่ได้ยืนบนชั้น 100',m:`ไปถึงชั้น ${fl} ยังเหลืออีก ${100-fl} ชั้น`,w:'ลมบนยอดหอเย็นกว่าที่คิด'});
 if(!won)add('home',{t:`วันที่ได้กลับ${h.village}`,m:'ออกจากบ้านมาแล้วไม่ได้กลับไปอีก',w:'ที่บ้านยังเว้นที่ไว้ให้ที่โต๊ะ'});
 if((h.gen||1)<=1)add('apr',{t:'วันที่ได้สอนศิษย์คนแรก',m:'ยังไม่เคยมีใครเรียกว่าอาจารย์',w:'ศิษย์จับดาบกลับด้าน แต่ยิ้มกว้างมาก'});
 return W.slice(0,GW_MAX);}
// end screen block: polaroids in sepia; "มอบให้" turns one to colour, keeps it in the memorial and offers the 1080x1350 card
function gwMount(R){if(!S.gw)S.gw=gwList(R);const W=S.gw,G=S.gwG||(S.gwG={});if(!W.length)return;const old=card.querySelector('.gw');if(old)old.remove();
 const sec=document.createElement('section');sec.className='gw';sec.setAttribute('aria-labelledby','gwH');
 sec.innerHTML=`<h2 id="gwH">ความปรารถนาที่ค้างไว้</h2><p class="gwl">สิ่งที่${esc(R.h.name)}ไม่ทันได้ทำ กด "มอบให้" แล้วเราจะวาดวันนั้นให้</p><div class="gws">${W.map((w,i)=>`<figure class="gwc${G[w.k]?' on':''}" style="--r:${GW_TILT[i]||0}deg"><div class="gwp"><canvas width="300" height="200" aria-hidden="true"></canvas></div><figcaption><b>${esc(w.t)}</b><span>${esc(w.m)}</span><i class="gwh"${G[w.k]?'':' hidden'}>${esc(w.w)}</i></figcaption><button type="button" class="btn gwb" data-i="${i}">${G[w.k]?'📤 แชร์วันนี้':'มอบให้'}</button></figure>`).join('')}</div><p class="gwmsg" role="status" aria-live="polite"></p>`;
 const A=card.querySelectorAll('.endacts'),at=A[A.length-1];if(at&&at.parentNode)at.parentNode.insertBefore(sec,at.nextSibling);else card.appendChild(sec);
 sec.querySelectorAll('canvas').forEach((c,i)=>gwPaint(c,W[i]));
 sec.querySelectorAll('.gwb').forEach(b=>b.onclick=()=>{const w=W[+b.dataset.i];if(!w)return;if(G[w.k]){gwShare(w);return;}G[w.k]=1;gwKeep(R,w);ach('gw',{k:w.k});
  const f=b.closest('.gwc');f.classList.add('on');f.querySelector('.gwh').hidden=false;b.textContent='📤 แชร์วันนี้';
  const m=sec.querySelector('.gwmsg');if(m)m.textContent=`มอบ「${w.t}」ให้${R.h.name}แล้ว เก็บไว้ที่หลุมศพในสุสานด้วย`;});}
function gwShare(w){if(!S||!S.shareD||!window.SHARE||!window.SHARE.openGift)return;try{window.SHARE.openGift(Object.assign({},S.shareD,{note:'',date:Date.now(),gift:w}));}catch(e){}}
// the memorial keeps scene data only (no pictures); the grave redraws it
function gwKeep(R,w){const h=R.h,fl=R.won?100:R.floor;
 try{const a=loadMemo(),i=a.findIndex(m=>isObj(m)&&m.name===h.name&&m.floor===fl&&m.lv===h.lv);if(i<0)return;const g=isArr(a[i].gw)?a[i].gw.filter(isObj):[];
  if(g.length>=GW_MAX||g.some(x=>x.k===w.k))return;g.push(Object.assign({},w));a[i].gw=g;localStorage.setItem(MKEY,JSON.stringify(a));}catch(e){}
 renderMemo();}
// grave rows: a "วันที่มอบให้" button opens a strip of small pictures under the row
function memoGw(show){const rows=$('memo').querySelectorAll('.row');
 rows.forEach((r,i)=>{const m=show[i],g=m&&isArr(m.gw)?m.gw.filter(isObj).slice(0,GW_MAX):[];if(!g.length)return;
  const b=document.createElement('button');b.type='button';b.className='mgwb';b.textContent=`🕯 วันที่มอบให้ ${g.length}`;b.setAttribute('aria-expanded','false');
  const box=document.createElement('div');box.className='mgw';box.hidden=true;(r.children[1]||r).appendChild(b);r.after(box);
  b.onclick=()=>{const op=box.hidden;box.hidden=!op;b.setAttribute('aria-expanded',op?'true':'false');
   if(op&&!box.childElementCount){box.innerHTML=g.map(w=>`<figure><canvas width="300" height="200" aria-hidden="true"></canvas><figcaption>${esc(w.t||'')}</figcaption></figure>`).join('');
    box.querySelectorAll('canvas').forEach((c,j)=>gwPaint(c,g[j]));}};});}
// still picture of a wish, cropped a little closer to the people (the share card uses the same crop)
let gwOff=null;
function gwPaint(c,w){try{if(!gwOff){gwOff=document.createElement('canvas');gwOff.width=384;gwOff.height=256;}const o=gwOff.getContext('2d'),x=c.getContext('2d');o.setTransform(2,0,0,2,0,0);o.imageSmoothingEnabled=false;x.imageSmoothingEnabled=false;
 o.clearRect(0,0,192,128);window.ART.drawWish(o,w,0);x.clearRect(0,0,c.width,c.height);x.drawImage(gwOff,44,52,300,200,0,0,c.width,c.height);}catch(e){}}
// after the epitaph: one short scene nobody saw (10-15 s, skippable, never under reduced motion)
function bxPick(R){const h=R.h,won=R.won,fl=won?100:R.floor,nm=h.name,L=gwLost(R);
 if(R.egg&&!won)return{k:'egg',eg:PETK[shash(nm)%PETK.length],a:`คืนนั้นไม่มีใครอยู่ที่หลุมศพของ${nm}`,b:`ไข่ที่${nm}อุ้มมาตลอดทางฟักออกตรงนั้นเอง`};
 if(R.pets.length&&!won){const p=R.pets[0];return{k:'wait',p,a:`ไม่มีใครเห็นตอนที่${PETS[p].n}เดินกลับขึ้นไปชั้น ${fl}`,b:`มันไปนั่งรอตรงที่${nm}ล้มลงทุกเย็น เผื่อจะมีใครเดินกลับมา`};}
 const bt=L.cs.find(c=>c.bt);if(bt)return{k:'thief',c:gwC(bt),a:`${bt.n}เอาทองที่ขโมยไปนั่งดื่มที่โรงเตี๊ยม`,b:'สั่งมาสองแก้วทุกครั้ง อีกแก้ววางไว้เฉยๆ ไม่มีใครแตะ'};
 if(R.comps.length&&!won){const c=R.comps[0];return{k:'carve',c:gwC(c),a:`คืนหนึ่ง${c.n}แอบกลับขึ้นไปชั้น ${fl}`,b:`แล้วสลักชื่อ${nm}ไว้บนกำแพงตรงนั้น ตัวหนังสือเบี้ยวไปหน่อย`};}
 if(won)return{k:'nap',a:`ก่อนเดินลงจากยอดหอ ${nm}ขอนั่งพักแป๊บเดียว`,b:'แล้วเผลอหลับยาวจนเช้า เรื่องนี้ไม่มีใครรู้'};
 return{k:'slime',a:`สไลม์ตัวหนึ่งที่ชั้น ${fl} คาบดาบของ${nm}ไป`,b:'ทุกวันนี้มันใช้ดาบเล่มนั้นแคะฟัน'};}
function drawBx(x,B,t){const R=S.R,h=R.h,fl=R.won?100:R.floor,b=biome(fl),A=window.ART,T=performance.now(),bob=Math.round(Math.sin(t/260));
 const go=(x0,x1,t0,d)=>Math.round(x0+(x1-x0)*clamp((t-t0)/d,0,1)),hop=(t0,d)=>t>t0&&t<t0+d?-Math.abs(Math.round(Math.sin(t/90)*2)):0;
 const room=()=>{bgDraw(x,b);decoDraw(x,b,h);drawOverlay(x,b,T);};
 if(B.k==='egg'){A.funeralDraw(x,false);blit(x,A.STONE,90,86,{key:'stone',noShadow:true});[[80,94],[106,94]].forEach(([X,Y],i)=>A.drawCandle(x,X,Y,T,i));
  if(t<7000){const sh=t>3000?Math.round(Math.sin(t/(t>5500?30:60))):0;blit(x,PROPS.egg,118+sh,94,{noShadow:true});}
  else{x.fillStyle='#e8e0c8';x.fillRect(115,99,5,3);x.fillRect(125,99,5,3);if(PSPR[B.eg])blit(x,PSPR[B.eg],118,91+hop(7000,900),{key:'p'+B.eg});if(t>8800)blit(x,ICONS.heart,120,78+Math.round(Math.sin(t/400)*2),{noShadow:true});}return;}
 if(B.k==='wait'){room();blit(x,ICONS.sword,100,94,{noShadow:true});const X=go(-12,86,300,3800);if(PSPR[B.p])blit(x,PSPR[B.p],X,91+hop(300,3800),{key:'p'+B.p});
  if(t>7000){const q=clamp((t-7000)/2500,0,1);x.fillStyle=`rgba(255,240,200,${.10*q})`;x.fillRect(0,0,192,128);}return;}
 if(B.k==='thief'){A.homeDraw(x,'night');const s=cSpr(B.c);blit(x,s.s,66,84+bob,{key:s.k});
  x.fillStyle='#6a4a2a';x.fillRect(58,94,64,3);x.fillStyle='#4a321c';x.fillRect(62,97,3,6);x.fillRect(115,97,3,6);
  const lift=t>6000&&t<7400?2:0;x.fillStyle='#c8a050';x.fillRect(84,89-lift,4,5);x.fillRect(106,89,4,5);x.fillStyle='#f4e8c0';x.fillRect(84,89-lift,4,1);x.fillRect(106,89,4,1);
  for(let i=0;i<3;i++)blit(x,COIN,92+i*5,90,{noShadow:true});return;}
 if(B.k==='carve'){room();const s=cSpr(B.c),X=go(-16,96,200,2800);blit(x,s.s,X,84+(t<3000?hop(200,2800):bob),{key:s.k});
  const n=t>3400?Math.min(14,Math.floor((t-3400)/420)):0;x.fillStyle='#d8d0b8';for(let i=0;i<n;i++){const cx0=118+Math.floor(i/2)*5,cy=60+Math.floor(hash(i*7)*3);if(i%2)x.fillRect(cx0,cy+2,3,1);else x.fillRect(cx0+1,cy,1,5);}return;}
 if(B.k==='nap'){A.funeralDraw(x,true);const hs=heroSpr(CLASSES[h.cls].id,look(h));blit(x,hs,88,84,{key:'h'+hs.id});R.pets.forEach((p,i)=>{if(PSPR[p])blit(x,PSPR[p],108+i*14,91,{key:'p'+p});});
  x.fillStyle='#e8f2ff';for(let i=0;i<3;i++){const q=((t/1600)+i/3)%1,X=104+Math.round(q*14),Y=78-Math.round(q*22),s2=2+i%2;x.globalAlpha=1-q;x.fillRect(X,Y,s2,1);x.fillRect(X+s2-1,Y+1,1,1);x.fillRect(X,Y+s2-1,s2,1);}x.globalAlpha=1;return;}
 room();const sl=MSPR.slime;const out=t>6200,X=out?go(116,200,6200,3000):go(196,116,300,3200);if(!out&&t<=3500)blit(x,ICONS.sword,100,94,{noShadow:true});
 if(sl)blit(x,sl,X,84+hop(out?6200:300,3000),{flip:out,key:'slime'+(out?'f':'')});if(out||t>3500){if(!out)blit(x,ICONS.sword,X+4,78,{noShadow:true});else blit(x,ICONS.sword,X+4,78+hop(6200,3000),{noShadow:true});}}
function bxTry(){if(RM||CINE.static||!CINE.el||CINE.bxS===S||!S||!S.R)return false;const s=CINE.steps[CINE.i];if(!s||s.k!=='e')return false;
 let B=null;try{B=bxPick(S.R);}catch(e){B=null;}if(!B)return false;CINE.bxS=S;ach('credits',{});
 try{CINE.epT.forEach(clearTimeout);CINE.epT=[];clearTimeout(CINE.tm);cancelAnimationFrame(CINE.raf);
  const el=CINE.el,bx=document.createElement('div');bx.className='cbx';
  bx.innerHTML=`<div class="cbt">เรื่องที่ไม่มีใครรู้</div><div class="cfr"><canvas width="384" height="256" class="on"></canvas></div><div class="cba"></div><div class="cbb"></div>`;
  el.querySelector('.cstage').appendChild(bx);el.dataset.mode='b';el.setAttribute('aria-label','เรื่องที่ไม่มีใครรู้');
  const a=bx.querySelector('.cba'),bb=bx.querySelector('.cbb');a.textContent=B.a;bb.textContent=B.b;
  const sk=el.querySelector('#cSkip');if(sk){clearTimeout(CINE.armT);CINE.arm=0;sk.classList.remove('arm');sk.textContent='ข้าม ⏭';sk.onclick=e=>{e.stopPropagation();cineClose();};try{sk.focus({preventScroll:true});}catch(e){}}
  CINE.epT.push(setTimeout(()=>a.classList.add('vis'),900),setTimeout(()=>bb.classList.add('vis'),5200));
  const x=bx.querySelector('canvas').getContext('2d'),t0=performance.now();x.setTransform(2,0,0,2,0,0);x.imageSmoothingEnabled=false;
  const loop=t=>{CINE.raf=requestAnimationFrame(loop);if(t-(CINE.lt||0)<50)return;CINE.lt=t;try{drawBx(x,B,t-t0);}catch(e){}};try{drawBx(x,B,0);}catch(e){}CINE.raf=requestAnimationFrame(loop);
  CINE.tm=setTimeout(()=>cineClose(),13500);return true;}catch(e){return false;}}
// ---- online memorial (v2.7, memorial.js): the run as a small JSON with scene descriptors (no pictures), button on the end screen ----
// lowest HP (% of max) seen on each floor, for the memorial's 100-floor strip; saved with R
function hpTick(R,hp){if(!isArr(R.hpF)||R.hpF.length!==100)R.hpF=Array(100).fill(-1);const i=clamp(R.floor,1,100)-1,v=Math.round(clamp(hp/Math.max(1,R.h.mhp)*100,0,100));if(R.hpF[i]<0||v<R.hpF[i])R.hpF[i]=v;}
function memoData(R){const h=R.h,C=CLASSES[h.cls],won=R.won,fl=won?100:R.floor,T=S.title||{t:''},pt=S.pat,eu=S.eu||{who:'',line:''};
 const fr=[{k:'b',f:1,c:`เกิดที่${h.village}`,s:`แรงค์ ${RANKS[h.rank].k} · 1 ใน ${fmt(h.odds)}`}];
 (S.mont||[]).slice(0,6).forEach(m=>fr.push({k:'m',f:m.f,v:visLite(momVis(m)),r:m.rar||'',c:m.t,s:`เลือก "${m.c}"${m.res?` · ${m.res}`:''}`}));
 fr.push(won?{k:'w',f:100,c:'ยืนอยู่บนยอดหอคอย',s:'ลมบนนี้เย็นกว่าที่คิด'}:{k:'d',f:fl,v:R.death==='boss'?{t:'en',en:{id:BOSSES[biome(fl)].id,boss:true}}:null,c:cauShort(R.cause)||'ชะตาขาด',s:BIOMES[biome(fl)]});
 return{v:1,n:h.name,vl:h.village,hs:h.house||h.name,g:h.gen||1,rk:h.rank,ck:C.id,cn:C.n+(pathHiName(R)?' · '+pathHiName(R):''),lk:look(h),
  f:R.sec&&R.sec.win?101:fl,w:won?1:0,dg:R.sec&&['n','f','s','x'].includes(R.sec.res)?R.sec.res:'',ti:T.t,tg:T.gold?1:0,ca:won?'พิชิตยอดหอคอย':R.cause,
  kr:R.karma,sc:S.lg?S.lg.score:0,lv:h.lv,kl:R.kills,bo:R.bosses,od:Math.max(1,Math.round(h.odds||1)),pt:pt?{c:pt.code,n:pt.n}:null,eu:eu.who,el:eu.line,jd:judge(R.karma),
  mp:R.map.slice(0,100),hp:isArr(R.hpF)?R.hpF.slice(0,100):[],pets:R.pets.slice(0,4),cm:R.comps.slice(0,4).map(c=>({n:c.n,cls:c.cls,tr:c.tr||'',legend:!!c.legend})),
  rain:(S.cineRain!=null?S.cineRain:!won&&(fl<30||!!SUDDEN[R.ck]||R.karma<-8))?1:0,fr:fr.slice(0,9),dt:Date.now()};}
function memoBtn(){const R=S.R,M=window.MEMO;if(!R||!M||!M.create)return;const rows=card.querySelectorAll('.endacts'),row=rows[1]||rows[0];if(!row)return;
 const b=document.createElement('button');b.type='button';b.className='btn';b.id='btnMemo';
 const set=()=>{b.textContent=R.memo?'🕯 ดูอนุสรณ์ของชีวิตนี้':'🕯 ตั้งอนุสรณ์ออนไลน์';};set();
 b.onclick=()=>{if(R.memo){M.open(R.memo);return;}let d=null;try{d=memoData(R);}catch(e){d=null;}if(!d)return;M.create(d,{onDone:id=>{R.memo=id;set();saveRun();}});};row.appendChild(b);}
function newBirth(bo){clearSave();if(CINE.on)cineClose(true);if(S){clearTimeout(S.popT);try{window.SHARE&&window.SHARE.close&&window.SHARE.isOpen&&window.SHARE.close();}catch(e){}clearTimeout(S.tm);clearInterval(cdI);clearTimeout(dyT);clearTimeout(cbTimer);clearTimeout(S.rvT);}clearFx();music(0,0);
 const sp=S?S.speed:loadSpeed();bo=isObj(bo)?bo:null;S={phase:'birth',hero:rollBirth(bo),bo,rerolled:false,rvDone:false,R:null,K:null,cb:null,cmp:null,saved:false,runId:0,speed:sp,paused:false,tm:0,frame:null};
 snap=null;VIS.coins=[];VIS.show=null;VIS.star=0;render();}
function loadSpeed(){try{const v=+localStorage.getItem('tof-auto-speed');return SPEEDS.includes(v)?v:1;}catch(e){return 1;}}
function setSpeed(v){const k=S.speed/v;S.speed=v;try{localStorage.setItem('tof-auto-speed',String(v));}catch(e){}renderCtl();rescale(k);}
function togglePause(){if(!['flow','decide','combat'].includes(S.phase))return;S.paused=!S.paused;renderCtl();saveRun();
 if(S.phase==='flow'){if(S.paused){clearTimeout(S.tm);S.pauseLeft=S.tipHold?(S.tipLeft||0):Math.max(0,S.tmAt-performance.now());S.tipHold=0;renderFlow();revealArm();}else{renderFlow();const l=S.pauseLeft||250;S.pauseLeft=0;S.tmAt=performance.now()+l;clearTimeout(S.tm);S.tm=setTimeout(tick,l);tipHold();revealArm();}}else if(S.phase==='decide')updCd();}
$('btnPause').onclick=togglePause;
{const b=$('btnDT');if(b)b.onclick=()=>setDTime(dTime?0:30);}
document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>setSpeed(+b.dataset.speed));
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;if(e.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;const k=e.key;
 if(/^[1-4]$/.test(k)){const b=actQ(`button[data-k="${k}"]`);if(b&&!b.disabled){e.preventDefault();b.click();}}
 else if(k===' '||k==='Spacebar'){if(['flow','decide','combat'].includes(S.phase)){e.preventDefault();togglePause();}}
 else if(k==='Enter'){if(document.activeElement&&document.activeElement.tagName==='BUTTON'&&inActs(document.activeElement))return;const b=actQ('[data-enter]');if(b&&!b.disabled){e.preventDefault();b.click();}}});
document.querySelectorAll('canvas.ico').forEach(c=>{const s=ICONS[c.dataset.ico];if(s)c.getContext('2d').drawImage(sprCanvas(s,false,false,'i'+c.dataset.ico),0,0);});
// ---- audio wiring ----
let audioInit=false;
document.addEventListener('pointerdown',()=>{if(audioInit)return;audioInit=true;try{AUDIO.init();}catch(e){}},true);
card.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled)AUDIO.sfx('click');});
(function(){const b=$('btnMute');if(!b)return;const sync=()=>b.setAttribute('aria-pressed',AUDIO.muted?'true':'false');sync();
 b.addEventListener('click',()=>{if(!audioInit){audioInit=true;try{AUDIO.init();}catch(e){}}AUDIO.setMuted(!AUDIO.muted);sync();if(S&&S.R)music(biome(S.R.floor),S.R.floor);else music(0,0);});})();
renderMemo();if(!resumeRun())newBirth();requestAnimationFrame(loop);poolBg();
(function(){const b=$('btnLB');if(!b)return;const sync=()=>{b.hidden=!(window.LB&&window.LB.open);};sync();setTimeout(sync,1500);b.onclick=()=>{try{window.LB.open();}catch(e){}};})();
window.__auto={get S(){return S;},tick,choose,render,key:(t,ev)=>{clearTimeout(S.tm);const K=mkKey(S.R,t,ev);openKey(K);return K;},mon:()=>genMonster(S.R.floor,S.R),cine:CINE,cineGo,secret:c=>{const R=S.R;if(!R)return;R.won=true;R.alive=false;R.floor=100;R.sec={st:'ask',c:DRG[c]?c:'k'};S.phase='secret';render();},clan:{load:loadClan,save:saveClan},cineStatic,goDying:()=>goDying(),fatePattern,fx:{fxEv,animFight,killFx,lvlFx,VIS,drawScene}}; // debug hooks (console testing)
})();
