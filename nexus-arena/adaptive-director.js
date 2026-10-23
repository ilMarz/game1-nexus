import {tacticFor} from './tactics.js';
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const pct=n=>Math.round(clamp(n,0,100));

// Eight seconds of actual displacement and counters, never intended key presses.
export class FlightTelemetry {
  constructor(bounds={left:60,right:1380,top:90,bottom:705}){this.bounds=bounds;this.samples=[];this.stillSeconds=0;}
  record(time,state){
    const last=this.samples.at(-1);if(last&&time-last.time<.25)return;
    const dt=last?time-last.time:0,dx=last?state.x-last.x:0,dy=last?state.y-last.y:0;
    const speed=dt?Math.hypot(dx,dy)/dt:0;
    this.stillSeconds=speed<35?this.stillSeconds+dt:0;
    this.samples.push({...state,time,dt,dx,dy,speed});
    while(this.samples.length>1&&time-this.samples[0].time>8)this.samples.shift();
  }
  snapshot(base){
    const last=this.samples.at(-1),first=this.samples[0];if(!last)return {...base};
    const b=this.bounds,x=pct((last.x-b.left)/(b.right-b.left)*100),y=pct((last.y-b.top)/(b.bottom-b.top)*100);
    const segments=this.samples.slice(1),duration=segments.reduce((sum,s)=>sum+s.dt,0);
    let distance=0,dx=0,dy=0,stationary=0,edge=0;
    for(const s of segments){
      distance+=Math.hypot(s.dx,s.dy);dx+=s.dx;dy+=s.dy;
      if(s.speed<35)stationary+=s.dt;
      const px=(s.x-b.left)/(b.right-b.left),py=(s.y-b.top)/(b.bottom-b.top);
      if(px<.16||px>.84||py<.16||py>.84)edge+=s.dt;
    }
    const shots=Math.max(0,last.shots-first.shots),hits=Math.max(0,last.hits-first.hits);
    return {...base,x,y,vx:Math.round(duration?dx/duration:0),vy:Math.round(duration?dy/duration:0),
      speed:Math.round(duration?distance/duration:0),stationaryPct:duration?pct(stationary/duration*100):100,
      edgePct:duration?pct(edge/duration*100):0,consistency:distance?pct(Math.hypot(dx,dy)/distance*100):0,
      recentDamage:Math.round(Math.max(0,last.damage-first.damage)),recentKills:Math.max(0,last.kills-first.kills),
      accuracy:shots?pct(hits/shots*100):0,windowSeconds:Math.round(duration*10)/10,stillSeconds:Math.round(this.stillSeconds*10)/10};
  }
}

