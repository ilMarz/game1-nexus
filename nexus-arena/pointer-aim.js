export function surfacePoint(clientX,clientY,rect,width,height){
  return {x:(clientX-rect.left)*width/Math.max(1,rect.width),y:(clientY-rect.top)*height/Math.max(1,rect.height)};
}
export class PointerAim {
  constructor({surface,enabled,onInteract}){
    this.position=null;
    this.move=event=>{if(enabled())this.position={clientX:event.clientX,clientY:event.clientY};};
    this.down=event=>{
      if(event.button!==0||!enabled())return;
      onInteract();this.move(event);event.preventDefault();
    };
    this.surface=surface;
    surface.addEventListener('pointermove',this.move);surface.addEventListener('pointerdown',this.down);
  }
  reset(){this.position=null;}
  destroy(){this.surface.removeEventListener('pointermove',this.move);this.surface.removeEventListener('pointerdown',this.down);this.reset();}
}
