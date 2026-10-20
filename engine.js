// Tower of Fate — ENGINE: state, RNG, combat, UI, hot reload. Uses window.ART / window.CONTENT / window.AUDIO.
const {RANKS,CLASSES,BIOMES,VILLAGES,NA,NB,COMPN,MONS,BOSSES,PETS,EVENTS,JUDGE}=window.CONTENT;
const {heroSpr,MSPR,BSPR,PSPR,PROPS,COIN,ICONS,sprCanvas,blit,bgImg,drawOverlay,drawProp}=window.ART;
const AUDIO=window.AUDIO;
/*ENGINE-START*/
let rnd=Math.random;
const rr=(a,b)=>a+(b-a)*rnd(), pick=a=>a[Math.floor(rnd()*a.length)], clamp=(v,a,b)=>v<a?a:v>b?b:v;
function wIdx(ws){let s=0;for(const w of ws)s+=w;let r=rnd()*s;for(let i=0;i<ws.length;i++){r-=ws[i];if(r<0)return i;}return ws.length-1;}
const BAL={mh0:38,mh1:4.2,mh2:0.03,ma0:9,ma1:0.62,ma2:0.0045,md0:3,md1:0.3,md2:0.002,bHp:2.0,bAtk:1.18,bDef:1.1,ex0:9,ex1:2.0,g0:4,g1:1.5,regen:0.03,gr:0.75,gp:0.7,fH:0.7,fA:0.8,fR:80};
const CLS_SUM=CLASSES.reduce((a,c)=>a+c.w,0);
const genName=()=>pick(NA)+pick(NB)+(rnd()<.4?pick(NB):'');
const PETK=Object.keys(PETS);

const biome=f=>clamp(Math.floor((f-1)/20),0,4);
const scl=f=>1+f/10;
const cid=R=>CLASSES[R.h.cls].id;
const hasPet=(R,p)=>R.pets.includes(p);
const need=L=>Math.round(18+9*L+0.9*L*L);
function rollHero(){
 const rk=wIdx(RANKS.map(r=>r.w)),ck=wIdx(CLASSES.map(c=>c.w)),C=CLASSES[ck],m=RANKS[rk].m;
 const h={name:genName(),village:pick(VILLAGES),rank:rk,cls:ck,lv:1,exp:0,mhp:C.hp*m,atk:C.atk*m,def:C.def*m,luk:C.luk+rk,mmp:C.mp*m,
  gold:Math.round(rr(12,28)*(1+rk*.45)*(C.id==='rog'?1.4:1)*(C.id==='far'?.6:1))};
 h.hp=h.mhp;h.mp=h.mmp;h.look=window.ART.rollLook(rollHero.form||'slime');h.odds=Math.round(1/((RANKS[rk].w/100)*(C.w/CLS_SUM)));
 return h;
}
function newRun(h){return{h:JSON.parse(JSON.stringify(h)),floor:1,karma:0,pets:[],comps:[],potions:1,warps:0,map:Array(100).fill(''),farmed:Array(100).fill(0),farmN:0,retreats:0,kills:0,bosses:0,alive:true,won:false,cause:'',maxFloor:1,buys:{},seen:[],log:[]};}
const eAtk=R=>R.h.atk*(hasPet(R,'fox')?1.12:1);
const eDef=R=>R.h.def*(hasPet(R,'wolf')?1.12:1);
const eLuk=R=>(R.h.luk+(hasPet(R,'owl')?6:0))*(cid(R)==='far'?1.5:1);
const riskAdj=(R,p)=>clamp(p*clamp(1-(eLuk(R)-8)*.012,.45,1.25),.02,.95);
const critCh=R=>clamp(.05+eLuk(R)*.004+(cid(R)==='arc'?.12:0),0,.5);
const dodgeCh=R=>clamp(eLuk(R)*.0025,0,.2);
const fleeCh=R=>clamp(.45+eLuk(R)*.008+(cid(R)==='arc'?.2:0),.1,.92);
const tameCh=R=>clamp(.12+eLuk(R)*.006,.05,.6);
function say(R,out,t,c){out.msgs.push({t,c:c||'info'});R.log.unshift({f:R.floor,t,c:c||'info'});if(R.log.length>160)R.log.length=160;}
function mkMon(t,f,k){const gr=1+BAL.gr*Math.pow(f/100,BAL.gp),hp=(BAL.mh0+BAL.mh1*f+BAL.mh2*f*f)*t.hp*k*gr;
 return{id:t.id,n:t.n,hp,mhp:hp,atk:gr*(BAL.ma0+BAL.ma1*f+BAL.ma2*f*f)*t.atk*(k>1?1.05:(k<1?.8:1)),def:(BAL.md0+BAL.md1*f+BAL.md2*f*f)*t.def,pet:t.pet||null,boss:false,x:t.x};}
const monsOf=b=>MONS.filter(m=>m.b.includes(b));
function genMonster(f){return mkMon(pick(monsOf(biome(f))),f,1);}
function mkBoss(f){const b=biome(f),B=BOSSES[b],second=f%20===0,fin=f===100;
 const base=mkMon({hp:1,atk:1,def:1},f,1),hk=BAL.bHp*(fin?BAL.fH:1)*(f<=20?.75:1),ak=BAL.bAtk*(fin?BAL.fA:1);
 return{id:B.id,n:second?B.n2:B.n,hp:base.hp*hk,mhp:base.hp*hk,atk:base.atk*ak,def:base.def*BAL.bDef,boss:true,x:B.x};}
function genComp(f){const c=pick(['war','mag','arc','pri']);return{n:pick(COMPN),cls:c,pw:4+f*.6};}
const compCost=R=>Math.round(25*scl(R.floor));
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
function gainExp(R,x,out){const h=R.h;if(cid(R)==='far')x*=1.25;h.exp+=x;const C=CLASSES[h.cls],m=RANKS[h.rank].m;
 while(h.exp>=need(h.lv)){h.exp-=need(h.lv);h.lv++;h.mhp+=C.g.hp*m;h.atk+=C.g.atk*m;h.def+=C.g.def*m;h.luk+=C.g.luk;h.mmp+=C.g.mp*m;h.hp=Math.min(h.mhp,h.hp+h.mhp*.3);h.mp=h.mmp;
  out&&say(R,out,`เลเวลอัป! ตอนนี้ Lv.${h.lv}`,'lv');}}
