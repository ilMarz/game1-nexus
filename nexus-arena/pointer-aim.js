export function surfacePoint(clientX,clientY,rect,width,height){
  return {x:(clientX-rect.left)*width/Math.max(1,rect.width),y:(clientY-rect.top)*height/Math.max(1,rect.height)};
}
export class PointerAim {
  constructor({surface,target,enabled,onInteract}){
    this.position=null;this.firing=false;this.pointerId=null;
    this.move=event=>{if(enabled())this.position={clientX:event.clientX,clientY:event.clientY};};
    this.down=event=>{
      if(event.button!==0||!enabled())return;
      onInteract();this.move(event);this.firing=true;this.pointerId=event.pointerId;event.preventDefault();
    };
    this.up=event=>{if(event.pointerId===this.pointerId&&(event.button===0||event.type==='pointercancel'))this.stop();};
    this.leave=()=>this.stop();
    this.surface=surface;this.target=target;
    surface.addEventListener('pointermove',this.move);surface.addEventListener('pointerdown',this.down);
    surface.addEventListener('pointerleave',this.leave);target.addEventListener('pointerup',this.up);target.addEventListener('pointercancel',this.up);target.addEventListener('blur',this.leave);
  }
  stop(){this.firing=false;this.pointerId=null;}
  reset(){this.stop();this.position=null;}
  destroy(){this.surface.removeEventListener('pointermove',this.move);this.surface.removeEventListener('pointerdown',this.down);this.surface.removeEventListener('pointerleave',this.leave);this.target.removeEventListener('pointerup',this.up);this.target.removeEventListener('pointercancel',this.up);this.target.removeEventListener('blur',this.leave);this.reset();}
}
