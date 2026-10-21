// Remove leaderboard rows by id from KV (keys `top` and `recent`). Needs `npx wrangler login` once.
// usage: node tools/lb-remove.js <id> [id...]        (add --dry to only show what would be removed)
const {execFileSync}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path');
const args=process.argv.slice(2),dry=args.includes('--dry'),ids=args.filter(a=>!a.startsWith('--'));
if(!ids.length){console.log('usage: node tools/lb-remove.js <id> [id...] [--dry]');process.exit(1);}
const W=(a)=>execFileSync(process.platform==='win32'?'npx.cmd':'npx',['wrangler',...a],{encoding:'utf8',shell:process.platform==='win32'});
const ns=JSON.parse(W(['kv','namespace','list'])).find(n=>n.title==='tower-of-fate-scores'||/tower-of-fate-scores/.test(n.title));
if(!ns){console.error('KV namespace tower-of-fate-scores not found');process.exit(1);}
for(const key of ['top','recent']){
 let arr;try{arr=JSON.parse(W(['kv','key','get',key,'--namespace-id',ns.id,'--remote']));}catch(e){console.log(key,': not found');continue;}
 const drop=arr.filter(e=>ids.includes(e.id));
 drop.forEach(e=>console.log(`${key}: remove ${e.id} ${e.name} floor ${e.floor} score ${e.score}`));
 if(!drop.length||dry)continue;
 const f=path.join(os.tmpdir(),`tof-${key}.json`);fs.writeFileSync(f,JSON.stringify(arr.filter(e=>!ids.includes(e.id))));
 W(['kv','key','put',key,'--path',f,'--namespace-id',ns.id,'--remote']);fs.unlinkSync(f);console.log(key,': saved');}