function addPet(R,p,out){if(R.pets.length>=2){R.h.gold+=Math.round(20*scl(R.floor));say(R,out,`ไม่มีที่ว่างเลี้ยง${PETS[p].n} เลยขายต่อได้ทองมา`,'info');return;}R.pets.push(p);say(R,out,`${PETS[p].n} เข้าร่วมปาร์ตี้! (${PETS[p].d})`,'good');}
function addComp(R,c,out){if(R.comps.length>=2)return;R.comps.push(c);say(R,out,`${c.n} (${clsName(c.cls)}) เข้าร่วมทีม!`,'good');}
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
 if(fx.gold){if(fx.gold>0)h.gold+=Math.round(fx.gold*s*(cid(R)==='rog'?1.3:1));else h.gold=Math.max(0,h.gold-Math.round(-fx.gold*s));}
 if(fx.exp)gainExp(R,fx.exp*s,out);
 if(fx.atk)h.atk+=fx.atk*(1+f/30);if(fx.def)h.def+=fx.def*(1+f/30);
 if(fx.luk)h.luk=Math.max(0,h.luk+fx.luk);
 if(fx.mhp){h.mhp*=1+fx.mhp;h.hp=Math.min(h.mhp,h.hp);}
 if(fx.mmp){h.mmp+=fx.mmp;h.mp+=fx.mmp;}
 if(fx.k)R.karma+=fx.k;if(fx.pot)R.potions+=fx.pot;if(fx.warp)R.warps+=fx.warp;
 if(fx.pet)addPet(R,fx.pet==='r'?pick(PETK):fx.pet,out);
 if(fx.skip){const nb=Math.ceil(f/10)*10,tg=Math.min(f+fx.skip,nb-1);for(let i=f;i<tg;i++)R.map[i]='warp';if(tg>f){R.floor=tg;say(R,out,`ถูกดูดขึ้นไปถึงชั้น ${tg}!`,'good');}}
 if(fx.fight&&h.hp>0)doFight(R,genMonster(R.floor),out);}
function doFight(R,en,out,o){o=o||{};const h=R.h,f=R.floor;const res=fight(R,en,o);
 out.combat={en,ev:res.ev,win:res.win,startHp:h.hp,mhp:h.mhp};h.hp=res.hp;h.mp=res.mp;out.enemy=en;
 if(res.win){R.kills++;const k=o.rw||1;const ex=(BAL.ex0+BAL.ex1*f)*(en.boss?6:1)*k;
  const gd=Math.round((en.boss?(60+15*f)*rr(.9,1.2):(BAL.g0+BAL.g1*f)*rr(.7,1.3)*k)*(cid(R)==='rog'?1.3:1));
  h.gold+=gd;say(R,out,`ปราบ${en.n}! +${Math.round(ex)} EXP · +${gd} ทอง`,'good');gainExp(R,ex,out);if(en.boss)out.coins=gd;}
 else{out.cause=o.cause||`ถูก${en.n}สังหารที่ชั้น ${f}`;say(R,out,`พ่ายแพ้ต่อ${en.n}…`,'bad');}
 return res.win;}
function genEvent(R){const f=R.floor;if(f%10===0)return{kind:'boss',en:mkBoss(f)};
 let r=rnd();if(r<.3)return{kind:'mon',en:genMonster(f)};r-=.3;
 if(r<.06&&R.pets.length<2)return{kind:'pet',pet:pick(PETK)};r-=.06;
 if(r<.06&&R.comps.length<2)return{kind:'comp',comp:genComp(f)};
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
 if(ev.kind==='comp'){const c=ev.comp,cost=compCost(R),full=R.comps.length>=2;
  return[{t:`จ้าง${c.n}`,dis:full||h.gold<cost,P:[{t:`−${cost} ทอง`,c:'w'},{t:`พลัง ${Math.round(c.pw)}`,c:'g'},...(full?[{t:'(ทีมเต็ม)',c:'b'}]:h.gold<cost?[{t:'(ทองไม่พอ)',c:'b'}]:[])]},
   {t:'ช่วยทำภารกิจ แลกกับให้เขาร่วมทีม',dis:full,P:[{t:`${100-Math.round(riskAdj(R,.35)*100)}% สำเร็จ`,c:'g'},{t:'✦ กรรมดี',c:'kk'},{t:`/ ${Math.round(riskAdj(R,.35)*100)}% ภารกิจพลาด HP −20%`,c:'b'}]},
   {t:'ปฏิเสธ',P:[{t:'เดินทางต่อคนเดียว',c:''}]}];}
 if(ev.kind==='boss'){const w=Math.round(estCached(R,ev,150)*100),wc=warpCost(R);
  return[{t:'สู้กับบอส!',P:[{t:`โอกาสชนะ ~${w}%`,c:w>=65?'g':w>=35?'w':'b'},{t:`+ทองก้อนโต`,c:'g'},{t:'แพ้ = ตาย',c:'b'}]},
   {t:'ใช้ม้วนวาร์ป',dis:f===100||(R.warps<1&&h.gold<wc),P:f===100?[{t:'(ชั้นสุดท้ายวาร์ปข้ามไม่ได้)',c:'b'}]:R.warps>0?[{t:`ใช้ม้วนที่มี (${R.warps})`,c:'w'},{t:'ข้ามบอส ไม่ได้รางวัล',c:''}]:[{t:`ซื้อฉุกเฉิน −${wc} ทอง`,c:'w'},{t:'ข้ามบอส ไม่ได้รางวัล',c:''}]},
   {t:'ถอยลงไปตั้งหลัก',P:[{t:`กลับชั้น ${f-1} ไปฟาร์มเวล`,c:'w'}]}];}
 return[];}
