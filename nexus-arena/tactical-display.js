import {tacticFor} from './tactics.js';

export class TacticalDisplay {
  constructor(root){this.root=root;this.history=[];this.reset();}
  reset(){this.history=[];this.calls=0;this.root.querySelector('[data-history]').replaceChildren();this.root.querySelector('[data-request]').textContent='Nessuna risposta API in questa partita';}
  request(trigger){this.root.querySelector('[data-request]').textContent='Richiesta API · '+trigger+'…';}
  response(source,latency,proposal){this.calls++;this.root.querySelector('[data-request]').textContent=`${source} · risposta #${this.calls} · ${Number.isFinite(latency)?latency+' ms':'latenza non disponibile'}`+(proposal?' · proposta '+tacticFor(proposal).name+', recupero protetto':'');}
  failure(){this.root.querySelector('[data-request]').textContent='API non disponibile · regole locali attive';}
  adaptation(plan,s){
    this.root.querySelector('[data-description]').textContent=plan.description;
    const readout=this.root.querySelector('[data-observed]');
    readout.textContent=plan.adaptive?`LETTURA ${s.windowSeconds??0}s · POS ${s.x??50}/${s.y??70} · FERMO ${s.stationaryPct??0}% · BORDI ${s.edgePct??0}% · DANNI ${s.recentDamage??0} · KILL ${s.recentKills??0}`:'ADATTAMENTO DISATTIVATO';
  }
  show(key,source,time=0){
    const t=tacticFor(key);this.root.hidden=false;this.root.style.setProperty('--tactic',t.css);
    this.root.querySelector('[data-symbol]').textContent=t.symbol;
    this.root.querySelector('[data-source]').textContent=source;
    this.root.querySelector('[data-name]').textContent=t.name;
    this.root.querySelector('[data-description]').textContent=t.description;
    this.root.querySelector('[data-hint]').textContent=t.hint;
    const stamp=`${String(Math.floor(time/60)).padStart(2,'0')}:${String(Math.floor(time%60)).padStart(2,'0')}`;
    this.history.unshift(`${stamp} · ${source} → ${t.name}`);this.history.length=Math.min(this.history.length,3);
    const items=this.history.map(text=>{const li=document.createElement('li');li.textContent=text;return li;});
    this.root.querySelector('[data-history]').replaceChildren(...items);
  }
}
