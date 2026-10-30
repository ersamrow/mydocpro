import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.xml':'application/xml','.txt':'text/plain'};
createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 let file=resolve(root,'.'+pathname);
 if(!file.startsWith(root+sep)&&file!==root){res.writeHead(403);res.end();return;}
 if(pathname.startsWith('/api/')||extname(file)==='.php'){res.writeHead(503);res.end('Contact email requires PHP-enabled hosting.');return;}
 if(pathname==='/')file=resolve(root,'index.html');
 else if(!extname(file))file+='.html';
 let status=200;
 try{if(!(await stat(file)).isFile())throw Error();}catch{file=resolve(root,'404.html');status=404;}
 res.writeHead(status,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(await readFile(file));
 }catch{res.writeHead(400);res.end('Bad request');}
}).listen(4173,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4173'));
