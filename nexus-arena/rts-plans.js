import {PASSAGES,terrainAt} from './rts-terrain.js';
import {STANCES,assessFront,emergencyDefense} from './rts-balance.js';
import {DEVELOPMENT_ACTIONS,developmentNeed,respectOrder,emergencyNeed} from './rts-orders.js';
import {enemyProfile,enemyDevelopmentChoices} from './rts-enemy.js';
export const COMPOSITIONS={balanced:'Esercito misto',archers:'Linea di arcieri',cavalry:'Cavalleria',siege:'Arieti con scorta'};
export const OBJECTIVES={keep:'Fortezza',economy:'Segherie',barracks:'Caserma',towers:'Torri',crossing:'Controllo del passaggio'};
export const MANEUVERS={assault:'Assalto',flank:'Aggiramento',defend:'Difesa del regno'};
export function normalizeRtsPlan(value){
  if(!value||!PASSAGES.some(p=>p.id===value.passage)||!Object.hasOwn(COMPOSITIONS,value.composition)||!Object.hasOwn(OBJECTIVES,value.objective)||!Object.hasOwn(MANEUVERS,value.maneuver))return null;
  if(value.composition==='siege'&&!PASSAGES.find(p=>p.id===value.passage).siege)return null;
  if(value.stance!==undefined&&!Object.hasOwn(STANCES,value.stance))return null;
  if(value.development!==undefined&&!DEVELOPMENT_ACTIONS.includes(value.development))return null;
  return {...Object.fromEntries(['passage','composition','objective','maneuver'].map(k=>[k,value[k]])),stance:value.stance??'balanced',...(value.development?{development:value.development}:{})};
}
export const forceForWave=wave=>Math.min(8,5+wave);
export function reinforcementBudget(units,buildings,wave){
  if(!buildings.some(b=>b.team==='red'&&b.type==='barracks'&&b.hp>0&&!b.remaining))return 0;
  const production=buildings.some(b=>b.team==='red'&&b.type==='farm'&&b.hp>0&&!b.remaining)?1:.5;
  return Math.min(Math.ceil(forceForWave(wave)*production),Math.max(0,30-units.filter(u=>u.team==='red'&&u.hp>0).length));
}
export function localRtsPlan(s){
  if(s.commanderTeam==='blue'){
    const swap=team=>team==='blue'?'red':team==='red'?'blue':null;
    const mirrored={...s,commanderTeam:'red',units:s.units.map(u=>({...u,x:1200-u.x,team:swap(u.team)})),buildings:s.buildings.map(b=>({...b,x:1200-b.x,team:swap(b.team)})),sites:s.sites.map(site=>({...site,owner:swap(site.owner)}))};
    const plan=localRtsPlan(mirrored),available=s.units.filter(u=>u.team==='blue'&&u.control!=='manual');
    delete plan.development;plan.composition=available.some(u=>u.type==='ram')&&PASSAGES.find(p=>p.id===plan.passage).siege?'siege':available.filter(u=>u.type==='archer').length>available.length/2?'archers':available.filter(u=>u.type==='knight').length>available.length/2?'cavalry':'balanced';const emergency=emergencyDefense(s.units,s.buildings,'blue').active;return respectOrder({...plan,...(emergency?{development:emergencyNeed(s)}:s.advisorOrder==='develop'?{development:developmentNeed(s)}:{})},s.advisorOrder);
  }
  const allies=s.units.filter(u=>u.team==='blue'),buildings=s.buildings.filter(b=>b.team==='blue');
  const scores=PASSAGES.map(p=>({p,score:allies.reduce((sum,u)=>sum+Math.max(0,230-Math.hypot(u.x-510,u.y-p.y))*(u.type==='archer'?1.4:1),0)+buildings.filter(b=>b.type==='tower').reduce((sum,b)=>sum+Math.max(0,230-Math.hypot(b.x-510,b.y-p.y))*2,0)+(s.sites.find(site=>site.id===p.id)?.owner==='blue'?65:0)})).sort((a,b)=>a.score-b.score);
  const ownSiege=s.units.some(u=>u.team==='red'&&u.type==='ram');
  const passage=(ownSiege?scores.find(({p})=>p.siege):scores[0]).p,archers=allies.filter(u=>u.type==='archer').length,rams=allies.filter(u=>u.type==='ram').length;
  const composition=passage.siege&&buildings.filter(b=>b.type==='tower').length>=2?'siege':rams>=2?'cavalry':archers>=4?'balanced':'archers';
  const front=assessFront(s.units,s.buildings,'red'),own=s.units.filter(u=>u.team==='red'),siege=own.some(u=>u.type==='ram');
  const profile=enemyProfile(s),plan={passage:passage.id,composition,objective:buildings.filter(b=>b.type==='farm').length>=2?'economy':own.length<10&&!siege?'crossing':siege?'keep':s.time>70?'barracks':'keep',maneuver:front.emergency?'defend':scores.at(-1).score>scores[0].score+150?'flank':'assault',stance:front.emergency?'defensive':own.length>=16||profile.pressure>.45&&profile.redPower>=profile.bluePower*.8?'offensive':'balanced'};
  return {...plan,development:enemyDevelopmentChoices(s,plan)[0]||'wait'};
}
export function summarizeBattle(battle,commanderTeam='red'){
  return {commanderTeam,advisorOrder:battle.advisorOrder||'balanced',time:Math.round(battle.time),wave:battle.wave,gold:commanderTeam==='blue'?battle.gold:battle.enemyGold,wood:commanderTeam==='blue'?battle.wood:battle.enemyWood,
    units:battle.units.filter(u=>u.hp>0).slice(0,180).map(u=>({id:u.id,type:u.type,team:u.team,control:u.control||'auto',x:Math.round(u.x),y:Math.round(u.y),hp:Math.ceil(u.hp),terrain:terrainAt(u.x,u.y).kind,order:u.order?{mode:u.order.mode,x:Math.round(u.order.x??u.x),y:Math.round(u.order.y??u.y),target:u.order.target??null}:null})),
    buildings:battle.buildings.filter(b=>b.hp>0).slice(0,60).map(b=>({id:b.id,type:b.type,team:b.team,x:Math.round(b.x),y:Math.round(b.y),hp:Math.ceil(b.hp),remaining:Math.ceil(b.remaining)})),
    sites:battle.sites.map(s=>({id:s.id,owner:s.owner})),previous:(commanderTeam==='blue'?battle.allyPlan:battle.enemyPlan)||null,opponentPlan:(commanderTeam==='blue'?battle.enemyPlan:battle.allyPlan)||null,queue:(commanderTeam==='blue'?battle.queue:battle.enemyQueue).map(q=>({type:q.type,remaining:Math.ceil(q.remaining),control:q.control||'auto'})),losses:{...battle.losses}};
}
export function planObservation(s,p){
  const crossing=PASSAGES.find(c=>c.id===p.passage),allied=s.commanderTeam==='blue',near=s.units.filter(u=>u.team===(allied?'red':'blue')&&Math.hypot(u.x-(allied?690:510),u.y-crossing.y)<210).length;
  return `${crossing.name}: ${near} soldati ${allied?'nemici':'tuoi'} entro 210 m dalla sponda. ${crossing.siege?'Accessibile agli arieti.':'Accessibile solo alla fanteria.'}`;
}
