import {cropBox,dragCrop,clamp} from './image-geometry.js';
import './image-manipulator.css';

export function attachImageManipulator(host, file, {kind,isBusy,onChange}) {
  if (!['crop-image','resize-image'].includes(kind)) return () => {};
  const settings = host.parentElement.querySelector('.settings');
  const get = id => settings.querySelector('#'+id);
  const panel = document.createElement('section'); panel.className='image-manipulator';
  const help=document.createElement('p'); help.textContent=kind==='crop-image'?'Drag inside the box to move it. Drag any edge or corner to crop. Mouse and touch supported.':'Drag the corner or use the size slider. Exact dimensions remain available below.';
  const board=document.createElement('div');board.className='manipulator-board';
  const surface=document.createElement('div');surface.className='manipulator-surface';
  const canvas=document.createElement('canvas'); canvas.setAttribute('aria-label','Image editing surface');
  const box=document.createElement('div');box.className='manipulator-box';box.tabIndex=0;box.setAttribute('role','group');box.setAttribute('aria-label',kind==='crop-image'?'Crop area. Drag or use arrow keys to move.':'Resize frame');
  surface.append(canvas,box);board.append(surface);panel.append(help,board);host.prepend(panel);
  let dead=false, image, width=1,height=1, rect, active, previousSize;
  const hidden=[];
  if(kind==='crop-image')for(const key of ['x','y','w','h']){const input=document.createElement('input');input.type='hidden';input.id='crop-'+key;settings.append(input);hidden.push(input);}
  const url=URL.createObjectURL(file);
  const handles=kind==='crop-image'?['nw','ne','sw','se','n','s','e','w']:['se'];
  for(const handle of handles){const button=document.createElement('button');button.type='button';button.className='image-handle '+handle;button.dataset.handle=handle;button.setAttribute('aria-label',(kind==='crop-image'?'Crop ':'Resize ')+handle+' corner; use arrow keys for precision');box.append(button);}
  const bar=document.createElement('div');bar.className='manipulator-toolbar';
  const reset=document.createElement('button');reset.type='button';reset.className='secondary';reset.textContent=kind==='crop-image'?'Reset crop':'Original size';
  const info=document.createElement('span');info.setAttribute('role','status');bar.append(reset,info);panel.append(bar);
  if(kind==='crop-image'){
    const rotationBar=document.createElement('div');rotationBar.className='crop-rotation-bar';
    for(const [label,delta] of [['↶ Rotate left',-90],['↷ Rotate right',90]]){
      const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=label;
      button.setAttribute('aria-label',delta<0?'Rotate image left 90 degrees':'Rotate image right 90 degrees');
      button.onclick=()=>{if(!image||isBusy())return;get('rotation').value=(Number(get('rotation').value)+delta+360)%360;redraw();};
      rotationBar.append(button);
    }
    rotationBar.append(reset);panel.insertBefore(rotationBar,board);
    help.textContent='Drag edges to crop freely. Use the arrows to rotate 90°. Rotating resets the crop selection.';
  }
  let lock,slider;
  if(kind==='resize-image'){
    const label=document.createElement('label');lock=document.createElement('input');lock.type='checkbox';lock.checked=false;label.append(lock,' Keep proportions');
    const scaleLabel=document.createElement('label');scaleLabel.textContent='Size (% of original width)';slider=document.createElement('input');slider.type='range';slider.min=5;slider.max=200;slider.step=1;slider.setAttribute('aria-label','Resize scale');scaleLabel.append(slider);bar.prepend(label,scaleLabel);
    slider.oninput=()=>{if(isBusy())return;const size=dimensions(),w=width*Number(slider.value)/100;setDimensions(w,lock.checked?w*size.h/size.w:size.h);};
  }
  const factor=()=>({px:1,cm:Number(get('dpi').value)/2.54,mm:Number(get('dpi').value)/25.4,in:Number(get('dpi').value)}[get('unit').value]);
  function dimensions(){return {w:Number(get('width').value)*factor(),h:Number(get('height').value)*factor()};}
  function setDimensions(w,h){
    const scale=Math.min(1,12000/Math.max(w,h),Math.sqrt(25000000/(w*h)));
    w=Math.max(1,.1*factor(),w*scale);h=Math.max(1,.1*factor(),h*scale);
    get('width').value=(w/factor()).toFixed(get('unit').value==='px'?0:3);
    get('height').value=(h/factor()).toFixed(get('unit').value==='px'?0:3);
    paint();onChange();
  }
  function paint(){
    if(!image||dead)return;
    if(kind==='crop-image'){
      box.dataset.free = String(get('ratio').value==='free');
      Object.assign(box.style,{left:rect.x*100+'%',top:rect.y*100+'%',width:rect.w*100+'%',height:rect.h*100+'%'});
      hidden.forEach(el=>el.value=rect[el.id.slice(5)]);
      info.textContent=`${get('rotation').value}° rotation · Crop: ${Math.round(rect.w*width)} × ${Math.round(rect.h*height)} px`;
    }else{
      const size=dimensions();if(!(size.w>0&&size.h>0))return;
      const scale=Math.min(1,size.w/width), aspect=size.w/size.h;
      surface.style.width=`min(${Math.max(15,scale*90)}%, ${380*aspect}px)`;surface.style.aspectRatio=String(aspect);
      canvas.style.objectFit=get('fit').value==='cover'?'cover':get('fit').value==='stretch'?'fill':'contain';
      slider.value=clamp(size.w/width*100,5,200);
      previousSize=size;
      info.textContent=`Output: ${Math.round(size.w)} × ${Math.round(size.h)} px`;
    }
  }
  function redraw(){
    const rotation=kind==='crop-image'?Number(get('rotation').value):0,swap=rotation%180!==0;
    width=swap?image.naturalHeight:image.naturalWidth;height=swap?image.naturalWidth:image.naturalHeight;
    const scale=Math.min(1,900/width,600/height);canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
    const ctx=canvas.getContext('2d');ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/180);ctx.drawImage(image,-image.naturalWidth*scale/2,-image.naturalHeight*scale/2,image.naturalWidth*scale,image.naturalHeight*scale);
    if(kind==='crop-image'){surface.style.aspectRatio=String(width/height);surface.style.width=`min(100%, ${380*width/height}px)`;rect=cropBox(width,height,get('ratio').value,Number(get('zoom').value)||100);}
    paint();onChange();
  }
  function changed(e){
    if(!image||isBusy())return;
    if(kind==='crop-image'&&['ratio','rotation','zoom'].includes(e.target.id))redraw();
    else if(kind==='resize-image'){
      const size=dimensions();
      if(lock.checked&&previousSize&&size.w>0&&size.h>0&&['width','height'].includes(e.target.id)){
        const ratio=previousSize.w/previousSize.h;
        setDimensions(e.target.id==='width'?size.w:size.h*ratio,e.target.id==='height'?size.h:size.w/ratio);
      }else paint();
    }
  }
  settings.addEventListener('input',changed);settings.addEventListener('change',changed);
  reset.onclick=()=>{if(!image||isBusy())return;if(kind==='crop-image'){get('zoom').value=100;redraw();}else setDimensions(width,height);};
  const normalizedRatio=()=>get('ratio').value==='free'?null:(get('ratio').value==='original'?width/height:Number(get('ratio').value))*height/width;
  box.onpointerdown=e=>{
    if(!image||isBusy()||e.button!==0||active)return;
    const handle=e.target.dataset.handle||'move';if(kind==='resize-image'&&handle==='move')return;
    e.preventDefault();box.setPointerCapture(e.pointerId);
    active={id:e.pointerId,x:e.clientX,y:e.clientY,handle,rect:{...rect},bounds:surface.getBoundingClientRect(),size:kind==='resize-image'?dimensions():null};
  };
  box.onpointermove=e=>{
    if(!active||active.id!==e.pointerId||isBusy())return;
    const dx=(e.clientX-active.x)/active.bounds.width,dy=(e.clientY-active.y)/active.bounds.height;
    if(kind==='crop-image'){rect=dragCrop(active.rect,active.handle,dx,dy,normalizedRatio());paint();onChange();}
    else {const w=Math.max(1,active.size.w*(1+dx)),h=lock.checked?w*active.size.h/active.size.w:Math.max(1,active.size.h*(1+dy));setDimensions(w,h);}
  };
  function end(e){if(!active||e.pointerId!==active.id)return;if(e.type==='pointercancel'){if(kind==='crop-image'){rect=active.rect;paint();onChange();}else setDimensions(active.size.w,active.size.h);}active=null;}
  box.onpointerup=end;box.onpointercancel=end;box.onlostpointercapture=end;
  box.onkeydown=e=>{
    if(!image||isBusy()||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();
    const dx=(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0)*(e.shiftKey?10:1),dy=(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0)*(e.shiftKey?10:1);
    if(kind==='crop-image'){rect=dragCrop(rect,e.target.dataset.handle||'move',dx/width,dy/height,normalizedRatio());paint();onChange();}
    else{const s=dimensions(),w=Math.max(1,s.w+dx+(lock.checked?dy:0));setDimensions(w,lock.checked?w*s.h/s.w:Math.max(1,s.h+dy));}
  };
  const loading=new Image();loading.src=url;loading.decode().then(()=>{if(dead)return;image=loading;redraw();}).catch(()=>{if(!dead)help.textContent='Unable to load editing controls for this image.';});
  panel.classList.add(kind==='crop-image'?'crop-manipulator':'resize-manipulator');
  return ()=>{dead=true;URL.revokeObjectURL(url);settings.removeEventListener('input',changed);settings.removeEventListener('change',changed);hidden.forEach(el=>el.remove());panel.remove();};
}
