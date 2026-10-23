// A movement key can resume a focus pause, but must not dismiss a manual pause.
export class PauseState {
  constructor(onChange){this.onChange=onChange;this.reset();}
  reset(){this.paused=false;this.automatic=false;}
  pause(automatic=false){
    if(this.paused){
      // Losing focus must preserve a pause the player explicitly requested.
      if(!automatic&&this.automatic){this.automatic=false;this.onChange(true,false);}
      return;
    }
    this.paused=true;this.automatic=automatic;this.onChange(true,automatic);
  }
  resume(){if(!this.paused)return;this.reset();this.onChange(false,false);}
  movementPressed(){if(this.automatic)this.resume();}
  toggle(){if(this.paused)this.resume();else this.pause();}
}
