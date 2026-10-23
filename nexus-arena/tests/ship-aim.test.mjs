import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gunMount,headingToCenter} from '../ship-aim.js';
test('while orbiting, the ship and its main laser always face the arena center',()=>{
  for(let step=0;step<36;step++){
    const orbit=step*Math.PI/18,x=720+Math.cos(orbit)*250,y=450+Math.sin(orbit)*250;
    const heading=headingToCenter(x,y,720,450),mount=gunMount(x,y,heading);
    const dx=720-x,dy=450-y;
    assert.ok(Math.abs(Math.cos(mount.angle)-dx/250)<1e-9);
    assert.ok(Math.abs(Math.sin(mount.angle)-dy/250)<1e-9);
    assert.ok(Math.hypot(mount.x-720,mount.y-450)<250);
  }
});
test('crossing the exact center retains a finite stable heading',()=>{assert.equal(headingToCenter(720,450,720,450,1.2),1.2);assert.equal(headingToCenter(720.1,450.1,720,450,1.2),1.2);});
test('lasers originate in front of the ship and follow its nose through all quadrants',()=>{
  for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    const mount=gunMount(100,100,heading);
    assert.ok(Math.abs(mount.x-100-Math.cos(mount.angle)*30)<1e-9);
    assert.ok(Math.abs(mount.y-100-Math.sin(mount.angle)*30)<1e-9);
    const left=gunMount(100,100,heading,-13),right=gunMount(100,100,heading,13);
    assert.ok(Math.abs(Math.hypot(left.x-right.x,left.y-right.y)-26)<1e-9);
  }
});
