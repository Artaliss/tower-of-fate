const fs=require('fs'),path=require('path');
const SP=__dirname,DST='C:/Users/mikky/Desktop/Claude/Tower';
const L=fs.readFileSync(path.join(SP,'orig.html'),'utf8').replace(/\r\n/g,'\n').split('\n');
const R=(a,b)=>L.slice(a-1,b).join('\n'); // 1-indexed inclusive
const must=(n,s)=>{if(!L[n-1].startsWith(s))throw new Error('line '+n+' expected '+s+' got '+L[n-1].slice(0,40));};
must(184,'const BAL');must(185,'const RANKS');must(194,'const CLS_SUM');must(199,'const genName');must(218,'const PETK');must(219,'// event');must(296,' {t:\'ต่อราคา');
must(298,'const biome');must(500,'/*ENGINE-END');must(508,'// ---- sprites');must(509,'function mk(');must(594,' else if(pr===\'shrine\')');must(595,'// ---- visual');must(734,'function judge');must(770,'window.claude');

// ---------- index.html ----------
let head=R(1,177);
head=head.replace('@media (prefers-reduced-motion:reduce)',
'.mute{flex:none;background:var(--bg2);border:1px solid var(--line);border-radius:3px;padding:2px 9px;font-size:15px;line-height:1.3;color:var(--gold)}\n.mute[aria-pressed="true"]{color:var(--dim);text-decoration:line-through}\n@media (prefers-reduced-motion:reduce)');
head=head.replace('  </div>\n </header>','  </div>\n  <button class="mute" id="btnMute" type="button" aria-label="เปิด/ปิดเสียง" aria-pressed="true" title="เปิด/ปิดเสียง">♪</button>\n </header>');
if(!head.includes('btnMute')||!head.includes('.mute{'))throw new Error('index patch failed');
fs.writeFileSync(DST+'/index.html',head+'\n\n<script src="sprites.js"></script>\n<script src="events.js"></script>\n<script src="audio.js"></script>\n<script src="engine.js"></script>\n');

// ---------- events.js ----------
const judge=L[733];
const JUDGE=`const JUDGE=[{min:25,t:'วิญญาณบริสุทธิ์ เทพธิดาแห่งหอคอยโปรยดอกไม้ส่งคุณสู่สวรรค์'},{min:10,t:'คนดีที่โลกจะจดจำ ชาวบ้านจุดเทียนให้คุณทุกปี'},{min:-5,t:'ไม่ดีไม่ชั่ว เป็นแค่อีกหนึ่งชื่อบนแผ่นหิน'},{min:-20,t:'ทิ้งหนี้กรรมไว้ไม่น้อย วิญญาณต้องชดใช้อีกสักพัก'},{min:-Infinity,t:'ดวงวิญญาณดำมืด ปีศาจในหอคอยยืนรอต้อนรับคุณอยู่'}];`;
const ev=`// Tower of Fate — CONTENT: all game data / flavor text. See CONTRACT.md.\n(function(){\n'use strict';\n`+
 R(185,193)+'\n'+R(195,198)+'\n'+R(200,217)+'\n'+R(219,296)+'\n'+
 `// karma epitaph on death screen: first entry with karma >= min\n${JUDGE}\n`+
 `window.CONTENT={RANKS,CLASSES,BIOMES,VILLAGES,NA,NB,COMPN,MONS,BOSSES,PETS,EVENTS,JUDGE};\n})();\n`;
fs.writeFileSync(DST+'/events.js',ev);

// ---------- sprites.js ----------
const sp=`// Tower of Fate — ART: pixel sprites, backgrounds, biome overlays, props. See CONTRACT.md.\n(function(){\n'use strict';\n`+
 R(509,556)+'\n'+R(557,594)+'\n'+
 `window.ART={mk,heroSpr,HERO_ROWS,HP_,MSPR,BSPR,BOSS_ROWS,BOSS_PAL,PSPR,PROPS,COIN,ICONS,sprCanvas,blit,BG,hash,bgImg,drawTorch,drawOverlay,drawProp};\n})();\n`;
fs.writeFileSync(DST+'/sprites.js',sp);

