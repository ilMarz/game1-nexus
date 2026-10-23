import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PointerAim,surfacePoint} from '../pointer-aim.js';
function setup(){const surface=new EventTarget(),target=new EventTarget();let enabled=true;const input=new PointerAim({surface,target,enabled:()=>enabled,onInteract:()=>{}});const emit=(node,type,extra={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,{button:0,pointerId:1,clientX:500,clientY:200,...extra});node.dispatchEvent(e);};return {surface,target,input,emit,disable:()=>enabled=false};}
test('moving the cursor aims without shooting; left hold shoots until released outside',()=>{
  const s=setup();s.emit(s.surface,'pointermove');assert.deepEqual(s.input.position,{clientX:500,clientY:200});assert.equal(s.input.firing,false);
  s.emit(s.surface,'pointerdown');assert.equal(s.input.firing,true);s.emit(s.target,'pointerup');assert.equal(s.input.firing,false);
});
test('right clicks, UI clicks and disabled sessions cannot start shooting',()=>{
  const s=setup();s.emit(s.surface,'pointerdown',{button:2});assert.equal(s.input.firing,false);s.emit(s.target,'pointerdown');assert.equal(s.input.firing,false);s.disable();s.emit(s.surface,'pointerdown');assert.equal(s.input.firing,false);
});
test('leaving the canvas, losing focus or resetting clears held fire',()=>{
  const s=setup();for(const [node,type] of [[s.surface,'pointerleave'],[s.target,'blur'],[s.target,'pointercancel']]){s.emit(s.surface,'pointerdown');assert.equal(s.input.firing,true);s.emit(node,type);assert.equal(s.input.firing,false);}
  s.emit(s.surface,'pointerdown');s.input.reset();assert.equal(s.input.position,null);assert.equal(s.input.firing,false);
});
test('pointer coordinates account for canvas offset and CSS scaling before camera conversion',()=>{assert.deepEqual(surfacePoint(410,230,{left:10,top:30,width:800,height:400},1600,800),{x:800,y:400});});
