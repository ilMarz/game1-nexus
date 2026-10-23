export function headingToTarget(x,y,targetX,targetY,fallback=0){
  const dx=targetX-x,dy=targetY-y;
  // At the target itself, retain the last direction instead of snapping or jittering.
  if(Math.hypot(dx,dy)<1)return fallback;
  return Math.atan2(dx,-dy);
}
export function gunMount(x,y,heading,lateral=0){
  return {x:x+Math.sin(heading)*30+Math.cos(heading)*lateral,y:y-Math.cos(heading)*30+Math.sin(heading)*lateral,angle:heading-Math.PI/2};
}
