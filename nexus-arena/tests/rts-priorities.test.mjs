import test from 'node:test';
import assert from 'node:assert/strict';
import {SiegeBattle} from '../rts-sim.js';
import {DualRtsCommanders} from '../rts-director.js';
import {describeAdvisor} from '../rts-advisor.js';
const plan={passage:'south_bridge',composition:'balanced',objective:'keep',maneuver:'defend',stance:'defensive'};
const advance=(b,t)=>{for(let i=0;i<t*20;i++)b.tick(.05);};
function field(){const b=new SiegeBattle();b.phase='combat';b.allyEnabled=true;b.nextWave=10000;b.units=b.units.filter(u=>u.team==='blue');return b;}

test('Attack immediately sends seven of eight healthy auto soldiers, without a rally or model reply',()=>{
  const b=field();b.applyAllyPlan(plan);b.setAdvisorOrder('attack');
  assert.equal(b.tactics.blue.attack,7);assert.equal(b.tactics.blue.defense,1);assert.equal(b.tactics.blue.rally,0);
  assert.ok(b.units.filter(u=>u.duty==='attack').every(u=>u.order.target&&b.entity(u.order.target).team==='red'));
  const report=describeAdvisor(b,{plan},'blue');assert.match(report,/7 in attacco/);assert.doesNotMatch(report,/Raduno/);
});
test('the majority actually crosses the river and hits a building while repeated defensive replies arrive',()=>{
  const b=field();b.buildings=b.buildings.filter(e=>e.team==='blue'||e.type!=='tower');b.applyAllyPlan({...plan,objective:'economy'});b.setAdvisorOrder('attack');
  const targets=b.buildings.filter(e=>e.team==='red');
  const attackers=b.units.filter(u=>u.duty==='attack'),positions=new Map(attackers.map(u=>[u.id,u.x]));
  for(let i=0;i<6;i++){b.applyAllyPlan({...plan,objective:'economy',passage:i%2?'north_bridge':'south_bridge'});advance(b,5);}
  assert.ok(attackers.filter(u=>u.x>650).length>=6);
  assert.ok(attackers.filter(u=>u.x>positions.get(u.id)+200).length>=6);
  assert.ok(targets.some(e=>e.hp<e.maxHp));
  assert.equal(b.allyPlan.passage,'south_bridge');
});
test('Attack does not stall on an already captured crossing or wait for a large army',()=>{
  const b=field();b.units=b.units.slice(0,2);b.sites.find(s=>s.id==='south_bridge').owner='blue';
  b.applyAllyPlan({...plan,objective:'crossing'});b.setAdvisorOrder('attack');
  assert.equal(b.tactics.blue.attack,2);assert.equal(b.tactics.blue.rally,0);assert.notEqual(b.allyPlan.objective,'crossing');
});
test('explicit Attack is not silently canceled by an intruder; Defend recalls the army immediately',()=>{
  const b=field();b.applyAllyPlan(plan);b.spawn('infantry','red',250,420);b.setAdvisorOrder('attack');
  advance(b,1);assert.ok(b.tactics.blue.attack>=6);assert.equal(b.tactics.blue.emergency,false);
  b.applyAllyPlan({...plan,passage:'north_bridge'});assert.equal(b.allyPlan.passage,'south_bridge');
  b.setAdvisorOrder('defend');assert.equal(b.tactics.blue.attack,0);assert.ok(b.units.filter(u=>u.team==='blue').every(u=>u.duty==='defense'));
});
test('manual soldiers retain their orders and delegating them during Attack sends them forward',()=>{
  const b=field();b.applyAllyPlan(plan);const u=b.units[0];b.command([u.id],'hold',u.x,u.y);const order=u.order;
  b.setAdvisorOrder('attack');assert.equal(u.order,order);assert.equal(u.duty,'manual');
  // The first unit can become the sole garrison; delegate a knight to verify joining the assault.
  const knight=b.units.find(e=>e.type==='knight');b.command([knight.id],'hold',knight.x,knight.y);b.balanceArmy('blue');
  b.delegate([knight.id]);assert.equal(knight.duty,'attack');assert.ok(knight.order.target);
});
test('new recruits join Attack immediately, and wounded soldiers can still recover',()=>{
  const b=field();b.applyAllyPlan(plan);const hurt=b.units[0];hurt.hp=20;b.setAdvisorOrder('attack');
  assert.equal(hurt.duty,'recover');assert.equal(b.tactics.blue.attack,6);
  b.train('infantry');advance(b,3.1);const recruit=b.units.find(u=>u.team==='blue'&&u.type==='infantry'&&u.id>30);
  assert.ok(recruit);assert.equal(recruit.duty,'attack');assert.ok(recruit.order.target);
});
test('Attack routes siege and escorts over the same full bridge',()=>{
  const b=field();b.spawn('ram','blue',300,460);b.applyAllyPlan({...plan,passage:'south_ford'});b.setAdvisorOrder('attack');
  assert.equal(b.allyPlan.passage,'south_bridge');assert.ok(b.units.filter(u=>u.duty==='attack').every(u=>u.route==='south_bridge'));
});
test('all priorities work before a plan exists and after resuming a suspended commander',()=>{
  const b=field();b.setAdvisorOrder('attack');assert.equal(b.tactics.blue.attack,7);
  b.setAllyEnabled(false);b.setAdvisorOrder('wait');b.setAllyEnabled(true);assert.ok(b.units.every(u=>u.order.mode==='hold'));
  b.setAdvisorOrder('defend');assert.equal(b.tactics.blue.defense,8);
  b.setAdvisorOrder('balanced');assert.notEqual(b.allyPlan.maneuver,'defend');assert.ok(b.tactics.blue.rally+b.tactics.blue.attack>0);
  b.setAdvisorOrder('develop');const gold=b.gold;b.tick(.05);assert.ok(b.gold<gold);assert.equal(b.tactics.blue.attack,0);
});
test('Wait cancels movement immediately and even a full route commitment cannot block a new priority',()=>{
  const b=field();b.applyAllyPlan(plan);b.setAdvisorOrder('attack');advance(b,2);b.setAdvisorOrder('wait');
  const positions=b.units.map(u=>[u.x,u.y]);advance(b,3);assert.deepEqual(b.units.map(u=>[u.x,u.y]),positions);
  assert.equal(b.tactics.blue.attack,0);b.setAdvisorOrder('attack');assert.equal(b.tactics.blue.attack,7);
});

test('switching an already launched balanced force to Attack starts a stable offensive commitment',()=>{
  const b=field();b.applyAllyPlan({...plan,maneuver:'assault',objective:'economy',stance:'balanced'});
  for(const u of b.units.filter(u=>u.duty==='rally')){u.x=440;u.y=535;}
  b.balanceArmy('blue');assert.ok(b.tactics.blue.launched);
  b.setAdvisorOrder('attack');assert.equal(b.tactics.blue.attack,7);assert.ok(b.tactics.blue.commitUntil>=30);
  b.applyAllyPlan({...plan,passage:'north_bridge'});assert.equal(b.allyPlan.passage,'south_bridge');
});
test('a delayed provider cannot block immediate priority execution when no previous model plan exists',async()=>{
  const b=field(),d=new DualRtsCommanders(async()=>new Promise(()=>{}));
  d.ally.start(b);d.setAdvisorOrder(b,'attack');assert.equal(b.tactics.blue.attack,7);
  assert.equal(d.ally.pending,null);assert.equal(d.ally.nextAt,3);
});
