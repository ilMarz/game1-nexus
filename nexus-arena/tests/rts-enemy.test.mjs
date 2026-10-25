import test from 'node:test';
import assert from 'node:assert/strict';
import {SiegeBattle,TROOPS,BUILDINGS} from '../rts-sim.js';
import {summarizeBattle,localRtsPlan} from '../rts-plans.js';
import {buildWarlordRequest} from '../api/warlord.js';
const plan={passage:'south_bridge',composition:'balanced',objective:'keep',maneuver:'assault',stance:'balanced',development:'wait'};
const advance=(b,t)=>{for(let i=0;i<t*20;i++)b.tick(.05);};
function battle(){const b=new SiegeBattle();b.phase='combat';b.externalCommander=true;return b;}
test('an unthreatened enemy does not park its entire army or wait for an impossible fortress assault',()=>{
  const b=battle();b.applyEnemyPlan({...plan,maneuver:'defend',stance:'defensive'});assert.equal(b.enemyPlan.maneuver,'assault');assert.equal(b.enemyPlan.stance,'offensive');assert.equal(b.enemyPlan.objective,'keep');assert.equal(b.tactics.red.defense,3);assert.equal(b.tactics.red.rally,11);
});
test('routine five-second replans cannot keep switching the rally route before a force launches',()=>{
  const b=battle();let crossed=false;b.applyEnemyPlan(plan);for(let time=0;time<30;time+=5){b.applyEnemyPlan({...plan,passage:time%10?'north_ford':'south_bridge'});advance(b,5);crossed||=b.units.some(u=>u.team==='red'&&u.x<550);}
  assert.ok(b.wave>=1);assert.ok(crossed);assert.equal(b.enemyPlan.passage,'south_bridge');
});
test('an actual emergency interrupts commitment and recalls the enemy defenders',()=>{
  const b=battle();b.applyEnemyPlan(plan);advance(b,10);b.spawn('infantry','blue',1000,420);b.applyEnemyPlan({...plan,maneuver:'defend',passage:'north_bridge'});assert.equal(b.enemyPlan.maneuver,'defend');assert.equal(b.tactics.red.attack,0);assert.ok(b.tactics.red.emergency);
});
test('an enemy assault damages a player building through real movement and combat',()=>{
  const b=battle();b.units=b.units.filter(u=>u.team==='red');b.applyEnemyPlan(plan);const keep=b.buildings.find(u=>u.team==='blue'&&u.type==='keep');advance(b,55);assert.ok(keep.hp<keep.maxHp);assert.ok(b.wave>=1);
});
test('enemy development uses its own resources, normal queues and construction time',()=>{
  const b=battle(),gold=b.gold,wood=b.wood;b.buildings=b.buildings.filter(e=>e.team==='blue'||e.type!=='farm');b.applyEnemyPlan({...plan,development:'build_farm'});b.tick(.05);const farm=b.buildings.at(-1);assert.equal(farm.team,'red');assert.ok(farm.x>=715);assert.equal(b.enemyGold,600-BUILDINGS.farm.gold);assert.ok(farm.remaining>0);assert.equal(b.gold,gold);assert.equal(b.wood,wood);advance(b,8.1);assert.equal(farm.remaining,0);
  const c=battle();c.applyEnemyPlan({...plan,development:'train_knight'});c.tick(.05);assert.equal(c.enemyQueue[0].type,'knight');assert.equal(c.enemyGold,600-TROOPS.knight.gold);const population=c.units.filter(u=>u.team==='red').length;advance(c,TROOPS.knight.time+.1);assert.equal(c.units.filter(u=>u.team==='red').length,population+1);
});
test('enemy housing and capacity follow the same rules as the player',()=>{
  const b=battle();while(b.units.filter(u=>u.team==='red').length<30)b.spawn('infantry','red',1000,100);assert.match(b.train('knight',true,'red'),/completo/);b.applyEnemyPlan({...plan,development:'build_house'});b.tick(.05);assert.equal(b.capFor('red'),30);advance(b,7.1);assert.equal(b.capFor('red'),40);assert.equal(b.train('knight',true,'red'),null);assert.equal(b.enemyQueue[0].remaining,TROOPS.knight.time);
});
test('development-only replans preserve movement paths and actual ongoing unit orders',()=>{
  const b=battle();b.applyEnemyPlan(plan);const u=b.units.find(u=>u.team==='red');const order=u.order;u.path=[{x:900,y:400}];b.applyEnemyPlan({...plan,development:'train_archer'});assert.equal(u.order,order);assert.equal(u.path.length,1);
});
test('enemy telemetry contains its own funds and queue, and Jev chooses a paid development action',()=>{
  const b=battle();b.enemyGold=100;b.enemyWood=50;b.train('knight',true,'red');const snapshot=summarizeBattle(b,'red');assert.equal(snapshot.gold,100-TROOPS.knight.gold);assert.equal(snapshot.wood,50-TROOPS.knight.wood);assert.equal(snapshot.queue[0].type,'knight');assert.equal(b.gold,320);const request=buildWarlordRequest(snapshot);assert.ok(request.questions.development);assert.equal(request.state.nextReinforcements,null);assert.ok(localRtsPlan(snapshot).development);
});
