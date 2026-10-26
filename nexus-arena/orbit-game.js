import Phaser from 'phaser';
import {OrbitBattle,MODULES,TECHNOLOGIES,barrierHp,UNITS,SLOTS,SECTORS,SECTOR_NAMES,COMPOSITIONS,OBJECTIVES,CENTER,WIDTH,HEIGHT,powerGrid,defenseSummary,rangeOf,maxModuleHp,upgradeCost,normalizePlan,localPlan,explainPlan,budgetForWave} from './orbit-sim.js';
import './orbit.css';

const $=id=>document.getElementById(id),text=(id,value)=>{if($(id).textContent!==String(value))$(id).textContent=String(value);};
let battle=new OrbitBattle(),selected=0,scene,paused=false,audio=false,request=null,revision=0,briefing=0,pendingPlan=null,pendingMeta=null,calls=0,noticeUntil=0,adaptAttempts=0,nextAdaptAt=12;
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const icons={laser:'Parts/gun00.png',missile:'Parts/gun10.png',shield:'Power-ups/powerupBlue_shield.png',reactor:'Power-ups/powerupGreen_bolt.png',extractor:'Parts/cockpitGreen_0.png'};
const colors={balanced:0xffb874,swarm:0xc1a0ff,armor:0xffb874,siege:0xff6b87,raiders:0xb7fa74};
try{const saved=localStorage.getItem('nexus-orbit-provider');if(['typesafe','off'].includes(saved))$('provider').value=saved;}catch{}
function notify(message){text('flashMessage',message);$('flashMessage').classList.add('visible');noticeUntil=performance.now()+3200;}
function selectSlot(id){selected=id;updateUI();}
for(const [type,m] of Object.entries(MODULES)){
  const button=document.createElement('button');button.className='build-choice';button.dataset.build=type;button.setAttribute('aria-label',`Costruisci ${m.name} · ${m.cost} crediti`);
  button.innerHTML=`<img src="/assets/PNG/${icons[type]}" alt=""><div><b>${m.name}</b><small>${m.cost} crediti · ${m.power?m.power+' energia':'+4 energia'}</small><span>${m.role}</span></div>`;
  button.addEventListener('click',()=>{const error=battle.build(selected,type);if(error)notify(error);else{scene?.sfx('shieldUp',.2);notify(m.name+' costruita in '+SLOTS[selected].label);}updateUI();});$('buildMenu').append(button);
  const quick=document.createElement('button');quick.dataset.build=type;quick.setAttribute('aria-label',`Schiera ${m.name}`);quick.innerHTML=`<img src="/assets/PNG/${icons[type]}" alt=""><span>${type==='laser'?'Laser':type==='missile'?'Missili':type==='shield'?'Scudo':type==='reactor'?'Reattore':'Estrattore'}<small>${m.cost} cr</small></span>`;
  quick.addEventListener('click',()=>{const error=battle.build(selected,type);if(error)notify(error);else scene?.sfx('shieldUp',.2);updateUI();});$('quickBuild').append(quick);
}
for(const slot of SLOTS){
  const button=document.createElement('button');button.textContent=slot.label;button.setAttribute('aria-label','Postazione '+slot.label+' · '+SECTOR_NAMES[slot.sector]);button.addEventListener('click',()=>selectSlot(slot.id));$('slotPicker').append(button);
}
for(const sector of SECTORS){const row=document.createElement('div');row.className='coverage-row';row.innerHTML=`<span>${SECTOR_NAMES[sector]}</span><i><em></em></i><b>0</b>`;row.dataset.sector=sector;$('coverageRows').append(row);}

