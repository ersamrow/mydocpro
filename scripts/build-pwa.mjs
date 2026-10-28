import {readFile, writeFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root = new URL('../dist/', import.meta.url);
async function walk(dir, prefix='') {
  const paths = [];
  for (const entry of await readdir(dir, {withFileTypes:true})) {
    const name = prefix+entry.name;
    if (entry.isDirectory()) paths.push(...await walk(new URL(entry.name+'/',dir),name+'/'));
    else if (!entry.name.startsWith('.') && entry.name !== 'sw.js' && !entry.name.endsWith('.map')) paths.push(name);
  }
  return paths.sort();
}
const files = (await walk(root)).filter(f => f === 'index.html' || (!f.startsWith('api/') && !f.endsWith('.php') && !f.endsWith('.html') && !['.htaccess','robots.txt','sitemap.xml'].includes(f)));
const hash = createHash('sha256');
for (const file of files) hash.update(file).update(await readFile(new URL(file,root)));
const template = await readFile(new URL('./sw-template.js',import.meta.url),'utf8');
hash.update(template);
const version = hash.digest('hex').slice(0,16);
const paths = files.map(f => '/'+f);
const script = template.replace('__CACHE_NAME__',JSON.stringify('mydocpro-'+version)).replace('__PRECACHE__',JSON.stringify(paths));
await writeFile(new URL('sw.js',root),script);
console.log(`PWA: ${paths.length} local assets precached (${version}), including all PDF workers.`);

