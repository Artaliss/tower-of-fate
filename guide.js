// guide.js — คู่มือตัวละคร: อาชีพ สัตว์เลี้ยง แรงค์ มอนสเตอร์/บอส (v0.3.5)
// API: window.GUIDE = { open(tab), close() }  tab: 'cls' | 'pet' | 'rank' | 'mon'
// ตัวเลขทั้งหมดอ่านจาก window.CONTENT (events.js), CONTENT.TUNE (auto.js) และ window.HARD (hard.js) ตอนเปิด ไม่พิมพ์ซ้ำ
// ทางเข้า: ปุ่มในแผ่น ☰ เพิ่มเติม (แท็บ อื่นๆ), ปุ่มบนหัวหน้าต่าง ❓ วิธีเล่น, แท็บ 📖 คู่มือ ในหน้าต่างตระกูล (META.tab)
// ดูครบทุกแท็บ = ความสำเร็จ guide_all · แท็บที่ดูแล้วเก็บใน localStorage 'tof-guide-v1'
(function(){
'use strict';
const C=()=>window.CONTENT||{},A=()=>window.ART||null,HD=()=>window.HARD||{};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const J=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v&&typeof v==='object'?v:{};}catch(e){return{};}};
const pct=(v,d)=>{const n=v*100;return(d==null?(n<1?n.toFixed(1):Math.round(n)):n.toFixed(d))+'%';};
const fmt=n=>(+n||0).toLocaleString();
const TABS=[['cls','⚔️ อาชีพ'],['pet','🐾 สัตว์เลี้ยง'],['rank','⭐ แรงค์'],['mon','👾 มอนสเตอร์']];
const GKEY='tof-guide-v1',ACH_ID='guide_all';
const NORM=['war','mag','arc','pri','rog','far','dra'],SECRET=['dsl','nec','ang'];

// ---------- สถานะของผู้เล่น (อ่านอย่างเดียว) ----------
function state(){const U=J('tof-unlock-v1'),CL=J('tof-clan-v1'),AC=J('tof-ach-v1'),L=J('tof-lineage-v1');
 let P=null;try{P=window.META&&window.META.load?window.META.load():null;}catch(e){}
 const played=new Set();(Array.isArray(L.lines)?L.lines:[]).forEach(l=>(Array.isArray(l&&l.lives)?l.lives:[]).forEach(x=>{if(x&&x.cls)played.add(String(x.cls));}));
 const unl={dsl:!!CL.cls,nec:!!U.nec,ang:!!U.ang};
 const marks=String(CL.got||'')+(CL.m||'');
 const pen=new Set((P&&Array.isArray(P.pets)?P.pets:[]).map(p=>p&&p.k));
 const hatched=new Set(String(CL.pg||'').split(',').concat(CL.pet||'').filter(Boolean));
 return{unl,wins:AC.clsWins||{},played,pen,hatched,sec:!!marks.replace(/[^fsd]/g,'')||!!CL.egg||!!CL.pg,got:AC.got||{}};}

// ---------- สไปรต์ ----------
// data-g="ชนิด:คีย์" แล้ววาดหลังใส่ HTML · sil=1 วาดเป็นเงาดำ (อาชีพลับที่ยังไม่ปลด)
function sprOf(t,k){const R=A();if(!R)return null;try{
 if(t==='h')return R.heroSpr(k);if(t==='p')return R.PSPR[k];if(t==='m')return R.MSPR[k];if(t==='b')return R.BSPR[k];}catch(e){}return null;}
const box=(t,k,sz,sil)=>`<span class="gd-ic${sz?' '+sz:''}"><canvas data-g="${t}:${esc(k)}"${sil?' data-sil="1"':''} aria-hidden="true"></canvas></span>`;
function paint(root){root.querySelectorAll('canvas[data-g]').forEach(c=>{if(c.dataset.ok)return;const [t,k]=c.dataset.g.split(':'),s=sprOf(t,k),R=A();if(!s||!R)return;
 try{c.width=s.w;c.height=s.h;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(R.sprCanvas(s,false,false,'gd'+t+k),0,0);
  if(c.dataset.sil){x.globalCompositeOperation='source-in';x.fillStyle='#05080a';x.fillRect(0,0,s.w,s.h);}
  const lim=Math.max(c.parentNode.clientWidth,c.parentNode.clientHeight)-2||48,sc=Math.max(1,Math.floor(lim/Math.max(s.w,s.h)));
  c.style.width=s.w*sc+'px';c.style.height=s.h*sc+'px';c.dataset.ok=1;}catch(e){}});}

