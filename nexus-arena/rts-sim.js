// Deterministic RTS simulation. Rendering and input live in rts-game.js.
import {W,H,PASSAGES,CLIFFS,terrainAt,zoneAt,walkable,findPath} from './rts-terrain.js';
import {normalizeRtsPlan,localRtsPlan,summarizeBattle,reinforcementBudget,MANEUVERS} from './rts-plans.js';
import {RESERVE_SHARE,assessFront} from './rts-balance.js';
import {ADVISOR_ORDERS,respectOrder} from './rts-orders.js';
export {W,H};
export const BRIDGES=PASSAGES.map(p=>p.y);
export const TROOPS={
  infantry:{name:'Spadaccino',gold:35,wood:0,hp:110,damage:15,range:23,speed:56,rate:.85,time:3,radius:9,role:'Tiene la linea · forte contro i lancieri'},
  pike:{name:'Lanciere',gold:25,wood:15,hp:85,damage:12,range:32,speed:58,rate:1,time:3,radius:8,role:'Economico · protegge arcieri e arieti'},
  archer:{name:'Arciere',gold:40,wood:20,hp:55,damage:12,range:142,speed:54,rate:1.35,time:4,radius:8,role:'Tiro a distanza · vulnerabile in mischia'},
  ram:{name:'Ariete',gold:100,wood:80,hp:330,damage:65,range:29,speed:31,rate:2.4,time:8,radius:15,role:'Danno ×3 agli edifici · scortalo'}
};
export const BUILDINGS={
  keep:{name:'Fortezza',hp:1600,radius:39,range:170,damage:18,rate:1.2},
  barracks:{name:'Caserma',gold:100,wood:70,hp:650,radius:30,time:10},
  tower:{name:'Torre',gold:80,wood:90,hp:520,radius:22,range:180,damage:22,rate:1.4,time:12},
  farm:{name:'Segheria',gold:50,wood:35,hp:300,radius:25,time:8},
  house:{name:'Alloggi',gold:30,wood:60,hp:280,radius:23,time:7}
};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class SiegeBattle{
  constructor(){
    this.time=0;this.gold=320;this.wood=220;this.phase='prep';this.nextId=1;this.units=[];this.buildings=[];this.shots=[];this.queue=[];this.wave=0;this.nextWave=45;this.incomeAt=5;this.events=[];
    this.navRevision=0;this.losses={blue:0,red:0};this.enemyPlan=null;this.allyPlan=null;this.allyEnabled=false;this.commandRevision=0;this.externalCommander=false;this.effects=[];
    this.tactics={blue:{},red:{}};this.tacticsAt=0;
    this.advisorOrder='balanced';this.orderRevision=0;this.developmentPending=false;this.developmentAt=0;this.developmentStatus='';
    this.sites=PASSAGES.map(p=>({id:p.id,x:600,y:p.y,owner:null,progress:0}));
    for(const [team,x] of [['blue',155],['red',1045]]){
      this.addBuilding('keep',team,x,380);this.addBuilding('barracks',team,team==='blue'?230:970,245);this.addBuilding('farm',team,team==='blue'?170:1030,540);
      this.addBuilding('tower',team,team==='blue'?350:850,380);
      ['infantry','infantry','infantry','pike','pike','archer','archer','archer'].forEach((type,i)=>this.spawn(type,team,team==='blue'?270+(i%3)*26:930-(i%3)*26,320+Math.floor(i/3)*43));
    }
    this.message('Schiera le truppe, poi avvia la battaglia.');
  }
  message(text){this.events.unshift(text);this.events.length=Math.min(6,this.events.length);}
  addBuilding(type,team,x,y,remaining=0){const d=BUILDINGS[type],b={id:this.nextId++,kind:'building',type,team,x,y,hp:d.hp,maxHp:d.hp,radius:d.radius,cooldown:0,remaining};this.buildings.push(b);this.navRevision++;return b;}
  spawn(type,team,x,y){const d=TROOPS[type],u={id:this.nextId++,kind:'unit',type,team,control:'auto',x,y,px:x,py:y,vx:0,vy:0,heading:team==='blue'?0:Math.PI,stride:0,hp:d.hp,maxHp:d.hp,radius:d.radius,cooldown:0,order:null,path:[],pathTimer:0};this.units.push(u);return u;}
  get cap(){return 30+this.buildings.filter(b=>b.team==='blue'&&b.type==='house'&&b.hp>0&&!b.remaining).length*10;}
  get population(){return this.units.filter(u=>u.team==='blue'&&u.hp>0).length;}
  entity(id){return this.units.find(u=>u.id===id&&u.hp>0)||this.buildings.find(b=>b.id===id&&b.hp>0);}
  train(type,availableToJev=true){
    const d=TROOPS[type];if(!d)return 'Unità sconosciuta.';
    if(['won','lost'].includes(this.phase))return 'La battaglia è terminata.';
    if(!this.buildings.some(b=>b.team==='blue'&&b.type==='barracks'&&b.hp>0&&!b.remaining))return 'Serve una caserma operativa.';
    if(this.population+this.queue.length>=this.cap)return 'Esercito al completo: costruisci alloggi.';
    if(this.queue.length>=8)return 'Coda piena: attendi il prossimo reclutamento.';
    if(this.gold<d.gold||this.wood<d.wood)return 'Risorse insufficienti.';
    this.gold-=d.gold;this.wood-=d.wood;this.queue.push({type,remaining:d.time,control:availableToJev?'auto':'manual'});this.commandRevision++;return null;
  }
  canBuild(type,x,y){
    const d=BUILDINGS[type];if(!d||type==='keep')return 'Edificio non disponibile.';
    if(['won','lost'].includes(this.phase))return 'La battaglia è terminata.';
    if(this.gold<d.gold||this.wood<d.wood)return 'Risorse insufficienti.';
    if(x<55||x>485||y<75||y>685)return 'Costruisci nel tuo territorio, a ovest del fiume.';
    if(CLIFFS.some(c=>dist(c,{x,y})<c.radius+d.radius+8))return 'Il costone roccioso impedisce la costruzione.';
    if(zoneAt(x,y)?.kind==='forest')return 'Il bosco offre copertura, ma non può ospitare edifici.';
    if(this.buildings.some(b=>b.hp>0&&dist(b,{x,y})<b.radius+d.radius+24))return 'Troppo vicino a un altro edificio.';
    return null;
  }
  build(type,x,y){const err=this.canBuild(type,x,y);if(err)return err;const d=BUILDINGS[type];this.gold-=d.gold;this.wood-=d.wood;this.addBuilding(type,'blue',x,y,d.time);this.message(`${d.name}: cantiere avviato.`);return null;}
  repair(){const keep=this.buildings.find(b=>b.team==='blue'&&b.type==='keep');if(!keep||keep.hp<=0||['won','lost'].includes(this.phase))return 'La battaglia è terminata.';if(keep.hp>=keep.maxHp)return 'Fortezza già integra.';if(this.gold<60||this.wood<30)return 'Servono 60 oro e 30 legno.';this.gold-=60;this.wood-=30;keep.hp=Math.min(keep.maxHp,keep.hp+260);return null;}
  command(ids,mode,x,y,target=null){
    const troops=this.units.filter(u=>ids.includes(u.id)&&u.team==='blue'&&u.hp>0);
    this.takeControl(ids,false);
    const cols=Math.ceil(Math.sqrt(troops.length)),facing=x>(troops.reduce((sum,u)=>sum+u.x,0)/troops.length||600)?1:-1;
    troops.sort((a,b)=>({pike:0,infantry:1,ram:2,archer:3}[a.type]-{pike:0,infantry:1,ram:2,archer:3}[b.type]));
    troops.forEach((u,i)=>{u.order={mode,x:clamp(x-Math.floor(i/cols)*25*facing,30,W-30),y:clamp(y+(i%cols-(cols-1)/2)*25,45,H-35),target};u.route=null;u.path=[];u.pathTimer=0;});
  }
  takeControl(ids,hold=true){
    let count=0;for(const u of this.units)if(u.team==='blue'&&u.hp>0&&ids.includes(u.id)){
      u.control='manual';u.duty='manual';u.committed=false;count++;if(hold){u.order={mode:'hold',x:u.x,y:u.y};u.path=[];u.route=null;u.vx=0;u.vy=0;}
    }if(count)this.commandRevision++;return count;
  }
  delegate(ids){
    let count=0;for(const u of this.units)if(u.team==='blue'&&u.hp>0&&ids.includes(u.id)){
      u.control='auto';u.duty=null;count++;u.order={mode:'hold',x:u.x,y:u.y};u.path=[];u.route=null;u.vx=0;u.vy=0;
    }if(count){this.commandRevision++;this.balanceArmy('blue',true);}return count;
  }
  setAllyEnabled(enabled){
    this.allyEnabled=!!enabled;this.commandRevision++;
    for(const u of this.units)if(u.team==='blue'&&u.control==='auto'){
      if(enabled&&this.allyPlan)continue;
      else{u.order={mode:'hold',x:u.x,y:u.y};u.path=[];u.route=null;u.vx=0;u.vy=0;}
    }
    if(enabled)this.balanceArmy('blue',true);
  }
  applyEnemyPlan(value){
    return this.applyCommanderPlan('red',value);
  }
  applyAllyPlan(value){return this.applyCommanderPlan('blue',value);}
  setAdvisorOrder(order){
    if(!Object.hasOwn(ADVISOR_ORDERS,order)||['won','lost'].includes(this.phase))return false;
    this.advisorOrder=order;this.orderRevision++;this.commandRevision++;this.developmentPending=false;this.developmentStatus='';
    if(this.allyPlan)this.balanceArmy('blue',true);return true;
  }
  developRealm(){
    if(this.phase!=='combat'||!this.allyEnabled||this.advisorOrder!=='develop'||!this.developmentPending||this.time<this.developmentAt)return;
    this.developmentAt=this.time+2;
    const action=this.allyPlan?.development;if(!action)return;
    if(action==='wait'){this.developmentPending=false;this.developmentStatus='Conservo le risorse e attendo il prossimo piano di sviluppo.';return;}
    const [kind,type]=action.split('_');let error;
    if(kind==='train'){
      if(this.queue.length>=2){this.developmentStatus='Attendo che si liberi la coda prima di aggiungere altri reclutamenti.';return;}
      error=this.train(type,true);if(!error)this.queue.at(-1).source='advisor';
    }else{
      const own=this.buildings.filter(b=>b.team==='blue'&&b.hp>0&&b.type===type);
      const maximum={barracks:1,house:3,farm:3,tower:4}[type];
      if(own.length>=maximum||own.some(b=>b.remaining)){this.developmentPending=false;this.developmentStatus='La struttura prevista è già presente o in costruzione. Rivaluto le necessità.';return;}
      const d=BUILDINGS[type];if(this.gold<d.gold||this.wood<d.wood){this.developmentStatus=`Attendo risorse per ${d.name.toLowerCase()}.`;return;}
      const sites=[];for(let y=100;y<=660;y+=70)for(let x=100;x<=450;x+=70)if(!this.canBuild(type,x,y)&&!this.units.some(u=>u.hp>0&&dist(u,{x,y})<d.radius+u.radius+12))sites.push({x,y});
      const target=type==='tower'?{x:420,y:this.units.filter(u=>u.team==='red'&&u.x<550).sort((a,b)=>a.x-b.x)[0]?.y||380}:{x:170,y:type==='farm'?550:180};
      sites.sort((a,b)=>dist(a,target)-dist(b,target));
      if(!sites.length){this.developmentStatus='Non trovo terreno libero adatto alla struttura: attendo una nuova valutazione.';return;}
      error=this.build(type,sites[0].x,sites[0].y);
    }
    if(error){this.developmentStatus=error;return;}
    this.developmentPending=false;this.developmentStatus=kind==='train'?`Ho avviato l’addestramento di ${TROOPS[type].name.toLowerCase()}, pagando oro e legno.`:`Ho avviato ${BUILDINGS[type].name.toLowerCase()}, pagando il costo del cantiere.`;
  }
  applyCommanderPlan(team,value){
    const plan=normalizeRtsPlan(value);if(!plan||team==='blue'&&!this.allyEnabled)return false;
    const field=team==='blue'?'allyPlan':'enemyPlan',changed=JSON.stringify(plan)!==JSON.stringify(this[field]);this[field]=plan;
    if(team==='blue'&&this.advisorOrder==='develop'&&plan.development)this.developmentPending=true;
    this.balanceArmy(team,changed);
    this.message(`${team==='blue'?'Alleato':'Nemico'} · ${changed?'nuovi ordini':'piano confermato'}: ${MANEUVERS[plan.maneuver]} · ${PASSAGES.find(p=>p.id===plan.passage).name}.`);return true;
  }
  enemyOrder(u){this.strategicOrder(u,this.enemyPlan);}
  balanceArmy(team,force=false){
    const raw=team==='blue'?this.allyPlan:this.enemyPlan,plan=team==='blue'&&raw?respectOrder(raw,this.advisorOrder):raw;if(!plan||team==='blue'&&!this.allyEnabled)return;
    const army=this.units.filter(u=>u.team===team&&u.hp>0&&u.control!=='manual'),home=this.buildings.filter(b=>b.team===team&&b.hp>0),keep=home.find(b=>b.type==='keep');if(!keep)return;
    const state=this.tactics[team],front=assessFront(this.units,this.buildings,team),west=team==='blue',sign=west?1:-1,crossing=PASSAGES.find(p=>p.id===plan.passage);
    if(team==='blue'&&this.advisorOrder==='wait'){
      for(const u of army){u.committed=false;if(force||u.duty!=='waiting')this.assignDuty(u,'waiting',{mode:'hold',x:u.x,y:u.y},null,true);}
      Object.assign(state,{emergency:false,launched:false,defense:0,attack:0,rally:0,recover:0,waiting:army.length});return;
    }
    if(front.emergency)state.dangerUntil=this.time+6;
    const emergency=this.time<(state.dangerUntil??0),defending=emergency||plan.maneuver==='defend';
    const healthy=[];
    for(const u of army){
      if(u.hp/u.maxHp<.28||u.duty==='recover'&&u.hp/u.maxHp<.8){this.assignDuty(u,'recover',{mode:'move',x:keep.x+sign*65,y:keep.y+(u.id%5-2)*22},null,force);u.committed=false;}
      else healthy.push(u);
    }
    const reserve=defending?healthy.length:Math.min(healthy.length,Math.max(1,Math.ceil(healthy.length*RESERVE_SHARE[plan.stance]),Math.min(front.threats+1,healthy.length)));
    // Preserve the garrison between evaluations; prefer infantry over siege engines.
    healthy.sort((a,b)=>(a.type==='ram')-(b.type==='ram')||(a.duty!=='defense')-(b.duty!=='defense')||a.id-b.id);
    const defenders=healthy.slice(0,reserve),attackers=healthy.slice(reserve);
    const threat=this.units.filter(u=>u.team!==team&&u.hp>0&&(west?u.x<500:u.x>700)).sort((a,b)=>dist(a,keep)-dist(b,keep))[0];
    const anchor=threat?home.slice().sort((a,b)=>dist(a,threat)-dist(b,threat))[0]:keep;
    for(const u of defenders){u.committed=false;this.assignDuty(u,'defense',{mode:'guard',x:clamp(anchor.x+sign*90,55,W-55),y:clamp(anchor.y+(u.id%5-2)*26,65,H-65)},null,force);}
    const desiredType={economy:'farm',barracks:'barracks',towers:'tower'}[plan.objective]||'keep',actualType=this.buildings.some(b=>b.team!==team&&b.type===desiredType&&b.hp>0)?desiredType:'keep';
    const minimum=plan.objective==='crossing'?2:['keep','tower'].includes(actualType)?6:4;
    const enough=attackers.length>=minimum||attackers.some(u=>u.type==='ram')&&attackers.length>=4;
    const committed=attackers.filter(u=>u.committed);
    if(defending||state.launched&&committed.length<=Math.max(1,(state.launchSize||0)*.45)){
      state.launched=false;state.regroupUntil=this.time+8;for(const u of attackers)u.committed=false;
    }
    const rally={x:west?440:760,y:crossing.y},gathered=attackers.filter(u=>dist(u,rally)<150);
    if(!state.launched&&enough&&this.time>=(state.regroupUntil??0)&&gathered.length>=Math.ceil(attackers.length*.7)){
      state.launched=true;state.launchSize=attackers.length;for(const u of attackers)u.committed=true;
    }
    if(state.launched){
      const veterans=attackers.filter(u=>u.committed);
      for(const u of attackers)if(!u.committed&&(gathered.length>=3&&gathered.includes(u)||veterans.some(v=>dist(u,v)<150)))u.committed=true;
    }
    for(const u of attackers){
      if(state.launched&&u.committed){if(force||u.duty!=='attack'||!u.order||u.order.target&&!this.entity(u.order.target)){u.duty='attack';this.strategicOrder(u,plan);}}
      else this.assignDuty(u,'rally',{mode:'guard',x:rally.x,y:clamp(rally.y+(u.id%5-2)*20,55,H-45)},crossing.id,force);
    }
    Object.assign(state,{emergency,defense:defenders.length,attack:attackers.filter(u=>u.duty==='attack').length,rally:attackers.filter(u=>u.duty==='rally').length,recover:army.filter(u=>u.duty==='recover').length,minimum});
  }
  assignDuty(u,duty,order,route,force){
    if(force||u.duty!==duty||!u.order||dist(u.order,order)>30){u.order=order;u.route=route;u.path=[];u.pathTimer=0;}
    u.duty=duty;
  }
  strategicOrder(u,plan){
    if(!plan||u.team==='blue'&&u.control==='manual')return;
    const opponent=u.team==='blue'?'red':'blue',west=u.team==='blue';
    let crossing=PASSAGES.find(p=>p.id===plan.passage);
    if(u.type==='ram'&&!crossing.siege)crossing=PASSAGES.filter(p=>p.siege).sort((a,b)=>Math.abs(a.y-u.y)-Math.abs(b.y-u.y))[0];
    let target=this.buildings.filter(b=>b.team===opponent&&b.hp>0&&b.type===({economy:'farm',barracks:'barracks',towers:'tower'}[plan.objective]||'keep')).sort((a,b)=>Math.abs(a.y-crossing.y)-Math.abs(b.y-crossing.y))[0];
    target=target||this.buildings.find(b=>b.team===opponent&&b.type==='keep'&&b.hp>0);
    if(plan.maneuver==='defend'){
      const hill=west?{x:425,y:178}:{x:785,y:580},north=west?hill:{x:790,y:178},point=u.type==='archer'?(crossing.y<380?north:hill):{x:(west?496:704)+(u.id%3)*17*(west?-1:1),y:crossing.y+(u.id%5-2)*17};
      u.order={mode:'guard',x:point.x,y:point.y,target:null};
    }else if(plan.objective==='crossing')u.order={mode:'attack',x:600,y:crossing.y+(u.id%3-1)*9,target:null};
    else if(target)u.order={mode:plan.maneuver==='flank'?'flank':'assault',x:target.x,y:target.y,target:target.id};
    u.route=crossing.id;u.path=[];u.pathTimer=0;
  }
  invade(){
    const barracks=this.buildings.filter(b=>b.team==='red'&&b.type==='barracks'&&b.hp>0);
    this.wave++;this.nextWave=this.time+Math.max(50,62-this.wave*2);
    if(!barracks.length){this.message('Caserma nemica distrutta: i rinforzi sono interrotti.');return;}
    if(!this.externalCommander||!this.enemyPlan)this.applyEnemyPlan(localRtsPlan(summarizeBattle(this)));
    const plan=this.enemyPlan,crossing=PASSAGES.find(p=>p.id===plan.passage),force=reinforcementBudget(this.units,this.buildings,this.wave);
    const roster={balanced:['infantry','pike','archer','infantry'],archers:['infantry','archer','archer','pike'],pikes:['pike','pike','archer','infantry'],siege:['infantry','pike','archer','ram']}[plan.composition];
    for(let i=0;i<force;i++){
      this.spawn(roster[i%roster.length],'red',970+(i%3)*24,clamp(crossing.y+Math.floor(i/3)*24-25,55,H-45));
    }
    this.balanceArmy('red');
    this.message(`Rinforzi ${this.wave}: ${force} unità · ${crossing.name}.`);
  }
  damage(attacker,target){
    const d=attacker.kind==='unit'?TROOPS[attacker.type]:BUILDINGS[attacker.type];let amount=d.damage;
    if(attacker.type==='ram')amount*=target.kind==='building'?3:.2;
    if(attacker.type==='infantry'&&target.type==='pike')amount*=1.65;
    if(attacker.type==='archer'&&target.type==='pike')amount*=1.35;
    if(attacker.type==='pike'&&target.type==='ram')amount*=2;
    if(target.type==='ram'&&attacker.type==='archer')amount*=.3;
    const sourceTerrain=terrainAt(attacker.x,attacker.y),targetTerrain=terrainAt(target.x,target.y);
    if(d.range>80){if(target.kind==='unit')amount*=targetTerrain.cover;if(sourceTerrain.elevation>targetTerrain.elevation)amount*=1.15;else if(sourceTerrain.elevation<targetTerrain.elevation)amount*=.85;}
    target.hp-=amount;target.lastHit=this.time;attacker.cooldown=d.rate;
    attacker.attackFlash=.22;attacker.heading=Math.atan2(target.y-attacker.y,target.x-attacker.x);
    this.shots.push({x:attacker.x,y:attacker.y,tx:target.x,ty:target.y,team:attacker.team,life:.28,maxLife:.28,ranged:d.range>80});
    this.effects.push({x:target.x,y:target.y,kind:target.hp<=0?'death':'hit',team:target.team,life:target.hp<=0?.8:.28});
    if(target.hp<=0){if(target.kind==='unit')this.losses[target.team]++;else this.navRevision++;if(target.team==='red')this.gold+=target.kind==='building'?65:7;if(target.kind==='building')this.message(`${BUILDINGS[target.type].name} ${target.team==='red'?'nemica distrutta':'alleata perduta'}!`);}
  }
  move(u,destination,dt){
    u.moved=true;
    u.pathTimer=Math.max(0,u.pathTimer-dt);
    const crossing=(u.x<650&&destination.x>650)||(u.x>550&&destination.x<550);
    const preferred=crossing?u.route:null,goalKey=`${Math.floor(destination.x/20)},${Math.floor(destination.y/20)},${preferred||''}`;
    if(!u.path||u.pathTimer===0&&(u.pathKey!==goalKey||u.navRevision!==this.navRevision||!u.path.length&&dist(u,destination)>24)){
      u.path=findPath(u,destination,u.type,this.buildings,preferred);u.pathKey=goalKey;u.pathTimer=.8+(u.id%7)*.08;u.navRevision=this.navRevision;
    }
    while(u.path.length&&dist(u,u.path[0])<8)u.path.shift();
    const direct=walkable(destination.x,destination.y,u.type,this.buildings,preferred)&&dist(u,destination)<32;
    const goal=direct?destination:u.path[0];if(!goal){u.vx=0;u.vy=0;return;}
    const dx=goal.x-u.x,dy=goal.y-u.y,dd=Math.hypot(dx,dy);if(dd<3){u.vx=0;u.vy=0;return;}
    const speed=TROOPS[u.type].speed*terrainAt(u.x,u.y).speed,arrival=u.path.length<=1?Math.min(1,dist(u,destination)/18):1;
    let vx=dx/dd*speed*arrival,vy=dy/dd*speed*arrival;
    for(const other of this.units){if(other===u||other.hp<=0)continue;const d=dist(u,other),radius=(u.radius+other.radius)*.95;
      if(d<radius&&d>.001){const push=(radius-d)/radius*24;vx+=(u.x-other.x)/d*push;vy+=(u.y-other.y)/d*push;}}
    const blend=1-Math.exp(-dt*10);u.vx+=(vx-u.vx)*blend;u.vy+=(vy-u.vy)*blend;
    const nx=u.x+u.vx*dt,ny=u.y+u.vy*dt;
    if(walkable(nx,ny,u.type,this.buildings,preferred)){u.x=nx;u.y=ny;}
    else if(walkable(nx,u.y,u.type,this.buildings,preferred)){u.x=nx;u.vy=0;}
    else if(walkable(u.x,ny,u.type,this.buildings,preferred)){u.y=ny;u.vx=0;}
    else {u.vx=0;u.vy=0;u.pathTimer=0;u.path=[];}
    if(Math.hypot(u.vx,u.vy)>3){const angle=Math.atan2(u.vy,u.vx),diff=Math.atan2(Math.sin(angle-u.heading),Math.cos(angle-u.heading));u.heading+=diff*Math.min(1,dt*12);u.stride+=Math.hypot(u.vx,u.vy)*dt*.18;}
  }
  tick(dt){
    dt=clamp(dt,0,.05);
    for(const u of this.units){u.px=u.x;u.py=u.y;u.moved=false;u.attackFlash=Math.max(0,(u.attackFlash||0)-dt);}
    if(this.phase==='prep'){
      for(const u of this.units)if(u.team==='blue'&&u.order&&u.order.mode!=='hold'){
        const goal=u.order.target?this.entity(u.order.target):u.order;
        // Deployment is limited to friendly land until the battle starts.
        if(goal)this.move(u,{x:Math.min(490,goal.x),y:goal.y},dt);
      }
      for(const u of this.units)if(!u.moved){u.vx=0;u.vy=0;}
      return;
    }
    if(this.phase!=='combat')return;this.time+=dt;
    for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
    for(const s of this.shots)s.life-=dt;this.shots=this.shots.filter(s=>s.life>0);
    for(const b of this.buildings)if(b.remaining>0)b.remaining=Math.max(0,b.remaining-dt);
    if(this.queue.length){const barracks=this.buildings.find(b=>b.team==='blue'&&b.type==='barracks'&&b.hp>0&&!b.remaining);if(barracks){this.queue[0].remaining-=dt;if(this.queue[0].remaining<=0){const q=this.queue.shift(),u=this.spawn(q.type,'blue',barracks.x+55,barracks.y+40);u.control=q.control||'auto';u.order={mode:'hold',x:u.x,y:u.y};this.balanceArmy('blue');this.commandRevision++;}}}
    if(this.time>=this.incomeAt){this.incomeAt+=5;const farms=this.buildings.filter(b=>b.team==='blue'&&b.type==='farm'&&b.hp>0&&!b.remaining).length;this.gold+=12+farms*5;this.wood+=8+farms*12;for(const s of this.sites)if(s.owner==='blue'){this.gold+=15;this.wood+=5;}}
    if(this.time>=this.nextWave)this.invade();
    this.developRealm();
    if(this.time>=this.tacticsAt){this.tacticsAt=this.time+1;this.balanceArmy('blue');this.balanceArmy('red');}
    const alive=this.units.filter(u=>u.hp>0),buildings=this.buildings.filter(b=>b.hp>0);
    for(const u of alive)if(u.hp<u.maxHp&&this.time-(u.lastHit??-10)>6&&buildings.some(b=>b.team===u.team&&!b.remaining&&['keep','barracks'].includes(b.type)&&dist(u,b)<140)&&!alive.some(e=>e.team!==u.team&&dist(u,e)<220))u.hp=Math.min(u.maxHp,u.hp+5*dt);
    for(const site of this.sites){const blue=alive.some(u=>u.team==='blue'&&u.type!=='ram'&&dist(u,site)<75),red=alive.some(u=>u.team==='red'&&u.type!=='ram'&&dist(u,site)<75);if(blue!==red){const team=blue?'blue':'red';if(site.owner!==team){site.progress+=dt*(blue?1:-1);if(Math.abs(site.progress)>=5){site.owner=team;site.progress=0;this.message(`${PASSAGES.find(p=>p.id===site.id).name}: ${team==='blue'?'conquistato, entrate +15 oro / +5 legno':'occupato dal nemico'}.`);}}else site.progress=0;}else site.progress=0;}
    for(const a of [...alive,...buildings]){
      a.cooldown=Math.max(0,a.cooldown-dt);const d=a.kind==='unit'?TROOPS[a.type]:BUILDINGS[a.type];if(!d.damage||a.remaining>0||a.hp<=0)continue;
      if(a.kind==='unit'&&(a.order?.mode==='move'||a.order?.mode==='flank'&&(a.team==='blue'?a.x<670:a.x>530))){if(dist(a,a.order)>14)this.move(a,a.order,dt);else a.order=null;continue;}
      const range=d.range*(d.range>80?terrainAt(a.x,a.y).range:1);
      let target=null;const ordered=a.order?.target&&this.entity(a.order.target);
      if(a.kind==='unit'&&a.control==='manual'&&a.order?.mode==='target'&&ordered&&dist(a,ordered)>range+ordered.radius){this.move(a,ordered,dt);continue;}
      if(ordered&&ordered.team!==a.team&&dist(a,ordered)<=range+ordered.radius)target=ordered;
      const foes=alive.filter(u=>u.team!==a.team&&u.hp>0);
      if(!target)target=foes.filter(u=>dist(a,u)<=range+u.radius).sort((u,v)=>dist(a,u)-dist(a,v))[0];
      if(!target)target=buildings.find(b=>b.team!==a.team&&b.hp>0&&dist(a,b)<=range+b.radius);
      if(target){a.vx=0;a.vy=0;if(a.cooldown===0)this.damage(a,target);continue;}
      if(a.kind==='building'||a.order?.mode==='hold')continue;
      if(a.order?.mode==='guard'){const intruder=a.duty==='defense'&&foes.filter(u=>dist(u,a.order)<180&&(a.team==='blue'?u.x<510:u.x>690)).sort((u,v)=>dist(a,u)-dist(a,v))[0];if(intruder)this.move(a,intruder,dt);else if(dist(a,a.order)>15)this.move(a,a.order,dt);continue;}
      const nearby=foes.filter(u=>dist(a,u)<(a.order?.mode==='attack'||a.order?.mode==='assault'?190:120)).sort((u,v)=>dist(a,u)-dist(a,v))[0];
      if(nearby&&a.type!=='ram')this.move(a,nearby,dt);
      else if(ordered)this.move(a,ordered,dt);
      else if(a.order&&dist(a,a.order)>16)this.move(a,a.order,dt);
    }
    for(const u of this.units)if(!u.moved){u.vx=0;u.vy=0;}
    this.units=this.units.filter(u=>u.hp>0);this.buildings=this.buildings.filter(b=>b.hp>0);
    if(!this.buildings.some(b=>b.team==='blue'&&b.type==='keep'))this.phase='lost';
    else if(!this.buildings.some(b=>b.team==='red'&&b.type==='keep'))this.phase='won';
  }
}
