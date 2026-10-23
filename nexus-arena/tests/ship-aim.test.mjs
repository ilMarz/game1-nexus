import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gunMount,turnHeading} from '../ship-aim.js';
test('turning is frame-rate independent and releasing rotation preserves heading',()=>{
  const at30=Array.from({length:30}).reduce(h=>turnHeading(h,1,1/30),0);
  const at60=Array.from({length:60}).reduce(h=>turnHeading(h,1,1/60),0);
  assert.ok(Math.abs(at30-at60)<1e-9);assert.equal(turnHeading(at60,0,1),at60);
  assert.ok(turnHeading(0,-1,.1)<0);
});
test('lasers originate in front of the ship and follow its nose through all quadrants',()=>{
  for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    const mount=gunMount(100,100,heading);
    assert.ok(Math.abs(mount.x-100-Math.cos(mount.angle)*30)<1e-9);
    assert.ok(Math.abs(mount.y-100-Math.sin(mount.angle)*30)<1e-9);
    const left=gunMount(100,100,heading,-13),right=gunMount(100,100,heading,13);
    assert.ok(Math.abs(Math.hypot(left.x-right.x,left.y-right.y)-26)<1e-9);
  }
});
