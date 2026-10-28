export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function cropBox(width, height, ratio, zoom = 100) {
  const r = ratio === 'original' || ratio === 'free' ? width / height : Number(ratio);
  let w = Math.min(width, height * r), h = w / r;
  w /= zoom / 100; h /= zoom / 100;
  return {x:(1-w/width)/2, y:(1-h/height)/2, w:w/width, h:h/height};
}
export function dragCrop(start, handle, dx, dy, ratio = null) {
  if (handle === 'move') return {...start,x:clamp(start.x+dx,0,1-start.w),y:clamp(start.y+dy,0,1-start.h)};
  const left = handle.includes('w'), top = handle.includes('n');
  const ax = left ? start.x+start.w : start.x, ay = top ? start.y+start.h : start.y;
  const maxW = left ? ax : 1-ax, maxH = top ? ay : 1-ay;
  let w = clamp(start.w + (left ? -dx : dx), Math.min(.025,maxW), maxW);
  let h = clamp(start.h + (top ? -dy : dy), Math.min(.025,maxH), maxH);
  if (handle === 'n' || handle === 's') w = start.w;
  if (handle === 'e' || handle === 'w') h = start.h;
  if (ratio) { w = Math.min(w,maxH*ratio); h = w/ratio; }
  return {x:left?ax-w:ax,y:top?ay-h:ay,w,h};
}
