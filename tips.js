// Tower of Fate — TIPS: hover/tap tooltips + "วิธีเล่น" glossary. Self-contained; works on index.html and auto.html.
(function(){
'use strict';
const AUTO=/auto\.html/.test(location.pathname);
// k: id, n: title, d: text, kw: keywords that auto-attach this tip, g: glossary group
const T=[
{k:'hp',g:'ค่าสถานะ',n:'HP พลังชีวิต',kw:['HP สูงสุด','HP'],d:'HP หมดเมื่อไหร่ก็ตายทันที ขึ้นชั้นใหม่จะฟื้นนิดหน่อย ดื่มยาฟื้นได้ 45% เลเวลอัปฟื้น 30% และหลังชนะบอสศาลพักใจฟื้นให้ฟรี 20%'},
{k:'atk',g:'ค่าสถานะ',n:'ATK พลังโจมตี',kw:['ATK'],d:'แรงตีต่อครั้ง เพิ่มได้จากเลเวล ร้านลับคมอาวุธ อีเวนต์ และจิ้งจอกไฟ (+12%)'},
{k:'def',g:'ค่าสถานะ',n:'DEF พลังป้องกัน',kw:['DEF'],d:'ลดความเสียหายที่โดน ยิ่งสูงยิ่งทนบอส เพิ่มได้จากเลเวล ร้านเสริมเกราะ และหมาป่าน้อย (+12%)'},
{k:'luk',g:'ค่าสถานะ',n:'LUK โชค',kw:['LUK'],d:'ช่วยเกือบทุกอย่าง: คริติคอล หลบการโจมตี หนีสำเร็จ จับสัตว์เลี้ยง และลดโอกาสเจอผลร้ายในอีเวนต์ ชาวไร่ได้โชคแรงกว่าคนอื่น 1.5 เท่า'},
{k:'mp',g:'ค่าสถานะ',n:'MP มานา',kw:['MP สูงสุด','MP'],d:'ต้นการต่อสู้ ถ้ามี 10 MP จะใช้สกิลเปิดฉากอัตโนมัติ (นักบวชใช้รักษาตัวเอง) ขึ้นชั้นใหม่ฟื้น MP 20%'},
{k:'lv',g:'ค่าสถานะ',n:'เลเวล / EXP',kw:['EXP','Lv.'],d:'ได้ EXP จากการสู้ อีเวนต์ และการฟาร์ม เลเวลอัปแล้วค่าสถานะขึ้นตามอาชีพและแรงค์'},
{k:'gold',g:'ค่าสถานะ',n:'เหรียญทอง',kw:['ทอง'],d:'ใช้ซื้อของที่ศาลพักใจหลังชนะบอส จ้างเพื่อนร่วมทีม และซื้อม้วนวาร์ปฉุกเฉิน โจรได้ทองเพิ่ม 30%'},
{k:'rank',g:'ตัวละคร',n:'แรงค์ F ถึง SS',kw:['RANK','แรงค์'],d:'สุ่มตอนเกิด แรงค์สูงค่าสถานะพื้นฐานสูงกว่า (F ×0.74 ถึง SS ×1.65) เลื่อนแรงค์ได้ที่ศาลพักใจ แต่แพงขึ้นเรื่อยๆ'},
{k:'cls',g:'ตัวละคร',n:'อาชีพและสกิลติดตัว',kw:['สกิลติดตัว'],d:'แต่ละอาชีพมีสกิลติดตัวต่างกัน เช่น นักรบรับดาเมจน้อยลง จอมเวทเปิดฉากแรง นักบวชฟื้น HP ทุกชั้น อัศวินมังกรหายากที่สุด'},
{k:'form',g:'ตัวละคร',n:'ร่าง: คน หรือ สไลม์',kw:['ร่าง:'],d:'เลือกได้ก่อนเข้าหอ เปลี่ยนแค่หน้าตา ค่าสถานะเท่ากัน สไลม์สุ่มสีและหน้าให้ทุกตัว'},
{k:'odds',g:'ตัวละคร',n:'1 ใน N',kw:['1 ใน'],d:'โอกาสที่จะเกิดมาเป็นแรงค์และอาชีพนี้พร้อมกัน ยิ่งเลขมากยิ่งหายาก'},
{k:'karma',g:'กรรม',n:'กรรมดี ✦ / กรรมชั่ว ✧',kw:['กรรมดี','กรรมชั่ว','กรรม'],d:'ตัวเลือกที่มีป้าย ✦ ให้กรรมดี ป้าย ✧ ให้กรรมชั่ว กรรมไม่เปลี่ยนค่าสถานะตรงๆ แต่ถ้ากรรมชั่วสะสมเกิน 8 แต้ม เพื่อนร่วมทีมอาจทรยศ ขโมยทอง 25% แล้วหนีไป และคนที่เจอจะพูดกับคุณไม่ดี ตอนตายจะได้คำตัดสินดวงวิญญาณตามกรรม'+(AUTO?' และฉายาตอนจบก็ขึ้นกับกรรมด้วย':'')},
{k:'pet',g:'เพื่อนร่วมทาง',n:'สัตว์เลี้ยง (สูงสุด 2)',kw:['สัตว์เลี้ยง'],d:'สไลม์: ฟื้น HP +4% ทุกชั้น · จิ้งจอกไฟ: ATK +12% · นกฮูก: LUK +6 · หมาป่าน้อย: DEF +12% และช่วยกัด ได้จากการปราบมอนบางตัวให้เชื่อง หรือเจอสัตว์หลงทาง'},
{k:'comp',g:'เพื่อนร่วมทาง',n:'เพื่อนร่วมทีม / ทหารรับจ้าง (สูงสุด 2)',kw:['ทหารรับจ้าง','เพื่อนร่วมทีม','จ้าง'],d:'ช่วยตีทุกรอบการต่อสู้ และเก่งขึ้นเล็กน้อยทุกชั้น นักบวชช่วยฟื้น HP ระหว่างสู้ จ้างด้วยทอง หรือรับภารกิจแลก (เสี่ยงบาดเจ็บ แต่ได้กรรมดี)'},
{k:'pot',g:'ไอเทม',n:'ยาฟื้นพลัง',kw:['ยาฟื้นพลัง','ยา'],d:'ฟื้น HP 45% กดใช้เมื่อไหร่ก็ได้ (ปุ่ม P) ซื้อได้ที่ศาลพักใจ หรือได้จากอีเวนต์'},
{k:'warp',g:'ไอเทม',n:'ม้วนวาร์ป',kw:['ม้วนวาร์ป','วาร์ป'],d:'ใช้ข้ามบอสได้ 1 ตัว แต่ไม่ได้รางวัล ถ้าไม่มีม้วน ซื้อฉุกเฉินตอนเจอบอสได้แต่แพง ชั้น 100 ใช้ไม่ได้'},
{k:'boss',g:'หอคอย',n:'ชั้นบอส (ทุก 10 ชั้น)',kw:['ชั้นบอส','บอส'],d:'ขีดแดงบนหลอดคือชั้นบอส แพ้บอส = ตาย ถ้าโอกาสชนะต่ำ ถอยลงไปฟาร์มเวลก่อน หรือใช้ม้วนวาร์ปข้าม ชนะแล้วได้ทองก้อนโตและเข้าศาลพักใจ'},
{k:'shop',g:'หอคอย',n:'ศาลพักใจ',kw:['ศาลพักใจ'],d:'ร้านค้าหลังชนะบอส ฟื้น HP ฟรี 20% ซื้อพักฟื้นเต็ม ยา ม้วนวาร์ป อัปค่าสถานะ หรือเลื่อนแรงค์'},
{k:'farm',g:'หอคอย',n:'ฟาร์มเวล',kw:['ฟาร์ม'],d:'สู้มอนที่ชั้นเดิมเพื่อเก็บ EXP และทอง ยิ่งฟาร์มซ้ำยิ่งได้น้อยลง (ความเหนื่อยล้า) และมีโอกาสโดนรุม'},
{k:'win',g:'หอคอย',n:'โอกาสชนะ ~%',kw:['โอกาสชนะ'],d:'เกมลองจำลองการต่อสู้นี้หลายสิบรอบแล้วบอกว่าชนะกี่ % เป็นค่าประมาณ ไม่ใช่ผลจริง'},
{k:'flee',g:'หอคอย',n:'หนี / ปราบเป็นสัตว์เลี้ยง',kw:['หนีรอด','ปราบเป็นสัตว์เลี้ยง'],d:'หนีไม่พ้นจะโดนตีก่อนแล้วต้องสู้ ปราบไม่สำเร็จมอนจะคลั่งแรงขึ้น โชคช่วยทั้งสองอย่าง'},
...(AUTO?[
{k:'fate',g:'โหมดชะตากำหนด',n:'ดวงชะตา',kw:['ดวงชะตา'],d:'ชีวิตในหอมีวันหมดอายุเหมือนคนจริง ยิ่งขึ้นสูงยิ่งเสี่ยง คำใบ้ดวงชะตาบอกแค่คร่าวๆ ว่าชีวิตนี้ยืนหรือสั้น'},
{k:'omen',g:'โหมดชะตากำหนด',n:'พร / คำสาปประจำชาติ',kw:['พรปนคำสาป','ประจำชาตินี้','คำสาป'],d:'สุ่มตอนเกิด 1 อย่าง ส่งผลทั้งรอบ เช่น ทองตกง่าย สัตว์เลี้ยงมาบ่อย หรือ mimic ชุกชุม'},
{k:'key',g:'โหมดชะตากำหนด',n:'จุดเปลี่ยนชะตา',kw:['จุดเปลี่ยน'],d:'เกมจะหยุดให้คุณตัดสินใจเฉพาะเรื่องสำคัญ เช่น ทหารรับจ้าง สัตว์เลี้ยง หีบสมบัติ หรือบอส มีเวลา 15 วินาที ถ้าไม่เลือก เกมเลือกให้ตามนิสัยตัวละคร'},
{k:'rare',g:'โหมดชะตากำหนด',n:'◆ หายาก / ★ ตำนาน',kw:['ระดับตำนาน','หายาก'],d:'จุดเปลี่ยนที่นานๆ จะเจอ รางวัลดีกว่าปกติ แต่มักมีความเสี่ยงติดมาด้วย'},
{k:'mimic',g:'โหมดชะตากำหนด',n:'หีบสมบัติ / mimic',kw:['mimic','กล่องนี้ดูแปลกๆ','หีบ'],d:'หีบบางใบเป็นปีศาจปลอมตัว เขี่ยดูก่อนปลอดภัยกว่า ถ้าโชคดีจะมีคำใบ้ว่ากล่องดูแปลกๆ ชนะ mimic ได้ของดี'},
{k:'speed',g:'โหมดชะตากำหนด',n:'ความเร็ว / หยุด',kw:['ความเร็ว','ชั้นถัดไปใน'],d:'1x = ชั้นละ 5 วินาที เร่งได้ถึง 16x กด Space เพื่อหยุด/เล่นต่อ เวลาตัดสินใจไม่เร่งตามความเร็ว'}]:[])];
const BY={};T.forEach(t=>BY[t.k]=t);
const KW=T.flatMap(t=>t.kw.map(w=>[w,t.k])).sort((a,b)=>b[0].length-a[0].length);
const FIXED={'c-hp':'hp','c-atk':'atk','c-def':'def','c-luk':'luk','c-mp':'mp','c-lv':'lv','c-gold':'gold'};

// ---- styles ----
const css=document.createElement('style');css.textContent=`
[data-tip]{cursor:help}
.tipbox{position:fixed;z-index:60;max-width:min(300px,calc(100vw - 24px));background:#0d1619;color:var(--ink,#f1e7d0);border:2px solid var(--gold2,#b97a22);border-radius:4px;padding:8px 10px;font:300 13px/1.5 var(--fT,system-ui);box-shadow:0 4px 0 #0008;pointer-events:none}
.tipbox b{display:block;color:var(--gold,#f4bb4a);font-weight:500;margin-bottom:2px}
.helpbtn{position:fixed;right:max(12px,env(safe-area-inset-right,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:50;background:var(--gold,#f4bb4a);color:#1a1206;border:2px solid #7a5214;border-radius:20px;padding:6px 12px;font:500 14px var(--fT,system-ui);box-shadow:0 3px 0 #0008}
.helpdlg{border:2px solid var(--line2,#3d5a66);background:var(--panel,#15232a);color:var(--ink,#f1e7d0);border-radius:6px;padding:0;width:min(560px,calc(100vw - 24px));max-height:80vh}
.helpdlg::backdrop{background:#000a}
.helpdlg .hd{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--line,#2c434d);position:sticky;top:0;background:var(--panel,#15232a)}
.helpdlg .hd b{color:var(--gold,#f4bb4a);font-weight:500;font-size:17px}
.helpdlg .bd{padding:6px 14px 14px;overflow:auto;max-height:calc(80vh - 52px);font-size:13.5px}
.helpdlg h4{margin:12px 0 4px;color:var(--gold,#f4bb4a);font-weight:500;font-size:14px}
.helpdlg dl{margin:0}.helpdlg dt{font-weight:500;margin-top:6px}.helpdlg dd{margin:0 0 4px;color:var(--muted,#a3b5ad)}
.helpdlg .x{background:var(--panel2,#1c2e36);border:1px solid var(--line2,#3d5a66);border-radius:3px;padding:2px 10px;color:var(--ink,#f1e7d0)}`;
document.head.appendChild(css);

// ---- tagging ----
const SEL='.chip,.rk,.cls,.pas,.odds,.kk,.ch .s span,.inv span,.mem .d,.party h2,.vs .side,.fatebox,.omenbox .ok,.formbar .btn,.kv dt,.judge,.cdl,.legend span,.track,.tag';
function tag(root){
 for(const id in FIXED){const el=document.getElementById(id);if(el)el.dataset.tip=FIXED[id];}
 const tr=document.getElementById('track');if(tr)tr.dataset.tip='boss';
 root.querySelectorAll(SEL).forEach(el=>{if(el.dataset.tip)return;const s=el.textContent;for(const [w,k] of KW)if(s.includes(w)){el.dataset.tip=k;break;}});}
let pend=false;const mo=new MutationObserver(()=>{if(pend)return;pend=true;requestAnimationFrame(()=>{pend=false;tag(document);});});
function boot(){tag(document);mo.observe(document.body,{childList:true,subtree:true});addHelp();}

// ---- tooltip ----
const box=document.createElement('div');box.className='tipbox';box.hidden=true;box.setAttribute('role','tooltip');
let cur=null;
function show(el){const t=BY[el.dataset.tip];if(!t)return;cur=el;box.innerHTML=`<b></b><span></span>`;box.firstChild.textContent=t.n;box.lastChild.textContent=t.d;box.hidden=false;
 const r=el.getBoundingClientRect(),bw=box.offsetWidth,bh=box.offsetHeight;let x=Math.min(Math.max(8,r.left+r.width/2-bw/2),innerWidth-bw-8),y=r.bottom+8;if(y+bh>innerHeight-8)y=Math.max(8,r.top-bh-8);
 box.style.left=x+'px';box.style.top=y+'px';}
function hide(){box.hidden=true;cur=null;}
const tipOf=t=>t&&t.closest&&t.closest('[data-tip]');
document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const el=tipOf(e.target);if(el&&el!==cur)show(el);else if(!el&&cur)hide();});
document.addEventListener('focusin',e=>{const el=tipOf(e.target);if(el)show(el);});
document.addEventListener('focusout',hide);
// touch: tap a tagged element (not inside a button) to toggle its tip
document.addEventListener('pointerup',e=>{if(e.pointerType!=='touch')return;const el=tipOf(e.target);
 if(!el||e.target.closest('button')){hide();return;}if(cur===el)hide();else show(el);});
