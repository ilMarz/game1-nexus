import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isLimitEnabled,gateGameHtml,limitPage} from '../server/game-access.js';
import director from '../api/director.js';
import commander from '../api/commander.js';
import warlord from '../api/warlord.js';

test('the game is available by default; ON and true enable the limit',()=>{
  for(const value of [undefined,'','false','OFF','0'])assert.equal(isLimitEnabled({ENABLE_LIMIT:value}),false);
  for(const value of ['ON','on',' On ','true','TRUE',' true '])assert.equal(isLimitEnabled({ENABLE_LIMIT:value}),true);
});

test('limited pages contain only the notice and no game scripts or controls',()=>{
  const html='<html><body><button>Gioca</button><script src="/rts-game.js"></script></body></html>';
  assert.equal(gateGameHtml(html,{}),html);
  assert.equal(gateGameHtml(html,{ENABLE_LIMIT:'false'}),html);
  assert.equal(gateGameHtml(html,{ENABLE_LIMIT:'ON'}),limitPage);
  assert.match(limitPage,/<h1>Limite JEV raggiunto<\/h1>/);
  assert.doesNotMatch(limitPage,/<script|<button|<canvas/);
});

test('all game APIs block even local mode before processing or fetching; disabling the flag restores access',async()=>{
  const saved=process.env.ENABLE_LIMIT,originalFetch=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;throw Error('limited APIs must not contact Jev');};
  const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(data){this.data=data;return this;}});
  try{
    process.env.ENABLE_LIMIT='true';
    for(const handler of [director,commander,warlord]){
      const res=response();await handler({method:'POST',headers:{},body:{provider:'off'}},res);
      assert.equal(res.statusCode,503);assert.equal(res.data.error,'jev_limit_reached');assert.equal(res.headers['Cache-Control'],'no-store');
    }
    assert.equal(calls,0);
    process.env.ENABLE_LIMIT='false';
    for(const handler of [director,commander,warlord]){
      const res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.statusCode,405);
    }
  }finally{
    globalThis.fetch=originalFetch;if(saved===undefined)delete process.env.ENABLE_LIMIT;else process.env.ENABLE_LIMIT=saved;
  }
});
