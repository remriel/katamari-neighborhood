import {POWERUPS} from './powerups.js';

export const POWERUP_VISUALS={
  magnet:{id:'magnet',color:'#ff58de'},
  turbo:{id:'turbo',color:'#50eeff'},
  star:{id:'star',color:'#ffcf40'},
};
const byType=Object.fromEntries(Object.entries(POWERUPS).map(([id,power])=>[power.type,POWERUP_VISUALS[id]]));
export function powerupVisual(item){return POWERUP_VISUALS[item.powerup]||byType[item.type];}

// Display size is independent of physical size and pickup/obstacle rules.
// The pixel floor keeps powers readable after world rescaling and camera zoom.
export function itemDisplaySize(item,pixelsPerUnit){
  return powerupVisual(item)?Math.max(item.size*1.05*1.8,22.8/Math.max(pixelsPerUnit,1e-6)):item.size*1.05;
}
export function powerupLift(size,time=0,animate=true){return size*(.65+(animate?Math.sin(time*3)*.08:0));}
export function itemVisibilitySphere(item,bounds,pixelsPerUnit,ground,padding,sphere){
  const size=itemDisplaySize(item,pixelsPerUnit);
  if(powerupVisual(item)){
    // Includes the complete beacon, halo, rotating model and ground ring.
    sphere.center.set(item.x,ground+size*1.5,item.z);sphere.radius=size*2.3+padding;
  }else{
    sphere.center.set(item.x,ground+size*bounds.y*.5,item.z);
    sphere.radius=size/1.05*1.12*bounds.length()*.5+padding;
  }
  return sphere;
}

export const powerupGlowVertex=`
varying vec2 vUv;
void main(){
  vUv=uv;
  gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);
}`;
export const powerupGlowFragment=`
uniform vec3 glowColor;
uniform bool beacon;
varying vec2 vUv;
void main(){
  float strength=beacon?pow(1.0-vUv.y,1.7)*.27:pow(max(0.0,1.0-length(vUv-.5)*2.0),2.0)*.72;
  gl_FragColor=vec4(glowColor,strength);
  #include <colorspace_fragment>
}`;