// ---------- แท็บอาชีพ ----------
// จุดเด่น/จุดด้อย เขียนจากค่าพลังและบัพในโค้ด (เลขจริงอยู่บนการ์ดข้างบน)
const NOTE={
 war:['HP กับ DEF สูง ทนที่สุดในหกอาชีพหลัก','ไม่มีฮีลของตัวเอง ตีแรงสู้จอมเวทไม่ได้'],
 mag:['ATK เริ่มต้นสูง สกิลแรกของทุกการต่อสู้แรงมาก','HP และ DEF ต่ำ โดนบอสตีทีเดียวก็เจ็บหนัก'],
 arc:['คริติคอลสูงและหนีง่าย ค่าพลังกลางๆ ทุกด้าน','ไม่มีด้านไหนเด่นสุด สู้ยืดเยื้อกับบอสไม่ค่อยไหว'],
 pri:['ฟื้น HP ทุกชั้น มีสกิลรักษา และฟื้นคืนชีพได้ 1 ครั้ง','ATK ต่ำ ต้องสู้นานกว่าจะล้มศัตรู'],
 rog:['ทองเยอะ LUK สูง แอบอ้อมบอสได้ง่าย','HP และ DEF ต่ำ ถ้าบอสจับได้จะลำบาก'],
 far:['LUK สูงที่สุดแล้วยังคูณเพิ่ม EXP มากขึ้น เข้ากับสัตว์เลี้ยงที่สุด','ATK ต่ำ ช่วงต้นต้องพึ่งสัตว์เลี้ยงกับเพื่อนร่วมทาง'],
 dra:['ค่าพลังสูงทุกด้าน ตีบอสแรงกว่าคนอื่น','เกิดยากมาก'],
 dsl:['ตีมังกรแรงมาก ทั้งบอสมังกรในหอและมังกรชั้นลับ','ตีมอนธรรมดาเบาลง'],
 nec:['มีกองทัพโครงกระดูกช่วยตี และปลุกศพมอนมาช่วยได้','จ้างทหารรับจ้างไม่ได้ HP ไม่สูง'],
 ang:['หลบเก่ง ฟื้น HP ทุกชั้น ปีกช่วยชีวิตได้หนึ่งครั้ง','หลังปีกทำงาน ATK จะลดลงอยู่หลายชั้น']};
function unlockTxt(id,on,T){
 if(id==='dsl')return on?'ปลดแล้ว: ตระกูลของคุณเคยล้มมังกรบนชั้นลับเหนือยอดหอ ลูกหลานจึงเกิดเป็นอาชีพนี้ได้':'??? ว่ากันว่าเหนือยอดหอยังมีบางอย่างรออยู่ ตระกูลที่เลือกทางเด็ดขาดกับมันจะมีลูกหลานแบบนี้';
 if(id==='nec')return on?`ปลดแล้ว: ระหว่างไต่หอ ถ้ากรรมลงถึง ${T.necK!=null?T.necK:'?'} คุณจะกลายร่างกลางทาง จบชีวิตนั้นแล้วอาชีพนี้ก็สุ่มเกิดได้ตั้งแต่หน้าเกิด`:'??? คนที่ทำกรรมชั่วจนสุดทางกลางหอ จะไม่ได้กลับลงมาเป็นคนเดิม';
 if(id==='ang')return on?`ปลดแล้ว: ระหว่างไต่หอ ถ้ากรรมขึ้นถึง +${T.angK!=null?T.angK:'?'} คุณจะกลายร่างกลางทาง จบชีวิตนั้นแล้วอาชีพนี้ก็สุ่มเกิดได้ตั้งแต่หน้าเกิด`:'??? คนที่ทำบุญไว้มากพอกลางหอ อาจมีอะไรงอกออกมาจากหลัง';
 return'';}
