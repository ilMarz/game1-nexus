import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleAudio,SWORD_SAMPLES,SOUND_TYPES,synthesizeEffect,volumeGain} from '../rts-audio.js';
import {readFile} from 'node:fs/promises';
import {SiegeBattle} from '../rts-sim.js';
function fakeContext(){
  const param=()=>({value:0,setTargetAtTime(value){this.value=value;}}),node=()=>({connect(){},disconnect(){}});
  return {currentTime:0,sampleRate:22050,state:'suspended',destination:{},sources:[],pans:[],resume(){this.state='running';return Promise.resolve();},createGain(){return {...node(),gain:param()};},createDynamicsCompressor(){return {...node(),...Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,param()]))};},createBuffer(channels,length,rate){return {length,sampleRate:rate,copyToChannel(data){this.data=data;}};},createStereoPanner(){const p={...node(),pan:param()};this.pans.push(p);return p;},createBufferSource(){const s={...node(),playbackRate:param(),start(){this.started=true;},stop(){this.stopped=true;}};this.sources.push(s);return s;}};
}
test('all original sound buffers contain finite audible samples, fade out and leave headroom',()=>{
  for(const type of SOUND_TYPES){const pcm=synthesizeEffect(type);let sum=0,peak=0;for(const value of pcm){assert.ok(Number.isFinite(value));sum+=value*value;peak=Math.max(peak,Math.abs(value));}assert.ok(Math.sqrt(sum/pcm.length)>.004,type);assert.ok(peak<.8,type);assert.equal(Math.abs(pcm[0]),0);assert.equal(Math.abs(pcm.at(-1)),0);}
  assert.notDeepEqual(synthesizeEffect('clash',1),synthesizeEffect('clash',2));assert.equal(volumeGain(0),0);assert.ok(volumeGain(.1)<volumeGain(.7)&&volumeGain(.7)<volumeGain(1));
});
test('audio initializes only on unlock, respects mute/volume, and persists preferences',async()=>{
  const c=fakeContext();let creations=0,saved;const audio=new BattleAudio({contextFactory:()=>{creations++;return c;},storage:{getItem:()=>null,setItem:(k,value)=>saved=JSON.parse(value)}});assert.equal(creations,0);assert.equal(audio.play({type:'clash'}),false);assert.ok(await audio.unlock());assert.equal(creations,1);assert.ok(audio.play({type:'clash',x:100}));assert.ok(c.pans[0].pan.value<0);audio.setEnabled(false);assert.equal(audio.active.size,0);assert.equal(audio.master.gain.value,0);assert.equal(audio.play({type:'ram'}),false);assert.equal(saved.enabled,false);audio.setEnabled(true);audio.setVolume(0);assert.equal(audio.play({type:'ready'}),false);assert.equal(saved.volume,0);
});
test('dense combat is bounded, important feedback retains capacity, and finished voices disconnect',async()=>{
  const c=fakeContext(),audio=new BattleAudio({contextFactory:()=>c});await audio.unlock();for(let i=0;i<30;i++){c.currentTime+=.1;audio.play({type:'clash'});}assert.equal(audio.active.size,8);assert.ok(audio.play({type:'alert'}));assert.ok(audio.play({type:'collapse'}));assert.equal(audio.active.size,10);c.currentTime+=.3;assert.ok(audio.play({type:'win'}));assert.equal(audio.active.size,10);const source=c.sources.at(-1);source.onended();source.onended();assert.equal(audio.active.size,9);audio.stop();assert.equal(audio.active.size,0);
});

test('bundled sword recordings load once and replace synthetic melee buffers without playing by themselves',async()=>{
  const c=fakeContext(),requests=[];
  c.decodeAudioData=async bytes=>({recorded:true,bytes});
  const audio=new BattleAudio({contextFactory:()=>c,random:()=>0,fetcher:async url=>{
    requests.push(url);const bytes=await readFile(new URL('../public'+url,import.meta.url));
    assert.equal(bytes.subarray(0,4).toString(),'OggS');
    return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
  }});
  await audio.unlock();assert.ok(await audio.loadSwordSounds());await audio.unlock();
  assert.deepEqual(requests,SWORD_SAMPLES);assert.equal(c.sources.length,0);
  assert.ok(audio.play({type:'clash'}));assert.equal(c.sources.at(-1).buffer.recorded,true);
  audio.stop();assert.equal(audio.active.size,0);
});

