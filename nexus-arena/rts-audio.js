// Bundled CC0 sword recordings, with local synthesis for other effects and fallback.
export const SWORD_SAMPLES=[1,3,5].map(n=>`/assets/audio/swords/sword-clash-${n}.ogg`);
export const SOUND_TYPES=['clash','arrow','ram','collapse','fall','ready','build','capture','alert','order','start','win','lose'];
const lengths={clash:.38,arrow:.34,ram:.72,collapse:1.35,fall:.32,ready:.62,build:.4,capture:1.05,alert:1.1,order:.14,start:1.2,win:1.8,lose:1.6};
const tau=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function synthesizeEffect(type,seed=1,rate=22050){
  if(!SOUND_TYPES.includes(type))throw new Error('Unknown effect');
  const samples=new Float32Array(Math.ceil(lengths[type]*rate));let state=seed>>>0,low=0,body=0;
  const tuning=1+(seed%7-3)*.012;
  // Damped, inharmonic modes give struck metal/wood a material identity.
  const strike=(t,start,f,decay,level=.3,metal=false)=>{
    const age=t-start;if(age<0)return 0;
    return [1,metal?2.756:1.58,metal?5.404:2.13].reduce((v,ratio,i)=>v+Math.sin(tau*f*tuning*ratio*age)*Math.exp(-age*decay*(1+i*.65))/(1+i*2),0)*Math.min(1,age*900)*level;
  };
  const horn=(t,start,f,duration,level=.22)=>{
    const age=t-start;if(age<0||age>duration)return 0;
    const envelope=Math.min(1,age/.07,(duration-age)/.16),phase=tau*f*tuning*(age+.00065*Math.sin(tau*4.7*age));
    return (Math.sin(phase)+.3*Math.sin(phase*2)+.16*Math.sin(phase*3)+.07*Math.sin(phase*5))*envelope*level;
  };
  for(let i=0;i<samples.length;i++){
    const t=i/rate;state=(Math.imul(state,1664525)+1013904223)>>>0;const noise=state/2147483648-1;
    low+=(1-Math.exp(-tau*1050/rate))*(noise-low);body+=(1-Math.exp(-tau*180/rate))*(noise-body);const high=low-body;let value=0;
    if(type==='clash')value=strike(t,0,720,16,.28,true)+strike(t,.012,1190,24,.13,true)+high*.65*Math.exp(-t*65);
    if(type==='arrow')value=strike(t,0,185,38,.22)+high*.7*Math.sin(Math.PI*Math.min(1,t/.18))**2*Math.exp(-t*19)+strike(t,.19,125,38,.19);
    if(type==='ram')value=Math.sin(tau*(58*t+1.2*(1-Math.exp(-t*24))))*.52*Math.exp(-t*9)+strike(t,.008,103,12,.27)+body*1.7*Math.exp(-t*14)+high*.36*Math.exp(-t*45);
    if(type==='collapse')for(const start of [0,.06,.15,.27,.44,.65,.89])if(t>=start){const age=t-start;value+=(body*.9+high*.23)*Math.exp(-age*8)*Math.min(1,age*350)+strike(t,start,48+start*71,10,.17);}
    if(type==='fall')value=strike(t,0,72,22,.29)+body*.9*Math.exp(-t*20)+high*.12*Math.exp(-t*16);
    if(type==='build')value=strike(t,0,230,32,.3)+strike(t,.15,310,30,.22)+high*.25*(Math.exp(-t*65)+(t>.15?Math.exp(-(t-.15)*65):0));
    if(type==='order')value=strike(t,0,460,50,.18)+strike(t,.042,690,55,.08);
    if(type==='ready')value=strike(t,0,587,7,.19,true)+strike(t,.13,880,9,.14,true);
    if(type==='capture')value=horn(t,0,196,.43,.17)+horn(t,.35,294,.65,.18)+strike(t,0,98,16,.18);
    if(type==='alert')value=horn(t,0,146.83,.33,.23)+horn(t,.46,146.83,.55,.23);
    if(type==='start')value=horn(t,0,196,.38,.2)+horn(t,.4,261.63,.7,.22)+strike(t,0,65,12,.22)+strike(t,.4,65,12,.2);
    if(type==='win')value=horn(t,0,196,.42,.18)+horn(t,.33,246.94,.42,.18)+horn(t,.66,293.66,.95,.2)+horn(t,.93,392,.7,.12);
    if(type==='lose')value=horn(t,0,196,.5,.17)+horn(t,.43,174.61,.5,.17)+horn(t,.86,130.81,.65,.2);
    const fade=Math.min(1,t*600,(samples.length-1-i)/Math.max(1,rate*.02));samples[i]=Math.tanh(value)*.8*Math.max(0,fade);
  }
  return samples;
}
export function volumeGain(volume){return volume<=0?0:10**((-34+30*clamp(volume,0,1))/20);}
export class BattleAudio{
  constructor({contextFactory,storage,random=Math.random,fetcher=url=>globalThis.fetch(url)}={}){
    this.factory=contextFactory||(()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)());this.supported=!!contextFactory||!!(globalThis.AudioContext||globalThis.webkitAudioContext);this.storage=storage;this.random=random;this.enabled=true;this.volume=.7;this.paused=false;this.active=new Set();this.buffers=new Map();this.last=new Map();
    this.fetcher=fetcher;this.swordLoad=null;
    try{const saved=JSON.parse(storage?.getItem('terre-audio')||'null');if(typeof saved?.enabled==='boolean')this.enabled=saved.enabled;if(Number.isFinite(saved?.volume))this.volume=clamp(saved.volume,0,1);}catch{}
  }
  async unlock(){
    if(!this.supported||!this.enabled)return false;
    try{
      if(!this.context){const c=this.context=this.factory();this.master=c.createGain();this.combat=c.createGain();this.ui=c.createGain();const limiter=c.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=12;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.12;this.combat.gain.value=.7;this.ui.gain.value=.55;this.combat.connect(limiter);this.ui.connect(limiter);limiter.connect(this.master);this.master.connect(c.destination);this.applyVolume();}
      if(this.context.state==='suspended')await this.context.resume();
      if(this.context.state==='running')void this.loadSwordSounds();
      return this.context.state==='running';
    }catch{this.supported=false;return false;}
  }
  loadSwordSounds(){
    if(!this.context?.decodeAudioData)return Promise.resolve(false);
    if(!this.swordLoad)this.swordLoad=Promise.allSettled(SWORD_SAMPLES.map(async(url,index)=>{
      const response=await this.fetcher(url);if(!response.ok)throw Error('Sword sample unavailable');
      const buffer=await this.context.decodeAudioData(await response.arrayBuffer());
      this.buffers.set(`clash:${index}`,buffer);
    })).then(results=>results.some(result=>result.status==='fulfilled'));
    return this.swordLoad;
  }
  save(){try{this.storage?.setItem('terre-audio',JSON.stringify({enabled:this.enabled,volume:this.volume}));}catch{}}
  applyVolume(){if(this.master)this.master.gain.setTargetAtTime(this.enabled&&!this.paused?volumeGain(this.volume):0,this.context.currentTime,.015);}
  setEnabled(value){this.enabled=!!value;if(!this.enabled)this.stop();this.applyVolume();this.save();}
  setVolume(value){if(!Number.isFinite(value))return;this.volume=clamp(value,0,1);if(!this.volume)this.stop();this.applyVolume();this.save();}
  setPaused(value){if(this.paused===!!value)return;this.paused=!!value;if(this.paused)this.stop();this.applyVolume();}
  stop(){for(const source of [...this.active]){try{source.stop();}catch{}source.onended?.();}this.last.clear();}
  play(event){
    const c=this.context;if(!this.enabled||this.paused||!this.volume||c?.state!=='running'||!SOUND_TYPES.includes(event.type))return false;
    const combat=['clash','arrow','ram','fall'].includes(event.type),cooldown=combat ? .065 : .18;
    if(c.currentTime-(this.last.get(event.type)??-Infinity)<cooldown)return false;
    if(combat&&this.active.size>=8){
      const replace=event.type==='clash'&&[...this.active].find(s=>s.combatVoice&&s.effectType!=='clash');
      if(!replace)return false;replace.stop();replace.onended();
    }
    if(this.active.size>=10){const voice=[...this.active].find(s=>s.combatVoice);if(combat||!voice)return false;voice.stop();voice.onended();}
    this.last.set(event.type,c.currentTime);const variation=Math.floor(this.random()*3),key=`${event.type}:${variation}`;
    if(!this.buffers.has(key)){const data=synthesizeEffect(event.type,variation+1,c.sampleRate),buffer=c.createBuffer(1,data.length,c.sampleRate);buffer.copyToChannel(data,0);this.buffers.set(key,buffer);}
    const source=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner();source.combatVoice=combat;source.effectType=event.type;source.buffer=this.buffers.get(key);source.playbackRate.value=.95+this.random()*.1;gain.gain.value=event.type==='alert' ? .7 : 1;pan.pan.value=clamp(((event.x??600)/600-1)*.65,-.65,.65);source.connect(gain);gain.connect(pan);pan.connect(combat?this.combat:this.ui);let cleaned=false;source.onended=()=>{if(cleaned)return;cleaned=true;source.disconnect();gain.disconnect();pan.disconnect();this.active.delete(source);};this.active.add(source);source.start();return true;
  }
  consume(battle,{paused=false,hidden=false}={}){
    this.setPaused(paused||hidden);const events=battle.audioEvents.splice(0);
    // Important feedback gets a voice before a dense burst of sword impacts.
    const priority=type=>type==='clash'?1:['arrow','fall'].includes(type)?2:0;
    events.sort((a,b)=>priority(a.type)-priority(b.type));
    for(const event of events)this.play(event);
  }
}
