import {cp,rm,writeFile} from 'node:fs/promises';
import {routeIds} from '../src/static-content.js';
const dist=new URL('../dist/',import.meta.url);
// Only the disposable build output inside this project is replaced.
await rm(dist,{recursive:true,force:true});
await cp(new URL('../out/',import.meta.url),dist,{recursive:true});
await writeFile(new URL('sitemap.xml',dist),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+routeIds.map(id=>`<url><loc>https://mydocpro.co.in/${id}</loc></url>`).join('')+'</urlset>\n');
await writeFile(new URL('robots.txt',dist),'User-agent: *\nAllow: /\nSitemap: https://mydocpro.co.in/sitemap.xml\n');