for(const sector of SECTORS){
  const button=document.createElement('button');button.dataset.barrier=sector;button.addEventListener('click',()=>{const error=battle.constructBarrier(sector);if(error)notify(error);else notify('Cantiere barriera '+SECTOR_NAMES[sector]+' avviato');updateUI();});$('barrierControls').append(button);
}
for(const [id,t] of Object.entries(TECHNOLOGIES)){
  const button=document.createElement('button');button.dataset.tech=id;button.innerHTML=`<b>${t.name}</b><small>${t.cost} ricerca · ${t.alloys} leghe</small><span>${t.role}</span>`;button.addEventListener('click',()=>{const error=battle.unlock(id);if(error)notify(error);else notify('Sbloccata: '+t.name);updateUI();});$('techControls').append(button);
}
function logDecision(message){const item=document.createElement('li');item.textContent=message;$('decisionLog').prepend(item);while($('decisionLog').children.length>8)$('decisionLog').lastChild.remove();}
function updateUI(){
  const grid=powerGrid(battle.modules,battle.mode),m=battle.modules[selected],prep=battle.phase==='prep',locked=paused||['planning','briefing','lost','won'].includes(battle.phase);
  const summary=defenseSummary(battle.modules,battle.mode);
  text('coreValue',`${Math.ceil(battle.core)} / 300`);$('coreBar').style.width=battle.core/3+'%';$('coreBar').style.background=battle.core<90?'#ff6b87':'#b7fa74';
  text('creditsValue',battle.credits);text('materialsValue',`${battle.alloys} leghe · ${battle.research} ricerca`);
  for(const button of document.querySelectorAll('[data-barrier]')){const b=battle.barriers.find(b=>b.sector===button.dataset.barrier),level=b?b.level+1:1;button.textContent=SECTOR_NAMES[button.dataset.barrier]+(b?.remaining>0?` · cantiere ${Math.ceil(b.remaining)} s`:b?` · L${b.level} · ${Math.ceil(b.hp)} PV${b.level<3?` → L${level} / ${25*level} leghe`:" · MAX"}`:` · 20 cr / ${25*level} leghe`);button.disabled=locked||!!(b?.remaining>0)||level>3||level>1&&!battle.tech.includes('fortify')||battle.alloys<25*level||battle.credits<20;button.title=`20 crediti + ${25*level} leghe · ${level===1?8:6+level*2} secondi`; }
  for(const button of document.querySelectorAll('[data-tech]')){const t=TECHNOLOGIES[button.dataset.tech],done=battle.tech.includes(button.dataset.tech);button.disabled=locked||done||battle.research<t.cost||battle.alloys<t.alloys;button.classList.toggle('unlocked',done);button.querySelector('small').textContent=done?'SBLOCCATA':`${t.cost} ricerca · ${t.alloys} leghe`;}
  text('powerValue',`${grid.used} / ${grid.capacity}`);text('powerWarning',grid.demand>grid.capacity?`${grid.demand-grid.capacity} mancanti · ${summary.power.offline} offline`:`${grid.capacity-grid.used} disponibili`);$('powerWarning').style.color=grid.demand>grid.capacity?'#ffb874':'#b7fa74';
  text('waveValue',battle.phase==='prep'?`PREPARAZIONE ${String(battle.wave+1).padStart(2,'0')}`:`ONDATA ${String(Math.max(1,battle.wave+(battle.phase==='planning'||battle.phase==='briefing'?1:0))).padStart(2,'0')} / 06`);
  text('phaseLabel',({prep:'PREPARAZIONE · CANTIERI ATTIVI',planning:'ANALISI DELLE DIFESE',briefing:'CONTATTO IN ARRIVO',combat:'COMBATTIMENTO',won:'STAZIONE SALVA',lost:'SEGNALE INTERROTTO'})[battle.phase]);
  text('slotName',`POSTAZIONE ${SLOTS[selected].label} · ${SECTOR_NAMES[SLOTS[selected].sector]}`);
  text('buildHint',prep?'Seleziona una postazione. Investi in armi, produzione o ricerca.':'Armi fisse durante l’attacco. Puoi costruire barriere, ricercare e gestire l’energia.');
  $('buildMenu').hidden=!!m;$('moduleDetails').hidden=!m;
  for(const button of document.querySelectorAll('[data-build]'))button.disabled=!prep||paused||!!m||battle.credits<MODULES[button.dataset.build].cost||button.dataset.build==='extractor'&&!battle.tech.includes('industry');
  text('dockSlot',`${SLOTS[selected].label} · ${m?MODULES[m.type].name+' LIV '+m.level:'POSTAZIONE LIBERA'}`);
  if(m){
    const powered=grid.active.has(selected);text('moduleName',`${MODULES[m.type].name} · LIV ${m.level}`);
    text('moduleStats',`Integrità ${Math.ceil(m.hp)}/${maxModuleHp(m)} · ${powered?'ATTIVA':'OFFLINE'}${m.type==='shield'?' · scudo '+Math.round(m.charge):m.type==='extractor'?` · +${6*m.level} cr / +${3*m.level} leghe ogni 6 s · +${m.level} ricerca ogni 18 s`:''}`);
    text('upgrade',m.level===2&&!battle.tech.includes('engineering')?'Richiede Ingegneria':m.level>=3?'Livello massimo':`Potenzia · ${upgradeCost(m)}`);$('upgrade').disabled=!prep||paused||m.level>=3||m.level===2&&!battle.tech.includes('engineering')||battle.credits<upgradeCost(m);
    $('repair').disabled=!prep||paused||m.hp>=maxModuleHp(m)||battle.credits<20;$('sell').disabled=!prep||paused;text('sell',`Vendi · +${Math.floor(m.invested*.65)}`);
    $('togglePower').disabled=locked;text('togglePower',m.enabled?'Disattiva':'Alimenta');$('targetLabel').hidden=!['laser','missile'].includes(m.type);$('targetMode').value=m.target;$('targetMode').disabled=locked;
  }
  $('repairCore').disabled=!prep||paused||battle.core>=300||battle.credits<20;
  for(const button of document.querySelectorAll('[data-mode]')){button.disabled=locked;button.setAttribute('aria-pressed',String(button.dataset.mode===battle.mode));}
  for(const [i,button] of [...$('slotPicker').children].entries()){button.setAttribute('aria-pressed',String(i===selected));button.classList.toggle('occupied',!!battle.modules[i]);}
  for(const row of $('coverageRows').children){const value=summary.coverage[row.dataset.sector];row.querySelector('b').textContent=value;row.querySelector('em').style.width=Math.min(100,value/1.2)+'%';}
  const live=scene&&prep&&!paused;$('launch').disabled=!live;
  text('launchHint',battle.wave===0?'240 crediti iniziali: 3 laser oppure una combinazione di armi e infrastruttura.':prep?`Riorganizza le difese. Il budget nemico dell’ondata ${battle.wave+1} sarà ${budgetForWave(battle.wave+1)}.`:'Costruisci barriere durante l’attacco. Jev rivaluta a 12 e 30 secondi. EMP: una volta per ondata.');
  text('launch',!scene?'Caricamento settore…':battle.phase==='planning'?'Il comandante sta valutando…':battle.phase==='briefing'?`Attacco fra ${Math.ceil(briefing)}…`:battle.phase==='combat'?'Ondata in corso':battle.phase==='won'?'Missione completata':battle.phase==='lost'?'Missione terminata':`Avvia ondata ${battle.wave+1} ↗`);
  $('quickLaunch').disabled=!live;text('quickLaunch',prep?`Avvia ${battle.wave+1} ↗`:battle.phase==='planning'?'Analisi…':battle.phase==='briefing'?`${Math.ceil(briefing)}…`:battle.phase==='combat'?'Battaglia':'Fine');
  $('pause').disabled=!['combat','briefing'].includes(battle.phase);text('pause',paused?'▶':'Ⅱ');$('pause').setAttribute('aria-label',paused?'Riprendi partita':'Pausa');$('pauseOverlay').hidden=!paused;
  $('emp').disabled=battle.phase!=='combat'||paused||battle.empUsed;
  text('adaptSchedule',$('provider').value==='off'?'AI disattivata: nessuna analisi o chiamata API.':battle.phase==='combat'?request?'Analisi live in corso. La battaglia continua.':adaptAttempts>=2?'Rivalutazioni terminate per questa ondata.':`Prossima analisi fra ${Math.max(0,Math.ceil(nextAdaptAt-battle.time))} s · ${adaptAttempts}/2 eseguite`:'Analisi a 12 s e 30 s. Massimo 3 chiamate per ondata.');
  text('combatValue',battle.phase==='combat'?`${battle.enemies.length} contatti · ${battle.spawned}/${battle.total} arrivi`:battle.phase==='briefing'?`Ingresso: ${SECTOR_NAMES[pendingPlan.sector]}`:'16 postazioni · 4 settori');
  const planSource={typesafe:'JEV',off:'SCHEMA FISSO',fallback:'REGOLE LOCALI'}[pendingMeta?.source]||'';
  text('mapGuide',battle.phase==='prep'?'Tocca una postazione per costruire o potenziare.':['combat','briefing'].includes(battle.phase)?`${planSource} · ${COMPOSITIONS[pendingPlan.composition]} · ${SECTOR_NAMES[pendingPlan.sector]} → ${OBJECTIVES[pendingPlan.objective]}`:battle.phase==='planning'?'Il comandante sta studiando lo schieramento confermato…':'');
  $('provider').disabled=!prep||paused;
  const report=battle.reports.at(-1);$('waveReport').hidden=!report;
  if(report){text('reportTitle',`ONDATA ${report.wave} · BILANCIO`);text('reportText',`${report.kills} abbattuti · ${report.leaks} passati · ${Math.round(report.damage)} danni al nucleo · ${report.destroyed} strutture perse · +${report.bonus} crediti.`);}
  $('endOverlay').hidden=!['won','lost'].includes(battle.phase);
  if(battle.phase==='won'||battle.phase==='lost'){
    text('endEyebrow',battle.phase==='won'?'SEI ONDATE RESPINTE':'NUCLEO DISTRUTTO');text('endTitle',battle.phase==='won'?'La stazione resiste.':'Il segnale si spegne.');text('endText',`On­date completate: ${battle.reports.length}/6. Riprova con lo stesso scenario 716 e un altro schieramento.`);
  }
}
function reset(){revision++;request?.abort();request=null;paused=false;briefing=0;pendingPlan=null;pendingMeta=null;calls=0;adaptAttempts=0;nextAdaptAt=12;$('decisionLog').replaceChildren();battle=new OrbitBattle();selected=0;scene?.clearBattle();text('aiSource','COMANDANTE IN ATTESA');text('aiStatus','Il comandante studierà le difese all’avvio dell’ondata.');text('planName','In attesa di contatto');text('planTarget','Analisi iniziale + fino a 2 rivalutazioni in battaglia.');text('planEvidence','Budget identico per Jev e schema fisso. Scenario 716 ripetibile.');updateUI();}
async function launch(adapting=false){
  adapting=adapting===true;
  if(request||adapting&&battle.phase!=='combat')return;
  if((!adapting&&battle.phase!=='prep')||paused)return;
  const snapshot=battle.snapshot(),provider=$('provider').value,current=++revision;if(!adapting){battle.phase='planning';adaptAttempts=0;nextAdaptAt=12;}updateUI();
  text('aiSource',provider==='off'?'SCHEMA FISSO':'RICHIESTA API IN CORSO');text('aiStatus',adapting?'Jev valuta esito, barriere, produzione e tecnologie attuali.':'Jev analizza lo schieramento. Puoi costruire barriere durante l’attacco.');
  let data;const controller=new AbortController();request=controller;const timeout=setTimeout(()=>controller.abort(),10000);
  try{
    if(provider==='off')data={sector:'north',composition:'balanced',objective:'core',source:'off'};
    else {const response=await fetch('/api/commander',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...snapshot,provider}),signal:controller.signal});if(!response.ok)throw Error('provider');data=await response.json();if(!normalizePlan(data)||!['typesafe','fallback'].includes(data.source))throw Error('invalid');}
  }catch{data={...localPlan(snapshot),source:'fallback',reason:'provider_unavailable'};}
  finally{clearTimeout(timeout);if(request===controller)request=null;}
  if(current!==revision||adapting&&battle.phase!=='combat')return;
  const before=pendingPlan;pendingPlan=normalizePlan(data);pendingMeta={source:data.source};
  if(adapting){if(!battle.adapt(pendingPlan,pendingMeta))return;}else{briefing=4;battle.phase='briefing';}
  if(['typesafe'].includes(data.source))calls++;
  const source={typesafe:'JEV',off:'SCHEMA FISSO',fallback:'REGOLE LOCALI'}[data.source];
  const changed=adapting&&['sector','composition','objective'].some(k=>before[k]!==pendingPlan[k]);
  logDecision(`${adapting?Math.floor(battle.time)+' s':'ONDATA '+snapshot.wave} · ${source} · ${adapting?(changed?'NUOVI ORDINI':'PIANO CONFERMATO'):'ATTACCO'}: ${SECTOR_NAMES[pendingPlan.sector]} / ${COMPOSITIONS[pendingPlan.composition]} → ${OBJECTIVES[pendingPlan.objective]}${adapting?' · riserve '+snapshot.live.remainingBudget:''}`);
  text('aiSource',source+(data.source==='off'?' · AI OFF':data.source==='fallback'?' · FALLBACK':' · RISPOSTA #'+calls));
  const errors={missing_token:'Chiave del provider da configurare.',insufficient_credits:'Credito del provider esaurito.',invalid_token:'Chiave non valida.',rate_limited:'Limite richieste raggiunto.',provider_unavailable:'API non disponibile.',invalid_decision:'Risposta AI non utilizzabile.'};
  text('aiStatus',data.source==='off'?'Nessuna chiamata API. Ingresso nord e flotta mista.':data.source==='fallback'?(errors[data.reason]||'API non disponibile.')+' Il piano è scelto da regole locali.':`Risposta reale · ${data.latencyMs??'?'} ms${Number.isFinite(data.confidence)?' · confidenza '+Math.round(data.confidence*100)+'%':''}`);
  text('planName',COMPOSITIONS[pendingPlan.composition]);text('planTarget',`${SECTOR_NAMES[pendingPlan.sector]} → ${OBJECTIVES[pendingPlan.objective]} · BUDGET ${budgetForWave(snapshot.wave)}`);
  text('planEvidence',explainPlan(pendingPlan,defenseSummary(snapshot.structures,snapshot.mode))+(adapting?` Osservati: ${snapshot.live.kills} abbattuti, ${snapshot.live.leaks} passati, ${snapshot.live.destroyed} strutture perse. Ordini alle unità attive; ingresso/flotta ai soli rinforzi.`:'')+' Evidenza di gioco, non ragionamento interno.');
  document.documentElement.style.setProperty('--enemy','#'+colors[pendingPlan.composition].toString(16).padStart(6,'0'));scene?.setPlan(pendingPlan);scene?.sfx('twoTone',.3);updateUI();
}
$('launch').addEventListener('click',()=>launch());
$('quickLaunch').addEventListener('click',()=>launch());$('manageInfrastructure').addEventListener('click',()=>$('infrastructure').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'}));$('manageSlot').addEventListener('click',()=>document.querySelector('.build-panel').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'}));
$('upgrade').addEventListener('click',()=>{const error=battle.upgrade(selected);if(error)notify(error);updateUI();});
$('repair').addEventListener('click',()=>{const error=battle.repair(selected);if(error)notify(error);updateUI();});
$('repairCore').addEventListener('click',()=>{const error=battle.repair(null);if(error)notify(error);updateUI();});
$('sell').addEventListener('click',()=>{battle.sell(selected);updateUI();});
$('togglePower').addEventListener('click',()=>{const m=battle.modules[selected];if(m&&!paused&&!['planning','briefing','won','lost'].includes(battle.phase))m.enabled=!m.enabled;updateUI();});
$('targetMode').addEventListener('change',()=>{const m=battle.modules[selected];if(m)m.target=$('targetMode').value;});
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{battle.mode=button.dataset.mode;updateUI();});
function setPaused(value){if(!['combat','briefing'].includes(battle.phase))return;paused=value;updateUI();}
$('pause').addEventListener('click',()=>setPaused(!paused));$('resume').addEventListener('click',()=>setPaused(false));
$('emp').addEventListener('click',()=>{if(!paused&&battle.emp())scene?.sfx('twoTone',.4);updateUI();});
$('newGame').addEventListener('click',reset);$('restartEnd').addEventListener('click',reset);
$('provider').addEventListener('change',()=>{try{localStorage.setItem('nexus-orbit-provider',$('provider').value);}catch{}text('aiSource','NUOVO COMANDANTE SELEZIONATO');text('aiStatus','La scelta si applicherà alla prossima ondata.');});
$('audio').addEventListener('click',()=>{audio=!audio;scene?.sound.setMute(!audio);text('audio',audio?'Audio ON':'Audio OFF');$('audio').setAttribute('aria-label',audio?'Disattiva audio':'Attiva audio');scene?.sfx('twoTone',.2);});
window.addEventListener('blur',()=>setPaused(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)setPaused(true);});
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='p'&&!['SELECT','INPUT'].includes(e.target.tagName)){e.preventDefault();if(!e.repeat)setPaused(!paused);}});

