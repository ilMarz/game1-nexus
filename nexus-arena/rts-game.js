import Phaser from 'phaser';
import {SiegeBattle,TROOPS,BUILDINGS,W,H} from './rts-sim.js';
import {PASSAGES,ZONES,CLIFFS,terrainAt,walkable} from './rts-terrain.js';
import {COMPOSITIONS,OBJECTIVES,MANEUVERS} from './rts-plans.js';
import {STANCES} from './rts-balance.js';
import {ADVISOR_ORDERS,respectOrder} from './rts-orders.js';
import {DualRtsCommanders,FALLBACK_REASONS} from './rts-director.js';
import {drawTerrain} from './rts-art.js';
import {AdvisorJournal} from './rts-journal.js';
import {BattleAudio} from './rts-audio.js';
import './rts.css';

const $=id=>document.getElementById(id);
const text=(id,value)=>{if($(id).textContent!==String(value))$(id).textContent=String(value);};
let battle=new SiegeBattle(),selected=new Set(),paused=false,attackMode=false,building=null,scene,noticeEnd=0,lastUI=0;
const commanders=new DualRtsCommanders(),director=commanders.enemy,allyDirector=commanders.ally;let terrainVisible=true;
const ink={blue:0x558eb4,red:0xb75c45,blueLight:0xa1d5ee,redLight:0xf1a77b};
let audioStorage;try{audioStorage=localStorage;}catch{}
const audio=new BattleAudio({storage:audioStorage});
function audioUI(){text('audioToggle',audio.supported?(audio.enabled?'Audio ON':'Audio OFF'):'Audio non disponibile');$('audioToggle').setAttribute('aria-pressed',String(audio.enabled));$('audioToggle').setAttribute('aria-label',audio.enabled?'Disattiva gli effetti sonori':'Attiva gli effetti sonori');$('audioToggle').disabled=!audio.supported;$('audioVolume').value=String(Math.round(audio.volume*100));$('audioVolume').disabled=!audio.supported;}
document.addEventListener('pointerdown',()=>{void audio.unlock().then(audioUI);},{capture:true});
document.addEventListener('keydown',()=>{void audio.unlock().then(audioUI);},{capture:true});
$('audioToggle').onclick=()=>{audio.setEnabled(!audio.enabled);if(audio.enabled)void audio.unlock().then(()=>{audio.play({type:'order'});audioUI();});audioUI();};
$('audioVolume').oninput=()=>{audio.setVolume(Number($('audioVolume').value)/100);audioUI();};
audioUI();
const unitIcons={infantry:'⚔',knight:'♞',archer:'➶',ram:'▰'};
let journal=new AdvisorJournal();
function renderJournal(){
  const list=$('allyLog'),messages=journal.update(battle,allyDirector,{paused}),follow=list.scrollHeight-list.scrollTop-list.clientHeight<45;
  const last=Number(list.lastElementChild?.dataset.id||0);
  for(const message of messages)if(message.id>last){
    const li=document.createElement('li');li.className='advisor-message'+(message.kind==='player'?' player-message':'');li.dataset.id=message.id;
    const meta=document.createElement('div');meta.className='message-meta';
    const time=document.createElement('time');time.textContent=`${String(Math.floor(message.time/60)).padStart(2,'0')}:${String(message.time%60).padStart(2,'0')}`;
    const label=document.createElement('span');label.textContent=message.kind==='player'?'Tu · indicazione':message.kind==='decision'?(message.source==='typesafe'?'Jev · ordini validati':message.source==='fallback'?'Piano · ripiego locale':'Piano · regole locali'):'Consigliere · dal campo';
    meta.append(label,time);const body=document.createElement('p');body.textContent=message.text;li.append(meta,body);list.append(li);
  }
  while(list.children.length>120)list.firstElementChild.remove();
  if(follow)list.scrollTop=list.scrollHeight;
}
function notice(message){text('notice',message);noticeEnd=performance.now()+4500;}
function usable(){return !paused&&!['planning','won','lost'].includes(battle.phase);}
function train(type){if(!usable())return;const available=$('autoRecruits').checked,err=battle.train(type,available);notice(err||`${TROOPS[type].name} in coda · ${available?'disponibile al tuo Stratega':'riserva sotto il tuo controllo'}.`);refresh();}
for(const [type,d] of Object.entries(TROOPS)){
  const b=document.createElement('button');b.className='recruit';b.dataset.train=type;b.title=d.role;
  b.innerHTML=`<span class="unit-icon" aria-hidden="true">${unitIcons[type]}</span><span><b>${d.name}</b><small>${d.time} s · ${type==='ram'?'Assedio':type==='archer'?'Distanza':type==='knight'?'Cavalleria':'Fanteria'}</small></span><span class="cost">${d.gold} oro${d.wood?`<br>${d.wood} legno`:''}</span>`;
  const description=document.createElement('p');description.className='component-description';description.textContent={infantry:'Combatte in prima linea, tiene la posizione e protegge gli arcieri.',knight:'Combatte a cavallo: rapido e resistente. Forte contro arcieri e arieti, ideale per aggiramenti e rinforzi.',archer:'Colpisce a distanza; dalle alture guadagna gittata. Vulnerabile al corpo a corpo.',ram:'Danni tripli agli edifici e resistenza alle frecce. Richiede scorta e ponti larghi.'}[type];const id=`troop-description-${type}`;description.id=id;b.setAttribute('aria-describedby',id);const card=document.createElement('div');card.className='component-card';card.append(b,description);b.onclick=()=>train(type);$('recruit').append(card);
}
for(const type of ['barracks','tower','farm','house']){
  const d=BUILDINGS[type],b=document.createElement('button');b.dataset.build=type;b.innerHTML=`${d.name}<small>${d.gold} oro · ${d.wood} legno</small>`;
  const descriptions={barracks:'Permette di addestrare le truppe. Serve almeno una caserma operativa: senza, il reclutamento si ferma.',tower:'Spara automaticamente ai nemici vicini. Difende passaggi e accessi, ma può essere aggirata o abbattuta dagli arieti.',farm:'Produce 5 oro e 12 legno ogni 5 secondi, oltre alle entrate di base. Proteggila per mantenere i rinforzi.',house:'Aumenta di 10 il limite del tuo esercito quando è completato. Non recluta soldati da solo.'};
  const description=document.createElement('p');description.className='component-description';description.textContent=descriptions[type];description.id=`building-description-${type}`;b.setAttribute('aria-describedby',description.id);const card=document.createElement('div');card.className='component-card';card.append(b,description);
  b.onclick=()=>{if(!usable())return;building=building===type?null:type;attackMode=false;notice(building?`${d.name}: scegli un terreno libero sulla sponda sinistra. Esc per annullare.`:'Costruzione annullata.');refresh();};$('build').append(card);
}
function all(){if(!usable())return;selected=new Set(battle.units.filter(u=>u.team==='blue').map(u=>u.id));building=null;refresh();}
function order(mode,x,y,target=null){if(!usable())return;if(!selected.size){notice('Seleziona prima i tuoi soldati, oppure premi “Tutti”.');return;}
  battle.command([...selected],mode,x,y,target);scene?.mark(x,y,target?0xe9a483:0xe7d89d);building=null;attackMode=false;refresh();return true;
}
function hold(){if(!usable())return;if(!selected.size){notice('Seleziona le truppe da presidiare.');return;}battle.takeControl([...selected]);notice('Presidio manuale: il tuo Stratega non cambierà questi ordini.');refresh();}
function retreat(){if(order('move',275,410))notice('Rientro alla fortezza.');}
function toggleAttack(){if(!usable())return;attackMode=!attackMode;building=null;notice(attackMode?'Scegli dove avanzare: le truppe combatteranno lungo il percorso.':'Ordine di attacco annullato.');refresh();}
function togglePause(){if(battle.phase!=='combat')return;paused=!paused;audio.setPaused(paused);refresh();}
function restart(){audio.stop();audio.setPaused(false);commanders.reset();battle=new SiegeBattle();journal=new AdvisorJournal();$('allyLog').replaceChildren();selected.clear();paused=false;attackMode=false;building=null;lastUI=0;scene?.scene.restart();notice('Il nemico parte in superiorità: prepara rinforzi e difese, poi coordina le truppe con lo Stratega.');refresh();}
$('selectAll').onclick=all;$('attack').onclick=toggleAttack;$('hold').onclick=hold;$('retreat').onclick=retreat;
$('startQuick').onclick=()=>{commanders.start(battle,$('provider').value,$('allyEnabled').checked);notice($('provider').value==='typesafe'?'I Consiglieri Strateghi stanno studiando eserciti, terreno e ordini manuali…':'Comandanti locali attivi: nessuna chiamata allo Stratega.');refresh();};
$('allyEnabled').onchange=()=>{commanders.setAllyEnabled(battle,$('allyEnabled').checked);notice($('allyEnabled').checked?'Il tuo Stratega guiderà le unità disponibili. I soldati manuali restano ai tuoi ordini.':'Stratega alleato sospeso. Le sue truppe presidiano la posizione.');refresh();};
$('delegate').onclick=()=>{if(!usable())return;if(!selected.size){notice('Seleziona le truppe da affidare al tuo Stratega.');return;}const count=battle.delegate([...selected]);notice(`${count} unità disponibili al tuo Stratega${$('allyEnabled').checked?'.':': attiva il comandante per guidarle.'}`);refresh();};
$('manual').onclick=()=>{if(!usable())return;if(!selected.size){notice('Seleziona le truppe da controllare.');return;}const count=battle.takeControl([...selected]);notice(`${count} unità ai tuoi ordini. Il Consigliere non le sposterà.`);refresh();};
$('zoomIn').onclick=()=>scene?.zoomBy(.35);$('zoomOut').onclick=()=>scene?.zoomBy(-.35);$('zoomReset').onclick=()=>scene?.resetView();
$('provider').onchange=()=>refresh();
for(const button of document.querySelectorAll('[data-advisor-order]'))button.onclick=()=>{if(!usable())return;const order=button.dataset.advisorOrder;if(!commanders.setAdvisorOrder(battle,order))return;journal.add(battle.time,ADVISOR_ORDERS[order],'player');if(!$('allyEnabled').checked){$('allyEnabled').checked=true;commanders.setAllyEnabled(battle,true);}refresh();};
function toggleTerrain(){terrainVisible=!terrainVisible;$('terrainToggle').setAttribute('aria-pressed',String(terrainVisible));for(const label of scene?.terrainLabels||[])label.setVisible(terrainVisible);}
$('terrainToggle').onclick=toggleTerrain;
for(const p of PASSAGES){const button=document.createElement('button');button.dataset.passage=p.id;button.title=p.weakness;button.innerHTML=`<span>${p.kind==='ford'?'≈':p.kind==='ruins'?'⋮':'⌒'} ${p.name}</span><small>${p.siege?'Tutte le truppe':'Fanteria + cavalleria'}</small>`;button.onclick=()=>{if(!p.siege&&[...selected].some(id=>battle.entity(id)?.type==='ram')){notice('Guadi e rovine non reggono gli arieti. Seleziona fanteria e cavalleria oppure usa uno dei ponti.');return;}order('attack',600,p.y);};$('passages').append(button);}
$('pause').onclick=togglePause;$('restart').onclick=restart;
$('repair').onclick=()=>{if(!usable())return;notice(battle.repair()||'Fortezza riparata: +260 integrità.');refresh();};
$('overlayAction').onclick=()=>{if(['won','lost'].includes(battle.phase))restart();else togglePause();};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&battle.phase==='combat'){paused=true;audio.setPaused(true);refresh();}});
document.addEventListener('keydown',e=>{
  if(e.target.closest('input,select,textarea')||e.repeat)return;
  const key=e.key.toLowerCase();if(key===' '){e.preventDefault();togglePause();return;}
  if(key==='escape'){building=null;attackMode=false;refresh();return;}
  if(key==='t'){toggleTerrain();return;}
  if(!usable())return;
  if(key==='q')all();if(key==='a')toggleAttack();if(key==='h')hold();if(key==='r')retreat();
  if('1234'.includes(key))train(Object.keys(TROOPS)[Number(key)-1]);
});
function refresh(){
  selected=new Set([...selected].filter(id=>battle.entity(id)));
  text('gold',battle.gold);text('wood',battle.wood);text('population',`${battle.population} / ${battle.cap}`);
  const keep=battle.buildings.find(b=>b.team==='blue'&&b.type==='keep');text('keep',`${Math.max(0,Math.ceil(keep?.hp||0))} / 1600`);
  text('clock',`${String(Math.floor(battle.time/60)).padStart(2,'0')}:${String(Math.floor(battle.time%60)).padStart(2,'0')}`);
  text('status',battle.phase==='prep'?'SCHIERAMENTO LIBERO':battle.phase==='planning'?'ANALISI DEL COMANDANTE…':battle.phase==='won'?'IL REGNO È SALVO':battle.phase==='lost'?'FORTEZZA CADUTA':paused?'BATTAGLIA IN PAUSA':battle.tactics.red.attack?'IL NEMICO AVANZA':'BATTAGLIA IN CORSO');
  text('selection',selected.size?`${selected.size} ${selected.size===1?'soldato selezionato':'unità selezionate'}`:'Nessuna unità selezionata');
  const types={};for(const id of selected){const u=battle.entity(id);if(u)types[u.type]=(types[u.type]||0)+1;}
  const manualSelected=[...selected].filter(id=>battle.entity(id)?.control==='manual').length;
  text('selectionHint',selected.size?`${Object.entries(types).map(([t,n])=>`${n} ${TROOPS[t].name}`).join(' · ')} · ${manualSelected} manuali / ${selected.size-manualSelected} allo Stratega`:'Trascina un riquadro sui soldati blu');
  $('attack').setAttribute('aria-pressed',String(attackMode));
  $('pause').disabled=battle.phase!=='combat';text('pause',paused?'Riprendi ▶':'Pausa Ⅱ');$('pause').setAttribute('aria-label',paused?'Riprendi la battaglia':'Metti in pausa la battaglia');
  $('startQuick').hidden=battle.phase!=='prep';
  const terminal=['won','lost'].includes(battle.phase),locked=paused||terminal||battle.phase==='planning';$('provider').disabled=battle.phase!=='prep';
  for(const el of document.querySelectorAll('[data-train]')){const d=TROOPS[el.dataset.train];el.disabled=locked||battle.gold<d.gold||battle.wood<d.wood||battle.population+battle.queue.length>=battle.cap||battle.queue.length>=8||!battle.buildings.some(b=>b.type==='barracks'&&b.team==='blue'&&!b.remaining);}
  for(const el of document.querySelectorAll('[data-build]')){const d=BUILDINGS[el.dataset.build];el.classList.toggle('active',building===el.dataset.build);el.disabled=locked||battle.gold<d.gold||battle.wood<d.wood;}
  for(const id of ['selectAll','attack','hold','retreat','repair','delegate','manual'])$(id).disabled=locked;
  $('allyEnabled').disabled=terminal||battle.phase==='planning';
  for(const button of document.querySelectorAll('[data-advisor-order]')){button.disabled=locked;button.setAttribute('aria-pressed',String(button.dataset.advisorOrder===battle.advisorOrder));}
  text('advisorPriority',battle.emergencyDefense?.active?'EMERGENZA: difensori insufficienti. Lo Stratega può pagare rinforzi e strutture difensive finché serve.':battle.advisorOrder==='develop'?'Sviluppo delegato: Jev può spendere oro e legno per unità e strutture. Cambia priorità per fermare nuovi ordini automatici.':battle.advisorOrder==='wait'?'Attesa: posizioni ferme, nessuna nuova spesa automatica.':battle.advisorOrder==='defend'?'Difesa: proteggi la base con le truppe automatiche.':battle.advisorOrder==='attack'?'Offensiva: aumenta la forza d’attacco mantenendo un presidio.':'Tu recluti e costruisci. Il Consigliere bilancia attacco e difesa.');
  text('buildHint',building?`${BUILDINGS[building].name}: clicca il terreno a ovest del fiume. Esc annulla.`:'Scegli un edificio, poi un terreno libero sulla tua sponda.');
  const hasBarracks=battle.buildings.some(b=>b.team==='blue'&&b.type==='barracks'&&!b.remaining);
  text('queue',battle.queue.length?`${hasBarracks?'In addestramento':'In attesa di una caserma'}: ${TROOPS[battle.queue[0].type].name} · ${Math.ceil(battle.queue[0].remaining)} s · ${battle.queue[0].control==='manual'?'tuo controllo':'affidato allo Stratega'}${battle.queue.length>1?` · altri ${battle.queue.length-1} in coda`:''}`:'Caserma pronta. Scegli tu quali truppe creare.');
  const farms=battle.buildings.filter(b=>b.team==='blue'&&b.type==='farm'&&!b.remaining).length,sites=battle.sites.filter(s=>s.owner==='blue').length;
  text('income',`${12+farms*5+sites*15} oro · ${8+farms*12+sites*5} legno`);
  for(const button of document.querySelectorAll('[data-passage]')){const site=battle.sites.find(s=>s.id===button.dataset.passage);button.dataset.owner=site.owner||'neutral';button.classList.toggle('enemy-route',director.plan?.passage===site.id);button.disabled=locked;}
  const local=$('provider').value==='off';
  text('startQuick',local?'Inizia la battaglia ↗':'Avvia la battaglia ↗');
  const allyEnabled=$('allyEnabled').checked,autoCount=battle.units.filter(u=>u.team==='blue'&&u.control!=='manual').length,manualCount=battle.population-autoCount;
  const allySource=!allyEnabled?'ASSISTENZA SOSPESA':allyDirector.source==='typesafe'?'STRATEGA ALLEATO · RISPOSTA VALIDATA':allyDirector.source==='fallback'?'ALLEATO · RIPIEGO LOCALE':allyDirector.source==='off'?'ALLEATO · REGOLE LOCALI':'STRATEGA ALLEATO · IN ATTESA';
  text('allySource',allySource);$('allySource').dataset.source=allyDirector.source||'';
  text('controlValue',`${autoCount} disponibili allo Stratega · ${manualCount} manuali`);
  text('allyStatus',!allyEnabled?'Il tuo comandante è sospeso. Le unità disponibili presidiano la posizione.':allyDirector.busy?'Il tuo Stratega analizza il campo. I tuoi ordini manuali restano prioritari.':allyDirector.source==='typesafe'?`Risposta reale TypeSafe · ${allyDirector.meta.latencyMs} ms · confidenza ${Math.round(allyDirector.meta.confidence*100)}%`:allyDirector.source==='fallback'?(FALLBACK_REASONS[allyDirector.meta.reason]||'Stratega non disponibile: assistenza locale dichiarata.'):allyDirector.source==='off'?'Strategia locale sulle truppe disponibili. Nessuna chiamata allo Stratega.':'Tu scegli e recluti le truppe. Il tuo Stratega guida quelle che gli affidi.');
  const displayedPlan=allyDirector.plan&&respectOrder(allyDirector.plan,battle.advisorOrder);
  text('allyPlan',displayedPlan?`${STANCES[displayedPlan.stance??'balanced']} · ${MANEUVERS[displayedPlan.maneuver]} · ${PASSAGES.find(p=>p.id===allyDirector.plan.passage).name}`:'In attesa del tuo esercito');
  text('allyDetails',allyDirector.plan?`${autoCount} unità disponibili → ${OBJECTIVES[allyDirector.plan.objective]}${allyDirector.plan.objective==='crossing'?'':' nemica'}`:'Nessun reclutamento automatico: decidi tu le unità.');
  text('allyRecheck',!allyEnabled?'Puoi riattivarlo in qualsiasi momento.':battle.phase==='prep'?'Analisi all’avvio, poi ogni 5 s. Ordini manuali sempre prioritari.':`${allyDirector.calls} decisioni · ${paused?'in pausa':allyDirector.busy?'analisi in corso':terminal?'battaglia conclusa':`prossima analisi tra ${Math.max(0,Math.ceil(allyDirector.nextAt-battle.time))} s`}`);
  renderJournal();
  document.querySelector('.ally-card').classList.toggle('is-thinking',allyEnabled&&allyDirector.busy);
  $('overlay').hidden=!paused&&!terminal;
  if(paused||terminal){text('endLabel',terminal?'LA VALLE DEI DUE PONTI':'BATTAGLIA SOSPESA');text('endTitle',battle.phase==='won'?'Il regno è salvo':battle.phase==='lost'?'La fortezza è caduta':'Il regno attende');text('endText',battle.phase==='won'?`Hai distrutto la fortezza nemica e protetto il tuo regno dopo ${battle.wave} incursioni.`:battle.phase==='lost'?'Il nemico ha invaso il tuo regno. Presidia i ponti, aumenta le entrate e proteggi gli arcieri dietro la fanteria.':'Il tempo, i reclutamenti e i combattimenti sono fermi.');text('overlayAction',terminal?'Fonda un nuovo regno ↗':'Riprendi la battaglia ↗');}
}

