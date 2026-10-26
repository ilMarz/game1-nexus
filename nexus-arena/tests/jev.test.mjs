import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/director.js';
import {buildJevRequest,parseJevDecision,selectProvider} from '../server/jev.js';
const snapshot={elapsed:35,health:20,kills:18,cores:4,movement:120,enemies:8,x:80,y:40,vx:-220,vy:10,speed:230,consistency:90,stationaryPct:0,edgePct:60,recentDamage:36,recentKills:3,accuracy:70,threats:4,windowSeconds:8};
const mockAnswer={model:'jev-1.14.0',answers:{tactic:{type:'choice',choice:'relief',confidence:.88,probabilities:{assault:.02,flank:.03,barrage:.05,relief:.9}}}};
function response(){return {statusCode:200,setHeader(){},status(n){this.statusCode=n;return this},json(data){this.data=data;return this}};}
test('auto always selects Jev; unsupported providers are rejected',()=>{
  assert.equal(selectProvider('auto',{TYPESAFE_API_KEY:'your_typesafe_key_here'}),'typesafe');
  assert.equal(selectProvider('auto',{TYPESAFE_API_KEY:'test-secret'}),'typesafe');
  assert.equal(selectProvider('huggingface',{TYPESAFE_API_KEY:'test-secret'}),null);
  assert.equal(selectProvider('typesafe',{}),'typesafe');
  assert.equal(selectProvider(undefined,{}),'typesafe');
  assert.equal(selectProvider(undefined,{AI_PROVIDER:'auto'}),'typesafe');
  assert.equal(selectProvider('arbitrary-provider',{}),null);
});
test('Jev receives a bounded Choice with the four implemented game actions',()=>{
  const body=buildJevRequest(snapshot,'jev-1.14.0');
  assert.equal(body.model,'jev-1.14.0');assert.equal(body.questions.tactic.type,'choice');
  assert.deepEqual(Object.keys(body.questions.tactic.criteria),['assault','flank','barrage','relief']);
  assert.deepEqual(body.state.telemetry,snapshot);assert.ok(!('max_tokens' in body));
  assert.equal(body.state.telemetry.vx,-220);assert.ok(body.questions.tactic.instructions.includes('recentDamage'));assert.ok(body.questions.tactic.criteria.flank.includes('intercept'));
});
test('Jev choices and confidence are validated; prose comes from the game',()=>{
  const decision=parseJevDecision(mockAnswer);assert.equal(decision.tactic,'relief');assert.equal(decision.confidence,.88);assert.equal(typeof decision.message,'string');
  for(const answer of [{type:'choice',choice:'teleport',confidence:1},{type:'choice',choice:'flank',confidence:NaN},{type:'choice',choice:'flank',confidence:1.5},{type:'noul',choice:'flank',confidence:1}])assert.equal(parseJevDecision({answers:{tactic:answer}}),null);
});
test('TypeSafe adapter sends server secret to the native endpoint, never the client',async()=>{
  const originalFetch=globalThis.fetch,saved=process.env.TYPESAFE_API_KEY;process.env.TYPESAFE_API_KEY='typesafe_test_secret';let sent;
  globalThis.fetch=async(url,options)=>{sent={url,options};return {ok:true,json:async()=>mockAnswer}};
  try{const res=response();await handler({method:'POST',headers:{'x-forwarded-for':'jev-success'},body:{...snapshot,provider:'typesafe'}},res);
    assert.equal(sent.url,'https://api.typesafe.ai/v1/systemone');assert.equal(sent.options.headers.Authorization,'Bearer typesafe_test_secret');
    assert.equal(JSON.parse(sent.options.body).state.telemetry.recentDamage,36);
    assert.equal(res.data.source,'typesafe');assert.equal(res.data.tactic,'relief');assert.equal(res.data.confidence,.88);assert.equal(typeof res.data.latencyMs,'number');assert.ok(!JSON.stringify(res.data).includes('typesafe_test_secret'));
  }finally{globalThis.fetch=originalFetch;if(saved===undefined)delete process.env.TYPESAFE_API_KEY;else process.env.TYPESAFE_API_KEY=saved;}
});
test('server caps adaptive model calls at eight per minute per address',async()=>{
  const saved=process.env.TYPESAFE_API_KEY,originalFetch=globalThis.fetch;process.env.TYPESAFE_API_KEY='typesafe_test_secret';let calls=0;
  globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>mockAnswer};};
  try{
    for(let i=0;i<9;i++){
      const res=response();await handler({method:'POST',headers:{'x-forwarded-for':'adaptive-rate-test'},body:{...snapshot,provider:'typesafe'}},res);
      assert.equal(res.statusCode,i<8?200:429);
      if(i===8)assert.equal(res.data.reason,'rate_limited');
    }
    assert.equal(calls,8);
  }finally{globalThis.fetch=originalFetch;if(saved===undefined)delete process.env.TYPESAFE_API_KEY;else process.env.TYPESAFE_API_KEY=saved;}
});
test('missing TypeSafe credentials return local fallback without a model call',async()=>{
  const saved=process.env.TYPESAFE_API_KEY,originalFetch=globalThis.fetch;delete process.env.TYPESAFE_API_KEY;let called=false;
  globalThis.fetch=async()=>{called=true;throw Error('must not call a paid provider');};
  try{for(const provider of ['typesafe','auto']){const res=response();await handler({method:'POST',headers:{},body:{...snapshot,provider}},res);assert.equal(res.data.reason,'missing_token');assert.equal(res.data.provider,'typesafe');assert.equal(called,false);}}
  finally{globalThis.fetch=originalFetch;if(saved!==undefined)process.env.TYPESAFE_API_KEY=saved;}
});
test('TypeSafe billing errors leave the game on local rules without another model call',async()=>{
  const saved=process.env.TYPESAFE_API_KEY,originalFetch=globalThis.fetch;process.env.TYPESAFE_API_KEY='typesafe_test_secret';let count=0;
  globalThis.fetch=async()=>{count++;return {ok:false,status:402}};
  try{const res=response();await handler({method:'POST',headers:{'x-forwarded-for':'jev-billing'},body:{...snapshot,provider:'typesafe'}},res);assert.equal(res.data.reason,'insufficient_credits');assert.equal(res.data.source,'fallback');assert.equal(count,1);}
  finally{globalThis.fetch=originalFetch;if(saved===undefined)delete process.env.TYPESAFE_API_KEY;else process.env.TYPESAFE_API_KEY=saved;}
});
