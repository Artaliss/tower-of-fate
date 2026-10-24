// Remove leaderboard rows by id (keys `top` and `recent`) from D1 `tower-of-fate` table kv (v2.4.1; was KV). Needs `npx wrangler login` once.
// usage: node tools/lb-remove.js <id> [id...]        (add --dry to only show what would be removed)
const {execFileSync}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path');
const DB='tower-of-fate';
const args=process.argv.slice(2),dry=args.includes('--dry'),ids=args.filter(a=>!a.startsWith('--'));
if(!ids.length){console.log('usage: node tools/lb-remove.js <id> [id...] [--dry]');process.exit(1);}
const W=(a)=>execFileSync(process.platform==='win32'?'npx.cmd':'npx',['wrangler',...a],{encoding:'utf8',shell:process.platform==='win32'});
const q=(a)=>JSON.parse(W(['d1','execute',DB,'--remote','--json',...a]));
for(const key of ['top','recent']){
 const row=q(['--command',`SELECT v FROM kv WHERE k='${key}'`])[0].results[0];
 if(!row){console.log(key,': not found');continue;}
 const arr=JSON.parse(row.v),drop=arr.filter(e=>ids.includes(e.id));
 drop.forEach(e=>console.log(`${key}: remove ${e.id} ${e.name} floor ${e.floor} score ${e.score}`));
 if(!drop.length||dry)continue;
 const f=path.join(os.tmpdir(),`tof-${key}.sql`);
 fs.writeFileSync(f,`UPDATE kv SET v='${JSON.stringify(arr.filter(e=>!ids.includes(e.id))).replace(/'/g,"''")}', ver=ver+1 WHERE k='${key}';`);
 q(['--file',f]);fs.unlinkSync(f);console.log(key,': saved');}
