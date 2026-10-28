import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';

const dist=new URL('../dist/',import.meta.url);
const script=await readFile(new URL('sw.js',dist),'utf8');
const manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',dist),'utf8'));

function worker({badAsset,badMime,redirectShell=false}={}){
  let online=true,claimCount=0,skipCount=0;
  const handlers={},stores=new Map([['other-app',new Map()],['mydocpro-old',new Map()]]);
  const caches={
    keys:async()=>[...stores.keys()],
    delete:async name=>stores.delete(name),
    open:async name=>{
      if(!stores.has(name))stores.set(name,new Map());
      const data=stores.get(name);
      return {put:async(key,response)=>data.set(key,response.clone()),match:async key=>data.get(key)?.clone()};
    }
  };
  class LocalRequest extends Request {constructor(url,options){super(new URL(url,'https://example.test'),options)}}
  const fetch=async request=>{
    if(!online)throw Error('Offline');
    const pathname=new URL(typeof request==='string'?request:request.url,'https://example.test').pathname;
    if(pathname===badAsset)return new Response('<h1>Sign in</h1>',{headers:{'content-type':'text/html'}});
    const bytes=await readFile(new URL(pathname.slice(1)||'index.html',dist));
    const response=new Response(bytes,{headers:{'content-type':pathname===badMime?'text/plain':pathname.endsWith('.html')?'text/html':pathname.endsWith('.js')||pathname.endsWith('.mjs')?'text/javascript':'application/octet-stream'}});
    Object.defineProperty(response,'url',{value:'https://example.test'+(redirectShell&&pathname==='/index.html'?'/':pathname)});
    if(redirectShell&&pathname==='/index.html'){
      const markRedirect = r => {
        Object.defineProperty(r,'redirected',{value:true});
        const clone=r.clone.bind(r);
        r.clone=()=>markRedirect(clone());
        return r;
      };
      markRedirect(response);
    }
    return response;
  };
  const self={location:{origin:'https://example.test'},clients:{claim:async()=>{claimCount++}},skipWaiting:()=>{skipCount++},addEventListener:(name,fn)=>handlers[name]=fn};
  vm.runInNewContext(script,{self,caches,fetch,Request:LocalRequest,Response,URL,Set,Promise,Error});
  const event=async(type,extra={})=>{
    let result;
    handlers[type]({...extra,waitUntil:p=>result=p,respondWith:p=>result=p});
    return result;
  };
  return {event,stores,offline:()=>online=false,claimCount:()=>claimCount,skipCount:()=>skipCount};
}

test('manifest includes standalone launch, home-screen icon sizes and maskable icon',async()=>{
  assert.equal(manifest.display,'standalone');
  assert.equal(manifest.scope,'/');
  assert.equal(manifest.start_url,'/');
  for(const icon of manifest.icons){
    const png=await readFile(new URL(icon.src.slice(1),dist));
    const expected=Number(icon.sizes.split('x')[0]);
    assert.equal(png.readUInt32BE(16),expected);
    assert.equal(png.readUInt32BE(20),expected);
  }
  assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));
});

test('complete offline installation serves every tool and lazy PDF library without network',async()=>{
  const w=worker();
  await w.event('install');
  assert.equal(w.skipCount(),0,'updates must not interrupt existing work');
  await w.event('activate');
  assert.equal(w.claimCount(),1);
  assert.ok(w.stores.has('other-app'));
  assert.ok(!w.stores.has('mydocpro-old'));
  let report;
  await w.event('message',{data:{type:'OFFLINE_STATUS'},ports:[{postMessage:r=>report=r}]});
  assert.equal(report.ready,true);
  w.offline();
  const routes=['/','/compress-image?kb=20','/resize-image','/convert-image','/crop-image','/merge-pdf','/split-pdf','/compress-pdf','/jpg-to-pdf','/exam-photo','/signature','/passport-sheet','/pdf-to-image','/organize-pdf','/name-date','/join-images','/white-background','/privacy','/about'];
  for(const route of routes){
    const response=await w.event('fetch',{request:{url:'https://example.test'+route,method:'GET',mode:'navigate'}});
    assert.ok((await response.text()).includes('name="application-name" content="MyDocPro"'),route);
  }
  const assets=(await readdir(new URL('assets/',dist))).filter(name=>!name.startsWith('.'));
  assert.ok(assets.some(name=>name.startsWith('pdf.worker')&&name.endsWith('.mjs')));
  for(const name of assets){
    const response=await w.event('fetch',{request:{url:'https://example.test/assets/'+name,method:'GET',mode:'cors'}});
    assert.ok((await response.arrayBuffer()).byteLength>0,name);
  }
});

test('auth, external, unknown and uploaded files are never handled or cached',async()=>{
  const w=worker();await w.event('install');
  for(const request of [
    {url:'https://example.test/assets/.htaccess',method:'GET',mode:'cors'},
    {url:'https://example.test/signin-with-chatgpt',method:'GET',mode:'navigate'},
    {url:'https://outside.test/photo.jpg',method:'GET',mode:'cors'},
    {url:'https://example.test/private.pdf',method:'GET',mode:'cors'},
    {url:'https://example.test/merge-pdf',method:'POST',mode:'cors'},
  ])assert.equal(await w.event('fetch',{request}),undefined);
});

test('login HTML in place of an asset aborts installation without removing old cache',async()=>{
  const w=worker({badAsset:'/manifest.webmanifest'});
  await assert.rejects(w.event('install'),/Expected application asset/);
  assert.deepEqual([...w.stores.keys()].sort(),['mydocpro-old','other-app']);
});

test('hosting redirects from index.html to the app root are accepted',async()=>{
  const w=worker({redirectShell:true});
  await w.event('install');
  let report;
  await w.event('message',{data:{type:'OFFLINE_STATUS'},ports:[{postMessage:r=>report=r}]});
  assert.equal(report.ready,true);
});


test('redirected shell is safe for normal address-bar navigation, online and offline',async()=>{
  const w=worker({redirectShell:true});
  await w.event('install');
  for(const offline of [false,true]){
    if(offline)w.offline();
    for(const path of ['/','/crop-image']){
      const response=await w.event('fetch',{request:{url:'https://example.test'+path,method:'GET',mode:'navigate',redirect:'manual'}});
      assert.equal(response.redirected,false,'manual navigation must not receive a followed redirect');
      assert.equal(response.status,200);
      assert.match(response.headers.get('content-type'),/text\/html/);
      assert.ok((await response.text()).includes('name="application-name" content="MyDocPro"'));
    }
  }
});


test('plain-text PDF workers cannot be marked ready offline',async()=>{
  const assets=await readdir(new URL('assets/',dist));
  const workerPath='/assets/'+assets.find(name=>name.startsWith('pdf.worker')&&name.endsWith('.mjs'));
  const w=worker({badMime:workerPath});
  await assert.rejects(w.event('install'),/Expected JavaScript content type/);
  assert.deepEqual([...w.stores.keys()].sort(),['mydocpro-old','other-app']);
});
