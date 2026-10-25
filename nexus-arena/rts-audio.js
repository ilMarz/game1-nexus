// Original procedural effects: no downloads, tracking, or external audio service.
export const SOUND_TYPES=['clash','arrow','ram','collapse','fall','ready','build','capture','alert','order','start','win','lose'];
const lengths={clash:.23,arrow:.3,ram:.48,collapse:.85,fall:.22,ready:.55,build:.28,capture:.75,alert:.85,order:.09,start:.7,win:1.15,lose:.9};
const tau=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function synthesizeEffect(type,seed=1,rate=22050){
  if(!SOUND_TYPES.includes(type))throw new Error('Unknown effect');
  const samples=new Float32Array(Math.ceil(lengths[type]*rate));let state=seed>>>0,low=0,last=0;
  const note=(t,start,f,decay,level=.3)=>t<start?0:Math.sin(tau*f*(t-start))*Math.exp(-(t-start)*decay)*Math.min(1,(t-start)*250)*level;
  for(let i=0;i<samples.length;i++){
    const t=i/rate;state=(Math.imul(state,1664525)+1013904223)>>>0;const noise=state/2147483648-1;low+=.09*(noise-low);const high=noise-last;last=noise;let value=0;
    if(type==='clash')value=(high*.18+Math.sin(tau*(1320+seed%70)*t)*.24+Math.sin(tau*2173*t)*.16+Math.sin(tau*3531*t)*.07)*Math.exp(-t*27);
    if(type==='arrow')value=(Math.sin(tau*238*t)*.3+Math.sin(tau*476*t)*.1)*Math.exp(-t*32)+high*.1*Math.exp(-t*55)+(t>.11?(low*.65+Math.sin(tau*380*(t-.11))*.16)*Math.exp(-(t-.11)*32):0);
    if(type==='ram')value=Math.sin(tau*(76*t-30*t*t))*.55*Math.exp(-t*10)+low*.8*Math.exp(-t*14)+Math.sin(tau*183*t)*.2*Math.exp(-t*23);
    if(type==='collapse')for(const start of [0,.07,.17,.29,.43])if(t>=start)value+=(low*.65+Math.sin(tau*(90+start*170)*(t-start))*.17)*Math.exp(-(t-start)*12);
    if(type==='fall')value=(low*.75+Math.sin(tau*83*t)*.3)*Math.exp(-t*24);
    if(type==='build')value=(Math.sin(tau*310*t)*.26+low*.6)*Math.exp(-t*35)+(t>.1?(Math.sin(tau*415*(t-.1))*.2+low*.4)*Math.exp(-(t-.1)*35):0);
    if(type==='order')value=Math.sin(tau*340*t)*.18*Math.exp(-t*65)+high*.035*Math.exp(-t*100);
    if(type==='ready')value=note(t,0,660,9,.21)+note(t,.09,880,10,.18);
    if(type==='capture')value=note(t,0,392,9)+note(t,.12,494,9)+note(t,.24,587,9);
    if(type==='alert'||type==='start')for(const start of [0,.29]){const f=type==='alert'?147:196;if(t>start){const age=t-start;value+=(Math.sin(tau*f*age)*.24+Math.sin(tau*f*3*age)*.07)*Math.min(1,age*35)*Math.exp(-age*10);}}
    if(type==='win')value=note(t,0,392,8)+note(t,.14,494,8)+note(t,.28,587,7)+note(t,.46,784,6);
    if(type==='lose')value=note(t,0,220,7)+note(t,.19,175,7)+note(t,.39,131,7);
    const fade=Math.min(1,t*600,(samples.length-1-i)/Math.max(1,rate*.02));samples[i]=Math.tanh(value)*.8*Math.max(0,fade);
  }
  return samples;
}
export function volumeGain(volume){return volume<=0?0:10**((-34+30*clamp(volume,0,1))/20);}
export class BattleAudio{
  constructor({contextFactory,storage,random=Math.random}={}){
    this.factory=contextFactory||(()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)());this.supported=!!contextFactory||!!(globalThis.AudioContext||globalThis.webkitAudioContext);this.storage=storage;this.random=random;this.enabled=true;this.volume=.7;this.paused=false;this.active=new Set();this.buffers=new Map();this.last=new Map();
    try{const saved=JSON.parse(storage?.getItem('terre-audio')||'null');if(typeof saved?.enabled==='boolean')this.enabled=saved.enabled;if(Number.isFinite(saved?.volume))this.volume=clamp(saved.volume,0,1);}catch{}
  }
  async unlock(){
    if(!this.supported||!this.enabled)return false;
    try{
      if(!this.context){const c=this.context=this.factory();this.master=c.createGain();this.combat=c.createGain();this.ui=c.createGain();const limiter=c.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=12;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.12;this.combat.gain.value=.7;this.ui.gain.value=.55;this.combat.connect(limiter);this.ui.connect(limiter);limiter.connect(this.master);this.master.connect(c.destination);this.applyVolume();}
      if(this.context.state==='suspended')await this.context.resume();return this.context.state==='running';
    }catch{this.supported=false;return false;}
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
    if(c.currentTime-(this.last.get(event.type)??-Infinity)<cooldown||combat&&this.active.size>=8)return false;
    if(this.active.size>=10){const voice=[...this.active].find(s=>s.combatVoice);if(combat||!voice)return false;voice.stop();voice.onended();}
    this.last.set(event.type,c.currentTime);const variation=Math.floor(this.random()*3),key=`${event.type}:${variation}`;
    if(!this.buffers.has(key)){const data=synthesizeEffect(event.type,variation+1,c.sampleRate),buffer=c.createBuffer(1,data.length,c.sampleRate);buffer.copyToChannel(data,0);this.buffers.set(key,buffer);}
    const source=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner();source.combatVoice=combat;source.buffer=this.buffers.get(key);source.playbackRate.value=.95+this.random()*.1;gain.gain.value=event.type==='alert' ? .7 : 1;pan.pan.value=clamp(((event.x??600)/600-1)*.65,-.65,.65);source.connect(gain);gain.connect(pan);pan.connect(combat?this.combat:this.ui);let cleaned=false;source.onended=()=>{if(cleaned)return;cleaned=true;source.disconnect();gain.disconnect();pan.disconnect();this.active.delete(source);};this.active.add(source);source.start();return true;
  }
  consume(battle,{paused=false,hidden=false}={}){
    this.setPaused(paused||hidden);const events=battle.audioEvents.splice(0);
    // Important feedback gets a voice before a dense burst of sword impacts.
    events.sort((a,b)=>Number(['clash','arrow','fall'].includes(a.type))-Number(['clash','arrow','fall'].includes(b.type)));
    for(const event of events)this.play(event);
  }
}
