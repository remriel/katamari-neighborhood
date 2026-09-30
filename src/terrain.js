import * as THREE from 'three';
import {CHUNK_SIZE,hash} from './simulation.js';
import {MAP_HALF_METERS} from './campaign.js';

function pow2mod(exponent,modulus){
  let value=1n,base=2n%modulus,n=BigInt(exponent);
  while(n>0n){if(n&1n)value=value*base%modulus;base=base*base%modulus;n>>=1n;}
  return value;
}
// Keep exact world phases while simulation coordinates are scaled or rebased.
// Only bounded fractions enter the GPU; chunk loading never affects this map.
function originPhase(origin,delta,numerator,denominator=1){
  let n=origin*BigInt(CHUNK_SIZE)*BigInt(denominator),d=BigInt(numerator);
  if(delta<0)d<<=BigInt(-delta);else n=(n%d)*pow2mod(delta,d);
  return Number((n%d+d)%d)/Number(d);
}

export function createTerrain(grass,paving,renderer,ocean){
  const anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  for(const texture of[grass,paving,ocean]){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=anisotropy;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;}
  const material=new THREE.ShaderMaterial({
    uniforms:{grass:{value:grass},paving:{value:paving},ocean:{value:ocean},mapCenter:{value:new THREE.Vector2()},mapHalf:{value:MAP_HALF_METERS},
      roads:{value:Array.from({length:5},()=>new THREE.Vector4())},
      pavingPhases:{value:Array.from({length:5},()=>new THREE.Vector2())},
      grassUnits:{value:new THREE.Vector2(3,6)},grassPhases:{value:[new THREE.Vector2(),new THREE.Vector2()]},
      grassBlend:{value:0},viewSpan:{value:8},
      fogColor:{value:new THREE.Color('#bce7a0')},fogNear:{value:60},fogFar:{value:100}},
    vertexShader:`varying vec2 groundPosition; varying float viewDepth;
      void main(){vec4 p=modelMatrix*vec4(position,1.0);groundPosition=p.xz;vec4 view=modelViewMatrix*vec4(position,1.0);viewDepth=-view.z;gl_Position=projectionMatrix*view;}`,
    fragmentShader:`precision highp float;
      uniform sampler2D grass;uniform sampler2D paving;uniform sampler2D ocean;uniform vec2 mapCenter;uniform float mapHalf;
      uniform vec4 roads[5];uniform vec2 pavingPhases[5];
      uniform vec2 grassUnits;uniform vec2 grassPhases[2];uniform float grassBlend;uniform float viewSpan;
      uniform vec3 fogColor;uniform float fogNear;uniform float fogFar;
      varying vec2 groundPosition;varying float viewDepth;
      const float TAU=6.28318530718;
      float roadDistance(vec2 p,float seed){
        float bend=sin(p.y*TAU/128.0+seed)*14.0+sin(p.y*TAU/64.0+seed*1.7)*5.0;
        float start=sin(seed)*14.0+sin(seed*1.7)*5.0;
        float mainRoad=abs(mod(p.x-bend+start+32.0,64.0)-32.0);
        float branchBend=sin(p.x*TAU/256.0+seed*1.3)*15.0+sin(p.x*TAU/128.0+seed)*6.0;
        float branch=abs(mod(p.y-p.x*.5-branchBend-32.0+64.0,128.0)-64.0);
        return min(mainRoad,branch);
      }
      void main(){
        vec3 fineGrass=texture2D(grass,groundPosition/grassUnits.x+grassPhases[0]).rgb;
        vec3 coarseGrass=texture2D(grass,groundPosition/grassUnits.y+grassPhases[1]).rgb;
        vec3 meadow=mix(fineGrass,coarseGrass,grassBlend);
        float coverage=0.0;vec2 pavingUv=vec2(0.0);
        for(int i=0;i<5;i++){
          float unit=roads[i].x,ratio=unit/viewSpan;
          // Coarser/finer fixed road networks fade at the edges of their useful
          // zoom range. Their paths never stretch or slide with the camera.
          float weight=smoothstep(.028,.055,ratio)*(1.0-smoothstep(.14,.30,ratio));
          vec2 point=groundPosition/unit+roads[i].yz;
          float distance=roadDistance(point,roads[i].w);
          float aa=max(fwidth(distance),.04);
          float width=1.05+.16*sin(point.y*TAU/128.0+roads[i].w);
          float road=(1.0-smoothstep(width-aa,width+aa,distance))*weight;
          if(road>coverage){coverage=road;pavingUv=groundPosition/(unit*2.1)+pavingPhases[i];}
        }
        vec3 street=texture2D(paving,pavingUv).rgb;
        vec3 color=mix(meadow,street,coverage);
        vec2 coast=abs(groundPosition-mapCenter)/mapHalf;
        float edge=max(coast.x,coast.y);
        float shore=smoothstep(.95,1.0,edge);
        vec3 sea=texture2D(ocean,groundPosition/(grassUnits.y*2.0)+grassPhases[1]*.5).rgb;
        color=mix(color,sea,shore);
        float fog=smoothstep(fogNear,fogFar,viewDepth);
        gl_FragColor=vec4(mix(color,fogColor,fog),1.0);
        #include <colorspace_fragment>
      }`,
    depthWrite:true,
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);mesh.rotation.x=-Math.PI/2;mesh.frustumCulled=false;
  let anchorKey='';
  return{mesh,update(x,z,span,aspect,cameraDistance,world){
    // The carrier follows the camera; the paint is fixed to logical world
    // coordinates. Loading objects and crossing chunks cannot move the paint.
    const extent=Math.max(120,span*Math.max(1,aspect)*4);
    mesh.scale.set(extent,extent,1);mesh.position.set(x,0,z);
    material.uniforms.fogNear.value=cameraDistance+span*.65;material.uniforms.fogFar.value=cameraDistance+span*2;
    material.uniforms.mapCenter.value.set(-Number(world.originX)*CHUNK_SIZE,-Number(world.originZ)*CHUNK_SIZE);material.uniforms.mapHalf.value=MAP_HALF_METERS*2**(-world.level);
    const zoom=Math.log2(Math.max(.001,span)/8),localLayer=Math.floor(zoom),baseLayer=world.level+localLayer;
    material.uniforms.grassBlend.value=zoom-localLayer;material.uniforms.viewSpan.value=span;
    const key=`${world.seed}:${world.level}:${world.originX}:${world.originZ}:${baseLayer}`;
    if(key===anchorKey)return;anchorKey=key;
    const phase=(axis,layer,numerator,denominator=1)=>originPhase(axis,world.level-layer,numerator,denominator);
    for(let i=0;i<5;i++){
      const layer=baseLayer+i-2,unit=2**(layer-world.level),seed=hash(world.seed,'road',layer)/4294967296*Math.PI*2;
      material.uniforms.roads.value[i].set(unit,phase(world.originX,layer,256)*256,phase(world.originZ,layer,256)*256,seed);
      material.uniforms.pavingPhases.value[i].set(phase(world.originX,layer,21,10),phase(world.originZ,layer,21,10));
    }
    const fine=2**(baseLayer-world.level)*3;material.uniforms.grassUnits.value.set(fine,fine*2);
    for(let i=0;i<2;i++)material.uniforms.grassPhases.value[i].set(phase(world.originX,baseLayer+i,3),phase(world.originZ,baseLayer+i,3));
  }};
}
