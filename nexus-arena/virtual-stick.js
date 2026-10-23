export function stickVector(dx,dy,radius,deadzone=.14){
  const length=Math.hypot(dx,dy),distance=Math.min(length,Math.max(1,radius));
  const travel=length?distance/length:0,magnitude=distance/Math.max(1,radius);
  const strength=magnitude<=deadzone?0:(magnitude-deadzone)/(1-deadzone);
  return {x:length?dx/length*strength:0,y:length?dy/length*strength:0,thumbX:dx*travel,thumbY:dy*travel};
}

export class VirtualStick {
  constructor({surface,thumb,enabled,onChange,onInteract=()=>{}}){
    Object.assign(this,{surface,thumb,enabled,onChange,onInteract});this.pointerId=null;
    this.down=e=>{
      if(!enabled()||this.pointerId!==null||e.button!==0)return;
      e.preventDefault();onInteract();this.pointerId=e.pointerId;
      surface.setPointerCapture(e.pointerId);surface.classList.add('is-active');this.move(e);
    };
    this.move=e=>{
      if(e.pointerId!==this.pointerId)return;
      if(!enabled()){this.clear();return;}
      e.preventDefault();const r=surface.getBoundingClientRect();
      const v=stickVector(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,r.width*.33);
      thumb.style.transform=`translate(${v.thumbX}px,${v.thumbY}px)`;onChange({x:v.x,y:v.y});
    };
    this.up=e=>{if(e.pointerId===this.pointerId)this.clear();};
    surface.addEventListener('pointerdown',this.down);surface.addEventListener('pointermove',this.move);
    for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,this.up);
  }
  clear(){
    const id=this.pointerId;this.pointerId=null;
    this.thumb.style.transform='';this.surface.classList.remove('is-active');this.onChange({x:0,y:0});
    if(id!==null&&this.surface.hasPointerCapture(id))this.surface.releasePointerCapture(id);
  }
  destroy(){
    this.clear();this.surface.removeEventListener('pointerdown',this.down);this.surface.removeEventListener('pointermove',this.move);
    for(const type of ['pointerup','pointercancel','lostpointercapture'])this.surface.removeEventListener(type,this.up);
  }
}
