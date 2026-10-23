import Phaser from 'phaser';
import {StrategyVisuals} from './strategy-visuals.js';
import {tacticFor} from './tactics.js';

const W=1440,H=900,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const descriptions={assault:'Scansioni ambra e corridoi di attacco dall’alto.',flank:'Onde e scie viola convergono dai due fianchi.',barrage:'Una griglia rossa e reticoli di tiro segnalano la pressione nemica.',relief:'Aurora verde e anelli lenti accompagnano la tregua.'};
class Preview extends Phaser.Scene {
  preload(){
    const files={nebula:'orion-nebula.jpg',stars:'Backgrounds/darkPurple.png',spark:'PNG/Effects/star3.png',player:'PNG/playerShip2_blue.png',enemy:'PNG/Enemies/enemyRed3.png',shield:'PNG/Effects/shield3.png',power:'PNG/Power-ups/powerupGreen_bolt.png'};
    for(const [key,path] of Object.entries(files))this.load.image(key,'/assets/'+path);
  }
  create(){
    const stars=this.add.tileSprite(W/2,H/2,W,H,'stars').setDepth(-100).setAlpha(.65);
    const nebula=this.add.image(W*.6,H*.43,'nebula').setDisplaySize(W*1.3,H*1.3).setDepth(-99);
    this.visuals=new StrategyVisuals(this,{width:W,height:H,nebula,stars,reduced});
    this.player=this.add.image(W*.55,H*.66,'player').setScale(.85).setDepth(10);
    this.add.image(this.player.x,this.player.y,'shield').setScale(.9).setAlpha(.25).setTint(0x73dcff).setDepth(11);
    this.ships=Array.from({length:6},()=>this.add.image(0,0,'enemy').setScale(.7).setDepth(7));
    this.cores=Array.from({length:3},(_,i)=>this.add.image(W*(.6+i*.13),H*(.44+i*.13),'power').setScale(.7).setDepth(6));
    this.markers=this.add.graphics().setDepth(4);this.clock=0;
    this.scale.on('resize',()=>this.fit());this.fit();
    for(const button of document.querySelectorAll('[data-tactic]'))button.addEventListener('click',()=>this.select(button.dataset.tactic));
    this.select('assault',true);
  }
  fit(){this.cameras.main.setViewport(0,0,this.scale.width,this.scale.height).setZoom(Math.min(this.scale.width/W,this.scale.height/H)).centerOn(W/2,H/2);}
  select(key,immediate=false){
    this.key=key;this.visuals.activate(key,{immediate});
    const t=tacticFor(key);document.body.style.setProperty('--strategy-color',t.css);
    document.getElementById('previewName').textContent=t.name;
    document.getElementById('previewDescription').textContent=descriptions[key];
    for(const button of document.querySelectorAll('[data-tactic]'))button.setAttribute('aria-pressed',String(button.dataset.tactic===key));
    this.ships.forEach((ship,i)=>{
      const x=key==='flank'?(i%2?W*.88:W*.12):W*(.32+(i%3)*.23),y=key==='flank'?H*(.22+Math.floor(i/2)*.22):H*(.16+Math.floor(i/3)*.18);
      ship.setPosition(x,y).setRotation(Math.atan2(this.player.y-y,this.player.x-x)-Math.PI/2).setVisible(key!=='relief'||i<2);
    });
    this.cores.forEach(core=>core.setVisible(key==='relief'));
  }
  update(_,delta){
    if(!this.visuals)return;const dt=Math.min(delta/1000,.04);this.clock+=reduced?0:dt;this.visuals.update(dt);
    const g=this.markers.clear(),c=tacticFor(this.key).color;
    for(const ship of this.ships){
      if(!ship.visible)continue;
      g.lineStyle(2,c,.65).strokeCircle(ship.x,ship.y,37);
      if(this.key==='barrage'){
        g.lineStyle(1.5,c,.3).lineBetween(ship.x,ship.y,this.player.x,this.player.y);
        const phase=(this.clock*.55+ship.x/W)%1;
        g.fillStyle(0xff687c,1).fillCircle(ship.x+(this.player.x-ship.x)*phase,ship.y+(this.player.y-ship.y)*phase,4);
      }
    }
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'previewGame',backgroundColor:'#080d1b',width:W,height:H,scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%'},scene:[Preview],audio:{noAudio:true}});
