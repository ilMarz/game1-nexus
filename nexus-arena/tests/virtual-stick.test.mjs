import test from 'node:test';
import assert from 'node:assert/strict';
import {VirtualStick,stickVector} from '../virtual-stick.js';

class Pad extends EventTarget {
  constructor(left=0){super();this.left=left;this.captured=new Set();this.classList={add(){},remove(){}};}
  getBoundingClientRect(){return {left:this.left,top:0,width:100,height:100};}
  setPointerCapture(id){this.captured.add(id);}
  hasPointerCapture(id){return this.captured.has(id);}
  releasePointerCapture(id){this.captured.delete(id);}
}
function setup(left=0){
  const surface=new Pad(left),thumb={style:{}},values=[];let enabled=true;
  const input=new VirtualStick({surface,thumb,enabled:()=>enabled,onChange:v=>values.push(v)});
  const emit=(type,id,x=left+50,y=50)=>{
    const event=new Event(type,{cancelable:true});Object.assign(event,{pointerId:id,button:0,clientX:x,clientY:y});surface.dispatchEvent(event);
  };
  return {surface,thumb,input,emit,values,disable:()=>enabled=false};
}
test('sticks have a radial deadzone, analog strength and bounded diagonal travel',()=>{
  assert.equal(stickVector(2,2,33).x,0);
  const diagonal=stickVector(100,100,33);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-9);
  assert.ok(Math.abs(Math.hypot(diagonal.thumbX,diagonal.thumbY)-33)<1e-9);
  const analog=stickVector(16,0,33);assert.ok(analog.x>0&&analog.x<1);assert.equal(analog.y,0);
});
test('two fingers operate independent sticks and releasing one does not stop the other',()=>{
  const move=setup(),aim=setup(200);
  move.emit('pointerdown',11,83,50);aim.emit('pointerdown',22,250,17);
  assert.equal(move.values.at(-1).x,1);assert.equal(aim.values.at(-1).y,-1);
  aim.emit('pointerup',11);assert.equal(aim.input.pointerId,22);
  move.emit('pointerup',11);assert.deepEqual(move.values.at(-1),{x:0,y:0});assert.equal(aim.input.pointerId,22);
  aim.emit('pointermove',22,283,50);assert.equal(aim.values.at(-1).x,1);
  aim.emit('pointerup',22);assert.deepEqual(aim.values.at(-1),{x:0,y:0});
});
test('a second finger cannot take over an occupied stick',()=>{
  const s=setup();s.emit('pointerdown',1,83,50);s.emit('pointerdown',2,17,50);s.emit('pointermove',2,17,50);
  assert.equal(s.input.pointerId,1);assert.equal(s.values.at(-1).x,1);assert.ok(s.surface.hasPointerCapture(1));
});
test('cancellation, capture loss and pause clearing reset and release both axes',()=>{
  for(const reason of ['pointercancel','lostpointercapture','clear']){
    const s=setup();s.emit('pointerdown',1,83,50);
    if(reason==='clear')s.input.clear();else s.emit(reason,1);
    assert.equal(s.input.pointerId,null);assert.equal(s.thumb.style.transform,'');assert.deepEqual(s.values.at(-1),{x:0,y:0});assert.equal(s.surface.hasPointerCapture(1),false);
  }
});
test('disabled gameplay ignores touches and clears an existing drag',()=>{
  const s=setup();s.emit('pointerdown',1,83,50);s.disable();s.emit('pointermove',1,83,50);
  assert.equal(s.input.pointerId,null);s.emit('pointerdown',2,83,50);assert.equal(s.input.pointerId,null);assert.deepEqual(s.values.at(-1),{x:0,y:0});
});
test('destroying a stick removes handlers and clears its output',()=>{
  const s=setup();s.emit('pointerdown',1,83,50);s.input.destroy();s.emit('pointerdown',2,83,50);
  assert.equal(s.input.pointerId,null);assert.deepEqual(s.values.at(-1),{x:0,y:0});
});
