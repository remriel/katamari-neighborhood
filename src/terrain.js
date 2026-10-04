import * as THREE from 'three';
import {CHUNK_SIZE} from './simulation.js';
import {islandConfig} from './island-layout.js';
import {HEIGHT_GLSL,ridgeSegments} from './terrain-height.js';
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
export function createTerrain(grass,paving,renderer,ocean,fields,sand){
  const mobile=matchMedia('(pointer:coarse)').matches;
  const anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  for(const texture of[grass,paving,ocean,sand]){
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=anisotropy;
    texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
  }
  for(const field of Object.values(fields)){field.colorSpace=THREE.NoColorSpace;field.wrapS=field.wrapT=THREE.ClampToEdgeWrapping;field.needsUpdate=true;}
  const material=new THREE.ShaderMaterial({
    uniforms:{grass:{value:grass},paving:{value:paving},ocean:{value:ocean},sand:{value:sand},time:{value:0},islandField:{value:fields.oahu},
      mapCenter:{value:new THREE.Vector2()},mapHalf:{value:6000},isLanai:{value:0},
      physicalScale:{value:1},ridgeCount:{value:0},ridgeSegments:{value:Array.from({length:8},()=>new THREE.Vector4())},
      roads:{value:Array.from({length:4},()=>new THREE.Vector4())},roadWidths:{value:[1,1,1,1]},roadCurbs:{value:[.1,.1,.1,.1]},
      pavingPhases:{value:Array.from({length:4},()=>new THREE.Vector2())},
      grassUnits:{value:new THREE.Vector2(3,6)},grassPhases:{value:[new THREE.Vector2(),new THREE.Vector2()]},
      grassBlend:{value:0},mobileDetail:{value:mobile?1:0},viewSpan:{value:8},fogColor:{value:new THREE.Color('#bce7a0')},fogNear:{value:60},fogFar:{value:100}},
    vertexShader:[
      'uniform sampler2D islandField;uniform vec2 mapCenter;uniform float mapHalf,isLanai; varying vec2 groundPosition; varying float viewDepth,terrainHeight;',
      HEIGHT_GLSL,
      'void main(){vec4 p=modelMatrix*vec4(position,1.0);groundPosition=p.xz;vec2 uv=vec2(.5+(p.x-mapCenter.x)/(mapHalf*2.0),.5-(p.z-mapCenter.y)/(mapHalf*2.0));terrainHeight=surfaceElevation((p.xz-mapCenter)*physicalScale,texture2D(islandField,uv).rgb)/physicalScale;p.y+=terrainHeight;vec4 view=viewMatrix*p;viewDepth=-view.z;gl_Position=projectionMatrix*view;}',
    ].join('\n'),
    fragmentShader:[
      'precision highp float;',
      'uniform sampler2D grass,paving,ocean,sand,islandField; uniform float time,physicalScale; uniform vec2 mapCenter; uniform float mapHalf,isLanai;',
      'uniform vec4 roads[4];uniform float roadWidths[4],roadCurbs[4];uniform vec2 pavingPhases[4];',
      'uniform vec2 grassUnits;uniform vec2 grassPhases[2];uniform float grassBlend,mobileDetail,viewSpan;',
      'uniform vec3 fogColor;uniform float fogNear,fogFar;',
      'varying vec2 groundPosition;varying float viewDepth,terrainHeight;const float TAU=6.28318530718;',
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
      'vec2 broadUv=groundPosition/(grassUnits.y*2.0)+grassPhases[1]*.5;vec3 broadGrass=texture2D(grass,vec2(-broadUv.y,broadUv.x)+vec2(.37,.19)).rgb;meadow=mix(meadow,broadGrass,.22);',
      'vec3 closeGrass=texture2D(grass,groundPosition/(grassUnits.x*2.5)+grassPhases[0]).rgb;meadow=mix(meadow,closeGrass,mobileDetail*.72);',
      'meadow=clamp((meadow-.5)*(1.0+mobileDetail*.6)+.5,0.0,1.0);',
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
      'vec3 sandColor=texture2D(sand,groundPosition/(grassUnits.y*1.6)+grassPhases[1]/1.6).rgb;',
      'float beachWidth=180.0+field.g*55.0-field.b*110.0;float beach=1.0-smoothstep(40.0,beachWidth,coast);',
      'sandColor*=mix(.72,1.0,smoothstep(5.0,35.0,coast));color=mix(color,sandColor,beach);',
      'vec3 sea=texture2D(ocean,groundPosition/(grassUnits.y*2.0)+grassPhases[1]*.5).rgb;',
      'sea=mix(sea,vec3(.18,.64,.72),smoothstep(-300.0,-15.0,coast)*.72);',
      'float wave=sin(coast*.25-time*1.8+groundPosition.x*physicalScale*.008);float foam=(1.0-smoothstep(1.0,5.0,abs(coast-3.0-wave*3.0)))*.6;',
      'sea=mix(sea,vec3(.34,.79,.77),smoothstep(-140.0,-15.0,coast)*.4);color=mix(sea,color,smoothstep(-8.0,12.0,coast));color=mix(color,vec3(.94,.99,.9),foam);',
      'vec3 n=normalize(cross(dFdx(vec3(groundPosition.x,terrainHeight,groundPosition.y)),dFdy(vec3(groundPosition.x,terrainHeight,groundPosition.y))));if(n.y<0.0)n=-n;color*=.84+.16*max(0.0,dot(n,normalize(vec3(-.35,1.0,.4))));',
      'float fog=smoothstep(fogNear,fogFar,viewDepth);gl_FragColor=vec4(mix(color,fogColor,fog),1.0);',
      '#include <colorspace_fragment>',
      '}',
    ].join('\n'),depthWrite:true,
  });
  if(mobile){
    // Keep the mobile path small: some mobile drivers silently drop the full
    // terrain fragment shader, leaving only the scene's plain green backdrop.
    material.fragmentShader=[
      'precision highp float;',
      'uniform sampler2D grass,paving,ocean,sand,islandField;',
      'uniform vec2 grassUnits,grassPhases[2],mapCenter;uniform float mapHalf,isLanai;',
      'uniform vec4 roads[4];uniform float roadWidths[4];',
      'varying vec2 groundPosition;',
      'float roadDistance(vec2 p,float seed){',
      'float bend=sin(p.y*.049+seed)*14.0+sin(p.y*.098+seed*1.7)*5.0;',
      'float start=sin(seed)*14.0+sin(seed*1.7)*5.0;',
      'float mainRoad=abs(mod(p.x-bend+start+32.0,64.0)-32.0);',
      'float branchBend=sin(p.x*.0245+seed*1.3)*15.0+sin(p.x*.049+seed)*6.0;',
      'float branch=abs(mod(p.y-p.x*.5-branchBend+32.0,128.0)-64.0);return min(mainRoad,branch);}',
      'void main(){',
      'vec2 mapUv=vec2(.5+(groundPosition.x-mapCenter.x)/(mapHalf*2.0),.5-(groundPosition.y-mapCenter.y)/(mapHalf*2.0));',
      'vec3 field=texture2D(islandField,mapUv).rgb;float coast=(field.r-.5)*800.0;',
      'vec3 color=texture2D(grass,groundPosition/(grassUnits.x*2.5)+grassPhases[0]).rgb;',
      'color=clamp((color-.5)*1.3+.5,0.0,1.0);color=mix(color,vec3(.52,.47,.28),isLanai*.34*(1.0-field.b));',
      'float road=0.0;for(int i=0;i<4;i++){if(roadWidths[i]>0.0){',
      'vec2 point=groundPosition/roads[i].x+roads[i].yz;',
      'float width=roadWidths[i];road=max(road,1.0-smoothstep(width-.07,width+.07,roadDistance(point,roads[i].w)));}}',
      'vec3 asphalt=mix(vec3(.22,.29,.30),texture2D(paving,groundPosition/(grassUnits.x*3.0)).rgb,.22);',
      'color=mix(color,asphalt,road*field.g);',
      'vec3 beach=texture2D(sand,groundPosition/(grassUnits.x*4.0)).rgb;',
      'color=mix(color,beach,1.0-smoothstep(35.0,180.0,coast));',
      'vec3 sea=texture2D(ocean,groundPosition/(grassUnits.x*5.0)).rgb;',
      'color=mix(sea,color,smoothstep(-8.0,12.0,coast));',
      'gl_FragColor=vec4(color,1.0);',
      '#include <colorspace_fragment>',
      '}',
    ].join('\n');
    material.side=THREE.DoubleSide;
  }
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1,96,96),material);mesh.rotation.x=-Math.PI/2;mesh.frustumCulled=false;
  const fallbackMap=mobile?grass.clone():null;
  if(fallbackMap){fallbackMap.wrapS=fallbackMap.wrapT=THREE.RepeatWrapping;fallbackMap.needsUpdate=true;}
  const fallback=mobile?new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:fallbackMap,side:THREE.DoubleSide})):null;
  if(fallback){fallback.rotation.x=-Math.PI/2;fallback.position.y=-.12;fallback.frustumCulled=false;}
  let anchorKey='';
  return{mesh,fallback,material,update(x,z,span,aspect,cameraDistance,world){
    material.uniforms.time.value=world.motionClock;
    const extent=Math.max(40,span*Math.max(1,aspect)*4);mesh.scale.set(extent,extent,1);mesh.position.set(x,0,z);
    if(fallback){fallback.scale.set(extent,extent,1);fallback.position.x=x;fallback.position.z=z;fallbackMap.repeat.set(extent/8,extent/8);}
    const layout=islandConfig(world.islandId);
    material.uniforms.islandField.value=fields[layout.id];material.uniforms.isLanai.value=layout.id==='lanai'?1:0;
    material.uniforms.mapCenter.value.set(-Number(world.originX)*CHUNK_SIZE,-Number(world.originZ)*CHUNK_SIZE);
    material.uniforms.mapHalf.value=layout.half*2**(-world.level);
    material.uniforms.physicalScale.value=2**world.level;
    const ridges=ridgeSegments(layout.id);material.uniforms.ridgeCount.value=ridges.length;
    ridges.forEach((segment,i)=>material.uniforms.ridgeSegments.value[i].fromArray(segment));
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