export function needsRelief(s){return s.health<=25||s.recentDamage>=35||s.threats>=12;}
export function resolveTactic(proposal,s,time,recoveryUntil=0){
  const protectedRecovery=proposal!=='relief'&&(needsRelief(s)||time<recoveryUntil);
  return {tactic:protectedRecovery?'relief':proposal,protectedRecovery};
}
export function localTactic(s){
  if(needsRelief(s))return 'relief';
  if(s.edgePct>=60||s.stationaryPct>=65||s.consistency>=70&&s.speed>90)return 'flank';
  if(s.health>=65&&s.recentKills>=3)return 'barrage';
  return 'assault';
}
export function executionPlan(tactic,s,adaptive=true){
  const defaults={speed:0,consistency:0,stationaryPct:0,edgePct:0,recentDamage:0,recentKills:0,threats:0,vx:0,vy:0};
  s={...defaults,...s};
  if(!adaptive)return {adaptive:false,mode:'classic',lead:0,spawn:1,fire:1,speed:1,description:tacticFor(tactic).description};
  if(tactic==='relief')return {adaptive:true,mode:'recover',lead:0,spawn:1.3,fire:1.35,speed:.8,
    description:`Scafo ${Math.ceil(s.health)}%, danni recenti ${s.recentDamage}: rallento rinforzi, inseguimento e tiro per farti recuperare.`};
  if(tactic==='flank'){
    const predictable=s.consistency>=65&&s.speed>90;
    return {adaptive:true,mode:predictable?'intercept':'pincer',lead:predictable?.8:.25,spawn:1,fire:1,speed:1.05,
      description:predictable?'Rotta prevedibile: gli intercettori puntano davanti alla tua traiettoria.':s.edgePct>=60?'Stai ai bordi: intercettori sui fianchi e accerchiamento da due angoli.':'I nemici si separano e ti avvicinano da due angoli per chiudere lo spazio.'};
  }
  if(tactic==='barrage')return {adaptive:true,mode:'aimed-volley',lead:s.consistency>=65?.55:0,spawn:1,fire:1,speed:1,
    description:s.speed>90?'Sei mobile: salve mirate anticipano la tua rotta. La linea si blocca prima del colpo.':'Tieni la posizione: salve a ventaglio per costringerti a cambiare zona.'};
  return {adaptive:true,mode:'cutoff',lead:s.consistency>=65?.4:0,spawn:s.health>=75&&s.recentKills>=4?.9:1,fire:1,speed:1,
    description:s.recentKills>=4?'Elimini rapidamente i nemici: rinforzi frontali sulla tua corsia.':'Inseguimento sulla tua corsia, aggiornato alla posizione attuale.'};
}

export function adaptiveSpawn(tactic,s,random,width,height){
  const px=60+clamp(s.x??50,0,100)/100*(width-120),py=90+clamp(s.y??70,0,100)/100*(height-285);
  if(tactic==='flank'){
    const preferred=Math.abs(s.vx??0)>70?s.vx>0:px>width/2;
    let x=(random()<.75?preferred:!preferred)?width-25:25;
    const y=clamp(py+(s.vy??0)*.7+(random()-.5)*180,130,height-250);
    if(Math.hypot(x-px,y-py)<300)x=width-x;
    return {x,y};
  }
  if(tactic==='relief')return {x:px>width/2?100:width-100,y:35};
  return {x:clamp(px+(s.vx??0)*.7+(random()-.5)*420,100,width-100),y:35};
}
export function enemyIntent(enemy,player,velocity,plan,time){
  let x=player.x+velocity.x*plan.lead,y=player.y+velocity.y*plan.lead;
  if(plan.adaptive&&(plan.mode==='pincer'||plan.mode==='intercept')){
    x+=(enemy.flankSign??1)*160;y-=70;
  }else if(enemy.kind==='interceptor'){x+=Math.sin(time*2+enemy.phase)*150;y-=110;}
  if(enemy.kind==='heavy')y=Math.min(y-250,400);
  return {x:clamp(x,65,1375),y:clamp(y,100,705)};
}
export function firingTarget(enemy,player,velocity,plan){
  return {x:clamp(player.x+velocity.x*plan.lead,60,1380),y:clamp(player.y+velocity.y*plan.lead,90,705)};
}

export class DirectorCadence {
  constructor(){this.reset();}
  reset(){this.at=-Infinity;this.last=null;}
  canRequest(time){return time-this.at>=8;}
  due(time,s){
    if(!this.last)return time>=4?'prima lettura':null;
    if(!this.canRequest(time))return null;
    if(this.last.health-s.health>=20||needsRelief(s)&&!needsRelief(this.last))return 'pressione aumentata';
    if((s.stationaryPct>=65)!==(this.last.stationaryPct>=65)||(s.edgePct>=60)!==(this.last.edgePct>=60))return 'stile di movimento cambiato';
    if(Math.abs((s.x??50)-(this.last.x??50))>30||Math.abs((s.y??50)-(this.last.y??50))>30)return 'nuova zona';
    return time-this.at>=12?'rivalutazione':null;
  }
  mark(time,s){this.at=time;this.last={...s};}
}
