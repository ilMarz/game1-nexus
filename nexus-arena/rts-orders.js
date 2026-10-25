export const ADVISOR_ORDERS={balanced:'Autonomia equilibrata',defend:'Difendi',develop:'Sviluppa il regno',attack:'Attacca',wait:'Aspetta'};
export const DEVELOPMENT_ACTIONS=['train_infantry','train_knight','train_archer','train_ram','build_barracks','build_house','build_farm','build_tower','wait'];
export const EMERGENCY_ACTIONS=DEVELOPMENT_ACTIONS.filter(a=>!['train_ram','build_farm'].includes(a));
export function emergencyNeed(s){
  const own=s.buildings.filter(b=>b.team==='blue'&&b.hp>0),queue=s.queue||[],units=s.units.filter(u=>u.team==='blue'&&u.hp>0);
  if(!own.some(b=>b.type==='barracks'))return 'build_barracks';
  const towers=own.filter(b=>b.type==='tower'),towerNeeded=towers.length<4&&!towers.some(b=>b.remaining);
  if(units.length+queue.length>=30+own.filter(b=>b.type==='house'&&!b.remaining).length*10)return own.some(b=>b.type==='house'&&b.remaining)?'wait':own.filter(b=>b.type==='house').length<3?'build_house':towerNeeded?'build_tower':'wait';
  if(queue.length>=2)return towerNeeded?'build_tower':'wait';
  const enemies=s.units.filter(u=>u.team==='red'&&u.hp>0&&u.x<500);
  if(enemies.some(u=>u.type==='ram'))return 'train_knight';
  if(enemies.filter(u=>u.type==='infantry').length>=2&&units.some(u=>u.type==='infantry'&&enemies.some(e=>Math.hypot(u.x-e.x,u.y-e.y)<210)))return 'train_archer';
  return 'train_infantry';
}
export function respectOrder(plan,order){
  if(order==='defend')return {...plan,stance:'defensive',maneuver:'defend'};
  if(order==='develop')return {...plan,stance:'defensive',maneuver:'defend'};
  if(order==='attack')return {...plan,stance:'offensive',maneuver:plan.maneuver==='defend'?'assault':plan.maneuver};
  return plan;
}
// Local fallback and model telemetry share the same bounded needs assessment.
export function developmentNeed(s){
  if(s.commanderTeam==='red')return developmentNeed({...s,commanderTeam:'blue',units:s.units.map(u=>({...u,team:u.team==='red'?'blue':'red',x:1200-u.x})),buildings:s.buildings.map(b=>({...b,team:b.team==='red'?'blue':'red',x:1200-b.x}))});
  const own=s.buildings.filter(b=>b.team==='blue'&&b.hp>0),army=s.units.filter(u=>u.team==='blue'&&u.hp>0),count=t=>own.filter(b=>b.type===t).length,queued=s.queue||[];
  if(!count('barracks'))return 'build_barracks';
  const cap=30+own.filter(b=>b.type==='house'&&!b.remaining).length*10;
  if(army.length+queued.length>=cap-2&&cap<60&&!own.some(b=>b.type==='house'&&b.remaining))return 'build_house';
  const raiders=s.units.filter(u=>u.team==='red'&&u.hp>0&&u.x<500);
  if(raiders.some(u=>u.type==='ram')&&army.filter(u=>u.type==='knight').length+queued.filter(u=>u.type==='knight').length<raiders.filter(u=>u.type==='ram').length*2)return 'train_knight';
  if(raiders.length>=3&&count('tower')<3)return 'build_tower';
  if(count('farm')<2&&army.length+queued.length>=8)return 'build_farm';
  if(queued.length>=2||army.length+queued.length>=cap)return 'wait';
  const counts=Object.fromEntries(['infantry','knight','archer','ram'].map(t=>[t,army.filter(u=>u.type===t).length+queued.filter(u=>u.type===t).length]));
  if(counts.infantry<4)return 'train_infantry';
  if(counts.knight<3)return 'train_knight';
  if(counts.archer<4)return 'train_archer';
  if(!counts.ram&&army.length>=10)return 'train_ram';
  return ['infantry','knight','archer'].sort((a,b)=>counts[a]-counts[b]).map(t=>'train_'+t)[0];
}
