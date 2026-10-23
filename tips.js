// Tower of Fate — TIPS: hover/tap tooltips, tabbed "วิธีเล่น" window, birth-screen intro strip, tof:pause bridge.
(function(){
'use strict';
// k: id, n: title, d: text, kw: keywords that auto-attach this tip, g: glossary group
// hid: tooltip only (kept out of the help glossary so the secret floor stays a surprise)
const T=[
{k:'hp',g:'ค่าสถานะ',n:'HP พลังชีวิต',kw:['HP สูงสุด','HP'],d:'HP ยิ่งต่ำ ยิ่งเสี่ยงตายในแต่ละชั้น ถ้า HP หมดนอกห้องบอส จะไม่ตายทันที แต่ได้แผลเป็นติดตัว แพ้บอสคือตายจริง เกมดื่มยาให้เองเมื่อ HP ต่ำกว่า 45% ขึ้นชั้นใหม่และเลเวลอัปจะฟื้น HP'},
{k:'atk',g:'ค่าสถานะ',n:'ATK พลังโจมตี',kw:['ATK'],d:'แรงตีต่อครั้ง เพิ่มได้จากเลเวล ของที่ซื้อหลังบอส อีเวนต์ และจิ้งจอกไฟ (+12%)'},
{k:'def',g:'ค่าสถานะ',n:'DEF พลังป้องกัน',kw:['DEF'],d:'ลดความเสียหายที่โดน ยิ่งสูงยิ่งทนบอส เพิ่มได้จากเลเวล ของที่ซื้อหลังบอส และหมาป่าน้อย (+12%)'},
{k:'luk',g:'ค่าสถานะ',n:'LUK โชค',kw:['LUK'],d:'ช่วยเกือบทุกอย่าง: คริติคอล หลบการโจมตี ลดโอกาสเจอผลร้าย ลดความเสี่ยงตายรายชั้น และทำให้เห็นคำใบ้หีบ mimic ชาวไร่ได้โชคแรงกว่าคนอื่น 1.5 เท่า'},
{k:'mp',g:'ค่าสถานะ',n:'MP มานา',kw:['MP สูงสุด','MP'],d:'ต้นการต่อสู้ ถ้ามี 10 MP จะใช้สกิลเปิดฉากเอง (นักบวชใช้รักษาตัวเอง) ขึ้นชั้นใหม่ฟื้น MP 20%'},
{k:'lv',g:'ค่าสถานะ',n:'เลเวล / EXP',kw:['EXP','Lv.'],d:'ได้ EXP จากการสู้และอีเวนต์ เลเวลอัปแล้วค่าสถานะขึ้นตามอาชีพและแรงค์'},
{k:'gold',g:'ค่าสถานะ',n:'เหรียญทอง',kw:['ทอง'],d:'ใช้จ้างทหารรับจ้าง ซื้อม้วนวาร์ป และหลังชนะบอสเกมจะซื้อของในศาลพักใจให้เอง โจรได้ทองเพิ่ม 30%'},
{k:'rank',g:'ตัวละคร',n:'แรงค์ F ถึง SS',kw:['RANK','แรงค์'],d:'สุ่มตอนเกิด แรงค์สูงค่าสถานะพื้นฐานสูงกว่า (F ×0.74 ถึง SS ×1.65) และอายุในหอยืนกว่านิดหน่อย'},
{k:'path',g:'ตัวละคร',n:'ทางของอาชีพ',kw:['ทางของอาชีพ'],d:'ทำตัวให้เข้ากับอาชีพแล้วจะได้แต้มทาง เช่น โจรขโมยหรือแอบย่อง นักบวชช่วยคนหรือทำบุญ นักรบสู้ซึ่งๆ หน้า ตัวเลือกที่ให้แต้มมีป้าย ✦ ตามด้วยชื่อทาง ครบ 20 กับ 50 แต้มจะได้ขั้นใหม่ ส่วนขั้นสุดท้ายต้องชิงเอา พอครบ 80 แต้มจะเจอการชิงตำแหน่ง ลงแข่งตรงๆ จ่ายทอง ขอคนใหญ่คนโตหนุน (แล้วเขาจะมาทวงบุญคุณทีหลัง) หรือโกงก็ได้ แพ้แล้วได้ลองอีกครั้งตอนครบ 90 แต่ละขั้นมีโบนัสทั้งระหว่างทางและตอนสู้ เลือกนอกทางไม่เสียแต้ม ยกเว้นนักบวชที่ทำชั่ว บางเหตุการณ์ยังมีตัวเลือกที่อาชีพเดียวเห็น (ป้าย ✦ เฉพาะอาชีพนั้น)'},
{k:'cls',g:'ตัวละคร',n:'อาชีพและสกิลติดตัว',kw:['สกิลติดตัว'],d:'แต่ละอาชีพมีสกิลติดตัวต่างกัน เช่น นักรบรับดาเมจน้อยลง จอมเวทเปิดฉากแรง นักบวชฟื้น HP ทุกชั้น อัศวินมังกรหายากที่สุดในบรรดาอาชีพที่สุ่มได้ทั่วไป ส่วนอาชีพลับอีกหนึ่งอาชีพจะโผล่มาให้บางตระกูลเท่านั้น'},
{k:'form',g:'ตัวละคร',n:'ร่าง: คน หรือ สไลม์',kw:['ร่าง:'],d:'เลือกได้ก่อนเข้าหอ เปลี่ยนแค่หน้าตา ค่าสถานะเท่ากัน สไลม์สุ่มสีและหน้าให้ทุกตัว'},
{k:'sp',g:'ตัวละคร',n:'บัพพิเศษ',kw:['บัพพิเศษ'],d:'ทุกอาชีพมีบัพพิเศษติดตัวมาอีกหนึ่งอย่าง นอกจากสกิลติดตัว นักรบตีแรงขึ้นตอนเลือดเหลือน้อย จอมเวทสกิลแรงขึ้น นักธนูคริติคอลง่ายขึ้น นักบวชฮีลแรงขึ้น โจรแอบอ้อมบอสเก่งขึ้น ชาวไร่ได้บัพจากสัตว์เลี้ยงมากขึ้น อัศวินมังกร ATK กับ DEF สูงขึ้น ส่วนอาชีพลับก็มีของตัวเอง ดูรายละเอียดได้บนหน้าเกิด'},
{k:'odds',g:'ตัวละคร',n:'1 ใน N',kw:['1 ใน'],d:'โอกาสที่จะเกิดมาเป็นแรงค์และอาชีพนี้พร้อมกัน ยิ่งเลขมากยิ่งหายาก'},
{k:'trait',g:'ตัวละคร',n:'นิสัย',kw:['นิสัย'],d:'สุ่มตอนเกิด: กล้าบ้าบิ่น ระมัดระวัง โลภ หรือใจบุญ ถ้าคุณไม่เลือกทันเวลา ตัวละครจะเลือกตามนิสัยนี้'},
{k:'karma',g:'กรรม',n:'กรรมดี ✦ / กรรมชั่ว ✧',kw:['กรรมดี','กรรมชั่ว','บัญชีกรรม','กรรม'],d:'ตัวเลือกที่มีป้าย ✦ ให้กรรมดี ป้าย ✧ ให้กรรมชั่ว ระหว่างเล่นจะไม่บอกแต้มกรรม กรรมดีช่วยให้เสี่ยงตายรายชั้นน้อยลง กรรมชั่วเยอะทำให้เสี่ยงสูงขึ้น ทหารรับจ้างอาจทรยศขโมยทองแล้วหนี และอาจมีลางร้ายเตือน ตอนตายจะเปิดบัญชีกรรมทีละบรรทัด แล้วสรุปเป็นคะแนนชีวิตกับฉายา'},
{k:'ledger',g:'กรรม',n:'ส่งผล / ปะทุ',kw:['ยังไม่ส่งผล','ยังไม่ปะทุ','ส่งผล','ปะทุ'],d:'ตอนเปิดบัญชีกรรม กรรมดีแต่ละเรื่องสุ่มว่าส่งผลหรือไม่ กรรมชั่วสุ่มว่าปะทุหรือไม่ ผลจะบวกหรือลบคะแนนชีวิต'},
{k:'score',g:'กรรม',n:'คะแนนชีวิต / ฉายา',kw:['คะแนนชีวิต','ฉายา'],d:'สรุปชีวิตรอบนี้จากชั้นที่ไปถึง สิ่งที่ทำ และบัญชีกรรม แล้วตั้งฉายาให้ บางฉายาหายากมาก'},
{k:'pet',g:'เพื่อนร่วมทาง',n:'สัตว์เลี้ยง (สูงสุด 2)',kw:['สัตว์เลี้ยง'],d:'สไลม์: ฟื้น HP +4% ทุกชั้น · จิ้งจอกไฟ: ATK +12% · นกฮูก: LUK +6 · หมาป่าน้อย: DEF +12% และช่วยกัด มีเพื่อนร่วมทางช่วยลดความเสี่ยงตายรายชั้นด้วย'},
{k:'comp',g:'เพื่อนร่วมทาง',n:'ทหารรับจ้าง (สูงสุด 2)',kw:['ทหารรับจ้าง','เพื่อนร่วมทีม','จ้าง'],d:'ช่วยตีทุกรอบการต่อสู้ และเก่งขึ้นเล็กน้อยทุกชั้น แต่ละคนมีนิสัยและเงื่อนไขของตัวเอง เช่น ค่าจ้างถูกแต่ขอแบ่งของ'},
{k:'pot',g:'ไอเทม',n:'ยาฟื้นพลัง',kw:['ยาฟื้นพลัง'],d:'ฟื้น HP 45% เกมดื่มให้เองเมื่อ HP ต่ำ ได้จากอีเวนต์และศาลพักใจ'},
{k:'warp',g:'ไอเทม',n:'ม้วนวาร์ป',kw:['ม้วนวาร์ป','วาร์ป'],d:'ใช้ข้ามบอสได้ 1 ตัว แต่ไม่ได้รางวัล ชั้น 100 ใช้ไม่ได้'},
{k:'boss',g:'หอคอย',n:'ชั้นบอส (ทุก 10 ชั้น)',kw:['ชั้นบอส','บอส'],d:'ขีดแดงบนหลอดคือชั้นบอส แพ้บอสคือตาย ถ้าโอกาสชนะต่ำ ใช้ม้วนวาร์ปหรือหาทางลัดอ้อมไปก็ได้ แต่ทางลัดแลกด้วย HP กับชะตา ชนะแล้วได้ทองก้อนโตและเข้าศาลพักใจ บอสที่เก่งกว่าคุณมากจะประมาทจนออมมือ เลยยังมีโอกาสชนะเสมอ'},
{k:'shop',g:'หอคอย',n:'ศาลพักใจ',kw:['ศาลพักใจ'],d:'แวะหลังชนะบอส ฟื้น HP ฟรี 20% แล้วเกมซื้อของที่จำเป็นให้เอง ดูได้ในบันทึกว่าซื้ออะไร'},
{k:'win',g:'หอคอย',n:'โอกาสชนะ ~%',kw:['โอกาสชนะ'],d:'เกมลองจำลองการต่อสู้นี้หลายสิบรอบแล้วบอกว่าชนะกี่ % เป็นค่าประมาณ ไม่ใช่ผลจริง'},
{k:'fate',g:'ชะตา',n:'ดวงชะตา / ความเสี่ยงรายชั้น',kw:['ดวงชะตา','โอกาสตาย','มั่นคง','สั่นไหว','อันตราย','ใกล้ฆาต'],d:'ทุกชั้นมีโอกาสตาย ยิ่งขึ้นสูงยิ่งเสี่ยง HP ต่ำ แผลเก่า คำสาป กรรมชั่ว และการเดินคนเดียวทำให้เสี่ยงขึ้น โชค สัตว์เลี้ยง และเพื่อนช่วยให้เสี่ยงน้อยลง คำในช่อง ☽ บอกระดับเสี่ยงตอนนี้ ตั้งแต่มั่นคงจนถึงใกล้ฆาต ตัวเลือกที่ทำให้ชะตายืดออกจะลดความเสี่ยงของทุกชั้นต่อจากนี้ ชะตาสั้นลงก็ตรงข้าม'},
{k:'scar',g:'ชะตา',n:'แผลเป็น',kw:['แผลเก่า','แผลเป็น'],d:'ได้เมื่อ HP หมดนอกห้องบอส ไม่ตายทันที แต่แผลแต่ละแห่งทำให้เสี่ยงตายรายชั้นสูงขึ้นไปตลอดชีวิต'},
{k:'omenx',g:'ชะตา',n:'ลางร้าย',kw:['ลางร้าย'],d:'ขึ้นเมื่อความเสี่ยงตายพุ่งสูง ให้เลือกทางแก้ บางทางลดความเสี่ยงชั่วคราว บางทางถาวรแต่ต้องแลกบางอย่าง'},
{k:'omen',g:'ชะตา',n:'พร / คำสาปประจำชาติ',kw:['พรปนคำสาป','ประจำชาตินี้','คำสาป'],d:'สุ่มตอนเกิด 1 อย่าง ส่งผลทั้งรอบ เช่น ทองตกง่าย สัตว์เลี้ยงมาบ่อย หรือ mimic ชุกชุม'},
{k:'key',g:'ชะตา',n:'จุดเปลี่ยนชะตา',kw:['จุดเปลี่ยน'],d:'เกมหยุดให้คุณตัดสินใจเฉพาะเรื่องสำคัญ เช่น ทหารรับจ้าง สัตว์เลี้ยง หีบสมบัติ หรือบอส ปกติคิดได้ไม่จำกัดเวลา ถ้าเปิดนับถอยหลัง 30 วินาทีที่ปุ่ม ⏱ แล้วไม่เลือกทัน ตัวละครจะเลือกเองตามนิสัย'},
{k:'auto',g:'ชะตา',n:'ตอบแบบเดิม / ทางนี้ชัดอยู่แล้ว',kw:['ตอบแบบเดิม','ทางนี้ชัดอยู่แล้ว'],d:'เจอเรื่องเดิมที่เคยตอบแล้ว ตัวละครจะตอบแบบเดิมเลย ส่วนเรื่องที่มีทางเลือกเดียวหรือคำตอบชัดอยู่แล้ว เกมจะไม่หยุดถาม'},
{k:'rare',g:'ชะตา',n:'◆ หายาก / ★ ตำนาน',kw:['ระดับตำนาน','หายาก'],d:'จุดเปลี่ยนที่นานๆ จะเจอ รางวัลดีกว่าปกติ แต่มักมีความเสี่ยงติดมาด้วย'},
{k:'mimic',g:'ชะตา',n:'หีบสมบัติ / mimic',kw:['mimic','กล่องนี้ดูแปลกๆ','หีบ'],d:'หีบบางใบเป็นปีศาจปลอมตัว เขี่ยดูก่อนปลอดภัยกว่า ถ้าโชคดีจะมีคำใบ้ว่ากล่องดูแปลกๆ ชนะ mimic ได้ของดี'},
{k:'speed',g:'ชะตา',n:'ความเร็ว / หยุด',kw:['ความเร็ว','ชั้นถัดไปใน'],d:'1x = ชั้นละ 5 วินาที เร่งได้ถึง 16x กด Space เพื่อหยุด/เล่นต่อ ตอนจุดเปลี่ยนคิดได้ไม่จำกัดเวลา (กดปุ่ม ⏱ เพื่อเปิดนับถอยหลัง 30 วินาที ซึ่งไม่เร่งตามความเร็ว) เกมเซฟไว้ตลอด รีเฟรชแล้วเล่นต่อได้'},
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
{k:'skip',g:'ชะตา',n:'ช่วงสงบ',kw:['ช่วงสงบ','ชั้นรวด'],d:'บางช่วงไม่มีอะไรน่าสนใจ เกมข้ามไปหลายชั้นรวด แล้วแสดงกราฟทองกับ HP ที่ได้หรือเสียในแต่ละชั้น แท่งแดงคือติดลบ'},
{k:'karma_good',g:'กรรม',n:'กรรมดี ✦',kw:[],d:'ได้จากการช่วยคน ปล่อยสัตว์ ให้ทาน หรือเลือกทางที่ใจดีกว่า เกมไม่บอกแต้มระหว่างเล่น แต่กรรมดียิ่งมาก ความเสี่ยงตายรายชั้นยิ่งลดลง (ลดได้มากสุดราว 40%) ตอนตายแต่ละเรื่องมีลุ้นว่าจะส่งผลเป็นคะแนนชีวิตเพิ่ม และช่วยให้ได้ฉายาดีๆ ถ้าส่งต่อให้ลูกศิษย์ ศิษย์ได้บุญติดไปด้วย'},
{k:'karma_bad',g:'กรรม',n:'กรรมชั่ว ✧',kw:[],d:'มักได้ของหรือทองทันที แต่กรรมตามมาทีหลัง เสี่ยงตายรายชั้นสูงขึ้น (หนักสุดราว 2.4 เท่า) ถ้าติดลบมาก ทหารรับจ้างที่ไม่ภักดีอาจขโมยทองแล้วหนี และจะเริ่มเห็นลางร้าย ตอนตายแต่ละเรื่องมีลุ้นว่าจะปะทุ หักคะแนนชีวิต ลูกศิษย์ที่สืบทอดก็รับหนี้กรรมไปด้วย'},
{k:'exp',g:'ค่าสถานะ',n:'EXP ค่าประสบการณ์',kw:[],d:'ได้จากการสู้และอีเวนต์ เต็มหลอดแล้วเลเวลอัป ค่าสถานะขึ้นตามอาชีพและแรงค์ และฟื้น HP ด้วย'},
{k:'potion',g:'ไอเทม',n:'ยาฟื้นพลัง',kw:[],d:'ฟื้น HP 45% เกมดื่มให้เองเมื่อ HP ต่ำกว่า 45% ช่วยให้ไม่ถึงขั้น HP หมดจนได้แผลเป็น ได้จากอีเวนต์ และเกมซื้อเติมให้ที่ศาลพักใจ'},
{k:'death_risk',g:'ชะตา',n:'ความเสี่ยงตาย',kw:[],d:'ตัวเลือกนี้ส่งผลกับโอกาสตายโดยตรง บางข้อเสี่ยงตายทันทีถ้าพลาด (เช่น แพ้บอสคือตาย) บางข้อทำให้อายุขัยยาวขึ้นหรือสั้นลง ซึ่งจะไปเปลี่ยนการทอยความตายของทุกชั้นหลังจากนี้ ป้าย "ไม่เสี่ยง" แปลว่าข้อนี้ไม่มีผลกับชีวิต'},
{k:'lb',g:'อันดับ',n:'ตารางอันดับ',kw:[],d:'จบรอบแล้วเกมส่งผลขึ้นตารางอันดับรวมให้เอง ถ้าเน็ตหลุดจะเก็บไว้ส่งใหม่ตอนเปิดเกมครั้งหน้า เปิดดูได้จากปุ่ม 🏆 มุมขวาบน มีแท็บผลดีสุดของคุณด้วย'},
{k:'ach',g:'อันดับ',n:'ความสำเร็จ',kw:[],d:'มีกว่า 70 อย่าง เช่น พิชิตหอด้วยแรงค์ F เจอ mimic เจอจุดเปลี่ยนระดับตำนาน หรือเจอลางร้าย ปลดล็อกแล้วเก็บไว้ในเครื่องนี้ ดูได้ในแท็บความสำเร็จ'},
{k:'memo',g:'อันดับ',n:'สุสานนักผจญภัย',kw:[],d:'ฮีโร่ทุกคนที่ตายหรือพิชิตหอจะมีแผ่นจารึกอยู่ในสุสานท้ายหน้า เก็บไว้ถาวร ไม่มีวันหาย'},
{k:'day',g:'หอคอย',n:'หัวข้อของวัน',kw:['หัวข้อวันนี้'],d:'ทุกคนที่เกิดในวันเดียวกัน (ตามเวลาไทย) ได้หัวข้อเดียวกัน หัวข้อจะทำให้เรื่องบางแบบโผล่บ่อยขึ้น บางวันก็มีผลกับทองหรือมอนสเตอร์ด้วย ตอนจบจะบอกว่าชีวิตนี้ได้เจอเรื่องของวันนั้นไหม แล้วเทียบกับคนอื่นที่เข้าหอวันเดียวกัน ถ้าเกิดก่อนเที่ยงคืนแล้วเล่นข้ามวัน หัวข้อเดิมยังอยู่จนจบชีวิตนั้น'},
{k:'clan',g:'สายตระกูล',hid:1,n:'ฉายาตระกูล / รอยมังกร',kw:['ดยุกปราบมังกร','สหายมังกร','คำสาปนักล่ามังกร','ตระกูลนักล่ามังกร','ฉายาตระกูล'],d:'ตระกูลที่เคยปะทะมังกรจะได้ฉายาติดไปทุกรุ่น · สหายมังกร: ซาลาแมนเดอร์ไม่ทำร้ายคนในตระกูล บอสมังกรก็ออมมือให้ 20% · นักล่ามังกร: ติดคำสาป มอนและบอสสายมังกรแรงขึ้น 25% จนกว่าคนในตระกูลจะล้มมังกรครบ 3 ตัว (นับบอสมังกรชั้น 70 กับ 80 มังกรเกล็ดเขียวในตำนาน และมังกรบนชั้นลับ) · ดยุกปราบมังกร: คำสาปหายแล้ว ฉายายังอยู่ · ฉายาไหนเคยได้มาแล้ว ตอนเกิดจะเลือกกลับไปใช้ก็ได้'},
{k:'clanpet',g:'สายตระกูล',hid:1,n:'สัตว์ประจำตระกูล',kw:['สัตว์ประจำตระกูล','ไข่มังกร','ไข่สัตว์ตำนาน','สัตว์ตำนาน'],d:'ไข่สัตว์ตำนาน SS ที่เอากลับมาจากชั้นลับจะฟักตอนลูกหลานคนถัดไปเกิด ครึ่งหนึ่งออกมาเป็นลูกมังกรสีเดียวกับตัวที่เจอ ที่เหลือเป็นยูนิคอน แฟรี่ ลูกฟีนิกซ์ หรือลูกกริฟฟิน ตัวที่ฟักได้จะเป็นสัตว์ประจำตระกูล และย้ายเข้าคอกของตระกูลด้วยถ้ายังมีที่ว่าง ทุกชีวิตหลังจากนั้นเริ่มเกมมาพร้อมมัน ถ้าชาติไหนอยากไปคนเดียว ตอนเกิดเลือกฝากมันไว้ที่บ้านได้ ถ้าฟักได้หลายตัวแล้วก็เลือกได้ว่าจะพาตัวไหนไป'},
{k:'pat',g:'ตัวละคร',hid:1,n:'ลวดลายชะตา',kw:[],d:'อีโมจิ 4 ตัวที่สรุปว่าชีวิตนี้เดินทางแบบไหน ตัวแรกคือบุก ⚔️ หรือระวังตัว 🛡️ ตัวที่สองคือหาของ 💰 หรือช่วยเหลือ 🤝 ตัวที่สามคือไปคนเดียว 🚶 หรือมีเพื่อน 👥 ตัวสุดท้ายคือกรรมดี ☀️ หรือกรรมชั่ว 🌙 มีทั้งหมด 16 แบบ และไม่มีแบบไหนดีกว่ากัน'},
{k:'nec',g:'ตัวละคร',hid:1,n:'อาชีพลับ: เนโครแมนเซอร์',kw:['เนโครแมนเซอร์'],d:'ฮีโร่ที่กรรมชั่วสุดขั้วจะเจอคัมภีร์แห่งความตายกลางทาง ถ้ารับไว้ร่างจะเหลือแต่กระดูก เสกโครงกระดูกมาสู้ด้วย ล้มมอนได้แล้วปลุกศพมันมาช่วยตีได้ทีละตัว แต่จ้างทหารรับจ้างไม่ได้อีกเลย ใครเคยไปถึงจุดนั้น ชีวิตต่อไปมีโอกาสเกิดเป็นอาชีพนี้'},
{k:'ang',g:'ตัวละคร',hid:1,n:'อาชีพลับ: ทูตสวรรค์',kw:['ทูตสวรรค์'],d:'ฮีโร่ที่กรรมดีสุดขั้วจะได้รับขนนกสีขาวกลางทาง ถ้ารับไว้จะมีปีกกับวงแหวน หลบเก่งขึ้น ฟื้น HP ทุกชั้น เลือดเหลือไม่ถึง 20% ครั้งแรกปีกจะฟื้น HP ให้ครึ่งหลอด แต่ ATK ตกไป 5 ชั้น แต่ทำชั่วแล้วแต้มทางลด ใครเคยไปถึงจุดนั้น ชีวิตต่อไปมีโอกาสเกิดเป็นอาชีพนี้'},
{k:'excal',g:'สายตระกูล',hid:1,n:'ดาบศักดิ์สิทธิ์ในหิน',kw:['ดาบศักดิ์สิทธิ์','ดาบในหิน'],d:'หินที่มีดาบปักอยู่ โผล่กลางหอราวหนึ่งในห้าของชีวิตที่ขึ้นไปถึงตรงนั้น ลองดึงได้ชีวิตละครั้ง ครั้งแรกมีโอกาส 1% ทุกครั้งที่ดึงไม่ออก ชีวิตต่อไปจะดึงง่ายขึ้นอีก 2% (สูงสุด 50%) ใครดึงออกได้ ทุกชีวิตหลังจากนั้นจะเกิดมาพร้อมดาบ ได้ ATK +10% และตีบอสแรงขึ้นอีก 10%'},
{k:'dsl',g:'ตัวละคร',hid:1,n:'อาชีพลับ: นักล่ามังกร',kw:['อาชีพลับ','นักล่ามังกร'],d:'สุ่มได้เฉพาะตระกูลที่เคยฆ่ามังกรมาแล้ว สกิลติดตัว: ตีมังกรแรงขึ้น 1.5 เท่า ตีบอสแรงขึ้น 10% บัพพิเศษทำให้ตีมังกรแรงขึ้นอีก 20% แต่ตีมอนธรรมดาที่ไม่ใช่มังกรเบาลง 5%'}];
const BY={};T.forEach(t=>BY[t.k]=t);
const KW=T.flatMap(t=>t.kw.map(w=>[w,t.k])).sort((a,b)=>b[0].length-a[0].length);
const FIXED={'c-hp':'hp','c-atk':'atk','c-def':'def','c-luk':'luk','c-mp':'mp','c-lv':'lv','c-gold':'gold','c-fate':'fate'};

// ---- help tabs: a few short lines per topic, then the glossary entries (T keys) that belong to it ----
const TABS=[
{id:'basic',ic:'🗼',n:'พื้นฐาน',L:[
 ['🚶','ฮีโร่เดินขึ้นหอเอง ชั้นละ 5 วินาทีที่ความเร็ว 1x เป้าหมายคือชั้น 100'],
 ['⚑','เกมหยุดถามเฉพาะจุดเปลี่ยนชะตา คิดได้ไม่จำกัดเวลา กดปุ่ม ⏱ ถ้าอยากให้นับถอยหลัง 30 วินาที'],
 ['⌛','หมดเวลาแล้วฮีโร่เลือกเองตามนิสัย ข้อที่มีป้ายบอกไว้คือข้อที่เขาจะเลือก'],
 ['👆','ชี้หรือแตะคำบนจอเพื่อดูคำอธิบาย ป้ายเล็กใต้ตัวเลือกก็แตะดูได้ ระหว่างเปิดอ่าน เกมจะหยุดรอ'],
 ['💾','เกมเซฟไว้ตลอด รีเฟรชหรือปิดไปแล้วกลับมาเล่นต่อได้'],
 ['✦','ทำตัวตรงกับอาชีพแล้วได้แต้มทาง ครบ 20, 50, 80 แต้มได้ขั้นใหม่พร้อมโบนัส ดูแถบใต้ชื่อฮีโร่'],
 ['⌨️','ปุ่มลัด: 1–4 เลือก · Space หยุด/เดินต่อ · Enter ดำเนินต่อ']],
 K:['key','auto','speed','skip','rank','cls','sp','path','odds','combo','trait','form','look','lv','mp']},
{id:'fight',ic:'⚔️',n:'ต่อสู้ & ความตาย',L:[
 ['🎲','ทุกชั้นเกมทอยว่าคุณรอดไหม ยิ่งขึ้นสูงยิ่งเสี่ยง'],
 ['💔','HP หมดนอกห้องบอสยังไม่ตาย แต่ได้แผลเป็นที่ทำให้เสี่ยงขึ้นไปตลอดชีวิต'],
 ['👹','บอสอยู่ทุก 10 ชั้น แพ้บอสคือตาย ถ้าโอกาสชนะต่ำ จะใช้ม้วนวาร์ปหรือหาทางลัดอ้อมไปก็ได้']],
 K:['hp','atk','def','luk','boss','win','scar','death_risk','mimic']},
{id:'fate',ic:'🔮',n:'ชะตา',L:[
 ['☽','ช่อง ☽ บนฉากบอกระดับความเสี่ยงตายของชั้นนี้ ตั้งแต่มั่นคงไปจนถึงใกล้ฆาต'],
 ['📈','เสี่ยงขึ้นเมื่อ HP ต่ำ มีแผลเป็น โดนคำสาป มีกรรมชั่ว หรือเดินคนเดียว'],
 ['🍀','เสี่ยงน้อยลงเมื่อโชคสูง มีกรรมดี หรือมีสัตว์เลี้ยงกับเพื่อนร่วมทาง'],
 ['🧭','ท่าทีที่เลือกไว้ใต้แถบความเร็วขยับความเสี่ยงได้นิดหน่อยทุกชั้น']],
 K:['fate','omen','omenx','rare','mile','stance']},
{id:'karma',ic:'☯️',n:'กรรมดี/ชั่ว',L:[
 ['🙈','แต้มกรรมซ่อนอยู่ ตัวเลือกที่มีป้าย ✦ ให้กรรมดี ป้าย ✧ ให้กรรมชั่ว'],
 ['⚖️','ระหว่างทาง กรรมมีผลกับความเสี่ยงตาย การทรยศของทหารรับจ้าง และลางร้าย'],
 ['📜','ตอนตาย เกมเปิดบัญชีกรรมทีละบรรทัด แล้วสรุปเป็นคะแนนชีวิตกับฉายา']],
 K:['karma','karma_good','karma_bad','ledger','score']},
{id:'legacy',ic:'🧬',n:'ส่งต่อโชคชะตา',L:[
 ['🧬','ตายหรือพิชิตหอแล้ว เลือกได้ว่าจะให้ลูกศิษย์สืบทอด หรือจะเกิดใหม่'],
 ['🎓','ลูกศิษย์ได้ทองส่วนหนึ่ง สัตว์เลี้ยงตัวแรก และกรรมราวหนึ่งในสี่ของอาจารย์'],
 ['♻️','เกิดใหม่คือเริ่มสายตระกูลใหม่ ไม่มีของติดมา แต่กรรมชาติก่อนยังเอียงดวงเกิดอยู่นิดหน่อย'],
 ['👥','ทุกรอบมีเพื่อนรุ่นเดียวกัน 3–4 คนเข้าหอพร้อมคุณ ตอนจบจะได้เทียบกัน'],
 ['🐉','ว่ากันว่าเหนือยอดหอยังมีบันไดอีกขั้น ใครขึ้นไป สิ่งที่เจออาจติดตัวตระกูลไปอีกหลายรุ่น']],
 K:['lineage','reborn','gen','cohort','cert']},
{id:'party',ic:'🐾',n:'เพื่อน & สัตว์เลี้ยง',L:[
 ['🗡️','ทหารรับจ้างช่วยตีทุกการต่อสู้ มีได้สูงสุด 2 คน แต่ละคนมีนิสัยของตัวเอง'],
 ['🐾','สัตว์เลี้ยงมีได้สูงสุด 2 ตัว แต่ละตัวช่วยคนละด้าน'],
 ['🛡️','มีเพื่อนร่วมทางแล้วความเสี่ยงตายรายชั้นลดลง เดินคนเดียวเสี่ยงกว่า']],
 K:['comp','pet']},
{id:'shop',ic:'💰',n:'ร้าน & ของ',L:[
 ['🪙','ทองได้จากการสู้ หีบ และอีเวนต์ ใช้จ้างคน ซื้อของ และจ่ายในบางตัวเลือก'],
 ['⛩️','ชนะบอสแล้วได้แวะศาลพักใจ เกมซื้อของที่จำเป็นให้เอง เช่น พักฟื้น ยา และม้วนวาร์ป'],
 ['🧪','ยาฟื้นพลังเกมดื่มให้เองตอน HP ต่ำ ส่วนม้วนวาร์ปเป็นตัวเลือกหนึ่งตอนเจอบอส']],
 K:['gold','shop','pot','warp','income']},
{id:'rank',ic:'🏆',n:'อันดับ & ความสำเร็จ',L:[
 ['🏆','ปุ่ม 🏆 มุมขวาบนเปิดตารางอันดับรวม ความสำเร็จ และผลดีสุดของคุณ'],
 ['📤','จบรอบแล้วทำการ์ดสรุปชีวิตไว้แชร์ได้'],
 ['🪦','ฮีโร่ทุกคนได้แผ่นจารึกในสุสานนักผจญภัยท้ายหน้า เก็บไว้ถาวร']],
 K:['lb','ach','memo']}];
const ALIAS={exp:'basic',potion:'shop',clan:'legacy',clanpet:'legacy',excal:'legacy',dsl:'basic',nec:'basic',ang:'basic'};
const TAB_OF={};TABS.forEach(t=>t.K.forEach(k=>TAB_OF[k]=t.id));Object.assign(TAB_OF,ALIAS);
T.forEach(t=>{if(!TAB_OF[t.k]&&!t.hid){TAB_OF[t.k]='basic';TABS[0].K.push(t.k);}});

// ---- intro on the birth screen: three short lines, the rest lives in the help window ----
const INTRO=[
['🗼','ฮีโร่เดินขึ้นหอเอง ทุกชั้นเกมทอยว่ารอดไหม ยิ่งสูงยิ่งเสี่ยง'],
['⚑','ราวทุก 5-6 ชั้น เกมจะหยุดให้คุณเลือกทาง แตะป้ายใต้ตัวเลือกเพื่อดูว่าได้อะไรเสียอะไร'],
['🧬','ตายแล้วให้ลูกศิษย์สืบทอดต่อ หรือจะเกิดใหม่ก็ได้']];

const ls={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---- styles ----
const css=document.createElement('style');css.textContent=`
[data-tip]{cursor:help}
@media (hover:none){[data-tip]{cursor:pointer}}
.ch .s [data-tip]{text-decoration:underline dotted #fff6;text-underline-offset:3px}
.tipbox{position:fixed;z-index:60;max-width:min(300px,calc(100vw - 24px));background:#0d1619;color:var(--ink,#f1e7d0);border:2px solid var(--gold2,#b97a22);border-radius:4px;padding:8px 10px;font:300 13px/1.5 var(--fT,system-ui);box-shadow:0 4px 0 #0008;pointer-events:none;box-sizing:border-box;max-height:calc(100vh - 16px);max-height:calc(100dvh - 16px);overflow-y:auto;overscroll-behavior:contain}
.tipbox .th{display:flex;align-items:flex-start;gap:8px;margin-bottom:2px}
.tipbox .th b{flex:1;color:var(--gold,#f4bb4a);font-weight:500}
.tipbox .td{white-space:pre-line}
.tipbox .tx,.tipbox .tm{display:none}
.tipbox.pin{pointer-events:auto}
.tipbox.pin .tx{display:block;flex:none;background:none;border:1px solid var(--line2,#3d5a66);border-radius:3px;color:var(--ink,#f1e7d0);min-width:28px;min-height:28px;padding:0 6px;font-size:13px;line-height:1;margin:-2px -4px 0 0}
.tipbox.pin:not(.nomore) .tm{display:block;margin-top:6px;background:none;border:0;padding:4px 0;color:var(--gold,#f4bb4a);font:inherit;text-decoration:underline;text-underline-offset:3px}
.helpbtn{position:fixed;right:max(12px,env(safe-area-inset-right,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:50;background:var(--gold,#f4bb4a);color:#1a1206;border:2px solid #7a5214;border-radius:20px;padding:6px 12px;font:500 14px var(--fT,system-ui);box-shadow:0 3px 0 #0008}
.helpdlg{border:2px solid var(--line2,#3d5a66);background:var(--panel,#15232a);color:var(--ink,#f1e7d0);border-radius:6px;padding:0;width:min(580px,calc(100vw - 24px));max-width:none;max-height:min(86vh,720px);max-height:min(86dvh,720px);box-sizing:border-box;overflow:hidden}
.helpdlg[open]{display:flex;flex-direction:column}
.helpdlg::backdrop{background:#000a}
.helpdlg .hd{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 12px 8px;flex:none}
.helpdlg .hd b{color:var(--gold,#f4bb4a);font-weight:500;font-size:17px}
.helpdlg .x{background:var(--panel2,#1c2e36);border:1px solid var(--line2,#3d5a66);border-radius:3px;padding:4px 10px;color:var(--ink,#f1e7d0);font:inherit;font-size:13px}
.helpdlg .tabs{display:flex;flex-wrap:wrap;gap:5px;padding:4px 12px 8px;border-bottom:1px solid var(--line,#2c434d);flex:none}
.helpdlg [role=tab]{background:var(--bg2,#101c21);border:1px solid var(--line,#2c434d);border-radius:14px;padding:4px 10px;color:var(--muted,#a3b5ad);font:400 13px/1.3 var(--fT,system-ui);white-space:nowrap}
.helpdlg [role=tab][aria-selected=true]{background:var(--gold,#f4bb4a);border-color:#7a5214;color:#1a1206;font-weight:500}
.helpdlg [role=tab]:focus-visible{outline:2px solid var(--gold,#f4bb4a);outline-offset:2px}
.helpdlg .tabs::after{content:'';flex:0 0 4px}
@media (max-width:560px){.helpdlg{height:min(88vh,760px);height:min(88dvh,760px);max-height:none;margin:auto}.helpdlg .tabs{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;padding:5px 12px 9px;scrollbar-width:thin;-webkit-overflow-scrolling:touch;mask-image:linear-gradient(90deg,#000 88%,transparent);-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent)}.helpdlg [role=tab]{flex:none}}
.helpdlg .bd{padding:10px 14px 16px;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;flex:1 1 auto;min-height:0;font-size:13.5px;line-height:1.55}
.helpdlg .bd:focus-visible{outline:2px solid var(--line2,#3d5a66);outline-offset:-2px}
.helpdlg{margin:auto;max-height:min(90vh,720px);max-height:min(90dvh,720px)}
@media (max-width:560px){.helpdlg{width:100vw;height:100vh;height:100dvh;max-height:none;margin:0;border-radius:0;border-width:0}.helpdlg .hd{padding-top:calc(10px + env(safe-area-inset-top,0px))}.helpdlg .bd{padding-bottom:calc(16px + env(safe-area-inset-bottom,0px))}}
@media (max-height:560px) and (min-width:561px){.helpdlg{height:100vh;height:100dvh;max-height:none;margin:0 auto;border-radius:0;border-top-width:0;border-bottom-width:0}.helpdlg .bd{padding-bottom:calc(16px + env(safe-area-inset-bottom,0px))}}
.helpdlg .hl{list-style:none;margin:0 0 10px;padding:0}
.helpdlg .hl li{display:flex;gap:8px;padding:3px 0}
.helpdlg .hl .e{flex:none;width:1.6em;text-align:center}
.helpdlg .tm{margin:0;padding:8px 10px;border:1px solid var(--line,#2c434d);border-radius:4px;background:var(--bg2,#101c21);margin-top:6px}
.helpdlg .tm b{display:block;color:var(--gold,#f4bb4a);font-weight:500;font-size:13.5px}
.helpdlg .tm p{margin:2px 0 0;color:var(--muted,#a3b5ad);font-size:13px}
.helpdlg .gl{font-size:12px;color:var(--dim,#7d918a);margin:12px 0 2px}
.tofintro{margin:10px 0 2px;border:1px solid var(--line,#2c434d);border-radius:4px;background:var(--bg2,#101c21);font-size:13px}
.tofintro .ti-hd{display:flex;width:100%;align-items:center;gap:6px;background:none;border:0;padding:6px 10px;color:var(--gold,#f4bb4a);font:500 13px var(--fT,system-ui);text-align:left;cursor:pointer}
.tofintro .ti-hd .ti-s{flex:1;color:var(--dim,#7d918a);font-weight:300;font-size:12px}
.tofintro .ti-hd .ti-c{transition:transform .15s}
.tofintro.shut .ti-hd .ti-c{transform:rotate(-90deg)}
.tofintro .ti-row{display:flex;flex-wrap:wrap;gap:5px;padding:0 10px 8px}
.tofintro.shut .ti-row,.tofintro.shut .ti-body{display:none}
.tofintro .ti-row button{background:var(--panel,#15232a);border:1px solid var(--line2,#3d5a66);border-radius:14px;padding:3px 10px;color:var(--ink,#f1e7d0);font:400 12.5px/1.4 var(--fT,system-ui)}
.tofintro .ti-row button[aria-expanded=true]{border-color:var(--gold2,#b97a22);color:var(--gold,#f4bb4a);background:#2a2412}
.tofintro .ti-body{margin:0 10px 8px;padding:6px 8px;border-left:2px solid var(--gold2,#b97a22);color:var(--muted,#a3b5ad);line-height:1.5}
.tofintro .ti-body p{margin:0 0 3px}
.tofintro .ti-l{list-style:none;margin:0;padding:0}
.tofintro .ti-l li{display:flex;gap:6px;padding:1px 0;color:var(--ink,#f1e7d0)}
.tofintro .ti-l li>span:first-child{flex:none;width:1.3em;text-align:center}
.cs>.tofintro{margin:0 0 8px}
.tofintro .ti-body .ti-more{background:none;border:0;padding:2px 0;color:var(--gold,#f4bb4a);font:inherit;text-decoration:underline;text-underline-offset:3px}
@media (prefers-reduced-motion:reduce){.tofintro .ti-hd .ti-c{transition:none}}`;
document.head.appendChild(css);

// ---- pause bridge: the game holds its timers while a pinned tip or the help window is open ----
const PS={tip:false,help:false};let pausedNow=false;
function setP(src,on){PS[src]=!!on;const any=PS.tip||PS.help;if(any===pausedNow)return;pausedNow=any;
 try{document.dispatchEvent(new CustomEvent('tof:pause',{detail:{on:any}}));}catch(e){}}

// ---- tagging ----
const SEL='.chip,.rk,.cls,.pas,.odds,.kk,.ch .s span,.inv span,.mem .d,.party h2,.vs .side,.fatebox,.omenbox .ok,.formbar .btn,.kv dt,.judge,.cdl,.legend span,.track,.tag,.ledger li,.ledger div,.lgsum,.rar,.keytag,.trait,.cstats div,.msgs li';
function tag(root){
 for(const id in FIXED){const el=document.getElementById(id);if(el&&!el.dataset.tip)el.dataset.tip=FIXED[id];}
 const tr=document.getElementById('track');if(tr)tr.dataset.tip='boss';
 root.querySelectorAll(SEL).forEach(el=>{if(el.dataset.tip)return;const s=el.textContent;for(const [w,k] of KW)if(s.includes(w)){el.dataset.tip=k;break;}});}
let pend=false;const mo=new MutationObserver(()=>{mountIntro();if(pend)return;pend=true;requestAnimationFrame(()=>{pend=false;tag(document);if(cur&&!cur.isConnected)hide();});});
function boot(){tag(document);mountIntro();mo.observe(document.body,{childList:true,subtree:true});addHelp();}

// ---- tooltip: hover/focus shows a preview, tap/click pins it (pinned = game paused) ----
const box=document.createElement('div');box.className='tipbox';box.hidden=true;box.setAttribute('role','tooltip');box.id='tofTip';
box.innerHTML='<div class="th"><b></b><button type="button" class="tx" aria-label="ปิดคำอธิบาย">✕</button></div><span class="td"></span><button type="button" class="tm">อ่านต่อใน วิธีเล่น</button>';
let cur=null,pinned=false;
function place(el){const r=el.getBoundingClientRect(),bw=box.offsetWidth,bh=box.offsetHeight;
 let x=Math.min(Math.max(8,r.left+r.width/2-bw/2),innerWidth-bw-8),y=r.bottom+8;if(y+bh>innerHeight-8)y=Math.max(8,r.top-bh-8);
 box.style.left=x+'px';box.style.top=y+'px';}
// data-tipn / data-tipd on the element override the term's title and text (for per-item tips such as a fate pattern code)
function show(el,pin){const t=BY[el.dataset.tip];if(!t)return;cur=el;pinned=!!pin;const n=el.dataset.tipn||t.n;
 box.querySelector('.th b').textContent=n;box.querySelector('.td').textContent=el.dataset.tipd||t.d;
 box.classList.toggle('pin',pinned);box.classList.toggle('nomore',!TAB_OF[el.dataset.tip]);box.setAttribute('role',pinned?'dialog':'tooltip');box.setAttribute('aria-label',n);
 box.hidden=false;place(el);setP('tip',pinned);}
function hide(){if(box.hidden&&!cur)return;box.hidden=true;cur=null;pinned=false;box.classList.remove('pin');setP('tip',false);}
const tipOf=t=>t&&t.closest&&t.closest('[data-tip]');
box.querySelector('.tx').addEventListener('click',e=>{e.stopPropagation();hide();});
box.querySelector('.tm').addEventListener('click',e=>{e.stopPropagation();const k=cur&&cur.dataset.tip;hide();openHelp(TAB_OF[k]);});
document.addEventListener('pointerover',e=>{if(e.pointerType==='touch'||pinned)return;const el=tipOf(e.target);if(el&&el!==cur&&BY[el.dataset.tip])show(el,false);else if(!el&&cur&&!box.contains(e.target))hide();});
document.addEventListener('focusin',e=>{if(pinned||box.contains(e.target))return;const el=tipOf(e.target);let kb=false;try{kb=e.target.matches(':focus-visible');}catch(x){}if(el&&kb)show(el,false);});
document.addEventListener('focusout',e=>{if(!pinned&&!box.contains(e.relatedTarget))hide();});
// tap/click: a tagged element opens a pinned tip. A chip inside a button (choice preview) must not press the button.
document.addEventListener('click',e=>{const t=e.target;if(box.contains(t))return;
 const el=tipOf(t),ctl=t.closest&&t.closest('button,a,input,select,textarea,label,summary,[role=tab]');
 if(el&&BY[el.dataset.tip]&&(!ctl||(ctl!==el&&ctl.contains(el)))){
  if(ctl){e.preventDefault();e.stopImmediatePropagation();}
  if(cur===el&&pinned)hide();else show(el,true);return;}
 if(pinned)hide();},true);
addEventListener('scroll',e=>{if(cur&&!box.contains(e.target))hide();},{passive:true,capture:true}); // capture: the card and side panels scroll inside the page nowaddEventListener('resize',()=>{if(cur)hide();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&cur)hide();});

// ---- help window with tabs ----
let dlg=null,selTab=null;
function termHTML(k){const t=BY[k];return t?`<div class="tm"><b>${esc(t.n)}</b><p>${esc(t.d)}</p></div>`:'';}
function selectTab(id,focus){const tb=TABS.find(t=>t.id===id)||TABS[0];selTab=tb.id;ls.set('tof-help-tab',tb.id);
 dlg.querySelectorAll('[role=tab]').forEach(b=>{const on=b.dataset.tab===tb.id;b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1;if(on){if(focus)b.focus({preventScroll:true});try{b.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){}}});
 dlg.querySelectorAll('[role=tabpanel]').forEach(p=>p.hidden=p.dataset.tab!==tb.id);
 const bd=dlg.querySelector('.bd');if(bd)bd.scrollTop=0;}
function openHelp(tab){if(!dlg)return;hide();selectTab(tab||ls.get('tof-help-tab')||'basic',false);
 if(!dlg.open){try{dlg.showModal();}catch(e){dlg.setAttribute('open','');}}
 setP('help',true);const b=dlg.querySelector('[role=tab][aria-selected=true]');if(b)try{b.focus();}catch(e){}}
function closeHelp(){if(!dlg)return;if(dlg.open&&dlg.close)dlg.close();else dlg.removeAttribute('open');setP('help',false);}
function addHelp(){document.body.appendChild(box);
 // the ❓ button lives in the top bar (#btnHelp); pages without it get the old floating button
 const top=document.getElementById('btnHelp'),b=top||document.createElement('button');if(!top){b.type='button';b.className='helpbtn';b.textContent='❓ วิธีเล่น';b.setAttribute('aria-haspopup','dialog');}
 const d=dlg=document.createElement('dialog');d.className='helpdlg';d.setAttribute('aria-labelledby','tofHelpT');
 d.innerHTML=`<div class="hd"><b id="tofHelpT">วิธีเล่นหอคอยโชคชะตา</b><button type="button" class="x" aria-label="ปิดวิธีเล่น">ปิด ✕</button></div>
 <div class="tabs" role="tablist" aria-label="หมวดวิธีเล่น">${TABS.map(t=>`<button type="button" role="tab" id="htab-${t.id}" data-tab="${t.id}" aria-controls="hpan-${t.id}" aria-selected="false" tabindex="-1">${t.ic} ${esc(t.n)}</button>`).join('')}</div>
 <div class="bd" tabindex="0">${TABS.map(t=>`<section role="tabpanel" id="hpan-${t.id}" data-tab="${t.id}" aria-labelledby="htab-${t.id}" hidden>
  <ul class="hl">${t.L.map(([e,s])=>`<li><span class="e" aria-hidden="true">${e}</span><span>${esc(s)}</span></li>`).join('')}</ul>
  <div class="gl">คำที่เจอบ่อยในหมวดนี้</div>${t.K.map(termHTML).join('')}</section>`).join('')}</div>`;
 if(top)document.body.append(d);else document.body.append(b,d);
 b.onclick=()=>openHelp();
 d.querySelector('.x').onclick=closeHelp;
 d.addEventListener('close',()=>setP('help',false));
 d.addEventListener('click',e=>{if(e.target===d)closeHelp();});
 d.querySelector('.tabs').addEventListener('click',e=>{const t=e.target.closest('[role=tab]');if(t)selectTab(t.dataset.tab,true);});
 d.querySelector('.tabs').addEventListener('keydown',e=>{const ids=TABS.map(t=>t.id);let i=ids.indexOf(selTab);
  if(e.key==='ArrowRight'||e.key==='ArrowDown')i=(i+1)%ids.length;else if(e.key==='ArrowLeft'||e.key==='ArrowUp')i=(i-1+ids.length)%ids.length;
  else if(e.key==='Home')i=0;else if(e.key==='End')i=ids.length-1;else return;e.preventDefault();selectTab(ids[i],true);});
 // game hotkeys (1–4, Space, Enter) must not reach the game while the window is open
 d.addEventListener('keydown',e=>{if(e.key!=='Escape')e.stopPropagation();});}

// ---- intro strip on the birth screen (#card is re-rendered with innerHTML, so the observer re-mounts it) ----
// sits at the top of the card's scrolling part so a first-time player reads it before the certificate
function mountIntro(){const c=document.getElementById('card');if(!c||!c.querySelector('#btnEnter')||c.querySelector('.tofintro'))return;
 // returning players (someone already in the graveyard) start with it folded unless they opened it themselves
 const pref=ls.get('tof-intro-v1'),shut=pref==='0'||(pref==null&&(ls.get('tof-auto-memorial-v1')||'[]')!=='[]');
 const w=document.createElement('div');w.className='tofintro'+(shut?' shut':'');w.setAttribute('role','region');w.setAttribute('aria-label','เล่นยังไง');
 w.innerHTML=`<button type="button" class="ti-hd" aria-expanded="${!shut}" aria-controls="tofIntroB"><span aria-hidden="true">📖</span> เล่นยังไง<span class="ti-s"></span><span class="ti-c" aria-hidden="true">▾</span></button>
 <div class="ti-body" id="tofIntroB"><ul class="ti-l">${INTRO.map(([e,s])=>`<li><span aria-hidden="true">${e}</span><span>${esc(s)}</span></li>`).join('')}</ul><button type="button" class="ti-more">อ่านวิธีเล่นทั้งหมด</button></div>`;
 w.querySelector('.ti-more').onclick=()=>openHelp('basic');
 w.querySelector('.ti-hd').onclick=()=>{const s=!w.classList.contains('shut');w.classList.toggle('shut',s);w.querySelector('.ti-hd').setAttribute('aria-expanded',String(!s));ls.set('tof-intro-v1',s?'0':'1');};
 const a=c.querySelector('.cs')||c;a.insertBefore(w,a.firstChild);}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.TIPS={T,tag,open:openHelp,close:closeHelp,hide};
})();
