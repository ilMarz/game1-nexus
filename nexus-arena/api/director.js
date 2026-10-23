import {hasKey,selectProvider,requestJev} from '../server/jev.js';
import {directorInstructions} from '../server/director-context.js';
const limits=new Map();
const tactics=['assault','flank','barrage','relief'];
export function sanitizeSnapshot(body){
  if(!body||typeof body!=='object'||Array.isArray(body))return null;
  const ranges={elapsed:[0,180],health:[0,100],kills:[0,500],cores:[0,250],movement:[0,1500],enemies:[0,50]};
  const optional={x:[0,100],y:[0,100],vx:[-1500,1500],vy:[-1500,1500],speed:[0,1500],stationaryPct:[0,100],edgePct:[0,100],consistency:[0,100],recentDamage:[0,200],recentKills:[0,500],accuracy:[0,100],threats:[0,50],windowSeconds:[0,8],stillSeconds:[0,180],currentTactic:[0,3],tacticAge:[0,180]};
  const clean={};for(const [key,[min,max]] of Object.entries({...ranges,...optional})){
    if(key in optional&&body[key]===undefined)continue;
    const n=body[key];if(typeof n!=='number'||!Number.isFinite(n))return null;
    clean[key]=Math.round(Math.min(max,Math.max(min,n))*10)/10;
  }return clean;
}
export function parseDecision(content){
  if(typeof content!=='string'||content.length>3000)return null;
  try{const data=JSON.parse(content.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));if(!tactics.includes(data.tactic)||typeof data.message!=='string')return null;return {tactic:data.tactic,message:data.message.replace(/[\u0000-\u001f<>]/g,'').slice(0,100)};}catch{return null;}
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  let provider;
  const fallback=(reason,status=200)=>res.status(status).json({source:'fallback',reason,provider});
  if(req.method!=='POST'){res.setHeader('Allow','POST');return fallback('method_not_allowed',405);}
  const size=Number(req.headers['content-length']||0);if(size>2048)return fallback('request_too_large',413);
  const origin=req.headers.origin,host=req.headers.host;if(origin){try{if(new URL(origin).host!==host)return fallback('origin_not_allowed',403);}catch{return fallback('origin_not_allowed',403);}}
  let body=req.body;try{if(typeof body==='string')body=JSON.parse(body);}catch{return fallback('invalid_snapshot',400);}
  const snapshot=sanitizeSnapshot(body);if(!snapshot)return fallback('invalid_snapshot',400);
  provider=body.provider==='off'?'off':selectProvider(body.provider);
  if(!provider)return fallback('invalid_provider',400);
  if(provider==='off')return res.status(200).json({source:'local',tactic:'assault',message:'Modalità classica: assalto fisso.'});
  const token=provider==='typesafe'?process.env.TYPESAFE_API_KEY:process.env.HF_TOKEN;
  if(!hasKey(token))return fallback('missing_token');
  const now=Date.now(),ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
  for(const [key,value] of limits)if(value.until<now)limits.delete(key);
  const limit=limits.get(ip)||{count:0,until:now+60000};if(limit.count>=8)return fallback('rate_limited',429);limit.count++;limits.set(ip,limit);
  try{
    const started=Date.now();
    if(provider==='typesafe'){
      const result=await requestJev(snapshot);
      if(result.error)return fallback(result.error);
      return res.status(200).json({source:'typesafe',...result.decision,latencyMs:Date.now()-started});
    }
    const upstream=await fetch('https://router.huggingface.co/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.HF_TOKEN}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(8000),body:JSON.stringify({model:process.env.HF_MODEL||'Qwen/Qwen3-8B',messages:[{role:'system',content:directorInstructions+' Reply ONLY a JSON object with tactic (assault, flank, barrage or relief) and message (short Italian tactical transmission, max 90 characters). No markdown or analysis. /no_think'},{role:'user',content:JSON.stringify(snapshot)}],max_tokens:160,temperature:.2,stream:false})});
    if(!upstream.ok){console.warn('HF provider status:',upstream.status);return fallback(upstream.status===402?'insufficient_credits':upstream.status===401||upstream.status===403?'invalid_token':'provider_unavailable');}
    const data=await upstream.json();const decision=parseDecision(data.choices?.[0]?.message?.content);if(!decision)return fallback('invalid_decision');return res.status(200).json({source:'huggingface',...decision,latencyMs:Date.now()-started});
  }catch(error){console.warn('AI director failed:',provider,error.name);return fallback('provider_unavailable');}
}
