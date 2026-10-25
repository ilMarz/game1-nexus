import test from 'node:test';
import assert from 'node:assert/strict';
import {SiegeBattle} from '../rts-sim.js';
import {PASSAGES,walkable,findPath,terrainAt} from '../rts-terrain.js';
import {normalizeRtsPlan,localRtsPlan,summarizeBattle,forceForWave} from '../rts-plans.js';

test('all five crossings are reachable; infantry takes the ordered crossing in either direction',()=>{
  for(const p of PASSAGES)for(const direction of [1,-1]){
    const b=new SiegeBattle();b.units=[];b.buildings=[];const u=b.spawn('infantry','blue',direction===1?450:750,p.y);u.route=p.id;const end={x:direction===1?750:450,y:p.y};let crossed=false;
    for(let i=0;i<800;i++){b.move(u,end,.05);assert.ok(walkable(u.x,u.y,'infantry'));if(u.x>555&&u.x<645){assert.ok(Math.abs(u.y-p.y)<p.half);crossed=true;}}
    assert.ok(crossed,p.id);assert.ok(Math.hypot(u.x-end.x,u.y-end.y)<10,p.id);
  }
});
test('rams cannot path through fords or ruins, but can cross both full bridges',()=>{
  for(const p of PASSAGES){const route=findPath({x:450,y:p.y},{x:750,y:p.y},'ram',[],p.id);assert.equal(route.length>0,p.siege,p.id);assert.equal(walkable(600,p.y,'ram'),p.siege);}
});
test('cliffs, buildings and river banks are real navigation obstacles',()=>{
  assert.equal(walkable(470,328),false);assert.equal(walkable(600,300),false);
  const route=findPath({x:350,y:328},{x:520,y:328});assert.ok(route.length);for(const p of route)assert.ok(walkable(p.x,p.y));assert.ok(route.some(p=>Math.abs(p.y-328)>35));
  const b=new SiegeBattle();assert.match(b.canBuild('tower',470,328),/costone/);assert.match(b.canBuild('tower',405,463),/bosco/);
});
test('forest cover reduces actual arrow damage; hills increase downhill damage',()=>{
  const b=new SiegeBattle();const archer=b.spawn('archer','blue',300,500),flat=b.spawn('infantry','red',300,600),woods=b.spawn('infantry','red',405,463);
  b.damage(archer,flat);b.damage(archer,woods);assert.ok(Math.abs((110-woods.hp)/(110-flat.hp)-.6)<1e-9);
  const hill=b.spawn('archer','blue',425,178),plain=b.spawn('infantry','red',425,348);b.damage(hill,plain);assert.ok(Math.abs(110-plain.hp-13.8)<1e-9);
});
test('an archer actually reaches farther from a hill than from the plain',()=>{
  for(const [x,hit]of [[425,true],[310,false]]){const b=new SiegeBattle();b.units=[];b.buildings=[];const archer=b.spawn('archer','blue',x,178),foe=b.spawn('infantry','red',x,348);archer.order={mode:'hold'};foe.order={mode:'hold'};b.phase='combat';b.nextWave=10000;b.tick(.05);assert.equal(foe.hp<110,hit);}
});
test('terrain slows movement and acceleration avoids instant full speed',()=>{
  assert.ok(terrainAt(405,463).speed<terrainAt(300,500).speed);assert.ok(terrainAt(600,100).speed<terrainAt(600,225).speed);
  const b=new SiegeBattle();b.units=[];b.buildings=[];const u=b.spawn('infantry','blue',200,180);b.move(u,{x:450,y:180},.05);assert.ok(u.vx>0&&u.vx<56);assert.ok(Math.hypot(u.x-200,u.y-180)<56*.05);
});
test('new Jev orders preserve existing unit identity, health and position',()=>{
  const b=new SiegeBattle(),red=b.units.filter(u=>u.team==='red');red[0].hp=43;const previous=red.map(u=>({id:u.id,type:u.type,hp:u.hp,x:u.x,y:u.y}));
  const plan={passage:'north_ford',composition:'pikes',objective:'barracks',maneuver:'flank'};assert.ok(b.applyEnemyPlan(plan));
  for(let i=0;i<red.length;i++){assert.deepEqual(Object.fromEntries(Object.keys(previous[i]).map(k=>[k,red[i][k]])),previous[i]);assert.ok(['defense','rally'].includes(red[i].duty));if(red[i].duty==='rally')assert.equal(red[i].route,'north_ford');}
  const ram=b.spawn('ram','red',900,600);b.enemyOrder(ram);assert.equal(ram.route,'south_bridge');
});
test('defensive orders protect home buildings on the eastern side',()=>{
  const b=new SiegeBattle();b.spawn('infantry','blue',1000,420);b.applyEnemyPlan({passage:'south_bridge',composition:'archers',objective:'crossing',maneuver:'defend'});
  for(const u of b.units.filter(u=>u.team==='red')){assert.equal(u.order.mode,'guard');assert.equal(u.duty,'defense');assert.ok(u.order.x>650);assert.ok(Math.hypot(u.order.x-1045,u.order.y-380)<160);}
});
test('local fallback observes weak crossings and rejects unimplemented or incompatible plans',()=>{
  const b=new SiegeBattle(),before=localRtsPlan(summarizeBattle(b));for(let i=0;i<20;i++)b.spawn('archer','blue',510,PASSAGES.find(p=>p.id===before.passage).y);const after=localRtsPlan(summarizeBattle(b));assert.notEqual(before.passage,after.passage);
  assert.equal(normalizeRtsPlan({...before,passage:'teleport'}),null);assert.equal(normalizeRtsPlan({...before,passage:'ruins',composition:'siege'}),null);assert.equal(forceForWave(100),8);
});
test('a group of 25 units reaches its formation across a bridge without overlapping terrain obstacles',()=>{
  const b=new SiegeBattle();b.buildings=[];b.units=[];const ids=[];for(let i=0;i<25;i++)ids.push(b.spawn('infantry','blue',420+i%5*20,180+Math.floor(i/5)*20).id);
  b.command(ids,'move',780,225);for(let i=0;i<1800;i++)for(const u of b.units)b.move(u,u.order,1/30);
  for(const u of b.units){assert.ok(walkable(u.x,u.y,u.type));assert.ok(Math.hypot(u.x-u.order.x,u.y-u.order.y)<12);}
});
test('a confirmed plan preserves ongoing paths and idle units stop their walking animation state',()=>{
  const b=new SiegeBattle(),plan={passage:'south_bridge',composition:'balanced',objective:'keep',maneuver:'assault'};b.applyEnemyPlan(plan);const red=b.units.find(u=>u.team==='red');const order=red.order;red.path=[{x:800,y:535}];b.applyEnemyPlan(plan);assert.equal(red.order,order);assert.equal(red.path.length,1);
  const blue=b.units.find(u=>u.team==='blue');blue.vx=50;blue.vy=10;blue.order={mode:'hold'};b.phase='combat';b.tick(.05);assert.equal(blue.vx,0);assert.equal(blue.vy,0);
});
