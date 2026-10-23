import test from 'node:test';
import assert from 'node:assert/strict';
import {OrbitBattle,SLOTS,MODULES,UNITS,SECTORS,COMPOSITIONS,powerGrid,localPlan,defenseSummary,waveManifest,budgetForWave,normalizePlan} from '../orbit-sim.js';
const fixed={sector:'north',composition:'balanced',objective:'core'};
function complete(b){for(let i=0;i<2400&&b.phase==='combat';i++){b.step(.05);b.drainEvents();}assert.notEqual(b.phase,'combat','wave must end within 120 simulated seconds');}

test('16 unique construction sockets, finite credits, locked battle construction and refunds',()=>{
  const b=new OrbitBattle();assert.equal(SLOTS.length,16);assert.equal(new Set(SLOTS.map(s=>s.x+','+s.y)).size,16);
  assert.equal(b.build(0,'laser'),null);assert.equal(b.credits,170);assert.ok(b.build(0,'laser'));assert.ok(b.build(17,'laser'));assert.ok(b.build(1,'constructor'));
  b.upgrade(0);const invested=b.modules[0].invested;b.sell(0);assert.equal(b.credits,240-invested+Math.floor(invested*.65));
  b.launch(fixed);const credits=b.credits;assert.ok(b.build(4,'laser'));assert.equal(b.credits,credits);assert.equal(b.sell(0),false);
});
test('reactors and routing produce real offline defenses and respond to reactor loss',()=>{
  const b=new OrbitBattle();b.credits=1000;for(const [slot,type] of [[0,'laser'],[1,'missile'],[2,'shield'],[3,'reactor']])b.build(slot,type);
  assert.equal(powerGrid(b.modules).capacity,10);assert.equal(powerGrid(b.modules).active.size,4);
  b.modules[3]=null;const weapons=powerGrid(b.modules,'weapons'),shields=powerGrid(b.modules,'shields');
  assert.equal(weapons.capacity,6);assert.ok(!weapons.active.has(2));assert.ok(shields.active.has(2));assert.ok(!shields.active.has(1));
});
test('changing the player construction changes the necessary local counter',()=>{
  const lasers=new OrbitBattle();lasers.build(0,'laser');lasers.build(1,'laser');assert.equal(localPlan(lasers.snapshot()).composition,'armor');
  const missiles=new OrbitBattle();missiles.build(0,'missile');missiles.build(1,'missile');assert.equal(localPlan(missiles.snapshot()).composition,'swarm');
  const energy=new OrbitBattle();energy.build(0,'reactor');energy.build(4,'reactor');assert.equal(localPlan(energy.snapshot()).objective,'energy');
  const summary=defenseSummary(lasers.modules),plan=localPlan(lasers.snapshot());assert.equal(summary.coverage[plan.sector],Math.min(...Object.values(summary.coverage)));
});
test('every model composition spends exactly the fixed budget, with repeatable manifests',()=>{
  for(let wave=1;wave<=6;wave++)for(const composition of Object.keys(COMPOSITIONS)){
    const plan={...fixed,composition},units=waveManifest(plan,wave,716);assert.equal(units.reduce((sum,u)=>sum+UNITS[u.type].cost,0),budgetForWave(wave));assert.deepEqual(units,waveManifest(plan,wave,716));
  }
  assert.equal(normalizePlan({...fixed,objective:'teleport'}),null);
});
test('placement changes a battle outcome under the same plan, seed and budget',()=>{
  const protectedNorth=new OrbitBattle(),exposedNorth=new OrbitBattle();
  for(const id of [0,1,2])protectedNorth.build(id,'laser');for(const id of [8,9,10])exposedNorth.build(id,'laser');
  protectedNorth.launch(fixed);exposedNorth.launch(fixed);complete(protectedNorth);complete(exposedNorth);
  assert.ok(protectedNorth.core>exposedNorth.core);assert.ok(protectedNorth.reports[0].kills>exposedNorth.reports[0].kills);
});
test('shields absorb damage, EMP is once per wave, and prep pauses the simulation',()=>{
  const b=new OrbitBattle();b.build(0,'shield');b.launch(fixed);b.step(.05);const hp=b.core;b.damageModule(null,30);assert.equal(b.core,hp);assert.ok(b.modules[0].charge<90);
  assert.equal(b.emp(),true);assert.equal(b.emp(),false);
  const prep=new OrbitBattle();prep.step(.05);assert.equal(prep.time,0);assert.equal(prep.enemies.length,0);
});
test('infrastructure raids cannot stall forever against shield recharge',()=>{
  const b=new OrbitBattle();b.credits=2000;for(const [slot,type] of [[0,'shield'],[1,'shield'],[2,'reactor'],[3,'reactor']])b.build(slot,type);
  b.launch({sector:'north',composition:'siege',objective:'cluster'});complete(b);assert.ok(b.phase==='prep'||b.phase==='lost');
});
test('six adaptive waves can be completed with an expanding, powered defense',()=>{
  const b=new OrbitBattle();for(const i of [0,4,8])b.build(i,'laser');
  for(let wave=1;wave<=6;wave++){
    assert.equal(b.launch(localPlan(b.snapshot()),{source:'test'}),true);complete(b);assert.ok(b.core>0);
    if(wave<6){
      for(const i of [12,1,5,9,13,2,6,10,14,3,7,11,15])if(!b.modules[i]){
        const grid=powerGrid(b.modules);b.build(i,grid.capacity-grid.demand<3?'reactor':i%3===0?'missile':'laser');
      }
      for(const m of b.modules.filter(Boolean))if(b.credits>130)b.upgrade(m.slot);
    }
  }
  assert.equal(b.phase,'won');assert.equal(b.reports.length,6);assert.equal(b.launch(fixed),false);
});
test('an undefended station can lose and destroyed reactors change enemy targets',()=>{
  const b=new OrbitBattle();b.wave=5;b.core=10;b.launch(fixed);complete(b);assert.equal(b.phase,'lost');
  const raid=new OrbitBattle();raid.build(0,'reactor');raid.plan={...fixed,objective:'energy'};const enemy={x:600,y:0};assert.equal(raid.targetFor(enemy).slot,0);raid.modules[0]=null;assert.equal(raid.targetFor(enemy).slot,null);
});
