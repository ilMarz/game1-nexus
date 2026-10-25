import test from 'node:test';
import assert from 'node:assert/strict';
import {SiegeBattle,TROOPS} from '../rts-sim.js';
import {emergencyDefense} from '../rts-balance.js';
import {AdvisorJournal} from '../rts-journal.js';
import {summarizeBattle} from '../rts-plans.js';
import {buildWarlordRequest} from '../api/warlord.js';
const plan={passage:'north_bridge',composition:'balanced',objective:'keep',maneuver:'assault',stance:'balanced'};
function raid(){const b=new SiegeBattle();b.phase='combat';b.allyEnabled=true;b.externalCommander=true;b.nextWave=10000;b.units=[];const enemy=b.spawn('ram','red',300,420);b.applyAllyPlan(plan);return {b,enemy};}
test('an understaffed home raid authorizes and pays for a defensive counter without development priority',()=>{
  const {b}=raid();const gold=b.gold,wood=b.wood;b.tick(.05);assert.equal(b.advisorOrder,'balanced');assert.ok(b.emergencyDefense.active);assert.equal(b.queue[0].type,'pike');assert.equal(b.queue[0].source,'advisor');assert.equal(b.gold,gold-TROOPS.pike.gold);assert.equal(b.wood,wood-TROOPS.pike.wood);assert.equal(b.population,0);
});
test('sufficient local defenders and distant threats do not grant emergency spending',()=>{
  const {b,enemy}=raid();for(let i=0;i<8;i++)b.spawn('pike','blue',290+i*4,400);assert.equal(emergencyDefense(b.units,b.buildings).active,false);b.tick(.05);assert.equal(b.queue.length,0);b.units=b.units.filter(u=>u.team==='red');enemy.x=900;b.tick(.05);assert.equal(b.emergencyDefense.active,false);assert.equal(b.queue.length,0);
});
test('actual health and location matter: wounded or distant troops do not count as an intact garrison',()=>{
  const {b}=raid();for(let i=0;i<8;i++)b.spawn('infantry','blue',900+i*4,400);assert.ok(emergencyDefense(b.units,b.buildings).active);for(const u of b.units.filter(u=>u.team==='blue')){u.x=310;u.hp=5;}assert.ok(emergencyDefense(b.units,b.buildings).active);
});
test('emergency permission is temporary; paid queues continue after threats disappear',()=>{
  const {b,enemy}=raid();b.tick(.05);const order=b.queue[0],gold=b.gold;enemy.hp=0;b.time=1;b.tick(.05);assert.equal(b.emergencyDefense.active,false);assert.equal(b.queue[0],order);b.time=2;b.tick(.05);assert.equal(b.gold,gold);assert.equal(b.queue.length,1);
});
test('delayed offensive development cannot buy an economy building during emergency or after permission expires',()=>{
  const {b,enemy}=raid();b.applyAllyPlan({...plan,development:'build_farm'});b.tick(.05);assert.equal(b.buildings.length,8);assert.equal(b.queue[0].type,'pike');enemy.hp=0;b.time=2;b.applyAllyPlan({...plan,development:'build_tower'});const gold=b.gold;b.tick(.05);assert.equal(b.buildings.length,8);assert.equal(b.gold,gold);
});
test('manual units are untouched, wait still permits emergency defense spending, and suspended Jev cannot spend',()=>{
  const {b}=raid();const manual=b.spawn('infantry','blue',950,300);b.command([manual.id],'move',1000,350);const order=manual.order;b.setAdvisorOrder('wait');b.tick(.05);assert.equal(manual.order,order);assert.equal(manual.control,'manual');assert.equal(b.queue[0].type,'pike');
  const {b:disabled}=raid();disabled.setAllyEnabled(false);disabled.tick(.05);assert.equal(disabled.queue.length,0);assert.equal(disabled.emergencyDefense.active,false);
});
test('Jev receives only defensive development choices in an emergency, without trusting a client permission flag',()=>{
  const {b}=raid();const req=buildWarlordRequest(summarizeBattle(b,'blue'));assert.ok(req.state.emergencyDefense.active);assert.ok(req.questions.development.criteria.train_pike);assert.ok(req.questions.development.criteria.build_tower);assert.equal(req.questions.development.criteria.build_farm,undefined);assert.equal(req.questions.development.criteria.train_ram,undefined);
  const snapshot=summarizeBattle(new SiegeBattle(),'blue');snapshot.emergencyDefense={active:true};assert.equal(buildWarlordRequest(snapshot).questions.development,undefined);
});
test('emergency production can restore missing barracks or start a defensive tower with normal costs and times',()=>{
  const {b}=raid();b.buildings=b.buildings.filter(e=>e.team!=='blue'||e.type!=='barracks');b.tick(.05);assert.equal(b.buildings.at(-1).type,'barracks');assert.ok(b.buildings.at(-1).remaining>0);
  const {b:tower}=raid();tower.applyAllyPlan({...plan,development:'build_tower'});const gold=tower.gold;tower.tick(.05);assert.equal(tower.buildings.at(-1).type,'tower');assert.ok(tower.buildings.at(-1).remaining>0);assert.equal(tower.gold,gold-80);
});
test('report announces emergency delegation and its end once, without rewriting the player priority',()=>{
  const {b,enemy}=raid(),j=new AdvisorJournal(),a={plan,source:'typesafe'};j.update(b,a);b.tick(.05);j.update(b,a);assert.ok(j.messages.some(m=>m.text.includes('attivo la delega')));enemy.hp=0;b.tick(.05);j.update(b,a);assert.ok(j.messages.some(m=>m.text.includes('delega d’emergenza è terminata')));assert.equal(b.advisorOrder,'balanced');
});
