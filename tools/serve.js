const http=require('http'),fs=require('fs'),path=require('path');const R=path.join(__dirname,'..');
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.md':'text/plain; charset=utf-8'};
http.createServer((q,s)=>{let p;try{p=decodeURIComponent(q.url.split('?')[0]);}catch(e){s.writeHead(400);return s.end();}if(p.endsWith('/'))p+='index.html';const f=path.join(R,p);
const rel=path.relative(R,f);if(rel.startsWith('..')||path.isAbsolute(rel)){s.writeHead(404);return s.end();}
fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);return s.end();}s.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});s.end(d);});}).listen(+process.env.PORT||8765,'127.0.0.1');
