import {assessFront} from './rts-balance.js';

// Adapt decisions to observable play, never change damage, income or unit costs.
export function enemyProfile(s){
  const army=team=>s.units.filter(u=>u.team===team&&u.hp>0);
  const strength=team=>army(team).reduce((sum,u)=>sum+({infantry:1.1,knight:1.65,archer:1.15,ram:2.8}[u.type])*(u.hp/{infantry:110,knight:150,archer:55,ram:330}[u.type]),0);
  const blue=strength('blue'),red=strength('red');
  const economy=s.buildings.filter(b=>b.team==='blue'&&b.hp>0&&!b.remaining&&b.type==='farm').length;
  const territory=s.sites.filter(site=>site.owner==='blue').length;
  const pressure=Math.max(0,Math.min(1,(blue-7)/20+territory*.12+Math.max(0,economy-1)*.12+Math.max(0,(s.losses?.red||0)-(s.losses?.blue||0))*.025));
  return {pressure,bluePower:blue,redPower:red,productionInterval:4-pressure*2,front:assessFront(s.units,s.buildings,'red'),targetArmy:Math.min(50,Math.max(12,Math.ceil(blue*1.2+6)))};
}

// Ordered choices let the executor skip unaffordable or already pending work.
export function enemyDevelopmentChoices(s,plan){
  const p=enemyProfile(s),own=s.units.filter(u=>u.team==='red'&&u.hp>0),foes=s.units.filter(u=>u.team==='blue'&&u.hp>0),queue=s.queue||[];
  const buildings=s.buildings.filter(b=>b.team==='red'&&b.hp>0),count=t=>buildings.filter(b=>b.type===t).length;
  const troops=t=>own.filter(u=>u.type===t).length+queue.filter(u=>u.type===t).length;
  const cap=30+buildings.filter(b=>b.type==='house'&&!b.remaining).length*10;
  if(!count('barracks'))return ['build_barracks'];
  const actions=[];
  if(own.length+queue.length>=cap-2&&count('house')<3)actions.push('build_house');
  if(foes.some(u=>u.type==='ram')&&troops('knight')<foes.filter(u=>u.type==='ram').length*2)actions.push('train_knight');
  if(p.front.threats){
    actions.push(foes.filter(u=>u.type==='archer').length>=3?'train_knight':'train_infantry');
    if(count('tower')<Math.min(4,2+Math.floor(p.pressure*2)))actions.push('build_tower');
  }
  if(count('farm')<2+Number(p.pressure>.5)&&!p.front.emergency&&own.length>=8)actions.push('build_farm');
  // Maintain siege even if the model repeatedly selects cheap infantry.
  if(!p.front.emergency&&own.length>=10&&troops('ram')<Math.max(1,Math.floor(own.length/14)))actions.push('train_ram');
  if(own.length+queue.length<p.targetArmy){
    if(foes.filter(u=>u.type==='archer').length>=4&&troops('knight')<Math.ceil(foes.filter(u=>u.type==='archer').length/2))actions.push('train_knight');
    const weights={balanced:{infantry:4,knight:3,archer:4},archers:{infantry:4,knight:2,archer:6},cavalry:{infantry:3,knight:6,archer:3},siege:{infantry:5,knight:3,archer:4}}[plan?.composition||'balanced'];
    actions.push(...Object.keys(weights).sort((a,b)=>troops(a)/weights[a]-troops(b)/weights[b]).map(t=>'train_'+t));
  }
  if(!p.front.emergency&&count('farm')<3)actions.push('build_farm');
  return [...new Set(actions)];
}
