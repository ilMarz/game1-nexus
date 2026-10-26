export function isLimitEnabled(env=process.env){
  return ['ON','TRUE'].includes(String(env.ENABLE_LIMIT??'false').trim().toUpperCase());
}

export const limitPage=`<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#1b241b"><title>Limite JEV raggiunto</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;background:#1b241b;color:#f0e8d5;font-family:Georgia,serif;text-align:center}main{max-width:36rem}h1{font-size:clamp(2rem,7vw,3.5rem);font-weight:500;line-height:1.15;margin:0}p{font-family:system-ui,sans-serif;color:#c1c5b6;line-height:1.6;margin:24px 0 0}</style></head>
<body><main><h1>Limite JEV raggiunto</h1><p>Il gioco è temporaneamente non disponibile. Riprova più tardi.</p></main></body></html>`;

export function gateGameHtml(html,env=process.env){
  return isLimitEnabled(env)?limitPage:html;
}

export function blockLimitedRequest(res){
  if(!isLimitEnabled())return false;
  res.setHeader('Cache-Control','no-store');
  res.status(503).json({error:'jev_limit_reached',message:'Limite JEV raggiunto'});
  return true;
}
