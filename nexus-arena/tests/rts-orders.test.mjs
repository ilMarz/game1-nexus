import test from 'node:test';
import assert from 'node:assert/strict';
import {SiegeBattle,TROOPS,BUILDINGS} from '../rts-sim.js';
import {DualRtsCommanders} from '../rts-director.js';
import {AdvisorJournal} from '../rts-journal.js';
import {developmentNeed} from '../rts-orders.js';
import {summarizeBattle,localRtsPlan} from '../rts-plans.js';
import {sanitizeRtsSnapshot,buildWarlordRequest,parseWarlordAnswer} from '../api/warlord.js';
const plan={passage:'north_bridge',composition:'balanced',objective:'barracks',maneuver:'assault',stance:'balanced'};
function battle(){const b=new SiegeBattle();b.phase='combat';b.allyEnabled=true;b.nextWave=10000;b.applyAllyPlan(plan);return b;}
const advance=(b,t)=>{for(let i=0;i<t*20;i++)b.tick(.05);};
test('defend recalls only automatic troops, attack reallocates more force, wait holds positions',()=>{
  const b=battle(),manual=b.units.find(u=>u.team==='blue');b.command([manual.id],'move',400,100);const order=manual.order;
  b.setAdvisorOrder('defend');assert.ok(b.units.filter(u=>u.team==='blue'&&u!==manual).every(u=>u.duty==='defense'));assert.equal(manual.order,order);
  b.setAdvisorOrder('attack');assert.equal(b.tactics.blue.defense,2);assert.ok(b.tactics.blue.rally+b.tactics.blue.attack>0);
  b.setAdvisorOrder('wait');const units=b.units.filter(u=>u.team==='blue'&&u!==manual),positions=units.map(u=>[u.x,u.y]);advance(b,2);assert.deepEqual(units.map(u=>[u.x,u.y]),positions);assert.ok(units.every(u=>u.order.mode==='hold'));assert.equal(manual.order,order);
});
test('manual autonomy remains default and model development cannot spend without delegation',()=>{
  const b=battle(),gold=b.gold,wood=b.wood;b.applyAllyPlan({...plan,development:'train_ram'});advance(b,1);assert.equal(b.advisorOrder,'balanced');assert.equal(b.gold,gold);assert.equal(b.wood,wood);assert.equal(b.queue.length,0);assert.equal(b.buildings.length,8);
});
test('development trains once per accepted plan, pays costs, and takes real training time',()=>{
  const b=battle();b.setAdvisorOrder('develop');b.applyAllyPlan({...plan,development:'train_archer'});const gold=b.gold,wood=b.wood;b.tick(.05);assert.equal(b.gold,gold-TROOPS.archer.gold);assert.equal(b.wood,wood-TROOPS.archer.wood);assert.equal(b.queue[0].source,'advisor');advance(b,1);assert.equal(b.queue.length,1);assert.equal(b.population,8);advance(b,3.1);assert.equal(b.queue.length,0);assert.equal(b.population,9);
});
test('development creates a legal building, spends once, and waits for its construction',()=>{
  const b=battle();b.setAdvisorOrder('develop');b.applyAllyPlan({...plan,development:'build_farm'});const gold=b.gold;b.tick(.05);const farm=b.buildings.at(-1);assert.equal(farm.type,'farm');assert.equal(farm.team,'blue');assert.ok(farm.x<=485);assert.ok(farm.remaining>0);assert.equal(b.gold,gold-BUILDINGS.farm.gold);assert.equal(b.developmentPending,false);advance(b,8.1);assert.equal(farm.remaining,0);assert.equal(b.buildings.filter(u=>u.team==='blue'&&u.type==='farm').length,2);
});
test('new priority stops pending spending but retains already paid queues and cantieri',()=>{
  const b=battle();b.setAdvisorOrder('develop');b.applyAllyPlan({...plan,development:'train_archer'});b.tick(.05);const queued=b.queue[0],gold=b.gold;b.applyAllyPlan({...plan,development:'build_tower'});b.setAdvisorOrder('wait');advance(b,1);assert.equal(b.gold,gold);assert.equal(b.buildings.length,8);assert.equal(b.queue[0],queued);
});
test('unaffordable actions wait, queue limits hold, repeated barracks are not built',()=>{
  const b=battle();b.setAdvisorOrder('develop');b.applyAllyPlan({...plan,development:'build_farm'});b.gold=0;b.wood=0;b.tick(.05);assert.equal(b.buildings.length,8);assert.match(b.developmentStatus,/risorse/);b.gold=1000;b.wood=1000;b.time=3;b.applyAllyPlan({...plan,development:'build_barracks'});b.tick(.05);assert.equal(b.buildings.length,8);assert.match(b.developmentStatus,/già presente/);
  b.train('infantry');b.train('archer');b.applyAllyPlan({...plan,development:'train_knight'});b.time=6;b.tick(.05);assert.equal(b.queue.length,2);
});
test('snapshot validates priorities; development request exposes a bounded paid action choice only when delegated',()=>{
  const b=battle();b.setAdvisorOrder('develop');const snapshot=sanitizeRtsSnapshot(summarizeBattle(b,'blue'));assert.equal(snapshot.advisorOrder,'develop');assert.equal(sanitizeRtsSnapshot({...snapshot,advisorOrder:'infinite_gold'}),null);const req=buildWarlordRequest(snapshot);assert.ok(req.questions.development);assert.equal(req.state.playerPriority,'develop');assert.ok(req.state.development.troopCosts.ram.gold>0);const answers=Object.fromEntries(['passage','objective','maneuver','stance'].map(k=>[k,{type:'choice',choice:plan[k],confidence:.8}]));assert.equal(parseWarlordAnswer({answers},req.questions.maneuver.criteria,'blue',true),null);answers.development={type:'choice',choice:'train_knight',confidence:.8};assert.equal(parseWarlordAnswer({answers},req.questions.maneuver.criteria,'blue',true).development,'train_knight');answers.development.choice='spawn_free_army';assert.equal(parseWarlordAnswer({answers},req.questions.maneuver.criteria,'blue',true),null);assert.equal(buildWarlordRequest({...snapshot,advisorOrder:'wait'}).questions.development,undefined);
});
test('local needs prefer missing infrastructure, housing and counters to observed rams',()=>{
  const b=battle();b.buildings=b.buildings.filter(u=>u.team!=='blue'||u.type!=='barracks');assert.equal(developmentNeed(summarizeBattle(b,'blue')),'build_barracks');b.addBuilding('barracks','blue',230,245);b.spawn('ram','red',300,440);b.spawn('ram','red',320,440);assert.equal(developmentNeed(summarizeBattle(b,'blue')),'train_knight');b.setAdvisorOrder('develop');assert.ok(localRtsPlan(summarizeBattle(b,'blue')).development);
});
test('priority changes discard delayed plans and preserve the provider minimum interval',async()=>{
  let complete;const d=new DualRtsCommanders(async()=>new Promise(resolve=>{complete=()=>resolve({ok:true,json:async()=>({...plan,source:'typesafe',confidence:.8,latencyMs:10})});}));const b=battle();d.ally.start(b);d.setAdvisorOrder(b,'wait');complete();await new Promise(resolve=>setImmediate(resolve));assert.equal(d.ally.pending,null);assert.equal(d.ally.busy,false);assert.equal(d.ally.nextAt,5);assert.ok(b.units.filter(u=>u.team==='blue').every(u=>u.duty==='waiting'));
});
test('the journal acknowledges new instructions without promising an advance during wait',()=>{
  const b=battle(),j=new AdvisorJournal(),a={plan,source:'typesafe'};j.update(b,a);b.setAdvisorOrder('wait');j.update(b,a);assert.match(j.messages.at(-1).text,/mantengo ferme/);b.setAdvisorOrder('develop');j.update(b,a);assert.ok(j.messages.some(m=>m.text.includes('nostre risorse')));
});
