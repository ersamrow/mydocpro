// Generate app icons from the supplied MyDocPro logo.
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {readFile,writeFile} from 'node:fs/promises';
const svg=await readFile(new URL('../public/icons/icon.svg',import.meta.url));
const image=await loadImage(svg);
for(const [filename,size,maskable] of [['icon-192.png',192,false],['icon-512.png',512,false],['apple-touch-icon.png',180,false],['maskable-512.png',512,true]]){
  const canvas=createCanvas(size,size),ctx=canvas.getContext('2d');
  if(maskable || filename==='apple-touch-icon.png'){ctx.fillStyle='#1e6b52';ctx.fillRect(0,0,size,size);}
  const padding=maskable?size*.20:0;
  ctx.drawImage(image,padding,padding,size-padding*2,size-padding*2);
  await writeFile(new URL('../public/icons/'+filename,import.meta.url),canvas.toBuffer('image/png'));
}
