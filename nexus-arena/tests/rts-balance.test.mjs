import test from 'node:test';
import assert from 'node:assert/strict';
import {SiegeBattle} from '../rts-sim.js';
import {buildWarlordRequest,parseWarlordAnswer} from '../api/warlord.js';
import {summarizeBattle,normalizeRtsPlan} from '../rts-plans.js';
import {describeAdvisor} from '../rts-advisor.js';
const plan={passage:'north_bridge',composition:'balanced',objective:'barracks',maneuver:'assault',stance:'balanced'};
function battle(){const b=new SiegeBattle();b.phase='combat';b.allyEnabled=true;b.nextWave=10000;return b;}
const advance=(b,seconds)=>{for(let i=0;i<seconds*20;i++)b.tick(.05);};
function gather(b,team='blue'){for(const u of b.units.filter(u=>u.team===team&&u.duty==='rally')){u.x=team==='blue'?440:760;u.y=225;}b.balanceArmy(team);}

test('both commanders reserve a stable garrison while a gathered cohort attacks',()=>{
  const b=battle();for(const team of ['blue','red']){b.applyCommanderPlan(team,plan);assert.equal(b.tactics[team].defense,3);assert.equal(b.tactics[team].rally,team==='red'?11:5);gather(b,team);assert.equal(b.tactics[team].attack,team==='red'?11:5);const guards=b.units.filter(u=>u.team===team&&u.duty==='defense').map(u=>u.id);b.balanceArmy(team);assert.deepEqual(b.units.filter(u=>u.team===team&&u.duty==='defense').map(u=>u.id),guards);}
});
test('doctrines change the allocation but even an offensive plan retains defenders',()=>{
  const counts={};for(const stance of ['offensive','balanced','defensive']){const b=battle();b.applyAllyPlan({...plan,stance});counts[stance]=b.tactics.blue.defense;}
  assert.deepEqual(counts,{offensive:2,balanced:3,defensive:5});assert.equal(normalizeRtsPlan({...plan,stance:'reckless'}),null);
});
test('unsupported soldiers do not trickle into a fortress; enough troops launch together',()=>{
  const b=battle();b.applyAllyPlan({...plan,objective:'keep'});gather(b);assert.equal(b.tactics.blue.attack,0);assert.equal(b.tactics.blue.rally,5);b.spawn('infantry','blue',440,225);b.spawn('knight','blue',440,245);b.balanceArmy('blue');gather(b);assert.equal(b.tactics.blue.attack,6);assert.equal(b.tactics.blue.defense,4);
});
test('a home emergency recalls auto troops without replacing a human target order',()=>{
  const b=battle(),manual=b.units.find(u=>u.team==='blue'),keep=b.buildings.find(u=>u.team==='red'&&u.type==='keep');b.command([manual.id],'target',keep.x,keep.y,keep.id);const order=manual.order;b.applyAllyPlan({...plan,stance:'offensive'});gather(b);assert.ok(b.tactics.blue.attack>0);const raider=b.spawn('infantry','red',250,420);b.balanceArmy('blue');assert.ok(b.tactics.blue.emergency);assert.equal(b.tactics.blue.attack,0);assert.equal(b.tactics.blue.defense,7);assert.equal(manual.order,order);raider.hp=0;b.time+=5;b.balanceArmy('blue');assert.ok(b.tactics.blue.emergency);b.time+=2;b.balanceArmy('blue');assert.equal(b.tactics.blue.emergency,false);assert.ok(b.tactics.blue.rally>0);
});
test('the garrison intercepts a nearby raider instead of waiting for melee range',()=>{
  const b=battle();b.units=[];const guard=b.spawn('infantry','blue',245,380),raider=b.spawn('infantry','red',310,450);b.applyAllyPlan({...plan,maneuver:'defend'});const before=Math.hypot(guard.x-raider.x,guard.y-raider.y);advance(b,.5);assert.ok(Math.hypot(guard.x-raider.x,guard.y-raider.y)<before);assert.equal(guard.duty,'defense');
});
test('heavy assault losses trigger regrouping instead of feeding the last soldier forward',()=>{
  const b=battle();b.applyAllyPlan(plan);gather(b);const attackers=b.units.filter(u=>u.duty==='attack');for(const u of attackers.slice(0,3))u.hp=0;b.balanceArmy('blue');assert.equal(b.tactics.blue.attack,0);assert.ok(b.tactics.blue.rally>0);assert.ok(b.tactics.blue.regroupUntil>b.time);
});
test('wounded auto troops retreat and heal safely on either side, manual troops are never recalled',()=>{
  for(const team of ['blue','red']){const b=battle();b.units=[];const x=team==='blue'?220:980,u=b.spawn('infantry',team,x,380);u.hp=20;b.applyCommanderPlan(team,plan);assert.equal(u.duty,'recover');assert.equal(u.order.mode,'move');advance(b,15);assert.ok(u.hp>80);assert.notEqual(u.duty,'recover');}
  const b=battle(),u=b.units.find(u=>u.team==='blue');u.hp=10;b.command([u.id],'move',450,225);const order=u.order;b.applyAllyPlan(plan);assert.equal(u.order,order);assert.equal(u.duty,'manual');
});
test('recent hits and nearby hostiles prevent safe-base healing',()=>{
  const b=battle();b.units=[];const u=b.spawn('infantry','blue',220,380);u.hp=40;u.lastHit=0;advance(b,5);assert.equal(u.hp,40);const foe=b.spawn('ram','red',400,450);advance(b,2);assert.equal(u.hp,40);foe.hp=0;advance(b,1);assert.ok(u.hp>40);
});
test('enemy income follows its actual farms and farm losses reduce production',()=>{
  const intact=battle();intact.nextWave=10000;const gold=intact.enemyGold,wood=intact.enemyWood;advance(intact,5.1);assert.equal(intact.enemyGold,gold+27);assert.equal(intact.enemyWood,wood+44);
  const raided=battle();raided.nextWave=10000;raided.buildings.find(b=>b.team==='red'&&b.type==='farm').hp=0;advance(raided,5.1);assert.equal(raided.enemyGold,gold+22);assert.equal(raided.enemyWood,wood+32);
});

test('the provider explicitly chooses a validated doctrine; incomplete live answers are rejected',()=>{
  const req=buildWarlordRequest(summarizeBattle(battle(),'blue'));assert.ok(req.questions.stance);assert.ok(req.state.front);const answers=Object.fromEntries(['passage','objective','maneuver','stance'].map(k=>[k,{type:'choice',choice:plan[k],confidence:.8}]));assert.equal(parseWarlordAnswer({answers},req.questions.maneuver.criteria,'blue').stance,'balanced');delete answers.stance;assert.equal(parseWarlordAnswer({answers},req.questions.maneuver.criteria,'blue'),null);
});
test('advisor reports actual reserves and gathering instead of claiming an attack already underway',()=>{
  const b=battle();b.applyAllyPlan({...plan,objective:'keep'});const report=describeAdvisor(b,{plan:b.allyPlan},'blue');assert.match(report,/Raduno 5 soldati/);assert.match(report,/3 in difesa/);assert.match(report,/0 in attacco/);assert.doesNotMatch(report,/Ho ordinato un assalto/);
});
