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
const CLS_HUE={nec:280,ang:50,war:4,mag:220,arc:105,pri:48,rog:270,far:30,dra:345,npc:35,ghost:205};
// v2.1 hidden class: dsl = dragon slayer (dark leather, red trophy cape, big greatsword); slime form = horned dragon-skull helm + greatsword
HP_.dsl={h:'#3a2218',a:'#6a3a24',b:'#3a1e12',c:'#a01e1e',w:'#d8e0ea'};
ACC.dsl={r:['..............SL','.H..........H.SL','.HH........HH.SL','..HKKKKKKKKH..SL','...KBBKKBBK...SL','...KBEKKBEK...SL','....KKKKKK....SL','....T.T..T.T..SL','..............SL','..............SL','.............GGG','..............W.','..............W.','..............P.'],p:{H:'#a08868',K:'#e8dcc0',B:'#2a1a14',E:'#ff4a2a',T:'#fff8e8',S:'#b8c2d0',L:'#f4f8ff',G:'#b02a22',W:'#4a2a1a',P:'#e0b040'}};
CLS_HUE.dsl=18;
// v0.3.5.5 new slime eyes (8-11: big, dizzy X, heart, star) and mouths (7-9: fangs, wavy, grin). Only seeds from the new rollLook (seed&1023===777)
// can land on them, so every slime made before keeps its face. z = star yellow, q = heart red.
const EYES_OLD=EYES.length,MOUTHS_OLD=MOUTHS.length;
EYES.push([[-1,0,'k'],[0,0,'w'],[1,0,'k'],[-1,1,'k'],[0,1,'k'],[1,1,'k']],[[-1,-1,'k'],[-1,1,'k'],[0,0,'k'],[1,-1,'k'],[1,1,'k']],[[0,-1,'q'],[0,1,'q'],[1,-1,'q'],[1,0,'q'],[1,1,'q'],[2,0,'q']],[[-1,0,'z'],[0,-1,'z'],[0,0,'z'],[0,1,'z'],[1,0,'z']]);
MOUTHS.push([[12,8,'k'],[12,9,'k'],[12,10,'k'],[12,11,'k'],[13,8,'w'],[13,11,'w']],[[13,7,'k'],[12,8,'k'],[13,9,'k'],[12,10,'k'],[13,11,'k']],[[12,7,'k'],[12,8,'w'],[12,9,'w'],[12,10,'w'],[12,11,'k'],[13,8,'k'],[13,9,'k'],[13,10,'k']]);
const isV2=v=>typeof v==='number'&&((v>>>0)&1023)===777;
// v0.3.5.4 more variety. slime body shapes (top = first body row; hats drop down by top-5 when the body sits lower), patterns on 'b' cells
const SL_SHAPES=[{t:5,r:SL_BODY},
{t:2,r:["................","................",".......oo.......","......obbo......",".....olbbbo.....","....ollbbbbo....","...ollbbbbbbo...","..olbbbbbbbbbo..","..obbbbbbbbbbo..",".obbbbbbbbbbbbo.",".obbbbbbbbbbbbo.",".obbbbbbbbbbbbo.",".obbbbbbbbbbbbo.",".odbbbbbbbbbbdo.","..oddbbbbbbddo..","...oooooooooo..."]},
{t:7,r:["................","................","................","................","................","................","................","....oooooooo....","..oollbbbbbboo..",".ollbbbbbbbbbbo.","obbbbbbbbbbbbbbo","obbbbbbbbbbbbbbo","obbbbbbbbbbbbbbo","odbbbbbbbbbbbbdo","oddbbbbbbbbbbddo",".oooooooooooooo."]},
{t:3,r:["................","................","................","......oooo......","....oollbboo....","...ollbbbbbbo...","..ollbbbbbbbbo..","..obbbbbbbbbbo..","..obbbbbbbbbbo..","..obbbbbbbbbbo..","..obbbbbbbbbbo..","..obbbbbbbbbbo..","..obbbbbbbbbbo..","..odbbbbbbbbdo..","..oddbbbbbbddo..","...oooooooooo..."]},
{t:5,r:["................","................","................","...o........o...","...oo......oo...","...obo....obo...","...obboooobbo...","..olbbbbbbbbbo..","..olbbbbbbbbbo..",".obbbbbbbbbbbbo.",".obbbbbbbbbbbbo.",".obbbbbbbbbbbbo.",".obbbbbbbbbbbbo.",".odbbbbbbbbbbdo.",".oddbbbbbbbbddo.","..oooooooooooo.."]}];
const SL_PATS=[[],[[8,9,'d'],[9,5,'d'],[13,12,'d'],[14,7,'d'],[7,7,'d'],[9,12,'d']],[[13,6,'l'],[13,7,'l'],[13,8,'l'],[13,9,'l'],[13,10,'l'],[14,7,'l'],[14,8,'l'],[14,9,'l']],[[7,5,'w'],[8,4,'w'],[8,5,'l']],[[8,2,'d'],[8,3,'d'],[8,4,'d'],[8,5,'d'],[8,6,'d'],[8,7,'d'],[8,8,'d'],[8,9,'d'],[8,10,'d'],[8,11,'d'],[8,12,'d'],[8,13,'d']]];
// human hair styles: [row,col,ch] overlays on HERO_ROWS (face looks right, back of head at col 4). Only for classes whose 'h' is hair.
const HSTY=[[],[[0,5,'h'],[0,7,'h'],[0,9,'h'],[1,4,'h']],[[4,3,'h'],[5,3,'h'],[6,3,'h'],[6,4,'h']],[[2,3,'h'],[3,2,'h'],[3,3,'h'],[4,2,'h'],[5,2,'h']],[[3,6,'h'],[3,7,'h']],[[1,5,'.'],[1,6,'s'],[1,7,'s'],[1,8,'s'],[1,9,'.'],[2,6,'s'],[2,7,'s'],[2,8,'s'],[2,9,'s'],[2,10,'s']],[[0,4,'h'],[0,5,'h'],[0,6,'h'],[0,7,'h'],[0,8,'h'],[0,9,'h'],[1,4,'h'],[1,10,'h'],[2,3,'h'],[3,3,'h']]];
const BEARDS=[[],[[6,5,'h'],[6,6,'h'],[6,7,'h'],[6,8,'h'],[5,9,'h']],[[5,7,'h'],[5,8,'h'],[5,9,'h']]];
const HCOLS=['#2a1a14','#5a3a22','#8a5a2a','#c88a3a','#e8c860','#a0a0a8','#7a2a1a','#1a1a2a','#d86a9a','#4a7ad0','#e8e8f0','#3a8a5a'];
const ECOLS=['#1a1010','#1a1010','#2a4a8a','#2a6a3a','#5a3a1a','#7a2a6a'];
const HAIR_CLS={war:1,arc:1,pri:1,dra:1,dsl:1,npc:1};
// v0.3.5.5 face accessories for every class: glasses, eyepatch, scar, freckles. rare: 1 = two eye colours, 2 = flame hair (hair classes only)
const HACC=[[],[[4,5,'G'],[4,7,'G'],[4,8,'G'],[4,10,'G']],[[4,9,'P'],[3,10,'P'],[3,8,'P'],[3,7,'P'],[3,6,'P']],[[3,7,'X'],[4,8,'X'],[5,8,'X']],[[5,6,'K'],[5,8,'K']]];
const HACC_PAL={G:'#d8d8e0',P:'#1a1418',X:'#b04848',K:'#9a5a3a'};
// names + odds for the look label (auto.js lookInfo); index 0 = plain, no name
const LOOKN={shape:['','ทรงหยดน้ำ','ทรงแบน','ทรงสูง','หูแมว'],pat:['','ลายจุด','ท้องขาว','ตัววาว','คาดแถบ'],srare:['','คริสตัล','เงามืด','ทองคำ'],
 eye:{8:'ตาโต',9:'ตามึน',10:'ตาหัวใจ',11:'ตาดาว'},mouth:{7:'เขี้ยวแหลม',8:'ปากหยัก',9:'ยิ้มกว้าง'},
 hair:['','ผมชี้','ผมยาว','หางม้า','หน้าม้า','หัวเกือบโล้น','ผมฟู'],beard:['','มีเครา','มีหนวด'],hcol:{8:'ผมชมพู',9:'ผมฟ้า',10:'ผมสีเงิน',11:'ผมเขียว'},
 acc:['','ใส่แว่น','ผ้าปิดตา','แผลเป็น','มีกระ'],hrare:['','ตาสองสี','ผมไฟ']};
const HACC_P=[.55,.15,.08,.1,.12];
function humanRows(k,L){const G=HERO_ROWS.map(r=>r.split(''));if(!L||k==='ghost')return HERO_ROWS;
 if(HAIR_CLS[k]){for(const [y,x,ch] of HSTY[L.hair%HSTY.length].concat(BEARDS[L.beard%BEARDS.length]))G[y][x]=ch;
  if(L.rare===2)for(const [y,x] of [[0,5],[0,7],[0,9],[1,6],[1,8]])G[y][x]='F';}
 if(L.rare===1)G[4][9]='E';
 for(const [y,x,ch] of HACC[L.acc%HACC.length])G[y][x]=ch;return G.map(r=>r.join(''));}