function resolve(R,ev,i){const h=R.h,f=R.floor;const out={msgs:[],combat:null,after:'result',coins:0,enemy:null,cause:''};
 const cs=choicesOf(R,ev);if(!cs[i]||cs[i].dis)return null;
 if(ev.kind==='ev'){const T=EVENTS[ev.ti],ch=T.c[i];
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
 else if(ev.kind==='pet'){const P=PETS[ev.pet];R.map[f-1]='pet';
  if(i===0){if(R.pets.length>=2){say(R,out,`ปล่อย${PETS[R.pets[0]].n}กลับป่า`,'info');R.pets.shift();}addPet(R,ev.pet,out);}
  else if(i===1){R.karma+=2;say(R,out,`${P.n}กินอิ่มแล้ววิ่งจากไปอย่างมีความสุข`,'good');R.map[f-1]='good';}
  else{R.karma-=3;h.gold+=Math.round(15*scl(f));say(R,out,`ขาย${P.n}ได้ทองมา ก่อนไปมันหันมามองคุณตาละห้อย`,'bad');R.map[f-1]='evil';}}
 else if(ev.kind==='comp'){const c=ev.comp;R.map[f-1]='comp';
  if(i===0){h.gold-=compCost(R);addComp(R,c,out);}
  else if(i===1){if(rnd()<riskAdj(R,.35)){say(R,out,`ทำภารกิจให้${c.n}สำเร็จ`,'good');R.karma+=1;addComp(R,c,out);}else{say(R,out,'ภารกิจพลาด! บาดเจ็บหนัก','bad');h.hp-=h.mhp*.2;out.cause=`ภารกิจของ${c.n}ล้มเหลว (ชั้น ${f})`;}}
  else{say(R,out,`บอกลา${c.n} แล้วเดินต่อคนเดียว`,'info');R.map[f-1]='calm';}}
 else if(ev.kind==='boss'){const en=ev.en;
  if(i===0){say(R,out,`ท้าชิงบอส ${en.n}!`,'info');R.map[f-1]='boss';
   if(doFight(R,en,out,{cause:`พ่ายแพ้ต่อบอส ${en.n} (ชั้น ${f})`})){R.bosses++;R.retreats=0;if(f===100){R.won=true;out.after='end';say(R,out,'พิชิตยอดหอคอยโชคชะตา!','lv');}else out.after='shop';}}
  else if(i===1){if(R.warps>0)R.warps--;else h.gold-=warpCost(R);R.map[f-1]='warp';R.retreats=0;say(R,out,`ฉีกม้วนวาร์ป ข้าม${en.n}ไปอย่างเงียบๆ`,'info');out.after='shop';}
  else{R.retreats++;R.floor=Math.max(1,f-1);R.farmN=0;say(R,out,`ถอยลงไปชั้น ${R.floor} เพื่อตั้งหลักและฟาร์มเวล`,'info');out.after='retreat';}}
 if(R.alive&&h.hp<=0)die(R,out.cause||`สิ้นใจที่ชั้น ${f}`);
 if(R.won)R.alive=false;
 return out;}
function die(R,c){R.alive=false;R.cause=c;R.h.hp=0;R.map[R.floor-1]='death';}
function farm(R){const out={msgs:[],combat:null,after:'result',coins:0,cause:''},f=R.floor;const t=pick(monsOf(biome(f)));
 const amb=rnd()<riskAdj(R,.1);const en=mkMon(t,f,amb?1.05:.6);if(amb)say(R,out,`ฝูง${t.n}รุมล้อม!`,'bad');else say(R,out,`ฟาร์มอยู่ชั้น ${f}: ล่า${t.n}`,'info');
 const m=Math.max(.25,1-.2*R.farmN);doFight(R,en,out,{rw:.6*m,cause:`ฟาร์มเพลินจนถูก${t.n}รุมสังหาร (ชั้น ${f})`});
 R.farmN++;R.farmed[f-1]++;if(!R.map[f-1])R.map[f-1]='farm';
 if(R.h.hp<=0)die(R,out.cause);return out;}
function drink(R){if(R.potions<1)return false;R.potions--;R.h.hp=Math.min(R.h.mhp,R.h.hp+R.h.mhp*.45);return true;}
function climb(R){const out={msgs:[]},h=R.h,id=cid(R);R.floor++;if(R.floor>R.maxFloor)R.maxFloor=R.floor;R.farmN=0;
 const rg=BAL.regen+(id==='pri'?.06:0)+(id==='dra'?.03:0)+(hasPet(R,'slime')?.04:0);h.hp=Math.min(h.mhp,h.hp+h.mhp*rg);h.mp=Math.min(h.mmp,h.mp+h.mmp*.2);
 R.comps.forEach(c=>c.pw*=1.015);
 if(R.karma<-8)for(let i=R.comps.length-1;i>=0;i--){if(rnd()<Math.min(.1,-R.karma*.004)){const c=R.comps[i];const st=Math.round(h.gold*.25);h.gold-=st;R.comps.splice(i,1);say(R,out,`${c.n}ทรยศ! ขโมยทอง ${st} แล้วหนีไป (กรรมตามสนอง)`,'bad');}}
 return out;}
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
// --- AI policy (used for the 160 simulated adventurers) ---
function aiPick(R,ev){const h=R.h,hf=h.hp/h.mhp;
 if(ev.kind==='ev'){let best=0,bs=-1e9;EVENTS[ev.ti].c.forEach((ch,i)=>{if(chDis(R,ch))return;let s=rnd();if(ch.p)s-=ch.p*(hf<.5?3:.8);
  if(ch.g&&ch.g.hp>0&&hf<.6)s+=1.2;if(ch.g&&ch.g.hp<0&&hf<.5)s-=1;if(s>bs){bs=s;best=i;}});return best;}
 if(ev.kind==='mon'){const w=estimateWin(R,ev.en,24);if(w>=.75)return 0;if(ev.en.pet&&R.pets.length<2&&w>=.5&&rnd()<.5)return 2;return 1;}
 if(ev.kind==='pet')return 0;
 if(ev.kind==='comp'){if(R.comps.length>=2)return 2;if(h.gold>=compCost(R)+20)return 0;return hf>.6?1:2;}
 if(ev.kind==='boss'){const w=estimateWin(R,ev.en,60);if(w>=.6)return 0;const cw=(R.warps>0||h.gold>=warpCost(R))&&R.floor<100;
  if(w<.35&&cw&&R.retreats>=2)return 1;if(R.retreats<4)return 2;if(cw)return 1;return 0;}
 return 0;}
function aiPotion(R){if(R.h.hp/R.h.mhp<.45)drink(R);}
function aiShop(R){const h=R.h;if(h.hp<h.mhp*.8)buy(R,'heal');while(R.potions<3&&buy(R,'pot'));if(R.warps<1&&h.gold>warpCost(R)*2)buy(R,'warp');
 for(let g=0;g<20;g++){const L=shopList(R).filter(x=>['atk','def','mhp'].includes(x.id)&&!x.dis&&h.gold-x.cost>15).sort((a,b)=>a.cost-b.cost);if(!L.length)break;buy(R,L[0].id);}}
function autoRun(h){const R=newRun(h);let g=0;
 while(R.alive&&!R.won&&g++<3000){const ev=genEvent(R);const out=resolve(R,ev,aiPick(R,ev));if(!out||!R.alive)break;
  if(out.after==='shop'){enterShop(R);aiShop(R);}aiPotion(R);
  let n=0;while(R.alive&&R.farmN<(out.after==='retreat'?4:2)&&R.h.hp/R.h.mhp>.6&&n++<5){farm(R);aiPotion(R);}
  if(!R.alive)break;climb(R);}
 return R;}
function simFloors(n){const a=[];for(let i=0;i<n;i++){const R=autoRun(rollHero());a.push({f:R.won?100:R.floor,won:R.won,rank:R.h.rank});}return a;}
/*ENGINE-END*/

// ================= UI =================
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('th-TH');
let S=null;
// ---- visual state ----
const VIS={hf:0,ef:0,nums:[],coins:[],shake:0,edead:false};
const sc=$('scene'),cx=sc.getContext('2d');cx.imageSmoothingEnabled=false;
function heroKey(h){return CLASSES[h.cls].id;}
function drawScene(t){const R=S.R,h=R?R.h:S.hero;const b=R?biome(R.floor):0;
 cx.save();if(VIS.shake>t){cx.translate(Math.round(Math.random()*2-1),0);}
 cx.drawImage(bgImg(b),0,0);drawOverlay(cx,b,RM?0:t);
 const bob=RM?0:Math.round(Math.sin(t/260));const ph=S.phase;
 if(ph==='end'){blit(cx,PROPS.grave,88,84);cx.globalAlpha=.55;blit(cx,heroSpr('ghost',window.ART.heroLook(h)),88,60+Math.round(Math.sin(t/500)*3),{key:'ghost'});cx.globalAlpha=1;}
 else{
  if(R){R.comps.forEach((c,i)=>{blit(cx,heroSpr(c.cls),22-i*16,84+(RM?0:Math.round(Math.sin(t/260+i+1))),{key:'c'+c.cls});});
   R.pets.forEach((p,i)=>{blit(cx,PSPR[p],i?8:30,91+(RM?0:Math.abs(Math.round(Math.sin(t/180+i)*2))),{flip:true,key:'p'+p});});}
  const hx=ph==='birth'?88:44;
  if(ph==='birth'){cx.fillStyle='rgba(244,187,74,0.12)';cx.fillRect(84,0,24,100);cx.fillStyle='#5a4a3a';cx.fillRect(80,100,32,4);for(let i=0;i<6;i++){const a=t/600+i;cx.fillStyle='#f4bb4a';cx.fillRect(96+Math.round(Math.cos(a)*16),88+Math.round(Math.sin(a)*12),1,1);}}
  {const hs=heroSpr(heroKey(h),window.ART.heroLook(h));blit(cx,hs,hx,84+bob,{flash:VIS.hf>t,key:'h'+hs.id});}
  // right side
  const ev=S.ev;const en=S.cb?S.cb.en:(ev&&(ev.kind==='mon'||ev.kind==='boss')&&ph==='floor'?ev.en:null);
  if(en&&!(ph==='result'&&!S.cb)){const big=en.boss;const spr=big?BSPR[en.id]:MSPR[en.id];const dead=VIS.edead;
   if(!dead||Math.floor(t/80)%2){const ex=big?118:128,ey=big?(70+bob):(84+(RM?0:Math.round(Math.sin(t/300+1))));blit(cx,spr,ex,ey,{flip:!big&&['wolf','sala'].indexOf(en.id)<0?false:true,flash:VIS.ef>t,key:en.id});}}
  else if(ph==='shop')drawProp(cx,'shrine',t);
  else if(ev&&ev.kind==='ev'&&(ph==='floor'||ph==='result'))drawProp(cx,EVENTS[ev.ti].pr,t);
  else if(ev&&ev.kind==='pet'&&ph==='floor')blit(cx,PSPR[ev.pet],132,91+bob,{key:'p'+ev.pet});
  else if(ev&&ev.kind==='comp'&&ph==='floor')blit(cx,heroSpr(ev.comp.cls),128,84+bob,{flip:true,key:'c'+ev.comp.cls});
 }
 // numbers & coins
 cx.font='8px "DotGothic16",monospace';cx.textAlign='center';
 VIS.nums=VIS.nums.filter(n=>t-n.t0<900);for(const n of VIS.nums){const k=(t-n.t0)/900;cx.globalAlpha=1-k;cx.fillStyle='#000';cx.fillText(n.s,n.x+1,n.y-k*14+1);cx.fillStyle=n.c;cx.fillText(n.s,n.x,n.y-k*14);}cx.globalAlpha=1;
 VIS.coins=VIS.coins.filter(c=>c.y<140);for(const c of VIS.coins){c.vy+=.18;c.x+=c.vx;c.y+=c.vy;if(c.y>104&&c.vy>0){c.vy*=-.45;c.y=104;c.b++;if(c.b>3)c.y=200;}blit(cx,COIN,c.x,c.y);}
 cx.restore();}
function coinBurst(n){AUDIO.sfx('coin');if(RM)return;for(let i=0;i<Math.min(60,n);i++)VIS.coins.push({x:130,y:80,vx:rr(-2.4,1.2),vy:rr(-4,-1.5),b:0});}
let lastT=0;function loop(t){requestAnimationFrame(loop);if(document.hidden)return;if(t-lastT<(RM?400:66))return;lastT=t;try{drawScene(t);}catch(e){}}
// ---- HUD ----
let snap=null;
function curStats(){const R=S.R,h=R?R.h:S.hero;let hp=h.hp;if(S.phase==='combat'&&S.cb)hp=S.cb.hp;return{h,hp,R};}
function renderHUD(){const {h,hp,R}=curStats(),C=CLASSES[h.cls];
 $('hName').textContent=h.name;$('hSub').textContent=`แรงค์ ${RANKS[h.rank].k} · ${C.n} · ${h.village}`;
 const f=R?R.floor:0;$('hFloor').textContent=f;
 $('v-hp').textContent=`${Math.ceil(hp)}/${Math.ceil(h.mhp)}`;$('b-hp').style.width=clamp(hp/h.mhp*100,0,100)+'%';
 const A=R?eAtk(R):h.atk,D=R?eDef(R):h.def,Lk=R?eLuk(R):h.luk;
 $('v-atk').textContent=Math.round(A);$('v-def').textContent=Math.round(D);$('v-luk').textContent=Math.round(Lk);
 $('v-mp').textContent=`${Math.round(h.mp)}`;$('b-mp').style.width=clamp(h.mp/h.mmp*100,0,100)+'%';
 $('v-lv').textContent=`Lv.${h.lv}`;$('b-lv').style.width=clamp(h.exp/need(h.lv)*100,0,100)+'%';$('v-gold').textContent=fmt(h.gold);
 $('pFill').style.width=f+'%';$('pMark').style.left=f+'%';$('track').setAttribute('aria-valuenow',f);
 $('biomeTag').textContent=R?`${BIOMES[biome(R.floor)]} · ชั้น ${R.floor}`:'ห้องโถงแห่งการสุ่มเกิด';
 const ticks=$('pTicks');if(!ticks.childElementCount)for(let i=10;i<=100;i+=10){const d=document.createElement('div');d.className='tick';d.style.left=i+'%';ticks.appendChild(d);}
 [...ticks.children].forEach((d,i)=>d.classList.toggle('done',f>(i+1)*10));
 const now={hp:Math.round(hp),atk:Math.round(A*10)/10,def:Math.round(D*10)/10,luk:Math.round(Lk),mp:Math.round(h.mp),lv:h.lv,gold:Math.round(h.gold),run:S.runId};
 if(snap&&snap.run===now.run&&now.lv>snap.lv)AUDIO.sfx('levelup');
 if(snap&&snap.run===now.run&&S.phase!=='birth')for(const k of ['hp','atk','def','luk','mp','lv','gold']){const d=now[k]-snap[k];if(Math.abs(d)>=(k==='atk'||k==='def'?.5:1))floatD(k,d);}
 snap=now;}
function floatD(k,d){if(RM)return;const el=$('c-'+k);if(!el)return;const s=document.createElement('span');s.className='flt '+(d>0?'up':'dn');s.textContent=(d>0?'+':'')+(Number.isInteger(d)?d:d.toFixed(1))+(d>0?' ▲':' ▼');el.appendChild(s);setTimeout(()=>s.remove(),1250);}
// ---- party/log ----
function miniCanvas(spr,key){const c=document.createElement('canvas');c.width=16;c.height=16;const x=c.getContext('2d');x.drawImage(sprCanvas(spr,false,false,key),Math.floor((16-spr.w)/2),Math.floor((16-spr.h)/2));return c;}
function renderParty(){const el=$('party');el.innerHTML='';const R=S.R,h=R?R.h:S.hero,C=CLASSES[h.cls];
 const add=(spr,key,title,desc)=>{const d=document.createElement('div');d.className='mem';d.appendChild(miniCanvas(spr,key));const t=document.createElement('div');t.innerHTML=`<div>${esc(title)}</div><div class="d">${esc(desc)}</div>`;d.appendChild(t);el.appendChild(d);};
 add(heroSpr(C.id,window.ART.heroLook(h)),'h'+heroSpr(C.id,window.ART.heroLook(h)).id,`${h.name} (Lv.${h.lv} ${C.n})`,`สกิลติดตัว: ${C.p} · ${C.pd}`);
 if(R){R.pets.forEach(p=>add(PSPR[p],'p'+p,`สัตว์เลี้ยง: ${PETS[p].n}`,PETS[p].d));R.comps.forEach(c=>add(heroSpr(c.cls),'c'+c.cls,`${c.n} · ${clsName(c.cls)}`,`พลังโจมตี ${Math.round(c.pw)}${c.cls==='pri'?' · ฟื้น HP ระหว่างสู้':''}`));
  if(!R.pets.length&&!R.comps.length){const p=document.createElement('div');p.className='d';p.style.cssText='font-size:12px;color:var(--dim);padding:4px 0';p.textContent='ยังไม่มีเพื่อนร่วมทาง (รับสัตว์เลี้ยงได้ 2 ตัว เพื่อน 2 คน)';el.appendChild(p);}
  const inv=document.createElement('div');inv.className='inv';inv.innerHTML=`<span>ยาฟื้นพลัง <b>${R.potions}</b></span><span>ม้วนวาร์ป <b>${R.warps}</b></span><span>สังหาร <b>${R.kills}</b></span>`;el.appendChild(inv);}}
function renderLog(){const el=$('log');const L=S.R?S.R.log:[];el.innerHTML=L.slice(0,80).map(l=>`<li class="${l.c}"><span class="f px">${l.f}F</span><span>${esc(l.t)}</span></li>`).join('')||'<li><span class="f"></span><span class="dim">ยังไม่มีบันทึก</span></li>';}
// ---- memorial ----
const MKEY='tof-memorial-v1';
function loadMemo(){try{const v=JSON.parse(localStorage.getItem(MKEY)||'[]');return Array.isArray(v)?v:[];}catch(e){return[];}}
function saveMemo(e){try{const a=loadMemo();a.unshift(e);localStorage.setItem(MKEY,JSON.stringify(a.slice(0,30)));}catch(e2){}}
function renderMemo(){const a=loadMemo();$('memo').innerHTML=a.length?a.slice(0,12).map(m=>`<div class="row"><span class="px" style="color:${RANKS[m.rank]?RANKS[m.rank].col:'#fff'}">${esc(RANKS[m.rank]?RANKS[m.rank].k:'?')}</span><span>${esc(m.name)} · ${esc(m.cls)}<br><span class="x">${esc(m.cause)}</span></span><span class="px">${m.won?'👑 ':''}${m.floor}F</span></div>`).join(''):'<div class="dim" style="font-size:13px">ยังไม่มีใครนอนอยู่ที่นี่</div>';}
// ---- card rendering ----
const card=$('card');
function partsHTML(P){return P.map(p=>`<span class="${p.c||''}">${esc(p.t)}</span>`).join(' ');}
function chBtns(cs,onPick){return`<div class="chs">${cs.map((c,i)=>`<button class="ch" id="ch${i+1}" data-k="${i+1}" ${c.dis?'disabled':''}><span class="k">${i+1}</span><span><span class="t">${esc(c.t)}</span><span class="s">${partsHTML(c.P)}</span></span></button>`).join('')}</div>`;}
function bindChoices(fn){card.querySelectorAll('button.ch').forEach((b,i)=>b.addEventListener('click',()=>fn(i)));}
function focusPrimary(){const b=card.querySelector('[data-enter]')||card.querySelector('button:not(:disabled)');if(b&&document.activeElement&&document.activeElement!==document.body&&!card.contains(document.activeElement))return;if(b)try{b.focus({preventScroll:true});}catch(e){}}
function renderFormBar(){const el=$('formBar');if(!el)return;const on=S.phase==='birth';el.hidden=!on;if(!on)return;const cur=window.ART.heroLook(S.hero).form;
 el.innerHTML=[['slime','สไลม์'],['human','คน']].map(([f,n])=>`<button class="btn" type="button" data-form="${f}" aria-pressed="${cur===f}">ร่าง: ${n}</button>`).join('');
 el.querySelectorAll('[data-form]').forEach(b=>b.onclick=()=>{const f=b.dataset.form;rollHero.form=f;S.hero.look=Object.assign({},window.ART.heroLook(S.hero),{form:f});render();});}
function render(){renderHUD();renderParty();renderLog();renderFormBar();
 const ph=S.phase;
 if(ph==='birth')renderBirth();else if(ph==='floor')renderFloor();else if(ph==='combat')renderCombat();else if(ph==='result')renderResult();else if(ph==='shop')renderShop();else if(ph==='end')renderEnd();
 focusPrimary();save();}
function renderBirth(){const h=S.hero,C=CLASSES[h.cls],Rk=RANKS[h.rank];const mx=30;
 const bars=RANKS.map((r,i)=>`<div class="col ${i===h.rank?'me':''}">${i===h.rank?'<span class="me-tag">คุณ</span>':''}<div class="bar" style="height:${Math.max(3,r.w/mx*100)}%"></div></div>`).join('');
 card.innerHTML=`<div class="cert"><div class="hd">✦ ใบประกาศนักผจญภัย ✦</div><div class="nm">${esc(h.name)}</div><div class="vil">ถิ่นกำเนิด: ${esc(h.village)}</div>
 <div class="badges"><span class="rk" style="background:${Rk.col}">RANK ${Rk.k}</span><span class="cls">${C.n}</span></div>
 <div class="pas">สกิลติดตัว <b>${C.p}</b> · ${C.pd}</div>
 <div class="cstats"><div>HP<b>${Math.round(h.mhp)}</b></div><div>ATK<b>${Math.round(h.atk)}</b></div><div>DEF<b>${Math.round(h.def)}</b></div><div>LUK<b>${Math.round(h.luk)}</b></div><div>MP<b>${Math.round(h.mmp)}</b></div><div>ทอง<b>${h.gold}</b></div></div>
 <div class="odds">คุณคือ <b>1 ใน ${fmt(h.odds)}</b></div>
 <div class="rchart" aria-label="การกระจายแรงค์">${bars}</div><div class="rlab">${RANKS.map(r=>`<span>${r.k}</span>`).join('')}</div>
 <div class="foot">โอกาสได้แรงค์ ${Rk.k}: <b class="px">${Rk.w}%</b> · อาชีพ${C.n}: <b class="px">${(C.w/CLS_SUM*100).toFixed(1)}%</b></div></div>
 <div class="acts"><button class="btn" id="btnReroll" data-k="1" ${S.rerolled?'disabled':''}>สุ่มใหม่ 1 ครั้ง${S.rerolled?' (ใช้แล้ว)':''}<span class="kb">[1]</span></button>
 <button class="btn pri" id="btnEnter" data-k="2" data-enter>เข้าหอ ▲<span class="kb">[Enter]</span></button></div>`;
 $('btnReroll').onclick=()=>{if(S.rerolled)return;S.rerolled=true;S.hero=rollHero();render();};
 $('btnEnter').onclick=()=>{S.R=newRun(S.hero);S.runId=Date.now();snap=null;const o={msgs:[]};say(S.R,o,`${S.hero.name} ก้าวเข้าสู่หอคอยโชคชะตา`,'lv');nextEvent();};}
function nextEvent(){S.ev=genEvent(S.R);S.cb=null;S.out=null;VIS.edead=false;S.phase='floor';AUDIO.music(biome(S.R.floor));if(S.ev.kind==='boss')AUDIO.sfx('boss');render();}
function evHeader(){const R=S.R,ev=S.ev,f=R.floor;
 if(ev.kind==='ev'){const T=EVENTS[ev.ti];return`<div class="tag">ชั้น ${f} · ${BIOMES[biome(f)]} · เหตุการณ์</div><h3>${esc(T.t)}</h3><p>${esc(T.x)}</p>`;}
 if(ev.kind==='mon')return`<div class="tag">ชั้น ${f} · เผชิญหน้ามอนสเตอร์</div><h3>${esc(ev.en.n)}</h3><p>${esc(ev.en.x)}</p>${vsBox(ev.en)}`;
 if(ev.kind==='pet')return`<div class="tag">ชั้น ${f} · สัตว์เลี้ยงหลงทาง</div><h3>${esc(PETS[ev.pet].n)}</h3><p>${esc(PETS[ev.pet].x)}</p>`;
 if(ev.kind==='comp'){const c=ev.comp;return`<div class="tag">ชั้น ${f} · นักผจญภัยพเนจร</div><h3>${esc(c.n)} · ${clsName(c.cls)}</h3><p>"${R.karma<-8?'ข้าได้ยินกิตติศัพท์ด้านไม่ดีของท่านมาบ้าง แต่ทองก็คือทอง':'ข้าเดินทางคนเดียวมานานแล้ว ขอไปด้วยคนได้ไหม'}" ${c.cls==='pri'?'นักบวชจะช่วยรักษาระหว่างต่อสู้':''}</p>`;}
 if(ev.kind==='boss')return`<div class="tag" style="color:var(--ember)">ชั้น ${f} · ⚠ ชั้นบอส</div><h3>${esc(ev.en.n)}</h3><p>${esc(ev.en.x)}</p>${vsBox(ev.en)}`;}
function vsBox(en){const R=S.R;return`<div class="vs"><div class="side">พลังของคุณ<br><b>${fmt(heroPower(R))}</b></div><div class="px" style="color:var(--ember)">VS</div><div class="side">พลังศัตรู<br><b>${fmt(power(en.atk,en.def,en.mhp))}</b></div></div>`;}
function renderFloor(){const cs=choicesOf(S.R,S.ev);card.innerHTML=evHeader()+chBtns(cs)+potionRow();bindChoices(pickChoice);bindPotion();}
function potionRow(){const R=S.R;return`<div class="acts"><button class="btn" id="btnPotion" ${R.potions<1||R.h.hp>=R.h.mhp-.5?'disabled':''}>ดื่มยาฟื้นพลัง (${R.potions})<span class="kb">[P]</span></button></div>`;}
function bindPotion(){const b=$('btnPotion');if(b)b.onclick=()=>{if(drink(S.R)){const o={msgs:[]};say(S.R,o,'ดื่มยาฟื้นพลัง HP +45%','good');render();}};}
function pickChoice(i){const ev=S.ev,f0=S.R.floor;const out=resolve(S.R,ev,i);if(!out)return;
 if(ev.kind==='ev'&&EVENTS[ev.ti].pr==='chest')AUDIO.sfx('chest');if(S.R.floor>f0||(ev.kind==='boss'&&i===1))AUDIO.sfx('warp');handleOut(out);}
function handleOut(out){S.out=out;if(out.combat){S.cb={en:out.combat.en,ev:out.combat.ev,i:0,hp:out.combat.startHp,mhp:out.combat.mhp,ehp:out.combat.en.mhp,lines:[],win:out.combat.win};S.phase='combat';VIS.edead=false;render();playCombat();}else afterOut();}
function afterOut(){const out=S.out;if(out&&out.coins)coinBurst(Math.round(out.coins/8));if(S.cb&&S.cb.win)VIS.edead=true;
 if(!S.R.alive){if(!S.R.won)AUDIO.sfx('death');S.phase='end';S.saved=false;render();return;}S.phase='result';render();}
let cbTimer=null;
function cbLine(e,en){const n=Math.round(e.d||0);
 if(e.t==='h')return(e.cr?'คริติคอล! ':'')+`คุณโจมตี ${n}`;if(e.t==='skill')return`ใช้สกิล! ${n} ดาเมจ`;if(e.t==='heal')return'สวดรักษาตัวเอง';if(e.t==='c')return`${e.n} โจมตี ${n}`;if(e.t==='p')return`สัตว์เลี้ยงกัด ${n}`;if(e.t==='miss')return`หลบการโจมตีได้!`;return`${en.n} โจมตี ${n}`;}
function playCombat(){clearTimeout(cbTimer);const cb=S.cb;if(!cb)return;const step=RM?0:clamp(2600/Math.max(1,cb.ev.length),60,240);
 const tick=()=>{if(S.phase!=='combat'||S.cb!==cb)return;if(cb.i>=cb.ev.length){finishCombat();return;}
  const e=cb.ev[cb.i++];if(e.d)AUDIO.sfx('hit');cb.hp=e.hp;cb.ehp=e.ehp;cb.lines.unshift(cbLine(e,cb.en));const t=performance.now();
  if(e.t==='e'){VIS.hf=t+120;VIS.shake=t+100;VIS.nums.push({s:'-'+Math.round(e.d),x:52,y:82,c:'#ff6a5a',t0:t});}
  else if(e.d){VIS.ef=t+120;VIS.nums.push({s:(e.cr?'!':'')+Math.round(e.d),x:cb.en.boss?134:136,y:cb.en.boss?68:80,c:e.cr||e.t==='skill'?'#ffd04a':'#ffffff',t0:t});}
  updCombatUI();cbTimer=setTimeout(tick,step);};
 if(RM){cb.i=cb.ev.length;const l=cb.ev[cb.ev.length-1];if(l){cb.hp=l.hp;cb.ehp=l.ehp;}finishCombat();return;}tick();}
function finishCombat(){clearTimeout(cbTimer);afterOut();}
function renderCombat(){const cb=S.cb;card.innerHTML=`<div class="tag">ชั้น ${S.R.floor} · การต่อสู้</div><h3>ปะทะ ${esc(cb.en.n)}</h3>
 <div class="vs"><div class="side">คุณ <span class="px" id="cbH"></span><div class="hpbar"><i id="cbHB"></i></div></div><div class="px" style="color:var(--ember)">VS</div><div class="side">${esc(cb.en.n)} <span class="px" id="cbE"></span><div class="hpbar e"><i id="cbEB"></i></div></div></div>
 <ol class="blog" id="cbLog"></ol><div class="acts"><button class="btn pri" id="btnSkip" data-enter>ข้ามแอนิเมชัน<span class="kb">[Enter]</span></button></div>`;
 $('btnSkip').onclick=()=>{const l=cb.ev[cb.ev.length-1];if(l){cb.hp=l.hp;cb.ehp=l.ehp;}cb.i=cb.ev.length;finishCombat();};updCombatUI();}
function updCombatUI(){const cb=S.cb;if(!$('cbH'))return;$('cbH').textContent=`${Math.ceil(Math.max(0,cb.hp))}/${Math.round(cb.mhp)}`;$('cbHB').style.width=clamp(cb.hp/cb.mhp*100,0,100)+'%';
 $('cbE').textContent=`${Math.ceil(Math.max(0,cb.ehp))}`;$('cbEB').style.width=clamp(cb.ehp/cb.en.mhp*100,0,100)+'%';$('cbLog').innerHTML=cb.lines.slice(0,5).map(l=>`<li>${esc(l)}</li>`).join('');
 $('v-hp').textContent=`${Math.ceil(Math.max(0,cb.hp))}/${Math.round(S.R.h.mhp)}`;$('b-hp').style.width=clamp(cb.hp/S.R.h.mhp*100,0,100)+'%';}
function renderResult(){const R=S.R,out=S.out||{msgs:[],after:'result'};const toShop=out.after==='shop';
 const fm=Math.max(.25,1-.2*R.farmN);
 card.innerHTML=`<div class="tag">ชั้น ${R.floor} · ผลลัพธ์</div><h3>${toShop?'ผ่านชั้นบอสแล้ว!':out.after==='retreat'?'ถอยมาตั้งหลัก':'เหตุการณ์จบลง'}</h3>
 <ul class="msgs">${out.msgs.map(m=>`<li class="${m.c}">${esc(m.t)}</li>`).join('')||'<li>…</li>'}</ul>
 <div class="chs">
 <button class="ch pri" id="btnClimb" data-k="1" data-enter><span class="k">1</span><span><span class="t">${toShop?'เข้าศาลพักใจ ⛩':'ไต่ต่อ ▲ ชั้น '+(R.floor+1)}</span><span class="s">${toShop?'ร้านค้า · ฟื้น HP ฟรี 20%':(R.floor+1)%10===0?'<span class="b">⚠ ชั้นถัดไปคือชั้นบอส</span>':'ฟื้น HP เล็กน้อยเมื่อขึ้นชั้น'}</span></span></button>
 ${toShop?'':`<button class="ch" id="btnFarm" data-k="2"><span class="k">2</span><span><span class="t">ฟาร์มอยู่ชั้นนี้</span><span class="s"><span class="g">+EXP +ทอง (x${fm.toFixed(2)} ความเหนื่อยล้า)</span> · <span class="b">เสีย HP · ${Math.round(riskAdj(R,.1)*100)}% โดนรุม</span></span></span></button>`}
 </div>${potionRow()}`;
 $('btnClimb').onclick=()=>{if(toShop){enterShop(R);const o={msgs:[]};say(R,o,'เข้าสู่ศาลพักใจ ได้พักฟื้น HP 20%','good');S.phase='shop';render();}else doClimb();};
 const fb=$('btnFarm');if(fb)fb.onclick=()=>{const o=farm(R);handleOut(o);};bindPotion();}
function doClimb(){const R=S.R;const o=climb(R);nextEvent();}
function renderShop(){const R=S.R,L=shopList(R);
 card.innerHTML=`<div class="tag">ชั้น ${R.floor} · ศาลพักใจ</div><h3>ศาลพักใจ ⛩</h3><p>กระดิ่งลมดังกรุ๋งกริ๋ง นักบวชเฒ่ารับทองแลกกับพรและเสบียง</p>
 <div class="shopg">${L.map((x,i)=>`<button class="ch" id="shop-${x.id}" data-k="${i+1}" ${x.dis?'disabled':''}><span class="k">${i+1}</span><span><span class="t">${esc(x.n)}</span><span class="s"><span class="w px">${fmt(x.cost)}</span> ทอง · ${esc(x.d)}</span></span></button>`).join('')}</div>
 <div class="acts"><button class="btn pri" id="btnLeave" data-enter>ออกจากศาล ไต่ต่อ ▲<span class="kb">[Enter]</span></button></div>`;
 L.forEach(x=>{const b=$('shop-'+x.id);b.onclick=()=>{if(buy(R,x.id)){AUDIO.sfx('coin');const o={msgs:[]};say(R,o,`ซื้อ ${x.n}`,'good');render();}};});
 $('btnLeave').onclick=doClimb;}
const MAPC={fight:'#c0503a',treasure:'#e8b840',trap:'#8a4ab0',good:'#5fc06a',evil:'#6a1a2a',pet:'#ea9bbd',comp:'#4fa6e0',boss:'#ff8a2a',warp:'#7ae8f0',flee:'#8a9aa0',calm:'#4a5a60',bad:'#8a6a4a',farm:'#2a6a5a',death:'#f1e7d0'};
const MAPN={fight:'ต่อสู้',treasure:'สมบัติ',trap:'กับดัก/บาดเจ็บ',good:'กรรมดี',evil:'กรรมชั่ว',pet:'สัตว์เลี้ยง',comp:'เพื่อน',boss:'บอส',warp:'วาร์ป',flee:'หนี',calm:'สงบ',bad:'โชคร้าย',death:'จุดจบ'};
function judge(k){for(const j of JUDGE)if(k>=j.min)return j.t;return JUDGE[JUDGE.length-1].t;}
function renderEnd(){const R=S.R,h=R.h,C=CLASSES[h.cls],won=R.won,fl=won?100:R.floor;
 if(!S.saved){S.saved=true;saveMemo({name:h.name,rank:h.rank,cls:C.n,floor:fl,won,cause:won?'พิชิตยอดหอคอย':R.cause,lv:h.lv,t:Date.now()});}
 if(!S.cmp){setTimeout(()=>{if(S.phase!=='end'||S.cmp)return;S.cmp=simFloors(160).map(x=>x.f);renderEnd();save();},40);}
 const cells=R.map.map((m,i)=>`<span class="${(i+1)%10===0?'boss ':''}${R.farmed[i]?'farm':''}" style="${m?`background:${MAPC[m]}`:i<fl?'background:#2a3a40':''}" title="ชั้น ${i+1}${m?' · '+(MAPN[m]||'ฟาร์ม'):''}${R.farmed[i]?' · ฟาร์ม '+R.farmed[i]+' ครั้ง':''}"></span>`).join('');
 let cmpH='<p class="dim" style="font-size:13px">กำลังจำลองนักผจญภัย 160 คน…</p>';
 if(S.cmp){const a=S.cmp,below=a.filter(x=>x<fl).length,eq=a.filter(x=>x===fl).length,pct=Math.round((below+eq/2)/a.length*100);
  const bins=Array(10).fill(0);a.forEach(x=>bins[clamp(Math.floor((x-1)/10),0,9)]++);const mb=Math.max(...bins),my=clamp(Math.floor((fl-1)/10),0,9);
  const med=[...a].sort((x,y)=>x-y)[80];
  cmpH=`<p style="font-size:14px;margin:4px 0">คุณไปได้ไกลกว่า <b class="px" style="color:var(--gold);font-size:18px">${pct}%</b> ของนักผจญภัยจำลอง · ค่ากลาง ชั้น ${med} · ถึงยอด ${a.filter(x=>x>=100).length} คน</p>
  <div class="hist">${bins.map((v,i)=>`<div class="c ${i===my?'me':''}">${i===my?'<span class="me-tag">คุณ</span>':''}<i style="height:${v/mb*100}%"></i></div>`).join('')}</div>
  <div class="hlab">${bins.map((v,i)=>`<span>${i*10+1}</span>`).join('')}</div>`;}
 card.innerHTML=`<div class="epi"><div class="tag">${won?'ตำนานบทใหม่':'แผ่นจารึกหน้าหลุมศพ'}</div><div class="big">${won?'👑 ':'✝ '}${esc(h.name)}</div>
 <dl class="kv"><dt>แรงค์/อาชีพ</dt><dd>${RANKS[h.rank].k} · ${C.n} (1 ใน ${fmt(h.odds)})</dd><dt>ชั้นที่ไปถึง</dt><dd class="px">${fl} / 100</dd><dt>เลเวล</dt><dd class="px">${h.lv}</dd>
 <dt>${won?'ผลลัพธ์':'สาเหตุการตาย'}</dt><dd>${esc(won?'พิชิตผู้กลืนดาราและยืนบนยอดหอคอย':R.cause)}</dd><dt>ทองที่ทิ้งไว้</dt><dd class="px">${fmt(h.gold)}</dd>
 <dt>ปาร์ตี้</dt><dd>${[...R.pets.map(p=>PETS[p].n),...R.comps.map(c=>c.n+' ('+clsName(c.cls)+')')].join(', ')||'เดินทางคนเดียว'}</dd>
 <dt>กรรม</dt><dd class="px" style="color:var(--karma)">${R.karma>0?'+':''}${R.karma} ${R.karma>=0?'กรรมดี':'กรรมชั่ว'}</dd></dl>
 <div class="judge">${judge(R.karma)}</div></div>
 <h2>แผนที่การไต่หอ</h2><div class="grid100">${cells}</div>
 <div class="legend">${Object.keys(MAPN).map(k=>`<span><i style="background:${MAPC[k]}"></i>${MAPN[k]}</span>`).join('')}<span><i style="background:#2a6a5a"></i>จุดเขียว = ฟาร์ม</span></div>
 <h2 style="margin-top:12px">เทียบกับนักผจญภัยจำลอง 160 คน</h2>${cmpH}
 <div class="acts"><button class="btn pri" id="btnReborn" data-enter>เกิดใหม่ ↻<span class="kb">[Enter]</span></button></div>`;
 $('btnReborn').onclick=newBirth;renderMemo();if(document.activeElement===document.body||!document.activeElement)focusPrimary();}
function newBirth(){AUDIO.music(0);S={v:1,phase:'birth',hero:rollHero(),rerolled:false,R:null,ev:null,out:null,cb:null,cmp:null,saved:false,runId:0};snap=null;VIS.coins=[];render();}
// ---- save/resume: whole state in localStorage, survives refresh & game updates ----
const SKEY='tof-save-v1';
function save(){try{localStorage.setItem(SKEY,JSON.stringify(S));}catch(e){}}
function loadSave(){try{const st=JSON.parse(localStorage.getItem(SKEY)||'null');if(!st||st.v!==1||!st.hero)return null;
 if(st.R)st.R=Object.assign(newRun(st.R.h||st.hero),st.R);return st;}catch(e){return null;}}
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key;
 if(/^[1-9]$/.test(k)){const b=card.querySelector(`button[data-k="${k}"]`);if(b&&!b.disabled){e.preventDefault();b.click();}}
 else if(k==='Enter'){if(document.activeElement&&document.activeElement.tagName==='BUTTON')return;const b=card.querySelector('[data-enter]');if(b&&!b.disabled){e.preventDefault();b.click();}}
 else if(k==='f'||k==='F'){const b=$('btnFarm');if(b&&!b.disabled)b.click();}
 else if(k==='p'||k==='P'){const b=$('btnPotion');if(b&&!b.disabled)b.click();}});