class OrbitScene extends Phaser.Scene {
  preload(){
    const files={nebula:'orion-nebula.jpg',stars:'Backgrounds/darkPurple.png',core:'PNG/ufoBlue.png',base:'PNG/Parts/turretBase_big.png',laser:'PNG/Parts/gun00.png',missile:'PNG/Parts/gun10.png',shieldModule:'PNG/ufoBlue.png',reactor:'PNG/Parts/cockpitGreen_0.png',extractor:'PNG/Parts/cockpitGreen_0.png',shield:'PNG/Effects/shield3.png',bolt:'PNG/Power-ups/powerupGreen_bolt.png',scout:'PNG/Enemies/enemyRed3.png',armor:'PNG/Enemies/enemyRed5.png',bomber:'PNG/Enemies/enemyBlack3.png',raider:'PNG/Enemies/enemyBlack2.png',rocket:'PNG/Lasers/laserBlue01.png',spark:'PNG/Effects/star3.png'};
    for(const [key,path] of Object.entries(files))this.load.image(key,'/assets/'+path);
    for(const key of ['twoTone','laser1','zap','shieldUp','shieldDown','lose'])this.load.audio(key,`/assets/Bonus/sfx_${key}.ogg`);
    this.load.on('loaderror',()=>{text('aiStatus','Caricamento di un asset non riuscito. Ricarica la pagina.');});
  }
  create(){
    scene=this;this.clock=0;this.uiAt=0;this.moduleViews=new Map();this.enemyViews=new Map();this.missileViews=new Map();this.traces=[];this.pulses=[];
    this.add.tileSprite(600,450,1500,1200,'stars').setDepth(-100).setAlpha(.7);
    this.nebula=this.add.image(660,420,'nebula').setDisplaySize(1550,1250).setTint(0x728fc0).setAlpha(.46).setDepth(-99);
    this.ground=this.add.graphics().setDepth(-10);this.effects=this.add.graphics().setDepth(12);
    this.core=this.add.image(600,450,'core').setDisplaySize(112,112).setDepth(4);
    this.coreShield=this.add.image(600,450,'shield').setDisplaySize(160,160).setTint(0x6ce7ef).setAlpha(.35).setDepth(5);
    this.add.text(600,535,'NEXUS / NUCLEO',{fontFamily:'monospace',fontSize:'17px',color:'#b6dce8'}).setOrigin(.5).setDepth(5);
    for(const slot of SLOTS){
      this.add.circle(slot.x,slot.y,43,0x10283b,.18).setStrokeStyle(1,0x6ce7ef,.4).setDepth(1).setInteractive({useHandCursor:true}).on('pointerdown',()=>selectSlot(slot.id));
      this.add.text(slot.x,slot.y+52,slot.label,{fontFamily:'monospace',fontSize:'19px',color:'#a1bbd0'}).setOrigin(.5).setDepth(6);
    }
    for(let q=0;q<4;q++){
      const a=-Math.PI/2+q*Math.PI/2;this.add.text(600+Math.cos(a)*386,450+Math.sin(a)*371,SECTOR_NAMES[SECTORS[q]],{fontFamily:'monospace',fontSize:'18px',color:'#8da7bc',letterSpacing:3}).setOrigin(.5).setDepth(2);
    }
    this.sound.setMute(!audio);this.scale.on('resize',()=>this.fit());this.fit();updateUI();
  }
  fit(){this.cameras.main.setViewport(0,0,this.scale.width,this.scale.height).setZoom(Math.min(this.scale.width/WIDTH,this.scale.height/HEIGHT)*.98).centerOn(600,450);}
  sfx(key,volume){if(audio&&this.cache.audio.exists(key))this.sound.play(key,{volume});}
  clearBattle(){for(const map of [this.moduleViews,this.enemyViews,this.missileViews]){for(const v of map.values())v.destroy();map.clear();}this.traces=[];this.pulses=[];this.nebula.setTint(0x728fc0);}
  setPlan(plan){this.nebula.setTint(colors[plan.composition]);}
  consumeEvents(){
    for(const e of battle.drainEvents()){
      if(e.type==='shot'||e.type==='enemyShot'){
        this.traces.push({...e,life:.16});if(e.slot!==undefined){const v=this.moduleViews.get(e.slot);if(v?.gun)v.gun.rotation=Math.atan2(e.to.y-e.from.y,e.to.x-e.from.x)+Math.PI/2;}
        if(e.type==='shot'&&this.clock>(this.soundAt??0)){this.sfx('laser1',.025);this.soundAt=this.clock+.12;}
      }else if(e.type==='hit')this.pulses.push({...e,r:10,color:0xffffff,life:.15,max:.15});
      else if(e.type==='explosion'){this.pulses.push({...e,r:e.small?32:60,color:0xffad6b,life:.5,max:.5});this.sfx('zap',.08);}
      else if(e.type==='shield')this.pulses.push({...e,r:65,color:0xbda6ff,life:.35,max:.35});
      else if(e.type==='emp')this.pulses.push({x:600,y:450,r:390,color:0x6ce7ef,life:.8,max:.8});
      else if(e.type==='barrierReady'){notify('BARRIERA '+SECTOR_NAMES[e.sector]+' OPERATIVA');this.sfx('shieldUp',.2);}
      else if(e.type==='production'){notify('ESTRAZIONE · +'+e.count*6+' CREDITI · +'+e.count*3+' LEGHE');}
      else if(e.type==='coreHit'){this.sfx('shieldDown',.12);if(!reduced)this.cameras.main.shake(100,.002);}
      else if(e.type==='waveEnd'){this.sfx('twoTone',.3);notify(e.win?'SEI ONDATE RESPINTE · STAZIONE SALVA':'ONDATA RESPINTA · IL CANTIERE RIAPRE');updateUI();}
      else if(e.type==='end'){this.sfx('lose',.3);updateUI();}
    }
  }
  draw(dt){
    const g=this.ground.clear(),fx=this.effects.clear(),grid=powerGrid(battle.modules,battle.mode),s=SLOTS[selected],m=battle.modules[selected];
    g.lineStyle(1,0x6ce7ef,.13).strokeCircle(600,450,188).strokeCircle(600,450,302).strokeCircle(600,450,340);
    g.lineStyle(1,0x6ce7ef,.08).lineBetween(600,65,600,835).lineBetween(160,450,1040,450);
    if(m&&rangeOf(m)){g.fillStyle(MODULES[m.type].color,.035).fillCircle(s.x,s.y,rangeOf(m));g.lineStyle(1.5,MODULES[m.type].color,.25).strokeCircle(s.x,s.y,rangeOf(m));}
    g.lineStyle(3,0xb7fa74,.8).strokeCircle(s.x,s.y,49);
    for(const slot of SLOTS){const module=battle.modules[slot.id];
      if(module){g.lineStyle(1,MODULES[module.type].color,grid.active.has(slot.id)?.2:.06).lineBetween(600,450,slot.x,slot.y);}
      let view=this.moduleViews.get(slot.id);
      if(view&&(!module||view.kind!==module.type)){view.destroy();this.moduleViews.delete(slot.id);view=null;}
      if(module&&!view){
        view=this.add.container(slot.x,slot.y).setDepth(4);view.kind=module.type;
        view.add(this.add.image(0,0,'base').setDisplaySize(65,65).setTint(0xa1bed1));
        const key=module.type==='shield'?'shieldModule':module.type;
        const body=this.add.image(0,0,key).setTint(MODULES[module.type].color).setDisplaySize(module.type==='reactor'?48:module.type==='shield'?62:35, module.type==='reactor'?48:module.type==='shield'?62:68);
        view.add(body);if(['laser','missile'].includes(module.type))view.gun=body;
        if(module.type==='extractor')view.add(this.add.image(0,0,'spark').setTint(0xffdc85).setDisplaySize(24,24));
        if(module.type==='reactor')view.add(this.add.image(0,0,'bolt').setDisplaySize(25,25));
        this.moduleViews.set(slot.id,view);
      }
      if(view){
        const active=grid.active.has(slot.id);view.setAlpha(active?1:.32);
        fx.lineStyle(3,MODULES[module.type].color,.9).strokeCircle(slot.x,slot.y,35+(module.level-1)*4);
        fx.fillStyle(0x13202c,1).fillRect(slot.x-28,slot.y+35,56,4);fx.fillStyle(module.hp<maxModuleHp(module)*.4?0xff6b87:0xb7fa74,1).fillRect(slot.x-28,slot.y+35,56*module.hp/maxModuleHp(module),4);
        if(module.type==='shield'&&active){g.lineStyle(2,0xbda6ff,.13+module.charge/(90*module.level)*.15).strokeCircle(slot.x,slot.y,rangeOf(module));}
      }
    }
    const enemyIds=new Set(battle.enemies.map(e=>e.id));for(const [id,v] of this.enemyViews)if(!enemyIds.has(id)){v.destroy();this.enemyViews.delete(id);}
    for(const e of battle.enemies){
      let v=this.enemyViews.get(e.id);if(!v){v=this.add.image(e.x,e.y,e.type).setDisplaySize(e.type==='armor'?70:55,e.type==='armor'?62:52).setDepth(8).setInteractive({useHandCursor:true}).on('pointerdown',()=>{battle.focus=e.id;notify('Bersaglio prioritario: '+UNITS[e.type].name);});this.enemyViews.set(e.id,v);}
      v.setPosition(e.x,e.y).setRotation(e.angle-Math.PI/2).setAlpha(e.stunnedUntil>battle.time?.5:1);
      if(e.id===battle.focus)fx.lineStyle(2,0xff6b87,.9).strokeCircle(e.x,e.y,44);
      fx.fillStyle(0xff6b87,.8).fillRect(e.x-22,e.y-40,44*e.hp/e.maxHp,3);
    }
    const missileIds=new Set(battle.missiles.map(m=>m.id));for(const [id,v] of this.missileViews)if(!missileIds.has(id)){v.destroy();this.missileViews.delete(id);}
    for(const missile of battle.missiles){let v=this.missileViews.get(missile.id);if(!v){v=this.add.image(missile.x,missile.y,'rocket').setDisplaySize(9,28).setDepth(9).setTint(0xffb874);this.missileViews.set(missile.id,v);}v.setPosition(missile.x,missile.y).setRotation(Math.atan2(missile.last.y-missile.y,missile.last.x-missile.x)+Math.PI/2);}
    for(const trace of this.traces){trace.life-=dt;fx.lineStyle(trace.type==='shot'?3:2,trace.color,Math.max(0,trace.life/.16)).lineBetween(trace.from.x,trace.from.y,trace.to.x,trace.to.y);}
    this.traces=this.traces.filter(t=>t.life>0);
    for(const pulse of this.pulses){pulse.life-=dt;const progress=1-pulse.life/pulse.max;fx.lineStyle(3,pulse.color,Math.max(0,1-progress)).strokeCircle(pulse.x,pulse.y,pulse.r*(.3+progress*.7));}
    this.pulses=this.pulses.filter(p=>p.life>0);
    if(pendingPlan&&['combat','briefing'].includes(battle.phase)){
      const a=-Math.PI/2+SECTORS.indexOf(pendingPlan.sector)*Math.PI/2,x=600+Math.cos(a)*460,y=450+Math.sin(a)*390;
      fx.lineStyle(3,colors[pendingPlan.composition],.6).strokeCircle(x,y,36+Math.sin(this.clock*2)*5);fx.lineStyle(1,colors[pendingPlan.composition],.15).lineBetween(x,y,600,450);
    }
    for(const wall of battle.barriers){
      const a=-Math.PI/2+SECTORS.indexOf(wall.sector)*Math.PI/2,progress=wall.remaining>0?1-wall.remaining/wall.duration:1;
      g.lineStyle(wall.hp>0?8:3,wall.remaining>0?0xffdc85:0x6ce7ef,wall.remaining>0?.35:.7).beginPath().arc(600,450,350,a-.62,a-.62+1.24*progress,false).strokePath();
      const x=600+Math.cos(a)*350,y=450+Math.sin(a)*350;fx.fillStyle(0x06121e,.8).fillRect(x-30,y-4,60,8);fx.fillStyle(wall.remaining>0?0xffdc85:0x6ce7ef,.9).fillRect(x-30,y-4,60*(wall.remaining>0?progress:wall.hp/barrierHp(wall.level)),8);
    }
    this.coreShield.setAlpha(.2+Math.sin(this.clock)*.08);
  }
  update(_,delta){
    if(paused)return;const dt=Math.min(delta/1000,.05);this.clock+=reduced?0:dt;
    if(battle.phase==='briefing'){briefing-=dt;if(briefing<=0){battle.launch(pendingPlan,pendingMeta);updateUI();}}
    battle.step(dt);this.consumeEvents();this.draw(dt);
    if(battle.phase==='combat'&&$('provider').value!=='off'&&!request&&adaptAttempts<2&&battle.time>=nextAdaptAt){adaptAttempts++;nextAdaptAt=30;launch(true);}
    if(performance.now()>noticeUntil)$('flashMessage').classList.remove('visible');
    if(performance.now()>this.uiAt){this.uiAt=performance.now()+180;updateUI();}
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'orbitGame',width:WIDTH,height:HEIGHT,backgroundColor:'#08111c',scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%'},render:{antialias:true},input:{keyboard:false},scene:[OrbitScene]});