// ---------- audio.js ----------
fs.writeFileSync(DST+'/audio.js',`// Tower of Fate — AUDIO stub (silent). See CONTRACT.md.\nwindow.AUDIO={muted:true,init(){},setMuted(m){this.muted=m},music(biome){},sfx(name){}};\n`);

// ---------- engine.js ----------
let eng=`// Tower of Fate — ENGINE: state, RNG, combat, UI, hot reload. Uses window.ART / window.CONTENT / window.AUDIO.\n`+
 `const {RANKS,CLASSES,BIOMES,VILLAGES,NA,NB,COMPN,MONS,BOSSES,PETS,EVENTS,JUDGE}=window.CONTENT;\n`+
 `const {heroSpr,MSPR,BSPR,PSPR,PROPS,COIN,ICONS,sprCanvas,blit,bgImg,drawOverlay,drawProp}=window.ART;\n`+
 `const AUDIO=window.AUDIO;\n`+
 R(180,184)+'\n'+R(194,194)+'\n'+R(199,199)+'\n'+R(218,218)+'\n'+R(297,507)+'\n'+R(595,733)+'\n'+
 `function judge(k){for(const j of JUDGE)if(k>=j.min)return j.t;return JUDGE[JUDGE.length-1].t;}\n`+R(735,770)+'\n';
// ---- audio hooks (UI layer only; simulation untouched) ----
const rep=(a,b)=>{if(!eng.includes(a))throw new Error('hook miss: '+a.slice(0,50));eng=eng.replace(a,b);};
rep("function coinBurst(n){if(RM)return;","function coinBurst(n){AUDIO.sfx('coin');if(RM)return;");
rep("function nextEvent(){S.ev=genEvent(S.R);S.cb=null;S.out=null;VIS.edead=false;S.phase='floor';render();}",
    "function nextEvent(){S.ev=genEvent(S.R);S.cb=null;S.out=null;VIS.edead=false;S.phase='floor';AUDIO.music(biome(S.R.floor));if(S.ev.kind==='boss')AUDIO.sfx('boss');render();}");
rep("function pickChoice(i){const out=resolve(S.R,S.ev,i);if(!out)return;handleOut(out);}",
    "function pickChoice(i){const ev=S.ev,f0=S.R.floor;const out=resolve(S.R,ev,i);if(!out)return;\n if(ev.kind==='ev'&&EVENTS[ev.ti].pr==='chest')AUDIO.sfx('chest');if(S.R.floor>f0||(ev.kind==='boss'&&i===1))AUDIO.sfx('warp');handleOut(out);}");
rep(" if(!S.R.alive){S.phase='end';"," if(!S.R.alive){if(!S.R.won)AUDIO.sfx('death');S.phase='end';");
rep("const e=cb.ev[cb.i++];cb.hp=e.hp;","const e=cb.ev[cb.i++];if(e.d)AUDIO.sfx('hit');cb.hp=e.hp;");
rep("L.forEach(x=>{const b=$('shop-'+x.id);b.onclick=()=>{if(buy(R,x.id)){","L.forEach(x=>{const b=$('shop-'+x.id);b.onclick=()=>{if(buy(R,x.id)){AUDIO.sfx('coin');");
rep(" if(snap&&snap.run===now.run&&S.phase!=='birth')"," if(snap&&snap.run===now.run&&now.lv>snap.lv)AUDIO.sfx('levelup');\n if(snap&&snap.run===now.run&&S.phase!=='birth')");
rep("function newBirth(){S={","function newBirth(){AUDIO.music(0);S={");
rep("function start(data){",
`// ---- audio wiring ----
let audioInit=false;
document.addEventListener('pointerdown',()=>{if(audioInit)return;audioInit=true;try{AUDIO.init();}catch(e){}},true);
card.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled)AUDIO.sfx('click');});
(function(){const b=$('btnMute');if(!b)return;const sync=()=>b.setAttribute('aria-pressed',AUDIO.muted?'true':'false');sync();
 b.addEventListener('click',()=>{if(!audioInit){audioInit=true;try{AUDIO.init();}catch(e){}}AUDIO.setMuted(!AUDIO.muted);sync();if(S&&S.R)AUDIO.music(biome(S.R.floor));});})();
function start(data){`);
fs.writeFileSync(DST+'/engine.js',eng);
console.log('ok');
