// Cloudflare Pages Function: /api/posts  — community wall "ชีวิตที่แบ่งปัน" (v2.3)
// storage: store(env) (D1 TOF_DB, KV fallback), ONE key 'posts' holds everything so each accepted action costs exactly 1 write:
//   {v:1,
//    p:[{id, t, s:{n,r,c,o,f,w,d,ti,ca,g}, q, rm, rp, x?, k}],   newest first, max 200 (x=1 hidden by reports)
//    qp:{<ipHash>:[ts..]},   post times per IP in the last hour (quota)
//    qa:{<ipHash>:[ts..]},   react/report times per IP in the last hour (quota)
//    qd:{<devHash>:[ts..]},  post times per device id in the last 24 h (v2.7, quota; the id itself is not stored)
//    rk:['<ipHash>:<id>'..], pk:[...] }   recent react / report keys (cheap repeat filter, ring buffers)
// GET                         -> {posts:[{id,t,s,q,rm}]}  newest 50 visible (Cache-Control: max-age=20)
// POST {a:'post', s:{...}, q, dv?} -> {ok, post} | {error:'filtered', why:'crisis'|'link'|'personal'|'abuse'} | {error:'len'} | 429 {error:'rate-limited', scope?:'dev'}|{error:'busy'} | 409 {error:'dup'}
//   why:'crisis' = the line talks about wanting to die / self-harm: not posted, the client answers with the 1323 hotline instead (v2.7)
// POST {a:'react', id}        -> {ok, rm, dup?}     (repeat from the same IP: no write)
// POST {a:'report', id}       -> {ok, dup?}         (hidden once rp >= REPORT_HIDE distinct IPs)

import { store, update } from './store.js';
import { fnv, ipHash, clean, json, isInt, sameOrigin, RANKS, CLS, DRG } from './util.js';

const KEY = 'posts', MAX_POSTS = 200, GET_N = 50, MAX_BODY = 2048;
const Q_MIN = 4, Q_MAX = 300;
const POST_PER_HOUR = 3, ACT_PER_HOUR = 40, GLOBAL_POST_PER_HOUR = 40;
const POST_PER_DAY_DEV = 8, DAY = 86400e3;   // v2.7 per device id
const REPORT_HIDE = 3, RING = 1500;
const FORMS = ['slime', 'human', ''];
const HOUR = 3600e3;

const okId = s => typeof s === 'string' && /^[a-z0-9]{6,16}$/.test(s);   // post id (not the 9-char id in util.js)

// ---- crisis check (v2.7, keep identical to share.js): wanting to die or hurting oneself. Negations ("ไม่อยากตาย", "don't want to die") are dropped first ----
const CR_SQ=/[\s\-_.,!?*~'"()[\]{}|/\\:;ๆ]+/g,CR_NEG_TH=/ไม่(ได้|เคย)?อยาก(ไป)?ตาย/g,CR_NEG_EN=/\b(do\s*n[o']?t|never|not|no)\s*(want|wanna)\s*(to\s*)?die\b|\bsuicide\s*squad\b/g;
const CR_TH=['อยากตาย','อยากไปตาย','ฆ่าตัวตาย','ฆ่าตัวเอง','ทำร้ายตัวเอง','กรีดข้อมือ','กรีดแขน','กรีดตัวเอง','ไม่อยากมีชีวิต','ไม่อยากอยู่แล้ว','ไม่อยากอยู่บนโลก','ไม่อยากอยู่ในโลก',
 'ไม่อยากตื่นอีก','ไม่อยากตื่นขึ้นมาอีก','อยากหายไปจากโลก','จบชีวิตตัวเอง','ปลิดชีพตัวเอง','ปลิดชีวิตตัวเอง','กินยาตาย','กินยาฆ่าตัว','โดดตึกตาย','กระโดดตึก','ผูกคอตาย'];
const CR_EN=/\b(kill(ing)?\s*my\s*self|want(ed)?\s*to\s*die|wanna\s*die|suicid(e|al)|end(ing)?\s*my\s*life|end\s*it\s*all|self[\s-]*harm(ing)?|cut(ting)?\s*my\s*self|k[\s.]*m[\s.]*s)\b/;
export function crisis(t){const low=String(t||'').toLowerCase(),th=low.replace(CR_SQ,'').replace(CR_NEG_TH,'');return CR_TH.some(w=>th.includes(w))||CR_EN.test(low.replace(CR_NEG_EN,' '));}

