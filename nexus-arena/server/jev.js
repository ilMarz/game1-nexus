// Shared server helpers live outside api/ so Vercel doesn't deploy them as routes.
import {directorInstructions,telemetryUnits} from './director-context.js';
const tactics=['assault','flank','barrage','relief'];
const messages={
  assault:'Avanzata frontale. Il tuo segnale non può nascondersi.',
  flank:'Intercettori sui fianchi. Il corridoio di fuga si restringe.',
  barrage:'Batterie di fuoco attive. Trova un varco, se ci riesci.',
  relief:'Rinforzi in attesa. Ti concedo un altro respiro.'
};
export function hasKey(value){return typeof value==='string'&&value.trim()!==''&&value.trim()!=='your_typesafe_key_here';}
export function selectProvider(preferred,env=process.env){
  const choice=preferred??env.AI_PROVIDER??'auto';
  return ['auto','typesafe'].includes(choice)?'typesafe':null;
}
export function buildJevRequest(snapshot,model=process.env.TYPESAFE_MODEL||'jev-1.14.0'){
  return {
    model,
    state:{
      scenario:'A real-time space shooter. The player must survive 90 seconds and destroy the final boss. You direct the enemy fleet; the goal is a tense, fair fight with time to react.',
      units:telemetryUnits,
      telemetry:snapshot
    },
    questions:{tactic:{
      type:'choice',
      instructions:directorInstructions,
      criteria:{
        assault:'Frontal pursuit and reinforcements aligned with the player lane. Keep balanced pressure when stronger counters are unnecessary.',
        flank:'Split enemies into two approach angles and intercept ahead of predictable movement; bias side entry toward the player route. Counter edge camping or a repeated straight escape.',
        barrage:'More frequent fire with telegraphed aim and heavy-ship spread. Lead predictable motion, dislodge stationary aiming or challenge a healthy player clearing enemies efficiently.',
        relief:'Slower reinforcements from far away, slower pursuit and slower fire. Necessary under critical health, recent repeated damage or many nearby threats.'
      }
    }}
  };
}
export function parseJevDecision(data){
  const answer=data?.answers?.tactic;
  if(answer?.type!=='choice'||!tactics.includes(answer.choice)||!Number.isFinite(answer.confidence)||answer.confidence<0||answer.confidence>1)return null;
  return {tactic:answer.choice,confidence:answer.confidence,message:messages[answer.choice]};
}
export async function requestJev(snapshot){
  const response=await fetch('https://api.typesafe.ai/v1/systemone',{
    method:'POST',
    headers:{Authorization:`Bearer ${process.env.TYPESAFE_API_KEY}`,'Content-Type':'application/json'},
    signal:AbortSignal.timeout(8000),body:JSON.stringify(buildJevRequest(snapshot))
  });
  if(!response.ok)return {error:response.status===402?'insufficient_credits':response.status===401||response.status===403?'invalid_token':'provider_unavailable'};
  const decision=parseJevDecision(await response.json());
  return decision?{decision}:{error:'invalid_decision'};
}