function seedOf(v){if(typeof v==='number')return v>>>0;const s=String(v);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
const SKINS=['#f1c49a','#e8b48a','#c88a5e','#a0663e','#f6d6b8','#7a4a2e'];
// look -> normalized {form,hue,sat,lit,eye,mouth,blush,skin}. Accepts seed number/string or {form,seed,...overrides}.
function lookOf(v){const o=v&&typeof v==='object'?v:{seed:v};const s=seedOf(o.seed??0),r=i=>hash(s+i*7919),v2=isV2(o.seed);
 return Object.assign({form:'slime',hue:Math.floor(r(1)*360),sat:58+Math.floor(r(2)*22),lit:52+Math.floor(r(3)*12),eye:Math.floor(r(4)*(v2?EYES.length:EYES_OLD)),mouth:Math.floor(r(5)*(v2?MOUTHS.length:MOUTHS_OLD)),blush:r(6)<.55,skin:Math.floor(r(7)*SKINS.length),
  shape:r(8)<.4?0:1+Math.floor(r(9)*(SL_SHAPES.length-1)),pat:r(10)<.45?0:1+Math.floor(r(16)*(SL_PATS.length-1)),hair:Math.floor(r(11)*HSTY.length),beard:r(12)<.7?0:r(12)<.86?1:2,hcol:r(13)<.45?-1:Math.floor(r(15)*HCOLS.length),ecol:Math.floor(r(14)*ECOLS.length),
  acc:(()=>{let x=r(18),i=0;while(i<HACC_P.length-1&&x>=HACC_P[i]){x-=HACC_P[i];i++;}return i;})(),rr:r(17)},o);}
// rare roll rr -> slime 1 crystal 1.2% / 2 shadow 1.2% / 3 gold 0.6%; human 2 flame hair 1% (hair classes) / 1 two eye colours 2% (3% for hooded classes)
const slRare=L=>L.rr<.006?3:L.rr<.018?2:L.rr<.03?1:0;
const huRare=(L,k)=>HAIR_CLS[k]?(L.rr<.01?2:L.rr<.03?1:0):(L.rr<.03?1:0);
// label parts + odds of everything except slime colour / human skin
function lookExtra(L,k){const n=[];let p=1;const P=(arr,i,ps)=>{p*=ps;if(arr[i])n.push(arr[i]);};
 if(L.form!=='human'){const ra=slRare(L);p*=[.97,.012,.012,.006][ra];
  P(LOOKN.shape,L.shape%SL_SHAPES.length,L.shape?.15:.4);P(LOOKN.pat,L.pat%SL_PATS.length,L.pat?.1375:.45);
  const v2=isV2(L.seed);p*=1/(v2?EYES.length:EYES_OLD)/(v2?MOUTHS.length:MOUTHS_OLD);if(LOOKN.eye[L.eye])n.push(LOOKN.eye[L.eye]);if(LOOKN.mouth[L.mouth])n.push(LOOKN.mouth[L.mouth]);
  return{n,p,rare:LOOKN.srare[ra]};}
 const hc=HAIR_CLS[k],ra=huRare(L,k);p*=ra?(ra===2?.01:hc?.02:.03):.97;if(ra)n.push(LOOKN.hrare[ra]);
 if(hc){P(LOOKN.hair,L.hair%HSTY.length,1/HSTY.length);P(LOOKN.beard,L.beard%BEARDS.length,[.7,.16,.14][L.beard%3]);
  if(ra!==2){p*=L.hcol<0?.45:.55/HCOLS.length;if(L.hcol>=0&&LOOKN.hcol[L.hcol])n.push(LOOKN.hcol[L.hcol]);}}
 p*=(L.ecol%ECOLS.length)<2?2/ECOLS.length:1/ECOLS.length;P(LOOKN.acc,L.acc%HACC.length,HACC_P[L.acc%HACC.length]);
 return{n,p,rare:''};}

const rollLook=form=>({form:form==='human'?'human':'slime',seed:Math.floor(Math.random()*4194304)*1024+777});
// hero object -> look (old saves without look: human, seeded from name)
const heroLook=h=>h&&h.look?h.look:{form:'human',seed:h?h.name:0};
const hsl=(h,s,l)=>`hsl(${((h%360)+360)%360},${Math.max(0,Math.min(100,s))}%,${Math.max(0,Math.min(100,l))}%)`;
function slimeRows(k,L){const SH=SL_SHAPES[(L.shape||0)%SL_SHAPES.length],G=SH.r.map(r=>r.split(''));const put=(y,x,c)=>{if(y>=0&&y<16&&x>=0&&x<16)G[y][x]=c;},onB=(y,x,c)=>{if(G[y]&&(G[y][x]==='b'||G[y][x]==='l'))G[y][x]=c;};
 for(const [y,x,ch] of SL_PATS[(L.pat||0)%SL_PATS.length])onB(y,x,ch);
 if(k==='ghost'){G[14]=SL_GHOST_TAIL[0].split('');G[15]=SL_GHOST_TAIL[1].split('');}
 const E=EYES[L.eye%EYES.length];
 if(E==='wink'){put(10,7,'k');put(11,7,'k');put(11,11,'k');put(11,12,'k');}
 else for(let e=0;e<2;e++)for(const [dr,dc,ch] of E)put(10+dr,(e?11:7)+(e&&E===EYES[5]?-dc:dc),ch);
 for(const [y,x,ch] of MOUTHS[L.mouth%MOUTHS.length])put(y,x,ch);
 if(L.blush){onB(12,4,'p');onB(12,13,'p');if(G[12][4]!=='p')onB(12,5,'p');if(G[12][13]!=='p')onB(12,12,'p');}
 const A=ACC[k],dy=Math.max(0,SH.t-5);if(A)A.r.forEach((row,y)=>{for(let x=0;x<row.length;x++)if(row[x]!=='.')put(y+dy,x,row[x]);});
 return G.map(r=>r.join(''));}
const heroCache=new Map();
// v2.5 karma classes keep their own body whatever the look: a hooded skeleton, or a winged human with a halo
const NEC_ROWS=["................",".....oooooo.....","....oowwwwo.....","....owkwwkw...g.","....owwwwww..gyg","....oowtwto....y","....orrrrroo..y.","...orrbrrrro.y..","..o.rrbrrr.wy...","....rrbrrr..y...","....rrrrrr..y...","....rrrrrr......",".....w..w.......",".....w..w.......","....ww..ww......","................"];
const NEC_PAL={o:'#2a1a3a',w:'#e8e4d8',k:'#120c18',t:'#6a6070',r:'#3e2a52',b:'#e8e4d8',g:'#7af08a',y:'#6a5a4a'};
const ANG_ROWS=(function(){const G=HERO_ROWS.map(r=>r.split(''));G[0]=".....yyyyy......".split('');
 const W=[[4,1,2],[5,0,3],[6,0,3],[7,0,2],[8,0,1],[9,0,0]];for(const [y,a,b] of W)for(let x=a;x<=b;x++)if(G[y][x]==='.')G[y][x]='f';return G.map(r=>r.join(''));})();
const ANG_PAL={h:'#f4e2a0',a:'#f6f4ee',b:'#d8d0b8',c:'#e8c060',w:'#fff3a0',f:'#ffffff',y:'#ffd84a'};
function heroSpr(k,look){
 if(k==='nec'||k==='ang'){const L=look==null?null:lookOf(look),sk=L?SKINS[L.skin%SKINS.length]:'#f1c49a',id='kc:'+k+':'+(k==='ang'?sk:'');let s=heroCache.get(id);if(s)return s;
  s=k==='nec'?mk(NEC_ROWS,NEC_PAL):mk(ANG_ROWS,Object.assign({s:sk,e:'#1a1010',l:'#c8c0a8'},ANG_PAL));s.id=id;s.sh=true;heroCache.set(id,s);return s;}
 if(look==null||lookOf(look).form==='human'){const L=look==null?null:lookOf(look),sk=L?SKINS[L.skin%SKINS.length]:'#f1c49a',hc=L&&HAIR_CLS[k],ra=L&&k!=='ghost'?huRare(L,k):0,Lr=L&&Object.assign({},L,{rare:ra});
  const id='hu:'+k+':'+sk+(L&&k!=='ghost'?':'+[hc?L.hair:'',hc?L.beard:'',hc?L.hcol:'',L.ecol,L.acc,ra].join(','):'');let s=heroCache.get(id);if(s)return s;
  const pal=Object.assign({s:sk,e:'#1a1010',l:'#3a2e24'},HP_[k]||HP_.npc,HACC_PAL);
  if(L&&k!=='ghost'){if(hc&&L.hcol>=0)pal.h=HCOLS[L.hcol%HCOLS.length];if(ra===2){pal.h='#e8401a';pal.F='#ffd040';}pal.e=ECOLS[L.ecol%ECOLS.length];pal.E=(L.ecol%ECOLS.length)<2?'#3a9ae8':'#e0a020';}s=mk(humanRows(k,Lr),pal);s.id=id;s.sh=k!=='ghost';if(heroCache.size>200)heroCache.clear();heroCache.set(id,s);return s;}
 const L=lookOf(look);
 const id='sl:'+k+':'+[L.hue,L.sat,L.lit,L.eye,L.mouth,L.blush?1:0,L.shape,L.pat,slRare(L)].join(',');let s=heroCache.get(id);if(s)return s;
 const gh=k==='ghost',h=L.hue,S=gh?38:L.sat,l=gh?80:L.lit;
 const pal={o:gh?'#7a9ac0':hsl(h+(h>60&&h<240?15:-15),S*.7,Math.max(14,l-36)),b:hsl(h,S,l),l:hsl(h-8,S-8,Math.min(94,l+22)),d:hsl(h+12,S+4,l-12),k:'#141018',w:'#ffffff',m:'#5a1420',p:gh?'#c8e0ff':'#ff8aa8'};
 pal.z='#ffe040';pal.q='#ff3a5a';const ra=gh?0:slRare(L);
 if(ra===1)Object.assign(pal,{o:hsl(h,50,48),b:hsl(h,45,84),l:'#ffffff',d:hsl(h,40,72)});
 else if(ra===2)Object.assign(pal,{o:'#05050c',b:'#262636',l:'#4a4a64',d:'#16161f',k:'#ff4a3a'});
 else if(ra===3)Object.assign(pal,{o:'#6a3a08',b:'#f4c040',l:'#fff2a8',d:'#c0841c'});
 Object.assign(pal,(ACC[k]||{}).p);
 s=mk(slimeRows(k,ra===1||ra===3?Object.assign({},L,{pat:3}):L),pal);s.id=id;s.squish=true;s.sh=!gh;s.ph=(L.hue*13+L.eye*7)%997;
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
MSPR.orc=mk(["........","........","....oooo","...ogggg","..oggggg","..ggrkgg","..gggggg","..ggwggg","...ggggg",".bbbbbbb","gbbbbybb","gbbbbbbb","g.bbbbbb","...gg...","..ooo...","........"],{o:'#1a2a14',g:'#5a8a4a',r:'#ff3a2a',k:'#1a0a0a',w:'#f0f0d0',b:'#5a3a22',y:'#a08040'},1); // v0.2.23
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
// v0.2.23 the otherworld invader: faceless, black, two violet eyes and a violet core
BOSS_PAL.vgod={k:'#06040c',d:'#1a1428',v:'#3a2a5a',p:'#b04aff',P:'#f6d8ff',c:'#7a3aff'};
BOSS_ROWS.vgod=["................","..........p.....","................","...........vvvvv","..........vkkkkk","..........vkkkkk",".........vkkkpPk",".........vkkkkkk","..........vkkkkk","...........vvkkk",".......vvvvvkkkk",".....vvkkkkkkkkk","....vkkkdkkkkkkk","...vkkkdkkkkkcpp","...vkkdkk.vkkcpP","..vkkdkk..vkkkcp","..vkkkk...vkkkkk",".vkkdk....vkkkkk",".vkkk.....vkkdkk","..pp......vkkdkk","..........vkkkkk","..........vkkkkk","..........vkk...","..........vkk...",".........vkkk...",".........vkkk...","....p...vkkkk...","................"];
const BSPR={};for(const k in BOSS_ROWS){const r=BOSS_ROWS[k];r.w=16;BSPR[k]=mk(r,BOSS_PAL[k],1);BSPR[k].shade=true;BSPR[k].sh=true;BSPR[k].squish='slow';BSPR[k].ph=k.length*211;}
const PSPR={slime:mk(["..........","..........","....oo....","..oggggo..",".oglggggo.",".ogkggkgo.",".oggggggo.","..oooooo..",".........."],{o:'#1a3a6a',g:'#6aa8f0',l:'#d0f0ff',k:'#0a1a2a'}),
fox:mk(["..........","o...o.....","oo.oo.....","rrrrr.....","rkrkr....f","rrwrr...ff",".rrrrrrrf.",".rrrrrrr..",".r.r.r.r.."],{o:'#7a2a0a',r:'#f07a2a',k:'#1a0a0a',w:'#fff0e0',f:'#ffd04a'}),
owl:mk(["..o....o..","..oooooo..",".obbbbbbo.",".bwwbbwwb.",".bwkbbkwb.",".bbbyybbb.",".bbllllbb.","..bbbbbb..","...y..y..."],{o:'#3a2a1a',b:'#8a6a4a',w:'#f0e8d0',k:'#1a0a0a',y:'#f0c040',l:'#c8a880'}),
wolf:mk(["..........",".o.o......",".ggg......","gkgg......","gggg....g.",".ggggggg..",".ggggggg..",".g.g.g.g..",".........."],{o:'#2a2a33',g:'#8a8a9a',k:'#1a0a0a'})};
for(const k in PSPR){PSPR[k].shade=true;PSPR[k].sh=true;}PSPR.slime.squish=true;PSPR.slime.ph=300;
const PROPS={chest:mk(["................","................","................","................","..oooooooooooo..",".obbbbbbbbbbbbo.",".obyyyyyyyyyybo.",".obbbbbbbbbbbbo.",".oyyyyyooyyyyyo.",".obbbbbyybbbbbo.",".obbbbbbbbbbbbo.",".obyyyyyyyyyybo.",".obbbbbbbbbbbbo.",".oooooooooooooo.","................","................"],{o:'#2a1606',b:'#8a5a2a',y:'#e8b840'}),
grave:mk(["........","........","....oooo","...ossss","..osssss","..ossssk","..osskkk","..ossssk","..ossssk","..osssss","..osssss","..osssss",".gosssss","ggoooooo","gggggggg","........"],{o:'#2a2e33',s:'#8a9098',k:'#3a3e44',g:'#3a5a2a'},1),
egg:mk(["...oooo...","..oyyyyo..",".oyyryyyo.",".oyrryyyo.",".oyyyyryo.",".oyyyrryo.","..oyyyyo..","...oooo..."],{o:'#6a3a0a',y:'#f8d060',r:'#e0702a'})};
// sword in the stone (key moment "excal"): gold hilt, steel blade, mossy rock with a crack
PROPS.swordstone=mk(["........oo........",".......oyyo.......","........oo........","........bh........","........bh........","........bh........","....oooooooooo....","....oyyyyyyyyo....","....oooowloooo....","........wl........","........wl........","........wl........","........wl........","......kkwlkk......","....kkSSwlSskk....","...kSSSSkksssskk..","..kSSSsssccssssk..","..kSSssssscsssssk.",".kSSsssssscssssssk",".kSssgssssscsssssk",".kssgggssssssggssk","kggggsssssssssgggk","kkkkkkkkkkkkkkkkkk"],{o:'#3a2a10',y:'#f0c040',b:'#6a3a1a',h:'#9a5a2a',w:'#f4f8ff',l:'#a8b8c8',k:'#2a2e33',S:'#a0a6ae',s:'#6e747c',c:'#3a3e44',g:'#4a7a3a'});
// ---- v2.1 secret dragon floor (above 100): hoard dragons k/s/g (56x40, face LEFT, not mirrored), baby dragon pets, dragon eggs ----
const HOARD_ROWS=["........................................................","........................................................",".....................................o..................","......................o..............ho.................","...............o....hh..............oVmooo..............","..............h....h...............oVldmVVo.............","..............h.o.hh..............oVVdddmmVo............","............oh.o.hh..............oVVldmddVmVo...........","...........oohoohh...............oVlVdVddVVmVoo.........","..........ollllllo..............oVVlmdVdVdVVmVVo........","........ooooommmmlo............oVVlmVdVVdVdVVmmVo.......",".....oooldeEemmmmmo...........oWWlWmWdWWdWWdWWWmWo......","...oolllmmmmmmmmmoo.o.........oWWlmWWdWWdWWdWWWWmWo.....","...olmmmmmmmmmmmhdoo.........oWWlmWWdWWWdWWWdWWWWmmo....","...ommmmmmmmmddddhlo..o......oWlWmWWdWWWWdWWWdWWWWWm....","...otmmmmmmmmoooollloo......oWWlmWWWdWWWWdWWWWdWWWWo....","...oooooooooonnnllmmlo..o..oWWlmWWWWdWWWWdWWWWdWWWWWo...",".....tootootooobbmmmmloo...oWlmWWWWWdWWWWWdWWWodoWWo....","...............onnmmdmlo..oWWlmWWWWWdWWWWodoWo...oo.....","...............obbbmmmmloooWlmWWWWWodoWWolllo...........","................onnndmmmloWooWWWWWollloolllllo..........",".................obbmmmmmlollooooolllllllmmmllo.........",".................onnnmmdddlolllllllmdmlldmmmdmlo........","..................obbbdddddlolllllmmmmmmmmmmmmmlo.......","...................onnnoooodommmdmmmdmmmdmmmdmmmoooo....","...................obbolllloommmmmmmmmmmmmmmmmoYYYYYYo..","....................onommmmoommmdmmmdmmmdmmmdmoyYwYYYo..",".....................ommmmmoommmmmmmmmmmmmmmmmdoyYYyo...","................YYYYolmmmmdoonnnnnnnnnnndmmmddoloyyolo..","....o..o..o..YY.yyYyommmmdoobbbbbbbbbbbbmmdddollooommo..","....Y.oYo.Y.YyyYyyyommmmdooonnnnnnnnnnnnddooollmoyYmdmo.","....YoYRYoYYYyyyyYolmmmdoyyYoooooooooooooollllmmoyyYomo.","....YYYYYYYyywYyDyommmdoYyyDyYwyyyYyyyDYyolllmmdommmdmmo","....DGDUDRDDyyywYyodddoyyyYyyyyYwDyyGyyyyooddddoommmmmmo","....oooooooyyYyyytooooyYyyyyDyyyyYwyyyYDyyyooooyommmdmmo","....YYyyyyYyDyyYyyototyDyYyyyyRyyyDYwyyyYyyyyololmmmmddo","...YwyyDyyyyYyooooooywYyyyyYyDyyYyyyyYooooooollldmmmdoo.","...yYywyyYyyyDooollloooooooooooooooooolllllllmmmmmmdoyY.","..YyyyYywyyYGyyyYooolllllllllllllllllldddddddddddddoDyyY","..yDyyyyYywyyYDyyyYyoooooooooooooooooooooooooooooooyyYyy"];
const HOARD_T={Y:'#ffe066',y:'#e0a820',D:'#8a5410',w:'#fffbe0',R:'#e8304a',G:'#38d878',U:'#4a90ff'}; // treasure letters stay gold in all variants
const HOARD_PAL={k:{o:'#0a0610',d:'#1a1322',m:'#2c2238',l:'#4a3a60',b:'#4e3e5c',n:'#3e3050',W:'#2a1430',V:'#4a2448',h:'#d8d0c0',e:'#ff2a4a',E:'#ffd0d8',t:'#f0ecd8'},
 s:{o:'#1a2232',d:'#6e7e94',m:'#a4b4c6',l:'#e2ecf6',b:'#d6e2ee',n:'#bccbdb',W:'#6a7c9c',V:'#8ea2c4',h:'#3e4c62',e:'#30e8ff',E:'#e0ffff',t:'#ffffff'},
 g:{o:'#3a1404',d:'#9a4612',m:'#d47e22',l:'#f6b84a',b:'#ffe2a0',n:'#f0c878',W:'#a2341a',V:'#d0562a',h:'#fff0d0',e:'#ff4a10',E:'#fff0a0',t:'#fff8e8'}};
for(const v of 'ksg'){const s=mk(HOARD_ROWS,Object.assign({},HOARD_PAL[v],HOARD_T));s.shade=true;s.sh=true;s.squish='slow';s.ph=v.charCodeAt(0)*97;BSPR['hoard_'+v]=s;}
const DPET_ROWS=["..h.h.....","..hmm..VV.",".mmemm.VWV","mmmmmmVWWV","kmmmb.mmW.","..bbmmmmmh","..bbmmmmm.","..bmmmm...","..m.m.mm.."],DEGG_ROWS=["....oo....","...omlo...","..omlmmo..",".omdmdmmo.",".olmmmmdo.",".omdmdmmo.",".ommmemmo.",".odmdmdmo.","..ommmmo..","...oooo..."];
const DPAL={k:{o:'#0a0610',m:'#3a2e52',l:'#6a5890',b:'#6e5a84',d:'#18101e',e:'#ff2a4a',k:'#0a0610',h:'#d8d0c0',W:'#6a2a5a',V:'#2a1a36'},
 s:{o:'#2a3448',m:'#a8b8ca',l:'#eef4fa',b:'#dce6f0',d:'#6e7e94',e:'#20d8f0',k:'#2a3448',h:'#4a5a72',W:'#8ea2c4',V:'#5a6a84'},
 g:{o:'#4a1c06',m:'#e08a26',l:'#ffd070',b:'#ffe6a8',d:'#a04a12',e:'#ff3a10',k:'#4a1c06',h:'#fff0d0',W:'#e0602a',V:'#8a2a10'}};
for(const v of 'ksg'){const p=mk(DPET_ROWS,DPAL[v]);p.shade=true;p.sh=true;PSPR['dr'+v]=p;PROPS['degg_'+v]=mk(DEGG_ROWS,DPAL[v]);}
// v0.3 legendary pets (10x9, face left like the others)
Object.assign(PSPR,{unicorn:mk(["y.........",".yw.......",".www.p....","wkwwpp....","wwwwwwwwp.","..wwwwwww.","..wwwwwwwp","..w.w.w.w.","..g.g.g.g."],{y:'#f0d060',w:'#f4f0ff',k:'#1a0a2a',p:'#c080f0',g:'#8a8aa0'}),
 fairy:mk(["....y.....","...hhh....","lw.hsk.wl.","lww.ss.wwl",".lwgggwl..","..l.gg.l..","....gg....","....s.s...",".y.....y.."],{y:'#fff4a0',h:'#f0c040',s:'#ffd8c0',k:'#1a0a2a',w:'#c8f0ff',l:'#7ac8e8',g:'#5ad07a'}),
 phoenix:mk(["..y.......",".yoy......",".orro.....","bkrrr...y.",".rrrro.yoy","..rrrroooy","..orrrroy.","...rr..y..","...y.y...."],{r:'#e8402a',o:'#ff8a2a',y:'#ffd84a',b:'#f0c040',k:'#1a0a0a'}),
 griffin:mk(["..........",".ww.......","wwkw...ff.","bwww..fff.","..wwfff...","..ttttttt.","..tttttttt","..t.t.t.t.","..b.b.t.t."],{w:'#f0ece0',k:'#1a0a0a',b:'#f0b030',f:'#8a5a2a',t:'#d8a860'})});
for(const k of ['unicorn','fairy','phoenix','griffin']){PSPR[k].shade=true;PSPR[k].sh=true;}
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
// v2.7 backgrounds at 2x: bgHi(b) is 384x256 (half-pixel detail, soft gradients, painted light), bgImg(b) is the same picture
// smoothed down to 192x128 for canvases that stay small. bgDraw(x,b) picks by canvas size; callers keep 192x128 coordinates.
// All "random" detail comes from hash() with fixed seeds, never from the game RNG or Math.random.
const bgCache={},bgHiC={};
function bgHi(b){if(bgHiC[b])return bgHiC[b];const W=384,H=256,F=200,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 let sd=b*7919+101;const r=()=>hash(sd++),ri=(a,z)=>a+Math.floor(r()*(z-a+1));
 const R=(X,Y,w,h,col)=>{x.fillStyle=col;x.fillRect(Math.floor(X),Math.floor(Y),w,h);};
 const lin=(x0,y0,x1,y1,st)=>{const g=x.createLinearGradient(x0,y0,x1,y1);st.forEach(s=>g.addColorStop(s[0],s[1]));return g;};
 const glow=(X,Y,rad,rgb,a)=>{const g=x.createRadialGradient(X,Y,0,X,Y,rad);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(.45,`rgba(${rgb},${a*.4})`);g.addColorStop(1,`rgba(${rgb},0)`);x.fillStyle=g;x.fillRect(X-rad,Y-rad,rad*2,rad*2);};
 const poly=(pts,col)=>{x.fillStyle=col;x.beginPath();x.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)x.lineTo(pts[i],pts[i+1]);x.closePath();x.fill();};
 const ell=(X,Y,rx,ry,col)=>{x.fillStyle=col;x.beginPath();x.ellipse(X,Y,rx,ry,0,0,7);x.fill();};
 // brick wall: soft vertical light, 28x14 bricks with lit top edge, shaded bottom edge, chips and hairline cracks
 const bricks=(top,bot,mort,cr)=>{x.fillStyle=lin(0,0,0,F,[[0,top],[1,bot]]);x.fillRect(0,0,W,F);
  for(let row=0,y=0;y<F;row++,y+=14)for(let X=-(row%2?14:0);X<W;X+=28){const t=r();
   R(X,y,28,1,mort);R(X,y,1,14,mort);x.fillStyle=t<.5?`rgba(0,0,0,${(.5-t)*.22})`:`rgba(255,255,255,${(t-.5)*.07})`;x.fillRect(X+1,y+1,27,13);
   R(X+1,y+1,27,1,'rgba(255,255,255,0.07)');R(X+1,y+12,27,2,'rgba(0,0,0,0.16)');R(X+1,y+1,1,12,'rgba(255,255,255,0.04)');
   if(r()>.8)R(X+ri(4,20),y+ri(4,9),ri(2,5),1,'rgba(0,0,0,0.3)');if(r()>.93){let cx=X+ri(6,22),cy=y+2;for(let j=0;j<9;j++){R(cx,cy,1,1,cr);cx+=r()>.5?1:-1;cy++;}}}};
 // flagstone floor with rows that grow toward the viewer
 const floor=(top,bot,line,lite)=>{x.fillStyle=lin(0,F,0,H,[[0,top],[1,bot]]);x.fillRect(0,F,W,H-F);
  const ys=[F,F+7,F+15,F+24,F+35,F+48,H];for(let i=0;i<ys.length-1;i++){const y=ys[i],h=ys[i+1]-y,w=26+i*9;R(0,y,W,1,line);R(0,y+1,W,1,lite);
   for(let X=-((i*17)%w);X<W;X+=w+ri(-3,3)){R(X,y+1,1,h-1,line);if(r()>.6)R(X+ri(3,w-6),y+ri(2,Math.max(2,h-2)),ri(2,4),1,'rgba(0,0,0,0.18)');}}
  x.fillStyle=lin(0,F,0,F+12,[[0,'rgba(0,0,0,0.45)'],[1,'rgba(0,0,0,0)']]);x.fillRect(0,F,W,12);R(0,F-1,W,1,'rgba(0,0,0,0.35)');};
 // arched stone window; sky() paints the view inside the opening
 const win=(X,Y,w,h,frame,sky)=>{const ar=w/2;R(X-4,Y+ar-2,w+8,h-ar+6,frame);ell(X+ar,Y+ar,ar+4,ar+4,frame);
  x.save();x.beginPath();x.rect(X,Y+ar,w,h-ar);x.ellipse(X+ar,Y+ar,ar,ar,0,Math.PI,0);x.clip();sky(X,Y,w,h);x.restore();
  R(X+ar-2,Y+2,4,h-2,'#3a2a1a');R(X,Y+h*.55,w,3,'#3a2a1a');R(X+ar-2,Y+2,1,h-2,'rgba(255,255,255,0.12)');
  R(X-6,Y+h,w+12,4,frame);R(X-6,Y+h,w+12,1,'rgba(255,255,255,0.18)');R(X-6,Y+h+4,w+12,2,'rgba(0,0,0,0.3)');
  R(X-4,Y+ar,1,h-ar,'rgba(255,255,255,0.10)');R(X+w+3,Y+ar,1,h-ar,'rgba(0,0,0,0.25)');};
 const vine=(X,len,c1,c2,lf)=>{for(let j=0;j<len;j++){const vx=X+Math.round(Math.sin(j/7+X)*2);R(vx,j,1,1,j%5?c1:c2);if(j%6===3){R(vx+(j%12?1:-2),j,2,2,lf);}}R(X+Math.round(Math.sin(len/7+X)*2)-1,len,3,2,lf);};
 if(b===0){// meadow: green stone, blue sky through arched windows, red banners, ivy, grass at the wall foot
  bricks('#202c25','#3a4c3e','#18211b','rgba(0,0,0,0.35)');
  const sky=(X,Y,w,h)=>{x.fillStyle=lin(0,Y,0,Y+h,[[0,'#6fa4d4'],[.7,'#b8d8ec'],[1,'#e6f0dc']]);x.fillRect(X,Y,w,h);
   for(let i=0;i<3;i++)ell(X+6+i*13,Y+h-6+Math.sin(i*2)*2,12,5,i%2?'#7fa86e':'#94b880');ell(X+w/2,Y+h+2,w*.7,8,'#668f5a');
   for(let i=0;i<2;i++){const cx0=X+8+i*20,cy=Y+22+i*12;ell(cx0,cy,7,3,'rgba(255,255,255,0.9)');ell(cx0+5,cy-2,5,3,'rgba(255,255,255,0.95)');ell(cx0+2,cy+1,8,2,'rgba(230,240,255,0.9)');}};
  win(42,60,40,80,'#58665c',sky);win(302,60,40,80,'#58665c',sky);
  for(const X of [42,302]){x.fillStyle=lin(0,140,0,F,[[0,'rgba(255,248,214,0.06)'],[1,'rgba(255,248,214,0)']]);poly([X,144,X+40,144,X+64,F,X-24,F],x.fillStyle);}
  for(const bx of [168,200]){x.fillStyle=lin(bx,0,bx+16,0,[[0,'#7a2226'],[.5,'#a8343a'],[1,'#6a1c20']]);x.fillRect(bx,14,16,38);poly([bx,52,bx+16,52,bx+16,58,bx+8,53,bx,58],'#8a2a2e');
   R(bx-2,12,20,3,'#3a2a1a');R(bx,15,16,3,'#d4a43a');R(bx,18,16,1,'#8a6a2a');R(bx+5,26,6,6,'#d4a43a');R(bx+6,27,4,4,'#a8343a');R(bx+7,28,2,2,'#f0d070');R(bx+4,15,1,37,'rgba(0,0,0,0.18)');R(bx+11,15,1,37,'rgba(255,255,255,0.08)');}
  [12,96,140,236,268,368].forEach(X=>vine(X,ri(24,70),'#2e5a26','#3e7230',r()>.5?'#4f8a3a':'#5f9a42'));
  floor('#4a6a3a','#2e4626','rgba(20,34,16,0.6)','rgba(150,200,110,0.10)');
  for(let i=0;i<150;i++){const gx=ri(0,W-1),gh=ri(2,8),col=['#5a8a3a','#6f9e48','#88b45a','#4a7a30'][i%4];R(gx,F+1-gh,1,gh,col);if(gh>5)R(gx+(i%2?1:-1),F+2-gh,1,1,col);}
  for(let i=0;i<26;i++){const fx=ri(2,W-4),fy=F+8+ri(0,44);R(fx,fy+2,1,3,'#3a6a2a');const fc=['#f4e070','#f08aa8','#ffffff','#a8c8ff'][i%4];R(fx-1,fy,3,2,fc);R(fx,fy-1,1,1,fc);R(fx,fy,1,1,'#fff8d0');}
  glow(126,92,46,'255,190,110',.16);glow(258,92,46,'255,190,110',.16);}
 if(b===1){// crystal cave: rough rock, stalactites with wet tips, faceted crystals glowing from the walls
  x.fillStyle=lin(0,0,0,F,[[0,'#0a1222'],[1,'#1a2a44']]);x.fillRect(0,0,W,F);
  for(let i=0;i<190;i++){const X=ri(0,W),Y=ri(0,F),rx=ri(6,20),ry=ri(4,10),t=r();ell(X,Y,rx,ry,t<.33?'rgba(10,16,30,0.5)':t<.66?'rgba(30,46,74,0.45)':'rgba(36,56,88,0.35)');ell(X-1,Y-ry*.4,rx*.7,ry*.3,'rgba(140,180,235,0.04)');}
  for(let i=0;i<18;i++){const sx=ri(0,W),w=ri(7,15),len=ri(16,50);poly([sx-w,0,sx+w,0,sx+1,len],'#0d1626');poly([sx-w,0,sx-w+2,0,sx,len-2],'#25395a');R(sx,len-1,1,2,'#7ac8e0');}
  const xtal=(X,Y,s,lt,dk,rgb)=>{glow(X,Y-s,s*2.4,rgb,.22);for(let k=-1;k<=1;k++){const bx=X+k*s*.6,hh=s*(k?1.3:2),lean=k*s*.35;poly([bx-s*.35,Y,bx+lean,Y-hh,bx,Y],lt);poly([bx,Y,bx+lean,Y-hh,bx+s*.35,Y],dk);R(bx+lean,Y-hh,1,2,'#ffffff');}};
  for(let i=0;i<7;i++){const t=i%2;xtal(20+i*52+ri(0,20),60+ri(0,90),ri(7,11),t?'#8ae8f4':'#c4b0f4',t?'#3a8ab0':'#6a58b0',t?'122,232,240':'180,154,240');}
  floor('#22324e','#121c2e','rgba(6,10,20,0.7)','rgba(120,170,230,0.08)');
  ell(250,236,40,6,'rgba(90,160,210,0.18)');ell(250,235,30,3,'rgba(160,220,255,0.12)');
  for(let i=0;i<40;i++)R(ri(0,W),F+ri(4,54),1,1,r()>.3?'#7ae8f0':'#d0c4ff');
  for(let i=0;i<7;i++)glow(20+i*56+ri(0,16),F-4,30,i%2?'122,232,240':'180,154,240',.14);}
 if(b===2){// cursed forest: mossy dark bricks, night windows with a moon, gnarled trunks, vines, glowing mushrooms
  bricks('#141e18','#24322a','#0d140f','rgba(0,0,0,0.4)');
  for(let i=0;i<30;i++)ell(ri(0,W),ri(120,F),ri(6,16),ri(2,5),'rgba(60,110,50,0.18)');
  const sky=(X,Y,w,h)=>{x.fillStyle=lin(0,Y,0,Y+h,[[0,'#121c2c'],[1,'#2a3c48']]);x.fillRect(X,Y,w,h);ell(X+12,Y+24,6,6,'#e8eccc');ell(X+15,Y+22,6,6,'#1a2634');
   for(let i=0;i<6;i++)R(X+ri(2,w-3),Y+ri(30,h-10),1,1,'#c8d0e0');x.strokeStyle='#0a1008';x.lineWidth=1.5;x.beginPath();x.moveTo(X,Y+h-8);x.lineTo(X+18,Y+h-24);x.lineTo(X+26,Y+h-40);x.moveTo(X+18,Y+h-24);x.lineTo(X+34,Y+h-30);x.stroke();};
  win(42,60,40,80,'#2a3830',sky);win(302,60,40,80,'#2a3830',sky);
  for(let i=0;i<5;i++){const tx=2*(8+i*44+Math.floor(hash(i)*10));x.fillStyle=lin(tx,0,tx+16,0,[[0,'#070c08'],[.4,'#1c2a1e'],[.7,'#162418'],[1,'#060a07']]);x.fillRect(tx,0,16,F);
   for(let j=0;j<10;j++)R(tx+ri(2,13),ri(0,F-20),1,ri(8,26),'rgba(0,0,0,0.35)');for(let j=0;j<3;j++){const ky=ri(30,170);ell(tx+8,ky,3,4,'#0a120b');ell(tx+8,ky-1,2,2,'#203024');}
   poly([tx-8,F,tx,F-24,tx+16,F-24,tx+24,F],'#0a110c');poly([tx-8,F,tx-2,F-4,tx+4,F],'#16221a');
   for(let j=0;j<7;j++){ell(tx+8+ri(-26,26),ri(0,26),ri(10,18),ri(6,12),j%2?'#0e1a12':'#142418');}for(let j=0;j<10;j++)R(tx+ri(-24,30),ri(2,30),2,1,'#2a4a2e');}
  [10,46,94,130,180,226,262,316,360].forEach(X=>vine(X,ri(16,60),'#2a4a22','#3a6a2e','#4a8a3a'));
  floor('#28321f','#141a10','rgba(6,10,4,0.7)','rgba(140,180,120,0.07)');
  x.fillStyle=lin(0,160,0,F+20,[[0,'rgba(150,185,165,0)'],[.7,'rgba(150,185,165,0.10)'],[1,'rgba(150,185,165,0)']]);x.fillRect(0,160,W,60);
  for(let i=0;i<9;i++){const mx=ri(6,W-8),my=F+ri(2,10),cap=i%2?'#c84a6a':'#5ad8a0',rgb=i%2?'200,74,106':'106,224,168';glow(mx,my,10,rgb,.25);R(mx,my,2,5,'#d8d0b8');ell(mx+1,my,4,2.5,cap);R(mx-1,my-1,1,1,'#ffffff');R(mx+2,my-1,1,1,'rgba(255,255,255,0.7)');}
  glow(126,92,46,'110,255,150',.13);glow(258,92,46,'110,255,150',.13);}
 if(b===3){// volcano: basalt bricks warmed from below, glowing cracks, lava river with crust
  bricks('#26120e','#4a2016','#170a08','rgba(0,0,0,0.4)');
  x.fillStyle=lin(0,60,0,F,[[0,'rgba(255,90,20,0)'],[1,'rgba(255,100,30,0.22)']]);x.fillRect(0,60,W,F-60);
  for(let i=0;i<9;i++){let cx0=ri(10,W-10),cy=ri(16,150);const n=ri(10,22);for(let j=0;j<n;j++){R(cx0,cy,1,2,'#ff8a2a');if(j%3===0)R(cx0,cy,1,1,'#ffd060');R(cx0-1,cy,1,2,'rgba(255,120,40,0.25)');R(cx0+1,cy,1,2,'rgba(255,120,40,0.25)');cx0+=r()>.5?1:-1;cy+=2;}glow(cx0,cy-n,16,'255,110,30',.10);}
  floor('#341a14','#1c0e0b','rgba(10,4,2,0.75)','rgba(255,140,80,0.07)');
  x.fillStyle=lin(0,226,0,H,[[0,'#ffe080'],[.12,'#ffa830'],[.5,'#ff6a1a'],[1,'#b02a0e']]);x.fillRect(0,230,W,H-230);R(0,229,W,1,'#ffd060');
  for(let i=0;i<14;i++){const px0=ri(0,W),py=ri(236,250),pw=ri(8,20);ell(px0,py,pw,2.5,'#4a1a0e');ell(px0,py-1,pw-2,1.2,'rgba(255,160,60,0.35)');}
  for(let i=0;i<10;i++)ell(ri(0,W),ri(234,254),1.5,1.5,'#fff0a0');
  for(let i=0;i<5;i++){const rx=ri(10,360);poly([rx,214,rx+4,206,rx+10,204,rx+14,210,rx+14,214],'#1c0c08');R(rx+2,212,10,1,'#ff6a1a');R(rx+5,206,4,1,'rgba(255,200,140,0.2)');}
  glow(192,250,180,'255,90,20',.16);glow(61,96,44,'255,170,80',.16);glow(321,96,44,'255,170,80',.16);}
 if(b===4){// star sea: deep gradient sky, soft nebulae, star sizes, ringed planet, glass floor reflecting the stars
  x.fillStyle=lin(0,0,0,F,[[0,'#04061a'],[.6,'#0c1036'],[1,'#181e56']]);x.fillRect(0,0,W,F);
  [[80,60,80,'120,80,200',.32],[300,100,90,'60,140,220',.28],[200,30,56,'220,90,160',.22],[120,150,60,'90,200,200',.12]].forEach(n=>glow(n[0],n[1],n[2],n[3],n[4]));
  for(let i=0;i<260;i++){const X=ri(0,W-1),Y=ri(0,F-6),t=r();R(X,Y,1,1,t<.6?'rgba(160,170,255,0.5)':t<.9?'#c8d0ff':'#ffffff');}
  for(let i=0;i<16;i++){const X=ri(4,W-6),Y=ri(4,180);R(X,Y,2,2,i%3?'#e8ecff':'#ffe9a0');if(i%4===0){R(X-2,Y,6,2,'rgba(255,255,255,0.35)');R(X,Y-2,2,6,'rgba(255,255,255,0.35)');}}
  const PX=336,PY=38;x.strokeStyle='rgba(170,180,240,0.45)';x.lineWidth=1;x.beginPath();x.ellipse(PX,PY,26,6,-.2,Math.PI,0);x.stroke();
  {const g=x.createRadialGradient(PX-4,PY-4,1,PX,PY,12);g.addColorStop(0,'#9a9ae8');g.addColorStop(.6,'#4a4a9a');g.addColorStop(1,'#20204e');x.fillStyle=g;x.beginPath();x.arc(PX,PY,11,0,7);x.fill();}
  R(PX-8,PY-2,16,1,'rgba(200,200,255,0.18)');R(PX-6,PY+3,13,1,'rgba(40,40,100,0.4)');
  x.strokeStyle='rgba(190,200,250,0.8)';x.beginPath();x.ellipse(PX,PY,26,6,-.2,0,Math.PI);x.stroke();
  x.fillStyle=lin(0,F,0,H,[[0,'#262c6a'],[1,'#0c0e2c']]);x.fillRect(0,F,W,H-F);
  x.strokeStyle='rgba(120,130,230,0.22)';x.lineWidth=1;x.beginPath();for(let k=-8;k<=8;k++){x.moveTo(192+k*14,F);x.lineTo(192+k*48,H);}for(const y of [F+8,F+19,F+33,F+52])x.moveTo(0,y+.5),x.lineTo(W,y+.5);x.stroke();
  for(let i=0;i<50;i++)R(ri(0,W),F+ri(4,54),1,1,`rgba(200,210,255,${.15+r()*.35})`);
  R(0,F,W,1,'#8a94f0');R(0,F+1,W,1,'rgba(138,148,240,0.35)');x.fillStyle=lin(0,F,0,F+16,[[0,'rgba(140,150,255,0.18)'],[1,'rgba(140,150,255,0)']]);x.fillRect(0,F,W,16);}
 const vg=x.createRadialGradient(192,140,90,192,140,262);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.42)');x.fillStyle=vg;x.fillRect(0,0,W,H);
 bgHiC[b]=c;return c;}
