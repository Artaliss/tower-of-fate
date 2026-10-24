// Cloudflare Pages Function: /s/<code>  (share link of one finished life, or of a hero just born (ver 3/4, v2.3), no database)
// The run is packed into <code> by share.js encode(). This serves the normal index.html with:
//  - <base href="/"> so relative script/style URLs still resolve under /s/...  (only here: GitHub Pages lives under /tower-of-fate/)
//  - og:title / og:description / og:url / twitter:title / twitter:description / <title> written for that run
// An invalid code serves the plain page (with <base> only). The game reads the code from the path, shows
// "มีคนส่งชะตามาให้คุณ…" and replaceState()s back to "/".
// decode() / tailOf() / cleanTxt() / fnv8() below must stay identical to the copies in share.js.
// added after v0.2.9: an optional tail [0, flags] after the title/village carries the Excalibur bits (sw, exG); see the comment above encode() in share.js.

const ORIGIN = 'https://tower-of-fate.pages.dev';
// append only: same order as share.js (index is packed into the code)
const CLS_IDS = ['war', 'mag', 'arc', 'pri', 'rog', 'far', 'dra', 'dsl','nec','ang'], CLS_N = ['นักรบ', 'จอมเวท', 'นักธนู', 'นักบวช', 'โจร', 'ชาวไร่', 'อัศวินมังกร', 'นักล่ามังกร','เนโครแมนเซอร์','ทูตสวรรค์'];
const RANK_K = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS'];