function clsTab(st){const K=C().CLASSES||[],T=C().TUNE||{},B=HD().BUFF||{};
 const sumW=K.reduce((a,c)=>a+(c.w||0),0),sumNow=K.reduce((a,c)=>a+(c.w||(st.unl[c.id]?c.sw||0:0)),0);
 const card=c=>{const sec=SECRET.includes(c.id),on=!sec||st.unl[c.id],w=st.wins[c.id]|0,pl=st.played.has(c.n),g=c.g||{},bf=B[c.id],N=NOTE[c.id]||['',''];
  const odds=c.w?`โอกาสเกิด ${pct(c.w/sumW)}`:on?`โอกาสเกิดตอนนี้ ${pct((c.sw||0)/sumNow)}`:'ยังเกิดเองไม่ได้';
  const seen=w?`<span class="gd-tag ok">ชนะแล้ว ${w} ครั้ง</span>`:pl?'<span class="gd-tag">เคยเล่นแล้ว</span>':'';
  if(!on)return`<article class="gd-card lock">${box('h',c.id,'',1)}<div class="gd-tx"><h3>??? <span class="gd-tag sec">อาชีพลับ</span></h3><p class="gd-hint">${esc(unlockTxt(c.id,false,T))}</p></div></article>`;
  return`<article class="gd-card">${box('h',c.id)}<div class="gd-tx"><h3>${esc(c.n)} ${sec?'<span class="gd-tag sec">อาชีพลับ</span>':''}${seen}</h3>
  <div class="gd-st"><span>HP <b>${c.hp}</b><i>+${g.hp}</i></span><span>ATK <b>${c.atk}</b><i>+${g.atk}</i></span><span>DEF <b>${c.def}</b><i>+${g.def}</i></span><span>LUK <b>${c.luk}</b><i>+${g.luk}</i></span><span>MP <b>${c.mp}</b><i>+${g.mp}</i></span></div>
  <div class="gd-dim">${odds} · ค่าพื้นฐานก่อนคิดแรงค์ ตัวเลขสีเขียวคือที่เพิ่มต่อเลเวล</div>
  <p><b class="gd-k">ติดตัว · ${esc(c.p)}</b> ${esc(c.pd)}</p>
  ${c.sp?`<p><b class="gd-k">บัพพิเศษ · ${esc(c.sp)}</b> ${esc(c.spd)}</p>`:''}
  ${bf?`<p><b class="gd-k">ในดันเจี้ยน · ${esc(bf.n)}</b> ${esc(bf.d)}${bf.t==='pt'?' (ได้ทั้งตี้)':' (เฉพาะตัวเอง)'}</p>`:''}
  <p class="gd-pm"><span class="p">เด่น</span> ${esc(N[0])}</p><p class="gd-pm"><span class="m">ด้อย</span> ${esc(N[1])}</p>
  ${sec?`<p class="gd-hint">${esc(unlockTxt(c.id,true,T))}</p>`:''}</div></article>`;};
 const nm=K.filter(c=>NORM.includes(c.id)),sc=K.filter(c=>SECRET.includes(c.id)),nOn=sc.filter(c=>st.unl[c.id]).length;
 return`<p class="gd-dim">อาชีพสุ่มตอนเกิด แรงค์ทำให้ค่าพลังสูงขึ้นหรือต่ำลง (ดูแท็บแรงค์) ในดันเจี้ยนโหมดยาก อาชีพเดียวกันได้บัพอีกแบบ</p>
 <h3 class="gd-h">อาชีพทั่วไป ${nm.length} อาชีพ</h3><div class="gd-list">${nm.map(card).join('')}</div>
 <h3 class="gd-h">อาชีพลับ ปลดแล้ว ${nOn}/${sc.length}</h3><div class="gd-list">${sc.map(card).join('')}</div>`;}

