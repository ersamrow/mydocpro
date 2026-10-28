import test from 'node:test';
import assert from 'node:assert/strict';
import {cropBox,dragCrop} from '../src/image-geometry.js';
test('crop presets account for aspect ratio and zoom',()=>{
 const r=cropBox(900,1200,'1',200);
 assert.equal(r.w*900,450);assert.equal(r.h*1200,450);
});
test('moving a crop keeps it inside the image',()=>{
 assert.deepEqual(dragCrop({x:.2,y:.3,w:.4,h:.5},'move',2,-2),{x:.6,y:0,w:.4,h:.5});
});
test('corner resizing anchors the opposite corner and preserves locked ratio',()=>{
 const s={x:.1,y:.1,w:.6,h:.6},r=dragCrop(s,'nw',.2,.1,1);
 assert.ok(Math.abs(r.w-r.h)<1e-9);assert.ok(Math.abs(r.x+r.w-.7)<1e-9);
 const b=dragCrop(s,'se',2,2,1);assert.ok(b.x+b.w<=1);assert.ok(b.y+b.h<=1);
});
test('free crop allows independent width and height',()=>{
 const r=dragCrop({x:0,y:0,w:.5,h:.5},'se',.2,-.1);
 assert.equal(r.w,.7);assert.equal(r.h,.4);
});
test('edge handles change only one dimension even with diagonal dragging',()=>{
 const s={x:.2,y:.2,w:.5,h:.5};
 const north=dragCrop(s,'n',.1,.1);
 assert.equal(north.w,s.w);assert.equal(north.x,s.x);
 assert.ok(Math.abs(north.y+north.h-.7)<1e-9);
 const east=dragCrop(s,'e',.1,.2);
 assert.equal(east.h,s.h);assert.equal(east.y,s.y);
 assert.equal(east.w,.6);
});
