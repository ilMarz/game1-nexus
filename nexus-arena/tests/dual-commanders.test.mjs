import test from 'node:test';
import assert from 'node:assert/strict';
import {SiegeBattle} from '../rts-sim.js';
import {DualRtsCommanders} from '../rts-director.js';
import {summarizeBattle} from '../rts-plans.js';
import handler,{sanitizeRtsSnapshot,buildWarlordRequest,parseWarlordAnswer} from '../api/warlord.js';
const bluePlan={passage:'north_bridge',composition:'balanced',objective:'barracks',maneuver:'flank',stance:'balanced'};
const redPlan={passage:'south_bridge',composition:'siege',objective:'economy',maneuver:'assault',stance:'balanced'};
const reply=(team,plan=team==='blue'?bluePlan:redPlan)=>({...plan,source:'typesafe',commanderTeam:team,confidence:.8,latencyMs:100});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const advance=(b,seconds)=>{for(let i=0;i<seconds*20;i++)b.tick(.05);};
const response=()=>({statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}});

test('allied strategy targets red buildings, commands only blue auto troops and never recruits or spends',()=>{
  const b=new SiegeBattle();b.allyEnabled=true;const before={gold:b.gold,wood:b.wood,count:b.units.length,queue:b.queue.length};assert.ok(b.applyAllyPlan(bluePlan));
  assert.equal(b.tactics.blue.defense,3);assert.equal(b.tactics.blue.rally,5);
  for(const u of b.units.filter(u=>u.team==='blue'&&u.duty==='rally')){u.x=440;u.y=225;}b.balanceArmy('blue');
  for(const u of b.units.filter(u=>u.team==='blue'&&u.duty==='attack')){assert.equal(b.entity(u.order.target).team,'red');assert.equal(b.entity(u.order.target).type,'barracks');assert.equal(u.route,'north_bridge');}
  assert.equal(b.tactics.blue.attack,5);
  assert.ok(b.units.filter(u=>u.team==='red').every(u=>u.order===null));assert.deepEqual({gold:b.gold,wood:b.wood,count:b.units.length,queue:b.queue.length},before);
});
test('manual attack orders persist through changed allied and enemy plans until explicit delegation',()=>{
  const b=new SiegeBattle();b.allyEnabled=true;b.phase='combat';b.applyAllyPlan(bluePlan);const unit=b.units.find(u=>u.team==='blue'),target=b.buildings.find(b=>b.team==='red'&&b.type==='farm');
  b.command([unit.id],'target',target.x,target.y,target.id);const manualOrder=unit.order;assert.equal(unit.control,'manual');
  for(const plan of [redPlan,{...bluePlan,maneuver:'defend'},{...bluePlan,objective:'keep'}]){b.applyAllyPlan(plan);b.applyEnemyPlan(plan);assert.equal(unit.order,manualOrder);assert.equal(unit.order.target,target.id);}
  b.delegate([unit.id]);assert.equal(unit.control,'auto');assert.notEqual(unit.order,manualOrder);assert.ok(['defense','rally','attack'].includes(unit.duty));
});
test('the human can reserve, hold, move and release units without giving control to the enemy',()=>{
  const b=new SiegeBattle();b.allyEnabled=true;b.applyAllyPlan(bluePlan);const blue=b.units.find(u=>u.team==='blue'),red=b.units.find(u=>u.team==='red');b.phase='combat';
  assert.equal(b.takeControl([blue.id,red.id]),1);assert.equal(blue.control,'manual');assert.equal(blue.order.mode,'hold');assert.equal(red.control,'auto');b.command([blue.id],'move',200,180);const manual=blue.order;b.applyAllyPlan(redPlan);assert.equal(blue.order,manual);assert.equal(manual.mode,'move');assert.equal(b.delegate([red.id]),0);
});
test('new human-recruited auto units join the garrison before a viable assault exists',()=>{
  const b=new SiegeBattle();b.units=[];b.allyEnabled=true;b.phase='combat';b.nextWave=10000;b.applyAllyPlan(bluePlan);assert.equal(b.train('archer',true),null);advance(b,4.1);
  const unit=b.units.find(u=>u.team==='blue');assert.equal(unit.type,'archer');assert.equal(unit.control,'auto');assert.equal(unit.duty,'defense');assert.equal(unit.order.mode,'guard');assert.equal(b.queue.length,0);
});
test('reserved recruits stay under manual control through future strategic decisions',()=>{
  const b=new SiegeBattle();b.units=[];b.allyEnabled=true;b.phase='combat';b.nextWave=10000;b.applyAllyPlan(bluePlan);b.train('ram',false);advance(b,8.1);const unit=b.units.find(u=>u.team==='blue');assert.equal(unit.control,'manual');assert.equal(unit.order.mode,'hold');b.applyAllyPlan(redPlan);assert.equal(unit.order.mode,'hold');
});
test('allied flanking actually crosses eastward and defending remains on the west bank',()=>{
  const b=new SiegeBattle();b.units=[];b.buildings=b.buildings.filter(b=>b.type==='keep');b.allyEnabled=true;b.phase='combat';b.nextWave=10000;for(let i=0;i<10;i++)b.spawn('infantry','blue',450,200+i*5);b.applyAllyPlan({...bluePlan,objective:'keep'});const unit=b.units.find(u=>u.duty==='attack');assert.ok(unit);advance(b,16);assert.ok(unit.x>670);
  const c=new SiegeBattle();c.allyEnabled=true;c.applyAllyPlan({...bluePlan,maneuver:'defend'});for(const u of c.units.filter(u=>u.team==='blue'))assert.ok(u.order.x<550);
});
test('both independent initial requests must complete before battle time starts',async()=>{
  let finishBlue;const seen=[];const d=new DualRtsCommanders(async(url,options)=>{const snapshot=JSON.parse(options.body);seen.push(snapshot);if(snapshot.commanderTeam==='blue')return new Promise(resolve=>{finishBlue=()=>resolve({ok:true,json:async()=>reply('blue')});});return {ok:true,json:async()=>reply('red')};});
  const b=new SiegeBattle();d.start(b);await settle();d.tick(b);assert.equal(b.phase,'planning');assert.ok(b.enemyPlan);assert.equal(b.allyPlan,null);assert.deepEqual(seen.map(s=>s.commanderTeam),['red','blue']);
  finishBlue();await settle();d.tick(b);assert.equal(b.phase,'combat');assert.equal(d.ally.source,'typesafe');assert.equal(d.enemy.source,'typesafe');assert.notEqual(b.allyPlan.passage,b.enemyPlan.passage);
});
test('a delayed allied reply cannot overwrite a manual command issued while it was pending',async()=>{
  let complete;const d=new DualRtsCommanders(async(url,options)=>{const team=JSON.parse(options.body).commanderTeam;if(team==='blue')return new Promise(resolve=>{complete=()=>resolve({ok:true,json:async()=>reply('blue')});});return {ok:true,json:async()=>reply('red')};});const b=new SiegeBattle();d.start(b);await settle();
  const unit=b.units.find(u=>u.team==='blue');b.command([unit.id],'move',150,180);const directOrder=unit.order;complete();await settle();d.tick(b);assert.equal(b.phase,'combat');assert.equal(unit.control,'manual');assert.equal(unit.order,directOrder);
});
test('both Jevs observe human intervention on the next five-second reassessment',async()=>{
  const sent=[];const d=new DualRtsCommanders(async(url,options)=>{const s=JSON.parse(options.body);sent.push(s);return {ok:true,json:async()=>reply(s.commanderTeam)};}),b=new SiegeBattle();d.start(b);await settle();d.tick(b);assert.equal(sent.length,2);
  b.time=2;const unit=b.units.find(u=>u.team==='blue');b.command([unit.id],'move',180,180);d.tick(b);assert.equal(d.enemy.nextAt,5);assert.equal(d.ally.nextAt,5);b.time=4.9;d.tick(b);assert.equal(sent.length,2);b.time=5;d.tick(b);await settle();d.tick(b);assert.equal(sent.length,4);
  assert.ok(sent.slice(2).every(s=>s.units.find(u=>u.id===unit.id).control==='manual'));assert.ok(sent.slice(2).every(s=>s.units.find(u=>u.id===unit.id).order.mode==='move'));
});
test('disabling allied Jev cancels pending work, preserves manual units and makes auto troops hold',async()=>{
  const d=new DualRtsCommanders(async(url,options)=>({ok:true,json:async()=>reply(JSON.parse(options.body).commanderTeam)})),b=new SiegeBattle();d.start(b);await settle();d.tick(b);const unit=b.units.find(u=>u.team==='blue');b.command([unit.id],'move',200,200);const direct=unit.order;d.setAllyEnabled(b,false);assert.equal(d.ally.enabled,false);assert.equal(unit.order,direct);assert.ok(b.units.filter(u=>u.team==='blue'&&u.control==='auto').every(u=>u.order.mode==='hold'));
  const calls=d.ally.calls;b.time=30;d.tick(b);await settle();assert.equal(d.ally.calls,calls);d.setAllyEnabled(b,true);d.tick(b);await settle();d.tick(b);assert.equal(d.ally.calls,1);assert.equal(unit.order,direct);
});
test('allied snapshot and prompt include manual orders and human queue, with four bounded decisions',()=>{
  const b=new SiegeBattle();b.phase='combat';const unit=b.units.find(u=>u.team==='blue');b.command([unit.id],'move',150,170);b.train('archer',false);const s=sanitizeRtsSnapshot(summarizeBattle(b,'blue'));assert.ok(s);assert.equal(s.commanderTeam,'blue');assert.equal(s.units.find(u=>u.id===unit.id).control,'manual');assert.equal(s.queue[0].control,'manual');
  const request=buildWarlordRequest(s);assert.deepEqual(Object.keys(request.questions),['passage','objective','maneuver','stance']);assert.ok(!request.state.availableUnits.some(u=>u.id===unit.id));assert.equal(request.state.nextReinforcements,null);assert.match(request.questions.objective.criteria.keep,/red/);
  const choices={passage:'north_ford',objective:'economy',maneuver:'flank'},answer={answers:Object.fromEntries(Object.entries(choices).map(([key,choice])=>[key,{type:'choice',choice,confidence:.7}]))};assert.ok(parseWarlordAnswer(answer,null,'blue'));assert.equal(parseWarlordAnswer(answer),null);
});
test('API validates sides and manual data, and each commander has an independent provider budget',async()=>{
  const s=summarizeBattle(new SiegeBattle(),'blue');assert.equal(sanitizeRtsSnapshot({...s,commanderTeam:'green'}),null);assert.equal(sanitizeRtsSnapshot({...s,units:[{...s.units[0],control:'hijack'}]}),null);assert.equal(sanitizeRtsSnapshot({...s,units:[{...s.units[0],order:{mode:'eval',x:1,y:1,target:null}}]}),null);
  const original=globalThis.fetch,saved=process.env.TYPESAFE_API_KEY;process.env.TYPESAFE_API_KEY='dual-test-secret';let calls=0;
  globalThis.fetch=async(url,options)=>{calls++;const body=JSON.parse(options.body),team=body.state.commanderTeam;const plan=team==='blue'?bluePlan:redPlan;return {ok:true,json:async()=>({answers:Object.fromEntries(Object.keys(body.questions).map(k=>[k,{type:'choice',choice:plan[k],confidence:.8}]))})};};
  try{for(let i=0;i<17;i++){const r=response();await handler({method:'POST',headers:{'x-forwarded-for':'dual-rate'},body:{...summarizeBattle(new SiegeBattle(),'red'),provider:'typesafe'}},r);assert.equal(r.data.source,i<16?'typesafe':'fallback');}
    const r=response();await handler({method:'POST',headers:{'x-forwarded-for':'dual-rate'},body:{...s,provider:'typesafe'}},r);assert.equal(r.data.source,'typesafe');assert.equal(r.data.commanderTeam,'blue');assert.equal(calls,17);
  }finally{globalThis.fetch=original;if(saved===undefined)delete process.env.TYPESAFE_API_KEY;else process.env.TYPESAFE_API_KEY=saved;}
});
test('manual deployment before battle remains manual when the allied commander starts',()=>{
  const b=new SiegeBattle(),u=b.units.find(u=>u.team==='blue');b.command([u.id],'move',300,180);const direct=u.order;b.setAllyEnabled(true);b.applyAllyPlan(bluePlan);assert.equal(u.control,'manual');assert.equal(u.order,direct);
});
test('an explicit manual attack approaches the chosen building instead of stopping to attack a nearby decoy',()=>{
  const b=new SiegeBattle();b.units=[];b.buildings=b.buildings.filter(b=>b.type==='keep');b.phase='combat';b.nextWave=10000;const u=b.spawn('archer','blue',800,300),decoy=b.spawn('pike','red',800,330),target=b.buildings.find(b=>b.team==='red');decoy.order={mode:'hold'};
  b.command([u.id],'target',target.x,target.y,target.id);b.tick(.05);assert.equal(decoy.hp,decoy.maxHp);assert.ok(u.moved);assert.equal(u.control,'manual');assert.equal(u.order.target,target.id);
});