// ---------- แท็บสัตว์เลี้ยง ----------
function petTab(st){const PE=C().PETS||{},MO=C().MONS||[],BI=C().BIOMES||[],HB=HD(),M=window.META;
 const pb=k=>{try{const b=HB.petB?HB.petB({k,legend:!!(PE[k]||{}).legend}):null;return b&&b.d||'';}catch(e){return'';}};
 const DR={drk:'มังกรดำ',drs:'มังกรเงิน',drg:'มังกรทอง'};
 const where=k=>{const m=MO.filter(x=>x.pet===k);
  if(m.length)return`จับ${m.map(x=>`${x.n} (${(x.b||[]).map(b=>BI[b]).filter(Boolean).join(', ')})`).join(' หรือ ')} มาเลี้ยงตอนชนะ หรือเจอมันหลงทาง ฟักจากไข่ประหลาด หรือเจอตัวเผือกระหว่างไต่หอ`;
  if(DR[k])return`ฟักจากไข่ที่ได้จากชั้นลับ ถ้าชนะ${DR[k]} ไข่มีโอกาสครึ่งหนึ่งที่จะเป็นตัวนี้ (ที่เหลือเป็นสัตว์ตำนาน)`;
  if(k==='unicorn'||k==='fairy')return'เจอได้ยากในช่วงท้ายหอ (ชั้น 61 ขึ้นไป) ได้จากเควสในเมือง หรือฟักจากไข่ชั้นลับ';
  return'ฟักจากไข่ชั้นลับเท่านั้น';};
 const rare=k=>{const P=PE[k];return P.legend?['ตำนาน','leg']:P.clan?['ประจำตระกูล','clan']:['ทั่วไป','com'];};
 const card=k=>{const P=PE[k],r=rare(k),own=st.pen.has(k)?'<span class="gd-tag ok">อยู่ในคอกตระกูล</span>':st.hatched.has(k)?'<span class="gd-tag ok">เคยฟักแล้ว</span>':'';
  return`<article class="gd-card">${box('p',k)}<div class="gd-tx"><h3>${P.legend?'✨ ':''}${esc(P.n)} <span class="gd-tag ${r[1]}">${r[0]}</span>${own}</h3>
  <p><b class="gd-k">ไต่หอ</b> ${esc(P.d)}</p>${pb(k)?`<p><b class="gd-k">ดันเจี้ยน</b> ${esc(pb(k))}</p>`:''}
  <p class="gd-hint">${esc(where(k))}</p></div></article>`;};
 const ks=Object.keys(PE),grp=(t,L)=>L.length?`<h3 class="gd-h">${t} ${L.length} ตัว</h3><div class="gd-list">${L.map(card).join('')}</div>`:'';
 const sp=(M&&M.SLOT_P_MAX)||'',P0=(()=>{try{return M&&M.load();}catch(e){return null;}})(),sl=P0&&P0.slots?P0.slots.p:'';
 return`<p class="gd-dim">ระหว่างไต่หอพาสัตว์ไปได้ 2 ตัว ถ้าได้ตัวที่สามต้องเลือกปล่อยตัวเก่า สัตว์ที่อยู่ด้วยจนพิชิตยอดหอจะไปอยู่ในคอกของตระกูล${sl?` (ตอนนี้ ${sl} ช่อง ขยายได้ถึง ${sp})`:''} แล้วพาลงดันเจี้ยนได้ทีละตัว · ชาวไร่ทำให้สัตว์เลี้ยงเก่งขึ้น · LUK สูงจับมอนมาเลี้ยงง่ายขึ้น</p>
 ${grp('สัตว์ทั่วไป',ks.filter(k=>!PE[k].clan))}${grp('ลูกมังกรประจำตระกูล',ks.filter(k=>PE[k].clan&&!PE[k].legend))}${grp('สัตว์ตำนาน',ks.filter(k=>PE[k].legend))}`;}

// ---------- แท็บแรงค์ ----------
function rankTab(){const RK=C().RANKS||[],T=C().TUNE||{},HB=HD(),UP=HB.RKUP||[],MS=HB.MASTER||null;
 const sw=RK.reduce((a,r)=>a+r.w,0);
 const row=(r,i)=>{const u=UP[i];return`<tr><td><span class="gd-rk" style="background:${r.col}">${esc(r.k)}</span></td><td>×${r.m}</td><td>+${i}</td><td>${pct(r.w/sw)}</td><td>${r.k==='SS'?'ฝึกขึ้นไม่ได้':u?`🪙 ${fmt(u[0])} · Lv.${u[1]}`:'แรงค์เริ่มต้น'}</td></tr>`;};
 return`<p class="gd-dim">แรงค์สุ่มตอนเกิดพร้อมอาชีพ HP ATK DEF MP ตอนเกิดคูณตามแรงค์ ส่วน LUK บวกเพิ่มขั้นละ 1 กรรมจากชีวิตก่อนขยับโอกาสได้นิดหน่อย</p>
 <div class="gd-tw"><table class="gd-tb"><thead><tr><th>แรงค์</th><th>ค่าพลัง</th><th>LUK</th><th>โอกาสเกิด</th><th>ฝึกขึ้นที่ลานฝึก</th></tr></thead><tbody>${RK.map(row).join('')}
 ${MS?`<tr><td><span class="gd-rk" style="background:#fff">Master</span></td><td>+15%</td><td></td><td>เกิดไม่ได้</td><td>🪙 ${fmt(MS.gold)} · 🌈 ${MS.rb} · Lv.${MS.lv}</td></tr>`:''}</tbody></table></div>
 <h3 class="gd-h">F ถึง S</h3><p>ได้จากการสุ่มตอนเกิด คนในตระกูลที่ยังไม่ถึง S เอาไปฝึกที่ลานฝึกในเมืองได้ จ่ายเหรียญเมืองแล้วเลื่อนทีละขั้น ต้องมีเลเวลตามตาราง</p>
 <h3 class="gd-h">SS</h3><p>มีสองทาง ทางแรกคือสุ่มเกิดได้เอง (โอกาส ${pct((RK.find(r=>r.k==='SS')||{w:0}).w/sw)})${T.ssGold?` ได้ทองติดตัว +${T.ssGold} ด้วย`:''} อีกทางคือพิชิตยอดหอแล้วผ่านชั้นลับเหนือยอดหอ${T.secP?` (หลังล้มบอสชั้น 100 มีโอกาส ${pct(T.secP)} ที่บันไดจะโผล่มา)`:''} คนนั้นจะเข้าตระกูลเป็นแรงค์ SS ลานฝึกเลื่อนให้ถึง SS ไม่ได้</p>
 ${MS?`<h3 class="gd-h">Master</h3><p>ขั้นสูงสุดของคนในตระกูล ต้องเป็นแรงค์ S หรือ SS เลเวล ${MS.lv} ขึ้นไป และผ่านดันเจี้ยนโหมดยากด่าน ${MS.stage} แล้ว จ่าย 🪙 ${fmt(MS.gold)} กับ 🌈 ${MS.rb} (หรือใช้ตั๋ว Master จากร้านเหรียญรุ้งแทน) ได้ค่าพลัง +15% และบัพอาชีพในดันเจี้ยนแรงขึ้นครึ่งเท่า</p>`:''}`;}

