// One source of truth for the painted terrain, navigation, combat and Jev.
export const W=1200,H=760;
export const PASSAGES=Object.freeze([
  {id:'north_ford',name:'Guado dei salici',y:100,half:29,kind:'ford',siege:false,speed:.52,weakness:'Stretto e lento; aggira le torri a nord. Fanteria e cavalleria.'},
  {id:'north_bridge',name:'Ponte della corona',y:225,half:45,kind:'stone',siege:true,speed:1,weakness:'Passaggio largo per gli arieti; esposto alle alture.'},
  {id:'ruins',name:'Passo delle rovine',y:380,half:25,kind:'ruins',siege:false,speed:.68,weakness:'Scorciatoia centrale molto stretta. Fanteria e cavalleria.'},
  {id:'south_bridge',name:'Ponte del mulino',y:535,half:45,kind:'wood',siege:true,speed:1,weakness:'Accesso rapido alle segherie; vulnerabile agli aggiramenti.'},
  {id:'south_ford',name:'Guado dei canneti',y:660,half:29,kind:'ford',siege:false,speed:.52,weakness:'Accesso meridionale nascosto dalla vegetazione, ma lento. Fanteria e cavalleria.'}
]);
export const ZONES=Object.freeze([
  {id:'hill_west',name:'Altura della corona',kind:'hill',x:425,y:178,rx:92,ry:66},
  {id:'hill_east_north',name:'Colle dei tassi',kind:'hill',x:790,y:170,rx:72,ry:55},
  {id:'hill_east',name:'Altura del mulino',kind:'hill',x:785,y:580,rx:88,ry:63},
  {id:'wood_west',name:'Bosco dei faggi',kind:'forest',x:405,y:463,rx:82,ry:69},
  {id:'wood_east',name:'Bosco dei tassi',kind:'forest',x:794,y:298,rx:82,ry:68}
]);
export const CLIFFS=Object.freeze([{x:470,y:328,radius:30},{x:730,y:430,radius:30},{x:353,y:628,radius:25},{x:850,y:135,radius:25}]);
export const passageAt=(x,y)=>x>=550&&x<=650?PASSAGES.find(p=>Math.abs(y-p.y)<p.half):null;
export const zoneAt=(x,y)=>ZONES.find(z=>((x-z.x)/z.rx)**2+((y-z.y)/z.ry)**2<1);
export function terrainAt(x,y){
  const passage=passageAt(x,y),zone=zoneAt(x,y);
  if(passage)return {kind:passage.kind,name:passage.name,speed:passage.speed,elevation:0,cover:1,range:1,description:passage.weakness};
  if(zone?.kind==='hill')return {kind:'hill',name:zone.name,speed:.88,elevation:1,cover:1,range:1.25,description:'Altura: gittata +25%, danni a distanza +15% verso la pianura.'};
  if(zone?.kind==='forest')return {kind:'forest',name:zone.name,speed:.72,elevation:0,cover:.6,range:.85,description:'Copertura: −40% danni da frecce; velocità −28%, gittata −15%.'};
  return {kind:'grass',name:'Pianura',speed:1,elevation:0,cover:1,range:1,description:'Movimento libero. Nessuna copertura contro gli arcieri.'};
}
export function walkable(x,y,type='infantry',buildings=[],preferred=null){
  const radius=type==='ram'?15:type==='knight'?12:8;
  if(x<24||x>W-24||y<40||y>H-30)return false;
  if(x>550-radius*.4&&x<650+radius*.4){
    const p=PASSAGES.find(p=>Math.abs(y-p.y)<p.half-radius*.7);
    if(!p||type==='ram'&&!p.siege||preferred&&p.id!==preferred)return false;
  }
  if(CLIFFS.some(c=>Math.hypot(x-c.x,y-c.y)<c.radius+radius))return false;
  return !buildings.some(b=>b.hp>0&&Math.hypot(x-b.x,y-b.y)<b.radius+radius+3);
}

const GRID=20,COLS=W/GRID,ROWS=H/GRID;
const key=(x,y)=>y*COLS+x,point=id=>({x:(id%COLS)*GRID+10,y:Math.floor(id/COLS)*GRID+10});
class Heap{
  constructor(){this.items=[];}
  push(item){const a=this.items;a.push(item);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p].f<=item.f)break;a[i]=a[p];i=p;}a[i]=item;}
  pop(){const a=this.items,top=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=last.f)break;a[i]=a[c];i=c;}a[i]=last;}return top;}
}
// Eight-neighbour A*, with no diagonal corner cutting. Paths are cached by each unit.
export function findPath(start,goal,type='infantry',buildings=[],preferred=null){
  const allowed=new Map();
  const ok=id=>{if(!allowed.has(id)){const p=point(id);allowed.set(id,walkable(p.x,p.y,type,buildings,preferred));}return allowed.get(id);};
  function nearest(p){let best=null,bestD=Infinity;const cx=Math.max(0,Math.min(COLS-1,Math.floor(p.x/GRID))),cy=Math.max(0,Math.min(ROWS-1,Math.floor(p.y/GRID)));
    for(let oy=-6;oy<=6;oy++)for(let ox=-6;ox<=6;ox++){const x=cx+ox,y=cy+oy;if(x<0||x>=COLS||y<0||y>=ROWS)continue;const id=key(x,y),q=point(id),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bestD&&ok(id)){bestD=d;best=id;}}return best;}
  const from=nearest(start),to=nearest(goal);if(from===null||to===null)return [];
  const costs=new Map([[from,0]]),previous=new Map(),closed=new Set(),heap=new Heap(),end=point(to);
  const heuristic=id=>{const p=point(id);return Math.hypot(p.x-end.x,p.y-end.y)/GRID;};
  heap.push({id:from,f:heuristic(from)});
  while(heap.items.length){const {id}=heap.pop();if(closed.has(id))continue;if(id===to){const route=[];let n=to;while(n!==from){route.push(point(n));n=previous.get(n);}route.reverse();return route;}
    closed.add(id);const x=id%COLS,y=Math.floor(id/COLS);
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const nx=x+dx,ny=y+dy;if(nx<0||nx>=COLS||ny<0||ny>=ROWS)continue;const next=key(nx,ny);if(closed.has(next)||!ok(next))continue;
      if(dx&&dy&&(!ok(key(x+dx,y))||!ok(key(x,y+dy))))continue;
      const p=point(next),cost=costs.get(id)+(dx&&dy?Math.SQRT2:1)/terrainAt(p.x,p.y).speed;
      if(cost<(costs.get(next)??Infinity)){costs.set(next,cost);previous.set(next,id);heap.push({id:next,f:cost+heuristic(next)});}
    }
  }
  return [];
}
