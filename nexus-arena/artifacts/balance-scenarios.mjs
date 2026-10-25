import {SiegeBattle} from '../rts-sim.js';
import {localRtsPlan,summarizeBattle} from '../rts-plans.js';
const results=[];
for(const recruit of [false,true]){
  const b=new SiegeBattle();b.phase='combat';b.allyEnabled=true;b.externalCommander=true;
  let decision=0,training=0,trained=0,maxRed=0,maxBlue=0,maxAttack=0;
  for(let i=0;i<7200&&b.phase==='combat';i++){
    if(b.time>=decision){decision+=12;for(const team of ['blue','red'])b.applyCommanderPlan(team,localRtsPlan(summarizeBattle(b,team)));}
    if(recruit&&b.time>=training){training+=1;const roster=['infantry','archer','knight','infantry','ram'];if(!b.train(roster[trained%5]))trained++;}
    b.tick(.05);maxRed=Math.max(maxRed,b.units.filter(u=>u.team==='red').length);maxBlue=Math.max(maxBlue,b.population);maxAttack=Math.max(maxAttack,b.tactics.blue.attack||0);
  }
  results.push({recruit,seconds:Math.round(b.time),phase:b.phase,trained,maxRed,maxBlue,maxAttack,keepHP:Object.fromEntries(['blue','red'].map(team=>[team,Math.round(b.buildings.find(e=>e.team===team&&e.type==='keep')?.hp||0)])),losses:b.losses,sites:b.sites.map(s=>s.owner),finalTactics:b.tactics});
}
console.log(JSON.stringify(results,null,2));
