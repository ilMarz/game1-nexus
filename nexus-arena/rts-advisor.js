import {PASSAGES,terrainAt} from './rts-terrain.js';
import {COMPOSITIONS} from './rts-plans.js';
import {STANCES} from './rts-balance.js';
import {respectOrder} from './rts-orders.js';

const targetNames={keep:'la fortezza avversaria',barracks:'la caserma avversaria',farm:'la segheria avversaria',tower:'la torre avversaria',house:'gli alloggi avversari'};
const soldiers=n=>`${n} ${n===1?'soldato':'soldati'}`;

// Character dialogue is a factual rendering of applied orders, never hidden model reasoning.
export function describeAdvisor(battle,advisor,team,{enabled=true,paused=false}={}){
  const allied=team==='blue',own=battle.units.filter(u=>u.team===team&&u.hp>0),manual=allied?own.filter(u=>u.control==='manual').length:0;
  const available=own.filter(u=>!allied||u.control!=='manual'),raw=advisor.plan||(allied?battle.allyPlan:battle.enemyPlan),plan=allied&&raw?respectOrder(raw,battle.advisorOrder):raw;
  if(['won','lost'].includes(battle.phase)){
    const victory=(battle.phase==='won')===allied;
    return victory?'La fortezza avversaria è caduta. La battaglia è vinta; non impartisco altri ordini.':'La nostra fortezza è caduta. La battaglia è conclusa; non impartisco altri ordini.';
  }
  if(allied&&!enabled)return 'La mia guida è sospesa. Le truppe affidate a me presidiano la posizione; i tuoi ordini manuali restano attivi.';
  if(battle.phase==='prep')return allied?'Scegli quali truppe reclutare e affidami quelle che vuoi guidare. Studierò il terreno; potrai riprendere il comando in ogni momento.':'Studio i cinque passaggi e attendo il tuo schieramento. All’inizio della battaglia guiderò l’esercito del regno rivale.';
  if(!plan)return allied?'Sto valutando le truppe disponibili, gli ordini che hai dato e la posizione del nemico. Prima di muovere attendo una strategia valida.':'Sto valutando eserciti, difese e attraversamenti. Prima di muovere attendo una strategia valida.';
  if(allied&&battle.advisorOrder==='wait')return battle.emergencyDefense?.active?'Mantengo le posizioni come richiesto. La difesa è insufficiente: la delega d’emergenza mi permette di pagare rinforzi o strutture difensive. I tuoi ordini manuali restano attivi.':'Come richiesto, aspetto: le truppe automatiche mantengono la posizione e si difendono se attaccate. Non avvio reclutamenti o cantieri fuori dalle emergenze difensive. I tuoi ordini manuali restano attivi.';
  if(allied&&!available.length){
    const waiting=battle.queue.filter(q=>q.control!=='manual').length;
    const message=manual?`Controlli direttamente ${soldiers(manual)}. Non cambio i tuoi ordini: attendo che tu mi affidi nuovamente delle unità.`:waiting?'Attendo le truppe disponibili in addestramento. Riceveranno il mio piano appena saranno pronte.':'Non ho truppe disponibili da guidare. Recluta dei soldati oppure affidami le tue riserve.';
    return paused?'La battaglia è in pausa. '+message:message;
  }
  if(!allied&&!available.length)return battle.buildings.some(b=>b.team==='red'&&b.type==='barracks'&&b.hp>0)?'Non ho soldati attivi. Attendo i prossimi rinforzi dalla mia caserma.':'La mia caserma è distrutta e non ho soldati rimasti. Non posso inviare altri rinforzi.';
  const orders=available.filter(u=>u.order),targets=new Map(),routes=new Map();
  for(const u of orders)if(u.route)routes.set(u.route,(routes.get(u.route)||0)+1);
  const passage=PASSAGES.find(p=>p.id===([...routes.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||plan.passage));
  for(const u of orders){const target=u.order.target&&battle.entity(u.order.target);if(target)targets.set(target.id,{entity:target,count:(targets.get(target.id)?.count||0)+1});}
  const target=[...targets.values()].sort((a,b)=>b.count-a.count)[0]?.entity;
  let report;
  if(orders.length&&orders.every(u=>u.order.mode==='guard'||u.order.mode==='hold')){
    const hillArchers=orders.filter(u=>u.type==='archer'&&terrainAt(u.order.x,u.order.y).kind==='hill').length;
    report='Ho ordinato un presidio intorno ai nostri edifici, per proteggere la base.';
    if(hillArchers)report+=' Ho destinato gli arcieri all’altura per sfruttare la gittata maggiore.';
  }else if(target){
    const mode=orders.some(u=>u.order.mode==='flank')?'aggiramento':'assalto';
    report=`Ho ordinato un ${mode} attraverso il ${passage.name}, per ${target.kind==='building'?'abbattere '+targetNames[target.type]:'attaccare le unità avversarie'}.`;
  }else if(plan.objective==='crossing'&&orders.some(u=>u.order.mode==='attack'))report=available.every(u=>u.type==='ram')?'Ho solo arieti disponibili: non possono conquistare i passaggi. Per occupare il terreno serve fanteria.':`Ho ordinato di occupare il ${passage.name}, per controllare il passaggio e le sue entrate.`;
  else if(orders.some(u=>u.order.target&&!battle.entity(u.order.target)))report='Il bersaglio precedente è stato distrutto. Sto rivalutando dove dirigere le truppe rimaste.';
  else report='Sto coordinando le unità disponibili e verificando i prossimi ordini sul campo.';
  if(available.some(u=>u.type==='ram'&&u.route&&u.route!==plan.passage))report+=' Gli arieti seguono un ponte largo compatibile.';
  const state=battle.tactics?.[team],roles=state&&{...state,...Object.fromEntries(['defense','attack','rally','recover'].map(duty=>[duty,available.filter(u=>u.duty===duty).length]))};
  if(roles&&roles.defense!==undefined){
    if(roles.emergency)report='La base è sotto attacco: richiamo le truppe automatiche per respingere l’incursione.';
    else if(roles.rally&&!roles.attack)report=`Raduno ${soldiers(roles.rally)} prima di avanzare dal ${passage.name}: servono almeno ${roles.minimum} unità, oppure un ariete con tre scorte, per questo obiettivo.`;
    report=`Dottrina ${STANCES[plan.stance??'balanced'].toLowerCase()}. ${report} ${roles.defense} in difesa · ${roles.attack} in attacco · ${roles.rally} in raccolta · ${roles.recover} in recupero.`;
  }
  if(allied&&manual)report+=` Lascio ${soldiers(manual)} ai tuoi ordini.`;
  if(!allied){
    if(battle.buildings.some(b=>b.team==='red'&&b.type==='barracks'&&b.hp>0))report+=` Per i prossimi rinforzi ho scelto: ${COMPOSITIONS[plan.composition].toLowerCase()}.`;
    else report+=' La mia caserma è distrutta: combatto con le truppe rimaste.';
  }
  if(paused)report='La battaglia è in pausa. '+report;
  else if(advisor.busy)report+=' Sto rivedendo il piano; gli ordini attuali restano validi.';
  return report;
}