// ---- content filter ----
const TH_DIGIT = /[๐-๙]/g;
const TLD = 'com|net|org|info|biz|io|co|me|ly|gg|tv|xyz|app|dev|link|site|online|shop|club|top|vip|cc|th|to|in|us|uk|ru|cn|tk|ml|ga|cf|bet|win|live|fun|pro|asia';
const RE_URL = new RegExp(`(https?:|www\\.|:\\/\\/|\\b[a-z0-9-]{2,}(\\.|\\s*(ดอท|dot)\\s*)(${TLD})\\b|\\b(bit\\.ly|t\\.me|wa\\.me|lin\\.ee|line\\.me)\\b)`, 'i');
const RE_MAIL = /[a-z0-9._%+-]+\s*(@|\(at\)|\[at\])\s*[a-z0-9-]+\s*(\.|dot)\s*[a-z]{2,}/i;
const RE_CONTACT = /(line\s*id|ไลน์\s*ไอดี|ไอดีไลน์|แอดไลน์|แอด\s*line|add\s*line|ทักไลน์|ig\s*:|เฟส\s*:|fb\s*:|@[a-z0-9_.]{4,})/i;
// Thai has no word breaks: only stems that do not hide inside common words (no bare หี/สัตว์/สัด: หีบ, สัตว์เลี้ยง, สัดส่วน)
const TH_BAD = ['เหี้ย', 'เหี้ยะ', 'ควย', 'เย็ด', 'สัส', 'แตด', 'กระหรี่', 'ดอกทอง', 'เงี่ยน', 'ส้นตีน', 'หน้าหี', 'อีหี', 'หีแม่', 'พ่อมึง', 'แม่มึง', 'ไอ้สัตว์', 'อีสัตว์', 'ไอ้สัส', 'ชาติหมา', 'ระยำ', 'อีดอก', 'โคตรพ่อ', 'โคตรแม่', 'อีเวร', 'ไอ้เวร'];
const EN_SQUASH = ['fuck', 'cunt', 'nigger', 'nigga', 'faggot', 'shithead', 'bitch'];
const EN_WORD = /\b(shit|asshole|whore|whores|fuk|dick|dicks|cock|slut|bastard|pussy|retard|retarded|wtf|stfu|fag|fags|porn|rape|kys)\b/i;

