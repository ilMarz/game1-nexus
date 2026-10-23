import {tacticFor} from './tactics.js';

const LOOKS={
  assault:{nebula:0xe6a36d,stars:0x99735c,glows:[[.5,.02,2.5],[.5,1.05,1.6]]},
  flank:{nebula:0xb48eff,stars:0x8368b7,glows:[[-.05,.45,2.7],[1.05,.45,2.7]]},
  barrage:{nebula:0xed6889,stars:0x995565,glows:[[.3,.12,2.2],[.8,.7,2.2]]},
  relief:{nebula:0x77d9b4,stars:0x558c81,glows:[[.2,.8,2.8],[.85,.2,2.8]]}
};
export function blendColor(from,to,amount){
  const t=Math.max(0,Math.min(1,amount));
  const channel=shift=>Math.round(((from>>shift)&255)*(1-t)+((to>>shift)&255)*t);
  return (channel(16)<<16)|(channel(8)<<8)|channel(0);
}

// Cosmetic layers only: no physics bodies, timers, model calls or gameplay state.
export class StrategyVisuals {
  constructor(scene,{width,height,nebula,stars,dust,reduced=false}){
    Object.assign(this,{scene,width,height,nebula,stars,dust,reduced});
    if(!scene.textures.exists('strategy-glow')){
      const stamp=scene.add.graphics();
      for(let r=120;r>0;r-=4)stamp.fillStyle(0xffffff,.018).fillCircle(128,128,r);
      stamp.generateTexture('strategy-glow',256,256);stamp.destroy();
    }
    this.glows=[0,1].map(()=>scene.add.image(0,0,'strategy-glow').setDepth(-80).setBlendMode('ADD').setAlpha(0));
    this.previousLayer=scene.add.graphics().setDepth(-60);
    this.layer=scene.add.graphics().setDepth(-59);
    this.transitionLayer=scene.add.graphics().setDepth(3);
    this.tint=0x759be3;this.starTint=0x6b7198;this.key=null;this.age=0;this.transition=1;
  }
  activate(key,{immediate=false}={}){
    if(!LOOKS[key])key='assault';
    if(key===this.key&&!immediate)return;
    this.previous=this.key;this.fromTint=this.tint;this.fromStars=this.starTint;
    this.key=key;this.age=0;this.transition=immediate||this.reduced?1:0;
    this.update(0);
  }
  update(dt){
    if(!this.key)return;
    this.age+=this.reduced?0:dt;this.transition=Math.min(1,this.transition+dt/.85);
    const mix=1-Math.pow(1-this.transition,3),look=LOOKS[this.key],t=tacticFor(this.key);
    this.tint=blendColor(this.fromTint,look.nebula,mix);this.starTint=blendColor(this.fromStars,look.stars,mix);
    this.nebula?.setTint(this.tint).setAlpha(.57);this.stars.setTint(this.starTint);
    this.dust?.setParticleTint(blendColor(0x759be3,t.color,mix));
    for(let i=0;i<2;i++){
      const [x,y,scale]=look.glows[i];
      this.glows[i].setPosition(x*this.width,y*this.height).setScale(scale*2.4).setTint(t.color).setAlpha(.44*mix);
    }
    if(this.previous&&this.transition<1){this.draw(this.previousLayer,this.previous,this.age);this.previousLayer.setAlpha(1-mix);}
    else this.previousLayer.clear();
    this.draw(this.layer,this.key,this.age);this.layer.setAlpha(mix);
    const pulse=this.transitionLayer.clear();
    if(this.transition<1&&!this.reduced){
      // One expanding outline, never a full-screen flash or camera shake.
      pulse.lineStyle(3,t.color,(1-this.transition)*.45).strokeEllipse(this.width/2,this.height/2,this.width*this.transition*1.7,this.height*this.transition*1.7);
    }
  }
  draw(g,key,time){
    const w=this.width,h=this.height,c=tacticFor(key).color;
    g.clear();
    // Soft edge bands leave the middle clear for ships and projectiles.
    for(let i=0;i<4;i++){
      const inset=i*18;g.lineStyle(18,c,.018+i*.006).strokeRect(inset,inset,w-inset*2,h-inset*2);
    }
    g.lineStyle(2,c,.5);
    for(const x of [20,w-20])for(const y of [20,h-20]){
      const dx=x<w/2?1:-1,dy=y<h/2?1:-1;
      g.lineBetween(x,y,x+dx*90,y).lineBetween(x,y,x,y+dy*65);
    }
    if(key==='assault'){
      // A descending amber corridor and sweeping horizontal scanners.
      for(let i=0;i<7;i++){
        const top=w*.08+i*w*.14,bottom=w*.36+i*w*.047;
        g.lineStyle(1,c,.12).lineBetween(top,0,bottom,h);
      }
      for(let i=0;i<4;i++){
        const y=(i*h/4+time*55)%h;
        g.fillStyle(c,.035).fillRect(0,y,w,24);g.lineStyle(1,c,.2).lineBetween(0,y,w,y);
      }
      for(let x=20;x<w;x+=52)g.lineStyle(5,c,.42).lineBetween(x,10,x+18,28);
    }else if(key==='flank'){
      // Mirrored half-rings and converging streaks distinguish the two flanks.
      for(const side of [-1,1]){
        const x=side<0?-80:w+80;
        for(let i=0;i<4;i++){
          const r=160+i*100+(time*32)%100;
          g.lineStyle(i===0?3:1,c,.24-i*.035).strokeEllipse(x,h*.47,r*2,r*2.3);
        }
        for(let i=0;i<8;i++){
          const y=110+i*88,travel=(time*70+i*33)%180;
          const start=side<0?travel:w-travel;
          g.lineStyle(2,c,.22).lineBetween(start,y,start-side*65,y+side*12);
        }
      }
      g.lineStyle(1,c,.1).lineBetween(w/2,0,w/2,h);
    }else if(key==='barrage'){
      // Angular fire-control grid and rotating reticles, all below gameplay.
      for(let x=0;x<w;x+=120)g.lineStyle(1,c,.08).lineBetween(x,0,x,h);
      for(let y=0;y<h;y+=120)g.lineBetween(0,y,w,y);
      for(const [x,y] of [[w*.68,h*.32],[w*.25,h*.7]]){
        g.lineStyle(2,c,.22).strokeCircle(x,y,86).strokeCircle(x,y,102);
        for(let i=0;i<4;i++){
          const a=time*.18+i*Math.PI/2;
          g.lineBetween(x+Math.cos(a)*70,y+Math.sin(a)*70,x+Math.cos(a)*122,y+Math.sin(a)*122);
        }
      }
      for(let y=80;y<h-80;y+=46)for(const x of [14,w-28])g.fillStyle(c,.45).fillRect(x,y,14,20);
    }else{
      // Broad, slow aurora ribbons and gentle rings instead of a combat grid.
      for(let i=0;i<5;i++){
        g.lineStyle(14+i*3,c,.025);
        g.beginPath();
        for(let x=0;x<=w;x+=24){
          const y=h*(.22+i*.13)+Math.sin(x/w*5+time*.12+i*.7)*65;
          if(x===0)g.moveTo(x,y);else g.lineTo(x,y);
        }
        g.strokePath();
      }
      for(let i=0;i<3;i++)g.lineStyle(1.5,c,.13).strokeEllipse(w*.7,h*.5,260+i*150+Math.sin(time*.3)*18,220+i*130);
    }
  }
}