// ---------- แท็บมอนสเตอร์ ----------
function monTab(st){const MO=C().MONS||[],BO=C().BOSSES||[],BI=C().BIOMES||[],PE=C().PETS||{};
 const mul=(k,v)=>`<span>${k} <b>×${v}</b></span>`;
 const sec=st.sec;
 return`<p class="gd-dim">หอแบ่งเป็น 5 ภาค ภาคละ 20 ชั้น บอสโผล่ทุก 10 ชั้น ชั้นที่ 20 ของแต่ละภาคเป็นร่างที่แรงกว่า ตัวเลขคือค่าพลังเทียบกับมอนปกติของชั้นนั้น</p>
 ${BI.map((b,i)=>{const L=MO.filter(m=>(m.b||[]).includes(i)),B=BO[i],f0=i*20;return`<h3 class="gd-h">${esc(b)} · ชั้น ${f0+1}–${f0+20}</h3><div class="gd-list">
  ${L.map(m=>`<article class="gd-card sm">${box('m',m.id)}<div class="gd-tx"><h3>${esc(m.n)}${m.pet&&PE[m.pet]?` <span class="gd-tag ok">จับเลี้ยงได้: ${esc(PE[m.pet].n)}</span>`:''}</h3><div class="gd-st">${mul('HP',m.hp)}${mul('ATK',m.atk)}${mul('DEF',m.def)}</div><p class="gd-dim">${esc(m.x)}</p></div></article>`).join('')}
  ${B?`<article class="gd-card boss">${box('b',B.id,'lg')}<div class="gd-tx"><h3>${esc(B.n)} <span class="gd-tag sec">บอส</span></h3><p class="gd-dim">ชั้น ${f0+10} · ชั้น ${f0+20} มาเป็น${esc(B.n2)}</p><p class="gd-dim">${esc(B.x)}</p></div></article>`:''}</div>`;}).join('')}
 <h3 class="gd-h">เหนือยอดหอ</h3><div class="gd-list">${sec?['k','s','g'].map(v=>`<article class="gd-card boss">${box('b','hoard_'+v,'lg')}<div class="gd-tx"><h3>${{k:'มังกรดำ',s:'มังกรเงิน',g:'มังกรทอง'}[v]} <span class="gd-tag sec">ชั้นลับ</span></h3><p class="gd-dim">นอนเฝ้ากองสมบัติบนชั้นลับ จะล้มมัน ไว้ชีวิต หรือไม่ขึ้นไปเลยก็ได้</p></div></article>`).join(''):
  `<article class="gd-card lock">${box('b','hoard_k','lg',1)}<div class="gd-tx"><h3>???</h3><p class="gd-hint">พิชิตยอดหอให้ได้ก่อน บางทีอาจมีบันไดขึ้นไปต่อ</p></div></article>`}</div>`;}

