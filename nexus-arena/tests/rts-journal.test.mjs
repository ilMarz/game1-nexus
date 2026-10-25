import test from 'node:test';
import assert from 'node:assert/strict';
import {SiegeBattle} from '../rts-sim.js';
import {AdvisorJournal} from '../rts-journal.js';
const plan={passage:'north_bridge',composition:'balanced',objective:'barracks',maneuver:'assault',stance:'balanced'};
const setup=()=>({b:new SiegeBattle(),j:new AdvisorJournal(),a:{plan:null,source:'typesafe'}});
test('journal appends decisions once and preserves earlier messages unchanged',()=>{
  const {b,j,a}=setup();j.update(b,a);const first={...j.messages[0]};b.phase='combat';b.allyEnabled=true;b.applyAllyPlan(plan);a.plan=b.allyPlan;j.update(b,a);assert.equal(j.messages.filter(m=>m.kind==='decision').length,1);const count=j.messages.length;b.time=22;j.update(b,a);assert.equal(j.messages.length,count);a.plan={...plan,stance:'offensive'};b.applyAllyPlan(a.plan);j.update(b,a);assert.equal(j.messages.filter(m=>m.kind==='decision').length,2);assert.deepEqual(j.messages[0],first);
});
test('training and arrivals are acknowledged once without spending or recruiting',()=>{
  const {b,j,a}=setup();j.update(b,a);b.train('archer');const gold=b.gold;j.update(b,a);j.update(b,a);assert.equal(j.messages.filter(m=>m.text.includes('in addestramento')).length,1);assert.equal(b.gold,gold);assert.equal(b.queue.length,1);b.queue=[];b.spawn('archer','blue',300,300);j.update(b,a);assert.match(j.messages.at(-1).text,/pronto un nuovo soldato/);
});
test('field messages cover manual control, losses, captures, emergency and pause',()=>{
  const {b,j,a}=setup();b.phase='combat';b.allyEnabled=true;j.update(b,a);b.takeControl([b.units[0].id]);j.update(b,a);assert.match(j.messages.at(-1).text,/Hai preso il comando/);b.losses.blue++;j.update(b,a);assert.match(j.messages.at(-1).text,/Abbiamo perso 1 soldato/);b.sites[0].owner='blue';j.update(b,a);assert.match(j.messages.at(-1).text,/15 oro e 5 legno/);b.tactics.blue.emergency=true;j.update(b,a);assert.match(j.messages.at(-1).text,/richiamo/);j.update(b,a,{paused:true});assert.match(j.messages.at(-1).text,/pausa/);
});
test('taking the whole army manually never claims the advisor is regrouping those troops',()=>{
  const {b,j,a}=setup();b.phase='combat';b.allyEnabled=true;b.units[0].duty='attack';j.update(b,a);const count=j.messages.length;b.takeControl(b.units.filter(u=>u.team==='blue').map(u=>u.id));j.update(b,a);const added=j.messages.slice(count);assert.ok(added.some(m=>m.text.includes('Hai preso il comando')));assert.ok(added.every(m=>!m.text.includes('prossimo attacco')&&!m.text.includes('Raduno le forze')));
});
test('building completion and destruction enter the report; retention is bounded and ordered',()=>{
  const {b,j,a}=setup();j.update(b,a);const tower=b.addBuilding('tower','blue',420,200,12);j.update(b,a);assert.match(j.messages.at(-1).text,/costruzione avviata/);tower.remaining=0;j.update(b,a);assert.match(j.messages.at(-1).text,/operativo/);tower.hp=0;j.update(b,a);assert.match(j.messages.at(-1).text,/perduto torre/);b.buildings.find(u=>u.team==='red'&&u.type==='barracks').hp=0;j.update(b,a);assert.match(j.messages.at(-1).text,/rinforzi nemici sono interrotti/);for(let i=0;i<150;i++)j.add(i,'Evento '+i);assert.equal(j.messages.length,120);assert.ok(j.messages.every((m,i)=>!i||m.id>j.messages[i-1].id));
});
