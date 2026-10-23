import Phaser from 'phaser';
import {PauseState} from './pause-state.js';
import {GameInput} from './game-input.js';
import {headingToCenter,gunMount} from './ship-aim.js';
import './style.css';
import './enhancements.css';
import './pause.css';
import './director.css';

const $ = id => document.getElementById(id);
const W=1440,H=900;
let play, soundOn=false, runId=0, aiRequest=null, aiRevision=0;
let selectedProvider='auto';
try{const saved=localStorage.getItem('nexus-ai-provider');if(['off','auto','typesafe','huggingface'].includes(saved))selectedProvider=saved;}catch{}
$('aiProvider').value=selectedProvider;
let best=0; try { best=Number(localStorage.getItem('nexus-best')||0); } catch {}
const coarse=matchMedia('(pointer:coarse)').matches;
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const touch={x:0,y:0};
const debugControls=new URLSearchParams(location.search).has('debugControls');
let movementDebug;
if(debugControls){movementDebug=document.createElement('output');movementDebug.id='movementDebug';Object.assign(movementDebug.style,{position:'absolute',top:'50px',left:'20px',zIndex:'3',color:'#b7fa74',background:'#080f18',padding:'8px',font:'12px monospace',pointerEvents:'none'});$('arena').append(movementDebug);}
let noticeTimer;
function focusGame(){game.canvas.focus({preventScroll:true});}
function clearControls(){touch.x=touch.y=0;stickId=null;$('stickThumb').style.transform='';controls.clear();}
const pauseState=new PauseState((paused,automatic)=>{
  play.paused=paused;
  play.player.setVelocity(0);
  $('pauseOverlay').hidden=!paused;
  $('pause').textContent=paused?'▶':'Ⅱ';
  $('pause').setAttribute('aria-label',paused?'Riprendi partita':'Pausa');
  if(paused){
    clearControls();play.physics.pause();play.tweens.pauseAll();play.exhaust.stop();
    $('pauseHint').textContent=automatic?'Il gioco ha perso il focus. Premi WASD, le frecce o Riprendi per continuare.':'Premi P o Riprendi per continuare la missione.';
    $('notice').classList.remove('visible');
    if(!automatic)$('resume').focus({preventScroll:true});
  }else{play.physics.resume();play.tweens.resumeAll();play.exhaust.start();focusGame();}
  play.hud();
});
function notice(message){$('notice').textContent=message;$('notice').classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').classList.remove('visible'),3500);}
function bestText(){ $('best').textContent=`RECORD ${String(best).padStart(5,'0')}`; } bestText();
function fixedDirector(){
  if(play){play.tactic='assault';play.aiNext=Infinity;play.hud();}
  $('aiState').textContent='AI OFF · ASSALTO FISSO';$('aiState').title='Nessuna chiamata API. Nemici con comportamento programmato e tattica di assalto fissa.';
  $('director').textContent='MODALITÀ CLASSICA · ASSALTO FISSO';$('aiButton').disabled=true;
}
if(selectedProvider==='off')fixedDirector();

class Arena extends Phaser.Scene {
  constructor(){super('Arena');}
  preload(){
    const a='/assets/';
    this.load.image('nebula',a+'orion-nebula.jpg');
    const files={player:'PNG/playerShip2_blue.png',enemy:'PNG/Enemies/enemyRed3.png',interceptor:'PNG/Enemies/enemyBlack2.png',heavy:'PNG/Enemies/enemyRed5.png',boss:'PNG/ufoRed.png',laser:'PNG/Lasers/laserBlue01.png',redLaser:'PNG/Lasers/laserRed01.png',meteor:'PNG/Meteors/meteorGrey_big1.png',meteor2:'PNG/Meteors/meteorBrown_big3.png',power:'PNG/Power-ups/powerupGreen_bolt.png',shield:'PNG/Effects/shield3.png',flame:'PNG/Effects/fire16.png',spark:'PNG/Effects/star3.png',stars:'Backgrounds/darkPurple.png'};
    Object.entries(files).forEach(([key,path])=>this.load.image(key,a+path));
    for(let i=0;i<20;i++)this.load.image('fire'+i,a+`PNG/Effects/fire${String(i).padStart(2,'0')}.png`);
    ['laser1','laser2','lose','shieldDown','shieldUp','twoTone','zap'].forEach(key=>this.load.audio(key,a+`Bonus/sfx_${key}.ogg`));
    this.load.on('loaderror',file=>{console.error('Asset failed',file.src);notice('Errore caricamento grafica: ricarica la pagina.');});
  }
  create(){
    play=this;
    this.running=false;this.paused=false;this.elapsed=0;this.hp=100;this.score=0;this.kills=0;this.cores=0;this.nextFire=0;this.nextSpawn=0;this.dashReady=0;this.empReady=0;this.invincible=0;this.dashing=0;this.wave=1;this.tactic='assault';this.aiNext=8;this.bossSpawned=false;this.bossDefeated=false;this.serial=0;this.distanceMoved=0;this.lastMove=new Phaser.Math.Vector2(0,-1);
    this.bg=this.add.tileSprite(W/2,H/2,W,H,'stars').setTint(0x6b7198).setAlpha(.65).setDepth(-100);
    if(this.textures.exists('nebula'))this.add.image(W*.6,H*.43,'nebula').setDisplaySize(W*1.3,H*1.3).setAlpha(.42).setTint(0x759be3).setDepth(-99);
    this.decor=[];
    for(let i=0;i<18;i++){
      const m=this.add.image(Phaser.Math.Between(-80,W+80),Phaser.Math.Between(-80,H+80),i%2?'meteor':'meteor2').setScale(Phaser.Math.FloatBetween(.12,.65)).setAlpha(Phaser.Math.FloatBetween(.15,.45)).setDepth(-20);
      m.spin=Phaser.Math.FloatBetween(-.15,.15);m.drift=Phaser.Math.FloatBetween(6,25);this.decor.push(m);
    }
    this.starDust=this.add.particles(0,0,'spark',{x:{min:0,max:W},y:-10,lifespan:9000,speedY:{min:60,max:150},speedX:0,frequency:100,scale:{start:.06,end:.01},alpha:{start:.4,end:0},blendMode:'ADD'}).setDepth(-10);
    this.enemies=this.physics.add.group();this.bullets=this.physics.add.group({maxSize:150,defaultKey:'laser'});this.hostile=this.physics.add.group({maxSize:180,defaultKey:'redLaser'});this.pickups=this.physics.add.group();
    this.player=this.physics.add.sprite(W*.5,H*.7,'player').setScale(.67).setDepth(10).setCollideWorldBounds(true);
    this.player.body.setSize(48,48).setOffset(31,15);
    this.physics.world.setBounds(30,65,W-60,H-195);
    this.exhaust=this.add.particles(0,0,'flame',{lifespan:220,speed:{min:15,max:55},angle:{min:75,max:105},scale:{start:.35,end:0},alpha:{start:.9,end:0},frequency:22,blendMode:'ADD'}).setDepth(8);
    this.shield=this.add.image(this.player.x,this.player.y,'shield').setScale(.72).setTint(0x73dcff).setAlpha(.25).setDepth(11);
    this.bursts=this.add.particles(0,0,'spark',{lifespan:{min:180,max:500},speed:{min:60,max:260},scale:{start:.3,end:0},alpha:{start:1,end:0},emitting:false,blendMode:'ADD',maxParticles:350}).setDepth(30);
    this.anims.create({key:'explosion',frames:Array.from({length:20},(_,i)=>({key:'fire'+i})),frameRate:35,hideOnComplete:true});
    game.canvas.tabIndex=0;
    game.canvas.setAttribute('aria-label','Arena: usa WASD o le frecce per muovere la navicella.');
    game.canvas.addEventListener('pointerdown',focusGame);
    this.physics.add.overlap(this.bullets,this.enemies,(bullet,enemy)=>{if(!bullet.active||!enemy.active)return;bullet.disableBody(true,true);this.hitEnemy(enemy,1);});
    this.physics.add.overlap(this.player,this.enemies,(_,enemy)=>{if(!this.running||this.paused)return;this.damage(18);if(enemy.kind!=='boss')this.hitEnemy(enemy,2);});
    this.physics.add.overlap(this.player,this.hostile,(_,bullet)=>{if(!this.running||this.paused)return;bullet.disableBody(true,true);this.damage(12);});
    this.physics.add.overlap(this.player,this.pickups,(_,p)=>{if(!this.running||this.paused||!p.active)return;p.destroy();this.cores++;this.score+=75;this.hp=Math.min(100,this.hp+7);this.fx(this.player.x,this.player.y,0xb7fa74,12);this.sfx('shieldUp',.15);if(this.cores===4||this.cores===10)notice('ARMI POTENZIATE · '+(this.cores===4?'DOPPIO':'TRIPLO')+' LASER');});
    this.previewShips=[];
    for(let i=0;i<5;i++){const ship=this.add.image(930+i%3*130,240+Math.floor(i/3)*175,'enemy').setScale(.8).setAngle(145+i*8).setAlpha(.8);this.tweens.add({targets:ship,y:ship.y+30,duration:2200+i*250,yoyo:true,repeat:-1,ease:'Sine.inOut'});this.previewShips.push(ship);}
    this.hero=this.add.image(1040,500,'player').setScale(1.7).setRotation(-.38).setDepth(5);
    this.heroShield=this.add.image(1040,500,'shield').setScale(1.7).setAlpha(.3).setTint(0x4de8ff);
    this.tweens.add({targets:[this.hero,this.heroShield],y:480,duration:2400,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    this.player.setVisible(false);this.shield.setVisible(false);this.exhaust.stop();
    $('start').disabled=false;$('start').innerHTML='Inizia la missione <span>↗</span>';
    this.input.on('pointerdown',pointer=>{if(this.running&&!this.paused&&coarse&&pointer.x>W*.4)this.emp();});
    this.scale.on('resize',()=>this.fitWorld());this.fitWorld();
  }
  fitWorld(){this.cameras.main.setViewport(0,0,this.scale.width,this.scale.height);this.cameras.main.setZoom(Math.min(this.scale.width/W,this.scale.height/H));this.cameras.main.centerOn(W/2,H/2);}
  start(){
    aiRequest?.abort();aiRequest=null;
    pauseState.reset();clearControls();$('pauseOverlay').hidden=true;$('pause').setAttribute('aria-label','Pausa');
    this.serial=++runId;this.running=true;this.paused=false;this.elapsed=0;this.hp=100;this.score=0;this.kills=0;this.cores=0;this.nextFire=0;this.nextSpawn=1;this.dashReady=0;this.empReady=0;this.invincible=1.5;this.dashing=0;this.wave=1;this.tactic='assault';this.aiNext=7;this.bossSpawned=false;this.bossDefeated=false;this.distanceMoved=0;
    [this.enemies,this.pickups].forEach(g=>g.clear(true,true));[this.bullets,this.hostile].forEach(g=>g.getChildren().forEach(b=>{if(b)b.disableBody(true,true)}));
    this.previewShips.forEach(s=>s.setVisible(false));this.hero.setVisible(false);this.heroShield.setVisible(false);this.player.enableBody(true,W/2,H*.7,true,true);this.player.setAlpha(1);this.player.setRotation(0);this.shield.setVisible(true);this.exhaust.start();this.physics.resume();
    $('overlay').classList.add('hidden');$('touchControls').classList.add('playing');$('pause').textContent='Ⅱ';$('objective').textContent='SOPRAVVIVI · ELIMINA NEXUS';$('aiState').textContent='DIRETTORE LOCALE';this.sound.setMute(!soundOn);this.sfx('twoTone',.3);notice('ONDATA 01 · CONTATTO NEMICO');this.hud();focusGame();if(selectedProvider==='off')fixedDirector();
  }
  sfx(key,volume=.2){if(soundOn&&this.cache.audio.exists(key))this.sound.play(key,{volume});}
  fx(x,y,tint,count=15){this.bursts.setParticleTint(tint);this.bursts.explode(count,x,y);}
  explosion(x,y,big=false){const boom=this.add.sprite(x,y,'fire0').setDepth(20).setScale(big?4:1.7).setBlendMode(Phaser.BlendModes.ADD);boom.play('explosion');boom.once('animationcomplete',()=>boom.destroy());this.fx(x,y,big?0xffad6b:0x90e9ff,big?40:14);if(!reduced)this.cameras.main.shake(big?220:65,big?.007:.0015);}
  shoot(group,x,y,angle,speed,enemy=false){const b=group.get(x,y,enemy?'redLaser':'laser');if(!b)return;b.enableBody(true,x,y,true,true);b.setTexture(enemy?'redLaser':'laser').setScale(enemy?.85:.8).setRotation(angle+Math.PI/2).setDepth(9);b.body.setSize(8,22);b.life=2.3;b.setVelocity(Math.cos(angle)*speed,Math.sin(angle)*speed);}
  spawn(kind){
    if(this.enemies.countActive()>26)return;
    const side=this.tactic==='flank'?Phaser.Math.RND.pick(['left','right']):'top';
    const x=side==='left'?25:side==='right'?W-25:Phaser.Math.Between(100,W-100),y=side==='top'?35:Phaser.Math.Between(130,380);
    const e=this.enemies.create(x,y,kind==='heavy'?'heavy':kind==='interceptor'?'interceptor':'enemy').setScale(kind==='heavy'?.85:.65).setDepth(7);
    e.kind=kind;e.hp=kind==='heavy'?5:kind==='interceptor'?2:3;e.fireAt=this.elapsed+Phaser.Math.FloatBetween(1,3);e.phase=Math.random()*6.28;e.born=this.elapsed;
    e.body.setSize(54,42).setOffset(20,20);
    this.fx(x,y,0xff5c78,8);
  }
  spawnBoss(){this.bossSpawned=true;const e=this.enemies.create(W/2,100,'boss').setScale(2.6).setDepth(8);e.kind='boss';e.hp=100;e.maxHp=100;e.fireAt=this.elapsed+1.7;e.phase=0;e.born=this.elapsed;e.body.setSize(60,50).setOffset(15,15);this.boss=e;notice('NEXUS È QUI · DISTRUGGI IL NUCLEO');this.sfx('twoTone',.5);}
  hitEnemy(e,damage){
    if(!e.active)return;e.hp-=damage;this.fx(e.x,e.y,0x93e9ff,4);
    e.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);this.time.delayedCall(55,()=>{if(e.active)e.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);});
    if(e.hp>0)return;const {x,y}=e;const boss=e.kind==='boss';e.destroy();this.kills++;this.score+=boss?2500:100;this.explosion(x,y,boss);this.sfx('zap',boss?.45:.12);
    if(boss){this.bossDefeated=true;if(this.elapsed>=90)this.end(true);else notice('NEXUS DISTRUTTO · RESISTI FINO ALL’ESTRAZIONE');}
    if(!boss&&this.kills%2===0){const p=this.pickups.create(x,y,'power').setScale(.85).setDepth(6);p.body.setSize(28,28);p.life=12;p.setVelocityY(35);this.tweens.add({targets:p,angle:360,duration:4000,repeat:-1});}
  }
  damage(amount){if(this.invincible>0||!this.running)return;this.hp=Math.max(0,this.hp-amount);this.invincible=.95;this.sfx('shieldDown',.3);this.fx(this.player.x,this.player.y,0xff5577,20);if(!reduced)this.cameras.main.shake(170,.005);if(this.hp<=0)this.end(false);}
  dash(){if(!this.running||this.paused||this.elapsed<this.dashReady)return;this.dashing=.18;this.dashReady=this.elapsed+2.4;this.invincible=Math.max(this.invincible,.25);this.sfx('laser2',.15);this.fx(this.player.x,this.player.y,0x6ce7ef,18);}
  emp(){if(!this.running||this.paused||this.elapsed<this.empReady)return;this.empReady=this.elapsed+8;const ring=this.add.image(this.player.x,this.player.y,'shield').setScale(.4).setTint(0x6ce7ef).setAlpha(.8).setDepth(25).setBlendMode(Phaser.BlendModes.ADD);this.tweens.add({targets:ring,scale:6,alpha:0,duration:600,onComplete:()=>ring.destroy()});this.hostile.getChildren().forEach(b=>{if(b?.active&&Phaser.Math.Distance.Between(b.x,b.y,this.player.x,this.player.y)<340)b.disableBody(true,true)});[...this.enemies.getChildren()].forEach(e=>{if(Phaser.Math.Distance.Between(e.x,e.y,this.player.x,this.player.y)<340)this.hitEnemy(e,e.kind==='boss'?12:6)});this.sfx('twoTone',.35);if(!reduced)this.cameras.main.shake(120,.004);}
  end(win){if(!this.running)return;this.running=false;this.physics.pause();this.exhaust.stop();this.player.setVelocity(0);if(!win)this.explosion(this.player.x,this.player.y,true);best=Math.max(best,this.score);try{localStorage.setItem('nexus-best',best)}catch{}bestText();$('overlay').classList.remove('hidden');$('touchControls').classList.remove('playing');document.querySelector('.intro-label').innerHTML='<span></span> '+(win?'TRASMISSIONE COMPLETATA':'SEGNALE INTERROTTO');document.querySelector('h1').innerHTML=win?'Sei ancora<br>qui<span>.</span>':'Non è<br>finita<span>.</span>';document.querySelector('.intro p').textContent=`${win?'NEXUS è distrutto. Missione compiuta.':'La flotta NEXUS ha avuto la meglio.'} ${this.score} punti · ${this.kills} nemici · ${Math.floor(this.elapsed)} secondi.`;$('start').innerHTML='Riprova la missione <span>↗</span>';this.sfx(win?'twoTone':'lose',.4);this.hud();}
  hud(){
    $('tacticState').textContent='TATTICA: '+({assault:'ASSALTO',flank:'LATERALE',barrage:'RAFFICA',relief:'TREGUA'}[this.tactic]||'ASSALTO');
    if(movementDebug){const input=controls.movement(touch);movementDebug.textContent=`NAVICELLA x=${this.player.x.toFixed(1)} y=${this.player.y.toFixed(1)} | ROT=${Phaser.Math.RadToDeg(this.player.rotation).toFixed(1)}° | INPUT x=${input.x.toFixed(2)} y=${input.y.toFixed(2)} | ${this.paused?'PAUSA':'ATTIVO'}`;}
    $('health').style.width=this.hp+'%';$('health').style.background=this.hp<30?'#ff657e':'#b7fa74';$('healthText').textContent=Math.ceil(this.hp);$('score').textContent=String(this.score).padStart(5,'0');const remain=Math.max(0,Math.ceil(90-this.elapsed));$('timer').textContent=String(Math.floor(remain/60)).padStart(2,'0')+':'+String(remain%60).padStart(2,'0');$('wave').textContent=this.boss?.active?`NEXUS ${Math.ceil(this.boss.hp)}%`:`ONDATA 0${Math.min(3,this.wave)}`;$('dashMeter').style.width=Phaser.Math.Clamp(1-(this.dashReady-this.elapsed)/2.4,0,1)*100+'%';$('empMeter').style.width=Phaser.Math.Clamp(1-(this.empReady-this.elapsed)/8,0,1)*100+'%';
  }
  update(_,delta){
    const dt=Math.min(delta/1000,.04);
    if(this.paused)return;
    this.bg.tilePositionY-=dt*14;this.decor.forEach(m=>{m.y+=m.drift*dt;m.rotation+=m.spin*dt;if(m.y>H+80){m.y=-80;m.x=Math.random()*W;}});
    if(!this.running)return;
    this.elapsed+=dt;this.invincible=Math.max(0,this.invincible-dt);this.dashing=Math.max(0,this.dashing-dt);
    const {x:dx,y:dy}=controls.movement(touch);if(Math.hypot(dx,dy)>.1){this.lastMove.set(dx,dy).normalize();this.distanceMoved+=dt*340;}
    if(controls.consume('dash'))this.dash();if(controls.consume('emp'))this.emp();
    if(this.dashing>0)this.player.setVelocity(this.lastMove.x*1000,this.lastMove.y*1000);else this.player.setVelocity(dx*340,dy*340);
    this.player.rotation=headingToCenter(this.player.x,this.player.y,W/2,H/2,this.player.rotation);
    this.player.setAlpha(this.invincible>.3?(Math.floor(this.elapsed*16)%2?.55:1):1);
    this.exhaust.setPosition(this.player.x-Math.sin(this.player.rotation)*24,this.player.y+Math.cos(this.player.rotation)*24);
    const exhaustAngle=Phaser.Math.RadToDeg(this.player.rotation)+90;this.exhaust.setEmitterAngle({min:exhaustAngle-15,max:exhaustAngle+15});
    this.shield.setPosition(this.player.x,this.player.y).setAlpha(this.invincible>0?.6:.1+Math.sin(this.elapsed*3)*.03);
    if(this.elapsed>this.nextFire){this.nextFire=this.elapsed+(this.cores>=10?.14:.19);const angles=this.cores>=10?[-.12,0,.12]:this.cores>=4?[-.045,.045]:[0];angles.forEach(a=>{const mount=gunMount(this.player.x,this.player.y,this.player.rotation,angles.length===2?(a<0?-13:13):0);this.shoot(this.bullets,mount.x,mount.y,mount.angle+a,820);});this.sfx('laser1',.055);}
    if(this.elapsed>this.nextSpawn&&this.elapsed<94){this.nextSpawn=this.elapsed+Math.max(.45,1.35-this.elapsed*.009)*(this.tactic==='relief'?1.55:1);this.spawn(this.elapsed>32&&Math.random()<.3?'heavy':this.tactic==='flank'||Math.random()<.3?'interceptor':'scout');}
    const wave=1+Math.floor(Math.min(89,this.elapsed)/30);if(wave!==this.wave){this.wave=wave;notice(`ONDATA 0${wave} · ${wave===2?'LA FLOTTA SI AVVICINA':'ULTIMA LINEA DI DIFESA'}`);this.sfx('twoTone',.25);}
    if(this.elapsed>=65&&!this.bossSpawned)this.spawnBoss();
    for(const e of [...this.enemies.getChildren()]){
      if(!e.active)continue;
      let tx=this.player.x,ty=this.player.y;
      if(e.kind==='boss'){tx=W/2+Math.sin(this.elapsed*.7)*380;ty=165;e.setVelocity((tx-e.x)*1.6,(ty-e.y)*1.5);e.rotation=Math.sin(this.elapsed)*.13;}
      else {if(e.kind==='interceptor'){tx+=Math.sin(this.elapsed*2+e.phase)*150;ty-=110;}if(e.kind==='heavy')ty=Math.min(this.player.y-250,400);const a=Math.atan2(ty-e.y,tx-e.x);const dist=Phaser.Math.Distance.Between(e.x,e.y,tx,ty);const speed=(e.kind==='heavy'?55:e.kind==='interceptor'?125:85)*(1+this.elapsed*.003);e.setVelocity(dist>20?Math.cos(a)*speed:0,dist>20?Math.sin(a)*speed:0);e.rotation=Phaser.Math.Angle.Wrap(a-Math.PI/2);}
      if(this.elapsed>e.fireAt){e.fireAt=this.elapsed+(e.kind==='boss'?.85:e.kind==='heavy'?1.5:3.2)*(this.tactic==='barrage'?.7:1);const a=Math.atan2(this.player.y-e.y,this.player.x-e.x);if(e.kind==='boss'){for(let j=-3;j<=3;j++)this.shoot(this.hostile,e.x,e.y,a+j*.2,190,true);}else this.shoot(this.hostile,e.x,e.y,a,180+this.wave*18,true);}
      if(e.y>H+100||e.x<-150||e.x>W+150)e.destroy();
    }
    [this.bullets,this.hostile].forEach(group=>group.getChildren().forEach(b=>{if(!b?.active)return;b.life-=dt;if(b.life<=0||b.x<0||b.x>W||b.y<0||b.y>H)b.disableBody(true,true)}));
    this.pickups.getChildren().forEach(p=>{if(!p?.active)return;p.life-=dt;if(p.life<=0)p.destroy();else if(Phaser.Math.Distance.Between(p.x,p.y,this.player.x,this.player.y)<130)this.physics.moveToObject(p,this.player,230);});
    if(this.elapsed>=90){if(this.bossDefeated)this.end(true);else{$('objective').textContent='DISTRUGGI NEXUS PER FUGGIRE';if(this.elapsed>150)this.end(false);}}
    if(selectedProvider!=='off'&&this.elapsed>=this.aiNext){this.aiNext=this.elapsed+24;requestDirector();}
    this.hud();
  }
}

const controls=new GameInput({target:window,enabled:()=>!!play?.running,onMovement:()=>pauseState.movementPressed(),onPause:togglePause});
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#080d1b',width:W,height:H,input:{keyboard:false},scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%'},render:{antialias:true,roundPixels:false},physics:{default:'arcade',arcade:{gravity:{x:0,y:0},debug:false}},audio:{disableWebAudio:false},scene:[Arena]});

async function requestDirector(){
  if(selectedProvider==='off'){fixedDirector();return;}
  if(aiRequest||!play?.running||play.paused)return;
  const request=new AbortController();aiRequest=request;
  const serial=play.serial,revision=aiRevision;
  const timeout=setTimeout(()=>request.abort(),10000);
  $('aiState').textContent='NEXUS STA VALUTANDO';
  try{
    const result=await fetch('/api/director',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:selectedProvider,elapsed:Math.floor(play.elapsed),health:Math.ceil(play.hp),kills:play.kills,cores:play.cores,movement:Math.round(play.distanceMoved/Math.max(1,play.elapsed)),enemies:play.enemies.countActive()}),signal:request.signal});
    const data=await result.json();
    if(!play.running||play.serial!==serial||revision!==aiRevision)return;
    if(['huggingface','typesafe'].includes(data.source)&&['assault','flank','barrage','relief'].includes(data.tactic)){
      if(!play.paused)play.tactic=data.tactic;
      $('aiState').textContent=data.source==='typesafe'?'JEV ATTIVO':'HUGGING FACE ATTIVO';
      $('aiState').title=`${data.source==='typesafe'?'Jev':'Qwen'} · ${data.latencyMs??'?'} ms`+(Number.isFinite(data.confidence)?` · confidenza ${Math.round(data.confidence*100)}%`:'');
      $('director').textContent='NEXUS: '+data.message;notice(data.message);
    } else {
      const provider=data.provider==='typesafe'?'TYPESAFE':'HF';
      const labels={missing_token:provider+'_KEY DA CONFIGURARE',insufficient_credits:provider+' · CREDITO ESAURITO',invalid_token:provider+' · CHIAVE NON VALIDA',rate_limited:'AI · LIMITE RICHIESTE'};
      $('aiState').textContent=labels[data.reason]||'DIRETTORE LOCALE · API NON DISPONIBILE';
      if(data.reason==='missing_token')$('aiState').textContent=data.provider==='typesafe'?'TYPESAFE_API_KEY DA CONFIGURARE':'HF_TOKEN DA CONFIGURARE';
      if(play.hp<30)play.tactic='relief';else play.tactic=['assault','flank','barrage'][Math.floor(play.elapsed/24)%3];
    }
  }catch{if(play?.running&&play.serial===serial&&revision===aiRevision)$('aiState').textContent='DIRETTORE LOCALE · API NON DISPONIBILE';}
  finally{clearTimeout(timeout);if(aiRequest===request)aiRequest=null;}
}
function togglePause(){if(play?.running)pauseState.toggle();}
$('start').addEventListener('click',()=>{if(play){play.tweens.resumeAll();play.start();}});
$('pause').addEventListener('click',togglePause);
$('resume').addEventListener('click',()=>pauseState.resume());
$('sound').addEventListener('click',()=>{soundOn=!soundOn;game.sound.setMute(!soundOn);$('sound').textContent='Audio '+(soundOn?'ON':'OFF');$('sound').setAttribute('aria-label',soundOn?'Disattiva audio':'Attiva audio');$('sound').setAttribute('aria-pressed',String(soundOn));if(soundOn)play?.sfx('twoTone',.25);});
$('aiProvider').addEventListener('change',()=>{
  selectedProvider=$('aiProvider').value;aiRevision++;aiRequest?.abort();aiRequest=null;
  try{localStorage.setItem('nexus-ai-provider',selectedProvider);}catch{}
  if(selectedProvider==='off'){fixedDirector();if(play?.running){notice('AI disattivata · assalto fisso, nessuna chiamata API.');focusGame();}return;}
  $('aiButton').disabled=false;
  if(play)play.tactic='assault';
  $('director').textContent='NEXUS OSSERVA. NUOVA TATTICA IN ATTESA.';
  $('aiState').textContent='DIRETTORE SELEZIONATO';
  if(play?.running){play.aiNext=play.elapsed+.2;notice('Direttore aggiornato: nuova tattica in arrivo.');focusGame();}
  else notice('Direttore selezionato. Avvia la missione per provarlo.');
});
$('aiButton').addEventListener('click',()=>{if(play?.running&&!play.paused){play.aiNext=play.elapsed+24;requestDirector();}else notice('Avvia o riprendi la missione per interrogare il direttore.');});
$('touchDash').addEventListener('pointerdown',e=>{e.preventDefault();play?.dash()});$('touchEmp').addEventListener('pointerdown',e=>{e.preventDefault();play?.emp()});
const stick=$('stick');let stickId=null;
function moveStick(e){if(e.pointerId!==stickId)return;const r=stick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,l=Math.hypot(x,y),f=Math.min(l,35)/Math.max(1,l);touch.x=x*f/35;touch.y=y*f/35;$('stickThumb').style.transform=`translate(${x*f}px,${y*f}px)`;}
stick.addEventListener('pointerdown',e=>{e.preventDefault();stickId=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);});stick.addEventListener('pointermove',moveStick);['pointerup','pointercancel','lostpointercapture'].forEach(event=>stick.addEventListener(event,()=>{stickId=null;touch.x=touch.y=0;$('stickThumb').style.transform='';}));
function pauseForFocus(){clearControls();if(play?.running)pauseState.pause(true);}
window.addEventListener('blur',pauseForFocus);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseForFocus();});
window.addEventListener('error',e=>{console.error(e.error);if(!play)notice('Impossibile avviare il motore: prova a ricaricare.');});