function bgImg(b){if(bgCache[b])return bgCache[b];const c=document.createElement('canvas');c.width=192;c.height=128;const x=c.getContext('2d');x.imageSmoothingEnabled=true;try{x.imageSmoothingQuality='high';}catch(e){}
 x.drawImage(bgHi(b),0,0,192,128);bgCache[b]=c;return c;}
// draw the biome background into a 192x128-coordinate context; a 2x canvas (384 wide, scaled by 2) gets the full detail
function bgDraw(x,b){const hi=x.canvas&&x.canvas.width>=384;x.drawImage(hi?bgHi(b):bgImg(b),0,0,192,128);}
// a 2x canvas (384 wide, drawn in 192x128 coordinates) gets the moving bits at half-pixel size; small canvases keep the old 1px look
const isHi=x=>!!(x&&x.canvas&&x.canvas.width>=384);
function drawTorch(x,X,Y,t,col){const fl=Math.sin(t/90+X)*1.2+Math.random()*.8;
 if(!isHi(x)){x.fillStyle='#3a2a1a';x.fillRect(X,Y,2,8);x.fillStyle=col||'#ff9a2a';x.fillRect(X-1,Y-4-Math.round(fl),4,5);x.fillStyle='#ffe07a';x.fillRect(X,Y-3-Math.round(fl),2,3);
  x.fillStyle='rgba(255,170,60,0.07)';x.beginPath();x.arc(X+1,Y-2,14+fl*2,0,7);x.fill();return;}
 const f=Math.round(fl*2)/2,c=col||'#ff9a2a',rgb=col?'106,255,154':'255,170,60';
 {const g=x.createRadialGradient(X+1,Y-2,0,X+1,Y-2,15+fl*2);g.addColorStop(0,`rgba(${rgb},0.16)`);g.addColorStop(.4,`rgba(${rgb},0.06)`);g.addColorStop(1,`rgba(${rgb},0)`);x.fillStyle=g;x.fillRect(X-16,Y-19,34,34);}
 x.fillStyle='#2a1c10';x.fillRect(X,Y,2,8);x.fillStyle='#5a4028';x.fillRect(X,Y,.5,8);x.fillStyle='#4a3420';x.fillRect(X-.5,Y,3,1);x.fillStyle='rgba(255,200,120,0.35)';x.fillRect(X-.5,Y,3,.5);
 x.fillStyle=c;x.fillRect(X-1,Y-2.5-f,4,2.5);x.fillRect(X-.5,Y-4-f,3,1.5);x.fillRect(X,Y-5-f,2,1);x.fillRect(X+.5,Y-5.5-f,1,.5);
 x.fillStyle='#ffd060';x.fillRect(X-.5,Y-2.5-f,3,2);x.fillRect(X,Y-3.5-f,2,1);
 x.fillStyle='#fff6c0';x.fillRect(X+.5,Y-2.5-f,1,1.5);x.fillRect(X+.5,Y-3-f,.5,.5);}
