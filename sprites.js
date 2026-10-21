// Tower of Fate — ART: pixel sprites, backgrounds, biome overlays, props. See CONTRACT.md.
(function(){
'use strict';
function mk(rows,pal,mirror){const r=mirror?rows.map(x=>{x=x.padEnd(rows.w||8,'.');return x+x.split('').reverse().join('');}):rows;const w=Math.max(...r.map(x=>x.length));return{w,h:r.length,rows:r.map(x=>x.padEnd(w,'.')),pal};}
const HERO_ROWS=["................",".....hhhhh......","....hhhhhhh.....","....hhsssss.....","....hsesses...w.","....hsssss....w.",".....ssss....w..","...caaaaaa..w...","..ccabaaabssw...","..ccaabbaa.s....","..cc.aaaa.......","..c..bbbb.......",".....ab.ab......",".....ll.ll......","....lll.lll.....","................"];
const HP_={war:{h:'#6b4a2e',a:'#b8433a',b:'#7a2a26',c:'#3e5a8a',w:'#dfe3e8'},mag:{h:'#2e4d8a',a:'#3b62a8',b:'#26407a',c:'#a33b3b',w:'#e0a040'},arc:{h:'#a8642a',a:'#4f8a3e',b:'#2f5a28',c:'#6b4a2e',w:'#c79a5a'},pri:{h:'#e8d27a',a:'#ece6d6',b:'#b8ab8a',c:'#d4a43a',w:'#f4d36a'},rog:{h:'#2a2a33',a:'#4a4a58',b:'#2a2a33',c:'#6a2a2a',w:'#b0b8c0'},far:{h:'#e8c050',a:'#4a6fa8',b:'#2f4a78',c:'#7a5a3a',w:'#9a7a4a'},dra:{h:'#2a1a1a',a:'#9a2030',b:'#4a0f16',c:'#d4a43a',w:'#f2c84a'},npc:{h:'#7a6a5a',a:'#8a7a52',b:'#5a4a32',c:'#5a5a42',w:'#7a5a3a'},ghost:{h:'#cfe8ff',a:'#bfe0ff',b:'#9fc8f0',c:'#9fc8f0',w:'#cfe8ff',s:'#dff0ff',e:'#5a7a9a',l:'#9fc8f0'}};
// ---- hero = SLIME. heroSpr(k[,look]) ; look = number | string | {hue,eye,mouth,blush,sat,lit}
const SL_BODY=["................","................","................","................","................","......oooo......","....oollbboo....","...olllbbbbbo...","..ollbbbbbbbbo..","..olbbbbbbbbbo..",".obbbbbbbbbbbbo.",".obbbbbbbbbbbbo.",".obbbbbbbbbbbbo.",".odbbbbbbbbbbdo.",".oddbbbbbbbbddo.","..oooooooooooo.."];
const SL_GHOST_TAIL=[".obbo.obbo.obbo.","..oo...oo...oo.."];
// accessories: rows overlay (top-aligned), letters -> palette
const ACC={
war:{r:["................","......R.........",".....RR.........","......CCCC......",".....CAAAAC....S","....CAAAAAAC...S","...CAAAAAAAAC..S","...BBBBBBBBBB..S","...............S","...............S","...............S","...............S","..............HH","...............G"],p:{A:'#9aa6b4',C:'#4a5562',B:'#6a7684',R:'#d0443a',S:'#e8eef4',H:'#e0b040',G:'#6a4a2a'}},
mag:{r:[".........A......","........AA......",".......AAA......","......AAYAA.....",".....AAAAAAA....","...BBBBBBBBBB..."],p:{A:'#3b52a8',B:'#26357a',Y:'#f4d36a'}},
arc:{r:["................","................","................","................","...........R....",".....AAAAAR.....","...AAAAAAAAA..W.",".AAABBBBBBBB...W","...............W","..............SW","..............SW","..............SW","...............W","..............W."],p:{A:'#4f8a3e',B:'#2f5a28',R:'#d0443a',W:'#a8743a',S:'#e8e0c8'}},
pri:{r:["................","................",".....YYYYYY.....","....Y......Y....",".....YYYYYY.....","................","................","........W.......",".......WWW......","........W......."],p:{Y:'#f8e070',W:'#fff6d0'}},
rog:{r:["................","................","................","................","................","......AAAA......","....AAAAAAAA....","..AABAAAAAAAA...",".AA.............","A..............S","...............S","..............HH","...............G"],p:{A:'#3a3a48',B:'#7a2a2a',S:'#d8e0e8',H:'#8a6a3a',G:'#4a3a2a'}},
far:{r:["................","................","................","......YYYY......",".....YYYYYY.....",".....RRRRRR.....","..YYYYYYYYYYYY..","..........G.....","...........G...."],p:{Y:'#e8c050',R:'#b8433a',G:'#9ac04a'}},
dra:{r:["................","................","...H........H...","...HH......HH...","....HAAAAAAH....","....AAAAAAAA....","...AAAYAAYAAA...","...BBBBBBBBBB..."],p:{A:'#9a2030',B:'#d4a43a',H:'#f0e8d0',Y:'#f2c84a'}},
npc:{r:["................","................","................","................",".....AAAAA......","....AAAAAAA.....","...BBBBBBBBB...."],p:{A:'#8a6a42',B:'#6a4a2a'}},
ghost:{r:["................","................",".....YYYYYY.....","....Y......Y....",".....YYYYYY....."],p:{Y:'#fff3a0'}}};
// eyes: offsets [dr,dc,ch] from anchors (10,7) and (10,11); m = mirror dc for 2nd eye
const EYES=[[[0,0,'k'],[1,0,'k']],[[0,0,'w'],[0,1,'k'],[1,0,'k'],[1,1,'k']],[[0,0,'k'],[1,-1,'k'],[1,1,'k']],[[1,0,'k'],[1,1,'k']],[[0,0,'k'],[1,0,'w']],[[-1,-1,'k'],[0,0,'k'],[1,0,'k']],[[0,0,'w'],[1,0,'k'],[0,1,'k']],'wink'];
const MOUTHS=[[[12,8,'k'],[13,9,'k'],[12,10,'k']],[[12,9,'m'],[12,10,'m'],[13,9,'p'],[13,10,'p']],[[12,7,'k'],[13,8,'k'],[12,9,'k'],[13,10,'k'],[12,11,'k']],[[12,9,'m']],[[12,9,'k'],[12,10,'k']],[[12,8,'k'],[13,9,'k'],[12,10,'k'],[13,10,'w']],[[12,8,'k'],[12,9,'k'],[12,10,'k'],[13,9,'p']]];
const CLS_HUE={war:4,mag:220,arc:105,pri:48,rog:270,far:30,dra:345,npc:35,ghost:205};
function seedOf(v){if(typeof v==='number')return v>>>0;const s=String(v);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
const SKINS=['#f1c49a','#e8b48a','#c88a5e','#a0663e','#f6d6b8','#7a4a2e'];
// look -> normalized {form,hue,sat,lit,eye,mouth,blush,skin}. Accepts seed number/string or {form,seed,...overrides}.
function lookOf(v){const o=v&&typeof v==='object'?v:{seed:v};const s=seedOf(o.seed??0),r=i=>hash(s+i*7919);
 return Object.assign({form:'slime',hue:Math.floor(r(1)*360),sat:58+Math.floor(r(2)*22),lit:52+Math.floor(r(3)*12),eye:Math.floor(r(4)*EYES.length),mouth:Math.floor(r(5)*MOUTHS.length),blush:r(6)<.55,skin:Math.floor(r(7)*SKINS.length)},o);}
const rollLook=form=>({form:form==='human'?'human':'slime',seed:Math.floor(Math.random()*4294967295)});
// hero object -> look (old saves without look: human, seeded from name)
const heroLook=h=>h&&h.look?h.look:{form:'human',seed:h?h.name:0};
const hsl=(h,s,l)=>`hsl(${((h%360)+360)%360},${Math.max(0,Math.min(100,s))}%,${Math.max(0,Math.min(100,l))}%)`;
function slimeRows(k,L){const G=SL_BODY.map(r=>r.split(''));const put=(y,x,c)=>{if(y>=0&&y<16&&x>=0&&x<16)G[y][x]=c;};
 if(k==='ghost'){G[14]=SL_GHOST_TAIL[0].split('');G[15]=SL_GHOST_TAIL[1].split('');}
 const E=EYES[L.eye%EYES.length];
 if(E==='wink'){put(10,7,'k');put(11,7,'k');put(11,11,'k');put(11,12,'k');}
 else for(let e=0;e<2;e++)for(const [dr,dc,ch] of E)put(10+dr,(e?11:7)+(e&&E===EYES[5]?-dc:dc),ch);
 for(const [y,x,ch] of MOUTHS[L.mouth%MOUTHS.length])put(y,x,ch);
 if(L.blush){put(12,4,'p');put(12,13,'p');}
 const A=ACC[k];if(A)A.r.forEach((row,y)=>{for(let x=0;x<row.length;x++)if(row[x]!=='.')G[y][x]=row[x];});
 return G.map(r=>r.join(''));}
const heroCache=new Map();
function heroSpr(k,look){
 if(look==null||lookOf(look).form==='human'){const L=look==null?null:lookOf(look),sk=L?SKINS[L.skin%SKINS.length]:'#f1c49a',id='hu:'+k+':'+sk;let s=heroCache.get(id);if(s)return s;
  const pal=Object.assign({s:sk,e:'#1a1010',l:'#3a2e24'},HP_[k]||HP_.npc);s=mk(HERO_ROWS,pal);s.id=id;s.sh=k!=='ghost';heroCache.set(id,s);return s;}
 const L=lookOf(look);
 const id='sl:'+k+':'+[L.hue,L.sat,L.lit,L.eye,L.mouth,L.blush?1:0].join(',');let s=heroCache.get(id);if(s)return s;
 const gh=k==='ghost',h=L.hue,S=gh?38:L.sat,l=gh?80:L.lit;
 const pal={o:gh?'#7a9ac0':hsl(h+(h>60&&h<240?15:-15),S*.7,Math.max(14,l-36)),b:hsl(h,S,l),l:hsl(h-8,S-8,Math.min(94,l+22)),d:hsl(h+12,S+4,l-12),k:'#141018',w:'#ffffff',m:'#5a1420',p:gh?'#c8e0ff':'#ff8aa8'};
 Object.assign(pal,(ACC[k]||{}).p);
 s=mk(slimeRows(k,L),pal);s.id=id;s.squish=true;s.sh=!gh;s.ph=(L.hue*13+L.eye*7)%997;
 if(heroCache.size>200)heroCache.clear();heroCache.set(id,s);return s;}
const MSPR={
slime:mk(["........","........","........","........","......oo","....oogg","...ogglg","..ogllgg","..oglggg",".oggggkg",".oggggkg",".ogggggg",".ogggggd","..oggggg","...ooooo","........"],{o:'#1d4a22',g:'#5fc04a',l:'#b8f0a0',k:'#0d1a0d',d:'#2a6a2a'},1),
goblin:mk(["........","........","....oooo","o..ogggg","googgggg",".ggggkgg","..gggggg","...ggrrw","....gggg","...bbbbb","..gbbbbb","..gbbybb","...bbbbb","....gg..","...ooo..","........"],{o:'#1f3a14',g:'#7aa83a',k:'#1a0a0a',r:'#6a1a1a',w:'#f0f0d0',b:'#6a4a2a',y:'#d4a43a'},1),
wolf:mk(["................","................","................","..........o.o...",".........oggo...",".........ggkgg..","o.......gggggggo","og....ggggggww..",".ogggggggggg....","..gggggggggg....","..ggggwwwggg....","..gg.gg..gg.g...","..g..g...g..g...",".oo.oo..oo.oo...","................","................"],{o:'#141418',g:'#4a4a5a',k:'#ffcc33',w:'#8a8a9a'}),
bat:mk(["........","........","........","......o.","o.....oo","oo...obb","obo..bbb","obbobbkb","obbbbbbb","obbbbbbr",".obobbbb","..o.obbb",".....obb","......ob","........","........"],{o:'#1a2a4a',b:'#6ab8e0',k:'#ff4a6a',r:'#f0f0f0'},1),
golem:mk(["........","........","....oooo","...osccs","...oskss","...ossss",".ooossdd","osssosss","osccosss","osssossc","osso.oss","oso..oss",".o...oss","....oss.","...osss.","...oooo."],{o:'#1a2a3a',s:'#5a7a9a',c:'#7ae8f0',k:'#f0ffff',d:'#3a5a7a'},1),
shroom:mk(["........",".....ooo","...oorrr","..orrwrr",".orrwwrr",".orrrrrw","orrwrrrr","oooooooo","....osss","....osks","....ossd","....osss","...ossss","...ooooo","........","........"],{o:'#3a1010',r:'#c83a3a',w:'#f0e0d0',s:'#e8d8b8',k:'#1a0a0a',d:'#8a3a3a'},1),
wraith:mk(["........",".....ooo","....owww","...owwww","...owkkw","...owkkw","...owwww","..owwwdw",".owwwwww","owwwwwww","owwwwwww",".owwowww","..oo.oww","......ow","........","........"],{o:'#4a6a7a',w:'#cfe8e8',k:'#0a1a2a',d:'#5a7a8a'},1),
sala:mk(["................","................","................","................",".....f..f.f.....","....fff.fff.ooo.",".........orrrro.",".........rrkrrr.","o......rrrrrryy.","orr..rrrrrrrr...",".orrrrryyrrr....","..rrrryyyyrr....","...r.r....r.r...","..oo.oo..oo.oo..","................","................"],{o:'#3a0a0a',r:'#e0502a',y:'#f0c040',k:'#1a0a0a',f:'#ffb03a'}),
star:mk([".......y","......yy","....oooo","...obbbb","..obblbb","..obkbbb","..obbbbb","..oooooo","...b.b.b","...b.b.b","..b..b.b","..b.b..b","...b..b.","........","........","........"],{o:'#2a3a7a',b:'#8ab0f0',l:'#f0f8ff',k:'#1a1a3a',y:'#f8e870'},1)};
MSPR.lgolem=mk(MSPR.golem.rows,{o:'#2a0a05',s:'#6a3a2a',c:'#ff8a2a',k:'#ffe080',d:'#4a2a1a'});
// extra monsters (new keys, free for content to use): biome slime recolours + mimic
const SLR=MSPR.slime.rows;
MSPR.cslime=mk(SLR,{o:'#1a3a6a',g:'#6ad0f0',l:'#e0fcff',k:'#0a1a2a',d:'#2a6aa8'});
MSPR.pslime=mk(SLR,{o:'#2a1440',g:'#9a5ad0',l:'#e0b8ff',k:'#12081a',d:'#5a2a8a'});
MSPR.fslime=mk(SLR,{o:'#4a0a06',g:'#f06a2a',l:'#ffd08a',k:'#1a0606',d:'#a02a10'});
MSPR.vslime=mk(SLR,{o:'#0a0a1e',g:'#3a3a8a',l:'#b8c0ff',k:'#f8e870',d:'#1e1e50'});
MSPR.mimic=mk(['................','................','...oooooooooo...','..obbbbbbbbbbo..','.obyyyyyyyyyybo.','.obbbrkbbrkbbbo.','.oyyyyyyyyyyyyo.','.owkwkwkwkwkwko.','.okkkkkkkkkkkko.','.okkkttttkkkkko.','.owkwkwttwkwkwo.','.oyyyyyyttyyyyo.','.obbbbbyybbbbbo.','.obbbbbbbbbbbbo.','.oooooooooooooo.','................'],{o:'#2a1606',b:'#8a5a2a',y:'#e8b840',k:'#1a0606',w:'#f0ecd8',r:'#ff4a3a',t:'#d04a6a'});
for(const k in MSPR){MSPR[k].shade=true;MSPR[k].sh=true;MSPR[k].ph=k.length*131;}
for(const k of ['slime','cslime','pslime','fslime','vslime'])MSPR[k].squish=true;
const BOSS_PAL={gking:{o:'#1a2a10',g:'#6a9a32',G:'#4a7a22',y:'#f0c040',r:'#a02a2a',k:'#1a0a0a',w:'#f0f0d0',s:'#8a8a9a',b:'#6a4a2a'},
cqueen:{o:'#1a2a3a',c:'#9af0ff',C:'#4ab8e0',s:'#e0f0ff',k:'#2a4a8a',d:'#6a8ab0',a:'#5a8ab8',A:'#3a6a98'},
treant:{G:'#1e4a22',g:'#3a7a32',b:'#5a3a22',B:'#3a2414',y:'#e0ff6a',k:'#140a06',r:'#a0ff4a'},
dragon:{h:'#e0d0b0',r:'#c0301e',y:'#f8b030',k:'#1a0a0a',d:'#8a1a10',o:'#4a0a06',w:'#f0f0e0',W:'#7a1a10'},
devour:{v:'#1e1a3c',V:'#2e2858',w:'#ece2c8',c:'#e89a3a',k:'#120a10',t:'#3a3270',s:'#f4e9a0'}};
const BOSS_ROWS={
gking:["................","................","..........y....y","..........yy..yy","..........yyyyyy","..........yryyyy","..........oooooo","....oo...ogggggg","....gGoooggggggg",".....gGggggggggg","......ggggwkkggg","......ggggwwkggg","......gggggggggG",".......gggggggGG",".......ggowowowo","........gggggggg","......rrrrssssss",".....rrrrsssssss","....rrrggsssssss","....rrgggsssyyss","...rrrggssssyyss","...rrr.gssssssss","...rrr..bbbbbbbb","...rr...ssssssss","...rr...ssssssss","...r....ggg.....","........ggg.....","........ggg.....",".......oooo.....","......ooooo.....","................","................"],
cqueen:["................","...............c","..........c...cC","..........cc..cC","...........cccCC","...........ooooo","..........osssss","..........osksss","..........osssss","...........ossdd","............osss","......cc.....oss",".....cCCcooooaaa","....cCCcaaaaaaaa",".....cc.aaaaaaAA",".......aaaaAAaaa","......aa.aaaaaaa",".....aa..aaaacca","....ss...aaaaCca","...ss....aaaaaaa","..........aaaaaa",".........aaaaaaa","........aaaaaaaa",".......aaaaaaaaa","......aaaaAaaaaa",".....aaaaAaaaaaa","....aaaaAaaaaaaa","...aaaaaaaaaaaaa","..cccc..cccc..cc",".cCCCc.cCCCc.cCC","................","................"],
treant:["................","......GG...GG...","....GGgGG.GggG..","...GgggggGgggggG","..GgggGggggggGgg","..ggGgggggGggggg","...GgggGgggggggG","....GGgggGGgggGG","......GbbbbGbbbb",".......bbbbbbbbb",".......bBBbbbbbb",".......bbykkbbbb",".......bbyyybbbb",".......bbbbbbbbB","...b...bbbBbbbbb","...bb..bbkkkkkkk","....bb.bbkrrkrrk",".....bbbbbkkkkkk","......bbbbbbbbbb",".......bbbBbbbbb",".......bbbbbBbbb",".......bbbbbbbbb",".......bBbbbbbbb","......bbbbbbbbbb",".....bbb.bbbbbbb","....bbb..bbbb.bb","...bbb..bbbb...b","..bbb..bbb......",".bb...bb........","................","................","................"],
dragon:["................","..........h.....","..........hh....","...........hh...","...........rrrrr","w.........rrrrrr","ww.......rrryrrr","wWw......rrkyrrr","wWWw.....rrrrrrr","wWWWw....rrrrrdd","wWWWWw...orrrdkd","wWWWWWw..rrrrddd","wWWWWWWw.rrwwwww","wWWWWWWWwrrrrrrr",".wWWWWWWWrrrrrrr","..wWWWWWrrryyyyy","...wWWWrrrryyyyy","....wWWrrrrryyyy",".....wwrrrrryyyy","......rrrrrrryyy","......rrrrrrrryy",".....rrr.rrrrrrr","....rrr..rrrrrrr","....rr...rrrr...","....r....rrrr...",".........rrr....","........ooo.....",".......oooo.....","................","................","................","................"],
devour:["................","......s.........",".......s....s...","..s.........vvvv","..........vvvvvv","........vvvVVVVV",".......vvVVVVVVV","......vvVVVVVVVV",".....vvVVVwwwwww",".....vVVVwwwwwww","....vvVVwwwwwccc","....vVVwwwwwcccc","....vVVwwwwccckk","....vVVwwwwcckkk","....vVVwwwwcckkk","....vVVwwwwwccck","....vVVVwwwwwccc",".....vVVVwwwwwww",".....vvVVVVwwwww","......vvVVVVVVVV",".......vvVVVVVVV","..t.....vvvVVVVV","..tt.....tvvvvvv","...tt...tt.tt.tt","....tt.tt..tt.t.",".....ttt..tt..t.","..........t...t.",".........t...t..","................","................","................","................"]};
const BSPR={};for(const k in BOSS_ROWS){const r=BOSS_ROWS[k];r.w=16;BSPR[k]=mk(r,BOSS_PAL[k],1);BSPR[k].shade=true;BSPR[k].sh=true;BSPR[k].squish='slow';BSPR[k].ph=k.length*211;}
const PSPR={slime:mk(["..........","..........","....oo....","..oggggo..",".oglggggo.",".ogkggkgo.",".oggggggo.","..oooooo..",".........."],{o:'#1a3a6a',g:'#6aa8f0',l:'#d0f0ff',k:'#0a1a2a'}),
fox:mk(["..........","o...o.....","oo.oo.....","rrrrr.....","rkrkr....f","rrwrr...ff",".rrrrrrrf.",".rrrrrrr..",".r.r.r.r.."],{o:'#7a2a0a',r:'#f07a2a',k:'#1a0a0a',w:'#fff0e0',f:'#ffd04a'}),
owl:mk(["..o....o..","..oooooo..",".obbbbbbo.",".bwwbbwwb.",".bwkbbkwb.",".bbbyybbb.",".bbllllbb.","..bbbbbb..","...y..y..."],{o:'#3a2a1a',b:'#8a6a4a',w:'#f0e8d0',k:'#1a0a0a',y:'#f0c040',l:'#c8a880'}),
wolf:mk(["..........",".o.o......",".ggg......","gkgg......","gggg....g.",".ggggggg..",".ggggggg..",".g.g.g.g..",".........."],{o:'#2a2a33',g:'#8a8a9a',k:'#1a0a0a'})};
for(const k in PSPR){PSPR[k].shade=true;PSPR[k].sh=true;}PSPR.slime.squish=true;PSPR.slime.ph=300;
const PROPS={chest:mk(["................","................","................","................","..oooooooooooo..",".obbbbbbbbbbbbo.",".obyyyyyyyyyybo.",".obbbbbbbbbbbbo.",".oyyyyyooyyyyyo.",".obbbbbyybbbbbo.",".obbbbbbbbbbbbo.",".obyyyyyyyyyybo.",".obbbbbbbbbbbbo.",".oooooooooooooo.","................","................"],{o:'#2a1606',b:'#8a5a2a',y:'#e8b840'}),
grave:mk(["........","........","....oooo","...ossss","..osssss","..ossssk","..osskkk","..ossssk","..ossssk","..osssss","..osssss","..osssss",".gosssss","ggoooooo","gggggggg","........"],{o:'#2a2e33',s:'#8a9098',k:'#3a3e44',g:'#3a5a2a'},1),
egg:mk(["...oooo...","..oyyyyo..",".oyyryyyo.",".oyrryyyo.",".oyyyyryo.",".oyyyrryo.","..oyyyyo..","...oooo..."],{o:'#6a3a0a',y:'#f8d060',r:'#e0702a'})};
const COIN=mk(["..yyyy..",".ywwyyy.","ywyyyyyd","ywyddyyd","yyyddyyd","yyyyyyyd",".yyyyyd.","..dddd.."],{y:'#f4c040',w:'#fff4b0',d:'#b07a10'});
const ICONS={heart:mk([".rr..rr.","rwrrrrrr","rrrrrrrr","rrrrrrrr",".rrrrrr.","..rrrr..","...rr...","........"],{r:'#e0574b',w:'#ffc0b0'}),
sword:mk([".......w","......ww",".....ww.","y...ww..",".yyww...","..yy....",".b.y....","b......."],{w:'#e8eef4',y:'#f0b040',b:'#6a4a2a'}),
shield:mk(["bbbbbbbb","bsswsssb","bswsssb.","bsssssb.",".bsssb..",".bsssb..","..bsb...","...b...."].map(r=>r.padEnd(8,'.')),{b:'#5a6a7a',s:'#a9bfd0',w:'#f0f8ff'}),
clover:mk([".gg..gg.","gggggggg","ggwggggg",".gggggg.","gggggggg","gggggggg",".gg.b.g.","....b..."],{g:'#5fd0a6',w:'#c8ffe8',b:'#3a7a5a'}),
drop:mk(["...bb...","...bb...","..bbbb..",".bbwbbb.",".bwbbbb.",".bbbbbb.","..bbbb..","........"],{b:'#4fa6e0',w:'#d0f0ff'}),
star:mk(["...yy...","...yy...","yyyyyyyy",".yyyyyy.","..yyyy..",".yy..yy.",".y....y.","........"],{y:'#86cf6a'}),coin:COIN};
const sprCache=new Map();
function hexAdj(c,f){if(typeof c!=='string'||c[0]!=='#'||c.length!==7)return c;const n=parseInt(c.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;
 if(f>0){r+=(255-r)*f;g+=(255-g)*f;b+=(255-b)*f;}else{r*=1+f;g*=1+f;b*=1+f;}return'#'+[r,g,b].map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');}
// spr.shade: light rim on top edges, darker underside -> rounder look without changing silhouette
function sprCanvas(spr,flip,flash,key){const k=(key||'')+'|'+(spr.id||'')+(flip?'f':'')+(flash?'x':'')+(spr.shade?'s':'')+spr.rows.join('').length+spr.rows[0]+spr.pal[Object.keys(spr.pal)[0]];
 let c=sprCache.get(k);if(c)return c;c=document.createElement('canvas');c.width=spr.w;c.height=spr.h;const x=c.getContext('2d');const R=spr.rows,op=(y,i)=>y>=0&&y<R.length&&i>=0&&i<R[y].length&&R[y][i]!=='.'&&!!spr.pal[R[y][i]];
 R.forEach((row,y)=>{for(let i=0;i<row.length;i++){const ch=row[i];if(ch==='.')continue;let col=spr.pal[ch];if(!col)continue;
  if(!flash&&spr.shade){if(!op(y-1,i))col=hexAdj(col,.22);else if(!op(y+1,i))col=hexAdj(col,-.28);}
  x.fillStyle=flash?'#ffffff':col;x.fillRect(flip?spr.w-1-i:i,y,1,1);}});
 if(sprCache.size>600)sprCache.clear();sprCache.set(k,c);return c;}
const RMQ=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function lowRow(spr){if(spr._lo!=null)return spr._lo;let lo=spr.h-1;while(lo>0&&!/[^.]/.test(spr.rows[lo]))lo--;return spr._lo=lo;}
// blit options: flip, flash, key, noShadow, noAnim. Sprites flagged .sh get a soft ground shadow; .squish gets idle squash/stretch.
function blit(ctx,spr,x,y,o){o=o||{};const c=sprCanvas(spr,o.flip,o.flash,o.key);x=Math.round(x);y=Math.round(y);
 if(spr.sh&&!o.noShadow){const w=Math.max(4,Math.round(spr.w*.62)),cxp=x+Math.floor(spr.w/2),by=y+lowRow(spr);const ga=ctx.globalAlpha;ctx.globalAlpha=ga*.32;ctx.fillStyle='#000';
  ctx.fillRect(cxp-(w>>1),by,w,1);ctx.fillRect(cxp-(w>>1)+2,by+1,w-4,1);ctx.globalAlpha=ga;}
 let dw=spr.w,dh=spr.h;
 if(spr.squish&&!o.noAnim&&!RMQ){const per=spr.squish==='slow'?2600:1500,p=((performance.now()+(spr.ph||0)*37)%per)/per;
  if(spr.squish==='slow'){if(p<.5){dw+=2;dh-=1;}}else if(p<.12){dw+=2;dh-=2;}else if(p<.22){dw+=1;dh-=1;}else if(p<.32){dw-=2;dh+=1;}}
 if(dw===spr.w&&dh===spr.h)ctx.drawImage(c,x,y);
 else{const sm=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;ctx.drawImage(c,x-((dw-spr.w)>>1),y+spr.h-dh,dw,dh);ctx.imageSmoothingEnabled=sm;}}
// ---- backgrounds ----
const BG=[{w1:'#2c3b33',w2:'#33463b',m:'#1b2620',fl:'#3d5a34',f2:'#4f7a3a'},{w1:'#1a2840',w2:'#22334d',m:'#0f1828',fl:'#23324a',f2:'#2c3e58'},{w1:'#1c2820',w2:'#223028',m:'#101812',fl:'#26301f',f2:'#303c26'},{w1:'#3a1e18',w2:'#46241c',m:'#200f0c',fl:'#2a1612',f2:'#3a1c14'},{w1:'#0d1030',w2:'#121640',m:'#070818',fl:'#1c2050',f2:'#262a66'}];
function hash(n){n=(n^61)^(n>>>16);n=n+(n<<3);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);n^=n>>>15;return(n>>>0)/4294967296;}
const bgCache={};
function bgImg(b){if(bgCache[b])return bgCache[b];const c=document.createElement('canvas');c.width=192;c.height=128;const x=c.getContext('2d'),P=BG[b];
 x.fillStyle=P.m;x.fillRect(0,0,192,128);
 if(b===4){for(let i=0;i<70;i++){x.fillStyle=hash(i*7)>.8?'#8a90d0':'#3a3f80';x.fillRect(Math.floor(hash(i)*192),Math.floor(hash(i+99)*100),1,1);}}
 else for(let r=0;r<13;r++)for(let k=-1;k<13;k++){const bx=k*16+(r%2?8:0),by=r*8;x.fillStyle=hash(r*31+k*7+b)>.5?P.w1:P.w2;x.fillRect(bx+1,by+1,15,7);if(hash(r*13+k+b*5)>.85){x.fillStyle=P.m;x.fillRect(bx+4,by+3,3,1);}}
 x.fillStyle=P.fl;x.fillRect(0,100,192,28);for(let k=0;k<24;k++){x.fillStyle=k%2?P.f2:P.fl;x.fillRect(k*8,100+(k%3),8,2);}
 x.fillStyle='#0006';x.fillRect(0,100,192,1);
 if(b===0)for(let i=0;i<40;i++){x.fillStyle=hash(i+5)>.5?'#6a9a42':'#4f7a34';const gx=Math.floor(hash(i*3)*192);x.fillRect(gx,99-Math.floor(hash(i)*3),1,3);}
 if(b===0||b===2){x.fillStyle='#1a120a';x.fillRect(20,30,22,40);x.fillRect(150,30,22,40);x.fillStyle=b?'#2a3a4a':'#6a9ac8';x.fillRect(22,32,18,36);x.fillRect(152,32,18,36);x.fillStyle=P.m;x.fillRect(30,32,2,36);x.fillRect(160,32,2,36);}
 if(b===1)for(let i=0;i<14;i++){x.fillStyle='#0f1a2c';const sx=Math.floor(hash(i*5)*192),sl=4+Math.floor(hash(i*9)*14);for(let j=0;j<sl;j++)x.fillRect(sx+Math.floor(j/3),j,4-Math.floor(j/4)>0?4-Math.floor(j/4):1,1);}
 if(b===2)for(let i=0;i<5;i++){const tx=8+i*44+Math.floor(hash(i)*10);x.fillStyle='#0c140e';x.fillRect(tx,0,8,100);x.fillRect(tx-3,90,14,10);x.fillStyle='#14241a';x.fillRect(tx-10,0,28,14);}
 if(b===3){x.fillStyle='#ff6a1a';x.fillRect(0,116,192,12);}
 // ---- extra biome detail ----
 const px=(X,Y,w,h,col)=>{x.fillStyle=col;x.fillRect(X,Y,w,h);};
 for(let k=0;k<12;k++){px(k*16+((k*7)%5),104,1,6,'#0003');}
 px(0,100,192,1,'#0006');px(0,101,192,1,'#ffffff10');
 if(b===0){for(let i=0;i<14;i++){const fx=Math.floor(hash(i*11+3)*190),fy=104+Math.floor(hash(i*5+1)*20);px(fx,fy,1,1,['#f4e070','#f08aa8','#ffffff','#a8c8ff'][i%4]);px(fx,fy+1,1,1,'#3a6a2a');}
  [[22,34],[152,34]].forEach(([wx,wy])=>{px(wx+2,wy+6,6,2,'#e8f2ff');px(wx+10,wy+16,5,2,'#e8f2ff');px(wx+3,wy+5,3,1,'#ffffff');});
  for(const bx of [84,100]){px(bx,6,8,20,'#8a2a2a');px(bx,6,8,2,'#d4a43a');px(bx+3,12,2,2,'#d4a43a');px(bx,26,2,2,'#8a2a2a');px(bx+6,26,2,2,'#8a2a2a');}}
 if(b===1){for(let i=0;i<6;i++){const cx0=10+Math.floor(hash(i*17)*170),cy=30+Math.floor(hash(i*3+2)*50);for(let j=0;j<8;j++)px(cx0+Math.floor(j/3),cy+j,Math.max(1,3-Math.floor(j/3)),1,i%2?'#2a4a6a':'#3a3a6a');px(cx0,cy+1,1,2,'#6ab8d0');}
  for(let i=0;i<10;i++)px(Math.floor(hash(i*29)*192),106+Math.floor(hash(i*7)*18),1,1,'#7ae8f0');}
 if(b===2){for(let i=0;i<9;i++){const vx=Math.floor(hash(i*41+7)*192),vl=8+Math.floor(hash(i*5)*22);for(let j=0;j<vl;j++)px(vx+(Math.floor(j/5)%2),j,1,1,j%4?'#2a4a22':'#3a6a2e');px(vx,vl,2,1,'#4a8a3a');}
  for(let i=0;i<7;i++){const mx=Math.floor(hash(i*13+1)*186),my=101+Math.floor(hash(i*3)*4);px(mx,my+1,1,2,'#c8c0a8');px(mx-1,my,3,1,i%2?'#c84a6a':'#6ae0a8');}}
 if(b===3){for(let i=0;i<8;i++){let cx0=Math.floor(hash(i*23)*190),cy=10+Math.floor(hash(i*9)*80);for(let j=0;j<7;j++){px(cx0,cy,1,1,'#c83a10');px(cx0,cy-1,1,1,'#ff8a2a40');cx0+=hash(i*100+j)>.5?1:-1;cy+=1;}}
  for(let i=0;i<5;i++){const rx=Math.floor(hash(i*31+5)*180);px(rx,104,6,2,'#1a0a08');px(rx+1,105,4,1,'#ff6a1a');}}
 if(b===4){const neb=[[40,30,34,'rgba(120,80,200,0.10)'],[150,50,40,'rgba(60,140,220,0.08)'],[100,15,26,'rgba(220,90,160,0.07)']];
  for(const [nx,ny,nr,col] of neb){for(let r=nr;r>4;r-=6){x.fillStyle=col;x.beginPath();x.arc(nx,ny,r,0,7);x.fill();}}
  px(164,14,10,10,'#3a3a7a');px(163,16,12,6,'#3a3a7a');px(165,15,4,3,'#6a6ab8');px(158,20,22,1,'#8a90d0');}
 const vg=x.createRadialGradient(96,70,50,96,70,130);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.45)');x.fillStyle=vg;x.fillRect(0,0,192,128);
 bgCache[b]=c;return c;}
function drawTorch(x,X,Y,t,col){x.fillStyle='#3a2a1a';x.fillRect(X,Y,2,8);const fl=Math.sin(t/90+X)*1.2+Math.random()*.8;x.fillStyle=col||'#ff9a2a';x.fillRect(X-1,Y-4-Math.round(fl),4,5);x.fillStyle='#ffe07a';x.fillRect(X,Y-3-Math.round(fl),2,3);
 x.fillStyle='rgba(255,170,60,0.07)';x.beginPath();x.arc(X+1,Y-2,14+fl*2,0,7);x.fill();}
function drawOverlay(x,b,t){
 if(b===0||b===2)for(let i=0;i<(b?10:6);i++){const fx=(hash(i*19)*192+Math.sin(t/900+i*2)*10+t/(b?90:160))%192,fy=40+hash(i*7)*55+Math.sin(t/700+i)*6;const g=.5+.5*Math.sin(t/250+i*3);x.fillStyle=b?`rgba(180,255,140,${g})`:`rgba(255,250,210,${g*.6})`;x.fillRect(Math.floor(fx),Math.floor(fy),1,1);}
 if(b===4){const p=(t%5200)/5200;if(p<.12){const q=p/.12,sx=40+q*110,sy=8+q*30;for(let j=0;j<6;j++){x.fillStyle=`rgba(255,255,255,${(1-j/6)*(1-q)})`;x.fillRect(Math.floor(sx-j*3),Math.floor(sy-j*.8),1,1);}}}
 if(b===0||b===2){drawTorch(x,62,48,t,b===2?'#6aff9a':null);drawTorch(x,128,48,t,b===2?'#6aff9a':null);}
 if(b===1)for(let i=0;i<7;i++){const cx=10+i*28+Math.floor(hash(i+3)*8),ch=8+Math.floor(hash(i)*10),gl=.6+.4*Math.sin(t/400+i);x.globalAlpha=gl;x.fillStyle=i%2?'#7ae8f0':'#b49af0';for(let j=0;j<ch;j++)x.fillRect(cx+Math.floor(j/3),100-j,Math.max(1,4-Math.floor(j/3)),1);x.globalAlpha=1;}
 if(b===2){for(let i=0;i<4;i++){const fx=((t/40+i*60)%240)-40;x.fillStyle='rgba(160,190,170,0.08)';x.fillRect(fx,84+i*4,50,6);}if(Math.floor(t/1500)%3!==0){x.fillStyle='#ff4a3a';x.fillRect(176,60,1,1);x.fillRect(179,60,1,1);}}
 if(b===3){const g=.5+.5*Math.sin(t/300);x.fillStyle=`rgba(255,${120+Math.round(g*60)},40,1)`;x.fillRect(0,117,192,2);x.fillStyle=`rgba(255,90,20,${.08+g*.06})`;x.fillRect(0,0,192,128);
  for(let i=0;i<12;i++){const ex=(hash(i)*192+Math.sin(t/500+i)*6)%192,ey=128-((t/30+hash(i+9)*128)%128);x.fillStyle=i%2?'#ffb03a':'#ff6a1a';x.fillRect(ex,ey,1,1);}drawTorch(x,30,50,t);drawTorch(x,160,50,t);}
 if(b===4){for(let L=1;L<=2;L++)for(let i=0;i<30;i++){const sx=(hash(i*L+50)*192-t/(L===1?120:50))%192,sy=hash(i*L+80)*96;const X=sx<0?sx+192:sx;x.fillStyle=L===2?(Math.sin(t/300+i)>.6?'#ffffff':'#c8d0ff'):'#5a64b0';x.fillRect(Math.floor(X),Math.floor(sy),1,1);}
  x.fillStyle='#2a2f6a';x.fillRect(150,70+Math.round(Math.sin(t/700)*2),26,3);x.fillRect(14,60+Math.round(Math.sin(t/600+1)*2),22,3);}}
// ---- story NPCs: drawProp(x,key) draws NPCS[key] at the NPC spot, flipped to face the hero. Rows face RIGHT.
// flags: fl = float (sine bob, no shadow), al = alpha, dx/dy = offset, still = no bob
const NPCS={
snail:mk(["................","..rwrwrwrw......",".rwrwrwrwrw.....","..y.......y.....","..y.pc.gp.y.e..e","..ytttttttt.m..m","..oooooooooommmm",".osSSSSSSssommmm","osSSooooSSsommkm","osSoSSSSoSso.mm.","osSoSooSoSsomm..","osSoSSoSoSsomm..","osSSooSSoSsomm..",".osSSSSSSsoomm..","mmmmmmmmmmmmmm..",".dddddddddddd..."],{r:'#c84a3a',w:'#f0e8d0',y:'#8a5a2a',p:'#b06ad0',c:'#f4c040',g:'#5fc04a',t:'#6a4a2a',o:'#3a2010',s:'#c07a3a',S:'#e8b870',m:'#a8b878',k:'#3a2a1a',e:'#1a0a0a',d:'#6a7a4a'}),
dwarf:mk(["................","................","......hhhh......",".....hHhhhh.....","....hhhhhhhh.ii.",".....sesses..ii.",".....sssnss...w.","....rrrssrrr..w.","...arrrrrrrra.w.","..aarrrrrrrraaw.","..aa.rrrrrr..sw.","..s..bbybbb.....",".....aaaaaa.....",".....ll..ll.....","....lll..lll....","................"],{h:'#8a9098',H:'#d0d8e0',s:'#f1c49a',e:'#1a1010',n:'#d08a6a',r:'#d0442a',a:'#4a5a8a',b:'#6a4a2a',y:'#e8b840',l:'#3a2e24',i:'#6a7078',w:'#8a5a2a'}),
miner:mk(["................","......hhhh......",".....hhhhhhL....","....hhhhhhhhL...",".....sesses.....",".....ssssss.....","....nnnssnnn....","...annnnnnnna...","..aannnnnnnnaa..","..s.nnnnnnnn.s.i","....nnnnnnnn..ii","..g..gggg.gg.w..",".gggggGggggggw..","ggGgggggggGgggg.","gggggggGgggggggg","................"],{h:'#e8c040',L:'#fff6a0',s:'#e8b48a',e:'#1a1010',n:'#c8c0b0',a:'#4a6a8a',g:'#6a6a72',G:'#9a9aa4',i:'#a0a8b0',w:'#8a5a2a'}),
witch:mk(["......p.........",".....pp.........",".....ppp........","....pppp........","...pppbpp.......",".pppppppppp.....","....gegg........","....gggn...v.v..","...ccgkgcc..v...","..ccccccccc.....","..cccccccgcoooo.","..ccccccc.ovvvvo","..ccccccc.oooooo","...cccccc.oooooo","...cccccc..oooo.","....l..l..f.ff.f"],{p:'#3a2a5a',b:'#9a5ad0',g:'#8ab060',e:'#f0e040',n:'#6a9040',k:'#2a1010',c:'#4a2a6a',v:'#7af05a',o:'#2a2a30',f:'#ff7a2a',l:'#2a1a1a'}),
ghostkid:mk(["................","......r.r.......",".....orrro......","....owwwwwo.....","...owwwwwwwo....","...owkwwwkwo....","...owtwwwtwo....","...owwwkwwwo....","..owwwwwwwwwo...",".owwowwwwwowwo..","..o.owwwwwo.o...","....owwwwwo.....","....owwwwwo.....","....owowowo.....",".....o.o.o......","................"],{o:'#6a8ab0',w:'#d8ecff',k:'#2a3a5a',t:'#6ac8ff',r:'#ff8ab0'}),
trainer:mk(["......PP........",".....PPP........","....hhhhh.......","...hHhhhhh......","...hhyvyvh......","...hhhhhhh.....w","..aaahhhaaa...w.",".aaAaaaaaAaa.w..",".aaaaaaaaaaaw...",".a.aaaAaaa.gx...",".g.aaaaaaa......","...bbbbbbb......","...aaa.aaa......","...aa...aa......","...oo...oo......","................"],{P:'#e08a8a',h:'#8ab0c8',H:'#e0f4ff',v:'#20304a',y:'#bff8ff',a:'#7a9ab8',A:'#c8e8ff',b:'#4a6a8a',g:'#9ab8d0',w:'#e8f8ff',x:'#c0a040',o:'#4a6a88'}),
farmer:mk(["...........t.t.t","...........ttttt","......yyyy....w.",".....yyryyy...w.","...yyyyyyyyyy.w.",".....ssssss...w.",".....sesses...w.",".....ssmsss...w.","....cuuuuuuc.sw.","...ccuUuuUucc.w.","...s.uuuuuu...w.",".....uuuuuu...w.",".....uu..uu...w.",".....uu..uu.....","....bbb..bbb....","................"],{y:'#e8c860',r:'#c84a3a',s:'#e8b48a',e:'#1a1010',m:'#8a3a2a',c:'#c84a3a',u:'#4a6fa8',U:'#d4a43a',w:'#8a5a2a',t:'#a0a8b0',b:'#4a3a2a'}),
granny:mk(["............yyy.","......gg...yyyyy",".....gggg..yyyyy","....gggggg..yyy.","....gssssg...w..","....qeqqeq...w..",".....ssmss...w..","....pppppp..sw..","...pppppppppw...","...ppaaaaap.....","....daaaaad.....","....daaaaad.....","....daaaaad.....","...dddddddd.....","....ll...ll.....","................"],{g:'#c8c8d0',s:'#e8c0a0',q:'#6a6a72',e:'#1a1010',m:'#a04a4a',p:'#8a4a8a',a:'#f0ece0',d:'#5a6a8a',l:'#3a2e24',y:'#d8b050',w:'#8a5a2a'}),
fairkid:mk(["..........rrr...",".........rrrrr..",".........rwrrr..",".........rrrrr..","..........rrr...","...........k....","......hhh..k....",".....hhhhh..k...",".....sesss..k...",".....smsss.s....","....ccccccc.....","...s.ccccc......",".....ccccc......",".....pp.pp......",".....bb.bb......","................"],{r:'#e0574b',w:'#ffd0c0',k:'#e8e0d0',h:'#6a4a2e',s:'#f1c49a',e:'#1a1010',m:'#c84a5a',c:'#5fc04a',p:'#4a6fa8',b:'#3a2e24'}),
fairy:mk(["n.......n......n",".n......n.....n.","..n.....n....n..","...nnnnnnnnnnn..","...n.ww.hh.ww.n.","..nnwwwhhhhwwwnn","..n.wwwsess.ww.n",".n...wwssss.w..n","n...nnwdddw.nnn.","....n..ddd..n...","...n..ddddd..n..","..n....s.s....n.",".n......n......n","n.......n.......","........n.......","................"],{n:'#7a7e90',w:'#a8f0ff',h:'#ff9ad0',s:'#ffe0c8',e:'#1a1010',d:'#6ae08a'}),
skeleton:mk(["................","................","................",".....wwwww......","....wwwwwww.....","....wkkwkkw.....","....wwwnwww.....",".....wtwtw......","....aaaaaaa.....","...aaAaaaAaa....","..w.aaaaaaa.w...","..w.aaaaaaa.w...","...wbbbbbbbyyy..","..wwwww.wwwyYy..",".wwwww...wwyyy..","................"],{w:'#e8e0c8',k:'#1a1010',n:'#3a2a2a',t:'#c8c0a8',a:'#3a3030',A:'#6a5a4a',b:'#5a3a1a',y:'#d4a43a',Y:'#f8e070'}),
phoenix:mk(["................","................","........f.......",".......ff.f.....","......frrf......","......rrkrr.....","......rrrryy....","..f..orrrr......",".ffoorrrrrr.....","ffoorrRRrrr.....",".ooorRRRRrr.....","..oorrRRrrr.....","...ooorrrr......","..gggggggggggg..",".gggGggggGgggg..","................"],{f:'#ffb03a',r:'#c84a2a',R:'#ff8a3a',k:'#1a0606',y:'#f0c040',o:'#7a2a1a',g:'#4a4448',G:'#ff6a1a'}),
stargazer:mk([".......c......tT","......ccc....tt.",".....ccycc..tt..","....ccccccctt...",".....hssshh.l...",".....hseses.l...",".....wwwwws.l...","....rwwwwwrrl...","...rrwwwwrrsll..","...rrrwwyrr.l.l.","...rrrrwrrr.l.l.","...rryrrrrr.l..l","...rrrrrrrrl...l","...rrrrrrrr.....","....bb..bb......","................"],{c:'#2a3a7a',y:'#f8e870',h:'#d8d8e0',s:'#e8c0a0',e:'#1a1010',w:'#f0f0f4',r:'#3a4a8a',t:'#b08a3a',T:'#8ae0ff',l:'#5a4a3a',b:'#2a2a33'}),
whale:mk(["............oooooooo........","........ooobbbbbbbbooo......","......oobbbsbbbbbbbsbbo.....","oo...obbbbbbbbsbbbbbbbbo....","obo.obbbsbbbbbbbbbbbbbbbo...",".obobbbbbbbbbbbbbbbbbkbbbo..","..obbbbbbbbbbbbbbbbbbbbbbbo.",".obooggggbbbbbbbbbbbbbbbbbbo","obo..ollllllgllllgllllgllbbo","oo....olllllllllllllllllllo.",".......oollllllllllllllloo..","...........oooooooooooo.....","................bbo.........","................oo.........."],{o:'#1a1a50',b:'#3a4ab0',s:'#f8f0a0',k:'#f8e870',g:'#5a6ad0',l:'#8a9ae8'}),
seer:mk(["................","......hhh.......",".....hhhhh......","....hhyhhhh.....","....hhsesh......","....hhssssh.....","...hhhhssshh....","...hhhhhhhhh.cc.","..hhhhhhhhhscWcc","..hhhhyhhhhsccc.","..hhhhhhhhh.tttt","..hhhhhhhhh..t..","..hhhhhhyhh..t..","..hhhhhhhhh.ttt.","...ddddddd......","................"],{h:'#4a2a6a',y:'#f8e870',s:'#e8c0a0',e:'#1a1010',c:'#7ad8f0',W:'#f0ffff',t:'#6a4a2a',d:'#2a1a3a'}),
gambler:mk(["................","................",".....hhhhh......","....hhhhhhh.....","..hhhhbbhhhhh...",".....sksss......",".....sssse......",".....snmns......","....vwwwwwv.....","...vvwrwwwvv.WWr","...vvwwwwwvvsWrW","...s.vvvvv..rWW.",".....pppppp.....",".....pp..pp.....","....lll..lll....","................"],{h:'#2a2a33',b:'#c84a3a',s:'#e8b48a',k:'#111111',e:'#1a1010',m:'#6a2a2a',n:'#8a7060',v:'#6a2a4a',w:'#e8e0d0',r:'#c83a3a',W:'#f8f8f0',p:'#3a3a48',l:'#2a1a1a'}),
masked:mk(["................",".kkkk...........","kkykkk..hhhh....","kkkkkk.hhhhhh...","kkrkkkhhmmmmh...","kkkkkkhhmxmxm...","kkkkkkhhmmmmm...","kkkgkkhhhmrm....","kkkkkkhhhhhhh...","kkkkkhhhhhhhhh..",".kkkkhhhhhhhhm..",".....hhhhhhhh...",".....hhhhhhhh...","......ll..ll....",".....lll..lll...","................"],{k:'#7a5a3a',y:'#f4c040',r:'#c84a3a',g:'#5fc04a',h:'#4a2a4a',m:'#f0ece0',x:'#1a1010',l:'#2a1a1a'}),
child:mk(["................","................","................","................","................","......hhhh......",".....hhhhhh.....",".....hesseh.....",".....tsmmst.....","......ssss......",".....dddddd.....","....sddddddbb...",".....ddddd.bbb..","......l..l..bb..",".....ll..ll.....","................"],{h:'#c89a5a',e:'#1a1010',s:'#f1c49a',t:'#6ac8ff',m:'#8a3a3a',d:'#e88aa8',b:'#a8743a',l:'#5a3a2a'}),
merchant:mk(["..ry............",".rrggy..........",".kkkkkk.........",".kykkkk.hhhh....",".kkkkkkhhhhhh...",".kkkrrk.sesss...",".kkkkkk.ssmss...",".kkkkkkaaaaa....",".kykkkaaaaaaa...",".kkkkkaabaaas...",".kkkkk.aaaa.....",".......bbbb.....",".......ll.ll....","......lll.lll...","................","................"],{r:'#c84a3a',y:'#f4c040',g:'#5fc04a',k:'#8a5a2a',h:'#4a6a3a',s:'#e8b48a',e:'#1a1010',m:'#8a3a2a',a:'#3a8a6a',b:'#6a4a2a',l:'#3a2e24'})};
// more story NPCs (rows face RIGHT)
Object.assign(NPCS,{
knight:mk(["................","......rr........",".....rhhhh......","....hhhhhhh.....","....hHhsesh.....","....hhhsmmh.y...",".....hhhhh..b...","...AaaaaaaA.b...","..AAattttaAggg..","..AAattttaAyyy..","..A.attDta..w...","....bbbbbb..w...","....aaa.aaa.w...","....aa...aa.w...","...AAA..AAA.w...","................"],{r:'#b8402e',h:'#9aa2ac',H:'#4a4f58',s:'#e0b090',e:'#1a1010',m:'#e0e0e4',y:'#c8a040',b:'#5a3a22',a:'#a4acb6',A:'#5e6670',t:'#4a5a8a',D:'#3e444c',g:'#6e7680',w:'#dfe6ee'}),
bard:mk(["................","...........f....","..........ff....","......hhhhf.....","....HHHHHHHH....","......qsess.....",".....qqssms..pp.",".....cccccc.n...","....ccccccsn....","....ccLLLnc.....","....cLLkLLs.....","....cLLLLLc.....",".....cLLLc......",".....dd..dd.....","....bbb..bbb....","................"],{f:'#f04a4a',h:'#7a3aa8',H:'#4e2478',q:'#d0803a',s:'#f1c49a',e:'#1a1010',m:'#b04a4a',c:'#2f9a7a',L:'#e0a040',k:'#4a2a10',n:'#7a4a22',p:'#f0e0b0',d:'#c84a6a',b:'#4a3020'}),
monk:mk(["................","................","......ssss......",".....sSssss.....",".....sesses.....",".....ssssss.....","......ssss......","....ooooooo.....","...ooOooooo.....","...oooOoooKKKK..","...ooooOosbbbb..","...oooooOo.bb...","...ooooooOo.....","....ooooooo.....","....ll...ll.....","................"],{s:'#d8a070',S:'#f4cca4',e:'#1a1010',o:'#ec8a24',O:'#a8501a',K:'#7a7a84',b:'#2a2a30',l:'#b07a4a'}),
thief:mk(["................","......hhhh......",".....hhhhhh.....","....hhhhhhhh....","....hhkkekkh....","....hhkmmmmh....",".....hhhhhh.....","...hhaaaaah...w.","..hhaaaaaaa..w..","..hhabbaaaasy...","..hh.aaaaa......","..h..bbPbb......",".....aa.aa......",".....ll.ll......","....lll.lll.....","................"],{h:'#3e3a52',k:'#120f18',e:'#f0e060',m:'#262230',a:'#6a503a',b:'#3a2a1e',P:'#e0b030',s:'#d8a878',y:'#c8a040',w:'#e0e8f0',l:'#28222c'}),
smith:mk(["................","............HHH.",".....hhhhh..HHH.","....hhhhhhh..w..","....hsesses..w..","....BBssnsB..w..",".....BBBBB..ss..","..sssAsssAsss...",".ssssaaaaaa.....",".ss.aaaaaaa.....",".s..aaaaaaa.....","....aaaaaaa.....",".....pp..pp.....",".....pp..pp.....","....lll..lll....","................"],{H:'#6a707a',w:'#8a5a2a',h:'#2a1a14',s:'#c88a5e',e:'#1a1010',n:'#a0663e',B:'#3a2214',A:'#4a321e',a:'#7a5232',p:'#3a3a44',l:'#1e1a18'}),
cat:mk(["................","................","................","................","...........kkk..","...........kkk..","...........rrr..",".........okkkkko",".........oooooo.",".........oogogo.","..t......oowNwo.","..t.....oooooo..","..t....oOooOoo..","...t..oOooOoowo.","....tooooooowwo.","................"],{k:'#2a2a33',r:'#c83a3a',o:'#e8963e',O:'#b0601e',g:'#14301a',w:'#f6eee0',N:'#ff8aa8',t:'#e8963e'}),
hunter:mk(["................","......ffff.w....",".....fFffFftw...","....ffffffft.w..","....fsesses.tw..","....fsssssst..w.",".r...sssss.t..w.","..rqaaaaaassssw.","..qqaAaaaa.t..w.","..qqaaAaaa.t.w..","..qq.bbbbb.t.w..","..q..aaaaa.tw...",".....aa.aa.w....",".....ll.ll......","....lll.lll.....","................"],{f:'#9a7450',F:'#5a4030',s:'#d8a070',e:'#1a1010',r:'#d84a3a',q:'#6a4428',a:'#4a6a32',A:'#2e4620',b:'#5a3a22',l:'#3a2a1e',w:'#9a6a32',t:'#e8e0c8'}),
scholar:mk(["................","................","......ssss......",".....sSssss.....","....wsesgeg.....","....wssssss.....","....wwwwwww.....","...rrwwwwwwr....","...rrrwwwwrrsPP.","...rrrrwwrrr.pp.","...rrrrrwrrr.kp.","...rrrrrrrrrspp.","...rrrrrrrrr.PP.","...yyyyyyyyy....","....ll...ll.....","................"],{s:'#e0b090',S:'#f4d0b0',e:'#1a1010',g:'#c8a040',w:'#e8e8ec',r:'#4a5a8a',y:'#c8a040',P:'#a8865a',p:'#f0e4c0',k:'#6a5a4a',l:'#3a2e24'}),
noble:mk(["................","......hhhh......",".....hhhhhh.....","....yyyyyyyy....","....qsesses.....","....qsssMMM.....","....qqwwwww.....","...cccwwwwc.....","..cccccccyc.Y...","..cc.ccccycsk...","..cc.ccccyc.k...","..cccccccyc.k...","..ccc.pp.pp.k...","......pp.pp.k...",".....lyl.lylk...","................"],{h:'#4a1a4a',y:'#f0c040',Y:'#ffe080',q:'#e8d890',s:'#f6d6b8',e:'#1a1010',M:'#a8885a',w:'#f8f4ec',c:'#9a1a3e',p:'#2a2a33',l:'#1a1a1e',k:'#2a1a14'}),
cultist:mk(["................",".......rr.......","......rrrr......",".....rrrrrr.....","....rrrkkkkr....","....rrkgkkgr....","....rrkkkkkr....","...rrrrkkkrrr...","...rRrrrrrrrRr..","..rRrrrrrrrsbbb.","..rRrrrrrrr.byb.","..rRrrrrrrr.bbb.","..rRrrryrrrr....","..rrrrrrrrrrr...","..RRRRRRRRRRRR..","................"],{r:'#a81c1c',R:'#5a0a10',k:'#0e0608',g:'#ffe84a',s:'#d8c0b0',b:'#1a1014',y:'#ff6a2a'}),
imp:mk(["................","................","........f.......",".......fFf......",".....h.fFf.h....",".....hrrrrrh....",".....rrrryry....",".....rrrrkWk....","...ww.rrrrr.....",".wwwwwRrrrrR....","..wwwwrrrrrs....","...w...r.r......","........tt......",".........t......","................","................"],{f:'#ff9a2a',F:'#fff07a',h:'#3a1010',r:'#e8482a',R:'#a02010',y:'#fff07a',k:'#2a0808',W:'#ffffff',w:'#6a1828',t:'#ffb03a',s:'#a02010'}),
healer:mk(["................",".....gggg.......","....gggggg......","...gGgggggg.....","...ghsesses.....","...ghssmss......","...hh.sss.......","...hdddddd......","...ddaaaadd.....","..sddaaaaddsGpG.","...ddaaaaaBBBBB.","...ddaaaaa.BBB..","...dddddddd.....","....dd...dd.....","....bb...bb.....","................"],{g:'#4a8a4a',G:'#2e6a32',h:'#6a3a1a',s:'#e8b48a',e:'#1a1010',m:'#b04a4a',d:'#8a5a3a',a:'#e8dcc0',B:'#b08040',p:'#c86ad0',b:'#4a3020'})});
for(const k in NPCS){NPCS[k].shade=true;NPCS[k].sh=true;}
for(const k of ['ghostkid','trainer','whale']){NPCS[k].sh=false;NPCS[k].fl=true;NPCS[k].al=.82;}
NPCS.trainer.al=.72;NPCS.whale.dx=-6;NPCS.whale.dy=-14;
NPCS.fairy.sh=false;NPCS.fairy.still=true;NPCS.fairy.dy=-4;NPCS.phoenix.still=true;
NPCS.imp.sh=false;NPCS.imp.fl=true;NPCS.imp.al=.92;NPCS.imp.dy=-6;
// ---- companions (mercenaries): compSpr(c), c={n,cls,tr,legend}. Look = class outfit + trait overlay/palette + name-seeded skin/hair/shade.
const HAIRS=['#2a1a14','#5a3a22','#8a5a2a','#c88a3a','#e8c860','#a0a0a8','#7a2a1a','#1a1a2a'];
function hexMix(a,b,t){const p=c=>parseInt(c.slice(1),16),A=p(a),B=p(b),f=(s)=>Math.round(((A>>s)&255)*(1-t)+((B>>s)&255)*t);return'#'+[16,8,0].map(s=>f(s).toString(16).padStart(2,'0')).join('');}
// px: [row,col,ch] overlay on HERO_ROWS ('.' clears). pal(P,cls): palette tweak.
const COMP_TR={
brave:{px:[[2,4,'R'],[2,5,'R'],[2,6,'R'],[2,7,'R'],[2,8,'R'],[2,9,'R'],[2,10,'R'],[3,3,'R'],[4,2,'R'],[3,9,'X'],[5,8,'X'],[8,10,'W'],[11,2,'.']],p:{R:'#d8302a',X:'#a83838',W:'#f0ece0'}},
cheap:{px:[[10,9,'T'],[11,9,'P'],[11,10,'P'],[12,9,'P'],[12,10,'P'],[10,10,'Y'],[9,4,'Q'],[10,7,'Q']],p:{P:'#8a6034',T:'#4a3020',Y:'#f4c040',Q:'#8a8070'},pal:P=>{P.a=hexMix(P.a,'#7a7468',.45);P.c=hexMix(P.c,'#6a6458',.5);}},
lucky:{px:[[0,7,'G'],[0,9,'G'],[1,8,'G'],[0,8,'g'],[7,6,'Y'],[7,8,'Y'],[8,7,'G'],[5,9,'K']],p:{G:'#4ad86a',g:'#2a9a4a',Y:'#ffe060',K:'#ff9ab0'},pal:P=>{P.a=hexAdj(P.a,.2);P.c=hexAdj(P.c,.18);}},
shield:{px:[[4,14,'.'],[5,14,'.'],[6,13,'.'],[6,4,'U'],[7,3,'U'],[7,4,'U'],[5,11,'K'],[5,12,'K'],[5,13,'K'],[6,10,'K'],[6,11,'S'],[6,12,'S'],[6,13,'S'],[6,14,'K'],[7,10,'K'],[7,11,'S'],[7,12,'E'],[7,13,'S'],[7,14,'K'],[8,10,'K'],[8,11,'E'],[8,12,'E'],[8,13,'E'],[8,14,'K'],[9,10,'K'],[9,11,'S'],[9,12,'E'],[9,13,'S'],[9,14,'K'],[10,10,'K'],[10,11,'S'],[10,12,'S'],[10,13,'S'],[10,14,'K'],[11,11,'K'],[11,12,'S'],[11,13,'K'],[12,12,'K'],[12,5,'a'],[12,10,'a']],p:{K:'#3a4250',S:'#8a96a4',U:'#6a7684'},pal:(P)=>{P.E=P.c;}},
loyal:{px:[[3,3,'Y'],[4,3,'N'],[5,3,'N'],[6,2,'Y'],[6,3,'Y'],[6,4,'Y'],[7,3,'M'],[8,3,'M'],[9,3,'M'],[10,3,'M'],[11,3,'M'],[12,3,'M'],[7,4,'V'],[8,5,'V'],[9,6,'V'],[10,7,'V'],[11,8,'V']],p:{Y:'#c8a040',N:'#5a3a22',M:'#c8c0b0'},pal:(P,cls)=>{P.V=cls==='mag'?'#9a2a3a':'#2a4aa8';}},
mouth:{px:[[0,6,'h'],[0,7,'h'],[0,8,'h'],[0,9,'h'],[1,10,'h'],[5,8,'K'],[5,9,'W'],[7,6,'Y'],[7,7,'Y'],[7,8,'Y'],[8,7,'Y'],[6,4,'Y']],p:{K:'#5a1420',W:'#ffffff',Y:'#ffd040'},pal:P=>{P.c='#e04aa0';P.a=hexAdj(P.a,.1);}},
medic:{px:[[2,8,'O'],[2,9,'O'],[8,7,'D'],[9,8,'D'],[10,9,'B'],[10,10,'B'],[10,11,'B'],[11,9,'B'],[11,10,'+'],[11,11,'B'],[12,9,'B'],[12,10,'B'],[12,11,'B'],[11,5,'G'],[11,6,'J']],p:{O:'#d8e0e8',D:'#5a4030',B:'#ece6d6','+':'#d8302a',G:'#4ac06a',J:'#8a5ad0'},pal:P=>{P.a=hexMix(P.a,'#e4e0d4',.5);}}};
function compVar(c){const s=seedOf('comp:'+(c.n||'')),L=lookOf({form:'human',seed:c.n||''});
 return{skin:L.skin%SKINS.length,hair:Math.floor(hash(s+31)*HAIRS.length),v:Math.floor(hash(s+57)*3)};}
function compKey(c){if(!c)return heroSpr('npc').id;const cls=c.cls||'npc';if(!COMP_TR[c.tr])return heroSpr(cls).id;
 const V=compVar(c);return'cp:'+cls+':'+c.tr+':'+(c.legend?1:0)+':'+V.skin+':'+V.hair+':'+V.v;}
function compSpr(c){if(!c)return heroSpr('npc');const cls=c.cls||'npc',T=COMP_TR[c.tr];if(!T)return heroSpr(cls);
 const id=compKey(c);let s=heroCache.get(id);if(s)return s;const V=compVar(c);
 const P=Object.assign({s:SKINS[V.skin],e:'#1a1010',l:'#3a2e24'},HP_[cls]||HP_.npc);
 if(cls!=='mag')P.h=HAIRS[V.hair];else P.h=hexAdj(P.h,[-.15,0,.12][V.v]);
 P.a=hexAdj(P.a,[-.1,0,.1][V.v]);
 Object.assign(P,T.p);if(T.pal)T.pal(P,cls);
 if(c.legend){P.b='#f0c040';P.L='#ffe890';}
 const G=HERO_ROWS.map(r=>r.split(''));for(const [y,x,ch] of T.px)G[y][x]=ch;
 if(c.legend){G[1][5]='L';G[1][9]='L';G[0][7]='L';}
 s=mk(G.map(r=>r.join('')),P);s.id=id;s.sh=true;if(heroCache.size>200)heroCache.clear();heroCache.set(id,s);return s;}
function drawProp(x,pr,t){const X=126,Y=84;if(!pr)return;
 const N=NPCS[pr];
 if(N){const b=N.still?0:N.fl?Math.round(Math.sin(t/450)*2):(Math.floor(t/500)%2),ga=x.globalAlpha;if(N.al)x.globalAlpha=ga*N.al;
  blit(x,N,X+(N.dx||0),Y+4+(N.dy||0)+b,{flip:true,key:'npc:'+pr});x.globalAlpha=ga;}
 else if(pr==='chest')blit(x,PROPS.chest,X,Y+4);
 else if(pr==='grave')blit(x,PROPS.grave,X,Y+4);
 else if(pr==='egg')blit(x,PROPS.egg,X+3,Y+12);
 else if(pr==='npc')blit(x,heroSpr('npc'),X,Y+4+(Math.floor(t/500)%2),{flip:true,key:'npc'});
 else if(pr==='well'){x.fillStyle='#5a6a72';x.fillRect(X,Y+10,18,10);x.fillStyle='#3a8ac8';x.fillRect(X+2,Y+10,14,2);x.fillStyle='#4a3a2a';x.fillRect(X,Y-4,2,14);x.fillRect(X+16,Y-4,2,14);x.fillRect(X-1,Y-5,20,2);}
 else if(pr==='fire'){x.fillStyle='#4a2a1a';x.fillRect(X+2,Y+17,14,3);for(let i=0;i<5;i++){const h=4+Math.round(Math.random()*5);x.fillStyle=i%2?'#ffb03a':'#ff5a1a';x.fillRect(X+4+i*2,Y+17-h,2,h);}}
 else if(pr==='altar'){x.fillStyle='#4a4a52';x.fillRect(X,Y+8,18,12);x.fillStyle='#6a6a72';x.fillRect(X-2,Y+6,22,3);x.fillStyle=`rgba(255,80,80,${.5+.4*Math.sin(t/300)})`;x.fillRect(X+7,Y+2,4,4);}
 else if(pr==='crystal'){const g=.6+.4*Math.sin(t/300);x.globalAlpha=g;x.fillStyle='#8af0ff';for(let j=0;j<16;j++)x.fillRect(X+8-Math.floor((16-j)/4),Y+4+j,Math.max(2,Math.floor(j/2)),1);x.globalAlpha=1;}
 else if(pr==='portal'){for(let r=10;r>2;r-=2){x.strokeStyle=r%4?'#7ae8f0':'#f4bb4a';x.beginPath();x.ellipse(X+9,Y+8,r*.7+Math.sin(t/200+r)*.6,r,0,0,7);x.stroke();}}
 else if(pr==='star'){const yy=Y+Math.sin(t/300)*3;x.fillStyle='#f8e870';x.fillRect(X+7,yy,3,9);x.fillRect(X+4,yy+3,9,3);x.fillStyle='#fff';x.fillRect(X+8,yy+4,1,1);}
 else if(pr==='book'){x.fillStyle='#6a3a2a';x.fillRect(X,Y+6,18,14);for(let i=0;i<5;i++){x.fillStyle=['#c84a3a','#4a8ac8','#d4a43a','#5ab05a','#a86ad0'][i];x.fillRect(X+1+i*3,Y+8,2,10);}}
 else if(pr==='shrine'){x.fillStyle='#5a4a3a';x.fillRect(X-2,Y-6,24,4);x.fillRect(X,Y-2,2,22);x.fillRect(X+18,Y-2,2,22);x.fillStyle=`rgba(244,187,74,${.5+.3*Math.sin(t/400)})`;x.fillRect(X+6,Y+6,8,8);x.fillStyle='#f4bb4a';blit(x,COIN,X+6,Y+12);}
 else blit(x,heroSpr('npc'),X,Y+4+(Math.floor(t/500)%2),{flip:true,key:'npc'});}
// ---- end cinematic: funeral ground (dusk) and summit night (win), candle, wreath, headstone ----
const CANDLE=mk(["..w..","..w..",".www.",".wwy.",".wwy.",".wwy.","ooooo"],{w:'#f1e7d0',y:'#c8b890',o:'#5a4a3a'});
const WREATH=mk(["..gggg..",".gGrrGg.","gGr..rGg","gr....rg","gr....rg","gGr..rGg",".gGrrGg.","..gggg.."],{g:'#3a6a2a',G:'#5a9a3a',r:'#e86a8a'});
const STONE=mk(["...oooooo...","..osssssso..",".osssssssso.",".osskkkksso.",".osssssssso.",".ossskkssso.",".osssskssso.",".ossskkksso.",".osssssssso.",".osssssssso.",".osssssssso.",".osssssssso.","oooooooooooo","dddddddddddd"],{o:'#2a2e33',s:'#9aa0a8',k:'#4a4e56',d:'#4a3a2a'});
const funC={};
function funeralBg(win){const k=win?'w':'f';if(funC[k])return funC[k];const c=document.createElement('canvas');c.width=192;c.height=128;const x=c.getContext('2d');
 const px=(X,Y,w,h,col)=>{x.fillStyle=col;x.fillRect(X,Y,w,h);};
 const sky=win?['#0a0c24','#141a44','#2a2a6a','#4a3a7a']:['#1a1a2e','#3a2a48','#6a3a5a','#a8586a'];
 for(let i=0;i<4;i++)px(0,i*24,192,24,sky[i]);for(let i=0;i<4;i++)px(0,i*24+20,192,4,sky[Math.min(3,i+1)]+'80');
 for(let i=0;i<(win?80:24);i++)px(Math.floor(hash(i*13+1)*192),Math.floor(hash(i*7+3)*(win?90:46)),1,1,hash(i)>.7?'#ffffff':'#a8a8d8');
 if(!win){x.fillStyle='#f4d8a0';x.beginPath();x.arc(150,72,9,0,7);x.fill();px(0,74,192,26,'#6a3a5a');}
 else{x.fillStyle='#f6f0d0';x.beginPath();x.arc(36,22,7,0,7);x.fill();x.fillStyle=sky[0];x.beginPath();x.arc(39,20,6,0,7);x.fill();}
 for(let X=0;X<192;X++){const h=10+Math.round(Math.sin(X/23)*5+Math.sin(X/9+1)*2+hash(X)*1.5);px(X,92-h,1,h+8,win?'#101430':'#2a2238');}
 for(let X=0;X<192;X++){const h=4+Math.round(Math.sin(X/17+2)*3+hash(X+300)*1.2);px(X,98-h,1,h+2,win?'#161c3a':'#3a2e3e');}
 px(0,100,192,28,win?'#3a3e5a':'#3d5a34');for(let k=0;k<24;k++)px(k*8,100+(k%3),8,2,win?'#4a4e6a':'#4f7a3a');px(0,100,192,1,'#0006');
 if(!win){for(let i=0;i<40;i++){const gx=Math.floor(hash(i*3+7)*192);px(gx,99-Math.floor(hash(i+2)*3),1,3,hash(i+5)>.5?'#6a9a42':'#4f7a34');}
  for(let i=0;i<5;i++){const sx=8+i*44+Math.floor(hash(i*5)*14);if(sx>70&&sx<120)continue;px(sx,90,5,10,'#5a5e66');px(sx+1,89,3,1,'#5a5e66');px(sx+2,92,1,4,'#3a3e44');px(sx+1,93,3,1,'#3a3e44');}
  for(let X=0;X<192;X+=6){px(X,94,1,7,'#2a1e18');}px(0,95,192,1,'#2a1e18');px(0,98,192,1,'#2a1e18');}
 else{px(56,100,80,6,'#5a5e7a');px(60,98,72,2,'#6a6e8a');for(let i=0;i<10;i++)px(60+i*8,96,2,4,'#8a8ea8');}
 for(let i=0;i<14;i++)px(Math.floor(hash(i*11+9)*190),104+Math.floor(hash(i*5+4)*20),1,1,win?'#8a8ea8':'#f4e070');
 const vg=x.createRadialGradient(96,80,40,96,80,130);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.5)');x.fillStyle=vg;x.fillRect(0,0,192,128);
 funC[k]=c;return c;}
// candle flame flickers with t (static when t is 0)
function drawCandle(x,X,Y,t,i){blit(x,CANDLE,X,Y,{key:'candle',noShadow:true});const fl=t?Math.round(Math.sin(t/110+i*2.1)+Math.sin(t/47+i)*.6):0;
 x.fillStyle='rgba(255,200,90,0.16)';x.fillRect(X-2,Y-6,9,8);x.fillStyle='#ff9a2a';x.fillRect(X+1,Y-3-Math.max(0,fl),3,3+Math.max(0,fl));x.fillStyle='#fff2a0';x.fillRect(X+2,Y-2,1,2);}
window.ART={CANDLE,WREATH,STONE,funeralBg,drawCandle,mk,heroSpr,lookOf,rollLook,heroLook,HERO_ROWS,HP_,MSPR,BSPR,BOSS_ROWS,BOSS_PAL,PSPR,PROPS,NPCS,COIN,ICONS,sprCanvas,blit,BG,hash,bgImg,drawTorch,drawOverlay,drawProp,compSpr,compKey};
})();
