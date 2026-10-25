import {W,H,PASSAGES,ZONES,CLIFFS} from './rts-terrain.js';

// Original, deterministic artwork. Geometry is shared with the simulation.
export function drawTerrain(scene){
  const name='valley-painted';if(scene.textures.exists(name))scene.textures.remove(name);
  const texture=scene.textures.createCanvas(name,W,H),c=texture.context;
  let seed=7391;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
  const ellipse=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
  const path=(points,width,color)=>{c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
  const gradient=c.createLinearGradient(0,0,W,H);gradient.addColorStop(0,'#82915c');gradient.addColorStop(.47,'#758552');gradient.addColorStop(1,'#a09661');c.fillStyle=gradient;c.fillRect(0,0,W,H);
  for(let i=0;i<5500;i++){const x=random()*W,y=random()*H;ellipse(x,y,2+random()*24,1+random()*9,['#d3ce9620','#374e3012','#e5d39b18','#526a3916'][i%4]);}
  // A road network makes the strategic approaches readable without a grid.
  for(const p of PASSAGES){const points=[[155,380],[300,380],[465,p.y],[735,p.y],[900,380],[1045,380]];const width=p.kind==='ford'?15:p.kind==='ruins'?21:35;path(points,width+12,'#61704355');path(points,width,'#b6a77a');path(points,width*.6,'#c3b28766');}
  path([[170,540],[230,380],[230,245]],23,'#b3a376');path([[1030,540],[970,380],[970,245]],23,'#b3a376');
  // The escarpments cast shadows below raised, grass-covered plateaus.
  for(const z of ZONES.filter(z=>z.kind==='hill')){
    ellipse(z.x+10,z.y+18,z.rx+7,z.ry+3,'#35452925');ellipse(z.x,z.y+13,z.rx,z.ry,'#817957');
    for(let i=0;i<4;i++){ellipse(z.x,z.y+10-i*4,z.rx-i*4,z.ry-i*3,['#938968','#a19a72','#a9a578','#a2ad73'][i]);}
    const grd=c.createRadialGradient(z.x-18,z.y-22,8,z.x,z.y,z.rx);grd.addColorStop(0,'#a8b17a');grd.addColorStop(1,'#8c9c64');ellipse(z.x,z.y-7,z.rx-9,z.ry-8,grd);
    for(let i=0;i<95;i++){const a=random()*Math.PI*2,r=Math.sqrt(random());ellipse(z.x+Math.cos(a)*(z.rx-12)*r,z.y-7+Math.sin(a)*(z.ry-12)*r,2+random()*8,1+random()*3,i%2?'#d8d59a18':'#536c3a16');}
    c.strokeStyle='#e2dca331';c.lineWidth=1;for(let j=0;j<2;j++){c.beginPath();c.ellipse(z.x,z.y+3-j*6,z.rx-j*8,z.ry-j*5,0,.1,Math.PI-.1);c.stroke();}
    for(let i=0;i<30;i++){const a=random()*Math.PI,x=z.x+Math.cos(a)*(z.rx-2),y=z.y+14+Math.sin(a)*z.ry;ellipse(x,y,3+random()*4,2,'#665f4644');}
  }
  const river=c.createLinearGradient(545,0,655,0);river.addColorStop(0,'#758d78');river.addColorStop(.15,'#477e82');river.addColorStop(.5,'#386b78');river.addColorStop(.85,'#50878a');river.addColorStop(1,'#859c80');
  c.fillStyle='#435e3c';c.fillRect(540,0,120,H);c.fillStyle='#a8a47a';c.fillRect(545,0,110,H);c.fillStyle=river;c.fillRect(550,0,100,H);
  for(let i=0;i<380;i++){const x=553+random()*94,y=random()*H;path([[x,y],[x+3,y+2],[x+8+random()*12,y]],.7,'#c5dfcf33');}
  for(let i=0;i<150;i++){const x=i%2?547-random()*6:652+random()*7,y=random()*H;ellipse(x,y,2+random()*6,2+random()*4,'#8f9774');}
  for(const p of PASSAGES){
    const y=p.y,half=p.half;
    if(p.kind==='ford'){
      const grd=c.createLinearGradient(550,0,650,0);grd.addColorStop(0,'#aab691');grd.addColorStop(.5,'#82aa9a');grd.addColorStop(1,'#aab691');c.fillStyle=grd;c.fillRect(547,y-half,106,half*2);
      for(let i=0;i<55;i++){const x=550+random()*100,dy=y-half+random()*half*2;ellipse(x+1,dy+2,3+random()*4,2,'#416c6444');ellipse(x,dy,2+random()*4,1.5,'#cac6a0aa');}
      for(const x of [532,663])for(let i=0;i<9;i++)path([[x+i*2,y+half+8],[x+i*2-3,y+half-9-random()*12]],1.5,'#889758');
    }else if(p.kind==='ruins'){
      c.fillStyle='#46584f66';c.fillRect(534,y-half+7,135,half*2);
      for(let x=538;x<668;x+=17){c.fillStyle=x%3?'#b9b59b':'#aaa88e';c.fillRect(x,y-half+4+(x%3)*2,15,half*2-7);c.strokeStyle='#666c5b';c.lineWidth=1;c.strokeRect(x,y-half+4+(x%3)*2,15,half*2-7);}
      for(const x of [535,660]){c.fillStyle='#8a8d76';c.fillRect(x-6,y-half-5,16,12);c.fillRect(x-4,y+half-5,19,15);}
    }else{
      c.fillStyle='#293e3766';c.fillRect(528,y-half+9,151,half*2+6);
      c.fillStyle=p.kind==='stone'?'#9c9f87':'#826c49';c.fillRect(528,y-half,144,half*2);
      if(p.kind==='stone')for(let row=0;row<6;row++)for(let col=0;col<9;col++){c.fillStyle=['#c8c7ac','#bdbc9f','#b0b398'][(row+col)%3];c.fillRect(531+col*16+(row%2)*3,y-half+3+row*14,14,12);}
      else for(let x=531;x<672;x+=10){c.fillStyle=x%3?'#c2aa78':'#b69b6b';c.fillRect(x,y-half+3,8,half*2-6);path([[x+2,y-half+5],[x+3,y+half-5]],.5,'#735e4355');}
      for(const dy of [-half,half]){c.fillStyle=p.kind==='stone'?'#e0d9b7':'#9a8258';c.fillRect(525,y+dy-4,150,7);c.fillStyle='#57604a';c.fillRect(525,y+dy+3,150,3);for(let x=526;x<677;x+=29){c.fillStyle=p.kind==='stone'?'#b0b298':'#6e6147';c.fillRect(x,y+dy-9,9,16);c.fillStyle='#d7ccaa';c.fillRect(x-1,y+dy-10,11,4);}}
    }
  }
  function tree(x,y,r){
    ellipse(x+10,y+12,r*.9,r*.42,'#1d382526');path([[x,y+9],[x-1,y-15]],5,'#6c5e3e');
    const shades=['#415f38','#4b683a','#567240','#647f44'];
    for(let i=0;i<6;i++){const a=i*2.4,tx=x+Math.cos(a)*r*.38,ty=y-r*.55+Math.sin(a)*r*.3;ellipse(tx+2,ty+5,r*.65,r*.58,'#334f2c');ellipse(tx-2,ty-1,r*.65,r*.6,shades[i%4]);ellipse(tx-6,ty-7,r*.36,r*.28,'#83965344');}
  }
  for(const z of ZONES.filter(z=>z.kind==='forest')){
    ellipse(z.x,z.y,z.rx,z.ry,'#3f603d55');for(let i=0;i<32;i++){const a=random()*Math.PI*2,r=Math.sqrt(random());tree(z.x+Math.cos(a)*z.rx*r,z.y+Math.sin(a)*z.ry*r,12+random()*9);}
  }
  for(let i=0;i<170;i++){const x=random()*W,y=random()*H;if((y<52||y>715||x<52||x>1150)&&Math.abs(x-600)>85)tree(x,y,13+random()*14);}
  for(const rock of CLIFFS){const {x,y,radius:r}=rock;ellipse(x+9,y+12,r+5,r*.65,'#34492f44');c.fillStyle='#797e6a';c.beginPath();c.moveTo(x-r,y+9);c.lineTo(x-r*.8,y-r*.5);c.lineTo(x-r*.2,y-r);c.lineTo(x+r*.65,y-r*.65);c.lineTo(x+r,y+5);c.lineTo(x+r*.5,y+r*.55);c.closePath();c.fill();c.fillStyle='#b6b59a';c.beginPath();c.moveTo(x-r*.8,y-r*.5);c.lineTo(x-r*.2,y-r);c.lineTo(x+r*.65,y-r*.65);c.lineTo(x+r*.3,y-3);c.lineTo(x-r*.5,y+5);c.closePath();c.fill();path([[x-r*.2,y-r],[x-4,y-7],[x+r*.5,y+r*.55]],1.5,'#686e5c');}
  for(let i=0;i<2400;i++){const x=random()*W,y=random()*H;if(x>540&&x<660)continue;path([[x,y],[x-2,y-3]],.7,'#3e5f352c');if(i%13===0)ellipse(x,y-1,1.2,1.1,i%2?'#e8d6a3':'#b8c49a');}
  // Vignette and frame help read the lighter playable center.
  const vignette=c.createRadialGradient(600,380,220,600,380,730);vignette.addColorStop(0,'#11281400');vignette.addColorStop(1,'#182b2538');c.fillStyle=vignette;c.fillRect(0,0,W,H);c.strokeStyle='#e3cf9855';c.lineWidth=1;c.strokeRect(10,10,W-20,H-20);
  texture.refresh();scene.add.image(0,0,name).setOrigin(0);
  const label=(x,y,t,color='#eee6c9',size=11)=>scene.add.text(x,y,t,{fontFamily:'Georgia',fontSize:size,color,stroke:'#344832',strokeThickness:3,letterSpacing:1}).setOrigin(.5);
  label(158,70,'IL TUO REGNO','#d2e6e9',16);label(1040,70,'IL REGNO RIVALE','#f2ccb1',16);
  scene.terrainLabels=[];
  for(const p of PASSAGES)scene.terrainLabels.push(label(600,p.y-p.half-15,p.name.toUpperCase(),'#f3e5ba',10));
  for(const z of ZONES)scene.terrainLabels.push(label(z.x,z.y+z.ry+10,z.kind==='hill'?'ALTURA · TIRO +25%':'BOSCO · COPERTURA 40%','#edf0c6',10));
}
