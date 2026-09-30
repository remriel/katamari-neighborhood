import * as THREE from 'three';
import {CHUNK_SIZE} from './simulation.js';

export function createTerrain(grass,paving,renderer){
  const anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  for(const texture of[grass,paving]){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=anisotropy;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;}
  const material=new THREE.ShaderMaterial({
    uniforms:{grass:{value:grass},paving:{value:paving},tileSize:{value:3},blockSize:{value:CHUNK_SIZE},fogColor:{value:new THREE.Color('#bce7a0')},fogNear:{value:60},fogFar:{value:100}},
    vertexShader:`varying vec2 groundPosition; varying float viewDepth;
      void main(){vec4 p=modelMatrix*vec4(position,1.0);groundPosition=p.xz;vec4 view=modelViewMatrix*vec4(position,1.0);viewDepth=-view.z;gl_Position=projectionMatrix*view;}`,
    fragmentShader:`precision highp float;
      uniform sampler2D grass;uniform sampler2D paving;uniform float tileSize;uniform float blockSize;
      uniform vec3 fogColor;uniform float fogNear;uniform float fogFar;
      varying vec2 groundPosition;varying float viewDepth;
      void main(){
        vec2 grid=abs(mod(groundPosition+blockSize*.5,blockSize)-blockSize*.5);
        float laneDistance=min(grid.x,grid.y);
        float edge=smoothstep(1.12,1.28,laneDistance);
        vec4 meadow=texture2D(grass,groundPosition/tileSize);
        vec4 street=texture2D(paving,groundPosition/(tileSize*.7));
        vec3 color=mix(street.rgb,meadow.rgb,edge);
        float fog=smoothstep(fogNear,fogFar,viewDepth);
        gl_FragColor=vec4(mix(color,fogColor,fog),1.0);
        #include <colorspace_fragment>
      }`,
    depthWrite:true,
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);mesh.rotation.x=-Math.PI/2;mesh.frustumCulled=false;
  return{mesh,update(x,z,span,aspect,cameraDistance,dt){
    // Keep the ground larger than the entire camera footprint, never just a
    // fixed patch under the ball. Repeating detail keeps texels close to view.
    const extent=Math.max(120,span*Math.max(1,aspect)*4);
    mesh.scale.set(extent,extent,1);mesh.position.set(x,0,z);
    material.uniforms.fogNear.value=cameraDistance+span*.65;material.uniforms.fogFar.value=cameraDistance+span*2;
    material.uniforms.tileSize.value+=(3-material.uniforms.tileSize.value)*(1-Math.exp(-dt*.5));
    material.uniforms.blockSize.value+=(CHUNK_SIZE-material.uniforms.blockSize.value)*(1-Math.exp(-dt*.7));
  },rescale(factor){material.uniforms.tileSize.value*=factor;material.uniforms.blockSize.value*=factor;}};
}
