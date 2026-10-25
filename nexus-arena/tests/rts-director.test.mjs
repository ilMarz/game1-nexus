import test from 'node:test';
import assert from 'node:assert/strict';
import {RtsDirector} from '../rts-director.js';
import {SiegeBattle} from '../rts-sim.js';
const reply={passage:'north_bridge',composition:'archers',objective:'barracks',maneuver:'flank',source:'typesafe',confidence:.82,latencyMs:150};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('initial analysis freezes combat then Jev commands active troops, with periodic reassessment',async()=>{
  let calls=0;const d=new RtsDirector(async()=>{calls++;return {ok:true,json:async()=>reply};}),b=new SiegeBattle();d.start(b);assert.equal(b.phase,'planning');b.tick(.05);assert.equal(b.time,0);await settle();d.tick(b);assert.equal(b.phase,'combat');assert.equal(d.source,'typesafe');assert.equal(b.enemyPlan.passage,'north_bridge');assert.ok(b.units.filter(u=>u.team==='red').every(u=>['defense','rally'].includes(u.duty)));assert.equal(calls,1);
  b.time=4.9;d.tick(b);assert.equal(calls,1);b.time=5;d.tick(b);await settle();d.tick(b);assert.equal(calls,2);assert.equal(d.history.length,2);
});
test('responses received during pause wait without changing troops or advancing the schedule',async()=>{
  const d=new RtsDirector(async()=>({ok:true,json:async()=>reply})),b=new SiegeBattle();d.start(b);await settle();d.tick(b,true);assert.equal(b.enemyPlan,null);assert.equal(b.phase,'planning');d.tick(b,false);assert.equal(b.enemyPlan.objective,'barracks');
});
test('five-second cadence counts from request time instead of adding response latency',async()=>{
  let complete,calls=0;const b=new SiegeBattle(),d=new RtsDirector(async()=>{calls++;return new Promise(resolve=>{complete=()=>resolve({ok:true,json:async()=>reply});});});
  d.start(b);complete();await settle();d.tick(b);b.time=5;d.tick(b);assert.equal(calls,2);
  b.time=7;complete();await settle();d.tick(b);assert.equal(d.nextAt,10);b.time=9.9;d.tick(b);assert.equal(calls,2);b.time=10;d.tick(b);assert.equal(calls,3);d.reset();
});
test('a slow request never overlaps another analysis, and paused time triggers no checks',async()=>{
  let complete,calls=0;const b=new SiegeBattle(),d=new RtsDirector(async()=>{calls++;return new Promise(resolve=>{complete=()=>resolve({ok:true,json:async()=>reply});});});
  d.start(b);complete();await settle();d.tick(b);b.time=5;d.tick(b);b.time=12;d.tick(b);assert.equal(calls,2);complete();await settle();d.tick(b,true);assert.equal(calls,2);assert.ok(d.pending);d.tick(b);assert.equal(calls,3);d.reset();
});
test('a stale response cannot mutate a restarted or completed battle',async()=>{
  let release;const d=new RtsDirector(()=>new Promise(resolve=>{release=resolve;})),b=new SiegeBattle();d.start(b);d.reset();release({ok:true,json:async()=>reply});await settle();d.tick(b);assert.equal(b.enemyPlan,null);assert.equal(d.source,null);
  const ended=new SiegeBattle();let finish;const other=new RtsDirector(()=>new Promise(resolve=>{finish=resolve;}));other.start(ended);ended.phase='lost';finish({ok:true,json:async()=>reply});await settle();other.tick(ended);assert.equal(ended.enemyPlan,null);
});
test('local mode performs no fetch and never labels a rule decision as Jev',async()=>{
  let calls=0;const d=new RtsDirector(async()=>{calls++;throw Error();}),b=new SiegeBattle();d.start(b,'off');await settle();d.tick(b);assert.equal(calls,0);assert.equal(d.source,'off');assert.equal(b.phase,'combat');
});
test('invalid success attribution, incompatible plans and network errors become explicit fallback',async()=>{
  for(const fake of [{...reply,confidence:undefined},{...reply,passage:'north_ford',composition:'siege'},null]){const d=new RtsDirector(async()=>{if(!fake)throw Error();return {ok:true,json:async()=>fake};}),b=new SiegeBattle();d.start(b);await settle();d.tick(b);assert.equal(d.source,'fallback');assert.equal(b.phase,'combat');assert.notEqual(d.meta.reason,undefined);}
});