function drawOverlay(x,b,t){const hi=isHi(x),sn=v=>hi?Math.floor(v*2)/2:Math.floor(v),D=hi?.5:1;
 if(b===0||b===2)for(let i=0;i<(b?10:6);i++){const fx=(hash(i*19)*192+Math.sin(t/900+i*2)*10+t/(b?90:160))%192,fy=40+hash(i*7)*55+Math.sin(t/700+i)*6;const g=.5+.5*Math.sin(t/250+i*3);
  if(hi){const rgb=b?'180,255,140':'255,250,210',a=b?g:g*.6;x.fillStyle=`rgba(${rgb},${a*.22})`;x.beginPath();x.arc(fx,fy,1.8,0,7);x.fill();x.fillStyle=`rgba(${rgb},${a*.5})`;x.fillRect(sn(fx)-.5,sn(fy)-.5,1.5,1.5);x.fillStyle=`rgba(255,255,240,${a})`;x.fillRect(sn(fx),sn(fy),.5,.5);}
  else{x.fillStyle=b?`rgba(180,255,140,${g})`:`rgba(255,250,210,${g*.6})`;x.fillRect(Math.floor(fx),Math.floor(fy),1,1);}}
 if(b===4&&hi){const p=(t%5200)/5200;if(p<.12){const q=p/.12,sx=40+q*110,sy=8+q*30;for(let j=0;j<16;j++){x.fillStyle=`rgba(255,255,255,${(1-j/16)*(1-q)})`;x.fillRect(sn(sx-j*1.125),sn(sy-j*.3),j<2?1:.5,.5);}}}
 else
 if(b===4){const p=(t%5200)/5200;if(p<.12){const q=p/.12,sx=40+q*110,sy=8+q*30;for(let j=0;j<6;j++){x.fillStyle=`rgba(255,255,255,${(1-j/6)*(1-q)})`;x.fillRect(Math.floor(sx-j*3),Math.floor(sy-j*.8),1,1);}}}
 if(b===0||b===2){drawTorch(x,62,48,t,b===2?'#6aff9a':null);drawTorch(x,128,48,t,b===2?'#6aff9a':null);}
 if(b===1)for(let i=0;i<7;i++){const cx=10+i*28+Math.floor(hash(i+3)*8),ch=8+Math.floor(hash(i)*10),gl=.6+.4*Math.sin(t/400+i),col=i%2?'#7ae8f0':'#b49af0';
  if(hi){const rgb=i%2?'122,232,240':'180,154,240',g=x.createRadialGradient(cx+2,100-ch*.4,0,cx+2,100-ch*.4,ch*.9);g.addColorStop(0,`rgba(${rgb},${.18*gl})`);g.addColorStop(1,`rgba(${rgb},0)`);x.fillStyle=g;x.fillRect(cx+2-ch,100-ch*1.4,ch*2,ch*2);
   x.globalAlpha=gl;for(let j=0;j<ch*2;j++){const jj=j/2,off=sn(jj/3),w=Math.max(.5,4-off),Y=100.5-jj;x.fillStyle=col;x.fillRect(cx+off,Y,w,.5);x.fillStyle='rgba(255,255,255,0.55)';x.fillRect(cx+off,Y,.5,.5);x.fillStyle='rgba(20,30,80,0.35)';if(w>1)x.fillRect(cx+off+w-.5,Y,.5,.5);}
   x.fillStyle='#ffffff';x.fillRect(cx+sn((ch-.5)/3),101-ch,.5,.5);x.globalAlpha=1;}
  else{x.globalAlpha=gl;x.fillStyle=col;for(let j=0;j<ch;j++)x.fillRect(cx+Math.floor(j/3),100-j,Math.max(1,4-Math.floor(j/3)),1);x.globalAlpha=1;}}
 if(b===2){for(let i=0;i<4;i++){const fx=((t/40+i*60)%240)-40;if(hi){const g=x.createRadialGradient(fx+25,87+i*4,0,fx+25,87+i*4,25);g.addColorStop(0,'rgba(160,190,170,0.11)');g.addColorStop(1,'rgba(160,190,170,0)');x.fillStyle=g;x.beginPath();x.ellipse(fx+25,87+i*4,25,4,0,0,7);x.fill();}else{x.fillStyle='rgba(160,190,170,0.08)';x.fillRect(fx,84+i*4,50,6);}}
  if(Math.floor(t/1500)%3!==0){if(hi){x.fillStyle='rgba(255,74,58,0.25)';x.beginPath();x.arc(177.5,60.5,2.4,0,7);x.fill();x.fillStyle='#ff4a3a';x.fillRect(176,60,1,.5);x.fillRect(179,60,1,.5);x.fillStyle='#ffc0a0';x.fillRect(176.5,60,.5,.5);x.fillRect(179.5,60,.5,.5);}
   else{x.fillStyle='#ff4a3a';x.fillRect(176,60,1,1);x.fillRect(179,60,1,1);}}}
 if(b===3){const g=.5+.5*Math.sin(t/300);
  if(hi){x.fillStyle=`rgba(255,${120+Math.round(g*60)},40,1)`;x.fillRect(0,117,192,2);x.fillStyle=`rgba(255,${200+Math.round(g*40)},120,${.6+g*.3})`;x.fillRect(0,117,192,.5);x.fillStyle='rgba(120,30,10,0.45)';x.fillRect(0,118.5,192,.5);
   const lg=x.createLinearGradient(0,96,0,128);lg.addColorStop(0,'rgba(255,110,30,0)');lg.addColorStop(1,`rgba(255,110,30,${.10+g*.08})`);x.fillStyle=lg;x.fillRect(0,96,192,32);}
  else{x.fillStyle=`rgba(255,${120+Math.round(g*60)},40,1)`;x.fillRect(0,117,192,2);}
  x.fillStyle=`rgba(255,90,20,${.08+g*.06})`;x.fillRect(0,0,192,128);
  for(let i=0;i<12;i++){const ex=(hash(i)*192+Math.sin(t/500+i)*6)%192,ey=128-((t/30+hash(i+9)*128)%128);
   if(hi){x.fillStyle='rgba(255,140,50,0.3)';x.fillRect(sn(ex),sn(ey)+.5,.5,1.5);x.fillStyle=i%2?'#ffd070':'#ff8a2a';x.fillRect(sn(ex),sn(ey),.5,.5);}else{x.fillStyle=i%2?'#ffb03a':'#ff6a1a';x.fillRect(ex,ey,1,1);}}
  drawTorch(x,30,50,t);drawTorch(x,160,50,t);}
 if(b===4){for(let L=1;L<=2;L++)for(let i=0;i<30;i++){const sx=(hash(i*L+50)*192-t/(L===1?120:50))%192,sy=hash(i*L+80)*96;const X=sx<0?sx+192:sx,tw=Math.sin(t/300+i)>.6;
   x.fillStyle=L===2?(tw?'#ffffff':'#c8d0ff'):'#5a64b0';x.fillRect(sn(X),sn(sy),D,D);if(hi&&L===2&&tw){x.fillStyle='rgba(220,230,255,0.4)';x.fillRect(sn(X)-.5,sn(sy),1.5,.5);x.fillRect(sn(X),sn(sy)-.5,.5,1.5);}}
  const y1=hi?70+Math.round(Math.sin(t/700)*4)/2:70+Math.round(Math.sin(t/700)*2),y2=hi?60+Math.round(Math.sin(t/600+1)*4)/2:60+Math.round(Math.sin(t/600+1)*2);
  x.fillStyle='#2a2f6a';x.fillRect(150,y1,26,3);x.fillRect(14,y2,22,3);
  if(hi){x.fillStyle='rgba(150,160,255,0.45)';x.fillRect(150,y1,26,.5);x.fillRect(14,y2,22,.5);x.fillStyle='rgba(8,10,40,0.5)';x.fillRect(150,y1+2.5,26,.5);x.fillRect(14,y2+2.5,22,.5);
   x.fillStyle='rgba(140,150,255,0.10)';x.fillRect(151,y1+3,24,2);x.fillRect(15,y2+3,20,2);}}}
