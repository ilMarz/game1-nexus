// These values drive both the simulation and its tactical display.
export const TACTICS=Object.freeze({
  assault:{name:'ASSALTO FRONTALE',color:0xffad6b,css:'#ffad6b',entry:'top',spawnMultiplier:1,fireMultiplier:1,description:'Rinforzi dall’alto. I nemici convergono sulla tua posizione.',hint:'Spostati di lato per spezzare l’inseguimento.',symbol:'↓ ↓ ↓'},
  flank:{name:'ATTACCO LATERALE',color:0xc1a0ff,css:'#c1a0ff',entry:'sides',spawnMultiplier:1,fireMultiplier:1,description:'Intercettori dai due fianchi. Ti chiudono da sinistra e destra.',hint:'Cerca spazio lungo l’asse verticale.',symbol:'→ ◇ ←'},
  barrage:{name:'RAFFICA',color:0xff6b87,css:'#ff6b87',entry:'top',spawnMultiplier:1,fireMultiplier:.7,description:'Intervallo fra colpi −30%. Le linee rosse anticipano il tiro nemico.',hint:'Attraversa le traiettorie; usa EMP sui colpi vicini.',symbol:'↘ ↓ ↙'},
  relief:{name:'TREGUA',color:0xb7fa74,css:'#b7fa74',entry:'top',spawnMultiplier:1.55,fireMultiplier:1,description:'Intervallo fra rinforzi +55%. I nemici già presenti restano pericolosi.',hint:'Approfittane per raccogliere i nuclei verdi.',symbol:'· ↓ ·'}
});
export const tacticFor=key=>TACTICS[key]||TACTICS.assault;
export function spawnPoint(tactic,random,width){
  if(tacticFor(tactic).entry==='sides')return {x:random()<.5?25:width-25,y:130+random()*250};
  return {x:100+random()*(width-200),y:35};
}