addEventListener('scroll',hide,{passive:true});document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});

// ---- glossary dialog ----
function addHelp(){document.body.appendChild(box);
 const b=document.createElement('button');b.type='button';b.className='helpbtn';b.textContent='❓ วิธีเล่น';b.setAttribute('aria-haspopup','dialog');
 const d=document.createElement('dialog');d.className='helpdlg';d.setAttribute('aria-label','วิธีเล่น');
 const groups=[...new Set(T.map(t=>t.g))];
 d.innerHTML=`<div class="hd"><b>วิธีเล่นหอคอยโชคชะตา</b><button type="button" class="x">ปิด ✕</button></div><div class="bd">
 <p style="margin:6px 0">${AUTO?'โหมดนี้ชีวิตเดินขึ้นหอไปเอง คุณตัดสินใจเฉพาะจุดเปลี่ยนชะตา':'ไต่หอคอย 100 ชั้น ทุกชั้นมีเหตุการณ์ให้เลือก เลือกแล้วมีโอกาสได้ดีหรือร้ายตาม % ที่บอกไว้'} ชี้หรือแตะที่คำต่างๆ บนจอเพื่อดูคำอธิบาย</p>
 ${groups.map(g=>`<h4>${g}</h4><dl>${T.filter(t=>t.g===g).map(t=>`<dt>${t.n}</dt><dd>${t.d}</dd>`).join('')}</dl>`).join('')}
 ${AUTO?'':'<h4>ปุ่มลัด</h4><dl><dd>1–9 เลือก · Enter ดำเนินต่อ · F ฟาร์ม · P ดื่มยา</dd></dl>'}</div>`;
 document.body.append(b,d);
 b.onclick=()=>{hide();try{d.showModal();}catch(e){d.setAttribute('open','');}};
 d.querySelector('.x').onclick=()=>d.close?d.close():d.removeAttribute('open');
 d.addEventListener('click',e=>{if(e.target===d)d.close();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.TIPS={T,tag};
})();
