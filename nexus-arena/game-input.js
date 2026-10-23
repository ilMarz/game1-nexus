const bindings={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'dash',KeyE:'emp',KeyP:'pause',Escape:'pause'};
const keyAliases={w:'KeyW',a:'KeyA',s:'KeyS',d:'KeyD',e:'KeyE',p:'KeyP',' ':'Space',up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',escape:'Escape',arrowup:'ArrowUp',arrowdown:'ArrowDown',arrowleft:'ArrowLeft',arrowright:'ArrowRight'};
export class GameInput {
  constructor({target,enabled,onMovement,onPause}){
    this.held=new Set();this.edges=new Set();this.enabled=enabled;this.onMovement=onMovement;this.onPause=onPause;
    this.down=event=>{
      if(!this.enabled()||event.ctrlKey||event.metaKey||event.altKey)return;
      const element=event.target;
      if(element?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(element?.tagName))return;
      const code=bindings[event.code]?event.code:keyAliases[String(event.key).toLowerCase()];
      const action=bindings[code];if(!action)return;
      event.preventDefault();
      if(event.repeat||this.held.has(code))return;
      if(action==='pause'){this.onPause();return;}
      if(['left','right','up','down'].includes(action))this.onMovement();
      this.held.add(code);this.edges.add(action);
    };
    this.up=event=>{const code=bindings[event.code]?event.code:keyAliases[String(event.key).toLowerCase()];this.held.delete(code);};
    this.target=target;target.addEventListener('keydown',this.down,true);target.addEventListener('keyup',this.up,true);
  }
  clear(){this.held.clear();this.edges.clear();}
  consume(action){const pressed=this.edges.has(action);this.edges.delete(action);return pressed;}
  movement(touch={x:0,y:0}){
    const actions=new Set([...this.held].map(code=>bindings[code]));
    let x=Number(actions.has('right'))-Number(actions.has('left'))+touch.x;
    let y=Number(actions.has('down'))-Number(actions.has('up'))+touch.y;
    const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}
    return {x,y};
  }
  destroy(){this.target.removeEventListener('keydown',this.down,true);this.target.removeEventListener('keyup',this.up,true);this.clear();}
}
