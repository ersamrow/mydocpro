import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {tools} from '../src/tools.js';
import {guides,guideHtml} from '../src/tool-guides.js';
import {sitePages} from '../src/site-content.js';
import {pageSeo,toolSearch} from '../src/seo.js';
const root=new URL('../dist/',import.meta.url);
const ids=['',...tools.map(t=>t[0]),...Object.keys(sitePages)];
test('public pages contain visible HTML, matching canonicals and valid internal links',async()=>{
 for(const id of ids){
  const html=await readFile(new URL((id||'index')+'.html',root),'utf8');
  assert.match(html,/<h1>/);
  assert.ok(html.includes(`rel="canonical" href="https://mydocpro.co.in/${id}"`));
  for(const [,href] of html.matchAll(/href="\/([^"#?]*)"/g))if(!href.includes('.'))assert.ok(ids.includes(href),`Broken link in ${id}: ${href}`);
  if(guides[id])assert.ok(html.includes(guideHtml(id)),`Missing shared guidance: ${id}`);
 }
});
test('search and social metadata are unique, consistent and valid before JavaScript',async()=>{
 const titles=new Set(), descriptions=new Set();
 for(const id of ids){
  const html=await readFile(new URL((id||'index')+'.html',root),'utf8');
  const expected=pageSeo(id);
  const title=html.match(/<title[^>]*>(.*?)<\/title>/)[1];
  const description=html.match(/name="description" content="([^"]+)"/)[1];
  assert.ok(!titles.has(title),`Duplicate title: ${id}`);titles.add(title);
  assert.ok(!descriptions.has(description),`Duplicate description: ${id}`);descriptions.add(description);
  assert.equal([...html.matchAll(/<h1[ >]/g)].length,1);
  assert.equal([...html.matchAll(/rel="canonical"/g)].length,1);
  assert.ok(html.includes(`property="og:url" content="${expected.url}"`));
  assert.match(html,/name="twitter:card" content="summary"/);
  const schema=JSON.parse(html.match(/<script id="site-schema" type="application\/ld\+json"[^>]*>(.*?)<\/script>/)[1]);
  assert.deepEqual(schema,expected.schema);
  assert.ok(!JSON.stringify(schema).includes('aggregateRating'));
  if(id){const crumb=schema['@graph'].find(n=>n['@type']==='BreadcrumbList');assert.equal(crumb.itemListElement.at(-1).item,expected.url);assert.match(html,/aria-label="Breadcrumb"/);}
 }
 assert.deepEqual(Object.keys(toolSearch).sort(),tools.map(t=>t[0]).sort());
});
test('unknown and prototype-like routes remain non-indexable; server config is never precached',async()=>{
 for(const id of ['404','missing-page','constructor','__proto__'])assert.equal(pageSeo(id).known,false);
 const sw=await readFile(new URL('sw.js',root),'utf8');
 assert.ok(!sw.includes('.htaccess'));
 const html=await readFile(new URL('404.html',root),'utf8');
 assert.ok(!html.includes('id="site-schema"'));
});
test('guidance and sitemap cover all public routes and 404 is not indexed',async()=>{
 assert.deepEqual(Object.keys(guides).sort(),tools.map(t=>t[0]).sort());
 const sitemap=await readFile(new URL('sitemap.xml',root),'utf8');
 assert.equal([...sitemap.matchAll(/<loc>/g)].length,ids.length);
 for(const id of ids)assert.ok(sitemap.includes(`<loc>https://mydocpro.co.in/${id}</loc>`));
 assert.match(await readFile(new URL('404.html',root),'utf8'),/noindex,follow/);
 assert.match(await readFile(new URL('.htaccess',root),'utf8'),/ErrorDocument 404/);
});
