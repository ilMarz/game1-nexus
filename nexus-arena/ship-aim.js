export function turnHeading(heading,axis,dt){
  const next=heading+axis*2.8*dt;
  return Math.atan2(Math.sin(next),Math.cos(next));
}
export function gunMount(x,y,heading,lateral=0){
  return {x:x+Math.sin(heading)*30+Math.cos(heading)*lateral,y:y-Math.cos(heading)*30+Math.sin(heading)*lateral,angle:heading-Math.PI/2};
}
