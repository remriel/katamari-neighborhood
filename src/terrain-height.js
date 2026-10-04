import {islandConfig,islandFields} from './island-layout.js';

const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};

// Height is always authored in physical meters. Camera zoom, chunk boundaries,
// rebasing and growth never change the surface beneath an object.
export function islandHeight(x,z,island='oahu'){
  const f=islandFields(x,z,island);
  if(f.coast<=0)return 0;
  const mountain=Math.pow(f.ridge,1.4)*(island==='lanai'?420:620);
  const hills=(Math.sin(x/260)*Math.sin(z/310)+1)*28*(1-f.city*.82);
  const foothills=(Math.sin((x+z)/95)*Math.cos((x-z)/130)+1)*7*(1-f.city*.7);
  const ripples=(Math.sin(x/12)*Math.sin(z/15)*1.2+Math.sin((x+z)/24)*.8)*(1-f.city*.65);
  return Math.max(0,mountain+hills+foothills+ripples)*smooth(0,150,f.coast);
}

export function surfaceHeight(world,x,z){
  const scale=2**world.level;
  return islandHeight((x+Number(world.originX)*18)*scale,(z+Number(world.originZ)*18)*scale,world.islandId)/scale;
}

export function ridgeSegments(island){
  return islandConfig(island).ridges.flatMap(path=>path.slice(1).map((b,i)=>[...path[i],...b]));
}

// The GPU evaluates the same geography as the simulation. Vertex displacement
// keeps the rolling hills inexpensive and uses the existing coast/city map.
export const HEIGHT_GLSL=`
uniform vec4 ridgeSegments[8];uniform int ridgeCount;uniform float physicalScale;
float surfaceElevation(vec2 p,vec3 field){
  float ridge=0.0;
  for(int i=0;i<8;i++){
    if(i>=ridgeCount)break;
    vec2 a=ridgeSegments[i].xy,b=ridgeSegments[i].zw,d=b-a;
    float t=clamp(dot(p-a,d)/dot(d,d),0.0,1.0);
    vec2 q=a+d*t;
    ridge=max(ridge,exp(-pow(length(p-q)/520.0,2.0))*(.78+.12*sin((q.x+q.y)/470.0)));
  }
  float mountain=pow(ridge,1.4)*mix(620.0,420.0,isLanai);
  float hills=(sin(p.x/260.0)*sin(p.y/310.0)+1.0)*28.0*(1.0-field.g*.82);
  float foothills=(sin((p.x+p.y)/95.0)*cos((p.x-p.y)/130.0)+1.0)*7.0*(1.0-field.g*.7);
  float ripples=(sin(p.x/12.0)*sin(p.y/15.0)*1.2+sin((p.x+p.y)/24.0)*.8)*(1.0-field.g*.65);
  return max(0.0,mountain+hills+foothills+ripples)*smoothstep(0.0,150.0,(field.r-.5)*800.0);
}`;
