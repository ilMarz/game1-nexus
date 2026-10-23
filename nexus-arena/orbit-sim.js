export const WIDTH=1200,HEIGHT=900,CENTER={x:600,y:450};
export const SECTORS=['north','east','south','west'];
export const SECTOR_NAMES={north:'NORD',east:'EST',south:'SUD',west:'OVEST'};
export const MODULES={
  laser:{name:'Torretta laser',cost:70,power:2,hp:110,range:300,damage:12,interval:.48,color:0x6ce7ef,role:'Rapida contro gli sciami; debole contro le corazze.'},
  missile:{name:'Batteria missili',cost:100,power:3,hp:120,range:380,damage:50,interval:2.2,color:0xffb874,role:'Perfora le corazze; lenta contro gli sciami.'},
  shield:{name:'Generatore scudo',cost:85,power:3,hp:150,range:215,color:0xbda6ff,role:'Assorbe danni alle strutture vicine e al nucleo.'},
  reactor:{name:'Reattore',cost:65,power:0,hp:90,range:0,color:0xb7fa74,role:'Produce 4 energia per livello. Difendilo dai razziatori.'},
  extractor:{name:'Estrattore orbitale',cost:75,power:2,hp:80,range:0,color:0xffdc85,role:'In battaglia: +6 crediti e +3 leghe ogni 6 s; +1 ricerca ogni 18 s. Richiede Industria.'}
};
export const TECHNOLOGIES={industry:{name:'Industria orbitale',cost:2,alloys:10,role:'Sblocca gli estrattori: produzione durante le ondate.'},fortify:{name:'Fortificazioni',cost:3,alloys:20,role:'Sblocca barriere di livello 2 e 3.'},engineering:{name:'Ingegneria avanzata',cost:5,alloys:30,role:'Sblocca strutture di livello 3.'}};
export const barrierHp=level=>180+(level-1)*120;
export const barrierPosition=sector=>{const a=-Math.PI/2+SECTORS.indexOf(sector)*Math.PI/2;return {x:600+Math.cos(a)*350,y:450+Math.sin(a)*350};};
export const UNITS={
  scout:{name:'Ricognitore',cost:1,hp:26,speed:54,damage:8,bounty:5},
  armor:{name:'Corazzato',cost:3,hp:125,speed:32,damage:22,bounty:13},
  bomber:{name:'Bombardiere',cost:3,hp:70,speed:40,damage:13,bounty:12},
  raider:{name:'Razziatore',cost:2,hp:48,speed:72,damage:12,bounty:8}
};
export const COMPOSITIONS={balanced:'FLOTTA MISTA',swarm:'SCIAME LEGGERO',armor:'COLONNA CORAZZATA',siege:'BOMBARDAMENTO',raiders:'INCURSIONE ENERGETICA'};
export const OBJECTIVES={core:'NUCLEO',energy:'REATTORI',cluster:'STRUTTURE RAGGRUPPATE',economy:'ESTRATTORI',barriers:'BRECCIA NELLE BARRIERE'};
export const SLOTS=SECTORS.flatMap((sector,q)=>[0,1,2,3].map(i=>{
  const radius=i<2?188:302,angle=-Math.PI/2+q*Math.PI/2+(i%2?1:-1)*(i<2?.34:.23);
  return {id:q*4+i,sector,label:SECTOR_NAMES[sector][0]+(i+1),x:CENTER.x+Math.cos(angle)*radius,y:CENTER.y+Math.sin(angle)*radius};
}));
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const budgetForWave=wave=>14+(wave-1)*7;
export const maxModuleHp=m=>MODULES[m.type].hp+(m.level-1)*35;
export const upgradeCost=m=>Math.round(MODULES[m.type].cost*(.65+(m.level-1)*.3));
export const rangeOf=m=>MODULES[m.type].range+(m.level-1)*22;
export function rng(seed){let value=seed>>>0;return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};}
export function normalizePlan(plan){
  if(!plan||!SECTORS.includes(plan.sector)||!Object.hasOwn(COMPOSITIONS,plan.composition)||!Object.hasOwn(OBJECTIVES,plan.objective))return null;
  return {sector:plan.sector,composition:plan.composition,objective:plan.objective};
}
export function waveManifest(plan,wave,seed=716,remaining=budgetForWave(wave)){
  const random=rng(seed+wave*193),choices={balanced:['scout','scout','armor','raider'],swarm:['scout','scout','scout','raider'],armor:['armor','armor','scout'],siege:['bomber','bomber','armor'],raiders:['raider','raider','scout']}[plan.composition];
  let budget=remaining;const units=[];
  while(budget>0){let type=choices[Math.floor(random()*choices.length)];if(UNITS[type].cost>budget)type='scout';budget-=UNITS[type].cost;units.push({type,offset:(random()-.5)*.62});}
  return units;
}
export function powerGrid(modules,mode='balanced'){
  const alive=modules.filter(m=>m&&m.hp>0),capacity=6+alive.filter(m=>m.type==='reactor'&&m.enabled).reduce((sum,m)=>sum+4*m.level,0);
  const active=new Set(alive.filter(m=>m.type==='reactor'&&m.enabled).map(m=>m.slot));
  const demand=alive.filter(m=>m.type!=='reactor'&&m.enabled).reduce((sum,m)=>sum+MODULES[m.type].power+m.level-1,0);
  let used=0;
  const rank=m=>(mode==='shields'?m.type==='shield':mode==='weapons'?['laser','missile'].includes(m.type):false)?1:0;
  for(const m of alive.filter(m=>m.enabled&&m.type!=='reactor').sort((a,b)=>rank(b)-rank(a)||a.slot-b.slot)){
    const cost=MODULES[m.type].power+m.level-1;if(used+cost<=capacity){used+=cost;active.add(m.slot);}
  }
  return {capacity,demand,used,active};
}
export function defenseSummary(modules,mode='balanced'){
  const power=powerGrid(modules,mode),coverage=Object.fromEntries(SECTORS.map(sector=>[sector,0]));
  for(const m of modules.filter(Boolean)){
    if(!power.active.has(m.slot)||!['laser','missile'].includes(m.type))continue;
    for(let q=0;q<4;q++){
      const a=-Math.PI/2+q*Math.PI/2,p={x:600+Math.cos(a)*280,y:450+Math.sin(a)*280};
      if(distance(SLOTS[m.slot],p)<rangeOf(m))coverage[SECTORS[q]]+=Math.round(MODULES[m.type].damage/MODULES[m.type].interval*(1+(m.level-1)*.55));
    }
  }
  return {coverage,power:{capacity:power.capacity,demand:power.demand,offline:modules.filter(m=>m&&m.enabled&&!power.active.has(m.slot)).length},
    counts:Object.fromEntries(Object.keys(MODULES).map(type=>[type,modules.filter(m=>m?.type===type).length])),
    cluster:Math.max(0,...modules.filter(Boolean).map(m=>modules.filter(n=>n&&distance(SLOTS[m.slot],SLOTS[n.slot])<215).length))};
}
export function localPlan(snapshot){
  const modules=snapshot.structures.map(m=>({...m,hp:m.hp??maxModuleHp(m),enabled:m.enabled!==false}));
  const {coverage,counts,cluster}=defenseSummary(modules,snapshot.mode);
  const sector=SECTORS.reduce((best,s)=>coverage[s]<coverage[best]?s:best,'north');
  const composition=counts.extractor?'raiders':counts.reactor>=2?'raiders':counts.shield>=2&&cluster>=3?'siege':counts.missile>counts.laser?'swarm':counts.laser>=2&&counts.missile===0?'armor':'balanced';
  const open=SECTORS.filter(s=>!snapshot.barriers?.some(b=>b.sector===s&&b.hp>0));
  const approach=open.length?open.reduce((best,s)=>coverage[s]<coverage[best]?s:best,open[0]):sector;
  return {sector:approach,composition:!open.length?'siege':composition,objective:counts.extractor?'economy':!open.length?'barriers':composition==='raiders'?'energy':composition==='siege'?'cluster':'core'};
}
export function explainPlan(plan,summary){
  const sector=SECTOR_NAMES[plan.sector],min=Math.min(...Object.values(summary.coverage));
  const opening=summary.coverage[plan.sector]===min?`${sector} è fra i settori meno coperti.`:`Ingresso da ${sector}.`;
  const detail=plan.objective==='economy'?`${summary.counts.extractor} estrattori sostengono la produzione: la flotta tenta di interromperla.`:plan.objective==='barriers'?'La flotta concentra il fuoco sulle fortificazioni prima di entrare.':plan.composition==='swarm'?`${summary.counts.missile} batterie missili: lo sciame mette alla prova la cadenza di tiro.`:plan.composition==='armor'?`${summary.counts.laser} laser: le corazze riducono il loro danno.`:plan.objective==='energy'?`${summary.counts.reactor} reattori alimentano la rete: sono gli obiettivi dell’incursione.`:plan.objective==='cluster'?`Gruppi fino a ${summary.cluster} strutture: il bombardamento può colpirne più di una.`:'La flotta cerca un varco verso il nucleo.';
  return opening+' '+detail;
}