// ---------- หน้าต่าง ----------
let dlg=null,cur='cls',held=false;
function css(){const s=document.createElement('style');s.textContent=`
#guideDlg{box-sizing:border-box;width:min(720px,calc(100vw - 16px));max-width:none;height:min(880px,90vh);height:min(880px,90dvh);max-height:none;margin:auto;padding:0;border:2px solid var(--line2,#3d5a66);background:var(--panel,#15232a);color:var(--ink,#f1e7d0);border-radius:8px;overflow:hidden}
#guideDlg[open]{display:flex;flex-direction:column}
#guideDlg::backdrop{background:rgba(0,0,0,.6)}
#guideDlg .gd-hd{flex:none;display:flex;align-items:center;gap:8px;padding:8px 8px 8px 14px;border-bottom:1px solid var(--line,#2c434d);min-width:0}
#guideDlg .gd-hd h2{flex:1 1 auto;min-width:0;margin:0;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--gold,#f4bb4a);font-weight:500}
#guideDlg .gd-x{flex:none;background:var(--panel2,#1c2e36);border:1px solid var(--line2,#3d5a66);border-radius:3px;padding:4px 10px;color:inherit;font:inherit;font-size:13px;min-height:32px;cursor:pointer}
#guideDlg .gd-tabs{flex:none;display:flex;gap:5px;overflow-x:auto;overflow-y:hidden;padding:7px 12px 8px;border-bottom:1px solid var(--line,#2c434d);scrollbar-width:thin;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
#guideDlg .gd-tabs::after{content:'';flex:0 0 6px}
#guideDlg .gd-tabs button{flex:none;background:var(--bg2,#101b20);border:1px solid var(--line,#2c434d);border-radius:14px;padding:4px 11px;color:var(--muted,#a3b5ad);font:inherit;font-size:13px;white-space:nowrap;min-height:32px;cursor:pointer}
#guideDlg .gd-tabs button[aria-selected=true]{background:var(--gold,#f4bb4a);border-color:#7a5214;color:#1a1206;font-weight:500}
#guideDlg .gd-bd{flex:1 1 auto;min-height:0;padding:10px 14px 16px;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;font-size:13.5px;line-height:1.55}
#guideDlg .gd-bd p{margin:4px 0}
#guideDlg .gd-h{margin:14px 0 6px;font-size:15px;color:var(--gold,#f4bb4a);font-weight:500}
#guideDlg .gd-dim{color:var(--muted,#a3b5ad);font-size:12.5px}
#guideDlg .gd-list{display:grid;gap:8px}
@media (min-width:700px){#guideDlg .gd-list{grid-template-columns:1fr 1fr}#guideDlg .gd-card:not(.sm):not(.boss){grid-column:auto}}
#guideDlg .gd-card{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line,#2c434d);border-radius:8px;padding:8px;background:rgba(255,255,255,.03);min-width:0}
#guideDlg .gd-card.lock{opacity:.8;border-style:dashed}
#guideDlg .gd-card.boss{border-color:#7a3a2a}
#guideDlg .gd-card h3{margin:0 0 3px;font-size:14.5px;font-weight:500;line-height:1.4}
#guideDlg .gd-tx{flex:1 1 auto;min-width:0}
#guideDlg .gd-ic{flex:none;display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:6px;background:var(--bg2,#101b20);border:1px solid var(--line,#2c434d)}
#guideDlg .gd-ic.lg{width:72px;height:72px}
#guideDlg .gd-ic canvas{image-rendering:pixelated;image-rendering:crisp-edges;width:48px;height:48px}
#guideDlg .gd-tag{display:inline-block;margin-left:4px;padding:0 6px;border-radius:9px;font-size:11px;line-height:18px;vertical-align:2px;border:1px solid var(--line2,#3d5a66);color:var(--muted,#a3b5ad);font-weight:400}
#guideDlg .gd-tag.ok{border-color:#3d6a3a;color:var(--good,#86d67f)}
#guideDlg .gd-tag.sec{border-color:#6a3d6a;color:var(--sc-sec,#d77ad0)}
#guideDlg .gd-tag.leg{border-color:#7a5214;color:var(--gold,#f4bb4a)}
#guideDlg .gd-tag.clan{border-color:#2f5a7a;color:var(--mp,#4fa6e0)}
#guideDlg .gd-st{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:12.5px;color:var(--muted,#a3b5ad)}
#guideDlg .gd-st b{color:var(--ink,#f1e7d0);font-weight:500}#guideDlg .gd-st i{font-style:normal;font-size:11px;color:var(--good,#86d67f);margin-left:2px}
#guideDlg .gd-k{color:var(--gold,#f4bb4a);font-weight:500}
#guideDlg .gd-hint{color:var(--karma,#d7b8f0);font-size:12.5px}
#guideDlg .gd-pm{font-size:12.5px}#guideDlg .gd-pm span{display:inline-block;min-width:2.6em;font-weight:500}#guideDlg .gd-pm .p{color:var(--good,#86d67f)}#guideDlg .gd-pm .m{color:var(--bad,#ef6b5e)}
#guideDlg .gd-tw{overflow-x:auto}
#guideDlg .gd-tb{border-collapse:collapse;width:100%;font-size:13px}
#guideDlg .gd-tb th,#guideDlg .gd-tb td{padding:4px 6px;border-bottom:1px solid var(--line,#2c434d);text-align:left;white-space:nowrap}
#guideDlg .gd-tb th{color:var(--muted,#a3b5ad);font-weight:400;font-size:12px}
#guideDlg .gd-rk{display:inline-block;min-width:2.2em;text-align:center;padding:0 5px;border-radius:4px;color:#111;font-size:12px;font-weight:600}
@media (max-width:640px),(max-height:520px){
#guideDlg{width:100vw;height:100vh;height:100dvh;margin:0;border:0;border-radius:0;padding:env(safe-area-inset-top,0) env(safe-area-inset-right,0) 0 env(safe-area-inset-left,0)}
#guideDlg .gd-hd{padding:4px 6px 4px 12px}#guideDlg .gd-hd h2{font-size:15.5px}
#guideDlg .gd-bd{padding:10px 12px calc(14px + env(safe-area-inset-bottom,0px))}
#guideDlg .gd-ic{width:44px;height:44px}#guideDlg .gd-ic canvas{width:40px;height:40px}#guideDlg .gd-ic.lg{width:60px;height:60px}}
.gd-hb{background:var(--panel2,#1c2e36);border:1px solid var(--line2,#3d5a66);border-radius:3px;padding:4px 8px;color:var(--ink,#f1e7d0);font:inherit;font-size:13px;white-space:nowrap;cursor:pointer;margin-left:auto}`;document.head.appendChild(s);}
const hold=on=>{if(on===held)return;held=on;try{document.dispatchEvent(new CustomEvent('tof:pause',{detail:{on}}));}catch(e){}};
function build(){css();const d=dlg=document.createElement('dialog');d.id='guideDlg';d.setAttribute('aria-labelledby','guideT');
 d.innerHTML=`<div class="gd-hd"><h2 id="guideT">📖 คู่มือตัวละคร</h2><button type="button" class="gd-x" aria-label="ปิดคู่มือ">ปิด ✕</button></div>
 <div class="gd-tabs" role="tablist" aria-label="หมวดคู่มือ">${TABS.map(([k,n])=>`<button type="button" role="tab" id="gdt-${k}" data-t="${k}" aria-controls="guideBody" aria-selected="false" tabindex="-1">${n}</button>`).join('')}</div>
 <div class="gd-bd" id="guideBody" role="tabpanel" tabindex="0"></div>`;
 document.body.appendChild(d);
 d.querySelector('.gd-x').onclick=close;
 d.addEventListener('click',e=>{if(e.target===d)close();});
 d.addEventListener('close',()=>hold(false));
 d.querySelector('.gd-tabs').addEventListener('click',e=>{const t=e.target.closest('[data-t]');if(t)show(t.dataset.t,true);});
 d.querySelector('.gd-tabs').addEventListener('keydown',e=>{const ids=TABS.map(t=>t[0]);let i=ids.indexOf(cur);
  if(e.key==='ArrowRight')i=(i+1)%ids.length;else if(e.key==='ArrowLeft')i=(i-1+ids.length)%ids.length;else if(e.key==='Home')i=0;else if(e.key==='End')i=ids.length-1;else return;e.preventDefault();show(ids[i],true);});
 d.addEventListener('keydown',e=>{if(e.key!=='Escape')e.stopPropagation();});}
