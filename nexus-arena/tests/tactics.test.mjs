import test from 'node:test';
import assert from 'node:assert/strict';
import {TACTICS,tacticFor,spawnPoint} from '../tactics.js';

test('reinforcement markers match actual entry edges for all tactics',()=>{
  for(const key of Object.keys(TACTICS))for(const roll of [0,.25,.5,.75,1]){
    const p=spawnPoint(key,()=>roll,1440,900);
    if(tacticFor(key).entry==='sides'){
      assert.ok(p.x===25||p.x===1415);assert.ok(p.y>=130&&p.y<=380);
    }else {assert.equal(p.y,35);assert.ok(p.x>=100&&p.x<=1340);}
  }
});
test('barrage and relief descriptions correspond to simulation multipliers',()=>{
  assert.equal(TACTICS.barrage.fireMultiplier,.7);
  assert.equal(TACTICS.relief.spawnMultiplier,1.55);
  assert.equal(TACTICS.relief.fireMultiplier,1);
  assert.equal(tacticFor('unknown'),TACTICS.assault);
});