export class OrbitBattle {
  constructor(seed=716){this.alloys=50;this.research=2;this.tech=[];this.barriers=[];this.adaptations=0;this.seed=seed;this.modules=Array(16).fill(null);this.credits=240;this.core=300;this.wave=0;this.phase='prep';this.time=0;this.enemies=[];this.missiles=[];this.events=[];this.nextId=1;this.mode='balanced';this.focus=null;this.reports=[];this.empUsed=false;}
  emit(type,data={}){this.events.push({type,...data});}
  drainEvents(){return this.events.splice(0);}
  build(slot,type){
    if(this.phase!=='prep'||!Number.isInteger(slot)||!SLOTS[slot]||!Object.hasOwn(MODULES,type)||this.modules[slot])return 'Postazione non disponibile.';
    if(this.credits<MODULES[type].cost)return 'Crediti insufficienti.';
    if(type==='extractor'&&!this.tech.includes('industry'))return 'Ricerca Industria orbitale per sbloccare gli estrattori.';
    this.credits-=MODULES[type].cost;this.modules[slot]={slot,type,level:1,hp:MODULES[type].hp,enabled:true,target:'first',invested:MODULES[type].cost,nextFire:0,charge:90,damagedAt:-10};this.emit('build',{slot});return null;
  }
  upgrade(slot){
    const m=this.modules[slot];if(this.phase!=='prep'||!m)return 'Potenziamenti disponibili nella preparazione.';
    if(m.level===2&&!this.tech.includes('engineering'))return 'Ricerca Ingegneria avanzata per il livello 3.';
    if(m.level>=3)return 'Livello massimo raggiunto.';const cost=upgradeCost(m);if(this.credits<cost)return 'Crediti insufficienti.';
    this.credits-=cost;m.invested+=cost;m.level++;m.hp=maxModuleHp(m);return null;
  }
  sell(slot){const m=this.modules[slot];if(this.phase!=='prep'||!m)return false;this.credits+=Math.floor(m.invested*.65);this.modules[slot]=null;return true;}
  repair(slot){
    if(this.phase!=='prep')return 'Ripara tra un’ondata e l’altra.';
    if(slot!==null&&!this.modules[slot])return 'Seleziona una struttura da riparare.';
    const m=slot===null?null:this.modules[slot],hp=m?m.hp:this.core,max=m?maxModuleHp(m):300;
    if(hp>=max)return 'Integrità già al massimo.';if(this.credits<20)return 'Servono 20 crediti.';
    this.credits-=20;if(m)m.hp=Math.min(max,hp+65);else this.core=Math.min(max,hp+65);return null;
  }
  unlock(id){
    const t=TECHNOLOGIES[id];if(!['prep','combat'].includes(this.phase)||!t||this.tech.includes(id))return 'Tecnologia non disponibile.';
    if(this.research<t.cost||this.alloys<t.alloys)return 'Ricerca o leghe insufficienti.';
    this.research-=t.cost;this.alloys-=t.alloys;this.tech.push(id);this.emit('technology',{id});return null;
  }
  constructBarrier(sector){
    if(!['prep','combat'].includes(this.phase)||!SECTORS.includes(sector))return 'Cantiere non disponibile.';
    const old=this.barriers.find(b=>b.sector===sector),level=old?old.level+1:1;
    if(old?.remaining>0)return 'Costruzione già in corso.';
    if(level>3)return 'Livello massimo raggiunto.';
    if(level>1&&!this.tech.includes('fortify'))return 'Ricerca Fortificazioni per potenziare le barriere.';
    const cost=25*level;if(this.alloys<cost||this.credits<20)return 'Servono 20 crediti e '+cost+' leghe.';
    this.alloys-=cost;this.credits-=20;
    if(old){old.remaining=6+level*2;old.duration=old.remaining;old.nextLevel=level;}
    else this.barriers.push({sector,level:1,hp:0,remaining:8,duration:8,nextLevel:1});
    this.emit('construction',{sector});return null;
  }
  advanceConstruction(dt){

    for(const b of this.barriers)if(b.remaining>0){b.remaining=Math.max(0,b.remaining-dt);if(b.remaining===0){b.level=b.nextLevel;b.hp=barrierHp(b.level);this.emit('barrierReady',{sector:b.sector});}}
  }
  snapshot(){
    const last=this.reports.at(-1),live=this.phase==='combat';
    return {wave:live?this.wave:this.wave+1,core:Math.ceil(this.core),mode:this.mode,structures:this.modules.filter(Boolean).map(({slot,type,level,hp,enabled})=>({slot,type,level,hp:Math.max(1,Math.ceil(hp)),enabled})),
      barriers:this.barriers.map(b=>({sector:b.sector,level:b.level,hp:Math.ceil(b.hp),remaining:Math.ceil(b.remaining)})),economy:{credits:this.credits,alloys:this.alloys,research:this.research,tech:[...this.tech]},
      live:live?{elapsed:Math.floor(this.time),kills:this.stats.kills,leaks:this.stats.leaks,damage:Math.ceil(this.stats.damage),destroyed:this.stats.destroyed,remainingBudget:this.manifest.slice(this.spawned).reduce((sum,u)=>sum+UNITS[u.type].cost,0),enemies:this.enemies.length,plan:this.plan}:null,
      last:last?{damage:last.damage,kills:last.kills,leaks:last.leaks,destroyed:last.destroyed,sector:last.plan.sector,composition:last.plan.composition,objective:last.plan.objective}:null};
  }
  adapt(plan,meta){
    plan=normalizePlan(plan);if(this.phase!=='combat'||!plan||this.adaptations>=2)return false;
    const budget=this.manifest.slice(this.spawned).reduce((sum,u)=>sum+UNITS[u.type].cost,0);
    const reserves=waveManifest(plan,this.wave,this.seed+1+this.adaptations,budget);
    this.manifest=[...this.manifest.slice(0,this.spawned),...reserves];this.total=this.manifest.length;
    this.plan=plan;this.meta=meta;this.nextSpawn=Math.max(this.nextSpawn,this.time+3);this.adaptations++;for(const e of this.enemies)e.target=null;
    this.emit('adapt',{plan,budget});return true;
  }
  launch(plan,meta={source:'off'}){
    plan=normalizePlan(plan);if(!plan||!['prep','planning','briefing'].includes(this.phase)||this.wave>=6)return false;
    this.productionTicks=0;this.productionTime=0;this.adaptations=0;this.wave++;this.phase='combat';this.plan=plan;this.meta=meta;this.time=0;this.nextSpawn=1;this.empUsed=false;this.focus=null;
    this.manifest=waveManifest(plan,this.wave,this.seed);this.total=this.manifest.length;this.spawned=0;this.stats={kills:0,leaks:0,damage:0,destroyed:0,spent:budgetForWave(this.wave),sector:plan.sector};
    for(const m of this.modules.filter(Boolean)){m.nextFire=0;m.charge=90*m.level;m.damagedAt=-10;}
    this.emit('launch');return true;
  }
  emp(){
    if(this.phase!=='combat'||this.empUsed)return false;this.empUsed=true;
    for(const e of this.enemies)if(distance(e,CENTER)<390){e.stunnedUntil=this.time+2.5;this.hit(e,40);}
    this.emit('emp');return true;
  }
  hit(e,amount){if(e.hp<=0)return;e.hp-=amount;this.emit('hit',{x:e.x,y:e.y});if(e.hp<=0){this.credits+=UNITS[e.type].bounty;this.alloys+=UNITS[e.type].cost;this.stats.kills++;this.emit('explosion',{x:e.x,y:e.y});}}
  damageModule(slot,amount){
    const m=slot===null?null:this.modules[slot],p=m?SLOTS[slot]:CENTER;if(slot!==null&&!m)return;
    let remaining=amount;
    for(const s of this.modules.filter(n=>n?.type==='shield'&&this.grid.active.has(n.slot)&&n.charge>0)){
      if(distance(SLOTS[s.slot],p)>rangeOf(s))continue;
      const absorbed=Math.min(s.charge,remaining);s.charge-=absorbed;remaining-=absorbed;s.damagedAt=this.time;this.emit('shield',{x:p.x,y:p.y});if(remaining<=0)break;
    }
    if(m){m.hp-=remaining;m.damagedAt=this.time;if(m.hp<=0){this.modules[slot]=null;this.stats.destroyed++;this.emit('explosion',p);}}
    else {const loss=Math.min(this.core,remaining);this.core-=loss;this.stats.damage+=loss;this.emit('coreHit');}
  }
  targetFor(e){
    if(this.plan.objective==='barriers'){const wall=this.barriers.filter(b=>b.hp>0).sort((a,b)=>distance(e,barrierPosition(a.sector))-distance(e,barrierPosition(b.sector)))[0];if(wall)return {slot:null,barrier:wall.sector,...barrierPosition(wall.sector)};}
    const barriers=this.barriers.filter(b=>b.hp>0&&distance(e,CENTER)>310);
    const angle=Math.atan2(e.y-450,e.x-600),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
    const barrier=barriers.find(b=>Math.abs(wrap(angle-(-Math.PI/2+SECTORS.indexOf(b.sector)*Math.PI/2)))<.62);
    if(barrier)return {slot:null,barrier:barrier.sector,...barrierPosition(barrier.sector)};
    const structures=this.modules.filter(Boolean);
    const candidates=this.plan.objective==='economy'?structures.filter(m=>m.type==='extractor'):this.plan.objective==='energy'?structures.filter(m=>m.type==='reactor'):this.plan.objective==='cluster'?structures:[];
    if(!candidates.length)return {slot:null,...CENTER};
    if(this.plan.objective==='cluster')candidates.sort((a,b)=>structures.filter(m=>distance(SLOTS[b.slot],SLOTS[m.slot])<215).length-structures.filter(m=>distance(SLOTS[a.slot],SLOTS[m.slot])<215).length||distance(SLOTS[a.slot],e)-distance(SLOTS[b.slot],e));
    else candidates.sort((a,b)=>distance(SLOTS[a.slot],e)-distance(SLOTS[b.slot],e));
    const slot=candidates[0].slot;return {slot,...SLOTS[slot]};
  }
  step(delta){
    const dt=clamp(delta,0,.05);if(['prep','combat'].includes(this.phase))this.advanceConstruction(dt);
    if(this.phase!=='combat')return;this.time+=dt;this.grid=powerGrid(this.modules,this.mode);
    this.productionTime+=dt;if(this.productionTime>=6){this.productionTime-=6;this.productionTicks++;const count=this.modules.filter(m=>m?.type==='extractor'&&this.grid.active.has(m.slot)).reduce((n,m)=>n+m.level,0);this.credits+=count*6;this.alloys+=count*3;if(this.productionTicks%3===0)this.research+=count;if(count)this.emit('production',{count});}
    if(this.spawned<this.total&&this.time>=this.nextSpawn){
      const entry=this.manifest[this.spawned++],type=entry.type,u=UNITS[type],a=-Math.PI/2+SECTORS.indexOf(this.plan.sector)*Math.PI/2+entry.offset;
      this.enemies.push({id:this.nextId++,type,x:600+Math.cos(a)*505,y:450+Math.sin(a)*420,hp:u.hp*Math.pow(1.12,this.wave-1),maxHp:u.hp*Math.pow(1.12,this.wave-1),nextFire:this.time+1,stunnedUntil:0,angle:a+Math.PI,target:null});
      this.nextSpawn=this.time+Math.max(this.plan.composition==='swarm'?.55:.85,26/this.total);
    }
    // The core has a modest point-defense weapon, so an uncovered opening is recoverable.
    if(this.time>=(this.coreFire??0)){
      const close=this.enemies.filter(e=>e.hp>0&&distance(e,CENTER)<150).sort((a,b)=>distance(a,CENTER)-distance(b,CENTER))[0];
      if(close){this.hit(close,7);this.coreFire=this.time+.65;this.emit('shot',{from:CENTER,to:{x:close.x,y:close.y},color:0x6ce7ef});}
    }
    for(const m of this.modules.filter(Boolean)){
      if(!this.grid.active.has(m.slot))continue;
      if(m.type==='shield'){if(this.time-m.damagedAt>3)m.charge=Math.min(90*m.level,m.charge+dt*7);continue;}
      if(!['laser','missile'].includes(m.type)||this.time<m.nextFire)continue;
      const origin=SLOTS[m.slot],inRange=this.enemies.filter(e=>e.hp>0&&distance(origin,e)<=rangeOf(m));
      inRange.sort((a,b)=>a.id===this.focus?-1:b.id===this.focus?1:m.target==='strongest'?b.hp-a.hp:m.target==='closest'?distance(a,origin)-distance(b,origin):distance(a,CENTER)-distance(b,CENTER));
      const e=inRange[0];if(!e)continue;m.nextFire=this.time+MODULES[m.type].interval/(1+(m.level-1)*.12);
      const damage=MODULES[m.type].damage*(1+(m.level-1)*.55);
      if(m.type==='missile'){this.missiles.push({id:this.nextId++,x:origin.x,y:origin.y,target:e.id,damage,last:{x:e.x,y:e.y}});}
      else {this.hit(e,damage*(e.type==='armor'?.35:1));this.emit('shot',{slot:m.slot,from:origin,to:{x:e.x,y:e.y},color:MODULES[m.type].color});}
    }
    for(const missile of this.missiles){
      const e=this.enemies.find(n=>n.id===missile.target&&n.hp>0);if(e)missile.last={x:e.x,y:e.y};
      const d=distance(missile,missile.last),travel=dt*310;
      if(d<=travel){missile.dead=true;if(e)this.hit(e,missile.damage);this.emit('explosion',{...missile.last,small:true});}
      else {missile.x+=(missile.last.x-missile.x)/d*travel;missile.y+=(missile.last.y-missile.y)/d*travel;}
    }
    for(const e of this.enemies){
      if(e.hp<=0||this.time<e.stunnedUntil)continue;
      if(!e.target||e.target.barrier&&!this.barriers.some(b=>b.sector===e.target.barrier&&b.hp>0)||e.target.slot!==null&&!this.modules[e.target.slot])e.target=this.targetFor(e);
      if(!e.target.barrier&&distance(e,CENTER)>350){const intercept=this.targetFor(e);if(intercept.barrier)e.target=intercept;}
      // Prolonged infrastructure raids become a final core assault: no shield stalemates.
      if(this.time>60&&!e.target.barrier)e.target={slot:null,...CENTER};
      const target=e.target,d=distance(e,target),reach=e.type==='bomber'?135:target.slot===null?48:65;
      if(d>reach){const speed=UNITS[e.type].speed,travel=Math.min(d-reach,speed*dt);e.x+=(target.x-e.x)/d*travel;e.y+=(target.y-e.y)/d*travel;e.angle=Math.atan2(target.y-e.y,target.x-e.x);}
      else if(target.barrier){if(this.time>=e.nextFire){e.nextFire=this.time+1.5;const wall=this.barriers.find(b=>b.sector===target.barrier);wall.hp=Math.max(0,wall.hp-UNITS[e.type].damage*(e.type==='bomber'?2:1));this.emit('enemyShot',{from:{x:e.x,y:e.y},to:target,color:0xff6b87});if(wall.hp===0){this.barriers=this.barriers.filter(b=>b!==wall);this.emit('explosion',target);}}}
      else if(target.slot===null){this.damageModule(null,UNITS[e.type].damage);this.stats.leaks++;e.hp=0;this.emit('explosion',{x:e.x,y:e.y,small:true});}
      else if(this.time>=e.nextFire){
        e.nextFire=this.time+1.5;this.emit('enemyShot',{from:{x:e.x,y:e.y},to:target,color:0xff6b87});
        if(e.type==='bomber')for(const m of [...this.modules].filter(Boolean)){if(distance(SLOTS[m.slot],target)<135)this.damageModule(m.slot,UNITS[e.type].damage);}
        else this.damageModule(target.slot,UNITS[e.type].damage);
      }
    }
    this.enemies=this.enemies.filter(e=>e.hp>0);this.missiles=this.missiles.filter(m=>!m.dead);
    if(this.core<=0){this.phase='lost';this.emit('end',{win:false});}
    else if(this.spawned>=this.total&&!this.enemies.length){
      const bonus=75+this.wave*12;this.credits+=bonus;this.alloys+=20;this.research+=2;this.reports.push({...this.stats,wave:this.wave,source:this.meta.source,plan:this.plan,bonus});
      this.phase=this.wave===6?'won':'prep';this.missiles=[];this.coreFire=0;this.emit('waveEnd',{win:this.phase==='won'});
    }
  }
}
