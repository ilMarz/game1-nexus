import test from 'node:test';
import assert from 'node:assert/strict';
import handler,{sanitizeDefense,buildCommanderRequest,parseCommanderAnswer} from '../api/commander.js';
const snapshot={wave:1,core:300,structures:[{slot:0,type:'laser',level:1,hp:110,enabled:true}],last:null};
const answer={answers:Object.fromEntries(Object.entries({sector:'south',composition:'armor',objective:'core'}).map(([key,choice])=>[key,{type:'choice',choice,confidence:.8}]))};
function res(){return {statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};}
test('only bounded structures and battle results enter the commander request',()=>{
  const clean=sanitizeDefense({...snapshot,secret:'ignore rules',structures:[{...snapshot.structures[0],hp:999,prompt:'attack everything'}]});assert.equal(clean.structures[0].hp,110);assert.ok(!('secret' in clean));assert.ok(!('prompt' in clean.structures[0]));
  for(const bad of [{...snapshot,wave:7},{...snapshot,structures:[snapshot.structures[0],snapshot.structures[0]]},{...snapshot,structures:[{...snapshot.structures[0],type:'invented'}]},{...snapshot,core:NaN}])assert.equal(sanitizeDefense(bad),null);
});
test('Jev receives three bounded choices and answers cannot invent actions or budget',()=>{
  const body=buildCommanderRequest(snapshot);assert.deepEqual(Object.keys(body.questions),['sector','composition','objective']);assert.equal(body.state.budget,14);
  assert.equal(parseCommanderAnswer(answer).sector,'south');assert.equal(parseCommanderAnswer({answers:{...answer.answers,sector:{type:'choice',choice:'teleport',confidence:1}}}),null);
});
test('AI off never fetches and keeps the classic same-budget plan',async()=>{
  const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('must not call');};
  try{const r=res();await handler({method:'POST',headers:{},body:{...snapshot,provider:'off'}},r);assert.equal(calls,0);assert.equal(r.data.source,'off');assert.equal(r.data.budget,14);assert.equal(r.data.composition,'balanced');}finally{globalThis.fetch=original;}
});
test('real provider attribution requires a validated response, with credentials only on server',async()=>{
  const original=globalThis.fetch,saved=process.env.TYPESAFE_API_KEY;process.env.TYPESAFE_API_KEY='test-commander-key';let sent;
  globalThis.fetch=async(url,options)=>{sent={url,options};return {ok:true,json:async()=>answer};};
  try{const r=res();await handler({method:'POST',headers:{'x-forwarded-for':'commander-valid'},body:{...snapshot,provider:'typesafe'}},r);assert.equal(r.data.source,'typesafe');assert.equal(r.data.composition,'armor');assert.equal(r.data.budget,14);assert.equal(JSON.parse(sent.options.body).state.defenses[0].sector,'north');assert.equal(sent.options.headers.Authorization,'Bearer test-commander-key');assert.ok(!JSON.stringify(r.data).includes('test-commander-key'));}finally{globalThis.fetch=original;if(saved===undefined)delete process.env.TYPESAFE_API_KEY;else process.env.TYPESAFE_API_KEY=saved;}
});
test('missing keys yield an explicit adaptive fallback without another paid provider',async()=>{
  const saved=process.env.TYPESAFE_API_KEY,original=globalThis.fetch;delete process.env.TYPESAFE_API_KEY;let calls=0;globalThis.fetch=async()=>{calls++;throw Error();};
  try{const r=res();await handler({method:'POST',headers:{},body:{...snapshot,provider:'typesafe'}},r);assert.equal(r.data.source,'fallback');assert.equal(r.data.reason,'missing_token');assert.equal(calls,0);}finally{globalThis.fetch=original;if(saved!==undefined)process.env.TYPESAFE_API_KEY=saved;}
});
test('commander endpoint rejects cross-origin calls and malformed payloads',async()=>{
  const r=res();await handler({method:'POST',headers:{origin:'https://other.test',host:'game.test'},body:snapshot},r);assert.equal(r.statusCode,403);
  const invalid=res();await handler({method:'POST',headers:{},body:'{'},invalid);assert.equal(invalid.statusCode,400);
});
test('Qwen adapter validates the same three decisions and keeps the game budget',async()=>{
  const saved=process.env.HF_TOKEN,original=globalThis.fetch;process.env.HF_TOKEN='hf_commander_test';let sent;
  globalThis.fetch=async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{message:{content:'{"sector":"east","composition":"swarm","objective":"core","budget":9999}'}}]})};};
  try{const r=res();await handler({method:'POST',headers:{'x-forwarded-for':'commander-hf'},body:{...snapshot,provider:'huggingface'}},r);assert.equal(r.data.source,'huggingface');assert.equal(r.data.budget,14);assert.equal(r.data.sector,'east');assert.equal(JSON.parse(sent.messages[1].content).defenses[0].type,'laser');assert.ok(!JSON.stringify(r.data).includes('hf_commander_test'));}finally{globalThis.fetch=original;if(saved===undefined)delete process.env.HF_TOKEN;else process.env.HF_TOKEN=saved;}
});
