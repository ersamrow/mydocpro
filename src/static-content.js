import {tools} from './tools.js';
import {guideHtml,escapeHtml as esc} from './tool-guides.js';
import {sitePages,pageHtml,contentLinks} from './site-content.js';
import {pageSeo,breadcrumbHtml} from './seo.js';
export const routeIds=['',...tools.map(t=>t[0]),...Object.keys(sitePages)];
export function staticContent(id){
 const nav=`<nav class="static-nav" aria-label="Main navigation"><a href="/">MyDocPro · All tools</a>${contentLinks()}</nav>`;
 const tool=tools.find(t=>t[0]===id);
 let body;
 if(id==='')body=`<main class="workspace static-content"><h1>MyDocPro image and PDF tools</h1><p>Prepare photos, signature scans and PDF documents without uploading your files to an application server.</p><ul class="static-tools">${tools.map(t=>`<li><h2><a href="/${t[0]}">${esc(t[1])}</a></h2><p>${esc(t[2])}</p></li>`).join('')}</ul><p><a href="/help">Get help choosing settings and checking downloads</a></p></main>`;
 else if(tool)body=`<main class="workspace static-content">${breadcrumbHtml(id,tool[1])}<h1>${esc(pageSeo(id).name)}</h1><p>${esc(pageSeo(id).description)}</p><noscript><p>The interactive tool needs JavaScript enabled. Your selected files are processed locally in your browser.</p></noscript>${guideHtml(id)}</main>`;
 else if(Object.hasOwn(sitePages,id))body=pageHtml(id).replace('<h1>',breadcrumbHtml(id,sitePages[id].title)+'<h1>');
 else body='<main class="workspace"><h1>Page not found</h1><p>Check the address or <a href="/">browse all tools</a>.</p></main>';
 return nav+body+`<footer>${contentLinks()}</footer>`;
}
