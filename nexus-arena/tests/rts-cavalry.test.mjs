import test from 'node:test';
import assert from 'node:assert/strict';
import {SiegeBattle,TROOPS} from '../rts-sim.js';
import {findPath,walkable,PASSAGES} from '../rts-terrain.js';
import {summarizeBattle} from '../rts-plans.js';
import {sanitizeRtsSnapshot,buildWarlordRequest,parseWarlordAnswer} from '../api/warlord.js';

test('mounted knights replace the old roster slot on both teams and train at their own cost and time',()=>{
  assert.equal(TROOPS.pike,undefined);
  for(const team of ['blue','red']){
    const b=new SiegeBattle(),gold=team==='blue'?'gold':'enemyGold',wood=team==='blue'?'wood':'enemyWood',queue=team==='blue'?b.queue:b.enemyQueue;
    assert.equal(b.units.filter(u=>u.team===team&&u.type==='knight').length,2);
    assert.equal(b.train('knight',true,team),null);assert.equal(b[gold],320-60);assert.equal(b[wood],220-20);assert.equal(queue[0].remaining,5);
    assert.ok(TROOPS.knight.speed>TROOPS.infantry.speed);assert.ok(TROOPS.knight.hp>TROOPS.infantry.hp);
  }
});
test('knights counter archers and siege, with armor reducing incoming arrows',()=>{
  const b=new SiegeBattle();b.units=[];
  const knight=b.spawn('knight','blue',300,300),archer=b.spawn('archer','red',300,300),ram=b.spawn('ram','red',300,300);
  let hp=archer.hp;b.damage(knight,archer);assert.equal(hp-archer.hp,TROOPS.knight.damage*1.5);
  hp=ram.hp;b.damage(knight,ram);assert.equal(hp-ram.hp,TROOPS.knight.damage*2);
  hp=knight.hp;b.damage(archer,knight);assert.ok(Math.abs(hp-knight.hp-TROOPS.archer.damage*.8)<1e-8);
});
test('mounted navigation crosses the full map with the larger collision footprint',()=>{
  const path=findPath({x:300,y:535},{x:900,y:535},'knight',[],'south_bridge');
  assert.ok(path.length>0);assert.ok(path.every(p=>walkable(p.x,p.y,'knight',[],'south_bridge')));
  assert.ok(path.some(p=>p.x>550&&p.x<650));
  for(const p of PASSAGES)assert.ok(walkable(600,p.y,'knight',[]));
});
test('Jev receives and validates mounted units, cavalry composition and paid knight recruitment',()=>{
  const s=sanitizeRtsSnapshot(summarizeBattle(new SiegeBattle()));assert.ok(s);
  assert.ok(s.units.some(u=>u.type==='knight'&&u.hp===150));
  const request=buildWarlordRequest(s);assert.ok(request.questions.composition.criteria.cavalry);assert.ok(request.questions.development.criteria.train_knight);
  const choices={passage:'south_bridge',composition:'cavalry',objective:'economy',maneuver:'flank',stance:'balanced',development:'train_knight'};
  const answers=Object.fromEntries(Object.entries(choices).map(([key,choice])=>[key,{type:'choice',choice,confidence:.9}]));
  assert.equal(parseWarlordAnswer({answers},request.questions.maneuver.criteria,'red',true).development,'train_knight');
});
