import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PointerAim,surfacePoint} from '../pointer-aim.js';
function setup(){const surface=new EventTarget(),target=new EventTarget();let enabled=true;const input=new PointerAim({surface,target,enabled:()=>enabled,onInteract:()=>{}});const emit=(node,type,extra={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,{button:0,pointerId:1,clientX:500,clientY:200,...extra});node.dispatchEvent(e);};return {surface,target,input,emit,disable:()=>enabled=false};}
test('moving the cursor updates aim without any click',()=>{
  const s=setup();s.emit(s.surface,'pointermove');assert.deepEqual(s.input.position,{clientX:500,clientY:200});
  s.emit(s.target,'pointerup');assert.deepEqual(s.input.position,{clientX:500,clientY:200});
});
test('right clicks, UI clicks and disabled sessions cannot change aim',()=>{
  const s=setup();s.emit(s.surface,'pointerdown',{button:2});assert.equal(s.input.position,null);s.emit(s.target,'pointerdown');assert.equal(s.input.position,null);s.disable();s.emit(s.surface,'pointerdown');s.emit(s.surface,'pointermove');assert.equal(s.input.position,null);
});
test('leaving the canvas keeps the last aim; restart and destroy clear it',()=>{
  const s=setup();s.emit(s.surface,'pointermove');s.emit(s.surface,'pointerleave');assert.deepEqual(s.input.position,{clientX:500,clientY:200});
  s.input.reset();assert.equal(s.input.position,null);s.emit(s.surface,'pointermove');s.input.destroy();s.emit(s.surface,'pointermove');assert.equal(s.input.position,null);
});
test('pointer coordinates account for canvas offset and CSS scaling before camera conversion',()=>{assert.deepEqual(surfacePoint(410,230,{left:10,top:30,width:800,height:400},1600,800),{x:800,y:400});});
test('touching the canvas cannot override joystick orientation with a mouse target',()=>{
  const s=setup();s.emit(s.surface,'pointerdown',{pointerType:'touch'});s.emit(s.surface,'pointermove',{pointerType:'touch'});assert.equal(s.input.position,null);
  s.emit(s.surface,'pointermove',{pointerType:'mouse'});assert.deepEqual(s.input.position,{clientX:500,clientY:200});
});
