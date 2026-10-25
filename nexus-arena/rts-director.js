import {summarizeBattle,normalizeRtsPlan,localRtsPlan,planObservation} from './rts-plans.js';
import {describeAdvisor} from './rts-advisor.js';
import {RTS_RECHECK_SECONDS} from './rts-timing.js';

export const FALLBACK_REASONS={missing_token:'Chiave TypeSafe assente: aggiungi TYPESAFE_API_KEY nel file .env.',invalid_token:'TypeSafe non ha accettato la chiave.',insufficient_credits:'Credito TypeSafe insufficiente.',rate_limited:'Limite temporaneo di richieste raggiunto.',invalid_decision:'Risposta non compatibile con le regole del campo.',provider_unavailable:'Consigliere Stratega momentaneamente non raggiungibile.'};
// Owns request lifetime independently from the simulation and renderer.
export class RtsDirector{
  constructor(fetcher=(...args)=>fetch(...args),{team='red',managePhase=true}={}){this.fetcher=fetcher;this.team=team;this.managePhase=managePhase;this.reset();}
  reset(){this.abort?.abort();this.revision=(this.revision||0)+1;this.busy=false;this.pending=null;this.nextAt=0;this.calls=0;this.source=null;this.plan=null;this.meta=null;this.history=[];this.provider='typesafe';this.enabled=true;this.lastRequestAt=-Infinity;this.signature=null;}
  suspend(){this.abort?.abort();this.revision++;this.busy=false;this.pending=null;this.enabled=false;}
  battleSignature(b){return `${b.commandRevision}|${b.units.length}|${b.buildings.length}|${b.losses.blue}|${b.losses.red}|${b.sites.map(s=>s.owner).join(',')}`;}
  start(battle,provider='typesafe'){
    this.reset();this.provider=provider;if(this.team==='red')battle.externalCommander=true;if(this.managePhase)battle.phase='planning';return this.request(battle,true);
  }
  tick(battle,paused=false){
    if(['won','lost'].includes(battle.phase)){if(this.busy){this.abort?.abort();this.revision++;this.busy=false;}this.pending=null;return;}
    if(paused||!this.enabled)return;
    if(this.pending){const {reply,initial}=this.pending;this.pending=null;
      if(this.team==='blue'?battle.applyAllyPlan(reply):battle.applyEnemyPlan(reply)){
        this.source=reply.source;this.plan=normalizeRtsPlan(reply);this.meta=reply;this.nextAt=Math.max(battle.time,this.lastRequestAt+RTS_RECHECK_SECONDS);
        this.history.unshift({time:Math.round(battle.time),source:reply.source,plan:this.plan,report:describeAdvisor(battle,this,this.team)});this.history.length=Math.min(7,this.history.length);
      }
      if(initial&&this.managePhase&&battle.phase==='planning')battle.phase='combat';
    }
    const signature=this.battleSignature(battle);if(this.plan&&signature!==this.signature){this.signature=signature;this.nextAt=Math.min(this.nextAt,Math.max(battle.time,this.lastRequestAt+RTS_RECHECK_SECONDS));}
    if(!this.busy&&battle.phase==='combat'&&battle.time>=this.nextAt)this.request(battle,false);
  }
  async request(battle,initial){
    const revision=this.revision,snapshot=summarizeBattle(battle,this.team);this.busy=true;this.abort=new AbortController();this.calls++;this.lastRequestAt=battle.time;this.signature=this.battleSignature(battle);
    const fallback=reason=>({...localRtsPlan(snapshot),source:'fallback',reason});let reply;
    try{
      if(this.provider==='off')reply={...localRtsPlan(snapshot),source:'off'};
      else{
        const response=await this.fetcher('/api/warlord',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...snapshot,provider:'typesafe'}),signal:AbortSignal.any([this.abort.signal,AbortSignal.timeout(10000)])});
        if(!response.ok)throw Error('http');reply=await response.json();
        if(!normalizeRtsPlan(reply)||!['typesafe','fallback'].includes(reply.source)||reply.commanderTeam&&reply.commanderTeam!==this.team||reply.source==='typesafe'&&(!Number.isFinite(reply.confidence)||reply.confidence<0||reply.confidence>1||!Number.isFinite(reply.latencyMs)))reply=fallback('invalid_decision');
      }
    }catch{reply=fallback('provider_unavailable');}
    if(revision!==this.revision||['won','lost'].includes(battle.phase))return;
    reply.observation=planObservation(snapshot,reply);this.pending={reply,initial};this.busy=false;
  }
}

export class DualRtsCommanders{
  constructor(fetcher){this.enemy=new RtsDirector(fetcher,{team:'red',managePhase:false});this.ally=new RtsDirector(fetcher,{team:'blue',managePhase:false});this.ally.enabled=false;}
  reset(){this.enemy.reset();this.ally.reset();this.ally.enabled=false;}
  start(battle,provider='typesafe',allyEnabled=true){
    this.reset();battle.phase='planning';battle.setAllyEnabled(allyEnabled);this.enemy.start(battle,provider);
    if(allyEnabled)this.ally.start(battle,provider);
  }
  setAllyEnabled(battle,enabled){
    battle.setAllyEnabled(enabled);if(!enabled){this.ally.suspend();return;}
    if(battle.phase==='prep')return;
    this.ally.reset();this.ally.provider=this.enemy.provider;this.ally.nextAt=battle.time;
  }
  setAdvisorOrder(battle,order){
    if(!battle.setAdvisorOrder(order))return false;
    const a=this.ally;a.abort?.abort();a.revision++;a.busy=false;a.pending=null;a.signature=null;
    a.nextAt=Math.max(battle.time,a.lastRequestAt+RTS_RECHECK_SECONDS);return true;
  }
  tick(battle,paused=false){
    this.enemy.tick(battle,paused);if(battle.allyEnabled)this.ally.tick(battle,paused);
    if(!paused&&battle.phase==='planning'&&this.enemy.plan&&(!battle.allyEnabled||this.ally.plan))battle.phase='combat';
  }
}