class Valley extends Phaser.Scene{
  constructor(){super('valley');}
  create(){
    scene=this;this.drag=null;this.pointer={x:0,y:0};this.markers=[];this.walk=new Map();this.accumulator=0;
    this.terrain();this.g=this.add.graphics();this.labels=new Map();this.input.mouse.disableContextMenu();
    this.cameras.main.setBounds(0,0,W,H);
    for(const label of this.terrainLabels)label.setVisible(terrainVisible);
    this.input.on('pointerdown',p=>{
      if(p.middleButtonDown()){this.pan={x:p.x,y:p.y,scrollX:this.cameras.main.scrollX,scrollY:this.cameras.main.scrollY};return;}
      if(!usable())return;
      const point=this.worldPoint(p);
      if(p.rightButtonDown()){if(building){building=null;refresh();return;}this.commandAt(point);return;}
      if(building){const err=battle.build(building,point.x,point.y);notice(err||`${BUILDINGS[building].name}: costruzione avviata.`);if(!err)building=null;refresh();return;}
      if(attackMode){this.commandAt(point,true);return;}
      this.drag={...point,shift:p.event.shiftKey,touch:p.wasTouch};
    });
    this.input.on('pointermove',p=>{if(this.pan)this.cameras.main.setScroll(this.pan.scrollX-(p.x-this.pan.x)/this.cameras.main.zoom,this.pan.scrollY-(p.y-this.pan.y)/this.cameras.main.zoom);this.pointer=this.worldPoint(p);const terrain=terrainAt(this.pointer.x,this.pointer.y);text('terrainName',terrain.name);text('terrainInfo',terrain.description);});
    this.input.on('pointerup',p=>{
      if(this.pan){this.pan=null;return;}
      if(!this.drag||!usable()){this.drag=null;return;}const from=this.drag;this.drag=null;
      p=this.worldPoint(p);
      if(Math.hypot(p.x-from.x,p.y-from.y)>10){
        if(!from.shift)selected.clear();for(const u of battle.units)if(u.team==='blue'&&u.x>=Math.min(from.x,p.x)&&u.x<=Math.max(from.x,p.x)&&u.y>=Math.min(from.y,p.y)&&u.y<=Math.max(from.y,p.y))selected.add(u.id);
      }else{
        const ally=battle.units.filter(u=>u.team==='blue'&&Math.hypot(u.x-p.x,u.y-5-p.y)<23).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
        if(ally){if(!from.shift)selected.clear();if(from.shift&&selected.has(ally.id))selected.delete(ally.id);else selected.add(ally.id);}
        else if(from.touch&&selected.size)this.commandAt(p);
        else {const foe=this.enemyAt(p);if(foe&&selected.size)this.commandAt(p);else if(!from.shift)selected.clear();}
      }refresh();
    });
    refresh();
  }
  worldPoint(pointer){return this.cameras.main.getWorldPoint(pointer.x,pointer.y);}
  zoomBy(delta){const camera=this.cameras.main;camera.setZoom(Phaser.Math.Clamp(camera.zoom+delta,1,2.4));const army=battle.units.filter(u=>selected.has(u.id));if(army.length)camera.centerOn(army.reduce((sum,u)=>sum+u.x,0)/army.length,army.reduce((sum,u)=>sum+u.y,0)/army.length);}
  resetView(){this.cameras.main.setZoom(1).centerOn(W/2,H/2);}
  enemyAt(p){return [...battle.units,...battle.buildings].filter(u=>u.team==='red'&&Math.hypot(u.x-p.x,u.y-p.y)<u.radius+13).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];}
  commandAt(p,attack=false){const foe=this.enemyAt(p);if(!foe&&!walkable(p.x,p.y,'infantry',[])){notice('Terreno impraticabile: scegli un passaggio o aggira le rocce.');return;}if(!foe&&p.x>550&&p.x<650&&[...selected].some(id=>battle.entity(id)?.type==='ram')&&!walkable(p.x,p.y,'ram',[])){notice('Gli arieti possono attraversare solo i due ponti larghi.');return;}order(foe?'target':attack?'attack':'move',p.x,p.y,foe?.id);}
  mark(x,y,color){this.markers.push({x,y,color,life:.8});}
  terrain(){drawTerrain(this);}
  tree(g,x,y,r,type){g.fillStyle(0x2e462d,.2).fillEllipse(x+6,y+10,r*1.8,r*.8);g.fillStyle(0x65553b).fillRect(x-3,y-8,6,21);g.fillStyle([0x3f6039,0x4c693b,0x536e3f][type]).fillCircle(x,y-r*.6,r);g.fillStyle(0x647e48,.65).fillCircle(x-r*.27,y-r*.85,r*.65);g.fillStyle(0x8e9b5b,.25).fillCircle(x-r*.35,y-r,r*.38);}
  building(b,g){
    const x=b.x,y=b.y,r=b.radius,team=ink[b.team],roof=b.team==='blue'?0x4d7181:0x965c43;
    g.fillStyle(0x293b25,.25).fillEllipse(x+8,y+14,r*2.6,r*1.3);
    if(b.remaining){g.fillStyle(0x8b7f60).fillRect(x-r,y-r*.5,r*2,r);g.lineStyle(3,0xb8a170).strokeRect(x-r,y-r,r*2,r*1.7);g.lineBetween(x-r,y-r,x+r,y+r*.7);g.lineBetween(x+r,y-r,x-r,y+r*.7);g.lineStyle(4,0xe3c98a).lineBetween(x-r,y+r+6,x-r+2*r*(1-b.remaining/BUILDINGS[b.type].time),y+r+6);return;}
    if(b.type==='keep'||b.type==='tower'){
      const k=b.type==='keep';g.fillStyle(0x777d6a).fillRect(x-r,y-r*.8,r*2,r*1.5);g.fillStyle(0xb6b69a).fillRect(x-r,y-r,r*2,r*1.4);g.fillStyle(0x969d83).fillRect(x,y-r,r,r*1.4);
      g.lineStyle(1,0x737b65,.5);for(let dy=-r,row=0;dy<r*.4;dy+=10,row++){g.lineBetween(x-r,y+dy,x+r,y+dy);for(let dx=-r+(row%2)*11;dx<r;dx+=22)g.lineBetween(x+dx,y+dy,x+dx,y+dy+9);}
      g.fillStyle(0x465344).fillRect(x-9,y-5,18,r*.5+8);g.fillStyle(0x7a6746).fillRect(x-6,y-3,12,r*.5+6);
      if(k){for(const dx of [-r,r-15]){g.fillStyle(0x8e9780).fillRect(x+dx-5,y-r-13,21,r*1.7);g.fillStyle(0xbfc1a0).fillRect(x+dx-5,y-r-18,21,12);g.fillStyle(0xcfd0ab);for(let i=0;i<3;i++)g.fillRect(x+dx-5+i*8,y-r-23,5,8);g.fillStyle(0x3f5043).fillRect(x+dx+3,y-r+3,5,10);}g.fillStyle(roof).fillTriangle(x-r+12,y-r+3,x,y-r-24,x+r-12,y-r+3);}
      else {g.fillStyle(0xc1c1a0).fillRect(x-r-3,y-r-6,r*2+6,10);for(let i=0;i<4;i++)g.fillRect(x-r-3+i*14,y-r-12,7,10);g.fillStyle(0x3e4f40).fillRect(x-4,y-r+8,8,13);}
      this.flag(g,x+(k?7:0),y-r-(k?48:34),team);
    }else{
      const w=r*2,h=r*1.25;g.fillStyle(0xb8ac83).fillRect(x-r,y-h*.5,w,h);g.fillStyle(0x918969).fillRect(x+4,y-h*.5,r-4,h);g.fillStyle(0x574f39).fillRect(x-r,y-h*.5,4,h).fillRect(x+r-4,y-h*.5,4,h).fillRect(x-r,y+6,w,3);g.fillStyle(roof).fillTriangle(x-r-8,y-h*.5+3,x,y-h*.5-28,x+r+8,y-h*.5+3);g.fillStyle(b.team==='blue'?0x6b8c95:0xae7354).fillTriangle(x-r-8,y-h*.5+3,x,y-h*.5-28,x,y-h*.5+3);g.lineStyle(1,0x283d34,.4);for(let i=0;i<4;i++)g.lineBetween(x-r+7+i*9,y-h*.5,x-10+i*6,y-h*.5-18);
      g.fillStyle(0x4a4b36).fillRect(x-7,y+1,14,h*.5-1);g.fillStyle(0xd5bf89).fillRect(x-r+9,y-8,7,7);
      if(b.type==='barracks'){this.flag(g,x+r-4,y-h*.5-32,team);g.lineStyle(3,0xc9c9af).lineBetween(x-15,y+12,x-29,y-4).lineBetween(x-29,y+12,x-15,y-4);}
      if(b.type==='farm'){g.fillStyle(0x8c7b45).fillRect(x-r-12,y+27,75,28);for(let i=0;i<7;i++){g.lineStyle(2,0xc6b66b).lineBetween(x-r-6+i*10,y+29,x-r-6+i*10,y+51);}g.fillStyle(0x715b39).fillRoundedRect(x+28,y,11,20,3).fillRoundedRect(x+40,y+3,10,19,3);}
    }
    if(b.hp<b.maxHp){this.bar(g,x,y+r+16,r*2,b.hp/b.maxHp,b.team);}
  }
  flag(g,x,y,color){const wave=Math.sin(battle.time*3+x)*2;g.lineStyle(2,0x5d573c).lineBetween(x,y,x,y+35);g.fillStyle(color).fillTriangle(x+1,y,x+23,y+5+wave,x+1,y+13);g.fillStyle(0xffffff,.14).fillTriangle(x+2,y+1,x+21,y+5+wave,x+2,y+5);g.fillStyle(0xf2dfaa).fillCircle(x,y-1,2);}
  bar(g,x,y,w,ratio,team){g.fillStyle(0x213425,.9).fillRect(x-w/2-1,y-1,w+2,5);g.fillStyle(team==='blue'?0x8cc5b8:0xe89976).fillRect(x-w/2,y,Math.max(0,w*ratio),3);}
  soldier(u,g){
    const moving=Math.hypot(u.vx,u.vy)>3,swing=moving?Math.sin(u.stride+u.id)*3.5:0,x=u.x,y=u.y-(moving?Math.abs(Math.sin(u.stride+u.id))*1.2:0),c=ink[u.team],light=ink[u.team+'Light'];
    g.fillStyle(0x243b28,.3).fillEllipse(x+2,y+4,u.type==='ram'?35:u.type==='knight'?37:20,9);
    if(u.team==='blue'){g.fillStyle(u.control==='manual'?0xf0c57a:0x9dcddd,.9).fillCircle(x+13,y+5,2.5);}
    if(moving){g.fillStyle(0xd4c193,.17).fillCircle(x-Math.cos(u.heading)*12,y+5-Math.sin(u.heading)*5,3+Math.abs(swing)*.4);}
    if(selected.has(u.id)){g.lineStyle(1.5,0xe6dc9b,.95).strokeEllipse(x,y+3,u.type==='ram'?40:u.type==='knight'?42:27,u.type==='ram'?26:u.type==='knight'?22:15);}
    if(u.type==='ram'){
      g.fillStyle(0x594b32).fillRoundedRect(x-16,y-11,32,23,3);g.fillStyle(0xbaa373).fillTriangle(x-19,y-8,x,y-23,x+19,y-8);g.fillStyle(0x90764d).fillTriangle(x-19,y-8,x,y-23,x,y-8);g.lineStyle(2,0x635738).lineBetween(x,y-22,x,y-8);g.fillStyle(c).fillRect(x-14,y-8,28,5);for(const dx of [-14,11])for(const dy of [-3,10]){g.fillStyle(0x363e2d).fillCircle(x+dx,y+dy,5);g.lineStyle(1,0xa28a57).lineBetween(x+dx-Math.cos(u.stride)*4,y+dy-Math.sin(u.stride)*4,x+dx+Math.cos(u.stride)*4,y+dy+Math.sin(u.stride)*4);}g.fillStyle(0xc1b895).fillRect(x-3,y+3,6,18);g.fillStyle(0x6a6550).fillCircle(x,y+21,4);
    }else if(u.type==='knight'){
      const facing=Math.cos(u.heading)<0?-1:1,attack=(u.attackFlash||0)/.22;
      const coat=u.id%2?0x806044:0x9c7953,dark=0x463d30;
      // Four alternating legs, barrel, neck, muzzle and ears read as a horse at game scale.
      for(let leg=0;leg<4;leg++){
        const dx=(leg<2?-11:10)+(leg%2)*4,step=moving?Math.sin(u.stride*1.35+leg*Math.PI/2)*5:0;
        g.lineStyle(3,leg%2?coat:dark).lineBetween(x+dx,y-5,x+dx+step,y+8);
        g.lineStyle(3,dark).lineBetween(x+dx+step,y+8,x+dx+step+facing*3,y+9);
      }
      g.lineStyle(3,dark).lineBetween(x-facing*16,y-11,x-facing*24,y-3+swing);
      g.fillStyle(coat).fillEllipse(x,y-10,35,18);
      g.fillStyle(coat).fillTriangle(x+facing*9,y-12,x+facing*15,y-31,x+facing*23,y-17);
      g.fillStyle(coat).fillEllipse(x+facing*21,y-24,16,9);
      g.fillStyle(dark).fillTriangle(x+facing*15,y-26,x+facing*14,y-35,x+facing*19,y-28);
      g.lineStyle(3,dark).lineBetween(x+facing*12,y-27,x+facing*8,y-14);
      g.fillStyle(0x201f19).fillCircle(x+facing*23,y-26,1.4);
      g.lineStyle(1,0xd6bd86).lineBetween(x+facing*26,y-24,x+facing*8,y-19);
      g.fillStyle(c).fillRoundedRect(x-12,y-16,23,13,3);
      g.lineStyle(1,0xd7c393).lineBetween(x-11,y-5,x+10,y-5);
      // Armored rider sits above the saddle, carrying a shield and couched lance.
      g.fillStyle(dark).fillRoundedRect(x-6,y-22,12,5,2);
      g.fillStyle(c).fillTriangle(x-5,y-31,x-facing*17,y-17+swing*.4,x+4,y-18);
      g.fillStyle(0xb6bdb1).fillRoundedRect(x-5,y-32,11,15,3);
      g.fillStyle(light).fillRect(x-3,y-29,6,8);
      g.lineStyle(3,0x52564c).lineBetween(x+2,y-18,x+5,y-8);
      g.fillStyle(0xc5cbbe).fillRoundedRect(x-5,y-43,11,11,3);
      g.lineStyle(2,0x353c35).lineBetween(x+facing,y-38,x+facing*5,y-38);
      g.fillStyle(c).fillTriangle(x-3,y-43,x-facing*10,y-49,x+3,y-44);
      g.fillStyle(c).fillRoundedRect(x-facing*7-4,y-29,9,12,3);
      g.lineStyle(1,0xe0cf9c).strokeRoundedRect(x-facing*7-4,y-29,9,12,3);
      const tip=x+facing*(37+attack*9);
      g.lineStyle(2,0x9b8053).lineBetween(x-facing*3,y-23,tip,y-24+attack*7);
      g.fillStyle(0xe0e1d1).fillTriangle(tip,y-27+attack*7,tip+facing*7,y-24+attack*7,tip,y-21+attack*7);
    }else{
      // Each soldier has a head, tunic, two walking legs, arms and a distinct weapon.
      const facing=Math.cos(u.heading)<0?-1:1,attack=(u.attackFlash||0)/.22;
      g.fillStyle(u.team==='blue'?0x315d78:0x763b32).fillTriangle(x-facing*3,y-14,x-facing*11,y+2,x+facing*4,y+1);
      g.lineStyle(3,0x3a4032).lineBetween(x-3,y-1,x-4+swing,y+7).lineBetween(x+3,y-1,x+4-swing,y+7);
      g.fillStyle(0x394e40).fillRect(x-7+swing,y+5,5,3).fillRect(x+2-swing,y+5,5,3);
      g.fillStyle(c).fillRoundedRect(x-6,y-14,12,14,2);g.fillStyle(light,.8).fillRect(x-5,y-13,3,9);
      g.fillStyle(0x48483a).fillRect(x-6,y-3,12,2);g.fillStyle(0xd3ba78).fillRect(x-1,y-3,2,2);
      if(u.type!=='archer'){g.fillStyle(0xb7bdac).fillRoundedRect(x-8,y-15,5,5,2).fillRoundedRect(x+3,y-15,5,5,2);g.fillStyle(0xc8cebc,.7).fillRect(x-3,y-12,6,6);}
      g.lineStyle(3,0xbab398).lineBetween(x-6,y-11,x-10,y-4+swing*.4).lineBetween(x+6,y-11,x+10,y-5-swing*.4);
      g.fillStyle(0xd6bb8e).fillCircle(x,y-20,5);g.fillStyle(u.type==='archer'?0x506345:0xaab1a1).fillEllipse(x,y-23,12,7);
      g.fillStyle(0x3d3c2e).fillRect(x+facing,y-20,2,1);g.fillStyle(0xd2d4bf,.7).fillRect(x-4,y-25,6,2);
      if(u.type==='infantry'){g.fillStyle(c).fillRoundedRect(x-facing*9-4,y-10,8,11,2);g.lineStyle(1,0xe0cf9c).strokeRoundedRect(x-facing*9-4,y-10,8,11,2);g.lineStyle(2,0xe0dfc4).lineBetween(x+facing*10,y-4,x+facing*(13+attack*10),y-21+attack*20);g.lineStyle(2,0xb2a276).lineBetween(x+facing*7,y-9,x+facing*15,y-8);}
      if(u.type==='archer'){g.lineStyle(2,0xd2bb7d);g.beginPath();g.arc(x+7,y-10,10,-1.1,1.1);g.strokePath();g.lineStyle(1,0xf0ddac).lineBetween(x+11,y-19,x+11,y-1);g.fillStyle(0x655d3f).fillRect(x-9,y-20,4,14);}
    }
    if(selected.has(u.id)||u.hp<u.maxHp)this.bar(g,x,y-(u.type==='ram'?29:u.type==='knight'?55:44),u.type==='ram'?32:u.type==='knight'?30:22,u.hp/u.maxHp,u.team);
  }
  update(t,delta){
    commanders.tick(battle,paused);
    if(!paused){this.accumulator+=Math.min(delta/1000,.2);while(this.accumulator>=1/30){battle.tick(1/30);this.accumulator-=1/30;}}
    audio.consume(battle,{paused,hidden:document.hidden});
    const g=this.g;if(!g)return;g.clear();
    if(terrainVisible){for(const z of ZONES){g.lineStyle(1,z.kind==='hill'?0xe9dda1:0xc3d29d,.5).strokeEllipse(z.x,z.y,z.rx*2,z.ry*2);}for(const rock of CLIFFS)g.lineStyle(1,0xd0c59a,.25).strokeCircle(rock.x,rock.y,rock.radius+8);}
    for(const site of battle.sites){const p=PASSAGES.find(p=>p.id===site.id),r=p.siege?24:17,c=site.owner?ink[site.owner]:0xd6c58a;g.lineStyle(1.5,c,.65).strokeCircle(site.x,site.y,r);g.fillStyle(c,.12).fillCircle(site.x,site.y,r);g.fillStyle(c).fillCircle(site.x,site.y,3);if(site.progress){g.lineStyle(3,site.progress>0?ink.blueLight:ink.redLight);g.beginPath();g.arc(site.x,site.y,r+3,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.abs(site.progress)/5);g.strokePath();}}
    for(const [commander,allied]of [[director,false],[allyDirector,true]])if(terrainVisible&&commander.plan&&(!allied||battle.allyEnabled)){
      const p=PASSAGES.find(p=>p.id===commander.plan.passage),sign=allied?1:-1,color=allied?0x98cfe2:0xe0a582,end={x:commander.plan.maneuver==='defend'?(allied?480:720):(allied?720:480),y:p.y},approach={x:allied?515:685,y:p.y};
      g.lineStyle(2,color,.55);for(const [start,finish]of [[{x:allied?240:960,y:380},approach],[approach,end]]){const length=Math.hypot(finish.x-start.x,finish.y-start.y);for(let d=0;d<length;d+=15){const f=d/length,t=Math.min(1,(d+7)/length);g.lineBetween(start.x+(finish.x-start.x)*f,start.y+(finish.y-start.y)*f,start.x+(finish.x-start.x)*t,start.y+(finish.y-start.y)*t);}}g.fillStyle(color,.7).fillTriangle(end.x+sign*6,end.y,end.x-sign*5,end.y-5,end.x-sign*5,end.y+5);
    }
    for(const u of battle.units)if(selected.has(u.id)&&u.order&&u.path?.length&&terrainVisible){g.lineStyle(1,0xe9e3af,.22);g.beginPath();g.moveTo(u.x,u.y);for(const point of u.path)g.lineTo(point.x,point.y);g.strokePath();}
    const alpha=paused?1:this.accumulator*30;
    const entities=[...battle.buildings,...battle.units.map(u=>({...u,x:Phaser.Math.Linear(u.px,u.x,alpha),y:Phaser.Math.Linear(u.py,u.y,alpha)}))].sort((a,b)=>a.y-b.y);
    for(const e of entities){if(e.kind==='building')this.building(e,g);else this.soldier(e,g);}
    // Building names stay legible independently of the terrain texture.
    for(const b of battle.buildings){let label=this.labels.get(b.id);if(!label){label=this.add.text(b.x,b.y+b.radius+25,BUILDINGS[b.type].name,{fontFamily:'Inter,Arial',fontSize:11,color:b.team==='blue'?'#e1edf0':'#f0d7bf',stroke:'#324331',strokeThickness:3}).setOrigin(.5);this.labels.set(b.id,label);}label.setText(BUILDINGS[b.type].name+(b.remaining?` · ${Math.ceil(b.remaining)} s`:''));}
    for(const [id,label]of this.labels)if(!battle.entity(id)){label.destroy();this.labels.delete(id);}
    for(const shot of battle.shots){const f=1-shot.life/shot.maxLife;
      if(shot.ranged){const x=Phaser.Math.Linear(shot.x,shot.tx,f),y=Phaser.Math.Linear(shot.y-20,shot.ty-10,f)-Math.sin(f*Math.PI)*25,angle=Math.atan2(shot.ty-shot.y,shot.tx-shot.x);g.lineStyle(1.5,0xf4e7b8).lineBetween(x,y,x-Math.cos(angle)*10,y-Math.sin(angle)*10);g.fillStyle(0xe7e6ce).fillTriangle(x+2,y,x-2,y-2,x-2,y+2);}
      else {g.lineStyle(2,0xffe6a6,shot.life/shot.maxLife).strokeCircle(shot.tx,shot.ty-9,4+f*9);}
    }
    for(const e of battle.effects){const dead=e.kind==='death',f=e.life/(dead ? .8 : .28);if(dead){g.fillStyle(0x443e2b,f*.4).fillEllipse(e.x,e.y+3,26,10);g.lineStyle(3,ink[e.team],f*.7).lineBetween(e.x-7,e.y,e.x+7,e.y-5);}else for(let i=0;i<4;i++){const a=i*Math.PI/2+1,d=(1-f)*12;g.lineStyle(1,0xffdf99,f).lineBetween(e.x+Math.cos(a)*d,e.y-10+Math.sin(a)*d,e.x+Math.cos(a)*(d+4),e.y-10+Math.sin(a)*(d+4));}}
    for(const m of this.markers){m.life-=delta/1000;g.lineStyle(2,m.color,m.life/.8).strokeCircle(m.x,m.y,8+(1-m.life/.8)*15);g.lineBetween(m.x-6,m.y,m.x+6,m.y).lineBetween(m.x,m.y-6,m.x,m.y+6);}this.markers=this.markers.filter(m=>m.life>0);
    if(this.drag){const x=Math.min(this.drag.x,this.pointer.x),y=Math.min(this.drag.y,this.pointer.y),w=Math.abs(this.drag.x-this.pointer.x),h=Math.abs(this.drag.y-this.pointer.y);if(w+h>12){g.fillStyle(0xc6dfb1,.12).fillRect(x,y,w,h);g.lineStyle(1,0xe6e3a9).strokeRect(x,y,w,h);}}
    if(building&&usable()){const p=this.pointer,valid=!battle.canBuild(building,p.x,p.y),r=BUILDINGS[building].radius;g.fillStyle(valid?0xc6e0a1:0xe39a7e,.3).fillCircle(p.x,p.y,r+10);g.lineStyle(2,valid?0xc6e0a1:0xe39a7e).strokeCircle(p.x,p.y,r+10);}
    const cursor=building?'copy':attackMode?'crosshair':'default';if(this.game.canvas.style.cursor!==cursor)this.game.canvas.style.cursor=cursor;
    if(t-lastUI>150){refresh();lastUI=t;}
    if(noticeEnd&&performance.now()>noticeEnd){text('notice','');noticeEnd=0;}
  }
}
new Phaser.Game({type:Phaser.AUTO,audio:{noAudio:true},parent:'field',width:W,height:H,backgroundColor:'#708353',antialias:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Valley],input:{activePointers:2}});
refresh();