// ---- shared with share.js (keep identical) ----
function fnv8(b){let h=2166136261>>>0;for(let i=0;i<b.length;i++){h^=b[i];h=Math.imul(h,16777619);}return(h^(h>>>8)^(h>>>16)^(h>>>24))&255;}
function unpackThai(b){let s='';for(const x of b)s+=String.fromCodePoint(x<128?x:0xE00+x-0x80);return s;}
function unb64u(c){const s=atob(c.replace(/-/g,'+').replace(/_/g,'/'));const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b;}
const str=v=>v==null?'':String(v);
function cleanTxt(s,max){s=str(s).replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g,'').replace(/[<>"'`\\&]/g,'').replace(/\s+/g,' ').trim();
 const g=[];for(const ch of Array.from(s)){if(g.length&&/[ัิ-ฺ็-๎]/.test(ch))g[g.length-1]+=ch;else g.push(ch);}return g.slice(0,max).join('').trim();}
function tailOf(rest){const z=rest.indexOf(0),z2=z<0?-1:rest.indexOf(0,z+1);return{z,z2,f:z2>=0&&z2+1<rest.length?rest[z2+1]&31:0};}
function decode(code){
 try{code=String(code||'');if(!/^[A-Za-z0-9_-]{8,120}$/.test(code))return null;
  const b=unb64u(code);if(b.length<7)return null;const body=b.subarray(0,b.length-1);if(fnv8(body)!==b[b.length-1])return null;
  let ver=b[0],cx=0;if(ver>=5&&ver<=8){ver-=4;cx=8;}
  if(ver===3||ver===4){if(b.length<11||b[1]>>6||b[2]>>1||b[3]<1)return null;
   const rank=(b[1]>>3)&7,cls=(b[1]&7)+cx,human=!!(b[2]&1),gen=b[3],odds=b[4]*16777216+b[5]*65536+b[6]*256+b[7];
   const rest=body.subarray(8),{z,z2,f}=tailOf(rest);if(z<1||!CLS_IDS[cls])return null;
   const dec=x=>ver===3?unpackThai(x):new TextDecoder('utf-8',{fatal:true}).decode(x);
   const name=cleanTxt(dec(rest.subarray(0,z)),16),village=cleanTxt(dec(z2<0?rest.subarray(z+1):rest.subarray(z+1,z2)),20);if(!name)return null;
   return{birth:true,rankIdx:rank,rankK:RANK_K[rank],clsId:CLS_IDS[cls],clsN:CLS_N[cls],form:human?'human':'slime',gen,odds,name,village,sw:!!(f&1)};}
  if(ver!==1&&ver!==2)return null;const rank=(b[1]>>3)&7,cls=(b[1]&7)+cx,dg=b[1]>>6,floor=b[2]&127,won=!!(b[2]&128),pct=b[3]&127,human=!!(b[3]&128);
  if(dg>2||(dg&&!won)||floor<1||floor>100||pct>100||(won&&floor!==100))return null;
  const rest=body.subarray(4),{z,z2,f}=tailOf(rest);if(z<1||!CLS_IDS[cls])return null;
  const dec=x=>ver===1?unpackThai(x):new TextDecoder('utf-8',{fatal:true}).decode(x);
  const name=cleanTxt(dec(rest.subarray(0,z)),16),title=cleanTxt(dec(z2<0?rest.subarray(z+1):rest.subarray(z+1,z2)),18);if(!name)return null;
  return{rankIdx:rank,rankK:RANK_K[rank],clsId:CLS_IDS[cls],clsN:CLS_N[cls],floor,won,pct,form:human?'human':'slime',name,title,drg:['','f','s'][dg],sw:!!(f&1),exG:!!(f&2)};
 }catch(e){return null;}}
// -----------------------------------------------

export function codeOf(pathname) {
  const m = /^\/s\/([A-Za-z0-9_-]{1,200})\/?$/.exec(pathname || '');
  return m ? m[1] : null;
}

// text for the link preview; every value is already stripped of < > " ' ` \ & by cleanTxt()
export function metaFor(r, code) {
  if (r.birth) {
    // birth link (ver 3/4): a hero who was just born, no floor yet
    const title = `${r.sw ? '🗡 ' : ''}${r.name} ฮีโร่แรงค์ ${r.rankK} ${r.clsN} เพิ่งเกิด จะไปได้ถึงชั้นไหน?`;
    const desc = [r.village ? `เกิดที่${r.village}` : '', r.sw ? 'เกิดมาพร้อมดาบศักดิ์สิทธิ์ในหิน' : '', r.odds > 1 ? `โอกาสเกิดมาแบบนี้ 1 ใน ${Number(r.odds).toLocaleString('en-US')}` : '', 'ลองเกิดดูสักชาติ แล้วมาดูกันว่าใครไปได้ไกลกว่า'].filter(Boolean).join(' · ');
    return { title, desc, url: `${ORIGIN}/s/${code}` };
  }
  const who = `${r.name} ${r.clsN}แรงค์ ${r.rankK}`;
  const drg = r.drg === 'f' ? ' แล้วไว้ชีวิตมังกรบนชั้นลับ' : r.drg === 's' ? ' แล้วล้มมังกรบนชั้นลับได้' : '';
  const sw = r.sw ? '🗡 ' : '';
  const title = sw + (r.won ? (drg ? `${who} พิชิตยอดหอคอยโชคชะตา${drg}` : `${who} พิชิตยอดหอคอยโชคชะตาได้`) : `${who} ไปถึงชั้น ${r.floor} ของหอคอยโชคชะตา`);
  const odds = r.won ? `${r.pct}% ของรุ่นเดียวกันขึ้นไปไม่ถึงยอด` : r.pct >= 50 ? `${r.pct}% ของรุ่นเดียวกันไปไม่ถึงชั้นนี้` : `อีก ${100 - r.pct}% ของรุ่นเดียวกันไปได้ไกลกว่านี้`;
  const swd = r.exG ? 'ถอนดาบศักดิ์สิทธิ์ออกจากหินได้' : r.sw ? 'พกดาบศักดิ์สิทธิ์ในหินมาตั้งแต่เกิด' : '';
  const desc = [r.title ? `ฉายา「${r.title}」` : '', swd, odds, 'คุณจะไปได้ถึงชั้นไหน? ลองเกิดดูสักชาติ'].filter(Boolean).join(' · ');
  return { title, desc, url: `${ORIGIN}/s/${code}` };
}

class SetAttr {
  constructor(attr, value) { this.attr = attr; this.value = value; }
  element(el) { el.setAttribute(this.attr, this.value); }
}
class SetText {
  constructor(value) { this.value = value; }
  element(el) { el.setInnerContent(this.value); }
}
class AddBase {
  element(el) { el.prepend('<base href="/">', { html: true }); }
}

export function rewriter(meta) {
  let rw = new HTMLRewriter().on('head', new AddBase());
  if (meta) {
    rw = rw
      .on('title', new SetText(meta.title))
      .on('meta[property="og:title"]', new SetAttr('content', meta.title))
      .on('meta[name="twitter:title"]', new SetAttr('content', meta.title))
      .on('meta[property="og:description"]', new SetAttr('content', meta.desc))
      .on('meta[name="twitter:description"]', new SetAttr('content', meta.desc))
      .on('meta[property="og:url"]', new SetAttr('content', meta.url));
  }
  return rw;
}

export async function onRequest({ request, env }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  const url = new URL(request.url);
  const page = await env.ASSETS.fetch(new Request(new URL('/', url), { headers: { Accept: 'text/html' } }));
  if (!page.ok) return page;
  const code = codeOf(url.pathname), r = code ? decode(code) : null;
  const res = rewriter(r ? metaFor(r, code) : null).transform(page);
  const h = new Headers(res.headers);
  h.set('Content-Type', 'text/html; charset=utf-8');
  h.set('Cache-Control', 'public, max-age=300');
  h.delete('ETag');
  return new Response(res.body, { status: 200, headers: h });
}
