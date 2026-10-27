import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {tools} from '../src/tools.js';
import {guides,guideHtml} from '../src/tool-guides.js';
import {sitePages} from '../src/site-content.js';
const root=new URL('../dist/',import.meta.url);
const ids=['',...tools.map(t=>t[0]),...Object.keys(sitePages)];
test('public pages contain visible HTML, matching canonicals and valid internal links',async()=>{
 for(const id of ids){
  const html=await readFile(new URL((id||'index')+'.html',root),'utf8');
  assert.match(html,/<h1>/);
  assert.ok(html.includes(`rel="canonical" href="https://mydocpro.in/${id}"`));
  for(const [,href] of html.matchAll(/href="\/([^"#?]*)"/g))if(!href.includes('.'))assert.ok(ids.includes(href),`Broken link in ${id}: ${href}`);
  if(guides[id])assert.ok(html.includes(guideHtml(id)),`Missing shared guidance: ${id}`);
 }
});
test('guidance and sitemap cover all public routes and 404 is not indexed',async()=>{
 assert.deepEqual(Object.keys(guides).sort(),tools.map(t=>t[0]).sort());
 const sitemap=await readFile(new URL('sitemap.xml',root),'utf8');
 assert.equal([...sitemap.matchAll(/<loc>/g)].length,ids.length);
 for(const id of ids)assert.ok(sitemap.includes(`<loc>https://mydocpro.in/${id}</loc>`));
 assert.match(await readFile(new URL('404.html',root),'utf8'),/noindex,follow/);
 assert.match(await readFile(new URL('.htaccess',root),'utf8'),/ErrorDocument 404/);
});