function seen(k){let g={};try{g=JSON.parse(localStorage.getItem(GKEY)||'{}')||{};}catch(e){}const L=Array.isArray(g.seen)?g.seen:[];if(!L.includes(k))L.push(k);g.seen=L;
 try{localStorage.setItem(GKEY,JSON.stringify(g));}catch(e){}
 if(TABS.every(t=>L.includes(t[0]))){try{if(window.META&&window.META.grantAch)window.META.grantAch(ACH_ID);else if(window.ACH&&window.ACH.grant)window.ACH.grant(ACH_ID);}catch(e){}}}
function show(k,focus){if(!TABS.some(t=>t[0]===k))k='cls';cur=k;
 dlg.querySelectorAll('.gd-tabs [data-t]').forEach(b=>{const on=b.dataset.t===k;b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1;if(on){if(focus)try{b.focus();}catch(e){}try{b.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){}}});
 const bd=dlg.querySelector('#guideBody'),st=state();bd.setAttribute('aria-labelledby','gdt-'+k);
 try{bd.innerHTML=k==='pet'?petTab(st):k==='rank'?rankTab(st):k==='mon'?monTab(st):clsTab(st);}catch(e){bd.innerHTML='<p class="gd-dim">หน้านี้เปิดไม่ขึ้น</p>';console.error(e);}
 bd.scrollTop=0;paint(bd);seen(k);}
