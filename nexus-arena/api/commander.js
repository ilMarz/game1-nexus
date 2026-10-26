import {blockLimitedRequest} from '../server/game-access.js';
import {hasKey,selectProvider} from '../server/jev.js';
import {MODULES,TECHNOLOGIES,barrierHp,SLOTS,SECTORS,COMPOSITIONS,OBJECTIVES,maxModuleHp,normalizePlan,localPlan,defenseSummary,explainPlan,budgetForWave} from '../orbit-sim.js';
const limits=new Map();
export function sanitizeDefense(body){
  if(!body||!Number.isInteger(body.wave)||body.wave<1||body.wave>6||!Number.isFinite(body.core)||!Array.isArray(body.structures)||body.structures.length>16)return null;
  const seen=new Set(),structures=[];
  for(const m of body.structures){
    if(!m||!Number.isInteger(m.slot)||!SLOTS[m.slot]||seen.has(m.slot)||!Object.hasOwn(MODULES,m.type)||!Number.isInteger(m.level)||m.level<1||m.level>3||!Number.isFinite(m.hp)||m.hp<=0||typeof m.enabled!=='boolean')return null;
    seen.add(m.slot);structures.push({slot:m.slot,type:m.type,level:m.level,hp:Math.max(1,Math.round(Math.min(maxModuleHp(m),m.hp))),enabled:m.enabled});
  }
  let last=null;if(body.last!==null&&body.last!==undefined){
    last={};for(const k of ['damage','kills','leaks','destroyed']){const n=k==='destroyed'?(body.last[k]??0):body.last[k];if(!Number.isFinite(n)||n<0)return null;last[k]=Math.round(Math.min(500,n));}
    for(const [key,allowed] of Object.entries({sector:SECTORS,composition:Object.keys(COMPOSITIONS),objective:Object.keys(OBJECTIVES)}))if(body.last[key]!==undefined){if(!allowed.includes(body.last[key]))return null;last[key]=body.last[key];}
  }
  const barriers=[];if(body.barriers!==undefined){
    if(!Array.isArray(body.barriers)||body.barriers.length>4)return null;
    for(const b of body.barriers){if(!b||!SECTORS.includes(b.sector)||barriers.some(x=>x.sector===b.sector)||!Number.isInteger(b.level)||b.level<1||b.level>3||!Number.isFinite(b.hp)||b.hp<0||!Number.isFinite(b.remaining)||b.remaining<0)return null;barriers.push({sector:b.sector,level:b.level,hp:Math.min(barrierHp(b.level),Math.ceil(b.hp)),remaining:Math.min(12,Math.ceil(b.remaining))});}
  }
  let economy=null;if(body.economy){
    if(!['credits','alloys','research'].every(k=>Number.isFinite(body.economy[k])&&body.economy[k]>=0)||!Array.isArray(body.economy.tech)||body.economy.tech.some(t=>!Object.hasOwn(TECHNOLOGIES,t)))return null;
    economy=Object.fromEntries(['credits','alloys','research'].map(k=>[k,Math.min(10000,Math.floor(body.economy[k]))]));economy.tech=[...new Set(body.economy.tech)];
  }
  let live=null;if(body.live){
    const keys=['elapsed','kills','leaks','damage','destroyed','remainingBudget','enemies'];
    if(keys.some(k=>!Number.isFinite(body.live[k])||body.live[k]<0)||!normalizePlan(body.live.plan))return null;
    live=Object.fromEntries(keys.map(k=>[k,Math.min(500,Math.floor(body.live[k]))]));live.plan=normalizePlan(body.live.plan);
    if(live.remainingBudget>budgetForWave(body.wave))return null;
  }
  return {wave:body.wave,core:Math.round(Math.min(300,Math.max(0,body.core))),structures,last,barriers,economy,live,mode:['balanced','weapons','shields'].includes(body.mode)?body.mode:'balanced'};
}
const instructions='You command the enemy fleet in a six-wave orbital tower defense. Adapt to actual player defenses, barrier construction, economy, technology and live battle outcomes. Sector coverage is powered weapon DPS. Barriers at radius 350 block ships in an arc of +/-0.62 radians in their sector until destroyed; entering an unfortified sector bypasses that wall. Building barriers show seconds remaining. Lasers are weak against armor; slow missiles against swarms; clustered shields against siege. Bombers deal double damage to barriers. Reactors power defenses; powered extractors produce credits/alloys every 6s and research every 18s. Raiding extractors can stop enemy growth. If a previous attack is failing, change composition, approach or objective based on observed losses and player changes. At mid-wave reassessment only unspawned reserves can change composition/entry; existing ships retarget to the new objective without teleporting or gaining HP. Budget never increases. Choose sector, composition and objective; no invented abilities. Prefer a useful counter over changing just for variety.';
export function buildCommanderRequest(snapshot,model=process.env.TYPESAFE_MODEL||'jev-1.14.0'){
  return {model,state:{scenario:instructions,budget:budgetForWave(snapshot.wave),core:snapshot.core,wave:snapshot.wave,defenses:snapshot.structures.map(m=>({...m,sector:SLOTS[m.slot].sector})),analysis:defenseSummary(snapshot.structures,snapshot.mode),previousWave:snapshot.last,barriers:snapshot.barriers||[],economy:snapshot.economy,liveBattle:snapshot.live},questions:{
    sector:{type:'choice',instructions:'Select the approach sector from the observed defenses.',criteria:Object.fromEntries(SECTORS.map(s=>[s,`Enter from ${s}. Compare powered weapon coverage and vulnerable targets there.`]))},
    composition:{type:'choice',instructions:'Select fleet composition to counter the player build.',criteria:{balanced:'Mixed fleet, balanced pressure.',swarm:'Many light scouts; overwhelm slow missiles.',armor:'Armored ships; resist rapid lasers.',siege:'Bombers with area damage; counter clustered structures and shields.',raiders:'Fast raiders; exploit exposed reactors.'}},
    objective:{type:'choice',instructions:'Select the primary target. If no matching structure remains, attack the core.',criteria:{core:'Destroy the central core.',energy:'Destroy reactors to take defenses offline.',cluster:'Attack the densest structure cluster with area fire.',economy:'Destroy production extractors to deny income and research.',barriers:'Use siege bombers to breach fortified sectors; ships attack any barrier obstructing their entry.'}}
  }};
}
export function parseCommanderAnswer(data){
  const choices={};const confidences=[];
  for(const key of ['sector','composition','objective']){
    const a=data?.answers?.[key];if(a?.type!=='choice'||!Number.isFinite(a.confidence)||a.confidence<0||a.confidence>1)return null;
    choices[key]=a.choice;confidences.push(a.confidence);
  }
  const plan=normalizePlan(choices);return plan?{...plan,confidence:Math.min(...confidences)}:null;
}
export default async function handler(req,res){
  if(blockLimitedRequest(res))return;
  res.setHeader('Cache-Control','no-store');
  const error=(reason,status=400)=>res.status(status).json({error:reason});
  if(req.method!=='POST')return error('method_not_allowed',405);
  if(Number(req.headers['content-length']||0)>8192)return error('request_too_large',413);
  if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return error('origin_not_allowed',403);}catch{return error('origin_not_allowed',403);}}
  let body=req.body;try{if(typeof body==='string')body=JSON.parse(body);}catch{return error('invalid_snapshot');}
  const snapshot=sanitizeDefense(body);if(!snapshot)return error('invalid_snapshot');
  const provider=body.provider==='off'?'off':selectProvider(body.provider);if(!provider)return error('invalid_provider');
  const reply=(plan,source,extra={})=>res.status(200).json({...plan,source,budget:budgetForWave(snapshot.wave),evidence:explainPlan(plan,defenseSummary(snapshot.structures,snapshot.mode)),...extra});
  if(provider==='off')return reply({sector:'north',composition:'balanced',objective:'core'},'off');
  const fallback=reason=>reply(localPlan(snapshot),'fallback',{reason,provider});
  if(!hasKey(process.env.TYPESAFE_API_KEY))return fallback('missing_token');
  const now=Date.now(),ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
  for(const [key,v] of limits)if(v.until<now)limits.delete(key);
  const limit=limits.get(ip)||{count:0,until:now+60000};if(limit.count>=18)return fallback('rate_limited');limit.count++;limits.set(ip,limit);
  const started=Date.now();
  try{
    const context=buildCommanderRequest(snapshot);let plan;
    const response=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:`Bearer ${process.env.TYPESAFE_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(context),signal:AbortSignal.timeout(8000)});
    if(response.ok)plan=parseCommanderAnswer(await response.json());
    if(!response.ok)return fallback(response.status===402?'insufficient_credits':response.status===401||response.status===403?'invalid_token':'provider_unavailable');
    return plan?reply(plan,provider,{latencyMs:Date.now()-started}):fallback('invalid_decision');
  }catch{return fallback('provider_unavailable');}
}
