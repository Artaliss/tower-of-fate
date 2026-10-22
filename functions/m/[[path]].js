// Cloudflare Pages Function: /m/<id>  — online memorial page (v2.7)
//  /m/<id>       -> the normal index.html with <base href="/"> and og:/twitter: tags written for that memorial
//                   (memorial.js in the page reads the id from the path and opens the memorial over the game)
//  /m/<id>.png   -> the 1200x630 link preview the owner's browser drew when the memorial was set up (stored in D1 memorial_img)
//  /m/<id>.jpg      same image (the stored type decides Content-Type); no image -> redirect to /og.png
// Unknown id, missing D1 binding or tables not created yet: the plain page is served and the game says so itself.

const ORIGIN = 'https://tower-of-fate.pages.dev';
const RANK_K = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS'];

// attribute-safe text (values are already cleaned by functions/api/memorial.js; this is a second guard)
const safe = s => String(s == null ? '' : s).replace(/[\u0000-\u001f<>"'`&\\]/g, '').replace(/\s+/g, ' ').trim();

export function parsePath(pathname) {
  const m = /^\/m\/([a-z2-9]{9})(\.png|\.jpg)?\/?$/.exec(pathname || '');
  return m ? { id: m[1], img: !!m[2] } : null;
}

export function metaFor(d, id, ext) {
  const fl = d.f > 100 ? 100 : d.f, who = `${safe(d.n)} ${safe(String(d.cn || '').split(' · ')[0])}แรงค์ ${RANK_K[d.rk] || '?'}`;
  const title = d.w ? `รำลึกถึง ${who} ผู้พิชิตยอดหอคอยโชคชะตา` : `รำลึกถึง ${who} ผู้ล้มลงที่ชั้น ${fl} ของหอคอยโชคชะตา`;
  const desc = [d.ti ? `ฉายา「${safe(d.ti)}」` : '', d.w ? '' : safe(d.ca), d.eu ? `「${safe(d.eu)}」` : '', 'จุดเทียนให้สักเล่ม แล้วลองเกิดดูบ้าง'].filter(Boolean).join(' · ');
  return { title: safe(title), desc: safe(desc), url: `${ORIGIN}/m/${id}`, img: ext ? `${ORIGIN}/m/${id}${ext}` : `${ORIGIN}/og.png`, alt: safe(`อนุสรณ์ของ ${d.n} ในหอคอยโชคชะตา`) };
}

class SetAttr { constructor(a, v) { this.a = a; this.v = v; } element(el) { el.setAttribute(this.a, this.v); } }
class SetText { constructor(v) { this.v = v; } element(el) { el.setInnerContent(this.v); } }
class AddBase { element(el) { el.prepend('<base href="/">', { html: true }); } }

function rewriter(m) {
  let rw = new HTMLRewriter().on('head', new AddBase());
  if (!m) return rw;
  return rw
    .on('title', new SetText(m.title))
    .on('meta[property="og:title"]', new SetAttr('content', m.title))
    .on('meta[name="twitter:title"]', new SetAttr('content', m.title))
    .on('meta[property="og:description"]', new SetAttr('content', m.desc))
    .on('meta[name="twitter:description"]', new SetAttr('content', m.desc))
    .on('meta[property="og:url"]', new SetAttr('content', m.url))
    .on('meta[property="og:image"]', new SetAttr('content', m.img))
    .on('meta[name="twitter:image"]', new SetAttr('content', m.img))
    .on('meta[property="og:image:alt"]', new SetAttr('content', m.alt));
}

function b64bytes(b64) { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }

async function serveImg(db, id, url) {
  let r = null;
  try { if (db) r = await db.prepare('SELECT i.mime, i.b64 FROM memorial_img i JOIN memorial m ON m.id = i.id WHERE i.id = ? AND m.hid = 0').bind(id).first(); } catch { r = null; }
  if (!r || !/^image\/(png|jpeg)$/.test(r.mime)) return Response.redirect(new URL('/og.png', url).toString(), 302);
  let body; try { body = b64bytes(r.b64); } catch { return Response.redirect(new URL('/og.png', url).toString(), 302); }
  return new Response(body, { headers: { 'Content-Type': r.mime, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
}

export async function onRequest({ request, env }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  const url = new URL(request.url), p = parsePath(url.pathname), db = env && env.TOF_DB;
  if (p && p.img) return serveImg(db, p.id, url);
  const page = await env.ASSETS.fetch(new Request(new URL('/', url), { headers: { Accept: 'text/html' } }));
  if (!page.ok) return page;
  let meta = null;
  if (p && db) {
    try {
      const r = await db.prepare('SELECT m.d, i.mime FROM memorial m LEFT JOIN memorial_img i ON i.id = m.id WHERE m.id = ? AND m.hid = 0').bind(p.id).first();
      const d = r ? JSON.parse(r.d) : null;
      if (d && d.n) meta = metaFor(d, p.id, r.mime === 'image/png' ? '.png' : r.mime === 'image/jpeg' ? '.jpg' : '');
    } catch { meta = null; }
  }
  const res = rewriter(meta).transform(page);
  const h = new Headers(res.headers);
  h.set('Content-Type', 'text/html; charset=utf-8');
  h.set('Cache-Control', 'public, max-age=120');
  h.delete('ETag');
  return new Response(res.body, { status: 200, headers: h });
}