document.querySelectorAll('canvas.ico').forEach(c=>{const s=ICONS[c.dataset.ico];if(s)c.getContext('2d').drawImage(sprCanvas(s,false,false,'i'+c.dataset.ico),0,0);});
// ---- audio wiring ----
let audioInit=false;
document.addEventListener('pointerdown',()=>{if(audioInit)return;audioInit=true;try{AUDIO.init();}catch(e){}},true);
card.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled)AUDIO.sfx('click');});
(function(){const b=$('btnMute');if(!b)return;const sync=()=>b.setAttribute('aria-pressed',AUDIO.muted?'true':'false');sync();
 b.addEventListener('click',()=>{if(!audioInit){audioInit=true;try{AUDIO.init();}catch(e){}}AUDIO.setMuted(!AUDIO.muted);sync();if(S&&S.R)AUDIO.music(biome(S.R.floor));});})();
function start(data){let st=data&&data.state;if(!(st&&st.v===1&&st.hero))st=loadSave();
 let ok=false;if(st){try{S=st;if(S.phase==='combat'){S.phase=S.R&&S.R.alive?'result':'end';}if(S.phase!=='birth'&&!S.R)S.phase='birth';renderMemo();render();ok=true;}catch(e){}}
 if(!ok){try{localStorage.removeItem(SKEY);}catch(e){}renderMemo();newBirth();}
 requestAnimationFrame(loop);}
try{window.claude?.hot?.snapshot?.(()=>({state:S}));}catch(e){}
window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});
