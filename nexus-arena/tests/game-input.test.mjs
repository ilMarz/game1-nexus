import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameInput} from '../game-input.js';
function setup(){
  const target=new EventTarget();let enabled=true,movements=0,pauses=0;
  const controls=new GameInput({target,enabled:()=>enabled,onMovement:()=>movements++,onPause:()=>pauses++});
  function key(type,code,key,extra={}){const event=new Event(type,{cancelable:true});Object.assign(event,{code,key,keyCode:0,...extra});target.dispatchEvent(event);return event;}
  return {controls,key,setEnabled:v=>enabled=v,get movements(){return movements},get pauses(){return pauses}};
}
test('physical WASD and arrows work with keyCode=0 and stop when released',()=>{
  const s=setup();s.key('keydown','KeyD','d');assert.deepEqual(s.controls.movement(),{x:1,y:0});
  s.key('keyup','KeyD','d');assert.deepEqual(s.controls.movement(),{x:0,y:0});
  s.key('keydown','ArrowLeft','ArrowLeft');assert.deepEqual(s.controls.movement(),{x:-1,y:0});s.controls.destroy();
});
test('two bindings for up: releasing W does not cancel a held arrow',()=>{
  const s=setup();s.key('keydown','KeyW','w');s.key('keydown','ArrowUp','ArrowUp');s.key('keyup','KeyW','w');
  assert.equal(s.controls.movement().y,-1);s.key('keyup','ArrowUp','ArrowUp');assert.equal(s.controls.movement().y,0);
});
test('diagonal movement is normalized and opposite keys cancel',()=>{
  const s=setup();s.key('keydown','KeyD','d');s.key('keydown','KeyW','w');const {x,y}=s.controls.movement();assert.ok(Math.abs(Math.hypot(x,y)-1)<1e-9);
  s.key('keydown','KeyA','a');assert.deepEqual(s.controls.movement(),{x:0,y:-1});
});
test('blur clearing prevents stuck movement; a fresh key press resumes controls',()=>{
  const s=setup();s.key('keydown','KeyD','d');s.controls.clear();assert.equal(s.controls.movement().x,0);s.key('keydown','KeyD','d');assert.equal(s.controls.movement().x,1);assert.equal(s.movements,2);
});
test('key repeats cannot re-trigger dash or pause; actions are consumed once',()=>{
  const s=setup();s.key('keydown','Space',' ');assert.equal(s.controls.consume('dash'),true);s.key('keydown','Space',' ',{repeat:true});assert.equal(s.controls.consume('dash'),false);
  s.key('keydown','KeyP','p');s.key('keydown','KeyP','p',{repeat:true});assert.equal(s.pauses,1);
});
test('text editing, disabled gameplay and browser shortcuts are not captured',()=>{
  const s=setup();s.setEnabled(false);s.key('keydown','KeyD','d');assert.equal(s.controls.movement().x,0);s.setEnabled(true);
  assert.equal(s.key('keydown','KeyD','d',{ctrlKey:true}).defaultPrevented,false);assert.equal(s.controls.movement().x,0);
  const event=new Event('keydown',{cancelable:true});Object.assign(event,{code:'KeyD',key:'d'});Object.defineProperty(event,'target',{value:{tagName:'INPUT'}});s.controls.down(event);assert.equal(s.controls.movement().x,0);
});
test('key names are a fallback if the host omits physical event.code',()=>{
  const s=setup();s.key('keydown','','ArrowRight');assert.equal(s.controls.movement().x,1);s.key('keyup','','ArrowRight');assert.equal(s.controls.movement().x,0);
});
