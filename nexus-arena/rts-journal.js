import {TROOPS,BUILDINGS} from './rts-sim.js';
import {PASSAGES} from './rts-terrain.js';
import {describeAdvisor} from './rts-advisor.js';
import {ADVISOR_ORDERS} from './rts-orders.js';

// Append-only field reports. Decisions are labelled separately from observed events.
export class AdvisorJournal{
  constructor(){this.messages=[];this.nextId=1;this.previous=null;this.queued=new Set();}
  add(time,text,kind='field',source=null){this.messages.push({id:this.nextId++,time:Math.floor(time),text,kind,source});if(this.messages.length>120)this.messages.shift();}
  update(b,advisor,{paused=false}={}){
    const units=b.units.filter(u=>u.team==='blue'&&u.hp>0),buildings=b.buildings.filter(u=>u.team==='blue'&&u.hp>0),roles=b.tactics.blue;
    const current={emergencySpending:!!b.emergencyDefense?.active,orderRevision:b.orderRevision,developmentStatus:b.developmentStatus,order:b.advisorOrder,units:new Map(units.map(u=>[u.id,u.control])),enemyBuildings:new Map(b.buildings.filter(u=>u.team==='red'&&u.hp>0).map(u=>[u.id,u.type])),buildings:new Map(buildings.map(u=>[u.id,{type:u.type,ready:!u.remaining}])),sites:new Map(b.sites.map(s=>[s.id,s.owner])),losses:b.losses.blue,wave:b.wave,phase:b.phase,paused,enabled:b.allyEnabled,plan:advisor.plan?JSON.stringify(advisor.plan):null,emergency:!!roles.emergency,attack:units.filter(u=>u.duty==='attack').length,recover:units.filter(u=>u.duty==='recover').length};
    const old=this.previous;
    if(!old)this.add(b.time,'Sono al tuo fianco. Tu scegli e recluti le unità; io coordino quelle che mi affidi e ti aggiorno qui sugli sviluppi.');
    for(const q of b.queue)if(!this.queued.has(q))this.add(b.time,`${q.source==='advisor'?'Ho avviato':'Ricevuto:'} ${TROOPS[q.type].name.toLowerCase()} in addestramento. ${q.control==='manual'?'Resterà sotto il tuo controllo.':'Lo integrerò nel nostro schieramento quando sarà pronto.'}`);
    this.queued=new Set(b.queue);
    if(current.plan&&current.enabled&&(!old||old.plan!==current.plan||!old.enabled))this.add(b.time,describeAdvisor(b,advisor,'blue'), 'decision',advisor.source);
    if(old){
      if(current.emergencySpending&&!old.emergencySpending)this.add(b.time,`Difensori insufficienti: attivo la delega d’emergenza. Posso usare oro e legno per rinforzi e strutture difensive, rispettando i tuoi soldati manuali.`);
      if(!current.emergencySpending&&old.emergencySpending)this.add(b.time,`La delega d’emergenza è terminata. Resta la tua priorità: ${ADVISOR_ORDERS[current.order]}. Le code e i cantieri già pagati continuano.`);
      if(current.orderRevision!==old.orderRevision){const acknowledgements={balanced:'Riprendo a bilanciare attacco e difesa. Reclutamenti e cantieri tornano manuali, salvo la difesa d’emergenza.',defend:'Ricevuto: do priorità alla difesa della base e richiamo le truppe automatiche. Non avvio spese automatiche fuori dall’emergenza difensiva.',develop:'Ricevuto: proteggo la base e valuto quali unità o strutture mancano. Ogni reclutamento o cantiere userà le nostre risorse e i tempi normali.',attack:'Ricevuto: aumento la forza offensiva. Raduno una squadra sufficiente e mantengo un presidio alla base.',wait:'Ricevuto: mantengo ferme le unità automatiche; nuove spese sono consentite solo per un’emergenza difensiva. Le truppe si difendono se vengono attaccate.'};this.add(b.time,acknowledgements[current.order]||ADVISOR_ORDERS[current.order]);}
      if(current.developmentStatus&&current.developmentStatus!==old.developmentStatus)this.add(b.time,current.developmentStatus);
      const fresh=units.filter(u=>!old.units.has(u.id));
      if(fresh.length)this.add(b.time,`${fresh.length===1?'È pronto un nuovo soldato':'Sono pronti '+fresh.length+' nuovi soldati'}: ${fresh.map(u=>TROOPS[u.type].name.toLowerCase()).join(', ')}. ${fresh.some(u=>u.control==='manual')?'Le riserve manuali restano ai tuoi ordini.':current.enabled?'Assegno i rinforzi in base al piano e alle necessità della difesa.':'La mia guida è sospesa: resteranno in presidio.'}`);
      if(current.losses>old.losses)this.add(b.time,`Abbiamo perso ${current.losses-old.losses} ${current.losses-old.losses===1?'soldato':'soldati'}. Restano ${units.length} unità: rivaluto la forza disponibile per la difesa e l’attacco.`);
      const manual=units.filter(u=>u.control==='manual'&&old.units.get(u.id)==='auto').length,delegated=units.filter(u=>u.control==='auto'&&old.units.get(u.id)==='manual').length;
      if(manual)this.add(b.time,`Hai preso il comando di ${manual} ${manual===1?'soldato':'soldati'}. Rispetto i tuoi ordini e coordino le altre unità.`);
      if(delegated)this.add(b.time,`Mi hai riaffidato ${delegated} ${delegated===1?'soldato':'soldati'}. Li reintegro nello schieramento.`);
      for(const s of b.sites)if(old.sites.get(s.id)!==s.owner&&s.owner)this.add(b.time,s.owner==='blue'?`Abbiamo conquistato ${PASSAGES.find(p=>p.id===s.id).name}: ora produce 15 oro e 5 legno ogni 5 secondi.`:`Il nemico ha occupato ${PASSAGES.find(p=>p.id===s.id).name}. Questo passaggio è ora conteso sul piano strategico.`);
      for(const building of buildings){const previous=old.buildings.get(building.id);if(!previous)this.add(b.time,`${BUILDINGS[building.type].name}: costruzione ${building.remaining?'avviata':'completata'}.`);else if(!previous.ready&&!building.remaining)this.add(b.time,`Edificio completato: ${BUILDINGS[building.type].name.toLowerCase()}, ora operativo.`);}
      for(const [id,building]of old.buildings)if(!current.buildings.has(id))this.add(b.time,`Abbiamo perduto ${BUILDINGS[building.type].name.toLowerCase()}. Tengo conto di questa perdita nel prossimo schieramento.`);
      for(const [id,type]of old.enemyBuildings)if(!current.enemyBuildings.has(id))this.add(b.time,`Abbiamo distrutto un edificio nemico: ${BUILDINGS[type].name.toLowerCase()}.${type==='barracks'?' Il reclutamento nemico si ferma finché non ricostruisce una caserma.':type==='farm'?' Le entrate nemiche diminuiscono.':''}`);
      if(current.wave>old.wave)this.add(b.time,'Il nemico ha lanciato un gruppo d’attacco. Controllo i suoi movimenti e la pressione sulla nostra sponda.');
      if(current.emergency&&!old.emergency&&current.enabled)this.add(b.time,'La base è minacciata: richiamo le unità automatiche per respingere l’incursione. I tuoi ordini manuali restano validi.');
      if(!current.emergency&&old.emergency&&current.enabled&&current.order!=='wait')this.add(b.time,'L’emergenza alla base è rientrata. Verifico lo schieramento mantenendo il presidio.');
      if(current.attack&&!old.attack&&current.enabled)this.add(b.time,`Il gruppo è pronto: ${current.attack} soldati iniziano l’avanzata. Mantengo le altre unità in presidio, raccolta o recupero.`);
      if(!current.attack&&old.attack&&current.enabled&&!current.emergency&&!['wait','defend','develop'].includes(current.order)&&units.some(u=>u.control!=='manual'))this.add(b.time,'Le unità automatiche non stanno più avanzando. Verifico lo schieramento prima del prossimo attacco.');
      if(current.recover&&!old.recover&&current.enabled)this.add(b.time,'Ritiro i feriti affidati a me verso la base. Riprenderanno servizio quando avranno recuperato abbastanza salute.');
      if(current.enabled!==old.enabled)this.add(b.time,current.enabled?'Riprendo il coordinamento delle truppe automatiche.':'Hai sospeso la mia guida: le mie truppe presidiano la posizione e i tuoi ordini restano attivi.');
      if(current.paused!==old.paused)this.add(b.time,paused?'La battaglia è in pausa. Tempo, addestramento e combattimenti sono fermi.':'La battaglia riprende.');
      if(current.phase!==old.phase&&['won','lost'].includes(current.phase))this.add(b.time,describeAdvisor(b,advisor,'blue'));
    }
    this.previous=current;return this.messages;
  }
}