test('failed sword sample requests retain audible local fallback without blocking unlock',async()=>{
  const c=fakeContext();c.decodeAudioData=async()=>{throw Error('decode failed');};
  const audio=new BattleAudio({contextFactory:()=>c,fetcher:async()=>({ok:false})});
  assert.ok(await audio.unlock());assert.equal(await audio.loadSwordSounds(),false);
  assert.ok(audio.play({type:'clash'}));assert.ok(c.sources.at(-1).buffer.data.some(v=>Math.abs(v)>.01));
});

test('sword impacts remain audible when ranged combat has occupied the combat voices',async()=>{
  const c=fakeContext(),audio=new BattleAudio({contextFactory:()=>c});await audio.unlock();
  for(let i=0;i<8;i++){c.currentTime+=.1;assert.ok(audio.play({type:'arrow'}));}
  assert.ok(audio.play({type:'clash'}));assert.equal(audio.active.size,8);
  assert.equal(c.sources.at(-1).effectType,'clash');assert.ok(c.sources.some(s=>s.effectType==='arrow'&&s.stopped));
});
test('paused, hidden and muted events are drained without replay on resume or restart',async()=>{
  const c=fakeContext(),audio=new BattleAudio({contextFactory:()=>c}),battle={audioEvents:[{type:'ram'}]};await audio.unlock();audio.consume(battle,{paused:true});assert.equal(battle.audioEvents.length,0);assert.equal(c.sources.length,0);audio.consume(battle);assert.equal(c.sources.length,0);battle.audioEvents.push({type:'clash'});audio.consume(battle);assert.equal(audio.active.size,1);audio.consume(battle,{hidden:true});assert.equal(audio.active.size,0);assert.equal(audio.master.gain.value,0);
});
test('missing browser audio and blocked preference storage fail gracefully',async()=>{
  const audio=new BattleAudio({contextFactory:()=>{throw Error('unavailable');},storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});assert.equal(await audio.unlock(),false);assert.equal(audio.supported,false);audio.setVolume(.4);audio.setEnabled(false);assert.equal(audio.play({type:'order'}),false);
});
test('battle attacks emit weapon-specific effects and destruction sounds exactly on death',()=>{
  const b=new SiegeBattle();b.units=[];b.buildings=[];const sword=b.spawn('infantry','blue',100,100),bow=b.spawn('archer','blue',100,100),ram=b.spawn('ram','blue',100,100),foe=b.spawn('infantry','red',100,100),tower=b.addBuilding('tower','red',100,100);b.damage(sword,foe);assert.equal(b.audioEvents.at(-1).type,'clash');b.damage(bow,foe);assert.equal(b.audioEvents.at(-1).type,'arrow');tower.hp=10;b.damage(ram,tower);assert.deepEqual(b.audioEvents.slice(-2).map(e=>e.type),['ram','collapse']);for(let i=0;i<200;i++)b.audioEvent('clash');assert.equal(b.audioEvents.length,96);
});
test('training, capture and the battle ending produce event-based feedback rather than per-frame repeats',()=>{
  const b=new SiegeBattle();b.units=[];b.nextWave=10000;b.train('infantry');b.spawn('infantry','blue',600,225).order={mode:'hold'};b.phase='combat';for(let i=0;i<103;i++)b.tick(.05);assert.equal(b.audioEvents.filter(e=>e.type==='start').length,1);assert.equal(b.audioEvents.filter(e=>e.type==='ready').length,1);assert.equal(b.audioEvents.filter(e=>e.type==='capture').length,1);b.audioEvents=[];b.buildings.find(e=>e.team==='red'&&e.type==='keep').hp=0;b.tick(.05);b.tick(.05);assert.equal(b.audioEvents.filter(e=>e.type==='win').length,1);
});
