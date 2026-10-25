import {SiegeBattle} from '../rts-sim.js';
import {localRtsPlan,summarizeBattle} from '../rts-plans.js';
import {pathToFileURL} from 'node:url';

export function runChallengeScenario(mode,seconds=360){
  const b=new SiegeBattle();b.allyEnabled=true;b.externalCommander=true;
  let decisions=0,production=0,buildingAt=0,manualAt=0,trained=0,manualOrders=0,maxEnemyAttack=0;
  const active=mode==='guided';
  if(active){
    b.build('farm',100,180);b.build('farm',270,600);
    b.train('infantry');b.train('infantry');b.train('knight');b.train('archer');
    b.setAdvisorOrder('defend');
  }
  b.phase='combat';
  for(let step=0;step<seconds*20&&b.phase==='combat';step++){
    if(b.time>=decisions){
      decisions+=5;
      for(const team of ['blue','red'])b.applyCommanderPlan(team,localRtsPlan(summarizeBattle(b,team)));
    }
    if(mode!=='hands-off'&&b.time>=production){
      production+=1;
      const own=b.units.filter(u=>u.team==='blue'),rams=b.units.filter(u=>u.team==='red'&&u.type==='ram'&&u.x<550);
      let type=['infantry','archer','knight','infantry','ram'][trained%5];
      if(active){
        const counts=t=>own.filter(u=>u.type===t).length+b.queue.filter(q=>q.type===t).length;
        type=rams.length&&counts('knight')<rams.length*2?'knight':counts('infantry')<4?'infantry':counts('archer')<6?'archer':counts('knight')<4?'knight':counts('ram')<2&&own.length>=14?'ram':['infantry','archer','knight'][trained%3];
      }
      if(b.queue.length<2&&!b.train(type))trained++;
    }
    if(active&&b.time>=buildingAt){
      buildingAt+=10;
      const own=b.buildings.filter(e=>e.team==='blue');
      if(own.filter(e=>e.type==='tower').length<3){
        for(const point of [{x:420,y:480},{x:420,y:250},{x:310,y:520}])if(!b.build('tower',point.x,point.y))break;
      }else if(b.population+b.queue.length>=b.cap-3&&own.filter(e=>e.type==='house').length<3){
        for(const point of [{x:100,y:660},{x:100,y:100},{x:380,y:100}])if(!b.build('house',point.x,point.y))break;
      }
      if(b.buildings.find(e=>e.team==='blue'&&e.type==='keep')?.hp<1200)b.repair();
    }
    if(active&&b.time>=manualAt){
      manualAt+=2;
      const knights=b.units.filter(u=>u.team==='blue'&&u.type==='knight');
      const target=b.units.filter(u=>u.team==='red'&&u.type==='ram'&&u.x<550).sort((a,c)=>a.x-c.x)[0];
      if(target){b.command(knights.map(u=>u.id),'target',target.x,target.y,target.id);manualOrders++;}
      else if(knights.some(u=>u.control==='manual'))b.delegate(knights.map(u=>u.id));
      if(b.time>100&&b.population>=18)b.setAdvisorOrder('attack');
      else if(b.population<10)b.setAdvisorOrder('defend');
    }
    b.tick(.05);maxEnemyAttack=Math.max(maxEnemyAttack,b.tactics.red.attack||0);
  }
  return {mode,seconds:Math.round(b.time),phase:b.phase,trained,manualOrders,maxEnemyAttack,keepHP:Object.fromEntries(['blue','red'].map(team=>[team,Math.round(b.buildings.find(e=>e.team===team&&e.type==='keep')?.hp||0)])),losses:b.losses,sites:b.sites.map(s=>s.owner)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(['hands-off','recruit-only','guided'].map(mode=>runChallengeScenario(mode)),null,2));
