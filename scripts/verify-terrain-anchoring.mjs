import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTerrain} from '../src/terrain.js';
import {surfaceHeight} from '../src/terrain-height.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<2e-5,`${a} != ${b}`);
for(const islandId of ['oahu','lanai']){
  const textures=Array.from({length:6},()=>new THREE.Texture());
  const terrain=createTerrain(textures[0],textures[1],{capabilities:{getMaxAnisotropy:()=>1}},textures[2],{oahu:textures[3],lanai:textures[4]},textures[5]);
  const world={islandId,level:0,originX:0n,originZ:0n,motionClock:0};
  const update=(x,z,span=8)=>{terrain.update(x,z,span,.46,20,world);terrain.mesh.updateMatrixWorld();};
  const vertices=()=>{
    const result=new Map(),position=terrain.mesh.geometry.attributes.position;
    for(let i=0;i<position.count;i++){
      const p=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(terrain.mesh.matrixWorld);
      near(p.y,surfaceHeight(world,p.x,p.z));
      result.set(`${p.x}:${p.z}`,p.y);
    }
    return result;
  };
  update(0,0);const before=vertices(),version=terrain.mesh.geometry.attributes.position.version;
  update(.1,.1,8.01);assert.equal(terrain.mesh.geometry.attributes.position.version,version,'Small movement or camera smoothing moved the grid');
  update(1,1);let shared=0;
  for(const [key,height] of vertices())if(before.has(key)){near(height,before.get(key));shared++;}
  assert.ok(shared>9000,'Following the ball must preserve overlapping world vertices');
  for(const level of [0,1,9,20]){
    world.level=level;world.originX=3n;world.originZ=-2n;
    update(-54,36);vertices();
  }
  terrain.mesh.geometry.dispose();terrain.material.dispose();
}
console.log('Terrain vertices match simulation heights and stay anchored while rolling on both islands.');
