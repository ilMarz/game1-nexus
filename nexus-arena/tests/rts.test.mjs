import test from 'node:test';
import assert from 'node:assert/strict';
import {SiegeBattle,BRIDGES,TROOPS} from '../rts-sim.js';

const advance=(b,seconds)=>{for(let i=0;i<seconds*20;i++)b.tick(.05);};
test('deployment moves human troops on friendly land without income, recruitment or invasions',()=>{
  const b=new SiegeBattle(),u=b.units.find(u=>u.team==='blue');b.train('archer');b.command([u.id],'move',900,180);advance(b,15);
  assert.ok(u.x<=500);assert.ok(u.x>400);assert.equal(b.time,0);assert.equal(b.gold,280);assert.equal(b.queue[0].remaining,4);assert.equal(b.wave,0);
});
test('a marching soldier crosses the river only over a bridge and reaches either bank',()=>{
  for(const [start,end] of [[{x:300,y:380},{x:950,y:380}],[{x:900,y:600},{x:280,y:170}]]){
    const b=new SiegeBattle();b.buildings=[];b.units=[];const u=b.spawn('infantry','blue',start.x,start.y);
    for(let i=0;i<2000;i++){b.move(u,end,.05);if(u.x>555&&u.x<645)assert.ok(BRIDGES.some(y=>Math.abs(u.y-y)<53));}
    assert.ok(Math.hypot(u.x-end.x,u.y-end.y)<5);
  }
});
test('recruiting spends resources once, completes in combat and respects capacity',()=>{
  const b=new SiegeBattle();assert.equal(b.train('ram'),null);assert.equal(b.gold,220);assert.equal(b.wood,140);
  b.phase='combat';advance(b,8.1);assert.equal(b.units.filter(u=>u.team==='blue'&&u.type==='ram').length,1);assert.equal(b.queue.length,0);
  b.gold=100000;b.wood=100000;while(b.population<30)b.spawn('pike','blue',100,100);assert.match(b.train('pike'),/completo/);
});
test('construction rejects overlap and enemy land; completed buildings change income and capacity',()=>{
  const b=new SiegeBattle();assert.match(b.build('tower',155,380),/vicino/);assert.match(b.build('house',900,600),/territorio/);
  assert.equal(b.build('house',100,180),null);assert.equal(b.cap,30);b.phase='combat';advance(b,7.1);assert.equal(b.cap,40);
  const before=b.wood;assert.equal(b.build('farm',270,600),null);advance(b,15);assert.ok(b.wood>before-35);
});
test('occupying a bridge captures income, while contested occupation cannot capture',()=>{
  const b=new SiegeBattle();b.units=[];b.spawn('infantry','blue',600,225).order={mode:'hold'};b.phase='combat';advance(b,5.1);assert.equal(b.sites.find(s=>s.id==='north_bridge').owner,'blue');assert.equal(b.gold,337);advance(b,5);assert.equal(b.gold,369);
  const c=new SiegeBattle();c.units=[];c.spawn('ram','blue',600,225).order={mode:'hold'};c.phase='combat';advance(c,6);assert.equal(c.sites.find(s=>s.id==='north_bridge').owner,null);
  const d=new SiegeBattle();d.units=[];d.spawn('infantry','blue',535,225).order={mode:'hold'};d.spawn('infantry','red',665,225).order={mode:'hold'};d.phase='combat';advance(d,6);assert.equal(d.sites.find(s=>s.id==='north_bridge').owner,null);
});
test('arieti inflict siege damage and spearmen counter them; arrows resist siege armor',()=>{
  const b=new SiegeBattle(),ram=b.spawn('ram','blue',900,380),tower=b.buildings.find(b=>b.team==='red'&&b.type==='tower');const hp=tower.hp;b.damage(ram,tower);assert.equal(hp-tower.hp,TROOPS.ram.damage*3);
  const pike=b.spawn('pike','red',900,380),archer=b.spawn('archer','red',900,380);let health=ram.hp;b.damage(pike,ram);assert.equal(health-ram.hp,TROOPS.pike.damage*2);health=ram.hp;b.damage(archer,ram);assert.ok(health-ram.hp<4);
});
test('enemy incursions follow the commander composition, crossing and target; barracks destruction stops them',()=>{
  const b=new SiegeBattle();b.externalCommander=true;b.applyEnemyPlan({passage:'south_ford',composition:'archers',objective:'economy',maneuver:'flank'});b.invade();assert.equal(b.wave,1);assert.equal(b.units.at(-1).route,'south_ford');assert.equal(b.units.at(-1).duty,'rally');assert.equal(b.units.at(-1).order.mode,'guard');assert.equal(b.units.slice(-6).filter(u=>u.type==='archer').length,3);
  b.buildings=b.buildings.filter(b=>b.team!=='red'||b.type!=='barracks');const n=b.units.length;b.invade();assert.equal(b.units.length,n);
});
test('a destroyed barracks suspends paid recruitment until a replacement is completed',()=>{
  const b=new SiegeBattle();b.train('archer');b.buildings=b.buildings.filter(b=>b.team!=='blue'||b.type!=='barracks');b.phase='combat';advance(b,8);assert.equal(b.queue[0].remaining,4);assert.match(b.train('pike'),/caserma/);
  b.addBuilding('barracks','blue',230,245,2);advance(b,6.1);assert.equal(b.queue.length,0);
});
test('destroying a keep ends the battle and freezes recruitment and income',()=>{
  for(const [team,result]of [['blue','lost'],['red','won']]){const b=new SiegeBattle();b.phase='combat';b.buildings.find(b=>b.team===team&&b.type==='keep').hp=0;b.tick(.05);assert.equal(b.phase,result);const time=b.time,gold=b.gold;advance(b,30);assert.equal(b.time,time);assert.equal(b.gold,gold);assert.match(b.train('pike'),/terminata/);}
});
test('an undefended realm can actually be invaded and lose',()=>{
  const b=new SiegeBattle();b.phase='combat';advance(b,300);assert.equal(b.phase,'lost');assert.ok(b.wave>=1);
});
test('soldiers walk around a building placed directly across their route',()=>{
  const b=new SiegeBattle();b.units=[];b.buildings=[];b.addBuilding('tower','blue',400,380);const u=b.spawn('infantry','blue',300,380);
  for(let i=0;i<800;i++)b.move(u,{x:500,y:380},.05);assert.ok(Math.hypot(u.x-500,u.y-380)<5);
});
test('a real siege can destroy the enemy fortress and win through combat',()=>{
  const b=new SiegeBattle();b.units=[];b.buildings=b.buildings.filter(b=>b.type==='keep');b.phase='combat';b.nextWave=10000;
  const keep=b.buildings.find(b=>b.team==='red');const army=[b.spawn('ram','blue',900,365),b.spawn('ram','blue',900,400)];b.command(army.map(u=>u.id),'target',keep.x,keep.y,keep.id);
  advance(b,60);assert.equal(b.phase,'won');
});
