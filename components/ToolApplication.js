import {useEffect} from 'react';
import Head from 'next/head';
import {pageSeo,siteOrigin} from '../src/seo.js';

// The existing canvas/PDF editor owns this DOM island; React owns the page shell.
export default function ToolApplication({id,html}){
 const m=pageSeo(id);
 useEffect(()=>{
  let disposed=false,cleanup;
  import('../src/app.js').then(({mountApp})=>{if(!disposed)cleanup=mountApp();}).catch(error=>console.error('Unable to start MyDocPro',error));
  return ()=>{disposed=true;cleanup?.();};
 },[id]);
 return <><Head>
  <title>{m.title}</title><meta name="description" content={m.description}/>
  <meta name="robots" content={m.robots}/><link rel="canonical" href={m.url}/>
  <meta property="og:type" content="website"/><meta property="og:site_name" content="MyDocPro"/>
  <meta property="og:title" content={m.title}/><meta property="og:description" content={m.description}/><meta property="og:url" content={m.url}/>
  <meta property="og:image" content={siteOrigin+'/brand/mydocpro-1024.png'}/><meta property="og:image:alt" content="MyDocPro image and PDF tools"/>
  <meta name="twitter:card" content="summary"/><meta name="twitter:title" content={m.title}/><meta name="twitter:description" content={m.description}/><meta name="twitter:image" content={siteOrigin+'/brand/mydocpro-1024.png'}/>
  {m.known&&<script id="site-schema" type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(m.schema).replaceAll('<','\\u003c')}}/>}
 </Head><div id="app" dangerouslySetInnerHTML={{__html:html}}/></>;
}