function open(k){if(!dlg)build();if(!dlg.open){try{dlg.showModal();}catch(e){dlg.setAttribute('open','');}}hold(true);show(k||cur,true);}
function close(){if(!dlg)return;if(dlg.open&&dlg.close)dlg.close();else{dlg.removeAttribute('open');hold(false);}}

try{window.ACH&&window.ACH.add&&window.ACH.add([{id:ACH_ID,n:'อ่านคู่มือจนจบ',d:'เปิดคู่มือตัวละครแล้วดูครบทุกแท็บ',icon:'📖',tier:'bronze'}]);}catch(e){}

// ---------- ทางเข้า ----------
const mkBtn=(cls,txt,fn)=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=txt;b.onclick=fn;return b;};
// แผ่น ☰ เพิ่มเติม: auto.js ล้าง #moreActs แล้วใส่ปุ่มใหม่ทุกครั้งที่เปิด เลยคอยเติมปุ่มคู่มือกลับเข้าไป
function hookMore(){const a=document.getElementById('moreActs');if(!a)return;
 const put=()=>{if(a.querySelector('[data-guide]'))return;const b=mkBtn('btn','📖 คู่มืออาชีพและสัตว์เลี้ยง',()=>{try{window.MORE&&window.MORE.close();}catch(e){}open('cls');});b.dataset.guide='1';a.appendChild(b);};
 put();try{new MutationObserver(put).observe(a,{childList:true});}catch(e){}}
// หน้าต่าง ❓ วิธีเล่น (tips.js สร้างตอน DOMContentLoaded): ปุ่มเล็กบนหัวหน้าต่าง
function hookHelp(){const hd=document.querySelector('dialog.helpdlg .hd');if(!hd||hd.querySelector('.gd-hb'))return!!hd;
 const x=hd.querySelector('.x'),b=mkBtn('gd-hb','📖 คู่มือ',()=>{try{window.TIPS&&window.TIPS.close();}catch(e){}open('cls');});b.setAttribute('aria-label','เปิดคู่มืออาชีพและสัตว์เลี้ยง');
 hd.insertBefore(b,x||null);return true;}
// หน้าต่างตระกูลและเมือง: แท็บสั้นๆ ที่พาไปหน้าคู่มือ
function hookMeta(){const M=window.META;if(!M||!M.tab||M.hasTab&&M.hasTab('guide'))return;
 M.tab('guide',{n:'📖 คู่มือ',o:95,render(el){el.innerHTML=`<p class="mt-dim">รวมทุกอาชีพ สัตว์เลี้ยง แรงค์ และมอนสเตอร์ไว้ที่เดียว พร้อมตัวเลขจริงจากในเกม ใช้ดูก่อนจัดตี้ลงดันเจี้ยนหรือก่อนเลือกทางในหอ</p>
  <div>${TABS.map(([k,n])=>`<button class="mt-btn" type="button" data-gd="${k}">${n}</button>`).join('')}</div>`;
  el.querySelectorAll('[data-gd]').forEach(b=>b.onclick=()=>open(b.dataset.gd));}});}
function boot(){hookMore();hookMeta();if(!hookHelp()){let n=0;const t=setInterval(()=>{if(hookHelp()||++n>40)clearInterval(t);},250);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);

window.GUIDE={open,close};
})();