export function screen(text) {
  const t = String(text || '');
  const d = t.replace(TH_DIGIT, c => String(c.charCodeAt(0) - 0x0E50));
  if (RE_URL.test(d)) return 'link';
  if (RE_MAIL.test(d) || RE_CONTACT.test(d)) return 'personal';
  // 9+ digits in a row once spaces / dashes / dots between digits are removed = phone or account number
  if (/\d{9,}/.test(d.replace(/(\d)[\s\-.()]+(?=\d)/g, '$1'))) return 'personal';
  const low = d.toLowerCase();
  const thSq = low.replace(/[\s\-_.,!?*~'"()[\]{}|/\\:;ๆ฿]+/g, '');
  if (TH_BAD.some(w => thSq.includes(w))) return 'abuse';
  const leet = low.replace(/[0@4$5137!|]/g, c => ({ '0': 'o', '@': 'a', '4': 'a', '$': 's', '5': 's', '1': 'i', '3': 'e', '7': 't', '!': 'i', '|': 'i' }[c]));
  const enSq = leet.replace(/[^a-z]+/g, '');
  if (EN_SQUASH.some(w => enSq.includes(w))) return 'abuse';
  if (EN_WORD.test(leet)) return 'abuse';
  return '';
}

// ---- run summary (built by the client from one of its own finished runs) ----
export function summary(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  let n = clean(b.n, 24);
  if (!n || screen(n)) n = 'นักผจญภัยนิรนาม';
  const r = RANKS.includes(b.r) ? b.r : null, c = CLS.includes(b.c) ? b.c : null;
  if (!r || !c || !isInt(b.f, 1, 101)) return null;
  const w = b.w === 1 || b.w === true ? 1 : 0, d = DRG.includes(b.d) ? b.d : '';
  let f = b.f; if (w && f < 100) return null; if (f === 101 && !(w && (d === 'f' || d === 's'))) f = 100;
  const ti = clean(b.ti, 40), ca = clean(b.ca, 60);
  const s = { n, r, c, o: FORMS.includes(b.o) ? b.o : '', f, w, d, ti: screen(ti) ? '' : ti, ca: screen(ca) ? '' : ca, g: isInt(b.g, 1, 9999) ? b.g : 1 };
  return s;
}

const read = async (kv, opt) => parse(await kv.get(KEY, opt));
function parse(s) {
  let v = null; try { v = JSON.parse(s || 'null'); } catch { }
  if (!v || typeof v !== 'object') v = {};
  if (!Array.isArray(v.p)) v.p = [];
  for (const k of ['qp', 'qa', 'qd']) if (!v[k] || typeof v[k] !== 'object') v[k] = {};
  for (const k of ['rk', 'pk']) if (!Array.isArray(v[k])) v[k] = [];
  v.v = 1;
  return v;
}
function pruneQ(q, now, win = HOUR) {
  for (const k in q) { const a = Array.isArray(q[k]) ? q[k].filter(t => now - t < win) : []; if (a.length) q[k] = a; else delete q[k]; }
}
const pub = p => ({ id: p.id, t: p.t, s: p.s, q: p.q, rm: p.rm | 0 });
// update() that answers false instead of throwing when D1 stays busy or fails, so the player gets a JSON 503, not a crash page
const edit = (kv, fn) => update(kv, KEY, fn).then(() => true, () => false);
const BUSY = () => json({ error: 'busy' }, 503, { 'Retry-After': '5' });

export async function onRequestGet({ request, env }) {
  const kv = store(env);
  if (!kv) return json({ error: 'kv-not-configured' }, 503);
  const o = request.headers.get('Origin');
  if (o && o !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403);
  const v = await read(kv, { cacheTtl: 30 });
  return json({ posts: v.p.filter(p => p && !p.x).slice(0, GET_N).map(pub) }, 200, { 'Cache-Control': 'public, max-age=20' });
}

export async function onRequestPost({ request, env }) {
  const kv = store(env);
  if (!kv) return json({ error: 'kv-not-configured' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ error: 'content-type' }, 415);
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: 'too-large' }, 413);
  let b; try { b = JSON.parse(text); } catch { return json({ error: 'bad-json' }, 400); }
  if (!b || typeof b !== 'object') return json({ error: 'bad-json' }, 400);

  const ip = ipHash(request, 'tof-ip|');
  const now = Date.now();

  if (b.a === 'post') {
    const s = summary(b.s);
    if (!s) return json({ error: 'invalid', field: 's' }, 400);
    const q = clean(b.q, Q_MAX + 1);
    const ql = Array.from(q).length;
    if (ql > Q_MAX || (ql > 0 && ql < Q_MIN)) return json({ error: 'len', min: Q_MIN, max: Q_MAX }, 400);
    const why = q ? (crisis(q) ? 'crisis' : screen(q)) : '';
    if (why) return json({ error: 'filtered', why }, 400);
    // update() re-runs this on a fresh copy if someone else wrote 'posts' in between, so no react or post is lost
    let res = null;
    if (!await edit(kv, str => {
      const v = parse(str);
      pruneQ(v.qp, now); pruneQ(v.qa, now); pruneQ(v.qd, now, DAY);
      const dv = typeof b.dv === 'string' && /^[0-9a-f]{16}$/.test(b.dv) ? fnv('tof-dv|' + b.dv) : '';
      const myDev = dv ? v.qd[dv] || [] : [];
      if (myDev.length >= POST_PER_DAY_DEV) {
        const wait = Math.max(1, Math.ceil((Math.min(...myDev) + DAY - now) / 1000));
        res = json({ error: 'rate-limited', scope: 'dev', max: POST_PER_DAY_DEV, retryAfter: wait }, 429, { 'Retry-After': String(wait) }); return null;
      }
      const mine = v.qp[ip] || [];
      if (mine.length >= POST_PER_HOUR) {
        const wait = Math.max(1, Math.ceil((Math.min(...mine) + HOUR - now) / 1000));
        res = json({ error: 'rate-limited', retryAfter: wait }, 429, { 'Retry-After': String(wait) }); return null;
      }
      let all = 0; for (const k in v.qp) all += v.qp[k].length;
      if (all >= GLOBAL_POST_PER_HOUR) { res = json({ error: 'busy' }, 429, { 'Retry-After': '600' }); return null; }
      const k = fnv(JSON.stringify(s) + '|' + q);
      if (v.p.some(p => p && p.k === k)) { res = json({ error: 'dup' }, 409); return null; }
      const post = { id: crypto.randomUUID().replace(/-/g, '').slice(0, 10), t: now, s, q, rm: 0, rp: 0, k };
      v.p.unshift(post); v.p.length = Math.min(v.p.length, MAX_POSTS);
      v.qp[ip] = [...mine, now];
      if (dv) v.qd[dv] = [...myDev, now];
      res = json({ ok: true, post: pub(post) });
      return JSON.stringify(v);
    })) return BUSY();
    return res;
  }

  if (b.a === 'react' || b.a === 'report') {
    if (!okId(b.id)) return json({ error: 'invalid', field: 'id' }, 400);
    // update() re-runs this on a fresh copy if someone else wrote 'posts' in between, so no react or post is lost
    let res = null;
    if (!await edit(kv, str => {
      const v = parse(str);
      const p = v.p.find(x => x && x.id === b.id);
      if (!p || p.x) { res = json({ error: 'not-found' }, 404); return null; }
      const ring = b.a === 'react' ? 'rk' : 'pk', key = ip + ':' + b.id;
      if (v[ring].includes(key)) { res = json({ ok: true, dup: true, rm: p.rm | 0 }); return null; } // repeat: no write
      pruneQ(v.qp, now); pruneQ(v.qa, now);
      const acts = v.qa[ip] || [];
      if (acts.length >= ACT_PER_HOUR) { res = json({ error: 'rate-limited', retryAfter: 600 }, 429, { 'Retry-After': '600' }); return null; }
      v.qa[ip] = [...acts, now];
      v[ring].push(key); if (v[ring].length > RING) v[ring].splice(0, v[ring].length - RING);
      if (b.a === 'react') p.rm = (p.rm | 0) + 1;
      else { p.rp = (p.rp | 0) + 1; if (p.rp >= REPORT_HIDE) p.x = 1; }
      res = json({ ok: true, rm: p.rm | 0 });
      return JSON.stringify(v);
    })) return BUSY();
    return res;
  }
  return json({ error: 'a' }, 400);
}
