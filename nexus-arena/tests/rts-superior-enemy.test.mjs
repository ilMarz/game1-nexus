import test from 'node:test';
import assert from 'node:assert/strict';
import {SiegeBattle,TROOPS} from '../rts-sim.js';
import {enemyProfile,ENEMY_START} from '../rts-enemy.js';
import {summarizeBattle} from '../rts-plans.js';
import {runChallengeScenario} from '../artifacts/superior-enemy-scenarios.mjs';

test('the default enemy starts superior in army, siege, treasury and destructible economy',()=>{
  const b=new SiegeBattle(),s=summarizeBattle(b),p=enemyProfile(s);
  assert.equal(b.population,8);assert.equal(b.units.filter(u=>u.team==='red').length,14);
  assert.ok(p.redPower>p.bluePower*1.75);
  assert.ok(b.units.some(u=>u.team==='red'&&u.type==='ram'));
  assert.equal(b.enemyGold,600);assert.equal(b.gold,320);assert.equal(b.enemyWood,360);assert.equal(b.wood,220);
  assert.equal(b.buildings.filter(e=>e.team==='red'&&e.type==='farm').length,3);
  assert.equal(b.buildings.filter(e=>e.team==='blue'&&e.type==='farm').length,1);
  assert.ok(p.targetArmy>=24);assert.ok(p.productionInterval<=2.25);
  for(const u of b.units)assert.equal(u.maxHp,TROOPS[u.type].hp);
  // Extra structures occupy legal, attackable map space rather than granting hidden income.
  for(const site of ENEMY_START.farms){
    const farm=b.buildings.find(e=>e.team==='red'&&e.type==='farm'&&e.x===site.x&&e.y===site.y);
    b.buildings=b.buildings.filter(e=>e!==farm);assert.equal(b.canBuild('farm',site.x,site.y,'red'),null);
  }
});

test('leaving the Strategist alone loses; automatic recruitment alone also fails',()=>{
  const idle=runChallengeScenario('hands-off'),recruit=runChallengeScenario('recruit-only');
  assert.equal(idle.phase,'lost');assert.ok(idle.seconds<240);assert.ok(idle.maxEnemyAttack>=10);
  assert.equal(recruit.phase,'lost');assert.ok(recruit.trained>20);assert.ok(recruit.seconds<360);
});

test('paid development, manual siege interception and a Strategist counterattack can win',()=>{
  const result=runChallengeScenario('guided');
  assert.ok(result.manualOrders>0);assert.ok(result.trained>10);
  assert.equal(result.phase,'won');assert.ok(result.keepHP.blue>0);assert.equal(result.keepHP.red,0);
});
