import * as THREE from 'three';
import {CHUNK_SIZE} from './simulation.js';
import {islandConfig} from './island-layout.js';
function pow2mod(exponent,modulus){
  let value=1n,base=2n%modulus,n=BigInt(exponent);
  while(n>0n){if(n&1n)value=value*base%modulus;base=base*base%modulus;n>>=1n;}
  return value;
}
function originPhase(origin,delta,numerator,denominator=1){
  let n=origin*BigInt(CHUNK_SIZE)*BigInt(denominator),d=BigInt(numerator);
  if(delta<0)d<<=BigInt(-delta);else n=(n%d)*pow2mod(delta,d);
  return Number((n%d+d)%d)/Number(d);
}
export function createTerrain(grass,paving,renderer,ocean,fields){
  const anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  for(const texture of[grass,paving,ocean]){
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=anisotropy;
    texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
  }
  for(const field of Object.values(fields)){field.colorSpace=THREE.NoColorSpace;field.wrapS=field.wrapT=THREE.ClampToEdgeWrapping;field.needsUpdate=true;}
  const material=new THREE.ShaderMaterial({
    uniforms:{grass:{value:grass},paving:{value:paving},ocean:{value:ocean},islandField:{value:fields.oahu},
      mapCenter:{value:new THREE.Vector2()},mapHalf:{value:6000},isLanai:{value:0},
      roads:{value:Array.from({length:4},()=>new THREE.Vector4())},roadWidths:{value:[1,1,1,1]},roadCurbs:{value:[.1,.1,.1,.1]},
      pavingPhases:{value:Array.from({length:4},()=>new THREE.Vector2())},
      grassUnits:{value:new THREE.Vector2(3,6)},grassPhases:{value:[new THREE.Vector2(),new THREE.Vector2()]},
      grassBlend:{value:0},viewSpan:{value:8},fogColor:{value:new THREE.Color('#bce7a0')},fogNear:{value:60},fogFar:{value:100}},
    vertexShader:[
      'varying vec2 groundPosition; varying float viewDepth;',
      'void main(){vec4 p=modelMatrix*vec4(position,1.0);groundPosition=p.xz;vec4 view=modelViewMatrix*vec4(position,1.0);viewDepth=-view.z;gl_Position=projectionMatrix*view;}',
    ].join('\n'),
    fragmentShader:[
      'precision highp float;',
      'uniform sampler2D grass,paving,ocean,islandField; uniform vec2 mapCenter; uniform float mapHalf,isLanai;',
      'uniform vec4 roads[4];uniform float roadWidths[4],roadCurbs[4];uniform vec2 pavingPhases[4];',
      'uniform vec2 grassUnits;uniform vec2 grassPhases[2];uniform float grassBlend,viewSpan;',
      'uniform vec3 fogColor;uniform float fogNear,fogFar;',
      'varying vec2 groundPosition;varying float viewDepth;const float TAU=6.28318530718;',
      'float roadDistance(vec2 p,float seed){',
      'float bend=sin(p.y*TAU/128.0+seed)*14.0+sin(p.y*TAU/64.0+seed*1.7)*5.0;',
      'float start=sin(seed)*14.0+sin(seed*1.7)*5.0;',
      'float mainRoad=abs(mod(p.x-bend+start+32.0,64.0)-32.0);',
      'float branchBend=sin(p.x*TAU/256.0+seed*1.3)*15.0+sin(p.x*TAU/128.0+seed)*6.0;',
      'float branch=abs(mod(p.y-p.x*.5-branchBend-32.0+64.0,128.0)-64.0);return min(mainRoad,branch);}',
      'void main(){',
      'vec2 mapUv=vec2(.5+(groundPosition.x-mapCenter.x)/(mapHalf*2.0),.5-(groundPosition.y-mapCenter.y)/(mapHalf*2.0));',
      'vec3 field=texture2D(islandField,mapUv).rgb;float coast=(field.r-.5)*800.0;',
      'vec3 meadow=mix(texture2D(grass,groundPosition/grassUnits.x+grassPhases[0]).rgb,texture2D(grass,groundPosition/grassUnits.y+grassPhases[1]).rgb,grassBlend);',
      'meadow=mix(meadow,vec3(.52,.47,.28),isLanai*.38*(1.0-field.b));meadow=mix(meadow,vec3(.19,.39,.25),field.b*.25);',
      'float coverage=0.0,curbCoverage=0.0,marking=0.0;vec2 pavingUv=vec2(0.0);',
      'for(int i=0;i<4;i++){if(roadWidths[i]<=0.0)continue;',
      'float unit=roads[i].x,weight=smoothstep(.002,.02,unit/viewSpan);',
      'weight*=i<2?mix(.10,1.0,field.g):mix(.65,1.0,field.g);',
      'vec2 point=groundPosition/unit+roads[i].yz;float distance=roadDistance(point,roads[i].w);',
      'float aa=max(fwidth(distance),.012),width=roadWidths[i],curb=roadCurbs[i];',
      'float road=(1.0-smoothstep(width-aa,width+aa,distance))*weight;',
      'float kerb=smoothstep(width-aa,width+aa,distance)*(1.0-smoothstep(width+curb-aa,width+curb+aa,distance))*weight;',
      'curbCoverage=max(curbCoverage,kerb);',
      'marking=max(marking,(1.0-smoothstep(.018,.045+aa,distance))*step(1.8,mod(point.y,3.7))*weight*.38);',
      'if(road>coverage){coverage=road;pavingUv=groundPosition/(unit*2.1)+pavingPhases[i];}}',
      'vec3 asphalt=mix(vec3(.22,.29,.30),texture2D(paving,pavingUv).rgb,.08);',
      'vec3 color=mix(meadow,asphalt,coverage);color=mix(color,vec3(.84,.78,.59),curbCoverage*.88);color=mix(color,vec3(.94,.87,.58),marking);',
      'color=mix(color,vec3(.85,.72,.47),(1.0-smoothstep(15.0,95.0,coast))*.82);',
      'vec3 sea=texture2D(ocean,groundPosition/(grassUnits.y*2.0)+grassPhases[1]*.5).rgb;',
      'sea=mix(sea,vec3(.18,.64,.72),smoothstep(-300.0,-15.0,coast)*.72);',
      'color=mix(sea,color,smoothstep(-8.0,12.0,coast));',
      'float fog=smoothstep(fogNear,fogFar,viewDepth);gl_FragColor=vec4(mix(color,fogColor,fog),1.0);',
      '#include <colorspace_fragment>',
      '}',
    ].join('\n'),depthWrite:true,
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);mesh.rotation.x=-Math.PI/2;mesh.frustumCulled=false;
  let anchorKey='';
  return{mesh,material,update(x,z,span,aspect,cameraDistance,world){
    const extent=Math.max(120,span*Math.max(1,aspect)*4);mesh.scale.set(extent,extent,1);mesh.position.set(x,0,z);
    const layout=islandConfig(world.islandId);
    material.uniforms.islandField.value=fields[layout.id];material.uniforms.isLanai.value=layout.id==='lanai'?1:0;
    material.uniforms.mapCenter.value.set(-Number(world.originX)*CHUNK_SIZE,-Number(world.originZ)*CHUNK_SIZE);
    material.uniforms.mapHalf.value=layout.half*2**(-world.level);
    material.uniforms.fogNear.value=cameraDistance+span*.65;material.uniforms.fogFar.value=cameraDistance+span*2;
    const zoom=Math.log2(Math.max(.001,span)/8),baseLayer=world.level+Math.floor(zoom);
    material.uniforms.grassBlend.value=zoom-Math.floor(zoom);material.uniforms.viewSpan.value=span;
    const key=[layout.id,world.level,world.originX,world.originZ,baseLayer].join(':');if(key===anchorKey)return;anchorKey=key;
    for(let i=0;i<4;i++){
      const n=layout.streets[i],unit=(n?.unit||1)*2**(-world.level);
      if(!n){material.uniforms.roadWidths.value[i]=0;continue;}
      material.uniforms.roads.value[i].set(unit,originPhase(world.originX,world.level,Math.round(n.unit*256))*256+n.shift[0],
        originPhase(world.originZ,world.level,Math.round(n.unit*256))*256+n.shift[1],n.seed);
      material.uniforms.roadWidths.value[i]=n.width;material.uniforms.roadCurbs.value[i]=.40/n.unit;
      material.uniforms.pavingPhases.value[i].set(originPhase(world.originX,world.level,Math.round(n.unit*42),20),originPhase(world.originZ,world.level,Math.round(n.unit*42),20));
    }
    const fine=2**(baseLayer-world.level)*3;material.uniforms.grassUnits.value.set(fine,fine*2);
    for(let i=0;i<2;i++)material.uniforms.grassPhases.value[i].set(originPhase(world.originX,world.level-baseLayer-i,3),originPhase(world.originZ,world.level-baseLayer-i,3));
  }};
}
