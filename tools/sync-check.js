// Checks that the code copied between the game and the server still gives the same answers:
//   leaderboard.js fnv/clean/canon  vs  functions/api/util.js + scores.js
//   share.js encode/decode          vs  functions/s/[[path]].js decode
// usage: node tools/sync-check.js   (exits 1 on the first mismatch)
const fs = require('fs'), path = require('path'), assert = require('assert');
const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const imp = f => import(pathToFileURL(path.join(root, f)).href);
// pull named top-level definitions out of a browser script (a const is one line, a function runs to its closing brace)
function pick(src, names) {
  const lines = src.split('\n'), out = [];
  for (const n of names) {
    const i = lines.findIndex(l => new RegExp('^(const|function) ' + n + '\\b').test(l));
    assert(i >= 0, 'not found: ' + n);
    let j = i, d = 0;   // a function runs until its braces balance (none of these hide a brace in a string)
    if (/^function/.test(lines[i])) for (; ; j++) { for (const c of lines[j]) d += c === '{' ? 1 : c === '}' ? -1 : 0; if (d === 0 && lines[j].includes('}')) break; }
    out.push(lines.slice(i, j + 1).join('\n'));
  }
  return out.join('\n');
}
const load = (src, names) => new Function(pick(src, names) + '\nreturn {' + names.join(',') + '};')();

(async () => {
  const util = await imp('functions/api/util.js'), scores = await imp('functions/api/scores.js');
  const lb = load(read('leaderboard.js'), ['fnv', 'clean', 'canon']);
  const texts = ['', 'abc', 'สมชาย ใจดี', '<b>x</b>"\'`\\ y', 'a​b‮c', '🐉'.repeat(30), 'นักผจญภัย  หมู่บ้าน\tริมน้ำ'];
  for (const t of texts) {
    assert.strictEqual(lb.fnv(t), util.fnv(t), 'fnv ' + JSON.stringify(t));
    for (const m of [3, 16, 40]) assert.strictEqual(lb.clean(t, m), util.clean(t, m), 'clean ' + JSON.stringify(t));
  }
  assert.strictEqual(lb.clean(42, 9), util.clean(42, 9), 'clean of a number');
  const e = { name: 'สมชาย', village: 'ริมน้ำ', rankK: 'S', clsId: 'dra', form: 'human', floor: 100, won: true, title: 'ผู้พิชิต', score: 260, karma: 12, gen: 3, ach: 40, date: 1761300000000 };
  for (const x of [e, { ...e, won: false, floor: 37, form: '', title: '' }]) assert.strictEqual(lb.canon(x), scores.canon(x), 'canon');

  const SH = ['CLS_IDS', 'RANK_K', 'str', 'clampN', 'MARK', 'graphemes', 'fnv8', 'packThai', 'unpackThai', 'b64u', 'unb64u', 'cleanTxt', 'flagsOf', 'tailOf', 'encode', 'decode'];
  const sh = load(read('share.js'), SH);
  const sv = load(read('functions/s/[[path]].js'), ['CLS_IDS', 'RANK_K', 'fnv8', 'unpackThai', 'unb64u', 'str', 'cleanTxt', 'tailOf', 'decode']);
  const runs = [
    { rankIdx: 6, clsId: 'dra', won: true, floor: 100, pct: 3, form: 'human', name: 'สมชาย', title: 'ผู้พิชิตหอ', drg: 'f', sw: true, exG: true },
    { rankIdx: 0, clsId: 'ang', won: false, floor: 12, pct: 88, form: 'slime', name: 'Bob', title: '' },
    { rankIdx: 3, clsId: 'nec', won: false, floor: 55, pct: 40, form: 'human', name: '🐉🐉 Ryū', title: 'ผู้เดินทาง 🌙' },
  ];
  for (const r of runs) {
    const code = sh.encode(r);
    assert.deepStrictEqual(sv.decode(code), sh.decode(code), 'decode ' + code);
    assert(sh.decode(code), 'decodes ' + code);
  }
  for (const bad of ['', 'xx', 'A'.repeat(130), 'AAAAAAAAAA']) assert.deepStrictEqual(sv.decode(bad), sh.decode(bad), 'bad code ' + bad);
  console.log('sync-check ok');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
