import test from 'node:test';
import assert from 'node:assert/strict';
import {SiegeBattle,TROOPS} from '../rts-sim.js';
import {summarizeBattle,localRtsPlan} from '../rts-plans.js';
import {enemyProfile,enemyDevelopmentChoices} from '../rts-enemy.js';
const plan={passage:'south_bridge',composition:'balanced',objective:'crossing',maneuver:'assault',stance:'balanced',development:'wait'};
const advance=(b,t)=>{for(let i=0;i<t*20;i++)b.tick(.05);};
function battle(){const b=new SiegeBattle();b.phase='combat';b.externalCommander=true;b.applyEnemyPlan(plan);return b;}

test('logistics keeps training and developing when an external commander stops responding',()=>{
  const b=battle();advance(b,24);
  assert.ok(b.buildings.filter(e=>e.team==='red'&&e.type==='farm').length>=2);
  assert.ok(b.units.filter(u=>u.team==='red').length>8);
  assert.ok(b.wave>0);assert.ok(b.units.some(u=>u.team==='red'&&u.x<650));
  assert.ok(b.enemyGold>=0&&b.enemyWood>=0);assert.equal(b.gold,320+17*4);
});
test('observed player progression raises bounded tempo and army goals without modifying stats',()=>{
  const b=battle(),stats=JSON.stringify(TROOPS),before=enemyProfile(summarizeBattle(b));
  for(let i=0;i<18;i++)b.spawn('infantry','blue',280,160+i*18);
  b.sites[0].owner='blue';b.losses.red=8;
  const after=enemyProfile(summarizeBattle(b));
  assert.ok(after.productionInterval<before.productionInterval);assert.ok(after.targetArmy>before.targetArmy);
  assert.ok(after.productionInterval>=2&&after.targetArmy<=50);assert.equal(JSON.stringify(TROOPS),stats);
});
test('enemy recruits counters and siege instead of repeating one fixed troop mix',()=>{
  const b=battle();b.spawn('ram','blue',400,300);b.spawn('ram','blue',400,340);
  assert.equal(enemyDevelopmentChoices(summarizeBattle(b),plan)[0],'train_knight');
  b.units=b.units.filter(u=>u.team==='red');
  for(let i=0;i<5;i++)b.spawn('infantry','red',950,120+i*25);
  const s=summarizeBattle(b);s.buildings.push({team:'red',type:'farm',hp:300});
  assert.equal(enemyDevelopmentChoices(s,plan)[0],'train_ram');
});
test('enemy advances beyond a captured crossing even without another model reply',()=>{
  const b=battle();b.sites.find(s=>s.id===plan.passage).owner='red';advance(b,.1);
  assert.ok(b.enemyPlan.objective!=='crossing'||b.enemyPlan.passage!==plan.passage);
});
test('a cleared emergency cannot leave the external enemy in permanent defense',()=>{
  const b=battle(),raider=b.spawn('infantry','blue',1000,420);
  b.applyEnemyPlan({...plan,maneuver:'defend'});assert.equal(b.enemyPlan.maneuver,'defend');
  raider.hp=0;advance(b,12);assert.notEqual(b.enemyPlan.maneuver,'defend');assert.ok(b.tactics.red.rally+b.tactics.red.attack>0);
});
test('local planning routes existing siege across a full bridge',()=>{
  const b=battle();b.spawn('ram','red',900,300);const p=localRtsPlan(summarizeBattle(b));assert.ok(['north_bridge','south_bridge'].includes(p.passage));
});
