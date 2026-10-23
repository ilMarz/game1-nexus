import test from 'node:test';
import assert from 'node:assert/strict';
import {FlightTelemetry,executionPlan,adaptiveSpawn,enemyIntent,firingTarget,needsRelief,localTactic,DirectorCadence,resolveTactic} from '../adaptive-director.js';

const base={elapsed:20,health:85,kills:10,cores:2,movement:100,enemies:5};
const flight=(overrides={})=>({x:720,y:400,shots:0,hits:0,kills:0,damage:0,...overrides});
const situation=(overrides={})=>({...base,x:50,y:50,vx:0,vy:0,speed:0,consistency:0,stationaryPct:0,edgePct:0,recentDamage:0,recentKills:0,threats:0,...overrides});

test('telemetry measures actual displacement and recognizes straight movement',()=>{
  const tracker=new FlightTelemetry();
  for(let i=0;i<=16;i++)tracker.record(i*.25,flight({x:200+i*25,shots:i*2,hits:i,kills:Math.floor(i/4)}));
  const s=tracker.snapshot(base);assert.equal(s.speed,100);assert.equal(s.vx,100);assert.equal(s.vy,0);assert.equal(s.consistency,100);assert.equal(s.stationaryPct,0);assert.equal(s.accuracy,50);assert.equal(s.recentKills,4);
});
test('backtracking is distinguished from a predictable straight route',()=>{
  const tracker=new FlightTelemetry();
  for(let i=0;i<=16;i++)tracker.record(i*.25,flight({x:600+(i%2)*25}));
  const s=tracker.snapshot(base);assert.equal(s.speed,100);assert.equal(s.vx,0);assert.equal(s.consistency,0);
});
test('stopping against a border is stationary and recent movement replaces old history',()=>{
  const tracker=new FlightTelemetry();
  for(let i=0;i<=48;i++)tracker.record(i*.25,flight({x:i<8?600+i*25:1380}));
  const s=tracker.snapshot(base);assert.equal(s.stationaryPct,100);assert.equal(s.edgePct,100);assert.equal(s.speed,0);assert.ok(s.windowSeconds<=8);assert.ok(tracker.samples.length<=33);
  const count=tracker.samples.length;tracker.record(12,flight());assert.equal(tracker.samples.length,count);
});
test('recent damage survives repair and triggers recovery; old damage expires',()=>{
  const tracker=new FlightTelemetry();tracker.record(0,flight());tracker.record(1,flight({damage:40}));
  const s=tracker.snapshot({...base,health:90});assert.equal(s.recentDamage,40);assert.equal(needsRelief(s),true);
  for(let i=2;i<=12;i++)tracker.record(i,flight({damage:40}));
  assert.equal(tracker.snapshot(base).recentDamage,0);assert.equal(needsRelief(tracker.snapshot(base)),false);
});
test('fallback chooses counters from observed play instead of cycling by the clock',()=>{
  assert.equal(localTactic(situation({stationaryPct:90})),'flank');
  assert.equal(localTactic(situation({speed:230,consistency:90})),'flank');
  assert.equal(localTactic(situation({speed:230,consistency:20,recentKills:5})),'barrage');
  assert.equal(localTactic(situation({health:20,recentKills:8})),'relief');
  assert.equal(localTactic(situation({threats:14})),'relief');
});
test('interception leads a predictable player and uses two distinct approach angles',()=>{
  const plan=executionPlan('flank',situation({speed:200,consistency:95}));
  const player={x:700,y:500},velocity={x:200,y:0};
  const left=enemyIntent({kind:'interceptor',flankSign:-1},player,velocity,plan,0);
  const right=enemyIntent({kind:'interceptor',flankSign:1},player,velocity,plan,0);
  assert.equal(plan.mode,'intercept');assert.ok(right.x>player.x);assert.equal(right.x-left.x,320);
  const target=firingTarget({},player,velocity,plan);assert.equal(target.x,860);
  // A telegraphed shot keeps its stored target even when the player changes route.
  player.x=400;assert.equal(target.x,860);
});
test('adaptive side arrivals follow travel direction and retain reaction distance',()=>{
  const right=situation({x:50,y:60,vx:200}),left=situation({x:50,y:60,vx:-200});
  assert.equal(adaptiveSpawn('flank',right,()=>.2,1440,900).x,1415);
  assert.equal(adaptiveSpawn('flank',left,()=>.2,1440,900).x,25);
  for(const x of [0,10,50,90,100])for(const y of [0,50,100]){
    const p=adaptiveSpawn('flank',situation({x,y}),()=>.2,1440,900),px=60+x/100*1320,py=90+y/100*615;
    assert.ok(Math.hypot(p.x-px,p.y-py)>=300);assert.ok(p.y>=130&&p.y<=650);
  }
});
test('recovery slows existing enemies and fire, while AI off keeps classic behavior',()=>{
  const s=situation({health:15,recentDamage:40,stationaryPct:100});
  const recover=executionPlan('relief',s);assert.ok(recover.spawn>1);assert.ok(recover.fire>1);assert.ok(recover.speed<1);
  const off=executionPlan('assault',s,false);assert.equal(off.adaptive,false);assert.equal(off.lead,0);assert.equal(off.spawn,1);assert.equal(off.fire,1);assert.equal(off.speed,1);
});
test('director responds to a changed situation with an eight-second minimum interval',()=>{
  const cadence=new DirectorCadence(),s=situation();
  assert.equal(cadence.due(3,s),null);assert.equal(cadence.due(4,s),'prima lettura');cadence.mark(4,s);
  assert.equal(cadence.due(10,{...s,health:20}),null);
  assert.equal(cadence.due(12,{...s,health:20}),'pressione aumentata');
  assert.equal(cadence.due(12,{...s,x:90}),'nuova zona');assert.equal(cadence.due(16,s),'rivalutazione');
  cadence.mark(16,s);assert.equal(cadence.canRequest(17),false);cadence.reset();assert.equal(cadence.canRequest(17),true);
});
test('a delayed aggressive model reply cannot undo emergency recovery',()=>{
  assert.deepEqual(resolveTactic('barrage',situation({health:20}),20),{tactic:'relief',protectedRecovery:true});
  assert.deepEqual(resolveTactic('flank',situation({health:80}),20,24),{tactic:'relief',protectedRecovery:true});
  assert.deepEqual(resolveTactic('flank',situation({health:80}),25,24),{tactic:'flank',protectedRecovery:false});
  assert.deepEqual(resolveTactic('relief',situation({health:20}),20),{tactic:'relief',protectedRecovery:false});
});
