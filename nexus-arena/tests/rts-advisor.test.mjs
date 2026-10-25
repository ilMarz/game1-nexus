import test from 'node:test';
import assert from 'node:assert/strict';
import {SiegeBattle} from '../rts-sim.js';
import {describeAdvisor} from '../rts-advisor.js';
const plan={passage:'north_bridge',composition:'balanced',objective:'barracks',maneuver:'assault'};
function active(){const b=new SiegeBattle();b.phase='combat';b.allyEnabled=true;b.applyAllyPlan(plan);for(const u of b.units.filter(u=>u.duty==='rally')){u.x=440;u.y=225;}b.balanceArmy('blue');return b;}
test('the allied report describes the real applied target rather than inventing a victory',()=>{
  const b=active(),report=describeAdvisor(b,{plan},'blue');assert.match(report,/caserma avversaria/);assert.match(report,/Ponte della corona/);assert.doesNotMatch(report,/vinta|caduta/);
});
test('the report respects manual control even while an advisor retains an attack plan',()=>{
  const b=active();b.takeControl(b.units.filter(u=>u.team==='blue').map(u=>u.id));const report=describeAdvisor(b,{plan},'blue');assert.match(report,/Non cambio i tuoi ordini/);assert.doesNotMatch(report,/assalto|abbattere/);
});
test('mixed control reports only automated targets and explicitly leaves human troops alone',()=>{
  const b=active(),u=b.units.find(u=>u.team==='blue'),farm=b.buildings.find(b=>b.team==='red'&&b.type==='farm');b.command([u.id],'target',farm.x,farm.y,farm.id);
  const report=describeAdvisor(b,{plan},'blue');assert.match(report,/caserma avversaria/);assert.match(report,/Lascio 1 soldato ai tuoi ordini/);assert.doesNotMatch(report,/segheria avversaria/);
});
test('a destroyed requested target falls back to the actual keep in the narration',()=>{
  const b=active();b.buildings=b.buildings.filter(b=>!(b.team==='red'&&b.type==='barracks'));b.applyAllyPlan(plan);const report=describeAdvisor(b,{plan},'blue');assert.match(report,/fortezza avversaria/);assert.doesNotMatch(report,/caserma avversaria/);
});
test('defense mentions hill archers only when those orders actually exist',()=>{
  const b=active(),defense={...plan,maneuver:'defend'};b.applyAllyPlan(defense);assert.doesNotMatch(describeAdvisor(b,{plan:defense},'blue'),/arcieri.*altur/);
  b.units=b.units.filter(u=>u.team!=='blue'||u.type!=='archer');assert.doesNotMatch(describeAdvisor(b,{plan:defense},'blue'),/arcieri/);
});
test('rams diverted from an infantry ford are described on their actual usable bridge',()=>{
  const b=active();b.units=[];b.tactics.blue={};for(let i=0;i<7;i++)b.spawn('infantry','blue',440,100+i*8);b.spawn('ram','blue',440,180);const ford={...plan,passage:'north_ford'};b.applyAllyPlan(ford);const report=describeAdvisor(b,{plan:ford},'blue');assert.match(report,/attraverso il Guado/);assert.match(report,/ponte largo compatibile/);assert.equal(b.units.find(u=>u.type==='ram').route,'north_bridge');
});
test('the rival reports future reinforcements honestly and stops promising them after barracks loss',()=>{
  const b=active();b.applyEnemyPlan(plan);assert.match(describeAdvisor(b,{plan},'red'),/prossimi rinforzi/);b.buildings=b.buildings.filter(b=>!(b.team==='red'&&b.type==='barracks'));const report=describeAdvisor(b,{plan},'red');assert.match(report,/caserma è distrutta/);assert.doesNotMatch(report,/prossimi rinforzi/);
});
test('paused, disabled and ended battles receive truthful status instead of ongoing movement claims',()=>{
  const b=active();assert.match(describeAdvisor(b,{plan},'blue',{paused:true}),/^La battaglia è in pausa/);assert.match(describeAdvisor(b,{plan},'blue',{enabled:false}),/guida è sospesa/);b.phase='won';assert.match(describeAdvisor(b,{plan},'blue'),/vinta/);assert.match(describeAdvisor(b,{plan},'red'),/nostra fortezza è caduta/);
});
test('a reserved queue is never narrated as automatically available troops',()=>{
  const b=active();b.units=b.units.filter(u=>u.team!=='blue');b.train('knight',false);assert.match(describeAdvisor(b,{plan},'blue'),/Non ho truppe disponibili/);b.queue=[];b.train('archer',true);assert.match(describeAdvisor(b,{plan},'blue'),/addestramento/);
});
