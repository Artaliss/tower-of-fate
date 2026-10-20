// Tower of Fate — TIPS: hover/tap tooltips + "วิธีเล่น" glossary for the (auto-flow) game.
(function(){
'use strict';
// k: id, n: title, d: text, kw: keywords that auto-attach this tip, g: glossary group
const T=[
{k:'hp',g:'ค่าสถานะ',n:'HP พลังชีวิต',kw:['HP สูงสุด','HP'],d:'HP ยิ่งต่ำ ยิ่งเสี่ยงตายในแต่ละชั้น ถ้า HP หมดนอกห้องบอส จะไม่ตายทันที แต่ได้แผลเป็นติดตัว แพ้บอสคือตายจริง เกมดื่มยาให้เองเมื่อ HP ต่ำกว่า 45% ขึ้นชั้นใหม่และเลเวลอัปจะฟื้น HP'},
{k:'atk',g:'ค่าสถานะ',n:'ATK พลังโจมตี',kw:['ATK'],d:'แรงตีต่อครั้ง เพิ่มได้จากเลเวล ของที่ซื้อหลังบอส อีเวนต์ และจิ้งจอกไฟ (+12%)'},
{k:'def',g:'ค่าสถานะ',n:'DEF พลังป้องกัน',kw:['DEF'],d:'ลดความเสียหายที่โดน ยิ่งสูงยิ่งทนบอส เพิ่มได้จากเลเวล ของที่ซื้อหลังบอส และหมาป่าน้อย (+12%)'},
{k:'luk',g:'ค่าสถานะ',n:'LUK โชค',kw:['LUK'],d:'ช่วยเกือบทุกอย่าง: คริติคอล หลบการโจมตี ลดโอกาสเจอผลร้าย ลดความเสี่ยงตายรายชั้น และทำให้เห็นคำใบ้หีบ mimic ชาวไร่ได้โชคแรงกว่าคนอื่น 1.5 เท่า'},
{k:'mp',g:'ค่าสถานะ',n:'MP มานา',kw:['MP สูงสุด','MP'],d:'ต้นการต่อสู้ ถ้ามี 10 MP จะใช้สกิลเปิดฉากเอง (นักบวชใช้รักษาตัวเอง) ขึ้นชั้นใหม่ฟื้น MP 20%'},
{k:'lv',g:'ค่าสถานะ',n:'เลเวล / EXP',kw:['EXP','Lv.'],d:'ได้ EXP จากการสู้และอีเวนต์ เลเวลอัปแล้วค่าสถานะขึ้นตามอาชีพและแรงค์'},
{k:'gold',g:'ค่าสถานะ',n:'เหรียญทอง',kw:['ทอง'],d:'ใช้จ้างทหารรับจ้าง ซื้อม้วนวาร์ป และหลังชนะบอสเกมจะซื้อของในศาลพักใจให้เอง โจรได้ทองเพิ่ม 30%'},
{k:'rank',g:'ตัวละคร',n:'แรงค์ F ถึง SS',kw:['RANK','แรงค์'],d:'สุ่มตอนเกิด แรงค์สูงค่าสถานะพื้นฐานสูงกว่า (F ×0.74 ถึง SS ×1.65) และอายุในหอยืนกว่านิดหน่อย'},
{k:'cls',g:'ตัวละคร',n:'อาชีพและสกิลติดตัว',kw:['สกิลติดตัว'],d:'แต่ละอาชีพมีสกิลติดตัวต่างกัน เช่น นักรบรับดาเมจน้อยลง จอมเวทเปิดฉากแรง นักบวชฟื้น HP ทุกชั้น อัศวินมังกรหายากที่สุด'},
{k:'form',g:'ตัวละคร',n:'ร่าง: คน หรือ สไลม์',kw:['ร่าง:'],d:'เลือกได้ก่อนเข้าหอ เปลี่ยนแค่หน้าตา ค่าสถานะเท่ากัน สไลม์สุ่มสีและหน้าให้ทุกตัว'},
{k:'odds',g:'ตัวละคร',n:'1 ใน N',kw:['1 ใน'],d:'โอกาสที่จะเกิดมาเป็นแรงค์และอาชีพนี้พร้อมกัน ยิ่งเลขมากยิ่งหายาก'},
{k:'trait',g:'ตัวละคร',n:'นิสัย',kw:['นิสัย'],d:'สุ่มตอนเกิด: กล้าบ้าบิ่น ระมัดระวัง โลภ หรือใจบุญ ถ้าคุณไม่เลือกทันเวลา ตัวละครจะเลือกตามนิสัยนี้'},
{k:'karma',g:'กรรม',n:'กรรมดี ✦ / กรรมชั่ว ✧',kw:['กรรมดี','กรรมชั่ว','บัญชีกรรม','กรรม'],d:'ตัวเลือกที่มีป้าย ✦ ให้กรรมดี ป้าย ✧ ให้กรรมชั่ว ระหว่างเล่นจะไม่บอกแต้มกรรม กรรมชั่วเยอะทำให้เสี่ยงตายรายชั้นสูงขึ้น เพื่อนร่วมทีมอาจทรยศขโมยทองแล้วหนี และอาจมีลางร้ายเตือน ตอนตายจะเปิดบัญชีกรรมทีละบรรทัด'},
{k:'ledger',g:'กรรม',n:'ส่งผล / ปะทุ',kw:['ยังไม่ส่งผล','ยังไม่ปะทุ','ส่งผล','ปะทุ'],d:'ตอนเปิดบัญชีกรรม กรรมดีแต่ละเรื่องสุ่มว่าส่งผลหรือไม่ กรรมชั่วสุ่มว่าปะทุหรือไม่ ผลจะบวกหรือลบคะแนนชีวิต'},
{k:'score',g:'กรรม',n:'คะแนนชีวิต / ฉายา',kw:['คะแนนชีวิต','ฉายา'],d:'สรุปชีวิตรอบนี้จากชั้นที่ไปถึง สิ่งที่ทำ และบัญชีกรรม แล้วตั้งฉายาให้ บางฉายาหายากมาก'},
{k:'pet',g:'เพื่อนร่วมทาง',n:'สัตว์เลี้ยง (สูงสุด 2)',kw:['สัตว์เลี้ยง'],d:'สไลม์: ฟื้น HP +4% ทุกชั้น · จิ้งจอกไฟ: ATK +12% · นกฮูก: LUK +6 · หมาป่าน้อย: DEF +12% และช่วยกัด มีเพื่อนร่วมทางช่วยลดความเสี่ยงตายรายชั้นด้วย'},
{k:'comp',g:'เพื่อนร่วมทาง',n:'ทหารรับจ้าง (สูงสุด 2)',kw:['ทหารรับจ้าง','เพื่อนร่วมทีม','จ้าง'],d:'ช่วยตีทุกรอบการต่อสู้ และเก่งขึ้นเล็กน้อยทุกชั้น แต่ละคนมีนิสัยและเงื่อนไขของตัวเอง เช่น ค่าจ้างถูกแต่ขอแบ่งของ'},
{k:'pot',g:'ไอเทม',n:'ยาฟื้นพลัง',kw:['ยาฟื้นพลัง'],d:'ฟื้น HP 45% เกมดื่มให้เองเมื่อ HP ต่ำ ได้จากอีเวนต์และศาลพักใจ'},
{k:'warp',g:'ไอเทม',n:'ม้วนวาร์ป',kw:['ม้วนวาร์ป','วาร์ป'],d:'ใช้ข้ามบอสได้ 1 ตัว แต่ไม่ได้รางวัล ชั้น 100 ใช้ไม่ได้'},
{k:'boss',g:'หอคอย',n:'ชั้นบอส (ทุก 10 ชั้น)',kw:['ชั้นบอส','บอส'],d:'ขีดแดงบนหลอดคือชั้นบอส แพ้บอสคือตาย ถ้าโอกาสชนะต่ำ ถอยไปตั้งหลักหรือใช้ม้วนวาร์ป ชนะแล้วได้ทองก้อนโตและเข้าศาลพักใจ'},
{k:'shop',g:'หอคอย',n:'ศาลพักใจ',kw:['ศาลพักใจ'],d:'แวะหลังชนะบอส ฟื้น HP ฟรี 20% แล้วเกมซื้อของที่จำเป็นให้เอง ดูได้ในบันทึกว่าซื้ออะไร'},
{k:'win',g:'หอคอย',n:'โอกาสชนะ ~%',kw:['โอกาสชนะ'],d:'เกมลองจำลองการต่อสู้นี้หลายสิบรอบแล้วบอกว่าชนะกี่ % เป็นค่าประมาณ ไม่ใช่ผลจริง'},
{k:'fate',g:'ชะตา',n:'ดวงชะตา / ความเสี่ยงรายชั้น',kw:['ดวงชะตา','โอกาสตาย','มั่นคง','สั่นไหว','อันตราย','ใกล้ฆาต'],d:'ทุกชั้นมีโอกาสตาย ยิ่งขึ้นสูงยิ่งเสี่ยง HP ต่ำ แผลเก่า คำสาป กรรมชั่ว และการเดินคนเดียวทำให้เสี่ยงขึ้น โชค สัตว์เลี้ยง และเพื่อนช่วยให้เสี่ยงน้อยลง คำในแถบบอกระดับเสี่ยงตอนนี้ ตั้งแต่มั่นคงจนถึงใกล้ฆาต'},
{k:'scar',g:'ชะตา',n:'แผลเป็น',kw:['แผลเก่า','แผลเป็น'],d:'ได้เมื่อ HP หมดนอกห้องบอส ไม่ตายทันที แต่แผลแต่ละแห่งทำให้เสี่ยงตายรายชั้นสูงขึ้นไปตลอดชีวิต'},
{k:'omenx',g:'ชะตา',n:'ลางร้าย',kw:['ลางร้าย'],d:'ขึ้นเมื่อความเสี่ยงตายพุ่งสูง ให้เลือกทางแก้ บางทางลดความเสี่ยงชั่วคราว บางทางถาวรแต่ต้องแลกบางอย่าง'},
{k:'omen',g:'ชะตา',n:'พร / คำสาปประจำชาติ',kw:['พรปนคำสาป','ประจำชาตินี้','คำสาป'],d:'สุ่มตอนเกิด 1 อย่าง ส่งผลทั้งรอบ เช่น ทองตกง่าย สัตว์เลี้ยงมาบ่อย หรือ mimic ชุกชุม'},
{k:'key',g:'ชะตา',n:'จุดเปลี่ยนชะตา',kw:['จุดเปลี่ยน'],d:'เกมหยุดให้คุณตัดสินใจเฉพาะเรื่องสำคัญ เช่น ทหารรับจ้าง สัตว์เลี้ยง หีบสมบัติ หรือบอส มีเวลา 15 วินาที ถ้าไม่เลือก ตัวละครเลือกเองตามนิสัย'},
{k:'auto',g:'ชะตา',n:'ตอบแบบเดิม / ทางนี้ชัดอยู่แล้ว',kw:['ตอบแบบเดิม','ทางนี้ชัดอยู่แล้ว'],d:'เจอเรื่องเดิมที่เคยตอบแล้ว ตัวละครจะตอบแบบเดิมเลย ส่วนเรื่องที่มีทางเลือกเดียวหรือคำตอบชัดอยู่แล้ว เกมจะไม่หยุดถาม'},
{k:'rare',g:'ชะตา',n:'◆ หายาก / ★ ตำนาน',kw:['ระดับตำนาน','หายาก'],d:'จุดเปลี่ยนที่นานๆ จะเจอ รางวัลดีกว่าปกติ แต่มักมีความเสี่ยงติดมาด้วย'},
{k:'mimic',g:'ชะตา',n:'หีบสมบัติ / mimic',kw:['mimic','กล่องนี้ดูแปลกๆ','หีบ'],d:'หีบบางใบเป็นปีศาจปลอมตัว เขี่ยดูก่อนปลอดภัยกว่า ถ้าโชคดีจะมีคำใบ้ว่ากล่องดูแปลกๆ ชนะ mimic ได้ของดี'},
{k:'speed',g:'ชะตา',n:'ความเร็ว / หยุด',kw:['ความเร็ว','ชั้นถัดไปใน'],d:'1x = ชั้นละ 5 วินาที เร่งได้ถึง 16x กด Space เพื่อหยุด/เล่นต่อ เวลาตัดสินใจ 15 วินาทีไม่เร่งตามความเร็ว เกมเซฟไว้ตลอด รีเฟรชแล้วเล่นต่อได้'},
{k:'stance',g:'ท่าที',n:'ท่าที: บุก / ระวังตัว / หาของ / ช่วยเหลือ',kw:['ท่าที'],d:'กดเปลี่ยนได้ตลอดใต้แถบความเร็ว ผลมีไม่มากแต่สะสมทุกชั้น บุก: ATK +10% DEF −5% เสี่ยงตายขึ้นนิดหน่อย · ระวังตัว: DEF +10% ATK −5% เสี่ยงตายลดลงนิดหน่อย · หาของ: ทอง +15% เจอหีบและวงพนันบ่อยขึ้น · ช่วยเหลือ: เจอคนเจ็บและสัตว์หลงทางบ่อยขึ้น บางชั้นได้ทำบุญ เกมจดท่าทีของทุกชั้นไว้ แล้วใช้เขียนคำไว้อาลัยตอนจบ'},
{k:'gen',g:'สายตระกูล',n:'รุ่นที่',kw:['รุ่นที่'],d:'ลำดับรุ่นในสายตระกูลของคุณ ฮีโร่คนแรกเป็นรุ่นที่ 1 ถ้าเลือกให้ลูกศิษย์สืบทอด รุ่นถัดไปจะนับต่อ'},
{k:'lineage',g:'สายตระกูล',n:'สืบทอดโดยลูกศิษย์',kw:['สืบทอด','ลูกศิษย์','ศิษย์ของ','มรดกจากอาจารย์','สายตระกูล'],d:'พอตายหรือพิชิตหอแล้ว เลือกให้ลูกศิษย์เดินต่อได้ ศิษย์มาจากหมู่บ้านเดียวกัน ได้ทอง 30% ของที่อาจารย์ทิ้งไว้ (ไม่เกิน 600) ได้สัตว์เลี้ยงตัวแรก และรับกรรมของอาจารย์ไปราวหนึ่งในสี่ ถ้ากรรมดีพอ LUK +2 และเสี่ยงตายน้อยลงเล็กน้อย ถ้ากรรมชั่วก็เสี่ยงขึ้นเล็กน้อย'},
{k:'reborn',g:'สายตระกูล',n:'เกิดใหม่',kw:['เกิดใหม่','กลับชาติมาเกิด'],d:'เริ่มสายตระกูลใหม่ ไม่ได้ของจากชาติก่อนเลย แต่กรรมที่ซ่อนไว้จะเอียงดวงเกิดนิดหน่อย กรรมทุก 10 แต้มขยับโอกาสได้แรงค์ C ขึ้นไปราว 2%'},
{k:'cohort',g:'สายตระกูล',n:'เพื่อนรุ่นเดียวกัน',kw:['เพื่อนรุ่นเดียวกัน','เข้าหอมาพร้อมคุณ'],d:'นักผจญภัยอีก 3–4 คนที่เข้าหอพร้อมคุณ เกมจำลองชีวิตของพวกเขาด้วยตารางชะตาเดียวกัน พอคุณเดินเลยชั้นที่ใครล้มลง จะมีข่าวขึ้นในบันทึก หน้าจบจะเทียบว่าคุณไปได้ไกลกว่ากี่คน'},
{k:'mile',g:'ชะตา',n:'นักผจญภัยรุ่นเดียวกันเหลือรอด',kw:['เหลือรอดราว','ยังอยู่ครบ'],d:'ที่ชั้น 1, 5, 15, 30, 50, 65, 80, 90 และ 100 เกมบอกว่านักผจญภัยทั่วไปยังรอดอยู่กี่ % คิดจากตารางชะตาเดียวกับที่ใช้ทอยคุณ (ไม่นับโบนัสหรือโทษของใคร)'},
{k:'cert',g:'สายตระกูล',n:'ใบมรณบัตร',kw:['ใบมรณบัตร','ใบประกาศผู้พิชิตหอ','พบบ่อยแค่ไหน'],d:'สรุปการตาย: ชั้น สาเหตุ สาเหตุนี้พบบ่อยแค่ไหนในช่วงชั้นนั้น (เกมจำลองชีวิตไว้หลายร้อยชีวิตตอนว่าง) อายุในหอเทียบค่าเฉลี่ย และเทียบกับเพื่อนรุ่นเดียวกัน'},
{k:'combo',g:'ตัวละคร',n:'ฮีโร่แบบคุณ: 1 ใน N',kw:['ฮีโร่แบบคุณ'],d:'โอกาสได้แรงค์ อาชีพ และหน้าตาแบบนี้พร้อมกัน หน้าตานับสีหรือผิว ทรงตา และปาก สไลม์สีทองหายากที่สุด'},
{k:'look',g:'ตัวละคร',n:'หน้าตา',kw:['หน้าตา'],d:'สุ่มตอนเกิด สไลม์มีสีหลักไม่เท่ากัน สีเขียวกับสีฟ้าพบบ่อย สีทองหายากสุด คนมีโทนผิว 6 แบบ ทั้งสองร่างมีทรงตา 8 แบบ ปาก 7 แบบ ไม่มีผลกับค่าสถานะ'},
{k:'income',g:'ไอเทม',n:'ชั้นของรายได้',kw:['ชั้นของรายได้'],d:'ของที่ทองยังไม่พอซื้อ เกมบอกว่าต้องเก็บทองอีกราวกี่ชั้น คิดจากทองที่คุณหาได้เฉลี่ยต่อชั้นในรอบนี้'},
{k:'skip',g:'ชะตา',n:'ช่วงสงบ',kw:['ช่วงสงบ','ชั้นรวด'],d:'บางช่วงไม่มีอะไรน่าสนใจ เกมข้ามไปหลายชั้นรวด แล้วแสดงกราฟทองกับ HP ที่ได้หรือเสียในแต่ละชั้น แท่งแดงคือติดลบ'}];
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
const SEL='.chip,.rk,.cls,.pas,.odds,.kk,.ch .s span,.inv span,.mem .d,.party h2,.vs .side,.fatebox,.omenbox .ok,.formbar .btn,.kv dt,.judge,.cdl,.legend span,.track,.tag,.ledger li,.ledger div,.lgsum,.rar,.keytag,.trait,.cstats div,.msgs li';
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
 <p style="margin:6px 0">ชีวิตเดินขึ้นหอไปเอง คุณตัดสินใจเฉพาะจุดเปลี่ยนชะตา ชี้หรือแตะที่คำต่างๆ บนจอเพื่อดูคำอธิบาย</p>
 ${groups.map(g=>`<h4>${g}</h4><dl>${T.filter(t=>t.g===g).map(t=>`<dt>${t.n}</dt><dd>${t.d}</dd>`).join('')}</dl>`).join('')}
 <h4>ปุ่มลัด</h4><dl><dd>1–4 เลือก · Space หยุด/เล่นต่อ · Enter ดำเนินต่อ</dd></dl></div>`;
 document.body.append(b,d);
 b.onclick=()=>{hide();try{d.showModal();}catch(e){d.setAttribute('open','');}};
 d.querySelector('.x').onclick=()=>d.close?d.close():d.removeAttribute('open');
 d.addEventListener('click',e=>{if(e.target===d)d.close();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.TIPS={T,tag};
})();
