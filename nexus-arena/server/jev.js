// Shared server helpers live outside api/ so Vercel doesn't deploy them as routes.
const tactics=['assault','flank','barrage','relief'];
const messages={
  assault:'Avanzata frontale. Il tuo segnale non può nascondersi.',
  flank:'Intercettori sui fianchi. Il corridoio di fuga si restringe.',
  barrage:'Batterie di fuoco attive. Trova un varco, se ci riesci.',
  relief:'Rinforzi in attesa. Ti concedo un altro respiro.'
};
export function hasKey(value){return typeof value==='string'&&value.trim()!==''&&!['your_typesafe_key_here','hf_your_token_here'].includes(value.trim());}
export function selectProvider(preferred,env=process.env){
  const choice=preferred??env.AI_PROVIDER??'auto';
  if(choice==='auto')return hasKey(env.TYPESAFE_API_KEY)?'typesafe':'huggingface';
  return ['typesafe','huggingface'].includes(choice)?choice:null;
}
export function buildJevRequest(snapshot,model=process.env.TYPESAFE_MODEL||'jev-1.14.0'){
  return {
    model,
    state:{
      scenario:'A real-time space shooter. The player must survive 90 seconds and destroy the final boss. You direct the enemy fleet; the goal is a tense, fair fight with time to react.',
      units:{elapsed:'seconds since mission start',health:'remaining hull percent',movement:'average movement speed in world units per second',kills:'enemies destroyed',cores:'repair and weapon pickups collected',enemies:'active enemies on screen'},
      telemetry:snapshot
    },
    questions:{tactic:{
      type:'choice',
      instructions:'Choose the next fleet tactic from the current telemetry. Give a badly damaged player breathing room. With healthy players, choose a tactic that challenges their movement and combat performance without overwhelming them. Choose only the tactic; the game code controls all movement, firing, collision and limits.',
      criteria:{
        assault:'Balanced frontal pursuit for a player coping with the current enemies. The normal opening tactic.',
        flank:'Send interceptors from the sides to challenge a healthy player staying still or easily clearing frontal enemies.',
        barrage:'Increase enemy firing frequency to challenge a healthy, mobile player who is clearing enemies effectively.',
        relief:'Slow enemy reinforcements when hull health is low, or too many enemies are already threatening the player.'
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
