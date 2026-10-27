import {readFile,writeFile} from 'node:fs/promises';
import {tools} from '../src/tools.js';
import {guideHtml,escapeHtml as esc} from '../src/tool-guides.js';
import {sitePages,pageHtml,contentLinks} from '../src/site-content.js';
const root=new URL('../dist/',import.meta.url);
const shell=await readFile(new URL('index.html',root),'utf8');
const origin='https://mydocpro.in';
const nav=`<nav class="static-nav" aria-label="Main navigation"><a href="/">MyDocPro · All tools</a>${contentLinks()}</nav>`;
const notice='<p class="static-notice">The interactive tool needs JavaScript enabled. Your selected files are processed locally in your browser. Read the guidance below before starting.</p>';
function html(id,title,description,body){return shell.replace(/<title>.*?<\/title>/,`<title>${esc(title)} — MyDocPro</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${esc(description)}">`).replace('</head>',`<link rel="canonical" href="${origin}/${id}"><meta name="robots" content="${id==='404'?'noindex,follow':'index,follow'}"></head>`).replace('<div id="app"></div>',`<div id="app">${nav}${body}<footer>${contentLinks()}</footer></div>`);}
const intro='<p>Prepare photos, signature scans and PDF documents without uploading your files to an application server. Choose a tool below for instructions, examples and the limits that matter before you submit your paperwork.</p>';
await writeFile(new URL('index.html',root),html('','Free image and PDF tools','Free browser tools for photos, signatures and PDF documents, with practical guidance and local file processing.',`<main class="workspace static-content"><h1>MyDocPro image and PDF tools</h1>${intro}<ul class="static-tools">${tools.map(t=>`<li><h2><a href="/${t[0]}">${esc(t[1])}</a></h2><p>${esc(t[2])}</p></li>`).join('')}</ul><p><a href="/help">Get help choosing settings and checking downloads</a></p></main>`));
for(const t of tools)await writeFile(new URL(t[0]+'.html',root),html(t[0],t[1],t[2],`<main class="workspace static-content"><h1>${esc(t[1])}</h1><p>${esc(t[2])}</p><noscript>${notice}</noscript>${guideHtml(t[0])}</main>`));
for(const [id,p] of Object.entries(sitePages))await writeFile(new URL(id+'.html',root),html(id,p.title,p.description,pageHtml(id)));
await writeFile(new URL('404.html',root),html('404','Page not found','This address does not match a MyDocPro page.','<main class="workspace"><h1>Page not found</h1><p>Check the address or <a href="/">browse all tools</a>.</p></main>'));
const paths=['',...tools.map(t=>t[0]),...Object.keys(sitePages)];
await writeFile(new URL('sitemap.xml',root),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(id=>`<url><loc>${origin}/${id}</loc></url>`).join('')+'</urlset>\n');
await writeFile(new URL('robots.txt',root),`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Static HTML: ${paths.length} pages, sitemap, robots and 404 page.`);
