// Shared, observable tactical rules used by both commanders and their prompts.
export const STANCES={balanced:'Equilibrata',offensive:'Offensiva',defensive:'Prudente'};
export const RESERVE_SHARE={balanced:.34,offensive:.2,defensive:.6};
export function emergencyDefense(units,buildings,team='blue'){
  const home=buildings.filter(b=>b.team===team&&b.hp>0),threats=units.filter(u=>u.team!==team&&u.hp>0&&(team==='blue'?u.x<500:u.x>700)&&home.some(b=>Math.hypot(u.x-b.x,u.y-b.y)<240));
  const defenders=units.filter(u=>u.team===team&&u.hp>0&&threats.some(e=>Math.hypot(u.x-e.x,u.y-e.y)<210));
  const weight=(u,attacking)=>({infantry:1.1,knight:1.65,archer:.8,ram:attacking?2.5:.2}[u.type])*(u.hp/(u.maxHp||{infantry:110,knight:150,archer:55,ram:330}[u.type]));
  const enemyPower=threats.reduce((n,u)=>n+weight(u,true),0),defensePower=defenders.reduce((n,u)=>n+weight(u,false),0);
  return {active:threats.length>0&&defensePower<enemyPower*1.2,threats:threats.length,defenders:defenders.length};
}
export function assessFront(units,buildings,team){
  const own=units.filter(u=>u.team===team&&u.hp>0),home=buildings.filter(b=>b.team===team&&b.hp>0),keep=home.find(b=>b.type==='keep');
  const threats=units.filter(u=>u.team!==team&&u.hp>0&&(team==='blue'?u.x<500:u.x>700)&&home.some(b=>Math.hypot(u.x-b.x,u.y-b.y)<240));
  return {available:own.filter(u=>u.control!=='manual').length,threats:threats.length,emergency:threats.some(u=>keep&&Math.hypot(u.x-keep.x,u.y-keep.y)<240)||threats.length>=Math.max(3,own.length*.6)};
}