// ---- story NPCs: drawProp(x,key) draws NPCS[key] at the NPC spot, flipped to face the hero. Rows face RIGHT.
// flags: fl = float (sine bob, no shadow), al = alpha, dx/dy = offset, still = no bob
const NPCS={
elf:mk(["................",".....yyyyy......","....yyyyyyy.....","...yyyyssss.....","..syyyysksk.....",".s.yyyyssss.....","...yyyyssms.....","...yygggggg..w..","..yygGgggGgg.w..","..yyggggggg.s.w.","...ggggggg...w..","...gbbbbbg..w...","....ggggg.......","....ll.ll.......","....bb.bb.......","................"],{y:'#f0d870',s:'#f4d0b0',k:'#2a4a2a',m:'#c86a6a',g:'#3a8a4a',G:'#8ad070',b:'#6a4a2a',l:'#e8e0c8',w:'#a07040'}),
isekai:mk(["................","......kkkk......",".....kkkkkk.....","....kkkkkkkk....","....kkssssk.....","....kssksks.....","....ksssssss....",".....ssmsss.....","....nnwrwnn.....","...nnnwrwnnn....","...nnnwrwnn.sp..","...s.nnnnn..sP..",".....gggggg.....",".....gg..gg.....",".....dd..dd.....","................"],{k:'#1a1a22',s:'#f1c49a',m:'#c06a5a',n:'#2a3a6a',w:'#f0f0f0',r:'#d02a2a',g:'#3a3a48',d:'#1a1a1a',p:'#203040',P:'#8ae0ff'}),
mermaid:mk(["................","....rrrr........","...rrrrrr.......","..rrrssssr......","..rrsskssk......","..rrssssss......","..rr.ssmss......","..rr.sssss.s....","..r.ppsspps.....",".....ssssss.....",".....tttttt.....","......tTtttt....",".......tttTtt...","........tttttt.f",".....ooooootttff","...ooooooooooo.."],{r:'#d84a3a',s:'#f4d0b0',k:'#1a3a5a',m:'#d06a7a',p:'#f0a0c0',t:'#4ac0c0',T:'#a0f0e8',f:'#6ae0d0',o:'#6a6a7a'}),
statue:mk(["................",".....y.y.y......",".....yyyyy......","....gggggggg....","....ggGGGGgg....","....gGGrGkGg....","....gGGbGGGg....","....gGGbGmGg....",".....GGGGGG.....","....GGGGGGGG....","...GGgGGGGgGG...","...G.GGGGGG.G...","....GGGGGGGG....","...GGGGGGGGGG...","..dddddddddddd..","..DDDDDDDDDDDD.."],{y:'#a8a8b0',g:'#7a7a86',G:'#b8b8c4',r:'#e02a4a',k:'#3a3a44',b:'#6ac8ff',m:'#8a8a96',d:'#6a6a74',D:'#4a4a54'}), // v0.2.23
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
 else if(pr==='swordstone'){blit(x,PROPS.swordstone,X,Y-3);const g=.35+.3*Math.sin(t/350);x.fillStyle=`rgba(255,240,170,${g})`;x.fillRect(X+8,Y-4,2,1);x.fillRect(X+10,Y+6,1,2);}
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
// v2.7.2 scene pictures at 2x, like bgHi: painted on a 384x256 canvas scaled by 2, so they use 192x128 coordinates and 0.5 is one fine pixel.
// hiDraw(x,c) puts one into a 192x128-coordinate context: a 2x canvas gets it as is, a small canvas gets a smoothed 192x128 copy.
function hiCanvas(){const c=document.createElement('canvas');c.width=384;c.height=256;const x=c.getContext('2d');x.scale(2,2);return{c,x};}
function penOf(x){
 const R=(X,Y,w,h,col)=>{x.fillStyle=col;x.fillRect(X,Y,w,h);};
 const lin=(x0,y0,x1,y1,st)=>{const g=x.createLinearGradient(x0,y0,x1,y1);st.forEach(s=>g.addColorStop(s[0],s[1]));return g;};
 const glow=(X,Y,rad,rgb,a)=>{const g=x.createRadialGradient(X,Y,0,X,Y,rad);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(.45,`rgba(${rgb},${a*.4})`);g.addColorStop(1,`rgba(${rgb},0)`);x.fillStyle=g;x.fillRect(X-rad,Y-rad,rad*2,rad*2);};
 const poly=(pts,col)=>{x.fillStyle=col;x.beginPath();x.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)x.lineTo(pts[i],pts[i+1]);x.closePath();x.fill();};
 const ell=(X,Y,rx,ry,col)=>{x.fillStyle=col;x.beginPath();x.ellipse(X,Y,rx,ry,0,0,7);x.fill();};
 // hill line from 0 to 192: fill under top(X) down to bot, with a lighter rim along the ridge
 const ridge=(top,bot,fill,rim)=>{x.beginPath();x.moveTo(0,bot);for(let X=0;X<=192;X+=.5)x.lineTo(X,top(X));x.lineTo(192,bot);x.closePath();x.fillStyle=fill;x.fill();
  if(rim){x.strokeStyle=rim;x.lineWidth=.5;x.beginPath();for(let X=0;X<=192;X+=.5){const Y=top(X)+.25;X?x.lineTo(X,Y):x.moveTo(X,Y);}x.stroke();}};
 const noise=(X,s)=>{const i=Math.floor(X),f=X-i;return hash(i+s)*(1-f)+hash(i+1+s)*f;};
 // tufts of grass: thin blades along the ground line
 const grass=(n,seed,y0,cols)=>{for(let i=0;i<n;i++){const gx=hash(i*3+seed)*192,gy=y0-Math.floor(hash(i+seed+2)*3);for(let k=0;k<3;k++){const h=1.5+hash(i*7+k+seed)*2.5;R(gx+k*.5-.5,gy+3-h,.5,h,cols[(i+k)%cols.length]);}}};
 const vign=(cx0,cy0,r0,r1,a)=>{const g=x.createRadialGradient(cx0,cy0,r0,cx0,cy0,r1);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${a})`);x.fillStyle=g;x.fillRect(0,0,192,128);};
 return{R,lin,glow,poly,ell,ridge,noise,grass,vign};}
function loOf(c){const o=document.createElement('canvas');o.width=192;o.height=128;const x=o.getContext('2d');x.imageSmoothingEnabled=true;try{x.imageSmoothingQuality='high';}catch(e){}x.drawImage(c,0,0,192,128);return o;}
function hiDraw(x,c){if(!c)return;x.drawImage(isHi(x)?c:(c._lo||(c._lo=loOf(c))),0,0,192,128);}
// funeralBg(win): 384x256 (dusk graveyard at the tower foot / summit at night); draw it with funeralDraw(x,win), not drawImage(...,0,0)
const funC={};
function funeralBg(win){const k=win?'w':'f';if(funC[k])return funC[k];const {c,x}=hiCanvas(),{R,lin,glow,poly,ell,ridge,noise,grass,vign}=penOf(x);
 const sky=win?['#0a0c24','#141a44','#2a2a6a','#4a3a7a']:['#1a1a2e','#3a2a48','#6a3a5a','#a8586a'];
 const skyG=lin(0,0,0,100,[[0,sky[0]],[.12,sky[0]],[.36,sky[1]],[.6,sky[2]],[.84,sky[3]],[1,sky[3]]]);x.fillStyle=skyG;x.fillRect(0,0,192,100);
 for(let i=0;i<(win?80:24);i++){const X=Math.floor(hash(i*13+1)*384)/2,Y=Math.floor(hash(i*7+3)*(win?180:92))/2,br=hash(i)>.7;
  if(br){x.fillStyle='rgba(220,225,255,0.22)';x.fillRect(X-.5,Y-.5,1.5,1.5);if(win&&hash(i+40)>.8){R(X-1,Y,2.5,.5,'rgba(255,255,255,0.35)');R(X,Y-1,.5,2.5,'rgba(255,255,255,0.35)');}}
  R(X,Y,.5,.5,br?'#ffffff':'#b8b8e8');if(!br&&hash(i+9)>.6)R(X+.5,Y,.5,.5,'rgba(168,168,216,0.5)');}
 if(!win){glow(150,74,46,'255,170,130',.28);glow(150,72,16,'255,230,180',.35);
  {const g=x.createRadialGradient(148,69,1,150,72,9);g.addColorStop(0,'#fff4d0');g.addColorStop(.7,'#f6d8a0');g.addColorStop(1,'#eab888');x.fillStyle=g;x.beginPath();x.arc(150,72,9,0,7);x.fill();}
  R(132,66.5,38,.5,'rgba(120,60,90,0.45)');R(138,69,30,.5,'rgba(120,60,90,0.35)');ell(60,58,30,1.5,'rgba(160,90,110,0.25)');ell(30,62,22,1,'rgba(160,90,110,0.2)');
  x.fillStyle=lin(0,74,0,100,[[0,'#7a4464'],[.3,'#6a3a5a'],[1,'#5a3250']]);x.fillRect(0,74,192,26);R(0,74,192,.5,'rgba(255,190,160,0.35)');R(0,74.5,192,.5,'rgba(255,190,160,0.12)');}
 else{glow(36,22,26,'200,210,255',.16);x.save();x.beginPath();x.rect(0,0,192,128);x.arc(39,20,6,0,7);x.clip('evenodd');
  {const g=x.createRadialGradient(34,20,1,36,22,7);g.addColorStop(0,'#fffbe8');g.addColorStop(1,'#e8e0c0');x.fillStyle=g;x.beginPath();x.arc(36,22,7,0,7);x.fill();}
  ell(33.5,24,1.2,1,'rgba(180,170,140,0.35)');ell(32,20,.8,.7,'rgba(180,170,140,0.3)');x.restore();}
 const hf=X=>92-(10+Math.sin(X/23)*5+Math.sin(X/9+1)*2+noise(X,0)*1.5),hn=X=>98-(4+Math.sin(X/17+2)*3+noise(X,300)*1.2);
 ridge(hf,101,lin(0,74,0,100,win?[[0,'#161c40'],[1,'#0c1028']]:[[0,'#322840'],[1,'#241c30']]),win?'rgba(120,130,220,0.35)':'rgba(220,140,150,0.35)');
 x.fillStyle=lin(0,80,0,100,[[0,'rgba(0,0,0,0)'],[1,win?'rgba(60,60,120,0.22)':'rgba(170,90,110,0.18)']]);x.fillRect(0,80,192,20);
 ridge(hn,101,lin(0,88,0,100,win?[[0,'#1c2244'],[1,'#121730']]:[[0,'#42344a'],[1,'#30263a']]),win?'rgba(140,150,230,0.30)':'rgba(230,160,150,0.30)');
 x.fillStyle=lin(0,100,0,128,win?[[0,'#444866'],[1,'#2c3048']]:[[0,'#46663a'],[1,'#2e4628']]);x.fillRect(0,100,192,28);
 for(let k2=0;k2<24;k2++){R(k2*8,100+(k2%3),8,2,win?'rgba(110,114,150,0.35)':'rgba(110,160,80,0.35)');R(k2*8,100+(k2%3),8,.5,win?'rgba(150,154,190,0.25)':'rgba(150,200,110,0.25)');}
 x.fillStyle=lin(0,100,0,104,[[0,'rgba(0,0,0,0.4)'],[1,'rgba(0,0,0,0)']]);x.fillRect(0,100,192,4);R(0,100,192,.5,'rgba(0,0,0,0.45)');
 if(!win){grass(40,7,98.5,['#6a9a42','#4f7a34','#7aaa4e']);
  for(let i=0;i<5;i++){const sx=8+i*44+Math.floor(hash(i*5)*14);if(sx>70&&sx<120)continue;
   R(sx,90,5,10,'#5a5e66');ell(sx+2.5,90.5,2.5,1.5,'#5a5e66');R(sx,89.5,.5,10.5,'rgba(255,230,220,0.22)');R(sx+4.5,90,.5,10,'rgba(0,0,0,0.3)');
   R(sx+2,91.5,1,4.5,'#3a3e44');R(sx+1,92.5,3,1,'#3a3e44');R(sx+2,91.5,.5,4.5,'rgba(0,0,0,0.3)');ell(sx+1,99.5,1.5,.8,'#4f7a3a');ell(sx+4,99.6,1.2,.6,'#5f8a42');}
  for(let X=0;X<192;X+=6){R(X,94,1,7,'#2a1e18');R(X,94,.5,7,'#4a362a');R(X-.25,93.5,1.5,.5,'#3a2a20');}
  R(0,95,192,1,'#2a1e18');R(0,95,192,.5,'rgba(140,100,90,0.35)');R(0,98,192,1,'#2a1e18');R(0,98,192,.5,'rgba(140,100,90,0.3)');}
 else{glow(96,100,48,'150,160,230',.12);
  R(56,100,80,6,'#5a5e7a');R(56,100,80,.5,'rgba(220,225,255,0.3)');R(56,105.5,80,.5,'rgba(0,0,0,0.35)');for(let X=64;X<136;X+=10)R(X,100.5,.5,5,'rgba(30,32,50,0.4)');
  R(60,98,72,2,'#6a6e8a');R(60,98,72,.5,'rgba(230,235,255,0.35)');
  for(let i=0;i<10;i++){const X=60+i*8;R(X,96,2,4,'#8a8ea8');R(X,96,.5,4,'#b8bcd8');R(X+1.5,96,.5,4,'rgba(30,32,60,0.4)');R(X-.25,95.5,2.5,.5,'#a8acc8');}
  R(60,97,72,.5,'rgba(138,142,168,0.7)');}
 for(let i=0;i<14;i++){const X=Math.floor(hash(i*11+9)*190),Y=104+Math.floor(hash(i*5+4)*20);
  if(win){ell(X+.5,Y+.5,1,.6,'#6a6e88');R(X,Y,.5,.5,'#b8bcd8');}
  else{R(X+.25,Y+1,.5,1.5,'#3a6a2a');R(X,Y,1,1,'#f4e070');R(X-.5,Y+.25,.5,.5,'#e8c850');R(X+1,Y+.25,.5,.5,'#e8c850');R(X+.25,Y+.25,.5,.5,'#fff8c0');}}
 vign(96,80,40,130,.5);
 funC[k]=c;return c;}
function funeralDraw(x,win){hiDraw(x,funeralBg(win));}
// candle flame flickers with t (static when t is 0)
function drawCandle(x,X,Y,t,i){blit(x,CANDLE,X,Y,{key:'candle',noShadow:true});const fl=t?Math.round(Math.sin(t/110+i*2.1)+Math.sin(t/47+i)*.6):0;
 x.fillStyle='rgba(255,200,90,0.16)';x.fillRect(X-2,Y-6,9,8);x.fillStyle='#ff9a2a';x.fillRect(X+1,Y-3-Math.max(0,fl),3,3+Math.max(0,fl));x.fillStyle='#fff2a0';x.fillRect(X+2,Y-2,1,2);}
const BONE=mk(["................","................","................","................",".....wwww.......","....wkwwkw......","....wwwwww......",".....wtwt.......","......ww....s...","....wwwwww.s....","...w.wwww.ws....","...w.wwww.......",".....w..w.......",".....w..w.......","....ww..ww......","................"],{w:'#e8e0c8',k:'#1a1010',t:'#8a8070',s:'#b0b8c0'});
// ---- v2.7 wishes after death: a home village backdrop (day / dusk / night) and the scene of a day the hero never had ----
// homeBg(k): 384x256 home village (day / dusk / night); draw it with homeDraw(x,k)
const homeC={};
function homeBg(k){k=k==='dusk'||k==='night'?k:'day';if(homeC[k])return homeC[k];const {c,x}=hiCanvas(),{R,lin,glow,poly,ell,ridge,noise,grass,vign}=penOf(x);
 const sky={day:['#6ab0e0','#8ac4ea','#a8d4ee','#c8e4f0'],dusk:['#2a2a4a','#5a3a5a','#a85a5a','#e89a6a'],night:['#0a0e22','#121a34','#1a2440','#22304a']}[k];
 x.fillStyle=lin(0,0,0,100,[[0,sky[0]],[.1,sky[0]],[.3,sky[1]],[.5,sky[2]],[.7,sky[3]],[1,sky[3]]]);x.fillRect(0,0,192,100);
 if(k==='day'){glow(30,22,34,'255,246,190',.35);glow(30,22,14,'255,255,230',.45);
  {const g=x.createRadialGradient(28,20,1,30,22,8);g.addColorStop(0,'#fffce0');g.addColorStop(1,'#fff0a0');x.fillStyle=g;x.beginPath();x.arc(30,22,8,0,7);x.fill();}
  for(let i=0;i<3;i++){const cx0=60+i*48+Math.floor(hash(i*5)*14),cy=14+Math.floor(hash(i*3)*14);
   ell(cx0+9,cy+3,10,2.6,'rgba(190,215,235,0.9)');ell(cx0+9,cy+2,9.5,2.4,'#ffffff');ell(cx0+9,cy-.5,5.5,3,'#ffffff');ell(cx0+5,cy+1,4,2.2,'#ffffff');ell(cx0+13,cy+.8,4,2,'#ffffff');
   ell(cx0+8,cy-1.5,3,1.2,'rgba(255,255,255,1)');R(cx0+1,cy+4,16,.5,'rgba(150,185,215,0.45)');}}
 else if(k==='dusk'){glow(40,74,60,'255,170,110',.3);glow(40,74,22,'255,220,160',.4);
  {const g=x.createRadialGradient(38,72,1,40,74,10);g.addColorStop(0,'#fff0c0');g.addColorStop(1,'#ffc880');x.fillStyle=g;x.beginPath();x.arc(40,74,10,0,7);x.fill();}
  ell(70,52,34,1.4,'rgba(255,170,140,0.25)');ell(130,40,40,1.6,'rgba(200,120,130,0.22)');ell(24,66,26,1,'rgba(120,60,80,0.35)');}
 else{for(let i=0;i<50;i++){const X=Math.floor(hash(i*13+5)*384)/2,Y=Math.floor(hash(i*7+9)*140)/2,br=hash(i)>.7;if(br)R(X-.5,Y-.5,1.5,1.5,'rgba(220,225,255,0.2)');R(X,Y,.5,.5,br?'#ffffff':'#a8b0d8');}
  glow(160,20,24,'210,220,255',.16);{const g=x.createRadialGradient(158,18,1,160,20,6);g.addColorStop(0,'#fffbe8');g.addColorStop(1,'#e4dcbc');x.fillStyle=g;x.beginPath();x.arc(160,20,6,0,7);x.fill();}
  ell(158,21.5,1.2,1,'rgba(170,160,130,0.35)');ell(161.5,18,.8,.7,'rgba(170,160,130,0.3)');ell(162,22.5,.6,.5,'rgba(170,160,130,0.3)');}
 const hill=k==='day'?['#5a9a4a','#4a8a3a']:k==='dusk'?['#4a4a4a','#3a3a40']:['#1a2a2a','#14201e'];
 const rim=k==='day'?'rgba(220,255,190,0.45)':k==='dusk'?'rgba(255,190,150,0.35)':'rgba(140,170,200,0.22)';
 ridge(X=>92-(12+Math.sin(X/26)*6+Math.sin(X/11+2)*2),101,lin(0,74,0,100,[[0,hill[0]],[1,k==='day'?'#4a8a3e':k==='dusk'?'#404044':'#162424']]),rim);
 x.fillStyle=lin(0,84,0,100,[[0,'rgba(0,0,0,0)'],[1,k==='day'?'rgba(230,245,255,0.18)':k==='dusk'?'rgba(230,140,110,0.12)':'rgba(60,80,110,0.15)']]);x.fillRect(0,84,192,16);
 ridge(X=>97-(5+Math.sin(X/15+1)*3),101,lin(0,88,0,100,[[0,hill[1]],[1,k==='day'?'#3e7a32':k==='dusk'?'#323238':'#101a18']]),rim);
 // house on the right: wall, flared roof, door, a lit window
 const wl=k==='day'?'#d8c8a0':k==='dusk'?'#a89878':'#4a4438',rf=k==='day'?'#a8402a':k==='dusk'?'#7a3020':'#3a1e18',lit=k==='day'?'#6a8ab0':'#ffd870';
 const sun=k==='day'?'rgba(255,250,220,0.22)':k==='dusk'?'rgba(255,190,140,0.18)':'rgba(160,180,220,0.08)';
 R(146,72,36,28,wl);
 for(let Y=74;Y<100;Y+=3.5)R(146,Y,36,.5,'rgba(90,70,40,0.18)');for(let Y=74,j=0;Y<100;Y+=3.5,j++)for(let X=146+(j%2?3:0);X<182;X+=6)R(X,Y+.5,.5,3,'rgba(90,70,40,0.12)');
 R(146,72,.5,28,sun);R(181.5,72,.5,28,'rgba(0,0,0,0.25)');x.fillStyle=lin(0,72,0,78,[[0,'rgba(0,0,0,0.3)'],[1,'rgba(0,0,0,0)']]);x.fillRect(146,72,36,6);
 poly([142,62,186,62,168,72,160,72],rf);
 for(let i=0;i<10;i++){const Y=62+i,w=44-i*4;R(142+i*2,Y+.5,w,.5,'rgba(0,0,0,0.18)');for(let X=142+i*2+(i%2?1.5:0);X<142+i*2+w;X+=3)R(X,Y,.5,.5,'rgba(255,220,190,0.14)');}
 R(142,62,44,.5,'rgba(255,220,190,0.35)');R(144,71,40,2,rf);R(144,71,40,.5,'rgba(255,220,190,0.25)');R(144,72.5,40,.5,'rgba(0,0,0,0.35)');
 R(160,84,8,16,'#5a3a22');R(160,84,8,.5,'#3a2414');R(162.5,84.5,.5,15.5,'rgba(0,0,0,0.25)');R(165,84.5,.5,15.5,'rgba(0,0,0,0.25)');R(160,84,.5,16,'rgba(255,220,170,0.15)');R(166,92,1,1,'#d8b060');R(159.5,83.5,9,.5,'rgba(60,40,20,0.6)');
 if(k==='day'){x.fillStyle=lin(0,78,0,85,[[0,'#8aaad0'],[1,'#5a7aa0']]);x.fillRect(150,78,7,7);R(150.5,78.5,2,1.5,'rgba(255,255,255,0.45)');}
 else{x.fillStyle=lin(0,78,0,85,[[0,'#ffe8a0'],[1,'#ffc860']]);x.fillRect(150,78,7,7);}
 R(153,78,1,7,wl);R(150,81,7,1,wl);R(149.5,77.5,8,.5,'rgba(60,40,20,0.5)');R(149.5,85,8,.5,'rgba(255,240,210,0.3)');
 if(k!=='day'){glow(153,82,15,'255,216,112',.22);glow(163,104,14,'255,216,112',.06);}
 const gTop=k==='night'?'#28402e':'#46663a',gBot=k==='night'?'#1c2e22':'#2e4628';
 x.fillStyle=lin(0,100,0,128,[[0,gTop],[1,gBot]]);x.fillRect(0,100,192,28);
 for(let k2=0;k2<24;k2++){R(k2*8,100+(k2%3),8,2,k==='night'?'rgba(50,76,58,0.7)':'rgba(90,140,70,0.45)');R(k2*8,100+(k2%3),8,.5,k==='night'?'rgba(80,110,90,0.3)':'rgba(150,200,110,0.3)');}
 x.fillStyle=lin(0,100,0,104,[[0,'rgba(0,0,0,0.35)'],[1,'rgba(0,0,0,0)']]);x.fillRect(0,100,192,4);R(0,100,192,.5,'rgba(0,0,0,0.4)');
 grass(30,1,98.5,k==='night'?['#3a5a3a','#2e4a32','#46664a']:['#6a9a42','#4f7a34','#7aaa4e']);
 if(k==='day')for(let i=0;i<12;i++){const fx=Math.floor(hash(i*11+7)*190),fy=104+Math.floor(hash(i*5+3)*20),fc=['#f4e070','#f08aa8','#ffffff'][i%3];
  R(fx+.25,fy+1,.5,1.5,'#3a6a2a');R(fx,fy,1,1,fc);R(fx-.5,fy+.25,.5,.5,fc);R(fx+1,fy+.25,.5,.5,fc);R(fx+.25,fy+.25,.5,.5,'#fff8d0');}
 const pa=k==='night'?'#3a3a32':'#a8946a';x.fillStyle=lin(0,110,0,113,[[0,k==='night'?'#46463c':'#bca67a'],[1,pa]]);x.fillRect(0,110,192,3);
 R(0,110,192,.5,k==='night'?'rgba(120,130,110,0.25)':'rgba(255,240,200,0.35)');R(0,113,192,1,'rgba(0,0,0,0.19)');
 for(let i=0;i<40;i++){const X=hash(i*17+3)*192,Y=110.5+hash(i*5+1)*2;ell(X,Y,.6+hash(i)*.6,.4,k==='night'?'rgba(20,20,16,0.4)':'rgba(110,90,60,0.4)');}
 if(k!=='day'){x.fillStyle=k==='night'?'rgba(10,14,40,0.25)':'rgba(60,30,40,0.12)';x.fillRect(0,0,192,128);}
 vign(96,70,60,130,k==='day'?.18:.3);
 homeC[k]=c;return c;}
function homeDraw(x,k){hiDraw(x,homeBg(k));}
// D = {k, b, hc (class id), lk (look), cs [{n,cls,tr,legend}], ps [pet ids], bo (boss id), eg (pet id hatched from the egg)}; t=0 draws a still
function drawWish(x,D,t){if(!D)return;t=t||0;const bob=t?Math.round(Math.sin(t/260)):0,hs=heroSpr(D.hc||'war',D.lk),cs=(D.cs||[]).slice(0,3),ps=(D.ps||[]).filter(p=>PSPR[p]).slice(0,2);
 const comp=(c,X,flip)=>{const s=c&&c.cls?compSpr(c):heroSpr('npc');blit(x,s,X,84+bob,{flip,key:'cp:'+compKey(c)});};
 const pet=(p,X,dy,flip)=>blit(x,PSPR[p],X,91+(dy||0),{flip,key:'p'+p});
 const glow=(X,col)=>{x.fillStyle=col||'rgba(244,187,74,0.16)';x.fillRect(X-4,40,24,60);};
 const k=D.k;
 if(k==='top'){funeralDraw(x,true);glow(88);cs.forEach((c,i)=>comp(c,62-i*16,false));ps.forEach((p,i)=>pet(p,112+i*14,0,true));blit(x,hs,88,82+bob,{key:'h'+hs.id});
  for(let i=0;i<10;i++){const a=i*.63+t/900;x.fillStyle=i%2?'#fff6c0':'#ffd04a';x.fillRect(96+Math.round(Math.cos(a)*26),40+Math.round(Math.sin(a)*12),1,1);}return;}
 if(k==='boss'){bgDraw(x,D.b|0);try{drawOverlay(x,D.b|0,t);}catch(e){}const B=BSPR[D.bo];if(B){x.globalAlpha=.4;blit(x,B,124,70,{key:D.bo,noShadow:true});x.globalAlpha=1;}
  glow(52);blit(x,hs,52,84+bob,{key:'h'+hs.id});for(let i=0;i<3;i++)blit(x,COIN,96+i*9,104-(i%2)*2,{noShadow:true});for(let i=0;i<6;i++){x.fillStyle='#ffe890';x.fillRect(48+Math.round(hash(i*7)*24),70+Math.round(hash(i*3)*14),1,1);}return;}
 const tone=k==='meal'||k==='mst'?'dusk':k==='rest'?'night':'day';homeDraw(x,tone);
 if(k==='home'){blit(x,hs,98,84+bob,{key:'h'+hs.id});ps.forEach((p,i)=>pet(p,82-i*14,0,false));drawProp(x,'granny',t);return;}
 if(k==='meal'){blit(x,hs,50,84+bob,{key:'h'+hs.id});cs.forEach((c,i)=>comp(c,[110,94,126][i],true));
  x.fillStyle='#6a4a2a';x.fillRect(40,94,100,3);x.fillStyle='#4a321c';x.fillRect(44,97,3,6);x.fillRect(133,97,3,6);
  for(let i=0;i<4;i++){x.fillStyle='#f1e7d0';x.fillRect(52+i*22,92,8,2);x.fillStyle=['#e8a040','#c84a3a','#6ab04a','#e8d070'][i];x.fillRect(54+i*22,91,4,1);}
  x.fillStyle='rgba(255,200,100,0.10)';x.beginPath();x.arc(90,88,34,0,7);x.fill();ps.forEach((p,i)=>pet(p,30+i*120,4,i>0));return;}
 if(k==='pet'||k==='egg'){blit(x,hs,64,84+bob,{key:'h'+hs.id});const p=k==='egg'?D.eg:ps[0];
  if(k==='egg'){blit(x,PROPS.egg,104,94,{noShadow:true});x.fillStyle='#3a2a1a';x.fillRect(106,94,6,1);}
  if(p&&PSPR[p]){const hop=t?-Math.abs(Math.round(Math.sin(t/220)*4)):-3;pet(p,k==='egg'?100:104,k==='egg'?-6:hop,true);}
  if(k==='pet'){x.fillStyle='#d8302a';x.fillRect(124,80,3,3);x.fillStyle='#ff8a7a';x.fillRect(124,80,1,1);}
  blit(x,ICONS.heart,88,66+(t?Math.round(Math.sin(t/400)*2):0),{noShadow:true});return;}
 if(k==='mst'){blit(x,hs,64,84+bob,{key:'h'+hs.id});drawProp(x,'knight',t);ps.forEach((p,i)=>pet(p,44-i*14,0,false));return;}
 if(k==='apr'){blit(x,hs,64,84+bob,{key:'h'+hs.id});drawProp(x,'child',t);blit(x,ICONS.sword,100,88,{noShadow:true});return;}
 if(k==='rest'){drawProp(x,'fire',t);blit(x,hs,76,84,{key:'h'+hs.id});ps.forEach((p,i)=>pet(p,56-i*14,0,false));
  x.fillStyle='#e8f2ff';[[94,74],[99,68],[105,61]].forEach(([X,Y],i)=>{const s=2+i;x.fillRect(X,Y,s,1);x.fillRect(X+s-1,Y+1,1,1);x.fillRect(X,Y+s-1,s,1);});return;}
 if(k==='gold'){blit(x,hs,60,84+bob,{key:'h'+hs.id});drawProp(x,'merchant',t);for(let i=0;i<6;i++)blit(x,COIN,84+(i%3)*9,100-Math.floor(i/3)*5,{noShadow:true});ps.forEach((p,i)=>pet(p,40-i*14,0,false));return;}
 blit(x,hs,88,84+bob,{key:'h'+hs.id});}
window.ART={lookExtra,BONE,CANDLE,WREATH,STONE,funeralBg,drawCandle,mk,heroSpr,lookOf,rollLook,heroLook,HERO_ROWS,HP_,MSPR,BSPR,BOSS_ROWS,BOSS_PAL,PSPR,PROPS,NPCS,COIN,ICONS,sprCanvas,blit,BG,hash,bgImg,bgHi,bgDraw,drawTorch,drawOverlay,drawProp,compSpr,compKey};
Object.assign(window.ART,{homeBg,drawWish,funeralDraw,homeDraw,hiDraw,isHi});
})();
